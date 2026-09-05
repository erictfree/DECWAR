import { CommonBlock, WordBlock, objectArray } from './memory.ts';
import type { WordMemory } from './memory.ts';
import { characterBits } from '../runtime/variant-values.ts';
import { inputLayout } from '../runtime/variant-values.ts';
import { constants as K } from '../runtime/variant-values.ts';
import { CommandInput } from './command-input.ts';
import { UnresolvedFloatInput } from './parser.ts';
import type { Token } from './parser.ts';
import { add36, halfWords, multiply36, packAscii, signed36, unpackAscii } from './word36.ts';
import type { TerminalOutput } from './output.ts';

function tokenStorage(low:CommonBlock, lineAddress:bigint,compileTokenWord:(text:string)=>bigint) {
  const tokens=objectArray<Token>(K.KMAXTK,index=>{
    const n=index+1;
    return {
      get text(){return unpackAscii(low.read('tknlst',n)).split('\0',1)[0];},
      set text(text:string){low.write('tknlst',compileTokenWord(text),n);},
      get type(){return Number(low.read('typlst',n)) as Token['type'];},
      set type(type:Token['type']){low.write('typlst',BigInt(type),n);},
      get value(){return low.read('vallst',n);},set value(value:bigint){low.write('vallst',value,n);},
      // Existing port API uses offsets; PTRLST itself always retains the actual
      // absolute word pointer. Reads outside LINBUF are delegated to memory.
      get offset(){return Number(low.read('ptrlst',n)-lineAddress);},
      set offset(offset:number){low.write('ptrlst',lineAddress+BigInt(offset),n);},
    };
  });
  return { tokens,count:{get value(){return Number(low.read('ntok'));},set value(n:number){low.write('ntok',BigInt(n));}} };
}
const classified=(c:number,flag:number)=>(characterBits.entries[c].value&flag)!==0;
const spacing=(c:number)=>classified(c,characterBits.flags['cf.spc']);
const delimiter=(c:number)=>classified(c,characterBits.flags['cf.dlm']);
const endLine=(c:number)=>classified(c,characterBits.flags['cf.eol']);
const endCommand=(c:number)=>classified(c,characterBits.flags['cf.eoc']);

