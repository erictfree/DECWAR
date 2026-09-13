import assert from "node:assert/strict";
import test from "node:test";
import { FEDERATION_SHIPS, EMPIRE_SHIPS } from "../src/model.ts";
import type { Galaxy, Ship, Score, PlayerPreferences } from "../src/model.ts";
import { setDialogue } from "../src/preferences.ts";
import { statusFromTokens, damagesFromTokens } from "../src/ship-reports.ts";
import { radioCommand } from "../src/radio-command.ts";
import { prepareTell, deliverPlayerMessage } from "../src/tell.ts";
import { galaxyReport } from "../src/galaxy-report.ts";
import { lexicalSegment } from "../src/lexical.ts";
import { recognizeOrdinaryCommand, type OrdinaryCommand } from "../src/command-recognition.ts";
import { releaseShip } from "../src/ship-release.ts";
import { finalPoints } from "../src/final-points.ts";
import { quit } from "../src/quit.ts";
import { energyDialogue } from "../src/energy-validation.ts";
import { consumeNotification } from "../src/notification-consumption.ts";
import { validateBuild } from "../src/build-validation.ts";
import { buildOutput } from "../src/build-output.ts";
import { resolveDestination } from "../src/destination.ts";
import { sectorPath } from "../src/sector-path.ts";
import { automaticRepair, worldActivityTrigger, lifeSupportCheck, commitScore } from "../src/completion.ts";
import { acquisitionAlert } from "../src/command-prompt.ts";
import { torpedoPreflight } from "../src/torpedo-preflight.ts";
import { pointsCommand } from "../src/points-command.ts";
import { phaserOverheats } from "../src/phaser-overheat.ts";
import { phaserIncident, criticalHit, shipDamage } from "../src/shield-combat.ts";

// Section 11.1 scenario values, not game initialization defaults.
const zeroScore = (): Score => ({ ENEMY_DAMAGE: 0, ENEMY_KILLS: 0, BASE_DAMAGE: 0,
  PLANET_CAPTURE: 0, BASE_CONSTRUCTION: 0, ROMULAN: 0,
  STAR_DESTRUCTION: 0, PLANET_DESTRUCTION: 0 });
function fixture(): Galaxy {
  const ships: Ship[] = [...FEDERATION_SHIPS, ...EMPIRE_SHIPS].map(name => ({ name,
    lifecycle: { phase: "AVAILABLE" }, position: null, energy: 0, hullDamage: 0,
    deviceDamage: { SHIELDS: 0, WARP_ENGINES: 0, IMPULSE_ENGINES: 0,
      LIFE_SUPPORT: 0, TORPEDO_TUBES: 0, PHASERS: 0, COMPUTER: 0, RADIO: 0, TRACTOR_BEAM: 0 },
    shields: { mode: "DOWN", strength: 0 }, torpedoes: 0, stardate: 0,
    lifeSupportReserve: 5, condition: "GREEN", docked: false, tractorLink: null,
    radio: { enabled: true, gaggedShips: new Set() }, score: zeroScore(), pendingScore: zeroScore() }));
  for (const ship of ships.filter(s => s.name === "EXCALIBUR" || s.name === "WOLF")) {
    const first = ship.name === "EXCALIBUR";
    ship.lifecycle = { phase: "COMMISSIONED", captain: first ? "Player E" : "Player W" };
    ship.position = first ? { vertical: 20, horizontal: 20 } : { vertical: 60, horizontal: 61 };
    ship.energy = first ? 1234 : 5000;
    ship.hullDamage = first ? 2 : 0;
    ship.shields = { mode: "UP", strength: 100 };
    ship.torpedoes = 10; ship.stardate = 1;
  }
  return { ships, bases: [
    { team: "FEDERATION", position: { vertical: 40, horizontal: 40 }, strength: 100, knownTo: new Set() },
    { team: "EMPIRE", position: { vertical: 60, horizontal: 60 }, strength: 100, knownTo: new Set() }],
    planets: [{ position: { vertical: 22, horizontal: 20 }, allegiance: "NEUTRAL", construction: 0, knownTo: new Set() }],
    stars: [], blackHoles: { enabled: false }, romulan: { enabled: false },
    communication: { messages: [] }, notifications: [], worldActivityProgress: 0,
    warOutcome: null,
    teams: { FEDERATION: { score: zeroScore(), admissions: 1, completedTurns: 1 },
      EMPIRE: { score: zeroScore(), admissions: 1, completedTurns: 1 } } };
}
const preferences: PlayerPreferences = { outputLength: "MEDIUM", scanLength: "SHORT",
  promptStyle: "NORMAL", coordinateInput: "ABSOLUTE", coordinateOutput: "ABSOLUTE" };

