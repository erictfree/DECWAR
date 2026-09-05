# Unresolved behavior and separate policies

These entries are review obligations. An unresolved entry does not license an
implementation to substitute arbitrary behavior and claim full conformance.

| ID | Question and evidence needed | Affected clauses |
| --- | --- | --- |
| U-NUMERIC | Define abstract finite arithmetic for all reachable integer/REAL operations, including decimal input, overflow and abnormal operands. CPU manuals explain instructions; the inspected FORTRAN V5 manual does not establish every V6 compiler transformation. | LEX-5; future state/gameplay clauses |
| U-EVALUATION | Establish compiler evaluation of compound logical expressions containing random calls, such as TORDAM's `I(5)=5` combined with a base-kind test. Do not assume a modern short-circuit rule or omit a draw merely because the other operand determines the result. | GAME-DAMAGE; autonomous actions; RNG |
| U-CONTROL | Resolve delivered controls, monitor interception, echo, callback arguments and reentrancy. EXEC-11 now specifies the pending-control loop and source handler; do not make the host repair historical law. | LEX-2; execution and terminal |
| U-FINAL-POINTS | Final POINTS enters a DO range without initializing its counter. The native observed successful quit does not establish all residue/alias conditions. | Scoring and exit |
| U-ZERO-AVERAGE | Determine score division-by-zero outcomes and continuation under the reference compiler/runtime. | Scoring |
| U-TRACTOR-ARG | Main calls TRACTR without its declared argument. Establish original effects when TRACTOR OFF assigns through that argument. | Tractor and cleanup |
| U-LIST-SHIP | LIST scanning refers to singular SHIP while accumulating SHIPS; establish the uninitialized word's observable effect. | LIST family |
| U-LIST-OUTPUT | Complete the nonstandard LIST output paths. LSTFLG can pass a zero-valued message variable to OUT when no faction adjective was selected; OUT then treats that value as an indirect text address, rather than guaranteeing empty output. Specific-coordinate listings of empty space, stars or black holes reach LSTOBJ outside its computed-branch range and fall through to the Romulan row body with retained flags. Establish the resulting text/flags and invalid concurrent planet-type cases without inventing empty strings or a snapshot. | GAME-LIST; TERM-19–21 |
| U-ROM-TARGET | DIST initializes distance bounds but retains identity/position words for groups with no qualifying target. Resolve all-empty and beyond-bound cases, including random tie selection of empty groups. | GAME-ROM-TARGET; GAME-ROM-ACTION |
| U-MESSAGE-EDGE | MAKMSG cancellation can reach reserved-slot removal before reservation; short-message cleanup has reservation/link-state assumptions. GETMSG uses `SETZM T2,` in its destination-sentinel branch. Establish edge effects without treating them as intended modern queue operations. | EXEC-7; GRAM-12 |
| U-ROM-GAG | Determine the compiled trailing character padding of the final roster-marker word, read as BITS(0) for Romulan sender code 500. This word supplies the actual gag mask in both variants; a missing ordinary Romulan ship slot does not imply an always-ungagged sender. | TERM-14; EXEC-7 |
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
