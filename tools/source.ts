import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const sourceRoot = fileURLToPath(new URL('../legacy/compuserve/fortran 1978/', import.meta.url));
export function sourceFile(name: string): string { return readFileSync(sourceRoot + name, 'latin1'); }
export type Statement = { line: number; text: string };

// Archive-specific statement reader, not a general FORTRAN compiler.
// Preserve source locations; skip D lines (debug build is not selected here).
export function statements(source: string): Statement[] {
  const result: Statement[] = [];
  for (const [index, physical] of source.split('\n').entries()) {
    const line = physical.replace(/\r$/, '').replace(/^\f/, '');
    if (!line.trim() || /^[cCdD*!/]/.test(line)) continue;
    const continuation = /^ {5}[^ 0]/.test(line);
    const code = continuation ? line.slice(6) : line.replace(/^\s*\d+\s+/, '').trimStart();
    let text = '', quoted = false;
    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      if (char === "'") {
        if (quoted && code[i + 1] === "'") { text += "''"; i++; continue; }
        quoted = !quoted;
      }
      if (char === '!' && !quoted) break;
      text += char;
    }
    if (!text.trim()) continue;
    if (continuation && result.length) result[result.length - 1].text += ' ' + text.trim();
    else result.push({ line: index + 1, text: text.trim() });
  }
  return result;
}

export function stringTable(file: string, array: string, words: number, read: (name:string)=>string = sourceFile): string[][] {
  const statement = statements(read(file)).find(item => new RegExp('^data\\s*\\(\\(' + array + '\\(', 'i').test(item.text));
  if (!statement) throw new Error(`Missing DATA table ${array} in ${file}`);
  const literals = [...statement.text.matchAll(/'((?:[^']|'')*)'/g)].map(match => match[1].replaceAll("''", "'"));
  if (literals.length % words !== 0) throw new Error(`Invalid DATA table ${array}`);
  return Array.from({ length: literals.length / words }, (_, index) => literals.slice(index * words, (index + 1) * words));
}

export function messageCatalog(read: (name:string)=>string = sourceFile): Record<string, { text: string; file: string; line: number }> {
  const result: Record<string, { text: string; file: string; line: number }> = {};
  for (const file of ['MSG.MAC', 'SETMSG.MAC']) {
    const source = read(file);
    const matcher = /^([a-z0-9]+)::\s*asciz\s+([^\s])/gim;
    let match: RegExpExecArray | null;
    while ((match = matcher.exec(source))) {
      const end = source.indexOf(match[2], matcher.lastIndex);
      if (end < 0) throw new Error(`Unterminated ASCIZ at ${file}:${match.index}`);
      const symbol = match[1].toLowerCase();
      if (result[symbol]) throw new Error(`Duplicate ASCIZ symbol ${symbol}`);
      result[symbol] = { text: source.slice(matcher.lastIndex, end), file, line: source.slice(0, match.index).split('\n').length };
      matcher.lastIndex = end + 1;
    }
  }
  return result;
}

// Scoped extraction of UPDSTA/UPDCAP anonymous OUTSTR literals. This is not a
// general MACRO parser; count and instruction context are checked explicitly.
export function statisticsMessages(entry: 'updsta' | 'updcap' | 'shosta' | 'stazap' = 'updsta', read: (name:string)=>string = sourceFile): { text: string; file: string; line: number }[] {
  const file = 'WARMAC.MAC', source = read(file);
  const start = source.indexOf('\n' + entry + ':');
  const end = source.indexOf(entry === 'updsta' ? '\nshosta:' : entry === 'updcap' ? '\n;ALL commented'
    : entry === 'shosta' ? '\naprtrp:' : '\nromspk:', start);
  if (start < 0 || end < 0) throw new Error(`Missing ${entry} section`);
  // Keep newlines in commented lines so positions still refer to archive lines.
  const section = source.slice(start, end).replace(/^;[^\r\n]*/gm, m => ' '.repeat(m.length));
  const pattern = entry === 'shosta' ? /movei\s+p1,\[asciz\s*"([^"]*)"\]/gi : /outstr\s*\[asciz\s*"([^"]*)"\]/gi;
  const result = [...section.matchAll(pattern)].map(match => ({
    text: match[1], file, line: source.slice(0, start + match.index).split('\n').length,
  }));
  const count = entry === 'updsta' ? 10 : entry === 'shosta' ? 11 : 3;
  if (result.length !== count) throw new Error(`Expected ${count} ${entry} strings, found ${result.length}`);
  return result;
}

export function pregameStatText(read: (name:string)=>string = sourceFile): { text: string; file: string; line: number } {
  const file = 'WARMAC.MAC', source = read(file), start = source.indexOf('\nstat.y:');
  const match = /movei\s+p1,\[asciz\s*\/([^/]*)\/\]/i.exec(source.slice(start));
  if (start < 0 || !match) throw new Error('Missing STAT.Y pre-game label');
  return { text: match[1], file, line: source.slice(0, start + match.index).split('\n').length };
}

