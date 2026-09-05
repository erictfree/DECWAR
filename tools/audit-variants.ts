import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { variantData } from './variant-data.ts';

export function auditVariants(checking:boolean){
  const root=fileURLToPath(new URL('../src/generated/variants/',import.meta.url));
  for(const variant of ['compuserve','austin'] as const){
    const data=variantData(variant),target=root+variant+'.ts';
    const text='// Generated from pinned source and link-map evidence by tools/audit.ts.\nexport const variantData = '+JSON.stringify(data,null,2)+' as const;\n';
    if(checking){if(readFileSync(target,'utf8')!==text)throw new Error('Variant data changed: '+variant);}
    else{mkdirSync(root,{recursive:true});writeFileSync(target,text);}
    console.log(`${checking?'Verified':'Generated'} ${variant}: ${data.ships.length} ships, ${data.constants.KNPLNT} planets, HISEG ${data.commonLayout.hiseg.words}, LOWSEG ${data.commonLayout.lowseg.words}.`);
  }
}
