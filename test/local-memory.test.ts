import test from 'node:test';
import assert from 'node:assert/strict';
import { declarationScope } from '../tools/fortran-scope.ts';
import { localLayouts } from '../tools/local-layout.ts';
import { localLayout } from '../src/generated/local-layout.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { commonLayout } from '../src/generated/common-layout.ts';
import { fortranDataWords } from '../src/generated/fortran-data.ts';
import { AddressSpace, CommonBlock } from '../src/compat/memory.ts';
import { localState } from '../src/game/local-state.ts';
import type { RealWordCodec } from '../src/game/local-state.ts';
import { highState, lowState } from '../src/game/common-state.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { CommandInput } from '../src/compat/command-input.ts';
import { setScan, showScan } from '../src/game/scan-screen.ts';
import { listCommand } from '../src/game/list.ts';
import { listLiterals } from '../src/game/list-world.ts';
import { points } from '../src/game/points.ts';
import { check, CheckLocals } from '../src/game/check.ts';
import { ingal, pdist } from '../src/compat/board.ts';
import { orderedRational as real } from './support/rational-real.ts';
import type { Rational } from './support/rational-real.ts';
import { romulanDistance, DistanceLocals } from '../src/game/romulan-target.ts';
import { supernova, SupernovaLocals } from '../src/game/supernova.ts';
import { torpedoes } from '../src/game/torpedoes.ts';
import { torpedoFixture } from './support/torpedo-fixture.ts';
import { freeShip, restartShip } from '../src/game/lifecycle.ts';
import { initialShip } from '../src/game/ship.ts';
import { signed36, packAscii, MAX_INTEGER, MIN_INTEGER } from '../src/compat/word36.ts';

const policy = { logical: (n: bigint) => n < 0n, trueWord: -1n, falseWord: 0n };
function fixture(prior = 0n, sharedHigh?: bigint[]) {
  const space = new AddressSpace(), words = Array<bigint>(0o4473).fill(prior), highWords = sharedHigh ?? Array<bigint>(2922).fill(0n);
  space.map(0n, words); space.map(0o400010n, highWords);
  const state = localState(space), high = new CommonBlock(space, 'hiseg'), low = new CommonBlock(space, 'lowseg');
  return { space, words, highWords, state, high, low, h: highState(high, policy), l: lowState(low), out: new TerminalOutput() };
}
function input(line: string) { const i = new CommandInput(); i.acceptLine(line); i.acquire(new TerminalOutput()); return i; }
function done<T>(g: Generator<unknown, T, void>): T { const r = g.next(); assert.equal(r.done, true); return r.value; }
// Explicit test representation: word IDs identify exact rational objects. This
// is deliberately NOT a PDP-10 floating encoding or a production fallback.
function codec(): RealWordCodec<Rational> {
  const values = new Map<bigint, Rational>();
  return { encode(value) { const id = BigInt(values.size + 1); values.set(id, value); return id; },
    decode(word) { const value = values.get(word); if (!value) throw new Error('Uninitialized fixture real word'); return value; } };
}

test('PARAM implicit INTEGER applies through includes to HILST and private PRECMD', () => {
  assert.deepEqual(declarationScope('HIGH.FOR').type('hilst'), { type: 'implicit-integer', file: 'PARAM.FOR', line: 21 });
  assert.deepEqual(declarationScope('SETUP.FOR', 'XGTCMD').type('precmd'), { type: 'implicit-integer', file: 'PARAM.FOR', line: 21 });
  assert.equal(commonLayout.hiseg.fields.hilst.type, 'implicit-integer');
  assert.ok(fortranDataWords.filter(w => w.scope === 'precmd').every(w => w.storageType === 'implicit-integer'));
});

test('explicit REAL overrides PARAM without changing neighboring CHKOUT integer words', () => {
  const scope = declarationScope('CHECK.FOR', 'CHECK');
  assert.deepEqual(scope.type('dhs'), { type: 'real', file: 'CHECK.FOR', line: 42 });
  assert.equal(scope.type('h1').type, 'implicit-integer'); assert.equal(scope.type('dcode').type, 'implicit-integer');
  assert.equal(declarationScope('POINTS.FOR', 'POINTS').type('fflg').type, 'implicit-integer');
});

