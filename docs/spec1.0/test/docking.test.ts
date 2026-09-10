import assert from "node:assert/strict";
import test from "node:test";
import type { Base, Planet, Ship, Score } from "../src/model.ts";
import { dockShip } from "../src/docking.ts";
import { automaticRepair, lifeSupportCheck, commitScore, worldActivityTrigger } from "../src/completion.ts";
import { statusReport } from "../src/ship-reports.ts";
import { phaserIncident, criticalHit, shipDamage } from "../src/shield-combat.ts";

const score: Score = { ENEMY_DAMAGE: 0, ENEMY_KILLS: 0, BASE_DAMAGE: 0,
  PLANET_CAPTURE: 0, BASE_CONSTRUCTION: 0, ROMULAN: 0, STAR_DESTRUCTION: 0, PLANET_DESTRUCTION: 0 };
const ship = (): Ship => ({ name: "EXCALIBUR", lifecycle: { phase: "COMMISSIONED", captain: "Player" },
  position: { vertical: 20, horizontal: 20 }, energy: 4000, hullDamage: 400,
  deviceDamage: { SHIELDS: 0, WARP_ENGINES: 0, IMPULSE_ENGINES: 0, LIFE_SUPPORT: 400,
    TORPEDO_TUBES: 0, PHASERS: 0, COMPUTER: 0, RADIO: 310, TRACTOR_BEAM: 0 },
  shields: { mode: "DOWN", strength: 85 }, torpedoes: 1, lifeSupportReserve: 0,
  condition: "RED", docked: false, tractorLink: "FARRAGUT",
  radio: { enabled: true, gaggedShips: new Set(["WOLF"]) }, stardate: 10,
  score: { ...score }, pendingScore: { ...score } });
const base: Base = { position: { vertical: 21, horizontal: 21 }, team: "FEDERATION", strength: 1, knownTo: new Set() };
const planet: Planet = { position: { vertical: 20, horizontal: 21 }, allegiance: "FEDERATION", construction: 0, knownTo: new Set() };

test("DOCK adds all friendly service and preserves unrelated state", () => {
  const prior = ship(), before = structuredClone(prior);
  const result = dockShip(prior, [base], [planet], "LONG");
  assert.equal(result.units, 3);
  assert.equal(result.output, "\nDOCKED.\n");
  assert.equal(result.completesTurn, true);
  assert.deepEqual(result.ship, { ...before, torpedoes: 10, energy: 5000, hullDamage: 250,
    shields: { mode: "DOWN", strength: 100 }, docked: true, lifeSupportReserve: 5, condition: "GREEN" });
  assert.deepEqual(prior, before);
  assert.equal(base.strength, 1);
  assert.equal(planet.construction, 0);
  assert.equal(base.knownTo.size, 0);
});

test("repeated DOCK doubles only hull service and caps resources", () => {
  const prior = ship(); prior.docked = true;
  const result = dockShip(prior, [base], [planet], "SHORT");
  assert.equal(result.ship.hullDamage, 100);
  assert.equal(result.ship.energy, 5000);
  assert.equal(result.ship.torpedoes, 10);
  assert.equal(result.ship.lifeSupportReserve, 5);
});

test("no friendly adjacent port rejects without STATUS or mutation", () => {
  const prior = ship();
  const result = dockShip(prior, [{ ...base, team: "EMPIRE" }],
    [{ ...planet, allegiance: "NEUTRAL" }], "SHORT", ["ENERGY"]);
  assert.equal(result.output, "\nE not adjacent to base!!\n");
  assert.equal(result.completesTurn, false);
  assert.deepEqual(result.ship, prior);
});

test("DOCK STATUS sees replenishment before automatic device repair", () => {
  const result = dockShip(ship(), [], [planet], "SHORT", ["ENERGY", "RADIO"]);
  assert.equal(result.output, "\nDOCKED.\n\nE4500 Rdamaged \n");
  assert.equal(result.ship.deviceDamage.RADIO, 310);
  assert.equal(result.ship.stardate, 10);
  const repaired = automaticRepair(result.ship.deviceDamage);
  assert.equal(repaired.RADIO, 280);
  assert.equal(repaired.LIFE_SUPPORT, 370);
});

