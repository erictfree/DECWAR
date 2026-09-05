import { constants as K } from '../generated/source-data.ts';

// SETUP.FOR:469-490. This is ship-local state, not a replacement for HISEG.
export type Ship = {
  v: number;
  h: number;
  turns: bigint;
  energy: bigint;
  shieldStrength: bigint;
  shieldCondition: bigint;
  condition: number;
  damage: bigint;
  devices: bigint[]; // Index zero unused; preserve PARAM.FOR device indices.
  lifeReserves: bigint;
  torpedoes: bigint;
  docked: boolean;
  tractor: number;
};
export function initialShip(): Ship {
  return { v: 0, h: 0, turns: 0n, energy: 50000n, shieldStrength: 1000n, shieldCondition: 1n,
    condition: K.GREEN, damage: 0n, devices: Array<bigint>(K.KNDEV + 1).fill(0n),
    lifeReserves: 5n, torpedoes: 10n, docked: false, tractor: 0 };
}
export const min = (a: bigint, b: bigint): bigint => a < b ? a : b;
export const max = (a: bigint, b: bigint): bigint => a > b ? a : b;
