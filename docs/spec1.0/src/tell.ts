import { FEDERATION_SHIPS, EMPIRE_SHIPS, teamOf } from "./model.ts";
import type { RadioMessage, RadioState, Ship, ShipName } from "./model.ts";
import { radioText } from "./radio-text.ts";
import { playerRadioOutput } from "./radio-output.ts";

type Participant = Pick<Ship, "name" | "lifecycle" | "radio" | "deviceDamage">;
const roster = [...FEDERATION_SHIPS, ...EMPIRE_SHIPS];

// Section 7.18: resolved recipient-input phase plus completed edited text.
// Recipient prompting, replay, raw lexical limits and delivery scheduling are separate.
export function prepareTell(sender: Participant, ships: readonly Participant[],
  words: string[], text: string | null, length: "SHORT" | "MEDIUM" | "LONG", inline = true) {
  const senderRadio: RadioState = structuredClone(sender.radio);
  let output = "";
  let message: RadioMessage | null = null;
  const result = () => ({ senderRadio, output, message });
  if (sender.deviceDamage.RADIO >= 300) {
    output = "\nSub-Space radio damaged.\n";
    return result();
  }
  senderRadio.enabled = true;
  if (!words.length) throw new Error("recipient prompting is outside this operation");
  const selected = new Set<ShipName>();
  for (const raw of words) {
    const word = raw.toUpperCase();
    if (!/^[A-Z]+$/.test(word)) throw new Error("normalized word recipients required");
    if ("ROMULAN".startsWith(word)) continue;
    const name = roster.find(n => n.startsWith(word));
    if (name) {
      selected.add(name);
      if (name === sender.name) output += "\nSelf excluded from message.\n";
      continue;
    }
    const groups = ["ALL", "FEDERATION", "HUMAN", "EMPIRE", "KLINGON", "FRIENDLY", "ENEMY"]
      .filter(group => group.startsWith(word));
    if (groups.length !== 1) {
      output += `\n${groups.length ? "Ambiguous group name" : "Unrecognized player or group name"}:  ${word}\n`;
      continue;
    }
    const group = groups[0], ownTeam = teamOf(sender.name);
    for (const ship of ships) {
      if (ship.lifecycle.phase !== "COMMISSIONED") continue;
      const team = teamOf(ship.name);
      const included = group === "ALL" || ((group === "FEDERATION" || group === "HUMAN") && team === "FEDERATION")
        || ((group === "EMPIRE" || group === "KLINGON") && team === "EMPIRE")
        || (group === "FRIENDLY" && team === ownTeam) || (group === "ENEMY" && team !== ownTeam);
      if (included) selected.add(ship.name);
    }
  }
  for (const name of roster) {
    if (!selected.has(name)) continue;
    const ship = ships.find(s => s.name === name);
    if (!ship) throw new Error("roster ship missing");
    const display = length === "LONG" ? name[0] + name.slice(1).toLowerCase() : name[0];
    if (ship.deviceDamage.RADIO >= 300) {
      output += `\nCommunications:  Captain, we cannot raise the ${display}\n`;
      selected.delete(name);
    } else if (ship.lifecycle.phase !== "COMMISSIONED") {
      output += `\nPlayer is not in the game:  ${display}\n`;
      selected.delete(name);
    } else if (!(name === sender.name ? senderRadio.enabled : ship.radio.enabled)) {
      output += `\nCommunications:  Captain, we cannot raise the ${display}\n`;
      selected.delete(name);
    }
  }
  selected.delete(sender.name);
  for (const name of selected) senderRadio.gaggedShips.delete(name);
  if (!selected.size) {
    output += "\nNo message sent.\n";
    return result();
  }
  if (!inline) output += "Msg: ";
  const retained = text === null ? null : radioText(text);
  if (retained === null) output += "No message sent\n";
  else message = { sender: sender.name, recipients: new Set(selected), pendingRecipients: new Set(selected), text: retained };
  output += "\n";
  return result();
}

export function deliverPlayerMessage(message: RadioMessage, receiver: Participant,
  length: "SHORT" | "MEDIUM" | "LONG") {
  if (!roster.includes(message.sender as ShipName)) throw new Error("player-originated message required");
  const remaining = structuredClone(message);
  let output = "";
  if (remaining.pendingRecipients.has(receiver.name)) {
    if (!receiver.radio.gaggedShips.has(message.sender as ShipName)) {
      output = playerRadioOutput(message.sender as ShipName, message.recipients, message.text, length);
    }
    remaining.pendingRecipients.delete(receiver.name);
  }
  return { output, message: remaining.pendingRecipients.size ? remaining : null };
}
