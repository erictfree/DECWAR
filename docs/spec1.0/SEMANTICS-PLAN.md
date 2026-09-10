# Command-semantics plan

This is an editorial work plan, not part of the normative specification.
The grammar inventories all 31 ordinary commands; it does not yet define all
accepted historical inputs or what each command does. MOVE is a reviewed
working entry, not a completed conformance contract.

## Current completion work — 2026-09-07

All 31 ordinary commands have entries and authoritative productions. Coverage
is not completion: no command is promoted to complete solely by having an entry.
Sections 6, 9 and 10 now supply substantial shared mechanics, completion phases
and output assembly. The executable companions verify selected rules, not
complete command transactions or original-executable parity.

The remaining work is organized by dependency rather than drafting order:

1. **Interaction and lifecycle:** input recovery, interruption, admission,
   release, destruction/exhaustion and docking consequences; establish the
   state and event ordering needed by QUIT, movement, combat and service commands.
2. **Readiness and delivery:** phaser banks, torpedo and other delays, pending
   combat/radio lifetime and order. Separate game timing from terminal speed
   and storage-capacity artifacts; resolve character choices with the user.
3. **Observation completeness:** finish ordered LIST parameter interactions,
   entire report layouts, cumulative POINTS statistics and cross-command
   transcripts. Retain the worked SCAN grid and explicit visibility rules.
4. **Remaining world effects:** Romulan nova effects, autonomous processes
   required by command completion, and outstanding numeric state-write rules.
5. **Scope and character decisions:** resolve CHARACTER.md issues and the
   entry/privileged/help/news/host-information boundary. No unanswered question
   constitutes approval for a proposed simplification.
6. **Conformance audit:** check every command's accepted operands, validation
   precedence, state changes, timing, recipients, literal output and boundary
   cases against source evidence and executable scenarios. Remove stale reviewer
   notes only when their precise dependencies are closed.

PDF regeneration remains deferred at the user's request until content is ready.

### Timing discussion deferred for review

The next shared decision is C-007/C-016: whether prompt and report duration
can affect game readiness and turn completion. This is not a missing source
lookup. The historical behavior is established, but adopting or removing its
observable effects requires an author choice under the character-collision rule.
The user has asked to document these choices for discussion rather than decide
now. Section 9.1 contains the alternatives, consequences and a worked example.
Continue drafting with this explicitly open dependency; do not repeatedly stop
to request the same decision or treat deferral as approval of a proposal.

Proposed direction, not adopted: game delays begin when a complete valid
invocation is accepted and are independent of terminal speed, time spent
answering prompts and output duration. Positive explicit repair completes a
turn regardless of its report duration. Zero repair remains non-turn-consuming.
Actual durations, including weapon readiness, still require individual rules;
approval of this direction would not supply arbitrary numeric durations.

Finalizing the affected timing rules will require resolving this discussion;
it is not a gate on further draft development. Other unresolved choices remain
independent:
numeric quantization/overdraw, towing, report exceptions and the help/host
boundary. Do not treat approval of timing independence as approval of those
changes. Additional helper coverage must not substitute for resolving these
dependencies and checking complete command sequences.

Draft page flow needs no forced section breaks. Consult WORK_LOG.md and the
evidence files for completed increments; the sequence below is historical,
not a current queue of undrafted commands.

## Historical drafting sequence

