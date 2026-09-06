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

## Weapon damage to ships and bases

The firing command supplies an attacker, target and weapon parameters.
The phaser calculation also serves installation defense. In the following formulas,
H is damage measured in damage units; S is shield or base strength measured in
percentage points, so 100 denotes full strength. These local numbers stand for
the named game quantities.

### Phaser impact

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

### Torpedo impact

A torpedo does not damage a ship whose energy is already nonpositive or whose
hull damage is already at least 2500 units, or a base whose strength is already
nonpositive. Otherwise draw a, b and c with `UnitDraw()` and let
`rawDamage = 400 + 400*c` damage units.

For a ship with shields down, set H to rawDamage and leave shield strength
unchanged. For a shielded ship or a base, first test deflection using its current S:

```text
if b - (S/100)*a + 0.1 <= 0:
    H := 0
    strength := max(0, S - 5*b) percentage points
    report TorpedoDeflected
else:
    H := rawDamage * (1 - S/100)
    strength := S - 0.03 * (rawDamage * max(S/100, 0.1) + 1)
    if target is a ship:
        strength := max(0, strength)
```

A deflected hit skips critical damage and ordinary hull, energy and base-strength
damage. It still lowers exhausted shields, sets a ship's condition red, and
attempts to displace a surviving ship. A hit that was not deflected applies the
critical, ordinary-damage and score rules below, using b from this impact.

After damage, a surviving ship is displaced along the torpedo's trace step.
Destruction by that displacement earns the same 500-point ship kill credit.
An ordinary torpedo hit does not displace a base. The firing command releases
the victim's tractor beam after the hit notification, including a deflected hit.

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
base has zero strength and no presence in its sector. On this weapon-damage path,
docking re-evaluation occurs before removing the base or setting its strength to
zero. Consequently, a base destroyed by the random critical outcome while still
at positive strength can itself preserve a nearby ship's docking at that step.
The firing command supplies the subsequent destruction notification.

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
attackers credit their faction directly. For a surviving Romulan struck by a
player's torpedo, `IntegerDraw(10) > 7` attempts displacement along the trace
step. Destruction by that displacement also earns the 500-point bonus. Phaser
hits do not invoke that displacement.

