import assert from "node:assert/strict";
import test from "node:test";
import { novaBlast, novaDamage, novaStrength, novaPlanet } from "../src/nova-damage.ts";

test("nova blast factor is discontinuous above strength 80", () => {
  assert.equal(novaBlast(80), 20);
  assert.equal(novaBlast(80.1), 25);
  assert.equal(novaBlast(100), 25);
  assert.equal(novaBlast(100, false), 100);
});

test("nova reported damage and base strength loss are separate", () => {
  assert.equal(novaDamage(novaBlast(100), 1), 200.1);
  assert.equal(novaStrength(100, 100), 80);
  assert.equal(novaStrength(20, 100), 0);
});

test("planet construction zero survives a nova when reached from three", () => {
  assert.deepEqual(novaPlanet(2), { destroyed: true, construction: null, points: -100 });
  assert.deepEqual(novaPlanet(3), { destroyed: false, construction: 0, points: 0 });
  assert.deepEqual(novaPlanet(4), { destroyed: false, construction: 1, points: 0 });
});
