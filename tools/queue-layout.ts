import { sourceFile } from './source.ts';

// WARMAC's initial high-segment BLOCK span, not a general MACRO assembler.
// The supplied link map relocates this module; anonymous headers occupy words.
export function queueLayout(read:(name:string)=>string=sourceFile, expectedWords=2590) {
  const lines = read('WARMAC.MAC').split('\n');
  const constants: Record<string, number> = {};
  let radix = 8;
  function evaluate(expression: string): number {
    return expression.trim().toLowerCase().split('*').reduce((product, part) => {
      const value = /^\^d\d+$/.test(part) ? Number(part.slice(2))
        : /^\d+$/.test(part) ? parseInt(part, radix) : constants[part];
      if (!Number.isSafeInteger(value)) throw new Error('Unresolved queue expression: ' + expression);
      return product * value;
    }, 1);
  }
  const expected = ['jsqtim', 'jsqtab', 'hitser', 'hitHeader', 'hitql', 'hitq', 'messageHeader', 'msgql', 'msgq'];
  const fields: Record<string, { offset: number; words: number; line: number }> = {};
  let active = false, index = 0, offset = 0;
  for (const [i, raw] of lines.entries()) {
    const line = raw.split(';')[0].trim().toLowerCase();
    const r = line.match(/^radix\s+(\d+)$/); if (r) radix = Number(r[1]);
    const c = line.match(/^(knmsg|msglen|knhshp|knhit)==(.+)$/);
    if (c) constants[c[1]] = evaluate(c[2]);
    if (/^reloc\s+400000$/.test(line)) { active = true; continue; }
    if (!active || line === '') continue;
    const block = line.match(/^(?:(\w+):\s*)?block\s+(.+)$/);
    const name = expected[index];
    if (!block || !name || (block[1] ?? name) !== name || (!block[1] && !name.endsWith('Header')))
      throw new Error('Unexpected queue storage declaration at WARMAC.MAC:' + (i + 1));
    const words = evaluate(block[2]);
    fields[name] = { offset, words, line: i + 1 }; offset += words; index++;
    if (index === expected.length) break;
  }
  if (index !== expected.length || offset !== expectedWords) throw new Error('Incomplete queue storage extraction');
  const map = read('DECWAR.MAP').split('\n');
  const moduleLine = map.findIndex(line => /^WARMAC\s+from/.test(line));
  const mapLine = map.findIndex((line, i) => i > moduleLine && /High segment starts at/.test(line));
  const match = map[mapLine]?.match(/starts at\s+([0-7]+)/);
  if (moduleLine < 0 || !match) throw new Error('Missing WARMAC linked high-segment base');
  return { file: 'WARMAC.MAC', address: parseInt(match[1], 8), mapLine: mapLine + 1,
    words: offset, constants, fields };
}
