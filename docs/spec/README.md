# DECWAR language and behavior specification

**Eric Freeman, PhD · Noah Smith, PhD**

The University of Texas at Austin

Department of Arts and Entertainment Technologies

**Draft in progress.** This edition is being rewritten around grammar and
operations on a game-state abstract data type (ADT). Command contracts define
preconditions, state effects, outcomes, observations and completion; readable
pseudocode supplements those contracts where useful. The
[language coverage](language-coverage.md) records drafted commands and remaining
work. World evolution, sessions, complete responses and variant amendments
remain incomplete. The earlier source analysis is retained as companion research
outside this book.

This specification defines the Austin reconstruction's
game language and recognizable game behavior independently of implementation
language and platform. This is a forward-looking specification, not a contract
for reproducing PDP-10 machine behavior.
It is intended to support independent implementations, including future clients
that do not present a terminal. It does not yet provide a complete conformance
standard. The [plan](PLAN.md) and [language coverage](language-coverage.md) identify
progress separately from the older source analysis.

## SCOPE-1 — Core and amendments

The core target is the supplied Austin reconstruction at upstream revision
`f78f2ec733999617e4281ba3ed967bff8cd5d8f8`. It is not claimed to be an untouched
historical release. CompuServe differences belong in a separate appendix keyed
to core clause identifiers. A core rule is not inferred from CompuServe merely
because that version has more extensive documentation or was ported first.

The legacy implementations and preserved Austin executable are the primary
evidence for deriving syntax and game rules. Ordinary arithmetic replaces
machine-specific integer and floating-point artifacts. Small numerical
differences caused by that normalization are permitted; new command syntax
and redesigned mechanics are not. This document states the resulting
rules in terms of inputs, abstract game state, transitions and observations.
Its abstract algorithms specify effects, without prescribing storage layouts,
implementation techniques, programming languages or platform services. A completed normative clause must stand on its
own; citations explain provenance rather than supplying omitted requirements.

Instruction analysis, storage explanations, build procedures and review coverage
belong in the companion [research and coverage record](evidence.md), which is
not included in the assembled specification. The [normalization policy](NORMALIZATION.md) separates the game’s established
rules from numerical and representation artifacts that do not belong in this
forward-looking language.

## SCOPE-2 — Normative language and evidence

MUST and MUST NOT express requirements of a drafted clause. MAY denotes an
explicitly permitted choice, not missing research. An implementation-defined
choice requires documentation by the implementation. Unresolved behavior means
this draft cannot yet state the rule; it does not grant unlimited behavior or
establish that the original program behaved unpredictably.

Each clause is normative unless marked **Evidence**, **Explanation**, **OPEN QUESTION** or
**Example**. Requirements in this incomplete draft apply only to the identified
clause and its stated domain. No implementation may use a few passing examples
as a claim of complete DECWAR conformance. Examples illustrate requirements;
they do not override them.

Executable statements have priority over comments and help when deriving rules.
A source-derived expectation, an observation of the native reconstruction and a
result of the TypeScript port are distinct evidence classes. Conflicts remain
visible until resolved. Known playable repairs are separate policies, not silent
amendments to Austin.

## SCOPE-3 — Observable behavior

Observations include accepted commands and abbreviations, prompts, output,
state changes, information disclosure, resource charges, random choices, timing,
and effects visible to other captains. An abstract transition can have intermediate
observable steps; commands are not assumed atomic.

The specification does not require physical addresses, instruction encodings,
packed fields, finite-word overflow, corrupted token values or accidental
cross-field changes. Commands MUST preserve the game-state changes and player
observations established by their semantic clauses under ordinary arithmetic. A graphical implementation
can claim a future game-semantics profile without claiming terminal conformance;
the [conformance domains](language-conformance.md#conformance-domains) distinguish
these claims without silently relaxing output.

## Current sections

- [Abstract game model](language-model.md): game-state ADT, identities and quantities.
- [Lexical rules](lexical.md) and [command grammar](grammar.md).
- [Commands and their meaning](commands.md): operation contracts and semantic rules.
- [Shared world rules](world-rules.md): paths, tractor associations, damage and installations.
- [Turns and elapsed time](turns.md): repair, action accounting and pacing.
- [Autonomous Romulan](autonomous.md): appearance, targets, movement and attacks.
- [Communication](communication.md): radio, combat observations, recipients and delivery.
- [Sessions and commissions](session-rules.md): activities and release.
- [Information resources](information.md): help, news and feedback content.
- [Terminal presentation](presentation.md): fields, prompts, combat/radio bodies and report layouts.
- [Semantic examples and conformance](language-conformance.md).
- [CompuServe variant](variants.md).

The [plan](PLAN.md) tracks the remaining conversion. The [earlier game-rule
analysis](gameplay.md), [terminal analysis](terminal.md), [message catalogue](messages.md)
and [source coverage](evidence.md) remain available separately. They are research
inputs, not additional normative chapters of this generalized specification.

## Attribution

The specification accompanies the DECWAR port by Eric Freeman, PhD, working with
OpenAI GPT-6 Astra, based on Noah Smith, PhD’s Austin reconstruction and the legacy
CompuServe tape. See [source provenance](../../legacy/README.md),
[licensing](../../LICENSING.md) and [decwar.org](https://decwar.org).

## Companion material

The [research and coverage record](evidence.md), [work plan](PLAN.md) and
[build instructions](BUILD.md) accompany this specification separately.
