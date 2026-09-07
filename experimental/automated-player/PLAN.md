# Competitive player development plan

## Objective and boundaries

Build a reusable external captain that can compete through the same Telnet
interface as a human. Optimize team victory in full matches and separately
measure tactical survival and resupply success in bounded scenarios. Score and
damage are supporting measures; they do not substitute for the selected objective.

Target the delivered Austin playable profile first. Keep the experimental code
under this directory, preserve source variants and live galaxies, and derive
mechanical knowledge only from the supplied archives. Validate numerical
predictions against the running port: the forward-looking specification has
intentional normalizations and is not an exact combat simulator.

The player may use prior knowledge of published mechanics and its own observed
history. It may not inspect server memory, random state, private enemy records,
or hidden coordinates. Test harnesses and any later scenario setup must remain
separate from the player's observation interface. All regular player actions
retain their server timing and resource costs.

## Executable capabilities, with AI assisting development

Express tactics as small code capabilities with explicit prerequisites, an
observation/memory input, a proposed command and reason, and success/blocked
conditions. The original resupply policy established that contract through
`Decision` and the pure `decide` function. The current `Captain` coordinates
the implemented capabilities using its observed map and resupply state,
without coupling decisions to Telnet parsing.

Develop each capability as one might develop a skill: state when it applies,
what evidence it needs, what actions it may take, and when it should stop.
Implement those rules in ordinary code and verify the result. Candidate
capabilities are assess danger, navigate to supplies, replenish, select a firing
solution, disengage, intercept, defend and support a teammate.

AI can review transcripts, propose tactics or evaluation weights, and explain
failures during development. Promote those proposals into tested code. Frequent
play requires no model calls. If a later experiment adds an AI strategist, it
should issue typed goals to the same capability layer; the deterministic layer
still checks observations, prerequisites and command validity.

## Milestones and acceptance criteria

| Milestone | Deliverable | Evidence required |
| --- | --- | --- |
| 1. External baseline — implemented | Telnet client, Austin dialogue, status/base observations, bounded resupply policy, optional observation after stopping, transcripts and isolated live test. | Fragmented input, timeout/disconnect behavior, first/later login, both factions, ship reuse, movement and one connected replenishment journey. Another captain verifies the held bot in USERS and its release on shutdown. Policy success is separate from safe stops and budget limits. |
| 2. Resupply and retreat — implemented baseline | Parse scans/warnings and device damage; remember observed terrain; route around obstacles; choose safer refuges; replenish, repair and reenter after death. | Unit routes, a live wall/gap journey with complete replenishment, fresh-world resupply, engine repair, safer-base withdrawal and death/reentry checks. Broader reliability remains to be measured. |
| 3. Tactical opponent — phasers and initial tuning implemented | Patrol continuously; approach lone distant targets with strong reserves; fire at fresh enemy ships; maintain shields and withdraw below the firing reserve. Torpedoes and richer action evaluation remain. | Actual phaser damage and energy charge verified over Telnet. Bounded comparisons against a preserved captain policy use passive targets and a stationary phaser sentry, with swapped-side validation. Full-match strength remains unmeasured. |
| 4. Short-horizon planner | Compare a small set of action sequences against plausible enemy responses and sampled uncertain outcomes; replan after each action. | Improves held-out match results over milestone 3 without excessive decision latency. Unknown enemy state remains uncertain; no guessed observation becomes a fact. |
| 5. Strategic and team play — capture/build slice implemented | Prioritize installations, capture/build, defense, intercept and resupply; coordinate through ordinary TELL messages. | Capture and five-build base conversion are verified in a four-ship Telnet scenario. Defense, intercept, radio coordination, role handoffs and team outcomes remain. Delayed messages and limited radio information remain part of the environment. |
| 6. Competitive evaluation and tuning — initial runner implemented | Independent fresh-match scheduler, side-specific objective/patrol/balanced strategies, faction swaps, final POINTS/category capture, checkpointed reports, Wilson intervals and deterministic report rebuilds. | Initial two- and four-match evaluations are retained with transcripts. Larger held-out samples, completed-game victory recognition and more fixed opponent versions remain. Claim competitiveness only against named tested baselines. |

Build the evaluation runner incrementally from milestone 2; do not wait until
milestone 6 to record outcomes. Each milestone closes a runnable gap before
expanding the tactical model.

## Modeling and search

Use observed own-ship quantities directly, with timestamps. Keep enemy sightings
as last-known positions and plausible reachable regions. Record unknown device
damage and resources as unknown. Refresh information when it could alter the
chosen action, with explicit query pacing rather than an unbounded scan loop.

