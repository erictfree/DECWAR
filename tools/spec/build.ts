/** Assemble the specification through Pandoc's AST, resolving chapter links. */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const source = resolve(root, 'docs/spec');
const book = JSON.parse(readFileSync(resolve(source, 'book.json'), 'utf8'));
const out = resolve(root, 'output/spec');
const pdfOut = resolve(root, 'output/pdf');
const checkOnly = process.argv.includes('--check');
const htmlOnly = process.argv.includes('--html-only');
const pandoc = process.env.PANDOC || 'pandoc';
type Node = { t: string; c?: any };
type Document = { 'pandoc-api-version': number[]; meta: Record<string, unknown>; blocks: Node[] };
const entries = [...book.chapters, ...book.appendices] as string[];
const coverage = JSON.parse(readFileSync(resolve(source, 'coverage.json'), 'utf8'));
function sourceCommands(file: string, marker: string): string[] {
  const text = readFileSync(resolve(root, file), 'utf8');
  const body = text.split(marker)[1]?.split('/')[1];
  if (!body) throw new Error('Command DATA not found: ' + file);
  const words = [...body.matchAll(/'([^']*)'/g)].map(match => match[1]);
  return words.filter((_, i) => i % 2 === 0).map((_, i) => (words[i * 2] + words[i * 2 + 1]).trim().toUpperCase());
}
for (const [kind, names] of [
  ['main', sourceCommands('legacy/utexas/DECWAR.FOR', 'data ((isaydo')],
  ['pregame', sourceCommands('legacy/utexas/SETUP.FOR', 'data ((precmd')],
] as const) {
  if (JSON.stringify(names) !== JSON.stringify(coverage[kind].map((entry: any) => entry.command ?? '')))
    throw new Error('Coverage differs from Austin ' + kind + ' table');
}

