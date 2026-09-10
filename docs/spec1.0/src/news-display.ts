// Section 7.22 historical text interpretation. The caller supplies a corpus;
// this does not select Austin Core news or define raw input/editing gestures.
export function newsDisplay(text: string, firstResponseTokens: readonly (string | null)[],
  interruptAfterBreak?: number) {
  let output = "", afterBreak = false, breaks = 0, responsesUsed = 0;
  for (const character of text) {
    if (afterBreak && character === ".") {
      output += "Do you want to continue viewing the news file? ";
      if (responsesUsed === firstResponseTokens.length)
        return { output, responsesUsed, outcome: "AWAITING_RESPONSE" as const };
      const response = firstResponseTokens[responsesUsed++]?.toUpperCase();
      if (response !== "Y" && response !== "YE" && response !== "YES")
        return { output, responsesUsed, outcome: "DECLINED" as const };
      afterBreak = false;
      continue;
    }
    output += character;
    afterBreak = character === "\n" || character === "\v" || character === "\f";
    if (afterBreak && ++breaks === interruptAfterBreak)
      return { output, responsesUsed, outcome: "INTERRUPTED" as const };
  }
  return { output, responsesUsed, outcome: "COMPLETE" as const };
}
