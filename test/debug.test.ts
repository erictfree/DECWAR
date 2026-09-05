import test from 'node:test';
import assert from 'node:assert/strict';
import { debug, debugNumber, timerSearch, timerIn, timerOut, Timers, LocalTimers, DebugRegisters } from '../src/game/debug.ts';
import type { DebugServices, TimerServices, OutsideTimerMemory } from '../src/game/debug.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { packAscii, MAX_INTEGER, MIN_INTEGER, signed36 } from '../src/compat/word36.ts';
import { debugMessages, sourceFile } from '../tools/source.ts';
import { debugText } from '../src/generated/source-data.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';
import { dispatchPregame } from '../src/game/pregame.ts';
import { romulanDriverFixture, done } from './support/romulan-driver-fixture.ts';

function fixture(outside?: OutsideTimerMemory) {
  const words=Array<bigint>(250).fill(0n), localWords=Array<bigint>(100).fill(0n);
  const shared=new Timers(words,outside), local=new LocalTimers(localWords), r=new DebugRegisters(), out=new TerminalOutput();
  const ctx={pasflg:-1n,hungup:0n}, output:string[]=[], chars:bigint[]=[], clocks:(bigint|null)[]=[], events:string[]=[];
  const io: DebugServices & TimerServices = {
    outstr(text) {output.push(text);}, outchr(word) {chars.push(word);output.push(String.fromCharCode(Number(word&127n)));},
    uct() {events.push('clock');assert.ok(clocks.length,'Unscheduled UCT');return clocks.shift()!;},
  };
  return {words,localWords,shared,local,r,out,ctx,output,chars,clocks,events,io,
    enter(name:string) {timerIn(()=>packAscii(name),shared,local,r,io);},
    leave(name:string) {timerOut(()=>packAscii(name),shared,local,r,io);},
    report() {debug(ctx,shared,r,out,io);return output.join('');},
  };
}

test('DEBUG extracts both original CRLF/tab literals and source positions', () => {
  assert.deepEqual(debugText,debugMessages()); assert.equal(debugText[0].text,'\r\nName\tCalls\tTotal\tHigh\r\n\r\n'); assert.equal(debugText[1].text,'\r\n');
  for(const entry of debugText) assert.match(sourceFile(entry.file).split('\n')[entry.line-1],/outstr/);
});

test('TIMERS and local timer windows retain physical column offsets and neighboring aliases', () => {
  const f=fixture(); f.shared.write('name',49n,packAscii('MOVE')); f.shared.write('count',49n,7n); f.shared.write('total',49n,8n); f.shared.write('high',49n,9n);
  assert.deepEqual([f.words[49],f.words[99],f.words[149],f.words[199]],[signed36(packAscii('MOVE')),7n,8n,9n]);
  f.shared.write('count',-1n,123n); assert.equal(f.shared.read('name',49n),123n);
  f.local.write('start',49n,999n); assert.equal(f.local.read('name',-1n),999n);
  f.local.write('name',0n,777n); assert.equal(f.local.read('start',50n),777n);
  assert.throws(()=>f.shared.read('name',-1n),/surrounding/); f.shared.write('high',50n,321n);assert.equal(f.words[200],321n);assert.throws(()=>f.shared.write('high',100n,0n),/surrounding/);
});

test('TIMIN and TIMOUT retain unsigned name bits but signed elapsed totals and call counts', () => {
  const f=fixture(); f.clocks.push(100n,110n,200n,204n); f.enter('MOVE'); f.leave('MOVE'); f.enter('MOVE'); f.leave('MOVE');
  assert.equal(f.shared.read('count',49n),2n); assert.equal(f.shared.read('total',49n),14n); assert.equal(f.shared.read('high',49n),10n);
  assert.equal(f.local.read('start',49n),200n); assert.equal(f.r.t1,4n); assert.equal(f.r.t2,49n);
});

test('TIMSRC only reads one argument word, so trailing characters beyond five do not distinguish timers', () => {
  const f=fixture(); let reads=0; timerSearch(()=>{reads++;return packAscii('ABCDE');},f.shared,f.r);
  timerSearch(()=>packAscii('ABCDE'),f.shared,f.r); assert.equal(reads,1); assert.equal(f.r.t2,49n); assert.equal(f.shared.read('name',48n),0n);
  timerSearch(()=>packAscii('ABCDE')|1n,f.shared,f.r); assert.equal(f.r.t2,48n); // Unused ASCII bit is significant for CAMN.
});

