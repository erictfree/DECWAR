import test from 'node:test';
import assert from 'node:assert/strict';
import { commonLayout } from '../src/generated/common-layout.ts';
import { commonLayouts } from '../tools/common.ts';
import { AddressSpace, CommonBlock, wordArray } from '../src/compat/memory.ts';
import { highState, lowState, timerState } from '../src/game/common-state.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { signed36, packAscii, MAX_INTEGER, MIN_INTEGER } from '../src/compat/word36.ts';
import { repair } from '../src/game/repair.ts';
import type { Ship } from '../src/game/ship.ts';
import { initialShip } from '../src/game/ship.ts';
import { emptyHit, HitQueue } from '../src/game/hit-queue.ts';
import { outHit } from '../src/game/out-hit.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { MessageQueue, makeMessage } from '../src/game/message-queue.ts';
import { debug, DebugRegisters } from '../src/game/debug.ts';
import { finishTurn } from '../src/game/turn.ts';
import { place, PlacementLocals } from '../src/game/place.ts';
import { freeShip, SavedShip } from '../src/game/lifecycle.ts';
import { weaponFixture, done } from './support/weapon-damage-fixture.ts';
import { weaponDamage } from '../src/game/weapon-damage.ts';

function fixture(words=Array<bigint>(2922).fill(0n)) {
  const space=new AddressSpace(),lowWords=Array<bigint>(128).fill(0n);space.map(0o400010n,words);space.map(0o140n,lowWords);
  const high=new CommonBlock(space,'hiseg'),low=new CommonBlock(space,'lowseg');
  const policy={logical:(w:bigint)=>w!==0n,trueWord:-1n,falseWord:0n}; // Explicit fixture compiler contract.
  const h=highState(high,policy),l=lowState(low),out=new TerminalOutput();return{space,high,low,words,lowWords,h,l,out};
}

function initialize(ship:Ship, changes:Partial<Ship>={}) {const {devices,...scalars}=initialShip();Object.assign(ship,scalars,changes);ship.devices.fill(0n,1);}

test('COMMON layouts are regenerated from FORTRAN, independently checked assembly dimensions and supplied link sizes',()=>{
  assert.deepEqual(commonLayout,commonLayouts(K));assert.equal(commonLayout.hiseg.words,2922);assert.equal(commonLayout.lowseg.words,128);
  assert.equal(commonLayout.hiseg.fields.hilst.type,'implicit-integer');assert.equal(commonLayout.hiseg.fields.hilst.assembly.type,'integer');
  assert.equal(commonLayout.lowseg.fields.inflag.assembly.name,'inwait');assert.equal(commonLayout.hiseg.fields.hilst.assembly.name,'hi.lst');
});

test('memory views never initialize caller-owned words or manufacture initial ships',()=>{
  const f=fixture(Array<bigint>(2922).fill(123n));assert.equal(f.h.players[1].ship.energy,123n);assert.equal(f.h.scores.numrom,123n);
  assert.equal(f.h.bases[2][1].strength,123n);assert.ok(f.words.every(n=>n===123n));
});

test('address spaces share high backing words but keep each job LOWSEG separate',()=>{
  const a=fixture(),b=fixture(a.words);a.h.players[6].ship.energy=777n;assert.equal(b.h.players[6].ship.energy,777n);
  a.l.hit.ihita=888n;assert.equal(b.l.hit.ihita,0n);b.h.values.rom=-1n;assert.equal(a.h.values.rom,-1n);
});

test('source addresses use 18-bit wrapping, signed words and explicit unmapped-memory errors',()=>{
  const s=new AddressSpace(),words=[0n];s.map(0n,words);s.write(1n<<18n,MAX_INTEGER+1n);assert.equal(s.read(0n),MIN_INTEGER);
  assert.throws(()=>s.read(1n),/Unmapped source address 1/);assert.throws(()=>s.map(0n,[0n]),/Overlapping/);
  assert.throws(()=>s.map(0o777777n,[0n,0n]),/outside/);assert.equal(words[0],MIN_INTEGER);
});

