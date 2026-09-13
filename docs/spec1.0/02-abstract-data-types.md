# 2. Abstract data types

This section defines the abstract data types (ADTs) that constitute a DECWAR
game. Each ADT consists of a data structure and the operations defined on it.
Later sections use these ADTs to specify commands and autonomous processes.

`Galaxy` is the complete game state. It records the objects in the galaxy and
non-spatial facts such as commissions, resources, damage, scores,
communication, and relationships between ships.

## Game model geometry

The spatial model is a 75 by 75 grid of sectors. Increasing the vertical
coordinate moves upward; increasing the horizontal coordinate moves rightward.

```typescript
type Coordinate = number;

const GALAXY_SIZE = 75;

interface Position {
  vertical: Coordinate;
  horizontal: Coordinate;
}
```

A `Position` identifies one sector. Both coordinates are integers in the closed
interval 1 through 75.

The distance between sectors is the Chebyshev distance:

$$
d(a,b) = \max\left(
  |a.\mathrm{vertical} - b.\mathrm{vertical}|,
  |a.\mathrm{horizontal} - b.\mathrm{horizontal}|
\right)
$$

Equivalently:

```typescript
function sectorDistance(a: Position, b: Position): number {
  return Math.max(
    Math.abs(a.vertical - b.vertical),
    Math.abs(a.horizontal - b.horizontal),
  );
}
```

Horizontal, vertical, and diagonal neighbors are all one sector apart.

## Galaxy contents

Sectors may be occupied by player ships, bases, planets, stars, black holes, or
one Romulan ship. The galaxy also contains faction scores, communication, and
tractor links between ships. The following ADTs define these parts of the game.

### Factions and fleet

DECWAR has two factions, the Federation and the Empire. Each faction has a fixed
fleet of nine named ships:

```typescript
type Team = "FEDERATION" | "EMPIRE";

const FEDERATION_SHIPS = [
  "EXCALIBUR",
  "FARRAGUT",
  "INTREPID",
  "LEXINGTON",
  "NIMITZ",
  "SAVANNAH",
  "TRENTON",
  "VULCAN",
  "YORKTOWN",
] as const;

const EMPIRE_SHIPS = [
  "BUZZARD",
  "COBRA",
  "DEMON",
  "GOBLIN",
  "HAWK",
  "JACKAL",
  "MANTA",
  "PANTHER",
  "WOLF",
] as const;

type FederationShipName = (typeof FEDERATION_SHIPS)[number];
type EmpireShipName = (typeof EMPIRE_SHIPS)[number];
type ShipName = FederationShipName | EmpireShipName;

function teamOf(name: ShipName): Team {
  return FEDERATION_SHIPS.some((ship) => ship === name)
    ? "FEDERATION"
    : "EMPIRE";
}
```

The arrays give the order in which ships are presented for selection and
enumeration. Every ship in `FEDERATION_SHIPS` belongs to the Federation; every
ship in `EMPIRE_SHIPS` belongs to the Empire. Each name identifies one vessel
throughout the game. The name continues to refer to that vessel as it is
commissioned, destroyed, released, and later recommissioned.

`teamOf(name)` returns the faction determined by the roster. A `Ship` does not
store a separate faction value.

### Scores

Scores are numeric values grouped by the event that earned or lost them.

```typescript
type Points = number;

type ScoreCategory =
  | "ENEMY_DAMAGE"
  | "ENEMY_KILLS"
  | "BASE_DAMAGE"
  | "PLANET_CAPTURE"
  | "BASE_CONSTRUCTION"
  | "ROMULAN"
  | "STAR_DESTRUCTION"
  | "PLANET_DESTRUCTION";

type Score = Record<ScoreCategory, Points>;
```

A `Score` contains one `Points` value for every `ScoreCategory`. Its total is
the sum of those eight values. Points may be negative. Score changes may be
pending until turn completion, so a `Ship` holds both committed and pending
scores.

