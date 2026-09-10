import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Socket } from 'node:net';
import { once } from 'node:events';
import { PlayerClient } from '../client.ts';

test('Dialogue buffers bytewise prompts, ignores old responses, and rejects concurrent commands', { timeout: 5000 }, async t => {
  const sockets = new Set<Socket>();
  let requests = 0;
  const host = createServer(socket => {
    sockets.add(socket);
    socket.on('data', () => {
      requests++;
      const response = `\r\nanswer ${requests}\r\nCommand: `;
      // Force delivery on separate event-loop turns.
      let i = 0;
      const timer = setInterval(() => {
        if (socket.destroyed || i === response.length) clearInterval(timer);
        else socket.write(response[i++]);
      }, 1);
    });
  });
  host.listen(0, '127.0.0.1'); await once(host, 'listening');
  t.after(async () => { for (const socket of sockets) socket.destroy(); await new Promise<void>(resolve => host.close(() => resolve())); });
  const address = host.address(); assert.ok(address && typeof address !== 'string');
  const client = new PlayerClient({ host: '127.0.0.1', port: address.port, settleMs: 5 });
  t.after(() => client.close());
  const first = client.command('STATUS');
  await assert.rejects(client.command('SCAN'), /Only one/);
  assert.match(await first, /answer 1/);
  const second = await client.command('STATUS');
  assert.match(second, /answer 2/); assert.doesNotMatch(second, /answer 1/);
});

test('Coordinate continuation is aborted with Ctrl-C and the connection remains usable', { timeout: 5000 }, async t => {
  const sockets = new Set<Socket>();
  const events: Record<string, unknown>[] = [];
  let requests = 0;
  const host = createServer(socket => {
    sockets.add(socket); socket.on('data', bytes => {
      if (Buffer.from(bytes).includes(3)) { socket.write('\r\n\x07\x07Command: '); return; }
      if (++requests === 1) socket.write('\r\nCoordinates: ');
      else socket.write('\r\nstatus ok\r\nCommand: ');
    });
  });
  host.listen(0, '127.0.0.1'); await once(host, 'listening');
  t.after(async () => { for (const socket of sockets) socket.destroy(); await new Promise<void>(resolve => host.close(() => resolve())); });
  const address = host.address(); assert.ok(address && typeof address !== 'string');
  const client = new PlayerClient({ host: '127.0.0.1', port: address.port, timeoutMs: 200, settleMs: 1, record: event => events.push(event) });
  t.after(() => client.close());
  assert.match(await client.command('MOVE ABSOLUTE 64 22'), /Coordinates: .*Command: /s);
  assert.equal(events.filter(event => event.event === 'sent-interrupt').length, 1);
  assert.match(await client.command('STATUS'), /status ok/);
});

test('Unknown continuation still times out and closes instead of sending speculative input', { timeout: 5000 }, async t => {
  const sockets = new Set<Socket>();
  const host = createServer(socket => {
    sockets.add(socket); socket.on('data', () => socket.write('\r\nUnrecognized prompt: '));
  });
  host.listen(0, '127.0.0.1'); await once(host, 'listening');
  t.after(async () => { for (const socket of sockets) socket.destroy(); await new Promise<void>(resolve => host.close(() => resolve())); });
  const address = host.address(); assert.ok(address && typeof address !== 'string');
  const client = new PlayerClient({ host: '127.0.0.1', port: address.port, timeoutMs: 100 });
  t.after(() => client.close());
  await assert.rejects(client.command('BUILD'), /Timed out/);
  await assert.rejects(client.command('STATUS'), /Timed out/);
});

test('Disconnect interrupts a pending response promptly', { timeout: 5000 }, async t => {
  const host = createServer(socket => socket.on('data', () => socket.end()));
  host.listen(0, '127.0.0.1'); await once(host, 'listening');
  t.after(() => host.close());
  const address = host.address(); assert.ok(address && typeof address !== 'string');
  const client = new PlayerClient({ host: '127.0.0.1', port: address.port });
  t.after(() => client.close());
  await assert.rejects(client.command('STATUS'), /Connection ended/);
});