test("7.26 confirmed departure reports committed points before releasing deliveries and link", () => {
  const galaxy = fixture(), ship = galaxy.ships[0], partner = galaxy.ships[1];
  partner.lifecycle = { phase: "COMMISSIONED", captain: "Player F" };
  partner.position = { vertical: 20, horizontal: 21 }; partner.energy = 3000;
  ship.tractorLink = partner.name; partner.tractorLink = ship.name;
  ship.score.PLANET_CAPTURE = 100; ship.pendingScore.PLANET_CAPTURE = 50;
  galaxy.communication.messages.push({ sender: ship.name, text: "hold",
    recipients: new Set([ship.name, partner.name]),
    pendingRecipients: new Set([ship.name, partner.name]) });
  galaxy.notifications.push({ facts: { kind: "ROMULAN_APPEARANCE", position: { vertical: 1, horizontal: 1 } },
    recipients: new Set([ship.name]), pendingRecipients: new Set([ship.name]) });
  const before = structuredClone(galaxy);
  const report = finalPoints(galaxy, ship.name, "SHORT");
  const withoutPending = structuredClone(galaxy);
  withoutPending.ships[0].pendingScore = zeroScore();
  assert.equal(report, finalPoints(withoutPending, ship.name, "SHORT"));
  const released = releaseShip(galaxy, ship.name);
  assert.deepEqual(galaxy, before);
  assert.deepEqual(released.ships[0], { ...ship, position: null, energy: 0,
    lifecycle: { phase: "AVAILABLE" }, tractorLink: null });
  assert.deepEqual(released.ships[1], { ...partner, tractorLink: null });
  assert.deepEqual(released.communication.messages[0].recipients, new Set([ship.name, partner.name]));
  assert.deepEqual(released.communication.messages[0].pendingRecipients, new Set([partner.name]));
  assert.deepEqual(released.notifications, [{ facts: { kind: "TRACTOR", ships: [ship.name, partner.name], active: false },
    recipients: new Set([ship.name, partner.name]), pendingRecipients: new Set([partner.name]) }]);
  assert.deepEqual(released.teams, before.teams);
  assert.equal(released.worldActivityProgress, before.worldActivityProgress);
  assert.deepEqual(releaseShip(released, ship.name), released);
  assert.throws(() => finalPoints(released, ship.name, "SHORT"), /current commission/);
});

test("9.2 destroyed release preserves a replacement sector occupant and removes last radio copy", () => {
  const galaxy = fixture(), ship = galaxy.ships[0];
  ship.lifecycle = { phase: "DESTROYED", captain: "Player E" };
  galaxy.stars.push({ ...ship.position! });
  galaxy.communication.messages.push({ sender: "WOLF", text: "stop",
    recipients: new Set([ship.name]), pendingRecipients: new Set([ship.name]) });
  const released = releaseShip(galaxy, ship.name);
  assert.deepEqual(released.stars, galaxy.stars);
  assert.deepEqual(released.communication.messages, []);
  assert.equal(released.ships[0].position, null);
});

test("7.26 fresh QUIT confirmation distinguishes waiting, declining and affirmative first tokens", () => {
  const galaxy = fixture();
  galaxy.ships[0].condition = "RED";
  const before = structuredClone(galaxy), prompt = "\nDo you really want to quit? ";
  for (const prior of ["YES", "/YES", "YES/YES"]) {
    const waiting = quit(galaxy, "EXCALIBUR", preferences, prior, null);
    assert.equal(waiting.outcome, "AWAITING_CONFIRMATION");
    assert.equal(waiting.output, prompt);
    assert.deepEqual(waiting.galaxy, before);
    for (const reply of ["", "NO", "NO YES", "1", "YESPLEASE"]) {
      const declined = quit(galaxy, "EXCALIBUR", preferences, prior, reply);
      assert.equal(declined.outcome, "DECLINED");
      assert.equal(declined.output, prompt);
      assert.deepEqual(declined.galaxy, before);
    }
  }
  for (const reply of ["y", "Ye", "YES", "YES NO"]) {
    const accepted = quit(galaxy, "EXCALIBUR", preferences, "/NO", reply);
    assert.equal(accepted.outcome, "RELEASED");
    assert.equal(accepted.output, prompt + finalPoints(galaxy, "EXCALIBUR", preferences.outputLength));
    assert.deepEqual(accepted.galaxy, releaseShip(galaxy, "EXCALIBUR"));
  }
  assert.deepEqual(galaxy, before);
});

