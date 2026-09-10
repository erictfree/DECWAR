import assert from "node:assert/strict";
import test from "node:test";
import { romulanPhaserHit, romulanTorpedoHit } from "../src/romulan-damage.ts";

test("Romulan phaser damage and energy loss use distinct quantities", () => {
  assert.deepEqual(romulanPhaserHit(200, 1, 1), { damage: 202, energyLoss: 20.2 });
  assert.deepEqual(romulanPhaserHit(200, 10, 1), { damage: 20.2, energyLoss: 2 });
});

test("small torpedo hits can score damage without reducing Romulan energy", () => {
  assert.deepEqual(romulanTorpedoHit(9), { damage: 0.9, energyLoss: 0 });
  assert.deepEqual(romulanTorpedoHit(10), { damage: 1, energyLoss: 0.1 });
});

test("Romulan torpedo cap has exactly 2001 of the 4000 equiprobable rolls", () => {
  let capped = 0;
  for (let roll = 1; roll <= 4000; roll++) {
    const hit = romulanTorpedoHit(roll);
    if (hit.damage === 200) capped++;
    assert.equal(hit.energyLoss, Math.floor(Math.min(roll, 2000) / 10) / 10);
  }
  assert.equal(capped, 2001);
});
