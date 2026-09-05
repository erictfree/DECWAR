import assert from 'node:assert/strict';
import { helpCommandRuntimeFixture } from './help-command-runtime.ts';
import { pregameInputStatements } from '../../src/game/pregame-input-statements.ts';
import type { PregameInputStatementServices,PregameInputMessage } from '../../src/game/pregame-input-statements.ts';
import { createDataImage,loadHighData,loadPregameData } from '../../src/game/data-initialization.ts';
import { rawEqual } from '../../src/compat/equal.ts';
import { packAscii } from '../../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
import { messages } from '../../src/runtime/variant-values.ts';
export function pregameInputRuntimeFixture(line='HELP'){
  const f=helpCommandRuntimeFixture('HELP');f.m.map(20300n,Array<bigint>(400).fill(0n));f.low.write('who',0n);f.input.pointer=-1n;
  const locals={i:20300n,precmd:20310n},cmd=20301n,symbols={header:20350n,pg:20360n,promptEnd:20361n,lines:20362n};
  const image=createDataImage(literal=>packAscii(literal.text)); // Explicit fixture compiler encoding.
  loadHighData(image,f.high);loadPregameData(image,f.m,locals.precmd);
  f.h.put(symbols.pg,'PG');f.h.put(symbols.promptEnd,'> ');f.m.write(cmd,77n);f.m.write(locals.i,88n);
  const labels={} as Record<PregameInputMessage,bigint>;
  for(const [i,name] of (['ambcom','unkcom','maicom','forhlp'] as const).entries()){labels[name]=20400n+BigInt(i*40);f.h.put(labels[name],messages[name].text);}
  const events:string[]=[],prepare=(args:bigint[])=>{loadArgumentBlock(f.m,symbols.header,args);selectArgumentBlock(f.r,symbols.header);};
  const numeric=f.weapon.io;
  const io:PregameInputStatementServices<string>={logical:numeric.logical,*or(...p){return yield*numeric.or(...p);},*assign(...a){yield*numeric.assign(...a);},
    *assignFalse(a){f.m.write(a,0n);},*bounds(...a){return yield*f.location.io.bounds(...a);},enterLoop:f.location.io.enterLoop,
    *crlf(){events.push('crlf');yield*f.rt.run('crlf');},*out2c(literal){events.push(`out2c:${literal}`);prepare([literal==='PG'?symbols.pg:symbols.promptEnd]);yield*f.rt.run('out2c');},
    *dmpbuf(){events.push('dmpbuf');yield*f.ini.io.dmpbuf();},
    *input(ms){events.push(`input:${ms}`);f.m.write(f.wait.argument,BigInt(ms));yield*f.wait.input();return f.r.f;},
    *gtkn(){events.push('gtkn');yield*f.tokens.run();},*monit(){events.push('monit');throw new Error('fixture MONIT transfer');},
    *equal(token,master){events.push(`equal:${master}`);prepare([token,master]);yield*rawEqual(f.r,f.rt.args,f.s.point7LeftHalf,f.eq);return f.r.f;},
    *out(name,lines){events.push(name);f.m.write(symbols.lines,BigInt(lines));prepare([labels[name],symbols.lines]);yield*f.rt.run('out');},
  };
  // Scheduled terminal availability and HIBER are explicit monitor fixtures.
  f.wait.io.skpinc=function*(){return f.editor.bytes.length>0;};f.editor.feed(line+'\n');
  return {...f,pregameInput:{locals,cmd,symbols,labels,events,io,run:(actual=cmd)=>pregameInputStatements(actual,f.high,f.low,locals,io)}};
}
export function drivePregame(f:ReturnType<typeof pregameInputRuntimeFixture>,g=f.pregameInput.run()){
  for(let i=0;i<100;i++){const step=g.next();if(step.done)return;assert.ok(typeof step.value==='string'&&step.value.startsWith('hiber:'),'unexpected wait '+step.value);}
  throw new Error('fixture exceeds scheduled waits');
}
