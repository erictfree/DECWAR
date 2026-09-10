import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { PlayerClient } from '../client.ts';
import { parseStatus, parseFriendlyBases } from '../observations.ts';
import { play } from '../player.ts';

test('External Austin captains join, read reports, run the baseline, quit and reuse a ship', { timeout: 120000 }, async t => {
  const root = fileURLToPath(new URL('../../../', import.meta.url));
  // No game imports, state access or fixture staging: launch the public host
  // in a child process on an ephemeral port and fresh temporary data directory.
  const data = mkdtempSync(join(tmpdir(), 'decwar-bot-'));
  const logs = resolve(root, 'logs', `automated-player-live-${Date.now()}`);
  mkdirSync(logs, { recursive: true });
  const host = spawn(process.execPath, ['tools/run-telnet.ts', '--variant', 'austin', '--port', '0', '--data', data, '--log', join(logs, 'host.jsonl')], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  host.stdout.on('data', bytes => { output += String(bytes); appendFileSync(join(logs, 'host.stdout.log'), bytes); });
  host.stderr.on('data', bytes => appendFileSync(join(logs, 'host.stderr.log'), bytes));
  t.after(async () => {
    if (host.exitCode === null && host.signalCode === null) { const end = once(host, 'exit'); host.kill('SIGTERM'); await end; }
    rmSync(data, { recursive: true, force: true });
  });
  const port = await new Promise<number>((resolvePort, reject) => {
    const timer = setTimeout(() => reject(new Error('Host startup timed out: ' + output)), 15000);
    host.on('error', error => { clearTimeout(timer); reject(error); });
    host.on('exit', code => { clearTimeout(timer); reject(new Error('Host exited: ' + code)); });
    host.stdout.on('data', () => {
      const match = /telnet 127\.0\.0\.1 (\d+)/.exec(output);
      if (match) { clearTimeout(timer); resolvePort(Number(match[1])); }
    });
  });
  const record = (name: string) => (event: Record<string, unknown>) => appendFileSync(join(logs, `${name}.jsonl`), JSON.stringify({ time: new Date().toISOString(), ...event }) + '\n');
  const first = new PlayerClient({ host: '127.0.0.1', port, record: record('first') });
  t.after(() => first.close());
  await first.join({ name: 'Alpha', team: 'FEDERATION', ship: 'YORKTOWN' });
  const initial = parseStatus(await first.command('STATUS'));
  assert.equal(initial.energy, 5000);
  assert.equal(initial.torpedoes, 10);
  const bases = parseFriendlyBases(await first.command('BASES'), 'FEDERATION');
  assert.ok(bases.length > 0, 'Expected visible friendly bases');
  const clash = new PlayerClient({ host: '127.0.0.1', port, record: record('occupied'), timeoutMs: 500 });
  t.after(() => clash.close());
  await assert.rejects(clash.join({ name: 'Clash', team: 'FEDERATION', ship: 'YORKTOWN' }), /unavailable/);
  parseStatus(await first.command('STATUS'));
  const other = new PlayerClient({ host: '127.0.0.1', port, record: record('empire') });
  t.after(() => other.close());
  await other.join({ name: 'Beta', team: 'EMPIRE', ship: 'WOLF' });
  assert.ok(parseFriendlyBases(await other.command('BASES'), 'EMPIRE').length > 0);
  parseStatus(await other.command('STATUS'));
  await first.quit();
  const events: Record<string, unknown>[] = [];
  const result = await play({ host: '127.0.0.1', port, name: 'Scout', team: 'FEDERATION', ship: 'YORKTOWN', mode: 'resupply', rounds: 3, intervalMs: 100, record(event) { events.push(event); record('baseline')(event); } });
  assert.ok(events.some(event => event.event === 'decision'));
  assert.ok(events.some(event => event.event === 'action-result'), 'Baseline should take an action');
  assert.ok(events.some(event => event.event === 'completed'));
  const cliLog = join(logs, 'cli.jsonl');
  const cli = spawn(process.execPath, ['experimental/automated-player/run.ts', '--port', String(port), '--name', 'Pilot', '--ship', 'YORKTOWN', '--rounds', '1', '--interval-ms', '100', '--stay-connected', '--log', cliLog], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => { if (cli.exitCode === null && cli.signalCode === null) cli.kill('SIGTERM'); });
  cli.stdout.on('data', bytes => appendFileSync(join(logs, 'cli.stdout.log'), bytes));
  cli.stderr.on('data', bytes => appendFileSync(join(logs, 'cli.stderr.log'), bytes));
  const cliExit = once(cli, 'exit');
  const deadline = Date.now() + 30000;
  let holding = false;
  while (Date.now() < deadline && cli.exitCode === null) {
    try { holding = readFileSync(cliLog, 'utf8').includes('"event":"holding-status"'); } catch {}
    if (holding) break;
    await delay(100);
  }
  assert.ok(holding, 'CLI should remain connected after its one-action limit');
  assert.match(await other.command('USERS'), /Pilot/i, 'Other captain sees the held bot');
  cli.kill('SIGTERM');
  const [code] = await cliExit;
  assert.equal(code, 0);
  const cliEvents = readFileSync(cliLog, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  assert.equal(cliEvents[0].policy, 'captain-v8');
  assert.ok(cliEvents.some(event => event.event === 'completed' && ['complete', 'blocked', 'limit'].includes(event.outcome)));
  assert.doesNotMatch(await other.command('USERS'), /Pilot/i, 'SIGTERM quits and releases the held ship');
  await other.quit();
  assert.doesNotMatch(readFileSync(join(logs, 'host.jsonl'), 'utf8'), /"event":"input-rejected"/, 'Paced clients must not lose submissions to the host limiter');
  t.diagnostic(JSON.stringify({ logs, initial, bases, result, actions: events.filter(e => e.event === 'action-result').map(e => e.command) }));
});
