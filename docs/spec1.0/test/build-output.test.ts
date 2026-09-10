import assert from "node:assert/strict";
import test from "node:test";
import type { PlayerPreferences } from "../src/model.ts";
import { buildOutput } from "../src/build-output.ts";

const preferences: PlayerPreferences = { coordinateInput: "ABSOLUTE", coordinateOutput: "ABSOLUTE",
  outputLength: "LONG", scanLength: "LONG", promptStyle: "NORMAL" };
const origin = { vertical: 20, horizontal: 20 };
test("BUILD stage and rejection reports have outcome-specific newlines", () => {
  const out = (kind: "NOT_ADJACENT" | "NO_PLANET" | "NOT_FRIENDLY" | "BASE_LIMIT") =>
    buildOutput({ kind }, "EXCALIBUR", "FEDERATION", origin, preferences);
  assert.equal(out("NOT_ADJACENT"), "Excalibur not adjacent to planet.\n");
  assert.equal(out("NO_PLANET"), "\nNo planet at those coordinates, Captain.\n");
  assert.equal(out("NOT_FRIENDLY"), "\nPlanet not yet captured.");
  assert.equal(out("BASE_LIMIT"), "\nAll Fed Bases still functional, captain.\n");
  assert.equal(buildOutput({ kind: "STAGE", stage: 1 }, "EXCALIBUR", "FEDERATION", origin, preferences), "1 build\n");
  assert.equal(buildOutput({ kind: "STAGE", stage: 4 }, "EXCALIBUR", "FEDERATION", origin, preferences), "4 builds\n");
});

test("BUILD conversion and compact base-limit reports use name and coordinate preferences", () => {
  const outcome = { kind: "CONVERTED" as const, position: { vertical: 20, horizontal: 21 } };
  assert.equal(buildOutput(outcome, "EXCALIBUR", "FEDERATION", origin, preferences),
    "\nExcalibur builds planet @20-21 into a Fed Base\n");
  assert.equal(buildOutput(outcome, "EXCALIBUR", "FEDERATION", origin,
    { ...preferences, outputLength: "SHORT", coordinateOutput: "RELATIVE" }),
    "\nE builds planet 0,+1 into a <>\n");
  assert.equal(buildOutput({ kind: "BASE_LIMIT" }, "WOLF", "EMPIRE", origin,
    { ...preferences, outputLength: "MEDIUM" }), "\nAll )(s still functional, captain.\n");
});