test('Combat alarm bells before normal and informative prompts do not stall the client', { timeout: 5000 }, async t => {
  const sockets = new Set<Socket>();
  let requests = 0;
  const host = createServer(socket => {
    sockets.add(socket);
    socket.on('data', () => {
      const prompt = ++requests === 1 ? 'Command: ' : '3LSDE> ';
      // Wing's live failure ended in four BEL bytes immediately before the
      // prompt. Keep the prior prompt/unsolicited combat text in the frame.
      socket.write(`\r\r\n\x07\x07\x07\x07Command: \r\nDemon makes a phaser hit\r\n\r\n\x07\x07`);
      setTimeout(() => socket.write(`\x07\x07${prompt}`), 10);
    });
  });
  host.listen(0, '127.0.0.1'); await once(host, 'listening');
  t.after(async () => { for (const socket of sockets) socket.destroy(); await new Promise<void>(resolve => host.close(() => resolve())); });
  const address = host.address(); assert.ok(address && typeof address !== 'string');
  const client = new PlayerClient({ host: '127.0.0.1', port: address.port, timeoutMs: 200 });
  t.after(() => client.close());
  assert.match(await client.command('STATUS'), /\x07{4}Command: $/);
  assert.match(await client.command('STATUS'), /\x07{4}3LSDE> $/);
});

test('Accepts Austin prompts with repeated carriage returns', { timeout: 5000 }, async t => {
  const host = createServer(socket => socket.on('data', () => socket.write('\r\r\nCommand: ')));
  host.listen(0, '127.0.0.1'); await once(host, 'listening');
  t.after(() => host.close());
  const address = host.address(); assert.ok(address && typeof address !== 'string');
  const client = new PlayerClient({ host: '127.0.0.1', port: address.port, timeoutMs: 200 });
  t.after(() => client.close());
  assert.match(await client.command('STATUS'), /Command: $/);
});

test('A late deadline grants one grace interval for a pending socket response', { timeout: 5000 }, async t => {
  const realNow = Date.now; let clockJump = 0, graces = 0;
  t.mock.method(Date, 'now', () => realNow() + clockJump);
  const sockets = new Set<Socket>();
  const host = createServer(socket => {
    sockets.add(socket);
    socket.on('data', () => {
      clockJump = 2000;
      setTimeout(() => socket.write('\r\nCommand: '), 100);
    });
  });
  host.listen(0, '127.0.0.1'); await once(host, 'listening');
  t.after(async () => { for (const socket of sockets) socket.destroy(); await new Promise<void>(resolve => host.close(() => resolve())); });
  const address = host.address(); assert.ok(address && typeof address !== 'string');
  const client = new PlayerClient({ host: '127.0.0.1', port: address.port, timeoutMs: 70, settleMs: 1,
    record(e) { if (e.event === 'deadline-grace') graces++; },
  });
  t.after(() => client.close());
  await client.command('STATUS'); assert.equal(graces, 1);
});

test('New-world login selects source TOURNAMENT mode with the requested seed', { timeout: 5000 }, async t => {
  const sockets = new Set<Socket>(), requests: string[] = [];
  const replies = ['\r\nline: ', '\r\nRegular or Tournament game? (Regular) ',
    '\r\nIs the Romulan Empire involved in this conflict? (yes) ', '\r\nDo you want black holes? (no) ',
    '\r\n(Federation or Empire) ', '\r\nWhich vessel do you desire? ', '\r\nCommand: '];
  const host = createServer(socket => {
    sockets.add(socket); socket.write('\r\nYour name please: '); let buffer = '';
    socket.on('data', bytes => {
      buffer += bytes.toString('ascii'); let end: number;
      while ((end = buffer.indexOf('\r\n')) >= 0) {
        requests.push(buffer.slice(0, end)); buffer = buffer.slice(end + 2);
        socket.write(replies[requests.length - 1] ?? '\r\nCommand: ');
      }
    });
  });
  host.listen(0, '127.0.0.1'); await once(host, 'listening');
  t.after(async () => { for (const socket of sockets) socket.destroy(); await new Promise<void>(resolve => host.close(() => resolve())); });
  const address = host.address(); assert.ok(address && typeof address !== 'string');
  const client = new PlayerClient({ host: '127.0.0.1', port: address.port, settleMs: 1 }); t.after(() => client.close());
  await client.join({ name: 'Seeded', team: 'FEDERATION', ship: 'YORKTOWN', tournamentSeed: 1729, preserveModes: true });
  assert.deepEqual(requests, ['Seeded', '', 'TOURNAMENT 1729', 'NO', 'NO', 'FEDERATION', 'YORKTOWN']);
});


