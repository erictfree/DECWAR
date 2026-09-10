import assert from "node:assert/strict";
import test from "node:test";
import { hitReport, type HitReport } from "../src/hit-report.ts";
import { shipDamage } from "../src/shield-combat.ts";

const observer = { vertical: 1, horizontal: 1 };

test("critical report retains the increment rather than accumulated or repaired device damage", () => {
  const hit = shipDamage(720, true, 0.5);
  let currentDeviceDamage = 80 + hit.deviceDamage;
  assert.equal(currentDeviceDamage, 440);
  const recorded: HitReport = {
    action: "PHASER", damage: hit.hullLoss,
    source: { kind: "SHIP", name: "E", position: { vertical: 20, horizontal: 20 }, strength: -75 },
    target: { kind: "SHIP", name: "W", position: { vertical: 20, horizontal: 21 }, strength: -50 },
    critical: { deviceName: "RA ", damage: hit.deviceDamage },
  };
  currentDeviceDamage = Math.max(0, currentDeviceDamage - 30);
  assert.equal(currentDeviceDamage, 410);
  assert.equal(hitReport(recorded, "SHORT", observer, "ABSOLUTE", true),
    "E 20-20 -75  360P  W 20-21 -50; RA  360\n");
  assert.equal(recorded.critical!.damage, 360);
});
const event: HitReport = {
  action: "PHASER", damage: 100,
  source: { kind: "SHIP", name: "E", position: { vertical: 20, horizontal: 20 }, strength: 75 },
  target: { kind: "SHIP", name: "W", position: { vertical: 20, horizontal: 21 }, strength: 50 },
};

test("delivery context changes presentation without changing recorded hit facts", () => {
  const recorded = structuredClone(event);
  assert.equal(hitReport(event, "SHORT", { vertical: 20, horizontal: 20 }, "ABSOLUTE"),
    "E 20-20 +75  100P  W 20-21 +50\n");
  assert.equal(hitReport(event, "MEDIUM", { vertical: 21, horizontal: 20 }, "RELATIVE"),
    "E -1,0, +75.0%  100.0 unit P  W @-1,+1, +50.0%\n");
  assert.deepEqual(event, recorded);
});

test("short hit and deflection match literal documented report", () => {
  assert.equal(hitReport(event, "SHORT", observer, "ABSOLUTE"),
    "E 20-20 +75  100P  W 20-21 +50\n");
  assert.equal(hitReport({ ...event, action: "DEFLECTED" }, "SHORT", observer, "ABSOLUTE"),
    "E 20-20 +75  0T  W 20-21 +50\n");
});

test("long explosion and unaffected star have different literal spacing", () => {
  const source = { kind: "STAR" as const, name: "Star", position: { vertical: 20, horizontal: 21 }, strength: 0 };
  assert.equal(hitReport({ ...event, source, action: "EXPLOSION" }, "LONG", observer, "ABSOLUTE"),
    "\nStar @20-21 novas\n");
  assert.equal(hitReport({ ...event, source, action: "UNAFFECTED" }, "LONG", observer, "ABSOLUTE"),
    "\nStar @20-21  UNAFFECTED by Photon Torpedo!\n");
});

test("critical detail is visible only to surviving target", () => {
  const critical = { deviceName: "SH ", damage: 25 };
  assert.equal(hitReport({ ...event, critical }, "SHORT", observer, "ABSOLUTE", true),
    "E 20-20 +75  100P  W 20-21 +50; SH  25\n");
  assert.equal(hitReport({ ...event, critical }, "SHORT", observer, "ABSOLUTE", false),
    "E 20-20 +75  100P  W 20-21 +50\n");
  assert.equal(hitReport({ ...event, critical, death: "HIT" }, "SHORT", observer, "ABSOLUTE", true),
    "E 20-20 +75  100P  W 20-21 W DESTROYED!!\n\n");
});

test("medium black-hole displacement emits both death lines", () => {
  assert.equal(hitReport({ ...event, displaced: true, death: "BLACK_HOLE" }, "MEDIUM", observer, "ABSOLUTE"),
    "E @20-20, +75.0%  100.0 unit P  W -->20-21 W -> BH\nW DESTROYED!!\n\n");
});

test("long hit breaks before ship target after more than forty characters", () => {
  assert.equal(hitReport({ ...event, source: { ...event.source, name: "Excalibur" },
    target: { ...event.target!, name: "Wolf" } }, "LONG", observer, "ABSOLUTE"),
    "\nExcalibur @20-20, +75.0% makes 100.0 unit phaser hit on \nWolf @20-21, +50.0%\n");
});

test("relative target retains the explicit at marker", () => {
  assert.equal(hitReport(event, "MEDIUM", { vertical: 20, horizontal: 20 }, "RELATIVE"),
    "E , +75.0%  100.0 unit P  W @0,+1, +50.0%\n");
});

test("long base emergency survival preserves the extra ending newline", () => {
  assert.equal(hitReport({ ...event, emergency: true,
    target: { ...event.target!, kind: "BASE", name: "Emp Base" } }, "LONG", observer, "ABSOLUTE"),
    "\nE @20-20, +75.0% makes 100.0 unit phaser hit on \n"
    + "Emp Base @20-21, +50.0%  Critical hit on starbase, shields down!\n"
    + "Starbase attempts to re-establish shields using emergency power!\n"
    + "Base shields RE-ESTABLISHED!!\n\n");
});

test("destroyed base emits emergency dialogue even without emergency flag", () => {
  assert.equal(hitReport({ ...event, death: "HIT",
    target: { ...event.target!, kind: "BASE", name: "Emp Base" } }, "LONG", observer, "ABSOLUTE"),
    "\nE @20-20, +75.0% makes 100.0 unit phaser hit on \n"
    + "Emp Base @20-21  \nCritical hit on starbase, shields down!\n"
    + "Starbase attempts to re-establish shields using emergency power!\n"
    + "Base FAILS to re-establish shields........BOOM!!  \nEmp Base DESTROYED!!\n\n");
});
