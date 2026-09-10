export function romulanPhaserHit(power: number, distance: number, roll: number) {
  const damage = Math.trunc((100 + roll) * power / (10 * distance)) / 10;
  return { damage, energyLoss: Math.trunc(damage) / 10 };
}

export function romulanTorpedoHit(roll: number) {
  const damage = Math.min(roll, 2000) / 10;
  return { damage, energyLoss: Math.trunc(damage) / 10 };
}
