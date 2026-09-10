import assert from "node:assert/strict";
import test from "node:test";
import { torpedoNotice, baseNotice } from "../src/combat-notices.ts";

test("torpedo outcomes preserve literal spacing and initial long newline", () => {
  assert.equal(torpedoNotice("MISS", 2, "@20-25", "LONG"),
    "\nWeapons Officer:  Captain, torpedo 2 lost @20-25\n");
  assert.equal(torpedoNotice("BLACK_HOLE", 1, "@20-25", "MEDIUM"), "T1 gulp @20-25\n");
  assert.equal(torpedoNotice("NEUTRALIZED", 3, "20-25", "SHORT"), "T3 neutralized 20-25\n");
});

test("base distress literals match all three output lengths", () => {
  assert.equal(baseNotice(false, "Fed Base", "@20-25", "LONG", true, 0),
    "\nFed Base @20-25 is under attack, Captain.\n");
  assert.equal(baseNotice(false, "<>", "@20-25", "MEDIUM", true, 0), "<> @20-25 attacked\n");
  assert.equal(baseNotice(false, "<>", "20-25", "SHORT", true, 0), "<> 20-25 A\n");
});

test("base delivery admits exactly 300 radio damage but suppresses greater damage", () => {
  assert.equal(baseNotice(true, ")(", "@20-25", "MEDIUM", true, 300), ")( @20-25 dead\n");
  assert.equal(baseNotice(true, ")(", "@20-25", "MEDIUM", true, 300.1), "");
  assert.equal(baseNotice(true, "Emp Base", "@20-25", "LONG", false, 0), "\n");
});