test('TIMSRC first vacancy resets only high; equal zero name returns before resetting anything', () => {
  const f=fixture(); f.shared.write('count',49n,10n); f.shared.write('total',49n,20n); f.shared.write('high',49n,30n);
  timerSearch(()=>0n,f.shared,f.r); assert.equal(f.shared.read('high',49n),30n);
  timerSearch(()=>packAscii('A'),f.shared,f.r); assert.equal(f.shared.read('high',49n),0n);
  assert.equal(f.shared.read('count',49n),10n); assert.equal(f.shared.read('total',49n),20n);
});

test('TIMSRC stops at a gap without finding an existing duplicate below it', () => {
  const f=fixture(); f.shared.write('name',48n,packAscii('MOVE')); timerSearch(()=>packAscii('MOVE'),f.shared,f.r);
  assert.equal(f.r.t2,49n); assert.equal(f.shared.read('name',48n),signed36(packAscii('MOVE')));
});

test('TIMSRC full table overwrites slot zero with question marks and repeatedly resets only high', () => {
  const f=fixture(); for(let i=1n;i<=49n;i++) f.shared.write('name',i,i);
  f.shared.write('name',0n,packAscii('NEW')); f.shared.write('count',0n,9n); f.shared.write('total',0n,100n); f.shared.write('high',0n,77n);
  timerSearch(()=>packAscii('NEW'),f.shared,f.r); assert.equal(f.r.t2,0n); assert.equal(f.r.t1,packAscii('?????'));
  assert.equal(f.shared.read('name',0n),packAscii('?????')); assert.equal(f.shared.read('high',0n),0n);
  assert.equal(f.shared.read('count',0n),9n); assert.equal(f.shared.read('total',0n),100n);
});

test('TIMOUT missing local name still installs a new timer and clears high before skipping the clock', () => {
  const f=fixture(); f.shared.write('high',49n,77n); f.leave('NEW'); assert.equal(f.shared.read('name',49n),signed36(packAscii('NEW')));
  assert.equal(f.shared.read('high',49n),0n); assert.equal(f.shared.read('count',49n),0n); assert.deepEqual(f.events,[]);
});

test('TIMIN overwrites same-name nesting start; repeated TIMOUT never clears the local name', () => {
  const f=fixture(); f.clocks.push(10n,20n,25n,30n); f.enter('A'); f.enter('A'); f.leave('A'); f.leave('A');
  assert.equal(f.shared.read('count',49n),2n); assert.equal(f.shared.read('total',49n),15n); assert.equal(f.shared.read('high',49n),10n);
  assert.equal(f.local.read('name',49n),signed36(packAscii('A')));
});

test('TIMIN/TIMOUT failed CALLI uses zero and permits a negative elapsed total', () => {
  const f=fixture(); f.clocks.push(100n,null); f.enter('A'); f.leave('A');
  assert.equal(f.shared.read('total',49n),-100n); assert.equal(f.shared.read('high',49n),0n); assert.equal(f.shared.read('count',49n),1n);
  f.clocks.push(null,20n); f.enter('A'); f.leave('A'); assert.equal(f.shared.read('total',49n),-80n); assert.equal(f.shared.read('high',49n),20n);
});

test('TIMOUT preserves signed word overflow and compares high against the wrapped elapsed delta', () => {
  const f=fixture(); f.clocks.push(MAX_INTEGER,MIN_INTEGER); f.enter('A'); f.shared.write('count',49n,MAX_INTEGER); f.shared.write('total',49n,MAX_INTEGER);
  f.leave('A'); assert.equal(f.shared.read('count',49n),MIN_INTEGER); assert.equal(f.shared.read('total',49n),MIN_INTEGER); assert.equal(f.shared.read('high',49n),1n);
});

test('TIMOUT source name matching permits separate local timer blocks on the same supplied COMMON window', () => {
  const f=fixture(), other=new LocalTimers(Array<bigint>(100).fill(0n)); f.clocks.push(10n,20n,30n,40n); f.enter('A');
  timerIn(()=>packAscii('A'),f.shared,other,f.r,f.io); f.leave('A'); timerOut(()=>packAscii('A'),f.shared,other,f.r,f.io);
  assert.equal(f.shared.read('total',49n),40n); assert.equal(f.local.read('start',49n),10n); assert.equal(other.read('start',49n),20n);
});

