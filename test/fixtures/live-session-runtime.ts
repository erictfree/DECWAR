import {createGameSession} from '../../src/runtime/game-session.ts';
// Connected unit tests explicitly retain bounded histories for source-order
// assertions. Public hosts call createGameSession directly and default to off.
export function liveSessionRuntime(...args:Parameters<typeof createGameSession>){
  const [terminal,mode,world,job,options]=args;
  return createGameSession(terminal,mode,world,job,{diagnosticLimit:100_000,...options});
}
