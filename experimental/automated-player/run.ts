import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { play } from './player.ts';

const { values } = parseArgs({ options: {
  host: { type: 'string', default: '127.0.0.1' }, port: { type: 'string', default: '2423' },
  name: { type: 'string', default: 'Scout' }, team: { type: 'string', default: 'FEDERATION' },
  ship: { type: 'string', default: 'YORKTOWN' }, rounds: { type: 'string', default: '12' },
  'interval-ms': { type: 'string', default: '500' }, log: { type: 'string' },
  romulan: { type: 'boolean', default: false }, 'black-holes': { type: 'boolean', default: false },
  'tournament-seed': { type: 'string' },
  'stay-connected': { type: 'boolean', default: false },
  mode: { type: 'string', default: 'patrol' },
  lives: { type: 'string', default: '3' },
  help: { type: 'boolean', default: false },
} });

if (values.help) {
  console.log('Usage: node experimental/automated-player/run.ts [--host 127.0.0.1] [--port 2423] [--name Scout] [--team FEDERATION|EMPIRE] [--ship YORKTOWN] [--mode patrol|resupply|objective|defense] [--rounds 12] [--lives 3] [--interval-ms 500] [--log path] [--romulan] [--black-holes] [--tournament-seed N] [--stay-connected]\nAustin playable only. Objective mode captures and develops planets; defense mode guards friendly installations. --tournament-seed selects the source game mode only when this is the first arrival in a new galaxy. --stay-connected keeps observing after the tactic stops; Ctrl-C quits. See experimental/automated-player/README.md.');
} else {
  const integer = (value: string, min: number, max: number, label: string) => {
    if (!/^\d+$/.test(value) || Number(value) < min || Number(value) > max) throw new Error(`Invalid ${label}`);
    return Number(value);
  };
  const port = integer(values.port, 1, 65535, 'port');
  const rounds = integer(values.rounds, 1, 10000, 'round limit');
  const lives = integer(values.lives, 1, 100, 'life limit');
  const intervalMs = integer(values['interval-ms'], 100, 60000, 'interval');
  const tournamentSeed = values['tournament-seed'] === undefined ? undefined : integer(values['tournament-seed'], 0, Number.MAX_SAFE_INTEGER, 'tournament seed');
  const team = values.team.toUpperCase();
  if (team !== 'FEDERATION' && team !== 'EMPIRE') throw new Error('Team must be FEDERATION or EMPIRE');
  if (values.mode !== 'patrol' && values.mode !== 'resupply' && values.mode !== 'objective' && values.mode !== 'defense') throw new Error('Mode must be patrol, resupply, objective or defense');
  const log = resolve(values.log ?? `logs/automated-player-${new Date().toISOString().replaceAll(':', '-')}-${process.pid}.jsonl`);
  mkdirSync(dirname(log), { recursive: true });
  const record = (event: Record<string, unknown>) => {
    appendFileSync(log, JSON.stringify({ time: new Date().toISOString(), ...event }) + '\n');
    if (event.event === 'joined') console.log(`Joined as ${event.name} in ${event.ship}.`);
    if (event.event === 'decision') console.log(`${event.command ?? event.kind}: ${event.reason}`);
    if (event.event === 'holding') console.log('Staying connected and observing. Ctrl-C quits.');
    if (event.event === 'rejoined') console.log(`Rejoined ${event.ship} after losing a ship.`);
  };
  record({ event: 'configuration', variant: 'austin', profile: 'playable', policy: 'captain-v8', ...values });
  console.log(`Experimental Austin player ${values.name}; transcript: ${log}`);
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  try {
    const result = await play({ host: values.host, port, name: values.name, team, ship: values.ship.toUpperCase(), rounds, intervalMs, romulan: values.romulan, blackHoles: values['black-holes'], tournamentSeed, stayConnected: values['stay-connected'], signal: controller.signal, mode: values.mode, lives, record });
    console.log(result.reason);
  } catch (error) { console.error(String(error)); process.exitCode = 1; }
  finally { process.off('SIGINT', stop); process.off('SIGTERM', stop); }
}
