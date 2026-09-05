# Austin reference build

A fresh build of the pinned Austin reconstruction completed on September 5,
2026. Its map, symbols, executable, initialization file, toolchain record and
Yorktown/Wolf terminal captures are preserved in
[legacy/utexas-reference/f78f2ec](../legacy/utexas-reference/f78f2ec/README.md).
These are new reconstruction artifacts, not recovered historical originals.

## Source and environment

The build used `decwarorg/utexas` commit
`f78f2ec733999617e4281ba3ed967bff8cd5d8f8`, the same revision as the immutable
39-file reconstruction in this repository. Review covered the full upstream
repository and supplied environment; no other DECWAR implementation was used.

The full repository contains Docker Compose support, a SIMH PDP-10 KL emulator,
BACK10 export tooling, TOPS-10 disks and restore/compile/link scripts. Its normal
workflow restores the game sources, compiles them inside TOPS-10, links against
SYS:FORLIB and installs DECWAR.EXE. See the pinned
[upstream README](https://github.com/decwarorg/utexas/blob/f78f2ec733999617e4281ba3ed967bff8cd5d8f8/readme.md)
and [build script](https://github.com/decwarorg/utexas/blob/f78f2ec733999617e4281ba3ed967bff8cd5d8f8/simh/utexas.do).

For this reference build, Docker's engine was unavailable. The bundled emulator
and BACK10 were compiled natively on macOS with Apple clang 17; the game itself
was still compiled and run inside the emulated TOPS-10 environment. Using the
repository's Docker-related files does not mean that this native run was a Docker
container. The TypeScript game is a separate Node process.

Observed toolchain:

| Component | Observed identity |
| --- | --- |
| Monitor | KL703, system 1025 |
| FORTRAN | 6(1144) |
| MACRO | 53B(1244) |
| LINK | 6(2376) |
| Runtime library | SYS:FORLIB.REL; linked MAX. module dated December 3, 1981 |

The supplied boot script sets a 1986 guest clock. Dates printed by LINK therefore
do not establish an original 1986 build. The actual host build date is 2026-09-05.
The inspected FORTRAN language manual is version 5; a successful version-6 build
does not establish every compiler policy used by the TypeScript port.

## What was changed for the build

Game source remained unchanged. The isolated launch configuration bound Telnet
to localhost:2030, disabled unused/unavailable network devices, enabled logging
and accommodated the supplied disk's startup messages. Manual OPR intervention
was needed; this is not a claim of a fully unattended build.

The source compile list and link module order were preserved. The first LINK
line requested `DECWAR/SAVE/MAP/SYFILE` so the same build produced a map and
symbols as well as the executable. The source's L.MIC also documents map/symbol
options, but was not substituted for the actual recorded link sequence.

Exact commands, startup changes and diagnostics are preserved in
[commands.txt](../legacy/utexas-reference/f78f2ec/commands.txt),
[launch-changes.diff](../legacy/utexas-reference/f78f2ec/launch-changes.diff) and
[build-console.txt](../legacy/utexas-reference/f78f2ec/build-console.txt).
The bundle contains build evidence and outputs, not the full emulator or disk
images. Rebuilding requires the pinned upstream environment.

## Preserved outputs

| Artifact | Purpose |
| --- | --- |
| DECWAR.MAP | The 47,459-byte LINK map: module/global symbols, entry points, segment locations and allocation sizes. |
| DECWAR.SYM | The 6,395-byte symbol export in BACK10 core-dump representation. |
| DECWAR.EXE | The 176,640-byte executable export in the same lossless representation. It is not a macOS/Node executable. |
| reference-output.tap | Raw SIMH/TOPS-10 BACKUP export, retained in case another host representation is needed. |
| DECWAR.INI | The actual five-command startup asset from the full repository. |
| artifacts.json | File hashes, byte counts, formats, toolchain and verification scope. |

Binary SYM/EXE exports use five host bytes per 36-bit word: four bytes carry the
high 32 bits and the low nibble of the fifth carries the remaining four. Default
BACK10 ASCII extraction was used only for the text map. BACKUP reported completion
then a high-segment-return diagnostic; the detached tape listed and exported all
three files successfully. That diagnostic remains in the preserved record.

The map reports HISEG at octal 400010 with 3,122 words, LOWSEG at octal 140 with
129 words, LOCAL at octal 341 with 200 words, and TIMERS at octal 406072 with
250 words. Its entry address is octal 406467. These are the addresses of this
linked reconstruction. The map does not contain the entire source, all live
state, or every compiler-local calling convention.

## Initialization and observed sessions

The imported source subtree does not contain DECWAR.INI. The full repository
supplies [msc/decwar.ini](https://github.com/decwarorg/utexas/blob/f78f2ec733999617e4281ba3ed967bff8cd5d8f8/msc/decwar.ini),
and its tape-staging script installs that file. Its exact CR/LF bytes are preserved
and its commands are used by the Austin TypeScript startup:

```text
set prompt informative
set ocdef both
set output medium
targets
srscan 2 w
```

Yorktown (slot 9) and Wolf (slot 18) each joined the native game, read the INI,
displayed STATUS and completed QUIT with final points. Yorktown also completed
SCAN 10. Both nine-ship menus appear in the captures. These establish observed
boundary-slot behavior; they do not prove eighteen simultaneous native captains
or a full native-versus-TypeScript combat comparison. The captures are Telnet
client terminal transcripts, not raw network captures.

For the separate emulator's connection sequence and the distinction from the
Node host, see [running instructions](running.md#typescript-host-and-native-reference).
The [Austin implementation ledger](austin-implementation.md) records how the
port uses this evidence and which modern bindings remain.
