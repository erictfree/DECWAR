import { sourceFile } from './source.ts';

// WARMAC FLGBIT:164-168 and CBITS:948-1101; deliberately only this grammar.
export function characterBits(read:(name:string)=>string=sourceFile) {
  const source=read('WARMAC.MAC');
  if(!/mnemonic==bit\.\.\s+bit\.\.==bit\.\._1/.test(source))throw new Error('Changed FLGBIT definition');
  const lines=source.split('\n'), start=lines.findIndex(l=>/subttl\s+Character type bits/.test(l));
  const flags:Record<string,number>={}, entries:{value:number;line:number}[]=[];
  let bit=1, table=false;
  const expression=(text:string)=>text==='z'?0:text.split('!').reduce((value,name)=>{
    if(flags[name]===undefined)throw new Error(`Unknown character flag ${name}`);
    return value|flags[name];
  },0);
  for(let i=start+1;i<lines.length;i++) {
    const code=lines[i].split(';')[0].trim();
    if(code==='dephase')break;
    if(table){if(code)entries.push({value:expression(code),line:i+1});continue;}
    const flag=code.match(/^flgbit\s+(cf\.\w+)$/);
    if(flag){flags[flag[1]]=bit;bit*=2;continue;}
    const alias=code.match(/^(cf\.\w+)==(.+)$/);
    if(alias){flags[alias[1]]=expression(alias[2]);continue;}
    if(/^cbits:\s*phase 0$/.test(code))table=true;
  }
  if(start<0||entries.length!==128||bit!==2**17)throw new Error('Changed CBITS shape');
  return {file:'WARMAC.MAC',flags,entries};
}
