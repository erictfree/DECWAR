#!/bin/sh
set -eu

SPEC_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SPEC_DIR/../.." && pwd)
OUTPUT_DIR="$REPO_ROOT/output/pdf"

mkdir -p "$OUTPUT_DIR"

pandoc \
  "$SPEC_DIR/01-introduction.md" \
  "$SPEC_DIR/02-abstract-data-types.md" \
  --standalone \
  --from=gfm+tex_math_dollars \
  --to=latex \
  --pdf-engine=xelatex \
  --toc \
  --toc-depth=3 \
  --highlight-style=pygments \
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
