import assert from "node:assert/strict";
import test from "node:test";
import { phaserOverheats, phaserOverheatDamage } from "../src/phaser-overheat.ts";

test("overheating uses a strict threshold and the documented probabilities", () => {
  for (const [power, count] of [[189, 0], [200, 6], [500, 63]]) {
    let actual = 0;
    for (let roll = 1; roll <= 100; roll++) if (phaserOverheats(power, roll)) actual++;
    assert.equal(actual, count);
  }
  assert.equal(phaserOverheats(210, 90), false);
  assert.equal(phaserOverheats(210, 91), true);
});

test("overheat damage is an independent increment", () => {
  assert.equal(phaserOverheatDamage(200, 100), 225);
  assert.equal(phaserOverheatDamage(500, 100), 450);
});
