import test from 'node:test';
import assert from 'node:assert/strict';
import { inputLayout } from '../src/generated/input-layout.ts';
import { inputLayout as extractLayout } from '../tools/input-layout.ts';
import { AddressSpace, CommonBlock } from '../src/compat/memory.ts';
import { MemoryCommandInput } from '../src/compat/input-memory.ts';
import { gtkn, clearInput } from '../src/compat/gtkn.ts';
import type { TokenReadState, TokenReadServices } from '../src/compat/gtkn.ts';
import { inputReady } from '../src/compat/wait.ts';
import { CommandScanner, UnresolvedFloatInput } from '../src/compat/parser.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { packAscii, unpackAscii, unpackSixbit, signed36, MAX_INTEGER, MIN_INTEGER } from '../src/compat/word36.ts';
import { constants as K } from '../src/generated/source-data.ts';
import { usrnam } from '../src/game/name.ts';
import { lowState, highState } from '../src/game/common-state.ts';
import { status } from '../src/game/reports.ts';
import { initialShip } from '../src/game/ship.ts';
import { setCommand } from '../src/game/set-command.ts';
import { MessageQueue, makeMessageFromInput, messageText } from '../src/game/message-queue.ts';
import { getCommand } from '../src/game/get-command.ts';
import { locate, LocateLocals } from '../src/game/locate.ts';
import { rational as real } from './support/rational-real.ts';

function fixture(prior=0n, base=BigInt(inputLayout.address)) {
  const space=new AddressSpace(), words=Array<bigint>(inputLayout.words+3).fill(prior), lowWords=Array<bigint>(128).fill(prior);
  space.map(base,words);space.map(0o140n,lowWords);space.map(0o400010n,Array<bigint>(2922).fill(0n));
  const low=new CommonBlock(space,'lowseg'), high=new CommonBlock(space,'hiseg');
  // Explicit fixture policy for FORTRAN token assignments: NUL padding.
  const input=new MemoryCommandInput(low,packAscii,base), out=new TerminalOutput();
  const state:TokenReadState={locked:0n,svlock:0n,iniflg:0n,hungup:0n,ccflg:0n,
    get ccflgDot(){return input.ccflgDot;},set ccflgDot(n){input.ccflgDot=n;}};
  return {space,words,lowWords,low,high,input,out,state,l:lowState(low),h:highState(high,{logical:n=>n<0n,trueWord:-1n,falseWord:0n})};
}
function done<T>(g:Generator<unknown,T,void>):T{const r=g.next();assert.equal(r.done,true);return r.value;}
function services(line=''):TokenReadServices<never>{return{daytime:()=>0n,inputPending:()=>false,unlo(){},*lock(){return true;},*hibernate(){},*inli(){return{text:line,repeated:false};}};}
function accept(f:ReturnType<typeof fixture>,line:string){f.input.acceptLine(line);assert.equal(f.input.acquire(f.out),true);}

test('input layout uses the public CCFLG. link-map anchor and adjacent source words',()=>{
  assert.deepEqual(inputLayout,extractLayout());assert.equal(inputLayout.address,0o4627);assert.equal(inputLayout.mapLine,701);
  assert.equal(inputLayout.words,84);assert.equal(inputLayout.fields.linbuf.offset,3);assert.equal(inputLayout.fields.linbuf.words,81);
});

test('constructing memory input does not initialize buffer, pointers, token arrays or counts',()=>{
  const f=fixture(77n);assert.ok(f.words.every(n=>n===77n));assert.ok(f.lowWords.every(n=>n===77n));
  assert.equal(f.input.pointer,77n);assert.equal(f.input.ntok,77);assert.equal(f.input.tokens[0].value,77n);
});

test('edited-line installation stores one character per word, a NUL and CHRCNT including NUL',()=>{
  const f=fixture(77n);f.input.acceptLine('ab 12');
  assert.deepEqual(f.words.slice(3,10),[97n,98n,32n,49n,50n,0n,77n]);assert.equal(f.input.block.read('chrcnt'),6n);
  assert.equal(f.input.pointer,f.input.lineAddress);assert.equal(f.low.read('rptflg'),0n);assert.equal(f.input.rawLine,'ab 12');
});

