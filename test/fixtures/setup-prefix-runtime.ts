import type { pregameRuntimeFixture } from './pregame-runtime.ts';
import type { bindSetupAdmissionRuntime } from './setup-admission-runtime.ts';
import type { bindPlaceRuntime } from './place-runtime.ts';
import { setupPrefixStatements } from '../../src/game/setup-prefix-statements.ts';
import type { SetupPrefixServices,SetupPrefixLabel } from '../../src/game/setup-prefix-statements.ts';
import { messages } from '../../src/runtime/variant-values.ts';
import { add36,multiply36,MIN_INTEGER } from '../../src/compat/word36.ts';
import { setControlTrap } from '../../src/compat/interrupt.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
export function bindSetupPrefixRuntime(f:ReturnType<typeof pregameRuntimeFixture>,admission:ReturnType<typeof bindSetupAdmissionRuntime>,placement:ReturnType<typeof bindPlaceRuntime>){
  f.m.map(70000n,Array<bigint>(1000).fill(77n));const locals={...admission.locals,j:70000n,nstar:70001n,nhole:70002n,one:70003n,dm1:70004n,dm2:70005n},s={header:70020n,count:70030n,zero:70031n,object:70032n,TOURNAMENT:70040n,REGULAR:70045n,YES:70050n,NO:70055n};f.m.write(locals.one,1n);
  const labels={} as Record<SetupPrefixLabel,bigint>;(['setu01','setu02','setu03','setu04','setu05','setu06','setu07','nogal1'] as const).forEach((key,i)=>{labels[key]=70100n+BigInt(i*30);f.h.put(labels[key],messages[key].text);});for(const key of ['TOURNAMENT','REGULAR','YES','NO'] as const)f.h.put(s[key],key);
  const events:string[]=[],policy:{missingTrap?:bigint;regular?:'true-first';start?:()=>Generator<string,void,void>}={},prepare=(a:bigint[])=>{loadArgumentBlock(f.m,s.header,a);selectArgumentBlock(f.r,s.header);},numeric=f.weapon.io;
  const int=(n:bigint)=>({type:'integer' as const,evaluate:function*(){return n;}}),real=(text:string)=>({type:'real' as const,evaluate:function*(){return numeric.realLiteral(text);}}),ran={type:'real' as const,evaluate:()=>numeric.ran(0)};
  const io:SetupPrefixServices<string>={logical:numeric.logical,trueWord:()=>-1n,or:numeric.or,and:numeric.and,
    *frcchk(){events.push('frcchk');f.m.write(f.getHit.queues.address('jsqtim'),0n);}, // WARMAC:3671-3677, CHKSEQ returns immediately.
    crlf:admission.io.crlf,jobsta:admission.io.jobsta,
    *out(key,n){events.push(key);f.m.write(s.count,BigInt(n));prepare([labels[key],s.count]);yield*f.rt.run('out');},
    *kilhgh(){events.push('kilhgh');yield*f.endgame.io.kilhgh();},*start(){events.push('start');if(!policy.start)throw new Error('SETUP requires START monitor binding');yield*policy.start();},*exit(){throw new Error('SETUP EXIT transfer');},
    *cctrap(handler){events.push('cctrap:'+handler);if(handler)yield*admission.io.cctrap(handler);else{if(policy.missingTrap===undefined)throw new Error('SETUP requires zero-argument CCTRAP binding');setControlTrap(f.file,f.lockState,()=>policy.missingTrap!);}},
    *lock(){events.push('lock');yield*f.io.lock(f.high.address('frelok'));},*cancel(){yield*admission.io.cancel('cc1');},daytim:admission.io.daytim,
    *setran(seed){events.push('setran:'+seed);yield*f.tell.random.setran(seed);},
    *clear(first,value,count){events.push('clear:'+first+':'+count);f.m.write(s.zero,value);f.m.write(s.count,count);yield*f.points.block.run('blkset',[first,s.zero,s.count]);},
    *queue(entry){events.push(entry);yield*f.getHit.initialize.run(entry);},gtkn:admission.io.gtkn,
    *equal(actual,key){return yield*f.pregameInput.io.equal(actual,s[key]);},
    *regularBranch(test){if(!policy.regular)throw new Error('SETUP requires two-label REGULAR compiler policy');return numeric.logical(yield*test());},
    *iabs(word){if(word===MIN_INTEGER)throw new Error('SETUP IABS minimum requires overflow policy');return word<0n?-word:word;},
    *starCount(){events.push('starCount');const factor=yield*numeric.convert('integer','int',{type:'real',evaluate:()=>numeric.binary('mul',int(51n),ran)});return add36(multiply36(factor,5n),100n);},
    *holeCount(){events.push('holeCount');return yield*numeric.convert('integer','int',{type:'real',evaluate:()=>numeric.binary('add',{type:'real',evaluate:()=>numeric.binary('mul',real('41.0'),ran)},int(10n))});},
    *place(code,count,v,h){f.m.write(s.object,code());events.push('place:'+f.m.read(s.object));yield*placement.run({object:s.object,n:count,v,h});},*admit(){events.push('admit');yield*admission.run();},
  };
  return {locals,s,labels,events,policy,io,run:()=>setupPrefixStatements(f.high,f.low,locals,io)};
}
