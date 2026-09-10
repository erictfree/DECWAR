import assert from "node:assert/strict";
import test from "node:test";
import type { Ship } from "../src/model.ts";
import { captureRecipients } from "../src/capture-recipients.ts";

test("capture audience is centered on the ship, with faction-specific radii", () => {
  const ships: Pick<Ship, "name" | "position" | "lifecycle">[] = [
    { name: "EXCALIBUR", position: { vertical: 20, horizontal: 20 }, lifecycle: { phase: "DESTROYED", captain: "A" } },
    { name: "FARRAGUT", position: { vertical: 30, horizontal: 30 }, lifecycle: { phase: "COMMISSIONED", captain: "B" } },
    { name: "WOLF", position: { vertical: 20, horizontal: 24 }, lifecycle: { phase: "COMMISSIONED", captain: "C" } },
    { name: "PANTHER", position: { vertical: 20, horizontal: 25 }, lifecycle: { phase: "COMMISSIONED", captain: "D" } },
    { name: "INTREPID", position: null, lifecycle: { phase: "AVAILABLE" } },
  ];
  // A captured planet at (20,21) is four sectors from Panther, but that
  // earlier planet-centered selection is replaced before the notice is made.
  assert.deepEqual(captureRecipients(ships, "EXCALIBUR", { vertical: 20, horizontal: 20 }),
    new Set(["EXCALIBUR", "FARRAGUT", "WOLF"]));
});
