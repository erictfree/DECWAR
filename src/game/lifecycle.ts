import { constants as K, messages as M } from '../runtime/variant-values.ts';
import { PackedBoard } from '../compat/board.ts';
import { add36, multiply36, signed36 } from '../compat/word36.ts';
import { TerminalOutput } from '../compat/output.ts';
import { emptyHit } from './hit-queue.ts';
import type { HitRegisters } from './hit-queue.ts';
import { restoreShipWords, shipWords } from './player.ts';
import type { PlayerSlot } from './player.ts';
import { releaseTractor, tractorMemory } from './tractor.ts';

export type KilledPlayer = { job: bigint; ppn: bigint; tty: bigint; time: bigint; teamShip: bigint };
export class KilledQueue {
  nkill = 0;
  kilndx = 0;
  readonly rows = Array.from({ length: K.KQLEN + 1 }, (): KilledPlayer => ({ job: 0n, ppn: 0n, tty: 0n, time: 0n, teamShip: 0n }));
  // KQSRCH.FOR:32-54. Match first physical job/PPN row. The terminal/time
  // match is commented out. A successful lookup updates only columns 1..3.
  search(tty: bigint, job: bigint, ppn: bigint): number {
    for (let i = 1; i <= this.nkill; i++) {
      const row = this.rows[i];
      if (row.job === job && row.ppn === ppn) { row.job = job; row.ppn = ppn; row.tty = tty; return i; }
    }
    return 0;
  }
}
export type WordReference = { value: bigint };
export type JobStatusArguments = [WordReference, WordReference, WordReference, WordReference, WordReference, WordReference];
function ref(words: bigint[], index: number): WordReference {
  return { get value() { return words[index]; }, set value(value: bigint) { words[index] = value; } };
}
// /FRLOCL/ is session-local and shared by FREE and its RSTART ENTRY. It holds
// the last ship freed by this session, not one saved copy per player slot.
export class SavedShip {
  tship = 0n;
  readonly tshpco = Array<bigint>(11).fill(0n);
  readonly tshpda = Array<bigint>(K.KNDEV + 1).fill(0n);
  readonly tjob = Array<bigint>(K.KNJBST + 1).fill(0n);
  readonly dum = Array<bigint>(16).fill(0n);
  readonly dummy: WordReference = { value: 0n }; // JOBSTA arguments 2/3 alias.
}
export type LifecycleWorld = { players: PlayerSlot[]; board: PackedBoard; killed: KilledQueue;
  numply: bigint; numsid: bigint[]; endflg: bigint; hitime: bigint };
export type ReleaseServices<W> = {
  lock(routine: 'FREE' | 'RSTART'): Generator<W, boolean, void>;
  unlock(): void;
  daytime(): bigint;
  trcoff(who: number): Generator<W, void, void>;
  gethit(who: number): Generator<W, void, void>;
  getmsg(who: number, buffer: bigint[]): Generator<W, void, void>;
};
export type RestartServices<W> = Pick<ReleaseServices<W>, 'lock' | 'unlock'> & {
  jobsta(args: JobStatusArguments): Generator<W, void, void>;
  monit(): Generator<W, void, void>; // A monitor continuation resumes label 800.
};
function player(world: LifecycleWorld, who: number): PlayerSlot {
  if (who < 1 || who > K.KNPLAY || !world.players[who]) throw new RangeError('Lifecycle requires a player slot');
  return world.players[who];
}

