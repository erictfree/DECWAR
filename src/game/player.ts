import { constants as K, ships } from '../generated/source-data.ts';
import { packAscii, signed36 } from '../compat/word36.ts';
import { initialShip } from './ship.ts';
import type { CommandPlayer } from './get-command.ts';
import type { Ship } from './ship.ts';

// HISEG JOB(:,1..9) remains one mutable backing array. GETCMD's descriptive
// fields are accessors, so clearing/restoring JOB changes the same state.
export class PlayerSlot implements CommandPlayer {
  ship = initialShip();
  readonly job = Array<bigint>(K.KNJBST + 1).fill(0n);
  alive = 1n;
  active = 0n;
  hitflg = 0n;
  msgflg = 0n;
  shipName1: bigint;
  shipName2: bigint;
  constructor(index: number) {
    const name = ships[index - 1]?.name;
    if (!name) throw new RangeError('Player slot must be 1..KNPLAY');
    const padded = name.padEnd(10, ' ');
    this.shipName1 = signed36(packAscii(padded.slice(0, 5))); this.shipName2 = signed36(packAscii(padded.slice(5)));
  }
  get ppn(): bigint { return this.job[K.KPPN]; }
  set ppn(value: bigint) { this.job[K.KPPN] = value; }
  get name1(): bigint { return this.job[K.KNAM1]; }
  set name1(value: bigint) { this.job[K.KNAM1] = value; }
  get name2(): bigint { return this.job[K.KNAM2]; }
  set name2(value: bigint) { this.job[K.KNAM2] = value; }
  get started(): bigint { return this.job[K.KJOBTM]; }
  set started(value: bigint) { this.job[K.KJOBTM] = value; }
}
export function playerSlots(): PlayerSlot[] {
  const slots = Array<PlayerSlot>(K.KNPLAY + 1); // Zero is deliberately unused.
  for (let i = 1; i <= K.KNPLAY; i++) slots[i] = new PlayerSlot(i);
  return slots;
}
export function shipWords(ship: Ship): bigint[] {
  // PARAM indices KVPOS through KSSHPC. DOCKED/TRSTAT are outside SHPCON.
  return [0n, BigInt(ship.v), BigInt(ship.h), ship.turns, BigInt(ship.condition), ship.torpedoes,
    ship.shieldCondition, ship.lifeReserves, ship.energy, ship.damage, ship.shieldStrength];
}
export function restoreShipWords(ship: Ship, words: readonly bigint[]): void {
  ship.v = Number(words[K.KVPOS]); ship.h = Number(words[K.KHPOS]); ship.turns = words[K.KNTURN];
  ship.condition = Number(words[K.KSPCON]); ship.torpedoes = words[K.KNTORP]; ship.shieldCondition = words[K.KSHCON];
  ship.lifeReserves = words[K.KLFSUP]; ship.energy = words[K.KSNRGY]; ship.damage = words[K.KSDAM]; ship.shieldStrength = words[K.KSSHPC];
}
