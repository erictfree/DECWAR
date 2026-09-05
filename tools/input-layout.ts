import { sourceFile } from './source.ts';

// A public map symbol anchors the adjacent private input words. No preceding
// compiler/assembler allocation sizes need to be guessed.
export function inputLayout(read:(name:string)=>string=sourceFile) {
  const source = read('WARMAC.MAC'), lines = source.split('\n');
  const max = source.match(/^\s*maxcnt==\^D(\d+)/im);
  if (!max) throw new Error('Missing explicit decimal MAXCNT');
  const maximum = Number(max[1]), fields: Record<string, { offset:number; words:number; line:number }> = {};
  const start = lines.findIndex(line => /^ccflg\.::block\s+1\b/i.test(line));
  const expected = [['ccflgDot', /^ccflg\.::block\s+1\s*$/i, 1], ['bufptr', /^bufptr:\s*block\s+1\s*$/i, 1],
    ['chrcnt', /^chrcnt:\s*block\s+1\s*$/i, 1], ['linbuf', /^linbuf:\s*block\s+maxcnt\+1\s*$/i, maximum+1]] as const;
  let offset = 0;
  for (const [i, [name, pattern, words]] of expected.entries()) {
    if (start < 0 || !pattern.test(lines[start+i].split(';')[0].trim())) throw new Error('Input allocation disagreement');
    fields[name] = { offset, words, line:start+i+1 }; offset += words;
  }
  const map = read('DECWAR.MAP').split('\n'), pattern = /\bCCFLG\.\s+([0-7]+)\s+Global\s+Relocatable/;
  const mapLine = map.findIndex(line => pattern.test(line)), match = map[mapLine]?.match(pattern);
  if (!match) throw new Error('Missing CCFLG. map anchor');
  return { file:'WARMAC.MAC', address:parseInt(match[1],8), mapLine:mapLine+1, maximum, words:offset, fields };
}