export function debugMessages(read: (name:string)=>string = sourceFile): { text: string; file: string; line: number }[] {
  const file = 'WARMAC.MAC', source = read(file), start = source.indexOf('\ndebug:');
  const end = source.indexOf('\n\f\tsubttl\tEQUAL', start);
  if (start < 0 || end < 0) throw new Error('Missing DEBUG section');
  const result = [...source.slice(start, end).matchAll(/outstr\s*\[asciz\s*"([^"]*)"\]/gi)].map(match => ({
    text: match[1], file, line: source.slice(0, start + match.index).split('\n').length,
  }));
  if (result.length !== 2) throw new Error('Expected two DEBUG OUTSTR strings');
  return result;
}

export function scanObjectTable(read: (name:string)=>string = sourceFile): { text: string | null; file: string; line: number }[] {
  const file = 'WARMAC.MAC', source = read(file);
  const end = source.indexOf('\ngetshp:'), marker = source.indexOf('\nobjtbl:');
  const start = source.lastIndexOf('\n\tdmove', marker);
  if (start < 0 || marker < 0 || end < marker) throw new Error('Missing SCAN object table');
  const section = source.slice(start, end);
  const rows = [...section.matchAll(/(?:dmove\s+t1,\[exp "(.)","(.)"\]|pushj\s+p,getshp)/g)].map(match => ({
    text: match[1] === undefined ? null : match[1] + match[2], file,
    line: source.slice(0, start + match.index).split('\n').length,
  }));
  if (rows.length !== 12 || rows[2].text !== null || rows[3].text !== null) throw new Error('Unexpected SCAN object table');
  return rows;
}

// ROMSPK's anonymous ASCIZ tables in physical order, plus NODNAM. Restrict
// extraction to this section and verify each table's source-sized row count.
export function romulanTables(read: (name:string)=>string = sourceFile, broadcastOnly=false) {
  const file = 'WARMAC.MAC', source = read(file), start = source.indexOf('\nromspk:');
  const nodes = broadcastOnly ? source.indexOf('\nrmcopy:', start) : source.indexOf('\nnodnam:', start), end = broadcastOnly ? nodes : source.indexOf('\n\t0\t', nodes);
  if (start < 0 || nodes < 0 || end < 0) throw new Error('Missing ROMSPK tables');
  const strings = [...source.slice(start, nodes).matchAll(/asciz\s+"([^"]*)"/gi)].map(m => ({
    text: m[1], file, line: source.slice(0, start + m.index).split('\n').length,
  }));
  if (strings.length !== (broadcastOnly ? 21 : 29)) throw new Error('Unexpected ROMSPK text tables');
  const nodeNames = [...source.slice(nodes, end).matchAll(/'([A-Z]{3})',,\[asciz "([^"]*)"\]/g)].map(m => ({
    node: m[1], text: m[2], file, line: source.slice(0, nodes + m.index).split('\n').length,
  }));
  if (nodeNames.length !== (broadcastOnly ? 0 : 46)) throw new Error('Unexpected NODNAM size');
  const masks = [...source.slice(start, nodes).matchAll(/\b([0-7]{6})\s*; (?:all|humans|klingons)/g)].map(m => parseInt(m[1], 8));
  if (masks.length !== 3) throw new Error('Unexpected ROMSPK population masks');
  return { masks, broadcast: strings.slice(0, 4), single: strings.slice(4, 8), adjectives: strings.slice(8, 13),
    populations: strings.slice(13, 16), objects: strings.slice(16, 21), specialNodes: strings.slice(21, 23),
    teams: strings.slice(23, 25), generic: strings.slice(25, 29), nodes: nodeNames };
}

export function ascilSuffix(read: (name:string)=>string = sourceFile):string {
  const body=read('WARMAC.MAC').match(/define ascil \(txt\), <([\s\S]*?)\r?\n[ \t]*>/)?.[1];
  if(body===undefined)throw new Error('Missing ASCIL macro');
  if(/^\s*asciz `txt`\s*$/.test(body))return '';
  if(/^\s*asciz `txt\r\n`\s*$/.test(body))return '\r\n';
  throw new Error('Unrecognized ASCIL expansion');
}

export function gripeMessages(read: (name:string)=>string = sourceFile) {
  const file = 'WARMAC.MAC', source = read(file), start = source.indexOf('\ngripe:'), end = source.indexOf('\nhelp:', start);
  if (start < 0 || end < 0) throw new Error('Missing GRIPE section');
  const rows = [...source.slice(start, end).matchAll(/asciz\s+"([^"]*)"|asciz\s+\/([^/]*)\/|ascil\s+<([^>]*)>|warn\s+<([^>]*)>/gi)].map(m => ({
    text: m[1] ?? m[2] ?? (m[3] !== undefined ? m[3] + ascilSuffix(read) : '%' + m[4] + ascilSuffix(read)),
    file, line: source.slice(0, start + m.index).split('\n').length,
  }));
  if (rows.length !== 15) throw new Error('Unexpected GRIPE strings');
  return rows;
}