test('NXTT writes packed uppercase text, signed numeric values and absolute token addresses',()=>{
  const f=fixture();accept(f,'  abcdef -123,+,x9');
  assert.equal(f.low.read('tknlst',1),signed36(packAscii('ABCDE')));assert.equal(f.low.read('vallst',2),-123n);
  assert.deepEqual(f.input.tokens.slice(0,5).map(t=>t.type),[3,1,0,3,-1]);assert.equal(f.input.ntok,4);
  assert.equal(f.low.read('ptrlst',1),f.input.lineAddress+2n);assert.equal(f.low.read('ptrlst',2),f.input.lineAddress+9n);
  assert.equal(f.input.tokens[1].offset,9);assert.equal(f.input.pointer,-1n);
});

test('integer overflow follows 36-bit accumulation while packed text retains only five characters',()=>{
  const f=fixture();accept(f,'34359738368 -34359738369');
  assert.equal(f.input.tokens[0].value,MIN_INTEGER);assert.equal(f.input.tokens[1].value,MAX_INTEGER);
  assert.equal(f.input.tokens[0].text,'34359');assert.equal(f.input.tokens[1].text,'-3435');
});

test('memory scanning agrees with source-derived component fixtures across delimiter and numeric edge cases',()=>{
  for(const line of ['', ' ', ',', ',,', '1,', '1,,2', '1 / 2/', 'STATUS;ignored', 'a\tb  c', '-', '+', '--', '1-2', 'abc.5', '`{|}~', '12AB34', '1 2 3 4 5 6 7 8 9 10 11 12 13 14', '1 2 3 4 5 6 7 8 9 10 11 12 13 14 15']){
    const f=fixture(),scanner=new CommandScanner(line);f.input.acceptLine(line);
    for(let command=scanner.next();command;command=scanner.next()){
      assert.equal(f.input.acquire(f.out),true,line);
      assert.deepEqual(f.input.tokens.slice(0,f.input.ntok+1).map(t=>({text:t.text,type:t.type,value:t.value})),
        command.tokens.map(t=>({text:t.text,type:t.type,value:t.value})),line);
    }
    assert.equal(f.input.acquire(f.out),false,line);
  }
});

test('shorter commands preserve unused slots and the appended EOL pointer',()=>{
  const f=fixture();accept(f,'STATUS ABC 123 DEF');const pointer=f.low.read('ptrlst',2),fourth={...f.input.tokens[3]};
  accept(f,'STATUS');assert.equal(f.low.read('ptrlst',2),pointer);assert.deepEqual({...f.input.tokens[3]},fourth);
  assert.equal(f.low.read('tknlst',2),0n);assert.equal(f.low.read('typlst',2),-1n);assert.equal(f.low.read('vallst',3),123n);
});

test('overflow emits the source error before resetting NTOK and retains scanned/stale slots',()=>{
  const f=fixture();f.input.ntok=9;f.input.tokens[14].text='OLD';f.input.tokens[14].value=999n;
  f.input.acceptLine('1 2 3 4 5 6 7 8 9 10 11 12 13 14 15');
  const original=f.out.out.bind(f.out);f.out.out=(...args)=>{assert.equal(f.input.ntok,9);assert.equal(f.input.tokens[13].value,14n);return original(...args);};
  f.input.acquire(f.out);assert.equal(f.input.ntok,0);assert.equal(f.input.tokens[0].type,-1);
  assert.equal(f.input.tokens[13].value,14n);assert.equal(f.input.tokens[14].value,999n);assert.equal(f.input.pointer,-1n);
  assert.equal(f.out.drain(),'Too many words -- line ignored\r\n');
});

