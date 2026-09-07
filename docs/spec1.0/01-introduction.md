# 1. Introduction

DECWAR is a multiplayer space-combat game. Each participant commands a named
starship in a galaxy shared with other participants and with autonomous game
processes. Through a command-line language, a captain navigates, fights,
communicates, captures planets, constructs bases, and examines the surrounding
galaxy.

This document specifies **Austin Core**: the language and behavior of the
reconstructed University of Texas at Austin DECWAR PDP-10 game. It is a
self-contained definition for new implementations, not a description of the
organization, data representation, or execution environment of the PDP-10
implementation.

## Scope

The specification defines four connected parts of the game:

1. the abstract data types and invariants that constitute a galaxy;
2. the lexical structure and grammar of player commands;
3. the state transitions caused by commands and autonomous processes; and
4. the text presented to players, including its wording, layout, and order.

Player commands are not the only source of behavior. The specification also
defines processes that occur without a command, including those governing the
Romulan, maintenance, rebuilding, delayed readiness, and the lifecycle of a
galaxy.

The specification does not prescribe an implementation language, program
architecture, user interface beyond the command-line language, persistence
format, transport protocol, or concurrency mechanism.

## Semantic model

At any instant, a game is represented by one `Galaxy`. A player command or an
autonomous trigger invokes a game operation. The operation examines the current
galaxy, may produce a new galaxy state, and emits an ordered sequence of
observable output:

```text
invocation + current Galaxy -> resulting Galaxy + ordered output
```

The abstract data types define which states can exist. Command and autonomous
semantics define the permitted transitions between those states. The output
language defines what participants observe and in what order.

## Specification notation

TypeScript expresses abstract data structures, expressions, and transition
algorithms. It is formal notation: its object representation, numeric encoding,
collection implementation, mutation model, and module organization are not
requirements on another implementation.

Extended Backus-Naur form (EBNF) specifies lexical and grammatical structure.
Ordinary mathematical notation specifies numeric relationships. Literal output
forms specify text and significant layout visible to participants.

Unless identified as non-normative, declarations, algorithms, grammar, and
prose define the game. Examples illustrate the rules and supply conformance
cases; they do not replace general rules. A **Reviewer note** identifies an
unresolved editorial or semantic question and is not itself a game rule.

## Organization

Section 2 defines the abstract game state. Subsequent sections define lexical
structure, command grammar, the semantic framework, world mechanics, command
semantics, autonomous processes, execution order, output, and conformance
scenarios.