test("7.12 exact transfer scenario changes energy before delayed delivery, without radio filtering", () => {
  for (const initialEnergy of [2000, 5000]) {
    const galaxy = fixture(), sender = galaxy.ships[0], recipient = galaxy.ships[1];
    sender.energy = 1000; sender.condition = "RED"; sender.docked = true;
    recipient.lifecycle = { phase: "COMMISSIONED", captain: "Player F" };
    recipient.position = { vertical: 20, horizontal: 21 }; recipient.energy = initialEnergy;
    recipient.radio.enabled = false; recipient.radio.gaggedShips.add(sender.name);
    recipient.deviceDamage.RADIO = 400;
    const before = structuredClone(galaxy);
    const request = energyDialogue(galaxy.ships, sender.name,
      [{ kind: "WORD", text: "F" }, { kind: "INTEGER", value: 100 }], [], "SHORT");
    assert.equal(request.status, "READY");
    if (request.status !== "READY") throw new Error("scenario validation failed");
    // Both discussed arithmetic alternatives agree on these fixture values.
    // This is not a general precision policy or an ENERGY dispatcher.
    const delivered = Math.min(0.9 * request.amount, 5000 - recipient.energy);
    const debit = delivered * 10 / 9;
    assert.equal(debit, delivered + Math.trunc(10 * delivered / 9) / 10);
    sender.energy -= debit; recipient.energy += delivered;
    galaxy.notifications.push({ facts: { kind: "ENERGY_TRANSFER", sender: sender.name,
      recipient: recipient.name, delivered }, recipients: new Set([recipient.name]),
      pendingRecipients: new Set([recipient.name]) });
    assert.equal(request.output + "Energy transferred, Captain.\n", "\nEnergy transferred, Captain.\n");
    assert.deepEqual(sender, { ...before.ships[0], energy: initialEnergy === 2000 ? 900 : 1000 });
    assert.deepEqual(recipient, { ...before.ships[1], energy: initialEnergy === 2000 ? 2090 : 5000 });
    assert.deepEqual(galaxy.teams, before.teams);
    assert.equal(galaxy.worldActivityProgress, before.worldActivityProgress);
    // A later output preference is used; radio state does not suppress this notice.
    const consumed = consumeNotification(galaxy.notifications[0], recipient,
      { ...preferences, outputLength: "LONG" });
    assert.equal(consumed.output,
      `\nExcalibur  transfers ${delivered.toFixed(1)} units of energy to the  Farragut \n`);
    assert.equal(consumed.remaining, null);
    assert.equal(recipient.energy, initialEnergy + delivered);
  }
});

test("7.10 non-entity coordinate reports enforce ten-sector visibility and guard C-028", () => {
  for (const content of ["EMPTY", "STAR", "BLACK_HOLE"] as const) {
    const galaxy = fixture();
    if (content === "STAR") galaxy.stars = [
      { vertical: 20, horizontal: 30 }, { vertical: 20, horizontal: 31 }];
    if (content === "BLACK_HOLE") galaxy.blackHoles = { enabled: true, positions: [
      { vertical: 20, horizontal: 30 }, { vertical: 20, horizontal: 31 }] };
    const before = structuredClone(galaxy);
    for (const outputLength of ["SHORT", "MEDIUM", "LONG"] as const) {
      const prefs = { ...preferences, outputLength };
      assert.throws(() => galaxyReport(galaxy, "EXCALIBUR", "LIST", ["20", "30"], prefs), /C-028/);
      for (const command of ["LIST", "BASES", "PLANETS", "TARGETS"] as const) {
        const far = galaxyReport(galaxy, "EXCALIBUR", command, ["20", "31"], prefs);
        assert.equal(far.output, "\nCaptain, our sensors can't scan as far as 20-31\n");
        assert.deepEqual(far.galaxy, before);
        if (command !== "LIST") {
          const near = galaxyReport(galaxy, "EXCALIBUR", command, ["20", "30"], prefs);
          const kind = command === "BASES" ? "base" : command === "PLANETS" ? "planet" : "target";
          assert.equal(near.output, `\nNo ${kind} @20-30\n`);
          assert.deepEqual(near.galaxy, before);
        }
      }
    }
    assert.deepEqual(galaxy, before);
  }
});

test("7.10 empty report diagnostics distinguish absent, out-of-range and unknown candidates", () => {
  const cases = [
    { command: "BASES" as const, args: ["1"], base: false, planet: false,
      body: " Federation bases", scope: " in game" },
    { command: "BASES" as const, args: ["1"], base: true, planet: false,
      body: " Federation bases", scope: " in specified range" },
    { command: "PLANETS" as const, args: [], base: false, planet: true,
      body: " planets", scope: " in range" },
    { command: "PLANETS" as const, args: ["20"], base: false, planet: true,
      body: " known planets", scope: " in specified range" },
    { command: "PLANETS" as const, args: ["20"], base: false, planet: false,
      body: " known planets", scope: " in game" },
  ];
  for (const scenario of cases) {
    const galaxy = fixture();
    galaxy.bases = scenario.base ? [{ team: "FEDERATION", position: { vertical: 22, horizontal: 20 },
      strength: 100, knownTo: new Set() }] : [];
    galaxy.planets = scenario.planet ? [{ allegiance: "NEUTRAL", position: { vertical: 35, horizontal: 20 },
      construction: 0, knownTo: new Set() }] : [];
    const before = structuredClone(galaxy);
    for (const outputLength of ["SHORT", "MEDIUM", "LONG"] as const) {
      const result = galaxyReport(galaxy, "EXCALIBUR", scenario.command, scenario.args,
        { ...preferences, outputLength });
      assert.equal(result.aborted, false);
      assert.equal(result.output, "\n" + (outputLength === "LONG" ? "Captain, there are no" : "No")
        + scenario.body + (outputLength === "SHORT" ? "" : scenario.scope) + "\n");
      assert.deepEqual(result.galaxy, before);
    }
  }
});

