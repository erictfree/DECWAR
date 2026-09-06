# Autonomous Romulan

The Romulan acts within turn-driven world activity. It has no player command
language, faction membership or independent wall-clock turn schedule. Its
appearance, target selection, movement, weapons and resulting installation
responses are defined here in terms of GameState.

## Activity and result types

World.romulan is the optional current ship; World.romulanActivity holds the
persistent counters, deadlines and score defined in the abstract model.
Throughout this chapter, w denotes world(game), a denotes w.romulanActivity,
and r denotes the present Romulan when required by the operation. These names
do not freeze a snapshot across interactive or concurrent events.

```text
enum RomulanWeapon = PHASERS | TORPEDOS

type RomulanStepResult = {
    appeared: Boolean;
    repositioned: Boolean;
    weapon: Optional<RomulanWeapon>;
};

type RomulanStepOutcome = Completed { result: RomulanStepResult } | GalaxyEnded

type RomulanTarget = {
    object: SectorObject restricted to PlayerShip or Starbase;
    position: Position;
    range: integer;
};
```

A result records whether this activation created a Romulan, changed its position,
and attempted a weapon. Completed does not imply that an attack occurred or
that the Romulan survived. No-attack results retain earlier appearance or
movement effects. GalaxyEnded denotes termination that takes precedence over
the remaining activation and ordinary return to its triggering turn.

## Activation and appearance

```text
operation AdvanceRomulan(trigger: CaptainId): RomulanStepOutcome
```

The turn rules invoke this operation only while Romulan activity is enabled.
The trigger identifies the captain whose turn caused the activation; it remains
that captain for reports and radio preferences even when the Romulan attacks
someone else. Let w be world(game), a be w.romulanActivity and n be w.playerCount.
This ordinary activation contract requires n to be positive.

Every invocation increments a.cadence. If twice its new value is less than n,
return with no further effects. Otherwise increment a.turns, even if the
remaining rules produce no appearance or attack. Neither increment is a player
stardate advance.

When no Romulan is present, appearance requires a.cadence to be at least 3*n.
Below that value the activation ends. At or above it, IntegerDraw(5) equal to
5 defers appearance; the other four results allow it. On appearance:

```text
ensures after(a.cadence) == 0
ensures after(a.appearances) == before(a.appearances) + 1
newRomulan.energy == 200 + IntegerDraw(200) energy units
ensures after(w.romulan) == newRomulan
```

Choose its position by drawing vertical and then horizontal coordinates from
1 through 75, repeating until the sector is empty. No player-ship safe-spawn
exclusion applies. The new sector contains RomulanObject. Weapon deadlines
and accumulated score are unchanged by appearance.

