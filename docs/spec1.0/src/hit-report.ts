import type { Position } from "./model.ts";
import { decimalField, positionField } from "./output.ts";

// Formatter inputs are recorded event facts, not a replacement Galaxy model.
export interface HitObject {
  kind: "SHIP" | "BASE" | "ROMULAN" | "PLANET" | "STAR";
  name: string; // Already selected from Section 10.1 for the output length.
  position: Position;
  strength: number; // Signed shield strength, or Romulan energy.
  construction?: number;
}
export interface HitReport {
  action: "PHASER" | "TORPEDO" | "DEFLECTED" | "NOVA" | "EXPLOSION" | "UNAFFECTED";
  source: HitObject;
  target?: HitObject;
  damage: number;
  displaced?: boolean;
  death?: "HIT" | "BLACK_HOLE";
  emergency?: boolean;
  critical?: { deviceName: string; damage: number }; // Name includes trailing space.
}

export function hitReport(event: HitReport, length: "SHORT" | "MEDIUM" | "LONG",
  observer: Position, mode: "ABSOLUTE" | "RELATIVE" | "BOTH", isTarget = false): string {
  const long = length === "LONG", short = length === "SHORT";
  const numeric = (n: number, signed = false) => decimalField(n, 0, short, signed);
  const hasStrength = (o: HitObject) => ["SHIP", "BASE", "ROMULAN"].includes(o.kind);
  const shipOrBase = (o: HitObject) => o.kind === "SHIP" || o.kind === "BASE";
  const name = (o: HitObject) => o.name + (o.kind === "PLANET" && o.construction
    ? long ? `(${o.construction})` : String(o.construction) : "");
  const source = event.source;
  let out = (long ? "\n" : "") + name(source) + " "
    + positionField(source.position, observer, mode, short);
  if (!short && shipOrBase(source)) out += ",";
  if (hasStrength(source)) out += " " + numeric(source.strength, true) + (short ? "" : "%");
  out += " ";
  if (event.action === "EXPLOSION") return out + (long ? "novas" : "N") + "\n";
  if (event.action === "UNAFFECTED")
    return out + (long ? " UNAFFECTED by Photon Torpedo!" : "U") + "\n";
  const target = event.target;
  if (!target) throw new Error("Hit target required");
  if (event.action === "DEFLECTED" && !short) {
    out += long ? "has torpedo deflected by " : "deflected T";
  } else {
    out += (long ? "makes" : "") + " ";
    if (hasStrength(target)) out += numeric(event.action === "DEFLECTED" ? 0 : event.damage)
      + (short ? "" : " unit ");
    out += event.action === "NOVA" ? (long ? "hit on " : "N")
      : event.action === "PHASER" ? (long ? "phaser hit on " : "P")
      : (long ? "torpedo hit on " : "T");
  }
  if (!long) out += "  ";
  else if (shipOrBase(target) && out.length - out.lastIndexOf("\n") - 1 > 40) out += "\n";
  out += name(target) + " " + (event.displaced ? (long ? "displaced to " : short ? ">" : "-->")
    : short ? "" : "@") + positionField(target.position, observer, mode, true);
  if (!event.death && hasStrength(target)) {
    out += (short ? "" : ",") + " " + numeric(target.strength, true) + (short ? "" : "%");
    if (target.kind === "SHIP" && isTarget && event.critical) {
      out += "; " + event.critical.deviceName + (long ? "damaged " : short ? " " : "dam ")
        + numeric(event.critical.damage) + (long ? " units" : "");
    }
  }
  if (long && target.kind === "BASE" && (event.emergency || event.death)) {
    out += "  " + (event.death ? "\n" : "")
      + "Critical hit on starbase, shields down!\n"
      + "Starbase attempts to re-establish shields using emergency power!\n"
      + (event.death ? "Base FAILS to re-establish shields........BOOM!! "
        : "Base shields RE-ESTABLISHED!!\n");
  }
  if (event.death) {
    out += " " + (long ? "\n" : "");
    if (event.death === "BLACK_HOLE") out += target.name
      + (long ? " displaced by blast into BLACK HOLE!\n" : " -> BH\n");
    out += target.name + " DESTROYED!!\n";
  }
  return out + "\n";
}
