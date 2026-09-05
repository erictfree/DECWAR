import { copiedArgument } from './argument-copy.ts';
import type { CommonBlock,WordBlock } from '../compat/memory.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../runtime/variant-values.ts';
import type { WeaponExpression as Expr,WeaponStatementServices as Numeric } from './weapon-damage-statements.ts';

export type NovaStatementLocals={d:bigint;i:bigint;jbase:bigint;pteam:bigint};
export type SupernovaStatementLocals={objptr:bigint;strptr:bigint;v:bigint;h:bigint;object:bigint;thing:bigint;va?:bigint;ha?:bigint};
export type NovaStatementServices<W>=Pick<Numeric<W>,'logical'|'binary'|'convert'|'realLiteral'|'compare'|'assign'|'assignLogicalZero'|'and'|'or'|'ran'|'jump'|'setdsp'>&{
  iran(max:number):Generator<W,bigint,void>;
  bounds(first:Expr<W>,last:Expr<W>):Generator<W,{start:bigint;limit:bigint},void>;
  enterLoop(first:bigint,last:bigint):boolean;
  pridis(v:bigint|30,h:bigint|30,range:number,flag:bigint|null,zero:0):Generator<W,void,void>;
  mask(bits:Expr<W>,excluded:Expr<W>):Generator<W,bigint,void>;
  makhit():Generator<W,void,void>;
  jumpRomulan():Generator<W,void,void>;
  trcoff(index:bigint):Generator<W,void,void>;
  baskil(team:bigint):Generator<W,void,void>;
  dispc(v:bigint,h:bigint):Generator<W,bigint,void>;
  lockPlanet(caller:'NOVA'):Generator<W,void,void>;
  unlockPlanet():Generator<W,void,void>;
  plnrmv(index:bigint,team:bigint):Generator<W,void,void>;
};
export type SupernovaStatementServices<W>=Pick<NovaStatementServices<W>,'logical'|'binary'|'compare'|'assign'|'or'|'iran'|'bounds'|'enterLoop'|'pridis'|'makhit'|'setdsp'|'dispc'>&{
  min(a:Expr<W>,b:Expr<W>):Generator<W,bigint,void>;
  mod(a:Expr<W>,b:Expr<W>):Generator<W,bigint,void>;
  disp(v:bigint,h:bigint):Generator<W,bigint,void>;
  nova(kind:Expr<W>,index:Expr<W>):Generator<W,void,void>;
};

// Expression operands and store destinations stay deferred to the compiler
// policy, including mixed REAL arithmetic and integer-to-REAL assignments.
function expressions<W>(high:CommonBlock,low:CommonBlock,io:Pick<Numeric<W>,'binary'|'compare'|'assign'>){
  const m=low.memory,value=(read:()=>bigint,type:'integer'|'real'='integer'):Expr<W>=>({type,evaluate:function*(){return read();}});
  const n=(v:number)=>value(()=>BigInt(v)),word=(a:()=>bigint,type:'integer'|'real'='integer')=>value(()=>m.read(a()),type);
  const bin=(op:Parameters<typeof io.binary>[0],a:Expr<W>,b:Expr<W>):Expr<W>=>({type:a.type==='real'||b.type==='real'?'real':'integer',evaluate:()=>io.binary(op,a,b)});
  const add=(a:Expr<W>,b:Expr<W>)=>bin('add',a,b),sub=(a:Expr<W>,b:Expr<W>)=>bin('sub',a,b),mul=(a:Expr<W>,b:Expr<W>)=>bin('mul',a,b),div=(a:Expr<W>,b:Expr<W>)=>bin('div',a,b),max=(a:Expr<W>,b:Expr<W>)=>bin('max',a,b);
  const cmp=(op:Parameters<typeof io.compare>[0],a:Expr<W>,b:Expr<W>)=>()=>io.compare(op,a,b),set=(a:()=>bigint,e:Expr<W>)=>io.assign(a,'integer',e);
  const lo=(name:string)=>word(()=>low.address(name)),hi=(name:string)=>word(()=>high.address(name)),setLow=(name:string,e:Expr<W>)=>set(()=>low.address(name),e);
  const score=(b:CommonBlock,field:string,k:number,e:Expr<W>,op:'add'|'sub'='add')=>set(()=>b.address(field,k),bin(op,word(()=>b.address(field,k)),e));
  return {m,value,n,word,add,sub,mul,div,max,cmp,set,lo,hi,setLow,score};
}

