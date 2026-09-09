# Playable profile

The playable profile provides a functioning game while work on historical
parity continues. `npm start` and `npm run dev:telnet` select this profile.
`--strict` retains the historical diagnostic behavior.

Both source archives remain unchanged; each supplies its own game rules, commands,
messages, maps, combat, movement, Romulan behavior and scoring formulas. This
profile makes the following narrow repairs rather than waiting for a matching
compiler/executable. It is a playable alpha, not certified historical parity.

| Area | Playable decision | Why |
|---|---|---|
| Final POINTS | After label 500 sets the ALL flags, continue to the report without another switch-parser iteration. | POINTS.FOR jumps into DO 600 without initializing it. Its private compiler counter is unknown. |
| Score averages | Display zero when a scoring average has zero ships or turns as its divisor. Nonzero divisions retain original integer arithmetic. | A newly commissioned player and an empty team must not prevent POINTS, quit or death cleanup. This policy is local to score averages, not all arithmetic. |
| TRACTOR OFF | Supply a writable private IP word; the original routine then assigns WHO and calls TRCOFF. | DECWAR calls TRACTR without its declared argument. A valid dummy permits the original release logic to run. |
| LIST ship names | Use the accumulated SHIPS mask for duplicate detection. | LSTSCN's singular SHIP is otherwise uninitialized; the surrounding code accumulates SHIPS. |
| PAUSE deadlines | Measure private wait deadlines with a monotonic host clock. DAYTIM/ETIM retain UTC time of day. | A raw deadline extending past midnight can never be reached by the wrapped MSTIME clock. |
| Pending disconnect/interrupt | GETCMD handles control already pending before INPUT. Hangup reaches quit cleanup; Ctrl-C retains the RED-alert no-quit restriction. | Source labels 200→210→350 can spin forever when the flag is already set. |

Quit, death and game-over still call the selected source POINTS and FREE
routines. CompuServe additionally calls UPDSTA; Austin removes those calls. Cleanup releases tractor beams, drains queues, removes the ship from
the board and updates player counts. CompuServe final statistics retain the source's
elapsed-time threshold and selection of DECWAR.STA versus DECWAF.STA.
No fabricated score or blanket cleanup replaces those routines.

The host also retains previously documented modern choices: TCP/Telnet NVT,
cooperative scheduling, UTC clocks, 36-bit word files, a virtual shared-image
catalog and synthetic compiler/monitor addresses. The production factory is `src/runtime/game-session.ts`; it still reuses
binders under `test/fixtures`. Those names reflect their origin, not
a requirement to run a test harness to play.

All six repairs above apply to both source variants: Austin retains the relevant
POINTS, TRACTR, LSTSCN and GETCMD paths. Additional Austin source differences and
monitor bindings are recorded in [Austin implementation](austin-implementation.md).

## Source and implementation trace

The repairs are selected in
[playable-runtime-policy.ts](../test/fixtures/playable-runtime-policy.ts) and
connected by the production session factory. The PAUSE clock repair is bound in
[live-wait.ts](../src/runtime/live-wait.ts). Physical source locations below
identify the affected routines; the decision table above identifies their triggers.

| Routine | CompuServe | Austin combined source |
| --- | --- | --- |
| POINTS | [POINTS.FOR](../legacy/compuserve/fortran%201978/POINTS.FOR#L23) | [DECWAR.FOR, line 2893](../legacy/utexas/DECWAR.FOR#L2893) |
| TRACTR | [TRACTR.FOR](../legacy/compuserve/fortran%201978/TRACTR.FOR#L27) | [DECWAR.FOR, line 4432](../legacy/utexas/DECWAR.FOR#L4432) |
| LSTSCN | [LSTSCN.FOR](../legacy/compuserve/fortran%201978/LSTSCN.FOR#L24) | [DECWAR.FOR, line 1519](../legacy/utexas/DECWAR.FOR#L1519) |
| PAUSE | [WARMAC.MAC, line 4010](../legacy/compuserve/fortran%201978/WARMAC.MAC#L4010) | [WARMAC.MAC, line 3373](../legacy/utexas/WARMAC.MAC#L3373) |
| GETCMD | [GETCMD.FOR](../legacy/compuserve/fortran%201978/GETCMD.FOR#L24) | [DECWAR.FOR, line 1184](../legacy/utexas/DECWAR.FOR#L1184) |

The PAUSE repair preserves the duration cap, early-wake retries and variant-specific
lock handling; it changes only the clock supplying the private wait deadline.
Diagnostic PAUSE retains raw UTC rollover behavior. In both profiles, disconnect
wakes the current wait once, subsequent delays retain their scheduling, and
repeated EOF reads yield to the host. Live HIBER no longer retains the fixture's
unbounded event and operand arrays. These host changes prevent a stuck source
wait from becoming an allocating loop that starves other connections and shutdown.

## Validation

Playable lifecycle checks cover zero-turn/empty-team points, nonzero final score
persisted to disk, normal quit, ship reuse, named LIST, TRACTOR OFF, disconnect
during output, actual phaser destruction, pregame return, and game-over followed
by a new galaxy. Real Telnet clients exchange messages, quit, disconnect and
reclaim released ships. Existing gameplay checks continue to cover movement,
weapons, shields, tractor beams, capture/build/dock, Romulans, HELP and NEWS.

Bounded tests reproduce the midnight/disconnect spin in both variants and verify
host cancellation, playable completion across midnight, diagnostic preservation,
and early wakes. Production-session tests exercise DOCK through command input
across a simulated UTC rollover, including normal prompt return and disconnect
scoring/ship release. These are TypeScript regressions, not native-executable
midnight verification. Evidence is saved under `logs/parity-stall-midnight/`.

Exact compiler behavior, all malformed input paths, original monitor timing
and long-duration load testing remain future work. They no longer block using
the playable profile.
