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
npm run spec:check   # Validate chapter links and Austin command-table coverage
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
Table columns and verbatim records wrap to page width. Source evidence stays
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

A successful build is not proof that the game semantics are complete. Check the
coverage appendix separately. Before sharing a typeset revision, inspect the
LaTeX log for overfull boxes and missing characters, render the PDF to images,
and check title page, contents, tables, breaks and representative clause pages.
Rebuild after edits. The normal source archive audit remains `npm run audit:check`.
