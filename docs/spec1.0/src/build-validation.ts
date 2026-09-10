import { teamOf } from "./model.ts";
import type { Galaxy, Position, ShipName } from "./model.ts";

// Section 7.16, after coordinate resolution. No mutation or conversion policy.
export function validateBuild(galaxy: Galaxy, issuer: ShipName, destination: Position) {
  const ship = galaxy.ships.find(s => s.name === issuer);
  if (!ship?.position || ship.lifecycle.phase !== "COMMISSIONED")
    throw new Error("commissioned positioned issuer required");
  if (![destination.vertical, destination.horizontal].every(n => Number.isInteger(n) && n >= 1 && n <= 75))
    throw new Error("resolved galaxy position required");
  if (Math.max(Math.abs(destination.vertical - ship.position.vertical),
    Math.abs(destination.horizontal - ship.position.horizontal)) > 1)
    return { kind: "NOT_ADJACENT" as const };
  const planet = galaxy.planets.find(p => p.position.vertical === destination.vertical
    && p.position.horizontal === destination.horizontal);
  if (!planet) return { kind: "NO_PLANET" as const };
  const team = teamOf(issuer);
  if (planet.allegiance !== team) return { kind: "NOT_FRIENDLY" as const };
  if (planet.construction === 4 && galaxy.bases.filter(b => b.team === team).length >= 10)
    return { kind: "BASE_LIMIT" as const };
  return { kind: "READY" as const, stage: planet.construction + 1 };
}
