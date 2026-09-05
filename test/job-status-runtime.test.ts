import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameInputRuntimeFixture } from './fixtures/pregame-input-runtime.ts';
import { bindJobStatusRuntime } from './fixtures/job-status-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { halfWords,packAscii,packSixbit,signed36 } from '../src/compat/word36.ts';
function fixture(){const f=pregameInputRuntimeFixture(),job=bindJobStatusRuntime(f);return {...f,job};}
const results=(f:ReturnType<typeof fixture>)=>f.job.args.map(a=>f.m.read(a));

test('Raw JOBSTA cached handle fills the six arguments and clears TMP without a name prompt',()=>{
  const f=fixture();f.m.write(f.job.symbols.tmp,77n);f.m.write(f.job.symbols.tmp+1n,88n);finish(f.job.run());assert.deepEqual(results(f),[7n,signed36(packSixbit('PLAYER')),0n,9n,10n,1200n]);assert.equal(f.m.read(f.job.symbols.tmp),0n);assert.equal(f.m.read(f.job.symbols.tmp+1n),0n);assert.equal(f.text(),'');assert.equal(f.job.events.filter(e=>e==='getppn').length,2);
});
for(let code=0;code<16;code++)test(`Raw JOBSTA speed code ${code} preserves octal comparison and replacement`,()=>{
  const f=fixture();f.job.monitor.speed=BigInt(code);finish(f.job.run());const table=[300,50,75,110,134,150,200,300,0,0,600,1200];assert.equal(results(f)[5],BigInt(code<=11?table[code]:0));
});
test('Raw JOBSTA failed TRMOP falls back to code seven and 300',()=>{
  const f=fixture();f.job.monitor.trmopSkip=false;f.job.monitor.speed=99n;finish(f.job.run());assert.equal(results(f)[5],300n);
});
test('Raw JOBSTA negative speed code indexes memory before the speed table',()=>{
  const f=fixture();f.job.monitor.speed=-1n;f.m.write(f.job.symbols.speedTable-1n,777n);finish(f.job.run());assert.equal(results(f)[5],777n);
});
test('Raw JOBSTA speed lookup reads current table storage after TRMOP yields',()=>{
  const f=fixture(),trmop=f.job.io.trmop;f.job.io.trmop=function*(){const skip=yield*trmop();yield 'trmop';return skip;};const g=f.job.run();assert.equal(g.next().value,'trmop');assert.equal(results(f)[0],7n);f.m.write(f.job.symbols.speedTable+11n,4321n);finish(g);assert.equal(results(f)[5],4321n);
});
test('Raw JOBSTA initial OUTPUT is unguarded and precedes PJOB',()=>{
  const f=fixture();f.ini.state.hungup=-1n;f.job.io.output=function*(){yield 'output';};const g=f.job.run();assert.equal(g.next().value,'output');assert.equal(results(f)[0],0n);assert.ok(!f.job.events.includes('pjob:t1'));finish(g);assert.equal(results(f)[0],7n);
});
test('Raw JOBSTA assigned WHO uses second PJOB then stores sequence state before literal transfer',()=>{
  const f=fixture();f.low.write('who',2n);f.job.monitor.sequenceJob=99n;f.job.io.afterSequenceStore=function*(){yield 'sequence';};const g=f.job.run();assert.equal(g.next().value,'sequence');assert.equal(f.m.read(f.job.symbols.jsqwho),2n);assert.equal(f.m.read(f.job.symbols.jsqtab+1n),99n);assert.equal(f.job.events.filter(e=>e==='getppn').length,0);finish(g);
});
test('Raw JOBSTA sequence index rereads current T1 after PJOB T2 returns',()=>{
  const f=fixture();f.low.write('who',1n);const pjob=f.job.io.pjob;f.job.io.pjob=function*(r){yield*pjob(r);if(r==='t2')f.r.t1=3n;};finish(f.job.run());assert.equal(f.m.read(f.job.symbols.jsqwho),3n);assert.equal(f.m.read(f.job.symbols.jsqtab+2n),7n);
});
for(const [ppn,flag] of [[halfWords(0o337n,0o2030n),-1n],[halfWords(0o77000n,1n),1n],[halfWords(1n,2n),0n]] as const)test(`Raw JOBSTA first PPN ${ppn} determines DEBFLG ${flag}`,()=>{
  const f=fixture();f.job.ppns.splice(0,2,ppn,9n);finish(f.job.run());assert.equal(f.file.read('debflg'),flag);assert.equal(results(f)[3],9n);assert.equal(f.m.read(f.job.symbols.usppn),9n);
});
for(const [project,free] of [[0o70007n,-1n],[0o70010n,0n],[0o70013n,-1n],[0o77001n,-1n],[0o71010n,0n]] as const)test(`Raw JOBSTA project ${project.toString(8)} preserves FREBIE branches`,()=>{
  const f=fixture();f.job.ppns[1]=halfWords(project,123n);finish(f.job.run());assert.equal(f.m.read(f.job.symbols.frebie),free);
});
test('Raw JOBSTA second GETPPN skip bypasses USPPN store but still writes caller PPN',()=>{
  const f=fixture();f.m.write(f.job.symbols.usppn,55n);f.job.monitor.getppnSkip=true;finish(f.job.run());assert.equal(f.m.read(f.job.symbols.usppn),55n);assert.equal(results(f)[3],9n);
});
test('Raw USRPRJ maps development project 337 to 70000 and leaves other projects unchanged',()=>{
  const f=fixture();for(const [p,want] of [[0o337n,0o70000n],[0o77000n,0o77000n],[123n,123n]]){f.m.write(f.job.symbols.usppn,halfWords(p,9n));f.job.project();assert.equal(f.r.t0,want);}
});
test('Raw JOBSTA cached-name bit field ends at bit seven, not normal first ASCII byte',()=>{
  const f=fixture();f.m.write(f.job.symbols.uscbh,packAscii('@'));f.job.feed('A\n');finish(f.job.run());assert.ok(f.job.events.includes('name-prompt'));assert.equal(results(f)[1],signed36(packSixbit('A')));
});
test('Raw JOBSTA prompted name uses INCHWL directly, filtering only NUL/CR before conversion',()=>{
  const f=fixture();f.m.write(f.job.symbols.uscbh,0n);f.job.feed('\0\rAb9\n');finish(f.job.run());assert.equal(f.text(),'\r\nYour name please: ');assert.equal(results(f)[1],signed36(packSixbit('AB9')));assert.deepEqual(f.job.events.filter(e=>e.startsWith('idpb-name:')),['idpb-name:65','idpb-name:98','idpb-name:57','idpb-name:0']);
});
for(const ending of ['\n','\x1b','\x07'])test(`Raw JOBSTA name terminator ${JSON.stringify(ending)} deposits NUL then converts`,()=>{
  const f=fixture();f.m.write(f.job.symbols.uscbh,0n);f.job.feed('A'+ending);finish(f.job.run());assert.equal(results(f)[1],signed36(packSixbit('A')));assert.ok(f.job.events.includes('idpb-name:0'));
});
test('Raw JOBSTA control-C returns with cleared output names and partial ASCII input',()=>{
  const f=fixture();f.m.write(f.job.symbols.uscbh,0n);f.job.feed('AB\x03');finish(f.job.run());assert.deepEqual(results(f).slice(1,3),[0n,0n]);assert.equal(f.m.read(f.job.symbols.uscbh),signed36(packAscii('AB')));assert.ok(!f.job.events.some(e=>e.startsWith('idpb-sixbit:')));
});
test('Raw JOBSTA CCFLG after INCHWL returns precedes character filtering and deposit',()=>{
  const f=fixture();f.m.write(f.job.symbols.uscbh,0n);f.job.io.inchwl=function*(){f.r.t2=65n;f.ini.state.ccflg=-1n;};finish(f.job.run());assert.equal(f.m.read(f.job.symbols.uscbh),0n);assert.equal(f.ini.state.ccflg,-1n);
});
test('Raw JOBSTA cached conversion retains existing HAND suffix because only TMP is cleared',()=>{
  const f=fixture();f.h.put(f.job.symbols.uscbh,'A');f.m.write(f.job.symbols.hand,signed36(packSixbit('ZZZZZZ')));f.m.write(f.job.symbols.hand+1n,123n);finish(f.job.run());assert.equal(results(f)[1],signed36(packSixbit('AZZZZZ')));assert.equal(results(f)[2],123n);
});
test('Raw JOBSTA input can write beyond the two-word ASCII handle before conversion truncates to twelve',()=>{
  const f=fixture();f.m.write(f.job.symbols.uscbh,0n);f.job.feed('ABCDEFGHIJKLMN\n');finish(f.job.run());assert.notEqual(f.m.read(f.job.symbols.uscbh+2n),0n);assert.equal(results(f)[1],signed36(packSixbit('ABCDEF')));assert.equal(results(f)[2],signed36(packSixbit('GHIJKL')));
});
test('Raw JOBSTA blank name retries with T1 zero rather than rebuilding its ASCII pointer',()=>{
  const f=fixture();f.m.write(f.job.symbols.uscbh,0n);f.job.feed('\nA\n');assert.throws(()=>finish(f.job.run()),/six\/seven-bit pointer/);assert.equal(f.job.events.filter(e=>e==='name-prompt').length,2);assert.equal(f.r.t1,0n);assert.deepEqual(results(f).slice(1,3),[0n,0n]);
});
test('Raw JOBSTA HUNGUP skips only the first USCBH clear at name prompt',()=>{
  const f=fixture();f.ini.state.hungup=-1n;f.m.write(f.job.symbols.uscbh,packAscii('@'));f.m.write(f.job.symbols.uscbh+1n,99n);f.m.write(f.job.symbols.hand,88n);f.job.io.outstr=function*(){yield 'prompt';};const g=f.job.run();assert.equal(g.next().value,'prompt');assert.equal(f.m.read(f.job.symbols.uscbh),signed36(packAscii('@')));assert.equal(f.m.read(f.job.symbols.uscbh+1n),0n);assert.equal(f.m.read(f.job.symbols.hand),0n);
});
test('Raw JOBSTA names may alias and the second store overwrites the first',()=>{
  const f=fixture(),args=[...f.job.args];args[2]=args[1];finish(f.job.run(args));assert.equal(f.m.read(args[1]),0n);
});
test('Raw JOBSTA argument resolution rereads changed descriptor words after PJOB yields',()=>{
  const f=fixture(),pjob=f.job.io.pjob;f.job.io.pjob=function*(r){yield*pjob(r);if(r==='t1')yield 'pjob';};const g=f.job.run();assert.equal(g.next().value,'pjob');f.m.write(f.job.header+1n,21350n);finish(g);assert.equal(f.m.read(21350n),7n);assert.equal(results(f)[0],0n);
});
test('Raw JOBSTA failed terminal lookup retains prior job, speed and PPN writes',()=>{
  const f=fixture();f.job.io.getlin=function*(){throw new Error('GETLIN fault');};assert.throws(()=>finish(f.job.run()),/GETLIN fault/);assert.deepEqual(results(f),[7n,0n,0n,9n,0n,1200n]);
});
test('Raw JOBSTA name output failure happens before CCFLG clear',()=>{
  const f=fixture();f.m.write(f.job.symbols.uscbh,0n);f.ini.state.ccflg=-1n;f.job.io.outstr=function*(){throw new Error('OUTSTR fault');};assert.throws(()=>finish(f.job.run()),/OUTSTR fault/);assert.equal(f.ini.state.ccflg,-1n);assert.deepEqual(results(f).slice(1,3),[0n,0n]);
});
