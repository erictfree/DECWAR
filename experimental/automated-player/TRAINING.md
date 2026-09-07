# Tactical training checkpoint — 2026-09-05

The v3 captain fixes a combat reserve gap and adds cautious approaches to lone
distant enemies. Training here means reviewing trials and changing tested code;
captains do not update their own policy or call a model during play.

## Changes and source basis

The v2 policy allowed patrol between 2,400 and 2,799 displayed energy despite
requiring 2,800 to fire. The v3 policy enters resupply when an enemy is visible
below that firing threshold, and retains the resupply goal after losing sight
of the enemy. The reserve values are bot preferences, not game constants.

With at least 3,200 energy and 75% shields, v3 approaches a lone scanned enemy
to range four if the next step reduces distance and avoids known installation
danger. It continues to fire from its existing position when these conditions
are not met. Austin [PHADAM](../../legacy/utexas/DECWAR.FOR):4167–4195 attenuates
phaser damage by distance. Four-sector range is a heuristic, not an exact
optimizer. PHACON:2647–2760 continues to determine actual damage, energy,
overheating and bank delays in the unchanged game runtime.

## Comparison

The [runner](test/training.ts) exercised 16 isolated trials: two repeats each
for two policies and four scenarios. Development used Federation ships;
held-out validation used Empire ships with different initial ranges and energy.
The candidate was not retuned after viewing held-out outcomes. Previous policy
code is preserved in [captain-v2.ts](test/captain-v2.ts); both versions share
the unchanged observation, protocol and navigation infrastructure.

Each trial allowed 12 decisions. A stationary phaser sentry used its own Telnet
scans, ordinary strength-180 shots and a conservative readiness interval. The
runner alternated bot and sentry observations/actions; this is a controlled
tactical test, not a simultaneous full-match tournament. The passive target
did not return fire. Runtime random streams were not paired.

Mean results across two repeats per row:

| Scenario | Policy | Full resupply within budget | Final energy | Final shields | Final hull damage |
| --- | --- | --- | --- | --- | --- |
| Federation, 2,600 starting energy | v2 | 0/2 | 1,655 | 35.9% | 848.6 |
| Federation, 2,600 starting energy | v3 | 2/2 | 5,000 | 100% | 0 |
| Empire, 2,700 starting energy | v2 | 0/2 | 1,723.5 | 37.1% | 834 |
| Empire, 2,700 starting energy | v3 | 2/2 | 5,000 | 100% | 0 |

| Passive target | Policy | Shots | Shot energy | Target shield loss (percentage points) | Target hull damage | Elapsed seconds |
| --- | --- | --- | --- | --- | --- | --- |
| Start at range 10 | v2 | 3 | 1,140 | 23.6 | 70.2 | 10.3 |
| Start at range 10 | v3 | 2 | 760 | 27.4 | 72.5 | 22.3 |
| Start at range 8, sides swapped | v2 | 3 | 1,140 | 27.2 | 96.1 | 10.2 |
| Start at range 8, sides swapped | v3 | 2 | 760 | 27.9 | 75.5 | 18.3 |

The approach saved firing energy and achieved similar or greater shield loss,
but took longer; the swapped-side case caused less total hull damage. Approach
movement additionally cost 48 energy at range ten and 32 at range eight. These
samples support the reserve repair and expose the approach tradeoff. They do
not establish statistical significance, match win rate, or superiority against
moving opponents that return fire.

## Evidence and next evaluation

