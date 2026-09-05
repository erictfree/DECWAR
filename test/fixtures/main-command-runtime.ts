import { pregameRuntimeFixture } from './pregame-runtime.ts';
import { bindMainLoopRuntime } from './main-loop-runtime.ts';
import { constants as K } from '../../src/generated/source-data.ts';
function done<T>(g:Generator<string,T,void>):T{for(let i=0;i<4000;i++){const n=g.next();if(n.done)return n.value;}throw new Error('test schedule exhausted');}
export function mainCommandFixture(line:string,format:number=K.SHORT,commandCount=1){
  const f=pregameRuntimeFixture([]),main=bindMainLoopRuntime(f),b=main.damageReport;main.policy.debug='omit';main.policy.movement=function*(alive){return alive()<0n?'repair':'leave';};
  for(const [key,value] of [['who',1n],['team',1n],['player',0n],['ptime',0n],['pasflg',0n],['ccflg',0n],['hungup',0n],['addrck',0n],['prtype',0n],['gagmsg',0n],['hcpos',0n],['blank',0n],['oflg',BigInt(format)]] as const)f.low.write(key,value);
  for(const [key,value] of [['nplnet',1n],['endflg',0n],['comknt',0n],['numply',2n],['dotime',0n],['tim0',0n],['romopt',0n]] as const)f.high.write(key,value);
  f.high.write('alive',-1n,1);f.high.write('docked',0n,1);f.high.write('shpcon',50000n,1,K.KSNRGY);f.high.write('shpcon',0n,1,K.KSDAM);f.high.write('shpcon',1n,1,K.KNTURN);
  for(let i=1;i<=K.KNPLAY;i++){f.high.write('hitflg',0n,i);f.high.write('msgflg',0n,i);}
  for(let i=1;i<=K.KNDEV;i++)f.high.write('shpdam',0n,1,i);f.high.write('shpdam',1000n,1,K.KDSHLD);
  f.getCommand.trapAddress.value=0n;f.clock.splice(0,f.clock.length,1000n,1100n);f.editor.feed(line+'\n');
  const reports:string[]=[],invoke=main.io.invoke;main.io.invoke=function*(call){const start=f.text().length;const result=yield*invoke(call);reports.push(f.text().slice(start));return result;};
  let count=0;const get=main.io.getcmd;main.io.getcmd=function*(a){if(count++<commandCount)yield*get(a);else f.low.write('who',0n);};
  return {...f,main,b,reports,run:()=>done(main.run())};
}