test('COMMON explicit rank errors differ from legal physical out-of-range aliases',()=>{
  const f=fixture();assert.throws(()=>f.high.address('base',1,1),/rank/);assert.throws(()=>f.high.address('unknown'),/Unknown/);
  assert.equal(f.high.address('shpcon',0,1),f.high.address('hfz'));
  assert.equal(f.high.address('shpcon',11,1),f.high.address('shpcon',1,2));
  assert.equal(f.high.address('sbits',0),0o400010n+2799n);assert.equal(f.high.address('sbits',-1),f.high.address('bits',18));
});

test('ship/device/job view columns use source stride and preserve index-zero neighbors',()=>{
  const f=fixture();const p=f.h.players[3];p.ship.v=12;p.ship.h=34;p.ship.energy=456n;p.ship.devices[4]=999n;p.job[K.KPPN]=0o337000001n;
  assert.equal(f.words[3],12n);assert.equal(f.words[13],34n);assert.equal(f.words[73],456n);assert.equal(f.words[133],999n);
  assert.equal(f.high.read('job',3,4),0o337000001n);assert.equal(p.ppn,0o337000001n);p.name1=packAscii('JIM');assert.equal(f.high.read('job',3,K.KNAM1),signed36(packAscii('JIM')));
  p.ship.devices[0]=321n;assert.equal(f.high.read('shpcon',3,10),321n);
});

test('player zero references real prior column words instead of an unused JS slot',()=>{
  const f=fixture();f.h.players[0].ship.v=17;assert.equal(f.high.read('hfz'),17n);
  f.h.players[0].ship.h=99;assert.equal(f.h.players[10].ship.v,99);
  f.h.players[0].ship.tractor=3;assert.equal(f.h.scores.numrom,3n);
});

test('DOCKED conversion is supplied explicitly and raw words remain accessible',()=>{
  const f=fixture();f.high.write('docked',2n,1);assert.equal(f.h.players[1].ship.docked,true);
  const other=highState(f.high,{logical:n=>n<0n,trueWord:-2n,falseWord:0n});assert.equal(other.players[1].ship.docked,false);
  other.players[1].ship.docked=true;assert.equal(f.high.read('docked',1),-2n);other.players[1].ship.docked=false;assert.equal(f.high.read('docked',1),0n);
});

test('base and planet records bind all four columns with physical team ordering',()=>{
  const f=fixture();Object.assign(f.h.bases[2][4],{v:11,h:22,strength:333n,scanned:444n});
  assert.equal(f.words[234],11n);assert.equal(f.high.read('base',4,2,2),22n);assert.equal(f.high.read('base',4,3,2),333n);assert.equal(f.high.read('base',4,4,2),444n);
  Object.assign(f.h.planets[5],{v:33,h:44,builds:3n,scanned:77n});assert.equal(f.words[2152],33n);assert.equal(f.high.read('locpln',5,4),77n);
});

test('packed BOARD reads and writes the same HISEG words as the raw memory API',()=>{
  const f=fixture();f.h.board.setdsp(1,1,101);f.h.board.setdsp(1,2,206);f.h.board.setdsp(1,3,-1);
  assert.equal(f.high.read('board',1),signed36((101n<<24n)|(206n<<12n)|4095n));
  f.high.write('board',500n<<24n,26);assert.equal(f.h.board.disp(2,1),500);assert.equal(f.h.board.disp(1,3),-1);
  const snap=f.h.board.snapshot();f.h.board.setdsp(1,1,0);assert.notEqual(snap[0],f.high.read('board',1));
});

test('scores, Romulan counters and ship counts remain live aliases across all views',()=>{
  const f=fixture();f.h.scores.setPlayer(8,10,8n);f.h.scores.setTeam(2,8,16n);f.h.scores.romulan[1]=90n;
  assert.equal(f.words[2920],8n);assert.equal(f.high.read('tmscor',2,8),16n);assert.equal(f.high.read('rsr',1),90n);
  f.h.scores.turns[3]=33n;assert.equal(f.h.numshp[0],33n);f.h.numshp[2]=2n;assert.equal(f.h.scores.ships[2],2n);
  f.h.values.numrom=11n;assert.equal(f.h.scores.numrom,11n);f.h.scores.numrom=12n;assert.equal(f.h.values.numrom,12n);
});