// WARMAC:646-649,1670-1848. Character words, absolute pointers and packed
// token words stay live. The companion INLI routine writes this storage per
// keystroke; completed-string installation remains a component-test adapter.
export class MemoryCommandInput extends CommandInput {
  readonly low:CommonBlock;
  readonly memory:WordMemory;
  readonly block:WordBlock;
  readonly lineAddress:bigint;
  private ready=false;
  constructor(low:CommonBlock,compileTokenWord:(text:string)=>bigint,base=BigInt(inputLayout.address)) {
    if(low.layout.file!=='LOWSEG.FOR')throw new TypeError('Input requires LOWSEG');
    const fields=Object.fromEntries(Object.entries(inputLayout.fields).map(([name,f])=>[name,{...f,dimensions: name==='linbuf'?[{lower:0,length:f.words}]:[]} ]));
    const block=new WordBlock(low.memory,{...inputLayout,fields},base), lineAddress=block.address('linbuf',0);
    super(tokenStorage(low,lineAddress,compileTokenWord)); this.low=low;this.memory=low.memory;this.block=block;this.lineAddress=lineAddress;
  }
  get pointer():bigint{return this.block.read('bufptr');} set pointer(n:bigint){this.block.write('bufptr',n);}
  get ccflgDot():bigint{return this.block.read('ccflgDot');} set ccflgDot(n:bigint){this.block.write('ccflgDot',n);}
  override get available():boolean{return this.pointer>0n;}
  override get repeated():boolean{return this.low.read('rptflg')!==0n;}
  override set repeated(value:boolean){this.low.write('rptflg',value?-1n:0n);}
  private character(address:bigint):number {
    const word=this.memory.read(address);
    if(word<0n||word>127n)throw new RangeError('LINBUF character requires original CBITS/out-of-table machine execution');
    return Number(word);
  }
  override characterAt(offset:number):number{return this.character(this.lineAddress+BigInt(offset));}
  override get rawLine():string {
    let text=''; for(let offset=0;;offset++){const code=this.characterAt(offset);if(code===0)return text;text+=String.fromCharCode(code);}
  }
  override set rawLine(_line:string){throw new TypeError('Use edited-line installation to write LINBUF');}
  override discardTail():void{this.pointer=-1n;this.ready=false;}
  override prepareRead(interrupted:boolean,out:TerminalOutput):boolean {
    this.ready=false;
    if(interrupted)return false; // AOSE CCFLG. skips the AOSG BUFPTR instruction.
    this.pointer=add36(this.pointer,1n);
    if(this.pointer<=0n)return false;
    out.crlf();this.ready=true;return true;
  }
  override beginLine():void{this.discardTail();}
  override acceptEditedLine(line:string,repeated=false):void {
    if(line.length>inputLayout.maximum||/[\0\r\n]/.test(line)||[...line].some(c=>c.charCodeAt(0)>127))throw new RangeError('An edited input line must fit 7-bit LINBUF');
    this.ready=false;
    this.repeated=repeated;
    if(repeated)return; // INLI's repeat branch leaves CHRCNT and LINBUF untouched.
    this.block.write('chrcnt',0n);
    for(let i=0;i<line.length;i++) {
      this.block.write('chrcnt',BigInt(i+1));this.memory.write(this.lineAddress+BigInt(i),BigInt(line.charCodeAt(i)));
    }
    this.block.write('chrcnt',BigInt(line.length+1));this.memory.write(this.lineAddress+BigInt(line.length),0n);
  }
  override startLine():void{this.pointer=this.lineAddress;this.ready=true;}
  override acceptLine(line:string,repeated=false):void {this.beginLine();this.acceptEditedLine(line,repeated);this.startLine();}
  override forceQuit():void {
    this.low.write('typlst',BigInt(K.KALF),1);this.low.write('tknlst',packAscii('QUIT'),1);
    // AOJA X1 increments the full loop word; GTKN.5 does not HRRZI it here.
    this.low.write('ntok',add36(signed36(halfWords(-BigInt(K.KMAXTK-1),0n)),1n));
    this.low.write('typlst',BigInt(K.KEOL),2);this.low.write('vallst',0n,2);this.low.write('tknlst',0n,2);
  }
  private skipSpacing():number {
    let code=this.character(this.pointer);
    while(spacing(code)){this.pointer=add36(this.pointer,1n);code=this.character(this.pointer);}
    return code;
  }
  private finish(count:number):void {
    this.ntok=count;this.low.write('typlst',BigInt(K.KEOL),count+1);
    this.low.write('vallst',0n,count+1);this.low.write('tknlst',0n,count+1);
    // GTKN.5 never writes the EOL slot's PTRLST.
  }
  override acquire(out:TerminalOutput):boolean {
    if(!this.ready&&(!this.available||!this.prepareRead(false,out)))return false;
    this.ready=false;
    for(let index=0;index<K.KMAXTK-1;index++) {
      const slot=index+1;this.low.write('tknlst',0n,slot);this.skipSpacing();
      this.low.write('ptrlst',this.pointer,slot);
      let numeric=0n,negative=false,hasSign=false,hasDigit=false,alpha=false,chars=0,ended=false;
      for(;;) {
        let code=this.character(this.pointer);if(code>0o137)code-=0o40;
        if(endCommand(code)){ended=true;if(endLine(code)||code===59)this.pointer=-1n;break;}
        if(delimiter(code)) {
          code=this.skipSpacing();if(delimiter(code))this.pointer=add36(this.pointer,1n);
          ended=endCommand(code);if(endLine(code)||code===59)this.pointer=-1n;break;
        }
        if(!alpha) {
          if(code===43||code===45) {
            if(hasSign||chars>0){alpha=true;numeric=0n;}else{hasSign=true;negative=code===45;}
          }else if(code===46)throw new UnresolvedFloatInput();
          else if(code>=48&&code<=57){hasDigit=true;numeric=add36(multiply36(numeric,10n),BigInt(code-48));}
          else alpha=true;
        }
        if(chars<5) {
          const shift=BigInt(29-chars*7),word=this.low.read('tknlst',slot);
          this.low.write('tknlst',(word&~(127n<<shift))|(BigInt(code)<<shift),slot);
        }
        chars++;this.pointer=add36(this.pointer,1n);
      }
      this.low.write('vallst',alpha?0n:signed36(negative?-numeric:numeric),slot);
      this.low.write('typlst',BigInt(alpha?K.KALF:hasDigit?K.KINT:K.KNUL),slot);
      if(ended){this.finish(chars||index>0?index+1:index);return true;}
    }
    out.out('Too many words -- line ignored',1);this.pointer=-1n;this.finish(0);return true;
  }
}
