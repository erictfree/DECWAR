import test from 'node:test';
import assert from 'node:assert/strict';
import { fortranDataWords } from '../src/generated/fortran-data.ts';
import { commonLayout } from '../src/generated/common-layout.ts';
import { fortranData } from '../tools/data.ts';
import { sourceFile } from '../tools/source.ts';
import { constants as K, commands, pregame, deviceKeys, ships, terminalWords } from '../src/generated/source-data.ts';
import { AddressSpace, CommonBlock } from '../src/compat/memory.ts';
import { highState, lowState } from '../src/game/common-state.ts';
import { createDataImage, loadHighData, loadPregameData, dataTables } from '../src/game/data-initialization.ts';
import { packAscii, signed36, unpackAscii } from '../src/compat/word36.ts';
import { resolveCommand, equal } from '../src/compat/parser.ts';
import { setCommand } from '../src/game/set-command.ts';
import { damage } from '../src/game/reports.ts';
import { help, allHelp, extraHelp } from '../src/game/help.ts';
import { typeCommand } from '../src/game/type-command.ts';
import { getPregameCommand, PregameCommandLocals } from '../src/game/pregame.ts';
import { getCommand } from '../src/game/get-command.ts';
import { CommandInput } from '../src/compat/command-input.ts';
import { setup } from '../src/game/setup.ts';
import type { SetupWorld } from '../src/game/setup.ts';
import { setupFixture } from './support/setup-fixture.ts';
import { done } from './support/weapon-damage-fixture.ts';

// Test-only compiler contract: ASCII words, right-space-padded to five bytes.
// Required production encoding is not inferred from these expected values.
const image=createDataImage(literal=>packAscii(literal.text.padEnd(5,' ')));
function fixture(highWords=Array<bigint>(2922).fill(77n)) {
  const space=new AddressSpace(),lowWords=Array<bigint>(128).fill(88n),preWords=Array<bigint>(32).fill(99n);
  space.map(0o400010n,highWords);space.map(0o140n,lowWords);space.map(0o10000n,preWords);
  const high=new CommonBlock(space,'hiseg'),low=new CommonBlock(space,'lowseg'),h=highState(high,{logical:n=>n<0n,trueWord:-1n,falseWord:0n}),l=lowState(low);
  return{space,high,low,h,l,highWords,lowWords,preWords,tables:dataTables(high,{memory:space,address:0o10000n}),
    load(){loadHighData(image,high);loadPregameData(image,space,0o10000n);}};
}

function complete(run:{next():IteratorResult<unknown,unknown>}) {assert.equal(run.next().done,true);}

test('selected FORTRAN DATA extraction covers all twelve statements and 219 unique destinations',()=>{
  assert.deepEqual(fortranDataWords,fortranData(K,commonLayout.hiseg));assert.equal(fortranDataWords.length,219);
  assert.equal(new Set(fortranDataWords.map(w=>w.file+':'+w.line)).size,12);assert.equal(new Set(fortranDataWords.map(w=>w.scope+':'+w.offset)).size,219);
  assert.deepEqual([...new Set(fortranDataWords.map(w=>w.file))],['BLKDAT.FOR','SETUP.FOR']);
  for(const entry of fortranDataWords)assert.match(sourceFile(entry.file).split('\n')[entry.line-1],/^\s*data /i);
});

test('literal image compiler receives every quoted and Hollerith word with its exact origin',()=>{
  const calls:{kind:string;text:string;field:string}[]=[];const built=createDataImage((literal,origin)=>{calls.push({kind:literal.kind,text:literal.text,field:origin.field});return 1n<<36n|123n;});
  assert.equal(calls.length,169);assert.equal(calls.filter(c=>c.kind==='hollerith').length,9);assert.equal(calls.filter(c=>c.kind==='quoted').length,160);
  assert.deepEqual(calls.find(c=>c.field==='names'&&c.text===' W'),{kind:'quoted',text:' W',field:'names'});
  assert.ok(built.filter((_,i)=>fortranDataWords[i].value.kind!=='integer').every(w=>w.word===123n));
});

