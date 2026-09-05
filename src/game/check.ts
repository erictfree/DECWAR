import type { RealArithmetic } from '../compat/real.ts';
import { add36, signed36 } from '../compat/word36.ts';
import type { WordReference } from './lifecycle.ts';

const abs = (n: bigint) => n < 0n ? signed36(-n) : n;

// CHKPNT.FOR:29-41. Integer hundredths are compared strictly, irrespective of
// the prose comment's endpoints. Preserve C1 then C2 writes (including aliases).
export function checkPoint<R>(c: R, c1: WordReference, c2: WordReference, real: RealArithmetic<R>): void {
  const fraction = real.toInteger(real.multiply(c, real.fromInteger(100n))) % 100n;
  if (abs(add36(fraction, -50n)) < 10n) {
    c1.value = real.toInteger(c); c2.value = add36(c1.value, 1n);
  } else { c1.value = real.toInteger(real.add(c, real.literal('.5'))); c2.value = 0n; }
}

// Names follow CHECK's /CHKOUT/ declaration. MOVE calls its first word V1,
// second H1, etc.; callers bind by physical order, not by spelling.
export type CheckOutput<R> = { h1: bigint; v1: bigint; h2: bigint; v2: bigint; dcode: bigint; dhs: R; dvs: R };
export class CheckLocals<R> {
  inc = 0n; i = 0n; iv1 = { value: 0n }; iv2 = { value: 0n }; ih1 = { value: 0n }; ih2 = { value: 0n };
  rh: R; rv: R;
  constructor(priorReal: R) { this.rh = priorReal; this.rv = priorReal; }
}
export type CheckServices<R> = {
  real: RealArithmetic<R>; ran(zero: 0): R;
  ingal(first: bigint, second: bigint): boolean;
  disp(first: bigint, second: bigint): bigint;
  reversedLoop?(first: bigint, last: bigint): { iterations: readonly bigint[]; after: bigint };
};

// CHECK.FOR:36-97. Services expose actual board-read order, including the second
// DISP at label 800. Positive cells block; zero and negative cells are traversed.
export function check<R>(h: WordReference, v: WordReference, dh: WordReference, dv: WordReference,
  dist: WordReference, displ: { value: R }, out: CheckOutput<R>, local: CheckLocals<R>, io: CheckServices<R>): void {
  const real = io.real;
  out.h1 = h.value; out.v1 = v.value; out.dcode = 0n;
  const vertical = abs(dv.value) > abs(dh.value);
  if (!vertical) {
    local.inc = dh.value < 0n ? -1n : 1n; out.dhs = real.fromInteger(local.inc);
    out.dvs = real.add(real.divide(real.fromInteger(dv.value), real.fromInteger(abs(dh.value))), displ.value);
    out.h2 = h.value; local.rv = real.fromInteger(v.value);
  } else {
    local.inc = dv.value < 0n ? -1n : 1n; out.dvs = real.fromInteger(local.inc);
    out.dhs = real.add(real.divide(real.fromInteger(dh.value), real.fromInteger(abs(dv.value))), displ.value);
    out.v2 = v.value; local.rh = real.fromInteger(h.value);
  }
  const limit = dist.value;
  const reversed = limit < 1n ? io.reversedLoop?.(1n, limit) : undefined;
  if (limit < 1n && !reversed) throw new Error('CHECK reversed DO bounds require the compiler contract');
  function* iterations() { if (reversed) yield* reversed.iterations; else for (let i = 1n; i <= limit; i++) yield i; }
  const boundary = () => { out.h2 = out.h1; out.v2 = out.v1; };
  const collision = () => { out.dcode = io.disp(out.h2, out.v2); };
  for (local.i of iterations()) {
    if (!vertical) {
      out.h2 = add36(out.h2, local.inc); if (!io.ingal(5n, out.h2)) { boundary(); return; }
      local.rv = real.add(local.rv, out.dvs); checkPoint(local.rv, local.iv1, local.iv2, real);
      if (!io.ingal(local.iv1.value, 5n)) { boundary(); return; }
      out.v2 = local.iv1.value; if (io.disp(out.h2, out.v2) > 0n) { collision(); return; }
      if (local.iv2.value !== 0n) {
        if (!io.ingal(local.iv2.value, 5n)) { boundary(); return; }
        out.v2 = local.iv2.value; if (io.disp(out.h2, out.v2) > 0n) { collision(); return; }
        out.v1 = real.toInteger(real.add(local.rv, io.ran(0)));
      } else out.v1 = real.toInteger(real.add(local.rv, real.literal('.5')));
      out.h1 = out.h2;
    } else {
      out.v2 = add36(out.v2, local.inc); if (!io.ingal(out.v2, 5n)) { boundary(); return; }
      local.rh = real.add(local.rh, out.dhs); checkPoint(local.rh, local.ih1, local.ih2, real);
      if (!io.ingal(5n, local.ih1.value)) { boundary(); return; }
      out.h2 = local.ih1.value; if (io.disp(out.h2, out.v2) > 0n) { collision(); return; }
      if (local.ih2.value !== 0n) {
        if (!io.ingal(5n, local.ih2.value)) { boundary(); return; }
        out.h2 = local.ih2.value; if (io.disp(out.h2, out.v2) > 0n) { collision(); return; }
        out.h1 = real.toInteger(real.add(local.rh, io.ran(0)));
      } else out.h1 = real.toInteger(real.add(local.rh, real.literal('.5')));
      out.v1 = out.v2;
    }
  }
  local.i = reversed ? reversed.after : add36(limit, 1n);
  if (vertical) out.h2 = out.h1; else out.v2 = out.v1;
}
