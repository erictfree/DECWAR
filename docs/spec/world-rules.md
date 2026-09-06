# Shared world rules

Commands refer to these operations when their effects involve paths, weapons or
installations. The chapter is being extended; unresolved interactions are stated
at their point of use.

## Random choices in semantic rules

### Values and probabilities

Random choices are inputs to game operations. Their mathematical distributions
are:

```text
UnitDraw(): real uniformly distributed in [0,1)
IntegerDraw(n: positive integer): integer uniformly distributed in 1..n
Choice(values: nonempty ordered collection): one uniformly selected member
```

For UnitDraw, the probability of an interval `[a,b)` contained in `[0,1)` is
b-a. IntegerDraw(n) assigns probability 1/n to each permitted integer. Choice
assigns equal probability to each position in its collection; Choice(Device)
therefore selects each of the nine devices with probability 1/9. Zero is a
valid unit-draw value but not a valid IntegerDraw result. One is not a valid
unit-draw result. A boundary example may supply a particular real value even
though a single value has zero probability in the continuous model.

Each separate draw is independent in this mathematical model. Reusing a value
already drawn preserves that value and its dependencies; it does not make
another draw. Thus a shared weapon formula that uses its b twice uses the same
b both times. A conditional effect uses its declared draw only when that branch
requires it. No rule promises a fixed number of successes in a short sequence.

The random-source binding supplies reproducible pseudorandom realizations of
these distributions. It identifies its algorithm, version, finite precision and
initialization policy; these are not game commands or prescribed data structures.
The probability model does not require a specific generator or seed encoding,
and finite samples need not have exactly the expected frequencies. Selecting
only one permitted outcome every time does not implement a uniform distribution.

The rules distinguish discrete choices from continuous arithmetic. Device
selection is discrete; damage and shield strength retain fractions. Only draws
explicitly specified by a semantic clause belong to its random-event sequence.
An early draw required by that clause remains part of the sequence even if a
later cancellation leaves its value unused.

### Choice order and ownership

The chapter or command containing a draw establishes its place among state
changes and observations. Nested operations consume their choices when invoked,
before the caller resumes. A failed or cancelled command can already have used
random input; cancellation does not restore earlier choices or effects.

The performing captain identifies the random context. Shared damage,
installation defense, nova chains and autonomous Romulan activity invoked by a
captain's action inherit that captain's context. The Romulan's persistent score
is not a separate random context. Creating a galaxy and placing its initial
objects uses the creating captain's context; later admissions have their own
initializations. This describes random-event ownership, without prescribing
where a generator is stored or how concurrent execution is scheduled.

A reproducibility record can describe random input with the following values:

```text
type RandomRequest = UnitRequest | IntegerRequest { count: positive integer }
              | ChoiceRequest { count: positive integer }
type RandomValue = UnitValue { value: UnitDraw } | IndexValue { value: positive integer }

type RandomEvent = {
    captain: CaptainId;
    request: RandomRequest;
    value: RandomValue;
};
```

UnitRequest requires UnitValue. An IntegerRequest { count: n } or ChoiceRequest { count: n } requires
an IndexValue in 1..n; the latter chooses that position in the stated ordered
collection. The event must match the request reached by the operation. Supplying
an index outside its domain or a value for the wrong request is an invalid
replay input, not a new game outcome. No particular record serialization is
required. Random events do not replace player input, clock observations or
shared-world events in a complete replay.

The generalized rules specify their choice sequence explicitly. An otherwise
unspecified calculation is not an extra required draw merely because a former
implementation performed it. Implementations using the same binding must follow the declared
sequence to obtain that binding's reproducible results. A differently grouped
set of independent draws can have the same distribution while failing an
advertised deterministic replay contract.

### Replay matching

```text
enum RandomReplayError = EVENTS_EXHAUSTED | CAPTAIN_MISMATCH
                      | REQUEST_MISMATCH | VALUE_MISMATCH

type RandomReplayStep = {
    value: RandomValue;
    remaining: List<RandomEvent>;
};

query TakeRandomEvent(events: List<RandomEvent>, captain: CaptainId,
                      request: RandomRequest): Result<RandomReplayStep, RandomReplayError>
```

This query checks a recorded random input against the next request reached by
a semantic operation. It describes replay validation, not another game command
or an error that a captain encounters while playing. Check in this order:

1. If events is empty, reject EVENTS_EXHAUSTED.
2. Compare the first event's captain with the performing captain. If they
   differ, reject CAPTAIN_MISMATCH.
3. Compare its request with the reached request, including the request kind
   and count. If they differ, reject REQUEST_MISMATCH.
4. Require UnitValue for UnitRequest, or IndexValue in 1..count for IntegerRequest
   and ChoiceRequest. Otherwise reject VALUE_MISMATCH.
5. Return the first event's value and the remaining events in their original
   order. The query leaves its supplied values and all game state unchanged.

A serialized record must first satisfy the declared value types. For example,
UnitValue containing 1 is invalid before it can be a typed RandomEvent. None of
these failures permits wrapping an index, clamping a value, scanning ahead for
a matching event, assigning the event to another captain, or drawing a fresh
replacement. Validation stops at the first mismatch; later behavior has not
been reproduced by that record.

Reusing a previously selected value consumes no new event. Reaching a draw and
then cancelling still uses its event. At the declared end of a complete replay,
all supplied random events must have been consumed. A record of only a prefix
must identify its endpoint and claim that prefix, rather than treating unused
events as evidence of a complete match.

For Choice, matching the count does not establish matching members or their
order. The operation's state and inputs must determine the same ordered
collection; index 2 means its second member. Likewise this random record alone
does not establish equal command input, clock observations, scheduling or
external events. These remain requirements of the complete replay context.

### Finite random-source bindings

The probabilities above describe the mathematical game model. A finite source
cannot assign that continuous distribution to finitely many unit values exactly.
A binding must distinguish its realizable distribution from the ideal model.
In addition to algorithm, version and initialization, document:

- The attainable unit values and the probabilities or discretization rule
  assigned to them, including treatment of interval endpoints.
- How a request for 1..n is mapped to its outcomes, including any rejected
  primitive samples and the assumptions under which those outcomes are uniform.
- How random contexts are initialized and advanced, and which retained input
  and environment values are needed to repeat that initialization.
- The precision or distribution qualifications attached to the conformance
  claim. This draft does not invent a universal numerical tolerance.

