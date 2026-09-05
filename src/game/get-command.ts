import { constants as K, messages as M } from '../runtime/variant-values.ts';
import { CommandInput } from '../compat/command-input.ts';
import { resolveCommand } from '../compat/parser.ts';
import { TerminalOutput } from '../compat/output.ts';
import { add36, multiply36, unpackAscii } from '../compat/word36.ts';
import { etim } from '../compat/time.ts';
import { objectText } from './format.ts';
import { prompt } from './prompt.ts';
import type { CommandWordReader } from './data-initialization.ts';
import type { Ship } from './ship.ts';

export type CommandPlayer = { ship: Ship; active: bigint; hitflg: bigint; msgflg: bigint;
  ppn: bigint; name1: bigint; name2: bigint; shipName1: bigint; shipName2: bigint; started: bigint };
export type CommandContext = { who: number; team: number; oflg: number; prtype: number;
  pasflg: bigint; ptime: bigint; ccflg: bigint; hungup: bigint;
  shared: { players: CommandPlayer[]; comknt: bigint; numply: bigint } };
export type StatisticsRecord = { ppn: bigint; name1: bigint; name2: bigint; shipName1: bigint;
  shipName2: bigint; total: bigint; elapsed: bigint; why: bigint; teamIndex: number; who: number };
export type CommandResult = { kind: 'command'; id: number } | { kind: 'dead' };

// Every unported dependency is mandatory; no successful no-op game routines.
// Generators let queues, locks, statistics and input retain their own waits.
export type GetCommandServices<W> = {
  commandWord?: CommandWordReader; // Live ISAYDO binding; omitted only for component fixtures.
  ttyon(): void;
  dmpbuf(): void;
  cctrap(): void; // Zero-argument FORLIB trap address remains an adapter concern.
  pause(milliseconds: () => bigint): Generator<W, void, void>;
  zaplok(): Generator<W, void, void>;
  input(milliseconds: bigint): Generator<W, boolean, void>;
  gtkn(): Generator<W, void, void>;
  clear(): void;
  outhit(): Generator<W, void, void>;
  outmsg(): Generator<W, void, void>;
  endgam(): Generator<W, void, void>; // Game end must terminate, not resume here.
  daytime(): bigint;
  points(final: true): Generator<W, bigint, void>; // Returns POLOCL TOTAL(1).
  updsta(record: StatisticsRecord): Generator<W, void, void>;
  free(who: number): Generator<W, void, void>;
};

// GETCMD.FOR:33-131. CHKSEQ and PRGNAM immediately POPJ in this supplied
// WARMAC (3677,4052); the DSHIP call at GETCMD:65 is commented out.
export function* getCommand<W>(ctx: CommandContext, input: CommandInput, out: TerminalOutput,
  io: GetCommandServices<W>): Generator<W, CommandResult, void> {
  const player = () => {
    const p = ctx.shared.players[ctx.who];
    if (ctx.who < 1 || !p) throw new RangeError('GETCMD requires a current player');
    return p;
  };
  function* notifications(): Generator<W, void, void> {
    io.ttyon();
    if (player().hitflg !== 0n) yield* io.outhit();
    io.ttyon();
    if (player().msgflg !== 0n) yield* io.outmsg();
  }
  yield* notifications();
  io.dmpbuf();
  io.cctrap();
  ctx.ccflg = 0n; // CCTRAP's explicit flag clear, independent of trap address.
  if (ctx.pasflg === 0n) yield* io.pause(() => ctx.ptime);
  ctx.ptime = 0n;

  commandLoop: for (;;) { // GETCMD label 100.
    out.crlf();
    const ship = player().ship;
    if (ship.damage >= BigInt(K.KENDAM) || ship.energy <= 0n) {
      if (ship.damage < BigInt(K.KENDAM)) {
        out.out(objectText(BigInt(ctx.team * 100 + ctx.who), ctx.oflg, 1));
        out.out(M.main02.text, 1);
      }
      const p = player();
      // Snapshot identity before POINTS/FREE; they may mutate shared storage.
      const record = { ppn: p.ppn, name1: p.name1, name2: p.name2,
        shipName1: p.shipName1, shipName2: p.shipName2,
        elapsed: etim(p.started, io.daytime()), why: 0n, teamIndex: ctx.team - 1 };
      const total = yield* io.points(true);
      yield* io.updsta({ ...record, total, who: ctx.who });
      yield* io.free(ctx.who);
      ctx.who = 0;
      return { kind: 'dead' };
    }
    if (ship.energy <= 10000n) ship.condition = K.YELLOW;
    if (ship.condition === K.YELLOW) out.out(unpackAscii(0o034160703400n));
    io.ttyon();
    yield* io.endgam();
    ctx.ccflg = 0n;
    out.out(prompt({ prtype: ctx.prtype, lifeDamage: ship.devices[K.KDLIFE], lifeReserves: ship.lifeReserves,
      shieldStrength: ship.shieldStrength, shieldCondition: ship.shieldCondition, shipDamage: ship.damage, energy: ship.energy }));
    io.dmpbuf();
    let forcedQuit = false;
    for (;;) { // GETCMD label 200.
      yield* io.zaplok();
      if (ctx.ccflg === 0n && ctx.hungup === 0n) {
        if (yield* io.input(BigInt(K.KCMDTM))) {
          player().active = 0n;
          if (ctx.hungup !== 0n) { forcedQuit = true; break; }
          ctx.shared.comknt = add36(ctx.shared.comknt, 1n);
          yield* io.gtkn();
          if (ctx.ccflg === 0n) {
            if (input.tokens[0].type === K.KEOL) continue commandLoop;
            break;
          }
          if (player().ship.condition !== K.RED) { forcedQuit = true; break; }
          out.out(M.noquit.text, 1);
          io.clear();
          continue commandLoop;
        }
        if (ctx.hungup !== 0n) { forcedQuit = true; break; }
      }
      // Already-set CCFLG/HUNGUP reaches 210, not the forced-QUIT path.
      player().active = 0n;
      ctx.shared.comknt = add36(ctx.shared.comknt, 1n);
      if (ctx.shared.comknt >= multiply36(30n, ctx.shared.numply)) ctx.shared.comknt = 0n;
      if (player().hitflg !== 0n || player().msgflg !== 0n) {
        yield* notifications();
        continue commandLoop;
      }
      yield* io.endgam();
    }
    if (forcedQuit) Object.assign(input.tokens[0], { text: 'QUIT', type: K.KALF });
    // Forced QUIT leaves NTOK, VALLST, PTRLST and all other tokens unchanged.
    const command = resolveCommand(input.tokens[0].text, 'game', io.commandWord);
    if (command.kind === 'command') return { kind: 'command', id: command.id };
    out.out(command.kind === 'ambiguous' ? M.ambcom.text : M.unkcom.text);
    if (ctx.oflg !== K.SHORT) out.out(M.forhlp.text);
    out.crlf();
  }
}