`Points` uses the units displayed by POINTS. Event categories hold points,
not event counts: one planet capture adds 100 points to PLANET_CAPTURE,
not one. Construction awards depend on the completed stage, as defined by
BUILD. Categories are summed without further weighting.

> **Reviewer note — pending score:** The reconstructed game accumulates score
> changes temporarily and commits them when the turn completes. No gameplay or
> output rule has yet been found that observes the temporary value. If none
> does, the `pendingScore` property of `Ship` is an implementation artifact and
> should be removed; command and world-process algorithms can instead use a
> local score delta.

### Ships

The game accounts for every named vessel while it is available for selection,
under a captain's command, or awaiting release after destruction. Each vessel
is represented by one `Ship`.

#### Ship quantities

Ship resources and damage use named numeric types so their meanings remain
distinct in later rules:

```typescript
type Energy = number;
type Damage = number;
type Percentage = number;
type Stardate = number;
```

`Energy` is measured in the energy units shown to a captain. `Damage` is a
nonnegative measure of accumulated impairment.
`Percentage` ranges from 0 through 100, where 100 is full strength. `Stardate`
is a nonnegative integer count of the turns completed during the current
commission.

Arithmetic preserves fractional results. A result becomes an integer only when
a rule says whether to truncate the fractional part or apply a stated rounding
method.

> **Reviewer note — numeric policy:** This paragraph currently implies that a
> calculation such as `10 / 3` remains fractional in game state and that
> formatting a value for output does not alter the stored value. Determine
> whether DECWAR needs this as a global rule. Integer behavior may instead need
> to be specified separately by each operation, particularly where truncation
> affects gameplay.

#### Commission lifecycle

A vessel is available for selection, commissioned to a captain, or destroyed
but not yet released:

```typescript
type Captain = string;

type ShipLifecycle =
  | { phase: "AVAILABLE" }
  | { phase: "COMMISSIONED"; captain: Captain }
  | { phase: "DESTROYED"; captain: Captain };
```

A `Captain` is the name of a participant. An `AVAILABLE` lifecycle has no
captain. A `COMMISSIONED` lifecycle names the captain commanding the vessel. A
`DESTROYED` lifecycle retains that captain until the vessel is released and
becomes available again.

#### Condition and shields

Alert condition summarizes the vessel's current operational situation. Shields
have both an operating mode and a retained strength:

```typescript
type AlertCondition = "GREEN" | "YELLOW" | "RED";
type ShieldMode = "UP" | "DOWN";

interface Shields {
  mode: ShieldMode;
  strength: Percentage;
}
```

`AlertCondition` distinguishes green, yellow, and red alert. The rules that
change the alert condition are defined with the corresponding game operations.
The `mode` property of `Shields` states whether the shields are raised. Lowering
shields does not discard their `strength`, which remains between 0 and 100.

#### Devices and damage

Nine shipboard devices may be damaged independently:

```typescript
type Device =
  | "SHIELDS"
  | "WARP_ENGINES"
  | "IMPULSE_ENGINES"
  | "LIFE_SUPPORT"
  | "TORPEDO_TUBES"
  | "PHASERS"
  | "COMPUTER"
  | "RADIO"
  | "TRACTOR_BEAM";

type DeviceDamage = Record<Device, Damage>;
```

A `DeviceDamage` contains one damage value for each `Device`. A value of zero
means that the device is undamaged; a positive value is accumulated damage.
The rules for each device state when and how that damage affects its operation.

#### Radio state

A ship's radio state records whether reception is enabled and which individual
ships are gagged:

```typescript
interface RadioState {
  enabled: boolean;
  gaggedShips: Set<ShipName>;
}
```

`RadioState.gaggedShips` is a set because a sender is either gagged or not;
duplicates and order have no meaning.

#### Ship structure

The `Ship` interface combines identity, lifecycle, location, resources,
equipment, relationships, and scoring:

