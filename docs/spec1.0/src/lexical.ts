// Chapter 3 working productions. Numeric spelling is retained without imposing
// JavaScript's numeric range on the abstract language. Free-text interpretation
// and whether a following segment is a command or response belong to its caller.
export interface LexicalToken {
  kind: "WORD" | "INTEGER" | "DECIMAL" | "OTHER";
  text: string;
}
export type LexicalSegment = {
  status: "TOKENS";
  tokens: LexicalToken[];
  boundary: "LINE" | "SLASH" | "SEMICOLON";
  remainder: string;
} | {
  status: "REVIEW_REQUIRED";
  issue: "EMPTY_COMMA_OPERAND" | "EMPTY_SLASH_SEGMENT";
  offset: number;
};

export function lexicalSegment(input: string, followsSlash = false): LexicalSegment {
  if (/[\r\n]/.test(input)) throw new Error("Supply one submitted line, without its line-ending encoding");
  const tokens: LexicalToken[] = [];
  let i = 0, afterComma = false, commaOffset = -1;
  const spacing = () => { while (input[i] === " " || input[i] === "\t") i++; };
  while (true) {
    spacing();
    const c = input[i];
    if (c === undefined || c === "/" || c === ";") {
      if (afterComma) return { status: "REVIEW_REQUIRED", issue: "EMPTY_COMMA_OPERAND", offset: commaOffset };
      if (!tokens.length && (c === "/" || followsSlash))
        return { status: "REVIEW_REQUIRED", issue: "EMPTY_SLASH_SEGMENT", offset: i };
      return { status: "TOKENS", tokens,
        boundary: c === "/" ? "SLASH" : c === ";" ? "SEMICOLON" : "LINE",
        remainder: c === undefined ? "" : input.slice(i + 1) };
    }
    if (c === ",") {
      if (!tokens.length || afterComma)
        return { status: "REVIEW_REQUIRED", issue: "EMPTY_COMMA_OPERAND", offset: i };
      afterComma = true; commaOffset = i; i++; continue;
    }
    const start = i;
    while (i < input.length && !/[ \t,\/;]/.test(input[i])) i++;
    const text = input.slice(start, i);
    const kind = /^[A-Za-z]+$/.test(text) ? "WORD"
      : /^[+-]?\d+$/.test(text) ? "INTEGER"
      : /^[+-]?(?:\d+\.\d*|\.\d+)$/.test(text) ? "DECIMAL" : "OTHER";
    tokens.push({ kind, text });
    afterComma = false;
  }
}
