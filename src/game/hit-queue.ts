import { constants as K } from '../generated/source-data.ts';
import { add36, HALF_MASK, halfWords, leftHalf, rightHalf, signed36, unsigned36 } from '../compat/word36.ts';
import { TerminalOutput } from '../compat/output.ts';
import { objectArray, wordArray } from '../compat/memory.ts';
import type { WordMemory } from '../compat/memory.ts';
import { queueLayout } from '../generated/queue-layout.ts';

export type HitQueueMemory = { memory: WordMemory; serialAddress: bigint; linksAddress: bigint;
  dataAddress: bigint; readBits(index: number): bigint };

export type HitInfo = { dispfr: bigint; dispto: bigint; ihita: bigint; critdm: bigint;
  iwhat: bigint; critdv: bigint; vfrom: bigint; hfrom: bigint; vto: bigint; hto: bigint;
  klflg: bigint; shcnfr: bigint; shcnto: bigint; shstfr: bigint; shstto: bigint; shjump: bigint };
export type HitRegisters = HitInfo & { dbits: bigint };
export function emptyHit(): HitInfo {
  return { dispfr: 0n, dispto: 0n, ihita: 0n, critdm: 0n, iwhat: 0n, critdv: 0n,
    vfrom: 0n, hfrom: 0n, vto: 0n, hto: 0n, klflg: 0n,
    shcnfr: 0n, shcnto: 0n, shstfr: 0n, shstto: 0n, shjump: 0n };
}
type ByteField = [keyof HitInfo, number, number]; // width, end position (MSB=0).
// WARMAC:3321-3326 and POINT descriptors at 3381-3407/3490-3517. Widths
// and positions follow the explicit hit layout. Numeric POINT operand
// interpretation still requires assembler confirmation (see compatibility).
const third: ByteField[] = [['iwhat', 4, 3], ['critdv', 4, 7], ['vfrom', 7, 14],
  ['hfrom', 7, 21], ['vto', 7, 28], ['hto', 7, 35]];
const fourth: ByteField[] = [['klflg', 2, 1], ['shcnfr', 1, 2], ['shcnto', 1, 3],
  ['shstfr', 10, 13], ['shstto', 10, 23], ['shjump', 1, 24]];

function deposit(word: bigint, value: bigint, size: number, end: number): bigint {
  const mask = (1n << BigInt(size)) - 1n, shift = BigInt(35 - end);
  return signed36((word & ~(mask << shift)) | ((value & mask) << shift));
}
export function packHit(info: HitInfo, previous: readonly bigint[] = [0n, 0n, 0n, 0n]): bigint[] {
  const words = [signed36(halfWords(info.dispfr, info.dispto)), signed36(halfWords(info.ihita, info.critdm)), previous[2], previous[3]];
  for (const [key, size, end] of third) words[2] = deposit(words[2], info[key], size, end);
  for (const [key, size, end] of fourth) {
    const value = (key === 'shcnfr' || key === 'shcnto') && info[key] <= 0n ? 0n : info[key];
    words[3] = deposit(words[3], value, size, end);
  }
  return words;
}
export function unpackHit(words: readonly bigint[]): HitInfo {
  const from = leftHalf(words[0]), to = rightHalf(words[0]);
  const info = { ...emptyHit(), dispfr: from === HALF_MASK ? 0n : from, dispto: to === HALF_MASK ? 0n : to,
    ihita: leftHalf(words[1]), critdm: rightHalf(words[1]) };
  for (const [index, fields] of [[2, third], [3, fourth]] as const) {
    for (const [key, size, end] of fields) info[key] = (words[index] >> BigInt(35 - end)) & ((1n << BigInt(size)) - 1n);
  }
  if (info.shcnfr === 0n) info.shcnfr = -1n;
  if (info.shcnto === 0n) info.shcnto = -1n;
  return info;
}