```typescript
interface Ship {
  name: ShipName;
  lifecycle: ShipLifecycle;
  position: Position | null;
  energy: Energy;
  hullDamage: Damage;
  deviceDamage: DeviceDamage;
  shields: Shields;
  torpedoes: number;
  lifeSupportReserve: number;
  condition: AlertCondition;
  docked: boolean;
  tractorLink: ShipName | null;
  radio: RadioState;
  stardate: Stardate;
  score: Score;
  pendingScore: Score;
}
```

The properties have the following meanings:

| Property | Meaning |
| --- | --- |
| `name` | Stable identity from the fixed roster. |
| `lifecycle` | Availability, active commission, or destroyed commission awaiting release. |
| `position` | Current or last sector; `null` before placement and after release. |
| `energy` | Energy available to movement, weapons, shields, and transfers. |
| `hullDamage` | Accumulated damage to the vessel itself. |
| `deviceDamage` | One independent damage value for each of the nine devices. |
| `shields` | Whether shields are raised and their retained strength. |
| `torpedoes` | Remaining torpedo count. |
| `lifeSupportReserve` | Signed integer reserve used when life support is critically damaged. |
| `condition` | The ship's green, yellow, or red alert condition. |
| `docked` | Whether the ship currently receives docked status. |
| `tractorLink` | The other ship joined to this ship by a tractor beam, or `null`. |
| `radio` | Whether reception is enabled and which ship senders are gagged. |
| `stardate` | Number of turns completed by this commission. |
| `score` | Committed score by category. |
| `pendingScore` | Score changes committed at the next applicable turn completion. |

A `Ship` whose `lifecycle.phase` is `AVAILABLE` has no `position`. A `Ship`
whose `lifecycle.phase` is `COMMISSIONED` has a `position`. A `Ship` whose
`lifecycle.phase` is `DESTROYED` may retain its final `position`, but does not
occupy that sector.

The `torpedoes` property of a `Ship` is a nonnegative count.

A `Captain` is associated with at most one `Ship`, including while that ship is
destroyed and awaiting release.

A new commission begins with 5000 energy units, ten torpedoes, no hull or device
damage, shields up at 100%, life-support reserve 5, green condition, no docked
status, no tractor link, stardate zero, and zero values in the `score` and
`pendingScore` properties of the `Ship`.

### Planets and bases

Planets are neutral or controlled by one faction. The `CAPTURE` command changes
which faction controls a planet. The `BUILD` command strengthens a controlled
planet and can eventually convert it into a starbase. Later chapters define the
conditions, costs, and other effects of both commands.

```typescript
interface Planet {
  position: Position;
  allegiance: Team | "NEUTRAL";
  construction: number;
  knownTo: Set<Team>;
}
```

`Galaxy.planets` contains the planets currently in the galaxy. The order of
`Galaxy.planets` is the order used when the game enumerates them. A `Planet`
retains its `position` until it is removed from the galaxy. For a `Planet`,
`allegiance == "NEUTRAL"` means that neither faction owns it.

The `construction` property of a `Planet` is an integer from 0 through 4;
completing the fifth stage removes the planet and creates a base.

A base belongs to one faction, occupies one sector, and has a defensive
strength.

```typescript
interface Base {
  team: Team;
  position: Position;
  strength: Percentage;
  knownTo: Set<Team>;
}
```

`Galaxy.bases` contains the active bases. A faction may have at most ten.
When the fifth successful `BUILD` converts a planet, the planet and its
construction count cease to exist. A base belonging to the same faction is
created at the planet's position with 100% defensive strength. Successful
construction also awards base-construction points; the command-semantics
chapter defines the amounts.

> **Reviewer note — base order:** `Galaxy.bases` is an array, but the abstract
> model does not yet define whether its order is meaningful. Determine whether
> the order in which base reports are emitted is recognizable game behavior or
> an artifact of numbered storage slots. See character question C-004.

The `strength` property of a `Base` is its remaining defensive strength.
Attacks reduce it, and autonomous rebuilding may restore it, up to 100%. A base
reduced to zero is destroyed and removed from the galaxy. The combat and
autonomous-process chapters define those transitions.

