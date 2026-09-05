import type { pregameInputRuntimeFixture } from './pregame-input-runtime.ts';
import type { queueState } from '../../src/game/queue-state.ts';
import { queueInitializeRuntime } from '../../src/compat/queue-initialize-runtime.ts';
import { queueLayout } from '../../src/generated/queue-layout.ts';
import { halfWords } from '../../src/compat/word36.ts';
type Host=Pick<ReturnType<typeof pregameInputRuntimeFixture>,'m'|'r'|'cpu'>;
export function bindQueueInitializeRuntime(f:Host,queues:ReturnType<typeof queueState>){
  f.m.map(28400n,Array<bigint>(400).fill(0n));
  const symbols={hitql:queues.address('hitql'),msgql:queues.address('msgql'),knhit:BigInt(queueLayout.constants.knhit),knmsg:BigInt(queueLayout.constants.knmsg),hitLiteral:28400n,messageLiteral:28401n},events:string[]=[];
  f.m.write(symbols.hitLiteral,halfWords(symbols.hitql,symbols.hitql+1n));f.m.write(symbols.messageLiteral,halfWords(symbols.msgql,symbols.msgql+1n));
  const io={*blt(last:bigint):Generator<string,void,void>{events.push('blt:'+last);yield*f.cpu.blt(last);}};
  return {symbols,events,io,run:(entry:'setqh'|'setqm')=>queueInitializeRuntime(entry,f.m,f.r,symbols,io)};
}
