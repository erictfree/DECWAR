# Plan: Austin reconstruction as the default DECWAR variant

Date: September 5, 2026. Status: implemented; Austin is the launch default. Verification and remaining parity limits are recorded in austin-implementation.md and WORK_LOG.md.

Review of the full upstream repository expanded the available evidence:
[build evidence](austin-build-evidence.md) identifies a supplied emulator/build
environment, map-generation support and msc/decwar.ini outside the imported
subtree. Reproduce that build before falling back to a virtual layout.

## Intended result

Starting DECWAR normally will run a functioning game based on the supplied
Austin reconstruction: eighteen ships, nine per side, twenty initial planets,
and Austin's source-backed commands, output, and behavior. CompuServe remains
an explicitly selectable compatibility variant using the existing ten-player
baseline. Both use the same engine where their source behavior agrees.

Austin is the default. The implementation provides both variants; pre-existing running galaxies and archive files are unchanged. The milestones below retain the approved plan, with results in the implementation ledger.
“Austin reconstruction” describes the target accurately; it does not claim
verified fidelity to an untouched historical release.

Implemented host interface:

```sh
npm start                                  # Austin reconstruction, playable
npm start -- --variant austin               # Explicit Austin selection
npm start -- --variant compuserve           # Existing CompuServe behavior
npm start -- --variant austin --strict      # Austin diagnostic behavior
npm start -- --variant compuserve --strict  # CompuServe diagnostic behavior
```

`--variant` selects source behavior. The existing `--strict` option controls
whether documented playable repairs are enabled; it does not promise complete
historical parity. A variant is fixed for the lifetime of a host and all its
galaxies. Running both variants concurrently uses separate hosts, ports, and
data directories. No in-game selection prompt or new welcome text is added.

## What the current implementation requires

The comparison in [legacy-comparison.md](legacy-comparison.md) establishes the
initial change list. Repository inspection adds these implementation constraints:

| Current coupling | Where it occurs | Required change |
| --- | --- | --- |
| One archive root and split-file assumptions | tools/source.ts, tools/fortran-scope.ts, tools/audit.ts | Select a source catalog; locate Austin routines and DATA within its combined DECWAR.FOR |
| Global constants, names, messages and output tables | src/generated/source-data.ts; imports throughout src/game and src/compat | Supply an immutable variant data bundle; make all player-dependent consumers use it |
| Fixed ten-entry output-table extraction | tools/audit.ts | Extract and validate each source's own table length, names and symbols |
| Memory regions depend on CompuServe DECWAR.MAP | tools/common.ts, tools/local-layout.ts, tools/queue-layout.ts and other layout tools | Separate source-derived offsets from linked or host-assigned base addresses |
| Shared-world region bases and sizes are global | src/runtime/shared-world.ts | Construct regions from the selected variant's layout |
| Sixty planets are also an executable literal | src/game/setup-prefix-statements.ts; related setup code | Port Austin's initialization statement as well as its capacity constant |
| Host composes runtime from test/fixtures | tools/run-telnet.ts, test/fixtures/live-session-runtime.ts and its binders | Establish one variant-aware session factory used by host and tests; move production wiring incrementally |
| HELP and other file access assume CompuServe paths | tools/source.ts and session bindings | Resolve assets from the selected snapshot, including Austin HLP/ files |
| Persistence and monitor lifecycle are always composed | session bindings, src/runtime/statistics-files.ts, src/runtime/monitor-resources.ts | Select appropriate lifecycle, storage and lock behavior per variant |

Austin has no standalone DECWAR.MAP in the imported snapshot or full repository
file inventory. The full repository does supply an environment and linker
script from which one can potentially be generated. Copying CompuServe addresses
while enlarging arrays could overlap regions or break aliases. Reproducing the
Austin link is the preferred way to address this foundation risk.

## Architecture decisions

1. **Immutable variant context.** A session factory receives the source variant,
   execution mode, extracted data, layout, assets, and the small set of differing
   routine bindings. The world retains the same identity. No mutable global
   constants or process-environment checks inside game routines.
