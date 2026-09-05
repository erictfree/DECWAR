import { sourceFile } from './source.ts';

// WARMAC:676-738, anchored by public STABUF. Only this declaration grammar
// is accepted; equates emit no words. No surrounding allocation is inferred.
export function fileLayout(){
  const lines=sourceFile('WARMAC.MAC').split('\n'),start=lines.findIndex(l=>/^stabuf::block/.test(l));
  if(start<0)throw new Error('Missing STABUF declaration');
  const fields:Record<string,{offset:number;words:number;line:number;dimensions:{lower:number;length:number}[]}>= {};
  const aliases:Record<string,{offset:number;line:number}>={};let offset=0,ended=false;
  const number=(s:string)=>s.split('*').reduce((p,n)=>{if(!/^(\^d)?\d+$/.test(n))throw new Error('Unknown file allocation '+s);return p*(n.startsWith('^d')?Number(n.slice(2)):parseInt(n,8));},1);
  for(let i=start;i<lines.length;i++){
    const code=lines[i].split(';')[0].trim().toLowerCase();if(!code||/^\w+==/.test(code))continue;
    const alias=code.match(/^(foblk|leblk|ptblk):$/);if(alias){aliases[alias[1]]={offset,line:i+1};continue;}
    const block=code.match(/^([\w.]+):{1,2}\s*block\s+(.+)$/);
    if(block){const words=number(block[2]);fields[block[1]]={offset,words,line:i+1,dimensions:words===1?[]:[{lower:0,length:words}]};offset+=words;}
    else if(/^(staiow|stfiow):\s*iowd\s+\^d128\*5,stabuf$/.test(code)||code==='0'||code==='er.icc')offset++;
    else if(/^intblk:\s*4,,inth\.$/.test(code)){fields.intblk={offset,words:4,line:i+1,dimensions:[{lower:0,length:4}]};offset++;}
    else throw new Error(`Changed file-state declaration ${i+1}: ${code}`);
    if(block?.[1]==='pt.max'){ended=true;break;}
  }
  for(const [name,words] of [['foblk',6],['leblk',4],['ptblk',9]] as const){
    const alias=aliases[name];if(!alias)throw new Error('Missing '+name);
    fields[name]={...alias,words,dimensions:[{lower:0,length:words}]};
  }
  const map=sourceFile('DECWAR.MAP').split('\n'),pattern=/\bSTABUF\s+([0-7]+)\s+Global\s+Relocatable/;
  const mapLine=map.findIndex(l=>pattern.test(l)),match=map[mapLine]?.match(pattern);
  if(start<0||!ended||!match)throw new Error('Missing file-state anchor');
  return {file:'WARMAC.MAC',address:parseInt(match[1],8),words:offset,mapLine:mapLine+1,fields};
}
