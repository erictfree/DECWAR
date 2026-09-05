import test from 'node:test';
import assert from 'node:assert/strict';
import { stat, pregameStat, users } from '../src/game/users.ts';
import { playerSlots } from '../src/game/player.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { packSixbit, halfWords, rightHalf, MIN_INTEGER } from '../src/compat/word36.ts';
import { constants as K, pregameIdentityLabel } from '../src/generated/source-data.ts';
import { pregameStatText } from '../tools/source.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';
import { freeShip, KilledQueue, SavedShip } from '../src/game/lifecycle.ts';
import { PackedBoard } from '../src/compat/board.ts';
import { emptyHit } from '../src/game/hit-queue.ts';

function fixture() {
  const players = playerSlots(), out = new TerminalOutput(), p = players[1];
  Object.assign(p.ship, { v: 12, h: 25 }); p.alive = -1n;
  p.job[K.KNAM1] = packSixbit('ALICE '); p.job[K.KNAM2] = packSixbit('SMITH ');
  p.job[K.KTTYSP] = 1200n; p.ppn = halfWords(0o123n, 0o4567n); p.job[K.KTTYN] = packSixbit('TTY123'); p.job[K.KJOB] = 12n;
  const ctx = { oflg: 0, ocflg: K.KABS as number, password: false, players };
  const io = { alive: (word: bigint) => word < 0n, ownPosition: () => ({ v: 10, h: 20 }) }; // Explicit compiler/memory fixture.
  return { players, out, p, ctx, io };
}
const row = 'Lexington  ALICE SMITH  1200     123,4567  TTY123   12';

test('STAT prints exactly the first requested fields with original ASCII/SIXBIT padding and no newline', () => {
  const ends = [0, 10, 23, 28, 42, 49, 54];
  assert.equal(row.length, 54);
  for (let n = 0; n <= 7; n++) {
    const f = fixture(); stat(BigInt(n), 1, f.players, f.out);
    assert.equal(f.out.drain(), row.slice(0, ends[Math.min(n, 6)]));
  }
});

test('STAT count uses MOVN/AOJG word operations, including negative counts and minimum integer wrap', () => {
  const f = fixture(); stat(-1n, 100, f.players, f.out); assert.equal(f.out.drain(), '');
  stat(MIN_INTEGER, 1, f.players, f.out); assert.equal(f.out.drain(), row);
});

test('STAT speed and job decimal widths overflow to stars; programmer padding differs at five/six octal digits', () => {
  for (const ppn of [0o12345n, 0o123456n]) {
    const f = fixture(); f.p.job[K.KTTYSP] = 19200n; f.p.job[K.KJOB] = 1000n; f.p.ppn = halfWords(0o777777n, ppn);
    stat(6n, 1, f.players, f.out);
    assert.equal(f.out.drain(), 'Lexington  ALICE SMITH  ****  777777,' + ppn.toString(8) + ' TTY123  ***');
  }
});

test('STAT uses live JOB backing words and measures ship padding from the current HCPOS', () => {
  const f = fixture(); f.out.write('Prefix ');
  const write = f.out.write.bind(f.out);
  f.out.write = text => { write(text); if (text === 'Lexington') f.p.name1 = packSixbit('BOB   '); };
  stat(2n, 1, f.players, f.out);
  assert.equal(f.out.drain(), 'Prefix Lexington  BOB   SMITH '); assert.equal(f.out.hcpos, 30);
});

test('STAT.Y uses the pre-game identity, two-column job number and actual register counter', () => {
  assert.deepEqual(pregameIdentityLabel, pregameStatText());
  const identity = { name1: packSixbit('ALICE '), name2: packSixbit('SMITH '), speed: 1200n,
    ppn: halfWords(0o123n, 0o4567n), tty: packSixbit('TTY123'), job: 123n };
  const out = new TerminalOutput(); pregameStat(-6n, identity, out);
  assert.equal(out.drain(), 'Pre-game   ALICE SMITH  1200     123,4567  TTY123  **');
  pregameStat(-rightHalf(-0o100n), identity, out); // Effective-address fixture for MOVNI, not ordinary double negation.
  assert.equal(out.drain(), 'Pre-game   ALICE SMITH  1200     123,4567  TTY123  **');
  pregameStat(0o100n, identity, out); // A positive raw register skips the fields.
  assert.equal(out.drain(), '');
});

