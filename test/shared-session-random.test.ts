import test from 'node:test';
import assert from 'node:assert/strict';
import { mainCommandFixture } from './fixtures/main-command-runtime.ts';
import { bindSharedSessionRandom } from './fixtures/shared-session-random.ts';
import { DecwarRandom } from '../src/compat/random.ts';
import { constants as K } from '../src/generated/source-data.ts';
function done<T>(g:Generator<string,T,void>):T{for(let i=0;i<5000;i++){const s=g.next();if(s.done)return s.value;}throw new Error('random fixture schedule exhausted');}
function fixture(){const f=mainCommandFixture(''),trace:bigint[]=[];
  const random=bindSharedSessionRandom(f,function*(word,scale){assert.equal(scale,0o200n);trace.push(word);return f.rawPower.encode({n:word,d:1n<<27n});});
  // Explicit rational FSC test policy, not a production PDP-10 floating codec.
  done(random.setran(1n));return {...f,random,trace};
}
test('Shared session RAN and IRAN interleave on original private SEED',()=>{const f=fixture(),expected=new DecwarRandom(1n);assert.equal(done(f.random.iran(100n)),expected.iran(100n));done(f.random.ran(0n));assert.deepEqual(f.trace,[expected.nextRaw()]);assert.equal(done(f.random.iran(10n)),expected.iran(10n));assert.equal(f.file.read('seed'),expected.seed);});
test('Weapon callbacks copied during main binding observe shared random installation',()=>{const f=fixture(),expected=new DecwarRandom(1n);done(f.main.defenses.weaponIO.ran(0));const first=expected.nextRaw();assert.equal(done(f.main.phaser.io.iran(100)),expected.iran(100n));done(f.main.torpedo.io.ran(0));const second=expected.nextRaw();assert.deepEqual(f.trace,[first,second]);assert.equal(f.file.read('seed'),expected.seed);assert.equal(f.damage.draws.length,0);});
test('MOVE integer random call uses same seed as combat RAN',()=>{const f=fixture(),expected=new DecwarRandom(1n);done(f.main.defenses.weaponIO.ran(0));expected.nextRaw();assert.equal(done(f.io.iran(100)),expected.iran(100n));assert.equal(f.file.read('seed'),expected.seed);});
test('Shared random failure preserves seed advancement before missing FSC',()=>{const f=fixture(),expected=new DecwarRandom(1n);bindSharedSessionRandom(f,function*(){throw new Error('FSC policy unavailable');});assert.throws(()=>done(f.random.ran(0n)),/FSC policy unavailable/);expected.nextRaw();assert.equal(f.file.read('seed'),expected.seed);assert.equal(done(f.random.iran(7n)),expected.iran(7n));});
test('Session random keeps generator state private between players',()=>{const a=fixture(),b=fixture();done(a.random.ran(0n));done(a.random.iran(20n));assert.equal(b.file.read('seed'),1n);const expected=new DecwarRandom(1n);assert.equal(done(b.random.iran(20n)),expected.iran(20n));});
test('Main PHASERS runs damage and queues from seeded RAN without scheduled combat draws',()=>{
  function fire(){const f=fixture();f.editor.bytes.length=0;f.editor.feed('PHASERS 50 10 21\n');f.high.write('numply',10n);f.high.write('slwest',2n);f.high.write('shpcon',-1n,1,K.KSHCON);f.low.write('phbank',0n,1);f.low.write('phbank',0n,2);f.low.write('klflg',0n);
    f.high.write('alive',-1n,6);for(const [key,word] of [[K.KVPOS,10n],[K.KHPOS,21n],[K.KSNRGY,50000n],[K.KSDAM,0n],[K.KSHCON,-1n],[K.KSSHPC,1000n]] as const)f.high.write('shpcon',word,6,key);f.views.high.board.setdsp(10,21,206);f.run();return f;}
  const a=fire(),b=fire();assert.ok(a.trace.length>0);assert.deepEqual(a.trace,b.trace);assert.equal(a.file.read('seed'),b.file.read('seed'));assert.equal(a.high.read('shpcon',6,K.KSDAM),b.high.read('shpcon',6,K.KSDAM));assert.ok(a.high.read('shpcon',6,K.KSDAM)>0n);assert.equal(a.high.read('shpcon',1,K.KSNRGY),49500n);assert.equal(a.high.read('hitflg',6),1n);assert.deepEqual(a.damage.draws,[]);
});