test('unresolved floating input retains completed tokens and the current partial TKNLST/PTRLST writes',()=>{
  const f=fixture(77n);f.input.ntok=8;f.input.acceptLine('ABC 12.5');
  assert.throws(()=>f.input.acquire(f.out),UnresolvedFloatInput);
  assert.equal(f.input.tokens[0].text,'ABC');assert.equal(f.input.tokens[0].type,3);assert.equal(f.input.tokens[1].text,'12');
  assert.equal(f.low.read('ptrlst',2),f.input.lineAddress+4n);assert.equal(f.input.pointer,f.input.lineAddress+6n);
  assert.equal(f.low.read('vallst',2),77n);assert.equal(f.low.read('typlst',2),77n);assert.equal(f.input.ntok,8);assert.equal(f.out.drain(),'');
});

test('slash stays in BUFPTR until continuation and external edits to LINBUF affect the next command',()=>{
  const f=fixture();accept(f,'TIME/USERS');assert.equal(f.input.pointer,f.input.lineAddress+4n);assert.equal(f.input.available,true);
  f.space.write(f.input.lineAddress+5n,84n);f.space.write(f.input.lineAddress+6n,89n);f.space.write(f.input.lineAddress+7n,80n);f.space.write(f.input.lineAddress+8n,69n);f.space.write(f.input.lineAddress+9n,0n);
  f.input.acquire(f.out);assert.equal(f.input.tokens[0].text,'TYPE');assert.equal(f.out.drain(),'\r\n');assert.equal(f.input.pointer,-1n);
});

test('GTKN advances a buffered slash before OCRL and avoids all monitor/lock calls',()=>{
  const f=fixture();accept(f,'TIME/USERS');const io=services();io.inli=function*(){assert.fail('buffered command');};
  const original=f.out.crlf.bind(f.out);f.out.crlf=()=>{assert.equal(f.input.pointer,f.input.lineAddress+5n);original();};
  done(gtkn(f.state,f.input,f.out,io));assert.equal(f.input.tokens[0].text,'USERS');assert.equal(f.input.ccflgDot,1n);assert.equal(f.out.drain(),'\r\n');
});

test('GTKN new-line path leaves BUFPTR at -1 during lock reacquisition and sets it after the wait',()=>{
  const f=fixture();f.input.pointer=-1n;f.state.locked=7n;const events:string[]=[];
  const io:TokenReadServices<string>={...services(),unlo(key){events.push('unlo:'+key);assert.equal(f.input.pointer,0n);},
    *inli(){assert.equal(f.input.pointer,-1n);events.push('inli');return{text:'TIME',repeated:false};},
    *lock(key){events.push('lock:'+key);assert.equal(f.input.pointer,-1n);assert.equal(f.input.rawLine,'TIME');yield 'lock';return true;}};
  const g=gtkn(f.state,f.input,f.out,io);assert.equal(g.next().value,'lock');assert.equal(f.input.ntok,0);
  assert.equal(g.next().done,true);assert.equal(f.input.tokens[0].text,'TIME');assert.equal(f.input.pointer,-1n);assert.deepEqual(events,['unlo:7','inli','lock:7']);
});

test('Ctrl-C tail discard skips the BUFPTR increment before beginning a new line',()=>{
  const f=fixture();accept(f,'TIME/USERS');const old=f.input.pointer;f.input.ccflgDot=-1n;f.state.locked=7n;
  const io=services('POINTS');io.unlo=()=>assert.equal(f.input.pointer,old);
  done(gtkn(f.state,f.input,f.out,io));assert.equal(f.input.ccflgDot,0n);assert.equal(f.input.tokens[0].text,'POINT');assert.equal(f.out.drain(),'');
});

test('hangup on entry preserves everything and hangup after input forces QUIT without overwriting value/pointers',()=>{
  const f=fixture(77n);f.state.hungup=-1n;const before=f.words.slice();done(gtkn(f.state,f.input,f.out,services()));assert.deepEqual(f.words,before);
  f.state.hungup=0n;f.input.pointer=-1n;const io=services();io.inli=function*(){f.state.hungup=-1n;return{text:'',repeated:false};};
  done(gtkn(f.state,f.input,f.out,io));assert.equal(f.input.tokens[0].text,'QUIT');assert.equal(f.input.ntok,-3670015); // AOJA retains the loop-count left half.
  assert.equal(f.low.read('vallst',1),77n);assert.equal(f.low.read('ptrlst',1),77n);assert.equal(f.low.read('ptrlst',2),77n);
  assert.equal(f.low.read('typlst',2),-1n);assert.equal(f.input.pointer,f.input.lineAddress);
});

