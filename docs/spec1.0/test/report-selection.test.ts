import assert from "node:assert/strict";
import test from "node:test";
import type { Galaxy, Score, Ship } from "../src/model.ts";
import { selectReport } from "../src/report-selection.ts";
import type { AggregateGroup } from "../src/report-selection.ts";
import { reportSummary } from "../src/report-summary.ts";
import { reportOutput } from "../src/report-assembly.ts";
import { parseAggregateGroups } from "../src/report-groups.ts";
import { aggregateDetail } from "../src/report-detail.ts";
import { namedReport, coordinateReport, closestSelection } from "../src/report-direct.ts";
import { galaxyReport } from "../src/galaxy-report.ts";

function world(): Galaxy {
  const score: Score = { ENEMY_DAMAGE: 0, ENEMY_KILLS: 0, BASE_DAMAGE: 0,
    PLANET_CAPTURE: 0, BASE_CONSTRUCTION: 0, ROMULAN: 0, STAR_DESTRUCTION: 0, PLANET_DESTRUCTION: 0 };
  const ship: Ship = { name: "EXCALIBUR", lifecycle: { phase: "COMMISSIONED", captain: "Player" },
    position: { vertical: 20, horizontal: 20 }, energy: 5000, hullDamage: 0,
    deviceDamage: { SHIELDS: 0, WARP_ENGINES: 0, IMPULSE_ENGINES: 0, LIFE_SUPPORT: 0,
      TORPEDO_TUBES: 0, PHASERS: 0, COMPUTER: 0, RADIO: 0, TRACTOR_BEAM: 0 },
    shields: { mode: "UP", strength: 100 }, torpedoes: 10, lifeSupportReserve: 5,
    condition: "GREEN", docked: false, tractorLink: null,
    radio: { enabled: true, gaggedShips: new Set() }, stardate: 1,
    score: { ...score }, pendingScore: { ...score } };
  return { worldActivityProgress: 0, notifications: [], ships: [ship], bases: [
    { team: "FEDERATION", position: { vertical: 40, horizontal: 40 }, strength: 100, knownTo: new Set() },
    { team: "EMPIRE", position: { vertical: 35, horizontal: 20 }, strength: 100, knownTo: new Set(["FEDERATION"]) },
    { team: "EMPIRE", position: { vertical: 36, horizontal: 20 }, strength: 100, knownTo: new Set() } ],
    planets: [{ allegiance: "NEUTRAL", position: { vertical: 22, horizontal: 20 }, construction: 0, knownTo: new Set() }],
    stars: [], blackHoles: { enabled: false }, romulan: { enabled: false },
    communication: { messages: [] }, teams: {
      FEDERATION: { score: { ...score }, admissions: 1, completedTurns: 1 },
      EMPIRE: { score: { ...score }, admissions: 1, completedTurns: 1 } } };
}
const bases = (overrides: Partial<AggregateGroup> = {}): AggregateGroup => ({
  kinds: ["BASE"], sides: ["FEDERATION", "EMPIRE"], radius: 100,
  explicitRadius: false, detail: false, summary: true, ...overrides });

