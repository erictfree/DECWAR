import type { Position, PlayerPreferences } from "./model.ts";
import { positionField } from "./output.ts";

// Section 10.6. Rendering a recorded appearance, not selecting recipients.
export function appearanceNotice(position: Position, observer: Position,
  preferences: Pick<PlayerPreferences, "outputLength" | "coordinateOutput">): string {
  return (preferences.outputLength === "LONG" ? "\nRomulan detected " : "??  ")
    + positionField(position, observer, preferences.coordinateOutput,
      preferences.outputLength === "SHORT") + "\n";
}
