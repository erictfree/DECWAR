import test from 'node:test';
import assert from 'node:assert/strict';
import { TerminalOutput } from '../src/compat/output.ts';
import { etim, otim } from '../src/compat/time.ts';
import { timeCommand } from '../src/game/time-command.ts';

test('ETIM follows strict twelve-hour boundaries and performs only one wrap correction', () => {
  assert.equal(etim(86399000n, 1000n), 2000n);
  assert.equal(etim(1000n, 86399000n), -2000n);
  assert.equal(etim(0n, 43200000n), 43200000n);
  assert.equal(etim(43200000n, 0n), -43200000n);
  assert.equal(etim(0n, 43200001n), -43199999n);
  assert.equal(etim(43200001n, 0n), 43199999n);
  assert.equal(etim(3n * 86400000n, 0n), -2n * 86400000n);
});

test('OTIM preserves truncation, values beyond 99 hours, and MOVEI on negatives', () => {
  const out = new TerminalOutput();
  otim(out, 3661999n); assert.equal(out.drain(), '01:01:01');
  otim(out, 100n * 3600000n); assert.equal(out.drain(), ':0:00:00');
  otim(out, -1000n); assert.equal(out.drain(), '00:00:\x163');
  // The emitted low seven bits look like CR, but raw C is not CR. HCPOS
  // must not reset because output and bookkeeping use different bit widths.
  out.hcpos = 17;
  out.character(141n);
  assert.equal(out.drain(), '\r'); assert.equal(out.hcpos, 17);
});

test('TIME in game reads clocks in source order, with separate runtime readings', () => {
  const out = new TerminalOutput(), calls: string[] = [];
  const days = [10000n, 12000n, 3661999n], runtimes = [5000n, 7000n];
  timeCommand({ who: 1, gameStarted: 1000n, shipStarted: 2000n, shipRunStarted: 1000n }, out, {
    daytime() { calls.push('day'); return days.shift()!; },
    runtime() { calls.push('run'); return runtimes.shift()!; },
  });
  assert.deepEqual(calls, ['day', 'day', 'run', 'run', 'day']);
  assert.equal(out.drain(), "\r\nGame's elapsed time:  00:00:09\r\nShip's elapsed time:  00:00:10\r\nRun time in game:     00:00:04\r\nJob's total run time: 00:00:07\r\nCurrent time of day:  01:01:01\r\n");
});

test('TIME pre-game omits ship timings and does not read their clocks', () => {
  const out = new TerminalOutput(), calls: string[] = [];
  timeCommand({ who: 0, gameStarted: 0n, shipStarted: 999n, shipRunStarted: 999n }, out, {
    daytime() { calls.push('day'); return 1000n; },
    runtime() { calls.push('run'); return 2000n; },
  });
  assert.deepEqual(calls, ['day', 'run', 'day']);
  assert.equal(out.drain(), "\r\nGame's elapsed time:  00:00:01\r\nJob's total run time: 00:00:02\r\nCurrent time of day:  00:00:01\r\n");
});
