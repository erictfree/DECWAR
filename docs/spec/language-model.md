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

Resource controls, CAPTURE, information commands and session operations use
this contract form. Other drafted clauses still use the pseudocode below and
are being brought into the same form. An operation
name alone does not define its meaning: its command or shared-rule clause must
supply the contract.

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

## Galaxy and roster

The galaxy contains 75 rows and 75 columns of sectors. Increasing the vertical
coordinate moves upward; increasing the horizontal coordinate moves rightward.
A sector can contain a ship, base, planet, star or black hole, or be empty.
The Romulan is a separate autonomous ship, not a player commission.
During HELP or GRIPE, a ship can retain its commission and position while its
sector has a different temporary interaction kind, as defined in
[session activities](session-rules.md#temporary-information-activities).

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
    ships: collection of Ship
    bases: collection of Base
    planets: collection of Planet
    knowledge: Team -> TeamKnowledge
    playerCount: integer
    actionCount: integer
    teamTurns: Team -> integer
    romulanEnabled: Boolean
    pacingClass: integer in 1..3
    beams: collection of TractorBeam
    teamScores: Team -> Score
    romulan: Optional<Romulan>
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

## Tractor beams and score

```text
record TractorBeam:
    id: TractorBeamId
    endpoints: pair of ShipId

enum ScoreCategory = ENEMY_DAMAGE | ENEMY_KILLS | BASE_DAMAGE
                  | PLANET_CAPTURE | BASE_CONSTRUCTION
                  | ROMULAN | STAR_DESTRUCTION | PLANET_DESTRUCTION

type Score = mapping from ScoreCategory to Points

record Romulan:
    position: Position
    energy: Energy
    score: Score
```

A tractor beam associates two ships symmetrically. Either endpoint can act on
that association under the tractor rules; it is not an ownership relationship.
Each ship can participate in at most one beam.

Score is expressed in the units shown by the POINTS command. Category values
can be negative, and totals are their sum. A ship's pending score changes are
distinct from its accumulated score until turn accounting commits them.
Scoring rates and destruction bonuses are defined with the corresponding actions.

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
    phaserReady: pair of TimePoint
    torpedoesReady: TimePoint

record Message:
    id: MessageId
    sender: ShipId | ROMULAN | SYSTEM
    recipients: Set<ShipId>
    remainingRecipients: Set<ShipId>
    body: Text
```

The recipients name the audience of a message. Message-delivery state is
specified separately from that original audience. Turning a radio off and
gagging a sender are distinct actions. The delivery rules determine which
messages can be received and when.

Faction knowledge records discovery of an installation's identity. It does not
store a frozen copy of its coordinates, owner, builds or strength. Report rules
specify which current properties of a known remote installation are disclosed.
Counting an object in a whole-game summary need not reveal its location or add
it to knowledge. A detailed installation report can perform that discovery update.

Score reports also use cumulative commission counts for Federation, Empire and
the Romulan, and their accumulated turn counts. These historical counters are
distinct from the number of players currently commissioned. The lifecycle rules
define their initial values and increments; POINTS only observes them.

These declarations introduce the vocabulary for rewritten commands. They are
not yet a complete world, combat or session model.

**Source basis:** [ship and device meanings](../../legacy/utexas/PARAM.FOR#L44),
[new ship state](../../legacy/utexas/SETUP.FOR#L367),
[distance](../../legacy/utexas/WARMAC.MAC#L3720),
[radio controls](../../legacy/utexas/DECWAR.FOR#L3129).
