# Commands and their meaning

This chapter uses the quantities and pseudocode notation of [the abstract
model](language-model.md) and the [shared world rules](world-rules.md).
The remaining command families are still being rewritten from the source analysis.

## SHIELDS

### Syntax

```text
ShieldsCommand ::= "SHIELDS" [ShieldAction]
ShieldAction   ::= "UP" | "DOWN" | "TRANSFER" [Integer]
```

Keywords admit the language's ordinary abbreviations. Missing or unrecognized
actions prompt for an action; an empty answer cancels. TRANSFER without an
integer amount prompts for one; a noninteger answer cancels. UP and DOWN ignore
trailing arguments. The production describes the command form; these continuation
and trailing-input rules are also part of its acceptance behavior.

### Raising shields

SHIELDS UP raises the acting ship's shields, charges 100 energy units, and releases
any tractor beam involving that ship. The energy charge applies even when the
shields were already up. Shield-device damage greater than 300 damage units
prevents the action; exactly 300 does not.

```text
RaiseShields(ship):
    if ship.devices[SHIELDS].damage > 300 damage units:
        reject ShieldsTooDamaged

    ship.shields.mode := UP
    ship.energy := max(0 energy units, ship.energy - 100 energy units)
    emit ShieldsRaised(ship)

    if ship.tractorBeam != none:
        ReleaseTractorBeam(ship.tractorBeam)

    if ship.energy == 0 energy units:
        emit NoEnergyRemaining(ship)
```

`ReleaseTractorBeam` is defined in the shared tractor-association rules.
This command does not advance the ship's stardate or trigger ordinary turn
accounting. Shield strength is unchanged.

### Lowering shields

```text
LowerShields(ship):
    ship.shields.mode := DOWN
    emit ShieldsLowered(ship)
```

There is no energy charge or stardate advance. Shield strength and an existing
tractor beam are unchanged.

### Energy transfer

Positive amounts transfer engine energy to shield strength; negative amounts
return shield energy to the engines. Twenty-five energy units correspond to one
percentage point of shield strength. Fractional increases are retained.

```text
TransferShieldEnergy(ship, requestedEnergy):
    transfer := min(requestedEnergy,
                    25 energy units * (100% - ship.shields.strength) / 1%)

    if transfer >= ship.energy:
        if captain does not confirm YES:
            emit ShieldTransferCancelled
            return

    transfer := max(transfer,
                    -25 energy units * ship.shields.strength / 1%)
    transfer := max(transfer, ship.energy - 5000 energy units)

    ship.shields.strength := ship.shields.strength
                            + (transfer / 25 energy units) * 1%
    ship.energy := ship.energy - transfer
    emit ShieldEnergyTransferred(ship, transfer)

    if ship.shields.strength <= 0%:
        ship.shields.mode := DOWN
    if ship.energy < 1000 energy units:
        ship.condition := YELLOW
    else:
        ship.condition := GREEN
```

The confirmation concerns the transfer after the shield-capacity limit but
before the later return-energy limits. Confirming does not cap the transfer at
available engine energy. A completed transfer can therefore exhaust the engines;
normal command-acquisition rules then apply. This operation does not advance the
ship’s stardate. The fractional arithmetic is the explicit normalization recorded
in [the numerical policy](NORMALIZATION.md), not a new transfer rate or capacity.

### Examples

| Initial state | Command | Result |
| --- | --- | --- |
| Shields down, shield damage zero, energy 800 units, no tractor beam | SHIELDS UP | Shields up; energy 700 units; shield strength and stardate unchanged. |
| Shields already up, shield damage zero, energy 800 units, no tractor beam | SHIELDS UP | Shields stay up; energy falls to 700 units. |
| Shield-device damage 300.1 units | SHIELDS UP | Rejected; no shield, energy or tractor-beam change. |
| Shields up | SHIELDS DOWN | Shields down; energy, shield strength and stardate unchanged. |

