import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture } from './fixtures/pregame-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { romulanText as T,constants as K,ships } from '../src/generated/source-data.ts';
import { halfWords,packSixbit,packAscii,rightHalf,signed36,unsigned36,MIN_INTEGER,MAX_INTEGER } from '../src/compat/word36.ts';
import { messageText } from '../src/game/message-queue.ts';
type Draw=[number,bigint];
function fixture(script:Draw[]=[[4,2n],[5,2n],[3,2n],[5,5n],[5,5n]]){
  const f=pregameRuntimeFixture([]),b=f.romulanSpeech,s=b.symbols,remaining=[...script],draws:number[]=[];
  f.low.write('player',-1n);f.low.write('who',1n);f.low.write('team',1n);f.low.write('dbits',777n);f.low.write('dispfr',777n);f.m.write(s.tmp,99n);for(let i=0;i<17;i++)f.m.write(b.buffer+BigInt(i),-1n);
  const rawIran=b.io.iran;
  b.io.iran=function*(){const n=Number(f.rt.args.read(0));draws.push(n);const next=remaining.shift();assert.ok(next,'unexpected draw '+n);assert.equal(n,next[0]);f.r.t0=next[1];};
  const content=(a=b.buffer)=>messageText(Array.from({length:17},(_,i)=>f.m.read(a+BigInt(i))));
  const run=()=>{finish(b.run());assert.equal(remaining.length,0);return content();};
  return {...f,b,s,draws,remaining,rawIran,content,run};
}
test('Raw ROMSPK preserves single speech spelling, masks, draw order and shared TMP',()=>{
  const f=fixture();assert.equal(f.run(),'You will witness my vengence, worthless human parasite!');assert.equal(f.low.read('dbits'),1n);assert.equal(f.low.read('dispfr'),500n);assert.equal(f.m.read(f.s.tmp),-1n);assert.equal(f.s.tmp,f.file.address('tmp',0));assert.deepEqual(f.draws,[4,5,3,5,5]);
});
test('Raw ROMSPK PLAYER positive one takes the assembly nonzero single-player branch',()=>{
  const f=fixture();f.low.write('player',1n);f.low.write('who',10n);f.low.write('team',2n);assert.equal(f.run(),'You will witness my vengence, worthless klingon parasite!');assert.equal(f.low.read('dbits'),512n);
});
for(const population of [1,2,3])test(`Raw ROMSPK broadcast ${population} uses literal population mask and plural bytes`,()=>{
  const f=fixture([[3,BigInt(population)],[4,1n],[5,1n],[5,3n]]);f.low.write('player',0n);assert.equal(f.run(),'Death to mindless '+T.populations[population-1].text+'toads!');assert.equal(f.low.read('dbits'),BigInt(T.masks[population-1]));assert.equal(f.m.read(f.s.tmp),BigInt(population-1));assert.deepEqual(f.draws,[3,4,5,5]);
});
test('Raw ROMSPK preserves word bit zero and all bytes after its final NUL',()=>{
  const f=fixture(),text=f.run(),bytes=Array.from({length:17},(_,i)=>f.m.read(f.b.buffer+BigInt(i))).flatMap(w=>Array.from({length:5},(_,j)=>Number((w>>BigInt(29-j*7))&127n)));assert.equal(bytes[text.length],0);assert.ok(bytes.slice(text.length+1).every(c=>c===127));assert.ok(Array.from({length:17},(_,i)=>f.m.read(f.b.buffer+BigInt(i))&1n).every(b=>b===1n));assert.equal(f.r.c,0n);
});
test('Raw ROMSPK visits every extracted phrase table choice using actual pointer words',()=>{
  for(let choice=1;choice<=5;choice++){const lead=(choice-1)%4+1,generic=(choice-1)%4+1,f=fixture([[4,BigInt(lead)],[5,BigInt(choice)],[3,3n],[5,BigInt(generic)],[5,BigInt(choice)]]);assert.equal(f.run(),T.single[lead-1].text+T.adjectives[choice-1].text+T.generic[generic-1].text+T.objects[choice-1].text+'!');}
});
test('Raw ROMSPK all node rows match the GETLIN right half without a generic draw',()=>{
  for(const node of T.nodes){const f=fixture([[4,3n],[5,4n],[3,1n],[5,4n]]);f.b.nodes.push(halfWords(0o777777n,packSixbit(node.node)>>18n));assert.equal(f.run(),T.single[2].text+T.adjectives[3].text+node.text+T.objects[3].text+'!');assert.deepEqual(f.draws,[4,5,3,5]);assert.equal(f.r.t2,BigInt(T.nodes.indexOf(node)));}
});
test('Raw ROMSPK unknown CLx CSx Qxx retain literal ANDI fallthrough',()=>{
  for(const node of ['CLX','CSX','QXX','ZZZ']){const f=fixture([[4,1n],[5,1n],[3,1n],[5,2n],[5,1n]]);f.b.nodes.push(packSixbit(node)>>18n);assert.equal(f.run(),T.single[0].text+T.adjectives[0].text+'vertebrate mutant!');assert.equal(f.r.t2,BigInt(T.nodes.length));}
});
test('Raw RMGPLY special node immediate policy reads relocated special pointer literals',()=>{
  for(const key of ['cl','cs','q'] as const){const f=fixture([[3,1n]]);f.s[key]=0n;f.b.nodes.push(0n);finish(f.b.call('rmgply'));assert.equal(f.r.p2,f.m.read(key==='q'?f.s.tymnet:f.s.columbus));assert.deepEqual(f.draws,[3]);}
});
test('Raw ROMSPK uses the live node table after GETLIN returns',()=>{
  const f=fixture([[3,1n]]);f.b.nodes.push(packSixbit('AKR')>>18n);const get=f.b.io.getlinT1;f.b.io.getlinT1=function*(){yield*get();f.m.write(f.s.nodes,halfWords(packSixbit('AKR')>>18n,31500n));};finish(f.b.call('rmgply'));assert.equal(f.r.p2,signed36(halfWords(f.s.point7,31500n)));
});
test('Raw ROMSPK duplicate node codes choose the first physical table row',()=>{
  const f=fixture([[3,1n]]);f.b.nodes.push(packSixbit('ZZZ')>>18n);f.m.write(f.s.nodes,halfWords(packSixbit('ZZZ')>>18n,31500n));f.m.write(f.s.nodes+1n,halfWords(packSixbit('ZZZ')>>18n,31510n));finish(f.b.call('rmgply'));assert.equal(rightHalf(f.r.p2),31500n);assert.equal(f.r.t2,0n);
});
test('Raw ROMSPK WHO zero reads the physical BITS predecessor',()=>{
  const f=fixture();f.low.write('who',0n);f.m.write(f.s.bits-1n,32n);f.run();assert.equal(f.low.read('dbits'),32n);
});
test('Raw ROMSPK TEAM zero reads the physical pointer before the team table',()=>{
  const f=fixture();f.low.write('team',0n);f.m.write(f.s.teams-1n,f.m.read(f.s.generic));assert.equal(f.run(),T.single[1].text+T.adjectives[1].text+'sub-Romulan parasite!');
});
test('Raw ROMSPK invalid random result addresses neighboring mask and population words',()=>{
  const f=fixture([[3,4n],[4,1n],[5,1n],[5,1n]]);f.low.write('player',0n);f.m.write(f.s.masks+3n,123n);f.m.write(f.s.populations+3n,f.m.read(f.s.generic+1n));assert.equal(f.run(),'Death to mindless vertebrate mutants!');assert.equal(f.low.read('dbits'),123n);
});
test('Raw ROMSPK reads broadcast pointer even when a single-player pointer will replace it',()=>{
  const f=fixture();f.s.broadcast=100000n;assert.throws(()=>finish(f.b.run()),/unmapped/i);assert.equal(f.low.read('dbits'),1n);assert.equal(f.low.read('dispfr'),500n);assert.deepEqual(f.draws,[4]);assert.equal(f.r.t0,1n);
});
test('Raw ROMSPK ARG is restored for destination resolution then left at the last IRAN literal',()=>{
  const f=fixture(),savedS=f.r.s,savedP=f.r.p;f.run();assert.equal(f.r.s,savedS);assert.equal(f.r.p,savedP);assert.equal(f.r.arg,f.s.iranArgs[5]);assert.equal(f.r.t0,4n);assert.equal(f.r.p2,halfWords(0o100700n,rightHalf(f.m.read(f.s.objects+4n))+1n));
});
test('Raw ROMSPK restore suspension can change the saved destination argument descriptor',()=>{
  const f=fixture(),pop=f.b.io.popData;f.b.io.popData=function*(){const w=yield*pop();yield 'restore';return w;};const g=f.b.run();assert.equal(g.next().value,'restore');f.m.write(f.b.header+1n,31500n);finish(g);assert.equal(f.content(31500n),'You will witness my vengence, worthless human parasite!');assert.equal(f.m.read(f.b.buffer),-1n);
});
test('Raw ROMSPK SAVE failure occurs before PLAYER branch effects',()=>{
  const f=fixture();f.b.io.pushData=function*(){throw new Error('save fault');};assert.throws(()=>finish(f.b.run()),/save fault/);assert.equal(f.low.read('dbits'),777n);assert.equal(f.low.read('dispfr'),777n);assert.equal(f.m.read(f.s.tmp),99n);
});
test('Raw ROMSPK broadcast IRAN suspension retains caller ARG on the actual S stack',()=>{
  const f=fixture([[3,1n],[4,1n],[5,1n],[5,1n]]);f.low.write('player',0n);const iran=f.b.io.iran;let first=true;f.b.io.iran=function*(){if(first){first=false;yield 'draw';}yield*iran();};const g=f.b.run(),oldS=f.r.s;assert.equal(g.next().value,'draw');assert.notEqual(f.r.s,oldS);assert.equal(f.m.read(rightHalf(f.r.s)),f.b.header+1n);assert.equal(f.low.read('dbits'),777n);finish(g);
});
test('Raw ROMSPK live TMP after adjective copy controls population selection',()=>{
  const f=fixture([[4,1n],[5,1n],[5,1n]]),copy=f.b.io.copy;let n=0;f.b.io.copy=function*(){yield*copy();if(++n===2)f.m.write(f.s.tmp,2n);};assert.equal(f.run(),T.single[0].text+'mindless human mutants!');assert.equal(f.m.read(f.s.tmp),1n);assert.ok(!f.b.events.includes('player-quip'));
});
test('Raw ROMSPK plural decision rereads TMP after object copy returns',()=>{
  const f=fixture(),copy=f.b.io.copy;let n=0;f.b.io.copy=function*(){yield*copy();if(++n===4)f.m.write(f.s.tmp,0n);};assert.equal(f.run(),'You will witness my vengence, worthless human parasites!');
});
test('Raw ROMSPK SOSL exposes overflow and branch policy through the actual TMP word',()=>{
  const f=fixture([[4,1n],[5,1n],[5,1n]]),copy=f.b.io.copy;let n=0;f.b.io.copy=function*(){yield*copy();if(++n===2)f.m.write(f.s.tmp,MIN_INTEGER);};f.b.io.soslP2=function*(a){yield*f.b.io.sos('p2',a);assert.equal(f.m.read(a),MAX_INTEGER);f.r.p2=1n;return false;};assert.equal(f.run(),T.single[0].text+'mindless human mutants!');
});
test('Raw RMCOPY leaves C zero and preserves bytes after the source terminator',()=>{
  const f=fixture([]);f.h.put(31500n,'AB');f.r.p2=halfWords(f.s.point7,31500n);f.r.p1=halfWords(f.s.point7,f.b.buffer);finish(f.b.call('rmcopy'));assert.equal(f.r.c,0n);assert.equal((f.m.read(f.b.buffer)>>15n)&127n,127n);assert.deepEqual(f.b.events.filter(e=>e.startsWith('write:')),['write:65','write:66']);
});
test('Raw RMCOPY uses a changed live destination pointer after a suspended source byte read',()=>{
  const f=fixture([]);f.h.put(31500n,'AB');f.r.p2=halfWords(f.s.point7,31500n);f.r.p1=halfWords(f.s.point7,f.b.buffer);const read=f.b.io.ildbP2;let first=true;f.b.io.ildbP2=function*(){yield*read();if(first){first=false;yield 'read';}};const g=f.b.call('rmcopy');assert.equal(g.next().value,'read');f.r.p1=halfWords(f.s.point7,31600n);finish(g);assert.equal(f.m.read(f.b.buffer),-1n);assert.equal(messageText([f.m.read(31600n)]),'AB');
});
test('Raw ROMSPK byte-deposit failure preserves metadata, prefix and pointer advancement',()=>{
  const f=fixture(),write=f.b.io.idpbP1;let n=0;f.b.io.idpbP1=function*(){if(++n===4)throw new Error('deposit fault');yield*write();};assert.throws(()=>finish(f.b.run()),/deposit fault/);assert.equal(unsigned36(f.m.read(f.b.buffer))>>15n,unsigned36(packAscii('You'))>>15n);assert.equal(f.low.read('dbits'),1n);assert.equal(f.low.read('dispfr'),500n);assert.equal(f.m.read(f.s.tmp),0n);assert.deepEqual(f.draws,[4]);
});
test('Raw ROMSPK GETLIN failure retains prior copied lead and adjective',()=>{
  const f=fixture([[4,1n],[5,1n],[3,1n]]);assert.throws(()=>finish(f.b.run()),/GETLIN requires scheduled monitor node/);assert.equal(f.m.read(f.s.tmp),-1n);assert.equal(f.low.read('dbits'),1n);assert.equal(f.b.events.filter(e=>e.startsWith('write:')).length,36);assert.deepEqual(f.draws,[4,5,3]);
});
test('Raw ROMSPK literal IRAN arguments are read from memory without cached numeric maxima',()=>{
  const f=fixture([[6,2n],[5,2n],[3,2n],[5,5n],[5,5n]]);f.m.write(f.m.read(f.s.iranArgs[4]),6n);f.run();assert.equal(f.draws[0],6);
});
test('Raw ROMSPK seeded execution composes actual IRAN and balances both stacks',()=>{
  const f=fixture([]);f.b.io.iran=f.rawIran;f.b.nodes.push(0n);finish(f.tell.random.setran(1n));const p=f.r.p,s=f.r.s;finish(f.b.run());assert.equal(f.content(),'You will witness my vengence, idiotic human toad!');assert.equal(f.m.read(f.tell.random.s.seed),18323161279n);assert.equal(f.r.p,p);assert.equal(f.r.s,s);assert.deepEqual(f.b.events.filter(e=>e.startsWith('iran:')),[ 'iran:4','iran:5','iran:3','iran:5','iran:5']);
});
test('Raw ROMSPK through TELL creates and retrieves real reply and human queue records',()=>{
  const f=fixture([[4,2n],[5,2n],[3,2n],[5,5n],[5,5n]]);f.editor.feed('TELL N ROM; hello\n');finish(f.tokens.run());f.low.write('rptflg',0n);f.high.write('rom',-1n);f.high.write('alive',-1n,2);f.high.write('shpdam',0n,2,K.KDRAD);for(const ship of ships)f.high.write('names',packAscii(ship.name.toUpperCase().slice(0,5)),ship.id,1);f.tell.io.iran=function*(){return 2n;};finish(f.tell.run());assert.equal(f.high.read('msgflg',1),1n);assert.equal(f.high.read('msgflg',2),1n);f.m.write(f.getMessage.player,1n);finish(f.getMessage.run());assert.equal(messageText(Array.from({length:16},(_,i)=>f.m.read(f.getMessage.buffer+BigInt(i)))),'You will witness my vengence, worthless human parasite!\r\n');assert.equal(f.low.read('dispfr'),500n);f.m.write(f.getMessage.player,2n);finish(f.getMessage.run());assert.equal(messageText(Array.from({length:16},(_,i)=>f.m.read(f.getMessage.buffer+BigInt(i)))),' hello\r\n');assert.equal(f.low.read('dispfr'),101n);
});
test('Raw autonomous ROMSPK broadcast passes eighteen recipient bits through TELL and MAKMSG',()=>{
  const f=fixture([[3,1n],[4,1n],[5,1n],[5,3n]]);f.low.write('player',0n);f.low.write('who',0n);f.low.write('gagmsg',0n);f.high.write('nomsg',0n);for(let i=1;i<=K.KNPLAY;i++){f.high.write('alive',-1n,i);f.high.write('shpdam',0n,i,K.KDRAD);f.high.write('msgflg',0n,i);}
  const aliases=Array.from({length:8},(_,i)=>{const a=f.high.address('msgflg',i+11);return {a,before:f.m.read(a)};});finish(f.tell.run());const q=f.getHit.queues.message;assert.equal(q.data[0][0],halfWords(500n,0o777777n));assert.equal(messageText(q.data[0].slice(1)),'Death to mindless sub-Romulan toads!\r\n');for(let i=1;i<=K.KNPLAY;i++)assert.equal(f.high.read('msgflg',i),1n);for(const a of aliases)assert.equal(f.m.read(a.a),a.before+1n);assert.equal(f.low.read('dbits'),0n);assert.equal(f.remaining.length,0);
});
