import type { CommonBlock } from '../compat/memory.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../generated/source-data.ts';
import type { WeaponExpression,WeaponStatementServices,WeaponValueType } from './weapon-damage-statements.ts';
export type JumpStatementLocals={iloc1:bigint;jloc1:bigint;ivv:bigint;ihh:bigint;l:bigint};
export type JumpStatementServices<W>=Pick<WeaponStatementServices<W>,'binary'|'assign'|'logical'|'assignLogicalZero'>&{
  assignFalse(destination:()=>bigint,type:'integer'|'logical'):Generator<W,void,void>;
  ingal(v:bigint,h:bigint):Generator<W,bigint,void>;
  pdist(v:bigint,h:bigint,nv:bigint,nh:bigint):Generator<W,bigint,void>;
  dispc(v:bigint,h:bigint):Generator<W,bigint,void>;
  setdsp(v:bigint,h:bigint,code:WeaponExpression<W>):Generator<W,void,void>;
};
// JUMP.FOR:25-80. DISV/DISH are physical /CHKOUT/ words 6/7: CHECK calls
// them DHS/DVS. Caller supplies their addresses and persistent integer locals.
// Numeric conversions, call temporaries and .FALSE. assignment remain explicit.
export function* jumpStatements<W>(high:CommonBlock,low:CommonBlock,args:{nplc:bigint;j:bigint},
  chkout:{disv:bigint;dish:bigint},locals:JumpStatementLocals,io:JumpStatementServices<W>):Generator<W,void,void>{
  const m=low.memory;
  const value=(read:()=>bigint,type:WeaponValueType='integer'):WeaponExpression<W>=>({type,evaluate:function*(){return read();}});
  const literal=(n:bigint|number)=>value(()=>BigInt(n)),local=(a:bigint,type:WeaponValueType='integer')=>value(()=>m.read(a),type);
  const binary=(op:'add'|'mul',l:WeaponExpression<W>,r:WeaponExpression<W>):WeaponExpression<W>=>({type:l.type==='real'||r.type==='real'?'real':'integer',evaluate:()=>io.binary(op,l,r)});
  const set=(a:()=>bigint,v:WeaponExpression<W>)=>io.assign(a,'integer',v);
  const kind=()=>m.read(args.nplc),ship=(col:number)=>()=>high.address('shpcon',m.read(args.j),col),base=(col:number)=>()=>high.address('base',m.read(args.j),col,add36(kind(),-2n));
  low.write('shjump',0n);
  if(kind()<=BigInt(K.DXESHP)){
    yield*set(()=>locals.iloc1,value(()=>m.read(ship(K.KVPOS)())));yield*set(()=>locals.jloc1,value(()=>m.read(ship(K.KHPOS)())));
  }else if(kind()===BigInt(K.DXROM)){
    yield*set(()=>locals.iloc1,value(()=>high.read('locr',K.KVPOS)));yield*set(()=>locals.jloc1,value(()=>high.read('locr',K.KHPOS)));
  }else{
    yield*set(()=>locals.iloc1,value(()=>m.read(base(K.KVPOS)())));yield*set(()=>locals.jloc1,value(()=>m.read(base(K.KHPOS)())));
  }
  yield*set(()=>locals.ivv,binary('add',local(locals.iloc1),local(chkout.disv,'real')));
  yield*set(()=>locals.ihh,binary('add',local(locals.jloc1),local(chkout.dish,'real')));
  if(!io.logical(yield*io.ingal(locals.ivv,locals.ihh)))return;
  if((yield*io.pdist(locals.iloc1,locals.jloc1,locals.ivv,locals.ihh))!==1n)return;
  yield*set(()=>locals.l,{type:'integer',evaluate:()=>io.dispc(locals.ivv,locals.ihh)});
  if(m.read(locals.l)===BigInt(K.DXBHOL)){
    yield*io.setdsp(locals.iloc1,locals.jloc1,literal(0));low.write('shjump',1n);low.write('klflg',1n);
    yield*set(()=>low.address('vto'),local(locals.ivv));yield*set(()=>low.address('hto'),local(locals.ihh));
    if(kind()===BigInt(K.DXROM)){yield*io.assignFalse(()=>high.address('rom'),'logical');return;}
    if(kind()<BigInt(K.DXFBAS))yield*set(ship(K.KSDAM),literal(K.KENDAM));
    if(kind()<BigInt(K.DXFBAS))yield*io.assignLogicalZero(()=>high.address('alive',m.read(args.j)));
    if(kind()>=BigInt(K.DXFBAS))yield*set(base(3),literal(0));
    return;
  }
  if(m.read(locals.l)!==BigInt(K.DXMPTY))return;
  yield*io.setdsp(locals.iloc1,locals.jloc1,literal(0));
  yield*io.setdsp(locals.ivv,locals.ihh,binary('add',binary('mul',local(args.nplc),literal(100)),local(args.j)));
  if(kind()===BigInt(K.DXROM)){
    yield*set(()=>high.address('locr',K.KVPOS),local(locals.ivv));yield*set(()=>high.address('locr',K.KHPOS),local(locals.ihh));
  }else{
    if(kind()<BigInt(K.DXFBAS))yield*set(ship(K.KVPOS),local(locals.ivv));
    if(kind()<BigInt(K.DXFBAS))yield*set(ship(K.KHPOS),local(locals.ihh));
    if(kind()>=BigInt(K.DXFBAS))yield*set(base(K.KVPOS),local(locals.ivv));
    if(kind()>=BigInt(K.DXFBAS))yield*set(base(K.KHPOS),local(locals.ihh));
  }
  yield*set(()=>low.address('vto'),local(locals.ivv));yield*set(()=>low.address('hto'),local(locals.ihh));low.write('shjump',1n);
  if(kind()>=BigInt(K.DXFBAS))return;
  yield*set(ship(K.KSPCON),literal(K.RED));yield*io.assignFalse(()=>high.address('docked',m.read(args.j)),'integer');
}
