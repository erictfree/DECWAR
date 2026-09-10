import assert from "node:assert/strict";
import test from "node:test";
import { FEDERATION_SHIPS, EMPIRE_SHIPS } from "../src/model.ts";
import type { Ship, RomulanState } from "../src/model.ts";
import { lexicalSegment } from "../src/lexical.ts";
import { recognizeOrdinaryCommand } from "../src/command-recognition.ts";
import { resolveDestination } from "../src/destination.ts";

function world() {
  const ships: Pick<Ship, "name" | "position" | "lifecycle" | "deviceDamage">[] =
    [...FEDERATION_SHIPS, ...EMPIRE_SHIPS].map(name => ({ name, position: null,
      lifecycle: { phase: "AVAILABLE" },
      deviceDamage: { SHIELDS: 0, WARP_ENGINES: 0, IMPULSE_ENGINES: 0, LIFE_SUPPORT: 0,
        TORPEDO_TUBES: 0, PHASERS: 0, COMPUTER: 0, RADIO: 0, TRACTOR_BEAM: 0 } }));
  ships[0].position = { vertical: 20, horizontal: 20 };
  ships[0].lifecycle = { phase: "COMMISSIONED", captain: "E" };
  ships[17].position = { vertical: 60, horizontal: 61 };
  ships[17].lifecycle = { phase: "COMMISSIONED", captain: "W" };
  return { ships, romulan: { enabled: false } as RomulanState };
}
function tokens(text: string) {
  const segment = lexicalSegment(text);
  if (segment.status !== "TOKENS") throw new Error("Review case is outside this fixture");
  return segment.tokens;
}
const preferences = { coordinateInput: "ABSOLUTE" } as const;

test("all four single-destination commands connect written input to the same position", () => {
  const galaxy = world(), before = structuredClone(galaxy);
  for (const [prefix, command] of [["M", "MOVE"], ["I", "IMPULSE"], ["C", "CAPTURE"], ["BU", "BUILD"]]) {
    const input = tokens(`${prefix} R -19,55`);
    assert.deepEqual(recognizeOrdinaryCommand(input[0]), { kind: "COMMAND", command });
    assert.deepEqual(resolveDestination(galaxy, "EXCALIBUR", preferences, input.slice(1)),
      { kind: "POSITION", position: { vertical: 1, horizontal: 75 } });
  }
  assert.deepEqual(galaxy, before);
});

test("cardinality then token classes precede vertical and horizontal bounds", () => {
  const galaxy = world();
  for (const [input, output] of [["A 0 20.0", "Non-numeric coordinate.\n"],
    ["A 0 76", "X coordinate lies outside galaxy.\n"],
    ["A 20 76", "Y coordinate lies outside galaxy.\n"],
    ["A 0 20.0 22", "Wrong number of coordinates specified.\n"]])
    assert.deepEqual(resolveDestination(galaxy, "EXCALIBUR", preferences, tokens(input)), { kind: "REJECTED", output });
  assert.deepEqual(resolveDestination(galaxy, "EXCALIBUR", preferences, tokens(`${"9".repeat(100)} 20`)),
    { kind: "REJECTED", output: "X coordinate lies outside galaxy.\n" });
});

test("omission and empty response differ, and explicit modes do not persist", () => {
  const galaxy = world();
  assert.deepEqual(resolveDestination(galaxy, "EXCALIBUR", preferences, []), { kind: "INPUT_NEEDED" });
  assert.deepEqual(resolveDestination(galaxy, "EXCALIBUR", preferences, [], "RESPONSE"), { kind: "CANCELLED" });
  assert.deepEqual(resolveDestination(galaxy, "EXCALIBUR", preferences, tokens("R"), "RESPONSE"), { kind: "INPUT_NEEDED" });
  assert.deepEqual(resolveDestination(galaxy, "EXCALIBUR", preferences, tokens("1 1"), "RESPONSE"),
    { kind: "POSITION", position: { vertical: 1, horizontal: 1 } });
  assert.deepEqual(resolveDestination(galaxy, "EXCALIBUR", { coordinateInput: "RELATIVE" }, tokens("1 1")),
    { kind: "POSITION", position: { vertical: 21, horizontal: 21 } });
});

test("COMPUTED checks the computer before requesting input or resolving a name", () => {
  const galaxy = world();
  galaxy.ships[0].deviceDamage.COMPUTER = 300;
  for (const input of ["C", "C W", "C ZZZ", "C 1"])
    assert.deepEqual(resolveDestination(galaxy, "EXCALIBUR", preferences, tokens(input)),
      { kind: "REJECTED", output: "Computer inoperative.\n" });
  assert.equal(resolveDestination(galaxy, "EXCALIBUR", preferences, tokens("A 20 21")).kind, "POSITION");
  galaxy.ships[0].deviceDamage.COMPUTER = 299;
  assert.deepEqual(resolveDestination(galaxy, "EXCALIBUR", preferences, tokens("C")), { kind: "INPUT_NEEDED" });
});

test("computed targets use presence, not faction or distance, and return a position snapshot", () => {
  const galaxy = world();
  const result = resolveDestination(galaxy, "EXCALIBUR", preferences, tokens("C W"));
  assert.deepEqual(result, { kind: "POSITION", position: { vertical: 60, horizontal: 61 } });
  galaxy.ships[17].position!.vertical = 59;
  assert.deepEqual(result, { kind: "POSITION", position: { vertical: 60, horizontal: 61 } });
  for (const input of ["C F", "C R"])
    assert.deepEqual(resolveDestination(galaxy, "EXCALIBUR", preferences, tokens(input)),
      { kind: "REJECTED", output: "Player not in game.\n" });
  assert.deepEqual(resolveDestination(galaxy, "EXCALIBUR", preferences, tokens("C ZZZ")),
    { kind: "REJECTED", output: "Unrecognized ship name.\n" });
  galaxy.ships[17].lifecycle = { phase: "DESTROYED", captain: "W" };
  assert.equal(resolveDestination(galaxy, "EXCALIBUR", preferences, tokens("C W")).kind, "REJECTED");
});

test("malformed computed operands retain their explicit review boundary", () => {
  for (const input of ["C 1", "C 20.0", "C W E"])
    assert.deepEqual(resolveDestination(world(), "EXCALIBUR", preferences, tokens(input)),
      { kind: "REVIEW_REQUIRED", issue: "MALFORMED_COMPUTED_DESTINATION" });
});

test("enabled Romulan presence supplies a snapshot and absence supplies no destination", () => {
  const galaxy = world();
  galaxy.romulan = { enabled: true, vessel: { position: { vertical: 25, horizontal: 26 }, energy: 30 },
    elapsedTriggers: 0, statistics: { appearances: 1, activityCount: 1,
      score: { ENEMY_DAMAGE: 0, ENEMY_KILLS: 0, BASE_DAMAGE: 0, PLANET_CAPTURE: 0,
        BASE_CONSTRUCTION: 0, ROMULAN: 0, STAR_DESTRUCTION: 0, PLANET_DESTRUCTION: 0 } } };
  const result = resolveDestination(galaxy, "EXCALIBUR", preferences, tokens("C R"));
  assert.deepEqual(result, { kind: "POSITION", position: { vertical: 25, horizontal: 26 } });
  galaxy.romulan.vessel = null;
  assert.deepEqual(resolveDestination(galaxy, "EXCALIBUR", preferences, tokens("C R")),
    { kind: "REJECTED", output: "Player not in game.\n" });
  assert.deepEqual(result, { kind: "POSITION", position: { vertical: 25, horizontal: 26 } });
});