The `knownTo` property of each `Planet` and `Base` contains the factions that
have discovered that object. Knowledge is distinct from allegiance and current
scan visibility. A scan can add the scanning ship's faction; report commands
use knowledge to distinguish previously discovered objects. Conversion of a
planet into a base preserves this set. Destroying the object removes its set
with it; knowledge is not a permanent mark on that sector.

> **Reviewer note — discovery lifecycle:** Initial knowledge and discoveries
> caused by operations other than scans still need their own rules. Do not
> assume ownership automatically establishes the full discovery history.

### Stars and black holes

Stars and black holes are represented by their positions; neither has
additional object state. Black holes are optional for an entire game:

```typescript
type StarPositions = Position[];

type BlackHoleState =
  | { enabled: false }
  | { enabled: true; positions: Position[] };
```

Each element of `Galaxy.stars` is the position of one star currently present.
The order of `Galaxy.stars` has no meaning.

When `BlackHoleState.enabled` is `false`, the model contains no black-hole
positions. When it is `true`, `BlackHoleState.positions` contains the black
holes currently present; an empty array means that black holes were enabled but
none remain. The order of `BlackHoleState.positions` has no meaning. Rules
governing stars and black holes belong to the world-mechanics chapter.

### The Romulan

Romulan activity is optional for an entire game. When enabled, the Romulan may
be absent between appearances or present as an autonomous vessel with its own
position and energy.

```typescript
interface Romulan {
  position: Position;
  energy: Energy;
}

type RomulanState =
  | { enabled: false }
  | { enabled: true; vessel: Romulan | null; statistics: RomulanStatistics;
      elapsedTriggers: number };
```

When `RomulanState.enabled` is `false`, Romulan activity is disabled. When it is
`true`, `RomulanState.vessel` is the current Romulan or `null` while none is
present. A Romulan is not a captain, a roster ship, or a member of either
faction.

`RomulanState.elapsedTriggers` is a nonnegative integer counting activity
triggers since the most recent reset. It begins at zero. Section 8 defines
its increments and resets; it is not elapsed wall-clock time or the cumulative
activity count used by POINTS.

Romulan statistics persist across vessel destruction and reappearance. They
are not properties of an individual Romulan vessel:

```typescript
interface RomulanStatistics {
  score: Score;
  appearances: number;
  activityCount: number;
}
```

`appearances` counts vessels introduced into the galaxy. `activityCount` counts
eligible autonomous activity cycles, including a cycle with no vessel present
that does not produce an appearance. Both are nonnegative integers. `score`
accumulates Romulan awards and penalties across appearances. POINTS uses these
statistics; the scheduling and score-changing operations define their updates.

### Communication

Communication consists of text messages addressed to one or more ships. A
message may come from a ship, the Romulan, or the game itself. Each
`RadioMessage` records a sender, the original recipients, the recipients still
awaiting delivery, and the text. Because delivery may occur after the event that
creates a message, `Galaxy.communication` retains the message until every
remaining recipient has received or discarded it.

```typescript
type MessageSender = ShipName | "ROMULAN" | "SYSTEM";

interface RadioMessage {
  sender: MessageSender;
  recipients: Set<ShipName>;
  pendingRecipients: Set<ShipName>;
  text: string;
}

interface CommunicationState {
  messages: RadioMessage[];
}
```

For a `RadioMessage`, `recipients` is the original audience and
`pendingRecipients` is the subset still awaiting delivery. This is not
necessarily a proper subset: it may initially equal `recipients` and may become
empty. These properties are sets because recipient order has no meaning. The
order of `CommunicationState.messages` is delivery order. Radio damage, radio
enablement, and gagging affect acceptance or delivery as specified by the
communication rules; they do not change the message text.

### Notifications

Tractor changes and energy transfers produce notices that can be delivered
after the operation. They are not subspace-radio messages: they have structured
event facts, no player-authored text, and their own delivery rules. A tractor
notice records both participating ships and whether the link was activated or
released. An energy notice records the sender, recipient, and energy delivered,
not the sender's expenditure including transfer loss. Base distress and
destruction notices retain the base's faction and position. Torpedo outcomes
retain the firing ship, burst ordinal, outcome, and reported sector. A Romulan
appearance notice retains its appearance position, independently of subsequent
movement or destruction.

