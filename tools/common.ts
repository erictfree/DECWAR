import { sourceFile, statements } from './source.ts';
import { declarationScope } from './fortran-scope.ts';

type Dimension = { lower: number; length: number };
type Field = { offset: number; dimensions: readonly Dimension[]; words: number; type: string; line: number; assembly: { name: string; line: number; type: string } };
export type CommonLayout = { file: string; address: number; words: number; mapLine: number; fields: Record<string, Field> };
function split(text: string): string[] { let depth=0, start=0;const parts:string[]=[];
  for(let i=0;i<text.length;i++){if(text[i]==='(')depth++;if(text[i]===')')depth--;if(text[i]===','&&depth===0){parts.push(text.slice(start,i).trim());start=i+1;}}
  parts.push(text.slice(start).trim());return parts;
}
// Deliberately scoped to the two supplied interface includes, not a compiler.
// FORTRAN declarations, assembly macro dimensions and link lengths must agree.
export function commonLayouts(constants: Record<string,number|string>): Record<'hiseg'|'lowseg',CommonLayout> {
  const number=(text:string):number=>{text=text.trim();if(/^\d+$/.test(text))return Number(text);const n=constants[text.toUpperCase()];if(typeof n!=='number')throw new Error('Unknown COMMON dimension '+text);return n;};
  const dimension=(text:string):Dimension=>{const bounds=text.split(':');const lower=bounds.length===2?number(bounds[0]):1;return {lower,length:number(bounds.at(-1)!)-lower+1};};
  const assemblySource=sourceFile('WARMAC.MAC');
  const assemblyNumber=(text:string):number=>{if(/^\d+$/.test(text))return Number(text);const match=assemblySource.match(new RegExp('^\\s*'+text+'==(?:\\^d)?(\\d+)(?=\\s|;)','im'));if(!match)throw new Error('Unresolved assembly dimension '+text);return Number(match[1]);};
  const assemblyDimension=(text:string):Dimension=>{const bounds=text.split(':');const lower=bounds.length===2?assemblyNumber(bounds[0]):1;return {lower,length:assemblyNumber(bounds.at(-1)!)-lower+1};};
  const asm=assemblySource.split('\n'), map=sourceFile('DECWAR.MAP').split('\n');
  const result={} as Record<'hiseg'|'lowseg',CommonLayout>;
  for(const name of ['hiseg','lowseg'] as const){
    const scope=declarationScope(name==='hiseg'?'HIGH.FOR':'LOW.FOR');
    const file=name.toUpperCase()+'.FOR', stmts=statements(sourceFile(file));
    const order=stmts.filter(s=>s.text.toLowerCase().startsWith('common /'+name+'/')).flatMap(s=>split(s.text.replace(/^common\s*\/\w+\//i,'')).map(n=>({name:n.toLowerCase(),line:s.line})));
    const declarations=new Map<string,{type:string;dimensions:Dimension[];line:number}>();
    for(const s of stmts){const m=s.text.match(/^(integer|logical|real)\s+(\w+)(?:\(([^)]+)\))?$/i);if(m)declarations.set(m[2].toLowerCase(),{type:m[1].toLowerCase(),dimensions:m[3]?split(m[3]).map(dimension):[],line:s.line});}
    const fields:Record<string,Field>={};let offset=0;
    for(const item of order){const d=declarations.get(item.name)??{type:scope.type(item.name).type,dimensions:[],line:item.line};
      const words=d.dimensions.reduce((p,d)=>p*d.length,1);fields[item.name]={...d,offset,words,assembly:{name:'',line:0,type:''}};offset+=words;}
    let active=false, index=0;
    for(const [i,line] of asm.entries()){
      const common=line.match(/^\s*common\s+(\w+)/i);if(common){if(active)break;active=common[1].toLowerCase()===name;continue;}if(!active)continue;
      const m=line.match(/^\s*(integer|logical|real)\s+([\w.]+)(?:,\s*<([^>]+)>)?/i);if(!m)continue;
      const item=order[index++];if(!item)throw new Error('Extra assembly COMMON field');const f=fields[item.name];
      const asmName=m[2].toLowerCase(), expected=item.name==='hilst'?'hi.lst':item.name==='inflag'?'inwait':item.name;
      const dims=m[3]?m[3].replaceAll(/\s/g,'').replaceAll(',:,',':').split(',').map(assemblyDimension):[];
      if(asmName!==expected||JSON.stringify(dims)!==JSON.stringify(f.dimensions)||f.type.replace('implicit-','')!==m[1].toLowerCase())throw new Error(`COMMON declaration disagreement ${name}.${item.name}`);
      f.assembly={name:asmName,line:i+1,type:m[1].toLowerCase()};
    }
    if(index!==order.length)throw new Error('Incomplete assembly COMMON comparison');
    const re=new RegExp('\\b'+name+'\\s+([0-7]+)\\s+Common\\s+length\\s+(\\d+)\\.','i');
    const mapIndex=map.findIndex(line=>re.test(line)), match=map[mapIndex]?.match(re);if(!match||Number(match[2])!==offset)throw new Error(`COMMON map length disagreement ${name}: ${offset}`);
    result[name]={file,address:parseInt(match[1],8),words:offset,mapLine:mapIndex+1,fields};
  }
  return result;
}
