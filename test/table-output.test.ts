import test from 'node:test';
import assert from 'node:assert/strict';
import { outputObject,outputDevice,outputCondition } from '../src/compat/table-output.ts';
import type { ObjectOutputServices } from '../src/compat/table-output.ts';
import { AddressSpace } from '../src/compat/memory.ts';
import { outputString,outputSpace } from '../src/compat/text-output.ts';
import { TerminalOutput } from '../src/compat/output.ts';
import { outputTables as T } from '../src/generated/source-data.ts';
import { divide36,halfWords,packAscii,rightHalf,signed36 } from '../src/compat/word36.ts';
function done<T>(g:Generator<string,T,void>):T{for(;;){const n=g.next();if(n.done)return n.value;}}
function fixture(){
  const m=new AddressSpace();m.map(1000n,Array<bigint>(1000).fill(0n));m.map(4000n,Array<bigint>(2000).fill(0n));
  const s={shtdsp:1100n,lngdsp:1120n,shtshp:1140n,lngshp:1160n,shtdev:1180n,meddev:1200n,lngdev:1220n,lngcnd:1240n,shtcnd:1260n,
    docked:1300n,dockedLong:0n,dockedShort:0n};
  let next=4000n;
  const string=(text:string)=>{const address=next;for(let i=0;i<=text.length;i+=5)m.write(next++,packAscii(text.slice(i,i+5)));return address;};
  // Explicit relocation/ASCII/CPU fixtures; text comes from audited local tables.
  for(const name of ['shtdsp','lngdsp','lngshp','meddev','lngdev','lngcnd','shtcnd'] as const)
    T[name].forEach((v,i)=>{if(v.text!==null)m.write(s[name]+BigInt(i),string(v.text));});
  for(const name of ['shtshp','shtdev'] as const)T[name].forEach((v,i)=>m.write(s[name]+BigInt(i),packAscii(v.text)));
  const indirect=1n<<22n,indexT2=2n<<18n;
  for(const kind of [1n,2n]){m.write(s.shtdsp+kind,indexT2|s.shtshp-1n);m.write(s.lngdsp+kind,indirect|indexT2|s.lngshp-1n);}
  s.dockedLong=string('Docked+');s.dockedShort=string('D+');
  const r={t1:71n,t2:72n,p1:73n,c:74n},state={who:1n,oflg:0n},args=[101n,0n],out=new TerminalOutput(),reads:number[]=[],addresses:bigint[]=[],pointers:bigint[]=[];
  const textIO={*ildb():Generator<string,bigint,void>{let pos=Number((r.p1>>30n)&63n),a=rightHalf(r.p1);assert.equal((r.p1>>24n)&63n,7n);
    if(pos<7){pos=36;a=rightHalf(a+1n);}pos-=7;r.p1=signed36((r.p1&~((63n<<30n)|0o777777n))|(BigInt(pos)<<30n)|a);
    return (m.read(a)>>BigInt(pos))&127n;},*ochr():Generator<string,void,void>{out.character(r.c);}};
  const io:ObjectOutputServices<string>={argument(index){reads.push(index);return args[index];},
    *idiviT1(divisor){const d=divide36(r.t1,divisor);r.t1=d.quotient;r.t2=d.remainder;},
    *indirectAddress(address){addresses.push(address);for(let n=0;n<5;n++){const word=m.read(address),index=(word>>18n)&15n;assert.ok(index===0n||index===2n);
      address=rightHalf(rightHalf(word)+(index===2n?r.t2:0n));if((word&indirect)===0n)return address;}throw new Error('Fixture indirection limit');},
    *ostr(){pointers.push(r.p1);yield*outputString(r,0o440700n,textIO);},*space(){yield*outputSpace(r,textIO);},
  };
  return {m,s,r,state,args,out,reads,addresses,pointers,textIO,io,string};
}
for(const format of [-1n,0n,1n])test(`ODISP composes indexed tables and OSTR for all object classes in format ${format}`,()=>{
  const f=fixture();f.state.oflg=format;
  for(let kind=0;kind<=10;kind++)for(const index of (kind===1||kind===2?[1,10]:[0])){
    f.args[0]=BigInt(kind*100+index);done(outputObject(f.r,f.state,f.s,f.io));
    const text=kind===1||kind===2?(format>0n?T.lngshp:T.shtshp)[index-1].text:(format>0n?T.lngdsp:T.shtdsp)[kind].text;
    assert.equal(f.out.drain(),text);assert.equal(f.r.t1,BigInt(kind));assert.equal(f.r.t2,BigInt(index));
  }
});
test('ODISP negative and cloaked codes clear the pair through the source defensive branches',()=>{
  const f=fixture();for(const code of [-1n,1101n]){f.args[0]=code;done(outputObject(f.r,f.state,f.s,f.io));assert.equal(f.out.drain(),'.');assert.equal(f.r.t1,0n);assert.equal(f.r.t2,0n);}
});
test('ODISP ship index zero reads neighboring short-name storage rather than rejecting the index',()=>{
  const f=fixture();f.args[0]=100n;f.m.write(f.s.shtshp-1n,packAscii('OLD'));done(outputObject(f.r,f.state,f.s,f.io));assert.equal(f.out.drain(),'OLD');
});
test('ODISP takes the effective address, not a pointer word snapshot',()=>{
  const f=fixture();f.io.indirectAddress=function*(){return halfWords(7n,f.string('Alias'));};done(outputObject(f.r,f.state,f.s,f.io));assert.equal(f.out.drain(),'Alias');assert.equal(f.pointers[0]>>18n,0n);
});
test('ODISP rereads OFLG and T1 after a suspended short-table address operation',()=>{
  const f=fixture(),resolve=f.io.indirectAddress;f.io.indirectAddress=function*(address){const result=yield*resolve(address);yield 'address';return result;};
  const g=outputObject(f.r,f.state,f.s,f.io);assert.equal(g.next().value,'address');f.state.oflg=1n;f.r.t1=9n;done(g);
  assert.deepEqual(f.addresses,[f.s.shtdsp+1n,f.s.lngdsp+9n]);assert.equal(f.out.drain(),'Star');
});
test('ODISP reads trailing-space argument after all string output',()=>{
  const f=fixture();f.textIO.ochr=function*(){f.out.character(f.r.c);yield 'char';};const g=outputObject(f.r,f.state,f.s,f.io);
  assert.equal(g.next().value,'char');assert.deepEqual(f.reads,[0]);f.args[1]=1n;done(g);assert.equal(f.out.drain(),'L ');assert.deepEqual(f.reads,[0,1]);
});
test('ODISP divide failure leaves assigned T1 without output or spacing reads',()=>{
  const f=fixture();f.io.idiviT1=function*(){throw new Error('CPU divide');};assert.throws(()=>done(outputObject(f.r,f.state,f.s,f.io)),/CPU divide/);
  assert.equal(f.r.t1,101n);assert.equal(f.r.t2,72n);assert.deepEqual(f.reads,[0]);assert.deepEqual(f.pointers,[]);
});
for(const format of [-1n,0n,1n])test(`ODEV composes source names and trailing blanks through OSTR in format ${format}`,()=>{
  const f=fixture();f.state.oflg=format;for(let dev=1;dev<=9;dev++){
    f.args[0]=BigInt(dev);done(outputDevice(f.m,f.r,f.state,f.s,f.io));assert.equal(f.out.drain(),(format<0n?T.shtdev:format===0n?T.meddev:T.lngdev)[dev-1].text);
  }assert.ok(f.reads.every(i=>i===0));
});
test('ODEV short table is inline while medium MOVE preserves pointer left half before OSTR',()=>{
  const f=fixture();f.args[0]=1n;f.state.oflg=-1n;done(outputDevice(f.m,f.r,f.state,f.s,f.io));assert.equal(f.pointers[0],f.s.shtdev);f.out.drain();
  const pointer=halfWords(0o123456n,f.string('Custom '));f.m.write(f.s.meddev,pointer);f.state.oflg=0n;
  done(outputDevice(f.m,f.r,f.state,f.s,f.io));assert.equal(f.pointers[1],signed36(pointer));assert.equal(f.out.drain(),'Custom ');
});
test('ODEV out-of-range device index uses adjacent storage with eighteen-bit address masking',()=>{
  const f=fixture();f.state.oflg=-1n;f.args[0]=halfWords(3n,0n);f.m.write(f.s.shtdev-1n,packAscii('PRE'));
  done(outputDevice(f.m,f.r,f.state,f.s,f.io));assert.equal(f.out.drain(),'PRE');assert.equal(f.r.t1,halfWords(3n,0n));
});
test('ODEV rechecks positive format after reading the medium pointer',()=>{
  const f=fixture();f.args[0]=1n;const read=f.m.read.bind(f.m);f.m.read=address=>{const word=read(address);if(address===f.s.meddev)f.state.oflg=1n;return word;};
  done(outputDevice(f.m,f.r,f.state,f.s,f.io));assert.equal(f.out.drain(),'Deflector Shields ');
});
test('ODEV actual OSTR rereads source text after character suspension',()=>{
  const f=fixture();f.args[0]=1n;f.state.oflg=-1n;f.textIO.ochr=function*(){f.out.character(f.r.c);yield 'char';};
  const g=outputDevice(f.m,f.r,f.state,f.s,f.io);assert.equal(g.next().value,'char');f.m.write(f.s.shtdev,packAscii('SZ!'));done(g);assert.equal(f.out.drain(),'SZ!');
});
for(const format of [-1n,0n,1n])test(`OCOND composes docked and condition text in format ${format}`,()=>{
  const f=fixture();f.state.oflg=format;for(const docked of [-1n,0n,1n])for(let condition=1;condition<=3;condition++){
    f.m.write(f.s.docked,docked);f.args[0]=BigInt(condition);done(outputCondition(f.m,f.r,f.state,f.s,f.io));
    assert.equal(f.out.drain(),(docked<0n?(format<0n?'D+':'Docked+'):'')+(format<0n?T.shtcnd:T.lngcnd)[condition-1].text);
  }
});
test('OCOND WHO zero still reads the word before DOCKED',()=>{
  const f=fixture();f.state.who=0n;f.m.write(f.s.docked-1n,-1n);f.args[0]=1n;done(outputCondition(f.m,f.r,f.state,f.s,f.io));assert.equal(f.out.drain(),'Docked+Green');
});
test('OCOND delays condition argument and format reads until after docked-prefix output',()=>{
  const f=fixture();f.m.write(f.s.docked,-1n);f.args[0]=1n;f.textIO.ochr=function*(){f.out.character(f.r.c);yield 'char';};
  const g=outputCondition(f.m,f.r,f.state,f.s,f.io);assert.equal(g.next().value,'char');assert.deepEqual(f.reads,[]);
  f.state.oflg=-1n;f.args[0]=3n;f.state.who=9n;done(g);assert.equal(f.out.drain(),'Docked+R');assert.equal(f.r.t1,3n);
});
test('OCOND reads the long condition pointer even when short format subsequently replaces it',()=>{
  const f=fixture();f.state.oflg=-1n;f.args[0]=1n;const read=f.m.read.bind(f.m),reads:bigint[]=[];f.m.read=address=>{reads.push(address);return read(address);};
  done(outputCondition(f.m,f.r,f.state,f.s,f.io));assert.ok(reads.indexOf(f.s.lngcnd)<reads.indexOf(f.s.shtcnd));assert.equal(f.out.drain(),'G');
});
test('OCOND short format cannot bypass a fault on the long condition pointer read',()=>{
  const f=fixture();f.state.oflg=-1n;f.args[0]=1n;const read=f.m.read.bind(f.m);f.m.read=address=>{if(address===f.s.lngcnd)throw new Error('Long table fault');return read(address);};
  assert.throws(()=>done(outputCondition(f.m,f.r,f.state,f.s,f.io)),/Long table fault/);assert.equal(f.r.t1,1n);assert.equal(f.out.drain(),'');
});
test('OCOND condition zero addresses preceding pointer storage without synthetic validation',()=>{
  const f=fixture();f.args[0]=0n;f.m.write(f.s.lngcnd-1n,f.string('Previous'));done(outputCondition(f.m,f.r,f.state,f.s,f.io));assert.equal(f.out.drain(),'Previous');
});
test('OCOND nonreturning prefix output leaves WHO in T1 and never reads the condition',()=>{
  const f=fixture();f.state.who=2n;f.m.write(f.s.docked+1n,-1n);f.io.ostr=function*(){throw new Error('Output transfer');};
  assert.throws(()=>done(outputCondition(f.m,f.r,f.state,f.s,f.io)),/Output transfer/);assert.equal(f.r.t1,2n);assert.deepEqual(f.reads,[]);
});