2. **Share proven common behavior.** Keep word arithmetic, transport, and matching
   routine bodies shared. Pass their configuration explicitly. Use separate
   routine implementations or bindings for substantially different startup,
   TELL/ROMSPK, persistence, and lock paths instead of many scattered flags.
3. **Keep generation separate.** Produce independently audited Austin and
   CompuServe artifacts. Every extraction retains its own file/line provenance.
   Preserve CompuServe's reference data during the migration. Audit both
   archive manifests without regenerating their expected hashes from edits.
4. **Prefer a layout from the reconstructed build.** First capture a new map
   and symbols using the supplied environment. Retain source field order,
   dimensions, bit widths, COMMON overlap and meaningful argument aliases.
   If a usable map remains unavailable, assign non-overlapping host bases and
   record them as modern bindings, never as recovered Austin addresses. Review
   every absolute-address assumption and address-sensitive operation that
   reaches the running session; a map alone does not resolve compiler semantics.
5. **Separate variant and repair policy.** Each playable repair records which
   source variants need it. Diagnostic mode exposes remaining ambiguities.
   Do not automatically copy a CompuServe workaround into Austin without
   verifying that the relevant source condition exists there.
6. **Protect existing data.** New default directories should be variant-specific,
   such as data/austin and data/compuserve. Record variant and format identity
   in host metadata and reject mismatches before a game starts. Leave existing
   data/ files intact; provide explicit reuse for verified legacy CompuServe
   data. Do not convert those records into Austin records or invent an Austin
   honor roll. The current galaxy itself is in memory, not a saved-world format.

## Implementation milestones

### 0. Establish the supplied reconstruction as an executable reference

In an isolated working copy of pinned commit f78f2ec, reproduce the supplied
Docker/SIMH build without touching the active TypeScript game. Preserve the
msc/decwar.ini runtime asset with its own provenance. Follow the source restore,
compile and link sequence in simh/utexas.do and record the actual compiler,
assembler, LINK, FORLIB and monitor versions and any warnings.

Request DECWAR.MAP and DECWAR.SYM from the same link, preserving module order
and options. L.MIC documents the necessary switches but is not copied by the
default tape script, so either stage it deliberately or add output requests
to the existing LINK sequence in the isolated copy. Capture the executable
identity and a Telnet startup/play/quit transcript from that build.

**Exit evidence:** a reproducible reference for the pinned Austin reconstruction,
ideally with map and symbols, or a specific failure report and a bounded fallback
decision. This cannot establish pristine-original fidelity. Do not indefinitely
block the playable port on emulator/toolchain problems; retain the documented
virtual-layout fallback for evidence that cannot be recovered.

### 1. Establish the two source contracts

Update AGENTS.md and planning/status documentation to record Austin as the
selected target default and CompuServe as the retained compatibility source.
State clearly that the running default remains unchanged during construction.

Create the variant catalog and routine mapping for Austin's combined file,
including ENTRY points, includes, local COMMON views, and block data. Extract
constants, roster, command tables (preserving blank slots and command IDs),
messages, help/news asset paths, and assembly output tables independently.
Use the pinned build evidence from milestone 0 and record any difference between
source-distribution assets and the complete environment's runtime inputs.

**Exit evidence:** both archives pass integrity checks; extracted Austin tables
contain eighteen names and correct team masks; the current CompuServe audit
still passes. The 18 changed FORTRAN units and material assembly differences
have an explicit implementation destination or a documented no-change reason.

### 2. Make the running CompuServe game variant-aware

Introduce the session/world context, data bundle and layout interface while
retaining existing CompuServe values and behavior. Replace direct global imports
and literal player bounds along the complete running dependency graph, including
names, output, queue flags, COMMON access, temporary arrays and lifecycle code.
Handle private memory, shared memory, reset/reload and timer/queue regions
together. Parameterize the necessary generation helpers and runtime binders.

