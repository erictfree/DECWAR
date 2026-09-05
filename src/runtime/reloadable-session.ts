import type { SessionProgram,SessionWait } from './session.ts';

// Successful monitor RUN replaces the program in the same terminal job.
// It does not return into START's failure-path MONIT.
export class SessionReload extends Error{
  constructor(){super('Source monitor RUN');this.name='SessionReload';}
}
export function reloadableSession(load:()=>SessionProgram,beforeReload:()=>void):SessionProgram{
  let current=load();
  const run=function*():Generator<SessionWait,void,void>{
      for(;;){
        try{yield*current.run;return;}
        catch(error){if(!(error instanceof SessionReload))throw error;}
        beforeReload();current=load();
      }
    };
  return {
    run:run(),
    hangup:()=>current.hangup(),interrupt:()=>current.interrupt(),
  };
}
