# Automated-player handoff

This checkpoint is intended to make the automated-player work easy to resume
after moving the repository to another machine or opening a new task. It records
delivered behavior and evidence; `WORK_LOG.md` remains the chronological project
record.

## Environment and boundaries

- Repository branch at this checkpoint: `main`.
- Runtime used for verification: Node.js 24.11.0 and npm 11.6.1. The package
  declares Node 24 or newer.
- Austin playable mode is the normal automated-player target. The players are
  external Telnet clients and do not import game state or change game rules.
- Preserve `legacy/compuserve`, `legacy/utexas` and
  `legacy/utexas-reference/f78f2ec` byte-for-byte. Run `npm run audit:check`
  after moving or changing the project.
- The working tree contained substantial ongoing specification, runtime,
  parity, documentation and automated-player work at this checkpoint. Do not
  discard uncommitted files when copying the project. Use a Git commit or copy
  the complete directory, including untracked files; logs are evidence but are
  not required to run the software.

## Restore and verify

Copy the repository with its `.git` directory and every untracked source file.
Also copy `data/` if an existing persistent galaxy must survive the move. The
contents of `logs/` are useful diagnostic evidence but are not runtime state.
After copying, confirm `git status --short` still shows the expected unfinished
work before installing or cleaning anything.

From the repository root:

```sh
npm install
npm run audit:check
npm run typecheck
node --test experimental/automated-player/test/*.test.ts
node --test experimental/player-library/test/*.test.ts
```

Some Telnet tests open localhost listeners. If a sandbox denies local sockets,
run those tests in an environment that permits loopback networking. A clean
source audit verifies 135 archived-file hashes and the generated inventories for
both variants.

Start a playable host and one player with:

```sh
npm start -- --variant austin --port 2423 --data data/automated-player-experiment
node experimental/automated-player/run.ts --port 2423 --name Scout --team FEDERATION --ship NIMITZ --rounds 10000 --stay-connected
```

The playable host defaults to a 500 ms minimum between completed input lines.
The client waits 550 ms after each completed dialogue before submitting another
line. Bots run independent asynchronous loops in one client process; there is no
round-robin fleet barrier.

To maintain five external players on each faction against any reachable Austin
host, use:

```sh
npm run players:ten -- --host 192.0.2.10 --port 2423
```

This is the portable operational entry point. It runs until Ctrl-C or the war
ends, retries connections and occupied assigned vessels indefinitely, and
reenters ships after destruction. The automated-player `README.md` lists the
fixed ten-ship roster, logging, and service-manager notes.

## Current player architecture

| Area | Primary files | Current behavior |
| --- | --- | --- |
| Telnet dialogue | `client.ts`, `telnet.ts`, `war-result.ts` | Login, terminal negotiation, command prompts, interrupts, death/reentry, final war banner and orderly quit. |
| Observation | `player.ts`, `observations.ts` | LIST, SCAN and STATUS every cycle; TARGETS on a fresh hostile contact; BASES and DAMAGES cached for at most 15 seconds with event invalidation. |
| Strategy | `captain.ts`, `navigation.ts` | Observed-map routing, supplies, combat, capture/build, base and planet siege, exploration and defensive ship engagement. |
| Coordination | `planet-missions.ts`, `base-missions.ts`, `base-defense.ts`, `radio-coordination.ts` | Team-local assignments and human-readable `TELL FEDERATION`/`TELL EMPIRE` messages. |
| Public library | `../player-library/` | Strategy interface, runner, command builders, built-in captain and a newcomer quickstart. |
| Fleet harness | `fleet.ts`, `fresh-fleet.ts` | 4–18 bots, isolated hosts, bounded or war-ending runs, health/events/transcripts/summary evidence. |

`createCaptainStrategy({ aggressive: true })` is version
`v21-installation-assault`. Its current priorities are:

1. Preserve enough energy, shields, torpedoes and working devices to continue.
2. Defend the ship, friendly installations and assigned assault objectives from
   nearby enemy ships.
3. Ignore unrelated roaming ships and continue toward assigned enemy bases and
   planets.
4. Capture unfortified planets and build friendly footholds with the configured
   planet squad; concentrate the rest of the fleet on installation destruction.
5. Consider a deliberate star nova when it can damage an enemy base or planet
   and the observed launch corridor and complete potential blast component are
   clear of friendly and neutral assets.

The ordinary captain does not enable deliberate novas or the aggressive ship
filter unless selected through options.

## Nova evidence and policy

