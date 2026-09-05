import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture,driveInitial } from './fixtures/pregame-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { halfWords,packAscii } from '../src/compat/word36.ts';
import { messages as M } from '../src/generated/source-data.ts';
import { dispatchCommand } from '../src/game/command-loop.ts';

function fixture(line='*PASSWORD *MINK',project=0o70000n){
  const f=pregameRuntimeFixture([]);f.editor.feed(line+'\n');finish(f.tokens.run());
  f.m.write(f.jobStatus.symbols.usppn,halfWords(project,42n));f.low.write('pasflg',77n);f.low.write('oflg',0n);
  const before=f.text().length;return {...f,run:()=>finish(f.password.run()),output:()=>f.text().slice(before)};
}

for(const [project,count] of [[0o70000n,1],[0o337n,1],[0o70006n,3],[0o70725n,4],[123n,4]] as const)test(`Statement PASWRD saved project ${project.toString(8)} uses raw USRPRJ`,()=>{
  const f=fixture(undefined,project);f.run();assert.equal(f.low.read('pasflg'),project===123n?0n:-2n);
  assert.equal(f.password.events.filter(e=>e==='usrprj:0').length,count);
  assert.equal(f.output(),project===123n?M.unkcom.text+M.forhlp.text+'\r\n':'');
});
for(const [line,flag] of [['*PASSWORD *MIN',0n],['*PASSWORD WRONG',0n],['*PASSWORD',0n],['*PASSWORD *MINKsuffix',-2n],['*PASSWORD *mink',-2n]] as const)test(`Statement PASWRD raw GTKN/EQUAL ${line}`,()=>{
  const f=fixture(line);f.run();assert.equal(f.low.read('pasflg'),flag);assert.equal(f.password.events[0],'equal:KPASS:1');
});
test('Statement PASWRD supplies the third EQUAL argument although raw EQUAL ignores its value',()=>{
  const f=fixture();f.m.write(f.password.symbols.one,999n);f.run();assert.equal(f.low.read('pasflg'),-2n);
});
test('Statement PASWRD reads second token even when NTOK and token type say it is absent',()=>{
  const f=fixture();f.low.write('ntok',0n);f.low.write('typlst',0n,2);f.run();assert.equal(f.low.read('pasflg'),-2n);
});
test('Statement PASWRD prefix is cleared before project evaluation even for allowed project',()=>{
  const f=fixture('*PASSWORD *MIN');const call=f.password.io.usrprj;f.password.io.usrprj=function*(z){assert.equal(f.low.read('pasflg'),0n);return yield*call(z);};f.run();assert.equal(f.low.read('pasflg'),0n);
});
test('Statement PASWRD still evaluates project condition after a failed password',()=>{
  const f=fixture('*PASSWORD WRONG',123n);f.run();assert.equal(f.password.events.filter(e=>e==='usrprj:0').length,4);
});
for(const oflg of [-1n,0n,1n])test(`Statement PASWRD failure output format ${oflg}`,()=>{
  const f=fixture('*PASSWORD WRONG');f.low.write('oflg',oflg);f.run();assert.equal(f.output(),M.unkcom.text+(oflg===-1n?'':M.forhlp.text+'\r\n'));
});
test('Statement PASWRD reads OFLG after suspended unknown-command output',()=>{
  const f=fixture('*PASSWORD WRONG'),out=f.password.io.out;f.password.io.out=function*(m,l){yield*out(m,l);if(m==='unkcom')yield 'unknown-written';};
  const g=f.password.run();assert.equal(g.next().value,'unknown-written');assert.equal(f.output(),M.unkcom.text);f.low.write('oflg',-1n);finish(g);assert.equal(f.output(),M.unkcom.text);
});
test('Statement PASWRD eager compiler AND evaluates every separate USRPRJ occurrence',()=>{
  const f=fixture();f.password.io.and=function*(...terms){const results:boolean[]=[];for(const term of terms)results.push(yield*term());return results.every(Boolean);};f.run();assert.equal(f.password.events.filter(e=>e==='usrprj:0').length,4);assert.equal(f.low.read('pasflg'),-2n);
});
test('Statement PASWRD each project expression reads saved USPPN anew after suspension',()=>{
  const f=fixture(undefined,123n),call=f.password.io.usrprj;let calls=0;
  f.password.io.usrprj=function*(z){if(++calls===3)yield 'third-project';return yield*call(z);};
  const g=f.password.run();assert.equal(g.next().value,'third-project');assert.equal(f.low.read('pasflg'),-2n);f.m.write(f.jobStatus.symbols.usppn,halfWords(0o70006n,99n));finish(g);assert.equal(calls,3);assert.equal(f.low.read('pasflg'),-2n);assert.equal(f.output(),'');
});
test('Statement PASWRD compiler may evaluate project comparisons in reverse order',()=>{
  const f=fixture(undefined,0o70725n);f.password.io.and=function*(...terms){for(const term of terms.reverse())if(!(yield*term()))return false;return true;};f.run();assert.equal(f.password.events.filter(e=>e==='usrprj:0').length,1);assert.equal(f.low.read('pasflg'),-2n);
});
test('Statement PASWRD EQUAL failure preserves prior PASFLG without project calls',()=>{
  const f=fixture();f.password.io.equal=function*(){throw new Error('equal fault');};assert.throws(f.run,/equal fault/);assert.equal(f.low.read('pasflg'),77n);assert.deepEqual(f.password.events,[]);
});
test('Statement PASWRD project failure retains the completed exact-match assignment',()=>{
  const f=fixture();f.password.io.usrprj=function*(){throw new Error('project fault');};assert.throws(f.run,/project fault/);assert.equal(f.low.read('pasflg'),-2n);assert.equal(f.output(),'');
});
test('Statement PASWRD output failure retains the cleared privilege flag',()=>{
  const f=fixture(undefined,123n);f.password.io.out=function*(){throw new Error('output fault');};assert.throws(f.run,/output fault/);assert.equal(f.low.read('pasflg'),0n);
});
test('Statement PASWRD assignment can suspend after EQUAL before changing PASFLG',()=>{
  const f=fixture();let first=true;f.password.io.assign=function*(d,_t,e){const value=yield*e.evaluate();if(first){first=false;yield 'assignment';}f.m.write(d(),value);};
  const g=f.password.run();assert.equal(g.next().value,'assignment');assert.equal(f.low.read('pasflg'),77n);finish(g);assert.equal(f.low.read('pasflg'),-2n);
});
test('Statement PASWRD logical interpretation is supplied rather than host nonzero',()=>{
  const f=fixture();f.password.io.logical=()=>false;f.run();assert.equal(f.low.read('pasflg'),-2n);assert.equal(f.output(),M.unkcom.text+M.forhlp.text+'\r\n');
});
test('Statement PASWRD rereads PASFLG after project evaluation',()=>{
  const f=fixture(),call=f.password.io.usrprj;f.password.io.usrprj=function*(z){const n=yield*call(z);f.low.write('pasflg',0n);return n;};f.run();assert.equal(f.output(),M.unkcom.text+M.forhlp.text+'\r\n');
});
test('Statement PASWRD raw EQUAL reads live password literal and restores shared S',()=>{
  const f=fixture(),s=f.r.s;f.m.write(f.password.symbols.kpass,packAscii('*NOPE'));f.run();assert.equal(f.low.read('pasflg'),0n);assert.equal(f.r.s,s);
});

