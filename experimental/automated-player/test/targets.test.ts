import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyTorpedoOutcome, parseList, parseTargets } from '../observations.ts';
import { observe } from '../player.ts';
import { Captain } from '../captain.ts';
import { scenario } from './scenario-fixture.ts';
import { PlayerClient } from '../client.ts';
import { play } from '../player.ts';

test('LIST keeps hidden ship locations and distant base shields unknown', () => {
  const objects = parseList(' Excalibur\t@10-10 +100.0%\r\n*Wolf\t\tout of range\r\n*Emp Base\t@60-60\r\n*Emp planet\t@20-20 3 builds\r\n Neu planet\t@30-30\r\n', 1000);
  assert.equal(objects[1].position, undefined); assert.equal(objects[2].shieldPercent, undefined);
  assert.equal(objects[3].builds, 3); assert.equal(objects[4].faction, 'NEUTRAL'); assert.equal(objects[4].builds, 0);
  assert.throws(() => parseList('Invalid command'), /Incomplete/);
  assert.throws(() => parseList(' Wolf\t@90-90 +100.0%\r\n'), /bounds/);
});

test('TARGETS accepts enemy-only and empty reports while rejecting incomplete text', () => {
  assert.deepEqual(parseTargets(' Wolf\t\t@10-12 +42.0%\r\n Emp Base\t@12-12 75.0%\r\n', 1000).map(o => [o.name, o.position]), [
    ['Wolf', { v: 10, h: 12 }], ['Emp Base', { v: 12, h: 12 }],
  ]);
  assert.deepEqual(parseTargets('No targets in range\r\n', 1000), []);
  assert.throws(() => parseTargets('Invalid command\r\n', 1000), /Incomplete/);
});

test('Torpedo result classification keeps delayed or unfamiliar output unknown', () => {
  assert.equal(classifyTorpedoOutcome('Wolf has torpedo deflected by shields'), 'deflected');
  assert.equal(classifyTorpedoOutcome('Weapons Officer: Captain, torpedo 1 miss'), 'miss');
  assert.equal(classifyTorpedoOutcome('Weapons Officer:  Captain, torpedo 1 lost @15-29'), 'miss');
  assert.equal(classifyTorpedoOutcome('Star @20-21 novas'), 'nova');
  assert.equal(classifyTorpedoOutcome('Torpedo 1 MISFIRES!'), 'misfire');
  assert.equal(classifyTorpedoOutcome('Command: '), 'unknown');
});

test('SCAN and LIST identify enemy base; captain damages it from outside the defense radius', { timeout: 20000 }, async t => {
  const { client, f, record } = await scenario(t);
  f.views.high.board.setdsp(70, 70, 0);
  f.high.write('base', 20n, 1, 1, 2); f.high.write('base', 25n, 1, 2, 2); f.views.high.board.setdsp(20, 25, 401);
  const captain = new Captain('FEDERATION');
  const o = await observe(client, 'FEDERATION');
  const base = o.objects!.find(x => x.kind === 'base' && x.faction === 'EMPIRE')!;
  assert.deepEqual(base.position, { v: 20, h: 25 }); assert.equal(base.shieldPercent, 100);
  const decision = captain.choose(o); record({ event: 'base-target-decision', observation: o, decision });
  assert.equal(decision.command, 'PHASERS ABSOLUTE 180 20 25'); await client.command(decision.command);
  const after = await observe(client, 'FEDERATION');
  assert.ok(after.objects!.find(x => x.kind === 'base' && x.faction === 'EMPIRE')!.shieldPercent! < 100);
  assert.equal(after.status.energy, 4620);
  await client.quit();
});

test('Torpedo authorization avoids a friendly base behind the target and fires after the corridor clears', { timeout: 20000 }, async t => {
  const { client, opponent, f, K } = await scenario(t, true);
  f.high.write('shpcon', 400n, 18, K.KSSHPC);
  const o = await observe(client, 'FEDERATION');
  assert.ok(o.targets!.some(x => x.name === 'Wolf' && x.position?.v === 20 && x.position.h === 23));
  assert.equal(new Captain('FEDERATION', 'patrol', false, true, true).choose(o).command, 'PHASERS ABSOLUTE 180 20 23');
  // The fixture's friendly base at 20-26 lies behind Wolf at 20-23.
  // Move the base in this isolated test world, then obtain new public reports.
  f.views.high.board.setdsp(20, 26, 0);
  f.high.write('base', 10n, 1, 1, 1);
  f.high.write('base', 10n, 1, 2, 1);
  f.views.high.board.setdsp(10, 10, 301);
  const decision = new Captain('FEDERATION', 'patrol', false, true, true).choose(await observe(client, 'FEDERATION'));
  assert.equal(decision.command, 'TORPEDOES ABSOLUTE 1 20 23');
  await client.command(decision.command!);
  const after = await observe(client, 'FEDERATION');
  assert.equal(after.status.torpedoes, 9);
  await client.quit(); await opponent!.quit();
});

