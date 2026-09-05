import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture } from './fixtures/pregame-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { constants as K,messages as M,ships } from '../src/generated/source-data.ts';
import { packAscii,halfWords,MAX_INTEGER,MIN_INTEGER } from '../src/compat/word36.ts';
import { messageText } from '../src/game/message-queue.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';
function fixture(line='TELL N; Hello; again / TIME',responses:string[]=[]){
  const f=pregameRuntimeFixture([]);for(const text of [line,...responses])f.editor.feed(text+'\n');finish(f.tokens.run());
  f.low.write('who',1n);f.low.write('player',-1n);f.low.write('rptflg',0n);f.low.write('oflg',0n);f.low.write('blank',0n);f.low.write('hcpos',0n);f.low.write('gagmsg',0n);f.low.write('dbits',77n);f.low.write('dispfr',999n);f.high.write('nomsg',0n);
  for(const s of ships){f.high.write('names',packAscii(s.name.toUpperCase().slice(0,5)),s.id,1);f.high.write('names',packAscii(s.name.toUpperCase().slice(5)),s.id,2);f.high.write('alive',s.id<=2?-1n:0n,s.id);f.high.write('shpdam',0n,s.id,K.KDRAD);f.high.write('msgflg',0n,s.id);}
  for(let i=1;i<=K.KNGRP;i++){f.low.write('group',0n,i,1);f.low.write('group',0n,i,2);}
  const before=f.text().length,b=f.tell,q=f.getHit.queues.message;
  const group=(i:number,name:string,bits:bigint)=>{f.low.write('group',packAscii(name),i,1);f.low.write('group',bits,i,2);};
  const speech=(bits=1n)=>{f.high.write('rom',-1n);b.io.romspk=function*(a){assert.equal(a,b.locals.local);b.events.push('romspk');f.low.write('dispfr',500n);f.low.write('dbits',bits);f.h.put(a,'Words');};b.io.iran=function*(n){b.events.push('iran:'+n);return 2n;};};
  const receive=(who:number)=>{f.m.write(f.getMessage.player,BigInt(who));finish(f.getMessage.run());return {from:f.low.read('dispfr'),bits:f.low.read('dbits'),text:messageText(Array.from({length:16},(_,i)=>f.m.read(f.getMessage.buffer+BigInt(i))))};};
  return {...f,b,q,group,speech,receive,run:()=>finish(b.run()),output:()=>f.text().slice(before)};
}
test('Statement TELL composes raw tokenization, MAKMSG and GETMSG with original message bytes',()=>{
  const f=fixture();f.high.write('nomsg',1n);f.low.write('gagmsg',3n);f.run();assert.equal(f.high.read('nomsg'),0n);assert.equal(f.low.read('gagmsg'),1n);assert.equal(f.low.read('dbits'),0n);assert.equal(f.output(),'\r\n');assert.equal(f.q.data[0][0],halfWords(101n,2n));assert.equal(f.high.read('msgflg',2),1n);assert.deepEqual(f.receive(2),{from:101n,bits:2n,text:' Hello; again / TIME\r\n'});
});
test('Statement TELL damaged sender returns before radio enabling, prompting and DBITS clearing',()=>{
  const f=fixture();f.high.write('nomsg',1n);f.high.write('shpdam',BigInt(K.KCRIT),1,K.KDRAD);f.run();assert.equal(f.low.read('dbits'),77n);assert.equal(f.high.read('nomsg'),1n);assert.equal(f.output(),M.tell01.text+'\r\n');assert.equal(f.m.read(f.b.locals.p),77n);
});
test('Statement TELL cancelled destination still enables radio and preserves prior DBITS',()=>{
  const f=fixture('TELL',['']);f.high.write('nomsg',3n);f.run();assert.equal(f.high.read('nomsg'),2n);assert.equal(f.low.read('dbits'),77n);assert.equal(f.m.read(f.b.locals.p),1n);assert.ok(f.output().startsWith(M.tell02.text));assert.ok(!f.b.events.includes('makmsg:input'));
});
test('Statement TELL consumes slash destination tail and semicolon message through raw routines',()=>{
  const f=fixture('TELL / N ; Hi there');f.run();assert.equal(f.output(),M.tell02.text+'\r\n\r\n');assert.equal(f.m.read(f.b.locals.p),1n);assert.equal(f.receive(2).text,' Hi there\r\n');
});
test('Statement TELL below-critical sender prompts directly for message via raw INLI',()=>{
  const f=fixture('TELL N',['More / TIME']);f.high.write('shpdam',BigInt(K.KCRIT-1),1,K.KDRAD);f.run();assert.ok(f.output().startsWith('Msg: '));assert.equal(f.receive(2).text,'More / TIME\r\n');assert.ok(f.makeMessage.events.includes('inli'));
});
test('Statement TELL reports unknown and ambiguous names then retains valid destinations',()=>{
  const f=fixture('TELL UNRECOGNIZED F N; text');f.group(1,'FLEET',2n);f.group(7,'FRIEN',4n);f.run();assert.equal(f.output(),M.tell03.text+'UNREC\r\n'+M.tell04.text+'F\r\n\r\n');assert.equal(f.receive(2).text,' text\r\n');
});
test('Statement TELL names precede groups and duplicate names create one recipient count',()=>{
  const f=fixture('TELL N N N; text');f.group(1,'N',4n);f.run();assert.equal(f.high.read('msgflg',2),1n);assert.equal(f.high.read('msgflg',3),0n);
});
test('Statement TELL uses live NAMES first match and current BITS rather than roster data',()=>{
  const f=fixture('TELL CUSTOM; text');f.high.write('names',packAscii('CUSTO'),2,1);f.high.write('names',packAscii('CUSTO'),3,1);f.high.write('bits',8n,2);f.high.write('alive',-1n,4);f.run();assert.equal(f.high.read('msgflg',2),0n);assert.equal(f.high.read('msgflg',4),1n);assert.equal(f.receive(4).bits,8n);
});
test('Statement TELL group pruning skips unnamed slots and silently removes dead members',()=>{
  const f=fixture('TELL ALL; text');f.low.write('group',1023n,1,2);f.group(7,'ALL',7n);f.low.write('ngroup',0n);f.run();assert.equal(f.output(),'\r\n');assert.equal(f.receive(2).bits,2n);
});
test('Statement TELL filters selected slots in physical order after self warning',()=>{
  const f=fixture('TELL V S L N; text');f.high.write('alive',-1n,4);f.high.write('nomsg',8n);f.low.write('gagmsg',15n);f.run();assert.equal(f.output(),M.tell05.text+'\r\n'+M.tell06.text+'S\r\n'+M.tell07.text+'V\r\n\r\n');assert.equal(f.low.read('gagmsg'),13n);assert.equal(f.high.read('msgflg',1),0n);assert.equal(f.receive(2).bits,2n);
});
test('Statement TELL damage wins over dead status and dead status wins over radio off',()=>{
  const f=fixture('TELL N S; text');f.high.write('alive',0n,2);f.high.write('nomsg',6n);f.high.write('shpdam',BigInt(K.KCRIT),2,K.KDRAD);f.run();assert.equal(f.output(),M.tell07.text+'N\r\n'+M.tell06.text+'S\r\n'+M.tell08.text+'\r\n');assert.equal(f.q.header,-1n);
});
for(const format of [-1n,0n,1n])test(`Statement TELL empire diagnostic retains source class one at verbosity ${format}`,()=>{
  const f=fixture('TELL W; text');f.low.write('oflg',format);f.run();assert.equal(f.output(),M.tell06.text+(format>0n?'Wolf':'W')+'\r\n'+M.tell08.text+'\r\n');assert.ok(f.radio.events.includes('odisp:110'));
});
test('Statement TELL ignores token type and uses the required logical policy for ALIVE',()=>{
  const f=fixture();f.low.write('typlst',BigInt(K.KINT),2);const logical=f.b.io.logical;f.b.io.logical=w=>w===1n||logical(w);f.high.write('alive',1n,2);f.run();assert.equal(f.high.read('msgflg',2),1n);
});
test('Statement TELL repeat rejection retains enabling and DBITS clearing before name lookup',()=>{
  const f=fixture();f.low.write('rptflg',-1n);f.high.write('nomsg',1n);f.run();assert.equal(f.output(),M.tell09.text+'\r\n');assert.equal(f.high.read('nomsg'),0n);assert.equal(f.low.read('dbits'),0n);assert.equal(f.m.read(f.b.locals.j),77n);
});
test('Statement TELL repeated Romulan target replies before following token is rejected',()=>{
  const f=fixture('TELL ROM N; text');f.speech();f.low.write('rptflg',-1n);f.run();assert.equal(f.high.read('msgflg',1),1n);assert.equal(f.high.read('msgflg',2),0n);assert.equal(f.output(),M.tell09.text+'\r\n');assert.equal(f.m.read(f.b.locals.sntrom),-1n);assert.equal(f.receive(1).text,'Words\r\n');
});
test('Statement TELL preserves accumulated human bits across consecutive Romulan replies',()=>{
  const f=fixture('TELL N ROM ROM; text');f.speech();f.run();assert.equal(f.high.read('msgflg',1),2n);assert.equal(f.high.read('msgflg',2),1n);assert.equal(f.receive(1).from,500n);assert.equal(f.receive(1).from,500n);assert.deepEqual(f.receive(2),{from:101n,bits:2n,text:' text\r\n'});assert.deepEqual(f.b.events.filter(e=>e==='romspk'||e.startsWith('makmsg:')||e.startsWith('iran:')),['romspk','makmsg:local','iran:4','romspk','makmsg:local','iran:4','makmsg:input']);
});
test('Statement TELL Romulan-only reply suppresses human send and no-message output',()=>{
  const f=fixture('TELL ROM; ignored');f.speech();f.run();assert.equal(f.output(),'');assert.equal(f.low.read('dbits'),0n);assert.equal(f.low.read('dispfr'),500n);assert.ok(!f.b.events.includes('makmsg:input'));
});
test('Statement TELL dead Romulan uses supplied literal bytes and later no-message output',()=>{
  const f=fixture('TELL ROM');f.high.write('rom',0n);f.h.put(f.b.labels.Romulan,'Romulan   ');f.run();assert.equal(f.output(),M.tell07.text+'Romulan   \r\n'+M.tell08.text+'\r\n');
});
test('Statement TELL preserves human destinations when its speech dependency fails',()=>{
  const f=fixture('TELL N ROM');f.high.write('rom',-1n);f.b.io.romspk=function*(){throw new Error('speech fault');};assert.throws(f.run,/speech fault/);assert.equal(f.low.read('dbits'),2n);assert.equal(f.m.read(f.b.locals.svdb),2n);assert.equal(f.m.read(f.b.locals.sntrom),0n);
});
test('Statement TELL relocation scans horizontal outer and vertical inner through raw board routines',()=>{
  const f=fixture('TELL ROM');f.speech();const draws:number[]=[];f.b.io.iran=function*(n){draws.push(n);return 1n;};f.high.write('shpcon',10n,1,K.KVPOS);f.high.write('shpcon',10n,1,K.KHPOS);f.high.write('locr',50n,K.KVPOS);f.high.write('locr',50n,K.KHPOS);f.views.high.board.setdsp(50,50,500);f.views.high.board.setdsp(6,6,300);f.views.high.board.setdsp(7,6,300);f.run();assert.deepEqual(draws,[4,10]);assert.equal(f.high.read('locr',K.KVPOS),8n);assert.equal(f.high.read('locr',K.KHPOS),6n);assert.equal(f.views.high.board.disp(50,50),0);assert.equal(f.views.high.board.disp(8,6),500);assert.deepEqual(f.b.events.filter(e=>e.startsWith('disp:')),['disp:6,6','disp:7,6','disp:8,6']);
});
test('Statement TELL full relocation search retains old position and performs no SETDSP',()=>{
  const f=fixture('TELL ROM');f.speech();f.b.io.iran=function*(){return 1n;};f.high.write('shpcon',10n,1,K.KVPOS);f.high.write('shpcon',10n,1,K.KHPOS);f.high.write('locr',50n,K.KVPOS);f.high.write('locr',50n,K.KHPOS);f.views.high.board.setdsp(50,50,500);for(let h=6;h<=20;h++)for(let v=6;v<=20;v++)f.views.high.board.setdsp(v,h,300);f.run();assert.equal(f.b.events.filter(e=>e.startsWith('disp:')).length,225);assert.ok(!f.b.events.some(e=>e.startsWith('setdsp:')));assert.equal(f.views.high.board.disp(50,50),500);
});
test('Statement TELL autonomous speech bypasses sender/input and silently filters recipients',()=>{
  const f=fixture();f.speech(7n);f.low.write('player',0n);f.low.write('who',0n);f.high.write('nomsg',1n);f.low.write('gagmsg',7n);f.run();assert.equal(f.output(),'');assert.equal(f.high.read('nomsg'),1n);assert.equal(f.low.read('gagmsg'),5n);assert.equal(f.m.read(f.b.locals.rmspk),-1n);assert.deepEqual(f.receive(2),{from:500n,bits:2n,text:'Words\r\n'});assert.ok(!f.b.events.some(e=>e.startsWith('iran:')));
});
test('Statement TELL autonomous speech with no recipients returns without MAKMSG',()=>{
  const f=fixture();f.speech(6n);f.low.write('player',0n);f.high.write('nomsg',2n);f.run();assert.equal(f.output(),'');assert.equal(f.low.read('dbits'),0n);assert.ok(!f.b.events.some(e=>e.startsWith('makmsg:')));
});
test('Statement TELL rereads PLAYER after ROMSPK before removing self',()=>{
  const f=fixture();f.speech();f.low.write('player',0n);const speak=f.b.io.romspk;f.b.io.romspk=function*(a){yield*speak(a);f.low.write('player',-1n);};f.run();assert.equal(f.low.read('dbits'),0n);assert.equal(f.high.read('msgflg',1),0n);
});
test('Statement TELL retains bits outside KNPLAY and raw MAKMSG writes the physical counter alias',()=>{
  const f=fixture('TELL ALL; text');f.group(1,'ALL',4096n);f.low.write('gagmsg',4096n);const a=f.high.address('msgflg',13),before=f.m.read(a);f.run();assert.equal(f.low.read('gagmsg'),0n);assert.equal(f.m.read(a),before+1n);assert.equal(f.q.data[0][0],halfWords(101n,4096n));
});
test('Statement TELL exposes required compound final condition evaluation',()=>{
  const f=fixture('TELL L; text');let terms=0;f.b.io.and=function*(...p){let yes=true;for(const t of p){yes=(yield*t())&&yes;terms++;}return yes;};f.run();assert.equal(terms,2);assert.equal(f.output(),M.tell05.text+'\r\n'+M.tell08.text+'\r\n');
});
test('Statement TELL group complement retains addition overflow before separate negation',()=>{
  const f=fixture('TELL ALL; text');f.group(1,'ALL',-1n);f.high.write('bits',MAX_INTEGER,3);const negate=f.b.io.negate;let minimum=false;f.b.io.negate=function*(e){const n=yield*e.evaluate();if(n===MIN_INTEGER){minimum=true;return 0n;}return yield*negate({type:'integer',evaluate:function*(){return n;}});};f.run();assert.equal(minimum,true);assert.equal(f.q.header,-1n);
});
test('Statement TELL captured NTOK limit still reads later token words live after output',()=>{
  const f=fixture('TELL WRONG N; text'),out=f.b.io.out;f.high.write('alive',-1n,3);f.b.io.out=function*(key,n){yield*out(key,n);if(key==='tell03'){f.low.write('ntok',2n);f.low.write('tknlst',packAscii('S'),3);}};f.run();assert.equal(f.high.read('msgflg',3),1n);assert.equal(f.high.read('msgflg',2),0n);
});
test('Statement TELL name output reads current I after the diagnostic prefix returns',()=>{
  const f=fixture('TELL WRONG N; text'),out=f.b.io.out;f.b.io.out=function*(key,n){yield*out(key,n);if(key==='tell03')f.m.write(f.b.locals.i,3n);};f.run();assert.ok(f.output().startsWith(M.tell03.text+'N\r\n'));assert.equal(f.high.read('msgflg',2),0n);
});
test('Statement TELL sender WHO can change during raw name matching before self exclusion',()=>{
  const f=fixture(),equal=f.b.io.equal;f.b.io.equal=function*(a,b){const result=yield*equal(a,b);if(b===f.high.address('names',2,1))yield 'matched';return result;};const g=f.b.run();assert.equal(g.next().value,'matched');f.low.write('who',2n);finish(g);assert.equal(f.q.header,-1n);assert.equal(f.output(),M.tell05.text+'\r\n'+M.tell08.text+'\r\n');
});
test('Statement TELL rejection clears the live MASK after diagnostic output changes it',()=>{
  const f=fixture('TELL S N; text'),out=f.b.io.out;f.b.io.out=function*(key,n){yield*out(key,n);if(key==='tell06')f.m.write(f.b.locals.mask,2n);};f.run();assert.equal(f.high.read('msgflg',2),0n);assert.equal(f.high.read('msgflg',3),1n);assert.equal(f.q.data[0][0],halfWords(101n,4n));
});
test('Statement TELL GAGMSG change precedes failing message creation without rollback',()=>{
  const f=fixture();f.low.write('gagmsg',3n);f.b.io.makmsg=function*(){throw new Error('send fault');};assert.throws(f.run,/send fault/);assert.equal(f.low.read('gagmsg'),1n);assert.equal(f.low.read('dbits'),2n);assert.equal(f.low.read('dispfr'),101n);assert.equal(f.output(),'');
});
test('Statement TELL reply leaves ROMSPK registers live while raw MAKMSG is suspended',()=>{
  const f=fixture('TELL N ROM; text');f.speech();const make=f.b.io.makmsg;f.b.io.makmsg=function*(a){if(a!==undefined)yield 'reply';yield*make(a);};const g=f.b.run();assert.equal(g.next().value,'reply');assert.equal(f.low.read('dbits'),1n);assert.equal(f.m.read(f.b.locals.svdb),2n);assert.equal(f.m.read(f.b.locals.sntrom),0n);finish(g);assert.equal(f.high.read('msgflg',1),1n);assert.equal(f.high.read('msgflg',2),1n);
});
test('Statement TELL relocation assignments reevaluate coordinates after old SETDSP returns',()=>{
  const f=fixture('TELL ROM');f.speech();f.b.io.iran=function*(){return 1n;};f.high.write('shpcon',10n,1,K.KVPOS);f.high.write('shpcon',10n,1,K.KHPOS);f.high.write('locr',50n,K.KVPOS);f.high.write('locr',50n,K.KHPOS);const set=f.b.io.setdsp;f.b.io.setdsp=function*(v,h,n){yield*set(v,h,n);if(n===0){f.m.write(f.b.locals.ph,20n);f.m.write(f.b.locals.pv,30n);}};f.run();assert.equal(f.high.read('locr',K.KHPOS),16n);assert.equal(f.high.read('locr',K.KVPOS),26n);assert.equal(f.views.high.board.disp(26,16),500);
});
test('Statement TELL composes RADIO OFF and untimed command slot 26 with raw queue creation',()=>{
  const f=fixture('RADIO OFF/TELL N; text');finish(f.radio.run());assert.equal(f.high.read('nomsg'),1n);finish(f.tokens.run());const ctx={who:1,player:-1n,ptime:91n,shared:{players:f.views.high.players}};finish(dispatchCommand(ctx,26,{*getcmd(){throw new Error('GETCMD');},*quit(){throw new Error('QUIT');},*leave(){throw new Error('LEAVE');},*finishTurn(){throw new Error('timed turn');},movementContinuation(){throw new Error('movement');},*invoke(call){assert.deepEqual(call,{routine:'tell'});yield*f.b.run();}}));assert.equal(ctx.ptime,91n);assert.equal(f.high.read('nomsg'),0n);assert.equal(f.receive(2).text,' text\r\n');
});
test('Statement TELL raw IRAN consumes the shared SEED and skips relocation after result two',()=>{
  const f=fixture('TELL ROM'),iran=f.b.io.iran;f.speech();f.b.io.iran=iran;finish(f.b.random.setran(1n));f.run();assert.equal(f.m.read(f.b.random.s.seed),260543n);assert.deepEqual(f.b.random.events,['imuli','idivi:257','idiv:4']);assert.ok(!f.b.events.some(e=>e.startsWith('ingal:')));
});
test('Statement TELL relocation rejects out-of-galaxy coordinates before reading board cells',()=>{
  const f=fixture('TELL ROM');f.speech();f.b.io.iran=function*(){return 1n;};f.high.write('shpcon',1n,1,K.KVPOS);f.high.write('shpcon',1n,1,K.KHPOS);f.high.write('locr',50n,K.KVPOS);f.high.write('locr',50n,K.KHPOS);f.views.high.board.setdsp(1,1,101);f.run();assert.equal(f.b.events.find(e=>e.startsWith('ingal:')),'ingal:-3,-3');assert.deepEqual(f.b.events.filter(e=>e.startsWith('disp:')),['disp:1,1','disp:2,1']);assert.equal(f.high.read('locr',K.KVPOS),2n);assert.equal(f.high.read('locr',K.KHPOS),1n);
});
test('Statement TELL diagnostic failure leaves rejected recipient bit and previous gag word intact',()=>{
  const f=fixture('TELL S; text');f.low.write('gagmsg',4n);f.b.io.out=function*(){throw new Error('diagnostic failure');};assert.throws(f.run,/diagnostic failure/);assert.equal(f.low.read('dbits'),4n);assert.equal(f.low.read('gagmsg'),4n);assert.equal(f.m.read(f.b.locals.mask),4n);
});
test('Statement TELL prompt continuation honors required reversed DO policy without fabricating tokens',()=>{
  const f=fixture('TELL');f.b.io.gtkn=function*(){f.low.write('ntok',0n);f.low.write('typlst',BigInt(K.KALF),1);};const enter=f.b.io.enterLoop;let reversed=false;f.b.io.enterLoop=(s,l)=>{if(s>l){reversed=true;return false;}return enter(s,l);};f.run();assert.equal(reversed,true);assert.equal(f.low.read('dbits'),0n);assert.equal(f.m.read(f.b.locals.j),77n);assert.ok(f.output().endsWith(M.tell08.text+'\r\n'));
});
