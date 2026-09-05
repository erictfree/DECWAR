import { sourceFile, statements } from './source.ts';

export type LocatedStatement = { file: string; line: number; text: string };
export function splitDeclarations(text: string): string[] {
  let depth = 0, start = 0; const parts: string[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '(') depth++; if (text[i] === ')') depth--;
    if (text[i] === ',' && depth === 0) { parts.push(text.slice(start, i).trim()); start = i + 1; }
  }
  parts.push(text.slice(start).trim()); return parts;
}

// Follow the selected routine's includes before resolving implicit types.
// This is declaration extraction for this archive, not expression compilation.
export function declarationScope(file: string, routine?: string) {
  const selected = statements(sourceFile(file));
  const start = routine ? selected.findIndex(s => new RegExp('^subroutine\\s+' + routine + '(?:\\b|\\s*\\()', 'i').test(s.text)) : 0;
  if (start < 0) throw new Error('Missing FORTRAN routine ' + routine);
  const end = selected.findIndex((s, i) => i >= start && /^end$/i.test(s.text));
  function expand(file: string, input: typeof selected, stack: string[]): LocatedStatement[] {
    if (stack.includes(file)) throw new Error('Recursive FORTRAN include ' + file);
    return input.flatMap(s => {
      const include = s.text.match(/^include\s+'(\w+)(?:\/nolist)?'$/i);
      if (!include) return [{ ...s, file }];
      const child = include[1].toUpperCase() + '.FOR';
      return expand(child, statements(sourceFile(child)), [...stack, file]);
    });
  }
  const expanded = expand(file, selected.slice(start, end < 0 ? undefined : end), []);
  type Origin = { type: string; file: string; line: number };
  const implicit = new Map<string, Origin>(), explicit = new Map<string, Origin>();
  for (const s of expanded) {
    const rule = s.text.match(/^implicit\s+(integer|real|logical)\s*\(([a-z])-([a-z])\)$/i);
    if (rule) {
      for (let c = rule[2].toLowerCase().charCodeAt(0); c <= rule[3].toLowerCase().charCodeAt(0); c++)
        implicit.set(String.fromCharCode(c), { type: 'implicit-' + rule[1].toLowerCase(), file: s.file, line: s.line });
      continue;
    }
    if (/^implicit\b/i.test(s.text)) throw new Error('Unsupported implicit declaration ' + s.text);
    const declaration = s.text.match(/^(integer|real|logical)\s+(.+)$/i);
    if (!declaration) continue;
    for (const name of splitDeclarations(declaration[2])) {
      const variable = name.match(/^(\w+)(?:\([^)]*\))?$/);
      if (!variable) throw new Error('Unsupported FORTRAN type declaration ' + name);
      explicit.set(variable[1].toLowerCase(), { type: declaration[1].toLowerCase(), file: s.file, line: s.line });
    }
  }
  return { statements: expanded, type(name: string): Origin {
    name = name.toLowerCase(); const resolved = explicit.get(name) ?? implicit.get(name[0]);
    // Every selected scope uses PARAM's explicit implicit rule. Do not silently
    // assume the language default when that required evidence is absent.
    if (!resolved) throw new Error('Unresolved FORTRAN declaration type ' + name);
    return resolved;
  } };
}
