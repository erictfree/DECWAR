import assert from "node:assert/strict";
import test from "node:test";
import { energyNotice } from "../src/energy-notice.ts";

test("ENERGY notice keeps source spacing at all output lengths", () => {
  assert.equal(energyNotice("EXCALIBUR", "FARRAGUT", 90, "LONG"),
    "\nExcalibur  transfers 90.0 units of energy to the  Farragut \n");
  assert.equal(energyNotice("EXCALIBUR", "FARRAGUT", 90, "MEDIUM"), "E 90.0 > F \n");
  assert.equal(energyNotice("EXCALIBUR", "FARRAGUT", 0.9, "SHORT"), "E 0 > F \n");
  assert.equal(energyNotice("EXCALIBUR", "FARRAGUT", 0, "MEDIUM"), "E 0.0 > F \n");
});
