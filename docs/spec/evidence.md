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


## Austin shared weapon-impact choice audit

The shared TORDAM/PHADAM body was compared with the abstract impact operations.
This review covers direct impact choices, not nested displacement, caller
notification or concurrent target access.

| Path | Ordered choices and effects |
| --- | --- |
| Already-fatal torpedo target | TORDAM's ship/base guards precede all three unit draws and return without an impact result. PHADAM's separate entry bypasses these guards. |
| Admitted torpedo impact | RAND, RANA and the raw-hit RAN call precede shield-mode and deflection branches. The abstract a, b, c remain consumed even for deflected hits and shields-down targets. |
| Phaser impact | RANA precedes attenuation's RAN. These are abstract b and c; no torpedo a or initial fatal-resource guard is added. |
| Critical ship | After the threshold, select a device, add half the damage, lower shields if that device is selected, then sample the final hit adjustment. |
| Critical base | Sample the strength loss, then IRAN(10), then decide destruction. Nonpositive strength does not omit the integer choice. Report strength before removal resets stored strength to zero. |

Source: [TORDAM and PHADAM](../../legacy/utexas/DECWAR.FOR#L4089).
Read-only inspection of the preserved executable confirms the critical-base
IRAN call at octal 441122 precedes the strength test. The companion critical
threshold call at 440325 precedes the target-kind comparison: the executable
also obtains an unused IRAN(5) for a critical ship. That unused compound-expression
choice remains excluded by the existing normalization; it is not an extra
ship-damage mechanic or an abstract RandomEvent. Consequently this audit does
not establish native seeded parity. The inspection tool verifies the archived
executable hash before decoding; it does not execute an impact.


## Austin displacement boundary audit

[JUMP](../../legacy/utexas/DECWAR.FOR#L1283) computes a single candidate from
the recorded position and supplied direction. INGAL precedes the distance-one
test; DISPC then admits a black hole or an empty sector. All other candidates
return without moving. There are no RAN/IRAN calls, alternative-sector searches
or boundary wrapping in JUMP. Empty-sector movement clears the old presence,
sets the new presence, updates the appropriate target position, and only then
sets player-ship RED/undocked. The black-hole branch clears the old sector and
sets fatal state without changing the recorded position or applying that
undocking/condition step. Existing Displace result and caller-score contracts
agree with these branches. Fractional coordinate selection follows the existing
normalization, not a new rounding rule. EX-MODEL-609–610 cover occupied and
out-of-galaxy rejection. This review does not establish atomicity against a
concurrent sector change between the query and update; multiplayer ordering
remains a separate obligation.


## Austin coordinated-entry failure continuations

The core coordination chapter now groups the caller-specific failure paths.
SETUP.FOR 163–165 checks hangup/control-C before retrying admission; DECWAR.FOR
2234–2235 retries relocation after the cost and destination are established.
BUILD 551–555 and CAPTURE 618–621 return their respective refusals. Player TORP
4387–4388 branches to 2800 (4424–4425), reporting empty tubes and returning
without the ordinary burst completion. ROMTOR 3496–3497 branches to the burst
loop's 800 continuation, skipping the hit and retargeting branch. NOVA
2375–2376 returns before planet damage and publication. These are source-defined
continuations. WARMAC.MAC 3768–3790 supplies a failure indication and retry delay;
it does not itself select the caller's retry, refusal or skip outcome.

The documented table is not an exhaustive inventory of every coordination
caller: commission release, resume and shared-service operations retain their
separate clauses. Reentrant entry, interruption while entering and environment
failure causes remain unresolved. No universal timeout or new failure
probability was added.


## Session and radio entry-failure follow-up

FREE (DECWAR.FOR 1089–1092) checks availability once, then retries WORLD_CHANGE
entry before the first sector/count update. RSTART (1142–1147) checks roster
position and saved-sector occupancy before its retry label; the retry does not
repeat either query. This establishes local branch order, not an atomic claim
on the previously observed ship or sector. The unresolved environment binding
of RSTART remains unchanged.

WARMAC.MAC RSRV. (2603–2607) returns immediately on entry failure; MAKMSG
(2985–2987) propagates that failure before body copying. UPDT. (2651–2655) and
REMV. (2715–2719) retry before publication and recipient removal respectively.
These paths agree with the existing publication contract and now appear in the
central continuation table.

SRCH. (2683–2692) is different: entry failure returns through the same no-result
continuation used for a search with no match. GETMSG (3037–3048) then clears the
receiver's message-count indicator and sender/recipient output indicators;
REMV. is never reached. The message body storage is not initialized on this
path. This is not evidence that all unread messages were deleted, nor enough
to invent a normal delivered-message result from stale body contents. The
existing normalization maps this no-result attempt to NoMessage, with no
repeated body and no recipient removal. The earlier follow-up had incorrectly
left that abstract outcome unresolved; NORMALIZATION.md already selects it.
Failure timing and interruption conditions remain open. This follow-up does not
claim a complete radio failure contract or atomic selection-and-removal operation.


## CompuServe DOCUMENT literal boundary review

The active SETUP.FOR 166–167 call contains one continued literal, not two OUT
calls. Its first physical line ends immediately after `for` (56 stored bytes,
including the label-field tab), with no trailing space. The continuation has
five leading spaces, `+` in column six, and one explicit space before
`Documentation!`. These byte facts do not by themselves determine implicit
padding of a short statement line inside a quoted literal.

WARMAC.MAC OUT 1986–1993 calls OSTR. and then SKIP.1. OSTR. 2135–2139 forwards
characters until the terminating zero; it does not insert a word separator.
SKIP.1 2000–2004 emits one CR/LF for the call's second argument of one. Thus the
open joining-whitespace question belongs to compilation of this literal, not
OUT's spacing or line-ending behavior.

The locally preserved FORTRAN-10 V5 manual, printed sections 2.2.3 and 2.3.1
(pp. 2-3–2-4), establishes significant literal blanks and continuation fields.
The reviewed passages do not establish short-line padding for this archived
compiler invocation. As recorded in docs/platform-manuals.md, the CompuServe map
does not identify the compiler version. A different compiler's reconstruction
would establish a candidate binding, not the archived output. Resolving
U-C-DOCUMENT requires the original compiled literal or applicable compiler
behavior plus its source-input conventions. The normative notice remains
explicitly incomplete at this separator; no game behavior is blocked by it.


## Fixed base records versus planet membership

The abstract installation paragraph previously conflated destruction of a base
with removal of a planet record. Austin weapon destruction (DECWAR.FOR
4217–4223) changes the base count, clears its sector and sets strength zero;
it retains the base identity and coordinates. BUILD (551–570) scans the fixed
base identities for nonpositive strength, then writes the selected record's
position and strength. PLNRMV (2864 onward), in contrast, removes the selected
planet from the ordered current planet collection. The model now agrees with
its existing BUILD, RemoveWeaponDestroyedBase and RemovePlanet contracts:
world.bases retains inactive records, while world.planets loses removed records.
This corrects a contradictory membership statement without prescribing arrays,
reusing historical numeric indices as identities, or changing gameplay.


## Tractor lookup and publication consistency

ReleaseTractorBeam already requires an established association; TRACTOR OFF
without one is handled before calling it. TRCOFF (DECWAR.FOR 4505–4510) saves
the two-recipient audience, clears both endpoint links, then invokes MAKHIT.
The shared release wording now states publication after those changes rather
than promising reception. This agrees with the combat-notice delayed-delivery
contract and introduces no extra event. FollowTractorBeam now explicitly unwraps
the optional beam identity and queries the record before reading endpoints;
it no longer treats an identity as a record. Existing following normalization,
including a partner whose resulting sector equals its former sector, is retained.
Crowded/out-of-galaxy following and concurrent invalidation remain unresolved.


## Romulan target-group maintained-count guard

DIST (DECWAR.FOR 865–867) checks NBASE(k) before scanning that faction's base
records. Positive record strength and nonempty sector are additional checks,
not substitutes. The target-selection clause omitted this group guard; it now
uses the already-declared maintained baseCounts field. EX-MODEL-612 distinguishes
a skipped base group from a nearby positive-strength record during an unfinished
installation transition. Ordinary settled states agree with the prior prose,
but intermediate-state selection no longer silently recounts bases.

The same review reconfirmed the initialized squared-distance bound and undefined
candidate data when no group installs a winner. It does not resolve the existing
no-target/all-distant outcome by inventing inactivity or a pursuit radius.


## DOCK supply-group guards

Austin DOCK (DECWAR.FOR 899–914) scans positive-strength nearby friendly base
records without consulting NBASE. It consults NUMCAP before scanning friendly
planets. The replenishment clause now preserves this asymmetry using the
maintained capturedPlanetCounts field; it previously omitted that planet guard.
EX-MODEL-613–614 distinguish both guards under intermediate count/record
mismatches. The resource formulas are unchanged. A commissioned ship at zero
energy can reach the replenishment guard because this routine tests ALIVE,
not energy, after supply-share selection; this does not guarantee that a caller
will reach DOCK before a separate fatal-state check.
Concurrent ownership/sector changes still require their complete interaction
contract; this correction does not make a supply scan atomic.


## Placement and docking-maintenance count review

PLACE (DECWAR.FOR 2776–2781) guards the opposing-base loop with NBASE but does
not check record strength or sector presence inside it. Since base destruction
retains coordinates and BUILD reuses the record, later player placement excludes
all recorded opposing base positions while that maintained count is positive.
The current ADT can state this without introducing an address alias or undefined
coordinate. The previous destroyed-base-position open question is resolved for
this valid-record domain. A zero count skips the entire exclusion. Non-player
objects bypass the player exclusion block at 2774.

BASKIL (349–366) already agrees with ReevaluateDocking: a positive maintained
base count enables its positive-strength scan; a nonpositive captured-planet
count preserves docking when that base search did not preserve it. No change
to that contract was needed. These guards differ from DOCK and DIST and must
not be replaced by one shared eligibility predicate. Concurrent invalidation
and exhausted placement domains remain outside this review's completed scope.


## Installation eligibility cross-check

The reviewed Austin routines have distinct group and record gates. The table
records those gates for valid records; it is not a replacement for each
operation's range, context, ordering, ownership or interruption rules.

| Operation | Maintained-count gate | Base record gate |
| --- | --- | --- |
| Ship placement, PLACE 2774–2781 | Opposing NBASE positive | Every recorded opposing position; no strength or presence gate. |
| Romulan selection, DIST 865–875 | Faction NBASE positive | Positive strength and nonempty sector. |
| DOCK 899–914 | No base-count gate; NUMCAP gates planet scan | Positive strength and within one sector. |
| Docking maintenance, BASKIL 349–366 | NBASE gates base scan; nonpositive NUMCAP retains docking after failed base support | Positive strength and within one sector. |
| Base defense, BASPHA 383–390 | Faction NBASE positive | Positive strength; no base-sector-presence gate. |
| Base replenishment, BASBLD 326–331 | No base-count gate | Positive strength; no sector-presence gate. |

The base-defense clause omitted its faction-count gate and is corrected.
Replenishment's record-only eligibility and ordering are now explicit. Planet
Defense scans the current planet sequence, applies the neutral attack choice
and acting-faction exclusion, then tests targets; it has no captured-planet-count
gate. No universal installation-alive predicate or cached recount should replace
these distinctions. Concurrent sector/ownership changes remain a separate audit.


## CompuServe direct-reply origin lookup

WARMAC.MAC NODNAM (6350–6396) supplies 46 exact three-character keys and
qualifiers; the appendix now states those mappings and preserves trailing spaces
and misspellings. The binding supplies a connection-origin code rather than
inferring a physical location. Source RMGPLY tries the exact table before its
fallback tests. Those later tests are unreachable as written: ANDI T1,77 leaves
at most octal 77, which cannot equal either SIXBIT 'CL ' or 'CS '; the later
ANDI T1,7777 cannot enlarge that value to SIXBIT 'Q  '. Consequently comments
about CLx/CSx/Qxx do not establish prefix matching. Unlisted codes reach the
existing random qualifier fallback. No corrected mask or new origin is added.
Acquiring the original connection metadata remains environment-specific; this
review establishes the table and fallback, not a modern network service.


## CompuServe ordinary coordination and wait amendment

LOCK. scans LOKTAB before enqueuing; an already recorded key returns at LOCK.3.
The book states this for successfully held resources, without treating a pending
record as proof of ownership. UNLOCK clears LOCKED and invokes UNLO. for its
specified key; UNLO. removes that key, while KILALL/ZAPLOK iterate all recorded
keys. This differs from Austin's unconditional release-all implementation.

PAUSE's nonpositive argument returns before reading LOCKED. Positive PAUSE saves
LOCKED in SVLOCK, releases that key, performs capped elapsed waiting, then retries
LOCK. on LKFAIL before returning. GTKN.1 does the corresponding save/release,
INLI., retry sequence for fresh input; GTKN.2 parsing existing input bypasses it.
The appendix now states these ordinary sequences in resource terms. Shared
scratch overwrite during interruption, pending request entries and the full
remembered-resource caller mapping remain outside that completed scope.
Sources: CompuServe WARMAC.MAC 1679–1692, 4010–4046, 4468–4501, 4594–4640.

### Input readiness and remembered-resource selection

CompuServe WARMAC.MAC 3871–3902 tests buffered command remainder and negative
INIFLG before inspecting the requested readiness delay. Nonpositive delay jumps
to INPT.1. Positive delay saves LOCKED, releases through UNLO., requests HIBER
with character-ready wakeup, and retries LOCK. on LKFAIL before INPT.1 checks
HUNGUP, SKPINC and CCFLG. Unlike PAUSE, INPUT neither clamps to 10000 nor loops
against an elapsed deadline. The appendix now distinguishes this readiness
operation from line acquisition and elapsed waiting. Monitor failure and
interrupted reacquisition remain outside the ordinary sequence.

Caller inventory also establishes that public LOCK (4470–4471) selects LOCKED
before entry, while internal LOCK. does not; public UNLOCK (4594–4597) clears
that selection regardless of its argument. Queue operations, captain-count and
standings updates use internal LOCK. These observations do not yet establish a
complete abstract resource mapping. In particular MOVE.FOR 129–143 coordinates
BOARD groups containing three horizontal sectors, not individual sectors.
A platform-independent mapping must explicitly resolve that grouping rather
than silently claim per-sector coordination. No such normalization is selected
by this readiness clarification.

### CompuServe named coordination resources

Mapped FRELOK to admission/commission changes (SETUP.FOR 231,444; FREE.FOR
40,95,105,135), PLNLOK to planet changes (BUILD.FOR 60–79; CAPTUR.FOR 49–68;
TORP.FOR 218–228; ROMTOR.FOR 119–130; NOVA.FOR 161–178), QUELOK to delivery
(WARMAC.MAC 3127,3188,3227,3265), and STAUPD to captain/score updates
(WARMAC.MAC 5590,5701). Public LOCK selects LOCKED; public UNLOCK clears it.
Those FORTRAN callers use the public entries. Delivery and standings use
internal LOCK./UNLO., which do not change LOCKED. The named-resource table
states this selection distinction without importing addresses or the lock table.

LOCK. 4493–4497 and UNLO. 4629–4634 select the same cross-galaxy namespace for
FRELOK and STAUPD, with the galaxy number retained for the other keys. This
supports shared-service scope, not a requirement that independent installations
share records. MOVE's three-sector grouping and STAZAP's distinct STABUF key
remain outside the mapped ordinary operations. Pending/reentrant records and
interrupted selection remain unresolved; the table does not assert atomicity.

### Mapping-domain review

Reviewed all Map declarations in the normative model, commands, shared world,
turn, autonomous, communication, session and variant chapters. Team, Device,
PhaserBank and ScoreCategory mappings use their declared finite enumeration
domains. HistoricalStatistics explicitly binds StatisticId to the environment's
schema. CompuServe missions/reportedLosses needed an explicit restriction to its
roster: the appendix now states that domain and distinguishes zero-filled empty
statistics from missing entries. Source WARMAC.MAC 5594–5597 clears the statistics
value before reading; 5629–5630 increments the selected ship counter. The source
roster is the appendix's existing ten-ship roster. This clarification adds no
identity or missing-record repair. Property references and non-mapping type
relationships still require their separate whole-book review.

### ENERGY and TRACTOR optional-position domains

Both command contracts now state the Position-presence domain at the distance
step, preserving earlier rejection precedence. ENERGY checks self, ALIVE, team,
then LDIS (Austin DECWAR.FOR 1033–1049); TRACTR checks self, team, ALIVE, then
LDIS (4464–4478). Neither source inserts a separate missing-position diagnostic.
The abstract position can be absent during lifecycle; the specification does
not turn that absence into a coordinate or silently return NotAdjacent. The
new prose applies the existing Optional and Position domains locally and leaves
concurrent check/use invalidation unresolved. No new guard or gameplay repair.

### SHIELDS terminal responses

Completed SHIELD output-path comparison (Austin DECWAR.FOR 3739–3801;
MSG.MAC 280–289; WARMAC.MAC OUT 1653–1661). All nine strings are independent
of output length. Prompts use OUT(...,0), responses OUT(...,1); SHLD07 already
begins with CRLF. Action/amount cancellation is silent, while failed YES
confirmation prints SHLD04. SHLD05 is a fixed confirmation with no amount
formatter. Corrected the command's erroneous claim that the actor receives
the signed amount; Transferred.amount remains the semantic outcome. The
presentation now separates it from the emitted text. UP prints SHLD06 before
TRCOFF and SHLD07 afterward if energy is exhausted; notice delivery remains
subject to its own reception rules. No gameplay change.

### ENERGY, DOCK and REPAIR responses

Reviewed ENERGY 1009–1072, DOCK 893–938 and REPAIR 3190–3220 in Austin
DECWAR.FOR against MSG.MAC. Added ordinary prompt/response recipes. ENERGY's
LONG prefixes concatenate without extra separators; sender confirmation has no
amount, while the recipient's EnergyReceived carries it. Label 1700's generic
failure text has no branch to it in ENERGY and is not added as a new rejection.
DOCK's no-supply response has both ODISP's requested trailing space and DOCK01's
leading space. DOCKIN begins with CRLF, and the ended-commission branch is silent.
REPAIR itself has no OUT or CRLF; DAMAGE supplies optional report output, while
later turn effects remain separate. This closes ordinary response recipes, not
interruption, transport or simultaneous-state guarantees.

### RADIO and TRACTOR response/delivery distinction

RADIO (Austin DECWAR.FOR 3129–3180) requests CRLF after nonempty action input
but not after empty cancellation; its separate name prompt does not add that
request. GAG/UNGAG append ODISP without a trailing space then CRLF; ON/OFF use
OUT with one unconditional suffix. Targeting self is silent. Added these paths
and exact MSG.MAC 248–255 strings to presentation.

TRACTR 4432–4510 emits direct rejection text, with ODISP plus one space for
target-beam and target-shield refusals. TRACT4 contains an embedded CRLF.
Engagement writes both endpoints then calls MAKHIT, as release clears the
association then publishes. Replaced the unqualified receipt wording
in the engagement contract with publication of TractorEvent ACTIVATED. Exact
strings are MSG.MAC 349–357, plus the shared name/absence/adjacency messages.
This adds no notification, command or delivery guarantee.

### BUILD and CAPTURE output composition

Added BUILD ordinary stage, conversion and rejection recipes from Austin
DECWAR.FOR 522–592 and MSG.MAC 12–19. BUILD7 has a leading CRLF and no
appended ending; BUILD count pluralization is conditional >1. Conversion uses
current-sector labels around PRLOC without a requested break until its final
CRLF. Both capacity failures share a response but retain distinct state effects.

CAPTUR 600–685 selects nonplanet diagnostics by object kind, with output-length/
faction-specific AlreadyOwned text. After damage/discovery, it emits the former
planet-ownership capture line, PRLOC with a conditional break, then MAKHIT.
Death text follows publication and checks hull/energy, rather than a new outcome
rollback. Reworded command observations to avoid promising immediate hit receipt.
MSG.MAC 20–37,148–160 supplies embedded CRLFs. Full concurrent snapshots and
interrupted output remain outside the ordinary recipes. No gameplay change.

### PHASERS direct responses and notice boundary

Reviewed PHACON (Austin DECWAR.FOR 2647–2759) and MSG.MAC 196–208. Device
failure precedes input; one resolved item prints ERLOC1. Invalid target,
self/faction/range and strength messages follow the established validation
order; strength validation follows PAUSE. Shield-control notice is non-SHORT;
overheat warning is universal with an extra multiline LONG body. PHACN3 exists
in MSG but has no PHACON call and is not added to the presentation. MAKHIT
publishes impact/base notices; the later readiness deadline is not contingent
on their display. Added exact direct response recipes and clarified that
boundary in the command. Interruption and concurrent target validity remain open.

### TORPEDOS direct response paths

TORP 4228–4261 distinguishes SHORT initial empty-inventory reporting from the
fixed non-SHORT TORP01 sentence. Burst prompting concatenates TORP02 with RELOC's
COORD1; target-only input omits TORP02. Nonpositive count is silent. Excess
ammunition request emits TORP03, and exceeding ammunition or three reaches
inventory output at 2600. Own-sector errors have their existing special finish
path; range rejection uses PHACN1. At 2500 the misfire ordinal and optional
TORP06 tube-damage warning precede travel, without displaying damage magnitude.
The planet-entry failure message at 2800 is not proof of empty tubes. Added these
recipes, MSG.MAC 341–348 and shared literals, without changing unresolved target
components or firing semantics. Normal completion adds no direct confirmation.

### MOVE and IMPULSE direct responses

MOVE 2141–2254 distinguishes unavailable propulsion, own-sector retry, impulse,
damaged-warp and maximum-range text. A >6 request takes the maximum-range branch
before the damaged-engine branch, but chooses suffix3 when damage is positive.
Warp5/6 always warns before the stochastic overheat test. On overheating,
OFLT(randam,3) reports damage and non-SHORT OFLT(time,2) reports the repair
estimate before adding device damage. OFLT's second argument is integer-field
width, not precision (WARMAC.MAC 1940 onward). In ordinary units the estimate
is potentialDamage/30; historical integer truncation is omitted consistently
with numerical normalization. No repair schedule is inferred from that number.
MOVE10 is a fixed collision-averted line, not an object/location report, and
clear traversal prints no direct success. Added these recipes from MSG.MAC
131–145, preserving embedded CRLFs and quote characters. No gameplay change.

### CompuServe response inheritance and relocation refusal

Compared stripped executable-line text, preserving case and internal whitespace,
for SHIELD, RADIO, ENERGY, DOCK, REPAIR, TRACTR, BUILD, CAPTUR, PHACON and TORP:
all ten match their Austin routines. MOVE differs only in relocation coordination
entry/release statements in this comparison. Separately compared 95 applicable
MSG fragments byte-for-byte, including CRLF: all match. Detailed inventory and
MOVE diff: logs/spec-variant-response-comparison.log. This supports ordinary
response inheritance with variant roster, helpers and service semantics retained;
it is not end-to-end execution equivalence.

CompuServe MOVE.FOR 120–143 charges before relocation requests. Destination
failure returns alternate immediately; distinct source failure releases the
destination then returns alternate. Neither retries, moves the ship/partner,
sets normal completion time, nor reaches the later obstruction response. Added
RelocationRefused with those retained effects. Resource grouping remains open
because BOARD keys cover three sectors; no per-sector lock is invented.

EX-COMP-49 supplies a clear two-sector move and failed destination entry. Its
16-unit charge follows 4*d^2 with both multipliers1; departure clears docking
and sets GREEN before the refusal. CompuServe DECWAR.FOR 140 transfers alternate
return to 49/50 (77–81), bypassing movement turn completion. The example stops
before subsequent command acquisition and makes no claim of silent coordination.

### Nested command fields and pregame report domains

Checked direct nested s/c/w member forms in commands.md against Shields,
DeviceState, RadioSettings, TeamKnowledge and RomulanActivity. Literal Device
keys are declared; dynamic d/device keys come from Device iteration or matching
DeviceSelector. This resolves member-name availability, not all unit or lifetime
proofs. ReportContext.team is Optional<Team>; moved its existing pregame COUNT
exception before distance/knowledge use and explicitly required contained origin
and team values for the remaining path. No new pregame report behavior was added.
LSTUPD 1922–1954 remains the ordinary active-report source basis, with the existing
pregame whole-galaxy abstraction retained.

Removed a stale early NORMALIZATION statement claiming SET NAME updates the
captain before commissioning. Its later entry-name section and normative
session/command clauses already restrict assignment to an active commission and
leave pregame assignment unspecified. This reconciles the decision record with
the current specification; it is not a new repair or a gameplay change.

### SET prompt and response sequence

Austin DECWAR.FOR 3624–3740 defines no initial output request. Labels 200,
300, 400, 1100, 1300, 1500 and 1700 emit SET001–007 with zero suffix.
TTYTYPE label 600 requests CRLF before SET008; no-match requests CRLF before
label 1000, while ambiguity emits SET009 at label 900. Label 1000 emits
SET010 with two ending pairs and TTYS00 with one, then retries at 600.
The eleven MSG.MAC fragments are reproduced in the presentation chapter;
logs/spec-set-responses-review.log retains their exact extracted text.
Successful ordinary assignments have no direct confirmation. ROMOPT/BHREMV
also return without one; ENDFLG calls ENDGAM and retains that separate lifecycle.
This closes ordinary SET response ordering, not interrupted input/output or
nonprinting name semantics.
