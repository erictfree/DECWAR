# Documentation

DECWAR is a TypeScript port by Eric Freeman working with OpenAI GPT-6 Astra,
based on Noah Smith's UT Austin reconstruction and a legacy CompuServe tape.
For the wider preservation effort, see [decwar.org](https://decwar.org).
The [project README](../README.md) introduces the game.

## Start here

| I want to… | Read |
| --- | --- |
| Read the implementation-independent language specification | [Austin core specification (draft)](spec/README.md) |
| Run or play the game | [Running DECWAR](running.md) |
| Know what works and what remains unresolved | [Current status](status.md) |
| Understand the memory model, arithmetic and modern host | [Architecture](architecture.md) |
| Understand intentional playable changes | [Playable decisions](playable-decisions.md) |
| Compare Austin with CompuServe | [Source comparison](legacy-comparison.md), then [Austin implementation](austin-implementation.md) |
| Inspect the supplied sources and reconstructed binary | [Legacy provenance](../legacy/README.md) and [Austin build evidence](austin-build-evidence.md) |
| Work on the port | [Documentation standard](documentation-standard.md), [porting contract](../AGENTS.md), [repository artifacts](repository-artifacts.md) |
| Understand licensing | [Licensing](../LICENSING.md) |

## Current guidance and historical evidence

Running instructions, current status, architecture and the Austin implementation
ledger describe the delivered game. The source study, compatibility findings and
numbered decisions retain the reasoning accumulated during development. Earlier
claims such as “session integration remains required” describe those checkpoints;
consult current status for what is connected now.

- [Source study](source-study.md): detailed analysis beginning with CompuServe.
- [Compatibility findings](compatibility.md): source behavior, ambiguities and
  earlier component-level evidence; current repairs are identified separately.
- [Modernization decisions](decisions.md): numbered reasoning and implementation
  records, with links to current summaries.
- [CompuServe source index](source-index.md): generated inventory of that archive;
  it is not a combined Austin/CompuServe semantic audit.
- [CPU/compiler manuals](platform-manuals.md): editions, pages, applicability and
  remaining platform uncertainty. Manuals do not supply DECWAR game rules.
- [Austin implementation plan](austin-default-plan.md): the completed migration's
  original plan, retained as a record rather than a new work queue.
- [Implementation history](history/implementation-progress.md) and
  [work log](../WORK_LOG.md): chronological progress and local verification records.

## Evidence and source authority

Each variant's supplied executable statements define its game behavior. The
archives are preserved unchanged; discrepancies and intentional departures are
explained in project documentation. A reconstruction is not presented as a
pristine historical release. Compiler manuals, linker maps, tests and terminal
captures answer different questions; none substitutes for the others.

Documentation distinguishes **source evidence**, **implemented behavior**,
**test coverage**, **reference observations**, **modern decisions** and
**unresolved behavior**. These distinctions apply even when a command is playable.
