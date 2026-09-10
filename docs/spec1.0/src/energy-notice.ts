import type { ShipName } from "./model.ts";
import { decimalField } from "./output.ts";

// Section 7.12: notification rendering, not transfer arithmetic or delivery.
export function energyNotice(sender: ShipName, recipient: ShipName, delivered: number,
  length: "SHORT" | "MEDIUM" | "LONG"): string {
  const long = length === "LONG";
  const name = (ship: ShipName) => long ? ship[0] + ship.slice(1).toLowerCase() : ship[0];
  const amount = decimalField(delivered, 0, length === "SHORT");
  return long
    ? `\n${name(sender)}  transfers ${amount} units of energy to the  ${name(recipient)} \n`
    : `${name(sender)} ${amount} > ${name(recipient)} \n`;
}
