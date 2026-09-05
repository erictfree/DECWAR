import { currentVariant } from '../../src/runtime/variant-execution.ts';
import assert from 'node:assert/strict';
import type { checkRuntimeFixture } from './check-runtime.ts';
import type { bindWaitRuntime } from './wait-runtime.ts';
import { nextToken,skipTokenBlanks,addTokenNumber } from '../../src/compat/token-runtime.ts';
import type { TokenServices } from '../../src/compat/token-runtime.ts';
import { gtknRuntime } from '../../src/compat/gtkn-runtime.ts';
import type { GtknServices } from '../../src/compat/gtkn-runtime.ts';
import { characterBits } from '../../src/runtime/variant-values.ts';
import { inputRuntime } from '../../src/compat/input-runtime.ts';
import { add36,multiply36,signed36,halfWords,leftHalf,rightHalf,unsigned36,packAscii } from '../../src/compat/word36.ts';
import { orderedRational as real } from '../support/rational-real.ts';
type Host=Pick<ReturnType<typeof checkRuntimeFixture>,'m'|'r'|'rt'|'low'|'input'|'s'|'h'|'rawPower'>&{wait:ReturnType<typeof bindWaitRuntime>};
export function bindTokenRuntime(f:Host){
  f.m.map(16500n,Array<bigint>(1000).fill(0n));const events:string[]=[];
  const state={get bufptr(){return f.wait.state.bufptr;},set bufptr(v:bigint){f.wait.state.bufptr=v;},
    get hungup(){return f.wait.state.hungup;},get locked(){return f.wait.state.locked;},
    get svlock(){return f.wait.state.svlock;},set svlock(v:bigint){f.wait.state.svlock=v;},
    get lkfail(){return f.wait.state.lkfail;},
    get ccflgDot(){return f.input.ccflgDot;},set ccflgDot(v:bigint){f.input.ccflgDot=v;}};
  const symbols={tknlst:f.low.address('tknlst',1),typlst:f.low.address('typlst',1),vallst:f.low.address('vallst',1),ptrlst:f.low.address('ptrlst',1),ntok:f.low.address('ntok'),linbuf:f.input.lineAddress,
    cbits:16600n,scale:inputRuntime(f.input).block.address('scale'),point7LeftHalf:f.s.point7LeftHalf,tenLeftHalf:32n,quitWord:16500n,overflow:16510n};
  // A synthetic 10.0 word only for opt-in rational fixtures; not a PDP-10 encoding.
  f.m.write(symbols.quitWord,packAscii('QUIT'));f.h.put(symbols.overflow,'Too many words -- line ignored'+currentVariant().definition.ascilSuffix);
  characterBits.entries.forEach((v,i)=>f.m.write(symbols.cbits+BigInt(i),BigInt(v.value)));
  const io:TokenServices<string>={
    *pushData(w){yield*f.rt.stack.pushData(w);},*popData(){return yield*f.rt.stack.popData();},
    *readCharacter(){return f.m.read(rightHalf(state.bufptr));},
    *idpb(){let word=unsigned36(f.r.p1),pos=Number((word>>30n)&63n),a=rightHalf(word);assert.equal((word>>24n)&63n,7n);
      if(pos<7){pos=36;a=rightHalf(a+1n);}pos-=7;f.r.p1=signed36((word&~((63n<<30n)|0o777777n))|(BigInt(pos)<<30n)|a);
      const mask=127n<<BigInt(pos);f.m.write(a,(f.m.read(a)&~mask)|((f.r.c&127n)<<BigInt(pos)));events.push(`byte:${a}:${f.r.c&127n}`);},
    *imuli(){f.r.x2=multiply36(f.r.x2,10n);},*addi(n){f.r.x2=add36(f.r.x2,n);},*movn(){events.push('movn');f.r.x2=signed36(-f.r.x2);},
    *fltr(){throw new Error('FLTR requires CPU numeric binding');},*fdv(){throw new Error('FDV requires CPU numeric binding');},*fad(){throw new Error('FAD requires CPU numeric binding');},*fmpri(){throw new Error('FMPRI requires CPU numeric binding');},
  };
  const gtknIO:GtknServices<string>={
    *pushData(w){yield*io.pushData(w);},*popData(){return yield*io.popData();},
    *unlo(){yield*f.wait.io.unlo();},*lock(){yield*f.wait.io.lock();},*lockJump(b){return yield*f.wait.io.lockJump(b);},
    *ocrl(){events.push('ocrl');yield*f.rt.run('ocrl.');},
    *inli(){events.push('inli');yield 'input';}, // Caller installs source words while suspended; full INLI can replace this service.
    *nxtt(){events.push('nxtt');yield*nextToken(f.m,state,f.r,symbols,io);},
    *ostr(){events.push('overflow');yield*f.rt.run('ostr.');},
    *aobjn(){f.r.x1=add36(f.r.x1,0o1000001n);return f.r.x1<0n;}, // Explicit ordinary AOBJN fixture.
  };
  const floats=()=>{
    f.rawPower.values.set(signed36(halfWords(symbols.tenLeftHalf,0n)),real.literal('10'));
    io.fltr=function*(r){events.push('fltr:'+r);f.r[r]=f.rawPower.encode(real.fromInteger(f.r[r]));};
    io.fdv=function*(){events.push('fdv');f.r.t1=f.rawPower.encode(real.divide(f.rawPower.decode(f.r.t1),f.rawPower.decode(f.r.t2)));};
    io.fad=function*(){events.push('fad');f.r.x2=f.rawPower.encode(real.add(f.rawPower.decode(f.r.x2),f.rawPower.decode(f.r.t1)));};
    io.fmpri=function*(){events.push('fmpri');f.r.t2=f.rawPower.encode(real.multiply(f.rawPower.decode(f.r.t2),real.literal('10')));};
  };
  return {symbols,state,io,gtknIO,events,floats,
    run:()=>gtknRuntime(f.m,state,f.r,symbols,gtknIO),next:()=>nextToken(f.m,state,f.r,symbols,io),
    blanks:()=>skipTokenBlanks(f.m,state,f.r,symbols,io),number:()=>addTokenNumber(f.m,f.r,symbols,io)};
}
