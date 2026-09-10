import test from 'node:test';
import assert from 'node:assert/strict';
import { ConnectionFailure, VesselUnavailable } from '../client.ts';
import { supervise } from '../supervisor.ts';
import { scenario } from './scenario-fixture.ts';
import { createServer, type Socket } from 'node:net';
import { once } from 'node:events';
import { connect } from 'node:net';

const options = { host: '127.0.0.1', port: 1, name: 'Test', team: 'FEDERATION' as const, ship: 'YORKTOWN', rounds: 10, lives: 3, intervalMs: 100, retryDelayMs: 1, record() {} };

test('Reconnect preserves decision and life budgets and never retries parser failures', async () => {
  let calls = 0;
  const result = await supervise(options, async o => {
    calls++;
    if (calls === 1) {
      o.record({ event: 'decision' }); o.record({ event: 'death' });
      throw new ConnectionFailure('connection reset');
    }
    assert.equal(o.rounds, 8); assert.equal(o.lives, 2);
    o.record({ event: 'decision' });
    return { rounds: 1, deaths: 0, outcome: 'complete', reason: 'done' };
  });
  assert.equal(calls, 2); assert.equal(result.rounds, 3); assert.equal(result.deaths, 1); assert.equal(result.retries, 1);
  calls = 0;
  await assert.rejects(supervise(options, async () => { calls++; throw new Error('invalid report'); }), /invalid report/);
  assert.equal(calls, 1);
});

test('Unavailable vessels have bounded retries; cancellation interrupts backoff', async () => {
  let calls = 0;
  await assert.rejects(supervise({ ...options, retries: 2 }, async () => { calls++; throw new VesselUnavailable('occupied'); }), /occupied/);
  assert.equal(calls, 3);
  const controller = new AbortController();
  const events: string[] = [];
  const result = await supervise({ ...options, signal: controller.signal, record(e) { events.push(String(e.event)); if (e.event === 'reconnecting') controller.abort(); } }, async () => { throw new ConnectionFailure('offline'); });
  assert.equal(result.outcome, 'interrupted');
  assert.deepEqual(events, ['reconnecting'], 'Cancelled backoff is not an attempt or successful recovery');
});

test('Persistent supervision ignores retry and life budgets until explicitly stopped', async () => {
  const controller = new AbortController();
  let calls = 0, reconnects = 0;
  const result = await supervise({ ...options, persistent: true, retries: 1, lives: 1, rounds: 1, signal: controller.signal,
    record(event) {
      if (event.event === 'reconnecting' && ++reconnects === 3) controller.abort();
    },
  }, async received => {
    calls++;
    assert.equal(received.rounds, Number.MAX_SAFE_INTEGER);
    assert.equal(received.lives, Number.MAX_SAFE_INTEGER);
    throw new ConnectionFailure('offline');
  });
  assert.equal(calls, 3, 'The configured one-retry budget does not stop a persistent player');
  assert.equal(result.outcome, 'interrupted');
  assert.equal(result.retries, 3);
});

test('Real TCP loss reconnects through login and continues with a fresh observation', { timeout: 30000 }, async t => {
  const fixture = await scenario(t);
  await fixture.client.quit();
  const sockets = new Set<Socket>(); let incoming: Socket | undefined, upstream: Socket | undefined;
  const proxy = createServer(socket => {
    incoming = socket; sockets.add(socket);
    const remote = connect({ host: '127.0.0.1', port: fixture.port }); upstream = remote; sockets.add(remote);
    socket.pipe(remote); remote.pipe(socket);
    socket.on('error', () => remote.destroy()); remote.on('error', () => socket.destroy());
    socket.on('close', () => remote.destroy()); remote.on('close', () => socket.destroy());
  });
  proxy.listen(0, '127.0.0.1'); await once(proxy, 'listening');
  t.after(async () => { for (const socket of sockets) socket.destroy(); await new Promise<void>(resolve => proxy.close(() => resolve())); });
  const address = proxy.address(); assert.ok(address && typeof address !== 'string');
  let joins = 0, actions = 0, recoveries = 0, retryStarts = 0;
  const result = await supervise({ ...options, port: address.port, rounds: 2, retries: 3, retryDelayMs: 100,
    record(e) {
      fixture.record(e);
      if (e.event === 'reconnected') recoveries++;
      if (e.event === 'retry-started') retryStarts++;
      if (e.event === 'joined' && ++joins === 1) { incoming!.destroy(); upstream!.destroy(); }
      if (e.event === 'action-result') actions++;
    },
  });
  assert.equal(result.outcome, 'limit'); assert.ok(result.retries >= 1); assert.equal(joins, 2); assert.equal(actions, 2);
  assert.equal(recoveries, 1); assert.equal(retryStarts, result.retries);
});
