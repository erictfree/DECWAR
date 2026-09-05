import { debugText as T, messages as M } from '../generated/source-data.ts';
import { add36, divide36, leftHalf, multiply36, packAscii, rightHalf, signed36, unpackAscii } from '../compat/word36.ts';
import { TerminalOutput } from '../compat/output.ts';

export type TimerField = 'name' | 'count' | 'total' | 'high';
export type LocalTimerField = 'start' | 'name';
export interface TimerStorage { read(field: TimerField, index: bigint): bigint; write(field: TimerField, index: bigint, value: bigint): void; }
export interface LocalTimerStorage { read(field: LocalTimerField, index: bigint): bigint; write(field: LocalTimerField, index: bigint, value: bigint): void; }
export type OutsideTimerMemory = { read(offset: bigint): bigint; write(offset: bigint, value: bigint): void };

// WARMAC.MAC:462-466,674-675; HIGH.FOR:24; DECWAR.MAP:31. TIMERS
// reserves 250 words, with 50 unused after the four arrays. The caller supplies
// initial words: the archive
// does not establish the loader's initialization of COMMON/BLOCK storage.
// Off-table subscripts alias adjacent arrays before requesting outside memory.
class TimerWords {
  readonly words: bigint[];
  private readonly outside?: OutsideTimerMemory;
  constructor(words: bigint[], size: number, outside?: OutsideTimerMemory) {
    if (words.length !== size) throw new RangeError(`Expected ${size} timer words`);
    this.words = words; this.outside = outside;
  }
  read(offset: bigint): bigint {
    if (offset >= 0n && offset < BigInt(this.words.length)) return signed36(this.words[Number(offset)]);
    if (!this.outside) throw new RangeError('Timer access requires surrounding machine memory');
    return signed36(this.outside.read(offset));
  }
  write(offset: bigint, value: bigint): void {
    if (offset >= 0n && offset < BigInt(this.words.length)) this.words[Number(offset)] = signed36(value);
    else if (this.outside) this.outside.write(offset, signed36(value));
    else throw new RangeError('Timer access requires surrounding machine memory');
  }
}
export class Timers implements TimerStorage {
  private readonly memory: TimerWords;
  constructor(words: bigint[], outside?: OutsideTimerMemory) { this.memory = new TimerWords(words, 250, outside); }
  private offset(field: TimerField, index: bigint) { return BigInt(['name', 'count', 'total', 'high'].indexOf(field) * 50) + index; }
  read(field: TimerField, index: bigint) { return this.memory.read(this.offset(field, index)); }
  write(field: TimerField, index: bigint, value: bigint) { this.memory.write(this.offset(field, index), value); }
}
export class LocalTimers implements LocalTimerStorage {
  private readonly memory: TimerWords;
  constructor(words: bigint[], outside?: OutsideTimerMemory) { this.memory = new TimerWords(words, 100, outside); }
  private offset(field: LocalTimerField, index: bigint) { return (field === 'start' ? 0n : 50n) + index; }
  read(field: LocalTimerField, index: bigint) { return this.memory.read(this.offset(field, index)); }
  write(field: LocalTimerField, index: bigint, value: bigint) { this.memory.write(this.offset(field, index), value); }
}
export class DebugRegisters { t1 = 0n; t2 = 0n; x1 = 0n; }
export type DebugContext = { pasflg: bigint; hungup: bigint };
export type DebugServices = {
  outstr(text: string): void; // Direct monitor calls, no OCHR HCPOS/BLANK updates.
  outchr(word: bigint): void; // Keep the full OUTCHR operand, including negative-digit residues.
};
export type TimerServices = { uct(): bigint | null }; // CALLI -210; null executes the failure SETZ.