test('LOWSEG hit/group/token arrays preserve physical aliases and scalar views',()=>{
  const f=fixture();f.l.hit.shjump=77n;assert.equal(f.l.groups[0].name,77n);f.l.groups[7].bits=99n;assert.equal(f.low.read('group',7,2),99n);
  f.l.tknlst[15]=123n;assert.equal(f.l.vallst[0],123n);f.l.ptrlst[15]=6n;assert.equal(f.l.values.who,6n);
  f.l.tpoint[0]=-1n;assert.equal(f.l.values.player,-1n);Object.assign(f.l.hit,emptyHit(),{dbits:0n});assert.equal(f.lowWords[79],0n);
});

test('source array proxies support real slice/reduce/fill operations without copying the underlying fields',()=>{
  const f=fixture();const devices=f.h.players[1].ship.devices;devices.fill(400n,1);assert.deepEqual(devices.slice(1),Array(9).fill(400n));
  devices[3]=700n;assert.equal(devices.slice(1).reduce((a,b)=>a+b,0n),3900n);
  assert.throws(()=>devices.length=1,/shape/);assert.throws(()=>delete devices[2],/deleted/);
});

test('automatic REPAIR operates on live SHPDAM columns and retains a zero-index SHPCON alias',()=>{
  const f=fixture(),p=f.h.players[1];p.ship.devices.fill(500n,1);p.ship.shieldStrength=999n;
  repair(p.ship,3,[],()=>assert.fail()).finish();for(let i=1;i<=9;i++)assert.equal(f.high.read('shpdam',1,i),200n);assert.equal(p.ship.shieldStrength,999n);
});

test('HFZ through HLZ clearing reaches all mutable fields and leaves locks, tables and scores intact',()=>{
  const f=fixture(Array<bigint>(2922).fill(77n));f.high.clear('hfz','hlz');assert.ok(f.words.slice(0,2641).every(n=>n===0n));assert.ok(f.words.slice(2641).every(n=>n===77n));
  assert.equal(f.h.players[1].ship.energy,0n);assert.equal(f.h.values.numply,77n);assert.equal(f.h.scores.player(1,1),77n);
});

test('LFZ through LLZ clearing preserves the later input/disconnect/trap/width words',()=>{
  const f=fixture();f.lowWords.fill(77n);f.low.clear('lfz','llz');assert.ok(f.lowWords.slice(0,123).every(n=>n===0n));assert.deepEqual(f.lowWords.slice(123),Array(5).fill(77n));
  assert.equal(f.l.hit.ihita,0n);assert.equal(f.l.values.hungup,77n);
});

test('KILQUE search mutates the actual three columns and retains time/teamShip',()=>{
  const f=fixture();f.h.killed.nkill=1;Object.assign(f.h.killed.rows[1],{job:5n,ppn:6n,tty:7n,time:8n,teamShip:206n});
  assert.equal(f.h.killed.search(99n,5n,6n),1);assert.equal(f.high.read('kilque',1,3),99n);assert.equal(f.high.read('kilque',1,4),8n);assert.equal(f.high.read('nkill'),1n);
});

test('BITS zero is the exact prior NAMES word and all remaining bits use actual memory',()=>{
  const f=fixture();f.high.write('names',packAscii('J'),10,3);f.high.write('bits',123n,18);assert.equal(f.h.bits(0),signed36(packAscii('J')));assert.equal(f.h.bits(18),123n);
  f.high.write('sbits',999n,0);assert.equal(f.h.bits(19),999n);
});

test('MAKMSG full word recipient loop increments HISEG neighbors beyond MSGFLG and HITFLG',()=>{
  const f=fixture(),queue=new MessageQueue();f.l.hit.dbits=(1n<<10n)|(1n<<20n)|(1n<<30n);f.l.hit.dispfr=500n;
  done(makeMessage(queue,f.h.players,f.l.hit,'hello',f.out,{*lock(){return true;},unlo(){},incrementCounterOutsidePlayers(i){const ref=f.high.ref('msgflg',i);ref.value++;}}));
  assert.equal(f.h.players[1].hitflg,1n);assert.equal(f.h.numcap[1],1n);assert.equal(f.high.read('tmscor',1,3),1n);
});

