import type { CommonBlock } from '../compat/memory.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../generated/source-data.ts';
import type { RepairExpression as Expr,RepairServices } from './repair-statements.ts';
export type ScanWords=Record<'dist'|'warn'|'k'|'mod'|'n'|'p'|'d'|'i'|'hpos'|'vpos'|'vmax'|'vmin'|'hmax'|'hmin'|'enemy',bigint>;
export type ScanStatementServices<W>=Pick<RepairServices<W>,'logical'|'integer'|'assign'|'equal'>&{
  trueWord:bigint;falseWord:bigint;
  negate(value:Expr<W>):Generator<W,bigint,void>;
  integerOr(left:Expr<W>,right:Expr<W>):Generator<W,bigint,void>;
  setscn(hmin:bigint,hmax:bigint,vmin:bigint,vmax:bigint):Generator<W,void,void>;
  ldis(v:bigint,h:bigint,ov:bigint,oh:bigint,range:number):Generator<W,bigint,void>;
  dispc(v:bigint,h:bigint):Generator<W,bigint,void>;
  mark(v:bigint,h:bigint,radius:2|4):Generator<W,void,void>;
  shwscn():Generator<W,void,void>;
  syntax():Generator<W,void,void>;
};
// SCAN.FOR:44-157. Local words are separate from the shared LOCAL screen.
// Knowledge updates use KRANGE even when the requested rectangle is smaller.
export function* scanStatements<W>(entry:'scan'|'srscan',high:CommonBlock,low:CommonBlock,l:ScanWords,s:Record<'warning'|'up'|'down'|'right'|'left'|'corner',bigint>,io:ScanStatementServices<W>):Generator<W,void,void>{
  const m=low.memory,get=(key:keyof ScanWords)=>m.read(l[key]),put=(key:keyof ScanWords,value:bigint)=>m.write(l[key],value);
  const value=(read:()=>bigint):Expr<W>=>function*(){return read();},v=(key:keyof ScanWords)=>value(()=>get(key)),n=(x:number)=>value(()=>BigInt(x)),dist=(i:bigint|number)=>l.dist+BigInt(i)-1n,d=(i:number)=>value(()=>m.read(dist(i)));
  const bin=(op:Parameters<typeof io.integer>[0],a:Expr<W>,b:Expr<W>):Expr<W>=>()=>io.integer(op,a,b),set=(key:keyof ScanWords,e:Expr<W>)=>io.assign(()=>l[key],e);
  const all=(word:bigint)=>{for(let i=1;i<=4;i++)m.write(dist(i),word);};
  const match=(token:bigint|number,key:keyof typeof s)=>function*(){return io.logical(yield*io.equal(low.address('tknlst',token),s[key]));};
  all(BigInt(entry==='scan'?K.KRANGE:7));put('warn',io.falseWord);
  yield*set('k',bin('div',bin('sub',value(()=>low.read('terwid')),n(9)),n(4)));if(m.read(dist(1))>get('k'))all(get('k'));
  if(low.read('ntok')!==1n){
    if(yield*match(low.read('ntok'),'warning')()){put('warn',io.trueWord);low.write('typlst',BigInt(K.KEOL),low.read('ntok'));low.write('ntok',add36(low.read('ntok'),-1n));}
    put('mod',0n);put('n',0n);put('p',2n);
    for(const [key,mod] of [['up',2],['down',1],['right',4],['left',3],['corner',5]] as const)if(yield*match(2,key)())put('mod',BigInt(mod));
    if(get('mod')!==0n)put('p',3n);
    if(low.read('typlst',get('p'))!==BigInt(K.KEOL)){
      if(low.read('typlst',get('p'))!==BigInt(K.KINT)){yield*io.syntax();return;}
      put('d',low.read('vallst',get('p')));put('n',add36(get('n'),1n));put('p',add36(get('p'),1n));all(get('d'));
      if(low.read('typlst',get('p'))!==BigInt(K.KEOL)){
        if(low.read('typlst',get('p'))!==BigInt(K.KINT)){yield*io.syntax();return;}
        put('d',low.read('vallst',get('p')));put('n',add36(get('n'),1n));put('p',add36(get('p'),1n));m.write(dist(3),get('d'));m.write(dist(4),get('d'));
        if(low.read('typlst',get('p'))!==BigInt(K.KEOL)){yield*io.syntax();return;}
      }
    }
    if(get('mod')===5n){
      if(get('n')!==2n){yield*io.syntax();return;}
      if(m.read(dist(1))>0n)m.write(dist(2),0n);if(m.read(dist(1))<0n)yield*io.assign(()=>dist(2),()=>io.negate(d(1)));
      if(m.read(dist(3))>0n)m.write(dist(4),0n);if(m.read(dist(3))<0n)yield*io.assign(()=>dist(4),()=>io.negate(d(3)));
    }else if(get('mod')!==0n)m.write(dist(get('mod')),0n);
  }
  for(put('i',1n);get('i')<=4n;put('i',add36(get('i'),1n))){if(m.read(dist(get('i')))<0n)m.write(dist(get('i')),0n);if(m.read(dist(get('i')))>BigInt(K.KRANGE))m.write(dist(get('i')),BigInt(K.KRANGE));}
  put('hpos',high.read('shpcon',low.read('who'),K.KHPOS));put('vpos',high.read('shpcon',low.read('who'),K.KVPOS));
  yield*set('vmax',bin('min',bin('add',v('vpos'),d(1)),n(K.KGALV)));yield*set('vmin',bin('max',bin('sub',v('vpos'),d(2)),n(1)));
  yield*set('hmax',bin('min',bin('add',v('hpos'),d(3)),n(K.KGALH)));yield*set('hmin',bin('max',bin('sub',v('hpos'),d(4)),n(1)));
  yield*io.setscn(l.hmin,l.hmax,l.vmin,l.vmax);yield*set('enemy',bin('sub',n(3),value(()=>low.read('team'))));
  if(high.read('nplnet')>0n){
    const limit=high.read('nplnet');for(put('i',1n);get('i')<=limit;put('i',add36(get('i'),1n))){
      const a=(col:number)=>high.address('locpln',get('i'),col);
      if(!io.logical(yield*io.ldis(a(K.KVPOS),a(K.KHPOS),l.vpos,l.hpos,K.KRANGE)))continue;
      yield*io.assign(()=>a(4),()=>io.integerOr(value(()=>m.read(a(4))),value(()=>low.read('team'))));
      if((yield*io.integer('sub',()=>io.dispc(a(K.KVPOS),a(K.KHPOS)),n(K.DXNPLN)))!==get('enemy'))continue;
      if(io.logical(get('warn')))yield*io.mark(a(K.KVPOS),a(K.KHPOS),2);
    }
  }
  for(put('i',1n);get('i')<=BigInt(K.KNBASE);put('i',add36(get('i'),1n))){
    const a=(col:number)=>high.address('base',get('i'),col,get('enemy'));
    if(m.read(a(3))<=0n)continue;if(!io.logical(yield*io.ldis(a(K.KVPOS),a(K.KHPOS),l.vpos,l.hpos,K.KRANGE)))continue;
    yield*io.assign(()=>a(4),()=>io.integerOr(value(()=>m.read(a(4))),value(()=>low.read('team'))));
    if(io.logical(get('warn')))yield*io.mark(a(K.KVPOS),a(K.KHPOS),4);
  }
  yield*io.shwscn();
}