test('Reference startup preserves modes and raw bytes through interactive exchanges', { timeout: 5000 }, async t => {
  const sockets = new Set<Socket>();
  const requests: string[] = [], events: Record<string, unknown>[] = [];
  const greeting = '\r\nPlease LOGIN\r\n.';
  const host = createServer(socket => {
    sockets.add(socket); socket.write(greeting);
    let buffer = '';
    socket.on('data', bytes => {
      buffer += bytes.toString('ascii');
      let end: number;
      while ((end = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, end); buffer = buffer.slice(end + 2); requests.push(line);
        const replies: Record<string, string> = {
          'login decwar': '\r\nJob 2\r\n.', 'r gam:decwar': '\r\nYour name please: ',
          'Iocheck': '\r\nWhich vessel do you desire? ', 'YORKTOWN': '\r\n> ',
          'SET OUTPUT': '\r\nShort, Medium or Long? ', 'SHORT': '\r\n> ',
          'QUIT': '\r\nDo you really want to quit? ', 'YES': '\r\nEXIT\r\n.',
          'K/F': '\r\nLogged-off TTY4\r\n.',
        };
        socket.write(replies[line] ?? '\r\nUnexpected\r\n> ');
      }
    });
  });
  host.listen(0, '127.0.0.1'); await once(host, 'listening');
  t.after(async () => { for (const s of sockets) s.destroy(); await new Promise<void>(r => host.close(() => r())); });
  const address = host.address(); assert.ok(address && typeof address !== 'string');
  const client = new PlayerClient({ host: '127.0.0.1', port: address.port, settleMs: 5, submissionIntervalMs: 0, recordWire: true, record: e => events.push(e) });
  t.after(() => client.close());
  await client.startReference();
  await client.join({ name: 'Iocheck', team: 'FEDERATION', ship: 'YORKTOWN', preserveModes: true });
  assert.deepEqual(requests, ['login decwar', 'r gam:decwar', 'Iocheck', 'YORKTOWN']);
  await client.exchange('SET OUTPUT', /Short, Medium or Long\? $/);
  await client.command('SHORT');
  await client.quitReference();
  assert.deepEqual(requests.slice(-3), ['QUIT', 'YES', 'K/F']);
  const raw = Buffer.concat(events.filter(e => e.event === 'wire-received').map(e => Buffer.from(String(e.base64), 'base64'))).toString('latin1');
  assert.ok(raw.startsWith(greeting));
  assert.ok(raw.includes('Short, Medium or Long? '));
  const sent = Buffer.concat(events.filter(e => e.event === 'wire-sent').map(e => Buffer.from(String(e.base64), 'base64'))).toString('ascii');
  assert.equal(sent, requests.join('\r\n') + '\r\n');
});


test('An inherited reference monitor is rejected without sending login, launch or logout', { timeout: 5000 }, async t => {
  const sockets = new Set<Socket>(); let sent = '';
  const server = createServer(socket => {
    sockets.add(socket); socket.write('\r\n.'); socket.on('data', bytes => { sent += bytes.toString(); });
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(async () => { for (const socket of sockets) socket.destroy(); await new Promise<void>(r => server.close(() => r())); });
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const client = new PlayerClient({ host: '127.0.0.1', port: address.port, settleMs: 5 });
  t.after(() => client.close());
  await assert.rejects(client.startReference(), /already logged in/);
  await assert.rejects(client.quitReference(), /did not establish/);
  assert.equal(sent, '');
});

test('default submission pacing is per client and includes dialogue answers', {timeout:5000}, async t => {
  const sockets = new Set<Socket>();
  const arrivals:number[][]=[];
  const host=createServer(socket=>{
    sockets.add(socket);const times:number[]=[];arrivals.push(times);
    socket.on('data',()=>{times.push(performance.now());socket.write('\r\nCommand: ');});
  });
  host.listen(0,'127.0.0.1');await once(host,'listening');
  t.after(async()=>{for(const socket of sockets)socket.destroy();await new Promise<void>(resolve=>host.close(()=>resolve()));});
  const address=host.address();assert.ok(address&&typeof address!=='string');
  const a=new PlayerClient({host:'127.0.0.1',port:address.port,settleMs:1});
  const b=new PlayerClient({host:'127.0.0.1',port:address.port,settleMs:1});
  t.after(()=>{a.close();b.close();});
  await a.command('STATUS');
  const next=a.exchange('YES',/Command: $/);
  await b.command('SCAN');
  assert.equal(arrivals[0].length,1,'second client progresses while first client waits');
  await next;
  assert.ok(arrivals[0][1]-arrivals[0][0]>=500);
});
