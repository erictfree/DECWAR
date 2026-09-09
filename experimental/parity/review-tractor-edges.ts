import { readFileSync } from 'node:fs';
const paths = process.argv.slice(2);
if (paths.length !== 2) throw Error('Usage: review-tractor-edges.ts TYPESCRIPT_JSONL PDP10_JSONL');
const commands = [
  ['donor-down', 'SHIELDS DOWN'], ['receiver-down', 'SHIELDS DOWN'], ['activate', 'TRACTOR VULCAN'],
  ['recipient-moves', 'MOVE ABSOLUTE 8 3'], ['recipient-shield-release', 'SHIELDS UP'],
  ['recipient-down-again', 'SHIELDS DOWN'], ['reactivate', 'TRACTOR VULCAN'], ['bare-release', 'TRACTOR'], ['attach-before-quit', 'TRACTOR VULCAN'],
];
const notices = (text: string) => [...text.matchAll(/\r\nTractor beam (?:activated|broken), Captain\./g)].map(m => m[0]);
const clean = (text: string, command: string) => text.startsWith(command + '\r\n') ? text.slice(command.length + 2) : text;
const captures = paths.map((path, i) => {
  const events = readFileSync(path, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  const config = events.find(e => e.event === 'configuration');
  const errors = events.filter(e => ['failed', 'cleanup-error'].includes(e.event)).map(e => e.error);
  if (config?.scenario !== 'tractor-edges-v1' || config?.backend !== (i ? 'pdp10' : 'typescript')) errors.push('Invalid configuration');
  if (!events.some(e => e.event === 'sent' && e.line === 'TOURNAMENT 1729')) errors.push('Missing seed selection');
  if (!events.some(e => e.event === 'complete') || !['Donor', 'Receiver'].every(role => events.some(e => e.event === 'cleanup-complete' && e.role === role))) errors.push('Incomplete lifecycle');
  const steps = events.filter(e => e.event === 'assistance-step');
  if (steps.length !== commands.length || commands.some(([label, command], n) => steps[n]?.label !== label || steps[n]?.command !== command)) errors.push('Incomplete or reordered sequence');
  const quit = events.find(e => e.event === 'quit-release'), solo = events.find(e => e.event === 'solo-move');
  if (!quit || !solo) errors.push('Missing quit/movement evidence');
  return { path, errors, steps, quit, solo };
});
const position = (s: { position: { v: number; h: number } }, v: number, h: number) => s.position.v === v && s.position.h === h;
const reports = commands.map(([label, command], index) => {
  const steps = captures.map(c => c.steps[index]);
  if (steps.some(s => !s)) return { label, evidence: false };
  const effects = steps.map(s => Object.fromEntries(['donor', 'receiver'].map(role => {
    const b = s.before[role].status, a = s.after[role].status;
    return [role, { delta: Math.round((a.energy - b.energy) * 10), positionBefore: b.position, positionAfter: a.position,
      shieldsBefore: b.shieldsUp, shieldsAfter: a.shieldsUp,
      notifications: notices((role === 'receiver' && ['receiver-down', 'recipient-moves', 'recipient-shield-release', 'recipient-down-again'].includes(label) || role === 'donor' && !['receiver-down', 'recipient-moves', 'recipient-shield-release', 'recipient-down-again'].includes(label) ? s.response : '') + s.after[role].text) }];
  })));
  const checks = steps.map((s, i) => {
    const e = effects[i], a = s.after;
    const notification = ['activate', 'reactivate', 'attach-before-quit'].includes(label) ? 'activated' : ['bare-release', 'recipient-shield-release'].includes(label) ? 'broken' : undefined;
    return {
      energy: e.donor.delta === 0 && e.receiver.delta === (label === 'recipient-moves' ? -120 : label === 'recipient-shield-release' ? -1000 : 0),
      positions: position(a.donor.status, 7, index >= 3 ? 3 : 2) && position(a.receiver.status, index >= 3 ? 8 : 7, 3),
      shields: a.donor.status.shieldsUp === false && a.receiver.status.shieldsUp === (index === 0 || index === 4),
      notifications: ['donor', 'receiver'].every(role => JSON.stringify(e[role].notifications) === JSON.stringify(notification ? [`\r\nTractor beam ${notification}, Captain.`] : [])),
    };
  });
  return { label, evidence: true, checks, effects,
    effectsEqual: JSON.stringify(effects[0]) === JSON.stringify(effects[1]),
    responseEqual: clean(steps[0].response, command) === clean(steps[1].response, command) };
});
const quitChecks = captures.map(c => {
  if (!c.quit || !c.solo) return { evidence: false };
  return { evidence: true, notification: JSON.stringify(notices(c.quit.after.text)) === JSON.stringify(['\r\nTractor beam broken, Captain.']),
    released: !/\bVulcan\b/.test(c.quit.users), positionUnchanged: position(c.quit.after.status, 7, 3),
    energyUnchanged: c.quit.before.status.energy === c.quit.after.status.energy,
    soloMove: position(c.solo.after.status, 8, 2) && Math.round((c.solo.after.status.energy - c.solo.before.status.energy) * 10) === -40 };
});
const matches = reports.every(r => r.evidence && r.effectsEqual && r.responseEqual && r.checks!.every(c => Object.values(c).every(Boolean))) && quitChecks.every(c => Object.values(c).every(Boolean));
const outcome = captures.some(c => c.errors.length) ? 'incomplete' : matches ? 'matched-tractor-edges' : 'differences';
console.log(JSON.stringify({ scenario: 'tractor-edges-v1', outcome, captures: captures.map(({ path, errors }) => ({ path, errors })), reports, quitChecks,
  scope: 'Public reciprocal movement, energy, shield state, selected exact activation/release notices for both ships, action bytes after echo removal, and surviving ship movement after recipient quit. Setup supplies may differ. Does not cover destruction/nova/weapon-hit release or all notification formatting.' }, null, 2));
process.exitCode = outcome === 'incomplete' ? 2 : outcome === 'differences' ? 1 : 0;
