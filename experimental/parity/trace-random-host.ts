import { appendFileSync, writeFileSync } from 'node:fs';
import { createTelnetServer } from '../../src/transport/server.ts';
import { createGameSession } from '../../src/runtime/game-session.ts';
import { SharedGameWorld } from '../../src/runtime/shared-world.ts';
import { createVariantContext } from '../../src/runtime/variant.ts';

// Diagnostic host only. Wrap the existing random methods without changing
// their arguments, yields, results or private seed. No production defaults.
const [port, output] = process.argv.slice(2);
if (!/^\d+$/.test(port) || +port < 1 || +port > 65535 || !output) throw new Error('Usage: trace-random-host.ts PORT NEW_TRACE');
writeFileSync(output, '', { flag: 'wx' });
const record = (event: Record<string, unknown>) => appendFileSync(output, JSON.stringify({ time: new Date().toISOString(), ...event }) + '\n');
const octal = (n: bigint) => BigInt.asUintN(36, n).toString(8).padStart(12, '0');
const world = new SharedGameWorld(undefined, createVariantContext('austin', 'playable'));
const host = createTelnetServer({ createSession(terminal, connection) {
  const runtime = createGameSession(terminal, 'full', world, connection.id, { promptForName: true, playable: true });
  const f = runtime.f, random = f.tell.random;
  function wrap<T>(name: string, original: (argument: bigint) => Generator<string, T, void>) {
    return function* (argument: bigint) {
      const before = octal(f.m.read(random.s.seed));
      const caller = new Error().stack?.split('\n').slice(2, 9);
      const result = yield* original(argument);
      record({ event: 'random', job: connection.id, name, argument: argument.toString(), before, after: octal(f.m.read(random.s.seed)), result: typeof result === 'bigint' ? octal(result) : null, dotime: f.high.read('dotime').toString(), players: f.high.read('numply').toString(), caller });
      return result;
    };
  }
  random.ran = wrap('ran', random.ran);
  random.iran = wrap('iran', random.iran);
  random.setran = wrap('setran', random.setran);
  return runtime.program;
}, onSessionEnd(job, result) { world.monitor.releaseJob(job); record({ event: 'session-end', job, reason: result.reason }); } });
host.server.listen(+port, '127.0.0.1', () => record({ event: 'listening', port: +port }));
for (const signal of ['SIGTERM', 'SIGINT'] as const) process.on(signal, () => { void host.close(); });
