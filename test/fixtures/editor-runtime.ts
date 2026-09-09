import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import { currentVariant } from '../../src/runtime/variant-execution.ts';
import assert from 'node:assert/strict';
import type { checkRuntimeFixture } from './check-runtime.ts';
import type { bindTokenRuntime } from './token-runtime.ts';
import { inputRuntime } from '../../src/compat/input-runtime.ts';
import { editInput,nextEditorCharacter,redisplayEditor,echoControl,austinEchoControl } from '../../src/compat/inli-runtime.ts';
import type { EditorState,EditorServices } from '../../src/compat/inli-runtime.ts';
import { terminalCharacter,dispatchInput } from '../../src/compat/character-input-runtime.ts';
import type { RawTerminalServices } from '../../src/compat/character-input-runtime.ts';
import { add36,rightHalf,signed36,unpackAscii } from '../../src/compat/word36.ts';
import { inputLayout } from '../../src/runtime/variant-values.ts';
type Host=Pick<ReturnType<typeof checkRuntimeFixture>,'m'|'r'|'rt'|'low'|'input'|'h'|'cpu'>&{tokens:ReturnType<typeof bindTokenRuntime>};
export function bindEditorRuntime(f:Host){
  f.m.map(17500n,Array<bigint>(500).fill(0n));const runtime=inputRuntime(f.input),base=runtime.state;
  const state:EditorState={
    get hungup(){return base.hungup;},set hungup(v){base.hungup=v;},get echflg(){return base.echflg;},set echflg(v){base.echflg=v;},
    get iniflg(){return base.iniflg;},set iniflg(v){base.iniflg=v;},get blank(){return base.blank;},set blank(v){base.blank=v;},
    get bufptr(){return f.input.pointer;},set bufptr(v){f.input.pointer=v;},
    get chrcnt(){return f.input.block.read('chrcnt');},set chrcnt(v){f.input.block.write('chrcnt',v);},
    get rptflg(){return f.low.read('rptflg');},set rptflg(v){f.low.write('rptflg',v);},
  };
  const symbols={cbits:f.tokens.symbols.cbits,linbuf:f.input.lineAddress,maxcnt:BigInt(inputLayout.maximum),newline:17500n,caret:17502n};
  f.h.put(symbols.newline,'\r\n');f.h.put(symbols.caret,'^');
  const events:string[]=diagnosticRecords(),bytes:bigint[]=[];
  const terminalIO:RawTerminalServices<string>={
    *inchwl(){events.push('inchwl');if(!bytes.length){yield 'input';if(!bytes.length&&(base.hungup!==0n||base.ccflg!==0n)){f.r.c=0n;return;}}assert.ok(bytes.length,'unscheduled monitor input');f.r.c=bytes.shift()!;},
    *clrbfi(){events.push('clrbfi');bytes.length=0;},
  };
  const terminalTarget=17600n;runtime.block.write('ic',terminalTarget); // Explicit synthetic dispatch address.
  const dispatchIO={*indirectAddress(a:bigint):Generator<string,bigint,void>{return rightHalf(f.m.read(a));},
    *transfer(a:bigint):Generator<string,void,void>{assert.equal(a,terminalTarget,'fixture requires input target binding');yield*terminalCharacter(base,f.r,terminalIO);}};
  const io:EditorServices<string>={
    *ichr(){yield*dispatchInput(runtime.block,dispatchIO);},
    *output(){events.push('output');},
    *ochr(){events.push(`ochr:${f.r.c}`);yield*f.rt.run('ochr.');},
    *outstr(address){events.push(`outstr:${address}`);for(let a=address;;a++){for(const c of unpackAscii(f.m.read(a))){if(c==='\0')return;yield*f.cpu.outchr(BigInt(c.charCodeAt(0)));}}},
    *outchr(address){const c=address==='c'?f.r.c:BigInt(unpackAscii(f.m.read(address)).charCodeAt(0));events.push(`outchr:${c}`);yield*f.cpu.outchr(c);},
    *echo(entry){events.push(entry);if(currentVariant().definition.id==='austin')yield*austinEchoControl(entry,state,{*openTTY(){return true;},*halt(){throw new Error('TTY open failed');}});else echoControl(entry);},
    *movnT1(w){f.r.t1=signed36(-w);},*addiC(n){f.r.c=add36(f.r.c,n);},
    *aobjp(){f.r.t1=add36(f.r.t1,0o1000001n);return f.r.t1>=0n;},
  };
  return {state,symbols,io,events,bytes,terminalIO,dispatchIO,runtime,terminalTarget,
    feed:(text:string)=>bytes.push(...[...text].map(c=>BigInt(c.charCodeAt(0)))),
    run:()=>editInput(f.m,state,f.r,symbols,io),next:()=>nextEditorCharacter(f.m,state,f.r,symbols,io),
    display:()=>redisplayEditor(f.m,state,f.r,symbols,io),character:()=>terminalCharacter(base,f.r,terminalIO)};
}
