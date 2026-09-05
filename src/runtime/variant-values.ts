import { currentVariant } from './variant-execution.ts';
import * as Baseline from '../generated/source-data.ts';
import { commonLayout as commonLayoutShape } from '../generated/common-layout.ts';
import { localLayout as localLayoutShape } from '../generated/local-layout.ts';
import { queueLayout as queueLayoutShape } from '../generated/queue-layout.ts';
import { inputLayout as inputLayoutShape } from '../generated/input-layout.ts';
import { inputRuntimeLayout as inputRuntimeLayoutShape } from '../generated/input-runtime-layout.ts';
import { fileLayout as fileLayoutShape } from '../generated/file-layout.ts';
import { lockLayout as lockLayoutShape } from '../generated/lock-layout.ts';
import { fileDescriptors as fileDescriptorsShape } from '../generated/file-descriptors.ts';
import { characterBits as characterBitsShape } from '../generated/character-bits.ts';
import { fortranDataWords as fortranDataWordsShape } from '../generated/fortran-data.ts';

// Preserve CompuServe's established object identities as well as its values;
// several existing memory views deliberately validate their layout identity.
const baseline={...Baseline,commonLayout:commonLayoutShape,localLayout:localLayoutShape,queueLayout:queueLayoutShape,inputLayout:inputLayoutShape,inputRuntimeLayout:inputRuntimeLayoutShape,fileLayout:fileLayoutShape,lockLayout:lockLayoutShape,fileDescriptors:fileDescriptorsShape,characterBits:characterBitsShape,fortranDataWords:fortranDataWordsShape};
function freeze(value:unknown):void{if(value!==null&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freeze(child);Object.freeze(value);}}
freeze(baseline);
function selected(){return currentVariant().definition.id==='compuserve'?baseline:currentVariant().definition;}

// Read-only views bridge the older statement ports' named imports to immutable
// per-session data. Values are selected at access, never copied between variants.
// The legacy export types describe the shared table schema during migration;
// source-specific absent entries are checked by their selected routine bindings.
const snapshots=new WeakMap<object,()=>object>();
export function snapshotVariantValue<T extends object>(value:T):T{return (snapshots.get(value)?.()??value) as T;}
function view<T extends object>(select:()=>T,array=false):T{
  const proxy=new Proxy((array?[]:{}) as T,{
    get(_target,key){const value=select(),entry=Reflect.get(value,key);return typeof entry==='function'?entry.bind(value):entry;},
    has(_target,key){return Reflect.has(select(),key);},
    ownKeys(){return Reflect.ownKeys(select());},
    getOwnPropertyDescriptor(_target,key){const d=Reflect.getOwnPropertyDescriptor(select(),key);return d?{...d,...(array&&key==='length'?{configurable:false,writable:true}:{configurable:true})}:undefined;},
    set(){throw new TypeError('Variant source data is immutable');},
    defineProperty(){throw new TypeError('Variant source data is immutable');},
    deleteProperty(){throw new TypeError('Variant source data is immutable');},
  });
  snapshots.set(proxy,select);return proxy;
}
export const constants=view(()=>selected().constants as unknown as typeof Baseline.constants);
export const commands=view(()=>selected().commands as unknown as typeof Baseline.commands,true);
export const pregame=view(()=>selected().pregame as unknown as typeof Baseline.pregame,true);
export const ships=view(()=>selected().ships as unknown as typeof Baseline.ships,true);
export const terminals=view(()=>selected().terminals as unknown as typeof Baseline.terminals,true);
export const terminalWords=view(()=>selected().terminalWords as unknown as typeof Baseline.terminalWords,true);
export const extraHelpWords=view(()=>selected().extraHelpWords as unknown as typeof Baseline.extraHelpWords,true);
export const deviceKeys=view(()=>selected().deviceKeys as unknown as typeof Baseline.deviceKeys,true);
export const outputTables=view(()=>selected().outputTables as unknown as typeof Baseline.outputTables);
export const messages=view(()=>selected().messages as unknown as typeof Baseline.messages);
export const statisticsText=view(()=>selected().statisticsText as unknown as typeof Baseline.statisticsText,true);
export const commissionText=view(()=>selected().commissionText as unknown as typeof Baseline.commissionText,true);
export const honorRollText=view(()=>selected().honorRollText as unknown as typeof Baseline.honorRollText,true);
export const clearStatisticsText=view(()=>selected().clearStatisticsText as unknown as typeof Baseline.clearStatisticsText,true);
export const pregameIdentityLabel=view(()=>selected().pregameIdentityLabel as unknown as typeof Baseline.pregameIdentityLabel);
export const scanObjects=view(()=>selected().scanObjects as unknown as typeof Baseline.scanObjects,true);
export const romulanText=view(()=>selected().romulanText as unknown as typeof Baseline.romulanText);
export const gripeText=view(()=>selected().gripeText as unknown as typeof Baseline.gripeText,true);
export const helpText=view(()=>selected().helpText as unknown as typeof Baseline.helpText,true);
export const newsText=view(()=>selected().newsText as unknown as typeof Baseline.newsText,true);
export const restartBackup=view(()=>selected().restartBackup as unknown as typeof Baseline.restartBackup);
export const decwarText=view(()=>selected().decwarText as unknown as typeof Baseline.decwarText);
export const debugText=view(()=>selected().debugText as unknown as typeof Baseline.debugText,true);
export const commonLayout=view(()=>selected().commonLayout as unknown as typeof commonLayoutShape);
export const localLayout=view(()=>selected().localLayout as unknown as typeof localLayoutShape);
export const queueLayout=view(()=>selected().queueLayout as unknown as typeof queueLayoutShape);
export const inputLayout=view(()=>selected().inputLayout as unknown as typeof inputLayoutShape);
export const inputRuntimeLayout=view(()=>selected().inputRuntimeLayout as unknown as typeof inputRuntimeLayoutShape);
export const fileLayout=view(()=>selected().fileLayout as unknown as typeof fileLayoutShape);
export const lockLayout=view(()=>selected().lockLayout as unknown as typeof lockLayoutShape);
export const fileDescriptors=view(()=>selected().fileDescriptors as unknown as typeof fileDescriptorsShape);
export const characterBits=view(()=>selected().characterBits as unknown as typeof characterBitsShape);
export const fortranDataWords=view(()=>selected().fortranDataWords as unknown as typeof fortranDataWordsShape,true);
