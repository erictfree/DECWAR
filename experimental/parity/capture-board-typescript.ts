import { once } from 'node:events';
import { writeFileSync } from 'node:fs';
import { createTelnetServer } from '../../src/transport/server.ts';
import { createGameSession } from '../../src/runtime/game-session.ts';
import { SharedGameWorld } from '../../src/runtime/shared-world.ts';
import { createVariantContext } from '../../src/runtime/variant.ts';
import { PlayerClient } from '../automated-player/client.ts';

const [seed, output] = process.argv.slice(2);
if (!seed || !/^\d+$/.test(seed) || !Number.isSafeInteger(+seed) || +seed < 1 || !output) throw new Error('Usage: capture-board-typescript.ts NONZERO_SEED NEW_OUTPUT');
const world = new SharedGameWorld(undefined, createVariantContext('austin', 'playable'));
let runtime: ReturnType<typeof createGameSession> | undefined;
const host = createTelnetServer({ createSession(terminal, connection) {
  runtime = createGameSession(terminal, 'full', world, connection.id, { promptForName: true, playable: true });
  return runtime.program;
} });
host.server.listen(0, '127.0.0.1');
await once(host.server, 'listening');
const address = host.server.address();
if (!address || typeof address === 'string') throw new Error('No TCP port');
const events: Record<string, unknown>[] = [];
const client = new PlayerClient({ host: '127.0.0.1', port: address.port, record: e => events.push(e), recordWire: true, timeoutMs: 20000, settleMs: 150 });
try {
  await client.join({ name: 'Seedcheck', team: 'FEDERATION', ship: 'YORKTOWN', tournamentSeed: +seed });
  if (!events.some(e => e.event === 'sent' && e.line === `TOURNAMENT ${seed}`)) throw new Error('Fresh seed selection missing');
  const status = await client.command('STATUS'), bases = await client.command('BASES'), scan = await client.command('SCAN 10');
  if (!runtime) throw new Error('Missing runtime');
  const start = runtime.f.high.address('board', 1);
  const words = Array.from({ length: 1875 }, (_, i) => BigInt.asUintN(36, runtime!.f.m.read(start + BigInt(i))).toString(8).padStart(12, '0'));
  await client.quit();
  writeFileSync(output, JSON.stringify({ schema: 'typescript-board-v1', seed: +seed, profile: 'playable', romulan: false, blackHoles: false, addressOctal: start.toString(8), words, status, bases, scan, events, cleanupComplete: true }, null, 2) + '\n', { flag: 'wx' });
} finally { client.close(); await host.close(); }
