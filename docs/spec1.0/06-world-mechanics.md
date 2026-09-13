# 6. World mechanics

Commands and autonomous activity act on the same galaxy. A movement command
chooses a path, a weapon command chooses an impact, and a world routine may
produce an impact without a player's command. The result must therefore be
defined by shared operations rather than by separate command-specific versions
of geometry and damage.

This chapter follows one impact from its physical consequences to its wider
effects. It begins with initial weapon damage and shield absorption, then
determines critical damage. If the target moves as a consequence, displacement
and sector traversal resolve that movement. Romulan attacks and nova damage use
the same framework but have distinct rules, so they follow as their own
sections. Nova propagation describes chained effects, and the chapter ends
with the port-loss check that connects object destruction to surviving ships.

The command entries in Section 7 decide when these operations are invoked and
which resources are spent. Section 8 invokes them autonomously; Section 9
defines completion and ordering when several effects occur in one operation.

## 6.1. Initial weapon damage and shields

The equations below use damage units and shield percentages as defined in
Section 2. A unit random sample is uniform on `0 <= u < 1`. Different named
samples denote separate draws. These equations calculate initial damage;
critical-hit processing subsequently determines hull, device, and energy loss.
Planet and Romulan damage use separate rules, not these ship/base equations.

### Phaser attenuation

Let `power` be the firing energy, `distance` the Chebyshev distance to the
target, and `u` a unit sample. The attenuation factor is:

```typescript
const attenuation = (0.9 + 0.02 * u) ** distance;
```

If a player ship fires with any phaser-device or computer damage, multiply
this factor by 0.8 once. Damage to both devices does not apply the penalty
twice. Damage acquired by overheating before the hit participates in this
check. A planet's retaliation does not acquire this player-device penalty.

For a ship with shields down, initial damage is `8 * power * attenuation`.
Its stored shield strength does not absorb damage while shields are down and
does not decrease in this phase.

For a ship with shields up, or a base, let `strength` be its percentage before
the hit. Compute:

```typescript
const incident = 4 * power * attenuation;
const initialDamage = incident * (1 - strength / 100);
const shieldLoss = 0.03 * incident * Math.max(strength / 100, 0.1) + 0.03;
const remainingStrength = strength - shieldLoss;
```

For ship shields, floor remaining strength at zero. The base intermediate is
not floored here: subsequent base-damage and destruction processing determines
the resulting base. Do not insert a new damage computation based on the reduced
strength. Absorption uses strength at the start of the hit.

### Torpedo deflection

For a ship with shields up, or a base, take two unit samples `u` and `v`.
Deflection occurs when:

```typescript
v - (strength / 100) * u + 0.1 <= 0
```

The equality case is a deflection. A deflected torpedo causes no initial hull
or device damage, but reduces shield/base strength by `5 * v` percentage
points, with a floor of zero. A ship with shields down does not test deflection.
This is distinct from a torpedo's flight deflection in Section 7.20: one changes
its path; the other rejects a torpedo that has reached a shielded target.

If not deflected, another unit sample `w` gives incident damage
`400 + 400 * w`. A ship with shields down receives that full initial damage.
For raised ship shields or a base, apply the same absorption and shield-loss
equations above using this incident damage instead of phaser incident damage.

The second deflection sample `v` also participates in later critical-hit
selection. It is not replaced with a fresh draw at that stage. Ship shields
down omit the deflection test, but still use the critical-hit sample later.

### Boundaries

- Full-strength raised shields admit zero initial damage on a nondeflected
  hit but lose shield strength. They do not remain unchanged.
- Zero-strength raised shields admit all incident damage yet still use the
  raised-shield phaser multiplier. Lowered shields use the larger multiplier.
- The `0.1` minimum absorption factor affects shield loss, not the fraction
  of damage admitted through shields.
- At strength 100, `u=0.5` and `v=0.4` satisfy the deflection boundary exactly;
  the shield loss is 2 percentage points.

> Reviewer note — state precision and remaining damage: These equations define
> the ordinary-arithmetic intermediate quantities. Historical assignments
> quantize strength and damage to tenths; the places where that quantization
> is observable need an explicit decision before final state writes are fixed.
> Destruction lifecycle, score delivery, and combat output remain required
> subsequent phases. Initial damage must
> not be mistaken for the final hull-damage increment.

