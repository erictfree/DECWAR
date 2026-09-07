# Player library design

Status: proposed architecture reviewed against the current automated player.
The library is not implemented or published. The first delivery preserves the
existing captain's decisions and launch commands while allowing a custom
strategy to run through the same infrastructure.

## Scope and first deliverable

Provide an experimental TypeScript library for authors of external DECWAR
players, initially on Node 24 and the Austin playable server. Production code
uses only public Telnet observations. Scenario tests may stage isolated game
worlds; that test-only access must never become a strategy capability.

First deliverable: the existing captain and an independently written simple
strategy both run through the library. The custom strategy imports only public
library exports and needs no edits to the runner or library internals. Existing
automated-player CLIs continue working with their current defaults.

Package publication, browser support, arbitrary third-party plugin loading,
and native PDP-10 autonomous-play compatibility are later work. Repository
relative imports suffice initially. Retain source references and the repository
license; do not select a new package license during extraction.

## Responsibility boundaries

| Layer | Responsibility | Current source to reuse |
| --- | --- | --- |
| Transport | Telnet bytes, negotiation, command encoding | `automated-player/telnet.ts` |
| Austin dialogue | Login, prompts, one outstanding exchange, reentry, quit | `automated-player/client.ts` |
| Observation | Typed report parsing and ordered report collection | `observations.ts`, `player.ts: observe` |
| Execution | One action, response recording, known continuation handling | `client.ts: command`, `player.ts` |
| Runner | Observe/decide/act loop, limits, cancellation, final score collection | `player.ts: play` |
| Recovery | Bounded reconnects and shared life/decision budgets | `supervisor.ts` |
| Strategy | Stateful choice of one action from observed information | `captain.ts: Captain.choose` |
| Tactics | Optional navigation, target selection and corridor helpers | `navigation.ts`, `torpedo-corridor.ts` |
| Evaluation | Logs, replay, scenarios, fleet assignment and tournament reports | existing test and tournament tools |

Paths above are relative to `experimental/` for the first two entries and to
`experimental/automated-player/` thereafter. Preserve executable sources once,
using compatibility re-exports or thin wrappers at old import locations. Do not
maintain two implementations after migration.

The dependency direction is transport → dialogue → observations/execution →
runner. Strategies and tactics depend on public data/action types, and are
injected into the runner. The core runner must not import the bundled captain.
Keep reports and transport separately importable for low-level scripted tests.

## Strategy contract

Introduce a small synchronous contract first. The following is a proposed type
shape; `Observation` and `Decision` initially preserve their current fields.

```ts
interface StrategyContext {
  readonly observation: Observation;
  readonly now: number;
}

interface Strategy {
  decide(context: StrategyContext): Decision;
}

interface StrategySession {
  readonly team: Team;
  readonly ship: string;
}

interface StrategyDefinition {
  readonly id: string;
  readonly version: string;
  create(session: StrategySession): Strategy;
}
```

The definition is passed to `runPlayer`; strategy configuration belongs to the
definition's factory closure and is recorded as JSON-safe run metadata. The
current captain adapter calls `captain.choose(observation, now)` and creates a
new Captain in `create`. Team, mode, weapon choice and corridor opt-in settings
remain explicit configuration. Constructors must not open sockets.

Each strategy instance owns its memory. Create it for the first joined session,
after death/reentry and after reconnect, matching the current captain reset
behavior. A definition must return a fresh instance for each player, including
when several players use the same definition. Persistent campaign memory and
asynchronous/AI decisions require a separate later contract; do not add them
implicitly in this extraction.

`now` is supplied by the runner at the decision boundary and recorded for
replay. Strategies should use it rather than wall-clock reads. Preserve existing
parser timestamps and library-local timers during the mechanical move; report
collection is sequential and its fields are not a single atomic world snapshot.

Treat observations as borrowed read-only input. The public data API should
eventually expose nested readonly types; during migration give the captain
adapter compatible owned data rather than rewriting its algorithms. Never let
a strategy mutate shared teammate memory or a retained replay fixture. Strategy
code is trusted local code, not a sandbox: TypeScript interfaces do not prevent
an author from importing Node APIs independently.

## Actions and dialogue

Retain the existing `Decision` union for the first milestone: `act` contains
one printable ASCII command and a reason; `complete` and `blocked` end the
bounded tactic. A temporary wait is an explicit observation action, not a
`blocked` result that the runner silently retries. Preserve existing
`stayConnected` behavior for the compatibility CLI.

Add typed command builders incrementally for already exercised commands such
as MOVE, PHASERS, TORPEDOES, DOCK, CAPTURE and BUILD. Builders validate syntax,
coordinates and printable single-line encoding; they must not silently impose
the captain's energy thresholds, one-sector travel, weapon preference or
corridor policy. Strategic safety helpers remain optional.

A raw command escape hatch is useful, but a single printable line is not
necessarily a complete game interaction. Bare commands and SET variants can
change prompts or require continuations. The standard strategy runner initially
supports only operations whose dialogue termination is handled by its adapter.
Unsupported dialogues fail explicitly; no guessed replies or arbitrary retry.
Low-level scripts retain `exchange` for specified continuation sequences.
GRIPE remains outside unattended built-in strategies. Normal shutdown remains
an adapter operation that completes the QUIT confirmation, not a raw strategy
command that leaves the runner waiting at the wrong prompt.

Keep one dialogue operation outstanding. Await action response before the next
report cycle. Transport failure during a command means its outcome is unknown;
never automatically resend it. Syntax/parser failures must not turn into an
endless reconnect loop. Cancellation follows the current bounded dialogue and
cleanup behavior; immediate interruption or worker isolation is separate work.

## Observations, attribution and coordination

