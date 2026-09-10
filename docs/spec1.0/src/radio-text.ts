// Operates on a completed, edited ASCII message line without its terminator.
export function radioText(line: string): string | null {
  if ([...line].some(c => c.charCodeAt(0) > 127 || "\r\n\0".includes(c)))
    throw new RangeError("Expected edited ASCII text without a line terminator");
  return line.length < 2 ? null : line.slice(0, 75);
}
