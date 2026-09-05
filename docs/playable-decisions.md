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

All five repairs above apply to both source variants: Austin retains the relevant
POINTS, TRACTR, LSTSCN and GETCMD paths. Additional Austin source differences and
monitor bindings are recorded in [Austin implementation](austin-implementation.md).

## Validation

Playable lifecycle checks cover zero-turn/empty-team points, nonzero final score
persisted to disk, normal quit, ship reuse, named LIST, TRACTOR OFF, disconnect
during output, actual phaser destruction, pregame return, and game-over followed
by a new galaxy. Real Telnet clients exchange messages, quit, disconnect and
reclaim released ships. Existing gameplay checks continue to cover movement,
weapons, shields, tractor beams, capture/build/dock, Romulans, HELP and NEWS.

Exact compiler behavior, all malformed input paths, original monitor timing
and long-duration load testing remain future work. They no longer block using
the playable profile.
