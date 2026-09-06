# Abstract game model

This chapter defines the game-state abstract data type (ADT), its observable
properties and the operations used in the command semantics. The world and
session model is still being extended.

## Game state and operations

`GameState` represents a galaxy and its participating sessions. Its representation
is unspecified. The records below describe properties that the specification can
observe; they do not require mutable objects, tables or a particular database.

```text
abstract type GameState

query ship(game: GameState, id: ShipId) -> Ship
query planet(game: GameState, id: PlanetId) -> Planet
query captain(game: GameState, id: CaptainId) -> Captain
query world(game: GameState) -> World
query tractorBeam(game: GameState, id: TractorBeamId) -> TractorBeam
query sector(game: GameState, position: Position)
    -> Optional<SectorObject>

operation Capture(actor: ShipId, target: Position)
    on GameState -> CaptureOutcome
```

Queries describe the current state without changing it. Operations describe
permitted changes and observations. Their names are specification vocabulary,
not additional commands or a required software interface. For example, the
CAPTURE grammar determines how player input invokes the `Capture` operation.
In an operation declared `on GameState`, game denotes the state on which it
acts. The result following the arrow is a semantic outcome: vertical bars
separate alternatives, and parentheses give any associated values. Thus
`Rejected(reason: CaptureRejection)` is an outcome carrying a reason, not
terminal text or a command that the player can enter.

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
and after the named semantic event. An equation between them is a requirement,
not an assignment or a prescribed update order. Where ordering matters, the
contract names separate events and states their ordering. Other world activity
may occur during an operation under the multiplayer rules; these contracts
do not imply that every command is one indivisible transaction.

Resource controls, movement, tractor beams, construction, CAPTURE, information
commands and session operations use this contract form. Other drafted clauses
still use the pseudocode below and are being brought into the same form.
An operation name alone does not define its meaning: its command or shared-rule
clause must supply the contract.

## Notation

A record names facts about the game. An enum names mutually exclusive values.
`Set<T>` is an unordered collection with no duplicates; `Sequence<T>` is ordered.
`Optional<T>` is either a value of T or `none`. These are specification concepts,
not required programming-language types or storage structures.

In a declaration, `property: T` gives the property's type. `A -> B` denotes a
total mapping: every value of A has exactly one associated value of B. For
example, `devices: Device -> DeviceState` associates each of the nine device
kinds with its own device state. Square brackets select a mapping entry;
a dot selects a named property. Neither notation requires an array or object
representation.

The query `ship(game, actor)` selects the ship identified by actor. A command
may bind that ship to s and then write `s.energy` or
`s.devices[WARP_ENGINES].damage`. A `ShipId` is an identity, not itself a Ship
record. Reading an optional value requires it to be present. Rules that act on
the position of an active, positioned ship use the contained Position value;
rules for admission and release handle absence explicitly.

Pseudocode describes the meaning of an operation:

```text
if condition:
    statement
else:
    statement
```

`:=` changes abstract game state. `==` compares values. `emit` produces an
observable game event or response; its terminal rendering is specified separately.
`reject` ends the current operation with the named diagnostic. Unless a rule
states otherwise, rejection does not undo effects that have already occurred.
An operation leaves unmentioned state unchanged. Interactive input, elapsed
time and simultaneous actions have explicit rules; pseudocode alone does not
make a whole command atomic.

`+=` and `-=` add to or subtract from a named value. `floor(x)` is the greatest
integer no greater than x. Lists in pseudocode use positions starting at one;
this is a notation convention, not a required indexing scheme.

A local name bound to a ship or another state record denotes that same game
entity. Updating a field through that name changes the entity's state.

## Quantities and identities

```text
type ShipId, CaptainId, BaseId, PlanetId, TractorBeamId, MessageId
type PublicationId
type Text = sequence of characters
type Boolean = true | false

enum Team       = FEDERATION | EMPIRE
enum ShieldMode = UP | DOWN
enum Condition  = GREEN | YELLOW | RED
enum OutputLength = SHORT | MEDIUM | LONG
enum PromptStyle = NORMAL | INFORMATIVE
enum ScanStyle = SHORT | LONG
enum CoordinateMode = ABSOLUTE | RELATIVE | BOTH
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

record Position:
    vertical: Coordinate
    horizontal: Coordinate

record SectorVector:
    vertical: real number of sectors
    horizontal: real number of sectors

record GridPoint:
    vertical: real coordinate
    horizontal: real coordinate
```

