import assert from "node:assert/strict";
import test from "node:test";
import { warOutcome, victoryAnnouncement } from "../src/war-ending.ts";

test("planets prevent ending regardless of faction base counts", () => {
  for (let fed = 0; fed <= 10; fed++) for (let emp = 0; emp <= 10; emp++) {
    assert.equal(warOutcome(1, fed, emp), null);
    const expected = fed && emp ? null : fed ? "FEDERATION" : emp ? "EMPIRE" : "MUTUAL_DESTRUCTION";
    assert.equal(warOutcome(0, fed, emp), expected);
  }
});

test("single-faction ending announces outcome before faction-specific instruction", () => {
  assert.equal(victoryAnnouncement("FEDERATION", "FEDERATION"),
    "THE WAR IS OVER!!\n\nThe Federation has successfully repelled the Klingon hordes!\n\nCongratulations.  Freedom again reigns the galaxy.\n");
  assert.equal(victoryAnnouncement("EMPIRE", "FEDERATION"),
    "THE WAR IS OVER!!\n\nThe Klingon Empire is VICTORIOUS!!\n\nPlease proceed to the nearest Klingon slave planet.\n");
  assert.ok(victoryAnnouncement("EMPIRE", "EMPIRE").endsWith("The Empire salutes you.  Begin slave operations immediately.\n"));
  assert.ok(victoryAnnouncement("FEDERATION", "EMPIRE").endsWith("The Empire has fallen.  Initiate self-destruction procedure.\n"));
});
