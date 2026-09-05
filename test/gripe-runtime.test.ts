import test from 'node:test';
import assert from 'node:assert/strict';
import { AddressSpace,CommonBlock } from '../src/compat/memory.ts';
import { FileBlock } from '../src/compat/files.ts';
import { LockBlock } from '../src/compat/unlock.ts';
import { MemoryCommandInput } from '../src/compat/input-memory.ts';
import { inputRuntimeLayout } from '../src/generated/input-runtime-layout.ts';
import { fileLayout } from '../src/generated/file-layout.ts';
import { lockLayout } from '../src/generated/lock-layout.ts';
import { queueLayout } from '../src/generated/queue-layout.ts';
import { gripeText } from '../src/generated/source-data.ts';
import { halfWords,leftHalf,rightHalf,packAscii,signed36 } from '../src/compat/word36.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { octalStackOutput,writeGripeDiagnostic } from '../src/compat/gripe-diagnostic.ts';
import type { OctalServices,DiagnosticServices } from '../src/compat/gripe-diagnostic.ts';
import { gripeDiagnostic } from '../src/game/gripe-diagnostic.ts';
import { gripe } from '../src/game/gripe.ts';
import type { GripeServices } from '../src/game/gripe.ts';
import { GripeOutput } from '../src/game/gripe-buffer.ts';
import type { GripeCore } from '../src/game/gripe-buffer.ts';
import { PackedBoard } from '../src/compat/board.ts';
import { messageText } from '../src/game/message-queue.ts';
import { interceptApr } from '../src/compat/apr.ts';
import type { AprServices } from '../src/compat/apr.ts';
function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
class Transfer extends Error{}
function fixture(){
  const m=new AddressSpace();m.map(0n,Array<bigint>(16).fill(0n));m.map(0o140n,Array<bigint>(128).fill(0n));
  m.map(BigInt(inputRuntimeLayout.address),Array<bigint>(inputRuntimeLayout.words).fill(0n));
  m.map(BigInt(fileLayout.address),Array<bigint>(fileLayout.words).fill(0n));m.map(BigInt(lockLayout.address),Array<bigint>(lockLayout.words).fill(0n));
  m.map(BigInt(queueLayout.address),Array<bigint>(queueLayout.words).fill(0n));m.map(30000n,[0o111n,0o222n,0o333n]);
  const low=new CommonBlock(m,'lowseg'),input=new MemoryCommandInput(low,packAscii),file=new FileBlock(m),locks=new LockBlock(m);
  const s={linbuf:input.lineAddress,stabuf:file.address('stabuf',0),loktab:locks.address('loktab',0),
    hitql:BigInt(queueLayout.address+queueLayout.fields.hitql.offset),pdl:30000n,header:31000n,pdlLabel:31001n,hitLabel:31002n,lockLabel:31003n};
  const labels=new Map([[s.header,gripeText[4].text],[s.pdlLabel,gripeText[5].text],[s.hitLabel,gripeText[6].text],[s.lockLabel,gripeText[7].text]]);
  const out=new TerminalOutput(),stack:bigint[]=[],pushes:bigint[]=[];
  // Explicit argument-stack and output fixture. No production stack/monitor
  // or OSTR pointer implementation is implied by the literal-address map.
  const octio:OctalServices<string>={*pushData(word){pushes.push(word);stack.push(word);},*popData(){assert.ok(stack.length);return stack.pop()!;},*ochr(){out.character(m.read(0o11n));}};
  const io:DiagnosticServices<string>={*ochr(){yield*octio.ochr();},*ostr(){const text=labels.get(m.read(0o12n));assert.notEqual(text,undefined);out.out(text!);},
    *space(){out.spaces(1);},*crlf(){out.crlf();},*octal(){yield*octalStackOutput(m,octio);}};
  file.write('stabuf',30000n,17);
  return {m,low,input,file,locks,s,out,stack,pushes,octio,io,run:()=>writeGripeDiagnostic(m,s,io)};
}
for(const [word,width,text] of [[0o1234567n,6n,'234567'],[-1n,12n,'777777777777'],[-1n,13n,'0777777777777'],[0o123n,0n,'3'],[0o123n,-1n,'3']] as const)
test(`OCT.O word ${word} width ${width} preserves stack digit and SOJG behavior`,()=>{
  const f=fixture();f.m.write(5n,word);f.m.write(6n,width);done(octalStackOutput(f.m,f.octio));assert.equal(f.out.drain(),text);
  assert.equal(f.m.read(5n),word);assert.equal(f.m.read(6n),width<=0n?width-1n:0n);assert.equal(f.m.read(0o11n),-1n);assert.deepEqual(f.stack,[]);assert.equal(f.pushes[0],-1n);
});
test('OCT.O saves the sentinel before reading X1 and leaves the stack live while OCHR suspends',()=>{
  const f=fixture();f.m.write(5n,0n);f.m.write(6n,2n);
  f.octio.pushData=function*(word){f.stack.push(word);if(word===-1n)yield 'saved';};
  f.octio.ochr=function*(){f.out.character(f.m.read(0o11n));yield 'char';};
  const g=octalStackOutput(f.m,f.octio);assert.equal(g.next().value,'saved');f.m.write(5n,0o17n);
  assert.equal(g.next().value,'char');assert.equal(f.out.drain(),'1');assert.equal(f.m.read(6n),0n);assert.deepEqual(f.stack,[-1n,0o17n]);
  assert.equal(g.next().value,'char');assert.equal(f.out.drain(),'7');done(g);assert.deepEqual(f.stack,[]);
});
test('OCT.O stack/output failure leaves partial digits and unpopped words',()=>{
  const f=fixture();f.m.write(5n,0o123n);f.m.write(6n,3n);f.octio.ochr=function*(){f.out.character(f.m.read(0o11n));throw new Error('Output transfer');};
  assert.throws(()=>done(octalStackOutput(f.m,f.octio)),/Output transfer/);assert.equal(f.out.drain(),'1');assert.equal(f.stack.length,3);
});
test('raw GRIP.A emits source dump bytes and leaves source register counters after all tables',()=>{
  const f=fixture();f.input.block.write('linbuf',65n,0);f.input.block.write('linbuf',3n,1);
  const ins=(0o123n<<27n)|(0o14n<<23n)|(1n<<22n)|(5n<<18n)|0o654321n;
  f.file.write('stabuf',halfWords(0o123n,0o456n),0);f.file.write('stabuf',ins,1);f.file.write('stabuf',30001n,17);
  const expected=new TerminalOutput();gripeDiagnostic({linbuf:i=>f.input.block.read('linbuf',i),stabuf:i=>f.file.read('stabuf',i),
    pdlAddress:30000,pdl:i=>f.m.read(30000n+BigInt(i)),hitqlAddress:Number(f.s.hitql),hitql:i=>f.m.read(f.s.hitql+BigInt(i)),loktab:i=>f.locks.read('loktab',i)},expected);
  done(f.run());const text=f.out.drain();assert.equal(text,expected.drain());
  assert.ok(text.includes('A^C^@\r\n\r\n'));assert.ok(text.includes('123 14,@654321(05)\r\n000123\r\n'));
  assert.equal(f.m.read(7n),20n);assert.equal(f.m.read(6n),0n);assert.deepEqual(f.stack,[]);
});
test('GRIP.A rereads LINBUF after the caret output returns',()=>{
  const f=fixture();let stop=true;f.io.ochr=function*(){f.out.character(f.m.read(0o11n));if(stop){stop=false;yield 'caret';}};
  const g=f.run();assert.equal(g.next().value,'caret');f.input.block.write('linbuf',1n,0);f.input.block.write('linbuf',0n,1);done(g);
  assert.ok(f.out.drain().startsWith(gripeText[4].text+'^A^@\r\n'));
});
test('GRIP.A does not scan the eighty-first LINBUF word',()=>{
  const f=fixture();for(let i=0;i<80;i++)f.input.block.write('linbuf',65n,i);f.input.block.write('linbuf',66n,80);
  done(f.run());assert.ok(f.out.drain().startsWith(gripeText[4].text+'A'.repeat(80)+'\r\n'));
});
test('PDL address comparison wraps at eighteen bits and reads at least one word',()=>{
  const f=fixture();f.s.pdl=0o777777n;f.m.map(f.s.pdl,[0o777n]);f.file.write('stabuf',0n,17);
  const seen:bigint[]=[];const oct=f.io.octal;f.io.octal=function*(){if(f.m.read(0o12n)===f.s.pdlLabel&&f.m.read(6n)===12n)seen.push(f.m.read(5n));yield*oct();};
  done(f.run());assert.deepEqual(seen,[0o777n,0n]);
});
test('PDL loop rereads saved P after output and can stop after one word',()=>{
  const f=fixture();f.file.write('stabuf',30002n,17);const oct=f.io.octal;let seen=0;
  f.io.octal=function*(){if(f.m.read(0o12n)===f.s.pdlLabel&&f.m.read(6n)===12n){seen++;f.file.write('stabuf',0n,17);}yield*oct();};
  done(f.run());assert.equal(seen,1);
});
test('HITQL dump includes the header and first two HITQ payload words',()=>{
  const f=fixture();f.m.write(f.s.hitql-1n,11n);f.m.write(f.s.hitql+400n,22n);f.m.write(f.s.hitql+401n,33n);
  const seen:bigint[]=[];const oct=f.io.octal;f.io.octal=function*(){if(f.m.read(0o12n)===f.s.hitLabel&&f.m.read(6n)===12n)seen.push(f.m.read(5n));yield*oct();};
  done(f.run());assert.equal(seen.length,403);assert.equal(seen[0],11n);assert.deepEqual(seen.slice(-2),[22n,33n]);
});
test('later instruction fields read current STABUF after earlier octal output',()=>{
  const f=fixture();const oct=f.io.octal;let calls=0;f.io.octal=function*(){yield*oct();if(++calls===3)f.file.write('stabuf',(3n<<23n)|(1n<<22n)|12n,1);};
  done(f.run());assert.ok(f.out.drain().includes('000 03,@000014\r\n'));
});

