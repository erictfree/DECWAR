import { sourceFile } from './source.ts';
import { queueLayout } from './queue-layout.ts';

export function fileDescriptors(read:(name:string)=>string=sourceFile, queueWords=2590, initialization:'experience'|'automatic'='experience'){
  const source=read('WARMAC.MAC'),lines=source.split('\n'),queue=queueLayout(read,queueWords);
  const expected=['ttyfil','inibeg','iniint','iniexp','nwsfil','hl1fil','hl2fil','grpfil','stared','staupd','stfred','stfupd'];
  const blocks:Record<string,{offset:number;words:number;line:number}>={};
  const words:({kind:'sixbit';text:string;line:number}|{kind:'expression';expression:string;line:number}|{kind:'byte9';values:number[];line:number})[]=[];
  const start=lines.findIndex(l=>/^ttyfil:/.test(l));let current='';
  if(start<0)throw new Error('Missing TTYFIL');
  for(let i=queue.fields.msgq.line;i<start;i++)if(lines[i].split(';')[0].trim())throw new Error('Unaccounted words before TTYFIL');
  for(let i=start;i<lines.length;i++){
    let code=lines[i].split(';')[0].trim();if(!code)continue;
    if(/^eonblk:/.test(code))break;
    const label=code.match(/^(\w+):\s*(.*)$/);
    if(label){current=label[1];if(current!==expected[Object.keys(blocks).length])throw new Error('Changed file descriptor order');blocks[current]={offset:words.length,words:0,line:i+1};code=label[2];}
    const six=code.match(/^sixbit\s+\/([^/]+)\/$/i);
    const bytes=code.match(/^byte\s+\(9\)\s*([0-7]+),([0-7]+),([0-7]+),([0-7]+)$/i);
    if(six)words.push({kind:'sixbit',text:six[1],line:i+1});
    else if(bytes)words.push({kind:'byte9',values:bytes.slice(1).map(n=>parseInt(n,8)),line:i+1});
    else{
      const expression=code.toLowerCase().replace(/^exp\s+/,'').replace(/^xwd\s+([^,]+),(.+)$/,'$1,,$2').replace(/\s/g,'');
      if(!/^[\w.,+\-]+$/.test(expression))throw new Error('Unknown descriptor word '+code);
      words.push({kind:'expression',expression,line:i+1});
    }
    blocks[current].words++;
  }
  if(Object.keys(blocks).length!==expected.length)throw new Error('Missing descriptor');
  const channels:Record<string,number>={};
  for(const name of ['tty','nws','hlp','ini','grp','sta']){const m=source.match(new RegExp('^\\s*'+name+'==([0-7]+)','m'));if(!m)throw new Error('Missing channel');channels[name]=parseInt(m[1],8);}
  const ppn=source.match(/^sysppn==([0-7]+),,([0-7]+)/m);if(!ppn)throw new Error('Missing SYSPPN');
  const constants={sysppn:ppn[1]+',,'+ppn[2]};
  const match=/decin0:\s*skipn\s+hungup\s+outstr\s+\[asciz "([\s\S]*?)"\]/.exec(source);
  let prompt:{text:string;line:number},missingInitialization:{text:string;line:number}|undefined;
  if(initialization==='experience'){
    if(!match)throw new Error('Missing DECINI prompt');
    prompt={text:match[1],line:source.slice(0,match.index).split('\n').length};
  }else{
    const first=source.indexOf('\ndecini:'),last=source.indexOf('\niich.:',first);
    if(first<0||last<first)throw new Error('Missing automatic DECINI section');
    const rows=[...source.slice(first,last).matchAll(/outstr\s*\[asciz\s*"([^"]*)"\]/gi)].map(m=>({text:m[1],line:source.slice(0,first+m.index).split('\n').length}));
    if(rows.length!==2)throw new Error('Automatic DECINI needs exactly two messages');
    [prompt,missingInitialization]=rows;
  }
  return {file:'WARMAC.MAC',address:queue.address+queue.words,mapLine:queue.mapLine,blocks,channels,constants,words,
    prompt,...(missingInitialization?{missingInitialization}:{})};
}