test('local layouts regenerate from scoped COMMON declarations and original link sizes', () => {
  assert.deepEqual(localLayout, localLayouts(K)); assert.equal(Object.keys(localLayout).length, 15);
  assert.deepEqual(['local', 'points', 'check', 'distance', 'savedShip', 'message', 'supernova', 'torpedo'].map(k => {
    const b = localLayout[k as keyof typeof localLayout]; return [b.address.toString(8), b.words];
  }), [['340', 200], ['653', 9], ['1541', 7], ['1632', 16], ['1777', 45], ['2662', 16], ['3556', 192], ['4322', 7]]);
  assert.equal(localLayout.list.declaredWords, 130); assert.equal(localLayout.list.fields.lstlz.offset, 107);
  assert.equal(localLayout.list.fields.pxf.dimensions[0].lower, 0);
});

test('all local constructors preserve caller-owned memory and compiled REAL words remain unread', () => {
  const f = fixture(77n); f.state.points(policy); f.state.savedShip({ value: 9n });
  f.state.check({ decode() { assert.fail('constructing reads a real word'); }, encode() { assert.fail('constructing writes a real word'); } });
  assert.ok(f.words.every(n => n === 77n)); assert.equal(f.state.list.cmd, 77); assert.equal(f.state.identity.job, 77n);
  assert.equal(f.state.torpedo.pause, 77n); assert.equal(f.state.distance.field(3,4n).value,77n);
});

test('jobs share HISEG while every named local COMMON remains private', () => {
  const a = fixture(), b = fixture(0n, a.highWords);
  a.h.players[1].ship.energy = 900n; a.state.list.cmd = 3; a.state.torpedo.pause = 123n; a.state.message[0] = 456n;
  assert.equal(b.h.players[1].ship.energy, 900n); assert.equal(b.state.list.cmd, 0);
  assert.equal(b.state.torpedo.pause, 0n); assert.equal(b.state.message[0], 0n);
});

test('identity, LIST, SCAN and USERS overlay the same physical first six words', () => {
  const f = fixture(), args = f.state.identity.arguments(); args.forEach((r, i) => { r.value = BigInt(i + 10); });
  assert.equal(f.state.scan.hmin, 10); assert.equal(f.state.scan.vmin, 12); assert.equal(f.state.scan.dv, 15);
  assert.equal(f.state.list.lstfz.value, 10n); assert.equal(f.state.list.shpctr[1].value, 11n); assert.equal(f.state.list.shplst[1].value, 13n);
  f.state.users[4] = 88n; assert.equal(f.state.identity.tty, 88n); assert.equal(f.state.scan.dh, 88);
});

test('LIST clear includes exactly LSTFZ through LSTLZ and preserves traversal words and LOCAL tail', () => {
  const f = fixture(77n); f.state.list.clearOutput();
  assert.ok(f.state.words.slice(0,108).every(n => n === 0n)); assert.ok(f.state.words.slice(108).every(n => n === 77n));
  assert.equal(f.state.identity.job, 0n); assert.equal(f.state.list.cmd, 77); assert.equal(f.state.list.range, 77n);
});

test('LIST array underflow and column overflow preserve neighboring source fields', () => {
  const f = fixture(); f.state.list.shpctr[0].value = 33n; assert.equal(f.state.list.lstfz.value, 33n);
  f.state.list.baslst[1][11].value = 44n; assert.equal(f.state.list.baslst[2][1].value, 44n);
  f.state.list.pxf[-1].value = 55n; assert.equal(f.state.list.plnlst[60].value, 55n);
  f.state.list.targetFlags.value = 66n; assert.equal(f.state.list.txf, 66n);
  f.state.list.txf = MAX_INTEGER + 1n; assert.equal(f.state.words[106], MIN_INTEGER);
});

