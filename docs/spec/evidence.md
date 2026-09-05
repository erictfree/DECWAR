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
| Lexical | Character table, line reader, token categories, matcher and decimal text spill derived; reset/deposit instructions checked in preserved Austin image | Numeric model, fault continuation and control paths |
| Grammar | Main/pregame dispatch, locations and all 33 main command forms drafted | Pregame differences, malformed forms, prompt/output linkage |
| State | World/ship/session domains, roster, distance and ordinary integer units | Finite numeric model, aliases and complete transition invariants |
| Execution | Main return paths, accounting, hit/radio queues, recipient sets and exclusion classes | Callback/monitor boundaries, queue edge cases and adversarial interleavings |
| Randomness | Generator, seeding, placement order, command/helper draw ledger and exact generator vectors | Compound-condition evaluation, abnormal bounds and full seeded interaction traces |
| Session | Admission, options, team/ship selection, release and termination drafted | Raw-name boundaries, identity, reentry and concurrency details |
| Gameplay | Resources, scans, traversal, combat, installations, novas, Romulan, LIST and reports drafted | Numeric execution and final scoring; review failure effects |
| Terminal | Prompts, fields, scans, utilities, all 15 hit-notification types, score tables, radio/speech, status/damage/time/identity reports, LIST rows/grouped assembly/parser diagnostics and 324 exact named fragments drafted | No-matching-group message edge, remaining inline literals and command assembly, extreme fields and controls |
| Conformance | Claim boundaries and 134 source-derived scenarios drafted | Deeper failure/interaction cases, native comparisons and a reusable verifier |
| CompuServe appendix | Eleven clauses including standings, DOCUMENT, TELL replies/relocation, speech-mask aliases, queue differences and exclusion/wait behavior | Persistence failures and literal catalogue, node-derived speech, monitor lock limits and other argument aliases |

## Compiled tokenizer observations

The preserved Austin EXE is a new reference build from the pinned source, not
an independent recovered historical executable. Its SHA-256 is
`6989a5977ecb4b395b0e4f6651b7824d9628e178c0b8a88fc03774127188a1a3`.
The read-only inspector verifies that identity before decoding its BACK10
five-byte representation and EXE page directory. It does not execute the image
or connect to a running world. Address and instruction columns below are octal.

| Address | Source operation | Encoded instruction |
| --- | --- | --- |
| 460405 | GTKN entry's hangup test; address agrees with the LINK map. | `332000000335` |
| 460474 | NXTT selects the current token text field, using token index X1. | `201505000142` |
| 460475 | Initialize its seven-bit character pointer before the first character. | `505500440700` |
| 460521 | Decrement X3 and skip the deposit when negative. | `361340460523` |
| 460522 | Deposit the character and advance the pointer. | `136440000012` |
| 460603 | ANUM resets X3 to octal 204500000000 for the first accepted decimal point. | `515340204500` |
| 460604 | Store that value as the initial fractional scale. | `202340004545` |

Reproduce the word inspection with:

```sh
node tools/spec/inspect-reference.ts --marker=GTKN --words=3
node tools/spec/inspect-reference.ts --marker=NXTT. --words=60
node tools/spec/inspect-reference.ts --marker=ANUM. --words=40
```

The fields and source instruction sequence agree with the linked instructions.
CPU byte-operation definitions then establish LEX-8's deposition rule. This is
compiled-image corroboration and arithmetic derivation, not a native transcript
or a proof of all tokenizer behavior. In particular it does not establish
overflow/trap continuation in decimal arithmetic.

**Evidence:** [preserved image](../../legacy/utexas-reference/f78f2ec/DECWAR.EXE),
[artifact identity/format](../../legacy/utexas-reference/f78f2ec/artifacts.json),
[LINK entry addresses](../../legacy/utexas-reference/f78f2ec/DECWAR.MAP#L686),
[source scanner](../../legacy/utexas/WARMAC.MAC#L1454),
[inspection tool](../../tools/spec/inspect-reference.ts),
[CPU byte-operation evidence](../platform-manuals.md#byte-deposits-and-token-text).

The draft cannot support a complete game implementation yet. Compilation into
one document verifies document structure; it does not establish semantic completeness.
