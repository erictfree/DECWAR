// Section 7.25: collection from edited lines, before any external submission.
// Character editing, information-activity visibility and destination policy
// are deliberately outside this operation.
export type GripeLine = { text: string; end: "NEWLINE" | "END" | "CANCEL" };
export type GripeCollection =
  | { status: "REJECTED" | "CANCELLED" | "EMPTY"; output: string }
  | { status: "COLLECTING"; draft: string; output: string }
  | { status: "SUBMIT"; body: string; output: string };

export function collectGripe(condition: "GREEN" | "YELLOW" | "RED" | null,
  lines: readonly GripeLine[]): GripeCollection {
  if (condition === "RED") return { status: "REJECTED",
    output: "\nYou are not permitted to GRIPE\nwhile under RED alert!\n" };
  let output = "Enter gripe, end with ^Z\n";
  let body = "";
  let completed = 0;
  for (const line of lines) {
    if (line.end === "CANCEL") return { status: "CANCELLED", output };
    if (/[\r\n]/.test(line.text)) throw new Error("edited line text excludes line terminators");
    body += line.text;
    if (line.end === "END") {
      if (completed === 0 && line.text.length === 0) return { status: "EMPTY", output };
      if (line.text.length > 0) body += "\n";
      return { status: "SUBMIT", body, output };
    }
    body += "\n";
    completed++;
    if (completed === 18) output += "[Only 2 more message lines allowed]\n";
    if (completed === 20) return { status: "SUBMIT", body,
      output: output + "[Too many lines -- end of gripe]\n" };
  }
  return { status: "COLLECTING", draft: body, output };
}
