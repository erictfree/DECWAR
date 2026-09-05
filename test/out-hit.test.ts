import test from 'node:test';
import assert from 'node:assert/strict';
import { outHit, renderHit } from '../src/game/out-hit.ts';
import type { HitOutputContext } from '../src/game/out-hit.ts';
import { emptyHit, HitQueue } from '../src/game/hit-queue.ts';
import type { HitRegisters } from '../src/game/hit-queue.ts';
import { initialShip } from '../src/game/ship.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { constants as K } from '../src/generated/source-data.ts';

function context(oflg = 0): HitOutputContext {
  const ship = initialShip(); ship.v = 10; ship.h = 20;
  return { who: 1, team: 1, oflg, ocflg: 1, nomsg: 0n, ship };
}
function hit(type = 1n): HitRegisters {
  return { ...emptyHit(), iwhat: type, dispfr: 101n, dispto: 210n, ihita: 1234n, critdv: 2n, critdm: 345n,
    vfrom: 1n, hfrom: 2n, vto: 3n, hto: 4n, shcnfr: 1n, shstfr: 1000n, shcnto: -1n, shstto: 450n, dbits: 1n };
}
// Independently transcribed source-derived byte expectations: OUTHIT.FOR
// branches, MSG.MAC:180-216, WARMAC output tables, and PRLOC/OSFLT rules.
import { hitTranscripts as fixtures } from './support/out-hit-transcripts.ts';

for (const [type, ...expected] of fixtures) for (const [i, verbosity] of [-1, 0, 1].entries()) {
  test(`OUTHIT event ${type}, verbosity ${verbosity}: exact source-derived bytes`, () => {
    const ctx = context(verbosity), event = hit(BigInt(type)), out = new TerminalOutput();
    if ([6, 7, 8].includes(type)) event.dispfr = 900n;
    if ([9, 10].includes(type)) event.dispto = 400n;
    if (type === 11) event.dispfr = 500n;
    const before = structuredClone(event);
    renderHit(ctx, event, out);
    assert.equal(out.drain(), expected[i]); assert.deepEqual(event, before);
  });
}

test('OUTHIT shows critical damage only to surviving own ship, with source device padding', () => {
  const expected = ['; WA  34', '; Warp dam 34.5', '; Warp Engines damaged 34.5 units'];
  for (const [i, verbosity] of [-1, 0, 1].entries()) {
    const ctx = context(verbosity), event = { ...hit(), dispto: 101n }, out = new TerminalOutput();
    renderHit(ctx, event, out); assert.ok(out.drain().endsWith(expected[i] + '\r\n'));
    event.dispto = 102n; renderHit(ctx, event, out); assert.equal(out.drain().includes(';'), false);
    event.dispto = 101n; event.klflg = 2n; renderHit(ctx, event, out); assert.equal(out.drain().includes('damaged'), false);
  }
});

test('OUTHIT displacement prefixes and relative own-location suppression preserve punctuation', () => {
  for (const [v, prefix] of [[-1, '>'], [0, '-->'], [1, 'displaced to ']] as const) {
    const ctx = context(v), event = { ...hit(), shjump: 1n }, out = new TerminalOutput();
    renderHit(ctx, event, out); assert.ok(out.drain().includes(prefix + '3-4'));
  }
  const ctx = context(), event = { ...hit(), vto: 10n, hto: 20n }, out = new TerminalOutput();
  ctx.ocflg = K.KREL;
  renderHit(ctx, event, out); assert.ok(out.drain().includes('W @, -45.0%'));
  ctx.ocflg = K.KBOTH; renderHit(ctx, event, out);
  assert.ok(out.drain().includes('L @1-2 -9,-18, +100.0%'));
});

test('OUTHIT planet strength uses unscaled integer counts; planet targets omit numeric hit magnitude', () => {
  const event = { ...hit(2n), dispfr: 600n, dispto: 700n, shstfr: 7n, shstto: 9n }, out = new TerminalOutput();
  renderHit(context(), event, out);
  assert.equal(out.drain(), ' @7 @1-2  T  +@9 @3-4\r\n');
  renderHit(context(1), event, out);
  assert.equal(out.drain(), 'Neu planet(7) @1-2 makes torpedo hit on Fed planet(9) @3-4\r\n');
  event.iwhat = 8n; renderHit(context(), event, out);
  assert.equal(out.drain(), ' @7 @1-2  N  +@9 @3-4\r\n');
});

test('OUTHIT Romulan attacker still shows shields without coordinate comma and preserves negative zero', () => {
  const event = { ...hit(), dispfr: 500n, shstfr: 0n }, out = new TerminalOutput();
  renderHit(context(), event, out);
  assert.equal(out.drain(), '?? @1-2 -0.0%  123.4 unit P  W @3-4, -45.0%\r\n');
});

test('OUTHIT long output wraps before target only above column forty and only classes below Romulan', () => {
  const ctx = context(1), event = { ...hit(8n), dispfr: 900n }, prefix = 'Star @1-2 makes 123.4 unit hit on ';
  for (const width of [40, 41]) {
    const out = new TerminalOutput(); out.hcpos = width - prefix.length;
    renderHit(ctx, event, out); const text = out.drain();
    assert.ok(text.startsWith(prefix + (width === 41 ? '\r\n' : '') + 'Wolf'));
  }
  const out = new TerminalOutput(); out.hcpos = 50;
  event.dispto = 500n; renderHit(ctx, event, out);
  assert.ok(out.drain().startsWith(prefix + 'Romulan'));
});

