import assert from "node:assert/strict";
import test from "node:test";
import { absorb, phaserIncident, torpedoDeflected, criticalHit, shipDamage,
  baseDamage } from "../src/shield-combat.ts";

test("full shields absorb initial damage but lose strength", () => {
  const result = absorb(400, 100);
  assert.equal(result.initialDamage, 0);
  assert.ok(Math.abs(result.remainingStrength - 87.97) < 1e-10);
});

test("absorption uses old strength, not strength after the hit", () => {
  const result = absorb(400, 50);
  assert.equal(result.initialDamage, 200);
  assert.ok(Math.abs(result.remainingStrength - 43.97) < 1e-10);
});

test("phaser multiplier halves for raised shields before absorption", () => {
  assert.equal(phaserIncident(200, 1, 0, false, false), 1440);
  assert.equal(phaserIncident(200, 1, 0, true, false), 720);
  assert.equal(phaserIncident(200, 1, 0, true, true), 576);
});

test("torpedo deflection includes equality", () => {
  assert.equal(torpedoDeflected(100, 0.5, 0.4), true);
  assert.equal(torpedoDeflected(100, 0.5, 0.40001), false);
  assert.equal(torpedoDeflected(0, 0.9, 0), false);
});

test("critical threshold includes equality and splits device and hull damage", () => {
  assert.equal(criticalHit(200, 0.75), true);
  assert.equal(criticalHit(200, 0.74), false);
  assert.deepEqual(shipDamage(200, true, 0.5), { deviceDamage: 100, hullLoss: 100 });
  assert.deepEqual(shipDamage(200, false, 0.5), { deviceDamage: 0, hullLoss: 200 });
  assert.deepEqual(shipDamage(200, true, 0), { deviceDamage: 100, hullLoss: 50 });
});

test("base critical emergency bypasses ordinary reduction and damage points", () => {
  assert.deepEqual(baseDamage(40, 200, false, 0.5, false),
    { strength: 38, damagePoints: 200, destroyed: false });
  assert.deepEqual(baseDamage(40, 200, true, 0.5, false),
    { strength: 30, damagePoints: 0, destroyed: false });
  assert.deepEqual(baseDamage(40, 200, true, 0.5, true),
    { strength: 0, damagePoints: 1000, destroyed: true });
});

test("base destruction after ordinary damage retains that damage award", () => {
  assert.deepEqual(baseDamage(2, 200, false, 0, false),
    { strength: 0, damagePoints: 1200, destroyed: true });
  assert.deepEqual(baseDamage(5, 200, true, 0, false),
    { strength: 0, damagePoints: 1000, destroyed: true });
});
