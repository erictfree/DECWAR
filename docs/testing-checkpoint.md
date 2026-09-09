# Post-midnight validation checkpoint

September 8, 2026. This checkpoint checks the playable runtime after the midnight
wait repair. It combines focused clock tests, both variants' session and Telnet
checks, and bounded external-player runs. It does not establish complete native
PDP-10 parity or overnight stability.

## Executed checks

| Area | Evidence and scope |
| --- | --- |
| Midnight and clock changes | Both variants' raw PAUSE reproduces rollover; playable PAUSE completes. Cap and early-wake behavior are retained. Closed/queued-input waits permit cancellation. `test/midnight-session.test.ts`. |
| Command completion | CompuServe DOCK crosses simulated midnight, accepts STATUS afterward, and performs scoring/release when disconnected during the wait. `test/playable-game.test.ts`. |
| Austin over Telnet | DOCK crosses simulated midnight through actual TCP/Telnet, including disconnect release. Startup, editing, raw Ctrl-C, Telnet IP, ship reuse, a fresh galaxy and 18 concurrent captains also complete. `test/austin-telnet.test.ts`. |
| External fleet | Ten captains, five per side, seed 1729, 180 seconds: 628 decisions, 487 move attempts, 40 phaser attempts, three torpedo attempts, ten docks, four confirmed captures and 12 confirmed build steps. No recorded stalls, retries or deaths. All ten end at the requested deadline and the temporary host exits. |
| Player tooling | 99 bot, public player-library and parity-harness tests pass. This verifies those tools, not a new native differential run. |
| Memory | Four-captain, 60-second diagnostic runs explicitly collect garbage before samples. Removing the unused live character transcript eliminates its retained entries. Sampled peak live heap was 50.4 MiB before and 36.7 MiB after, with 128 versus 120 decisions; these are different schedules, not a controlled performance percentage. Heap drops after session release. |
| Output integrity | A bounded test captures application bytes at the terminal boundary and compares them with decoded Telnet output. Production no longer retains a second character transcript merely to support this test. |
| Full regression | 4,576 runtime tests pass, plus strict TypeScript checking. `logs/post-midnight-validation/full-tests-pass.txt`. |
| Source preservation | `npm run audit:check` verifies unchanged archive/generated evidence. No original source bytes were edited. |

Evidence is under `logs/post-midnight-validation/`; the original midnight repair
checks remain under `logs/parity-stall-midnight/`. Failed diagnostics are retained.
The Austin extension initially failed after successful cleanup because its next
login supplied an existing-galaxy response to a fresh-galaxy prompt. The test now
follows the observed startup dialogue. This was not another midnight runtime stall.

## Command coverage boundaries

The full runtime suite covers the following command families. These labels
separate composed TypeScript tests from connected-session and external-bot checks;
they do not imply that every switch, invalid argument or source variant has
received a native-executable differential test.

| Commands | Coverage basis |
| --- | --- |
| BASES, LIST, PLANETS, SUMMARY, TARGETS, USERS | Report/parser components, main command composition and live report sessions; bots repeatedly use SCAN/LIST/TARGETS. |
| SCAN, SRSCAN | Main scan composition, live board rows/ranges, Austin initialization and continuous bot observations. |
| STATUS, DAMAGES | Output/device reporting components and live status; bots read supplies and damage before decisions. |
| MOVE, IMPULSE | Movement components, main dispatch, live MOVE and fleet navigation. An attempted move count is not a count of successful moves. |
| PHASERS, TORPEDOES, SHIELDS | Arithmetic and command tests, opposing live captains, destruction cleanup and fleet firing. Random parity remains limited to previously documented aligned fixtures. |
| CAPTURE, BUILD, DOCK | Main command and live ownership/supply tests; fleet confirms capture/build changes. This run did not create a new base; prior installation parity evidence is separate. |
| ENERGY, TRACTOR, REPAIR | Transfer/repair/tractor components and main dispatch; live tractor establishment/release and quit cleanup. This fleet did not exercise ship-to-ship ENERGY or REPAIR. |
| TELL, RADIO | Messaging components and live captains exchanging messages and honoring RADIO OFF. |
| HELP, NEWS | Source-file and live repeated-read checks. |
| SET, TYPE | Input/output mode components, startup and Telnet mode checks. |
| POINTS, QUIT, TIME | Score/time components, live score persistence, quit/death/game-over release and fleet final points. |
| GRIPE | Controlled live file persistence, empty input, busy-file retry and allocation failure checks. Bots intentionally do not submit feedback. |

## Remaining limits

The diagnostic-array retention limit identified in this checkpoint was subsequently
addressed: live sessions now default to no retained histories, with optional
bounded recent history. See [runtime diagnostics](runtime-diagnostics.md) for the
later implementation and measured off/capped bot runs. The figures above preserve
this earlier checkpoint's evidence.

These runs are minutes long. They do not prove overnight behavior, recovery from
machine sleep, all malformed dialogues, or competitive strategy quality. Native
Docker testing, ship-to-ship assistance parity and the remaining historical
compiler/monitor questions were not resolved by this checkpoint. See
[implementation status](status.md), [playable repairs](playable-decisions.md),
and the [parity guide](../experimental/parity/README.md).
