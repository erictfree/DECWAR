/** Document literal evidence from the pinned archive, never from the game port. */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { messageCatalog } from '../source.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const rows = messageCatalog(name => readFileSync(root + 'legacy/utexas/' + name, 'latin1'));
const result = `# Named message fragments

This appendix records all ${Object.keys(rows).length} named ASCIZ fragments in Austin's
MSG.MAC and SETMSG.MAC. It is generated directly from the pinned source by
\`tools/spec/messages.ts\`; edit the extractor or explanatory text in that tool,
not this generated appendix. This is literal evidence, not a substitute for the
terminal chapter's rules about when and how fragments are assembled.

## MSG-1 — Reading the catalogue

Each record gives the source symbol, physical source line, and a JSON-quoted
character sequence. \`\\r\`, \`\\n\`, \`\\t\` and \`\\uNNNN\` denote character
codes; escaped quotation marks and backslashes denote those literal characters.
Spaces inside the quoted sequence, including leading and trailing spaces, are
significant. Layout wrapping in the book does not insert characters. The ASCIZ
storage terminator is omitted: a NUL terminates the fragment and is not itself
output by the string-output operation. A fragment does not gain a trailing line
break merely because its record occupies a line in this document.

These records cover named data fragments only. Inline literals, output macros,
HELP/NEWS assets, numeric fields and per-command concatenation remain separate
parts of terminal coverage. The catalogue does not imply every stored fragment
is reached by Austin's selected executable paths.

` + ['MSG.MAC', 'SETMSG.MAC'].map(file => {
  const lines = Object.entries(rows).filter(([, row]) => row.file === file)
    .map(([name, row]) => `${name} (line ${row.line}) = ${JSON.stringify(row.text)}`);
  return `## ${file} fragments\n\n**Evidence:** [${file}](../../legacy/utexas/${file}).\n\n\`\`\`text\n${lines.join('\n')}\n\`\`\`\n`;
}).join('\n');
const destination = root + 'docs/spec/messages.md';
if (process.argv.includes('--check')) {
  if (readFileSync(destination, 'utf8') !== result) throw new Error('Message appendix differs from Austin source; run node tools/spec/messages.ts');
  console.log(`Verified ${Object.keys(rows).length} named message fragments against Austin source.`);
} else {
  writeFileSync(destination, result);
  console.log(`Wrote ${Object.keys(rows).length} named message fragments.`);
}