// FREE.FOR:38-96. Keep the source order, including checks made before LOCK.
export function* freeShip<W>(world: LifecycleWorld, saved: SavedShip, registers: HitRegisters,
  who: number, io: ReleaseServices<W>): Generator<W, void, void> {
  const p = player(world, who);
  if (p.alive > 0n) return;
  while (!(yield* io.lock('FREE'))) { /* source retries without rechecking ALIVE */ }
  world.board.setdsp(p.ship.v, p.ship.h, 0);
  const team = who > K.KNPLAY / 2 ? 2 : 1;
  saved.tship = BigInt(team * 100 + who);
  world.numply = add36(world.numply, -1n);
  if (world.numply === 0n && world.endflg === 0n) world.hitime = add36(io.daytime(), 300000n);
  world.numsid[team] = add36(world.numsid[team], -1n);
  if (p.ship.tractor !== 0) yield* io.trcoff(who);
  const q = world.killed;
  let index = q.search(p.job[K.KTTYN], p.job[K.KJOB], p.ppn);
  if (index === 0) {
    if (q.nkill < K.KQLEN) q.nkill++;
    q.kilndx++; if (q.kilndx > K.KQLEN) q.kilndx = 1;
    index = q.kilndx;
  }
  const row = q.rows[index];
  row.job = p.job[K.KJOB]; row.ppn = p.ppn; row.tty = p.job[K.KTTYN];
  row.time = io.daytime(); row.teamShip = signed36(BigInt(team) | multiply36(BigInt(who), 262144n));
  for (let i = 1; i <= K.KNJBST; i++) { saved.tjob[i] = p.job[i]; p.job[i] = 0n; }
  const words = shipWords(p.ship);
  for (let i = 1; i <= 10; i++) saved.tshpco[i] = words[i];
  p.ship.v = 0; p.ship.h = 0; p.ship.energy = 0n;
  for (let i = 1; i <= K.KNDEV; i++) saved.tshpda[i] = p.ship.devices[i];
  while (p.hitflg > 0n) yield* io.gethit(who);
  while (p.msgflg > 0n) yield* io.getmsg(who, saved.dum);
  Object.assign(registers, emptyHit(), { dbits: 0n });
  p.alive = 1n;
  io.unlock();
}

// FREE.FOR RSTART:102-146. Only positive board occupancy blocks restart;
// the -1 sentinel passes. There is no second availability check after LOCK.
export function* restartShip<W>(world: LifecycleWorld, saved: SavedShip, who: number,
  out: TerminalOutput, io: RestartServices<W>): Generator<W, void, void> {
  const p = player(world, who);
  for (;;) {
    if (p.ship.v !== 0) out.out(M.free01.text, 1);
    else if (world.board.disp(Number(saved.tshpco[K.KVPOS]), Number(saved.tshpco[K.KHPOS])) > 0) out.out(M.free02.text, 1);
    else break;
    yield* io.monit();
  }
  while (!(yield* io.lock('RSTART'))) { /* source retries without rechecking position */ }
  p.alive = -1n; world.numply = add36(world.numply, 1n);
  const team = Math.trunc((who - 1) / (K.KNPLAY / 2)) + 1;
  world.numsid[team] = add36(world.numsid[team], 1n);
  restoreShipWords(p.ship, saved.tshpco);
  for (let i = 1; i <= K.KNDEV; i++) p.ship.devices[i] = saved.tshpda[i];
  yield* io.jobsta([ref(p.job, K.KJOB), saved.dummy, saved.dummy, ref(p.job, K.KPPN), ref(p.job, K.KTTYN), ref(p.job, K.KTTYSP)]);
  for (const index of [K.KNAM1, K.KNAM2, K.KTTYTP, K.KJOBTM, K.KRUNTM]) p.job[index] = saved.tjob[index];
  world.board.setdsp(Number(saved.tshpco[K.KVPOS]), Number(saved.tshpco[K.KHPOS]), Number(saved.tship));
  io.unlock();
}

// TRACTR.FOR TRCOFF:126-132. MAKHIT uses caller WHO, not necessarily IP.
export function* tractorOff<W>(players: PlayerSlot[], ip: number, registers: HitRegisters,
  makhit: () => Generator<W, void, void>): Generator<W, void, void> {
  yield* releaseTractor({ value: BigInt(ip) }, tractorMemory(players), registers, makhit);
}
