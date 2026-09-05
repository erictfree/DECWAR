import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture } from './fixtures/pregame-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { constants as K,messages as M,ships } from '../src/generated/source-data.ts';
import { packAscii,MAX_INTEGER,MIN_INTEGER } from '../src/compat/word36.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';
function fixture(line='RADIO OFF',responses:string[]=[],format=0n){
  const f=pregameRuntimeFixture([]);for(const text of [line,...responses])f.editor.feed(text+'\n');finish(f.tokens.run());f.low.write('who',1n);f.low.write('oflg',format);f.low.write('blank',0n);f.low.write('hcpos',0n);f.low.write('gagmsg',0n);f.high.write('nomsg',0n);
  for(const s of ships){f.high.write('names',packAscii(s.name.toUpperCase().slice(0,5)),s.id,1);f.high.write('names',packAscii(s.name.toUpperCase().slice(5)),s.id,2);}
  const before=f.text().length;return {...f,r:f.radio,run:()=>finish(f.radio.run()),output:()=>f.text().slice(before)};
}
for(const [action,start,expected,message] of [['OFF',2n,3n,'radoff'],['ON',3n,2n,'radon0'],['O',3n,2n,'radon0']] as const)test(`Statement RADIO ${action} uses source matching order and exact output`,()=>{
  const f=fixture('RADIO '+action);f.high.write('nomsg',start);f.run();assert.equal(f.high.read('nomsg'),expected);assert.equal(f.output(),'\r\n'+M[message].text+'\r\n');assert.equal(f.m.read(f.r.locals.index),2n);
});
for(const format of [-1n,0n,1n])test(`Statement RADIO GAG W uses raw ODISP at verbosity ${format}`,()=>{
  const f=fixture('RADIO GAG W',[],format);f.run();assert.equal(f.low.read('gagmsg'),512n);assert.equal(f.high.read('nomsg'),0n);assert.equal(f.output(),'\r\n'+M.radgag.text+(format>0n?'Wolf':'W')+'\r\n');assert.equal(f.m.read(f.r.locals.i),10n);assert.equal(f.m.read(f.r.locals.iteam),2n);
});
test('Statement RADIO UNGAG clears the selected live bit mask and preserves other gags',()=>{
  const f=fixture('RADIO UNGAG N');f.low.write('gagmsg',7n);f.run();assert.equal(f.low.read('gagmsg'),5n);assert.equal(f.output(),'\r\n'+M.radung.text+'N\r\n');assert.equal(f.m.read(f.r.locals.gagtyp),1n);
});
test('Statement RADIO prompts for a missing action, then for the target using raw GTKN',()=>{
  const f=fixture('RADIO',['GAG','NIMITZ']);f.run();assert.equal(f.low.read('gagmsg'),2n);assert.ok(f.output().includes(M.radio0.text));assert.ok(f.output().includes(M.radio2.text));assert.ok(f.output().endsWith(M.radgag.text+'N\r\n'));assert.equal(f.m.read(f.r.locals.index),0n);assert.equal(f.r.events.filter(e=>e==='gtkn').length,2);
});
test('Statement RADIO unknown action repeats action input rather than reporting a ship error',()=>{
  const f=fixture('RADIO WRONG',['OFF']);f.run();assert.equal(f.high.read('nomsg'),1n);assert.ok(f.output().includes(M.radio0.text));assert.ok(!f.r.events.includes('unkshp'));
});
for(const line of ['RADIO','RADIO GAG'])test(`Statement ${line} empty prompt response returns without changing masks`,()=>{
  const f=fixture(line,['']);f.run();assert.equal(f.low.read('gagmsg'),0n);assert.equal(f.high.read('nomsg'),0n);assert.ok(!f.r.events.includes('odisp:101'));
});
test('Statement RADIO unknown ship scans all physical names and emits exact error bytes',()=>{
  const f=fixture('RADIO GAG NONAME');f.run();assert.equal(f.output(),'\r\n'+M.unkshp.text+'\r\n');assert.equal(f.m.read(f.r.locals.i),BigInt(K.KNPLAY+1));assert.equal(f.low.read('gagmsg'),0n);
});
test('Statement RADIO matching own ship returns silently after its initial newline',()=>{
  const f=fixture('RADIO GAG L');f.run();assert.equal(f.output(),'\r\n');assert.equal(f.low.read('gagmsg'),0n);assert.equal(f.m.read(f.r.locals.iteam),77n);
});
test('Statement RADIO ignores target ALIVE and radio damage',()=>{
  const f=fixture('RADIO GAG N');f.high.write('alive',1n,2);f.high.write('shpdam',99999n,1,K.KDRAD);f.high.write('shpdam',99999n,2,K.KDRAD);f.run();assert.equal(f.low.read('gagmsg'),2n);
});
test('Statement RADIO reads physical BITS(0) when WHO is zero without a player guard',()=>{
  const f=fixture();f.low.write('who',0n);f.high.write('bits',8n,0);f.run();assert.equal(f.high.read('nomsg'),8n);
});
test('Statement RADIO uses current BITS values instead of generating powers of two',()=>{
  const f=fixture('RADIO GAG N');f.high.write('bits',24n,2);f.run();assert.equal(f.low.read('gagmsg'),24n);
});
test('Statement RADIO searches live NAMES and accepts the first physical match',()=>{
  const f=fixture('RADIO GAG CUSTOM');f.high.write('names',packAscii('CUSTO'),2,1);f.high.write('names',packAscii('CUSTO'),3,1);f.run();assert.equal(f.low.read('gagmsg'),2n);assert.equal(f.m.read(f.r.locals.i),2n);
});
test('Statement RADIO does not use NTOK to suppress an existing alphabetic second token',()=>{
  const f=fixture('RADIO OFF');f.low.write('ntok',1n);f.run();assert.equal(f.high.read('nomsg'),1n);assert.ok(!f.r.events.includes('radio0'));
});
test('Statement RADIO UNGAG preserves addition overflow and separate negation policy',()=>{
  const f=fixture('RADIO UNGAG N');f.high.write('bits',MAX_INTEGER,2);f.low.write('gagmsg',-1n);let input:bigint|undefined;f.r.io.negate=function*(v){input=yield*v.evaluate();return MIN_INTEGER;};f.run();assert.equal(input,MIN_INTEGER);assert.equal(f.low.read('gagmsg'),MIN_INTEGER);
});
test('Statement RADIO successful OR action test still rechecks UNGAG after assigning GAGTYP',()=>{
  const f=fixture('RADIO GAG N'),assign=f.r.io.assign;f.low.write('gagmsg',7n);f.r.io.assign=function*(d,t,v){yield*assign(d,t,v);if(d()===f.r.locals.gagtyp&&f.m.read(d())===0n)f.low.write('tknlst',packAscii('UNGAG'),2);};f.run();assert.equal(f.low.read('gagmsg'),5n);assert.ok(f.r.events.includes('radung'));
});
test('Statement RADIO compound action evaluation is controlled by the required OR service',()=>{
  const f=fixture('RADIO GAG N');let terms=0;f.r.io.or=function*(...p){let result=false;for(const term of p){result=(yield*term())||result;terms++;}return result;};f.run();assert.equal(terms,2);assert.equal(f.low.read('gagmsg'),2n);
});
test('Statement RADIO reads WHO after suspended EQUAL before changing NOMSG',()=>{
  const f=fixture(),equal=f.r.io.equal;f.r.io.equal=function*(a,b){const result=yield*equal(a,b);if(b===f.r.symbols.OFF)yield 'matched';return result;};const g=f.r.run();assert.equal(g.next().value,'matched');f.low.write('who',2n);finish(g);assert.equal(f.high.read('nomsg'),2n);
});
test('Statement RADIO self comparison uses WHO after the matching name call',()=>{
  const f=fixture('RADIO GAG N'),equal=f.r.io.equal;f.r.io.equal=function*(a,b){const result=yield*equal(a,b);if(b===f.high.address('names',2,1))f.low.write('who',2n);return result;};f.run();assert.equal(f.low.read('gagmsg'),0n);assert.equal(f.output(),'\r\n');
});
test('Statement RADIO mask assignment precedes output and is retained on output failure',()=>{
  const f=fixture('RADIO GAG N'),out=f.r.io.out;f.r.io.out=function*(key,n){if(key==='radgag')throw new Error('gag output fault');yield*out(key,n);};assert.throws(f.run,/gag output fault/);assert.equal(f.low.read('gagmsg'),2n);assert.equal(f.m.read(f.r.locals.iteam),77n);
});
test('Statement RADIO rereads I for displayed ship after prefix output changes it',()=>{
  const f=fixture('RADIO GAG N'),out=f.r.io.out;f.r.io.out=function*(key,n){yield*out(key,n);if(key==='radgag')f.m.write(f.r.locals.i,10n);};f.run();assert.equal(f.low.read('gagmsg'),2n);assert.ok(f.output().endsWith(M.radgag.text+'W\r\n'));assert.ok(f.r.events.includes('odisp:210'));
});
test('Statement RADIO initial CRLF can suspend before private INDEX initialization',()=>{
  const f=fixture(),crlf=f.r.io.crlf;let first=true;f.r.io.crlf=function*(){yield*crlf();if(first){first=false;yield 'initial-newline';}};const g=f.r.run();assert.equal(g.next().value,'initial-newline');assert.equal(f.m.read(f.r.locals.index),77n);finish(g);assert.equal(f.high.read('nomsg'),1n);
});
test('Statement RADIO target prompting rejects nonalphabetic lines and resets INDEX to zero',()=>{
  const f=fixture('RADIO GAG',['123','N']);f.run();assert.equal(f.r.events.filter(e=>e==='radio2').length,2);assert.equal(f.m.read(f.r.locals.index),0n);assert.equal(f.low.read('gagmsg'),2n);
});
test('Statement RADIO preserves independent shared NOMSG and session GAGMSG through successive commands',()=>{
  const f=fixture('RADIO OFF/RADIO GAG N/RADIO ON');f.run();assert.equal(f.high.read('nomsg'),1n);finish(f.tokens.run());f.run();assert.equal(f.low.read('gagmsg'),2n);finish(f.tokens.run());f.run();assert.equal(f.high.read('nomsg'),0n);assert.equal(f.low.read('gagmsg'),2n);
});
test('DECWAR command slot 17 composes RADIO without timed-turn maintenance',()=>{
  const f=fixture(),ctx={who:1,player:-1n,ptime:99n,shared:{players:f.views.high.players}};finish(dispatchCommand(ctx,17,{
    *getcmd(){throw new Error('unexpected GETCMD');},*quit(){throw new Error('unexpected QUIT');},*invoke(call){assert.deepEqual(call,{routine:'radio'});yield*f.r.run();},*leave(){throw new Error('unexpected leave');},*finishTurn(){throw new Error('unexpected timed turn');},movementContinuation(){throw new Error('unexpected movement');},
  }));assert.equal(ctx.ptime,99n);assert.equal(f.high.read('nomsg'),1n);
});
