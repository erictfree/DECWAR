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
| 1 | BASES | GRAM-11 | draft: GAME-LIST | EX-BASES-01 |
| 2 | BUILD | GRAM-4 | draft: GAME-BUILD | EX-BUILD-01 |
| 3 | CAPTURE | GRAM-4 | draft: GAME-CAPTURE | EX-CAPTURE-01 |
| 4 | DAMAGES | GRAM-10 | draft: GAME-REPORTS | EX-DAMAGE-01 |
| 5 | DOCK | GRAM-7 | draft: GAME-DOCK | EX-DOCK-01 |
| 6 | ENERGY | GRAM-7 | draft: GAME-ENERGY | EX-ENERGY-01 |
| 7 | GRIPE | GRAM-12 | draft: GAME-GRIPE | EX-GRIPE-01 |
| 8 | HELP | GRAM-12 | draft: GAME-HELP | EX-HELP-01/02 |
| 9 | IMPULSE | GRAM-4 | draft: GAME-MOVE | EX-IMPULSE-01 |
| 10 | LIST | GRAM-11 | draft: GAME-LIST | EX-LIST-01 |
| 11 | MOVE | GRAM-4 | draft: GAME-MOVE | EX-MOVE-01 |
| 12 | NEWS | GRAM-12 | draft: GAME-NEWS | EX-NEWS-01 |
| 13 | PHASERS | GRAM-5 | draft: GAME-PHASERS | EX-PHASER-01 |
| 14 | PLANETS | GRAM-11 | draft: GAME-LIST | EX-PLANETS-01 |
| 15 | POINTS | GRAM-10 | draft: GAME-POINTS | EX-POINTS-01 |
| 16 | QUIT | GRAM-9 | draft: SESSION-4 | EX-QUIT-01 |
| 17 | RADIO | GRAM-8 | draft: GAME-RADIO | EX-RADIO-02 |
| 18 | REPAIR | GRAM-7 | draft: GAME-REPAIR | EX-REPAIR-01 |
| 19 | SCAN | GRAM-6 | draft: GAME-SCAN | EX-SCAN-01 |
| 20 | SET | GRAM-8 | draft: GAME-REPORTS | EX-SET-01 |
| 21 | SHIELDS | GRAM-7 | draft: GAME-SHIELD | EX-SHIELD-01–04 |
| 22 | SRSCAN | GRAM-6 | draft: GAME-SCAN | EX-SRSCAN-01 |
| 23 | STATUS | GRAM-10 | draft: GAME-REPORTS | EX-STATUS-01 |
| 24 | SUMMARY | GRAM-11 | draft: GAME-LIST | EX-SUMMARY-01 |
| 25 | TARGETS | GRAM-11 | draft: GAME-LIST | EX-TARGETS-01 |
| 26 | TELL | GRAM-12 | draft: GAME-RADIO | EX-RADIO-01 |
| 27 | TIME | GRAM-10 | draft: GAME-REPORTS | EX-TIME-01 |
| 28 | TORPEDOS | GRAM-5 | draft: GAME-TORPEDO | EX-TORPEDO-01 |
| 29 | TRACTOR | GRAM-7 | draft: GAME-TRACTOR | EX-TRACTOR-01 |
| 30 | TYPE | GRAM-10 | draft: GAME-TYPE | EX-TYPE-01 |
| 31 | USERS | GRAM-10 | draft: GAME-REPORTS | EX-USERS-01 |
| 32 | *DEBUG | GRAM-13 | draft: SESSION-6 | EX-DEBUG-01 |
| 33 | *PASSWORD | GRAM-13 | draft: SESSION-6 | EX-PRIV-01 |

## Pregame coverage

The FORTRAN table contains 16 slots, of which 14 are named. Slots 2 and 5 are
blank and unmatchable. GRAM-2 records dispatch; SESSION-6 defines the pregame call paths and
identifies missing-argument and no-ship limitations. The initial HELP/PREGAME/empty dialogue is separate.

| Slot | Source name | Status |
| --- | --- | --- |
| 1 | ACTIVATE | draft: SESSION-6; shared-path limits apply |
| 2 | (blank) | blank, unmatchable |
| 3 | GRIPE | draft: SESSION-6; shared-path limits apply |
| 4 | HELP | draft: SESSION-6; shared-path limits apply |
| 5 | (blank) | blank, unmatchable |
| 6 | NEWS | draft: SESSION-6; shared-path limits apply |
| 7 | POINTS | draft: SESSION-6; shared-path limits apply |
| 8 | QUIT | draft: SESSION-6; shared-path limits apply |
| 9 | SET | draft: SESSION-6; shared-path limits apply |
| 10 | SUMMARY | draft: SESSION-6; shared-path limits apply |
| 11 | TIME | draft: SESSION-6; shared-path limits apply |
| 12 | TYPE | draft: SESSION-6; shared-path limits apply |
| 13 | USERS | draft: SESSION-6; shared-path limits apply |
| 14 | *DEBUG | draft: SESSION-6; shared-path limits apply |
| 15 | *PASSWORD | draft: SESSION-6; shared-path limits apply |
| 16 | *ZAP | draft: SESSION-6; shared-path limits apply |

## Section review status

| Area | Current scope | Remaining work |
| --- | --- | --- |
| Lexical | Character table, line reader, ordinary token categories and matcher read directly | REAL-token retention, numeric model and control paths |
| Grammar | Main/pregame dispatch, locations and all 33 main command forms drafted | Pregame differences, malformed forms, prompt/output linkage |
| State | World/ship/session domains, roster, distance and ordinary integer units | Finite numeric model, aliases and complete transition invariants |
| Execution | Main return paths, accounting, hit/radio queues, recipient sets and exclusion classes | Callback/monitor boundaries, queue edge cases and adversarial interleavings |
| Randomness | Generator, seeding and initial placement draw order | Per-command draw ledger and reproducible vectors |
| Session | Admission, options, team/ship selection, release and termination drafted | Raw-name boundaries, identity, reentry and concurrency details |
| Gameplay | Resources, scans, traversal, combat, installations, novas, Romulan, LIST and reports drafted | Combat notifications, numeric execution and exact scoring; review failure effects |
| Terminal | Prompts, fields, scans, utilities and 324 exact named fragments drafted | Remaining inline literals and command assembly, extreme fields and controls |
| Conformance | Claim boundaries and 65 source-derived scenarios drafted | Deeper failure/interaction cases, native comparisons and a reusable verifier |
| CompuServe appendix | Nine amendment/scope clauses drafted from both sources | Full persistence, TELL and locking/alias effects; align with remaining core clauses |

The draft cannot support a complete game implementation yet. Compilation into
one document verifies document structure; it does not establish semantic completeness.
