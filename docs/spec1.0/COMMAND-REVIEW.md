# Command completion ledger

Editorial audit, 2026-09-08. This is not normative text or a conformance claim.
All 31 ordinary commands have formal productions in Section 4.15 and readable
entries in Section 7. The grammar test verifies coverage, unique definitions
and resolved references; it does not verify accepted input against source.
No command below is marked complete. The listed gaps are concrete blockers to
that claim, not an exhaustive replacement for the entry's reviewer notes.

Completion requires, for each command: operands and combinations; validation
and recovery order; state effects; turn/readiness behavior; output and recipient
rules; and whole-command scenarios covering success, rejection and boundaries.
An isolated arithmetic or formatting test proves only the named component.

Read the remaining-work column as three distinct kinds of gap: an unwritten
rule; an explicit author decision already documented with alternatives; or
missing verification of a stated rule. The deliverable is the self-contained
specification, not a second running game. A generic executable interpreter is
not a prerequisite for completing its prose, and a passing companion test
does not settle an author decision. A final conformance contract still cannot
be claimed while required behavior is undefined or its policy remains open.

Fixed-width numeric overflow is now defined in Section 10.2 and exercised in
STATUS and DAMAGES. Finer-than-tenth conversion remains a separate numeric
decision. Recent shared delivery definitions supersede the older generic
delivery-gap wording in the affected command entries; C-023 and the missing
producer snapshot rules remain real dependencies. Section 2 now accounts for
all inventoried notification categories, including hit and star-event facts,
without selecting their C-023 delivery order or storage capacity. Declaring the
facts does not establish that every producer records them correctly.

