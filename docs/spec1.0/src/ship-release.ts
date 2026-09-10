import type { Galaxy, ShipName } from "./model.ts";
import { releaseTractor } from "./tractor.ts";
import { discardNotificationRecipient } from "./notification-consumption.ts";

// Section 9.2, sequential release only. Array placement does not select
// C-023 delivery order. Admission and final reporting are separate operations.
export function releaseShip(galaxy: Galaxy, departing: ShipName): Galaxy {
  const result = structuredClone(galaxy);
  const ship = result.ships.find(s => s.name === departing);
  if (!ship) throw new Error("roster vessel required");
  if (ship.lifecycle.phase === "AVAILABLE") return result;
  ship.position = null;
  if (ship.tractorLink) {
    const partner = ship.tractorLink;
    releaseTractor(result.ships, departing);
    result.notifications.push({
      facts: { kind: "TRACTOR", ships: [departing, partner], active: false },
      recipients: new Set([departing, partner]),
      pendingRecipients: new Set([departing, partner]),
    });
  }
  result.notifications = result.notifications.flatMap(notice => {
    const remaining = discardNotificationRecipient(notice, departing);
    return remaining ? [remaining] : [];
  });
  result.communication.messages = result.communication.messages.filter(message => {
    message.pendingRecipients.delete(departing);
    return message.pendingRecipients.size !== 0;
  });
  ship.energy = 0;
  ship.lifecycle = { phase: "AVAILABLE" };
  return result;
}
