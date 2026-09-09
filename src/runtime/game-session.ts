import { austinDecini } from '../compat/austin-decini.ts';
import { currentVariant, withVariant, variantGenerator } from '../runtime/variant-execution.ts';
import { createVariantContext } from '../runtime/variant.ts';
import type { SessionProgram,SessionTerminal,SessionWait } from '../runtime/session.ts';
import { SessionExit } from '../runtime/session.ts';
import { pregameRuntimeFixture } from '../../test/fixtures/pregame-runtime.ts';
import { bindMainLoopRuntime } from '../../test/fixtures/main-loop-runtime.ts';
import { bindEntryRuntime } from '../../test/fixtures/entry-runtime.ts';
import { bindRoundedNumericRuntime } from '../../test/fixtures/rounded-numeric-runtime.ts';
import { bindSharedSessionRandom } from '../../test/fixtures/shared-session-random.ts';
import { ranFractionWord } from '../compat/ran-float36.ts';
import { createTokenFloating,tokenTenLeftHalf } from '../runtime/token-floating.ts';
import { rightHalf,leftHalf } from '../compat/word36.ts';
import type { SharedGameWorld } from '../runtime/shared-world.ts';
import { statisticsFiles } from '../runtime/statistics-files.ts';
import { utcDateWord } from '../runtime/date-word.ts';
import { gripeFiles } from '../runtime/gripe-files.ts';
import { PrivateCore } from '../runtime/private-core.ts';
import { monit } from '../compat/monit.ts';
import { setupCancelStatements } from '../game/setup-admission-statements.ts';
import { interceptInterrupt } from '../compat/interrupt.ts';
import { add36,packSixbit,signed36 } from '../compat/word36.ts';
import { clearBufferStatements } from '../game/clear-buffer-statements.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../compat/fortran-call.ts';
import { reloadRuntime } from '../compat/reset.ts';
import { sourceAsset } from '../runtime/source-assets.ts';
import { bindPlayablePolicy } from '../../test/fixtures/playable-runtime-policy.ts';
import { bindLiveWait } from './live-wait.ts';