export function textCommandMessages(kind: 'help' | 'news', read: (name:string)=>string = sourceFile) {
  const file = 'WARMAC.MAC', source = read(file), start = source.indexOf('\n' + kind + ':');
  const end = source.indexOf(kind === 'help' ? '\neshp.:' : '\ngripe:', start);
  if (start < 0 || end < 0) throw new Error('Missing text command section');
  const rows = [...source.slice(start, end).matchAll(/asciz\s+"([^"]*)"|asciz\s+\/([^/]*)\/|ascil\s+<([^>]*)>|warn\s+<([^>]*)>/gi)].map(m => ({
    text: m[1] ?? m[2] ?? (m[3] !== undefined ? m[3] + ascilSuffix(read) : '%' + m[4] + ascilSuffix(read)),
    file, line: source.slice(0, start + m.index).split('\n').length,
  }));
  if (rows.length !== (kind === 'help' ? 10 : 3)) throw new Error('Unexpected text command strings');
  return rows;
}

export function restartBackupBytes(read: (name:string)=>string = sourceFile) {
  const file = 'SETMSG.MAC', source = read(file), match = /^backup::byte \(7\) ([0-7,]+)\r?$/m.exec(source);
  if (!match) throw new Error('Missing BACKUP byte directive');
  const bytes = match[1].split(',').map(s => parseInt(s, 8));
  if (bytes.length !== 10) throw new Error('Unexpected BACKUP byte count');
  return { bytes, file, line: source.slice(0, match.index).split('\n').length };
}

// Only the named output tables below are interpreted. Retain indirections as
// null rather than pretending they are ASCIZ text or evaluating arbitrary MACRO.
export function outputTable(name: string, count: number, read: (name:string)=>string = sourceFile): { text: string | null; line: number }[] {
  const source = read('WARMAC.MAC');
  const marker = new RegExp('^' + name + ':', 'm').exec(source);
  if (!marker) throw new Error(`Missing WARMAC table ${name}`);
  const start = marker.index + marker[0].length;
  const rest = source.slice(start);
  const end = rest.search(/^[a-z][a-z0-9.]*:|^[ \t]*subttl\b|\f/im);
  if (end < 0) throw new Error(`Missing end of WARMAC table ${name}`);
  let lineNumber = source.slice(0, start).split('\n').length;
  const result: { text: string | null; line: number }[] = [];
  for (const line of rest.slice(0, end).split('\n')) {
    if (line.trim() && !line.trimStart().startsWith(';')) {
      const literal = line.match(/asciz\s+\/([^/]*)\//i);
      if (literal) result.push({ text: literal[1], line: lineNumber });
      else if (/^\s*@?(shtshp|lngshp)-1\(t2\)/i.test(line)) result.push({ text: null, line: lineNumber });
      else throw new Error(`Unparsed ${name} entry at WARMAC.MAC:${lineNumber}`);
    }
    lineNumber++;
  }
  if (result.length !== count) throw new Error(`${name}: expected ${count} entries, found ${result.length}`);
  return result;
}

// Literal spelling and physical locations only. These FORTRAN OUT arguments
// still need the compiler's padding/termination contract at runtime.
export function decwarLiterals(read: (name:string)=>string = sourceFile, startupCount=6) {
  const file = 'DECWAR.FOR', source = read(file), rows = source.split('\n');
  const calls = statements(source).flatMap(statement => {
    const match = statement.text.match(/^call\s+out\s*\(\s*'((?:[^']|'')*)'\s*,\s*([01])\s*\)$/i);
    return match ? [{ file, line: statement.line, text: match[1].replaceAll("''", "'"), newline: Number(match[2]) }] : [];
  });
  const startup = calls.filter(s => s.line < 43);
  const starts = [5001, 5002, 5003, 5004, 5005].map(label => {
    const i = rows.findIndex(row => new RegExp('^\\s*' + label + '\\s+call').test(row));
    if (i < 0) throw new Error(`Missing DECWAR fatal label ${label}`);
    return i + 1;
  });
  const end = rows.findIndex(row => /^\s*3810\s+continue/i.test(row)) + 1;
  if (end === 0) throw new Error('Missing DECWAR fatal cleanup label');
  const fatal = starts.map((start, i) => calls.filter(s => s.line >= start && s.line < (starts[i + 1] ?? end)));
  if (startup.length !== startupCount || fatal.some((group, i) => group.length !== [4, 6, 4, 8, 5][i])) throw new Error('DECWAR literal catalog changed');
  return { startup, fatal };
}