// WARMAC MAKHIT/GETHIT:3330-3523, not the linked-list queue manager.
// Forty slots per SENDER, 400 total. HITFLG is deliberately not reconciled
// after overwrite; retrieval scans physical slot order, not serial order.
export class HitQueue {
  private localSerial = 0n;
  private localHeader = -1n;
  private storage?: HitQueueMemory;
  readonly links: bigint[];
  readonly data: bigint[][];
  constructor(storage?: HitQueueMemory) {
    this.storage = storage;
    const count = queueLayout.constants.knhit;
    this.links = storage ? wordArray(storage.memory, storage.linksAddress, count) : Array<bigint>(count).fill(0n);
    this.data = storage ? objectArray(count, index => wordArray(storage.memory, storage.dataAddress + BigInt(index * 4), 4))
      : Array.from({ length: count }, () => Array<bigint>(4).fill(0n));
  }
  get serial(): bigint { return this.storage ? this.storage.memory.read(this.storage.serialAddress) : this.localSerial; }
  set serial(value: bigint) {
    if (this.storage) this.storage.memory.write(this.storage.serialAddress, value); else this.localSerial = signed36(value);
  }
  get header(): bigint { return this.storage ? this.storage.memory.read(this.storage.linksAddress - 1n) : this.localHeader; }
  set header(value: bigint) {
    if (this.storage) this.storage.memory.write(this.storage.linksAddress - 1n, value); else this.localHeader = signed36(value);
  }
  initialize(): void { this.header = -1n; this.links.fill(0n); } // SETQH retains HITSER/data.
  make(who: number, registers: HitRegisters, flags: { hitflg: bigint }[], password: bigint, out: TerminalOutput): void {
    if (registers.dbits !== 0n) {
      if (!this.storage && (who < 1 || who > K.KNPLAY)) throw new RangeError('MAKHIT sender outside hit queue');
      if (!this.storage && (registers.dbits & ~((1n << BigInt(K.KNPLAY)) - 1n)) !== 0n) throw new RangeError('MAKHIT bits outside HITFLG');
      const perShip = queueLayout.constants.knhshp;
      let selected = (who - 1) * perShip, oldest = this.serial;
      for (let index = selected, end = index + perShip; index < end; index++) {
        if (rightHalf(this.links[index]) === 0n) { selected = index; break; }
        const age = leftHalf(this.links[index]);
        if (age < oldest) { oldest = age; selected = index; }
      }
      this.serial = add36(this.serial, 1n);
      this.links[selected] = signed36(halfWords(this.serial, 0n));
      if ((registers.iwhat <= 0n || registers.iwhat > 15n) && password !== 0n) {
        out.crlf(); out.out('%Illegal IWHAT code in MAKHIT: '); out.odec(registers.iwhat); out.crlf();
      }
      const words = this.data[selected], packed = packHit(registers, words);
      for (let i = 0; i < 4; i++) words[i] = packed[i];
      this.links[selected] = signed36(this.links[selected] | registers.dbits);
      let remaining = unsigned36(registers.dbits);
      registers.dbits = 0n;
      for (let p = 1; remaining !== 0n; p++, remaining >>= 1n)
        if ((remaining & 1n) !== 0n) flags[p].hitflg = add36(flags[p].hitflg, 1n);
    }
    Object.assign(registers, emptyHit());
  }
  get(who: number, registers: HitRegisters, flags: { hitflg: bigint }[]): void {
    if (!this.storage && (who < 1 || who > K.KNPLAY)) throw new RangeError('GETHIT recipient outside HITFLG');
    flags[who].hitflg = add36(flags[who].hitflg, -1n);
    let bit = 0n, index = -1;
    if (flags[who].hitflg >= 0n) {
      bit = this.storage ? this.storage.readBits(who) : 1n << BigInt(who - 1);
      index = this.links.findIndex(word => (word & bit) !== 0n);
    }
    if (index < 0) { Object.assign(registers, emptyHit()); return; } // Retains DBITS and decremented HITFLG.
    Object.assign(registers, unpackHit(this.data[index]));
    registers.dbits = rightHalf(this.links[index]);
    this.links[index] = signed36(this.links[index] & ~bit);
  }
}