test("7.16 BUILD rejection order and stage-specific base limit preserve the galaxy", () => {
  const galaxy = fixture();
  galaxy.bases = Array.from({ length: 10 }, (_, i) => ({ team: "FEDERATION" as const,
    position: { vertical: 40, horizontal: i + 1 }, strength: 100, knownTo: new Set<"FEDERATION" | "EMPIRE">() }));
  galaxy.planets = [{ position: { vertical: 20, horizontal: 21 }, allegiance: "NEUTRAL",
    construction: 4, knownTo: new Set() }];
  const before = structuredClone(galaxy);
  const rejected = [
    { position: { vertical: 20, horizontal: 22 }, kind: "NOT_ADJACENT", output: "Excalibur not adjacent to planet.\n" },
    { position: { vertical: 21, horizontal: 20 }, kind: "NO_PLANET", output: "\nNo planet at those coordinates, Captain.\n" },
    { position: { vertical: 20, horizontal: 21 }, kind: "NOT_FRIENDLY", output: "\nPlanet not yet captured." },
  ];
  for (const example of rejected) {
    const result = validateBuild(galaxy, "EXCALIBUR", example.position);
    assert.equal(result.kind, example.kind);
    if (result.kind === "READY") throw new Error("expected rejection");
    assert.equal(buildOutput(result, "EXCALIBUR", "FEDERATION", galaxy.ships[0].position!,
      { ...preferences, outputLength: "LONG" }), example.output);
    assert.deepEqual(galaxy, before);
  }
  galaxy.planets[0].allegiance = "FEDERATION";
  assert.deepEqual(validateBuild(galaxy, "EXCALIBUR", galaxy.planets[0].position), { kind: "BASE_LIMIT" });
  galaxy.planets[0].construction = 2;
  assert.deepEqual(validateBuild(galaxy, "EXCALIBUR", galaxy.planets[0].position), { kind: "READY", stage: 3 });
  galaxy.planets[0].construction = 4; galaxy.bases.pop();
  assert.deepEqual(validateBuild(galaxy, "EXCALIBUR", galaxy.planets[0].position), { kind: "READY", stage: 5 });
});

test("9.1 written IMPULSE spending the last energy completes before fatal acquisition, clear or blocked", () => {
  for (const blocked of [false, true]) {
    const galaxy = fixture(), ship = galaxy.ships[0];
    ship.energy = 4; ship.hullDamage = 0; ship.deviceDamage.RADIO = 80;
    ship.deviceDamage.WARP_ENGINES = 300; ship.shields.mode = "DOWN";
    ship.pendingScore.PLANET_CAPTURE = 50;
    const start = { ...ship.position! };
    const input = lexicalSegment("I R 1 0");
    if (input.status !== "TOKENS") throw new Error("ordinary scenario input required");
    assert.deepEqual(recognizeOrdinaryCommand(input.tokens[0]), { kind: "COMMAND", command: "IMPULSE" });
    assert.ok(ship.deviceDamage.IMPULSE_ENGINES < 300);
    const destination = resolveDestination(galaxy, ship.name, preferences, input.tokens.slice(1));
    assert.deepEqual(destination, { kind: "POSITION", position: { vertical: 21, horizontal: 20 } });
    if (destination.kind !== "POSITION") throw new Error("position required");
    if (blocked) galaxy.stars.push(destination.position);
    const path = sectorPath(start, { vertical: 1, horizontal: 0 }, 1, 0,
      p => galaxy.stars.some(s => s.vertical === p.vertical && s.horizontal === p.horizontal),
      () => { throw new Error("axis-aligned path must not need a tie sample"); });
    // The specified scenario composes movement and completion; not a generic dispatcher.
    ship.condition = "GREEN"; ship.docked = false;
    ship.energy -= 4; ship.position = path.last;
    assert.equal(ship.lifecycle.phase, "COMMISSIONED");
    assert.equal(ship.energy, 0);
    assert.deepEqual(ship.position, blocked ? start : destination.position);
    const movementOutput = path.obstruction ? "\nNavigation Officer:  \"Collision averted, Captain!\"\n" : "";
    assert.equal(Boolean(path.obstruction), blocked);
    ship.deviceDamage = automaticRepair(ship.deviceDamage);
    const cycle = worldActivityTrigger(galaxy.worldActivityProgress,
      galaxy.ships.filter(s => s.lifecycle.phase !== "AVAILABLE").length);
    assert.deepEqual(cycle, { progress: 1, due: false });
    galaxy.worldActivityProgress = cycle.progress;
    ship.stardate++; galaxy.teams.FEDERATION.completedTurns++;
    const life = lifeSupportCheck(ship.deviceDamage.LIFE_SUPPORT, ship.docked, ship.lifeSupportReserve, ship.hullDamage);
    ship.lifeSupportReserve = life.reserve; ship.hullDamage = life.hullDamage;
    commitScore(ship.score, galaxy.teams.FEDERATION.score, ship.pendingScore);
    assert.equal(ship.stardate, 2);
    assert.equal(ship.deviceDamage.RADIO, 50);
    assert.equal(ship.deviceDamage.WARP_ENGINES, 270);
    assert.equal(ship.score.PLANET_CAPTURE, 50);
    assert.equal(ship.pendingScore.PLANET_CAPTURE, 0);
    assert.throws(() => acquisitionAlert(ship), /Fatal departure precedes/);
    const finalReport = finalPoints(galaxy, ship.name, "MEDIUM");
    const output = movementOutput + "\nE RUNS OUT OF ENERGY!!\n" + finalReport;
    assert.ok(output.endsWith(finalReport));
    assert.ok(!output.includes("Command: "));
    const released = releaseShip(galaxy, ship.name);
    assert.equal(released.ships[0].lifecycle.phase, "AVAILABLE");
    assert.equal(released.ships[0].stardate, 2);
    assert.equal(released.teams.FEDERATION.score.PLANET_CAPTURE, 50);
    assert.deepEqual(released.stars, galaxy.stars);
  }
});

