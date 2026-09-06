# Building the specification

The ordered chapter list in book.json is the single document manifest. Markdown
chapters are canonical, except messages.md, which is extracted from the immutable
archive by `node tools/spec/messages.ts`. Every build verifies that catalogue.
Generated LaTeX, PDF, HTML and assembled Markdown are
build products. Edit the chapters, not those outputs.

## Commands and dependencies

Use Node.js 24 or newer, Pandoc and a TeX distribution providing XeLaTeX.
The first build was verified with Pandoc 2.12 and TeX Live 2025. The document
build is separate from the game: playing DECWAR does not require Pandoc or TeX.

```sh
npm run spec:check   # Validate links, grammar references and command-table coverage
npm run spec:build   # Produce a single LaTeX document, PDF, HTML and Markdown
npm run spec:html    # Produce HTML/Markdown/LaTeX without invoking XeLaTeX
```

PANDOC and XELATEX environment variables may name alternative executables.
XeLaTeX needs the standard Pandoc packages plus fancyhdr, fvextra, etoolbox and
seqsplit. No shell escape is enabled. No source downloads happen during the build.
The author names and affiliation, chapter order, source revision and edition date
are centralized in book.json. The visible repository title-page byline must be
kept consistent with that metadata.

## Pipeline

Pandoc parses each chapter into its document tree. The builder validates local
links, assigns chapter-qualified anchors and converts links between included
chapters into links within the single document. Source/evidence links point to
the matching repository path on GitHub. They do not become local-machine paths
inside a shared PDF. Original archive identity is separately pinned in the text.

The combined tree generates one LaTeX file, then XeLaTeX runs three passes for
the contents and references. PDF layout uses numbered sections, a title page,
contents, running headers, page numbers and explicitly labeled appendices.
Table columns and verbatim records wrap to page width. Short grammar and pseudocode
blocks are kept together on a page. Source evidence stays
with its preceding paragraph. The final TeX pass fails the build for overflowing
boxes, missing characters or unresolved references. The same document tree generates standalone
HTML with embedded styling and a Markdown edition with explicit link anchors.
Long inline code uses explicit fixed spaces in LaTeX so repeated, leading and
trailing spaces in terminal examples survive typesetting. Wrapping is presentation;
it does not introduce a newline into the represented character sequence.

The LaTeX backend follows the documented
[Pandoc PDF workflow](https://pandoc.org/MANUAL.html#creating-a-pdf). This tooling
reference supplies no DECWAR behavior.

## Outputs

- output/pdf/decwar-specification.pdf: single typeset specification.
- output/spec/decwar-specification.tex: assembled LaTeX document.
- output/spec/decwar-specification.html: standalone HTML document.
- output/spec/decwar-specification.md: assembled Markdown edition.
- output/spec/decwar-specification.json: combined Pandoc document tree.
- output/spec/build.json: chapter hashes, source revision and build identity.
- output/spec/xelatex-*.log: per-pass diagnostics.

Generated outputs are ignored by Git; chapters, styles, manifest and builder are
versioned. A later published release may attach an approved PDF without changing
which files are authoritative. The current output remains explicitly marked a
working draft.

## Validation

A build checks every EBNF production's referenced names against the book's
productions and the terminal categories explicitly defined in GRAM-1. It rejects
duplicate definitions, undefined references and unbalanced grouping. This is a
document-integrity check: it does not parse player input, establish acceptance
equivalence or verify the ordered command semantics.

A successful build is not proof that the game semantics are complete. Check the
[language conversion coverage](language-coverage.md) separately. The command-table
inventory and extracted messages checked by the builder belong to source
research; their coverage does not mean every command has a rewritten semantic
clause in the book. Before sharing a typeset revision, inspect the
LaTeX log for overfull boxes and missing characters, render the PDF to images,
and check title page, contents, tables, breaks and representative clause pages.
Rebuild after edits. The normal source archive audit remains `npm run audit:check`.

## Read-only compiled-image inspection

`node tools/spec/inspect-reference.ts --marker=ANUM. --words=40` prints encoded
words around a SIXBIT source marker in the preserved Austin EXE. Alternatively
use `--address=460603 --words=2`, with an octal address and decimal word count.
The tool verifies the artifact's manifest hash and decodes only the directory/end
block forms used by this pinned image. Its output splits words into instruction
fields for inspection; it does not establish that every displayed word is code.
It neither executes the image nor contacts an emulator. Node alone is sufficient.
The [compiled tokenizer observations](evidence.md#compiled-tokenizer-observations)
give the reviewed findings and their limits.

## Research outside the publication

The book manifest excludes the earlier operational chapters, evidence.md,
implementation-notes.md, NORMALIZATION.md, PLAN.md and this build guide. They
preserve derivations, review coverage and tooling without
putting implementation recipes into the syntax-and-semantics document. Brief
source citations in the book link to this companion material when useful.
