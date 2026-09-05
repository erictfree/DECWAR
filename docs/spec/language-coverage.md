# Generalized language conversion coverage

This record concerns the current book manifest. The older [source coverage
matrix](coverage.json) measures source analysis, not completion of this rewrite.
The distinction matters: retaining a researched rule in a companion file does
not make it a complete language-level definition in the assembled book.

## Converted command clauses

| Command | Grammar and semantic clause | Remaining dependencies |
| --- | --- | --- |
| SHIELDS | [SHIELDS](commands.md#shields) | Full tractor-release, session and response rules. |
| RADIO | [RADIO](commands.md#radio) | Message delivery and response rules. |
| ENERGY | [ENERGY](commands.md#energy) | Notification delivery, session and response rules. |
| DOCK | [DOCK](commands.md#dock) | Full report, concurrent world and response rules. |
| REPAIR | [REPAIR](commands.md#repair) | Full report, concurrent world and response rules. |
| SCAN, SRSCAN | [SCAN and SRSCAN](commands.md#scan-and-srscan) | Terminal rendering, concealed objects and interrupted output. |
| STATUS | [STATUS](commands.md#status) | Exact terminal presentation and multiplayer observations. |
| DAMAGES | [DAMAGES](commands.md#damages) | Exact terminal presentation and multiplayer observations. |

These clauses have been checked against the cited Austin routines and use
ordinary game-unit arithmetic. They are drafted clauses with explicit dependencies,
not complete end-to-end conformance claims.

## Remaining main-game commands

BASES, BUILD, CAPTURE, GRIPE, HELP, IMPULSE, LIST, MOVE, NEWS, PHASERS,
PLANETS, POINTS, QUIT, SET, SUMMARY, TARGETS, TELL, TIME,
TORPEDOS, TRACTOR, TYPE, USERS, *DEBUG and *PASSWORD still need complete converted
command clauses. Their grammar inventory remains in [grammar.md](grammar.md);
their older semantic analysis remains outside the book.

## Shared and variant work

- Abstract model: identities, quantities, roster, ships, installations and radio drafted;
  complete galaxy, lifecycle, preferences and score records remain.
- Lexical and command grammar: source-derived clauses retained with normalized
  numbers; malformed forms and some continuations still need complete productions.
- Turns: completion classes, automatic repair, pacing and accounting drafted;
  defense, combat, randomness and detailed interleavings remain.
- Sessions, admission, exit, controls and terminal presentation: conversion remains.
- CompuServe appendix: population, names, initial preferences and extra pregame
  commands introduced; remaining differences and complete command amendments remain.
- Examples: normalized shield, radio, energy, docking, repair, scan and report cases drafted;
  broader command, lifecycle and multiplayer cases remain.

No game code or legacy source is changed to conform to this draft.