test("7.20 whole-burst preflight repeats last aim and preserves ammunition on all prelaunch outcomes", () => {
  const ship = fixture().ships[0]; ship.torpedoes = 3; ship.docked = true;
  const a = { vertical: 21, horizontal: 20 }, b = { vertical: 20, horizontal: 30 };
  const far = { vertical: 20, horizontal: 31 }, own = ship.position!;
  const before = structuredClone(ship);
  assert.deepEqual(torpedoPreflight(ship, 3, [a, b], "SHORT"),
    { kind: "READY", output: "", targets: [a, b, b] });
  assert.deepEqual(torpedoPreflight(ship, 2, [a, far], "SHORT"),
    { kind: "REJECTED", output: "Target out of range.\n" });
  assert.equal(torpedoPreflight(ship, 2, [far, own], "SHORT").kind, "REJECTED");
  assert.equal(torpedoPreflight(ship, 2, [own, far], "SHORT").kind, "SELF_TARGET_REVIEW");
  assert.deepEqual(torpedoPreflight(ship, 0, [], "SHORT"), { kind: "CANCELLED", output: "" });
  assert.deepEqual(torpedoPreflight(ship, 4, [a], "SHORT"), { kind: "REJECTED",
    output: "Insufficient torpedoes for burst!\n\n3 torpedoes left.\n" });
  assert.deepEqual(ship, before);
  ship.torpedoes = 10;
  assert.deepEqual(torpedoPreflight(ship, 4, [a], "LONG"),
    { kind: "REJECTED", output: "\n10 torpedoes left.\n" });
  ship.torpedoes = 0; ship.deviceDamage.TORPEDO_TUBES = 300;
  assert.deepEqual(torpedoPreflight(ship, 0, [], "LONG"),
    { kind: "REJECTED", output: "Torpedo tubes critically damaged.\n" });
  ship.deviceDamage.TORPEDO_TUBES = 299.9;
  assert.deepEqual(torpedoPreflight(ship, 0, [], "SHORT"),
    { kind: "REJECTED", output: "\n0 torpedoes left.\n" });
});

test("7.7 written STATUS selector pairs preserve input order, repetition and comma separation", () => {
  const galaxy = fixture(), before = structuredClone(galaxy), ship = galaxy.ships[0];
  const fields = [
    ["CONDITION", "C", "G"], ["LOCATION", "L", "20-20"],
    ["TORPEDOS", "T", "T10"], ["ENERGY", "E", "E1234"],
    ["DAMAGE", "D", "D2"], ["SHIELDS", "S", "SH+100"], ["RADIO", "R", "ROn"],
  ];
  for (const left of fields) for (const right of fields) {
    for (const separator of [" ", ","]) {
      const parsed = lexicalSegment(`st ${left[0].toLowerCase()}${separator}${right[1]}`);
      if (parsed.status !== "TOKENS") throw new Error("ordinary legal selectors required");
      assert.deepEqual(recognizeOrdinaryCommand(parsed.tokens[0]), { kind: "COMMAND", command: "STATUS" });
      const tokens = parsed.tokens.slice(1).map(t => t.kind === "WORD"
        ? { kind: "WORD" as const, text: t.text } : { kind: "OTHER" as const });
      assert.equal(statusFromTokens(ship, "SHORT", tokens), `\n${left[2]} ${right[2]} \n`);
    }
  }
  assert.deepEqual(galaxy, before);
});

test("7.6 written DAMAGES device pairs preserve input order and duplicate requested rows", () => {
  const galaxy = fixture(), ship = galaxy.ships[0];
  const devices = ["SHIELDS", "WARP_ENGINES", "IMPULSE_ENGINES", "LIFE_SUPPORT", "TORPEDO_TUBES",
    "PHASERS", "COMPUTER", "RADIO", "TRACTOR_BEAM"] as const;
  const codes = ["SH", "WA", "IM", "LS", "TO", "PH", "CO", "RA", "TR"];
  devices.forEach((device, i) => { ship.deviceDamage[device] = i + 1; });
  const before = structuredClone(galaxy);
  for (let i = 0; i < codes.length; i++) for (let j = 0; j < codes.length; j++) {
    const parsed = lexicalSegment(`da ${codes[i].toLowerCase()},${codes[j]}`);
    if (parsed.status !== "TOKENS") throw new Error("ordinary device selectors required");
    assert.deepEqual(recognizeOrdinaryCommand(parsed.tokens[0]), { kind: "COMMAND", command: "DAMAGES" });
    const tokens = parsed.tokens.slice(1).map(t => t.kind === "WORD"
      ? { kind: "WORD" as const, text: t.text } : { kind: "OTHER" as const });
    const row = (index: number) => codes[index] + "  " + String(index + 1).padStart(4) + "\n";
    assert.equal(damagesFromTokens(ship.name, ship.deviceDamage, "SHORT", tokens), "\n" + row(i) + row(j));
  }
  assert.deepEqual(galaxy, before);
});

