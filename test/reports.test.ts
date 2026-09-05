import test from 'node:test';
import assert from 'node:assert/strict';
import { PackedBoard } from '../src/compat/board.ts';
import { CommandScanner } from '../src/compat/parser.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { initialShip } from '../src/game/ship.ts';
import { conditionText, deviceText, objectText, prloc } from '../src/game/format.ts';
import { damage, status } from '../src/game/reports.ts';
import type { ReportContext } from '../src/game/reports.ts';
import { dock, repairCommand } from '../src/game/maintenance.ts';
import type { DockContext } from '../src/game/maintenance.ts';
import { typeCommand } from '../src/game/type-command.ts';
import { sourceFile } from '../tools/source.ts';
import { outputTables } from '../src/generated/source-data.ts';

const tokens = (line: string) => new CommandScanner(line).next()!.tokens;
function context(oflg = 0): ReportContext {
  const ship = initialShip(), board = new PackedBoard();
  ship.v = 12; ship.h = 34; ship.turns = 17n;
  board.setdsp(12, 34, 101);
  return { ship, board, oflg, who: 1, nomsg: 0n };
}
function docking(oflg = 0): DockContext {
  return { ...context(oflg), team: 1, alive: true, slowestTerminal: 2n,
    bases: Array.from({ length: 10 }, () => ({ v: 0, h: 0, strength: 0n })),
    planets: [], capturedPlanets: 0 };
}

test('extracted assembly output entries retain their physical source bytes/locations', () => {
  const lines = sourceFile('WARMAC.MAC').split('\n');
  for (const table of Object.values(outputTables)) for (const entry of table) {
    if (entry.text !== null) assert.ok(lines[entry.line - 1].includes('/' + entry.text + '/'));
  }
  assert.deepEqual(Array.from({ length: 11 }, (_, i) => objectText(BigInt(i * 100 + (i === 1 || i === 2 ? 1 : 0)), 0)),
    ['.', 'L', 'L', '<>', ')(', '??', ' @', '+@', '-@', '*', 'BH']);
  assert.equal(objectText(-1n, 1), 'Empty Space');
  assert.equal(objectText(1101n, 1), 'Empty Space');
  assert.equal(objectText(210n, 1, 1), 'Wolf ');
  assert.equal(deviceText(4, 0), 'Life Sup ');
  assert.equal(deviceText(9, 1), 'Tractor Beam ');
  assert.equal(conditionText(2, -1n, -1), 'D+Y');
  assert.equal(conditionText(3, 1n, 0), 'Red'); // SKIPL: positive is not docked.
});

test('PRLOC preserves own-location suppression, signed relative fields, and prefix flags', () => {
  const out = new TerminalOutput();
  prloc(out, 12, 34, 12, 34, 0, 0, -1, 1);
  assert.equal(out.drain(), '');
  prloc(out, 12, 34, 12, 34, 0, 0, 0, 1);
  assert.equal(out.drain(), '@12-34');
  prloc(out, 10, 36, 12, 34, 0, 2, 0, 0);
  assert.equal(out.drain(), '@10-36  -2, +2');
  prloc(out, 12, 34, 12, 34, 0, 2, -1, -1);
  assert.equal(out.drain(), '  0,  0');
});

test('DAMAGE full reports have exact three-verbosity spacing', () => {
  const expected = [
    '\r\nSH   300\r\n',
    '\r\nDevice    Damage\r\n\r\nShields   300.0\r\n',
    '\r\nDamage Report for Lexington\r\n\r\nDevice             Damage\r\n\r\nDeflector Shields  300.0 units\r\n',
  ];
  for (const [index, oflg] of [-1, 0, 1].entries()) {
    const ctx = context(oflg), out = new TerminalOutput();
    ctx.ship.devices[1] = 3000n;
    damage(ctx, tokens('DAMAGES'), 2, out);
    assert.equal(out.drain(), expected[index]);
  }
});

test('DAMAGE selection can match multiple undamaged devices, repeats, and stops at non-alpha', () => {
  const ctx = context(-1), out = new TerminalOutput();
  ctx.ship.devices[1] = 10n;
  damage(ctx, tokens('DAMAGES T WARP TO 5 SH'), 2, out);
  assert.equal(out.drain(), '\r\nTO     0\r\nTR     0\r\nTO     0\r\n');
  ctx.ship.devices[1] = 0n;
  damage(ctx, tokens('DAMAGES WA'), 2, out);
  assert.equal(out.drain(), '\r\nAll devices functional.\r\n');
});

