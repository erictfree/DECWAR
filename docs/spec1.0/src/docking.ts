import { teamOf } from "./model.ts";
import type { Base, Planet, Ship } from "./model.ts";
import { statusReport } from "./ship-reports.ts";
import type { StatusField } from "./ship-reports.ts";

// Section 7.14: immediate DOCK operation, before autonomous turn completion.
export function dockShip(prior: Ship, bases: Base[], planets: Planet[],
  length: "SHORT" | "MEDIUM" | "LONG", status: false | StatusField[] = false) {
  if (prior.lifecycle.phase !== "COMMISSIONED" || !prior.position) {
    throw new Error("commissioned positioned ship required");
  }
  const position = prior.position, team = teamOf(prior.name);
  const adjacent = (p: { vertical: number; horizontal: number }) =>
    Math.max(Math.abs(p.vertical - position.vertical), Math.abs(p.horizontal - position.horizontal)) <= 1;
  const units = 2 * bases.filter(b => b.team === team && b.strength > 0 && adjacent(b.position)).length
    + planets.filter(p => p.allegiance === team && adjacent(p.position)).length;
  const ship = structuredClone(prior);
  if (!units) {
    const name = length === "LONG" ? ship.name[0] + ship.name.slice(1).toLowerCase() : ship.name[0];
    return { ship, units, completesTurn: false, output: `\n${name} not adjacent to base!!\n` };
  }
  ship.torpedoes = Math.min(ship.torpedoes + 5 * units, 10);
  ship.energy = Math.min(ship.energy + 500 * units, 5000);
  ship.shields.strength = Math.min(ship.shields.strength + 10 * units, 100);
  ship.hullDamage = Math.max(ship.hullDamage - 50 * units * (ship.docked ? 2 : 1), 0);
  ship.docked = true;
  ship.lifeSupportReserve = 5;
  ship.condition = "GREEN";
  const output = "\nDOCKED.\n" + (status === false ? "" : statusReport(ship, length, status));
  return { ship, units, completesTurn: true, output };
}
