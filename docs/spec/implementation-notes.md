# Implementation derivations supporting the specification

**Historical research, outside the generalized specification.** Earlier preservation
requirements below describe machine-fidelity analysis. They do not override the
[normalization policy](NORMALIZATION.md); aliases and numerical artifacts are
excluded from the normative book.

This companion document is excluded from the assembled specification. It retains
historical implementation explanations used to derive behavioral rules; it is
not an implementation design for a new game. See also [compiled evidence](evidence.md).

## Decimal token derivation

The first decimal point accepted by the numeric scanner resets the text-deposit
allowance to 17800626176 before that character is deposited. This is a positive
integer much larger than an ordinary input line. It is the same allowance that
initially limited deposits to five characters; it is not an independent decimal
scale counter. A later invalid numeric character does not undo this reset.

For each token, start with an allowance of five and a deposit position of zero;
clear that token's text field. Process transformed characters in source order.
First perform the numeric-character handling, including the reset just described
if applicable. Decrement the allowance. If it is nonnegative, deposit the
character at the current deposit position and advance that position. Otherwise
skip the deposit without advancing its position. Numeric processing and input
consumption continue whether or not a deposit occurs.

Consequently the token's own text field always receives its first five
characters. A decimal point after a longer integer prefix resumes deposits at
the sixth position: skipped prefix characters are not restored. After the reset,
remaining ordinary-line characters can spill into subsequent fields. No later
numeric error restores the five-character limit or rolls back those deposits.

Define the spill's observable state effects through a logical sequence of
thirty encoded fields: the fifteen token-text fields followed by the fifteen
token numeric fields. This sequence specifies cross-field updates; it does not
require contiguous storage in an implementation. Each encoded field has a
36-bit residue. Text has five seven-bit character positions with weights
2^29, 2^22, 2^15, 2^8 and 2^1. The unselected bits are preserved by a deposit.

For token i (positions are one-based), deposit position j (zero-based) selects
logical field `i + floor(j/5)` and character position `j mod 5`. With selected
weight 2^s, old residue E and transformed character c, replace E by
`E + (c − (floor(E/2^s) mod 128)) × 2^s`. This preserves the other character
positions and the low bit. For a numeric field, this is a change to its encoded
value, not decimal parsing of the deposited letters. Categories are not changed.
Integer encodings use the signed 36-bit interpretation; interpretation and
exceptional use of affected REAL encodings remain subject to U-NUMERIC.

Scanning later tokens clears and overwrites their own text fields normally.
Finishing the current token assigns its own numeric value; finishing the command
clears the sentinel's text/numeric fields and assigns its end category. These
later writes can overwrite spilled characters. Earlier numeric fields affected
by the spill are not automatically repaired. The ordinary 80-character acquired
line and fourteen-result bound prevent these deposits from reaching beyond
numeric field 12; category and origin arrays are not deposit targets in that
domain. Raw-name acquisition and exceptional control paths are outside it.