test('DATA retains integer, octal and symbolic values without invoking a literal compiler for them',()=>{
  const ints=fortranDataWords.filter(w=>w.value.kind==='integer');assert.equal(ints.length,50);
  assert.deepEqual(ints.filter(w=>w.field==='bits').map(w=>w.value.kind==='integer'?w.value.word:''),Array.from({length:10},(_,i)=>String(1<<i)));
  const f=fixture();f.load();assert.equal(f.high.read('sbits',0),BigInt(K.NEUBIT));assert.equal(f.high.read('sbits',1),BigInt(K.FEDBIT));assert.equal(f.high.read('sbits',2),BigInt(K.EMPBIT));
});

test('NAMES DATA implied loops follow ship-first source order while writes land in column-major storage',()=>{
  const entries=fortranDataWords.filter(w=>w.field==='names');assert.deepEqual(entries.slice(0,4).map(w=>w.indices),[[1,1],[1,2],[1,3],[2,1]]);
  assert.deepEqual(entries.slice(0,4).map(w=>w.offset),[2751,2761,2771,2752]);const f=fixture();f.load();
  for(let i=1;i<=10;i++){const name=unpackAscii(f.h.players[i].shipName1)+unpackAscii(f.h.players[i].shipName2);assert.equal(name,ships[i-1].name.padEnd(10,' '));}
  assert.equal(f.h.bits(0),signed36(packAscii(' W   ')));
});

test('command, help and terminal DATA keeps first index innermost and all padding/case',()=>{
  const f=fixture();f.load();const entries=fortranDataWords.filter(w=>w.field==='isaydo');assert.deepEqual(entries.slice(0,4).map(w=>w.indices),[[1,1],[2,1],[1,2],[2,2]]);
  for(const command of commands)assert.equal(unpackAscii(f.high.read('isaydo',1,command.id))+unpackAscii(f.high.read('isaydo',2,command.id)),command.words.join(''));
  assert.equal(f.tables.helpWord(1,2),'     ');for(let i=1;i<=8;i++)assert.equal(f.tables.terminalWord(1,i)+f.tables.terminalWord(2,i),terminalWords[i-1].join(''));
});

test('Hollerith DEVICE keys are compiled from the original 2H forms, not inferred full device names',()=>{
  const entries=fortranDataWords.filter(w=>w.field==='device');assert.deepEqual(entries.map(w=>w.value.source),deviceKeys.map(s=>'2H'+s));
  const f=fixture();f.load();for(let i=1;i<=9;i++)assert.equal(f.tables.deviceWord(i),deviceKeys[i-1]+'   ');
});

test('loading high DATA changes precisely 187 words and preserves uninitialized cells and all LOWSEG',()=>{
  const f=fixture();loadHighData(image,f.high);const offsets=new Set(image.filter(w=>w.scope==='hiseg').map(w=>w.offset));assert.equal(offsets.size,187);
  for(let i=0;i<f.highWords.length;i++)if(!offsets.has(i))assert.equal(f.highWords[i],77n,'uninitialized word '+i);
  assert.ok(f.lowWords.every(w=>w===88n));assert.ok(f.preWords.every(w=>w===99n));assert.equal(f.h.players[1].alive,77n);assert.equal(f.h.players[1].ship.energy,77n);
});

test('BITS(11:18) remains supplied memory despite the excluded DW2 file initializing eighteen entries',()=>{
  const f=fixture();f.load();assert.deepEqual(Array.from({length:8},(_,i)=>f.high.read('bits',i+11)),Array(8).fill(77n));
  assert.match(sourceFile('DW2.FOR'),/data \(bits\(i\), i = 1, 18\)/i);assert.ok(!sourceFile('DECCMP.CMD').toLowerCase().split(/[\s,]+/).includes('dw2'));
});

