import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { DecwarRandom } from '../../src/compat/random.ts';
import { ranFractionWord } from '../../src/compat/ran-float36.ts';
import { nearestDecimalFloat36, roundedFloat36, fixFloat36 } from '../../src/compat/float-arithmetic36.ts';

// Pinned f78f2ec DECWAR.MAP: TORDAM/PHADAM 440105–441252,
// TORP 441253–442623, PLNATK 427121–427546. WARMAC RAN. reads
// SEED at 462121; breakpoint 462122 observes that input in active AC1.
const [tracePath, capturePath, debuggerPath] = process.argv.slice(2);
if (!debuggerPath) throw new Error('Usage: review-random-window.ts TS_RANDOM TS_CAPTURE NATIVE_DEBUGGER');
const jsonl = (path: string) => readFileSync(path, 'utf8').trim().split('\n').map(line => JSON.parse(line));
const capture = jsonl(capturePath), trace = jsonl(tracePath);
const phaser = capture.find(e => e.event === 'sent' && e.role === 'attacker' && e.line.startsWith('PHASERS'));
const torpedo = capture.find(e => e.event === 'sent' && e.role === 'attacker' && e.line.startsWith('TORPEDOES'));
const finished = capture.find(e => e.event === 'combat-step' && e.command.startsWith('TORPEDOES'));
assert(phaser && torpedo && finished, 'Missing measured weapons');
const phase = trace.filter(e => e.job === 1 && e.name === 'ran' && e.time >= phaser.time && e.time < torpedo.time);
const shot = trace.filter(e => e.job === 1 && e.name === 'ran' && e.time >= torpedo.time && e.time <= finished.time);
assert.equal(phase.length, 2); assert.equal(shot.length, 6);
const native = readFileSync(debuggerPath, 'utf8').split(/Breakpoint, PC: 462122/).slice(1)
  .filter(s => /FMSEL:\s+020\b/.test(s)).map(s => ({
    seed: /FM\[17\]:\s+([0-7]+)/.exec(s)?.[1],
    caller: /FM\[30\]:\s+([0-7]+)/.exec(s)?.[1],
    ub: /UB:\s+([0-7]+)/.exec(s)?.[1],
  })).filter(e => e.seed && e.caller && e.ub);
const starts = native.filter(e => e.seed === phase[0].before && e.caller === '000000441227');
assert.equal(starts.length, 1, 'Ambiguous native phaser start');
const job = native.filter(e => e.ub === starts[0].ub), begin = job.indexOf(starts[0]);
const torpIndex = job.findIndex((e, i) => i > begin && e.caller === '000000442563');
assert(torpIndex > begin);
assert.equal(job[begin + 1].seed, phase[1].before);
const extra = job.slice(begin + 2, torpIndex);
assert(extra.every(e => e.caller === '000000427543'), 'Intervening call outside observed PLNATK site');
// Verify observed native seed transitions with the existing integer generator.
for (let i = begin; i < torpIndex + 7; i++) {
  const rng = new DecwarRandom(BigInt('0o' + job[i].seed)); rng.nextRaw();
  assert.equal(rng.seed, BigInt('0o' + job[i + 1].seed));
}
const damageSeeds = [shot[3].before, job[torpIndex + 5].seed!];
const literal = (text: string) => { const r = nearestDecimalFloat36(text); assert(!r.trap1); return r.word; };
const op = (operation: 'add' | 'sub' | 'mul', a: bigint, b: bigint) => { const r = roundedFloat36(operation, a, b); assert(!r.trap1); return r.word; };
const damage = damageSeeds.map(seed => {
  const rng = new DecwarRandom(BigInt('0o' + seed));
  const draws = Array.from({ length: 3 }, () => ranFractionWord(rng.nextRaw()));
  // Austin DECWAR.FOR:4107,4111,4129–4131: noncritical shielded hit,
  // with the observed 801/1000 shield strength. Verify the branch predicates.
  const deflect = op('add', op('sub', draws[1], op('mul', op('mul', literal('801'), literal('0.001')), draws[0])), literal('0.1'));
  assert(deflect > 0n);
  const hit = op('add', literal('4000'), op('mul', literal('4000'), draws[2]));
  const hull = op('mul', op('mul', hit, op('sub', literal('1000'), literal('801'))), literal('0.001'));
  assert(op('mul', hull, op('add', draws[1], literal('0.1'))) < literal('1700'));
  const fixed = fixFloat36(hull, 0n); assert(!fixed.trap1);
  return { seed, randomWords: draws.map(w => w.toString(8)), hullDamageInternal: fixed.word.toString() };
});
console.log(JSON.stringify({ schema: 'random-window-v1', matchingPhaserSeeds: phase.map(e => e.before), nativeExtraPlanetDraws: extra.length,
  torpedoStartSeeds: { typescript: shot[0].before, native: job[torpIndex].seed }, damage,
  scope: 'Pinned native user register bank 020, grouped by UB; all native seed transitions checked. Existing rounded arithmetic reproduces the noncritical shielded hit from each observed damage seed. Not general compiler or random-stream parity.' }, null, 2));
