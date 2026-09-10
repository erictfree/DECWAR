import assert from "node:assert/strict";
import test from "node:test";
import { lexicalSegment } from "../src/lexical.ts";

test("ordinary separators give identical command tokens", () => {
  const expected = lexicalSegment("M A 23 22");
  for (const line of ["M A 23,22", "M,A,23,22", " \tM\tA , 23,\t22  "])
    assert.deepEqual(lexicalSegment(line), expected);
});

test("whole-token recognition preserves spelling and numeric class", () => {
  const result = lexicalSegment("move -03 +0 -0 +.5 3. 20.0 M20 20-21 MOVE! 2e3");
  assert.equal(result.status, "TOKENS");
  if (result.status !== "TOKENS") return;
  assert.deepEqual(result.tokens.map(t => t.kind), ["WORD", "INTEGER", "INTEGER", "INTEGER",
    "DECIMAL", "DECIMAL", "DECIMAL", "OTHER", "OTHER", "OTHER", "OTHER"]);
  assert.equal(result.tokens[0].text, "move");
  assert.equal(result.tokens[1].text, "-03");
});

test("segment boundaries retain text without executing or discarding it", () => {
  assert.deepEqual(lexicalSegment("M A 23 22/M R 1 0"), {
    status: "TOKENS", tokens: ["M", "A", "23", "22"].map((text, i) =>
      ({ kind: i < 2 ? "WORD" : "INTEGER", text })), boundary: "SLASH", remainder: "M R 1 0" });
  const tell = lexicalSegment("TE W;hold / wait; now");
  assert.equal(tell.status, "TOKENS");
  if (tell.status !== "TOKENS") return;
  assert.equal(tell.boundary, "SEMICOLON");
  assert.equal(tell.remainder, "hold / wait; now");
  assert.deepEqual(lexicalSegment(" ; comment / not a command"), {
    status: "TOKENS", tokens: [], boundary: "SEMICOLON", remainder: " comment / not a command" });
});

test("unresolved empty operands and slash segments are not silently normalized", () => {
  for (const line of [",M", "M,,A", "M,", "M , /ST", "M , ;comment"])
    assert.equal(lexicalSegment(line).status, "REVIEW_REQUIRED");
  assert.deepEqual(lexicalSegment(" /ST"), {
    status: "REVIEW_REQUIRED", issue: "EMPTY_SLASH_SEGMENT", offset: 1 });
  assert.equal(lexicalSegment("", true).status, "REVIEW_REQUIRED");
  assert.equal(lexicalSegment(";comment", true).status, "REVIEW_REQUIRED");
  assert.deepEqual(lexicalSegment(" \t "), {
    status: "TOKENS", tokens: [], boundary: "LINE", remainder: "" });
  assert.throws(() => lexicalSegment("ST\nST"), /one submitted line/);
});

test("literal punctuation and very large integers retain their entire spelling", () => {
  const large = "9".repeat(100);
  const result = lexicalSegment(`& * CTL-C ADM-3A ${large}`);
  assert.equal(result.status, "TOKENS");
  if (result.status !== "TOKENS") return;
  assert.deepEqual(result.tokens, ["&", "*", "CTL-C", "ADM-3A"].map(text => ({ kind: "OTHER", text }))
    .concat([{ kind: "INTEGER", text: large }]));
});