Austin `legacy/utexas/DECWAR.FOR` is the game-logic authority. TORPEDOES around
lines 4310–4323 gives a star an 80% initial nova chance. SNOVA around lines
3804–3852 recursively considers all eight neighboring cells; each adjacent star
has an 80% chance to join the chain. Each exploded star costs the shooter 500
points. NOVA around lines 2256–2391 damages adjacent ships and bases, reduces a
planet by three builds, and removes the planet when its resulting build count is
negative. Thus a nova destroys a planet at zero, one or two builds in one blast;
three- and four-build planets survive the first blast at zero and one builds.

`selectSafeNova` in `captain.ts` models only the tactical choice. It does not
predict random draws. It requires fresh complete scan coverage for the possible
torpedo corridor, connected star component and one-sector blast rim. It rejects
the shooter, friendly ships/bases/planets, neutral planets, black holes and
unknown cells. A confirmed enemy base or planet must be adjacent to the possible
star component. This is deliberately conservative because chained novas can
spread and because a missed torpedo can continue beyond the aimed star.

## Latest run evidence

The selective-observation smoke game is preserved at
`logs/selective-observation-smoke-20260910/`. Eight bots ran for five minutes:
411 decisions, 317 moves, 46 weapon actions, 8 confirmed captures, 27 confirmed
builds, no client failures/stalls/scheduler pauses, and no host input rejection.
Selective observation used 1,675 report commands instead of the 2,466 commands
the old fixed six-report cycle would have used, a 32.1% reduction.

The first 18-bot completion attempt is preserved at
`logs/full-game-selective-observation-20260910/`. It was intentionally stopped
after 1,986.4 seconds to implement the installation-first policy. It completed
more than 5,000 decisions with no client failure or strategic stall. Its fleet
notice counters showed 7 base and 15 planet destruction notices, but these are
not unique galaxy-event counts: multiple captains can receive the same notice.
The aggregate latest LIST observations showed 10 Federation bases, 8 Empire
bases, 1 Federation planet, 2 Empire planets and 2 neutral planets. Given three
confirmed base conversions during the run, that snapshot suggests 5 unique base
losses and 12 unique planet destructions/conversions, but it is an inference from
observations rather than a direct hidden-state measurement. Do not sum per-bot
destruction notices as unique kills.

The v21 strategy change has 42 focused captain/corridor tests in
`logs/installation-assault-20260910/focused-3.log`, with experimental TypeScript
checking in `typecheck-3.log`. The final automated-player and public-library
suite passed 137/137 in `full-tests-final.log`; final root typecheck and archive
audit results are in `typecheck-final.log` and `audit-final.log`. The complete
root suite passed 4,594/4,594 in `root-tests-final-2.log`.

The five-minute v21 comparison is preserved at
`logs/installation-assault-smoke-20260910/`. Eighteen captains completed 767
decisions, 629 moves and 83 weapon actions. Of those weapon actions, 26 targeted
bases, 38 targeted planets and 17 targeted ships defensively; two torpedoes
caused novas. The run confirmed seven captures, 28 builds and one base creation.
It had no client failures and ended at its duration bound, without a war result.
Its two scheduler-pause samples totaled 8.496 seconds. Initial enrollment was
still completing for four captains at 75 seconds; all 18 were playing without
errors by 155 seconds, so compare full-game throughput only after enrollment.
As with the earlier run, destruction-notice counters are duplicated across
recipients and are not unique galaxy kills.

## Resume the completion experiment

Run a new isolated 18-bot game without touching a persistent galaxy:

```sh
node experimental/automated-player/fresh-fleet.ts \
  --seconds 86400 --rounds 1000000 --lives 100 --ships 18 \
  --federation-strategy aggressive --empire-strategy aggressive \
  --federation-weapons torpedoes --empire-weapons torpedoes \
  --tournament-seed 1729 --torpedo-corridor \
  --federation-resupply persistent --empire-resupply persistent \
  --federation-bases coordinated --empire-bases coordinated \
  --federation-survey handoff --empire-survey handoff \
  --federation-exploration systematic --empire-exploration systematic \
  --federation-long-moves --empire-long-moves \
  --federation-close-fire --empire-close-fire \
  --log-dir logs/full-game-v21-$(date +%Y%m%d-%H%M%S)
```

On macOS, prefix the command with `caffeinate -i` for an unattended run. Watch
`fleet/health.json`; completion writes `fleet/summary.json`. A real war ending
has a non-null `warResult`. `durationReached: true` by itself is not victory.

After the next game, compare unique current installation rows from latest LIST
observations, final POINTS, nova outcomes, ship-target versus installation-target
weapon actions, resupply frequency, input-rejection events and scheduler delay.
The principal open question is whether installation-first targeting shortens the
long survey/resupply plateaus enough to reach a war ending. If not, inspect
planet firing-route release and reassignment before increasing command rate.
