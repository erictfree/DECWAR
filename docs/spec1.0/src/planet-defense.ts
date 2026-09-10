import type { Team } from "./model.ts";

export function planetActivates(allegiance: Team | "NEUTRAL", triggering: Team,
  neutralChoice: boolean): boolean {
  return allegiance === "NEUTRAL" ? neutralChoice : allegiance !== triggering;
}

export function planetaryPower(construction: number, players: number, romulan: boolean): number {
  if (!Number.isInteger(construction) || construction < 0 || construction > 4)
    throw new RangeError("Planet construction must be 0 through 4");
  if (!Number.isInteger(players) || players < 1)
    throw new RangeError("Player-triggered cycle requires a player");
  const power = 50 + 30 * construction;
  return romulan ? power : Math.trunc(power / players);
}
