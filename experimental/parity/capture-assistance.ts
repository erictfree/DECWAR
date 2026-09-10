// Public Telnet observations only; no shared-state deposits or private RNG edits.
import { appendFileSync, writeFileSync } from 'node:fs';
import { PlayerClient } from '../automated-player/client.ts';
import { parseStatus, parseScan, distance } from '../automated-player/observations.ts';
import { ObservedMap } from '../automated-player/navigation.ts';
import { duelRoute } from './duel-route.ts';

const [backend, port, output, mode = 'standard'] = process.argv.slice(2);
if (!['typescript', 'pdp10'].includes(backend) || !/^\d+$/.test(port) || +port < 1 || +port > 65535 || !output) throw Error('Usage: capture-assistance.ts typescript|pdp10 PORT NEW_JSONL [standard|energy-edges|tractor-edges|energy-notices]');
if (!['standard', 'energy-edges', 'tractor-edges', 'energy-notices'].includes(mode)) throw Error('Unknown assistance mode');
writeFileSync(output, '', { flag: 'wx' });
const record = (e: object) => appendFileSync(output, JSON.stringify({ time: new Date().toISOString(), ...e }) + '\n');
const clients: { client: PlayerClient; role: string; joined: boolean }[] = [];
async function join(role: string, ship: string, team: 'FEDERATION' | 'EMPIRE' = 'FEDERATION') {
  const client = new PlayerClient({ host: '127.0.0.1', port: +port, timeoutMs: 120000, settleMs: 150, recordWire: true, record: e => record({ ...e, role }) });
  const entry = { client, role, joined: false }; clients.push(entry);
  if (backend === 'pdp10') await client.startReference();
  await client.join({ name: role, team, ship, tournamentSeed: 1729 });
  entry.joined = true; return client;
}
async function sample(client: PlayerClient) {
  const text = await client.command('STATUS');
  return { text, status: parseStatus(text) };
}
record({ event: 'configuration', backend, scenario: mode === 'standard' ? 'friendly-assistance-v1' : mode + '-v1', seed: 1729 });
try {
  const donor = await join('Donor', 'YORKTOWN');
  const initial = await sample(donor);
  if (distance(initial.status.position, { v: 7, h: 2 }) || initial.status.energy !== 5000) throw Error('Fresh seeded donor fixture missing');
  const receiver = await join('Receiver', 'VULCAN');
  async function step(label: string, command: string, actor = donor) {
    const before = { donor: await sample(donor), receiver: await sample(receiver) };
    const response = await actor.command(command);
    const after = { donor: await sample(donor), receiver: await sample(receiver) };
    record({ event: 'assistance-step', label, command, response, before, after });
  }
  if (mode === 'energy-edges') {
    if (distance((await sample(receiver)).status.position, initial.status.position) <= 1) throw Error('Distant recipient fixture missing');
    await step('energy-distant', 'ENERGY VULCAN 100');
    await step('energy-inactive', 'ENERGY WOLF 100');
  }
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
  if (mode === 'energy-edges') {
    for (let attempt = 0; attempt < 5; attempt++) {
      record({ event: 'restore', response: await receiver.command('DOCK') });
      if ((await sample(receiver)).status.energy === 5000) break;
    }
    const restored = (await sample(receiver)).status;
    if (restored.energy !== 5000 || !restored.shieldsUp || restored.hullDamage !== 0) throw Error('Capacity fixture not restored');
    const scan = parseScan(await receiver.command('SCAN 10'));
    if (!scan.cells.some(c => c.v === 8 && c.h === 3 && c.symbol === ' .')) throw Error('Capacity fixture movement cell unavailable');
    await receiver.command('MOVE ABSOLUTE 8 3');
    await receiver.command('MOVE ABSOLUTE 7 3');
    if ((await sample(receiver)).status.energy !== 4984) throw Error('Expected sixteen-unit capacity gap');
    await step('energy-clamp', 'ENERGY VULCAN 100');
    await step('energy-full', 'ENERGY VULCAN 100');
    await step('energy-negative', 'ENERGY VULCAN -1');
    await join('Opponent', 'WOLF', 'EMPIRE');
    await step('energy-enemy', 'ENERGY WOLF 100');
  } else if (mode === 'energy-notices') {
    for (let attempt = 0; attempt < 5; attempt++) {
      record({ event: 'restore', response: await receiver.command('DOCK') });
      if ((await sample(receiver)).status.energy === 5000) break;
    }
    const ready = (await sample(receiver)).status;
    if (ready.energy !== 5000 || !ready.shieldsUp || ready.hullDamage) throw Error('Notification fixture not restored');
    const scan = parseScan(await receiver.command('SCAN 10'));
    if (!scan.cells.some(c => c.v === 8 && c.h === 3 && c.symbol === ' .')) throw Error('Notification fixture movement cell unavailable');
    for (let n = 0; n < 3; n++) {
      await receiver.command('MOVE ABSOLUTE 8 3');
      await receiver.command('MOVE ABSOLUTE 7 3');
    }
    if ((await sample(receiver)).status.energy !== 4952) throw Error('Notification transfer capacity missing');
    await step('normal-transfer', 'ENERGY VULCAN 10');
    await step('radio-off', 'RADIO OFF', receiver);
    await step('radio-off-transfer', 'ENERGY VULCAN 10');
    await step('radio-on', 'RADIO ON', receiver);
    await step('gag-donor', 'RADIO GAG YORKTOWN', receiver);
    await step('gagged-transfer', 'ENERGY VULCAN 10');
    await step('ungag-donor', 'RADIO UNGAG YORKTOWN', receiver);
    await step('restored-transfer', 'ENERGY VULCAN 10');
  } else if (mode === 'tractor-edges') {
    const scan = parseScan(await receiver.command('SCAN 10'));
    if (!scan.cells.some(c => c.v === 8 && c.h === 3 && c.symbol === ' .') || !scan.cells.some(c => c.v === 8 && c.h === 2 && c.symbol === ' .')) throw Error('Tractor movement fixture unavailable');
    await step('donor-down', 'SHIELDS DOWN');
    await step('receiver-down', 'SHIELDS DOWN', receiver);
    await step('activate', 'TRACTOR VULCAN');
    await step('recipient-moves', 'MOVE ABSOLUTE 8 3', receiver);
    await step('recipient-shield-release', 'SHIELDS UP', receiver);
    await step('recipient-down-again', 'SHIELDS DOWN', receiver);
    await step('reactivate', 'TRACTOR VULCAN');
    await step('bare-release', 'TRACTOR');
    await step('attach-before-quit', 'TRACTOR VULCAN');
    const before = await sample(donor);
    if (backend === 'pdp10') await receiver.quitReference(); else await receiver.quit();
    clients.find(c => c.role === 'Receiver')!.joined = false;
    record({ event: 'cleanup-complete', role: 'Receiver' });
    const after = await sample(donor), users = await donor.command('USERS');
    if (/\bVulcan\b/.test(users)) throw Error('Quit recipient still listed');
    record({ event: 'quit-release', before, after, users });
    const response = await donor.command('MOVE ABSOLUTE 8 2');
    record({ event: 'solo-move', before: after, after: await sample(donor), response });
  } else {
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
  }
  record({ event: 'complete' });
} catch (error) { record({ event: 'failed', error: String(error) }); process.exitCode = 1; }
finally {
  for (const { client, role, joined } of [...clients].reverse()) {
    try { if (joined) { if (backend === 'pdp10') await client.quitReference(); else await client.quit(); record({ event: 'cleanup-complete', role }); } }
    catch (error) { record({ event: 'cleanup-error', role, error: String(error) }); process.exitCode = 1; }
    client.close();
  }
}
