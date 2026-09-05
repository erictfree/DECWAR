import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture } from './fixtures/pregame-runtime.ts';
import { bindMainLoopRuntime } from './fixtures/main-loop-runtime.ts';
import { bindEntryRuntime } from './fixtures/entry-runtime.ts';
import { bindSharedSessionRandom } from './fixtures/shared-session-random.ts';
import { mainCommandFixture } from './fixtures/main-command-runtime.ts';
import { bindRoundedNumericRuntime } from './fixtures/rounded-numeric-runtime.ts';
import { ranFractionWord } from '../src/compat/ran-float36.ts';
import { constants as K } from '../src/generated/source-data.ts';
function done<T>(g:Generator<string,T,void>):T{for(let i=0;i<30000;i++){const n=g.next();if(n.done)return n.value;}throw new Error('entry schedule exhausted');}
function fixture(input='EXPERT\n\n\nNO\nNO\nFEDERATION\nLEXINGTON\nSTATUS/QUIT\n'){
  const f=pregameRuntimeFixture([]),main=bindMainLoopRuntime(f),entry=bindEntryRuntime(f,main);
  for(let a=f.high.address('hfz');a<=f.high.address('hlz');a++)f.m.write(a,0n);
  f.high.write('tim0',-1n);f.high.write('numply',0n);f.high.write('numsid',0n,1);f.high.write('numsid',0n,2);
  f.editor.bytes.length=0;f.editor.feed(input);f.jobStatus.ppns.push(9n,9n,9n,9n);f.clock.splice(0,f.clock.length,...Array.from({length:12},(_,i)=>1000n+BigInt(i)));main.admission.runs.push(1n);
  Object.assign(main.admission.trapAddresses,{zero:0n,cc1:59980n,cc2:59981n,clrbuf:59982n});main.setup.policy.missingTrap=0n;main.policy.debug='omit';main.policy.quit=function*(n){return n<0n?'leave':'next';};main.lists.policy.reversedLoop='zero-trip';f.getCommand.trapAddress.value=0n;
  bindSharedSessionRandom(f,function*(raw){return f.rawPower.encode({n:raw,d:1n<<27n});});const clear=main.io.clear;main.io.clear=function*(){yield*clear();f.editor.feed('YES\n');};
  return {...f,main,entry,enter:()=>done(entry.run()),initialize:()=>done(entry.initialize())};
}
for(const [input,oflg,icflg,prtype] of [['1',K.MEDIUM,K.KABS,0n],['INTERMEDIATE',K.MEDIUM,K.KREL,-1n],['EXPERT',K.SHORT,K.KREL,-1n]] as const)test(`Entry ${input} chooses original preferences and TYPE reports without extra questions`,()=>{const f=fixture(input+'\n');f.initialize();assert.equal(f.low.read('oflg'),BigInt(oflg));assert.equal(f.low.read('icflg'),BigInt(icflg));assert.equal(f.low.read('prtype'),prtype);assert.equal(f.high.read('versio'),24n);assert.deepEqual(f.entry.events,['clearLow','startupText','type:1','type:2','summar']);assert.equal(f.type.events.includes('type01'),false);assert.equal(f.text().startsWith('[DECWAR Version 2.3, 20-Nov-81]\r\n'),true);});
test('Full entry reaches STATUS and exposes unresolved POINTS loop on confirmed quit',()=>{const f=fixture();assert.throws(f.enter,/uninitialized POINTS DO continuation/);assert.deepEqual(f.main.calls,[{routine:'status',argument:2}]);assert.equal(f.high.read('nplnet'),60n);assert.ok(f.text().includes('T10 E5000'));assert.equal(f.high.read('alive',1),-1n);assert.equal(f.low.read('who'),1n);});
test('Full entry creates a galaxy with physical RAN words and rounded arithmetic before STATUS',()=>{
  const f=fixture('EXPERT\n\n\nNO\nYES\nFEDERATION\nLEXINGTON\nSTATUS/QUIT\n');bindRoundedNumericRuntime(f);
  bindSharedSessionRandom(f,function*(raw,scale){assert.equal(scale,0o200n);return ranFractionWord(raw);});
  assert.throws(f.enter,/uninitialized POINTS DO continuation/);
  assert.equal(f.high.read('nplnet'),60n);assert.equal(f.high.read('blhopt'),-1n);
  const holes=f.m.read(f.main.setup.locals.nhole),stars=f.m.read(f.main.setup.locals.nstar);
  assert.ok(holes>=10n&&holes<=50n);assert.ok(stars>=100n&&stars<=350n);
  assert.equal(f.high.read('alive',1),-1n);assert.ok(f.text().includes('T10 E5000'));
});
test('Full entry preserves zero-denominator scoring failure with explicit final-loop policy',()=>{const f=fixture();f.points.final.continuation=function*(){return false;};assert.throws(f.enter,/integer divide by zero/);assert.equal(f.high.read('numshp',2),0n);assert.equal(f.low.read('who'),1n);assert.equal(f.high.read('alive',1),-1n);});
test('Entry returns to pregame without re-clearing preferences when command loop returns',()=>{const f=fixture('EXPERT\n\n\nNO\nNO\nFEDERATION\nLEXINGTON\nSTATUS\n');let commands=0;const get=f.main.io.getcmd;f.main.io.getcmd=function*(n){if(commands++===0)yield*get(n);else f.low.write('who',0n);};let pregame=0;const pg=f.entry.io.pregam;f.entry.io.pregam=function*(){if(pregame++===0)yield*pg();else throw new Error('reentered pregame');};assert.throws(f.enter,/reentered pregame/);assert.equal(f.entry.events.filter(x=>x==='clearLow').length,1);assert.equal(f.low.read('oflg'),BigInt(K.SHORT));assert.equal(f.high.read('nplnet'),60n);});
for(const choice of ['OUTPUT','OPTION'])test(`Main TYPE ${choice} passes numeric zero through an actual argument word`,()=>{const f=mainCommandFixture('TYPE '+choice);f.run();assert.equal(f.type.events.includes('type01'),false);assert.equal(f.m.read(f.type.symbols.kind),0n);assert.ok(f.reports[0].length>0);});
