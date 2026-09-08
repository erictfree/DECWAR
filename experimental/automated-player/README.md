# Experimental automated player

An external Austin captain written in TypeScript using Node's built-in modules.
It connects through Telnet and ordinary player observations, without importing
the game runtime, reading hidden state, changing rules, or making model calls.
It requires Node 24 or newer and the existing repository installation.

The default **patrol** policy navigates around scanned obstacles, avoids known
installation danger zones, attacks freshly scanned enemy ships and installations with phasers,
and returns to friendly bases for supplies and repair. It resumes patrolling
after replenishment. This is a functional experimental opponent. Short
faction-swapped evaluations now measure named strategies, but the samples are
too small for a general competitiveness claim. See [the development plan](PLAN.md) and
[the first tactical training results](TRAINING.md).
With `--torpedo-corridor`, direct ship torpedoes require a freshly observed corridor clear of stars,
friendly objects, planets, black holes and unknown cells. The corridor includes
possible drift and travel beyond the target; rejected shots fall back to the
existing phaser/approach policy. This conservative tactical filter cannot predict
hidden random draws or changes after observation. See [the corridor review](TORPEDO-CORRIDOR.md).

The complete source-ordered [31-command coverage matrix](COMMANDS.md) records
what the player uses, tests, plans, or intentionally leaves manual.

## Run

For a monitored fleet of two captains per side, start the host below, then run:

```sh
node experimental/automated-player/fleet.ts --port 2423 --seconds 3600
```

The fleet uses Scout/Nimitz and Wing/Excalibur for the Federation, Raven/Wolf
and Shade/Demon for the Empire. Scout and Raven are objective captains; Wing
and Shade patrol and fight. It stops at the duration or Ctrl-C and quits
the bots; it leaves the existing host running. Each bot has a default budget
of 10,000 decisions, 10 lives and 20 reconnection attempts across the run.
`--rounds`, `--lives` and `--retries` change those budgets. `--log-dir` chooses
a new report directory; an existing configuration there is rejected.

`--federation-strategy` and `--empire-strategy` accept `objective`, `patrol` or
`balanced`. Objective assigns one objective captain and leaves the rest on
patrol. Patrol assigns every captain to patrol. Balanced assigns one objective
captain, one defender and the rest to patrol. The default remains objective for
both sides.

For ten bots, five per faction:

```sh
node experimental/automated-player/fleet.ts --port 2423 --ships 10 --seconds 3600
```

For a disposable isolated galaxy that shuts down with the fleet:

```sh
node experimental/automated-player/fresh-fleet.ts --ships 4 --seconds 600
```

The wrapper launches the public Austin host on an ephemeral port, delegates to
the same fleet process, retains host/fleet evidence, stops the host and removes
only its newly created temporary galaxy.

`--ships` accepts 4, 6, 8 or 10. The larger roster adds Federation
Lancer/Farragut, Ranger/Intrepid and Archer/Lexington, and Empire Fang/Cobra,
Wraith/Goblin and Talon/Hawk. Vulcan is not assigned to a bot. Requested ships
must be available; the launcher never takes over an occupied vessel.

Every five seconds, `health.json` records progress, shots, docking, repairs,
deaths, retries and stalls. `events.jsonl` records state changes;
`summary.json` records the final result. Per-captain transcripts retain commands
and replies. Shot/move counts are attempted commands, not verified hits/moves.
A scheduling pause is recorded separately from uninterrupted running time.
These files support monitoring without AI model calls.
The report also counts SCAN/LIST requests and phaser decisions by target kind:
ship, base or planet. These categories describe intended targets, not confirmed
hits or destroyed objectives.
Capture/build attempts are separate. The acting captain's next LIST observation
confirms its pending capture, build increment or conversion into a starbase;
changes merely observed by teammates are not attributed to them.
Before quitting, each surviving captain requests `POINTS FED EMPIRE`; the fleet
retains the displayed team totals and score categories. These are slightly
different-time observations during concurrent shutdown, so tournament reports
retain every sample and select the latest report per side.

For a faction-swapped comparison on independent disposable galaxies:

```sh
node experimental/automated-player/combat-tournament.ts --matches 4 --seconds 60 --ships 8 --candidate balanced --baseline objective
```

