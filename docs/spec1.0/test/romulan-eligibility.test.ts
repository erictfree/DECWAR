import assert from "node:assert/strict";
import test from "node:test";
import { romulanEligibility } from "../src/romulan-eligibility.ts";

test("Romulan activity and appearance thresholds are distinct and inclusive", () => {
  assert.deepEqual(romulanEligibility(0, 4), { elapsedTriggers: 1, active: false, appearanceEligible: false });
  assert.deepEqual(romulanEligibility(1, 4), { elapsedTriggers: 2, active: true, appearanceEligible: false });
  assert.deepEqual(romulanEligibility(11, 4), { elapsedTriggers: 12, active: true, appearanceEligible: true });
  assert.deepEqual(romulanEligibility(12, 4), { elapsedTriggers: 13, active: true, appearanceEligible: true });
});
