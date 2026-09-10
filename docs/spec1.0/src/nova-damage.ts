export function novaBlast(strength: number, raised = true): number {
  const blast = raised ? 100 - strength : 100;
  return blast < 20 ? 25 : blast;
}

export function novaDamage(blast: number, roll: number): number {
  return 8 * blast + roll / 10;
}

export function novaStrength(strength: number, roll: number): number {
  return Math.max(strength - 30 + roll / 10, 0);
}

export function novaPlanet(construction: number) {
  return construction < 3
    ? { destroyed: true, construction: null, points: -100 }
    : { destroyed: false, construction: construction - 3, points: 0 };
}