The initial-damage operation produces the incident that reaches a target after
shield absorption. The next question is how that incident is classified and
written to the target's state.

## 6.2. Critical hits and target damage

A nondeflected hit uses the initial damage `damage` from Section 6.1 and a
unit sample `criticalSample`. For a torpedo, this is the sample `v` already
used in the deflection test. For a phaser, it is a separate sample drawn before
the attenuation sample. The hit is critical when:

```typescript
damage * (criticalSample + 0.1) >= 170
```

Equality is critical. Shield loss has already occurred; neither the critical
test nor the damage below is recomputed from the reduced strength. A deflected
torpedo skips this test and causes no hull, device, or energy loss.

### Ships

A noncritical hit increases the target's `Ship.hullDamage` and decreases its
`Ship.energy` by `damage`.

A critical hit instead selects one of the nine devices with equal probability.
It adds `damage / 2` to that device's damage. A hit on `SHIELDS` also sets
`Ship.shields.mode` to `DOWN`, regardless of its remaining strength. Using a
new unit sample `u`, the hull-damage increment and energy decrease are both:

```typescript
const hullLoss = damage / 2 + (u - 0.5) * 100;
```

Thus device damage and hull damage are separate results: a critical hit does
not apply the entire initial damage to the hull as well. The random term ranges
from -50 inclusive to 50 exclusive. Device damage has no cap at the critical
device threshold of 300.

After either kind of hit, zero shield strength lowers the shields and the
target's alert condition becomes `RED`. These two steps also apply to a
deflected torpedo. A ship is destroyed if its hull damage is at least 2500 or
its energy is at most zero. A surviving phaser target is not displaced; a
surviving torpedo target proceeds to the displacement operation, including
after shield deflection. Displacement may itself destroy the target.

For a player firing at an enemy ship, add the hull-damage increment to the
attacker's pending `ENEMY_DAMAGE` score. This is the calculated increment,
not a value limited by the victim's remaining energy or distance from the
destruction threshold. A kill adds 500 pending `ENEMY_KILLS` points, including
a kill caused by the ensuing torpedo displacement. A deflection awards zero
damage points but does not exclude a displacement kill.

### Bases

Let `strength` be the intermediate base strength remaining after absorption.
A critical hit has a one-fifth probability of taking the emergency branch
below. Otherwise, reduce strength by `0.01 * damage`, with a floor of zero.
For a player firing at an enemy base, this ordinary branch adds `damage` to
pending `BASE_DAMAGE`. If strength remains positive, the base survives this
operation; if it reaches zero, take the emergency branch.

The emergency branch reduces strength by an additional
`5 + Math.floor(100 * u) / 10` percentage points, using a new unit sample.
It then destroys the base if a separate one-in-ten choice succeeds or the
remaining strength is at most zero. Otherwise the base survives with that
remaining strength. The additional loss therefore ranges from 5 through 14.9
percentage points in steps of 0.1.

Entering the emergency branch directly from the critical-hit choice skips
both the ordinary `0.01 * damage` reduction and the ordinary damage-score
award. Entering it after ordinary damage has reduced strength to zero does
not undo that award. Destruction adds 1000 pending `BASE_DAMAGE` points to a
player attacker in either case and removes the base from the galaxy.

A deflected torpedo skips ordinary base damage. If its shield loss leaves
positive strength, the base survives; otherwise it takes the emergency branch.

### Examples

- With initial damage 200 and critical sample 0.75, the product is 170: the
  hit is critical. The selected device receives 100 damage. A hull sample of
  0.5 gives 100 hull damage and an energy loss of 100.
- With the same initial damage and critical sample 0.74, the hit is not
  critical: hull damage and energy loss are both 200, with no device damage.
- A base with intermediate strength 40 and initial damage 200 ordinarily
  ends at strength 38 and awards 200 damage points. If the critical emergency
  branch is selected instead, an emergency sample of 0.5 leaves strength 30;
  a failed destruction choice leaves it alive and awards no damage points.

> Reviewer note — completion of hit resolution: These calculations retain the
> state-precision question in Section 6.1. The destruction predicate and awards
> above do not yet define release, docking consequences, notification recipients,
> or output order. Displacement is defined in Section 6.3. Autonomous attackers'
> score accounting also requires its own rule. These remaining operations are
> necessary for complete command semantics.