test('LIST full driver writes selected output, counters and traversal state into LOCAL', () => {
  const f = fixture(); const p = f.h.players[1]; p.alive = -1n;
  Object.assign(p.ship, { v: 10, h: 10, shieldCondition: 1n, shieldStrength: 1000n }); f.h.board.setdsp(10,10,101);
  const world = { players:f.h.players, board:f.h.board, bases:f.h.bases, planets:f.h.planets, nplnet:0, rom:0n, romopt:-1n, erom:0n, locr:f.h.locr };
  listCommand({ who:1, team:1, password:false, oflg:0, ocflg:K.KABS }, K.LSTCMD, input('LIST SHIPS'), f.state.list, world, f.out,
    { logical:policy.logical, ownPosition:()=>({v:10,h:10}), literal:key=>listLiterals[key].text, dummy:{value:0n}, implicitShipWord:()=>0n });
  assert.ok(f.out.drain().includes(' L  @10-10  +100.0%\r\n'));
  assert.equal(f.state.block('list').read('shpctr',1), 1n); assert.equal(f.state.block('list').read('cmd'),BigInt(K.LSTCMD));
  assert.equal(f.state.block('list').read('svpos'),10n); assert.equal(f.state.identity.words[1],1n);
});

test('SETSCN after LIST overwrites its overlay and SHWSCN emits exact bytes from that memory', () => {
  const f = fixture(); f.state.words.fill(77n); f.h.board.setdsp(1,1,101);
  const ctx = { scnflg:0, ccflg:0n }; setScan(f.state.scan, f.h.board, ctx, 1,2,1,1); showScan(f.state.scan,ctx,f.out);
  assert.equal(f.out.drain(),'\r\n    1\r\n 1  L .  1\r\n    1\r\n');
  assert.deepEqual(f.state.identity.words.slice(),[1n,2n,1n,1n,2n,1n]);
  assert.equal(f.state.words[108],77n); assert.equal(f.state.scan.get(0),32);
  f.state.identity.arguments()[0].value=9n; assert.equal(f.state.scan.hmin,9);
});

test('SCAN byte underflow and overflow use actual surrounding source words', () => {
  const f = fixture(); f.state.scan.put(-1,65); assert.equal(f.state.scan.get(-1),65); assert.equal(f.state.words[5],130n);
  f.state.scan.put(970,66); assert.equal(f.space.read(0o340n+200n),signed36(66n<<29n)); assert.equal(f.state.scan.get(970),66);
});

test('POLOCL nine-word TOTAL aliases four totals, four flags and output width', () => {
  const f = fixture(), p = f.state.points(policy);
  f.state.total[5] = -2n; assert.equal(p.fflg,true); assert.equal(f.state.block('points').read('fflg'),-2n);
  p.eflg = true; assert.equal(f.state.total[6],-1n); p.rflg=false; assert.equal(f.state.total[7],0n);
  f.state.total[9]=33n; assert.equal(p.owidth,33); p.total[5]=0n; assert.equal(p.fflg,false);
});

test('POINTS logical word policy is explicit and does not rewrite existing flags', () => {
  const f=fixture(2n), p=f.state.points({logical:n=>n===2n,trueWord:2n,falseWord:7n});
  assert.equal(p.iflg,true); p.iflg=false; assert.equal(f.state.total[8],7n); assert.equal(p.iflg,false);
  assert.equal(f.state.total[5],2n);
});

test('POINTS calculation writes the same TOTAL read by the main application', () => {
  const f=fixture(), p=f.state.points(policy); f.h.players[1].ship.turns=2n;
  f.h.players[1].shipName1=signed36(packAscii('Lexin')); f.h.players[1].shipName2=signed36(packAscii('gton '));
  for(let i=1;i<=8;i++)f.h.scores.setPlayer(i,1,BigInt(i*10));
  points({who:1,oflg:0,shared:{players:f.h.players,scores:f.h.scores,romopt:-1n}},input('POINTS'),p,f.out);
  assert.equal(f.state.total[1],360n); assert.equal(f.state.total[8],-1n); assert.equal(f.state.total[5],0n);
  assert.ok(f.out.drain().includes('Total points:              36.0\r\n'));
});

test('FRLOCL views preserve all forty-five words and the separate DUMMY argument reference', () => {
  const f=fixture(77n), dummy={value:99n}, s=f.state.savedShip(dummy), b=f.state.block('savedShip');
  s.tshpco[0]=123n; assert.equal(s.tship,123n); s.tshpda[0]=234n; assert.equal(s.tshpco[10],234n);
  s.tjob[0]=345n; assert.equal(s.tshpda[9],345n); s.dum[0]=456n; assert.equal(b.read('dum',1),456n);
  assert.equal(s.dummy,dummy); s.dummy.value=88n; assert.equal(dummy.value,88n); assert.equal(s.dum[15],77n);
});

