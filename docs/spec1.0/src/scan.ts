import type { Base, Planet, Position, Team } from "./model.ts";
import { integerField } from "./output.ts";

type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT" | "CORNER";
export interface ScanBounds {
  verticalMin: number; verticalMax: number;
  horizontalMin: number; horizontalMax: number;
}
interface WarningArea { position: Position; radius: number }

// Tokenized SCAN/SRSCAN operands. Omitted ranges remain a policy boundary.
export function scanRequest(position: Position, operands: readonly (string | number)[]):
  { status: "ERROR"; output: string }
  | { status: "DEFAULT"; warning: boolean; direction?: Direction }
  | { status: "EXPLICIT"; warning: boolean; bounds: ScanBounds } {
  const tokens = [...operands];
  const matches = (token: string | number | undefined, word: string) =>
    typeof token === "string" && token.length > 0 && word.startsWith(token.toUpperCase());
  const warning = matches(tokens.at(-1), "WARNING");
  if (warning) tokens.pop();
  const direction = (["UP","DOWN","RIGHT","LEFT","CORNER"] as const)
    .find(d=>matches(tokens[0],d));
  if (direction) tokens.shift();
  const fail = () => ({status:"ERROR" as const,output:"%Syntax error\n"});
  if (direction === "CORNER" && tokens.length !== 2) return fail();
  if (!tokens.length) return {status:"DEFAULT",warning,direction};
  if (tokens.length > 2 || tokens.some(t=>typeof t !== "number" || !Number.isInteger(t))) return fail();
  return {status:"EXPLICIT",warning,bounds:scanBounds(position,tokens[0] as number,
    (tokens[1] ?? tokens[0]) as number,direction)};
}
const distance = (a: Position, b: Position) => Math.max(
  Math.abs(a.vertical - b.vertical), Math.abs(a.horizontal - b.horizontal));

// Section 7.9: explicit numeric ranges only; no default-width policy.
export function scanBounds(position: Position, vertical: number, horizontal = vertical,
  direction?: Direction): ScanBounds {
  if (!Number.isInteger(vertical) || !Number.isInteger(horizontal)) throw new Error("integer ranges required");
  let up = vertical, down = vertical, left = horizontal, right = horizontal;
  if (direction === "UP") down = 0;
  if (direction === "DOWN") up = 0;
  if (direction === "LEFT") right = 0;
  if (direction === "RIGHT") left = 0;
  if (direction === "CORNER") {
    up = Math.max(vertical, 0); down = Math.max(-vertical, 0);
    right = Math.max(horizontal, 0); left = Math.max(-horizontal, 0);
  }
  const clamp = (n: number) => Math.min(10, Math.max(0, n));
  return { verticalMin: Math.max(1, position.vertical - clamp(down)),
    verticalMax: Math.min(75, position.vertical + clamp(up)),
    horizontalMin: Math.max(1, position.horizontal - clamp(left)),
    horizontalMax: Math.min(75, position.horizontal + clamp(right)) };
}

export function scanDiscovery(position: Position, team: Team,
  planets: Planet[], bases: Base[]): WarningArea[] {
  const warnings: WarningArea[] = [];
  for (const planet of planets) {
    if (distance(position, planet.position) > 10) continue;
    planet.knownTo.add(team);
    if (planet.allegiance !== "NEUTRAL" && planet.allegiance !== team) {
      warnings.push({ position: planet.position, radius: 2 });
    }
  }
  for (const base of bases) {
    if (base.team === team || distance(position, base.position) > 10) continue;
    base.knownTo.add(team);
    warnings.push({ position: base.position, radius: 4 });
  }
  return warnings;
}

// The sector query returns Section 7.9's long symbol, with no hidden-ship policy.
export function scanOutput(bounds: ScanBounds, short: boolean,
  sector: (position: Position) => string, warnings: WarningArea[] = [],
  interruptAfterRow?: number): string {
  if (interruptAfterRow !== undefined && (!Number.isInteger(interruptAfterRow) || interruptAfterRow < 1))
    throw new Error("interruption checkpoint is a positive completed-row count");
  if (short && bounds.horizontalMin === bounds.horizontalMax) {
    throw new Error("one-column short labels remain under review");
  }
  const labels: string[] = [];
  for (let h = bounds.horizontalMin + (short ? 1 : 0); h <= bounds.horizontalMax; h += short ? 3 : 2) {
    labels.push(integerField(h, 2));
  }
  const axis = "   " + labels.join(short ? " " : "  ") + "\n";
  let output = "\n" + axis;
  for (let v = bounds.verticalMax; v >= bounds.verticalMin; v--) {
    output += integerField(v, 2) + " ";
    for (let h = bounds.horizontalMin; h <= bounds.horizontalMax; h++) {
      const position = { vertical: v, horizontal: h };
      let symbol = sector(position);
      if (symbol.length !== 2) throw new Error("two-character long symbol required");
      if (symbol === " ." && warnings.some(area => distance(area.position, position) <= area.radius)) symbol = " !";
      output += short ? symbol[1] : symbol;
    }
    output += " " + integerField(v, 2) + "\n";
    if (interruptAfterRow === bounds.verticalMax - v + 1) return output;
  }
  return output + axis;
}