test("whole-galaxy SUMMARY counts unknown bases but even numeric radius 80 does not", () => {
  const galaxy = world(), before = structuredClone(galaxy);
  const wholeQuery = parseAggregateGroups("SUMMARY", "FEDERATION", ["BASES"]);
  assert.equal(wholeQuery.error, null);
  const whole = selectReport(galaxy, "EXCALIBUR", wholeQuery.groups);
  assert.equal(whole.selected.length, 3);
  const finiteQuery = parseAggregateGroups("SUMMARY", "FEDERATION", ["BASES", "80"]);
  assert.equal(finiteQuery.error, null);
  const finite = selectReport(galaxy, "EXCALIBUR", finiteQuery.groups);
  assert.deepEqual(finite.selected.map(o => o.index), [0, 1]);
  assert.deepEqual(finite.categoryQualifiers["Empire base"],
    { known: true, inGame: false, specifiedRange: true });
  assert.deepEqual(galaxy, before); // Counts do not discover the unknown base.
  const lines = ["Federation base", "Empire base"].map(label => reportSummary(
    whole.selected.filter(o => o.summary && o.category === label).length,
    label, whole.categoryQualifiers[label], false));
  assert.equal(reportOutput([], { bases: { detailRows: [], summaryLines: lines } }, false, false),
    "\n\n\n  1 Federation base in game\n  2 Empire bases in game\n");
  const finiteLines = ["Federation base", "Empire base"].map(label => reportSummary(
    finite.selected.filter(o => o.summary && o.category === label).length,
    label, finite.categoryQualifiers[label], false));
  assert.equal(reportOutput([], { bases: { detailRows: [], summaryLines: finiteLines } }, false, false),
    "\n\n\n  1 Federation base in specified range\n  1 known Empire base in specified range\n");
});

test("detail and summary merge independently without duplicate objects", () => {
  const result = selectReport(world(), "EXCALIBUR", [
    bases({ detail: true, summary: false }), bases(), bases() ]);
  assert.equal(result.selected.length, 3);
  assert.deepEqual(result.selected.map(o => [o.detail, o.summary]),
    [[true, true], [true, true], [false, true]]);
});

test("excluded distant candidate contributes known qualifier to a nearby count", () => {
  const galaxy = world();
  galaxy.bases[1].position.vertical = 21;
  galaxy.bases[2].position.vertical = 60;
  const result = selectReport(galaxy, "EXCALIBUR", [bases({ sides: ["EMPIRE"], radius: 20, explicitRadius: true })]);
  assert.equal(result.selected.length, 1);
  assert.equal(result.selected[0].outOfSensorRange, false);
  assert.equal(reportSummary(1, "Empire base", result.categoryQualifiers["Empire base"], false),
    "  1 known Empire base in specified range\n");
});

test("empty aggregate group does not stop later selection or discard earlier selections", () => {
  const result = selectReport(world(), "EXCALIBUR", [bases(),
    bases({ radius: 1, explicitRadius: true }),
    bases({ kinds: ["PLANET"], sides: ["NEUTRAL"] }) ]);
  assert.deepEqual(result.emptyGroups, [1]);
  assert.equal(result.selected.filter(o => o.kind === "BASE").length, 3);
  assert.equal(result.selected.filter(o => o.kind === "PLANET").length, 1);
  // The caller emits the empty-group diagnostic, then continues with later groups.
});

test("nearby and friendly planets qualify without prior knowledge; selection alone does not discover", () => {
  const galaxy = world();
  const near = selectReport(galaxy, "EXCALIBUR", [bases({ kinds: ["PLANET"], sides: ["NEUTRAL"],
    radius: 10, detail: true, summary: false })]);
  assert.equal(near.selected.length, 1);
  assert.equal(galaxy.planets[0].knownTo.size, 0);
  galaxy.planets[0].position.vertical = 60;
  assert.equal(selectReport(galaxy, "EXCALIBUR", [bases({ kinds: ["PLANET"], sides: ["NEUTRAL"],
    detail: true, summary: false })]).selected.length, 0);
  galaxy.planets[0].allegiance = "FEDERATION";
  assert.equal(selectReport(galaxy, "EXCALIBUR", [bases({ kinds: ["PLANET"], sides: ["FEDERATION"],
    detail: true, summary: false })]).selected.length, 1);
});

