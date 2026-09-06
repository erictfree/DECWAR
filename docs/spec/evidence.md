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
