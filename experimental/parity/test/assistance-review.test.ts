import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

function capture(backend: string) {
  const labels = ['energy-distant', 'energy-inactive', 'energy-clamp', 'energy-full', 'energy-negative', 'energy-enemy'];
  const commands = ['ENERGY VULCAN 100', 'ENERGY WOLF 100', 'ENERGY VULCAN 100', 'ENERGY VULCAN 100', 'ENERGY VULCAN -1', 'ENERGY WOLF 100'];
  const status = (energy: number, v = 7) => ({ energy, position: { v, h: 2 }, shieldsUp: true, shieldPercent: 100, hullDamage: 0, torpedoes: 10 });
  return [{ event: 'configuration', backend, scenario: 'energy-edges-v1', seed: 1729 }, { event: 'sent', line: 'TOURNAMENT 1729' },
    ...labels.map((label, i) => {
      const before = { donor: { status: status(5000) }, receiver: { status: status(label === 'energy-clamp' ? 4984 : 5000, label === 'energy-distant' ? (backend === 'typescript' ? 20 : 30) : 7) } };
      const after = structuredClone(before);
      if (label === 'energy-clamp') { after.donor.status.energy = 4982.3; after.receiver.status.energy = 5000; }
      return { event: 'assistance-step', label, command: commands[i], response: 'captured response', before, after };
    }), { event: 'complete' }, ...['Donor', 'Receiver', 'Opponent'].map(role => ({ event: 'cleanup-complete', role }))];
}
function review(left: unknown[], right: unknown[]) {
  mkdirSync('logs', { recursive: true });
  const root = mkdtempSync('logs/assistance-review-');
  for (const [name, data] of [['ts', left], ['pdp', right]] as const) writeFileSync(`${root}/${name}.jsonl`, data.map(r => JSON.stringify(r)).join('\n') + '\n');
  const result = spawnSync(process.execPath, ['experimental/parity/review-assistance.ts', `${root}/ts.jsonl`, `${root}/pdp.jsonl`], { encoding: 'utf8' });
  writeFileSync(`${root}/report.json`, result.stdout); writeFileSync(`${root}/stderr.txt`, result.stderr);
  return { code: result.status, report: JSON.parse(result.stdout) };
}

test('Energy edge review checks capacity arithmetic despite different distant setup coordinates', () => {
  const result = review(capture('typescript'), capture('pdp10'));
  assert.equal(result.code, 0); assert.equal(result.report.outcome, 'matched-observed-effects');
});

test('Matching wrong arithmetic, wrong commands and missing opponent cleanup cannot pass', () => {
  const wrong = capture('typescript');
  const clamp = wrong.find(r => 'label' in r && r.label === 'energy-clamp')!;
  if ('after' in clamp) clamp.after.donor.status.energy = 4984;
  const native = structuredClone(wrong); Object.assign(native[0], { backend: 'pdp10' });
  assert.equal(review(wrong, native).code, 1);
  const commands = capture('typescript');
  Object.assign(commands[2], { command: 'STATUS' });
  assert.equal(review(commands, capture('pdp10')).code, 2);
  assert.equal(review(capture('typescript'), capture('pdp10').slice(0, -1)).code, 2);
});