test('TIMOUT slot-zero overflow ignores original name and merges elapsed times under the sentinel', () => {
  const f=fixture(); for(let i=1n;i<=49n;i++) f.shared.write('name',i,i); f.clocks.push(10n,30n,100n,103n);
  f.enter('A'); f.leave('B'); assert.equal(f.shared.read('high',0n),20n);
  f.enter('C'); f.leave('D'); assert.equal(f.shared.read('count',0n),2n); assert.equal(f.shared.read('total',0n),23n); assert.equal(f.shared.read('high',0n),3n);
});

test('TIMOUT increments count before a nonreturning clock and retains partial state', () => {
  const f=fixture(); f.clocks.push(100n); f.enter('A'); f.io.uct=()=>{throw new Error('fixture monitor trap');};
  assert.throws(()=>f.leave('A'),/monitor trap/); assert.equal(f.shared.read('count',49n),1n); assert.equal(f.shared.read('total',49n),0n);
});

test('DEBUG privilege is a sign test; rejected calls use OSTR and no direct monitor output', () => {
  for(const flag of [0n,1n,MAX_INTEGER]) {const f=fixture();f.ctx.pasflg=flag;
    assert.equal(f.report(),'');assert.equal(f.out.drain(),'Unknown command -- for help type HELP');}
  const f=fixture(); f.ctx.pasflg=-2n; assert.equal(f.report(),debugText[0].text);
});

test('DEBUG reports descending timers with source unit conversion, tabs and CRLF', () => {
  const f=fixture(); f.clocks.push(10n,20n,30n,35n); f.enter('MOVE');f.leave('MOVE');f.enter('TORP');f.leave('TORP');
  f.out.write('pending'); assert.equal(f.report(),'\r\nName\tCalls\tTotal\tHigh\r\n\r\nMOVE\t1\t3\t3\r\nTORP\t1\t1\t1\r\n');
  assert.equal(f.out.hcpos,7);assert.equal(f.out.drain(),'pending');assert.equal(f.r.x1,47n);
});

test('DEBUG signed multiply then HLRZS keeps low-word wrap before extracting the unsigned left half', () => {
  const f=fixture();f.shared.write('name',49n,packAscii('A'));f.shared.write('total',49n,-1n);f.shared.write('high',49n,1n<<30n);
  assert.equal(f.report(),debugText[0].text+'A\t0\t262143\t0\r\n');
});

test('DEBUG skips digits while hungup but its header, names, separators and newlines are unguarded', () => {
  const f=fixture();f.shared.write('name',49n,packAscii('ABCDE'));f.shared.write('count',49n,123n);f.ctx.hungup=-1n;
  assert.equal(f.report(),debugText[0].text+'ABCDE\t\t\t\r\n');assert.deepEqual(f.chars,[9n,9n,9n]);
});

test('DEBDEC emits zero and large values recursively, retaining the innermost remainder in T2', () => {
  const f=fixture();for(const n of [0n,123456789n,MAX_INTEGER]) {f.output.length=0;f.r.t1=n;debugNumber(10,f.ctx,f.r,f.io);assert.equal(f.output.join(''),String(n));}
  assert.equal(f.r.t1,55n);assert.equal(f.r.t2,3n);
});

test('DEBDEC/DEBOCT negative inputs retain left-half zero extension rather than adding a minus sign', () => {
  const f=fixture(); f.r.t1=-12n;debugNumber(10,f.ctx,f.r,f.io);assert.deepEqual(f.chars,[262191n,262190n]);assert.equal(f.output.join(''),'/.');
  f.output.length=0; f.chars.length=0;f.r.t1=-9n;debugNumber(8,f.ctx,f.r,f.io);assert.deepEqual(f.chars,[262191n,262191n]);assert.equal(f.output.join(''),'//');
});

test('DEBDEC rechecks HUNGUP for each digit after a direct output callback', () => {
  const f=fixture();f.r.t1=123n;const outchr=f.io.outchr;f.io.outchr=n=>{outchr(n);f.ctx.hungup=1n;};
  debugNumber(10,f.ctx,f.r,f.io);assert.equal(f.output.join(''),'1');assert.equal(f.r.t1,51n);
});

test('DEBUG ends on a gap and does not scan later names', () => {
  const f=fixture();f.shared.write('name',48n,packAscii('LATE'));assert.equal(f.report(),debugText[0].text);
});

test('DEBUG a full timer window reads negative subscripts via explicit surrounding memory', () => {
  const offsets:bigint[]=[];const f=fixture({read(offset){offsets.push(offset);return 0n;},write(){assert.fail();}});
  for(let i=0n;i<50n;i++) f.shared.write('name',i,packAscii('A'));f.report();assert.deepEqual(offsets,[-1n]);assert.equal(f.r.x1,-1n);
  const g=fixture();for(let i=0n;i<50n;i++)g.shared.write('name',i,packAscii('A'));assert.throws(()=>g.report(),/surrounding/);
});

