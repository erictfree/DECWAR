# Evidence and coverage

This appendix is informative. It tracks how the draft was derived; it does not
make incomplete sections normative by referring readers back to executable code.

## Evidence hierarchy

Austin source is pinned at f78f2ec733999617e4281ba3ed967bff8cd5d8f8. Executable
statements establish core behavior. Supplied comments/help, recorded native
observations and the TypeScript port provide separate corroboration or questions.
CPU/compiler manuals may establish applicable numeric/platform operations, but
supply no game rules. The CompuServe source supports its appendix, not substitutions
for missing Austin rules. See [provenance](../../legacy/README.md).

Each normative clause carries physical source links. A source review means its
cited statements were inspected; it is not a full independent verification or a
native differential test. No completed conformance suite exists yet.

## Main command coverage

All 33 main dispatch slots are inventoried directly from Austin's DATA table and
main dispatch. A grammar reference identifies drafted forms and any stated limits,
not exhaustive malformed-input coverage. A draft semantic reference identifies
written rules with the limits stated in that clause; it does not claim full review.
Examples identify source-derived scenarios, not executed native comparisons. Machine-readable tracking is retained in
[coverage.json](coverage.json).

| Slot | Source name | Grammar | Detailed semantics | Examples |
| --- | --- | --- | --- | --- |
| 1 | BASES | GRAM-11 | draft: GAME-LIST | pending |
| 2 | BUILD | GRAM-4 | draft: GAME-BUILD | pending |
| 3 | CAPTURE | GRAM-4 | draft: GAME-CAPTURE | pending |
| 4 | DAMAGES | GRAM-10 | draft: GAME-REPORTS | pending |
| 5 | DOCK | GRAM-7 | draft: GAME-DOCK | pending |
| 6 | ENERGY | GRAM-7 | draft: GAME-ENERGY | pending |
| 7 | GRIPE | GRAM-12 | pending | pending |
| 8 | HELP | GRAM-12 | pending | pending |
| 9 | IMPULSE | GRAM-4 | draft: GAME-MOVE | pending |
| 10 | LIST | GRAM-11 | draft: GAME-LIST | pending |
| 11 | MOVE | GRAM-4 | draft: GAME-MOVE | pending |
| 12 | NEWS | GRAM-12 | pending | pending |
| 13 | PHASERS | GRAM-5 | draft: GAME-PHASERS | pending |
| 14 | PLANETS | GRAM-11 | draft: GAME-LIST | pending |
| 15 | POINTS | GRAM-10 | draft: GAME-POINTS | pending |
| 16 | QUIT | GRAM-9 | pending | pending |
| 17 | RADIO | GRAM-8 | draft: GAME-RADIO | pending |
| 18 | REPAIR | GRAM-7 | draft: GAME-REPAIR | EX-REPAIR-01 |
| 19 | SCAN | GRAM-6 | draft: GAME-SCAN | EX-SCAN-01 |
| 20 | SET | GRAM-8 | draft: GAME-REPORTS | pending |
| 21 | SHIELDS | GRAM-7 | draft: GAME-SHIELD | EX-SHIELD-01–04 |
| 22 | SRSCAN | GRAM-6 | draft: GAME-SCAN | pending |
| 23 | STATUS | GRAM-10 | draft: GAME-REPORTS | pending |
| 24 | SUMMARY | GRAM-11 | draft: GAME-LIST | pending |
| 25 | TARGETS | GRAM-11 | draft: GAME-LIST | pending |
| 26 | TELL | GRAM-12 | draft: GAME-RADIO | pending |
| 27 | TIME | GRAM-10 | draft: GAME-REPORTS | pending |
| 28 | TORPEDOS | GRAM-5 | draft: GAME-TORPEDO | pending |
| 29 | TRACTOR | GRAM-7 | draft: GAME-TRACTOR | pending |
| 30 | TYPE | GRAM-10 | pending | pending |
| 31 | USERS | GRAM-10 | draft: GAME-REPORTS | pending |
| 32 | *DEBUG | GRAM-13 | pending | pending |
| 33 | *PASSWORD | GRAM-13 | pending | pending |

## Pregame coverage

The FORTRAN table contains 16 slots, of which 14 are named. Slots 2 and 5 are
blank and unmatchable. GRAM-2 records dispatch; command-specific pregame effects
still require review. The initial HELP/PREGAME/empty dialogue is separate.

| Slot | Source name | Status |
| --- | --- | --- |
| 1 | ACTIVATE | Arguments/effects pending |
| 2 | (blank) | Unmatchable; no invented command |
| 3 | GRIPE | Arguments/effects pending |
| 4 | HELP | Arguments/effects pending |
| 5 | (blank) | Unmatchable; no invented command |
| 6 | NEWS | Arguments/effects pending |
| 7 | POINTS | Arguments/effects pending |
| 8 | QUIT | Arguments/effects pending |
| 9 | SET | Arguments/effects pending |
| 10 | SUMMARY | Arguments/effects pending |
| 11 | TIME | Arguments/effects pending |
| 12 | TYPE | Arguments/effects pending |
| 13 | USERS | Arguments/effects pending |
| 14 | *DEBUG | Arguments/effects pending |
| 15 | *PASSWORD | Arguments/effects pending |
| 16 | *ZAP | Arguments/effects pending |

## Section review status

| Area | Current scope | Remaining work |
| --- | --- | --- |
| Lexical | Character table, line reader, ordinary token categories and matcher read directly | REAL-token retention, capacity edges, numeric model and control paths |
| Grammar | Main/pregame dispatch, locations and all 33 main command forms drafted | Pregame differences, malformed forms, prompt/output linkage |
| State | World/ship/session domains, roster, distance and ordinary integer units | Finite numeric model, aliases and complete transition invariants |
| Execution | Main return paths, accounting, hit/radio queues, recipient sets and exclusion classes | Interruptions, queue edge cases and adversarial interleavings |
| Randomness | Generator, seeding and initial placement draw order | Per-command draw ledger and reproducible vectors |
| Session | Admission, options, team/ship selection, release and termination drafted | Raw-name boundaries, identity, reentry and concurrency details |
| Gameplay | Resources, scans, traversal, combat, installations, novas, Romulan, LIST and reports drafted | Combat notifications, numeric execution and exact scoring; review failure effects |
| Terminal | Prompts, numeric/coordinate fields and scan cells/axes drafted | Exhaustive output catalogue and per-command assembly, extreme fields and controls |
| Conformance | Claim boundaries and 23 source-derived scenarios drafted | Every remaining command family, native comparisons and a reusable verifier |
| CompuServe appendix | Nine amendment/scope clauses drafted from both sources | Full persistence, TELL and locking/alias effects; align with remaining core clauses |

The draft cannot support a complete game implementation yet. Compilation into
one document verifies document structure; it does not establish semantic completeness.
