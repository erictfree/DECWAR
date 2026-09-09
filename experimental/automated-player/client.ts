import { connect, type Socket } from 'node:net';
import { ClientTelnet, commandBytes } from './telnet.ts';
import { warBanner, warWinner, WarFinished } from './war-result.ts';

export type RecordEvent = (event: Record<string, unknown>) => void;
export type Team = 'FEDERATION' | 'EMPIRE';
export class ConnectionFailure extends Error {}
export class VesselUnavailable extends Error {}
// Source: Austin DECWAR.FOR PROMPT:3102-3131, MSG.MAC comlin:38.
// Input-clearing/alert paths (DECWAR.FOR:776,1208) emit BELs before the prompt.
// Recognize those control bytes without stripping them from the transcript.
const prompt = /(?:^|\r?\n)\x07*(?:Command: |(?:\d+L)?S?D?E?> )$/;
const startup = /(?:Your name please: |line: |Regular or Tournament game\? \(Regular\) |Is the Romulan Empire involved in this conflict\? \(yes\) |Do you want black holes\? \(no\) |\(Federation or Empire\) |Which vessel do you desire\? )$/;
const gameOrReentry = /(?:^|\r?\n)\x07*(?:Command: |(?:\d+L)?S?D?E?> |Enter HELp, PREgame, or blank\r\nline: )$/;
// MSG.MAC coord1:39. A target can become the ship's current location while
// MOVE is waiting on game timing, which enters LOCATE's coordinate retry.
const coordinateContinuation = /(?:^|\r?\n)Coordinates: $/;
const gameOrCoordinateOrReentry = new RegExp(`(?:${gameOrReentry.source})|(?:${coordinateContinuation.source})`);
const loginResponse = new RegExp(`(?:${startup.source})|(?:${prompt.source})`);
export class ReentryRequired extends Error {
  constructor() { super('Ship lost; Austin returned to its pregame dialogue'); }
}

export class PlayerClient {
  private socket: Socket;
  private codec = new ClientTelnet();
  private buffer = '';
  private failure: Error | undefined;
  private ended = false;
  private busy = false;
  private reentry = false;
  private referenceLoggedIn = false;
  private wake: (() => void) | undefined;
  private readonly record: RecordEvent;
  private readonly timeoutMs: number;
  private readonly settleMs: number;
  private readonly recordWire: boolean;

  constructor(options: { host: string; port: number; record?: RecordEvent; timeoutMs?: number; settleMs?: number; recordWire?: boolean }) {
    this.record = options.record ?? (() => {});
    this.timeoutMs = options.timeoutMs ?? 15000;
    this.settleMs = options.settleMs ?? 40;
    this.recordWire = options.recordWire ?? false;
    this.socket = connect({ host: options.host, port: options.port });
    this.socket.setNoDelay(true);
    this.socket.on('data', bytes => {
      if (typeof bytes === 'string') { this.abort(new Error('Telnet requires byte input')); return; }
      if (this.recordWire) this.record({ event: 'wire-received', base64: bytes.toString('base64') });
      const decoded = this.codec.feed(bytes);
      if (decoded.reply.length) {
        if (this.recordWire) this.record({ event: 'wire-sent', base64: decoded.reply.toString('base64'), negotiation: true });
        this.socket.write(decoded.reply);
      }
      if (decoded.text) {
        this.buffer += decoded.text;
        if (this.buffer.length > 1024 * 1024) this.abort(new Error('Unconsumed terminal output exceeded 1 MiB'));
      }
      this.wake?.();
    });
    this.socket.on('error', error => this.abort(new ConnectionFailure(error.message)));
    this.socket.on('close', () => { this.ended = true; this.wake?.(); });
    this.socket.on('end', () => { this.ended = true; this.wake?.(); });
  }

  private abort(error: Error): void {
    this.failure ??= error;
    this.socket.destroy();
    this.wake?.();
  }

  close(): void { this.abort(new Error('Client closed')); }

  private send(line: string): void {
    const winner = warWinner(this.buffer);
    if (winner) {
      this.record({ event: 'received', text: this.buffer });
      throw new WarFinished(winner, this.buffer);
    }
    const bytes = commandBytes(line);
    if ((this.ended || this.failure) && warBanner.test(this.buffer)) throw new Error('Incomplete war result; inspect terminal evidence');
    if (this.failure) throw this.failure;
    if (this.ended) throw new ConnectionFailure('Connection ended');
    this.record({ event: 'sent', line });
    if (this.recordWire) this.record({ event: 'wire-sent', base64: bytes.toString('base64'), negotiation: false });
    this.socket.write(bytes);
  }