The identities distinguish entities. Names and name-matching order are separate
language rules. Arithmetic uses mathematical quantities. Rounding is applied only where a
rule explicitly requires a discrete result or a formatted display. Historical
word limits, overflow and intermediate truncation do not apply. This does not
change the command grammar or permit new game mechanics.

For positions a and b:

```text
distance(a, b) = max(
    abs(a.vertical - b.vertical),
    abs(a.horizontal - b.horizontal)
)
```

Thus diagonal neighbors have distance one.

A Position names a sector inside the galaxy. A GridPoint is a mathematical
point whose coordinates may be fractional or outside the galaxy. A SectorVector
describes direction and displacement; its components can be negative, zero or
fractional. Subtracting two positions gives the vector from the second to the
first. Adding a vector to a position or GridPoint adds corresponding components
and gives a GridPoint. It denotes a Position only when both components are whole
coordinates inside the galaxy. Path rules state any rounding and boundary
handling explicitly.

## Galaxy and roster

The galaxy contains 75 rows and 75 columns of sectors. Increasing the vertical
coordinate moves upward; increasing the horizontal coordinate moves rightward.
A sector can contain a ship, base, planet, star or black hole, or be empty.
The Romulan is a separate autonomous ship, not a player commission.
During HELP or GRIPE, a ship can retain its commission and position while its
sector has a different temporary interaction kind, as defined in
[session activities](session-rules.md#temporary-information-activities).

```text
SectorObject = PlayerShip(id: ShipId) | Starbase(id: BaseId)
             | PlanetObject(id: PlanetId) | RomulanObject
             | StarObject | BlackHoleObject
```

The sector query returns the object with which a sector-based observation or
action interacts, or none for an empty sector. These alternatives are abstract
object kinds, not numeric encodings. The position supplied to the query locates
a star or black hole; the other alternatives identify the corresponding entity.
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

```text
record Rectangle:
    minVertical, maxVertical: Coordinate
    minHorizontal, maxHorizontal: Coordinate

record World:
    elapsedOrigin: Optional<ClockOrigin>
    ships: collection of Ship
    bases: collection of Base
    baseOrder: Team -> Sequence<BaseId>
    planets: collection of Planet
    knowledge: Team -> TeamKnowledge
    playerCount: integer
    actionCount: integer
    teamTurns: Team -> integer
    teamCommissions: Team -> nonnegative integer
    romulanEnabled: Boolean
    blackHolesSelected: Boolean
    pacingClass: integer in 1..3
    beams: collection of TractorBeam
    teamScores: Team -> Score
    romulan: Optional<Romulan>
    romulanActivity: RomulanActivity
    radioService: RadioService
```

This is the portion of world state used by the converted command families.
Ordered iteration is stated wherever it affects a result; a collection does
not imply a particular container or an arbitrary permission to reorder effects.

**Source basis:** [world limits](../../legacy/utexas/PARAM.FOR#L5),
[roster](../../legacy/utexas/DECWAR.FOR#L489),
[world initialization](../../legacy/utexas/SETUP.FOR#L216).

## Ships

```text
record Shields:
    mode: ShieldMode
    strength: Percentage

record DeviceState:
    damage: Damage

record Ship:
    id: ShipId
    name: Text
    team: Team
    position: Optional<Position>
    captain: Optional<CaptainId>
    commissioned: Boolean
    energy: Energy
    hullDamage: Damage
    shields: Shields
    devices: Device -> DeviceState
    torpedoes: integer
    lifeSupportReserve: integer
    condition: Condition
    docked: Boolean
    tractorBeam: Optional<TractorBeamId>
    stardate: Stardate
    score: Score
    pendingScore: Score
```

A new commission begins with 5000 energy units, ten torpedoes, no hull or device
damage, five life-support turns, shields up at 100%, and green condition.
`commissioned` means a captain holds an active commission aboard the ship.
It can remain true at zero energy or fatal damage until the separate
commission-release event defined by the session rules.

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

```text
record Base:
    id: BaseId
    team: Team
    position: Position
    strength: Percentage

record Planet:
    id: PlanetId
    owner: Optional<Team>
    position: Position
    builds: integer
```

A base survives while its strength is positive. An owner of `none` denotes a
neutral planet. A planet's builds count construction stages; it is not a
fractional resource. Destruction and conversion remove an installation from
the world's collection of that kind. Enumeration order, where observable, is
specified separately from identity.

Each faction has ten base identities in the fixed order `world(game).baseOrder[t]`.
That order is unchanged by destruction or construction; a removed base's identity
can be reused. The two factions' identities are distinct. A base's team agrees
with the faction whose order contains its identity. The first identity without
a surviving base is the next available identity for that faction. This order
defines selection and report numbering, without prescribing a storage location.

## Tractor beams and score

```text
record TractorBeam:
    id: TractorBeamId
    endpoints: Set<ShipId> containing exactly two distinct identities

enum ScoreCategory = ENEMY_DAMAGE | ENEMY_KILLS | BASE_DAMAGE
                  | PLANET_CAPTURE | BASE_CONSTRUCTION
                  | ROMULAN | STAR_DESTRUCTION | PLANET_DESTRUCTION

type Score = mapping from ScoreCategory to Points

record Romulan:
    position: Position
    energy: Energy

record RomulanActivity:
    cadence: integer
    turns: Stardate
    appearances: integer
    phaserReady: TimePoint
    torpedoesReady: TimePoint
    score: Score
```

A tractor beam associates two ships symmetrically. Either endpoint can act on
that association under the tractor rules; it is not an ownership relationship.
Each ship can participate in at most one beam. For an established beam b, both
endpoint ships have `tractorBeam == b.id`; the endpoint set has no towing/towed
ordering. Acquiring or releasing an association must establish the corresponding
relationships on both ships. A movement command identifies which endpoint moves
first for that action, without changing the beam's membership.

Score is expressed in the units shown by the POINTS command. Category values
can be negative, and totals are their sum. A ship's pending score changes are
distinct from its accumulated score until turn accounting commits them.
Scoring rates and destruction bonuses are defined with the corresponding actions.

World.romulan describes the currently present autonomous ship. RomulanActivity
describes the continuing activity across its appearances: cadence counts enabled
driver invocations since the last reset, turns counts activations that pass the
cadence gate, and appearances counts created Romulans. The two readiness values
are weapon deadlines. Its score is cumulative across appearances in that galaxy.
Destroying a Romulan removes World.romulan but does not by itself reset any
RomulanActivity property. A new galaxy initializes cadence, turns, appearances
and every score category to zero, and both deadlines to its elapsed-time origin.
The [autonomous rules](autonomous.md) define later changes.

**Source basis:** [tractor association](../../legacy/utexas/DECWAR.FOR#L4432),
[score categories and display](../../legacy/utexas/DECWAR.FOR#L2893).

## Information and communication

```text
record TeamKnowledge:
    knownPlanets: Set<PlanetId>
    knownBases: Set<BaseId>

record RadioSettings:
    enabled: Boolean
    gaggedSenders: Set<ShipId>

record Captain:
    id: CaptainId
    ship: Optional<ShipId>
    displayName: Text
    privileged: Boolean
    outputLength: OutputLength
    promptStyle: PromptStyle
    scanStyle: ScanStyle
    inputCoordinates: CoordinateMode
    outputCoordinates: CoordinateMode
    terminalProfile: Optional<Text>
    radio: RadioSettings
    phaserReady: PhaserBank -> TimePoint
    torpedoesReady: TimePoint

type MessageSender = ShipId | ROMULAN | SYSTEM

record Message:
    id: MessageId
    sender: MessageSender
    recipients: Set<ShipId>
    remainingRecipients: Set<ShipId>
    body: Text

record RadioService:
    messages: Sequence<Message>
    publicationsInProgress: Set<PublicationId>
```

The recipients name the audience of a message. Message-delivery state is
specified separately from that original audience. Turning a radio off and
gagging a sender are distinct actions. The delivery rules determine which
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

Score reports use the following counters, where w is world(game):

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
