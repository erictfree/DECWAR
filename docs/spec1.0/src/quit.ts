import type { Galaxy, PlayerPreferences, ShipName } from "./model.ts";
import { lexicalSegment } from "./lexical.ts";
import { finalPoints } from "./final-points.ts";
import { releaseShip } from "./ship-release.ts";

// Sections 5.2–5.3 and 7.26. Called after recognizing in-game QUIT.
// Prior unconsumed input is intentionally ignored, not used as confirmation.
// null means no fresh response yet; "" means a submitted empty response.
export function quit(galaxy: Galaxy, departing: ShipName,
  preferences: PlayerPreferences, _priorInput: string, freshResponse: string | null) {
  const ship = galaxy.ships.find(s => s.name === departing);
  if (!ship || ship.lifecycle.phase !== "COMMISSIONED") {
    throw new Error("in-game QUIT requires a commissioned ship");
  }
  const prompt = "\nDo you really want to quit? ";
  if (freshResponse === null) return { galaxy: structuredClone(galaxy),
    output: prompt, outcome: "AWAITING_CONFIRMATION" as const };
  const response = lexicalSegment(freshResponse);
  if (response.status !== "TOKENS") throw new Error("C-010 response recovery requires review");
  const first = response.tokens[0]?.text.toUpperCase();
  if (first !== "Y" && first !== "YE" && first !== "YES") {
    return { galaxy: structuredClone(galaxy), output: prompt, outcome: "DECLINED" as const };
  }
  const report = finalPoints(galaxy, departing, preferences.outputLength);
  return { galaxy: releaseShip(galaxy, departing), output: prompt + report,
    outcome: "RELEASED" as const };
}