Each match alternates the named strategies between Federation and Empire. The
report records fixed-time score leads, Wilson intervals, official score
categories, deaths and action evidence. A fixed-time lead is not a completed
game victory. Fresh galaxies do not share a verified random seed or event
stream. Rebuild a report without replaying games using
`node experimental/automated-player/rebuild-tournament.ts --log-dir PATH`.

On macOS, prefix the fleet command with `caffeinate -i` to prevent idle sleep
for the run. Closing the laptop can still suspend local processes. A stopped
fleet process cannot restart itself; an external monitor is needed to detect
that failure. The launcher never starts or restarts the game host itself.

From the repository root, start a separate experimental host:

```sh
npm start -- --variant austin --port 2423 --data data/automated-player-experiment
```

In another terminal, start a long patrol:

```sh
node experimental/automated-player/run.ts --port 2423 --name Scout --team FEDERATION --ship NIMITZ --rounds 10000 --stay-connected
```

Join the same galaxy with `telnet 127.0.0.1 2423` and choose a different ship.
Enter `USERS` to see the bot. It prints decisions in its own terminal and saves
terminal frames, observations and reasons under `logs/`. Ctrl-C in the bot
terminal requests quit after the current dialogue operation. Stopping the bot
does not stop the host.

For an opposing captain, after the first captain has joined:

```sh
node experimental/automated-player/run.ts --port 2423 --name Raven --team EMPIRE --ship WOLF --rounds 10000 --stay-connected
```

The first arrival chooses a regular galaxy without the Romulan or black holes.
`--romulan` and `--black-holes` opt in for a newly created galaxy; later arrivals
inherit existing options. Enemy ship combat is the tested scope; Romulan tactics
are not implemented. Select an available ship explicitly.

Tournament runs can select the source game mode explicitly:

```sh
node experimental/automated-player/fleet.ts --port 2423 --tournament-seed 1729 --seconds 3600
```

Only the first arrival sends `TOURNAMENT <seed>`; later arrivals inherit that
galaxy. The strategy and weapon tournament launchers pair adjacent faction swaps
with the same seed. Different actions can still consume later random draws in a
different order.

| Option | Behavior |
| --- | --- |
| `--mode patrol` | Default: explore, fight observed enemy ships, resupply and continue. |
| `--mode resupply` | Navigate to a friendly base and finish once restored. |
| `--mode objective` | Fight immediate threats, capture observed unfortified planets, develop friendly planets and convert the fifth build into a base when capacity permits. |
| `--mode defense` | Guard developed friendly planets and bases, prioritize visible attackers near those assets, and alternate a short watch with bounded combat sorties. |
| `--rounds N` | At most N decision cycles, default 12, maximum 10000. Observation/wait decisions and death/reentry cycles also count. |
| `--lives N` | Stop after N lost ships, default 3. Earlier losses reenter through Austin's dialogue. |
| `--interval-ms N` | Pause between cycles, default 500, minimum 100. Server command delays still apply. |
| `--stay-connected` | After normal policy completion/blocking or the cycle limit, remain visible and read STATUS at intervals of at least five seconds. This is observation, not patrol. The life limit ends the run. |
| `--log path` | Choose a JSONL transcript path instead of the timestamped default. |
| `--host`, `--port` | Default to 127.0.0.1:2423. Port numbers do not select a variant. |

## Implemented capabilities

| Module | Responsibility |
| --- | --- |
| telnet.ts | Client negotiation, fragmented control decoding and command encoding. |
| client.ts | Austin regular/tournament login and reentry, output preferences, one outstanding command, framed text, verified coordinate-retry interruption, timeouts and quit. |
| observations.ts | STATUS, DAMAGES, POINTS, friendly BASES, default LIST objects and fixed-width long scans, preserving unknown reports, blank black-hole cells and warning markers. |
| navigation.ts | Observed map, expiring mobile sightings, failed-step memory and A* routes. Executes only a freshly scanned first step. |
| captain.ts | Patrol, objective work, local asset defense, resupply, shields, device repair, conservative phaser/torpedo combat, teammate-sighting pursuit and refuge selection. |
| policy.ts | Frozen original resupply baseline and shared decision type; retained for comparison. |
| player.ts / run.ts | Observation/action loop, bounded lives, CLI and evidence records. |
| supervisor.ts / fleet.ts | Bounded reconnection, shared per-bot budgets across attempts, two-sided startup, health reports and timed shutdown. |
| fresh-fleet.ts | Disposable isolated Austin host plus a bounded fleet evaluation and cleanup. |
| combat-tournament.ts / tournament-report.ts | Seed-paired source TOURNAMENT scheduling, faction swaps and aggregate fixed-time score reports. |
| weapon-tournament.ts | Seed-paired, faction-swapped captain-v8 torpedo versus phaser-only comparisons with identical team strategy. |
| rebuild-tournament.ts | Deterministically rebuild an aggregate from preserved match summaries. |
| commands.ts / command-coverage.ts | Machine-checked 31-command inventory and printable coverage report. |
| soak.ts | Two-captain run on a fresh isolated public host, with movement/action summaries. |
| test/ | Protocol/unit checks, external CLI tests and isolated staged game scenarios. |
| test/training.ts | Bounded tactical comparisons against the preserved v2 captain policy, including swapped factions. |

