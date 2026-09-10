import assert from "node:assert/strict";
import test from "node:test";
import { automaticRepair, commitScore, lifeSupportCheck, worldActivityTrigger } from "../src/completion.ts";
import type { DeviceDamage, Score } from "../src/model.ts";
import { romulanEligibility } from "../src/romulan-eligibility.ts";

test("three player completions trigger one shared world cycle, not three", () => {
  let progress = 0;
  const due: boolean[] = [];
  for (let completion = 0; completion < 6; completion++) {
    const result = worldActivityTrigger(progress, 3);
    progress = result.progress;
    due.push(result.due);
  }
  assert.deepEqual(due, [false, false, true, false, false, true]);
  assert.equal(progress, 0);
});

test("world trigger uses current population and discards excess progress", () => {
  assert.deepEqual(worldActivityTrigger(2, 4), { progress: 3, due: false });
  assert.deepEqual(worldActivityTrigger(2, 2), { progress: 0, due: true });
  assert.deepEqual(worldActivityTrigger(0, 1), { progress: 0, due: true });
  assert.throws(() => worldActivityTrigger(0, 0), RangeError);
});

test("skipped world cycles do not advance Romulan elapsed triggers", () => {
  let progress = 0, triggers = 0;
  const activityAt: number[] = [];
  for (let turn = 1; turn <= 6; turn++) {
    const cycle = worldActivityTrigger(progress, 3);
    progress = cycle.progress;
    if (!cycle.due) continue;
    const romulan = romulanEligibility(triggers, 3);
    triggers = romulan.elapsedTriggers;
    if (romulan.active) activityAt.push(turn);
  }
  assert.equal(triggers, 2);
  assert.deepEqual(activityAt, [6]);
});

test("automatic repair applies separately to each device without mutating input", () => {
  const damage: DeviceDamage = { SHIELDS: 50, WARP_ENGINES: 10,
    IMPULSE_ENGINES: 0, LIFE_SUPPORT: 320, TORPEDO_TUBES: 30,
    PHASERS: 31, COMPUTER: 0, RADIO: 0, TRACTOR_BEAM: 0 };
  const repaired = automaticRepair(damage);
  assert.equal(repaired.SHIELDS, 20);
  assert.equal(repaired.WARP_ENGINES, 0);
  assert.equal(repaired.LIFE_SUPPORT, 290);
  assert.equal(repaired.TORPEDO_TUBES, 0);
  assert.equal(damage.LIFE_SUPPORT, 320);
});

test("score commitment transfers positive and negative awards exactly once", () => {
  const zero = (): Score => ({ ENEMY_DAMAGE: 0, ENEMY_KILLS: 0, BASE_DAMAGE: 0,
    PLANET_CAPTURE: 0, BASE_CONSTRUCTION: 0, ROMULAN: 0,
    STAR_DESTRUCTION: 0, PLANET_DESTRUCTION: 0 });
  const ship = zero(), faction = zero(), pending = zero();
  faction.BASE_CONSTRUCTION = 200;
  pending.BASE_CONSTRUCTION = 150;
  pending.STAR_DESTRUCTION = -50;
  commitScore(ship, faction, pending);
  commitScore(ship, faction, pending);
  assert.equal(ship.BASE_CONSTRUCTION, 150);
  assert.equal(faction.BASE_CONSTRUCTION, 350);
  assert.equal(ship.STAR_DESTRUCTION, -50);
  assert.deepEqual(pending, zero());
});

test("critical life support crosses zero before becoming fatal", () => {
  assert.deepEqual(lifeSupportCheck(300, false, 1, 40), { reserve: 0, hullDamage: 40 });
  assert.deepEqual(lifeSupportCheck(300, false, 0, 40), { reserve: -1, hullDamage: 2500 });
});

test("subcritical damage does not decrement reserve", () => {
  assert.deepEqual(lifeSupportCheck(299, false, 0, 40), { reserve: 0, hullDamage: 40 });
});

test("docking suppresses decrement but not the negative-reserve check", () => {
  assert.deepEqual(lifeSupportCheck(300, true, 0, 40), { reserve: 0, hullDamage: 40 });
  assert.deepEqual(lifeSupportCheck(300, true, -1, 40), { reserve: -1, hullDamage: 2500 });
});
