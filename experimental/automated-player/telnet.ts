// Modern client transport, independent of the game/server codec. Telnet is a
// host boundary (docs/decisions.md D-003, D-172), not recovered DECWAR logic.
const IAC = 255, DO = 253, DONT = 254, WILL = 251, WONT = 252;

export class ClientTelnet {
  private state: 'data' | 'iac' | 'option' | 'sub' | 'sub-iac' = 'data';
  private verb = 0;
  private afterCR = false;
  private remote = new Map<number, boolean>();
  private refusedLocal = new Set<number>();

  feed(bytes: Uint8Array): { text: string; reply: Buffer } {
    const data: number[] = [], reply: number[] = [];
    const emit = (byte: number) => {
      if (this.afterCR && byte === 0) { this.afterCR = false; return; }
      this.afterCR = byte === 13;
      data.push(byte);
    };
    for (const byte of bytes) {
      switch (this.state) {
        case 'data':
          if (byte === IAC) this.state = 'iac'; else emit(byte);
          break;
        case 'iac':
          this.state = 'data';
          if (byte === IAC) emit(byte);
          else if ([DO, DONT, WILL, WONT].includes(byte)) { this.verb = byte; this.state = 'option'; }
          else if (byte === 250) this.state = 'sub';
          break;
        case 'option': {
          // Accept remote suppress-go-ahead; decline server echo so typed
          // commands cannot be confused with response text. No local options.
          if (this.verb === WILL) {
            const accept = byte === 3;
            if (this.remote.get(byte) !== accept) reply.push(IAC, accept ? DO : DONT, byte);
            this.remote.set(byte, accept);
          } else if (this.verb === WONT) this.remote.delete(byte);
          else if (this.verb === DO && !this.refusedLocal.has(byte)) {
            reply.push(IAC, WONT, byte); this.refusedLocal.add(byte);
          } else if (this.verb === DONT) this.refusedLocal.delete(byte);
          this.state = 'data'; break;
        }
        case 'sub': if (byte === IAC) this.state = 'sub-iac'; break;
        case 'sub-iac': this.state = byte === 240 ? 'data' : 'sub'; break;
      }
    }
    return { text: Buffer.from(data).toString('latin1'), reply: Buffer.from(reply) };
  }
}

export function commandBytes(line: string): Buffer {
  if (!/^[\x20-\x7e]*$/.test(line)) throw new Error('Commands must be single printable ASCII lines');
  return Buffer.from(line + '\r\n', 'ascii');
}