Terrain persists until seen again; mobile sightings expire. Unknown space may
appear in a proposed longer route, but the next commanded sector must have been
observed recently. One-sector movement avoids long-warp overheating and keeps
path validation simple. Failed steps are temporarily excluded.

Combat uses strength 180 phasers, below the source's overheating threshold,
and retains a resupply reserve. It spaces shots conservatively while the server
owns actual bank readiness. Retreat weighs known enemy exposure for both route
and refuge selection; it is a heuristic, not a guarantee of escape. Red condition
alone does not freeze the bot. It uses IMPULSE if warp is disabled and repairs
critical mobility, computer or life-support damage before travel.

The v3 policy closes toward four-sector range against a lone distant enemy
when its energy and shields are strong and the next step is outside observed
installation danger. This trades approach time for stronger phaser hits. It
also begins resupply below the combat firing reserve when an enemy is visible,
and retains that goal after the enemy leaves its scan. These are coded tactics;
the bot does not learn or update its own policy while running.

The v4 policy added default `LIST` before each SCAN/STATUS cycle.
LIST supplies visible ship shields and known base/planet locations; distant
enemy ships remain unlocated, and missing shield readings remain unknown.
Fresh matching LIST shield readings help prioritize vulnerable scanned ships.
Known distant enemy installations guide navigation, but a fresh SCAN is always
required to fire. Ships take priority over installations.

Enemy bases are approached to range five, outside their four-sector defenses.
Enemy planets with reported builds are approached to range three, outside
their two-sector defenses. Strength-180 phasers cannot reduce planet builds
beyond four sectors, so the bot does not waste long-range shots on them.
Neutral/friendly planets and enemy planets with zero builds are not attacked.

The v5 fleet assigns one objective captain per faction. With at least
3,500 energy and 75% shields, it approaches an observed neutral or unfortified
enemy planet, captures it from an adjacent sector, and applies up to five builds.
The fifth build becomes a starbase when the team has an available base slot.
It requires fresh matching SCAN and LIST evidence before CAPTURE or BUILD.
Fortified enemy planets remain phaser targets until LIST reports zero builds.
At the ten-base Austin limit it leaves a four-build planet unchanged instead of
repeating a rejected fifth build. Capture can damage the ship, so depleted ships return for supplies first. These
choices are heuristics; they do not guarantee safe combat or an optimal target.

Captain v6 adds an optional balanced team strategy. Its defender prefers
developed friendly planets, then bases; visible enemy ships near those assets
receive target priority. After two watch observations the defender makes a
30-second combat sortie before returning, avoiding an indefinite stationary
loop found in the first four-match evaluation. The corrected defender remains
experimental: it led one of four 60-second comparison matches against the
objective strategy and had a wide 95% lead-rate interval.

Captain v7 introduced `TARGETS` in every observation cycle and requires its ship
location to agree with the fresh long SCAN before either weapon fires. It uses
single torpedoes only below 85% reported enemy shields, keeps four rounds in
reserve, and rejects damaged tube/computer shots. Torpedo responses are reported
as hit, deflection, miss, misfire, black-hole loss, friendly neutralization,
unaffected star, nova, or unknown; unknown remains explicit when terminal timing
does not deliver a result with the command response.

The nova experiment can target a star beside a confirmed enemy ship or base. The
source gives the first star an 80% nova chance and can propagate through adjacent
stars. The selector therefore requires the entire connected star cluster and
its one-sector blast rim inside the current scan, rejects friendlies, planets,
black holes and the firing ship in that area, limits the target to six sectors,
and retains seven torpedoes. This remains an opportunistic tactic with a
500-point penalty per destroyed star, not a guaranteed favorable trade. A
ten-ship run showed that torpedo deflection can trigger a different star and
damage a friendly outside the selected blast area. Captain v8 therefore keeps
the selector for controlled experiments but disables deliberate nova shots in
the default policy. Direct ship shots can still cause accidental novas.

