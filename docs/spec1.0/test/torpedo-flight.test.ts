import assert from "node:assert/strict";
import test from "node:test";
import { torpedoExtent, torpedoDeflection, misfireTubeDamage } from "../src/torpedo-flight.ts";

test("torpedo extent boundaries truncate toward zero", () => {
  for (const [u, expected] of [[0, 7], [0.12499, 7], [0.125, 7], [0.12501, 8],
    [0.62499, 8], [0.625, 9], [0.87499, 9], [0.875, 10], [0.99999, 10]]) {
    assert.equal(torpedoExtent(u), expected);
  }
  assert.throws(() => torpedoExtent(1), RangeError);
});

test("equal-width sample bins give the stated extent distribution", () => {
  const counts = [0, 0, 0, 0];
  for (let i = 0; i < 800; i++) counts[torpedoExtent((i + 0.5) / 800) - 7]++;
  assert.deepEqual(counts, [100, 400, 200, 100]);
});

test("deflection terms are conditional and additive", () => {
  assert.equal(torpedoDeflection(0.5, null, null, null), 0);
  assert.ok(Math.abs(torpedoDeflection(0, 0, { strength: 100, sample: 0 }, 0) + 0.3) < 1e-12);
  assert.equal(torpedoDeflection(0.5, null, { strength: 0, sample: 0 }, null), 0);
});

test("misfire tube damage uses displayed tenths", () => {
  assert.equal(misfireTubeDamage(1), 50.1);
  assert.equal(misfireTubeDamage(3000), 350);
});
