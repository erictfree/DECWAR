import assert from "node:assert/strict";
import test from "node:test";
import { commandPrompt, acquisitionAlert } from "../src/command-prompt.ts";
import { setPreference } from "../src/preferences.ts";
import type { PlayerPreferences } from "../src/model.ts";

const ship = { deviceDamage: { SHIELDS: 0, WARP_ENGINES: 0, IMPULSE_ENGINES: 0,
  LIFE_SUPPORT: 299.9, TORPEDO_TUBES: 0, PHASERS: 0, COMPUTER: 0, RADIO: 0, TRACTOR_BEAM: 0 },
  lifeSupportReserve: 0, shields: { mode: "UP" as const, strength: 10.1 },
  hullDamage: 1999.9, energy: 1000.1 };

test("acquisition at energy 1000 assigns YELLOW even from RED", () => {
  for (const condition of ["GREEN", "YELLOW", "RED"] as const) {
    const current = { ...ship, energy: 1000, condition };
    const alert = acquisitionAlert(current);
    assert.deepEqual(alert, { condition: "YELLOW", output: "\u0007".repeat(4) });
    assert.equal(alert.output + commandPrompt(current, "INFORMATIVE"), "\u0007".repeat(4) + "E> ");
    assert.equal(alert.output + commandPrompt(current, "NORMAL"), "\u0007".repeat(4) + "Command: ");
    assert.equal(current.condition, condition);
  }
});

test("above 1000 acquisition retains condition, including a warning without E", () => {
  const yellow = { ...ship, condition: "YELLOW" as const };
  assert.deepEqual(acquisitionAlert(yellow), { condition: "YELLOW", output: "\u0007".repeat(4) });
  assert.equal(commandPrompt(yellow, "INFORMATIVE"), "> ");
  for (const condition of ["GREEN", "RED"] as const)
    assert.deepEqual(acquisitionAlert({ ...ship, condition }), { condition, output: "" });
});

test("fatal states cannot reach the ordinary acquisition alert phase", () => {
  assert.throws(() => acquisitionAlert({ ...ship, energy: 0, condition: "RED" }), /Fatal departure/);
  assert.throws(() => acquisitionAlert({ ...ship, hullDamage: 2500, condition: "YELLOW" }), /Fatal departure/);
});

test("informative prompt has fixed order for all indicator combinations", () => {
  for (let flags = 0; flags < 16; flags++) {
    const current = { ...ship, deviceDamage: { ...ship.deviceDamage, LIFE_SUPPORT: flags & 1 ? 300 : 299.9 },
      shields: { ...ship.shields, strength: flags & 2 ? 10 : 10.1 },
      hullDamage: flags & 4 ? 2000 : 1999.9, energy: flags & 8 ? 1000 : 1000.1 };
    assert.equal(commandPrompt(current, "INFORMATIVE"),
      (flags & 1 ? "0L" : "") + (flags & 2 ? "S" : "") + (flags & 4 ? "D" : "") + (flags & 8 ? "E" : "") + "> ");
    assert.equal(commandPrompt(current, "NORMAL"), "Command: ");
  }
});

test("SET PROMPT takes effect on the next rendered prompt", () => {
  const preferences: PlayerPreferences = { outputLength: "SHORT", scanLength: "LONG",
    coordinateInput: "ABSOLUTE", coordinateOutput: "RELATIVE", promptStyle: "NORMAL" };
  const updated = setPreference(preferences, "PROMPT", "I");
  assert.equal(commandPrompt(ship, updated.promptStyle), "> ");
  assert.equal(commandPrompt({ ...ship, shields: { mode: "DOWN", strength: 100 } }, updated.promptStyle), "S> ");
  assert.equal(commandPrompt({ ...ship, shields: { mode: "DOWN", strength: 0 } }, updated.promptStyle), "S> ");
  assert.equal(preferences.promptStyle, "NORMAL");
});