// TIMSRC, WARMAC.MAC:4300-4310. Read exactly @0(ARG), not the entire string.
// Empty slots reset only TIMHI; slot zero is overwritten without a name test.
export function timerSearch(name: () => bigint, shared: TimerStorage, r: DebugRegisters): void {
  r.t1 = signed36(name()); r.t2 = 49n;
  for (;;) {
    if (r.t1 === shared.read('name', r.t2)) return;
    if (shared.read('name', r.t2) === 0n) break;
    r.t2 = add36(r.t2, -1n); if (r.t2 <= 0n) break;
  }
  if (r.t2 === 0n) r.t1 = packAscii('?????');
  shared.write('name', r.t2, r.t1); shared.write('high', r.t2, 0n);
}

// TIMIN/TIMOUT, WARMAC.MAC:4280-4298. No locks or timer stack. Local name
// mismatch skips timing; a failed clock is zero, not an aborted update.
export function timerIn(name: () => bigint, shared: TimerStorage, local: LocalTimerStorage, r: DebugRegisters, io: TimerServices): void {
  timerSearch(name, shared, r); local.write('name', r.t2, r.t1);
  r.t1 = signed36(io.uct() ?? 0n); local.write('start', r.t2, r.t1);
}
export function timerOut(name: () => bigint, shared: TimerStorage, local: LocalTimerStorage, r: DebugRegisters, io: TimerServices): void {
  timerSearch(name, shared, r); if (r.t1 !== local.read('name', r.t2)) return;
  shared.write('count', r.t2, add36(shared.read('count', r.t2), 1n));
  r.t1 = signed36(io.uct() ?? 0n); r.t1 = add36(r.t1, -local.read('start', r.t2));
  shared.write('total', r.t2, add36(shared.read('total', r.t2), r.t1));
  if (r.t1 > shared.read('high', r.t2)) shared.write('high', r.t2, r.t1);
}

// DEBDEC/DEBOCT/DEBCOM, WARMAC.MAC:4567-4582. Recursion stores each remainder
// in the return word's left half, then HLRZ zero-extends it. No sign handling.
export function debugNumber(radix: 8 | 10, ctx: Pick<DebugContext, 'hungup'>, r: DebugRegisters, io: Pick<DebugServices, 'outchr'>): void {
  const stack: bigint[] = [];
  do {
    const division = divide36(r.t1, BigInt(radix)); r.t1 = division.quotient; r.t2 = division.remainder;
    stack.push(rightHalf(r.t2));
  } while (r.t1 !== 0n);
  for (let i = stack.length - 1; i >= 0; i--) {
    r.t1 = add36(stack[i], 48n); if (ctx.hungup === 0n) io.outchr(r.t1);
  }
}

// DEBUG, WARMAC.MAC:4314-4348. Privilege is a raw sign test; the report exits
// on a zero name, not a row bound. Slot-zero exhaustion can read before TIMNAM.
export function debug(ctx: DebugContext, shared: TimerStorage, r: DebugRegisters, out: TerminalOutput, io: DebugServices): void {
  if (signed36(ctx.pasflg) >= 0n) { out.out(M.unkcom.text); out.out(M.forhlp.text); return; }
  io.outstr(T[0].text); r.x1 = 49n;
  for (;;) {
    if (shared.read('name', r.x1) === 0n) return;
    r.t1 = shared.read('name', r.x1); r.t2 = 0n;
    io.outstr(unpackAscii(r.t1).split('\0', 1)[0]); io.outchr(9n);
    r.t1 = shared.read('count', r.x1); debugNumber(10, ctx, r, io); io.outchr(9n);
    r.t1 = shared.read('total', r.x1); r.t1 = leftHalf(multiply36(r.t1, 86400n)); debugNumber(10, ctx, r, io); io.outchr(9n);
    r.t1 = shared.read('high', r.x1); r.t1 = leftHalf(multiply36(r.t1, 86400n)); debugNumber(10, ctx, r, io);
    io.outstr(T[1].text); r.x1 = add36(r.x1, -1n);
  }
}
