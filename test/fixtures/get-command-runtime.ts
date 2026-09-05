import type { pregameInputRuntimeFixture } from './pregame-input-runtime.ts';
import type { bindEndgameRuntime } from './endgame-runtime.ts';
import type { bindOutMessageRuntime } from './out-message-runtime.ts';
import type { bindFreeRuntime } from './free-runtime.ts';
import { getCommandStatements } from '../../src/game/get-command-statements.ts';
import type { GetCommandLocals,GetCommandMessage,GetCommandStatementServices } from '../../src/game/get-command-statements.ts';
import { promptStatements } from '../../src/game/prompt-statements.ts';
import type { PromptStatementServices } from '../../src/game/prompt-statements.ts';
import { messages } from '../../src/generated/source-data.ts';
import { setControlTrap } from '../../src/compat/interrupt.ts';
import { zapLocks,releaseLock } from '../../src/compat/unlock.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
type Host=ReturnType<typeof pregameInputRuntimeFixture>&{endgame:ReturnType<typeof bindEndgameRuntime>;outMessage:ReturnType<typeof bindOutMessageRuntime>;free:ReturnType<typeof bindFreeRuntime>};
export function bindGetCommandRuntime(f:Host){
  f.m.map(32300n,Array<bigint>(700).fill(0n));const locals={} as GetCommandLocals;
  for(const [i,key] of (['i','txppn','txnm1','txnm2','txsh1','txsh2','txtim','txwhy','txtem','txtot'] as const).entries()){locals[key]=32300n+BigInt(i);f.m.write(locals[key],77n);}
  const cmd=32310n,header=32320n,lines=32340n,temp=32341n,quit=32350n,labels={} as Record<GetCommandMessage,bigint>,events:string[]=[],trapAddress:{value?:bigint}={};f.m.write(cmd,77n);f.h.put(quit,'QUIT');
  for(const [i,key] of (['beep','noquit','ambcom','unkcom','forhlp','main02'] as const).entries()){labels[key]=32400n+BigInt(i*40);if(key==='beep')f.m.write(labels[key],0o034160703400n);else f.h.put(labels[key],messages[key].text);}
  const prepare=(a:bigint[])=>{loadArgumentBlock(f.m,header,a);selectArgumentBlock(f.r,header);},numeric=f.weapon.io;
  const promptLabels={normal:32700n,L:32720n,S:32721n,D:32722n,E:32723n,end:32724n};f.h.put(promptLabels.normal,messages.comlin.text);for(const key of ['L','S','D','E'] as const)f.h.put(promptLabels[key],key);f.h.put(promptLabels.end,'> ');
  const promptIO:PromptStatementServices<string>={logical:numeric.logical,*or(...t){return yield*numeric.or(...t);},
    *outNormal(){f.m.write(lines,0n);prepare([promptLabels.normal,lines]);yield*f.rt.run('out');},*odec(a,z){f.m.write(lines,BigInt(z));prepare([a,lines]);yield*f.rt.run('odec');},
    *outc(key){prepare([promptLabels[key]]);yield*f.rt.run('outc');},*outEnd(){prepare([promptLabels.end]);yield*f.rt.run('out2c');},
  };
  const io:GetCommandStatementServices<string>={logical:numeric.logical,*assign(...a){yield*numeric.assign(...a);},*binary(...a){return yield*numeric.binary(...a);},*and(...a){return yield*numeric.and(...a);},*or(...a){return yield*numeric.or(...a);},
    *assignFalse(a){f.m.write(a(),0n);},*bounds(a,b){return yield*f.location.io.bounds(a,b,1);},enterLoop:(a,b)=>f.location.io.enterLoop(a,b,1),*equal(a,b){return yield*f.pregameInput.io.equal(a,b);},
    *ttyon(){events.push('ttyon');yield*f.ini.io.ttyon();},*outhit(){throw new Error('GETCMD requires raw OUTHIT binding');},*outmsg(){events.push('outmsg');yield*f.outMessage.run();},
    *prgnam(n){events.push(n);},*chkseq(){events.push('chkseq');}, // Selected WARMAC:4052 and 3677 immediately POPJ.
    *dmpbuf(){events.push('dmpbuf');yield*f.ini.io.dmpbuf();},*cctrap(){events.push('cctrap');if(trapAddress.value===undefined)throw new Error('zero-argument CCTRAP requires compiler binding');setControlTrap(f.file,f.lockState,()=>trapAddress.value!);},
    *pause(a){events.push('pause');yield*f.wait.pause(a);},*crlf(){events.push('crlf');yield*f.rt.run('crlf');},*endgam(){events.push('endgam');yield*f.endgame.run();},
    *prompt(){events.push('prompt');yield*promptStatements(f.high,f.low,promptIO);},*zaplok(){events.push('zaplok');yield*zapLocks(f.locks,f.r,()=>releaseLock(f.locks,f.lockState,f.r,f.symbols,f.unlockIO));},
    *input(ms){events.push('input');f.m.write(f.wait.argument,BigInt(ms));yield*f.wait.input();return f.r.f;},*gtkn(){events.push('gtkn');yield*f.tokens.run();},*clear(){events.push('clear');yield*f.wait.clear(function*(){f.editor.bytes.length=0;});},
    *out(key,n){events.push(key);f.m.write(lines,BigInt(n));prepare([labels[key],lines]);yield*f.rt.run('out');},*odisp(v,d){events.push('odisp');f.m.write(temp,yield*v.evaluate());f.m.write(lines,BigInt(d));prepare([temp,lines]);yield*f.rt.run('odisp');},
    *etim(a){events.push('etim');return yield*f.endgame.io.etim(a);},*points(d){events.push('points');yield*f.endgame.io.points(d);},*updsta(a){events.push('updsta');yield*f.endgame.io.updsta(a);},*free(a){events.push('free');yield*f.free.run(a);},
  };
  return {locals,cmd,quit,labels,events,trapAddress,io,promptIO,prompt:()=>promptStatements(f.high,f.low,promptIO),run:(a=cmd)=>getCommandStatements(a,f.high,f.low,locals,f.endgame.total,quit,io)};
}
