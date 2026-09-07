# DECWAR language specification contract

This directory defines DECWAR as a game language. It is a fresh specification
for new implementations, not a description or refactoring of the existing port.

## Purpose

Specify the game in its purest form without sanding away the details that give
it character. The specification defines:

- the shared game state and its invariants;
- player command syntax and parsing;
- command semantics as state transitions;
- autonomous game processes and their trigger/order rules;
- observable output text, structure, ordering, and significant whitespace; and
- conformance scenarios that another implementation can execute.

The conceptual model is:

```text
player input or autonomous trigger
    -> language operation
    -> game-state transition
    -> ordered observable output
```

Player commands are not the only source of behavior. Romulan activity,
maintenance, rebuilding, delayed readiness, combat delivery, admission,
release, and galaxy lifecycle are first-class semantic processes when the game
rules require them.

## Purity boundary

Do not introduce architecture from the PDP-10 program, the current TypeScript
port, or any prospective implementation. In particular, normative types and
algorithms must not contain machine words, packed fields, memory layouts,
COMMON blocks, queues chosen only for transport, compiler behavior, monitor
calls, process models, persistence formats, network protocols, or compatibility
modes.

Historical sources and the running port may reveal game behavior, edge cases,
and observable text. They do not dictate the new model. Keep provenance and
historical analysis outside normative TypeScript and EBNF.

Use ordinary mathematical quantities. A percentage is expressed from 0 to 100,
displayed energy is expressed in energy units, and coordinates are ordinary
whole-number sector coordinates. Apply rounding or truncation only where it is
part of the observable game rule.

## Specification forms

- Use valid TypeScript for abstract data, requests, outcomes, and readable
  transition algorithms.
- Use EBNF for lexical and command syntax.
- Specify output as an ordered language, including exact wording and whitespace
  when those are part of the game's character or command-line contract.
- Use prose for invariants and semantic restrictions TypeScript cannot express
  clearly.
- Use examples as executable conformance scenarios, not as substitutes for a
  general rule.

TypeScript is notation. Its collection classes, object identity, mutation
model, number representation, and module organization are not requirements on
implementations in other languages.

## Command-entry format

Present each command in the style of a programming-language reference entry:

1. a numbered heading naming the command;
2. its command form or forms, set apart typographically;
3. a **Syntax:** paragraph defining the accepted form, operands,
   abbreviations, and grammatical restrictions;
4. a **Semantics:** paragraph defining validation, state transition, timing,
   and ordered output; and
5. compact examples pairing representative input with its result.

Keep syntax and semantics visibly distinct. Syntax states what input denotes a
well-formed invocation; semantics states what that invocation does. Put related
forms together when they share one semantic rule, and use the examples to expose
boundaries or characteristic behavior rather than to restate the rule.

## Voice

Write for a reader skilled in programming-language and systems work. Be concise,
declarative, and mildly academic. Prefer normative present tense: “A ship has…”
and “The operation returns…”. Do not teach ordinary TypeScript, restate a type in
prose, or add background that does not constrain an implementation.

Define a term once, close to first use. Use mathematical notation only when it
makes a rule shorter or more exact. Prefer ordinary words over ceremonial
formalism, and reserve uppercase requirement words for cases where conformance
strength would otherwise be unclear. Examples illuminate boundaries; they do
not repeat the main rule.

Identify the containing type when a property name is not unambiguous from the
immediate context. Write “the `torpedoes` property of a `Ship`” or
“`Galaxy.blackHoles`,” not an unexplained bare property name. A property may be
named alone inside its type declaration, its field table, or prose that clearly
and immediately establishes the containing value.

Organize chapters around the reader's questions, not type dependencies. Explain
what part of the game is being modeled, then how it works, then present its data
declarations. Introduce every declaration block with enough prose to make its
purpose clear without reading code elsewhere.

Do not collect several unrelated types beneath one generic introduction. Group
related declarations by game concept, explain the semantics of each group, and
introduce a composite interface only after the types used by that interface are
understood.

## Character collision rule

When a simpler or more abstract rule would change recognizable behavior, do not
silently choose either purity or fidelity. Add a focused entry to
`CHARACTER.md` containing:

1. the behavior players can observe;
2. why it may be essential character or incidental history;
3. the simpler semantic alternative;
4. the consequences of each choice; and
5. a proposed resolution, clearly marked unresolved until discussed.

Preserve named ships, faction identity, command idiom, characteristic output,
meaningful timing/order, unusual but intentional mechanics, and tactically
relevant edge cases. Remove representation accidents and behavior that exists
only because of the original machine or runtime. If the distinction is
uncertain, raise it for discussion.

## Incremental method

Work in small vertical slices. Define vocabulary before operations, and define
an operation before expanding its examples. A useful slice normally contains:

1. required data declarations and invariants;
2. input grammar or autonomous trigger;
3. transition semantics;
4. ordered output;
5. focused conformance cases; and
6. separate provenance notes.

Do not create a comprehensive framework ahead of demonstrated semantic need.
Do not introduce variants until two authentic game rules conflict. The default
goal is one coherent DECWAR game, not a configuration system.

Every normative rule must be understandable without reading historical source
code or the current implementation. Every externally visible behavior must be
testable from input/trigger, prior state, resulting state, and output.

## Source discipline

The preserved Austin and CompuServe archives remain evidence for syntax,
mechanics, ordering, and output. Do not edit them. When evidence conflicts,
record the conflict outside the normative rule and discuss material character
choices before resolving them.

Do not consult or revive the archived first specification. The running port can
be exercised as behavioral evidence, but its types, module boundaries, helper
APIs, and internal policies are not inputs to this specification. Derive rules
from the game and its authorized primary evidence.
