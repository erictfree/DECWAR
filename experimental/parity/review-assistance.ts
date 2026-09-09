import { readFileSync } from 'node:fs';

const paths = process.argv.slice(2);
if (paths.length !== 2) throw Error('Usage: review-assistance.ts TYPESCRIPT_JSONL PDP10_JSONL');
const labels = ['energy-self', 'energy-zero', 'energy-reserve', 'energy-transfer', 'energy-capacity', 'tractor-shields', 'donor-shields-down', 'tractor-receiver-shields', 'receiver-shields-down', 'tractor-activate', 'tractor-tow', 'tractor-shield-release', 'donor-shields-down-again', 'tractor-reactivate', 'tractor-off', 'tractor-off-inactive'];
const captures = paths.map((path, index) => {
  const events = readFileSync(path, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  const steps = events.filter(e => e.event === 'assistance-step');
  const errors = events.filter(e => ['failed', 'cleanup-error'].includes(e.event)).map(e => e.error);
  const config = events.find(e => e.event === 'configuration');
  if (config?.backend !== (index ? 'pdp10' : 'typescript') || config?.scenario !== 'friendly-assistance-v1') errors.push('Invalid configuration');
  if (!events.some(e => e.event === 'sent' && e.line === 'TOURNAMENT 1729')) errors.push('Missing seed selection');
  if (!events.some(e => e.event === 'complete') || !['Donor', 'Receiver'].every(role => events.some(e => e.event === 'cleanup-complete' && e.role === role))) errors.push('Incomplete lifecycle');
  if (steps.length !== labels.length || labels.some((label, i) => steps[i]?.label !== label)) errors.push('Missing or reordered steps');
  return { path, steps, errors };
});
const clean = (text: string, command: string) => text.startsWith(command + '\r\n') ? text.slice(command.length + 2) : text;
const reports = labels.map((label, i) => {
  const steps = captures.map(c => c.steps[i]);
  if (steps.some(s => !s)) return { label, evidence: false };
  const effects = steps.map(s => Object.fromEntries(['donor', 'receiver'].map(role => {
    const b = s.before[role].status, a = s.after[role].status;
    return [role, { energyChange: Math.round((a.energy - b.energy) * 10) / 10,
      positionBefore: b.position, positionAfter: a.position, shieldsBefore: b.shieldsUp, shieldsAfter: a.shieldsUp,
      hullChange: Math.round((a.hullDamage - b.hullDamage) * 10) / 10 }];
  })));
  return { label, command: steps[0].command, evidence: true,
    sameCommand: steps[0].command === steps[1].command,
    actionBytesEqualAfterEchoRemoval: clean(steps[0].response, steps[0].command) === clean(steps[1].response, steps[1].command),
    effectsEqual: JSON.stringify(effects[0]) === JSON.stringify(effects[1]), effects,
    startingEnergy: steps.map(s => ({ donor: s.before.donor.status.energy, receiver: s.before.receiver.status.energy })) };
});
const outcome = captures.some(c => c.errors.length) ? 'incomplete' : reports.every(r => r.evidence && r.sameCommand && r.actionBytesEqualAfterEchoRemoval && r.effectsEqual) ? 'matched-observed-effects' : 'differences';
console.log(JSON.stringify({ scenario: 'friendly-assistance-v1', outcome, captures: captures.map(({ path, errors }) => ({ path, errors })), reports,
  scope: 'Public displayed state changes and action bytes, with command echo removed. Setup paths and starting supplies may differ; differences need review. Capacity coverage requires evidence of an actual clamp. No private tractor-state inspection, recipient-notification byte comparison, or full random-stream parity claim.' }, null, 2));
process.exitCode = outcome === 'incomplete' ? 2 : outcome === 'differences' ? 1 : 0;