IMPULSE is now drafted in Section 7.2, with its grammar migrated from Section 4.
It reuses the movement rules and explicitly inherits their open decisions.
TRACTOR is drafted in Section 7.3 with its grammar migrated, ordered link
checks, reciprocal updates, and notification text. Its pending-notice delivery
and C-012 device-damage question remain open. The movement family is drafted,
not conformance-ready. SET and TYPE are drafted with five player preferences;
name/terminal/admin scope and initialization remain open. DAMAGES and STATUS
are drafted next, with shared numeric/location formatting dependencies marked.
POINTS is drafted with cumulative-statistics, zero-denominator (C-013), and
report-layout dependencies marked. Scan source review identified C-014
(default radius versus terminal width) and faction-knowledge semantics;
see `evidence/07-scan-research.md`.
SCAN/SRSCAN are now drafted with explicit ranges, symbols, warning areas, and
discovery updates; C-014 remains open. Planets and bases have `knownTo` sets.
The five galaxy-report commands are drafted together in Section 7.10 with
defaults and shared visibility rules; cross-group acceptance, summary counts,
exact output, and tie ordering remain incomplete. Next family: ship resources.
Initial SHIELDS review is in `evidence/07-shields-research.md`; C-015 separates
transfer quantization and confirmed overdraw from the ordinary action rules.
SHIELDS is drafted in Section 7.11 with its authoritative grammar, action
checks, prompts, messages, and unaffected examples. C-015 and shared exhaustion
processing prevent complete transfer semantics. Continue with ENERGY.
ENERGY is now drafted in Section 7.12 with ordered validation, capacity and
loss rules, and notification shape. Precision and delivery remain open.
Next: REPAIR and DOCK, then CAPTURE and BUILD.
REPAIR and DOCK are drafted in Sections 7.13–7.14. Immediate per-device repair
and aggregate docking replenishment are defined; C-016 records negative repair
and output-dependent turn completion. Next entries: CAPTURE and BUILD.
CAPTURE and BUILD are drafted in Sections 7.15–7.16; combat, score units,
readiness, and some output remain incomplete. Before proceeding to weapons,
the user requested deeper observation coverage: a sample scan, parameter
combinations, visibility distinctions, and worked report selections are now
added. Exact transcripts and order-sensitive report parsing still need review.
RADIO is drafted in Section 7.17. Its settings and dialogues are defined;
TELL/delivery must close pending-message behavior. Weapons remain undrafted.
TELL is drafted in Section 7.18 with selection, sender-side settings changes,
and delivery-time gagging. Text limits and delivery scheduling remain open.
PHASERS and TORPEDOES are drafted in Sections 7.19–7.20. Validation,
expenditure, planetary effects, and burst behavior are described. Shared
combat/path/random/readiness rules and full output remain required work.
The remaining ordinary command entries are HELP, NEWS, TIME, USERS, GRIPE,
and QUIT; entry and privileged scope remains a separate unfinished batch.
HELP, NEWS, TIME, USERS, GRIPE, and QUIT now have working entries (7.21–7.26).
All 31 ordinary command productions have migrated, but this is draft coverage,
not completion. Next priority is closing shared semantics and output gaps,
not counting headings. Host/core decisions, historical character decisions,
entry/privileged forms, executable cases, and the rebuilt PDF remain required.

## Method

Work in small vertical slices, normally one command or a tightly related pair.
Give each grammar production one authoritative definition, following the
organization below. Review source evidence for input recovery as well as
successful execution; correct a production where it is defined.

For each slice, deliver:

1. The command entry: Syntax, Semantics, and representative examples.
2. Only the additional ADTs and invariants that the operation needs, explained
   in the document before use.
3. Ordered checks and mutations, including rejection and cancellation effects.
4. Turn consumption, readiness, and interactions with autonomous processes.
5. Ordered output with recipients, verbosity alternatives, and exact text or
   formatting rules. Parameterized output must define its fields.
6. Conformance cases giving prior state, input or dialogue, any prescribed
   random choices, resulting state, and ordered output.
7. A separate evidence note and explicit unresolved character decisions.

Do not count an entry as complete while it relies on an undefined helper,
unresolved shared rule, or unspecified output. Distinguish drafting, review,
and conformance readiness. Source-linked examples are not original-executable
differential verification.

## Grammar organization — revised 2026-09-07

The user revised the earlier migration decision: keep all formal EBNF in
Section 4, Grammar, and put readable help-style syntax summaries in command
entries. Section 4.15 now collects the ordinary command productions; shared
operands remain beside their explanations earlier in that chapter.

The summaries use literal words, angle-bracket operands, brackets for optional
input, alternatives and repetition. Explain prompting and bounds in prose.
Keep coordinate and COMPUTED forms separate where their operands differ.
Review summaries against the formal grammar; maintain one definition of each
formal production and check all references. Moving productions changes document
organization, not accepted input. The historical drafting sequence above
records the superseded command-local EBNF approach.

## First slice: close the dependencies exposed by MOVE

The grammar review separates operand shape from destination validation,
clarifies modifier-only responses, and states range and warp-check order.
With its production relocated as described above, the remaining work is semantic:

| Dependency | Required result | Decision or evidence work |
| --- | --- | --- |
| Player interaction | Coordinate preference, output length, pending input, cancellation, and continuation of a command line | C-009 and C-010; distinguish ordinary omissions from malformed-input recovery |
| Rejected movement | State effects for each validation failure | Decide C-005: over-range undocking and green condition |
| Sector path | Fully specified obstruction and sector-selection operation | Review C-006's two-sector band and boundary cases |
| Tractor movement | One resulting position for each ship; docked-status effects | Decide the towing part of C-006 separately from path geometry |
| Random choices | Distributions and dependencies needed by movement | Define observable choices without prescribing a generator |
| Turn completion | Repair, life support, scores, stardate, destruction, and output in evidence-supported order | Preserve resolved C-001; investigate pending-score necessity |
| Readiness | Duration, start event, and interaction with prompted input | Decide C-007; do not inherit terminal-speed architecture |