function loggingFixture(){
  const f=fixture();f.m.map(40000n,Array<bigint>(10000).fill(0n));f.m.map(39000n,[0o123456n]);
  let jbff=40000,flff=0,disk:bigint[]=[];const events:string[]=[];
  const core:GripeCore={get jbff(){return jbff;},set jbff(v){jbff=v;},jbrel:49999,get flff(){return flff;},set flff(v){flff=v;},
    read:a=>f.m.read(BigInt(a)),write:(a,w)=>f.m.write(BigInt(a),w),core(){assert.fail('Unexpected allocation');},warn(){assert.fail('Unexpected warning');}};
  const out=new GripeOutput(core),board=new PackedBoard();
  const ctx={who:0,get addrck(){return f.low.read('addrck');},set addrck(v){f.low.write('addrck',v);},get ccflg(){return f.low.read('ccflg');},set ccflg(v){f.low.write('ccflg',v);},fileLength:0n,players:[]};
  const labels=new Map([[f.s.header,gripeText[4].text],[f.s.pdlLabel,gripeText[5].text],[f.s.hitLabel,gripeText[6].text],[f.s.lockLabel,gripeText[7].text]]);
  const octio={...f.octio,*ochr(){out.character(f.m.read(0o11n));}};
  const diagnostic:DiagnosticServices<string>={*ochr(){yield*octio.ochr();},*ostr(){out.out(labels.get(f.m.read(0o12n))!);},*space(){out.spaces(1);},*crlf(){out.crlf();},*octal(){yield*octalStackOutput(f.m,octio);}};
  const io:GripeServices<string>={outstr(){assert.fail();},osts(o){o.out('HEADER\r\n');},*inli(){assert.fail();},*shosta(){assert.fail();},
    *diagnostic(){yield 'diagnostic';yield*writeGripeDiagnostic(f.m,f.s,diagnostic);},
    *open(){events.push('open');yield 'open';return {opened:true};},*hiber(){assert.fail();},*input(){assert.fail();},useto(n){assert.equal(n,1);},
    *output(descriptor){const start=rightHalf(descriptor)+1n,count=-BigInt.asIntN(18,leftHalf(descriptor));disk=Array.from({length:Number(count)},(_,i)=>f.m.read(start+BigInt(i)));events.push('output');return true;},
    *close(){events.push('close');yield 'close';},
  };
  f.m.write(0o17n,30001n);f.locks.write('locked',123n);f.locks.write('ftlerr',999n);
  const apr:AprServices<string>={*blt(ac,end){let from=leftHalf(f.m.read(ac)),to=rightHalf(f.m.read(ac));while(to<=end)f.m.write(to++,f.m.read(from++));},
    *gripe(){yield*gripe(ctx,board,out,io);},*jump(address){assert.equal(address,999n);events.push('jump');throw new Transfer();},*outstrIndirect(){assert.fail();},*monit(){assert.fail();}};
  const symbols={emergencyPushdownInitial:signed36(halfWords(-40n,f.s.stabuf+127n)),dataStackInitial:31000n,normalPushdownInitial:32000n,fallbackArgument:0n};
  return {...f,ctx,core,out,events,diagnostic,io,apr,disk:()=>disk,runApr:()=>interceptApr(f.file,f.locks,ctx,{jbtpc:39000n},symbols,apr)};
}
test('APR capture composes through yielding GRIP.A/OCT.O, packed GRIPE file output and cleanup before fatal transfer',()=>{
  const f=loggingFixture();f.input.block.write('linbuf',65n,0);const g=f.runApr();assert.equal(g.next().value,'diagnostic');
  assert.equal(f.out.destination,'gripe');assert.equal(f.ctx.addrck,-1n);assert.deepEqual(f.events,[]);
  assert.equal(g.next().value,'open');const header=f.file.read('stabuf',0);assert.equal(header,halfWords(123n,39000n));
  assert.equal(g.next().value,'close');assert.ok(messageText(f.disk()).includes('**** Command line:\r\nA^@\r\n'));
  assert.equal(f.out.destination,'gripe');assert.equal(f.core.flff,40000);assert.throws(()=>done(g),Transfer);
  const log=messageText(f.disk());assert.ok(log.startsWith('HEADER\r\n**** Data out of bounds ****'));assert.ok(log.includes('114130  000000123456'));
  assert.ok(log.includes('*** LOKTAB:'));assert.ok(log.endsWith('----------\r\n'));assert.equal(f.out.destination,'tty');assert.equal(f.ctx.ccflg,0n);
  assert.deepEqual(f.events,['open','output','close','jump']);assert.deepEqual(f.stack,[]);
});
test('a diagnostic output transfer prevents GRIPE file open, cleanup and APR target transfer',()=>{
  const f=loggingFixture();f.diagnostic.ochr=function*(){throw new Error('Monitor transfer');};const g=f.runApr();g.next();
  assert.throws(()=>done(g),/Monitor transfer/);assert.deepEqual(f.events,[]);assert.equal(f.out.destination,'gripe');assert.equal(f.core.flff,0);
  assert.equal(f.m.read(0o17n),signed36(halfWords(-40n,f.s.stabuf+127n)));
});
