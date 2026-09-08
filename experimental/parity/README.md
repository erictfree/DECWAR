# TypeScript and PDP-10 comparison harness

Run the same public Telnet scenario suite against two localhost endpoints and
retain raw wire events, decoded responses, process diagnostics, a manifest and
JSON/Markdown reports. The existing Austin capture/client implementation owns
each dialogue. No runtime state is injected or game command resent on failure.

Start a dedicated Austin TypeScript host (Node 24+, dependencies installed):

```sh
npm start -- --variant austin --port 2424 --data data/parity-austin
```

Start the pinned Austin reference environment separately using its supplied
Docker setup. Publish its Telnet endpoint to localhost and record the actual
image/build identity. This repository preserves the reference executable and
build evidence, not a ready-to-launch Docker disk image. See
[reference build evidence](../../docs/austin-build-evidence.md).
The reference adapter requires a fresh TOPS-10 terminal showing `Please LOGIN`;
it uses `login decwar`, then `r gam:decwar`, and confirms logout during cleanup.
Use an available YORKTOWN on each backend. Existing games are not reset.

```sh
node experimental/parity/run.ts --typescript-port 2424 --pdp10-port 2030 --typescript-profile playable --reference-id YOUR_IMAGE_OR_BUILD_ID --suite modes --limit 4 --out logs/parity-first
```

Ports and identity above must match your environment; 2030 is the recorded
reference port, not an automatically discovered Docker mapping. The identity
and profile are operator declarations, not independently verified attestations.
Run `docker ps --no-trunc` to inspect your running container identity and ports.
The output directory must not already exist. Run `--suite modes --limit all`
for 61 steps or `--suite dialogs --limit all` for 58 interactive steps. Limits
select complete groups so a normal run does not strand a continuation prompt.
Run on dedicated test games: settings and scans change the selected ship's state.

Exit 0 means all selected decoded responses matched; exit 1 means differences;
exit 2 means missing, failed or invalid captures, including cleanup failure.
The JSON report includes exact response strings and first differing character
offsets. Raw Telnet bytes are base64 events in each backend's JSONL file.
TCP packet boundaries are not compared as game output.

Optional `--ignore-command-echo` removes only one exact leading sent command
line for comparison and records the removed text. Original responses remain.
There is no whitespace, stardate, score, location or random-result suppression.
Unaligned worlds make SCAN/STATUS differences likely; those remain review
items rather than automatic failures of game semantics or excused matches.
Startup and shutdown are captured and their success checked, but their text is
not yet included in per-step parity comparisons. Ctrl-C terminates the capture;
inspect the reference terminal afterward because interrupted logout is unverified.

This first harness tests selected I/O behavior. It does not synchronize game
clocks or random draws, prove combat parity, or infer a tournament win rate.
The preserved Austin binary is a reconstruction build, not a recovered original.

## Movement and docking

Select `--suite behavior` to run all five state-relative cases:

```sh
node experimental/parity/run.ts --typescript-port 2424 --pdp10-port 2030 --typescript-profile playable --reference-id YOUR_IMAGE_OR_BUILD_ID --suite behavior --out logs/parity-behavior-first --ignore-command-echo
```

The suite rejects absolute coordinates 0,0 and a two-sector impulse request,
then attempts a freshly scanned clear cardinal step with each engine. Rejected
actions must preserve location and supplies; successful one-sector movement
must reach the selected sector and consume 4 displayed energy units, or 8 with
shields raised. These expectations come from Austin DECWAR.FOR MOVE/IMPULS
2141–2254 and its displayed-unit scaling. No random stream is synchronized.
Invalid coordinates preserve the prior docking flag because they return before
MOVE label 700. Excessive impulse distance is rejected after that label clears
the flag. These are distinct rejection paths, not one generic no-effect rule.

Docking makes at most 80 one-sector approach moves toward a BASES-reported
friendly base, using the existing public-observation navigator. The measured
DOCK requires exactly one freshly scanned adjacent friendly base and no
adjacent friendly planet. Expectations follow DOCK 893–938, including resource
caps and the additional hull repair when already docked. Approaches require a
healthy ship, adequate energy, no reported mobile targets, positions outside
observed installation defense ranges and a fresh empty next cell.
Unavailable setup is a skip and makes the report incomplete. This suite moves
ships and consumes energy; use dedicated test games and allow several minutes.

Every measured action records before/after STATUS, response and named checks;
observations and approach actions are retained separately. State contracts and
response comparisons have separate results: matching failures never count as
parity. Different coordinates are chosen on each map, so commands need not be
identical. Elapsed time/stardates are retained but not equalized. Fully stocked
ships cannot demonstrate effective torpedo refilling or damaged-device repair;
the report explicitly limits those claims. External players can invalidate the
observed preconditions after a scan; a failure remains evidence for review.
The report recomputes checks from recorded state and command text; recorded
capture-time booleans are evidence, not trusted verdicts. The evaluator version
is included so a corrected test expectation can be audited through reanalysis.

Recheck saved behavior captures without connecting to either game:

```sh
node experimental/parity/review-behavior.ts logs/parity-behavior-first/typescript.jsonl logs/parity-behavior-first/pdp10.jsonl logs/parity-behavior-first/reviewed.json --ignore-command-echo
```

