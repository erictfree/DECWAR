# Shared world rules

Commands refer to these operations when their effects involve paths, weapons or
installations. The chapter is being extended; unresolved interactions are stated
at their point of use.

## Random choices in semantic rules

`UnitDraw()` supplies a value in [0,1). `Choice(values)` selects one member of a
finite ordered collection. `IntegerDraw(n)` supplies an integer from 1 through n.
These are abstract random inputs, not a prescribed generator or seed encoding.
An example can supply their results explicitly to make an outcome reproducible.
The full probability and reproducibility requirements remain under review.

The rules distinguish choices that select a discrete outcome from rounding of
a continuous calculation. Device selection is discrete; damage and shield
strength retain fractions after arithmetic. Calls or numerical artifacts with
no game-state or output effect do not themselves define extra game events.

## Sector paths

A path has a starting position, an intended displacement, an integer maximum
number of steps and a deflection. It returns the last unobstructed position,
any obstruction and its position, and a direction step for towing or blast
displacement. The intended endpoint determines direction; a torpedo can continue
beyond that endpoint when its allowed step count is greater.

Choose the axis of greatest absolute displacement as the dominant axis. A tie
chooses vertical. The dominant step is +1 or -1. The other step is its intended
displacement divided by the absolute dominant displacement, plus deflection.
The running position begins at the start; its nondominant coordinate can be
fractional.

For a running nondominant coordinate c, define candidate sectors as follows:

```text
PathCandidates(c):
    fraction := c - floor(c)
    if abs(fraction - 0.5) < 0.1:
        return [floor(c), floor(c) + 1]
    return [floor(c + 0.5)]
```

This is a geometric rule: near the boundary between two sector centers, both
sectors can obstruct the path. Sector selection requires whole coordinates;
damage and other continuous game quantities do not inherit this rounding.

```text
TracePath(start, displacement, steps, deflection):
    step := dominant and nondominant steps defined above
    running := start
    lastClear := start

    repeat at most steps times:
        running := running + step
        if dominant coordinate is outside 1..75:
            return Unobstructed(lastClear, step)

        candidates := PathCandidates(running.nondominant)
        for each candidate in listed order:
            position := running with nondominant coordinate = candidate
            if position is outside the galaxy:
                return Unobstructed(lastClear, step)
            if a blocking object occupies position:
                return Obstructed(lastClear, position, object, step)

        if count(candidates) == 2:
            selected := floor(running.nondominant + UnitDraw())
        else:
            selected := candidates[1]
        lastClear := running with nondominant coordinate = selected

    return Unobstructed(lastClear, step)
```

The list notation here uses the first candidate as `candidates[1]`. Ordinary
ships, bases, planets, stars, the Romulan and black holes block a trace. Empty
sectors do not. Temporary absence or concealment is a separate session rule
still being converted. An obstruction on the second candidate still leaves
`lastClear` at the previous step; passing the first candidate does not complete
half a step.

Leaving the galaxy stops at the last clear sector without reporting an object
collision. Probe order and obstruction timing are part of the rule, not a
permission to choose any straight-line grid traversal.

