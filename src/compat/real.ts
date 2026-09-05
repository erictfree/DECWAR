// Required FORTRAN/PDP-10 real operations. R is an opaque runtime value, not
// JavaScript Number. The archive alone does not establish rounding, traps,
// compiled constants or conversion policy; no production implementation is
// selected here. Calls preserve expression order and conversion boundaries.
export type RealArithmetic<R> = {
  literal(text: string): R;
  fromInteger(value: bigint): R;
  toInteger(value: R): bigint;
  add(left: R, right: R): R;
  subtract(left: R, right: R): R;
  multiply(left: R, right: R): R;
  divide(left: R, right: R): R;
};
