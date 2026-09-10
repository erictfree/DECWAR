import assert from "node:assert/strict";
import test from "node:test";
import type { DeviceDamage, ShipName } from "../src/model.ts";
import { repairShip, repairFromTokens } from "../src/repair.ts";
import { automaticRepair } from "../src/completion.ts";

const damage: DeviceDamage = { SHIELDS: 80, WARP_ENGINES: 20, IMPULSE_ENGINES: 0,
  LIFE_SUPPORT: 340, TORPEDO_TUBES: 0, PHASERS: 0, COMPUTER: 0, RADIO: 0, TRACTOR_BEAM: 0 };
const ship = () => ({ name: "EXCALIBUR" as ShipName, docked: false,
  deviceDamage: { ...damage }, hullDamage: 500, energy: 2000,
  shields: { mode: "DOWN", strength: 40 }, lifeSupportReserve: 0, stardate: 9 });

test("REPAIR numeric amount and appended report compose without selective repair",()=>{
  const result=repairFromTokens(ship(),[10,"DA","SH"],"SHORT");
  assert.equal(result.amount,10);
  assert.equal(result.output,"\nSH    70\n");
  assert.equal(result.ship.deviceDamage.WARP_ENGINES,10);
});

test("REPAIR observed unmatched initial input still applies default repair",()=>{
  for (const operands of [["ZZZ"],["10.0"],["SH"]]) {
    const result=repairFromTokens(ship(),operands,"SHORT");
    assert.equal(result.amount,50); assert.equal(result.output,"");
    assert.equal(result.ship.deviceDamage.LIFE_SUPPORT,290);
  }
});

test("REPAIR appended report uses DAMAGES recovery after immediate state changes",()=>{
  const result=repairFromTokens(ship(),[10,"DAMAGE","ZZZ","SH",1,"LS"],"SHORT");
  assert.equal(result.output,"\nSH    70\n");
  assert.equal(result.ship.deviceDamage.LIFE_SUPPORT,330);
  assert.throws(()=>repairFromTokens(ship(),[-1],"SHORT"),/negative REPAIR/);
});

test("REPAIR defaults depend on docking and change only device damage", () => {
  for (const docked of [false, true]) {
    const prior = { ...ship(), docked }, before = structuredClone(prior);
    const result = repairShip(prior, "DEFAULT", "SHORT");
    const amount = docked ? 100 : 50;
    assert.equal(result.amount, amount);
    assert.equal(result.output, "");
    assert.deepEqual(result.ship, { ...before, deviceDamage: { ...damage,
      SHIELDS: Math.max(80 - amount, 0), WARP_ENGINES: 0, LIFE_SUPPORT: 340 - amount } });
    assert.deepEqual(prior, before);
  }
});

test("REPAIR selectors report after repairing every device, before automatic repair", () => {
  const result = repairShip(ship(), 10, "SHORT", ["SH"]);
  assert.equal(result.output, "\nSH    70\n");
  assert.equal(result.ship.deviceDamage.WARP_ENGINES, 10);
  assert.equal(result.ship.deviceDamage.LIFE_SUPPORT, 330);
  assert.equal(result.ship.stardate, 9);
  assert.equal(automaticRepair(result.ship.deviceDamage).SHIELDS, 40);
});

test("REPAIR ALL and excess requests cap at maximum damage and report functional devices", () => {
  for (const request of ["ALL", 1000] as const) {
    const result = repairShip(ship(), request, "LONG", ["SH"]);
    assert.equal(result.amount, 340);
    assert.ok(Object.values(result.ship.deviceDamage).every(value => value === 0));
    assert.equal(result.output, "\nAll devices functional.\n");
  }
});

test("REPAIR zero preserves damage; undamaged numeric repair still reports", () => {
  const prior = ship();
  assert.deepEqual(repairShip(prior, 0, "SHORT").ship, prior);
  const clean = repairShip(prior, "ALL", "SHORT").ship;
  assert.equal(repairShip(clean, 0, "SHORT", []).output, "\nAll devices functional.\n");
  assert.equal(repairShip(clean, "DEFAULT", "SHORT", []).amount, 0);
  assert.throws(() => repairShip(clean, "ALL", "SHORT", []), /C-010/);
  assert.throws(() => repairShip(prior, -1, "SHORT"), /unresolved/);
});