| Command | Entry | Existing focused checks | Remaining completion evidence needed |
| --- | --- | --- | --- |
| MOVE | 7.1 | Path and completion helpers; blocked linked movement through cost, repair and turn accounting; concrete oblique-placement conflict | C-005 rejected side effects, C-006 path/towing, C-007 readiness and shared input policy |
| IMPULSE | 7.2 | Written clear/blocked axis path, exact-energy exhaustion, completion/final report/release; blocked linked movement | Same movement/input decisions as MOVE; no additional generic transaction requirement |
| TRACTOR | 7.3 | Written command recognition, tokenized dialogue, reciprocal changes, typed occurrence and selected-recipient delivery/discard | Device eligibility and malformed-input decisions, slash dispatch, interruption and global notice ordering |
| SET | 7.4 | Ordinary setting lookup, tokenized setting/value prompts, cancellation and preference assignments | Raw segments/editing; name, terminal and privileged scope; trailing-input decision |
| TYPE | 7.5 | Prefix/ambiguity/retry/cancel dialogue, five preference output lines and complete historical option-report form | Raw input, terminal suffix and version-banner decisions |
| DAMAGES | 7.6 | Full/selected formatting, typed recovery and all 81 two-device-code written pairs through exact short output | C-010 recovery decision, numeric boundaries and broader written prefix/output-length cases |
| STATUS | 7.7 | Full/selected formatting, typed recovery and all 49 field pairs with space/comma separators through exact short output | C-010 recovery decision, numeric boundaries and broader written/output-length cases |
| POINTS | 7.8 | All 15 nonempty subject subsets from written aliases/repetition to unique ordered short columns; defaults, arithmetic and layouts | Zero denominators, input/recovery decision, numeric/output-length boundaries and statistical updates |
| SCAN | 7.9 | Typed explicit operands to bounds/grid; discovery/warnings; row-boundary interruption | Default width, narrow labels, concealment and raw input/interrupt gestures |
| SRSCAN | 7.9 | Same typed explicit-range operation | Distinct default plus SCAN's shared gaps |
| LIST | 7.10 | Mixed direct/aggregate/CLOSEST groups, Romulan rows, error retention, discovery and special-sector range diagnostics | Mixed selectors within direct groups, ties, C-028 nearby empty/star/black-hole output choice and raw input |
| SUMMARY | 7.10 | Written 19-case category/allegiance matrix at all lengths; scope, excluded-candidate qualifiers and grammar-family audit | C-010 faction/Romulan selection and repetition; shared input/precision policy |
| BASES | 7.10 | ALL LIST to rows/discovery; resolved coordinates/CLOSEST; grammar-family audit | C-004 base order/ties, C-017 coordinate exceptions, C-010 mixed groups and shared input policy |
| PLANETS | 7.10 | Default selection to rows/discovery; direct radius/no-discovery; grammar-family audit | C-004 ties, C-017 coordinate exceptions, C-010 mixed groups and shared input policy |
| TARGETS | 7.10 | Combined summary, unknown base, direct Romulan, ordered PORTS and grammar-family audit | C-010 mixed/repeated-Romulan groups, C-017 coordinate exceptions, C-004 ties and shared input policy |
| SHIELDS | 7.11 | UP/DOWN state, exact threshold, repeated charge, ordered tractor release/exhaustion output and prompt-state scenarios | Transfer decision, trailing-input policy, later fatal acquisition verification and notice delivery |
| ENERGY | 7.12 | Tokenized validation; exact 90-unit and full-capacity transfer scenarios through typed notice and delayed delivery, including radio independence | General transfer precision, raw input/trailing-token decision, interruption and global delivery order |
| REPAIR | 7.13 | Typed amount/report composition; nonnegative repair, defaults, caps and report recovery | Malformed-input decision, negative values, undamaged ALL, raw input and timing |
| DOCK | 7.14 | Friendly service, repeated docking, STATUS-before-repair, below-threshold completion and one due enemy-base cycle | Raw input, broader due-cycle/death cases, full notification delivery and readiness |
| CAPTURE | 7.15 | Capture score, combat helpers, recipient boundaries, surviving/fatal completion and former-owner docking divergence | C-021 port loss, shared precision, delivery and readiness; not another executable transaction |
| BUILD | 7.16 | Ordered resolved eligibility; rejection/state preservation; stage limit, awards, and fifth-stage conversion-through-completion scenario; explicit final-planet divergence | Port-loss/game-end decisions, base insertion order, readiness and simultaneous-operation policy |
| RADIO | 7.17 | Normalized-token action/name dialogues, state changes, slash-response transcript and documented suffix alternatives | Suffix policy, interruption and pending-delivery interaction |
| TELL | 7.18 | Normalized recipient selection, settings/cancellation, text, RADIO-to-delivery cases and source-derived recipient-prompt traces | Raw text/edit/replay, interrupted input and global delivery/lifetime ordering |
| PHASERS | 7.19 | Ordered validation and planet-shot cases; written noncritical ship shot through damage, score commitment and separate recipient deliveries; bank selection | Shared precision, readiness, destruction/port-loss and notification-order decisions; critical/nova paths retain Section 6 dependencies |
| TORPEDOES | 7.20 | Ordered preflight/repeated targets; flight and impact rules; neutralized misfire burst through ammunition, notices and one-turn accounting; changing planet target | Input/recovery, shared nova decisions, C-029 issuer destruction mid-burst and readiness; no claim of a generic executable burst interpreter |
| HELP | 7.21 | Grammar; source-checked list data/widths, command-first lookup cases, additional-topic ambiguity and continued error processing | Selected topic corpus, C-008 spelling, interruption and information-activity visibility |
| NEWS | 7.22 | Supplied-text display, marker boundaries, continuation/cancellation, line-boundary interruption and restart; preserved corpus reproduced for discussion | Corpus decision and raw interrupted-input handling |
| TIME | 7.23 | Historical complete in-game/pre-game output, fractional-second truncation and duration-format boundaries | Host/core field choice, clock definitions and signed/long-duration policy |
| USERS | 7.24 | Grammar; source-derived roster/lifecycle selection, six row-order scenarios, exact historical field composition and supplied-field report example | Author decision: core versus host columns and admission/name contract; shared input/interruption policy |
| GRIPE | 7.25 | Edited-line collection, blank/empty distinction, cancellation, line-limit and EOF warning precedence | Feedback destination/metadata/failure, raw editing and concealment decision |
| QUIT | 7.26 | Fresh confirmation through report/release; prior-input discard, cancellation, RED and affirmative prefixes; outgoing messages, partner notice and replacement occupancy | Response recovery edge forms, zero denominators, interruption/concurrency and reentry boundary |

## Shared dependencies and next work

### Completion audit boundary

The ordinary command entries are drafted, but the specification is not a
finished command contract. In particular, four kinds of required definitions
cannot be supplied by checking more agreeing examples:

