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
  | { enabled: true; vessel: Romulan | null };
```

When `RomulanState.enabled` is `false`, Romulan activity is disabled. When it is
`true`, `RomulanState.vessel` is the current Romulan or `null` while none is
present. A Romulan is not a captain, a roster ship, or a member of either
faction.

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

### Faction state

Each faction has a score shared by all ships belonging to that faction. This
score is represented by `TeamState`:

```typescript
interface TeamState {
  score: Score;
}
```

The `score` property of a `TeamState` is distinct from the `score` and
`pendingScore` properties of every `Ship`. Each scoring rule identifies the
properties it changes.

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
  teams: Record<Team, TeamState>;
}
```

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
