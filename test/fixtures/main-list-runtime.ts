import type { pregameRuntimeFixture } from './pregame-runtime.ts';
import { WordBlock } from '../../src/compat/memory.ts';
import { localLayout } from '../../src/generated/local-layout.ts';
import { constants as K,messages } from '../../src/generated/source-data.ts';
import { listDriverStatements } from '../../src/game/list-driver-statements.ts';
import type { ListEntry,ListDriverServices } from '../../src/game/list-driver-statements.ts';
import { listScanStatements,listKeywords } from '../../src/game/list-scan-statements.ts';
import type { ListKeyword,ListScanStatementServices } from '../../src/game/list-scan-statements.ts';
import { listFlagStatements } from '../../src/game/list-flag-statements.ts';
import type { ListFlagServices,ListFlagLabel } from '../../src/game/list-flag-statements.ts';
import { listUpdateStatements } from '../../src/game/list-update-statements.ts';
import { listObjectStatements,listSummaryStatements,listOutputStatements } from '../../src/game/list-report-statements.ts';
import type { ListReportServices,ListReportLabel,ListOutputServices } from '../../src/game/list-report-statements.ts';
import { prlocStatements } from '../../src/game/prloc-statements.ts';
import { rawPdist } from '../../src/compat/pdist.ts';
import { rawIngal } from '../../src/compat/ingal.ts';
import { loadArgumentBlock,selectArgumentBlock } from '../../src/compat/fortran-call.ts';
export function bindMainListRuntime(f:ReturnType<typeof pregameRuntimeFixture>){
  f.m.map(56200n,Array<bigint>(3000).fill(77n));const list=new WordBlock(f.m,localLayout.list),n=56200n,scanLocals={op:56201n,token:56202n,i:56203n,ship:56204n},flagLocals={d:56210n,scn:56211n,ctr:56212n,dummy:56213n,first:56214n,last:56215n,i:56216n,msg:56217n},updateD=56220n,objectLocals={spc:56221n,b:56222n},summaryMsg=56223n,outputLocals={sum:56230n,nt:56233n,first:56234n,last:56235n};
  const s={header:56300n,count:56320n,zero:56321n,char:56322n,prcflg:56323n,w:56324n,tw:56325n,prlflg:56326n,proflg:56327n,minusOne:56328n};f.m.write(s.minusOne,-1n);
  for(const [i,w] of [K.NEUBIT,K.FEDBIT,K.EMPBIT].entries())f.high.write('sbits',BigInt(w),i);
  type Label=ListFlagLabel|ListReportLabel|'lsts01'|'lsts02'|'lsts03'|'lsts04'|'romulan'|'fedshp'|'empshp'|'fedbas'|'empbas'|'neupln'|'fedpln'|'emppln'|'target';
  const literals:Partial<Record<Label,string>>={outOfRange:'out of range',builds:' builds',buildAbbreviation:' b',inactiveShip:' is not in the game',romulan:'Romulan',target:'target'},labels={} as Record<Label,bigint>;
  const keys=['lstf01','lstf02','lstf03','lstf04','lstf05','lstf06','lstf07','lstf08','lstf09','lstf10','lstf11','lstf12','lstf13','lstf14','lstf15','lstf16','lstf17','known','ingame','inrang','inspra','type06','inactiveShip','outOfRange','builds','build3','buildAbbreviation','lsts01','lsts02','lsts03','lsts04','romulan','fedshp','empshp','fedbas','empbas','neupln','fedpln','emppln','target'] as const;
  keys.forEach((key,i)=>{labels[key]=56500n+BigInt(i*30);f.h.put(labels[key],literals[key]??messages[key as keyof typeof messages].text);});
  const keywords={} as Record<ListKeyword,bigint>;listKeywords.forEach((word,i)=>{keywords[word]=58000n+BigInt(i*4);f.h.put(keywords[word],word);});
  const events:string[]=[],policy:{implicitShip?:bigint;twoLabel?:'true-first';reversedLoop?:'zero-trip'|'one-trip'}={},prepare=(a:bigint[])=>{loadArgumentBlock(f.m,s.header,a);selectArgumentBlock(f.r,s.header);};
  const outActual=function*(a:bigint,count:0|1){f.m.write(s.count,BigInt(count));prepare([a,s.count]);yield*f.rt.run('out');},out=function*(key:Label,count:0|1){events.push(key);yield*outActual(labels[key],count);};
  const crlf=function*(){yield*f.rt.run('crlf');},pdist=function*(v:bigint,h:bigint,ov:bigint,oh:bigint){prepare([v,h,ov,oh]);yield*rawPdist(f.r,f.rt.args,f.pdistCPU);return f.r.f;};
  const board=function*(entry:'disp'|'dispc',v:bigint,h:bigint){prepare([v,h]);yield*f.rawBoard.run(entry);return f.r.f;};
  const twoLabel=function*(test:()=>boolean){if(policy.twoLabel===undefined)throw new Error('LIST requires two-label IF compiler policy');return test();};
  const enterLoop=(first:bigint,last:bigint)=>{if(first<=last)return true;if(policy.reversedLoop===undefined)throw new Error('LIST requires reversed DO compiler policy');return policy.reversedLoop==='one-trip';};
  const prloc=function*(v:bigint,h:bigint,cr:0|1,width:0|2,mode:bigint,format:bigint){f.m.write(s.prcflg,BigInt(cr));f.m.write(s.w,BigInt(width));yield*prlocStatements(f.m,f.high,f.low,{v,h,prcflg:s.prcflg,w:s.w,tw:s.tw,prlflg:mode,proflg:format},f.pi);};
  const reportIO:ListReportServices<string>={*or(...p){return p.some(f=>f());},*and(...p){return p.every(f=>f());},out,outActual,crlf,
    *outc(c){f.h.put(s.char,c);prepare([s.char]);yield*f.rt.run('outc');},*space(){yield*f.rt.run('space');},
    *odisp(a,n){f.m.write(s.count,BigInt(n));prepare([a,s.count]);yield*f.rt.run('odisp');},*tab(n){f.m.write(s.count,BigInt(n));prepare([s.count]);yield*f.rt.run('tab');},
    *prloc(v,h){yield*prloc(v,h,0,2,f.low.address('ocflg'),f.low.address('oflg'));},
    *numeric(entry,a,width){f.m.write(s.count,BigInt(width));prepare([a,s.count]);yield*f.rt.run(entry);},
  };
  const object=()=>listObjectStatements(f.high,f.low,list,objectLocals,reportIO),summary=(count:bigint,key:Label,flags:bigint)=>listSummaryStatements(f.low,{n:count,str:labels[key],f:flags},summaryMsg,labels,reportIO);
  const flagIO:ListFlagServices<string>={logical:f.weapon.io.logical,and:reportIO.and,twoLabel,enterLoop,board,pdist,object,crlf,out,outActual,odisp:reportIO.odisp,
    *update(mask,count,scan,flags){yield*listUpdateStatements(f.low,list,updateD,{lstmsk:mask,objctr:count,scnbts:scan,xxf:flags},{logical:f.weapon.io.logical,pdist});},
    *prloc(v,h,mode,format){f.m.write(s.prlflg,BigInt(K.KABS));f.m.write(s.proflg,BigInt(format==='short'?K.SHORT:K.LONG));yield*prloc(v,h,1,0,mode==='absolute'?s.prlflg:f.low.address('ocflg'),s.proflg);},
  };
  let implicitShipInitialized=false;
  const scanIO:ListScanStatementServices<string>={logical:f.weapon.io.logical,equal:f.pregameInput.io.equal,*and(...p){for(const f of p)if(!(yield*f()))return false;return true;},
    implicitShip(a){if(policy.implicitShip===undefined)throw new Error('LSTSCN requires prior implicit SHIP word');if(!implicitShipInitialized){f.m.write(a,policy.implicitShip);implicitShipInitialized=true;}return f.m.read(a);},
    *sideBranch(friendly,test){const yes=yield*twoLabel(test);return friendly===yes?2500:2600;},out,crlf,
    *outw(a){prepare([a]);yield*f.rt.run('outw');},*ingal(v,h){prepare([v,h]);yield*rawIngal(f.r,f.rt.args);return f.r.f;},
    *prloc(v,h){yield*flagIO.prloc(v,h,'absolute','short');},
  };
  const outputIO:ListOutputServices<string>={crlf,object,summary,*dispc(v,h){return yield*board('dispc',v,h);},enterLoop};
  const io:ListDriverServices<string>={crlf,*clear(from,last){f.m.write(s.zero,0n);f.m.write(s.count,last-from+1n);yield*f.points.block.run('blkset',[from,s.zero,s.count]);},
    *scan(){events.push('scan');return yield*listScanStatements(f.high,f.low,list,scanLocals,keywords,scanIO);},
    *flags(){events.push('flags');return yield*listFlagStatements(f.high,f.low,list,flagLocals,s.minusOne,labels,flagIO);},
    *output(){events.push('output');yield*listOutputStatements(f.high,f.low,list,outputLocals,outputIO);},
  };
  return {list,n,scanLocals,flagLocals,updateD,objectLocals,summaryMsg,outputLocals,s,labels,keywords,events,policy,reportIO,flagIO,scanIO,outputIO,io,run:(entry:ListEntry)=>listDriverStatements(entry,f.high,f.low,list,n,io)};
}