## Capture and construction

Use `--suite objectives --limit all` with the same endpoints, profile and
reference identity arguments. It selects a public LIST-reported neutral planet,
approaches within 60 one-sector moves, and requires fresh neutral SCAN/LIST
confirmation before acting. This changes ownership and installations in the
test galaxy; use dedicated games.

```sh
node experimental/parity/run.ts --typescript-port 2424 --pdp10-port 2030 --typescript-profile playable --reference-id YOUR_IMAGE_OR_BUILD_ID --suite objectives --limit all --out logs/parity-objectives-first --ignore-command-echo
```

Eight cases cover BUILD before capture, neutral capture, builds 1–4, the fifth
BUILD, and docking at a newly created base. Austin BUILD (DECWAR.FOR 523–591)
requires ownership, adds no direct energy charge, and refuses conversion when
all ten friendly base slots are occupied. Normal fresh galaxies start at that
capacity. A matched capacity refusal is **not** conversion coverage: docking at
a new base is then skipped and the overall report remains incomplete. The
harness does not destroy an existing base to create capacity.

CAPTUR (600–684) changes ownership and resets builds, then calls PHADAM even
for a neutral planet. The report checks ownership and build progression but
retains defensive-hit energy/shield differences without asserting equal random
damage. Raw command responses remain separately compared; differing planet
coordinates can produce differing capture messages. Points, timing and full
combat parity are outside this suite. Before/after target rows, base counts,
scan symbols and ship STATUS are retained for every measured action.

## September 8, 2026 native checkpoint

### Tournament seed repeatability

Seed 1729, Romulans off and black holes off, was exercised on two fresh
TypeScript hosts and two independently booted native SIMH copies. All four
starts matched: Yorktown at 7–2, ten friendly-base coordinates and all 204
initial scan cells. Every capture selected TOURNAMENT explicitly and completed
logout. Evidence: `logs/parity-seed/report.json` and the four raw captures.
This is matching initial **public observations**, not full-galaxy equality.
Other cells, seeds, later random draws and combat remain unverified.

Use a fresh, isolated host for each capture; an inherited world is rejected:

```sh
node experimental/parity/capture-seed.ts typescript 2424 1729 logs/seed-ts-first.jsonl
node experimental/parity/capture-seed.ts pdp10 2031 1729 logs/seed-pdp-first.jsonl
# Repeat on fresh hosts, then compare the four capture paths:
node experimental/parity/review-seed.ts logs/seed-ts-first.jsonl logs/seed-ts-repeat.jsonl logs/seed-pdp-first.jsonl logs/seed-pdp-repeat.jsonl > logs/seed-report.json
```

The reviewer reparses raw STATUS, BASES and SCAN responses and requires seed
selection and complete cleanup. Seed zero is excluded because the source uses
the clock for zero. Tournament selection applies only when creating a galaxy
(Austin SETUP.FOR:169–193); later arrivals inherit the existing galaxy.

### Other paired suites

The existing native SIMH environment was restarted and exercised through the
same PDP-10 adapter. Both full suites completed, including login and logout:

| Suite | Steps | Matches after command echo removal | Retained differences |
| --- | ---: | ---: | --- |
| Modes | 61 | 41 | 10 STATUS locations and 10 unaligned SCANs |
| Dialogues | 58 | 52 | Six blank replies with an extra native leading CRLF |

The four-step smoke report and full reports are in
`logs/parity-reference-startup/{paired-four,paired-modes,paired-dialogs}/`.
The six blank replies are consistent with terminal Enter echo, but the current
comparison deliberately removes only nonempty echoed commands. Their raw byte
differences remain review items. No game implementation was changed to make
these captures match. These runs establish selected native I/O coverage;
Docker packaging, aligned world behavior and combat remain separate work.

The subsequent five-case behavior run passed all state contracts and action
response comparisons after the explicit echo adjustment. Both one-sector
engine actions consumed eight energy units with shields up. Docking restored
TypeScript energy from 4,776 to 5,000 and native energy from 4,824 to 5,000.
Both sessions completed cleanup. The authoritative reanalysis is
`logs/parity-behavior/retry/reviewed.json`, using `source-contracts-v2`.
The earlier report and capture booleans remain: an invalid-coordinate docking
expectation was corrected from the source ordering, then recomputed against
the original recorded state. `logs/parity-behavior/live/` also preserves the
first incomplete docking setup. These checks do not establish effective repair
or torpedo refilling on the undamaged, fully armed ships used in the run.

The objectives run in `logs/parity-objectives/live/` matched all seven measured
state contracts: pre-capture BUILD refusal, neutral capture, four build
increments and full-capacity refusal. Six action responses matched after echo
removal; capture retained differing coordinates and defensive hits (18.7 units
on TypeScript, 9.3 on native). Both sessions completed cleanup. The report is
**incomplete** because conversion and docking at a new base were unavailable
with ten friendly bases. Neither successful conversion nor new-base docking is
claimed from that refusal. Fifteen harness tests, scoped TypeScript checking
and the source audit passed at this checkpoint.

```sh
node --test experimental/parity/test/*.test.ts
```
