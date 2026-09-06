# Evidence and coverage

This companion research record is not part of the assembled specification.
It preserves how rules were derived, including implementation analysis and
compiled-image evidence. The specification itself defines syntax and meaning;
these notes neither prescribe implementation choices nor supply missing rules.

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

The tables below track the earlier source-analysis draft. They do not measure
conversion into the generalized book. Use [language coverage](language-coverage.md)
for that progress and [normalization](NORMALIZATION.md) for the arithmetic policy.

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
| Randomness | Generator, seeding, placement order, draw ledger/vectors and nine compiled Austin compound-condition call sites | Abnormal bounds, other side-effecting expressions and full seeded interaction traces |
| Session | Admission, options, team/ship selection, release and termination drafted | Raw-name boundaries, identity, reentry and concurrency details |
| Gameplay | Resources, scans, traversal, combat, installations, novas, Romulan, LIST and reports drafted | Numeric execution and final scoring; review failure effects |
| Terminal | Prompts, fields, scans, utilities, all 15 hit-notification types, score tables, radio/speech, status/damage/time/identity reports, LIST rows/grouped assembly/parser diagnostics and 324 exact named fragments drafted | No-matching-group message edge, remaining inline literals and command assembly, extreme fields and controls |
| Conformance | Claim boundaries and 145 source-derived scenarios drafted | Deeper failure/interaction cases, native comparisons and a reusable verifier |
| CompuServe appendix | Twelve clauses including standings, DOCUMENT, TELL replies/relocation, speech-mask aliases, queue differences, exclusion/wait behavior and unresolved variant-rule limits | Persistence failures and literal catalogue, node-derived speech, monitor lock limits, evaluation/padding and other argument aliases |

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

## Compiled randomness and message observations

These observations use the same preserved, hash-verified Austin image identified
above. They corroborate particular source branches, not a universal compiler
evaluation policy. Addresses in the table are octal. The random-call instructions
are `260740462111`, a call to the LINK map's IRAN entry.

| Call site | Compiled control flow | IRAN call address |
| --- | --- | --- |
| DIST, Empire ship comparison | At 413031–413035, smaller distance branches to replacement and unequal distance branches to the next comparison; only equality reaches the call. | 413037 |
| DIST, Federation base comparison | At 413046–413052, the next distance is compared with the currently selected group's distance using the same smaller/unequal gates. | 413054 |
| DIST, Empire base comparison | At 413063–413067, the final candidate uses the updated current selection and the same gates. | 413071 |
| PLNATK | At 427143–427144, a kind other than neutral bypasses the call. Result 1 branches to the loop continuation at 427430. | 427146 |
| ROMDRV appearance | At 432372–432373, a counter below three times player count branches to return at 432710 before the call. | 432375 |
| SNOVA | At 436323–436324, a kind other than star bypasses the call. The pending-capacity test at 436331–436333 follows the random-result test. | 436326 |
| Shared critical test | At 440324–440332, the call and comparison with 5 precede the base-kind comparison. The base-kind test cannot suppress the call. | 440325 |
| Base destruction | At 441121–441133, the call precedes any strength comparison. Result 10 branches directly to setting the destruction flag; other results reach the strength test. | 441122 |
| TORP Romulan displacement | At 442141–442142, false Romulan presence bypasses the call; later code compares the result with 7. | 442144 |

OUTMSG at 425640–425644 computes sender modulo 100, reads the indexed value
based at 405554, intersects it with GAGMSG and loops without output on a nonzero
intersection. At 405554 the encoded value is `202564020100`, decoding to
`" W   "`. The next eighteen fields are successive powers of two from 1 through
131072. Thus the index-zero mask is the final roster marker, and its overlap with
ordinary eighteen-slot gag sets selects slots 7 and 14. These are data fields;
the inspector's instruction-column display does not turn them into instructions.

Reproduce representative inspections with:

```sh
node tools/spec/inspect-reference.ts --address=413026 --words=49
node tools/spec/inspect-reference.ts --address=427143 --words=10
node tools/spec/inspect-reference.ts --address=432365 --words=11
node tools/spec/inspect-reference.ts --address=436322 --words=14
node tools/spec/inspect-reference.ts --address=440324 --words=12
node tools/spec/inspect-reference.ts --address=441121 --words=14
node tools/spec/inspect-reference.ts --address=442141 --words=9
node tools/spec/inspect-reference.ts --address=425640 --words=5
node tools/spec/inspect-reference.ts --address=405554 --words=19
```

The reviewed branches establish RNG-5 and the Austin part of TERM-14. They
do not establish native outcomes for arithmetic exceptions, invalid target
records, asynchronous changes between reads, or a differently compiled variant.