test('FREE and RSTART share live FRLOCL rather than a detached snapshot', () => {
  const f=fixture(), p=f.h.players[1], saved=f.state.savedShip({value:0n}); const {devices,...ship}=initialShip();
  Object.assign(p.ship,ship,{v:10,h:20}); p.ship.devices.fill(0n,1); p.alive=-1n; p.job[K.KJOB]=10n; p.job[K.KPPN]=20n; p.job[K.KTTYN]=30n;
  f.h.values.numply=1n; f.h.numsid[1]=1n; f.h.board.setdsp(10,20,101);
  const world=Object.assign(Object.create(f.h.values),{players:f.h.players,board:f.h.board,killed:f.h.killed,numsid:f.h.numsid});
  done(freeShip(world,saved,f.l.hit,1,{*lock(){return true;},unlock(){},daytime:()=>100n,*trcoff(){assert.fail();},*gethit(){assert.fail();},*getmsg(){assert.fail();}}));
  assert.equal(f.state.block('savedShip').read('tshpco',K.KSNRGY),50000n); assert.equal(saved.tjob[K.KPPN],20n);
  f.state.block('savedShip').write('tshpco',40000n,K.KSNRGY);
  done(restartShip(world,saved,1,f.out,{*lock(){return true;},unlock(){},*monit(){assert.fail();},*jobsta(args){args[0].value=10n;args[3].value=20n;args[4].value=30n;}}));
  assert.equal(p.ship.energy,40000n); assert.equal(f.h.board.disp(10,20),101); assert.equal(p.alive,-1n);
});

test('DISTLC and SNLOCL index aliases traverse their physical columns and surrounding memory', () => {
  const f=fixture(); f.state.distance.field(0,5n).value=12n; assert.equal(f.state.distance.field(1,1n).value,12n);
  f.state.distance.field(3,5n).value=13n; assert.equal(f.space.read(0o1632n+16n),13n);
  f.state.supernova.object(9n,1n).value=21n; assert.equal(f.state.supernova.object(1n,2n).value,21n);
  f.state.supernova.object(1n,5n).value=22n; assert.equal(f.state.supernova.star(1n,1n).value,22n);
  f.state.supernova.star(81n,2n).value=23n; assert.equal(f.space.read(0o3556n+192n),23n);
});

test('DIST selects using live distance COMMON and resets only its Z column', () => {
  const f=fixture(77n), local=new DistanceLocals(), ip={value:0n}, np={value:0n}, num={value:0n};
  f.h.players[1].alive=-1n; Object.assign(f.h.players[1].ship,{v:11,h:20}); f.h.board.setdsp(11,20,101);
  romulanDistance(ip,np,num,{v:10,h:20},f.state.distance,local,{logical:policy.logical,and:(...t)=>t.every(f=>f()),or:(...t)=>t.some(f=>f()),iran(){assert.fail('no tie');},
    alive:i=>f.h.players[Number(i)].alive,ship:i=>f.h.players[Number(i)].ship,baseCount:()=>0n,base:(i,t)=>f.h.bases[Number(t)][Number(i)],
    disp:(v,h)=>BigInt(f.h.board.disp(Number(v),Number(h))),pdist:(v,h,rv,rh)=>BigInt(pdist(Number(v.value),Number(h.value),Number(rv.value),Number(rh.value)))});
  assert.deepEqual([ip.value,np.value,num.value],[1n,1n,1n]); assert.deepEqual(f.state.distance.words.slice(12),[1n,5626n,5626n,5626n]);
  assert.equal(f.state.distance.words[1],77n); assert.equal(f.state.block('distance').read('iv',1),1n);
});

test('TOLOCL target-column aliases include TPAUS and exact seven-word clear', () => {
  const f=fixture(77n), m=f.state.torpedo; m.target(4n,2n).value=111n; assert.equal(m.pause,111n);
  m.target(1n,3n).value=222n; assert.equal(m.pause,222n); m.target(5n,2n).value=333n;
  m.clear(); assert.deepEqual(m.words.slice(),Array(7).fill(0n)); assert.equal(f.space.read(0o4322n+7n),333n);
});

