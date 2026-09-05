# Austin variant implementation

The default target is the supplied Austin reconstruction at commit
`f78f2ec733999617e4281ba3ed967bff8cd5d8f8`. It is not represented as a pristine
historical release. CompuServe remains independently selectable. Both archives
are immutable; CPU/compiler references supply platform evidence only.

## Runtime and evidence

`tools/source-catalog.ts` locates the routines in Austin's combined DECWAR.FOR
and retains physical source lines. `tools/variant-data.ts` extracts each variant
independently. `src/runtime/game-session.ts` is the production factory shared by
host and tests. The world retains an immutable variant context; scoped read-only
data views carry it through existing statement routines. Every generator resume,
throw and return is scoped explicitly. Memory layouts are captured at creation.
There is no mutable process-wide variant switch or fallback from Austin data to
CompuServe data. Older standalone helper APIs without a context retain their
CompuServe baseline; the production factory scopes the full running composition.

The factory still imports binders under test/fixtures. Moving every binder is
remaining organization work, not a second implementation or a requirement to run
tests before playing. Arithmetic and instruction helpers remain shared where the
sources agree. PDP-10 words, packed fields, integer scaling and truncation remain
explicit; JavaScript floating point does not replace the native REAL arithmetic.

The preserved native build supplies actual shared-region bases and sizes:
HISEG 3122 words, LOWSEG 129, LOCAL 200, TIMERS 250 at octal 406072, and 4190
queue words including 720 hit entries. The source-declared trailing FORTRAN
HILST has no active assembly HI.LST declaration; extraction permits only this
specific discrepancy and checks the resulting map size. Added private argument
copies and compiler scratch/literal addresses are host bindings, not claims of
recovered instruction/local-variable addresses. See [build evidence](austin-build-evidence.md)
and the MAP/SYM/EXE, INI, hashes and transcripts in
`legacy/utexas-reference/f78f2ec/`.

## Changed FORTRAN units

The [comparison](legacy-comparison.md) records the source locations. This ledger
accounts for all 18 changed matched units; matching routine bodies remain shared.

| Unit | Connected implementation or no-change reason |
| --- | --- |
| DECWAR | entry-statements, fatal-statements, game-session: omit experience/type/summary startup and statistics updates; invoke Austin DECINI after placement. |
| BLKDAT | Independently generated DATA, eighteen names, dimensions and masks; no hand-maintained replacement roster. |
| PREGAM | pregame-statements: omit initial honor-roll path; preserve blank DOCUMENT dispatch output and inactive HONORROLL slot. |
| XGTCMD | Independent pregame table preserves all slot IDs, including the two blank entries. |
| SETUP | setup-prefix/admission: twenty initial planets, nine ships per side, source masks, no UPDCAP or mission output. |
| GETCMD | get-command-statements: Austin release-all path and no UPDSTA; shared POINTS/FREE and documented pending-control repair. |
| ENDGAM | endgame-statements: no UPDSTA; retain POINTS, FREE, world retirement and exit. |
| PASWRD | password-statements: Austin equality result without CompuServe project restriction or rejection output. |
| MOVE | move-statements and lock bindings: public key 1, source retry on LKFAIL, single release-all; movement arithmetic unchanged. |
| ROMDRV | romulan-driver-statements: Austin IRAN bounds 5 and 10 replace CompuServe 10 and 50 at the two changed tests. |
| TELL | tell-statements: omit player-triggered ROMULAN reply/relocation extension; preserve Austin recipient filtering and unconditional no-recipient message. |
| BASPHA | base-phaser-statements: KA copy before PHADAM, later PRIDIS uses KA; recipient mask retains K. Both standalone and live defense binders allocate KA. |
| DAMAGE | damage-statements: IA/JA copies for ODEV while later accesses retain I/J. |
| DSHIP | Source call sites are commented out; no reachable DSHIP port is added. Its IA-before-FREE change has no running-game effect. |
| PLNATK | planet-attack-statements: JA copy at each ship iteration, passed to PHADAM. Both standalone and live defense binders allocate JA. |
| ROMSTR | romulan-target-statements: IA/JA copies for DISPC; return original loop coordinates. |
| SET | set-statements: IA/JA copies for DISPC and SETDSP while removing black holes. |
| SNOVA | nova-statements: VA/HA copies for board calls; original V/H retained for stack traversal. |