test("docking below the world-cycle threshold preserves the earlier STATUS snapshot", () => {
  const prior = ship();
  prior.tractorLink = null;
  prior.pendingScore.PLANET_CAPTURE = 50;
  const faction = { score: { ...score, PLANET_CAPTURE: 100 }, completedTurns: 20, admissions: 2 };
  const result = dockShip(prior, [], [planet], "SHORT", ["CONDITION", "ENERGY", "DAMAGE", "RADIO"]);
  const immediate = result.output;
  assert.equal(immediate, "\nDOCKED.\n\nD+G E4500 D350 Rdamaged \n");
  assert.equal(result.ship.stardate, 10);
  assert.equal(result.ship.score.PLANET_CAPTURE, 0);
  result.ship.deviceDamage = automaticRepair(result.ship.deviceDamage);
  // Two unreleased commissioned ships, Excalibur and Wolf; progress starts at 0.
  // No independently triggered event interleaves this sequential scenario.
  const trigger = worldActivityTrigger(0, 2);
  assert.deepEqual(trigger, { progress: 1, due: false });
  result.ship.stardate++;
  faction.completedTurns++;
  const support = lifeSupportCheck(result.ship.deviceDamage.LIFE_SUPPORT,
    result.ship.docked, result.ship.lifeSupportReserve, result.ship.hullDamage);
  result.ship.lifeSupportReserve = support.reserve;
  result.ship.hullDamage = support.hullDamage;
  commitScore(result.ship.score, faction.score, result.ship.pendingScore);
  assert.equal(result.ship.stardate, 11);
  assert.equal(faction.completedTurns, 21);
  assert.equal(result.ship.deviceDamage.LIFE_SUPPORT, 370);
  assert.equal(result.ship.lifeSupportReserve, 5);
  assert.equal(result.ship.hullDamage, 350);
  assert.equal(result.ship.score.PLANET_CAPTURE, 50);
  assert.equal(faction.score.PLANET_CAPTURE, 150);
  assert.equal(result.ship.pendingScore.PLANET_CAPTURE, 0);
  assert.equal(statusReport(result.ship, "SHORT", ["CONDITION", "ENERGY", "DAMAGE", "RADIO"]),
    "\nD+G E4500 D350 ROn \n");
  assert.equal(result.output, immediate);
  assert.equal(prior.deviceDamage.RADIO, 310);
});

test("due-cycle docking trace preserves pre-attack STATUS while the base damages the serviced ship", () => {
  const prior = ship();
  prior.tractorLink = null;
  const enemy: Base = { position: { vertical: 19, horizontal: 20 }, team: "EMPIRE", strength: 50, knownTo: new Set() };
  const result = dockShip(prior, [enemy], [planet], "SHORT", ["CONDITION", "ENERGY", "DAMAGE", "RADIO"]);
  assert.equal(result.output, "\nDOCKED.\n\nD+G E4500 D350 Rdamaged \n");
  result.ship.deviceDamage = automaticRepair(result.ship.deviceDamage);
  assert.deepEqual(worldActivityTrigger(1, 2), { progress: 0, due: true });
  // Fixture-selected base attack, not a general autonomous-world dispatcher.
  const damage = phaserIncident(Math.trunc(200 / 2), 1, 0, false, false);
  assert.equal(damage, 720);
  const critical = criticalHit(damage, 0);
  assert.equal(critical, false);
  const hit = shipDamage(damage, critical, 0);
  result.ship.hullDamage += hit.hullLoss;
  result.ship.energy -= hit.hullLoss;
  result.ship.condition = "RED";
  const empireScore = { ...score, ENEMY_DAMAGE: hit.hullLoss };
  enemy.strength = Math.min(100, enemy.strength + Math.trunc(25 / 1) / 10);
  result.ship.stardate++;
  const support = lifeSupportCheck(result.ship.deviceDamage.LIFE_SUPPORT,
    result.ship.docked, result.ship.lifeSupportReserve, result.ship.hullDamage);
  assert.equal(support.reserve, 5);
  assert.equal(enemy.strength, 52.5);
  assert.equal(empireScore.ENEMY_DAMAGE, 720);
  assert.equal(result.ship.stardate, 11);
  assert.equal(result.ship.docked, true);
  assert.deepEqual(result.ship.shields, { mode: "DOWN", strength: 95 });
  assert.equal(statusReport(result.ship, "SHORT", ["CONDITION", "ENERGY", "DAMAGE", "RADIO"]),
    "\nD+R E3780 D1070 ROn \n");
});
