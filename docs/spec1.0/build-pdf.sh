#!/bin/sh
set -eu

SPEC_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SPEC_DIR/../.." && pwd)
OUTPUT_DIR="$REPO_ROOT/output/pdf"

mkdir -p "$OUTPUT_DIR"

pandoc \
  "$SPEC_DIR/01-introduction.md" \
  "$SPEC_DIR/02-abstract-data-types.md" \
  "$SPEC_DIR/03-lexical-structure.md" \
  "$SPEC_DIR/04-command-grammar.md" \
  "$SPEC_DIR/05-semantic-framework.md" \
  "$SPEC_DIR/06-world-mechanics.md" \
  "$SPEC_DIR/07-command-semantics.md" \
  "$SPEC_DIR/08-autonomous-activity.md" \
  "$SPEC_DIR/09-execution-and-ordering.md" \
  "$SPEC_DIR/10-output-language.md" \
  "$SPEC_DIR/11-conformance-scenarios.md" \
  --standalone \
  --from=gfm+tex_math_dollars+raw_attribute \
  --to=latex \
  --pdf-engine=xelatex \
  --toc \
  --toc-depth=3 \
  --highlight-style=pygments \
  --lua-filter="$SPEC_DIR/style/table-widths.lua" \
  --include-in-header="$SPEC_DIR/style/preamble.tex" \
  --include-before-body="$SPEC_DIR/style/title-page.tex" \
  --variable=papersize:letter \
  --variable=geometry:margin=1in \
  --variable=fontsize:11pt \
  --variable=linestretch:1.03 \
  --metadata=lang:en-US \
  --metadata=title-meta:'DECWAR Specifications (Austin Core)' \
  --metadata=author-meta:'Eric Freeman, PhD; Noah Smith, PhD' \
  --output="$OUTPUT_DIR/decwar-specification-austin-core.pdf"
