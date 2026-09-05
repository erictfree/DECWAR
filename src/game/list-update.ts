import { constants as K } from '../runtime/variant-values.ts';
import { pdist } from '../compat/board.ts';
import { add36, signed36 } from '../compat/word36.ts';

type Word = { value: bigint };
export type ListSelection = {
  svpos: number; shpos: number; vpos: number; hpos: number;
  side: number; team: number; password: boolean; range: bigint;
  gxf: bigint; xf: bigint; imask: bigint; grpbts: bigint; txf: bigint;
  clsest: bigint; vposc: number; hposc: number;
};
const LST = BigInt(K.LSTBIT), SUM = BigInt(K.SUMBIT), IGM = BigInt(K.IGMBIT),
  ORN = BigInt(K.ORNBIT), KNO = BigInt(K.KNOBIT), PAS = BigInt(K.PASBIT), CLS = BigInt(K.CLSBIT);
const distanceFlags = BigInt(K.IRNBIT | K.ISRBIT | K.IGMBIT | K.ORNBIT);

// LSTUPD.FOR:31-64. Mutable word arguments preserve aliases such as
// LSTUPD(DUMMY,DUMMY,-1,DUMMY); no masks/counters are captured before writes.
export function updateListSelection(s: ListSelection, lstmsk: Word, objctr: Word, scnbts: Word, xxf: Word): void {
  const d = BigInt(pdist(s.svpos, s.shpos, s.vpos, s.hpos));
  s.xf = s.gxf;
  let summaryOnly = false, visible = true;
  if (d > BigInt(K.KRANGE) && s.side !== s.team) {
    if (s.password) s.xf = signed36(s.xf | PAS);
    else {
      s.xf = signed36(s.xf | ORN);
      if (s.range > BigInt(K.KRANGE)) {
        s.grpbts = signed36(s.grpbts | KNO);
        if ((s.xf & IGM) === 0n) s.xf = signed36(s.xf | KNO);
      }
      s.txf = signed36(s.txf | s.xf);
      if ((scnbts.value & BigInt(s.team)) === 0n) {
        if ((s.xf & SUM) !== 0n && (s.xf & IGM) !== 0n) {
          s.xf = signed36(s.xf & ~LST); summaryOnly = true;
        } else visible = false;
      }
    }
  }
  if (summaryOnly || (visible && d <= s.range && (s.imask & CLS) === 0n)) {
    lstmsk.value = signed36(lstmsk.value | s.xf);
    objctr.value = add36(objctr.value, 1n);
    s.grpbts = signed36(s.grpbts | s.xf);
    xxf.value = signed36(xxf.value | s.xf);
    return;
  }
  if (visible && d <= s.range && (s.imask & CLS) !== 0n && d <= s.clsest) {
    s.clsest = d; s.vposc = s.vpos; s.hposc = s.hpos;
  }
  s.grpbts = signed36(s.grpbts | (s.xf & distanceFlags));
  xxf.value = signed36(xxf.value | s.xf);
}
