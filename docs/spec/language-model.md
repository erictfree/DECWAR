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

query ship(game: GameState, id: ShipId): Ship
query base(game: GameState, id: BaseId): Base
query planet(game: GameState, id: PlanetId): Planet
query captain(game: GameState, id: CaptainId): Captain
query world(game: GameState): World
query tractorBeam(game: GameState, id: TractorBeamId): TractorBeam
query sector(game: GameState, position: Position): Optional<SectorObject>

operation Capture(actor: ShipId, target: Position): CaptureOutcome
```

Queries describe the current state without changing it. Operations describe
permitted changes and observations. Their names are specification vocabulary,
not additional commands or a required software interface. For example, the
CAPTURE grammar determines how player input invokes the `Capture` operation.
Within a game operation, `game` denotes the current GameState. A query or pure
function has no implicit permission to change it. The result type follows the
parameter list's colon. Vertical bars separate alternatives; braces name their
associated values. Thus
`Rejected { reason: CaptureRejection }` is an outcome carrying a reason, not
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

The type notation is inspired by TypeScript and algebraic data types. It is
specification notation, not executable TypeScript: it does not import JavaScript
numbers, object identity, inheritance or runtime behavior.

`type Name = { ... }` defines a record of named fields. `property: T` gives a
field's type. An enum lists mutually exclusive symbolic values. A union lists
alternatives separated by `|`; an alternative may carry named fields in braces.
The alternative's name is its tag. For example,
`Captured { planet: PlanetId }` carries a planet identity, while `Cancelled`
carries no value. These names are not text the player enters.

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

Here T excludes the Rejected alternative. This alias keeps each operation's
named successful outcomes, such as Raised or Captured. Cancellation and lifecycle
outcomes are stated separately when they are possible. A rejection says why the
operation stopped; it does not promise that no earlier effects occurred or that
they were rolled back. Optional expresses absence, not rejection.
The declared domain determines
whether counts, quantities or identities are valid. Type aliases such as Energy
and Damage retain their units even when their notation resembles a scalar.

For example, `devices: Map<Device, DeviceState>` associates every one of the
nine Device values with its own device state. Square brackets select a mapping
entry; a dot selects a named field. These are mathematical observations, not
requirements to use a JavaScript Map, array or mutable object. In query and
operation signatures, the colon after the parameter list gives the result type.
Named types can refer to other named types in the abstract model.

The query `ship(game, actor)` selects the ship identified by actor. A command
may bind that ship to s and then write `s.energy` or
`s.devices[WARP_ENGINES].damage`. A `ShipId` is an identity, not itself a Ship
record. Reading an optional value requires it to be present. Rules that act on
the position of an active, positioned ship use the contained Position value;
rules for admission and release handle absence explicitly.

Pseudocode describes the meaning of an operation:

```text
if (condition) {
    statement;
}
else {
    statement;
}
```

`=` assigns a value to its named destination. Assigning a local variable changes
only that local binding. Assigning a game-state property, such as s.energy,
updates that property. An operation's state-effects clause determines which
updates occur; a query does not update game state.

`==` states equality, including in preconditions and postconditions; `!=` states
inequality. A Unit result carries no additional value and does not by itself assert success.
The equals sign in a type declaration introduces its definition,
and in a default parameter supplies its default value. Neither changes game state.
`let name: T = value` introduces a local binding. A local's type may be omitted
when its value or the immediately preceding definition determines it. A
conditional expression `condition ? a : b` selects a when the condition is true
and b otherwise. Only the selected expression is evaluated.

`requires` states a precondition of an operation or a defined substep; `ensures`
states a condition at its completion. `invariant` states a property of every
valid observable state in its declared scope. These words express requirements,
not runtime checks or automatic error handling. A command's rejection clauses
still determine what happens when player input cannot satisfy a precondition.

A record value is written `Name { field: value, ... }`; a bare name denotes
a variant with no payload. Declared payload names identify the same fields when
an outcome is constructed, inspected or described in an example.

`value with { field: replacement }` produces a record value with those fields
replaced and every other field preserved. It does not update the original.
`for (item in values)` visits a list in its order; a set requires an explicit
order whenever order affects observations. Bounded loops state their bounds.
Short English predicates and effects within pseudocode refer to the rules in
the surrounding clause; they are not additional fields or callable services.

`emit` produces an observable game event or response; it is a separate effect,
and its terminal rendering is specified separately.
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

Entity identity and value equality are distinct: two ship observations identify
the same ship when their ShipId values match, even if its resources changed
between observations. Record values compare equal when corresponding fields
compare equal. Lists compare by length and corresponding elements; sets compare
by membership; maps compare by keys and their associated values. Different
variant tags are unequal. Quantities compare within their declared units;
an energy quantity is not interchangeable with damage merely because the
numerical values match.

## Quantities and identities

```text
type ShipId, CaptainId, BaseId, PlanetId, TractorBeamId, MessageId
type PublicationId
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

type Position = {
    vertical: Coordinate;
    horizontal: Coordinate;
};

type SectorVector = {
    vertical: real number of sectors;
    horizontal: real number of sectors;
};

type GridPoint = {
    vertical: real coordinate;
    horizontal: real coordinate;
};
```

The identities distinguish entities. Names and name-matching order are separate
language rules. Arithmetic uses mathematical quantities. Rounding is applied only where a
rule explicitly requires a discrete result or a formatted display. Historical
word limits, overflow and intermediate truncation do not apply. This does not
change the command grammar or permit new game mechanics.

For positions a and b:

```text
function distance(a: Position, b: Position): nonnegative integer {
    return max(
        abs(a.vertical - b.vertical),
        abs(a.horizontal - b.horizontal)
    );
}
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
type SectorObject = PlayerShip { id: ShipId } | Starbase { id: BaseId }
             | PlanetObject { id: PlanetId } | RomulanObject
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
type Rectangle = {
    minVertical, maxVertical: Coordinate
    minHorizontal, maxHorizontal: Coordinate
};

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

## Ships

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
damage, five life-support turns, shields up at 100%, and green condition.
`commissioned` is the ship's active-participation flag used by the stated
presence and targeting checks. A recognized combat destruction sets it false,
but leaves the captain association until ReleaseCommission. That association
identifies the captain who can still receive the final hit and exit reports.
Other resource changes can leave commissioned true at zero energy or fatal
hull damage until a rule explicitly deactivates or releases the ship. Neither
a fatal numerical threshold alone nor commissioned false means release has
already completed or that another captain may take the ship.

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
type TractorBeam = {
    id: TractorBeamId;
    endpoints: Set<ShipId> containing exactly two distinct identities;
};

enum ScoreCategory = ENEMY_DAMAGE | ENEMY_KILLS | BASE_DAMAGE
                  | PLANET_CAPTURE | BASE_CONSTRUCTION
                  | ROMULAN | STAR_DESTRUCTION | PLANET_DESTRUCTION

type Score = Map<ScoreCategory, Points>

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

## Coordination and overlapping operations

A command can contain a **coordinated phase**: an interval in which another
session cannot enter a coordinated phase in the same domain. This constrains
permitted execution order; it does not require a particular threading model,
mutex, database or storage layout. The Austin core distinguishes two domains:

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
