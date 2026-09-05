# How the port represents DECWAR

This is a TypeScript implementation of the supplied game, with explicit
compatibility primitives for the PDP-10 behavior it needs. It does not run the
old executable inside Node or implement a general-purpose PDP-10 emulator.
The native reference game runs separately in SIMH; see [build evidence](austin-build-evidence.md).

## From source to a running session

1. [Source catalogs](../tools/source-catalog.ts) select the immutable CompuServe
   or Austin archive and its layout evidence. Austin routine views retain the
   physical line positions in its combined DECWAR.FOR.
2. [Extraction](../tools/variant-data.ts) generates each variant's constants,
   names, output tables, DATA values, assets and layouts. These are committed
   runtime inputs checked by `npm run audit:check`.
3. [The host](../tools/run-telnet.ts) selects the source variant and execution
   profile, validates storage identity and creates a world directory.
4. [The session factory](../src/runtime/game-session.ts) connects statement
   routines, compatibility services, shared state and terminal I/O for each
   captain. Tests and the host use the same factory. It still imports some
   production binders from test/fixtures; moving those files is organizational
   work, not an alternate game implementation.
5. [The session driver](../src/runtime/session.ts) resumes game routines as
   input arrives or waits expire, and delivers interrupts and disconnects.
   The [Telnet adapter](../src/transport/server.ts) handles network framing.

The command path selects Austin explicitly at launch by default. Low-level
helpers called without a variant context retain the older CompuServe baseline
for compatibility with existing component tests. Production callers should use
the host/session factory rather than assuming that an unscoped helper is Austin.

## Original memory semantics in modern storage

The implementation uses JavaScript arrays, objects and maps, but preserves
word-level storage where the source can observe it. Named objects are often views
of shared words rather than independent copies of ship or planet state.

| Original mechanism | TypeScript representation | Why it matters |
| --- | --- | --- |
| 36-bit words and 18-bit addresses | BigInt words with explicit wrapping/masking; mapped regions in AddressSpace. | JavaScript number/bitwise operations do not provide these machine widths. |
| FORTRAN COMMON and column-major arrays | WordBlock fields resolve into source-derived offsets, lower bounds and strides. | LOCF, block copies and out-of-range subscripts can address adjacent fields. Replacing them with unrelated nested objects would lose aliases. |
| Shared high segment | Each galaxy's sessions attach the same backing arrays for HISEG, timers and queues. | Ship counts, board changes and messages must be visible across captains without copying state on every call. |
| Private low segment, registers and scratch | Per-session mapped words and register/stack services. | Parsing, preferences, temporaries and SEED must not leak between captains. |
| Packed galaxy | Three 12-bit cells per 36-bit word; the 75×75 board occupies 1,875 words. | Source byte fields, sentinel values and board-word operations are observable. |
| Message and hit queues | Source links, masks, counters and physical slot order. | Generic FIFO replacement would change recipient filtering, overflow and retrieval order. |
| Argument aliases and reconstruction copies | Actual word addresses passed to routines; Austin's added IA/JA/KA/VA/HA copies have private storage. | Callee writes must affect the same object—or its explicit source copy—as in the chosen variant. |

See [memory primitives](../src/compat/memory.ts),
[shared worlds](../src/runtime/shared-world.ts) and
[the source study](source-study.md) for details. The memory abstraction permits
source subscripts to reach adjacent mapped words; this is distinct from accepting
arbitrary invalid addresses. Unmapped accesses remain explicit failures.

The link map supplies region addresses, sizes and symbol locations. It is not
a complete description of every compiler temporary or call frame. Austin's
shared layout uses the preserved native link; some private scratch words, literal
addresses and monitor bindings are explicitly assigned by the host. Those are
implementation decisions, not recovered original addresses.

## Scaled integers and floating point

Many quantities retain extra decimal places by storing a scaled integer. The
extra zeros change the unit of storage; they do not enlarge the 36-bit word.
For example, [CompuServe SHIELD.FOR](../legacy/compuserve/fortran%201978/SHIELD.FOR#L53)
multiplies an entered energy amount by 10 before storing SENRGY. It later adds
`SENRGY / 25` to shield strength and subtracts SENRGY from engine energy. The
integer division and its position in the expression matter: fractional shield
strength can be lost even though the full energy amount is deducted.

The port keeps that scale, operation order and truncation. BigInt is used to
perform exact intermediate integer calculations, with explicit machine-width
semantics where selected. Converting everything to floating-point “game units”
and rounding only for display would change behavior.

REAL arithmetic also uses encoded PDP-10 words and integer-based helpers for
the supported instruction domains. Decimal input has its own source instruction
sequence: the token parser's per-digit unrounded operations differ from compiler
literal conversion. [Platform evidence](platform-manuals.md) records the concrete
`1.25` example, rounding rules and unsupported operand cases. This is not a claim
that every PDP-10 instruction or compiler transformation has been reproduced.

## Modern host decisions

| Decision | Reason and observable limits |
| --- | --- |
| Immutable variant context, carried through AsyncLocalStorage and explicitly wrapped generator resumes | Reuse matching routines while keeping each world's data independent. Avoid a mutable global selector without adding a configuration parameter to every legacy helper. |
| Generators and cooperative scheduling | Original routines can wait for input or time without blocking every Node session. Scheduling after output permits other jobs and controls to progress; it does not reproduce instruction or baud timing. |
| TCP/Telnet codec around application bytes | The supplied game calls monitor TTY services and does not define an IAC negotiation implementation. The codec supplies that host boundary; exact historical monitor negotiation and echo behavior remain unverified. |
| Host monitor resources and queued lock grants | Node has no TOPS-10 ENQ/DEQ service. The host owns named resources and grants waiting jobs in FIFO order, while each variant retains its source lock keys and result handling. Monitor fairness and adversarial contention are not proven equivalent. |
| UTC date/time and per-session sampled CPU accounting | Supply the source clock interfaces with explicit, testable values. These are modern clock/accounting choices, not recovered historical time zones or PDP-10 CPU timing. |
| Word-file persistence and variant metadata | Preserve 36-bit records without requiring a TOPS-10 disk filesystem, and reject accidental cross-variant reuse. The live galaxy remains in memory. |
| Virtual shared-image catalog and session reload | Model a full galaxy being retired for new arrivals while existing captains retain it, without executing the original monitor loader. |

These choices are detailed in the [decision record](decisions.md), particularly
D-003–D-004, D-152–D-159, D-166–D-167 and D-171, and the
[Austin ledger](austin-implementation.md). They are separate from the five
intentional [playable repairs](playable-decisions.md). Selecting `--strict`
disables those repairs but still uses modern host services.

## Evidence limits

Tests cover source-derived behavior and connected sessions; the native build
provides a separate reference for observed commands and linked memory. Complete
compiler semantics, all malformed input, original monitor timing and long-duration
concurrency remain open. [Current status](status.md) records the verified scope.
