# Torpedo corridor review

With `--torpedo-corridor`, the captain uses a conservative exclusion corridor before firing a direct ship
torpedo. It checks observed hazards rather than predicting a particular shot.

## Austin source

`legacy/utexas/DECWAR.FOR:4289–4307` computes drift from a normal random term
with magnitude at most 0.1, an equipment-damage term at most 0.05, and a raised
shield term at most 0.05 at full shield strength. Travel is independently drawn
and can reach ten major-axis steps, including beyond the intended target.

`CHECK`, lines 699–760, chooses the vertical coordinate as the major axis on
ties because TORP passes vertical coordinates into CHECK's first argument.
Drift accumulates on the minor axis. `CHKPNT`, lines 762–772, selects one or
two collision cells using strict integer hundredths. Random selection between
two empty cells changes the last clear position, not the accumulating real
coordinate used for the next collision checks.

## Tactical filter

The corridor allows one cell of selection margin plus 0.25 cells of drift per
major-axis step, wider than the source's nominal maximum of 0.20. Integer
cross multiplication avoids reproducing PDP-10 real arithmetic with JavaScript
floating point. This is a policy margin, not an exact emulator or a probability
distribution. No game runtime module is imported by the deployed player.

Every in-galaxy corridor cell through step ten must be freshly observed.
Stars, all planets, friendly ships/bases, black holes and unknown symbols veto
the torpedo. Enemy ships/bases and observed empty/warning cells pass. A veto
retains the existing phaser/approach fallback. The corridor is not stopped at a
currently visible target or blocker, because either can disappear before launch.

The guard applies to direct ship shots when explicitly enabled. The disabled experimental
deliberate-nova path remains a separate experiment and has no new safety claim.
Concurrent movement after SCAN, launch timing and hidden random state prevent
an absolute safety guarantee. Broader corridors can sacrifice useful shots;
competitive benefit needs controlled evaluation against the previous policy.

Enable the experiment with `--torpedo-corridor` on `run.ts`, `fleet.ts` or
`fresh-fleet.ts`. It defaults off. The first 90-second ten-ship smoke with the
guard enabled recorded 352 decisions, 35 shots and no torpedo attempts, deaths,
stalls or reconnects. This does not establish competitive benefit or show that
every withheld shot would have been unsafe. The complete output is retained in
`logs/automated-player-v17-corridor-smoke/`. The next evaluation must measure
withheld opportunities as well as actual outcomes against the unguarded policy.

## Verification

Focused tests cover collateral behind a target, lateral drift, faction identity,
unseen/stale cells, boundary clipping and CHECK's diagonal tie convention.
Tests also compare corridor coverage against the existing source-derived CHECK
composition for all legal direction vectors and five drift samples including
both nominal extrema, using exact rational test arithmetic. This checks geometry
and branch coverage; it is not exhaustive PDP-10 rounding verification or an
original-executable differential comparison.

A live Telnet scenario verifies that an observed friendly base behind Wolf
causes phaser fallback, then moves the base in the isolated fixture and verifies
torpedo authorization after new reports. Production captains receive only the
public Telnet observations.
