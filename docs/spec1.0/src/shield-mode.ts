import type { Ship, ShipName } from "./model.ts";
import { releaseTractor } from "./tractor.ts";

type Step = { kind: "OUTPUT"; text: string }
  | { kind: "TRACTOR_RELEASE"; recipients: Set<ShipName> };

// Section 7.11: resolved UP/DOWN through immediate effects. The steps record
// notice creation, not asynchronous display. No transfer or fatal departure.
export function shieldMode(prior: Ship[], issuer: ShipName, mode: "UP" | "DOWN") {
  const ships = structuredClone(prior), ship = ships.find(s => s.name === issuer);
  if (!ship || ship.lifecycle.phase !== "COMMISSIONED") throw new Error("commissioned issuer required");
  const steps: Step[] = [{ kind: "OUTPUT", text: "\n" }];
  const out = (text: string) => steps.push({ kind: "OUTPUT", text });
  if (mode === "DOWN") {
    ship.shields.mode = "DOWN";
    out("Shields lowered, Captain.\n");
  } else if (ship.deviceDamage.SHIELDS > 300) {
    out("Captain, unable to raise shields due to critical damage.\n");
  } else {
    ship.shields.mode = "UP";
    ship.energy = Math.max(ship.energy - 100, 0);
    out("Shields raised, Captain.\n");
    if (ship.tractorLink) {
      const notices = releaseTractor(ships, issuer);
      steps.push({ kind: "TRACTOR_RELEASE", recipients: new Set(notices.map(n => n.recipient)) });
    }
    if (ship.energy === 0) out("\nShield control uses remaining ship energy!\n");
  }
  return { ships, steps, output: steps.flatMap(step => step.kind === "OUTPUT" ? [step.text] : []).join("") };
}