Preserve displayed units, absent coordinates/shield readings, scan cell symbols,
source text and timestamps. Do not fill unknown data with zero. Strategies may
combine reports, but cannot assume LIST, TARGETS, SCAN and STATUS were observed
simultaneously. The initial observation sequence remains exactly BASES,
DAMAGES, LIST, TARGETS, SCAN 10 WARNING, STATUS.

Preserve the distinction between command attempts, responses and confirmed
effects. Existing decision metadata is retained for compatibility reports;
future typed builders derive action metadata so authors cannot accidentally
label a MOVE as a hit. An accepted command or a strategy's target label is not
evidence of a kill. Keep uncertain torpedo results distinct from misses.

Current fleet-local intel is an optional coordination provider containing public
sightings. Record its mode in evaluations. It is out-of-band coordination,
not implemented TELL/RADIO communication. Do not substitute it for native radio
in cross-server parity tests. Cross-player support requests can eventually be
implemented with a radio protocol; absent requests today are not a fundamental
limitation of Telnet. ENERGY/TRACTOR remain separate strategy work.

Retain the current reset and budget behavior in the migration, even where an
improvement appears desirable. Review pending objective attribution on reentry
and freshness of team intel separately: they should not be silently changed
as part of moving files.

## Server adapters

Keep variant and environment distinct. Austin game semantics, long-output
parsing, and a TOPS-10 monitor login are separate concerns; a Docker container
is deployment, not a protocol variant. Initially wrap the existing client as
one Austin adapter without refactoring its prompt state machine.

The runner needs join, observe, execute, final score collection, quit and close
operations. Each adapter owns its command encoding and supported dialogue
capabilities. Future adapters may share the Telnet transport while differing
in report syntax or login. Select explicitly; no banner-based guessing and no
claim that identical Telnet transport establishes game parity.

Preserve existing reference `startReference`, `quitReference`, mode-preserving
login and byte-capture behavior for scripted comparisons. Expand autonomous
native support only after captured startup, reports, actions and shutdown pass
adapter contract scenarios. Unavailable native execution is reported as
unverified, never replaced with TypeScript-only evidence.

## Evaluation design

Before moving implementations, capture deterministic decision sequences from
the existing captain for combat, resupply, objective work, blocked navigation,
teammate sightings, corridor opt-in and both factions. Include consecutive
frames to exercise memory, timestamps and cooldowns. Retain a baseline revision
and fixture provenance. Re-exported code tested against itself is not migration
equivalence evidence.

Decision replay uses recorded observations, decision time, configuration and
session reset markers. Existing logs omit parsed scan cells from decision
events, so they cannot be treated as complete replay fixtures. Either capture
full frames in an explicit new replay mode or reconstruct scan frames from raw
transcripts with checked associations. Missing associations fail the fixture.
Replaying a different action cannot predict its counterfactual outcome.

Use three complementary checks:

1. Decision fixtures verify command, reason, metadata and state evolution.
2. A fake adapter verifies report/action order, one outstanding operation,
   factory lifecycle, budgets, errors, cancellation and uncertain outcomes.
3. Existing isolated live Telnet scenarios verify real effects and cleanup.

After extraction, add genuinely different aggressive, defensive and expansion
strategies. Let each faction independently select strategy ID, version and
configuration. Record adapter, variant/profile, seed, duration, coordination
mode, source revision and dirty-state indicator with results. Compare point
categories, kills/losses, confirmed objectives, stability and attempted versus
rejected actions. Equal seeds do not imply equal random-event streams; fixed
time leads are not completed-game victories. No ranking claims from a single
faction-asymmetric seed.

## Implementation sequence and gates

| Milestone | Change | Required evidence |
| --- | --- | --- |
| M0: baseline | Save pre-migration decision fixtures and source inventory | Fixtures include complete observations, time, configuration and resets; baseline expectations generated before refactoring |
| M1: strategy seam | Inject factory into current play/recovery path; existing CLI supplies captain adapter | Baseline decisions match; reset isolation and error/budget tests pass; a simple custom strategy runs |
| M2: library extraction | Move reusable code into this directory; add `index.ts`, `testing.ts`, compatibility wrappers and scoped typecheck | Both examples use public exports; all existing player tests pass; production import graph excludes game runtime/test/legacy internals |
| M3: authoring tools | Add typed builders, optional tactics and a first-player guide | Examples typecheck and run; arbitrary safe strategy choices are not rewritten by the library |
| M4: evaluation | Add complete replay frames and configurable strategy factories to fleet/tournament tools | Replay completeness checks; lifecycle tests; bounded live run with two independently selected strategies |
| M5: adapter expansion | Verify native monitor/game adapter using existing comparison machinery | Original transcripts and explicit comparison outcomes for each supported path; unsupported paths remain documented |

Suggested extracted files: `types.ts`, `telnet.ts`, `adapters/austin.ts`,
`observations.ts`, `runner.ts`, `recovery.ts`, `actions.ts`, `tactics/`,
`strategies/captain.ts`, `testing/` and `examples/`. Implement only files needed
by the current milestone. Keep executable CLIs and process orchestration under
`automated-player/` as consumers initially.

For executable milestones run the existing player suite, the new library suite,
scoped TypeScript checking and `npm run audit:check`, saving outputs in `logs/`.
Use live listener permissions where required. Root `npm run check` does not
currently include experimental files; a green root check alone is insufficient.
Update status/docs when behavior is delivered, and commit coherent checkpoints.

## Review outcome

Proceed with M0–M2 as a bounded extraction. First design review is complete;
routine implementation can proceed without revisiting the captain algorithms.
Final review should inspect dependency boundaries, reset/budget equivalence,
dialogue ownership, replay provenance and the independent author example.
Any newly discovered prompt, concurrency or source-arithmetic ambiguity needs
its own focused review before changing behavior.
