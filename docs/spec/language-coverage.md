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
| STATUS | [STATUS](commands.md#status): ADT operation contract and ordered field presentation. | Full terminal controls and multiplayer observations. |
| DAMAGES | [DAMAGES](commands.md#damages): ADT operation contract, title observation and row presentation. | Full terminal controls and multiplayer observations. |
| TRACTOR | [TRACTOR](commands.md#tractor): ADT operation contract. | Occupied trailing sectors, concurrent acquisition and responses. |
| MOVE, IMPULSE | [MOVE and IMPULSE](commands.md#move-and-impulse): ADT operation contract. | Crowded towing, concurrent relocation, random distributions and responses. |
| BUILD | [BUILD](commands.md#build): ADT operation contract. | Planet-update availability, conversion/world-end ordering and responses. |
| CAPTURE | [CAPTURE](commands.md#capture): explicit ADT operation contract. | Surrender-refusal conditions, final lifecycle and responses; former-faction docking ordering is specified. |
| PHASERS | [PHASERS](commands.md#phasers): ADT operation contract. | Concurrent target changes, random distributions and complete delivery/presentation. |
| TORPEDOS | [TORPEDOS](commands.md#torpedos): ADT operation contract. | Malformed continuations, concurrent target changes and complete delivery/presentation. |
| LIST, SUMMARY, BASES, PLANETS, TARGETS | [Galaxy reports](commands.md#list-summary-bases-planets-and-targets): ADT operation contract. | Exhaustive selector-order coverage, concurrent reporting, interrupted output, grouped separators and terrain/absence presentation. |
| POINTS | [POINTS](commands.md#points): ADT operation contract. | Zero-denominator presentation, concurrent counts and terminal formatting. |
| TYPE | [TYPE](commands.md#type): ADT operation contract. | Unselected terminal profile, concurrent observations and full terminal controls. |
| TIME | [TIME](commands.md#time): ADT operation contract. | Environment clock/accounting binding and unavailable origins. |
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
  message publication/reception/discard use explicit contracts. Compact type-record
  declarations, tagged result alternatives, Map/List/Set/Optional/Result and the
  distinction between local assignment and game-state updates are explicit. The
  updated guide uses C-family blocks, colon return types, named variant fields,
  assignment =, equality ==, and requires/ensures/invariant contracts. Failure
  aliases preserve the declared rejection and cancellation paths. Full definition
  order and invariant coverage remain under review. World
  collections now distinguish unordered identity sets from the ordered planet
  sequence, with identity uniqueness and stable surviving planet order. Mapping/property notation,
  the nine device states and their distinction from hull damage and shield state
  are defined explicitly. Phaser-bank identities and independent deadlines are
  defined separately from shared device damage. Report groups, admissions, telemetry and summary observations, terminal profiles and world-ended state, token categories, acquired-line/command input values, radio service and message observations, scan marks/rows,
  ordered status observations, device-damage rows, type/time/user observations, typed score columns/rows and ratio operands,
  session reporting metadata and commission clock baselines are defined. Sector objects, geometric points/vectors, PathResult,
  symmetric beam membership and fixed base-identity order are defined. Shared
  AttackSource/DamageTarget, WeaponHit/BaseHitResolution/RomulanHit and displacement
  result types separate target state, credited damage and report observations. The main-command clauses use that form; shared operations and their dependencies
  still require review. Identities, quantities,
  roster, installations, radio, tractor associations, preferences and score
  categories drafted; full lifecycle remains.
- Lexical and command grammar: ResolveLocations/ReadLocations now define typed
  scalar/position results, arity/type/range precedence, computed target validation
  and speed delay, including blank versus mode-only continuations. Shared grammar
  vocabulary distinguishes token categories, candidate names, raw text fragments
  and input boundaries. All 100 current productions reference defined productions
  or one of 12 explicit terminal categories; the build checks this and grouping.
  That reference check does not establish complete input acceptance. Malformed
  torpedo forms and exceptional zero-item caller paths still need complete rules.
- Turns: CompleteTurn, CommitPendingScore, automatic-repair selection, DefenseContext
  and life-support observations now use explicit contracts. Completion classes, pacing, base and planet
  defense and base replenishment drafted. Installation eligibility during HELP/GRIPE
  and the Romulan context's triggering-faction notice audience are specified;
  detailed interleavings remain.
- Shared world rules: typed path, beam, PhaserHit/TorpedoHit, ship/base damage,
  score-credit, Romulan-hit and Displace contracts now connect to their callers.
  NovaContext/NovaHit, NovaImpact/ExplodeStar and RemovePlanet now define
  chain ordering, distinct score/report effects and world-end propagation.
  Fatal-target weapon caller reports and complete concurrent world-end ordering remain.
  Maintained base/owned-planet counts and ReevaluateDocking are explicit;
  construction reuses a fixed base identity and updates counts before activation.
- Autonomous Romulan: persistent activity state, cadence, appearance, target
  ranking/ties, pursuit/avoidance, weapon deadlines, phasers, torpedo bursts,
  star aiming, accidental planet hits and follow-up defenses drafted in
  [the autonomous chapter](autonomous.md). Empty or all-distant target selection,
  concurrent/invalid sector states and interruptions
  remain unresolved. The target-domain limit is not a new pursuit-radius rule.
- Randomness: ideal distributions, conditional probabilities, draw ownership,
  random-event replay and tournament-key reproducibility are explicit. Finite
  binding acceptance and complete multiplayer/control event ordering remain.
- Communication: CombatNoticeService defines immutable observations, forty-notice
  capacity per publisher, delivery priority, oldest-publication eviction,
  reception/discard, delivery-time base-radio suppression and hit-before-radio
  drain order. Star, torpedo-outcome, base, Romulan-appearance, energy-transfer
  and tractor observation values are explicit. ImpactObservation composes typed
  ship/base/planet/Romulan snapshots with the weapon/nova results, including
  ownership-at-impact, displacement positions and recipient-specific critical
  details. Complete terminal catalogue and concurrency remain. Radio message identities, recipient filtering, publication order,
  capacity loss, consumption and gagging drafted. Autonomous speech's ungag effect
  on the triggering captain is specified; complete interleavings remain.
- Sessions: startup, pregame ACTIVATE and *ZAP, entry-name acquisition and reuse,
  admission, faction/ship selection,
  galaxy creation, initialization commands, HELP/GRIPE activity, release and
  world termination drafted. Nonprinting entry-name input and raw-input control
  delivery, pregame SET NAME, administrative schema/write failures, concurrent claims/cancellation,
  destroyed-base spawn exclusions, reused action-phase state, resume, full
  control behavior and terminal presentation remain.
- Terminal presentation: a new included chapter defines PresentationContext,
  FormatNumber/FormatLocation, display-only precision, labels, prompts and ordinary
  line/column composition. Combat bodies now compose the typed observations,
  including recipient-specific critical detail, Romulan deflection wording,
  base emergency paragraphs and exact spacing. Radio headings preserve the original
  audience and retain their body-ending blank line. STATUS fields, DAMAGES headings/rows,
  TIME durations, TYPE preference/option lines and complete scan-grid axes/rows
  now compose their typed report values. LIST-family detail and summary lines
  use recorded affiliation and visible telemetry; grouped separators and terrain/absence
  output still need complete rules. Complete control/transport behavior
  and remaining command/report recipes still remain; the source-analysis terminal
  chapter stays outside the book.
- Information resources: help topic sections, news continuation boundaries and
  feedback records drafted; complete headers and storage-failure bindings remain.
- CompuServe appendix: population, names, explicit initial preferences and selection,
  startup versus pregame matching, DOCUMENT effects, HONORROLL entry/continuation,
  Ctrl-G behavior, speech probabilities, autonomous audiences and their silent
  validation are specified. Full standings, Romulan direct replies, privilege,
  lifecycle/concurrency and presentation
  amendments remain. Separate CompuServe examples cover the new clauses.
- Examples: resources, scans/reports, tractor, movement, construction, capture,
  phaser, torpedo, nova, defense, report visibility, knowledge, scoring, preferences
  communication and autonomous activity cases drafted;
  broader command, lifecycle and multiplayer cases remain.

No game code or legacy source is changed to conform to this draft.
