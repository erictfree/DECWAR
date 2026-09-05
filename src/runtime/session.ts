// Modern host boundary: the original routines determine when input, output or
// waiting occurs. The host supplies byte delivery and scheduling, not commands.
export type SessionWait={type:'input'}|{type:'delay';milliseconds:number;wakeOnInput:boolean}|{type:'cooperate'};
type SessionControl=()=>void|Generator<SessionWait,void,void>;
export type SessionProgram={run:Generator<SessionWait,void,void>;hangup:SessionControl;interrupt:SessionControl};
export interface SessionTerminal{
  read():Generator<SessionWait,number|null,void>;
  available():boolean;
  clearInput():void;
  wake():void;
  runtimeMilliseconds():bigint;
  write(bytes:Uint8Array):void;
  readonly disconnected:boolean;
}
export type SessionResult={reason:'completed'}|{reason:'failed';error:unknown}|{reason:'cancelled'};
// A deliberate source MONRT/monitor exit is completion, not a host fault.
// Only the bound monitor service should emit this control transfer.
export class SessionExit extends Error{
  constructor(){super('Source monitor exit');this.name='SessionExit';}
}

export class GameSession{
  readonly done:Promise<SessionResult>;
  readonly terminal:SessionTerminal;
  private queue:number[]=[];
  private closed=false;
  private interrupted=false;
  private cancelled=false;
  private finished=false;
  private controlFailed=false;
  private controlError:unknown;
  private started=false;
  private wake:(()=>void)|undefined;
  private waiting:SessionWait|undefined;
  private program:SessionProgram;
  private controls:Generator<SessionWait,void,void>[]=[];
  private resolve!:(result:SessionResult)=>void;
  private cpuElapsed=0n;
  private cpuStarted:bigint|undefined;
  private cpuMicroseconds:()=>bigint;

  constructor(create:(terminal:SessionTerminal)=>SessionProgram,write:(bytes:Uint8Array)=>void,cpuMicroseconds:()=>bigint=()=>{const usage=process.cpuUsage();return BigInt(usage.user)+BigInt(usage.system);}){
    this.cpuMicroseconds=cpuMicroseconds;
    this.done=new Promise(resolve=>{this.resolve=resolve;});
    const session=this;
    this.terminal={
      *read(){
        while(!session.queue.length&&!session.closed&&!session.interrupted)yield {type:'input'};
        if(session.interrupted){session.interrupted=false;return null;}
        return session.queue.length?session.queue.shift()!:null;
      },
      available:()=>session.queue.length>0,
      clearInput:()=>{session.queue.length=0;},
      wake:()=>session.wake?.(),
      runtimeMilliseconds:()=>session.runtimeMilliseconds(),
      write:bytes=>{if(!session.closed&&!session.finished)write(bytes);},
      get disconnected(){return session.closed;},
    };
    this.program=this.measured(()=>create(this.terminal));
  }
  start():Promise<SessionResult>{if(!this.started){this.started=true;void this.drive();}return this.done;}
  receive(bytes:Uint8Array):void{
    if(this.closed||this.finished||bytes.length===0)return;
    for(const byte of bytes)this.queue.push(byte);
    if(this.waiting?.type==='input'||(this.waiting?.type==='delay'&&this.waiting.wakeOnInput))this.wake?.();
  }
  interrupt():void{
    if(this.closed||this.finished)return;
    // Interrupt only a read that is already suspended. A HIBER wake must not
    // inject an empty read into a later prompt after source code handled ^C.
    if(this.waiting?.type==='input')this.interrupted=true;
    this.control(()=>this.program.interrupt());
  }
  disconnect():void{
    if(this.closed||this.finished)return;
    this.closed=true;this.control(()=>this.program.hangup());
  }
  // Forced host shutdown is distinct from source-level hangup handling.
  cancel():void{if(this.finished)return;this.cancelled=true;this.wake?.();}

  private control(action:SessionControl):void{
    try{const run=this.measured(action);if(run)this.controls.push(run);}catch(error){this.controlFailed=true;this.controlError=error;}
    this.wake?.();
  }

  // Attribute process CPU deltas to this job only while its synchronous source
  // continuation/control callback executes. Time waiting and other sessions'
  // continuations is excluded. This is a modern accounting approximation, not
  // PDP-10 instruction timing; background process CPU may enter a sampled delta.
  private runtimeMilliseconds():bigint{
    return (this.cpuElapsed+(this.cpuStarted===undefined?0n:this.cpuMicroseconds()-this.cpuStarted))/1000n;
  }
  private measured<T>(work:()=>T):T{
    if(this.cpuStarted!==undefined)return work();
    this.cpuStarted=this.cpuMicroseconds();
    try{return work();}finally{this.cpuElapsed+=this.cpuMicroseconds()-this.cpuStarted;this.cpuStarted=undefined;}
  }

  private async wait(request:SessionWait):Promise<void>{
    if(request.type==='delay'&&(!Number.isFinite(request.milliseconds)||request.milliseconds<0))throw new RangeError('Invalid session delay');
    // Closed input/delays wake immediately, but source computation must still
    // cooperate so a hung-up job cannot starve other jobs or forced shutdown.
    if((this.closed&&request.type!=='cooperate')||this.interrupted||this.cancelled||this.controlFailed)return;
    if(this.queue.length&&(request.type==='input'||(request.type==='delay'&&request.wakeOnInput)))return;
    await new Promise<void>(resolve=>{
      let timer:ReturnType<typeof setTimeout>|undefined,immediate:ReturnType<typeof setImmediate>|undefined;
      const finish=()=>{if(timer)clearTimeout(timer);if(immediate)clearImmediate(immediate);this.wake=undefined;this.waiting=undefined;resolve();};
      this.wake=finish;this.waiting=request;
      if(request.type==='cooperate')immediate=setImmediate(finish);
      // Node treats delays above its signed-32-bit range as 1 ms. Preserve the
      // requested duration instead, by waiting in bounded chunks.
      if(request.type==='delay'){
        let remaining=request.milliseconds;
        const next=()=>{const chunk=Math.min(remaining,0x7fffffff);remaining-=chunk;timer=setTimeout(()=>remaining>0?next():finish(),chunk);};next();
      }
    });
  }
  private async drive():Promise<void>{
    let result:SessionResult;
    try{
      for(;;){
        if(this.controlFailed)throw this.controlError;
        if(this.cancelled){for(const control of this.controls)this.measured(()=>control.return());this.controls.length=0;this.measured(()=>this.program.run.return());result={reason:'cancelled'};break;}
        const control=this.controls[0],step=this.measured(()=>(control??this.program.run).next());
        if(control&&step.done){this.controls.shift();continue;}
        if(step.done){result={reason:'completed'};break;}
        await this.wait(step.value);
      }
    }catch(error){result=error instanceof SessionExit?{reason:'completed'}:{reason:'failed',error};}
    this.finished=true;this.queue.length=0;this.resolve(result);
  }
}
