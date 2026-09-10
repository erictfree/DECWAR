import assert from "node:assert/strict";
import test from "node:test";
import type { Galaxy, Score, Ship } from "../src/model.ts";
import { finalPoints } from "../src/final-points.ts";
import { pointsCommand } from "../src/points-command.ts";

const zero: Score = { ENEMY_DAMAGE: 0, ENEMY_KILLS: 0, BASE_DAMAGE: 0,
  PLANET_CAPTURE: 0, BASE_CONSTRUCTION: 0, ROMULAN: 0, STAR_DESTRUCTION: 0, PLANET_DESTRUCTION: 0 };
function state(): Pick<Galaxy, "ships" | "teams" | "romulan"> {
  const ship: Ship = { name: "EXCALIBUR", lifecycle: { phase: "COMMISSIONED", captain: "Player" },
    position: { vertical: 20, horizontal: 20 }, energy: 2000, hullDamage: 0,
    deviceDamage: { SHIELDS: 0, WARP_ENGINES: 0, IMPULSE_ENGINES: 0, LIFE_SUPPORT: 0,
      TORPEDO_TUBES: 0, PHASERS: 0, COMPUTER: 0, RADIO: 0, TRACTOR_BEAM: 0 },
    shields: { mode: "DOWN", strength: 100 }, torpedoes: 10, lifeSupportReserve: 5,
    condition: "RED", docked: false, tractorLink: null,
    radio: { enabled: true, gaggedShips: new Set() }, stardate: 2,
    score: { ...zero, PLANET_CAPTURE: 100 }, pendingScore: { ...zero, PLANET_CAPTURE: 50 } };
  return { ships: [ship], teams: {
    FEDERATION: { score: { ...zero, PLANET_CAPTURE: 200 }, admissions: 2, completedTurns: 4 },
    EMPIRE: { score: { ...zero, PLANET_CAPTURE: 300 }, admissions: 3, completedTurns: 6 } },
    romulan: { enabled: false } };
}

test("final POINTS selects both factions, reads committed scores and leaves the commission intact", () => {
  const galaxy = state(), before = structuredClone(galaxy);
  const output = finalPoints(galaxy, "EXCALIBUR", "SHORT");
  assert.equal(output, "\n" + " ".repeat(14) + "Excalibur Federation     Empire \n"
    + "@'s capt " + "        100        200        300\n"
    + "\nTot Pts  " + "        100        200        300\n"
    + "\n# of shps" + " ".repeat(21) + "2          3"
    + "\nPts / Pl " + " ".repeat(19) + "100        100"
    + "\nPts / SD " + "         50         50         50\n");
  assert.deepEqual(galaxy, before);
});

test("ordinary POINTS defaults and ALL select the proper subjects",()=>{
  const galaxy=state(), before=structuredClone(galaxy);
  const personal=pointsCommand(galaxy,"EXCALIBUR",[],"SHORT");
  assert.match(personal,/Excalibur/); assert.doesNotMatch(personal,/Federation|Empire/);
  const pregame=pointsCommand(galaxy,null,[],"SHORT");
  assert.match(pregame,/Federation.*Empire/); assert.doesNotMatch(pregame,/Excalibur/);
  assert.equal(pointsCommand(galaxy,"EXCALIBUR",["ALL"],"SHORT"),finalPoints(galaxy,"EXCALIBUR","SHORT"));
  assert.deepEqual(galaxy,before);
});

test("POINTS combines aliases as a set and emits canonical column order",()=>{
  const galaxy=state();
  assert.equal(pointsCommand(galaxy,"EXCALIBUR",["K","H","ME","F","I"],"SHORT"),
    pointsCommand(galaxy,"EXCALIBUR",["ALL"],"SHORT"));
});

test("POINTS unknown words abort the entire report, but observed non-word input stops selection",()=>{
  const galaxy=state(), aborted="\nIncorrect input, POINTS aborted.\n";
  assert.equal(pointsCommand(galaxy,"EXCALIBUR",["F","ZZZ"],"SHORT"),aborted);
  assert.equal(pointsCommand(galaxy,"EXCALIBUR",["F",1,"E"],"SHORT"),
    pointsCommand(galaxy,"EXCALIBUR",["F"],"SHORT"));
  assert.equal(pointsCommand(galaxy,"EXCALIBUR",[1,"F"],"SHORT"),aborted);
  assert.equal(pointsCommand(galaxy,null,["ME"],"SHORT"),aborted);
});

test("disabled-only Romulan selection aborts, while enabled absent statistics remain reportable",()=>{
  const galaxy=state();
  assert.equal(pointsCommand(galaxy,"EXCALIBUR",["R"],"SHORT"),"\nIncorrect input, POINTS aborted.\n");
  galaxy.romulan={enabled:true,vessel:null,elapsedTriggers:0,statistics:{score:{...zero},activityCount:1,appearances:1}};
  assert.match(pointsCommand(galaxy,"EXCALIBUR",["R"],"SHORT"),/Romulans/);
});

test("enabled Romulan statistics appear even without a present Romulan", () => {
  const galaxy = state();
  galaxy.romulan = { enabled: true, vessel: null, elapsedTriggers: 0,
    statistics: { score: { ...zero, ENEMY_DAMAGE: 400 }, appearances: 2, activityCount: 4 } };
  assert.match(finalPoints(galaxy, "EXCALIBUR", "SHORT"), /Empire   Romulans\n/);
  galaxy.ships[0].lifecycle = { phase: "DESTROYED", captain: "Player" };
  assert.match(finalPoints(galaxy, "EXCALIBUR", "LONG"), /Romulans/);
  galaxy.romulan.statistics.appearances = 0;
  assert.throws(() => finalPoints(galaxy, "EXCALIBUR", "SHORT"), /C-013/);
});
