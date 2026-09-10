import { FEDERATION_SHIPS, EMPIRE_SHIPS, type ShipName } from "./model.ts";

export function playerRadioOutput(sender: ShipName, recipients: ReadonlySet<ShipName>,
  text: string, length: "SHORT" | "MEDIUM" | "LONG"): string {
  const name = length === "LONG" ? sender[0] + sender.slice(1).toLowerCase() : sender[0];
  const address = [...FEDERATION_SHIPS, ...EMPIRE_SHIPS]
    .filter(ship => recipients.has(ship)).map(ship => " " + ship[0]).join("");
  return "\nMessage from " + name + " to " + address + "\n" + text + "\n\n";
}
