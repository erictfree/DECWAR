# Generalized language conversion coverage

This record concerns the current book manifest. The older [source coverage
matrix](coverage.json) measures source analysis, not completion of this rewrite.
The distinction matters: retaining a researched rule in a companion file does
not make it a complete language-level definition in the assembled book.

## Converted command clauses

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
| CAPTURE | [CAPTURE](commands.md#capture) | Planet-update availability, final lifecycle and responses. |
| PHASERS | [PHASERS](commands.md#phasers) | Concurrent target changes, random distributions and complete delivery/presentation. |
| TORPEDOS | [TORPEDOS](commands.md#torpedos) | Malformed continuations, concurrent target changes and complete delivery/presentation. |

These clauses have been checked against the cited Austin routines and use
ordinary game-unit arithmetic. They are drafted clauses with explicit dependencies,
not complete end-to-end conformance claims.

## Remaining main-game commands

BASES, GRIPE, HELP, LIST, NEWS, PLANETS, POINTS, QUIT, SET, SUMMARY, TARGETS,
TELL, TIME, TYPE, USERS, *DEBUG and *PASSWORD still need complete converted
command clauses. Their grammar inventory remains in [grammar.md](grammar.md);
their older semantic analysis remains outside the book.

## Shared and variant work

- Abstract model: identities, quantities, roster, ships, installations, radio,
  tractor associations and score categories drafted; full lifecycle/preferences remain.
- Lexical and command grammar: source-derived clauses retained with normalized
  numbers; malformed forms and some continuations still need complete productions.
- Turns: completion classes, automatic repair, pacing, accounting, base and planet
  defense and base replenishment drafted; Romulan actions, randomness and detailed
  interleavings remain.
- Shared world rules: path geometry, beam release/following, phaser damage,
  torpedo damage, blast displacement, novas, Romulan weapon damage and installation
  transitions drafted; complete Romulan actions and world-end ordering remain.
- Sessions, admission, exit, controls and terminal presentation: conversion remains.
- CompuServe appendix: population, names, initial preferences and extra pregame
  commands introduced; remaining differences and complete command amendments remain.
- Examples: resources, scans/reports, tractor, movement, construction, capture,
  phaser, torpedo, nova, defense and path cases drafted;
  broader command, lifecycle and multiplayer cases remain.

No game code or legacy source is changed to conform to this draft.
