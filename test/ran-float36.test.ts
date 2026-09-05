import test from 'node:test';
import assert from 'node:assert/strict';
import { ranFractionWord,normalizedFloatDyadic } from '../src/compat/ran-float36.ts';
import { DecwarRandom } from '../src/compat/random.ts';
import { mainCommandFixture } from './fixtures/main-command-runtime.ts';
import { bindSharedSessionRandom } from './fixtures/shared-session-random.ts';
function done<T>(g:Generator<string,T,void>):T{for(;;){const s=g.next();if(s.done)return s.value;}}
// Literal octal vectors independently express the documented exponent/fraction
// format; these test FSC's RAN domain, not undocumented general CPU cases.
for(const [raw,word] of [[0n,0n],[1n,0o146400000000n],[1n<<26n,0o200400000000n],[(1n<<27n)-1n,0o200777777777n]] as const)test(`RAN FSC word for raw quotient ${raw}`,()=>{assert.equal(ranFractionWord(raw),word);});
test('Every RAN power-of-two boundary decodes to exactly quotient divided by 2^27',()=>{for(let bit=0n;bit<27n;bit++)for(const raw of [(1n<<bit)-1n,1n<<bit,(1n<<bit)+1n]){const d=normalizedFloatDyadic(ranFractionWord(raw));if(d.significand===0n){assert.equal(raw,0n);continue;}assert.equal(d.sign,1n);assert.equal(d.significand*(1n<<27n),raw*(1n<<(-d.exponent)));}});
test('Standard negative floating word is whole-word two-complement',()=>{assert.deepEqual(normalizedFloatDyadic(-0o201400000000n),{sign:-1n,significand:1n<<26n,exponent:-26n});});
test('RAN float helper refuses values outside the proven generator domain',()=>{assert.throws(()=>ranFractionWord(-1n),/27-bit/);assert.throws(()=>ranFractionWord(1n<<27n),/27-bit/);});
test('Raw public RAN returns documented floating words and preserves shared SEED',()=>{const f=mainCommandFixture(''),r=f.tell.random,expected=new DecwarRandom(1n);r.io.fscT0=function*(scale){assert.equal(scale,0o200n);f.r.t0=ranFractionWord(f.r.t0);};done(r.setran(1n));for(let i=0;i<12;i++){assert.equal(done(r.ran(0n)),ranFractionWord(expected.nextRaw()));assert.equal(done(r.iran(100n)),expected.iran(100n));}assert.equal(f.file.read('seed'),expected.seed);});
test('Documented RAN words convert exactly at remaining rational arithmetic boundary',()=>{const f=mainCommandFixture('');const r=bindSharedSessionRandom(f,function*(raw,scale){assert.equal(scale,0o200n);const d=normalizedFloatDyadic(ranFractionWord(raw));return f.rawPower.encode({n:d.sign*d.significand,d:1n<<(-d.exponent)});});done(r.setran(1n));const w=done(f.weapon.io.ran(0)),q=new DecwarRandom(1n).nextRaw(),value=f.rawPower.decode(w);assert.equal(value.n*(1n<<27n),q*value.d);});
