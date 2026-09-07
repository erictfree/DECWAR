// Reproducible operating smoke test, not a competitive benchmark. Starts only
// a fresh public host; both captains receive Telnet observations exclusively.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { play } from './player.ts';

const { values } = parseArgs({ options: { rounds: { type: 'string', default: '24' } } });
if (!/^\d+$/.test(values.rounds) || Number(values.rounds) < 1 || Number(values.rounds) > 200) throw new Error('Use --rounds 1..200');
const root = fileURLToPath(new URL('../../', import.meta.url));
const logs = join(root, 'logs', `automated-player-soak-${Date.now()}`), data = mkdtempSync(join(tmpdir(), 'decwar-soak-'));
mkdirSync(logs, { recursive: true });
const host = spawn(process.execPath, ['tools/run-telnet.ts', '--port', '0', '--variant', 'austin', '--data', data, '--log', join(logs, 'host.jsonl')], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
const controller = new AbortController(), stop = () => controller.abort();
process.on('SIGINT', stop); process.on('SIGTERM', stop);
let output = '';
host.stdout.on('data', bytes => { output += String(bytes); appendFileSync(join(logs, 'host.stdout.log'), bytes); });
host.stderr.on('data', bytes => appendFileSync(join(logs, 'host.stderr.log'), bytes));
try {
  const port = await new Promise<number>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Host did not start')), 15000);
    host.on('error', error => { clearTimeout(timer); reject(error); });
    host.on('exit', code => { clearTimeout(timer); reject(new Error('Host exited: ' + code)); });
    host.stdout.on('data', () => { const match = /telnet 127\.0\.0\.1 (\d+)/.exec(output); if (match) { clearTimeout(timer); resolve(Number(match[1])); } });
  });
  let joined = () => {};
  const firstJoined = new Promise<void>(resolve => { joined = resolve; });
  const summary: Record<string, { decisions: number; moves: number; shots: number; docks: number; repairs: number; deaths: number; positions: Set<string> }> = {};
  const run = (name: string, team: 'FEDERATION' | 'EMPIRE', ship: string) => {
    const stats = { decisions: 0, moves: 0, shots: 0, docks: 0, repairs: 0, deaths: 0, positions: new Set<string>() }; summary[name] = stats;
    return play({ host: '127.0.0.1', port, name, team, ship, rounds: Number(values.rounds), intervalMs: 300, signal: controller.signal, record(event) {
      appendFileSync(join(logs, `${name}.jsonl`), JSON.stringify({ time: new Date().toISOString(), ...event }) + '\n');
      if (event.event === 'joined' && name === 'Scout') joined();
      if (event.event === 'decision') {
        stats.decisions++;
        const status = event.status as { position: { v: number; h: number } };
        stats.positions.add(`${status.position.v},${status.position.h}`);
        const command = String(event.command ?? '');
        if (/^(MOVE|IMPULSE) /.test(command)) stats.moves++;
        if (/^PHASERS /.test(command)) stats.shots++;
        if (command === 'DOCK') stats.docks++;
        if (/^REPAIR /.test(command)) stats.repairs++;
      }
      if (event.event === 'death') stats.deaths++;
    } });
  };
  console.log(`Two-captain patrol soak, ${values.rounds} decisions each. Evidence: ${logs}`);
  const first = run('Scout', 'FEDERATION', 'YORKTOWN');
  // Attach a rejection handler immediately; a failed first login also releases
  // the rendezvous rather than leaving this runner waiting forever.
  void first.catch(() => joined());
  await firstJoined;
  const second = run('Raven', 'EMPIRE', 'WOLF');
  const results = await Promise.allSettled([first, second]);
  const report = { variant: 'austin', profile: 'playable', policy: 'captain-v2', configuredRounds: Number(values.rounds), results: results.map(r => r.status === 'fulfilled' ? r.value : { error: String(r.reason) }), captains: Object.fromEntries(Object.entries(summary).map(([name, stats]) => [name, { ...stats, positions: stats.positions.size }])) };
  writeFileSync(join(logs, 'summary.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (results.some(r => r.status === 'rejected')) process.exitCode = 1;
} finally {
  controller.abort(); process.off('SIGINT', stop); process.off('SIGTERM', stop);
  if (host.exitCode === null && host.signalCode === null) { const exited = once(host, 'exit'); host.kill('SIGTERM'); await exited; }
  rmSync(data, { recursive: true, force: true });
}
