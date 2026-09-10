import assert from "node:assert/strict";
import test from "node:test";
import { validateEnergy } from "../src/energy-validation.ts";
import type { Ship } from "../src/model.ts";

function ships(): Pick<Ship, "name" | "lifecycle" | "position" | "energy">[] {
  return [
    { name: "EXCALIBUR", lifecycle: { phase: "COMMISSIONED", captain: "A" }, position: { vertical: 20, horizontal: 20 }, energy: 1000 },
    { name: "FARRAGUT", lifecycle: { phase: "COMMISSIONED", captain: "B" }, position: { vertical: 21, horizontal: 21 }, energy: 5000 },
    { name: "WOLF", lifecycle: { phase: "AVAILABLE" }, position: null, energy: 0 },
  ];
}

test("ENERGY rejects every validation stage in order without mutating ships", () => {
  const s = ships(), before = structuredClone(s);
  const check = (name: string, amount: number, text: string) =>
    assert.deepEqual(validateEnergy(s, "EXCALIBUR", name, amount, "SHORT"),
      { accepted: false, output: "\n" + text + "\n" });
  check("ZZ", -1, "Unknown ship name.");
  check("E", -1, "Transfer energy to US!?!");
  check("W", -1, "Player not in game.");
  assert.deepEqual(s, before);
  s[2].lifecycle = { phase: "COMMISSIONED", captain: "C" };
  s[2].position = { vertical: 75, horizontal: 75 };
  check("W", -1, "Can not transfer energy to enemy ship.");
  s[1].position = { vertical: 22, horizontal: 20 };
  check("F", 1000, "Not adjacent to destination ship.");
  s[1].position = { vertical: 21, horizontal: 21 };
  check("F", 1000, "Insufficient ship energy.");
  check("F", 0, "Transfer aborted.");
  check("F", -1, "Transfer aborted.");
});

test("ENERGY validates against requested expenditure even when recipient is full", () => {
  const s = ships();
  assert.deepEqual(validateEnergy(s, "EXCALIBUR", "F", 999, "LONG"),
    { accepted: true, recipient: "FARRAGUT" });
  assert.deepEqual(validateEnergy(s, "EXCALIBUR", "F", 1000, "LONG"),
    { accepted: false, output: "\nCaptain, our ship doesn't possess that much energy!\n" });
  assert.deepEqual(validateEnergy(s, "EXCALIBUR", "F", -1, "LONG"),
    { accepted: false, output: "\nIllegal energy transfer.  Transfer aborted.\n" });
});