Once damage has been applied, some impacts move a surviving target and some
destroy it. Displacement is a separate operation because it has its own path,
boundary, and destruction consequences.

## 6.3. Displacement

Displacement attempts to move an object into one neighboring sector. Torpedo
hits attempt displacement for surviving player ships, including after shield
deflection. They do not displace bases. A surviving Romulan attempts
displacement with probability 3/10. Nova effects may also request displacement.

The operation takes the target position and a real-valued step
`(verticalStep, horizontalStep)`. For a torpedo, derive this step from its
aim displacement `(dv, dh)` and flight deflection `deflection` in Section 7.20:

```typescript
const verticalDominant = Math.abs(dv) >= Math.abs(dh);
const verticalStep = verticalDominant
  ? Math.sign(dv) : dv / Math.abs(dh) + deflection;
const horizontalStep = verticalDominant
  ? dh / Math.abs(dv) + deflection : Math.sign(dh);
```

The aim displacement is nonzero. Ties use the vertical axis as the dominant
axis. Deflection modifies only the other component; it does not rotate a unit
vector or change the dominant component. A nova supplies the integer vector
from the exploding star to its neighboring target instead.

Compute one candidate, truncating each resulting coordinate toward zero:

```typescript
const candidate = {
  vertical: Math.trunc(position.vertical + verticalStep),
  horizontal: Math.trunc(position.horizontal + horizontalStep),
};
```

Reject the candidate if it is outside the 75-by-75 galaxy or its Chebyshev
distance from `position` is not exactly one. If the candidate contains an
object other than a black hole, displacement also fails. Failure leaves the
target at its original position; do not try a different neighbor.

If the candidate is empty, move the target there. For a player ship, set
`Ship.condition` to `RED` and `Ship.docked` to `false`. Displacement itself
does not charge movement energy, advance a stardate, or perform automatic
repair. The enclosing attack or nova supplies damage and output rules.

If the candidate contains a black hole, destroy the target and vacate its
original sector. The black hole remains. A player ship's hull damage becomes
2500; a base is removed; a Romulan vessel ceases to exist. Report the black
hole position as the displacement destination. This is destruction, not a
surviving target sharing a sector with a black hole.

### Examples

- From (20, 20), step (1, 0.2) selects (21, 20); step (1, -0.2) selects
  (21, 19). Truncate the summed coordinate, not the step separately.
- If (21, 19) contains a star, the second displacement fails. If it contains
  a black hole, the target is destroyed and the star/black-hole distinction
  is observable.
- From (75, 20), step (1, 0) fails at the galaxy boundary without wrapping.
- Step (1, -1.1) from (20, 20) produces (21, 18), which fails the
  one-sector-distance requirement even if that sector is empty.

> Reviewer note — lifecycle and character: Destruction still requires the
> release and notification rules. The asymmetric coordinate truncation is
> retained here as evidenced behavior; C-018 records the choice between this
> rule and a symmetric displacement rule. Do not normalize it silently.

Displacement needs a way to choose the sectors along a path. The traversal
operation below is shared by ship movement, torpedoes, and displacement, even
though each caller supplies different limits and consequences.

## 6.4. Sector traversal

Sector traversal follows a direction for a bounded number of dominant-axis
steps. Its inputs are the starting position, a nonzero aim displacement,
a positive integer extent, and a real-valued deflection. It returns the last
accepted empty position and, if blocked, the first obstructing sector. It does
not move objects or apply damage itself.

Use the dominant axis and step defined in Section 6.3. Keep a continuous
coordinate for the other axis, initially equal to its starting coordinate.
The starting sector is not checked for obstruction. For each step, in order:

1. Advance the dominant coordinate by its step of +1 or -1. If it is outside
   1 through 75, stop without an obstruction at the last accepted position.
2. Add the minor-axis step to the continuous coordinate `c`.
3. Select the minor-coordinate candidates as described below. Check them in
   their stated order. If a candidate is outside 1 through 75, stop without
   an obstruction at the last accepted position. If its sector is occupied,
   stop and return that sector as the obstruction. All sector objects,
   including black holes, obstruct traversal.