Start the evaluator with expected objective progress, outgoing damage, exposure
to incoming damage, energy/ammunition cost, and time until the next useful
action. Keep those weights configurable once there are scenarios to tune them.
Add only source-justified mechanical predictions, including movement obstruction,
shield charges, overheating and weapon readiness. Document approximation errors;
do not label a JavaScript floating-point predictor as native arithmetic parity.

Begin with hand-selected candidate actions and shallow search. Reassess after
one executed action because opponents act during waits. Add deeper search or
learning only when recorded failures show that it improves the result.

## Evaluation record

For each run retain bot version/configuration, host variant/profile, first-arrival
world options, observations, sent commands, decisions/reasons, terminal replies,
and final outcome. Record action latency, failed commands, resource expenditure,
resupply success, deaths and objective progress as those parsers become available.

The existing host has not been given a new seed/scenario API by this experiment.
Initially use fresh isolated worlds and save observed conditions; do not claim
that identical startup options guarantee identical games. A future controlled
scenario facility needs its own explicit design and must not expose privileged
state to the bot. Transcript replay can reproduce parser/policy decisions; it
cannot recreate a concurrent match without additional host evidence.

Keep aggressive, defensive and objective-oriented baselines, plus previous bot
versions. Tune on one scenario set and evaluate on another to reduce overfitting.
Match evaluations must treat disconnection, protocol failure, policy withdrawal
and round/time limits explicitly, never as automatic victories.

## Shared reference runner and tournament modes

Reuse the external Telnet transport for both the TypeScript Austin host and the
preserved Austin PDP-10 reconstruction. Keep endpoint startup adapters separate:
the reference needs TOPS-10 login and game launch before the DECWAR dialogue.
Docker hosting does not change this player interface. The preserved reference
was exercised through native SIMH; Docker operation and shared-client support
remain to be verified. See the [reference build](../../legacy/utexas-reference/f78f2ec/README.md).

Provide two distinct evaluation modes:

- **Response comparison:** execute named command scenarios on both endpoints,
  retain raw received bytes and command boundaries, and compare decoded game
  responses. Any normalization must be explicit and reversible by reference to
  the raw capture. Separate transport negotiation, echo and monitor banners from
  game output; preserve whitespace and numeric differences in the evidence.
  Classify differences as matching, expected profile differences, unexplained,
  or incomparable because starting state/timing differs.
- **Tournament:** run fixed captain versions against one another separately on
  each implementation. Begin with two policies and swapped factions, then expand
  to a round robin. Balance faction, roster size, first arrival and elapsed-time
  budgets. Use fresh isolated galaxies, record observed starting conditions,
  and repeat matches across independent starts. Do not reset a shared live game.

Tournament bots choose actions independently from their own observations;
scripted response comparisons send the prescribed commands. Matching Telnet
interfaces or seed labels does not establish matching random streams, worlds,
arithmetic or scheduling. Record whether scenario alignment is actually verified.
When it is not, compare outcome distributions within each implementation and
policy rankings across implementations, rather than pairing individual random
events as parity failures. Similar win rates do not prove semantic parity.

Record implementation/build identity, source variant and profile, policy version
and configuration, match duration, side assignments, transcripts and outcome
evidence. Recognize victory from verified game output; report time-limit matches
as unfinished and transport/protocol failures separately. Track deaths, survival,
resource use and verified installation destruction as supporting measures when
parsers support them. Phaser attempts are not hits or kills. Report match counts
and uncertainty for win rates; keep tuning matches separate from held-out matches.

Deliver incrementally: shared startup/capture smoke test, deterministic command
comparison report, then a small faction-swapped tournament on isolated hosts.
Keep the reference source and saved artifacts unchanged. Reference disk setup,
match reset and outcome parsing must be verified before unattended tournaments.
The initial shared capture runner, explicit diff and TypeScript tournament
scheduler are implemented; the TypeScript 61-case sweep and small
faction-swapped tournaments are verified. Full reference coverage and reference
tournament startup remain unfinished. Continue input/output response comparisons
before reference tournaments, whose results can be confounded by different
worlds and randomness.

### Input/output mode coverage — first comparison matrix

Austin DECWAR.FOR:3652–3718 defines the following mode choices. Exercise every
choice, then interactions affecting the same command; do not assume the normal
captain configuration represents all supported terminal behavior.

