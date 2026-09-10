import assert from "node:assert/strict";
import test from "node:test";
import { FEDERATION_SHIPS, EMPIRE_SHIPS } from "../src/model.ts";
import type { Ship } from "../src/model.ts";
import { prepareTell, deliverPlayerMessage } from "../src/tell.ts";
import { radioCommand } from "../src/radio-command.ts";

const players = (): Pick<Ship, "name" | "lifecycle" | "radio" | "deviceDamage">[] =>
  [...FEDERATION_SHIPS, ...EMPIRE_SHIPS].map(name => ({ name,
    lifecycle: { phase: "COMMISSIONED", captain: name },
    radio: { enabled: true, gaggedShips: new Set() },
    deviceDamage: { SHIELDS: 0, WARP_ENGINES: 0, IMPULSE_ENGINES: 0, LIFE_SUPPORT: 0,
      TORPEDO_TUBES: 0, PHASERS: 0, COMPUTER: 0, RADIO: 0, TRACTOR_BEAM: 0 } }));

test("TELL filters in roster order and changes sender settings even on text cancellation", () => {
  const ships = players(), sender = ships[0];
  sender.radio.enabled = false;
  sender.radio.gaggedShips.add("WOLF");
  ships[1].lifecycle = { phase: "AVAILABLE" };
  ships[1].deviceDamage.RADIO = 300;
  ships[2].radio.enabled = false;
  const result = prepareTell(sender, ships, ["W", "I", "F"], null, "LONG", false);
  assert.equal(result.output, "\nCommunications:  Captain, we cannot raise the Farragut\n\nCommunications:  Captain, we cannot raise the Intrepid\nMsg: No message sent\n\n");
  assert.equal(result.message, null);
  assert.equal(result.senderRadio.enabled, true);
  assert.equal(result.senderRadio.gaggedShips.has("WOLF"), false);
  assert.equal(sender.radio.enabled, false);
});

test("TELL deduplicates groups and names, and excludes sender and Romulan", () => {
  const ships = players();
  const result = prepareTell(ships[0], ships, ["ALL", "W", "E", "R"], "hold / wait", "SHORT");
  assert.equal(result.output, "\nSelf excluded from message.\n\n");
  assert.equal(result.message?.recipients.size, 17);
  assert.equal(result.message?.recipients.has("EXCALIBUR"), false);
});

test("RADIO OFF after TELL selection does not suppress pending delivery", () => {
  const ships = players(), receiver = ships[17];
  const sent = prepareTell(ships[0], ships, ["W", "F"], "hold", "LONG").message!;
  receiver.radio = radioCommand(receiver.name, receiver.radio, "SHORT", ["OFF"]).radio;
  receiver.deviceDamage.RADIO = 500;
  const delivery = deliverPlayerMessage(sent, receiver, "SHORT");
  assert.equal(delivery.output, "\nMessage from E to  F W\nhold\n\n");
  assert.deepEqual(delivery.message?.pendingRecipients, new Set(["FARRAGUT"]));
  assert.deepEqual(delivery.message?.recipients, new Set(["FARRAGUT", "WOLF"]));
});

test("RADIO GAG after selection discards the last pending copy", () => {
  const ships = players(), receiver = ships[17];
  const sent = prepareTell(ships[0], ships, ["W"], "hold", "LONG").message!;
  receiver.radio = radioCommand(receiver.name, receiver.radio, "LONG", ["GAG", "E"]).radio;
  assert.deepEqual(deliverPlayerMessage(sent, receiver, "LONG"), { output: "", message: null });
});

test("TELL sender damage rejects before enabling reception", () => {
  const ships = players(), sender = ships[0];
  sender.radio.enabled = false;
  sender.deviceDamage.RADIO = 300;
  const result = prepareTell(sender, ships, ["W"], "hold", "LONG");
  assert.equal(result.output, "\nSub-Space radio damaged.\n");
  assert.deepEqual(result.senderRadio, sender.radio);
  assert.equal(result.message, null);
});

test("TELL groups exclude absent ships before diagnostics but explicit names do not", () => {
  const ships = players();
  for (const ship of ships.slice(9)) ship.lifecycle = { phase: "AVAILABLE" };
  assert.equal(prepareTell(ships[0], ships, ["ENEMY"], "hold", "LONG", false).output,
    "\nNo message sent.\n");
  assert.equal(prepareTell(ships[0], ships, ["W"], "hold", "LONG", false).output,
    "\nPlayer is not in the game:  Wolf\n\nNo message sent.\n");
});