4. If there is one candidate and it is empty, accept that sector. If there
   are two and both are empty, draw a unit sample `u` and accept the sector
   whose minor coordinate is `Math.trunc(c + u)`.

After the final step, return the last accepted position without an obstruction.
In particular, a torpedo does not necessarily stop at its aim coordinate:
the aim supplies direction, while the independently chosen extent supplies
the number of steps.

### Candidate selection

Compute the hundredths remainder `r`:

```typescript
const r = Math.trunc(c * 100) % 100;
```

If `Math.abs(r - 50) < 10`, check `Math.trunc(c)` first, then
`Math.trunc(c) + 1`. Otherwise check only `Math.trunc(c + 0.5)`.
For positive coordinates, the two-candidate band is the fractional interval
from 0.41 inclusive to 0.60 exclusive. The lower candidate is checked first
regardless of travel direction. Do not choose randomly between candidates
before checking for obstacles: an object in either candidate blocks the path,
and an object in the lower candidate wins when both are occupied.

When both candidates are empty, the probability of accepting the upper one
is the fractional part of `c`, not necessarily one half. This random selection
does not replace the continuous coordinate with the selected integer; the
next step continues from the accumulated real coordinate. No selection sample
is drawn for a single candidate, an obstruction, or a boundary stop.

### Examples

From (20,20), aim displacement (2,1), extent 2 and zero deflection:

- The first step checks (21,20), then (21,21).
- If either is occupied, traversal stops at (20,20) and identifies the first
  occupied candidate in that order.
- If both are empty, a sample below 0.5 accepts (21,20); a sample of 0.5 or
  greater accepts (21,21). The continuous horizontal coordinate remains 20.5.
- The second step checks (22,21) regardless of which empty sector was accepted
  on the first step. An obstruction there returns the first step's selected
  sector as the last accepted position.

At `c=20.40`, only minor coordinate 20 is checked; at `c=20.41` or `c=20.59`,
20 and 21 are checked; at `c=20.60`, only 21 is checked.

> Reviewer note — numerical boundaries: The equations use ordinary arithmetic.
> Reproducing historical floating-point perturbations at hundredths boundaries
> is not an implicit requirement. Conformance cases must distinguish these
> mathematical boundaries from unresolved state-write precision in combat.
> C-006 remains open: this is the evidenced two-sector inspection rule, not
> approval to replace it with a conventional nearest-sector line.

Ship and base damage use the ordinary target rules above. The Romulan is a
different target class with its own energy and displacement behavior, so its
weapon response is defined separately rather than forced into those cases.

## 6.5. Weapon hits on the Romulan

The Romulan has energy but no player-ship shields, hull, or device damage.
Do not apply Sections 6.1–6.2 to it. A hit has a reported damage value and a
separate energy decrease; the reported value is also the player's score award.

For a phaser hit, let `power` be the firing energy, `distance` the positive
Chebyshev distance, and `roll` a uniformly selected integer from 1 through 100:

```typescript
const damage = Math.trunc((100 + roll) * power / (10 * distance)) / 10;
const energyLoss = Math.trunc(damage) / 10;
```

There is no exponential attenuation, shield absorption, critical-device
selection, or damaged-player-device multiplier in this operation. Command
validation and expenditure still apply. Phaser hits do not displace the Romulan.

For a torpedo hit, select an integer `roll` uniformly from 1 through 4000:

```typescript
const damage = Math.min(roll, 2000) / 10;
const energyLoss = Math.trunc(damage) / 10;
```

Reported damage ranges from 0.1 through 200 in tenths, but is not uniform:
each value below 200 has probability 1/4000, while 200 has probability
2001/4000. A hit reporting less than 1 causes no energy loss. Torpedoes do not
test shield deflection against the Romulan.

Subtract `energyLoss` from `Romulan.energy`. If the result is at most zero,
remove the vessel and set `Galaxy.romulan.vessel` to `null`; Romulan activity
remains enabled. Otherwise, after a torpedo hit, attempt displacement with
probability 3/10 using Section 6.3. Displacement into a black hole also removes
the vessel.

For a player attack, add `damage` to the attacker's pending `ROMULAN` score.
If the hit or its subsequent displacement destroys the Romulan, add another
500 points to the same category. The damage award is not capped by the
Romulan's remaining energy. These rules do not create another player turn
or charge additional firing energy.

