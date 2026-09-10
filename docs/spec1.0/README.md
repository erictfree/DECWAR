# DECWAR game language

This directory is a clean, implementation-neutral specification of DECWAR. It
treats the command-line game as a language operating on a shared galaxy.

The specification will define four connected things:

1. the abstract game state;
2. player command syntax;
3. player and autonomous state transitions; and
4. the text presented to players, including its wording, layout, and order.

TypeScript is used as readable notation for data and algorithms, not as a
required implementation language or storage model. Command syntax will use
EBNF. Exact output text will be specified where wording, layout, or timing is
part of the game's identity.

## Reading order

The working structure is recorded in [OUTLINE.md](OUTLINE.md). Section 1 is the
[Introduction](01-introduction.md); Section 2,
[Abstract data types](02-abstract-data-types.md), defines the current model.
[Lexical structure](03-lexical-structure.md) and
[Grammar](04-command-grammar.md) define the working language.
[Semantic framework](05-semantic-framework.md) defines shared confirmation
and interaction distinctions, with remaining input behavior marked for review.
[Command semantics](07-command-semantics.md) contains draft entries for all
31 ordinary commands. Observation entries include a sample grid and parameter,
visibility, and worked-selection tables.
[World mechanics](06-world-mechanics.md) defines initial and critical weapon
damage. [Execution and ordering](09-execution-and-ordering.md) defines the
current turn-completion rules; [Output language](10-output-language.md)
defines numeric, position, and object-report fields. These shared chapters
are partial, not complete dependencies for every command.
The [command-semantics plan](SEMANTICS-PLAN.md) records its remaining dependencies
and the proposed sequence for all command entries.
[Autonomous activity](08-autonomous-activity.md) begins with player-triggered
base defense and restoration. Section numbers follow the outline;
[Conformance scenarios](11-conformance-scenarios.md) begins with cross-command
presentation, radio and report-discovery cases. Section 5 remains a partial
interaction framework; these scenarios are not a complete conformance suite.

## Current increment

[Command completion ledger](COMMAND-REVIEW.md) distinguishes the checks already
present from the whole-command evidence and decisions still required.

The grammar now covers all 31 ordinary in-game commands, shared selectors and
operands, prompted forms, pre-game entry, and the privileged vocabulary.
Formal command, operand and response productions live in Section 4. Command
entries give readable syntax summaries and semantics. Reviewer notes mark open
acceptance/recovery cases, report-group restrictions, and the boundary between
game language and historical presentation or administration.
PDF regeneration and visual review are deferred until the content is ready.
The existing PDF is an interim build, not a reviewed current delivery. Draft
layout uses ordinary page flow, with only the title page explicitly separated.
Separate evidence records cover
[language](evidence/03-04-language.md), the
[full command inventory](evidence/04-command-inventory.md), and
[MOVE](evidence/07-move.md), [IMPULSE](evidence/07-impulse.md), and
[TRACTOR](evidence/07-tractor.md).

[Preferences and ship reports](evidence/07-preferences-and-reports.md) records
the evidence and remaining scope for SET, TYPE, DAMAGES, and STATUS.

[Scans](evidence/07-scan-research.md) and
[galaxy reports](evidence/07-galaxy-reports.md) cover the current observation
slices. These are drafts with explicit acceptance, output, and ordering gaps.

Read [AGENTS.md](AGENTS.md) for the rules governing this specification and
[CHARACTER.md](CHARACTER.md) for decisions where abstraction may collide with
the game's personality.
