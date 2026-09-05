import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture } from './fixtures/pregame-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { constants as K,messages as M,ships } from '../src/generated/source-data.ts';
import { localLayout } from '../src/generated/local-layout.ts';
import { halfWords,packAscii,rightHalf } from '../src/compat/word36.ts';
import { messageText } from '../src/game/message-queue.ts';
function fixture(){
  const f=pregameRuntimeFixture([]),b=f.outMessage,q=f.getHit.queues.message;f.low.write('who',2n);f.low.write('oflg',0n);f.low.write('blank',0n);f.low.write('hcpos',0n);f.low.write('gagmsg',0n);f.low.write('dbits',777n);f.low.write('dispfr',999n);
  for(const ship of ships){f.high.write('msgflg',0n,ship.id);f.high.write('names',packAscii(ship.symbol),ship.id,3);}
  const queue=(from=101n,bits=2n,text='Hello')=>{f.low.write('dispfr',from);f.low.write('dbits',bits);f.h.put(f.makeMessage.string,text);finish(f.makeMessage.run());};
  const before=f.text().length;
  return {...f,b,q,queue,run:()=>finish(b.run()),output:()=>f.text().slice(before),stored:()=>messageText(Array.from({length:16},(_,i)=>f.m.read(b.om.address('msg',i+1))))};
}
test('Statement OUTMSG prints raw queued message bytes and clears delivery registers on exit',()=>{
  const f=fixture();f.queue();f.run();assert.equal(f.output(),'\r\nMessage from L to  N\r\nHello\r\n\r\n');assert.equal(f.high.read('msgflg',2),0n);assert.equal(f.low.read('dbits'),0n);assert.equal(f.low.read('dispfr'),0n);assert.equal(f.q.header,-1n);assert.equal(f.stored(),'Hello\r\n');assert.equal(f.b.om.base,BigInt(localLayout.message.address));
});
for(const format of [-1n,0n,1n])test(`Statement OUTMSG renders the raw sender at verbosity ${format}`,()=>{
  const f=fixture();f.low.write('oflg',format);f.queue(210n);f.run();assert.equal(f.output(),M.mess01.text+(format>0n?'Wolf':'W')+' '+M.mess02.text+' N\r\nHello\r\n\r\n');
});
test('Statement OUTMSG prints all queued messages in linked order',()=>{
  const f=fixture();f.queue(101n,2n,'First');f.queue(203n,2n,'Second');f.run();assert.equal(f.output(),M.mess01.text+'L to  N\r\nFirst\r\n\r\n'+M.mess01.text+'S to  N\r\nSecond\r\n\r\n');assert.equal(f.b.events.filter(e=>e==='getmsg').length,2);assert.equal(f.stored(),'Second\r\n');
});
test('Statement OUTMSG gagged message is removed and later eligible message still prints',()=>{
  const f=fixture();f.queue(101n,2n,'Hidden');f.queue(203n,2n,'Visible');f.low.write('gagmsg',1n);f.run();assert.equal(f.output(),M.mess01.text+'S to  N\r\nVisible\r\n\r\n');assert.equal(f.high.read('msgflg',2),0n);assert.equal(f.q.header,-1n);assert.equal(f.low.read('gagmsg'),1n);
});
test('Statement OUTMSG gagging uses current BITS values instead of generated masks',()=>{
  const f=fixture();f.queue(101n);f.high.write('bits',64n,1);f.low.write('gagmsg',64n);f.run();assert.equal(f.output(),'');assert.equal(f.high.read('msgflg',2),0n);assert.equal(f.stored(),'Hello\r\n');
});
test('Statement OUTMSG Romulan sender uses the physical BITS zero alias',()=>{
  const f=fixture();f.queue(500n);f.high.write('bits',32n,0);f.low.write('gagmsg',32n);f.run();assert.equal(f.output(),'');assert.equal(f.q.header,-1n);
});
test('Statement OUTMSG zero sender bypasses gagging and header output',()=>{
  const f=fixture();f.queue(0n);f.low.write('gagmsg',-1n);f.run();assert.equal(f.output(),'Hello\r\n\r\n');assert.equal(f.m.read(f.b.locals.k),77n);assert.equal(f.m.read(f.b.locals.i),77n);
});
test('Statement OUTMSG sentinel sender decoded by GETMSG also bypasses the header',()=>{
  const f=fixture();f.queue(-1n);f.run();assert.equal(f.output(),'Hello\r\n\r\n');assert.ok(!f.b.events.includes('odisp'));
});
test('Statement OUTMSG ignores receiver radio damage NOMSG and ALIVE after queueing',()=>{
  const f=fixture();f.queue();f.high.write('nomsg',2n);f.high.write('alive',0n,2);f.high.write('shpdam',BigInt(K.KCRIT),2,K.KDRAD);f.run();assert.ok(f.output().includes('Hello'));assert.equal(f.high.read('nomsg'),2n);
});
test('Statement OUTMSG renders recipient symbols from NAMES column three',()=>{
  const f=fixture();f.queue(101n,6n);f.high.write('names',packAscii('!?rst'),2,3);f.high.write('names',packAscii('XYrst'),3,3);f.run();assert.equal(f.output(),M.mess01.text+'L to !?XY\r\nHello\r\n\r\n');assert.equal(f.high.read('msgflg',3),1n);assert.equal(rightHalf(f.q.links[0]),4n);
});
test('Statement OUTMSG recipient list uses only KNPLAY bits without clipping queue metadata',()=>{
  const f=fixture();f.queue(101n,4098n);f.run();assert.equal(f.output(),M.mess01.text+'L to  N\r\nHello\r\n\r\n');assert.equal(rightHalf(f.q.links[0]),4096n);
});
test('Statement OUTMSG GETMSG all-recipient sentinel prints no recipients after raw decoding',()=>{
  const f=fixture();f.queue(101n,0o777777n);f.run();assert.equal(f.output(),M.mess01.text+'L to \r\nHello\r\n\r\n');assert.equal(f.high.read('msgflg',2),0n);
});
test('Statement OUTMSG no pending messages clears registers but preserves OMLOCL and locals',()=>{
  const f=fixture();f.h.put(f.b.om.base,'Persistent');f.run();assert.equal(f.output(),'');assert.equal(f.low.read('dbits'),0n);assert.equal(f.low.read('dispfr'),0n);assert.equal(f.stored(),'Persistent');assert.equal(f.m.read(f.b.locals.i),77n);assert.equal(f.m.read(f.b.locals.k),77n);
});
for(const count of [-1n,1n])test(`Statement OUTMSG stale count ${count} prints the retained buffer after GETMSG miss`,()=>{
  const f=fixture();f.h.put(f.b.om.base,'Old text\r\n');f.high.write('msgflg',count,2);f.run();assert.equal(f.output(),'Old text\r\n\r\n');assert.equal(f.high.read('msgflg',2),0n);assert.equal(f.low.read('dispfr'),0n);assert.equal(f.stored(),'Old text\r\n');
});
test('Statement OUTMSG preserves consumed buffer across calls including a subsequent stale count',()=>{
  const f=fixture();f.queue(0n,2n,'Last');f.run();f.high.write('msgflg',1n,2);f.run();assert.equal(f.output(),'Last\r\n\r\nLast\r\n\r\n');
});
test('Statement OUTMSG separate initial assignments can suspend before clearing DISPFR',()=>{
  const f=fixture(),assign=f.b.io.assign;f.b.io.assign=function*(a,t,v){yield*assign(a,t,v);if(a()===f.low.address('dbits'))yield 'dbits';};const g=f.b.run();assert.equal(g.next().value,'dbits');assert.equal(f.low.read('dbits'),0n);assert.equal(f.low.read('dispfr'),999n);finish(g);assert.equal(f.low.read('dispfr'),0n);
});
test('Statement OUTMSG passes WHO as a live argument to GETMSG after suspension',()=>{
  const f=fixture();f.queue(101n,4n,'Ship three');f.high.write('msgflg',1n,2);const get=f.b.io.getmsg;f.b.io.getmsg=function*(a,b){assert.equal(a,f.low.address('who'));assert.equal(b,f.b.om.base);yield 'getmsg';yield*get(a,b);};const g=f.b.run();assert.equal(g.next().value,'getmsg');f.low.write('who',3n);finish(g);assert.ok(f.output().includes('Ship three'));assert.equal(f.high.read('msgflg',2),1n);assert.equal(f.high.read('msgflg',3),0n);
});
test('Statement OUTMSG required MOD policy receives signed sender and divisor without range guards',()=>{
  const f=fixture();f.high.write('msgflg',1n,2);f.b.io.getmsg=function*(){f.high.write('msgflg',0n,2);f.low.write('dispfr',-101n);f.low.write('dbits',0n);};f.high.write('bits',8n,-1);f.low.write('gagmsg',8n);const mod=f.b.io.mod;let args:bigint[]=[];f.b.io.mod=function*(a,b){const x=yield*a.evaluate(),y=yield*b.evaluate();args=[x,y];return yield*mod({type:'integer',evaluate:function*(){return x;}},{type:'integer',evaluate:function*(){return y;}});};f.run();assert.deepEqual(args,[-101n,100n]);assert.equal(f.output(),'');
});
test('Statement OUTMSG ODISP rereads actual DISPFR after the header prefix changes it',()=>{
  const f=fixture();f.queue();const out=f.b.io.out;f.b.io.out=function*(key,n){yield*out(key,n);if(key==='mess01')f.low.write('dispfr',210n);};f.run();assert.ok(f.output().startsWith(M.mess01.text+'W to '));
});
test('Statement OUTMSG recipient DBITS is read after the to-prefix output returns',()=>{
  const f=fixture();f.queue();const out=f.b.io.out;f.b.io.out=function*(key,n){yield*out(key,n);if(key==='mess02')f.low.write('dbits',4n);};f.run();assert.equal(f.output(),M.mess01.text+'L to  S\r\nHello\r\n\r\n');
});
test('Statement OUTMSG recipient loop increments the live K after OUT2C returns',()=>{
  const f=fixture();f.queue(101n,6n);const out=f.b.io.out2c;let first=true;f.b.io.out2c=function*(a){yield*out(a);if(first){first=false;f.m.write(f.b.locals.k,4n);}};f.run();assert.equal(f.output(),M.mess01.text+'L to  N\r\nHello\r\n\r\n');assert.equal(f.m.read(f.b.locals.k),2048n);
});
test('Statement OUTMSG buffer output reads current OMLOCL after the header newline',()=>{
  const f=fixture();f.queue();const crlf=f.b.io.crlf;f.b.io.crlf=function*(){yield*crlf();f.h.put(f.b.om.base,'Changed');};f.run();assert.equal(f.output(),M.mess01.text+'L to  N\r\nChanged\r\n');
});
test('Statement OUTMSG header failure leaves removed message and decoded registers intact',()=>{
  const f=fixture();f.queue();f.b.io.out=function*(){throw new Error('header fault');};assert.throws(f.run,/header fault/);assert.equal(f.high.read('msgflg',2),0n);assert.equal(f.q.header,-1n);assert.equal(f.low.read('dispfr'),101n);assert.equal(f.low.read('dbits'),2n);assert.equal(f.stored(),'Hello\r\n');
});
test('Statement OUTMSG buffer failure preserves received text and decoded registers',()=>{
  const f=fixture();f.queue();f.b.io.outBuffer=function*(){throw new Error('body fault');};assert.throws(f.run,/body fault/);assert.equal(f.output(),M.mess01.text+'L to  N\r\n');assert.equal(f.low.read('dbits'),2n);assert.equal(f.low.read('dispfr'),101n);assert.equal(f.q.header,-1n);
});
test('Statement OUTMSG prints a newly queued message on its next loop iteration',()=>{
  const f=fixture();f.queue(0n,2n,'First');const out=f.b.io.outBuffer;let first=true;f.b.io.outBuffer=function*(a,n){yield*out(a,n);if(first){first=false;f.queue(0n,2n,'Second');}};f.run();assert.equal(f.output(),'First\r\n\r\nSecond\r\n\r\n');assert.equal(f.high.read('msgflg',2),0n);
});
test('Statement OUTMSG raw queue search failure prints old OMLOCL and leaves link available',()=>{
  const f=fixture();f.queue();f.h.put(f.b.om.base,'Old');const search=f.getMessage.io.search;f.getMessage.io.search=function*(){return false;};f.run();assert.equal(f.output(),'Old\r\n');assert.equal(rightHalf(f.q.links[0]),2n);assert.equal(f.high.read('msgflg',2),0n);f.getMessage.io.search=search;
});
test('Statement OUTMSG raw GETMSG removal failure retains copied OMLOCL before any output',()=>{
  const f=fixture();f.queue();f.getMessage.io.remove=function*(){throw new Error('remove fault');};assert.throws(f.run,/remove fault/);assert.equal(f.output(),'');assert.equal(f.stored(),'Hello\r\n');assert.equal(rightHalf(f.q.links[0]),2n);assert.equal(f.low.read('dispfr'),101n);
});
test('TELL raw message creation composes OUTMSG sender recipients and text bytes',()=>{
  const f=fixture();f.editor.feed('TELL N; Hi there\n');finish(f.tokens.run());f.low.write('who',1n);f.low.write('rptflg',0n);f.high.write('alive',-1n,2);f.high.write('shpdam',0n,2,K.KDRAD);for(const s of ships)f.high.write('names',packAscii(s.name.toUpperCase().slice(0,5)),s.id,1);finish(f.tell.run());const before=f.text().length;f.low.write('who',2n);f.run();assert.equal(f.text().slice(before),M.mess01.text+'L to  N\r\n Hi there\r\n\r\n');assert.equal(f.q.header,-1n);
});
for(const format of [-1n,0n,1n])test(`Raw seeded ROMSPK MAKMSG OUTMSG composition renders speech at verbosity ${format}`,()=>{
  const f=fixture();f.low.write('oflg',format);f.high.write('bits',0n,0);f.romulanSpeech.nodes.push(0n);finish(f.tell.random.setran(1n));finish(f.romulanSpeech.run());finish(f.makeMessage.run([f.romulanSpeech.buffer]));f.run();assert.equal(f.output(),M.mess01.text+(format>0n?'Romulan':'??')+' to  N\r\nYou will witness my vengence, idiotic human toad!\r\n\r\n');assert.equal(f.q.header,-1n);assert.equal(f.low.read('dbits'),0n);assert.equal(f.high.read('msgflg',2),0n);
});
