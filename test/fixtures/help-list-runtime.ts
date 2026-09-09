import { diagnosticRecords } from '../../src/runtime/diagnostic-records.ts';
import { helpRuntimeFixture } from './help-runtime.ts';
import { searchHelpList,outputHelpList,helpSummary } from '../../src/game/help-list-runtime.ts';
import type { HelpListServices,OutputHelpListServices } from '../../src/game/help-list-runtime.ts';
import { helpText,extraHelpWords,constants as K } from '../../src/runtime/variant-values.ts';
import { add36,halfWords,rightHalf,signed36,packAscii } from '../../src/compat/word36.ts';
export function helpListRuntimeFixture(words:readonly string[]=['ALPHA','BETA'],keyword='B',text=''){
  const f=helpRuntimeFixture(text,keyword);f.m.map(19600n,Array<bigint>(500).fill(0n));
  const symbols={table:19600n,ambiguous:19800n,candidates:19810n,unknown:19820n,tmp:f.file.address('tmp',0)};
  for(const [i,w] of words.entries()){f.m.write(symbols.table+BigInt(i*2),packAscii(w.padEnd(10).slice(0,5)));f.m.write(symbols.table+BigInt(i*2+1),packAscii(w.padEnd(10).slice(5,10)));}
  f.h.put(symbols.ambiguous,helpText[8].text);f.h.put(symbols.candidates,helpText[9].text);f.h.put(symbols.unknown,helpText[2].text);
  f.r.x1=signed36(halfWords(-2n*BigInt(words.length),symbols.table));f.r.x2=0n;f.r.p1=f.help.symbols.keyword;
  const events:string[]=diagnosticRecords(),io:HelpListServices<string>={
    *pushData(w){events.push(`save:${w}`);yield*f.rt.stack.pushData(w);},*popData(){events.push('restore');return yield*f.rt.stack.popData();},
    *equal(){events.push(`equal:${f.r.p2}`);yield*f.news.io.equal();},
    *output(entry){events.push(entry);yield*f.rt.run(entry);},
    *aobjpX1(){events.push('aobjp');f.r.x1=add36(f.r.x1,0o1000001n);return f.r.x1>=0n;},
    *successReturn(){events.push('success');}, // Explicit return-frame fixture.
  };
  const listIO:OutputHelpListServices<string>={
    pushData:io.pushData,popData:io.popData,aobjpX1:io.aobjpX1,
    *output(entry){yield*io.output(entry);},
    *dmove(){events.push('dmove');const a=rightHalf(f.r.x1);f.r.t1=f.m.read(a);f.r.t2=f.m.read(a+1n);},
    *dmovem(){events.push('dmovem');f.m.write(symbols.tmp,f.r.t1);f.m.write(symbols.tmp+1n,f.r.t2);},
    *clearTerminator(){events.push('clear');f.m.write(symbols.tmp+2n,0n);},
  };
  const summarySymbols={extraIntro:19900n,extraEnd:19940n,commandsTitle:19970n,
    extraPointer:signed36(halfWords(-2n*BigInt(K.KNXTR),19700n)),
    publicPointer:signed36(halfWords(-2n*BigInt(K.KNCMD-K.KSCMD),symbols.table)),allPointer:signed36(halfWords(-2n*BigInt(K.KNCMD),symbols.table))};
  for(const [i,pair] of extraHelpWords.entries())for(const [j,w] of pair.entries())f.m.write(19700n+BigInt(i*2+j),packAscii(w));
  f.h.put(summarySymbols.extraIntro,helpText[3].text);f.h.put(summarySymbols.extraEnd,helpText[4].text);f.h.put(summarySymbols.commandsTitle,helpText[5].text);
  const summaryIO={*output(entry:'ostr.'|'ocrl.'){yield*io.output(entry);},*list(){yield*outputHelpList(f.r,symbols.tmp,listIO);}};
  return {...f,list:{symbols,events,io,listIO,summarySymbols,summaryIO,search:()=>searchHelpList(f.r,symbols,io),output:()=>outputHelpList(f.r,symbols.tmp,listIO),
    summary:(entry:'hlpxtr'|'hlpall')=>helpSummary(entry,f.r,{get pasflg(){return f.low.read('pasflg');}},summarySymbols,summaryIO)}};
}
