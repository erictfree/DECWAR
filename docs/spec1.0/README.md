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
[Abstract data types](02-abstract-data-types.md), is the current review target.

## Current increment

The first increment establishes the project contract, core game values, and the
transition-system shape. Command grammar, autonomous operations, and output
templates follow after the data model is reviewed.

Read [AGENTS.md](AGENTS.md) for the rules governing this specification and
[CHARACTER.md](CHARACTER.md) for decisions where abstraction may collide with
the game's personality.