for (const oflg of [-1, 0, 1]) {
  test(`USERS retains all six fields at verbosity ${oflg} and only long output has a header`, () => {
    const f = fixture(); f.ctx.oflg = oflg; users(f.ctx, f.out, f.io);
    assert.equal(f.out.drain(), '\r\n' + (oflg === 1 ? 'Ship       Captain       Baud  User ID     TTY       Job\r\n' : '') + row + '\r\n----\r\n');
  });
}

test('USERS emits the team separator before testing slot six even when all slots are excluded', () => {
  const f = fixture(); const seen: bigint[] = [];
  users(f.ctx, f.out, { ...f.io, alive(word) { seen.push(word); if (seen.length === 6) assert.equal(f.out.drain(), '\r\n----\r\n'); return false; } });
  assert.equal(seen.length, 10); assert.equal(f.out.drain(), '');
});

test('USERS follows physical slot order and delegates raw ALIVE interpretation rather than testing occupancy itself', () => {
  const f = fixture(); f.players[6].job.splice(0, 10, ...f.p.job); f.players[6].alive = 0n;
  const seen: bigint[] = [];
  users(f.ctx, f.out, { ...f.io, alive(word) { seen.push(word); return word !== 1n; } });
  assert.equal(f.out.drain(), '\r\n' + row + '\r\n----\r\nCobra      ' + row.slice(11) + '\r\n');
  assert.deepEqual(seen, [-1n, 1n, 1n, 1n, 1n, 0n, 1n, 1n, 1n, 1n]);
});

test('USERS privilege locations use width two and SHORT PRLOC regardless of report verbosity', () => {
  for (const [mode, location] of [[K.KABS, '12-25'], [K.KREL, ' +2, +5'], [K.KBOTH, '12-25  +2, +5']] as const) {
    const f = fixture(); f.ctx.password = true; f.ctx.oflg = 1; f.ctx.ocflg = mode;
    users(f.ctx, f.out, f.io);
    assert.equal(f.out.drain(), '\r\nShip       Captain       Baud  User ID     TTY       Job  Location\r\n' + row + '   ' + location + '\r\n----\r\n');
  }
});

test('USERS without privilege never requests own position, and ignores CCFLG-like unrelated state', () => {
  const f = fixture(); Object.assign(f.ctx, { ccflg: -1n });
  users(f.ctx, f.out, { ...f.io, ownPosition() { assert.fail('No location request'); } });
  assert.ok(f.out.drain().includes(row));
});

test('USERS dispatch reads the actual player lifecycle state before and after FREE without charging a turn', () => {
  const f = fixture(), shared = { players: f.players, board: new PackedBoard(), killed: new KilledQueue(), numply: 1n,
    numsid: [0n, 1n, 0n], endflg: 0n, hitime: 0n };
  const ctx = { who: 1, player: -1n, ptime: 77n, shared };
  const run = () => dispatchCommand(ctx, 31, {
    *getcmd() { assert.fail(); }, *invoke(call) { assert.equal(call.routine, 'users'); users(f.ctx, f.out, f.io); },
    *quit() { assert.fail(); }, *leave() { assert.fail(); }, *finishTurn() { assert.fail(); }, movementContinuation() { assert.fail(); },
  });
  assert.equal(run().next().done, true); assert.ok(f.out.drain().includes(row));
  assert.equal(freeShip(shared, new SavedShip(), { ...emptyHit(), dbits: 0n }, 1, {
    *lock() { return true; }, unlock() {}, daytime() { return 1000n; }, *trcoff() { assert.fail(); },
    *gethit() { assert.fail(); }, *getmsg() { assert.fail(); },
  }).next().done, true);
  assert.equal(run().next().done, true); assert.equal(f.out.drain(), '\r\n----\r\n'); assert.equal(ctx.ptime, 77n);
});
