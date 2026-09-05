// Game editor in WARMAC.MAC:1849-1972, not the standalone GETLIN.MAC utility.
// Monitor echo is deliberately outside this class; these are application effects.
export type InputEffect =
  | { kind: 'line'; text: string; repeated: boolean; terminator: number }
  | { kind: 'redisplay'; text: string }
  | { kind: 'clear-line' };

export class LineInput {
  private previous = '';
  private text = '';
  private first = true;
  feed(bytes: Uint8Array): InputEffect[] {
    const effects: InputEffect[] = [];
    for (const code of bytes) {
      if (code > 127) throw new RangeError('7-bit monitor input required');
      if (code === 0 || code === 13) continue; // ICHR. discards NUL/CR before INLI.
      const repeated = this.first && code === 27;
      this.first = false;
      if (code === 7) {
        // ECHG calls ECHON/ECHOFF, but both immediately POPJ in this build
        // (WARMAC:1313,1324). Do not enable the unreachable echo toggle.
      } else if (code === 8 || code === 127) this.text = this.text.slice(0, -1);
      else if (code === 21) {
        this.text = '';
        effects.push({ kind: 'clear-line' });
      } else if (code === 18) {
        effects.push({ kind: 'redisplay', text: this.text });
      } else if (![3, 10, 11, 12, 26, 27].includes(code)) this.text += String.fromCharCode(code);

      if ([3, 10, 11, 12, 26, 27].includes(code) || this.text.length === 80) {
        const text = repeated ? this.previous : this.text;
        this.previous = text;
        this.text = ''; this.first = true;
        effects.push({ kind: 'line', text, repeated, terminator: code });
      }
    }
    return effects;
  }
}