- **Accepted interaction:** the final spelling, malformed-input, interruption
  and replay policies must determine what the shared input chapter accepts
  and consumes. Normalized-token examples do not define raw editing.
- **Time and concurrent events:** readiness durations/start events and event
  ordering need a selected contract before the ADTs and execution chapter can
  express them completely. Existing stardate and completion rules are not a
  substitute for elapsed-time readiness.
- **Observable data:** HELP/NEWS content, host-facing command scope and player
  name rules require editorial choices followed by self-contained datasets or
  interface definitions. A historical content inventory is not the dataset.
- **Disputed state transitions:** precision, towing, port loss, endings and
  notice ordering need the recorded character choices, then corresponding
  changes and verification across affected chapters.

These are dependencies of command completion, not authorization to pick a
policy or to expand the companion into an implementation. The remaining
independent audit is to reconcile each command's shared-rule references and
remove any genuinely obsolete missing-definition claim. A choice-dependent
note stays open even when all its ordinary examples pass.

### Author review is not missing command prose

The following decisions are documented with alternatives. They cannot be closed
by adding more tests or silently choosing the easier implementation. They remain
separate from the drafting/verification work below.

| Decision area | Recorded discussion | Principal command dependencies |
| --- | --- | --- |
| Input spelling, omitted values, suffixes and interruption | C-008–C-010 | All commands through the shared input contract |
| Timing and completion | C-007, C-016; Section 9.1 | Movement, REPAIR, DOCK, CAPTURE, BUILD and weapons |
| Movement and displacement geometry | C-005, C-006, C-018 | MOVE, IMPULSE and weapons |
| Numeric conversion and zero averages | C-013, C-015, C-016 | POINTS, QUIT, SHIELDS, ENERGY, REPAIR and combat |
| Report selection and display exceptions | C-004, C-010, C-014, C-017, C-028 | SCAN/SRSCAN and the five galaxy-report commands |
| Information activity and host-facing content | C-002, C-003, C-011 | HELP, NEWS, TIME, USERS, GRIPE, SET and TYPE |
| Tractor-device eligibility | C-012 | TRACTOR |
| Destruction, port loss and game ending | C-019–C-022, C-026, C-029 | Weapons, CAPTURE, BUILD, movement and QUIT |
| Notification ordering and exceptional event facts | C-023–C-027 | Commands producing or consuming notifications; autonomous combat |

This table is a dependency map, not an assertion that every listed decision
affects every ordinary invocation. C-001's accepted life-support behavior is
not reopened. A simple successful example can avoid a decision without resolving
the command's full contract.

### Work that can continue without deciding those policies

#### Report-family coverage audit

The Section 4.9 production was checked against Section 7.10 by parameter
family, rather than treating every permutation as a new drafting requirement.
The following map identifies the general rules and their remaining exceptions.
It establishes where each form is explained, not exhaustive executable parity.

| Grammar family or interaction | Defining prose and existing verification | Remaining decision |
| --- | --- | --- |
| Omission and command-specific availability | Parameters-by-command table; all five defaults checked in report-groups tests | Shared input boundaries |
| Object/allegiance selectors | Constructing-a-group rules; ordinary category/allegiance matrix; explicit PORTS/ALL order cases | Faction-name Romulan retention |
| Numeric range, ALL and output mode | Explicit radius takes precedence in either order; whole-scope visibility examples; output-mode tests | Shared numeric/input limits |
| NEUTRAL/CAPTURED with PORTS | Ordered acceptance and resulting kind/allegiance table | No separate unwritten ordinary rule |
| Named vessels and coordinates | Direct-query rows, absence/range diagnostics, no discovery and roster order | Mixed selectors, duplicate names and coordinate exceptions |
| CLOSEST | Candidate eligibility, self-exclusion, radius, direct output and no discovery; unique-nearest examples | Equal-distance ties and base order |
| Repeated groups and output modifiers | Defaults reset; independent detail/count union; direct-before-aggregate output and partial-error examples | Repeated Romulan summary; interrupted input |
| Summary output and empty results | Qualifier precedence, excluded candidates, exact no-results assembly, TARGETS combined count and Section 10.9 separators | Above selection decisions; shared precision |

