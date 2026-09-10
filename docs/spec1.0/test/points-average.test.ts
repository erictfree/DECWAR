import assert from "node:assert/strict";
import test from "node:test";
import { pointsAverage } from "../src/scoring.ts";
import { decimalField } from "../src/output.ts";

test("POINTS averages truncate toward zero to tenths", () => {
  assert.equal(pointsAverage(100, 3), 33.3);
  assert.equal(pointsAverage(-100, 3), -33.3);
  assert.equal(pointsAverage(0.1, 2), 0);
  assert.equal(pointsAverage(-0.1, 2), 0);
});

test("short output drops the averaged fraction without rounding", () => {
  assert.equal(decimalField(pointsAverage(-100, 3), 0, true), "-33");
  assert.equal(decimalField(pointsAverage(100, 3), 0, false), "33.3");
});

test("unresolved denominator and score precision do not silently become zero", () => {
  assert.throws(() => pointsAverage(0, 0), /C-013/);
  assert.throws(() => pointsAverage(1.01, 2), /precision/);
});
