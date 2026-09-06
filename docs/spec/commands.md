# Commands and their meaning

This chapter uses the quantities and pseudocode notation of [the abstract
model](language-model.md) and the [shared world rules](world-rules.md).
All main-game commands have draft clauses; older clauses are being brought into
the same operation-contract form. Their remaining dependencies are identified
in the companion coverage record.

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

```text
operation RaiseShields(actor: ShipId): Result<Raised, ShieldsTooDamaged>
```

Let s be `ship(game, actor)`. The precondition is
`s.devices[SHIELDS].damage <= 300 damage units`. Failure rejects the operation
with the damaged-shields diagnostic and changes none of s's state. Exactly
300 units permits raising shields.

On success, the shield-raising event satisfies:

```text
ensures after(s.shields.mode) == UP
ensures after(s.energy) == max(0 energy units,
                       before(s.energy) - 100 energy units)
```

The charge applies even when `before(s.shields.mode) == UP`. The actor receives
the shields-raised report, followed by release of any beam involving s under
the [tractor-release rule](world-rules.md#tractor-associations). If s.energy is
then zero, the actor also receives the no-energy report. The outcome is Raised.
Shield strength and device damage are unchanged. There is no turn completion
or automatic repair; subsequent command acquisition handles exhausted energy.

### Lowering shields

```text
operation LowerShields(actor: ShipId): Lowered
```

Let s be `ship(game, actor)`. No shield-damage precondition applies.
The effect is `after(s.shields.mode) == DOWN`; the actor receives the
shields-lowered report. Energy, shield strength, device damage and an existing
tractor beam are unchanged. The outcome is Lowered, with no turn completion
or automatic repair.

### Energy transfer

Positive amounts transfer engine energy to shield strength; negative amounts
return shield energy to the engines. Twenty-five energy units correspond to one
percentage point of shield strength. Fractional increases are retained.

```text
operation TransferShieldEnergy(actor: ShipId, requested: Energy): Transferred { amount: Energy } | Cancelled
```

The command's Integer denotes requested energy units. Let s be the acting ship.
First determine the amount limited by shield capacity:

```text
candidate = min(requested,
                25 energy units * (100% - s.shields.strength) / 1%)
```

If candidate is at least s.energy, require a YES confirmation. Any other answer
gives Cancelled and the cancellation report, with no transfer effects. No
shield-device damage precondition applies.

After any required confirmation, let E and S denote s.energy and
s.shields.strength immediately before the transfer. The transfer event satisfies:

```text
amount = max(candidate,
             -25 energy units * S / 1%,
             E - 5000 energy units)
ensures after(s.energy) == E - amount
ensures after(s.shields.strength) == S + amount / (25 energy units) * 1%
ensures after(s.shields.mode) ==
    (after(s.shields.strength) <= 0% ? DOWN : before(s.shields.mode))
ensures after(s.condition) ==
    (after(s.energy) < 1000 energy units ? YELLOW : GREEN)
```

The outcome is Transferred { amount: amount }. The terminal response confirms
the transfer without printing its amount, as specified in
[shield command responses](presentation.md#shield-command-responses).
The confirmation precedes the lower limits on amount. Confirming does not cap
the transfer at available engine energy, so a completed transfer can exhaust
the engines. At exactly 1000 remaining energy units this event sets condition
GREEN. Subsequent command acquisition has its own condition and lifecycle rules.
There is no turn completion or automatic repair.

**OPEN QUESTION:** Changes by other actors during the confirmation interval still need
a complete multiplayer contract. The equations do not make that interval an
indivisible transaction.

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
ordinary first-match rule. Non-name input repeats that prompt; an empty answer
cancels. An unknown name rejects with its diagnostic. The selected roster ship
need not be commissioned. Naming the acting ship causes no change or confirmation.

### Operations and state effects

```text
operation RadioOn(actor: CaptainId): Enabled
operation RadioOff(actor: CaptainId): Disabled
operation Gag(actor: CaptainId, sender: ShipId): Gagged | Unchanged
operation Ungag(actor: CaptainId, sender: ShipId): Ungagged | Unchanged
```

Let c be `captain(game, actor)`. The command acts on the radio preferences
`c.radio`, not on the ship's radio-device damage. None of these operations has
a device-damage precondition.

| Operation | State effect |
| --- | --- |
| RadioOn | `after(c.radio.enabled) == true` |
| RadioOff | `after(c.radio.enabled) == false` |
| Gag | `after(c.radio.gaggedSenders) == before(c.radio.gaggedSenders) union {sender}` |
| Ungag | `after(c.radio.gaggedSenders) == before(c.radio.gaggedSenders) minus {sender}` |

For Gag and Ungag, `sender == c.ship` instead gives Unchanged with no state
effect or confirmation. Otherwise each operation gives its named outcome and
confirmation, even if the requested setting already holds. The gag confirmations
identify the selected ship.

Gagging does not alter `c.radio.enabled`; switching the radio on or off does not
alter `c.radio.gaggedSenders`. These operations cost no energy and complete no
turn or automatic repair. Their effects on outgoing recipient selection and
incoming delivery are defined in [radio communication](communication.md).

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

### Operation and preconditions

Energy can be sent only to another commissioned ship on the same team, within
one sector. Ten percent of the transmitted energy is lost. The recipient's
5000-unit capacity limits how much is actually sent; the sender is charged only
for that transfer and its loss.

```text
operation TransferEnergy(actor: ShipId, target: ShipId,
                         requested: Energy):
    Result<Transferred { received: Energy, charged: Energy }, EnergyRejection>

type EnergyRejection = CannotTransferToSelf | ShipNotInGame
                | CannotTransferToEnemy | RecipientNotAdjacent
                | InsufficientEnergy | AmountMustBePositive
```

Let s be `ship(game, actor)` and r be `ship(game, target)`. Check, in order:

1. `r.id != s.id`; otherwise CannotTransferToSelf.
2. `r.commissioned == true`; otherwise ShipNotInGame.
3. `r.team == s.team`; otherwise CannotTransferToEnemy.
4. `distance(s.position, r.position) <= 1`; otherwise RecipientNotAdjacent.
5. `requested < s.energy`; otherwise InsufficientEnergy.
6. `requested > 0 energy units`; otherwise AmountMustBePositive.

At the adjacency step, s.position and r.position must be present; distance
uses their contained Position values. This requirement belongs to that step,
not to the earlier identity, commission or faction checks. An earlier rejection
therefore does not require a recipient position. If either position is absent
when adjacency is reached, this contract defines no continuation; it does not
substitute an outside-galaxy coordinate or a new rejection. The checks do not
promise protection against concurrent release of a commission.

A failed check gives Rejected with the corresponding diagnostic and no transfer
effects. Validation compares the requested amount with the sender's energy
before applying the recipient's capacity limit.
Requesting all remaining energy therefore fails even if the recipient has room
for only a small part of it.

### Successful state effects and completion

The transfer event satisfies:

```text
received = min(0.9 * requested,
               5000 energy units - before(r.energy))
charged = received / 0.9
ensures after(s.energy) == before(s.energy) - charged
ensures after(r.energy) == before(r.energy) + received
```

The outcome is Transferred { received: received, charged: charged }. The actor receives the transfer
report; publish EnergyReceived with the actor, target and received amount to
the recipient, as defined in [combat observations](communication.md#observation-values).
A recipient already at capacity produces a successful zero-amount transfer,
with no energy deducted.

There is no stardate advance, automatic repair or direct condition change.
Subsequent command acquisition may update condition from the new energy level.

**Source basis:** [ENERGY](../../legacy/utexas/DECWAR.FOR#L1009).

## DOCK

### Syntax

```text
DockCommand ::= "DOCK" ["STATUS" {StatusItem} | "ALL"]
```

STATUS is recognized only as the first argument. Its remaining arguments use
the STATUS report rules. Other arguments do not prevent docking and do not
request a report.
ALL as the first argument selects full automatic device repair on successful
completion. Its usual abbreviations also match. Other trailing tokens do not
prevent docking; ALL after STATUS does not select full repair.

### Operation and preconditions

```text
operation ReplenishAtDock(actor: ShipId):
    Result<Docked, NoAdjacentFriendlyInstallation>
    | CommissionEnded
```

Each surviving friendly base within one sector contributes two supply shares.
Friendly planets are considered only when the faction's maintained captured-planet
count is positive; each such planet within one sector contributes one share.
With no shares the
command fails without replenishment or a turn. If the commission ends before
replenishment, the outcome is CommissionEnded without these changes.
Let s be `ship(game, actor)` and w be `world(game)`:

```text
bases = {b in w.bases where b.team == s.team
         and b.strength > 0% and distance(b.position, s.position) <= 1}
planets = {p in w.planets where w.capturedPlanetCounts[s.team] > 0
           and p.owner == s.team
           and distance(p.position, s.position) <= 1}
shares = 2 * count(bases) + count(planets)
```

Here braces describe a set of the matching entities. The base scan has no
maintained-base-count guard: positive-strength nearby friendly records contribute
even if the maintained base count is temporarily zero. The planet count guard
is not replaced by a fresh count of friendly records. The share check precedes
the commission check. No adjacent installation gives its diagnostic and Rejected;
an ended commission is handled by the session rules.

### Successful state effects

At replenishment, the effects are:

```text
hullRepair = 50 damage units * shares
             * (before(s.docked) ? 2 : 1)
ensures after(s.torpedoes) == min(10, before(s.torpedoes) + 5 * shares)
ensures after(s.energy) == min(5000 energy units,
                       before(s.energy) + 500 energy units * shares)
ensures after(s.shields.strength) == min(100%,
                                before(s.shields.strength) + 10% * shares)
ensures after(s.hullDamage) == max(0 damage units,
                           before(s.hullDamage) - hullRepair)
ensures after(s.docked) == true
ensures after(s.lifeSupportReserve) == 5
ensures after(s.condition) == GREEN
```

The outcome is Docked and the actor receives the docking report. Repeated
docking repairs twice as much `s.hullDamage` as docking from an undocked state.
Replenishment does not change `s.shields.mode` or `s.devices[d].damage` for any
device d. Device repair occurs separately during turn completion.

### Completion and time

At command entry, set a deadline to the current elapsed time plus
`(w.pacingClass + 1) * 1000 milliseconds`. After replenishment, emit the
optional STATUS report and record the remaining delay to that deadline.
Successful docking completes a turn with automatic device repair, as defined
in [turn completion](turns.md), using ALL_DEVICES when its first argument
matches ALL and STANDARD otherwise. That completion still occurs when reporting has
already used up the delay. Failure before replenishment does not complete a turn.

**Source basis:** [DOCK](../../legacy/utexas/DECWAR.FOR#L893),
[completion](../../legacy/utexas/DECWAR.FOR#L80),
[automatic repair selection](../../legacy/utexas/DECWAR.FOR#L3209).

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
or ALL, otherwise as the first argument, subject to the all-undamaged ALL
exception below. Unrecognized arguments do not create
a general syntax error or an additional prompt. Device selectors follow the
DAMAGES rules.

### Shared device-repair operation

```text
operation RepairDevices(actor: ShipId, amount: Damage): DevicesAdjusted
```

Let s be `ship(game, actor)`. For every device d in Device, the repair event
satisfies:

```text
ensures after(s.devices[d].damage) == max(0 damage units,
                                 before(s.devices[d].damage) - amount)
```

This operation adjusts all nine DeviceState values independently. It leaves
`s.hullDamage`, `s.energy`, `s.shields.mode` and `s.shields.strength` unchanged.
It produces no report, delay or turn by itself. Both explicit REPAIR and
[automatic repair](turns.md#automatic-repair) use this contract.

### Explicit repair and completion

```text
type RepairRequest = Default | All | Amount { value: Damage }

operation ExplicitRepair(actor: ShipId, request: RepairRequest): Repaired { amount: Damage } | NothingToRepair
```

The command's Integer denotes the value for Amount. ALL denotes All; absence
of either denotes Default. Let s be the acting ship and let
`maximum = max(s.devices[d].damage for d in Device)`.

If maximum is zero, the outcome is NothingToRepair, with no device adjustment,
repair deadline or turn. Otherwise select the amount:

| Request | Amount |
| --- | --- |
| Default | `min(maximum, 100 damage units)` if s.docked, otherwise `min(maximum, 50 damage units)` |
| All | maximum |
| Amount { value: value } | `min(maximum, value)` |

Before the repair event, establish a deadline of now plus amount times the
repair rate. The rate is 40 milliseconds per damage unit if s.docked, otherwise
80. Apply RepairDevices(actor, amount); the outcome is Repaired { amount: amount }.

An accepted DAMAGE suffix produces its selected report after device adjustment,
or after determining NothingToRepair. One acceptance exception applies: when
maximum is zero, `REPAIR ALL DAMAGE` does not recognize its DAMAGE suffix.
An explicit integer or omitted amount still permits that suffix when maximum
is zero.

After any report, positive time remaining to the deadline selects turn completion
with automatic repair. If there is no deadline or its time has already elapsed,
there is no turn completion or automatic repair. Thus the repair and report's
elapsed time reduces the delay; a turn adds a further automatic device repair.
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

### Operation and observation types

```text
enum ScanVerb = SCAN | SRSCAN
enum ScanDirection = UP | DOWN | RIGHT | LEFT | CORNER

type ScanRequest = {
    verb: ScanVerb;
    direction: Optional<ScanDirection>;
    extents: List<integer> containing zero to two values;
    warning: Boolean;
};

type ScanMark = EmptySpace | BlankSpace | ShipMark { ship: ShipId }
         | BaseMark { team: Team } | RomulanMark
         | PlanetMark { owner: Optional<Team> } | StarMark | WarningMark

type ScanRow = {
    vertical: Coordinate;
    cells: List<ScanMark>;
};

type ScanReport = {
    bounds: Rectangle;
    rows: List<ScanRow>;
};

operation Scan(actor: ShipId, request: ScanRequest): ScanOutcome

type ScanOutcome = Reported { report: ScanReport }
            | Interrupted { partial: ScanReport } | RejectedSyntax
```

Let s be `ship(game, actor)` and w be `world(game)`. The actor must have a
position. Save that position as origin when computing the bounds; both bounds
and discovery range use that same origin. The terminal binding supplies
terminalWidth, a positive integer count of character columns. A request with CORNER and fewer than two extent values
is rejected; malformed input has the same RejectedSyntax outcome. Rejection
produces a syntax diagnostic, performs no discovery and completes no turn.

The report contains observations, not copies of the objects at those sectors.
Its rows are in decreasing vertical order. A row's cells are in increasing
horizontal order, with one mark per sector from bounds.minHorizontal through
bounds.maxHorizontal. A complete report includes every row of its inclusive
bounds. An interrupted report contains only the rows emitted so far.

### Spatial bounds

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
function BoundScan(position: Position, up: integer, down: integer,
                    right: integer, left: integer): Rectangle {
    up = clamp(up, 0, 10);
    down = clamp(down, 0, 10);
    right = clamp(right, 0, 10);
    left = clamp(left, 0, 10);
    return Rectangle {
        minVertical: max(1, position.vertical - down),
        maxVertical: min(75, position.vertical + up),
        minHorizontal: max(1, position.horizontal - left),
        maxHorizontal: min(75, position.horizontal + right)
    };
}
```

`clamp(value, lower, upper)` means `min(upper, max(lower, value))`.
The resulting inclusive rectangle always contains the acting ship's sector.
This spatial calculation is independent of the output's SHORT or LONG format.

### Knowledge and result

First observe the sectors in the resulting rectangle. Empty sectors give
EmptySpace; black holes give BlankSpace; other SectorObject alternatives give
the corresponding mark above. A ship mark identifies its roster ship. A base
mark gives only faction; a planet mark gives only ownership. Scanning does not
disclose their strength, builds, damage or captain metadata.

The scan then discovers all planets and surviving enemy bases within distance
10 of origin,
including those outside the displayed rectangle. Discovery belongs to the
acting team, so other captains on that team can use it.

```text
let knowledge: TeamKnowledge = w.knowledge[s.team];
for (each planet within distance 10 of origin) {
    knowledge.knownPlanets =
        knowledge.knownPlanets union {planet.id};
}
for (each surviving enemy base within distance 10 of origin) {
    knowledge.knownBases =
        knowledge.knownBases union {base.id};
}
```

With WARNING, enemy planets considered by that discovery step mark a square
danger area of radius 2; enemy bases mark radius 4. Clip each area to the scan
rectangle. For each considered enemy installation, observe sectors in that
clipped area again. An empty sector gives WarningMark; an occupied sector keeps
the mark for its currently observed object. In particular a black hole remains
BlankSpace, not WarningMark. Neutral and friendly planets do not create warning
areas. Ordinary scans do not mark these areas.
Planet discovery precedes base discovery; enemy bases are considered in their
faction's baseOrder. Each warning area is processed with its installation's
discovery, before continuing to the next installation.

The discovery and warning steps finish before rows are emitted. Therefore a
scan interrupted during row output retains all the discovery already performed.
At a row boundary, an observed scan-interruption request stops further rows and
omits the bottom axis labels, consumes that scan-interruption request and gives
Interrupted { partial: partial }. The just-emitted row is included. Otherwise emit the
bottom labels and give Reported { values: report }.

Initial sector observations visit increasing vertical and then horizontal
coordinates. Warning areas are reconsidered during installation discovery,
and emitted rows run in decreasing vertical order. Thus a scan need not be a
single simultaneous snapshot; changing objects can be observed at different
times. The full control-delivery and concurrent-installation contract remains
open, including interruption before row output begins.

Scanning changes only the acting faction's installation knowledge. It costs no
energy, repairs no device and completes no turn. Scan marks have the following
terminal representations; other clients may render the same observations in
their own presentation binding:

| Mark | LONG scan pair | SHORT scan character |
| --- | --- | --- |
| EmptySpace | space then `.` | `.` |
| BlankSpace | two spaces | space |
| ShipMark | space then roster initial | roster initial |
| BaseMark { team: FEDERATION } | `<>` | `>` |
| BaseMark { team: EMPIRE } | `)(` | `(` |
| RomulanMark | `??` | `?` |
| PlanetMark { owner: none } | space then `@` | `@` |
| PlanetMark { owner: FEDERATION } | `@F` | `F` |
| PlanetMark { owner: EMPIRE } | `@E` | `E` |
| StarMark | space then `*` | `*` |
| WarningMark | space then `!` | `!` |

Scan style is the captain's scanStyle preference; it is independent of the
SCAN/SRSCAN verb and outputLength. Each row has its two-column vertical label
on both sides, with one separating space on each side of the cells. Horizontal
labels occur above and below the grid: LONG starts at the minimum horizontal
coordinate and labels every second column; SHORT starts one column after that
minimum and labels every third. The initial horizontal label is always emitted,
even when a one-column SHORT scan puts that label beyond the last displayed
column. The label does not add a sector to the result. Labels omit leading
zeroes. [Scan-grid presentation](presentation.md#scan-grids) defines their complete
line composition; delivery of interruption controls remains part of the binding work.

The core does not define a player-controlled cloaking operation. Observations
of sector states outside the declared SectorObject model remain outside this
normal-state contract; they do not introduce a new ship ability.

**Source basis:** [SCAN/SRSCAN](../../legacy/utexas/DECWAR.FOR#L3527),
[sector observations and symbols](../../legacy/utexas/WARMAC.MAC#L2350),
[warning marks](../../legacy/utexas/WARMAC.MAC#L2412),
[row output and axes](../../legacy/utexas/WARMAC.MAC#L2482).

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

```text
enum RadioState = DAMAGED | ON | OFF

type StatusObservation = StardateValue { value: Stardate }
    | ShieldValue { mode: ShieldMode, strength: Percentage, equivalentEnergy: Optional<Energy> }
    | LocationValue { position: Position }
    | ConditionValue { condition: Condition, docked: Boolean }
    | TorpedoValue { count: integer } | EnergyValue { value: Energy }
    | HullDamageValue { value: Damage } | RadioValue { state: RadioState }
    | InvalidStatusItem

operation ReportStatus(actor: ShipId, arguments: List<Token>): List<StatusObservation>
```

Token and its categories are defined in the [lexical rules](lexical.md).
Let s be `ship(game, actor)` and c its captain. The actor must have a position.
The result is the ordered sequence of observations emitted, including any
InvalidStatusItem diagnostics among successful items. It is not an all-or-nothing
success or rejection. Empty arguments select the full report; a first token of
another category instead stops without selecting that default.

| Item | Information reported |
| --- | --- |
| SHIELDS | ShieldValue from s.shields.mode and s.shields.strength. With MEDIUM or LONG output, equivalentEnergy is 25 energy units per percentage point of strength; with SHORT it is none. |
| LOCATION | LocationValue from s.position, absolute regardless of c.outputCoordinates. |
| CONDITION | ConditionValue from s.condition and s.docked. |
| TORPEDO | TorpedoValue from s.torpedoes. |
| ENERGY | EnergyValue from s.energy. |
| DAMAGE | HullDamageValue from s.hullDamage; not a sum of device damage. |
| RADIO | RadioValue is DAMAGED when radio-device damage is at least 300; otherwise ON or OFF according to c.radio.enabled. |

The radio test reads `s.devices[RADIO].damage`, in damage units. It does not
change c.radio.enabled. The full report's initial StardateValue reads s.stardate.
Each repeated valid item produces another observation. InvalidStatusItem emits
the syntax diagnostic, then processing resumes with the next token.

STATUS observes state without changing it, charging energy or completing a turn.
The report need not be a simultaneous snapshot of all fields; concurrent changes
between observations belong to the multiplayer rules. Output labels, numeric
formatting and line assembly follow the [status presentation](presentation.md#status-reports).

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
type DeviceDamageRow = {
    device: Device;
    damage: Damage;
};

enum DamageReportStyle = SELECTED | GENERAL

type DamageReport = AllDevicesFunctional
    | Rows { style: DamageReportStyle, titleObject: Optional<SectorObject>, values: List<DeviceDamageRow> }

operation ReportDamage(actor: ShipId, arguments: List<Token>): DamageReport
```

Let s be `ship(game, actor)`. The actor must have a captain and position.
The report uses this device order:

```text
deviceOrder = [SHIELDS, WARP_ENGINES, IMPULSE_ENGINES, LIFE_SUPPORT,
               TORPEDO_TUBES, PHASERS, COMPUTER, RADIO, TRACTOR_BEAM]
```

Selector spellings in the syntax correspond to these values in that order.
Token categories follow the lexical chapter.

```text
if (no device has positive damage) {
    emit AllDevicesFunctional;
    return AllDevicesFunctional;
}
let titleObject: Optional<SectorObject> = none;
let style: DamageReportStyle;
if (the first argument is a name-category token) {
    style = SELECTED;
    for (each argument until a non-name-category token) {
        for (each matching DeviceSelector in displayed order) {
            emit DeviceDamageRow { device: device, damage: s.devices[device].damage };
        }
    }
} else {
    style = GENERAL;
    if (captain(game, s.captain).outputLength == LONG) {
        titleObject = sector(game, s.position);
    }
    for (each device in displayed order) {
        if (s.devices[device].damage > 0 damage units) {
            emit DeviceDamageRow { device: device, damage: s.devices[device].damage };
        }
    }
}
return Rows { style: style, titleObject: titleObject, values: the emitted rows in order };
```

An unmatched selector is silently skipped. Explicit matches report zero damage
as well as positive damage when at least one device is damaged. With no damaged
devices, the all-functional response takes precedence over all selectors.
Reports can repeat a device when the supplied selectors match it more than once.

The general LONG title records the object at that position when its heading is observed, before its row values.
Here none denotes an empty sector; for other report forms titleObject is unused
and none. The title is not unconditionally the actor's ship. The initial damage
test, title and rows need not form one simultaneous snapshot.

DAMAGES changes no state, consumes no energy and completes no turn. Labels,
headings and field widths follow the [device-damage presentation](presentation.md#device-damage-reports).

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

### Engagement operation and preconditions

```text
operation EngageTractor(actor: ShipId, target: ShipId):
    Result<Engaged { beam: TractorBeamId }, TractorRejection>

type TractorRejection = BeamAlreadyActive | CannotTractorSelf
                 | CannotTractorEnemy | ShipNotInGame
                 | TargetNotAdjacent | TargetAlreadyInBeam
                 | LowerOwnShields | TargetShieldsRaised
```

Let s be `ship(game, actor)` and r be `ship(game, target)`. For a name argument,
the command first checks `s.tractorBeam == none`; failure reports BeamAlreadyActive
before attempting name resolution. Otherwise it resolves the first matching
roster name. An unknown name rejects with its diagnostic. For a resolved name,
the remaining conditions are checked in order:

1. `r.id != s.id`; otherwise CannotTractorSelf.
2. `r.team == s.team`; otherwise CannotTractorEnemy.
3. `r.commissioned == true`; otherwise ShipNotInGame.
4. `distance(s.position, r.position) <= 1`; otherwise TargetNotAdjacent.
5. `r.tractorBeam == none`; otherwise TargetAlreadyInBeam.
6. `s.shields.mode == DOWN`; otherwise LowerOwnShields.
7. `r.shields.mode == DOWN`; otherwise TargetShieldsRaised.

At the adjacency step, both optional positions must be present, and distance
uses their contained Position values. Earlier self, faction and commission
rejections do not read the target's position. If either position is absent when
adjacency is reached, no continuation is defined here; TargetNotAdjacent is the
result of a failed distance test, not an invented missing-position diagnostic.
Concurrent removal between checking commission and using position is not made
atomic by these requirements.

A failed condition gives Rejected with its corresponding diagnostic and no
engagement effects. Neither ship's `devices[TRACTOR_BEAM].damage` is an
engagement precondition. The checks of faction and commission have the displayed
order: an uncommissioned enemy is diagnosed as an enemy.

### Successful state effects

Engagement establishes a new TractorBeam b with a distinct identity. Let w be
`world(game)`. The engagement event satisfies:

```text
b.endpoints == {s.id, r.id}
ensures after(w.beams) == before(w.beams) union {b}
ensures after(s.tractorBeam) == b.id
ensures after(r.tractorBeam) == b.id
```

After establishing the association, publish TractorEvent { value: ACTIVATED }
to both endpoints under the combat-notice rules. The outcome is Engaged { beam: b.id };
publication does not guarantee immediate display or add a direct success response. Positions, energy, shields, device damage, condition, docking and
stardates are unchanged. Either endpoint may subsequently move using the same
association; engagement does not choose a permanent towing ship.

### Release and completion

A release requested by OFF or by the no-argument form with an existing beam
invokes [ReleaseTractorBeam](world-rules.md#release). With no beam, OFF instead
reports that none is in use and changes no state. No TRACTOR outcome charges
energy or completes a turn or automatic repair.

**OPEN QUESTION:** Simultaneous engagements involving a shared endpoint still need a
complete resolution rule. The successful relationship above does not establish
that the input and validation sequence is indivisible.

**Source basis:** [TRACTR and TRCOFF](../../legacy/utexas/DECWAR.FOR#L4432).

## MOVE and IMPULSE

### Syntax

```text
MoveCommand    ::= "MOVE" [Location]
ImpulseCommand ::= "IMPULSE" [Location]
```

Location uses the absolute, relative or computed forms in the coordinate grammar,
with exactly two resulting coordinate items. The propulsion check below precedes
coordinate acquisition. Resolve the original arguments with Exactly { count: 2 }.
An Empty result enters coordinate prompting: call ReadLocations with that same
limit until it returns a resolved position, a rejection or Cancelled. In this
initial acquisition, a mode-only reply such as ABSOLUTE gives Empty and repeats
the coordinates prompt; a genuinely zero-token reply gives Cancelled.

A resolved location equal to the current sector emits fragment(error2) for SHORT
or MEDIUM output, or fragment(error1) for LONG output, then requests coordinates
again. A resolved replacement is checked for zero displacement again. A rejected
resolution or Cancelled ends the command without movement. The original pacing
deadline and potential overheating-damage draw are retained throughout coordinate
prompting; prompting does not restart the deadline or repeat that draw.

Each continuation resolves its own mode, using the captain's input-coordinate
preference when it has no mode keyword. A mode written on an earlier line is
not retained as a temporary preference. Thus MOVE ABSOLUTE followed by a numeric
continuation can use relative coordinates when that is the captain's preference.
The mode keyword itself does not change that preference.

**OPEN QUESTION:** A mode-only, zero-item result at the special prompt after an
own-sector target is distinct from Empty during initial acquisition. That path's
next destination is not established by a LocationValues value. It remains
unspecified here; it neither authorizes a fabricated destination nor establishes
ordinary rejection or another prompt. A zero-token reply at either site cancels.

### Operation and initial precondition

```text
enum Propulsion = WARP | IMPULSE

operation Move(actor: ShipId, destination: Position, mode: Propulsion): MovementOutcome

type MovementOutcome =
    Result<Moved { position: Position } | Obstructed { position: Position, at: Position }, MovementRejection>
    |  Cancelled
    | CommissionEnded

type MovementRejection = WarpUnavailable | ImpulseUnavailable
                  | WarpRangeExceeded | DamagedWarpRangeExceeded
                  | ImpulseRangeExceeded | InvalidLocation
```

MOVE selects WARP and IMPULSE selects IMPULSE. The signature identifies the
semantic inputs; the command acquires destination only after its initial check.
Let s be `ship(game, actor)` and w be `world(game)`:

```text
WARP:    s.devices[WARP_ENGINES].damage < 300 damage units
IMPULSE: s.devices[IMPULSE_ENGINES].damage < 300 damage units
```

Failure gives the corresponding unavailable-propulsion rejection and diagnostic,
without asking for coordinates, changing ship state or completing a turn.
On passing the check, establish a deadline of
`now + (w.pacingClass + 1)*1000 milliseconds` and select potentialDamage as
`IntegerDraw(4000)/10` damage units. This damage is applied only on overheating.
Coordinate cancellation or rejection before accepting a nonzero displacement
has no movement effects or turn completion.

### Departure and range

Accepting a nonzero displacement begins departure. This event satisfies:

```text
ensures after(s.condition) == GREEN
ensures after(s.docked) == false
```

Define the displacement and intended distance:

```text
displacement = destination - s.position
d = distance(s.position, destination)
```

If
`s.devices[COMPUTER].damage >= 300 damage units`, use deflection
`(UnitDraw()-0.5)/2`; otherwise use zero. Then check range:

| Propulsion | Range preconditions, checked in order |
| --- | --- |
| IMPULSE | d must equal 1; otherwise ImpulseRangeExceeded. |
| WARP | d must be at most 6; otherwise WarpRangeExceeded. Then, if `s.devices[WARP_ENGINES].damage > 0 damage units`, d must be at most 3; otherwise DamagedWarpRangeExceeded. |

A range rejection gives its diagnostic and retains GREEN condition and undocking.
It changes neither position nor energy and completes no turn. Thus a rejected
range differs from a rejected propulsion device or invalid coordinate input.

### Overheating

For WARP at distance 5 or 6, emit the speed-risk warning and draw q with
IntegerDraw(100). Overheating occurs when `d == 5 and q > 90`, or when
`d == 6 and q > 80`. The overheating event satisfies:

```text
ensures after(s.devices[WARP_ENGINES].damage)
    == before(s.devices[WARP_ENGINES].damage) + potentialDamage
```

The damage report precedes the addition to device damage. Short output omits
the estimated repair-time explanation.
Overheating does not cancel movement or repeat the propulsion/range checks.
Other device damage is unchanged by overheating itself; automatic repair can
subsequently affect all devices during turn completion.

### Traversal, resource cost and relocation

Obtain `trace = TracePath(s.position, displacement, d, deflection)` under the
[sector-path contract](world-rules.md#sector-paths). The energy-charge event
satisfies:

```text
let shieldFactor: integer = (s.shields.mode == UP ? 2 : 1)
let tractorFactor: integer = (s.tractorBeam != none ? 3 : 1)
cost = 4 * d^2 * shieldFactor * tractorFactor energy units
ensures after(s.energy) == before(s.energy) - cost
```

The intended distance determines cost even when an obstruction prevents reaching
the destination. The factors multiply: raised shields and a beam together make
cost six times the unmodified amount. There is no precondition requiring enough
energy to pay the charge, and paying it does not itself cancel relocation.
Subsequent lifecycle rules handle exhausted energy.

If trace.lastClear differs from s.position, relocation satisfies:

```text
ensures after(s.position) == trace.lastClear
```

The former sector becomes empty and trace.lastClear contains PlayerShip { id: s.id }.
After this relocation, an existing
beam invokes [FollowTractorBeam](world-rules.md#following-a-moving-endpoint)
with s.id and trace.step. If s does not change sector, its partner does not move.

With an obstruction, emit the fixed collision-averted response under
[movement presentation](presentation.md#movement-command-responses) and give:

```text
Obstructed { position: trace.lastClear, at: trace.obstruction.position }
```

Otherwise give `Moved { position: trace.lastClear }`. Moved denotes
normal traversal completion; its position can still equal the starting sector
when a galaxy boundary prevents advancement. Neither an obstruction nor a
boundary exit refunds energy. The moving ship precedes its following partner;
the two relocations are not specified as a simultaneous event.

### Completion

Record the time remaining to the deadline after movement and reporting. Normal
movement completes one turn with automatic repair, including an obstructed move
that advances no sectors. If the commission has ended before turn completion
is selected, the outcome is CommissionEnded and session exit takes precedence.
Earlier energy and movement effects are not rolled back on that account.

**OPEN QUESTION:** Concurrent obstruction changes, relocation claims, temporary sector
kinds and crowded or out-of-bounds tractor following still need complete rules.
The ordinary relocation contract applies to the clear destination established
by the trace; it does not grant the actor a reservation while other actions occur.

**Source basis:** [MOVE/IMPULS](../../legacy/utexas/DECWAR.FOR#L2141),
[path](../../legacy/utexas/DECWAR.FOR#L699),
[completion selection](../../legacy/utexas/DECWAR.FOR#L99).

## BUILD

### Syntax

```text
BuildCommand ::= "BUILD" [Location]
```

Location supplies exactly two coordinate items. Missing input prompts for
coordinates; empty continuation cancels and invalid coordinates reject.
At command entry, establish the deadline
`now + world(game).pacingClass*1000 milliseconds + 4000 milliseconds`.
Time spent acquiring the location counts toward that deadline.

### Operation and preconditions

```text
operation Build(actor: ShipId, target: Position): BuildOutcome

type BuildOutcome =
    Result<StageCompleted { planet: PlanetId, builds: integer } | BaseConstructed { base: BaseId }, BuildRejection>
    |  Cancelled
    | GalaxyEnded

type BuildRejection = NotAdjacent | NotAPlanet | NotOwned
               | BaseLimitReached | ConstructionCrewBusy
               | InvalidLocation
```

Let s be `ship(game, actor)` and w be `world(game)`. After resolving a valid
location, check the following in order:

1. `distance(s.position, target) <= 1`; otherwise NotAdjacent.
2. `sector(game, target)` is PlanetObject { id: id }; otherwise NotAPlanet.
   Let p be `planet(game, id)` for the remaining checks.
3. `p.owner == s.team`; otherwise NotOwned.
4. If `p.builds == 4` and `w.baseCounts[s.team] == 10`, give BaseLimitReached.

The fourth check applies only at four builds. These rejections produce their
diagnostics without changing builds or pending points and without completing
a turn. Coordinate cancellation or rejection likewise has no construction
effects. BUILD has no device-damage or minimum-energy precondition.

### Construction-stage event

Let p be the selected planet and b its builds immediately before this event.
The stage event satisfies:

```text
ensures after(p.builds) == b + 1
ensures after(s.pendingScore[BASE_CONSTRUCTION])
    == before(s.pendingScore[BASE_CONSTRUCTION]) + 50 * (b + 1) points
```

If the new build count is not five, report that count and give
StageCompleted { planet: p.id, builds: b + 1 }. The planet's identity, position and ownership are
unchanged. A fifth build instead attempts the base conversion described below.
Pending points are not yet part of the ship's or faction's committed score.

The test is equality with five, not a maximum-build limit. If an earlier failed
conversion left a planet at five builds, a later BUILD advances it to six,
contributes 300 pending construction points and completes an ordinary stage;
it does not retry conversion. No new clamping or retry behavior is implied.

### Fifth-stage conversion

After the fifth stage's build and pending-point changes, attempt to enter the
WORLD_CHANGE coordinated phase. Failed entry gives ConstructionCrewBusy with
no retry. This outcome reports that the construction crew is busy with repairs,
retaining the stage increment and its 250 pending points. It completes no turn.
This phase-entry failure differs from CAPTURE refusal, which precedes its game
changes.

If conversion proceeds, choose the first available identity in
`w.baseOrder[s.team]`. If none is available, give BaseLimitReached and its
diagnostic, restore p.builds to four and retain the 250 pending points.
This later capacity failure completes no turn. It differs from the initial
four-build capacity rejection, which adds no build or points.

**OPEN QUESTION:** Complete phase-entry failure/waiting conditions and concurrent
changes between the capacity checks remain to be specified. The crew report
identifies failed coordination entry; it does not define a new random failure
or player-controlled crew resource.

With an available identity, conversion contributes a further 250 pending
BASE_CONSTRUCTION points and increments w.baseCounts[s.team]. Before planet
removal, transfer the selected planet's discovery to that base identity using
the knowledge rule below, replacing knowledge of the old base at that identity.
It then removes
p through RemovePlanet with the acting captain as viewer and s.team as
formerOwner, decrementing w.capturedPlanetCounts[s.team] before docking
re-evaluation and the world-end check. After that removal returns, it introduces a base n at
that location belonging to s.team. On normal completion:

```text
n.id == selected base identity
n.team == s.team
n.position == p.position
n.strength == 100%
ensures after(w.planets) == before(w.planets) minus {p}
```

The base collection retains its existing identities; the selected entry is now
n. Conversion replaces that entry's former position and strength, rather than
adding a second base with the same identity. The base-count increment precedes
this entry's activation, and can therefore already affect a world-end check.

Remaining planets keep their identities and relative report order. For each
faction, let k denote its TeamKnowledge. The knowledge effects are:

```text
ensures after(k.knownPlanets) == before(k.knownPlanets) minus {p.id}
ensures after(k.knownBases) == (before(k.knownBases) minus {n.id})
    union (p.id in before(k.knownPlanets) ? {n.id} : {})
```

Thus prior discovery of p becomes discovery of n. Reusing a base identity does
not preserve knowledge of the former base at that identity; the converted
planet's discovery determines the new base's visibility. Knowledge of other
installations is unchanged. Neither the new base nor the former planet is an
additional ship or player commission.

Installation removal invokes docking re-evaluation and the world-end check.
If that check ends the galaxy, GalaxyEnded takes precedence over the remaining
construction report and ordinary turn completion. The final score report uses
committed points; the newly pending construction points are not committed by
an additional turn on this path. Session release and exit follow the
[world-termination rules](session-rules.md#world-termination).

If the galaxy continues, give BaseConstructed { base: n.id } and the construction report,
which identifies the acting ship, location and new base. The five normal stages
contribute 1000 points altogether: 50, 100, 150, 200 and 500.

At the world-end check inside planet removal, the fifth stage has contributed
500 pending construction points in total, the acting faction's maintained base
count has increased by one, and the base identity has received the planet's
discovery. The planet has been removed from the planet sequence and the owned
planet count has decreased. The base identity still has its previous position
and nonpositive strength: installation of the new position, 100% strength and
sector presence has not yet occurred. If the check ends the galaxy, BUILD does
not subsequently install that base or emit the construction report. These prior
effects are not rolled back by treating construction as one transaction.

**OPEN QUESTION:** Exact sector observations during removal and concurrent changes
to the selected identities remain unresolved. The completed-conversion equations
above do not define those intermediate sector observations or make conversion
indivisible.

### Completion

BUILD has no direct engine-energy cost. StageCompleted and normal BaseConstructed
complete one turn with automatic device repair, using the time remaining to
the command-entry deadline. Rejected, Cancelled and GalaxyEnded do not complete
that normal turn. Shared world or lifecycle events can have their own effects.

**Source basis:** [BUILD](../../legacy/utexas/DECWAR.FOR#L523),
[planet removal](../../legacy/utexas/DECWAR.FOR#L2864),
[world-end exit](../../legacy/utexas/DECWAR.FOR#L961),
[normal build completion](../../legacy/utexas/DECWAR.FOR#L64).

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
operation Capture(actor: ShipId, target: Position): CaptureOutcome

type CaptureOutcome = Result<Captured { planet: PlanetId }, CaptureRejection> | Cancelled

type CaptureRejection = NotAdjacent | NotAPlanet
                 | AlreadyOwned | SurrenderRefused
```

These outcome names describe semantics; they are not literal terminal messages.
For a resolved target, check the following conditions in order:

1. Its distance from the acting ship is at most one sector.
2. It contains a planet.
3. The planet does not already belong to the acting ship's faction.

Failure gives the corresponding rejection and diagnostic. The diagnostic for
`NotAPlanet` distinguishes the kind of object at the target. After these checks,
attempt to enter the [WORLD_CHANGE coordinated phase](language-model.md#coordination-and-overlapping-operations).
A failed entry gives `SurrenderRefused`, reported as “The planet's government
refuses to surrender.” CAPTURE does not retry that failed entry. The refusal
occurs before discovery updates, captured-planet counts, energy payment,
fortification removal and the defensive attack. Rejection or cancellation makes
no capture changes, incurs no capture energy charge and does not complete a turn.

The adjacency, planet-kind and ownership checks precede phase entry. They are
not repeated after entry. Thus another actor's intervening update is not handled
by an invented second AlreadyOwned or NotAPlanet check. The ordinary successful
contract below concerns the target that remains valid for the prescribed steps.

**OPEN QUESTION:** The coordination binding still needs its complete entry-failure
and waiting conditions; failure is not assigned a timeout or probability here.
Outcomes when simultaneous changes invalidate the target between checks and
updates remain unresolved. Surrender refusal is the failed-entry path, not a
random chance or a new diplomatic mechanic.

### Successful state effects

Let p be the target planet, s the acting ship, t its faction, o the planet's
owner before capture, and b the planet's builds before capture. If o is a faction,
first perform its [docking re-evaluation](world-rules.md#installation-changes-and-world-termination)
using the ownership and installations before capture. At that event p still
qualifies as an adjacent friendly port for o. Capture does not repeat this
re-evaluation after changing ownership, so a ship docked beside p is not
automatically undocked merely because this capture succeeds.

The capture event has these effects:

```text
ensures after(p.owner)  == t
ensures after(p.builds) == 0
ensures after(s.energy) == before(s.energy) - 50 * b energy units
```

The planet's identity and position are unchanged. The capturing faction gains
one in w.capturedPlanetCounts[t]; if o is a faction, first subtract one from
w.capturedPlanetCounts[o]. These count changes follow the former owner's docking
check and precede the defensive attack. Fortifications are
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
by normal turn accounting. Its outcome is `Captured { planet: p.id }` even if the defensive
attack destroys s. Destruction does not restore former ownership or cancel the
capture credit. Subsequent world and lifecycle events have their own effects.

### Observations and completion

After resolving the defense, print the capture report and publish its defensive-hit
notice under the combat-notice rules. A fatal resource state also produces the
faction-specific death report. Direct text and ordering are specified in
[capture responses](presentation.md#capture-responses). The final hit audience
includes the acting faction within distance 10 of the ship and captains of either
faction within distance 4; publication does not guarantee immediate reception.

The capture deadline is command-entry time plus five seconds plus one second
per former build. Time spent supplying coordinates and resolving capture counts
toward that deadline. Only the remaining interval contributes to the command's
completion delay under the shared timing rules.

An accepted capture completes one turn with automatic device repair. The shared
turn rules apply even after a fatal defensive hit; lifecycle handling follows
those rules. The state effects above describe the capture and its defense, not
an exemption from other events in turn completion.

**OPEN QUESTION:** Concurrent audience changes and complete notification rendering still
need their final shared-rule contracts.

**Source basis:** [CAPTUR](../../legacy/utexas/DECWAR.FOR#L600),
[phaser damage](../../legacy/utexas/DECWAR.FOR#L4166),
[turn completion](../../legacy/utexas/DECWAR.FOR#L73).

## PHASERS

### Syntax

```text
PhasersCommand ::= "PHASERS" [PhaserTarget]
PhaserTarget   ::= NumericPhaserTarget | ComputedPhaserTarget
NumericPhaserTarget ::= ["ABSOLUTE" | "RELATIVE"]
                        [Integer] Integer Integer
ComputedPhaserTarget ::= "COMPUTED" [Integer] TargetName
```

The final pair denotes a location; the optional preceding integer is strength.
A computed target supplies the pair from its current position. Coordinate
interpretation and keyword matching follow the ordinary location rules. Default
strength is 200. A lone strength without a target is invalid. Missing arguments
prompt for a target; an empty continuation cancels. These productions describe
resolved forms; the location reader supplies diagnostics for malformed input.

### Operation and ordered validation

```text
operation FirePhasers(actor: ShipId, aim: Position, strength: integer = 200): PhaserOutcome

type PhaserOutcome = Result<Fired { bank: PhaserBank }, PhaserRejection> | Cancelled
type PhaserRejection = PhasersUnavailable | InvalidTarget | OwnSector
                | FriendlyTarget | OutOfRange | InvalidStrength
```

Let s be `ship(game, actor)`, c its captain, and w be `world(game)`.
The signature names the resolved arguments; the command acquires them at the
point specified below. Input failure and cancellation have no firing effects
and complete no turn. Ordered validation is part of the operation's meaning:

1. Before reading coordinates, require
   `s.devices[PHASERS].damage < 300 damage units`; otherwise PhasersUnavailable.
2. Acquire aim and strength using the grammar and continuations above.
3. Select bank: SECOND if `c.phaserReady[SECOND] < c.phaserReady[FIRST]`,
   otherwise FIRST. Let ready be that bank's selected deadline.
4. Identify `sector(game, aim)`. It must contain PlayerShip, Starbase,
   PlanetObject or RomulanObject. A PlayerShip must be commissioned.
   Otherwise reject with InvalidTarget.
5. If aim equals s.position, reject with OwnSector. If the identified ship,
   base or planet belongs to s.team, reject with FriendlyTarget. If its
   Chebyshev distance from s.position exceeds ten, reject with OutOfRange.
6. Wait until ready. Then require `50 <= strength <= 500`;
   otherwise reject with InvalidStrength.

An aim at a neutral planet passes the faction check. Let target denote the
identified entity and distance the range calculated during validation. The bank
is selected once; the command does not alternate banks independently of their
deadlines. Rejection leaves both deadlines unchanged, costs no firing energy
and completes no turn. InvalidStrength may nevertheless follow a wait.

**OPEN QUESTION:** Target movement, disappearance or replacement during the wait and
interrupting that wait require the multiplayer/control contract. This clause
does not introduce automatic retargeting or a second device-availability check.

### Firing and heat

With s.shields.mode UP, firing costs an additional 200 energy units for shield
control. The shield mode stays up. The command does not require sufficient
s.energy for this charge or for the later firing charge.

```text
if (s.shields.mode == UP) {
    if (c.outputLength != SHORT) {
        emit the shield-control notice;
    }
    s.energy -= 200 energy units;
}
if (IntegerDraw(100) * strength > 18900) {
    emit PhasersOverheated;
    addedDamage = 75 + 0.0075 * IntegerDraw(100) * strength;
    s.devices[PHASERS].damage += addedDamage damage units;
}
```

The overheating test consumes its IntegerDraw(100) even when the selected
strength makes overheating impossible. For example, strength 50 still reaches
that test. The additional damage draw occurs only when the test succeeds.
Do not omit the first draw by simplifying the inequality before sampling.

Overheating does not abort the shot. The new damage participates in this shot's
damage calculation and in the bank's next readiness deadline.

### Target effect

| Target | Effect |
| --- | --- |
| PlayerShip or Starbase | Apply the [shared phaser-damage rule](world-rules.md#phaser-impact), including shields, critical hits and pending score for actor. |
| RomulanObject | Apply the [Romulan phaser-damage and score rule](world-rules.md#damage-to-the-romulan). |
| Neutral or opposing PlanetObject | If `IntegerDraw(100)*strength/(25*distance) > 150`, set `target.builds = max(0, target.builds - 1)`. Otherwise leave target.builds unchanged. |

Phasers do not destroy a planet when its build count reaches zero. They do not
perform path traversal through intervening sectors. A phaser hit on a ship does
not itself invoke tractor release.

For a ship or base, invoke PhaserHit with PlayerAttack { ship: actor }, the target's
ShipBody or BaseBody identity, the selected strength and distance. Its WeaponHit
supplies the ensuing hit observations; its score effects are already applied
to pending score. For a Romulan, use RomulanPhaserHit and apply the caller-owned
ROMULAN credit described in that operation's section.

An enemy base at exactly 100% strength makes a distress call before the hit.
If destroyed, it makes a destruction call after the hit notification. Those
calls address its faction's captains whose radios are on. For ship/base hit
notifications, the target's faction within ten sectors, either faction within
four sectors, and the shooter form the audience. Planet and Romulan hits notify
captains within ten sectors of the target. Complete delivery and rendering
rules remain separate.

### Completion

```text
s.energy -= strength energy units
s.condition = RED
c.phaserReady[bank] = now
    + (w.pacingClass + 1) * 1500 milliseconds
    + s.devices[PHASERS].damage * 10 milliseconds per damage unit
CompleteTurn(s.id, automaticRepair = false)
```

The readiness delay starts after the hit and its notice publications, rather than
at command entry or after their eventual display. Direct responses follow the
[phaser presentation rules](presentation.md#phaser-command-responses). The other bank's deadline is unchanged. The result is
Fired { bank: bank } when the normal completion path returns. Successful firing completes
one turn without automatic device repair. The command consumes no torpedoes and
does not change c.torpedoesReady. Energy exhaustion after firing is handled by
the subsequent lifecycle rules, without undoing the shot. World termination
or an interruption takes precedence under the session rules.

**Source basis:** [PHACON](../../legacy/utexas/DECWAR.FOR#L2647),
[damage](../../legacy/utexas/DECWAR.FOR#L4089),
[Romulan hit](../../legacy/utexas/DECWAR.FOR#L3382).

## TORPEDOS

### Syntax and continuation

The command is spelled TORPEDOS. The ordinary abbreviation and coordinate rules
apply, including ABSOLUTE, RELATIVE and COMPUTED forms.

```text
TorpedoCommand ::= "TORPEDOS" [CountAndTargets]
CountAndTargets ::= ["ABSOLUTE" | "RELATIVE"] Integer
                    [Pair [Pair [Pair]]]
                  | "COMPUTED" Integer [TargetName [TargetName [TargetName]]]
Pair ::= Integer Integer
```

The count is a scalar; it is not offset in relative mode. A burst requests one
to three torpedoes. Supply at least one target pair, either with the count or
in a following coordinates continuation. If fewer pairs than torpedoes are
supplied, reuse the last pair for the remaining shots. Targets denote directions;
they need not contain an enemy, and a torpedo may travel beyond a target.
If more target pairs than the requested count are supplied, use only the first
count pairs for the burst. The location reader still validates every supplied
pair as a location before this selection, including its galaxy bounds.

Input acquisition distinguishes three sites. Each use of ReadLocations emits
fragment(coord1), the coordinates prompt. At the burst prompt, first emit
fragment(torp02), producing `Number in burst (1-3) and Coordinates: `.

| Acquisition site | Resolved result or Empty | Continuation |
| --- | --- | --- |
| Original command arguments, AtMost { count: 7 } | Empty | Enter the burst prompt. |
| Burst prompt, AtMost { count: 7 } | Empty or a resolved even item count | Repeat the burst prompt. Do not interpret a count or select targets yet. |
| Burst prompt | Resolved odd item count | Interpret the scalar as count, then apply the count checks below. |
| Target prompt after an accepted count alone, AtMost { count: 2*count } | Resolved odd item count | Repeat the coordinates prompt without the burst prefix. |
| Target prompt | Resolved positive even item count | Use its positions as targets, then proceed to burst validation. |

At any prompt a genuinely zero-token reply gives Cancelled and aborts the burst.
A location-reader rejection also aborts; it does not trigger the parity-based
reprompt rules. The original command line does not perform the burst prompt's
odd-item check. For ordinary count-and-target input it proceeds directly to count
validation. A nonpositive count cancels without firing. An excessive count is
rejected; a count above available inventory also reports that limitation.
An accepted count alone enters the target prompt.

Each continuation resolves its own mode from its keyword or the captain's input
preference. Neither ABSOLUTE nor COMPUTED on the count line forces that mode on
the later target line. No preference changes. A computed-mode delay or a
location diagnostic occurs before the caller applies these item-count rules.

### Original-line even item counts

The normal-form grammar above is not an instruction to reject every other
shape. After successful resolution of the original command arguments, consider
the resulting numeric items in order: the scalar, when present, followed by
each position's vertical and horizontal components. The first item is interpreted
as the burst count even when it came from the first position's vertical
component. Apply the ordinary count checks before selecting any aim.

For an even item count, there was no scalar in LocationValues. The shared
location reader has already treated all input as positions, including relative
conversion or computed-name resolution and galaxy-bound checks. Do not undo
that interpretation or validate the first raw token as a count before resolution.
The following cases have complete count-and-target values after those checks:

| Resolved items on the original line | Accepted count for a fully determined burst | Selected targets |
| --- | --- | --- |
| Four items a, b, c, d | a == 1 | One target (b,c); d is not used in firing. |
| Six items a, b, c, d, e, f | a == 1 | One target (b,c); d, e and f are not used in firing. |
| Six items a, b, c, d, e, f | a == 2 | Targets (b,c) and (d,e); f is not used in firing. |

These are resolved absolute values. They need not preserve the location reader's
original pair boundaries. The ordinary own-sector and ten-sector validation,
wait, firing and completion rules apply to these selected targets. Even an
unused value must have passed location resolution earlier. The burst prompt's
even-count reprompt rule is unchanged; this extra acceptance is confined to the
original command arguments.

For example, with sufficient ammunition and functioning tubes, original input
`TORPEDOS ABSOLUTE 1 20 21 22` selects one target at (20,21). Changing its first
value to 4 reaches InvalidBurstCount and the inventory report before any target
is selected. A blanket odd-item requirement would change both source behaviors.

**OPEN QUESTION — missing target components:** With two resolved items and a
valid burst count, four items with count 2 or 3, or six items with count 3, the
source does not supply all components needed by its selected aims. A mode-only
reply at the target prompt can likewise return Empty without a target value.
These paths remain outside the completed acceptance contract; they do not
permit manufacturing a missing coordinate, repeating a previous complete pair,
or silently substituting a new rejection rule. A zero-token continuation still
cancels as specified above. Ordinary location errors and count rejection take
precedence before this unresolved target selection is reached.

**Source basis:** [location resolution](../../legacy/utexas/DECWAR.FOR#L1410),
[original-line count and aim selection](../../legacy/utexas/DECWAR.FOR#L4247).

### Operation and result types

```text
type TorpedoRequest = {
    count: integer;
    targets: List<Position> containing one to three positions;
};

operation FireTorpedoes(actor: ShipId, request: TorpedoRequest): TorpedoOutcome

type TorpedoOutcome =
    Result<Finished { shots: integer, reason: BurstEnd } | PlanetUpdateRefused { shots: integer }, TorpedoRejection>
    |  Cancelled
    | GalaxyEnded
enum BurstEnd = REQUEST_FULFILLED | MISFIRE | OWN_SECTOR
type TorpedoRejection = TubesUnavailable | NoAmmunition
                 | InvalidBurstCount | TargetOutOfRange
```

Let s be `ship(game, actor)`, c its captain, and w be `world(game)`. The request
contains the targets supplied by a successfully resolved command or continuation.
Its signature does not change the order of input and validation below. A result's
shots is the number actually launched, not the requested count or ammunition
consumed: a misfired shot counts, and a docked ship launches without consuming
ammunition. These names are semantic outcomes, not new commands or message text.

### Entry checks and target validation

Check the following in order:

1. Before input, require `s.devices[TORPEDO_TUBES].damage < 300 damage units`;
   otherwise TubesUnavailable.
2. Require `s.torpedoes > 0`; otherwise NoAmmunition, even when s.docked is true.
3. Acquire count and targets using the syntax/continuation rules. A nonpositive
   count gives Cancelled. A count exceeding s.torpedoes first emits the inventory
   limitation. A count exceeding either s.torpedoes or three then gives
   InvalidBurstCount and the inventory report.
4. Make the sequence aims of exactly count positions: take the first count
   supplied targets, or repeat the last target until count positions are present.
5. Visit aims in order. For each aim, check for s.position first; otherwise
   require its Chebyshev distance from s.position to be at most ten. The first
   failed check determines the outcome; later aims are not validated.

TargetOutOfRange rejects without launching, consuming ammunition, changing the
reload deadline or completing a turn. The other rejection and cancellation
outcomes likewise have no firing effects. Input diagnostics are supplied by the
location reader before target selection; they are not successful burst outcomes.

An own-sector target takes a different path: report the invalid target, set the
tubes' readiness deadline c.torpedoesReady to now, and complete one turn without
automatic repair, giving Finished { shots: 0, reason: OWN_SECTOR }.
No torpedo is launched or consumed. This early path does not set red condition.
It can be reached before the previous readiness delay has expired.

Otherwise wait until c.torpedoesReady, set s.condition to RED, and begin the
burst with zero accumulated reload delay and zero launched shots. Shots in one
burst do not wait separately for the tubes to reload.

### Launch and misfire

Visit aims in order, using the ship's current position and state for each shot.
If a previous shot misfired, stop with reason MISFIRE. Entry inventory and device
checks are not repeated between shots. Compute deflection as follows; each U is a separate
`UnitDraw()`:

```text
deflection = (U1 - 0.5)/5;
if (s.devices[TORPEDO_TUBES].damage > 0 damage units or s.devices[COMPUTER].damage > 0 damage units) {
    deflection += (U2 - 0.5)/10;
}
if (s.shields.mode == UP) {
    deflection += (s.shields.strength / 1%) * (U3 - 0.5)/1000;
}
```

If this shot's target has become the ship's own sector, report the error and
finish with reason OWN_SECTOR and the delays already accumulated. The deflection
draws just specified have already occurred; this later check does not remove
them from the random-event sequence. Otherwise launch the shot. If s.docked is false, set `s.torpedoes = s.torpedoes - 1`;
if true, leave s.torpedoes unchanged. Docking does not waive the entry inventory
checks. There is no s.energy firing charge, although a resulting explosion can
damage the firing ship.

`IntegerDraw(100) > 96` is a misfire. Report its shot number and add
`(UnitDraw()-0.5)/5` to deflection. No subsequent shot in this burst launches,
but the misfired shot still travels and can hit normally. On a misfire,
`IntegerDraw(5) == 5` also adds `50 + IntegerDraw(3000)/10` damage units to
s.devices[TORPEDO_TUBES].damage and emits a tube-damage warning without its numeric
amount. Direct messages follow the [torpedo responses](presentation.md#torpedo-command-responses).

Choose the shot's maximum path length using a new U:

| U | Maximum steps |
| --- | --- |
| `0 <= U < 1/8` | 7 |
| `1/8 <= U < 5/8` | 8 |
| `5/8 <= U < 7/8` | 9 |
| `7/8 <= U < 1` | 10 |

Add this shot's reload delay to the accumulated delay:

```text
shotDelay = (w.pacingClass + 1) * 1000 milliseconds
    + s.devices[TORPEDO_TUBES].damage * 10 milliseconds per damage unit
accumulatedReloadDelay += shotDelay
```

This includes tube damage caused by this shot's misfire. Trace from the current ship position toward
the stored target using this length and deflection, and resolve the first
obstruction. Specifically invoke
`TracePath(s.position, aim - s.position, length, deflection)`;
its PathResult determines the final clear position, obstruction and displacement
step. The aim is fixed by the stored sequence; it is not recomputed from a named
target that later moves.

### Impact

| Result | Effect |
| --- | --- |
| No obstruction | Report a miss at the final traced position to the shooter. |
| Black hole | Absorb the shot and notify the shooter. |
| Friendly ship, base or planet | Neutralize the shot without damage; notify the shooter. |
| Star | If `IntegerDraw(100) <= 80`, announce a nova within ten sectors, subtract 50 pending STAR_DESTRUCTION points and invoke ExplodeStar with PlayerNova of the actor and the acting captain as viewer. Otherwise report the unaffected star to the shooter. |
| Enemy ship or base | Apply the shared torpedo-damage rule. Notify captains within ten sectors of the impact; then release a ship victim's tractor beam. |
| Romulan | Apply its torpedo-damage, possible displacement and score rule. Notify captains within ten sectors of the original impact. |
| Neutral or enemy planet | Apply the planet rule below. |

A full-strength enemy base makes its faction-wide distress call before damage.
A destroyed base makes its faction-wide destruction call after the hit notice.
These two calls address captains of the base's faction whose radios are on.

For a ship or base, use TorpedoHit with PlayerAttack { ship: actor }, the target's
ShipBody or BaseBody identity and the PathResult.step. Applied { hit: hit } supplies
the damage, defense, displacement and destruction observations. It already
includes the shared weapon score effects. The TargetAlreadyFatal report case
remains open as stated in the shared damage contract. For a Romulan, use
RomulanTorpedoHit before the caller's possible displacement and ROMULAN credit.

A planet hit first requires an accepted planet update. If refused, output
“Sorry, Captain, but the torpedo tubes are empty!” and stop without updating the
readiness deadline or completing a turn, giving PlanetUpdateRefused { shots: shots }.
The refused shot is included in shots. Prior shots, consumption and score
changes remain in effect. This diagnostic does not mean the inventory was
actually reduced to zero.

For an accepted hit let p be the impacted planet. `IntegerDraw(4) == 4` sets
`p.builds = p.builds - 1`; other results leave p.builds unchanged.
A negative build count destroys the planet and invokes
planet removal and world-end rules. Subtract 100 points from the pending
PLANET_DESTRUCTION score. Exactly zero builds survives. Notify captains within
ten sectors of the impact if the galaxy continues. GalaxyEnded exits immediately
when planet removal terminates the galaxy; it does not continue the burst or
perform the ordinary completion below. Each impact has its own destruction
result; an earlier destroyed object does not make a later surviving planet die.

### Completion

```text
c.torpedoesReady = now + accumulatedReloadDelay
CompleteTurn(s.id, automaticRepair = false)
```

This happens once for a normally completed burst, including a burst cut short
by a misfire. It does not happen after the explicitly identified early returns.
The reload deadline starts at burst completion; it gates the next burst rather
than adding a wait between this burst's shots.

Give Finished { shots: shots, reason: reason }, with REQUEST_FULFILLED after all requested shots,
MISFIRE when a misfire prevents a remaining shot, or OWN_SECTOR for the described
aim failure. A misfire on the last requested shot still fulfills the request.
Leave both c.phaserReady deadlines unchanged. Pending damage/kill points accrue
through the impact rules; normal turn completion commits them under the turn
contract. A refused update or terminating galaxy does not add that commitment.

**OPEN QUESTION:** The complete conditions for refusing a planet update, interruptions
during reloading/publication, and firing after the actor loses its position or
commission during a burst belong to the multiplayer/lifecycle contract. They
do not imply a new random miss probability, automatic cancellation on tube
damage, or rollback of earlier shots.

**Source basis:** [TORP](../../legacy/utexas/DECWAR.FOR#L4228),
[TORDAM](../../legacy/utexas/DECWAR.FOR#L4089),
[location input](../../legacy/utexas/DECWAR.FOR#L1404).

## LIST, SUMMARY, BASES, PLANETS and TARGETS

These commands query the galaxy. A detail row identifies an object and reports
the information the captain is allowed to see; a summary counts selected objects.
The commands share ordered selection groups, but have different defaults.

### Syntax and defaults

```text
ReportCommand ::= ReportVerb [Group] {GroupEnd Group}
ReportVerb ::= "LIST" | "SUMMARY" | "BASES" | "PLANETS" | "TARGETS"
GroupEnd ::= "AND" | "&"
Group ::= ReportSelector {ReportSelector}
ReportSelector ::= Integer Integer | Integer | ShipName | "ROMULAN"
                 | "SHIPS" | "BASES" | "PLANETS" | "PORTS"
                 | "FRIENDLY" | "ENEMY" | "TARGETS"
                 | "FEDERATION" | "HUMAN" | "EMPIRE" | "KLINGON"
                 | "NEUTRAL" | "CAPTURED" | "ALL" | "CLOSEST"
                 | "LIST" | "SUMMARY"
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
group. An empty first group before AND or & also uses those defaults. Later
empty groups, including an empty group after a trailing separator, are errors.
An illegal keyword or selector conflict
stops further processing. No partial deferred report is printed after a parsing
error; rows already produced by earlier direct queries remain visible.

### Types and operation

```text
enum ReportVerb = LIST | SUMMARY | BASES | PLANETS | TARGETS
enum ReportKind = SHIP | BASE | PLANET
enum ReportMode = DETAIL | COUNT
type ReportAffiliation = Team | NEUTRAL | ROMULAN
type ReportRange = SensorRange | SpecifiedRange { distance: positive integer }
                 | WholeGalaxy

type ReportGroup = {
    kinds: Set<ReportKind>;
    affiliations: Set<ReportAffiliation>;
    modes: Set<ReportMode>;
    range: ReportRange;
    namedShips: Set<ShipId>;
    namedRomulan: Boolean;
    exactPosition: Optional<Position>;
    closest: Boolean;
};

type ReportContext = {
    viewer: CaptainId;
    verb: ReportVerb;
    origin: Optional<Position>;
    team: Optional<Team>;
};

type ReportEntity = ShipEntity { ship: ShipId } | BaseEntity { base: BaseId }
                  | PlanetEntity { planet: PlanetId } | RomulanEntity

type ReportError = IllegalSelector { token: Token } | SelectorConflict { token: Token }
                 | IllegalPosition { vertical: integer, horizontal: integer } | EmptyGroup

operation ReportGalaxy(viewer: CaptainId, verb: ReportVerb,
                       arguments: List<Token>): Result<Reported, ReportError>
```

ReportGroup describes the meaning of one legally parsed group. It is not an
alternative input syntax: the ordered grammar determines which combinations
of its properties can be obtained. Initialize each group from the defaults
above, with no named ships, namedRomulan false, exactPosition none and closest
false. Apply the selector effects in input order.

Let c be captain(game, viewer) and w be world(game). With an acting ship s,
the context records s.position as origin and s.team as team when ReportGalaxy
begins. Later changes to the acting ship's position do not replace that origin
for distance tests. In pregame, only SUMMARY is available from this family;
origin and team are absent. A pregame whole-galaxy summary counts the selected
objects without requiring a sensor origin. Selectors requiring an acting ship
remain unavailable there.

ReportGalaxy parses and evaluates one group at a time. Immediate observations
are emitted during evaluation. Ordinary selections accumulate for deferred
reporting after all groups have been processed. A selector error returns
Rejected and abandons deferred output; earlier immediate observations remain.
Successful completion returns Reported, even if a group found no matching
object. Output does not by itself complete a game turn.

The following observation types separate game information from its textual
format. A detail's telemetry must correspond to its entity kind.

```text
type ReportTelemetry = ShipTelemetry { position: Position, mode: ShieldMode, strength: Percentage }
                     | RomulanTelemetry { position: Position, strength: Percentage }
                     | BaseTelemetry { position: Position, strength: Optional<Percentage> }
                     | PlanetTelemetry { position: Position, builds: integer }
                     | OutOfRange

type ReportDetail = {
    entity: ReportEntity;
    affiliation: ReportAffiliation;
    opposingMarker: Boolean;
    telemetry: ReportTelemetry;
};

enum TerrainKind = EMPTY | STAR | BLACK_HOLE
enum ReportScopeLabel = SENSOR_RANGE | SPECIFIED_RANGE | WHOLE_GALAXY
type SummaryClass = RomulanSummary | ShipSummary { team: Team }
                  | BaseSummary { team: Team } | PlanetSummary { owner: Optional<Team> }
                  | TargetSummary

type ReportSummary = {
    category: SummaryClass;
    count: positive integer;
    scope: ReportScopeLabel;
    knownQualifier: Boolean;
};

type GalaxyReportObservation = Detail { value: ReportDetail }
    | Terrain { kind: TerrainKind, position: Position } | Summary { value: ReportSummary }
    | ShipAbsent { ship: ShipId } | RomulanDisabled | RomulanAbsent
    | SensorRangeExceeded { position: Position } | NoObjectAt { verb: ReportVerb, position: Position }
    | NoMatches { group: ReportGroup, scope: ReportScopeLabel,
                  knownQualifier: Boolean }
```

OutOfRange replaces both position and strength for a ship or Romulan.
A base always discloses position when its detail is admitted, but its optional
strength can be absent. A planet detail contains its current builds value;
zero is omitted by the display convention. Terrain observations belong only
to LIST's exact-position path and retain the queried position with the observed
kind. They do not give stars, black holes or empty space a shield or energy
property. Summary counts do not disclose positions.

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
then planets in their current order. For a ship r, require r.commissioned,
a present r.position, and a nonempty sector at that position. The sector need
not contain that ship's own marker; a HELP/GRIPE temporary black-hole sector
passes this presence test. Skip bases with nonpositive strength. Apply the group's
object-kind and affiliation selection before visibility checks.

For each candidate let d be its distance from the saved acting position. Normal
detail is available within ten sectors, or at any distance for a friendly object.
Privilege also admits remote objects, but that admission is distinguished from
ordinary discovery. The group's explicit distance limit still applies.

For an object outside ten sectors that is neither friendly nor admitted by
privilege, use these rules:

```text
if (object is a base or planet) {
    known = object is in the acting faction's corresponding knowledge set;
} else {
    known = this is a whole-game group and not a CLOSEST request;
}
if (known) {
    admit the requested result modes if within the group's distance limit;
    mark its detail as out of sensor range;
} else if (counts were requested for the whole game) {
    admit counts only;
} else {
    omit the candidate;
}
```

Whole-game selection means the unrestricted scope obtained without an explicit
numeric range. Supplying a number larger than the galaxy does not acquire the
whole-game disclosure rule: it remains a specified-range query. In particular,
SUMMARY can count unknown remote bases or planets, but a specified-range summary
requires their prior discovery when they are beyond normal sensor range.

For a group g, SensorRange imposes a distance limit of ten, SpecifiedRange { distance: n }
imposes n, and WholeGalaxy imposes no distance limit. The distinction between
these range values remains observable through disclosure and summary labels.
The following operation expresses ordinary filtered admission:

```text
type ReportAdmission = {
    modes: Set<ReportMode>;
    outOfRange: Boolean;
    privilegedDisclosure: Boolean;
};

operation AdmitReportEntity(context: ReportContext, group: ReportGroup,
                            entity: ReportEntity): ReportAdmission
```

The candidate has already passed kind, affiliation and presence selection.
The pregame whole-galaxy COUNT-only case admits COUNT directly, with both
Boolean admission properties false; no absent origin or team is read.
For the remaining path, context.origin and context.team must be present.
Use their contained Position and Team values for distance and knowledge queries.
This requirement does not select a fictitious pregame position or faction.
Within this operation let c be captain(game, context.viewer) and w be world(game).
Use its Ship.position/team, Base.position/team, Planet.position/owner, or
the current Romulan.position and ROMULAN affiliation. A neutral planet has
NEUTRAL affiliation. Let requested be group.modes and start with both Boolean
admission properties false.

Within ten sectors, or when the candidate belongs to context.team, admit
requested modes if the group distance limit permits. Otherwise, if c.privileged,
set privilegedDisclosure true and apply the same distance limit. Without that
privilege set outOfRange true and apply the remote-discovery rules above.
An omitted candidate has an empty modes set. For remote installations, the
knowledge tests are membership in the appropriate sets:

```text
BaseEntity { base: id }:   id in w.knowledge[context.team].knownBases
PlanetEntity { planet: id }: id in w.knowledge[context.team].knownPlanets
```

Admission changes no game state. A CLOSEST search uses this eligibility,
then applies its tie rule.

For CLOSEST, an eligible candidate at a distance equal to the current nearest
distance replaces it. Thus ties choose the last eligible object in the candidate
order above. The chosen sector is reported through the exact-position path
below. A remote enemy ship or Romulan is not eligible for CLOSEST merely because
its identity appears in a whole-game LIST.

### Named objects and exact positions

LIST and TARGETS can name ships or ROMULAN. Report requested ships in roster
order, after the Romulan if requested, independently of their order in the input.
Repeated ship-name occurrences select that identity once. Repeating ROMULAN
is a selector conflict. Named groups ignore affiliation filters when reporting
the named identities. Named ship availability uses the same commission,
position and nonempty-sector requirements as ordinary ship selection.
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

For remote nonfriendly installations, LIST's exact-position query requires prior
discovery or privilege. Identifying a remote enemy ship or Romulan by position
also requires privilege, except through the BASES rule below.
Successful exact-position and named-object queries print
immediately, before later groups and any deferred report. They do not themselves
add an installation to faction knowledge. CLOSEST uses this same immediate path.

The exact-position path still applies the group's distance limit. In particular,
TARGETS and PLANETS default to ten even for a privileged coordinate query.
An exact-position query succeeds when at least one of its result modes is
admitted, including COUNT. BASES retains its default whole-galaxy range and
both result modes on this path. It can therefore identify an undiscovered
remote base, ship or Romulan through COUNT admission. The resulting base detail
contains its position but no strength; ship and Romulan details use OutOfRange
telemetry. This still does not update discovery knowledge. The rule does not
extend BASES to planets or permit remote terrain observations.

Named-object reporting identifies the selected name even when a supplied
distance would exclude it from ordinary selection. Its telemetry is concealed
only for a remote nonfriendly object without privilege; this named path does
not use distance-limit failure to suppress the row.

When a legal group contains both an exactPosition and namedRomulan, the exact
position takes precedence. Otherwise any named ship or namedRomulan selects
the named path; closest and other filter properties do not replace that path.
For example, ROMULAN may follow a kind selector and redirect the group to its
named Romulan query. The grammar still rejects the reversed order when the
kind selector conflicts with the already named object.

### Detail, summaries and knowledge

Deferred detail rows are combined across groups by object identity and printed
once per selected object, in the candidate order above. A direct row produced
earlier does not suppress that object's later deferred row. Use the currently
available object data at the time of reporting; the command is not an indivisible
world snapshot.

For each ordinarily admitted entity, accumulate the union of admitted modes.
Retain outOfRange if any admission contributing to that entity had it set,
and likewise retain privilegedDisclosure. An immediate observation does not
contribute to this accumulation. After all groups are processed, emit deferred
details and counts in this order: Romulan detail then summary; ship details
then faction ship summaries; base details then faction base summaries; planet
details then planet summaries. TARGETS instead emits its combined target
summary after these details, while retaining a requested Romulan summary.

```text
operation ObserveReportDetail(context: ReportContext,
                              entity: ReportEntity, outOfRange: Boolean): ReportDetail
```

ObserveReportDetail reads the entity's current properties. For a player ship s,
visible telemetry is ShipTelemetry { position: s.position, mode: s.shields.mode, strength: s.shields.strength }.
For a base b it is BaseTelemetry { position: b.position, strength: b.strength }, replacing strength
with none when outOfRange. For a planet p it is PlanetTelemetry { position: p.position, builds: p.builds }. A visible Romulan has its current position and one percentage point
of displayed strength per ten energy units. For a ship or Romulan, outOfRange
instead produces OutOfRange telemetry.

The returned entity is unchanged. affiliation records the ship/base faction,
planet ownership (NEUTRAL when unowned), or ROMULAN when observed. It supplies
the detail's faction-sensitive label without a later ownership lookup.
opposingMarker is true for ROMULAN or the opposing faction, except that TARGETS
sets it false for every detail. ObserveReportDetail changes no state; emitting the resulting
Detail observation is followed by discovery only on the deferred path below.
Position telemetry denotes the absolute position. Relative terminal coordinates
use the viewer's position when formatted, not the saved distance-test origin.

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
faction's knowledge, unless accumulated privilegedDisclosure is true:

```text
BaseEntity { base: id }:   w.knowledge[context.team].knownBases += {id}
PlanetEntity { planet: id }: w.knowledge[context.team].knownPlanets += {id}
```

These updates require a present context.team. Summary-only
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
An ordinary group admitted for DETAIL alone contributes to that Romulan count
too, if another ordinary group subsequently requests COUNT. Immediate named or
coordinate observations do not contribute to it.

Summary scope labels distinguish sensor range, specified range and the whole
galaxy. Each attempted ordinary candidate contributes its group's scope to
the labels of its object class and affiliation, even when it is not admitted.
Across groups, WHOLE_GALAXY takes precedence over SPECIFIED_RANGE, which takes
precedence over SENSOR_RANGE. The knownQualifier becomes true when any such
candidate lies beyond ten sectors, is nonfriendly, is not disclosed through
privilege, and is examined with a specified distance greater than ten.
The qualifier remains true when other groups contribute broader counts; it
does not retrospectively filter those counts to known installations.

TargetSummary uses label evidence only from candidate evaluations that are
beyond ten sectors, nonfriendly and not privileged. This includes immediate
queries and candidates that fail admission. Combine that evidence with the
same scope precedence and known-qualification rule; with no evidence the
target scope is SENSOR_RANGE. Thus a whole-galaxy target query whose candidates
are all nearby can still label its target total as in sensor range.

If a group selects no eligible object, report that absence and continue with
later groups. Distinguish unknown remote objects from an empty matching set in
the established report wording. Emit NoMatches with a knownQualifier initially
true for a specified distance greater than ten when the affiliations are not
exactly the acting faction alone. Also set it true upon examining any remote,
nonfriendly, unprivileged candidate with a distance limit greater than ten or
WholeGalaxy. Its scope label combines the attempted candidates' group scopes;
when there were no attempted candidates, use WHOLE_GALAXY. A failed CLOSEST
search uses this same absence observation.

Detail and summary lines follow the [galaxy-report presentation](presentation.md#galaxy-report-lines).

**OPEN QUESTION:** The terrain suffix has no complete generalized contract;
see the presentation chapter for its established prefix. Interrupted output
and concurrent changes that remove or replace an entity between selection
and its detail remain part of the report and multiplayer work. No whole-command
snapshot is implied.

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

### Operation and observations

```text
type ScoreColumn = ShipScore { ship: ShipId } | TeamScore { team: Team } | RomulanScore

type ScoreRatio = {
    numerator: Points;
    denominator: nonnegative integer;
};

type ScoreReportRow = CategoryRow { category: ScoreCategory, values: List<Points> }
                   | TotalRow { values: List<Points> }
                   | CommissionRow { values: List<Optional<integer>> }
                   | PerCommissionRow { values: List<Optional<ScoreRatio>> }
                   | PerTurnRow { values: List<ScoreRatio> }

type ScoreReport = {
    columns: List<ScoreColumn>;
    rows: List<ScoreReportRow>;
};

operation ReportPoints(viewer: CaptainId, arguments: List<Token>):
    Result<Reported { report: ScoreReport }, InvalidScoreSelector>
```

Each row's sequence has one value for each report column, in the same order.
An absent commission or per-commission cell means that row does not apply to
the ship column; it does not mean a zero count or zero score. ScoreRatio records
the two quantities whose quotient is requested. For a positive denominator,
its value is numerator divided by denominator. A zero denominator has no
defined quotient in this draft; its terminal treatment remains open. This
record does not introduce a new textual ratio notation into POINTS output.

Let c be captain(game, viewer) and w be world(game). Resolve arguments using
the syntax and selection rules above. Select ShipScore { ship: c.ship } only when
c.ship is present. FEDERATION and HUMANS select TeamScore { team: FEDERATION };
EMPIRE and KLINGONS select TeamScore { team: EMPIRE }. ROMULANS selects RomulanScore.
Invalid selectors reject before any report rows. No arguments and a
nonalphanumeric first argument are distinct: the former applies the defaults,
whereas the latter ends an explicitly supplied selection with no columns.

The following observation functions specify the state read for each column.
Their names are local to ReportPoints; they do not add stored state.

```text
scoreFor(ShipScore { ship: id }) = ship(game, id).score
scoreFor(TeamScore { team: t }) = w.teamScores[t]
scoreFor(RomulanScore) = w.romulanActivity.score

turnsFor(ShipScore { ship: id }) = ship(game, id).stardate
turnsFor(TeamScore { team: t }) = w.teamTurns[t]
turnsFor(RomulanScore) = w.romulanActivity.turns

commissionsFor(TeamScore { team: t }) = w.teamCommissions[t]
commissionsFor(RomulanScore) = w.romulanActivity.appearances
```

There is no commissionsFor operation on ShipScore. Commission rows leave
that column absent rather than assigning it an invented commission count.

### Report construction

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

For category k, the column value is scoreFor(column)[k]. Omit the CategoryRow for k
only if every selected column has zero for that category. Otherwise include
each selected column's value, including zero. Negative scores remain negative.
Follow the category rows with TotalRow, summing each column's eight category
values. An all-zero score report still has its TotalRow and applicable
accounting rows; it simply has no CategoryRow.

When faction or Romulan columns are selected, also report their cumulative
number of commissions and total score per commission. These are historical
commission counts for this galaxy, not the current simultaneous player count.
Faction acceptance during admission increments its count even if ship selection
is subsequently cancelled; see the admission contract.
Emit CommissionRow followed by PerCommissionRow when any selected column is
a team or the Romulan. For these columns, the count is commissionsFor(column)
and the ratio has that column's total as numerator and the count as denominator.
Both rows have an absent cell in the ship column. Finally emit PerTurnRow for
all selected columns, with the total as numerator and turnsFor(column) as
denominator. When only the ship is selected, omit both commission rows entirely.

The Romulan column reads world(game).romulanActivity: score for its category
values, appearances for commissions, and turns for its turn count. These values
remain reportable while no Romulan ship is present; destruction does not reset
them. New-galaxy initialization and later increments are defined by the
[autonomous activity contract](autonomous.md#activation-and-appearance).

Ratios retain fractions until [terminal formatting](presentation.md#points-reports). The display of a ratio with
a zero denominator remains unresolved; it is not implicitly zero, and this
draft does not require a machine arithmetic exception. Faction admission
increments are defined in the session rules.

POINTS changes no score, resource, knowledge or stardate. A report does not
recompute damage or turn credits and does not reconcile team totals to the sum
of currently commissioned ships: some events credit a team directly.
These equations describe observations while the relevant state is stable.
They do not require an atomic snapshot of the entire report. Interleavings
with score or count changes during output remain to be specified.

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

### Operation and observations

```text
enum TypeSelection = OUTPUT | OPTION

type TypeObservation = OutputLengthValue { value: OutputLength }
    | PromptStyleValue { value: PromptStyle } | ScanStyleValue { value: ScanStyle }
    | InputCoordinatesValue { value: CoordinateMode }
    | OutputCoordinatesValue { value: CoordinateMode }
    | TerminalProfileValue { name: TerminalProfile } | VersionValue { text: Text }
    | RomulanOptionValue { enabled: Boolean }
    | BlackHoleOptionValue { selected: Boolean }

operation ReportType(viewer: CaptainId, selection: TypeSelection): Reported { values: List<TypeObservation> } | Cancelled
```

Let c be `captain(game, viewer)` and w be `world(game)`. Selection follows the
syntax and continuation rules above; cancellation produces no report and changes
no preference. The signature names the eventual resolved selection.

For OUTPUT, observe c's properties in this order:

1. OutputLengthValue { value: c.outputLength }.
2. PromptStyleValue { value: c.promptStyle }.
3. ScanStyleValue { value: c.scanStyle }.
4. InputCoordinatesValue { value: c.inputCoordinates }.
5. OutputCoordinatesValue { value: c.outputCoordinates }.
6. TerminalProfileValue { name: c.terminalProfile }, when that optional property is present.

For OPTION, emit these observations in order:

```text
VersionValue { text: "[DECWAR Version 2.3, 20-Nov-81]" }
RomulanOptionValue { enabled: w.romulanEnabled }
BlackHoleOptionValue { selected: w.blackHolesSelected }
```

The version text identifies this Austin source edition; it is distinct from the
edition of this specification or an implementation's own release number.
blackHolesSelected records the galaxy's choice. Removing black holes with
SET BHREMV does not change that option or this reported value.

TYPE observes the current preferences; it does not change them, consume energy
or complete a turn. Its preference and option labels follow the
[preference presentation](presentation.md#preference-and-option-reports). The same
reports are available before commissioning, subject to the session's current configuration.

**OPEN QUESTION:** Before a terminal profile has been selected, the first five OUTPUT
observations are defined, but the final profile observation and its presentation
remain unspecified. TYPE does not select CRT or invent a profile name on that
account. A complete report returns Reported { values: values }; concurrent preference
changes and interrupted output remain subject to the observation/control rules.

**Source basis:** [TYPE](../../legacy/utexas/DECWAR.FOR#L4540),
[version text](../../legacy/utexas/MSG.MAC#L44),
[black-hole removal](../../legacy/utexas/DECWAR.FOR#L3727).

## TIME

```text
TimeCommand ::= "TIME"
```

```text
type TimeObservation = GameElapsed { value: Duration }
    | CommissionElapsed { value: Duration } | CommissionExecution { value: Duration }
    | SessionExecution { value: Duration } | TimeOfDayValue { value: TimeOfDay }

operation ReportTime(viewer: CaptainId): List<TimeObservation>
```

Let c be `captain(game, viewer)`, q be `session(game, viewer)`, and w be
`world(game)`. ClockOrigin, CommissionTiming and the environment's clock
observations are defined in [session properties](session-rules.md#session-properties).
The ordinary report requires w.elapsedOrigin to be present. If c.ship is
present, q.commissionTiming must also be present; let timing denote that record.

TIME performs and emits these observations in order:

```text
emit GameElapsed { value: observeElapsed(w.elapsedOrigin) };
if (c.ship is present) {
    emit CommissionElapsed { value: observeElapsed(timing.elapsedOrigin) };
    emit CommissionExecution { value: observeExecution(viewer) - timing.executionAtStart };
}
emit SessionExecution { value: observeExecution(viewer) };
emit TimeOfDayValue { value: observeTimeOfDay() };
```

The two execution observations are separate. Accounting can advance between
them, including while earlier report output is produced. The second is not
defined by reusing the first value or by adding the baseline back to a cached
commission-execution result.

Elapsed time includes waiting. Execution time is the environment's accounting
of time spent running the session; it is a separate observation, not a turn
count or a movement delay. The environment supplies these clocks and accounting
readings. Their acquisition does not change the game's stardates or scores.
The platform binding must identify the execution-time measure it supplies;
equating it to elapsed time is not implicit in this command.

Before commissioning, omit the two ship-specific rows. TIME ignores trailing
arguments and changes no game state. The [time presentation](presentation.md#time-reports)
defines duration fields and labels; clock availability and the time-of-day
convention belong to the environment binding.

Return the sequence of emitted observations. No clock baseline is reset by
TIME, and it changes no resource, knowledge, deadline or stardate. Before the
first galaxy origin exists, the first elapsed observation has no defined origin
in the abstract model; that startup case remains open rather than assigning it
zero or the current time of day.

**Source basis:** [TIME](../../legacy/utexas/DECWAR.FOR#L4066).

## USERS

```text
UsersCommand ::= "USERS"
```

```text
type ReportedPosition = {
    absolute: Optional<Position>;
    relative: Optional<SectorVector>;
};

type UserRow = {
    ship: ShipId;
    captainName: Text;
    advertisedSpeed: nonnegative integer;
    account: AccountIdentity;
    connectionLabel: Text;
    sessionNumber: integer;
    position: Optional<ReportedPosition>;
};

type UserReportEntry = CaptainRow { value: UserRow } | FactionSeparator

operation ReportUsers(viewer: CaptainId): List<UserReportEntry>
```

Let c be `captain(game, viewer)`. Visit ships in the fixed roster order. At the
boundary between factions emit FactionSeparator, even if one or both factions
has no included captain. For each commissioned ship s, its captain association
must be present. Let owner be that captain and q its Session. Emit CaptainRow
with s.id, owner.displayName, q.reporting.advertisedSpeed, q.account,
q.reporting.connectionLabel and q.reporting.sessionNumber, in that order.

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
In UserRow, omission is position == none. A privileged row's ReportedPosition
is selected by c.outputCoordinates:

| Mode | absolute | relative |
| --- | --- | --- |
| ABSOLUTE | s.position | none |
| RELATIVE | none | s.position minus the viewer's ship position |
| BOTH | s.position | s.position minus the viewer's ship position |

Relative components are signed vertical and horizontal displacements in
sectors. A viewer's own row includes (0,0) when relative output is selected;
it is not omitted merely for being the same sector. BOTH presents the absolute
pair before the relative pair. These are observations, not new coordinate
argument forms.
USERS does not apply sensor-distance filtering or discover installation locations.
All output lengths include the six ordinary fields; LONG additionally prints
the descriptive header, including a location heading when privileged.

The [USERS presentation](presentation.md#users-reports) defines headings, field
widths, account labels and coordinate text.

USERS ignores trailing arguments, changes no game state and does not complete
a turn. It is available before commissioning as well as during play. A row's
metadata and position need not be observed atomically with other rows; complete
session-change interleavings remain part of the multiplayer rules.

Return the entries in their emitted order. No resource, preference, knowledge,
score or ship state changes. In the terminal binding the faction separator is
`----`. The normal six fields remain present even in SHORT output.

**OPEN QUESTION:** Privileged RELATIVE or BOTH output before the viewer has a ship lacks
a reference position; this draft does not manufacture an origin from unrelated
state. Privileged ABSOLUTE output does not require such a reference. Loss of a
target's commission during row output and complete metadata formatting remain
part of the session/presentation contract.

**Source basis:** [USERS](../../legacy/utexas/DECWAR.FOR#L4600),
[user-information fields](../../legacy/utexas/WARMAC.MAC#L2187),
[position reporting](../../legacy/utexas/DECWAR.FOR#L3078),
[faction separator](../../legacy/utexas/MSG.MAC#L380).

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

### Operations and dispatch

```text
enum PreferenceSetting = OUTPUT | PROMPT | SCANS | ICDEF | OCDEF
enum PrivilegedSetting = ROMOPT | ENDFLG | BHREMV

operation ConfigureCaptain(viewer: CaptainId, input: CommandInput): Finished | Cancelled | SessionEnded

operation SetPreference(viewer: CaptainId, setting: PreferenceSetting,
                        candidate: Token): Assigned | Unchanged

operation SelectTerminalProfile(viewer: CaptainId, candidate: Token): Selected { profile: TerminalProfile } | RetryProfile

operation SetCaptainName(viewer: CaptainId, text: Text): Named | Unchanged

operation ApplyPrivilegedSetting(viewer: CaptainId,
                                 setting: PrivilegedSetting): Applied | SessionEnded
```

Let c be captain(game, viewer) and w be world(game). ConfigureCaptain resolves
one setting, acquiring a continuation as required by the syntax rules, and
invokes the corresponding operation below. Setting selection requires a token
of category ALPHANUMERIC. An unprivileged candidate for ROMOPT, ENDFLG or
BHREMV follows the unrecognized-setting prompt path; it does not invoke a
privileged operation. A continuation supplies the current line and arguments
used by the selected setting, just as for other CommandInput consumers.

Ordinary completion of the selected operation returns Finished, including an
Unchanged result. Empty replies that cancel setting or value selection return
Cancelled, with any effects already made retained. NAME's one additional
prompt has its own completion rule below. Forced world termination returns
SessionEnded for this viewer. No ship is required for preference changes in
pregame; c denotes the session's captain in both phases. Direct
[prompts and responses](presentation.md#configuration-command-responses) are
defined separately from these state changes.

### Presentation preferences

| Setting | State change |
| --- | --- |
| OUTPUT | Set `c.outputLength` to SHORT, MEDIUM or LONG. |
| PROMPT | Set `c.promptStyle` to NORMAL or INFORMATIVE. |
| SCANS | Set `c.scanStyle` to SHORT or LONG. |
| ICDEF | Set `c.inputCoordinates` to ABSOLUTE or RELATIVE. |
| OCDEF | Set `c.outputCoordinates` to ABSOLUTE, RELATIVE or BOTH. |

For these five settings, a missing or nonalphanumeric value prompts for a value.
An empty reply cancels. An alphanumeric value that matches none of the setting's
choices ends the command with that preference unchanged; it does not prompt
again or diagnose an unknown choice. Subsequent arguments are ignored.

SetPreference requires an ALPHANUMERIC candidate; ConfigureCaptain obtains one
before invoking it. Compare candidate.text with the table's choices in their
listed order using ordinary keyword matching. Each matching choice assigns
the corresponding property. At least one match returns Assigned, even when
the assigned value equals the old value; no match returns Unchanged. All other
Captain properties and all ship/world properties remain unchanged. No success
report is emitted by this assignment.

Preferences affect later input interpretation and output; they do not move a
ship, change its sensors, or alter an already published message. Explicit command
coordinate modes still override the input default where that command allows them.
SET ICDEF BOTH is not an additional way to select an input default.

### Terminal profile

The terminal names, in matching order, are ACT-IV, ADM-2, ADM-3A, DATAPOINT,
ACT-V, SOROC, BEEHIVE and CRT. Ordinary five-character keyword matching applies.
A missing or nonalphanumeric value prompts; an empty reply cancels.

SelectTerminalProfile requires an ALPHANUMERIC candidate. Set
c.terminalProfile to none, then examine TerminalProfile values in the order
listed above. On the first match, assign that profile to c.terminalProfile.
On discovering a second match, emit the ambiguity diagnostic and stop the
matching pass. Return Selected { profile: c.terminalProfile } for exactly one match;
otherwise list the available names and return RetryProfile. ConfigureCaptain
then prompts again. No other preference changes.

The selected value, including none, remains in effect while ConfigureCaptain
awaits another reply. Cancelling leaves that value in place. The presentation
binding for an unselected profile remains unresolved.

### Captain name

NAME reads name text from the original line, beginning immediately after the
delimiter following NAME. Additional spaces are part of the name; it is not a
sequence of independently parsed name tokens. A separate name prompt begins at
the first character of its reply. Use at most twelve characters, stop at the
end of the acquired text, and apply the lexical case transformation to printable
characters. Spaces are retained. The result replaces the captain's display name
when it contains a nonspace character. It does not change ship, faction or
account identity.

For SetCaptainName, text is the raw name portion acquired by the rules above,
not the transformed text of a Token. The following state transition requires
an active commission. For text consisting of printable characters:

```text
let name: Text = case-transform(first 12 characters of text);
if (name contains a character other than space) {
    c.displayName = name;
    return Named;
}
return Unchanged;
```

The transformation is the character transformation in LEX-1, including its
punctuation transformations. Spaces among the retained characters remain part
of displayName. These equations do not require twelve-character padding; name
field widths belong to output formatting. The printable-character restriction
is the current defined domain, not a new input-rejection rule.

If no name is obtained from the command line, prompt once for a name. An empty
or all-space reply leaves the name unchanged and ends the command. NAME consumes
the rest of the acquired command line, including text that would otherwise form
another command. Embedded nonprinting name characters remain an explicit lexical
edge case.

This operation does not change the session's entryName. Its effect without an
active commission is unspecified; recognizing SET in pregame does not establish
a valid name assignment there. See [entry name](session-rules.md#entry-name)
for initial-name acquisition and the name restored at a later commission.

### Privileged settings

ApplyPrivilegedSetting requires c.privileged true. Its three effects are:

| Setting | Effect and outcome |
| --- | --- |
| ROMOPT | Set w.romulanEnabled to true and return Applied. |
| BHREMV | Apply the sector-removal rule below and return Applied. |
| ENDFLG | Set w.ended to true, then perform the world-end check for viewer; return SessionEnded. |

For BHREMV, visit each galaxy position p in increasing vertical coordinate,
then increasing horizontal coordinate. When sector(game, p) is BlackHoleObject,
the sector-removal event satisfies:

```text
ensures after(sector(game, p)) == none
```

Other sectors are unchanged. This rule includes a temporary black-hole sector
used by HELP or GRIPE; it does not release or move the ship involved in that
activity. Later activity cleanup follows its own restoration rule. Preserve
w.blackHolesSelected, all knowledge, resources, score and preferences. No
black-hole count is used to decide which sectors to remove.

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

### Operation and input

```text
type TellFailure = RadioUnavailable | RepeatedTell | NoRecipients

type TellObservation = UnknownRecipient { text: Text } | AmbiguousGroup { text: Text }
                     | SelfRecipient | RecipientUnavailable { ship: ShipId }
                     | RecipientRadioUnavailable { ship: ShipId }
                     | NoRecipients | NoMessageSent

operation SendTell(actor: ShipId, input: CommandInput):
    Result<Published { id: MessageId } | NotPublished, TellFailure>
    | Cancelled
```

Let s be ship(game, actor), and let c be the captain identified by s.captain.
Require an active commission and a present captain. The device precondition is:

```text
s.devices[RADIO].damage < 300 damage units
```

Failure returns Rejected { reason: RadioUnavailable } before changing radio state or
reading recipients. Otherwise set c.radio.enabled to true. If input.arguments
is empty, prompt for recipients and acquire a continuation. An empty continuation
returns Cancelled, leaving the radio on. Otherwise use the continuation's tokens
as recipients and its AcquiredLine as the current line. With supplied recipients,
use input.arguments and input.line. The current line determines both repeated
input status and any inline message body.

### Recipient selection

Start with selected as an empty set of ShipId. The following selection rules
inspect every supplied recipient token; they do not stop at a numeric or null
token as POINTS does. Tokens that match no recipient are diagnosed and skipped.

For each recipient token, first recognize ROMULAN and skip it: Austin player
TELL does not address the Romulan or cause a reply. For any other recipient,
if the current line's repeated property is true, return Rejected { reason: RepeatedTell }
before name lookup. Then try ship names in
roster order, before checking group names. Group abbreviations must match exactly
one group name; matching several names is ambiguous even if they denote the same
faction. Emit UnknownRecipient { text: token.text } or AmbiguousGroup { text: token.text } for
an unknown or ambiguous recipient, then skip it; other tokens can still supply
valid recipients.

| Group name | Ship identities selected |
| --- | --- |
| ALL | Both factions. |
| KLINGON, EMPIRE | Empire. |
| HUMAN, FEDERATION | Federation. |
| FRIENDLY | The sender's faction. |
| ENEMY | The opposing faction. |

Groups contribute only ships whose commissioned property is true. Explicit ship
names can select an uncommissioned ship for the later availability diagnostic.
Add matches to selected as a set, so duplicate names or overlapping groups do
not cause duplicate delivery. Explicitly naming oneself emits SelfRecipient.

### Filtering and state changes

Use the shared recipient-validation operation below. It is also used by
autonomous speech, so it does not itself exclude the caller's ship.

```text
operation ValidateRadioRecipients(viewer: CaptainId, selected: Set<ShipId>): Set<ShipId>
```

Examine selected identities in roster order. For each id let r be ship(game, id).
Apply the first matching rule below and send any diagnostic to viewer:

| Condition | Observation and result for id |
| --- | --- |
| `r.devices[RADIO].damage >= 300 damage units` | Emit RecipientRadioUnavailable { ship: id }; exclude id. |
| `r.commissioned == false` | Emit RecipientUnavailable { ship: id }; exclude id. |
| Otherwise, with rc the captain identified by r.captain, `rc.radio.enabled == false` | Emit RecipientRadioUnavailable { ship: id }; exclude id. |
| Otherwise | Retain id. |

A commissioned recipient requires a present captain. Validation changes no
ship or captain property, and imposes no distance or faction restriction.
Back in SendTell, perform these effects in order:

```text
let recipients: Set<ShipId> = ValidateRadioRecipients(c.id, selected) - {actor};
c.radio.gaggedSenders -= recipients;
if (recipients is empty) {
    emit NoRecipients;
    return Rejected { reason: NoRecipients };
}
```

Sending to a ship ungags that ship in the sender's own radio settings. It does
not alter the recipient's gag choices. The radio-on and ungag effects happen
before body acquisition; cancelling the body or failing to publish does not
undo them. Recipient readiness is checked here, not continuously throughout
composition or delivery.

### Body and completion

If the current acquired line's raw property contains a semicolon, use the text
following its first semicolon. Otherwise acquire a line at the message prompt using the
ordinary line-editing rules. Ctrl-C during that prompt cancels with no message
published. Empty or one-character bodies produce `No message sent`. For longer
bodies, retain the first 75 characters. The full acquired body is consumed even
when its retained text reaches that limit.

Submit an acquired body through PublishMessage(actor, recipients, body), and
return its Published or NotPublished outcome. Ctrl-C at the body prompt instead
returns Cancelled after emitting NoMessageSent, without submitting a publication.
Publication and subsequent delivery follow [radio communication](communication.md).
Direct [TELL responses](presentation.md#tell-command-responses) distinguish
recipient diagnostics from message-body refusal. TELL completes no turn and charges no energy. Successful submission is distinct
from a recipient displaying the message: it can later be gagged, discarded on
release or lost under the bounded pending-message policy.

**Source basis:** [TELL](../../legacy/utexas/DECWAR.FOR#L3977),
[default groups](../../legacy/utexas/SETUP.FOR#L358),
[message acquisition](../../legacy/utexas/WARMAC.MAC#L2963).

## *PASSWORD

```text
PasswordCommand ::= "*PASSWORD" [PasswordToken]

operation SetPrivilege(viewer: CaptainId, candidate: Optional<Token>): PrivilegeSet { enabled: Boolean }
```

The Austin password is `*MINK`. Compare the retained token exactly, using the
language's case transformation; a prefix is insufficient. An exact match enables
session privilege. Any other value, including an omitted password, clears it.
There is no password prompt or success/failure text in this command. Ignore
further arguments. It changes no resources and completes no turn.

Let c be captain(game, viewer). Set c.privileged to true exactly when candidate
is present and candidate.text is an exact keyword match for *MINK under LEX-6;
otherwise set it to false. Return PrivilegeSet { enabled: c.privileged }. The operation
does not require prior privilege or an acting ship, and changes no other
Captain, Ship or World property. The command passes its first argument, or
none when absent. There is no separate token-category requirement.

The lexical five-character retention still applies: a longer token whose first
five transformed characters are *MINK matches exactly under this rule. This
does not introduce a second comparison against the unretained input suffix.

Privilege affects the commands and observations that explicitly test it. It
does not rename a ship, change factions or make every game rule optional. The
password's representation is not a new authentication protocol.

**Source basis:** [PASWRD](../../legacy/utexas/DECWAR.FOR#L2626),
[password constant](../../legacy/utexas/PARAM.FOR#L15).

## *DEBUG

```text
DebugCommand ::= "*DEBUG"

operation ReportDiagnostics(viewer: CaptainId): Result<Reported, UnknownCommand>
```

Let c be captain(game, viewer). If c.privileged is false, report an unknown
command and the help hint, then return Rejected { reason: UnknownCommand }. Do not query
or disclose timing observations on that path. Otherwise call the environment's
observeOperationTimings(viewer) query defined in the session chapter.
Emit its observations in the returned order under the headings Name, Calls,
Total and High: the measured operation's name, completed call count, total
execution time and largest measured call time. These are diagnostic observations,
not ship scores or game turns. Include a registered observation even when its
completed call count is zero. With no registered observations, emit the header
and no rows. Return Reported. Do not reset collected counts or durations.

The ordinary registration order is the report order. The set of instrumented
operations, exhausted instrumentation capacity, unavailable clock readings and
the displayed time-unit binding remain environment-dependent research items.

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

operation ReadHelp(captain: CaptainId, topics: List<Text>): Result<Finished, RedAlert>
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
that fallback. Failure to open standard content reports `%Can't read help file`;
a missing section reports `%Can't find help on ` followed by the resolved topic.
Both paths finish that topic request and permit later topics to be processed.
Before returning from section handling, clear the section's interrupt/output-stop
conditions. An opened resource is closed and input is restored; open failure
has not entered resource input. On the ordinary HELP return, restore the
captain's temporary information activity as specified by the session rules.

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

operation ReadNews(captain: CaptainId): Finished | Stopped | Unavailable
```

NEWS is available before commissioning and during play, including under RED
alert. Trailing command arguments do not select a section or answer a later
continuation prompt. Failure to open the news content yields `Unavailable`
and the diagnostic `%Can't read DECWAR.NWS`.

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

Ctrl-C or the output-stop control stops viewing at a line boundary. On exit
from an opened news resource, clear those controls, close the resource and
restore command input. Open failure has not entered resource input and does
not pass through this viewing-exit cleanup. News output counts as activity for
a commissioned ship. NEWS does not start HELP's temporary sector state: the
ship remains present normally, subject to ordinary concurrent world events.

The [NEWS presentation](presentation.md#news-output-and-failure) defines prompt
and failure-text endings. NEWS changes no resources or scores and completes no turn. Elapsed time spent
reading does not stop other captains or make the reader immune to attacks.

**Source basis:** [NEWS](../../legacy/utexas/WARMAC.MAC#L3811),
[supplied news](../../legacy/utexas/HLP/DECWAR.NWS).

## GRIPE

### Syntax and operation

```text
GripeCommand ::= "GRIPE"

operation SubmitFeedback(captain: CaptainId):
    Result<Recorded | StorageFailure, RedAlert>
    | Cancelled
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

The terminal prompt and both line-limit notices above have no leading or
appended line ending in Austin. Their text is emitted at the current output
position. Line endings recorded in the feedback body are separate from these
terminal notices; input-reader echo remains governed by the line editor.

An immediate Ctrl-Z with no characters or preceding lines cancels an empty
submission. Earlier complete blank lines still count as submitted lines; they
do not turn a later Ctrl-Z into the immediate-empty case. Completing input counts
as activity for a commissioned ship.

### State effects and completion

Successful recording adds a new feedback record ahead of every existing record,
leaving their relative order unchanged:

```text
ensures after(feedbackRecords)
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

operation Quit(captain: CaptainId): SessionEnded | Continued
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
