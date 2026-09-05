# Repository artifacts

The repository contains what is needed to run, test, study and audit the port.
Local operating state and bulk research downloads stay outside Git.

| Material | Keep in Git? | Reason |
| --- | --- | --- |
| TypeScript engine, host and extraction tools | Yes | The implementation and the machinery that relates it to the sources. |
| Tests and runtime binders under test/fixtures | Yes | Regression evidence; the production factory still imports some of these binders. They are required by the current runtime. |
| src/generated | Yes | Source-derived runtime inputs, including both variants. Committing them permits direct startup and makes extraction changes reviewable. npm run audit:check verifies them. |
| legacy/compuserve and legacy/utexas, manifests and notices | Yes | Immutable game-logic authorities and their provenance. |
| legacy/utexas-reference/f78f2ec | Yes | The canonical Austin reference build, under 600 KB: MAP, SYM, EXE, INI, raw export tape, hashes, commands, launch scripts and selected build/session evidence. MAP and INI are inputs to the source audit. |
| README, docs and WORK_LOG.md | Yes | Operation, source analysis, decisions and a durable implementation record. Work-log paths to local logs are historical references, not promised repository files. |
| docs/spec and tools/spec | Yes | Canonical specification chapters, ordered manifest, coverage record, styles and single-document builder. |
| output/spec and output/pdf | No | Rebuilt Markdown/LaTeX/HTML/PDF editions and typesetting diagnostics; regenerate with npm run spec:build. |
| logs | No | Routine test/build output, live server diagnostics, probes and local temporary-directory records. Preserve locally; record meaningful outcomes in WORK_LOG.md. |
| data | No | Saved standings, GRIPE records, variant metadata and process locks belong to a particular running host. |
| tmp | No | Experiments, downloaded CPU/compiler manuals, extracted text and page images. Cite authorized references in docs/platform-manuals.md instead of redistributing the downloads. |
| reference/austin | No | A byte-identical local mirror of the canonical legacy/utexas-reference bundle. No runtime or audit depends on this duplicate. |
| node_modules, dist and coverage | No | Installed dependencies and disposable build/test outputs. package-lock.json remains committed. |

## Generated does not mean disposable

The generated TypeScript is part of a runnable checkout. Regenerate it with
`npm run audit`, review the differences, and commit it with the corresponding
tool changes. Do not edit generated tables by hand. Both frozen archive
manifests must continue to pass; regeneration is not permission to change the
source archives or bless unexpected source edits.

The reference binary and tape are small, valuable evidence. They are newly
built PDP-10 artifacts with recorded provenance, not historical originals or
executables for the host operating system. Keeping both the lossless export and
raw tape preserves the ability to check or recover its representation later.
Selected reference transcripts are intentionally retained alongside their hash
manifest; this does not make the entire local logs directory a repository input.

`.gitattributes` disables text conversion for legacy files, preserving their
line endings, control characters and binary bytes across checkouts. Legacy
whitespace checks are disabled because their literal padding and CR/LF bytes
are preserved evidence; normal source-code whitespace checks remain active. It also
marks src/generated as generated for GitHub's diff presentation. The local
mirror, logs and downloads remain on disk when ignored; ignoring does not delete
them or stop any running game.