test("PLANETS tokens select, emit and discover a neutral planet without changing other state", () => {
  const galaxy = world(), before = structuredClone(galaxy);
  galaxy.planets[0].construction = before.planets[0].construction = 2;
  const parsed = parseAggregateGroups("PLANETS", "FEDERATION", []);
  assert.equal(parsed.error, null);
  const selected = selectReport(galaxy, "EXCALIBUR", parsed.groups);
  const rows = selected.selected.map(object => aggregateDetail(galaxy, "EXCALIBUR", object,
    { outputLength: "LONG", coordinateOutput: "ABSOLUTE" }));
  assert.equal(reportOutput([], { planets: { detailRows: rows, summaryLines: [] } }, false, false),
    "\n\n Neu planet  @22-20     2 builds\n\n");
  before.planets[0].knownTo.add("FEDERATION");
  assert.deepEqual(galaxy, before);
});

test("BASES ALL LIST emits known enemy position without strength and discovers emitted friendly base", () => {
  const galaxy = world();
  const parsed = parseAggregateGroups("BASES", "FEDERATION", ["ALL", "LIST"]);
  assert.equal(parsed.error, null);
  const selected = selectReport(galaxy, "EXCALIBUR", parsed.groups);
  const rows = selected.selected.map(object => aggregateDetail(galaxy, "EXCALIBUR", object,
    { outputLength: "LONG", coordinateOutput: "ABSOLUTE" }));
  assert.equal(reportOutput([], { bases: { detailRows: rows, summaryLines: [] } }, false, false),
    "\n\n Fed Base    @40-40   100.0%\n*Emp Base    @35-20\n\n");
  assert.equal(galaxy.bases[0].knownTo.has("FEDERATION"), true);
  assert.equal(galaxy.bases[2].knownTo.has("FEDERATION"), false);
});

test("named report uses roster order, reports absence and does not locate distant enemy", () => {
  const galaxy = world();
  const absent = structuredClone(galaxy.ships[0]);
  absent.name = "FARRAGUT"; absent.lifecycle = { phase: "AVAILABLE" }; absent.position = null;
  const enemy = structuredClone(galaxy.ships[0]);
  enemy.name = "WOLF"; enemy.position = { vertical: 60, horizontal: 60 };
  galaxy.ships.push(absent, enemy);
  const before = structuredClone(galaxy);
  assert.equal(namedReport(galaxy, "EXCALIBUR", ["WOLF", "FARRAGUT"],
    { outputLength: "LONG", coordinateOutput: "ABSOLUTE" }),
    "\n\nFarragut is not in the game\n*Wolf        out of range\n");
  assert.equal(namedReport(galaxy, "EXCALIBUR", ["FARRAGUT", "ROMULAN"],
    { outputLength: "SHORT", coordinateOutput: "ABSOLUTE" }),
    "\n\nRomulans are NOT in this game.\nF is not in the game\n");
  assert.deepEqual(galaxy, before);
});

test("direct planet output does not discover; empty query uses long coordinates even in short output", () => {
  const galaxy = world(), before = structuredClone(galaxy);
  assert.equal(coordinateReport(galaxy, "EXCALIBUR", "PLANETS", { vertical: 22, horizontal: 20 },
    { outputLength: "LONG", coordinateOutput: "ABSOLUTE" }), "\n Neu planet  @22-20\n");
  assert.equal(coordinateReport(galaxy, "EXCALIBUR", "PLANETS", { vertical: 20, horizontal: 21 },
    { outputLength: "SHORT", coordinateOutput: "ABSOLUTE" }), "\nNo planet @20-21\n");
  assert.deepEqual(galaxy, before);
});

test("coordinate queries retain command radius and historical kind exceptions", () => {
  const galaxy = world();
  const prefs = { outputLength: "LONG", coordinateOutput: "ABSOLUTE" } as const;
  assert.equal(coordinateReport(galaxy, "EXCALIBUR", "BASES", { vertical: 20, horizontal: 20 }, prefs),
    "\n Excalibur   @20-20  +100.0%\n");
  galaxy.planets[0].position.vertical = 35;
  galaxy.planets[0].position.horizontal = 21;
  galaxy.planets[0].knownTo.add("FEDERATION");
  assert.equal(coordinateReport(galaxy, "EXCALIBUR", "PLANETS", galaxy.planets[0].position, prefs),
    "\nCaptain, our sensors can't scan as far as 35-21\n");
  assert.equal(coordinateReport(galaxy, "EXCALIBUR", "LIST", galaxy.planets[0].position, prefs),
    "\n Neu planet  @35-21\n");
  assert.equal(coordinateReport(galaxy, "EXCALIBUR", "BASES", galaxy.planets[0].position, prefs),
    "\nNo base @35-21\n");
});