test('repeat input reuses current raw words and character count rather than a detached saved string',()=>{
  const f=fixture();accept(f,'TIME');f.space.write(f.input.lineAddress,85n);const count=f.input.block.read('chrcnt');
  const io=services();io.inli=function*(){return{text:'ignored',repeated:true};};done(gtkn(f.state,f.input,f.out,io));
  assert.equal(f.input.tokens[0].text,'UIME');assert.equal(f.input.rawLine,'UIME');assert.equal(f.input.block.read('chrcnt'),count);assert.equal(f.low.read('rptflg'),-1n);
});

test('CLEAR discards BUFPTR without erasing LINBUF, CHRCNT or RPTFLG',()=>{
  const f=fixture();accept(f,'TIME/USERS');f.input.repeated=true;const raw=f.input.rawLine,count=f.input.block.read('chrcnt');let calls=0;
  clearInput(f.state,f.input,()=>calls++);assert.equal(calls,1);assert.equal(f.input.pointer,-1n);assert.equal(f.input.rawLine,raw);
  assert.equal(f.input.block.read('chrcnt'),count);assert.equal(f.input.repeated,true);
});

test('INPUT sees live positive BUFPTR without advancing it or waiting',()=>{
  const f=fixture();accept(f,'TIME/USERS');const old=f.input.pointer;
  assert.equal(done(inputReady(f.state,()=>f.input.available,()=>100n,{...services(),*hibernate(){assert.fail();}})),true);
  assert.equal(f.input.pointer,old);
});

test('token-array overflow and pointer offsets resolve through neighboring LOWSEG words',()=>{
  const f=fixture();f.input.tokens[15].text='ABC';assert.equal(f.low.read('vallst',1),signed36(packAscii('ABC')));
  f.input.tokens[15].type=3;assert.equal(f.low.read('ptrlst',1),3n);
  f.input.tokens[-1].value=123n;assert.equal(f.low.read('tknlst',15),123n);
  f.input.tokens[0].offset=-1;assert.equal(f.low.read('ptrlst',1),f.input.lineAddress-1n);
});

test('FORTRAN token text assignments require the supplied word encoder while NXTT writes ASCII directly',()=>{
  const f=fixture(), calls:string[]=[], input=new MemoryCommandInput(f.low,text=>{calls.push(text);return 123n;});
  input.acceptLine('STATUS');input.acquire(f.out);assert.deepEqual(calls,[]);assert.equal(input.tokens[0].text,'STATU');
  input.tokens[2].text='L';assert.deepEqual(calls,['L']);assert.equal(f.low.read('tknlst',3),123n);
  input.forceQuit();assert.deepEqual(calls,['L']);assert.equal(input.tokens[0].text,'QUIT');
});

test('STATUS token mutations write back to the actual TKNLST and TYPLST without clearing stale VALLST',()=>{
  const f=fixture();accept(f,'STATUS A 123 DEF');accept(f,'STATUS');const ship=initialShip();ship.v=12;ship.h=34;
  status({ship,who:1,oflg:-1,nomsg:0n,board:f.h.board},f.input.tokens,2,f.out);
  assert.equal(f.low.read('ntok'),1n);assert.equal(f.low.read('vallst',3),123n);assert.equal(f.low.read('tknlst',3),signed36(packAscii('L')));
});

test('STATUS full-report token expansion follows actual array overflow instead of resizing memory views',()=>{
  const f=fixture();f.low.write('typlst',-1n,12);
  status({ship:initialShip(),who:1,oflg:0,nomsg:0n,board:f.h.board},f.input.tokens,12,f.out);
  assert.equal(f.input.tokens.length,15);assert.equal(f.low.read('vallst',1),signed36(packAscii('D')));
  assert.equal(f.low.read('ptrlst',4),-1n);assert.equal(f.input.ntok,0);
});

