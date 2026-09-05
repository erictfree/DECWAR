import { constants as K, messages as M } from '../generated/source-data.ts';
import { equal } from '../compat/parser.ts';
import { add36, divide36, unpackAscii } from '../compat/word36.ts';
import { TerminalOutput } from '../compat/output.ts';
import type { TokenMemory } from '../compat/command-input.ts';
import type { Scores } from './scores.ts';

// POINTS.FOR:28; ENDGAM/GETCMD read TOTAL(1) from the same POLOCL storage.
export class PointLocals {
  readonly total = Array<bigint>(5).fill(0n); // One-based four-word TOTAL.
  fflg = false; eflg = false; rflg = false; iflg = false;
  owidth = 0;
}
export type PointsContext = { who: number; oflg: number; shared: {
  scores: Scores; romopt: bigint;
  players: { shipName1: bigint; shipName2: bigint; ship: { turns: bigint } }[];
} };
export type PointsServices = {
  // Called at label 600 after final-entry label 500, with no executed DO
  // initialization. Return next one-based token slot, or null for label 700.
  // This is a compiler adapter, not a default 'ALL' policy.
  resumeFinalLoop(): number | null;
  // Pre-game WHO=0 can cause a compiler-evaluated SCORE(i,0) read. Require
  // an explicit memory/evaluation adapter instead of assuming JS short circuit.
  pregameScoreRead(category: number): bigint;
};
export class UnresolvedPointsExecution extends Error {}
const shortTitles = [M.poi11s, M.poi12s, M.poi13s, M.poi14s, M.poi15s, M.poi16s, M.poi17s, M.poi18s];
const longTitles = [M.poi11l, M.poi12l, M.poi13l, M.poi14l, M.poi15l, M.poi16l, M.poi17l, M.poi18l];
const annotations = [null, M.poin22, null, M.poin21, M.poin23, M.poin22, M.poin20, M.poin19];

// POINTS.FOR:30-198. Ordinary in-game command paths and the report are
// source-derived. Final DO entry and pre-game memory reads require services.
export function points(ctx: PointsContext, input: TokenMemory, local: PointLocals,
  out: TerminalOutput, final = false, services?: Partial<PointsServices>): void {
  local.total.fill(0n, 1);
  const all = () => { local.fflg = local.eflg = local.rflg = true; local.iflg = ctx.who !== 0; };
  let next: number | null = null, directSelf = false;
  if (final) {
    all();
    if (!services?.resumeFinalLoop) throw new UnresolvedPointsExecution('POINTS final entry jumps into an uninitialized DO loop at label 600');
    next = services.resumeFinalLoop();
  } else {
    local.fflg = local.eflg = local.rflg = local.iflg = false;
    if (input.ntok > 1) next = 2;
    else if (ctx.who !== 0) { local.iflg = true; directSelf = true; }
    else local.fflg = local.eflg = local.rflg = true;
  }
  if (next !== null) {
    if (!Number.isInteger(next) || next < 1 || next > K.KMAXTK) {
      throw new UnresolvedPointsExecution('POINTS compiler continuation requires a representable token-memory address');
    }
    for (let i = next; i <= K.KMAXTK; i++) {
      const token = input.tokens[i - 1];
      if (token.type !== K.KALF) break;
      if (ctx.who !== 0 && (equal(token.text, 'ME') || equal(token.text, 'I'))) local.iflg = true;
      else if (equal(token.text, M.federa.text) || equal(token.text, 'HUMANS')) local.fflg = true;
      else if (equal(token.text, 'EMPIRE') || equal(token.text, 'KLINGONS')) local.eflg = true;
      else if (equal(token.text, 'ROMULANS')) local.rflg = true;
      else if (equal(token.text, 'ALL')) all();
      else { out.out(M.poin04.text, 1); return; }
    }
  }
  if (!directSelf) {
    if (ctx.shared.romopt === 0n) local.rflg = false;
    if (!(local.iflg || local.fflg || local.eflg || local.rflg)) { out.out(M.poin04.text, 1); return; }
  }
  renderPoints(ctx, local, out, services?.pregameScoreRead);
}

