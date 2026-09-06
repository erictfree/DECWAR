/** Check references in the book's EBNF; this does not validate game semantics. */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

type Production = { name: string; file: string; body: string };

export function checkGrammar(chapters: Map<string, string>, vocabulary: string): {
  productions: number; terminals: number;
} {
  // Terminal categories are explicitly defined in GRAM-1, before GRAM-2.
  const notation = vocabulary.split('## GRAM-2')[0];
  const terminals = new Set([...notation.matchAll(/^\| `([A-Za-z][\w-]*)` \|/gm)]
    .map(match => match[1]));
  const productions = new Map<string, Production>();
  for (const [file, text] of chapters) {
    for (const block of text.matchAll(/```[^\n]*\n([\s\S]*?)```/g)) {
      let current: Production | undefined;
      for (const line of block[1].split('\n')) {
        const definition = /^([A-Za-z][\w-]*)\s*::=\s*(.*)$/.exec(line);
        if (definition) {
          const name = definition[1];
          if (productions.has(name) || terminals.has(name))
            throw new Error(`Duplicate grammar definition: ${name} in ${file}`);
          current = { name, file, body: definition[2] };
          productions.set(name, current);
        } else if (!line.trim()) {
          current = undefined;
        } else if (current) {
          if (!/^\s/.test(line))
            throw new Error(`Unseparated grammar continuation in ${file}: ${line}`);
          current.body += '\n' + line;
        }
      }
    }
  }
  if (!productions.size || !terminals.size)
    throw new Error('Missing EBNF productions or declared terminal categories');

  for (const production of productions.values()) {
    // Quotes contain terminals; an unquoted semicolon begins an annotation.
    const body = production.body.split('\n').map(line =>
      line.replace(/"[^"\n]*"/g, '').split(';')[0]).join('\n');
    for (const name of body.match(/[A-Za-z][\w-]*/g) ?? []) {
      if (!productions.has(name) && !terminals.has(name))
        throw new Error(`Undefined grammar name ${name} in ${production.file}:${production.name}`);
    }
    const stack: string[] = [];
    for (const char of body) {
      if ('([{'.includes(char)) stack.push(char);
      else if (')]}'.includes(char)) {
        if (stack.pop() !== ({ ')': '(', ']': '[', '}': '{' } as Record<string, string>)[char])
          throw new Error(`Unbalanced EBNF grouping in ${production.file}:${production.name}`);
      }
    }
    if (stack.length) throw new Error(`Unclosed EBNF grouping in ${production.file}:${production.name}`);
  }
  return { productions: productions.size, terminals: terminals.size };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const spec = resolve(root, 'docs/spec');
  const book = JSON.parse(readFileSync(resolve(spec, 'book.json'), 'utf8'));
  const chapters = new Map<string, string>([...book.chapters, ...book.appendices]
    .map((file: string) => [file, readFileSync(resolve(spec, file), 'utf8')]));
  const result = checkGrammar(chapters, chapters.get('grammar.md')!);
  console.log(`Checked ${result.productions} EBNF productions and ${result.terminals} terminal categories for defined references and balanced grouping.`);
}
