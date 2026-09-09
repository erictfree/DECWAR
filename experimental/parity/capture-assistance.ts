// Public Telnet observations only; no shared-state deposits or private RNG edits.
import { appendFileSync, writeFileSync } from 'node:fs';
import { PlayerClient } from '../automated-player/client.ts';
import { parseStatus, parseScan, distance } from '../automated-player/observations.ts';
import { ObservedMap } from '../automated-player/navigation.ts';
import { duelRoute } from './duel-route.ts';

const [backend, port, output] = process.argv.slice(2);
if (!['typescript', 'pdp10'].includes(backend) || !/^\d+$/.test(port) || +port < 1 || +port > 65535 || !output) throw Error('Usage: capture-assistance.ts typescript|pdp10 PORT NEW_JSONL');
writeFileSync(output, '', { flag: 'wx' });
const record = (e: object) => appendFileSync(output, JSON.stringify({ time: new Date().toISOString(), ...e }) + '\n');
const clients: { client: PlayerClient; role: string; joined: boolean }[] = [];
async function join(role: string, ship: string) {
  const client = new PlayerClient({ host: '127.0.0.1', port: +port, timeoutMs: 120000, settleMs: 150, recordWire: true, record: e => record({ ...e, role }) });
  const entry = { client, role, joined: false }; clients.push(entry);
  if (backend === 'pdp10') await client.startReference();
  await client.join({ name: role, team: 'FEDERATION', ship, tournamentSeed: 1729 });
  entry.joined = true; return client;
}
async function sample(client: PlayerClient) {
  const text = await client.command('STATUS');
  return { text, status: parseStatus(text) };
}
record({ event: 'configuration', backend, scenario: 'friendly-assistance-v1', seed: 1729 });
try {
  const donor = await join('Donor', 'YORKTOWN');
  const initial = await sample(donor);
  if (distance(initial.status.position, { v: 7, h: 2 }) || initial.status.energy !== 5000) throw Error('Fresh seeded donor fixture missing');
  const receiver = await join('Receiver', 'VULCAN');
  const map = new ObservedMap(), goal = { v: 7, h: 3 };
  let arrived = false;
  for (let step = 0; step < 70; step++) {
    const observation = await sample(receiver);
    const scan = parseScan(await receiver.command('SCAN 10'));
    record({ event: 'approach', step, ...observation, scan });
    if (!distance(observation.status.position, goal)) { arrived = true; break; }
    if (observation.status.energy < 1500 || observation.status.hullDamage) throw Error('Approach health/reserve guard');
    map.ingest(scan, observation.status.position);
    const next = duelRoute(map, scan, observation.status.position, goal, Date.now(), 'FEDERATION');
    if (!next) throw Error('No safe observed approach');
    record({ event: 'setup-move', response: await receiver.command(`MOVE ABSOLUTE ${next.v} ${next.h}`) });
  }
  if (!arrived) throw Error('Approach budget exhausted');
  async function step(label: string, command: string, actor = donor) {
    const before = { donor: await sample(donor), receiver: await sample(receiver) };
    const response = await actor.command(command);
    const after = { donor: await sample(donor), receiver: await sample(receiver) };
    record({ event: 'assistance-step', label, command, response, before, after });
  }
  // ENERGY.FOR:29–105 validation, attenuation and capacity; TRACTR.FOR:27–132.
  await step('energy-self', 'ENERGY YORKTOWN 100');
  await step('energy-zero', 'ENERGY VULCAN 0');
  await step('energy-reserve', 'ENERGY VULCAN 5000');
  await step('energy-transfer', 'ENERGY VULCAN 100');
  await step('energy-capacity', 'ENERGY VULCAN 100');
  await step('tractor-shields', 'TRACTOR VULCAN');
  await step('donor-shields-down', 'SHIELDS DOWN');
  await step('tractor-receiver-shields', 'TRACTOR VULCAN');
  await step('receiver-shields-down', 'SHIELDS DOWN', receiver);
  await step('tractor-activate', 'TRACTOR VULCAN');
  await step('tractor-tow', 'MOVE ABSOLUTE 8 2');
  await step('tractor-shield-release', 'SHIELDS UP');
  await step('donor-shields-down-again', 'SHIELDS DOWN');
  await step('tractor-reactivate', 'TRACTOR VULCAN');
  await step('tractor-off', 'TRACTOR OFF');
  await step('tractor-off-inactive', 'TRACTOR OFF');
  record({ event: 'complete' });
} catch (error) { record({ event: 'failed', error: String(error) }); process.exitCode = 1; }
finally {
  for (const { client, role, joined } of [...clients].reverse()) {
    try { if (joined) { if (backend === 'pdp10') await client.quitReference(); else await client.quit(); record({ event: 'cleanup-complete', role }); } }
    catch (error) { record({ event: 'cleanup-error', role, error: String(error) }); process.exitCode = 1; }
    client.close();
  }
}
