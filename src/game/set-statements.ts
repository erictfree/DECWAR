import type { CommonBlock } from '../compat/memory.ts';
import { add36 } from '../compat/word36.ts';
import { constants as K } from '../generated/source-data.ts';
import type { WeaponExpression,WeaponStatementServices } from './weapon-damage-statements.ts';
export const setSwitches=['NAME','OUTPUT','TTYTYPE','PROMPT','SCANS','ICDEF','OCDEF','ROMOPT','ENDFLG','BHREMV'] as const;
export const setMessages=['set001','set002','set003','set004','set005','set006','set007','set008','set009','set010','ttys00','shtfrm','medfrm','lngfrm','normal','inform','absfrm','relfrm','bthfrm'] as const;
export type SetMessage=typeof setMessages[number];
export type SetLocals={p:bigint;i:bigint;j:bigint};
export type SetSymbols=Record<typeof setSwitches[number]|SetMessage,bigint>;
export type SetStatementServices<W>=Pick<WeaponStatementServices<W>,'logical'|'assign'>&{
  not(word:bigint):boolean;
  assignTrue(destination:()=>bigint):Generator<W,void,void>;
  bounds(start:WeaponExpression<W>,limit:WeaponExpression<W>,step:1):Generator<W,{start:bigint;limit:bigint},void>;
  enterLoop(start:bigint,limit:bigint,step:1):boolean;
  equal(token:bigint,master:bigint):Generator<W,bigint,void>;
  out(message:SetMessage,lines:0|1|2):Generator<W,void,void>;
  crlf():Generator<W,void,void>;
  gtkn():Generator<W,void,void>;
  usrnam(argument:{address:bigint}|{zero:0}):Generator<W,bigint,void>;
  endgam():Generator<W,void,void>;
  dispc(v:bigint,h:bigint):Generator<W,bigint,void>;
  setdsp(v:bigint,h:bigint,zero:0):Generator<W,void,void>;
};
// SET.FOR:28-159. Caller-owned P/I/J, live source tables and actual board
// arguments; compiler logical/assignment/DO/call policies remain required.
export function* setStatements<W>(high:CommonBlock,low:CommonBlock,l:SetLocals,s:SetSymbols,io:SetStatementServices<W>):Generator<W,void,void>{
  const m=low.memory,value=(read:()=>bigint):WeaponExpression<W>=>({type:'integer',evaluate:function*(){return read();}});
  const integer=(n:number)=>value(()=>BigInt(n)),assign=(a:bigint,n:number)=>io.assign(()=>a,'integer',integer(n));
  const index=()=>m.read(l.p),next=()=>add36(index(),1n),token=(n:bigint)=>low.address('tknlst',n),alpha=(n:bigint)=>low.read('typlst',n)===BigInt(K.KALF);
  function* loop(a:bigint,limit:number,body:()=>Generator<W,'stop'|void,void>):Generator<W,boolean,void>{
    const b=yield*io.bounds(integer(1),integer(limit),1);m.write(a,b.start);
    if(io.enterLoop(b.start,b.limit,1))do{if((yield*body())==='stop')return true;m.write(a,add36(m.read(a),1n));}while(m.read(a)<=b.limit);
    return false;
  }
  yield*assign(l.p,2);let option:typeof setSwitches[number]|undefined;
  for(;;){
    if(alpha(index())){
      for(const key of setSwitches.slice(0,7))if(io.logical(yield*io.equal(token(index()),s[key]))){option=key;break;}
      if(option===undefined&&!io.not(low.read('pasflg')))for(const key of setSwitches.slice(7))if(io.logical(yield*io.equal(token(index()),s[key]))){option=key;break;}
    }
    if(option!==undefined)break;
    yield*io.out('set001',0);yield*io.gtkn();if(low.read('typlst',1)===BigInt(K.KEOL))return;yield*assign(l.p,1);
  }
  if(option==='NAME'){
    if(io.logical(yield*io.usrnam({address:l.p})))return;
    yield*io.out('set002',0);yield*io.gtkn();yield*io.usrnam({zero:0});return;
  }
  if(option==='ROMOPT'){yield*io.assignTrue(()=>high.address('romopt'));return;}
  if(option==='ENDFLG'){yield*io.assignTrue(()=>high.address('endflg'));yield*io.endgam();return;}
  if(option==='BHREMV'){
    yield*loop(l.i,K.KGALV,function*(){yield*loop(l.j,K.KGALH,function*(){if((yield*io.dispc(l.i,l.j))===BigInt(K.DXBHOL))yield*io.setdsp(l.i,l.j,0);});});return;
  }
  const prompt=({OUTPUT:'set003',TTYTYPE:'set008',PROMPT:'set004',SCANS:'set005',ICDEF:'set006',OCDEF:'set007'} as const)[option];
  let forcePrompt=false;
  for(;;){
    while(forcePrompt||!alpha(next())){
      if(option==='TTYTYPE')yield*io.crlf();yield*io.out(prompt,0);yield*io.gtkn();
      if(low.read('typlst',1)===BigInt(K.KEOL))return;yield*assign(l.p,0);forcePrompt=false;
    }
    if(option==='TTYTYPE'){
      yield*assign(low.address('ttytyp'),0);
      const ambiguous=yield*loop(l.i,K.KNTTY,function*(){
        if(io.not(yield*io.equal(token(next()),high.address('ttydat',1,m.read(l.i)))))return;
        if(low.read('ttytyp')!==0n)return 'stop';
        yield*io.assign(()=>low.address('ttytyp'),'integer',value(()=>m.read(l.i)));
      });
      if(!ambiguous&&low.read('ttytyp')!==0n)return;
      if(ambiguous)yield*io.out('set009',0);else yield*io.crlf();
      yield*io.out('set010',2);yield*io.out('ttys00',1);forcePrompt=true;continue;
    }
    const fields={OUTPUT:'oflg',PROMPT:'prtype',SCANS:'scnflg',ICDEF:'icflg',OCDEF:'ocflg'} as const;
    const choices:Record<keyof typeof fields,readonly (readonly [SetMessage,number])[]>={OUTPUT:[['shtfrm',K.SHORT],['medfrm',K.MEDIUM],['lngfrm',K.LONG]],PROMPT:[['normal',0],['inform',-1]],SCANS:[['shtfrm',K.SHORT],['lngfrm',K.LONG]],ICDEF:[['absfrm',K.KABS],['relfrm',K.KREL]],OCDEF:[['absfrm',K.KABS],['relfrm',K.KREL],['bthfrm',K.KBOTH]]};
    for(const [master,n] of choices[option])if(io.logical(yield*io.equal(token(next()),s[master])))yield*assign(low.address(fields[option]),n);
    return;
  }
}
