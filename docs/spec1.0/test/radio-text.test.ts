import assert from "node:assert/strict";
import test from "node:test";
import { radioText } from "../src/radio-text.ts";

test("radio requires two characters but does not trim whitespace", () => {
  assert.equal(radioText(""), null);
  assert.equal(radioText("a"), null);
  assert.equal(radioText("  "), "  ");
  assert.equal(radioText(" a "), " a ");
});

test("radio retains exactly the first 75 characters", () => {
  assert.equal(radioText("x".repeat(75)), "x".repeat(75));
  assert.equal(radioText("x".repeat(75) + "/QUIT"), "x".repeat(75));
  assert.equal(radioText("hold / wait; now"), "hold / wait; now");
});
