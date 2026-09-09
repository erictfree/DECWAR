import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Socket } from 'node:net';
import { once } from 'node:events';
import { warWinner, WarFinished } from '../war-result.ts';
import { PlayerClient, ReentryRequired } from '../client.ts';
import { supervise } from '../supervisor.ts';
import { scenario } from './scenario-fixture.ts';

const banner = 'THE WAR IS OVER!!\r\n\r\n';
const federation = 'The Federation has successfully repelled the Klingon hordes!\r\n\r\n';
const empire = 'The Klingon Empire is VICTORIOUS!!\r\n\r\n';
const mutual = 'The entire known galaxy has been depopulated.\r\n\r\nBOTH sides lose!!\r\n';
test('Source endgame messages distinguish winner, mutual loss and unrelated text', () => {
  assert.equal(warWinner(banner + federation), 'FEDERATION');
  assert.equal(warWinner(banner + empire), 'EMPIRE');
  assert.equal(warWinner(banner + mutual + empire + federation), 'NEITHER');
  for (const text of [banner, federation, 'Yorktown says: ' + banner + federation, 'Total points: 1000.0 0.0']) assert.equal(warWinner(text), undefined);
});

test('Production Austin ENDGAM over Telnet preserves the winner and final points', { timeout: 15000 }, async t => {
  const fixture = await scenario(t);
  // Test-only endgame fixture: remove the last neutral planet and enemy base.
  // The unchanged main loop performs ENDGAM, points, release and socket close.
  fixture.f.views.high.board.setdsp(75, 75, 0);
  fixture.f.views.high.board.setdsp(70, 70, 0);
  fixture.f.high.write('nplnet', 0n);
  fixture.f.high.write('nbase', 0n, 2);
  fixture.f.high.write('base', 0n, 1, 3, 2);
  await assert.rejects(fixture.client.command('MOVE ABSOLUTE 20 21'), error => {
    assert.ok(error instanceof WarFinished);
    assert.equal(error.winner, 'FEDERATION');
    assert.match(error.text, /Total points:/);
    return true;
  });
});

for (const ending of ['eof', 'monitor', 'timeout'] as const) test(`Split final output survives ${ending} without an ordinary prompt`, { timeout: 5000 }, async t => {
  const sockets = new Set<Socket>();
  const final = banner + federation + 'Final score evidence\r\n';
  const host = createServer(socket => {
    sockets.add(socket);
    socket.once('data', () => {
      let i = 0;
      const timer = setInterval(() => {
        if (socket.destroyed) { clearInterval(timer); return; }
        if (i < final.length) socket.write(final[i++]);
        else { clearInterval(timer); if (ending === 'eof') socket.end(); else if (ending === 'monitor') socket.write('.'); }
      }, 1);
      t.after(() => clearInterval(timer));
    });
  });
  host.listen(0, '127.0.0.1'); await once(host, 'listening');
  t.after(async () => { for (const socket of sockets) socket.destroy(); await new Promise<void>(resolve => host.close(() => resolve())); });
  const address = host.address(); assert.ok(address && typeof address !== 'string');
  const client = new PlayerClient({ host: '127.0.0.1', port: address.port, timeoutMs: 500, settleMs: 1 });
  t.after(() => client.close());
  await assert.rejects(client.command('STATUS'), error => error instanceof WarFinished && error.winner === 'FEDERATION' && error.text.includes('Final score evidence'));
});

for (const phase of ['login', 'observation'] as const) test(`Supervisor preserves a war result during ${phase} and never reconnects`, { timeout: 5000 }, async t => {
  let connections = 0;
  const host = createServer(socket => {
    connections++;
    if (phase === 'login') { socket.end(banner + empire); return; }
    socket.write('Command: ');
    let commands = 0;
    socket.on('data', () => { if (++commands === 5) socket.end(banner + empire); else socket.write('Command: '); });
  });
  host.listen(0, '127.0.0.1'); await once(host, 'listening'); t.after(() => host.close());
  const address = host.address(); assert.ok(address && typeof address !== 'string');
  const events: Record<string, unknown>[] = [];
  const result = await supervise({ host: '127.0.0.1', port: address.port, name: 'Test', team: 'FEDERATION', ship: 'YORKTOWN', rounds: 10, intervalMs: 1, retries: 3, retryDelayMs: 1, record: e => events.push(e) });
  assert.equal(result.outcome, 'war-over'); assert.equal(connections, 1); assert.equal(result.deaths, 0);
  assert.ok(events.some(e => e.event === 'war-ended' && e.result === 'defeat' && e.winner === 'EMPIRE'));
  assert.ok(!events.some(e => ['reconnecting', 'death', 'failed'].includes(String(e.event))));
});

test('Ordinary death still requests reentry; truncated war output is not a retryable disconnect', { timeout: 5000 }, async t => {
  let connections = 0;
  const sockets = new Set<Socket>();
  const host = createServer(socket => {
    sockets.add(socket); const first = ++connections === 1;
    socket.once('data', () => first ? socket.write('Enter HELp, PREgame, or blank\r\nline: ') : socket.end(banner));
  });
  host.listen(0, '127.0.0.1'); await once(host, 'listening');
  t.after(async () => { for (const socket of sockets) socket.destroy(); await new Promise<void>(resolve => host.close(() => resolve())); });
  const address = host.address(); assert.ok(address && typeof address !== 'string');
  const client = new PlayerClient({ host: '127.0.0.1', port: address.port });
  const second = new PlayerClient({ host: '127.0.0.1', port: address.port });
  t.after(() => { client.close(); second.close(); });
  await assert.rejects(client.command('STATUS'), ReentryRequired);
  await assert.rejects(second.command('STATUS'), /Incomplete war result/);
});
