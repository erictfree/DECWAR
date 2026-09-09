import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import { bindSetupPrefixRuntime } from './setup-prefix-runtime.ts';
import { bindSetupAdmissionRuntime } from './setup-admission-runtime.ts';
import type { pregameRuntimeFixture } from './pregame-runtime.ts';
import { commandLoopStatements,dispatchCommandStatements,quitStatements } from '../../src/game/command-loop-statements.ts';
import type { MainLoopServices,StatementCommandCall } from '../../src/game/command-loop-statements.ts';
import { messages,constants as K } from '../../src/runtime/variant-values.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
import { moveStatements } from '../../src/game/move-statements.ts';
import { repairStatements } from '../../src/game/repair-statements.ts';
import type { RepairServices } from '../../src/game/repair-statements.ts';
import { turnStatements } from '../../src/game/turn-statements.ts';
import type { TurnStatementServices } from '../../src/game/turn-statements.ts';
import { add36,multiply36,divide36 } from '../../src/compat/word36.ts';
import { bindMainDefensesRuntime } from './main-defenses-runtime.ts';
import { bindRomulanMainRuntime } from './romulan-main-runtime.ts';
import { bindMainDamageRuntime } from './main-damage-runtime.ts';
import { bindMainTimeRuntime } from './main-time-runtime.ts';
import { bindMainDockRuntime } from './main-dock-runtime.ts';
import { bindMainListRuntime } from './main-list-runtime.ts';
import { bindMainDebugRuntime } from './main-debug-runtime.ts';
import { bindMainTorpedoRuntime } from './main-torpedo-runtime.ts';
import { bindMainPhaserRuntime } from './main-phaser-runtime.ts';
import { bindMainCaptureRuntime } from './main-capture-runtime.ts';
import { bindMainBuildRuntime } from './main-build-runtime.ts';
import { bindMainScanRuntime } from './main-scan-runtime.ts';
import { bindMainTractorRuntime } from './main-tractor-runtime.ts';
import { bindMainUsersRuntime } from './main-users-runtime.ts';
import { bindMainEnergyRuntime } from './main-energy-runtime.ts';
import { bindMainShieldRuntime } from './main-shield-runtime.ts';
export function bindMainLoopRuntime(f:ReturnType<typeof pregameRuntimeFixture>){
  f.m.map(44000n,Array<bigint>(400).fill(0n));const n=44000n,header=44010n,lines=44020n,yes=44030n,sure=44040n;
  f.m.write(n,77n);f.h.put(yes,'YES');f.h.put(sure,messages.sure00.text);
  const turnLocals={i:f.apr.locals.i,d1:44060n,d2:44061n},repairLocals={v:44070n,l:44071n,repsiz:44072n,ntoken:44073n,maxd:44074n,i:44075n},il=44076n,repairSymbols={all:44080n,damage:44085n};
  f.h.put(repairSymbols.all,'ALL');f.h.put(repairSymbols.damage,'DAMAGE');const turnLabels={lifdam:44100n,strdat:44140n};for(const key of ['lifdam','strdat'] as const)f.h.put(turnLabels[key],messages[key].text);
  const events:string[]=diagnosticRecords(),calls:StatementCommandCall[]=diagnosticRecords(),policy:{debug?:'omit'|((op:'timin'|'timout',label:string)=>Generator<string,void,void>);quit?:(result:bigint)=>Generator<string,'leave'|'next',void>;movement?:(alive:()=>bigint)=>Generator<string,'leave'|'repair',void>}={};
  const io:MainLoopServices<string>={logical:f.weapon.io.logical,*assignTrue(a){f.m.write(a(),-1n);},*assignFalse(a){f.m.write(a(),0n);},
    *debugLine(op,label){events.push(op+':'+label);if(policy.debug===undefined)throw new Error('required column-D compilation policy');if(policy.debug!=='omit')yield*policy.debug(op,label);},
    *getcmd(a){events.push('getcmd');yield*f.getCommand.run(a);},
    *invoke(call){events.push('invoke:'+call.routine);calls.push({...call});switch(call.routine){
      case 'gripe':yield*f.gripe.run();break;case 'help':yield*f.command.run();break;case 'news':yield*f.news.run();break;
      case 'points':f.m.write(f.points.dflg,0n);yield*f.points.run();break;
      case 'radio':yield*f.radio.run();break;case 'tell':yield*f.tell.run();break;case 'set':yield*f.set.run();break;
      case 'type':yield*f.type.call(call.argument as 0|1|2);break;case 'paswrd':yield*f.password.run();break;
      case 'damage':f.m.write(damageReport.s.stoken,BigInt(call.argument as number));yield*damageReport.run();break;
      case 'status':f.m.write(f.statusReport.stoken,BigInt(call.argument as number));yield*f.statusReport.run();break;
      case 'time':yield*time.run();break;
      case 'list':case 'summar':case 'bases':case 'planet':case 'target':yield*lists.run(call.routine);break;
      case 'debug':yield*debug.run();break;
      case 'torp':return (yield*torpedo.run()).alternateReturn?'alternate':'normal';
      case 'phacon':return (yield*phaser.run()).alternateReturn?'alternate':'normal';
      case 'captur':return (yield*capture.run()).alternateReturn?'alternate':'normal';
      case 'build':return (yield*build.run()).alternateReturn?'alternate':'normal';
      case 'dock':return (yield*dock.run()).alternateReturn?'alternate':'normal';
      case 'shield':yield*shield.run();break;
      case 'energy':yield*energy.run();break;
      case 'users':yield*users.run();break;
      case 'tractr':yield*tractor.run();break;
      case 'scan':case 'srscan':yield*scan.run(call.routine);break;
      case 'repair':f.m.write(il,1n);return (yield*repair()).alternateReturn?'alternate':'normal';
      case 'move':case 'impuls':{const result=yield*moveStatements(call.routine,f.high,f.low,f.out,f.locals,f.io);return result.alternateReturn?'alternate':'normal';}
      default:throw new Error('main loop requires '+call.routine+' binding');
    }return 'normal';},
    *movementBranch(alive){events.push('movement');if(!policy.movement)throw new Error('required two-label movement IF policy');return yield*policy.movement(alive);},
    *outSure(){events.push('sure');f.m.write(lines,0n);loadArgumentBlock(f.m,header,[sure,lines]);selectArgumentBlock(f.r,header);yield*f.rt.run('out');},
    *clear(){events.push('clear');yield*f.wait.clear(function*(){f.editor.bytes.length=0;});},*gtkn(){events.push('gtkn');yield*f.tokens.run();},
    *equalYes(token){events.push('equal');return yield*f.pregameInput.io.equal(token,yes);},
    *quitBranch(result){events.push('quit-branch:'+result);if(!policy.quit)throw new Error('required two-label QUIT IF policy');return yield*policy.quit(result);},
    *leave(){events.push('leave');yield*f.apr.leave('leave');throw new Error('DECWAR EXIT unexpectedly returned');},
    *finishTurn(auto){events.push('turn:'+auto);yield*turnStatements(f.high,f.low,auto,turnLocals,turnIO);},
  };
  const repairIO:RepairServices<string>={logical:f.weapon.io.logical,*and(a,b){return a()&&b();},
    *integer(op,l,r){const a=yield*l(),b=yield*r();switch(op){case 'add':return add36(a,b);case 'sub':return add36(a,-b);case 'mul':return multiply36(a,b);case 'div':return divide36(a,b).quotient;case 'min':return a<b?a:b;case 'max':return a>b?a:b;}},
    *assign(a,value){const word=yield*value();f.m.write(a(),word);},*equal(a,b){return yield*f.pregameInput.io.equal(a,b);},*etim(a){return yield*f.io.etim(a);},
    *damage(stoken){events.push('repair-damage');f.m.write(damageReport.s.stoken,stoken);yield*damageReport.run();},
  }; // Explicit left-first integer and RHS-first assignment fixture.
  const repair=()=>repairStatements(f.high,f.low,il,repairLocals,repairSymbols,repairIO);
  const damageReport=bindMainDamageRuntime(f);
  const dock=bindMainDockRuntime(f,repairIO);
  const shield=bindMainShieldRuntime(f,repairIO);
  const energy=bindMainEnergyRuntime(f,repairIO);
  const users=bindMainUsersRuntime(f);
  const tractor=bindMainTractorRuntime(f,energy);
  const scan=bindMainScanRuntime(f,repairIO);
  const time=bindMainTimeRuntime(f),pregameInvoke=f.pregame.io.invoke;
  f.pregame.io.invoke=function*(call){if(call.routine==='time')yield*time.run();else if(call.routine==='users')yield*users.run();else if(call.routine==='debug')yield*debug.run();else if(call.routine==='summar')yield*lists.run(call.routine);else yield*pregameInvoke(call);};
  const defenses=bindMainDefensesRuntime(f);
  const romulan=bindRomulanMainRuntime(f,defenses,(op,label)=>io.debugLine(op,label));
  const build=bindMainBuildRuntime(f,repairIO,romulan.torpedoes.removal);
  const capture=bindMainCaptureRuntime(f,build,defenses);
  const phaser=bindMainPhaserRuntime(f,defenses);
  const torpedo=bindMainTorpedoRuntime(f,defenses,romulan.torpedoes);
  const debug=bindMainDebugRuntime(f);
  const admission=bindSetupAdmissionRuntime(f);
  const setup=bindSetupPrefixRuntime(f,admission,romulan.placement);
  const lists=bindMainListRuntime(f);
  const turnIO:TurnStatementServices<string>={logical:repairIO.logical,integer:repairIO.integer,assign:repairIO.assign,
    *repair(mode){events.push('automatic-repair');f.m.write(il,BigInt(mode));return yield*repair();},*debugLine(op,label){yield*io.debugLine(op,label);},
    *baspha(){events.push('baspha');yield*defenses.base();},*plnatk(){events.push('plnatk');yield*defenses.planet();},*basbld(){events.push('basbld');yield*defenses.build();},*romdrv(d1,d2){events.push('romdrv');yield*romulan.run(d1,d2);},
    *out(key,count){f.m.write(lines,BigInt(count));loadArgumentBlock(f.m,header,[turnLabels[key],lines]);selectArgumentBlock(f.r,header);yield*f.rt.run('out');},
    *odec(a,width){f.m.write(lines,BigInt(width));loadArgumentBlock(f.m,header,[a,lines]);selectArgumentBlock(f.r,header);yield*f.rt.run('odec');},
  };
  // DECWAR.FOR:80-83, after SETUP returns. Admission remains a separate
  // SETUP phase until the world-initialization/locking prefix is bound.
  function* placeAdmitted(){
    f.apr.install();const p=romulan.placement;
    f.m.write(p.s.object,add36(multiply36(100n,f.low.read('team')),f.low.read('who')));f.m.write(p.s.n,1n);
    yield*p.run({object:p.s.object,n:p.s.n,v:f.high.address('shpcon',f.low.read('who'),K.KVPOS),h:f.high.address('shpcon',f.low.read('who'),K.KHPOS)});
  }
  function* admitAndPlace(){yield*admission.run();yield*placeAdmitted();}
  function* setupAndPlace(){yield*setup.run();yield*placeAdmitted();}
  return {setup,setupAndPlace,admitAndPlace,n,header,lines,yes,sure,events,calls,policy,io,turnLocals,turnIO,repairLocals,repairIO,damageReport,time,dock,shield,energy,users,tractor,scan,build,capture,phaser,torpedo,debug,lists,admission,defenses,romulan,run:()=>commandLoopStatements(n,f.high,f.low,io),dispatch:()=>dispatchCommandStatements(n,f.high,f.low,io),quit:()=>quitStatements(f.low,io)};
}