test("CLOSEST excludes unknown distant ports, respects radius and exposes ties without choosing", () => {
  const galaxy = world();
  assert.deepEqual(closestSelection(galaxy, "EXCALIBUR", bases()).map(o => o.index), [1]);
  assert.equal(closestSelection(galaxy, "EXCALIBUR", bases({ radius: 10, explicitRadius: true })).length, 0);
  galaxy.bases[0].position = { vertical: 35, horizontal: 21 };
  assert.equal(closestSelection(galaxy, "EXCALIBUR", bases()).length, 2);
  assert.equal(closestSelection(galaxy, "EXCALIBUR", bases({ kinds: ["SHIP"] })).length, 0);
});

test("mixed report emits direct groups before deferred aggregate output and discovery", () => {
  const galaxy = world(), before = structuredClone(galaxy);
  const result = galaxyReport(galaxy, "EXCALIBUR", "LIST", ["BASES", "FRIENDLY", "AND", "22", "20"],
    { outputLength: "LONG", coordinateOutput: "ABSOLUTE" });
  assert.equal(result.aborted, false);
  assert.equal(result.output, "\n Neu planet  @22-20\n\n Fed Base    @40-40   100.0%\n\n");
  assert.equal(result.galaxy.bases[0].knownTo.has("FEDERATION"), true);
  assert.equal(result.galaxy.planets[0].knownTo.has("FEDERATION"), false);
  assert.deepEqual(galaxy, before);
});

test("later syntax failure retains direct output but suppresses aggregate output and discovery", () => {
  const galaxy = world();
  const result = galaxyReport(galaxy, "EXCALIBUR", "LIST", ["22", "20", "AND", "BASES", "FRIENDLY", "AND", "ZZZ"],
    { outputLength: "LONG", coordinateOutput: "ABSOLUTE" });
  assert.equal(result.aborted, true);
  assert.equal(result.output, "\n Neu planet  @22-20\nIllegal keyword ZZZ\n");
  assert.deepEqual(result.galaxy, galaxy);
});

test("empty selection emits its diagnostic but later groups still produce reports", () => {
  const result = galaxyReport(world(), "EXCALIBUR", "BASES", ["10", "AND", "LIST"],
    { outputLength: "LONG", coordinateOutput: "ABSOLUTE" });
  assert.equal(result.aborted, false);
  assert.equal(result.output, "\nCaptain, there are no Federation bases in specified range\n\n Fed Base    @40-40   100.0%\n\n");
});

test("overlapping aggregate groups produce one row, one count and merged scope", () => {
  const result = galaxyReport(world(), "EXCALIBUR", "LIST", ["BASES", "FRIENDLY", "AND", "BASES", "FRIENDLY", "SUMMARY"],
    { outputLength: "LONG", coordinateOutput: "ABSOLUTE" });
  assert.equal(result.aborted, false);
  assert.equal(result.output, "\n\n Fed Base    @40-40   100.0%\n\n  1 Federation base in game\n");
});

test("CLOSEST is parsed and emitted directly before deferred aggregate rows", () => {
  const galaxy = world();
  const result = galaxyReport(galaxy, "EXCALIBUR", "LIST", ["BASES", "FRIENDLY", "AND", "PLANETS", "CLOSEST"],
    { outputLength: "LONG", coordinateOutput: "ABSOLUTE" });
  assert.equal(result.aborted, false);
  assert.equal(result.output, "\n Neu planet  @22-20\n\n Fed Base    @40-40   100.0%\n\n");
  assert.equal(result.galaxy.planets[0].knownTo.size, 0);
  assert.equal(result.galaxy.bases[0].knownTo.has("FEDERATION"), true);
});