test("7.8 all nonempty POINTS subject subsets resolve written aliases to fixed unique columns", () => {
  const galaxy = fixture();
  galaxy.ships[0].score.ENEMY_DAMAGE = 100;
  galaxy.ships[0].pendingScore.ENEMY_DAMAGE = 999;
  galaxy.teams.FEDERATION.score.ENEMY_DAMAGE = 200;
  galaxy.teams.EMPIRE.score.ENEMY_DAMAGE = 300;
  galaxy.romulan = { enabled: true, vessel: null, elapsedTriggers: 0,
    statistics: { score: { ...zeroScore(), ENEMY_DAMAGE: 400 }, appearances: 1, activityCount: 1 } };
  const before = structuredClone(galaxy);
  const aliases = ["me", "humans", "klingons", "romulans"];
  const repeated = ["i", "f", "e", "r"];
  const headings = [" Excalibur ", "Federation ", "    Empire ", "  Romulans"];
  for (let mask = 1; mask < 16; mask++) {
    const indices = [0, 1, 2, 3].filter(i => (mask & (1 << i)) !== 0);
    const words = [...indices].reverse().map(i => aliases[i]);
    words.push(...indices.map(i => repeated[i]));
    const input = lexicalSegment("po " + words.join(","));
    if (input.status !== "TOKENS") throw new Error("legal subject list required");
    assert.deepEqual(recognizeOrdinaryCommand(input.tokens[0]), { kind: "COMMAND", command: "POINTS" });
    const output = pointsCommand(galaxy, "EXCALIBUR", input.tokens.slice(1).map(t => t.text), "SHORT");
    assert.equal(output.split("\n")[1], " ".repeat(13) + indices.map(i => headings[i]).join(""));
    const numbers = indices.map(i => String((i + 1) * 100).padStart(11)).join("");
    assert.ok(output.includes("\nDam E's  " + numbers + "\n"));
    assert.ok(output.includes("\nTot Pts  " + numbers + "\n"));
    assert.ok(output.endsWith("\nPts / SD " + numbers + "\n"));
    assert.equal(output.includes("# of shps"), indices.some(i => i !== 0));
    assert.deepEqual(galaxy, before);
  }
});

test("7.10 written SUMMARY category/allegiance matrix has exact counts and unchanged discovery", () => {
  const galaxy = fixture();
  for (const [name, vertical] of [["FARRAGUT", 22], ["DEMON", 23], ["WOLF", 21]] as const) {
    const ship = galaxy.ships.find(s => s.name === name)!;
    ship.lifecycle = { phase: "COMMISSIONED", captain: name };
    ship.position = { vertical, horizontal: 20 }; ship.energy = 5000;
  }
  galaxy.bases = ["FEDERATION", "FEDERATION", "EMPIRE"].map((team, i) => ({
    team: team as "FEDERATION" | "EMPIRE", position: { vertical: 20, horizontal: 21 + i },
    strength: 100, knownTo: new Set() }));
  galaxy.planets = (["NEUTRAL", "NEUTRAL", "FEDERATION", "EMPIRE", "EMPIRE"] as const)
    .map((allegiance, i) => ({ allegiance, position: { vertical: 25, horizontal: 20 + i },
      construction: 0, knownTo: new Set() }));
  const before = structuredClone(galaxy);
  const fs = "  2 Federation ships", es = "  2 Empire ships";
  const fb = "  2 Federation bases", eb = "  1 Empire base";
  const np = "  2 neutral planets", fp = "  1 Federation planet", ep = "  2 Empire planets";
  const cases: [string, string[][]][] = [
    ["", [[fs, es], [fb, eb], [np, fp, ep]]],
    ["ALL", [[fs, es], [fb, eb], [np, fp, ep]]],
    ["FRIENDLY", [[fs], [fb], [fp]]], ["ENEMY", [[es], [eb], [ep]]],
    ["SHIPS FRIENDLY", [[fs]]], ["SHIPS ENEMY", [[es]]], ["SHIPS ALL", [[fs, es]]],
    ["BASES FRIENDLY", [[fb]]], ["BASES ENEMY", [[eb]]], ["BASES ALL", [[fb, eb]]],
    ["PLANETS FRIENDLY", [[fp]]], ["PLANETS ENEMY", [[ep]]],
    ["PLANETS NEUTRAL", [[np]]], ["PLANETS CAPTURED", [[fp, ep]]],
    ["PLANETS ALL", [[np, fp, ep]]], ["PORTS", [[fb], [np, fp]]],
    ["PORTS ENEMY", [[eb], [ep]]], ["CAPTURED PORTS", [[fb, eb], [fp, ep]]],
    ["NEUTRAL PORTS", [[np]]],
  ];
  for (const [operands, sections] of cases) {
    const parsed = commandInput("su " + operands.toLowerCase(), "SUMMARY");
    for (const outputLength of ["SHORT", "MEDIUM", "LONG"] as const) {
      const result = galaxyReport(galaxy, "EXCALIBUR", "SUMMARY", parsed.operands,
        { ...preferences, outputLength });
      const suffix = outputLength === "SHORT" ? "" : " in game";
      const expected = "\n" + sections.map(rows => "\n\n" + rows.map(row => row + suffix + "\n").join("")).join("");
      assert.equal(result.aborted, false, operands);
      assert.equal(result.output, expected, operands + "/" + outputLength);
      assert.deepEqual(result.galaxy, before);
    }
  }
});

