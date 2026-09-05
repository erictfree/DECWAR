import { TerminalOutput } from '../compat/output.ts';
import { signed36 } from '../compat/word36.ts';
import { gripeText as T } from '../generated/source-data.ts';

export type GripeCore = {
  jbff: number; jbrel: number; flff: number;
  read(address: number): bigint;
  write(address: number, word: bigint): void;
  core(lastAddress: number): boolean;
  warn(text: string): void; // WARN macro: flush/direct OUTSTR only unless hung up.
};

// WARMAC:4727-4731,4983-5001. DBUF pointer starts at .JBFF, before byte one.
// OGCH clears the NEXT twenty words, not the word holding the pointer itself.
export class GripeBuffer {
  base = 0; byte = 0; count = 0;
  initialize(core: GripeCore): void { this.base = core.jbff; this.byte = 0; this.count = 0; }
  get last(): number { return this.base + Math.floor(Math.max(0, this.byte - 1) / 5); }
  deposit(value: bigint, core: GripeCore): boolean {
    this.count--;
    if (this.count < 0) {
      const end = this.last + 20;
      if (end > core.jbrel && !core.core(end)) { core.warn(T[14].text); return false; }
      core.jbff = end;
      for (let address = this.last + 1; address <= end; address++) core.write(address, 0n);
      this.count = 100;
      return this.deposit(value, core);
    }
    const address = this.base + Math.floor(this.byte / 5), shift = BigInt(29 - this.byte % 5 * 7);
    core.write(address, signed36((core.read(address) & ~(127n << shift)) | ((value & 127n) << shift)));
    this.byte++; return true;
  }
}

// SETO changes the character sink but not HCPOS/BLANK. Keeping one formatter
// avoids accidentally resetting cursor state on each switch to/from the log.
export class GripeOutput extends TerminalOutput {
  destination: 'tty' | 'gripe' = 'tty';
  buffer = new GripeBuffer();
  core: GripeCore;
  private terminal = '';
  constructor(core: GripeCore) { super(); this.core = core; }
  override character(value: bigint): void {
    if (this.destination === 'gripe' && !this.buffer.deposit(value, this.core)) return;
    super.character(value);
    const bytes = super.drain();
    if (this.destination === 'tty') this.terminal += bytes;
  }
  override drain(): string { const text = this.terminal; this.terminal = ''; return text; }
}
