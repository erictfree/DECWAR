import { appendFileSync, writeFileSync, existsSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { PlayerClient, ReentryRequired } from '../automated-player/client.ts';
import { distance, parseDevices, parseScan, parseStatus, type Position } from '../automated-player/observations.ts';
import { ObservedMap } from '../automated-player/navigation.ts';
import { duelRoute } from './duel-route.ts';
import { captureInstallations } from './installations.ts';

const [backend, port, output, mode = 'two-shots', gate] = process.argv.slice(2);
if (!['two-shots', 'destruction', 'installations'].includes(mode)) throw new Error('Unknown duel mode');
if (!['typescript', 'pdp10'].includes(backend) || !/^\d+$/.test(port) || +port < 1 || +port > 65535 || !output) throw new Error('Usage: capture-duel.ts typescript|pdp10 PORT NEW_OUTPUT [two-shots|destruction|installations] [GATE_PREFIX]');
writeFileSync(output, '', { flag: 'wx' });
const record = (e: Record<string, unknown>) => appendFileSync(output, JSON.stringify({ time: new Date().toISOString(), ...e }) + '\n');
record({ event: 'configuration', backend, scenario: 'seeded-duel-v1', setupPolicy: 'even-target-turns-v1', mode, destructionPolicy: mode === 'destruction' ? 'stationary-unshielded-phasers-v1' : undefined, seed: 1729, romulan: false, blackHoles: false });
const clients: { role: string; client: PlayerClient; joined: boolean }[] = [];
async function join(role: string, team: 'FEDERATION' | 'EMPIRE', ship: string) {
  const client = new PlayerClient({ host: '127.0.0.1', port: +port, timeoutMs: 120000, settleMs: 150, recordWire: true, record: e => record({ ...e, role }) });
  const entry = { role, client, joined: false }; clients.push(entry);
  if (backend === 'pdp10') await client.startReference();
  await client.join({ name: role === 'attacker' ? 'Attacker' : 'Target', team, ship, tournamentSeed: 1729 }); entry.joined = true;
  return client;
}
async function sample(client: PlayerClient) {
  const statusText = await client.command('STATUS'), scanText = await client.command('SCAN 10');
  return { statusText, scanText, status: parseStatus(statusText), scan: parseScan(scanText) };
}
async function combatState(client: PlayerClient) {
  const state = await sample(client);
  return { ...state, damages: await client.command('DAMAGES'), points: await client.command('POINTS') };
}
try {
  const attacker = await join('attacker', 'FEDERATION', 'YORKTOWN');
  const a = await sample(attacker);
  if (a.status.position.v !== 7 || a.status.position.h !== 2 || a.status.energy !== 5000) throw new Error('Expected seed-1729 attacker not present');
  record({ event: 'attacker-initial', ...a });
  const target = await join('target', 'EMPIRE', 'WOLF');
  const map = new ObservedMap(), goal = { v: 14, h: 10 };
  let arrived = false, previous: Position | undefined, setupTurns = 0;
  for (let step = 0; step < 70; step++) {
    const o = await sample(target), now = Date.now(), p = o.status.position;
    record({ event: 'target-approach', step, ...o }); map.ingest(o.scan, p);
    if (previous && distance(previous, p) === 0) throw new Error('Target move made no progress');
    if (distance(p, goal) === 0) { arrived = true; break; }
    if (o.status.energy < 1500 || o.status.hullDamage > 0) throw new Error('Target approach reserve/health guard');
    const next = duelRoute(map, o.scan, p, goal, now);
    if (!next) throw new Error('No safe public-observation route to fixture base');
    previous = p;
    record({ event: 'target-move', command: `MOVE ABSOLUTE ${next.v} ${next.h}`, response: await target.command(`MOVE ABSOLUTE ${next.v} ${next.h}`) });
    setupTurns++;
  }
  if (!arrived) throw new Error('Target approach budget exhausted');
  const portView = await sample(target);
  if (!portView.scan.cells.some(c => c.v === 15 && c.h === 10 && c.symbol === ')(')) throw new Error('Fixture base missing');
  // DOCK adds at most 1,000 displayed energy per command (DOCK:920–936).
  // Long approaches can require several visits before the fixture is full.
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await target.command('DOCK'), statusText = await target.command('STATUS');
    record({ event: 'target-dock', attempt, response, statusText });
    setupTurns++;
    if (parseStatus(statusText).energy === 5000) break;
  }
  // Austin main:223–239: shared DOTIME invokes defenses every NUMPLY
  // completed actions. Two players require even setup turns before the fixed
  // approaches. A full-supply DOCK advances the counter without changing ship
  // supplies. Do this before the same complete restoration checks below.
  if (setupTurns % 2) {
    record({ event: 'target-phase-dock', response: await target.command('DOCK') });
    setupTurns++;
  }
  record({ event: 'setup-phase', setupTurns, players: 2 });
  const restored = await combatState(target);
  if (restored.status.stardate !== setupTurns) throw new Error('Target setup action count differs from public stardate');
  if (!restored.status.docked || restored.status.energy !== 5000 || restored.status.hullDamage !== 0 || restored.status.shieldPercent !== 100 || restored.status.torpedoes !== 10 || Object.values(parseDevices(restored.damages)).some(v => v !== 0)) throw new Error('Target not fully restored');
  record({ event: 'target-restored', ...restored });
  for (const v of [13, 12, 11, 10]) await target.command(`MOVE ABSOLUTE ${v} 10`);
  for (const [v, h] of [[8, 2], [9, 2], [10, 2], [10, 3], [10, 4], [10, 5], [10, 6], [10, 7], [10, 8], [10, 9]]) await attacker.command(`MOVE ABSOLUTE ${v} ${h}`);
  const before = { attacker: await combatState(attacker), target: await combatState(target) };
  if (before.attacker.status.position.v !== 10 || before.attacker.status.position.h !== 9 || before.attacker.status.energy !== 4920 || before.target.status.position.v !== 10 || before.target.status.position.h !== 10 || before.target.status.energy !== 4968 || before.target.status.shieldPercent !== 100 || before.target.status.hullDamage !== 0) throw new Error('Aligned firing fixture not reached');
  record({ event: 'combat-ready', ...before });
  if (mode === 'installations') {
    await captureInstallations(attacker, target, record);
  } else {
  for (const command of ['PHASERS ABSOLUTE 180 10 10', 'TORPEDOES ABSOLUTE 1 10 10']) {
    if (gate && command.startsWith('TORPEDOES')) {
      writeFileSync(gate + '.ready', '', { flag: 'wx' });
      record({ event: 'torpedo-gate', gate });
      const deadline = Date.now() + 300000;
      while (!existsSync(gate + '.release')) {
        if (Date.now() >= deadline) throw new Error('Torpedo debugger gate timed out');
        await delay(100);
      }
    }
    const response = await attacker.command(command);
    const after = { attacker: await combatState(attacker), target: await combatState(target) };
    record({ event: 'combat-step', command, response, ...after });
  }
  if (mode === 'destruction') {
    record({ event: 'target-lower-shields', response: await target.command('SHIELDS DOWN') });
    let destroyed = false;
    for (let shot = 0; shot < 8; shot++) {
      const t = await sample(target), a = await sample(attacker), p = t.status.position;
      if (!a.scan.cells.some(c => distance(c, p) === 0 && c.symbol === ' W') || a.status.energy < 380 || t.status.shieldsUp) throw new Error('Target or energy unavailable for destruction check');
      const command = `PHASERS ABSOLUTE 180 ${p.v} ${p.h}`, response = await attacker.command(command);
      record({ event: 'destruction-shot', shot, command, response });
      try { record({ event: 'destruction-after', shot, attacker: await combatState(attacker), target: await combatState(target) }); }
      catch (error) {
        if (!(error instanceof ReentryRequired)) throw error;
        const users = await attacker.command('USERS'), survivor = await combatState(attacker);
        if (/\bWolf\b/.test(users)) throw new Error('Destroyed target still listed in USERS');
        record({ event: 'target-destroyed', shot, users, attacker: survivor });
        // SETUP.FOR:76–113: enter PREGAME, then QUIT to the monitor.
        if (backend === 'pdp10') {
          await target.exchange('PREGAME', /PG> $/);
          await target.exchange('QUIT', /(?:^|\r?\n)\.$/);
          const logout = await target.exchange('K/F', /(?:^|\r?\n)\.$/);
          if (!logout.includes('Logged-off')) throw new Error('Dead-target monitor logout unconfirmed');
        } else await target.quit();
        clients.find(c => c.role === 'target')!.joined = false;
        record({ event: 'cleanup-complete', role: 'target', afterDeath: true });
        destroyed = true; break;
      }
    }
    if (!destroyed) throw new Error('Target survived bounded destruction shots');
  }
  }
  record({ event: 'complete', ...(mode === 'installations' ? { scenario: 'installations' } : { steps: 2 }) });
} catch (error) { record({ event: 'failed', error: error instanceof ReentryRequired ? 'Ship died during bounded two-shot test; inspect raw death evidence' : String(error) }); process.exitCode = 1; }
finally {
  for (const { role, client, joined } of [...clients].reverse()) {
    try { if (joined) { if (backend === 'pdp10') await client.quitReference(); else await client.quit(); record({ event: 'cleanup-complete', role }); } }
    catch (error) { record({ event: 'cleanup-error', role, error: String(error) }); process.exitCode = 1; }
    client.close();
  }
}
