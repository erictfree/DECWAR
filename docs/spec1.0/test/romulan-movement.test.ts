import assert from "node:assert/strict";
import test from "node:test";
import { pursuitPath, pursuitFallback } from "../src/romulan-movement.ts";

test("Romulan shortens aim components but not extent", () => {
  assert.deepEqual(pursuitPath(3, 1), { aim: { vertical: 2, horizontal: 0 }, extent: 3 });
  assert.deepEqual(pursuitPath(-5, -2), { aim: { vertical: -4, horizontal: -1 }, extent: 4 });
  assert.equal(pursuitPath(1, 1), null);
});

test("obstruction fallback alternates decreasing vertical and horizontal", () => {
  const visited: string[] = [];
  assert.deepEqual(pursuitFallback({ vertical: 22, horizontal: 20 }, 3, p => {
    visited.push(`${p.vertical},${p.horizontal}`);
    return visited.length < 4;
  }), { vertical: 22, horizontal: 18 });
  assert.deepEqual(visited, ["21,20", "22,19", "20,20", "22,18"]);
  assert.equal(pursuitFallback({ vertical: 1, horizontal: 1 }, 4, () => false), null);
});
