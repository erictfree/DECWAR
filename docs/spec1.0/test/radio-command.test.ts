import assert from "node:assert/strict";
import test from "node:test";
import { radioCommand } from "../src/radio-command.ts";
import type { RadioState } from "../src/model.ts";

const initial = (): RadioState => ({ enabled: false, gaggedShips: new Set(["WOLF"]) });
test("RADIO direct enable/disable preserves gag membership and acknowledges repeats", () => {
  const before = initial();
  const on = radioCommand("EXCALIBUR", before, "SHORT", ["O"]);
  assert.equal(on.radio.enabled, true);
  assert.deepEqual(on.radio.gaggedShips, before.gaggedShips);
  assert.equal(on.output, "\nRadio turned on, Captain.\n");
  assert.equal(before.enabled, false);
  const off = radioCommand("EXCALIBUR", before, "LONG", ["OF"]);
  assert.deepEqual(off.radio, before);
  assert.equal(off.output, "\nRadio turned off, Captain.\n");
});

test("RADIO action retry and name retry have different newline rules", () => {
  const done = radioCommand("EXCALIBUR", initial(), "LONG", [],
    [["Z"], ["GAG"], ["3"], ["F"]]);
  assert.equal(done.output, "\nTurn radio ON or OFF, GAG or UNGAG individual ship?  \nTurn radio ON or OFF, GAG or UNGAG individual ship?  \nShip name:  Ship name:  Radio gagged against Farragut\n");
  assert.equal(done.waiting, null);
  assert.equal(done.repliesRead, 4);
  assert.deepEqual(done.radio.gaggedShips, new Set(["WOLF", "FARRAGUT"]));
  assert.equal(done.radio.enabled, false);
});

test("RADIO self, unknown name and name cancellation leave state unchanged", () => {
  const state = initial();
  assert.equal(radioCommand("EXCALIBUR", state, "LONG", ["GAG", "E"]).output, "\n");
  const unknown = radioCommand("EXCALIBUR", state, "SHORT", ["GAG", "ROMULAN"]);
  assert.equal(unknown.output, "\nUnknown ship name.\n");
  assert.deepEqual(unknown.radio, state);
  const cancel = radioCommand("EXCALIBUR", state, "LONG", ["UNGAG"], [[]]);
  assert.equal(cancel.output, "\nShip name:  ");
  assert.deepEqual(cancel.radio, state);
});

test("RADIO gag and ungag acknowledge unchanged membership without enabling reception", () => {
  const gag = radioCommand("EXCALIBUR", initial(), "MEDIUM", ["G", "W"]);
  assert.equal(gag.output, "\nRadio gagged against W\n");
  assert.equal(gag.radio.enabled, false);
  const ungag = radioCommand("EXCALIBUR", gag.radio, "LONG", ["U", "W"]);
  assert.equal(ungag.output, "\nRadio ungagged against Wolf\n");
  assert.equal(ungag.radio.gaggedShips.size, 0);
  assert.equal(radioCommand("EXCALIBUR", ungag.radio, "SHORT", ["U", "W"]).output,
    "\nRadio ungagged against W\n");
});
