import type { CombatObjectSnapshot, Device, NotificationFacts, PlayerPreferences, Ship } from "./model.ts";
import { appearanceNotice } from "./appearance-notice.ts";
import { baseNotice, torpedoNotice } from "./combat-notices.ts";
import { energyNotice } from "./energy-notice.ts";
import { hitReport, type HitObject } from "./hit-report.ts";
import { positionField } from "./output.ts";

const deviceNames: Record<Device, readonly [string, string, string]> = {
  SHIELDS: ["SH ", "Shields ", "Deflector Shields "],
  WARP_ENGINES: ["WA ", "Warp ", "Warp Engines "],
  IMPULSE_ENGINES: ["IM ", "Impulse ", "Impulse Engines "],
  LIFE_SUPPORT: ["LS ", "Life Sup ", "Life Support "],
  TORPEDO_TUBES: ["TO ", "Torps ", "Torpedo Tubes "],
  PHASERS: ["PH ", "Phasers ", "Phasers "],
  COMPUTER: ["CO ", "Computer ", "Computer "],
  RADIO: ["RA ", "Radio ", "Radio "],
  TRACTOR_BEAM: ["TR ", "Tractor ", "Tractor Beam "],
};

function reportObject(snapshot: CombatObjectSnapshot, long: boolean): HitObject {
  const common = { kind: snapshot.kind, position: snapshot.position };
  switch (snapshot.kind) {
    case "SHIP": return { ...common,
      name: long ? snapshot.name[0] + snapshot.name.slice(1).toLowerCase() : snapshot.name[0],
      strength: snapshot.shields.strength * (snapshot.shields.mode === "UP" ? 1 : -1) };
    case "BASE": return { ...common,
      name: snapshot.team === "FEDERATION" ? (long ? "Fed Base" : "<>") : (long ? "Emp Base" : ")("),
      strength: snapshot.strength };
    case "PLANET": return { ...common, strength: 0, construction: snapshot.construction,
      name: snapshot.allegiance === "NEUTRAL" ? (long ? "Neu planet" : " @")
        : snapshot.allegiance === "FEDERATION" ? (long ? "Fed planet" : "+@") : (long ? "Emp planet" : "-@") };
    case "ROMULAN": return { ...common, name: long ? "Romulan" : "??", strength: snapshot.energy };
    case "STAR": return { ...common, name: long ? "Star" : "*", strength: 0 };
  }
}

// Render one already-selected notification. This does not select, order,
// consume, or retain occurrences, and does not implement C-023 loss policy.
export function notificationOutput(facts: NotificationFacts,
  observer: Pick<Ship, "name" | "position" | "radio" | "deviceDamage">,
  preferences: PlayerPreferences): string {
  if (!observer.position) throw new Error("positioned recipient required");
  const length = preferences.outputLength, long = length === "LONG";
  const position = (p: { vertical: number; horizontal: number }) =>
    positionField(p, observer.position!, preferences.coordinateOutput, length === "SHORT");
  switch (facts.kind) {
    case "TRACTOR": return long
      ? "\n\n" + (facts.active ? "Tractor beam activated, Captain.\n" : "Tractor beam broken, Captain.\n")
      : facts.active ? "Trac. Beam on\n" : "Trac. Beam off\n";
    case "ENERGY_TRANSFER": return energyNotice(facts.sender, facts.recipient, facts.delivered, length);
    case "BASE_NOTICE": return baseNotice(facts.destroyed,
      facts.team === "FEDERATION" ? (long ? "Fed Base" : "<>") : (long ? "Emp Base" : ")("),
      position(facts.position), length, observer.radio.enabled, observer.deviceDamage.RADIO);
    case "TORPEDO_OUTCOME": return torpedoNotice(facts.outcome, facts.torpedo, position(facts.position), length);
    case "ROMULAN_APPEARANCE": return appearanceNotice(facts.position, observer.position, preferences);
    case "STAR_EVENT": return hitReport({
      action: facts.outcome === "NOVA" ? "EXPLOSION" : "UNAFFECTED", damage: 0,
      source: reportObject({ kind: "STAR", position: facts.position }, long),
    }, length, observer.position, preferences.coordinateOutput);
    case "HIT": {
      const hit = facts.hit;
      return hitReport({ action: hit.action, source: reportObject(hit.source, long),
        target: reportObject(hit.target, long), damage: hit.reportedDamage,
        displaced: hit.displaced, death: hit.death === "NONE" ? undefined : hit.death,
        emergency: hit.baseEmergency,
        critical: hit.critical ? { damage: hit.critical.damage,
          deviceName: deviceNames[hit.critical.device][long ? 2 : length === "MEDIUM" ? 1 : 0] } : undefined,
      }, length, observer.position, preferences.coordinateOutput,
      hit.target.kind === "SHIP" && hit.target.name === observer.name);
    }
  }
}