test('SETUP DATA seeds NUMPLY/NUMSID/TIM0 only when the image is explicitly loaded',()=>{
  const f=fixture();f.load();assert.equal(f.h.values.numply,0n);assert.deepEqual(f.h.numsid.slice(1),[0n,0n]);assert.equal(f.h.values.tim0,-1n);
  assert.equal(f.h.values.hitime,77n);assert.equal(f.h.values.versio,77n);f.h.values.numply=3n;f.h.values.tim0=200n;
  dataTables(f.high,{memory:f.space,address:0o10000n});assert.equal(f.h.values.numply,3n);assert.equal(f.h.values.tim0,200n);
});

test('new job loads only private PRECMD and retains an existing shared galaxy',()=>{
  const a=fixture();a.load();a.h.values.numply=4n;a.h.players[1].ship.energy=1234n;const b=fixture(a.highWords);
  loadPregameData(image,b.space,0o10000n);assert.equal(b.h.values.numply,4n);assert.equal(b.h.players[1].ship.energy,1234n);
  b.space.write(0o10000n,packAscii('OTHER'));assert.notEqual(b.preWords[0],a.preWords[0]);assert.equal(a.tables.commandWord('pregame',1),'Activ');
});

test('PRECMD image uses all sixteen FORTRAN slots including ZAP, not the differing assembly KNPCMD',()=>{
  const f=fixture();f.load();assert.equal(image.filter(w=>w.scope==='precmd').length,32);
  for(const command of pregame)assert.equal(f.tables.commandWord('pregame',command.id),command.words[0]);assert.equal(f.tables.commandWord('pregame',16),'*Zap ');
  assert.match(sourceFile('WARMAC.MAC'),/knpcmd==12/);assert.equal(K.KNPCMD,16);assert.ok(image.filter(w=>w.scope==='precmd').every(w=>w.storageType==='implicit-integer'));assert.ok(image.filter(w=>w.scope==='hiseg').every(w=>w.storageType==='integer'));
});

test('literal padding remains an explicit choice and can affect BITS(0) without changing other DATA words',()=>{
  const a=fixture(),b=fixture();loadHighData(image,a.high);loadHighData(createDataImage(l=>packAscii(l.text)),b.high);
  assert.equal(a.h.bits(0),signed36(packAscii(' W   ')));assert.equal(b.h.bits(0),signed36(packAscii(' W')));
  assert.equal(a.h.players[10].shipName1,b.h.players[10].shipName1);assert.equal(a.h.values.tim0,b.h.values.tim0);
});

test('compiler failure while constructing an image does not execute any memory stores',()=>{
  const f=fixture();assert.throws(()=>createDataImage((literal,origin)=>{if(origin.field==='names')throw new Error('fixture missing literal encoding');return packAscii(literal.text);}),/missing literal/);
  assert.ok(f.highWords.every(w=>w===77n));assert.ok(f.preWords.every(w=>w===99n));
});

test('loading uses explicit relocated destinations and refuses the wrong COMMON',()=>{
  const f=fixture();assert.throws(()=>loadHighData(image,f.low),/HISEG/);const other=new AddressSpace(),words=Array<bigint>(2922).fill(55n);other.map(2000n,words);
  const high=new CommonBlock(other,'hiseg',2000n);loadHighData(image,high);assert.equal(high.read('tim0'),-1n);assert.equal(words[0],55n);
});

test('source clear spans preserve loaded tables but reset TIM0 inside mutable HISEG',()=>{
  const f=fixture();f.load();f.high.clear('hfz','hlz');f.low.clear('lfz','llz');assert.equal(f.high.read('tim0'),0n);assert.equal(f.high.read('numply'),0n);
  assert.equal(f.tables.commandWord('game',1),'BAses');assert.equal(f.h.bits(0),signed36(packAscii(' W   ')));assert.equal(f.tables.commandWord('pregame',16),'*Zap ');
});

