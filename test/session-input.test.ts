import test from 'node:test';
import assert from 'node:assert/strict';
import { CommandInput, resumeCommand } from '../src/compat/command-input.ts';
import { CommandScanner } from '../src/compat/parser.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { PackedBoard } from '../src/compat/board.ts';
import { unpackSixbit } from '../src/compat/word36.ts';
import { initialShip } from '../src/game/ship.ts';
import { status } from '../src/game/reports.ts';
import { setCommand } from '../src/game/set-command.ts';
import type { SetContext, SetServices } from '../src/game/set-command.ts';
import { typeCommand } from '../src/game/type-command.ts';
import { usrnam } from '../src/game/name.ts';
import { radio } from '../src/game/radio.ts';
import { password } from '../src/game/password.ts';
import { sourceFile, statements } from '../tools/source.ts';

const tokens = (line: string) => new CommandScanner(line).next()!.tokens;
function settings(): SetContext {
  return { settings: { oflg: 0, prtype: 0, scnflg: 1, icflg: 1, ocflg: 0, ttytyp: 8 },
    password: 0n, board: new PackedBoard(), romopt: 0n, endflg: 0n };
}
const unused: SetServices = { usrnam: () => assert.fail('Unexpected USRNAM'), endgam: () => assert.fail('Unexpected ENDGAM') };
function accept(input: CommandInput, line: string, out: TerminalOutput): void {
  input.acceptLine(line); assert.equal(input.acquire(out), true);
}

test('token memory retains unused slots and EOL pointer; STATUS does not change NTOK', () => {
  const input = new CommandInput(), out = new TerminalOutput();
  accept(input, 'STATUS ABC 123 DEF', out);
  const fourth = { ...input.tokens[3] }, pointer = input.tokens[1].offset;
  accept(input, 'STATUS', out);
  assert.equal(input.ntok, 1);
  assert.equal(input.tokens[1].type, -1); assert.equal(input.tokens[1].offset, pointer);
  assert.deepEqual(input.tokens[3], fourth);
  const ship = initialShip(); ship.v = 12; ship.h = 34;
  status({ ship, who: 1, oflg: -1, nomsg: 0n, board: new PackedBoard() }, input.tokens, 2, out);
  assert.equal(input.ntok, 1); assert.equal(input.tokens.length, 15);
  assert.equal(input.tokens[3].value, 0n);
  assert.equal(input.tokens[2].value, 123n); // STATUS leaves VALLST from prior input.
  accept(input, '  ', out);
  assert.equal(input.ntok, 0); assert.equal(input.tokens[0].offset, 2);
  assert.equal(input.tokens[2].text, 'L');
});

test('too-many-words retains the NXTT writes made before NTOK is reset', () => {
  const input = new CommandInput(), out = new TerminalOutput();
  input.tokens[14].text = 'OLD'; input.tokens[14].value = 999n;
  accept(input, Array.from({ length: 15 }, (_, i) => String(i + 1)).join(' '), out);
  assert.equal(input.ntok, 0); assert.equal(input.tokens[0].type, -1);
  assert.equal(input.tokens[0].value, 0n); assert.equal(input.tokens[1].value, 2n);
  assert.equal(input.tokens[13].value, 14n); assert.equal(input.tokens[14].text, 'OLD');
  assert.equal(input.tokens[14].value, 999n);
  assert.equal(out.drain(), 'Too many words -- line ignored\r\n');
  assert.equal(input.acquire(out), false);
});