**Evidence:** [NXTT/ANUM](../../legacy/utexas/WARMAC.MAC#L1454),
[field order](../../legacy/utexas/WARMAC.MAC#L376),
[compiled reset/deposit evidence](evidence.md#compiled-tokenizer-observations),
[byte operations](../platform-manuals.md#byte-deposits-and-token-text).

## Romulan gag derivation

The gag lookup for nonzero sender uses the sender code modulo 100 as an index
into the identity-bit table. Romulan code 500 therefore reads index zero,
which aliases the final roster-marker word immediately preceding the table.
In the preserved Austin image that word is octal `202564020100`, the five
characters `" W   "`. For ordinary roster gag sets its set bits select slots
7 (Trenton) and 14 (Hawk). Gagging either ship therefore suppresses Romulan
messages as well. Gagging Wolf alone does not, despite Wolf supplying the
aliased marker. Apply the mask to the receiving session's gag set, not to the
message's recipient set. This finding is specific to the pinned Austin image;
CompuServe padding remains U-ROM-GAG.


## LIST unresolved output derivation

Selection diagnostics and specific-coordinate listings of noncombat objects
also have unresolved paths under U-LIST-OUTPUT. In particular, a zero-valued
indirect message reference is not defined here as an empty fragment. The output
routine tests the argument address for zero before examining the value stored
there; these are different cases. The ordinary valid-object recipes above do
not settle those paths.


## Exclusion derivation

The Austin public FORTRAN lock entry disregards the supplied lock object's
identity and requests one shared exclusion class. Its internal assembly entry,
used for the message queue, requests a second class. Thus named planet and board
locks in FORTRAN do not define independent resources. An implementation can use
modern synchronization, but must preserve which operations exclude one another.

A failed request sets the failure indication and invokes the source's 25-unit
monitor hibernation request before returning. Monitor interpretation and grant
ordering remain U-MONITOR. Callers choose the consequence: MOVE retries public
exclusion; planet BUILD/CAPTURE/TORPEDO/NOVA paths have their distinct failure
returns; radio reservation/search can fail; publication/removal retry.

Both public and internal release entries request release of all locks held by
the session, irrespective of the argument naming a particular lock. A nested
release can therefore end more exclusion than its call site's name suggests.
Command acquisition also releases held locks. Do not infer reference-counted
nested locks or per-object release from the FORTRAN argument lists.

These rules specify resource classes and release scope. They do not yet define
every permitted instruction-level interleaving, crash point, or monitor failure.
A complete concurrency profile must state those boundaries explicitly.


## Control registration derivation

CCTRAP's body loads a callback from its argument and clears the control flag;
several calls provide no argument. The source comment describing a no-argument
“disable” form does not itself establish what address that body reads. This
argument/monitor boundary, callback reentrancy and terminal-driver interception
remain U-CONTROL. A modern adapter may provide a named repair policy, but cannot
claim that the repaired cancellation path is normative historical behavior.


## Unresolved implementation questions

# Unresolved behavior and separate policies

These entries are review obligations. An unresolved entry does not license an
implementation to substitute arbitrary behavior and claim full conformance.

| ID | Question and evidence needed | Affected clauses |
| --- | --- | --- |
| U-NUMERIC | Define abstract finite arithmetic for all reachable integer/REAL operations, including decimal input, overflow and abnormal operands. CPU manuals explain instructions; the inspected FORTRAN V5 manual does not establish every V6 compiler transformation. | LEX-5; future state/gameplay clauses |
| U-EVALUATION | Establish evaluation for unreviewed side-effecting expressions and CompuServe's corresponding compound conditions. RNG-5 resolves the nine identified random-call sites for the pinned Austin image; it does not establish a universal compiler rule or the CompuServe build. | CompuServe appendix; remaining expression review |
| U-CONTROL | Resolve delivered controls, monitor interception, echo, callback arguments and reentrancy. EXEC-11 now specifies the pending-control loop and source handler; do not make the host repair historical law. | LEX-2; execution and terminal |
| U-FINAL-POINTS | Final POINTS enters a DO range without initializing its counter. The native observed successful quit does not establish all residue/alias conditions. | Scoring and exit |
| U-ZERO-AVERAGE | Determine score division-by-zero outcomes and continuation under the reference compiler/runtime. | Scoring |
| U-TRACTOR-ARG | Main calls TRACTR without its declared argument. Establish original effects when TRACTOR OFF assigns through that argument. | Tractor and cleanup |
| U-LIST-SHIP | LIST scanning refers to singular SHIP while accumulating SHIPS; establish the uninitialized word's observable effect. | LIST family |
| U-LIST-OUTPUT | Complete the nonstandard LIST output paths. LSTFLG can pass a zero-valued message variable to OUT when no faction adjective was selected; OUT then treats that value as an indirect text address, rather than guaranteeing empty output. Specific-coordinate listings of empty space, stars or black holes reach LSTOBJ outside its computed-branch range and fall through to the Romulan row body with retained flags. Establish the resulting text/flags and invalid concurrent planet-type cases without inventing empty strings or a snapshot. | GAME-LIST; TERM-19–21 |
| U-ROM-TARGET | DIST initializes distance bounds but retains identity/position words for groups with no qualifying target. Resolve all-empty and beyond-bound cases, including random tie selection of empty groups. | GAME-ROM-TARGET; GAME-ROM-ACTION |
| U-MESSAGE-EDGE | MAKMSG cancellation can reach reserved-slot removal before reservation; short-message cleanup has reservation/link-state assumptions. GETMSG uses `SETZM T2,` in its destination-sentinel branch. Establish edge effects without treating them as intended modern queue operations. | EXEC-7; GRAM-12 |
| U-ROM-GAG | Determine CompuServe's compiled trailing character padding of its final roster-marker word, read as BITS(0) for Romulan sender code 500. Austin's mask and ordinary gag-slot effects are established by TERM-14; its compiled padding does not prove the CompuServe value. | CompuServe application of TERM-14; C-12 |
| U-PREGAME-ARG | Pregame TYPE omits its required kind argument; SET NAME and several shared report paths access selected-ship fields with no commissioned ship. Derive the resulting cross-field/argument-residue effects from the linked model. | SESSION-6/7; GAME-TYPE; pregame reports |
| U-GRIPE-HEADER | OSTS writes through its caller argument while setting up its time field, although GRIPE invokes it as an internal helper without establishing a dedicated time argument. Resolve any caller-state mutation along with exact header fields. | GAME-GRIPE; diagnostic recording |
| U-ADMIN-STORAGE | Retained Austin *ZAP writes inherited statistics bindings despite removed ordinary standings updates. Define preserved record fields, binding failures and diagnostic contents independently of the old disk layout. | SESSION-6 |
| U-C-STATISTICS | Complete CompuServe statistics open/read/write failure paths, partial I/O and retained-record interpretation, including free-user routing after an unsuccessful regular read. C-6's ordinary ranking and display rules do not establish successful persistence on these paths. | C-6 |
| U-C-DOCUMENT | Establish exact whitespace where SETUP's DOCUMENT string literal continues onto the next physical line under the selected compiler's tab/fixed-form rules. Its diagnostic behavior and inactive external-program call are established; normalized source text alone does not settle literal padding. | C-4 |
| U-C-NODE | Resolve CompuServe direct Romulan reply qualifiers derived from GETLIN terminal codes, including packing, single-quoted constants and masked special-prefix comparisons. The generic random fallback is specified independently. | C-8 |
| U-C-LOCK | Resolve delayed grants with the grant handler commented out, the error register retained after lockup diagnostics, registry-exhaustion traps and host error/clock binding. The ordinary timeout path does not reach the retained failed-return instructions. | C-10 |
| U-MONITOR | Specify identities, resource ordering, input readiness, clocks and loader transitions at an abstract boundary without asserting Node or TOPS-10 host choices as game rules. | Session, execution and conformance |

The existing playable profile repairs five paths: final POINTS, zero score
averages, TRACTR's missing argument, LIST's singular SHIP and pending controls.
Their current implementation and rationale are documented in
[playable decisions](../playable-decisions.md). This draft does not incorporate
those repairs into normative Austin semantics by default.

Additional omissions remain visible in the coverage record. An omission is not
resolved merely by assigning an issue ID.

## Resolved review questions

U-TOKEN-LIMIT is resolved for ordinary tokens by LEX-7 and EX-CAPACITY-01 through
EX-CAPACITY-04. The source checks end-of-command before the capacity increment;
comma consumption and a final null result explain the delimiter-sensitive bound.
This is a source-control-flow derivation, not a native transcript.

U-REAL-TOKEN is resolved for ordinary acquired lines by LEX-8. The preserved
Austin executable confirms the decimal branch's reset value and subsequent
decrement/deposit sequence. A token's own text still retains its first five
characters; the additional deposits can overwrite subsequent text and earlier
numeric fields. Arithmetic faults or malformed REAL values produced by such
overwrites remain U-NUMERIC. This is compiled-image inspection plus source and
CPU-manual derivation, not a native interactive test.

## CompuServe compiled-evidence limits

## C-12 — Compiled-evidence limits (qualifies RNG-5 and TERM-14)

The Austin executable establishes the nine RNG-5 call sites and TERM-14's
Romulan gag mask for that pinned build. Those compiled observations do not
establish CompuServe compiler behavior. A CompuServe claim must leave its
counterpart draw evaluation and final roster-marker padding unresolved under
U-EVALUATION and U-ROM-GAG until supported by applicable evidence.

CompuServe OUTMSG retains the sender-modulo-100 lookup, and its declarations
still place roster markers immediately before the bit table. The zero index
therefore has the same kind of cross-field effect, but this appendix does not
substitute Austin's particular word or gag-slot set. CompuServe has ten ordinary
gag identities, making a direct transfer of Austin's eighteen-slot interpretation
especially inappropriate.


## CompuServe autonomous speech derivation

### Autonomous speech and recipient-mask effects

Autonomous TELL generates its body before recipient validation and suppresses
the unoccupied/broken/off-radio and no-recipient diagnostics. It still removes
unavailable recipients among the ten roster slots, clears gag selections for
remaining recipients, and queues a nonempty selection. Player TELL ROMULAN's
immediate reply is addressed only to that captain and bypasses this later filter.

For autonomous speech, the body choices and four draws are TERM-13's choices,
but the source retains octal masks 777777, 000777 and 777000. These select slots
1–18, 1–9 and 10–18 respectively, despite the ten-slot roster. The validation
loop visits only slots 1–10. Thus the second choice can include Empire slots
6–9 while calling them human; the third includes slot 10 and nonexistent slots
11–18. Do not replace these masks with the ordinary five-member radio groups.

Publication increments a message flag for every remaining bit without a
ten-slot bound. Under both supplied declarations the ten message flags are
immediately followed by the ten hit flags. Consequently publication for bits
11–18 also increments hit flags for captains 1–8, without creating corresponding
hit entries. This alias effect is expressible as state changes in an independent
implementation; preserving an out-of-bounds memory write is not required. The
nonexistent recipients also remain in queue membership until removed by queue
eviction or reinitialization. Their effects must not be silently normalized away.


## STATUS token substitution

The default STATUS report replaces the token text and categories beginning at
its entry token with C, L, T, E, D, S and R, followed by an end-of-line category.
It leaves recorded token count, numeric values and raw-input positions unchanged.
This is an implementation technique for generating default report selectors,
not a required mutation of parsed input in the generalized specification.
The language rule states only the resulting report selection and order.

**Source:** [STATUS](../../legacy/utexas/DECWAR.FOR#L3860).
