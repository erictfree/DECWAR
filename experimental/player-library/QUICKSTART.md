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
