import assert from "node:assert/strict";
import test from "node:test";
import { FEDERATION_SHIPS, EMPIRE_SHIPS } from "../src/model.ts";
import type { PlayerPreferences, Ship, Score } from "../src/model.ts";
import { tractor, tractorDialogue } from "../src/tractor.ts";
import { lexicalSegment } from "../src/lexical.ts";
import { recognizeOrdinaryCommand } from "../src/command-recognition.ts";
import { shieldMode } from "../src/shield-mode.ts";
import { consumeNotification, discardNotificationRecipient } from "../src/notification-consumption.ts";

function roster(): Ship[] {
  const score: Score = { ENEMY_DAMAGE: 0, ENEMY_KILLS: 0, BASE_DAMAGE: 0,
    PLANET_CAPTURE: 0, BASE_CONSTRUCTION: 0, ROMULAN: 0, STAR_DESTRUCTION: 0, PLANET_DESTRUCTION: 0 };
  return [...FEDERATION_SHIPS, ...EMPIRE_SHIPS].map((name, i) => ({ name,
    lifecycle: { phase: "COMMISSIONED", captain: "Player" },
    position: { vertical: 20 + i, horizontal: 20 + i }, energy: 2000,
    hullDamage: 100, deviceDamage: { SHIELDS: 0, WARP_ENGINES: 0, IMPULSE_ENGINES: 0,
      LIFE_SUPPORT: 0, TORPEDO_TUBES: 0, PHASERS: 0, COMPUTER: 0, RADIO: 0, TRACTOR_BEAM: 0 },
    shields: { mode: "DOWN", strength: 80 }, torpedoes: 5, lifeSupportReserve: 3,
    condition: "YELLOW", docked: true, tractorLink: null,
    radio: { enabled: false, gaggedShips: new Set() }, stardate: 10,
    score: { ...score }, pendingScore: { ...score } }));
}

test("written TRACTOR and a prompted word reach link creation without duplicate initial newlines", () => {
  const initial = lexicalSegment("tr");
  const reply = lexicalSegment("f");
  assert.equal(initial.status, "TOKENS"); assert.equal(reply.status, "TOKENS");
  if (initial.status !== "TOKENS" || reply.status !== "TOKENS") return;
  assert.deepEqual(recognizeOrdinaryCommand(initial.tokens[0]), { kind: "COMMAND", command: "TRACTOR" });
  const result = tractorDialogue(roster(), "EXCALIBUR", initial.tokens.slice(1), [reply.tokens], "SHORT");
  assert.equal(result.output, "\nShip to apply tractor beam to:  ");
  assert.equal(result.responsesUsed, 1);
  assert.equal(result.ships[0].tractorLink, "FARRAGUT");
  assert.ok(result.notification);
});

test("TRACTOR numeric replacement can cancel without invoking bare-linked release", () => {
  const linked = tractor(roster(), "EXCALIBUR", "F", "SHORT").ships;
  const input = lexicalSegment("1");
  assert.equal(input.status, "TOKENS");
  if (input.status !== "TOKENS") return;
  const result = tractorDialogue(linked, "EXCALIBUR", input.tokens, [[]], "SHORT");
  assert.equal(result.output, "\nShip to apply tractor beam to:  ");
  assert.deepEqual(result.ships, linked);
  assert.equal(result.notification, null);
  assert.equal(result.prompt, false);
  const waiting = tractorDialogue(linked, "EXCALIBUR", input.tokens, [], "SHORT");
  assert.equal(waiting.prompt, true);
});

test("TRACTOR unknown prompted word terminates while non-word repeats", () => {
  const result = tractorDialogue(roster(), "EXCALIBUR", [], [
    [{ kind: "INTEGER", text: "1" }], [{ kind: "WORD", text: "ZZZ" }],
  ], "SHORT");
  assert.equal(result.output, "\nShip to apply tractor beam to:  Ship to apply tractor beam to:  Unknown ship name.\n");
  assert.equal(result.responsesUsed, 2);
  assert.equal(result.notification, null);
  assert.throws(() => tractorDialogue(roster(), "EXCALIBUR", [
    { kind: "WORD", text: "F" }, { kind: "WORD", text: "OFF" },
  ], [], "SHORT"), /C-010/);
});

test("TRACTOR links both ships without changing resources, timing or radio", () => {
  const prior = roster(), before = structuredClone(prior);
  const result = tractor(prior, "EXCALIBUR", "F", "SHORT");
  const expected = structuredClone(before);
  expected[0].tractorLink = "FARRAGUT"; expected[1].tractorLink = "EXCALIBUR";
  assert.deepEqual(result.ships, expected);
  assert.deepEqual(prior, before);
  assert.equal(result.output, "\n");
  assert.deepEqual(result.notices, [{ recipient: "EXCALIBUR", active: true },
    { recipient: "FARRAGUT", active: true }]);
});

test("TRACTOR produces a typed occurrence whose remaining copy is independent of current links", () => {
  const preferences: PlayerPreferences = { outputLength: "SHORT", coordinateOutput: "ABSOLUTE",
    coordinateInput: "ABSOLUTE", scanLength: "SHORT", promptStyle: "NORMAL" };
  const result = tractor(roster(), "EXCALIBUR", "F", "SHORT");
  assert.ok(result.notification);
  const first = consumeNotification(result.notification, result.ships[0], preferences);
  assert.equal(first.output, "Trac. Beam on\n");
  assert.deepEqual(first.remaining!.pendingRecipients, new Set(["FARRAGUT"]));
  const release = tractor(result.ships, "EXCALIBUR", "OFF", "SHORT");
  assert.equal(release.ships[1].tractorLink, null);
  assert.equal(release.notification!.facts.kind, "TRACTOR");
  const second = consumeNotification(first.remaining!, release.ships[1], { ...preferences, outputLength: "LONG" });
  assert.equal(second.output, "\n\nTractor beam activated, Captain.\n");
  assert.equal(second.remaining, null);
  // Alternatively, departure discards this old copy without rendering it.
  assert.equal(discardNotificationRecipient(first.remaining!, "FARRAGUT"), null);
  // No claim about ordering the distinct activation and release occurrences.
});

