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
- Prefer Astra medium; explicitly tell the user if high is warranted. No current
  recommendation to raise effort. Do not claim the actual app setting was changed.
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
  - Unrelated automated-player work is present concurrently in experiments/,
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
- No runtime, live-server or immutable archive changes. Separate experiments/,
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
data changed. Unrelated experiments/, docs/status.md and other WORK_LOG additions
are preserved and excluded from this checkpoint.

Remaining goal work includes complete shared combat/turn operation contracts,
lifecycle/concurrency/control and terminal bindings, malformed grammar cases,
randomness and the CompuServe appendix; this checkpoint does not complete the goal.


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
WORK_LOG.md, docs/status.md and experiments/ is preserved and excluded.

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
concurrent experiments/, docs/status.md and unrelated WORK_LOG.md changes.


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
