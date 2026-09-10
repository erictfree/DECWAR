import { teamOf } from "./model.ts";
import type { PendingNotification, Ship, ShipName } from "./model.ts";
import type { LexicalToken } from "./lexical.ts";

// Source-derived Section 7.3 dialogue. Trailing tokens are guarded; the
// non-word retry behavior records C-010 evidence, not a uniform error policy.
export function tractorDialogue(ships: Ship[], issuer: ShipName,
  initial: readonly LexicalToken[], responses: readonly (readonly LexicalToken[])[],
  length: "SHORT" | "MEDIUM" | "LONG") {
  let tokens = initial, responsesUsed = 0, output = "\n";
  if (!initial.length && ships.find(s => s.name === issuer)?.tractorLink) {
    return { ...tractor(ships, issuer, null, length), responsesUsed };
  }
  while (true) {
    if (tokens.length > 1) throw new Error("C-010 trailing TRACTOR input remains under review");
    if (tokens[0]?.kind === "WORD") {
      const result = tractor(ships, issuer, tokens[0].text.toUpperCase(), length);
      return { ...result, output: output + result.output.slice(1), responsesUsed };
    }
    output += "Ship to apply tractor beam to:  ";
    const unchanged = (prompt: boolean) => ({ ships: structuredClone(ships), output,
      notices: [] as { recipient: ShipName; active: boolean }[], notification: null,
      prompt, responsesUsed });
    if (responsesUsed === responses.length) return unchanged(true);
    tokens = responses[responsesUsed++];
    if (!tokens.length) return unchanged(false);
  }
}

// Shared link-removal transition; no command prefix or display is emitted here.
export function releaseTractor(ships: Ship[], issuer: ShipName) {
  const ship = ships.find(s => s.name === issuer);
  const partner = ships.find(s => s.name === ship?.tractorLink);
  if (!ship || !partner || partner.tractorLink !== issuer) throw new Error("invalid reciprocal link");
  ship.tractorLink = partner.tractorLink = null;
  return [{ recipient: issuer, active: false }, { recipient: partner.name, active: false }];
}

// Section 7.3. A normalized word or omitted operand; raw-input recovery and
// subsequent notice delivery are separate. Device eligibility remains C-012.
export function tractor(ships: Ship[], issuer: ShipName, operand: string | null,
  length: "SHORT" | "MEDIUM" | "LONG") {
  const result = structuredClone(ships);
  const ship = result.find(s => s.name === issuer)!;
  if (!ship || ship.lifecycle.phase !== "COMMISSIONED" || !ship.position) {
    throw new Error("commissioned positioned issuer required");
  }
  const notices: { recipient: ShipName; active: boolean }[] = [];
  const finish = (text = "", prompt = false) => {
    const notification: PendingNotification | null = notices.length ? {
      facts: { kind: "TRACTOR", ships: [notices[0].recipient, notices[1].recipient], active: notices[0].active },
      recipients: new Set(notices.map(n => n.recipient)),
      pendingRecipients: new Set(notices.map(n => n.recipient)),
    } : null;
    return { ships: result, output: "\n" + text, notices, notification, prompt };
  };
  const fail = (text: string) => finish(text + "\n");
  if ((operand === null && ship.tractorLink) || (operand && "OFF".startsWith(operand))) {
    if (!ship.tractorLink) return fail("Tractor beam not in operation at this time, Captain.");
    notices.push(...releaseTractor(result, issuer));
    return finish();
  }
  if (operand === null) return finish("Ship to apply tractor beam to:  ", true);
  if (!operand) throw new Error("empty reply cancellation belongs to prompted input");
  if (ship.tractorLink) return fail("Tractor beam already active, Captain.");
  const target = result.find(s => s.name.startsWith(operand));
  if (!target) return fail("Unknown ship name.");
  if (target.name === issuer) return fail("Beg your pardon, Captain?  You want to apply a tractor\nbeam to your own ship?");
  if (teamOf(target.name) !== teamOf(issuer)) return fail("Can not apply tractor beam to enemy ship.");
  if (target.lifecycle.phase !== "COMMISSIONED") return fail("Player not in game.");
  if (!target.position) throw new Error("commissioned target requires position");
  if (Math.max(Math.abs(ship.position.vertical - target.position.vertical),
    Math.abs(ship.position.horizontal - target.position.horizontal)) !== 1) {
    return fail("Not adjacent to destination ship.");
  }
  const name = length === "LONG" ? target.name[0] + target.name.slice(1).toLowerCase() : target.name[0];
  if (target.tractorLink) return fail(name + " already has tractor beam active.");
  if (ship.shields.mode === "UP") return fail("Can not apply tractor beam through shields, Captain.");
  if (target.shields.mode === "UP") return fail(name + " has his shields up.  Unable to apply tractor beam.");
  ship.tractorLink = target.name;
  target.tractorLink = issuer;
  notices.push({ recipient: issuer, active: true }, { recipient: target.name, active: true });
  return finish();
}