// NOVA.FOR:25-179. Actual NPLC/J and saved compiler locals. No replacement
// for the disabled DEADRO call, no added ALIVE test and no lock cleanup on
// a nonreturning PLNRMV/ENDGAM. MAKHIT may clear the shared hit words.
export function* novaStatements<W>(high:CommonBlock,low:CommonBlock,path:WordBlock,args:{nplc:bigint;j:bigint},l:NovaStatementLocals,io:NovaStatementServices<W>):Generator<W,void,void>{
  const {m,value,n,word,add,sub,mul,div,max,cmp,set,lo,hi,setLow,score}=expressions(high,low,io);
  const kind=word(()=>args.nplc),index=()=>m.read(args.j),d=word(()=>l.d),jb=()=>m.read(l.jbase),team=lo('team');
  const sh=(col:number)=>()=>high.address('shpcon',index(),col),bs=(col=3)=>()=>high.address('base',index(),col,jb()),planet=(col:number)=>()=>high.address('locpln',index(),col);
  const p=(name:string)=>word(()=>path.address(name)),player=function*(){return io.logical(low.read('player'));},notPlayer=function*(){return !io.logical(low.read('player'));},rom=()=>io.logical(high.read('rom'));
  const isShip=cmp('lt',kind,n(K.DXFBAS)),isBase=cmp('ge',kind,n(K.DXFBAS));
  const iran=(max:number):Expr<W>=>({type:'integer',evaluate:()=>io.iran(max)}),ran:Expr<W>={type:'real',evaluate:()=>io.ran(0)};
  const dispto=()=>add(mul(kind,n(100)),word(()=>args.j));
  const around=(v:bigint,h:bigint)=>io.pridis(v,h,K.KRANGE,null,0);
  function* heading(what:number){yield*setLow('dispfr',n(K.DXSTAR*100));yield*setLow('dispto',dispto());yield*setLow('iwhat',n(what));}
  function* announcement(){yield*io.pridis(30,30,100,l.jbase,0);yield*setLow('dbits',{type:'integer',evaluate:()=>io.mask(lo('dbits'),hi('nomsg'))});}
  yield*setLow('vfrom',p('h2'));yield*setLow('hfrom',p('v2'));yield*setLow('vto',p('h1'));yield*setLow('hto',p('v1'));
  if(yield*cmp('eq',kind,n(K.DXROM))()){
    if(rom())yield*io.jumpRomulan();if(rom())yield*set(()=>high.address('erom'),div(hi('erom'),n(2)));
    if(yield*notPlayer())yield*score(high,'rsr',K.KPRKIL,hi('erom'),'sub');
    if(yield*player())yield*score(low,'tpoint',K.KPRKIL,hi('erom'));
    yield*setLow('dispfr',n(K.DXSTAR*100));yield*setLow('dispto',n(K.DXROM*100));yield*setLow('iwhat',n(8));
    yield*setLow('shstto',hi('erom'));yield*setLow('shcnto',n(1));
    yield*setLow('vto',word(()=>high.address('locr',K.KVPOS)));yield*setLow('hto',word(()=>high.address('locr',K.KHPOS)));
    yield*around(low.address('vto'),low.address('hto'));yield*io.makhit();
    if(rom())return;
    if(yield*notPlayer())yield*score(high,'rsr',K.KPRKIL,n(5000),'sub');if(yield*player())yield*score(low,'tpoint',K.KPRKIL,n(5000));return;
  }
  if(yield*io.and(cmp('ge',kind,n(K.DXNPLN)),cmp('le',kind,n(K.DXEPLN)))){
    yield*heading(8);yield*io.lockPlanet('NOVA');if(io.logical(low.read('lkfail')))return;
    yield*setLow('vto',word(planet(K.KVPOS)));yield*setLow('hto',word(planet(K.KHPOS)));
    yield*set(planet(3),sub(word(planet(3)),n(3)));if(yield*cmp('lt',word(planet(3)),n(0))())yield*setLow('klflg',n(2));
    yield*setLow('shstto',max(word(planet(3)),n(0)));yield*around(low.address('vto'),low.address('hto'));yield*io.makhit();
    if(!(yield*cmp('ge',word(planet(3)),n(0))())){
      if(yield*player())yield*score(low,'tpoint',K.KNPDES,n(1000),'sub');if(yield*notPlayer())yield*score(high,'rsr',K.KNPDES,n(1000),'sub');
      yield*set(()=>l.pteam,sub({type:'integer',evaluate:()=>io.dispc(planet(K.KVPOS)(),planet(K.KHPOS)())},n(K.DXNPLN)));
      yield*io.setdsp(planet(K.KVPOS)(),planet(K.KHPOS)(),0);yield*io.plnrmv(args.j,l.pteam);
    }
    yield*io.unlockPlanet();return;
  }
  yield*set(()=>l.d,n(1000));
  if(yield*isBase())yield*set(()=>l.d,sub(d,word(()=>high.address('base',index(),3,add36(m.read(args.nplc),-2n)))));
  if(yield*io.and(isShip,cmp('gt',word(sh(K.KSHCON)),n(0))))yield*set(()=>l.d,sub(d,word(sh(K.KSSHPC))));
  if(yield*cmp('lt',d,n(200))())yield*set(()=>l.d,n(250));
  if(!(yield*isBase())){
    const bounds=yield*io.bounds(n(1),n(K.KNDEV));m.write(l.i,bounds.start);
    if(io.enterLoop(bounds.start,bounds.limit))do{
      const device=()=>high.address('shpdam',index(),m.read(l.i)),damage=mul(mul(ran,d),value(()=>io.realLiteral('4.0'),'real'));
      yield*set(device,add(word(device),{type:'integer',evaluate:()=>io.convert('integer','int',damage)}));
      m.write(l.i,add36(m.read(l.i),1n));
    }while(m.read(l.i)<=bounds.limit);
    if(yield*cmp('ge',word(()=>high.address('shpdam',index(),K.KDSHLD)),n(K.KCRIT))())yield*set(sh(K.KSHCON),n(-1));
  }
  yield*setLow('ihita',add(mul(d,n(8)),iran(1000)));
  if(yield*io.and(player,cmp('eq',sub(n(5),team),kind)))yield*score(low,'tpoint',K.KPBDAM,lo('ihita'));
  if(yield*io.and(notPlayer,isBase))yield*score(high,'rsr',K.KPBDAM,lo('ihita'));
  if(yield*io.and(player,cmp('eq',sub(n(3),team),kind)))yield*score(low,'tpoint',K.KPEDAM,lo('ihita'));
  if(yield*io.and(notPlayer,isShip))yield*score(high,'rsr',K.KPEDAM,lo('ihita'));
  if(yield*io.and(player,cmp('eq',add(team,n(2)),kind)))yield*score(low,'tpoint',K.KPBDAM,lo('ihita'),'sub');
  if(yield*io.and(player,cmp('eq',team,kind)))yield*score(low,'tpoint',K.KPEDAM,lo('ihita'),'sub');
  if(!(yield*isBase())){
    yield*set(sh(K.KSDAM),add(word(sh(K.KSDAM)),lo('ihita')));yield*set(sh(K.KSNRGY),sub(word(sh(K.KSNRGY)),mul(lo('ihita'),ran)));
    if(yield*cmp('gt',word(sh(K.KSHCON)),n(0))())yield*set(sh(K.KSSHPC),max(add(sub(word(sh(K.KSSHPC)),n(300)),iran(100)),n(0)));
    if(yield*cmp('le',word(sh(K.KSSHPC)),n(0))())yield*set(sh(K.KSHCON),n(-1));
    if(yield*io.and(cmp('lt',word(sh(K.KSDAM)),n(K.KENDAM)),cmp('gt',word(sh(K.KSNRGY)),n(0))))yield*io.jump(args.nplc,args.j);
    else{yield*io.setdsp(sh(K.KVPOS)(),sh(K.KHPOS)(),0);yield*io.assignLogicalZero(()=>high.address('alive',index()));yield*setLow('klflg',n(2));}
    yield*heading(8);yield*setLow('vto',word(sh(K.KVPOS)));yield*setLow('hto',word(sh(K.KHPOS)));yield*setLow('shstto',word(sh(K.KSSHPC)));yield*setLow('shcnto',word(sh(K.KSHCON)));
    const killed=cmp('ne',lo('klflg'),n(0)),killScore=()=>high.address('tmscor',low.read('team'),K.KPEKIL);
    if(yield*io.and(killed,player,cmp('eq',team,kind)))yield*set(killScore,sub(word(killScore),n(5000)));
    if(yield*io.and(killed,player,cmp('ne',team,kind)))yield*set(killScore,add(word(killScore),n(5000)));
    if(yield*io.and(killed,notPlayer))yield*score(high,'rsr',K.KPEKIL,n(5000));
    yield*around(sh(K.KVPOS)(),sh(K.KHPOS)());yield*io.makhit();if(yield*cmp('ne',word(()=>high.address('trstat',index())),n(0))())yield*io.trcoff(args.j);return;
  }
  yield*set(()=>l.jbase,sub(kind,n(2)));
  if(yield*cmp('eq',word(bs()),n(1000))()){yield*heading(9);yield*announcement();yield*io.makhit();}
  yield*set(bs(),max(add(sub(word(bs()),n(300)),iran(100)),n(0)));if(yield*cmp('gt',word(bs()),n(0))())yield*io.jump(args.nplc,args.j);
  yield*heading(8);yield*setLow('vfrom',p('h2'));yield*setLow('hfrom',p('v2'));yield*setLow('vto',word(bs(K.KVPOS)));yield*setLow('hto',word(bs(K.KHPOS)));yield*setLow('shstto',word(bs()));yield*setLow('shcnto',n(1));
  if(!(yield*cmp('gt',word(bs()),n(0))())){
    if(yield*notPlayer())yield*score(high,'rsr',K.KPBDAM,n(10000));
    if(yield*io.and(player,cmp('eq',team,word(()=>l.jbase))))yield*score(low,'tpoint',K.KPBDAM,n(10000),'sub');
    if(yield*io.and(player,cmp('ne',team,word(()=>l.jbase))))yield*score(low,'tpoint',K.KPBDAM,n(10000));
    const count=()=>high.address('nbase',jb());yield*set(count,sub(word(count),n(1)));yield*io.baskil(l.jbase);yield*setLow('klflg',n(2));
  }
  yield*around(bs(K.KVPOS)(),bs(K.KHPOS)());yield*io.makhit();if(yield*cmp('gt',word(bs()),n(0))())return;
  yield*io.setdsp(bs(K.KVPOS)(),bs(K.KHPOS)(),0);
  yield*setLow('iwhat',n(10));yield*setLow('dispfr',n(K.DXSTAR*100));yield*setLow('dispto',dispto());yield*announcement();
  yield*setLow('vto',word(bs(K.KVPOS)));yield*setLow('hto',word(bs(K.KHPOS)));yield*io.makhit();
}