test('live command resolution observes loaded DATA and later mutations at the original slot',()=>{
  const f=fixture();f.load();assert.deepEqual(resolveCommand('PH','game',f.tables.commandWord),{kind:'command',id:13,name:'PHasers'});
  f.high.write('isaydo',packAscii('ZEBRA'),1,13);assert.equal(resolveCommand('PH','game',f.tables.commandWord).kind,'unknown');assert.equal(resolveCommand('ZEBRA','game',f.tables.commandWord).kind,'command');
});

test('command search stops reading at the second match and does not fetch later corrupted words',()=>{
  const f=fixture();f.load();const reads:number[]=[];
  assert.deepEqual(resolveCommand('B','game',(phase,i)=>{reads.push(i);return f.tables.commandWord(phase,i);}),{kind:'ambiguous'});assert.deepEqual(reads,[1,2]);
});

test('pregame unavailable fallback reads live ISAYDO and stops at the first match',()=>{
  const f=fixture();f.load();const reads:string[]=[];f.high.write('isaydo',packAscii('XYZZY'),1,1);
  assert.deepEqual(resolveCommand('XYZZY','pregame',(p,i)=>{reads.push(p+':'+i);return f.tables.commandWord(p,i);}),{kind:'unavailable'});
  assert.equal(reads.length,17);assert.equal(reads.at(-1),'game:1');
});

test('XGTCMD composes private DATA initialization and live command-table mutation',()=>{
  const f=fixture();f.load();f.low.clear('lfz','llz');f.l.values.hungup=0n;f.space.write(0o10000n+30n,packAscii('XYZZY'));const input=new CommandInput(),local=new PregameCommandLocals();
  const result=done(getPregameCommand({ccflg:0n,hungup:0n,pasflg:0n},input,local,f.l.output,{commandWord:f.tables.commandWord,logical:n=>n<0n,dmpbuf(){},*input(){return true;},*gtkn(){input.acceptLine('XYZZY');input.acquire(f.l.output);},*monit(){assert.fail();}}));
  assert.equal(result,16);assert.equal(local.cmd,16);assert.equal(f.l.output.drain(),'\r\nPG> ');
});

test('GETCMD composes high DATA, actual player memory and live command lookup',()=>{
  const f=fixture();f.load();f.high.clear('hfz','hlz');f.low.clear('lfz','llz');f.high.write('isaydo',packAscii('XYZZY'),1,27);f.h.players[1].ship.energy=50000n;const input=new CommandInput();
  const ctx={who:1,team:1,oflg:0,prtype:0,pasflg:-1n,ptime:0n,ccflg:0n,hungup:0n,shared:{players:f.h.players,comknt:0n,numply:1n}};
  const result=done(getCommand(ctx,input,f.l.output,{commandWord:f.tables.commandWord,ttyon(){},dmpbuf(){},cctrap(){},*pause(){assert.fail();},*zaplok(){},*input(){return true;},*gtkn(){input.acceptLine('XYZZY');input.acquire(f.l.output);},clear(){input.discardTail();},*outhit(){assert.fail();},*outmsg(){assert.fail();},*endgam(){},daytime:()=>0n,*points(){assert.fail();},*updsta(){assert.fail();},*free(){assert.fail();}}));
  assert.deepEqual(result,{kind:'command',id:27});assert.equal(f.l.output.drain(),'\r\nCommand: ');
});

test('TYPE uses current memory for terminal zero and captures both words after its label output',()=>{
  const f=fixture();f.load();f.low.clear('lfz','llz');const settings={oflg:0,prtype:0,scnflg:0,icflg:0,ocflg:0,ttytyp:0};
  f.high.write('xhelp',packAscii('ALT  '),1,8);f.high.write('xhelp',packAscii('TTY  '),2,8);
  complete(typeCommand(1,settings,{romulan:false,blackHoles:false},[],f.l.output,f.tables.terminalWord));assert.ok(f.l.output.drain().endsWith('Terminal type:  ALT  TTY  \r\n'));
});