for(const [project,word,zaps] of [[0o337n,'*MINK',1],[123n,'*MINK',0],[0o337n,'*MIN',0]] as const)test(`PREGAM JOBSTA to PASWRD to ZAP project ${project.toString(8)} password ${word}`,()=>{
  const f=pregameRuntimeFixture(['PREGAME',`*PASSWORD ${word}`,'*ZAP','ACTIVATE']);f.jobStatus.ppns.splice(0,2,halfWords(project,1n),halfWords(project,2n));
  const invoke=f.pregame.io.invoke;let cleared=0;f.pregame.io.invoke=function*(call){if(call.routine==='stazap'){cleared++;return;}yield*invoke(call);};driveInitial(f);
  assert.equal(cleared,zaps);assert.equal(f.low.read('pasflg'),zaps?-2n:0n);assert.equal(f.pregame.sharedLocal.identity.ppn,halfWords(project,2n));assert.equal(f.m.read(f.pregame.locals.n),1n);
});
test('PREGAM second GETPPN skip makes PASWRD use old saved project instead of caller identity',()=>{
  const f=pregameRuntimeFixture(['PREGAME','*PASSWORD *MINK','ACTIVATE']);f.jobStatus.monitor.getppnSkip=true;f.m.write(f.jobStatus.symbols.usppn,halfWords(0o337n,5n));driveInitial(f);assert.equal(f.pregame.sharedLocal.identity.ppn,9n);assert.equal(f.low.read('pasflg'),-2n);
});
test('PREGAM slash commands carry PASWRD grant and revoke into subsequent ZAP gates',()=>{
  const f=pregameRuntimeFixture(['PREGAME/*PASSWORD *MINK/*ZAP/*PASSWORD WRONG/*ZAP/ACTIVATE']);f.jobStatus.ppns.splice(0,2,halfWords(0o337n,1n),halfWords(0o337n,1n));
  let zaps=0;const invoke=f.pregame.io.invoke;f.pregame.io.invoke=function*(c){if(c.routine==='stazap'){zaps++;return;}yield*invoke(c);};driveInitial(f);assert.equal(zaps,1);assert.equal(f.low.read('pasflg'),0n);assert.equal(f.wait.operands.length,0);
});
test('DECWAR slot 33 composes PASWRD with raw input and leaves command timing unchanged',()=>{
  const f=fixture(),ctx={who:1,player:-1n,ptime:99n,shared:{players:f.views.high.players}};f.low.write('who',1n);
  finish(dispatchCommand(ctx,33,{
    *getcmd(){throw new Error('unexpected GETCMD');},*quit(){throw new Error('unexpected QUIT');},
    *invoke(call){assert.deepEqual(call,{routine:'paswrd'});yield*f.password.run();},
    *leave(){throw new Error('unexpected leave');},*finishTurn(){throw new Error('unexpected timed turn');},movementContinuation(){throw new Error('unexpected movement');},
  }));assert.equal(f.low.read('pasflg'),-2n);assert.equal(ctx.ptime,99n);assert.equal(f.low.read('who'),1n);assert.equal(f.output(),'');
});
test('PREGAM buffered INI password input uses JOBSTA identity and the same PASFLG',()=>{
  const f=pregameRuntimeFixture([]);f.jobStatus.ppns.splice(0,2,halfWords(0o70006n,1n),halfWords(0o70006n,2n));f.ini.install();f.ini.load('PREGAME/*PASSWORD *MINK/ACTIVATE\n');driveInitial(f);
  assert.equal(f.low.read('pasflg'),-2n);assert.equal(f.password.events.filter(e=>e==='usrprj:0').length,3);assert.equal(f.editor.events.filter(e=>e==='inchwl').length,0);assert.equal(f.m.read(f.pregame.locals.n),1n);
});