  private interrupt(): void {
    if (this.failure) throw this.failure;
    if (this.ended) throw new ConnectionFailure('Connection ended');
    // Both the TypeScript transport and a character-mode PDP-10 terminal
    // accept ETX as Ctrl-C. Austin HELP CTL-C documents that it aborts a
    // command which is already in progress and clears stacked input.
    const bytes = Buffer.of(3);
    this.record({ event: 'sent-interrupt', reason: 'coordinate-continuation' });
    if (this.recordWire) this.record({ event: 'wire-sent', base64: bytes.toString('base64'), negotiation: false });
    this.socket.write(bytes);
  }

  private async waitFor(pattern: RegExp, allowEnd = false): Promise<string> {
    return new Promise((resolve, reject) => {
      let settle: ReturnType<typeof setTimeout> | undefined;
      let finished = false, graceUsed = false;
      let due = Date.now() + this.timeoutMs;
      const finish = (error?: Error) => {
        if (finished) return;
        finished = true;
        clearTimeout(deadline); clearTimeout(settle); this.wake = undefined;
        if (this.buffer) this.record({ event: 'received', text: this.buffer });
        if (error) { reject(error); return; }
        const result = this.buffer; this.buffer = ''; resolve(result);
      };
      const check = () => {
        clearTimeout(settle);
        const winner = warWinner(this.buffer);
        if (winner) {
          // Drain final POINTS through EOF (live host) or monitor prompt
          // (native reference), rather than closing at the first banner chunk.
          if (this.ended || this.failure || /(?:^|\r?\n)\.$/.test(this.buffer)) finish(new WarFinished(winner, this.buffer));
          return;
        }
        if ((this.ended || this.failure) && warBanner.test(this.buffer)) {
          finish(new Error('Incomplete war result; inspect terminal evidence')); return;
        }
        if (this.failure) { finish(this.failure); return; }
        if (this.ended) { finish(allowEnd ? undefined : new ConnectionFailure('Connection ended before expected prompt')); return; }
        if (pattern.test(this.buffer)) settle = setTimeout(() => finish(), this.settleMs);
      };
      const expired = () => {
        const winner = warWinner(this.buffer);
        if (winner) { finish(new WarFinished(winner, this.buffer)); return; }
        // Sleep or an event-loop stall can expire every client's timer at
        // once. Give pending socket replies one bounded grace interval.
        const lateMs = Date.now() - due;
        if (!graceUsed && lateMs > 1000) {
          graceUsed = true;
          this.record({ event: 'deadline-grace', lateMs, timeoutMs: this.timeoutMs });
          due = Date.now() + this.timeoutMs;
          deadline = setTimeout(expired, this.timeoutMs);
          check(); return;
        }
        const message = `Timed out waiting for ${pattern}; terminal tail: ${JSON.stringify(this.buffer.slice(-500))}`;
        // A silent peer can be reconnected; an unrecognized dialogue needs
        // investigation rather than repeated login attempts masking a bug.
        const error = /^[\s\x07]*$/.test(this.buffer) ? new ConnectionFailure(message) : new Error(message);
        finish(error); this.abort(error);
      };
      let deadline = setTimeout(expired, this.timeoutMs);
      this.wake = check; check();
    });
  }

  private async exclusive<T>(fn: () => Promise<T>): Promise<T> {
    if (this.busy) throw new Error('Only one dialogue operation may be outstanding');
    this.busy = true;
    try { return await fn(); } catch (error) {
      if (!(error instanceof ReentryRequired)) this.abort(error instanceof Error ? error : new Error(String(error)));
      throw error;
    } finally { this.busy = false; }
  }