test('packed hit queue and OUTHIT consume memory-bound counters and clear the actual LOWSEG registers',()=>{
  const f=fixture(),q=new HitQueue();initialize(f.h.players[6].ship,{v:11,h:20});
  Object.assign(f.l.hit,{iwhat:11n,dispfr:500n,vfrom:10n,hfrom:20n,dbits:32n});q.make(1,f.l.hit,f.h.players,0n,f.out);
  assert.equal(f.high.read('hitflg',6),1n);assert.ok(f.lowWords.slice(63,80).every(n=>n===0n));
  done(outHit({who:6,team:2,oflg:0,ocflg:K.KABS,nomsg:0n,ship:f.h.players[6].ship},f.l.hit,f.h.players,f.out,function*(who){q.get(who,f.l.hit,f.h.players);}));
  assert.equal(f.out.drain(),'??  @10-20\r\n');assert.equal(f.high.read('hitflg',6),0n);
});

test('actual PHADAM/PWR mutates the common-backed ship and Romulan score through supplied arithmetic fixtures',()=>{
  const f=fixture();initialize(f.h.players[6].ship,{v:11,h:20,shieldCondition:-1n});f.h.players[6].alive=-1n;f.h.board.setdsp(11,20,206);
  const d=weaponFixture({players:f.h.players,board:f.h.board,hit:f.l.hit,bases:f.h.bases,world:{rom:-1n,locr:f.h.locr},tpoint:f.l.tpoint});d.draws.push('0','0');
  done(weaponDamage('phadam',{value:2n},{value:6n},{value:1n},{value:200n},{value:-1n},{...d.ctx,player:0n,rsr:f.h.scores.romulan},d.local,f.l.hit,d.io));
  assert.equal(f.high.read('shpcon',6,K.KSNRGY),35600n);assert.equal(f.high.read('shpcon',6,K.KSDAM),14400n);assert.equal(f.high.read('rsr',K.KPEDAM),14400n);
});

test('PLACE uses shared BOARD and LOCR references without separate position copies',()=>{
  const f=fixture(),draws=[10n,20n];place({board:f.h.board,nbase:f.h.nbase,numcap:f.h.numcap,nplnet:0,bases:f.h.bases,planets:f.h.planets},{value:501n},{value:1n},f.high.ref('locr',1),f.high.ref('locr',2),new PlacementLocals(),{iran:()=>draws.shift()!});
  assert.deepEqual(f.h.locr,{v:10,h:20});assert.equal(f.h.board.disp(10,20),501);assert.equal(f.high.read('locr',1),10n);
});

test('DEBUG timer underflow reads mapped HILST and count aliases without a synthetic outside-memory callback',()=>{
  const f=fixture();f.space.map(0o405562n,Array<bigint>(250).fill(0n));const timers=timerState(f.high,0o405562n);timers.write('name',-1n,packAscii('OLD'));
  assert.equal(f.h.values.hilst,signed36(packAscii('OLD')));for(let i=0n;i<50n;i++)timers.write('name',i,65n);
  const output:string[]=[];debug({pasflg:-1n,hungup:0n},timers,new DebugRegisters(),f.out,{outstr:s=>output.push(s),outchr:n=>output.push(String.fromCharCode(Number(n&127n)))});
  assert.ok(output.join('').endsWith('OLD\t65\t0\t0\r\n'));
});

test('finishTurn consumes LOWSEG TPOINT and writes shared score, turn and DOTIME words',()=>{
  const f=fixture();initialize(f.h.players[1].ship);f.h.values.numply=2n;f.h.values.dotime=1n;f.l.tpoint[K.KPEDAM]=123n;
  const world={players:f.h.players,scores:f.h.scores,get dotime(){return f.h.values.dotime;},set dotime(n){f.h.values.dotime=n;},get numply(){return f.h.values.numply;},get romopt(){return f.h.values.romopt;}};
  const calls:string[]=[];done(finishTurn({who:1,team:1,prtype:1,player:-1n,tpoint:f.l.tpoint,shared:world},true,f.out,{
    *repair(){repair(f.h.players[1].ship,3,[],()=>assert.fail()).finish();},*baspha(){calls.push('base');},*plnatk(){calls.push('planet');},*basbld(){calls.push('rebuild');},*romdrv(){assert.fail();},
  }));
  assert.equal(f.high.read('score',K.KPEDAM,1),123n);assert.equal(f.high.read('tmscor',1,K.KPEDAM),123n);assert.equal(f.low.read('tpoint',K.KPEDAM),0n);
  assert.equal(f.high.read('shpcon',1,K.KNTURN),1n);assert.equal(f.high.read('tmturn',1),1n);assert.equal(f.high.read('dotime'),0n);assert.deepEqual(calls,['base','planet','rebuild']);
});