test('SET consumes a slash-delimited argument through GTKN continuation and leaves the next command', () => {
  const input = new CommandInput(), out = new TerminalOutput(), ctx = settings();
  accept(input, 'SET OUTPUT / LONG / TYPE OUTPUT', out);
  const command = resumeCommand(setCommand(ctx, input.tokens, out, unused), input, out);
  assert.equal(command.next().done, true); // No new physical input required.
  assert.equal(ctx.settings.oflg, 1);
  assert.equal(out.drain(), '\r\nShort, Medium, or Long output? \r\n');
  assert.equal(input.acquire(out), true);
  assert.equal(input.tokens[0].text, 'TYPE'); assert.equal(input.ntok, 2);
  out.drain();
  typeCommand(0, ctx.settings, { romulan: false, blackHoles: false }, input.tokens, out).next();
  assert.ok(out.drain().includes('Long output format.\r\n'));
});

test('resuming after a real line wait updates the same token slots and supports blank abort', () => {
  const input = new CommandInput(), out = new TerminalOutput(), ctx = settings();
  accept(input, 'SET PROMPT 123', out);
  const command = resumeCommand(setCommand(ctx, input.tokens, out, unused), input, out);
  assert.deepEqual(command.next(), { value: 'line', done: false });
  assert.equal(out.drain(), '\r\nNormal or Informative command prompt? ');
  input.acceptLine('INFORMATIVE');
  assert.equal(command.next().done, true); assert.equal(ctx.settings.prtype, -1);
  accept(input, 'SET SCANS', out);
  const abort = resumeCommand(setCommand(ctx, input.tokens, out, unused), input, out);
  assert.equal(abort.next().value, 'line');
  input.acceptLine(''); assert.equal(abort.next().done, true);
  assert.equal(ctx.settings.scnflg, 1);
});

test('SET unknown alpha values silently return, and source-defined settings map without normalization', () => {
  const ctx = settings(), out = new TerminalOutput();
  for (const line of ['SET OUTPUT WRONG', 'SET ICDEF BOTH']) assert.equal(setCommand(ctx, tokens(line), out, unused).next().done, true);
  assert.equal(ctx.settings.oflg, 0); assert.equal(ctx.settings.icflg, 1); assert.equal(out.drain(), '');
  for (const line of ['SET O S', 'SET P I', 'SET S S', 'SET I R', 'SET OC A']) setCommand(ctx, tokens(line), out, unused).next();
  assert.deepEqual(ctx.settings, { oflg: -1, prtype: -1, scnflg: -1, icflg: -1, ocflg: 1, ttytyp: 8 });
});

