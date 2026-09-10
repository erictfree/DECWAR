import { FEDERATION_SHIPS, EMPIRE_SHIPS } from "./model.ts";
import type { RadioState, ShipName } from "./model.ts";

// Section 7.17. Tokens are already lexed; replies are successive prompt inputs.
// No global command dispatch, interrupt handling or pending-message delivery.
export function radioCommand(ownName: ShipName, initial: RadioState,
  length: "SHORT" | "MEDIUM" | "LONG", operands: string[], replies: string[][] = []) {
  const radio = { enabled: initial.enabled, gaggedShips: new Set(initial.gaggedShips) };
  let output = "\n", read = 0, tokens = operands;
  const word = (token: string | undefined) => token !== undefined && /^[a-z]+$/i.test(token);
  const result = (waiting: "ACTION" | "NAME" | null = null) => ({ radio, output, waiting, repliesRead: read });
  let action: "ON" | "OFF" | "GAG" | "UNGAG" | undefined;
  while (true) {
    action = word(tokens[0])
      ? (["ON", "OFF", "GAG", "UNGAG"] as const).find(a => a.startsWith(tokens[0].toUpperCase()))
      : undefined;
    if (action) break;
    output += "Turn radio ON or OFF, GAG or UNGAG individual ship?  ";
    if (read === replies.length) return result("ACTION");
    tokens = replies[read++];
    if (!tokens.length) return result();
    output += "\n";
  }
  if (tokens.length > (action === "ON" || action === "OFF" ? 1 : 2)) {
    throw new Error("trailing operands remain under review");
  }
  if (action === "ON" || action === "OFF") {
    radio.enabled = action === "ON";
    output += `Radio turned ${action.toLowerCase()}, Captain.\n`;
    return result();
  }
  let target = tokens[1];
  while (!word(target)) {
    output += "Ship name:  ";
    if (read === replies.length) return result("NAME");
    const response = replies[read++];
    if (!response.length) return result();
    if (response.length > 1) throw new Error("name-response suffix remains under review");
    target = response[0];
  }
  const name = [...FEDERATION_SHIPS, ...EMPIRE_SHIPS].find(n => n.startsWith(target.toUpperCase()));
  if (!name) {
    output += "Unknown ship name.\n";
    return result();
  }
  if (name === ownName) return result();
  if (action === "GAG") radio.gaggedShips.add(name);
  else radio.gaggedShips.delete(name);
  const displayName = length === "LONG" ? name[0] + name.slice(1).toLowerCase() : name[0];
  output += `Radio ${action === "GAG" ? "gagged" : "ungagged"} against ${displayName}\n`;
  return result();
}