test("CLOSEST excludes self even when the result is empty; explicit output conflicts abort", () => {
  const galaxy = world();
  const result = galaxyReport(galaxy, "EXCALIBUR", "LIST", ["SHIPS", "FRIENDLY", "CLOSEST"],
    { outputLength: "LONG", coordinateOutput: "ABSOLUTE" });
  assert.equal(result.output, "\nCaptain, there are no Federation ships in game\n");
  for (const tokens of [["CLOSEST", "SUMMARY"], ["SUMMARY", "CLOSEST"]]) {
    const invalid = galaxyReport(galaxy, "EXCALIBUR", "BASES", tokens,
      { outputLength: "SHORT", coordinateOutput: "ABSOLUTE" });
    assert.equal(invalid.aborted, true);
    assert.equal(invalid.output, "\nSyntax error near keyword " + tokens[1] + "\n");
  }
  galaxy.bases[0].position = { vertical: 35, horizontal: 21 };
  assert.throws(() => galaxyReport(galaxy, "EXCALIBUR", "BASES", ["ALL", "CLOSEST"],
    { outputLength: "LONG", coordinateOutput: "ABSOLUTE" }), /C-004/);
});

test("named and coordinate Romulan reports show energy with the historical percent suffix", () => {
  const galaxy = world();
  galaxy.romulan = { enabled: true, vessel: { position: { vertical: 21, horizontal: 20 }, energy: 30.5 },
    elapsedTriggers: 0, statistics: { score: { ...galaxy.teams.FEDERATION.score }, appearances: 1, activityCount: 1 } };
  assert.equal(galaxyReport(galaxy, "EXCALIBUR", "LIST", ["ROMULAN"],
    { outputLength: "LONG", coordinateOutput: "ABSOLUTE" }).output,
    "\n\n*Romulan     @21-20    30.5%\n");
  assert.equal(galaxyReport(galaxy, "EXCALIBUR", "TARGETS", ["21", "20"],
    { outputLength: "SHORT", coordinateOutput: "ABSOLUTE" }).output,
    "\n ?? 21-20    30\n");
  galaxy.romulan.vessel!.position.vertical = 40;
  assert.equal(galaxyReport(galaxy, "EXCALIBUR", "LIST", ["ROMULAN"],
    { outputLength: "LONG", coordinateOutput: "ABSOLUTE" }).output,
    "\n\n*Romulan     out of range\n");
});

test("TARGETS SUMMARY counts opposing categories and Romulan once, retaining separate Romulan line", () => {
  const galaxy = world();
  const enemy = structuredClone(galaxy.ships[0]);
  enemy.name = "WOLF"; enemy.position = { vertical: 21, horizontal: 21 };
  galaxy.ships.push(enemy);
  galaxy.romulan = { enabled: true, vessel: { position: { vertical: 21, horizontal: 20 }, energy: 30.5 },
    elapsedTriggers: 0, statistics: { score: { ...galaxy.teams.FEDERATION.score }, appearances: 1, activityCount: 1 } };
  const before = structuredClone(galaxy);
  const result = galaxyReport(galaxy, "EXCALIBUR", "TARGETS", ["SUMMARY"],
    { outputLength: "LONG", coordinateOutput: "ABSOLUTE" });
  assert.equal(result.aborted, false);
  assert.equal(result.output, "\n\n  1 Romulan in game\n\n\n\n  4 targets in game\n");
  assert.deepEqual(result.galaxy, before);
  assert.throws(() => galaxyReport(galaxy, "EXCALIBUR", "SUMMARY", ["SHIPS", "AND", "SHIPS"],
    { outputLength: "LONG", coordinateOutput: "ABSOLUTE" }), /C-010/);
});
