# Abstract state and values

Status: state domains and basic numeric/coordinate rules reviewed; full arithmetic
and every state transition remain under review. The names below are specification
concepts, not requirements for classes, arrays or memory layouts.

## STATE-1 — World and identities

A world contains a 75 by 75 galaxy. Locations are ordered pairs `(V,H)` with both
coordinates from 1 through 75. Increasing V is upward in a scan; increasing H is
rightward. Each cell has an object kind and, when applicable, an identity.
Object kinds are empty space, Federation ship, Empire ship, Federation base,
Empire base, Romulan, neutral planet, Federation planet, Empire planet, star and
black hole. Cells and object records are related state; a command must preserve
its specified update order, not assume they are always changed atomically.

The player roster is ordered and fixed:

| Slot | Federation | Slot | Empire |
| --- | --- | --- | --- |
| 1 | Excalibur | 10 | Buzzard |
| 2 | Farragut | 11 | Cobra |
| 3 | Intrepid | 12 | Demon |
| 4 | Lexington | 13 | Goblin |
| 5 | Nimitz | 14 | Hawk |
| 6 | Savannah | 15 | Jackal |
| 7 | Trenton | 16 | Manta |
| 8 | Vulcan | 17 | Panther |
| 9 | Yorktown | 18 | Wolf |

Roster order affects first-match name resolution and iteration. A captain's name
is not a ship identifier. Each side has ten base slots; initially the world has
20 planets and ten bases per side. The Romulan is a separate optional entity,
not a nineteenth player slot.

**Evidence:** [PARAM](../../legacy/utexas/PARAM.FOR#L5),
[roster DATA](../../legacy/utexas/DECWAR.FOR#L489),
[SETUP population](../../legacy/utexas/SETUP.FOR#L216),
[HISEG](../../legacy/utexas/HISEG.FOR#L1).

## STATE-2 — Ship and team state

A ship has position, occupancy/lifecycle state, condition (green/yellow/red),
torpedo inventory, shield mode, shield strength, engine energy, hull damage,
life-support reserve, device damage, docked status and a tractor association.
Device order is shields, warp engines, impulse engines, life support, torpedo
tubes, phasers, computer, radio and tractor beam. There are nine device-damage values.

Ship occupancy is distinct from positive energy and subfatal hull damage. A
reserved ship can have fatal damage before its session performs cleanup. Free
slots, reserved slots and fatal-but-not-released slots MUST NOT be collapsed
into a single boolean derived from hit points.

Teams retain current membership, number of ships commissioned during the world,
base count, captured-planet count, accumulated turns and score categories.
Scoring categories are enemy damage, enemy kills, base damage, planet capture,
base construction, Romulan damage/kills, star destruction and planet destruction.
The last two can contribute penalties. Per-command uncommitted score changes
are distinct from accumulated ship and team totals.

**Evidence:** [PARAM indices](../../legacy/utexas/PARAM.FOR#L44),
[HISEG](../../legacy/utexas/HISEG.FOR#L14),
[LOWSEG](../../legacy/utexas/LOWSEG.FOR#L1),
[FREE](../../legacy/utexas/DECWAR.FOR#L1082),
[turn accounting](../../legacy/utexas/DECWAR.FOR#L239).

## STATE-3 — Session and information state

Each session has its own acquired command line and remainder, preferences, selected
ship/team, privilege, random state, phaser-bank deadlines, torpedo deadline,
command pause, gag selections, interrupt/disconnect state and output cursor state.
World state includes radio-off membership, messages, hit notifications, counts
and last-observed information about bases/planets. Information acquisition is a
state change even when no combat or movement occurs.

One session's lexical remainder, random seed or preferences MUST NOT silently
become another's. Conversely, ship/world mutations and shared queue effects MUST
be visible at their specified ordering points.

**Evidence:** [LOWSEG](../../legacy/utexas/LOWSEG.FOR#L1),
[HISEG](../../legacy/utexas/HISEG.FOR#L1),
[private seed](../../legacy/utexas/WARMAC.MAC#L617).

## STATE-4 — Units and arithmetic

Formulas in this draft use integer quanta unless explicitly marked REAL. Engine
energy uses ten quanta per displayed unit. Hull/device damage and shield-strength
figures use their source scales; do not treat a percentage as a floating-point
fraction merely because it is printed with a decimal. A newly commissioned ship
has energy 50000 quanta, shield strength 1000, ten torpedoes, five life-support
turns, no hull/device damage, raised shields and green condition.

Integer division in the reviewed ordinary domain truncates toward zero at the
specified operation, rather than rounding the final expression. For example,
shield transfer adds `truncate(transfer / 25)` to shield strength while deducting
the whole transfer from engine energy. Negative transfer is permitted subject to
the command's caps. Reordering the division changes resource behavior.

A complete specification must define finite-width overflow and REAL evaluation
without requiring a physical machine word. These remain U-NUMERIC; arbitrary
precision intermediates or IEEE-754 arithmetic are not blanket substitutes.
Until resolved, numerical clauses are limited to their stated, nonoverflowing
integer domain or explicitly documented REAL behavior.

**Evidence:** [new ship](../../legacy/utexas/SETUP.FOR#L367),
[SHIELD](../../legacy/utexas/DECWAR.FOR#L3739),
[platform analysis](../platform-manuals.md).

## STATE-5 — Distance

For legal locations, distance is `max(abs(V1−V2), abs(H1−H2))`. Being within
range N means both absolute coordinate differences are at most N. Adjacency
therefore includes diagonals; the predicate alone also includes the same cell.
A command may reject its own cell separately. Do not use Euclidean distance for
these range checks.

**Evidence:** [LDIS/INGAL/PDIST](../../legacy/utexas/WARMAC.MAC#L3720).
