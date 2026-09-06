# Abstract game model

This chapter defines the abstract state of a DECWAR game. Later chapters use
these types, queries and operations to state the meaning of commands. The model
describes what an implementation must represent and observe, without prescribing
how it stores that information.

## Notation

The notation resembles TypeScript and algebraic data types, but it is
language-independent specification notation. It does not adopt JavaScript's
number system, object identity, inheritance or runtime behavior.

`type Name = { ... }` defines a record with named fields. `property: T` gives a
field's type. An enum lists mutually exclusive names. A union lists alternatives
separated by `|`. An alternative may carry named fields in braces. For example,
`Captured { planet: PlanetId }` carries a planet identity, while `Cancelled`
carries no value. These names are specification terms, not player input.


A result name belongs to the operation or type that introduces it. The same name
may therefore carry different values in different results. For example,
PublishMessage returns Published with a MessageId, while PublishNotice returns
Published with a NoticeId. The operation determines which Published result is
meant.

An operation may name its result alternatives directly. A bare name such as
Raised or Cancelled is an alternative with no associated value. Thus
`Result<Raised, ShieldsTooDamaged>` contains either Raised or
`Rejected { reason: ShieldsTooDamaged }`. A declared type name continues to mean
the complete type it declares.

Each opaque identity declaration introduces a distinct type. An `abstract type`
hides its representation. An `ordered type` also has an ordering defined by its
own clause. Neither form provides accessible fields unless another declaration
defines them.

Collections have one notation throughout the model:

| Type | Meaning |
| --- | --- |
| `List<T>` | Ordered values of type T; duplicates are permitted unless a rule excludes them. |
| `Set<T>` | Unordered values of type T, without duplicates. |
| `Map<K, V>` | One value of V for every key in K; a total mapping unless explicitly restricted. |
| `Optional<T>` | A value of T or none. Absence is not an operation failure. |
| `Result<T, Error>` | A non-rejected outcome of type T or a rejection carrying an Error. |

```text
type Result<T, Error> = T | Rejected { reason: Error };
```

Here T excludes Rejected. A rejection states why the operation stopped; it does
not imply that earlier effects were undone. Cancellation and lifecycle outcomes
are named separately where they can occur. Optional expresses absence rather
than rejection. A value is valid only within its declared domain, and quantities
such as Energy and Damage keep their units even when both are written as numbers.

Square brackets select a map entry, and a dot selects a record field. For
example, selecting WARP_ENGINES from `devices` gives the warp-engine record;
that record's `damage` field gives its damage. These expressions do not require
a JavaScript Map, array or mutable object. In a query or operation signature,
the type after the parameter list is the result type.

The query `ship(game, actor)` returns the ship identified by actor. A command may
bind that ship to s and then refer to `s.energy`. A ShipId identifies a ship but
is not itself a Ship record. An optional value must be present before a rule can
use its contents.

Pseudocode describes the meaning of an operation:

```text
if (condition) {
    statement;
}
else {
    statement;
}
```

`=` assigns a value. Assignment to a local name changes that binding; assignment
to a game-state property changes the property. A query never changes game state.

`==` tests equality and `!=` tests inequality. A Unit result carries no value and
does not by itself assert success. In a type declaration, `=` introduces the
definition; in a parameter, it supplies a default. Neither use changes game state.
`let name: T = value` introduces a local binding. A local's type may be omitted
when its value or the immediately preceding definition determines it. A
conditional expression `condition ? a : b` selects a when the condition is true
and b otherwise. Only the selected expression is evaluated.

`requires` states a precondition. `ensures` states a condition at completion.
`invariant` states a property of every valid observable state in its declared
scope. These are specification requirements, not implicit runtime checks. A
command's rejection clauses define what happens when a precondition is not met.

A record value is written `Name { field: value, ... }`; a bare name denotes
a variant with no payload. Declared payload names identify the same fields when
an outcome is constructed, inspected or described in an example.

`type Refined = Existing where { ... }` defines a subtype of Existing whose
values also satisfy the listed field constraints. It preserves Existing's
fields and does not add storage or prescribe a runtime validation mechanism.

`value with { field: replacement }` produces a record value with those fields
replaced and every other field preserved. It does not update the original.
`for (item in values)` visits a list in its order; a set requires an explicit
order whenever order affects observations. Bounded loops state their bounds.
Short English predicates and effects within pseudocode refer to the rules in
the surrounding clause; they are not additional fields or callable services.

`emit` produces an observable game event or response. Terminal rendering is
specified separately.
`reject` ends the current operation with the named diagnostic. Unless a rule
states otherwise, rejection does not undo effects that have already occurred.
An operation's own effects leave unmentioned state unchanged. This is a
restriction on what that operation changes, not a promise that other permitted
actions cannot change the same world while it is in progress. Interactive
input, elapsed time and simultaneous actions have explicit rules; pseudocode
alone does not make a whole command atomic.

A postcondition applies when its operation or substep completes. A later event
may change the value. An invariant states its own scope. A relationship required
after admission, release or construction need not hold during that transition.
For example, installation counters may temporarily differ from a fresh count
while an installation change is in progress.

`+=` and `-=` add to or subtract from a named value. `floor(x)` is the greatest
integer no greater than x. Lists in pseudocode use positions starting at one;
this is a notation convention, not a required indexing scheme.

