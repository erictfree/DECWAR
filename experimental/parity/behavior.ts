import type { ShipStatus } from '../automated-player/observations.ts';
import { distance, type ListedObject, type Position } from '../automated-player/observations.ts';
export function threatensFixture(position: Position, targets: ListedObject[]) {
  // Austin BASPHA:392-393 (base radius 4); existing observed-map planet
  // exclusion radius 2 is also retained. Unknown/mobile targets exclude setup.
  return targets.some(t => t.kind === 'ship' || t.kind === 'romulan' || !t.position || distance(t.position, position) <= (t.kind === 'base' ? 4 : 2));
}
export const behaviorIds = ['invalid-coordinate', 'impulse-range', 'warp-step', 'impulse-step', 'dock'] as const;
export type BehaviorCase = { event: 'behavior-case'; id: string; command?: string; response?: string; before?: ShipStatus; after?: ShipStatus; checks?: Record<string, boolean>; skip?: string };

// Displayed units; Austin MOVE/IMPULS:2190-2216, DOCK:920-936.
export function movementChecks(before: ShipStatus, after: ShipStatus, destination: { v: number; h: number }) {
  return { destinationReached: after.position.v === destination.v && after.position.h === destination.h,
    energyCost: before.energy - after.energy === (before.shieldsUp ? 8 : 4),
    undocked: !after.docked, hullUnchanged: after.hullDamage === before.hullDamage,
    shieldsUnchanged: after.shieldPercent === before.shieldPercent, torpedoesUnchanged: after.torpedoes === before.torpedoes };
}
export function rejectionChecks(before: ShipStatus, after: ShipStatus) {
  return { positionUnchanged: before.position.v === after.position.v && before.position.h === after.position.h,
    energyUnchanged: before.energy === after.energy, hullUnchanged: before.hullDamage === after.hullDamage,
    torpedoesUnchanged: before.torpedoes === after.torpedoes, shieldsUnchanged: before.shieldPercent === after.shieldPercent };
}
export function dockingChecks(before: ShipStatus, after: ShipStatus) {
  // Fixture requires exactly one adjacent friendly base and no friendly planets.
  return { docked: after.docked, energyRestored: after.energy === Math.min(5000, before.energy + 1000),
    torpedoesRestored: after.torpedoes === 10,
    shieldsRestored: after.shieldPercent === Math.min(100, before.shieldPercent + 20),
    hullRepaired: after.hullDamage === Math.max(0, before.hullDamage - (before.docked ? 200 : 100)),
    positionUnchanged: after.position.v === before.position.v && after.position.h === before.position.h };
}
export function evaluateBehavior(c: BehaviorCase | undefined): Record<string, boolean> {
  const status = (s: ShipStatus | undefined) => s && s.position && [s.position.v, s.position.h, s.energy, s.hullDamage, s.torpedoes, s.shieldPercent].every(Number.isFinite) && typeof s.docked === 'boolean' && typeof s.shieldsUp === 'boolean';
  if (!c || !status(c.before) || !status(c.after) || typeof c.command !== 'string' || typeof c.response !== 'string') return { captureComplete: false };
  const before = c.before!, after = c.after!;
  // Recompute from evidence rather than trusting recorded booleans. In MOVE,
  // invalid coordinates return before label700; excessive impulse undocks there.
  if (c.id === 'invalid-coordinate') return { ...rejectionChecks(before, after), dockingState: before.docked === after.docked, commandShape: c.command === 'MOVE ABSOLUTE 0 0', diagnostic: c.response.includes('X coordinate lies outside galaxy.') };
  if (c.id === 'impulse-range') {
    const match = /^IMPULSE ABSOLUTE (\d+) (\d+)$/.exec(c.command);
    return { ...rejectionChecks(before, after), dockingState: !after.docked, commandShape: !!match && distance(before.position, { v: +match[1], h: +match[2] }) === 2, diagnostic: c.response.includes('Maximum speed warp 1.') };
  }
  if (c.id === 'dock') return { ...dockingChecks(before, after), commandShape: c.command === 'DOCK' };
  const engine = c.id === 'warp-step' ? 'MOVE' : 'IMPULSE';
  const match = new RegExp(`^${engine} ABSOLUTE (\\d+) (\\d+)$`).exec(c.command);
  if (!match) return { commandShape: false };
  const destination = { v: +match[1], h: +match[2] };
  return { ...movementChecks(before, after, destination), cardinalStep: Math.abs(destination.v - before.position.v) + Math.abs(destination.h - before.position.h) === 1 };
}
export function behaviorReport(left: Record<string, unknown>[], right: Record<string, unknown>[], echo = false) {
  const inspect = (events: Record<string, unknown>[], backend: string) => {
    const errors = events.filter(e => ['failed', 'cleanup-error', 'harness-error'].includes(String(e.event))).map(e => String(e.error));
    const configs = events.filter(e => e.event === 'configuration');
    if (configs.length !== 1 || configs[0]?.backend !== backend || configs[0]?.scenario !== 'behavior-v1') errors.push('Invalid configuration');
    const cases = events.filter(e => e.event === 'behavior-case') as BehaviorCase[];
    if (cases.length !== behaviorIds.length || behaviorIds.some((id, i) => cases[i]?.id !== id)) errors.push('Missing, reordered or duplicate cases');
    if (events.filter(e => e.event === 'complete').length !== 1 || !events.some(e => e.event === 'cleanup-complete')) errors.push('Missing completion or cleanup');
    return { errors, cases, configuration: configs[0] };
  };
  const a = inspect(left, 'typescript'), b = inspect(right, 'pdp10');
  const cases = behaviorIds.map(id => {
    const l = a.cases.find(c => c.id === id), r = b.cases.find(c => c.id === id);
    const evaluatedLeft = evaluateBehavior(l), evaluatedRight = evaluateBehavior(r);
    const valid = (checks: Record<string, boolean>) => Object.values(checks).every(v => v === true);
    const text = (c: BehaviorCase | undefined) => echo && c?.command && c.response?.startsWith(c.command + '\r\n') ? c.response.slice(c.command.length + 2) : c?.response;
    return { id, evaluatedLeft, evaluatedRight, result: !l || !r ? 'missing-case' : l.skip || r.skip ? 'skipped-precondition' : valid(evaluatedLeft) && valid(evaluatedRight) ? 'matched-state-contract' : 'failed-state-contract',
      outputComparison: !l?.skip && !r?.skip && typeof text(l) === 'string' && typeof text(r) === 'string' ? text(l) === text(r) ? 'equal-after-selected-echo-rule' : 'different-output' : 'unavailable', left: l, right: r };
  });
  const incomplete = a.errors.length || b.errors.length || cases.some(c => ['missing-case', 'skipped-precondition'].includes(c.result));
  return { schema: 'decwar-behavior-parity-v1', evaluation: 'source-contracts-v2', expectedCases: behaviorIds.length,
    outcome: incomplete ? 'incomplete' : cases.some(c => c.result !== 'matched-state-contract' || c.outputComparison === 'different-output') ? 'differences' : 'matched-selected-output',
    captures: { typescript: { errors: a.errors, configuration: a.configuration }, pdp10: { errors: b.errors, configuration: b.configuration } }, comparison: { cases },
    limitations: 'State-relative public-observation contracts, not aligned worlds. Preconditions and before/after values retained. Output differences remain independent of state-contract success. Docking repair/refill checks at already-full values do not establish effective repair of damaged devices or depleted ammunition. Native clocks, random draws and timing are not equated.' };
}
