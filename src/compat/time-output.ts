import { rightHalf,signed36 } from './word36.ts';

export type TimeRegisters={x1:bigint;x2:bigint;x3:bigint;x4:bigint;t1:bigint;t2:bigint;c:bigint};
export type TimeOutputServices<W>={
  argument():bigint; // Actual @0(ARG), not a copied host argument.
  idivHours():Generator<W,void,void>; // IDIV X1,[^D1000*^D60*^D60], including literal addressing and CPU effects.
  idivi(pair:'x2'|'x3'|'t1',divisor:bigint):Generator<W,void,void>;
  ochr():Generator<W,void,void>;
};
// WARMAC O2D:2125-2130. Unlike O2DG/O2DB, no SAVE and no hundreds removal.
export function* outputTimePair<W>(r:Pick<TimeRegisters,'t1'|'t2'|'c'>,
  io:Pick<TimeOutputServices<W>,'idivi'|'ochr'>):Generator<W,void,void>{
  yield*io.idivi('t1',10n);r.c=rightHalf(48n+r.t1);yield*io.ochr();r.c=rightHalf(48n+r.t2);yield*io.ochr();
}
// WARMAC OTIM:2110-2122. The overlapping divide pairs end with discarded
// milliseconds in X4. No registers are saved. Later components stay live.
export function* outputTime<W>(r:TimeRegisters,io:TimeOutputServices<W>):Generator<W,void,void>{
  r.x1=signed36(io.argument());yield*io.idivHours();yield*io.idivi('x2',60000n);yield*io.idivi('x3',1000n);
  r.t1=rightHalf(r.x1);yield*outputTimePair(r,io);r.c=58n;yield*io.ochr();
  r.t1=rightHalf(r.x2);yield*outputTimePair(r,io);r.c=58n;yield*io.ochr();
  r.t1=rightHalf(r.x3);yield*outputTimePair(r,io);
}
