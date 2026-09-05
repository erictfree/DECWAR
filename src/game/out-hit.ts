import { constants as K, messages as M } from '../runtime/variant-values.ts';
import { formatTenths, TerminalOutput } from '../compat/output.ts';
import { multiply36 } from '../compat/word36.ts';
import { deviceText, objectText, prloc } from './format.ts';
import { emptyHit } from './hit-queue.ts';
import type { HitRegisters } from './hit-queue.ts';
import type { Ship } from './ship.ts';

export type HitOutputContext = { who: number; team: number; oflg: number; ocflg: number; nomsg: bigint; ship: Ship };

// OUTHIT.FOR:39-286. Clear all 17 contiguous LOWSEG words, including DBITS,
// before every count check. A callback may suspend while preserving the same
// registers. Negative counts are not silently repaired into empty queues.
export function* outHit<W>(ctx: HitOutputContext, registers: HitRegisters,
  flags: { hitflg: bigint }[], out: TerminalOutput,
  gethit: (who: number) => Generator<W, void, void>): Generator<W, void, void> {
  for (;;) {
    Object.assign(registers, emptyHit(), { dbits: 0n });
    if (flags[ctx.who].hitflg === 0n) return;
    if (ctx.oflg === K.LONG) out.crlf();
    yield* gethit(ctx.who);
    renderHit(ctx, registers, out);
  }
}

// One decoded event. Register packing and queue ordering are separate from
// the FORTRAN renderer, allowing each layer to be checked independently.
export function renderHit(ctx: HitOutputContext, hit: HitRegisters, out: TerminalOutput): void {
  const v = ctx.oflg, long = v === K.LONG, short = v === K.SHORT;
  const obj = (code: bigint, space = 0) => out.out(objectText(code, v, space));
  const loc = (vertical: bigint, horizontal: bigint, cr = 0, verbosity = v) =>
    prloc(out, Number(vertical), Number(horizontal), ctx.ship.v, ctx.ship.h, cr, 0, ctx.ocflg, verbosity);
  const percent = (condition: bigint, strength: bigint) => {
    out.write(formatTenths(multiply36(condition, strength), 0, v, true));
    if (!short) out.write('%');
  };
  const type = hit.iwhat;
  if (type < 1n || type > 15n) return; // Computed GOTO falls through to label 100.
  if (type === 4n || type === 5n || type === 15n) {
    out.out(v <= 0 ? 'T' : M.tormis.text); out.odec(hit.critdv);
    out.out(type === 4n ? v <= 0 ? M.outh13.text : M.outh12.text
      : type === 5n ? v <= 0 ? M.outh15.text : M.outh14.text
        : v <= 0 ? M.outh28.text : M.outh27.text);
    loc(hit.vto, hit.hto, 1); return;
  }
  if (type === 9n || type === 10n) {
    if (ctx.ship.devices[K.KDRAD] > BigInt(K.KCRIT) || (ctx.nomsg & (1n << BigInt(ctx.who - 1))) !== 0n) return;
    obj(hit.dispto, 1); loc(hit.vto, hit.hto);
    if (v < 0) { out.write(type === 9n ? ' A' : ' D'); out.crlf(); }
    else out.out(type === 9n ? v === 0 ? M.outh17.text : M.outh16.text
      : v === 0 ? M.outh19.text : M.outh18.text, 1);
    return;
  }
  if (type === 11n) {
    obj(hit.dispfr, 1); if (long) out.out(M.outh20.text);
    out.spaces(1); loc(hit.vfrom, hit.hfrom, 1); return;
  }
  if (type === 12n) {
    obj(hit.dispfr, 1); if (long) out.out(M.outh21.text);
    out.oflt(hit.ihita, 0, v); out.out(v <= 0 ? ' >' : M.outh22.text);
    out.spaces(1); obj(hit.dispto, 1); out.crlf(); return;
  }
  if (type === 13n || type === 14n) {
    out.out(type === 13n ? v <= 0 ? M.outh24.text : M.outh23.text
      : v <= 0 ? M.outh26.text : M.outh25.text, 1); return;
  }

  // Labels 200-4500: phaser/torpedo/deflection and star events.
  const fromClass = hit.dispfr / 100n, toClass = hit.dispto / 100n;
  const planet = (kind: bigint) => kind >= BigInt(K.DXNPLN) && kind <= BigInt(K.DXEPLN);
  function planetStrength(kind: bigint, strength: bigint): void {
    if (!planet(kind) || strength === 0n) return;
    if (long) out.write('('); out.odec(strength); if (long) out.write(')');
  }
  obj(hit.dispfr); planetStrength(fromClass, hit.shstfr);
  out.spaces(1); loc(hit.vfrom, hit.hfrom);
  if (!short && fromClass < BigInt(K.DXROM)) out.write(',');
  if (fromClass <= BigInt(K.DXROM)) { out.spaces(1); percent(hit.shcnfr, hit.shstfr); }
  out.spaces(1);
  if (type === 7n || type === 6n) {
    out.out(type === 7n ? v <= 0 ? 'N' : M.outh01.text : v <= 0 ? 'U' : M.star02.text);
    out.crlf(); return;
  }
  if (type === 3n && v >= 0) out.out(v === 0 ? M.outh29.text : M.outh30.text);
  else {
    if (long) out.out(M.outh02.text);
    out.spaces(1);
    if (toClass <= BigInt(K.DXROM)) {
      out.oflt(hit.ihita, 0, v); if (!short) out.out(M.outh03.text);
    }
    out.out(type === 8n ? v <= 0 ? 'N' : M.outh04.text
      : type === 1n ? v <= 0 ? 'P' : M.outh06.text
        : v <= 0 ? 'T' : M.outh05.text);
  }
  if (v <= 0) out.spaces(2);
  else if (toClass < BigInt(K.DXROM) && out.hcpos > 40) out.crlf();
  obj(hit.dispto); planetStrength(toClass, hit.shstto); out.spaces(1);
  if (hit.shjump !== 0n) out.out(v < 0 ? '>' : v === 0 ? '-->' : M.displc.text);
  else if (!short) out.write('@');
  loc(hit.vto, hit.hto, 0, K.SHORT);
  if (toClass <= BigInt(K.DXROM) && hit.klflg === 0n) {
    if (!short) out.write(','); out.spaces(1); percent(hit.shcnto, hit.shstto);
    if (hit.dispto === BigInt(ctx.who + ctx.team * 100) && hit.critdv !== 0n) {
      out.write('; '); out.out(deviceText(Number(hit.critdv), v));
      out.out(v < 0 ? ' ' : v === 0 ? M.outh08.text : M.outh07.text);
      out.oflt(hit.critdm, 0, v); if (long) out.out(M.units1.text);
    }
  }
  if (long && (toClass === BigInt(K.DXFBAS) || toClass === BigInt(K.DXEBAS))) {
    if (hit.klflg === 0n && hit.critdm === 0n) { out.crlf(); return; }
    out.spaces(2); if (hit.klflg !== 0n) out.crlf();
    out.out(M.outh31.text, 1); out.out(M.outh32.text, 1);
    if (hit.klflg === 0n) { out.out(M.outh33.text, 1); out.crlf(); return; }
    out.out(M.outh34.text);
  }
  if (hit.klflg !== 0n) {
    out.spaces(1); if (long) out.crlf();
    if (hit.klflg !== 2n) { obj(hit.dispto); out.out(v <= 0 ? M.outh10.text : M.outh09.text, 1); }
    obj(hit.dispto, 1); out.out(M.destry.text, 1);
  }
  out.crlf();
}
