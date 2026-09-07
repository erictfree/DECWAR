import test from 'node:test';
import assert from 'node:assert/strict';
import { ReentryRequired } from '../client.ts';
import { observe, play } from '../player.ts';
import { Captain } from '../captain.ts';
import { distance, parseStatus } from '../observations.ts';
import { scenario } from './scenario-fixture.ts';

test('Resupply captain navigates a real star wall through its gap, docks and restores resources', { timeout: 90000 }, async t => {
  const { client, f, K, record } = await scenario(t);
  for (let v = 10; v <= 30; v++) if (v !== 23) f.views.high.board.setdsp(v, 22, 900);
  f.high.write('shpcon', 18000n, 9, K.KSNRGY); f.high.write('shpcon', 500n, 9, K.KSSHPC); f.high.write('shpcon', 1000n, 9, K.KSDAM);
  const captain = new Captain('FEDERATION', 'resupply'); let complete = false, crossedGap = false;
  for (let i = 0; i < 25; i++) {
    const observation = await observe(client, 'FEDERATION'), decision = captain.choose(observation);
    record({ event: 'scenario-decision', observation, decision });
    if (observation.status.position.h === 22) { assert.equal(observation.status.position.v, 23); crossedGap = true; }
    if (decision.kind === 'complete') { complete = true; break; }
    assert.equal(decision.kind, 'act'); await client.command(decision.command!);
  }
  assert.ok(crossedGap); assert.ok(complete);
  const final = parseStatus(await client.command('STATUS'));
  assert.equal(final.energy, 5000); assert.equal(final.shieldPercent, 100); assert.equal(final.hullDamage, 0); assert.equal(final.docked, true);
  await client.quit();
});

test('Combat captain hits an observed opponent through Telnet and retreats with depleted energy', { timeout: 30000 }, async t => {
  const { client, opponent, f, K, record } = await scenario(t, true); assert.ok(opponent);
  const captain = new Captain('FEDERATION');
  const before = parseStatus(await opponent.command('STATUS'));
  let observation = await observe(client, 'FEDERATION'), decision = captain.choose(observation);
  record({ event: 'scenario-decision', observation, decision });
  assert.equal(decision.command, 'PHASERS ABSOLUTE 180 20 23'); await client.command(decision.command);
  const after = parseStatus(await opponent.command('STATUS'));
  assert.ok(after.shieldPercent < before.shieldPercent);
  const shooter = parseStatus(await client.command('STATUS')); assert.equal(shooter.energy, 4620);
  // Exhausted energy is an external test setup. The choice still uses STATUS.
  f.high.write('shpcon', 22000n, 9, K.KSNRGY);
  // Add a second, safer refuge behind the attacker. Prefer it to the existing
  // closer base behind the enemy, then verify movement opens distance.
  f.high.write('nbase', 2n, 1); f.high.write('base', 20n, 2, 1, 1); f.high.write('base', 10n, 2, 2, 1);
  f.high.write('base', 1000n, 2, 3, 1); f.high.write('base', 3n, 2, 4, 1); f.views.high.board.setdsp(20, 10, 302);
  observation = await observe(client, 'FEDERATION'); decision = captain.choose(observation);
  record({ event: 'scenario-decision', observation, decision });
  assert.match(decision.command!, /^MOVE/); await client.command(decision.command!);
  assert.ok(distance(parseStatus(await client.command('STATUS')).position, { v: 20, h: 23 }) > 3, 'Withdrawal increases distance from the enemy');
  await client.quit(); await opponent.quit();
});

test('Destroyed client recognizes the original pregame dialogue and can reenter the same ship', { timeout: 20000 }, async t => {
  const { client, f, K } = await scenario(t);
  f.high.write('shpcon', BigInt(K.KENDAM), 9, K.KSDAM);
  await assert.rejects(client.command('STATUS'), ReentryRequired);
  await client.join({ name: 'Scout', team: 'FEDERATION', ship: 'YORKTOWN' });
  const status = parseStatus(await client.command('STATUS'));
  assert.equal(status.energy, 5000); assert.equal(status.hullDamage, 0);
  await client.quit();
});

test('The player loop records death, reenters automatically and resumes its bounded patrol', { timeout: 25000 }, async t => {
  const { client, f, K, port, record } = await scenario(t);
  await client.quit();
  const events: Record<string, unknown>[] = [];
  const result = await play({ host: '127.0.0.1', port, name: 'Reborn', team: 'FEDERATION', ship: 'YORKTOWN', rounds: 2, intervalMs: 100, lives: 2, record(event) {
    events.push(event); record(event);
    // Test fixture injects destruction after join; the bot learns via Telnet.
    if (event.event === 'joined') f.high.write('shpcon', BigInt(K.KENDAM), 9, K.KSDAM);
  } });
  assert.equal(result.deaths, 1); assert.equal(result.outcome, 'limit');
  assert.ok(events.some(e => e.event === 'rejoined'));
  assert.ok(events.some(e => e.event === 'action-result'));
});

test('Critical engine damage selects real repair and then restores movement', { timeout: 30000 }, async t => {
  const { client, f, K } = await scenario(t);
  f.high.write('shpdam', 3200n, 9, K.KDWARP); f.high.write('shpdam', 3200n, 9, K.KDIMP);
  const captain = new Captain('FEDERATION');
  const repair = captain.choose(await observe(client, 'FEDERATION'));
  assert.equal(repair.command, 'REPAIR 30'); await client.command(repair.command);
  const observation = await observe(client, 'FEDERATION');
  assert.ok(observation.devices.warp < 300); assert.ok(observation.devices.impulse < 300);
  const movement = captain.choose(observation); assert.match(movement.command!, /^MOVE/); await client.command(movement.command!);
  await client.quit();
});

test('A stale MOVE destination aborts the real coordinate retry and preserves the session', { timeout: 20000 }, async t => {
  const { client } = await scenario(t);
  const before = parseStatus(await client.command('STATUS'));
  const response = await client.command(`MOVE ABSOLUTE ${before.position.v} ${before.position.h}`);
  assert.match(response, /attempted\r?\nto use your present location/);
  assert.match(response, /Coordinates: /);
  assert.match(response, /(?:Command: |(?:\d+L)?S?D?E?> )$/);
  const after = parseStatus(await client.command('STATUS'));
  assert.deepEqual(after.position, before.position);
  await client.quit();
});
