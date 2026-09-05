import { constants as K, messages as M, terminalWords, extraHelpWords } from '../generated/source-data.ts';
import { equal } from '../compat/parser.ts';
import type { Token } from '../compat/parser.ts';
import { TerminalOutput } from '../compat/output.ts';

export type OutputSettings = { oflg: number; prtype: number; scnflg: number; icflg: number; ocflg: number; ttytyp: number };
export type GameOptions = { romulan: boolean; blackHoles: boolean };

// TYPE.FOR:39-102. This implements explicit kind calls (0,1,2). The archive's
// zero-argument pre-game CALL TYPE still requires calling-convention resolution.
export function* typeCommand(kind: 0 | 1 | 2, settings: OutputSettings, options: GameOptions,
  tokens: readonly Token[], out: TerminalOutput, terminalWord?: (column: number, index: number) => string): Generator<'input', void, readonly Token[]> {
  let selected: number = kind;
  let index = 1;
  while (selected === 0) {
    const token = tokens[index];
    if (token?.type === K.KALF) {
      if (equal(token.text, 'O') === -2) out.out(M.ambswi.text, 1);
      else if (equal(token.text, 'OUTPUT')) selected = 1;
      else if (equal(token.text, 'OPTION')) selected = 2;
    }
    if (selected) break;
    out.out(M.type01.text);
    tokens = yield 'input';
    if (!tokens[0] || tokens[0].type === K.KEOL) return;
    index = 0;
  }
  if (selected === 1) {
    const { oflg, prtype, scnflg, icflg, ocflg, ttytyp } = settings;
    const coordinate = (flag: number) => flag < 0 ? M.relfrm.text : flag === 0 ? M.bthfrm.text : M.absfrm.text;
    out.out(M.type02.text, 2);
    out.out(oflg < 0 ? M.shtfrm.text : oflg === 0 ? M.medfrm.text : M.lngfrm.text);
    out.out(M.type03.text, 1);
    out.out(prtype < 0 ? M.inform.text : M.normal.text); out.out(M.type04.text, 1);
    out.out(scnflg < 0 ? M.shtfrm.text : M.lngfrm.text); out.out(M.type05.text, 1);
    out.out(coordinate(icflg)); out.out(M.type08.text, 1);
    out.out(coordinate(ocflg)); out.out(M.type09.text, 1);
    // SET can leave TTYTYP=0 after an unknown terminal and blank response.
    // HISEG places XHELP immediately before TTYDAT; column zero reads its last
    // two words. Preserve this source-layout alias instead of inventing CRT.
    out.out(M.set008.text);
    const words = terminalWord ? [terminalWord(1, ttytyp), terminalWord(2, ttytyp)] : ttytyp === 0 ? extraHelpWords[extraHelpWords.length - 1] : terminalWords[ttytyp - 1];
    if (!words) throw new RangeError('TYPE invalid terminal table index');
    out.out(words.join('')); out.crlf();
  } else {
    out.crlf(); out.out(M.decver.text, 1);
    out.out(options.romulan ? M.setu06.text : M.type06.text, 1);
    out.out(options.blackHoles ? M.setu07.text : M.type07.text, 1);
  }
}