Hit reports retain the source and target as they are to be reported, not as
references to the live objects. The following snapshot distinguishes ship
shields, base strength, planet construction, and Romulan energy rather than
placing their different quantities in an untyped strength field. A destroyed
object can still be described by a snapshot.

```typescript
type CombatObjectSnapshot =
  | { kind: "SHIP"; name: ShipName; position: Position; shields: Shields }
  | { kind: "BASE"; team: Team; position: Position; strength: Percentage }
  | { kind: "PLANET"; allegiance: Team | "NEUTRAL"; position: Position;
      construction: number }
  | { kind: "ROMULAN"; position: Position; energy: Energy }
  | { kind: "STAR"; position: Position };
```

The hit facts record the report's action, damage and consequences. The target
position is its reported position after displacement, when displacement occurs.
It is not necessarily the center used to select recipients; Section 10.5
distinguishes torpedo impacts from nova displacement for that purpose.
`reportedDamage` is the damage shown by the hit rule, not a later subtraction
of live hull values. `critical.damage` is the recorded critical-device damage
increment from this hit, not the device's accumulated damage or damage inferred
from the device when the report is delivered.

```typescript
interface CombatHitFacts {
  action: "PHASER" | "TORPEDO" | "DEFLECTED" | "NOVA";
  source: CombatObjectSnapshot;
  target: CombatObjectSnapshot;
  reportedDamage: Damage;
  displaced: boolean;
  death: "NONE" | "HIT" | "BLACK_HOLE";
  critical: { device: Device; damage: Damage } | null;
  baseEmergency: boolean;
}
```

`death` distinguishes survival, destruction by the hit, and destruction by
displacement into a black hole. `critical` is null when there is no device
detail; only a ship target can have such detail. `baseEmergency` applies only
to a base target. It records emergency-shield processing, not whether the base
still needs repair. Section 10.7 defines which facts each recipient sees;
recording critical detail does not expose it to bystanders.

The notification union combines these reports with the simpler notices above.
STAR_EVENT reports a star's explosion or survival without a hit target; a
nova's separate damage reports use HIT with action NOVA.

```typescript
type NotificationFacts =
  | { kind: "TRACTOR"; ships: [ShipName, ShipName]; active: boolean }
  | { kind: "ENERGY_TRANSFER"; sender: ShipName; recipient: ShipName;
      delivered: Energy }
  | { kind: "BASE_NOTICE"; team: Team; position: Position; destroyed: boolean }
  | { kind: "TORPEDO_OUTCOME"; shooter: ShipName; torpedo: number;
      outcome: "MISS" | "BLACK_HOLE" | "NEUTRALIZED"; position: Position }
  | { kind: "ROMULAN_APPEARANCE"; position: Position }
  | { kind: "HIT"; hit: CombatHitFacts }
  | { kind: "STAR_EVENT"; position: Position; outcome: "NOVA" | "UNAFFECTED" };

interface PendingNotification {
  facts: NotificationFacts;
  recipients: Set<ShipName>;
  pendingRecipients: Set<ShipName>;
}
```

The facts and original recipients are retained when the operation occurs.
Subsequent link or energy changes do not rewrite the notice. For a tractor
notice the two ship names are distinct and the recipient set contains both;
their order in the pair assigns no lead or towed role. For an energy-transfer
notice, the recipient set contains only the receiving ship. `delivered` is
nonnegative; zero is valid for a successful capacity-limited transfer.

For TORPEDO_OUTCOME, `torpedo` is a positive integer identifying the shot's
one-based position in its burst. `position` is the last accepted sector for a
miss and the obstructing sector for absorption or neutralization. The only
recipient is the firing ship. A base notice's `destroyed` distinguishes
destruction from distress; it does not refer to a still-existing Base object.
Recipient selection for base and Romulan notices is defined by their producing
operations, rather than inferred from these facts at delivery.

