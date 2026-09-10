import { FEDERATION_SHIPS, EMPIRE_SHIPS } from "./model.ts";
import type { PlayerPreferences, Position, Ship, ShipName, RomulanState } from "./model.ts";
import type { LexicalToken } from "./lexical.ts";

export type DestinationResult = { kind: "POSITION"; position: Position }
  | { kind: "INPUT_NEEDED" | "CANCELLED" }
  | { kind: "REJECTED"; output: string }
  | { kind: "REVIEW_REQUIRED"; issue: "MALFORMED_COMPUTED_DESTINATION" };

// Section 5.5. The caller has already performed any command-specific checks
// preceding destination resolution. No command effects, prompts or waiting.
export function resolveDestination(galaxy: {
  ships: readonly Pick<Ship, "name" | "position" | "lifecycle" | "deviceDamage">[];
  romulan: RomulanState;
},
  issuer: ShipName, preferences: Pick<PlayerPreferences, "coordinateInput">,
  supplied: readonly LexicalToken[], context: "INITIAL" | "RESPONSE" = "INITIAL"): DestinationResult {
  if (!supplied.length) return { kind: context === "RESPONSE" ? "CANCELLED" : "INPUT_NEEDED" };
  const ship = galaxy.ships.find(s => s.name === issuer);
  if (!ship || ship.lifecycle.phase !== "COMMISSIONED" || !ship.position)
    throw new Error("Destination resolution requires a positioned commissioned issuer");
  const reject = (output: string): DestinationResult => ({ kind: "REJECTED", output });
  const first = supplied[0];
  const explicit = first.kind === "WORD" && first.text
    ? (["ABSOLUTE", "RELATIVE", "COMPUTED"] as const).find(m => m.startsWith(first.text.toUpperCase())) : undefined;
  const operands = explicit ? supplied.slice(1) : supplied;
  if (explicit === "COMPUTED") {
    if (ship.deviceDamage.COMPUTER >= 300) return reject("Computer inoperative.\n");
    if (!operands.length) return { kind: "INPUT_NEEDED" };
    if (operands.length !== 1 || operands[0].kind !== "WORD")
      return { kind: "REVIEW_REQUIRED", issue: "MALFORMED_COMPUTED_DESTINATION" };
    const word = operands[0].text.toUpperCase();
    const name = [...FEDERATION_SHIPS, ...EMPIRE_SHIPS].find(n => word && n.startsWith(word));
    if (name) {
      const target = galaxy.ships.find(s => s.name === name);
      if (!target || target.lifecycle.phase !== "COMMISSIONED" || !target.position)
        return reject("Player not in game.\n");
      return { kind: "POSITION", position: { ...target.position } };
    }
    if (!word || !"ROMULAN".startsWith(word)) return reject("Unrecognized ship name.\n");
    if (!galaxy.romulan.enabled || !galaxy.romulan.vessel) return reject("Player not in game.\n");
    return { kind: "POSITION", position: { ...galaxy.romulan.vessel.position } };
  }
  if (!operands.length) return { kind: "INPUT_NEEDED" };
  if (operands.length !== 2) return reject("Wrong number of coordinates specified.\n");
  if (operands.some(t => t.kind !== "INTEGER")) return reject("Non-numeric coordinate.\n");
  const relative = (explicit ?? preferences.coordinateInput) === "RELATIVE";
  // Exact integer calculation avoids imposing a host-number limit before the
  // game's 1..75 bounds check. BigInt is a companion technique, not a game type.
  const vertical = BigInt(operands[0].text) + (relative ? BigInt(ship.position.vertical) : 0n);
  const horizontal = BigInt(operands[1].text) + (relative ? BigInt(ship.position.horizontal) : 0n);
  if (vertical < 1n || vertical > 75n) return reject("X coordinate lies outside galaxy.\n");
  if (horizontal < 1n || horizontal > 75n) return reject("Y coordinate lies outside galaxy.\n");
  return { kind: "POSITION", position: { vertical: Number(vertical), horizontal: Number(horizontal) } };
}