test('DEBUG reads counts and totals live after name output instead of copying the table', () => {
  const f=fixture();f.shared.write('name',49n,packAscii('LIVE'));const print=f.io.outstr;
  f.io.outstr=text=>{print(text);if(text==='LIVE'){f.shared.write('count',49n,7n);f.shared.write('total',49n,100n);}};
  assert.equal(f.report(),debugText[0].text+'LIVE\t7\t32\t0\r\n');
});

test('ROMDRV column-D service composes real TIMIN/TIMOUT for driver and each defense interval', () => {
  const f=fixture(), game=romulanDriverFixture();game.draws.push('0','0');game.integers.push(2n);
  // Explicit fixture: column-D compiled, one ASCII word per literal; no production compiler default.
  game.io.debugLine=(op,name)=>{const entry=op==='timin'?timerIn:timerOut;entry(()=>packAscii(name.slice(0,5)),f.shared,f.local,f.r,f.io);};
  f.clocks.push(0n,10n,20n,23n,30n,36n,40n,49n);done(game.runDriver());
  assert.equal(f.report(),debugText[0].text+'ROMDR\t1\t3\t3\r\nBASPH\t1\t0\t0\r\nPLNAT\t1\t1\t1\r\nBASBL\t1\t2\t2\r\n');
  assert.equal(game.target.damage,14400n);assert.equal(f.clocks.length,0);
});

test('DEBUG composes both in-game slot 32 and pre-game slot 14 without advancing game time', () => {
  const f=fixture(), calls:string[]=[];
  const invoke=function* (call:{routine:string}) {calls.push(call.routine);assert.equal(call.routine,'debug');debug(f.ctx,f.shared,f.r,f.out,f.io);};
  done(dispatchCommand({who:1,player:-1n,ptime:88n,shared:{players:[]}},32,{
    invoke,*getcmd(){assert.fail();},*quit(){assert.fail();},*leave(){assert.fail();},*finishTurn(){assert.fail();},movementContinuation(){assert.fail();},
  }));
  const result=dispatchPregame({...f.ctx,ccflg:0n},14,f.out,{invoke,*monit(){assert.fail();},literal(){assert.fail();},logical:()=>assert.fail()});
  assert.deepEqual(result.next(),{value:'again',done:true});assert.deepEqual(calls,['debug','debug']);assert.equal(f.output.join(''),debugText[0].text.repeat(2));
});

test('TIMERS allocation and absolute preceding-word relation are supported by HIGH and the supplied link map', () => {
  assert.match(sourceFile('HIGH.FOR'),/common \/timers\/ timdum\(250\)/i);
  const map=sourceFile('DECWAR.MAP');assert.match(map,/TIMERS\s+405562\s+Common\s+length\s+250\./);
  assert.equal(0o400010+2922,0o405562); // The preceding word is the final HISEG cell in this map.
});

test('DEBUG underflow row reads count/total/high through the preceding physical timer arrays', () => {
  const offsets:bigint[]=[]; const f=fixture({read(offset){offsets.push(offset);return offset===-1n?packAscii('OLD'):0n;},write(){assert.fail();}});
  // Name word 65 is five ASCII positions ending in a space; the word is also
  // TIMCNT(-1), so the underflow row's decimal count is 65, not a separate cell.
  for(let i=0n;i<50n;i++) f.shared.write('name',i,65n);
  f.shared.write('count',49n,10n); f.shared.write('total',49n,20n);
  const report=f.report();assert.ok(report.endsWith('OLD\t65\t3\t6\r\n'));assert.deepEqual(offsets,[-1n,-1n,-2n]);
});

test('DEBOCT shares recursion and decimal-character addition but divides by eight', () => {
  const f=fixture();f.r.t1=0o12345670n;debugNumber(8,f.ctx,f.r,f.io);assert.equal(f.output.join(''),'12345670');assert.equal(f.r.t2,1n);
});

test('TIMIN local-name write survives a monitor failure that does not return', () => {
  const f=fixture();f.local.write('start',49n,123n);f.io.uct=()=>{throw new Error('fixture monitor exit');};
  assert.throws(()=>f.enter('A'),/monitor exit/);assert.equal(f.local.read('name',49n),signed36(packAscii('A')));assert.equal(f.local.read('start',49n),123n);
});
