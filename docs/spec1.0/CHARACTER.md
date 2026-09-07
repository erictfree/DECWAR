# Character decisions

This ledger holds questions where an elegant abstract game could differ from
recognizable DECWAR. An unresolved entry is not yet a normative rule.

## Accepted foundations

### Fixed named fleet

DECWAR's eighteen named Federation and Empire ships are part of the game, not a
capacity constant. A pure model should identify ships by those names and retain
their factional roster order. A generic configurable fleet may be an extension,
but it is not the definition of DECWAR.

### Starbases are not numbered identities

The Austin source stores each faction's bases in ten numbered slots, but the
number is not shown to captains: output names a base by faction and commands
locate it by sector. The slot is therefore implementation bookkeeping, not part
of the abstract game. A faction may still have at most ten active bases.

### Destruction and release are distinct

A destroyed captain may still receive final information before the ship becomes
available again. The pure lifecycle therefore needs a destroyed-but-not-yet-
released phase even if an implementation could clean the session up instantly.

### Tractor beams are relationships

A tractor beam has no identity or state independent of its two ships. The
abstract model represents an active beam through reciprocal `tractorLink`
properties on its two ships, not as a collection of beam entities. Lead and
towed are roles in a movement: the ship that moves leads, and its linked ship is
towed. The relationship itself does not give either endpoint a permanent role.

### C-001: Life-support reserve crosses zero

The reserve is a signed countdown. It begins at 5 and successful docking resets
it to 5. After the repair phase of a completed turn, critical life-support
damage decrements the reserve when the ship is not docked. A value below zero,
not zero, causes fatal hull damage.

**Status:** resolved. Preserve the original semantics. The world-mechanics
chapter will specify the transition and its ordering.

## Questions to discuss

### C-002: Temporary black-hole interaction state

Some non-gameplay activities historically used a temporary board marker that
could be observed as a black hole by concurrent play. A pure model would keep
HELP or feedback activity separate from galaxy contents. Preserving the marker
could retain a surprising multiplayer interaction, but it would also elevate a
storage technique into a world rule.

**Status:** unresolved. Model real black holes as galaxy features; do not yet
specify temporary information activities as black holes.

### C-003: Faction vocabulary

The game uses Federation/Human and Empire/Klingon terminology in overlapping
places. A pure model can give each faction one canonical identity while the
input and output languages preserve aliases and period wording. Alternatively,
the vocabulary shifts may themselves be part of the fictional voice.

**Status:** unresolved. Use `FEDERATION` and `EMPIRE` as working semantic names;
settle accepted command words and emitted names when specifying that language.

### C-004: Base enumeration order

Austin stores each faction's bases in numbered slots, fills the first available
slot during construction, and enumerates active bases in slot order. Although
the slot number is not displayed, destroying and rebuilding bases can therefore
change their report order. A pure model could instead order bases by position or
construction time, or leave order unspecified.

**Status:** unresolved. Determine whether captains can recognize or rely on the
historical report order before assigning semantics to the order of
`Galaxy.bases`.
