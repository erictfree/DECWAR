import { constants as K } from '../runtime/variant-values.ts';
import { signed36 } from '../compat/word36.ts';
import type { ListSelection } from './list-update.ts';

export type ListWord = { value: bigint };

// LSTVAR.FOR:22-34. The reset range includes both marker words, but excludes
// CMD and the group/traversal locals. Array access is one-based except PXF.
export class ListLocals implements ListSelection {
  readonly outputWords: bigint[] = [];
  private allocate(): ListWord {
    const words = this.outputWords, index = words.length;
    words.push(0n);
    return { get value() { return words[index]; }, set value(value: bigint) { words[index] = signed36(value); } };
  }
  private array(size: number): ListWord[] {
    return [undefined as unknown as ListWord, ...Array.from({ length: size }, () => this.allocate())];
  }
  readonly lstfz = this.allocate();
  readonly shpctr = this.array(2);
  readonly shplst = this.array(K.KNPLAY);
  readonly sxf = this.array(2);
  readonly romctr = this.allocate(); readonly romlst = this.allocate(); readonly rxf = this.allocate();
  readonly basctr = this.array(2);
  readonly baslst = [undefined as unknown as ListWord[], this.array(K.KNBASE), this.array(K.KNBASE)]; // [side][index]
  readonly bxf = this.array(2);
  readonly plnctr = this.allocate(); readonly plnlst = this.array(K.KNPLNT);
  readonly pxf = Array.from({ length: 3 }, () => this.allocate());
  readonly targetFlags = this.allocate(); readonly lstlz = this.allocate();
  get txf(): bigint { return this.targetFlags.value; }
  set txf(value: bigint) { this.targetFlags.value = value; }
  cmd = 0; svpos = 0; shpos = 0;
  p = 0; omask = 0n; smask = 0n; lmask = 0n; imask = 0n; ships = 0n; range = 0n;
  vpos = 0; hpos = 0; gxf = 0n; vposc = 0; hposc = 0; clsest = 0n;
  xf = 0n; grpbts = 0n; code = 0; object = 0; index = 0; side = 0;
  // Session inputs, outside /LOCAL/. The driver refreshes these from context.
  team = 0; password = false;
  clearOutput(): void { this.outputWords.fill(0n); }
}

// BLKDAT.FOR:96-99. Unknown indexes require the caller's memory model.
export function listSideBit(side: number): bigint {
  const value = [K.NEUBIT, K.FEDBIT, K.EMPBIT][side];
  if (value === undefined) throw new RangeError('SBITS index outside declared 0:2 storage');
  return BigInt(value);
}
