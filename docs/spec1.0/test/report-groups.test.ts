import assert from "node:assert/strict";
import test from "node:test";
import { parseAggregateGroups, reportWord } from "../src/report-groups.ts";

test("report command defaults retain distinct scope and output modes", () => {
  const expectations = [
    ["LIST", 100, true, false], ["SUMMARY", 100, false, true],
    ["BASES", 100, true, true], ["PLANETS", 10, true, false], ["TARGETS", 10, true, false],
  ] as const;
  for (const [command, radius, detail, summary] of expectations) {
    const result = parseAggregateGroups(command, "FEDERATION", []);
    assert.equal(result.error, null);
    assert.equal(result.groups.length, 1);
    assert.deepEqual([result.groups[0].radius, result.groups[0].detail, result.groups[0].summary], [radius, detail, summary]);
  }
});

test("report word lookup resolves separators and vessel names before allowed keywords", () => {
  assert.deepEqual(reportWord("LIST", "A"), { kind: "SEPARATOR", value: "AND" });
  assert.deepEqual(reportWord("LIST", "E"), { kind: "NAME", value: "EXCALIBUR" });
  assert.deepEqual(reportWord("LIST", "EN"), { kind: "KEYWORD", value: "ENEMY" });
  assert.deepEqual(reportWord("SUMMARY", "S"), { kind: "KEYWORD", value: "SHIPS" });
  assert.deepEqual(reportWord("TARGETS", "FE"), { kind: "UNKNOWN", value: "FE" });
  assert.deepEqual(reportWord("LIST", "C"), { kind: "NAME", value: "COBRA" });
  assert.deepEqual(reportWord("PLANETS", "C"), { kind: "KEYWORD", value: "CAPTURED" });
  assert.deepEqual(reportWord("BASES", "C"), { kind: "KEYWORD", value: "CLOSEST" });
  assert.deepEqual(reportWord("PLANETS", "CL"), { kind: "KEYWORD", value: "CLOSEST" });
});

test("PORTS and ALL order changes allegiance, while each group resets defaults", () => {
  const result = parseAggregateGroups("LIST", "FEDERATION", ["PORTS", "ALL", "AND", "ALL", "PORTS"]);
  assert.equal(result.error, null);
  assert.deepEqual(result.groups[0].sides, ["FEDERATION", "EMPIRE", "NEUTRAL", "ROMULAN"]);
  // ROMULAN allegiance here has no effect because PORTS excludes ship kinds.
  assert.deepEqual(result.groups[1].sides, ["FEDERATION", "NEUTRAL"]);
  assert.deepEqual(result.groups.map(g => g.kinds), [["BASE", "PLANET"], ["BASE", "PLANET"]]);
});

test("output modifiers expand default range but preserve explicit range in either order", () => {
  for (const tokens of [["3", "SUMMARY"], ["SUMMARY", "3"]]) {
    const result = parseAggregateGroups("PLANETS", "FEDERATION", tokens);
    assert.equal(result.error, null);
    assert.equal(result.groups[0].radius, 3);
    assert.equal(result.groups[0].explicitRadius, true);
    assert.equal(result.groups[0].detail, false);
    assert.equal(result.groups[0].summary, true);
  }
  assert.equal(parseAggregateGroups("PLANETS", "FEDERATION", ["SUMMARY"]).groups[0].radius, 100);
  assert.equal(parseAggregateGroups("BASES", "FEDERATION", ["LIST", "SUMMARY"]).error,
    "Syntax error near keyword SUMMARY\n");
});

test("allegiance/object conflicts and unavailable keywords have distinct diagnostics", () => {
  assert.equal(parseAggregateGroups("SUMMARY", "FEDERATION", ["PORTS", "NEUTRAL"]).error,
    "Syntax error near keyword NEUTRAL\n");
  const neutral = parseAggregateGroups("SUMMARY", "FEDERATION", ["NEUTRAL", "PORTS"]);
  assert.equal(neutral.error, null);
  assert.deepEqual(neutral.groups[0].kinds, ["PLANET"]);
  const captured = parseAggregateGroups("SUMMARY", "FEDERATION", ["CAPTURED", "PORTS"]);
  assert.equal(captured.error, null);
  assert.deepEqual(captured.groups[0].kinds, ["BASE", "PLANET"]);
  assert.equal(parseAggregateGroups("BASES", "FEDERATION", ["NEUTRAL"]).error,
    "Illegal keyword NEUTRAL\n");
  assert.equal(parseAggregateGroups("PLANETS", "FEDERATION", ["ALL", "AND"]).error,
    "Null group illegal\n");
});

test("explicit faction names retain a prior Romulan selection; FRIENDLY clears it", () => {
  assert.deepEqual(parseAggregateGroups("SUMMARY", "FEDERATION", ["FEDERATION"]).groups[0].sides,
    ["FEDERATION", "ROMULAN"]);
  assert.deepEqual(parseAggregateGroups("SUMMARY", "FEDERATION", ["FRIENDLY"]).groups[0].sides,
    ["FEDERATION"]);
  assert.deepEqual(parseAggregateGroups("SUMMARY", "FEDERATION", ["PLANETS", "FEDERATION"]).groups[0].sides,
    ["FEDERATION"]);
});
