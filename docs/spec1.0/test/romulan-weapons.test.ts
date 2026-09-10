import assert from "node:assert/strict";
import test from "node:test";
import { romulanWeapon, romulanPlanetHit } from "../src/romulan-weapons.ts";

test("Romulan readiness uses strict comparisons, including equality exception", () => {
  const noChoice = () => { throw new Error("unexpected random choice"); };
  assert.equal(romulanWeapon(10, 11, 11, noChoice), "WAIT");
  assert.equal(romulanWeapon(10, 11, 9, noChoice), "PHASER");
  assert.equal(romulanWeapon(10, 9, 11, noChoice), "TORPEDO");
  assert.equal(romulanWeapon(10, 10, 10, noChoice), "TORPEDO");
  assert.equal(romulanWeapon(10, 11, 10, noChoice), "TORPEDO");
  assert.equal(romulanWeapon(10, 9, 9, () => true), "TORPEDO");
  assert.equal(romulanWeapon(10, 9, 9, () => false), "PHASER");
});

test("Romulan planet reduction has 26 outcomes and destruction requires below zero", () => {
  let reductions = 0;
  for (let roll = 1; roll <= 100; roll++) {
    if (romulanPlanetHit(4, roll).construction === 3) reductions++;
  }
  assert.equal(reductions, 26);
  assert.deepEqual(romulanPlanetHit(0, 74), { construction: 0, destroyed: false, points: 0 });
  assert.deepEqual(romulanPlanetHit(0, 75), { construction: null, destroyed: true, points: -100 });
  assert.deepEqual(romulanPlanetHit(1, 75), { construction: 0, destroyed: false, points: 0 });
});
