// Section 8.7. Readiness equality remains a character-review boundary.
export function romulanWeapon(
  now: number,
  torpedoReady: number,
  phaserReady: number,
  chooseTorpedo: () => boolean,
): "WAIT" | "TORPEDO" | "PHASER" {
  if (Math.min(torpedoReady, phaserReady) > now) return "WAIT";
  if (Math.max(torpedoReady, phaserReady) < now) {
    return chooseTorpedo() ? "TORPEDO" : "PHASER";
  }
  return phaserReady < now ? "PHASER" : "TORPEDO";
}

export function romulanPlanetHit(construction: number, roll: number) {
  if (!Number.isInteger(roll) || roll < 1 || roll > 100) {
    throw new RangeError("roll 1–100 required");
  }
  const remaining = construction - (roll >= 75 ? 1 : 0);
  return {
    construction: remaining < 0 ? null : remaining,
    destroyed: remaining < 0,
    points: remaining < 0 ? -100 : 0,
  };
}
