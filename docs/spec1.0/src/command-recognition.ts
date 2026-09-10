import type { LexicalToken } from "./lexical.ts";

export const ordinaryCommands = ["BASES", "BUILD", "CAPTURE", "DAMAGES", "DOCK",
  "ENERGY", "GRIPE", "HELP", "IMPULSE", "LIST", "MOVE", "NEWS", "PHASERS", "PLANETS",
  "POINTS", "QUIT", "RADIO", "REPAIR", "SCAN", "SET", "SHIELDS", "SRSCAN", "STATUS",
  "SUMMARY", "TARGETS", "TELL", "TIME", "TORPEDOES", "TRACTOR", "TYPE", "USERS"] as const;
export type OrdinaryCommand = typeof ordinaryCommands[number];
export type CommandRecognition = { kind: "EMPTY" | "UNKNOWN" }
  | { kind: "AMBIGUOUS"; candidates: OrdinaryCommand[] }
  | { kind: "COMMAND"; command: OrdinaryCommand };

// Section 4.1 working full-spelling rule; ordinary in-game vocabulary only.
// Recognition says nothing about operand grammar or state eligibility.
export function recognizeOrdinaryCommand(token: LexicalToken | undefined): CommandRecognition {
  if (!token) return { kind: "EMPTY" };
  if (token.kind !== "WORD") return { kind: "UNKNOWN" };
  const word = token.text.toUpperCase();
  if (!word) return { kind: "UNKNOWN" };
  const candidates = ordinaryCommands.filter(command => {
    const spellings = command === "TORPEDOES" ? [command, "TORPEDO", "TORPEDOS"] : [command];
    return spellings.some(spelling => spelling.startsWith(word));
  });
  if (candidates.length === 0) return { kind: "UNKNOWN" };
  if (candidates.length > 1) return { kind: "AMBIGUOUS", candidates };
  return { kind: "COMMAND", command: candidates[0] };
}

export function recognitionDiagnostic(result: CommandRecognition,
  length: "SHORT" | "MEDIUM" | "LONG"): string {
  if (result.kind !== "UNKNOWN" && result.kind !== "AMBIGUOUS") return "";
  return (result.kind === "UNKNOWN" ? "Unknown command" : "Ambiguous command")
    + (length === "SHORT" ? "" : " -- for help type HELP") + "\n";
}