test('actual TORP driver stores targets and pause in live TOLOCL', () => {
  const f=fixture(77n), t=torpedoFixture('TORPEDO 1 12 20'); t.draws.push('.5','.5'); t.integers.push(1n);
  done(torpedoes(t.ctx,t.input,t.local,f.state.torpedo,t.path,t.hit,t.out,t.io));
  assert.equal(f.state.torpedo.target(1n,1n).value,12n); assert.equal(f.state.torpedo.target(1n,2n).value,20n);
  assert.equal(f.state.block('torpedo').read('tpaus'),3000n); assert.equal(t.ship.torpedoes,9n);
});

test('CHKOUT uses supplied real encoding and different caller names still alias physical words', () => {
  const f=fixture(), c=codec(), path=f.state.check(c); path.h1=11n; path.v1=22n; path.h2=33n; path.v2=44n;
  const v=real.literal('.25'); path.dhs=v; assert.equal(path.dhs,v);
  assert.equal(f.state.block('moveCheck').read('v1'),11n); assert.equal(f.state.block('torpedoCheck').read('ivc'),33n);
  f.state.block('torpedoCheck').write('idisv',c.encode(real.literal('.5'))); assert.equal(real.toInteger(real.multiply(path.dhs,real.literal('10'))),5n);
  assert.equal(f.state.block('check').layout.fields.dhs.type,'real');
});

test('CHECK executes through raw CHKOUT words and the explicit rational fixture codec', () => {
  const f=fixture(), path=f.state.check(codec()), local=new CheckLocals(real.literal('99'));
  check({value:10n},{value:20n},{value:4n},{value:2n},{value:4n},{value:real.literal('0')},path,local,
    {real,ran:()=>real.literal('.75'),ingal:(v,h)=>ingal(Number(v),Number(h)),disp:(v,h)=>BigInt(f.h.board.disp(Number(v),Number(h)))});
  assert.deepEqual(['h1','v1','h2','v2','dcode'].map(k=>f.state.block('check').read(k)),[14n,22n,14n,22n,0n]);
  assert.equal(real.toInteger(real.multiply(path.dvs,real.literal('10'))),5n);
});

test('SNOVA stack push/pop uses live SNLOCL and updates the same CHKOUT overlay', () => {
  const f=fixture(77n), path=f.state.check(codec()); path.h2=10n; path.v2=20n; f.h.board.setdsp(10,20,900); f.h.board.setdsp(11,20,101);
  const local=new SupernovaLocals(), victims:bigint[]=[];
  done(supernova({player:-1n,tpoint:f.l.tpoint,rsr:f.h.scores.romulan},path,f.l.hit,local,f.state.supernova,
    {real,logical:policy.logical,or:(...t)=>t.some(f=>f()),iran(){assert.fail('no neighboring star');},disp:(v,h)=>BigInt(f.h.board.disp(Number(v),Number(h))),
      dispc:(v,h)=>BigInt(f.h.board.dispc(Number(v),Number(h))),setdsp:(v,h,c)=>f.h.board.setdsp(Number(v),Number(h),Number(c)),
      *nova(kind,index){victims.push(kind.value*100n+index.value);},pridis(){assert.fail();},*makhit(){assert.fail();}}));
  assert.deepEqual(victims,[101n]); assert.equal(f.state.block('supernova').read('objstk',1,1),11n);
  assert.equal(f.state.block('supernova').read('objstk',1,2),20n); assert.equal(path.h1,11n);
  assert.equal(real.toInteger(path.dhs),1n); assert.equal(f.state.supernova.star(1n,1n).value,77n);
});

test('OMLOCL is sixteen persistent words and overrun reaches surrounding private memory', () => {
  const f=fixture(77n); f.state.message[0]=123n; f.state.message[16]=234n;
  assert.equal(f.state.block('message').read('msg',1),123n); assert.equal(f.space.read(0o2662n+16n),234n);
  assert.equal(f.state.message[15],77n);
});

test('relocating LOCAL moves every overlay together while other blocks keep their specified bases', () => {
  const space=new AddressSpace(); space.map(10000n,Array<bigint>(200).fill(77n));
  const s=localState(space,{local:10000n}); s.scan.hmin=25; assert.equal(s.identity.job,25n); assert.equal(s.list.lstfz.value,25n);
  assert.equal(s.block('identity').base,10000n); assert.throws(()=>s.message[0],/Unmapped/);
});
