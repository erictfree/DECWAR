import assert from "node:assert/strict";
import test from "node:test";
import { appearanceNotice } from "../src/appearance-notice.ts";

test("appearance notice uses recorded position and exact verbosity spacing", () => {
  const position = { vertical: 20, horizontal: 21 };
  const observer = { vertical: 20, horizontal: 20 };
  for (const [outputLength, expected] of [
    ["LONG", "\nRomulan detected @20-21\n"],
    ["MEDIUM", "??  @20-21\n"],
    ["SHORT", "??  20-21\n"],
  ] as const) {
    assert.equal(appearanceNotice(position, observer, { outputLength, coordinateOutput: "ABSOLUTE" }), expected);
  }
  for (const outputLength of ["MEDIUM", "SHORT"] as const) {
    assert.equal(appearanceNotice(position, observer, { outputLength, coordinateOutput: "RELATIVE" }), "??  0,+1\n");
  }
  assert.equal(appearanceNotice(position, observer, { outputLength: "LONG", coordinateOutput: "BOTH" }),
    "\nRomulan detected @20-21 0,+1\n");
  assert.deepEqual(position, { vertical: 20, horizontal: 21 });
});
