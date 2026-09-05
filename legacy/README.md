# Legacy DECWAR sources

## Compuserve

`compuserve/fortran 1978/` contains the 135-file archive originally supplied in
`old_source/fortran 1978/`. The user requested the directory name `compuserve`;
the move preserves every file byte and the existing internal directory layout.
This remains the current TypeScript port's behavioral baseline. Its integrity
is checked by `npm run audit:check` against `docs/source-manifest.json`.
Original attribution and GPL notices remain in the archive.

## UT Austin

`utexas/` is an unmodified copy of the contents of
[`utexas23-reconstruction`](https://github.com/decwarorg/utexas/tree/f78f2ec733999617e4281ba3ed967bff8cd5d8f8/utexas23-reconstruction)
from `decwarorg/utexas`, imported at the user's request on September 5, 2026.

- Commit: `f78f2ec733999617e4281ba3ed967bff8cd5d8f8`.
- Files: 39, preserving upstream subdirectories and file bytes.
- Provenance and hashes: [utexas-manifest.json](utexas-manifest.json).
- Upstream repository license: [utexas-LICENSE](utexas-LICENSE), MIT,
  copyright 2024 Project UTEXAS DECWAR.

Each imported file was verified against its upstream Git blob hash. The
manifest also records SHA-256 hashes and file modes. This is a source snapshot,
not a Git submodule; updating it requires an explicit new import and manifest.
It has not been compiled, used to regenerate the port's tables, or adopted as
the current game's behavioral baseline.