A local name bound to a ship or another state record denotes that same game
entity. Updating a field through that name changes the entity's state.

Identity and value equality are different. Two observations refer to the same
ship when their ShipId values match, even if the ship's state changed between
observations. Records compare by fields, lists by position, sets by membership
and maps by corresponding entries. Different union alternatives are unequal.
Quantities compare only within the same unit.

## Quantities and identities

The model uses distinct identities for game entities and named quantity types
for values with different meanings. It also distinguishes sector positions from
points and displacement vectors used while calculating movement.

```text
type ShipId, CaptainId, BaseId, PlanetId, TractorBeamId, MessageId
type PublicationId
type ClockOrigin
type Text = sequence of characters
type Boolean = true | false
type Unit = unit

enum Team       = FEDERATION | EMPIRE
enum ShieldMode = UP | DOWN
enum Condition  = GREEN | YELLOW | RED
enum OutputLength = SHORT | MEDIUM | LONG
enum PromptStyle = NORMAL | INFORMATIVE
enum ScanStyle = SHORT | LONG
enum CoordinateMode = ABSOLUTE | RELATIVE | BOTH
type TerminalProfile = "ACT-IV" | "ADM-2" | "ADM-3A" | "DATAPOINT"
                     | "ACT-V" | "SOROC" | "BEEHIVE" | "CRT"
enum Device     = SHIELDS | WARP_ENGINES | IMPULSE_ENGINES
                | LIFE_SUPPORT | TORPEDO_TUBES | PHASERS
                | COMPUTER | RADIO | TRACTOR_BEAM
enum PhaserBank = FIRST | SECOND

type Coordinate = integer in 1..75
type Energy     = quantity in energy units
type Damage     = quantity in damage units
type Percentage = quantity in percentage points
type Duration   = quantity in milliseconds
type TimePoint  = elapsed-time instant
type Stardate   = integer count of game turns
type Points     = quantity in displayed game points
type UnitDraw   = real number in [0, 1)
type GridCoordinate = real number

type GridPoint = {
    vertical: GridCoordinate;
    horizontal: GridCoordinate;
};

type Position = GridPoint where {
    vertical: Coordinate;
    horizontal: Coordinate;
};

type SectorVector = {
    vertical: real number of sectors;
    horizontal: real number of sectors;
};
```

`GridPoint` is an absolute point and may have fractional coordinates while a
path is being traced. `Position` is the subset of GridPoint whose coordinates
are whole numbers from 1 through 75, so every Position names a sector.
`SectorVector` is a displacement rather than an absolute point; its components
may be positive, negative or fractional.

Arithmetic uses mathematical quantities. A rule rounds only when it explicitly
requires a discrete result or formatted display. PDP-10 word limits, overflow
and intermediate truncation do not apply.

### Quantity arithmetic

Energy, Damage, Percentage, Duration and Points are real magnitudes in their
declared units. The type name alone does not round or limit a value. A field or
operation states any required bound. Energy, score and reported strength may
therefore be negative when a rule produces a negative result.

Addition, subtraction and comparison require quantities of the same kind.
Multiplication or division by a dimensionless real preserves the quantity kind;
dividing two quantities of the same kind gives a dimensionless real when the
denominator is nonzero. A formula that transfers a numerical magnitude between
different kinds states the conversion explicitly. Thus ApplyShipHit adds a
numerical amount in damage units to hull damage and subtracts the same numerical
amount in energy units from energy; Energy and Damage are still distinct types.

Percentage is measured in percentage points: 100% has magnitude 100 and 5% has
magnitude 5. Adding 5 percentage points to 20% produces 25%; multiplying 20% by
0.5 produces 10%. For a strength magnitude S, `S/100` is its dimensionless
fraction.

Subtracting two TimePoint values on the same elapsed-time axis gives a Duration.
Adding a Duration to a TimePoint gives a TimePoint on that axis. TimePoint is not
a calendar date or a Stardate. A Duration may be negative, as in a deadline
already passed; the waiting clause defines the effect of requesting a wait of
at most zero. Calendar and clock-discontinuity bindings remain separate.

Stardate and Coordinate retain their declared discrete domains. These arithmetic
conventions do not turn command counts into real-valued inputs or add a legal
command form. Explicit conversion, rounding, caps and fatal thresholds in the
operation clauses take precedence over any informal expectation about a resource.

### Sector geometry

Rectangles define inclusive regions of the galaxy. Each of their four limits is
a sector coordinate within the 75 by 75 grid.

```text
type Rectangle = {
    minVertical, maxVertical: Coordinate
    minHorizontal, maxHorizontal: Coordinate
};
```

`distance` is the Chebyshev distance between two sector positions:

```text
function distance(a: Position, b: Position): nonnegative integer {
    return max(
        abs(a.vertical - b.vertical),
        abs(a.horizontal - b.horizontal)
    );
}
```

Sectors sharing an edge or corner therefore have distance one.

Adding a SectorVector to a Position or GridPoint adds corresponding components
and produces a GridPoint. The result is a Position only when both coordinates
are whole numbers from 1 through 75.

## Galaxy and roster

The galaxy contains 75 rows and 75 columns of sectors. Increasing the vertical
coordinate moves upward; increasing the horizontal coordinate moves rightward.
A sector is empty or has one interaction object of the following kind:

