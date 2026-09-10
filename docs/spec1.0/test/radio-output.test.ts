import assert from "node:assert/strict";
import test from "node:test";
import { playerRadioOutput } from "../src/radio-output.ts";
import type { ShipName } from "../src/model.ts";

const recipients = new Set<ShipName>(["WOLF", "FARRAGUT"]);
test("player radio header uses roster order and literal separators", () => {
  assert.equal(playerRadioOutput("EXCALIBUR", recipients, "hold / wait", "LONG"),
    "\nMessage from Excalibur to  F W\nhold / wait\n\n");
});
test("medium and short abbreviate only sender name", () => {
  for (const length of ["MEDIUM", "SHORT"] as const)
    assert.equal(playerRadioOutput("EXCALIBUR", recipients, " a ", length),
      "\nMessage from E to  F W\n a \n\n");
});
