import { lockLayout } from './lock-layout.ts';
import { fileDescriptors } from './file-descriptors.ts';
import { fileLayout } from './file-layout.ts';
import { inputRuntimeLayout } from './input-runtime-layout.ts';
import { characterBits } from './character-bits.ts';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { debugMessages, decwarLiterals, gripeMessages, messageCatalog, outputTable, pregameStatText, restartBackupBytes, romulanTables, scanObjectTable, sourceFile, sourceRoot, statements, statisticsMessages, stringTable, textCommandMessages } from './source.ts';

import { commonLayouts } from './common.ts';
import { fortranData } from './data.ts';
import { queueLayout } from './queue-layout.ts';
import { localLayouts } from './local-layout.ts';
import { inputLayout } from './input-layout.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const checking = process.argv.includes('--check');
function artifact(path: string, value: string): void {
  const target = root + path;
  if (checking) {
    let existing = '';
    try { existing = readFileSync(target, 'utf8'); } catch {}
    if (existing !== value) throw new Error(`${path} differs: source or generated data changed; review before regenerating`);
  } else {
    mkdirSync(target.slice(0, target.lastIndexOf('/')), { recursive: true });
    writeFileSync(target, value);
  }
}
const files = readdirSync(sourceRoot).filter(name => !name.startsWith('.')).sort();
const compileUnits = sourceFile('DECCMP.CMD').trim().split(/[\s,]+/).map(name => name.toUpperCase());
const routines: { file: string; line: number; name: string; kind: string; calls: string[] }[] = [];
const inventory = files.map(file => {
  const bytes = readFileSync(sourceRoot + file);
  const text = bytes.toString('latin1');
  if (file.endsWith('.FOR')) {
    let current: typeof routines[number] | undefined;
    for (const statement of statements(text)) {
      const found = statement.text.match(/^(program|subroutine|function|entry)\s+(\w+)/i);
      if (found) {
        current = { file, line: statement.line, name: found[2].toUpperCase(), kind: found[1].toLowerCase(), calls: [] };
        routines.push(current);
      }
      if (current) for (const match of statement.text.matchAll(/\bcall\s+(\w+)/gi)) {
        if (!current.calls.includes(match[1].toUpperCase())) current.calls.push(match[1].toUpperCase());
      }
    }
  }
  const sections = file.endsWith('.MAC') ? text.split('\n').flatMap((line, index) => {
    const match = line.match(/\bsubttl\s+(.+)/i);
    return match && !/^;/.test(line) ? [{ line: index + 1, title: match[1].trim() }] : [];
  }) : [];
  const entries = file.endsWith('.MAC') ? text.split('\n').flatMap((line, index) => {
    const match = line.match(/^\s*entry\s+([^;\r]+)/i);
    return match ? [{ line: index + 1, symbols: match[1].trim().toUpperCase() }] : [];
  }) : [];
  return {
    file, bytes: bytes.length,
    lines: text.split('\n').length - (text.endsWith('\n') ? 1 : 0),
    sha256: createHash('sha256').update(bytes).digest('hex'),
    compiled: compileUnits.includes(file.replace(/\.(FOR|MAC)$/, '')) && /\.(FOR|MAC)$/.test(file),
    sections, entries,
  };
});
const constants: Record<string, number | string> = {};
for (const statement of statements(sourceFile('PARAM.FOR'))) {
  const match = statement.text.match(/^parameter\s+(\w+)\s*=\s*(.+)$/i);
  if (!match) continue;
  const value = match[2].trim();
  if (/^-?\d+$/.test(value)) constants[match[1].toUpperCase()] = Number(value);
  else if (/^"[0-7]+$/.test(value)) constants[match[1].toUpperCase()] = parseInt(value.slice(1), 8);
  else if (/^'.*'$/.test(value)) constants[match[1].toUpperCase()] = value.slice(1, -1);
  else throw new Error(`Unparsed PARAM at line ${statement.line}: ${value}`);
}
const layouts = commonLayouts(constants);
artifact('src/generated/file-descriptors.ts', '// Generated from WARMAC descriptors/DECINI and linked queue span.\nexport const fileDescriptors = ' + JSON.stringify(fileDescriptors(), null, 2) + ' as const;\n');
artifact('src/generated/lock-layout.ts', '// Generated from WARMAC lock state between checked I/O and STABUF anchors.\nexport const lockLayout = ' + JSON.stringify(lockLayout(), null, 2) + ' as const;\n');
artifact('src/generated/file-layout.ts', '// Generated from WARMAC file state and STABUF map anchor.\nexport const fileLayout = ' + JSON.stringify(fileLayout(), null, 2) + ' as const;\n');
artifact('src/generated/input-runtime-layout.ts', '// Generated from WARMAC I/O state and the CCFLG. link-map anchor.\nexport const inputRuntimeLayout = ' + JSON.stringify(inputRuntimeLayout(), null, 2) + ' as const;\n');
artifact('src/generated/input-layout.ts', '// Generated from WARMAC input declarations and DECWAR.MAP CCFLG.\nexport const inputLayout = ' + JSON.stringify(inputLayout(), null, 2) + ' as const;\n');
artifact('src/generated/local-layout.ts', '// Generated from scoped FORTRAN COMMON declarations and DECWAR.MAP.\nexport const localLayout = ' + JSON.stringify(localLayouts(constants), null, 2) + ' as const;\n');
artifact('src/generated/queue-layout.ts', '// Generated from WARMAC BLOCK declarations and DECWAR.MAP.\nexport const queueLayout = ' + JSON.stringify(queueLayout(), null, 2) + ' as const;\n');
artifact('src/generated/fortran-data.ts', '// Generated from DATA statements in the selected FORTRAN compile units.\nexport const fortranDataWords = ' + JSON.stringify(fortranData(constants, layouts.hiseg), null, 2) + ' as const;\n');
artifact('src/generated/common-layout.ts', '// Generated from HISEG/LOWSEG, checked against WARMAC and DECWAR.MAP.\nexport const commonLayout = ' + JSON.stringify(layouts, null, 2) + ' as const;\n');
const commands = stringTable('BLKDAT.FOR', 'isaydo', 2).map((words, i) => ({ id: i + 1, words, name: words.join('').trim() }));
const pregame = stringTable('SETUP.FOR', 'precmd', 2).map((words, i) => ({ id: i + 1, words, name: words.join('').trim() }));
const ships = stringTable('BLKDAT.FOR', 'names', 3).map((words, i) => ({ id: i + 1, name: words.slice(0, 2).join('').trim(), symbol: words[2] }));
const terminals = stringTable('BLKDAT.FOR', 'ttydat', 2).map(words => words.join('').trim());
const terminalWords = stringTable('BLKDAT.FOR', 'ttydat', 2);
const extraHelpWords = stringTable('BLKDAT.FOR', 'xhelp', 2);
const deviceStatement = statements(sourceFile('BLKDAT.FOR')).find(s => /^data\s*\(device\(/i.test(s.text));
if (!deviceStatement) throw new Error('Missing DEVICE DATA');
const deviceKeys = [...deviceStatement.text.matchAll(/2H([A-Z]{2})/g)].map(m => m[1]);
if (deviceKeys.length !== constants.KNDEV) throw new Error('Unexpected device keys');
const outputTables = {
  shtdsp: outputTable('shtdsp', 11), lngdsp: outputTable('lngdsp', 11),
  shtshp: outputTable('shtshp', 10), lngshp: outputTable('lngshp', 10),
  shtdev: outputTable('shtdev', 9), meddev: outputTable('meddev', 9), lngdev: outputTable('lngdev', 9),
  shtcnd: outputTable('shtcnd', 3), lngcnd: outputTable('lngcnd', 3),
};
const messages = messageCatalog();
const statisticsText = statisticsMessages();
const commissionText = statisticsMessages('updcap');
const honorRollText = statisticsMessages('shosta');
const clearStatisticsText = statisticsMessages('stazap');
const pregameIdentityLabel = pregameStatText();
const scanObjects = scanObjectTable();
const romulanText = romulanTables();
const gripeText = gripeMessages();
const helpText = textCommandMessages('help'), newsText = textCommandMessages('news');
const restartBackup = restartBackupBytes();
const decwarText = decwarLiterals();
const debugText = debugMessages();
artifact('docs/source-manifest.json', JSON.stringify({ baseline: 'Supplied archive; DECCMP.CMD and CAN1.CMD', inventory, routines }, null, 2) + '\n');
artifact('src/generated/source-data.ts', '// Generated from the local archive by tools/audit.ts. Do not hand-edit.\n' +
  Object.entries({ constants, commands, pregame, ships, terminals, terminalWords, extraHelpWords, deviceKeys, outputTables, messages, statisticsText, commissionText, honorRollText, clearStatisticsText, pregameIdentityLabel, scanObjects, romulanText, gripeText, helpText, newsText, restartBackup, decwarText, debugText }).map(([key, value]) => `export const ${key} = ${JSON.stringify(value, null, 2)} as const;\n`).join('\n'));
const totalLines = inventory.reduce((sum, file) => sum + file.lines, 0);
artifact('docs/source-index.md', `# Local source index\n\nGenerated from ${files.length} files (${totalLines.toLocaleString('en-US')} lines). This is a navigational inventory, not a claim of semantic review.\n\n` +
  `Baseline build: DECCMP.CMD / CAN1.CMD. Only files marked **yes** are direct compile units. Includes still contribute to the executable. Direct CALL lists are lexical aids: they exclude function references, do not resolve ENTRY control flow, and do not evaluate conditional compilation.\n\n` +
  '| File | Lines | Compile unit |\n|---|---:|---|\n' + inventory.map(file => `| [${file.file}](../old_source/fortran%201978/${file.file}) | ${file.lines} | ${file.compiled ? '**yes**' : ''} |`).join('\n') +
  '\n\n## FORTRAN routines and entries\n\n| Routine | Source | Kind | Direct CALL mentions following declaration |\n|---|---|---|---|\n' +
  routines.map(r => `| ${r.name} | ${r.file}:${r.line} | ${r.kind} | ${r.calls.join(', ')} |`).join('\n') +
  '\n\n## Assembly sections\n\n' + inventory.filter(file => file.sections.length).map(file => `### ${file.file}\n\n` + file.sections.map(section => `- Line ${section.line}: ${section.title}`).join('\n')).join('\n\n') + '\n');

artifact('src/generated/character-bits.ts', '// Generated from WARMAC FLGBIT and CBITS.\nexport const characterBits = ' + JSON.stringify(characterBits(), null, 2) + ' as const;\n');

console.log(`${checking ? 'Verified' : 'Generated'} ${files.length} file hashes, ${routines.length} FORTRAN declarations, ${commands.length} game commands, ${pregame.length} pre-game commands, ${Object.keys(messages).length} ASCIZ strings.`);