Reproduce with the commands in the [README](README.md#checks-and-repeatable-runs).
Saved development results: `logs/automated-player-training-1788662159741/summary.json`.
Held-out results: `logs/automated-player-training-1788662173787/summary.json`.
Each summary references the complete observation/action transcript. All 16
trials completed without protocol errors or detected deaths.

All 35 bot/Telnet regression cases passed across the main run and targeted CLI
rerun. The first run's sole failure was the CLI assertion still expecting the
old policy label; the final rerun verifies v3. Evidence:
`logs/automated-player-training-regressions.log`,
`logs/automated-player-training-live-final.log`,
`logs/automated-player-training-typecheck.log` and
`logs/automated-player-training-audit.log`. Archive/generated-data checks pass.

Next evaluate equal elapsed-time budgets, moving opponents, approach under
sustained return fire, and whether leaving a friendly base to close range is
worthwhile. Preserve these small fixtures as regressions, not as the sole
optimization target. Live two-versus-two play supplies further transcripts;
live activity alone is not a competitive benchmark.

## One-hour operating run — 2026-09-06

The monitored fleet reached its planned 3,600-second duration and completed
shutdown after 3,601.567 seconds, from 22:02:29 to 23:02:30 UTC (17:02–18:02
America/Chicago). All four bots quit through the normal dialogue. The final
`interrupted` state denotes the scheduled duration cancellation, not a crash;
`durationReached` is true, and the host records all four sessions as completed.

| Captain | Decisions | Movement commands | Phaser commands | Dock commands |
| --- | --- | --- | --- | --- |
| Scout / Nimitz | 1,320 | 1,060 | 60 | 57 |
| Raven / Wolf | 1,430 | 990 | 112 | 92 |
| Wing / Excalibur | 1,419 | 989 | 107 | 94 |
| Shade / Demon | 1,341 | 1,046 | 67 | 67 |
| Total | 5,510 | 4,085 | 346 | 310 |

There were zero recorded deaths, reconnections, timeout grace intervals,
stalls, scheduling pauses or fatal errors. Counts describe issued decisions
and attempted commands, not confirmed hits or successful moves. No explicit
REPAIR commands were issued; docking and game-driven repairs remain distinct.

Evidence: `logs/automated-player-hour-2026-09-06/summary.json`, `health.json`,
`events.jsonl`, per-captain transcripts and the derived `review.json`; host
session completion is recorded in `logs/automated-player-fleet-host.log`.
This was a shared-host operating run, not an isolated competitive comparison.
It verifies sustained operation and scheduled shutdown for this hour. With no
connection failure or sleep during the run, it does not independently validate
recovery under those conditions; the focused TCP-drop and timer tests remain
that evidence. It establishes neither win rate nor original-runtime parity.

The bots stopped at the deadline; the shared host was left running. The
single-run scheduled follow-up is paused after this review. No further match
was launched. Next evaluation remains moving-opponent combat judgment and
objective play, with these operating reports retained as a reliability baseline.

## Ten-ship battle and LIST targeting — 2026-09-06

V4 adds default LIST to every observation cycle before SCAN and STATUS. It
preserves absent enemy-ship locations and missing base shield readings as
unknown. Fresh LIST shield readings rank matching scanned ships. Known enemy
installation locations guide travel, but only SCAN-confirmed hostile objects
can be fired upon. The prior captain is preserved in test/captain-v3.ts.

Enemy bases are approached to range five; built enemy planets to range three.
Neutral/friendly objects and enemy planets without builds are excluded from
installation attacks. Ships have priority. Source boundaries: Austin
DECWAR.FOR LSTSCN:1519, LSTUPD:1922, LSTOBJ:2084, BASPHA:374 onward,
PLNATK:2800 onward and PHACON:2647 onward. Range three is a policy choice within
the source's effective planet-build phaser range, not a game-rule change.

47 regression cases passed in logs/automated-player-ten-regressions.log,
including real base damage, enemy-planet targeting, neutral/unbuilt exclusion,
LIST-only navigation without firing, vulnerable-ship ranking, and both four-
and ten-ship timed fleet startup/shutdown. Focused target tests are retained in
logs/automated-player-target-tests.log. Typecheck and archive/generated audit
passed in logs/automated-player-ten-typecheck.log and
logs/automated-player-ten-audit.log. Planet damage remains probabilistic; the
planet test verifies target selection and command execution, not guaranteed
build destruction on one shot.

A single ten-bot hour started at 2026-09-07T00:37:37Z (19:37 local September 6)
on the existing interactive host, using logs/automated-player-ten-2026-09-06/.
It is in progress at this checkpoint. All ten joined and issued SCAN and LIST;
initial phaser decisions included enemy bases. The user clarified that ten
ships, rather than several separate matches, were wanted. The user's active
session was retained. No outcome or competitive-strength claim is made before
reviewing the final report and representative combat responses.


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


September 7 follow-up: fleet schema 2 now distinguishes scheduled retries,
started retry attempts and successful reconnections. A cancellation test and
real TCP-loss recovery verify the distinction. The ten-ship run remains an
observation checkpoint, not a clean uninterrupted hour or proof of stronger
tactics. No captain policy change was inferred from ambiguous zero-hit text.

## September 7 objective captain checkpoint

Captain v5 assigns Scout and Raven the objective role while Wing and Shade
retain patrol roles in the four-ship roster. Objective captains require at least
3,500 displayed energy and 75% shields, fresh matching LIST/SCAN planet evidence,
and an adjacent sector before CAPTURE or BUILD. Fortified enemy planets are
weakened through the existing phaser path first. Five builds convert a captured
planet into a base when fewer than ten friendly bases exist.

An isolated four-ship Austin Telnet scenario placed Yorktown, Excalibur, Wolf
and Demon in one game. Yorktown captured a neutral planet at 20-21, received
planetary return fire (100% to 94.5% shields), completed builds one through five,
and converted it into a Federation base. Subsequent LIST observations confirmed
one capture, four visible build increments and one base creation; the fifth
transition removes the planet row and adds a base row. This proves the connected
scenario, not autonomous discovery frequency or defense under active opposition.

Source: legacy/utexas/DECWAR.FOR:523–665 and PARAM.FOR:6. Evidence:
logs/automated-player-objectives/objective-tests-final.log and
logs/automated-player-scenario-1788770888369-839fc7ebf36d48.jsonl.

## September 7 autonomous objective evaluation

A disposable Austin host ran Scout and Raven in objective mode and Wing and
Shade in patrol mode for 600 seconds. Both objective captains independently
found planets and acted on them: Scout issued seven CAPTURE and 24 BUILD
commands; Raven issued four CAPTURE and 19 BUILD commands. All four captains
reached the deadline without a death, stall, retry or reconnect. The attempt
counts and command transcripts are valid evidence of autonomous discovery and
objective play.

The first run exposed a reporting bug: every observer credited visible team
planet transitions, so its confirmation counters are invalid. Its review marks
that limitation explicitly. Confirmation now requires the same captain to have
a pending successful objective command at the exact observed coordinates.

A fresh 90-second run verified the correction. Scout made and confirmed one
capture and four build increments. Wing and Shade recorded zero objective
attempts and zero confirmations. Raven's single capture attempt occurred at the
deadline and remained unconfirmed because there was no following LIST; this is
the intended conservative behavior. Evidence:
`logs/automated-player-objective-attribution-check-2026-09-07/review.json`.

The longer run also showed that unconditional raw packet events made ordinary
fleet logs about 241 MiB. Raw wire recording is now opt-in for parity captures;
the complete 90-second evidence directory is about 1.2 MiB. These runs establish
functional objective behavior and reporting accuracy, not win rate or
competitive strength.

## September 7 tournament and defense evaluation

The external tournament runner now starts a disposable Austin host for every
match, enters the source game's `TOURNAMENT <seed>` mode, alternates named strategies between Federation and Empire, and records
the final `POINTS FED EMPIRE` report from each surviving captain. It retains
official score categories, action counters, all point samples, fixed-time
leaders and a 95% Wilson interval. Reports checkpoint after each match and can
be rebuilt from preserved summaries. Adjacent faction swaps share a configured
seed. Fresh processes still do not provide a paired random event stream because
differing actions and scheduling can consume draws in a different order.

An initial two-match objective-versus-patrol check split one fixed-time lead
each. Objective earned capture/build points in both worlds, while patrol could
score heavily against bases. The result was confounded by faction and world
variation and is retained as a harness checkpoint, not a policy ranking:
`logs/automated-player-tournament-objective-vs-patrol-2026-09-07/summary.json`.

The first balanced strategy assigned one defender alongside one objective and
two patrol captains per side. In a four-match, 60-second comparison against the
objective strategy it split fixed-time leads 2–2 and trailed by 374.8 points per
match on average. Transcript review found the actionable failure: two defenders
spent 35 and 43 decisions holding position without firing. Evidence:
`logs/automated-player-tournament-balanced-vs-objective-2026-09-07/summary.json`.

Captain-v6 keeps the asset and threat priorities but watches twice, makes a
30-second combat sortie and then returns. This reduced explicit guard holds to
2–4 in the four revised matches and produced 15–19 movement decisions per
defender. It removed the idle failure but did not improve the small-sample score:
balanced led one match, objective led three, and balanced averaged 642.7 fewer
points. Balanced's fixed-time lead rate was 0.25 with a wide 95% interval of
0.046–0.699. All four matches finished without a death, stall, retry or execution
error. Evidence:
`logs/automated-player-tournament-balanced-v6-vs-objective-2026-09-07/summary.json`.

The objective strategy remains the fleet default. Balanced remains available
for further held-out evaluation. These fixed-duration matches do not recognize
a completed-game victor and are too few to establish general competitive
strength.

## September 7 TARGETS, torpedoes and novas

Captain-v7 adds TARGETS to the public Telnet observation cycle and requires it
to agree with SCAN before firing at a ship. It fires one torpedo at a time only
when LIST reports shields below 85%, keeps four rounds in reserve, and records
the source-defined result categories without treating delayed output as a miss.
An isolated Telnet scenario confirmed the explicit command form
`TORPEDOES ABSOLUTE 1 v h` and the displayed ammunition change from 10 to 9.

The Austin source and supplied help also confirm the star-nova tactic: a torpedo
intersection destroys the first star on 80 of 100 draws, adjacent stars may
chain, and every adjacent object is processed by NOVA. The bot only attempts
this when a fresh target is next to a fully observed connected star cluster and
the entire blast rim contains no friendly, planet, black hole or firing ship.
It accepts the 500-point star penalty only with high shields and at least eight
torpedoes. Tournament strength remains unmeasured.

The first ten-ship, 180-second captain-v7 battle completed 722 decisions with
no deaths, stalls, retries, or errors. Its 44 torpedo attempts produced 14 hits,
13 misses, five deflections, four misfires, and eight novas after recognizing
Austin's long `torpedo 1 lost @...` text as a miss. Six novas followed deliberate
star decisions; two occurred during direct ship shots. One intended nova was
deflected to another star and damaged a friendly Goblin outside the selected
blast area. Source-driven target-area checks cannot eliminate trajectory risk.

Captain-v8 disables deliberate novas by default. A second ten-ship, 180-second
run completed 728 decisions with no deaths, stalls, retries, or errors. All
seven torpedo decisions targeted ships and produced three hits, three
deflections, and one miss, with no nova in that sample. The teams also issued
six capture and 26 build attempts. This validates the safer execution path; it
does not establish whether direct torpedoes outperform phaser-only play.

A four-match, 90-second, 10-ship regular-mode A/B comparison then alternated
direct torpedoes and phaser-only play across factions. All 40 captains completed
without failure. Torpedoes split fixed-time leads 2–2 and averaged 269.8 more
points, while Empire led all four matches regardless of weapon policy. Torpedoes
scored more enemy damage (7,893.5 versus 4,455.2), but their 55 attempts included
13 misses, five deflections, three misfires and eight accidental novas; the
phaser-only side scored more build points. This does not establish a weapon
advantage. Evidence: `logs/automated-player-weapon-tournament-v8-recovery-2026-09-07/summary.json`.

The failed predecessor to that run exposed a client defect: a MOVE target became
the ship's current location during command timing, leaving Austin at
`Coordinates:`. The client now sends the source-documented Ctrl-C, waits for the
recovered command prompt and keeps the session usable. A native Austin scenario
verifies the full dialogue. A two-match, 30-second paired-seed smoke run then
entered actual source TOURNAMENT mode with seed 1729 in both faction assignments;
both completed, faction leads split 1–1, and torpedoes led both short samples.
Those samples validate the harness rather than rank the policies. Evidence:
`logs/automated-player-weapon-tournament-v8-seeded-smoke-2026-09-07/summary.json`.

Captain-v9 then restricted direct torpedoes to range eight or closer after the
range analysis above. A fresh seeded 90-second, ten-ship battle completed 325
decisions and 221 moves with no deaths, stalls, reconnects or execution errors.
It made 16 torpedo attempts: 10 hits, three misses, one deflection, one misfire
and one nova. One ship encountered the real stale-MOVE `Coordinates:` retry and
recovered with Ctrl-C while the fleet continued. This is a functional
robustness and outcome checkpoint; it is not a controlled weapon ranking.
Evidence: `logs/automated-player-fleet-v9-range-2026-09-07/fleet/summary.json`.
