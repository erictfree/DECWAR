import assert from "node:assert/strict";
import test from "node:test";
import { minorCandidates, sectorPath } from "../src/sector-path.ts";

const start = { vertical: 20, horizontal: 20 };
const aim = { vertical: 2, horizontal: 1 };
const noSample = (): number => { throw new Error("Unexpected random selection"); };

test("hundredths band has exact lower and upper boundaries", () => {
  assert.deepEqual(minorCandidates(20.40), [20]);
  assert.deepEqual(minorCandidates(20.41), [20, 21]);
  assert.deepEqual(minorCandidates(20.59), [20, 21]);
  assert.deepEqual(minorCandidates(20.60), [21]);
});

test("both candidates are checked before random selection", () => {
  const checked: string[] = [];
  const result = sectorPath(start, aim, 2, 0, p => {
    checked.push(`${p.vertical},${p.horizontal}`);
    return p.horizontal === 21;
  }, noSample);
  assert.deepEqual(checked, ["21,20", "21,21"]);
  assert.deepEqual(result, { last: start, obstruction: { vertical: 21, horizontal: 21 } });
  assert.deepEqual(sectorPath(start, aim, 2, 0, () => true, noSample),
    { last: start, obstruction: { vertical: 21, horizontal: 20 } });
});

test("random accepted sector does not alter subsequent continuous path", () => {
  for (const sample of [0, 0.5, 0.9]) {
    let draws = 0;
    assert.deepEqual(sectorPath(start, aim, 2, 0, () => false, () => { draws++; return sample; }),
      { last: { vertical: 22, horizontal: 21 }, obstruction: null });
    assert.equal(draws, 1);
    assert.deepEqual(sectorPath(start, aim, 2, 0, p => p.vertical === 22, () => sample),
      { last: { vertical: 21, horizontal: sample < 0.5 ? 20 : 21 },
        obstruction: { vertical: 22, horizontal: 21 } });
  }
});

test("boundary returns the last accepted position without an obstruction", () => {
  assert.deepEqual(sectorPath({ vertical: 74, horizontal: 20 },
    { vertical: 1, horizontal: 0 }, 3, 0, () => false, noSample),
    { last: { vertical: 75, horizontal: 20 }, obstruction: null });
});

test("horizontal dominance and negative travel preserve coordinate orientation", () => {
  assert.deepEqual(sectorPath(start, { vertical: 0, horizontal: -1 }, 3, 0,
    () => false, noSample), { last: { vertical: 20, horizontal: 17 }, obstruction: null });
});
