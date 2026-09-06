# Generalized language conversion coverage

This record concerns the current book manifest. The older [source coverage
matrix](coverage.json) measures source analysis, not completion of this rewrite.
The distinction matters: retaining a researched rule in a companion file does
not make it a complete language-level definition in the assembled book.

## Converted command clauses

All 33 main-game commands now have drafted grammar and ADT operation contracts. The
remaining dependencies below still limit end-to-end conformance claims.

| Command | Grammar and semantic clause | Remaining dependencies |
| --- | --- | --- |
| SHIELDS | [SHIELDS](commands.md#shields): ADT operation contract. | Session and complete response rules. |
| RADIO | [RADIO](commands.md#radio): ADT operation contract. | Message delivery and response rules. |
| ENERGY | [ENERGY](commands.md#energy): ADT operation contract. | Notification delivery, session and response rules. |
| DOCK | [DOCK](commands.md#dock): ADT operation contract. | Full report, concurrent world and response rules. |
| REPAIR | [REPAIR](commands.md#repair): ADT operation contract. | Full report, concurrent world and response rules. |
| SCAN, SRSCAN | [SCAN and SRSCAN](commands.md#scan-and-srscan): ADT operation contract. | Full transport/control delivery and concurrent installation changes. |
| STATUS | [STATUS](commands.md#status): ADT operation contract. | Exact terminal presentation and multiplayer observations. |
| DAMAGES | [DAMAGES](commands.md#damages): ADT operation contract. | Exact terminal presentation and multiplayer observations. |
| TRACTOR | [TRACTOR](commands.md#tractor): ADT operation contract. | Occupied trailing sectors, concurrent acquisition and responses. |
| MOVE, IMPULSE | [MOVE and IMPULSE](commands.md#move-and-impulse): ADT operation contract. | Crowded towing, concurrent relocation, random distributions and responses. |
| BUILD | [BUILD](commands.md#build): ADT operation contract. | Planet-update availability, conversion/world-end ordering and responses. |
| CAPTURE | [CAPTURE](commands.md#capture): explicit ADT operation contract. | Surrender-refusal conditions, final lifecycle and responses; former-faction docking ordering is specified. |
| PHASERS | [PHASERS](commands.md#phasers): ADT operation contract. | Concurrent target changes, random distributions and complete delivery/presentation. |
| TORPEDOS | [TORPEDOS](commands.md#torpedos): ADT operation contract. | Malformed continuations, concurrent target changes and complete delivery/presentation. |
| LIST, SUMMARY, BASES, PLANETS, TARGETS | [Galaxy reports](commands.md#list-summary-bases-planets-and-targets): ADT operation contract. | Exhaustive selector-order coverage, concurrent reporting, interrupted output and terminal presentation. |
| POINTS | [POINTS](commands.md#points): ADT operation contract. | Zero-denominator presentation, concurrent counts and terminal formatting. |
| TYPE | [TYPE](commands.md#type): ADT operation contract. | Unselected terminal profile, concurrent observations and terminal formatting. |
| TIME | [TIME](commands.md#time): ADT operation contract. | Environment clock/accounting binding and duration formatting. |
| USERS | [USERS](commands.md#users): ADT operation contract. | Session metadata binding, admission interleavings and terminal formatting. |
| SET | [SET](commands.md#set): ADT operation contract. | Unselected terminal profile, nonprinting name characters, world termination and responses. |
| TELL | [TELL](commands.md#tell): ADT operation contract. | Full multiplayer publication/receipt conditions and terminal presentation. |
| *PASSWORD | [*PASSWORD](commands.md#password): ADT operation contract. | Complete session privilege lifecycle. |
| *DEBUG | [*DEBUG](commands.md#debug): ADT operation contract. | Instrumentation selection and environment timing binding. |
| HELP | [HELP](commands.md#help): ADT operation contract. | Concurrent temporary-sector effects, complete text/presentation binding. |
| NEWS | [NEWS](commands.md#news): ADT operation contract. | Full control/terminal binding and environment resource failures. |
| GRIPE | [GRIPE](commands.md#gripe): ADT operation contract. | Context rendering, partial storage failures and concurrent temporary-sector effects. |
| QUIT | [QUIT](commands.md#quit): ADT operation contract. | Final ratios/report failures, admission/release interleavings and environment continuation. |


These clauses have been checked against the cited Austin routines and use
ordinary game-unit arithmetic. They are drafted clauses with explicit dependencies,
not complete end-to-end conformance claims.

## Remaining command work

A clause for every command is not a complete command specification. Review the
contracts together, close the dependencies above, and
complete the remaining startup/admission edge cases and environment bindings. Command
coverage does not establish lifecycle, concurrency or terminal conformance.

## Shared and variant work

- Abstract model: game-state ADT and operation-contract notation introduced;
  SHIELDS, RADIO, ENERGY, DOCK, REPAIR, SCAN, SRSCAN, STATUS, DAMAGES,
  TRACTOR, MOVE, IMPULSE, BUILD, CAPTURE,
  PHASERS, TORPEDOS, LIST, SUMMARY, BASES, PLANETS, TARGETS, POINTS, TYPE, TIME, USERS, SET, TELL, *PASSWORD, *DEBUG, HELP, NEWS, GRIPE, QUIT and
  message publication/reception/discard use explicit contracts. Mapping/property notation,
  the nine device states and their distinction from hull damage and shield state
  are defined explicitly. Phaser-bank identities and independent deadlines are
  defined separately from shared device damage. Report groups, admissions, telemetry and summary observations, terminal profiles and world-ended state, token categories, acquired-line/command input values, radio service and message observations, scan marks/rows,
  ordered status observations, device-damage rows, type/time/user observations, typed score columns/rows and ratio operands,
  session reporting metadata and commission clock baselines are defined. Sector objects, geometric points/vectors, PathResult,
  symmetric beam membership and fixed base-identity order are defined. The main-command clauses use that form; shared operations and their dependencies
  still require review. Identities, quantities,
  roster, installations, radio, tractor associations, preferences and score
  categories drafted; full lifecycle remains.
- Lexical and command grammar: source-derived clauses retained with normalized
  numbers; malformed forms and some continuations still need complete productions.
- Turns: completion classes, automatic repair, pacing, accounting, base and planet
  defense and base replenishment drafted. Installation eligibility during HELP/GRIPE
  and the Romulan context's triggering-faction notice audience are specified;
  randomness and detailed interleavings remain.
- Shared world rules: typed path results and beam release/following contracts, phaser damage,
  torpedo damage, blast displacement, novas, Romulan weapon damage and installation
  transitions drafted; complete shared-operation contracts and world-end ordering remain.
- Autonomous Romulan: persistent activity state, cadence, appearance, target
  ranking/ties, pursuit/avoidance, weapon deadlines, phasers, torpedo bursts,
  star aiming, accidental planet hits and follow-up defenses drafted in
  [the autonomous chapter](autonomous.md). Empty or all-distant target selection,
  full random distributions, concurrent/invalid sector states and interruptions
  remain unresolved. The target-domain limit is not a new pursuit-radius rule.
- Communication: message identities, recipient filtering, publication order,
  capacity loss, consumption and gagging drafted. Autonomous speech's ungag effect
  on the triggering captain is specified; complete interleavings remain.
- Sessions: startup, pregame ACTIVATE and *ZAP, entry-name acquisition and reuse,
  admission, faction/ship selection,
  galaxy creation, initialization commands, HELP/GRIPE activity, release and
  world termination drafted. Nonprinting entry-name input and raw-input control
  delivery, pregame SET NAME, administrative schema/write failures, concurrent claims/cancellation,
  destroyed-base spawn exclusions, reused action-phase state, resume, full
  control behavior and terminal presentation remain.
- Information resources: help topic sections, news continuation boundaries and
  feedback records drafted; complete headers and storage-failure bindings remain.
- CompuServe appendix: population, names, initial preferences and extra pregame
  commands introduced; remaining differences and complete command amendments remain.
- Examples: resources, scans/reports, tractor, movement, construction, capture,
  phaser, torpedo, nova, defense, report visibility, knowledge, scoring, preferences
  communication and autonomous activity cases drafted;
  broader command, lifecycle and multiplayer cases remain.

No game code or legacy source is changed to conform to this draft.
