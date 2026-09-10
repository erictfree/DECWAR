// Executable companion to the self-contained CAPTURE and BUILD award rules.
export function constructionAward(stage: number): number {
  if (!Number.isInteger(stage) || stage < 1 || stage > 5) {
    throw new RangeError("completed construction stage must be 1 through 5");
  }
  return 50 * stage + (stage === 5 ? 250 : 0);
}

export function captureAward(): number {
  return 100;
}

export function pointsAverage(total: number, count: number): number {
  if (!Number.isInteger(count) || count <= 0)
    throw new RangeError("Positive denominator required; C-013 remains unresolved");
  const tenths = Math.round(total * 10);
  if (!Number.isFinite(total) || Math.abs(total * 10 - tenths) > 1e-8)
    throw new RangeError("Score precision finer than tenths remains unresolved");
  const result = Math.trunc(tenths / count) / 10;
  return result === 0 ? 0 : result;
}
