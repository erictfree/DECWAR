import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { statements } from './source.ts';

export type SourceVariant = 'compuserve' | 'austin';
export type SourceReader = (name:string)=>string;
type FileRecord = {file:string;bytes:number;sha256:string};
export type SourceDocument = {file:string;text:string};
export type SourceUnit = {name:string;file:string;line:number;endLine:number};
const root=fileURLToPath(new URL('../',import.meta.url));

// A catalog selects evidence, never mutable process-wide game configuration.
// Austin's combined file is exposed through logical routine views for existing
// scoped extractors. Leading blank lines preserve physical source line numbers.
export class SourceCatalog {
  readonly variant:SourceVariant;
  readonly directory:string;
  readonly manifestPath:string;
  readonly mapPath:string;
  readonly compileUnits:readonly string[];
  private readonly files:ReadonlyMap<string,FileRecord>;
  private readonly cache=new Map<string,SourceDocument>();
  private unitCache:readonly SourceUnit[]|undefined;
  constructor(variant:SourceVariant){
    this.variant=variant;
    this.directory=variant==='austin'?'legacy/utexas/':'legacy/compuserve/fortran 1978/';
    this.manifestPath=variant==='austin'?'legacy/utexas-manifest.json':'docs/source-manifest.json';
    const manifest=JSON.parse(readFileSync(root+this.manifestPath,'utf8'));
    const records:FileRecord[]=variant==='austin'?manifest.files:manifest.inventory;
    this.files=new Map(records.map(f=>[f.file.toUpperCase(),f]));
    this.mapPath=variant==='austin'?'legacy/utexas-reference/f78f2ec/DECWAR.MAP':this.directory+'DECWAR.MAP';
    this.compileUnits=Object.freeze(variant==='austin'
      // Actual COMPILE/COMP and LINK inputs in the pinned reference transcript.
      ?['DECWAR','HIGH','LOW','SETUP','WARMAC','MSG','SETMSG']
      :this.read('DECCMP.CMD').trim().split(/[\s,]+/).map(n=>n.toUpperCase()));
  }
  private physical(file:string):SourceDocument {
    const cached=this.cache.get(file);if(cached)return cached;
    const document=Object.freeze({file,text:readFileSync(root+file,'latin1')});
    this.cache.set(file,document);return document;
  }
  document(name:string):SourceDocument {
    const key=name.toUpperCase();
    if(key==='DECWAR.MAP')return this.physical(this.mapPath);
    if(this.variant==='austin'&&key==='DECWAR.INI')return this.physical('legacy/utexas-reference/f78f2ec/DECWAR.INI');
    const record=this.files.get(key)??(this.variant==='austin'?this.files.get('HLP/'+key):undefined);
    if(record)return this.physical(this.directory+record.file);
    if(this.variant==='austin'&&/^[A-Z0-9]+\.FOR$/.test(key)){
      const unit=this.units().find(u=>u.name===key.slice(0,-4));
      if(unit){const source=this.physical(unit.file);return {file:unit.file,
        text:'\n'.repeat(unit.line-1)+source.text.split('\n').slice(unit.line-1,unit.endLine).join('\n')+'\n'};}
    }
    throw new Error(`No ${this.variant} source evidence for ${name}`);
  }
  readonly read:SourceReader=(name)=>this.document(name).text;
  units():readonly SourceUnit[]{
    if(this.unitCache)return this.unitCache;
    const result:SourceUnit[]=[];
    for(const record of this.files.values()){
      if(!record.file.toUpperCase().endsWith('.FOR'))continue;
      const source=this.physical(this.directory+record.file),rows=statements(source.text);
      let active:SourceUnit|undefined;
      for(const s of rows){
        const match=s.text.match(/^(?:(?:integer|real|logical|double precision)\s+)?(program|subroutine|function|block data)\s*(\w*)/i);
        if(match){if(active)throw new Error(`Unterminated unit ${active.name}`);
          active={name:(match[2]||'BLKDAT').toUpperCase(),file:source.file,line:s.line,endLine:0};}
        if(active&&/^end$/i.test(s.text)){active.endLine=s.line;result.push(Object.freeze(active));active=undefined;}
      }
      if(active)throw new Error(`Unterminated unit ${active.name}`);
    }
    this.unitCache=Object.freeze(result);return this.unitCache;
  }
  verify():{files:number;referenceFiles:number}{
    const verify=(file:string,expected:FileRecord)=>{
      const bytes=readFileSync(root+file);
      if(bytes.length!==expected.bytes||createHash('sha256').update(bytes).digest('hex')!==expected.sha256)
        throw new Error(`Source integrity failure: ${file}`);
    };
    for(const f of this.files.values())verify(this.directory+f.file,f);
    let referenceFiles=0;
    if(this.variant==='austin'){
      const base='legacy/utexas-reference/f78f2ec/';
      const reference=JSON.parse(readFileSync(root+base+'artifacts.json','utf8'));
      const imported=JSON.parse(readFileSync(root+this.manifestPath,'utf8'));
      if(reference.sourceCommit!==imported.commit)throw new Error('Austin source/reference commit mismatch');
      for(const name of ['DECWAR.MAP','DECWAR.INI']){
        const file:FileRecord|undefined=reference.files.find((f:FileRecord)=>f.file===name);
        if(!file)throw new Error('Missing Austin reference hash for '+name);
        verify(base+name,file);referenceFiles++;
      }
    }
    return {files:this.files.size,referenceFiles};
  }
}
