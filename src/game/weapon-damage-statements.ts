import type { CommonBlock } from '../compat/memory.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../generated/source-data.ts';

export type WeaponValueType='integer'|'real';
export type WeaponExpression<W>={type:WeaponValueType;evaluate:()=>Generator<W,bigint,void>};
export type WeaponPredicate<W>=()=>Generator<W,boolean,void>;
export type WeaponDamageArguments={nplc:bigint;j:bigint;id:bigint;phit:bigint;ship:bigint};
export type WeaponStatementLocals={rand:bigint;rana:bigint;hit:bigint;ranb:bigint;hita:bigint;powfac:bigint};
export type WeaponStatementServices<W>={
  realLiteral(text:string):bigint;
  logical(word:bigint):boolean;
  binary(op:'add'|'sub'|'mul'|'div'|'max',left:WeaponExpression<W>,right:WeaponExpression<W>):Generator<W,bigint,void>;
  convert(type:WeaponValueType,reason:'int'|'float',value:WeaponExpression<W>):Generator<W,bigint,void>;
  compare(op:'lt'|'le'|'eq'|'ne'|'ge'|'gt',left:WeaponExpression<W>,right:WeaponExpression<W>):Generator<W,boolean,void>;
  assign(destination:()=>bigint,type:WeaponValueType,value:WeaponExpression<W>):Generator<W,void,void>;
  assignLogicalZero(destination:()=>bigint):Generator<W,void,void>; // ALIVE is LOGICAL, assigned integer 0 at line 114.
  and(...terms:WeaponPredicate<W>[]):Generator<W,boolean,void>;
  or(...terms:WeaponPredicate<W>[]):Generator<W,boolean,void>;
  torpedoShieldBranch(test:WeaponPredicate<W>):Generator<W,1000|300,void>;
  ran(zero:0):Generator<W,bigint,void>;
  iran(max:5|10):Generator<W,bigint,void>;
  pwr(base:WeaponExpression<W>,exponentAddress:bigint):Generator<W,bigint,void>;
  jump(kindAddress:bigint,indexAddress:bigint):Generator<W,void,void>;
  baskil(team:WeaponExpression<W>):Generator<W,void,void>;
  setdsp(vAddress:bigint,hAddress:bigint,zero:0):Generator<W,void,void>;
};
// TORDAM.FOR:26-193; PARAM:21,185 supplies implicit INTEGER and REAL RAN/PWR.
// All locals/arguments are actual compiler words. REAL words remain opaque;
// mixed arithmetic, conversions, expression/LHS order and compound conditions
// require compiler services. This is a statement body, not compiler call frames.
export function* weaponDamageStatements<W>(entry:'tordam'|'phadam',high:CommonBlock,low:CommonBlock,
  args:WeaponDamageArguments,locals:WeaponStatementLocals,io:WeaponStatementServices<W>):Generator<W,void,void>{
  const m=low.memory;
  const value=(type:WeaponValueType,read:()=>bigint):WeaponExpression<W>=>({type,evaluate:function*(){return read();}});
  const integer=(n:bigint|number)=>value('integer',()=>BigInt(n)),real=(text:string)=>value('real',()=>io.realLiteral(text));
  const word=(address:()=>bigint,type:WeaponValueType='integer')=>value(type,()=>m.read(address()));
  const arg=(name:keyof WeaponDamageArguments)=>word(()=>args[name]);
  const local=(name:keyof WeaponStatementLocals)=>word(()=>locals[name],name==='powfac'?'integer':'real');
  const lo=(name:string)=>word(()=>low.address(name));
  const bin=(op:Parameters<WeaponStatementServices<W>['binary']>[0],l:WeaponExpression<W>,r:WeaponExpression<W>):WeaponExpression<W>=>({type:l.type==='real'||r.type==='real'?'real':'integer',evaluate:()=>io.binary(op,l,r)});
  const add=(l:WeaponExpression<W>,r:WeaponExpression<W>)=>bin('add',l,r),sub=(l:WeaponExpression<W>,r:WeaponExpression<W>)=>bin('sub',l,r);
  const mul=(l:WeaponExpression<W>,r:WeaponExpression<W>)=>bin('mul',l,r),div=(l:WeaponExpression<W>,r:WeaponExpression<W>)=>bin('div',l,r);
  const max=(l:WeaponExpression<W>,r:WeaponExpression<W>)=>bin('max',l,r);
  const convert=(type:WeaponValueType,reason:'int'|'float',v:WeaponExpression<W>):WeaponExpression<W>=>({type,evaluate:()=>io.convert(type,reason,v)});
  const cmp=(op:Parameters<WeaponStatementServices<W>['compare']>[0],l:WeaponExpression<W>,r:WeaponExpression<W>):WeaponPredicate<W>=>()=>io.compare(op,l,r);
  const and=(...p:WeaponPredicate<W>[]):WeaponPredicate<W>=>()=>io.and(...p),or=(...p:WeaponPredicate<W>[]):WeaponPredicate<W>=>()=>io.or(...p);
  const predicate=(read:()=>boolean):WeaponPredicate<W>=>function*(){return read();};
  const player=predicate(()=>io.logical(low.read('player'))),notPlayer=predicate(()=>!io.logical(low.read('player'))),firingShip=predicate(()=>io.logical(m.read(args.ship)));
  const ship=(col:number)=>()=>high.address('shpcon',m.read(args.j),col);
  const base=(col=3)=>()=>high.address('base',m.read(args.j),col,add36(m.read(args.nplc),-2n));
  const sh=(col:number)=>word(ship(col)),bs=()=>word(base());
  const isShip=cmp('lt',arg('nplc'),integer(K.DXFBAS)),isBase=cmp('ge',arg('nplc'),integer(K.DXFBAS));
  const ran:WeaponExpression<W>={type:'real',evaluate:()=>io.ran(0)};
  const iran=(n:5|10):WeaponExpression<W>=>({type:'integer',evaluate:()=>io.iran(n)});
  const setLocal=(name:keyof WeaponStatementLocals,v:WeaponExpression<W>)=>io.assign(()=>locals[name],name==='powfac'?'integer':'real',v);
  const setLow=(name:string,v:WeaponExpression<W>)=>io.assign(()=>low.address(name),'integer',v);
  const setInteger=(a:()=>bigint,v:WeaponExpression<W>)=>io.assign(a,'integer',v);
  const addScore=(block:CommonBlock,field:'tpoint'|'rsr',category:number,n:WeaponExpression<W>)=>setInteger(()=>block.address(field,category),add(word(()=>block.address(field,category)),n));
  const absorption=(strength:WeaponExpression<W>,magnitude:WeaponExpression<W>)=>sub(strength,mul(add(mul(magnitude,max(mul(convert('real','float',strength),real('0.001')),real('0.1'))),integer(10)),real('0.03')));
  const phaserMagnitude=()=>mul(mul(local('hita'),local('powfac')),arg('phit'));
  let pc:number;
  if(entry==='tordam'){
    if(yield*and(isShip,or(cmp('ge',sh(K.KSDAM),integer(K.KENDAM)),cmp('le',sh(K.KSNRGY),integer(0))))())return;
    if(yield*and(isBase,cmp('le',bs(),integer(0)))())return;
    low.write('iwhat',2n);yield*setLocal('rand',ran);yield*setLocal('rana',ran);
    yield*setLocal('hit',real('0.0'));yield*setLocal('hita',real('0.0'));yield*setLocal('ranb',sub(local('rand'),real('0.5')));
    yield*setLocal('hit',add(real('4000.0'),mul(real('4000.0'),ran)));
    pc=(yield*isBase())?1100:yield*io.torpedoShieldBranch(cmp('gt',sh(K.KSHCON),integer(0)));
  }else{
    low.write('iwhat',1n);m.write(locals.powfac,80n);yield*setLocal('rana',ran);yield*setLocal('hit',real('0.0'));
    if(yield*and(isShip,cmp('gt',sh(K.KSHCON),integer(0)))())yield*setLocal('powfac',div(local('powfac'),integer(2)));
    if(yield*isBase())yield*setLocal('powfac',div(local('powfac'),integer(2)));
    yield*setLocal('hit',{type:'real',evaluate:()=>io.pwr(add(real('0.9'),mul(real('0.02'),ran)),args.id)});
    if(yield*and(player,firingShip,or(cmp('gt',word(()=>high.address('shpdam',low.read('who'),K.KDPHAS)),integer(0)),cmp('gt',word(()=>high.address('shpdam',low.read('who'),K.KDCOMP)),integer(0))))())yield*setLocal('hit',mul(local('hit'),real('0.8')));
    if(yield*isBase())pc=900;
    else if(yield*cmp('lt',sh(K.KSHCON),integer(0))())pc=800;
    else{
      yield*setLocal('hita',local('hit'));
      yield*setLocal('hit',mul(mul(sub(integer(1000),sh(K.KSSHPC)),local('hita')),real('0.001')));
      yield*setInteger(ship(K.KSSHPC),absorption(sh(K.KSSHPC),phaserMagnitude()));
      if(yield*cmp('lt',sh(K.KSSHPC),integer(0))())yield*setInteger(ship(K.KSSHPC),integer(0));
      pc=800;
    }
  }
  for(;;)switch(pc){
    case 100:
      if(yield*isBase()){pc=200;break;}
      yield*setLocal('hita',mul(mul(local('hit'),sub(real('1000.0'),sh(K.KSSHPC))),real('0.001')));
      yield*setInteger(ship(K.KSSHPC),absorption(sh(K.KSSHPC),local('hit')));
      if(yield*cmp('lt',sh(K.KSSHPC),integer(0))())yield*setInteger(ship(K.KSSHPC),integer(0));
      pc=300;break;
    case 200:
      yield*setLocal('hita',mul(mul(local('hit'),sub(integer(1000),bs())),real('0.001')));
      yield*setInteger(base(),absorption(bs(),local('hit')));pc=400;break;
    case 300:
      if(yield*cmp('lt',sh(K.KSHCON),integer(0))())yield*setLocal('hita',local('hit'));
      pc=400;break;
    case 400:
      yield*setLow('ihita',local('hita'));
      if(yield*and(cmp('lt',mul(local('hita'),add(local('rana'),real('0.1'))),real('1700.0')),isShip)()){pc=500;break;}
      if(yield*and(cmp('lt',mul(local('hita'),add(local('rana'),real('0.1'))),real('1700.0')),isBase)()){pc=600;break;}
      if(yield*and(cmp('eq',iran(5),integer(5)),isBase)()){pc=1400;break;}
      if(yield*isBase()){pc=600;break;}
      yield*setLocal('hita',div(local('hita'),real('2.0')));
      yield*setLow('critdv',convert('integer','int',add(mul(integer(K.KNDEV),ran),real('1.0'))));
      {const device=()=>high.address('shpdam',m.read(args.j),low.read('critdv'));yield*setInteger(device,add(word(device),local('hita')));}
      if(yield*cmp('eq',lo('critdv'),integer(K.KDSHLD))())yield*setInteger(ship(K.KSHCON),integer(-1));
      yield*setLow('critdm',local('hita'));
      yield*setLocal('hita',add(local('hita'),mul(sub(ran,real('0.5')),real('1000.0'))));
      yield*setLow('ihita',local('hita'));pc=500;break;
    case 500:
      yield*setInteger(ship(K.KSDAM),add(sh(K.KSDAM),local('hita')));
      yield*setInteger(ship(K.KSNRGY),sub(sh(K.KSNRGY),local('hita')));pc=600;break;
    case 600:
      if(yield*isBase())yield*setInteger(base(),max(convert('integer','int',sub(bs(),mul(local('hita'),real('0.01')))),integer(0)));
      pc=700;break;
    case 700:
      if(yield*and(isShip,cmp('le',sh(K.KSSHPC),integer(0)))())yield*setInteger(ship(K.KSHCON),integer(-1));
      if(yield*and(firingShip,player,cmp('eq',sub(integer(5),lo('team')),arg('nplc')))())yield*addScore(low,'tpoint',K.KPBDAM,local('hita'));
      if(yield*and(firingShip,notPlayer,isBase)())yield*addScore(high,'rsr',K.KPBDAM,local('hita'));
      if(yield*and(player,firingShip,cmp('eq',sub(integer(3),lo('team')),arg('nplc')))())yield*addScore(low,'tpoint',K.KPEDAM,local('hita'));
      if(yield*and(firingShip,notPlayer,isShip)())yield*addScore(high,'rsr',K.KPEDAM,local('hita'));
      if(yield*isBase()){pc=1300;break;}
      yield*setInteger(ship(K.KSPCON),integer(K.RED));yield*setLow('shstto',sh(K.KSSHPC));yield*setLow('shcnto',sh(K.KSHCON));
      if(yield*or(cmp('ge',sh(K.KSDAM),integer(K.KENDAM)),cmp('le',sh(K.KSNRGY),integer(0)))())low.write('klflg',2n);
      if(low.read('klflg')!==0n){pc=750;break;}
      if(low.read('iwhat')===1n)return;
      yield*io.jump(args.nplc,args.j);
      if(low.read('klflg')===0n)return;
      pc=750;break;
    case 750:
      yield*io.setdsp(ship(K.KVPOS)(),ship(K.KHPOS)(),0);
      yield*io.assignLogicalZero(()=>high.address('alive',m.read(args.j)));
      if(yield*and(player,firingShip)())yield*addScore(low,'tpoint',K.KPEKIL,integer(5000));
      if(yield*and(firingShip,notPlayer)())yield*addScore(high,'rsr',K.KPEKIL,integer(5000));
      return;
    case 800:
      yield*setLocal('hita',mul(mul(local('hit'),local('powfac')),arg('phit')));pc=400;break;
    case 900:
      yield*setLocal('hita',local('hit'));
      yield*setLocal('hit',mul(mul(sub(integer(1000),bs()),local('hita')),real('0.001')));
      yield*setInteger(base(),absorption(bs(),phaserMagnitude()));pc=800;break;
    case 1000:
      yield*setLocal('rand',add(sub(local('rana'),mul(mul(sh(K.KSSHPC),real('0.001')),local('rand'))),real('0.1')));pc=1100;break;
    case 1100:
      if(yield*isBase())yield*setLocal('rand',add(sub(local('rana'),mul(mul(bs(),real('0.001')),local('rand'))),real('0.1')));
      if(yield*cmp('gt',local('rand'),real('0.0'))()){pc=100;break;}
      low.write('iwhat',3n);low.write('ihita',0n);
      if(yield*isBase())yield*setInteger(base(),max(sub(convert('real','float',bs()),mul(real('50.0'),local('rana'))),real('0.0')));
      if(!(yield*isBase())){
        yield*setInteger(ship(K.KSSHPC),max(sub(convert('real','float',sh(K.KSSHPC)),mul(real('50.'),local('rana'))),real('0.')));
        if(yield*cmp('lt',sh(K.KSSHPC),integer(0))())yield*setInteger(ship(K.KSSHPC),integer(0));
      }
      yield*setLocal('hita',real('0.0'));pc=700;break;
    case 1300:
      yield*setLow('shstto',bs());low.write('shcnto',1n);
      if(yield*cmp('gt',bs(),integer(0))())return;
      pc=1400;break;
    case 1400:
      yield*setInteger(base(),sub(sub(bs(),integer(50)),convert('integer','int',mul(real('100.0'),ran))));
      low.write('critdm',1n);
      if(yield*or(cmp('eq',iran(10),integer(10)),cmp('le',bs(),integer(0)))())low.write('klflg',2n);
      yield*setLow('shstto',bs());low.write('shcnto',1n);
      if(low.read('klflg')===0n)return;
      yield*io.baskil(sub(arg('nplc'),integer(2)));
      {const count=()=>high.address('nbase',add36(m.read(args.nplc),-2n));yield*setInteger(count,sub(word(count),integer(1)));}
      if(yield*and(firingShip,notPlayer)())yield*addScore(high,'rsr',K.KPBDAM,integer(10000));
      if(yield*and(firingShip,player)())yield*addScore(low,'tpoint',K.KPBDAM,integer(10000));
      yield*io.setdsp(base(K.KVPOS)(),base(K.KHPOS)(),0);yield*setInteger(base(),integer(0));
      return;
    default:throw new Error('Unreachable TORDAM source label');
  }
}
