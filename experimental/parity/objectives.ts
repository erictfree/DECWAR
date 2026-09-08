import { distance, type ListedObject, type ShipStatus } from '../automated-player/observations.ts';
export const objectiveIds = ['build-neutral', 'capture', 'build-1', 'build-2', 'build-3', 'build-4', 'conversion', 'dock-new-base'];
export type ObjectiveFrame = { status: ShipStatus; target?: ListedObject; baseCount: number; symbol?: string };
export type ObjectiveCase = { event: string; id: string; command?: string; response?: string; before?: ObjectiveFrame; after?: ObjectiveFrame; skip?: string };
// Austin BUILD 523-591 and CAPTUR 600-684. Capturing even a neutral planet
// invokes PHADAM; ownership can be deterministic while resource loss is not.
export function objectiveChecks(c: ObjectiveCase | undefined): Record<string, boolean> {
  if (!c?.before?.target?.position || !c.after?.target?.position || !c.command || typeof c.response !== 'string') return { evidence: false };
  const a = c.before, b = c.after, p = a.target!, q = b.target!;
  const common = { sameLocation: distance(p.position!, q.position!) === 0, shipStayed: distance(a.status.position, b.status.position) === 0, adjacent: distance(a.status.position, p.position!) <= 1 };
  const command = (verb: string) => c.command === `${verb} ABSOLUTE ${p.position!.v} ${p.position!.h}`;
  const unchangedEnergy = a.status.energy === b.status.energy;
  if (c.id === 'build-neutral') return { ...common, command: command('BUILD'), neutral: p.faction === 'NEUTRAL' && q.faction === 'NEUTRAL', buildsUnchanged: p.builds === q.builds, unchangedEnergy, diagnostic: c.response.includes('Planet not yet captured.') };
  if (c.id === 'capture') return { ...common, command: command('CAPTURE'), neutralBefore: p.kind === 'planet' && p.faction === 'NEUTRAL' && p.builds === 0, ownedAfter: q.kind === 'planet' && q.faction === 'FEDERATION' && q.builds === 0 && b.symbol === '@F', captureNotice: c.response.includes('capturing') };
  if (/^build-[1-4]$/.test(c.id)) {
    const n = Number(c.id.slice(-1));
    return { ...common, command: command('BUILD'), ownedPlanet: p.faction === 'FEDERATION' && q.faction === 'FEDERATION' && q.kind === 'planet', increment: p.builds === n - 1 && q.builds === n, unchangedEnergy, progressNotice: c.response.includes(`${n} build`) };
  }
  if (c.id === 'conversion') {
    if (a.baseCount === 10) return { ...common, command: command('BUILD'), fourBuildsRetained: p.builds === 4 && q.builds === 4 && q.kind === 'planet' && q.faction === 'FEDERATION', capacityRetained: b.baseCount === 10, diagnostic: c.response.includes('still functional, captain.'), unchangedEnergy };
    return { ...common, command: command('BUILD'), capacityAvailable: a.baseCount < 10, fourBuildsBefore: p.builds === 4, becameBase: q.kind === 'base' && q.faction === 'FEDERATION' && b.symbol === '<>', countIncrement: b.baseCount === a.baseCount + 1, unchangedEnergy };
  }
  return { ...common, command: c.command === 'DOCK', atNewBase: p.kind === 'base' && p.faction === 'FEDERATION', docked: b.status.docked, energy: b.status.energy === Math.min(5000, a.status.energy + 1000) };
}
export function objectivesReport(left: Record<string, unknown>[], right: Record<string, unknown>[], echo = false) {
  function inspect(events: Record<string, unknown>[], backend: string) {
    const errors = events.filter(e => ['failed', 'cleanup-error', 'harness-error'].includes(String(e.event))).map(e => String(e.error));
    const configuration = events.find(e => e.event === 'configuration');
    if (configuration?.backend !== backend || configuration?.scenario !== 'objectives-v1') errors.push('Invalid configuration');
    const cases = events.filter(e => e.event === 'objective-case') as ObjectiveCase[];
    if (cases.length !== objectiveIds.length || objectiveIds.some((id, i) => cases[i]?.id !== id)) errors.push('Incomplete case sequence');
    if (!events.some(e => e.event === 'complete') || !events.some(e => e.event === 'cleanup-complete')) errors.push('Incomplete lifecycle');
    return { errors, configuration, cases };
  }
  const a = inspect(left, 'typescript'), b = inspect(right, 'pdp10');
  const cases = objectiveIds.map(id => {
    const l = a.cases.find(c => c.id === id), r = b.cases.find(c => c.id === id);
    const lc = objectiveChecks(l), rc = objectiveChecks(r);
    const clean = (c?: ObjectiveCase) => echo && c?.command && c.response?.startsWith(c.command + '\r\n') ? c.response.slice(c.command.length + 2) : c?.response;
    const capacity = id === 'conversion' && l?.before?.baseCount === 10 && r?.before?.baseCount === 10;
    const result = !l || !r || l.skip || r.skip ? 'skipped-precondition' : !Object.values(lc).every(Boolean) || !Object.values(rc).every(Boolean) ? 'failed-state-contract' : id === 'conversion' && (l.before!.baseCount === 10) !== (r.before!.baseCount === 10) ? 'different-preconditions' : capacity ? 'matched-capacity-rejection' : 'matched-state-contract';
    return { id, result, left: l, right: r, evaluatedLeft: lc, evaluatedRight: rc, outputComparison: clean(l) === undefined || clean(r) === undefined ? 'unavailable' : clean(l) === clean(r) ? 'equal-after-selected-echo-rule' : 'different-output' };
  });
  return { schema: 'objectives-parity-v1', ignoreCommandEcho: echo, expectedCases: objectiveIds.length, outcome: a.errors.length || b.errors.length || cases.some(c => c.result === 'skipped-precondition') ? 'incomplete' : cases.some(c => c.result === 'failed-state-contract' || c.result === 'different-preconditions' || c.outputComparison === 'different-output') ? 'differences' : 'matched-selected-output',
    captures: { typescript: { errors: a.errors, configuration: a.configuration }, pdp10: { errors: b.errors, configuration: b.configuration } }, comparison: { cases },
    limitations: 'Public state-relative capture/build contracts. Capture fires a random defensive phaser hit; energy and damage are retained, not equated. Full base capacity tests rejection, not conversion. Docking at a new base is skipped when conversion is unavailable. Worlds, clocks, points and random draws are unaligned; raw output differences are retained.' };
}
