import type { CommonBlock } from '../compat/memory.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../generated/source-data.ts';
import type { RepairExpression as Expr,RepairServices } from './repair-statements.ts';
export type EnergyMessage='ener1s'|'ener1l'|'unkshp'|'begyrp'|'energ7'|'noship'|'energ2'|'energ3'|'ener4s'|'ener4l'|'energ8'|'energ5'|'energ6';
export type EnergyStatementServices<W>=Pick<RepairServices<W>,'logical'|'and'|'integer'|'assign'|'equal'>&{
  crlf():Generator<W,void,void>;out(key:EnergyMessage,lines:0|1):Generator<W,void,void>;
  gtkn():Generator<W,void,void>;
  ldis(v:bigint,h:bigint,ov:bigint,oh:bigint,range:1):Generator<W,bigint,void>;
  intTimesPointNine(value:Expr<W>):Generator<W,bigint,void>;
  makhit():Generator<W,void,void>;
};
// ENERGY.FOR:29-105. Actual COMMON and saved local words survive call boundaries.
// INT(IHITA*0.9) requires an explicit compiler REAL/conversion service.
export function* energyStatements<W>(high:CommonBlock,low:CommonBlock,local:{index:bigint;i:bigint;dteam:bigint},io:EnergyStatementServices<W>):Generator<W,void,void>{
  const m=low.memory,v=(read:()=>bigint):Expr<W>=>function*(){return read();},n=(x:number)=>v(()=>BigInt(x)),l=(key:keyof typeof local)=>m.read(local[key]);
  const bin=(op:Parameters<typeof io.integer>[0],a:Expr<W>,b:Expr<W>):Expr<W>=>()=>io.integer(op,a,b);
  const sender=(col:number)=>high.address('shpcon',low.read('who'),col),target=(col:number)=>high.address('shpcon',l('i'),col);
  const hit=v(()=>low.read('ihita')),from=v(()=>m.read(sender(K.KSNRGY))),to=v(()=>m.read(target(K.KSNRGY)));
  yield*io.crlf();m.write(local.index,2n);
  while(!(yield*io.and(()=>low.read('typlst',l('index'))===BigInt(K.KALF),()=>low.read('typlst',add36(l('index'),1n))===BigInt(K.KINT)))){
    yield*io.out(low.read('oflg')<=0n?'ener1s':'ener1l',0);yield*io.gtkn();m.write(local.index,1n);if(low.read('typlst',1)===BigInt(K.KEOL))return;
  }
  for(m.write(local.i,1n);l('i')<=BigInt(K.KNPLAY);m.write(local.i,add36(l('i'),1n))){
    if(io.logical(yield*io.equal(low.address('tknlst',l('index')),high.address('names',l('i'),1))))break;
  }
  if(l('i')>BigInt(K.KNPLAY)){yield*io.out('unkshp',1);return;}
  if(l('i')===low.read('who')){if(low.read('oflg')===BigInt(K.LONG))yield*io.out('begyrp',0);yield*io.out('energ7',1);return;}
  if(!io.logical(high.read('alive',l('i')))){yield*io.out('noship',1);return;}
  m.write(local.dteam,1n);if(l('i')>BigInt(K.KNPLAY/2))m.write(local.dteam,2n);
  if(low.read('team')!==l('dteam')){yield*io.out('energ2',1);return;}
  if(!io.logical(yield*io.ldis(sender(K.KVPOS),sender(K.KHPOS),target(K.KVPOS),target(K.KHPOS),1))){yield*io.out('energ3',1);return;}
  yield*io.assign(()=>low.address('ihita'),bin('mul',v(()=>low.read('vallst',add36(l('index'),1n))),n(10)));
  if(low.read('ihita')>=m.read(sender(K.KSNRGY))){yield*io.out(low.read('oflg')<=0n?'ener4s':'ener4l',1);return;}
  if(low.read('ihita')<=0n){if(low.read('oflg')===BigInt(K.LONG))yield*io.out('energ8',0);yield*io.out('energ5',1);return;}
  yield*io.assign(()=>low.address('ihita'),bin('min',()=>io.intTimesPointNine(hit),bin('sub',n(50000),to)));
  yield*io.assign(()=>sender(K.KSNRGY),bin('sub',from,bin('add',hit,bin('div',hit,n(9)))));
  yield*io.assign(()=>target(K.KSNRGY),bin('add',to,hit));yield*io.out('energ6',1);
  yield*io.assign(()=>low.address('dispto'),bin('add',v(()=>l('i')),bin('mul',v(()=>l('dteam')),n(100))));
  yield*io.assign(()=>low.address('dispfr'),bin('add',v(()=>low.read('who')),bin('mul',v(()=>low.read('team')),n(100))));
  low.write('dbits',high.read('bits',l('i')));low.write('iwhat',12n);yield*io.makhit();
  // Source label 1700 has no incoming branch.
}