**Evidence:** [IRAN and OUTMSG LINK entries](../../legacy/utexas-reference/f78f2ec/DECWAR.MAP#L686),
[DIST](../../legacy/utexas/DECWAR.FOR#L878),
[PLNATK](../../legacy/utexas/DECWAR.FOR#L2809),
[ROMDRV](../../legacy/utexas/DECWAR.FOR#L3247),
[SNOVA](../../legacy/utexas/DECWAR.FOR#L3827),
[shared critical code](../../legacy/utexas/DECWAR.FOR#L4128),
[base destruction](../../legacy/utexas/DECWAR.FOR#L4214),
[TORP](../../legacy/utexas/DECWAR.FOR#L4375),
[OUTMSG](../../legacy/utexas/DECWAR.FOR#L2599),
[roster/bit declarations](../../legacy/utexas/HISEG.FOR#L68).

The draft cannot support a complete game implementation yet. Compilation into
one document verifies document structure; it does not establish semantic completeness.

## Austin LIST terrain suffix review

LSTFLG in DECWAR.FOR 1765–1775 sets side=0 for empty/star/black-hole
coordinates, tests distance before admitting LIST, and calls LSTOBJ directly.
This path does not call LSTUPD. LSTOBJ 2103–2119 emits the ordinary label and
column padding, then its computed GOTO has only eight entity alternatives.
Terrain falls through into the Romulan formatter: depending on XF it prints
out-of-range text or position followed by EROM. EROM belongs to Romulan state,
not terrain. XF is in LSTVAR's scratch state after LSTLZ; LIST 1378 clears only
the region bounded by LSTFZ/LSTLZ. Thus the terrain path does not independently
establish the range flag it tests, and carrying only terrain kind cannot define
the historical suffix from current terrain properties.

Disposition: retain the queried position in the abstract observation and state
the established prefix. Keep the suffix explicitly unresolved in the generalized
book. Do not add a terrain-energy field, invent deterministic telemetry, erase
the suffix, or import scratch-word history into the game ADT. This is a reviewed
source-to-model ambiguity, not a completed terminal-conformance contract.

Sources: [LSTFLG coordinate path](../../legacy/utexas/DECWAR.FOR#L1765),
[LSTOBJ](../../legacy/utexas/DECWAR.FOR#L2084),
[LIST initialization](../../legacy/utexas/DECWAR.FOR#L1378),
[LSTVAR bounds and scratch fields](../../legacy/utexas/LSTVAR.FOR#L1).

## Austin movement and weapon random-entry audit

This checkpoint concerns direct command draws before or around target validation.
It is not a complete draw ledger for nested damage, path tracing, turn completion,
nova chains or concurrent session activity.

| Path | Source-established direct choice sequence | Specification disposition |
| --- | --- | --- |
| MOVE/IMPULSE propulsion rejection | Availability check precedes IRAN(4000). | No potential-damage choice on this path. |
| MOVE/IMPULSE after propulsion passes | IRAN(4000) precedes LOCATE/RELOC; retries do not repeat it. | Potential damage remains a declared draw even on input cancellation. |
| Accepted nonzero displacement | GREEN/undocking precedes conditional computer deflection, which precedes range checks. | Critical computer damage can consume UnitDraw before range rejection. |
| WARP risk | IRAN(100) follows range/device rejection and reached speed-risk warning at five/six sectors. | No risk draw on earlier range rejection. |
| PHASERS invalid target or strength | Target checks and readiness wait precede heat testing. | No direct heat choice before those rejections; the strength failure can still wait. |
| PHASERS firing | Shield-control charge precedes IRAN(100); extra IRAN(100) only on overheat. | First test is sampled even at strength 50, which cannot overheat. |
| TORPEDOS initial own-sector validation | Initial target checks precede loading and launch-deflection draws. | No launch-deflection draw at this initial check; turn completion remains separate. |
| TORPEDOS per-shot own-sector check | Required deflection draws precede the repeated displacement test; consumption/misfire follow it. | A later own-sector result retains those draws, with no launch on that iteration. |
| TORPEDOS non-star obstruction | Historical ARAN is obtained before object classification. | Existing normalization omits this unused result for nonstar objects; do not claim native seeded parity. |

Sources: [movement entry and range](../../legacy/utexas/DECWAR.FOR#L2145),
[phaser entry and heat](../../legacy/utexas/DECWAR.FOR#L2647),
[torpedo entry and launch](../../legacy/utexas/DECWAR.FOR#L4228),
[torpedo obstruction](../../legacy/utexas/DECWAR.FOR#L4303).
The unused-obstruction choice disposition is already recorded in NORMALIZATION.md;
this review preserves it rather than equating the abstract replay with the
historical generator's complete call sequence.
