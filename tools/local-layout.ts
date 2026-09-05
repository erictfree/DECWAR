import { sourceFile } from './source.ts';
import { declarationScope, splitDeclarations } from './fortran-scope.ts';

const views = {
  local: ['LOW.FOR', 'LOW', 'local'], list: ['LSTSCN.FOR', 'LSTSCN', 'local'],
  scan: ['SCAN.FOR', 'SCAN', 'local'], identity: ['SETUP.FOR', 'SETUP', 'local'],
  users: ['USERS.FOR', 'USERS', 'local'], points: ['POINTS.FOR', 'POINTS', 'polocl'],
  total: ['DECWAR.FOR', '', 'polocl'], check: ['CHECK.FOR', 'CHECK', 'chkout'],
  moveCheck: ['MOVE.FOR', 'MOVE', 'chkout'], torpedoCheck: ['TORP.FOR', 'TORP', 'chkout'],
  distance: ['DIST.FOR', 'DIST', 'distlc'], savedShip: ['FREE.FOR', 'FREE', 'frlocl'],
  message: ['OUTMSG.FOR', 'OUTMSG', 'omlocl'], supernova: ['SNOVA.FOR', 'SNOVA', 'snlocl'],
  torpedo: ['TORP.FOR', 'TORP', 'tolocl'],
} as const;
type Field = { offset: number; words: number; dimensions: { lower: number; length: number }[];
  type: string; typeSource: { file: string; line: number }; file: string; line: number };
export type LocalLayout = { block: string; file: string; routine: string; address: number;
  words: number; declaredWords: number; mapLine: number; fields: Record<string, Field> };

export function localLayouts(constants: Record<string, number | string>): Record<keyof typeof views, LocalLayout> {
  const map = sourceFile('DECWAR.MAP').split('\n');
  const result = {} as Record<keyof typeof views, LocalLayout>;
  const number = (text: string): number => {
    const n = /^\d+$/.test(text) ? Number(text) : constants[text.toUpperCase()];
    if (typeof n !== 'number') throw new Error('Unknown local dimension ' + text); return n;
  };
  for (const key of Object.keys(views) as (keyof typeof views)[]) {
    const [file, routine, block] = views[key], scope = declarationScope(file, routine || undefined);
    const fields: Record<string, Field> = {}; let offset = 0;
    for (const s of scope.statements) {
      const common = s.text.match(new RegExp('^common\\s*/' + block + '/\\s*(.+)$', 'i')); if (!common) continue;
      for (const entry of splitDeclarations(common[1])) {
        const m = entry.match(/^(\w+)(?:\(([^)]+)\))?$/); if (!m) throw new Error('Unsupported local declaration ' + entry);
        const name = m[1].toLowerCase(), dimensions = m[2] ? splitDeclarations(m[2]).map(d => {
          const parts = d.split(':').map(p => number(p.trim()));
          const lower = parts.length === 2 ? parts[0] : 1;
          return { lower, length: parts.at(-1)! - lower + 1 };
        }) : [];
        const type = scope.type(name), words = dimensions.reduce((n, d) => n * d.length, 1);
        if (fields[name]) throw new Error('Duplicate local word ' + name);
        fields[name] = { offset, words, dimensions, type: type.type, typeSource: { file: type.file, line: type.line }, file: s.file, line: s.line };
        offset += words;
      }
    }
    const re = new RegExp('\\b' + block + '\\s+([0-7]+)\\s+Common\\s+length\\s+(\\d+)\\.', 'i');
    const mapLine = map.findIndex(line => re.test(line)), match = map[mapLine]?.match(re);
    if (!offset || !match || offset > Number(match[2]) || (block !== 'local' && block !== 'polocl' && offset !== Number(match[2])))
      throw new Error('Local layout/map disagreement: ' + key);
    result[key] = { block, file, routine, address: parseInt(match[1], 8), words: Number(match[2]), declaredWords: offset,
      mapLine: mapLine + 1, fields };
  }
  return result;
}
