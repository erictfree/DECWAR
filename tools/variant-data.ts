import { createHash } from 'node:crypto';
import { SourceCatalog, type SourceVariant } from './source-catalog.ts';
import { ascilSuffix, debugMessages, decwarLiterals, gripeMessages, messageCatalog, outputTable, pregameStatText, restartBackupBytes, romulanTables, scanObjectTable, statements, statisticsMessages, stringTable, textCommandMessages } from './source.ts';
import { commonLayouts } from './common.ts';
import { localLayouts } from './local-layout.ts';
import { queueLayout } from './queue-layout.ts';
import { fortranData } from './data.ts';
import { inputLayout } from './input-layout.ts';
import { inputRuntimeLayout } from './input-runtime-layout.ts';
import { fileLayout } from './file-layout.ts';
import { lockLayout } from './lock-layout.ts';
import { fileDescriptors } from './file-descriptors.ts';
import { characterBits } from './character-bits.ts';

// Variant extraction remains separate from selecting a playable runtime.
// Fail on incomplete evidence instead of inheriting the other variant's tables.
export function variantData(variant:SourceVariant){
  const catalog=new SourceCatalog(variant);catalog.verify();
  const read=catalog.read,K:Record<string,number|string>={};
  for(const s of statements(read('PARAM.FOR'))){
    const m=s.text.match(/^parameter\s+(\w+)\s*=\s*(.+)$/i);if(!m)continue;
    const v=m[2].trim();
    if(/^-?\d+$/.test(v))K[m[1].toUpperCase()]=Number(v);
    else if(/^"[0-7]+$/.test(v))K[m[1].toUpperCase()]=parseInt(v.slice(1),8);
    else if(/^'.*'$/.test(v))K[m[1].toUpperCase()]=v.slice(1,-1);
    else throw new Error(`Unsupported ${variant} parameter at ${s.line}`);
  }
  const players=Number(K.KNPLAY),common=commonLayouts(K,read,{fortranOnlyTrailingHilst:variant==='austin'});
  const locate=(file:string,line:number)=>({file:variant==='compuserve'?file:catalog.document(file).file,line});
  const table=(array:string,width:number)=>stringTable('BLKDAT.FOR',array,width,read);
  const declaration=(file:string,array:string)=>{
    const found=statements(read(file)).find(s=>new RegExp('^data\\s*\\(\\('+array+'\\(','i').test(s.text));
    if(!found)throw new Error('Missing table '+array);return locate(file,found.line);
  };
  const shipRows=table('names',3),shortNames=outputTable('shtshp',players,read),longNames=outputTable('lngshp',players,read);
  if(shipRows.length!==players)throw new Error('Roster disagrees with KNPLAY');
  const ships=shipRows.map((words,i)=>{
    const name=words.slice(0,2).join('').trim(),symbol=words[2];
    if(longNames[i].text!==name||shortNames[i].text?.trim()!==symbol.trim())throw new Error(`FORTRAN/MACRO roster disagreement: ${variant} ${i+1}`);
    return {id:i+1,name,symbol,words};
  });
  const commands=table('isaydo',2).map((words,i)=>({id:i+1,words,name:words.join('').trim()}));
  const pregame=stringTable('SETUP.FOR','precmd',2,read).map((words,i)=>({id:i+1,words,name:words.join('').trim()}));
  if(commands.length!==K.KNCMD||pregame.length!==K.KNPCMD)throw new Error('Command table count disagreement');
  const messages=Object.fromEntries(Object.entries(messageCatalog(read)).map(([key,value])=>[key,{...value,...locate(value.file,value.line)}]));
  const masks=statements(read('SETUP.FOR')).flatMap(s=>[...s.text.matchAll(/group\s*\(\s*([1-5])\s*,\s*2\s*\)\s*=\s*"([0-7]+)/gi)].map(m=>({group:Number(m[1]),mask:parseInt(m[2],8),...locate('SETUP.FOR',s.line)})));
  const halfMask=2**(players/2)-1;
  if(masks.length!==5||masks[0].mask!==2**players-1||masks[1].mask!==halfMask*2**(players/2)||masks[4].mask!==halfMask)throw new Error('Team masks disagree with player count');
  const units=catalog.units().filter(u=>catalog.compileUnits.includes(u.file.slice(u.file.lastIndexOf('/')+1,-4)));
  const entryPoints=units.flatMap(unit=>statements(read(unit.file.slice(catalog.directory.length))).filter(s=>s.line>=unit.line&&s.line<=unit.endLine).flatMap(s=>{
    const m=s.text.match(/^entry\s+(\w+)/i);return m?[{name:m[1].toUpperCase(),unit:unit.name,file:unit.file,line:s.line}]:[];
  }));
  const local=localLayouts(K,read),queue=queueLayout(read,variant==='austin'?4190:2590);
  // Logical routine aliases retain physical line numbers and canonical paths.
  if(variant==='austin')for(const layout of Object.values(local))layout.file=catalog.document(layout.file).file;
  const deviceStatement=statements(read('BLKDAT.FOR')).find(s=>/^data\s*\(device\(/i.test(s.text));
  if(!deviceStatement)throw new Error('Missing DEVICE DATA');
  const deviceKeys=[...deviceStatement.text.matchAll(/2H([A-Z]{2})/g)].map(m=>m[1]);
  if(deviceKeys.length!==K.KNDEV)throw new Error('DEVICE count disagreement');
  const assemblyText=(items:{file:string;line:number;text:string}[])=>items.map(item=>({...item,...locate(item.file,item.line)}));
  const statisticsText=variant==='compuserve'?assemblyText(statisticsMessages('updsta',read)):[];
  const commissionText=variant==='compuserve'?assemblyText(statisticsMessages('updcap',read)):[];
  const honorRollText=variant==='compuserve'?assemblyText(statisticsMessages('shosta',read)):[];
  if(variant==='austin'&&/^\s*(updsta|updcap|shosta):/m.test(read('WARMAC.MAC')))throw new Error('Unexpected Austin statistics entry');
  const terminalWords=table('ttydat',2),decwarText=decwarLiterals(read,variant==='austin'?0:6);
  decwarText.startup=decwarText.startup.map(item=>({...item,...locate(item.file,item.line)}));
  decwarText.fatal=decwarText.fatal.map(rows=>rows.map(item=>({...item,...locate(item.file,item.line)})));
  const data=fortranData(K,common.hiseg,read,{compileUnits:catalog.compileUnits,words:variant==='austin'?251:219}).map(d=>({...d,...locate(d.file,d.line)}));
  const map=read('DECWAR.MAP'),header=map.match(/Produced by LINK version ([^\r\n]+)/)?.[1];
  if(!header||!map.includes('[End of LINK map of'))throw new Error('Incomplete reference map');
  const timer=map.match(/\bTIMERS\s+([0-7]+)\s+Common\s+length\s+(\d+)\./);
  if(!timer||Number(timer[2])!==250)throw new Error('Missing or inconsistent TIMERS map allocation');
  return {id:variant,label:variant==='austin'?'Austin reconstruction':'CompuServe',
    evidence:{sourceRoot:catalog.directory,manifest:catalog.manifestPath,map:catalog.mapPath,mapSha256:createHash('sha256').update(map,'latin1').digest('hex'),linkHeader:header,
      roster:declaration('BLKDAT.FOR','names'),commands:declaration('BLKDAT.FOR','isaydo'),pregame:declaration('SETUP.FOR','precmd'),units,entryPoints},
    constants:K,ships,commands,pregame,messages,terminals:terminalWords.map(words=>words.join('').trim()),terminalWords,deviceKeys,extraHelpWords:table('xhelp',2),groupMasks:masks,
    assets:{help:catalog.document('DECWAR.HLP').file,news:catalog.document('DECWAR.NWS').file,
      initialization:variant==='austin'?{file:catalog.document('DECWAR.INI').file,text:read('DECWAR.INI')}:null},
    commonLayout:common,localLayout:local,queueLayout:queue,inputLayout:inputLayout(read),inputRuntimeLayout:inputRuntimeLayout(read),fileLayout:fileLayout(read),fortranDataWords:data,
    timers:{address:parseInt(timer[1],8),words:Number(timer[2]),file:catalog.mapPath,line:map.slice(0,timer.index).split('\n').length},
    outputTables:{shtdsp:outputTable('shtdsp',11,read),lngdsp:outputTable('lngdsp',11,read),shtshp:shortNames,lngshp:longNames,
      shtdev:outputTable('shtdev',9,read),meddev:outputTable('meddev',9,read),lngdev:outputTable('lngdev',9,read),shtcnd:outputTable('shtcnd',3,read),lngcnd:outputTable('lngcnd',3,read)},
    lockLayout:lockLayout(read),fileDescriptors:fileDescriptors(read,queue.words,variant==='austin'?'automatic':'experience'),characterBits:characterBits(read),
    statisticsText,commissionText,honorRollText,clearStatisticsText:assemblyText(statisticsMessages('stazap',read)),
    pregameIdentityLabel:{...pregameStatText(read),...locate('WARMAC.MAC',pregameStatText(read).line)},
    scanObjects:scanObjectTable(read).map(item=>({...item,...locate(item.file,item.line)})),romulanText:romulanTables(read,variant==='austin'),
    gripeText:assemblyText(gripeMessages(read)),helpText:assemblyText(textCommandMessages('help',read)),newsText:assemblyText(textCommandMessages('news',read)),
    restartBackup:restartBackupBytes(read),decwarText,debugText:assemblyText(debugMessages(read)),ascilSuffix:ascilSuffix(read),
  };
}