test('OUTHIT critical base narrative distinguishes shields restored and base destroyed', () => {
  const ctx = context(1), event = { ...hit(), dispto: 400n }, out = new TerminalOutput();
  renderHit(ctx, event, out);
  assert.equal(out.drain(), 'Lexington @1-2, +100.0% makes 123.4 unit phaser hit on \r\nEmp Base @3-4, -45.0%  Critical hit on starbase, shields down!\r\nStarbase attempts to re-establish shields using emergency power!\r\nBase shields RE-ESTABLISHED!!\r\n\r\n');
  event.klflg = 2n; renderHit(ctx, event, out);
  assert.equal(out.drain(), 'Lexington @1-2, +100.0% makes 123.4 unit phaser hit on \r\nEmp Base @3-4  \r\nCritical hit on starbase, shields down!\r\nStarbase attempts to re-establish shields using emergency power!\r\nBase FAILS to re-establish shields........BOOM!!  \r\nEmp Base DESTROYED!!\r\n\r\n');
  event.klflg = 0n; event.critdm = 0n; renderHit(ctx, event, out);
  assert.equal(out.drain().includes('Critical hit'), false);
});

test('OUTHIT black-hole destruction differs from ordinary destruction and omits target shields', () => {
  for (const v of [-1, 0, 1]) {
    const event = { ...hit(), klflg: 1n }, out = new TerminalOutput();
    renderHit(context(v), event, out); const text = out.drain();
    assert.equal(text.includes('-45'), false);
    assert.ok(text.includes(v <= 0 ? 'W -> BH\r\nW DESTROYED!!' : 'Wolf displaced by blast into BLACK HOLE!\r\nWolf DESTROYED!!'));
    event.klflg = 2n; renderHit(context(v), event, out);
    assert.equal(out.drain().includes(v <= 0 ? 'BH' : 'BLACK HOLE'), false);
  }
});

test('OUTHIT base broadcasts allow exactly KCRIT damage but reject greater damage and radio off', () => {
  const ctx = context(), event = { ...hit(9n), dispto: 400n }, out = new TerminalOutput();
  ctx.ship.devices[K.KDRAD] = BigInt(K.KCRIT);
  renderHit(ctx, event, out); assert.equal(out.drain(), ')( @3-4 attacked\r\n');
  ctx.ship.devices[K.KDRAD]++;
  renderHit(ctx, event, out); assert.equal(out.drain(), '');
  ctx.ship.devices[K.KDRAD] = 0n; ctx.nomsg = 1n;
  renderHit(ctx, event, out); assert.equal(out.drain(), '');
  event.iwhat = 13n; renderHit(ctx, event, out); assert.equal(out.drain(), 'Trac. Beam on\r\n');
});

test('OUTHIT composes MAKHIT/GETHIT, drains physical queue order and clears all seventeen registers', () => {
  const ctx = context(), out = new TerminalOutput(), queue = new HitQueue();
  const flags = Array.from({ length: 11 }, () => ({ hitflg: 0n })), registers = hit(12n);
  queue.make(2, registers, flags, 0n, out);
  Object.assign(registers, hit(13n)); queue.make(1, registers, flags, 0n, out);
  const run = outHit(ctx, registers, flags, out, function* (who) { queue.get(who, registers, flags); });
  assert.equal(run.next().done, true);
  assert.equal(out.drain(), 'Trac. Beam on\r\nL 123.4 > W \r\n');
  assert.equal(flags[1].hitflg, 0n); assert.deepEqual(registers, { ...emptyHit(), dbits: 0n });
});

test('OUTHIT clears registers on empty entry, discards invalid IWHAT and preserves long blank-line ordering', () => {
  const ctx = context(1), out = new TerminalOutput(), flags = [{ hitflg: 0n }, { hitflg: 2n }], registers = hit();
  const events = [hit(0n), hit(13n)];
  const run = outHit(ctx, registers, flags, out, function* () {
    assert.deepEqual(registers, { ...emptyHit(), dbits: 0n });
    Object.assign(registers, events.shift()); flags[1].hitflg--;
  });
  assert.equal(run.next().done, true);
  assert.equal(out.drain(), '\r\n\r\nTractor beam activated, Captain.\r\n');
  assert.deepEqual(registers, { ...emptyHit(), dbits: 0n });
});

test('OUTHIT does not treat a negative HITFLG as an empty queue', () => {
  const ctx = context(), out = new TerminalOutput(), registers = hit(), flags = [{ hitflg: 0n }, { hitflg: -1n }];
  const queue = new HitQueue();
  const run = outHit(ctx, registers, flags, out, function* (who) { yield 'get'; queue.get(who, registers, flags); });
  assert.equal(run.next().value, 'get'); assert.equal(run.next().value, 'get');
  assert.equal(flags[1].hitflg, -2n); assert.equal(out.drain(), ''); run.return();
});
