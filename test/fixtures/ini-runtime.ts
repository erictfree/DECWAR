import assert from 'node:assert/strict';
import type { checkRuntimeFixture } from './check-runtime.ts';
import type { bindEditorRuntime } from './editor-runtime.ts';
import { bufferedCharacter,iniCharacter,terminalControl } from '../../src/compat/character-input-runtime.ts';
import type { RawBufferedServices,RawIniServices,RawTerminalControl } from '../../src/compat/character-input-runtime.ts';
import { setInput } from '../../src/compat/ichr.ts';
import { closeFile } from '../../src/compat/files.ts';
import type { CloseServices } from '../../src/compat/files.ts';
import { halfWords,rightHalf,signed36,unsigned36,packAscii } from '../../src/compat/word36.ts';
type Host=Pick<ReturnType<typeof checkRuntimeFixture>,'m'|'r'|'rt'|'low'|'file'|'job'>&{editor:ReturnType<typeof bindEditorRuntime>};
export function bindIniRuntime(f:Host){
  f.m.map(18000n,Array<bigint>(1000).fill(0n));const block=f.editor.runtime.block,state=f.editor.runtime.state;
  const symbols={buffer:18000n,data:18100n,ttyFile:18200n,iniFile:18220n,iniTarget:18280n,bufferedTarget:18281n};
  const machine={bufferCountOffset:2n,bufferPointerOffset:1n,inInstructionLeftHalf:0o123456n}; // Synthetic monitor constants.
  f.m.write(symbols.ttyFile,f.editor.terminalTarget);f.m.write(symbols.ttyFile+5n,18010n);
  f.m.write(symbols.iniFile,symbols.iniTarget);f.m.write(symbols.iniFile+5n,symbols.buffer);f.m.write(symbols.iniFile+2n,halfWords(3n,0n));
  const events:string[]=[],refills:({text:string}|{eof:true})[]=[];
  const load=(text:string)=>{assert.ok(text.length<=200);for(let i=0;i<Math.ceil(text.length/5);i++)f.m.write(symbols.data+BigInt(i),packAscii(text.slice(i*5,i*5+5)));
    f.m.write(symbols.buffer+1n,signed36(halfWords(0o440700n,symbols.data)));f.m.write(symbols.buffer+2n,BigInt(text.length));};
  const bufferedIO:RawBufferedServices<string>={
    *indirectAddress(a){events.push(`address:${a}`);return rightHalf(f.m.read(a));},
    *ildb(a){const word=unsigned36(f.m.read(a));let pos=Number((word>>30n)&63n),address=rightHalf(word);assert.equal((word>>24n)&63n,7n);
      if(pos<7){pos=36;address=rightHalf(address+1n);}pos-=7;f.m.write(a,signed36((word&~((63n<<30n)|0o777777n))|(BigInt(pos)<<30n)|address));f.r.c=(unsigned36(f.m.read(address))>>BigInt(pos))&127n;events.push(`byte:${f.r.c}`);},
    *executeInput(instruction){events.push(`in:${instruction}`);assert.ok(refills.length,'unscheduled IN');const refill=refills.shift()!;if('eof' in refill)return true;load(refill.text);return false;},
  };
  const fileState={get jbff(){return f.job.jbff;},set jbff(v:bigint){f.job.jbff=v;},get jbrel(){return f.job.jbrel;},set jbrel(v:bigint){f.job.jbrel=v;},get hungup(){return state.hungup;}};
  const controlIO:RawTerminalControl<string>={*output(){events.push('output');yield*f.editor.io.output();},*skpinl(){events.push('skpinl');}};
  const closeIO:CloseServices<string>={closeInstructionLeftHalf:0o654321n,*executeClose(){events.push('close');},*core(value){events.push(`core:${value}`);f.job.jbrel=value;return true;},*outputTTY(){yield*controlIO.output();},*outstr(t){events.push(t);}};
  const io:RawIniServices<string>={
    *pushData(w){events.push(`save:${w}`);yield*f.rt.stack.pushData(w);},*popData(){events.push('restore');return yield*f.rt.stack.popData();},
    *buffered(){yield*bufferedCharacter(block,f.r,bufferedIO);},*ochr(){events.push(`echo:${f.r.c}`);yield*f.editor.io.ochr();},
    *close(){yield*closeFile(f.file,fileState,f.r,closeIO);},
    *ttyon(){events.push('ttyon');yield*terminalControl('ttyon',state,controlIO);},*dmpbuf(){events.push('dmpbuf');yield*terminalControl('dmpbuf',state,controlIO);},
    *setInput(){events.push('seti');setInput(block,f.r,machine);},*dispatch(){events.push('dispatch');yield*f.editor.io.ichr();},
  };
  const transfer=f.editor.dispatchIO.transfer;
  f.editor.dispatchIO.transfer=function*(a){if(a===symbols.iniTarget)yield*iniCharacter(state,f.r,symbols.ttyFile,io);else if(a===symbols.bufferedTarget)yield*bufferedCharacter(block,f.r,bufferedIO);else yield*transfer(a);};
  const install=()=>{f.r.x1=symbols.iniFile;setInput(block,f.r,machine);state.iniflg=-1n;};
  return {symbols,machine,events,refills,bufferedIO,closeIO,controlIO,io,state,block,load,install,
    run:()=>iniCharacter(state,f.r,symbols.ttyFile,io),buffered:()=>bufferedCharacter(block,f.r,bufferedIO),control:(entry:'ttyon'|'dmpbuf')=>terminalControl(entry,state,controlIO)};
}