test("7.19 written noncritical phaser shot commits damage before two independent report deliveries", () => {
  const galaxy = fixture(), shooter = galaxy.ships[0], target = galaxy.ships[17];
  shooter.energy = 5000; shooter.hullDamage = 0; shooter.shields.mode = "DOWN";
  shooter.deviceDamage.RADIO = 80;
  target.position = { vertical: 20, horizontal: 21 }; target.shields.mode = "DOWN";
  target.radio.enabled = false; target.radio.gaggedShips.add(shooter.name);
  const input = lexicalSegment("ph absolute 200 20 21");
  if (input.status !== "TOKENS") throw new Error("legal shot input required");
  assert.deepEqual(recognizeOrdinaryCommand(input.tokens[0]), { kind: "COMMAND", command: "PHASERS" });
  assert.ok(shooter.deviceDamage.PHASERS < 300);
  // This scenario separates the explicit energy token from the destination;
  // it is not a general weapon-input parser or readiness scheduler.
  const power = Number(input.tokens[2].text);
  const aim = resolveDestination(galaxy, shooter.name, preferences,
    [input.tokens[1], ...input.tokens.slice(3)]);
  assert.deepEqual(aim, { kind: "POSITION", position: target.position });
  assert.notEqual(shooter.name, target.name);
  const distance = Math.max(Math.abs(shooter.position!.vertical - target.position.vertical),
    Math.abs(shooter.position!.horizontal - target.position.horizontal));
  assert.equal(distance, 1); assert.ok(power >= 50 && power <= 500);
  // Both banks are already ready; specified draws: overheat, critical, attenuation.
  const draws = [94, 0, 0];
  assert.equal(phaserOverheats(power, draws.shift()!), false);
  const criticalSample = draws.shift()!, attenuationSample = draws.shift()!;
  const damage = phaserIncident(power, distance, attenuationSample, false, false);
  const critical = criticalHit(damage, criticalSample);
  assert.equal(critical, false);
  const hit = shipDamage(damage, critical, 0); // Noncritical path uses no hull sample.
  assert.equal(hit.hullLoss, 1440); assert.deepEqual(draws, []);
  target.hullDamage += hit.hullLoss; target.energy -= hit.hullLoss; target.condition = "RED";
  shooter.pendingScore.ENEMY_DAMAGE += hit.hullLoss;
  const recipients = new Set(galaxy.ships.filter(s => s.lifecycle.phase !== "AVAILABLE" && s.position
    && Math.max(Math.abs(s.position.vertical - target.position!.vertical),
      Math.abs(s.position.horizontal - target.position!.horizontal)) <= 10).map(s => s.name));
  galaxy.notifications.push({ facts: { kind: "HIT", hit: {
    action: "PHASER", source: { kind: "SHIP", name: shooter.name, position: { ...shooter.position! }, shields: { ...shooter.shields } },
    target: { kind: "SHIP", name: target.name, position: { ...target.position }, shields: { ...target.shields } },
    reportedDamage: hit.hullLoss, displaced: false, death: "NONE", critical: null, baseEmergency: false } },
    recipients, pendingRecipients: new Set(recipients) });
  shooter.energy -= power; shooter.condition = "RED";
  const cycle = worldActivityTrigger(galaxy.worldActivityProgress, 2);
  assert.deepEqual(cycle, { progress: 1, due: false }); galaxy.worldActivityProgress = cycle.progress;
  shooter.stardate++; galaxy.teams.FEDERATION.completedTurns++;
  commitScore(shooter.score, galaxy.teams.FEDERATION.score, shooter.pendingScore);
  assert.equal(shooter.deviceDamage.RADIO, 80); // Weapon turn omits automatic repair.
  assert.equal(shooter.energy, 4800); assert.equal(target.energy, 3560);
  assert.equal(target.stardate, 1); assert.equal(shooter.stardate, 2);
  assert.equal(shooter.score.ENEMY_DAMAGE, 1440); assert.equal(shooter.pendingScore.ENEMY_DAMAGE, 0);
  assert.equal(galaxy.teams.FEDERATION.score.ENEMY_DAMAGE, 1440);
  const expected = "E 20-20 -100  1440P  W 20-21 -100\n";
  const first = consumeNotification(galaxy.notifications[0], shooter, { ...preferences, outputLength: "SHORT" });
  assert.equal(first.output, expected); assert.ok(first.remaining);
  assert.deepEqual(first.remaining.pendingRecipients, new Set([target.name]));
  const second = consumeNotification(first.remaining, target, { ...preferences, outputLength: "SHORT" });
  assert.equal(second.output, expected); assert.equal(second.remaining, null);
  galaxy.notifications = [];
  assert.equal(target.hullDamage, 1440);
});

