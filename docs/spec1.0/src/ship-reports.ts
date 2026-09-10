import type { Device, DeviceDamage, Ship, ShipName } from "./model.ts";
import { decimalField, integerField, positionField } from "./output.ts";

type Length = "SHORT" | "MEDIUM" | "LONG";
export type StatusField = "CONDITION" | "LOCATION" | "TORPEDOES" | "ENERGY"
  | "DAMAGE" | "SHIELDS" | "RADIO";
type StatusShip = Pick<Ship, "stardate" | "condition" | "docked" | "position"
  | "torpedoes" | "energy" | "hullDamage" | "shields" | "radio" | "deviceDamage">;

export type ReportSelectorToken = { kind: "WORD"; text: string } | { kind: "OTHER" };

// Observed C-010 recovery for review, using full-word recognition (C-008).
// Input is already tokenized; no command prompt, raw editing or echo is added.
export function statusFromTokens(ship: StatusShip, length: Length,
  tokens: readonly ReportSelectorToken[]): string {
  if (!tokens.length) return statusReport(ship, length);
  const order: StatusField[] = ["SHIELDS", "LOCATION", "CONDITION", "TORPEDOES", "ENERGY", "DAMAGE", "RADIO"];
  let output = "\n";
  for (const token of tokens) {
    if (token.kind !== "WORD") break;
    const spelling = token.text.toUpperCase();
    const word = spelling === "TORPEDOS" ? "TORPEDOES" : spelling;
    const field = word && order.find(f => f.startsWith(word));
    if (!field) { output += "%Syntax error\n"; continue; }
    const row = statusReport(ship, length, [field]).slice(1);
    output += length === "SHORT" ? row.slice(0, -1) : row;
  }
  return output + (length === "SHORT" ? "\n" : "");
}

// Sections 7.7 and 10.2–10.3; selected fields have already been resolved.
export function statusReport(ship: StatusShip, length: Length,
  selected: StatusField[] = []): string {
  if (!ship.position) throw new Error("STATUS requires a ship position");
  const short = length === "SHORT", width = short ? 0 : 4;
  const prefixes = {
    STARDATE: ["SD", "SDate  ", "Stardate\t"],
    CONDITION: ["", "Cond   ", "Condition\t"],
    LOCATION: ["", "Loc    ", "Location\t"],
    TORPEDOES: ["T", "Torps  ", "Torpedoes\t"],
    ENERGY: ["E", "Ener   ", "Energy left\t"],
    DAMAGE: ["D", "Dam    ", "Damage\t\t"],
    SHIELDS: ["SH", "Shlds  ", "Shields\t        "],
    RADIO: ["R", "Radio  ", "Radio\t\t"],
  };
  const fields: (StatusField | "STARDATE")[] = selected.length ? selected
    : ["STARDATE", "CONDITION", "LOCATION", "TORPEDOES", "ENERGY", "DAMAGE", "SHIELDS", "RADIO"];
  let output = "\n";
  for (const field of fields) {
    let value: string;
    switch (field) {
      case "STARDATE": value = integerField(ship.stardate, width); break;
      case "CONDITION": {
        const condition = short ? ship.condition[0]
          : ship.condition[0] + ship.condition.slice(1).toLowerCase();
        value = (ship.docked ? (short ? "D+" : "Docked+") : "") + condition;
        break;
      }
      case "LOCATION": value = positionField(ship.position, ship.position, "ABSOLUTE", true); break;
      case "TORPEDOES": value = integerField(ship.torpedoes, width); break;
      case "ENERGY": value = decimalField(ship.energy, width, short); break;
      case "DAMAGE": value = decimalField(ship.hullDamage, width, short); break;
      case "SHIELDS":
        value = decimalField(ship.shields.strength * (ship.shields.mode === "UP" ? 1 : -1), width, short, true);
        if (!short) value += "% " + decimalField(ship.shields.strength * 25, width, false) + " units";
        break;
      case "RADIO": value = ship.deviceDamage.RADIO >= 300 ? "damaged" : ship.radio.enabled ? "On" : "Off"; break;
    }
    output += prefixes[field][short ? 0 : length === "MEDIUM" ? 1 : 2] + value + (short ? " " : "\n");
  }
  return output + (short ? "\n" : "");
}

const devices: [Device, string, string, string][] = [
  ["SHIELDS", "SH", "Shields", "Deflector Shields"],
  ["WARP_ENGINES", "WA", "Warp", "Warp Engines"],
  ["IMPULSE_ENGINES", "IM", "Impulse", "Impulse Engines"],
  ["LIFE_SUPPORT", "LS", "Life Sup", "Life Support"],
  ["TORPEDO_TUBES", "TO", "Torps", "Torpedo Tubes"],
  ["PHASERS", "PH", "Phasers", "Phasers"],
  ["COMPUTER", "CO", "Computer", "Computer"],
  ["RADIO", "RA", "Radio", "Radio"],
  ["TRACTOR_BEAM", "TR", "Tractor", "Tractor Beam"],
];

// Observed C-010 recovery; the all-functional test precedes selector handling.
export function damagesFromTokens(name: ShipName, damage: DeviceDamage,
  length: Length, tokens: readonly ReportSelectorToken[]): string {
  if (tokens[0]?.kind !== "WORD") return damagesReport(name, damage, length);
  const selectors: string[] = [];
  for (const token of tokens) {
    if (token.kind !== "WORD") break;
    selectors.push(token.text.toUpperCase());
  }
  return damagesReport(name, damage, length, selectors);
}

// Section 7.6. Selectors are normalized word tokens; non-word recovery is separate.
export function damagesReport(name: ShipName, damage: DeviceDamage, length: Length,
  selectors: string[] = []): string {
  if (devices.every(([device]) => damage[device] <= 0)) return "\nAll devices functional.\n";
  let output = "\n";
  if (!selectors.length) {
    if (length === "LONG") output += "Damage Report for " + name[0] + name.slice(1).toLowerCase() + "\n\n";
    if (length !== "SHORT") output += "Device" + " ".repeat(length === "LONG" ? 13 : 4) + "Damage\n\n";
  }
  const rows = selectors.length
    ? selectors.flatMap(selector => devices.filter(([, code]) => selector.length > 0 && code.startsWith(selector)))
    : devices.filter(([device]) => damage[device] > 0);
  for (const [device, short, medium, long] of rows) {
    const prefix = length === "SHORT" ? short + "  "
      : (length === "MEDIUM" ? medium + " " : long + " ").padEnd(length === "MEDIUM" ? 9 : 18);
    output += prefix + decimalField(damage[device], 4, length === "SHORT")
      + (length === "LONG" ? " units" : "") + "\n";
  }
  return output;
}