Announce appearance to captains within ten sectors, also including the triggering
captain if privileged regardless of that captain's distance. Then IntegerDraw(5)
equal to 1 invokes [autonomous speech](communication.md#autonomous-romulan-speech).
Select a target. An appearing Romulan does not move on this activation; it can
attack immediately if the selected target's range is at most ten.

An already-present Romulan follows target selection and movement below. Disabled
activity does not invoke this operation or advance its counters. The concurrent
loss of all players, exhausted placement domains and interrupted appearance
remain part of the open lifecycle contract.

**Source basis:** [ROMDRV activation](../../legacy/utexas/DECWAR.FOR#L3233),
[placement](../../legacy/utexas/DECWAR.FOR#L2765),
[new-galaxy initialization](../../legacy/utexas/SETUP.FOR#L171).

## Target selection

```text
operation SelectRomulanTarget(): RomulanTarget
```

A Romulan must be present. Targets are player ships and surviving bases;
planets and stars are not direct candidates. For positions p and q, define:

```text
squaredDistance(p, q) = (p.vertical - q.vertical)^2
                       + (p.horizontal - q.horizontal)^2
```

Form four candidate groups in order: Federation ships, Empire ships, Federation
bases, Empire bases. A Federation ship requires an active commission, a recorded
position and a nonempty sector at that position. An Empire ship requires a
recorded position and nonempty sector but has no separate commission test here.
A base requires positive strength and a nonempty sector at its position.
A nonempty sector need not identify the same entity being considered; temporary
BlackHoleObject interaction during HELP or GRIPE does not exclude the ship.
An empty group contributes no candidate to the result.

Within each group select the smallest squaredDistance from the Romulan. Equal
distances retain the first ship in roster order or first base in faction base
order. Then compare the group winners in the group order above. A nearer winner
replaces the current choice. A farther winner does not. On equality, replace
the current choice exactly when IntegerDraw(2) is 1. Apply each comparison to
the choice produced by the previous comparison; this is not one uniform choice
among all equally distant targets.

The result identifies that entity and its position. Its range is the ordinary
Chebyshev distance between that position and the Romulan, not the squared
ranking distance. A different object with smaller grid range does not take
precedence over the winner of the squared-distance comparison.

**OPEN QUESTION:** This selection contract currently covers states with an eligible target
within a Euclidean distance of 75 sectors. With no eligible target, or with all
candidates farther away, the generalized selection outcome remains unresolved.
This is a limit of this draft's defined domain, not a newly specified pursuit
radius or permission to choose an arbitrary target. Concurrent changes during
selection also remain unresolved.

**Source basis:** [DIST](../../legacy/utexas/DECWAR.FOR#L836).

## Movement toward a target

```text
operation PursueRomulanTarget(trigger: CaptainId, target: RomulanTarget): RomulanTarget
```

Let r be the present Romulan. If target.range is at most one, proceed to weapon
selection without movement, returning that target. Otherwise define the Position
shortPoint one sector short of the target along each axis with nonzero displacement:

```text
shortPoint.vertical = target.position.vertical
    - sign(target.position.vertical - r.position.vertical)
shortPoint.horizontal = target.position.horizontal
    - sign(target.position.horizontal - r.position.horizontal)
displacement = shortPoint - r.position
steps = min(target.range, 4)
trace = TracePath(r.position, displacement, steps, 0)
```

Here sign(x) is -1, 0 or 1 according to x's sign. Trace length uses the original
target range, not the distance to shortPoint. It can therefore reach an object
beyond that shortened point.

With no obstruction, move to trace.lastClear. With an obstruction, examine
these candidates for offsets k from 1 through steps, in this order for each k:

```text
(trace.lastClear.vertical - k, trace.lastClear.horizontal)
(trace.lastClear.vertical, trace.lastClear.horizontal - k)
```

Choose the first candidate inside the galaxy whose sector is empty. If none
qualifies, remain at the original position, even if trace.lastClear was farther
along the path. There is no corresponding search in the increasing coordinate
directions. On a position change, the old sector becomes empty and the new
sector contains RomulanObject. Movement has no Romulan energy charge.

After this attempt, select and return a target again. A privileged triggering captain
receives the Romulan's resulting position report, even if the position did not
change. If the new target's range exceeds ten, reset a.cadence to zero and end
without attacking. Otherwise proceed to weapon selection. The point-blank path
skips this movement attempt, second selection and privileged movement report.

**OPEN QUESTION:** Concurrent destination changes and temporary interaction states need
complete resolution rules. No reservation or collision-damage policy is implied.

**Source basis:** [ROMDRV movement](../../legacy/utexas/DECWAR.FOR#L3323),
[sector paths](world-rules.md#sector-paths).

## Weapon selection and phasers

A target in range is considered against the two persistent deadlines. Let t be
now, P be a.phaserReady and T be a.torpedoesReady at this selection event:

| Condition, checked in order | Effect |
| --- | --- |
| `min(P, T) > t` | No attack; leave a.cadence unchanged. |
| Otherwise | Reset a.cadence to zero, then select a weapon below. |
| `max(P, T) < t` | IntegerDraw(2) selects TORPEDOS on 1 or PHASERS on 2. |
| Otherwise, `P < t` | Select PHASERS. |
| Otherwise | Select TORPEDOS. |

Equality is significant. In particular, if P equals t while T is later than t,
this rule selects torpedoes. It does not use one common ready predicate for
both weapons and does not wait inside this activation for a later deadline.

Romulan phasers use strength 200 against the selected ship or base, applying
[shared phaser damage and scoring](world-rules.md#weapon-damage-to-ships-and-bases).
This is PhaserHit with source RomulanAttack and target ShipBody or BaseBody
for the selected identity. Its WeaponHit supplies the damage, critical,
defense and destruction observations for the ensuing report.
They have no firing-energy charge, overheating test or player-device penalty.
Damage and kill points accrue directly to a.score.

A full-strength base first sends its distress notification to its faction's
captains whose radios are on. After the hit, notify captains within ten sectors
of the target. Set a.phaserReady to now plus `(w.pacingClass + 1)*750 milliseconds`.
If the base was destroyed, its faction's captains with radios on then receive
the destruction notification. The torpedo deadline is unchanged.

For TORPEDOS, use the burst contract below. After either weapon path returns,
IntegerDraw(10) equal to 1 invokes autonomous speech. Then activate both factions'
base defenses, all eligible planet defenses and base replenishment, in that
order, under the Romulan context. These extra installation phases occur only
after an attempted weapon; appearance, movement or waiting alone does not
activate them. They still occur after a burst that destroyed the Romulan unless
world termination already ended execution.

The surrounding player turn subsequently continues its own accounting. These
extra phases do not recursively advance that player's stardate or invoke another
Romulan activation. Base-defense announcements retain the triggering captain's
faction for the ten-sector audience, as defined in the turn rules.

**Source basis:** [weapon selection and follow-up](../../legacy/utexas/DECWAR.FOR#L3261),
[base defenses](../../legacy/utexas/DECWAR.FOR#L375),
[planet defenses](../../legacy/utexas/DECWAR.FOR#L2800),
[replenishment](../../legacy/utexas/DECWAR.FOR#L317).

## Torpedo aim and burst

```text
operation RomulanTorpedoes(target: RomulanTarget): RomulanBurstOutcome

type RomulanBurstOutcome = Finished { shots: integer }
                   | RomulanDestroyed { shots: integer } | GalaxyEnded
```

Before the first shot, examine the target's clipped three-by-three neighborhood
in increasing vertical coordinate, then increasing horizontal coordinate. If
it contains a star, the first star becomes the aim point; otherwise use the
target's position. Aim substitution does not select a different primary target
or perform another ten-sector range check. The aim displacement is from the
Romulan's current position to that point.

A burst launches at most three torpedoes, without an ammunition inventory or
energy charge. A misfire allows its own shot to travel but prevents subsequent
shots in the burst. Each launched shot has:

```text
deflection = (UnitDraw() - 0.5) / 2.5;
misfire = IntegerDraw(100) > 96;
if (misfire) {
    deflection += (UnitDraw() - 0.5) / 5;
}
```

Trace length has the same discrete selection as player torpedoes:

| UnitDraw result | Maximum steps |
| --- | --- |
| `[0, 1/8)` | 7 |
| `[1/8, 5/8)` | 8 |
| `[5/8, 7/8)` | 9 |
| `[7/8, 1)` | 10 |

Each launched shot contributes `(w.pacingClass + 1)*1000 milliseconds` to the
burst's accumulated delay. There is no device-damage delay term. Trace the shot
from the current Romulan position along its aim displacement with the selected
step count and deflection.

An unobstructed shot has no miss notification and retains the same aim displacement
for the next shot. For an obstructed shot, apply the encountered object's rule.
The star branch obtains q with IntegerDraw(100):

| Object | Effect |
| --- | --- |
| Star | At q at most 80, announce the star's destruction within ten sectors, subtract 50 STAR_DESTRUCTION points from a.score and invoke ExplodeStar with RomulanNova and the triggering captain as viewer. Otherwise the star survives. |
| Black hole | Absorb the shot without an additional hit report. |
| Player ship | Apply shared torpedo damage and direct Romulan score credit. Notify within ten sectors of the impact, then release any remaining tractor association. |
| Base | A base at 100% strength first sends its radio-filtered faction distress notification. Apply torpedo damage and Romulan score credit, report the hit within ten sectors, and send its radio-filtered faction destruction notification if destroyed. |
| Planet | Apply the accidental-planet-hit rule below. |

After a handled obstruction, select a primary target again. If its range exceeds
ten, stop the burst. Otherwise repeat the neighboring-star aim substitution and
recompute displacement from the current Romulan position. A shot whose planet
update was refused skips this retargeting and retains its aim. An unobstructed
shot also skips retargeting. The misfire still prevents a following launch.

For ship and base impacts, TorpedoHit receives RomulanAttack, the encountered
ShipBody or BaseBody identity, and the trace step. Applied { hit: hit } provides the
hit observations and has already applied the shared Romulan score effects.
The TargetAlreadyFatal caller-report case remains open in the shared contract.

At normal completion, including a misfire stop or out-of-range retarget, set
`a.torpedoesReady = now + accumulated delay` and give Finished with the number
of launched shots. Leave a.phaserReady unchanged.
If a nova destroys the Romulan during the burst, return immediately without this
torpedo-deadline update, giving RomulanDestroyed with that shot count; previous
shot effects remain. Galaxy termination instead gives GalaxyEnded and follows
the session exit rules. The enclosing activation
then follows its post-weapon speech and installation rules unless the galaxy
has ended.

**OPEN QUESTION:** Concurrent target or firing-position changes, unavailable target
selection and interrupted notification sequences need their complete contracts.

**Source basis:** [ROMSTR](../../legacy/utexas/DECWAR.FOR#L3400),
[ROMTOR](../../legacy/utexas/DECWAR.FOR#L3419).

## Accidental torpedo hits on planets

A planet impact can be refused without a planet change or hit report; in that
case the burst continues without retargeting. The complete refusal conditions
remain part of the multiplayer contract, not a new random miss probability.

If accepted, q at least 75 removes one build. Smaller q leaves builds unchanged.
If the resulting build count is negative, destroy the planet and subtract 100
PLANET_DESTRUCTION points from a.score. Apply installation-removal and world-end
rules. Exactly zero builds survives. Report the hit within ten sectors of the
impact, displaying at least zero builds, then retarget under the burst rule if
the galaxy continues.

These are accidental hits: primary target selection does not choose planets.

**Source basis:** [ROMTOR planet impact](../../legacy/utexas/DECWAR.FOR#L3492).
