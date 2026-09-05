# Unresolved behavior and separate policies

**Companion source analysis — excluded from the generalized specification.**
This earlier draft retains historical behavior and open research questions.
Its machine-fidelity requirements do not apply to the current book; see the
[normalization policy](NORMALIZATION.md) and [current language coverage](language-coverage.md).

These entries are review obligations. An unresolved entry does not license an
implementation to substitute arbitrary behavior and claim full conformance.

| ID | Unspecified behavior | Affected clauses |
| --- | --- | --- |
| U-NUMERIC | Complete conversion to ordinary game-unit arithmetic and identify any discrete-result or display-rounding rules. Machine overflow and compiler trap behavior are excluded by the normalization policy. | LEX-5; future state/gameplay clauses |
| U-EVALUATION | Establish evaluation and draw order for remaining conditions with side effects. RNG-5 defines the identified Austin conditions; the corresponding CompuServe conditions remain unreviewed. | CompuServe appendix; remaining expression review |
| U-CONTROL | Complete the effects of delivered controls, echo, handler changes and nested control delivery. EXEC-11 defines the reviewed pending-control path; separate cancellation repairs do not amend it. | LEX-2; execution and terminal |
| U-FINAL-POINTS | Complete final score reporting for all supported departure states. A successful observed quit does not establish every case. | Scoring and exit |
| U-ZERO-AVERAGE | Determine score output and continuation when an average has a zero denominator. | Scoring |
| U-TRACTOR-ARG | Complete the effects of TRACTOR OFF on subsequent command and session state. | Tractor and cleanup |
| U-LIST-SHIP | Establish LIST ship-selection accumulation for repeated or combined ship selectors. | LIST family |
| U-LIST-OUTPUT | Define output when a group has no matching objects; specific-coordinate listings of empty space, stars and black holes; and concurrent replacement of a selected planet by another object kind. No empty-output or snapshot rule is implied. | GAME-LIST; TERM-19–21 |
| U-ROM-TARGET | Resolve target selection when no group has a qualifying target or qualifying objects lie beyond the selection bound, including tied empty groups. | GAME-ROM-TARGET; GAME-ROM-ACTION |
| U-MESSAGE-EDGE | Complete cancellation before message reservation, short-message cleanup and retrieval with the exceptional recipient value 262143. | EXEC-7; GRAM-12 |
| U-ROM-GAG | Determine which CompuServe gag selections suppress Romulan messages. Austin’s selections are defined in TERM-14 and do not establish the CompuServe rule. | CompuServe application of TERM-14; C-12 |
| U-PREGAME-ARG | Complete pregame TYPE, SET NAME and report behavior when no ship has been commissioned. | SESSION-6/7; GAME-TYPE; pregame reports |
| U-GRIPE-HEADER | Define exact complaint-record headers and any accompanying changes to session state. | GAME-GRIPE; diagnostic recording |
| U-ADMIN-STORAGE | Complete the records changed by Austin *ZAP, including unavailable persistence and failure diagnostics. | SESSION-6 |
| U-C-STATISTICS | Complete CompuServe standings behavior after failed or partial reads/writes, including free-user selection after an unsuccessful regular-collection read. | C-6 |
| U-C-DOCUMENT | Establish the exact whitespace in CompuServe DOCUMENT’s diagnostic. | C-4 |
| U-C-SPEECH | Establish the player-visible notification and message-delivery effects of CompuServe autonomous announcements beyond the audiences defined in C-8. | C-8 |
| U-C-NODE | Resolve CompuServe direct Romulan reply selection from terminal identity. The generic random fallback is independently specified. | C-8 |
| U-C-LOCK | Complete CompuServe exclusion behavior on delayed grants, capacity exhaustion and service failures. | C-10 |
| U-MONITOR | Complete the abstract external inputs for identity, exclusion ordering, input readiness, clocks and world admission transitions. | Session, execution and conformance |

Separate playable policies are recorded in [playable decisions](../playable-decisions.md).
They do not amend the Austin core. Detailed evidence and causes of the questions
above are retained in the companion [research notes](implementation-notes.md#unresolved-implementation-questions).
Additional omissions are tracked in the [coverage record](evidence.md).

## Resolved review questions

U-TOKEN-LIMIT is resolved for ordinary input by LEX-7 and EX-CAPACITY-01 through
EX-CAPACITY-04. The bound depends on delimiters and the final null result.

The historical decimal-input corruption question is retained in research.
LEX-8 now defines independent token values for the generalized language; machine
corruption and malformed machine values are not part of its numeric semantics.