test('STATUS stores all seven Hollerith words before its separate TYPLST loop',()=>{
  const f=fixture(), assignments:string[]=[];f.low.write('typlst',-1n,2);
  const input=new MemoryCommandInput(f.low,text=>{
    assignments.push(text);assert.equal(f.low.read('typlst',2),-1n);assert.equal(f.low.read('typlst',3),0n);
    assert.equal(f.low.read('typlst',9),-1n);return packAscii(text);
  });
  status({ship:initialShip(),who:1,oflg:0,nomsg:0n,board:f.h.board},input.tokens,2,f.out);
  assert.deepEqual(assignments,['C','L','T','E','D','S','R']);assert.equal(f.low.read('typlst',2),3n);assert.equal(f.low.read('typlst',8),3n);
});

test('SET can continue through GTKN while retaining the same memory token objects',()=>{
  const f=fixture();accept(f,'SET OUTPUT/LONG');const token=f.input.tokens[0],ctx={settings:{oflg:0,prtype:0,scnflg:1,icflg:1,ocflg:0,ttytyp:8},password:0n,board:f.h.board,romopt:0n,endflg:0n};
  const command=setCommand(ctx,f.input.tokens,f.out,{usrnam:()=>false,endgam(){assert.fail();}});
  assert.equal(command.next().value,'input');done(gtkn(f.state,f.input,f.out,services()));assert.equal(command.next(f.input.tokens).done,true);
  assert.equal(ctx.settings.oflg,1);assert.equal(f.input.tokens[0],token);assert.equal(f.low.read('tknlst',1),signed36(packAscii('LONG')));
});

test('USRNAM follows absolute PTRLST and clears BUFPTR after writing the JOB name',()=>{
  const f=fixture();accept(f,'SET NAME Alice, Bob/ignored');const old=f.input.pointer;let name='';
  assert.equal(usrnam(f.input,2,(a,b)=>{assert.equal(f.input.pointer,old);name=unpackSixbit(a)+unpackSixbit(b);f.h.players[1].name1=a;f.h.players[1].name2=b;}),true);
  assert.equal(name,'ALICE, BOB/I');assert.equal(f.input.pointer,-1n);
});

test('USRNAM can read a pointer outside LINBUF and does not replace it with a safe string offset',()=>{
  const f=fixture();f.space.write(f.input.lineAddress+81n,88n);f.space.write(f.input.lineAddress+82n,32n);f.space.write(f.input.lineAddress+83n,65n);
  // The next word is deliberately mapped separately to complete the source string.
  f.space.map(f.input.lineAddress+84n,[0n]);f.low.write('ptrlst',f.input.lineAddress+81n,1);let name='';
  assert.equal(usrnam(f.input,1,(a,b)=>{name=unpackSixbit(a)+unpackSixbit(b);}),true);assert.equal(name,'A           ');
});

test('MAKMSG no-argument path reads the live semicolon tail after GTKN discards command continuation',()=>{
  const f=fixture();accept(f,'TELL ALL;Hello');const queue=new MessageQueue();f.l.hit.dbits=1n;f.l.hit.dispfr=101n;
  done(makeMessageFromInput(queue,f.h.players,f.l.values as typeof f.l.values & {ccflg:bigint;dbits:bigint;dispfr:bigint},f.input,f.out,
    { *lock(){return true;},unlo(){},*inli(){assert.fail();},*cancelUnreserved(){assert.fail();} }));
  assert.equal(messageText(queue.data[0].slice(1)),'Hello\r\n');assert.equal(f.h.players[1].msgflg,1n);
});

test('new message INLI leaves BUFPTR discarded and copies the same installed character words',()=>{
  const f=fixture();accept(f,'TELL ALL');f.l.hit.dbits=1n;const queue=new MessageQueue();
  done(makeMessageFromInput(queue,f.h.players,f.l.values as typeof f.l.values & {ccflg:bigint;dbits:bigint;dispfr:bigint},f.input,f.out,
    { *lock(){return true;},unlo(){},*inli(){assert.equal(f.input.pointer,-1n);return{text:'New message',repeated:false};},*cancelUnreserved(){assert.fail();} }));
  assert.equal(f.input.pointer,-1n);assert.equal(f.input.rawLine,'New message');assert.equal(messageText(queue.data[0].slice(1)),'New message\r\n');
});

