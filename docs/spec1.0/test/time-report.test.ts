import assert from "node:assert/strict";
import test from "node:test";
import { historicalTimeReport } from "../src/time-report.ts";

test("7.23 complete historical TIME report preserves labels, field order and truncation", () => {
  const values = { gameElapsed: 3723.9, commission: { elapsed: 245.9, processor: 1.9 },
    sessionProcessor: 65.9, timeOfDay: 52200.9 };
  const before = structuredClone(values);
  assert.equal(historicalTimeReport(values),
    "\nGame's elapsed time:  01:02:03\nShip's elapsed time:  00:04:05"
    + "\nRun time in game:     00:00:01\nJob's total run time: 00:01:05"
    + "\nCurrent time of day:  14:30:00\n");
  assert.equal(historicalTimeReport({ ...values, commission: null }),
    "\nGame's elapsed time:  01:02:03\nJob's total run time: 00:01:05"
    + "\nCurrent time of day:  14:30:00\n");
  assert.deepEqual(values, before);
});

test("7.23 duration rendering does not wrap at midnight or choose undefined domains", () => {
  const values = { gameElapsed: 90061.999, commission: null, sessionProcessor: 0, timeOfDay: 0 };
  assert.equal(historicalTimeReport(values), "\nGame's elapsed time:  25:01:01"
    + "\nJob's total run time: 00:00:00\nCurrent time of day:  00:00:00\n");
  for (const gameElapsed of [-1, 360000, Infinity, NaN]) {
    assert.throws(() => historicalTimeReport({ ...values, gameElapsed }), /under review/);
  }
});