const fullStatus = [
  '\r\nSD17 G 12-34 T10 E5000 D0 SH+100 ROn \r\n',
  '\r\nSDate    17\r\nCond   Green\r\nLoc    12-34\r\nTorps    10\r\nEner   5000.0\r\nDam       0.0\r\nShlds  +100.0% 2500.0 units\r\nRadio  On\r\n',
  '\r\nStardate\t  17\r\nCondition\tGreen\r\nLocation\t12-34\r\nTorpedoes\t  10\r\nEnergy left\t5000.0\r\nDamage\t\t   0.0\r\nShields\t        +100.0% 2500.0 units\r\nRadio\t\tOn\r\n',
];
test('STATUS full byte fixtures and original token-buffer mutation for all verbosity modes', () => {
  for (const [index, oflg] of [-1, 0, 1].entries()) {
    const out = new TerminalOutput(), input = tokens('STATUS');
    input[1].value = 73n; // STATUS writes TKNLST/TYPLST, not VALLST.
    status(context(oflg), input, 2, out);
    assert.equal(out.drain(), fullStatus[index]);
    assert.deepEqual(input.slice(1, 8).map(t => t.text), ['C', 'L', 'T', 'E', 'D', 'S', 'R']);
    assert.equal(input[1].value, 73n);
    assert.equal(input[8].type, -1);
  }
});

test('STATUS requested-item order, syntax continuation, short trailing space, radio damage', () => {
  const ctx = context(-1), out = new TerminalOutput();
  ctx.ship.shieldCondition = -1n; ctx.ship.shieldStrength = 0n; ctx.ship.docked = true;
  ctx.ship.devices[8] = 3000n; ctx.nomsg = 1n;
  status(ctx, tokens('STATUS S BAD C R'), 2, out);
  assert.equal(out.drain(), '\r\nSH-0 %Syntax error\r\nD+G Rdamaged \r\n');
  ctx.oflg = 0; ctx.ship.devices[8] = 2999n;
  status(ctx, tokens('STATUS R'), 2, out);
  assert.equal(out.drain(), '\r\nRadio  Off\r\n');
  ctx.who = 2;
  status(ctx, tokens('STATUS R'), 2, out);
  assert.equal(out.drain(), '\r\nRadio  On\r\n');
});

test('REPAIR -> DAMAGE output occurs before the final clock read; auto repair leaves pause untouched', () => {
  const ctx = context(), out = new TerminalOutput();
  ctx.ship.devices[2] = 700n;
  let reads = 0;
  const result = repairCommand(ctx, tokens('REPAIR 50 DAMAGES WA'), 1, out, () => {
    if (reads++ === 0) return 10000n;
    assert.equal(out.drain(), '\r\nWarp       20.0\r\n');
    return 10125n;
  });
  assert.deepEqual(result, { pause: 3875n, alternateReturn: false });
  assert.equal(ctx.ship.devices[2], 200n);
  const auto = repairCommand(ctx, tokens('REPAIR'), 3, out, () => assert.fail('Automatic repair must not read clock'));
  assert.deepEqual(auto, { alternateReturn: false });
});

test('DOCK sums adjacent friendly sources, excludes dead/enemy/distant objects, and doubles repeat hull repair', () => {
  const ctx = docking(), out = new TerminalOutput();
  ctx.bases = [
    { v: 11, h: 33, strength: 1n }, // diagonal adjacency, positive strength
    { v: 13, h: 34, strength: 0n },
    { v: 14, h: 34, strength: 1000n },
    ...ctx.bases.slice(3),
  ];
  ctx.planets = [{ v: 12, h: 35 }, { v: 13, h: 34 }]; ctx.capturedPlanets = 1;
  ctx.board.setdsp(12, 35, 701); ctx.board.setdsp(13, 34, 802);
  Object.assign(ctx.ship, { energy: 0n, torpedoes: 0n, shieldStrength: 0n, damage: 10000n, lifeReserves: -1n, condition: 3 });
  assert.deepEqual(dock(ctx, tokens('DOCK'), out, () => 10000n), { pause: 3000n, alternateReturn: false });
  assert.equal(ctx.ship.energy, 15000n); assert.equal(ctx.ship.shieldStrength, 300n);
  assert.equal(ctx.ship.torpedoes, 10n); assert.equal(ctx.ship.damage, 8500n);
  assert.equal(ctx.ship.lifeReserves, 5n); assert.equal(ctx.ship.condition, 1);
  dock(ctx, tokens('DOCK'), out, () => 10000n);
  assert.equal(ctx.ship.damage, 5500n);
  assert.equal(out.drain(), '\r\nDOCKED.\r\n\r\nDOCKED.\r\n');
});

