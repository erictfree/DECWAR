import assert from "node:assert/strict";
import test from "node:test";
import type { PendingNotification, PlayerPreferences, Ship, ShipName } from "../src/model.ts";
import { consumeNotification, discardNotificationRecipient } from "../src/notification-consumption.ts";

const preferences: PlayerPreferences = { outputLength: "LONG", coordinateOutput: "ABSOLUTE",
  coordinateInput: "ABSOLUTE", scanLength: "SHORT", promptStyle: "NORMAL" };
const observer: Pick<Ship, "name" | "position" | "radio" | "deviceDamage"> = {
  name: "EXCALIBUR", position: { vertical: 20, horizontal: 20 },
  radio: { enabled: false, gaggedShips: new Set() },
  deviceDamage: { SHIELDS: 0, WARP_ENGINES: 0, IMPULSE_ENGINES: 0, LIFE_SUPPORT: 0,
    TORPEDO_TUBES: 0, PHASERS: 0, COMPUTER: 0, RADIO: 0, TRACTOR_BEAM: 0 },
};

test("one delivery preserves original audience and the other pending copy", () => {
  const names = new Set<ShipName>(["EXCALIBUR", "FARRAGUT"]);
  const notice: PendingNotification = { facts: { kind: "TRACTOR", ships: ["EXCALIBUR", "FARRAGUT"], active: true },
    recipients: names, pendingRecipients: new Set(names) };
  const before = structuredClone(notice);
  const result = consumeNotification(notice, observer, preferences);
  assert.equal(result.output, "\n\nTractor beam activated, Captain.\n");
  assert.deepEqual(result.remaining!.recipients, names);
  assert.deepEqual(result.remaining!.pendingRecipients, new Set(["FARRAGUT"]));
  assert.equal(discardNotificationRecipient(result.remaining!, "FARRAGUT"), null);
  assert.deepEqual(notice, before);
});

test("filtered base notice is consumed rather than retained for radio repair", () => {
  const notice: PendingNotification = { facts: { kind: "BASE_NOTICE", team: "FEDERATION", position: { vertical: 20, horizontal: 21 }, destroyed: false },
    recipients: new Set(["EXCALIBUR"]), pendingRecipients: new Set(["EXCALIBUR"]) };
  assert.deepEqual(consumeNotification(notice, observer, preferences), { output: "\n", remaining: null });
  assert.equal(discardNotificationRecipient(notice, "EXCALIBUR"), null);
});

test("a recipient without a pending copy cannot consume an occurrence", () => {
  const notice: PendingNotification = { facts: { kind: "ROMULAN_APPEARANCE", position: { vertical: 20, horizontal: 21 } },
    recipients: new Set(["EXCALIBUR", "FARRAGUT"]), pendingRecipients: new Set(["FARRAGUT"]) };
  assert.throws(() => consumeNotification(notice, observer, preferences), /pending copy/);
});
