// Initial, unquantized quantities from Section 6.1, not a full damage operation.
export function absorb(incident: number, strength: number) {
  return {
    initialDamage: incident * (1 - strength / 100),
    remainingStrength: strength - (0.03 * incident * Math.max(strength / 100, 0.1) + 0.03),
  };
}

export function phaserIncident(power: number, distance: number, u: number,
  shielded: boolean, impairedPlayer: boolean): number {
  return (shielded ? 4 : 8) * power * ((0.9 + 0.02 * u) ** distance)
    * (impairedPlayer ? 0.8 : 1);
}

export function torpedoDeflected(strength: number, u: number, v: number): boolean {
  // Algebraic form avoids cancellation at the simple decimal boundary.
  return v + 0.1 <= (strength / 100) * u;
}

// Section 6.2 intermediate quantities; state-write precision remains open.
export function criticalHit(damage: number, sample: number): boolean {
  return damage * (sample + 0.1) >= 170;
}

export function shipDamage(damage: number, critical: boolean, hullSample: number) {
  return critical
    ? { deviceDamage: damage / 2, hullLoss: damage / 2 + (hullSample - 0.5) * 100 }
    : { deviceDamage: 0, hullLoss: damage };
}

export function baseDamage(strength: number, damage: number,
  directEmergency: boolean, emergencySample: number, destructionChoice: boolean) {
  let damagePoints = 0;
  if (!directEmergency) {
    strength = Math.max(strength - 0.01 * damage, 0);
    damagePoints = damage;
    if (strength > 0) return { strength, damagePoints, destroyed: false };
  }
  strength -= 5 + Math.floor(100 * emergencySample) / 10;
  const destroyed = destructionChoice || strength <= 0;
  return { strength: destroyed ? 0 : strength,
    damagePoints: damagePoints + (destroyed ? 1000 : 0), destroyed };
}