### Examples

- A power-200 phaser hit at distance 1 with roll 1 reports 202 damage and
  removes 20.2 energy. At distance 10 it reports 20.2 and removes 2 energy.
- Torpedo rolls 9 and 10 report 0.9 and 1 damage, but remove 0 and 0.1 energy,
  respectively. Rolls 2000 and 4000 both report 200 and remove 20 energy.
- A Romulan with 20 energy is destroyed by a maximum torpedo hit. The firing
  player receives 700 pending `ROMULAN` points: 200 damage plus 500 for the kill.

Hit wording and player-weapon recipient selection are defined in Sections
10.5–10.7. Romulan appearance, pursuit, weapons and dialogue are defined in
Chapter 8, with their remaining timing and exceptional-state questions marked
there. These outgoing autonomous actions are separate from this incoming-hit
operation. C-023 still governs pending-notification order and loss. The explicit
truncations above distinguish reported damage from energy loss; they are not
a general numeric encoding.

An exploding star is neither an ordinary hit nor a single-target displacement.
Nova damage applies an expanding event to objects around an origin; the next
sections define its target-specific effects and propagation.

## 6.6. Nova damage

A nova damages neighboring objects without a friendly-fire exemption. Its
damage rules differ from weapon impact. The displacement step is the vector
from the exploding star to the target, whose Chebyshev distance is one.

### Ships

Compute the blast factor from the ship's shield mode and strength before damage:

```typescript
let blast = ship.shields.mode === "UP" ? 100 - ship.shields.strength : 100;
if (blast < 20) blast = 25;
```

The minimum rule is deliberately discontinuous: strength 80 gives blast 20,
while any strength above 80 gives blast 25. Lowered shields give blast 100,
regardless of stored strength.

For each of the nine devices, independently add
`Math.floor(40 * blast * u) / 10` damage using a unit sample. Process devices
in the order given in Section 2. If the resulting shield-device damage is
at least 300, lower the shields before the strength-loss step below.

Select an integer `roll` uniformly from 1 through 1000 and compute
`damage = 8 * blast + roll / 10`. Add this amount to hull damage. Subtract
`damage * u` from energy using a new unit sample. If shields are still up,
reduce their strength by `30 - roll / 10` percentage points, using a separate
integer roll from 1 through 100, with a floor of zero. Zero strength lowers
the shields. A device hit that has just lowered shields therefore prevents
this strength reduction; it does not prevent hull or energy loss.

Destroy the ship if hull damage is at least 2500 or energy is at most zero.
Otherwise attempt displacement under Section 6.3. After constructing the
nova-hit report, release any tractor link, even if displacement failed.

For a player-triggered nova, add `damage` to pending `ENEMY_DAMAGE` for an
enemy target, or subtract it for a friendly target, including the firing ship.
A ship kill changes the triggering player's faction `ENEMY_KILLS` score
directly: +500 for an enemy, -500 for a friendly ship. It does not add that
kill award to the individual player's pending score. Displacement kills count.

### Bases

Compute `blast = 100 - base.strength`, replacing values below 20 with 25.
Compute `damage = 8 * blast + roll / 10` using an integer roll from 1 through
1000. For a player-triggered nova, add this amount to pending `BASE_DAMAGE`
for an enemy base or subtract it for a friendly base.

The actual strength reduction is separate from that reported damage. Subtract
`30 - roll / 10` percentage points, using another integer roll from 1 through
100, and floor strength at zero. A full-strength base issues its distress
notification before this reduction. A base with positive remaining strength
attempts displacement; a base reduced to zero does not. Remove a base reduced
to zero or displaced into a black hole. Destruction adds a further 1000
pending `BASE_DAMAGE` points for an enemy base, or subtracts 1000 for a
friendly base.

### Planets

Subtract three from construction. If the result is nonnegative, retain the
planet, including at construction zero. Otherwise remove it. Allegiance does
not protect a planet from a nova or change this threshold. A player-triggered
destruction subtracts 100 pending `PLANET_DESTRUCTION` points, regardless of
the planet's allegiance. A surviving planet remains at its original position.

### Discussion — Romulan nova effects (C-026)

