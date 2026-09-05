import { CommonBlock,WordBlock } from './memory.ts';
import type { FileBlock } from './files.ts';
import { localLayout } from '../generated/local-layout.ts';
import { constants as K } from '../generated/source-data.ts';
import { halfWords,signed36 } from './word36.ts';
import { machineRegisters } from './registers.ts';
import type { HeaderSymbols,StatusSymbols } from './status-output.ts';

// Bind source COMMON words and accumulator aliases, without loading or clearing.
// WARMAC:541-546,551-569,2536-2708; HISEG JOB and SETUP LOCAL identity layout.
// Literal/table relocation and POINT encoding remain required assembler inputs.
export function outputMemory(low:CommonBlock,high:CommonBlock,identity:WordBlock<typeof localLayout.identity>,file:FileBlock,
  literals:{lngshp:bigint;pregameLabel:bigint;point7LeftHalf:bigint;blackHoleLabel:bigint;romulanLabel:bigint}){
  if(low.layout.file!=='LOWSEG.FOR'||high.layout.file!=='HISEG.FOR'||identity.layout!==localLayout.identity)
    throw new TypeError('Output memory requires LOWSEG, HISEG and the LOCAL identity view');
  if([high.memory,identity.memory,file.memory].some(m=>m!==low.memory))throw new TypeError('Output views must share one address space');
  const state={
    get who(){return low.read('who');},set who(v:bigint){low.write('who',v);},
    get oflg(){return low.read('oflg');},set oflg(v:bigint){low.write('oflg',v);},
    get hcpos(){return low.read('hcpos');},set hcpos(v:bigint){low.write('hcpos',v);},
    get blank(){return low.read('blank');},set blank(v:bigint){low.write('blank',v);},
    get versio(){return high.read('versio');},set versio(v:bigint){high.write('versio',v);},
    get gameno(){return high.read('gameno');},set gameno(v:bigint){high.write('gameno',v);},
    get blhopt(){return high.read('blhopt');},set blhopt(v:bigint){high.write('blhopt',v);},
    get romopt(){return high.read('romopt');},set romopt(v:bigint){high.write('romopt',v);},
  };
  const status:StatusSymbols={lngshp:literals.lngshp,pregameLabel:literals.pregameLabel,point7LeftHalf:literals.point7LeftHalf,
    player:{name1:high.address('job',1,K.KNAM1),name2:high.address('job',1,K.KNAM2),speed:high.address('job',1,K.KTTYSP),
      ppn:high.address('job',1,K.KPPN),tty:high.address('job',1,K.KTTYN),job:high.address('job',1,K.KJOB)},
    pregame:{name1:identity.address('nam1'),name2:identity.address('nam2'),speed:identity.address('ttyspd'),
      ppn:identity.address('ppn'),tty:identity.address('ttynum'),job:identity.address('jobnum')}};
  const header:HeaderSymbols={tmp:file.address('tmp',0),tmpPointer:signed36(halfWords(literals.point7LeftHalf,file.address('tmp',0))),
    blackHoleLabel:literals.blackHoleLabel,romulanLabel:literals.romulanLabel};
  return {registers:machineRegisters(low.memory),state,status,header};
}
