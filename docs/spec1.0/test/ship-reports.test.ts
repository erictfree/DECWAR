import assert from "node:assert/strict";
import test from "node:test";
import { statusReport, statusFromTokens, damagesReport, damagesFromTokens } from "../src/ship-reports.ts";
import type { DeviceDamage } from "../src/model.ts";

const damage: DeviceDamage = { SHIELDS: 0, WARP_ENGINES: 0, IMPULSE_ENGINES: 0,
  LIFE_SUPPORT: 0, TORPEDO_TUBES: 12.5, PHASERS: 0, COMPUTER: 0, RADIO: 0, TRACTOR_BEAM: 0 };
const ship = { stardate: 12, condition: "GREEN" as const, docked: true,
  position: { vertical: 20, horizontal: 21 }, torpedoes: 5, energy: 1234.5,
  hullDamage: 2.5, shields: { mode: "DOWN" as const, strength: 50 },
  radio: { enabled: false, gaggedShips: new Set<never>() }, deviceDamage: damage };

test("STATUS token selection preserves order and repeats without adding stardate", () => {
  assert.equal(statusFromTokens(ship,"SHORT",["r","e","r"].map(text=>({kind:"WORD",text}))),
    "\nROff E1234 ROff \n");
  assert.equal(statusFromTokens(ship,"SHORT",[]),statusReport(ship,"SHORT"));
});

test("STATUS accepts all three grammatical torpedo spellings", () => {
  for (const text of ["TORPEDO", "TORPEDOS", "TORPEDOES"])
    assert.equal(statusFromTokens(ship,"SHORT",[{kind:"WORD",text}]),"\nT5 \n");
});

test("DAMAGES first non-word selects the default, unlike STATUS", () => {
  assert.equal(damagesFromTokens("EXCALIBUR",damage,"SHORT",[{kind:"OTHER"},{kind:"WORD",text:"TR"}]),
    "\nTO    12\n");
});

test("DAMAGES skips unknown words but stops at a later non-word", () => {
  assert.equal(damagesFromTokens("EXCALIBUR",damage,"SHORT",[
    {kind:"WORD",text:"ZZZ"},{kind:"WORD",text:"T"},{kind:"OTHER"},{kind:"WORD",text:"TR"}]),
    "\nTO    12\nTR     0\n");
  assert.equal(damagesFromTokens("EXCALIBUR",damage,"SHORT",[{kind:"WORD",text:"TORPEDOES"}]),"\n");
});

test("DAMAGES all-functional response overrides even malformed selectors", () => {
  assert.equal(damagesFromTokens("EXCALIBUR",{...damage,TORPEDO_TUBES:0},"LONG",
    [{kind:"OTHER"},{kind:"WORD",text:"ZZZ"}]),"\nAll devices functional.\n");
});

test("STATUS observed unknown-word recovery retains earlier fields and continues", () => {
  assert.equal(statusFromTokens(ship,"SHORT",["E","ZZZ","D"].map(text=>({kind:"WORD",text}))),
    "\nE1234 %Syntax error\nD2 \n");
  assert.equal(statusFromTokens(ship,"LONG",["ZZZ","RADIO"].map(text=>({kind:"WORD",text}))),
    "\n%Syntax error\nRadio\t\tOff\n");
});

test("STATUS non-word ends selection without becoming a default report", () => {
  const before=structuredClone(ship);
  assert.equal(statusFromTokens(ship,"SHORT",[{kind:"OTHER"},{kind:"WORD",text:"ENERGY"}]),"\n\n");
  assert.equal(statusFromTokens(ship,"LONG",[{kind:"OTHER"}]),"\n");
  assert.equal(statusFromTokens(ship,"SHORT",[{kind:"WORD",text:"E"},{kind:"OTHER"},{kind:"WORD",text:"D"}]),
    "\nE1234 \n");
  assert.deepEqual(ship,before);
});

test("STATUS full short report keeps absolute position and trailing space", () => {
  const before = structuredClone(ship);
  assert.equal(statusReport(ship, "SHORT"), "\nSD12 D+G 20-21 T5 E1234 D2 SH-50 ROff \n");
  assert.deepEqual(ship, before);
});

test("STATUS full medium report has fixed order, decimals and shield energy", () => {
  assert.equal(statusReport(ship, "MEDIUM"), "\nSDate    12\nCond   Docked+Green\nLoc    20-21\nTorps     5\nEner   1234.5\nDam       2.5\nShlds   -50.0% 1250.0 units\nRadio  Off\n");
});

test("STATUS selected long fields repeat and radio damage overrides switch", () => {
  assert.equal(statusReport({ ...ship, deviceDamage: { ...damage, RADIO: 300 } }, "LONG",
    ["RADIO", "LOCATION", "RADIO"]), "\nRadio\t\tdamaged\nLocation\t20-21\nRadio\t\tdamaged\n");
  assert.equal(statusReport({ ...ship, shields: { mode: "UP", strength: 0 } }, "SHORT",
    ["SHIELDS"]), "\nSH-0 \n");
});

test("DAMAGES full long report has heading and only positive devices", () => {
  assert.equal(damagesReport("EXCALIBUR", damage, "LONG"),
    "\nDamage Report for Excalibur\n\nDevice             Damage\n\nTorpedo Tubes       12.5 units\n");
});

test("DAMAGES selectors include zero, duplicate matches and silently omit unknown", () => {
  assert.equal(damagesReport("EXCALIBUR", damage, "SHORT", ["T", "TR", "ZZ"]),
    "\nTO    12\nTR     0\nTR     0\n");
  assert.equal(damagesReport("EXCALIBUR", { ...damage, TORPEDO_TUBES: 0 }, "LONG", ["T"]),
    "\nAll devices functional.\n");
});
