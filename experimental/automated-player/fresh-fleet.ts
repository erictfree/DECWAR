// Starts an isolated Austin host, runs the external fleet, then removes only
// the temporary galaxy. This is an operating evaluation, not a parity test.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: {
  seconds: { type: 'string', default: '600' }, ships: { type: 'string', default: '4' },
  rounds: { type: 'string', default: '10000' }, lives: { type: 'string', default: '10' },
  'log-dir': { type: 'string' }, help: { type: 'boolean' },
  'federation-strategy': { type: 'string', default: 'objective' },
  'empire-strategy': { type: 'string', default: 'objective' },
  'federation-weapons': { type: 'string', default: 'torpedoes' },
  'empire-weapons': { type: 'string', default: 'torpedoes' },
  'tournament-seed': { type: 'string' },
  'submission-interval-ms': { type: 'string', default: '550' },
  'torpedo-corridor': { type: 'boolean', default: false },
  'federation-resupply': { type: 'string', default: 'baseline' },
  'empire-resupply': { type: 'string', default: 'baseline' },
  'federation-bases': { type: 'string', default: 'baseline' },
  'empire-bases': { type: 'string', default: 'baseline' },
  'federation-survey': { type: 'string', default: 'baseline' },
  'empire-survey': { type: 'string', default: 'baseline' },
  'federation-exploration': { type: 'string', default: 'baseline' },
  'empire-exploration': { type: 'string', default: 'baseline' },
  'federation-long-moves': { type: 'boolean', default: false },
  'empire-long-moves': { type: 'boolean', default: false },
  'federation-close-fire': { type: 'boolean', default: false },
  'empire-close-fire': { type: 'boolean', default: false },
} });
if (values.help) {
  console.log('Usage: node experimental/automated-player/fresh-fleet.ts [--seconds 600] [--rounds 10000] [--lives 10] [--ships 4|6|8|10|12|14|16|18] [--submission-interval-ms 550] [--federation-strategy objective|patrol|balanced|siege|aggressive] [--empire-strategy objective|patrol|balanced|siege|aggressive] [--federation-weapons torpedoes|phasers] [--empire-weapons torpedoes|phasers] [--tournament-seed N] [--torpedo-corridor] [--federation-resupply baseline|persistent] [--empire-resupply baseline|persistent] [--federation-bases baseline|coordinated] [--empire-bases baseline|coordinated] [--federation-survey baseline|handoff] [--empire-survey baseline|handoff] [--federation-exploration baseline|systematic] [--empire-exploration baseline|systematic] [--federation-long-moves] [--empire-long-moves] [--federation-close-fire] [--empire-close-fire] [--log-dir path]\nStarts a fresh temporary Austin playable host, runs the fleet, stops the host and removes the temporary galaxy.');
  process.exit(0);
}
const integer = (value: string, min: number, max: number) => {
  if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max) throw new Error(`Invalid numeric option: ${value}`);
  return Number(value);
};
const rounds = integer(values.rounds, 1, 1000000), lives = integer(values.lives, 1, 1000);
const seconds = integer(values.seconds, 1, 86400), ships = integer(values.ships, 4, 18);
const submissionIntervalMs = integer(values['submission-interval-ms'], 0, 60000);
const tournamentSeed = values['tournament-seed'] === undefined ? undefined : integer(values['tournament-seed'], 0, Number.MAX_SAFE_INTEGER);
if (ships % 2) throw new Error('Fleet ship count must be even');
for (const value of [values['federation-strategy'], values['empire-strategy']]) if (value !== 'objective' && value !== 'patrol' && value !== 'balanced' && value !== 'siege' && value !== 'aggressive') throw new Error(`Invalid strategy: ${value}`);
for (const value of [values['federation-weapons'], values['empire-weapons']]) if (value !== 'torpedoes' && value !== 'phasers') throw new Error(`Invalid weapon policy: ${value}`);
const root = fileURLToPath(new URL('../../', import.meta.url));
for (const value of [values['federation-resupply'], values['empire-resupply']]) if (!['baseline', 'persistent'].includes(value)) throw new Error(`Invalid resupply policy: ${value}`);
const directory = resolve(values['log-dir'] ?? join(root, 'logs', `automated-player-fresh-fleet-${Date.now()}`));
mkdirSync(directory, { recursive: true });
writeFileSync(join(directory, 'launcher.json'), JSON.stringify({ policy: 'captain-v21-installation-assault', torpedoCorridor: values['torpedo-corridor'], variant: 'austin', profile: 'playable', seconds, ships, rounds, lives, tournamentSeed, federationResupply: values['federation-resupply'], empireResupply: values['empire-resupply'], federationBases: values['federation-bases'], empireBases: values['empire-bases'], federationSurvey: values['federation-survey'], empireSurvey: values['empire-survey'], federationStrategy: values['federation-strategy'], empireStrategy: values['empire-strategy'], federationWeapons: values['federation-weapons'], empireWeapons: values['empire-weapons'], startedAt: new Date().toISOString() }, null, 2) + '\n', { flag: 'wx' });
const data = mkdtempSync(join(tmpdir(), 'decwar-objective-fleet-'));
const host = spawn(process.execPath, ['tools/run-telnet.ts', '--port', '0', '--variant', 'austin', '--data', data, '--log', join(directory, 'host.jsonl')], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
let fleet: ReturnType<typeof spawn> | undefined;
let output = '';
host.stdout.on('data', bytes => { output += String(bytes); appendFileSync(join(directory, 'host.stdout.log'), bytes); });
host.stderr.on('data', bytes => appendFileSync(join(directory, 'host.stderr.log'), bytes));
const stop = () => {
  if (fleet && fleet.exitCode === null && fleet.signalCode === null) fleet.kill('SIGTERM');
  if (host.exitCode === null && host.signalCode === null) host.kill('SIGTERM');
};
process.on('SIGINT', stop); process.on('SIGTERM', stop);
try {
  const port = await new Promise<number>((resolvePort, reject) => {
    const timer = setTimeout(() => reject(new Error(`Host startup timed out: ${output}`)), 15000);
    host.on('error', error => { clearTimeout(timer); reject(error); });
    host.on('exit', code => { clearTimeout(timer); reject(new Error(`Host exited before fleet startup: ${code}`)); });
    host.stdout.on('data', () => {
      const match = /telnet 127\.0\.0\.1 (\d+)/.exec(output);
      if (match) { clearTimeout(timer); resolvePort(Number(match[1])); }
    });
  });
  writeFileSync(join(directory, 'endpoint.json'), JSON.stringify({ host: '127.0.0.1', port }, null, 2) + '\n', { flag: 'wx' });
  const fleetArgs = ['experimental/automated-player/fleet.ts', '--port', String(port), '--seconds', String(seconds), '--rounds', String(rounds), '--lives', String(lives), '--ships', String(ships), '--submission-interval-ms', String(submissionIntervalMs), '--federation-strategy', values['federation-strategy'], '--empire-strategy', values['empire-strategy'], '--federation-weapons', values['federation-weapons'], '--empire-weapons', values['empire-weapons'], '--log-dir', join(directory, 'fleet')];
  fleetArgs.push('--federation-resupply', values['federation-resupply'], '--empire-resupply', values['empire-resupply'], '--federation-bases', values['federation-bases'], '--empire-bases', values['empire-bases'], '--federation-survey', values['federation-survey'], '--empire-survey', values['empire-survey'], '--federation-exploration', values['federation-exploration'], '--empire-exploration', values['empire-exploration']);
  if (values['federation-long-moves']) fleetArgs.push('--federation-long-moves');
  if (values['empire-long-moves']) fleetArgs.push('--empire-long-moves');
  if (values['federation-close-fire']) fleetArgs.push('--federation-close-fire');
  if (values['empire-close-fire']) fleetArgs.push('--empire-close-fire');
  if (values['torpedo-corridor']) fleetArgs.push('--torpedo-corridor');
  if (tournamentSeed !== undefined) fleetArgs.push('--tournament-seed', String(tournamentSeed));
  fleet = spawn(process.execPath, fleetArgs, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  fleet.stdout?.on('data', bytes => appendFileSync(join(directory, 'fleet.stdout.log'), bytes));
  fleet.stderr?.on('data', bytes => appendFileSync(join(directory, 'fleet.stderr.log'), bytes));
  const [code, signal] = await once(fleet, 'exit');
  writeFileSync(join(directory, 'launcher-result.json'), JSON.stringify({ finishedAt: new Date().toISOString(), fleetExitCode: code, fleetSignal: signal }, null, 2) + '\n', { flag: 'wx' });
  if (code !== 0) process.exitCode = typeof code === 'number' ? code : 1;
} finally {
  stop();
  if (host.exitCode === null && host.signalCode === null) await once(host, 'exit');
  process.off('SIGINT', stop); process.off('SIGTERM', stop);
  rmSync(data, { recursive: true, force: true });
}
