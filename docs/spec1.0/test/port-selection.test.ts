import assert from "node:assert/strict";
import test from "node:test";
import { portSelection } from "../src/port-selection.ts";

test("PORTS resets implicit allegiance, including earlier ALL and TARGETS defaults", () => {
  assert.deepEqual(portSelection("LIST", "FEDERATION", ["PORTS", "ALL"]).sides,
    new Set(["FEDERATION", "EMPIRE", "NEUTRAL"]));
  assert.deepEqual(portSelection("LIST", "FEDERATION", ["ALL", "PORTS"]).sides,
    new Set(["FEDERATION", "NEUTRAL"]));
  assert.deepEqual(portSelection("TARGETS", "FEDERATION", ["PORTS"]),
    { kinds: ["BASE", "PLANET"], sides: new Set(["FEDERATION", "NEUTRAL"]), wholeGalaxy: false });
  assert.deepEqual(portSelection("TARGETS", "FEDERATION", ["ALL", "PORTS"]),
    portSelection("TARGETS", "FEDERATION", ["PORTS", "ALL"]));
});

test("NEUTRAL/CAPTURED before PORTS differ from the rejected reverse order", () => {
  assert.deepEqual(portSelection("SUMMARY", "FEDERATION", ["NEUTRAL", "PORTS"]),
    { kinds: ["PLANET"], sides: new Set(["NEUTRAL"]), wholeGalaxy: true });
  assert.deepEqual(portSelection("SUMMARY", "FEDERATION", ["CAPTURED", "PORTS"]),
    { kinds: ["BASE", "PLANET"], sides: new Set(["FEDERATION", "EMPIRE"]), wholeGalaxy: true });
  assert.throws(() => portSelection("SUMMARY", "FEDERATION", ["PORTS", "NEUTRAL"]));
  assert.throws(() => portSelection("SUMMARY", "FEDERATION", ["PORTS", "CAPTURED"]));
  assert.deepEqual(portSelection("LIST", "EMPIRE", ["FRIENDLY", "PORTS", "ALL"]).sides,
    new Set(["EMPIRE"]));
});