**Source basis:** [CHECK and CHKPNT](../../legacy/utexas/DECWAR.FOR#L699).

## Tractor associations

```text
ReleaseTractorBeam(beam):
    for each endpoint in beam.endpoints:
        ship := ship identified by endpoint
        ship.tractorBeam := none
    remove beam from world.beams
    notify both endpoints of TractorReleased
```

Releasing a beam changes neither endpoint's position, energy, shields nor
stardate. Commands and combat rules specify when they invoke release.

After a ship actually changes sector while associated with a beam, the other
endpoint follows. Its new position is the moving ship's new position minus the
trace step, with each resulting coordinate rounded down to a whole sector.
Both its position and its presence in the galaxy describe that one location.
If the moving endpoint did not change sector, the partner does not move.

The other endpoint's energy, condition and docking state are not directly changed
by following. Either endpoint can issue a movement command; an association does
not designate a permanently privileged towing ship.

**Open:** The generalized outcome when the resulting trailing sector is occupied
or outside the galaxy remains unresolved. No extra collision, damage or safe
placement rule is introduced by this draft.

**Source basis:** [TRCOFF](../../legacy/utexas/DECWAR.FOR#L4504),
[following movement](../../legacy/utexas/DECWAR.FOR#L2227).

## Phaser damage to ships and bases

The firing command supplies an attacker, target, firing strength and distance.
The same calculation serves installation defense. In the following formulas,
H is damage measured in damage units; S is shield or base strength measured in
percentage points, so 100 denotes full strength. These local numbers stand for
the named game quantities.

Draw b and c with `UnitDraw()`. Let `F = (0.9 + 0.02*c)^distance`. If a player
ship is firing and either its phasers or computer has positive damage, multiply
F by 0.8. Installation attacks and Romulan attacks do not receive this reduction.

For a ship with shields down, `H = 8*F*firingStrength`; shield strength does not
change. For a shielded ship or base, use its strength before this attack:

```text
H := 4 * F * firingStrength * (1 - S/100)
newStrength := S - 0.03 *
    (4 * F * firingStrength * max(S/100, 0.1) + 1)
```

Set a ship's shield strength to `max(0, newStrength)` percentage points. Set a
base's strength to `newStrength` percentage points; the base resolution below
handles nonpositive strength. Then resolve H using the following rules.

### Critical ship damage

If `H*(b+0.1) >= 170`, a ship takes a critical hit:

```text
criticalDamage := H / 2
device := Choice(Device)
target.devices[device].damage += criticalDamage damage units
if device == SHIELDS:
    target.shields.mode := DOWN
H := criticalDamage + 100 * (UnitDraw() - 0.5)
```

The critical-damage report names the device and the damage added to it. H after
the final adjustment is the ordinary hit damage reported and applied to hull
and engine energy. An attack that does not meet the critical condition leaves
device damage unchanged.

```text
ApplyShipHit(target, H):
    target.hullDamage += H damage units
    target.energy -= H energy units
    if target.shields.strength <= 0%:
        target.shields.mode := DOWN
    target.condition := RED
    if target.hullDamage >= 2500 damage units or target.energy <= 0:
        remove target's presence from the galaxy
        target.commissioned := false
        report target destroyed
```

Phaser damage does not displace the target. Shield-device damage by itself does
not invoke SHIELDS UP's validation rule; the critical-device selection and
strength rules above determine whether these hits lower shields.

### Base damage

When `H*(b+0.1) >= 170`, draw `IntegerDraw(5)`. A result of 5 takes the critical
base path immediately; otherwise apply ordinary base damage. Below the threshold,
apply ordinary base damage without this choice.

Ordinary base damage subtracts `0.01*H` percentage points, with a floor of zero.
A positive result completes that hit. Nonpositive strength takes the critical
base path.

```text
CriticalBaseHit(base):
    base.strength -= (5 + 10 * UnitDraw()) percentage points
    report a critical base hit
    if IntegerDraw(10) == 10 or base.strength <= 0%:
        DestroyBase(base)
```

The early critical path skips ordinary base damage and ordinary damage-score
credit. Its hit report still carries the originally calculated H. A destroyed
base has zero strength and no presence in its sector; destruction also invokes
docking re-evaluation and the appropriate destruction notification.

### Score and result

For a ship-fired attack, ordinary H damage to an opposing ship contributes H
points to ENEMY_DAMAGE; ordinary H damage to an opposing base contributes H
points to BASE_DAMAGE. A player attacker accrues these as pending score. Romulan
attacks update the Romulan's score directly. The early critical-base path has no
ordinary H damage credit. Destroying a ship adds 500 ENEMY_KILLS points; destroying
a base adds 1000 BASE_DAMAGE points for ship-fired attacks.

An installation caller handles its owning faction's score separately from these
ship-fired credits. The returned hit describes damage, critical damage/device,
shield mode and strength after the hit, and destruction. Recipient selection
and rendering belong to the invoking command or defense rule.

**Source basis:** [PHADAM and shared damage](../../legacy/utexas/DECWAR.FOR#L4089),
[displayed score units](../../legacy/utexas/DECWAR.FOR#L2994).

## Damage to the Romulan

The Romulan has its own energy-based damage rule. A phaser attack of strength p
at distance d reports damage
`(100 + IntegerDraw(100))*p/(100*d)` damage units. A torpedo reports
`min(IntegerDraw(4000), 2000)/10` damage units. Deduct that same numerical amount
in energy units from the Romulan. If energy becomes nonpositive, remove the
Romulan from the galaxy and report destruction.

For a player-fired weapon, add the reported damage in points to the pending
ROMULAN category, plus 500 points when the Romulan is destroyed. Installation
attackers credit their faction directly. A surviving Romulan struck by a player's
torpedo can also be displaced; that caller's displacement rule is still being
converted. Phaser hits do not invoke that displacement.

**Source basis:** [PHAROM, TOROM and DEADRO](../../legacy/utexas/DECWAR.FOR#L3382),
[player phaser credit](../../legacy/utexas/DECWAR.FOR#L2711).

## Installation changes and world termination

Removing a planet removes its identity from the planet collection and preserves
the relative order of the remaining planets. A surviving planet does not change
identity because another planet was removed. A conversion to a base transfers
each team's knowledge of the planet to knowledge of the new base.

The game ends when there are no planets and at least one faction has no surviving
bases. If there are no bases on either side, the result is total destruction;
otherwise the faction with surviving bases wins. A privileged world-termination
request can also end the world independently of that condition. Final score
reports and session release are specified by the lifecycle rules still in progress.

Docking re-evaluation is invoked during installation loss or ownership changes.
It visits that faction's docked ships in roster order. A nearby surviving friendly
base preserves docking. Otherwise, when the faction has a positive captured-planet
count, a nearby friendly planet preserves docking; if that search fails, set the
ship undocked and red. With a nonpositive captured-planet count, this operation
leaves docking unchanged. The command describes when this check occurs relative
to ownership and removal; the departing installation can still participate in
a check made before its removal.

**Open:** Full interleavings of base conversion, world termination and concurrent
installation changes remain under review. This chapter does not make the entire
sequence one indivisible action.

**Source basis:** [planet removal](../../legacy/utexas/DECWAR.FOR#L2864),
[docking re-evaluation](../../legacy/utexas/DECWAR.FOR#L339),
[world end](../../legacy/utexas/DECWAR.FOR#L961).
