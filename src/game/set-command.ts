import { constants as K, messages as M, terminalWords } from '../generated/source-data.ts';
import { PackedBoard } from '../compat/board.ts';
import { equal } from '../compat/parser.ts';
import type { Token } from '../compat/parser.ts';
import { TerminalOutput } from '../compat/output.ts';
import type { OutputSettings } from './type-command.ts';

export type SetContext = { settings: OutputSettings; password: bigint; board: PackedBoard; romopt: bigint; endflg: bigint };
export type SetServices = { usrnam(precedingToken: number): boolean; endgam(): void; terminalWord?: (column: number, index: number) => string };

// SET.FOR:35-156. Hooks are required for USRNAM's raw-line/JOB access and
// ENDGAM, rather than treating those branches as successful no-ops.
export function* setCommand(context: SetContext, tokens: readonly Token[], out: TerminalOutput,
  services: SetServices): Generator<'input', void, readonly Token[]> {
  let p = 2;
  const switches = ['NAME', 'OUTPUT', 'TTYTYPE', 'PROMPT', 'SCANS', 'ICDEF', 'OCDEF'];
  let option: string | undefined;
  while (!option) {
    if (tokens[p - 1]?.type === K.KALF) {
      const table = context.password !== 0n ? [...switches, 'ROMOPT', 'ENDFLG', 'BHREMV'] : switches;
      option = table.find(name => equal(tokens[p - 1].text, name));
    }
    if (option) break;
    out.out(M.set001.text);
    tokens = yield 'input';
    if (tokens[0]?.type === K.KEOL) return;
    p = 1;
  }
  if (option === 'NAME') {
    if (services.usrnam(p)) return;
    out.out(M.set002.text);
    tokens = yield 'input';
    services.usrnam(0);
    return;
  }
  if (option === 'ROMOPT') { context.romopt = -1n; return; }
  if (option === 'ENDFLG') { context.endflg = -1n; services.endgam(); return; }
  if (option === 'BHREMV') {
    for (let v = 1; v <= K.KGALV; v++) for (let h = 1; h <= K.KGALH; h++) {
      if (context.board.dispc(v, h) === K.DXBHOL) context.board.setdsp(v, h, 0);
    }
    return; // Source does not clear BLHOPT.
  }
  const prompt = option === 'OUTPUT' ? M.set003.text : option === 'PROMPT' ? M.set004.text
    : option === 'SCANS' ? M.set005.text : option === 'ICDEF' ? M.set006.text
    : option === 'OCDEF' ? M.set007.text : M.set008.text;
  for (;;) {
    while (tokens[p]?.type !== K.KALF) {
      if (option === 'TTYTYPE') out.crlf();
      out.out(prompt);
      tokens = yield 'input';
      if (tokens[0]?.type === K.KEOL) return;
      p = 0;
    }
    const value = tokens[p].text, settings = context.settings;
    if (option === 'TTYTYPE') {
      settings.ttytyp = 0;
      let ambiguous = false;
      for (const [index, words] of terminalWords.entries()) {
        if (!equal(value, services.terminalWord ? services.terminalWord(1, index + 1) : words[0])) continue;
        if (settings.ttytyp !== 0) { ambiguous = true; break; }
        settings.ttytyp = index + 1;
      }
      if (!ambiguous && settings.ttytyp !== 0) return;
      if (ambiguous) out.out(M.set009.text); else out.crlf();
      out.out(M.set010.text, 2); out.out(M.ttys00.text, 1);
      // Jump to source label 600, which always prompts even after an alpha input.
      out.crlf(); out.out(M.set008.text);
      tokens = yield 'input';
      if (tokens[0]?.type === K.KEOL) return;
      p = 0;
      continue;
    }
    if (option === 'OUTPUT') {
      if (equal(value, M.shtfrm.text)) settings.oflg = K.SHORT;
      if (equal(value, M.medfrm.text)) settings.oflg = K.MEDIUM;
      if (equal(value, M.lngfrm.text)) settings.oflg = K.LONG;
    } else if (option === 'PROMPT') {
      if (equal(value, M.normal.text)) settings.prtype = 0;
      if (equal(value, M.inform.text)) settings.prtype = -1;
    } else if (option === 'SCANS') {
      if (equal(value, M.shtfrm.text)) settings.scnflg = K.SHORT;
      if (equal(value, M.lngfrm.text)) settings.scnflg = K.LONG;
    } else if (option === 'ICDEF') {
      if (equal(value, M.absfrm.text)) settings.icflg = K.KABS;
      if (equal(value, M.relfrm.text)) settings.icflg = K.KREL;
    } else if (option === 'OCDEF') {
      if (equal(value, M.absfrm.text)) settings.ocflg = K.KABS;
      if (equal(value, M.relfrm.text)) settings.ocflg = K.KREL;
      if (equal(value, M.bthfrm.text)) settings.ocflg = K.KBOTH;
    }
    return; // Unrecognized alpha values silently leave the setting unchanged.
  }
}