if (new Set(entries).size !== entries.length) throw new Error('Duplicate chapter');
function convert(args: string[], input?: string): string {
  return execFileSync(pandoc, args, { cwd: root, input, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}
function walk(value: any, visit: (node: Node) => void): void {
  if (Array.isArray(value)) { for (const item of value) walk(item, visit); return; }
  if (value && typeof value === 'object') {
    if (typeof value.t === 'string') visit(value);
    for (const child of Object.values(value)) walk(child, visit);
  }
}
const documents = new Map<string, Document>();
const anchors = new Map<string, Map<string, string>>();
const firstHeading = new Map<string, string>();
let appendixNumber = 0;
for (const name of entries) {
  const path = resolve(source, name);
  if (!path.startsWith(source + '/')) throw new Error('Chapter outside source directory');
  let text = readFileSync(path, 'utf8');
  if (name === 'README.md') {
    // Title-page metadata is centralized; the repository README keeps a visible byline.
    text = text.replace(/^# .*\n\n\*\*Eric Freeman, PhD · Noah Smith, PhD\*\*\s+The University of Texas at Austin\s+Department of Arts and Entertainment Technologies\n/, '# Scope and conformance\n');
  }
  const doc = JSON.parse(convert(['--from=gfm', '--to=json'], text)) as Document;
  const map = new Map<string, string>();
  const prefix = name.replace(/\.md$/, '').toLowerCase();
  const appendix = book.appendices.includes(name);
  const letter = appendix ? String.fromCharCode(65 + appendixNumber++) : undefined;
  walk(doc.blocks, node => {
    if (node.t === 'Table') {
      // GFM has unspecified column widths; LaTeX otherwise emits unwrapped l columns.
      const columns = node.c[2];
      const widths = columns.map(() => 8);
      const rows = [node.c[3][1], ...node.c[4].flatMap((body: any) => [body[2], body[3]]), node.c[5][1]].flat();
      for (const row of rows) for (let i = 0; i < row[1].length; i++) {
        let length = 0;
        walk(row[1][i][4], child => { if (child.t === 'Str' || child.t === 'Code') length += String(child.t === 'Code' ? child.c[1] : child.c).length + 1; });
        widths[i] = Math.max(widths[i], Math.sqrt(length) * 3);
      }
      const total = widths.reduce((a: number, b: number) => a + b, 0);
      const proportions = columns.length === 3 ? [0.24, 0.52, 0.24] : widths.map((w: number) => Math.floor(100 * w / total) / 100);
      proportions[proportions.length - 1] = 1 - proportions.slice(0, -1).reduce((a: number, b: number) => a + b, 0);
      columns.forEach((column: any, i: number) => { column[1] = { t: 'ColWidth', c: proportions[i] }; });
    }
    if (node.t !== 'Header') return;
    const [level, attr, inlines] = node.c;
    const original = attr[0] as string;
    if (map.has(original)) throw new Error(`Duplicate heading ${name}#${original}`);
    const id = `${prefix}-${original}`;
    map.set(original, id); attr[0] = id;
    if (!firstHeading.has(name)) firstHeading.set(name, id);
    if (appendix) {
      attr[1].push('unnumbered');
      if (level === 1) inlines.unshift({ t: 'Str', c: `Appendix ${letter}.` }, { t: 'Space' });
    }
  });
  if (!firstHeading.has(name)) throw new Error(`No heading in ${name}`);
  documents.set(name, doc); anchors.set(name, map);
}
let localLinks = 0;
for (const [name, doc] of documents) {
  walk(doc.blocks, node => {
    if (node.t !== 'Link' && node.t !== 'Image') return;
    const dest = node.c[2][0] as string;
    if (/^[a-z][a-z0-9+.-]*:/i.test(dest)) return;
    const hashAt = dest.indexOf('#');
    const rawPath = hashAt < 0 ? dest : dest.slice(0, hashAt);
    const fragment = hashAt < 0 ? '' : decodeURIComponent(dest.slice(hashAt + 1));
    const target = rawPath ? resolve(source, dirname(name), decodeURIComponent(rawPath)) : resolve(source, name);
    if (!existsSync(target)) throw new Error(`Broken link in ${name}: ${dest}`);
    localLinks++;
    const targetChapter = relative(source, target);
    if (documents.has(targetChapter)) {
      const id = fragment ? anchors.get(targetChapter)!.get(fragment) : firstHeading.get(targetChapter);
      if (!id) throw new Error(`Missing heading in ${name}: ${dest}`);
      node.c[2][0] = '#' + id;
    } else {
      if (/^L\d+$/.test(fragment)) {
        const lines = readFileSync(target, 'utf8').split(/\r?\n/).length;
        if (Number(fragment.slice(1)) > lines) throw new Error(`Source line out of range: ${dest}`);
      }
      const rel = relative(root, target);
      if (rel.startsWith('..')) throw new Error(`Link escapes repository: ${dest}`);
      node.c[2][0] = book.repositoryUrl + '/blob/main/' + rel.split('/').map(encodeURIComponent).join('/') + (fragment ? '#' + fragment : '');
    }
  });
}
const strings = (value: string) => ({ t: 'MetaInlines', c: [{ t: 'Str', c: value }] });
const combined: Document = {
  'pandoc-api-version': documents.values().next().value!['pandoc-api-version'],
  meta: {
    title: strings(book.title),
    subtitle: strings(book.subtitle),
    author: { t: 'MetaList', c: book.authors.map(strings) },
    date: strings(book.date),
    institute: strings(`${book.institution} — ${book.department}`),
    lang: strings('en-US'),
  },
  blocks: [...documents.values()].flatMap(doc => doc.blocks),
};
console.log(`Checked ${entries.length} chapters and ${localLinks} local links.`);
if (checkOnly) process.exit(0);
mkdirSync(out, { recursive: true }); mkdirSync(pdfOut, { recursive: true });
const ast = JSON.stringify(combined);
const stem = resolve(out, 'decwar-specification');
writeFileSync(stem + '.json', ast + '\n');
const args = ['--from=json', '--standalone', '--toc', '--toc-depth=2', '--number-sections'];
// A title page with the supplied affiliation, without injecting raw HTML into PDF metadata.
const coverTex = resolve(out, 'title.tex');
const escapeTex = (s: string) => s.replace(/[\\{}$&#%_^~]/g, c => ({'\\':'\\textbackslash{}','~':'\\textasciitilde{}','^':'\\textasciicircum{}'}[c] || '\\' + c));
writeFileSync(coverTex, `\\begin{titlepage}\n\\centering\n\\vspace*{1.4in}\n{\\Huge\\bfseries ${escapeTex(book.title)}\\par}\n\\vspace{0.6in}\n{\\Large ${escapeTex(book.subtitle)}\\par}\n\\vspace{0.8in}\n${book.authors.map((s: string) => '{\\large ' + escapeTex(s) + '\\par}').join('\n')}\n\\vspace{0.3in}\n${escapeTex(book.institution)}\\par\n${escapeTex(book.department)}\\par\n\\vfill\n${escapeTex(book.date)}\\par\n\\vspace{0.2in}\n{\\small Incomplete draft. Austin reconstruction is the core; historical equivalence is not certified.\\par}\n\\end{titlepage}\n`);
// Suppress Pandoc's default title for TeX; our title page includes the affiliation.
const texDoc = structuredClone(combined); delete texDoc.meta.title; delete texDoc.meta.author; delete texDoc.meta.date; delete texDoc.meta.subtitle;
// Pandoc protects spaces inside inline code. Long semantic formulas need legal
// line breaks at operators without changing their visible text or HTML source.
walk(texDoc.blocks, node => {
  if (node.t !== 'Code' || node.c[1].length < 20) return;
  const value = Array.from(node.c[1] as string).map(char =>
    escapeTex(char) + (/[×−+\/,=]/.test(char) ? '\\allowbreak{}' : '')).join('');
  node.t = 'RawInline'; node.c = ['latex', '\\texttt{' + value + '}'];
});
const tex = convert([...args, '--to=latex', '--pdf-engine=xelatex', '-V', 'documentclass=article', '-V', 'fontsize=11pt', '-V', 'geometry:margin=1in', '-V', 'colorlinks=true', '-V', 'urlcolor=blue', '--include-in-header=docs/spec/style/spec.tex', '--include-before-body=' + coverTex], JSON.stringify(texDoc));
writeFileSync(stem + '.tex', tex.replace(/\\texttt\{([a-z0-9]{32,})\}/g, '\\texttt{\\seqsplit{$1}}'));
const markdownDoc = structuredClone(combined);
markdownDoc.blocks = markdownDoc.blocks.flatMap(block => block.t === 'Header'
  ? [{ t: 'RawBlock', c: ['html', '<a id="' + block.c[1][0] + '"></a>'] }, block] : [block]);
writeFileSync(stem + '.md', convert(['--from=json', '--to=gfm', '--standalone'], JSON.stringify(markdownDoc)));
const htmlDoc = structuredClone(combined);
htmlDoc.meta['author'] = { t: 'MetaList', c: [...book.authors, book.institution, book.department].map(strings) };
writeFileSync(stem + '.html', convert([...args, '--to=html5', '--self-contained', '--css=docs/spec/style/spec.css'], JSON.stringify(htmlDoc)));
if (!htmlOnly) {
  const latex = process.env.XELATEX || 'xelatex';
  for (let pass = 0; pass < 3; pass++) {
    const log = execFileSync(latex, ['-interaction=nonstopmode', '-halt-on-error', '-no-shell-escape', '-output-directory=' + pdfOut, stem + '.tex'], { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    writeFileSync(resolve(out, `xelatex-${pass + 1}.log`), log);
  }
}
const hashes = entries.map(name => ({ file: 'docs/spec/' + name, sha256: createHash('sha256').update(readFileSync(resolve(source, name))).digest('hex') }));
writeFileSync(resolve(out, 'build.json'), JSON.stringify({ title: book.title, draft: true, sourceRevision: book.sourceRevision, chapters: hashes, pandoc: convert(['--version']).split('\n')[0], pdf: !htmlOnly }, null, 2) + '\n');
console.log(`Built ${stem}.{md,tex,html}${htmlOnly ? '' : ' and output/pdf/decwar-specification.pdf'}`);
