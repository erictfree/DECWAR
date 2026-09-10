# Release effects

## Checked IMPULSE exhaustion sequence

The conformance-sequence companion now connects written `I R 1 0` to
recognition/resolution, axis path, four-unit cost, completion, fatal-acquisition
guard, final report and release. Both a clear sector and an adjacent star are
covered; pending capture points commit and damage repairs before release.
Warp damage does not gate IMPULSE. The fixture explicitly supplies the movement
effects and exhaustion text rather than claiming a generic movement dispatcher,
live scheduler or native transcript. Log:
`logs/spec1.0-nova/impulse-exhaustion-check.log` (269 passing suite checks).

## Movement exhaustion versus marked destruction, 2026-09-08

DECWAR.FOR103–115 tests ALIVE after MOVE/IMPULS returns, selecting immediate
departure only when the vessel was marked dead. MOVE's energy debit at2221
does not assign ALIVE; normal completion is at3400/3500. GETCMD1193–1206
and1274–1276 later checks energy and emits exhaustion text. Section9.1 now
distinguishes an energy-zero commissioned ship from already-marked destruction
at this boundary. The example does not assert absence of concurrent attacks
in general: it explicitly uses a sequential movement without such destruction.

## Sequential companion coverage, 2026-09-08

The release and QUIT companions now exercise the previously prose-only
report/release composition. A fresh submitted response is distinguished from
unconsumed prior input and from no response yet. First-token affirmative
prefixes, extra response tokens, RED, cancellation and prior slash-input
discard are checked. Linked release retains the other player's notice and
outgoing radio deliveries; last-copy deliveries are removed. Destroyed release
preserves a replacement star, following the draft's flagged C-020 rule rather
than claiming historical parity. No notification ordering policy is adopted.

Logs: `logs/spec1.0-nova/ship-release-check.log` and
`logs/spec1.0-nova/quit-confirmation-check.log`. This supersedes earlier coverage
statements below that report no release integration. Raw editing, interrupted
confirmation, concurrency, re-entry and zero-denominator policy remain open;
the checks are not an original-executable transcript.

FREE, DECWAR.FOR:1082–1139, ignores positive ALIVE, clears occupancy, decreases
active counts, breaks tractors, records re-entry information, clears player
association/position/energy, drains hit deliveries, drains radio deliveries,
then marks the ship available. Other damage and supply fields are not reset
there. Commission initialization, not release, establishes a fresh ship.

Section 9.2 describes semantic effects rather than the saved process-local
copies used for RSTART. It makes no implicit score commit or repair operation.
The historical unconditional SETDSP at the old position is separated as C-020;
the draft's vessel-specific removal is a flagged proposal, not claimed parity.
Radio cleanup consumes only this recipient's delivery through GETMSG; original
recipient sets and other pending deliveries are not recalled on sender release.
Further work must define eligibility and final-report sequencing. No executable
full-release test is claimed until the pending combat event model exists.

## Final reporting and acquisition checks

DECWAR.FOR:303–308 and1266–1271 call POINTS(true) before FREE, with no
score-commit call between. POINTS:2900,2925–2930 selects individual plus all
factions, omitting Romulan only when ROMOPT is false. Its rows read score,
tmscor and rsr, not tpoint (2992–3004). Thus pending player awards are not
silently committed by final reporting.

The final-points companion now selects report columns directly from the ship,
faction and Romulan ADTs and invokes the shared POINTS layout. A complete
short-output scenario checks distinct committed totals and averages while
preserving pending awards and the commission. A second checks enabled-but-
absent Romulan statistics and destroyed-but-unreleased reporting. Zero
denominators remain explicitly refused under C-013. This verifies the report
stage, not confirmation, pending-notice draining, or release integration.
Check log: `logs/spec1.0-nova/final-points-check.log`.

GETCMD:1193–1206 drains combat then radio, waits previous readiness, emits
a newline, checks hull then energy. GETCMD:1223–1228 repeats delivery then
fatal checks while waiting. Energy exhaustion at1274–1276 emits ODISP plus
MAIN02; MSG.MAC:126 contains RUNS OUT OF ENERGY!!. Immediate fatal command
branches need separate review; this is not a universal drain-on-death rule.

## Explicit QUIT dialogue and pre-game distinction

DECWAR.FOR:135–141 emits SURE00, clears prior input, reads a separate response,
and branches to final reporting only for YES (or the separate hangup path).
Other responses return to command acquisition. The confirmed path at 293–309
reports before FREE and exits without another ordinary command prompt or
farewell. SETUP.FOR:76–140 dispatches pre-game QUIT to MONIT without POINTS,
confirmation or FREE. Section 7.26 states the abstract interaction boundary,
not monitor/process termination or a resume guarantee.

The combined linked-ship/radio departure scenario composes the existing release
rules in prose. Existing final-points tests verify committed report selection;
they do not yet execute complete release with pending combat notices.