test('relocated input keeps absolute pointers relative to the selected buffer and rejects non-character machine words',()=>{
  const f=fixture(0n,10000n);accept(f,'ABC');assert.equal(f.low.read('ptrlst',1),10003n);assert.equal(f.input.lineAddress,10003n);
  f.input.acceptLine('ABC');f.space.write(f.input.lineAddress,128n);assert.throws(()=>f.input.acquire(f.out),/CBITS/);
});

test('full eighty-character line uses exactly eighty-one LINBUF words and preserves adjacent memory',()=>{
  const f=fixture(77n);accept(f,'X'.repeat(80));assert.equal(f.input.block.read('chrcnt'),81n);
  assert.equal(f.space.read(f.input.lineAddress+80n),0n);assert.equal(f.space.read(f.input.lineAddress+81n),77n);
  assert.equal(f.input.tokens[0].text,'XXXXX');assert.equal(f.input.ntok,1);assert.equal(f.input.pointer,-1n);
});

test('GETCMD composes live command tables, INPUT and GTKN for two commands on one memory-backed line',()=>{
  const f=fixture();f.input.pointer=-1n;const {devices,...ship}=initialShip();Object.assign(f.h.players[1].ship,ship);
  f.h.players[1].ship.devices.fill(0n,1);f.h.values.numply=2n;
  f.high.write('isaydo',packAscii('TIme '),1,27);f.high.write('isaydo',packAscii('Users'),1,31);
  const ctx={who:1,team:1,oflg:0,prtype:0,pasflg:-2n,ptime:0n,ccflg:0n,hungup:0n,
    shared:Object.assign(Object.create(f.h.values),{players:f.h.players})};
  let lines=0;const io={...services(),inputPending:()=>true,*inli(){lines++;return{text:'TIME/USERS',repeated:false};}};
  const commandIo={commandWord:(_phase:'game'|'pregame',index:number)=>unpackAscii(f.high.read('isaydo',1,index)),
    ttyon(){},dmpbuf(){},cctrap(){},*pause(){assert.fail();},*zaplok(){},
    input:(ms:bigint)=>inputReady(f.state,()=>f.input.available,()=>ms,io),gtkn:()=>gtkn(f.state,f.input,f.out,io),
    clear(){clearInput(f.state,f.input,()=>{});},*outhit(){assert.fail();},*outmsg(){assert.fail();},*endgam(){},daytime:()=>0n,
    *points():Generator<never,bigint,void>{assert.fail();},*updsta(){assert.fail();},*free(){assert.fail();}};
  assert.deepEqual(done(getCommand(ctx,f.input,f.out,commandIo)),{kind:'command',id:27});
  assert.deepEqual(done(getCommand(ctx,f.input,f.out,commandIo)),{kind:'command',id:31});
  assert.equal(lines,1);assert.equal(f.h.values.comknt,2n);assert.equal(f.input.ntok,1);assert.equal(f.input.ccflgDot,2n);
});

test('LOCATE mutates live numeric token words while retaining source text, pointers and NTOK',()=>{
  const f=fixture();accept(f,'MOVE 15 25');const before=f.input.tokens.map(t=>({...t}));
  const result=done(locate('locate',{value:2n},{who:1,icflg:K.KABS,pasflg:0n,shared:{players:f.h.players,board:f.h.board,rom:0n,locr:f.h.locr}},
    f.input,new LocateLocals(real.literal('0')),f.out,{real,logical:n=>n<0n,or:(a,b)=>a()||b(),ownPosition:()=>({v:10n,h:20n}),*gtkn(){assert.fail();},*pause(){assert.fail();}}));
  assert.equal(result,2n);assert.equal(f.low.read('vallst',1),15n);assert.equal(f.low.read('vallst',2),25n);assert.equal(f.input.ntok,3);
  for(let i=0;i<15;i++)assert.deepEqual({...f.input.tokens[i],value:before[i].value},before[i]);
});