Internal sampling used to realize one request is part of the binding; it does
not create additional game-level RandomEvents. For example, rejecting a primitive
sample while obtaining IntegerDraw(n) does not represent another torpedo or
another device selection. A repeatability claim must nevertheless use the same
binding's advancement rules. Modifying those rules can change later choices.

A seed and a finite successful transcript establish repeatability only within
their stated context. They do not prove uniformity or independence. Repeatedly
choosing one outcome is still incompatible with the declared uniform-choice
model; calling it a finite approximation does not waive the distribution
requirement. Assess mapping/discretization claims separately from replay matches,
and state any approximation explicitly rather than claiming exact continuous
sampling.

### Derived game probabilities

The following consequences illustrate the declared distributions. Conditional
probabilities apply only after the command reaches the corresponding branch;
they are not independent replacement rolls for the complete action.

| Event | Meaning | Probability |
| --- | --- | --- |
| Warp speed risk | Overheating at warp five, after reaching that speed-risk test. | 1/10 |
| Warp speed risk | Overheating at warp six, after reaching that speed-risk test. | 1/5 |
| Torpedo misfire | A launched shot's IntegerDraw(100) exceeds 96. | 1/25 |
| Tube damage | A player misfire's further IntegerDraw(5) equals five. | 1/5 given misfire |
| Star hit | A torpedo's struck star begins a nova on a draw at most 80. | 4/5 |
| Chain selection | A neighboring star is selected, when pending capacity permits. | 4/5 |
| Planet hit | An accepted torpedo planet update subtracts one build. | 1/4 |
| Critical device | A reached ship-critical branch chooses a particular device. | 1/9 |
| Base emergency | A sufficiently large base hit takes its early emergency branch. | 1/5 |
| Base destruction | A base emergency's random test destroys it even if strength remains positive. | 1/10 |
| Romulan displacement | A surviving Romulan struck by a player torpedo attempts displacement. | 3/10 |

Torpedo maximum path lengths 7, 8, 9 and 10 have probabilities 1/8, 1/2, 1/4
and 1/8 respectively. These are path limits, not guarantees of distance traveled:
an earlier obstruction can end the path. A misfired shot still receives a path
limit and can hit something. Player tube damage has unconditional probability
1/125 per shot that reaches the misfire check; a burst that stopped earlier
has no further shots on which to apply that probability.

A nova's ship/base damage H has 1000 equally likely values from `8*d+0.1`
through `8*d+100`, separated by 0.1 damage unit. Conditional on H, ship energy
loss is uniform from zero inclusive to H exclusive. Conditional on severity d,
each device increment is uniform from zero inclusive to 4*d exclusive.
The shield-device increment can change whether a later shield-strength draw
occurs, as defined by NovaImpact.

A Romulan torpedo hit's damage is not uniform across 0.1 through 200 units.
Each value 0.1, 0.2, ..., 199.9 has probability 1/4000; damage 200 has probability
2001/4000 because every integer draw from 2000 through 4000 gives that value.
Phaser attenuation, critical tests and shield deflection likewise use their
stated formulas; they are not replaced by a uniform damage interval.

Romulan target ties are sequential comparisons. If all four candidate groups
have equally distant winners, their selection probabilities in group order are
1/8, 1/8, 1/4 and 1/2. Equal distance within a group retains its first eligible
member. Neither level of selection chooses uniformly among every tied object.

### Initial galaxies and tournament keys

The galaxy-creation formulas choose each of the 51 star counts, 100 through
350 in steps of five, with probability 1/51. Each of the 41 potential black-hole
counts, 10 through 50, has probability 1/41. Choose the star count first, then
the potential black-hole count even if holes are later declined.

Placement attempts choose vertical then horizontal coordinates independently
from 1 through 75. Rejecting a sector repeats both choices. For a fixed nonempty
eligible set this gives a uniform distribution over that set. There is no
fixed retry count or finite-time success promise; with unchanged eligibility
the probability of eventual success is one. Changing occupancy or eligibility
can change this conditional distribution under multiplayer ordering.

REGULAR creation uses the environment's ordinary random initialization. A
nonempty TOURNAMENT key selects a repeatable initialization within the declared
random-source binding. Keys are the retained, case-transformed token text;
they are not parsed as numeric seeds. Two inputs with the same retained key
select the same initialization in that binding. Distinct keys need not guarantee
distinct galaxies. An empty key is accepted and uses ordinary initialization,
without the nonempty-key reproducibility promise.

The same nonempty key, binding version, creation options and ordered creation
inputs reproduce the initial galaxy. A key alone does not reproduce an entire
multiplayer game: later captains' random initializations, commands, clock
observations and shared-event ordering also matter. Two independent bindings
need not map the same key to the same galaxy. Cross-implementation replay instead
supplies the same random events and other semantic inputs for every operation
within the completed contract.

**OPEN QUESTION:** Complete control and multiplayer event ordering, and acceptance criteria
for finite-precision random-source bindings, remain part of the conformance and
environment work. These gaps do not permit changing the stated game odds.

