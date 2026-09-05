// Modern boundary decision D-003 in docs/decisions.md. No DECWAR wire-level
// Telnet implementation exists in the supplied build. This codec is not a
// claim about TOPS-10 negotiation or monitor echo.
const IAC = 255, DONT = 254, DO = 253, WONT = 252, WILL = 251, SB = 250, SE = 240, IP = 244;
const TIMING_MARK = 6;
const ECHO = 1, SUPPRESS_GO_AHEAD = 3;
export type TelnetResult = { data: Buffer; reply: Buffer; interrupts: number };

export class TelnetCodec {
  private state: 'data' | 'iac' | 'option' | 'sub' | 'sub-iac' = 'data';
  private verb = 0;
  private afterCR = false;
  private refusedLocal = new Set<number>();
  private refusedRemote = new Set<number>();
  private localOptions = new Map<number, 'offered' | 'enabled'>();

  private readonly keyboardLines: boolean;
  constructor(keyboardLines = false) { this.keyboardLines = keyboardLines; }

  // D-172: this host supplies character delivery and monitor-style echo.
  // Standalone codecs retain literal NVT CR decoding; the game endpoint opts
  // into translating a keyboard CR, CR-NUL or CR-LF to one application LF.
  begin(): Buffer {
    const offer:number[]=[];
    for(const option of [SUPPRESS_GO_AHEAD,ECHO])if(!this.localOptions.has(option)){
      this.localOptions.set(option,'offered');offer.push(IAC,WILL,option);
    }
    return Buffer.from(offer);
  }
  get echoEnabled(): boolean { return this.localOptions.get(ECHO)==='enabled'; }

  // Unsupported options are refused without repeated-response loops.
  feed(input: Uint8Array): TelnetResult {
    const data: number[] = [], reply: number[] = [];
    let interrupts = 0;
    const applicationByte = (byte: number) => {
      if (this.afterCR && (byte === 0 || (this.keyboardLines && byte === 10))) { this.afterCR = false; return; }
      this.afterCR = byte === 13;
      data.push(this.keyboardLines && byte === 13 ? 10 : byte);
    };
    for (const byte of input) {
      switch (this.state) {
        case 'data':
          if (byte === IAC) this.state = 'iac';
          else applicationByte(byte);
          break;
        case 'iac':
          this.state = 'data';
          if (byte === IAC) applicationByte(IAC);
          else if ([DO, DONT, WILL, WONT].includes(byte)) { this.verb = byte; this.state = 'option'; }
          else if (byte === SB) this.state = 'sub';
          else if (byte === IP) interrupts++;
          break;
        case 'option':
          if ((byte===ECHO||byte===SUPPRESS_GO_AHEAD) && (this.verb===DO||this.verb===DONT)) {
            const state=this.localOptions.get(byte);
            if(this.verb===DO){
              if(state===undefined)reply.push(IAC,WILL,byte);
              this.localOptions.set(byte,'enabled');
            }else{
              if(state==='enabled')reply.push(IAC,WONT,byte);
              this.localOptions.delete(byte);
            }
            this.state='data';break;
          }
          // A client uses each DO TIMING-MARK to finish suppressing output
          // after IP. It is a fresh request, not a repeated option offer.
          // Refuse every request; caching this refusal freezes later ^Cs.
          if (this.verb === DO && byte === TIMING_MARK) {
            reply.push(IAC, WONT, byte);this.state = 'data';break;
          }
          if (this.verb === DO && !this.refusedLocal.has(byte)) { reply.push(IAC, WONT, byte); this.refusedLocal.add(byte); }
          if (this.verb === WILL && !this.refusedRemote.has(byte)) { reply.push(IAC, DONT, byte); this.refusedRemote.add(byte); }
          if (this.verb === DONT) this.refusedLocal.delete(byte);
          if (this.verb === WONT) this.refusedRemote.delete(byte);
          this.state = 'data';
          break;
        case 'sub':
          if (byte === IAC) this.state = 'sub-iac';
          break;
        case 'sub-iac':
          this.state = byte === SE ? 'data' : 'sub';
          break;
      }
    }
    return { data: Buffer.from(data), reply: Buffer.from(reply), interrupts };
  }
}

// Outgoing NVT encoding: preserve CR LF, encode bare CR as CR NUL, escape IAC.
// Stateful across writes because an application may write CR and LF separately.
export class TelnetEncoder {
  private pendingCR = false;
  encode(bytes: Uint8Array): Buffer {
    const result: number[] = [];
    for (const byte of bytes) {
      if (this.pendingCR) {
        result.push(13, byte === 10 ? 10 : 0);
        this.pendingCR = false;
        if (byte === 10) continue;
      }
      if (byte === 13) this.pendingCR = true;
      else if (byte === IAC) result.push(IAC, IAC);
      else result.push(byte);
    }
    return Buffer.from(result);
  }
  flush(): Buffer {
    if (!this.pendingCR) return Buffer.alloc(0);
    this.pendingCR = false;
    return Buffer.from([13, 0]);
  }
}
