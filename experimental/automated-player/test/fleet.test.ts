import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFileSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'node:net';
import { scenario } from './scenario-fixture.ts';

for (const ships of [4, 10]) test(`Fleet launches ${ships} ships across both factions and shuts down at its deadline`, { timeout: 50000 }, async t => {
  const fixture = await scenario(t); await fixture.client.quit();
  const directory = resolve(`logs/automated-player-fleet-test-${Date.now()}`);
  const seconds = ships === 10 ? 20 : 12;
  const child = spawn(process.execPath, ['experimental/automated-player/fleet.ts', '--port', String(fixture.port), '--seconds', String(seconds), '--ships', String(ships), '--submission-interval-ms', '0', '--federation-strategy', ships === 4 ? 'siege' : 'objective', '--empire-strategy', ships === 4 ? 'siege' : 'objective', '--log-dir', directory], { stdio: ['ignore', 'pipe', 'pipe'] });
  const ended = once(child, 'exit');
  t.after(() => { if (child.exitCode === null) child.kill('SIGTERM'); });
  child.stdout.on('data', data => appendFileSync(`${directory}.stdout.log`, data));
  child.stderr.on('data', data => appendFileSync(`${directory}.stderr.log`, data));
  const [code] = await ended; assert.equal(code, 0);
  const summary = JSON.parse(readFileSync(`${directory}/summary.json`, 'utf8'));
  assert.equal(summary.schemaVersion, 2);
  assert.equal(summary.durationReached, true);
  assert.equal(Object.keys(summary.bots).length, ships);
  for (const bot of Object.values(summary.bots) as { state: string; decisions: number; retrySchedules: number; retryAttempts: number; reconnects: number }[]) {
    assert.equal(bot.state, 'interrupted'); assert.ok(bot.decisions > 0);
    assert.ok(bot.retrySchedules >= bot.retryAttempts); assert.ok(bot.retryAttempts >= bot.reconnects);
  }
  assert.equal(summary.bots.Scout.mode, ships === 4 ? 'siege' : 'objective'); assert.equal(summary.bots.Raven.mode, ships === 4 ? 'siege' : 'objective');
  assert.equal(summary.bots.Wing.mode, ships === 4 ? 'siege' : 'patrol'); assert.equal(summary.bots.Shade.mode, ships === 4 ? 'siege' : 'patrol');
  const health = JSON.parse(readFileSync(`${directory}/health.json`, 'utf8')); assert.ok(health.elapsedMs >= seconds * 1000);
  t.diagnostic(directory);
});

test('Fleet records terminal victory and stops commissioning captains', { timeout: 10000 }, async t => {
  let connections = 0;
  const host = createServer(socket => { connections++; socket.end('THE WAR IS OVER!!\r\n\r\nThe Klingon Empire is VICTORIOUS!!\r\n\r\n'); });
  host.listen(0, '127.0.0.1'); await once(host, 'listening'); t.after(() => host.close());
  const address = host.address(); assert.ok(address && typeof address !== 'string');
  const directory = resolve(`logs/automated-player-war-test-${Date.now()}`);
  const child = spawn(process.execPath, ['experimental/automated-player/fleet.ts', '--port', String(address.port), '--seconds', '60', '--ships', '4', '--log-dir', directory], { stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => { if (child.exitCode === null) child.kill('SIGTERM'); });
  child.stdout.on('data', data => appendFileSync(`${directory}.stdout.log`, data));
  child.stderr.on('data', data => appendFileSync(`${directory}.stderr.log`, data));
  const [code] = await once(child, 'exit'); assert.equal(code, 0);
  const summary = JSON.parse(readFileSync(`${directory}/summary.json`, 'utf8'));
  assert.equal(summary.warResult.winner, 'EMPIRE');
  assert.equal(summary.bots.Scout.state, 'war-over');
  assert.equal(summary.bots.Scout.deaths, 0); assert.equal(summary.bots.Scout.reconnects, 0);
  assert.equal(summary.durationReached, false); assert.equal(connections, 1);
  t.diagnostic(directory);
});
