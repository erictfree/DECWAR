import type { CommonBlock } from '../compat/memory.ts';
import { constants as K } from '../runtime/variant-values.ts';
import type { RepairExpression as Expr,RepairServices } from './repair-statements.ts';
export type ShieldMessage='shld01'|'shld02'|'shld03'|'shld04'|'shld05'|'shld06'|'shld07'|'shld08'|'shld09';
export type ShieldSymbols=Record<'transfer'|'up'|'down'|'yes',bigint>;
export type ShieldStatementServices<W>=Pick<RepairServices<W>,'logical'|'integer'|'assign'|'equal'>&{
  negate(value:Expr<W>):Generator<W,bigint,void>;
  greater(left:Expr<W>,right:Expr<W>):Generator<W,boolean,void>;
  less(left:Expr<W>,right:Expr<W>):Generator<W,boolean,void>;
  crlf():Generator<W,void,void>;
  out(message:ShieldMessage,lines:0|1):Generator<W,void,void>;
  gtkn():Generator<W,void,void>;
  trcoff(whoAddress:bigint):Generator<W,void,void>;
};
// SHIELD.FOR:29-104. SENRGY is an actual saved integer word. Token positions
// differ between inline, prompted-action and prompted-amount input. No copied
// ship state or local host-token list is substituted across GTKN/output calls.
export function* shieldStatements<W>(high:CommonBlock,low:CommonBlock,senrgy:bigint,s:ShieldSymbols,io:ShieldStatementServices<W>):Generator<W,void,void>{
  const m=low.memory,value=(read:()=>bigint):Expr<W>=>function*(){return read();},n=(v:number)=>value(()=>BigInt(v));
  const ship=(col:number)=>()=>high.address('shpcon',low.read('who'),col),sh=(col:number)=>value(()=>m.read(ship(col)())),energy=value(()=>m.read(senrgy));
  const bin=(op:Parameters<typeof io.integer>[0],a:Expr<W>,b:Expr<W>):Expr<W>=>()=>io.integer(op,a,b);
  const add=(a:Expr<W>,b:Expr<W>)=>bin('add',a,b),sub=(a:Expr<W>,b:Expr<W>)=>bin('sub',a,b),mul=(a:Expr<W>,b:Expr<W>)=>bin('mul',a,b),div=(a:Expr<W>,b:Expr<W>)=>bin('div',a,b);
  const eq=(token:number,key:keyof ShieldSymbols)=>function*(){return io.logical(yield*io.equal(low.address('tknlst',token),s[key]));};
  const amount=(token:number)=>io.assign(()=>senrgy,mul(value(()=>low.read('vallst',token)),n(10)));
  yield*io.crlf();let pc=100;
  if(low.read('typlst',2)===BigInt(K.KALF)){
    if(yield*eq(2,'transfer')())pc=500;else if(yield*eq(2,'up')())pc=800;else if(yield*eq(2,'down')())pc=1000;
  }
  for(;;)switch(pc){
    case 100:
      yield*io.out('shld01',0);yield*io.gtkn();if(low.read('typlst',1)===BigInt(K.KEOL))return;
      if(yield*eq(1,'up')())pc=800;else if(yield*eq(1,'down')())pc=1000;else if(yield*eq(1,'transfer')())pc=200;
      break;
    case 200:pc=low.read('typlst',2)===BigInt(K.KINT)?400:300;break;
    case 300:
      yield*io.out('shld02',0);yield*io.gtkn();if(low.read('typlst',1)!==BigInt(K.KINT))return;yield*amount(1);pc=600;break;
    case 400:yield*amount(2);pc=600;break;
    case 500:if(low.read('typlst',3)!==BigInt(K.KINT)){pc=300;break;}yield*amount(3);pc=600;break;
    case 600:
      yield*io.assign(()=>senrgy,bin('min',energy,mul(sub(n(1000),sh(K.KSSHPC)),n(25))));
      if(!(yield*io.less(energy,sh(K.KSNRGY)))){
        yield*io.out('shld03',0);yield*io.gtkn();if(!(yield*eq(1,'yes')())){yield*io.out('shld04',1);return;}
      }
      pc=700;break;
    case 700:
      if(yield*io.greater(mul(n(-1),energy),mul(sh(K.KSSHPC),n(25))))yield*io.assign(()=>senrgy,mul(n(-25),sh(K.KSSHPC)));
      if(yield*io.greater(sub(sh(K.KSNRGY),energy),n(50000)))yield*io.assign(()=>senrgy,()=>io.negate(sub(n(50000),sh(K.KSNRGY))));
      yield*io.assign(ship(K.KSSHPC),add(sh(K.KSSHPC),div(energy,n(25))));
      yield*io.assign(ship(K.KSNRGY),sub(sh(K.KSNRGY),energy));yield*io.out('shld05',1);
      if(m.read(ship(K.KSSHPC)())<=0n)m.write(ship(K.KSHCON)(),-1n);
      if(m.read(ship(K.KSNRGY)())<10000n)m.write(ship(K.KSPCON)(),BigInt(K.YELLOW));
      if(m.read(ship(K.KSNRGY)())>=10000n)m.write(ship(K.KSPCON)(),BigInt(K.GREEN));return;
    case 800:
      if(high.read('shpdam',low.read('who'),K.KDSHLD)>BigInt(K.KCRIT)){pc=1100;break;}
      m.write(ship(K.KSHCON)(),1n);yield*io.assign(ship(K.KSNRGY),bin('max',sub(sh(K.KSNRGY),n(1000)),n(0)));yield*io.out('shld06',1);
      if(high.read('trstat',low.read('who'))!==0n)yield*io.trcoff(low.address('who'));
      if(m.read(ship(K.KSNRGY)())<=0n)yield*io.out('shld07',1);return;
    case 1000:m.write(ship(K.KSHCON)(),-1n);yield*io.out('shld08',1);return;
    case 1100:yield*io.out('shld09',1);return;
  }
}
