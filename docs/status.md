# Current implementation status

Reviewed September 5, 2026. **Playable TypeScript/Telnet alpha**, with Austin
reconstruction as the default and CompuServe as an explicit variant. A PDP-10
emulator is not required to run the port. See [running instructions](running.md).

The game is functional; complete historical/compiler/terminal equivalence is
not established. `--strict` selects a diagnostic profile with unresolved paths,
not a certified fidelity level. The [playable decisions](playable-decisions.md)
identify the repairs enabled for ordinary play.

## What is available

| Area | Current behavior |
| --- | --- |
| Austin | 18 player ships, 9 per side, 20 initial planets; startup executes the preserved DECWAR.INI. |
| CompuServe | 10 player ships, 5 per side, 60 initial planets; experience selection and persistent standings retained. |
| Gameplay | Command parsing/abbreviations, scans and reports, movement, phasers/torpedoes, shields, repair, energy, tractor beams, radio/messages, capture, construction, docking and scoring are connected to the session runtime. |
| Multiplayer lifecycle | Shared galaxies, full-galaxy rollover, normal quit, death, disconnect cleanup, ship reuse and game-over. |
| Terminal | Streaming Telnet adapter, source application output, raw Ctrl-C and Telnet IP handling. See the documented client/echo limitations below. |
| Storage | Separate default directories and variant/format markers; CompuServe word-file statistics and GRIPE persistence. Live galaxies are not saved across host restart. |
| Source evidence | Both supplied archives, independent generated variant data, and a pinned native Austin reference build are preserved. |

The [Austin implementation ledger](austin-implementation.md) accounts for the
18 changed matched FORTRAN units and material assembly differences. It distinguishes
connected changes from inactive source such as DSHIP. The production factory is
[src/runtime/game-session.ts](../src/runtime/game-session.ts); some of its binders
still live under test/fixtures and remain required runtime files.

## Verification

At commit `31d34e4`, a clean snapshot containing only staged repository files
installed under Node 24 and passed both archive/generated-data audits, strict
TypeScript checking and **4,563 tests**. Subsequent changes through `87977cb`
were documentation only. This is a dated checkpoint, not a permanent test count.

The exercised scenarios include:

- All 18 Austin ships, nine per side; concurrent reports; a nineteenth captain
  entering a new galaxy while existing captains retain their original one.
- Eighteen simultaneous TCP/Telnet clients, messages, Ctrl-C/IP, quit and cleanup.
- All 720 Austin hit entries, sender-local overwrite behavior and bit 18 delivery.
- Slot-18 phaser destruction, death cleanup, ship reuse, disconnect and game-over.
- Live movement, capture, building and docking with staged encounters and real
  parsing, arithmetic, turn accounting and waits.
- CompuServe regression behavior and persistence; both CLI variants; rejection
  of incompatible storage; context isolation between variants.

Run `npm run check` to reproduce the current checks. The [work log](../WORK_LOG.md)
records the commands and outcomes; bulk log files remain local. Passing these
checks validates source-derived expectations, not original-executable equivalence.

The separately rebuilt PDP-10 game admitted Yorktown and Wolf, executed its INI,
showed STATUS, completed QUIT, and produced a Yorktown SCAN 10 transcript. Those
are preserved reference observations. There is no complete automated differential
comparison between the native game and the port.

## Remaining limits

- **Compiler and machine behavior:** supported arithmetic paths use explicit
  PDP-10 word operations. Complete instruction coverage, compiler evaluation/
  aliasing behavior, abnormal operands and trap continuations remain unresolved.
  The Austin reference uses FORTRAN 6; the inspected language manual is version 5.
- **Playable repairs:** POINTS final entry/zero averages, TRACTR's missing argument,
  LIST's uninitialized word and pending control flow use documented policies.
  Diagnostic mode can stop before cleanup or leave a reserved ship.
- **Terminal fidelity:** the source defines TTY calls, not a complete Telnet wire
  policy. Echo negotiation, raw-name editing and all malformed/partial-input
  paths are not exhaustively verified. Clients should send LF or CRLF for Enter.
- **Concurrency:** tests are bounded. Long-duration load, adversarial lock
  contention and interrupt delivery at every possible instruction are unverified.
- **Host bindings:** scheduling, clocks, monitor resources, persistence and some
  private addresses are modern implementations with documented limits.
- **Source understanding:** inventories, unit matches and test counts are not
  an exhaustive semantic review of every source path.

These remain fidelity work; they do not imply that the connected game commands
are still waiting to be implemented. See [architecture](architecture.md),
[platform evidence](platform-manuals.md) and the [decision record](decisions.md).

## Reading older records

Earlier milestones and their then-open dependencies are retained in
[implementation history](history/implementation-progress.md) and WORK_LOG.md.
The [source study](source-study.md), [compatibility findings](compatibility.md)
and [decision record](decisions.md) began with CompuServe and retain chronological
entries. Their scope notes identify the current documents that supersede old
integration-status statements. They remain useful evidence, not an alternate
current-status page.
