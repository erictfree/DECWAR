import { add36, multiply36, divide36 } from '../compat/word36.ts';
import type { WordReference } from './lifecycle.ts';
import type { HitRegisters } from './hit-queue.ts';

export type RomulanDamageWorld = { erom: bigint; rom: bigint; locr: { v: number; h: number } };
export type RomulanDamageServices = { iran(max: bigint): bigint; falseWord: bigint; setdsp(v: bigint, h: bigint, code: bigint): void };
// ROMDRV.FOR:212-233: these ENTRY paths bypass ROMDRV's movement locals and
// entry guards. DEADRO never accesses its PHIT/ID arguments or resets IWHAT.
export function damageRomulan(entry: 'pharom' | 'deadro' | 'torom', phit: WordReference, id: WordReference,
  world: RomulanDamageWorld, hit: HitRegisters, io: RomulanDamageServices): void {
  if (entry === 'pharom') {
    hit.iwhat = 1n;
    hit.ihita = divide36(multiply36(add36(100n, io.iran(100n)), phit.value), multiply36(10n, id.value)).quotient;
    world.erom = add36(world.erom, -divide36(hit.ihita, 10n).quotient);
    if (world.erom > 0n) return;
  } else if (entry === 'torom') {
    hit.iwhat = 2n; const draw = io.iran(4000n); hit.ihita = draw < 2000n ? draw : 2000n;
    world.erom = add36(world.erom, -divide36(hit.ihita, 10n).quotient);
    if (world.erom > 0n) return;
  }
  hit.klflg = 2n; world.rom = io.falseWord;
  io.setdsp(BigInt(world.locr.v), BigInt(world.locr.h), 0n);
}
