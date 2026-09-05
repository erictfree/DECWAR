import { constants as K, messages as M, outputTables as T, pregameIdentityLabel } from '../generated/source-data.ts';
import { add36, leftHalf, rightHalf, signed36, unpackSixbit } from '../compat/word36.ts';
import { formatInteger, TerminalOutput } from '../compat/output.ts';
import { prloc } from './format.ts';
import type { CommonBlock } from '../compat/memory.ts';

export type IdentityFields = { name1: bigint; name2: bigint; speed: bigint; ppn: bigint; tty: bigint; job: bigint };
type Field = keyof IdentityFields;

// WARMAC.MAC:2603-2708. Every stage increments the source's negative item
// counter, and reads fields only after its preceding output operations.
function identityRow(counter: bigint, shipName: () => string, read: (field: Field) => bigint,
  jobWidth: number, out: TerminalOutput): void {
  let remaining = signed36(counter);
  const next = () => { remaining = add36(remaining, 1n); return remaining <= 0n; };
  if (!next()) return;
  const start = out.hcpos;
  out.out(shipName()); out.spaces(start - out.hcpos + 10);
  if (!next()) return;
  out.spaces(1); out.write(unpackSixbit(read('name1'))); out.write(unpackSixbit(read('name2')));
  if (!next()) return;
  out.spaces(1); out.odec(read('speed'), 4);
  if (!next()) return;
  out.spaces(2); out.write(formatInteger(leftHalf(read('ppn')), -6, 'negative', 8)); out.write(',');
  const programmer = formatInteger(rightHalf(read('ppn')), 0, 'negative', 8);
  out.write(programmer); out.spaces(5 - programmer.length);
  if (!next()) return;
  out.spaces(1); out.write(unpackSixbit(read('tty')));
  if (!next()) return;
  out.spaces(2); out.odec(read('job'), jobWidth);
}

// STAT/STAT.X: source ship names use the long-name ASCIZ table, independent
// of OFLG. JOB fields use the live shared backing words.
export function stat(num: bigint, who: number, players: readonly { job: readonly bigint[] }[], out: TerminalOutput): void {
  const fields = { name1: K.KNAM1, name2: K.KNAM2, speed: K.KTTYSP, ppn: K.KPPN, tty: K.KTTYN, job: K.KJOB };
  identityRow(signed36(-num), () => {
    const text = T.lngshp[who - 1]?.text;
    if (text == null) throw new RangeError('STAT ship lookup outside the source table');
    return text;
  }, field => players[who].job[fields[field]], 3, out);
}

// STAT.Y is an internal entry: pass the actual X4 register. Its OSTS caller
// must resolve MOVNI X4,-100 through the immediate effective-address width.
export function pregameStat(counter: bigint, identity: IdentityFields, out: TerminalOutput): void {
  identityRow(counter, () => pregameIdentityLabel.text, field => identity[field], 2, out);
}

export type UsersContext = { oflg: number; ocflg: number; password: boolean;
  players: readonly { alive: bigint; job: readonly bigint[]; ship: { v: number; h: number } }[] };
export type UsersServices = {
  alive(word: bigint): boolean; // Required FORTRAN signed-logical adapter.
  ownPosition(): { v: number; h: number }; // Includes pre-game WHO=0 memory policy.
};

// USERS.FOR:35-55. The short/medium field-count branches are commented out;
// every selected ship calls STAT(6,I+0). The team divider is unconditional.
export function users(ctx: UsersContext, out: TerminalOutput, io: UsersServices): void {
  out.crlf();
  if (ctx.oflg === K.LONG) {
    out.out(M.users1.text); if (ctx.password) out.out(M.users2.text); out.crlf();
  }
  for (let i = 1; i <= K.KNPLAY; i++) {
    if (i === K.KNPLAY / 2 + 1) out.out(M.users5.text, 1);
    if (!io.alive(ctx.players[i].alive)) continue;
    stat(6n, i, ctx.players, out);
    if (ctx.password) {
      out.spaces(3);
      const own = io.ownPosition(), ship = ctx.players[i].ship;
      prloc(out, ship.v, ship.h, own.v, own.h, 0, 2, ctx.ocflg, K.SHORT);
    }
    out.crlf();
  }
}

export type UsersStatementServices<W>={
  logical(word:bigint):boolean; // Required compiler LOGICAL interpretation for ALIVE/PASFLG.
  out(message:'users1'|'users2'|'users5',lines:0|1):Generator<W,void,void>;
  crlf():Generator<W,void,void>;spaces(count:bigint):Generator<W,void,void>;
  stat(countAddress:bigint,playerValue:bigint):Generator<W,void,void>; // NUM by reference; I+0 is an expression temporary.
  prloc(vAddress:bigint,hAddress:bigint,modeAddress:bigint):Generator<W,void,void>; // Other source arguments are 0,2,SHORT.
};
// USERS.FOR:35-55. I/NUM are required compiler-local words, not LOCAL/LINE.
// This is the integer DO statement path; compiler-specific exceptional changes
// to its control variable remain outside the routine-body model.
export function* usersStatements<W>(high:CommonBlock,low:CommonBlock,locals:{i:bigint;num:bigint},io:UsersStatementServices<W>):Generator<W,void,void>{
  const m=low.memory;yield*io.crlf();
  if(low.read('oflg')===BigInt(K.LONG)){
    yield*io.out('users1',0);if(io.logical(low.read('pasflg')))yield*io.out('users2',0);yield*io.crlf();
  }
  for(m.write(locals.i,1n);m.read(locals.i)<=BigInt(K.KNPLAY);m.write(locals.i,add36(m.read(locals.i),1n))){
    if(m.read(locals.i)===BigInt(K.KNPLAY/2+1))yield*io.out('users5',1);
    if(!io.logical(high.read('alive',m.read(locals.i))))continue;
    m.write(locals.num,6n);yield*io.stat(locals.num,add36(m.read(locals.i),0n));
    if(io.logical(low.read('pasflg'))){
      yield*io.spaces(3n);yield*io.prloc(high.address('shpcon',m.read(locals.i),K.KVPOS),high.address('shpcon',m.read(locals.i),K.KHPOS),low.address('ocflg'));
    }
    yield*io.crlf();
  }
}
