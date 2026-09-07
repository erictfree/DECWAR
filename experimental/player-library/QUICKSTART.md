# Build a DECWAR player

This guide shows the smallest external TypeScript player using the experimental
library. It connects to the Austin Telnet server, receives the standard typed
reports, chooses one action, and exits after a bounded round.

## Prerequisites

- Node.js 24 or newer
- A running Austin server on TCP port 2423 (the repository default)
- A checkout of this repository

Start the server in one terminal:

```sh
npm run dev:telnet
```

## Create a player

Create `experimental/player-library/examples/my-player.ts`:

```ts
import { commands, runPlayer, type StrategyDefinition } from '../index.ts';

const strategy: StrategyDefinition = {
  id: 'my-first-player',
  version: '1',
  create() {
    return {
      decide({ observation }) {
        const base = observation.bases[0];
        if (base && observation.status.position.v === base.v && observation.status.position.h === base.h) {
          return { kind: 'act', command: commands.dock(), reason: 'Dock at the observed base.' };
        }
        return { kind: 'act', command: 'STATUS', reason: 'Collect another observation before choosing a route.' };
      },
    };
  },
};

const controller = new AbortController();
await runPlayer({
  host: '127.0.0.1', port: 2423, name: 'MyPlayer', team: 'FEDERATION', ship: 'YORKTOWN',
  rounds: 1, lives: 1, intervalMs: 500, record: event => console.log(JSON.stringify(event)),
  strategy, signal: controller.signal,
});
```

Run it from the repository root:

```sh
node experimental/player-library/examples/my-player.ts
```

The runner performs login, the ordered `BASES`, `DAMAGES`, `LIST`, `TARGETS`,
`SCAN`, and `STATUS` observation cycle, one action, final score collection,
and normal quit. Increase `rounds` for a longer bounded run. Set `lives` to
control reentry after a ship is lost.

## How a strategy works

The runner creates one strategy instance for each ship. It calls `decide`
once per observation cycle and waits for the command response before calling it
again. The instance can keep private memory, such as a patrol index or the
last time it fired. After death and reentry, the runner creates a fresh
instance, so memory from the lost ship is not carried into a new vessel.

Return an `act` decision to send one command. Return `complete` when the
strategy has reached its bounded objective, or `blocked` when it cannot safely
choose an action from the available reports. Both ending decisions stop the
bounded run and are recorded with their reason.

The `now` value is supplied by the runner at the decision boundary. Use it for
cooldowns instead of calling `Date.now()` inside the strategy:

```ts
decide({ observation, now }) {
  if (now - observation.status.observedAt > 5000) {
    return { kind: 'blocked', reason: 'Status is too old to act safely.' };
  }
  return { kind: 'act', command: 'STATUS', reason: 'Waiting for the next cycle.' };
}
```

## Reading observations

`observation.status` describes your ship: position, energy, torpedoes, shields,
damage, condition, and whether it is docked. `observation.scan` contains the
visible sector cells and their symbols. `observation.targets` contains parsed
enemy sightings from `TARGETS`; `observation.objects` contains parsed `LIST`
rows for ships, planets, and bases. `observation.bases` contains friendly base
coordinates, and `observation.devices` reports device damage.

Reports are collected sequentially. A `STATUS` timestamp and a `SCAN` timestamp
therefore describe nearby points in time rather than one atomic world state.
Missing coordinates or shield values stay unknown. Check freshness and
presence before issuing an attack or objective command.

## Test without risking a live match

Keep strategy logic separate from `runPlayer` and test it with a saved
observation. The repository’s seam tests show this pattern in
`test/strategy-seam.test.ts`. Run the library tests with:

```sh
node --test experimental/player-library/test/*.test.ts
```

For a live smoke test, use `rounds: 1` and `lives: 1` first. Record events to a
JSONL file instead of the console when comparing strategies; each decision and
action response then has a timestamped record that can be replayed or scored
by later evaluation tooling.

## Choose actions safely

Use the exported `commands` builders for supported single-line actions:
`move`, `impulse`, `phasers`, `torpedoes`, `dock`, `capture`, and `build`.
They validate sector coordinates and weapon energy. They do not decide whether
an action is tactically safe; that remains the strategy's responsibility.

Strategies receive public observations only. Treat report timestamps and
missing values as meaningful, and await each action before deciding again.
The library is trusted local TypeScript and does not sandbox player code.

The current runner facade is Austin-specific and transitional. CompuServe and
native PDP-10 adapters are separate future work; identical Telnet transport
does not imply identical game behavior.
