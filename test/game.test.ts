import test from 'node:test';
import assert from 'node:assert/strict';
import { CommandScanner } from '../src/compat/parser.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { shield } from '../src/game/shield.ts';
import { initialShip } from '../src/game/ship.ts';
import { repair } from '../src/game/repair.ts';

const tokens = (text: string) => new CommandScanner(text).next()!.tokens;

test('SHIELD raising is charged repeatedly; precisely KCRIT damage is allowed', () => {
  const ship = initialShip(), out = new TerminalOutput();
  ship.devices[1] = 3000n;
  shield(ship, tokens('SH UP'), out, () => assert.fail()).next();
  shield(ship, tokens('SH UP'), out, () => assert.fail()).next();
  assert.equal(ship.energy, 48000n);
  assert.equal(out.drain(), '\r\nShields raised, Captain.\r\n\r\nShields raised, Captain.\r\n');
  ship.devices[1] = 3001n;
  shield(ship, tokens('SH UP'), out, () => assert.fail()).next();
  assert.equal(ship.energy, 48000n);
  assert.equal(out.drain(), '\r\nCaptain, unable to raise shields due to critical damage.\r\n');
});

test('SHIELD transfer preserves truncation loss and reverse transfer limits', () => {
  const ship = initialShip(), out = new TerminalOutput();
  ship.shieldStrength = 500n;
  shield(ship, tokens('SH T 1'), out, () => assert.fail()).next();
  assert.equal(ship.energy, 49990n);
  assert.equal(ship.shieldStrength, 500n); // 10/25 truncates; do not conserve away the loss.
  shield(ship, tokens('SH T -1000'), out, () => assert.fail()).next();
  assert.equal(ship.energy, 50000n);
  assert.equal(ship.shieldStrength, 500n);
});

test('SHIELD interactive path and energy depletion confirmation use original bytes', () => {
  const ship = initialShip(), out = new TerminalOutput();
  ship.energy = 1000n; ship.shieldStrength = 0n;
  const command = shield(ship, tokens('SH'), out, () => assert.fail());
  assert.equal(command.next().value, 'input');
  assert.equal(out.drain(), '\r\nTransfer, Up, Down  ? ');
  assert.equal(command.next(tokens('TRANSFER 100')).value, 'input');
  assert.equal(out.drain(), 'Transferring all ship energy to shields.  Confirm? ');
  assert.equal(command.next(tokens('NO')).done, true);
  assert.equal(out.drain(), 'Energy NOT transferred.\r\n');
  assert.equal(ship.energy, 1000n);
});

test('SHIELD invokes tractor release after raising, before exhaustion message', () => {
  const ship = initialShip(), out = new TerminalOutput();
  ship.energy = 999n; ship.tractor = 2;
  let called = false;
  shield(ship, tokens('SH UP'), out, () => {
    called = true;
    assert.equal(ship.shieldCondition, 1n);
    assert.equal(ship.energy, 0n);
    assert.equal(out.drain(), '\r\nShields raised, Captain.\r\n');
  }).next();
  assert.equal(called, true);
  assert.equal(ship.energy, 0n);
});

test('REPAIR: automatic 300, underway 500, docked 1000; elapsed output time matters', () => {
  for (const [mode, docked, expected, pause] of [[3, false, 1700n, undefined], [1, false, 1500n, 3900n], [1, true, 1000n, 3900n]] as const) {
    const ship = initialShip(); ship.docked = docked; ship.devices[2] = 2000n;
    let clock = 10000n;
    const result = repair(ship, mode, tokens('REPAIR'), () => clock);
    clock += 100n;
    assert.equal(ship.devices[2], expected);
    assert.equal(result.finish().pause, pause);
  }
});

test('REPAIR ALL DAMAGE, empty repair, and negative repair follow source branches', () => {
  const ship = initialShip(); ship.devices[2] = 1234n; ship.devices[3] = 250n;
  const result = repair(ship, 1, tokens('REPAIR ALL DAMAGES'), () => 10n);
  assert.equal(ship.devices[2], 0n);
  assert.equal(ship.devices[3], 0n);
  assert.equal(result.damageTokenIndex, 4);
  assert.deepEqual(result.finish(), { pause: 9872n, alternateReturn: false });
  assert.equal(repair(ship, 1, tokens('REPAIR'), () => 10n).finish().alternateReturn, true);
  ship.devices[2] = 100n;
  const negative = repair(ship, 1, tokens('REPAIR -10'), () => 10n);
  assert.equal(ship.devices[2], 200n);
  assert.equal(ship.devices[1], 100n);
  assert.equal(negative.finish().alternateReturn, true);
});