The historical Romulan branch differs from ship and base damage. It first
attempts displacement. If the vessel remains present, halve its energy; a
blocked displacement does not prevent this energy reduction. No random
energy-loss or shield-damage draw is made in this branch, and there is no
separate destruction check after halving.

For a player-triggered nova, the subsequent energy value is added to the
player's pending ROMULAN score. If displacement destroyed the vessel, halving
is skipped: the retained pre-displacement energy supplies that award, followed
by 500 destruction points. For a Romulan-triggered nova, the corresponding
amounts are subtracted from the Romulan's own ROMULAN score. These are distinct
from the star-destruction penalties.

Using quantities unaffected by the unresolved precision choice:

| Prior energy | Displacement outcome | Energy after this branch | Player's pending ROMULAN award |
| --- | --- | --- | --- |
| 20 | Moves to an empty sector | 10; vessel remains present | 10 |
| 20 | Blocked | 10; vessel remains present | 10 |
| 20 | Enters a black hole | Vessel absent; retained report quantity 20 | 520 |

Two boundaries prevent treating this as a complete adopted rule. First,
tenths-based truncation can halve 0.1 energy to zero while leaving the vessel
present, contrary to the current positive-energy invariant. Exact halving
would instead produce 0.05; adding a destruction check would produce another
different result. Neither adjustment is implicit.

Second, the historical branch does not assign a new reported hit-damage
amount. On the ordinary sequential propagation path, preceding notification
creation has cleared that amount, so the Romulan nova-hit report shows zero
damage even when energy decreases. Retaining zero or reporting actual energy
loss is an observable choice separate from the scoring quantity above.
Black-hole displacement also requires care:
the branch's later position assignment restores the retained vessel position,
rather than necessarily reporting the black-hole destination.

C-026 records these lifecycle and snapshot conflicts. The shared hit types
provide fields for their eventual resolution but do not resolve them. In
particular, do not silently repair the source behavior to satisfy the ADTs.

### Discussion — base distress clears nova-hit damage (C-027)

A base's calculated nova damage is awarded before any distress notice. When
the base begins at strength 100, creating that notice clears the historical
hit-damage field. The subsequent nova-hit report then shows zero rather than
the calculated damage. A base below full strength skips the distress notice
and retains the calculated amount for its hit report. Actual strength loss
uses its separate rule in either case.

For a full-strength enemy base with damage roll 1 and strength roll 100, the
player receives 200.1 pending BASE_DAMAGE points and the base falls to strength
80 before displacement, but its local nova-hit report shows zero damage.
This remains true even if the distress notice has no recipients: attempting
to create it still clears the field. Preserving the calculated damage across
the distress notice would make the report match the award but change visible
behavior. C-027 leaves that choice open; scoring and strength loss do not need
to be changed to correct the report.

### Examples

- A ship with raised strength-100 shields has blast factor 25. A hull roll
  of 1 gives 200.1 damage; an energy sample of zero loses no energy, but the
  hull still takes the entire hit.
- A strength-100 base with damage roll 1 and strength roll 100 has calculated
  damage 200.1 and loses 20 strength points, leaving strength 80 before
  displacement. Its historical zero-damage report is discussed above.
- Planets at construction 2, 3 and 4 are respectively destroyed, reduced to
  zero, and reduced to one. Only the destroyed planet incurs the penalty.

> Reviewer note — remaining nova semantics: The propagation-limit decision,
> Romulan nova effects, notification recipients, docking consequences
> and state-write precision remain unfinished. The direct faction kill award
> above is distinct from ordinary weapon scoring and must not be merged into
> pending player awards. These per-target rules alone do not define a complete
> star-destruction operation.

The target-specific nova effects above determine what happens to one object.
Propagation determines which additional objects are visited and in what order,
so that a chain of explosions has a reproducible meaning.

## 6.7. Nova propagation

A torpedo that triggers a nova removes the struck star and begins a chain
reaction at that position. Each explosion first selects neighboring stars and
target positions, then applies damage to those targets, then proceeds to the
most recently selected star whose explosion has not yet been processed.
This order is observable; the explosions are not simultaneous.

Each planet or base removal checks and, if terminal, latches the war outcome
under Section 9.4. The chain continues through its remaining targets and
explosions. Later losses cannot revise the result; reporting and release await
the containing command's exit boundary or the end of an independent activity.

