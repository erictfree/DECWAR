import assert from "node:assert/strict";
import test from "node:test";
import { captureAward, constructionAward } from "../src/scoring.ts";

test("construction awards reflect stage and conversion bonus", () => {
  const awards = [1, 2, 3, 4, 5].map(constructionAward);
  assert.deepEqual(awards, [50, 100, 150, 200, 500]);
  assert.equal(awards.reduce((sum, award) => sum + award, 0), 1000);
});

test("an incomplete or nonexistent stage is not an award event", () => {
  for (const stage of [0, -1, 6, 2.5, NaN]) {
    assert.throws(() => constructionAward(stage), RangeError);
  }
});

test("capture awards displayed points, not an event count", () => {
  assert.equal(captureAward(), 100);
});
