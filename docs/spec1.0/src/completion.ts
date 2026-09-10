import type { DeviceDamage, Score } from "./model.ts";

// Section 9.1: one sequential completion, after automatic repair if applicable.
export function worldActivityTrigger(progress: number, players: number) {
  if (!Number.isInteger(progress) || progress < 0 ||
      !Number.isInteger(players) || players < 1)
    throw new RangeError("Completion requires nonnegative progress and a player commission");
  const next = progress + 1;
  return next < players
    ? { progress: next, due: false }
    : { progress: 0, due: true };
}

export function automaticRepair(damage: DeviceDamage): DeviceDamage {
  return Object.fromEntries(Object.entries(damage).map(([device, value]) =>
    [device, Math.max(value - 30, 0)])) as DeviceDamage;
}

export function lifeSupportCheck(damage: number, docked: boolean,
  reserve: number, hullDamage: number): { reserve: number; hullDamage: number } {
  if (damage < 300) return { reserve, hullDamage };
  const remaining = reserve - (docked ? 0 : 1);
  return { reserve: remaining, hullDamage: remaining < 0 ? 2500 : hullDamage };
}

export function commitScore(score: Score, faction: Score, pending: Score): void {
  for (const category of Object.keys(pending) as (keyof Score)[]) {
    score[category] += pending[category];
    faction[category] += pending[category];
    pending[category] = 0;
  }
}