**Source basis:** [SHIELD](../../legacy/utexas/DECWAR.FOR#L3739).

## RADIO

### Syntax

```text
RadioCommand ::= "RADIO" [RadioAction]
RadioAction  ::= "ON" | "OFF"
               | "GAG" ShipName | "UNGAG" ShipName
```

A missing or unrecognized action prompts for an action; an empty answer cancels.
GAG and UNGAG can separately prompt for a ship name. Ship names follow the
ordinary first-match rule. Naming the acting ship causes no change.

### State changes

```text
RadioOn(captain):
    captain.radio.enabled := true
    emit RadioEnabled(captain)

RadioOff(captain):
    captain.radio.enabled := false
    emit RadioDisabled(captain)

Gag(captain, sender):
    if sender == captain.ship:
        return
    captain.radio.gaggedSenders := captain.radio.gaggedSenders union {sender}
    emit SenderGagged(captain, sender)

Ungag(captain, sender):
    if sender == captain.ship:
        return
    captain.radio.gaggedSenders := captain.radio.gaggedSenders minus {sender}
    emit SenderUngagged(captain, sender)
```

Gagging a sender does not turn the radio off, change teams, or prevent outgoing
messages. These actions cost no energy and do not advance the ship's stardate.
How these settings affect message acceptance and delivery belongs to the message
rules. The displayed confirmations belong to the response definitions.

**Source basis:** [RADIO](../../legacy/utexas/DECWAR.FOR#L3129).

## ENERGY

### Syntax and validation

```text
EnergyCommand ::= "ENERGY" [ShipName Integer]
```

The integer is the requested amount in energy units. If a name token followed
by an integer is missing, prompt for both together. An empty continuation cancels;
other responses that lack those two categories prompt again. Resolve the ship
name using roster order. An unknown name rejects the command. Unused trailing
arguments are ignored.

### State changes

Energy can be sent only to another commissioned ship on the same team, within
one sector. Ten percent of the transmitted energy is lost. The recipient's
5000-unit capacity limits how much is actually sent; the sender is charged only
for that transfer and its loss.

```text
TransferEnergy(sender, recipient, requested):
    if recipient.id == sender.id:
        reject CannotTransferToSelf
    if not recipient.commissioned:
        reject ShipNotInGame
    if recipient.team != sender.team:
        reject CannotTransferToEnemy
    if distance(sender.position, recipient.position) > 1:
        reject RecipientNotAdjacent
    if requested >= sender.energy:
        reject InsufficientEnergy
    if requested <= 0 energy units:
        reject AmountMustBePositive

    received := min(0.9 * requested,
                    5000 energy units - recipient.energy)
    charged := received / 0.9
    sender.energy := sender.energy - charged
    recipient.energy := recipient.energy + received
    emit EnergyTransferred(sender, recipient, received)
    notify recipient of EnergyReceived(sender, received)
```

The checks occur in the displayed order. Validation compares the requested
amount with the sender's energy before applying the recipient's capacity limit.
Requesting all remaining energy therefore fails even if the recipient has room
for only a small part of it. A recipient already at capacity produces a
successful zero-amount transfer, with no energy deducted.

There is no stardate advance, automatic repair or direct condition change.
Subsequent command acquisition may update condition from the new energy level.

**Source basis:** [ENERGY](../../legacy/utexas/DECWAR.FOR#L1009).

## DOCK

### Syntax

```text
DockCommand ::= "DOCK" ["STATUS" {StatusItem}]
```

STATUS is recognized only as the first argument. Its remaining arguments use
the STATUS report rules. Other arguments do not prevent docking and do not
request a report.

### Replenishment

Each surviving friendly base within one sector contributes two supply shares;
each friendly planet within one sector contributes one. With no shares the
command fails without replenishment or a turn. If the commission ends before
replenishment, the operation stops without these changes.

```text
ReplenishAtDock(ship, world):
    bases := surviving friendly bases within distance 1
    planets := friendly planets within distance 1
    shares := 2 * count(bases) + count(planets)
    if shares == 0:
        reject NoAdjacentFriendlyInstallation
    if not ship.commissioned:
        return

    ship.torpedoes := min(10, ship.torpedoes + 5 * shares)
    ship.energy := min(5000 energy units,
                       ship.energy + 500 energy units * shares)
    ship.shields.strength := min(100%,
                                ship.shields.strength + 10% * shares)
    hullRepair := 50 damage units * shares
    if ship.docked:
        hullRepair := 2 * hullRepair
    ship.hullDamage := max(0 damage units,
                           ship.hullDamage - hullRepair)
    ship.docked := true
    ship.lifeSupportReserve := 5
    ship.condition := GREEN
    emit Docked(ship)
```

Repeated docking repairs twice as much hull damage as docking from an undocked
state. Docking does not raise lowered shields. Device repair is separate from
this hull repair.

### Completion and time

At command entry, set a deadline to the current elapsed time plus
`(world.pacingClass + 1) * 1000 milliseconds`. After replenishment, emit the
optional STATUS report and record the remaining delay to that deadline.
Successful docking completes a turn with automatic device repair, as defined
in [turn completion](turns.md). That completion still occurs when reporting has
already used up the delay. Failure before replenishment does not complete a turn.

**Source basis:** [DOCK](../../legacy/utexas/DECWAR.FOR#L893),
[completion](../../legacy/utexas/DECWAR.FOR#L80).

## REPAIR

### Syntax and selected amount

```text
RepairCommand ::= "REPAIR" [Integer | "ALL"]
                  ["DAMAGE" {DeviceSelector}]
```

An integer requests that many damage units of repair to each device. ALL requests
the greatest current device damage. Without either, the request is 50 damage
units while undocked or 100 while docked. The amount never exceeds the greatest
current device damage. This command repairs devices, not hull damage.

DAMAGE requests a report and is sought immediately after a recognized amount
or ALL, otherwise as the first argument. Unrecognized arguments do not create
a general syntax error or an additional prompt. Device selectors follow the
DAMAGES rules.

### State changes

```text
RepairDevices(ship, amount):
    for each device in Device:
        deviceState := ship.devices[device]
        deviceState.damage := max(0 damage units,
                                   deviceState.damage - amount)

ExplicitRepair(ship, request, report):
    maximum := greatest damage among ship.devices
    deadline := none
    if maximum > 0 damage units:
        amount := selected amount, limited above to maximum
        rate := 80 milliseconds per damage unit
        if ship.docked:
            rate := 40 milliseconds per damage unit
        deadline := now + amount * rate
        RepairDevices(ship, amount)

    if report is requested:
        emit the requested device-damage report

    if deadline == none or deadline <= now:
        return without completing a turn
    record remaining delay until deadline
    CompleteTurn(ship, automaticRepair = true)
```

The deadline precedes repairs and the optional report; their elapsed time reduces
the remaining delay. With positive time remaining, the turn includes a further
automatic repair. Otherwise there is no turn completion or automatic repair.
There is no direct energy charge.

The accepted integer is not restricted to positive values. If at least one
device is damaged, a negative request increases every device's damage by its
magnitude, including devices previously undamaged. It leaves no positive delay
and does not complete a turn. With all devices undamaged, no changes occur even
for a negative request. These acceptance and state-change rules are retained;
removing numerical artifacts does not add a new positivity requirement.

**Source basis:** [REPAIR](../../legacy/utexas/DECWAR.FOR#L3190),
[explicit invocation](../../legacy/utexas/DECWAR.FOR#L148),
[automatic repair](../../legacy/utexas/DECWAR.FOR#L237).

## SCAN and SRSCAN

### Syntax and bounds

```text
ScanCommand ::= ("SCAN" | "SRSCAN") [Direction]
                [Integer [Integer]] ["WARNING"] End
Direction   ::= "UP" | "DOWN" | "RIGHT" | "LEFT" | "CORNER"
```

WARNING is recognized only in the final argument position. Direction, when
present, is the first argument. CORNER requires two integers. Other forms accept
zero, one or two integers. Invalid categories, missing CORNER coordinates or
extra arguments produce a syntax diagnostic; there is no continuation prompt.

There are four extents from the acting ship: up, down, right and left. SCAN
starts with each extent 10; SRSCAN starts with 7. Limit that initial extent to
the number of whole columns that fit `(terminalWidth - 9) / 4`. One explicit
integer replaces all four extents; a second replaces right and left. Explicit
extents are therefore independent of the terminal-width default.

UP sets the down extent to zero; DOWN sets up to zero; RIGHT sets left to zero;
LEFT sets right to zero. CORNER interprets the first integer as vertical and the
second as horizontal: a positive value selects the increasing side, a negative
value the decreasing side, and its magnitude is the extent. Zero selects neither
side of that axis.

```text
BoundScan(ship, up, down, right, left):
    up := clamp(up, 0, 10)
    down := clamp(down, 0, 10)
    right := clamp(right, 0, 10)
    left := clamp(left, 0, 10)
    return Rectangle(
        minVertical = max(1, ship.position.vertical - down),
        maxVertical = min(75, ship.position.vertical + up),
        minHorizontal = max(1, ship.position.horizontal - left),
        maxHorizontal = min(75, ship.position.horizontal + right)
    )
```

`clamp(value, lower, upper)` means `min(upper, max(lower, value))`.
The resulting inclusive rectangle always contains the acting ship's sector.
This spatial calculation is independent of the output's SHORT or LONG format.

### Knowledge and result

A successful scan reports the sectors in that rectangle. It also discovers all
planets and surviving enemy bases within distance 10 of the acting ship,
including those outside the displayed rectangle. Discovery belongs to the
acting team, so other captains on that team can use it.

```text
AcquireScanKnowledge(ship, world):
    knowledge := world.knowledge[ship.team]
    for each planet within distance 10 of ship.position:
        knowledge.knownPlanets :=
            knowledge.knownPlanets union {planet.id}
    for each surviving enemy base within distance 10:
        knowledge.knownBases :=
            knowledge.knownBases union {base.id}
```

With WARNING, enemy planets considered by that discovery step mark a square
danger area of radius 2; enemy bases mark radius 4. Clip each area to the scan
rectangle. Warning marks occupy otherwise blank sectors and do not replace
visible objects. Ordinary scans do not mark these areas.

Scanning costs no energy and completes no turn. Exact symbols, labels, spacing,
concealed objects and interrupted rendering belong to the terminal presentation
rules, whose conversion is still pending.

**Source basis:** [SCAN/SRSCAN](../../legacy/utexas/DECWAR.FOR#L3527),
[warning marks](../../legacy/utexas/WARMAC.MAC#L2412).

## STATUS

### Syntax and item selection

```text
StatusCommand ::= "STATUS" {StatusItem}
StatusItem    ::= "SHIELDS" | "LOCATION" | "CONDITION"
                | "TORPEDO" | "ENERGY" | "DAMAGE" | "RADIO"
```

Without arguments, report stardate followed by condition, location, torpedoes,
engine energy, hull damage, shields and radio, in that order. Otherwise process
name-category arguments in input order, stopping at the first other category.
An unrecognized item emits a syntax diagnostic and does not prevent later items
from being processed. Matching uses the order in the production; it does not
apply command-name ambiguity detection to the items.

### Meaning of report items

| Item | Information reported |
| --- | --- |
| SHIELDS | Shield mode and percentage strength. Medium/long output also reports the equivalent shield energy: 25 energy units per percentage point. |
| LOCATION | Absolute vertical and horizontal position, regardless of the coordinate-output preference. |
| CONDITION | Current green, yellow or red condition, with docking status. |
| TORPEDO | Remaining torpedo count. |
| ENERGY | Remaining engine energy in energy units. |
| DAMAGE | Hull damage in damage units. |
| RADIO | Damaged when radio-device damage is at least 300 damage units; otherwise the radio's on/off setting. |

STATUS observes state without changing it, charging energy or completing a turn.
The report need not be a simultaneous snapshot of all fields; concurrent changes
between observations belong to the multiplayer rules. Output labels, numeric
formatting and line assembly remain part of the presentation work.

**Source basis:** [STATUS](../../legacy/utexas/DECWAR.FOR#L3860).

## DAMAGES

### Syntax

```text
DamagesCommand ::= "DAMAGES" {DeviceSelector}
DeviceSelector ::= "SH" | "WA" | "IM" | "LS" | "TO"
                 | "PH" | "CO" | "RA" | "TR"
```

These selectors denote shields, warp engines, impulse engines, life support,
torpedo tubes, phasers, computer, radio and tractor beam, respectively. They
use the ordinary keyword-prefix comparison against the displayed two-character
identifiers. Full device names are not additional selector spellings. A prefix
can match several identifiers: T matches both TO and TR.

### Selection and result

```text
ReportDamage(ship, arguments):
    if every device has zero damage:
        emit AllDevicesFunctional
        return

    if the first argument is a name-category token:
        for each argument until a non-name-category token:
            for each matching DeviceSelector in displayed order:
                emit DeviceDamage(device, ship.devices[device].damage)
    else:
        for each device in displayed order:
            if ship.devices[device].damage > 0 damage units:
                emit DeviceDamage(device, ship.devices[device].damage)
```

An unmatched selector is silently skipped. Explicit matches report zero damage
as well as positive damage when at least one device is damaged. With no damaged
devices, the all-functional response takes precedence over all selectors.
Reports can repeat a device when the supplied selectors match it more than once.

DAMAGES changes no state, consumes no energy and completes no turn. Labels,
headings and field widths depend on output verbosity and will be specified in
the terminal presentation rules.

**Source basis:** [DAMAGE](../../legacy/utexas/DECWAR.FOR#L783),
[device identifiers](../../legacy/utexas/DECWAR.FOR#L435).

## TRACTOR

### Syntax and continuations

```text
TractorCommand ::= "TRACTOR" ["OFF" | ShipName]
```

With no arguments and an active beam, release that beam. Otherwise a missing
name-category argument prompts for OFF or a ship name; an empty continuation
cancels. OFF takes precedence over ship-name matching. OFF without an active
beam reports that no beam is in use. Unused trailing arguments are ignored.

### Acquisition

For a named target, first reject an existing beam on the acting ship, then resolve
the first matching ship name in roster order. An unknown name rejects the command.
Apply the remaining checks in this order:

```text
EngageTractor(ship, target):
    if target.id == ship.id:
        reject CannotTractorSelf
    if target.team != ship.team:
        reject CannotTractorEnemy
    if not target.commissioned:
        reject ShipNotInGame
    if distance(ship.position, target.position) > 1:
        reject TargetNotAdjacent
    if target.tractorBeam != none:
        reject TargetAlreadyInBeam
    if ship.shields.mode == UP:
        reject LowerOwnShields
    if target.shields.mode == UP:
        reject TargetShieldsRaised

    beam := new association between ship.id and target.id
    add beam to world.beams
    ship.tractorBeam := beam.id
    target.tractorBeam := beam.id
    notify both endpoints of TractorEngaged
```

Acquisition does not move either ship, charge energy, change condition or complete
a turn. Tractor-device damage is not an acquisition precondition. The association
and release operation are defined in [tractor associations](world-rules.md#tractor-associations).

**Source basis:** [TRACTR and TRCOFF](../../legacy/utexas/DECWAR.FOR#L4432).

## MOVE and IMPULSE

### Syntax and initial validation

```text
MoveCommand    ::= "MOVE" [Location]
ImpulseCommand ::= "IMPULSE" [Location]
```

Location uses the absolute, relative or computed forms in the coordinate grammar,
with exactly two resulting coordinate items. Missing coordinates prompt for them;
empty continuation cancels and invalid coordinates reject. A location equal to
the current sector reports the zero-displacement diagnostic and asks again.

Before reading coordinates, MOVE requires warp-engine damage below 300 damage
units; IMPULSE requires impulse-engine damage below 300. On passing that check,
set a deadline to `now + (world.pacingClass + 1)*1000 milliseconds`, and select
the potential speed damage as `IntegerDraw(4000)/10` damage units. Its value is
used only if a later overheating check succeeds.

### Range and speed

After accepting a nonzero displacement, set condition green and clear docking.
Let d be the Chebyshev distance to the intended destination. If computer damage
is at least 300 units, set path deflection to `(UnitDraw()-0.5)/2`; otherwise use
zero deflection. Then validate range:

```text
if command == IMPULSE:
    if d != 1:
        reject ImpulseRangeExceeded
else:
    if d > 6:
        reject WarpRangeExceeded
    if ship.devices[WARP_ENGINES].damage > 0 and d > 3:
        reject DamagedWarpRangeExceeded
```

A range rejection retains the already-applied green condition and undocking.
It does not charge movement energy or complete a turn. Coordinate rejection
before the nonzero-displacement step does not apply those state changes.

MOVE at distance 5 or 6 emits the speed-risk warning and selects `IntegerDraw(100)`.
A result above 90 at distance 5 or above 80 at distance 6 causes overheating.
Add the previously selected speed damage to warp-engine damage and report it.
Overheating does not cancel the movement. Short output omits the estimated
repair-time explanation; exact response wording belongs to presentation.

### Movement and energy

Trace the intended displacement for d steps using the shared path rule. Charge
energy according to intended distance, even when an obstruction prevents reaching
the destination:

```text
cost := 4 * d^2 energy units
if ship.shields.mode == UP:
    cost := 2 * cost
if ship.tractorBeam != none:
    cost := 3 * cost
ship.energy := ship.energy - cost

if trace.lastClear != ship.position:
    ship.position := trace.lastClear
    move the ship's presence to that sector
    if ship.tractorBeam != none:
        move its partner under the tractor-following rule

if trace has an obstruction:
    emit MovementObstructed
record remaining delay until the entry deadline
```

The factors multiply: raised shields and a beam make the cost six times the
unmodified cost. Movement has no precondition requiring sufficient energy to
pay this charge. Exhausted energy is handled by the subsequent lifecycle rules.

Normal movement completes a turn with automatic repair. If the commission has
ended before that completion is selected, proceed to session exit instead.
The moving ship's relocation precedes its partner's; they are not required to
be observed as a simultaneous relocation. Full concurrent obstruction and
occupied-trailing-sector cases remain part of the world-rule review.

**Source basis:** [MOVE/IMPULS](../../legacy/utexas/DECWAR.FOR#L2141),
[path](../../legacy/utexas/DECWAR.FOR#L699),
[completion selection](../../legacy/utexas/DECWAR.FOR#L99).

## BUILD

### Syntax and prerequisites

```text
BuildCommand ::= "BUILD" [Location]
```

Location supplies exactly two coordinate items. Missing input prompts for
coordinates; empty continuation cancels. The target must be within one sector,
must be a planet, and must already belong to the acting team. Test these
conditions in that order. If it has four completed builds and the team already
has ten active bases, reject before changing the planet.

At command entry, set the deadline to
`now + world.pacingClass*1000 milliseconds + 4000 milliseconds`.

### Construction stages

```text
BuildStage(ship, planet):
    planet.builds := planet.builds + 1
    if planet.builds != 5:
        emit ConstructionStageCompleted(planet.builds)
    ship.pendingScore[BASE_CONSTRUCTION] += 50 * planet.builds points

    if planet.builds == 5:
        attempt to begin the shared planet-update operation
        if that operation is unavailable:
            reject ConstructionCrewBusy
        if no base capacity remains for this team:
            planet.builds := planet.builds - 1
            end the planet-update operation
            reject BaseLimitReached

        ship.pendingScore[BASE_CONSTRUCTION] += 250 points
        convert the planet into a friendly base at the same position
        transfer discovery of the planet to discovery of the base
        set base strength to 100%
        end the planet-update operation
        emit BaseConstructed(base)

    record remaining delay until the entry deadline
    CompleteTurn(ship, automaticRepair = true)
```

The first four stages retain the planet and its ownership. The fifth removes
the planet and creates a base, using the first available base identity in the
team's ordering. The new base begins at full strength. Conversion invokes the
installation-removal and world-end rules.

The fifth-stage availability and capacity checks occur after the stage increment
and its pending score. A busy-crew rejection retains both. A later capacity
rejection reverses the stage increment but retains that pending score. Neither
rejection completes a turn, so the pending score has not yet been committed to
ship and team totals. This differs from the earlier four-build/ten-base
precondition, which changes nothing.

There is no direct engine-energy charge. Successful construction completes one
turn with automatic device repair. A full five-stage construction contributes
1000 points in total when all stages complete normally.

**Open:** The shared planet-update operation serializes installation changes;
the complete availability and interleaving rules are still being specified.
World termination during conversion also needs its final lifecycle ordering.

**Source basis:** [BUILD](../../legacy/utexas/DECWAR.FOR#L523),
[planet removal](../../legacy/utexas/DECWAR.FOR#L2864).

## CAPTURE

### Syntax

```text
CaptureCommand ::= "CAPTURE" [Location]
```

Location supplies exactly two coordinate items. Missing input prompts for
coordinates; an empty continuation cancels. Coordinate interpretation follows
the ordinary location rules.

### Operation and preconditions

```text
operation Capture(actor: ShipId, target: Position)
    on GameState -> CaptureOutcome

CaptureOutcome = Captured(planet: PlanetId)
               | Rejected(reason: CaptureRejection)
               | Cancelled

CaptureRejection = NotAdjacent | NotAPlanet
                 | AlreadyOwned | SurrenderRefused
```

These outcome names describe semantics; they are not literal terminal messages.
For a resolved target, check the following conditions in order:

1. Its distance from the acting ship is at most one sector.
2. It contains a planet.
3. The planet does not already belong to the acting ship's faction.

Failure gives the corresponding rejection and diagnostic. The diagnostic for
`NotAPlanet` distinguishes the kind of object at the target. A valid target can
also yield `SurrenderRefused`, reported as “The planet's government refuses to
surrender.” Rejection or cancellation makes no capture changes, incurs no
capture energy charge and does not complete a turn.

**Open:** The multiplayer conditions under which a valid capture is refused,
and the resolution of simultaneous changes to the target, still need a complete
contract. Surrender refusal is not a random chance or a new diplomatic mechanic.

### Successful state effects

Let p be the target planet, s the acting ship, t its faction, o the planet's
owner before capture, and b the planet's builds before capture. The capture
event has these effects:

```text
after(p.owner)  == t
after(p.builds) == 0
after(s.energy) == before(s.energy) - 50 * b energy units
```

The planet's identity and position are unchanged. The capturing faction gains
one owned planet; if o is a faction, that faction loses one. Fortifications are
consumed. No minimum-energy precondition is added: an energy cost that the ship
cannot survive does not turn an accepted capture into a rejection.

Capture is followed by one defensive phaser attack on s:

```text
defensiveStrength = 50 + 30 * b
defensiveDistance = distance(p.position, s.position)
defensiveOwner    = o
```

The shared phaser-damage rule determines the attack's effects, including shield,
hull, device and energy changes. These effects are additional to the capture
energy charge above. Even an unfortified neutral planet attacks, with strength
50. Reports attribute the defensive attack to the planet under its former
ownership; consuming the fortifications does not reduce this attack's strength.

If o is a faction, its ENEMY_DAMAGE score increases by the attack's reported
damage, expressed in points. If that attack destroys s, o also earns 500
ENEMY_KILLS points. A neutral former owner receives no faction score.

The capture contributes 100 points to s's pending PLANET_CAPTURE score, committed
by normal turn accounting. Its outcome is `Captured(p.id)` even if the defensive
attack destroys s. Destruction does not restore former ownership or cancel the
capture credit. Subsequent world and lifecycle events have their own effects.

### Observations and completion

The actor receives the capture and defensive-hit reports. A fatal outcome also
produces the faction-specific death report. The final hit notification is
available to the acting faction within distance 10 of the ship and to captains
of either faction within distance 4.

The capture deadline is command-entry time plus five seconds plus one second
per former build. Time spent supplying coordinates and resolving capture counts
toward that deadline. Only the remaining interval contributes to the command's
completion delay under the shared timing rules.

An accepted capture completes one turn with automatic device repair. The shared
turn rules apply even after a fatal defensive hit; lifecycle handling follows
those rules. The state effects above describe the capture and its defense, not
an exemption from other events in turn completion.

**Open:** Former-faction docking effects, concurrent audience changes and complete
notification rendering still need their final shared-rule contracts.

**Source basis:** [CAPTUR](../../legacy/utexas/DECWAR.FOR#L600),
[phaser damage](../../legacy/utexas/DECWAR.FOR#L4166),
[turn completion](../../legacy/utexas/DECWAR.FOR#L73).

## PHASERS

### Syntax and target validation

```text
PhasersCommand ::= "PHASERS" [PhaserTarget]
PhaserTarget   ::= Location | StrengthAndLocation
```

Location uses the coordinate grammar and contributes two coordinate items.
StrengthAndLocation contributes an integer strength followed by those two items;
the coordinate grammar also permits its computed-target form. Default strength
is 200. A lone strength without a target is invalid. Missing arguments prompt
for a target; an empty continuation cancels.

Phaser-device damage must be below 300 damage units before acquiring a target.
Choose the phaser bank with the earlier readiness deadline; on a tie choose the
first bank. Identify the target before waiting for that bank. It must be a ship,
base, planet or Romulan. Reject an uncommissioned ship, the acting ship's own
sector, a friendly ship/base/planet, and a target more than ten sectors away,
in that order after identifying a valid target kind. A neutral planet is allowed.

Wait until the chosen bank is ready. Only then validate an explicitly supplied
strength as 50 through 500 inclusive. An invalid strength can therefore produce
a diagnostic after a wait, without a shot, energy charge or turn completion.

### Firing and heat

With shields raised, firing costs an additional 200 energy units for shield
control. The shield mode stays up. The command does not require enough energy
to pay this or the later firing cost.

```text
if ship.shields.mode == UP:
    ship.energy -= 200 energy units
    emit the shield-control notice when output is not SHORT

if IntegerDraw(100) * strength > 18900:
    addedDamage := 75 + 0.0075 * IntegerDraw(100) * strength
    ship.devices[PHASERS].damage += addedDamage damage units
    emit PhasersOverheated
```

Overheating does not abort the shot. The new damage participates in this shot's
damage calculation and in the bank's next readiness deadline.

### Target effect

| Target | Effect |
| --- | --- |
| Ship or base | Apply the shared phaser-damage rule, including shields, critical hits and score. |
| Romulan | Apply the Romulan phaser-damage and score rule. |
| Neutral or opposing planet | If `IntegerDraw(100)*strength/(25*distance) > 150`, reduce its builds by one, with a floor of zero. Otherwise leave builds unchanged. |

Phasers do not destroy a planet when its build count reaches zero. They do not
perform path traversal through intervening sectors. A phaser hit on a ship does
not itself invoke tractor release.

An enemy base at exactly 100% strength makes a distress call before the hit.
If destroyed, it makes a destruction call after the hit notification. Those
calls address its faction's captains whose radios are on. For ship/base hit
notifications, the target's faction within ten sectors, either faction within
four sectors, and the shooter form the audience. Planet and Romulan hits notify
captains within ten sectors of the target. Complete delivery and rendering
rules remain separate.

### Completion

```text
ship.energy -= strength energy units
ship.condition := RED
captain.phaserReady[chosenBank] := now
    + (world.pacingClass + 1) * 1500 milliseconds
    + ship.devices[PHASERS].damage * 10 milliseconds per damage unit
CompleteTurn(ship, automaticRepair = false)
```

The readiness delay starts after the hit, rather than at command entry. The
other bank's deadline is unchanged. Successful firing completes a turn without
automatic device repair. Energy exhaustion after firing is handled by the
subsequent lifecycle rules, without undoing the shot.

**Source basis:** [PHACON](../../legacy/utexas/DECWAR.FOR#L2647),
[damage](../../legacy/utexas/DECWAR.FOR#L4089),
[Romulan hit](../../legacy/utexas/DECWAR.FOR#L3382).

## TORPEDOS

### Syntax and continuation

The command is spelled TORPEDOS. The ordinary abbreviation and coordinate rules
apply, including ABSOLUTE, RELATIVE and COMPUTED forms.

```text
TorpedoCommand ::= "TORPEDOS" [CountAndTargets]
CountAndTargets ::= locations producing an integer count
                    followed by zero to three coordinate pairs
```

The count is a scalar; it is not offset in relative mode. A burst requests one
to three torpedoes. Supply at least one target pair, either with the count or
in a following coordinates continuation. If fewer pairs than torpedoes are
supplied, reuse the last pair for the remaining shots. Targets denote directions;
they need not contain an enemy, and a torpedo may travel beyond a target.

With no initial items, prompt for the burst and repeat until the reply has a
positive odd number of location items, or input is cancelled. A count alone
requests up to twice that count in coordinate items; an odd-sized reply requests
coordinates again. A nonpositive count cancels without firing. An excessive count
is rejected; a count above the available inventory also reports that limitation.

**Open acceptance cases:** incomplete pairs supplied on the original command line
and an empty coordinates continuation follow inconsistent historical paths.
Their language-level acceptance and diagnostics remain under review. They do
not authorize manufacturing target coordinates from unrelated input state.

### Entry checks and target validation

Torpedo-tube damage of at least 300 units rejects the command before input is
read. Inventory must be positive, even while docked. The requested count cannot
exceed either three or the current inventory. Validate all stored targets before
launching the first shot: each must be within ten sectors of the acting ship.
An out-of-range target rejects the burst without a turn.

An own-sector target takes a different path: report the invalid target, set the
tubes' readiness deadline to now, and complete one turn without automatic repair.
No torpedo is launched or consumed. This early path does not set red condition.
It can be reached before the previous readiness delay has expired.

Otherwise wait until `captain.torpedoesReady`, then set condition red and begin
the burst. Shots in one burst do not wait separately for the tubes to reload.

### Launch and misfire

For each shot, use the ship's current position and state. If a previous shot
misfired, stop the burst. Compute deflection as follows; each U is a separate
`UnitDraw()`:

```text
deflection := (U1 - 0.5)/5
if torpedo tubes or computer have positive damage:
    deflection += (U2 - 0.5)/10
if ship.shields.mode == UP:
    deflection += (ship.shields.strength / 1%) * (U3 - 0.5)/1000
```

If this shot's target has become the ship's own sector, report the error and
finish the burst normally with the delays already accumulated. Otherwise consume
one torpedo when undocked; docking prevents this consumption but does not waive
the entry inventory checks. There is no engine-energy firing cost.

`IntegerDraw(100) > 96` is a misfire. Report its shot number and add
`(UnitDraw()-0.5)/5` to deflection. No subsequent shot in this burst launches,
but the misfired shot still travels and can hit normally. On a misfire,
`IntegerDraw(5) == 5` also adds `50 + IntegerDraw(3000)/10` damage units to the
tubes and reports that damage.

Choose the shot's maximum path length using a new U:

| U | Maximum steps |
| --- | --- |
| `0 <= U < 1/8` | 7 |
| `1/8 <= U < 5/8` | 8 |
| `5/8 <= U < 7/8` | 9 |
| `7/8 <= U < 1` | 10 |

Add `(world.pacingClass+1)*1000 milliseconds` plus ten milliseconds per current
torpedo-tube damage unit to the accumulated reload delay. This includes tube
damage caused by this shot's misfire. Trace from the current ship position toward
the stored target using this length and deflection, and resolve the first
obstruction. The shared path rule determines sector order and displacement step.

### Impact

| Result | Effect |
| --- | --- |
| No obstruction | Report a miss at the final traced position to the shooter. |
| Black hole | Absorb the shot and notify the shooter. |
| Friendly ship, base or planet | Neutralize the shot without damage; notify the shooter. |
| Star | If `IntegerDraw(100) <= 80`, announce a nova within ten sectors, subtract 50 pending STAR_DESTRUCTION points and resolve the stellar explosion. Otherwise report the unaffected star to the shooter. |
| Enemy ship or base | Apply the shared torpedo-damage rule. Notify captains within ten sectors of the impact; then release a ship victim's tractor beam. |
| Romulan | Apply its torpedo-damage, possible displacement and score rule. Notify captains within ten sectors of the original impact. |
| Neutral or enemy planet | Apply the planet rule below. |

A full-strength enemy base makes its faction-wide distress call before damage.
A destroyed base makes its faction-wide destruction call after the hit notice.
These two calls address captains of the base's faction whose radios are on.

A planet hit first requires a shared planet update. If unavailable, output
“Sorry, Captain, but the torpedo tubes are empty!” and stop without updating the
readiness deadline or completing a turn. Prior shots, consumption and score
changes remain in effect. This diagnostic does not mean the inventory was
actually reduced to zero.

With the update available, `IntegerDraw(4) == 4` removes one build; other results
leave builds unchanged. A negative build count destroys the planet and invokes
planet removal and world-end rules. Subtract 100 points from the pending
PLANET_DESTRUCTION score. Exactly zero builds survives. Release the update and notify
captains within ten sectors of the impact.

### Completion

```text
captain.torpedoesReady := now + accumulatedReloadDelay
CompleteTurn(ship, automaticRepair = false)
```

This happens once for a normally completed burst, including a burst cut short
by a misfire. It does not happen after the explicitly identified early returns.
The reload deadline starts at burst completion; it gates the next burst rather
than adding a wait between this burst's shots.

**Source basis:** [TORP](../../legacy/utexas/DECWAR.FOR#L4228),
[TORDAM](../../legacy/utexas/DECWAR.FOR#L4089),
[location input](../../legacy/utexas/DECWAR.FOR#L1404).

## LIST, SUMMARY, BASES, PLANETS and TARGETS

These commands query the galaxy. A detail row identifies an object and reports
the information the captain is allowed to see; a summary counts selected objects.
The commands share ordered selection groups, but have different defaults.

### Syntax and defaults

```text
ReportCommand ::= ReportVerb [Group {GroupEnd Group}]
ReportVerb ::= "LIST" | "SUMMARY" | "BASES" | "PLANETS" | "TARGETS"
GroupEnd ::= "AND" | "&"
Group ::= one or more selectors accepted for the chosen ReportVerb
```

The complete selector inventory, recognition order and conflicts are specified
in [LIST-family grouping](grammar.md#gram-11--list-family-grouping). Selectors
are processed in their written order. In particular, two consecutive integers
are an absolute sector coordinate, while a lone integer is a maximum distance.
These commands do not use the general ABSOLUTE/RELATIVE/COMPUTED location syntax.
A token matching AND ends the group before other keywords are considered.

| Command | Default query and report |
| --- | --- |
| LIST | Detail for ships, bases and planets of all affiliations, throughout the galaxy. |
| SUMMARY | Counts for the same object selection as LIST. |
| BASES | Detail and counts for friendly bases throughout the galaxy. |
| PLANETS | Detail for planets of all affiliations within ten sectors. |
| TARGETS | Detail for opposing ships, bases and planets, plus the Romulan, within ten sectors. |

These defaults start afresh for each group. A bare command uses one default
group. Later empty groups are errors. An illegal keyword or selector conflict
stops further processing. No partial deferred report is printed after a parsing
error; rows already produced by earlier direct queries remain visible.

An abstract group describes object kinds, affiliations, requested detail/count
results, range, and any named-object, exact-position or closest selection. It
does not change the world's objects. The command records the acting ship's
position when it begins and uses that position for its distance calculations.

### Selector effects

The following effects apply only when the selector is legal at that point in
the group. The grammar's conflict rules remain part of acceptance.

| Selector | Meaning |
| --- | --- |
| SHIPS, BASES, PLANETS | Restrict to the named object kind and remove affiliations impossible for that kind. The Romulan is included in SHIPS when its affiliation remains selected. |
| PORTS | Select bases and planets. Unless a side was explicitly selected, choose friendly and neutral objects. Exclude the Romulan. A prior NEUTRAL selection keeps the planet-only restriction. |
| FRIENDLY | Select the acting faction and exclude the Romulan. |
| ENEMY or TARGETS | Select the opposing faction and include the Romulan. |
| FEDERATION or HUMAN | Select Federation, retaining any already selected Romulan affiliation. |
| EMPIRE or KLINGON | Select Empire, retaining any already selected Romulan affiliation. |
| NEUTRAL | Select neutral planets only. |
| CAPTURED | Select Federation and Empire planets only. |
| ALL | With no explicit side, select every affiliation, except that TARGETS keeps its opposing/Romulan selection. With no explicit range, extend range to the whole galaxy. |
| Positive integer | Set a maximum Chebyshev distance from the saved acting position. |
| CLOSEST | Select one nearest eligible object for immediate detail. Exclude the acting ship. Without an explicit range, search throughout the galaxy. |
| LIST | Request detail. For BASES, PLANETS and TARGETS this replaces their default result choice. |
| SUMMARY | Request counts and, without an explicit range, extend range to the whole galaxy. LIST SUMMARY retains detail as well as adding counts; other eligible commands switch to counts. |

Explicit faction selectors can retain the Romulan even when they name only one
faction: use FRIENDLY to exclude it. ALL expands affiliations and range;
it does not remove object-kind restrictions or reveal undiscovered locations.
Only one explicit output selector is accepted in a group.

### Visibility and selection

Process ordinary candidate objects in this order: the Romulan if present, ships
in roster order, Federation bases then Empire bases in base-identity order,
then planets in their current order. Skip uncommissioned ships and ships with
no galaxy presence; skip bases with nonpositive strength. Apply the group's
object-kind and affiliation selection before visibility checks.

For each candidate let d be its distance from the saved acting position. Normal
detail is available within ten sectors, or at any distance for a friendly object.
Privilege also admits remote objects, but that admission is distinguished from
ordinary discovery. The group's explicit distance limit still applies.

For an object outside ten sectors that is neither friendly nor admitted by
privilege, use these rules:

```text
if object is a base or planet:
    known := object is in the acting faction's corresponding knowledge set
else:
    known := this is a whole-game group and not a CLOSEST request

if known:
    admit the requested result modes if within the group's distance limit
    mark its detail as out of sensor range
else if counts were requested for the whole game:
    admit counts only
else:
    omit the candidate
```

Whole-game selection means the unrestricted scope obtained without an explicit
numeric range. Supplying a number larger than the galaxy does not acquire the
whole-game disclosure rule: it remains a specified-range query. In particular,
SUMMARY can count unknown remote bases or planets, but a specified-range summary
requires their prior discovery when they are beyond normal sensor range.

For CLOSEST, an eligible candidate at a distance equal to the current nearest
distance replaces it. Thus ties choose the last eligible object in the candidate
order above. The chosen sector is reported through the exact-position path
below. A remote enemy ship or Romulan is not eligible for CLOSEST merely because
its identity appears in a whole-game LIST.

### Named objects and exact positions

LIST and TARGETS can name ships or ROMULAN. Report requested ships in roster
order, after the Romulan if requested, independently of their order in the input.
An absent ship is reported as not in the game. Naming ROMULAN distinguishes
Romulan activity being disabled from the Romulan being temporarily absent.
A present remote enemy ship or Romulan can be identified, but its coordinates
and strength are replaced by `out of range` unless privilege permits them.
Naming a friendly ship permits its ordinary detail at any distance.

An exact-position query uses absolute coordinates in the galaxy. All four
commands accepting a coordinate can report a ship or the Romulan there.
BASES additionally accepts a base, PLANETS additionally accepts a planet, and
LIST and TARGETS accept both installation kinds. Their ordinary group-side
defaults do not reject a friendly object on this path. Within ten sectors, LIST can also
describe a star, black hole or empty sector. The other commands diagnose the
absence of their requested kind. A remote empty sector, star or black hole
exceeds sensor range even with privilege.

For remote nonfriendly installations, an exact-position query requires prior
discovery or privilege. A remote enemy ship or Romulan selected by position
requires privilege. Successful exact-position and named-object queries print
immediately, before later groups and any deferred report. They do not themselves
add an installation to faction knowledge. CLOSEST uses this same immediate path.

### Detail, summaries and knowledge

Deferred detail rows are combined across groups by object identity and printed
once per selected object, in the candidate order above. A direct row produced
earlier does not suppress that object's later deferred row. Use the currently
available object data at the time of reporting; the command is not an indivisible
world snapshot.

| Object | Detail information |
| --- | --- |
| Player ship | Identity; when visible, position, shield mode and shield strength. Remote nonfriendly rows without privileged visibility instead say out of range. |
| Romulan | Identity; when visible, position and its energy-derived strength display. Otherwise out of range. |
| Base | Identity and position. Include strength unless marked out of sensor range. |
| Planet | Identity, position and nonzero build count, including for a previously discovered remote planet. |

Ordinary detail marks opposing-faction objects and the Romulan with `*`.
TARGETS omits that marker. Ship shield strength is signed to indicate raised
or lowered shields. The Romulan's displayed strength is one tenth of its energy,
followed by a percent sign outside SHORT output. This is its established report
scale; it does not change the energy used by combat rules.

After a deferred base or planet detail row, add that identity to the acting
faction's knowledge, unless it was admitted only through privilege. Summary-only
selection does not reveal a location and does not update knowledge.

Ordinary summaries follow their object class: Romulan; Federation and Empire
ships; Federation and Empire bases; neutral, Federation and Empire planets.
Omit zero-count rows. TARGETS replaces ship/base/planet category summaries with
one target total, counting opposing objects selected for summary and one Romulan
when selected for summary. Its Romulan summary can still appear separately.
Detail-only objects do not contribute to a requested summary from another group.

Ship, base and planet summary counts count selected identities once. A Romulan
summary counts the qualifying group selections of the Romulan; repeated groups
can therefore produce a count greater than one even though only one Romulan
exists. This report multiplicity does not create extra Romulans or alter the
TARGETS total's one-Romulan contribution.

Summary labels distinguish ordinary sensor range, explicitly specified range,
and the whole game. Whole-game wording takes precedence when results from several
scopes are combined; specified-range wording takes precedence over ordinary
range. A known-object qualification accompanies restricted remote discovery.
Complete label aggregation and exact terminal formatting remain under review.

If a group selects no eligible object, report that absence and continue with
later groups. Distinguish unknown remote objects from an empty matching set in
the established report wording. Exact formatting of these diagnostics, mixed
named/filtered selector edge cases and concurrent changes remain open.

These commands do not spend energy, complete a turn, repair devices or change
physical objects. Their persistent game effect is the knowledge update described
above, when detailed installation output reaches that step.

**Source basis:** [LIST and related entries](../../legacy/utexas/DECWAR.FOR#L1359),
[group parsing](../../legacy/utexas/DECWAR.FOR#L1519),
[selection and visibility](../../legacy/utexas/DECWAR.FOR#L1750),
[detail and summary output](../../legacy/utexas/DECWAR.FOR#L1959).

## POINTS

### Syntax and selection

```text
PointsCommand ::= "POINTS" {ScoreSelector}
ScoreSelector ::= "ME" | "I" | "FEDERATION" | "HUMANS"
                | "EMPIRE" | "KLINGONS" | "ROMULANS" | "ALL"
```

With no selectors during a commission, report the acting ship's score. Before
joining a ship, default to both factions and, when enabled, the Romulan. ALL
selects those columns plus the acting ship when one is commissioned. Repeated
selectors do not duplicate columns. ME and I require an acting ship.

Read selectors in order, applying ordinary abbreviations and the production's
matching order. A nonalphanumeric token stops selector processing; selectors
already recognized still apply and subsequent tokens are ignored. An unknown
alphanumeric selector rejects the command. Remove a Romulan column when Romulan
activity is disabled. If no column remains selected, report invalid input.

### Score report

Present selected columns in the order: acting ship, Federation, Empire, Romulan.
Use committed scores; do not commit pending command score merely to answer POINTS.
Within those columns, visit categories in this order:

1. Enemy damage.
2. Enemy kills.
3. Base damage and destruction.
4. Planet capture.
5. Base construction.
6. Romulan damage and destruction.
7. Star destruction.
8. Planet destruction.

Omit a category only if every selected column is zero for it. For a category
that is shown, include each selected column's value, including zero. Negative
scores remain negative. Follow category rows with each column's total.

When faction or Romulan columns are selected, also report their cumulative
number of commissions and total score per commission. These are historical
commission counts for this galaxy, not the current simultaneous player count.
Do not place a per-commission value in the acting-ship column. Finally report
score per turn: the ship's own completed turns for its column, and accumulated
turns for each faction or the Romulan for theirs.

```text
total(score) := sum of its eight category values
pointsPerCommission := total / cumulativeCommissions
pointsPerTurn := total / completedTurns
```

Ratios retain fractions until terminal formatting. The display of a ratio with
a zero denominator remains unresolved; it is not implicitly zero, and this
draft does not require a machine arithmetic exception. The lifecycle rules must
establish the initial counts and define when each commission increments them.

POINTS changes no score, resource, knowledge or stardate. A report does not
recompute damage or turn credits and does not reconcile team totals to the sum
of currently commissioned ships: some events credit a team directly.

**Source basis:** [POINTS](../../legacy/utexas/DECWAR.FOR#L2893),
[commission counts](../../legacy/utexas/SETUP.FOR#L296),
[Romulan commissions and turns](../../legacy/utexas/DECWAR.FOR#L3244).

## TYPE

### Syntax

```text
TypeCommand ::= "TYPE" ["OUTPUT" | "OPTION"]
```

An absent or invalid switch prompts for one. An empty continuation cancels.
The one-character switch O is explicitly ambiguous and produces the ambiguity
diagnostic before prompting again. Other abbreviations use ordinary matching:
OU selects OUTPUT; OP selects OPTION. Ignore further arguments after selecting
one of these switches.

### Meaning

TYPE OUTPUT reports these session preferences in order:

1. Output length: SHORT, MEDIUM or LONG.
2. Prompt style: NORMAL or INFORMATIVE.
3. Scan style: SHORT or LONG.
4. Input coordinate default.
5. Output coordinate default.
6. Terminal profile name.

TYPE OPTION reports the game version, whether Romulan activity is enabled, and
whether black holes were selected for this galaxy. The black-hole option is
distinct from counting black holes that currently remain on the board.

TYPE observes the current preferences; it does not change them, consume energy
or complete a turn. Its preference and option labels are part of the terminal
presentation. The same reports are available before commissioning, subject to
the session's current configuration.

**Source basis:** [TYPE](../../legacy/utexas/DECWAR.FOR#L4540).

## TIME

```text
TimeCommand ::= "TIME"
```

TIME reports the following durations and clock reading, in this order:

1. Elapsed time since the galaxy's time origin.
2. Elapsed time since the acting ship's commission began, if commissioned.
3. Execution time accrued by the session since that commission began, if commissioned.
4. Total execution time accrued by the session.
5. Current time of day.

Elapsed time includes waiting. Execution time is the environment's accounting
of time spent running the session; it is a separate observation, not a turn
count or a movement delay. The environment supplies these clocks and accounting
readings. Their acquisition does not change the game's stardates or scores.
The platform binding must identify the execution-time measure it supplies;
equating it to elapsed time is not implicit in this command.

Before commissioning, omit the two ship-specific rows. TIME ignores trailing
arguments and changes no game state. Precision, time-of-day convention and exact
duration rendering belong to the presentation and environment binding still
being specified.

**Source basis:** [TIME](../../legacy/utexas/DECWAR.FOR#L4066).

## USERS

```text
UsersCommand ::= "USERS"
```

USERS lists currently commissioned captains in ship-roster order, with a faction
separator between Federation and Empire. Every included row contains these
fields, in order:

1. Ship name.
2. Captain's name.
3. Advertised terminal speed.
4. Account identity.
5. Terminal or connection label.
6. Session number.

The latter four fields are supplied session metadata. They do not expose a
new targeting syntax, add a game entity, or affect commission ownership. Their
historical terminal presentation is specified separately from the abstract
identities; an implementation need not obtain them from a particular operating
system or memory layout.

When the viewing session has privilege, append the ship's current position in
the viewer's chosen coordinate-output mode. Without privilege, omit this field.
USERS does not apply sensor-distance filtering or discover installation locations.
All output lengths include the six ordinary fields; LONG additionally prints
the descriptive header, including a location heading when privileged.

USERS ignores trailing arguments, changes no game state and does not complete
a turn. It is available before commissioning as well as during play. A row's
metadata and position need not be observed atomically with other rows; complete
session-change interleavings remain part of the multiplayer rules.

**Source basis:** [USERS](../../legacy/utexas/DECWAR.FOR#L4600),
[user-information fields](../../legacy/utexas/WARMAC.MAC#L2187).

## SET

### Syntax

```text
SetCommand ::= "SET" [Setting]
Setting ::= "NAME" [NameText]
          | "OUTPUT" ["SHORT" | "MEDIUM" | "LONG"]
          | "TTYTYPE" [TerminalName]
          | "PROMPT" ["NORMAL" | "INFORMATIVE"]
          | "SCANS" ["SHORT" | "LONG"]
          | "ICDEF" ["ABSOLUTE" | "RELATIVE"]
          | "OCDEF" ["ABSOLUTE" | "RELATIVE" | "BOTH"]
          | "ROMOPT" | "ENDFLG" | "BHREMV"
```

Resolve setting names in the order shown. The last three settings are recognized
only with privilege. An absent or unrecognized setting prompts for one; an empty
continuation cancels. SET changes one setting per invocation. It has no ordinary
energy charge or turn completion.

### Presentation preferences

| Setting | State change |
| --- | --- |
| OUTPUT | Set `captain.outputLength` to SHORT, MEDIUM or LONG. |
| PROMPT | Set `captain.promptStyle` to NORMAL or INFORMATIVE. |
| SCANS | Set `captain.scanStyle` to SHORT or LONG. |
| ICDEF | Set `captain.inputCoordinates` to ABSOLUTE or RELATIVE. |
| OCDEF | Set `captain.outputCoordinates` to ABSOLUTE, RELATIVE or BOTH. |

For these five settings, a missing or nonalphanumeric value prompts for a value.
An empty reply cancels. An alphanumeric value that matches none of the setting's
choices ends the command with that preference unchanged; it does not prompt
again or diagnose an unknown choice. Subsequent arguments are ignored.

Preferences affect later input interpretation and output; they do not move a
ship, change its sensors, or alter an already published message. Explicit command
coordinate modes still override the input default where that command allows them.
SET ICDEF BOTH is not an additional way to select an input default.

### Terminal profile

The terminal names, in matching order, are ACT-IV, ADM-2, ADM-3A, DATAPOINT,
ACT-V, SOROC, BEEHIVE and CRT. Ordinary five-character keyword matching applies.
A missing or nonalphanumeric value prompts; an empty reply cancels.

When an alphanumeric candidate is tested, clear the current terminal selection
and select the first matching profile, if any. If there is one match, finish.
If several profiles match, diagnose ambiguity, list the available names and
prompt again; the first match remains selected while awaiting another answer.
If none matches, list the available names and prompt again, leaving no profile
selected. Cancelling at that point does not silently restore an earlier profile.
The presentation binding must specify how an unselected profile is handled;
the unselected case remains unresolved.

### Captain name

NAME reads name text from the original line, beginning immediately after the
delimiter following NAME. Additional spaces are part of the name; it is not a
sequence of independently parsed name tokens. A separate name prompt begins at
the first character of its reply. Use at most twelve characters, stop at the
end of the acquired text, and apply the lexical case transformation to printable
characters. Spaces are retained. The result replaces the captain's display name
when it contains a nonspace character. It does not change ship, faction or
account identity.

If no name is obtained from the command line, prompt once for a name. An empty
or all-space reply leaves the name unchanged and ends the command. NAME consumes
the rest of the acquired command line, including text that would otherwise form
another command. Embedded nonprinting name characters remain an explicit lexical
edge case.

### Privileged settings

```text
SET ROMOPT:
    world.romulanEnabled := true

SET BHREMV:
    remove every black hole from the galaxy

SET ENDFLG:
    request world termination
    perform the world-end operation for this session
```

ROMOPT enables future Romulan activity; it does not immediately create a Romulan
or provide an OFF form. BHREMV removes existing black holes without changing the
option reported by TYPE OPTION. ENDFLG uses the shared termination and final
scoring rules; it is not an ordinary turn. No value after these settings is needed.

**Source basis:** [SET](../../legacy/utexas/DECWAR.FOR#L3624),
[terminal names](../../legacy/utexas/DECWAR.FOR#L480),
[USRNAM](../../legacy/utexas/WARMAC.MAC#L3415).

## TELL

### Syntax and recipient names

```text
TellCommand ::= "TELL" [Recipient {Recipient}] [";" MessageText]
Recipient ::= ShipName | GroupName | "ROMULAN"
```

The body after the first semicolon belongs to message text, not command tokens.
It retains its original case, spaces and punctuation. Without an inline body,
TELL prompts `Msg: ` after recipient selection succeeds.

If radio-device damage is at least 300 units, reject before changing radio state
or reading recipients. Otherwise enable the sender's radio. If recipients were
omitted, prompt for them; an empty continuation cancels, leaving the radio on.

For each recipient token, first recognize ROMULAN and skip it: Austin player
TELL does not address the Romulan or cause a reply. For any other recipient,
repeated command input is rejected before name lookup. Then try ship names in
roster order, before checking group names. Group abbreviations must match exactly
one group name; matching several names is ambiguous even if they denote the same
faction. Unknown or ambiguous recipients are diagnosed and skipped; other tokens
can still supply valid recipients.

| Group name | Ship identities selected |
| --- | --- |
| ALL | Both factions. |
| KLINGON, EMPIRE | Empire. |
| HUMAN, FEDERATION | Federation. |
| FRIENDLY | The sender's faction. |
| ENEMY | The opposing faction. |

Groups contribute only currently commissioned ships. Explicit ship names can
select an uncommissioned ship for the later availability diagnostic. Combine
selections as a set, so duplicate names or overlapping groups do not cause
duplicate delivery. Explicitly naming oneself produces the self-recipient notice.

### Filtering and state changes

Examine selected ships in roster order. A selected ship whose radio damage is
at least 300 units is unreachable and is removed. Otherwise an uncommissioned
ship is unavailable and is removed; otherwise a ship whose radio is off is
unreachable and is removed. Diagnose each removal in that order of precedence.
No distance or faction restriction applies.

```text
recipients := validated selected ships, excluding the sender
captain.radio.gaggedSenders -= recipients
if recipients is empty:
    emit NoRecipients
    return
acquire and publish message body for recipients
```

Sending to a ship ungags that ship in the sender's own radio settings. It does
not alter the recipient's gag choices. The radio-on and ungag effects happen
before body acquisition; cancelling the body or failing to publish does not
undo them. Recipient readiness is checked here, not continuously throughout
composition or delivery.

### Body and completion

If the current acquired line contains a semicolon, use the raw text following
its first semicolon. Otherwise acquire a line at the message prompt using the
ordinary line-editing rules. Ctrl-C during that prompt cancels with no message
published. Empty or one-character bodies produce `No message sent`. For longer
bodies, retain the first 75 characters. The full acquired body is consumed even
when its retained text reaches that limit.

Publication and subsequent delivery follow [radio communication](communication.md).
TELL completes no turn and charges no energy. Successful submission is distinct
from a recipient displaying the message: it can later be gagged, discarded on
release or lost under the bounded pending-message policy.

**Source basis:** [TELL](../../legacy/utexas/DECWAR.FOR#L3977),
[default groups](../../legacy/utexas/SETUP.FOR#L358),
[message acquisition](../../legacy/utexas/WARMAC.MAC#L2963).

## *PASSWORD

```text
PasswordCommand ::= "*PASSWORD" [PasswordToken]
```

The Austin password is `*MINK`. Compare the retained token exactly, using the
language's case transformation; a prefix is insufficient. An exact match enables
session privilege. Any other value, including an omitted password, clears it.
There is no password prompt or success/failure text in this command. Ignore
further arguments. It changes no resources and completes no turn.

Privilege affects the commands and observations that explicitly test it. It
does not rename a ship, change factions or make every game rule optional. The
password's representation is not a new authentication protocol.

**Source basis:** [PASWRD](../../legacy/utexas/DECWAR.FOR#L2626),
[password constant](../../legacy/utexas/PARAM.FOR#L15).

## *DEBUG

```text
DebugCommand ::= "*DEBUG"
```

Without privilege, report an unknown command and the help hint. With privilege,
report collected execution-timing observations under the headings Name, Calls,
Total and High: the measured operation's name, completed call count, total
execution time and largest measured call time. These are diagnostic observations,
not ship scores or game turns. Which operations are instrumented, their reporting
order and the time-unit binding remain environment-dependent research items.

The command ignores trailing arguments and changes no game resources, scores or
turn counts. Its availability before commissioning does not create a ship.

**Source basis:** [DEBUG and timing observations](../../legacy/utexas/WARMAC.MAC#L3600).

## HELP

### Syntax and operation

```text
HelpCommand ::= "HELP" {HelpTopic | "*"}
HelpTopic   ::= CommandName | ExtraTopic
ExtraTopic  ::= "CTL-C" | "INTRO" | "HINTS" | "INPUT"
             | "OUTPUT" | "PAUSES" | "PREGAME"

operation ReadHelp(captain: CaptainId, topics: Sequence<Text>)
    on GameState -> Finished | Rejected(RedAlert)
```

HELP is available before commissioning and during play. If the captain has an
acting ship under RED alert, reject before displaying help or changing its
activity. Otherwise begin the temporary information activity defined in
[session rules](session-rules.md#temporary-information-activities).

### Topic selection and observations

With no topics, display the general help instructions and extra-topic list.
This includes how to request a command list and how to ask about a command;
it does not implicitly select INTRO. The startup dialogue's HELP response is
separate: it displays both general help and the command list.

With topics, process each in input order. An asterisk requests the visible
main-game command list. For another topic, first match visible main-game command
names using ordinary abbreviation and ambiguity rules. A nonprivileged captain
sees the 31 ordinary commands; privilege adds *DEBUG and *PASSWORD. The list
and matching order are those of the main-game grammar, including in pregame.

An ambiguous command name produces the ambiguity diagnostic and matching names;
do not then try extra topics. If no command matches, search the extra topics
in the grammar above. A unique match requests that topic's text. An unknown
extra topic produces `I don't know the term ` followed by the topic; ambiguity
produces the corresponding ambiguity report. A failed topic does not discard
reports from preceding topics or prevent processing later topics.

A requested section uses the help-content binding defined in
[information resources](information.md#help-content). Privilege tries privileged
help content first, falling back to standard content only if the former cannot
be opened. A missing section in an opened privileged resource does not trigger
that fallback. Failure to open standard content reports `Can't read help file`;
a missing section reports `%Can't find help on ` followed by the resolved topic.

### State effects and completion

HELP charges no energy, awards no points and completes no turn. Topic output
counts as activity for a commissioned ship. On return, end the temporary
information activity and resume command acquisition in the same session phase.
Other world activity is not suspended.

Ctrl-C and the output-stop control terminate the currently displayed section
at a line boundary. A section exit clears those controls, so subsequent topics
in the same HELP command can still be processed. A control detected between
topics ends topic processing. This distinction does not imply a new command
or a universal whole-command cancellation rule.

**Source basis:** [HELP and topic matching](../../legacy/utexas/WARMAC.MAC#L4134),
[section output](../../legacy/utexas/WARMAC.MAC#L4222),
[extra topics](../../legacy/utexas/DECWAR.FOR#L471),
[startup HELP](../../legacy/utexas/SETUP.FOR#L76).

## NEWS

### Syntax and operation

```text
NewsCommand ::= "NEWS"

operation ReadNews(captain: CaptainId)
    on GameState -> Finished | Stopped | Unavailable
```

NEWS is available before commissioning and during play, including under RED
alert. Trailing command arguments do not select a section or answer a later
continuation prompt. Failure to open the news content yields `Unavailable`
and the diagnostic `Can't read DECWAR.NWS`.

### Observations and state effects

Display the news content in its supplied order, using the text and continuation
boundaries defined by [the news binding](information.md#news-content). At each
continuation boundary, enable terminal output and prompt:

`Do you want to continue viewing the news file? `

Obtain a reply through ordinary command-input continuation. A slash-separated
remainder, such as YES in `NEWS / YES`, can supply it without another physical
line. A YES match, including an ordinary accepted abbreviation, continues; every other reply stops viewing. The separator dot itself is not
part of the displayed news. End of content yields `Finished`; refusal or a
stop control yields `Stopped`.

Ctrl-C or the output-stop control stops viewing at a line boundary. Clear those
controls on exit and restore command input. News output counts as activity for
a commissioned ship. NEWS does not start HELP's temporary sector state: the
ship remains present normally, subject to ordinary concurrent world events.

NEWS changes no resources or scores and completes no turn. Elapsed time spent
reading does not stop other captains or make the reader immune to attacks.

**Source basis:** [NEWS](../../legacy/utexas/WARMAC.MAC#L3811),
[supplied news](../../legacy/utexas/HLP/DECWAR.NWS).

## GRIPE

### Syntax and operation

```text
GripeCommand ::= "GRIPE"

operation SubmitFeedback(captain: CaptainId)
    on GameState -> Recorded | Cancelled
                 | Rejected(RedAlert) | StorageFailure
```

GRIPE is available before commissioning and during play. If the acting ship is
under RED alert, reject without beginning feedback input or changing its activity.
Otherwise begin the temporary information activity defined in the session rules.
Trailing command tokens do not supply the feedback body.

### Input and observations

Prompt `Enter gripe, end with ^Z` and acquire lines using the ordinary line
editor. Preserve the acquired characters and their case. Input ends at Ctrl-Z
or after twenty lines. Ctrl-C cancels the submission.

After the eighteenth complete line, report `[Only 2 more message lines allowed]`.
After the twentieth, report `[Too many lines -- end of gripe]` and finish input
without another line prompt. Complete lines have line endings in the feedback
record. A nonempty final line terminated by Ctrl-Z also receives a line ending.

An immediate Ctrl-Z with no characters or preceding lines cancels an empty
submission. Earlier complete blank lines still count as submitted lines; they
do not turn a later Ctrl-Z into the immediate-empty case. Completing input counts
as activity for a commissioned ship.

### State effects and completion

Successful recording adds a new feedback record ahead of every existing record,
leaving their relative order unchanged:

```text
after(feedbackRecords)
    == [newRecord] followed by before(feedbackRecords)
```

The record contains session metadata, the acquired body and a closing separator,
as defined in [feedback records](information.md#feedback-records). It does not
change gameplay scores or create a radio message. Recording charges no energy
and completes no turn.

If the feedback resource is being modified, report the retry diagnostic and
retry after three seconds. Ctrl-C during this wait cancels. An open or old-record
read failure produces its corresponding diagnostic and returns `StorageFailure`.
A failed write also produces a diagnostic and is not a `Recorded` outcome; its effect on partially written
persistent content remains a storage-binding question. Insufficient resources
while acquiring or assembling a body can produce further diagnostics; whether
a partial record is subsequently retained remains an unresolved failure case.

On every return after input begins, restore terminal output, end the temporary
information activity and clear the input-cancellation condition. Return to
command acquisition in the same session phase. Cancellation before recording
adds no feedback record.

**Source basis:** [GRIPE input](../../legacy/utexas/WARMAC.MAC#L3858),
[recording and cleanup](../../legacy/utexas/WARMAC.MAC#L4050),
[line limit and retry interval](../../legacy/utexas/WARMAC.MAC#L470),
[record header](../../legacy/utexas/WARMAC.MAC#L2116).

## QUIT

### Syntax and operation

```text
QuitCommand ::= "QUIT"

operation Quit(captain: CaptainId)
    on GameState -> SessionEnded | Continued
```

Before commissioning, QUIT ends the session without confirmation or a ship-score
report. It does not obtain or release an active commission on that path.

During play, discard pending command input and request confirmation with the
ordinary `Do you really want to quit? ` prompt. Read a new reply; YES under the ordinary
keyword-matching rule confirms. Every other reply yields `Continued` and resumes
command acquisition. Thus `QUIT YES` on a single acquired line does not itself
confirm quitting. If the connection is already lost, bypass confirmation and
follow the accepted-quit path.

### Accepted state effects and observations

Display final POINTS for the acting ship, both factions and, when enabled, the
Romulan. The report reads committed scores under the POINTS rules; QUIT is not
an additional turn that commits pending score or triggers automatic defenses.

Then perform [ReleaseCommission](session-rules.md#releasing-a-commission) and
end the session. The result is `SessionEnded`. Other captains remain in their
current sessions; quitting is not a world-termination command. If this was the
last commission, the shared world-retention rule applies.

A declined confirmation has no release, score, energy-charge or turn consequence. Discarded command input is not restored. Final ratios with zero denominators and the complete behavior of a
reporting failure remain unresolved with the score/environment binding.

**Source basis:** [confirmation](../../legacy/utexas/DECWAR.FOR#L134),
[final score and exit](../../legacy/utexas/DECWAR.FOR#L290),
[release](../../legacy/utexas/DECWAR.FOR#L1082),
[pregame exit](../../legacy/utexas/SETUP.FOR#L112).