`pendingRecipients` is a subset of `recipients`, initially equal to it.
Delivery or discard removes that ship from the pending set; no later ship is
added. Once the set is empty, the notice is removed. Distinct operations remain
distinct notices even when all their recorded facts are equal. Rendering uses
each recipient's preferences at delivery, as specified in Section 9.5.

> Reviewer note — notification contracts: These declarations account for the
> event categories, not every producer's complete transition. Exact hit snapshot
> timing, numeric precision, and exceptional nova facts retain the producer
> rules and open questions in Chapters 6–8.
> C-023 governs pending-notice ordering and loss; an array does not choose a
> delivery policy or impose a capacity limit.

### Faction state

Each faction retains shared scores and cumulative participation statistics
across individual commissions. These are represented by `TeamState`:

```typescript
interface TeamState {
  score: Score;
  admissions: number;
  completedTurns: number;
}
```

The `score` property of a `TeamState` is distinct from the `score` and
`pendingScore` properties of every `Ship`. Each scoring rule identifies the
properties it changes.

`admissions` counts entries into the faction's ship-selection process, including
accepted re-entry to a previously held vessel. It is not a count of vessels
currently present or necessarily of successful commissions. `completedTurns`
counts player turn completions for the faction. Both are nonnegative integers
and remain accumulated when a player departs. POINTS presents `admissions`
under its historical “Number of ships” label.

> Reviewer note — admission accounting: Admission can be counted before ship
> selection finishes. The entry and cancellation rules must define that boundary
> explicitly; do not replace this counter with successful commissions or the
> current roster population without reviewing the observable score averages.

## Galaxy

The `Galaxy` structure gathers the complete state of one game:

```typescript
interface Galaxy {
  ships: Ship[];
  bases: Base[];
  planets: Planet[];
  stars: StarPositions;
  blackHoles: BlackHoleState;
  romulan: RomulanState;
  communication: CommunicationState;
  notifications: PendingNotification[];
  teams: Record<Team, TeamState>;
  worldActivityProgress: number;
  warOutcome: WarOutcome | null;
}

type WarOutcome = "FEDERATION" | "EMPIRE" | "MUTUAL_DESTRUCTION";
```

`Galaxy.worldActivityProgress` is a nonnegative integer counting completed
player turns since the most recent completion-triggered world-activity cycle.
It is shared by all players, not a separate count for each ship or faction.
Section 9.1 defines when a completed turn triggers a cycle and resets this count.

`Galaxy.warOutcome` is `null` while the war is undecided. The first normal
game-end check that returns a terminal result stores that result here. Every
later end check returns the stored result without recomputing it, and no later
destruction, autonomous activity, or player command can replace it. Once this
property is non-null, no new ordinary command is accepted. A command already
accepted continues through its defined transition; at its completion, the
issuing player receives the latched outcome's final reports and is released
according to Section 9.3.

`Galaxy.notifications` retains pending structured notifications.
Its entries describe separate occurrences, not current tractor links or a
history of every transfer. Notices disappear after all recipients have received
or discarded them.

`Galaxy` stores its contents in the properties above rather than in a separate
sector board. Sector occupancy is derived from their positions:

- A `Ship` occupies its `position` only while `COMMISSIONED`.
- Every `Base` in `Galaxy.bases` occupies its `position`.
- Every `Planet` in `Galaxy.planets` occupies its `position`.
- Every position in `Galaxy.stars` is occupied by a star.
- When `Galaxy.blackHoles` is enabled, every position in
  `Galaxy.blackHoles.positions` is occupied by a black hole.
- When `Galaxy.romulan` is enabled and its `vessel` is not `null`, that
  `Romulan` occupies its `position`.

## Player preferences

A player's preferences control input interpretation and presentation; they do
not belong to the ship or change the galaxy. Numeric input defaults to absolute
or relative coordinates. Output may show either convention or both. Message
length, scan length, and command-prompt style are independent choices.