test("TRACTOR rejection and prompting produce no pending occurrence", () => {
  assert.equal(tractor(roster(), "EXCALIBUR", "W", "SHORT").notification, null);
  assert.equal(tractor(roster(), "EXCALIBUR", null, "SHORT").notification, null);
  assert.equal(tractor(roster(), "EXCALIBUR", "OFF", "SHORT").notification, null);
});

test("either endpoint releases despite raised shields, distance and device damage", () => {
  const linked = tractor(roster(), "EXCALIBUR", "F", "LONG").ships;
  linked[1].position = { vertical: 50, horizontal: 50 };
  linked[1].shields.mode = "UP";
  linked[1].deviceDamage.TRACTOR_BEAM = 500;
  for (const operand of [null, "O"]) {
    const result = tractor(linked, "FARRAGUT", operand, "LONG");
    const expected = structuredClone(linked);
    expected[0].tractorLink = expected[1].tractorLink = null;
    assert.deepEqual(result.ships, expected);
    assert.equal(result.notices.length, 2);
    assert.ok(result.notices.every(n => !n.active));
  }
  assert.equal(tractor(linked, "FARRAGUT", "ZZ", "LONG").output,
    "\nTractor beam already active, Captain.\n");
});

test("TRACTOR validation checks faction before presence and adjacency before shields", () => {
  const ships = roster();
  ships[9].lifecycle = { phase: "AVAILABLE" }; ships[9].position = null;
  assert.equal(tractor(ships, "EXCALIBUR", "B", "SHORT").output,
    "\nCan not apply tractor beam to enemy ship.\n");
  ships[0].shields.mode = "UP";
  assert.equal(tractor(ships, "EXCALIBUR", "I", "SHORT").output,
    "\nNot adjacent to destination ship.\n");
  assert.equal(tractor(ships, "EXCALIBUR", "F", "SHORT").output,
    "\nCan not apply tractor beam through shields, Captain.\n");
  ships[0].shields.mode = "DOWN"; ships[1].shields.mode = "UP";
  assert.equal(tractor(ships, "EXCALIBUR", "F", "LONG").output,
    "\nFarragut has his shields up.  Unable to apply tractor beam.\n");
});

test("bare unlinked TRACTOR prompts; OFF without a link diagnoses without mutation", () => {
  const ships = roster();
  const prompt = tractor(ships, "EXCALIBUR", null, "SHORT");
  assert.equal(prompt.output, "\nShip to apply tractor beam to:  ");
  assert.equal(prompt.prompt, true);
  assert.deepEqual(prompt.ships, ships);
  const off = tractor(ships, "EXCALIBUR", "OFF", "SHORT");
  assert.equal(off.output, "\nTractor beam not in operation at this time, Captain.\n");
  assert.deepEqual(off.ships, ships);
  assert.deepEqual(off.notices, []);
});

test("SHIELDS UP charges at damage 300 and releases both links before exhaustion notice", () => {
  const prior = tractor(roster(), "EXCALIBUR", "F", "LONG").ships;
  prior[0].energy = 80; prior[0].deviceDamage.SHIELDS = 300;
  const before = structuredClone(prior), result = shieldMode(prior, "EXCALIBUR", "UP");
  const expected = structuredClone(before);
  expected[0].energy = 0; expected[0].shields.mode = "UP";
  expected[0].tractorLink = expected[1].tractorLink = null;
  assert.deepEqual(result.ships, expected);
  assert.deepEqual(prior, before);
  assert.deepEqual(result.steps, [
    { kind: "OUTPUT", text: "\n" },
    { kind: "OUTPUT", text: "Shields raised, Captain.\n" },
    { kind: "TRACTOR_RELEASE", recipients: new Set(["EXCALIBUR", "FARRAGUT"]) },
    { kind: "OUTPUT", text: "\nShield control uses remaining ship energy!\n" },
  ]);
  assert.equal(result.ships[0].lifecycle.phase, "COMMISSIONED"); // Later fatal acquisition is separate.
});

test("SHIELDS UP above 300 rejects before energy cost or tractor release", () => {
  const prior = tractor(roster(), "EXCALIBUR", "F", "LONG").ships;
  prior[0].deviceDamage.SHIELDS = 300.1;
  const result = shieldMode(prior, "EXCALIBUR", "UP");
  assert.deepEqual(result.ships, prior);
  assert.equal(result.output, "\nCaptain, unable to raise shields due to critical damage.\n");
  assert.ok(result.steps.every(step => step.kind === "OUTPUT"));
});

test("repeated SHIELDS UP charges again; DOWN neither checks damage nor breaks links", () => {
  const prior = roster(); prior[0].shields.mode = "UP";
  const once = shieldMode(prior, "EXCALIBUR", "UP");
  const twice = shieldMode(once.ships, "EXCALIBUR", "UP");
  assert.equal(twice.ships[0].energy, prior[0].energy - 200);
  const linked = tractor(roster(), "EXCALIBUR", "F", "SHORT").ships;
  linked[0].deviceDamage.SHIELDS = 500;
  const down = shieldMode(linked, "EXCALIBUR", "DOWN");
  assert.deepEqual(down.ships, linked);
  assert.equal(down.output, "\nShields lowered, Captain.\n");
});