  // Source dialogue: Austin SETMSG.MAC:17-43; only the first arrival is asked
  // for world options. Explicit team/ship avoids reliance on defaults/typeahead.
  async join(options: { name: string; team: Team; ship: string; romulan?: boolean; blackHoles?: boolean; preserveModes?: boolean; tournamentSeed?: number }): Promise<void> {
    if (!/^[A-Za-z][A-Za-z0-9]{0,11}$/.test(options.name)) throw new Error('Use a captain name of 1–12 letters/digits');
    if (!/^[A-Z]+$/i.test(options.ship)) throw new Error('Invalid ship name');
    if (options.tournamentSeed !== undefined && (!Number.isSafeInteger(options.tournamentSeed) || options.tournamentSeed < 0)) throw new Error('Tournament seed must be a nonnegative safe integer');
    await this.exclusive(async () => {
      if (this.reentry) { this.reentry = false; this.send(''); }
      let selectedShip = false;
      for (let step = 0; step < 16; step++) {
        const text = await this.waitFor(loginResponse);
        // SETUP can automatically reuse the previous vessel after death.
        if (prompt.test(text)) return;
        if (text.endsWith('Your name please: ')) this.send(options.name);
        else if (text.endsWith('line: ')) this.send('');
        else if (text.endsWith('(Regular) ')) this.send(options.tournamentSeed === undefined ? '' : `TOURNAMENT ${options.tournamentSeed}`);
        else if (text.endsWith('conflict? (yes) ')) this.send(options.romulan ? 'YES' : 'NO');
        else if (text.endsWith('black holes? (no) ')) this.send(options.blackHoles ? 'YES' : 'NO');
        else if (text.endsWith('(Federation or Empire) ')) this.send(options.team);
        else if (text.endsWith('Which vessel do you desire? ')) {
          if (selectedShip) throw new VesselUnavailable(`Requested vessel ${options.ship} is unavailable`);
          this.send(options.ship); selectedShip = true;
        }
        else throw new Error('Unrecognized Austin login dialogue');
      }
      throw new Error('Austin login exceeded dialogue limit');
    });
    if (options.preserveModes) return;
    // Ordinary player preferences only. Keep source timings and radio behavior.
    await this.command('SET PROMPT NORMAL');
    await this.command('SET OUTPUT LONG');
    await this.command('SET OCDEF ABSOLUTE');
    await this.command('SET SCANS LONG');
  }

  // Reference startup only: the supplied TOPS-10 account has no password.
  // Caller must select this adapter explicitly; ordinary game hosts skip it.
  async startReference(): Promise<void> {
    await this.exclusive(async () => {
      const greeting = await this.waitFor(/(?:^|\r?\n)\.$/);
      if (!greeting.includes('Please LOGIN')) throw new Error('Reference terminal is already logged in; use a clean test terminal');
      this.send('login decwar');
      const login = await this.waitFor(/(?:^|\r?\n)\.$/);
      if (/(?:^|[\r\n])\?/.test(login)) throw new Error('Reference login rejected; inspect the captured monitor response before reusing an existing session');
      this.referenceLoggedIn = true;
      this.send('r gam:decwar');
    });
  }

  async quitReference(): Promise<void> {
    if (!this.referenceLoggedIn) throw new Error('This client did not establish the reference account');
    await this.exclusive(async () => {
      this.send('QUIT');
      await this.waitFor(/Do you really want to quit\? $/);
      this.send('YES');
      await this.waitFor(/(?:^|\r?\n)\.$/);
      // Preserved build-console.txt:106–111,276–281: K/F logs out the
      // current TOPS-10 job. Never issue it for an inherited monitor session.
      this.send('K/F');
      const logout = await this.waitFor(/(?:^|\r?\n)\.$/, true);
      if (!logout.includes('Logged-off')) throw new Error('Reference logout was not confirmed');
      this.referenceLoggedIn = false;
    });
  }

  async exchange(line: string, expected: RegExp): Promise<string> {
    return this.exclusive(async () => { this.send(line); return this.waitFor(expected); });
  }

  async command(line: string): Promise<string> {
    return this.exclusive(async () => {
      // An unsolicited endgame may arrive between commands. Drain its final
      // report instead of sending another command or closing mid-report.
      if (warWinner(this.buffer)) await this.waitFor(/(?!)/);
      this.send(line);
      let text = await this.waitFor(gameOrCoordinateOrReentry);
      if (coordinateContinuation.test(text)) {
        this.interrupt();
        text += await this.waitFor(gameOrReentry);
      }
      // Austin main:56 -> PREGAM, SETUP.FOR:76-89. Reenter only on the
      // exact source dialogue, never on an arbitrary parse error/disconnect.
      if (text.endsWith('Enter HELp, PREgame, or blank\r\nline: ')) { this.reentry = true; throw new ReentryRequired(); }
      return text;
    });
  }

  async quit(): Promise<void> {
    if (this.reentry) { this.close(); return; }
    await this.exclusive(async () => {
      this.send('QUIT');
      await this.waitFor(/Do you really want to quit\? $/);
      this.send('YES');
      await this.waitFor(/(?!)/, true);
    });
  }
}
