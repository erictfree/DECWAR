import { moveRuntimeFixture } from './move-runtime.ts';
import { newsRuntime } from '../../src/game/news-runtime.ts';
import type { NewsServices } from '../../src/game/news-runtime.ts';
import { newsText } from '../../src/generated/source-data.ts';
import { rawEqualStrings } from '../../src/compat/equal.ts';
import { openFile } from '../../src/compat/files.ts';
import type { OpenServices } from '../../src/compat/files.ts';
import { halfWords,leftHalf,rightHalf,signed36 } from '../../src/compat/word36.ts';
export function newsRuntimeFixture(text='Hello\r\n'){
  const f=moveRuntimeFixture('NEWS');f.m.map(19000n,Array<bigint>(300).fill(0n));
  const state=f.ini.state,symbols={jbren:19200n,ccflg:f.low.address('ccflg'),hungup:f.low.address('hungup'),who:f.low.address('who'),alive:f.high.address('alive',1),active:f.high.address('active',1),nwsfil:19000n,prompt:19030n,yes:19050n,warning:19060n,token:f.low.address('tknlst',1)};
  f.h.put(symbols.prompt,newsText[1].text);f.h.put(symbols.yes,newsText[2].text);f.h.put(symbols.warning,newsText[0].text);
  // Explicit short FILOP descriptor and relocation/monitor fixture constants.
  for(const [i,w] of [f.ini.symbols.bufferedTarget,7000n,halfWords(4n,0n),0n,0n,f.ini.symbols.buffer,0n,0n].entries())f.m.write(symbols.nwsfil+BigInt(i),w);
  f.ini.block.write('ibflb',f.ini.symbols.ttyFile);f.input.pointer=-1n;f.ini.load(text);f.ini.refills.push({eof:true});
  const fileState={get jbff(){return f.job.jbff;},set jbff(v:bigint){f.job.jbff=v;},get jbrel(){return f.job.jbrel;},set jbrel(v:bigint){f.job.jbrel=v;},get hungup(){return state.hungup;}};
  const events:string[]=[];
  const openIO:OpenServices<string>={lookupOffset:1n,
    blt(end){let from=leftHalf(f.r.t1),to=rightHalf(f.r.t1);while(to<=end)f.m.write(to++,f.m.read(from++));f.r.t1=signed36(halfWords(from,to));},
    *getppn(){throw new Error('unscheduled GETPPN');},*filop(){events.push('filop');return true;},successReturn(){events.push('open-skip');},
    *core(v){events.push(`core:${v}`);f.job.jbrel=v;return true;},
    *outputTTY(){yield*f.ini.controlIO.output();},*outstr(t){events.push(t);},
  };
  const io:NewsServices<string>={
    *pushData(w){events.push(`save:${w}`);yield*f.rt.stack.pushData(w);},*popData(){events.push('restore');return yield*f.rt.stack.popData();},
    *open(){events.push('open');return yield*openFile(f.file,fileState,f.r,openIO);},
    *close(){events.push('close');yield*f.ini.io.close();},*setInput(){events.push(`seti:${rightHalf(f.r.x1)}`);yield*f.ini.io.setInput();},
    *ichr(){events.push('ichr');yield*f.editor.io.ichr();},*ochr(){events.push(`ochr:${f.r.c}`);yield*f.editor.io.ochr();},
    *ttyon(){events.push('ttyon');yield*f.ini.io.ttyon();},*ostr(){events.push('ostr');yield*f.rt.run('ostr.');},
    *gtkn(){events.push('gtkn');yield*f.tokens.run();},*equal(){events.push('equal');yield*rawEqualStrings(f.r,f.s.point7LeftHalf,f.eq);},
    *output(){events.push('output');yield*f.ini.controlIO.output();},*outstr(a){events.push('warning');yield*f.editor.io.outstr(a);},
  };
  return {...f,news:{symbols,events,io,openIO,run:()=>newsRuntime(f.m,f.r,symbols,io)}};
}