```text
type SectorObject =
    | PlayerShip { id: ShipId } | Starbase { id: BaseId }
    | PlanetObject { id: PlanetId } | RomulanObject
    | StarObject | BlackHoleObject
```

The sector query returns one of these values, or none for an empty sector.
PlayerShip identifies a member of the fixed player roster; RomulanObject refers
to `World.romulan` and cannot carry a player commission. Both participate in
spatial rules while retaining separate lifecycle and behavior rules. The
alternatives are abstract object kinds, not numeric encodings.

During HELP or GRIPE, a ship can retain its commission and position while its
sector has a different temporary interaction kind, as defined in
[session activities](session-rules.md#temporary-information-activities).
An active information activity can make this query return BlackHoleObject while
the ship's commission and position remain present. The session rules specify
that distinction; a sector query is not a query for every ship with that position.

Austin supports eighteen captains, nine per faction. Ship-name resolution
examines Federation ships in the order below, then Empire ships in that order.

| Federation | Empire |
| --- | --- |
| Excalibur | Buzzard |
| Farragut | Cobra |
| Intrepid | Demon |
| Lexington | Goblin |
| Nimitz | Hawk |
| Savannah | Jackal |
| Trenton | Manta |
| Vulcan | Panther |
| Yorktown | Wolf |

The initial world has twenty planets and ten bases for each faction. Placement
and initialization are defined in [galaxy creation](session-rules.md#galaxy-creation-and-placement).

## Score quantities

A score records points by the event that earned or lost them. This keeps each
category available for the POINTS report as well as for calculating the total.

```text
enum ScoreCategory = ENEMY_DAMAGE | ENEMY_KILLS | BASE_DAMAGE
                  | PLANET_CAPTURE | BASE_CONSTRUCTION
                  | ROMULAN | STAR_DESTRUCTION | PLANET_DESTRUCTION

type Score = Map<ScoreCategory, Points>
```

Category values can be negative, and the total score is their sum. Pending score
changes remain separate from accumulated score until turn accounting commits
them. Each action defines its own scoring rate and destruction bonus.

**Source basis:** [score categories and display](../../legacy/utexas/DECWAR.FOR#L2893).

## Ships

A Ship record contains the persistent state of one named vessel. It combines
its commission, location, resources, damage, equipment, score and current
relationships with the rest of the game.

```text
type Shields = {
    mode: ShieldMode;
    strength: Percentage;
};

type DeviceState = {
    damage: Damage;
};

type Ship = {
    id: ShipId;
    name: Text;
    team: Team;
    position: Optional<Position>;
    captain: Optional<CaptainId>;
    commissioned: Boolean;
    energy: Energy;
    hullDamage: Damage;
    shields: Shields;
    devices: Map<Device, DeviceState>;
    torpedoes: integer;
    lifeSupportReserve: integer;
    condition: Condition;
    docked: Boolean;
    tractorBeam: Optional<TractorBeamId>;
    stardate: Stardate;
    score: Score;
    pendingScore: Score;
};
```

A new commission begins with 5000 energy units, ten torpedoes, no hull or device
damage, a life-support reserve of 5, shields up at 100% and green condition.
`commissioned` marks active participation for rules that test presence or choose
targets. Combat destruction clears it but retains the captain association until
ReleaseCommission, allowing the captain to receive final reports. A fatal value
or a cleared commissioned flag does not by itself complete release or make the
ship available to another captain.

### Life-support reserve

`s.lifeSupportReserve` is a signed integer reserve count. It is a separate
property from `s.devices[LIFE_SUPPORT].damage`, from the ship's stardate and
from elapsed time. It begins at 5. A qualifying undocked turn decreases it by
one when life-support damage is at least 300 damage units at that turn's
life-support check. Docking prevents that decrement; automatic repair occurs
before the check and can make it inapplicable. These conditions are defined by
[CompleteTurn](turns.md#turn-accounting).

The value can reach zero without exhausting life support. At that check, a
negative value sets hull damage to 2500 damage units. Consequently the field is
not constrained to nonnegative integers, and its initial value is not a fixed
five-turn or elapsed-time survival promise. A [successful docking](commands.md#dock)
restores the reserve to 5. Skipping its decrement does not itself replenish it.

**Source basis:** [initial reserve](../../legacy/utexas/SETUP.FOR#L395),
[turn check and exhaustion](../../legacy/utexas/DECWAR.FOR#L241).

### Damage and device state

`Damage` is a scalar quantity measured in damage units. It has no fields.
`Device` identifies a kind of equipment; `DeviceState` describes that equipment's
damage aboard one ship. Every Ship has a DeviceState for each of the nine Device
values, even when the device is undamaged. Zero device damage means undamaged;
larger values mean more damage. The permission to use a device is determined by
the operation's precondition, not by a universal working/broken flag.

For a ship s, the expressions below select distinct properties:

| Expression | Meaning |
| --- | --- |
| `s.hullDamage` | Damage to the ship's hull, of type Damage. |
| `s.devices[WARP_ENGINES]` | The warp engines' DeviceState aboard s. |
| `s.devices[WARP_ENGINES].damage` | Damage to those engines, of type Damage. |
| `s.devices[SHIELDS].damage` | Damage to shield equipment, of type Damage. |
| `s.shields.strength` | Available shield strength, of type Percentage. |
| `s.shields.mode` | Whether the shields are UP or DOWN, of type ShieldMode. |

Warp engines are therefore a key in s.devices, not a property of a damage
object. Hull damage is separate from all nine device-damage values. Shield
strength, shield mode and damage to shield equipment are also separate:
changing one changes another only when an operation explicitly says so.

| Device value | Equipment whose damage is selected |
| --- | --- |
| SHIELDS | Shield equipment |
| WARP_ENGINES | Warp propulsion |
| IMPULSE_ENGINES | Impulse propulsion |
| LIFE_SUPPORT | Life-support equipment |
| TORPEDO_TUBES | Photon-torpedo tubes |
| PHASERS | Phaser equipment |
| COMPUTER | Navigation and targeting computer |
| RADIO | Radio equipment |
| TRACTOR_BEAM | Tractor-beam equipment |

**Example:** MOVE requires `s.devices[WARP_ENGINES].damage < 300 damage units`.
SHIELDS UP instead requires `s.devices[SHIELDS].damage <= 300 damage units`.
At exactly 300 units, the former operation is rejected and the latter is
permitted. A single derived predicate such as “all devices work below 300”
would erase this distinction.

In command prose, “warp-engine damage” denotes precisely
`s.devices[WARP_ENGINES].damage` for the identified ship s; the other device names
follow the same convention. Preconditions and state-effect equations use the
explicit property path. “Engine energy” denotes `s.energy`, a shared ship
resource, not an additional property of either propulsion device.

## Installations

Bases and planets are installations at fixed sectors. Bases belong to a faction
and have defensive strength. Planets may be neutral or owned, and their builds
record progress toward conversion into a base.

```text
type Base = {
    id: BaseId;
    team: Team;
    position: Position;
    strength: Percentage;
};

type Planet = {
    id: PlanetId;
    owner: Optional<Team>;
    position: Position;
    builds: integer;
};
```

A base survives while its strength is positive. A planet with no owner is
neutral, and its builds value is an integer count of construction stages.
Removing or converting a planet removes it from `world.planets`. Destroying a
base removes its sector presence but retains its record in `world.bases` with
zero strength, so a later BUILD may reactivate that identity.

Each faction has ten base identities in the fixed order `world(game).baseOrder[t]`.
That order is unchanged by destruction or construction; an inactive base's identity
can be reused. The two factions' identities are distinct. A base's team agrees
with the faction whose order contains its identity. The first identity without
a surviving base is the next available identity for that faction. This order
defines selection and report numbering, without prescribing a storage location.

## Tractor beams and Romulan activity

Tractor beams relate pairs of player ships. The Romulan types describe the
autonomous ship currently in the galaxy and the activity that continues between
its appearances.

```text
type TractorBeam = {
    id: TractorBeamId;
    endpoints: Set<ShipId> containing exactly two distinct identities;
};

type Romulan = {
    position: Position;
    energy: Energy;
};

type RomulanActivity = {
    cadence: integer;
    turns: Stardate;
    appearances: integer;
    phaserReady: TimePoint;
    torpedoesReady: TimePoint;
    score: Score;
};
```

A tractor beam associates two ships symmetrically. Either endpoint can act on
that association under the tractor rules; it is not an ownership relationship.
Each ship can participate in at most one beam. For an established beam b, both
endpoint ships have `tractorBeam == b.id`; the endpoint set has no towing/towed
ordering. Acquiring or releasing an association must establish the corresponding
relationships on both ships. A movement command identifies which endpoint moves
first for that action, without changing the beam's membership.

`World.romulan` describes the autonomous ship currently present.
`RomulanActivity` continues across appearances: cadence counts enabled driver
invocations since the last reset, turns counts activations that pass the cadence
gate, and appearances counts created Romulans. The readiness values are weapon
deadlines, and the score accumulates across appearances. Destroying the current
Romulan removes `World.romulan` without resetting this activity. A new galaxy
resets the counters and score, and sets both deadlines to its elapsed-time origin.

**Source basis:** [tractor association](../../legacy/utexas/DECWAR.FOR#L4432),
[score categories and display](../../legacy/utexas/DECWAR.FOR#L2893).

## Information and communication

These records describe captain preferences, shared faction knowledge, radio
messages and the delivery state needed for communication between ships.

```text
type TeamKnowledge = {
    knownPlanets: Set<PlanetId>;
    knownBases: Set<BaseId>;
};

type RadioSettings = {
    enabled: Boolean;
    gaggedSenders: Set<ShipId>;
};

type Captain = {
    id: CaptainId;
    ship: Optional<ShipId>;
    displayName: Text;
    privileged: Boolean;
    outputLength: OutputLength;
    promptStyle: PromptStyle;
    scanStyle: ScanStyle;
    inputCoordinates: CoordinateMode;
    outputCoordinates: CoordinateMode;
    terminalProfile: Optional<TerminalProfile>;
    radio: RadioSettings;
    phaserReady: Map<PhaserBank, TimePoint>;
    torpedoesReady: TimePoint;
};

type MessageSender = ShipId | ROMULAN | SYSTEM

type Message = {
    id: MessageId;
    sender: MessageSender;
    recipients: Set<ShipId>;
    remainingRecipients: Set<ShipId>;
    body: Text;
};

type RadioService = {
    messages: List<Message>;
    publicationsInProgress: Set<PublicationId>;
};
```

`recipients` records a message's original audience; `remainingRecipients`
records which members of that audience have not consumed it. Turning a radio off
and gagging a sender are separate actions. Delivery rules determine which
messages can be received and when.

RadioService.messages contains published messages in publication order.
Each has a distinct identity and at least one remaining recipient. An operation
removes a message from this sequence when no recipients remain. The separate
publicationsInProgress set identifies publication attempts that have obtained
capacity but have not yet published or abandoned their messages. These
identities describe overlapping operations, not storage addresses. Together,
published messages and publications in progress occupy at most 32 places.
The [communication operations](communication.md) define acquisition, release
and loss of this capacity. These declarations impose no array or queue layout.

Each captain has two independent phaser readiness deadlines. For a captain c:

```text
c.phaserReady[FIRST]     first bank's deadline
c.phaserReady[SECOND]    second bank's deadline
```

The PHASERS command selects the earlier deadline, choosing FIRST on equality.
Both banks use the same `s.devices[PHASERS].damage` value on that captain's ship;
there are not two independent phaser-device damage values. The torpedo tubes
have one deadline, `c.torpedoesReady`, shared by successive bursts.

Faction knowledge records discovery of an installation's identity. It does not
store a frozen copy of its coordinates, owner, builds or strength. Report rules
specify which current properties of a known remote installation are disclosed.
Counting an object in a whole-game summary need not reveal its location or add
it to knowledge. A detailed installation report can perform that discovery update.

Score reports use the following counters, where w denotes the World record:

```text
w.teamCommissions[team]          faction commission count
w.teamTurns[team]                faction turn count
w.romulanActivity.appearances    Romulan commission count
w.romulanActivity.turns          Romulan turn count
```

A ship's turn count is Ship.stardate. These
historical counters are distinct from World.playerCount and from the number of
currently commissioned ships. The lifecycle rules define their initial values
and increments; POINTS only observes them.

These declarations introduce the vocabulary for rewritten commands. They are
not yet a complete world, combat or session model.

**Source basis:** [ship and device meanings](../../legacy/utexas/PARAM.FOR#L44),
[new ship state](../../legacy/utexas/SETUP.FOR#L367),
[distance](../../legacy/utexas/WARMAC.MAC#L3720),
[radio controls](../../legacy/utexas/DECWAR.FOR#L3129).

## Combat observation and notice values

These values describe reports of combat and related events. They do not apply
damage or deliver output by themselves. CriticalHit identifies an additional
critical effect; DisplacementResult records whether an object stayed, moved or
entered a black hole. DestructionCause distinguishes direct damage from a
black-hole loss. The [combat rules](world-rules.md#weapon-damage-to-ships-and-bases)
determine when those results occur.

```text
enum DestructionCause = DIRECT_DAMAGE | BLACK_HOLE

type CriticalHit = DeviceCritical { device: Device, damage: Damage } | BaseCritical
type DisplacementResult = Stayed | Moved { position: Position }
                        | Swallowed { position: Position }
type ShipImpactState = {
    ship: ShipId;
    position: Position;
    shields: Shields;
};

type BaseImpactState = {
    base: BaseId;
    position: Position;
    strength: Percentage;
};

type PlanetImpactState = {
    planet: PlanetId;
    owner: Optional<Team>;
    position: Position;
    builds: nonnegative integer;
};

type RomulanImpactState = {
    position: Position;
    energy: Energy;
};

type ImpactObject = ShipState { value: ShipImpactState }
                  | BaseState { value: BaseImpactState }
                  | PlanetState { value: PlanetImpactState }
                  | RomulanState { value: RomulanImpactState }
type ImpactOrigin = ObjectOrigin { object: ImpactObject } | StarOrigin { position: Position }
enum ImpactKind = PHASER | TORPEDO | NOVA

type ImpactObservation = {
    origin: ImpactOrigin;
    target: ImpactObject;
    kind: ImpactKind;
    damage: Optional<Damage>;
    critical: Optional<CriticalHit>;
    deflected: Boolean;
    displacement: DisplacementResult;
    destruction: Optional<DestructionCause>;
};

enum StarOutcome = EXPLODED | UNAFFECTED
type StarObservation = {
    position: Position;
    outcome: StarOutcome;
};

enum TorpedoFlightOutcome = MISSED | ABSORBED | NEUTRALIZED
type TorpedoObservation = {
    shot: positive integer;
    position: Position;
    outcome: TorpedoFlightOutcome;
};

enum BaseNoticeReason = DISTRESS | DESTROYED
type BaseObservation = {
    base: BaseId;
    position: Position;
    reason: BaseNoticeReason;
};

type EnergyTransferObservation = {
    sender: ShipId;
    recipient: ShipId;
    received: Energy;
};

enum TractorObservation = ACTIVATED | BROKEN

type CombatObservation = Impact { value: ImpactObservation }
    | StarEvent { value: StarObservation } | TorpedoEvent { value: TorpedoObservation }
    | BaseEvent { value: BaseObservation } | RomulanDetected { position: Position }
    | EnergyReceived { value: EnergyTransferObservation }
    | TractorEvent { value: TractorObservation }

enum CombatObservationKind = WEAPON_HIT | NOVA_HIT
    | STAR_EXPLOSION | STAR_UNAFFECTED
    | TORPEDO_MISS | TORPEDO_ABSORBED | TORPEDO_NEUTRALIZED
    | BASE_DISTRESS | BASE_DESTROYED | ROMULAN_DETECTED
    | ENERGY_TRANSFER | TRACTOR_ACTIVATED | TRACTOR_BROKEN

abstract type NoticeId
ordered type PublicationOrder

type NoticePriority = integer in 1..40

type CombatNotice = {
    id: NoticeId;
    publisher: ShipId;
    priority: NoticePriority;
    publication: PublicationOrder;
    observation: CombatObservation;
    recipients: Set<ShipId>;
    remainingRecipients: Set<ShipId>;
};

type CombatNoticeService = {
    notices: Set<CombatNotice>;
};
```

Impact observations retain values from the reported event; they do not identify
additional mutable entities. A combat notice associates one such observation
with its publisher and intended and remaining recipients. NoticeId distinguishes
notices. PublicationOrder orders completed publications chronologically and has
no wraparound or time unit. NoticePriority is a delivery preference within a
publisher's notices. The [notice service](communication.md#combat-notices)
defines capacity, publication, selection and loss; the [impact rules](communication.md#impact-observation-adts)
define the values recorded for each kind of hit.

**Source basis:** [notice capacity](../../legacy/utexas/WARMAC.MAC#L183),
[publication](../../legacy/utexas/WARMAC.MAC#L2771),
[notice display](../../legacy/utexas/DECWAR.FOR#L2392).

## World

World collects the shared state of one galaxy: its entities, faction records,
global counters, autonomous activity and communication services.

```text
type World = {
    elapsedOrigin: Optional<ClockOrigin>;
    ended: Boolean;
    ships: Set<Ship>;
    bases: Set<Base>;
    baseOrder: Map<Team, List<BaseId>>;
    baseCounts: Map<Team, nonnegative integer>;
    capturedPlanetCounts: Map<Team, nonnegative integer>;
    planets: List<Planet>;
    knowledge: Map<Team, TeamKnowledge>;
    playerCount: integer;
    actionCount: integer;
    teamTurns: Map<Team, integer>;
    teamCommissions: Map<Team, nonnegative integer>;
    romulanEnabled: Boolean;
    blackHolesSelected: Boolean;
    pacingClass: integer in 1..3;
    beams: Set<TractorBeam>;
    teamScores: Map<Team, Score>;
    romulan: Optional<Romulan>;
    romulanActivity: RomulanActivity;
    combatNotices: CombatNoticeService;
    radioService: RadioService;
};
```

World contains entity records, each identified by its id. Within each of
ships, bases, planets and beams, no two entities have the same identity.
Changing an entity's fields does not create a second entity or change its id.
A historical observation can retain an earlier value for that same identity;
it is not another member of the world's collection.

The ship, base and beam sets do not establish iteration order. Rules that need
an order state it explicitly, such as the roster order for ships and baseOrder
for bases. The planet sequence does establish the current planet order used
by discovery, reports and other traversals. Removing a planet preserves the
relative order of the surviving planets under [RemovePlanet](world-rules.md#planet-removal).
These are abstract membership and ordering properties, not a requirement for
any particular container.

The base set contains the fixed records identified by both factions' baseOrder
lists, including bases with nonpositive strength. Its size is not the number
of surviving bases. Likewise, a ship record remains in the roster when its
commission ends. By contrast, the planet list contains the current planets;
removed planets can remain in earlier observations without remaining members.
A record's membership, its sector presence and its eligibility for an operation
are distinct properties. The operation's own tests decide eligibility.

baseCounts is the maintained number of bases for each faction;
capturedPlanetCounts is its maintained number of owned planets. These counters
are explicit state because installation transitions update them at specified
points. They need not equal a fresh count of positive-strength bases or current
planet owners during an unfinished conversion or removal. Admission population,
cumulative commission counts and installation counts are separate quantities.

**Source basis:** [world limits](../../legacy/utexas/PARAM.FOR#L5),
[roster](../../legacy/utexas/DECWAR.FOR#L489),
[world initialization](../../legacy/utexas/SETUP.FOR#L216),
[planet order on removal](../../legacy/utexas/DECWAR.FOR#L2864).

## Game state and operations

`GameState` represents a galaxy and its participating sessions. The preceding
records name properties that the specification can observe. They do not require
mutable objects, tables or a particular database.

```text
abstract type GameState

query ship(game: GameState, id: ShipId): Ship
query base(game: GameState, id: BaseId): Base
query planet(game: GameState, id: PlanetId): Planet
query captain(game: GameState, id: CaptainId): Captain
query world(game: GameState): World
query tractorBeam(game: GameState, id: TractorBeamId): TractorBeam
query sector(game: GameState, position: Position): Optional<SectorObject>
```

Queries describe current state without changing it. Operations describe allowed
changes and observations. Their names are specification vocabulary rather than
player commands or a required programming interface. The command chapters pair
these operations with the grammar that invokes them. Within an operation,
`game` denotes the current GameState. A rejection carries its declared reason;
it is neither terminal text nor player input.

### Query domains

An entity query requires an identity belonging to the corresponding current
game-state domain. The identity type distinguishes kinds of entity; it does not
by itself prove that an entity is present in this game.

| Query | Required domain and result |
| --- | --- |
| ship | A roster ShipId; returns that ship record, including when it has no current commission. |
| base | A BaseId in the fixed base roster; returns the record even when its strength is zero. |
| planet | A PlanetId in the current planet collection; returns that planet record. |
| captain | A CaptainId represented by a participating session; returns that captain record. |
| tractorBeam | A TractorBeamId in the current beam set; returns that association. |
| sector | An in-galaxy Position; returns the interaction object at that position, or none for an empty sector. |

A query outside its domain has no defined result. It does not create a default
entity or produce a player-visible error. An operation that accepts an absent
identity must check for absence before making the query. For example,
RemovePlanet returns NoPlanet for an absent target without evaluating
`planet(game, target)`.

Optional results describe permitted absence inside a query's domain. Thus an
empty sector is a valid result, while a coordinate outside the galaxy is not a
Position. A ship's absent position also does not prevent querying its roster
record; it prevents using that optional position as a Position without checking
presence. Concurrent invalidation between a check and use is governed by the
operation's coordination contract; these domain rules do not make the pair atomic.

### Operation contracts

An operation contract states:

- **Inputs and preconditions:** the values it accepts and conditions required
  for success, including the order of checks when that affects a diagnostic.
- **State effects:** the relationships between properties before and after
  the action, including resource costs and information disclosure.
- **Outcome and observations:** success, rejection or cancellation, and the
  reports or events available to participants.
- **Completion:** elapsed-time requirements and any shared turn or lifecycle
  effects that follow the action.

In a contract, `before(x)` and `after(x)` refer to a property immediately before
and after a named event. An equation between them states a required relationship,
not an assignment or update order. When order matters, the contract names the
events and their sequence. Multiplayer activity may occur during an operation;
a contract does not make the entire command indivisible.

Command and shared-rule clauses combine these contracts with the pseudocode
notation defined above. An operation name alone does not define its meaning:
its command or shared-rule clause must supply the contract.

## Coordination and overlapping operations

A command may contain a **coordinated phase**. While that phase is active, no
other session may enter a coordinated phase in the same domain. This rule
constrains execution order without requiring a particular threading model,
lock, database or storage layout. Austin has two coordination domains:

```text
enum CoordinationDomain = WORLD_CHANGE | SHARED_SERVICE
```

WORLD_CHANGE includes the coordinated portions of admission, commission release,
resume, ship relocation and planet updates. These portions share one domain;
operating on different planets or distant sectors does not give them independent
coordination. SHARED_SERVICE includes radio capacity admission, publication,
message search/removal and administrative statistics clearing. In particular,
statistics clearing is not independent of radio coordination.

Different domains do not exclude each other by this rule. Uncoordinated actions
and observations are not excluded merely because another session is in a
coordinated phase. Thus coordination does not freeze the galaxy, make a complete
command atomic or guarantee a consistent multirow report.

### Phase boundaries

The following boundaries supplement the relevant operation contracts. Entry
means successful admission to the coordinated phase. A failed or pending entry
has not begun that phase; the command's existing refusal or retry rule applies.

| Operation portion | Ordinary boundary | Domain |
| --- | --- | --- |
| Admission | Begins before consuming the participant place and deciding galaxy reuse/creation. Ends after an available ship is selected, before its score is cleared and its commission is established. | WORLD_CHANGE |
| MOVE or IMPULSE relocation | Begins after path selection and energy payment, before changing the actor's sector and position. Ends before tractor following. | WORLD_CHANGE |
| Fifth BUILD conversion | Begins after the fifth build and its ordinary pending score have been recorded. Ends after planet removal, before the new base's position, strength and sector presence are installed; the no-base-place path ends after restoring build count. | WORLD_CHANGE |
| CAPTURE update | Begins after adjacency and ownership checks. Includes discovery, faction counts, energy payment and build reset. Ends before the sector's new ownership and the defensive hit. | WORLD_CHANGE |
| Planet damage by a player or Romulan torpedo | Includes the planet build reduction and any destruction/removal. Ends before publishing the resulting combat notice. | WORLD_CHANGE |
| Planet damage by a nova | Includes build reduction, its combat notice and any destruction/removal. Ends after those effects. | WORLD_CHANGE |
| Commission release | Begins before removing the ship's sector presence. Ordinarily ends after unread-message cleanup and marking the ship available, subject to the nested-phase rule below. | WORLD_CHANGE |
| Radio capacity admission | Includes capacity-loss selection and reservation of a publication place. Ends before copying the accepted body. | SHARED_SERVICE |
| Radio publication | Includes making the completed message available in publication order. Ends after that update. | SHARED_SERVICE |
| Radio message search or recipient removal | Each search or removal is a separate phase; selecting a message does not keep the search phase active through the whole reception operation. | SHARED_SERVICE |
| Administrative statistics clearing | Begins before the administrative feedback record and archive writes. Ordinarily ends at the operation's stated administrative-access release. | SHARED_SERVICE |

These are boundaries within operations, not new commands. Intermediate effects
outside a listed phase retain their source-defined ordering and are not rolled
back simply because a later phase cannot begin. In particular, a failed fifth
BUILD conversion does not imply that its earlier build and score changes never
occurred. A blocked relocation does not refund the already paid movement cost.

### Failed entry

Failure to enter a coordinated phase is an execution outcome supplied by the
coordination binding. It has no common command-level recovery rule. The
following outcomes apply before any effects inside the requested phase:

| Requested phase | Continuation after failed entry |
| --- | --- |
| Admission | Check interruption or disconnection and exit when required; otherwise retry entry before consuming a participant place. |
| MOVE or IMPULSE relocation | Retry entry with the selected destination and movement cost already paid. The retry does not repeat path selection or charge that cost again. |
| Fifth BUILD conversion | Report that the construction crew is busy and reject the conversion attempt. Retain the fifth build and its ordinary pending build credit; no base is installed. |
| CAPTURE update | Report surrender refusal and reject capture without its ownership, resource or score changes. |
| Commission release | After the already-available guard, retry entry before clearing presence, changing participant counts or preserving the departing condition. |
| Conditional environment continuation | After ship and saved-sector availability checks, retry entry before reactivation. These retries do not repeat those availability checks. |
| Radio capacity admission | Return NotPublished before reserving a place, applying capacity loss or copying the body. |
| Radio publication | Retry entry; the accepted body and reserved place remain pending until publication can proceed. |
| Radio message search | Return NoMessage without consuming a message or changing its remaining recipients. This does not assert that the unread set is empty. |
| Radio recipient removal | Retry entry before removing the selected recipient. |
| Player torpedo planet update | End the burst with PlanetUpdateRefused and the prescribed tube-empty report. Retain shots already consumed, including this shot. No planet damage choice, readiness-deadline update or turn completion follows this refusal. |
| Romulan torpedo planet update | Skip this planet's damage and hit report, then continue the burst without retargeting. |
| Nova planet update | Return PlanetUpdateRefused for this impact without changing the planet or publishing its hit. The enclosing explosion continues its remaining impacts. |

These outcomes describe the operation's response to failure, not the conditions
under which the binding must fail. In particular, the refusal messages do not
introduce a random surrender rule, an additional construction resource, or a
claim that ammunition became zero. Effects completed before the attempted entry
remain in force. The phase-boundary and nested-release rules still apply after
successful entry.

### Nested operations and waiting

Coordination belongs to the session, not to a nested call. Ending any coordinated
phase ends all coordination then held by that session, in both domains. Returning
from a nested operation does not restore its caller's former coordination.
This rule does not end another session's phase.

For example, commission release can enter radio message search while discarding
unread messages. Completion of that search ends the releasing session's
WORLD_CHANGE coordination as well as its SHARED_SERVICE coordination, even
though commission cleanup continues. Do not treat the whole release as an
indivisible operation on that path. If no such nested phase completes, the
ordinary release boundary still applies.

Waiting for a command argument or an elapsed-time delay does not, by itself,
end a coordinated phase. Admission can retain WORLD_CHANGE coordination across
its faction and ship-choice prompts. Returning to ordinary command acquisition
ends the session's remaining coordination before pending reports and input
processing. Environment exit also ends it. These are distinct boundaries; a
prompt inside an operation is not automatically a return to command acquisition.

There is no FIFO admission, fairness, finite-wait or automatic-timeout guarantee
in these rules. Failure causes, scheduling and environment termination must be
stated by the applicable binding. Neither a failure indication nor a diagnostic
establishes that another captain deliberately refused the action.

**OPEN QUESTION:** Reentrant entry within the same domain, cross-galaxy scope,
interruptions and every resulting stale-observation case still require the full
coordination binding. The constraints above do not choose a winner for racing
ship claims, invent a destination recheck or guarantee that a selected radio
message remains available while a later phase begins. They establish which
whole-operation atomicity assumptions are unsupported.

**Source basis:** [coordination domains and release scope](../../legacy/utexas/WARMAC.MAC#L3768),
[admission boundary](../../legacy/utexas/SETUP.FOR#L163),
[ship-selection boundary](../../legacy/utexas/SETUP.FOR#L353),
[relocation boundary](../../legacy/utexas/DECWAR.FOR#L2227),
[BUILD conversion](../../legacy/utexas/DECWAR.FOR#L551),
[CAPTURE update](../../legacy/utexas/DECWAR.FOR#L618),
[nova planet update](../../legacy/utexas/DECWAR.FOR#L2375),
[Romulan planet update](../../legacy/utexas/DECWAR.FOR#L3496),
[player torpedo planet update](../../legacy/utexas/DECWAR.FOR#L4387),
[commission release](../../legacy/utexas/DECWAR.FOR#L1082),
[radio phases](../../legacy/utexas/WARMAC.MAC#L2603),
[administrative phase](../../legacy/utexas/WARMAC.MAC#L4636),
[input waiting](../../legacy/utexas/WARMAC.MAC#L1394),
[elapsed waiting](../../legacy/utexas/WARMAC.MAC#L3372),
[command acquisition](../../legacy/utexas/DECWAR.FOR#L1214),
[environment exit](../../legacy/utexas/WARMAC.MAC#L1060).