**Source basis:** [PHAROM, TOROM and DEADRO](../../legacy/utexas/DECWAR.FOR#L3382),
[player phaser credit](../../legacy/utexas/DECWAR.FOR#L2711).

## Blast displacement

`Displace(target, step)` uses a direction step from a torpedo path or from an
exploding star to the affected sector. Compute the candidate by rounding each
coordinate of `target.position + step` down to a whole sector. If the candidate
is outside the galaxy, is not exactly one sector away in Chebyshev distance,
or contains an object other than a black hole, nothing moves.

For an empty candidate, move the target there and update its galaxy presence.
A displaced player ship becomes undocked and red. Displacement itself does not
charge energy, change shields, or release a tractor association.

For a black hole, remove the target from its old sector without replacing the
black hole. A ship receives 2500 hull-damage units and ceases to be commissioned;
a base receives zero strength; the Romulan ceases to exist. Report displacement
into the black hole. Keep the target's last occupied position distinct from that
reported destination. The caller performs its destruction scoring and notices.

**Source basis:** [JUMP](../../legacy/utexas/DECWAR.FOR#L1283).

## Stellar explosions

A nova affects ships, bases, planets and the Romulan in the exploding star's
sector and its eight adjacent sectors, clipped to the galaxy. Friendly objects
receive nova damage too. A chain retains the original initiating attacker for
scoring throughout.

### Chain order

Remove the initial star. For each explosion, inspect nearby sectors in increasing
vertical coordinate, then increasing horizontal coordinate. Record the positions
of damageable objects and their displacement vectors from this explosion.
For each neighboring star, `IntegerDraw(5) != 5` selects it to explode, provided
fewer than 29 other stars are awaiting explosion. Remove a selected star at once
and place its position last in the pending explosion sequence.

Resolve affected positions in reverse discovery order. At each position, use the
object currently there; an earlier hit may have moved or destroyed the object
originally observed. Apply the appropriate nova effect below if the current
object is damageable. Then take the last pending explosion, announce it to
captains within ten sectors, charge 50 STAR_DESTRUCTION points to the initiator,
and repeat. The charge is a subtraction from a player's pending score or the
Romulan's own score. Stop when no explosion remains pending. The triggering
weapon supplies the initial star's announcement and score effect.

The limit is on pending explosions, not the total number of stars in a chain.
Selection and removal precede nearby damage; a sector vacated by a scheduled
star can therefore receive a displaced object before that explosion occurs.

### Ship and base severity

Start with severity 100. Subtract a base's strength in percentage points, or a
ship's shield strength if its shields are up. If the result is less than 20,
replace it with 25; exactly 20 stays 20. Call the resulting number d.

For a ship, add `4*d*UnitDraw()` damage units to each of the nine devices in
device order. If shield-device damage then reaches 300 units, lower shields.
For either a ship or a base, the reported hit damage is
`H = 8*d + IntegerDraw(1000)/10` damage units.

A player initiator receives H pending damage points for an enemy and loses H
for a teammate: ENEMY_DAMAGE for ships, BASE_DAMAGE for bases. A Romulan initiator
receives H points directly in the corresponding category.

### Ship effect

```text
target.hullDamage += H damage units
target.energy -= H * UnitDraw() energy units
if target.shields.mode == UP:
    target.shields.strength := max(0,
        target.shields.strength - 30% + (IntegerDraw(100)/10)*1%)
if target.shields.strength <= 0%:
    target.shields.mode := DOWN

if target.hullDamage >= 2500 damage units or target.energy <= 0:
    remove target's galaxy presence
    target.commissioned := false
else:
    Displace(target, displacementFromStar)
```

A nova kill adds 500 ENEMY_KILLS points directly to the player initiator's team
for an enemy, or subtracts 500 for a teammate. This kill adjustment is to the
team total, not the captain's pending score. A Romulan initiator receives 500
direct points. Announce the hit within ten sectors of the target's resulting
or last occupied position, then release its tractor beam. A surviving ship that
cannot be displaced does not become red or undocked merely from this nova rule.

### Base effect

A base at 100% strength first announces distress to its faction's captains whose
radios are on. Set strength to `max(0, strength - 30% + (IntegerDraw(100)/10)*1%)`.
If positive, attempt displacement away from the star. If the base is destroyed,
a player initiator receives 1000 pending BASE_DAMAGE points for an enemy base
or loses 1000 for a friendly base; a Romulan initiator receives 1000 directly.
Update the faction's surviving-base count and re-evaluate docking.

Announce the hit within ten sectors of the resulting or last occupied position.
For a destroyed base, remove its remaining presence and announce destruction to
its faction's captains whose radios are on. The H damage credit above applies
independently of this strength reduction and any destruction bonus.

### Romulan and planet effects

Displace a surviving Romulan first. If it survives displacement, halve its energy.
The player initiator receives one tenth of that remaining energy in pending
ROMULAN points. If displacement destroyed it, use its energy immediately before
displacement instead. A Romulan initiator loses the corresponding points from
its own score. Announce the hit within ten sectors of its resulting or last
occupied position. Destruction adds 500 points for a player initiator, or
subtracts 500 from a Romulan initiator's score.

For a planet, first obtain permission for a shared planet update. If unavailable,
leave it unaffected. Otherwise subtract three builds and announce the hit within
ten sectors, displaying at least zero builds. A negative result destroys the
planet and subtracts 100 PLANET_DESTRUCTION points from the player's pending
score or the Romulan's score. Remove the planet and apply installation-loss and
world-termination rules. Release the shared update. Exactly zero builds survives.

**Source basis:** [NOVA](../../legacy/utexas/DECWAR.FOR#L2259),
[SNOVA](../../legacy/utexas/DECWAR.FOR#L3807).

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
