import assert from "node:assert/strict";
import test from "node:test";
import type { NotificationFacts, PlayerPreferences, Ship } from "../src/model.ts";
import { notificationOutput } from "../src/notification-output.ts";

const preferences: PlayerPreferences = { outputLength: "SHORT", coordinateOutput: "ABSOLUTE",
  coordinateInput: "ABSOLUTE", scanLength: "SHORT", promptStyle: "NORMAL" };
const observer: Pick<Ship, "name" | "position" | "radio" | "deviceDamage"> = {
  name: "WOLF", position: { vertical: 20, horizontal: 21 },
  radio: { enabled: false, gaggedShips: new Set(["EXCALIBUR"]) },
  deviceDamage: { SHIELDS: 0, WARP_ENGINES: 0, IMPULSE_ENGINES: 0, LIFE_SUPPORT: 0,
    TORPEDO_TUBES: 0, PHASERS: 0, COMPUTER: 0, RADIO: 400, TRACTOR_BEAM: 0 },
};

test("typed notification facts render each non-hit category without live source objects", () => {
  const p = { vertical: 20, horizontal: 22 };
  const cases: [NotificationFacts, string][] = [
    [{ kind: "TRACTOR", ships: ["WOLF", "PANTHER"], active: false }, "Trac. Beam off\n"],
    [{ kind: "ENERGY_TRANSFER", sender: "PANTHER", recipient: "WOLF", delivered: 90 }, "P 90 > W \n"],
    [{ kind: "TORPEDO_OUTCOME", shooter: "WOLF", torpedo: 2, outcome: "MISS", position: p }, "T2 miss 20-22\n"],
    [{ kind: "ROMULAN_APPEARANCE", position: p }, "??  20-22\n"],
    [{ kind: "STAR_EVENT", outcome: "NOVA", position: p }, "* 20-22 N\n"],
  ];
  for (const [facts, expected] of cases) assert.equal(notificationOutput(facts, observer, preferences), expected);
});

test("typed base notice applies delivery filter but retains its long prefix", () => {
  const facts: NotificationFacts = { kind: "BASE_NOTICE", team: "EMPIRE", position: { vertical: 20, horizontal: 22 }, destroyed: true };
  assert.equal(notificationOutput(facts, observer, preferences), "");
  assert.equal(notificationOutput(facts, observer, { ...preferences, outputLength: "LONG" }), "\n");
  assert.equal(notificationOutput(facts, { ...observer, radio: { ...observer.radio, enabled: true },
    deviceDamage: { ...observer.deviceDamage, RADIO: 300 } }, preferences), ")( 20-22 D\n");
});

test("typed hit snapshot maps semantic device and shield facts without radio filtering", () => {
  const facts: NotificationFacts = { kind: "HIT", hit: {
    action: "PHASER", source: { kind: "SHIP", name: "EXCALIBUR", position: { vertical: 20, horizontal: 20 }, shields: { mode: "UP", strength: 75 } },
    target: { kind: "SHIP", name: "WOLF", position: { vertical: 20, horizontal: 21 }, shields: { mode: "DOWN", strength: 50 } },
    reportedDamage: 100, displaced: false, death: "NONE", critical: { device: "RADIO", damage: 25 }, baseEmergency: false,
  } };
  const before = structuredClone(facts);
  assert.equal(notificationOutput(facts, observer, preferences), "E 20-20 +75  100P  W 20-21 -50; RA  25\n");
  assert.equal(notificationOutput(facts, { ...observer, name: "PANTHER" }, preferences), "E 20-20 +75  100P  W 20-21 -50\n");
  assert.deepEqual(facts, before);
});