Introduce the smallest shared definitions needed in Sections 5, 6, 8, and 9.
Do not build a complete execution framework first. In particular, determine
which effects belong to a completed player turn and which autonomous processes
can occur independently; neither category should be defined by a catch-all
"end of turn" operation.

Once these choices are reviewed, finish MOVE's cases: each failure stage,
own-position retry, cancellation, a blocked first step, partial travel,
both shield modes, damaged engines, overheating outcomes, computer deflection,
towing, energy exhaustion, and subsequent readiness. Specify effects before
and after shared completion, rather than presenting immediate movement as a
whole-turn result.

## Command families

The order below is a proposed drafting sequence, not the final chapter order.
Resolve a shared rule when the first command needs it, then reuse it. An open
decision may defer affected cases without blocking unrelated entries.

| Batch | Commands | Main semantic work |
| --- | --- | --- |
| 1. Movement | MOVE, IMPULSE, TRACTOR | Finish MOVE; derive impulse limits and costs independently; define link creation, release, eligibility, and movement roles |
| 2. Player preferences | SET, TYPE | Define player-facing settings and preference reports; settle name normalization and terminal-option scope under C-011 |
| 3. Observation | STATUS, DAMAGES, POINTS, SCAN, SRSCAN, LIST, SUMMARY, BASES, PLANETS, TARGETS | Define visible information, ranges, selector evaluation, enumeration order, report layout, and effects on time or state |
| 4. Ship resources | SHIELDS, ENERGY, REPAIR, DOCK | Transfer bounds and confirmations, device repair, docking eligibility, replenishment, life-support reset, and turn costs |
| 5. Planets and bases | CAPTURE, BUILD | Ownership, staged construction, interruptions, scoring, replacement at the same position, and faction base limits |
| 6. Weapons | PHASERS, TORPEDOES | Target resolution, expenditure, paths, hit/damage rules, destruction, score effects, multi-target order, and combat output |
| 7. Communication | RADIO, TELL | Recipient selection, gagging, send/delivery timing, pending messages, and sender/recipient output |
| 8. Information and departure | HELP, NEWS, TIME, USERS, GRIPE, QUIT | Information sources, player visibility, feedback interaction, confirmation, departure/release, and the host/core boundary |

Batch 3 is ten entries, not one large slice. Start with STATUS and DAMAGES,
then POINTS, the scan pair, and finally the five report commands. Settle report
selection and C-004 enumeration order before duplicating their output rules.
Read-only-looking commands still require an explicit finding about mutation,
turn consumption, and readiness; do not assume they are free or inert.

For batch 6, derive common damage and destruction mechanics before writing
weapon-specific applications. For batch 7, distinguish generating a message
from delivering it. Batch 8 must revisit C-002 rather than silently reproducing
temporary information-activity markers as galaxy objects.

## Entry and privileged forms

After the ordinary commands, specify pre-game availability and differences for
the reused commands, then ACTIVATE and the entry dialogue. Connect commissioning,
departure, destruction, and release to the lifecycle ADTs.

Account separately for *DEBUG, *PASSWORD, *ZAP, and privileged SET forms.
C-011 must decide which have core semantics and which belong to an explicitly
separate administrative contract. An inventory entry is not approval to make
historical host facilities part of Austin Core. Keep credentials and host
mechanisms out of the game definition.

## Completion review

Maintain a command checklist as entries are drafted. For every grammar
production, check that the corresponding entry covers complete input, explicit
omission, relevant malformed input, and phase availability. Then exercise
cross-command cases, especially:

- settings followed by prompted movement and reports;
- docking followed by rejected movement, towing, or energy transfer;
- capture/build followed by base reports and docking;
- damage followed by repair, movement, life support, and destruction;
- radio changes between message creation and delivery;
- slash-separated input interrupted by a prompt, cancellation, or destruction;
- autonomous activity while a player is waiting or answering a prompt.

The end condition is a self-contained contract for every retained command,
with defined shared operations and testable output. A populated chapter or a
passing grammar-coverage check alone does not meet it.
