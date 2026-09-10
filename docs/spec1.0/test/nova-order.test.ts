import assert from "node:assert/strict";
import test from "node:test";
import { novaNeighbors, novaOrder } from "../src/nova-order.ts";

test("nova neighbors enumerate vertical then horizontal and clip corners", () => {
  assert.deepEqual(novaNeighbors({ vertical: 1, horizontal: 1 }), [
    { vertical: 1, horizontal: 2 }, { vertical: 2, horizontal: 1 },
    { vertical: 2, horizontal: 2 },
  ]);
  const neighbors = novaNeighbors({ vertical: 20, horizontal: 20 });
  assert.equal(neighbors.length, 8);
  assert.deepEqual(neighbors[0], { vertical: 19, horizontal: 19 });
  assert.deepEqual(neighbors.at(-1), { vertical: 21, horizontal: 21 });
});

test("new selections precede older pending explosions", () => {
  assert.deepEqual(novaOrder("initial", center =>
    center === "initial" ? ["A", "B"] : center === "B" ? ["C"] : []),
    ["initial", "B", "C", "A"]);
});

test("companion does not silently choose a propagation-limit policy", () => {
  assert.throws(() => novaOrder(0, () => Array.from({ length: 29 }, (_, i) => i + 1)),
    /C-019/);
});