## Source basis and limits

Boundaries come from the pinned Austin archive: DECWAR.FOR BUILD/CAPTUR:523–665, STATUS:3860–3991,
PRLOC/PROMPT:3078–3131, LSTOBJ:2083–2140, MOVE:2141 onward, DOCK:893 onward,
DAMAGE:783–836, SHIELD:3739–3805, PHACON:2647 onward, NOVA/SNOVA:2256–2391 and
3804–3852, and TORP/TORDAM:4086–4424; SETUP.FOR PREGAM/SETUP;
MSG.MAC and SETMSG.MAC labels; WARMAC.MAC ODISP and scan routines:2350–2543.

Route costs, reserves, waypoints and tactics are bot policies. JavaScript numbers
represent displayed observations and heuristic calculations; the planner does
not replace or claim to emulate PDP-10 game arithmetic. The game determines
actual outcomes.

Remaining work includes coordinated defense messages, avoiding
duplicate team assignments, pursuit of old sightings, teamwork and opponent modeling. Decisions
use a short observation cycle, not multi-action adversarial search. Death can
trigger reentry. The single-player `run.ts` stops on lost connections. The fleet
reconnects after socket failures, silent timeouts or temporarily unavailable
requested vessels, with exponential waits capped at 30 seconds and a finite
retry budget. It resets observations and uses normal login; it never replays an
uncertain command. Reconnection is a new commission, not restoration of the
previous ship's state. Malformed reports and unexpected dialogue remain fatal.
Death while holding after a run ends that observation session.

Prompt framing accepts source BEL alarm bytes before normal/informative prompts
and uses source text plus a quiet interval. Extreme latency and
hostile prompt-like chat remain unverified. Unexpected continuations and
incompatible reports fail closed. The verified `Coordinates:` retry is aborted
with Ctrl-C and the next prompt is consumed; this covers a MOVE destination
becoming the ship's present location while command timing runs. Austin playable with the supplied startup
file is supported; custom startup scripts and CompuServe are unverified.
No terminal-speed preference is changed.
Raw packet capture is opt-in and used by the I/O comparison runner. Normal
captain and fleet transcripts retain decoded dialogue frames without recording
every network packet.

A timer that fires over one second late receives one additional timeout
interval to let pending replies arrive after a scheduling pause. This applies
to both launchers and is recorded as `deadline-grace`. It does not change game
timing or guarantee uninterrupted play through computer sleep.

## Checks and repeatable runs

From the repository root:

```sh
node_modules/.bin/tsc --noEmit -p experimental/automated-player/tsconfig.json
node --test experimental/automated-player/test/*.test.ts
npm run audit:check
node experimental/automated-player/soak.ts --rounds 24
node experimental/automated-player/test/training.ts --policy both --set development --rounds 12 --repeats 2
node experimental/automated-player/test/training.ts --policy both --set held-out --rounds 12 --repeats 2
node experimental/automated-player/combat-tournament.ts --matches 4 --seconds 60 --ships 8 --candidate balanced --baseline objective
node experimental/automated-player/weapon-tournament.ts --matches 4 --seconds 90 --ships 10 --seed 1729
```

The experiment has separate tests and TypeScript configuration; the root test
glob does not include it. Tests and the soak need localhost socket access.
They use ephemeral ports and temporary data, shut down their hosts, and retain
logs. They never attach to an existing interactive game.

The CLI test launches the public host in a separate process and uses only TCP.
Staged tests create controlled encounters through existing runtime fixtures;
only test code sees setup state. Captains still use Telnet with real parsing,
arithmetic, waits, combat and cleanup. Scenarios cover a wall detour and full
replenishment, phaser damage, safer-refuge withdrawal, critical repair and
death/reentry. A two-captain soak measures activity, not win rate.

Training compares the frozen v2 decision policy with the current captain.
Development encounters use a distant passive target and a stationary phaser
sentry covering a depleted ship's withdrawal. The held-out set swaps factions
and changes range and starting energy. Opponents acquire their targets through
Telnet scans. Only the fixture sets initial positions/resources; normal game
commands, damage, random draws and delays remain in effect. Each run retains
observations, decisions, terminal replies and a JSON summary under `logs/`.

