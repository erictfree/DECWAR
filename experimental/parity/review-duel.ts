import { readFileSync } from 'node:fs';
import { parseDevices, parseStatus } from '../automated-player/observations.ts';

const paths = process.argv.slice(2);
if (paths.length !== 2) throw new Error('Usage: review-duel.ts TYPESCRIPT_JSONL NATIVE_JSONL');
const commands = ['PHASERS ABSOLUTE 180 10 10', 'TORPEDOES ABSOLUTE 1 10 10'];
const captures = paths.map((path, index) => {
  const events = readFileSync(path, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  const config = events.find(e => e.event === 'configuration'), ready = events.find(e => e.event === 'combat-ready');
  const steps = events.filter(e => e.event === 'combat-step');
  const errors = events.filter(e => ['failed', 'cleanup-error'].includes(e.event)).map(e => String(e.error));
  if (config?.backend !== (index ? 'pdp10' : 'typescript') || config?.scenario !== 'seeded-duel-v1' || config?.seed !== 1729 || config?.romulan !== false || config?.blackHoles !== false) errors.push('Invalid configuration');
  if (!events.some(e => e.event === 'sent' && e.role === 'attacker' && e.line === 'TOURNAMENT 1729')) errors.push('Missing fresh tournament selection');
  if (!ready || steps.length !== 2 || commands.some((c, i) => steps[i]?.command !== c)) errors.push('Incomplete encounter');
  if (!events.some(e => e.event === 'complete') || ['attacker', 'target'].some(role => !events.some(e => e.event === 'cleanup-complete' && e.role === role))) errors.push('Incomplete lifecycle');
  if (config?.setupPolicy !== undefined && config.setupPolicy !== 'even-target-turns-v1') errors.push('Unknown setup policy');
  if (config?.setupPolicy === 'even-target-turns-v1') {
    const turns = events.filter(e => ['target-move', 'target-dock', 'target-phase-dock'].includes(e.event)).length;
    const phase = events.find(e => e.event === 'setup-phase');
    if (!phase || phase.players !== 2 || phase.setupTurns !== turns || turns % 2 || !ready || parseStatus(ready.target.statusText).stardate !== turns + 4) errors.push('Invalid setup phase');
  }
  return { path, setupPolicy: config?.setupPolicy ?? 'unaligned', mode: config?.mode ?? 'two-shots', destructionPolicy: config?.destructionPolicy, errors, ready, steps, events };
});
if (captures[0].mode !== captures[1].mode) throw new Error('Duel modes differ');
if (captures[0].destructionPolicy !== captures[1].destructionPolicy) throw new Error('Destruction policies differ');
if (captures[0].setupPolicy !== captures[1].setupPolicy) throw new Error('Setup policies differ');
const canonical = (o: { statusText: string; damages: string; points: string }) => {
  const { observedAt, stardate, ...status } = parseStatus(o.statusText);
  const score = /Total points:\s+(-?\d+(?:\.\d+)?)/.exec(o.points);
  if (!score) throw new Error('Missing total score');
  return { ...status, devices: parseDevices(o.damages), totalPoints: Number(score[1]) };
};
const clean = (text: string, command: string) => text.startsWith(command + '\r\n') ? text.slice(command.length + 2) : text;
const states = [0, 1, 2].map(index => {
  const left = index ? captures[0].steps[index - 1] : captures[0].ready;
  const right = index ? captures[1].steps[index - 1] : captures[1].ready;
  if (!left || !right) return { index, complete: false, roles: [], actionResponseEqual: false };
  const roles = ['attacker', 'target'].map(role => {
    const a = canonical(left[role]), b = canonical(right[role]);
    return { role, stateEqual: JSON.stringify(a) === JSON.stringify(b), left: a, right: b,
      rawReportsEqual: Object.fromEntries([['statusText', 'STATUS'], ['scanText', 'SCAN 10'], ['damages', 'DAMAGES'], ['points', 'POINTS']].map(([key, command]) => [key, clean(left[role][key], command) === clean(right[role][key], command)])) };
  });
  return { index, complete: true, roles, ...(index ? { command: commands[index - 1], actionResponseEqual: clean(left.response, commands[index - 1]) === clean(right.response, commands[index - 1]) } : {}) };
});
const contracts = captures.map(c => {
  if (!c.ready || c.steps.length !== 2) return false;
  const a = canonical(c.ready.attacker), t = canonical(c.ready.target), p = canonical(c.steps[0].attacker), q = canonical(c.steps[1].attacker);
  return a.position.v === 10 && a.position.h === 9 && a.energy === 4920 && t.position.v === 10 && t.position.h === 10 && t.energy === 4968 && t.hullDamage === 0 && t.shieldPercent === 100 &&
    // PHASER:2685–2687,2750: firing costs 180 plus 200 for raised-shield control.
    p.energy === a.energy - 180 - (a.shieldsUp ? 200 : 0) && p.torpedoes === 10 && q.torpedoes === 9 && c.steps[0].response.includes('phaser hit') && c.steps[1].response.includes('torpedo hit');
});
let destruction: Record<string, unknown> | undefined;
let destructionMatched = true;
if (captures[0].mode === 'destruction') {
  const phases = captures.map(c => {
    const deathIndex = c.events.findIndex(e => e.event === 'target-destroyed');
    const lastShot = c.events.slice(0, deathIndex).findLastIndex(e => e.event === 'destruction-shot');
    return { shots: c.events.filter(e => e.event === 'destruction-shot'), after: c.events.filter(e => e.event === 'destruction-after'), death: c.events[deathIndex],
      reentrySeen: deathIndex >= 0 && lastShot >= 0 && c.events.slice(lastShot, deathIndex).some(e => e.event === 'received' && e.role === 'target' && /Enter HELp, PREgame, or blank\r\nline: $/.test(e.text)),
      loggedOut: c.events.some(e => e.event === 'cleanup-complete' && e.role === 'target' && e.afterDeath === true) };
  });
  const comparisons = phases[0].shots.map((s, i) => {
    const r = phases[1].shots[i];
    return { shot: i, command: s.command, equal: !!r && s.command === r.command && clean(s.response, s.command) === clean(r.response, r.command) };
  });
  const sameSurvivingStates = phases[0].after.length === phases[1].after.length && phases[0].after.every((s, i) => ['attacker', 'target'].every(role => JSON.stringify(canonical(s[role])) === JSON.stringify(canonical(phases[1].after[i][role]))));
  const released = phases.every(p => p.death && p.reentrySeen && !/\bWolf\b/.test(p.death.users) && p.loggedOut);
  const finalAttackerEqual = released && JSON.stringify(canonical(phases[0].death.attacker)) === JSON.stringify(canonical(phases[1].death.attacker));
  destructionMatched = released && phases[0].shots.length === phases[1].shots.length && comparisons.every(c => c.equal) && sameSurvivingStates && finalAttackerEqual;
  destruction = { comparisons, sameSurvivingStates, released, finalAttackerEqual,
    finalAttacker: phases.map(p => p.death ? canonical(p.death.attacker) : null) };
}
const outcome = captures.some(c => c.errors.length) ? 'incomplete' : contracts.every(Boolean) && states.every(s => s.complete && s.roles?.every(r => r.stateEqual) && s.actionResponseEqual !== false) && destructionMatched ? 'matched-combat-state-and-hit-output' : 'differences';
const firstObservedDivergence = states.find(s => s.complete && (s.roles.some(r => !r.stateEqual) || s.actionResponseEqual === false));
console.log(JSON.stringify({ schema: 'duel-comparison-v1', outcome, mode: captures[0].mode, setupPolicy: captures[0].setupPolicy, contracts, firstObservedDivergence: firstObservedDivergence ? { index: firstObservedDivergence.index, command: firstObservedDivergence.command ?? 'combat-ready' } : null, captures: captures.map(({ path, errors }) => ({ path, errors })), states, destruction,
  scope: 'Scripted passive-target encounter after public navigation and docking. Canonical ship/device state and total score exclude observation time and stardate because target setup trips differ. Raw STATUS/SCAN/DAMAGES/POINTS comparisons remain visible. Optional destruction requires reentry evidence, USERS release and cleanup. No general random-stream equivalence.' }, null, 2));
process.exitCode = outcome === 'incomplete' ? 2 : outcome === 'differences' ? 1 : 0;
