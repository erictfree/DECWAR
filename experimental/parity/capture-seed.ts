import { appendFileSync, existsSync, writeFileSync } from 'node:fs';
import { PlayerClient } from '../automated-player/client.ts';
import { parseScan, parseStatus } from '../automated-player/observations.ts';

// Austin SETUP.FOR:169–193: a tournament seed applies only on world creation.
// Capture initial public observations without movement or weapons.
const [backend, port, seed, output, snapshotGate] = process.argv.slice(2);
if (!['typescript', 'pdp10'].includes(backend) || !/^\d+$/.test(port) || +port < 1 || +port > 65535 || !/^\d+$/.test(seed) || !Number.isSafeInteger(+seed) || +seed < 1 || !output) throw new Error('Usage: capture-seed.ts typescript|pdp10 PORT NONZERO_SEED NEW_OUTPUT');
writeFileSync(output, '', { flag: 'wx' });
let seeded = false, joined = false;
const record = (e: Record<string, unknown>) => {
  if (e.event === 'sent' && e.line === `TOURNAMENT ${seed}`) seeded = true;
  appendFileSync(output, JSON.stringify({ time: new Date().toISOString(), ...e }) + '\n');
};
record({ event: 'configuration', backend, seed: +seed, romulan: false, blackHoles: false, scope: 'initial public observations, not full galaxy' });
const client = new PlayerClient({ host: '127.0.0.1', port: +port, record, recordWire: true, timeoutMs: 120000, settleMs: 150 });
try {
  if (backend === 'pdp10') await client.startReference();
  await client.join({ name: 'Seedcheck', team: 'FEDERATION', ship: 'YORKTOWN', tournamentSeed: +seed });
  joined = true;
  if (!seeded) throw new Error('World already existed: tournament seed was not requested');
  const statusText = await client.command('STATUS');
  const bases = await client.command('BASES');
  const scanText = await client.command('SCAN 10');
  const position = parseStatus(statusText).position;
  const cells = parseScan(scanText).cells.map(({ v, h, symbol }) => ({ v, h, symbol }));
  record({ event: 'seed-observation', position, cells, bases, statusText, scanText });
  if (snapshotGate) {
    writeFileSync(snapshotGate + '.ready', '', { flag: 'wx' });
    const deadline = Date.now() + 300000;
    while (!existsSync(snapshotGate + '.release')) {
      if (Date.now() > deadline) throw new Error('Snapshot gate timed out');
      await new Promise(resolve => setTimeout(resolve, 250));
    }
  }
  record({ event: 'complete' });
} catch (error) { record({ event: 'failed', error: String(error) }); process.exitCode = 1; }
finally {
  try { if (joined) { if (backend === 'pdp10') await client.quitReference(); else await client.quit(); record({ event: 'cleanup-complete' }); } }
  catch (error) { record({ event: 'cleanup-error', error: String(error) }); process.exitCode = 1; }
  client.close();
}