test('DOCK failure double space and death branch do not assign a pause or alter resources', () => {
  const ctx = docking(-1), out = new TerminalOutput();
  ctx.board.setdsp(12, 35, 701); ctx.planets = [{ v: 12, h: 35 }];
  // NUMCAP gate skips the planet even when its board class is friendly.
  assert.deepEqual(dock(ctx, tokens('DOCK'), out, () => 0n), { alternateReturn: true });
  assert.equal(out.drain(), '\r\nL  not adjacent to base!!\r\n');
  ctx.capturedPlanets = 1; ctx.alive = false;
  const before = structuredClone(ctx.ship);
  assert.deepEqual(dock(ctx, tokens('DOCK'), out, () => 0n), { alternateReturn: true });
  assert.deepEqual(ctx.ship, before); assert.equal(out.drain(), '');
});

test('DOCK STATUS integrates STOKEN=3 and charges output time, retaining normal return even after deadline', () => {
  const ctx = docking(-1), out = new TerminalOutput();
  ctx.bases = [{ v: 11, h: 34, strength: 1000n }, ...ctx.bases.slice(1)];
  const input = tokens('DOCK STATUS');
  let reads = 0;
  const result = dock(ctx, input, out, () => {
    if (reads++ === 0) return 1000n;
    assert.equal(out.drain(), '\r\nDOCKED.\r\n\r\nSD17 D+G 12-34 T10 E5000 D0 SH+100 ROn \r\n');
    return 5000n;
  });
  assert.deepEqual(result, { pause: -1000n, alternateReturn: false });
  assert.deepEqual(input.slice(2, 9).map(t => t.text), ['C', 'L', 'T', 'E', 'D', 'S', 'R']);
  assert.equal(input[9].type, -1);
});

const settings = { oflg: 0, prtype: 0, scnflg: 1, icflg: 1, ocflg: 0, ttytyp: 8 };
const options = { romulan: true, blackHoles: false };
test('TYPE OUTPUT retains ten-character terminal word padding and signed scan-mode selection', () => {
  const out = new TerminalOutput();
  assert.equal(typeCommand(1, settings, options, tokens(''), out).next().done, true);
  assert.equal(out.drain(), '\r\nCurrent output switch settings:\r\n\r\nMedium output format.\r\nNormal command prompt.\r\nLong SCAN format.\r\nAbsolute coordinates are default for input.\r\nBoth coordinates are default for output.\r\nTerminal type:  CRT       \r\n');
  typeCommand(1, { ...settings, oflg: -1, prtype: -1, scnflg: -1, icflg: -1, ocflg: 1, ttytyp: 3 }, options, tokens(''), out).next();
  assert.equal(out.drain(), '\r\nCurrent output switch settings:\r\n\r\nShort output format.\r\nInformative command prompt.\r\nShort SCAN format.\r\nRelative coordinates are default for input.\r\nAbsolute coordinates are default for output.\r\nTerminal type:  ADM-3a    \r\n');
});

test('TYPE ambiguous O prompts again; OPTION spelling, banner, and blank-input abort preserved', () => {
  const out = new TerminalOutput();
  const command = typeCommand(0, settings, options, tokens('TYPE O'), out);
  assert.equal(command.next().value, 'input');
  assert.equal(out.drain(), '\r\nAmbiguous switch for TYPE.\r\n\r\nDo you wish to see the OUTPUT or OPTION switches? ');
  assert.equal(command.next(tokens('OP')).done, true);
  assert.equal(out.drain(), '\r\n[DECWAR Version 2.3, 20-Nov-81]\r\nThere are Romulans in this game.\r\nBlack holes are NOT in this game.\r\n');
  const abort = typeCommand(0, settings, options, tokens('TYPE WRONG'), out);
  assert.equal(abort.next().value, 'input');
  out.drain();
  assert.equal(abort.next(tokens('')).done, true); assert.equal(out.drain(), '');
});
