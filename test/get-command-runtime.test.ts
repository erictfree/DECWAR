import test from 'node:test';
import assert from 'node:assert/strict';
import { pregameRuntimeFixture } from './fixtures/pregame-runtime.ts';
import { finish } from './fixtures/base-phaser-runtime.ts';
import { constants as K,messages as M,ships } from '../src/generated/source-data.ts';
import { packAscii,signed36 } from '../src/compat/word36.ts';
function fixture(lines=['TIME']){
  const f=pregameRuntimeFixture([]),b=f.getCommand;b.trapAddress.value=0n;for(const line of lines)f.editor.feed(line+'\n');
  for(const [key,value] of [['who',1n],['team',1n],['player',-1n],['ptime',0n],['pasflg',0n],['ccflg',0n],['hungup',0n],['prtype',0n],['gagmsg',0n],['oflg',-1n],['hcpos',0n],['blank',0n]] as const)f.low.write(key,value);
  f.high.write('nplnet',1n);f.high.write('endflg',0n);f.high.write('comknt',0n);f.high.write('numply',2n);f.high.write('shpcon',50000n,1,K.KSNRGY);f.high.write('shpcon',0n,1,K.KSDAM);f.high.write('shpcon',1n,1,K.KSPCON);
  for(const s of ships){f.high.write('hitflg',0n,s.id);f.high.write('msgflg',0n,s.id);f.high.write('names',packAscii(s.symbol),s.id,3);}
  const before=f.text().length;const run=()=>{const g=b.run();for(let i=0;i<500;i++)if(g.next().done)return f.m.read(b.cmd);throw new Error('test schedule exhausted');};
  return {...f,b,run,output:()=>f.text().slice(before)};
}
test('Statement GETCMD accepts raw input and returns actual command word after source setup',()=>{
  const f=fixture();assert.equal(f.run(),27n);assert.equal(f.high.read('comknt'),1n);assert.equal(f.low.read('ptime'),0n);assert.equal(f.file.read('trpadr'),0n);assert.deepEqual(f.b.events.slice(0,7),['ttyon','ttyon','DECWSL','dmpbuf','cctrap','pause','crlf']);assert.equal(f.b.events.at(-1),'DECWRN');assert.ok(f.output().includes(M.comlin.text));
});
test('Statement GETCMD requires zero-argument CCTRAP resolution before timing and input',()=>{
  const f=fixture();f.b.trapAddress.value=undefined;assert.throws(f.run,/CCTRAP requires compiler binding/);assert.equal(f.m.read(f.b.cmd),77n);assert.ok(!f.b.events.includes('pause'));
});
for(const value of [0n,1n,-1n])test(`Statement GETCMD PASFLG ${value} uses required logical semantics for PAUSE`,()=>{
  const f=fixture();f.low.write('pasflg',value);f.run();assert.equal(f.b.events.includes('pause'),value>=0n);
});
test('Statement GETCMD PAUSE uses live PTIME address before clearing the word',()=>{
  const f=fixture();f.low.write('ptime',2000n);const g=f.b.run();let s=g.next();while(!s.done&&!String(s.value).startsWith('hiber:'))s=g.next();assert.equal(f.low.read('ptime'),2000n);assert.ok(!s.done);finish(g);assert.equal(f.low.read('ptime'),0n);assert.equal(f.m.read(f.b.cmd),27n);
});
test('Statement GETCMD blank line returns to prompt without returning a command',()=>{
  const f=fixture(['','TIME']);assert.equal(f.run(),27n);assert.equal(f.b.events.filter(e=>e==='prompt').length,2);assert.equal(f.high.read('comknt'),2n);
});
test('Statement GETCMD ambiguity and unknown input retry with exact help policy',()=>{
  for(const format of [-1n,0n,1n]){const f=fixture(['S','XYZZY','TIME']);f.low.write('oflg',format);assert.equal(f.run(),27n);assert.ok(f.output().includes(M.ambcom.text));assert.ok(f.output().includes(M.unkcom.text));assert.equal(f.output().includes(M.forhlp.text),format!==-1n);}
});
test('Statement GETCMD matches live ISAYDO words through raw EQUAL',()=>{
  const f=fixture(['ZZZ']);f.high.write('isaydo',packAscii('ZZZ'),1,27);assert.equal(f.run(),27n);
});
test('Statement GETCMD accepted input increments COMKNT beyond the idle wrap threshold',()=>{
  const f=fixture();f.high.write('comknt',60n);assert.equal(f.run(),27n);assert.equal(f.high.read('comknt'),61n);
});
test('Statement GETCMD idle timeout wraps COMKNT and checks ENDGAM before waiting again',()=>{
  const f=fixture(),input=f.b.io.input;f.high.write('comknt',59n);let first=true;f.b.io.input=function*(ms){if(first){first=false;return 0n;}return yield*input(ms);};assert.equal(f.run(),27n);assert.equal(f.high.read('comknt'),1n);assert.equal(f.b.events.filter(e=>e==='endgam').length,2);assert.equal(f.high.read('active',1),0n);
});
test('Statement GETCMD initial notification ordering rereads flags after hit delivery',()=>{
  const f=fixture();f.high.write('hitflg',1n,1);f.b.io.outhit=function*(){f.b.events.push('outhit');f.high.write('hitflg',0n,1);f.low.write('dbits',1n);f.low.write('dispfr',0n);f.h.put(f.makeMessage.string,'Notice');yield*f.makeMessage.run();};assert.equal(f.run(),27n);assert.deepEqual(f.b.events.slice(0,5),['ttyon','outhit','ttyon','outmsg','DECWSL']);assert.ok(f.output().startsWith('Notice\r\n\r\n'));assert.equal(f.high.read('msgflg',1),0n);
});
test('Statement GETCMD pending hit delivery failure stops before timing and input',()=>{
  const f=fixture();f.high.write('hitflg',1n,1);f.b.io.outhit=function*(){throw new Error('hit delivery fault');};assert.throws(f.run,/hit delivery fault/);assert.equal(f.high.read('hitflg',1),1n);assert.ok(!f.b.events.includes('cctrap'));
});
test('Statement GETCMD idle notification returns through OUTMSG to a new prompt',()=>{
  const f=fixture(),input=f.b.io.input;let first=true;f.b.io.input=function*(ms){if(first){first=false;f.low.write('dbits',1n);f.low.write('dispfr',0n);f.h.put(f.makeMessage.string,'Arrived');yield*f.makeMessage.run();return 0n;}return yield*input(ms);};assert.equal(f.run(),27n);assert.equal(f.b.events.filter(e=>e==='prompt').length,2);assert.ok(f.output().includes('Arrived\r\n\r\n'));
});
test('Statement GETCMD hangup after INPUT forces QUIT without consuming tokens or incrementing count',()=>{
  const f=fixture([]);f.b.io.input=function*(){f.low.write('hungup',-1n);return -1n;};assert.equal(f.run(),16n);assert.equal(f.low.read('tknlst',1),signed36(packAscii('QUIT')));assert.equal(f.low.read('typlst',1),BigInt(K.KALF));assert.equal(f.high.read('comknt'),0n);assert.ok(!f.b.events.includes('gtkn'));
});
test('Statement GETCMD hangup after false INPUT also forces QUIT',()=>{
  const f=fixture([]);f.b.io.input=function*(){f.low.write('hungup',-1n);return 0n;};assert.equal(f.run(),16n);assert.equal(f.high.read('comknt'),0n);
});
test('Statement GETCMD already-set control flag takes idle bookkeeping instead of forced quit',()=>{
  const f=fixture(),zap=f.b.io.zaplok;let calls=0;f.b.io.zaplok=function*(){yield*zap();f.low.write('ccflg',++calls===1?-1n:0n);};assert.equal(f.run(),27n);assert.equal(f.high.read('comknt'),2n);assert.equal(f.b.events.filter(e=>e==='input').length,1);
});
test('Statement GETCMD Ctrl-C after GTKN forces QUIT outside red condition',()=>{
  const f=fixture(),gtkn=f.b.io.gtkn;f.b.io.gtkn=function*(){yield*gtkn();f.low.write('ccflg',-1n);};assert.equal(f.run(),16n);assert.ok(!f.b.events.includes('clear'));
});
test('Statement GETCMD red condition rejects Ctrl-C clears input and reprompts',()=>{
  const f=fixture(),gtkn=f.b.io.gtkn,clear=f.b.io.clear;f.high.write('shpcon',BigInt(K.RED),1,K.KSPCON);let first=true;f.b.io.gtkn=function*(){yield*gtkn();if(first){first=false;f.low.write('ccflg',-1n);}};f.b.io.clear=function*(){yield*clear();f.editor.feed('TIME\n');};assert.equal(f.run(),27n);assert.ok(f.output().includes(M.noquit.text));assert.equal(f.b.events.filter(e=>e==='clear').length,1);assert.equal(f.b.events.filter(e=>e==='prompt').length,2);
});
test('Statement GETCMD yellow threshold writes condition then outputs the exact packed beep literal',()=>{
  const f=fixture();f.high.write('shpcon',10000n,1,K.KSNRGY);assert.equal(f.run(),27n);assert.equal(f.high.read('shpcon',1,K.KSPCON),BigInt(K.YELLOW));assert.ok(f.b.events.includes('beep'));assert.ok(f.output().includes('\x07\x07\x07\x07'));
});
test('Statement GETCMD arithmetic-IF negative CMD branch reports ambiguity after the scan',()=>{
  const f=fixture(['TIME','TIME']),equal=f.b.io.equal;let negative=true;f.b.io.equal=function*(a,b){const r=yield*equal(a,b);if(negative&&b===f.high.address('isaydo',1,K.KNCMD)){f.m.write(f.b.cmd,-1n);negative=false;}return r;};assert.equal(f.run(),27n);assert.ok(f.output().includes(M.ambcom.text));
});
test('Statement GETCMD CMD is a caller-supplied destination address',()=>{
  const f=fixture();f.m.write(32900n,88n);finish(f.b.run(32900n));assert.equal(f.m.read(32900n),27n);assert.equal(f.m.read(f.b.cmd),77n);
});
test('Statement GETCMD death copies identity before POINTS reads shared TOTAL then passes actual addresses',()=>{
  const f=fixture([]);f.high.write('shpcon',BigInt(K.KENDAM),1,K.KSDAM);f.high.write('job',123n,1,K.KPPN);f.high.write('names',packAscii('LEXIN'),1,1);f.b.io.etim=function*(){return 456n;};f.b.io.points=function*(){assert.equal(f.m.read(f.b.locals.txppn),123n);f.high.write('job',999n,1,K.KPPN);f.m.write(f.endgame.total,789n);};let record:bigint[]=[];f.b.io.updsta=function*(a){record=a.map(x=>f.m.read(x));assert.equal(a[9],f.low.address('who'));};f.b.io.free=function*(a){assert.equal(a,f.low.address('who'));assert.equal(f.m.read(a),1n);};assert.equal(f.run(),77n);assert.equal(record[0],123n);assert.equal(record[3],signed36(packAscii('LEXIN')));assert.deepEqual(record.slice(5),[789n,456n,0n,0n,1n]);assert.equal(f.low.read('who'),0n);assert.ok(!f.b.events.includes('odisp'));
});
test('Statement GETCMD energy death prints warning before identity copies and leaves CMD untouched',()=>{
  const f=fixture([]);f.high.write('shpcon',0n,1,K.KSNRGY);f.b.io.etim=function*(){return 0n;};f.b.io.points=function*(){throw new Error('points stop');};assert.throws(f.run,/points stop/);assert.ok(f.output().includes('L '+M.main02.text));assert.equal(f.m.read(f.b.cmd),77n);assert.equal(f.low.read('who'),1n);
});
test('Statement GETCMD final POINTS unresolved continuation remains explicit on death',()=>{
  const f=fixture([]);f.high.write('shpcon',BigInt(K.KENDAM),1,K.KSDAM);assert.throws(f.run,/POINTS DO continuation/);assert.equal(f.low.read('who'),1n);assert.ok(!f.b.events.includes('free'));
});
test('Statement GETCMD statistics failure leaves identity snapshots and WHO intact before FREE',()=>{
  const f=fixture([]);f.high.write('shpcon',BigInt(K.KENDAM),1,K.KSDAM);f.b.io.etim=function*(){return 0n;};f.b.io.points=function*(){f.m.write(f.endgame.total,99n);};f.b.io.updsta=function*(){throw new Error('statistics fault');};assert.throws(f.run,/statistics fault/);assert.equal(f.low.read('who'),1n);assert.equal(f.m.read(f.b.locals.txtot),99n);assert.ok(!f.b.events.includes('free'));
});
test('Statement GETCMD composes actual FREE on death before clearing WHO',()=>{
  const f=fixture([]);f.high.write('shpcon',BigInt(K.KENDAM),1,K.KSDAM);f.b.io.etim=function*(){return 0n;};f.b.io.points=function*(){f.m.write(f.endgame.total,1n);};f.b.io.updsta=function*(){};assert.equal(f.run(),77n);assert.equal(f.low.read('who'),0n);assert.equal(f.high.read('alive',1),1n);assert.equal(f.high.read('shpcon',1,K.KVPOS),0n);assert.equal(f.free.fr.read('tshpco',K.KSDAM),BigInt(K.KENDAM));
});
test('Statement GETCMD ENDGAM failure stops before clearing CCFLG and printing prompt',()=>{
  const f=fixture();f.b.io.endgam=function*(){f.low.write('ccflg',-1n);throw new Error('endgame stop');};assert.throws(f.run,/endgame stop/);assert.equal(f.low.read('ccflg'),-1n);assert.ok(!f.b.events.includes('prompt'));
});
test('Statement PROMPT normal branch prints the source label through raw OUT',()=>{
  const f=fixture();finish(f.b.prompt());assert.equal(f.output(),M.comlin.text);
});
test('Statement PROMPT informative thresholds compose raw integer and character output',()=>{
  const f=fixture();f.low.write('prtype',-1n);f.high.write('shpdam',BigInt(K.KCRIT),1,K.KDLIFE);f.high.write('shpcon',12n,1,K.KLFSUP);f.high.write('shpcon',100n,1,K.KSSHPC);f.high.write('shpcon',20000n,1,K.KSDAM);f.high.write('shpcon',10000n,1,K.KSNRGY);finish(f.b.prompt());assert.equal(f.output(),'12LSDE> ');
});
test('Statement PROMPT rechecks life damage after the reserve number output',()=>{
  const f=fixture();f.low.write('prtype',-1n);f.high.write('shpdam',BigInt(K.KCRIT),1,K.KDLIFE);f.high.write('shpcon',12n,1,K.KLFSUP);f.high.write('shpcon',101n,1,K.KSSHPC);f.high.write('shpcon',1n,1,K.KSHCON);const odec=f.b.promptIO.odec;f.b.promptIO.odec=function*(a,z){yield*odec(a,z);f.high.write('shpdam',0n,1,K.KDLIFE);};finish(f.b.prompt());assert.equal(f.output(),'12> ');
});
test('Statement PROMPT required logical policy determines positive PRTYPE behavior',()=>{
  const f=fixture();f.low.write('prtype',1n);finish(f.b.prompt());assert.equal(f.output(),M.comlin.text);
});
test('Statement PROMPT shield condition uses the required compound OR evaluation service',()=>{
  const f=fixture();f.low.write('prtype',-1n);let calls=0;f.b.promptIO.or=function*(...terms){let yes=false;for(const t of terms){yes=(yield*t())||yes;calls++;}return yes;};finish(f.b.prompt());assert.equal(calls,2);assert.ok(f.output().endsWith('S> '));
});
test('Raw TELL creation reaches GETCMD notification delivery before its command prompt',()=>{
  const f=fixture([]);f.editor.feed('TELL L; Hello captain\n');finish(f.tokens.run());for(const ship of ships)f.high.write('names',packAscii(ship.name.toUpperCase().slice(0,5)),ship.id,1);f.low.write('who',2n);f.low.write('rptflg',0n);finish(f.tell.run());f.low.write('who',1n);f.editor.feed('TIME\n');const before=f.text().length;assert.equal(f.run(),27n);const text=f.text().slice(before);assert.ok(text.startsWith(M.mess01.text+'N to  L\r\n Hello captain\r\n\r\n'));assert.ok(text.indexOf('Hello captain')<text.indexOf(M.comlin.text));assert.equal(f.high.read('msgflg',1),0n);
});
test('Statement GETCMD consumes slash-separated commands through successive raw input calls',()=>{
  const f=fixture(['TIME/RADIO OFF']);assert.equal(f.run(),27n);assert.equal(f.run(),17n);assert.equal(f.high.read('comknt'),2n);finish(f.radio.run());assert.equal(f.high.read('nomsg')&1n,1n);
});
test('Statement GETCMD FREE failure preserves WHO after statistics submission',()=>{
  const f=fixture([]);f.high.write('shpcon',BigInt(K.KENDAM),1,K.KSDAM);f.b.io.etim=function*(){return 0n;};f.b.io.points=function*(){f.m.write(f.endgame.total,99n);};let submitted=false;f.b.io.updsta=function*(){submitted=true;};f.b.io.free=function*(){throw new Error('free fault');};assert.throws(f.run,/free fault/);assert.equal(submitted,true);assert.equal(f.low.read('who'),1n);assert.equal(f.m.read(f.b.cmd),77n);
});
test('Statement GETCMD PAUSE failure leaves PTIME uncleared',()=>{
  const f=fixture();f.low.write('ptime',123n);f.b.io.pause=function*(a){assert.equal(a,f.low.address('ptime'));throw new Error('pause fault');};assert.throws(f.run,/pause fault/);assert.equal(f.low.read('ptime'),123n);assert.ok(!f.b.events.includes('prompt'));
});
