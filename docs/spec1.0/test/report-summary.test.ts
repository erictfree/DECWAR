import assert from "node:assert/strict";
import test from "node:test";
import { reportSummary } from "../src/report-summary.ts";

test("summary count, plural, known marker and scope precedence", () => {
  const mixed = { known: true, inGame: true, specifiedRange: true };
  assert.equal(reportSummary(2, "Federation base", mixed, false),
    "  2 known Federation bases in game\n");
  assert.equal(reportSummary(1, "Romulan", mixed, true), "  1 known Romulan\n");
  assert.equal(reportSummary(0, "target", mixed, false), "");
  assert.equal(reportSummary(1, "target", { ...mixed, known: false, inGame: false }, false),
    "  1 target in specified range\n");
  assert.equal(reportSummary(3, "neutral planet",
    { known: false, inGame: false, specifiedRange: false }, false),
    "  3 neutral planets in range\n");
});