test('TYPE OUT2W respects an embedded NUL in the compiled first word',()=>{
  const f=fixture();f.load();f.low.clear('lfz','llz');f.high.write('ttydat',packAscii('X'),1,1);
  complete(typeCommand(1,{oflg:0,prtype:0,scnflg:0,icflg:0,ocflg:0,ttytyp:1},{romulan:false,blackHoles:false},[],f.l.output,f.tables.terminalWord));
  assert.ok(f.l.output.drain().endsWith('Terminal type:  X\r\n'));
});

test('DATA-seeded SETUP creates the first galaxy through actual memory clearing, PLACE and ship initialization',()=>{
  const f=fixture();f.load();const s=setupFixture(['','','','','L']);
  const world:SetupWorld=Object.assign(Object.create(f.h.values),{players:f.h.players,board:f.h.board,bases:f.h.bases,planets:f.h.planets,nbase:f.h.nbase,numcap:f.h.numcap,numsid:f.h.numsid,numshp:f.h.numshp,scores:f.h.scores,killed:f.h.killed});
  Object.defineProperty(world,'nplnet',{get:()=>Number(f.high.read('nplnet')),set:(n:number)=>f.high.write('nplnet',BigInt(n))});
  const io={...s.io,zeroHighSegment(){s.events.push('full-HFZ-HLZ');f.high.clear('hfz','hlz');}};
  const run=setup(s.ctx,world,s.identity,s.input,s.local,s.placement,s.out,io);for(;;){const n=run.next();if(n.done)break;}
  assert.ok(s.events.includes('full-HFZ-HLZ'));assert.equal(f.high.read('tim0'),1000n);assert.equal(f.high.read('numply'),1n);assert.equal(f.high.read('nplnet'),60n);
  assert.equal(f.high.read('alive',1),-1n);assert.equal(f.high.read('shpcon',1,K.KSNRGY),50000n);assert.equal(f.high.read('numsid',1),1n);
  assert.equal(f.high.read('numshp',1),1n);assert.equal(f.high.read('nbase',2),10n);assert.equal(f.tables.commandWord('game',1),'BAses');assert.equal(f.h.bits(18),77n);
  assert.equal(f.h.scores.player(1,1),0n);assert.equal(f.h.scores.player(1,2),77n);assert.ok(s.out.drain().includes('Lexington '));
});

test('a later SETUP invocation preserves DATA-seeded shared counters and does not reload the galaxy',()=>{
  const f=fixture();f.load();f.high.clear('hfz','hlz');f.h.values.tim0=100n;f.h.values.hitime=10000n;f.h.values.numply=1n;
  f.h.players[6].alive=-1n;f.h.numsid[2]=1n;f.h.players[1].alive=1n;const s=setupFixture(['','L']);
  const world:SetupWorld=Object.assign(Object.create(f.h.values),{players:f.h.players,board:f.h.board,bases:f.h.bases,planets:f.h.planets,nbase:f.h.nbase,numcap:f.h.numcap,numsid:f.h.numsid,numshp:f.h.numshp,scores:f.h.scores,killed:f.h.killed,nplnet:0});
  const io={...s.io,zeroHighSegment(){assert.fail('Existing universe must not reload/clear');}};
  const run=setup(s.ctx,world,s.identity,s.input,s.local,s.placement,s.out,io);for(;;){const n=run.next();if(n.done)break;}
  assert.equal(f.h.values.tim0,100n);assert.equal(f.h.values.numply,2n);assert.equal(f.h.numsid[2],1n);assert.equal(f.h.numsid[1],1n);
});

test('TYPE reads live terminal words only after writing its label',()=>{
  const f=fixture();f.load();f.low.clear('lfz','llz');const out=f.l.output,write=out.out.bind(out);
  out.out=(text,lines=0)=>{write(text,lines);if(text==='Terminal type:  '){f.high.write('ttydat',packAscii('NEW  '),1,1);f.high.write('ttydat',packAscii('WORD '),2,1);}};
  complete(typeCommand(1,{oflg:0,prtype:0,scnflg:0,icflg:0,ocflg:0,ttytyp:1},{romulan:false,blackHoles:false},[],out,f.tables.terminalWord));
  assert.ok(out.drain().endsWith('Terminal type:  NEW  WORD \r\n'));
});

