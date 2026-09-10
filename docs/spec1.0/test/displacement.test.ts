import assert from "node:assert/strict";
import test from "node:test";
import { flightStep, displacementCandidate, displacementOutcome } from "../src/displacement.ts";

const origin = { vertical: 20, horizontal: 20 };

test("flight step uses vertical tie and deflects only the minor component", () => {
  assert.deepEqual(flightStep(5, 5, 0.1), { vertical: 1, horizontal: 1.1 });
  assert.deepEqual(flightStep(2, -10, 0.05), { vertical: 0.25, horizontal: -1 });
  assert.throws(() => flightStep(0, 0, 0), RangeError);
});

test("displacement truncates the summed coordinates, not the step", () => {
  assert.deepEqual(displacementCandidate(origin, { vertical: 1, horizontal: 0.2 }),
    { vertical: 21, horizontal: 20 });
  assert.deepEqual(displacementCandidate(origin, { vertical: 1, horizontal: -0.2 }),
    { vertical: 21, horizontal: 19 });
});

test("off-galaxy and nonadjacent candidates fail without another attempt", () => {
  assert.equal(displacementCandidate({ vertical: 75, horizontal: 20 },
    { vertical: 1, horizontal: 0 }), null);
  assert.equal(displacementCandidate(origin, { vertical: 1, horizontal: -1.1 }), null);
  assert.equal(displacementCandidate(origin, { vertical: 0, horizontal: 0 }), null);
});

test("empty, occupied and black-hole candidates have distinct outcomes", () => {
  const step = { vertical: 1, horizontal: -0.2 };
  assert.deepEqual(displacementOutcome(origin, step, () => "EMPTY"),
    { kind: "MOVED", position: { vertical: 21, horizontal: 19 } });
  assert.deepEqual(displacementOutcome(origin, step, () => "OTHER"),
    { kind: "UNCHANGED", position: origin });
  assert.deepEqual(displacementOutcome(origin, step, () => "BLACK_HOLE"),
    { kind: "DESTROYED", position: { vertical: 21, horizontal: 19 } });
});
