import { sourceFile } from './source.ts';
import { inputRuntimeLayout } from './input-runtime-layout.ts';
import { fileLayout } from './file-layout.ts';
export function lockLayout(read:(name:string)=>string=sourceFile){
  const lines=read('WARMAC.MAC').split('\n'),input=inputRuntimeLayout(read),file=fileLayout(read);
  const count=read('WARMAC.MAC').match(/knloks==\^d(\d+)/i);if(!count)throw new Error('Missing KNLOKS');
  const maximum=Number(count[1]),start=lines.findIndex(l=>/^tobcb:/.test(l));
  const declarations=[['tobcb','3',3],['tobuf','3',3],['ttyBuffer','50',40],['frebie','1',1],['ftlerr','1',1],['locked','1',1],['svlock','1',1],['whohas','3',3],['loktab','knloks',maximum],['jsqwho','1',1],['timsta','^d50',50],['timlcn','^d50',50]] as const;
  const expected=declarations.filter(([name])=>name!=='locked'||/^locked:/m.test(read('WARMAC.MAC')));
  const fields:Record<string,{offset:number;words:number;line:number;dimensions:{lower:number;length:number}[]}>= {};let offset=0,index=0;
  if(start<0)throw new Error('Missing TOBCB');
  for(let i=input.fields.ic.line;i<start;i++)if(lines[i].split(';')[0].trim())throw new Error('Unaccounted words before TOBCB');
  for(let i=start;i<lines.length;i++){
    const code=lines[i].split(';')[0].trim().toLowerCase();if(!code)continue;if(/^stabuf::/.test(code))break;
    const m=code.match(/^(?:(\w+):\s*)?block\s+(\S+)$/),entry=expected[index++];
    if(!m||!entry||m[2]!==entry[1]||(m[1]??'ttyBuffer')!==entry[0])throw new Error(`Changed lock-state allocation ${i+1}`);
    const [name,,words]=entry;fields[name]={offset,words,line:i+1,dimensions:words===1?[]:[{lower:0,length:words}]};offset+=words;
  }
  const address=input.address+input.words;
  if(index!==expected.length||address+offset!==file.address)throw new Error('Lock span disagrees with STABUF anchor');
  return {file:'WARMAC.MAC',address,words:offset,maximum,mapLine:file.mapLine,fields};
}
