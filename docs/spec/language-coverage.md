# Generalized language conversion coverage

This record concerns the current book manifest. The older [source coverage
matrix](coverage.json) measures source analysis, not completion of this rewrite.
The distinction matters: retaining a researched rule in a companion file does
not make it a complete language-level definition in the assembled book.

## Converted command clauses

Twenty-nine of the 33 main-game commands now have converted clauses. The
remaining dependencies below still limit end-to-end conformance claims.

| Command | Grammar and semantic clause | Remaining dependencies |
| --- | --- | --- |
| SHIELDS | [SHIELDS](commands.md#shields) | Session and complete response rules. |
| RADIO | [RADIO](commands.md#radio) | Message delivery and response rules. |
| ENERGY | [ENERGY](commands.md#energy) | Notification delivery, session and response rules. |
| DOCK | [DOCK](commands.md#dock) | Full report, concurrent world and response rules. |
| REPAIR | [REPAIR](commands.md#repair) | Full report, concurrent world and response rules. |
| SCAN, SRSCAN | [SCAN and SRSCAN](commands.md#scan-and-srscan) | Terminal rendering, concealed objects and interrupted output. |
| STATUS | [STATUS](commands.md#status) | Exact terminal presentation and multiplayer observations. |
| DAMAGES | [DAMAGES](commands.md#damages) | Exact terminal presentation and multiplayer observations. |
| TRACTOR | [TRACTOR](commands.md#tractor) | Occupied trailing sectors, concurrent acquisition and responses. |
| MOVE, IMPULSE | [MOVE and IMPULSE](commands.md#move-and-impulse) | Crowded towing, concurrent relocation, random distributions and responses. |
| BUILD | [BUILD](commands.md#build) | Planet-update availability, conversion/world-end ordering and responses. |
| CAPTURE | [CAPTURE](commands.md#capture): explicit ADT operation contract. | Surrender-refusal conditions, former-faction docking, final lifecycle and responses. |
| PHASERS | [PHASERS](commands.md#phasers) | Concurrent target changes, random distributions and complete delivery/presentation. |
| TORPEDOS | [TORPEDOS](commands.md#torpedos) | Malformed continuations, concurrent target changes and complete delivery/presentation. |
| LIST, SUMMARY, BASES, PLANETS, TARGETS | [Galaxy reports](commands.md#list-summary-bases-planets-and-targets) | Mixed selector edge cases, label aggregation, concurrent reporting and terminal presentation. |
| POINTS | [POINTS](commands.md#points) | Initial lifecycle counts, zero-denominator presentation and terminal formatting. |
| TYPE | [TYPE](commands.md#type) | Complete preference/session definitions and terminal formatting. |
| TIME | [TIME](commands.md#time) | Environment clock/accounting binding and duration formatting. |
| USERS | [USERS](commands.md#users) | Session metadata binding, admission interleavings and terminal formatting. |
| SET | [SET](commands.md#set) | Unselected terminal profile, nonprinting name characters, world termination and responses. |
| TELL | [TELL](commands.md#tell) | Full multiplayer publication/receipt conditions and terminal presentation. |
| *PASSWORD | [*PASSWORD](commands.md#password) | Complete session privilege lifecycle. |
| *DEBUG | [*DEBUG](commands.md#debug) | Instrumentation selection and environment timing binding. |

These clauses have been checked against the cited Austin routines and use
ordinary game-unit arithmetic. They are drafted clauses with explicit dependencies,
not complete end-to-end conformance claims.

## Remaining main-game commands

GRIPE, HELP, NEWS and QUIT still need complete converted
command clauses. Their grammar inventory remains in [grammar.md](grammar.md);
their older semantic analysis remains outside the book.

## Shared and variant work

- Abstract model: game-state ADT and operation-contract notation introduced;
  CAPTURE and message publication/reception use explicit contracts. Existing
  command pseudocode still needs conversion to that form. Identities, quantities,
  roster, installations, radio, tractor associations, preferences and score
  categories drafted; full lifecycle remains.
- Lexical and command grammar: source-derived clauses retained with normalized
  numbers; malformed forms and some continuations still need complete productions.
- Turns: completion classes, automatic repair, pacing, accounting, base and planet
  defense and base replenishment drafted; Romulan actions, randomness and detailed
  interleavings remain.
- Shared world rules: path geometry, beam release/following, phaser damage,
  torpedo damage, blast displacement, novas, Romulan weapon damage and installation
  transitions drafted; complete Romulan actions and world-end ordering remain.
- Communication: message identities, recipient filtering, publication order,
  capacity loss, consumption and gagging drafted. Complete interleavings and
  autonomous speech's effects on captain preferences remain.
- Sessions, admission, exit, controls and terminal presentation: conversion remains.
- CompuServe appendix: population, names, initial preferences and extra pregame
  commands introduced; remaining differences and complete command amendments remain.
- Examples: resources, scans/reports, tractor, movement, construction, capture,
  phaser, torpedo, nova, defense, report visibility, knowledge, scoring, preferences
  and communication cases drafted;
  broader command, lifecycle and multiplayer cases remain.

No game code or legacy source is changed to conform to this draft.
