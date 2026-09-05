import { readFileSync } from 'node:fs';
import { currentVariant } from './variant-execution.ts';

const root=new URL('../../',import.meta.url);
export function sourceAsset(name:'DECWAR.HLP'|'DECWAR.NWS'|'DECWAR.INI'):string{
  const assets=currentVariant().definition.assets;
  if(name==='DECWAR.INI'){
    if(!assets.initialization)throw new Error('This source variant has no active initialization asset');
    return assets.initialization.text;
  }
  return readFileSync(new URL(name==='DECWAR.HLP'?assets.help:assets.news,root),'latin1');
}
