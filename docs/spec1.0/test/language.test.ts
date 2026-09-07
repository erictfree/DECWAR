import assert from "node:assert/strict";
import test from "node:test";

import type {
  AutonomousTrigger,
  Invocation,
  PlayerInput,
} from "../src/language.ts";
import { isPosition, sectorDistance } from "../src/geometry.ts";
import {
  EMPIRE_SHIPS,
  FEDERATION_SHIPS,
  GALAXY_SIZE,
  teamOf,
} from "../src/model.ts";

test("player input and autonomous behavior are distinct invocations", () => {
  const command: PlayerInput = {
    kind: "PLAYER_INPUT",
    captain: "captain",
    text: "STATUS",
  };
  const autonomous: AutonomousTrigger = {
    kind: "AUTONOMOUS_TRIGGER",
    process: "ROMULAN_ACTIVITY",
  };

  const invocations: Invocation[] = [command, autonomous];
  assert.deepEqual(
    invocations.map((invocation) => invocation.kind),
    ["PLAYER_INPUT", "AUTONOMOUS_TRIGGER"],
  );
});

test("the fixed fleet has nine ships per faction", () => {
  assert.equal(FEDERATION_SHIPS.length, 9);
  assert.equal(EMPIRE_SHIPS.length, 9);
  assert.equal(new Set([...FEDERATION_SHIPS, ...EMPIRE_SHIPS]).size, 18);
  assert.equal(teamOf("EXCALIBUR"), "FEDERATION");
  assert.equal(teamOf("WOLF"), "EMPIRE");
});

test("sector positions occupy the 75 by 75 galaxy", () => {
  assert.equal(GALAXY_SIZE, 75);
  assert.equal(isPosition({ vertical: 1, horizontal: 75 }), true);
  assert.equal(isPosition({ vertical: 0, horizontal: 75 }), false);
  assert.equal(isPosition({ vertical: 1.5, horizontal: 20 }), false);
});

test("sector distance treats diagonal and orthogonal steps equally", () => {
  assert.equal(
    sectorDistance(
      { vertical: 10, horizontal: 10 },
      { vertical: 13, horizontal: 12 },
    ),
    3,
  );
});
