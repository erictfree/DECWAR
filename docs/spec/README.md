# DECWAR language and behavior specification

**Eric Freeman, PhD · Noah Smith, PhD**

The University of Texas at Austin

Department of Arts and Entertainment Technologies

**Draft in progress.** This specification defines the language and behavior of
the Austin reconstruction of DECWAR. It describes commands as operations on an
abstract game state, independently of any programming language, computer or user
interface. Pseudocode is used where it makes a rule clearer.

The draft is not yet a complete conformance standard. World evolution, sessions,
complete responses and variant amendments still require work. The
[work plan](PLAN.md) and [language coverage](language-coverage.md) show what has
been completed. Historical source analysis remains available as companion
research outside this book.

## SCOPE-1 — Core and amendments

The core language is derived from the supplied Austin reconstruction at upstream
revision `f78f2ec733999617e4281ba3ed967bff8cd5d8f8`. It is not claimed to be an
untouched historical release. CompuServe differences belong in a separate
appendix keyed to core clause identifiers. CompuServe evidence does not
establish an Austin rule merely because it is better documented or was ported
first.

The legacy implementations and preserved Austin executable are the primary
evidence for syntax and game rules. The specification expresses those rules as
inputs, state transitions and observable results. It uses ordinary arithmetic
in place of machine-specific integer and floating-point behavior. This may
produce small numerical differences, but does not permit new commands or changed
game mechanics.

The abstract algorithms define required effects. They do not prescribe storage
layouts, implementation techniques, programming languages or platform services.
A completed normative clause states its rule in full. The companion
[source index](source-index.md) records where each rule was derived.

Instruction analysis, storage explanations, build procedures and review records
belong in the companion [research and coverage record](evidence.md), which is not
part of the assembled specification. The [normalization policy](NORMALIZATION.md)
separates established game rules from PDP-10 numerical and storage artifacts.

## SCOPE-2 — Normative language and evidence

MUST and MUST NOT state requirements. MAY states a choice that the specification
explicitly permits. An implementation-defined choice must be documented by the
implementation. Unresolved behavior marks a rule that this draft cannot yet
state; it does not grant an implementation freedom to choose any behavior.

Each clause is normative unless marked **Explanation**, **OPEN QUESTION** or
**Example**. A requirement applies only within the clause
and domain that state it. Examples illustrate requirements and do not override
them or establish complete DECWAR conformance.

When evidence conflicts, executable statements take priority over comments and
help text. Source-derived rules, observations of the Austin reconstruction and
results from the TypeScript port remain distinct forms of evidence. Unresolved
conflicts remain visible. A repair that makes a version playable is identified
as policy rather than silently added to the Austin language.

## SCOPE-3 — Observable behavior

Observable behavior includes accepted commands and abbreviations, prompts,
output, state changes, disclosed information, resource charges, random choices,
timing and effects visible to other captains. A transition may expose
intermediate steps; a command is not automatically atomic.

Physical addresses, instruction encodings, packed fields, finite-word overflow,
corrupted token values and accidental cross-field changes are outside the game
language. Under ordinary arithmetic, commands MUST preserve the state changes
and player observations required by their semantic clauses. A graphical client
may conform to game semantics without conforming to the terminal protocol; the
[conformance domains](language-conformance.md#conformance-domains) distinguish
these claims.

## Current sections

The remaining chapters define the language in the following order:

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

The [work plan](PLAN.md) tracks the remaining conversion. The [earlier game-rule
analysis](gameplay.md), [terminal analysis](terminal.md), [message catalogue](messages.md)
and [source coverage](evidence.md) remain available separately. They are research
inputs, not additional normative chapters of this generalized specification.

## Attribution

The specification accompanies the DECWAR port by Eric Freeman, PhD, working with
OpenAI GPT-6 Astra, based on Noah Smith, PhD’s Austin reconstruction and the legacy
CompuServe tape. See [source provenance](../../legacy/README.md),
[licensing](../../LICENSING.md) and [decwar.org](https://decwar.org).

## Companion material

The [source index](source-index.md), [research and coverage record](evidence.md),
[work plan](PLAN.md) and [build instructions](BUILD.md) accompany this
specification separately.
