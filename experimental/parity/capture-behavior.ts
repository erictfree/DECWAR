import { appendFileSync, writeFileSync } from 'node:fs';
import { PlayerClient } from '../automated-player/client.ts';
import { observe } from '../automated-player/player.ts';
import { distance, parseStatus, type Position } from '../automated-player/observations.ts';
import { ObservedMap, route } from '../automated-player/navigation.ts';
import { movementChecks, rejectionChecks, dockingChecks, threatensFixture, type BehaviorCase } from './behavior.ts';

const [backend, port, output] = process.argv.slice(2);
if (!['typescript', 'pdp10'].includes(backend ?? '') || !port || !/^\d+$/.test(port) || +port < 1 || +port > 65535 || !output) throw new Error('Usage: capture-behavior.ts typescript|pdp10 PORT OUTPUT');
writeFileSync(output, '', { flag: 'wx' });
const record = (e: Record<string, unknown>) => appendFileSync(output, JSON.stringify({ time: new Date().toISOString(), ...e }) + '\n');
record({ event: 'configuration', backend, scenario: 'behavior-v1', stateAligned: false, maxApproachSteps: 80 });
const client = new PlayerClient({ host: '127.0.0.1', port: +port, record, recordWire: true, timeoutMs: backend === 'pdp10' ? 120000 : 20000, settleMs: 150 });
let joined = false;
const map = new ObservedMap();
async function sample() {
  const o = await observe(client, 'FEDERATION');
  map.ingest(o.scan, o.status.position); record({ event: 'behavior-observation', observation: o }); return o;
}
function suitable(o: Awaited<ReturnType<typeof sample>>) {
  // Distant installations are public navigation evidence, not an immediate
  // threat. Austin base activity uses radius 4; planets radius 2. Mobile
  // targets remain an exclusion regardless of their observed range.
  const threat = threatensFixture(o.status.position, o.targets ?? []);
  const now = Date.now();
  return now - o.scan.observedAt <= 5000 && now - o.status.observedAt <= 5000 && o.status.condition === 'Green' && o.status.hullDamage === 0 && o.status.energy > 1200 && Object.values(o.devices).every(d => d === 0) && !threat;
}
const skip = (id: string, reason: string) => record({ event: 'behavior-case', id, skip: reason });
async function action(id: string, command: string, check: (before: ReturnType<typeof parseStatus>, after: ReturnType<typeof parseStatus>) => Record<string, boolean>) {
  const before = parseStatus(await client.command('STATUS'));
  const response = await client.command(command);
  const after = parseStatus(await client.command('STATUS'));
  const entry: BehaviorCase = { event: 'behavior-case', id, command, response, before, after, checks: check(before, after) };
  record(entry);
}
try {
  if (backend === 'pdp10') await client.startReference();
  await client.join({ name: 'Parity', team: 'FEDERATION', ship: 'YORKTOWN' }); joined = true;
  // Explicit setup, shared by both backends. Source SET:3627-3718.
  await client.command('SET ICDEF ABSOLUTE');
  for (const id of ['invalid-coordinate', 'impulse-range']) {
    const o = await sample();
    if (!suitable(o)) { skip(id, 'Requires healthy ship outside observed threat ranges'); continue; }
    const p = o.status.position;
    const command = id === 'invalid-coordinate' ? 'MOVE ABSOLUTE 0 0' : `IMPULSE ABSOLUTE ${p.v <= 73 ? p.v + 2 : p.v - 2} ${p.h}`;
    await action(id, command, (before, after) => ({ ...rejectionChecks(before, after), dockingState: id === 'invalid-coordinate' ? before.docked === after.docked : !after.docked }));
  }
  for (const [id, engine] of [['warp-step', 'MOVE'], ['impulse-step', 'IMPULSE']] as const) {
    const o = await sample(), p = o.status.position;
    const candidate = [{ v: p.v + 1, h: p.h }, { v: p.v - 1, h: p.h }, { v: p.v, h: p.h + 1 }, { v: p.v, h: p.h - 1 }]
      .find(next => o.scan.cells.some(c => c.v === next.v && c.h === next.h && c.symbol === ' .') && map.danger(next, 'FEDERATION', Date.now(), true) === 0);
    if (!suitable(o) || !candidate) { skip(id, 'No healthy, freshly observed clear cardinal step'); continue; }
    await action(id, `${engine} ABSOLUTE ${candidate.v} ${candidate.h}`, (a, b) => movementChecks(a, b, candidate));
  }
  let docked = false;
  for (let step = 0; step <= 80; step++) {
    const o = await sample(), p = o.status.position;
    if (!suitable(o)) { skip('dock', 'Unsafe or damaged approach state'); docked = true; break; }
    const adjacentBases = o.scan.cells.filter(c => c.symbol === '<>' && distance(c, p) <= 1);
    const adjacentPlanets = o.scan.cells.filter(c => c.symbol === '@F' && distance(c, p) <= 1);
    if (adjacentBases.length === 1 && !adjacentPlanets.length) {
      await action('dock', 'DOCK', dockingChecks); docked = true; break;
    }
    if (step === 80) break;
    const base = [...o.bases].sort((a, b) => distance(a, p) - distance(b, p))[0];
    const next: Position | undefined = base && route(map, p, base, 'FEDERATION', Date.now(), true, true);
    if (!next || !o.scan.cells.some(c => c.v === next.v && c.h === next.h && c.symbol === ' .') || map.danger(next, 'FEDERATION', Date.now(), true)) break;
    const command = `MOVE ABSOLUTE ${next.v} ${next.h}`;
    const response = await client.command(command), after = parseStatus(await client.command('STATUS'));
    record({ event: 'approach-step', step, command, response, before: o.status, after });
    if (distance(after.position, next) !== 0) { map.block(next, Date.now()); }
  }
  if (!docked) skip('dock', 'No safe observed route to a single friendly base within 80 steps');
  record({ event: 'complete', cases: 5 });
} catch (error) { record({ event: 'failed', error: String(error) }); process.exitCode = 1; }
finally {
  try { if (joined) { if (backend === 'pdp10') await client.quitReference(); else await client.quit(); record({ event: 'cleanup-complete' }); } }
  catch (error) { record({ event: 'cleanup-error', error: String(error) }); process.exitCode = 1; }
  client.close();
}
