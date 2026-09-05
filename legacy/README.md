# Legacy DECWAR sources

## Compuserve

`compuserve/fortran 1978/` contains the 135-file archive originally supplied in
`old_source/fortran 1978/`. The user requested the directory name `compuserve`;
the move preserves every file byte and the existing internal directory layout.
This defines the TypeScript port's CompuServe variant. Its integrity
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
This snapshot defines the default Austin variant. Its independently generated
tables and the local reference build are described in
[the Austin implementation ledger](../docs/austin-implementation.md).

## Locally rebuilt Austin reference

At the user's request, a fresh build of the pinned Austin source was completed
on September 5, 2026 using the repository's bundled emulator and TOPS-10 disks.
The original `utexas/` files remain unchanged; outputs are preserved separately
in [utexas-reference/f78f2ec](utexas-reference/f78f2ec/README.md).

That folder holds DECWAR.MAP, DECWAR.SYM, DECWAR.EXE, the raw export tape,
initialization file, build/terminal transcripts and a hash/provenance manifest.
Yorktown (slot 9) and Wolf (slot 18) sessions completed startup, status and quit;
the Yorktown session also exercised SCAN 10. These are new reconstruction build
artifacts, not historical originals. Their scripted 1986 guest timestamps must
not be mistaken for their actual 2026 build date. The TypeScript game now uses
Austin by default and retains an explicit CompuServe variant. See the reference
README for host binary encodings.
