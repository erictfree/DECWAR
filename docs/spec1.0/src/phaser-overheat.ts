export function phaserOverheats(power: number, roll: number): boolean {
  return power * roll > 18900;
}

// Unquantized increment; the specification's state-write decision remains open.
export function phaserOverheatDamage(power: number, roll: number): number {
  return 75 + 0.0075 * roll * power;
}
