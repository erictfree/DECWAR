import { CommonBlock, objectArray, wordArray } from '../compat/memory.ts';
import { PackedBoard } from '../compat/board.ts';
import { TerminalOutput } from '../compat/output.ts';
import { constants as K } from '../runtime/variant-values.ts';
import { PlayerSlot } from './player.ts';
import type { Ship } from './ship.ts';
import { Scores } from './scores.ts';
import { KilledQueue } from './lifecycle.ts';
import type { KilledPlayer } from './lifecycle.ts';
import { emptyHit } from './hit-queue.ts';
import type { HitRegisters } from './hit-queue.ts';
import type { TellGroup } from './tell.ts';
import type { TimerStorage, TimerField } from './debug.ts';

export type CommonLogical = { logical(word:bigint):boolean; trueWord:bigint; falseWord:bigint };
// Accessors allocate no game state and perform no constructor initialization.
// Every read/write uses the original field location in the supplied address space.
function property(target:object,key:string,reference:{value:bigint},number=false):void {
  Object.defineProperty(target,key,{enumerable:true,configurable:true,get:()=>number?Number(reference.value):reference.value,set:n=>{reference.value=BigInt(n);}});
}
function scalars(block:CommonBlock):Record<string,bigint>{const view:Record<string,bigint>={};for(const [name,field] of Object.entries(block.layout.fields))if(field.dimensions.length===0)property(view,name,block.ref(name));return view;}
function highShip(block:CommonBlock,index:number,policy:CommonLogical):Ship {
  const ship={} as Ship;
  for(const [key,col,numeric] of [['v',K.KVPOS,true],['h',K.KHPOS,true],['turns',K.KNTURN,false],['condition',K.KSPCON,true],['torpedoes',K.KNTORP,false],['shieldCondition',K.KSHCON,false],['lifeReserves',K.KLFSUP,false],['energy',K.KSNRGY,false],['damage',K.KSDAM,false],['shieldStrength',K.KSSHPC,false]] as const)property(ship,key,block.ref('shpcon',index,col),numeric);
  Object.defineProperty(ship,'devices',{enumerable:true,value:block.array('shpdam',K.KNDEV+1,[index,0],1)});
  property(ship,'tractor',block.ref('trstat',index),true);
  Object.defineProperty(ship,'docked',{enumerable:true,get:()=>policy.logical(block.read('docked',index)),set:n=>block.write('docked',n?policy.trueWord:policy.falseWord,index)});
  return ship;
}
export function highState(block:CommonBlock,policy:CommonLogical) {
  if(block.layout.file!=='HISEG.FOR')throw new TypeError('HISEG block required');
  const players=objectArray<PlayerSlot>(K.KNPLAY+1,index=>{
    const p=Object.create(PlayerSlot.prototype) as PlayerSlot;
    Object.defineProperty(p,'ship',{enumerable:true,value:highShip(block,index,policy)});
    Object.defineProperty(p,'job',{enumerable:true,value:block.array('job',K.KNJBST+1,[index,0],1)});
    for(const key of ['alive','active','hitflg','msgflg'])property(p,key,block.ref(key,index));
    property(p,'shipName1',block.ref('names',index,1));property(p,'shipName2',block.ref('names',index,2));return p;
  });
  const bases=objectArray(3,team=>objectArray(K.KNBASE+1,index=>{
    const b={} as {v:number;h:number;strength:bigint;scanned:bigint};for(const [key,col,n] of [['v',1,true],['h',2,true],['strength',3,false],['scanned',4,false]] as const)property(b,key,block.ref('base',index,col,team),n);return b;
  }));
  const planets=objectArray(K.KNPLNT+1,index=>{const p={} as {v:number;h:number;builds:bigint;scanned:bigint};
    for(const [key,col,n] of [['v',1,true],['h',2,true],['builds',3,false],['scanned',4,false]] as const)property(p,key,block.ref('locpln',index,col),n);return p;});
  const locr={} as {v:number;h:number};property(locr,'v',block.ref('locr',1),true);property(locr,'h',block.ref('locr',2),true);
  const scores=Object.create(Scores.prototype) as Scores;
  Object.defineProperties(scores,{
    playerWords:{value:wordArray(block.memory,block.address('score',1,1),K.KNPOIN*K.KNPLAY)},
    teamWords:{value:wordArray(block.memory,block.address('tmscor',1,1),2*K.KNPOIN)},
    romulan:{value:block.array('rsr',K.KNPOIN+1,[0])},turns:{value:block.array('tmturn',4,[0])},ships:{value:block.array('numshp',3,[0])},
  });property(scores,'numrom',block.ref('numrom'));
  const killed=Object.create(KilledQueue.prototype) as KilledQueue;property(killed,'nkill',block.ref('nkill'),true);property(killed,'kilndx',block.ref('kilndx'),true);
  Object.defineProperty(killed,'rows',{value:objectArray(K.KQLEN+1,index=>{const row={} as KilledPlayer;
    for(const [i,key] of ['job','ppn','tty','time','teamShip'].entries())property(row,key,block.ref('kilque',index,i+1));return row;})});
  return {values:scalars(block),players,bases,planets,locr,scores,killed,
    board:new PackedBoard(block.array('board',K.BRDSIZ,[1])),
    nbase:block.array('nbase',3,[0]),numcap:block.array('numcap',3,[0]),numsid:block.array('numsid',3,[0]),numshp:scores.ships,
    bits:(i:number)=>block.read('bits',i),
  };
}
export function lowState(block:CommonBlock,output=new TerminalOutput()) {
  if(block.layout.file!=='LOWSEG.FOR')throw new TypeError('LOWSEG block required');
  property(output,'hcpos',block.ref('hcpos'),true);property(output,'blank',block.ref('blank'),true);
  const hit={} as HitRegisters;for(const key of [...Object.keys(emptyHit()),'dbits'])property(hit,key,block.ref(key));
  const groups=objectArray<TellGroup>(K.KNGRP+1,index=>{const g={} as TellGroup;property(g,'name',block.ref('group',index,1));property(g,'bits',block.ref('group',index,2));return g;});
  return {values:scalars(block),hit,groups,output,tpoint:block.array('tpoint',K.KNPOIN+1,[0]),phbank:block.array('phbank',3,[0]),
    tknlst:block.array('tknlst',K.KMAXTK,[1]),vallst:block.array('vallst',K.KMAXTK,[1]),typlst:block.array('typlst',K.KMAXTK,[1]),ptrlst:block.array('ptrlst',K.KMAXTK,[1]),
  };
}
// WARMAC:462-466. Base is supplied; DECWAR.MAP:31 places TIMERS immediately
// after HISEG. This view follows underflow into HISEG through the same memory.
export function timerState(block:CommonBlock,timerBase:bigint):TimerStorage {
  const offset=(field:TimerField,index:bigint)=>timerBase+BigInt(['name','count','total','high'].indexOf(field)*50)+index;
  return {read:(field,index)=>block.memory.read(offset(field,index)),write:(field,index,n)=>block.memory.write(offset(field,index),n)};
}
