import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture,driveInitial } from './fixtures/pregame-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { constants as K,messages as M } from '../src/generated/source-data.ts';
import { MAX_INTEGER,MIN_INTEGER } from '../src/compat/word36.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';
function fixture(line='POINTS',who=1n,oflg=0n){
  const f=pregameRuntimeFixture([]);f.editor.feed(line+'\n');finish(f.tokens.run());f.low.write('who',who);f.low.write('oflg',oflg);f.low.write('blank',0n);f.low.write('hcpos',0n);f.high.write('romopt',-1n);
  for(let c=1;c<=K.KNPOIN;c++){for(let p=1;p<=K.KNPLAY;p++)f.high.write('score',0n,c,p);f.high.write('tmscor',0n,1,c);f.high.write('tmscor',0n,2,c);f.high.write('rsr',0n,c);}
  f.high.write('shpcon',2n,1,K.KNTURN);for(let n=1;n<=2;n++)f.high.write('numshp',2n,n);f.high.write('numrom',2n);for(let n=1;n<=3;n++)f.high.write('tmturn',2n,n);
  const before=f.text().length;return {...f,run:()=>finish(f.points.run()),output:()=>f.text().slice(before),totals:()=>[1,2,3,4].map(c=>f.points.po.read('total',c))};
}
for(const oflg of [-1n,0n,1n])test(`Statement POINTS eight categories and total report bytes at verbosity ${oflg}`,()=>{
  const f=fixture('POINTS',1n,oflg);for(let c=1;c<=8;c++)f.high.write('score',BigInt(c*10),c,1);
  const short=["Dam E's  ","E's dest ","Dam B's  ","@'s capt ","B's built","Dam ??'s ","*'s dest ","@'s dest "];
  const medium=['Damage to enemies ','Enemies destroyed ','Damage to bases   ','Planets captured  ','Bases built       ','Damage to Romulans','Stars destroyed   ','Planets destroyed '];
  const long=['Damage to enemies        ','Enemies destroyed  ( 500)','Damage to bases          ','Planets captured   ( 100)','Bases built        (1000)','Damage to Romulans ( 500)','Stars destroyed    ( -50)','Planets destroyed  (-100)'];
  const header=' '.repeat(oflg<0n?14:oflg===0n?24:31)+'Lexington '+(oflg<0n?'':'  '),titles=oflg<0n?short:oflg===0n?medium:long,suffix=oflg<0n?'':'.0';
  const rows=titles.map((t,c)=>t+'          '+(c+1)+suffix).join('\r\n');
  const total=(oflg<0n?'Tot Pts  ':oflg===0n?'Total points:     ':'Total points:            ')+'         36'+suffix;
  const turn=(oflg<0n?'Pts / SD ':oflg===0n?'Pts. / stardate:  ':'Pts. / stardate:         ')+'         18'+suffix;
  f.run();assert.equal(f.output(),'\r\n'+header+'\r\n'+rows+'\r\n\r\n'+total+'\r\n\r\n'+turn+'\r\n');assert.deepEqual(f.totals(),[360n,0n,0n,0n]);
});
for(const [switches,want] of [['ME',[1,0,0,0]],['I',[1,0,0,0]],['HUMANS',[0,1,0,0]],['FED',[0,1,0,0]],['KLINGONS',[0,0,1,0]],['EMPIRE',[0,0,1,0]],['ROMULANS',[0,0,0,1]],['ALL',[1,1,1,1]],['ME FED',[1,1,0,0]]] as const)test(`Statement POINTS raw switch ${switches} selects source columns`,()=>{
  const f=fixture('POINTS '+switches);f.high.write('score',10n,1,1);f.high.write('tmscor',20n,1,1);f.high.write('tmscor',30n,2,1);f.high.write('rsr',40n,1);f.run();assert.deepEqual(f.totals(),want.map((yes,i)=>yes?BigInt((i+1)*10):0n));
});
test('Statement POINTS clears all four totals before an invalid switch abort',()=>{
  const f=fixture('POINTS WRONG');for(let c=1;c<=4;c++)f.points.po.write('total',99n,c);f.run();assert.deepEqual(f.totals(),[0n,0n,0n,0n]);assert.equal(f.output(),M.poin04.text+'\r\n');
});
test('Statement POINTS ordinary entry clears flags while retaining unused OWIDTH',()=>{
  const f=fixture();for(const key of ['fflg','eflg','rflg'])f.points.po.write(key,-1n);f.points.po.write('owidth',77n);f.run();assert.equal(f.points.po.read('iflg'),-1n);assert.equal(f.points.po.read('rflg'),0n);assert.equal(f.points.po.read('owidth'),77n);
});
test('Statement POINTS no-switch pre-game selects only team and enabled Romulan columns',()=>{
  const f=fixture('POINTS',0n);f.high.write('romopt',0n);f.run();assert.deepEqual(['iflg','fflg','eflg','rflg'].map(k=>f.points.po.read(k)),[0n,-1n,-1n,0n]);
});
test('Statement POINTS pre-game ME alone is incorrect input rather than a personal column',()=>{
  const f=fixture('POINTS ME',0n);f.run();assert.equal(f.output(),M.poin04.text+'\r\n');
});
test('Statement POINTS disabled ROMULANS-only request aborts after clearing RFLG',()=>{
  const f=fixture('POINTS ROMULANS');f.high.write('romopt',0n);f.run();assert.equal(f.points.po.read('rflg'),0n);assert.equal(f.output(),M.poin04.text+'\r\n');
});
test('Statement POINTS final entry retains the unresolved DO continuation after flags and total clear',()=>{
  const f=fixture();f.m.write(f.points.dflg,-1n);f.points.po.write('total',55n,1);assert.throws(f.run,/uninitialized POINTS DO/);assert.deepEqual(f.totals(),[0n,0n,0n,0n]);assert.deepEqual(['fflg','eflg','rflg','iflg'].map(k=>f.points.po.read(k)),[-1n,-1n,-1n,-1n]);assert.equal(f.m.read(f.points.i),77n);assert.equal(f.output(),'');
});
test('Statement POINTS explicit final compiler continuation can reach report and populate POLOCL',()=>{
  const f=fixture();f.m.write(f.points.dflg,-1n);f.high.write('score',123n,1,1);f.points.final.continuation=function*(){return false;};f.run();assert.equal(f.totals()[0],123n);assert.equal(f.m.read(f.points.i),9n);
});
test('Statement POINTS final compiler continuation can resume actual token scanning and abort',()=>{
  const f=fixture('POINTS WRONG');f.m.write(f.points.dflg,-1n);f.points.final.continuation=function*(i){f.m.write(i,2n);return true;};f.run();assert.equal(f.output(),M.poin04.text+'\r\n');assert.equal(f.m.read(f.points.i),2n);
});
test('Statement POINTS final entry WHO=0 clears IFLG after setting all flags',()=>{
  const f=fixture('POINTS',0n);f.m.write(f.points.dflg,-1n);assert.throws(f.run,/uninitialized POINTS DO/);assert.equal(f.points.po.read('iflg'),0n);
});
test('Statement POINTS DFLG can alias TOTAL and sees BLKSET before its test',()=>{
  const f=fixture();f.points.po.write('total',-1n,1);finish(f.points.run(f.points.po.address('total',1)));assert.equal(f.points.po.read('iflg'),-1n);assert.equal(f.points.po.read('fflg'),0n);
});
test('Statement POINTS BLKSET failure leaves previous flags and private I untouched',()=>{
  const f=fixture();f.points.po.write('iflg',55n);f.points.io.blkset=function*(){throw new Error('clear fault');};assert.throws(f.run,/clear fault/);assert.equal(f.points.po.read('iflg'),55n);assert.equal(f.m.read(f.points.i),77n);
});
test('Statement POINTS score changes during OFLT affect the later total addition',()=>{
  const f=fixture();f.high.write('score',10n,1,1);const oflt=f.points.io.oflt;f.points.io.oflt=function*(v,w){yield*oflt(v,w);if(v===f.high.address('score',1,1))f.high.write('score',25n,1,1);};f.run();assert.equal(f.totals()[0],25n);assert.ok(f.output().includes('          1.0'));
});
test('Statement POINTS I changes during numeric output affect the separate score reread',()=>{
  const f=fixture();f.high.write('score',10n,1,1);f.high.write('score',90n,2,1);const oflt=f.points.io.oflt;f.points.io.oflt=function*(v,w){yield*oflt(v,w);if(v===f.high.address('score',1,1))f.m.write(f.points.i,2n);};f.run();assert.equal(f.totals()[0],90n);
});
test('POINTS documented V5 row counter keeps eight trips after output changes I',()=>{
  const f=fixture();f.high.write('score',10n,1,1);f.high.write('score',90n,2,1);
  // SCORE(9,1) physically aliases SCORE(1,2). Changing I must not eliminate
  // the eighth trip, even though the resulting index exceeds KNPOIN.
  f.high.write('score',70n,1,2);
  const oflt=f.points.io.oflt;f.points.io.oflt=function*(v,w){yield*oflt(v,w);if(v===f.high.address('score',1,1))f.m.write(f.points.i,2n);};
  f.run();assert.equal(f.totals()[0],160n);assert.equal(f.m.read(f.points.i),10n);
});
test('POINTS final entry cannot reuse an earlier invocation token-loop counter',()=>{
  const f=fixture('POINTS ME');f.run();assert.ok(f.points.frames.has('switches'));
  f.m.write(f.points.dflg,-1n);assert.throws(f.run,/uninitialized POINTS DO/);
});
test('Statement POINTS row title checks OFLG again after the short title output',()=>{
  const f=fixture('POINTS',1n,-1n);f.high.write('score',10n,1,1);const out=f.points.io.out;f.points.io.out=function*(key,n){yield*out(key,n);if(key==='poi11s')f.low.write('oflg',0n);};f.run();assert.ok(f.output().includes(M.poi11s.text+M.poi11l.text));
});
test('Statement POINTS eager compiler AND exposes physical pre-game SCORE(i,0)',()=>{
  const f=fixture('POINTS',0n),read=f.m.read.bind(f.m),address=f.high.address('score',1,0);f.points.io.and=function*(...p){const all:boolean[]=[];for(const term of p)all.push(yield*term());return all.every(Boolean);};f.m.read=function(a){if(a===address)throw new Error('physical score zero read');return read(a);};assert.throws(f.run,/physical score zero read/);
});
test('Statement POINTS short-circuit fixture does not require a pre-game personal-score read',()=>{
  const f=fixture('POINTS',0n),read=f.m.read.bind(f.m),address=f.high.address('score',1,0);f.m.read=function(a){if(a===address)throw new Error('unexpected personal score');return read(a);};f.run();assert.equal(f.totals()[0],0n);
});
test('Statement POINTS division by zero preserves completed totals and count output',()=>{
  const f=fixture('POINTS FED');f.high.write('tmscor',10n,1,1);f.high.write('numshp',0n,1);assert.throws(f.run,/zero|divide/i);assert.equal(f.totals()[1],10n);assert.ok(f.output().includes(M.poi07l.text));
});
test('Statement POINTS total addition retains 36-bit overflow',()=>{
  const f=fixture();f.high.write('score',MAX_INTEGER,1,1);f.high.write('score',1n,2,1);f.run();assert.equal(f.totals()[0],MIN_INTEGER);
});
test('Statement POINTS failed row output does not prematurely add to totals',()=>{
  const f=fixture();f.high.write('score',10n,1,1);f.points.io.oflt=function*(){throw new Error('numeric fault');};assert.throws(f.run,/numeric fault/);assert.deepEqual(f.totals(),[0n,0n,0n,0n]);assert.equal(f.m.read(f.points.i),1n);
});
test('ENDGAM composes POINTS final reporting into the actual shared total used for UPDSTA',()=>{
  const f=fixture();f.high.write('score',123n,1,1);f.high.write('endflg',-1n);f.high.write('nplnet',1n);f.high.write('nbase',1n,1);f.high.write('nbase',1n,2);f.points.final.continuation=function*(){return false;};let total:bigint|undefined;f.endgame.io.updsta=function*(a){total=f.m.read(a[5]);};f.endgame.io.free=function*(){};assert.throws(()=>finish(f.endgame.run()),/EXIT transfer/);assert.equal(total,123n);assert.equal(f.points.po.read('total',1),123n);assert.equal(f.low.read('who'),0n);
});
test('PREGAM POINTS composes report and returns to acquisition',()=>{
  const f=pregameRuntimeFixture(['PREGAME','POINTS FED','ACTIVATE']);f.high.write('numshp',2n,1);f.high.write('tmturn',2n,1);f.high.write('tmscor',30n,1,1);driveInitial(f);assert.equal(f.points.po.read('total',2),30n);assert.ok(f.text().includes(M.poi03l.text));assert.equal(f.m.read(f.pregame.locals.n),1n);
});
test('PREGAM POINTS buffered INI slash path shares score state',()=>{
  const f=pregameRuntimeFixture([]);f.high.write('numshp',2n,2);f.high.write('tmturn',2n,2);f.high.write('tmscor',40n,2,1);f.ini.install();f.ini.load('PREGAME/POINTS EMPIRE/ACTIVATE\n');driveInitial(f);assert.equal(f.points.po.read('total',3),40n);assert.equal(f.editor.events.filter(e=>e==='inchwl').length,0);
});
test('DECWAR slot 15 passes false and composes POINTS without a timed turn',()=>{
  const f=fixture(),ctx={who:1,player:-1n,ptime:99n,shared:{players:f.views.high.players}};f.high.write('score',10n,1,1);finish(dispatchCommand(ctx,15,{
    *getcmd(){throw new Error('unexpected GETCMD');},*quit(){throw new Error('unexpected QUIT');},*invoke(call){assert.deepEqual(call,{routine:'points',argument:false});yield*f.points.run();},*leave(){throw new Error('unexpected leave');},*finishTurn(){throw new Error('unexpected timed turn');},movementContinuation(){throw new Error('unexpected movement');},
  }));assert.equal(ctx.ptime,99n);assert.equal(f.totals()[0],10n);
});
