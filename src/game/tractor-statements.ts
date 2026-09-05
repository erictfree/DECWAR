import type { CommonBlock } from '../compat/memory.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../generated/source-data.ts';
import type { EnergyStatementServices } from './energy-statements.ts';
export type TractorMessage='tract1'|'tract2'|'tract3'|'tract4'|'tract5'|'tract6'|'tract7'|'tract8'|'unkshp'|'noship'|'energ3';
export type TractorStatementServices<W>=Pick<EnergyStatementServices<W>,'logical'|'equal'|'ldis'|'gtkn'|'crlf'|'makhit'>&{
  or(left:()=>boolean,right:()=>boolean):Generator<W,boolean,void>;
  integerOr(left:()=>bigint,right:()=>bigint):Generator<W,bigint,void>;
  out(key:TractorMessage,lines:0|1):Generator<W,void,void>;
  odisp(actual:bigint,space:1):Generator<W,void,void>;
  argument():bigint; // Required writable IP dummy binding for the zero-argument caller.
  trcoff(actual:bigint):Generator<W,void,void>;
};
// TRACTR.FOR:34-130. Shares label 1400 with the existing TRCOFF body.
// Resolves the missing caller argument only on paths that actually assign IP.
export function* tractorStatements<W>(high:CommonBlock,low:CommonBlock,local:{index:bigint;i:bigint;dteam:bigint;iship:bigint},off:bigint,io:TractorStatementServices<W>):Generator<W,void,void>{
  const m=low.memory,l=(key:keyof typeof local)=>m.read(local[key]);
  const ip=()=>{const a=io.argument();m.write(a,low.read('who'));return a;};
  yield*io.crlf();m.write(local.index,2n);
  if(!(yield*io.or(()=>low.read('ntok')>1n,()=>high.read('trstat',low.read('who'))===0n))){yield*io.trcoff(ip());return;}
  while(low.read('typlst',l('index'))!==BigInt(K.KALF)){
    yield*io.out('tract1',0);yield*io.gtkn();if(low.read('typlst',1)===BigInt(K.KEOL))return;m.write(local.index,1n);
  }
  if(io.logical(yield*io.equal(low.address('tknlst',l('index')),off))){const a=ip();if(high.read('trstat',m.read(a))!==0n)yield*io.trcoff(a);else yield*io.out('tract2',1);return;}
  if(high.read('trstat',low.read('who'))!==0n){yield*io.out('tract3',1);return;}
  for(m.write(local.i,1n);l('i')<=BigInt(K.KNPLAY);m.write(local.i,add36(l('i'),1n))){if(io.logical(yield*io.equal(low.address('tknlst',l('index')),high.address('names',l('i'),1))))break;}
  if(l('i')>BigInt(K.KNPLAY)){yield*io.out('unkshp',1);return;}
  if(l('i')===low.read('who')){yield*io.out('tract4',1);return;}
  m.write(local.dteam,1n);if(l('i')>BigInt(K.KNPLAY/2))m.write(local.dteam,2n);
  if(low.read('team')!==l('dteam')){yield*io.out('tract5',1);return;}
  if(!io.logical(high.read('alive',l('i')))){yield*io.out('noship',1);return;}
  const from=(col:number)=>high.address('shpcon',low.read('who'),col),to=(col:number)=>high.address('shpcon',l('i'),col);
  if(!io.logical(yield*io.ldis(from(K.KVPOS),from(K.KHPOS),to(K.KVPOS),to(K.KHPOS),1))){yield*io.out('energ3',1);return;}
  m.write(local.iship,add36(BigInt(K.DXFSHP*100),l('i')));if(l('i')>BigInt(K.KNPLAY/2))m.write(local.iship,add36(l('iship'),100n));
  if(high.read('trstat',l('i'))!==0n){yield*io.odisp(local.iship,1);yield*io.out('tract6',1);return;}
  if(m.read(from(K.KSHCON))>=0n){yield*io.out('tract7',1);return;}
  if(m.read(to(K.KSHCON))>=0n){yield*io.odisp(local.iship,1);yield*io.out('tract8',1);return;}
  high.write('trstat',l('i'),low.read('who'));high.write('trstat',low.read('who'),l('i'));
  low.write('dbits',yield*io.integerOr(()=>high.read('bits',low.read('who')),()=>high.read('bits',l('i'))));low.write('iwhat',13n);yield*io.makhit();
}
