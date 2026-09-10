import assert from "node:assert/strict";
import test from "node:test";
import { planetActivates, planetaryPower } from "../src/planet-defense.ts";

test("neutral activation is separate from owned-planet faction selection", () => {
  assert.equal(planetActivates("NEUTRAL", "FEDERATION", false), false);
  assert.equal(planetActivates("NEUTRAL", "FEDERATION", true), true);
  assert.equal(planetActivates("FEDERATION", "FEDERATION", true), false);
  assert.equal(planetActivates("EMPIRE", "FEDERATION", false), true);
});

test("Romulan target power is not divided by the player count", () => {
  assert.equal(planetaryPower(3, 2, false), 70);
  assert.equal(planetaryPower(3, 2, true), 140);
  assert.equal(planetaryPower(0, 3, false), 16);
  assert.equal(planetaryPower(0, 3, true), 50);
});