**Source basis:** [random interfaces](../../legacy/utexas/WARMAC.MAC#L2285),
[initialization and populations](../../legacy/utexas/SETUP.FOR#L169),
[placement](../../legacy/utexas/DECWAR.FOR#L2765),
[weapon branches](../../legacy/utexas/DECWAR.FOR#L4089),
[Romulan targeting](../../legacy/utexas/DECWAR.FOR#L836),
[nova effects](../../legacy/utexas/DECWAR.FOR#L2259).

## Sector paths

### Operation and result types

```text
type PathObstruction = {
    position: Position;
    object: SectorObject;
};

type PathResult = {
    lastClear: Position;
    step: SectorVector;
    obstruction: Optional<PathObstruction>;
};

operation TracePath(start: Position, displacement: SectorVector,
                    steps: integer, deflection: real): PathResult
```

The displacement must be nonzero, its components must be whole numbers of
sectors, and steps must be nonnegative. This operation
observes sector contents and uses the random inputs stated below; it does not
move objects, charge energy or complete a turn. The result's lastClear is the
last fully traversable sector. Its step supplies the direction used by towing
or blast displacement. An obstruction identifies both the encountered object
and its position; none means no object collision was found. The intended endpoint
determines direction; a torpedo can continue beyond that endpoint when its
allowed step count is greater. The starting sector is not probed. lastClear
initially equals start, even when the first step is blocked or steps is zero.

### Geometric meaning

Choose the axis of greatest absolute displacement as the dominant axis. A tie
chooses vertical. The dominant step is +1 or -1. The other step is its intended
displacement divided by the absolute dominant displacement, plus deflection.
The running position begins at the start; its nondominant coordinate can be
fractional.
In the algorithm, running is a GridPoint. The words dominant and nondominant
select its vertical or horizontal component according to the axis choice above;
they are not additional record fields. In a copy-with expression, nondominant
therefore replaces that selected coordinate. A candidate whose two coordinates are
whole and inside the galaxy is used as a Position in a sector query.

For a running nondominant coordinate c, define candidate sectors as follows:

```text
function PathCandidates(c: real): List<integer> {
    let fraction: real = c - floor(c);
    if (abs(fraction - 0.5) < 0.1) {
        return [floor(c), floor(c) + 1];
    }
    return [floor(c + 0.5)];
}
```

This is a geometric rule: near the boundary between two sector centers, both
sectors can obstruct the path. Sector selection requires whole coordinates;
damage and other continuous game quantities do not inherit this rounding.

```text
operation TracePath(start: Position, displacement: SectorVector,
                    steps: integer, deflection: real): PathResult {
    requires displacement != SectorVector { vertical: 0, horizontal: 0 };
    requires both displacement components are whole numbers of sectors;
    requires steps >= 0;

    let step: SectorVector = dominant and nondominant steps defined above;
    let running: GridPoint = GridPoint {
        vertical: start.vertical, horizontal: start.horizontal
    };
    let lastClear: Position = start;

    for (let i: integer = 1; i <= steps; i += 1) {
        running = running + step;
        if (dominant coordinate is outside 1..75) {
            return PathResult {
                lastClear: lastClear, step: step, obstruction: none
            };
        }
        let candidates: List<integer> = PathCandidates(running.nondominant);
        for (candidate in candidates) {
            let position = running with { nondominant: candidate };
            if (position is outside the galaxy) {
                return PathResult {
                    lastClear: lastClear, step: step, obstruction: none
                };
            }
            let object: Optional<SectorObject> = sector(game, position);
            if (object != none) {
                let obstruction = PathObstruction {
                    position: position, object: object
                };
                return PathResult {
                    lastClear: lastClear, step: step, obstruction: obstruction
                };
            }
        }
        let selected: integer;
        if (count(candidates) == 2) {
            selected = floor(running.nondominant + UnitDraw());
        } else {
            selected = candidates[1];
        }
        lastClear = running with { nondominant: selected };
    }
    return PathResult { lastClear: lastClear, step: step, obstruction: none };
}
```

The list notation here uses the first candidate as `candidates[1]`. Ordinary
ships, bases, planets, stars, the Romulan and black holes block a trace. Empty
sectors do not. The sector query includes temporary interaction kinds under
the session rules. An obstruction on the second candidate still leaves
`lastClear` at the previous step; passing the first candidate does not complete
half a step.

Leaving the galaxy stops at the last clear sector without reporting an object
collision. Probe order and obstruction timing are part of the rule, not a
permission to choose any straight-line grid traversal.

**OPEN QUESTION:** The resolution of concurrent changes between probes and subsequent
movement or impact is still being specified. A result does not reserve its
clear sectors or guarantee that the encountered object remains present.

**Source basis:** [CHECK and CHKPNT](../../legacy/utexas/DECWAR.FOR#L699).

## Tractor associations

### Release

```text
operation ReleaseTractorBeam(beam: TractorBeamId): Released
```

The beam must identify an established association. Let b be
`tractorBeam(game, beam)` and w be `world(game)`. The release event satisfies:

```text
ensures after(w.beams) == before(w.beams) minus {b};
for (each endpoint in b.endpoints) {
    ensures after(ship(game, endpoint).tractorBeam) == none;
}
```

After removing the association and clearing both endpoint references, publish
TractorEvent { value: BROKEN } to the two former endpoints under the combat-notice
rules. The outcome is Released. Publication does not promise immediate display;
later reception does not change the released association again. Neither endpoint's position, energy, shields, device damage, docking,
condition nor stardate changes. Release has no turn completion of its own.
Commands and combat rules specify when they invoke it; TRACTOR OFF with no beam
is handled by the command and does not invoke this operation.

### Following a moving endpoint

```text
operation FollowTractorBeam(moving: ShipId, step: SectorVector): Followed { partner: ShipId, position: Position }
```

After a ship actually changes sector while associated with a beam, the other
endpoint follows. The moving ship must still have an established beam. Let s be
`ship(game, moving)`. Its optional tractorBeam value is present; let beamId be
that contained TractorBeamId and let b be `tractorBeam(game, beamId)`. Let r be
`ship(game, partner)`, where partner is the other member of b.endpoints. The
position values used below must be present. The step is the PathResult.step of
that movement.
Define the trailing sector:

```text
trailing.vertical   = floor(s.position.vertical - step.vertical)
trailing.horizontal = floor(s.position.horizontal - step.horizontal)
```

When trailing is inside the galaxy and empty or already occupied by r, following
has `after(r.position) == trailing`. Its former sector becomes empty if it
differs from trailing, and trailing contains PlayerShip { id: r.id }. Both the position
and the sector query then describe that one location. The outcome is
Followed { partner: r.id, position: trailing }. If the moving endpoint did not change sector, the
command does not invoke following and the partner stays in place.

The other endpoint's energy, condition and docking state are not directly changed
by following. Shield and device state, beam membership and stardate are likewise
unchanged. No separate following notification or turn is added. Either endpoint
can issue a movement command; the beam has no permanent towing endpoint.

**OPEN QUESTION:** The generalized outcome when the resulting trailing sector is occupied
by a different object or outside the galaxy remains unresolved. Concurrent
relocation and the interaction with temporary information activities also need
their full contracts. No collision damage or alternative safe placement is
introduced by this draft.

**Source basis:** [TRCOFF](../../legacy/utexas/DECWAR.FOR#L4504),
[following movement](../../legacy/utexas/DECWAR.FOR#L2227).

## Weapon damage to ships and bases

### Operation and value types

CriticalHit, DisplacementResult and DestructionCause are defined with the
[combat observation values](language-model.md#combat-observation-and-notice-values).

```text
type DamageTarget = ShipBody { ship: ShipId } | BaseBody { base: BaseId }
type InstallationOrigin = BaseOrigin { base: BaseId }
                        | PlanetOrigin { planet: PlanetId, owner: Optional<Team> }
type AttackSource = PlayerAttack { ship: ShipId } | RomulanAttack
                  | InstallationAttack { origin: InstallationOrigin }

enum ImpactWeapon = PHASER | TORPEDO
type TargetDefense = ShipDefense { mode: ShieldMode, strength: Percentage }
                   | BaseDefense { strength: Percentage }

type WeaponHit = {
    target: DamageTarget;
    weapon: ImpactWeapon;
    damage: Damage;
    critical: Optional<CriticalHit>;
    deflected: Boolean;
    defense: TargetDefense;
    displacement: DisplacementResult;
    destruction: Optional<DestructionCause>;
};

type TorpedoHitOutcome = Applied { hit: WeaponHit } | TargetAlreadyFatal

operation PhaserHit(source: AttackSource, target: DamageTarget,
                    strength: real, distance: nonnegative integer): WeaponHit

operation TorpedoHit(source: AttackSource, target: DamageTarget,
                     step: SectorVector): TorpedoHitOutcome
```

DamageTarget selects either a ship's state or a base's state by identity.
The target has a recorded position. The source identifies the origin of this
attack; it does not change the target's faction. PlanetOrigin includes the
owner at firing, which can differ from its current owner during capture.
Installation attacks do not automatically receive the player weapon command's
energy costs, damage penalties, deadlines or score-accounting policy.

strength is the nonnegative phaser-strength quantity supplied by the invoking
rule. distance is that rule's selected distance; these operations do not
perform command grammar, faction or range validation. They do not wait for
weapon readiness or complete a turn. A source ship's device state is consulted
only where the damage formula below requires it.

WeaponHit describes a single impact. Initially critical
and destruction are absent, deflected is false, and displacement is Stayed.
damage is the ordinary reported hit damage after any critical adjustment;
DeviceCritical separately records the device and damage added to it. BaseCritical
identifies a critical hit on a base.
Deflection has zero reported damage and no critical hit.

defense contains a ship's shield mode and strength after damage, or a base's
strength when its hit is resolved. In the base case that observation precedes
the final destruction cleanup: it can be nonpositive even though the destroyed
base's stored strength is subsequently zero. Do not replace this observation
with a later query of the base. Swallowed identifies the black-hole destination,
distinct from the destroyed object's last occupied position.

The firing or defense rule uses this result to select recipients and emit hit
notifications. Distress and destruction announcements, tractor release and
installation-owned score updates remain the caller's stated effects. Returning
a result does not itself deliver a radio message or choose an audience.

The firing command supplies an attacker, target and weapon parameters.
The phaser calculation also serves installation defense. In the following formulas,
H is damage measured in damage units; S is shield or base strength measured in
percentage points, so 100 denotes full strength. These local numbers stand for
the named game quantities.

### Phaser impact

Draw b and c with `UnitDraw()`. Let `F = (0.9 + 0.02*c)^distance`. For
PlayerAttack { ship: attacker }, let s be ship(game, attacker). If either
s.devices[PHASERS].damage or s.devices[COMPUTER].damage is positive, multiply
F by 0.8. InstallationAttack and RomulanAttack do not receive this reduction.

For a ship with shields down, `H = 8*F*firingStrength`; shield strength does not
change. For a shielded ship or base, use its strength before this attack:

```text
H = 4 * F * firingStrength * (1 - S/100)
newStrength = S - 0.03 *
    (4 * F * firingStrength * max(S/100, 0.1) + 1)
```

Set a ship's shield strength to `max(0, newStrength)` percentage points. Set a
base's strength to `newStrength` percentage points; the base resolution below
handles nonpositive strength. Then resolve H using the following rules.
Return WeaponHit with weapon PHASER and displacement Stayed. PhaserHit has no
initial already-fatal-resource test; callers must not infer the torpedo guard
below for phasers or assume that repeating an impact is idempotent.

### Torpedo impact

TorpedoHit returns TargetAlreadyFatal for a ship whose energy is already nonpositive or whose
hull damage is already at least 2500 units, or a base whose strength is already
nonpositive. This return precedes random draws and leaves damage, position,
score and defense state unchanged; it supplies no WeaponHit. Otherwise draw a,
b and c with `UnitDraw()` and let
`rawDamage = 400 + 400*c` damage units. These three draws occur in the
order a, b, c before testing deflection. All three are consumed even when the
hit is deflected or the target has shields down.

For a ship with shields down, set H to rawDamage and leave shield strength
unchanged. For a shielded ship or a base, first test deflection using its current S:

```text
if (b - (S/100)*a + 0.1 <= 0) {
    H = 0;
    strength = max(0, S - 5*b) percentage points;
    result.deflected = true;
} else {
    H = rawDamage * (1 - S/100);
    strength = S - 0.03 * (rawDamage * max(S/100, 0.1) + 1);
    if (target is a ship) {
        strength = max(0, strength);
    }
}
```

A deflected hit skips critical damage and ordinary hull, energy and base-strength
damage. It still lowers exhausted shields, sets a ship's condition red, and
attempts to displace a surviving ship. A hit that was not deflected applies the
critical, ordinary-damage and score rules below, using b from this impact.
Set result.deflected true on the deflection path and result.weapon to TORPEDO
on both paths. Return Applied { hit: result } when this impact has been resolved.

After damage, a surviving ship is displaced along the torpedo's trace step.
Destruction by that displacement earns the same 500-point ship kill credit.
An ordinary torpedo hit does not displace a base. The firing command releases
the victim's tractor beam after the hit notification, including a deflected hit.

### Critical ship damage

For ShipBody { ship: id }, target in the following equations means ship(game, id).
If `H*(b+0.1) >= 170`, a ship takes a critical hit:

```text
criticalDamage = H / 2;
device = Choice(Device);
target.devices[device].damage += criticalDamage damage units;
if (device == SHIELDS) {
    target.shields.mode = DOWN;
}
H = criticalDamage + 100 * (UnitDraw() - 0.5);
```

Set result.critical to DeviceCritical { device: device, damage: criticalDamage }. This field records
the amount added to the selected DeviceState; result.damage is the adjusted H.
The critical-damage report names the device and the damage added to it. H after
the final adjustment is the ordinary hit damage reported and applied to hull
and engine energy. An attack that does not meet the critical condition leaves
device damage unchanged.

```text
operation ApplyShipHit(source: AttackSource, targetId: ShipId, H: Damage): Survived | Destroyed {
    let target: Ship = ship(game, targetId);
    let amount: real = numerical value of H in damage units;
    target.hullDamage += amount damage units;
    target.energy -= amount energy units;
    if (target.shields.strength <= 0%) {
        target.shields.mode = DOWN;
    }
    apply eligible ordinary attack credit for H;
    target.condition = RED;
    if (target.hullDamage >= 2500 damage units or target.energy <= 0) {
        remove target's presence from the galaxy;
        target.commissioned = false;
        return Destroyed;
    }
    return Survived;
}
```

ApplyShipHit changes hull damage and energy by equal numerical amounts in their
respective units. It does not change the position record, device damage, docking,
tractor association or session phase. Its ordinary score effect uses
AddAttackCredit and the faction rules below, before setting condition and
testing destruction. Removing presence means the former
sector becomes empty; it is not a commission-release operation. The enclosing
impact records DIRECT_DAMAGE destruction on Destroyed and supplies its score
and notification effects. A torpedo with Survived next invokes Displace using
its supplied step; a Swallowed result records BLACK_HOLE destruction. A deflected
torpedo uses H zero for these ship effects and can still be displaced.

Set result.defense to ShipDefense { mode: target.shields.mode, strength: target.shields.strength }
after applying the damage. Displacement does not change either defense property.
Phaser damage does not displace the target. Shield-device damage by itself does
not invoke SHIELDS UP's validation rule; the critical-device selection and
strength rules above determine whether these hits lower shields.

### Base damage

```text
type BaseHitResolution = {
    creditedDamage: Damage;
    critical: Boolean;
    reportedStrength: Percentage;
    destroyed: Boolean;
};

operation ResolveBaseHit(source: AttackSource, targetId: BaseId,
                         H: Damage, b: UnitDraw): BaseHitResolution

operation RemoveWeaponDestroyedBase(source: AttackSource, targetId: BaseId): Destroyed
```

These operations follow the weapon's initial strength reduction. In the following
rules, base means base(game, targetId). ResolveBaseHit starts with creditedDamage
zero, critical false and destroyed false.

When `H*(b+0.1) >= 170`, draw `IntegerDraw(5)`. A result of 5 takes the critical
base path immediately; otherwise apply ordinary base damage. Below the threshold,
apply ordinary base damage without this choice.

Ordinary base damage subtracts `0.01*H` percentage points, with a floor of zero.
It sets creditedDamage to H and applies the eligible ordinary attack credit
through AddAttackCredit before testing the resulting strength. A positive strength result completes that hit with
reportedStrength equal to the resulting strength. Nonpositive strength takes
the critical base path, retaining that creditedDamage.

```text
// Critical base path
{
    critical = true;
    base.strength -= (5 + 10 * UnitDraw()) percentage points;
    reportedStrength = base.strength;
    let destructionChoice = IntegerDraw(10);
    destroyed = destructionChoice == 10 or base.strength <= 0%;
    if (destroyed) {
        RemoveWeaponDestroyedBase(source, base.id);
    }
}
```

The destruction choice is made after the strength loss, including when that
loss has already made strength nonpositive. Neither certainty of destruction
nor a previously nonpositive strength skips this choice.

Return BaseHitResolution with these four values. The enclosing impact retains
H as result.damage, records BaseCritical when critical is true, and records
DIRECT_DAMAGE destruction when destroyed is true. Its result.defense is
BaseDefense { strength: reportedStrength }, not a post-removal strength query.

The early critical path skips ordinary base damage and ordinary damage-score
credit. Its hit report still carries the originally calculated H. A destroyed
base has zero strength and no presence in its sector. On this weapon-damage path,
docking re-evaluation occurs before removing the base or setting its strength to
zero. RemoveWeaponDestroyedBase performs that docking re-evaluation for the
base's faction, subtracts one from world.baseCounts[base.team], removes the base's
sector presence and sets its strength to zero. Between the count change and
sector removal, it applies the 1000-point destruction credit through
AddAttackCredit. Its identity and position are
retained for reports and possible later reuse; it does not remove the base
identity from the fixed roster of installations or perform a world-end check.
Consequently, a base destroyed by the random critical outcome while still
at positive strength can itself preserve a nearby ship's docking at that step.
The firing command supplies the subsequent destruction notification.

### Score and result

```text
operation AddAttackCredit(source: AttackSource, category: ScoreCategory,
                          amount: Points): Credited | CallerAccounts
```

```text
AddAttackCredit(source, category, amount):
    match source:
        PlayerAttack { ship: id }:
            ship(game, id).pendingScore[category] += amount
            return Credited
        RomulanAttack:
            world(game).romulanActivity.score[category] += amount
            return Credited
        InstallationAttack { origin: origin }:
            return CallerAccounts
```

CallerAccounts changes neither score: the invoking installation rule determines
any owning-faction credit. This operation does not commit a player's pending
score or complete a turn.

For a PlayerAttack, ordinary H damage to an opposing ship contributes H
points to ENEMY_DAMAGE; ordinary H damage to an opposing base contributes H
points to BASE_DAMAGE. A same-faction target receives no ordinary damage credit
on this shared weapon path. RomulanAttack credits either faction's ships and
bases directly, in those same respective categories. BaseHitResolution's
creditedDamage identifies the ordinary amount before this faction test; the
resolution operation awards the eligible credit once. The early critical-base path has zero ordinary credit
even though the hit reports H. A deflection likewise supplies zero damage credit.

For PlayerAttack and RomulanAttack, destroying a ship adds 500 ENEMY_KILLS
points and destroying a base adds 1000 BASE_DAMAGE points. These kill bonuses
have no additional opposing-faction predicate in the shared operation; command
target checks occur separately. Ship destruction by torpedo displacement also
earns the 500-point bonus exactly once for this impact.

Ordinary damage credit occurs before the final ship condition/destruction and
displacement checks, or before the ordinary base path's destruction resolution.
Kill credit occurs on the destruction path. These effects are not rolled back
merely because the attacker later dies. No whole-impact atomicity or deferred
score transaction is implied by the result record.

For a ship, the enclosing impact applies the kill bonus after direct removal
or fatal displacement. For a base, RemoveWeaponDestroyedBase applies it at the
point defined above. Returning or reporting WeaponHit does not award it again.

An installation caller handles its owning faction's score separately from these
ship-fired credits. The returned hit describes damage, critical damage/device,
shield mode and strength after the hit, and destruction. Recipient selection
and rendering belong to the invoking command or defense rule.

**OPEN QUESTION:** The caller's report behavior after TargetAlreadyFatal, concurrent
target removal or replacement, interruptions between these effects and complete
hit-delivery ordering still require the multiplayer and terminal bindings.
TargetAlreadyFatal does not manufacture a new zero-damage hit notification.

**Source basis:** [PHADAM and shared damage](../../legacy/utexas/DECWAR.FOR#L4089),
[displayed score units](../../legacy/utexas/DECWAR.FOR#L2994).

## Damage to the Romulan

```text
type RomulanHit = {
    weapon: ImpactWeapon;
    damage: Damage;
    remainingEnergy: Energy;
    destroyed: Boolean;
};

operation RomulanPhaserHit(strength: real, distance: positive integer): RomulanHit

operation RomulanTorpedoHit(): RomulanHit
```

These operations require a present Romulan. Phaser strength is nonnegative;
distance must be positive because it is the divisor in this damage rule.
The source, recipients, score policy and any subsequent torpedo displacement
are supplied by the caller. Neither operation changes player resources,
weapon deadlines, stardates or score by itself.

The Romulan has its own energy-based damage rule. A phaser attack of strength p
at distance d reports damage
`(100 + IntegerDraw(100))*p/(100*d)` damage units. A torpedo reports
`min(IntegerDraw(4000), 2000)/10` damage units. Deduct that same numerical amount
in energy units from the Romulan. If energy becomes nonpositive, remove the
Romulan from the galaxy and record destruction in the result.

Set result.damage to the calculated damage and result.remainingEnergy to the
energy after subtraction, without flooring it to zero. result.weapon is PHASER
or TORPEDO as appropriate. Set result.destroyed when remainingEnergy is
nonpositive. On destruction, the former Romulan sector becomes empty and
world.romulan becomes absent. The result preserves the remaining-energy
observation even though no Romulan object can then be queried. Persistent
RomulanActivity counts, deadlines and accumulated score remain available.

For a player-fired weapon, add the reported damage in points to the pending
ROMULAN category, plus 500 points when the Romulan is destroyed. Installation
attackers credit their faction directly. For a surviving Romulan struck by a
player's torpedo, `IntegerDraw(10) > 7` attempts displacement along the trace
step. Destruction by that displacement also earns the 500-point bonus. Phaser
hits do not invoke that displacement.

The caller combines result.destroyed with a subsequent Swallowed displacement
to decide that single bonus. It does not call Displace on an already destroyed
Romulan. Installation-owned damage and kill credit likewise use result.damage
and result.destroyed once, according to the owning-faction rule.

**Source basis:** [PHAROM, TOROM and DEADRO](../../legacy/utexas/DECWAR.FOR#L3382),
[player phaser credit](../../legacy/utexas/DECWAR.FOR#L2711).

## Blast displacement

```text
type DisplacementTarget = DamageTarget | RomulanBody

operation Displace(target: DisplacementTarget, step: SectorVector): DisplacementResult
```

The target has a recorded position; for RomulanBody the Romulan must exist.
`Displace(target, step)` uses a direction step from a torpedo path or from an
exploding star to the affected sector. Compute the candidate by rounding each
coordinate of `target.position + step` down to a whole sector. If the candidate
is outside the galaxy, is not exactly one sector away in Chebyshev distance,
or contains an object other than a black hole, return Stayed without changing
the target or any sector. Here an empty sector is admissible: the occupied-sector
rejection applies to ships, bases, planets, stars and other non-black-hole objects.
Displace makes no random choice. It tests this one candidate only; it does not
search for an alternative empty sector, wrap at the galaxy boundary, or retry.
A blocked displacement leaves docking and condition unchanged.

For an empty candidate, move the target there and update its galaxy presence.
A displaced player ship becomes undocked and red. Displacement itself does not
charge energy, change shields, or release a tractor association.
Return Moved { position: candidate }. A base or Romulan changes its position and sector
presence without gaining a ship's docking or condition fields.

For a black hole, remove the target from its old sector without replacing the
black hole. A ship receives 2500 hull-damage units and ceases to be commissioned;
a base receives zero strength; the Romulan ceases to exist. Keep the target's
last occupied position distinct from that
reported destination. The caller performs its destruction scoring and notices.
Return Swallowed { position: candidate }. This result does not advance a turn or end a
captain's session. A ship swallowed by a black hole retains its other resource,
device, docking and condition values; in particular this branch does not apply
the undocking effect of displacement into an empty sector.

**Source basis:** [JUMP](../../legacy/utexas/DECWAR.FOR#L1283).

## Stellar explosions

### Operations and observations

A nova affects ships, bases, planets and the Romulan in the exploding star's
sector and its eight adjacent sectors, clipped to the galaxy. Friendly objects
receive nova damage too. Each chain retains its initiating attacker for scoring,
even if that attacker is destroyed during the chain.

```text
type NovaSource = PlayerNova { ship: ShipId } | RomulanNova
type NovaTarget = DamageTarget | RomulanBody | PlanetBody { planet: PlanetId }

type NovaContext = {
    source: NovaSource;
    viewer: CaptainId;
};

type NovaDefense = ShipAfterNova { mode: ShieldMode, strength: Percentage }
            | BaseAfterNova { strength: Percentage }
            | RomulanAfterNova { energy: Energy }
            | PlanetAfterNova { builds: nonnegative integer }

type NovaHit = {
    origin: Position;
    target: NovaTarget;
    position: Position;
    damage: Optional<Damage>;
    defense: NovaDefense;
    displacement: DisplacementResult;
    destruction: Optional<DestructionCause>;
};

type NovaImpactOutcome = Completed { hit: NovaHit }
                  | PlanetUpdateRefused | GalaxyEnded
type NovaChainOutcome = Completed | GalaxyEnded

operation NovaImpact(context: NovaContext, origin: Position,
                     target: NovaTarget, step: SectorVector): NovaImpactOutcome

operation ExplodeStar(context: NovaContext, origin: Position): NovaChainOutcome
```

DamageTarget, DisplacementResult and DestructionCause are the shared combat
types defined above. NovaDefense describes the target after the nova effect:
ship shield mode and strength, base strength, Romulan energy, or the nonnegative
planet build count shown in the report. It does not add new target properties.
NovaHit.position is the target's resulting or last occupied position. It is
separate from the black-hole destination carried by Swallowed.

NovaImpact requires the target currently present in its sector. The chain
supplies step as that sector's displacement from origin; each component is
-1, 0 or 1. Both can be zero for an object occupying an explosion's center.
A PlayerNova identifies the initiating ship, its faction and its pending score;
RomulanNova uses the persistent RomulanActivity score, even after the Romulan
has ceased to exist. The viewer identifies the session that observes any
world termination. It need not own the target or be the initiating attacker.

Each impact begins with displacement Stayed and no destruction. Its effects
and observations follow the target-specific clauses below. A NovaHit is an
observation of that impact, not a request to apply its damage or score again.
For ships and bases its damage is H as defined below. For the Romulan it is
zero: the energy change is described by RomulanAfterNova. For planets damage
is absent; the report identifies the remaining builds instead of a numerical
hit amount. Nova hits have no single critical-device observation; the ship
rule can damage all nine devices.

An impact publishes its hit to captains whose ships retain a recorded position
and captain association within distance ten of NovaHit.position. A ship just
destroyed by the impact remains eligible until commission release. No radio-on,
radio-damage or sender-gag test filters this nearby audience. Faction-wide base
notices additionally require the recipient radio to be on. Publication and
eventual terminal display are distinct. The report identifies the exploding star at
origin and the target at position. It indicates displacement for Moved or
Swallowed. Ship and Romulan destruction by a black hole identifies that cause;
a destroyed base is reported destroyed without a separate black-hole cause.
These presentation choices do not change the displacement outcome.

Neither operation acquires a player command, charges torpedo resources,
sets a weapon deadline or completes a turn. Those effects belong to its
invoking weapon operation. GalaxyEnded propagates immediately after its
world-termination effects, without executing the rest of the impact or chain.
Previously applied effects are not rolled back.

### Chain order

ExplodeStar requires a star at origin. Its caller has already announced and
charged for that initial star; the operation does not repeat those effects.
Remove the initial star and begin with no pending explosions.

For each explosion, inspect nearby sectors in increasing vertical coordinate,
then increasing horizontal coordinate. Record the positions of damageable
objects and their displacement vectors from this explosion. For each neighboring
star, IntegerDraw(5) other than five selects it to explode, provided fewer than
29 stars are already awaiting explosion. Remove a selected star at once and
append its position to the pending sequence. Black holes and empty sectors are
not damageable objects.

Resolve affected positions in reverse discovery order. At each position, query
the object currently there; an earlier hit may have moved or destroyed the
object originally observed. If it is damageable, invoke NovaImpact with its
current identity and the recorded displacement. Skip positions that are now
empty or contain a star or black hole. PlanetUpdateRefused leaves that planet
unaffected and continues with the next position. GalaxyEnded ends the chain.

When those positions are exhausted, take the last pending explosion, announce
it to the same nearby audience within ten sectors of that star, subtract 50
STAR_DESTRUCTION points from the player's pending score or the Romulan's own
score, and repeat. Return Completed when none remains pending.

The limit is on pending explosions, not the total number in a chain. Selection
and removal precede nearby damage; a sector vacated by a selected star can
therefore receive a displaced object before that explosion occurs. The center
participates in its own neighborhood, and an object there can be damaged again.
No chain-wide once-per-target exemption applies. Being killed does not itself
stop an initiator's chain; world termination does.

### Ship and base severity

Start with severity 100. Subtract a base's strength in percentage points, or a
ship's shield strength if its shields are up. If the result is less than 20,
replace it with 25; exactly 20 stays 20. Call the resulting number d.

For a ship, add `4*d*UnitDraw()` damage units to each of the nine devices in
device order. If shield-device damage then reaches 300 units, lower shields.
This lowering does not recompute d. For either a ship or a base, define:

```text
H = 8*d + IntegerDraw(1000)/10       // damage units
```

Before the remaining effects, credit H pending points to a player initiator
for an opposing target, or subtract H for a friendly target. The category is
ENEMY_DAMAGE for ships and BASE_DAMAGE for bases. A Romulan initiator receives
H directly in the corresponding category of its activity score. This credit
is independent of the subsequent ship-energy loss or base-strength change.

### Ship effect

Let s be the target ship. After severity, device damage and ordinary score:

```text
s.hullDamage += H damage units;
s.energy -= H * UnitDraw() energy units;
if (s.shields.mode == UP) {
    s.shields.strength = max(0,
        s.shields.strength - 30% + (IntegerDraw(100)/10)*1%);
}
if (s.shields.strength <= 0%) {
    s.shields.mode = DOWN;
}
if (s.hullDamage >= 2500 damage units or s.energy <= 0) {
    remove s from its sector;
    s.commissioned = false;
    destruction = DIRECT_DAMAGE;
} else {
    displacement = Displace(ShipBody { ship: s.id }, step);
    if (displacement is Swallowed) {
        destruction = BLACK_HOLE;
    }
}
```

A shield device made critical by this impact suppresses the later shield-strength
reduction and its draw, because shield mode is already DOWN. The device damage
and hull damage do not otherwise repair, undock or set the ship's condition.
Displace supplies the effects of successful movement or a black-hole encounter.
A survivor that cannot move therefore retains its prior docking and condition.

For either destruction cause, a player initiator's faction receives 500
ENEMY_KILLS points for an opposing ship, or loses 500 for a friendly ship.
This adjustment goes directly to that faction's committed total, without
changing the initiating ship's pending or committed kill score. A Romulan
initiator receives 500 directly in its own activity score.

Construct the NovaHit from s's current shield state and recorded position,
including damage H and the displacement/destruction results. Publish that hit,
then release the target's tractor beam if one remains attached. Return
Completed { hit: hit }. Destruction does not itself release the captain's session or
end the chain. The shared ApplyShipHit operation is not used here: the nova's
energy, condition and scoring effects are the ones in this clause.

### Base effect

Let b be the target base. After computing H and its ordinary damage credit,
a base whose strength is exactly 100% announces distress to its faction's
captains whose radios are on. Then:

```text
b.strength = max(0,
    b.strength - 30% + (IntegerDraw(100)/10)*1%);
if (b.strength > 0%) {
    displacement = Displace(BaseBody { base: b.id }, step);
}
```

If strength is now zero, mark destruction BLACK_HOLE when displacement is
Swallowed, otherwise DIRECT_DAMAGE. A player initiator receives 1000 pending
BASE_DAMAGE points for an opposing base or loses 1000 for a friendly base;
a Romulan initiator receives 1000 directly. Subtract one from the faction's
base count, then invoke ReevaluateDocking(b.team). This order is part of the
nova effect; it differs from ordinary weapon base destruction.

Construct the NovaHit with damage H, the base's strength and its recorded
position. Publish it before the final removal notice. For a destroyed base,
clear its remaining sector presence and announce destruction to its faction's
captains whose radios are on. Retain its base identity and recorded position,
and return Completed { hit: hit }. Destruction alone does not invoke CheckWorldEnd
here. The ordinary H credit applies whether or not distress was announced,
and independently of strength reduction and any destruction bonus.

### Romulan effect

The target Romulan must be present. Save its energy and position, then invoke
Displace(RomulanBody, step). If it survives, halve its energy and use the new
energy and position. If it is swallowed, retain the saved energy and last
occupied position for this impact's score and report.

A player initiator receives one tenth of this energy as pending ROMULAN points.
A Romulan initiator loses the same number from its activity score. Construct
and publish the NovaHit with zero damage, RomulanAfterNova of that energy,
and the displacement result. Destruction is BLACK_HOLE for Swallowed and
absent otherwise. A surviving Romulan at zero energy is not removed by an
additional nova-energy test.

After publishing a destruction hit, add a further 500 pending ROMULAN points
for a player initiator, or subtract 500 from a Romulan initiator's score.
Return Completed { hit: hit }. This order places the destruction bonus after the
hit publication, unlike the ship and base bonuses.

### Planet effect

Let p be the target planet. First obtain access for a shared planet update.
Failure returns PlanetUpdateRefused without damage, score, displacement or a
hit observation; it does not abort the remaining chain. The complete access
and interruption rules belong to the multiplayer contract.

Subtract three from p.builds. Construct a NovaHit with damage absent,
displacement Stayed, the planet's position, and PlanetAfterNova { builds: max(p.builds,0) }.
Destruction is DIRECT_DAMAGE if the new count is negative and absent otherwise.
Publish the hit before any destruction penalty or identity removal. A count
of exactly zero survives.

For a survivor, release the update and return Completed { hit: hit }. For destruction,
subtract 100 PLANET_DESTRUCTION points from the player's pending score or the
Romulan's score. Save the current ownership, clear the planet's sector, and
invoke RemovePlanet(context.viewer, p.id, savedOwner). If it ends the galaxy,
return GalaxyEnded. Otherwise release the update and return Completed { hit: hit }.

**OPEN QUESTION:** Full concurrent changes during neighborhood discovery, impact and
planet-update acquisition remain to be specified. These ordered effects do not
make the chain one indivisible action or introduce a random update-failure rate.

**Source basis:** [NOVA](../../legacy/utexas/DECWAR.FOR#L2259),
[SNOVA](../../legacy/utexas/DECWAR.FOR#L3807),
[combat report presentation](../../legacy/utexas/DECWAR.FOR#L2392).

## Installation changes and world termination

### Planet removal

```text
type PlanetRemovalOutcome = Removed | NoPlanet | GalaxyEnded

operation RemovePlanet(viewer: CaptainId, target: PlanetId,
                       formerOwner: Optional<Team>): PlanetRemovalOutcome
```

The caller supplies the ownership being removed; none means a neutral planet.
If target is absent from the planet collection, return NoPlanet without count,
docking or world-end effects. Otherwise, for a faction-owned planet, subtract
one from that faction's captured-planet count and invoke
ReevaluateDocking(formerOwner). The planet record still exists during this check.

Then remove the planet's identity from the collection and both factions'
knownPlanets sets. Preserve the identities, positions, builds, ownership,
discovery and relative report order of every surviving planet. Neutral-planet
removal changes neither faction's captured-planet count and performs no docking
re-evaluation. Invoke CheckWorldEnd(viewer) after identity removal. Its Ended
outcome gives GalaxyEnded; otherwise return Removed.

RemovePlanet does not itself change the removed planet's sector. A destroying
caller clears that sector first; BUILD replaces it with the new base only after
removal returns. The caller also owns planet-update access, destruction or
construction points, any discovery transfer to a new base, and command
completion. The removal operation adds no second report, score adjustment or
turn. These boundaries preserve the order in which an installation change can
be observed; they do not promise an indivisible conversion.

The world-end condition requires no remaining planets and at least one faction
with a zero maintained base count. Explicitly requesting world termination can
also end the world. CheckWorldEnd supplies the final outcome messages and
session effects in the [lifecycle chapter](session-rules.md#world-termination).

### Docking re-evaluation

Docking re-evaluation is invoked during installation loss or ownership changes.
Its operation is:

```text
operation ReevaluateDocking(team: Team): Completed
```

It visits that faction's docked ships in roster order. A nearby surviving friendly
base preserves docking when world.baseCounts[team] is positive. Otherwise, when
world.capturedPlanetCounts[team] is positive, a nearby friendly planet preserves
docking; if that search fails, set the
ship undocked and red. With a nonpositive captured-planet count, this operation
leaves docking unchanged. The command describes when this check occurs relative
to ownership and removal; the departing installation can still participate in
a check made before its removal.
The nearby test is distance at most one. Base candidates must have positive
strength; planet candidates use current ownership. The ship need not have its
commissioned flag set, but a docked ship must have a recorded position for these
tests. ReevaluateDocking does not change resources, scores, installation counts
or membership. With zero capturedPlanetCounts and no adjacent base, the ship
remains docked in that branch.

**OPEN QUESTION:** Full interleavings of base conversion, world termination and concurrent
installation changes remain under review. This chapter does not make the entire
sequence one indivisible action.

**Source basis:** [planet removal](../../legacy/utexas/DECWAR.FOR#L2864),
[docking re-evaluation](../../legacy/utexas/DECWAR.FOR#L339),
[world end](../../legacy/utexas/DECWAR.FOR#L961).
