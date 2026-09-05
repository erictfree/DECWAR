import assert from 'node:assert/strict';
import { bindJobStatusRuntime } from './job-status-runtime.ts';
import { bindPasswordRuntime } from './password-runtime.ts';
import { bindTypeRuntime } from './type-runtime.ts';
import { bindSetRuntime } from './set-runtime.ts';
import { bindUserNameRuntime } from './user-name-runtime.ts';
import { bindEndgameRuntime } from './endgame-runtime.ts';
import { bindPointsRuntime } from './points-runtime.ts';
import { bindFreeRuntime } from './free-runtime.ts';
import { bindRestartRuntime } from './restart-runtime.ts';
import { bindGetHitRuntime } from './get-hit-runtime.ts';
import { bindGetMessageRuntime } from './get-message-runtime.ts';
import { bindQueueProducerRuntime } from './queue-producer-runtime.ts';
import { bindMakeHitRuntime } from './make-hit-runtime.ts';
import { bindMakeMessageRuntime } from './make-message-runtime.ts';
import { bindRadioRuntime } from './radio-runtime.ts';
import { bindTellRuntime } from './tell-runtime.ts';
import { bindRomulanSpeechRuntime } from './romulan-speech-runtime.ts';
import { bindOutMessageRuntime } from './out-message-runtime.ts';
import { bindGetCommandRuntime } from './get-command-runtime.ts';
import { bindOutHitRuntime } from './out-hit-runtime.ts';
import { bindStatisticsRuntime } from './statistics-runtime.ts';
import { bindHonorRollRuntime } from './honor-roll-runtime.ts';
import { bindGripeRuntime } from './gripe-runtime.ts';
import { bindClearStatisticsRuntime } from './clear-statistics-runtime.ts';
import { bindAprRuntime } from './apr-runtime.ts';
import { pregameInputRuntimeFixture } from './pregame-input-runtime.ts';
import { pregameStatements } from '../../src/game/pregame-statements.ts';
import type { PregameStatementServices,PregameStatementMessage } from '../../src/game/pregame-statements.ts';
import { pregameLiterals } from '../../src/game/pregame.ts';
import { localLayout } from '../../src/runtime/variant-values.ts';
import { localState } from '../../src/game/local-state.ts';
import { sourceAsset } from '../../src/runtime/source-assets.ts';
import { messages } from '../../src/runtime/variant-values.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
export function pregameRuntimeFixture(lines=['PREGAME','ACTIVATE']){
  const f=pregameInputRuntimeFixture();f.m.map(20700n,Array<bigint>(500).fill(0n));f.m.map(BigInt(localLayout.local.address),Array<bigint>(localLayout.local.words).fill(0n));
  const sharedLocal=localState(f.m),locals={identity:BigInt(localLayout.local.address),n:20700n},symbols={header:20710n,lines:20720n,HONORROLL:20730n,HELP:20735n,PREGAME:20740n};
  f.m.write(locals.n,77n);f.editor.bytes.length=0;for(const line of lines)f.editor.feed(line+'\n');f.input.pointer=-1n;
  for(const key of ['HONORROLL','HELP','PREGAME'] as const)f.h.put(symbols[key],key);
  const labels={} as Record<PregameStatementMessage,bigint>;
  for(const [i,key] of (['strtup','pgame1','honorInstruction','documentInstruction','documentInstructionEnd','documentMessage','documentBlank'] as const).entries()){
    labels[key]=20800n+BigInt(i*40);f.h.put(labels[key],key==='documentBlank'?'     ':key==='strtup'||key==='pgame1'?messages[key].text:pregameLiterals[key].text);
  } // Explicit packed literal fixture, including the continued documentation text.
  const filop=f.news.openIO.filop;
  f.news.openIO.filop=function*(){const ok=yield*filop();if(ok&&f.r.x1===f.news.symbols.nwsfil){const text=sourceAsset('DECWAR.NWS');f.ini.load(text.slice(0,200));f.ini.refills.length=0;for(let i=200;i<text.length;i+=200)f.ini.refills.push({text:text.slice(i,i+200)});f.ini.refills.push({eof:true});}return ok;};
  const prepare=(a:bigint[])=>{loadArgumentBlock(f.m,symbols.header,a);selectArgumentBlock(f.r,symbols.header);},events:string[]=[];
  const jobStatus=bindJobStatusRuntime(f);
  const password=bindPasswordRuntime(f,jobStatus);
  const type=bindTypeRuntime(f),typeBinding:{kind?:bigint}={};
  const set=bindSetRuntime(f);
  const userName=bindUserNameRuntime(f);
  const endgame=bindEndgameRuntime(f);set.io.endgam=()=>endgame.run();
  const points=bindPointsRuntime(f);
  const free=bindFreeRuntime({...f,block:points.block});endgame.io.free=a=>free.run(a);
  const restart=bindRestartRuntime({...f,free,jobStatus});
  const getHit=bindGetHitRuntime({...f,free});
  jobStatus.symbols.jsqtab=getHit.queues.address('jsqtab');
  const getMessage=bindGetMessageRuntime({...f,free,getHit});
  const queueProducer=bindQueueProducerRuntime({...f,getMessage});
  const makeHit=bindMakeHitRuntime({...f,getHit});
  const makeMessage=bindMakeMessageRuntime({...f,getMessage,queueProducer});
  const radio=bindRadioRuntime(f);
  const tell=bindTellRuntime({...f,radio,makeMessage});
  const romulanSpeech=bindRomulanSpeechRuntime({...f,tell});
  const outMessage=bindOutMessageRuntime({...f,getMessage,radio});
  const getCommand=bindGetCommandRuntime({...f,endgame,outMessage,free});
  const outHit=bindOutHitRuntime({...f,getHit,getCommand,points});
  const statistics=bindStatisticsRuntime({...f,endgame});
  const honorRoll=bindHonorRollRuntime({...f,statistics});
  const gripe=bindGripeRuntime({...f,honorRoll,statistics,getHit});
  const clearStatistics=bindClearStatisticsRuntime({...f,statistics,gripe});
  const apr=bindAprRuntime({...f,gripe,getCommand,tell,endgame});
  endgame.io.points=function*(final){f.m.write(points.dflg,final?-1n:0n);yield*points.run();};
  set.io.usrnam=function*(a){yield*userName.run('address'in a?a.address:userName.zero);return f.r.t0;};
  // JOBSTA and GTKN consume the same explicit terminal queue, into different ACs.
  jobStatus.io.inchwl=function*(){jobStatus.events.push('inchwl');if(!f.editor.bytes.length)yield 'name-input';assert.ok(f.editor.bytes.length,'unscheduled name input');f.r.t2=f.editor.bytes.shift()!;};
  const io:PregameStatementServices<string>={logical:f.pregameInput.io.logical,*or(...p){return yield*f.pregameInput.io.or(...p);},
    *jobsta(addresses){events.push('jobsta');yield*jobStatus.run(addresses);},
    *ttyon(){events.push('ttyon');yield*f.ini.io.ttyon();},
    *out(key,lines){events.push(key);f.m.write(symbols.lines,BigInt(lines));prepare([labels[key],symbols.lines]);yield*f.rt.run('out');},
    *gtkn(){events.push('gtkn');yield*f.tokens.run();},
    *equal(token,key){events.push(`equal:${key}`);return yield*f.pregameInput.io.equal(token,symbols[key]);},
    *monit(){events.push('monit');throw new Error('fixture MONIT transfer');},
    *invoke(call){events.push(call.routine);switch(call.routine){case 'gripe':yield*gripe.run();break;case 'stazap':yield*clearStatistics.run();break;case 'shosta':f.m.write(honorRoll.argument,call.argument?-1n:0n);yield*honorRoll.run();break;case 'points':f.m.write(points.dflg,0n);yield*points.run();break;case 'set':yield*set.run();break;case 'type':if(typeBinding.kind===undefined)throw new Error('fixture requires zero-argument TYPE binding');yield*type.run(typeBinding.kind);break;case 'paswrd':yield*password.run();break;case 'help':yield*f.command.run();break;case 'hlpxtr':case 'hlpall':yield*f.list.summary(call.routine);break;case 'news':yield*f.news.run();break;default:throw new Error('fixture requires '+call.routine);}},
    *xgtcmd(a){events.push('xgtcmd');yield*f.pregameInput.run(a);},
    *prgnam(literal){events.push('prgnam:'+literal);}, // Linked WARMAC:4051-4053 immediately POPJ.
  };
  return {...f,jobStatus,password,type,typeBinding,set,userName,endgame,points,free,restart,getHit,makeHit,getMessage,makeMessage,queueProducer,radio,tell,romulanSpeech,outMessage,getCommand,outHit,statistics,honorRoll,gripe,clearStatistics,apr,pregame:{locals,symbols,labels,io,events,sharedLocal,run:()=>pregameStatements(f.low,locals,io)}};
}
export function driveInitial(f:ReturnType<typeof pregameRuntimeFixture>,g=f.pregame.run()){
  for(let i=0;i<100;i++){const s=g.next();if(s.done)return;if(typeof s.value!=='string'||!s.value.startsWith('hiber:'))throw new Error('unexpected wait '+s.value);}
  throw new Error('fixture exceeds scheduled waits');
}
