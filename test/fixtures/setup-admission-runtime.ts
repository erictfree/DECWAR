import type { pregameRuntimeFixture } from './pregame-runtime.ts';
import { setupAdmissionStatements,setupCancelStatements } from '../../src/game/setup-admission-statements.ts';
import type { AdmissionServices,AdmissionLabel } from '../../src/game/setup-admission-statements.ts';
import { setupLiterals } from '../../src/game/setup.ts';
import { messages } from '../../src/runtime/variant-values.ts';
import { localLayout } from '../../src/runtime/variant-values.ts';
import { packAscii } from '../../src/compat/word36.ts';
import { setControlTrap } from '../../src/compat/interrupt.ts';
import { clockRoutine } from '../../src/compat/clock-runtime.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
export function bindSetupAdmissionRuntime(f:ReturnType<typeof pregameRuntimeFixture>){
  f.m.map(59200n,Array<bigint>(800).fill(77n));const locals={identity:BigInt(localLayout.local.address),kindex:59200n,i:59201n,ibeg:59202n,iend:59203n,d:59204n},s={header:59220n,count:59230n,yes:59240n,federation:59245n,empire:59250n};
  const labels={} as Record<AdmissionLabel,bigint>;(['setu11','setu12','setu13','setu14','setu15','setu16','setu17','stu17a','setu18',...Object.keys(setupLiterals)] as AdmissionLabel[]).forEach((key,i)=>{labels[key]=59300n+BigInt(i*25);f.h.put(labels[key],key in setupLiterals?setupLiterals[key as keyof typeof setupLiterals].text:messages[key as keyof typeof messages].text);});
  f.h.put(s.yes,'YES');f.h.put(s.federation,'FEDERATION');f.h.put(s.empire,'EMPIRE');
  const events:string[]=[],runs:bigint[]=[],trapAddresses:Partial<Record<'zero'|'cc1'|'cc2'|'clrbuf',bigint>>={},prepare=(a:bigint[])=>{loadArgumentBlock(f.m,s.header,a);selectArgumentBlock(f.r,s.header);};
  const clockIO={...f.clockIO,*runtim(){if(!runs.length)throw new Error('admission requires scheduled RUNTIM');f.r.f=runs.shift()!;}};
  const io:AdmissionServices<string>={logical:f.weapon.io.logical,trueWord:()=>-1n,*interrupted(cc,hungup){return f.weapon.io.logical(cc())||f.weapon.io.logical(hungup());},
    *out(key,lines){events.push(key);f.m.write(s.count,BigInt(lines));prepare([labels[key],s.count]);yield*f.rt.run('out');},
    *out2w(a,b){prepare([a,b]);yield*f.rt.run('out2w');},*crlf(){yield*f.rt.run('crlf');},*odec(a,width){f.m.write(s.count,BigInt(width));prepare([a,s.count]);yield*f.rt.run('odec');},
    *gtkn(){yield*f.tokens.run();},*equal(a,key){return yield*f.pregameInput.io.equal(a,typeof key==='bigint'?key:key==='YES'?s.yes:key==='FEDERATION'?s.federation:s.empire);},
    *sideChoice(fed,emp){return f.weapon.io.logical(yield*fed())||f.weapon.io.logical(yield*emp());},
    *cctrap(handler){events.push('trap:'+handler);const a=trapAddresses[handler===0?'zero':handler];if(a===undefined)throw new Error('admission requires resolved CCTRAP '+handler+' address');setControlTrap(f.file,f.lockState,()=>a);},
    *cancel(stage){events.push(stage);yield*setupCancelStatements(stage,f.high,f.low,{unlock:()=>io.unlock(),*exit(){throw new Error('SETUP EXIT transfer');}});},
    *kqsrch(...args){yield*f.free.io.kqsrch(...args);},*unlock(){events.push('unlock');yield*f.io.unlock(f.high.address('frelok'));},
    *updcap(who){events.push('updcap');yield*f.statistics.run('updcap',[who]);},*jobsta(a){events.push('jobsta');yield*f.jobStatus.run(a);},
    *daytim(d){prepare([d]);yield*clockRoutine('daytim',f.m,f.r,f.rt.args,clockIO);return f.r.f;},*runtim(d){prepare([d]);yield*clockRoutine('runtim',f.m,f.r,f.rt.args,clockIO);return f.r.f;},groupWord:name=>packAscii(name.slice(0,5)),
  }; // Explicit sign-logical/short-circuit, ordinary integer, first-word literal fixture.
  return {locals,s,labels,events,runs,trapAddresses,io,run:()=>setupAdmissionStatements(f.high,f.low,locals,io)};
}
