import { appendFileSync, writeFileSync } from 'node:fs';
import { PlayerClient } from '../automated-player/client.ts';
import { parseScan, parseStatus } from '../automated-player/observations.ts';
import { sequence, shotSequence, sequenceChecks } from './sequence.ts';

const [backend, port, output, mode = 'movement'] = process.argv.slice(2);
if (!['movement', 'star-shot'].includes(mode)) throw new Error('Unknown sequence mode');
const selected = mode === 'star-shot' ? shotSequence : sequence;
if (!['typescript', 'pdp10'].includes(backend) || !/^\d+$/.test(port) || +port < 1 || +port > 65535 || !output) throw new Error('Usage: capture-sequence.ts typescript|pdp10 PORT NEW_OUTPUT');
writeFileSync(output, '', { flag: 'wx' });
let seeded = false, joined = false;
const record = (e: Record<string, unknown>) => { if (e.event === 'sent' && e.line === 'TOURNAMENT 1729') seeded = true; appendFileSync(output, JSON.stringify({ time: new Date().toISOString(), ...e }) + '\n'); };
record({ event: 'configuration', backend, scenario: 'seeded-sequence-v1', mode, seed: 1729, romulan: false, blackHoles: false });
const client = new PlayerClient({ host: '127.0.0.1', port: +port, record, recordWire: true, timeoutMs: 120000, settleMs: 150 });
async function sample() { return { status: await client.command('STATUS'), damages: await client.command('DAMAGES'), scan: await client.command('SCAN 10') }; }
try {
  if (backend === 'pdp10') await client.startReference();
  await client.join({ name: 'Sequence', team: 'FEDERATION', ship: 'YORKTOWN', tournamentSeed: 1729 }); joined = true;
  if (!seeded) throw new Error('Inherited world: seed was not selected');
  const initial = await sample(), status = parseStatus(initial.status), cells = parseScan(initial.scan).cells;
  if (status.position.v !== 7 || status.position.h !== 2 || status.energy !== 5000 ||
      ![[7, 3, ' .'], [8, 3, ' .'], [7, 4, '<>']].every(([v, h, symbol]) => cells.some(c => c.v === v && c.h === h && c.symbol === symbol))) throw new Error('Initial seeded fixture not present');
  record({ event: 'initial', ...initial });
  if (mode === 'star-shot' && !cells.some(c => c.v === 11 && c.h === 1 && c.symbol === ' *')) throw new Error('Target star missing');
  for (let index = 0; index < selected.length; index++) {
    const command = selected[index][0], response = await client.command(command), after = await sample();
    record({ event: 'sequence-step', index, command, response, ...after });
    if (!Object.values(sequenceChecks(index, after.status, mode)).every(Boolean)) throw new Error(`Source state contract failed at step ${index + 1}`);
  }
  record({ event: 'complete', steps: selected.length });
} catch (error) { record({ event: 'failed', error: String(error) }); process.exitCode = 1; }
finally {
  try { if (joined) { if (backend === 'pdp10') await client.quitReference(); else await client.quit(); record({ event: 'cleanup-complete' }); } }
  catch (error) { record({ event: 'cleanup-error', error: String(error) }); process.exitCode = 1; }
  client.close();
}