test('FREE composes common-backed player, killed queue, saved ship and source population writes',()=>{
  const f=fixture();initialize(f.h.players[1].ship,{v:10,h:20});f.h.players[1].alive=-1n;f.h.players[1].job[K.KJOB]=123n;f.h.players[1].job[K.KPPN]=456n;f.h.players[1].job[K.KTTYN]=789n;
  f.h.values.numply=1n;f.h.numsid[1]=1n;f.h.board.setdsp(10,20,101);const saved=new SavedShip();
  const world={players:f.h.players,board:f.h.board,killed:f.h.killed,numsid:f.h.numsid,get numply(){return f.h.values.numply;},set numply(n){f.h.values.numply=n;},get endflg(){return f.h.values.endflg;},get hitime(){return f.h.values.hitime;},set hitime(n){f.h.values.hitime=n;}};
  done(freeShip(world,saved,f.l.hit,1,{*lock(){return true;},unlock(){},daytime:()=>1000n,*trcoff(){assert.fail();},*gethit(){assert.fail();},*getmsg(){assert.fail();}}));
  assert.equal(f.high.read('alive',1),1n);assert.equal(f.high.read('numply'),0n);assert.equal(f.high.read('hitime'),301000n);assert.equal(f.high.read('numsid',1),0n);
  assert.equal(f.high.read('kilque',1,1),123n);assert.equal(f.high.read('kilque',1,2),456n);assert.equal(f.high.read('kilque',1,3),789n);assert.equal(f.high.read('kilque',1,4),1000n);
  assert.equal(f.high.read('shpcon',1,K.KSNRGY),0n);assert.equal(saved.tshpco[K.KSNRGY],50000n);assert.equal(f.high.read('job',1,K.KPPN),0n);assert.equal(saved.tjob[K.KPPN],456n);
});

test('memory can span adjacent mapped regions and follows supplied relocation bases',()=>{
  const space=new AddressSpace();space.map(1000n,Array<bigint>(128).fill(0n));space.map(1128n,[77n]);const block=new CommonBlock(space,'lowseg',1000n);
  const tail=wordArray(space,block.address('terwid'),2);tail[0]=12n;assert.deepEqual([...tail],[12n,77n]);
  assert.equal(block.read('terwid'),12n);assert.equal(space.read(1127n),12n);
});

test('OCHR cursor and blank bookkeeping operate directly on LOWSEG and see external register edits',()=>{
  const f=fixture();f.l.output.write('abc');assert.equal(f.low.read('hcpos'),3n);f.l.output.write('\r\n');assert.equal(f.low.read('hcpos'),0n);assert.equal(f.low.read('blank'),0n);
  f.l.values.hcpos=7n;f.l.output.write('x');assert.equal(f.low.read('hcpos'),8n);f.l.values.hcpos=0n;f.l.values.blank=2n;f.l.output.crlf();
  assert.equal(f.l.output.drain(),'abc\r\nx');assert.equal(f.low.read('blank'),2n);
});

test('LOWSEG output binding retains existing bytes and supplied cursor values without clearing either',()=>{
  const f=fixture(),out=new TerminalOutput();out.write('pending');f.low.write('hcpos',12n);f.low.write('blank',3n);
  const state=lowState(f.low,out);assert.equal(state.output.hcpos,12);assert.equal(state.output.blank,3);assert.equal(state.output.drain(),'pending');
});

test('word-reference writes stay attached to source addresses when neighboring storage is changed',()=>{
  const f=fixture(),a=f.high.ref('shpcon',11,1),b=f.high.ref('shpcon',1,2);a.value=99n;assert.equal(b.value,99n);b.value=MAX_INTEGER+1n;
  assert.equal(f.h.players[1].ship.h,Number(MIN_INTEGER));assert.equal(a.value,MIN_INTEGER);
});
