import assert from "node:assert/strict";
import test from "node:test";
import { reportOutput } from "../src/report-assembly.ts";
import { reportSummary } from "../src/report-summary.ts";

const wholeGame = { known: false, inGame: true, specifiedRange: false };

test("SUMMARY retains section separators with no detail rows", () => {
  assert.equal(reportOutput([], {
    ships: { detailRows: [], summaryLines: [reportSummary(2, "Federation ship", wholeGame, false)] },
    bases: { detailRows: [], summaryLines: [reportSummary(1, "Empire base", wholeGame, false)] },
  }, false, false), "\n\n\n  2 Federation ships in game\n\n\n  1 Empire base in game\n");
});

test("TARGETS retains a Romulan summary before combined summary", () => {
  assert.equal(reportOutput([], {
    romulanSummary: reportSummary(1, "Romulan", wholeGame, false),
    targetSummary: reportSummary(1, "target", wholeGame, false),
  }, true, false), "\n\n  1 Romulan in game\n\n  1 target in game\n");
});

test("later parser abort preserves direct output and suppresses aggregate", () => {
  assert.equal(reportOutput([
    "\nExcalibur is not in the game\n",
    "Illegal keyword BANANA\n",
  ], { ships: { detailRows: [], summaryLines: ["  1 Empire ship in game\n"] } },
  false, true), "\n\nExcalibur is not in the game\nIllegal keyword BANANA\n");
});
