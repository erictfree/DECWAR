import { helpListRuntimeFixture } from './help-list-runtime.ts';
import { helpCommandRuntime } from '../../src/game/help-command-runtime.ts';
import type { HelpCommandServices } from '../../src/game/help-command-runtime.ts';
import { eraseTextShip,restoreTextShip } from '../../src/compat/gripe.ts';
import { commands,helpText,constants as K } from '../../src/generated/source-data.ts';
import { add36 } from '../../src/compat/word36.ts';
import { sourceFile } from '../../tools/source.ts';
export function helpCommandRuntimeFixture(line='HELP ENERGY',text='\n.ENERGY\r\nBody\n.NEXT'){
  const f=helpListRuntimeFixture(commands.map(c=>c.words.join('')),'',text);f.m.map(20100n,Array<bigint>(200).fill(0n));
  const symbols={...f.list.summarySymbols,who:f.low.address('who'),condition:f.high.address('shpcon',1,K.KSPCON),red:BigInt(K.RED),ccflg:f.low.address('ccflg'),pasflg:f.low.address('pasflg'),types:f.low.address('typlst',1),tokens:f.low.address('tknlst',1),star:20100n,redWarning:20110n,unknown:f.list.symbols.unknown};
  f.h.put(symbols.star,helpText[1].text);f.h.put(symbols.redWarning,helpText[0].text);f.parse(line);f.ship.condition=K.GREEN;
  // Each successful synthetic FILOP starts the selected fixture file at byte zero.
  const filop=f.news.openIO.filop;f.news.openIO.filop=function*(){const success=yield*filop();if(success){f.ini.load(text.slice(0,200));f.ini.refills.length=0;for(let i=200;i<text.length;i+=200)f.ini.refills.push({text:text.slice(i,i+200)});f.ini.refills.push({eof:true});}return success;};
  const shipSymbols={shpcon:f.high.address('shpcon',1,1),alive:f.high.address('alive',1)},state={get who(){return f.low.read('who');}};
  const events:string[]=[],io:HelpCommandServices<string>={
    *outstr(a){events.push('red-warning');yield*f.editor.io.outstr(a);},
    *afterAlertCheck(){events.push('alert-return');}, // Explicit literal-target fixture policy.
    *eshp(){events.push('eshp');yield*eraseTextShip(f.file,state,f.r,shipSymbols,()=>f.rawBoard.internal('sdsp'));},
    *pshp(){events.push('pshp');yield*restoreTextShip(f.file,state,f.r,shipSymbols,()=>f.rawBoard.internal('sdsp'));},
    *addiX3(){f.r.x3=add36(f.r.x3,1n);},
    *equal(){events.push('equal');yield*f.news.io.equal();},*summary(entry){events.push(entry);yield*f.list.summary(entry);},
    *search(){events.push('slst');return yield*f.list.search();},*show(){events.push(`shlp:${f.r.p1}`);yield*f.help.run();},
  };
  return {...f,command:{symbols,events,io,run:()=>helpCommandRuntime(f.m,f.r,symbols,io)}};
}
export const sourceHelpCommandFixture=(line:string)=>helpCommandRuntimeFixture(line,sourceFile('DECWAR.HLP'));
