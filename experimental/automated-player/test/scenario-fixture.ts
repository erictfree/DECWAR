import assert from 'node:assert/strict';
import { once } from 'node:events';
import { appendFileSync, mkdirSync } from 'node:fs';
import { createTelnetServer } from '../../../src/transport/server.ts';
import { WorldDirectory } from '../../../src/runtime/world-directory.ts';
import { createVariantContext, variantDefinitions } from '../../../src/runtime/variant.ts';
import { createGameSession } from '../../../src/runtime/game-session.ts';
import { reloadableSession, SessionReload } from '../../../src/runtime/reloadable-session.ts';
import { PlayerClient } from '../client.ts';
import type { Position } from '../observations.ts';

export type ScenarioLifecycle = { after(fn: () => unknown): void; diagnostic(message: string): void };

// Scenario staging is intentionally ONLY in test/. The captain receives the
// same Telnet text as a human. No clock, damage, random or command rules are
// replaced. These tests do not connect to the interactive server.
export async function scenario(t: ScenarioLifecycle, enemy = false) {
  const worlds = new WorldDirectory(undefined, createVariantContext('austin'));
  const runtimes = new Map<number, ReturnType<typeof createGameSession>>();
  const log = `logs/automated-player-scenario-${Date.now()}-${Math.random().toString(16).slice(2)}.jsonl`;
  mkdirSync('logs', { recursive: true });
  const record = (event: Record<string, unknown>) => appendFileSync(log, JSON.stringify({ time: new Date().toISOString(), ...event }) + '\n');
  const host = createTelnetServer({ createSession(terminal, { id }) {
    return reloadableSession(() => {
      const world = worlds.load(), runtime = createGameSession(terminal, 'full', world, id, { playable: true, promptForName: true, lifecycle: { removeHighSegment() { worlds.remove(world); }, run() { throw new SessionReload(); } } });
      runtimes.set(id, runtime); runtime.f.jobStatus.monitor.job = BigInt(id); runtime.f.jobStatus.monitor.sequenceJob = BigInt(id);
      return runtime.program;
    }, () => worlds.monitor.releaseJob(id));
  } });
  t.after(() => host.close()); host.server.listen(0, '127.0.0.1'); await once(host.server, 'listening');
  const address = host.server.address(); assert.ok(address && typeof address !== 'string');
  const client = new PlayerClient({ host: '127.0.0.1', port: address.port, record }); t.after(() => client.close());
  await client.join({ name: 'Scout', team: 'FEDERATION', ship: 'YORKTOWN' });
  const opponent = enemy ? new PlayerClient({ host: '127.0.0.1', port: address.port, record: event => record({ ...event, captain: 'enemy' }) }) : undefined;
  if (opponent) { t.after(() => opponent.close()); await opponent.join({ name: 'Target', team: 'EMPIRE', ship: 'WOLF' }); }
  const f = runtimes.get(1)!.f, K = variantDefinitions.austin.constants;
  for (let v = 1; v <= 75; v++) for (let h = 1; h <= 75; h++) f.views.high.board.setdsp(v, h, 0);
  for (const side of [1, 2]) {
    f.high.write('nbase', 1n, side); f.high.write('numcap', 0n, side);
    for (let i = 1; i <= K.KNBASE; i++) f.high.write('base', 0n, i, 3, side);
    const v = side === 1 ? 20 : 70, h = side === 1 ? 26 : 70;
    f.high.write('base', BigInt(v), 1, 1, side); f.high.write('base', BigInt(h), 1, 2, side); f.high.write('base', 1000n, 1, 3, side); f.high.write('base', 3n, 1, 4, side);
    f.views.high.board.setdsp(v, h, (side + 2) * 100 + 1);
  }
  f.high.write('nplnet', 1n); f.high.write('locpln', 75n, 1, 1); f.high.write('locpln', 75n, 1, 2); f.high.write('locpln', 0n, 1, 3); f.high.write('locpln', 0n, 1, 4); f.views.high.board.setdsp(75, 75, 601);
  function place(who: number, position: Position) {
    const oldV = Number(f.high.read('shpcon', who, K.KVPOS)), oldH = Number(f.high.read('shpcon', who, K.KHPOS));
    if (f.views.high.board.disp(oldV, oldH) === (who <= 9 ? 100 : 200) + who) f.views.high.board.setdsp(oldV, oldH, 0);
    f.high.write('shpcon', BigInt(position.v), who, K.KVPOS); f.high.write('shpcon', BigInt(position.h), who, K.KHPOS);
    f.high.write('shpcon', 50000n, who, K.KSNRGY); f.high.write('shpcon', 0n, who, K.KSDAM); f.high.write('shpcon', 1000n, who, K.KSSHPC);
    f.high.write('shpcon', 1n, who, K.KSHCON); f.high.write('shpcon', BigInt(K.GREEN), who, K.KSPCON); f.high.write('docked', 0n, who);
    for (let i = 1; i <= K.KNDEV; i++) f.high.write('shpdam', 0n, who, i);
    f.views.high.board.setdsp(position.v, position.h, (who <= 9 ? 100 : 200) + who);
  }
  place(9, { v: 20, h: 20 }); if (enemy) place(18, { v: 20, h: 23 });
  t.diagnostic(log);
  return { client, opponent, f, K, place, record, port: address.port };
}