test('SET TTYTYPE selects the current loaded terminal word and TYPE reports the same storage',()=>{
  const f=fixture();f.load();f.low.clear('lfz','llz');f.high.write('ttydat',packAscii('XYZZY'),1,3);const input=new CommandInput();input.acceptLine('SET TTYTYPE XYZZY');input.acquire(f.l.output);
  const settings={oflg:0,prtype:0,scnflg:0,icflg:0,ocflg:0,ttytyp:8};complete(setCommand({settings,password:0n,board:f.h.board,romopt:0n,endflg:0n},input.tokens,f.l.output,{usrnam:()=>assert.fail(),endgam:()=>assert.fail(),terminalWord:f.tables.terminalWord}));
  assert.equal(settings.ttytyp,3);complete(typeCommand(1,settings,{romulan:false,blackHoles:false},[],f.l.output,f.tables.terminalWord));assert.ok(f.l.output.drain().endsWith('Terminal type:  XYZZYa    \r\n'));
});

test('DAMAGE selects devices using live compiled Hollerith words',()=>{
  const f=fixture();f.load();f.high.clear('hfz','hlz');f.low.clear('lfz','llz');f.h.players[1].ship.devices[1]=5678n;f.h.players[1].ship.devices[2]=1234n;
  f.high.write('device',packAscii('XYZZY'),2);const input=new CommandInput();input.acceptLine('DAMAGE XYZZY');input.acquire(f.l.output);
  damage({ship:f.h.players[1].ship,who:1,board:f.h.board,oflg:0,nomsg:0n,deviceWord:f.tables.deviceWord},input.tokens,2,f.l.output);
  const text=f.l.output.drain();assert.ok(text.includes('123.4'));assert.ok(!text.includes('567.8'));
});

test('HLPALL reads live command words and retains the source privilege-dependent list length',()=>{
  const f=fixture();f.load();f.low.clear('lfz','llz');f.high.write('isaydo',packAscii('XYZZY'),1,1);
  allHelp(0n,f.l.output,f.tables.helpTables.commands);const publicText=f.l.output.drain();assert.ok(publicText.includes('XYZZY'));assert.ok(!publicText.includes('*Debug'));
  f.high.write('isaydo',packAscii('ZZZZZ'),1,1);allHelp(-1n,f.l.output,f.tables.helpTables.commands);const privileged=f.l.output.drain();assert.ok(privileged.includes('ZZZZZ'));assert.ok(privileged.includes('*Debug'));
});

test('HLPXTR reads the live two-word extra-help table including its originally blank second row',()=>{
  const f=fixture();f.load();f.low.clear('lfz','llz');f.high.write('xhelp',packAscii('XYZZY'),1,2);f.high.write('xhelp',packAscii('TEXT '),2,2);
  extraHelp(f.l.output,f.tables.helpTables.extra);assert.ok(f.l.output.drain().includes('XYZZYTEXT '));
});

test('HELP driver resolves a live extra-help keyword then uses the actual SHLP byte reader',()=>{
  const f=fixture();f.load();f.low.clear('lfz','llz');f.high.write('xhelp',packAscii('XYZZY'),1,2);const input=new CommandInput();input.acceptLine('HELP XYZZY');input.acquire(f.l.output);
  const file='\n.XYZZY\r\nLive table help body\r\n.NEXT\r\nOther body';let offset=0;const calls:string[]=[];
  done(help({who:0,ccflg:0n,jbren:0n,pasflg:0n,players:f.h.players},input,f.h.board,f.l.output,{
    tables:f.tables.helpTables,outstr:()=>assert.fail(),*open(block){calls.push(block);return true;},*close(){calls.push('close');},seti(){},*ichr(){return offset<file.length?BigInt(file.charCodeAt(offset++)):-1n;},warn:()=>assert.fail(),
  }));
  assert.ok(f.l.output.drain().includes('Live table help body'));assert.deepEqual(calls,['hl2fil','close']);
});
