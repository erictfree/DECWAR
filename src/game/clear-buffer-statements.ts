// CLRBUF.FOR:24–29. The octal integer is already four packed ASCII bells and
// a zero terminator; preserve it as a word rather than a compiler string.
export function* clearBufferStatements<W>(io:{
  out(word:bigint,lines:bigint):Generator<W,void,void>;
  clear():Generator<W,void,void>;
}):Generator<W,void,void>{
  yield*io.out(0o034160703400n,0n);
  yield*io.clear();
}
