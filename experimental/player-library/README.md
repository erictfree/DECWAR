# Experimental player library

M0–M1 are in progress. The public strategy seam and captain compatibility
adapter are implemented; extraction of transport, observations and runner is
still pending. See [the reviewed design and migration plan](DESIGN.md) for
interfaces, test gates and implementation order.

The [existing automated player](../automated-player/README.md) remains the
runnable implementation. Its default captain preserves current behavior while
accepting independently authored strategies through `PlayerOptions.strategy`.
The smallest example is `examples/status-strategy.ts`.

Use `commands` for the supported single-line actions and `runPlayer` to reuse
the Austin Telnet runner while the deeper transport extraction is completed.
Builders validate coordinates and energy but leave tactical safety decisions to
the strategy.