// SNOVA.FOR:25-75. Shared CHKOUT names follow CHECK's declaration: H2 is
// IVC, V2 is IHC, DHS is IDISV and DVS is IDISH. Stack accesses use physical
// SNLOCL columns, including out-of-row aliases. Only the two pointers reset.
export function* supernovaStatements<W>(high:CommonBlock,low:CommonBlock,path:WordBlock,stack:WordBlock,l:SupernovaStatementLocals,io:SupernovaStatementServices<W>):Generator<W,void,void>{
  const {m,n,word,add,sub,div,max,cmp,set,score,setLow}=expressions(high,low,io);
  const local=(key:Exclude<keyof SupernovaStatementLocals,'va'|'ha'>)=>word(()=>l[key]),p=(key:string)=>word(()=>path.address(key));
  const obj=(col:number)=>()=>stack.address('objstk',m.read(l.objptr),col),star=(col:number)=>()=>stack.address('strstk',m.read(l.strptr),col);
  const min=(a:Expr<W>,b:Expr<W>):Expr<W>=>({type:'integer',evaluate:()=>io.min(a,b)});
  yield*io.setdsp(path.address('h2'),path.address('v2'),0);yield*set(()=>l.objptr,n(0));yield*set(()=>l.strptr,n(0));
  for(;;){
    const rows=yield*io.bounds(max(n(1),sub(p('h2'),n(1))),min(n(K.KGALV),add(p('h2'),n(1))));m.write(l.v,rows.start);
    if(io.enterLoop(rows.start,rows.limit))do{
      const cols=yield*io.bounds(max(n(1),sub(p('v2'),n(1))),min(n(K.KGALH),add(p('v2'),n(1))));m.write(l.h,cols.start);
      if(io.enterLoop(cols.start,cols.limit))do{
        const va=copiedArgument(m,l.v,l.va,'DECWAR.FOR:3819'),ha=copiedArgument(m,l.h,l.ha,'DECWAR.FOR:3820');
        yield*set(()=>l.object,{type:'integer',evaluate:()=>io.dispc(va,ha)});
        if(!(yield*io.or(cmp('lt',local('object'),n(1)),cmp('gt',local('object'),n(K.DXEPLN))))){
          yield*set(()=>l.objptr,add(local('objptr'),n(1)));
          yield*set(obj(1),local('v'));yield*set(obj(2),local('h'));yield*set(obj(3),sub(local('v'),p('h2')));yield*set(obj(4),sub(local('h'),p('v2')));
        }else if(!(yield*io.or(cmp('ne',local('object'),n(K.DXSTAR)),cmp('eq',{type:'integer',evaluate:()=>io.iran(5)},n(5))))&&!(yield*cmp('eq',local('strptr'),n(29))())){
          yield*set(()=>l.strptr,add(local('strptr'),n(1)));yield*set(star(1),local('v'));yield*set(star(2),local('h'));yield*io.setdsp(va,ha,0);
        }
        m.write(l.h,add36(m.read(l.h),1n));
      }while(m.read(l.h)<=cols.limit);
      m.write(l.v,add36(m.read(l.v),1n));
    }while(m.read(l.v)<=rows.limit);
    while(!(yield*cmp('eq',local('objptr'),n(0))())){
      yield*set(()=>path.address('h1'),word(obj(1)));yield*set(()=>path.address('v1'),word(obj(2)));
      yield*io.assign(()=>path.address('dhs'),'real',word(obj(3)));yield*io.assign(()=>path.address('dvs'),'real',word(obj(4)));
      yield*set(()=>l.objptr,sub(local('objptr'),n(1)));
      yield*set(()=>l.thing,{type:'integer',evaluate:()=>io.disp(path.address('h1'),path.address('v1'))});
      if(yield*io.or(cmp('le',local('thing'),n(0)),cmp('ge',local('thing'),n(100*K.DXSTAR))))continue;
      yield*io.nova(div(local('thing'),n(100)),{type:'integer',evaluate:()=>io.mod(local('thing'),n(100))});
    }
    if(yield*cmp('eq',local('strptr'),n(0))())return;
    yield*set(()=>path.address('h2'),word(star(1)));yield*set(()=>path.address('v2'),word(star(2)));yield*set(()=>l.strptr,sub(local('strptr'),n(1)));
    yield*setLow('dispfr',n(K.DXSTAR*100));yield*setLow('iwhat',n(7));yield*setLow('vfrom',p('h2'));yield*setLow('hfrom',p('v2'));
    yield*io.pridis(low.address('vfrom'),low.address('hfrom'),K.KRANGE,null,0);yield*io.makhit();
    if(io.logical(low.read('player')))yield*score(low,'tpoint',K.KNSDES,n(500),'sub');
    if(!io.logical(low.read('player')))yield*score(high,'rsr',K.KNSDES,n(500),'sub');
  }
}
