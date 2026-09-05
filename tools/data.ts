import { sourceFile, statements } from './source.ts';
import type { CommonLayout } from './common.ts';
import { declarationScope } from './fortran-scope.ts';
export type DataValue = { kind:'integer'; word:string; source:string } | { kind:'quoted'|'hollerith'; text:string; source:string };
export type DataWord = {file:string;line:number;field:string;indices:number[];scope:'hiseg'|'precmd';offset:number;storageType:string;value:DataValue};
// Scoped DATA reader for the selected archive. It supports its explicit/nested
// implied-DO targets and literal forms, rejecting anything not understood.
function split(text:string):string[]{let depth=0,quoted=false,start=0;const parts:string[]=[];
  for(let i=0;i<text.length;i++){const c=text[i];if(c==="'"){if(quoted&&text[i+1]==="'"){i++;continue;}quoted=!quoted;}if(quoted)continue;
    if(c==='(')depth++;if(c===')')depth--;if(c===','&&depth===0){parts.push(text.slice(start,i).trim());start=i+1;}}
  if(depth!==0||quoted)throw new Error('Unbalanced DATA syntax');parts.push(text.slice(start).trim());return parts;
}
export function fortranData(constants:Record<string,number|string>,high:CommonLayout):DataWord[]{
  const number=(s:string,env:Record<string,number>={}):number=>{s=s.trim();if(/^-?\d+$/.test(s))return Number(s);const n=env[s.toLowerCase()]??constants[s.toUpperCase()];if(typeof n!=='number')throw new Error('Unresolved DATA integer '+s);return n;};
  function targets(text:string,env:Record<string,number>={}):{field:string;indices:number[]}[]{
    if(text.startsWith('(')&&text.endsWith(')')){
      const parts=split(text.slice(1,-1)),control=parts.at(-2)!.match(/^(\w+)\s*=\s*(.+)$/);if(!control||parts.length!==3)throw new Error('Unsupported DATA implied DO');
      const first=number(control[2],env),last=number(parts.at(-1)!,env);if(first>last)throw new Error('DATA reversed implied DO needs compiler contract');
      return Array.from({length:last-first+1},(_,i)=>targets(parts[0],{...env,[control[1].toLowerCase()]:first+i})).flat();
    }
    return split(text).map(t=>{const m=t.match(/^(\w+)(?:\(([^)]+)\))?$/);if(!m)throw new Error('Unsupported DATA target '+t);return{field:m[1].toLowerCase(),indices:m[2]?split(m[2]).map(i=>number(i,env)):[]};});
  }
  function value(text:string):DataValue {
    if(/^'(?:[^']|'')*'$/.test(text))return{kind:'quoted',text:text.slice(1,-1).replaceAll("''","'"),source:text};
    const holl=text.match(/^(\d+)H(.*)$/i);if(holl){if(Number(holl[1])!==holl[2].length)throw new Error('Hollerith length mismatch');return{kind:'hollerith',text:holl[2],source:text};}
    if(/^"[0-7]+$/.test(text))return{kind:'integer',word:BigInt('0o'+text.slice(1)).toString(),source:text};
    return{kind:'integer',word:String(number(text)),source:text};
  }
  const declaration=statements(sourceFile('SETUP.FOR')).find(s=>/^dimension precmd\(/i.test(s.text));
  const dimensions=declaration?.text.match(/^dimension precmd\(([^)]+)\)$/i);if(!dimensions)throw new Error('Missing PRECMD declaration');
  const precmd={offset:0,type:declarationScope('SETUP.FOR','XGTCMD').type('precmd').type,dimensions:split(dimensions[1]).map(n=>({lower:1,length:number(n)}))};
  const units=sourceFile('DECCMP.CMD').trim().split(/[\s,]+/).map(s=>s.toUpperCase());const all:DataWord[]=[];let count=0;
  for(const unit of units){let source:string;try{source=sourceFile(unit+'.FOR');}catch{continue;}
    for(const s of statements(source)){if(!/^data\s/i.test(s.text))continue;count++;
      const m=s.text.match(/^data\s+(.+?)\s*\/(.*)\/\s*$/i);if(!m)throw new Error('Unsupported DATA statement');
      const names=targets(m[1].trim()),values=split(m[2]).map(value);if(names.length!==values.length)throw new Error(`DATA count mismatch ${unit}:${s.line}`);
      for(const [i,target] of names.entries()){
        const scope=target.field==='precmd'?'precmd':'hiseg';const field=scope==='hiseg'?high.fields[target.field]:precmd;
        if(!field||target.indices.length!==field.dimensions.length)throw new Error('Unknown DATA field/rank');let offset=field.offset,stride=1;
        for(const [j,index] of target.indices.entries()){const d=field.dimensions[j];if(index<d.lower||index>=d.lower+d.length)throw new Error('DATA subscript outside declaration');offset+=(index-d.lower)*stride;stride*=d.length;}
        all.push({file:unit+'.FOR',line:s.line,...target,scope,offset,storageType:field.type,value:values[i]});
      }
    }
  }
  if(count!==12||all.length!==219)throw new Error(`DATA coverage changed: ${count} statements, ${all.length} words`);
  const seen=new Set<string>();for(const item of all){const key=item.scope+':'+item.offset;if(seen.has(key))throw new Error('Overlapping DATA initialization '+key);seen.add(key);}
  return all;
}
