import test from 'node:test';
import assert from 'node:assert/strict';
import { clearStatistics } from '../src/game/clear-statistics.ts';
import type { ClearStatisticsContext, ClearStatisticsServices } from '../src/game/clear-statistics.ts';
import { StatisticsBuffer } from '../src/game/statistics.ts';
import { clearStatisticsText } from '../src/generated/source-data.ts';
import { statisticsMessages } from '../tools/source.ts';

function fixture() {
  const ctx: ClearStatisticsContext = { buffer: new StatisticsBuffer(), addrck: 9n, hungup: 0n, frebie: 0n };
  ctx.buffer.words.fill(123n);
  const events: string[] = [], writes: bigint[][] = [], text: string[] = [];
  const io: ClearStatisticsServices<never> = {
    *lock(key) { events.push(`lock:${key}`); return true; }, unlo(key) { events.push(`unlo:${key}`); },
    *gripe() { events.push('gripe'); assert.equal(ctx.addrck, 1n); ctx.buffer.words[0] = 456n; },
    *open(block) { events.push(block); return { opened: true, lePpn: 0n }; },
    *output(buffer, descriptor) { events.push(descriptor); writes.push([...buffer.words]); },
    *close() { events.push('close'); }, outstr(value) { text.push(value); },
  };
  return { ctx, events, writes, text, io };
}
function finish(run: Generator<never, void, void>) { assert.equal(run.next().done, true); }

test('STAZAP strings are extracted and clearing retains precisely the word zero left by GRIPE', () => {
  assert.deepEqual(clearStatisticsText, statisticsMessages('stazap'));
  const f = fixture(); finish(clearStatistics(f.ctx, f.io));
  assert.deepEqual(f.ctx.buffer.words, [456n, ...Array<bigint>(639).fill(0n)]);
  assert.equal(f.writes.length, 2); assert.deepEqual(f.writes[0], f.ctx.buffer.words); assert.deepEqual(f.writes[1], f.writes[0]);
  assert.deepEqual(f.events, ['lock:stabuf', 'gripe', 'staupd', 'staiow', 'close', 'stfupd', 'staiow', 'close', 'unlo:stabuf']);
  assert.equal(f.text.join(''), '\r\nZapping statistics logs....\r\nFinished!\r\n'); assert.equal(f.ctx.addrck, 0n);
});

test('STAZAP lock retry does not repeat the announcement or set ADDRCK before the lock succeeds', () => {
  const f = fixture(); let attempts = 0;
  const io: ClearStatisticsServices<'wait'> = { ...f.io, *lock() { yield 'wait'; return ++attempts === 2; } };
  const run = clearStatistics(f.ctx, io);
  assert.equal(run.next().value, 'wait'); assert.equal(f.ctx.addrck, 9n);
  assert.equal(run.next().value, 'wait'); assert.equal(f.ctx.buffer.words[1], 123n);
  assert.equal(f.text.length, 1); assert.equal(run.next().done, true);
});

test('STAZAP exposes the GRIPE suspension before clearing the shared buffer', () => {
  const f = fixture();
  const io: ClearStatisticsServices<'gripe'> = { ...f.io, *gripe() { yield 'gripe'; f.ctx.buffer.words[0] = 789n; } };
  const run = clearStatistics(f.ctx, io);
  assert.equal(run.next().value, 'gripe'); assert.equal(f.ctx.addrck, 1n); assert.equal(f.ctx.buffer.words[1], 123n);
  assert.equal(run.next().done, true); assert.equal(f.writes[0][0], 789n);
});

for (const block of ['staupd', 'stfupd'] as const) {
  test(`STAZAP ${block} open failure stops remaining writes but still prints Finished and clears ADDRCK`, () => {
    const f = fixture();
    f.io.open = function* (name) { f.events.push(name); return { opened: name !== block, lePpn: 0n }; };
    finish(clearStatistics(f.ctx, f.io));
    assert.equal(f.writes.length, block === 'staupd' ? 0 : 1);
    if (block === 'staupd') assert.equal(f.events.includes('stfupd'), false);
    assert.equal(f.text.join(''), "\r\nZapping statistics logs....\r\n\r\nCan't open file for output!\r\n\r\n\r\nFinished!\r\n");
    assert.equal(f.events.at(-1), 'unlo:stabuf'); assert.equal(f.ctx.addrck, 0n);
  });
}

test('STAZAP always updates both file selections and has no HUNGUP guard around direct output', () => {
  const f = fixture(); f.ctx.hungup = -1n; f.ctx.frebie = -1n;
  finish(clearStatistics(f.ctx, f.io)); assert.equal(f.writes.length, 2); assert.equal(f.text.length, 2);
});
