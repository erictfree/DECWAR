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
| Terminal | Streaming Telnet adapter, negotiated character delivery and echo, immediate ESC repeat, source application output, raw Ctrl-C and Telnet IP handling. See terminal fidelity limits below. |
| Storage | Separate default directories and variant/format markers; CompuServe word-file statistics and GRIPE persistence. Live galaxies are not saved across host restart. |
| Source evidence | Both supplied archives, independent generated variant data, and a pinned native Austin reference build are preserved. |

The [Austin implementation ledger](austin-implementation.md) accounts for the
18 changed matched FORTRAN units and material assembly differences. It distinguishes
connected changes from inactive source such as DSHIP. The production factory is
[src/runtime/game-session.ts](../src/runtime/game-session.ts); some of its binders
still live under test/fixtures and remain required runtime files.

## Experimental automated player

The [paired I/O harness](../experimental/parity/README.md) runs the existing
mode/dialogue capture suites against explicit TypeScript and PDP-10 endpoints,
retains raw wire evidence, and reports differences or incomplete captures.
September 8 native SIMH comparison completed 61 mode and 58 dialogue steps,
with successful login and logout on both backends: 93 command-echo-only matches,
20 world-dependent STATUS/SCAN differences and six leading-CRLF differences
on blank replies. Those differences remain in the reports. Docker deployment
remains unverified. The harness does not align world state or random draws.

The September 8 behavior suite also exercised invalid-coordinate and
impulse-range rejection, one-sector warp/impulse, and docking after independent
base approaches. All five source-relative state contracts and action responses
matched after command-echo removal. Both engines consumed eight displayed
energy units with shields raised; docking restored both ships to 5,000.
Evidence: logs/parity-behavior/retry/reviewed.json (source-contracts-v2).
The initial report is retained: reanalysis corrected a harness expectation
about invalid-coordinate rejection preserving a prior docked flag. Damaged
device repair, depleted ammunition, towing and broader movement remain unverified.

The reusable player-library quickstart is available at
[`experimental/player-library/QUICKSTART.md`](../experimental/player-library/QUICKSTART.md).
It documents the current Austin runner facade, public strategy contract,
observation reports, and validated action builders. The facade is transitional;
transport and runner extraction remain in progress.

[experimental/automated-player](../experimental/automated-player/README.md) contains
an external Austin captain that parses scans/reports, routes around obstacles,
patrols, uses phasers against observed enemy ships, selects resupply refuges,
repairs, docks and reenters after death within a configured life limit.
An optional `--stay-connected` mode keeps observing after the decision limit.
The experimental fleet launcher starts two bots per faction, retries selected
connection failures within shared budgets, records health/stalls, and quits its
bots at a duration limit, with balanced rosters of 4–10 bots. Late client timers receive one bounded grace period.
Real TCP-loss recovery and fleet shutdown are tested; a local process still
depends on its computer remaining available.
The captain combines default LIST reports with fresh SCANs to prioritize ship
targets and seek known enemy installations. It attacks base shields and enemy
planet builds from outside their defense radii. One fleet captain per faction
has an objective role that captures freshly confirmed neutral or unfortified
enemy planets and applies five builds to create a base when capacity permits.
In a disposable 600-second Austin run, both objective captains autonomously
found planets and issued CAPTURE and BUILD commands; a corrected 90-second run
confirmed ownership/build attribution only for the acting captain. Competitive
strength and coordinated team assignment remain open. An experimental
captain-v6 defender guards public LIST-reported friendly assets and alternates
watch periods with combat sorties. A new tournament harness runs fresh source
`TOURNAMENT` galaxies with paired seeds, swaps named strategies across factions, captures final POINTS
categories and reports fixed-time score leads with uncertainty. In its first
four-match captain-v6 comparison, balanced defense led once and the prior
objective strategy led three times; this is diagnostic evidence, not a win-rate
claim.
Controlled Telnet scenarios and a bounded two-captain patrol exercise these
capabilities. A 16-trial [tactical comparison](../experimental/automated-player/TRAINING.md)
added combat-reserve withdrawal and cautious approaches to distant enemies;
it measures bounded behavior, not competitive strength. The
[development plan](../experimental/automated-player/PLAN.md) describes reusable
code capabilities, tactical planning and match evaluation. Game runtime behavior
is unchanged; the experiment has separate test/typecheck commands.
Its source-ordered command matrix covers all 31 Austin public commands. Eighteen
are used automatically, five are verification/information commands, seven have
explicit future tactical roles, and GRIPE remains manual. TARGETS now confirms
SCAN ship locations before firing; captain-v8 adds conservative one-round
torpedoes. The opt-in v17 corridor guard (`--torpedo-corridor`) checks drift and travel beyond the target
against fresh SCAN cells, withholding torpedoes near collateral hazards or
unobserved space. It is a conservative tactical filter, not exact random-path
prediction. Deliberate star novas are disabled after a bounded battle demonstrated
off-target friendly nova damage despite a safe intended blast area. Radio
coordination now includes expiring fleet-local pursuit of teammate `TARGETS`
sightings, while local SCAN/TARGETS checks remain mandatory before firing.
TELL/RADIO message coordination and ENERGY/TRACTOR support are the next tactical slice. A four-match
direct-torpedo A/B test split 2–2 and was dominated by faction; a subsequent
paired-seed smoke test verified actual TOURNAMENT startup but is too short to
rank the policies. The Telnet client also recovers the verified Austin
`Coordinates:` retry with source-documented Ctrl-C.
Captain-v9 also gates direct torpedoes to range eight or closer based on
observed long-range miss rates; a fresh ten-ship run completed with one live
coordinate-retry recovery and no bot failures.
An experimental shared Telnet I/O capture runner now preserves initial modes,
records raw bytes and emits exact or explicitly echo-adjusted comparisons.
TypeScript checks cover 61 mode steps and 58 interactive dialogue steps;
native-reference coverage is tracked in
the experiment README and logs. This is partial comparison tooling, not a
completed differential audit.

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
  policy. Character delivery and echo are explicit modern monitor bindings;
  raw-name editing and all malformed/partial-input paths are not exhaustively
  verified. CR, CR-NUL, CRLF and LF keyboard Enter forms are supported.
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
