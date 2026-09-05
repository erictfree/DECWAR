import { constants as K } from '../runtime/variant-values.ts';
import { CommandScanner } from './parser.ts';
import type { ParsedCommand, Token } from './parser.ts';
import { TerminalOutput } from './output.ts';

// LOWSEG token arrays and WARMAC GTKN:1670-1732. This is the token-storage /
// command-tail layer; monitor reads, locks and interrupts remain separate.
export class TokenMemory {
  readonly tokens: Token[];
  private count: { value:number };
  constructor(storage?: { tokens:Token[]; count:{ value:number } }) {
    this.tokens = storage?.tokens ?? Array.from({ length: K.KMAXTK }, () => ({ text: '', type: 0, value: 0n, offset: 0 }));
    this.count = storage?.count ?? { value:0 };
  }
  get ntok():number { return this.count.value; } set ntok(n:number) { this.count.value=n; }
  load(command: ParsedCommand): void {
    for (const [i, token] of command.scanned.entries()) Object.assign(this.tokens[i], token);
    this.ntok = command.tokens.length - 1;
    // GTKN.5 writes EOL type/value/text, but does not write PTRLST here.
    Object.assign(this.tokens[this.ntok], { text: '', type: K.KEOL, value: 0n });
  }
}

export class CommandInput extends TokenMemory {
  private localLine = '';
  private localRepeated = false;
  get rawLine():string { return this.localLine; } set rawLine(s:string) { this.localLine=s; }
  get repeated():boolean { return this.localRepeated; } set repeated(value:boolean) { this.localRepeated=value; }
  private scanner?: CommandScanner;
  private continuation = false;
  get available(): boolean { return this.scanner?.pending ?? false; }
  characterAt(offset:number):number { return this.rawLine.charCodeAt(offset) || 0; }
  prepareRead(interrupted:boolean,out:TerminalOutput):boolean {
    if(interrupted)this.discardTail(); return this.available;
  }
  beginLine():void {}
  acceptEditedLine(line:string,repeated=false):void { this.acceptLine(line,repeated); }
  startLine():void {}
  forceQuit():void {
    this.tokens[0].type=K.KALF;this.tokens[0].text='QUIT';
    // GTKN's AOJA preserves HRLZI X1,-(KMAXTK-1) in the stored result.
    this.ntok=-(K.KMAXTK-1)*262144+1;
    this.tokens[1].type=K.KEOL;this.tokens[1].value=0n;this.tokens[1].text='';
  }

  // Input has already passed through INLI/LineInput; never silently truncate.
  acceptLine(line: string, repeated = false): void {
    if (line.length > 80 || /[\0\r\n]/.test(line)) throw new RangeError('An edited input line must fit LINBUF');
    this.scanner = new CommandScanner(line);
    this.rawLine = line;
    this.repeated = repeated;
    this.continuation = false;
  }
  acquire(out: TerminalOutput): boolean {
    const command = this.scanner?.next();
    if (!command) return false;
    if (this.continuation) out.crlf(); // GTKN's multiple-command path calls OCRL.
    this.continuation = true;
    this.load(command);
    if (command.error) out.out('Too many words -- line ignored', 1); // WARMAC:1714 ASCIL.
    return true;
  }
  discardTail(): void { this.scanner = undefined; }
}

// Compose existing GTKN-suspending command ports with the same token memory.
// A yielded 'line' means the host must supply an edited line via acceptLine.
// This does not emit monitor echo, acquire locks, or masquerade as GETCMD.
export function* resumeCommand<T>(command: Generator<'input', T, readonly Token[]>, input: CommandInput,
  out: TerminalOutput): Generator<'line', T, void> {
  let state = command.next();
  while (!state.done) {
    while (!input.acquire(out)) yield 'line';
    state = command.next(input.tokens);
  }
  return state.value;
}
