import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

function fixture(backend: string) {
  const operations = [['donor-down','SHIELDS DOWN'],['receiver-down','SHIELDS DOWN'],['activate','TRACTOR VULCAN'],['recipient-moves','MOVE ABSOLUTE 8 3'],['recipient-shield-release','SHIELDS UP'],['recipient-down-again','SHIELDS DOWN'],['reactivate','TRACTOR VULCAN'],['bare-release','TRACTOR'],['attach-before-quit','TRACTOR VULCAN']];
  const notice = (verb: string) => `\r\nTractor beam ${verb}, Captain.`;
  let state = { donor: { status: { energy: 5000, position: { v: 7, h: 2 }, shieldsUp: true }, text: '' }, receiver: { status: { energy: 4000, position: { v: 7, h: 3 }, shieldsUp: true }, text: '' } };
  const steps = operations.map(([label, command], index) => {
    const before = structuredClone(state); state = structuredClone(state);
    state.donor.text = state.receiver.text = '';
    if (index === 0) state.donor.status.shieldsUp = false;
    if (index === 1 || index === 5) state.receiver.status.shieldsUp = false;
    if (index === 3) { state.receiver.status.energy -= 12; state.receiver.status.position = { v: 8, h: 3 }; state.donor.status.position = { v: 7, h: 3 }; }
    if (index === 4) { state.receiver.status.energy -= 100; state.receiver.status.shieldsUp = true; }
    if ([2,4,6,7,8].includes(index)) state.donor.text = state.receiver.text = notice([4,7].includes(index) ? 'broken' : 'activated');
    return { event: 'assistance-step', label, command, response: 'command response', before, after: structuredClone(state) };
  });
  const before = structuredClone(state.donor), after = structuredClone(before); after.text = notice('broken');
  const soloAfter = structuredClone(after); soloAfter.status.position = { v: 8, h: 2 }; soloAfter.status.energy -= 4;
  return [{ event: 'configuration', scenario: 'tractor-edges-v1', backend }, { event: 'sent', line: 'TOURNAMENT 1729' }, ...steps,
    { event: 'quit-release', before, after, users: 'Yorktown' }, { event: 'solo-move', before: after, after: soloAfter },
    { event: 'complete' }, { event: 'cleanup-complete', role: 'Donor' }, { event: 'cleanup-complete', role: 'Receiver' }];
}
function review(left: unknown[], right: unknown[]) {
  mkdirSync('logs', { recursive: true }); const root = mkdtempSync('logs/tractor-review-');
  for (const [name, rows] of [['ts',left],['pdp',right]] as const) writeFileSync(`${root}/${name}.jsonl`, rows.map(r => JSON.stringify(r)).join('\n')+'\n');
  const r = spawnSync(process.execPath,['experimental/parity/review-tractor-edges.ts',`${root}/ts.jsonl`,`${root}/pdp.jsonl`],{encoding:'utf8'});
  writeFileSync(`${root}/report.json`,r.stdout); writeFileSync(`${root}/stderr.txt`,r.stderr);return r.status;
}
test('Tractor review requires reciprocal movement and both recipient notices', () => {
  assert.equal(review(fixture('typescript'),fixture('pdp10')),0);
  const left=fixture('typescript'), right=fixture('pdp10');
  for (const rows of [left,right]) {
    const r=rows.find(r=>'label' in r && r.label==='recipient-moves')!;
    if ('after' in r && r.after && 'donor' in r.after) r.after.donor.status.position={v:7,h:2};
  }
  assert.equal(review(left,right),1,'matching wrong movement is not parity');
  const missing=fixture('pdp10'); const r=missing.find(r=>'label' in r && r.label==='bare-release')!;
  if ('after' in r && r.after && 'receiver' in r.after) r.after.receiver.text='';
  assert.equal(review(fixture('typescript'),missing),1);
});
test('Tractor capture without surviving movement or cleanup is incomplete', () => {
  assert.equal(review(fixture('typescript'),fixture('pdp10').filter(r=>r.event!=='solo-move')),2);
  assert.equal(review(fixture('typescript'),fixture('pdp10').slice(0,-1)),2);
});
