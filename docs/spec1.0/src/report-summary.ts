import { integerField } from "./output.ts";

// Section 7.10: formats resolved category information, not report selection.
export function reportSummary(
  count: number,
  label: string,
  qualifiers: { known: boolean; inGame: boolean; specifiedRange: boolean },
  short: boolean,
): string {
  if (!Number.isInteger(count) || count < 0) throw new RangeError("invalid count");
  if (count === 0) return "";
  const scope = qualifiers.inGame ? " in game"
    : qualifiers.specifiedRange ? " in specified range" : " in range";
  return integerField(count, 3) + (qualifiers.known ? " known" : "")
    + " " + label + (count === 1 ? "" : "s") + (short ? "" : scope) + "\n";
}
