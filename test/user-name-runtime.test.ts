import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture,driveInitial } from './fixtures/pregame-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { constants as K,messages as M } from '../src/generated/source-data.ts';
import { packSixbit,signed36,unpackSixbit } from '../src/compat/word36.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../src/compat/fortran-call.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';
function fixture(line='SET NAME Alice Smith',index=2n){
  const f=pregameRuntimeFixture([]);f.editor.feed(line+'\n');finish(f.tokens.run());f.low.write('who',1n);f.m.write(f.userName.index,index);
  const names=()=>[f.m.read(f.userName.symbols.name1Base+f.low.read('who')),f.m.read(f.userName.symbols.name2Base+f.low.read('who'))];
  const text=()=>names().map(unpackSixbit).join(''),before=f.text().length;
  return {...f,names,nameText:text,run:()=>finish(f.userName.run()),output:()=>f.text().slice(before)};
}
test('Raw USRNAM copies twelve raw characters to actual JOB names and discards the command tail',()=>{
  const f=fixture();f.run();assert.equal(f.nameText(),'ALICE SMITH ');assert.equal(f.r.t0,-1n);assert.equal(f.input.pointer,-1n);assert.equal(f.output(),'');assert.deepEqual(f.userName.events.slice(-1),['dmove']);
});
for(const [line,name] of [['SET NAME  Alice',' ALICE      '],['SET NAME,Alice','ALICE       '],['SET NAME a/B / TYPE','A/B / TYPE  '],['SET NAME ABCDEFGHIJKLMNOP','ABCDEFGHIJKL']] as const)test(`Raw USRNAM preserves physical name from ${line}`,()=>{
  const f=fixture(line);f.run();assert.equal(f.nameText(),name);assert.equal(f.input.pointer,-1n);
});
test('Raw USRNAM literal zero starts at LINBUF regardless of current token pointers',()=>{
  const f=fixture('Alice Smith',0n);f.low.write('ptrlst',99999n,1);f.run();assert.equal(f.nameText(),'ALICE SMITH ');
});
test('Raw USRNAM missing delimiter returns false without clearing TMP or loading the pair',()=>{
  const f=fixture('SET NAME');f.m.write(f.userName.symbols.tmp,123n);f.m.write(f.userName.symbols.tmp+1n,456n);const old=f.names();f.run();assert.equal(f.r.t0,0n);assert.equal(f.input.pointer,-1n);assert.deepEqual(f.names(),old);assert.equal(f.m.read(f.userName.symbols.tmp),123n);assert.deepEqual(f.userName.events,[]);
});
test('Raw USRNAM all-space name leaves existing JOB words unchanged but clears TMP',()=>{
  const f=fixture('SET NAME    '),old=f.names();f.run();assert.equal(f.r.t0,0n);assert.deepEqual(f.names(),old);assert.equal(f.m.read(f.userName.symbols.tmp),0n);assert.equal(f.m.read(f.userName.symbols.tmp+1n),0n);assert.equal(f.input.pointer,-1n);
});
test('Raw USRNAM nonzero second word is sufficient when the first six characters are spaces',()=>{
  const f=fixture('SET NAME       A');f.run();assert.equal(f.r.t0,-1n);assert.equal(f.names()[0],0n);assert.equal(f.names()[1],signed36(packSixbit('A')));
});
test('Raw USRNAM WHO=0 writes the preceding physical JOB slots instead of LOCAL identity',()=>{
  const f=fixture();f.low.write('who',0n);const local=Array.from(f.pregame.sharedLocal.identity.words);f.run();assert.equal(f.high.read('job',K.KNPLAY,K.KNAM1-1),signed36(packSixbit('ALICE ')));assert.equal(f.high.read('job',K.KNPLAY,K.KNAM2-1),signed36(packSixbit('SMITH ')));assert.deepEqual(Array.from(f.pregame.sharedLocal.identity.words),local);
});
test('Raw USRNAM does not reject a token index outside NTOK when PTRLST memory exists',()=>{
  const f=fixture();f.m.write(f.userName.index,3n);f.low.write('ptrlst',f.low.read('ptrlst',2),3);f.low.write('ntok',1n);f.run();assert.equal(f.nameText(),'ALICE SMITH ');
});
test('Raw USRNAM uses current CBITS delimiter bits rather than a fixed whitespace list',()=>{
  const f=fixture('SET NAME/Alice');const a=f.userName.symbols.cbits+47n;f.m.write(a,f.m.read(a)|f.userName.symbols.delimiter);f.run();assert.equal(f.nameText(),'ALICE       ');
});
test('Raw USRNAM ordinary slash is not a delimiter while finding the preceding token end',()=>{
  const f=fixture('SET NAME/Alice');f.run();assert.equal(f.r.t0,0n);assert.deepEqual(f.userName.events,[]);assert.equal(f.input.pointer,-1n);
});
for(const [code,six] of [[9n,41n],[31n,63n],[32n,0n],[64n,32n],[95n,63n],[96n,32n],[97n,33n],[127n,63n],[160n,96n]] as const)test(`Raw USRNAM character word ${code} keeps source arithmetic before six-bit deposit`,()=>{
  const f=fixture('A',0n);f.m.write(f.input.lineAddress,code);const idpb=f.userName.io.idpb;let seen:bigint|undefined;f.userName.io.idpb=function*(){seen=f.r.c;yield*idpb();};f.run();assert.equal(seen,six);assert.equal(f.m.read(f.userName.symbols.tmp),signed36((six&63n)<<30n));
});
test('Raw USRNAM resolves ARG after T0 initialization, retaining physical argument aliases',()=>{
  const f=fixture('Alice',2n);finish(f.userName.run(0n));assert.equal(f.nameText(),'ALICE       ');assert.equal(f.r.t0,-1n);
});
test('Raw USRNAM copies actual line memory changed while IDPB is suspended',()=>{
  const f=fixture('SET NAME Alice'),idpb=f.userName.io.idpb;let calls=0;f.userName.io.idpb=function*(){yield*idpb();if(++calls===1)yield 'first-byte';};const g=f.userName.run();assert.equal(g.next().value,'first-byte');f.m.write(f.r.p1+1n,90n);finish(g);assert.equal(f.nameText(),'AZICE       ');
});
test('Raw USRNAM DMOVE is a required CPU boundary and WHO is read after it returns',()=>{
  const f=fixture(),dmove=f.userName.io.dmove;f.userName.io.dmove=function*(){yield*dmove();yield 'pair-loaded';};const old1=f.names();const g=f.userName.run();assert.equal(g.next().value,'pair-loaded');assert.equal(f.r.t0,0n);f.low.write('who',2n);finish(g);assert.equal(f.nameText(),'ALICE SMITH ');assert.deepEqual([f.high.read('job',1,K.KNAM1),f.high.read('job',1,K.KNAM2)],old1);
});
test('Raw USRNAM DMOVE can supply the current pair rather than a cached host name',()=>{
  const f=fixture();f.userName.io.dmove=function*(){f.r.t1=0n;f.r.t2=99n;};f.run();assert.deepEqual(f.names(),[0n,99n]);assert.equal(f.r.t0,-1n);
});
test('Raw USRNAM failure during IDPB retains partial TMP and does not discard BUFPTR',()=>{
  const f=fixture('SET NAME Alice/HELP'),idpb=f.userName.io.idpb,ptr=f.input.pointer;let calls=0;f.userName.io.idpb=function*(){yield*idpb();if(++calls===2)throw new Error('byte fault');};assert.throws(f.run,/byte fault/);assert.equal(f.input.pointer,ptr);assert.equal(f.r.t0,0n);assert.equal(f.m.read(f.userName.symbols.tmp),signed36(packSixbit('AL')));
});
test('Raw USRNAM failed DMOVE retains copied TMP and the command tail',()=>{
  const f=fixture('SET NAME Alice/HELP'),ptr=f.input.pointer;f.userName.io.dmove=function*(){throw new Error('pair fault');};assert.throws(f.run,/pair fault/);assert.equal(f.input.pointer,ptr);assert.equal(f.m.read(f.userName.symbols.tmp),signed36(packSixbit('ALICE/')));
});
test('Raw USRNAM second JOB write failure preserves first write and true result without clearing tail',()=>{
  const f=fixture('SET NAME Alice/HELP'),ptr=f.input.pointer;f.userName.symbols.name2Base=200000n;assert.throws(f.run,/Unmapped|unmapped/);assert.equal(f.high.read('job',1,K.KNAM1),signed36(packSixbit('ALICE/')));assert.equal(f.r.t0,-1n);assert.equal(f.input.pointer,ptr);
});
test('Raw USRNAM does not save and restore P1/P2, C or the name pair registers',()=>{
  const f=fixture('Alice',0n),s=f.r.s,p=f.r.p;f.r.p1=77n;f.r.p2=88n;f.run();assert.equal(f.r.s,s);assert.equal(f.r.p,p);assert.equal(f.r.p1,f.input.lineAddress+5n);assert.notEqual(f.r.p2,88n);assert.equal(f.r.c,0n);assert.equal(f.r.t1,f.names()[0]);
});
test('Raw USRNAM uses live ARG descriptor selection rather than its fixture argument',()=>{
  const f=fixture('Alice',2n),g=f.userName.run();loadArgumentBlock(f.m,23250n,[f.userName.zero]);selectArgumentBlock(f.r,23250n);finish(g);assert.equal(f.nameText(),'ALICE       ');
});
test('Raw USRNAM first JOB destination aliasing T3 affects the second indexed write',()=>{
  const f=fixture('A',0n);f.userName.symbols.name1Base=2n;const first=signed36(packSixbit('A')),target=f.userName.symbols.name2Base+(first&0o777777n);f.run();assert.equal(f.r.t3,first);assert.equal(f.m.read(target),0n);
});
test('Raw USRNAM skips exactly one delimiter and preserves a tab within the copied name',()=>{
  const f=fixture('SET NAME a\tb');f.run();assert.equal(f.nameText(),'AIB         ');
});
test('PREGAM SET NAME composes raw USRNAM and retains WHO=0 physical JOB writes',()=>{
  const f=pregameRuntimeFixture(['PREGAME','SET NAME Alice Smith','ACTIVATE']);driveInitial(f);assert.equal(f.low.read('who'),0n);assert.equal(f.high.read('job',K.KNPLAY,K.KNAM1-1),signed36(packSixbit('ALICE ')));assert.equal(f.high.read('job',K.KNPLAY,K.KNAM2-1),signed36(packSixbit('SMITH ')));assert.equal(f.pregame.sharedLocal.identity.words[1],signed36(packSixbit('PLAYER')));
});
test('PREGAM SET NAME missing raw name prompts and passes literal zero to the same routine',()=>{
  const f=pregameRuntimeFixture(['PREGAME','SET NAME','Bob Jones','ACTIVATE']);driveInitial(f);assert.ok(f.text().includes(M.set002.text));assert.equal(f.high.read('job',K.KNPLAY,K.KNAM1-1),signed36(packSixbit('BOB JO')));assert.equal(f.high.read('job',K.KNPLAY,K.KNAM2-1),signed36(packSixbit('NES')));
});
test('PREGAM SET NAME copies slash tail into name and prevents its command dispatch',()=>{
  const f=pregameRuntimeFixture(['PREGAME','SET NAME Alice/TYPE OUTPUT','ACTIVATE']);driveInitial(f);assert.ok(!f.pregame.events.includes('type'));assert.equal(f.high.read('job',K.KNPLAY,K.KNAM1-1),signed36(packSixbit('ALICE/')));assert.equal(f.high.read('job',K.KNPLAY,K.KNAM2-1),signed36(packSixbit('TYPE O')));
});
test('PREGAM SET NAME blank prompted line does not reprompt or change JOB names',()=>{
  const f=pregameRuntimeFixture(['PREGAME','SET NAME','','ACTIVATE']),old=f.high.read('job',K.KNPLAY,K.KNAM1-1);driveInitial(f);assert.equal(f.high.read('job',K.KNPLAY,K.KNAM1-1),old);assert.equal(f.set.events.filter(e=>e==='set002').length,1);
});
test('PREGAM SET NAME buffered INI path uses raw line words and returns to acquisition',()=>{
  const f=pregameRuntimeFixture([]);f.ini.install();f.ini.load('PREGAME\nSET NAME Alice Smith\nACTIVATE\n');driveInitial(f);assert.equal(f.high.read('job',K.KNPLAY,K.KNAM1-1),signed36(packSixbit('ALICE ')));assert.equal(f.editor.events.filter(e=>e==='inchwl').length,0);
});
test('DECWAR SET NAME composes raw USRNAM into the current player JOB row without a timed turn',()=>{
  const f=fixture(),ctx={who:1,player:-1n,ptime:99n,shared:{players:f.views.high.players}};finish(dispatchCommand(ctx,20,{
    *getcmd(){throw new Error('unexpected GETCMD');},*quit(){throw new Error('unexpected QUIT');},*invoke(call){assert.deepEqual(call,{routine:'set'});yield*f.set.run();},*leave(){throw new Error('unexpected leave');},*finishTurn(){throw new Error('unexpected timed turn');},movementContinuation(){throw new Error('unexpected movement');},
  }));assert.equal(f.nameText(),'ALICE SMITH ');assert.equal(ctx.ptime,99n);assert.equal(f.input.pointer,-1n);
});
