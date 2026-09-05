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
