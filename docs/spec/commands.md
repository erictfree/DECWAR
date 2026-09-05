# Commands and their meaning

This chapter uses the quantities and pseudocode notation of [the abstract
model](language-model.md). The resource, radio and scan/report commands below
are the first converted families;
the remaining command families are still being rewritten from the source analysis.

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

`ReleaseTractorBeam` denotes the game operation that ends towing; its complete
state changes and notifications will be defined in the tractor-beam rules.
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
        knowledge.knownEnemyBases :=
            knowledge.knownEnemyBases union {base.id}
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