const ttyList = 'Supported TTY types are:\r\n\r\nACT-IV     ADM-2      ADM-3a     DATAPOINT\r\nACT-V      SOROC      BEEHIVE    CRT\r\n\r\nTerminal type:  ';
test('SET TTYTYPE ambiguity retains first match on blank abort, unknown retains zero', () => {
  const declarations = statements(sourceFile('HISEG.FOR')).filter(s => /^(integer|logical)\s/i.test(s.text));
  const extraHelp = declarations.findIndex(s => /^integer\s+xhelp\(/i.test(s.text));
  assert.match(declarations[extraHelp].text, /xhelp\(2,KNXTR\)/i);
  assert.match(declarations[extraHelp + 1].text, /^integer\s+ttydat\(2,KNTTY\)/i);
  const ctx = settings(), out = new TerminalOutput();
  const ambiguous = setCommand(ctx, tokens('SET TTYTYPE ACT'), out, unused);
  assert.equal(ambiguous.next().value, 'input');
  assert.equal(ctx.settings.ttytyp, 1);
  assert.equal(out.drain(), '\r\nAmbiguous TTY type.  ' + ttyList);
  assert.equal(ambiguous.next(tokens('')).done, true); assert.equal(ctx.settings.ttytyp, 1);
  const unknown = setCommand(ctx, tokens('SET TTYTYPE UNKNOWN'), out, unused);
  assert.equal(unknown.next().value, 'input'); assert.equal(ctx.settings.ttytyp, 0);
  assert.equal(out.drain(), '\r\n' + ttyList);
  assert.equal(unknown.next(tokens('')).done, true);
  typeCommand(1, ctx.settings, { romulan: false, blackHoles: false }, tokens(''), out).next();
  assert.ok(out.drain().endsWith('Terminal type:  PRegame   \r\n'));
});

test('SET TTYTYPE retries non-alpha responses and uniquely matches five-character terminal words', () => {
  const ctx = settings(), out = new TerminalOutput();
  const command = setCommand(ctx, tokens('SET TTYTYPE'), out, unused);
  assert.equal(command.next().value, 'input'); out.drain();
  assert.equal(command.next(tokens('123')).value, 'input');
  assert.equal(out.drain(), '\r\nTerminal type:  ');
  assert.equal(command.next(tokens('ADM-3a')).done, true); assert.equal(ctx.settings.ttytyp, 3);
});

test('SET privileged branches preserve flag side effects and exact black-hole class scan', () => {
  const ctx = { ...settings(), blhopt: -1n }, out = new TerminalOutput();
  const denied = setCommand(ctx, tokens('SET ROMOPT'), out, unused);
  assert.equal(denied.next().value, 'input'); assert.equal(ctx.romopt, 0n);
  denied.next(tokens('')); out.drain();
  ctx.password = -2n;
  setCommand(ctx, tokens('SET ROMOPT'), out, unused).next(); assert.equal(ctx.romopt, -1n);
  ctx.board.setdsp(1, 1, 1000); ctx.board.setdsp(75, 75, 1099); ctx.board.setdsp(1, 2, 900); ctx.board.setdsp(1, 3, -1);
  setCommand(ctx, tokens('SET BHREMV'), out, unused).next();
  assert.equal(ctx.board.disp(1, 1), 0); assert.equal(ctx.board.disp(75, 75), 0);
  assert.equal(ctx.board.disp(1, 2), 900); assert.equal(ctx.board.disp(1, 3), -1); assert.equal(ctx.blhopt, -1n);
  let ended = false;
  setCommand(ctx, tokens('SET ENDFLG'), out, { ...unused, endgam: () => { assert.equal(ctx.endflg, -1n); ended = true; } }).next();
  assert.equal(ended, true); assert.equal(out.drain(), '');
});

test('USRNAM uses raw SIXBIT input, retains one extra space, truncates at twelve, and discards slash tails', () => {
  const input = new CommandInput(), out = new TerminalOutput();
  let name = '';
  const store = (a: bigint, b: bigint) => { name = unpackSixbit(a) + unpackSixbit(b); };
  accept(input, 'SET NAME  alice smith / TYPE', out);
  assert.equal(usrnam(input, 2, store), true); assert.equal(name, ' ALICE SMITH');
  assert.equal(input.acquire(out), false);
  accept(input, 'SET NAME a/B / TYPE', out);
  assert.equal(usrnam(input, 2, store), true); assert.equal(name, 'A/B / TYPE  ');
  assert.equal(input.acquire(out), false);
  accept(input, 'SET NAME,a\tb', out);
  assert.equal(usrnam(input, 2, store), true); assert.equal(name, 'AIB         ');
  accept(input, 'SET NAME   ', out);
  assert.equal(usrnam(input, 2, store), false); assert.equal(name, 'AIB         ');
});

test('SET NAME prompts on missing raw name and packs the replacement line through the same driver', () => {
  const ctx = settings(), input = new CommandInput(), out = new TerminalOutput();
  accept(input, 'SET NAME', out);
  let name = '';
  const service = { ...unused, usrnam: (p: number) => usrnam(input, p, (a, b) => { name = unpackSixbit(a) + unpackSixbit(b); }) };
  const command = resumeCommand(setCommand(ctx, input.tokens, out, service), input, out);
  assert.equal(command.next().value, 'line'); assert.equal(out.drain(), '\r\nDesired name:  ');
  input.acceptLine('Captain Kirk');
  assert.equal(command.next().done, true); assert.equal(name, 'CAPTAIN KIRK');
  assert.equal(input.acquire(out), false);
});

test('RADIO shared on/off mask and per-session gag mask remain independent', () => {
  const out = new TerminalOutput(), shared = { nomsg: 2n };
  const a = { who: 1, oflg: 0, gagmsg: 0n, shared }, b = { who: 2, oflg: 1, gagmsg: 0n, shared };
  radio(a, tokens('RADIO OFF'), out).next(); assert.equal(shared.nomsg, 3n);
  assert.equal(out.drain(), '\r\nRadio turned off, Captain.\r\n');
  radio(a, tokens('RADIO O'), out).next(); assert.equal(shared.nomsg, 2n); // ON first, no ambiguity check.
  out.drain();
  radio(a, tokens('RADIO GAG W'), out).next(); assert.equal(a.gagmsg, 512n); assert.equal(b.gagmsg, 0n);
  assert.equal(out.drain(), '\r\nRadio gagged against W\r\n');
  radio(b, tokens('RADIO GAG WOLF'), out).next(); assert.equal(b.gagmsg, 512n);
  assert.equal(out.drain(), '\r\nRadio gagged against Wolf\r\n');
  radio(a, tokens('RADIO UNGAG W'), out).next(); assert.equal(a.gagmsg, 0n); assert.equal(b.gagmsg, 512n);
  assert.equal(out.drain(), '\r\nRadio ungagged against W\r\n');
});

test('RADIO prompts, consumes compound-line argument, ignores own ship, and reports unknown ships', () => {
  const out = new TerminalOutput(), input = new CommandInput();
  const ctx = { who: 1, oflg: 0, gagmsg: 0n, shared: { nomsg: 0n } };
  accept(input, 'RADIO / GAG / NIMITZ', out);
  const command = resumeCommand(radio(ctx, input.tokens, out), input, out);
  assert.equal(command.next().done, true); assert.equal(ctx.gagmsg, 2n);
  assert.equal(out.drain(), '\r\nTurn radio ON or OFF, GAG or UNGAG individual ship?  \r\n\r\nShip name:  \r\nRadio gagged against N\r\n');
  radio(ctx, tokens('RADIO GAG L'), out).next(); assert.equal(out.drain(), '\r\n');
  radio(ctx, tokens('RADIO GAG NONAME'), out).next(); assert.equal(out.drain(), 'Unknown ship name.\r\n');
});

test('RADIO OFF affects the actual STATUS report in the next command on the same line', () => {
  const out = new TerminalOutput(), input = new CommandInput();
  const shared = { nomsg: 0n }, ctx = { who: 1, oflg: 0, gagmsg: 0n, shared };
  accept(input, 'RADIO OFF / STATUS RADIO', out);
  assert.equal(resumeCommand(radio(ctx, input.tokens, out), input, out).next().done, true);
  assert.equal(input.acquire(out), true);
  const ship = initialShip();
  status({ ship, who: 1, oflg: 0, board: new PackedBoard(), get nomsg() { return shared.nomsg; } }, input.tokens, 2, out);
  assert.equal(out.drain(), '\r\nRadio turned off, Captain.\r\n\r\nRadio  Off\r\n');
});

test('PASWRD preserves exact-match flag, project whitelist, and short failure without newline', () => {
  const out = new TerminalOutput();
  for (const project of [0o70000n, 0o337n, 0o70006n, 0o70725n]) assert.equal(password(tokens('*PASSWORD *MINK'), 0, project, out), -2n);
  assert.equal(out.drain(), '');
  assert.equal(password(tokens('*PASSWORD *MINKsuffix'), -1, 0o337n, out), -2n); // GTKN limits text to five.
  assert.equal(password(tokens('*PASSWORD *MIN'), -1, 0o337n, out), 0n);
  assert.equal(out.drain(), 'Unknown command');
  assert.equal(password(tokens('*PASSWORD *MINK'), 1, 123n, out), 0n);
  assert.equal(out.drain(), 'Unknown command -- for help type HELP\r\n');
});
