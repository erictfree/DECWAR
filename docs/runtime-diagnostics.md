# Runtime diagnostic histories

Live sessions do not retain internal diagnostic histories by default. These are
observations such as token reads, report operations, command calls, random-draw
results and copies of hit notifications. They are not game state and are not
used to choose actions.

To retain recent history while debugging an isolated host:

```sh
npm start -- --diagnostic-records 200
```

The limit applies separately to each history in each session. Zero disables
retention; the maximum is 100000. A full history replaces its oldest record in
constant time. Reads preserve source order. This is an entry-count limit, not a
byte limit: individual diagnostic records have different sizes. The records stay
in process for inspection; the flag does not automatically write them to a file.
The host's listening event records the selected limit.

The programmatic equivalent is `createGameSession(..., { diagnosticLimit: 200 })`.
Playability and diagnostic retention are separate settings: `--strict` does not
enable unlimited histories. Both Austin and CompuServe use the same retention
policy. Server event logs and external-player transcripts still write to their
configured files.

## Data preserved independently

The change does not discard pending messages or hits, command input, source
stacks, board/ship state, file contents or saved statistics. Only explicitly
identified append-only observation arrays use the retention helper. Actual
source queues retain their original ordering and capacity behavior.

Standalone unit fixtures retain ordinary full-history arrays, allowing detailed
source-order assertions. Connected session tests opt into a bounded history;
tests that need an early event after a long operation capture that boundary
locally instead of depending on indefinite production retention.

## Implementation and evidence

[diagnostic-records.ts](../src/runtime/diagnostic-records.ts) selects retention
when a runtime is composed and stores it with each array. Independent sessions
cannot change one another's policy. Shared binders under `test/fixtures` use the
helper for reviewed history allocations. The live factory defaults to zero.
The helper does not consult original game rules or change random calls, output
bytes, source timing or working buffers.

Validation under `logs/diagnostic-retention/` includes:

- 4589 passing runtime tests, with both variants' connected game/Telnet checks.
- Ring wrap/order, batched append, context isolation, invalid limits and array
  inspection checks; live SCAN/STATUS/QUIT with histories off and capped.
- Ten external bots for 120 seconds: 422 decisions, no stalls or errors; all
  95 tracked histories per captain retain zero entries.
- Four external bots for 60 seconds with a limit of eight: 121 decisions, no
  stalls or errors; no tracked history exceeds eight. All sessions release.
- Post-GC diagnostic samples peak at about 35.1 MiB and 25.6 MiB respectively.
  These differently sized workloads are not a comparative performance benchmark
  or a proof that every possible memory allocation is bounded.

The earlier duplicate terminal transcript was removed separately. This change
addresses the remaining identified diagnostic histories, rather than raising the
heap limit or periodically deleting game data. Long-duration and machine-sleep
behavior remain outside these bounded runs.
