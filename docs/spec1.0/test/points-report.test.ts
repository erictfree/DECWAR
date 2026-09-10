import assert from "node:assert/strict";
import test from "node:test";
import { pointsReport, type PointsSubject } from "../src/points-report.ts";

const personal: PointsSubject = { subject: "PERSONAL", name: "EXCALIBUR", score: { PLANET_CAPTURE: 100 }, turns: 3 };
test("whole personal short POINTS transcript omits group statistics", () => {
  assert.equal(pointsReport([personal], "SHORT"),
    "\n" + " ".repeat(14) + "Excalibur \n"
    + "@'s capt " + " ".repeat(8) + "100\n"
    + "\nTot Pts  " + " ".repeat(8) + "100\n"
    + "\nPts / SD " + " ".repeat(9) + "33\n");
});

test("whole medium faction transcript uses fixed order and counts", () => {
  const subjects: PointsSubject[] = [
    { subject: "EMPIRE", score: {}, turns: 1, admissions: 1 },
    { subject: "FEDERATION", score: { ENEMY_DAMAGE: 100 }, turns: 2, admissions: 2 },
  ];
  assert.equal(pointsReport(subjects, "MEDIUM"),
    "\n" + " ".repeat(23) + "Federation       Empire   \n"
    + "Damage to enemies " + " ".repeat(8) + "100.0" + " ".repeat(10) + "0.0\n"
    + "\nTotal points:     " + " ".repeat(8) + "100.0" + " ".repeat(10) + "0.0\n"
    + "\nNumber of ships:" + " ".repeat(12) + "2" + " ".repeat(12) + "1"
    + "\nPts. / player:    " + " ".repeat(9) + "50.0" + " ".repeat(10) + "0.0"
    + "\nPts. / stardate:  " + " ".repeat(9) + "50.0" + " ".repeat(10) + "0.0\n");
});

test("POINTS formatter refuses the unresolved zero-denominator case", () => {
  assert.throws(() => pointsReport([{ ...personal, turns: 0 }], "LONG"), /C-013/);
});
