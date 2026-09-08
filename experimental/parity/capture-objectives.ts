import { appendFileSync, writeFileSync } from 'node:fs';
import { PlayerClient } from '../automated-player/client.ts';
import { observe } from '../automated-player/player.ts';
import { distance, type Position } from '../automated-player/observations.ts';
import { ObservedMap, route } from '../automated-player/navigation.ts';
import { threatensFixture } from './behavior.ts';
import { objectiveIds, type ObjectiveFrame } from './objectives.ts';

const [backend, port, output] = process.argv.slice(2);
if (!['typescript', 'pdp10'].includes(backend ?? '') || !port || !/^\d+$/.test(port) || +port < 1 || +port > 65535 || !output) throw new Error('Usage: capture-objectives.ts typescript|pdp10 PORT OUTPUT');
writeFileSync(output, '', { flag: 'wx' });
const record = (e: Record<string, unknown>) => appendFileSync(output, JSON.stringify({ time: new Date().toISOString(), ...e }) + '\n');
record({ event: 'configuration', backend, scenario: 'objectives-v1', stateAligned: false, maxApproachSteps: 60 });
const client = new PlayerClient({ host: '127.0.0.1', port: +port, record, recordWire: true, timeoutMs: backend === 'pdp10' ? 120000 : 20000, settleMs: 150 });
const emitted = new Set<string>(), map = new ObservedMap();
let joined = false, target: Position | undefined;
const skip = (id: string, reason: string) => { record({ event: 'objective-case', id, skip: reason }); emitted.add(id); };
async function sample() { const o = await observe(client, 'FEDERATION'); map.ingest(o.scan, o.status.position); record({ event: 'objective-observation', observation: o }); return o; }
function frame(o: Awaited<ReturnType<typeof sample>>): ObjectiveFrame {
  return { status: o.status, baseCount: o.bases.length, target: o.objects?.find(c => c.position && target && distance(c.position, target) === 0), symbol: o.scan.cells.find(c => target && distance(c, target) === 0)?.symbol };
}
async function measure(id: string, command: string) {
  const observation = await sample(), before = frame(observation);
  if (!before.target?.position || !before.symbol || distance(before.status.position, before.target.position) > 1 || Date.now() - observation.scan.observedAt > 5000) throw new Error(`Fresh adjacent target unavailable for ${id}`);
  const response = await client.command(command);
  const after = frame(await sample());
  record({ event: 'objective-case', id, command, response, before, after }); emitted.add(id); return after;
}
try {
  if (backend === 'pdp10') await client.startReference();
  await client.join({ name: 'Worldcheck', team: 'FEDERATION', ship: 'YORKTOWN' }); joined = true;
  await client.command('SET ICDEF ABSOLUTE');
  let ready = false, waypoint = 0;
  const waypoints = [{ v: 20, h: 20 }, { v: 20, h: 55 }, { v: 55, h: 55 }, { v: 55, h: 20 }];
  for (let step = 0; step <= 60; step++) {
    const o = await sample(), p = o.status.position;
    if (o.status.energy < 3500 || o.status.shieldPercent < 75 || threatensFixture(p, o.targets ?? []) || o.devices.warp > 0 || o.devices.computer > 0) break;
    const neutral = (o.objects ?? []).filter(c => c.kind === 'planet' && c.faction === 'NEUTRAL' && c.builds === 0 && c.position)
      .filter(c => !map.danger(c.position!, 'FEDERATION', Date.now(), true))
      .sort((a, b) => distance(a.position!, p) - distance(b.position!, p));
    target ??= neutral[0]?.position;
    if (target && distance(p, target) <= 1) {
      ready = neutral.some(c => distance(c.position!, target!) === 0) && o.scan.cells.some(c => distance(c, target!) === 0 && c.symbol === ' @');
      break;
    }
    if (step === 60) break;
    if (distance(p, waypoints[waypoint]!) <= 1) waypoint = (waypoint + 1) % waypoints.length;
    const next = route(map, p, target ?? waypoints[waypoint]!, 'FEDERATION', Date.now(), true, true);
    if (!next || !o.scan.cells.some(c => distance(c, next) === 0 && c.symbol === ' .') || map.danger(next, 'FEDERATION', Date.now(), true)) break;
    const command = `MOVE ABSOLUTE ${next.v} ${next.h}`, response = await client.command(command);
    record({ event: 'objective-approach', step, target, command, response });
  }
  if (!ready || !target) {
    for (const id of objectiveIds) skip(id, 'No suitable neutral planet reached within bounded public-observation setup');
  } else {
    const location = `ABSOLUTE ${target.v} ${target.h}`;
    await measure('build-neutral', `BUILD ${location}`);
    let result = await measure('capture', `CAPTURE ${location}`);
    if (result.target?.faction !== 'FEDERATION' || result.target.builds !== 0) throw new Error('Capture ownership not confirmed; stopping construction');
    for (let n = 1; n <= 4; n++) {
      result = await measure(`build-${n}`, `BUILD ${location}`);
      if (result.target?.builds !== n || result.target.faction !== 'FEDERATION') throw new Error(`Build ${n} not confirmed; stopping`);
    }
    result = await measure('conversion', `BUILD ${location}`);
    if (result.target?.kind === 'base' && result.symbol === '<>') {
      const o = await sample();
      const assets = o.scan.cells.filter(c => ['<>', '@F'].includes(c.symbol) && distance(c, o.status.position) <= 1);
      if (assets.length === 1) await measure('dock-new-base', 'DOCK');
      else skip('dock-new-base', 'Conversion observed, but multiple adjacent friendly assets prevent single-base attribution');
    } else skip('dock-new-base', 'No new base: conversion unavailable; capacity rejection is separate coverage');
  }
  record({ event: 'complete', cases: emitted.size });
} catch (error) { record({ event: 'failed', error: String(error) }); process.exitCode = 1; }
finally {
  try { if (joined) { if (backend === 'pdp10') await client.quitReference(); else await client.quit(); record({ event: 'cleanup-complete' }); } }
  catch (error) { record({ event: 'cleanup-error', error: String(error) }); process.exitCode = 1; }
  client.close();
}
