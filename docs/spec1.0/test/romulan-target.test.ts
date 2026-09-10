import assert from "node:assert/strict";
import test from "node:test";
import { pursuitDistance, selectPursuitGroup } from "../src/romulan-target.ts";

test("pursuit distance differs from Chebyshev ranking", () => {
  const origin = { vertical: 20, horizontal: 20 };
  assert.equal(pursuitDistance(origin, { vertical: 24, horizontal: 20 }), 16);
  assert.equal(pursuitDistance(origin, { vertical: 23, horizontal: 23 }), 18);
});

test("four-group sequential ties yield 1:1:2:4 weights", () => {
  const counts = [0, 0, 0, 0];
  for (let mask = 0; mask < 8; mask++) {
    let draw = 0;
    const selected = selectPursuitGroup(counts.map((_, value) => ({ value, distanceSquared: 9 })),
      () => Boolean(mask & (1 << draw++)));
    counts[selected!]++;
    assert.equal(draw, 3);
  }
  assert.deepEqual(counts, [1, 1, 2, 4]);
});
