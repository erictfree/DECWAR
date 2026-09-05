import { newsRuntimeFixture } from './news-runtime.ts';
import { helpFileRuntime } from '../../src/game/help-runtime.ts';
import type { HelpFileServices } from '../../src/game/help-runtime.ts';
import { helpText } from '../../src/generated/source-data.ts';
export function helpRuntimeFixture(text='\n.ENERGY\nBody\n.NEXT',keyword='Energy    '){
  const f=newsRuntimeFixture(text.slice(0,200));f.m.map(19300n,Array<bigint>(300).fill(0n));
  const symbols={...f.news.symbols,pasflg:f.low.address('pasflg'),hl1fil:19300n,hl2fil:19320n,keyword:19340n,warning:19360n,missing:19380n,point7LeftHalf:f.s.point7LeftHalf};
  for(const base of [symbols.hl1fil,symbols.hl2fil])for(let i=0n;i<8n;i++)f.m.write(base+i,f.m.read(f.news.symbols.nwsfil+i));
  f.h.put(symbols.keyword,keyword);f.h.put(symbols.warning,helpText[6].text);f.h.put(symbols.missing,helpText[7].text);f.r.p1=symbols.keyword;
  f.ini.refills.length=0;for(let i=200;i<text.length;i+=200)f.ini.refills.push({text:text.slice(i,i+200)});f.ini.refills.push({eof:true});
  const events:string[]=[],io:HelpFileServices<string>={
    *pushData(w){events.push(`save:${w}`);yield*f.rt.stack.pushData(w);},*popData(){events.push('restore');return yield*f.rt.stack.popData();},
    *open(){events.push(`open:${f.r.x1}`);return yield*f.news.io.open();},*close(){events.push('close');yield*f.news.io.close();},*setInput(){events.push(`seti:${f.r.x1}`);yield*f.news.io.setInput();},
    *ichr(){yield*f.editor.io.ichr();events.push(`char:${f.r.c}`);},*ochr(){events.push(`ochr:${f.r.c}`);yield*f.editor.io.ochr();},
    *ocrl(){events.push('ocrl');yield*f.rt.run('ocrl.');},*ostr(){events.push('ostr');yield*f.rt.run('ostr.');},*ostb(){events.push('ostb');yield*f.rt.run('ostb.');},
    *ildbKeyword(){f.r.t1=yield*f.eq.ildb('p2');events.push(`key:${f.r.t1}`);},
    *output(){events.push('output');yield*f.ini.controlIO.output();},*outstr(a){events.push('warning');yield*f.editor.io.outstr(a);},
  };
  return {...f,help:{symbols,events,io,run:()=>helpFileRuntime(f.m,f.r,symbols,io)}};
}