// Ordinary command recognition; operand grammar is still exercised per scenario.
function commandInput(line: string, command: OrdinaryCommand) {
  const result = lexicalSegment(line);
  assert.equal(result.status, "TOKENS");
  if (result.status !== "TOKENS") throw new Error("Scenario requires reviewed lexical input");
  assert.deepEqual(recognizeOrdinaryCommand(result.tokens[0]), { kind: "COMMAND", command });
  return { operands: result.tokens.slice(1).map(t => t.text.toUpperCase()),
    text: result.boundary === "SEMICOLON" ? result.remainder : null };
}

// These cases include ordinary segment tokenization and compose the specified
// command operations. They do not implement acquisition, echo or scheduling.
test("11.2 SET and STATUS preserve the galaxy across presentation changes", () => {
  const galaxy = fixture(), before = structuredClone(galaxy);
  let prefs = { ...preferences };
  const outputs: string[] = [];
  for (const line of ["SE OUTPUT SHORT", "SE SCANS LONG", "SE OUTPUT LONG"]) {
    const changed = setDialogue(prefs, commandInput(line, "SET").operands, []);
    prefs = changed.preferences;
    outputs.push(changed.output);
    outputs.push(statusFromTokens(galaxy.ships[0], prefs.outputLength,
      commandInput("ST E D", "STATUS").operands.map(text => ({ kind: "WORD", text }))));
  }
  assert.deepEqual(outputs, ["", "\nE1234 D2 \n", "", "\nE1234 D2 \n", "",
    "\nEnergy left\t1234.0\nDamage\t\t   2.0\n"]);
  assert.deepEqual(prefs, { ...preferences, outputLength: "LONG", scanLength: "LONG" });
  assert.deepEqual(galaxy, before);
});

test("11.3 established RADIO state controls TELL acceptance and one-time delivery", () => {
  const galaxy = fixture(), before = structuredClone(galaxy);
  const sender = galaxy.ships[0], receiver = galaxy.ships[17];
  const off = radioCommand(receiver.name, receiver.radio, "SHORT", commandInput("RA OF", "RADIO").operands);
  receiver.radio = off.radio;
  assert.equal(off.output, "\nRadio turned off, Captain.\n");
  const firstTell = commandInput("TE W;hold", "TELL");
  const rejected = prepareTell(sender, galaxy.ships, firstTell.operands, firstTell.text, "MEDIUM");
  sender.radio = rejected.senderRadio;
  assert.equal(rejected.output, "\nCommunications:  Captain, we cannot raise the W\n\nNo message sent.\n");
  assert.equal(rejected.message, null);
  const on = radioCommand(receiver.name, receiver.radio, "SHORT", commandInput("RA ON", "RADIO").operands);
  receiver.radio = on.radio;
  assert.equal(on.output, "\nRadio turned on, Captain.\n");
  const secondTell = commandInput("TE W;hold", "TELL");
  const accepted = prepareTell(sender, galaxy.ships, secondTell.operands, secondTell.text, "MEDIUM");
  sender.radio = accepted.senderRadio;
  assert.equal(accepted.output, "\n");
  assert.deepEqual(accepted.message, { sender: "EXCALIBUR", text: "hold",
    recipients: new Set(["WOLF"]), pendingRecipients: new Set(["WOLF"]) });
  galaxy.communication.messages.push(accepted.message!);
  const delivered = deliverPlayerMessage(galaxy.communication.messages[0], receiver, "SHORT");
  assert.equal(delivered.output, "\nMessage from E to  W\nhold\n\n");
  assert.equal(delivered.message, null);
  galaxy.communication.messages = [];
  assert.deepEqual(galaxy, before);
});

test("11.4 failed LIST preserves direct output; the next command discovers only its aggregate port", () => {
  const galaxy = fixture(), before = structuredClone(galaxy);
  const prefs = { outputLength: "LONG", coordinateOutput: "ABSOLUTE" } as const;
  const rejected = galaxyReport(galaxy, "EXCALIBUR", "LIST",
    commandInput("LIST 22 20 & BASES FRIENDLY & ZZZ", "LIST").operands, prefs);
  assert.equal(rejected.aborted, true);
  assert.equal(rejected.output, "\n Neu planet  @22-20\nIllegal keyword ZZZ\n");
  assert.deepEqual(rejected.galaxy, before);
  const accepted = galaxyReport(rejected.galaxy, "EXCALIBUR", "LIST",
    commandInput("LIST BASES FRIENDLY & 22 20", "LIST").operands, prefs);
  assert.equal(accepted.aborted, false);
  assert.equal(accepted.output, "\n Neu planet  @22-20\n\n Fed Base    @40-40   100.0%\n\n");
  before.bases[0].knownTo.add("FEDERATION");
  assert.deepEqual(accepted.galaxy, before);
});