| Setting | Coverage |
| --- | --- |
| OUTPUT | SHORT, MEDIUM, LONG; messages, reports and error responses. |
| PROMPT | NORMAL, INFORMATIVE; literal formatting and displayed state. |
| SCANS | SHORT, LONG; dimensions, spacing, symbols and warning output. |
| ICDEF | ABSOLUTE, RELATIVE; coordinate interpretation and explicit overrides. |
| OCDEF | ABSOLUTE, RELATIVE, BOTH; reported coordinates and formatting. |
| TTYTYPE | Every entry in the source terminal table; emitted control bytes, terminal-specific display behavior, unknown names and ambiguous abbreviations. |

For each setting, test full commands, accepted abbreviations, interactive
missing-argument prompts, invalid choices and blank responses. Check reported
settings with TYPE OUTPUT and then exercise affected commands: a successful SET
alone does not verify its effect. Include initial defaults, mid-session changes
and reentry behavior. Derive expected defaults and edge cases from executable
source and reference observations, not assumed modern terminal conventions.

Capture Telnet negotiation, echo, line endings, BEL and other control bytes
separately from decoded game text. Test input framing and editing supported by
the reference, including fragmented delivery; distinguish TOPS-10 terminal
processing from game parsing. Preserve exact raw evidence even when presenting
a readable diff. Informative prompt values and world-dependent report fields
need comparable state or explicit classification as incomparable.

The existing captain join sequence forces NORMAL/LONG/ABSOLUTE/LONG
(client.ts:146–149). The comparison runner must be able to skip those settings
and retain responses in formats the captain's normal observation parser cannot
yet consume. The mode sweep exercises selection/reporting for every listed setting and
STATUS or SCAN effects. A second suite checks interactive prompts, blank and
invalid replies, ambiguous terminal names and abbreviations. Both suites passed
on TypeScript; only the first four mode steps have native captures. Input editing,
coordinate input effects and broader interactions remain incomplete; see README.md.

## Immediate next work

The [public command coverage matrix](COMMANDS.md) keeps every Austin player
command explicit. TARGETS now cross-checks SCAN before ship fire, and conservative
one-round torpedoes are implemented in captain-v8. A guarded nova selector is
retained for controlled experiments but disabled by default after an off-target
nova damaged a friendly in a ten-ship run. The
shared-intel pursuit is now implemented over a fleet-local channel while
preserving local SCAN/TARGETS authorization. The next protocol slice is
TELL/RADIO coordination and ENERGY/TRACTOR support. HELP, NEWS, TIME, TYPE and USERS remain available for verification;
GRIPE remains manual and is never an unattended tactic.

The second captain implementation closes the original obstruction/idle gap:
it reads full warning scans, plans routes, repairs, replenishes, fires phasers,
and resumes patrol. A two-captain fresh-world soak completed 24 decisions each,
visiting 24 distinct positions per captain without a death or connection error.
That soak did not encounter combat; controlled scenarios verify combat separately.

The training runner now compares the preserved v2 captain policy with v3 using
named passive-target and stationary-phaser opponents. It records action budgets,
elapsed time, resources and damage; faction-swapped validation changes starting
range and energy. This provides a diagnostic comparison, not a win-rate estimate.

The tournament runner now evaluates simultaneous moving opponents with equal
elapsed-time budgets and alternates strategies across factions. The first
balanced defense policy exposed excessive stationary guard cycles; captain-v6
replaces those with bounded watches and combat sorties. The revised policy
removed the idle loop but trailed objective in the first four-match sample.
Next, measure a larger held-out set before changing weights, then add ordinary
TELL-based assignment and response to observed attacks. Evaluate captain-v8's
direct torpedoes against a phaser-only control before changing weapon reserves.

The fleet launcher now supports a bounded simultaneous match with health/stall
reports and reconnection after selected transport failures. Review the one-hour
run's report before treating unattended reliability as established. Timing
grace and real TCP-loss recovery have focused tests; a completed short fleet
test does not substitute for the hour-long operating result.

The first hour completed with 5,510 decisions and no recorded stalls or losses.
V4 combines LIST shield/build/known-location reports with SCAN confirmation,
prioritizes vulnerable ships, and attacks enemy bases and built enemy planets
from outside their defense radii. A balanced ten-bot run is collecting target
category and report-use evidence. V5 assigns one objective captain per side and
adds fresh-confirmed capture, development and fifth-build base conversion with
reserve checks. A four-ship staged Telnet scenario verifies that connected path.
Local objective defense and comparative fixed-time scoring are implemented;
coordinated defense, duplicate-work avoidance and general competitive strength
remain unresolved. See TRAINING.md for dated results.