test('Enemy planet builds are selected at range three; neutral and unbuilt planets are not attacked', { timeout: 20000 }, async t => {
  const { client, f, record } = await scenario(t);
  f.views.high.board.setdsp(75, 75, 0);
  f.high.write('locpln', 20n, 1, 1); f.high.write('locpln', 23n, 1, 2); f.high.write('locpln', 3n, 1, 3);
  f.high.write('numcap', 1n, 2); f.views.high.board.setdsp(20, 23, 801);
  const o = await observe(client, 'FEDERATION');
  const planet = o.objects!.find(x => x.kind === 'planet')!; assert.equal(planet.builds, 3); assert.equal(planet.faction, 'EMPIRE');
  const decision = new Captain('FEDERATION').choose(o); record({ event: 'planet-target-decision', observation: o, decision });
  assert.equal(decision.command, 'PHASERS ABSOLUTE 180 20 23'); await client.command(decision.command);
  // Change fixture ownership through staging, then let LIST and SCAN reveal it.
  f.high.write('numcap', 0n, 2); f.views.high.board.setdsp(20, 23, 601);
  const neutral = await observe(client, 'FEDERATION');
  assert.doesNotMatch(new Captain('FEDERATION').choose(neutral).command!, /^PHASERS/);
  f.high.write('numcap', 1n, 2); f.views.high.board.setdsp(20, 23, 801); f.high.write('locpln', 0n, 1, 3);
  const empty = await observe(client, 'FEDERATION');
  assert.doesNotMatch(new Captain('FEDERATION').choose(empty).command!, /^PHASERS/);
  await client.quit();
});

test('A LIST-only base guides navigation without authorizing a shot', { timeout: 15000 }, async t => {
  const { client } = await scenario(t);
  const o = await observe(client, 'FEDERATION');
  assert.ok(o.objects!.some(x => x.kind === 'base' && x.faction === 'EMPIRE' && x.position?.v === 70));
  const decision = new Captain('FEDERATION').choose(o);
  assert.match(decision.command!, /^MOVE/); assert.match(decision.reason, /LIST/);
  await client.quit();
});

test('One objective captain in a four-ship game captures, builds and converts a neutral planet', { timeout: 60000 }, async t => {
  const { client, opponent, f, K, place, record, port } = await scenario(t, true);
  const wing = new PlayerClient({ host: '127.0.0.1', port, record: e => record({ ...e, captain: 'wing' }) });
  const shade = new PlayerClient({ host: '127.0.0.1', port, record: e => record({ ...e, captain: 'shade' }) });
  t.after(() => { wing.close(); shade.close(); });
  await wing.join({ name: 'Wing', team: 'FEDERATION', ship: 'EXCALIBUR' });
  await shade.join({ name: 'Shade', team: 'EMPIRE', ship: 'DEMON' });
  place(1, { v: 55, h: 55 }); place(12, { v: 60, h: 60 }); place(18, { v: 65, h: 65 });
  await client.quit();
  const events: Record<string, unknown>[] = [];
  const result = await play({ host: '127.0.0.1', port, name: 'Scout', team: 'FEDERATION', ship: 'YORKTOWN', mode: 'objective', rounds: 7, lives: 1, intervalMs: 10,
    submissionIntervalMs: 0,
    record(event) {
      events.push(event); record({ ...event, captain: 'objective' });
      if (event.event === 'joined') {
        place(9, { v: 20, h: 20 });
        f.views.high.board.setdsp(75, 75, 0);
        f.high.write('nplnet', 1n); f.high.write('locpln', 20n, 1, 1); f.high.write('locpln', 21n, 1, 2);
        f.high.write('locpln', 0n, 1, 3); f.high.write('locpln', 0n, 1, 4); f.views.high.board.setdsp(20, 21, 601);
      }
    },
  });
  assert.equal(result.outcome, 'limit');
  const commands = events.filter(e => e.event === 'decision').map(e => e.command);
  assert.deepEqual(commands.slice(0, 6), ['CAPTURE ABSOLUTE 20 21', ...Array(5).fill('BUILD ABSOLUTE 20 21')]);
  assert.equal(events.filter(e => e.event === 'planet-captured').length, 1);
  assert.equal(events.filter(e => e.event === 'planet-built').length, 4);
  assert.equal(events.filter(e => e.event === 'base-created').length, 1);
  assert.equal(f.views.high.board.dispc(20, 21), K.DXFBAS);
  assert.equal(f.high.read('nbase', 1), 2n); assert.equal(f.high.read('numcap', 1), 0n);
  await wing.quit(); await shade.quit(); await opponent!.quit();
});
