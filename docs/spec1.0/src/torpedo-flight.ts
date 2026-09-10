function unit(value: number): number {
  if (!(value >= 0 && value < 1)) throw new RangeError("unit sample required");
  return value;
}

export function torpedoExtent(u: number): number {
  return 8 + Math.trunc(4 * unit(u) - 1.5);
}

export function torpedoDeflection(base: number, damage: number | null,
  shield: { strength: number; sample: number } | null,
  misfire: number | null): number {
  let result = (unit(base) - 0.5) / 5;
  if (damage !== null) result += (unit(damage) - 0.5) / 10;
  if (shield !== null) result += shield.strength * (unit(shield.sample) - 0.5) / 1000;
  if (misfire !== null) result += (unit(misfire) - 0.5) / 5;
  return result;
}

export function misfireTubeDamage(roll: number): number {
  if (!Number.isInteger(roll) || roll < 1 || roll > 3000) throw new RangeError("roll 1–3000 required");
  return 50 + roll / 10;
}
