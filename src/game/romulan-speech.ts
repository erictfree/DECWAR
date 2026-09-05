import { constants as K, romulanText as T } from '../runtime/variant-values.ts';
import { packSixbit, rightHalf, signed36 } from '../compat/word36.ts';
import type { MessageRegisters } from './message-queue.ts';

export type RomulanSpeechContext = MessageRegisters & { player: bigint; who: number; team: number };
export type RomulanSpeechServices = {
  iran(n: bigint): bigint;
  getlin(): bigint; // Raw GETLIN monitor word: node is its right half.
  readBits(index: number): bigint; // Actual shared BITS, including exceptional indices.
};
export class RomulanSpeechLocals { tmp = 0n; byte = 0; }

// Three-character MACRO SIXBIT immediates fit the right half (also used by
// WARMAC MOVSI 'DSK' and HLRZ/CAIN 'STA':1465-1474). NODNAM puts them in LH.
const nodeCode = (name: string) => packSixbit(name) >> 18n;
function row<T>(table: readonly T[], index: number): T {
  if (!Number.isInteger(index) || index < 0 || index >= table.length)
    throw new RangeError('ROMSPK table address requires original memory');
  return table[index];
}

// WARMAC.MAC:6228-6396, ROMSPK/RMCOPY/RMGPLY. Copy through the original
// seven-bit pointer, retaining the unused word bit and bytes after the NUL.
export function romulanSpeech(ctx: RomulanSpeechContext, buffer: bigint[], local: RomulanSpeechLocals,
  io: RomulanSpeechServices): void {
  if (ctx.player === 0n) {
    local.tmp = io.iran(3n); ctx.dbits = BigInt(row(T.masks, Number(local.tmp - 1n)));
  } else { ctx.dbits = io.readBits(ctx.who); local.tmp = 0n; }
  ctx.dispfr = BigInt(K.DXROM * 100); local.byte = 0;
  const deposit = (code: number) => {
    const index = Math.floor(local.byte / 5), shift = BigInt(29 - local.byte % 5 * 7);
    if (buffer[index] === undefined) throw new RangeError('ROMSPK destination pointer outside supplied memory');
    buffer[index] = signed36((buffer[index] & ~(127n << shift)) | (BigInt(code) << shift)); local.byte++;
  };
  const copy = (text: string) => { for (const char of text) { if (char === '\0') break; deposit(char.charCodeAt(0)); } };
  const lead = Number(io.iran(4n) - 1n);
  // The broadcast table is read even on the single-player path, then replaced.
  let leadText: string = row(T.broadcast, lead).text;
  if (local.tmp === 0n) leadText = row(T.single, lead).text;
  copy(leadText);
  copy(row(T.adjectives, Number(io.iran(5n) - 1n)).text);
  local.tmp--;
  if (local.tmp >= 0n) copy(row(T.populations, Number(local.tmp)).text);
  else copy(playerQuip(ctx, io));
  copy(row(T.objects, Number(io.iran(5n) - 1n)).text);
  if (local.tmp >= 0n) deposit(115);
  deposit(33); deposit(0);
}

function playerQuip(ctx: RomulanSpeechContext, io: RomulanSpeechServices): string {
  if (io.iran(3n) === 1n) {
    let node = rightHalf(io.getlin());
    const found = T.nodes.find(item => nodeCode(item.node) === node);
    if (found) return found.text;
    // Retain the literal ANDI masks, not the CLx/CSx/Qxx matching comments.
    node &= 0o77n;
    if (node === nodeCode('CL ') || node === nodeCode('CS ')) return T.specialNodes[0].text;
    node &= 0o7777n;
    if (node === nodeCode('Q  ')) return T.specialNodes[1].text;
  }
  const choice = io.iran(5n);
  if (choice === 5n) return row(T.teams, ctx.team - 1).text;
  return row(T.generic, Number(choice - 1n)).text;
}