```typescript
interface PlayerPreferences {
  coordinateInput: "ABSOLUTE" | "RELATIVE";
  coordinateOutput: "ABSOLUTE" | "RELATIVE" | "BOTH";
  outputLength: "SHORT" | "MEDIUM" | "LONG";
  scanLength: "SHORT" | "LONG";
  promptStyle: "NORMAL" | "INFORMATIVE";
}
```

Each player has one `PlayerPreferences` value. `SET` changes a preference;
`TYPE OUTPUT` reports it. Individual output rules state when they override a
preference, rather than assuming all output uses every preference.

> **Reviewer note — player interaction:** The relationship between a player,
> their display name, commissioning, and reentry still needs its own definition.
> Initial preferences and persistence across reentry also require review.
> These declarations do not add terminal types or historical account identifiers
> to the game model. Prompt rendering and scan layout belong to their output rules.

## Galaxy invariants

The declarations do not express every numeric domain or every relationship
between properties. Every valid `Galaxy` also satisfies the following
constraints.

> **Reviewer note — completeness of invariants:** This is the set identified
> during the initial ADT pass, not yet a claim of completeness. Audit every ADT
> and state transition as the command and world-mechanics chapters are written,
> and add any further constraints required for a valid `Galaxy`.

### Fleet

- The `ships` property of every `Galaxy` contains the eighteen `Ship` objects in
  fixed roster order: the nine Federation ships followed by the nine Empire
  ships.
- No `Captain` appears in the `lifecycle` property of more than one `Ship`.

### Galaxy contents

- No two occupants derived in the preceding section share a sector.
- The `strength` property of every `Base` in `Galaxy.bases` is greater than 0
  while the base remains in the galaxy.
- For each faction, at most ten members of `Galaxy.bases` have that faction as
  their `team` property.
- The `construction` property of every `Planet` in `Galaxy.planets` is an
  integer from 0 through 4.
- When `Galaxy.romulan` has a non-null `vessel`, the `energy` property of that
  `Romulan` is greater than zero.

### Relationships and communication

- When the `tractorLink` property of a `Ship` names another ship, both ships are
  distinct and commissioned, `teamOf` returns the same faction for their names,
  and the other ship's `tractorLink` names the first ship.
- The `recipients` property of every `RadioMessage` is nonempty.
- For every `RadioMessage`, `pendingRecipients` is a subset of `recipients`.
  The sets may be equal, and `pendingRecipients` may be empty.

### Pending notifications

- Each retained member of `Galaxy.notifications` has a nonempty `recipients`
  set and a nonempty `pendingRecipients` set. The latter is a subset of the
  former. Removal of the last pending recipient removes the notification.
- Every pending recipient is commissioned or destroyed but unreleased.
  An original recipient need not remain commissioned: release removes its
  pending copy, not its name from the notification's original audience.
- A TRACTOR notification names two distinct ships of the same faction and
  addresses exactly those two ships. It need not match their current links:
  an activation notice can remain pending after the link is released.
- An ENERGY_TRANSFER notification has distinct sender and recipient names
  from the same faction, a nonnegative delivered amount, and exactly its
  receiving ship in `recipients`. Neither ship's current energy need equal
  its energy immediately after the transfer.
- A TORPEDO_OUTCOME notification has a positive integer `torpedo` ordinal
  and exactly its `shooter` in `recipients`.
- A HIT notification's target is not a STAR snapshot. Star survival and
  explosion reports use STAR_EVENT; damage caused by an exploding star uses
  HIT with action NOVA and a STAR source.
- Non-null critical-device detail requires a SHIP target. A true base-emergency
  indication requires a BASE target. Neither field by itself determines
  survival; the hit's `death` property records that separately.

Snapshots are historical report facts, not additional occupants of the galaxy.
A base-destruction notice remains valid after that base is removed, and a hit
snapshot need not equal any current Ship, Base, Planet, or Romulan. Live-object
invariants such as positive active-base strength must not be used to discard
a destruction report. C-023's unresolved order and loss policy does not permit
altering the facts or adding new recipients to an already created notification.
