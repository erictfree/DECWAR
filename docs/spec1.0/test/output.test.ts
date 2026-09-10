import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { decimalField, integerField, positionField } from "../src/output.ts";
import { statusReport, damagesReport } from "../src/ship-reports.ts";
import type { ShipName } from "../src/model.ts";

test("integer and decimal fields count sign but not fractional suffix in width", () => {
  assert.equal(integerField(7, 3), "  7");
  assert.equal(integerField(7, 3, true), " +7");
  assert.equal(integerField(0, 3, true), "  0");
  assert.equal(decimalField(12.5, 6, false), "    12.5");
  assert.equal(decimalField(12.5, 6, true), "    12");
  assert.equal(decimalField(-12.5, 6, true), "   -12");
});

test("signed decimals preserve fractional signs and negative zero convention", () => {
  assert.equal(decimalField(0.5, 0, true, true), "+0");
  assert.equal(decimalField(-0.5, 0, true, true), "-0");
  assert.equal(decimalField(0, 0, false, true), "-0.0");
});

test("positions honor output modes, signs, and own-position suppression", () => {
  const origin = { vertical: 20, horizontal: 20 };
  const target = { vertical: 22, horizontal: 17 };
  assert.equal(positionField(target, origin, "BOTH", false), "@22-17 +2,-3");
  assert.equal(positionField(target, origin, "RELATIVE", true), "+2,-3");
  assert.equal(positionField(origin, origin, "RELATIVE", false), "");
  assert.equal(positionField(origin, origin, "BOTH", false), "@20-20");
  assert.equal(positionField(origin, origin, "RELATIVE", false, 2), "  0,  0");
});

test("documented Excalibur rows match field composition", () => {
  const chapter = readFileSync(new URL("../10-output-language.md", import.meta.url), "utf8");
  const p = { vertical: 20, horizontal: 20 };
  for (const format of ["LONG", "MEDIUM", "SHORT"]) {
    const short = format === "SHORT";
    const prefix = (format === "LONG" ? " Excalibur" : " E")
      .padEnd(format === "LONG" ? 13 : 4);
    const row = prefix + positionField(p, p, "ABSOLUTE", short, 2)
      + decimalField(75, 6, short, true) + (short ? "" : "%");
    assert.ok(chapter.includes("\n" + row + "\n"), JSON.stringify(row));
  }
});

test("undefined precision is not silently formatted", () => {
  assert.throws(() => decimalField(1.25, 6, false), RangeError);
});

test("overflow preserves the sign and replaces only integer digits with stars", () => {
  assert.equal(integerField(100, 2), "**");
  assert.equal(integerField(-100, 2), "-*");
  assert.equal(integerField(100, 2, true), "+*");
  assert.equal(integerField(-100, 1), "-");
  assert.equal(integerField(0, 1, true), "0");
  assert.equal(integerField(100, 0), "100");
  assert.equal(decimalField(100.2, 2, false), "**.2");
  assert.equal(decimalField(-100.2, 2, false, true), "-*.2");
  assert.equal(decimalField(-100.2, 2, true, true), "-*");
  assert.equal(decimalField(0, 1, false, true), "-.0");
  assert.equal(decimalField(0.5, 1, false, true), "+.5");
  assert.equal(decimalField(100.2, 0, false), "100.2");
});

test("STATUS and DAMAGES use overflow fields without changing game quantities", () => {
  const ship = { stardate: 10000, condition: "GREEN" as const, docked: false,
    position: { vertical: 20, horizontal: 20 }, torpedoes: 10, energy: 5000,
    hullDamage: 0, shields: { mode: "UP" as const, strength: 100 },
    radio: { enabled: true, gaggedShips: new Set<ShipName>() },
    deviceDamage: { SHIELDS: 0, WARP_ENGINES: 0, IMPULSE_ENGINES: 0, LIFE_SUPPORT: 0,
      TORPEDO_TUBES: 0, PHASERS: 0, COMPUTER: 0, RADIO: 10000.5, TRACTOR_BEAM: 0 } };
  const before = structuredClone(ship);
  assert.ok(statusReport(ship, "MEDIUM").startsWith("\nSDate  ****\n"));
  assert.ok(statusReport(ship, "SHORT").startsWith("\nSD10000 "));
  assert.equal(damagesReport("EXCALIBUR", ship.deviceDamage, "LONG", ["RA"]),
    "\n" + "Radio".padEnd(18) + "****.5 units\n");
  assert.equal(damagesReport("EXCALIBUR", ship.deviceDamage, "SHORT", ["RA"]), "\nRA  ****\n");
  assert.deepEqual(ship, before);
});
