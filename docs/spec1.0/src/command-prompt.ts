import type { Ship, PlayerPreferences } from "./model.ts";
import { integerField } from "./output.ts";

// Section 9.3: after fatal checks, before the ending check and prompt rendering.
export function acquisitionAlert(ship: Pick<Ship, "energy" | "hullDamage" | "condition">) {
  if (ship.energy <= 0 || ship.hullDamage >= 2500)
    throw new Error("Fatal departure precedes acquisition alert processing");
  const condition = ship.energy <= 1000 ? "YELLOW" as const : ship.condition;
  return { condition, output: condition === "YELLOW" ? "\u0007".repeat(4) : "" };
}

// Section 10.10: output only, not the decision to accept another command.
export function commandPrompt(ship: Pick<Ship, "deviceDamage" | "lifeSupportReserve"
  | "shields" | "hullDamage" | "energy">, style: PlayerPreferences["promptStyle"]): string {
  if (style === "NORMAL") return "Command: ";
  let prompt = "";
  if (ship.deviceDamage.LIFE_SUPPORT >= 300) prompt += integerField(ship.lifeSupportReserve) + "L";
  if (ship.shields.mode === "DOWN" || ship.shields.strength <= 10) prompt += "S";
  if (ship.hullDamage >= 2000) prompt += "D";
  if (ship.energy <= 1000) prompt += "E";
  return prompt + "> ";
}
