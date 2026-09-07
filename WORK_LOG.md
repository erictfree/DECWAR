# DECWAR implementation work log

Created 2026-09-05T14:00:22+00:00. This is the persistent record of observable work: source study,
code changes, checks, outcomes, decisions and outstanding tasks. It is not a
verbatim transcript of all prior conversations or an internal reasoning trace.
Earlier implementation history is recorded in [decisions](docs/decisions.md),
[source study](docs/source-study.md), [compatibility](docs/compatibility.md) and
[status](docs/status.md). The supplied source archive remains the only evidence
for DECWAR behavior.

## Current working agreement

- Complete source-faithful TypeScript DECWAR, including original commands,
  terminal bytes and Telnet; a running development harness alone is not parity.
- Prefer Luna medium for routine implementation, tests, tournament runs,
  documentation, commits and pushes. Stop and ask the user to switch to Astra
  when source ambiguity, PDP-10 numeric behavior, random draw ordering or hard
  concurrency debugging requires it. Do not claim the actual app setting was
  changed.
- Continue through checkpoints without pausing merely to report completion.
  Provide detailed progress while working.
- Keep this log updated and retain command/test output under `logs/`.

## Reconstructed recent checkpoints

### D-130: planet removal and endgame

Connected PLNRMV and KILHGH in the shared test runtime, preserving column copies,
board codes, capture ordering, original output and explicit monitor outcomes.
Full verification: 4,109 tests plus strict TypeScript and archive/generated checks.

### D-131: main supernova dependency

Added `src/game/nova-statements.ts` and shared binding in
`test/fixtures/nova-runtime.ts`; connected ROMTOR to SNOVA/NOVA, JUMP, TRCOFF,
BASKIL, PLNRMV, raw notifications and ENDGAM. Added 34 tests for physical stacks,
LIFO order, changing identities, random schedules, damage/scoring, original output
and nonreturning endgame. Full verification: 4,143 tests. Updated all four
implementation documents and README.

### D-132: shared DAMAGE, STATUS and TIME reports

Connected DAMAGE and REPAIR's appended report, reused STATUS's existing binding,
and added a shared main/pre-game TIME adapter with explicit clock outcomes.
Added 21 tests for original report bytes, prefixes, timing, partial output failures,
shared combat state and compound commands. Full verification: 4,164 tests.
The first focused run failed on a test expecting report suspension before the
existing input HIBER yield; the test now advances through that scheduled wait.
Updated README, status, decisions, compatibility and source study.

## Active checkpoint: D-133 — DOCK and SHIELD

- Connected existing DOCK statements to shared STATUS, raw board/distance/clocks,
  automatic repair and turn accounting. Eight integration tests passed; full check
  at that intermediate point passed 4,172 tests.
- Added `src/game/shield-statements.ts` and a shared main SHIELD binding. Preserves
  inline/prompted token positions, integer scaling/truncation, confirmation,
  capacity caps, critical damage threshold and actual tractor release.
- Added 18 shield tests, including prompted input, original messages, repeated
  raising costs, negative transfers, confirmation and output failure.
- Extracted a reusable main-command test fixture from report tests to share the
  same initialization and command-loop capture across subsequent commands.
- One shield test initially expected a pre-GETCMD ship condition to survive;
  GETCMD legitimately updates that field. The test now captures condition at
  command entry and checks that a failed transfer message skips later updates.
- Final DOCK/SHIELD full-check output is `logs/decwar-d133-final-check.log`.
  Documentation checkpoint update and further command bindings follow.

## Log capture

At 2026-09-05T14:00:22+00:00, copied 20 available recent command/test logs from temporary
storage into `logs/`. Both failed diagnostic runs and passing verification runs
are retained. The earlier documents provide the history predating these files.


## 2026-09-05T14:01:04+00:00 — D-133 verified

Full `npm run check` passed 4,190 tests, strict TypeScript and archive/generated
checks; output: `logs/decwar-d133-final-check.log`. Updated README and all four
implementation documents. Continuing to ENERGY; no settings change needed.

## 2026-09-05T14:07:45.030184+00:00 — D-134 ENERGY verified

Implemented ENERGY.FOR:29-105 as an actual-word statement body and connected it
to the shared command loop. Uses loaded ship names and BITS, raw LDIS, raw
MAKHIT and original output. Capacity clipping occurs before sender charge;
over-capacity destination reserves deliberately retain negative-transfer behavior.
Added 16 integration scenarios. Typecheck and focused tests passed; full
`npm run check` passed 4,206 tests plus archive/generated checks and TypeScript.
Logs: `logs/decwar-d134-typecheck.log`, `logs/decwar-d134-energy-focused.log`,
`logs/decwar-d134-check.log`. REAL arithmetic remains an explicit test policy.
Next: remaining command bindings toward a complete runnable session.

## 2026-09-05T14:08:46.731031+00:00 — D-135 USERS verified

Bound existing USERS.FOR:35-55 statements to actual STAT/PRLOC/output and
shared JOB/ALIVE memory in game and pregame dispatch. Added six scenarios
covering verbosity, privileged positions, live admission, and pregame output.
Full check passed 4,212 tests; logs/decwar-d135-{users-focused,typecheck,check}.log.
Next: TRACTR command, reusing the existing beam-release body. Source calls
TRACTR without its declared IP argument; preserve an explicit compiler binding
requirement on paths that write IP rather than inventing an address.

## 2026-09-05T14:10:33.445625+00:00 — D-136 TRACTR verified

Added actual-word TRACTR body and main binding using original EQUAL/LDIS/ODISP,
MAKHIT and existing TRCOFF. Seventeen tests cover both queues, target validation,
prompting, SHIELD interaction, explicit IP and partial failure. Full check passed
4,229 tests; logs/decwar-d136-{typecheck,tractor-focused,check}.log.
Studied SCAN.FOR and WARMAC.MAC:2799-3000 for next main scan binding. This
requires connecting the shared screen storage and original assembly output.

## 2026-09-05T14:14:09.428014+00:00 — D-137 SCAN/SRSCAN verified

Added SCAN.FOR statement body and WARMAC.MAC:2799-3000 SETSCN/MARK/SHWSCN
composition using actual ACs, pointer tables, shared LOCAL and raw output.
Added 18 scenarios including exact map bytes, width/ranges, warnings, knowledge
outside the rectangle, loaded ship symbols, cloaking, padding and Ctrl-C.
Initial typecheck found nullable OBJTBL entries for GETSHP (now handled separately).
Initial scan fixtures accidentally triggered real ENDGAM by setting NPLNET=0;
kept an out-of-range planet in the fixture instead of bypassing ENDGAM.
All diagnostic and passing runs remain in logs/decwar-d137-*.log.
Full npm run check passes 4,247 tests, TypeScript and archive/generated checks.
Next: BUILD/CAPTUR, reusing actual location, planet removal and defense routines.

## 2026-09-05T14:17:20.169824+00:00 — D-138 BUILD verified

Added actual BUILD.FOR body and main binding to LOCATE, raw board/distance,
locks, PLNRMV and original output. Eleven scenarios include fifth-stage base
creation and BUILD/DOCK. Failures preserve source score/store ordering.
Diagnostics caught a fixture clock number needing bigint, and successful turns
correctly flushing TPOINT into SCORE/TMSCOR (tests now inspect accumulated score).
Full check passes 4,258 tests; outputs under logs/decwar-d138-*.log.
CAPTUR actual statement body is now being connected to original planetary fire.

## 2026-09-05T14:18:53.205088+00:00 — D-139 CAPTUR verified

Added CAPTUR.FOR actual-word statement body and main binding with source locks,
PRIDIS, BASKIL, PHADAM, MAKHIT and output. Thirteen scenarios cover neutral/enemy
capture, fortification charge/delay, death after ownership change, former-owner
kill credit, validation and CAPTURE/BUILD. Full check passed 4,271 tests, strict
TypeScript and archive/generated checks; logs/decwar-d139-*.log.
Studied PHACON.FOR for the next player-phaser binding.

## 2026-09-05T14:21:59.352219+00:00 — D-140 PHACON verified

Added actual PHACON.FOR statement body and main binding to LOCATE, clocks,
PAUSE, raw IRAN, PHADAM/PHAROM, PRIDIS/MAKHIT and original output. Fifteen
scenarios cover targeting, banks, energy, overheating, planets, base distress
and destruction, Romulan and partial failure. Fixed base broadcast NOMSG lookup
to shared high memory; high-power critical-hit test schedules additional RAN
draws required by PHADAM. Full check passed 4,286 tests; logs/decwar-d140-*.log.
Next: TORP, sharing CHECK, TORDAM, TRCOFF and existing nova chain.

## 2026-09-05T14:28:45.625916+00:00 — D-141 TORP verified

Added TORP.FOR actual-word body with physical TOLOCL and CHKOUT aliases.
Connected original CHECK, TORDAM/TOROM, TRCOFF, PLNRMV and SNOVA/NOVA.
Nineteen scenarios cover bursts, ammo, docked firing, misfire continuation,
friendly/black-hole/star encounters, ship damage and tractor release, planet
destruction, supernova, Romulan, base distress and partial notification failure.
The supernova test required ten additional RAN draws: nine devices plus energy.
Full check passed 4,305 tests; diagnostics/checks: logs/decwar-d141-*.log.
Now verifying *DEBUG using actual timer words and monitor output/return-word
numeric formatting. Initial test used DEBUG without its required asterisk;
corrected input to the source command name *DEBUG.

## 2026-09-05T14:30:09.287987+00:00 — D-142 *DEBUG verified

Added WARMAC DEBUG and recursive DEBDEC/DEBOCT return-word formatting, bound
to actual TIMERS memory and monitor output. Five scenarios verify table traversal,
live reads, privilege rejection, stack balance and bypassed HCPOS accounting.
Full check passed 4,310 tests; logs/decwar-d142-*.log.
Current remaining main entries: BASES, LIST, PLANET, SUMMAR, TARGET. Studying
shared LIST/LSTSCN/LSTFLG/LSTUPD/LSTOUT/LSTOBJ/LSTSUM chain to bind them.

## 2026-09-05T14:38:45.128081+00:00 — D-143 object reports composed

Implemented actual-word LIST driver, LSTSCN, LSTFLG, LSTUPD and all three
report bodies from supplied LIST.FOR/LST*.FOR; connected all five main entries
and pregame SUMMARY. Preserved the distinct uninitialized SHIP local, one-word
TOKEN copy, repeated DUMMY aliases, live output-time reads and discovery stores.
Compiler two-label IF/reversed DO and prior SHIP word remain explicit policies.
Fixed pregame binding to include only its actual SUMMAR dispatch entry after
TypeScript rejected nonexistent pregame BASES/LIST/PLANET/TARGET entries.
Initial probes exposed unset parent-fixture planet coordinates; supplied a real
planet in the test world, without adding guards to original routines.
Nineteen tests added; archive, typecheck and all 4,329 tests pass.
Evidence: logs/decwar-d143-*.log (including initial failures and probes).
Next runnable milestone: connect startup and ship admission to this command
composition. SETUP statement adoption is the next remaining lifecycle gap.

## 2026-09-05T14:43:55.043241+00:00 — D-144 admission and placement verified

Implemented SETUP.FOR:342-494 over shared words, plus actual CC1/CC2 cleanup.
Bound ship selection, KQSRCH, UPDCAP, JOBSTA, CCTRAP and monitor clocks into
the main runtime fixture. Added admission → APRSET → PLACE → main STATUS
composition. Also connected privileged pregame DEBUG to the existing binding.
Fourteen tests cover selection, return/reassignment/defection, radio groups,
commissioning failure, cancellation counters, terminal-speed quirks and placement.
Full archive/typecheck/test check passes 4,343 tests. Logs: decwar-d144-*.log.
Retained diagnostics: wrong FRELOK block, too-long single-word ASCII literal,
unsigned expected literal, incorrect Empire ship-name input, missing constant
import and an incorrect test expectation that PLACE uses scheduled REAL draws.
PLACE correctly consumes raw integer IRAN; composed test now verifies its actual
draws, coordinates and packed board result. No source changes were made to
accommodate these fixture mistakes.

Recommended High (not Extra High) for the next runtime review. Main dispatch
and admission now compose, but executable production numerical semantics are
still open: rational REAL combat fixtures versus raw RAN/FSC CPU contract.
No app setting changed. Work is paused at this explicit settings recommendation,
per the user's instruction to pause only for needed settings/input. Next work:
SETUP capacity/locking/world-generation prefix, unified numeric/runtime policies,
startup/re-entry/session driver, then production persistence and Telnet binding.
Do not call this a playable game or original-executable parity.

## 2026-09-05 — Resumed at High; shared random and startup work

User reports switching to High. Reviewed supplied WARMAC RAN/IRAN/PWR and
FORTRAN REAL call sites. Added src/runtime/random.ts to route both public random
entries through the same private SEED and required CPU services. Shared fixture
installation now reaches copied weapon callbacks and MOVE's integer draws.
Six scenarios include seeded main PHASERS without scheduled combat draws.
Rational FSC remains an explicitly selected test policy, not a CPU parity claim.
Initial typecheck failures exposed overly broad fixture host typing and tests
calling an extra runtime property absent from a public type; corrected these.
Evidence: logs/decwar-d145-*.log; full check result recorded with next checkpoint.

Implementing SETUP's capacity/locking/options/world-generation prefix. First
composition now creates 20 bases, 60 planets and the selected stars/holes, admits
a captain, places the ship and executes main STATUS. Probe saved to
logs/decwar-d146-probe.log. This is still the shared test runtime.

## 2026-09-05T14:53:54.261604+00:00 — D-145–D-147 checkpoints and manual authorization

D-145 passes 4,349 tests (logs/decwar-d145-check-fixed.log). D-146 adds 10
SETUP scenarios and passes 4,359 tests (logs/decwar-d146-check.log). D-147 adds
8 application-entry/TYPE scenarios and passes 4,367 tests
(logs/decwar-d147-check.log).

Actual entry now connects LFZ:LLZ clear, experience selection, TYPE/SUMMAR,
pregame, full SETUP, APRSET/PLACE and main command execution. Fixed TYPE's
caller passing literal values as actual addresses: main/startup now store KIND
and pass its word address. Full fresh-game STATUS/QUIT reaches the final POINTS
DO-continuation requirement, then integer division by zero when a diagnostic
continuation policy is explicitly selected. Both remain tests rather than silent
changes to source semantics.

User explicitly authorized consulting PDP-10 CPU and FORTRAN runtime manuals
only. No other DECWAR implementations or game descriptions are authorized.
Initial Bitsavers PDF downloads returned HTTP 403; trying archival mirrors for
the original 1977 FORTRAN-10 V5 and 1982 DEC processor manuals. PDF skill read
for manual inspection. Research will distinguish documented platform rules,
version-specific conditions and still-unknown compiled behavior.

## 2026-09-05 — D-148 machine floating words and phaser power

Retrieved the original DEC CPU/compiler PDFs from the archival mirror;
docs/platform-manuals.json records URLs, byte counts and SHA-256 digests.
Created docs/platform-manuals.md with printed/PDF page references, applicability
limits and unresolved compiler/runtime behavior. Inspected rendered arithmetic,
FSC, logical-IF and DO pages. Persisted the user's narrow authorization in
AGENTS.md. No external DECWAR evidence was used; archive unchanged.

Implemented RAN's exact FSC quotient-to-floating-word conversion and normalized
word decoding. Added rounded FMPR using exact 54-bit products, midpoint rounding,
normalization, exponent wrapping and returned arithmetic flags. Added session
PWR composition over the actual assembly statement routine, preserving every
multiply and required fault handling after storing the result. A PHADAM test
uses this real floating PWR across an explicit remaining-rational boundary.
Exponent-12 regression proves repeated rounding differs from final-only rounding.

Full npm run check passes 4,403 tests (logs/decwar-d148-check.log).
Initial numeric run retained in logs/decwar-d148-numeric-tests.log: two test
expectations miscomputed the wrapped exponent when squaring 2^126. Corrected
the expected excess-128 code (octal 175, not 375); no implementation change.
Other D148 typecheck/test logs are retained. Full normalized FORTRAN arithmetic,
compiler evaluation choices and monitor/session binding remain open.

## 2026-09-05 — D-149 compiler DO counter adoption in POINTS

FORTRAN V5 documents an independent negative trip counter and at least one
iteration. Implemented a named non-overflowing INTEGER DO policy and selected
it in composed POINTS initialized loops. Separate loop-site frames prevent
confusing the report counter with the token counter. Counter state is cleared
on a new invocation; undefined final entry must not inherit an invented value.
An aliased I change now preserves eight iterations and exposes the physical
SCORE(9,1)/SCORE(1,2) overlap instead of prematurely stopping at KNPOIN.
The supplied executable's exact compiler version is still unknown.
Focused prior POINTS/entry scenarios pass; full check follows new regressions.

D-149 full npm run check passes 4,412 tests (logs/decwar-d149-check.log).
Seven DO-policy and two POINTS regressions added. Inspected the rendered
FORTRAN manual p. 9-6 to verify the counter algorithm. Confirmed DECWAR.TAP is
a text export list naming DECWAR.EXE, not an included executable; TORP.COD and
ALT.COD are parser-design text, not compiled POINTS instructions. No new evidence
resolves final-entry compiler residue. Next runtime dependency: remaining
normalized floating arithmetic and its explicit compiler-service composition.


## 2026-09-05 — D-150 full normalized arithmetic reaches gameplay

Implemented normalized rounded add/subtract/divide, integer-to-float FLTR and
float-to-integer FIX, with explicit flags and unchanged destination on FIX
failure. Inspected the original manual's conversion pages. Added a named nearest
27-bit decimal literal policy, separately from the unknown original compiler's
literal algorithm. Added production rounded numeric expression services with
required integer, literal and fault policies; source-order evaluation is explicit.

Weapon fixture callbacks now delegate through a selectable arithmetic service,
so copies installed in the main loop see native numeric selection. Full PHADAM
expressions and PWR run with physical floating words; main PHASERS uses actual
RAN, applies damage, charges energy and queues the hit. Full application entry
creates a galaxy with stars/holes and reaches STATUS with the same native math.
The quit path still exposes the known uninitialized POINTS continuation.

Full check passes 4,439 tests (logs/decwar-d150-check-final.log).
Retained initial type failure: helper host type included unrelated fixture args;
narrowed to its actual dependencies. Retained initial numeric failures: a test's
handwritten decimal expected one wrong low-order bit; independent Python Fraction
calculation confirmed the implementation's octal 216636031463. The main PHASERS
test initially omitted target coordinates and bank initialization; corrected the
test setup using the existing command scenario. Earlier runs and independent
vectors are in logs/decwar-d150-*.log. No gameplay source was changed to fit tests.

## 2026-09-05 — D-151 decimal input instruction binding

Read and visually inspected Processor Reference pp. 2-21–23, including the KI
signed-operation caveats. Implemented normal ANUM nonnegative FDV/FAD accumulation
without rounding, FLTR and rounded FMPRI SCALE updates. The original NXTT MOVN
still applies the sign afterward. Overflow callbacks observe the destination
already stored. Negative accumulators caused by prior integer overflow remain an
explicit unsupported CPU domain, not a new DECWAR validation rule.

Eleven focused tests pass, including actual GTKN positive/negative fractional
words and their use by native comparison/conversion. Independent Fraction vectors
show input 1.25 is 201477777777 octal, not nearest 201500000000. Preserved this
per-digit truncation and the existing decimal X3/token-text spill behavior.
Evidence: logs/decwar-d151-token-tests.log and independent-vectors.log.
Updated README, compatibility decisions and platform references. One combined
documentation patch failed its context check without modifying files; reapplied
with verified context. Final full check result follows.

D-151 final npm run check passes archive/generated-data verification, strict
TypeScript and all 4,450 tests (logs/decwar-d151-check.log). Native numeric
startup, phaser and parser paths are verified under documented test selections;
a playable production server and original-executable parity are not claimed.
Next runnable milestone: one session host using these native numeric services,
actual input/output transport and persistent shared state. The unresolved
compiler/monitor paths remain explicit gates, rather than silent substitutions.


## 2026-09-05 — Resumed after user challenged checkpoint stop

User correctly pointed out that the previous turn stopped despite instructions
to continue. Acknowledged the mistake and resumed implementation immediately.
Status reports and verified rounds are not stop gates.

## D-152 — Live session driver and TCP/Telnet transport

Added src/runtime/session.ts for generator-driven byte input, delay/input wakes,
interrupt/hangup hooks, source-failure reporting, and explicit forced shutdown.
Added src/transport/server.ts to connect sessions to real TCP sockets using the
existing documented Telnet codec; no game banners/errors are inserted by the
host. Eight session tests include fragmented input, disconnect cleanup, interrupt
ordering, source delay behavior, fault isolation and long-timer cancellation.

The live integration fixture connects original application entry, editor, GTKN,
TYPE and SUMMAR to real terminal bytes and native numeric services. Two localhost
socket tests verify startup output and separate preferences. Initial compile
errors required narrowing Node socket data and close-error types. The sandbox
blocked localhost listen with EPERM; the authorized elevated test run succeeded.
One byte comparison initially failed because it ignored required Telnet CR-NUL
framing; comparing decoded application bytes fixes the test, not game output.
Full check passes 4,460 tests: logs/decwar-d152-check.log. Earlier failures retained.

## D-153 — Live game entry and shared galaxy attachment

Live Telnet tests now pass experience selection, full SETUP galaxy creation,
ship admission and main STATUS. Added whole-region shared-memory attachment and
SharedGameWorld for the supplied high-data, timer and hit/message queue regions.
Private LOWSEG, registers, stacks, source locals and SEED remain session-local.
A second live captain now joins the same galaxy as ship 2, sees the first ship's
score, preserves its random seed and does not rebuild the world. Both remain
connected while assertions run. Four socket tests pass in
logs/decwar-d153-multiplayer-tests.log; shared typecheck/probe logs retained.

The production session driver/listener are real host code. The live game factory
still resides in test/fixtures and retains explicit diagnostic compiler/monitor
policies; no production game release or complete multiplayer compatibility claim.
Next: actual resource-lock coordination and cleanup, then durable state and
extraction of remaining fixture services into the executable runtime.


## D-154 — Shared resource locks and grant wakeups

Added ResourceLocks with FIFO ownership, duplicate-request suppression, pending
claim cancellation and job teardown. Connected live fixture ENQ/DEQ/ENQC to the
world coordinator and added a monitor wake to GameSession. Source LOCK/UNLO
remain in control. Found HAVENQ is commented out (WARMAC 6491–6498), so documented
host HV.LOK/wake delivery as a modern decision. Three UCT ticks/second is an
explicit inference from source 4*3/about-four-seconds, replacing the preliminary
one-tick callback before accepting this binding. Preserved the extra 5000 ms
wait when a grant arrives during initial 100 ms wait.

Focused host/source tests cover ownership, cancellation, teardown, live private
lock tables, grant flags and non-input wake. Initial tests used an array address
without a subscript; corrected test fixture calls to ALIVE(1). Typechecking also
caught loss of socket-address narrowing in a closure; captured the numeric port.
Failure logs retained: logs/decwar-d154-typecheck.log and
logs/decwar-d154-lock-tests.log. Focused rerun passes all 15 tests in
logs/decwar-d154-lock-tests-recheck.log. Full check passes archive/generated audit,
TypeScript and 4,469 tests: logs/decwar-d154-check.log. Updated status and decisions.

Continuing toward the runnable milestone: source-driven disconnect cleanup and
remaining host bindings. Current tests force-close sessions; they do not yet
establish ordinary QUIT or hangup completion.


## D-155 — Standalone development entry and disconnect evidence

Added tools/run-telnet.ts / npm run dev:telnet and docs/running.md. The localhost
entry uses the existing composed source runtime, with an explicit development
fixture label; it does not supply replacement scoring or simplified commands.
A JSON-lines host log records startup, sessions, failures and shutdown without
logging user input. Signal shutdown cancels sessions and releases resource claims.

A real disconnect reaches DECWAR leave then final POINTS; the test preserves
ALIVE/WHO/NUMPLY at failure and verifies no host exception text is injected into
the terminal. Source CHKSEQ also immediately returns (WARMAC 3677), so no dead-job
sweep was silently enabled to mask incomplete cleanup. Release remains blocked
on resolving final-entry/compiler behavior and other production bindings.

A child-process test launches the actual entry at an ephemeral port, connects,
creates a galaxy, admits a ship, gets STATUS and sends SIGTERM. It verifies clean
process exit and the lifecycle log. All six socket/standalone tests pass in
logs/decwar-d155-host-tests.log; the focused disconnect log is
logs/decwar-d155-disconnect-test.log. Typecheck passed in
logs/decwar-d155-typecheck.log. No permanent listener was left running.

## D-156 — Live clock/CPU, shield and movement commands

Closed a copied TIME clock-service gap: TIME's callback copy still referenced
scheduled fixture MSTIME/RUNTIM. It now reads live day time and per-session CPU
accounting, as does admission. GameSession samples process CPU microseconds
around source continuation/control execution and includes current work in an
in-progress RUNTIM reading. Waiting and other jobs' continuations are excluded;
background process CPU within a sample is a documented modern limitation.
A deterministic accounting test verifies separate jobs and truncation to ms.

Selected the already documented V5 negative-true/two-label IF policy for the
post-MOVE ALIVE branch. Live input now drives TIME, SHIELD DOWN/UP and STATUS
in one session. A second probe selects an adjacent vacant sector, sends MOVE
ABSOLUTE, and verifies position/board changes, one turn and empty lock slots.
No direct dispatch replaces input, and no source routine is stubbed in these
probes. Initial typecheck caught erasable-only constructor syntax and an inferred
non-yielding fixture callback type; corrected both. Failed log retained at
logs/decwar-d156-typecheck.log. Focused tests pass at
logs/decwar-d156-session-tests.log and logs/decwar-d156-live-command-tests.log.
Full verification passes archive/generated checks, TypeScript and 4,474 tests
at logs/decwar-d156-check.log. Continuing with statistics storage shared across
captains and persisted across development host restarts.


## D-157 — Source statistics on shared/disk storage

Replaced live per-session statistics arrays with a world-owned WordFiles service.
Statistics OPEN/input/output/close bindings read the actual source descriptors and
transfer all 640 words; source UPDCAP/UPDSTA/SHOSTA/STAZAP logic is unchanged.
Added versioned 36-bit hex disk files, validation, atomic replacement, and an
exclusive data-directory owner for the standalone process. The development entry
uses disk statistics in data/ by default and supports --data. Files and lock are
outside the immutable archive; tests use temporary directories.

Tests reopen storage across new worlds and verify incremented game and ship
commission counts. Two real connected captains now preserve both counts in one
store. Corrupt data is not reset. Fixed a fixture callback's inferred non-yielding
type so the explicit host service can bind; initial diagnostic retained at
logs/decwar-d157-typecheck.log. Focused storage/live/standalone tests pass in
logs/decwar-d157-storage-tests.log and logs/decwar-d157-host-storage-tests.log.

Also replaced fixed live DATE with UTC calendar encoding derived solely by
inverting source DACON (WARMAC 34–44), preserving its year-2000 adjustment and
output behavior. CPU/compiler manuals are still the only authorized external
technical evidence; no additional external material was consulted. Modern format,
read/open result, write commit, ownership, UTC and durability choices are recorded
in decisions.md and running.md. Full check passes archive/generated verification, TypeScript and 4,485 tests
at logs/decwar-d157-check.log. Final POINTS cleanup and other fixture/monitor services
remain release blockers; this round does not disguise them as complete.


## D-158 — GRIPE reports on the same source word store

Added gripeFiles for original FILOP, negative file length, IOWD INPUT/OUTPUT,
USETO 1 and CLOSE boundaries. SharedGameWorld now coordinates exclusive file
owners and releases both file and resource claims when a job ends. The source
still constructs the new report followed by all old packed words; the backend
performs no text reconstruction. Bound the original busy-file HIBER wait to the
live session scheduler. Updated standalone and integration teardown callers.

Actual live input creates two disk reports; the second contains the first's
byte-for-byte word tail. Tests verify ship restoration and unchanged turn count,
STATUS afterward, source busy warning/retry after an explicit monitor wake and
owner teardown, and empty EOF without file creation. Focused results:
logs/decwar-d158-gripe-test.log and logs/decwar-d158-live-tests.log. Typecheck passed
at logs/decwar-d158-typecheck.log. All choices/remaining header and allocator
fixture limits are documented in decisions.md and running.md. Full check passes archive/generated checks, TypeScript and 4,488 tests at
logs/decwar-d158-check.log.


## D-159 — Page-based live CORE allocation

Added nonoverlapping memory-region resize and PrivateCore. The live loader selects
an octal 240000–377777 private window, below the shared high segment, and rounds
CORE requests to 512-word pages (source CLOSE masks octal 777). New pages are
zero-filled; base/limit/initialization remain explicit host choices. Bound OGCH
growth, GRIPE old-file read expansion and file close shrink callbacks.

Live GRIPE successfully prepends a 12,000-word old report, preserves every old
word, shrinks the allocation and returns to STATUS. A 50,000-word old file cannot
fit this window: original CORE failure warning/cleanup runs, the file is unchanged
and STATUS still works. Unit checks cover retained words, zero-filled regrowth,
page bounds and failed overlap without partial allocation changes.

A large assertion initially compared unsigned packed fixture words with their
signed storage representation; formatting its huge diff appeared to stall the
test process. Diagnostic probes showed all source file stages completed. Corrected
the fixture to signed36 and changed the large comparison to report the first
mismatching offset. Interrupted logs/probes retained under logs/decwar-d159-*.
Probe instrumentation was removed. Focused 11-test rerun passes at
logs/decwar-d159-live-recheck.log. Full archive/generated/type/test verification
passes 4,492 tests at logs/decwar-d159-check.log.

Asked the user asynchronously whether the matching compiler/version or executable
listing is known, specifically to resolve undefined final POINTS behavior. No
expanded research permission or settings change was requested. Continuing other
runtime bindings while that question is pending.


## D-160 — Source monitor exit and live interrupt handling

Added an explicit SessionExit control transfer so a bound source MONRT ends a job
successfully rather than being logged as a fixture exception. Live exits now run
actual MONIT (WARMAC 1191–1211): output/disabled restart, ZAPLOK, selected RESET,
optional FREE/sequence cleanup, then monitor return. Bound pregame, setup CC1/CC2,
restart, lock-fatal and existing endgame/APR exit services. Normal active-ship
QUIT still encounters final POINTS before reaching this exit; no bypass added.

GameSession can run a yielding interrupt handler before resuming the suspended
source continuation. Telnet IP now enters actual INTH (WARMAC 4152–4174), with
private flags, saved/restored words and selected CC1/CC2 dispatch. The host uses
opaque 0/1 continuation words and synthetic PUSHJ addresses, explicitly not real
PDP-10 PCs. Unknown handler addresses (including unbound CLRBUF) still fail.
Initialization sets the source RESET-style INTFLG gate to -1.

Six partial-session tests cover disconnect and interrupt in pregame, side choice
and ship choice. They verify MONIT completion, stage-specific player/team cleanup,
no mission-file write, and preservation of NUMSHP after CC2 (source does not undo
it). Main interrupt reaches quit confirmation; NO then STATUS continues normally.
That probe initially exposed a host bug: an interrupt during HIBER left a pending
empty read for the later confirmation prompt. Interrupt now cancels only a read
already suspended, while still waking the current timer. Failure retained at
logs/decwar-d160-main-interrupt-test.log; corrected full live/session focused run
passes at logs/decwar-d160-live-recheck.log. Other focused type/exit logs retained.

Added a real socket IAC-IP test during ship selection to verify CC2 through the
actual Telnet decoder and successful wire close. Full verification passes archive/generated checks, TypeScript and 4,503 tests at
logs/decwar-d160-check.log. Compiler/executable question remains pending while
other runtime dependencies continue to close.


## D-161 — Returning admission interrupt handler

Ported CLRBUF.FOR:24–29 directly: OUT of octal 034160703400 with zero line
spacing, then CLEAR. Bound the actual handler in live INTH, using a separate
synthetic argument block and the existing raw OUT/CLEAR routines. The source
is present in the archive; D-160's limitation was its missing runtime binding.

The admission test interrupts at JOBSTA after SETUP installs CLRBUF. It checks
four exact bell bytes, both pending input queues and BUFPTR clearing, preservation
of all 16 accumulators including the return stack, restored INTFLG, and retained
ship reservation. The scheduler boundary is injected by the test; game statements
and handler effects execute unchanged. Focused tests and TypeScript pass at
logs/decwar-d161-clrbuf-test.log and logs/decwar-d161-typecheck.log.

D-161 full check passes 4,505 tests, archive/generated checks and TypeScript at
logs/decwar-d161-check.log. Continued into sustained multiplayer commands.

## D-162 — Live messaging, combat and LIST policy binding

Two commissioned captains exchange TELL messages through the original shared
queue, preserving case and literal slash/semicolon message tails. RADIO OFF
blocks delivery; RADIO ON restores it, without consuming turns. Opposing captains
exercise PHACON→PHADAM with native numeric/RNG services: minimum-power firing
with raised shields costs 2,500 scaled units, damages the other ship's shields,
queues the original hit, advances a turn and reaches both players' STATUS. The
combat test selects adjacent empty positions and a fixed raw seed; it does not
replace damage, random, notification or command routines.

Initial combat admission timed out because HELP's BUZZARD example disagrees with
selected BLKDAT's Cobra/Demon/Hawk/Jackal/Wolf roster. Corrected the test to COBRA,
retained the failing log, and documented the source conflict. Both remain
unchanged in the archive. A SCAN/SRSCAN/USERS/LIST sequence then exposed a missing
LIST two-label IF binding. Applied the already selected V5 true-first policy,
consistent with CPU/compiler evidence recorded in platform-manuals.md.

Logs: logs/decwar-d162-messages-test.log, decwar-d162-combat-test.log (timeout),
decwar-d162-combat-recheck.log, decwar-d162-command-probe.log (missing binding),
and decwar-d162-live-recheck.log (rerun). No broader source research used.

D-162 full check passes all 4,508 tests, archive/generated checks and TypeScript
at logs/decwar-d162-check.log. Source header/text remains unchanged; the new
Empire encounter assertion checks the short OUTHIT phaser/Cobra text and actual
source formatter calls, in addition to shared hit-flag consumption.


## D-163 — Native Romulan movement literal and live torpedo combat

Audited REAL initializers left by the statement fixtures. Most scratch values
are assigned before their live reads, but ROMDRV's persistent CHECK literal
0.0 still contained an opaque rational handle. Reproduced the failure by enabling
Romulans at source setup and moving through successive actual turns: the first
CHECK rejected the non-native word. Rebound this literal with the same native
encoder as the arithmetic services (ROMDRV.FOR:169).

The live Romulan test uses source TOURNAMENT PORT initialization, actual MOVE
commands and source creation/targeting/CHECK/relocation. It preserves subsequent
base/planet defenses; an initial postcondition incorrectly required the Romulan
to survive the whole turn, but those defenses can destroy it. Corrected the test
to require creation and successful relocation, and check board consistency when
it remains alive. Focused rerun passes at logs/decwar-d163-romulan-final.log.

The initial turn-driving TORPEDO probe omitted ABSOLUTE and was rejected under
the live input-coordinate mode; timeout/diagnostic logs retained. Replaced it
with real moves rather than changing source command defaults. Separately extended
the opposing-captain encounter with an explicit ABSOLUTE torpedo: ammunition,
turn count, TORDAM, queued hit and recipient's short torpedo/Cobra output pass at
logs/decwar-d163-torpedo-test.log. TypeScript passes at
logs/decwar-d163-typecheck.log. Other failed runs remain under decwar-d163-*.

D-163 full archive/generated/type/test check passes 4,509 tests at
logs/decwar-d163-check.log. Continued into real captain-name input.

## D-164 — Development captain names through source JOBSTA

The development entry now requests an empty per-session name cache, enabling
the original JOBSTA prompt and raw INCHWL name reader (WARMAC:3808–3867).
Other integration fixtures can still explicitly retain their PLAYER setup.
The live INCHWL binding handles suspended input, INTH cancellation and EOF.
EOF requests CCFLG cancellation because JOBSTA's raw loop checks CCFLG but not
HUNGUP; PREGAM then performs actual MONIT. This is an explicit host policy,
not a claim about unavailable monitor hangup/echo behavior. No added host echo.

Tests check source SIXBIT name conversion, one initial prompt despite later
JOBSTA calls, USERS display and saved GRIPE identity, plus interrupt/disconnect
at the raw name prompt. An initial assertion incorrectly expected UPDCAP's
mission counter update to store the captain name; retained failed log and
corrected the check to the actual GRIPE identity path. Focused rerun passes at
logs/decwar-d164-name-recheck.log. Standalone socket/child-process test passes
with the added original name prompt at logs/decwar-d164-development-test.log.
Updated running instructions with the exact additional input and source
terminator/monitor limitations. The selected roster and raw name quirks remain
unchanged; original memory/monitor parity is still not established.

D-164 full archive/generated/type/test check passes 4,512 tests at
logs/decwar-d164-check.log.

## D-165 — Live planet economy and friendly tractor paths

Expanded sustained live checks to BASES/PLANETS/TARGETS and to two friendly
captains lowering shields, establishing TRACTOR NIMITZ, receiving the beam
notification, then releasing the beam through SHIELD UP and receiving its
release notification. These paths require no unbound omitted IP argument;
TRACTOR OFF still does, and is now explicitly listed in running.md.

A source tournament galaxy supplies a real neutral planet. The test positions
a commissioned, depleted ship beside it, away from enemy-base range, then sends
CAPTURE ABSOLUTE, BUILD ABSOLUTE, DOCK STATUS and POINTS. Ownership, capture
count, fortification level, replenished ammunition/energy, 1,500 total points,
three turns and released planet lock all pass without replaced command or
numeric services. The source's roughly 12 seconds of combined command waiting
is retained in this test. Logs: decwar-d165-gameplay-probe.log,
decwar-d165-capture-probe.log and decwar-d165-typecheck.log.

Updated README's stale progress summary and running.md's concrete unresolved
TRACTOR/LIST/zero-divisor paths. Complete faithful release remains the objective;
these live checks do not substitute for original-executable parity.

D-165 full archive/generated/type/test check passes 4,514 tests at
logs/decwar-d165-check.log.

## D-166 — Full-galaxy reload and monitor-wide resources

Added WorldDirectory as the modern shared-segment catalog and moved named locks
and exclusive file owners into MonitorResources. WARMAC LOCK:4493–4497 and
UNLO:4630–4634 explicitly omit game-number bits for FRELOK/STAUPD, so the host
now shares actual source keys across old/new galaxies rather than isolating
statistics locks in each world. Source six-bit game-number collisions remain;
no host world ID is added to keys.

Bound development KILHGH's OPEN/LOOKUP/RENAME to a virtual DSK:DECWAR shared
image at PPN zero. Successful RENAME unpublishes that world's loader entry while
existing sessions keep their memory. Bound original START/RUNDEC through
reloadRuntime: successful RUN emits a typed transfer, replaces private runtime
state in the same terminal job, and loads the current published world. Host
CPU accounting/transport input persist; source routines still own clearing.
Ordinary source errors are not caught as reloads. No original .SHR binary or
monitor disk operations are claimed.

A live full-capacity condition follows source KILHGH→START→RUN, prints original
messages, reinitializes on the same connection, commissions Cobra in game #2,
and preserves the old captain's ship/score/galaxy and ability to run STATUS.
The test checks START's six actual RUN descriptor words and one reload. An
initial expected banner count ignored TYPE:95's second version print on each
load; corrected against source, retained failure. Unit checks cover shared
file exclusivity/lock grants, stale removal, redirected controls and preserving
ordinary failures. Development child-process test still passes. Logs under
decwar-d166-*: initial type errors, corrected typecheck, reload-test.log,
reload-recheck.log and development-test.log.

The eleven-connection socket test fills both fleets with real admissions and
commissions the eleventh captain in game #2 on the same connection. All eleven
sessions remain active, and a captain in the old galaxy can still use STATUS.
D-166 final full check passes 4,519 tests at logs/decwar-d166-final-check.log.

## D-167 — Interruptible terminal output

The live OUTCHR binding now yields to the host after each emitted character.
Previously a source continuation could emit an entire report before the host
could deliver an interrupt or run another job. The original output routines
still determine every byte and its order. Per-character Node scheduling is an
explicit modern selection, not original baud rate or instruction timing.

Live tests now synchronize on actual input suspension or the next idle command
wait, rather than assuming visible text or a returned command implies that all
following source statements have run. WARMAC:3827 clears CCFLG after the name
prompt; GETCMD also clears it before the next command prompt. Early test
interrupts were therefore being cleared by original statements. Notification
tests likewise inspected output before GETCMD had emitted the queued messages.
No game behavior was changed to satisfy those assertions.

A new test interrupts during the first displayed SCAN data row. Original INTH
runs; SHWSCN completes that row, clears CCFLG and returns at WARMAC:2968–2971,
without printing the remaining rows or entering QUIT. STATUS then succeeds.
The initial assertion counted the leading blank line and coordinate header as
data rows; corrected that test's count against SHWSCN's actual output calls.
Focused gameplay/interrupt checks pass at
logs/decwar-d167-boundaries-recheck.log. Earlier failed probes remain under
logs/decwar-d167-* for the timing and assertion diagnostics.

The first full check exposed a raw-wire assertion that wrongly required Telnet
option replies to follow the entire startup banner; comparison now decodes
negotiation before checking source bytes. It also exposed the already documented
GETCMD:200/210/350 loop when hangup arrives during STATUS output instead of
inside INPUT. Temporary bounded tracing confirmed HUNGUP takes that loop;
diagnostic instrumentation was removed and trace logs retained.

The host now cooperates after GETCMD's actual ZAPLOK call, including after
disconnect. This preserves the original loop and ship state while allowing
other players and forced shutdown to run. A live two-captain test verifies that
distinction; a session test verifies cancellation of a cooperating disconnected
loop. The socket cleanup test now explicitly disconnects during the original
input wait and still observes the unresolved final POINTS failure. All seven
socket tests pass at logs/decwar-d167-socket-recheck.log and four focused
interrupt/hangup checks at logs/decwar-d167-hangup-check.log. The initial full
run and interrupted probes are retained; full verification is being rerun.

D-167 final archive/generated/type/test check passes 4,522 tests at
logs/decwar-d167-final-check.log.

## D-168 — Real HELP content in the live command path

Traced HELP/NEWS file bindings before changing them. NEWS already reloads the
archive's DECWAR.NWS in pregameRuntimeFixture; HELP inherited the sample
ENERGY/Body content from helpCommandRuntimeFixture. The live standard HELP
open now refills the existing buffered reader from DECWAR.HLP, from byte zero
on every successful open. Original HELP topic matching, OCHR output, EOF,
multiple modifiers and ESHP/PSHP still execute. No archive text is rewritten.

The archive supplies one standard help file. The special logical-path HELP
open is explicitly unavailable in this host, so privileged requests follow
SHLP's original fallback to the standard physical file (WARMAC:833–860,
5118–5126). The existing synthetic FILOP/buffer layout remains a development
binding, not a claim of monitor disk equivalence.

A live test compares MOVE and NEWS topic bodies to their actual archive
sections, reads real NEWS afterward, then reopens privileged HELP through both
source attempts. It checks ship restoration, no charged turn and a subsequent
STATUS. Focused check passes at logs/decwar-d168-help-check.log.

D-168 full archive/generated/type/test check passes 4,523 tests at
logs/decwar-d168-check.log. The supplied archive remains unchanged. Final
POINTS/quit/death cleanup, omitted TRACTR IP and uninitialized LIST SHIP still
need original compiler/build evidence or explicitly authorized compatibility
decisions; these passes do not resolve those gates.

## D-169 — Functioning game takes priority; playable profile

The user explicitly asked to set historical parity aside and get a functioning
game. Updated AGENTS.md to preserve that authorization. Added an opt-in
playable policy to the existing composition and made it the default for
`npm start` / `npm run dev:telnet`; `--strict` retains historical diagnostics.
The supplied archive remains unchanged.

Playable repairs: final POINTS proceeds from ALL flags to the report without
an uninitialized switch-loop continuation; scoring averages with zero divisors
display zero; TRACTR receives a writable IP; LSTSCN duplicate checks read SHIPS;
and already-pending GETCMD control takes quit/RED-alert handling rather than
the source spin. Native arithmetic, score totals, command text and the original
POINTS→UPDSTA→FREE lifecycle remain in use. Full choices and reasons are in
docs/playable-decisions.md.

Live lifecycle tests now complete normal quit, zero-turn/empty-team POINTS,
nonzero final scores persisted and reopened from disk, ship reuse, output-time
disconnect with another player continuing, GETCMD destruction/pregame return,
an actual phaser kill and stored kill count, active TRACTOR OFF, beam cleanup on
quit, and game-over followed by a new galaxy. An initial death test waited for
HIBER although PREGAM was actually awaiting GTKN; corrected its synchronization.
An initial score persistence assertion inspected DECWAR.STA although the source
selected DECWAF.STA for that captain; corrected the assertion against FREBIE.
Failed probes remain under logs/decwar-playable-*.

Real Telnet clients now exercise messaging, POINTS, normal quit, disconnect and
ship reuse. The standalone launcher test passes with the playable profile.
Updated README, status and running instructions around the playable alpha;
historical parity remains a separate future gate, not a stop condition here.
Full check initially passes 4,529 tests at logs/decwar-playable-full-check.log;
the final added beam/kill-statistics checks pass at
logs/decwar-playable-complete-lifecycle.log. A final complete check is running.

Final complete check passes 4,530 tests, including archive/generated audit and
strict TypeScript, at logs/decwar-playable-final-check.log. Started the playable
server with `npm start -- --port 2323 --log logs/playable-server.log`; it is left
running at 127.0.0.1:2323 with persistent storage in data/. A real socket probe
received the original version/experience prompt and disconnected successfully
before creating a galaxy. The host log records that session as completed.

## Archive check — Possible 18-player ancestry

In response to the user's question, searched the supplied archive only.
HISEG.FOR:89 and WARMAC.MAC:450 reserve 18 player-identification bit entries.
DW2.FOR:96–98 initializes all 18 one-bit masks, unlike selected BLKDAT.FOR:96–97,
which initializes ten. Both roster copies still contain only ten ships, and
PARAM.FOR:25 / WARMAC.MAC:229 set KNPLAY to ten. The selected DECCMP/CAN1
commands use BLKDAT, not DW2. These are traces of an 18-slot representation,
but do not establish a working historical 18-player build or when it existed.
No configuration or game code was changed.

## D-170 — Restore terminal width at live startup

The user's screenshot showed bare `SC` rendering only the captain's cell.
Reproduced this through actual playable startup and command dispatch: TERWID
was zero, so SCAN.FOR:58-60 reduced all default distances to a negative value,
which its later clipping reduced to zero. Isolated scan tests had seeded a
terminal width and therefore missed the live initialization omission.

Restored the 80-column initialization from WARMAC.MAC:1137-1138 in the live
session factory, for both playable and historical diagnostic profiles.
LOWSEG.FOR:27-28 places TERWID beyond LLZ, so the FORTRAN entry's low-segment
clear correctly preserves it. The standalone RESET port already implements
this assignment. No scan algorithm or original source changed; this is a port
integration correction, not a new compatibility policy.

Added a regression that commissions a captain, runs bare SC and SRSCAN without
seeding TERWID, and checks default bounds plus every actual terminal map row.
The pre-fix failure is saved in logs/scan-startup-before.log; all 44 focused
scan, RESET and playable lifecycle tests pass in logs/scan-startup-focused.log.
Updated running instructions with default ranges and the explicit SCAN 10
workaround. The existing server on port 2323 still has a connected captain;
left it running to preserve the user's live galaxy. Its loaded code requires
a restart to receive the initialization fix.

Full `npm run check` passes archive/generated integrity, strict TypeScript and
all 4,531 tests. Output: logs/scan-startup-full-check.log (36.3 seconds).

## Archive check — Names beyond the ten-ship roster

Checked the user's follow-up about names for eighteen ships. BLKDAT.FOR and
DW2.FOR:84-94 both supply ten names; WARMAC.MAC:2444-2454 supplies the same ten
long display names. Found two additional names in documentation examples:
BUZZARD in DECWAR.HLP:916 and Excalibur in DECWAR.HLP:1244,1295, also repeated
in DECWAR.DOC and DECWAR.RNH. Neither appears in these executable name tables.
Reading that news entry in context also corrects the earlier ancestry finding:
DECNWS.RNO:65-66 explicitly says "There are 9 ships on each side instead of 8,
and some of the ship names have been changed." This is under Version 2.0,
10-Jul-79 (line 29). Thus the supplied archive DOES document historical
eighteen-ship support, although the selected executable source is configured
for ten. My earlier statement that no documentation claim was found was
incomplete. The extra examples may be stale names; they do not establish a
complete eighteen-ship roster or prove those names coexisted with the current
ten. No game configuration changed.

## D-171 — Ctrl-C at BUILD and repeated Telnet interrupts

Investigated the user's screenshot of BUILD's Coordinates prompt becoming
unresponsive. Isolated TCP tests reproduced an interrupt-only IP deadlock:
server.receive(empty) woke the suspended read before interrupt() could mark it
cancelled. Ignored empty receives and queued batch controls before data delivery.
Bound ICHR.T's CLRBFi to both host and editor queues, so interrupted typeahead
cannot contaminate the next command. Added raw ETX-to-INTH mapping at the host
boundary, explicitly documented as client compatibility in docs/decisions.md.

The installed /opt/homebrew/bin/telnet then exposed a second fault. First Ctrl-C
worked; the second hid output. Its option tracing showed IP followed by a fresh
DO TIMING MARK on each Ctrl-C. The refusal cache answered only the first. The
codec now answers every DO TIMING-MARK with WONT, retaining ordinary option
refusal-loop protection. Repeated BUILD cancellations and subsequent STATUS
now work in the real PTY client. Main-prompt Ctrl-C after STATUS asks the original
quit question; YES records scores and closes normally. The source's suppression
of additional interrupts until another GTKN remains unchanged.

Tests cover empty socket payload plus interrupt, IP/raw ETX/IP-with-timing-mark,
empty and partially entered coordinates, queued typeahead, repeated cancellation,
following STATUS, and fragmented repeated timing requests. Initial tests wrongly
waited for monitor echo; corrected them to synchronize on actual INCHWL reads.
Failed reproductions are retained under logs/build-interrupt-*. All 22 focused
tests pass in logs/build-interrupt-complete-regression.log. Full archive audit,
strict TypeScript and all 4,536 tests pass in logs/build-interrupt-full-check.log
(34.9 seconds). Real-client evidence: logs/ctrl-c-real-client-probe.log and
logs/ctrl-c-client-probe-server.log. Updated status and running instructions.

Stopped the isolated probe server after normal in-game quit. Left the user's
original port-2323 server and connected captain untouched. That process must be
restarted to load these corrections and D-170's scan initialization fix.

## Authorized restart — Scan and Ctrl-C fixes live

User approved restarting. Stopped the old host normally via its console signal,
then started `npm start -- --port 2323 --log logs/playable-server.log` with the
same persistent data directory. The new host began listening at 18:37:06 UTC
on September 5, 2026, loading D-170 and D-171. A localhost probe received the
original version/experience prompt and disconnected before commissioning a ship
or creating a galaxy. Probe completed successfully; evidence is in
logs/restarted-server-probe.log and logs/playable-server.log. Server left running.

## Scan presentation — Short versus long format

User compared a compact scan with a previously spaced scan after reconnecting.
The first image matches SHORT scan formatting (one character per sector, every
third column labeled); the second matches LONG (two characters per sector,
every second column labeled). DECWAR.FOR:59 selects SHORT for EXPERT; BEGINNER
and INTERMEDIATE select LONG. SET.FOR:106-115 implements SET SCANS LONG to
change this in the current session. The range argument in SC 10 does not select
the display format. No code change or server restart is needed; preserve the
source's preference behavior rather than changing EXPERT defaults.

## GitHub repository — Initial publication

User requested a GitHub repository named DECWAR and explicitly selected public
visibility. Authenticated GitHub account: erictfree. Prepared the original source,
TypeScript implementation, tests, documentation, GPL license and attribution for
the initial main branch. Existing .gitignore excludes dependencies, runtime game
data, diagnostic logs and downloaded CPU/compiler manuals. Source/generated-data
audit passes (logs/github-initial-audit.log); latest complete verification remains
4,536 passing tests. No game runtime or running server changes are involved.

Created the public repository at https://github.com/erictfree/DECWAR and linked
it as origin. The initial main-branch publication contains 698 files, including
all 135 byte-preserved archive files.

## Legacy source layout and UT Austin import

User requested moving old_source to legacy/compuserve and importing the contents
of decwarorg/utexas's utexas23-reconstruction into legacy/utexas. Kept the original
fortran 1978 subdirectory inside compuserve. All 135 original files still match
their pre-move hashes; regenerated only the source index's links, with no changes
to generated TypeScript data or the original source manifest.

Imported 39 upstream files at commit f78f2ec733999617e4281ba3ed967bff8cd5d8f8.
Verified every byte against upstream Git blob hashes and recorded paths, sizes,
modes, SHA-256 and Git blob hashes in legacy/utexas-manifest.json. Retained the
upstream repository MIT license as legacy/utexas-LICENSE and documented provenance
in legacy/README.md. No upstream build scripts were executed. The port continues
using compuserve; no UT Austin game behavior has been merged into it.

Updated tools/source.ts, tools/audit.ts, source-reading tests, README, NOTICE,
AGENTS.md and documentation references. AGENTS explicitly records the user's
authorization for this import. Kept an ignored local old_source symlink because
the currently running server cached the old path for HELP/NEWS and source reads.
It points to legacy/compuserve and is not part of the repository; it can be removed
after the next server restart. No active game was interrupted.

Import verification: logs/legacy-import-verification.log. Source-index
regeneration: logs/legacy-relocation-audit.log. Full archive/generated audit,
strict TypeScript and all 4,536 tests pass in logs/legacy-layout-full-check.log
(35.9 seconds). Git recognizes all 135 baseline files as unchanged renames.

## MIT permission for original project contributions

User requested MIT licensing for our work based on the imported MIT snapshot.
Verified the existing provenance: the current port was developed from the
Compuserve archive carrying GPL-3.0-or-later notices; the separate UT Austin
snapshot has an upstream MIT license but has not replaced that baseline.
Consulted FSF license compatibility guidance, not external DECWAR game logic.

Added LICENSE-MIT granting MIT permission for original project contributions
to the extent the contributors control those rights. Added LICENSING.md and
updated NOTICE/README to make the scope explicit. Retained the original root
GPL license, package GPL-3.0-or-later metadata, and all legacy source notices.
This is not an MIT-only relicensing of the combined port or a determination that
every derived TypeScript file can be reused under MIT alone. A broader change
requires establishing the underlying rights/provenance first. No code changed.
Source/generated-data audit passes in logs/mit-contributions-audit.log. License
and documentation changes only; the previously passing game suite was not rerun.

## Read-only comparison of UT reconstruction and CompuServe snapshots

User requested understanding the two codebases without changing code, explicitly
noting that UT is an imperfect reconstruction. Compared only the authorized
local archives; no external implementation material was consulted. Saved the
source-backed findings in docs/legacy-comparison.md. No runtime, source archive,
test, configuration, license, or generated-data files changed; server untouched.

Matched 69 FORTRAN program units across the snapshots (UT amalgamates 59 into
DECWAR.FOR): 51 normalized statement sequences match and 18 differ. Numeric
labels, order, and single-quoted text were retained. Comments and D-lines were
excluded using the archive-specific reader; this is lexical evidence, not a
compiler or semantic-equivalence proof. Compared relevant MACRO changes in
context, including locking, entry/exit, echo, statistics and Romulan speech.
Temporary analysis scripts were kept outside the repository under /tmp.

UT has a complete eighteen-ship roster in both FORTRAN and assembly tables,
with consistent eighteen-bit group masks, versus ten in the C build selection.
UT starts with twenty planets versus sixty in C. Major differences also include
startup via DECWAR.INI, removed honor roll/mission persistence, Romulan message
and random-test changes, global lock handling, privilege checks and argument
copies around selected DO-variable calls. Shared named message literals are
byte-identical: MSG.MAC 301 and SETMSG.MAC 23, including internal CR/LF bytes.

Documented reconstruction limits: UT help still lists ten ships, DECWAR.INI
is absent and its missing-file branch does not assign the defaults it advertises,
both copies contain DrForbin/Merlyn modifications, and shared POINTS/TRACTR
compiler/argument ambiguities remain. C FORTRAN and MACRO disagree on KNHIT
(64 versus 400); UT agrees on 720. No edits were assigned to a historical author
or date solely from the directory names. No baseline change is implied.

Results: logs/legacy-fortran-comparison.log,
logs/legacy-fortran-comparison.json.log, logs/legacy-fortran-differences.log,
logs/legacy-warmac-candidate-diff.log and logs/legacy-*-diff.log.
All 135 C and 39 UT file sizes/hashes remain correct, including UT Git blob
hashes (logs/legacy-comparison-verification.log). npm run audit:check passes
(logs/legacy-comparison-audit.log). No runtime tests were rerun for this
documentation-only review. Further semantic work should focus on COMMON/ABI,
startup and terminal behavior, synchronization, and changed Romulan/persistence
paths before choosing any UT behavior for the port.

## Plan for Austin as the default variant

User selected the Austin reconstruction as the future default and requested a
plan. Saved docs/austin-default-plan.md with six runnable milestones: source
contracts, variant-aware CompuServe regression baseline, eighteen-slot Austin
world/layout, Austin behavior integration, multi-client verification, then default
cutover. CompuServe remains explicitly selectable; source variant and existing
playable/diagnostic mode remain separate. No implementation or restart performed.

Inspected tools/source.ts, audit.ts, common.ts, local-layout.ts and queue-layout.ts;
tools/run-telnet.ts; shared-world/world-directory/monitor resources; live-session
and playable-policy bindings; setup statements; and relevant test entry points.
Found global C-generated imports, literal sixty-planet initialization, fixed
ten-name extraction, C link-map dependencies, fixed shared-region addresses and
host use of fixture composition. The imported Austin snapshot has no DECWAR.MAP.
The plan addresses per-variant data and symbolic/virtual layout before changing
the default, with explicit review of alias-sensitive paths and both COMMON sides.

Planned verification includes all eighteen Austin slots, team boundaries,
messages/hits and full-world rollover, source-specific startup/output/Romulan
behavior, complete lifecycle, lock/interrupt cleanup, storage separation and
CompuServe regression coverage. Missing INI, contradictory help and shared
compiler ambiguities receive documented playable decisions where needed rather
than silently inheriting C behavior. Existing archives, code, generated data,
configuration, licenses and running server remain unchanged by this planning
turn. Documentation-only validation: git diff --check.

## Full Austin repository search: build environment, map and initialization

User explicitly authorized searching https://github.com/decwarorg/utexas and
believes this is running code. Inspected the full previously downloaded archive
after confirming main remains f78f2ec733999617e4281ba3ed967bff8cd5d8f8 with
git ls-remote. The initial sandboxed network lookup failed DNS; the authorized
read-only retry succeeded. Search remained within this repository.

Found no standalone DECWAR.MAP/SYM/listing among 595 current archive files.
The disk ZIP contains two RP6 disk images; internal guest files were not inspected,
so their contents and repository history are not ruled out. L.MIC documents
map/symbol generation and @L/M/S/E. Normal simh/utexas.do compiles and links the
game without requesting those outputs. Docker/SIMH scripts, bootstrap disks,
FORTRAN-10 V6 tape/install workflow and README support a reproducible running
reconstruction, but no emulator or upstream build was executed this turn.

Important correction to the earlier subtree-only evidence: msc/decwar.ini exists
in the full repository and msc/tape.py copies it into the runtime tape. It sets
informative prompts, both coordinate output, medium output, then runs TARGETS
and SRSCAN 2 W. No invented fallback settings are needed merely because it was
not among the imported source-distribution files. The actual execution remains
to verify. Changelog also attributes the 10-to-18 hit allocation repair to
July 19, 2025, adding reconstruction history to the observed source difference.

Saved docs/austin-build-evidence.md with pinned source links and amended the
comparison's scope and Austin plan. New first milestone: reproduce upstream in
isolation, capture build identities, map/symbols and reference transcripts;
virtual layout remains a fallback. No source, runtime, archive, configuration,
license or running-server changes. Search/provenance records are under
logs/austin-repository-*.log. Documentation validation: git diff --check.

## Successful native Austin reference build and live emulator

User explicitly requested a subagent run the supplied build/map workflow, then
asked to preserve the outputs with the Austin archive and asked about local
play. Delegated isolated build execution; parent independently calculated source
layout expectations, checked source/artifact hashes and preserved provenance.

Built bundled SIMH pdp10-kl natively with Apple clang17 using make pdp10-kl,
and BACK10 with cc back10.c -o back10. Docker CLI was installed but its daemon
was not running; no downloads were required. Extracted pinned f78f2ec sources
and bundled disks under /tmp/decwar-austin-reference. All 39 game source files
match their manifest; only isolated boot/instrumentation scripts changed.

Booted KL703 TOPS-10, restored source tape, compiled all listed game modules
and linked with DECWAR/SAVE/MAP/SYFILE in the original module/library order.
Verified FORTRA6(1144), MACRO53B(1244), LINK6(2376). Fresh artifacts: MAP47459bytes,
SYM6395bytes and EXE176640bytes in explicit BACK10 -C lossless word encoding;
raw BACKUP export tape261896bytes retained. Default ASCII extraction is used
only for MAP. BACKUP emitted Cannot get high segment back after Done; allthree
files were listed and extracted, map terminator verified, hashes saved.

Map HISEG3122 and LOWSEG129 exactly match parent calculations from Austin
declarations. LOCAL200 begins at octal341; TIMERS250 at406072. Source/layout
comparisons are in logs/austin-reference-map-*.log. Both Yorktown slot9 and Wolf
slot18 were admitted, actual INI commands ran, STATUS worked, Yorktown SC10
rendered21x21, and QUIT/YES printed zero-point score tables and returned to the
monitor. This is executable smoke evidence for the reconstruction, not a full
18-client/combat/parity verification. Captures are Telnet-client transcripts,
not raw network byte captures. Guest1986 dates are scripted; actual build2026-09-05.

Saved artifacts/provenance/transcripts/launch diff in reference/austin/f78f2ec
and, per user's additional keeping request, identical copies alongside the
immutable source at legacy/utexas-reference/f78f2ec. commands.txt records full
commands and failed attempts; artifacts.json records formats/hashes. Updated
legacy/README.md and docs/austin-build-evidence.md to distinguish completed
execution from the prior read-only search. No TS game or variant implementation
changes; no plan changes in this build turn.

After clean shutdown at test completion, restarted existing compiled disks for
the user using ./sims/BIN/pdp10-kl simh/boot-reference.ini in the isolated docker/
directory. PID42474, execsession24333, localhost2030 verified listening. Login
DECWAR then R GAM:DECWAR; no password. Separate console-restart.log. TS node
PID34798 remains listeninglocalhost2323. No active TS game interruption. Native
emulator is left running for the user. Current runtime state is operational,
not part of artifact provenance; full disks remain in the temporary worktree.

Final checks: source/generated-data audit passes in
logs/austin-reference-final-source-audit.log; both saved artifact copies hash
identically; git diff --check. Full TS tests were not rerun because no runtime
code changed. Documents/reference files only; no commit or push this turn.

## Austin implementation — source contracts and variant execution (in progress)

The user authorized proceeding with the Austin-default plan after the reference
build. Both running servers have been left untouched. No default switch yet.

Implemented independent source catalogs and extraction into
src/generated/variants/{compuserve,austin}.ts. Austin routines inside DECWAR.FOR
retain physical line numbers; catalogs verify both immutable archives and the
pinned Austin MAP/INI hashes. Extraction now covers all output tables, anonymous
messages, startup literals, character bits, file descriptors, lock storage,
COMMON/local views and queues. Austin yields 18 ships, 20 planets, 720 hit entries,
4190 queue words, HISEG 3122, LOWSEG 129, and TIMERS at octal 406072. The trailing
HILST assembly omission is allowed only by a specific Austin extraction option;
other declaration mismatches still fail. Austin ASCIL emits no CRLF, as its
actual macro expansion requires. Removed statistics entries produce empty tables,
not CompuServe replacements. Source archives remain unchanged.

Shared worlds and galaxy rollover retain immutable variant identity and selected
layout. Named data imports now go through read-only session views. Implementation
refinement: the factory passes context at the host boundary and AsyncLocalStorage
carries it through existing statement routines; generator next/throw/return are
explicitly scoped, since constructing a generator does not scope its resumes.
This avoids threading a new argument through every instruction helper while
preserving independent contexts, with no mutable process-global selector or
in-game environment checks. CompuServe's original generated object identities
are retained because memory-role checks depend on them. Tests cover interleaved
variant generators, async continuations, cancellation, and immutable data views.
This is an internal compatibility bridge; Austin routine behavior is still being
connected and is not yet offered as a playable/default session.

Verification: logs/austin-variant-foundation-full-check-2.log: all 4541 tests pass.
The first full check failed solely because the sandbox prohibited localhost
listeners; rerun with listener access passed. The context migration's first run
exposed six provenance/object-identity regressions; they were corrected by
retaining CompuServe's existing data identities. Focused rerun:
logs/austin-variant-context-focused-2.log: 28/28 pass. A separate new scope test
initially assumed CompuServe BITS was dimensioned 10; source actually retains 18
BITS entries, so the test now checks the player dimension of SHPCON. The array
proxy descriptor check also caught and fixed a JavaScript Proxy length invariant.
Failures retained in logs; full migration regression rerun currently in progress.

Austin's internal full composition now constructs with its own memory sizes and
timer location. Broadcast-only ROMSPK binding is connected, with no node/player
quip tables. Remaining work includes Austin entry/INI, pregame/SETUP/cleanup,
lock/monitor behavior, changed FORTRAN argument copies and Romulan behavior,
then 18-player lifecycle/Telnet validation, host selection and default switch.

## Austin implementation — connected gameplay and verification

Connected Austin entry/INI, pregame/admission, twenty-planet setup, eighteen slots,
statistics removal, ROMDRV/TELL/ROMSPK changes, fixed monitor lock keys and
release-all behavior, JOBSTA/USPPN/speed table, echo routines and six active
argument-copy changes. DSHIP calls are all inactive source, recorded as no port.
Moved the host composition to src/runtime/game-session.ts; tests re-export it.
Added --variant and guarded variant-specific storage. Default still held at
CompuServe during these checks; original servers remain untouched.

The complete suite after initial gameplay integration passed 4547 tests in
logs/austin-game-full-check-1.log. Subsequent focused tests added eighteen-slot
admission, nineteenth-player rollover, interleaved commands, slot-18 phaser
kill/death/rejoin, game-over, real TCP Ctrl-C/IP/message/disconnect checks,
720-entry hit saturation and Austin four-draw Romulan broadcast behavior.

The first live movement/capture/build/dock test exposed a missing JA allocation
in the separate production defense binder. Fixed that binder's JA and KA storage;
the standalone fixtures already had their copies. A second test run reached all
four commands but its energy assertion failed because a nearby enemy base fired
on the ship after docking. The staged encounter now excludes nearby bases while
retaining the real commands and turn loop. Failed runs retained in
logs/austin-command-soak-test*.log. A TypeScript closure-narrowing error in the
new Telnet test was fixed by capturing the validated numeric port.

logs/austin-differences-test-3.log passes all eight targeted differences tests;
logs/austin-typecheck-2.log passes strict typechecking. Full final validation
and host launch/default switch still follow. docs/austin-implementation.md now
accounts for all eighteen changed FORTRAN units and material assembly differences,
including modern monitor bindings and remaining parity/load limits.

## Austin default release — completed and running

Austin is now the omitted-variant CLI default. Explicit --variant compuserve
retains the original ten-player host behavior. Source/repair mode are independent;
--strict remains diagnostic. README, running instructions, status, approved-plan
status and the source-difference ledger now describe the implemented variants,
roster, storage reuse and historical-parity limits.

Final checks:
- logs/austin-command-soak-test-3.log: five live Austin game tests pass, including
  real movement/capture/build/dock with original waits, all 18 slots, concurrent
  reports, nineteenth-player rollover, phaser destruction and game-over.
- logs/austin-eighteen-telnet-test.log: all eighteen simultaneous real TCP clients
  issue concurrent commands and quit, leaving no ships or locks. The same test
  covers raw Ctrl-C, Telnet IP, two-captain messaging, disconnect and reuse.
- logs/austin-release-full-check-2.log: npm run check passes both frozen-source/
  generated audits, strict TypeScript checking and all 4563 tests (35.65 seconds).
- Clean isolated snapshot recorded in logs/austin-release-directory.txt:
  logs/austin-clean-install-2.log: Node 24 installs all 23 pinned packages;
  logs/austin-clean-launch-check.log and austin-clean-launch-transcript.log:
  omitted-variant CLI starts Austin, reads its INI, admits Yorktown, runs STATUS
  and QUIT, writes Austin metadata, then shuts down the isolated test host.
- git diff --check passes. Original generated CompuServe files and both immutable
  source archives remain unchanged.

Retained failed verification: logs/austin-release-full-check.log had 4561 passes
and one timed-out legacy development-server test because that test assumed the
old omitted-variant CompuServe startup. It now explicitly selects CompuServe;
a separate test exercises default Austin, including host metadata and no STA
writes. The initial offline clean install lacked the cached @types package and
picked the machine's Node 23 outside this project's environment. Repeated with
explicit Node 24 and the pinned registry packages; install and launch passed.
These failures were not suppressed or deleted.

Austin EXIT now preserves HLLZS .JBSA's right-half clearing separately from
MONIT; both use the documented modern session-exit binding. Remaining original
monitor continuation, timing, all malformed-input paths and exhaustive compiler/
original-executable differential behavior are still unverified. No blanket
historical-parity claim is made.

Operational handoff: new Austin host started using the omitted-variant command
node tools/run-telnet.ts --port 2324 --log logs/austin-live-host.log, exec session
32124. Its own data is data/austin. A real connection completed fresh startup,
Yorktown STATUS and QUIT: logs/austin-live-launch-check.log and
logs/austin-live-launch-transcript.log. The smoke galaxy is regular with Romulans
and black holes disabled; it remains available with no smoke captain reserved.
Existing CompuServe PID34798 on localhost2323 and native PDP-10 reference on
localhost2030 were not restarted or modified. All implementation/reference work
remains local in the working tree; no commit or push in this implementation turn.

Final user handoff: after confirming the only Austin connection was the completed
smoke captain, stopped the new host PID48698 and restarted it on localhost2324
(exec session90654). This discards only the empty smoke galaxy, allowing the
user's first captain to choose game options. Listening was confirmed by host
startup output. Existing CompuServe on2323 remained untouched. The Austin log
retains both startup records and the intervening clean shutdown.

## Visitor README rewrite

At the user's explicit request, delegated a README-only rewrite to the readme
subagent, then reviewed its text against the current runtime instructions,
package requirements, Git remote, source evidence and licensing. Replaced the
long chronological checklist with a visitor-facing game introduction, Node 24 /
Telnet quick start, starter commands, Austin/CompuServe comparison, source-fidelity
approach, honest alpha limits, documentation/development pointers and existing
license scope. Explained that playing the TypeScript port needs no PDP-10 emulator.

The review found an earlier documentation error: Austin HLP/DECWAR.HLP, which
source-assets actually serves, says 1–18 players and lists nine ships per side.
Only HLP/DECWAR.RNH, the older formatter source, still says ten/five. Corrected
that distinction in running/status/implementation/comparison/plan documentation;
this supersedes earlier work-log statements that the served Austin help lists
ten. Also corrected stale variant-adoption sentences in LICENSING.md and
legacy/README.md without changing any license terms or source archive bytes.

Validation: all 19 local README links resolve (logs/readme-review.log), source
and generated-data audit passes (logs/readme-source-audit.log), git diff --check
passes. Documentation-only work: no gameplay code, tests or running servers
changed, and no commit or push in this turn.

## Repository checkpoint and generated-file retention

The user asked to commit this milestone and decide which generated files belong
in the repository. Keep the runnable TypeScript changes, regression tests and
shared binders, extraction tools, checked generated TypeScript, updated docs,
and one canonical reference bundle at legacy/utexas-reference/f78f2ec. All 17
manifest entries hash correctly and match the local reference/austin mirror.
The reference bundle is under 600 KB and includes source-audit inputs MAP/INI,
lossless EXE/SYM, the raw export tape and curated build/terminal evidence.

Added docs/repository-artifacts.md with retention/regeneration rules. Expanded
.gitignore to exclude all local logs regardless of extension, all tmp content
(including downloaded manuals), and the duplicate reference/austin mirror.
Existing data, dependencies and build outputs remain ignored. Nothing was deleted
from disk. Added .gitattributes to preserve legacy bytes across checkouts and
mark generated TypeScript for GitHub's diff display. Neither source archive nor
any reference artifact bytes changed. Runtime servers remain untouched.

The implementation's final full suite passed 4563 tests before these documentation
and repository-policy edits. Checking the staged repository snapshot next ensures
that it does not rely on the newly ignored duplicate or local scratch files.

Staged-only verification completed: copied the Git index into an isolated
checkout with no local logs, data, downloaded manuals or duplicate reference.
Pinned dependencies installed from cache under Node 24; both source/generated
checks passed, TypeScript checking passed, and all 4563 tests passed in 34.10s.
Results: logs/commit-snapshot-{install,audit,typecheck,tests}.log. This verifies
that the selected repository files are sufficient for installation and checks.

Git's first staged whitespace check flagged the preserved CR/LF/padding in
reference artifacts. Did not alter those bytes: .gitattributes now disables
legacy whitespace checks while retaining ordinary checks for project code.
The subsequent staged check passes. All 17 reference artifact manifest hashes
were verified; both original source archives remain unstaged and unchanged.
Checkpoint commit: "Add Austin-default DECWAR variant and preserve reference evidence".
This turn creates a local commit on main; no push is included.

## Port and source attribution

Added the user's requested attribution prominently in README.md and in the
legacy source overview: Eric Freeman created the TypeScript port working with
OpenAI GPT-6 Astra, based on Noah Smith's UT Austin DECWAR reconstruction and
sources preserved on a legacy CompuServe tape. This credit follows the provenance
provided by the user; original archive notices and license terms are unchanged.
Documentation-only edit; checked the diff and whitespace before committing and
pushing under the user's instruction to publish ready changes to main.

Added the user-provided https://decwar.org link beside the README attribution
for readers interested in the overall DECWAR effort. Documentation-only update;
no external implementation research or game changes. Whitespace check passed.

## Public documentation voice

Replaced conversational approval/request narration in public documentation with
direct project descriptions, dated provenance and technical policy. This covers
the legacy overview, licensing explanation, playable profile, source comparison,
build evidence, plan/status and platform/modernization notes. Credit and license
terms remain intact. Internal instructions and historical work-log records retain
their operational context. Reviewed the documentation diff and whitespace; no
runtime code, generated data or archived source changes.

## Documentation consistency review — September 5, 2026

Completed the documentation review before further gameplay implementation.
Added docs/README.md as a reading guide, docs/architecture.md for source-to-runtime
structure, memory aliases, scaled integers and modern host choices, and
docs/documentation-standard.md for durable writing/evidence requirements.
README links these guides and retains Eric Freeman/OpenAI GPT-6 Astra, Noah Smith,
legacy CompuServe tape attribution, decwar.org and the existing license scope.

Replaced the accumulated status page with current capabilities, dated validation
and explicit limits. Preserved its former contents in
docs/history/implementation-progress.md, verified verbatim except for one relative
link adjustment. Scope notes distinguish historical CompuServe analysis from
current Austin-default behavior. Updated the migration plan/comparison and build
summary to reflect the completed native reference build. Running instructions
separate Node/Telnet from TOPS-10/SIMH and distinguish configurable ports from
existing local processes. Added physical source links for the five playable
repairs and documented the FORTRAN V5 manual versus V6 reference compiler limit.

The source-index generator now labels its inventory as CompuServe and links
Austin evidence. No gameplay, runtime data, source archives or reference artifacts
changed; no servers restarted. Historical decision IDs and technical records remain.

Verification:
- npm run audit: regenerated the documentation header; logs/documentation-review-audit.log.
- npm run audit:check: both variants and generated evidence pass; logs/documentation-review-audit-check.log.
- 265 local links across 21 documents, including heading/source-line targets,
  all 17 preserved reference artifact hashes/sizes, and historical status copy:
  passed; logs/documentation-review-links.log.
- git diff --check: passed. Gameplay tests were not rerun for documentation and
  a documentation-generator header change; the last executable checkpoint remains
  4,563 passing tests at 31d34e4. This review does not establish exhaustive source
  understanding or original-executable parity.

Publishing this documentation pass under the existing instruction to commit and
push ready changes to main. Further implementation remains separate from this review.

## Specification goal and plan — September 5, 2026

Created an active goal for an implementation-independent DECWAR specification.
Austin is the normative core; CompuServe differences form an appendix. Recorded
work sequence, deliverables, evidence rules, conformance scope and completion
criteria in docs/spec/PLAN.md. Source semantics warrant High reasoning effort;
Extra High is not currently needed. This checkpoint establishes the plan only;
the specification is not yet drafted or reviewed. No runtime/archive changes.

Specification title-page credit: Eric Freeman, PhD and Noah Smith, PhD;
The University of Texas at Austin, Department of Arts and Entertainment
Technologies, as provided for the specification. Existing source provenance and
port/tool attribution remain separate.

### 2026-09-05 — Specification book and source-derived semantics draft

- Created the ordered Markdown book under `docs/spec`, with Austin core chapters,
  CompuServe amendments, evidence/coverage and unresolved-behavior appendices.
  The title/byline includes Eric Freeman, PhD; Noah Smith, PhD; The University of
  Texas at Austin; Department of Arts and Entertainment Technologies.
- Added `tools/spec/build.ts` and `spec:check`, `spec:build`, `spec:html` scripts.
  Pandoc AST assembly checks source command tables and chapter/source links,
  resolves cross-chapter anchors, and builds one Markdown, LaTeX, HTML and PDF.
  Outputs are ignored; source chapters, metadata, styles and builder are retained.
- Drafted all 33 main command forms; source-derived clauses now include scaled
  resources, movement traversal and towing, phaser/torpedo execution and damage,
  installation defenses, planet removal/docking, nova chains, Romulan scheduling,
  target selection and weapons, LIST selection, reporting and score-domain limits.
- Reviewed the original MACRO hit and radio queues directly. Hit storage is
  partitioned 40 slots per acting identity, retrieval is physical-slot order,
  radio overflow evicts a recipient's backlog, and source packing narrows report
  fields. Drafted queue/recipient/exclusion clauses. Modern FIFO assumptions are
  not substituted for those behaviors.
- Recorded additional unresolved compiler-evaluation, Romulan target-residue and
  message-edge cases. The draft is incomplete; compiled output is not proof of
  game conformance or exact native equivalence. No gameplay code changed and no
  running game was restarted.
- Source evidence: pinned `legacy/utexas/DECWAR.FOR`, `SETUP.FOR`, `WARMAC.MAC`
  and the supplied parameter/common/message files. No external game rules used.
- Build output: `logs/spec-build.log`; typecheck: `logs/spec-typecheck.log`;
  immutable-source/generated audit: `logs/spec-audit-check.log`. Initial PDF QA
  found table/inline-formula overflow; revised AST widths and TeX line-break
  handling. Final visual review and remaining semantic coverage are ongoing.
- Checkpoint validation passed: 13 assembled chapters/appendices and 210 local
  links; `npm run typecheck`; `npm run audit:check`. Staged review also caught intentional Markdown hard-break
  whitespace and one stray builder space; removed these before commit.
  Final XeLaTeX pass has no overfull-box, missing-character or unresolved-reference
  warnings. Rendered the 53-page working draft and inspected page contact sheets
  plus the title, traversal and conformance pages at reading size. Corrected a
  Markdown table break caught by visual inspection. PDF/HTML remain local ignored
  build products. Remaining work includes the complete output catalogue, pregame
  edge cases, compiler-dependent semantics, expanded scenarios and C amendments.

### 2026-09-05 — Specification utilities, literal catalogue and scanner bounds

- Prior goal turn classified as progress: published the initial specification and
  document builder in 7d5ce56. This continuation inspected that clean worktree.
- Added source-generated `docs/spec/messages.md` with all 324 named Austin ASCIZ
  fragments, literal JSON escapes and source line numbers; `tools/spec/messages.ts`
  checks it directly against the immutable archive on every book build. It is a
  literal catalogue, not a claim of complete output-path coverage.
- Drafted HELP/NEWS/GRIPE and TYPE behavior, pregame dispatch/administrative paths,
  display-name conversion, output composition/object/device/condition fields,
  shield/dock/TYPE output and acquisition/exit diagnostics. Clarified HELP/GRIPE's
  actual black-hole board substitution, seven-column help lists, four-BEL yellow
  notification, tab-counter masking and the pause service's ten-second cap.
- Derived ordinary token capacity from GTKN/NXTT control flow: end-of-command is
  checked before the capacity increment; fourteen tokens followed by a comma
  overflow while thirteen plus a final null fit. Resolved U-TOKEN-LIMIT in that
  bounded domain and added four scanner boundary scenarios. Decimal token storage
  remains separately unresolved.
- Added source-derived cases for every main command, utilities, session and queues;
  65 scenarios now parse as tables. Builder checks table parsing and unique scenario
  IDs, preventing a blank-line error from silently rendering raw table text.
- Recorded unresolved pregame missing arguments/public-field indexing, GRIPE
  header argument alias and retained administrative storage semantics. Described
  the pending-control loop and selected handler without importing the host repair.
- Checks passed: spec build (14 chapters/appendices, 257 local links, 324 fragments,
  65 scenario rows), typecheck and archive/generated audit. Logs remain
  `logs/spec-build.log`, `logs/spec-typecheck.log`, `logs/spec-audit-check.log` and
  `logs/spec-render.log`. Rendered all pages and reviewed contact sheets; adjusted
  verbatim wrapping for the literal catalogue and shortened an orphaned appendix
  paragraph. The builder now keeps source evidence with its preceding prose and
  rejects final-pass overflow, missing characters and undefined references; PDF
  metadata carries the title and author names. No runtime/gameplay changes, native-state mutations or server restarts.
- Goal remains active: remaining inline/output assembly, exact scoring/finite
  arithmetic, deeper interleaving examples and the complete CompuServe amendment
  set still require review. Page count and passing structural checks are not
  evidence of complete historical conformance.

### 2026-09-05 — Specification combat output, random ledger and standings

- Prior goal turn classified as progress: published utilities/catalogue work in
  2d9e051. Continued from a clean worktree without modifying game runtime or
  native state.
- Added TERM-11 recipes for all 15 decoded hit-notification types, preserving
  delivery-time preferences, source/target fields, short deflection behavior,
  conditional breaks, victim-only device reports, base emergency/destruction
  sequences and the radio-damage >3000 delivery gate for base distress calls.
- Added TERM-12 ordinary POINTS tables: category suppression, header/field widths,
  literal annotations, totals and integer-divided averages. Verified OFLT reads
  without modifying its argument; documented separate shared-score reads for
  formatting and accumulation. Corrected coordinate-ending notation to use the
  source's conditional CRLF operation. Final-entry and zero-divisor limits remain.
- Added RNG-4/5/6: command/helper draw ledger, enumerated compound-condition
  evaluation limits and exact source-derived generator vectors. Read the actual
  FORTRAN and assembly call sites; calculations use an independent integer
  recurrence, not the port. Logs: logs/spec-random-call-sites.log and
  logs/spec-random-vectors.log. No new native execution was performed.
- Expanded C-4/C-6 with active DOCUMENT behavior, account classification,
  commissioning, standings records, eligibility/ranking, duplicate checks,
  persistence ordering and honor-roll fields. The eligibility gate is elapsed
  time >=1000 ms, not score; equal scores favor longer incoming missions; the
  honor credit addition is octal 500 (decimal 320). The selected source inserts
  dead missions in principal lists despite retaining memorial-list output.
  Recorded U-C-STATISTICS for failed/partial storage and U-C-DOCUMENT for the
  compiler-dependent continued-literal whitespace; no silent corrections.
- Added 25 scenarios, now 90 source-derived cases. Extended the document builder's
  scenario-ID recognizer to include variant-qualified IDs (EX-C-STAT-...). It now
  verifies their actual Pandoc table rows rather than silently omitting them.
- Validation passed: book build (14 chapters/appendices, 306 local links, 324
  exact named Austin fragments, 90 scenario rows), typecheck, immutable-source
  audit and whitespace checks. Command output is in logs/spec-build.log,
  logs/spec-typecheck.log and logs/spec-audit-check.log. Rendered the expanded
  PDF and inspected contact sheets plus full-size notification, random-vector
  and standings pages; logs/spec-final-render.log records rendering. Generated
  PDF/HTML/LaTeX remain ignored local outputs.
- Goal remains active. Remaining work includes other inline/output assembly,
  finite arithmetic/compiler boundaries, fuller adversarial interactions,
  CompuServe TELL and synchronization/alias amendments, and persistence failures.
  This checkpoint does not establish full native or implementation conformance.

### 2026-09-05 — Specification radio, CompuServe speech and exclusion

- Prior goal turn classified as progress: 9ab39bc published combat output,
  randomness and standings. Rechecked the clean worktree before continuing.
- Added TERM-13/14: exact Austin Romulan phrase choices/draw order, radio/TELL
  diagnostics, delivered message headings/markers and body line endings. Recorded
  the retained-body output after no-match retrieval. Added U-ROM-GAG for BITS(0),
  which aliases the final roster-marker word when sender code is 500; the exact
  gag mask still requires compiled character-padding evidence.
- Expanded C-8 with present/absent/repeated ROMULAN recipients, direct reply
  ordering, asymmetric relocation search, autonomous diagnostic suppression and
  generic direct-reply text choices. Removed the earlier unsupported suggestion
  of a duplicate label after reading the selected TELL file directly.
- Derived the retained 18-bit CompuServe speech masks and their ten-player
  consequences from ROMSPK, TELL, MAKMSG and both HISEG declarations. Bits 11–18
  survive filtering and increment hit flags 1–8 through adjacent flag storage;
  the specification expresses this as abstract state changes. Node-derived reply
  qualifiers remain U-C-NODE; no generic host location was invented.
- Added C-10 exclusion keys, three-cell board groups, six-bit world namespace,
  local key registration/release, active wait-time release/reacquisition and
  movement's charge-before-lock/no-recheck/tow-after-release sequence. The busy
  timeout jumps back to error dispatch after its control test was commented out;
  it does not ordinarily reach the retained failed-return path. Delayed-grant,
  retained-register and trap behavior is U-C-LOCK, not a claimed working timeout.
- Added C-11: 400-entry assembly hit service, message-reservation retry and ASCIL's
  added CR/LF. Austin's distinct capacity, failed-reservation return and macro
  expansion remain core rules.
- Added sixteen source-derived scenarios, bringing the total to 106. Cases
  include speech masks/flag aliases, duplicate replies, relocation order, lock
  namespace collisions, two preselected moves overwriting one destination,
  stale-body output and exact radio heading bytes. None is a native test run.
- Validation passed: 14 chapters/appendices, 337 local links, 324 named Austin
  fragments, 106 parsed scenario rows, source audit and whitespace checks.
  Logs: logs/spec-build.log, logs/spec-check.log, logs/spec-audit-check.log.
  A clause-reference review found and corrected GAME-SNOVA to GAME-NOVA;
  the reviewed identifier scan has no unmatched references. Initial candidate
  output and final results are preserved in logs/spec-clause-reference-review-*
  and logs/spec-clause-reference-review.log; example-ID substrings were excluded
  from clause matching. This textual scan is not semantic completeness evidence.
- Rendered the expanded 87-page PDF and inspected contact sheets and full-size
  speech, radio, scenario and exclusion pages (logs/spec-radio-render.log).
  The final clause-name correction was rendered separately. No runtime, source
  archive, native state or server changes. Goal remains active: remaining report
  output, numeric/compiler boundaries, persistence failures, node text, other
  aliases and deeper conformance work still require review.

### 2026-09-05 — Specification reports and exact PDF spacing

- Prior goal turn classified as progress: b89f5ac published radio output,
  CompuServe speech and exclusion rules. Continued the active specification goal.
- Added TERM-15–18 from Austin DECWAR.FOR STATUS, DAMAGE, TIME and USERS plus
  WARMAC's field/identity/duration primitives. Defined default field order,
  prefixes, widths, trailing spaces and line endings; selected zero/negative
  device damage; radio-damage precedence; six identity fields in every mode;
  separate clock sampling and the arithmetic two-character duration formatter.
  Recorded STATUS's synthetic-token replacement without changing its retained
  token count, numeric values or raw-input positions. C-2 now explicitly places
  the CompuServe USERS divider before slot 6 instead of Austin slot 10.
- Added TERM-19–21 from LSTOBJ, LSTSUM and LSTOUT: exact detail and summary rows,
  grouping/order, range-text precedence, discovery updates, caller counter
  resets and separate target totals. Kept source counters rather than replacing
  the Romulan count with a semantic singleton. Valid-object recipes do not
  claim consistent world snapshots or repair concurrently invalid records.
- Added U-LIST-OUTPUT for selected output paths that are not established:
  zero-valued indirect diagnostic text, noncombat object kinds falling through
  to the Romulan row body with retained flags, and concurrent invalid planet
  types. The argument address check in OUT does not guarantee that a zero
  indirect message value emits an empty string.
- Added nineteen source-derived report scenarios (125 total), including exact
  STATUS/DAMAGES/TIME/USERS bytes, 100-hour duration output, LIST field padding,
  summary counter reset, Romulan count versus target total, and discovery effects.
  These are source derivations; no native comparison was claimed or executed.
- Initial PDF build rejected three overflowing STATUS table labels. Preserved
  the diagnostics in logs/spec-reports-build-initial.log and
  logs/spec-reports-layout-initial.log, then split the prefix and value tables.
- Visual review found that the builder's long-inline-code LaTeX override
  collapsed repeated spaces. Replaced ordinary spaces in that override with
  explicit fixed-width spaces and legal wrap points. Canonical Markdown/HTML
  text is unchanged. Widened the conformance expected-result column to balance
  it with conditions. Documented presentation wrapping in docs/spec/BUILD.md.
- Verified the spacing fix against actual PDF glyph positions: EX-LIST-04's
  five-space gap measured 26.1518 pt at 5.2304 pt per monospaced character,
  exactly five spaces. Evidence is logs/spec-reports-spacing-check.log and
  tmp/pdfs/spec-reports/spacing-bbox.html. Rendered and inspected report tables,
  scenarios and representative earlier scenario pages; final book is 92 pages.
- Validation passed: 14 chapters/appendices, 369 local links, 324 named fragments,
  125 parsed scenario rows, source audit, TypeScript typecheck and whitespace.
  Clause scan: 146 defined identifiers, zero unmatched references. Logs include
  logs/spec-build.log, logs/spec-check.log, logs/spec-audit-check.log,
  logs/spec-reports-typecheck.log, logs/spec-clause-reference-review.log and
  logs/spec-reports-spacing-render.log. No gameplay tests were needed for these
  documentation/build changes; no runtime, archives, native state or servers changed.
- Goal remains active. Remaining work includes command/selection diagnostics,
  finite arithmetic and compiler evaluation, unresolved aliases and host
  boundaries, persistence failures, node-derived speech and deeper conformance.

### 2026-09-05 — Compiled tokenizer evidence and LIST diagnostics

- Prior goal turn classified as progress: 18d192f published report output and
  the PDF spacing correction. Verified a clean worktree before this review.
- Added a read-only preserved-image inspector, tools/spec/inspect-reference.ts.
  It checks the EXE against artifacts.json, decodes the documented BACK10
  representation and this image's directory/end block forms, and prints encoded
  words/fields by octal address or SIXBIT marker. It neither interprets game
  commands nor executes/connects to the running reference. Consulted only the
  existing authorized full-repository loader for its file-directory format.
- Corroborated NXTT/ANUM source operations against the pinned compiled image.
  GTKN's address agrees with the LINK map; ANUM at octal 460603 contains
  515340204500, which sets X3 to octal 204500000000 (decimal 17800626176).
  NXTT's decrement/deposit sequence and seven-bit pointer are present at the
  recorded addresses. Reproduction commands and words are in the evidence
  appendix; logs/spec-reference-{gtkn,nxtt,anum,out}.log retain the inspections.
- Resolved U-REAL-TOKEN for ordinary acquired lines with new LEX-8. Each token's
  own text retains its first five transformed characters, but the accepted
  decimal point resumes/continues deposits into later text and earlier numeric
  fields. Defined abstract bit replacement, preservation of unselected bits,
  subsequent token/sentinel overwrites and unchanged categories. Derived the
  ordinary-line bound: no spill beyond numeric field 12. Floating arithmetic
  faults and interpretation of overwritten REAL values remain U-NUMERIC.
- Reviewed the already cached Processor Reference Manual's byte operations,
  printed pp. 2-87–2-89 / PDF145–147, including rendered pages145/147. Updated
  docs/platform-manuals.md. No external DECWAR material or downloads were used.
- Added TERM-22 for LIST-family parser guards, stored-keyword diagnostics,
  invalid coordinates, range rejection and named-object availability messages.
  Documented that later parser failure suppresses final grouped rows but keeps
  already emitted immediate output. No-matching-group indirect text remains
  U-LIST-OUTPUT. Clarified the coordinate conflict wording in GRAM-11.
- Added nine source-derived scenarios (134 total): three tokenizer cases and
  six LIST parsing/partial-output cases. Long decimal cases use an alphabetic
  suffix to avoid fractional-digit arithmetic. Arithmetic field replacements
  and the maximum spill bound were independently calculated and recorded in
  logs/spec-token-spill-derivation.log; these are not native executions.
- Validation passed: 14 chapters/appendices, 389 local links, 324 named fragments,
  134 scenario rows, immutable-source audit, typecheck and whitespace. Identifier
  review found 150 definitions and zero unmatched references. An initial wrong
  grammar anchor was rejected, preserved in logs/spec-token-check-initial.log,
  and corrected before final build. Other logs: logs/spec-build.log,
  logs/spec-check.log, logs/spec-audit-check.log, logs/spec-token-typecheck.log
  and logs/spec-clause-reference-review.log.
- Rendered and inspected new lexical, diagnostic, scenario and compiled-evidence
  pages. Reordered the evidence table to give explanations adequate width.
  Final document has 97 pages; logs/spec-token-render.log and
  logs/spec-token-final-render.log record rendering. No gameplay, archive,
  native-state or server changes; no gameplay tests were warranted.
- Goal remains active. The inspector provides a concrete next route for checking
  compiler evaluation and retained values against this build. Remaining source
  output, finite arithmetic, host/alias boundaries, CompuServe persistence and
  deeper conformance still need review.

## 2026-09-05 — Specify behavior; retain implementation analysis separately

- Clarified the publication boundary: legacy source and the preserved executable
  remain the strongest evidence, while the book defines syntax and meaning.
  Excluded evidence.md from the book manifest and added implementation-notes.md
  as companion research. Preserved the instruction/address tables, storage
  derivations and unresolved implementation questions there rather than deleting
  their evidence. README, PLAN and BUILD record this distinction.
- Recast decimal token interactions as an arithmetic transformation of the
  returned token values, without prescribing storage. Recast Romulan gagging,
  exclusion classes, message limits, output edge limits and unresolved questions
  as observable behavior. Further clause review remains part of the active goal.
- Established nine Austin conditional random-call sites using the preserved,
  hash-verified executable: three DIST comparisons, neutral activation, Romulan
  appearance, supernova neighbor selection, shared critical and base-destruction
  conditions, and post-torpedo Romulan displacement. Their effects are RNG-5;
  instruction evidence remains in the companion research record. CompuServe
  evaluation remains separately unresolved.
- Established Austin's Romulan gag behavior: gagging Trenton or Hawk suppresses
  its messages; gagging Wolf alone does not. Compiled OUTMSG indexing and the
  final roster marker establish the result; they do not establish CompuServe's
  corresponding mask. Added eleven derived examples, for 145 total. These are
  not native transcript comparisons.
- Built and checked the 93-page document: 13 included chapters/appendices,
  393 local links and 324 named fragments. Source audit passed. Rendered pages
  6, 10, 11, 58, 75, 76, 92 and 93; visually reviewed changed lexical rules,
  radio rules, examples and limits. Compiled listings are absent from the book.
- Compared the new decimal transformation with the former deposition derivation
  in 952 bounded cases. An initial assertion wrongly included self-deposits;
  final token assignment erases those, and the corrected comparison checks final
  numeric observations. An initially incorrect radio-clause link was also caught
  and corrected before the successful build. Logs: spec-pure-semantics-check.log,
  spec-pure-semantics-build.log, spec-pure-semantics-audit.log and
  spec-pure-semantics-review.log under logs/.
- Specification goal remains active. Finite numeric domains, remaining behavioral
  edge cases, variant details and conformance coverage still require review.

## 2026-09-05 — Restore immediate ESC delivery through Telnet

- Investigated the reported ESC behavior against Austin WARMAC INLI./NXCH.
  First-character ESC itself repeats the acquired line; no Enter is required.
  Added an isolated Austin socket regression which passed before transport edits,
  demonstrating that the game handler already worked when byte 27 arrived.
- Reproduced the defect with the installed Homebrew Telnet client in a PTY:
  the old adapter refused character-mode negotiation and the client retained ESC
  until Enter. Corrected the explanation to distinguish this adapter limitation
  from original behavior. An SGA-only experiment exposed changed Enter/echo
  behavior; the final correction treats character delivery, echo and Enter
  together. Existing running galaxies were untouched during these probes.
- Added SUPPRESS-GO-AHEAD/ECHO offers and bounded negotiation. Echo occurs only
  after acknowledgement and as input is consumed; source ECHOFF can suppress it.
  Added an explicit keyboard endpoint mapping CR, CR-NUL and CRLF to one LF,
  preserving the standalone codec's literal NVT default. The source editor,
  repeat handler, gameplay rules and archives remain unchanged. D-172 records
  the modern binding, tested behavior and remaining terminal fidelity limits.
- Verified an actual Telnet session in a disposable Austin world: admission,
  STATUS, two standalone ESC repeats without Enter, backspace, Ctrl-U, Ctrl-R,
  later ESC termination, BUILD/Ctrl-C cancellation, continued STATUS and QUIT.
  The probe was then shut down. Captured later actions and labeled earlier
  observations are in logs/escape-real-client-check.json; this is not a native
  PDP-10 transcript.
- Validation: npm run check passed audit, typecheck and all 4565 tests. After
  adding the source echo-suppression guard, all 31 focused transport/session tests
  and typecheck passed. Relevant logs: escape-full-check.log,
  escape-character-mode-final.log and escape-character-mode-typecheck-final.log.
  Initial localhost sandbox denials and unsupported TypeScript parameter-property
  syntax were resolved; failed logs were retained. No auto-review rejection.
- User explicitly approved restarting Austin on 2324 despite its active player.
  Verified the old process identity, stopped it gracefully, waited for its data
  lock release and restarted with the same data/log settings. Verified character
  and echo offers plus the original banner/name prompt without commissioning a
  ship; the probe exited normally. logs/escape-restart-check.log and
  logs/austin-live-host.log record this. Port 2323 was not restarted or changed.
- Updated running/status guidance. Immediate ESC is now available on the restarted
  Austin listener; the specification goal continues independently.

## 2026-09-05 — Restructure around grammar and abstract game semantics

- The user clarified that removing machine names was insufficient: the book
  must be a language specification, with grammar, named abstract state and
  command semantics, not a low-level compatibility audit. Pseudocode is explicitly
  welcome. Updated PLAN with a structural rewrite, keeping source analysis as
  companion research and preserving rather than discarding established behavior.
- Added language-model.md with records, enumerations, quantities in game units,
  identities, positions, ships, radio settings and messages. Added commands.md
  with grammar plus readable SHIELDS/RADIO state transitions and examples.
  These staged chapters are not yet substituted for the older quanta-based
  book; README explicitly marks the structural revision and incomplete conversion.
  SHIELDS TRANSFER and the rest of the command/world model still need conversion.
- Moved CompuServe autonomous-speech mask/flag derivation into research notes.
  Its variant clause now describes the real player audiences. Added U-C-SPEECH
  for additional delivery effects that still need a player-visible formulation;
  no packed fields or nonexistent player identities are invented as game entities.
- Consulted GraphQL, ECMAScript algorithm conventions and WebDriver solely as
  examples of specification form, after the user asked for an analogue. No game
  facts or alternate DECWAR implementation were obtained externally. Recorded
  the structural references in PLAN. Grammar plus syntax-directed abstract
  operations and readable pseudocode are the intended approach.
- Existing book structural check passed: 145 scenarios, 13 included sections,
  393 local links and 324 fragments. This validates the transitional document,
  not completion of its rewrite. Log: logs/spec-language-restructure-check.log.
  No game code, server state or source archive changed in this documentation pass.

## 2026-09-05 — Generalized language, ordinary arithmetic and nine commands

- The user explicitly removed PDP-10 integer quirks from the specification's
  target, accepting small numerical differences while forbidding invented syntax
  or game semantics. Recorded the distinction in AGENTS.md, PLAN and the separate
  NORMALIZATION.md policy. This does not change the running port's fidelity
  requirements or authorize a gameplay rewrite.
- Replaced the book manifest's operational/source-analysis chapters with the
  abstract model, lexical/grammar clauses, command semantics, turn accounting,
  normalized examples and initial CompuServe appendix. The earlier 93-page
  source-analysis PDF was retained locally as decwar-source-analysis-draft.pdf;
  its canonical chapters remain available as explicitly labeled research outside
  the new book. The preceding staged-chapter log entry describes an earlier
  intermediate state; the new chapters are now included.
- Converted SHIELDS, RADIO, ENERGY, DOCK, REPAIR, SCAN, SRSCAN, STATUS and DAMAGES
  to grammar plus abstract game-state effects. Directly reviewed Austin's cited
  routines. Energy and damage use game units, shield strength uses percentage
  points, and elapsed time uses milliseconds. Shield transfer retains fractions;
  ship-to-ship transfer uses the 90% delivery rate and capacity-limited charge
  without integer conversion artifacts. Kept game rules such as charging for
  raising already-raised shields, double hull repair when already docked, and
  scan discovery within ten sectors even outside the displayed rectangle.
- Added ordinary records/enums for ships, installations, world, radio, knowledge,
  the 18-ship Austin roster and coordinates. Shared turn rules cover automatic
  repair, accounting, life support and existing pacing formulas. Effective-speed
  selection during admission remains explicitly pending: direct source review
  ruled out assuming that it simply equals the latest captain's speed.
- Removed STATUS's token-mutation description from the language chapter and
  retained its derivation in research. Decimal token values are independent.
  Packed recipient masks and cross-field effects are not generalized-language
  requirements. Kept discrete grammar values, torpedo counts and whole-sector
  bounds; numerical normalization does not invent new argument spellings.
- Added language-coverage.md to distinguish nine converted commands and their
  explicit dependencies from the older 33-command research inventory. Twenty-four
  main commands, full pregame/session behavior, combat/world rules, concurrency,
  complete responses and remaining variant changes still need conversion. The
  specification goal remains active; this is a reviewed checkpoint, not completion.
- Publication checks: final single PDF is 33 pages; Markdown, HTML and LaTeX
  built successfully. Validated eight included sections, 111 local links, 28
  scenario rows and the unchanged 324-fragment source catalogue. Scenario-row
  validation is structural, not execution against a native implementation.
  Logs: logs/spec-generalized-final.log and the preceding build logs. An initial
  conformance-ID duplication and an overfull inline field were corrected.
- Improved example-table proportions and kept short pseudocode blocks together
  after rendered review caught a split repair procedure. Reviewed the final
  repair, conformance and variant pages; also inspected title, model, shield
  transfer and turn-accounting pages during layout review. Images and extraction
  are in tmp/pdfs/spec-generalized/ and tmp/pdfs/spec-generalized.txt. Final TeX
  checks report no overfull boxes, missing characters or undefined references.
- Typecheck and immutable-source/generated-data audit passed; git diff --check
  passed. Logs: logs/spec-generalized-typecheck-final.log and
  logs/spec-generalized-audit.log. No game code, archived source, listener or
  active galaxy was changed. Generated PDFs and build products remain ignored.

## 2026-09-05 — Movement, construction, capture and phaser semantics

- Previous goal turn was progress: commit 3bb3494 published the generalized
  model and nine rewritten command clauses. Revalidated a clean main worktree
  before continuing. The full specification goal remains active.
- Added six command entries: TRACTOR, MOVE, IMPULSE, BUILD, CAPTURE and PHASERS.
  The book now has clauses for 15 of 33 main-game commands; 18 remain. Expanded
  language-coverage.md with the new clauses and their specific unfinished
  dependencies rather than claiming complete end-to-end command conformance.
- Read the Austin routines directly. Added shared path geometry, tractor
  associations, phaser damage and critical hits, Romulan weapon damage, score
  units, installation removal and world-end conditions in world-rules.md.
  Added beam/score/Romulan records and weapon readiness to the abstract model.
  Renamed knowledge's base set to knownBases so construction can transfer
  discovery for either faction without an incorrectly enemy-only type.
- Verified that POINTS renders stored scores through OFLT. The generalized unit
  is the displayed point: capture 100, ship destruction 500, full five-stage base
  construction 1000. Shared phaser damage uses the same numerical quantity in
  damage units and damage-score points. This is unit conversion, not a rebalance.
- Preserved gameplay consequences: movement charges intended distance despite
  obstructions; range failures after coordinate acceptance retain green/undocked
  state; overheating continues the action; the fifth build's late availability
  failures retain already-added pending score; capture precedes the defensive
  shot and is not rolled back by the captor's death; phaser target validation
  precedes the bank wait, while explicit strength validation follows it.
- Recorded numerical/representation normalization explicitly. Path proximity
  uses the mathematical fractional coordinate instead of rounding it to
  hundredths first. Towing uses one consistent position based on the committed
  coordinate formula; occupied/out-of-bounds trailing sectors remain unresolved.
  Existing TRACTOR OFF uses the acting endpoint and the source release operation,
  without requiring an invalid omitted-argument access. The book contains no
  packed beam/board representation or native generator algorithm.
- Random choices are explicit semantic inputs. Full probability/reproducibility
  requirements, crowded towing, shared planet-update availability, complete
  concurrency, lifecycle, notification rendering, and remaining commands/world
  rules are still unfinished. No permission was inferred to add new syntax,
  weapons or collision repairs.
- Added 15 examples, for 43 total. Independently compared normalized phaser,
  shield/base reduction, Romulan and scoring formulas with exact rational forms
  of the source expressions: 677 checks passed. This excludes the deliberately
  removed machine truncation, and is not native execution or probability testing.
  Record: logs/spec-movement-numeric-review.json.
- Final book build passed: nine included sections, 139 local links, 43 scenario
  rows and 324 unchanged source fragments. The PDF has 47 pages. Reviewed rendered
  construction, capture, path, base-damage and conformance pages, with no clipping
  or split algorithms; final TeX layout/reference checks passed. Logs:
  logs/spec-movement-combat-build.log and logs/spec-movement-combat-final.log.
  Review images: tmp/pdfs/spec-movement-combat/. git diff --check passed.
- This was documentation-only: no game code, transport, archived source or live
  server changed. The previous source audit/typecheck remains applicable because
  neither audited data nor build code changed in this round.
- 2026-09-05 — Generalized specification: torpedoes, novas and installation defense.
  - Added TORPEDOS grammar, continuation and validation rules, burst order,
    deflection, misfires, ammunition, target effects and reload/turn semantics.
    Own-location input completes a turn without launching; an out-of-range
    target does not. A misfired shot still travels, and docked inventory checks
    still precede consumption exemption. Source: DECWAR.FOR TORP 4228–4431.
  - Added torpedo ship/base damage, displacement into empty sectors or black
    holes, stellar chain order, ship/base/planet/Romulan nova effects, faction
    versus captain scoring, base/planet defenses and base replenishment.
    Sources: JUMP 1283, TORDAM/PHADAM 4089, NOVA 2259, SNOVA 3807,
    BASBLD/BASPHA 317/375, PLNATK 2800. Refined weapon-base destruction's
    docking re-evaluation order from the source instead of silently changing it.
  - Ordinary mathematical damage, percentages, halving and divided defense
    strengths retain fractions. The whole-sector torpedo-length choice is
    expressed as four intervals. Preserved SNOVA's explicit 29-pending-star
    limit as an observable explosion rule, without requiring a memory structure.
    Rationale and derivations are in docs/spec/NORMALIZATION.md.
  - Added 17 semantic examples (60 total). Conversion coverage is now 16 of
    33 main commands; remaining command, pregame, lifecycle, interleaving,
    randomness, output and variant work keeps the full goal active. Incomplete
    torpedo pairs/empty continuation and some shared-update cases remain explicit
    review items rather than invented target values or atomicity guarantees.
  - Exact-rational formula review passed 8904 checks: 8001 sampled torpedo
    path-length choices and 903 damage, strength, severity, defense and example
    comparisons. The first scratch calculation accidentally mixed a Python
    integer constant with division and produced a float comparison failure;
    using Fraction throughout fixed the review script. No game formula changed
    as a result. Reproducible local script and results:
    logs/spec-torpedo-numeric-review.py and .json. These checks exclude deliberate
    historical truncation removal and do not establish native execution parity,
    random-generator distributions or full conformance.
  - Initial publication failed on unsupported prose comparison glyphs and
    overlong inline formulas. Rephrased/wrapped those passages; the final build
    passed all layout/reference checks, 148 links, 60 scenario rows and 324
    source message fragments. The compiled PDF has 56 pages. Visually reviewed
    physical pages 37, 38, 41, 44, 45, 48, 49 and 54 after the successful build.
    Logs: logs/spec-torpedo-nova-build.log (retained failure) and
    logs/spec-torpedo-nova-final.log. Images: tmp/pdfs/spec-torpedo-nova/.
    npm run audit:check and git diff --check also passed; source audit log:
    logs/spec-torpedo-source-audit.log.
  - Documentation only. No running game, transport, legacy archive, generated
    source data or build tool changed. No server restart was performed.
- 2026-09-05 — Generalized specification: galaxy, score and session reports.
  - Added clauses for LIST, SUMMARY, BASES, PLANETS, TARGETS, POINTS, TYPE,
    TIME and USERS. Main-command conversion is now 25 of 33; the remaining
    eight command families and broader lifecycle, world, multiplayer, presentation
    and CompuServe work keep the goal active. No completion claim is inferred
    from the older source inventory or the publication checks.
  - Galaxy reports use ordered selection groups, abstract affiliations and
    identities, explicit visibility, immediate/deferred report ordering, closest
    tie-breaking, summary counts and discovery effects. A whole-game summary can
    count an unknown installation without revealing its location. Deferred
    installation detail can discover it; immediate coordinate/CLOSEST detail
    does not. Remote friendly detail, remote known planet builds and concealed
    enemy-ship coordinates follow the source. Exact-coordinate BASES can report
    a ship because that path does not apply the base-kind restriction to ships.
    Sources: DECWAR.FOR 1359–1400 and 1519–2140; PARAM.FOR selector definitions.
  - Retained repeated Romulan-group summary multiplicity as an observable
    selection count, without requiring packed masks or formatter-mutated shared
    counters. Mixed selector/name-duplicate edge cases and full label aggregation
    remain explicit review items. These are not silently repaired into a more
    permissive unordered query syntax.
  - POINTS reads committed scores, ordered selected columns, nonzero categories,
    cumulative commission counts and per-commission/per-turn ratios. Fractions
    are retained; zero-denominator presentation is still unresolved. TYPE observes
    preferences and selected galaxy options. TIME distinguishes elapsed time from
    environment-supplied execution accounting. USERS retains its six report fields
    and privileged-only locations using abstract session metadata.
    Sources: DECWAR.FOR 2893–3052, 4066–4084, 4540–4629; WARMAC.MAC 2187–2251.
  - Recorded the abstract report/metadata model and pregame TYPE's normalization
    away from its omitted control-argument read in NORMALIZATION.md. Updated
    language-model.md and language-coverage.md. No new report switch, targeting
    syntax, sensor range or score rate was introduced.
  - Added 31 source-reviewed examples, 91 total, covering visibility, discovery,
    direct queries, repeated groups, error order, scoring and session reports.
    Publication checked 160 links, 91 scenario rows and 324 source fragments.
    These are documentation checks and reviewed cases, not executable conformance
    tests or original-system differential evidence.
  - Final PDF is 64 pages. Replaced a cramped three-column defaults table with
    a two-column table after visual review. Final layout/reference checks passed;
    inspected final physical pages 39, 40, 42, 43, 44, 62 and 63. Logs:
    logs/spec-reports-build.log, logs/spec-reports-final.log and
    logs/spec-reports-publication.log. Images: tmp/pdfs/spec-reports/final-*.png.
    npm run audit:check passed (logs/spec-reports-source-audit.log), as did
    git diff --check. Source and generated-data checks remain unchanged.
  - Documentation-only checkpoint; no game code, build tool, legacy source,
    running galaxy or transport behavior changed. No server restart.


- 2026-09-05 — Game-state ADT contracts, captain preferences and communication.
  - Responded to the request for operations on an ADT by defining GameState,
    read-only queries, operation contracts and before/after event notation in
    language-model.md. Records expose semantic properties rather than storage.
    Updated PLAN.md to require this form for the existing command drafts too;
    conversion is incomplete, and a signature alone is not a finished contract.
  - Replaced CAPTURE's procedural ownership/update sequence with a Capture
    operation: typed outcomes, ordered preconditions, ownership/build/energy
    postconditions, a subsequent defensive attack, scoring, reports and timing.
    Preserved 50 energy/build, strength 50+30*builds, 100 capture points,
    former-owner defense credit, entry-based five seconds plus one second/build,
    and successful capture despite fatal defense. Removed lock and board-update
    mechanisms from the core. Surrender-refusal conditions and former-faction
    docking remain explicit dependencies; no random refusal rule was invented.
    Sources: DECWAR.FOR CAPTUR 600–698, BASKIL 339, PHADAM 4166, main turn 223–252.
  - Completed the pending SET, TELL, *PASSWORD and *DEBUG command drafts.
    SET retains its actual switch grammar, preference choices, terminal matching,
    twelve-character name limit and privileged options. TELL retains recipient
    precedence, group ambiguity, damage/commission/radio filtering, sender ungag
    effects, body acquisition, 75-character retention and cancellation effects.
    Password and diagnostic behavior remain source-derived; instrumentation and
    lifecycle bindings are still open. Sources: DECWAR.FOR 2626, 3624–3738,
    3977–4065; SETUP.FOR 358; WARMAC.MAC 2963–3100, 3415–3457 and DEBUG.
  - Added communication.md to the book with PublishMessage and ReceiveMessage
    operation contracts: message identity, immutable original audience, per-ship
    consumption, publication order, capacity 32 and recipient-backlog loss,
    delivery-time gagging and autonomous speech choices. Concurrency admission
    and Romulan speech's effect on the triggering captain remain explicit review
    items. Source: WARMAC.MAC 2589–2771, 2963–3100, 4672 onward; DECWAR.FOR OUTMSG
    2599 and TELL 3977. No queue allocation or linked-list algorithm is prescribed.
  - Recorded normalization of pregame name indexing, optional terminal profile,
    retained message-buffer replay, Romulan sender identity and pre-reservation
    Ctrl-C cleanup in NORMALIZATION.md. These are specification decisions only;
    no runtime repair or legacy source edit was made.
  - Coverage now records 29/33 main-game command clauses. GRIPE, HELP, NEWS and
    QUIT remain, as do full sessions, world evolution, randomness, interleavings,
    terminal presentation and variant amendments. Removed the stale fifteen-
    command claim from the book introduction in favor of the coverage record.
  - Added 26 source-reviewed semantic examples (117 total), including capture
    postconditions/deadline/refusal, preferences, password, messaging, delivery,
    capacity pressure and cancellation. These are reviewed specification cases,
    not executable conformance tests or native differential observations.
  - Initial build caught a blank line splitting the conformance table; fixed it
    and retained logs/spec-adt-communication-build.log. Final build passed:
    10 included sections, 180 local links, 117 parsed example rows and 324 source
    message fragments (logs/spec-adt-communication-final.log). The assembled
    PDF is 73 pages. Inspected physical pages 7, 35, 36, 48, 63, 64, 70 and 72;
    renders in tmp/pdfs/spec-adt/page-*.png. No layout defects found in those pages.
  - npm run audit:check passed (logs/spec-adt-source-audit.log): 135 hashes,
    83 declarations, 33 main-game and 16 pregame slots, 324 strings; preserved
    Austin 18 ships/20 planets and CompuServe 10 ships/60 planets. git diff --check
    passed. No gameplay tests required for this documentation-only checkpoint.
    No game code, source archive, server or running galaxy changed.

- 2026-09-05 — Started an isolated automated-player experiment.
  - New request authorizes planning and implementation under a separate
    experimental folder. Added experimental/automated-player with PLAN.md,
    operating instructions, a client-side Telnet codec, bounded Austin login
    and command dialogue, strict STATUS/friendly BASES parsers, a pure resupply
    policy, CLI, JSONL transcripts and isolated tests. Updated docs/status.md.
    No production runtime, archive, generated catalog or root build/test
    configuration changed. Existing running galaxies were not contacted.
  - Runnable milestone: an external captain can join a fresh or existing Austin
    experimental galaxy, read ordinary reports, approach a friendly base one
    sector at a time, decide to dock when adjacent, and quit on completion,
    unsupported danger, repeated movement failure or a configured action limit.
    It receives no game-memory access. Live docking success remains unverified;
    its selection is unit tested. This is a baseline, not a competitive player.
  - Source boundaries: Austin DECWAR.FOR STATUS:3860–3991,
    PRLOC/PROMPT:3078–3131, LSTOBJ:2083–2140, MOVE:2141 onward and DOCK:893
    onward; MSG.MAC:292–306, SETMSG.MAC:17–43, WARMAC.MAC ODISP:1959–2032.
    Telnet negotiation is a modern client boundary. Parsed numbers are displayed
    player quantities; no PDP-10 arithmetic implementation was replaced.
  - Incorporated the subsequent direction to develop tactics like skills but
    internalize them in code for frequent play. The plan defines prerequisites,
    observations/memory, action/reason and complete/blocked outcomes as capability
    contracts. AI assists transcript analysis and tactic development; the runner
    makes no model calls. Next: parse scans/warnings and device damage, add
    obstacle/threat-aware routing, then validate replenishment before combat.
  - Initial typecheck caught the Node socket event's string-or-buffer type;
    added a byte-input guard. Retained logs/automated-player-typecheck-initial.log.
    Initial tests passed all 9 pure tests but localhost binds were sandbox denied
    (logs/automated-player-tests-initial.log). Reran with localhost permission;
    all 13 experiment tests passed (logs/automated-player-tests-live-1.log).
    The first live baseline made four moves and stopped on red condition.
    Its terminal evidence is logs/automated-player-live-1788654956738/.
  - Final tests also exercise occupied-ship timeout without disrupting its
    owner, both factions, ship reuse and the real command-line entry point.
    node --test experimental/automated-player/test/*.test.ts
    test/austin-telnet.test.ts test/telnet.test.ts passed 20/20, including the
    existing eighteen-captain regression. Output:
    logs/automated-player-tests-final.log. Final live transcripts and separate
    host/CLI logs: logs/automated-player-live-1788655094318/.
    That resupply run made twelve moves, encountered red condition and recorded
    outcome=blocked, then quit normally. A separate one-action CLI run passed.
    Both temporary test hosts were shut down and their temporary data removed.
  - node_modules/.bin/tsc --noEmit -p
    experimental/automated-player/tsconfig.json and npm run typecheck passed:
    logs/automated-player-typecheck-final.log and
    logs/automated-player-root-typecheck.log. npm run audit:check passed:
    logs/automated-player-audit.log (135 hashes, 83 declarations, 33 main and
    16 pregame commands, 324 strings; both variant inventories preserved).
    Documentation/link and whitespace checks are recorded in
    logs/automated-player-documentation-check.log.
  - Limits: source-text prompt framing with a quiet interval is not a structured
    or adversarially robust protocol; unexpected continuations/death stop the
    connection. Scans are recorded but not interpreted; no hazard avoidance,
    device model, combat, team coordination or competitive evaluation exists
    yet. These are connected port tests, not native differential verification
    or a complete historical transcript. No parity claim is made.

- 2026-09-05 — Started a visible experimental run after the launch request.
  - Verified that the existing hosts were on 2323 and 2324 and that no host
    listened on 2423. Started the Austin playable host on localhost 2423 with
    data/automated-player-experiment and logs/automated-player-live-host.log.
    Left both existing hosts unchanged. The experimental host remains running.
  - Started the actual CLI as Scout/Federation/Yorktown, limited to 12 actions,
    with a 5000 ms pause between actions. Its terminal/decision transcript is
    logs/automated-player-live-scout.jsonl. Confirmed login and its first decision:
    move from observed 16-50 to 17-51 toward reported friendly base 25-55.
    The bot encountered red condition with shields reduced to 84% after that
    move, recorded outcome=blocked, and quit normally. The host stays up.
    This is a local run record, not permanent port/process documentation or
    evidence of competitive strength. No code or game rules changed.

- 2026-09-05 — Keep the experimental captain visible after its tactic stops.
  - Added opt-in --stay-connected: after the bounded resupply policy completes,
    is blocked, or reaches its action limit, the captain stays logged in and
    reads STATUS at intervals of at least five seconds. It does not resume
    unsafe movement or gain any protection from damage/death. SIGINT/SIGTERM
    requests normal QUIT/YES after the current dialogue; protocol failures
    retain fail-closed behavior. CLI now prints login, decisions and holding
    state. README, plan and status distinguish this from active tactics.
  - Extended the black-box live CLI test: after a one-action limit, a second
    captain's USERS report includes Pilot; SIGTERM completes normal quit and
    removes Pilot from that report. All 13 experiment tests passed in
    logs/automated-player-hold-tests.log. The same run also completed a resupply
    journey (three moves and DOCK, followed by parsed full supplies), closing
    the earlier single-journey live docking evidence gap. Transcripts:
    logs/automated-player-live-1788655639898/. This is not reliable-navigation
    or competitive-strength evidence.
  - Experiment typecheck and archive audit passed:
    logs/automated-player-hold-typecheck.log and
    logs/automated-player-hold-audit.log. No production game code changed.
  - Joined Scout in Nimitz to the existing interactive server on 2423 using
    --rounds 12 --interval-ms 2000 --stay-connected. It encountered two
    obstructed moves, then held at observed 6-71 with green condition.
    Evidence: logs/automated-player-present-scout.jsonl and
    logs/automated-player-live-host.log. The user confirmed seeing the bot in
    their game. Left that bot and host running; other games were untouched.

- 2026-09-05 — Functional experimental patrol captain (captain-v2).
  - Continued the requested work beyond the earlier idle baseline. Added strict
    fixed-width warning-scan and device-damage parsers, an observation-only map,
    expiring mobile sightings, temporary failed-step exclusions and A* routing.
    The next step must be freshly observed traversable space. Blank black-hole
    cells remain obstacles. Routes and refuge selection weigh source-visible
    installation/enemy risk; costs are bot policy, not recovered game formulas.
  - Added active patrol, resupply hysteresis, full replenishment, shield raising
    and conservative transfers, bounded device repairs and IMPULSE fallback.
    Freshly scanned enemy ships can be attacked with strength-180 phasers;
    shots retain a reserve and use conservative spacing while the server owns
    bank timing. No torpedo or planet-objective policy is claimed. Frozen v1
    policy remains available for comparison, while --mode patrol is the CLI
    default and --mode resupply finishes once restored.
  - Implemented exact-dialogue death recognition and reentry, including Austin's
    automatic reuse of the previous vessel. The player loop has a configurable
    life limit (default 3). Ctrl-C during active play records interruption.
    --stay-connected still means observation after the bounded run, not more
    tactical actions. Lost connections remain failures. Terminal text is now
    logged in consumed frames rather than individual network fragments; the
    full scan frame is retained without duplicating its parsed cells in every
    decision record. Updated README, PLAN.md and docs/status.md.
  - Source boundaries: Austin DECWAR.FOR STATUS:3860–3991, DAMAGE:783–836,
    PRLOC/PROMPT:3078–3131, LSTOBJ:2083–2140, MOVE:2141 onward, DOCK:893 onward,
    SHIELD:3739–3805 and PHACON:2647 onward; SETUP.FOR PREGAM/SETUP and automatic
    ship reuse; WARMAC.MAC ODISP and SETSCN/OBJTBL/SHWSCN:2350–2543. Source
    statements establish syntax, limits, displayed units and side effects.
    JavaScript arithmetic is only observation/policy arithmetic; all actual
    game commands use the existing runtime. No game implementation changed.
  - Added controlled, isolated Telnet scenarios. Only test code stages the map
    and ship conditions; the captain sees ordinary terminal observations. Tests
    verify a wall/gap detour and full docking restoration, actual phaser shield
    damage and the 380 displayed-energy charge, selection of a farther safer
    refuge with movement away from an enemy, critical repair then movement,
    source death/reentry and the player loop resuming after a lost ship.
  - Retained initial failures: unsupported TypeScript parameter properties
    (logs/automated-player-v2-typecheck-initial.log and -unit-initial.log), then
    a scan-row regex that consumed the padding on a single-digit row label
    (logs/automated-player-v2-unit-2.log). Explicit fields and exact two-character
    row labels resolved those issues; -unit-3.log and -unit-4.log passed.
  - Initial connected navigation/resupply passed in
    logs/automated-player-v2-live-1.log, with eleven actions ending in full
    restoration. Initial three scenarios passed in
    logs/automated-player-v2-scenarios-1.log. The stronger withdrawal/reentry
    checks exposed a closer base behind the opponent and automatic vessel reuse
    (logs/automated-player-v2-scenarios-2.log). Refuge scoring and the dialogue
    path were corrected; both regressions passed in
    logs/automated-player-v2-regressions-3.log.
  - Added soak.ts, which creates and later removes its own public-host process
    and temporary data, with two TCP-only captains. A 24-decision patrol each
    completed with no deaths or protocol errors; each captain visited 24 distinct
    positions. No combat occurred in that fresh-world run; combat evidence is
    from the controlled scenarios. Summary/transcripts:
    logs/automated-player-soak-1788656222705/ and
    logs/automated-player-v2-soak-1.log. This is an activity/robustness smoke test,
    not a benchmark against human players or a win-rate result.
  - Final suite: node --test experimental/automated-player/test/*.test.ts
    test/austin-telnet.test.ts test/telnet.test.ts passed 33/33, including the
    eighteen-captain transport regression and full player-loop death recovery.
    Output: logs/automated-player-v2-final-tests.log. Experiment and root strict
    typechecking passed: logs/automated-player-v2-final-typecheck.log and
    logs/automated-player-v2-root-typecheck.log. Archive/generated audit passed:
    logs/automated-player-v2-final-audit.log. Help/documentation/whitespace checks:
    logs/automated-player-v2-help.log and -documentation-check.log.
  - After verification, stopped only the old idle Scout client (normal quit),
    then joined captain-v2 as Scout/Nimitz on the existing 2423 host using
    --mode patrol --rounds 10000 --lives 3 --interval-ms 500 --stay-connected.
    The host and the user's Vulcan connection were not restarted. Confirmed a
    new active decision from observed 29-55 to 28-54. Live evidence is
    logs/automated-player-patrol-scout-v2.jsonl and
    logs/automated-player-live-host.log. Left the upgraded bot running.
  - Remaining limits: competitive benchmarking, long adversarial matches,
    torpedoes, planet objectives, teamwork, stale-sighting pursuit and richer
    action search. A heuristic retreat is not a guaranteed escape. Prompt-like
    hostile chat/extreme latency remain unverified. No native-executable parity
    or complete historical transcript claim is made. Existing source/spec edits
    outside the experiment were left untouched.


- 2026-09-05 — Information-command contracts and commission release.
  - Added ADT operation contracts for HELP, NEWS, GRIPE and QUIT. Every one of
    the 33 main-game commands now has a draft clause; this is not complete
    semantic, lifecycle or terminal coverage. Earlier command pseudocode still
    requires ADT-contract conversion, and pregame ACTIVATE/*ZAP remain.
  - HELP retains main-command-before-extra-topic resolution, privilege-filtered
    command lists, ambiguity handling, resource fallback only on open failure,
    and section-level stop behavior. A section clears its stop condition, so a
    later requested topic can still appear. Source: WARMAC.MAC 4134–4402 and
    DECWAR.FOR 471. The startup HELP dialogue is explicitly separate.
  - NEWS retains red-alert availability, supplied text, dot continuation markers
    and YES matching. Source review of GTKN established that a slash remainder
    such as NEWS / YES can answer a continuation. QUIT instead clears pending
    input and requires a fresh reply. Its exact prompt is sourced from MSG.MAC
    309. Sources: WARMAC.MAC 1384, 3811–3852; DECWAR.FOR 134–141, 290–311.
  - GRIPE preserves the 20-line input limit, warning after line 18, Ctrl-Z/empty
    input distinctions, cancellation, newest-first records, metadata and a
    three-second retry for a being-modified resource. Partial acquisition/write
    failures remain explicit binding questions; no atomic-persistence guarantee
    was invented. Sources: WARMAC.MAC 470, 2116–2180, 3858–4130.
  - Added session-rules.md: session phases/identities, temporary HELP/GRIPE
    sector behavior and ReleaseCommission. The temporary sector really is a
    black hole in ESHP., while the ship remains commissioned; the ADT preserves
    that observable state without encoding the board. It grants no blanket
    immunity. Concurrent movement/restoration remains open. Release describes
    absent active position, beam release, recipient notification cleanup,
    recent-commission history and five-minute empty-world retention.
    Sources: WARMAC.MAC 4379–4402; DECWAR.FOR 1082–1183, 1335–1353;
    SETUP.FOR 168–172; PARAM.FOR 30–32.
  - Recent history matches account plus execution identity, not name or terminal.
    Capacity ten retains insertion replacement order even when a match is
    updated. Austin's FORTRAN KWAIT is zero; the separate assembly constant
    does not introduce a two-minute reentry delay into this specification.
  - Added information.md with help/news content bindings and abstract feedback
    records. Preserved topic and news section boundaries, list order, seven
    ten-character terminal columns, feedback prepend order and header fields.
    Resource text is distinguished from claims about the current project's
    version. Complete header/terminal and storage failure bindings remain.
  - Recorded normalization of absent positions, ordinary retention durations,
    invalid feedback-header argument writes and final POINTS entry in
    NORMALIZATION.md. Final reporting uses the existing all-column selection;
    compiler-specific entry into an uninitialized loop is not required. Zero-
    denominator ratios remain unresolved. No gameplay or source changes.
  - Added 28 source-reviewed examples, 145 total. Build checks validate document
    structure and source links; these examples are not executable conformance
    tests or native differential evidence. The initial complete draft built;
    later builds detected a blank line splitting the appended example table.
    Fixed it and retained the failed logs. Final publication passed 12 included
    sections, 220 local links, 145 scenario rows and 324 source message fragments:
    logs/spec-information-session-release.log. Earlier logs use the
    spec-information-session-{build,final,publication,verified}.log names.
  - The final PDF has 83 pages. Inspected physical pages 50, 51, 52, 53, 68, 69,
    72 and 81, with final renders in tmp/pdfs/spec-information/final-*.png;
    no layout defects found in those pages. npm run audit:check passed:
    logs/spec-information-source-audit.log (135 hashes, 83 declarations,
    33 main-game/16 pregame slots, 324 strings, both variant inventories).
    git diff --check passed. No game code, legacy data, server or galaxy changed.
  - Unrelated automated-player work is present concurrently in experimental/,
    docs/status.md and another WORK_LOG.md entry. This checkpoint stages only
    specification files and this log entry, preserving that work separately.


- 2026-09-05 — Startup, admission and world-lifecycle contracts.
  - Expanded session-rules.md with StartSession, pregame Activate, AdmitCaptain,
    CreateGalaxy and CheckWorldEnd contracts. Defined startup HELP/PREGAME/empty
    handling, pregame diagnostics, participant-place reservation, faction balancing,
    recent-player preference/defection, ship choice, initialization and final
    world-end observations. Sources: SETUP.FOR 76–450, DECWAR.FOR 1–50,
    961–999 and 1184–1282. Full names, controls and concurrent transitions remain.
  - Distinguished simultaneous participant places from cumulative commission
    counts. Faction acceptance increments NUMSHP before ship choice; CC2 removes
    participant counts but leaves the cumulative increment. Updated POINTS to
    connect its denominator to this admission event. Sources: SETUP.FOR 1–28,
    264–353 and DECWAR.FOR 2893. No new scoring rate was introduced.
  - Verified initial preferences directly: medium output, normal prompt, long
    scan style and both-coordinate output; the initial input mode displays BOTH
    while LOCATE interprets unqualified locations relatively. SET ICDEF still
    accepts only ABSOLUTE/RELATIVE. Admission selects CRT. The commented experience
    dialogue is not part of Austin startup. Sources: DECWAR.FOR 1, 1423, 4560;
    LOWSEG.FOR declarations and SETUP.FOR 263.
  - Confirmed KILCHK has no caller in the supplied admission path, so its dormant
    privilege reset is not an admission effect. Existing pregame privilege is
    retained. Initial name acquisition and pregame SET NAME reconciliation remain
    explicit review items rather than importing packed-buffer behavior.
  - Defined ordinary-arithmetic population counts, option defaults, placement
    order, collision retries and the preserved startup command resource.
    Star counts are 100..350 by fives; potential holes 10..50, drawn even when
    later declined. Bases are placed in alternating faction order, then planets,
    stars and optional holes. Sources: SETUP.FOR 173–256, DECWAR.FOR PLACE 2765,
    WARMAC.MAC DECINI 1096 and preserved reference DECWAR.INI.
  - PLACE's comparison does not establish an enemy-planet spawn exclusion.
    Destroyed-base positions in later placement remain a normalization question.
    HISEG's cleared range excludes the shared action-cycle counter, so reuse of
    an expired galaxy cannot yet be claimed to reset that phase. Both issues are
    recorded explicitly in the draft and NORMALIZATION.md; no silent fix.
  - World termination retains the no-planets/one-fleet-without-bases predicate,
    forced termination, final score/release/exit order and per-session observation.
    With both fleets absent, both victory reports follow total destruction, in
    Empire-then-Federation order. Removed the unused standings classification
    from the abstract rule; its only consumer is commented out. No new winner
    tie-break or score bonus was added. Sources: DECWAR.FOR ENDGAM 961,
    MSG.MAC 54–66, GETCMD 1184.
  - Added 23 source-reviewed semantic examples, 168 total. The document build
    passes 12 included sections, 238 local links, 168 scenario rows and 324 source
    message fragments. Logs: logs/spec-admission-build.log and
    logs/spec-admission-final.log. This is source/documentation validation, not
    executable conformance or native differential verification.
  - The PDF has 88 pages. Inspected physical pages 68, 69, 70, 71, 73 and 87;
    after clarifying the victory-report order, rebuilt and rechecked page 73.
    Renders: tmp/pdfs/spec-admission/page-*.png and final-73.png. No layout defects
    found in those pages. npm run audit:check passed (logs/spec-admission-audit.log):
    135 hashes, 83 declarations, 33 main-game/16 pregame slots, 324 strings and
    both source-variant inventories. git diff --check passed.
  - Goal remains active: complete name/control/resume and concurrency contracts,
    autonomous world behavior/randomness, terminal bindings, CompuServe amendments,
    remaining normalization questions and earlier clauses' ADT conversion.
    No gameplay, archived source or running service changed. Concurrent automated-
    player changes remain separate; only this entry is staged from WORK_LOG.md.


## Specification checkpoint — explicit ADT properties and resource contracts (2026-09-05)

- Responded to the request for R7RS-style entries and unambiguous ADTs. Consulted
  only the supplied R7RS PDF, section 1.3.3, for editorial format; it supplies no
  DECWAR rules. Recorded this reference and single-column direction in the plan.
- Defined mapping, property-selection, identity and semantic-outcome notation.
  Defined Damage as a scalar and explained all nine Device entries, DeviceState,
  hull damage, shield strength/mode and shared engine energy. MOVE/IMPULSE now
  name exact device-damage paths and keep their distinct propulsion checks.
- Rewrote SHIELDS, RADIO, ENERGY, DOCK and REPAIR as operation contracts with
  typed inputs, ordered preconditions, before/after effects, outcomes and
  completion rules. Shared RepairDevices has a contract used by automatic repair.
  No storage structure or new game command is prescribed.
- Rechecked Austin DECWAR.FOR SHIELD (3739), RADIO (3129), ENERGY (1009),
  DOCK (893), REPAIR (3190), MOVE/IMPULS (2141), and caller/turn sites. Preserved
  shield threshold asymmetry, signed transfer/repair amounts, capacity/confirmation
  ordering, radio preference/device separation and report-sensitive repair timing.
- Corrected one draft syntax omission found in REPAIR: the zero-damage branch
  bypasses ALL recognition and its report-suffix advancement, so REPAIR ALL DAMAGE
  produces no damage report when all devices are undamaged. An explicit integer
  or omitted amount still permits DAMAGE. This is a source-derived acceptance
  rule, not a numerical normalization or a runtime change. Clarified RADIO's
  unknown-name rejection and acceptance of uncommissioned roster identities.
- Added EX-MODEL-169 through 176 for independent device state, threshold checks,
  report acceptance and radio settings. Build verifies 12 included sections,
  243 local links, 176 scenario rows and 324 source message fragments. Source audit
  verifies 135 hashes, 83 declarations, 33 main/16 pregame commands and variant
  populations. git diff --check passes.
- Logs: logs/spec-adt-resources-build.log, logs/spec-adt-resources-final.log,
  logs/spec-adt-resources-audit.log. Rebuilt the 91-page PDF and visually reviewed
  relevant ADT, resource and example pages under tmp/pdfs/spec-adt-resources/.
  Generated publication files remain ignored and reproducible.
- Runtime and legacy archives unchanged. Separate automated-player experiment
  work, docs/status.md and its work-log entries remain outside this checkpoint.
  Goal remains active: older command contracts, complete ADT/lifecycle and
  multiplayer definitions, autonomous actions, presentation and variants remain.


## Specification checkpoint — movement, tractor and construction ADTs (2026-09-05)

- Classified the preceding checkpoint as progress: d45418c is the committed and
  pushed ADT/resource-contract revision. Rechecked the current worktree; separate
  experiment, status and work-log changes remain outside this specification work.
- Converted TRACTOR, MOVE, IMPULSE and BUILD to typed operation contracts with
  grammar, ordered validation, state effects, outcomes and completion. Separated
  propulsion rejection from departure/range rejection, retained movement costs
  despite obstruction, and retained overheating without a second propulsion check.
- Added SectorObject and the sector query, GridPoint, SectorVector, PathObstruction
  and PathResult. Defined the path operation's domain, candidate/probe ordering,
  last-clear result and boundary behavior. Distinguished geometric axis aliases
  from actual record fields. Added fixed per-faction base identity order.
- Defined tractor membership as a two-identity unordered set, engagement/release
  effects on both ships, and the following operation. Either endpoint may move
  first; only the acting ship pays movement energy and completes its turn.
  Crowded/out-of-bounds following and concurrent claims remain explicitly open.
- Rechecked Austin TRACTR/TRCOFF (DECWAR.FOR 4432), MOVE/IMPULS (2141),
  CHECK/CHKPNT (699), BUILD (523), PLNRMV (2864), ENDGAM (961), BASKIL (339),
  CAPTUR (600), command callers and WARMAC LOCK/UNLOCK (3764). Recorded the global
  lock implementation only in excluded normalization research; did not invent
  independent per-planet locks or random crew/surrender failures.
- Clarified that a retained fifth build advances to six on a later BUILD rather
  than retrying conversion; late capacity failure restores four builds but keeps
  250 pending points. A reused base identity replaces discovery state using the
  converted planet. A terminating conversion exits before normal turn accounting,
  leaving new pending points uncommitted; its partial conversion state remains open.
- Closed CAPTURE's ordinary former-faction docking ordering: re-evaluation uses
  the former ownership before capture, with no second check afterward. Kept
  notification/concurrency and refusal conditions separate as remaining work.
- Added EX-MODEL-177 through 189 covering validation order, independent device
  state, movement from either endpoint, overheating, path boundaries/candidates,
  construction failures, knowledge replacement, docking and final-score behavior.
- Verified 12 included sections, 248 local links, 189 scenario rows and 324 source
  message fragments. Source audit passes 135 hashes, 83 declarations, 33 main and
  16 pregame commands plus both population checks. git diff --check passes.
- Logs: logs/spec-movement-construction-build.log (initial layout rejection for
  two overlong inline equations), logs/spec-movement-construction-final.log
  (passed after displaying those equations separately), and
  logs/spec-movement-construction-audit.log. Rebuilt the 96-page PDF and visually
  reviewed relevant model, command, path, tractor and example pages under
  tmp/pdfs/spec-movement-construction/. Generated outputs remain ignored.
- No runtime, live-server or legacy archive changes. The goal remains active;
  remaining command contracts, complete combat/autonomous behavior, lifecycle,
  multiplayer/presentation bindings and variant amendments still require work.


## Specification checkpoint — autonomous Romulan operations (2026-09-05)

- Continued the explicit ADT work from movement checkpoint 6f1dfcf. Device state
  remains a total Device-to-DeviceState mapping, with damage selected explicitly
  as ship.devices[WARP_ENGINES].damage; hull damage and shield strength are separate.
- Added the compiled autonomous chapter with typed activation, target selection,
  pursuit and torpedo-burst operations. Separated the current Romulan's position
  and energy from persistent activity counters, weapon deadlines and score.
- Derived activation gates, deferred appearance, empty-sector placement, target
  ranking/ties, pursuit tracing/avoidance, deadline comparisons, phaser and torpedo
  effects, post-weapon defenses, accidental planet hits and score persistence.
  Preserved observable ordering and costs without PDP-10 storage representations.
- Rechecked Austin DECWAR.FOR ROMDRV 3233–3397, ROMSTR 3400–3418, ROMTOR
  3419–3514, DIST 836–892, TELL 3977–4065, BASPHA 375–430, PLNATK 2800–2860,
  BASBLD 317–338, PLACE 2765–2796 and main turn completion 230–253; checked
  HISEG.FOR/SETUP.FOR initialization and WARMAC.MAC ROMSPK. Source derivation,
  residual target-selection state and normalization choices remain outside the book.
- Closed related speech and defense details: validated autonomous audiences clear
  the triggering captain's matching gag preferences before publication; temporary
  HELP/GRIPE sector substitution does not grant installation-attack immunity.
  Both-faction Romulan defenses retain the triggering faction for the specified
  announcement audience. POINTS reads persistent activity even when no Romulan exists.
- Added EX-MODEL-190 through 208 for activation, appearance, target ranking,
  movement, deadline equality, weapon costs, burst completion, planet destruction,
  self-destruction, gag updates and temporary-sector attack eligibility.
- Kept absent/distant-target selection, concurrent world changes, interrupted
  publication and planet-update refusal conditions explicit as incomplete contracts;
  did not invent pursuit limits, idle behavior or new random failure probabilities.
- Validation: spec build passed 13 included sections, 268 local links, 208 semantic
  example rows and 324 source fragments. Source audit passed 135 file hashes,
  83 declarations, 33 main commands, 16 pregame commands and both variant population
  checks. These are document/source checks, not executable semantic conformance.
- Logs: logs/spec-autonomous-build.log, logs/spec-autonomous-final.log and
  logs/spec-autonomous-audit.log. Rebuilt the 104-page PDF; visually reviewed the
  model, autonomous chapter and new example pages in tmp/pdfs/spec-autonomous/.
  Rerendered example pages at higher resolution to verify full identifier display.
  Generated PDF/HTML/LaTeX/Markdown outputs remain ignored.
- No runtime, live-server or immutable archive changes. Separate experimental/,
  docs/status.md and unrelated WORK_LOG additions remain outside this checkpoint.
  The goal remains active: remaining command contracts, lifecycle/multiplayer,
  randomness, presentation bindings, variants and full conformance review remain.


## Specification checkpoint — player weapon contracts (2026-09-05)

- Classified the previous goal turn as progress: autonomous checkpoint dde3fe2
  was committed and pushed. Inspected current worktree; separate experiments,
  status changes and existing unrelated work-log additions remain outside this work.
- Converted PHASERS and TORPEDOS to explicit ADT operation contracts with typed
  inputs, named rejection/cancellation/completion outcomes and ordered checks.
  Added PhaserBank FIRST/SECOND and Captain.phaserReady as a total mapping;
  both banks share the ship's one PHASERS DeviceState damage value.
- Rechecked PHACON, TORP, LOCATE/RELOC, PHADAM/TORDAM and their main-loop callers
  in legacy/utexas/DECWAR.FOR. Preserved target checks before the phaser wait,
  strength validation afterward, heat-notification ordering, firing despite
  insufficient energy, post-notification deadline timing and no-repair completion.
- Defined torpedo request targets, reuse/truncation, ordered own-sector/range
  checks, docked ammunition behavior, misfire/tube damage, per-shot reload delay,
  partial planet-update refusal and world-end early return. Extra pairs still
  undergo location validation but not the selected burst's ten-sector checks.
- Replaced vague weapon grammar placeholders with normal-form productions;
  updated the grammar chapter's status and stale tractor-release cross-reference.
  Incomplete torpedo forms, concurrent target/actor changes and control interruptions
  remain explicit dependencies rather than invented acceptance or repair rules.
- Documented per-impact planet destruction in excluded NORMALIZATION.md: a prior
  hit's stored destruction flag does not destroy a subsequent surviving planet
  in the generalized model. No game code or preserved source bytes were changed.
- Added EX-MODEL-209 through 225 for bank ties, validation/wait ordering,
  overheating and deadline arithmetic, energy exhaustion, tube/inventory precedence,
  own-sector versus out-of-range outcomes, unused aims, docked bursts, misfire
  damage at the threshold, update refusal and independent impact results.
- Validation: source audit passes 135 hashes, 83 declarations, 33 main-game and
  16 pregame commands, 324 messages and variant population checks. Final spec
  build passes 13 sections, 272 local links and 225 example rows. These checks
  verify documents/source evidence, not complete executable semantic conformance.
- Logs: logs/spec-player-weapons-build.log records initial PDF overflow rejection;
  logs/spec-player-weapons-final.log passes after moving long field/deadline
  expressions into displayed pseudocode. logs/spec-player-weapons-audit.log passes.
  Reviewed the 107-page PDF's model, weapon and new example pages, with renders in
  tmp/pdfs/spec-player-weapons/. Generated publication files remain ignored.
- Goal remains active. Remaining commands, shared combat contracts, lifecycle,
  multiplayer, random distributions, terminal bindings, variant amendments and
  complete conformance review still require work. No runtime/server changes.


## Specification checkpoint — scan and ship-report ADTs (2026-09-05)

- Classified the previous turn as progress: player-weapon checkpoint 6453186 was
  committed and pushed. Rechecked the worktree; unrelated experiment/status/log
  changes remain separate from this specification checkpoint.
- Added ScanRequest, ScanMark, ScanRow, ScanReport and ScanOutcome, plus a typed
  BoundScan operation. The report exposes marks rather than complete object
  records. Defined initial observation order, fixed scan origin, discovery beyond
  the displayed rectangle, warning-area rereads and decreasing output row order.
- Rechecked Austin DECWAR.FOR SCAN/SRSCAN 3527–3615, STATUS 3860–3974,
  DAMAGE 783–830 and device/roster data; WARMAC.MAC SETSCN/MARK/SHWSCN,
  axis labels and ESHP/PSHP. Preserved the distinct blank black-hole mark,
  warning behavior, short/long cell forms and the mandatory first axis label,
  even beyond the displayed column on a one-cell SHORT scan.
- Specified row-boundary scan interruption as a prefix result: completed discovery
  remains, the interruption is consumed, and remaining rows/bottom labels are
  omitted. Full delivery and concurrent-installation behavior remain separate.
  No cloaking ability was inferred from defensive hidden-sentinel handling.
- Added ReportStatus and its ordered StatusObservation alternatives, including
  diagnostic observations among successful items. Each value names its source
  ADT field; hull damage, device damage, shield strength and radio enabled state
  remain distinct. Repeated selectors and non-name termination remain observable.
- Added ReportDamage, DeviceDamageRow and DamageReport. Preserved the initial
  positive-device-damage test, silent unmatched selectors, multiple prefix matches,
  repeated rows and the general-report fallback for an initial non-name token.
- Defined Token with explicit text, category, numericValue and origin properties
  in the lexical chapter. Name-category means ALPHANUMERIC, and argument sequences
  exclude the command name and end boundary. No lexer representation is prescribed.
- Added EX-MODEL-226 through 241 for scan warning/discovery differences,
  interruption, short-scan labels, width defaults, extent clamping, ordered status
  diagnostics, equivalent shield energy and device-report selection edge cases.
- Validation: source audit passes 135 hashes, 83 declarations, 33 main and
  16 pregame commands, 324 messages and both variant population checks. Final
  build passes 13 sections, 275 local links and 241 example rows. These are
  source/document checks, not complete executable semantic conformance.
- Logs: logs/spec-ship-reports-build.log (table break caught),
  logs/spec-ship-reports-layout.log (heading link caught),
  logs/spec-ship-reports-overflow.log (long device list caught),
  logs/spec-ship-reports-final.log and logs/spec-ship-reports-audit.log (passed).
  Visual review of the 112-page PDF also caught and corrected an unescaped generic
  type in Markdown. Reviewed final lexical, scan/status/damage and example pages
  using renders under tmp/pdfs/spec-ship-reports/. Generated publications stay ignored.
- No runtime/server/archive changes. Goal remains active: remaining command and
  shared-operation contracts, lifecycle, multiplayer, randomness, full terminal
  bindings, variant amendments and complete conformance review still require work.


## Specification checkpoint — session and environment reports (2026-09-05)

- Classified the previous turn as progress: scan/report checkpoint c67cab7 was
  committed and pushed. Inspected the current worktree and retained separation
  from unrelated experiment, status and prior work-log edits.
- Converted TYPE, TIME and USERS to explicit operations and typed observations.
  Added TypeObservation, TimeObservation, UserRow, UserReportEntry and
  ReportedPosition, including ordered values, omitted fields and read-only effects.
- Added SessionReporting and CommissionTiming, environment ClockOrigin/TimeOfDay
  observations, World.elapsedOrigin and World.blackHolesSelected. Admission records
  report metadata and elapsed/execution baselines; release removes the active
  baseline without requiring erasure of historical records. Host identities and
  displayed labels/numbers remain distinct types and meanings.
- Rechecked Austin TYPE/USERS/TIME/PRLOC, SET BHREMV, admission metadata and
  clock initialization, STAT, DAYTIM/RUNTIM/ETIM and the executable message text.
  TYPE OPTION reports MSG.MAC's version 2.3 text, not the stale 2.2 declaration
  comment. Black-hole removal does not change the selected galaxy option.
- TIME performs separate execution observations for commission and total time;
  output can accrue execution time between them. Kept clock rollover, extended
  sessions, missing first-galaxy origin and restart behavior explicit as remaining
  binding work. Recorded ETIM's +/-12-hour/day adjustment in normalization research;
  did not silently replace it with an unbounded monotonic-clock claim.
- USERS preserves all six ordinary fields at every verbosity and always emits
  the faction separator at the roster boundary. Privileged own-ship relative
  coordinates include zero displacement. Pregame absolute coordinates have a
  defined result; relative/BOTH without a viewer ship remains unresolved rather
  than deriving a position from unrelated historical storage.
- Added EX-MODEL-242 through 253 for TYPE preference/option output, ambiguity,
  preserved black-hole selection, successive timing observations and baselines,
  pregame omission, ignored arguments, empty user rosters, SHORT metadata and
  privileged absolute/relative coordinate observations.
- Validation: source audit passes 135 hashes, 83 declarations, 33 main commands,
  16 pregame commands, 324 strings and both variant population checks. Spec build
  passes 13 sections, 284 local links and 253 example rows. These checks establish
  source/document consistency, not complete executable semantic conformance.
- Logs: logs/spec-session-reports-build.log and logs/spec-session-reports-audit.log.
  Reviewed the 116-page PDF's new operation, session-type and example pages using
  tmp/pdfs/spec-session-reports/ renders. Generated publications remain ignored.
- No runtime, live-server or immutable source changes. Goal remains active;
  remaining commands, shared operations, lifecycle/multiplayer, randomness,
  terminal bindings, variants and full conformance review still require work.


## 2026-09-05 — Explicit POINTS observations and accounting ADTs

Continued the specification's explicit-property/ADT conversion. POINTS now
uses ScoreColumn, ScoreRatio, ScoreReportRow and ScoreReport through
ReportPoints. Defined the exact source of every score/count observation:
Ship.score/stardate, World.teamScores/teamTurns/teamCommissions, and persistent
RomulanActivity. Added World.teamCommissions to the model and named its
initialization and faction-acceptance increment in session rules. Kept current
participants distinct from cumulative commissions, and absent self commission
cells distinct from zero-valued or undefined ratios. No game code changed.

Source review: Austin DECWAR.FOR POINTS 2893–3048, player turn accounting
238–239 and Romulan activation 3244; SETUP.FOR faction acceptance 296/323.
Retained selector ordering, nonalphanumeric termination versus invalid-name
rejection, disabled Romulan removal, committed-only scoring, category/column
order, negative values and post-destruction Romulan totals. Added scenarios
EX-MODEL-254 through EX-MODEL-264. Zero-denominator presentation and concurrent
score/count changes during a report remain explicitly unresolved; no new
syntax, numeric repair or atomic-snapshot promise was introduced.

Validation: npm run audit:check passed (135 hashes, 83 declarations, 33 main
and 16 pregame commands, 324 strings). Spec build checked 13 chapters, 284 links,
264 scenario rows and 324 source message fragments. Initial PDF build rejected
three long unbreakable expressions; moved counter paths to displayed notation
and shortened one example's constructor wording. The rebuilt 119-page PDF
passed layout/reference checks. Visually inspected physical pages 15, 56–57,
91, 93 and 117 covering counter declarations, score contracts, admission and
new scenarios. Logs: logs/spec-points-adt-audit.log,
logs/spec-points-adt-build.log (retained failure), and
logs/spec-points-adt-build-2.log (pass). Renders: tmp/pdfs/spec-points-adt/.

The checks validate source preservation and document construction, not complete
semantic coverage or executable conformance. Remaining work includes the other
command-family ADT conversions, lifecycle/interleavings, terminal/environment
bindings, CompuServe amendments and a whole-spec consistency review. Unrelated
experiments, docs/status.md and concurrent work-log additions remain outside
this specification checkpoint.


## 2026-09-05 — TELL and radio communication ADT contracts

Converted TELL to SendTell with explicit input, failures, observations and
ValidateRadioRecipients. Named the exact device/captain properties for radio
availability, enablement, commission eligibility and ungagging. Preserved
ship-name-before-group lookup, per-token diagnostics, ROMULAN skipping before
repeat rejection, filtering precedence, sender removal and effects retained
through cancelled composition or failed publication. Added AcquiredLine and
CommandInput so raw body text, token arguments and repeated-input state have
explicit meanings, including recipient continuations and ESC at Msg:.

Added MessageSender, RadioService, PublicationId, RadioHeading and
MessageObservation. Typed publication/receipt and defined DiscardUnread for
capacity loss and release. Published order is distinct from capacity acquisition;
unpublished operations occupy capacity but have no receivable body. Original
audiences remain immutable while remaining recipients change. Initial capacity
access can fail, whereas final publication retries temporary unavailability.
Complete availability/interruption and release/publication interleavings remain
open. No queue layout, address artifacts or new game mechanics were prescribed.

Evidence: Austin TELL DECWAR.FOR 3977–4063; OUTMSG 2599–2623; FREE 1082–1140;
SETUP.FOR groups 358–364; WARMAC.MAC INLI. 1542–1605, publication/capacity
2589–2750 and MAKMSG/GETMSG 2963–3075. Added EX-MODEL-265 through EX-MODEL-277.
All 33 main commands retain grammar/semantic clauses; 25 now have explicit
ADT operation contracts. Remaining command conversions include SET, the five
galaxy-report commands, *PASSWORD and *DEBUG. Lifecycle, multiplayer, terminal
bindings, variants and full consistency/conformance review remain unfinished.

Validation: source audit passed (135 hashes, 83 declarations, 33 main and
16 pregame commands, 324 strings). Book construction checked 13 chapters,
289 local links, 277 scenario rows and 324 source message fragments. First PDF
build rejected one overlong property expression; displayed the recipient-removal
expression separately, then rebuilt successfully. Visually reviewed pages 18,
64–65, 90–92 and 122 of the 123-page book for declarations, TELL, shared
communication and examples. Logs: logs/spec-tell-adt-audit.log,
logs/spec-tell-adt-build.log (failure retained), logs/spec-tell-adt-build-2.log
(pass); renders tmp/pdfs/spec-tell-adt/. These checks verify construction and
source preservation, not executable conformance or full semantic coverage.

No gameplay, server, archive or generated source data changed. Concurrent
experiments, status edits and unrelated work-log additions stay outside this
specification checkpoint. Next: SET preference operations and their effects.


## 2026-09-05 — SET preference and world-control ADTs

Converted SET into ConfigureCaptain, SetPreference, SelectTerminalProfile,
SetCaptainName and ApplyPrivilegedSetting. Added the finite TerminalProfile type
and used it in Captain state and TYPE observations. Added World.ended and an
explicit viewer argument to CheckWorldEnd, connecting forced termination to
its state property and the affected session. Kept first-match setting selection,
value prompting versus silent unchanged results, provisional/absent terminal
profiles, raw name retention and privileged-setting effects source-grounded.
BHREMV includes temporary HELP/GRIPE black-hole sectors, retains ship association
and the original option, and leaves restoration to the activity contract.

Reviewed Austin SET (DECWAR.FOR 3624–3737), terminal names (480–488),
ENDGAM (961–992) and USRNAM (WARMAC.MAC 3415–3458). Added EX-MODEL-278 through
EX-MODEL-287, including ordered abbreviations, repeated numeric value prompts,
profile cancellation, name spaces/remainders, privileged dispatch and forced
world-end observation. Corrected the blank-name scenario to thirteen spaces
after NAME: one is the delimiter and twelve are retained name content. Removed
redundant profile prose after introducing the operation contract.

Validation: audit passed (135 hashes, 83 declarations, 33 main and 16 pregame
commands, 324 strings). Both PDF builds passed. Final build checks 13 chapters,
289 links, 287 scenario rows and 324 message fragments; final PDF has 125 pages.
Visually reviewed physical pages 9, 63–65, 100 and 123 for type declarations,
SET operations, world termination and scenarios. Logs:
logs/spec-set-adt-audit.log, logs/spec-set-adt-build.log and
logs/spec-set-adt-build-2.log; renders tmp/pdfs/spec-set-adt/.

At the user's preview request, queued the current PDF for display in Codex.
The book remains a working draft: 26 main commands have explicit ADT contracts;
remaining command conversions are the five galaxy-report commands, *PASSWORD
and *DEBUG. Lifecycle/concurrency, terminal bindings, CompuServe amendments and
whole-book consistency/conformance remain. No gameplay or preserved source
changed; unrelated experiments, status edits and log entries remain unstaged.


## 2026-09-05 — Main-command ADT pass completed; report semantics refined

Converted LIST, SUMMARY, BASES, PLANETS and TARGETS through ReportGalaxy,
ReportGroup/Context/Entity, typed telemetry and summary observations,
ReportAdmission and ObserveReportDetail. Added the base identity query. Defined
saved distance origins, the pregame whole-galaxy count-only domain, immediate
versus deferred observations, discovery updates, accumulated disclosure, output
ordering and range-label evidence. Retained current ship/base/planet properties
without prescribing masks, arrays or storage layout.

Source review resolved leading/trailing empty groups, named/coordinate/filter
precedence and the asymmetry of ROMULAN selector order. Named ship repetition
now has the source union effect; the unrelated uninitialized SHIP duplicate guard
is excluded under the documented normalization policy, not replaced with a new
duplicate-name error. A named query can report despite an explicit range failure;
exact-position queries still check their group range. Late review caught BASES'
default count-mode exception: a remote unknown base/ship/Romulan at an exact
coordinate can be identified with concealed telemetry, without discovery. LIST's
detail-only default cannot use that path; remote terrain remains excluded.

Converted *PASSWORD to SetPrivilege, preserving exact retained-token matching,
suffix truncation, privilege clearing and silent completion. Converted *DEBUG
to ReportDiagnostics and added OperationTiming plus its environment observation
query. Preserved registration order, zero-call rows, header-only output and
non-resetting reports. Instrumentation/time-unit/failure binding remains open.
All 33 main-game commands now have draft grammar and ADT operation contracts;
that is not a complete grammar, lifecycle or conformance claim.

Evidence: Austin DECWAR.FOR LIST 1359–1388; LSTSCN 1519–1744;
LSTFLG/LSTUPD 1750–1956; LSTOUT/LSTSUM/LSTOBJ 1959–2141; PRLOC 3078–3099;
PASWRD 2626–2644; PARAM.FOR selector constants 95–124 and password 15;
LSTVAR.FOR declarations; WARMAC.MAC timing/DEBUG 3606–3673 and EQUAL 3675–3715.
Added EX-MODEL-288 through EX-MODEL-313 covering these distinctions.

Validation: source audit passed (135 hashes, 83 declarations, 33 main and
16 pregame commands, 324 strings). All three book builds passed. The final
132-page book checked 13 chapters, 290 links, 313 scenario rows and 324 source
message fragments. Reviewed rendered report types/admission pages 54–55 and 57,
then final pages 58, 60, 71–72, 99, 129 and 131 for disclosure, privilege,
diagnostic types and examples; fresh 120-dpi renders verified final pages 58/131.
Logs: logs/spec-galaxy-reports-adt-audit.log,
logs/spec-galaxy-reports-adt-build.log, logs/spec-main-command-adts-build.log,
logs/spec-main-command-adts-build-2.log. Renders:
tmp/pdfs/spec-main-command-adts/. Construction checks are not executable tests
or original-runtime differential verification.

No gameplay/server/archive/generated-source changes. Unrelated experiments,
status edits and concurrent work-log additions remain outside this checkpoint.
Next: initial name acquisition and remaining pregame behavior, followed by shared
lifecycle/operation contracts, concurrency, terminal/environment bindings,
CompuServe amendments and whole-document consistency/conformance review.


## 2026-09-05 — Specification entry names, administrative statistics and turn review

Defined Session.entryName and AcquireEntryName/AcceptEntryName, preserving the
raw reader's NUL/CR ignoring, LF/ESC/BEL termination, first-six-character
nonspace requirement, twelve-character name and printable character conversion.
Separated the stored entry name from an active commission's SET NAME change;
admission reuses the former. Narrowed the earlier blanket SET NAME state update
to active commissions: the archive's pregame zero-ship access does not justify
an invented safe pregame assignment. Documented long-input memory-safety
normalization and remaining nonprinting/host-input cases outside the book.

Added pregame ZapStatistics with HistoricalStatistics/AdministrativeState ADTs,
silent unprivileged behavior, context-only administrative feedback, retained
working serial, ordered REGULAR/FREE_ACCOUNT replacement and explicit partial
open-failure outcomes. Finished! follows either success or open failure. The
full archive schema, write/close failures and interruption binding remain open;
no live score reset or active standings lifecycle was invented.

A source follow-up found a missed automatic-repair selection: REPAIR(3) still
checks the second token for ALL. Added AutomaticRepairSelection and corrected
DOCK ALL, DOCK STATUS ALL and MOVE A versus MOVE ABSOLUTE semantics, including
replacement of input by coordinate continuations. Kept the accepted source
syntax/behavior rather than silently limiting every automatic repair to 30.
Corrected turn-threshold prose to count reserved participants, not only ships
already commissioned. Sources and normalization reasoning are in the spec.

Validation: logs/spec-entry-administration-audit.log passes 135 source hashes,
83 declarations, 33 main/16 pregame entries and 324 strings. The printable-name
review checked all 95 character mappings (logs/spec-entry-name-character-review.log).
Final build logs/spec-startup-turn-review-build.log passes 13 chapters, 308 local
links and 338 scenario rows. Earlier successful build logs are retained as
logs/spec-entry-administration-build.log and
logs/spec-entry-administration-build-final.log. The rebuilt PDF has 137 pages;
reviewed rendered pages 87, 102–104 and 135 in tmp/pdfs/spec-startup-turn-review/.
These are documentation/source checks, not execution of a complete conformance
suite or original-executable parity. No game code, servers, archives or source
data changed. Unrelated experimental/, docs/status.md and other WORK_LOG additions
are preserved and excluded from this checkpoint.

Remaining goal work includes complete shared combat/turn operation contracts,
lifecycle/concurrency/control and terminal bindings, malformed grammar cases,
randomness and the CompuServe appendix; this checkpoint does not complete the goal.

## 2026-09-05 — Automated-player tactical training and two-versus-two play

Runnable milestone: compare the experimental captain with its preserved prior
policy, fix observed combat decisions, and run two ordinary Telnet bots per
faction. Reviewed docs/documentation-standard.md and the experiment's current
README/PLAN before implementation. All game runtime, archives, generated source
and concurrent specification edits remain unchanged by this work.

Preserved the v2 captain policy in experimental/automated-player/test/captain-v2.ts.
Extracted the existing controlled fixture to test/scenario-fixture.ts and added
test/training.ts. Privileged state is confined to fixture setup. Both evaluated
captains and the stationary phaser sentry get observations/targets through
Telnet; source arithmetic, random draws, command costs and waits remain active.
The runner saves individual transcripts and summaries, alternates version order
on repeats, and reports fixed decision budgets, elapsed time, resource use,
damage, recovery and errors. Opponent actions are sequenced by the runner;
these are not simultaneous matches or paired-random competitive benchmarks.

V3 closes the 2400–2799 energy gap: with visible enemies, the ship enters
resupply below the same 2800 threshold used to admit firing. Its existing
resupply state persists after losing enemy contact. A healthy ship (energy >=
3200, shields >=75%) can approach one freshly scanned enemy toward range four
through observed safe space. Multiple enemies, weaker shields, or a dangerous
next step retain the firing position. Values are bot heuristics, not changed
game rules. Source: Austin DECWAR.FOR PHADAM:4167–4195 distance attenuation;
PHACON:2647 onward still controls actual damage/costs/heat/readiness. Updated
CLI policy label, focused unit cases, README/PLAN, docs/status.md and TRAINING.md.

Initial probes: logs/automated-player-training-baseline.log and
logs/automated-player-training-1788662091567/summary.json. The first withdrawal
layout coincidentally placed the base along the old patrol route; final matched
comparisons moved the refuge away from that patrol direction and required zero
hull damage for completed recovery. These initial probes are retained separately.

Final comparison commands:
- node experimental/automated-player/test/training.ts --policy both --rounds 12 --repeats 2
- node experimental/automated-player/test/training.ts --policy both --set held-out --rounds 12 --repeats 2

All 16 trials completed without detected deaths or protocol errors. Logs:
logs/automated-player-training-development.log and
logs/automated-player-training-held-out.log; complete summaries:
logs/automated-player-training-1788662159741/summary.json and
logs/automated-player-training-1788662173787/summary.json. Four v3 withdrawal
trials fully recovered within budget; zero of four v2 trials did. Against
passive targets, v3 spent 760 shot energy versus 1140 and produced comparable
or greater shield loss, but took 18–22 seconds versus about 10 and caused less
hull damage in the swapped-side comparison. Tiny unpaired samples establish
neither statistical significance nor match strength. Candidate tactics were
not adjusted after held-out results. TRAINING.md retains the full means and
limitations; next work is moving opponents, equal-time budgets, approach under
return fire and the value of remaining at a friendly base.

Validation:
- Experiment TypeScript check passed: logs/automated-player-training-typecheck.log
  (initial scaffold check: logs/automated-player-training-typecheck-initial.log).
- Focused captain unit checks 10/10: logs/automated-player-training-unit.log.
- node --test experimental/automated-player/test/*.test.ts test/austin-telnet.test.ts test/telnet.test.ts
  passed 34 cases and failed only the CLI assertion still expecting the v2
  label: logs/automated-player-training-regressions.log. Updated the expected
  metadata; targeted external CLI rerun passed 1/1 in
  logs/automated-player-training-live-final.log. All 35 distinct cases passed
  across these runs. Retained the failed run as evidence.
- npm run audit:check passed 135 hashes, 83 declarations, 33 main/16 pregame
  commands, 324 strings and both variant inventories:
  logs/automated-player-training-audit.log.

Live operation: the earlier 2423 host and Scout process were no longer running.
Confirmed no listener and no PID 96762, the owner recorded in the stale lock.
The failed startup is in logs/automated-player-training-host.log. Archived the
verified stale lock as logs/automated-player-training-stale-host-lock.json;
started Austin playable on 2423 using data/automated-player-experiment. Servers
on 2323/2324 were not touched. The restarted host is exec session 13556.

Launched Federation Scout/Nimitz and Wing/Excalibur, Empire Raven/Wolf and
Shade/Demon. All four exchanged shots on v2; a saved checkpoint records 68
phaser decisions, docking and no deaths/errors:
logs/automated-player-training-live-v2-summary.json. After validation, quit and
rejoined each bot individually with v3 while leaving the host running. Current
exec sessions: Scout 17010, Wing 83171, Raven 29635, Shade 73599. Each has 10000
decision cycles, 10 lives and --stay-connected; no recurring automation was
created. Individual transcripts use logs/automated-player-training-NAME-v3.jsonl.
Post-update checkpoint logs/automated-player-training-live-v3-summary.json shows
all four actively deciding; Wing/Shade fired and Scout/Raven exercised approach
moves, with no deaths or protocol errors. Vulcan was not assigned to a bot.
These live counts are activity evidence, not a controlled policy comparison.

Final experiment typecheck passed in
logs/automated-player-training-typecheck-final.log. Documentation check resolved
seven local links and confirmed no game-runtime imports in player modules:
logs/automated-player-training-documentation-check.log. git diff --check passed.
Both comparison processes exited 0. Final live check showed all four v3 bots
continuing at rounds 44–55, with no recorded deaths or protocol failures.


## 2026-09-05 — Shared combat, turn completion and installation-count ADTs

Connected shared PhaserHit/TorpedoHit to DamageTarget, AttackSource, WeaponHit,
critical/defense/destruction observations and explicit score credit. Defined
ApplyShipHit, ResolveBaseHit, RemoveWeaponDestroyedBase, AddAttackCredit,
RomulanPhaserHit/RomulanTorpedoHit and Displace, and updated player, Romulan and
installation callers. Distinguished the torpedo-only fatal-resource guard,
ordinary versus early-critical base credit, pre-cleanup reported base strength,
negative remaining Romulan energy, and black-hole displacement's retained
position/docking/condition. Caller-owned notices and Romulan-target score remain
separate from result construction. Fatal-target report and interleaving cases
remain explicitly open rather than receiving invented behavior.

Defined CompleteTurn, CommitPendingScore, DefenseContext and life-support
observations. Automatic repair precedes the life-support test; zero reserve is
not fatal; docking skips the decrement but not a negative-reserve test; fatal
hull assignment is exactly 2500. Fatal damage can precede the rest of a normal
turn's accounting, while session-ending control transfers stop later steps.
Pending scores commit by category once to ship and faction without adding a
report-triggered commit or atomic whole-turn transaction.

Named World.baseCounts/capturedPlanetCounts and ReevaluateDocking. Construction,
capture, removal, nova and weapon cleanup now refer to the specified count-update
stages. Fixed the base-conversion collection equation to replace an existing
identity's record, not union in a second record of the same identity. World-end
checks use maintained counts, including construction's increment before base
activation. Sources and normalization reasoning are recorded in the spec.

Added 34 examples (339–372). Exact rational arithmetic checks of source-scaled
weapon formulas pass in logs/spec-shared-combat-arithmetic-review.log. Final
source audit logs/spec-shared-combat-adt-audit-final.log verifies 135 hashes,
83 declarations, 33 game/16 pregame entries and 324 strings, with Austin 18 ships
and CompuServe 10. Final book build logs/spec-shared-combat-turn-adt-build-final-2.log
passes 13 chapters, 309 local links and 372 scenario rows. The PDF has 145 pages.
Reviewed pages 80, 83–85, 89, 91–92, 141 and 143, plus final revised renders at
80, 82, 86, 89 and 143 in tmp/pdfs/spec-shared-combat-turn-adt/.

Retained failed logs: spec-shared-combat-adt-build.log caught a bare example
cross-reference being counted as another table ID; literal formatting corrected
that reference. spec-shared-combat-turn-adt-build.log caught one overwide inline
score path; a displayed match/assignment operation resolved it. Successful
intermediate build spec-shared-combat-turn-adt-build-final.log is also retained.
Checks validate documentation structure, source integrity and the stated
arithmetic examples, not a complete executable conformance suite or native parity.
No gameplay, server, archive or generated source-data changes. Other work in
WORK_LOG.md, docs/status.md and experimental/ is preserved and excluded.

The goal remains active: nova/removal operation closure, grammar boundary cases,
multiplayer/control/lifecycle and terminal bindings, probability/reproducibility,
CompuServe amendments and a full cross-chapter conformance audit remain.


## 2026-09-05 — Nova and planet-removal specification contracts

Continued the active specification goal with explicit NovaSource/NovaContext,
NovaTarget/NovaHit, NovaImpact/ExplodeStar and RemovePlanet contracts. Preserved
chain scan/reverse-resolution order, the 29-pending-star limit, current occupant
checks, repeated impacts, critical shield timing, distinct friendly/enemy score
policies, publication order, black-hole versus recorded positions and immediate
world-end propagation. Connected player/Romulan star hits and BUILD removal to
the named operations. Added EX-MODEL-373–402 (30 scenarios).

Source review: Austin DECWAR.FOR NOVA 2259–2390, SNOVA 3807–3860,
OUTHIT 2392–2541, PRIDIS 3055–3070, JUMP 1283–1331, PLNRMV 2864–2892,
BUILD 558–575, TORP 4300–4325 and Romulan torpedoes 3430–3450;
WARMAC.MAC MAKHIT 2771–2872. NORMALIZATION records removal of report scratch
coupling (full-base distress clearing the later hit's H) and the fixed victim
buffer overflow, without changing nova strength/scoring or the explicit pending
star cap. Running code, servers and legacy bytes were not changed.

Validation: logs/spec-nova-adt-build.log passes: 13 chapters, 311 local links,
402 scenario rows, 324 source message fragments; assembled PDF is 152 pages.
logs/spec-nova-adt-audit.log passes 135 archived hashes and both variant
catalogues. logs/spec-nova-adt-arithmetic-review.log checks representative exact
fractional calculations; it is not an executable or differential conformance
suite. Visually reviewed rendered PDF pages 87–91,147,150 under
tmp/pdfs/spec-nova-adt/: readable types/pseudocode, tables and page transitions,
without detected overflow. No game tests warranted for these documentation edits.

Remaining work: full lexical/grammar edge forms, lifecycle and control contracts,
multiplayer interleavings, terminal binding, random distributions and CompuServe
amendments. The book remains a working draft, not complete conformance. Preserve
concurrent experimental/, docs/status.md and unrelated WORK_LOG.md changes.


## 2026-09-05 — Typed coordinate parsing and continuation specification

Defined LocationLimit, LocationValues, ordered LocationError outcomes and
ResolveLocations/ReadLocations in GRAM-3. Numeric count checking precedes all
type checking and then V/H bounds; odd item counts preserve a leading scalar.
Computed coordinates preserve the computer gate, advertised-speed delay before
validation, reverse target-validation order and original result order. Corrected
the earlier own-sector-identity claim: computed ship targets require commission,
position and nonempty sector, permitting the HELP appearance. Distinguish truly
blank continuations from nonempty mode-only input. Added EX-MODEL-403–434 (32
scenarios) and updated normalization/coverage; no game/server/archive changes.

Source: Austin DECWAR.FOR LOCATE/RELOC 1404–1516, MOVE 2141–2178,
PHACON 2647–2665, TORP 4228–4276, BUILD 523–535, CAPTUR 600–614;
WARMAC.MAC GTKN 1407–1439. Malformed torpedo count/pairs, special zero-item
caller paths and concurrent target disappearance remain explicit gaps instead
of invented values or diagnostics. Existing SET name acquisition is now linked
from grammar rather than incorrectly described there as awaiting review.

Validation: logs/spec-coordinate-adt-audit.log passes 135 hashes and both source
catalogues. Initial logs/spec-coordinate-adt-build.log failed on an overlong
inline property path; replaced it with displayed pseudocode. Final
logs/spec-coordinate-adt-build-final-3.log passes 13 chapters, 315 links, 434
scenario rows and 324 source message fragments. The PDF is 156 pages. Earlier
successful builds are retained; visual review prompted a heading/table
pagination adjustment and clearer column ordering. Reviewed pages 22–24 and
153–155, with final page 24 under tmp/pdfs/spec-coordinate-adt/. These are
source/document checks, not executable conformance tests. Remaining scope
includes random semantics/reproducibility, lifecycle, terminal/control binding,
multiplayer and variant amendments. Concurrent unrelated work stays unstaged.


## 2026-09-05 — Generalized random semantics and tournament replay

Defined uniform unit/integer/ordered-choice distributions, reuse and ownership
of random events, conditional game probabilities and tournament initialization
versus full multiplayer replay. Added RandomRequest/RandomValue/RandomEvent as
abstract replay inputs, without a mandated generator or serialization. Nonempty
retained tournament keys reproduce within a binding; an empty key preserves the
ordinary initialization fallback. Added EX-MODEL-435–452 (18 scenarios).

NORMALIZATION explicitly distinguishes ideal independent distributions from the
finite biased/correlated historical generator. Retained source thresholds and
formulas, including clipped Romulan torpedo damage's 2001/4000 mass at 200 and
four-group equal-distance probabilities 1/8, 1/8, 1/4, 1/2. Moved the generalized
Romulan obstruction roll into its star branch, matching the existing player
contract and excluding an otherwise unused nonstar draw. Explicit early draws
such as MOVE potential damage still remain on cancellation. No executable,
server or source archive changes.

Evidence: WARMAC.MAC random interfaces/generator 2285–2324; SETUP.FOR 169–193,
215–235; DECWAR.FOR PLACE 2765–2797, DIST 836–891, NOVA 2259–2390 and
weapons 4089–4419. Checked actual source statements and prior excluded derivations;
no outside DECWAR material. Finite binding acceptance and complete control/shared
event ordering remain open, without changing defined odds.

Validation: logs/spec-random-semantics-build.log passes 13 chapters, 322 links,
452 scenario rows and 324 source messages; PDF is 161 pages. Archive/catalogue
validation passes in logs/spec-random-semantics-audit.log. Exact enumeration and
rational probability review is in logs/spec-random-semantics-probability-review.log;
it checks generalized math, not historical generator uniformity or executable
conformance. Visually reviewed pages 80–83,158–160 under
tmp/pdfs/spec-random-semantics/: types, probability table and scenario layout
remain readable. Remaining goal scope includes control/lifecycle, multiplayer,
terminal/environment bindings, malformed caller cases and variant amendments.


## 2026-09-05 — Combat notice delivery specification

Added CombatNoticeService and publication/reception/discard/query contracts to
the renamed Communication chapter, with World.combatNotices initialized empty.
Defined forty-notice capacity per publisher ship, first-unused delivery priority,
oldest-publication eviction, roster/priority reception order, immutable observation
values, independent unread audiences and departure cleanup. Nested autonomous
notices use the performing captain's ship for publication while retaining the
actual combat origin. Command acquisition drains combat notices before radio
messages and its remaining post-command delay. Added EX-MODEL-453–472 (20 cases).

Source: WARMAC.MAC capacities 183–187, SETQH 2526–2535, MAKHIT 2771–2872,
GETHIT 2880–2950; DECWAR.FOR FREE 1120–1137, GETCMD 1184–1237,
OUTHIT 2402–2541. NORMALIZATION separates observable capacity/selection from
packed values, serial wrap, stale unread counters and partial cross-observation
mixtures. Full observation-body catalogue, terminal rendering and concurrent
publication/release ordering remain open; this is not a packet-layout spec or
an assertion that whole commands are indivisible. No gameplay/server/source
archive changes; no outside implementation material.

Validation: logs/spec-combat-notice-adt-build.log passes 13 chapters, 328 links,
472 scenario rows and 324 source fragments; assembled PDF is 165 pages.
logs/spec-combat-notice-adt-audit.log passes 135 archive hashes and both variant
catalogues. Visually reviewed pages 114–116,163–164 under
tmp/pdfs/spec-combat-notice-adt/: ADT, prose and conformance table are readable.
These checks validate the document and source inventory, not executable parity.
Continue with observation presentation, lifecycle/control, multiplayer,
malformed caller forms and CompuServe amendments. Preserve concurrent unrelated
WORK_LOG/status/experiments work.

### Specification checkpoint: base-notice reception correction

- Rechecked Austin DECWAR.FOR OUTHIT (2402–2408, 2559–2580): base distress/destruction bodies are consumed but suppressed when the recipient radio is off or RADIO damage is greater than 300; exactly 300 passes. Other hit kinds ignore that gate, and all ignore sender gagging. LONG's leading conditional blank-line request occurs before suppression.
- Added observation-kind classification, Suppressed reception outcome and EX-MODEL-473–477; narrowed the earlier radio-independent example to a nova hit. This corrects the preceding documentation checkpoint, not game behavior.
- Validation: logs/spec-combat-notice-radio-gate-build.log passes 13 chapters, 328 links, 477 scenario rows and 324 source fragments. The 166-page PDF's changed ADT, reception clause and examples were visually reviewed at 144 dpi. git diff --check passes. No executable or archive changes; prior archive audit remains applicable.
- Next: replace the remaining abstract observation-body placeholder with source-grounded typed report values, then finish presentation and lifecycle gaps.

### Specification checkpoint: typed combat observations

- Replaced CombatObservation's abstract body with explicit star, torpedo outcome, base, Romulan appearance, energy transfer and tractor values, plus ImpactObservation composed from named ship/base/planet/Romulan snapshots and existing weapon/nova results. All quantities use the generalized ADTs; no numeric object codes, reused critical-device payload or storage layout is normative.
- Preserved event information and caller differences: transfer received amount rather than charged amount; CAPTURE former owner/builds; pre-cleanup base strength; ship weapon black-hole destination versus Romulan/nova last occupied position; own-surviving-ship device details; Romulan ordinary torpedo wording despite a deflected effect. Source references are in communication.md and NORMALIZATION.md. Connected ENERGY to the named observation.
- Clarified commissioned as the existing active-participation predicate, distinct from retained captain association and completed release, resolving inconsistent prose around a just-destroyed recipient. No gameplay or source change.
- Added EX-MODEL-478–498. Validation: logs/spec-impact-observation-build-final-2.log passes 13 chapters, 346 links, 498 scenario rows and 324 source fragments. logs/spec-observation-values-audit.log passes the archive/generated audit. The 172-page PDF's new definitions, semantics, examples and changed release/model pages were visually reviewed at 144 dpi. Earlier successful build logs retained for editorial iterations; an intermediate review command correctly stopped while its build was still running. git diff --check passes. Scenario checks validate the document, not execution of those cases or native parity.
- Remaining work includes full terminal composition, control/resume and concurrent lifecycle boundaries, malformed caller cases and CompuServe amendments. Work remains documentation-only.

## 2026-09-05 — Live bot monitoring finds and repairs BEL-prefixed prompts

Status inspection at 03:30 UTC found Scout, Raven and Shade actively issuing
commands after more than 1100 decisions each. Wing had stopped at round 243,
02:51 UTC, with a timeout despite a complete normal prompt. Preserved transcript:
logs/automated-player-training-wing-v3.jsonl. Its terminal tail contained four
BEL bytes directly before Command:, after combat notifications. The strict
line-start prompt regex rejected that source-valid byte prefix. No autonomous
learning occurred between assistant turns; this observation prompted a code fix.

Updated both login/normal and command/reentry prompt recognition in the
experimental client to allow leading BEL bytes, retaining the original bytes
in terminal logs. Source: Austin DECWAR.FOR CLRBUF:774–778 and yellow-alert
output:1208; PROMPT:3102–3131. This changes client framing only, not game output,
command timing or policies. Updated README framing coverage. A fragmented fake
server regression preserves an old prompt plus unsolicited combat text and
checks both BEL-prefixed normal and informative prompts. It fails before the
fix: logs/automated-player-alarm-reproduction.log. All 13 focused client/codec/
observation/baseline cases pass afterward: logs/automated-player-alarm-tests.log.
Experiment typecheck passes: logs/automated-player-alarm-typecheck.log.
Archive/generated evidence audit passes: logs/automated-player-alarm-audit.log.

Restarted the failed Wing, then quit/rejoined each of the other three bots with
the corrected client. The existing 2423 host and user sessions stayed running.
All four rejoined and issued movement commands. New exec sessions: Wing 87130,
Scout 73716, Raven 51491, Shade 96903. Logs:
logs/automated-player-training-NAME-alarm-fix.jsonl. Their captain policy remains
v3; the change is transport framing. Each still has 10000 decision cycles,
10 lives and --stay-connected. No scheduled monitoring was created.

## 2026-09-05 — Specify terminal presentation of typed combat and radio observations

Added the included presentation chapter: context, decimal fields, coordinate
fields, object/device/condition labels, prompt warnings and conditional versus
unconditional line endings. Defined combat body composition from typed
observations, including recipient-specific critical details, Romulan torpedo
wording, base emergency/destruction paragraphs and exact significant spaces.
Radio headings retain the original audience and body-ending blank line.
Ordinary game quantities remain independent of display precision; documented
negative-fraction display normalization outside the normative book.

Source review: Austin WARMAC.MAC numeric/label/location/prompt output and
DECWAR.FOR OUTHIT/OUTMSG, with MSG/SETMSG literal comparisons. Added EX-MODEL-499
through EX-MODEL-527. Build passes 14 chapters, 374 local links, 527 scenario rows
and 324 named fragments: logs/spec-terminal-presentation-build-reviewed.log.
Literal/composition review: logs/spec-presentation-literal-review.log,
logs/spec-combat-presentation-composition-review.log and
logs/spec-radio-presentation-review.log. These checks validate written examples
against source-derived composition, not original-executable parity or execution
of every scenario. Archive audit passes: logs/spec-terminal-presentation-audit.log.
Reviewed final PDF pages 134–141 and 179–181 across the retained renders; no
clipping or overflow found. The compiled working draft has 182 pages.

No runtime/server/archive changes. Remaining work includes command/report
presentation, controls and lifecycle, concurrency, CompuServe amendments and
cross-chapter consistency. The specification goal remains active.

## 2026-09-05 — Define STATUS, DAMAGES, TIME, TYPE and scan presentation

Added ordered STATUS field prefixes/values, full versus selected damage-report
headings and padded rows, TIME duration fields, TYPE preference/option text and
complete SHORT/LONG scan-grid axes and row composition. DAMAGE now records its
report style and general LONG title-sector observation in the abstract result;
it does not assume the actor's ship is necessarily that observed sector object.
Retained caller distinctions, observation order, significant spaces/tabs and
scan interruption after a completed row. TYPE keeps ten-character profile-name
padding and option values independent of remaining galaxy objects.

Duration presentation now uses ordinary decimal hours that expand beyond 99,
with the source's whole-second precision and no wrap at 24. Documented this
explicit removal of malformed O2D character arithmetic in NORMALIZATION.md.
Invalid/negative clock readings and unavailable origins remain open; no new
TIME rejection or zero substitute was invented. Updated stale plan prose to
reflect all 33 drafted main-game command contracts and their remaining limits.

Source: Austin DECWAR.FOR DAMAGE 783–835, SCAN 3527–3619, STATUS 3860–3973,
TIME 4066–4085, TYPE 4540–4594; WARMAC numeric/device/profile/scan renderers;
MSG literals. Added EX-MODEL-528–553. Literal/composition checks passed:
logs/spec-report-presentation-review.log (28 literals, 7 examples) and
logs/spec-type-scan-presentation-review.log (21 literals, profile padding,
6 examples). These are written-source composition checks, not native parity.

An initial build found a blank line splitting the scenario table; retained in
logs/spec-report-presentation-build.log. Removed that blank line. Final build
passes 14 chapters, 403 links, 553 scenario rows and 324 named message fragments:
logs/spec-report-scan-presentation-build-final.log. Audit passes:
logs/spec-report-scan-presentation-audit.log. Reviewed new report/scan pages
142–146, example pages 186–188 and final ADT pages 42–43; no clipping/overflow.
The assembled working draft is 189 pages. No runtime or archive files changed.

Next work: LIST-family detail/summary/absence presentation, POINTS/USERS and
remaining command responses; controls/lifecycle/concurrency and CompuServe
amendments still prevent complete conformance. Goal remains active.

## 2026-09-05 — Apply compact modern specification type notation

Read the supplied Modern_System_Specification_Guide.docx as an editorial
reference within the established language-specification scope. Its notation
advice supplies no DECWAR mechanics and does not replace archive authority.
Converted 68 record declarations to type Name = { fields }, made 35 named
union declarations explicit with type, and expressed ten mapping declarations
with Map<K, V>. Preserved every record field name, domain and field order;
comparison evidence: logs/spec-modern-type-conversion.log. The guide file was
not copied into the repository or used as game-rule evidence.

Expanded the notation chapter to define records, tagged alternatives, collections,
absence versus outcomes and domain quantities. Map remains total over the declared
key domain. Corrected the former explanation of :=: local assignment affects a
local binding; assignment to a state property updates game state. Queries remain
without game-state effects, and emit is a separate observation effect. Retained
existing == pseudocode comparisons and mathematical = with explicit meanings.
No JavaScript numeric/object/class semantics are imported.

Final build passes 14 chapters, 403 links, 553 scenario rows and 324 source
message fragments: logs/spec-modern-type-build-final.log. Source audit passes:
logs/spec-modern-type-audit.log. Reviewed representative notation, Ship, token,
report, impact and session declarations at PDF pages 8–9, 12, 18, 42, 117 and
123–124. Fixed a dangling comparison operator across the notation page break;
final pages 8–9 reviewed. The PDF remains 189 pages. This structural review
preserves declarations; it does not prove all operation contracts or invariants.

The broader guide-alignment review still includes declaration order, consistent
operation effects, invariants, failure behavior and concurrency. Remaining game
specification work is unchanged. No game code, servers or archives changed.

## 2026-09-05 — Specify galaxy-report detail and summary lines

Added LIST/SUMMARY/BASES/PLANETS/TARGETS detail and summary line presentation
using ReportDetail/ReportTelemetry/ReportSummary values. ReportDetail now records
the already observed affiliation for faction-sensitive labels, instead of a later
planet-owner lookup. Preserved remote-base position with absent strength, ship/
Romulan OutOfRange concealment, TARGETS marker suppression, unsigned base/Romulan
list readings, signed ship shields, field/coordinate widths and build suffixes.
Summary count multiplicity, known qualifier, scope and singular/plural forms
remain unchanged. Group separators and terrain/absence paths are still open.

Source: Austin DECWAR.FOR LSTOUT/LSTSUM/LSTOBJ 1959–2141, MSG 89–125;
reviewed LSTFLG named/coordinate and group paths as preparation for remaining
presentation. Added EX-MODEL-554–563. Eight line compositions and eleven source
literals pass logs/spec-galaxy-report-line-review.log. Build passes 14 chapters,
409 links, 563 scenario rows and 324 source fragments:
logs/spec-galaxy-report-line-build.log. Audit passes:
logs/spec-galaxy-report-line-audit.log. Reviewed PDF pages 60, 148–149 and 191;
no clipping or overflow. The working draft is 192 pages. Source-derived example
review is not runtime or native parity. No game/server/archive changes.

## 2026-09-05 — Resume four captains after simultaneous timeouts

At the 04:11 UTC status check, all four alarm-fixed clients had stopped at
03:52:58.165 UTC with the same command-wait timeout and a lone CR in their
response buffers. Final decision counts were Raven 644, Scout 452, Shade 559,
Wing 570. Their existing logs under logs/automated-player-training-NAME-alarm-fix.jsonl
preserve the failures; the host records all four session endings immediately
afterward. This is different from the earlier BEL-prefix framing bug. The cause
of the simultaneous delay remains unresolved; no sleep, network, or server
cause is asserted from these logs alone.

Verified port 2423 still belonged to the existing Node host (PID 11940), then
rejoined the four captains without restarting the host or touching user
sessions. New sessions: Wing 70706, Scout 62430, Raven 57915, Shade 12834.
Same v3 policy and corrected client, 10000 rounds, 10 lives, --stay-connected.
New logs: logs/automated-player-training-NAME-resumed.jsonl. Allowed more than
the 15-second client timeout and verified continued completed actions:
logs/automated-player-resumed-check.json. No code or game-rule changes; no tests
rerun for this process restart. Automatic reconnection and scheduled monitoring
remain unimplemented; this restart does not resolve the underlying delay.


## 2026-09-05 — Align specification with updated C-family editorial guide

Applied the updated Modern_System_Specification_Guide.md as an editorial
reference only. The assembled book now uses List/Set/Map, named record and
variant fields, colon return types, C-family blocks, = assignment and == equality.
Defined local bindings, record copy-with, entity identity versus value equality,
Unit results and requires/ensures/invariant contracts. Result<T, Error> retains
existing non-rejected outcomes and a reason-bearing rejection; it does not add
rollback, atomic commands or game rules. Cancellation/lifecycle paths remain
explicit. Disambiguated TorpedoFlightOutcome from the command's TorpedoOutcome.
Added explicit World collection types and identity/order rules; unified grammar
overview ::= and keyword notation without changing matching or abbreviations.

Verified all 68 named records retain field names, order and domains, with only
collection spelling and the flight-enum rename; preserved grammar production
lines, random-call arguments/order and presentation quoted-string sequence.
Evidence: logs/spec-guide-update-consistency.log. The initial consistency check
caught missing parameter names in two random-operation declarations; restored
them and reran successfully. The initial log is retained separately. Reviewed
algorithm branch structure and record construction after notation conversion.
These checks are structural/editorial evidence, not an executable semantics test.

Build passes 14 chapters, 411 links, 563 scenario rows and 324 named source
fragments: logs/spec-guide-update-build-final.log. The first build caught a long
inline outcome overflowing its paragraph; moved that example into a code block
and rebuilt. Failed and intermediate logs retained. Source archive audit passes:
logs/spec-guide-update-audit.log. The compiled draft is 195 pages. Visually
reviewed PDF pages 8–10, 51, 87 and 104 for notation, CAPTURE, path traversal and
turn ordering. Full type-definition order, common grammar terms, invariants,
remaining responses, lifecycle/concurrency and CompuServe amendments remain.

No game code, running servers or immutable archives changed. Preserved concurrent
WORK_LOG/docs/status changes and experiments without staging them.


## 2026-09-05 — Define shared grammar vocabulary and check references

Defined twelve grammar terminal/input categories, including Integer versus the
mathematical integer domain, candidate names versus resolved identities, End
versus EmptyInput/NULL, and raw name/message fragments. Standardized the older
synopses' names, made inline SET NAME text optional consistently with its existing
prompt rule, replaced report-modifier placeholders with their actual report
selectors, and supplied ordinary Location and complete ReportSelector alternatives.
Ordered command checks, per-verb restrictions and exceptional continuations remain
normative; this is not permission to replace them with generic parser rejection.
Completed NoMatches's named payload fields without adding data.

Added tools/spec/grammar.ts to the document build. It checks duplicate/undefined
production names and balanced EBNF grouping against explicitly declared terminal
categories. Current result: 96 productions, 12 categories, no undefined names.
A valid cross-reference/literal/comment fixture and six negative fixtures pass:
logs/spec-grammar-reference-fixtures.log. TypeScript checking passes:
logs/spec-grammar-vocabulary-typecheck.log. This checker verifies document
references, not input acceptance, parse ambiguity or game semantics.

Source review: Austin WARMAC GTKN/NXTT/ANUM; DECWAR LOCATE, LSTSCN, SET,
TELL/PASWRD; existing command and creation contracts. The production-name edits
are recorded in logs/spec-grammar-vocabulary-review.log. Final book build passes
14 chapters, 418 links, 563 scenarios and 324 source fragments:
logs/spec-grammar-vocabulary-build-final.log. Reviewed PDF pages 23–24 and 60;
vocabulary table and expanded report grammar are readable without overflow.
The working draft is 196 pages. Full acceptance, definition order, invariant,
response, lifecycle/concurrency and variant work remains. No game, server or
archive changes; unrelated worktree edits preserved.


## Specification checkpoint: CompuServe startup and input amendments

Expanded the modern-language appendix with the ten-ship roster, initial
preferences and three experience presets, ordered startup recognition, the
additional DOCUMENT and HONORROLL pregame commands, Ctrl-G input behavior, and
Romulan speech checks. Added eleven amendment examples. HONORROLL persistence
and ranking, complete radio differences and other remaining contracts stay
explicitly open. Recorded numeric-value normalization separately; source
representation effects are not normative game requirements.

Validation: `logs/spec-compuserve-startup-build-final.log` checks 100 grammar
productions, 12 terminal categories, 574 scenario rows, 439 local links and 324
message fragments. The assembled PDF has 200 pages. Reviewed rendered physical
pages 195–200 for layout and legibility; checked scenario identifiers on page
195 against PDF text bounds. `logs/spec-compuserve-startup-source-review.log`
records structural source checks, not execution. Source audit passed in
`logs/spec-compuserve-startup-audit.log` (135 hashes, 83 declarations). No gameplay
or immutable archive changes. The specification remains incomplete.


## Specification checkpoint: CompuServe autonomous audiences

Defined SpeechAudience as explicit ship identities and a text qualifier; added
all three audience sets, four-choice body order, silent recipient validation,
triggering-captain ungagging and four examples. The single-ship Wolf audience
retains plural wording. Ordinary faction radio groups remain unchanged. Kept
source encoding and phantom identities out of the normative book.

Source review found CompuServe publication's initial admission retry differs
from Austin. Kept its unresolved waiting/return contract explicit instead of
claiming the shared failure behavior applies unchanged. Next source review is
TELL ROMULAN direct replies and the publication/relocation ordering, including
the incomplete underlying wait/error path. Recommended high for that concrete
concurrency/source ambiguity; no app setting was changed.

Validation: `logs/spec-compuserve-audiences-build-reviewed.log` passes 100 grammar
productions, 12 terminal categories, 578 scenario rows, 441 links and 324 message
fragments. Visually reviewed physical PDF pages 196 and 200 for examples and the
new amendment; removed a redundant trailing source paragraph that otherwise
occupied a page by itself. Structural source review is recorded in
`logs/spec-compuserve-audiences-source-review.log`; immutable-source audit passed
in `logs/spec-compuserve-audiences-audit.log`. These checks do not establish
complete semantics, original execution parity or scheduler conformance. No
runtime changes; full specification goal remains active.


## Specification checkpoint: direct Romulan reply contracts

Drafted CompuServe TELL's direct-reply observation/outcome types, recipient-order
amendment, text-composition operation and ordered relocation operation. Preserved
ROMULAN-before-repeat checking, separate replies for repeated recipients,
ordinary recipient accumulation, reply-attempt suppression of NoRecipients,
singular reply punctuation, qualifier branching and horizontal-outer relocation
search. Added nine examples. The origin-wording query is explicitly incomplete;
no geographic inference, arbitrary new wording or wait-completion guarantee was
introduced. Waiting and concurrent actor/Romulan changes remain open.

Build passed in `logs/spec-compuserve-replies-build-final.log`: 100 grammar
productions, 12 terminal categories, 587 scenario rows, 449 local links and 324
message fragments. PDF has 204 pages. Visually reviewed physical pages 197 and
201–204. Source audit passed in `logs/spec-compuserve-replies-audit.log`.
Structural/text checks passed in
`logs/spec-compuserve-replies-source-review-final.log`; the initial check used an
unanchored source-label search and failed before assertions, recorded in the
initial review log. Corrected the check to select actual labels. No game-code or
archive changes; no original-execution, concurrent or full-conformance claim.

Answered the user's draft-status question while continuing this review. The
next difficult review remains publication wait/error and lifecycle ordering,
for which high was recommended. The full specification goal remains active.


## Specification checkpoint: Austin command acquisition sites

Specified initial MOVE/IMPULSE coordinate prompting separately from the retry
after an own-sector target, and separated TORPEDOS initial, burst and target
input policies. Blank input cancels; mode-only Empty can repeat at the documented
sites. Fresh continuations resolve their own coordinate mode. Retained one early
movement damage draw and deadline across prompts. Narrowed the unresolved cases
to specific missing-value paths instead of broadly treating blank input as
ambiguous. Added seven semantic examples; no invented rejection/destination.

`logs/spec-austin-input-sites-build-final.log` passes 100 grammar productions,
12 terminal categories, 594 scenario rows, 449 links and 324 message fragments.
Initial build correctly caught a blank separator breaking the new example rows;
removed it and retained the failed build log. Reviewed PDF physical pages 48,
57, 58 and 196. Source-structure checks passed in
`logs/spec-austin-input-sites-source-review.log`; audit passed in
`logs/spec-austin-input-sites-audit.log`. No runtime/archive changes and no claim
of exhaustive input or original-execution parity. Goal remains active.


## Specification checkpoint: USERS terminal rows

Defined UserRow rendering, LONG headers, unconditional faction separator and
six-field rows in every verbosity. Added AccountLabel as a terminal-binding
value while retaining opaque game account identity. Preserved account padding,
fixed-width speed/session fields and privileged recorded coordinate components,
including zero relative displacement. Six new examples cover these rules.

Source review confirmed both Austin and CompuServe ordinary STAT use a
three-character session field; the two-character STAT.Y field is for pregame
feedback. No false USERS variant was added. Binding domains and pregame relative
origins remain explicit gaps rather than invented metadata.

`logs/spec-users-presentation-build-final.log` passes 100 grammar productions,
12 terminal categories, 600 scenario rows, 455 links and 324 message fragments.
PDF has 207 pages; reviewed physical pages 153, 154, 197 and 198 and checked the
continued scenario IDs against PDF text bounds. Source-structure checks are in
`logs/spec-users-presentation-source-review.log`; audit passed in
`logs/spec-users-presentation-audit.log`. No game or archive changes, and no full
host-binding or concurrent-report equivalence claim. Goal remains active.


## Specification checkpoint: Austin coordination boundaries

Added an abstract coordinated-phase model with WORLD_CHANGE and SHARED_SERVICE
domains, named boundaries within admission, relocation, conversion/capture,
planet damage, release, radio and administrative operations. Documented that
administrative statistics clearing shares the service domain with radio, that
ending a nested phase ends the same session's coordination in both domains,
and that input/time waiting does not itself end a phase. Admission now explicitly
ends coordination before score clearing and ship reservation. Added six trace
examples. The book prescribes overlap constraints rather than memory keys or a
mutex implementation; reentrancy, races, interruption, cross-galaxy scope and
full monitor behavior remain open. CompuServe is explicitly not assigned the
Austin coordination scheme.

Validation: `logs/spec-coordination-build-reviewed.log` passes 100 grammar
productions, 12 terminal categories, 606 scenario rows, 475 links and 324 message
fragments. Initial build detected an overfull administrative-service line;
rewrapped it. Visual review then exposed a poorly allocated table column; moved
the long boundary descriptions into the wide middle column and rebuilt.
Reviewed physical pages 18–20, 136, 201 and 211 (page 18 unchanged by the table
reorder). Source-order checks passed in `logs/spec-coordination-source-review.log`;
source audit passed in `logs/spec-coordination-audit.log`. No executable/archive
changes or proof of full scheduler behavior. Full specification goal stays active.

### Specification checkpoint: command acquisition and elapsed waiting

Defined Austin main-command acquisition as a typed operation, including ordered
prompt checks, pending combat/radio delivery, prior command delay, input readiness,
and the distinct early-pending and post-token interrupt paths. Defined elapsed
waiting with its initial duration cap and early-return continuation. Recorded the
CompuServe waiting amendment without importing Austin coordination semantics.
These are specification changes only; transport bindings and remaining lifecycle
questions stay explicit.

Validation: `logs/spec-command-control-build-reviewed.log` passes with 100 EBNF
productions, 12 terminal categories, 615 scenario rows, 14 chapters, 488 local
links and 324 source-verified message fragments. The 213-page PDF was visually
checked at physical pages 112, 138–140, 203–204 and 213 for the changed sections.
`logs/spec-command-control-source-review.log` records source-order checks;
`logs/spec-command-control-audit.log` verifies preserved source hashes and data.
Scenario validation is structural, not original-executable behavioral parity.
Remaining work includes availability/reentry, output contracts, concurrency and
whole-specification consistency review.

### Specification correction: inactive Austin availability scan

Following CHKSEQ into WARMAC.MAC 3078–3079 shows an immediate unconditional
return. Removed the implied prompt-boundary availability scan and added
EX-MODEL-592: this boundary does not automatically reclaim a disappeared
session's ship. Unreachable cleanup statements do not define a game operation.
Source review: `logs/spec-prompt-availability-source-review.log`. Build passed
in `logs/spec-prompt-availability-build-reviewed.log` with 616 structural scenario
rows and 489 links; physical PDF pages 139 and 204 were visually checked.
The first build caught a separated table row; fixed the separator and retained
`logs/spec-prompt-availability-build.log`. Runtime and archives unchanged.

### Specification checkpoint: saved condition and continuation boundaries

Defined SavedShipCondition in domain types and replaced the broad whole-ship
resume implication with the actual saved fields. Documented conditional RSTART
occupancy checks before coordination, restoration, refreshed reporting and
retained commission timing. Explicitly retained the unresolved TRAP caller
identity: it clears who before invoking RSTART. No automatic reconnect or new
RESUME command is inferred. Source evidence is DECWAR.FOR 1082–1180, 4516–4526
and PARAM.FOR 43–56.

`logs/spec-saved-condition-source-review.log` verifies source structure and
records the continuation limitation. `logs/spec-saved-condition-build.log`
passes the book checks; physical PDF pages 141–142 were visually inspected.
Runtime and immutable archives were not changed. Remaining work includes
admission/concurrent lifecycle, final reporting and overall conformance review.

### Specification checkpoint: POINTS terminal presentation

Added ScoreReport presentation: heading columns and padded names, short/long
category labels and fixed LONG annotations, numeric precision/field widths,
blank ship cells in accounting rows, and literal versus conditional line endings.
The semantic command links this recipe. Zero denominators and concurrent count
observations remain explicit gaps; no historical arithmetic exception or invented
zero display is imposed. Source: DECWAR.FOR POINTS, MSG.MAC score fragments and
WARMAC.MAC numeric/string output.

`logs/spec-points-presentation-source-review.log` verifies source layout choices.
`logs/spec-points-presentation-build.log` passes with 100 grammar productions,
616 scenario rows, 501 links and 324 named message fragments. Visually reviewed
physical PDF pages 160–162, including both formatting tables. Runtime/archive
files unchanged. Other terminal recipes and the full lifecycle/concurrency review
remain on the active specification goal.

### Specification checkpoint: galaxy-report absence messages

Added presentation for named-ship/Romulan absence, sensor-range failures,
missing-object coordinate reports and NoMatches affiliation/kind/scope wording.
Coordinate messages retain their forced formatting modes and conditional ending;
named absence reports retain unconditional endings. Identified terrain formatter
fallthrough as a remaining gap rather than inventing a label-only terrain row.

`logs/spec-report-absence-source-review.log` records static source checks.
`logs/spec-report-absence-build-reviewed.log` is the final successful book build;
physical PDF pages 159–160 were visually inspected. The earlier build predates
the corrected coordinate-ending wording and is retained in
`logs/spec-report-absence-build.log`. No runtime/archive changes. Full grouped
separators, terrain semantics and concurrent reporting remain under review.

### Specification checkpoint: galaxy-report section boundaries

Defined entry, named-group and deferred-class conditional line requests,
including TARGETS exceptions and omission of empty classes. Corrected the
NoObjectAt relative origin to the viewer position at formatting, consistent
with PRLOC and the detail contract. No new observation syntax or game effect.

`logs/spec-report-boundaries-source-review.log` verifies source ordering and
TARGETS branch structure. `logs/spec-report-boundaries-build.log` passes;
physical PDF pages 158 and 160 were visually inspected. Terrain fallthrough,
concurrent reporting and interrupted output remain separate open work. Runtime
and archive files unchanged.

### Specification requirement-level review — September 6

Added a current requirement/evidence/completion matrix to language-coverage.md
after reviewing the plan criteria, book manifest, scope/conformance text and
builder. Corrected stale terminal gap summaries for recently completed report
recipes. The matrix explicitly distinguishes source inventory, draft contracts,
structural checks and remaining semantic proof. It retains the full goal and
identifies variant, lifecycle/concurrency, profile and whole-book review work.

`logs/spec-requirements-review-check.log` passes the document checks;
`logs/spec-requirements-review-audit.log` verifies immutable sources/generated
evidence. All coverage-record links resolve locally. This companion-record edit
does not change the assembled book or gameplay and does not assert goal completion.

### Specification checkpoint: CompuServe standings source selection

Added the service-class distinction and explicit HONORROLL source sequence,
including empty versus open-failure behavior and source-boundary interruption.
This is a platform-independent description of SHOSTA 5885 onward, not a disk
format or new payment action. Record membership, ranking, lifetime and complete
output remain unfinished. DOCUMENT's continued-literal whitespace remains open.

`logs/spec-comp-standings-selection-source-review.log` records source checks.
The final build is `logs/spec-comp-standings-selection-build-reviewed.log`;
physical PDF page 214 was visually inspected after the final wording edit.
Earlier build output is retained. Runtime and immutable archives unchanged.

### Specification checkpoint: CompuServe standings records and placement

Defined typed standings values and FindStandingsPlacement over valid lists of
at most ten records. Preserved descending score, longer elapsed tie preference,
only-earlier duplicate-account suppression and shift/drop insertion. Corrected
primary-versus-memorial terminology: live update routing does not use the
commented memorial offset. The caller proves the 1000-unit entry threshold is
elapsed milliseconds, not score. Persistence, status/counters, dates and failures
remain separate work.

`logs/spec-comp-standings-records-source-reviewed.log` passes static checks;
the initial extraction failed on whitespace after the label and was corrected.
`logs/spec-comp-standings-records-build.log` passes. Physical PDF pages 215–216
were visually reviewed. No gameplay or immutable archive changes.

### Specification checkpoint: standings callers and examples

Connected missing-status records to fatal command acquisition and world-end
callers, preserving elapsed-before-POINTS and update-before-release ordering.
Added EX-COMP-25–31 for ranking ties, duplicate accounts, elapsed threshold,
empty/unavailable sources and total-destruction record status. These are
specification examples, not claims of executing the original program.

`logs/spec-comp-standings-callers-source-review.log` verifies caller ordering
and marker choice. `logs/spec-comp-standings-callers-build.log` passes; physical
PDF pages 212 and 217 were visually inspected. Other exit status, counters,
persistence and report formatting remain unfinished. Runtime/archive unchanged.

### Specification checkpoint: Honor Roll groups

Added primary/memorial standings collections and group observations. Defined
faction ordering from leading primary scores when both primary lists are
present, Federation on ties, and primary-before-memorial ordering. Empty-primary
ordering remains explicit: an absent record is not silently assigned score zero.
Group award descriptions are report headings, not new game resources.

`logs/spec-comp-standings-groups-source-review.log` checks the source comparison
and group calls. `logs/spec-comp-standings-groups-build.log` passes; physical
PDF pages 217–218 were visually reviewed. Persistence, remaining domains and
complete terminal/interruption behavior remain active work. Runtime unchanged.

### Specification checkpoint: conformance domains and claims

Defined command-language, game-semantics and terminal assessment domains, with
revision/variant/binding/evidence declarations and draft-only scoped claims.
Separated implementation-defined choices from unresolved questions; included
intermediate-state, nondeterminism, random-replay and terminal evidence limits.
These criteria organize assessment under the project scope and add no gameplay
rule or implementation architecture. Updated the scope link and coverage matrix.

`logs/spec-conformance-domains-build.log` passes. Physical PDF pages 165–166
were visually inspected. Criteria are now drafted; they do not certify the
whole specification or any implementation. Full semantic review remains active.
Runtime and source archives unchanged.

### Specification checkpoint: type declaration and result-tag review

Reviewed included-book named type declarations and clarified operation-local
result alternatives, singleton outcomes in Result, and opaque/ordered identity
declarations. Published and Selected do not imply one global record payload.
`logs/spec-type-declarations-review.log` inventories 218 named declarations with
no duplicates; it explicitly does not claim field/type or semantic validation.
The initial heuristic capitalized-word scan was triage, not a type checker.

`logs/spec-type-notation-build.log` passes; physical PDF page 9 was visually
inspected. Property access and invariant review remain unfinished. Runtime and
source archives unchanged.

### Specification checkpoint: property names and state-effect scope

Checked common Ship/Captain/World property references against their declared
fields; no unmatched names in this inventory. Clarified that unchanged-state
requirements constrain an operation's own effects, and completed-state
postconditions are not automatically intermediate-state invariants. This retains
the existing concurrency and maintained-counter contracts.

`logs/spec-state-property-review.log` records the limited name audit and its
non-proof of alias binding, units or optional presence.
`logs/spec-state-effect-scope-build.log` passes; physical PDF pages 10–11 were
visually inspected. Stronger type/invariant and behavioral review remain open.
No runtime or source archive changes.

### Specification checkpoint: CAPTURE surrender refusal

Bound SurrenderRefused to failed WORLD_CHANGE entry after target checks and
before capture effects, without a retry. Kept stale-target outcomes and full
entry-failure/wait binding explicit rather than inventing a second validation
or refusal probability. Added EX-MODEL-593.

`logs/spec-capture-refusal-source-review.log` verifies the ordering and return
branch. `logs/spec-capture-refusal-build.log` passes; physical PDF pages 56 and
213 were visually inspected. Coverage now separates the known refusal cause
from the unresolved coordination binding. Runtime/archive unchanged.

### Specification checkpoint: BUILD conversion ordering

Specified ConstructionCrewBusy as failed phase entry after the fifth-stage
build and pending points, with no retry. Made discovery transfer before planet
removal explicit and described the established partial state at its world-end
check: points/count/discovery changed, planet removed, replacement base position
and strength not yet installed. Intermediate sector/concurrent identity cases
remain unresolved; no atomic conversion or rollback is introduced.

`logs/spec-build-conversion-order-source-review.log` verifies event order.
`logs/spec-build-conversion-order-build.log` passes; physical PDF pages 54–56
were visually inspected. The first image lookup used an unpadded filename; the
actual padded render files were then inspected. Runtime/archive unchanged.

### Specification checkpoint: BUILD boundary examples

Added EX-MODEL-594–595 for retained fifth-stage effects after failed phase
entry and world termination before replacement-base installation. Reviewed
against BUILD/ENDGAM and the existing maintained-count/removal contracts.
These supplement, rather than duplicate, the earlier capacity-failure and
normal-conversion examples.

`logs/spec-build-boundary-examples-review.log` records source reasoning;
`logs/spec-build-boundary-examples-build.log` passes. Physical PDF page 213
was visually inspected. These are specification scenarios, not native runtime
tests. No game or source archive changes; full goal remains active.

### Specification: CompuServe departure markers

Reviewed DECWAR.FOR 132–169, 333–350 and WARMAC.MAC initialization/fatal entry
1155/6106, plus STAZAP reset 6213. Documented common departure's false missing
marker for confirmed QUIT, hangup-at-QUIT and immediate movement death absent
an environment failure; fatal environment departure selects true. Kept this
distinct from GETCMD fatal checks and did not invent a new gameplay hazard.
Added EX-COMP-32–34 and updated normalization/coverage notes. No gameplay edits.

Validation: logs/spec-comp-departure-source-review.log records focused branch
and order assertions plus source review; not native execution. Full build in
logs/spec-comp-departure-build.log passed: 629 scenario rows, 100 productions,
324 source fragments, 14 chapters and 521 links. Archive audit passed in
logs/spec-comp-departure-audit.log. Inspected rendered physical pages 217 and
222: legible prose/table, no clipping. Remaining standings counters, persistence
and failure-continuation work stays open; full goal remains active.

### Specification: CompuServe statistics values and write decisions

Added CompuServeStatistics, StandingUpdate and PrepareStandingUpdate to the
variant appendix. Source UPDSTA (WARMAC.MAC 5694–5883) establishes marker-driven
reported-loss counting, mission values from the selected statistics, write
requirements even for rejected missing-marked entries, PAYING-first read
selection and own-class write attempts. Kept IO/durability and partial-data
binding limits explicit, and did not infer physical destruction from counters.
Added EX-COMP-35–38 and normalization/coverage notes. No gameplay changes.

Validation: logs/spec-comp-statistics-source-review.log contains branch/order
assertions and scoped manual review. logs/spec-comp-statistics-build.log passed
with 633 scenario rows, 100 productions, 324 fragments and 14 chapters. Visually
reviewed PDF physical pages 217, 224–225: readable ADTs, prose and examples with
no clipped content. Prior archive audit remains applicable; no archive or
runtime edits. Admission counters, full output and interrupted storage access
remain review items. Goal remains active.

### Specification: CompuServe commission numbering

Added RecordCommission and CommissionNumbers; distinguished shared galaxy
number from stored statistics numbers. Reviewed WARMAC.MAC 5589–5667 and SETUP
444–449. Defined PAYING/NON_PAYING successful-access sequences, final-write
opening failure, and mission numbering before reservation. Intermediate
NON_PAYING access failures remain explicitly outside that normal contract.
Added EX-COMP-39–41; updated normalization and coverage. No game-code changes.

Validation: logs/spec-comp-numbering-source-review.log passed focused source
branch/order assertions. logs/spec-comp-numbering-build.log passed: 636 scenario
rows, 100 grammar productions, 324 source fragments, 14 chapters and 529 links.
Inspected PDF physical pages 217 and 224–225: readable contract, types and
examples with no clipping. No archive edits; the existing archive audit remains
applicable. Remaining work includes full terminal output and environment failure
bindings, and the full cross-chapter audit. Goal remains active.

### Specification: Honor Roll headings and pending interrupts

Defined exact CompuServe overall/source/group/column heading recipes and explicit
HONORROLL width behavior. Pending-interrupt checks are at group entry,
post-primary traversal and source completion; no per-row check was invented.
Reviewed WARMAC.MAC 5885–6103, CRLF 2053, OCHR/OSTR and SETUP explicit callers.
Updated stale forthcoming-amendment prose and added EX-COMP-42–44.

Validation: logs/spec-comp-honor-headings-review.log checks seven heading recipes
against source literals and the row traversal's separate width/no-interrupt-test
properties. This is source evidence, not native terminal execution. Full build
logs/spec-comp-honor-headings-build.log passed: 639 scenarios, 100 productions,
324 fragments, 14 chapters, 534 links. Visually reviewed PDF physical pages 217
and 223–225; no clipping or unreadable text. No gameplay or archive changes.
Row numeric conversion, account/ship padding and date binding remain under
review, alongside the full specification's other open work. Goal stays active.

### Specification: Honor Roll row values and ordinary numeric display

Added FormatHonorRollRow and StandingDateParts; specified marker/name/account
fields, Credits, elapsed minutes, date components and narrow/wide suffixes.
Preserved account-padding and ship-prefix output loops. Recorded explicit signed
rounding and date-epoch normalization in NORMALIZATION.md without changing
ranking, gameplay, runtime or legacy bytes. Added EX-COMP-45–48.

Validation: logs/spec-comp-honor-rows-review.log checks source constants, every
valid account-label width, ship-prefix lengths 0–10, nonnegative source rounding
samples and explicit negative normalization. First build failed on an incorrect
anchor (logs/spec-comp-honor-rows-build.log); fixed to users-reports. Final build
logs/spec-comp-honor-rows-build-reviewed.log passed: 643 scenarios, 100 productions,
324 fragments, 14 chapters and 540 links. Inspected physical PDF pages 218 and
226–227, with legible rows, signatures and prose. These checks are not native
terminal parity or calendar certification. Calendar/transport bindings, malformed
records and other cross-chapter review remain; full goal stays active.

### Specification: Austin terrain source-to-model review

Traced LSTFLG coordinate admission, LSTOBJ prefix/dispatch, LIST initialization
and LSTVAR clearing bounds. Terrain now retains its query Position. The book
states the proven label/padding prefix and explicitly leaves the full suffix
unresolved rather than adding terrain energy or importing scratch history.
Detailed source analysis is in docs/spec/evidence.md, outside the compiled book.
Updated commands, presentation, normalization and coverage; no gameplay edits.

Validation: logs/spec-austin-terrain-review-source.log passed focused source-path
and clearing-boundary assertions; HISEG identifies EROM as Romulan energy.
logs/spec-austin-terrain-review-build.log passed: 643 scenarios, 100 productions,
324 fragments, 14 chapters and 540 links. Inspected PDF physical pages 67 and
163: readable ADT and scoped presentation text. This is a reviewed ambiguity,
not completed terrain terminal parity. The full goal remains active.

### Specification: Austin even-item TORPEDOS input

Reviewed LOCATE and TORP original-line versus continuation paths. Defined the
complete four-item/count-one and six-item/count-one-or-two cases using resolved
numeric values, retaining location validation before count interpretation.
Narrowed unresolved cases to actual absent target components and Empty target
continuations rather than rejecting all even forms. Added EX-MODEL-596–598;
updated grammar, command contract, normalization and coverage. No gameplay edits.

Validation: logs/spec-austin-torpedo-even-review.log checks source branches and
all nine even-item/burst-count selection combinations. This is source derivation,
not a native torpedo run or an assignment to missing values. Full build in
logs/spec-austin-torpedo-even-build.log passed: 646 scenario rows, 100 productions,
324 source fragments, 14 chapters and 542 links. Inspected physical PDF pages
61–62 and 214–215, with readable contract tables and examples. Remaining
missing-component, interruption and cross-chapter review keeps the goal active.

### Specification: modern notation and field meaning review

Reviewed included-book machine vocabulary and the supplied Modern System
Specification Guide. Clarified Ship.lifeSupportReserve as a signed count and
replaced the misleading “five life-support turns” initialization wording. Linked
its decrement/zero/negative/docking behavior to established contracts and source.
Moved CompuServeStatistics before its first RecordCommission use. Recorded the
limited review scope and outstanding full type/optional/unit audit in coverage.

Validation: logs/spec-field-meaning-review.log passed focused source-order and
declaration-order checks. Initial build caught a guessed CompleteTurn anchor
(logs/spec-field-meaning-build.log); corrected it to turn-accounting. Final
logs/spec-field-meaning-build-reviewed.log passed: 646 scenarios, 100 productions,
324 fragments, 14 chapters and 546 links. Inspected physical PDF pages 15 and
228–229: readable field explanation and type/operation order. No gameplay,
archive or normalization-rule changes. Full goal remains active.

### Specification: random replay and finite-source claims

Added TakeRandomEvent validation with ordered exhaustion/captain/request/value
failures, full-versus-prefix endpoints, and explicit collection-order context.
Clarified finite-source disclosure of attainable unit values, integer mapping,
initialization/advancement and approximation. No generator, tolerance, game
command, gameplay draw or new probability was selected. Added EX-MODEL-599–602;
updated normalization and coverage. Full draw-site/multiplayer audit remains.

Validation: logs/spec-random-replay-review.log checks relevant declarations and
failure order and records scoped consistency review; it is not an executed replay
engine or statistical certification. logs/spec-random-replay-build.log passed:
650 scenarios, 100 productions, 324 fragments, 14 chapters and 546 links.
Inspected PDF physical pages 91–92 and 217: readable types, validation rules and
examples. No gameplay or archive edits. Full specification goal remains active.

### Specification: movement and weapon random-entry audit

Compared Austin MOVE/IMPULSE, PHACON and TORP entry/validation choice order with
the declared operations. Added an evidence table covering nine scoped paths.
Made explicit that even weak phasers consume their heat-test choice and that
late torpedo own-sector detection retains launch-deflection choices. Preserved
the previously documented nonstar obstruction-draw normalization. Added
EX-MODEL-603–605; no gameplay changes or new normalization rules.

Validation: logs/spec-random-entry-audit-review.log records focused source-order
assertions and weak-phaser thresholds, including explicit guard checks. It is
not a complete nested draw ledger or native seeded parity. Full build in
logs/spec-random-entry-audit-build.log passed: 653 scenarios, 100 productions,
324 fragments, 14 chapters and 546 links. Inspected PDF physical pages 59, 63
and 217; readable changed rules and examples. Full nested/context, multiplayer
and cross-chapter audit remains; goal stays active.

### Specification: shared weapon-impact ordering

Audited Austin TORDAM/PHADAM direct choices and critical-base resolution.
Clarified retained torpedo a/b/c draws and explicit base destruction choice
before the fatal-strength condition. Added EX-MODEL-606–608 and source evidence;
made the existing unused critical-ship compound-choice normalization explicit.
No gameplay or archive changes.

Validation: logs/spec-shared-impact-review.log passed focused source-order and
example arithmetic checks. Read-only compiled inspection logs
spec-shared-hit-critical-image.log and spec-shared-hit-destruction-image.log
confirm the relevant call order, not executed impacts or native seeded parity.
logs/spec-shared-impact-build.log passed: 656 scenarios, 100 productions,
324 fragments, 14 chapters and 546 links. Inspected PDF physical pages 99, 102,
and 219; readable rules, pseudocode and final example. Nested displacement,
caller continuation and multiplayer review remain; full goal stays active.

### Specification: displacement boundary audit

Reviewed JUMP candidate range, distance and occupancy gates and empty/black-hole
branches. Clarified single-candidate, no-random-choice behavior and unchanged
docking/condition on rejection. Added EX-MODEL-609–610, evidence and scoped
coverage. Existing fractional-coordinate normalization remains unchanged.

Validation: logs/spec-displacement-boundary-review.log passed source-order and
branch checks; logs/spec-displacement-boundary-build.log passed with 658 scenarios,
100 productions, 324 fragments, 14 chapters and 546 links. Inspected PDF physical
pages 105 and 219 for readable changed prose and examples. No gameplay/archive
changes. Concurrent sector query/update ordering remains open; goal stays active.

### Specification: coordinated-entry failure continuations

Added a central seven-path table for admission, relocation, fifth BUILD,
CAPTURE, player/Romulan torpedo planet updates and nova planet updates.
Distinguished retry, refusal and skip outcomes and retained earlier effects.
Cross-checked existing operation clauses; no failure probability or timeout
was invented. Environment failure causes and remaining callers stay open.

Validation: logs/spec-coordination-failures-review.log passed source-branch
checks; logs/spec-coordination-failures-build.log passed 658 scenarios,
100 productions, 324 fragments, 14 chapters and 546 links. Inspected PDF pages
20 and 21: readable table and phase context. No gameplay or archive changes.
Full goal remains active.

### Specification: session and radio entry follow-up

Added five checked entry-failure continuations: commission release, conditional
resume, radio capacity admission, publication and recipient removal. Recorded
GETMSG's search-failure indicator clearing separately as an unresolved abstract
reception outcome; did not infer deletion or delivery from stale body storage.

Validation: logs/spec-session-radio-entry-review.log checks source branches;
logs/spec-session-radio-entry-build.log passed 658 scenarios, 100 productions,
324 fragments, 14 chapters and 546 links. Inspected PDF physical pages 21–22;
table and continuation text readable. No gameplay/archive changes. Full goal
remains active, including reception-failure and concurrency semantics.

### Specification: reconcile reception failure with normalization

Found that the prior session/radio audit overstated an open question:
NORMALIZATION.md already maps GETMSG no-result/stale-body behavior to NoMessage.
Made that outcome explicit in reception and coordination, preserving unread
membership and emitting no repeated observation. Corrected evidence/coverage
claims and added EX-MODEL-611. No new normalization or gameplay change.

Validation: logs/spec-reception-failure-review.log checks the prior policy and
source failure branch; logs/spec-reception-failure-build.log passed 659 scenarios,
100 productions, 324 fragments, 14 chapters and 546 links. Inspected PDF physical
pages 21, 127 and 220: readable rule, table and example. Failure timing and
interruption conditions remain open. Full goal stays active.

### Specification: refresh requirement-level completion findings

Reconciled the current requirement matrix with delivered special-input,
standings, randomness and coordination clauses. Corrected stale scenario count
and broad outstanding-work descriptions. Narrowed two Honor Roll open-question
paragraphs to remaining calendar, malformed-record, persistence, ordering and
control-transfer gaps. No new game semantics or completion claim.

Validation: logs/spec-completion-matrix-review.log checks manifest/count/section
evidence; logs/spec-completion-matrix-build.log passed 659 scenarios,
100 productions, 324 fragments, 14 chapters and 546 links. Inspected PDF physical
pages 227–229; readable updated limitations and context. Full source/type/domain
review remains required. Goal stays active.

### Specification: DOCUMENT separator evidence boundary

Checked exact CompuServe SETUP literal bytes, OUT/OSTR forwarding and SKIP's
CR/LF. Consulted existing local FORTRAN V5 text sections 2.2.3/2.3.1. Narrowed
U-C-DOCUMENT to compiler short-line padding; the output routine inserts no
separator and the continuation supplies one explicit space. No compiler-version
or original-output claim is inferred. Recorded the evidence needed to close it.

Validation: logs/spec-document-literal-review.log passed source-byte and output
routine assertions. Evidence-only edit outside book.json; no PDF rebuild needed.
No gameplay/archive changes. Other specification work remains available and
the full goal stays active.

### Specification: quantity arithmetic contract

Defined real magnitudes with distinct units, same-kind arithmetic, scalar
scaling, percentage-point interpretation and TimePoint/Duration relationships.
Kept Coordinate/Stardate discrete and field-specific bounds/clamps explicit.
This consolidates the existing ordinary-arithmetic policy without changing
formulas or grammar. Added normalization rationale and scoped coverage.

Validation: logs/spec-quantity-arithmetic-review.log checks representative
existing combat, score and wait contracts; logs/spec-quantity-arithmetic-build.log
passed 659 scenarios, 100 productions, 324 fragments, 14 chapters and 546 links.
Inspected PDF physical pages 12–13; readable quantity and geometry sections.
No gameplay/archive changes. Whole-book dimensional/type review remains; full
goal stays active.

### Specification: correct installation membership

Corrected a contradictory model sentence claiming destruction removes every
installation record. Base destruction retains a fixed record for BUILD reuse;
planet removal changes current planet membership. Distinguished record count,
maintained counters, sector presence and operation eligibility. Source and
existing BUILD/weapon/removal clauses agree; no runtime change.

Validation: logs/spec-base-membership-review.log checks destruction/reuse source
and existing contracts. logs/spec-base-membership-build.log passed 659 scenarios,
100 productions, 324 fragments, 14 chapters and 546 links. Inspected PDF physical
pages 14 and 17; readable record and installation clauses. Full identity/query
and concurrency review remains; goal stays active.

### Specification: core query domains

Made identity-query domains explicit, distinguishing fixed rosters, current
planet/beam membership, participating captains and Optional sector results.
Absent-target operations check before lookup; invalid lookup supplies neither
a default record nor a new diagnostic. Concurrent check/use remains separately
constrained. No gameplay or grammar change.

Validation: logs/spec-query-domains-review.log checks existing signatures and
membership/removal clauses; logs/spec-query-domains-build.log passed 659 scenarios,
100 productions, 324 fragments, 14 chapters and 546 links. Inspected PDF physical
pages 8–9: readable table and operation context. Full query-use and lifecycle
audit remains; goal stays active.

### Specification: tractor lookup and notice ordering

Made FollowTractorBeam's Optional ID unwrap and record lookup explicit.
Changed release's delivery wording to publication after both endpoint references
are cleared, consistent with delayed combat notices and TRCOFF. Existing OFF
guard and following normalization retained; no new collision policy.

Validation: logs/spec-tractor-contract-review.log checks source ordering and
existing clauses. logs/spec-tractor-contract-build.log passed 659 scenarios,
100 productions, 324 fragments, 14 chapters and 546 links. Inspected PDF physical
pages 99–100: readable release and following contracts. No gameplay/archive
changes. Concurrent and crowded following remains unresolved; goal stays active.

### Specification: Romulan base-group eligibility

Added DIST's omitted maintained-base-count guard before faction base scanning.
The guard is independent of record strength and sector presence, which matters
in unfinished installation transitions. Added EX-MODEL-612 and source evidence;
updated current coverage count. No new target fallback or pursuit radius.

Validation: logs/spec-target-base-count-review.log checks source guard order
and example range. logs/spec-target-base-count-build.log passed 660 scenarios,
100 productions, 324 fragments, 14 chapters and 546 links. Inspected PDF physical
pages 123 and 222; readable rule and example. No gameplay/archive changes.
No-target/all-distant and concurrent selection remain open; goal stays active.

### Specification: DOCK supply count guards

Preserved DOCK's maintained captured-planet-count guard, omitted by the prior
clause, and explicitly retained the absence of a corresponding base-count guard.
Added EX-MODEL-613–614 and source evidence. Replenishment formulas unchanged.

Validation: logs/spec-dock-count-guards-review.log checks source guard order,
commission check and example arithmetic. logs/spec-dock-count-guards-build.log
passed 662 scenarios, 100 productions, 324 fragments, 14 chapters and 546 links.
Inspected PDF physical pages 44 and 222; readable clause and examples. No
gameplay/archive changes. Concurrent ownership and supply scans remain open;
full goal stays active.

### Specification: resolve inactive-base placement rule

Closed the destroyed-base-position placement question for valid retained
records: PLACE checks all opposing base positions when the maintained count
is positive, without strength/presence filters; zero count skips exclusion.
Non-player placement bypasses it. Reviewed BASKIL's distinct count guards and
confirmed its existing contract. No new safe-spawn policy or normalization.

Validation: logs/spec-placement-base-records-review.log checks source branch
and filter behavior. logs/spec-placement-base-records-build.log passed 662
scenarios, 100 productions, 324 fragments, 14 chapters and 546 links. Inspected
PDF physical page 146: readable resolved rule and remaining limits. No gameplay
or archive changes. Reinitialization phase, exhaustion and concurrent placement
remain open; full goal stays active.

### Specification: installation eligibility cross-check

Compared PLACE, DIST, DOCK, BASKIL, BASPHA and BASBLD group/record gates.
Corrected EnemyBaseDefense's omitted maintained-base-count guard; made
BaseReplenishment's record-only eligibility and faction/base order explicit.
Recorded the comparison in evidence. Resource formulas unchanged.

Validation: logs/spec-installation-eligibility-review.log checks relevant source
gates/order; logs/spec-installation-eligibility-build.log passed 662 scenarios,
100 productions, 324 fragments, 14 chapters and 546 links. Inspected PDF physical
pages 118 and 120; readable defense/replenishment clauses. No gameplay/archive
changes. Concurrent scans and ownership observations remain open; goal active.

### Specification: CompuServe origin qualifier table

Defined all 46 exact origin-code qualifiers and absent/unlisted fallback.
Preserved source spellings and trailing spaces. Confirmed that commented
CLx/CSx/Qxx fallbacks cannot match after the actual masks; did not repair them.
Origin-code acquisition remains an environment binding, not geolocation.
Updated evidence, normalization and coverage.

Validation: logs/spec-origin-qualifiers-review.log checks table keys/spaces and
masked comparison bounds. logs/spec-origin-qualifiers-build.log passed 662
scenarios, 100 productions, 324 fragments, 14 chapters and 546 links. Inspected
PDF physical pages 241–242; readable complete table. Archive audit passed in
logs/spec-source-baseline-audit.log: 135 hashes, 83 declarations, 33 game and
16 pregame commands, 324 strings. Recent committed diff is documentation only;
unrelated worktree changes remain untouched. Full goal stays active.

### Specification: CompuServe ordinary coordination amendment

Replaced broad coordination-status prose with source-derived targeted release,
repeated entry for successfully held resources, positive-wait release/reacquire
and fresh-input behavior. Nonpositive waits return before release. Distinguished
remembered resource from all holdings and delayed reacquisition from completed
input/time. Full mapping, pending/interrupted entry and environment limits remain.

Validation: logs/spec-comp-coordination-review.log checks branch ordering and
release paths. logs/spec-comp-coordination-build.log passed 662 scenarios,
100 productions, 324 fragments, 14 chapters and 547 links. Inspected PDF physical
pages 243–244; readable ordinary amendment and open scope. No gameplay/archive
changes. Full goal stays active.

### Specification: CompuServe input-readiness waiting

Added the ordinary input-readiness contract separately from fresh-line input
and elapsed waiting: buffered/initialization input bypasses suspension; positive
wait releases and reacquires the remembered resource; nonpositive polling does
not; readiness tests include hangup and interrupt. No PAUSE cap/deadline loop.
Recorded public/internal entry selection evidence and the still-unresolved
three-sector movement coordination grouping outside the normative book.

Validation: logs/spec-comp-input-readiness-review.log checks source branch order
and absence of PAUSE timing logic. logs/spec-comp-input-readiness-build.log
passed 662 scenarios, 100 productions, 324 fragments, 14 chapters and 548 links.
Inspected PDF physical page 244: readable complete waiting section. No gameplay
or archive changes. Full mapping and interrupted entry remain open; goal active.

### Specification: CompuServe named coordination resources

Mapped admission/commission, planet, delivery and standings resources to their
ordinary operations, distinguishing galaxy-local from shared-service scope.
Specified which entry/release paths select or clear the resource remembered
across waits, including nested delivery preserving a planet selection. Kept
movement grouping, administration and pending/interrupted entry explicitly open.

Validation: logs/spec-comp-resource-map-review.log checks caller keys, public
selection, internal entry and symmetric scope selection. Build log
logs/spec-comp-resource-map-build.log passed 662 scenarios, 100 productions,
324 fragments, 14 chapters and 550 links. Inspected PDF physical pages 244–245;
table and continued waiting rules are readable. No gameplay/archive changes.
The full goal remains active; this does not complete multiplayer conformance.

### Specification: statistics mapping domains

Reviewed Map key domains in the abstract model and gameplay/session/variant
chapters. Clarified CompuServe ship-counter mappings as total over its ten-ship
roster, including uncommissioned ships; empty statistics has zero counters,
not missing entries. Kept malformed persistent-record recovery outside this rule.

Validation: logs/spec-mapping-domains-review.log inventories mapping declarations
and checks source clearing/increment statements. Build passed in
logs/spec-mapping-domains-build.log. Inspected PDF physical page 236: ADTs and
scope paragraph readable. This is a mapping-domain review, not complete type
verification. No gameplay/archive changes; full specification goal remains active.

### Specification: named types and direct command fields

Reviewed candidate type references across the book and checked command-chapter
s/c/w field names against Ship/Captain/World. All 15/13/16 distinct direct names
resolve; candidate nominal-type exceptions are result tags, values or parameters.
Recorded the bounded review in language-coverage without claiming a type checker.
Nested fields, alias binding, optionals, units and invariants remain to review.

Evidence: logs/spec-named-type-review.log and logs/spec-command-field-review.log.
Archive audit passed in logs/spec-types-archive-audit.log: 135 hashes, 83
declarations, 33 main and 16 pregame commands, 324 strings. No normative book,
gameplay or archive change; no PDF rebuild required. Full goal remains active.

### Specification: adjacency optional-position domains

Made ENERGY and TRACTOR's contained Position requirements explicit at their
adjacency steps, preserving earlier rejection order and permitting earlier
rejections without reading absent target positions. No fabricated coordinate,
missing-position diagnostic or atomic check/use guarantee was introduced.

Validation: logs/spec-adjacency-optionals-review.log checks the distinct source
orders; logs/spec-adjacency-optionals-build.log records successful publication
checks. Inspected PDF physical pages 43 and 53: clauses and contracts readable.
No gameplay/archive changes. Other optional values, concurrent invalidation and
the broader type review remain open; full goal active.

### Specification: complete ordinary SHIELDS responses

Added all nine SHIELDS prompt/response strings with suffix line endings,
output-length independence, silent versus reported cancellation, and UP/tractor/
exhaustion ordering. Corrected a semantic/presentation conflation: the abstract
Transferred outcome carries amount, but the terminal prints only a fixed
confirmation. Updated command coverage; interrupted delivery remains open.

Validation: logs/spec-shield-responses-review.log compares all nine literal
strings and source call suffixes, output-length independence and UP ordering.
logs/spec-shield-responses-build.log passed 662 scenarios, 100 productions,
324 fragments, 14 chapters and 555 links. Inspected PDF physical pages 159–160:
response table and following section readable. No gameplay/archive changes;
full goal active.

### Specification: ENERGY, DOCK and REPAIR responses

Added ordinary ENERGY prompts and all reachable rejection/success text with
LONG prefixes and sender/recipient distinction; added DOCK success/failure
spacing and silent ended-commission path, and REPAIR's optional-report-only
output. Updated coverage. Unreachable ENERGY label1700 is not a new outcome.

Validation: logs/spec-resource-responses-review.log checks literals, composed
prefixes, source order and REPAIR silence. Initial PDF build caught an overwide
table label (logs/spec-resource-responses-build.log); shortened that descriptive
label, preserving output text. Retry passed in logs/spec-resource-responses-build-2.log:
662 scenarios, 100 productions, 324 fragments, 14 chapters, 567 links. Inspected
PDF physical pages 159–160: tables and prose readable. No gameplay/archive
changes; interrupted delivery and the full specification goal remain open.

### Specification: RADIO and TRACTOR responses

Added ordinary RADIO prompts, action-reply blank-line behavior, direct setting
confirmations and silent self/cancel paths. Added TRACTOR direct rejection table,
embedded self-target CRLF and target-label prefixes. Corrected engagement wording
to publish ACTIVATED after association creation rather than promise receipt.
Updated coverage; actual notice delivery remains governed by communication.

Validation: logs/spec-radio-tractor-responses-review.log checks 14 exact strings,
action-cancel order and activation-before-publication. Build passed in
logs/spec-radio-tractor-responses-build.log: 662 scenarios, 100 productions,
324 fragments, 14 chapters and 574 links. Inspected PDF physical pages 160–162:
response sections and following combat section readable. No gameplay/archive
changes. Full goal remains active.

### Specification: BUILD and CAPTURE response composition

Added BUILD stage-count pluralization, conversion and all ordinary rejection
recipes; distinguished identical capacity text from differing state effects.
Added CAPTURE object-kind/ownership refusals, former-owner capture line,
defensive-hit publication and fatal-resource text order. Corrected observation
wording to distinguish direct reporting from notice publication.

Validation: logs/spec-build-capture-responses-review.log checks 19 exact strings,
BUILD suffix/count rules and capture damage/report/publication/points/death order.
Initial PDF overflow retained in logs/spec-build-capture-responses-build.log;
split the Empire literal into exact concatenated pieces. Retry passed in
logs/spec-build-capture-responses-build-2.log: 662 scenarios, 100 productions,
324 fragments, 14 chapters and 583 links. Inspected PDF physical pages 161–163;
clauses readable. No gameplay/archive changes; full goal active.

### Specification: PHASERS direct responses

Added exact device, target, range, strength and own-sector diagnostics, location
count rejection, shield-control and overheat text. Preserved output-length
branches and embedded line endings. Excluded unused PHACN3 from command output.
Clarified that bank readiness follows notice publication, not eventual display.

Validation: logs/spec-phaser-responses-review.log checks eleven messages,
concatenated layout literals, wait/strength order and publication/deadline order.
logs/spec-phaser-responses-build.log passed 662 scenarios, 100 productions,
324 fragments, 14 chapters and 589 links. Inspected PDF physical pages 163–164;
table and continued notices readable. No gameplay/archive changes. Full goal
remains active; concurrent target validity and interrupted firing remain open.

### Specification: TORPEDOS direct responses

Added burst/target prompts, empty-inventory output-length distinction, invalid
count inventory reporting, own-sector/range reuse, misfire ordinal and tube
damage warning, and planet-entry refusal text. Clarified that the warning does
not print damage and that tube-empty wording does not establish empty inventory.
Kept missing-component inputs and actual notice delivery separately scoped.

Validation: logs/spec-torpedo-responses-review.log checks ten fragments and
source branch/order. An initial check used a mistyped PANDOC path; retained in
logs/spec-torpedo-responses-check.log. Correct full build passed in
logs/spec-torpedo-responses-build.log: 662 scenarios, 100 productions, 324
fragments, 14 chapters and 596 links. Inspected PDF physical pages 164–165;
response clause readable. No gameplay/archive changes; full goal active.

### Specification: MOVE and IMPULSE responses

Added propulsion/range diagnostics, output-length-specific warnings, overheat
damage and repair-estimate numeric fields, and fixed obstruction text. Clarified
that ordinary movement has no destination confirmation. Recorded estimate
normalization separately and defined escaped quote notation for exact literals.

Validation: logs/spec-movement-responses-review.log checks sixteen fragments,
range order, numeric widths and obstruction-only response. Builds passed in
logs/spec-movement-responses-build.log and final -build-2.log after quote notation:
662 scenarios, 100 productions, 324 fragments, 14 chapters and 602 links.
Inspected PDF physical pages 155,165–166: notation and response clause readable.
No gameplay/archive changes. Special zero-item retry, concurrent relocation and
other full-specification obligations remain open; goal active.

### Specification: variant response inheritance and movement refusal

Compared ten executable command routines and 95 message fragments between
Austin and CompuServe; matches support ordinary response inheritance with variant
services/names retained. MOVE differs in relocation coordination. Added its
charged, silent-at-command-level RelocationRefused path, including second-request
release behavior, without inventing per-sector grouping. Added EX-COMP-49.

Validation: logs/spec-variant-response-comparison.log preserves the exact
comparison/diff and 16-unit example arithmetic plus alternate-return evidence.
Final build logs/spec-variant-response-inheritance-build-2.log passed 663
scenarios, 100 productions, 324 fragments, 14 chapters and 609 links. Inspected
PDF physical pages 234–236: example and amendment readable. No gameplay/archive
changes; movement resource grouping and the full goal remain open.

### Specification: focused direct-response examples

Added EX-MODEL-615–622 with explicit output-position/comparison scope, covering
fixed transfer confirmation, silent repair/self-gag, BUILD's missing suffix,
post-wait strength rejection, SHORT/LONG empty ammunition, and fixed obstruction
text. Examples distinguish semantic outcomes from printed fields and later
turn/reader output. Updated current coverage count to 671.

Validation: logs/spec-response-examples-review.log compares six exact response
expectations, two silent source paths and state arithmetic. Build passed in
logs/spec-response-examples-build.log: 671 scenarios, 100 productions, 324
fragments, 14 chapters and 609 links. Inspected PDF physical pages 182,229–230;
scope and examples readable. These are source-derived expectations, not native
transcripts. No gameplay/archive changes; full goal remains active.


## Specification nested-field and pregame-domain review — 2026-09-06

Checked 18 nested command member forms against their declared ADTs. Moved the
existing pregame COUNT-only report exception ahead of optional origin/team use;
active report rules continue to follow Austin DECWAR.FOR 1922–1954. Reconciled
the early SET NAME normalization paragraph with its later active-commission-only
scope. No gameplay or archive changes.

Validation: logs/spec-nested-fields-review.log passed its bounded member-name,
exception-order and stale-text checks. logs/spec-nested-fields-build.log records
a successful build: 100 grammar productions, 671 scenario rows, 14 chapters,
609 links and 324 source message fragments. Visually inspected PDF page 73:
legible text and code, no clipping or overlap. git diff --check passed. These
checks do not establish all optional lifetimes, units or concurrent behavior;
the specification goal remains active.


## SET terminal-response specification — 2026-09-06

Added ordinary SET prompts, silent completion and TTYTYPE unknown/ambiguous
retry sequences from Austin DECWAR.FOR 3624–3740. Defined all eleven relevant
fragments, including embedded CRLF and supported-name spacing, in the terminal
presentation chapter. Linked the semantic clause and updated its coverage row;
no runtime or archive changes.

Validation: logs/spec-set-responses-review.log checks the eleven published
fragment rows against exact MSG.MAC bytes. logs/spec-set-responses-build.log
records successful build (100 productions, 671 scenarios, 614 links, 324 source
fragments). PDF pages 159–160 visually reviewed with no clipping/overlap.
Interrupted input/output and nonprinting-name domains remain separate work;
these checks do not establish full terminal conformance.


## CompuServe SET presentation inheritance — 2026-09-06

Compared SET executable text and all eleven response fragments between the
archives. All executable lines preceding BHREMV traversal match; Austin's local
coordinate copies in that traversal are the only routine difference. Added
explicit SET presentation inheritance to the appendix, retaining separate input
waiting, lifecycle and name-edge domains. logs/spec-comp-set-review.log preserves
the exact comparison. No gameplay or source-archive changes.

logs/spec-comp-set-build.log records successful publication build: 100 grammar
productions, 671 scenarios, 617 links, 324 source fragments. PDF page 237 was
visually checked: no clipping or overlap. git diff --check passed. This is a
bounded response comparison, not complete variant or whole-spec conformance.


## Special coordinate-input domain audit — 2026-09-06

Exhaustively enumerated original TORPEDOS lengths 2–7 with valid burst counts
1–3 using the source's aim-selection recurrence. Exactly six combinations read
beyond returned components, matching the current explicit command boundary.
Rechecked length-zero/one dispatch, target-continuation parity and MOVE's
own-sector retry against Austin LOCATE/RELOC, TORP and MOVE. Recorded analysis
in evidence and coverage companions; no normative rule, runtime or archive edit.

logs/spec-special-input-domain-review.log preserves all eighteen enumerated
cases and scope limits. git diff --check passed. No PDF rebuild was needed:
only companion evidence/coverage and this log changed. This closes the bounded
shape enumeration, not the intentionally unspecified missing-value behavior
or concurrent acquisition semantics. The full specification goal remains active.


## Romulan target-result domain — 2026-09-06

Rechecked DIST's candidate initialization and strict comparison. Made the
existing eligible-target-within-75-Euclidean-sectors domain explicit before
SelectRomulanTarget's algorithm; no fallback, pursuit rule or message added.
Recorded why integer sector distances establish that bound and why opposite
corners demonstrate a real all-distant domain. Historical mechanics remain in
the evidence companion. Runtime and source archives unchanged.

logs/spec-romulan-domain-review.log retains the bounded reasoning;
logs/spec-romulan-domain-build.log records a successful build (100 productions,
671 scenarios, 617 links and 324 source fragments). PDF page 123 visually checked
with no clipping/overlap. git diff --check passed. No-target outcomes and
concurrent selection remain explicitly unspecified; the full goal remains active.


## Coordinated-execution conformance criteria — 2026-09-06

Added evidence requirements for assessing multiplayer traces: successful versus
pending/failed entry, domain ownership, variant release scope, intermediate
effects and uncoordinated observations. Rechecked Austin entry/release wrapper;
criteria reference existing semantic contracts and add no scheduling policy.
Single-session/sequential checks are explicitly insufficient for overlap claims;
retries do not prove fairness or bounded waiting.

logs/spec-coordination-assessment-review.log records review scope;
logs/spec-coordination-assessment-build.log records successful build (100
productions, 671 scenarios, 618 links, 324 fragments). PDF pages 183–184 visually
reviewed without clipping or overlap. git diff --check passed. No gameplay or
archive edits; unresolved reentrancy/interruption domains remain outside claims.


## Player TELL direct-response specification — 2026-09-06

Added recipient prompt/diagnostic ordering, message-body prompt and refusal,
silent successful publication and the final conditional line-break request.
Distinguished TELL08's punctuated no-recipient message from MAKMSG's unpunctuated
No message sent. Checked the actual ASCIL expansion rather than its conflicting
CRLF comment. Linked command and presentation contracts; updated coverage.
No gameplay or archive changes.

logs/spec-tell-responses-review.log verifies all nine published MSG.MAC fragment
rows byte-for-byte and records source scope. logs/spec-tell-responses-build.log
records a successful build (100 productions, 671 scenarios, 624 links, 324
fragments). PDF pages 159–160 visually checked without clipping/overlap.
git diff --check passed. Full delivery/interruption and CompuServe amendments
remain separate obligations; this is sender-response coverage only.


## CompuServe TELL refusal ending — 2026-09-06

Verified nine TELL fragments identical between variants, but found the ASCIL
expansions differ: CompuServe embeds CRLF; Austin does not. Added the precise
body-refusal output boundary amendment while preserving direct-Romulan and
autonomous-suppression rules. No gameplay or archive changes.

logs/spec-comp-tell-review.log preserves exact fragment checks and both macro
bodies. logs/spec-comp-tell-build-2.log records the final successful build after
clarifying wording to include body cancellation (100 productions, 671 scenarios,
629 links, 324 fragments). PDF page 238 visually checked with no clipping or
overlap. git diff --check passed. Full variant/interruption review remains.


## Shared text-macro follow-up — 2026-09-06

Audited direct ASCIL uses after the TELL variant finding. Austin LEX-7 already
has the correct no-suffix overflow rule. Made GRIPE prompt/line-limit notices'
no-ending behavior explicit, and amended CompuServe's four shared overflow/GRIPE
texts to append CRLF. Feedback-record and input-echo endings remain separate.
Recorded remaining HELP/environment macro sites without claiming them complete.

logs/spec-ascil-followup-review.log checks shared literals and inventories the
Austin call sites. logs/spec-ascil-followup-build.log records successful build:
100 productions, 671 scenarios, 633 links, 324 fragments. PDF pages 91 and 239
visually checked with no clipping/overlap; git diff --check passed. No runtime
or source-archive edits. Full specification review continues.


## HELP command-list and topic-diagnostic presentation — 2026-09-06

Specified seven ten-character entries per command-list row from OLST's actual
counter (its six-column comment is inaccurate), exact abbreviation labels,
privilege visibility, ambiguity separators and unknown-topic output. Compared
all 33 display labels across variants. Added CompuServe's embedded heading and
ambiguity-prefix endings, retaining the shared conditional requests.

logs/spec-help-list-review.log records source extraction and label comparison;
logs/spec-help-list-build.log records successful build (100 productions, 671
scenarios, 641 links, 324 fragments). PDF pages 159 and 240 visually checked
without clipping/overlap. git diff --check passed. No runtime/archive edits.
Help-resource failures and full section-control behavior remain separate review.


## Explicit world-termination check sites — 2026-09-06

Enumerated all five executable Austin CALL ENDGAM sites and specified their
phase/guard: active prompt, command wait, planet removal, forced SET and restart
countdown. Clarified that a terminating session exit does not return to the
suspended command or roll back earlier effects. No added per-update check or
simultaneous termination guarantee. Runtime/archive files unchanged.

logs/spec-world-end-sites-review.log records the corrected column-one comment
scan and all call sites. The initial scanner rejected indented CALL lines and
was corrected before editing. logs/spec-world-end-sites-build-2.log is the final
successful build: 100 productions, 671 scenarios, 643 links, 324 fragments.
PDF page 152 visually checked without clipping/overlap; git diff --check passed.
Admission races, interrupted final reports and environment exit failures remain
separate limits. The full goal remains active.


## CompuServe world-end propagation audit — 2026-09-06

Enumerated and reviewed all five CompuServe CALL ENDGAM sites. The complete
executable ENDGAM-body comparison differs from Austin only by active UPDSTA
and its continuation. Existing appendix already specifies its POINTS/update/
release order and failure limits, so no normative change was needed. Added
source evidence and coverage checkpoint.

logs/spec-comp-world-end-review.log retains call sites and exact executable-line
diff. git diff --check passed. Only companion documents and this log changed;
no PDF rebuild, gameplay or source-archive change. Ordinary check placement and
propagation are reviewed; interrupted reporting and cross-session timing remain
outside this bounded result. The full specification goal remains active.


## Requirement coverage and preservation refresh — 2026-09-06

Updated the requirement matrix for reviewed special-input domains, Romulan
selection, explicit lifecycle check sites, multiplayer assessment and command
presentation. Remaining priorities now distinguish unreviewed contracts from
already examined undefined domains. No completion claim or reduced goal scope.

npm run audit:check passed: logs/spec-coverage-refresh-audit.log. Separately
verified Austin's exact 39-file set, byte lengths and SHA-256 hashes against
legacy/utexas-manifest.json: logs/spec-coverage-refresh-austin-hashes.log. Inspected
the audit's check mode to distinguish baseline hashes from generated variant
comparisons. git diff --check passed. Only coverage companion and this log
changed; no PDF rebuild or gameplay/archive changes. Whole-goal review remains.


## HELP resource failures and cleanup — 2026-09-06

Specified standard-open warning, silent privileged-open fallback, missing-section
EOF boundary and ordinary cleanup/continuation. Corrected the command overview's
omitted percent prefix. Added CompuServe warning-ending amendment. No fallback
on missing privileged topic, new game effect or cleanup-success guarantee under
host failure was introduced.

logs/spec-help-failure-review.log records source scope. Final build in
logs/spec-help-failure-build.log passed (100 productions, 671 scenarios, 650
links, 324 fragments). PDF pages 89, 159 and 240 visually reviewed; no clipping
or overlap in the new content. git diff --check passed. No runtime/archive edits.
Complete terminal/control and concurrent failure review remains ongoing.


## NEWS continuation and failure output — 2026-09-06

Specified prompt boundaries, no added completion ending, percent-prefixed open
warning and ordinary cleanup. Corrected the prior statement that every exit
clears controls: open failure bypasses viewing cleanup. Compared complete NEWS
executable bodies across variants; only warning macro expansion changes the
specified suffix. No game-state or archive edits.

logs/spec-news-output-review.log records comparison/source scope;
logs/spec-news-output-build.log records successful build (100 productions, 671
scenarios, 658 links, 324 fragments). PDF pages 90, 160 and 240 visually reviewed
without clipping/overlap. git diff --check passed. Environment cleanup failures
and asynchronous control delivery remain separate review domains.


## GRIPE refusal and storage diagnostics — 2026-09-06

Specified RED refusal and storage-warning output, distinguishing modification
retry, open/read/write failure and failure during record extension. Preserved
partial-record uncertainty rather than inventing cancellation or atomic rollback.
Checked five distinct warning texts and complete RED literal across variants;
CompuServe storage warnings add CRLF. No gameplay/archive changes.

logs/spec-gripe-failures-review.log records source checks;
logs/spec-gripe-failures-build.log records successful build (100 productions,
671 scenarios, 667 links, 324 fragments). PDF pages 160 and 241 visually reviewed
without clipping/overlap. git diff --check passed. Full failure/control and
whole-book review remains; this closes ordinary diagnostic wording only.


## Ordinary-reader repetition scope — 2026-09-06

Clarified ESC's remembered input: the whole most recently acquired ordinary
line, including prompted arguments/bodies, not command-only history or the last
slash command. Fresh empty acquisition replaces it; remainder consumption does
not. Prior-to-first-acquisition contents remain undefined; separate startup-name
input is not included. Grounded in INLI, GTKN, RELOC and MAKMSG branches.

logs/spec-repeat-scope-review.log records source scope;
logs/spec-repeat-scope-build.log records successful build (100 productions,
671 scenarios, 667 links, 324 fragments). PDF pages 25–26 visually reviewed
without clipping/overlap. git diff --check passed. No runtime/archive change;
full control-delivery and whole-book review remain active.


## Ordinary line-editor output contract — 2026-09-06

Specified Austin redisplay encoding, Ctrl-U output, lack of reader-owned
Backspace/DEL erase text and echo-sensitive completion CR/LF. Kept initialization
input, physical echo and disconnect delivery distinct. Checked all 128 redisplay
codes using the source compare/skip sequence; no native parity claim.

logs/spec-line-editor-output-review.log records branch/source scope;
logs/spec-line-editor-output-build.log records successful build (100 productions,
671 scenarios, 671 links, 324 fragments). PDF page 159 visually reviewed without
clipping/overlap; git diff --check passed. No runtime/archive changes. Complete
variant echo-helper and asynchronous-control review remains outstanding.

## Specification: CompuServe ordinary input echo

Compared INLI/NXCH/DISP against Austin: executable statements match (49/7/20).
CompuServe ECHON/ECHOFF return before changing echo state; initialization retains
an echo-enabled reader assumption. Added the appendix qualification without
claiming physical client echo or changing gameplay. Evidence: Comp WARMAC
1165, 1313, 1324, 1859–1963; logs/spec-comp-editor-review.log (also records the
failed first delimiter lookup). Build passed: 100 grammar productions, 671
scenario rows, 14 chapters, 676 links; logs/spec-comp-editor-build.log. These
are structural checks, not executed semantic scenarios. Rendered and inspected
PDF page 254; no clipping or overfull/undefined LaTeX warnings. Whole-book
semantic and concurrency review remains outstanding.

## Specification: modern-guide completion review

Re-read the supplied Markdown guide and checked the model's introductory
contracts/notation and SHIELDS against it and Austin SHIELD. Recorded a concrete
remaining issue: the guide asks for declarations before use, while the model
currently permits forward references and uses entity/query and Capture outcome
types before their detailed definitions. Earlier nominal-name checks do not
close that reading-order requirement. Added guide-specific completion evidence
and limits to language-coverage; refreshed its stale ordinary-output coverage
to include the completed HELP/NEWS/GRIPE and editor reviews. Across all 14 book
units, a bounded notation scan found no ===, non-grammar :=, or inconsistent
Array/ReadonlyArray/Record collection spellings; logs/spec-guide-notation-review.log
records scope and the initial grammar false positives. No normative or gameplay
change; no PDF rebuild needed. Next: improve declaration/introduction order and
continue whole-book operation/domain review, without treating lexical checks as
semantic verification.

## Specification: model reading order

Moved GameState query/domain/contract section after the entity declarations;
notation now opens the model chapter. Removed the premature illustrative Capture
signature and placed CAPTURE rejection/outcome definitions before its signature.
Updated directional prose and the guide coverage finding. Seven query signatures
remain identical; the eight record/position query types precede the query section.
logs/spec-model-reading-order-review.log records the bounded checks. Final build
logs/spec-model-reading-order-build-3.log passes 100 productions, 671 scenario
rows, 14 units and 676 links. Earlier two builds retained while correcting
layout-discovered directional prose. Inspected PDF pages 8, 19, 20 and 59, then
rechecked final page 20; no overfull/undefined warnings. Full-book layout and
remaining declaration dependencies are not yet certified. No game behavior or
runtime changes.

## Specification: core-record dependency order

Moved ScoreCategory/Score before Ship and moved the World record and membership
contract after its local component records. ClockOrigin is now introduced with
core identities; session clock meaning is unchanged. The tractor section title
now describes its remaining beam and Romulan content. A 65-declaration comparison
across model/session found no changed definitions after whitespace normalization;
logs/spec-model-dependencies-review.log records scope. CombatNoticeService and
illustrative forward references remain explicitly outside this completed check.
Build passed (100 productions, 671 rows, 14 units, 677 links), recorded in
logs/spec-model-dependencies-build.log. Inspected PDF pages 10, 13, 19 and 20;
no clipping or overfull/undefined warnings. No gameplay changes. Full publication
layout and cross-chapter type ordering remain review obligations.

## Specification: combat observation type dependencies

Centralized the existing critical/displacement/destruction types, impact snapshot
records, combat observation alternatives and notice records in the model before
World. Behavior remains in communication and world-rules with links to the
value definitions. This removes the identified World-to-later-notice dependency
without adding mechanics or selecting unresolved outcomes. Compared 103 named
declaration chunks across the three chapters: unchanged after whitespace
normalization. logs/spec-notice-type-order-review.log records scope and explicit
chain checks. Build passed 100 productions, 671 scenario rows, 14 units and
686 links (logs/spec-notice-type-order-build.log). Inspected PDF pages 19–21,
103 and 133; no clipped text or overfull/undefined warnings. Whole-book semantic,
example and final layout review remain open. No gameplay changes.

## Specification: resource examples review

Reviewed 20 cases EX-MODEL-01–09 and 11–21 against Austin SHIELD, RADIO,
ENERGY, DOCK, REPAIR and turn accounting. Rational checks confirm fractional
shield/energy values and device/hull repair arithmetic. Tightened EX-MODEL-15
to state positive captured-planet count and no adjacent friendly base; case 16
inherits those conditions. Expected results unchanged. Evidence:
logs/spec-resource-examples-review.log. These are source-derived checks, not
native execution. The subsequent position-refinement build incorporates this
change and passes; inspected PDF page 189 shows the affected table without
clipping. Gameplay unchanged.

## Specification: Position as a constrained GridPoint

Recast Position as a refinement of GridPoint: GridPoint holds real absolute
coordinates used during path tracing, while Position requires Coordinate values
(whole numbers in 1..75) and identifies an actual sector. SectorVector remains
a signed or fractional displacement measured in sectors. Defined refinement
notation explicitly. logs/spec-position-refinement-review.log verifies declaration
order, retained bounds and usage scope. Build passed 100 productions, 671 scenario
rows, 14 units and 686 links in logs/spec-position-refinement-build.log. Inspected
PDF pages 11 and 189; no clipping or overfull/undefined warnings. This clarifies
the existing domains and changes no movement, coordinate input or gameplay rule.

## Specification: name the sector-distance metric

Named the existing `max(abs(dv), abs(dh))` sector-distance definition as
Chebyshev distance, with maximum-metric and L-infinity terminology. Clarified
that both diagonal and orthogonal neighbors have distance one and that the
formula remains normative. No formula, coordinate domain or gameplay changed.

Follow-up editorial pass removed the maximum-metric/L-infinity aliases, the
library-conformance aside, an unused subtraction rule and repeated descriptions
of Position/GridPoint/SectorVector. Retained the Chebyshev name and formula,
adjacency consequence, and vector-addition/result-domain rule used by path
semantics. Compacted the adjacent SectorObject union and explanation after the
first reflow stranded one explanatory line at a page boundary. No semantic rule
changed. Final build passed 100 productions, 671 scenario rows, 14 units and
686 links in logs/spec-sector-geometry-editorial-build-2.log; the initial layout
is retained in the preceding build log. Inspected final PDF pages 12–13 with no
clipping or overfull/undefined warnings.

## Specification: integrate the Romulan sector distinction

Replaced the isolated statement that the Romulan is not a player commission
with an explanation attached to SectorObject. PlayerShip now explicitly refers
to the fixed roster and commission state; RomulanObject refers to the optional
autonomous `World.romulan`. Both take part in spatial rules while their lifecycle
and behavior remain separate. This is an editorial integration of existing ADTs,
not a new occupancy, lifecycle or combat rule. Reformatted the SectorObject union
vertically after the first render left its declaration at the bottom of one page
and its explanation on the next. Final build passed 100 productions, 671 scenario
rows, 14 units and 686 links in
logs/spec-romulan-sector-integration-build-2.log; the initial layout is retained
in the preceding build log. Inspected final PDF page 13; the union and explanation
remain together with no clipping or overfull/undefined warnings.

## Specification: clarify chapters 1 and 2

Revised Scope and conformance and Abstract game model for simpler language and a
clearer reading order. Consolidated repeated scope and evidence statements,
shortened notation explanations, and added a prose introduction before every
section or subsection declaration block. Moved Rectangle from the end of Galaxy
and roster into Sector geometry. Preserved all type domains, fields, contracts,
formulas, roster values and game behavior.

The heading-order review passed for both source chapters. The assembled build
passed 324 message fragments, 100 EBNF productions, 671 scenario rows, 14
chapters and 684 links. Inspected all compiled pages through the end of chapter 2;
no clipping, overfull boxes or undefined references remain. Evidence:
logs/spec-chapters-1-2-editorial-review.log and
logs/spec-chapters-1-2-editorial-build.log.

## Documentation language and notation policy

Recorded the editorial standard for the normative specification: introduce
concepts before notation, keep only facts needed to determine valid DECWAR
behavior, use pseudocode when it clarifies a transition, and move provenance,
derivation and review detail to companion documents.

Selected valid TypeScript as the notation for data shapes. Semantic constraints
that TypeScript does not express clearly, including opaque identity, units,
ranges and total maps, remain normative prose rather than branded implementation
types. Operations and contracts remain explicitly labeled pseudocode. The plan
now records conversion and TypeScript validation of the existing custom
declarations as a pre-publication task. No normative game rule changed.

`npm run audit:check` passed; output is retained in
logs/documentation-notation-policy-audit.log.

## Specification: whole-book editorial and notation pass

Applied the documentation standard to all 14 assembled chapters. Every section
and subsection now introduces its subject before a declaration or algorithm.
Converted the remaining hybrid record, enum and tagged-alternative declarations
to valid TypeScript while retaining behavioral contracts as pseudocode and
command productions as EBNF. The specification build now compiles all 65
TypeScript blocks together as one abstract data model.

Moved 157 inline evidence paragraphs, plus two labeled CompuServe source notes,
to `docs/spec/source-index.md`. The companion index preserves 515 checked source
links keyed by chapter and clause while keeping derivation and implementation
detail out of the normative book. Simplified the notation chapter, removed
unneeded representation asides and split dense prose at rule boundaries. No
command syntax, game rule, output text or conformance result was changed.

`npm run spec:check`, `npm run audit:check` and `npm run typecheck` pass. The
complete publication build passes 324 message-fragment checks, 100 EBNF
productions, 671 scenario rows, 515 source-index links, 14 chapters and 171
book-local links. Logs are retained in
`logs/spec-total-editorial-validation.log`,
`logs/spec-total-editorial-audit.log`,
`logs/spec-total-editorial-typecheck.log` and
`logs/spec-total-editorial-build.log`. Rendered and inspected all 258 PDF pages;
the final LaTeX pass reports no overfull boxes, missing characters or undefined
references.

## Specification: practiced-reader pass over chapters 1 and 2

Tightened Scope and conformance and Abstract game model for an experienced
technical reader who need not know TypeScript. The notation section now defines
only the specification's extensions and nonstandard conventions. Removed
explanations of ordinary field access, conditionals, assignment and local
bindings, along with repetitive device-property tables and implementation
asides. Consolidated repeated identity, arithmetic, notice and world-membership
prose while preserving units, domains, thresholds, ordering, rejection effects
and coordination rules. No command syntax or game behavior changed.

`npm run spec:check` passes 65 compiled TypeScript blocks, 324 message
fragments, 100 EBNF productions, 671 scenario rows, 515 source-index links, 14
chapters and 171 book-local links. The publication build is retained in
`logs/spec-practiced-reader-build.log`, and the separate check in
`logs/spec-practiced-reader-check.log`. Inspected compiled chapters 1 and 2
(PDF pages 5–23); no clipping or layout regression was found. The rebuilt book
has 256 pages.

## New specification 1.0 foundation

Started a clean, incremental game-language specification in `docs/spec1.0`.
Its local `AGENTS.md` defines the purity boundary: TypeScript for abstract data
and transition algorithms, EBNF for player input, an ordered output language,
and first-class autonomous game processes. Historical machine, runtime, port,
transport and persistence architecture are excluded from normative semantics.

Added the initial transition-system shape, foundational galaxy/entity records,
fixed eighteen-ship roster, active faction bases, score categories, sector
geometry, and a character-decision ledger. The ledger leaves the life-support
zero crossing, temporary black-hole interaction state and faction vocabulary
open for discussion rather than silently normalizing them. No existing
specification or game runtime behavior changed.

`npm run check` in `docs/spec1.0` passes strict TypeScript checking and four
focused tests. Output is retained in `logs/spec1-initial-check.log`.

After the prior specification was archived outside the repository, removed its
in-project `docs/spec` copy and renamed the clean start from `docs/spec2.0` to
`docs/spec1.0`. Updated the documentation index, repository-artifact inventory,
port contract and package scripts so no live command or guide treats the prior
book as authoritative. The local specification contract now explicitly forbids
consulting or reviving that archived book. Obsolete `tools/spec` sources remain
dormant and have no package command.

The source/generated-data audit still passes (135 hashes, both variant bundles,
and extracted command/message checks), and the root TypeScript check passes.
Evidence is retained in `logs/spec1-archive-audit.log` and
`logs/spec1-archive-typecheck.log`.

## Specification 1.0: abstract data types draft

Added the agreed ten-part outline and drafted the first chapter in
`docs/spec1.0/01-abstract-data-types.md`, backed by compiling declarations in
`src/model.ts`. The model covers ordinary game quantities, sector geometry,
the fixed eighteen-ship roster, commission lifecycle, devices and damage,
bases, planets, stars, black holes, the Romulan, tractor relationships,
score categories, and the shared galaxy. Corrected the seed model's overly
specific `dockedAt` relation to the game's actual ship-level `docked` state.

Updated the local specification contract with a concise, practitioner-facing
voice: normative present tense, no TypeScript tutorials or redundant prose,
limited formalism, and examples reserved for boundaries. Added separate primary
evidence notes under `docs/spec1.0/evidence`; the archived specification was not
consulted. `npm run check` passes the specification typecheck and four focused
tests; output is retained in `logs/spec1-adt-check.log`.

Resolved character question C-001 by retaining original life-support semantics.
The ADT now states that the reserve is signed and zero is not exhaustion;
`CHARACTER.md` records the initial/reset value of 5 and the later fatal crossing
below zero. Primary references are Austin `SETUP.FOR:392-397` and
`DECWAR.FOR:223-247,923-934`. Detailed transition ordering remains assigned to
world mechanics. The specification checks continue to pass.

Rewrote the abstract-data-types chapter to be self-contained after review found
that referring readers to `src/model.ts` left the normative document incomplete.
The chapter now includes every declaration it uses, quantity domains, the full
roster, all ship fields and meanings, initial commission values, life-support
state, base and planet records, Romulan and tractor relationships, the full
Galaxy shape, occupancy rules, and invariants. It names Chebyshev distance and
gives both its equation and executable definition. Renamed supporting entity
interfaces to the direct nouns `Ship`, `Base`, `Planet`, and `Romulan`, and made
`Galaxy` the state consumed by the transition layer.

All TypeScript blocks extracted from the chapter compile together under strict
checking. The companion package typecheck and four tests also pass; refreshed
output is retained in `logs/spec1-adt-check.log`.

ADT review removed tractor beams as first-class entities. Each `Ship` carries a
nullable `tractorLink`; valid links are reciprocal, irreflexive, same-team, and
join commissioned ships. The chapter and character ledger state that a beam has
no identity or state apart from its endpoints. Extracted chapter TypeScript and
package checks pass.

Added `docs/spec1.0/TITLE.md` as the canonical future title page with the
requested Austin Core title, Eric Freeman and Noah Smith attribution, University
and department, September 6, 2026 date, and draft-in-progress scope statement.
The outline now records it as the publication front matter.

ADT review removed faction-local base numbers from the abstract model. Austin
uses the number as an internal slot, but `ODISP` renders bases only as `Fed Base`
or `Emp Base` (and their short symbols), while commands locate them by sector.
`Base` now consists only of faction, position, and strength; destruction removes
the base rather than preserving or releasing an identity. The planets-and-bases
overview now refers explicitly to the later `CAPTURE` and `BUILD` command
semantics. Evidence notes and the character ledger record the distinction.
Specification typecheck and all four tests pass; refreshed output is retained
in `logs/spec1-adt-check.log`.

Repaired malformed Markdown in the 1.0 ADT chapter: a stray `c` and unmatched
fence had replaced the `Galaxy` heading and declaration after Faction state.
Restored the complete structure and its introduction. All 26 fences are paired,
the TypeScript extracted from the chapter passes strict checking in
`logs/spec1-adt-embedded-typescript.log`, the specification package passes its
four tests and typecheck in `logs/spec1-adt-check.log`, and `git diff --check`
passes.

Completed a precision and clarity audit of the full 1.0 ADT chapter. Property
rules now name their containing types where context was ambiguous; prose that
merely repeated declarations was removed or made semantic. Replaced ship-name
maps with the ordered `Ship[]` roster and derived faction membership through
tested `teamOf`; moved tractor linkage onto `Ship`; removed the unused tagged
sector-object union; and made black-hole and Romulan enablement distinct from
temporary absence. Recipient and gag collections now use TypeScript `Set`
because their order is immaterial, while message order remains significant.
Expanded and grouped the provisional Galaxy invariants. Added unresolved
character question C-004 for the potentially observable base enumeration order
instead of importing slot identity into the model.

The chapter has 24 paired Markdown fences. Its extracted TypeScript passes
strict checking in `logs/spec1-adt-embedded-typescript.log`; the companion
typecheck and four tests pass in `logs/spec1-adt-check.log`; `git diff --check`
passes.

Reworked the Ships portion of the 1.0 ADT chapter after editorial review found
that a single declaration block introduced too many concepts without explaining
them. Quantities, commission lifecycle, alert and shield condition, devices and
damage, and radio state are now introduced and explained separately before the
composite `Ship` interface. The local specification contract now requires this
concept-first organization for heterogeneous declarations.

Added a reproducible LaTeX/Pandoc publication build for the 1.0 specification.
The current ADT chapter now compiles with a dedicated title page, table of
contents, academic typography, running headers, page numbers, highlighted
TypeScript, typeset mathematics, and formatted tables. The final letter-size
PDF is `output/pdf/decwar-specification-austin-core.pdf`; all eleven rendered
pages were visually reviewed. The successful build output is retained in
`logs/spec1-pdf-build.log`.

Designated Eric Freeman and Noah Smith as the current editors on the canonical
and typeset title pages. The title-page structure can later add a distinct,
automatically flowing contributor list without changing the editorial role.

Revised the editor credit to follow standards-report title-page convention:
both names form one small-cap phrase joined by “and,” followed by the shared
italic role “(Editors).” This removes the visual ambiguity that the role applied
only to the second name.

Added Section 1, Introduction, to establish Austin Core's scope, semantic model,
notation, normative status, and organization before presenting any ADTs.
Renumbered Abstract Data Types as Section 2, moved general specification and
game-model explanations into the introduction, updated the outline and reading
order, and extended the PDF build to compile both sections.

Changed the publication title to the requested plural, `DECWAR Specifications`,
across the canonical title, typeset title page, running header, and PDF
metadata. Only the initial `S` in `Specifications` is capitalized on the title
page.

Made the Introduction's implementation boundary precise: it now distinguishes
the specification from the organization, representation, and execution
environment of the PDP-10 implementation rather than an unspecified “existing
program.”

Replaced the compressed phrase “ordered output language observed by captains”
in the Introduction and project overview with the direct formulation “the text
presented to captains, including its wording, layout, and order.”

Changed that scope item from “captains” to “players.” The more general term is
clearer when describing the specification's audience-facing output; “captain”
remains available for the participant's in-game role.

Recorded the agreed command-reference format in `docs/spec1.0/AGENTS.md` for
future command sections: numbered command heading, displayed command forms,
distinct Syntax and Semantics paragraphs, and compact input-to-result examples.
The guidance also requires semantics to cover validation, transition timing,
and ordered output.

## 2026-09-06 — Fleet recovery, shared-timeout diagnosis and monitored hour

Runnable milestone: a single command starts two bots per side, recovers from
selected transport failures and produces a bounded match report. Reviewed the
current root contract and documentation standard before implementation. The
new specification and concurrent edits remain untouched; no game runtime,
source archive or generated game data was changed.

Power-management evidence now explains the common timeout much better than
the old terminal logs alone: macOS entered Maintenance Sleep at local
2026-09-05 22:52:39 and DarkWake at 22:52:58. All four clients' 15-second waits
failed at 03:52:58.165 UTC, the same wake second. See
logs/automated-player-timeout-power-evidence.log and the previously preserved
alarm-fixed client logs. This strongly supports expired timers during sleep;
it is not a reconstruction of every scheduler operation. Current effort was
sufficient; no difficult source/concurrency ambiguity required escalation.

Client changes: typed connection/unavailable-vessel errors; distinguish a silent
timeout from an unrecognized nonempty dialogue; give a timer more than one
second late exactly one extra timeout interval to process pending socket input.
Record deadline-grace lateness. Make completion idempotent. Original terminal
bytes and game timing remain intact. Unexpected reports/dialogue still fail.

Added supervisor.ts, retaining finite decision/life/retry budgets across
connections, with exponential retry delays capped at 30 seconds. It retries
socket failure, silent timeout and unavailable requested vessel, resets memory
through a new play instance, and never replays an uncertain command. Joining
again is a new commission, not recovered ship state. Single-player run.ts keeps
its prior stop-on-disconnect policy. Fleet mode uses the supervisor.

Added fleet.ts: four named captains across both factions, first-login gating,
existing-host connection only, per-bot transcripts, five-second health.json,
events.jsonl, atomic health-file replacement, stall and scheduling-pause
counters, and final summary.json. Time/round/life/retry budgets are configurable.
SIGINT/SIGTERM or the duration requests ordinary quit. It never restarts a host.
Counts are attempted commands; logs retain actual responses. Unexpected fatal
errors set a failed bot state and nonzero exit status. Updated README/PLAN and
docs/status.md to distinguish delivered recovery from remaining limitations.

Checks:
- logs/automated-player-recovery-tests.log: 8/8 targeted tests pass, including
  late-timer grace, budget preservation, bounded unavailable-ship retries,
  cancellation and a real TCP proxy drop followed by fresh login/actions.
- logs/automated-player-fleet-regressions.log: all 41 bot/Telnet tests pass,
  including new 12-second four-bot startup/health/shutdown integration.
- logs/automated-player-fleet-typecheck.log: experiment TypeScript check passes.
- logs/automated-player-fleet-audit.log: source/generated audit passes 135
  hashes, 83 declarations, 33 main/16 pregame commands, 324 strings and both
  variant inventories. Initial typecheck: logs/automated-player-recovery-typecheck.log.

One-hour run STARTED, not yet completed at this checkpoint. Port 2423 had no
listener and its lock owner PID 11940 was absent. Archived that verified stale
lock to logs/automated-player-fleet-stale-lock.json, started the Austin playable
host with the existing experimental data directory (exec 18966), and ran:

caffeinate -i node experimental/automated-player/fleet.ts --port 2423 --seconds 3600 --log-dir logs/automated-player-hour-2026-09-06

Fleet exec session 48325 started at 2026-09-06T22:02:29Z (17:02 local), expected
to finish near 18:02 local plus bounded command/quit completion. All four were
verified playing in health.json. Idle sleep is prevented only while this fleet
runs; lid closure can still suspend it. Host log:
logs/automated-player-fleet-host.log. Reports and transcripts:
logs/automated-player-hour-2026-09-06/.

Created a thread heartbeat, review-decwar-one-hour-fleet-run, every 15 minutes
to inspect this run, remain quiet while healthy, notify meaningful failure or
completion, record the final evidence, and pause itself after terminal results.
The first creation attempt lacked destination=thread and was rejected without
creation; the corrected call succeeded. This is a follow-up for this single
run, not authorization for indefinite matches. No completed-hour or competitive
strength claim is made until its summary is reviewed.

## 2026-09-06 — One-hour fleet completed and reviewed

Reviewed the final health/summary at the scheduled follow-up. The fleet reached
3,600 planned seconds and finished normal quits after 3,601.567 seconds at
2026-09-06T23:02:30.584Z (18:02 local). durationReached=true. All four bots are
marked interrupted because the duration abort uses the normal stop path, not
because of a failure. The shared host log confirms session completion for jobs
1–4; a separate session was admitted during the run, so this is not presented
as a controlled four-bot competitive tournament.

Totals: 5,510 decisions, 4,085 movement commands, 346 phaser commands and 310
dock commands. Zero recorded deaths, reconnects, deadline graces, stalls,
scheduling pauses or fatal errors; zero explicit REPAIR commands. These are
attempted command counts, not verified hits/movement outcomes. The hour did not
exercise recovery paths; their evidence remains the focused TCP-drop and
late-deadline tests. Sustained operation is established for this one run,
not competitive strength or original-executable fidelity.

Evidence: logs/automated-player-hour-2026-09-06/{summary.json,health.json,events.jsonl}
and per-bot transcripts; logs/automated-player-fleet-host.log. Saved aggregate
assertion/check output in logs/automated-player-hour-2026-09-06/review.json and
recorded the result in experimental/automated-player/TRAINING.md. No game code,
source archive, other specification work or shared host state was changed.
No new match launched. Pause the single-run heartbeat
review-decwar-one-hour-fleet-run after recording these terminal results.

## 2026-09-06 — Ten bots, SCAN/LIST targets and installation combat

The user clarified the requested increase as ten automated ships total, five
per side, rather than multiple matches. Runnable milestone: ten balanced bots
on the interactive host, using ordinary SCAN and default LIST observations to
select ships and installations. Reviewed the documentation standard and Austin
executable LSTSCN/LSTUPD/LSTOBJ/PHACON/BASPHA/PLNATK boundaries. No game rules,
archives or unrelated specification files changed.

While preparing the update the user reported no server. Verified no 2423
listener and absent lock-owner PID 30277. Archived its stale lock to
logs/automated-player-ten-stale-lock.json and restored Austin playable using
data/automated-player-experiment. Host exec 36670; log
logs/automated-player-ten-host.log. User confirmed connection; retained that
session during bot launch.

Preserved prior policy in test/captain-v3.ts. Added typed default LIST records:
ship faction/name, optional location and shields, base/planet faction/location,
planet builds, timestamps. Enemy out-of-range ships remain unlocated. Known
remote bases may lack shields. Sources: DECWAR.FOR LSTSCN:1519 onward,
LSTUPD:1922 onward, LSTOBJ:2084–2140; WARMAC.MAC object/ship output labels.
Player observations request BASES, DAMAGES, LIST, SCAN 10 WARNING, STATUS.

V4 uses fresh LIST shields only when name/position match a current SCAN ship;
known remote installations guide navigation but cannot authorize a shot.
Ships take priority. Enemy base shots seek range five outside BASPHA's radius
four; built enemy planets seek range three outside PLNATK's radius two. Source
PHACON's build reduction threshold prevents strength-180 shots beyond range
four from reducing builds. Neutral/friendly and zero-build enemy planets are
excluded. Navigation gained a stopping range with unchanged existing defaults.
No capture/build or torpedo tactic was added. Decision metadata labels ship/
base/planet shot intent for health reports; these are attempts, not hit counts.

Fleet --ships 4|6|8|10 supports equal sides. Added Lancer/Farragut,
Ranger/Intrepid, Archer/Lexington; Fang/Cobra, Wraith/Goblin, Talon/Hawk to the
original four. Vulcan remains unassigned to bots. Added SCAN/LIST counters and
ship/base/planet phaser counts. Corrected stall recovery logging so a stopped
bot is not called progress-resumed. Updated CLI policy label and metadata test.

Validation: logs/automated-player-target-tests.log passes 14 focused cases.
Full bot/Telnet suite passes 47/47 in logs/automated-player-ten-regressions.log,
including real base shield damage, planet selection and neutral/unbuilt
exclusion, fresh LIST/SCAN target matching, and four/ten-ship fleet shutdown.
Typecheck: logs/automated-player-ten-typecheck.log. npm run audit:check:
logs/automated-player-ten-audit.log passes 135 archive hashes, 83 declarations,
33 main/16 pregame commands, 324 strings and both variant inventories.
Initial LIST typecheck: logs/automated-player-list-typecheck.log. All old evidence
is retained; no failed test runs in this round.

Started one ten-ship hour, not a series of matches:
caffeinate -i node experimental/automated-player/fleet.ts --port 2423 --ships 10 --seconds 3600 --log-dir logs/automated-player-ten-2026-09-06

Exec session 98258; start 2026-09-07T00:37:37.263Z, expected stop about 20:37 local
September 6. All ten reported playing, each using SCAN/LIST, with initial base
phaser attempts and no startup errors. New reports:
logs/automated-player-ten-2026-09-06/{configuration.json,health.json,events.jsonl}
and per-bot transcripts. The run is not completed at this checkpoint.

Reused the paused single-run heartbeat review-decwar-one-hour-fleet-run,
renamed Review DECWAR ten-ship battle, pointed it at the new directory and
reactivated its 15-minute cadence. It will report meaningful issues or completion,
review target-category evidence and representative combat outcomes, record
findings and pause. It will not restart the shared host or launch another match.

## 2026-09-06 — Shared Telnet comparison and tournament plan

Added the requested tournament mode to experimental/automated-player/PLAN.md alongside a shared TypeScript/PDP-10 response-comparison runner. Planned fixed-policy, faction-swapped repeated matches on isolated galaxies, explicit unfinished/failure outcomes, raw transcript evidence, and uncertainty reporting. Random streams and initial states are not assumed equivalent; competitive outcomes cannot establish semantic parity. Reference provenance and TOPS-10 startup requirements checked against legacy/utexas-reference/f78f2ec/README.md; preserved reference used native SIMH, and Docker/shared-client operation remains unverified. No executable or live-server changes. Documentation checks: logs/automated-player-tournament-plan-check.log. Next milestone: shared startup/capture smoke test before deterministic comparisons and tournament scheduling.

## 2026-09-06 — Input/output parity coverage plan

Prioritized all input/output modes in experimental/automated-player/PLAN.md ahead of tournaments. Reviewed Austin DECWAR.FOR:3652–3718 and MSG.MAC terminal/prompt definitions, plus the current client setup. Matrix covers OUTPUT, PROMPT, SCANS, ICDEF, OCDEF, every source TTYTYPE, interactive input and invalid/abbreviated choices, raw control bytes, defaults and mode interactions. Existing client forces four settings; future comparison setup must bypass them. Coverage remains planned, not native differential verification. No executable changes. Check: logs/automated-player-io-plan-check.log (git diff --check).


## 2026-09-06 ten-captain hour review

The scheduled hour ended at 01:37:37 UTC September 7 (20:37 Central September 6),
after 3,600,012 ms. Ten captains made 13,509 decisions, 7,271 movement attempts,
1,827 phaser attempts (1,635 ship / 192 base / 0 planet), 13,516 SCAN and 13,517
LIST calls, 1,673 DOCK attempts and two explicit repairs. Three deaths were
followed by continued play. No stalls were recorded; one scheduling pause
recorded 2,735 ms lag.

All ten connections ended at 01:37:03.573 UTC, about 34 seconds before the
scheduled finish. Each supervisor made six retry attempts; later attempts were
refused. The summary's 60 reconnects mean attempts, not successful recoveries.
The host log contains no shutdown explanation. This is a completed observation
window with a late host outage, not a clean uninterrupted hour. No host restart
was performed during review.

Representative Raven base shots show shield percentages falling from 86.4 to
74.5 to 63.4 to 53.4. Of 1,827 phaser responses, 432 contain a displayed 0.0 unit
hit; such a response can still accompany shield depletion, so zero text alone
is not a failed-shot measure. High docking frequency (notably Fang and Archer)
merits measuring time under enemy fire and progress between resupply cycles.
Next tactical checks: distinguish shield depletion from hull damage, verify
objective destruction, and stage an enemy built planet because no planet attack
was exercised here. These shared-galaxy observations do not establish win rate.

Evidence: logs/automated-player-ten-2026-09-06/{summary.json,review.json,events.jsonl}
and per-captain transcripts. Input/output parity work follows this review;
tournaments remain deferred.


## 2026-09-06/07 — Shared I/O capture milestone

Added compare-io.ts and diff-io.ts under experimental/automated-player. PlayerClient
now records base64 raw receive/send bytes (including negotiation), supports
explicit TOPS-10 startup and expected interactive response exchanges, and can
preserve initial modes instead of applying captain preferences. Normal captain
behavior retains its prior defaults. Reference login errors now stop explicitly
rather than silently reusing an unknown logged-in session.

An isolated TypeScript host completed 61 cases, covering 20 mode selections across
OUTPUT/PROMPT/SCANS/ICDEF/OCDEF and all eight source terminal types. Each selected
value was confirmed in TYPE OUTPUT. The live native SIMH reference completed a
four-case prefix: initial TYPE OUTPUT, SET OUTPUT SHORT, TYPE OUTPUT, STATUS.
First three responses match the TypeScript text exactly after removing one
explicit leading command echo; short STATUS differs only in coordinates
(45-9 versus 43-23). Worlds are not aligned. Raw comparisons retain those
transport and state differences; this is not full parity verification.

Reference startup initially exceeded 20 seconds; failed raw evidence is retained
in pdp10.jsonl. The 120-second-per-response retry resumed the account opened by
that failed attempt (monitor said Please KJOB or DETACH), entered DECWAR and
captured four cases. This prompted the subsequent fail-closed login guard;
future reference sessions require a clean login. Source/reference archives,
working disks and shared host were not modified by the tooling. The pre-existing
reference emulator runs natively, not in Docker. No Docker compatibility claim.

Evidence directory: logs/automated-player-io-first. Captures: typescript.jsonl,
pdp10.jsonl (failed), pdp10-retry.jsonl; comparison-initial.json preserves exact
response differences, review.json records explicit echo handling, and
typescript-settings-check.json verifies reported selections. Fifteen focused
client/codec tests passed; ordinary captain live test passed; typecheck and
archive audit passed. Outputs: client-tests-final.log, live-tests.log,
typecheck-final.log, audit-final.log, diff-check.log. Tests do not establish
original-executable parity. Source setting choices: legacy/utexas/DECWAR.FOR:
3652–3718; terminal names: MSG.MAC:358–359. No game semantics changed.

Remaining: 57 reference sweep cases, controlled coordinate-input effects,
interactions, invalid/abbreviated input, editing and reentry. Tournament work
remains deferred. The full matrix is deliberately not described as verified.

I/O checkpoint cleanup: reference test captain confirmed QUIT/YES and returned to TOPS-10 at 02:02:37 UTC; reference emulator left running. Isolated TypeScript comparison host PID 45274 received SIGTERM after captures. Fleet review heartbeat paused after results and initial shared comparison milestone.

## 2026-09-07 — Captain v5 objective capture and construction

Advanced the runnable strategic-play milestone with an objective role. Scout
and Raven are objective captains in the fleet; Wing, Shade and later ships keep
patrol roles. The captain uses fresh matching LIST and SCAN observations to seek
neutral or unfortified enemy planets, enters an adjacent sector with at least
3,500 displayed energy and 75% shields, issues CAPTURE, then builds a friendly
planet through the fifth-build base conversion. Fortified enemy planets remain
under the existing phaser policy. At Austin's ten-base limit, a four-build
planet is skipped to avoid repeating the source rejection. Source:
legacy/utexas/DECWAR.FOR:523–665 and PARAM.FOR:6.

Objective commands carry capture/build metadata separately from phaser target
categories. Player observation deltas record confirmed capture, visible build
increments and planet-to-base conversion; fleet schema 2 reports attempts and
confirmations. The CLI accepts `--mode objective`; policy label is captain-v5.

Connected verification used an isolated four-ship Austin game: Yorktown,
Excalibur, Wolf and Demon. Yorktown captured neutral planet 20-21, took source
planet defense (shields 100% to 94.5%), executed five BUILD commands and created
a second Federation base. LIST confirmed one capture, four build increments and
one base creation. Evidence: logs/automated-player-objectives/objective-tests-final.log
and logs/automated-player-scenario-1788770888369-839fc7ebf36d48.jsonl. The full
bot/Telnet regression then passed 55/55 in 52.5 seconds; log:
logs/automated-player-objectives/full-regression.log. This staged check does not
measure discovery frequency, defense, team coordination or competitive strength.
The final focused captain check passed 13/13, including symmetric Federation and
Empire objective decisions; log: logs/automated-player-objectives/captain-tests-final.log.


## 2026-09-07 — Evidence-driven I/O and recovery improvements

Runnable milestone: repeatable, assertion-bearing external mode/dialogue suites
with faithful comparison reports and accurate fleet recovery metrics.

Learned from the first shared captures: native command echo explains three of
four response differences; the fourth is a coordinate change in unaligned worlds.
Implemented io-comparison.ts and updated diff-io.ts: stable case IDs, duplicate
rejection, explicit missing/failed cases, capture configuration/errors, optional
one-exact-leading-command echo removal with original responses retained. No
numeric, whitespace or control-byte masking. The old four-case capture now
reports three echo-only matches, one needs-review and 57 missing cases.

Implemented io-scenarios.ts and expanded compare-io.ts: 61 mode steps and 58
interactive dialogue steps; checks reported settings; missing SET arguments,
blank and invalid values, ambiguous terminal names, switch prompt and abbreviation.
Case limits respect complete dialogue groups. Source: Austin DECWAR.FOR:3627–3718
and MSG.MAC:259–279. Both suites completed successfully on a new isolated public
TypeScript host; actual captures are modes.jsonl and dialogs.jsonl below. No
server state inspection or game semantics change.

Learned from native cleanup: returning to TOPS-10 leaves the account logged in.
The client now refuses an inherited monitor before sending commands, and
quitReference logs out only a client-established account after QUIT/YES using
K/F. Evidence: preserved build-console.txt:106–111,276–281. Synthetic session
checks cover logout and refusal; this updated native cleanup is not live-verified.
No new reference coverage or Docker verification is claimed; the earlier four
cases remain the only native mode checkpoint.

Learned from the battle outage: the old reconnect count increments when a
backoff is scheduled, even if the deadline prevents the attempt. Fleet schema 2
separates retrySchedules, retryAttempts and successful reconnects. Supervisor
emits retry-started only upon an actual next attempt and reconnected only after
joining again following an earlier join. Tests cover cancellation during backoff
and real TCP loss/recovery. Historical logs are unchanged; README explains the
old counter semantics. Tactical policy was not changed on ambiguous zero-hit
text or uncontrolled battle outcomes.

Checks/evidence: logs/automated-player-io-v2. tests.log: 20 focused client/codec/
comparison checks passed; recovery-tests.log: five supervisor/fleet checks passed,
including real TCP loss and 4/10-ship bounded runs. modes.jsonl: 61 completed
steps; dialogs.jsonl: 58 completed steps. previous-captures-review.json preserves
comparison evidence. typecheck-final.log, audit.log and diff-check.log passed.
Docs: README/PLAN and docs/status updated. No game source/archive changes.

Next: remaining 57 native mode steps and the new dialogue suite on a clean
reference terminal, then controlled coordinate-input effects and terminal editing.
Broader mode interactions and reentry remain open. No unattended new battle or
reference process was launched. Isolated host PID 46736 was selected for cleanup;
test captains already completed normal QUIT.

## 2026-09-07 — Fresh objective run, reporting correction in progress

Started a bounded 600-second four-ship captain-v5 evaluation on a disposable
Austin host through `fresh-fleet.ts`; evidence directory:
`logs/automated-player-objective-fresh-2026-09-07`. The first health snapshot
showed a real Scout capture and build attempt, but Wing's counters also credited
the teammate's observed ownership/build changes. Attempts and raw transcripts
remain valid; aggregate confirmation counters from this run are known inflated.

Changed player confirmation tracking to associate the next LIST transition only
with that captain's pending successful CAPTURE or BUILD command and exact
coordinates. Teammates that merely observe the transition no longer receive
credit. The active child process loaded the earlier code, so its counters will
remain diagnostic-only; verification and a clean follow-up run are required.

## 2026-09-07 — Fresh objective run and corrected evidence

The disposable 600-second Austin evaluation completed after 604,435 ms. Scout
issued seven CAPTURE and 24 BUILD commands; Raven issued four CAPTURE and 19
BUILD commands. Wing and Shade remained patrol captains. All four reached the
deadline without a death, stall, retry or reconnect. This verifies autonomous
planet discovery and objective command use. The run's observer-wide
confirmation counters are invalid as documented during the run; its attempt
counts and command transcripts remain valid. Review:
logs/automated-player-objective-fresh-2026-09-07/review.json.

Completed the reporting repair by associating a confirmation with only that
captain's pending successful CAPTURE or BUILD at the exact coordinates. A fresh
90-second four-ship run then recorded Scout's one confirmed capture and four
confirmed build increments. Wing and Shade recorded zero objective attempts and
zero confirmations. Raven attempted a capture on its last round; it correctly
remained unconfirmed because shutdown preceded the next LIST. All four again
had zero deaths, stalls, retries and reconnects. Evidence:
logs/automated-player-objective-attribution-check-2026-09-07/review.json.

Normal fleet clients no longer record raw Telnet packet events unless requested;
compare-io keeps them enabled for parity evidence. This reduced the complete
90-second evidence directory to about 1.2 MiB, compared with about 241 MiB for
the longer diagnostic run. Focused objective/reporting checks passed 18/18 in
logs/automated-player-objectives/objective-tests-attribution.log; focused raw
capture/client checks passed 9/9 in capture-reporting-tests.log. Typecheck and
archive/generated audit passed in typecheck-final.log and audit-final.log.
These evaluations establish functional objective play and honest reporting,
not win rate, competitive strength or original-executable parity. No further
unattended run was launched.

Final experimental-player regression passed 51/51 in 41.2 seconds; complete TAP
output: logs/automated-player-objectives/full-regression-current.log. An earlier
attempt invoked the repository-wide suite because npm resolved the root package;
localhost-dependent cases failed with sandbox EPERM. That invocation is recorded
in accidental-root-suite-sandbox-failure.log and was replaced by the correctly
scoped permitted run. Final JSON validation and `git diff --check` passed.
The post-review archive/generated audit also passed; log:
logs/automated-player-objectives/audit-after-review.log.

## 2026-09-07 — Tournament harness and captain-v6 defense experiment

Advanced the runnable competitive-evaluation milestone with
`combat-tournament.ts`, `tournament-report.ts` and `rebuild-tournament.ts`.
The runner creates one disposable Austin playable galaxy per match, uses only
external Telnet captains, alternates named strategies across factions and
checkpoints after each match. Surviving captains request `POINTS FED EMPIRE` at
shutdown; `observations.ts` parses displayed team totals and score categories.
Reports retain every concurrent shutdown sample, select the latest per side,
record action/death/objective evidence, classify elapsed matches as time limits,
and include average margins and 95% Wilson lead-rate intervals. Fresh worlds
are independent starts with no verified shared seed or random stream.

Added side-specific `objective`, `patrol` and `balanced` fleet strategies.
Objective remains the default. Balanced assigns one objective captain, one
defender and remaining patrol captains. The defender uses public LIST/SCAN data,
guards developed planets before bases and prioritizes visible ships nearest
friendly assets. This is bot policy; source POINTS formatting and mechanical
boundaries come from Austin DECWAR.FOR:2893–3056 and MSG.MAC:212.

The initial two-match objective-versus-patrol check split fixed-time leads 1–1.
The first four-match balanced check split 2–2 and trailed objective by 374.8
points per match. Transcript review showed defenders holding for 35 and 43
decisions without firing. Captain-v6 limits each watch to two observations,
then makes a 30-second combat sortie before returning. In the repeated
four-match design, guard holds fell to 2–4 and defenders made 15–19 movement
decisions. Balanced led 1/4 and averaged 642.7 fewer points than objective;
its 95% lead-rate interval is 0.046–0.699. All four matches completed with zero
deaths, stalls, retries and execution errors. This rejects the current balanced
policy as the default but does not establish a general win rate.

Evidence:
logs/automated-player-tournament-objective-vs-patrol-2026-09-07/summary.json,
logs/automated-player-tournament-balanced-vs-objective-2026-09-07/summary.json,
and logs/automated-player-tournament-balanced-v6-vs-objective-2026-09-07/summary.json.
The 30-second final-POINTS smoke run is retained at
logs/automated-player-tournament-smoke-2026-09-07. No existing galaxy or game
runtime was changed.

The first final regression invocation passed 54/55; the only failure was the
external CLI test's expected configuration label `captain-v5` after the runner
correctly emitted `captain-v6`. Full output is retained in
logs/automated-player-objectives/tournament-regression.log. Updated that version
contract before rerunning; no behavioral assertion was relaxed.

The corrected full experimental-player regression passed 55/55; complete TAP
output: logs/automated-player-objectives/tournament-regression-final.log.
Typecheck and archive/generated audit passed in tournament-typecheck.log and
tournament-audit.log. The structured evaluation conclusion is retained in
logs/automated-player-tournament-balanced-v6-vs-objective-2026-09-07/review.json.
Post-documentation typecheck and audit also passed in
logs/automated-player-objectives/tournament-typecheck-final.log and
tournament-audit-final.log; final JSON validation and `git diff --check` passed.

## 2026-09-07 — Experimental directory rename

Renamed the top-level `experiments/` directory to `experimental/` at the user's
request. Updated automated-player CLI usage text, child-process launch paths,
tests, README commands, status links and WORK_LOG path references. Preserved
all experiment contents and historical runtime logs; no legacy archive, game
runtime or existing galaxy changed.

Verified every launcher help path from `experimental/`. The renamed full suite
passed 55/55 in logs/automated-player-objectives/experimental-rename-regression.log;
typecheck and archive/generated audit passed in experimental-rename-typecheck.log
and experimental-rename-audit.log. A stale-reference scan found only this
historical rename statement. `git diff --check` passed and the old directory no
longer exists.

## 2026-09-07 — Automated-player command inventory

Verified the user's 31-command reminder against the Austin source command table
at legacy/utexas/DECWAR.FOR:437–471. Added a typed source-ordered catalog,
printable coverage CLI, public COMMANDS.md matrix and focused completeness tests.
Every command is classified as automatic, supported for verification, planned
for a concrete tactical role, or deliberately manual. The two subsequent source
entries, *DEBUG and *PASSWORD, are privileged host commands and are excluded
from the player catalog.

The next implementation order is TORPEDOES/TARGETS, TELL/RADIO coordination,
then ENERGY/TRACTOR support. PLANETS, SUMMARY and SRSCAN remain explicit but
will replace broader reports only if measured output or decision latency
justifies them. GRIPE remains human-only because it writes implementor feedback
and is not a game tactic. No game runtime, source archive or galaxy changed.

Validation: the full renamed automated-player suite passed 57/57 in
logs/automated-player-objectives/command-inventory-regression.log. Typecheck,
archive/generated audit and the generated 31-entry JSON inventory passed in
command-inventory-typecheck.log, command-inventory-audit.log and
command-coverage.json. The generated disposition counts are 16 automatic,
five supported, nine planned and one manual. `git diff --check` passed.

## 2026-09-07 — Captain-v7 TARGETS, torpedoes and guarded novas

Advanced the competitive-combat milestone with source-derived TARGETS and
TORPEDOES support. The external observation cycle now parses TARGETS through
the same Austin LSTOBJ row format as LIST, including the actual empty response
"Captain, there are no enemy forces in range." Ship fire requires a fresh
TARGETS coordinate to agree with SCAN. Captain-v7 fires one-torpedo bursts only
at LIST-reported shields below 85%, retains four rounds, rejects critical tube
or computer damage, and falls back to phasers during its conservative torpedo
readiness interval. The explicit syntax was corrected through Telnet evidence
to `TORPEDOES ABSOLUTE 1 v h`.

Added result classification for hits, deflections, misses, misfires, black-hole
losses, friendly neutralization, unaffected stars and novas. Unrecognized or
delayed terminal output remains `unknown`; it is never counted as a miss. Fleet
health now records TARGETS requests, torpedo attempts and outcomes, and the
last displayed ammunition count.

Verified the supplied help's nova tactic against executable TORP, SNOVA and
NOVA statements at legacy/utexas/DECWAR.FOR:2256–2391 and 3804–4424. A torpedo
intersection triggers the first star on 80 of 100 draws; adjacent stars can
chain, adjacent objects take nova damage, and each destroyed star costs the
firing side 500 points. The bot will target a star only beside a confirmed
enemy ship/base, within six sectors, with high shields and eight or more rounds.
It traverses the complete adjacent-star component and rejects any cluster on
the scan edge or any blast rim containing the firing ship, a friendly, a
planet, or a black hole. This is policy logic over public observations; it does
not modify game mechanics or claim the random trade is favorable.

The first focused run found two policy-test expectations plus sandboxed local
listen failures and is retained at
logs/automated-player-objectives/torpedo-targets-initial-failures.log. The first
permitted scenario run then exposed the two real protocol corrections and is
retained in torpedo-targets-scenarios.log history through the scenario JSONL
files. The corrected TARGETS/torpedo scenarios passed, including ammunition
10 to 9. The final full experimental-player regression passed 62/62 in
logs/automated-player-objectives/captain-v7-regression.log. Typecheck and
archive/generated audit passed in captain-v7-typecheck.log and
captain-v7-audit.log. The updated 31-command JSON inventory is
command-coverage-v7.json: 18 automatic, five supported, seven planned and one
manual. `git diff --check` passed. No legacy archive, game runtime or existing
galaxy changed. Captain-v7 has not yet been ranked against v6 in a tournament.

## 2026-09-07 — Ten-ship torpedo battle checks and captain-v8

Ran two fresh, disposable, ten-ship Austin games for 180 seconds each through
ordinary external Telnet sessions. The captain-v7 run completed 722 decisions,
467 moves and 99 weapon decisions with no deaths, stalls, retries, scheduling
pauses or execution errors. Its 44 torpedo attempts yielded 14 classified hits,
13 misses, five deflections, four misfires and eight novas. The initial summary
left the 13 source messages `torpedo 1 lost @...` as unknown; source output and
the transcript identify these as misses, and the classifier now handles them.

Six novas followed deliberate star targets and two happened while aiming at
ships. A deliberate Fang nova damaged and displaced an enemy Federation base,
and other shots damaged enemy ships, demonstrating the tactic. A Wraith shot
aimed at a selected safe star was deflected to a different star cluster and the
resulting nova damaged the friendly Goblin twice. This invalidates the claim
that checking only the intended connected cluster can make a deliberate nova
safe. The evidence is retained in
logs/automated-player-fleet-v7-battle-2026-09-07/.

Captain-v8 therefore disables deliberate nova decisions by default while
retaining the source-derived selector for controlled experiments. Direct
torpedoes remain enabled and may still cause accidental novas. The follow-up
ten-ship run completed 728 decisions, 392 moves, six capture attempts and 26
build attempts with no deaths, stalls, retries, scheduling pauses or errors.
All seven torpedoes targeted ships: three hit, three were deflected and one
missed; no nova occurred in that sample. Final displayed points were Federation
14893.5 and Empire 14112.0. Evidence is retained in
logs/automated-player-fleet-v8-battle-2026-09-07/.

Focused captain-v8 policy and Telnet scenarios passed 24/24 in
logs/automated-player-objectives/captain-v8-focused.log. These two independent
worlds establish functional battle behavior and expose nova risk; they do not
rank torpedoes against a phaser-only control. No existing galaxy, runtime or
legacy source was changed.

The final captain-v8 experimental-player regression passed 62/62 in
logs/automated-player-objectives/captain-v8-regression.log. It took 108.8
seconds because the bounded fleet and objective scenarios completed their full
shutdown paths; the process exited normally. Typecheck and archive/generated
audit passed in captain-v8-typecheck.log and captain-v8-audit.log.
`git diff --check` passed.

## 2026-09-07 — Coordinate-retry recovery and seeded weapon tournaments

Closed the execution defect from the first captain-v8 weapon comparison. During
the fourth match, Wing observed 65-23 and requested `MOVE ABSOLUTE 64 22`, but
game activity made that target its present location before MOVE executed. Austin
then entered LOCATE's interactive `Coordinates:` retry and the external client
timed out because it waited only for a command or reentry prompt. The failed run
is retained at
`logs/automated-player-weapon-tournament-v8-2026-09-07/summary.json` and the
exact dialogue in match-04/fleet/Wing.jsonl.

PlayerClient now recognizes only the source `Coordinates:` continuation, sends
ASCII ETX as Ctrl-C, and waits for the recovered game prompt before returning.
Unknown continuations still time out and close. This follows Austin
MSG.MAC coord1:39, supplied HELP CTL-C at HLP/DECWAR.RNH:513-527, and the port's
explicit ETX/Telnet-IP handling at src/transport/server.ts:52-55. A mock Telnet
test verifies the byte and connection reuse; a native Austin scenario submits
the current ship coordinates, observes the historical split error text and
retry prompt, then successfully reads STATUS on the same socket.

A clean replacement four-match run used fresh disposable Austin worlds, ten
ships and 90-second limits. All 40 captains completed with no death, failure,
stall or retry. Direct torpedoes and the identical phaser-only captain split
score leads 2-2. Torpedoes averaged 4,138.6 points against 3,868.8 (+269.8), but
Empire led all four matches regardless of policy. The 55 torpedo attempts
produced 26 hits, 13 misses, five deflections, three misfires and eight
accidental novas. Torpedoes increased damage-to-enemies points (7,893.5 versus
4,455.2); phaser-only play earned more build points (2,650 versus 750). The
faction result, four samples and nova exposure make the policy comparison
inconclusive. Evidence:
`logs/automated-player-weapon-tournament-v8-recovery-2026-09-07/summary.json`.

Implemented the game's actual seeded tournament startup across the client,
single-player CLI, fleet and disposable-host launchers. Both strategy and weapon
tournament harnesses now send `TOURNAMENT <seed>` through the first ordinary
Telnet session and give each adjacent faction swap the same seed. This aligns
initial random state but cannot pair later events once policies and concurrent
scheduling consume draws differently. A two-match 30-second smoke run recorded
`TOURNAMENT 1729` in both first-captain transcripts, completed all 20 captains
without errors, split faction leads 1-1, and had torpedoes lead both short
samples. This validates the harness, not competitive strength. Evidence:
`logs/automated-player-weapon-tournament-v8-seeded-smoke-2026-09-07/summary.json`.

Validation: client/startup tests pass in
`logs/automated-player-objectives/captain-v8-seeded-client.log`; the final full
experimental-player regression passed 65/65 in
`captain-v8-seeded-regression.log`. TypeScript checking and archive/generated
audit passed in `captain-v8-seeded-typecheck.log` and
`captain-v8-seeded-audit.log`. `git diff --check` passed. No legacy source,
game runtime, existing galaxy or interactive server was changed.

## 2026-09-07 — Captain-v9 close-range torpedo gate

Measured the preserved v8 weapon transcripts by firing distance. In the
four-match 90-second series, range 9-10 produced 10 misses in 17 attempts,
versus three misses in 38 attempts at range 3-8. The seeded 30-second smoke run
also had eight misses at range 9-10 and none at shorter range. Added a policy
gate requiring distance eight or less before a weakened-target torpedo; distant
targets continue through phaser/approach logic. This is an experimental policy,
not a game-rule change.

Focused captain tests passed 17/17 and the full automated-player regression
passed 66/66 in `logs/automated-player-objectives/captain-v9-range-regression.log`;
experimental typecheck passed. A fresh seeded 90-second, ten-ship Austin battle
then completed 325 decisions and 221 moves with no deaths, stalls, reconnects or
execution errors. It made 16 torpedo attempts: 10 hits, three misses, one
deflection, one misfire and one nova. Lancer encountered a real stale-MOVE
`Coordinates:` retry and emitted `sent-interrupt`; the fleet continued normally.
Evidence is retained at
`logs/automated-player-fleet-v9-range-2026-09-07/fleet/summary.json` and the
per-ship JSONL transcripts. The run demonstrates robust execution and a better
short sample, not causal competitive superiority.
## 2026-09-07 — Captain-v10 shared-intel pursuit

Added a fleet-local `FleetIntel` channel populated only from public TARGETS
reports. Sightings are keyed by observing team and ship name, refreshed when a
teammate sees the ship and expired after five seconds. Captain-v10 uses a recent
teammate position only as a movement waypoint; weapon decisions still require
the acting captain's fresh SCAN/TARGETS agreement, so shared data cannot become
an unverified firing solution.

The focused captain suite and full automated-player regression passed after the
change (68 tests). A fresh seeded 90-second, ten-ship battle generated 81
teammate-pursuit decisions and completed 332 decisions and 243 moves with no
deaths, stalls, reconnects or execution errors. It made 13 torpedo attempts:
seven hits, three misses, two deflections and one misfire, with no nova. Evidence
is retained at
`logs/automated-player-fleet-v10-intel-2026-09-07/fleet/summary.json` and the
per-ship transcripts. This establishes live pursuit and stability, not a
competitive score claim.

## 2026-09-07 — Attach-run availability check

Attempted another bounded ten-ship, 120-second Austin battle against the
interactive host on port 2423. The first attempt was blocked by the sandbox
(`EPERM`); the approved retry reached the port but received `ECONNREFUSED`, so
no captain joined and no gameplay evidence was produced. The failed diagnostic
transcripts are retained at
`logs/automated-player-fleet-v10-battle-2026-09-07/` and
`logs/automated-player-fleet-v10-battle-2026-09-07-escalated/`. The next live
run should start or expose a reachable host before launching the fleet.

## 2026-09-07 — Captain-v10 180-second ten-ship battle

The disposable Austin launcher successfully created an ephemeral host and ran
ten captains for 180 seconds with tournament seed 1735. All ten sessions ended
only at the planned duration: 672 decisions, 487 moves, 91 shots and 41
torpedo attempts (28 hits, eight misses; remaining outcomes were deflections,
misfires or other classified results). Fleet-local pursuit produced 228
decisions. There were no deaths, stalls, reconnects or execution errors. The
run confirmed one planet capture but no builds or base conversions, so the next
policy work should improve objective follow-through after capture. Evidence is
retained at `logs/automated-player-fresh-fleet-v10-battle-2026-09-07/`.

## 2026-09-07 — Captain-v10 300-second objective follow-through run

Ran a longer ten-ship seeded Austin tournament (seed 1736) on a disposable
host. All 1,150 decisions completed without deaths, stalls, reconnects or
execution errors. The fleet made 730 moves and 163 shots, including 60
torpedo attempts (29 hits, eight misses, 11 deflections, seven misfires and
five novas); 174 decisions used teammate sighting pursuit. Both objective
captains observed and approached planets, but combat and resupply priorities
prevailed before orbit was reached: zero captures, builds or base conversions
were confirmed. This points to objective scheduling and persistence as the next
policy gap, while the combat/coordination path remained stable. Evidence is at
`logs/automated-player-fresh-fleet-v10-long-2026-09-07/`.

## 2026-09-07 — Captain-v11 persistent objective waypoint

Objective captains now retain a selected planet waypoint through ordinary
combat and resupply detours. The remembered position is used only for routing;
the captain still requires a fresh planet LIST row, current SCAN symbol and
safe reserves before issuing CAPTURE or BUILD. TypeScript checking and the full
experimental-player regression passed (29 tests). A post-change 60-second,
ten-ship disposable Austin smoke completed 220 decisions and 164 moves with
34 shots, 22 torpedo attempts (11 hits, four misses), one confirmed capture,
and no deaths, stalls or reconnects. Evidence is at
`logs/automated-player-fresh-fleet-v11-smoke-2026-09-07/`.

## 2026-09-07 — Captain-v12 bounded objective memory

The v11 transcript showed that distant planet rows could disappear from LIST
before the captain reached orbit. Extended the objective waypoint memory to a
60-second navigation-only expiry. Current SCAN/LIST evidence remains mandatory
for CAPTURE and BUILD, so stale coordinates cannot become action authorization.
TypeScript checking and the focused captain suite passed (18/18); the full
experimental-player regression remains green at 29/29. A post-change,
ten-ship, 120-second disposable Austin run completed 404 decisions and 344
moves, confirmed two captures and one build, and had zero deaths, stalls or
reconnects. Evidence is at
`logs/automated-player-fresh-fleet-v12-smoke-2026-09-07/`.

Added a focused expiry regression test: after 60 seconds without a refreshed
objective row, the captain no longer describes or acts on the old planet
coordinate. The focused captain suite now passes 19/19 and TypeScript checking
passes after the v12 refinement.

## 2026-09-07 — Captain-v12 objective versus patrol matchup

Ran a fresh ten-ship, 180-second seeded Austin matchup with Federation
objective captains against Empire patrol captains (seed 1740). The run
completed 765 decisions and 453 moves with 104 shots and 30 torpedo attempts
(20 hits, three misses), and no deaths, stalls or reconnects. Final observed
team points were Federation 3,531.1 and Empire 3,452.6, a narrow Federation
lead. No captures or builds occurred in this sample, so it is evidence of
stability and a small matchup signal rather than a superiority claim. Evidence
is at `logs/automated-player-fresh-fleet-v12-objective-vs-patrol-2026-09-07/`.

## 2026-09-07 — Four-match objective versus patrol tournament

Ran four fresh seeded 90-second ten-ship matchups, alternating which faction
received the objective strategy (base seeds 1741–1742). All four reached their
time limits with zero execution errors. Patrol led three matches and objective
led one; objective averaged 1,561.4 points versus patrol's 2,012.4 (average
margin -451). Objective produced one confirmed capture and no deaths; patrol
had one death and no captures. The result indicates objective pursuit is safe
but currently spends too much time away from combat, so its navigation timeout
and handoff conditions need tuning. Evidence is at
`logs/automated-player-combat-tournament-v12-2026-09-07/summary.json`.

Reduced objective waypoint commitment from a refresh-based 60-second window to
a 30-second total commitment window. Repeated LIST sightings no longer extend
the same planet pursuit indefinitely; fresh action checks are unchanged. The
focused captain suite stayed green at 19/19 and TypeScript checking passed. A
post-change 60-second ten-ship smoke completed 239 decisions and 170 moves with
32 shots, 13 torpedo attempts (seven hits, two misses), and no deaths, stalls
or reconnects. Evidence is at
`logs/automated-player-fresh-fleet-v14-commit-smoke-2026-09-07/`.

## 2026-09-07 — v14 four-match objective versus patrol tournament

Repeated the paired four-match, 90-second, ten-ship tournament after bounding
objective commitment to 30 seconds (base seeds 1745–1746). All four matches
reached their time limits with zero execution errors or deaths. Objective and
patrol split match leads 2–2, but objective averaged 2,566.5 points versus
patrol's 1,843.9 (average margin +722.5). Objective confirmed one capture and
four builds; patrol confirmed none. This is stronger evidence that bounded
planet pursuit improves strategic output, though the sample remains small.
Evidence is at
`logs/automated-player-combat-tournament-v14-2026-09-07/summary.json`.

## 2026-09-07 — Captain-v15 objective priority over shared intel

The v14b counter-tournament showed objective captains were diverted by shared
teammate sightings before their planet branch ran. Restricted teammate-sighting
pursuit to non-objective roles and added a regression proving objective captains
keep planet priority. Focused captain tests pass 20/20 and TypeScript checking
passes. A paired two-match, 90-second, ten-ship smoke (seed 1749) split leads
1–1, but objective averaged 3,379.7 points versus patrol's 2,599.7, confirmed
one capture and four builds, and had no deaths or execution errors. Evidence is
at `logs/automated-player-combat-tournament-v15-smoke-2026-09-07/summary.json`.

## 2026-09-07 — v15 four-match validation tournament

Ran four new paired 90-second, ten-ship matchups after giving objective
captains priority over shared teammate pursuit (base seeds 1750–1751). All
matches reached their limits with zero execution errors. Objective led three
matches and patrol one; objective averaged 3,792.4 points versus patrol's
3,440.8 (average margin +351.6). Objective confirmed three captures and 12
builds, while patrol confirmed none. Objective had one death and patrol none,
so the strategic gain is clear in this sample but safety still needs monitoring.
Evidence is at
`logs/automated-player-combat-tournament-v15-2026-09-07/summary.json`.

## 2026-09-07 — Captain-v16 enemy-installation safety filter

The v15 death trace showed an objective captain pursuing a neutral planet inside
a known enemy base's four-sector defense radius. Objective planet candidates
now exclude planets within that known radius; fresh SCAN/LIST and reserve
checks remain required. Focused captain tests pass 21/21 and TypeScript
checking passes. A post-change 120-second, ten-ship Austin smoke completed 417
decisions and 262 moves, confirmed three captures and seven builds, and made 20
torpedo attempts (13 hits, one miss, one deflection, one misfire and four
novas), with zero deaths, stalls or reconnects. Evidence is at
`logs/automated-player-fresh-fleet-v16-safety-2026-09-07/`.

## 2026-09-07 — v16 four-match safety validation

Ran four new paired 90-second, ten-ship matchups (base seeds 1753–1754) after
adding the enemy-base defense-zone filter. All matches reached their limits
with zero execution errors. Objective and patrol split leads 2–2; objective
averaged 1,808.9 points versus patrol's 1,829.8, while objective confirmed two
captures and eight builds and patrol none. The one recorded death was patrol
role Lancer rather than an objective captain. Evidence is at
`logs/automated-player-combat-tournament-v16-2026-09-07/summary.json`.

## 2026-09-07 — Torpedo-path review

Reviewed Austin TORP/CHECK source behavior after repeated runs showed
occasional accidental novas. The source computes the path through CHECK and
uses a random branch when a star is reached; the player currently cannot infer
that exact path safely from a coarse SCAN without reproducing source geometry
and arithmetic. No speculative star-avoidance rule was added. This remains a
candidate for Astra-level source-semantic work; ordinary Luna-medium testing
continues with the verified conservative weapon policy.

## 2026-09-07 — v16 300-second objective confirmation

Ran ten objective-configured captains for 300 seconds on a fresh Austin world
(seed 1755). The fleet completed 1,115 decisions and 746 moves, with 118 shots
and 31 torpedo attempts (19 hits, three misses, three deflections and six
novas). It confirmed six planet captures and 20 builds, with no stalls or
reconnects. One death occurred in patrol-role Archer; the objective captains
survived. Evidence is at
`logs/automated-player-fresh-fleet-v16-long-confirmation-2026-09-07/`.

Ran the repository-wide `npm run check` checkpoint after the player policy
changes. Archive/generated audit, TypeScript checking and the complete root
test suite passed, including live TELL/RADIO exchange, tractor release,
PHASERS/TORPEDO combat, SCAN/USERS/LIST, and CAPTURE/BUILD/DOCK/POINTS
scenarios. No legacy archive or runtime source was changed by the player work.

## 2026-09-07 — v16 weapon-policy tournament

Compared the current conservative torpedo policy against a phaser-only control in
four paired 90-second, ten-ship Austin tournament matches (base seeds 1756–1757).
All matches reached their time limits with zero execution errors or deaths. The
torpedo policy led all four fixed-time score comparisons, averaging 2,984 points
versus 1,265.8 for phaser-only control (average margin +1,718.3). It made 64
torpedo attempts with 35 hits, nine misses, eight deflections and 12 novas;
the phaser control made 59 ship shots. The result supports retaining torpedoes
as the primary weapon, but this small sample is not a claim of universal parity
or completed-game victory. Evidence is at
`logs/automated-player-weapon-tournament-v16-2026-09-07/summary.json`.

## 2026-09-07 — v16 balanced-strategy comparison

Compared the `balanced` fleet assignment (objective captain plus dedicated
 defender) with the current `objective` assignment in four paired 120-second,
ten-ship Austin tournament matches (base seeds 1758–1759). All matches reached
their limits with zero execution errors. The strategies split leads 2–2, but
objective averaged 3,453.7 points versus balanced's 2,720.3 (average margin
+733.5 for objective). Objective recorded zero deaths, three captures and
eight builds; balanced recorded two deaths, two captures and eight builds. The
current objective default remains the stronger observed policy. Evidence is at
`logs/automated-player-strategy-tournament-v16-balanced-2026-09-07/summary.json`.

## 2026-09-07 — v16 ten-minute endurance run

Ran ten objective-configured captains with torpedoes for 600 seconds on a fresh
Austin tournament world (seed 1760). The run completed normally with 2,251
decisions, 1,274 moves, 343 shots, 220 docks and one repair. It made 95
torpedo attempts (47 hits, 17 misses, 12 deflections, five misfires and 14
novas), confirmed five captures and 20 builds, and recorded zero deaths,
stalls, reconnects or execution errors. Final observed score was Empire
12,276.2 to Federation 11,205.4. The run supports the current survivability and
objective behavior; it is endurance evidence, not a completed-game parity
claim. Evidence is at
`logs/automated-player-fresh-fleet-v16-endurance-2026-09-07/fleet/summary.json`.

## 2026-09-07 — Specification 1.0 MOVE review draft

Added docs/spec1.0/07-command-semantics.md with Section 7.1 MOVE in the
agreed language-reference format: displayed forms, syntax, semantics, output,
and six worked movement examples. Included it in the PDF build and linked it
from the specification README. Section numbers retain the existing outline;
lexical/grammar chapters are not claimed complete.

Reviewed the authorized Austin MOVE, LOCATE, CHECK/CHKPNT, output formatting,
random helpers, and completion calls. Separate provenance is recorded in
docs/spec1.0/evidence/07-move.md. The entry uses displayed energy/damage units
and mathematical geometry. C-005 through C-007 record open choices about
rejected-command side effects, path/towing behavior, and readiness timing.
Shared completion, player preferences, and randomness still require review;
the command is explicitly a draft, not a complete conformance contract.

Rebuilt output/pdf/decwar-specification-austin-core.pdf (17 pages; MOVE begins
on printed page 12). Reviewed the title, contents, ADT/command transition, and
all new pages as rendered PNGs. Corrected missing operand/arrow glyphs,
overflowing output/example tables, and the section page break. Initial warning
logs remain in logs/spec1.0-move; pdf-build-final-layout.log is the clean final
build and pdf-info-final.log records the artifact. Archive/generated audit
passed in audit.log; diff-check-final.log passed. This was documentation work;
no running-game behavior changed or original-executable parity was claimed.

## 2026-09-07 — v16 objective generalization tournament

Ran six paired 90-second, ten-ship Austin tournament matches across three fresh
seeds (1761–1763), alternating objective and patrol assignments by faction.
Every match reached its time limit with zero execution errors. Objective and
patrol each led three matches, but objective averaged 3,300.5 points versus
patrol's 2,092.6 (average margin +1,208.0), confirmed four captures and 16
builds, and recorded zero deaths. Patrol confirmed no captures or builds and
recorded one death. Objective made 58 torpedo attempts with 36 hits; patrol
made 41 with 25 hits. Evidence is at
`logs/automated-player-combat-tournament-v16-generalization-2026-09-07/summary.json`.

## 2026-09-07 — ENERGY/TRACTOR support boundary review

Reviewed Austin source routines `ENERGY` (DECWAR.FOR:1007–1070) and
`TRACTOR` (DECWAR.FOR:4435–4503) against the public observations available to
the external player. ENERGY requires an adjacent friendly recipient and a
useful transfer amount, but default LIST provides no recipient energy level;
TRACTOR requires both ships to be adjacent with both shields down, and the
external protocol provides no consent or towing request signal. Automatic use
would therefore guess at hidden need or interfere with a teammate. No
speculative commands were added; these remain planned pending observable
coordination evidence. The current player continues to use public SCAN/LIST/
TARGETS, docking, repair, combat and objective actions.