function renderPoints(ctx: PointsContext, local: PointLocals, out: TerminalOutput,
  pregameScoreRead?: PointsServices['pregameScoreRead']): void {
  const scores = ctx.shared.scores;
  const playerScore = (category: number) => {
    if (ctx.who !== 0) return scores.player(category, ctx.who);
    if (!pregameScoreRead) throw new UnresolvedPointsExecution('POINTS pre-game SCORE(i,0) memory/evaluation contract is required');
    return pregameScoreRead(category);
  };
  out.crlf(); out.tab(ctx.oflg < 0 ? 14 : ctx.oflg === 0 ? 24 : 31);
  if (local.iflg) {
    out.spaces(1); const p = ctx.shared.players[ctx.who]; out.out(unpackAscii(p.shipName1) + unpackAscii(p.shipName2));
    if (ctx.oflg !== K.SHORT) out.spaces(2);
  }
  if (local.fflg) { out.out(M.federa.text); out.spaces(1); if (ctx.oflg !== K.SHORT) out.spaces(2); }
  if (local.eflg) { out.out(M.empire.text); out.spaces(1); if (ctx.oflg !== K.SHORT) out.spaces(2); }
  if (local.rflg) out.out(M.romula.text);
  out.crlf();
  for (let category = 1; category <= K.KNPOIN; category++) {
    const personal = playerScore(category);
    if (!((local.iflg && personal !== 0n) || (local.fflg && scores.team(1, category) !== 0n)
      || (local.eflg && scores.team(2, category) !== 0n) || (local.rflg && scores.romulan[category] !== 0n))) continue;
    out.out((ctx.oflg === K.SHORT ? shortTitles : longTitles)[category - 1].text);
    if (ctx.oflg === K.LONG) {
      const annotation = annotations[category - 1];
      if (annotation) out.out(annotation.text); else out.tab(26);
    }
    if (local.iflg) { out.oflt(playerScore(category), 11, ctx.oflg); local.total[1] = add36(local.total[1], playerScore(category)); }
    if (local.fflg) { out.oflt(scores.team(1, category), 11, ctx.oflg); local.total[2] = add36(local.total[2], scores.team(1, category)); }
    if (local.eflg) { out.oflt(scores.team(2, category), 11, ctx.oflg); local.total[3] = add36(local.total[3], scores.team(2, category)); }
    if (local.rflg) { out.oflt(scores.romulan[category], 11, ctx.oflg); local.total[4] = add36(local.total[4], scores.romulan[category]); }
    out.crlf();
  }
  const amounts = (values: (() => bigint)[]) => {
    for (const [i, selected] of [local.iflg, local.fflg, local.eflg, local.rflg].entries()) {
      if (selected) out.oflt(values[i](), 11, ctx.oflg);
    }
  };
  out.out((ctx.oflg < 0 ? M.poi03s : M.poi03l).text);
  if (ctx.oflg === K.LONG) out.tab(26);
  amounts([1, 2, 3, 4].map(i => () => local.total[i])); out.crlf();
  if (local.fflg || local.eflg || local.rflg) {
    out.out((ctx.oflg < 0 ? M.poi07s : M.poi07l).text); if (ctx.oflg === K.LONG) out.tab(24);
    local.owidth = ctx.oflg === K.SHORT ? 11 : 13;
    if (local.iflg) out.spaces(local.owidth);
    if (local.fflg) out.odec(scores.ships[1], local.owidth);
    if (local.eflg) out.odec(scores.ships[2], local.owidth);
    if (local.rflg) out.odec(scores.numrom, local.owidth);
    out.out((ctx.oflg < 0 ? M.poi05s : M.poi05l).text); if (ctx.oflg === K.LONG) out.tab(26);
    if (local.iflg) out.spaces(local.owidth);
    if (local.fflg) out.oflt(divide36(local.total[2], scores.ships[1]).quotient, 11, ctx.oflg);
    if (local.eflg) out.oflt(divide36(local.total[3], scores.ships[2]).quotient, 11, ctx.oflg);
    if (local.rflg) out.oflt(divide36(local.total[4], scores.numrom).quotient, 11, ctx.oflg);
  }
  out.out((ctx.oflg < 0 ? M.poi06s : M.poi06l).text); if (ctx.oflg === K.LONG) out.tab(26);
  amounts([() => divide36(local.total[1], ctx.shared.players[ctx.who].ship.turns).quotient,
    () => divide36(local.total[2], scores.turns[1]).quotient, () => divide36(local.total[3], scores.turns[2]).quotient,
    () => divide36(local.total[4], scores.turns[3]).quotient]);
  out.crlf();
}