Tournament launchers enter the game's source `TOURNAMENT <seed>` mode. Adjacent
faction swaps share a seed. This aligns their initial RNG state but does not
keep later events paired because different commands and scheduling consume draws
in different orders.

These are fixed decision budgets, not equal elapsed-time matches: movement can
take longer than a STATUS decision. Reports include elapsed time, firing ranges,
shot energy, damage, replenishment and errors. Random streams are not paired;
repeats are small diagnostic samples, not statistical evidence of a win rate.
The frozen policy shares unchanged protocol/navigation code with the candidate.

[WORK_LOG](../../WORK_LOG.md) records dated checks and transcripts. These verify
bounded behavior in the port, not native-executable parity or competitive strength.


## Experimental input/output captures

`compare-io.ts` runs non-combat scenarios through Telnet on either backend,
preserving initial modes instead of applying captain preferences:

```sh
node experimental/automated-player/compare-io.ts typescript PORT modes-ts.jsonl all modes
node experimental/automated-player/compare-io.ts typescript PORT dialogs-ts.jsonl all dialogs
node experimental/automated-player/compare-io.ts pdp10 PORT modes-reference.jsonl 4 modes
node experimental/automated-player/diff-io.ts modes-ts.jsonl modes-reference.jsonl comparison.json --ignore-command-echo
```

Replace PORT with a dedicated test endpoint. The optional limit defaults to all
cases in the selected suite; it stops before a group that would exceed the limit,
so an interactive dialogue is never intentionally left unfinished. The modes
suite has 61 steps; dialogs has 58. Every group has stable step identifiers.
Reports are created exclusively to protect existing evidence. Captures retain
base64 wire bytes, decoded response frames, commands and assertion results.

Modes covers OUTPUT, PROMPT, SCANS, ICDEF, OCDEF and all eight source terminal
types, followed by asserted TYPE OUTPUT settings and STATUS or SCAN 3. Dialogs
covers missing arguments, blank replies, invalid choices, ambiguous terminal
names, the SET switch prompt and an abbreviated SET command. Coordinate input
effects, broader interactions, editing and reentry remain unverified.

The diff pairs new captures by stable case identifier; legacy captures use their
recorded index. It preserves missing cases, failed expectations and capture
errors. By default it compares exact decoded responses. The optional
`--ignore-command-echo` removes only one exact nonempty leading command plus CRLF,
records what it removed, and retains original responses. It never strips game
whitespace, control bytes or numbers. Echo-only matches and unexplained differences
are distinct; matching text alone does not establish game-state parity.

The PDP-10 adapter expects the supplied TOPS-10 DECWAR account and executable;
it does not launch Docker or provision disks. It rejects an already logged-in
terminal before sending commands. After a successful game session it sends
QUIT/YES followed by K/F to log out only the account it established. This cleanup
is source-transcript-backed and verified in the September 8 native comparison.
A failed login or broken
connection may still require preparing a clean terminal before retrying.

The [paired harness](../parity/README.md) automates both captures and reports
failed/incomplete sessions separately from output differences. September 8
native SIMH mode coverage completed all 61 paired steps: 41 echo-only matches,
10 STATUS location differences and 10 SCAN differences in unaligned worlds.
Evidence is in logs/parity-reference-startup/paired-modes/. The native reference
also completed all 58 dialogue steps: 52 echo-only matches and six blank replies
with an extra leading CRLF, retained as differences rather than stripped.
Evidence is in logs/parity-reference-startup/paired-dialogs/. The reference
is the preserved Austin reconstruction running under SIMH; Docker deployment
has not been verified.

The paired harness also supports `--suite behavior`: invalid-coordinate and
impulse-range rejection, one-sector warp/impulse, and a bounded approach to a
single friendly base for docking. It retains command responses and before/after
state, recomputes source-contract checks, and reports unavailable setup as
incomplete. See the [behavior guide](../parity/README.md#movement-and-docking)
for scope, source references and offline reanalysis.

Fleet report schema 2 separates `retrySchedules` (backoff scheduled),
`retryAttempts` (a subsequent connection attempt started), and `reconnects`
(successfully joined again after an earlier connection). Reports without a
schema version used `reconnects` for scheduled retries; do not interpret those
historical counts as successful recovery.
