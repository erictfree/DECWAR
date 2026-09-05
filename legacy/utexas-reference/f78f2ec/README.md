# Austin reconstruction reference build

Built locally on September 5, 2026 from unchanged `decwarorg/utexas` commit
`f78f2ec733999617e4281ba3ed967bff8cd5d8f8`. All 39 reconstruction source files
match the pinned import manifest. These are new outputs from the reconstructed
environment, not recovered historical artifacts. The 1986 timestamps inside
the map are produced by the scripted guest clock.

## Files

- `DECWAR.MAP`: complete LINK map, 47,459 bytes; original text bytes retained.
- `DECWAR.SYM`: symbols in BACK10 `-C` core-dump representation.
- `DECWAR.EXE`: freshly linked PDP-10 executable in the same representation.
- `reference-output.tap`: authoritative SIMH/TOPS-10 BACKUP export of the three
  files. Keep it if a different host representation is needed.
- `DECWAR.INI`: the repository's actual `msc/decwar.ini`, installed by the build.
- `artifacts.json`: hashes, formats, provenance, toolchain and verification.
- `build-console.txt`: guest build, LINK, version queries and export transcript.
- `yorktown-session.txt`, `wolf-session.txt`: successful Telnet game sessions.
- `launch-changes.diff`: isolated startup/map-output changes relative to upstream.
- `first-boot-diagnostic.txt`, `native-*-build.txt`, `source-tape-listing.txt`:
  setup diagnostics and host tool/source-tape evidence.

The binary exports store each 36-bit word in five host bytes: the first four
carry the high 32 bits and the low nibble of the fifth carries the final four.
They are not macOS executables. The default BACK10 ASCII extraction is not used
for the preserved SYM/EXE. Terminal transcripts capture the Telnet client's
display, including CR and echo quirks; they are not raw wire captures.

## Build and observed behavior

The bundled SIMH KL emulator and BACK10 tool were compiled natively on macOS
using Apple clang 17. Docker Desktop's engine was not running; no download was
needed. The supplied disk ZIP and tape-generation inputs were used in an
isolated `/tmp/decwar-austin-reference` working tree.

The game was compiled inside TOPS-10 with FORTRAN 6(1144) and MACRO 53B(1244),
then linked with LINK 6(2376) against SYS:FORLIB. The full console records the
original module ordering. The only change to the LINK command was requesting
map and symbol output along with the saved game: `DECWAR/SAVE/MAP/SYFILE`.

Host startup adjustments bound Telnet to localhost:2030, disabled unused Ethernet
and unavailable DN configuration, enabled logging and matched the actual disk's
OPR startup output. A manual EXIT was needed when asynchronous OPR output confused
the supplied automation. No FORTRAN or MACRO game source was edited.

The map reports HISEG at octal 400010 with 3,122 words and LOWSEG at octal 140
with 129 words, matching independent calculations from Austin declarations.
LOCAL is at octal 341 with 200 words; TIMERS is at octal 406072 with 250 words.
There are 552 global symbols and entry address octal 406467. These addresses
belong to this linked build and must not be borrowed from the CompuServe map.

Successful smoke tests admitted Yorktown (Federation slot 9) and Wolf (Empire
slot 18), displayed both complete nine-ship menus, executed DECWAR.INI, rendered
SCAN 10, displayed STATUS and returned to TOPS-10 after QUIT and the final score
table. This confirms a runnable reconstruction and the boundary roster entries;
it does not prove all eighteen concurrent players or every game command.

BACKUP reported all three files and `Done`, followed by `Cannot get high segment
back` when returning to the monitor. The detached tape lists and extracts all
three files; the text map has its final LINK end marker, and preserved artifact
hashes were checked. The transcript retains this diagnostic.

## Using the local reference

The isolated emulator can serve Telnet on localhost:2030. When it is running:

```text
telnet 127.0.0.1 2030
```

At the TOPS-10 prompt:

```text
login decwar
r gam:decwar
```

The DECWAR account requires no password in this supplied environment. The
TypeScript game remains separate on localhost:2323. Running-instance details
are operational state, not a property of these saved artifacts. Preserve or
recreate the working emulator disks separately if the temporary directory is
removed; this folder stores the build results and evidence, not full disks.
