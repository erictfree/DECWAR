import assert from "node:assert/strict";
import test from "node:test";
import { newsDisplay } from "../src/news-display.ts";

const prompt = "Do you want to continue viewing the news file? ";
test("7.22 NEWS starts literally, consumes only boundary periods and preserves suffix text", () => {
  const text = ".Opening\n.Second\n..Third";
  assert.deepEqual(newsDisplay(text, ["y", "YE"]), {
    output: ".Opening\n" + prompt + "Second\n" + prompt + ".Third",
    responsesUsed: 2, outcome: "COMPLETE" });
  assert.deepEqual(newsDisplay("Unmarked text", ["NO"]), {
    output: "Unmarked text", responsesUsed: 0, outcome: "COMPLETE" });
});

test("7.22 NEWS distinguishes missing response, cancellation and restart", () => {
  const text = "First\n.Second\n";
  assert.deepEqual(newsDisplay(text, []), { output: "First\n" + prompt,
    responsesUsed: 0, outcome: "AWAITING_RESPONSE" });
  for (const response of [null, "NO", "YESPLEASE"]) {
    assert.deepEqual(newsDisplay(text, [response]), { output: "First\n" + prompt,
      responsesUsed: 1, outcome: "DECLINED" });
  }
  assert.equal(newsDisplay(text, ["YES"]).output, "First\n" + prompt + "Second\n");
});

test("7.22 NEWS interruption is after an emitted boundary, before a following continuation prompt", () => {
  for (const boundary of ["\n", "\v", "\f"]) {
    assert.deepEqual(newsDisplay("First" + boundary + ".Second", ["YES"], 1), {
      output: "First" + boundary, responsesUsed: 0, outcome: "INTERRUPTED" });
  }
  assert.deepEqual(newsDisplay("First", [], 1), { output: "First", responsesUsed: 0, outcome: "COMPLETE" });
});
