# Abstract game model

This chapter defines the abstract values used in the command semantics. The
world and session model is still being extended.

## Notation

A record names facts about the game. An enum names mutually exclusive values.
`Set<T>` is an unordered collection with no duplicates; `Sequence<T>` is ordered.
`Optional<T>` is either a value of T or `none`. These are specification concepts,
not required programming-language types or storage structures.

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
type ShipId, CaptainId, BaseId, PlanetId, TractorBeamId
type Text = sequence of characters
type Boolean = true | false

enum Team       = FEDERATION | EMPIRE
enum ShieldMode = UP | DOWN
enum Condition  = GREEN | YELLOW | RED
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

The initial world has twenty planets and ten bases for each faction. The
spatial-placement and full initialization rules remain to be converted.

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
    position: Position
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

A commissioned ship begins with 5000 energy units, ten torpedoes, no hull or
device damage, five life-support turns, shields up at 100%, and green condition.
Reservations, destruction and release require distinct lifecycle rules; neither
zero energy nor an absent captain alone defines every lifecycle state.

`commissioned` means that a captain currently holds an active commission aboard
the ship. It does not imply positive energy or nonfatal damage: terminating a
commission is a distinct event in the session rules.

The shield-raising rule reads shield-device damage and changes shield mode
and engine energy.

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
    ship: ShipId
    radio: RadioSettings
    phaserReady: pair of TimePoint
    torpedoesReady: TimePoint

record Message:
    sender: ShipId | ROMULAN
    recipients: Set<ShipId>
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