For each explosion:

1. Enumerate its neighboring sectors within the galaxy by increasing vertical
   coordinate, then increasing horizontal coordinate. The center has already
   lost its star. Record each ship, base, planet or Romulan position encountered
   and its offset from the explosion. Empty sectors and black holes are ignored.
2. For each neighboring star, select it with probability 4/5. When selected,
   remove it immediately and append its position to the ordered list of pending
   explosions. It no longer blocks movement or displacement, even though its
   explosion has not yet been processed. A star not selected remains and may
   be considered again by a later neighboring explosion.
3. Visit the recorded target positions in reverse enumeration order. Read the
   current occupant of each position, not a saved object reference. If it is
   still a ship, base, planet or Romulan, apply the corresponding nova damage
   with the recorded offset. Otherwise skip that position. Complete that
   target's damage, displacement and hit-report construction before proceeding
   to the next recorded position.
4. If no explosions remain pending, finish the chain. Otherwise remove the
   last pending position, announce its explosion, apply its star-destruction
   penalty, and repeat from step 1 at that position.

For a player-triggered chain, each exploding star subtracts 50 pending
`STAR_DESTRUCTION` points. The initially struck star incurs this penalty once,
before the first neighborhood is processed. A selected star incurs it when
its pending explosion is processed, not again when it is removed. A chain
does not create additional player turns.

### Ordering example

Suppose an explosion selects stars A and then B, and records targets X and
then Y. Both stars are removed before Y receives damage. Damage is applied to
Y and then to the current occupant of X's recorded position. B explodes next.
If B selects C, C explodes before A. With no further selections, the explosion
order is the initial star, B, C, A, for a total penalty of 200 points.

> Reviewer note — propagation limit (C-019): The historical behavior declines
> further star selections while 29 explosions are pending. This is a pending
> count, not a limit of 29 stars over the whole chain. The ordering above is
> specified for chains that do not reach this boundary; whether to retain the
> limit as a game rule or remove it as a storage artifact awaits review.
> Romulan nova effects and complete output remain separate unfinished work.

Destruction or conversion of a port can leave other ships' stored docking state
out of step with the new galaxy. The final section records that cross-object
check and its historical alternatives.

## 6.8. Docking after port loss — under review

Docked status is stored on a ship; it is not automatically derived from
adjacency on every read. The historical port-loss check has the following
observable behavior, retained here pending C-021:

1. Consider every docked ship of the affected faction.
2. If any active friendly base is adjacent, leave that ship unchanged.
3. If the faction owns no planets anywhere in the galaxy, also leave the ship
   unchanged, even if it has no adjacent port.
4. Otherwise, if any friendly planet is adjacent, leave the ship unchanged.
5. If neither adjacency test succeeds, set `Ship.docked` to `false` and
   `Ship.condition` to `RED`.

Adjacency means Chebyshev distance at most one. This check emits no separate
undocking message and does not itself replenish or repair anything. It scans
the faction's docked ships, not only ships next to the lost port.

The trigger's ordering changes what this check can see:

- A planet captured from another faction invokes the check for the former
  faction **before** changing ownership. The captured planet can therefore
  preserve a nearby former owner's docked status during that check. There
  is no second check after the transfer in this capture operation.
- Planet destruction removes occupancy and reduces the faction's planet count
  before checking. Destruction of the last friendly planet takes step 3's
  no-planets branch rather than undocking unsupported ships.
- Base destruction checks with the destroyed base's nonpositive strength, so
  that base no longer qualifies in step 2. The no-planets exception still
  applies. Surviving base displacement by a nova does not itself invoke this
  port-loss check.

For example, a docked ship whose sole adjacent base is destroyed remains
docked if its faction owns no planets. If its faction instead owns one distant
planet, the same loss sets it undocked and RED. This distinction can affect
life-support reserve consumption and later docked command behavior.

> Reviewer note — C-021: These are evidenced exceptions, not a proposed general
> docking principle. A simpler rule would recheck support after every port
> removal, ownership change or displacement and undock any ship without an
> adjacent friendly port. That changes observable behavior and awaits a user
> decision; do not silently infer it from geometric adjacency.
