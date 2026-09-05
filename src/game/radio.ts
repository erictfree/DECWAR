import { constants as K, messages as M, ships } from '../generated/source-data.ts';
import { equal } from '../compat/parser.ts';
import type { Token } from '../compat/parser.ts';
import { signed36 } from '../compat/word36.ts';
import { TerminalOutput } from '../compat/output.ts';
import { objectText } from './format.ts';

export type RadioContext = { who: number; oflg: number; gagmsg: bigint; shared: { nomsg: bigint } };

// RADIO.FOR:35-84. NOMSG is shared per galaxy, GAGMSG is session-local.
// There is no damaged-radio or target-alive check in this command.
export function* radio(context: RadioContext, tokens: readonly Token[], out: TerminalOutput): Generator<'input', void, readonly Token[]> {
  out.crlf();
  let index = 2;
  if (tokens[1]?.type !== K.KALF) index = 0;
  let action: 'ON' | 'OFF' | 'GAG' | 'UNGAG' | undefined;
  while (!action) {
    if (index === 0) {
      index = 1; out.out(M.radio0.text);
      tokens = yield 'input';
      if (tokens[0]?.type === K.KEOL) return;
      out.crlf();
    }
    action = (['ON', 'OFF', 'GAG', 'UNGAG'] as const).find(word => equal(tokens[index - 1]?.text ?? '', word));
    if (!action) index = 0;
  }
  if (action === 'ON' || action === 'OFF') {
    if (context.who < 1 || context.who > K.KNPLAY) throw new RangeError('RADIO requires a ship BIT index');
    const bit = 1n << BigInt(context.who - 1);
    context.shared.nomsg = signed36(action === 'ON' ? context.shared.nomsg & -(bit + 1n) : context.shared.nomsg | bit);
    out.out(action === 'ON' ? M.radon0.text : M.radoff.text, 1);
    return;
  }
  while (tokens[index]?.type !== K.KALF) {
    out.out(M.radio2.text);
    tokens = yield 'input';
    if (tokens[0]?.type === K.KEOL) return;
    index = 0;
  }
  const target = ships.find(ship => equal(tokens[index].text, ship.name));
  if (!target) { out.out(M.unkshp.text, 1); return; }
  if (target.id === context.who) return;
  const bit = 1n << BigInt(target.id - 1);
  context.gagmsg = signed36(action === 'GAG' ? context.gagmsg | bit : context.gagmsg & -(bit + 1n));
  out.out(action === 'GAG' ? M.radgag.text : M.radung.text);
  out.out(objectText(BigInt((target.id <= K.KNPLAY / 2 ? 100 : 200) + target.id), context.oflg));
  out.crlf();
}