// Shared host/test session factory. Statement binders are being migrated from
// test/fixtures; their synthetic compiler scratch and modern monitor services
// remain documented bindings, not recovered PDP-10 instruction addresses.
export function createGameSession(terminal:SessionTerminal,mode:'initialize'|'full'='initialize',world?:SharedGameWorld,job=1,options:{promptForName?:boolean;playable?:boolean;lifecycle?:{removeHighSegment():void;run():never}}={}){
  const context=world?.variant??createVariantContext('compuserve',options.playable?'playable':'historical-diagnostic');
  return withVariant(context,()=>composeLiveSession(terminal,mode,world,job,options));
}
function composeLiveSession(terminal:SessionTerminal,mode:'initialize'|'full'='initialize',world?:SharedGameWorld,job=1,options:{promptForName?:boolean;playable?:boolean;lifecycle?:{removeHighSegment():void;run():never}}={}){
  const f=pregameRuntimeFixture([]),main=bindMainLoopRuntime(f),entry=bindEntryRuntime(f,main);
  for(let a=f.high.address('hfz');a<=f.high.address('hlz');a++)f.m.write(a,0n);
  f.high.write('tim0',-1n);f.editor.bytes.length=0;f.input.pointer=-1n;
  terminal.echoAllowed=()=>f.editor.state.echflg>=0n;
  // WARMAC RESET:1137-1138 initializes TERWID before FORTRAN entry. It lies
  // beyond LLZ (LOWSEG.FOR:27-28), so entry's BLKSET must preserve it.
  f.low.write('terwid',80n);
  if(options.promptForName){f.m.write(f.jobStatus.symbols.uscbh,0n);f.m.write(f.jobStatus.symbols.uscbh+1n,0n);}
  main.lists.policy.reversedLoop='zero-trip'; // Existing explicit diagnostic policy.
  main.lists.policy.twoLabel='true-first'; // Selected V5 IF(E) N1,N2 semantics, shared with SETUP.
  main.policy.debug='omit';main.policy.quit=function*(n){return n<0n?'leave':'next';};
  main.policy.movement=function*(alive){return alive()<0n?'repair':'leave';}; // Selected V5 logical/two-label IF policy.
  Object.assign(main.admission.trapAddresses,{zero:0n,cc1:59980n,cc2:59981n,clrbuf:59982n});
  main.setup.policy.missingTrap=0n;main.setup.policy.regular='true-first';f.getCommand.trapAddress.value=0n;
  const numeric=bindRoundedNumericRuntime(f);
  // ROMDRV.FOR:169 passes a persistent literal 0.0 to CHECK. Replace the
  // rational fixture handle along with the arithmetic services that read it.
  f.m.write(main.romulan.s.realZero,numeric.literal('0.0'));
  bindSharedSessionRandom(f,function*(raw,scale){if(scale!==0o200n)throw new Error('Unexpected RAN FSC scale');return ranFractionWord(raw);});
  f.tokens.symbols.tenLeftHalf=tokenTenLeftHalf;
  Object.assign(f.tokens.io,createTokenFloating(f.r,function*(){throw new Error('selected token arithmetic transfer');}));
  const outchr=f.cpu.outchr;
  f.cpu.outchr=function*(byte){
    yield*outchr(byte);terminal.write(Uint8Array.of(Number(byte&127n)));
    // A host TTY write is a scheduling boundary: other jobs and interrupts can
    // run during reports and queued command input, not only at the next HIBER.
    // This is cooperative Node scheduling, not historical baud/CPU timing.
    yield 'output';
  };
  f.wait.io.skpinc=function*(){return f.editor.bytes.length>0||terminal.available();};
  const zaplok=f.getCommand.io.zaplok;
  f.getCommand.io.zaplok=function*(){
    yield*zaplok();
    // GETCMD:200/210/350 can loop without I/O when HUNGUP is already set.
    // Preserve that source loop while allowing other jobs and host shutdown.
    yield 'cooperate';
  };
  const clear=f.wait.clear;
  f.wait.clear=clrbfi=>clear(function*(){terminal.clearInput();if(clrbfi)yield*clrbfi();else f.editor.bytes.length=0;});
  const clearMonitorInput=f.editor.terminalIO.clrbfi;
  f.editor.terminalIO.clrbfi=function*(){terminal.clearInput();yield*clearMonitorInput();};
  // Host clock selection for this fixture: milliseconds since UTC midnight.
  // All callers, including the admission copy, must observe the live callback.
  f.clockIO.mstime=function*(){f.r.f=BigInt(Date.now()%86_400_000);};
  f.clockIO.runtim=function*(){f.r.f=terminal.runtimeMilliseconds();};
  main.time.clockIO.mstime=f.clockIO.mstime;main.time.clockIO.runtim=f.clockIO.runtim;
  bindLiveWait(f.wait.io,f.r,options.playable===true);
  f.jobStatus.io.getppn=function*(){f.r.t1=9n;return false;};
  f.jobStatus.io.inchwl=function*(){
    f.jobStatus.events.push('inchwl');
    if(!f.editor.bytes.length){
      yield 'name-input';
      if(!f.editor.bytes.length&&(f.low.read('hungup')!==0n||f.low.read('ccflg')!==0n)){
        // Selected host EOF policy for raw INCHWL: request source cancellation.
        // JOBSTA tests CCFLG, unlike ICHR.T which also checks HUNGUP.
        if(f.low.read('hungup')!==0n)f.low.write('ccflg',-1n);
        f.r.t2=0n;return;
      }
    }
    const byte=f.editor.bytes.shift();if(byte===undefined)throw new Error('Raw name input resumed without data or cancellation');f.r.t2=byte;
  };
  main.admission.io.daytim=function*(address){const now=BigInt(Date.now()%86_400_000);f.m.write(address,now);return now;};
  main.admission.io.runtim=function*(address){const runtime=terminal.runtimeMilliseconds();f.m.write(address,runtime);return runtime;};
  main.setup.io.daytim=main.admission.io.daytim;
  const fileOpen=f.news.openIO.filop;
  f.news.openIO.filop=function*(){
    // WARMAC:833-860,5118-5126: the special logical HELP search can fall
    // back to the physical standard file. This host has only the supplied
    // standard archive, so it does not invent a separate special help file.
    if(f.r.x1===f.help.symbols.hl1fil)return false;
    const success=yield*fileOpen();
    if(success&&f.r.x1===f.help.symbols.hl2fil){
      const text=sourceAsset('DECWAR.HLP');f.ini.load(text.slice(0,200));f.ini.refills.length=0;
      for(let i=200;i<text.length;i+=200)f.ini.refills.push({text:text.slice(i,i+200)});
      f.ini.refills.push({eof:true});
    }
    return success;
  };
  if(currentVariant().definition.id==='austin'){
    const setup=main.setupAndPlace;
    const text=currentVariant().definition.fileDescriptors;
    if(!('missingInitialization' in text))throw new Error('Austin DECINI messages missing');
    main.setupAndPlace=function*(){
      yield*setup();
      yield*austinDecini(f.input,f.ini.state,f.r,{prompt:text.prompt.text,missing:text.missingInitialization.text},{
        *outstr(value){for(const byte of Buffer.from(value,'latin1'))yield*f.cpu.outchr(BigInt(byte));},
        *inchwl(){throw new Error('Austin DECINI does not read experience input');},
        clearInput:()=>f.editor.terminalIO.clrbfi(),
        *hibernate(){throw new Error('Austin DECINI does not hibernate');},
        files:{inibeg:f.ini.symbols.iniFile,iniint:0n,iniexp:0n},
        *open(){const data=sourceAsset('DECWAR.INI');f.ini.load(data.slice(0,200));f.ini.refills.length=0;
          for(let i=200;i<data.length;i+=200)f.ini.refills.push({text:data.slice(i,i+200)});
          f.ini.refills.push({eof:true});return true;},
        ttyon:()=>f.ini.io.ttyon(),ocrl:()=>f.rt.run('ocrl.'),seti:()=>f.ini.io.setInput(),
      });
    };
  }
  f.statistics.io.dateT3=function*(){f.r.t3=utcDateWord(new Date());};
  const core=new PrivateCore(f.m,f.job,0o240000n,0o400000n);
  f.cpu.core=function*(){return core.request(f.r.t3);};
  f.gripe.io.core=function*(){return core.request(f.r.t1);};
  for(const io of [f.news.openIO,f.statistics.openIO,f.gripe.openIO,f.ini.closeIO,f.gripe.closeIO])io.core=function*(last){return core.request(last);};
  if(world){
    const {stared,staupd,stfred,stfupd}=f.statistics.symbols;
    const files=statisticsFiles(f.m,f.r,f.file,{stared,staupd,stfred,stfupd},world.files);
    f.statistics.openIO.filop=files.filop;
    Object.assign(f.statistics.io,{inputSTA:files.inputSTA,outputSTA:files.outputSTA,closeSTA:files.closeSTA});
    const reports=gripeFiles(f.m,f.file,world.files,{acquire:name=>world.openExclusiveFile(name,job),release:name=>world.closeExclusiveFile(name,job)},f.gripe.symbols.fileBusyCode);
    f.gripe.openIO.filop=reports.filop;
    Object.assign(f.gripe.io,{input:reports.input,output:reports.output,useto:reports.useto});
    f.gripe.closeIO.executeClose=reports.close;
    const austin=world.variant.definition.id==='austin';
    const key=()=>austin?f.r.t1:f.m.read(f.symbols.queuen);
    f.lockIO.enq=function*(){
      const result=world.locks.request(key(),job,()=>{f.lockState.hvLok=-1n;terminal.wake();});
      if(result==='granted')return true;f.r.t2=1n;return false;
    };
    f.unlockIO.deq=function*(){if(austin){world.locks.releaseJob(job);return true;}if(world.locks.dequeue(key(),job))return true;f.r.t2=0o24n;return false;};
    // LOCK adds 4*3 UCT units with the comment "about 4 seconds". Three
    // ticks/second is a source-comment inference, not verified monitor behavior.
    f.lockIO.uct=function*(register){f.r[register]=BigInt(Math.floor(Date.now()*3/1000));return true;};
    f.lockIO.enqc=function*(){f.locks.write('whohas',BigInt(world.locks.owner(key())??0),0);return true;};
  }
  world?.attach(f.m);
  const monitor={jbsa:0n},whoArgumentList=73000n;f.m.map(whoArgumentList,[f.low.address('who')]);
  const exitState={
    get hungup(){return f.low.read('hungup');},get who(){return f.low.read('who');},get jsqwho(){return f.locks.read('jsqwho');},
    get jbsa(){return monitor.jbsa;},set jbsa(word:bigint){monitor.jbsa=word;},
  };
  function* exit():Generator<string,never,void>{
    if(currentVariant().definition.id==='austin'){
      if(f.low.read('hungup')===0n)yield*f.ini.controlIO.output();
      yield*f.unlockIO.deq();world?.releaseJob(job);throw new SessionExit();
    }
    return yield*monit(f.m,exitState,f.r,{whoArgumentList,jsqtab:f.getHit.queues.address('jsqtab')},{
      outputTTY:()=>f.ini.controlIO.output(),zaplok:()=>f.getCommand.io.zaplok(),
      *reset(){world?.releaseJob(job);},*free(){yield*f.free.run(f.m.read(f.r.arg));},
      *afterFreeJump(){return 'sequence-cleanup';}, // Explicit existing continuation-after-literal policy.
      *monrt(){throw new SessionExit();},
    });
  }
  f.pregame.io.monit=exit;f.pregameInput.io.monit=exit;f.apr.io.monit=exit;f.lockIO.monit=exit;
  function* monitorExit():Generator<string,never,void>{
    // Austin WARMAC:1072 HLLZS .JBSA disables restart; MONIT does not.
    if(currentVariant().definition.id==='austin')monitor.jbsa=signed36(leftHalf(monitor.jbsa)<<18n);
    return yield*exit();
  }
  f.endgame.io.exit=monitorExit;f.restart.io.monit=exit;main.setup.io.exit=monitorExit;
  if(options.lifecycle){
    const lifecycle=options.lifecycle,kill=main.romulan.torpedoes.removal.killHigh;
    // Virtual loader identity, not an original disk image or recovered SG* ACs.
    f.m.write(kill.s.device,signed36(packSixbit('DSK')));f.m.write(kill.s.name,signed36(packSixbit('DECWAR')));f.m.write(kill.s.ppn,0n);
    kill.io.openREN=function*(){return true;};kill.io.lookupREN=function*(){return true;};
    kill.io.renameREN=function*(){lifecycle.removeHighSegment();return true;};
    main.setup.policy.start=function*(){
      yield*reloadRuntime(f.input,f.file,f.r,{programName:kill.s.name,programPpn:kill.s.ppn,programDevice:kill.s.device},{
        *run(){lifecycle.run();},monit:exit,
      });
    };
  }
  main.admission.io.cancel=function*(stage){main.admission.events.push(stage);yield*setupCancelStatements(stage,f.high,f.low,{unlock:()=>main.admission.io.unlock(),exit:monitorExit});};
  f.file.write('intflg',-1n); // Original RESET initializes the interrupt processing gate.
  const clearCall={header:73010n,word:73020n,lines:73021n};f.m.map(clearCall.header,Array<bigint>(12).fill(0n));
  const clearBuffer=()=>clearBufferStatements({
    *out(word:bigint,lines:bigint){
      f.m.write(clearCall.word,word);f.m.write(clearCall.lines,lines);
      loadArgumentBlock(f.m,clearCall.header,[clearCall.word,clearCall.lines]);selectArgumentBlock(f.r,clearCall.header);
      yield*f.rt.run('out');
    },clear:()=>f.wait.clear(),
  });
  const interrupts={returns:[] as bigint[],traps:[] as bigint[]};
  function* interrupt():Generator<string,void,void>{
    // Opaque host continuation word: 0 resumes at this generator boundary; the
    // source INWAIT increment records 1 for the input skip. This is not a PC.
    f.file.write('intadr',0n);
    yield*interceptInterrupt(f.file,f.editor.runtime.state,{
      pushReturn:word=>f.cpu.pushP(word),
      *incrementReturn(){const address=rightHalf(f.r.p);f.m.write(address,add36(f.m.read(address),1n));},
      *popReturn(){const word=yield*f.cpu.popP();interrupts.returns.push(word);if(word!==0n&&word!==1n)throw new Error('Unbound interrupt continuation');},
      *blt(ac,last){let from=leftHalf(f.m.read(ac)),to=rightHalf(f.m.read(ac));while(to<=last)f.m.write(to++,f.m.read(from++));},
      *callTrap(address){
        interrupts.traps.push(address);yield*f.cpu.pushP(0n); // Selected synthetic PUSHJ continuation.
        if(address===main.admission.trapAddresses.cc1)yield*main.admission.io.cancel('cc1');
        else if(address===main.admission.trapAddresses.cc2)yield*main.admission.io.cancel('cc2');
        else if(address===main.admission.trapAddresses.clrbuf)yield*clearBuffer();
        else throw new Error('Live runtime requires control trap binding: '+address);
        yield*f.cpu.popP();
      },
    });
  }
  if(options.playable)bindPlayablePolicy(f,main);
  const entrySource=mode==='initialize'?entry.initialize():entry.run();
  const austin=currentVariant().definition.id==='austin';
  function* boot():Generator<string,void,void>{
    // Austin WARMAC RESET:1043-1050; .JBVER edit 0 matches the preserved
    // native reference transcript. The host does not invent a release number.
    if(austin)for(const byte of Buffer.from('DECWAR, Edit     0\r\n','latin1'))yield*f.cpu.outchr(BigInt(byte));
    yield*entrySource;
  }
  const source=boot();
  function* drive(source:Generator<string,void,void>):Generator<SessionWait,void,void>{
    for(;;){
      const step=source.next();if(step.done)return;
      if(step.value==='input'||step.value==='name-input'){
        const byte=yield*terminal.read();if(byte!==null)f.editor.bytes.push(BigInt(byte));
      }else if(step.value.startsWith('hiber:')){
        const operand=BigInt(step.value.slice(6));
        yield {type:'delay',milliseconds:Number(rightHalf(operand)),wakeOnInput:leftHalf(operand)===f.wait.wakeInputLeftHalf};
      }else if(step.value.startsWith('hibernate:'))yield {type:'delay',milliseconds:Number(step.value.slice(10)),wakeOnInput:false};
      else if(step.value==='gripe-hibernate')yield {type:'delay',milliseconds:Number(f.r.t1),wakeOnInput:false};
      else if(step.value==='output'||step.value==='cooperate')yield {type:'cooperate'};
      else throw new Error('Live fixture requires wait binding: '+step.value);
    }
  }
  const context=currentVariant();
  const program:SessionProgram={run:variantGenerator(context,drive(source)),hangup(){f.low.write('hungup',-1n);},interrupt:()=>variantGenerator(context,drive(interrupt()))};
  return {f,main,entry,program,interrupts};
}
