# Unresolved behavior and separate policies

These entries are review obligations. An unresolved entry does not license an
implementation to substitute arbitrary behavior and claim full conformance.

| ID | Question and evidence needed | Affected clauses |
| --- | --- | --- |
| U-NUMERIC | Define abstract finite arithmetic for all reachable integer/REAL operations, including decimal input, overflow and abnormal operands. CPU manuals explain instructions; the inspected FORTRAN V5 manual does not establish every V6 compiler transformation. | LEX-5; future state/gameplay clauses |
| U-EVALUATION | Establish compiler evaluation of compound logical expressions containing random calls, such as TORDAM's `I(5)=5` combined with a base-kind test. Do not assume a modern short-circuit rule or omit a draw merely because the other operand determines the result. | GAME-DAMAGE; autonomous actions; RNG |
| U-REAL-TOKEN | ANUM. reuses NXTT.'s X3 character counter when initializing fractional scale. Establish retained text for decimal inputs independently of a blanket five-character rule. | LEX-4 |
| U-CONTROL | Resolve delivered controls, monitor interception, echo, callback arguments and reentrancy. EXEC-11 now specifies the pending-control loop and source handler; do not make the host repair historical law. | LEX-2; execution and terminal |
| U-FINAL-POINTS | Final POINTS enters a DO range without initializing its counter. The native observed successful quit does not establish all residue/alias conditions. | Scoring and exit |
| U-ZERO-AVERAGE | Determine score division-by-zero outcomes and continuation under the reference compiler/runtime. | Scoring |
| U-TRACTOR-ARG | Main calls TRACTR without its declared argument. Establish original effects when TRACTOR OFF assigns through that argument. | Tractor and cleanup |
| U-LIST-SHIP | LIST scanning refers to singular SHIP while accumulating SHIPS; establish the uninitialized word's observable effect. | LIST family |
| U-ROM-TARGET | DIST initializes distance bounds but retains identity/position words for groups with no qualifying target. Resolve all-empty and beyond-bound cases, including random tie selection of empty groups. | GAME-ROM-TARGET; GAME-ROM-ACTION |
| U-MESSAGE-EDGE | MAKMSG cancellation can reach reserved-slot removal before reservation; short-message cleanup has reservation/link-state assumptions. GETMSG uses `SETZM T2,` in its destination-sentinel branch. Establish edge effects without treating them as intended modern queue operations. | EXEC-7; GRAM-12 |
| U-PREGAME-ARG | Pregame TYPE omits its required kind argument; SET NAME and several shared report paths access selected-ship fields with no commissioned ship. Derive the resulting cross-field/argument-residue effects from the linked model. | SESSION-6/7; GAME-TYPE; pregame reports |
| U-GRIPE-HEADER | OSTS writes through its caller argument while setting up its time field, although GRIPE invokes it as an internal helper without establishing a dedicated time argument. Resolve any caller-state mutation along with exact header fields. | GAME-GRIPE; diagnostic recording |
| U-ADMIN-STORAGE | Retained Austin *ZAP writes inherited statistics bindings despite removed ordinary standings updates. Define preserved record fields, binding failures and diagnostic contents independently of the old disk layout. | SESSION-6 |
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
This is a source-control-flow derivation, not a native transcript. Decimal-token
storage remains U-REAL-TOKEN.