Move the production session composition out of fixture-only entry points in
small steps; tests should call the same factory. Do not use this migration to
rewrite unrelated arithmetic or redesign working commands.

**Exit evidence:** explicit CompuServe playable and diagnostic sessions work;
existing relevant transcript/state checks and the full suite pass. Generated
CompuServe values, aliases, and reference transcripts retain their expected
meaning. Variant identity survives host session reload and galaxy rollover.

### 3. Bring up an Austin galaxy with eighteen usable ships

Derive Austin COMMON, private views and queue layout from both FORTRAN and
MACRO declarations. Resolve and document the HILST/HI.LST and USPPN interface
differences. Use symbolic resolution for host bases, scratch words, literals,
file descriptors and shared regions, using the new map where available;
validate non-overlap and intended aliases.
Do not silently suppress declaration discrepancies in the existing audit.

Apply Austin's eighteen-name roster, eighteen bits, nine-per-side bounds,
twenty-planet setup and 720-entry assembly hit queue. Review every queue producer
and consumer, ship search, team calculation, target code and notification mask.
Verify job identity and sequence registration as well as table capacity.

**Exit evidence:** an internal Austin integration scenario creates a galaxy,
admits and uniquely addresses every slot, exchanges messages and hits involving
slots 10–18, and supports scan, movement, capture, building and docking. This is
an intermediate milestone, not yet the default or a completed Austin variant.

### 4. Complete Austin's observable behavior

Port and connect the differences from the comparison:

- DECWAR entry, PREGAM/XGTCMD and initialization-file handling; no inherited
  Beginner/Intermediate/Expert dialogue where Austin comments it out.
- SETUP, GETCMD, ENDGAM and exit paths without C's UPDCAP/UPDSTA/SHOSTA calls
  and mission/honor-roll output. Preserve Austin's POINTS, FREE and cleanup.
- TELL, ROMSPK and ROMDRV changes, preserving Austin random bounds, draw order,
  target masks, message selection and lack of the C player-reply extension.
- PASWRD restrictions, terminal echo/control, output macros, anonymous literals,
  name/identity handling and HELP/NEWS asset selection.
- The temporary argument copies in BASPHA, DAMAGE, DSHIP, PLNATK, ROMSTR, SET
  and SNOVA; verify call mutation and aliasing rather than assuming no effect.
- MOVE, LOCK/UNLOCK, interrupt and monitor cleanup. Use shared host primitives
  with Austin-specific lock keys and release semantics where supported. Any
  practical scheduling repair must state the original behavior and the reason.

Keep matching core gameplay implementations shared after checking their changed
dependencies. Preserve integer scaling, word arithmetic and terminal bytes.

**Exit evidence:** a complete Austin game lifecycle works through normal quit,
death, disconnect, ship reuse and game-over; the change ledger accounts for all
identified differences. No C-specific startup/statistics/taunt path remains
active accidentally. CompuServe retains those behaviors when selected.

### 5. Verify both variants under real sessions

Use the existing playable-game, playable-telnet, telnet-server, world-directory,
setup, combat, message, statistics and lifecycle test families. Add tests that
exercise the actual new risks:

- Eighteen simultaneous Austin captains, nine per side; first, last and boundary
  ship IDs, including targeted and group messages, queue saturation and combat.
- Source-consistent handling of a nineteenth captain and full-galaxy rollover,
  with existing captains still attached to their original world. Retain the
  corresponding ten/eleven-captain CompuServe coverage.
- Fixed-seed galaxy and Romulan scenarios per variant. Expect different draw
  sequences where source placement counts or branches differ; do not force
  cross-variant transcript equality.
- Byte-level application output for startup, command abbreviations, prompts,
  SCAN at relevant widths, invalid/partial input, HELP/NEWS and exit. Separately
  verify Telnet framing, fragmented negotiation, raw Ctrl-C and Telnet IP.
- Concurrent movement/hits, interrupt during a held lock, disconnect during
  output, dead-job cleanup, restart, and no memory/queue/state leakage between
  sessions, worlds, or separately hosted variants.
