# DECWAR language and behavior specification

**Eric Freeman, PhD · Noah Smith, PhD**

The University of Texas at Austin

Department of Arts and Entertainment Technologies

**Draft in progress.** This specification defines the Austin reconstruction's
observable game behavior independently of implementation language and platform.
It is intended to support independent implementations, including future clients
that do not present a terminal. It does not yet provide a complete conformance
standard. The [plan](PLAN.md) and [coverage record](evidence.md) identify progress.

## SCOPE-1 — Core and amendments

The core target is the supplied Austin reconstruction at upstream revision
`f78f2ec733999617e4281ba3ed967bff8cd5d8f8`. It is not claimed to be an untouched
historical release. CompuServe differences belong in a separate appendix keyed
to core clause identifiers. A core rule is not inferred from CompuServe merely
because that version has more extensive documentation or was ported first.

The source archives are evidence for deriving the specification. A completed
normative clause should be implementable from its text; importing the source,
its memory map or the existing TypeScript implementation is not a conformance
requirement. Citations explain provenance, not an escape hatch for incomplete rules.

## SCOPE-2 — Normative language and evidence

MUST and MUST NOT express requirements of a drafted clause. MAY denotes an
explicitly permitted choice, not missing research. An implementation-defined
choice requires documentation by the implementation. Unresolved behavior means
this draft cannot yet state the rule; it does not grant unlimited behavior or
establish that the original program behaved unpredictably.

Each clause is normative unless marked **Evidence**, **Explanation**, **Open** or
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

An implementation need not reproduce addresses, physical segments, instruction
encodings or operating-system calls. It MUST preserve the observable effects that
the corresponding normative clause establishes, including numeric truncation,
state sharing and effects caused by source aliasing. A graphical implementation
can claim a future game-semantics profile without claiming terminal conformance;
profile criteria will be defined separately rather than silently relaxing output.

## Current sections

- [Lexical rules](lexical.md): application characters, tokenization and matching.
- [Command grammar](grammar.md): command dispatch and initial productions.
- [Abstract state](state.md), [execution](execution.md) and [sessions](session.md).
- [Game semantics](gameplay.md) and [randomness](randomness.md).
- [Terminal behavior](terminal.md) and [conformance examples](conformance.md).
- [CompuServe amendments](compuserve.md).
- [Named message fragments](messages.md): exact source text.
- [Evidence and coverage](evidence.md): source references and review status.
- [Unresolved behavior](unresolved.md): questions and separate playable policies.

Remaining clause-level work is tracked in the plan and coverage appendix.
No host port, filesystem format, programming language or emulator is mandated.

## Attribution

The specification accompanies the DECWAR port by Eric Freeman, PhD, working with
OpenAI GPT-6 Astra, based on Noah Smith, PhD’s Austin reconstruction and the legacy
CompuServe tape. See [source provenance](../../legacy/README.md),
[licensing](../../LICENSING.md) and [decwar.org](https://decwar.org).

## Building the single document

Run `npm run spec:build` to assemble all chapters into one LaTeX document and
compile its PDF; the same command generates standalone HTML and Markdown.
See [build instructions](BUILD.md) for dependencies, outputs and validation.
