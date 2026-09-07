import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFileSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { scenario } from './scenario-fixture.ts';

for (const ships of [4, 10]) test(`Fleet launches ${ships} ships across both factions and shuts down at its deadline`, { timeout: 50000 }, async t => {
  const fixture = await scenario(t); await fixture.client.quit();
  const directory = resolve(`logs/automated-player-fleet-test-${Date.now()}`);
  const seconds = ships === 10 ? 20 : 12;
  const child = spawn(process.execPath, ['experimental/automated-player/fleet.ts', '--port', String(fixture.port), '--seconds', String(seconds), '--ships', String(ships), '--log-dir', directory], { stdio: ['ignore', 'pipe', 'pipe'] });
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
  assert.equal(summary.bots.Scout.mode, 'objective'); assert.equal(summary.bots.Raven.mode, 'objective');
  assert.equal(summary.bots.Wing.mode, 'patrol'); assert.equal(summary.bots.Shade.mode, 'patrol');
  const health = JSON.parse(readFileSync(`${directory}/health.json`, 'utf8')); assert.ok(health.elapsedMs >= seconds * 1000);
  t.diagnostic(directory);
});