- CompuServe persistence survives restarts; Austin neither writes C standings
  nor reads incompatible data. Wrong variant/format metadata fails at host
  startup with no game or file corruption.
- Representative shared playable repairs and diagnostic failures in each
  variant. Strict mode must not silently install playable repairs.

Run both source audits, strict TypeScript checking, focused tests while changing
each area, then the complete suite before the default switch. Use a bounded
multi-client soak with explicit failure criteria: stalled commands, orphaned
ships/locks, queue corruption, or uncaught session failures.

These are source-backed implementation tests, not original-executable parity
tests. Record the exact scenarios, results and remaining limitations.

### 6. Switch the default and document operation

Make omitted --variant select Austin only after milestones 1–5 pass. Keep the
explicit CompuServe command available. Print variant, execution mode, snapshot
identity and data path in host diagnostics, not as invented in-game text.

Update README, running instructions, status, source audit documentation and
playable decisions. Include the eighteen-ship roster, known reconstruction
inconsistencies, and commands to start either variant. Keep an explicit local
path to run CompuServe using the existing data without changing those files.

Verify a fresh checkout can install, start by the documented default command,
accept a Telnet captain, and complete a playable session. Announce the restart
when the new host is actually listening and verified; do not silently replace
an active galaxy during development. Selecting a variant does not alter licenses.

## Decisions for reconstruction gaps

| Gap | Planned treatment |
| --- | --- |
| Austin DECWAR.INI outside imported subtree | The full repository supplies msc/decwar.ini and copies it into the runtime tape. Preserve it separately with provenance and use its actual commands for the default startup. Verify initialization, EOF, cancellation and file-absent behavior against the reconstructed run; do not borrow the C experience dialogue or invent default settings. |
| Archived help files differ | DECWAR.RNH describes ten ships; the served DECWAR.HLP correctly describes eighteen. Preserve both files; runtime HELP uses DECWAR.HLP. Executable Austin tables control the roster. |
| No committed standalone Austin linker map | First generate one with the supplied environment and exact source build. If unavailable, use the documented virtual-layout fallback, preserve known aliases and label unresolved address-sensitive paths. Do not invent an original map or make obtaining one an indefinite prerequisite to a playable release. |
| POINTS, TRACTR and other shared ambiguities | Recheck applicability and use narrowly documented playable decisions where needed; retain diagnostic visibility. No blanket zeroing or arithmetic exception suppression. |
| Austin lock/monitor repairs | Analyze the source's keys, retries, release-all and interruption boundaries. Preserve observable behavior in the host where practical; document changes needed to prevent hangs or corruption. Do not claim PDP-10 scheduling equivalence. |

## Completion criteria

The work is complete when a default launch provides a functioning eighteen-player
Austin game, explicit CompuServe launch retains its ten-player behavior, the
documented commands work from a fresh checkout, both snapshots remain unchanged,
and all applicable verification passes. Every known variant difference must be
implemented, shown irrelevant to the modern host with evidence, or covered by
a named and documented playable decision. Unresolved strict parity is reported
separately and does not turn the default into a nonfunctioning diagnostic game.

The first implementation step is the isolated reference build in milestone 0,
then source contracts and preservation of the current game while introducing
the variant context. No new external DECWAR sources,
general PDP-10 assembler, interface redesign, or live variant switching is needed.

## Implementation refinement: execution context

The shared engine now selects immutable data through read-only views scoped by
Node AsyncLocalStorage. The session factory supplies a context and explicitly
wraps every generator resume, cancellation and error transfer. This carries
configuration through existing FORTRAN statement helpers without changing every
helper signature. It refines the proposed explicit-argument plumbing; it does
not permit live variant changes or a mutable global selector. Interleaving and
async-isolation tests cover this boundary. Captured memory layouts belong to
the selected session; CompuServe retains its prior generated object identities.
Austin's behavior-specific bindings and their verification are recorded in austin-implementation.md.
