import { teamOf } from "./model.ts";
import type { Ship, ShipName } from "./model.ts";

export type EnergyInputToken =
  | { kind: "WORD"; text: string }
  | { kind: "INTEGER"; value: number }
  | { kind: "OTHER" };

// Already-tokenized operands and prompt responses; no raw editing or echo.
// READY marks the boundary before the unresolved transfer-arithmetic policy.
export function energyDialogue(
  ships: Pick<Ship, "name" | "lifecycle" | "position" | "energy">[],
  issuer: ShipName, initial: readonly EnergyInputToken[],
  responses: readonly (readonly EnergyInputToken[])[],
  length: "SHORT" | "MEDIUM" | "LONG",
): { status: "PROMPT" | "CANCELLED" | "REJECTED"; output: string; responsesUsed: number }
  | { status: "READY"; recipient: ShipName; amount: number; output: string; responsesUsed: number } {
  let tokens = initial;
  let output = "\n";
  let responsesUsed = 0;
  while (true) {
    const name = tokens[0], amount = tokens[1];
    if (name?.kind === "WORD" && amount?.kind === "INTEGER") {
      const result = validateEnergy(ships, issuer, name.text.toUpperCase(), amount.value, length);
      if (!result.accepted) return { status: "REJECTED",
        output: output + result.output.slice(1), responsesUsed };
      return { status: "READY", recipient: result.recipient, amount: amount.value,
        output, responsesUsed };
    }
    output += length === "LONG" ? "Destination ship name and energy to transfer: " : "Ship, energy: ";
    if (responsesUsed === responses.length) return { status: "PROMPT", output, responsesUsed };
    tokens = responses[responsesUsed++];
    if (tokens.length === 0) return { status: "CANCELLED", output, responsesUsed };
  }
}

// Section 7.12: complete ordered validation of a resolved word/integer pair.
// Successful validation does not yet perform the precision-dependent transfer.
export function validateEnergy(ships: Pick<Ship, "name" | "lifecycle" | "position" | "energy">[],
  issuer: ShipName, name: string, amount: number, length: "SHORT" | "MEDIUM" | "LONG"):
  { accepted: true; recipient: ShipName } | { accepted: false; output: string } {
  if (!name || !Number.isInteger(amount)) throw new Error("resolved word and integer required");
  const sender = ships.find(s => s.name === issuer);
  if (!sender || sender.lifecycle.phase !== "COMMISSIONED" || !sender.position)
    throw new Error("commissioned positioned issuer required");
  const fail = (text: string) => ({ accepted: false as const, output: "\n" + text + "\n" });
  const target = ships.find(s => s.name.startsWith(name));
  if (!target) return fail("Unknown ship name.");
  if (target.name === issuer) return fail((length === "LONG" ? "Beg your pardon, Captain?  " : "") + "Transfer energy to US!?!");
  if (target.lifecycle.phase !== "COMMISSIONED") return fail("Player not in game.");
  if (teamOf(target.name) !== teamOf(issuer)) return fail("Can not transfer energy to enemy ship.");
  if (!target.position) throw new Error("commissioned target requires position");
  if (Math.max(Math.abs(sender.position.vertical - target.position.vertical),
    Math.abs(sender.position.horizontal - target.position.horizontal)) > 1)
    return fail("Not adjacent to destination ship.");
  if (amount >= sender.energy) return fail(length === "LONG"
    ? "Captain, our ship doesn't possess that much energy!" : "Insufficient ship energy.");
  if (amount <= 0) return fail((length === "LONG" ? "Illegal energy transfer.  " : "") + "Transfer aborted.");
  return { accepted: true, recipient: target.name };
}
