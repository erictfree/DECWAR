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

### Syntax and prerequisites

```text
CaptureCommand ::= "CAPTURE" [Location]
```

Location supplies exactly two coordinate items. Missing input prompts for
coordinates; an empty continuation cancels. The target must be within one
sector, must be a planet, and must not already belong to the acting team.
Invalid targets produce the relevant target/range/ownership diagnostic.

At entry set the deadline to `now + 5000 milliseconds`. Attempt the shared
planet-update operation before changing ownership. If unavailable, report that
the government refuses to surrender and make no capture changes or turn.

### Ownership, fortification and defense

Save the former owner and number of builds, b. Re-evaluate the former faction's
docking before changing ownership; update the factions' captured-planet counts.
The former owner may be neutral, in which case there is no former-faction count
or score update.

```text
CapturePlanet(ship, planet, formerOwner, b):
    deadline := deadline + b * 1000 milliseconds
    ship.energy := ship.energy - 50 * b energy units
    planet.builds := 0
    planet.owner := ship.team
    end the planet-update operation

    attack := phaser attack from the formerly owned planet
    attack.strength := 50 + 30 * b
    attack.distance := distance(planet.position, ship.position)
    result := apply that attack to ship under the shared phaser rule
    if formerOwner != none:
        add result.reportedDamage to formerOwner's ENEMY_DAMAGE score
        if result.destroyed:
            add 500 points to formerOwner's ENEMY_KILLS score

    emit PlanetCaptured(planet, formerOwner, ship.team)
    notify the capture/defensive-hit audience
    ship.pendingScore[PLANET_CAPTURE] += 100 points
    record remaining delay until deadline
    CompleteTurn(ship, automaticRepair = true)
```

The capture succeeds before the defensive attack. A fortified planet costs 50
engine-energy units and adds one second to the deadline per build, in addition
to the resulting defensive phaser damage. Resetting construction does not weaken
that attack: it uses the saved b. Even an unfortified neutral planet attacks
with strength 50. The shot uses the former ownership for its attribution.

The defensive hit can destroy the capturing ship. Ownership and capture credit
are not rolled back; the command emits its faction-specific death report and
still follows normal turn completion before subsequent lifecycle handling.

The final hit notification is available to the acting faction within distance
10 of the ship, and to captains of either faction within distance 4. Complete
notification rendering and concurrent audience changes remain under review.

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