## Assembly, assets and modern bindings

- Both rosters, eighteen player bits, team masks, output tables, queue sizes,
  DATA and assets are extracted independently. The 324 named messages agree;
  anonymous literals do not all agree. Austin ASCIL emits no CRLF according to
  the macro body, irrespective of its comment.
- Austin startup emits the reference build's `DECWAR, Edit     0` line. Edit zero
  is a binding to that captured executable identity. The exact saved DECWAR.INI
  executes its five commands, including `targets` and `srscan 2 w`. Missing-file
  behavior prints Austin's own error without inventing preferences.
- Austin ROMSPK always takes the broadcast path, with four draws and source team
  masks. It has no RMGPLY/node quip extension. Its unused single-phrase strings
  are retained as source data.
- Austin JOBSTA writes USPPN and uses its twelve-entry speed table. Disabled
  sequence-registration statements remain disabled: JSQTAB still has ten entries
  in the source, but admission does not index it for ships 11–18. CHKSEQ remains
  its immediate-return source stub.
- Austin LOCK and LOCK. use monitor keys 1 and 2; UNLOCK/UNLO release all job
  claims. Failed ENQ follows the source LKFAIL/25 ms return; source callers decide
  whether to retry. No CompuServe LOKTAB tracking or LOCKED reacquisition is added.
  The host uses cooperative scheduling and FIFO queued grants across galaxies.
  This is a modern monitor binding, not verified TOPS-10 scheduling/ENQ fairness.
- Austin GTKN, INPUT and PAUSE omit the commented lock save/reacquire blocks;
  ignored HIBER failures stay ignored. ECHON/ECHOFF execute their OPEN/flag path.
  Host OPEN succeeds for the already-open TCP terminal. Telnet local-echo
  negotiation and raw-name editing remain existing transport limitations; this
  is not proof of identical physical-terminal echo behavior.
- Austin MONIT and EXIT flush when connected and release locks without an
  implicit CompuServe FREE. EXIT also clears the right half of the host JBSA word;
  MONIT preserves it. Source callers perform normal ship cleanup. Host
  monitor exits end the TCP session; resuming a PDP-10 monitor/trap is not exposed.
- Austin HELP and NEWS read its own assets. Served HLP/DECWAR.HLP describes
  eighteen ships and nine per side, matching executable tables. The older
  HLP/DECWAR.RNH formatter source still describes ten; both files are preserved.
- Austin omits persistent commissions and honor-roll statistics. CompuServe keeps
  its original persistence. Each host records variant/format in variant.json and
  rejects incompatible data before admitting a player. Existing unmarked word
  files can be adopted only as validated CompuServe records, explicitly selected.

The existing playable decisions apply to both variants: their corresponding
POINTS, TRACTR, LSTSCN and pending-control defects remain present in Austin.
Selecting `--strict` omits those repairs. See [playable decisions](playable-decisions.md).
Licensing has not changed with variant selection.

## Validation and limits

Final `npm run check`: **4,563 tests passed**, both source audits and strict
TypeScript checking passed (logs/austin-release-full-check-2.log). Clean Node 24
installation and omitted-variant CLI startup/INI/STATUS/QUIT passed separately.

Focused tests exercise eighteen active ships (nine per side), targeted messages
across the fleet boundary, interleaved reports, nineteenth-player rollover,
720-entry hit saturation and source overwrite behavior, slot-18 combat/death,
normal quit, disconnect, ship reuse and game-over. Live command tests cover
movement, capture, construction and docking, using staged encounters and real
command parsing, turns and waits. Real TCP/Telnet tests cover startup/INI, eighteen
captains, messages, raw Ctrl-C, Telnet IP, disconnect and reuse. Context tests
interleave both variants; storage tests reject cross-variant/invalid files.

Tests verify this source-backed port. Native reference transcripts cover startup,
INI, STATUS and quit for Yorktown and Wolf, not a complete differential combat
run. The multiplayer soak is bounded; captains are exercised both in-process
and over eighteen simultaneous TCP connections. Long-duration load, adversarial contention,
all malformed inputs, interrupt at every instruction, original monitor timing
and full compiler equivalence remain unverified. The strict profile continues
to expose unresolved compiler behavior. None of these is described as certified
historical parity.
