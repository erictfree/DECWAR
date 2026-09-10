import { teamOf } from "./model.ts";
import type { Ship, ShipName, Position } from "./model.ts";

// Section 7.15: final hit audience, not the discarded pre-capture selection.
export function captureRecipients(ships: readonly Pick<Ship, "name" | "position" | "lifecycle">[],
  capturer: ShipName, position: Position): Set<ShipName> {
  return new Set(ships.filter(ship => {
    if (ship.lifecycle.phase === "AVAILABLE" || !ship.position) return false;
    const distance = Math.max(Math.abs(ship.position.vertical - position.vertical),
      Math.abs(ship.position.horizontal - position.horizontal));
    return distance <= (teamOf(ship.name) === teamOf(capturer) ? 10 : 4);
  }).map(ship => ship.name));
}