There is no remaining unnamed parameter family to draft. A newly found
counterexample should identify the particular missing rule or contradiction;
“remaining combinations” is no longer an actionable task by itself.

1. **Report/input coverage:** ordinary written STATUS/DAMAGES pairs and POINTS
   subject subsets are checked. The report-family audit above accounts for
   each grammar family and identifies open exceptions. Further work should
   target a named contradiction or decision, not increase permutation counts.
2. **Combat sequences:** PHASERS now connects a written noncritical shot to
   damage, scores, completion and recipient delivery; TORPEDOES connects the
   neutralized misfire burst to one-turn accounting. These close the missing
   ordinary completion examples. Shared precision, timing, nova/destruction
   and delivery choices remain open; guards or agreeing examples do not
   resolve those choices. Do not require a second game interpreter to finish
   the command prose.
3. **Port operations:** CAPTURE's surviving/fatal completion and BUILD's
   fifth-stage completion are now specified as sequences in agreeing worlds.
   Their entries also expose former-owner docking and final-planet ending
   divergence. Remaining work is the recorded shared lifecycle/timing choices,
   not an additional interpreter or proof that agreeing examples settle them.
4. **Information commands:** ordinary HELP lookup/list/error scenarios and
   historical USERS row rendering are now documented and source-reviewed.
   HELP's selected corpus, information-activity visibility and interruption,
   and USERS's column/name contract still require recorded decisions. Do not
   keep these completed explanations open as requests for more formatting
   helpers. NEWS and TIME likewise retain their explicit content/clock choices.
5. **Cross-chapter audit:** check command claims against the ADTs, grammar,
   autonomous operations and delivery/completion chapters; replace obsolete
   “not defined” notes with the actual remaining decision or missing rule.

These are specification verification tasks, not a requirement to construct a
second game runtime. Each checked sequence must identify which effects are
composed by its fixture and which are performed by general operations. A
separate helper for every sentence is not a completion criterion.

Section 9 now distinguishes all commands' completion routes and defines the
shared population-dependent world-activity trigger. Fatal CAPTURE reaches
completion; MOVE/IMPULSE bypass it when already marked destroyed, not merely
when movement spent the last energy. Chapter 8's former every-completion
wording has been corrected. Trigger initialization and concurrent-event order
remain open, but the sequential cadence is no longer an unspecified dependency.

Section 9.5 now defines notification snapshots, delivery-time presentation,
combat-before-radio priority and direct-departure discards. Historical combat
delivery is not chronological; C-023 records ordering and capacity-loss choices
without adopting historical storage or a replacement policy. Event formatting
tests do not close this sequence-level decision.

Section 9.3 now includes the previously omitted pre-prompt YELLOW assignment
at energy <=1000 and its warning, distinct from informative-prompt formatting.
Section 11.5 exercises that intervening acquisition in a capture/four-build
trace through state and score checkpoints; full executable gameplay
transactions and final-conversion decisions remain open.

Section 5 now defines confirmation and selected prompt-consumption rules;
the working segment lexer now connects written inputs to the three tested
Chapter11 command sequences. Empty comma/slash forms remain explicit guards,
and fixture-directed dispatch is not a complete grammar recognizer.
Ordinary command-head recognition and the shared single-destination resolver
are now connected to written inputs for MOVE, IMPULSE, CAPTURE and BUILD.
Resolution by itself does not cover preceding device checks, subsequent
eligibility, state changes, prompted retry handling or readiness. The IMPULSE
exhaustion cases now connect a selected axis movement through completion and
release; the BUILD preflight checks cover resolved eligibility, not conversion.
Section 11 contains initial cross-command scenarios, not a complete suite.
Sections 6, 8, 9 and 10 contain useful
rules but still have explicit gaps; a command depending on those gaps is not
complete because its own prose names the operation. CHARACTER.md records the
outstanding choices. Unanswered questions do not approve a proposed rule.

Prioritize the concrete sequence gaps above over more isolated formatter checks.
The report group-selection model exists; remaining work is legal-combination
coverage and recorded exceptions, not a replacement model. ENERGY has agreeing
precision cases through delayed delivery; general precision is still open.
NEWS's supplied-text display is checked, while its selected corpus is not
adopted. Keep PDF generation deferred until content is ready.
