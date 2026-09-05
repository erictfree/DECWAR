import { sourceFile } from './source.ts';
import { inputLayout } from './input-layout.ts';

// WARMAC:641-661. Extend the existing public anchor by checking every emitted
// word in this span; do not infer allocation before ECHFLG or after IC.
export function inputRuntimeLayout(read:(name:string)=>string=sourceFile){
  const anchor=inputLayout(read),lines=read('WARMAC.MAC').split('\n');
  const start=lines.findIndex(l=>/^echflg:\s*block\s+1\b/.test(l));
  const end=lines.findIndex(l=>/^ic:\s*pushj\s+p,ichr\./.test(l));
  const expected=[['echflg','block 1',1],['iniflg','block 1',1],['scale','block 1',1],
    ['ccflg.','block 1',1],['bufptr','block 1',1],['chrcnt','block 1',1],['linbuf','block maxcnt+1',anchor.maximum+1],
    ['obflb','block 1',1],['obfctr','0+.bfctr',1],['obfptr','0+.bfptr',1],['obfins','output 0,',1],['oc','pushj p,ochr.',1],
    ['ibflb','block 1',1],['ibfctr','0+.bfctr',1],['ibfptr','0+.bfptr',1],['ibfins','in 0,',1],['ic','pushj p,ichr.',1]] as const;
  const fields:Record<string,{offset:number;words:number;line:number;dimensions:{lower:number;length:number}[]}>= {};
  let offset=0,index=0;
  if(start<0||end<start)throw new Error('Missing I/O state span');
  for(let n=start;n<=end;n++){
    const code=lines[n].split(';')[0].trim().toLowerCase().replace(/\s+/g,' ');if(!code)continue;
    const [name,body,words]=expected[index++]??[];
    const declaration=code.match(/^([^:]+)(:{1,2})\s*(.*)$/);
    if(!declaration||declaration[1]!==name||declaration[3]!==body||declaration[2]!== (name==='ccflg.'?'::':':'))
      throw new Error(`Changed input runtime allocation at ${n+1}: ${code}`);
    fields[name==='ccflg.'?'ccflgDot':name]={offset,words,line:n+1,dimensions:name==='linbuf'?[{lower:0,length:words}]:[]};offset+=words;
  }
  if(index!==expected.length||fields.ccflgDot.line!==anchor.fields.ccflgDot.line)throw new Error('I/O anchor disagreement');
  return {file:'WARMAC.MAC',address:anchor.address-fields.ccflgDot.offset,words:offset,mapLine:anchor.mapLine,fields};
}
