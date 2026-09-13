# 7. Command semantics

Each entry gives a command's syntax, its effects on the game, and the output
presented to the player. Sections 3 and 4 define the shared lexical rules,
abbreviation resolution, and formal grammar used below.

The syntax summaries use uppercase literal words, angle brackets for operands,
square brackets for optional input, `|` for alternatives, and `...` for
repetition. Repetition limits and permitted operand values are stated in each
entry. These are readable summaries of Section 4's grammar, not additional
formal productions. Omitted operands and prompted forms are explained in prose.
Uppercase spelling does not require full-length input; each entry gives its
command abbreviation.

> **Reviewer note — movement drafts:** `MOVE` and `IMPULSE` share open questions.
> Path selection, towing,
> rejected-command side effects, and readiness timing have explicit open
> questions below; these entries are not yet complete conformance contracts.

## 7.1. MOVE

```text
MOVE [ABSOLUTE | RELATIVE] <vertical> <horizontal>
MOVE COMPUTED <vessel-name>
```

*Syntax:* `MOVE` may abbreviate to `M`. The first form supplies a destination as
vertical and horizontal coordinates. `ABSOLUTE` interprets those coordinates
as a sector in the galaxy; `RELATIVE` interprets them as displacements from the
issuing ship. If neither modifier is supplied, the player's default coordinate
mode applies (Section 4.3). The `COMPUTED` form uses the named vessel's current
position as the destination.

If the destination is omitted, or only a coordinate modifier is supplied, MOVE
prompts for coordinates. Respond with coordinates, optionally preceded by a
coordinate modifier, or with `COMPUTED` followed by a vessel name; do not repeat
`MOVE`. Section 4.4 defines the formal prompted-response grammar.

*Semantics:* `MOVE` requests movement under warp power. Let `ship` be the
commissioned ship issuing the command. Movement
first obtains a destination, then checks its warp factor, spends energy, and
traverses the path. Completing this movement and becoming ready for another
command are distinct events. Section 9.1 defines sequential completion;
readiness choices remain open below.

### Destination and validation

1. Check `ship.deviceDamage.WARP_ENGINES`. At 300 damage units or more,
   emit `Warp engines damaged.` and end the command, without requesting or
   resolving a destination.
2. Resolve the destination using Section 4.3. An absolute pair supplies the
   position directly; a relative pair adds its components to the issuing
   ship's position at resolution. Each resulting coordinate must be from
   1 through 75; check the vertical coordinate before the horizontal.
3. For `COMPUTED`, check the issuing ship's computer before obtaining the
   named vessel's position. At 300 computer damage units or more, emit
   `Computer inoperative.` and end the command. Otherwise, the named ship
   must be commissioned and present, or the named Romulan must be present.
   An absent vessel emits `Player not in game.` and ends the command.
4. Compare the resolved destination with the issuing ship's position. If
   they are equal, emit the own-position diagnostic and request another
   destination. Otherwise, check the warp factor as defined below.

The numeric and computed cases in steps 2 and 3 are alternatives. A computed
destination captures a position when resolved; it neither follows the vessel
later nor permits entry into its occupied sector.

If input omits the destination, emit `Coordinates: `, including the trailing
space, and request a coordinate response. An empty response cancels movement.
Under Section 4.4's working rule, a modifier alone requests another response;
it neither changes the player's preference nor carries a mode into the next
response. Thus `M R` followed by `1 0` uses the player's default mode for
`1 0`, not necessarily relative mode.

> **Reviewer note — input recovery (C-009, C-010):** The uniform response rule
> is provisional. In particular, historical modifier-only input at an
> own-position retry can reuse earlier operands. Do not infer that this draft
> adopts that behavior. Section 5.5 defines ordinary single-destination
> diagnostic precedence, including `M C` with an inoperative computer.
> Malformed computed forms and consumption of slash-separated segments still
> need complete interaction rules. A prompt is not necessarily a
> read of a fresh physical line.

Let `p` be the issuing ship's position and `q` the resolved destination.
The requested warp factor is the
Chebyshev distance between them:

$$
w = \max(|q_v-p_v|,\;|q_h-p_h|).
$$

The warp engines' accumulated damage determines the permitted movement:

| Warp-engine damage | Permitted warp factor |
| --- | --- |
| 0 | 1 through 6 |
| Greater than 0 and less than 300 | 1 through 3 |
| 300 or greater | Movement unavailable |

After destination validation, check for a warp factor greater than 6 before
checking the lower limit imposed by nonzero engine damage. This order selects
the diagnostic when both limits are exceeded. Cancellation or rejection during
destination or warp validation causes no movement, energy expenditure, or
completed turn. It does not imply that all other ship properties are unchanged.

For an accepted movement, `ship.condition` becomes `GREEN` and `ship.docked`
becomes `false`. Later damage or the low-energy rule may change the condition
again.

> **Reviewer note — rejected movement (C-005):** The historical behavior also
> clears docked status and sets green condition when a distinct, in-range
> destination exceeds the permitted warp factor. Decide whether to retain
> these effects of a rejected command. The accepted-movement rule above does
> not settle that case.

### Energy and overheating

The energy cost depends on the requested warp factor, even if an obstruction
shortens the movement or prevents it entirely:

$$
E = 4w^2 \times S \times T,
\qquad
S = \begin{cases}2 & \text{shields up}\\1 & \text{shields down}\end{cases},
\qquad
T = \begin{cases}3 & \text{tractor link active}\\1 & \text{otherwise.}\end{cases}
$$

The cost is deducted from `ship.energy`. There is no preliminary
insufficient-energy rejection; movement can exhaust the ship's energy.
The towed ship pays no movement energy cost.

Warp factors 5 and 6 produce an overheating warning. Warp 5 has a 10% chance
of additional warp-engine damage; warp 6 has a 20% chance. When overheating
causes damage, the amount is selected from 0.1 through 400.0 damage units in
increments of 0.1. That damage is added to
`ship.deviceDamage.WARP_ENGINES`, and movement continues at the requested
warp factor even if the new damage would prohibit a subsequent movement.

The damage report precedes movement. In medium and long output, it is followed
by an approximate repair duration of `floor(D / 3) / 10` stardates, where `D`
is the damage just incurred. This estimate is not a repair operation. Normal
turn completion subsequently repairs up to 30 damage units on each device.

> **Reviewer note — randomness:** The working interpretation is uniform damage
> selection and the stated 10% and 20% event probabilities. The specification
> still needs a shared rule for random choices and their independence. It does
> not require a particular random-number generator.

### Path and obstruction

Movement follows a sector path toward the destination. A ship, base, planet,
star, black hole, or present Romulan can obstruct that path. The moving ship
stops at the last accepted empty sector before the obstruction. If the first
step is obstructed, the ship remains at its original position. An obstructing
object is neither struck nor damaged by `MOVE`.

With less than 300 computer damage units, the intended path is straight. At
300 or more, one random deflection is applied to its direction for the whole
movement. The deflection changes the path, not the requested warp factor or
energy cost. A deflected path stops at the galaxy boundary if it would leave
the grid; reaching the boundary alone produces no collision message.

Apply Section 6.4 with starting position `p`, aim displacement `q - p`, and
extent `w`. Deflection is zero for an operational computer and is selected
uniformly from [-0.25, 0.25) for a critically damaged computer. A clear path
with an operational computer reaches the requested destination, although
intermediate sector choices can vary.

> **Reviewer note — path geometry (C-006):** The two-sector inspection band is
> tactically observable, but its asymmetric boundaries and rounding may be
> incidental. Review this mathematical rule before adopting it. A conventional
> nearest-sector line would be simpler but could pass obstacles that currently
> stop movement.

### Tractor movement

When `ship.tractorLink` names another ship, the issuing ship leads and the
linked ship is towed. The link assigns these roles only for this movement.
The lead ship pays the tripled cost defined above. If the lead ship cannot
advance, neither ship changes position. The linked ship's current sector is
an obstruction when it lies in the lead ship's path.

> **Reviewer note — towed position (C-006):** A precise rule is still needed for
> placing the towed ship behind the lead ship, especially on oblique paths.
> Proposed rule: place it in the lead ship's last vacated sector. This preserves
> adjacency and gives both ships one unambiguous position, but changes some
> historical results. Also settle whether towing clears the towed ship's
> docked status. These choices remain open.

The placement conflict is observable even without a complicated path. For an
oblique movement ending at (23,22), take a final directional step of
`(1, 2/3)`. Truncating the step before subtracting gives a towed position of
(22,22); subtracting before truncating gives (22,21). The historical display
and stored-coordinate calculations use those different orders. A specification
with one `Ship.position` cannot retain both answers. The last-vacated-sector
proposal chooses an actual previously occupied sector instead, but remains a
choice for review, not an implication of the tractor-link type.

Towing does not give the linked ship a completed turn. Only the issuing ship
enters the movement-completion path; the linked ship neither pays the movement
cost nor receives automatic repair or a stardate increment merely for being
towed. An autonomous event triggered by the lead ship's completion can still
affect either ship under its own rules.

### Completion and output

An accepted movement that returns with the ship still commissioned completes
a turn even when blocked. A ship already destroyed when movement returns
instead proceeds directly to final reporting and release (Section 9.1).
Its command-specific
output occurs in this order: overheating warning, damage and repair estimate
if applicable, then collision warning if obstructed. A clear movement at warp
1 through 4 emits no command-specific success message.

An occupied-sector obstruction emits a blank line followed by:

```text
Navigation Officer:  "Collision averted, Captain!"
```

Critical warp-engine damage emits `Warp engines damaged.` and ends the
command. Critical computer damage in a computed destination emits
`Computer inoperative.` and ends it. A named vessel that is absent emits
`Player not in game.`

An out-of-bounds numeric destination ends the command. A vertical range error
emits `X coordinate lies outside galaxy.`; a horizontal range error emits
`Y coordinate lies outside galaxy.` Each ends with a newline. The output
uses `X` for the vertical coordinate and `Y` for the horizontal coordinate;
this wording does not change the coordinate convention of Section 2.

The following messages depend on the player's output length:

- **Own position.** Short and medium: `ERROR!  Own location used!`
  Long: `ERROR detected by computer!!  You have attempted` followed on the
  next line by `to use your present location.` The coordinate prompt follows
  the diagnostic.
- **Warp 4–6 with damaged engines.** Short and medium:
  `Engines damaged, warp 3 max.` Long:
  `Captain, our warp engines are damaged.  I can only give you warp 3.`
- **Warp greater than 6.** Short and medium: `Maximum warp N.` Long:
  `Engineering Officer:  The engines won't take it Captain.` followed on the
  next line by `I can only give you warp N.` Here `N` is 6 for undamaged
  engines and 3 for damaged engines. This diagnostic has no final newline;
  the other diagnostics above end with a newline.

The overheating warning in short output is `Engines overheating.` In medium
output it is `Captain, our engines are overheating!` Long output prefixes the
medium form with `Engineering Officer:  `, including two spaces. Each warning
ends with a newline. If damage occurs, the following report comes next:

```text
EEEEERRRRRROOOOOOOMMMMMmmmmm!!
Captain, the engines suffered D units of damage.
```

`D` is the damage amount: truncate its fractional part for short output;
otherwise print one decimal place. Right-align its integer part in a field
three characters wide. Medium and long output then append:

```text
Captain, repairs will take approximately R stardates.
```

`R` is the estimate defined above, printed with one decimal place and its
integer part right-aligned in a field two characters wide. Both report lines
end with a newline.

> **Reviewer note — completion and readiness (C-007):** Section 9.1 defines
> automatic repair, world activity, stardate advancement, life-support checks
> and score commitment. `MOVE` also delays the player's next command.
> The duration and its relationship to
> time spent answering coordinate prompts remain unresolved. The examples
> below describe the movement effects before those shared processes run.
> Section 9.1's timing discussion sets out the alternatives and consequences
> for later review; no choice is required to continue drafting this entry.

*Examples:* Unless stated otherwise, the ship starts at (20, 20), has
operational devices, lowered shields, no tractor link, and sufficient energy.
All mentioned paths are clear except for the stated obstacle.

- `M A 23 22` $\Rightarrow$ arrives at (23, 22); warp 3; spends 36 energy units.
- `M R 3 -2` $\Rightarrow$ arrives at (23, 18); warp 3; spends 36 energy units.
- `M A 24 20`, shields raised $\Rightarrow$ arrives at (24, 20); spends 128 energy units.
- `M A 24 20`, star at (22, 20) $\Rightarrow$ stops at (21, 20); spends 64 energy units;
  emits the collision warning.
- `M C W`, Wolf at (24, 20) $\Rightarrow$ stops at (23, 20); spends 64 energy units;
  emits the collision warning.
- `M A 76 20` $\Rightarrow$ grammatically valid but rejected for a vertical
  range error; no movement, energy cost, or completed turn.
- `M`, then `R 1 0` $\Rightarrow$ emits the coordinate prompt, then arrives
  at (21, 20); spends 4 energy units.
- `M`, then an empty response $\Rightarrow$ emits the coordinate prompt,
  then cancels; no movement, energy cost, or completed turn.
- `M A 24 20`, warp damage 0.1 $\Rightarrow$ rejected at the damaged-engine limit;
  no energy cost or completed turn. Docked-status and condition effects
  await C-005.

### Blocked movement with a tractor link

Excalibur at (20,20) and Farragut at (20,19) have a reciprocal tractor link.
Both have lowered shields, energy 2000, radio-device damage 80, no other
device damage and life-support reserve 5. Excalibur is docked and RED;
Farragut is undocked and GREEN. They are the only unreleased players, each
at stardate 1. Federation completed turns is 2, all scores are zero and
world-activity progress is zero. A star occupies (21,20), blocking Excalibur's
first step; no independent event intervenes.

`MOVE ABSOLUTE 23 20` requests warp 3. It is accepted, so Excalibur becomes
undocked and GREEN. The obstruction prevents either ship from changing
position, but Excalibur pays `4 * 3 * 3 * 3 = 108` energy and retains 1892.
Farragut retains 2000. The reciprocal link remains active. The immediate output
is `\nNavigation Officer:  "Collision averted, Captain!"\n`.

Completion repairs Excalibur's radio damage to 50, advances its stardate to 2
and Federation completed turns to 3, and advances world-activity progress to 1
without a cycle. Reserve and scores stay unchanged. Farragut's radio damage
remains 80 and its stardate remains 1. A blocked accepted movement therefore
differs from a validation rejection even though neither changes position.

Replacing the command with `IMPULSE ABSOLUTE 21 20` gives the same obstruction,
output and completion, but charges Excalibur 12 energy, leaving 1988. Neither
case needs a towed destination because the lead ship never advances. These
cases do not settle oblique towing placement or readiness duration.

## 7.2. IMPULSE

```text
IMPULSE [ABSOLUTE | RELATIVE] <vertical> <horizontal>
IMPULSE COMPUTED <vessel-name>
```

*Syntax:* `destination` and `coordinate-mode` are defined in Section 4.3.
`IMPULSE` may abbreviate to `I`. Omitting the destination, or supplying only a
coordinate modifier, requests coordinate input. At a coordinate prompt, input
follows `coordinate-response` in Section 4.4, without repeating `IMPULSE`.

*Semantics:* `IMPULSE` requests movement to an adjacent sector under impulse
power. It uses the destination resolution, prompted interaction, path,
obstruction, and tractor-movement rules of Section 7.1, with the engine check,
distance limit, and energy rule specified below. The warp-engine limits and
overheating rules of MOVE do not apply.

### Validation and movement

Let `ship` be the commissioned ship issuing the command. First check
`ship.deviceDamage.IMPULSE_ENGINES`. At 300 damage units or more, emit
`Impulse engines damaged.` followed by a newline and end the command without
requesting or resolving a destination. Damage below 300 does not reduce the
permitted distance or increase its cost. Warp-engine damage does not prevent
impulse movement.

Otherwise, resolve the destination and apply Section 7.1's numeric bounds,
computed-destination checks, and own-position retry, in that order for the
applicable destination form. A computed destination still requires an
operational computer. Cancellation and destination errors have the same
effects and diagnostics as in MOVE.

Let `p` be the issuing ship's position and `q` the resolved destination.
The requested distance is

$$
d = \max(|q_v-p_v|,\;|q_h-p_h|).
$$

After the own-position check, accept only `d = 1`. Thus an orthogonal or
diagonal neighbor is within range. A more distant destination produces the
distance diagnostic below and ends the command, without movement, energy
expenditure, or a completed turn.

> **Reviewer note — rejected movement (C-005):** As with MOVE, historical
> over-range IMPULSE clears docked status and sets green condition before
> rejecting the distance. Whether to retain these side effects remains open;
> rejection is not yet specified to leave the entire ship unchanged.

For accepted movement, set `ship.condition` to `GREEN` and `ship.docked` to
`false`. Traverse one step using Section 7.1's path and obstruction rules.
Critical computer damage applies the same direction deflection to an explicit
numeric destination; it does not disable that form of movement. An occupied
sector prevents entry and is not damaged. The issuing ship then remains at
its original position but still pays the movement cost and completes a turn.

### Energy, completion, and output

The energy cost is

$$
E = 4 \times S \times T,
\qquad
S = \begin{cases}2 & \text{shields up}\\1 & \text{shields down}\end{cases},
\qquad
T = \begin{cases}3 & \text{tractor link active}\\1 & \text{otherwise.}\end{cases}
$$

Deduct `E` from `ship.energy`, even if movement is obstructed. There is no
preliminary insufficient-energy rejection. With a tractor link, the issuing
ship leads and pays the entire cost; the towed ship pays none. Towed placement
uses the same unresolved rule as MOVE. IMPULSE produces no overheating warning
or overheating damage.

An accepted movement completes a turn if the ship remains commissioned when
movement returns, including when blocked. An already-destroyed ship takes
Section 9.1's direct final-report and release route instead. A clear movement
emits no command-specific success message. Obstruction emits Section 7.1's
collision warning, including its leading blank line. Subsequent turn-completion
output is separate from these command-specific emissions.

For an excessive distance, short and medium output emit:

```text
Maximum speed warp 1.
```

Long output emits:

```text
Captain, the impulse engines won't take it.  Maximum speed warp 1.
```

Each diagnostic ends with a newline. The long form has two spaces after
`it.`. The word `warp` is retained in the output; the command uses impulse
engines, not warp engines.

> **Reviewer note — shared dependencies:** The open path and towing decisions
> in C-006, readiness decision in C-007, and input-recovery decisions in C-009
> and C-010 apply here too. Section 9.1 defines sequential turn completion;
> concurrent-event ordering remains open. The
> one-sector limit does not establish a shorter readiness delay than MOVE.
> These references do not resolve any of those decisions.

*Examples:* The ship starts at (20, 20), with operational devices, lowered
shields, no tractor link, and sufficient energy unless stated otherwise.
Paths are clear except for a stated obstacle. Results describe command effects
before shared turn completion.

- `I R 1 1` $\Rightarrow$ arrives at (21, 21); spends 4 energy units.
- `I A 21 20`, shields raised $\Rightarrow$ arrives at (21, 20); spends 8 energy units.
- `I R 1 0`, warp-engine damage 300 $\Rightarrow$ arrives at (21, 20);
  spends 4 energy units. The impulse engines are operational.
- `I`, impulse-engine damage 300 $\Rightarrow$ emits
  `Impulse engines damaged.` without a coordinate prompt; no completed turn.
- `I C W`, Wolf at (21, 20) $\Rightarrow$ remains at (20, 20); spends
  4 energy units; emits the collision warning and completes a turn.
- `I R 2 0` $\Rightarrow$ rejects the distance; no energy cost or completed
  turn. Docked-status and condition effects await C-005.
- `I`, then an empty response $\Rightarrow$ emits `Coordinates: `, then
  cancels; no movement, energy cost, or completed turn.

## 7.3. TRACTOR

```text
TRACTOR [OFF | <ship-name>]
```

*Syntax:* `roster-name` is defined in Section 4.7. `TRACTOR` may abbreviate
to `TR`. Resolve `OFF` before roster names; `O` suffices. The Romulan is not
a permitted target. Omitting the operand releases an existing link; without
a link, it requests a target using `tractor-response`.

*Semantics:* TRACTOR establishes or releases a reciprocal link between two
ships. Establishing a link does not move either ship or assign permanent lead
and towed roles. Sections 7.1 and 7.2 define movement with a link.

The command first emits a newline to the issuing player. If that player's ship
is linked and no operand was supplied, release the link. Otherwise obtain an
operand, prompting when necessary with `Ship to apply tractor beam to:  `
(two trailing spaces). An empty prompted response cancels without changing
the link. `OFF` releases the current link, or reports that none exists.

### Establishing a link

Let `ship` be the issuing ship and `target` the named ship. Apply these checks
in order, stopping at the first failure:

1. The issuing ship has no existing link.
2. The name identifies a roster ship other than the issuing ship.
3. The target belongs to the issuing ship's faction.
4. The target is commissioned.
5. The ships are adjacent: their Chebyshev distance is one, including diagonal
   adjacency. Distinct ships cannot occupy the same sector.
6. The target has no existing link.
7. The issuing ship's shields are down.
8. The target's shields are down.

These checks determine diagnostic precedence. An absent enemy ship fails the
faction check, not the commissioned-status check. A distant friendly ship
fails adjacency even if the issuing ship's shields are up. An existing link
prevents a new target request before name lookup, so even an unknown target
word produces the already-active diagnostic. OFF is handled before that check.

On success, set `ship.tractorLink` to `target.name` and `target.tractorLink`
to `ship.name`. Generate an activation notice for both players. The target
does not confirm the link. Neither ship's position, docked status, energy,
or alert condition changes.

> **Reviewer note — tractor-device damage (C-012):** The historical linking
> operation does not inspect either ship's tractor-device damage. The working
> rule therefore adds no damage check. Review whether this is intended game
> behavior or an omission before declaring the entry complete.

### Releasing a link

Either linked ship may release the link. Set both ships' `tractorLink`
properties to `null`, and generate a release notice for both players. Release
does not require adjacency, lowered shields, or operational devices. It
changes no other ship property. An explicit target operand never replaces an
existing link: the player must release that link first.

Other operations may also break a link. Their triggering conditions and output
order belong to those operations, not to invocation of the TRACTOR command.
Towed placement remains the open decision in C-006.

### Diagnostics and notices

Diagnostics go only to the issuing player. Each ends with a newline and uses
the same wording at every output length, except the target-name field below.

- **OFF without a link:** `Tractor beam not in operation at this time, Captain.`
- **Issuing ship already linked:** `Tractor beam already active, Captain.`
- **Unknown ship name:** `Unknown ship name.`
- **Enemy target:** `Can not apply tractor beam to enemy ship.`
- **Target not commissioned:** `Player not in game.`
- **Target not adjacent:** `Not adjacent to destination ship.`
- **Target already linked:** `N already has tractor beam active.`
- **Issuing ship's shields up:** `Can not apply tractor beam through shields, Captain.`
- **Target's shields up:** `N has his shields up.  Unable to apply tractor beam.`

`N` is the target's single-letter roster initial for short and medium output,
or its name with the first letter uppercase and the remaining letters lowercase
for long output. Exactly one space separates it from the following text.

Selecting the issuing ship produces this two-line diagnostic:

```text
Beg your pardon, Captain?  You want to apply a tractor
beam to your own ship?
```

Activation and release notices use each recipient's output length:

| Notice | Short and medium | Long |
| --- | --- | --- |
| Activation | `Trac. Beam on` | `Tractor beam activated, Captain.` |
| Release | `Trac. Beam off` | `Tractor beam broken, Captain.` |

Each notice ends with a newline. In long output, two newlines precede the
notice text. These are separate from the initial newline emitted to the
issuing player when TRACTOR begins.

> **Reviewer note — notification delivery:** Link changes generate notices;
> they do not imply simultaneous display to both players. The shared event
> delivery points and presentation context are defined in Section 9.5;
> ordering within pending combat notifications remains C-023. Section 2's
> PendingNotification accounts for these non-radio notices. It does not settle
> delivery order; do not model them as subspace radio messages.

### Completion and examples

TRACTOR consumes no energy, completes no turn, and imposes no command-specific
readiness delay, whether it succeeds, fails, or is cancelled. This does not
suspend autonomous activity or prevent pending output from being delivered.

### Discussion — replacement input (C-010)

The observed dialogue requests a word, not necessarily a valid ship name.
Numeric and other non-word operands repeat the target prompt. Once a word is
received, OFF handling and the ordered semantic checks run once; an unknown
name ends with its diagnostic rather than prompting again. Every retry uses
only the first response token. The command's initial newline occurs once,
not before each repeated prompt.

This distinction applies even when a link already exists. Bare TRACTOR releases
it immediately, but `TRACTOR 1` requests a replacement word before testing the
existing link. OFF at that prompt releases it; another word reports that the
beam is already active; an empty response preserves it. The response does not
become a fresh bare TRACTOR invocation.

With no intervening state changes, the source-derived interactions are:

| Initial input and link | Responses | Result |
| --- | --- | --- |
| `TR`, unlinked | `F` | One prompt, then ordinary Farragut eligibility checks |
| `TR`, unlinked | `1`, then `F` | Two prompts, then the same checks |
| `TR`, unlinked | `ZZZ` | One prompt, then `Unknown ship name.\n`; no retry |
| `TR 1`, linked | Empty | One prompt; link remains active |
| `TR 1`, linked | `O` | One prompt; releases the link |
| `TR 1`, linked | `ZZZ` | One prompt, then `Tractor beam already active, Captain.\n` |

Replacement input can come from the next slash segment. Thus `TR/F`, when
unlinked, emits the target prompt and consumes F as its response. A linked
ship instead releases immediately on bare TR; no target response is requested,
so the following segment is not consumed by that release.

The historical path ignores tokens after the first operand or first response
word. Strict whole-segment rejection would change that behavior and the
non-word retry cases above. Those malformed-input choices remain C-010;
the ordinary omitted-target dialogue does not depend on adopting them.

*Examples:* Excalibur is the issuing ship at (20, 20); Farragut is commissioned
at (21, 21). Both are initially unlinked with shields down. Each example starts
from those conditions unless stated otherwise. Notices below are generated
events, not assertions about their delivery time.

- `TR F` $\Rightarrow$ links Excalibur and Farragut; generates an activation
  notice for each player; neither ship moves or spends energy.
- `TR`, when linked to Farragut $\Rightarrow$ clears both links and generates
  a release notice for each player, without prompting.
- `TR OFF`, when unlinked $\Rightarrow$ reports that no beam is in operation.
- `TR F`, Farragut's shields up $\Rightarrow$ rejects the link; in short
  output emits `F has his shields up.  Unable to apply tractor beam.`
- `TR F`, Farragut at (22, 20) $\Rightarrow$ reports nonadjacency, even if
  Farragut's shields are also up.
- `TR`, then an empty response $\Rightarrow$ prompts for a target, then
  cancels; both ships remain unlinked.

## 7.4. SET

```text
SET [<setting> [<value>]]
```

*Syntax:* SET may abbreviate to `SE`. Setting names use the first matching
prefix in this order: NAME, OUTPUT, TTYTYPE, PROMPT, SCANS, ICDEF, OCDEF,
then the privileged settings ROMOPT, ENDFLG, BHREMV. Thus `SE O S` selects
short output, while `SE OC R` selects relative coordinate output. Resolve
a value only within the selected setting's vocabulary. `numeric-mode` is
defined in Section 4.6; privileged forms are inventoried in Section 4.13.

NAME consumes the remaining line as text, including spaces and punctuation,
not a roster name. Its text cannot introduce another command. The text begins
after the separator following NAME; detailed normalization remains C-011.

*Semantics:* SET changes one preference of the issuing player. A recognized
value replaces the corresponding property of that player's `PlayerPreferences`:

| Setting | Property | Values |
| --- | --- | --- |
| OUTPUT | `outputLength` | SHORT, MEDIUM, LONG |
| SCANS | `scanLength` | SHORT, LONG |
| PROMPT | `promptStyle` | NORMAL, INFORMATIVE |
| ICDEF | `coordinateInput` | ABSOLUTE, RELATIVE |
| OCDEF | `coordinateOutput` | ABSOLUTE, RELATIVE, BOTH |

Every value in a row has a distinct initial letter, so its initial suffices
once that setting has been selected. The setting and value have separate
lookup vocabularies: `SE O S` means OUTPUT SHORT, not OCDEF or SCANS.

All other preferences remain unchanged. The change applies to subsequent input
or output, including subsequent segments of the same command line where those
segments are executed. It does not reinterpret an already resolved destination.
SET consumes no energy, completes no turn, and adds no readiness delay.
Successful changes to these five preferences emit no acknowledgment.

PROMPT selects the command-prompt format defined in Section 10.10. It changes
subsequent prompts, not the text already emitted while obtaining this setting.

### Prompted input

If the setting is missing or unrecognized, emit the following prompt, preceded
by a newline. It contains one internal newline and one trailing space:

```text
Name, Output, Ttytype, Prompt, Scans,
Input or Output location defaults (ICDEF, OCDEF)?
```

Read a setting and optional value without SET. An empty response ends the
command without changing a preference. If a required preference value is
missing or is not a word token, prompt for the value alone. Each prompt below
begins with a newline and ends with one space:

- OUTPUT: `Short, Medium, or Long output?`
- PROMPT: `Normal or Informative command prompt?`
- SCANS: `Short or Long scans?`
- ICDEF: `Absolute or Relative default for location input?`
- OCDEF: `Absolute, Relative, or Both for location output?`

An empty value response ends the command unchanged. An unrecognized word value
for these five settings also ends unchanged, without a diagnostic. A non-word
response requests the value again.

Once a setting has been selected, it remains the setting while its value is
requested. The value response does not restart setting lookup. For example,
after `SET OUTPUT` prompts, `LONG` changes output length, whereas
`OUTPUT LONG` supplies the unrecognized value word OUTPUT and ends unchanged.
By contrast, the initial setting prompt accepts `OUTPUT LONG` together.

| Initial input | Subsequent responses | Result |
| --- | --- | --- |
| `SET` | `OUTPUT LONG` | One setting prompt; output length becomes LONG |
| `SET OUTPUT` | `12`, then `LONG` | Two value prompts; output length becomes LONG |
| `SET OUTPUT` | `BRIEF` | One value prompt; ends unchanged, without an error message |
| `SET OUTPUT` | `OUTPUT LONG` | One value prompt; ends unchanged |
| `SET SCANS` | Empty | One value prompt; cancels unchanged |

Each successful case changes only the selected preference. Input while at a
setting or value prompt can come from the next slash segment; the command does
not apply QUIT's input-clearing rule. Thus `SET OUTPUT/LONG` supplies a value
response, not a new LONG command. The prompt is still emitted.

> **Reviewer note — acceptance (C-010):** This distinguishes historical
> unrecognized words from non-word input; it is not a universal validation
> policy. Extra operands and slash-segment consumption still require review.

### Name, terminal, and privileged settings

NAME requests replacement display-name text when none is supplied. Its prompt
is a newline followed by `Desired name:`, with two trailing spaces.
TTYTYPE requests a terminal name; its prompt is a newline followed by
`Terminal type:`, also with two trailing spaces. These branches do not change
the five preferences above.

> **Reviewer note — scope (C-011):** Name uppercasing, truncation, whitespace,
> and empty-name behavior require a player-identity decision. Historical
> terminal selection and its error/list output also remain provisional, not
> requirements for terminal hardware. Privileged SET effects and authorization
> need a separate scope decision. These branches are inventoried, not complete
> semantic contracts; no host-specific fields are implied in PlayerPreferences.

*Examples:*

- `SE IC R` changes only coordinate input to relative.
- `SE OC B` changes only coordinate output to both conventions.
- `SE`, then `OUTPUT LONG` selects long output after the setting prompt.
- `SE SCANS`, then an empty response leaves scan length unchanged.
- `SE OUTPUT BRIEF` leaves output length unchanged and emits no diagnostic.

## 7.5. TYPE

```text
TYPE [OPTION | OUTPUT]
```

*Syntax:* TYPE may abbreviate to `TY`. `OP` selects OPTION and `OU` selects
OUTPUT. `O` is ambiguous. Omitting the operand requests it at a prompt.

*Semantics:* TYPE reports preferences or game options to the issuing player.
It changes neither preferences nor galaxy state, consumes no energy, completes
no turn, and adds no readiness delay.

Missing or unrecognized input emits a newline followed by
`Do you wish to see the OUTPUT or OPTION switches?`, with one trailing space.
The response contains the operand without TYPE. An empty response cancels.
`O` first emits a newline and `Ambiguous switch for TYPE.` followed by a
newline, then requests the operand again.

Numeric and other non-word operands also request the operand again; they do
not choose a default report. Only the ambiguous word O produces the ambiguity
diagnostic. An unrecognized word simply repeats the question. A recognized
choice ends this selection dialogue and begins exactly one report; neither
the last TYPE choice nor the player's output length supplies an implicit choice.

The response can come from the next slash segment: `TYPE/OUTPUT` requests and
then selects OUTPUT. The prompt is still emitted. These are successive input
segments, not a single two-word command or QUIT's fresh-response confirmation.

| Initial operand | Responses | Selection behavior |
| --- | --- | --- |
| None | `OU` | One prompt, then OUTPUT |
| `O` | Empty | Ambiguity diagnostic, prompt, cancellation; no report |
| None | `123`, `ZZZ`, `OP` | Three prompts, no ambiguity diagnostic, then OPTION |
| `OUTPUT` | None | OUTPUT immediately; no operand prompt |

Each ambiguity diagnostic ends with a newline and the following prompt begins
with another, leaving a blank line between them. Cancellation adds no success,
failure or cancellation message. Input echo and segment-reading output are
separate from these command emissions.

### TYPE OUTPUT

Emit a newline, `Current output switch settings:`, and two newlines. Then
emit these five lines in order, substituting the issuing player's preferences:

```text
L output format.
P command prompt.
S SCAN format.
I coordinates are default for input.
O coordinates are default for output.
```

`L` is Short, Medium, or Long; `P` is Normal or Informative; `S` is Short or
Long; `I` is Absolute or Relative; and `O` is Absolute, Relative, or Both.
Each field is followed by one space; each line ends with a newline. This report
does not abbreviate itself when short output is selected.

The historical report appends `Terminal type:` and two spaces, then the selected
terminal name followed by a newline. That final line's place in Austin Core
remains part of C-011; it cannot be derived from the five-property preferences ADT.

### TYPE OPTION

The report begins with a newline and a version-banner line, then reports
Romulan and black-hole enablement in that order:

- Enabled Romulan: `There are Romulans in this game.`
- Disabled Romulan: `Romulans are NOT in this game.`
- Enabled black holes: `There are Black holes in this game.`
- Disabled black holes: `Black holes are NOT in this game.`

Each line ends with a newline. Enablement is not presence: an enabled Romulan
may be absent, and enabled black holes may have no remaining positions.
There are no counts, coordinates, or additional option fields in this report.
Output length and coordinate-output preferences do not change its form.

> **Reviewer note — banner (C-011):** `Galaxy.romulan` and `Galaxy.blackHoles`
> distinguish enablement from current presence. The Austin Core version-banner
> text remains to be specified before this report is complete; do not silently
> substitute a new implementation's name for the historical banner.

### Discussion — report identity and terminal scope

With both options enabled, the historical complete OPTION report is:

```text
\n[DECWAR Version 2.3, 20-Nov-81]\n
There are Romulans in this game.\n
There are Black holes in this game.\n
```

Each `\n` denotes an output newline; the displayed line breaks add none.

Disabling either option replaces only its corresponding line with the disabled
form above. The banner does not depend on option values, player preferences,
or the number of objects presently in the galaxy. Retaining this banner would
preserve the original presentation but could imply that a new implementation
is that historical release. Replacing it with an Austin Core identification
would distinguish the specification from that release but change visible text.
The exact replacement, if any, remains unresolved under C-011.

TYPE OUTPUT has a separate scope question. Its historical final line identifies
the selected terminal; the five preceding preference lines are unaffected by
that selection. Omitting the terminal line keeps the report limited to game
preferences. Retaining it requires defining terminal selection and its displayed
names alongside SET TTYTYPE, rather than inventing a terminal property solely
to complete TYPE. Neither alternative is adopted here.

*Examples:* `TY OU` reports current preferences without changing them.
`TY`, then `OP`, requests and reports options. `TY O`, then an empty response,
reports ambiguity, prompts, and cancels without producing either report.

## 7.6. DAMAGES

```text
DAMAGES [<device> ...]
```

*Syntax:* DAMAGES may abbreviate to `DA`. Section 4.7 defines device selectors:
each selects every device code matching its prefix, not necessarily one device.

*Semantics:* Report the issuing ship's device damage. This operation changes
no game state, consumes no energy, completes no turn, and adds no readiness
delay. It does not report hull damage; STATUS does that.

First emit a newline. If every device has zero damage, emit
`All devices functional.` and a newline, regardless of selectors, then end.
Otherwise, without selectors, report only devices with positive damage in the
order in the table below. With selectors, process them in input order and
report every matching device in table order, including zero-damage devices.
Repeated selections produce repeated rows. A selector matching no code produces
no row and no diagnostic.

| Device | Short | Medium | Long |
| --- | --- | --- | --- |
| Shields | SH | Shields | Deflector Shields |
| Warp engines | WA | Warp | Warp Engines |
| Impulse engines | IM | Impulse | Impulse Engines |
| Life support | LS | Life Sup | Life Support |
| Torpedo tubes | TO | Torps | Torpedo Tubes |
| Phasers | PH | Phasers | Phasers |
| Computer | CO | Computer | Computer |
| Radio | RA | Radio | Radio |
| Tractor beam | TR | Tractor | Tractor Beam |

### Report layout

For an unselected report in long output, emit `Damage Report for ` followed
by the issuing ship's name in title case and two newlines. Medium and long
output then emit a heading: `Device`, four spaces in medium or thirteen in
long, `Damage`, and two newlines. Short output has no heading. Selected
reports have no heading at any output length.

Each row begins with the corresponding device label. In short output, append
two spaces. In medium or long output, append at least the label's one trailing
space, then enough spaces to start the damage field at column 10 or 19,
respectively, counting the first column as 1.

Right-align the damage's integer part in a minimum width of four characters.
Short output truncates the fractional part; medium and long output append a
decimal point and one fractional digit. Long output appends ` units`.
Each row ends with a newline. A positive damage below one unit therefore
appears as zero in short output; it is not omitted from the unselected report.

> **Reviewer note — numeric presentation:** The rule above covers damage in
> tenths of a unit, as produced by the reviewed operations. The general ADT
> permits other fractions; shared output rules must decide their conversion
> rather than silently adding a rounding policy here.

> **Reviewer note — malformed selectors (C-010):** The historical command
> treats a non-word first operand as a request for the default report. After
> a word selector, a non-word instead stops the report and ignores subsequent
> operands. This is distinct from an unmatched word, which emits nothing and
> permits later selectors to be processed. Whether to retain these recovery
> rules is under review; they are not additional well-formed syntax.

*Examples:* Suppose torpedo-tube damage is 12.5, tractor-beam damage is zero,
and all other devices are undamaged.

- `DA` reports only the torpedo tubes.
- `DA T` reports torpedo tubes, then tractor beam, including its zero damage.
- `DA TR TO TR` reports tractor beam, torpedo tubes, then tractor beam again.
- With every device undamaged, `DA T` instead emits `All devices functional.`

### Discussion — selector recovery versus STATUS

With torpedo-tube damage 12.5 and all other devices undamaged, the observed
short-output recovery is:

| Input | Report output |
| --- | --- |
| `DA 1 TR` | `\nTO    12\n` — the first non-word selects the default report |
| `DA ZZZ T` | `\nTO    12\nTR     0\n` — the unknown word is skipped |
| `DA T 1 TR` | `\nTO    12\nTR     0\n` — the number stops further selection |
| `DA TORPEDOES` | `\n` — the full name does not match a device code |

The all-functional check occurs before any selector processing. With every
device undamaged, each of these inputs instead yields
`\nAll devices functional.\n`. Hull damage does not prevent that response:
this is a device report, not an assertion that the entire ship is undamaged.

STATUS uses property names and different recovery: it diagnoses unknown words
and treats a first non-word as termination, not as a default-report request.
A shared strict-rejection policy would change both commands' visible behavior
in different ways. These C-010 cases remain recorded for discussion rather
than added to the grammar as ordinary selector forms. The same DAMAGES
reporting rules apply when REPAIR actually invokes an appended damage report;
REPAIR's undamaged-ALL exception remains separate.

## 7.7. STATUS

```text
STATUS [<field> ...]
```

*Syntax:* STATUS may abbreviate to `ST`. `status-field` is defined in
Section 4.7 and is also used by DOCK. Fields are property names, not device
selectors. Omitting them requests the full report.

*Semantics:* Report properties of the issuing ship to its player, without
changing game state, spending energy, completing a turn, or adding a readiness
delay. Begin with a newline. A full report gives stardate, then CONDITION,
LOCATION, TORPEDOES, ENERGY, DAMAGE, SHIELDS, and RADIO, in that order.
A selected report gives only the requested fields in input order. Repetitions
produce repeated fields; selected reports do not automatically include stardate.

The fields mean:

- CONDITION: `Ship.condition`, prefixed by docked status when `Ship.docked` is true.
- LOCATION: `Ship.position` as `vertical-horizontal`, without `@`, padding,
  or relative coordinates, regardless of output preferences.
- TORPEDOES: `Ship.torpedoes`.
- ENERGY: `Ship.energy`.
- DAMAGE: `Ship.hullDamage`, not any device's damage.
- SHIELDS: `Ship.shields.strength` with a positive sign when raised and negative
  sign when lowered; medium and long output also give the shield-energy amount,
  25 energy units per percentage point.
- RADIO: `damaged` when radio-device damage is at least 300; otherwise `On`
  or `Off` according to `Ship.radio.enabled`. Damage takes precedence over the switch.

### Output forms

The following prefixes precede each value. In this table, `SP` denotes one
space and `TAB` one horizontal tab character; multiplication denotes repetition.
These names are notation, not emitted text.

| Field | Short | Medium | Long |
| --- | --- | --- | --- |
| Stardate | SD | SDate + 2 SP | Stardate + TAB |
| CONDITION | empty | Cond + 3 SP | Condition + TAB |
| LOCATION | empty | Loc + 4 SP | Location + TAB |
| TORPEDOES | T | Torps + 2 SP | Torpedoes + TAB |
| ENERGY | E | Ener + 3 SP | Energy left + TAB |
| DAMAGE | D | Dam + 4 SP | Damage + 2 TAB |
| SHIELDS | SH | Shlds + 2 SP | Shields + TAB + 8 SP |
| RADIO | R | Radio + 2 SP | Radio + 2 TAB |

Short output puts the fields on one line with one space after each value,
including the last, then a newline. Medium and long output put each field on
its own line. Stardate and torpedo count are integers, with minimum width four
in medium and long output and no minimum width in short output. Energy, hull
damage, and shield values omit fractions in short output and use one decimal
place otherwise, with the same integer-part widths. Signed shield strength
retains its sign within that field width. Zero shield strength prints as `-0`
in short output and `-0.0` otherwise, whether shields are raised or lowered.
Fractions finer than tenths retain the numeric-presentation
review below.

Condition is G, Y, or R in short output, otherwise Green, Yellow, or Red.
Docked condition prefixes these with `D+` in short output or `Docked+` otherwise.
Medium and long shield output appends `%`, one space, the shield-energy amount,
and ` units`, followed by a newline.

> **Reviewer note — report formatting:** Sections 10.2–10.3 define the numeric
> fields used here; LOCATION's exception and shield signed zero are specified
> above. Section 10.2 also defines sign-preserving field overflow. Conversion
> of fractions finer than tenths remains open; normal-field transcript tests
> do not resolve that conversion.

> **Reviewer note — malformed fields (C-010):** The historical reporter emits
> `%Syntax error` for an unknown word and continues with later fields; it stops
> at a non-word. Reconcile these recovery forms with the complete-segment
> grammar before calling all malformed-input behavior specified.

*Examples:* `ST E D` reports ship energy followed by hull damage, not device
damage. `ST L` reports absolute position even after `SE OC R`. `ST R` reports
`damaged` when radio-device damage is 300, even when the radio switch is on.

For a docked Green ship at (20,21), stardate 12, with five torpedoes,
1234.5 energy, 2.5 hull damage, lowered shields at 50%, and an undamaged radio
switched off, the complete short STATUS report is:

```text
\nSD12 D+G 20-21 T5 E1234 D2 SH-50 ROff \n
```

Here `\n` denotes a newline; the space before the final newline is emitted.
The report does not include input echo or the following command prompt.

### Discussion — partial reports and malformed fields

Using the ship values above, the observed recovery behavior gives these exact
short-output results:

| Input | Report output |
| --- | --- |
| `ST R E R` | `\nROff E1234 ROff \n` |
| `ST E ZZZ D` | `\nE1234 %Syntax error\nD2 \n` |
| `ST E 1 D` | `\nE1234 \n` |
| `ST 1 E` | `\n\n` |
| `ST ZZZ` | `\n%Syntax error\n\n` |

Only omitted fields request the full report. A supplied non-word at the start
does not count as omission. Unknown words do not undo earlier fields or stop
later word selectors, whereas a number or decimal token stops selection without
a diagnostic. Short output adds its final newline even after an error newline;
medium and long output do not add that short-report terminator.

The alternative is to validate the whole selector list before reporting, reject
it as a unit, and print none of its fields. That would remove partial output
and change the cases above. C-010 remains unresolved; the companion tests record
the observed recovery, not an adopted uniform error policy.

For `DO STATUS ...`, service and `DOCKED.\n` precede STATUS parsing. Under the
observed recovery, an unknown appended field can therefore report an error after
successful replenishment; it does not undo docking or prevent its completion.
A failed DOCK does not invoke STATUS at all. Any proposal to reject malformed
appended fields before service must state that additional change explicitly.

## 7.8. POINTS

```text
POINTS [<subject> ...]
```

*Syntax:* POINTS may abbreviate to `PO`. Subjects select the player's ship,
either faction, or the Romulans. ME and I are equivalent; FEDERATION and
HUMANS are equivalent; EMPIRE and KLINGONS are equivalent. Singular HUMAN,
KLINGON, and ROMULAN are accepted prefixes. The command does not take another
ship's roster name.

*Semantics:* POINTS reports committed scores without changing them or committing
pending score changes. It consumes no energy, completes no turn, and adds no
readiness delay.

Without subjects, an in-game player receives their ship's report. In pre-game,
the default selects both factions and the Romulans. ALL selects those groups
and, in-game only, the player's ship. Remove the Romulan subject when Romulans
are disabled, regardless of whether a Romulan is presently in the galaxy.
ME and I are invalid in pre-game.

Selection is a set: aliases and repetitions do not duplicate columns. Emit
columns in the fixed order personal ship, Federation, Empire, Romulans,
omitting unselected subjects. Input order does not affect this order. If no
subjects remain, or a word is not a permitted subject, emit a newline followed
by `Incorrect input, POINTS aborted.` and a newline; produce no report.

Selecting a subject more than once does not duplicate its column. Thus
`POINTS KLINGONS HUMANS ME FEDERATION I` has the same selected columns as
`POINTS ALL` when Romulans are disabled: personal, Federation, then Empire.
Romulan enablement, not current vessel presence, controls whether that
statistical column can be included. Requesting only disabled Romulans leaves
no selected subject and produces the abort diagnostic.

### Discussion — subject recovery

The observed input path stops at the first non-word token and uses the subjects
already selected. It does not examine later tokens. Unlike an unknown word,
that non-word does not itself abort an otherwise nonempty selection.

| Input | Observed selection outcome |
| --- | --- |
| `POINTS FEDERATION 1 EMPIRE` | Federation only |
| `POINTS FEDERATION ZZZ` | Abort; no partial report |
| `POINTS 1 FEDERATION` | Abort; no subjects were selected |
| `POINTS ME` before commissioning | Abort; no current personal subject exists |

Omission of all operands still invokes the ordinary default; a supplied numeric
operand is not omission. A uniform strict-input rule would reject the first
case rather than report Federation. These C-010 cases remain for discussion,
not additional well-formed productions. In particular, STATUS's print-as-it-goes
recovery must not be reused for POINTS: POINTS selects subjects before producing
its report, and an unknown word can invalidate earlier selections.

### Scores and statistics

Use the ship's committed `score`, each selected faction's `TeamState.score`,
and the Romulan score. Report a category only when at least one selected
subject has a nonzero value in it; include zero values for the other selected
subjects in that row. The category order is ENEMY_DAMAGE, ENEMY_KILLS,
BASE_DAMAGE, PLANET_CAPTURE, BASE_CONSTRUCTION, ROMULAN, STAR_DESTRUCTION,
PLANET_DESTRUCTION. Each cell is points, not an event count.

After the categories, always report total points as their sum. If a faction or
Romulan column is selected, next report number of ships and points per player,
leaving the personal column blank for these two rows. Finally report points
per stardate for every selected subject.

For a positive denominator, points per player is total points divided by the
selected faction's `TeamState.admissions`, or by `RomulanStatistics.appearances`
for Romulans. Points per stardate divides total points by `TeamState.completedTurns`,
`RomulanStatistics.activityCount`, or the personal `Ship.stardate`, respectively.
These are cumulative statistics, not counts of ships currently present.

For a positive denominator `count` and a total expressed in whole tenths of
a point, truncate the quotient toward zero to one decimal place:

```typescript
const average = Math.trunc(10 * total / count) / 10;
```

Then apply the selected decimal output format. Short output drops the remaining
fractional digit; it does not round. Thus 100 points over 3 turns reports 33.3
in medium/long output and 33 in short output. A total of -100 reports -33.3
or -33, not -33.4 or -34. A total of 0.1 over 2 turns reports 0.0 or 0.

> **Reviewer note — statistical updates:** Section 2 now represents these
> cumulative statistics. Faction admission is counted before ship selection
> finishes; Romulan activity counts eligible cycles even without an appearance.
> Admission cancellation and autonomous scheduling must finish defining those
> update boundaries. Do not substitute current population or successful actions.

> **Reviewer note — averages (C-013):** Zero denominators still need an explicit
> rule. The source divides directly, including
> in a personal report before any completed turn. The draft does not adopt a
> compiler-dependent result or silently substitute zero.

### Output language

The row labels below apply to short output or to medium/long output. Each
category's points occupy the corresponding subject column.

| Category | Short label | Medium/long label |
| --- | --- | --- |
| ENEMY_DAMAGE | Dam E's | Damage to enemies |
| ENEMY_KILLS | E's dest | Enemies destroyed |
| BASE_DAMAGE | Dam B's | Damage to bases |
| PLANET_CAPTURE | @'s capt | Planets captured |
| BASE_CONSTRUCTION | B's built | Bases built |
| ROMULAN | Dam ??'s | Damage to Romulans |
| STAR_DESTRUCTION | *'s dest | Stars destroyed |
| PLANET_DESTRUCTION | @'s dest | Planets destroyed |

Summary labels are `Tot Pts`, `# of shps`, `Pts / Pl`, and `Pts / SD` in
short output; otherwise `Total points:`, `Number of ships:`, `Pts. / player:`,
and `Pts. / stardate:`. The number-of-ships row is an integer count.
Point values omit fractions in short output and show one decimal place otherwise.

Long output appends the following literal annotations to category labels:
ENEMY_KILLS and ROMULAN use ` ( 500)`; PLANET_CAPTURE uses ` ( 100)`;
BASE_CONSTRUCTION uses ` (1000)`; STAR_DESTRUCTION uses ` ( -50)`;
PLANET_DESTRUCTION uses ` (-100)`. These are report annotations, not a
definition of how each operation awards points.

### Report assembly

Begin with a newline. Pad the header to column 14 in short output, 24 in
medium, or 31 in long, where columns are one-based. Emit the selected headers
in subject order:

- Personal: one space, the vessel's initially capitalized full name padded
  on the right to ten characters, then two spaces unless short.
- Federation: `Federation`, one space, then two more spaces unless short.
- Empire: `    Empire`, one space, then two more spaces unless short.
- Romulans: `  Romulans`, with no following spaces.

End the header with a newline. Header padding is not derived from numeric
field widths; preserve the stated alignment even when some subjects are absent.

For each included category row, pad the short label to nine characters. In
medium/long output, pad the label to eighteen characters, except
`Damage to Romulans`, which has seventeen characters and no added space.
In long output, append the annotation above when present; for ENEMY_DAMAGE
and BASE_DAMAGE, instead pad to column 26. Emit each selected points value
using Section 10.2's decimal field with integer-part width 11. End each
category row with a newline.

The total row starts with an additional newline. Its label is `Tot Pts`
padded to nine characters, or `Total points:` padded to eighteen. In long
output, then pad to column 26. Emit selected totals with the same decimal
field and end with a newline. Consequently there is a blank line before totals,
even when no category rows were included.

When group statistics are selected, the number-of-ships row starts with another
newline. Use `# of shps` in short output or `Number of ships:` otherwise;
long output then pads to column 24. Emit counts as integer fields of width 11
in short output or 13 otherwise. If the personal column is selected, emit an
empty field of that width before the group counts. Do not append a newline
here: the next row begins with one.

The points-per-player row begins with a newline and `Pts / Pl` padded to nine
characters, or `Pts. / player:` padded to eighteen. Long output then pads to
column 26. Emit an empty personal field of width 11 in short output or 13
otherwise, if selected, then each group quotient as a decimal field with
integer-part width 11. This row also has no separate ending newline.

The final points-per-stardate row begins with a newline and `Pts / SD` padded
to nine characters, or `Pts. / stardate:` padded to eighteen. Long output pads
to column 26. Emit every selected quotient using decimal integer-part width 11,
then end with a newline. If only the personal subject is selected, omit the
two group-statistics rows entirely, not merely their values.

> **Reviewer note — remaining report verification:** The layout above is
> source-backed. Complete literal transcripts and
> zero denominators still need verification. Totals finer than tenths also
> depend on the open score state-write precision rule. The layout
> must not be regularized into a different table merely because its original
> spacing is uneven.

*Examples:* `PO E F` reports Federation then Empire, not input order.
`PO F HUMAN F` reports one Federation column. With no Romulan enabled,
`PO ROMULAN` reports incorrect input rather than an empty table. `PO ME`
does not expose the ship's pending score changes.

## 7.9. SCAN and SRSCAN

```text
SCAN [UP | DOWN | LEFT | RIGHT] [<vertical-range> [<horizontal-range>]] [WARNING]
SCAN CORNER <vertical-range> <horizontal-range> [WARNING]
SRSCAN [UP | DOWN | LEFT | RIGHT] [<vertical-range> [<horizontal-range>]] [WARNING]
SRSCAN CORNER <vertical-range> <horizontal-range> [WARNING]
```

*Syntax:* SCAN may abbreviate to `SC`; SRSCAN to `SR`. Their shared
`scan-arguments` production is defined in Section 4.8. Neither command prompts
for omitted ranges. WARNING, if supplied, follows all other operands.

*Semantics:* Display a rectangle of sectors around the issuing ship and update
its faction's knowledge of nearby planets and enemy bases. Both commands use
the same range and display rules; they differ only in the initial default
extent. Neither consumes energy, completes a turn, nor adds a readiness delay.
No computer- or radio-device damage check restricts the scan.

### Display bounds

Let the issuing ship's position be `(v, h)`. Define four nonnegative extents:
`up`, `down`, `left`, and `right`. Up increases the vertical coordinate;
right increases the horizontal coordinate.

For an ordinary scan with one integer `a`, initially set all four extents
to `a`. With two integers `a, b`, set up/down to `a` and left/right to `b`.
With no integers, use the default extent for all four directions.

UP sets down to zero; DOWN sets up to zero; LEFT sets right to zero; RIGHT
sets left to zero. The ship's own row or column remains included.

For `CORNER a b`, construct the extents directly:

```typescript
const up = Math.max(a, 0);
const down = Math.max(-a, 0);
const right = Math.max(b, 0);
const left = Math.max(-b, 0);
```

Clamp each extent to the interval 0 through 10. For an ordinary scan, a
negative range therefore collapses that dimension; only CORNER interprets a
negative value as a direction. The inclusive rectangle bounds are:

```typescript
const verticalMin = Math.max(1, v - down);
const verticalMax = Math.min(75, v + up);
const horizontalMin = Math.max(1, h - left);
const horizontalMax = Math.min(75, h + right);
```

> **Reviewer note — default extent (C-014):** The candidate defaults are 10
> for SCAN and 7 for SRSCAN. Historically these are reduced according to
> terminal width. Width-independent defaults have not been approved. All
> explicit-range rules above are independent of that unresolved choice.

### Discovery and warning areas

Parameter validation completes before discovery or grid output. A noninteger
range token, an extra range, misplaced WARNING, or CORNER without exactly two
ranges emits `%Syntax error\n` and ends the scan without changing faction
knowledge. A decimal spelling such as `2.0` is not an integer range token.

Examples at position (20, 20):

| Operands | Result |
| --- | --- |
| `UP 2` | Vertical 20–22; horizontal 18–22 |
| `CORNER -2 3 WARNING` | Vertical 18–20; horizontal 20–23, with warning marks |
| `0` | Explicit one-sector rectangle at (20, 20), not a default-range request |
| `WARNING 2` or `2 WARNING 3` | Syntax error; WARNING is permitted only last |
| `CORNER 2` or `1 2 3` | Syntax error |
| `LEFT WARNING` | Directional default-range request; C-014 still determines its extent |

SCAN and SRSCAN interpret explicit operands identically. Their unresolved
default-range distinction is not an excuse to substitute a default for an
invalid or explicit zero range. A one-sector short-format scan still has the
separate narrow-label formatting issue noted below.

For every planet within Chebyshev distance 10 of the issuing ship, add the
ship's faction to `Planet.knownTo`. Do the same for each active enemy base
within distance 10, adding the faction to `Base.knownTo`. These discoveries
do not depend on the displayed rectangle, SCAN versus SRSCAN, or WARNING.
Previously known objects remain known.

If WARNING is present, consider each enemy-controlled planet and enemy base
within that same distance of 10. Its warning area is the square of sectors
within Chebyshev distance 2 of the planet or 4 of the base, intersected with
the display rectangle. Replace the empty-sector symbol in that area with `!`.
Do not replace a visible object's symbol or reveal a black hole with a warning
mark. Overlapping areas still produce one mark per sector. These marks belong
to this output only; they are not objects or changes to galaxy occupancy.

### Scan language

Use `PlayerPreferences.scanLength`, independently of message output length.
In long scans each sector occupies two characters. In short scans use only
the second character of the long symbol. Here `SP` denotes one space and `N`
the ship's single-letter roster initial; neither is literal output notation.

| Contents | Long symbol | Short symbol |
| --- | --- | --- |
| Empty sector | SP followed by `.` | `.` |
| Ship | SP followed by N | N |
| Federation base | `<>` | `>` |
| Empire base | `)(` | `(` |
| Romulan | `??` | `?` |
| Neutral planet | SP followed by `@` | `@` |
| Federation planet | `@F` | `F` |
| Empire planet | `@E` | `E` |
| Star | SP followed by `*` | `*` |
| Black hole | two SP | one SP |
| Warning in empty sector | SP followed by `!` | `!` |

Begin with a newline and a horizontal-label line. Display rows from
`verticalMax` down to `verticalMin`; within each row display sectors from
`horizontalMin` up to `horizontalMax`. Each row consists of its vertical
coordinate, one space, the concatenated sector symbols, one space, the same
vertical coordinate, and a newline. Coordinates occupy two characters,
right-aligned with a space instead of a leading zero. Repeat the horizontal
labels after the last row.

Each horizontal-label line starts with three spaces. In long scans, label
`horizontalMin`, then every second coordinate, separating the two-character
labels by two spaces. In short scans, start at `horizontalMin + 1`, then every
third coordinate, separating labels by one space. Stop after the last label
not greater than `horizontalMax`, and end with a newline.

### Interrupted output

An interruption detected during grid output takes effect after the current
row and its newline have been emitted. Stop before the next row and omit the
bottom horizontal-label line. If the last row has just been emitted, its bottom
labels are still omitted. The initial horizontal labels and all completed rows
remain visible. Discovery has already occurred and is not rolled back, including
discoveries outside the displayed rectangle. This interruption does not undo
the scan or create a completed turn.

For an empty long-format rectangle spanning vertical and horizontal coordinates
19 through 21, interruption after the first displayed row leaves exactly
`\n   19  21\n21  . . . 21\n`. Later rows and the repeated horizontal labels
are absent. Character-level handling of the interruption gesture remains in
the shared input contract; this rule defines the scan's row-output boundary.

### Discussion — one-column short labels

The historical label loop always emits its initial label, even when a one-column
short scan places it outside the displayed rectangle. At sector (20, 20), a
short `SCAN 0` showing Excalibur therefore produces:

```text
\n   21\n
20 E 20\n
   21\n
```

The displayed `\n` sequences denote output newlines; the code-block line breaks
add none. At horizontal coordinate 75, the corresponding label is 76, outside
the galaxy. The row still displays the actual selected sector; no extra sector
is scanned or discovered because of that label.

Two alternatives are to omit a label outside the rectangle, leaving only the
three-space label line and its newline, or to label the sole actual coordinate
in this special case. Both improve the label's relation to the grid but change
visible output. Neither alternative, nor retention of the historical exception,
has been adopted. The renderer continues to guard this case pending discussion.

> **Reviewer note — temporarily hidden ships (C-002):** Historical scan output
> can treat a temporary hidden-ship marker as empty, including for warning
> marks. The current pure model does not adopt that marker. Resolve the
> information-activity visibility question before specifying those cases.

Malformed range input emits `%Syntax error` followed by a newline, without
discoveries or a scan. The command does not request replacement ranges.

### Reading a scan

For this example, Excalibur is at (20, 20). A star is at (22, 18), a Federation
base at (21, 19), a neutral planet at (20, 22), and Wolf at (19, 21). All other
sectors in the displayed rectangle are empty. With long scan format, `SC 2`
produces the following grid after its initial newline:

```text
   18  20  22
22  * . . . . 22
21  .<> . . . 21
20  . . E . @ 20
19  . . . W . 19
18  . . . . . 18
   18  20  22
```

The horizontal axis increases left to right; the vertical axis increases
bottom to top. Each sector occupies exactly two characters, so `<>` is one
base, not two objects. `E` identifies Excalibur, `W` identifies Wolf, `*` is
the star, `@` is the neutral planet, and dots mark empty sectors. Labels appear
only on alternate columns, but the intermediate columns are present.

SCAN and SRSCAN use the same sector symbols and scan-format preference. Thus
`SR 2` produces this same grid. A black hole would appear as a blank sector,
not a dot; a blank is not evidence that a sector is safe. WARNING would change
eligible empty-sector dots to exclamation marks, without replacing objects.

The pictured rectangle is not the discovery boundary: this scan also records
planets and enemy bases within distance 10, including ones outside the grid.

*Examples:* Unless stated otherwise, the issuing ship is at (20, 20).

- `SC 2 3` displays vertical coordinates 18–22 and horizontal coordinates 17–23.
- `SR 2 3` displays the same rectangle and makes the same discoveries.
- `SC UP 2 3` displays vertical coordinates 20–22 and horizontal coordinates 17–23.
- `SC C -2 3` displays vertical coordinates 18–20 and horizontal coordinates 20–23.
- `SC -2 3` displays only vertical coordinate 20, with horizontal coordinates 17–23.
- `SC 50` clips each extent to 10 and displays coordinates 10–30 on both axes.
- At (1,75), `SC 50` displays vertical coordinates 1–11 and horizontal
  coordinates 65–75. Clipping at a galaxy edge does not expand the opposite
  side to preserve the requested number of rows or columns.
- `SC 0` displays only the issuing ship's sector but still discovers a planet
  at (30, 30); it does not discover one at (31, 20).
- `SC 2 W`, enemy planet at (23, 20), marks empty displayed sectors in its
  warning square even though the planet itself lies outside the rectangle.

## 7.10. Galaxy reports

These five commands share object selection, visibility, and report operations.
Their command-specific defaults are followed by the common rules. Section 4.9
defines `report-groups` and the selectors permitted by each command.

### LIST

```text
LIST [<selection-group> [AND <selection-group> ...]]
```

*Syntax:* LIST may abbreviate to `L`.

*Semantics:* Produce individual object reports. Without operands, select
ships, bases, planets, and the Romulan across the galaxy, subject to the
visibility rules below. This is not a promise of full information about every
selected object. Explicit SUMMARY adds summary output to LIST's individual
reports.

### SUMMARY

```text
SUMMARY [<selection-group> [AND <selection-group> ...]]
```

*Syntax:* SUMMARY may abbreviate to `SU`.

*Semantics:* Report object counts rather than individual details. Without
operands, count ships, bases, planets, and the present Romulan across the
galaxy, grouped by kind and faction. A whole-galaxy summary can count unknown
objects without revealing their positions.

### BASES

```text
BASES [<selection-group> [AND <selection-group> ...]]
```

*Syntax:* BASES may abbreviate to `BA`.

*Semantics:* Report bases. Without operands, select all of the issuing ship's
faction's active bases and request both individual reports and a summary.
Explicit LIST requests individual reports only; explicit SUMMARY requests
only the summary. Other factions require explicit selection.

### PLANETS

```text
PLANETS [<selection-group> [AND <selection-group> ...]]
```

*Syntax:* PLANETS may abbreviate to `PL`.

*Semantics:* Report planets. Without operands, select planets of every
allegiance within Chebyshev distance 10 and produce individual reports.
The default does not add a summary. SUMMARY changes the output to counts and,
without an explicit range, expands the selection range to the whole galaxy.

### TARGETS

```text
TARGETS [<selection-group> [AND <selection-group> ...]]
```

*Syntax:* TARGETS may abbreviate to `TA`. Its aggregate faction selection is
implicit; explicit vessel names and coordinates are separate selection forms.

*Semantics:* Without operands, individually report enemy ships, enemy bases,
enemy-controlled planets, and the present Romulan within Chebyshev distance 10.
Neutral planets are not selected by this default; PORTS changes that selection
as specified below. SUMMARY requests a combined target
count rather than separate faction/category count lines. Selection is not
authorization to fire a weapon: weapon commands perform their own checks.

### Parameters by command

The following table describes ordinary in-game groups. A permitted parameter
is not necessarily permitted alongside every other parameter in its column.
The group restrictions below and Section 4.9 govern combinations.

| Parameter | LIST | SUMMARY | BASES | PLANETS | TARGETS |
| --- | --- | --- | --- | --- | --- |
| Vessel names, including ROMULAN | Yes | No | No | No | Yes |
| Absolute coordinate pair | Yes | No | Yes | Yes | Yes |
| Positive integer range | Yes | Yes | Yes | Yes | Yes |
| SHIPS, BASES, PLANETS, PORTS | Yes | Yes | No | No | Yes |
| FRIENDLY, ENEMY, faction name | Yes | Yes | Yes | Yes | No |
| NEUTRAL, CAPTURED | Yes | Yes | No | Yes | No |
| ALL | Yes | Yes | Yes | Yes | Yes |
| CLOSEST | Yes | No | Yes | Yes | Yes |
| LIST output modifier | No | No | Yes | Yes | Yes |
| SUMMARY output modifier | Yes | No | Yes | Yes | Yes |

LIST starts with individual reports of all supported object kinds throughout
the galaxy. It is useful for named vessels and mixed selections. SUMMARY starts
with counts over that same scope, without individual positions or strengths.
BASES fixes the object kind to bases and starts with friendly bases throughout
the galaxy, producing both detail and counts. PLANETS fixes the kind to planets
but starts with all allegiances within distance 10 and produces detail only.
TARGETS starts with enemy objects within distance 10, including the Romulan;
it is an observation command, not a weapon-target authorization.

### Constructing a report group

An object selector sets the kinds examined; it does not request a second
report. To request different selections, separate groups with AND or `&`.
Each new group starts from the command's defaults. For example,
`LIST BASES FRIENDLY & PLANETS NEUTRAL` selects friendly bases in one group
and neutral planets in another. Do not write BASES PLANETS as two object
selectors in one group.

One integer specifies a positive Chebyshev radius centered on the issuing ship.
Two consecutive integers instead specify one absolute sector. Thus
`PLANETS 3` selects by radius, while `PLANETS 20 21` selects a position.
Coordinate selection cannot be combined with range, faction, ALL, CLOSEST,
or an output modifier. It is not a way to move the center of a radius query.

FRIENDLY means the issuing faction; ENEMY means the opposing faction and,
where the selected kind permits it, the Romulan. FEDERATION/HUMAN and
EMPIRE/KLINGON name factions. NEUTRAL restricts selection to unowned planets;
CAPTURED includes planets of either faction, not just friendly planets.
Neither NEUTRAL nor CAPTURED can accompany SHIPS or BASES.

> Discussion — faction names and Romulan selection (C-010): The historical
> FEDERATION/HUMAN and EMPIRE/KLINGON modifiers retain any existing Romulan
> selection. FRIENDLY explicitly removes it; ENEMY and TARGETS add it.
> Consequently `SUMMARY FEDERATION` can include a Romulan, while
> `SUMMARY FRIENDLY` for a Federation player does not. Selecting PLANETS or
> BASES excludes the Romulan by object kind. The ordinary meaning of a faction
> name suggests excluding the Romulan; preserving the historical interaction
> instead keeps modifier-dependent results. This distinction is recorded for
> discussion, not silently resolved by making the modifiers interchangeable.

PORTS normally selects bases and planets. When processed without a preceding
explicit allegiance selector, it replaces the current allegiance selection with
friendly and neutral. This also replaces TARGETS' implicit enemy selection.
It is a report category, not a promise that every selected object permits
docking: neutral planets do not.

ALL does not count as an explicit allegiance selector for this rule. Thus
PORTS and ALL are order-sensitive in LIST and SUMMARY. With a preceding
NEUTRAL selector, PORTS retains planet-only selection. With a preceding
CAPTURED selector, PORTS expands planet-only selection to bases and planets,
retaining both factions. The reverse orders, PORTS NEUTRAL and PORTS CAPTURED,
are rejected under Section 4.9's ordering restrictions.

For a Federation player, these aggregate groups have the following selections
before applying visibility:

| Invocation | Kinds and allegiances | Geographic scope |
| --- | --- | --- |
| `LIST PORTS ALL` | Bases of both factions; planets of every allegiance | Whole galaxy |
| `LIST ALL PORTS` | Federation bases; Federation and neutral planets | Whole galaxy |
| `SUMMARY NEUTRAL PORTS` | Neutral planets only | Whole galaxy |
| `SUMMARY CAPTURED PORTS` | Bases and planets of both factions | Whole galaxy |
| `TARGETS PORTS` | Federation bases; Federation and neutral planets | Distance 10 |
| `TARGETS PORTS ALL` | Same kinds and allegiances as TARGETS PORTS | Whole galaxy |

In TARGETS, ALL changes range but not allegiance, so ALL PORTS and PORTS ALL
have the same selection. An explicit numeric radius, when supplied legally,
still takes precedence over whole-galaxy range. TARGETS PORTS SUMMARY selects
no opposing objects and therefore produces no combined target count; it does
not count the friendly or neutral ports as enemies merely because the command
is named TARGETS.

ALL expands the geographic scope to the whole galaxy unless an explicit range
is present. It also expands faction selection unless a faction was explicitly
selected or the command is TARGETS. It does not remove an object-kind filter
or override visibility. Consequently, `BASES ALL` is not merely a verbose
form of BASES: it includes enemy bases, subject to discovery rules.

CLOSEST chooses one eligible object and excludes the issuing ship itself.
Without an explicit range it searches the whole galaxy, still subject to
visibility. With a range it searches only that radius. It cannot be combined
with LIST or SUMMARY output modifiers. Equal-distance selection remains C-004;
do not assume input order supplies a tie-break.

Use CLOSEST or CL to request nearest-object selection consistently in the four
commands that support it. The one-letter C follows each command's ordinary
lookup rules:

| Input | Meaning |
| --- | --- |
| `LIST C` or `TARGETS C` | Name Cobra |
| `PLANETS C` | Select captured planets |
| `BASES C` | Select the closest eligible base |

SUMMARY has no CLOSEST form. Abbreviation is not a separate global dictionary
in which C always denotes the same modifier.

An explicit SUMMARY modifier expands the range to the whole galaxy unless a
range is given. On LIST it adds counts to individual reports. On BASES,
PLANETS, and TARGETS it selects counts instead of detail. An explicit LIST
modifier on those three commands selects detail instead of their default
output mode. At most one explicit output modifier is accepted in a group;
BASES' default combined output does not imply that LIST SUMMARY is legal.

> Reviewer note — stateful acceptance: Section 4.9 specifies name-before-keyword
> resolution and remaining order-sensitive cases. These parameter descriptions
> do not imply commutative parsing. For example, `L E` names Excalibur rather
> than choosing enemies; `L EN` selects enemies. Use AND for separate groups,
> not as a way to combine conflicting modifiers in one group.

### Discussion — mixed named and aggregate selectors

These historical cases require review under C-010. They do not establish a
general rule that every accepted modifier filters every selection.

A complete group is scanned before that group's direct output is produced.
Consequently a syntax error later in a named group suppresses that whole
group's output. Direct output from an earlier, separate group remains; deferred
aggregate output is not emitted after the error.

For a Federation player, the selector branches have the following effects,
subject to the unresolved roster-name check below. Error locations identify
the offending input token; its spelling in the diagnostic remains subject to
Section 3's token-length discussion.

| Group in LIST | Result |
| --- | --- |
| `EXCALIBUR ENEMY` | Direct Excalibur report; ENEMY does not remove the explicitly named friendly ship |
| `ENEMY EXCALIBUR` | Syntax error at EXCALIBUR; no report from this group |
| `WOLF 1` | Direct Wolf report, even when Wolf is more than one sector away; ordinary sensor-detail limits still apply |
| `1 WOLF` | Syntax error at WOLF |
| `EXCALIBUR WOLF CLOSEST` | Both direct reports, in roster order; not a nearest-of-two selection |
| `CLOSEST EXCALIBUR` | Syntax error at EXCALIBUR |
| `EXCALIBUR SUMMARY` | Syntax error at SUMMARY; no Excalibur row first |
| `SHIPS EXCALIBUR` or `EXCALIBUR SHIPS` | Syntax error at the second selector |
| `SHIPS ROMULAN` | Direct Romulan report, not a report of all ships plus the Romulan |
| `ROMULAN SHIPS` | Syntax error at SHIPS |
| `20 21 ROMULAN` | Coordinate reporting takes precedence; it does not add a separate Romulan report |
| `ROMULAN 20 21` | Syntax error at 20 |
| `20 21 22 23` | Syntax error at 22; use separate groups for separate coordinates |

The Romulan-name branch is unusually permissive: it can follow selectors
that would reject a roster name. In a coordinate group it also changes the
selected kind to ships, so it is not necessarily a harmless suffix when the
coordinate contains a base or planet. That interaction is not an intended
new way to filter coordinate queries.

For example, with a visible Wolf five sectors away, `LIST WOLF 1` still reports
its position and shields; the radius does not suppress that named report.
The simpler input discipline would keep named lists, coordinate pairs and
aggregate selectors in separate groups. It would reject ignored or misleading
modifiers, but change acceptance of the forms above. Applying all modifiers
uniformly is another possible contract, with different results for ENEMY,
range and CLOSEST. Neither alternative is adopted here.

Repeated roster names need a separate decision. The source's duplicate test
uses `ship`, whereas the accumulated named selection is `ships`; it does not
reliably express a duplicate-name check. Repeated ROMULAN has an explicit
duplicate check. A well-defined reject-or-deduplicate rule for roster names
must not be claimed as established by that mismatched test.

### Selection and visible information

All five commands begin with a newline, consume no energy, complete no turn,
and add no readiness delay. A report can nevertheless change discovery state
as described below. The following rules describe ordinary in-game use; pre-game
availability and privileged visibility remain separate scope questions.

Each group begins with its command's defaults. Object selectors restrict the
kind of object. SHIPS includes the Romulan when its faction selection permits;
PORTS applies the order-sensitive kind and allegiance rules above.
FRIENDLY selects the issuing faction; ENEMY includes the opposing faction and
the Romulan where permitted. NEUTRAL and CAPTURED select planets of neither
faction or either faction, respectively, before any later PORTS expansion.

A single integer specifies a positive Chebyshev range from the issuing ship.
A coordinate pair specifies one absolute sector, not a relative displacement.
ALL expands the range to the whole galaxy unless a range was explicitly given;
it also expands faction selection unless a faction was explicitly selected or
the command is TARGETS. It does not cancel an object-kind restriction.

For ordinary aggregate individual reports, an object within distance 10 or
belonging to the issuing faction can be reported if it satisfies the requested
range and selectors. A more distant nonfriendly planet or base also requires
the issuing faction in its `knownTo` set. Whole-galaxy ship selection can reveal
a distant ship's presence, but not its current position or shield strength.
More distant nonfriendly ships are otherwise not discovered by choosing an
arbitrarily large numeric range.

Explicit ship names identify those ships independently of aggregate faction
filters. A present nonfriendly ship beyond distance 10 is reported as
`out of range`, not located. An absent named ship produces its display name
followed by ` is not in the game` and a newline. Named Romulan selection
distinguishes disabled Romulans from an enabled but absent Romulan.

CLOSEST chooses the eligible object with the smallest Chebyshev distance,
excluding the issuing ship from ship candidates. The requested range still
applies. It requests an individual report rather than a summary.

> **Reviewer note — ties and group combinations (C-004, C-010):** Historical
> equal-distance ties select the last visited eligible object. Base order is
> unresolved, so CLOSEST ties cannot yet have a complete abstract rule. Mixed
> name, coordinate, range, and faction groups also retain order-sensitive
> acceptance cases. Section 4's restrictions and these ordinary meanings do
> not settle all combinations.

### Visibility is distinct from selection

The following rules concern aggregate selection during ordinary play, not
privileged inspection or direct name/coordinate queries. An object must first
match the selected kind, faction, and requested range.

| Object relative to player | Individual information available |
| --- | --- |
| Friendly ship, any distance | Position and shield percentage |
| Nonfriendly ship within distance 10 | Position and shield percentage |
| Distant nonfriendly ship | Presence only in eligible whole-galaxy selection; no current position or shield percentage |
| Friendly base, any distance | Position and strength |
| Nonfriendly base within distance 10 | Position and strength |
| Distant previously discovered nonfriendly base | Position, but not current strength |
| Distant undiscovered nonfriendly base | No individual report |
| Friendly or nearby planet | Position, allegiance, and construction count |
| Distant previously discovered planet | Position, allegiance, and construction count |
| Distant undiscovered nonfriendly planet | No individual report |

Discovery applies to the planet or base, not to a remembered snapshot of its
properties. A known distant planet report therefore exposes its current
construction count; a known distant enemy base does not expose its current
strength. A larger numeric range does not increase the sensor-detail radius
of 10 or discover otherwise unknown objects.

A whole-galaxy summary can count an undiscovered base or planet while withholding
its individual report. A finite-range summary does not receive that exception.
Neither count-only result adds the object to the faction's discovery set.
Individual aggregate planet/base output does record discovery. Requesting
information can therefore change future visibility, even though it consumes
no turn.

“Whole galaxy” here denotes the query's scope, not merely a radius large
enough to contain every sector. An explicitly supplied radius remains a
specified-range query even when greater than 75. Thus `SUMMARY BASES 80`
can omit unknown distant bases that `SUMMARY BASES` counts. ALL does not
override an explicit numeric radius.

### Worked selections

Assume a Federation player at (20, 20), a friendly base at (40, 40), a known
enemy base at (35, 20), an unknown enemy base at (36, 20), and a neutral planet
at (22, 20). No other bases or planets exist. The following are semantic
results, not exact output transcripts:

| Input | Result |
| --- | --- |
| BASES | Friendly base at (40, 40), including strength; friendly summary |
| BASES 10 | No selected friendly base: the explicit range excludes it |
| BASES ALL LIST | Friendly base with strength and known enemy base without strength; unknown enemy base omitted |
| SUMMARY BASES | Counts one friendly and two enemy bases, without positions |
| SUMMARY BASES 20 | Counts the friendly and known enemy base; unknown distant enemy base omitted |
| PLANETS | Neutral planet at (22, 20), including its construction count |
| PLANETS FRIENDLY | No selected planet; neutral is not friendly |
| PLANETS CAPTURED | No selected planet; none belongs to either faction |
| PLANETS 1 | No selected planet: distance 2 exceeds the requested range |
| TARGETS | No selected target: enemy bases are beyond distance 10 and the planet is neutral |
| TARGETS ALL BASES | Known enemy base only; ALL does not reveal the unknown base |

An empty result is not necessarily evidence that no such object exists: it
may reflect allegiance, distance, or discovery restrictions.

For the same world, `SUMMARY BASES` in medium or long output produces three
leading newlines followed by these two lines, each ending in a newline:

```text
  1 Federation base in game
  2 Empire bases in game
```

The three leading newlines are the command's initial separator and the base
section's detail and summary separators; an empty detail portion does not
remove its separator. Neither enemy base is discovered by this summary.
`SUMMARY BASES 80` instead produces, with the same leading newlines:

```text
  1 Federation base in specified range
  1 known Empire base in specified range
```

The unknown enemy base remains omitted despite being within the numeric
radius. The `known` qualifier describes the category's knowledge-limited
selection, not a claim that every object examined was already known.

`BASES ALL LIST` in long output with absolute coordinates produces two leading
newlines, the following rows, and one additional newline after the last row:

```text
 Fed Base    @40-40   100.0%
*Emp Base    @35-20
```

Here both bases have strength 100. The friendly base's strength is visible
despite its distance; the known enemy base's strength is not. The undiscovered
enemy base has no row. Emitting the friendly base adds the Federation to its
discovery set; the omitted enemy base remains undiscovered. LIST suppresses
BASES' default summary, but not its trailing section separator.

Now give the nearby neutral planet a construction count of 2. Bare PLANETS,
with the same output preferences, produces two leading newlines, this row,
and one additional newline after it:

```text
 Neu planet  @22-20     2 builds
```

The planet is added to the Federation's discovery set. Its allegiance and
construction do not change. Unlike a summary-only request, this individual
report establishes knowledge that can permit a later distant report.

### Direct queries and diagnostic examples

#### Empty sectors, stars and black holes

Stars and black holes are not aggregate selection categories: bare LIST and
SUMMARY do not enumerate or count them. LIST can inspect their sectors by an
absolute coordinate pair. An empty sector is inspected in the same way. These
queries do not establish discovery state.

At distance greater than 10, each of these three coordinate cases emits
`Captain, our sensors can't scan as far as ` followed by the absolute position
in short form and a newline, after the command's initial newline. LIST's
whole-galaxy default does not extend this detail radius. At distance at most
10, BASES, PLANETS and TARGETS instead give their ordinary `No base`,
`No planet` or `No target` diagnostic. A star or black hole is not a target
in this report-category sense, even though weapon rules can affect encounters
with those objects.

> Discussion — LIST detail for these sectors (C-028): Historical nearby
> coordinate output names the actual content (`Empty Space`, `Star` or
> `Black Hole` in long output; `.`, `*` or `BH` otherwise), but then uses the
> Romulan detail branch. Depending on retained report context, it can append
> `out of range` or print the queried position followed by the Romulan energy
> value, with a percent suffix outside short output. This is not evidence that
> stars, black holes or empty space possess strength or energy properties.
> The simpler alternative reports only the actual name and position, using
> the ordinary row prefix, name padding and coordinate format. It removes an
> unrelated number and a context-dependent range diagnostic, changing visible
> output. Neither preservation nor correction is adopted. Disabled or absent
> Romulan play does not provide a defined substitute value for this purpose.

For a player at (20,20), `LIST 20 31` therefore produces
`\nCaptain, our sensors can't scan as far as 20-31\n` whether that sector is
empty, a star, or an enabled black hole. At (20,30), the corresponding LIST
row remains the discussion above. `TARGETS 20 30`, with absolute output,
instead produces `\nNo target @20-30\n` in all three cases, including short
output. With black holes disabled, no black-hole object exists to inspect;
the sector's actual contents determine the result.

A coordinate query inspects one absolute sector. It does not use the issuing
ship's preferred input-coordinate mode. SUMMARY has no coordinate form.
For an empty sector within distance 10, BASES, PLANETS, and TARGETS report
`No base `, `No planet `, or `No target ` respectively, followed by the
position and a newline. These messages use long position format, even when
general output is short: absolute output is `@vertical-horizontal`.

For example, with absolute output coordinates and an empty sector (20, 21)
adjacent to the player, the entire output of `PLANETS 20 21` is:

```text

No planet @20-21
```

When a coordinate query cannot reveal a distant object, it reports
`Captain, our sensors can't scan as far as ` followed by the absolute position
in short form (`vertical-horizontal`) and a newline. A coordinate query retains
the command's default range: whole galaxy for LIST and BASES, distance 10 for
PLANETS and TARGETS. Prior discovery can permit a distant base or planet report
only when that range also permits it. It does not reveal distant enemy ship
details. A coordinate operand does not itself expand the range.

For a Federation player at (20,20), with a known neutral planet at (35,21),
zero construction and long absolute-coordinate output, these complete outputs
differ:

| Input | Output, with newlines shown as `\n` |
| --- | --- |
| `LIST 35 21` | `\n Neu planet  @35-21\n` |
| `PLANETS 35 21` | `\nCaptain, our sensors can't scan as far as 35-21\n` |
| `BASES 35 21` | `\nNo base @35-21\n` |

The BASES form rejects a planet by kind before applying the sensor-range
check. Ships follow a different branch, as recorded in the discussion below.

> Reviewer note — coordinate exceptions (C-017): Direct-coordinate queries
> do not consistently enforce the command's object and faction filters.
> In particular, a nearby ship can be reported by BASES or PLANETS, and a
> friendly object can be reported by TARGETS. Do not infer aggregate filtering
> rules for these cases. Whether to preserve these exceptions remains open.

Direct queries do not perform the discovery update attached to aggregate
base/planet output. Thus a nearby planet queried by coordinate can be reported
without being added to the player's faction discovery set. A later aggregate
planet report or scan can establish that discovery.

CLOSEST also emits its selected object through the direct-query operation,
not through the final aggregate report. It therefore does not establish
planet or base discovery. Its search excludes the issuing ship and distant
nonfriendly ships, including the Romulan; whole-galaxy search does not relax
that visibility restriction. A known distant enemy base or planet can be the
closest eligible object when the requested range permits it.

For example, if the nearest known enemy base is at distance 15 and an unknown
enemy base is at distance 12, BASES ENEMY CLOSEST selects the known base.
Adding a range of 10 leaves no eligible base; it does not fall back to a more
distant candidate. Equal-distance choices remain the C-004 discussion and
are not resolved by imposing a new order on bases.

Named-vessel queries report each selected vessel in roster order, not input
order, with a separately selected Romulan before roster vessels. An absent
roster vessel is reported as its display name followed by
` is not in the game\n`. An enabled but absent Romulan produces
`The Romulan is dead\n`; disabled Romulan play uses the option report instead.
The disabled-option text is `Romulans are NOT in this game.\n` at every
output length.
Named queries have their own leading newline in addition to the command's
initial newline. Distant enemy vessels may be identified but reported only as
`out of range`, without position or shield information.

For example, with Farragut absent and Wolf at distance greater than 10,
`LIST WOLF FARRAGUT` in long output produces two leading newlines and then:

```text
Farragut is not in the game
*Wolf        out of range
```

The roster determines this order even though Wolf was named first. Each line
ends with a newline. Neither the absent vessel nor the distant vessel gains
a reported position; no discovery changes occur.

Malformed report groups do not prompt for replacement input. An empty group
after a separator reports `Null group illegal\n`. An unavailable keyword
reports `Illegal keyword ` followed by that token and a newline. A conflicting
recognized modifier reports `Syntax error near keyword ` followed by the token
and a newline. Out-of-galaxy coordinates report `Illegal coordinate ` followed
by the absolute short-format position and a newline. Lexical normalization of
the echoed token follows Section 3.

An earlier direct query may already have produced output when a later group
fails. Such output is retained; it is not replaced by an atomic whole-command
error. Previously accumulated aggregate results are not printed after the
parser aborts. Report requests therefore need both input-order error cases and
successful selection cases in conformance tests.

A well-formed group selecting no reportable objects is different from an
empty group after AND or a malformed group. It emits its no-objects diagnostic
and continues to the next group. It does not discard successful earlier
selections. For example, in the worked world above, `BASES 10 AND ALL`
first finds no friendly base within 10, then processes ALL normally; the
first group's empty result does not prevent the later base reports.

#### No-results diagnostics

An empty aggregate group emits one line assembled in this order:
prefix, optional ` known`, allegiance, object category, geographic suffix,
newline. The prefix is `Captain, there are no` in long output and `No`
otherwise. Short output omits the geographic suffix, but retains `known`
and allegiance. These are group diagnostics, not zero-valued summary rows.

The allegiance text is ` neutral`, ` Federation` or ` Empire` for exactly
that selection; ` captured` for planets of both factions; and empty otherwise.
A selection including the Romulan but excluding neutral planets instead uses
` enemy`. The category text is ` ships`, ` bases`, ` planets`, ` ports`
(bases and planets), or ` forces` (ships, bases and planets).

Use ` known` when the requested radius exceeds 10, the scope is not whole
galaxy, and the allegiance selection is not exactly the issuing faction.
Also use it if an examined nonfriendly candidate lies beyond distance 10 and
the requested radius exceeds 10, including a whole-galaxy query. Thus `known`
describes limits on the query, not a claim that a known object was found.

For medium and long output, the suffix is ` in game` for whole-galaxy scope,
` in specified range` for an explicit numeric radius, and ` in range` for a
default local radius. There is one special case: if no candidate of the
selected kind and allegiance was examined at all, use ` in game` even with
an explicit radius. CLOSEST excludes the issuing ship before this test.
The absence of matching candidates is therefore distinguishable from matching
objects excluded by distance or visibility. No diagnostic discovers an object.

For a Federation player at (20,20), these complete medium-output examples
include the command's initial newline:

| World and input | Output |
| --- | --- |
| No bases; `BASES 1` | `\nNo Federation bases in game\n` |
| Friendly base at (22,20); `BASES 1` | `\nNo Federation bases in specified range\n` |
| Only planet is unknown and neutral at (35,20); `PLANETS` | `\nNo planets in range\n` |
| Same planet; `PLANETS 20` | `\nNo known planets in specified range\n` |
| No planets; `PLANETS 20` | `\nNo known planets in game\n` |

In long output, replace `No` with `Captain, there are no`. In short output,
retain `No` and omit the geographic suffix. The final example still says
`known`: that qualifier was established by the query's scope and allegiance,
not by finding a planet.

### Mixed-group output sequence

Consider Excalibur at (20,20), a friendly base of strength 100 at (40,40), and
an undiscovered neutral planet with zero construction at (22,20). Use long
output and absolute coordinates. The input
`LIST BASES FRIENDLY AND 22 20` produces the following sequence:

1. Emit the command's initial newline.
2. Select the friendly base without reporting or discovering it yet.
3. Emit ` Neu planet  @22-20\n` for the coordinate group. This does not
   discover the planet.
4. Emit the deferred base section:
   `\n Fed Base    @40-40   100.0%\n\n`, and discover the friendly base.

Group order is therefore not necessarily row order: a later direct query can
appear before an earlier aggregate selection. The full escaped output is
`\n Neu planet  @22-20\n\n Fed Base    @40-40   100.0%\n\n`.

With `LIST 22 20 AND BASES FRIENDLY AND ZZZ`, the full output instead is
`\n Neu planet  @22-20\nIllegal keyword ZZZ\n`. The direct planet row remains,
but no aggregate base row is emitted and neither object is discovered.
Selection alone does not perform the output-time discovery update.

For comparison, `BASES 10 AND LIST` emits
`\nCaptain, there are no Federation bases in specified range\n`, followed by
`\n Fed Base    @40-40   100.0%\n\n`. The first group is valid but empty;
it does not abort the second group or its discovery update.

Replacing the coordinate group in the first example with PLANETS CLOSEST
gives `LIST BASES FRIENDLY AND PLANETS CLOSEST`. With the neutral planet as
the unique nearest eligible planet, the output and discovery effects are
identical: its row appears before the deferred base row, and only the base
is discovered. CLOSEST does not add a summary or an acknowledgement.

If Excalibur is the only commissioned Federation ship,
`LIST SHIPS FRIENDLY CLOSEST` in long output gives
`\nCaptain, there are no Federation ships in game\n`. The diagnostic describes
eligible candidates after excluding the issuing ship; it does not assert that
Excalibur is absent. Adding SUMMARY to that group instead produces
`\nSyntax error near keyword SUMMARY\n`, because CLOSEST and an explicit
output modifier cannot occur together.

### Individual report contents

Section 10 defines object names, numeric fields, position formatting, and
individual row layout. Those definitions apply to all five report commands;
they are distinct from scan symbols. The visibility rules here determine
which fields are present before that formatting is applied.

An individual report identifies the object and supplies the following details:

- Friendly ships, and nonfriendly ships within distance 10: position and
  signed shield percentage. More distant nonfriendly ships: `out of range`.
- The Romulan within distance 10: position and its energy value, with the
  historical percent suffix defined in Section 10.4.
  Beyond distance 10: `out of range`.
- Bases: position; defensive strength only when friendly or within distance 10.
- Planets: position and nonzero construction count. Omit a zero construction
  count. Long output adds ` build` for one and ` builds` for greater counts;
  medium output adds ` b`; short output adds no unit label.

Prefix a nonfriendly, nonneutral object with `*`, except in TARGETS, where
enemy marking is redundant and the prefix is a space. Other rows also begin
with a space. Coordinate and numeric rendering use the player's preferences
and the shared output rules, not scan symbols.

Aggregate individual reports occur in this order: Romulan, ships in roster
order, Federation bases, Empire bases, then planets in their array order.
Base order remains C-004. For a planet or base individually emitted through
this aggregate report, add the issuing faction to its `knownTo` set. A summary
alone does not discover the objects counted.

### Combining groups and summary output

Aggregate groups accumulate selections before the final report. For each
selected object, detail and summary inclusion are independent: an object
selected for detail by one group and summary by another receives both.
Repeated selection does not repeat its aggregate row or count it twice in
the same ship, base or planet category. Direct name and coordinate reports are emitted separately;
they are not deduplicated against the final aggregate report.

> Discussion — repeated Romulan summary selection (C-010): The historical
> separate Romulan summary counts successful selections across groups, rather
> than distinct Romulans. With one present Romulan, `SUMMARY SHIPS AND SHIPS`
> can report `2 Romulans`, although the galaxy has only one. TARGETS' combined
> count includes that Romulan only once. Counting one in both places would
> make summaries consistent with the galaxy model but change displayed output.
> This exception remains open for discussion; the ordinary deduplication rule
> does not settle the separate Romulan line.

Summary lines give a count and object-kind/faction label, pluralized unless the
count is one. Omit zero-count summary lines. Medium and long output append the
applicable qualifier ` in range`, ` in specified range`, or ` in game`.
An out-of-range knowledge-limited selection may add ` known` after the count.
The count occupies a right-aligned three-character field. One space separates
the count (and optional ` known`) from the label. The labels are `Romulan`,
`Federation ship`, `Empire ship`, `Federation base`, `Empire base`,
`neutral planet`, `Federation planet`, and `Empire planet`. Each emitted
line ends with a newline.

Each aggregate group's scope is `in specified range` when it supplies a
numeric radius; otherwise it is `in game` when its radius exceeds 75, and
`in range` otherwise. Category qualifiers accumulate across groups, including
candidates examined but excluded from the final selection. When several scopes
contribute, `in game` takes precedence over `in specified range`, which takes
precedence over `in range`. The ` known` marker is retained when any
contributing category qualifier requires it; it is not recomputed from the
objects ultimately printed.

For example, suppose an Empire base is adjacent to the Federation player and
another, undiscovered Empire base is 40 sectors away. `SUMMARY BASES ENEMY 20`
counts only the adjacent base, but its line is
`  1 known Empire base in specified range\n`. The distant base contributes
the category's `known` qualifier even though it is outside the requested
radius and contributes no count. A category qualifier is therefore accumulated
while examining candidates, not inferred from the final selected objects.

Ship summaries follow ship detail, Federation before Empire; base summaries
follow base detail in the same faction order. Planet summaries follow planet
detail, neutral before Federation before Empire. Counts are separate for each
category. A Romulan summary follows its detail before the ship section.

TARGETS suppresses the separate ship, base, and planet summary lines. Instead,
its final `target` line counts summary-selected opposing ships, opposing bases,
opposing planets, and the Romulan once each. Friendly or neutral objects do not
contribute even if a parameter combination selected them. A summary-selected
Romulan still receives its separate `Romulan` line as well as contributing to
the final target count. No summary-selected targets means no final target line.

For a complete example, suppose a Federation player has one nearby enemy ship,
two distant enemy bases (one known, one unknown), one nearby Romulan, and no
enemy-controlled planets. `TARGETS SUMMARY` counts four targets: the ship,
both bases and the Romulan. SUMMARY gives this query whole-galaxy scope, so
the unknown base is counted without discovery or a position report. Friendly
bases and neutral planets do not contribute.

In long output the complete escaped text is
`\n\n  1 Romulan in game\n\n\n\n  4 targets in game\n`.
The separate Romulan line does not add a fifth target. The intervening blank
lines include separators for the selected ship and base categories, even
though TARGETS suppresses their individual category-summary lines. No
discovery state changes in this summary-only example.

For example, two Federation bases with whole-game scope produce
`  2 Federation bases in game` followed by a newline in medium or long output.
The short form is `  2 Federation bases` followed by a newline.

Each category has its own summary count; counts do not carry from ships into
bases or planets. Section 10.9 defines the complete report assembly, including
blank separators for selected categories without detail rows. The examples
above define retention of direct output and suppression of deferred aggregate
output after a later error. Do not infer all-or-nothing buffering from the
grammar.

> **Reviewer note — remaining report choices:** Ordinary group ordering,
> empty-selection diagnostics, qualifier accumulation and field spacing are
> defined here and in Section 10. The unresolved cases are base order and
> equal-distance ties (C-004); mixed direct/aggregate operands, faction-name
> Romulan inclusion and repeated Romulan summaries (C-010); coordinate-filter
> exceptions (C-017); and nearby empty/star/black-hole LIST output (C-028).
> Shared spelling, numeric precision and interruption choices also apply.
> These cases prevent a final contract; they do not leave all report formatting
> unspecified.

*Examples:* Assume the issuing ship belongs to the Federation.

- `BA` requests individual friendly-base reports and their summary.
- `PL 3` reports planets within distance 3, irrespective of allegiance.
- `TA` does not select neutral planets; it does select a present Romulan
  within distance 10.
- `L W`, Wolf farther than 10 sectors away, can report its presence as
  `out of range` without revealing its position.
- A whole-galaxy SUMMARY can count an undiscovered enemy base without adding
  the Federation to that base's `knownTo` set.

## 7.11. SHIELDS

```text
SHIELDS [UP | DOWN]
SHIELDS TRANSFER [<energy>]
```

*Syntax:* SHIELDS may abbreviate to SH. UP and DOWN select shield mode.
TRANSFER specifies ship energy to deposit in the shields; a negative amount
requests a withdrawal. An omitted action or amount requests prompted input.

*Semantics:* The command changes the issuing ship's shields or redistributes
its energy. It begins with a newline and does not complete a turn. Raising
shields costs energy even when they are already up. Lowering them is free.
Neither action changes shield strength or repairs shield-device damage.

### Prompted input

An absent or unrecognized action produces `Transfer, Up, Down  ? `, without
a newline. The response supplies a `shield-action`; an empty response cancels,
and an unrecognized action repeats the prompt. TRANSFER without an integer
amount produces `Units of energy to transfer to shields: `, without a newline.
A response whose first token is not an integer cancels that transfer.

The action response may include its transfer amount: `TRANSFER 100` selects
the action and supplies the amount together. After the amount prompt, however,
the response must start with the integer itself. `TRANSFER 100` at that prompt
cancels rather than restarting action selection. Similarly, UP at an amount
prompt cancels; it does not raise shields. A noninteger amount supplied with
the action requests replacement input, whereas a noninteger response to the
amount prompt ends the operation. These are different input states.

Each prompt can consume the next slash-separated segment; the prompt is still
emitted. `SHIELDS/TRANSFER/100` therefore selects TRANSFER at the action prompt
and supplies 100 at the amount prompt. It is not three ordinary commands.
The initial newline is emitted once. No cancellation message is added when
an empty action response or a noninteger amount response ends the operation.

For a ship with energy 1000 and shield strength zero, the following interactions
all terminate without changing the ship. Input echo is excluded. Let `A` denote
the exact action prompt above, `E` the amount prompt, and `C` the confirmation
prompt defined below; these labels are not emitted text.

| Initial input | Responses | Ordered output after the initial newline |
| --- | --- | --- |
| `SH` | Empty | A |
| `SH` | `ZZZ`, then empty | A, A |
| `SH TRANSFER` | `TRANSFER 100` | E |
| `SH TRANSFER 100.0` | Empty | E |
| `SH` | `TRANSFER 1000`, then `NO` | A, C, `Energy NOT transferred.\n` |
| `SH TRANSFER` | `1000`, then empty | E, C, `Energy NOT transferred.\n` |

Only the confirmation refusal has the transfer-refusal notice. An empty
amount response never reaches confirmation, even when transferring all energy
would otherwise require it. These cases do not depend on the unsettled
arithmetic of an accepted transfer.

> Discussion — trailing tokens (C-010): The observed action and amount paths
> inspect only the action and its first amount, or the first token of a prompted
> amount response. Extra tokens are ignored rather than interpreted as another
> action or advance confirmation. For example, `SH TRANSFER 1000 NO` still
> requests confirmation; NO in that segment is not its response. Strict rejection
> of such suffixes would change acceptance and remains unresolved.

### Raising and lowering

UP checks `ship.deviceDamage.SHIELDS` first. If it exceeds 300 damage units,
the command produces `Captain, unable to raise shields due to critical damage.\n`
and changes nothing. Damage equal to 300 does not fail this check.

Otherwise, UP performs the following actions in order:

1. Set `ship.shields.mode` to `"UP"`.
2. Set `ship.energy` to `Math.max(ship.energy - 100, 0)`.
3. Produce `Shields raised, Captain.\n`.
4. Release any tractor link using the release operation in Section 7.3.
5. If `ship.energy` is zero, produce
   `\nShield control uses remaining ship energy!\n`.

UP does not itself change `ship.condition`. DOWN sets `ship.shields.mode` to
`"DOWN"` and produces `Shields lowered, Captain.\n`. It does not check damage,
consume energy, or release a tractor link.

For example, suppose Excalibur has 80 energy units, shield-device damage 300,
lowered shields, and a tractor link to Farragut. SHIELDS UP raises Excalibur's
shields, reduces its energy to zero, and clears both ships' tractor links.
Its complete immediate output is
`\nShields raised, Captain.\n\nShield control uses remaining ship energy!\n`.
The link-release notices for both players are created after the success line
and before the exhaustion warning; their later display is a separate event.
Farragut spends no energy. Neither ship moves, and Excalibur's retained shield
strength, device damage, alert condition and stardate do not change.

The zero-energy result is handled by the subsequent fatal-state check in
Section 9.3; SHIELDS does not itself release the commission or insert a final
score report into this immediate output. At shield-device damage 300.1, the
same UP request instead fails before spending energy or releasing the tractor.

### Transferring energy

One percentage point of shield strength corresponds to 25 energy units.
Before confirmation, limit a requested deposit to the remaining shield
capacity. For requested amount `amount`, current energy `energy`, and shield
percentage `strength`, the preliminary amount is:

```typescript
const deposit = Math.min(amount, 25 * (100 - strength));
```

If `deposit >= energy`, produce
`Transferring all ship energy to shields.  Confirm? ` without a newline.
Only a YES response continues. Any other response produces
`Energy NOT transferred.\n` and leaves the ship unchanged.

For an accepted transfer, limit withdrawals by both available shield energy
and the ship's 5000-unit energy capacity. A zero transfer is accepted and still
produces the success report. The resulting shield percentage cannot exceed
100. If it is zero, lower the shields. Set the ship's condition to YELLOW
when its resulting energy is below 1000, and GREEN otherwise. Produce
`Energy transferred, Captain.\n`.

> Reviewer note — transfer arithmetic (C-015): The conversion and capacity
> bounds above do not yet define the final arithmetic. Historical transfers
> truncate the shield change toward zero to tenths of a percentage point while
> charging the unrounded energy amount. Confirmation also permits a deposit
> exceeding available energy. Exact conversion and available-energy clamping
> would change these behaviors; neither change is adopted here. Transfer
> cases affected by rounding or overdraw are not conformance-ready.

### Discussion — shield-transfer arithmetic

The following makes the historical quantization choice explicit in game units
for review; it is not an adopted replacement for the open C-015 rule. Let `e`
be the ship's energy, `s` its shield percentage, and `r` the requested energy
transfer. Positive transfers deposit energy; negative transfers withdraw it.

First compute `a = Math.min(r, 25 * (100 - s))` and request confirmation when
`a >= e`. If confirmation is declined, stop without changing state. Otherwise:

```typescript
a = Math.max(a, -25 * s);  // Limit withdrawal to shield reserves.
a = Math.max(a, e - 5000); // Limit receipt to ship energy capacity.
const shieldChange = Math.trunc(10 * a / 25) / 10;
const resultingStrength = s + shieldChange;
const resultingEnergy = e - a;
```

The truncation is toward zero and applies to the **change** in shield strength,
in tenths of a percentage point. It does not round the energy debit or credit
to the energy represented by that shield change. This distinction affects
withdrawals as well as deposits:

| Initial energy | Initial shield percentage | Request | Confirmation | Resulting energy | Resulting shield percentage |
| --- | --- | --- | --- | --- | --- |
| 1000 | 50 | 1 | None | 999 | 50 |
| 1000 | 50 | -1 | None | 1001 | 50 |
| 1000 | 50 | 250 | None | 750 | 60 |
| 4900 | 50 | -200 | None | 5000 | 46 |
| 1000 | 99 | 1000 | None; capacity reduces transfer to 25 | 975 | 100 |
| 100 | 50 | 200 | YES | -100 | 58 |

In particular, a one-unit withdrawal can increase ship energy without reducing
shield strength. Repeating it can increase energy up to the ship's capacity,
provided sufficient shield reserves remain for each withdrawal. This is an
observable resource-creation case, not just a difference in printed precision.
An exact conversion `shieldChange = a / 25` would instead reduce strength by
0.04 percentage points for that withdrawal. Charging only for a quantized
shield change would be a different alternative again. These alternatives
must not be conflated with the separate decision whether to cap a confirmed
deposit at available ship energy.

### Completion and examples

> Reviewer note — exhaustion and readiness: SHIELDS bypasses turn completion;
> automatic turn repair and life-support decrement do not follow merely from
> this command. Its interaction with subsequent exhaustion processing and
> pending tractor notifications still requires the shared execution rules.

*Examples:* Each output begins with the command's initial newline. These are
immediate command effects, before any independently triggered processing.

- With 500 energy, shields already up, and shield damage 0, `SH UP` leaves
  400 energy and reports `Shields raised, Captain.\n`.
- With 80 energy, no tractor link, and shield damage 0, `SH UP` leaves zero
  energy and reports success followed by the exhaustion message above.
- With shield damage 301, `SH UP` reports critical damage and preserves energy
  and shield mode. At damage 300, it instead raises shields and charges energy.
- `SH DOWN` lowers shields even when the shield device is critically damaged.
- With 1000 energy and shield strength 50, `SH TRANSFER 250` leaves 750 energy,
  strength 60, and condition YELLOW; it reports successful transfer. This
  example requires neither rounding nor overdraw.

## 7.12. ENERGY

```text
ENERGY [<ship-name> <energy>]
```

*Syntax:* ENERGY may abbreviate to E. Its operands name a roster ship
and specify an integer energy amount. The semantic checks below reject the
issuing ship and nonpositive amounts. Omitting either operand requests
both together. The name resolves in roster order; ROMULAN is not a recipient.

*Semantics:* ENERGY transfers energy to an adjacent friendly ship, with a
transfer loss and a recipient capacity of 5000 energy units. It begins with a
newline and completes no turn. Neither ship needs lowered shields or an active
tractor link. Docking and device damage do not restrict this operation.

### Input and validation

If the input does not supply a word followed by an integer, produce
`Destination ship name and energy to transfer: ` in long output, or
`Ship, energy: ` in medium and short output. Neither prompt ends with a
newline. The response supplies both operands. An empty response cancels;
another incomplete response repeats the prompt.

Each retry replaces both operands. The command does not retain a ship name
from an earlier segment while waiting for an amount. A decimal token such as
`100.0` fails this input-shape test even though its numeric value is integral.
Name lookup begins only after a word/integer pair is present. A complete pair
that fails semantic validation ends the command instead of prompting again.

ENERGY may obtain the replacement pair from a following slash segment:
`ENERGY/FARRAGUT 100` supplies it in the same submitted line. The prompt is
still produced. This is not QUIT's fresh-input confirmation rule. The initial
command newline is emitted once, not once per retry. Echo and segment-reading
line separation are distinct from the command's own prompt text.

For a word and integer, perform these checks in order. The first failure
produces the indicated text followed by a newline and ends the command without
changing either ship's energy:

1. Resolve the word to a roster name; otherwise, `Unknown ship name.`
2. Reject the issuing ship itself: `Transfer energy to US!?!` In long output,
   prefix this with `Beg your pardon, Captain?  ` on the same line.
3. Require the recipient to be commissioned; otherwise, `Player not in game.`
4. Require the same faction; otherwise, `Can not transfer energy to enemy ship.`
5. Require Chebyshev distance at most 1; otherwise,
   `Not adjacent to destination ship.`
6. Require the requested amount to be strictly less than the sender's energy.
   Failure produces `Captain, our ship doesn't possess that much energy!` in
   long output, or `Insufficient ship energy.` otherwise.
7. Require the amount to be greater than zero; otherwise, `Transfer aborted.`
   In long output, prefix this with `Illegal energy transfer.  `.

The reserve check uses the requested amount, before accounting for transfer
loss or recipient capacity. It is not a confirmation prompt. In particular,
requesting all remaining energy fails even when the recipient cannot accept
that much.

Presence is checked before faction here, unlike TRACTOR. Consequently an
absent enemy recipient produces `Player not in game.`, not the enemy-transfer
diagnostic. An unknown name or self-target also wins over an invalid amount:
`ENERGY EXCALIBUR -1`, issued by Excalibur, reports the self-transfer error.

### Input-dialogue examples

Suppose Excalibur is issuing the command, Farragut is commissioned and adjacent,
and Excalibur has more than 100 energy.

| Initial operands | Subsequent responses, in order | Result before transfer arithmetic |
| --- | --- | --- |
| None | `FARRAGUT 100` | One prompt, then a validated transfer request |
| `FARRAGUT` | `100`, then `FARRAGUT 100` | Two prompts; the number-only response does not complete the earlier name |
| `FARRAGUT 100.0` | Empty response | One prompt, then cancellation; neither ship changes |
| None | `ZZZ 100` | One prompt, then `Unknown ship name.\n`; no further retry |
| `ZZZ 100.0` | Empty response | Cancellation after a prompt; no unknown-name diagnostic |

These are immediate dialogue outcomes, not full transfer or notice-delivery
transcripts. Cancellation and validation failure neither consume a turn nor
produce a recipient notice. They do not change the sender's alert condition.

> Discussion — trailing operands (C-010): The observed input path uses the
> first word/integer pair and ignores later tokens in that segment. Thus
> `ENERGY FARRAGUT 100 NO` reaches the same transfer validation as the ordinary
> form; NO is not a confirmation response. Strictly rejecting the extra token
> would change acceptance. The companion records the observed behavior for
> review, not a settled trailing-input policy. Later slash segments are distinct
> from trailing tokens in the current segment.

### Transfer amounts

The recipient receives at most 90 percent of the requested amount and never
exceeds 5000 energy units. The sender is charged for the amount actually
delivered plus its transfer loss, not necessarily the full requested amount.
A full recipient therefore accepts zero, costs the sender zero, and still
causes a successful transfer report and notification.

> Reviewer note — precision: The intended ratio is nine delivered units to
> ten expended units. The evidence truncates the delivered amount to tenths
> and separately truncates the surcharge to tenths. Exact real-number
> conversion would differ at small amounts and capacity boundaries. These
> rounding rules and their relationship to C-015 require review before the
> transfer arithmetic is a complete abstract rule. No unmentioned rounding
> convention is implied by the TypeScript number type.

### Discussion — inter-ship transfer arithmetic

For review, the tenths-based interpretation can be written without machine
representations. After the validation above, let `r` be the positive integer
request and `e` the recipient's current energy:

```typescript
const delivered = Math.min(Math.trunc(10 * (9 * r / 10)) / 10, 5000 - e);
const loss = Math.trunc(10 * delivered / 9) / 10;
const senderDebit = delivered + loss;
```

Both truncations are toward zero. Add `delivered` to the recipient and subtract
`senderDebit` from the sender. The capacity limit applies before calculating
loss. These equations describe the quantization alternative under discussion;
they do not claim equivalence to every historical floating-point evaluation
or settle the specification's precision choice.

For request 100 and sender energy 1000, capacity-limited cases are:

| Recipient's initial energy | Delivered | Loss | Sender debit |
| --- | --- | --- | --- |
| 2000 | 90 | 10 | 100 |
| 4999 | 1 | 0.1 | 1.1 |
| 4999.1 | 0.9 | 0.1 | 1 |
| 4999.2 | 0.8 | 0 | 0.8 |
| 5000 | 0 | 0 | 0 |

Thus truncating the loss can make a small capacity-limited transfer lossless.
The exact-ratio alternative would charge `10 * delivered / 9`, which generally
requires finer precision. Neither alternative changes the prior strict reserve
check against the original request, or the recipient notice's use of the
delivered amount rather than the sender's debit. A final choice remains open.

### Transfer result and notification

The command changes only the two ships' energy values; it does not update their
alert conditions, shield modes, or docking status. It then produces
`Energy transferred, Captain.\n` for the sender and creates a notification for
the recipient identifying the sender, recipient, and delivered amount.
The recipient's energy changes immediately, not when the notification is read.

This is a game notification, not a subspace radio message. Radio disablement,
radio-device damage and gagging the sender do not suppress it. Delivery uses
the recipient's output length at delivery time; changing that preference after
the transfer changes the notice's presentation, not the amount transferred.

For a delivered amount `d`, the notification templates are:

| Output length | Notification |
| --- | --- |
| Long | `\n{sender}  transfers {d} units of energy to the  {recipient} \n` |
| Medium and short | `{sender} {d} > {recipient} \n` |

Names follow Section 10.1. Format `d` with no minimum field width, one decimal
place in medium and long output, and no fractional part in short output.
The long form has two spaces before `transfers` and two before the recipient's
name. Every form has one space after the recipient's name, before the newline.

> Reviewer note — notification contract: The templates define text for a
> delivered amount representable in tenths. Section 9.5 defines ordinary
> delivery points and context; combat ordering and capacity loss remain C-023;
> transfer arithmetic remains under review above. Input suffix handling
> remains under C-010.

*Examples:* Assume commissioned adjacent friendly ships, sender energy 1000,
and recipient energy 2000, unless stated otherwise.

- A request for 100 transfers 90, leaving 900 and 2090 respectively. The
  sender receives `\nEnergy transferred, Captain.\n`; the recipient is notified
  of 90 delivered units.
- A request for 1000 fails the reserve check without changing either energy.
- A request for 0 produces `Transfer aborted.\n` after the initial newline
  in medium output; neither ship changes.
- With the recipient already at 5000, a request for 100 succeeds with zero
  delivered and no energy expenditure.
- An enemy recipient at distance 2 fails the faction check, not adjacency.

### Transfer followed by delivery

Suppose Excalibur has energy 1000, is docked and under RED, and issues
`ENERGY FARRAGUT 100` in short output. Farragut is commissioned at an adjacent
sector with energy 2000. Farragut has radio disabled, radio-device damage 400,
and Excalibur in its gagged-ship set.

The command leaves Excalibur at 900 energy and Farragut at 2090, then emits
`\nEnergy transferred, Captain.\n` for Excalibur. Excalibur remains docked and
under RED. Neither ship's other properties change; in particular, no turn,
automatic repair or score commitment occurs. Only Farragut is a recipient of
the transfer notification.

If Farragut selects long output before delivery, the notice is
`\nExcalibur  transfers 90.0 units of energy to the  Farragut \n`.
Delivery removes Farragut's pending copy and does not add energy again. Its
radio settings neither prevent the transfer nor suppress this notice.

With Farragut initially at 5000 instead, the same request leaves both energy
values unchanged. The sender receives the same success text, and Farragut's
long notice reports `0.0` rather than `90.0`. Both cases have the same result
under the two arithmetic alternatives above; they do not settle fractional
capacity boundaries or delivery ordering among several pending notifications.

## 7.13. REPAIR

```text
REPAIR [<amount> | ALL] [DAMAGE [<device> ...]]
```

*Syntax:* REPAIR may abbreviate to RE. The integer specifies damage units to
remove from each device. ALL requests enough repair to restore every device.
DAMAGE appends the device report defined in Section 7.6; its selectors choose
what is reported, not what is repaired. Missing operands do not prompt.

> Discussion — unmatched operands (C-010): The observed command consumes a
> leading integer amount or ALL when present; otherwise it keeps the default.
> It then looks for DAMAGE at the next operand position. An unmatched operand
> does not itself reject the command. Thus `REPAIR SH` and `REPAIR ZZZ` apply
> default repair to every device without a report or diagnostic. `REPAIR 10.0`
> also uses the default, not ten units, because its amount is not an integer
> token. Rejecting these malformed forms before repair would change state and
> potentially turn completion. No such change is adopted. These are recovery
> cases, not extra valid grammar forms; selectors after DAMAGE control only
> the report. A bad appended selector does not undo immediate repair. Negative
> amounts and the undamaged-ALL exception remain separate discussions.

*Semantics:* REPAIR reduces device damage, but does not repair hull damage,
replenish energy, restore shield strength, or reset life-support reserve.
The default amount is 50 damage units while undocked and 100 while docked.
An explicit nonnegative amount replaces that default. ALL selects the largest
current device-damage value. Limit the amount to that largest value, then
subtract it from every device, with a floor of zero for each device.

For a nonnegative requested amount, the immediate repair is:

```typescript
function repairDevices(ship: Ship, requested: Damage): void {
  const damages = Object.values(ship.deviceDamage);
  const amount = Math.min(requested, Math.max(...damages));
  for (const device of Object.keys(ship.deviceDamage) as Device[]) {
    ship.deviceDamage[device] = Math.max(ship.deviceDamage[device] - amount, 0);
  }
}
```

The operation emits no repair acknowledgement. An appended DAMAGE report is
produced after the immediate repair, before any turn-completion repair.
The report uses the same output length, device selection and all-functional
shortcut as DAMAGES. Repair does not change docking, alert condition, shield
mode, radio settings, tractor linkage, or scores.

> Reviewer note — ALL on an undamaged ship (C-010): The historical operation
> skips an appended DAMAGE report in `REPAIR ALL DAMAGE` when every device is
> already undamaged. `REPAIR DAMAGE` and `REPAIR 0 DAMAGE` instead report
> `\nAll devices functional.\n`. Consistent reporting would remove this
> state-dependent exception; that choice remains unresolved. The ordinary
> report rule above excludes this case pending review.

> Reviewer note — completion and readiness: The historical command completes
> a turn only when its computed repair delay has not already elapsed after
> reporting. That makes report duration affect turn consumption. A completed
> repair turn also performs the usual 30-unit automatic device repair.
> Section 9.1 discusses retaining that test versus making completion depend
> on positive repair performed, with an example of the resulting state
> difference. The choice is deferred under C-016, not resolved in favor of
> presentation independence. A zero repair amount and an undamaged ship do
> not require a repair delay.

> Reviewer note — negative amounts (C-016): The grammar admits signed integers.
> The historical operation increases every device's damage for a negative
> amount if any device is damaged, including devices previously undamaged.
> The nonnegative algorithm above does not define that case; neither rejection
> nor preservation of this behavior has been adopted.

*Examples:* These states are immediately after repair, before turn completion.

- Undocked, with shield damage 80 and engine damage 20, bare REPAIR leaves
  those values at 30 and 0. All other devices also receive up to 50 repair.
- With those same damages, REPAIR ALL leaves every device undamaged.
- REPAIR 10 DAMAGE SH repairs every device by up to 10, then reports only
  shield-device damage. It does not focus the repair on shields.
- REPAIR 0 leaves all damage unchanged.
- With shield-device damage 80 and life-support damage 340, `REPAIR 10 DAMAGE
  SH` in short output produces `\nSH    70\n`. Life-support damage becomes
  330 even though it is not reported. No turn-completion repair is included
  in these values.

## 7.14. DOCK

```text
DOCK [STATUS [<field> ...]]
```

*Syntax:* DOCK may abbreviate to DO. STATUS appends the report defined in
Section 7.7, optionally restricted to its named fields. DOCK takes no port
operand and does not prompt for one.

*Semantics:* DOCK replenishes and services the issuing ship using all friendly
bases and controlled planets at Chebyshev distance at most 1. An adjacent base
contributes two service units; an adjacent friendly planet contributes one.
Enemy bases, enemy planets, and neutral planets contribute nothing. A planet's
construction count and a base's positive strength do not change its contribution.

If the service total is zero, produce a newline, the ship's display name, and
` not adjacent to base!!\n`. No ship properties change and no turn completes.
The diagnostic says “base” even though friendly planets also permit docking.

Otherwise, for service total `units`, apply these immediate changes:

```typescript
function replenishAtDock(ship: Ship, units: number): void {
  const alreadyDocked = ship.docked;
  ship.torpedoes = Math.min(ship.torpedoes + 5 * units, 10);
  ship.energy = Math.min(ship.energy + 500 * units, 5000);
  ship.shields.strength = Math.min(ship.shields.strength + 10 * units, 100);
  ship.hullDamage = Math.max(
    ship.hullDamage - 50 * units * (alreadyDocked ? 2 : 1), 0);
  ship.docked = true;
  ship.lifeSupportReserve = 5;
  ship.condition = "GREEN";
}
```

Produce `\nDOCKED.\n`, then any appended STATUS report. Successful docking
completes one turn, including the ordinary automatic device repair and
life-support check. STATUS observes the replenishment before that completion.
Docking does not raise or lower shields, release a tractor link, or directly
repair devices. Its automatic repair is the ordinary 30-unit turn repair,
not the 100-unit default of an explicit REPAIR while docked.

Repeated DOCK commands are allowed. A ship already docked receives twice the
hull repair of a newly docking ship, while other replenishment rates remain
unchanged. Docking does not consume the supplying objects or reduce their
strength or construction count. No particular port becomes a ship property.

> Reviewer note — readiness and shared completion: The successful command's
> historical delay depends on a terminal-speed quantity. A pure duration and
> interrupted readiness remain unresolved. Section 9.1 defines the ordinary
> ordered completion, including when world activity is due.
> Failure-name formatting uses the shared output rules. These dependencies
> do not alter the immediate replenishment equations above.

*Examples:* Before subsequent turn completion:

- Adjacent to one friendly planet, an undocked ship gains up to 5 torpedoes,
  500 energy, and 10 shield percentage points, and loses up to 50 hull damage.
- Adjacent to one friendly base and one friendly planet, the service total
  is 3: gains are capped at 10 torpedoes, 5000 energy, and 100 shield strength;
  an undocked ship loses up to 150 hull damage.
- Already docked with that same service total, a ship loses up to 300 hull
  damage. Its life-support reserve is reset to 5 again.
- Only an adjacent neutral planet is insufficient: docking fails without
  changing resources or completing a turn.
- With radio-device damage 310 and reception enabled, `DO STATUS RADIO`
  reports `damaged`. The subsequent 30-unit automatic repair reduces that
  damage to 280; a later STATUS RADIO reports `On` if no intervening effect
  changes the device or switch. The appended report is not delayed until
  automatic repair has completed.

### Docking through turn completion

Consider an undocked Excalibur adjacent only to one friendly planet. It begins
at stardate 10 with 4000 energy, 400 hull damage, one torpedo, lowered shields
at 85%, radio damage 310, life-support damage 400 and reserve 0. Radio reception
is enabled. The command is `DO STATUS CONDITION ENERGY DAMAGE RADIO`.

Excalibur and Wolf are the only commissioned ships, and no destroyed ship is
awaiting release. `Galaxy.worldActivityProgress` is zero. No independent event
occurs during the scenario. Completion advances that counter to one, below
the two-player threshold, so it does not trigger world activity. This follows
the cadence in Section 9.1; docking does not generally suppress world activity.

| Checkpoint | Result |
| --- | --- |
| Immediate service | Energy 4500; hull damage 350; six torpedoes; shields remain DOWN at 95%; docked, GREEN, reserve 5 |
| Appended STATUS | Reports Docked+Green, energy 4500, hull damage 350, and radio `damaged`; stardate is still 10 |
| Automatic device repair | Radio damage falls to 280 and life-support damage to 370; hull damage is not repaired again |
| World-activity trigger | Progress becomes 1; no world cycle is due |
| Turn accounting | Stardate becomes 11; faction completed-turn count increases by one |
| Life-support check | Damage is still critical, but docking prevents a reserve decrement; reserve remains 5 |
| Score commitment | Any pending awards transfer to the ship and faction totals; DOCK itself creates no new award |

The immediate short output is
`\nDOCKED.\n\nD+G E4500 D350 Rdamaged \n`. A later short STATUS with the same
selected fields, after this completion, emits
`\nD+G E4500 D350 ROn \n`. The earlier report is not revised when the radio
becomes functional. Normal prompt style also produces the life-support warning
defined in Section 9.1 because life support remains critical, even though its
reserve did not decrease; the two strings here are the report outputs, not the
entire command-acquisition transcript.

### Docking when world activity is due

Use the preceding ship values, place Excalibur at (20,20), its supplying
Federation planet at (20,21), and Wolf at (60,60). Add one Empire base at
(19,20) with strength 50. There are no other ports, stars, or black holes;
Romulans are disabled. Neither ship has a tractor link. Set
`Galaxy.worldActivityProgress` to 1, so this two-player completion triggers
a cycle and resets the counter to zero. There are no independent intervening
events. Both random samples for the base's phaser attack are zero: critical
selection first, then attenuation.

Service and appended STATUS are unchanged: the enemy base supplies nothing.
Automatic repair still precedes the world cycle. The cycle then proceeds as
follows:

| Phase | Result |
| --- | --- |
| Base defense | The Empire base attacks Excalibur at distance 1 with power 100. Lowered shields admit `8 * 100 * 0.9 = 720` damage. The critical test is `720 * 0.1 < 170`, so hull damage becomes 1070 and energy becomes 3780. Condition becomes RED; docking and lowered shield strength 95 remain unchanged. |
| Attack scoring | Empire receives 720 committed ENEMY_DAMAGE points; no player receives a pending award. Excalibur survives. |
| Planetary defense | The Federation planet is skipped because the triggering player belongs to the Federation. |
| Base restoration | One unreleased Federation player gives the Empire base 2.5 percentage points; its strength becomes 52.5. |
| Romulan activity | Disabled; no appearance or attack. |
| Remaining completion | Excalibur reaches stardate 11. Critical life support does not consume reserve while docked, so reserve remains 5. Pending score commitment follows normally. |

The appended STATUS remains the earlier Docked+Green report. A later short
STATUS of the same fields instead emits `\nD+R E3780 D1070 ROn \n`.
The base hit also creates the notification defined in Sections 8.1 and 10.7;
only Excalibur is in its recipient range in this scenario. Delivery is separate
from both STATUS reports. Docking therefore neither protects the ship from
the completion's attacks nor postpones those attacks until the next turn.

## 7.15. CAPTURE

```text
CAPTURE [ABSOLUTE | RELATIVE] <vertical> <horizontal>
CAPTURE COMPUTED <vessel-name>
```

*Syntax:* CAPTURE may abbreviate to C. Its destination and prompted coordinate
input use the shared rules in Section 4. The destination identifies a sector,
not a planet name. Omission or a coordinate modifier alone requests input.

*Semantics:* CAPTURE takes control of an adjacent neutral or enemy planet.
The planet retaliates during the capture; ownership changes even if the
capturing ship does not survive. Shield mode, docking, and device damage do
not impose additional eligibility checks.

After resolving the destination, check adjacency first (Chebyshev distance at
most 1), then that the sector contains a planet, then that the planet is not
already friendly. Failure completes no turn and changes no ownership.
For an out-of-range destination, output a newline, the issuing ship's display
name, one space, and `not adjacent to planet.\n`. For an adjacent nonplanet,
emit the corresponding diagnostic at every output length:

| Contents | Diagnostic |
| --- | --- |
| Empty | `\nNo planet at those coordinates, Captain.\n` |
| Friendly ship or base | `\nBut Captain, he's already on our side!\n` |
| Enemy ship or base | `\nCaptain, the enemy refuses our surrender ultimatum!\n` |
| Romulan | `\nCaptain, the Romulan refuses to surrender!\n` |
| Star or black hole | `\nCapture THAT??  You have GOT to be kidding!!\n` |

For an already friendly planet, medium and short output is
`\nPlanet already captured, Captain.\n`. Long Federation output is
`\nCaptain, are you feeling well?\nWe are orbiting a FEDERATION planet!\n`.
Long Empire output is
`\nMESSAGE FROM PLANET:  Veer off you idiot!\nWe are ALREADY part of the Klingon Empire!\n`.

Let `builds` be the planet's construction count before capture. Deduct
`50 * builds` energy from the ship, without a reserve check; set the planet's
construction count to zero and allegiance to the issuing ship's faction.
Its position and discovery set remain unchanged.

The planet then retaliates with phaser power `50 + 30 * builds`, using its
pre-capture allegiance for attribution. This attack is not prevented by the
new friendly allegiance. It occurs even for an unfortified neutral planet.
The capture award is recorded after the attack; death does not undo capture.
The command completes a turn, subject to the shared destruction rules.

After retaliation, add 100 points to
`ship.pendingScore.PLANET_CAPTURE`, including when the attack is fatal.
The award does not immediately change committed ship or faction scores;
the completion operation transfers pending awards.

If the planet previously belonged to a faction, add the retaliation's hull
damage award directly to that faction's `ENEMY_DAMAGE` score. If retaliation
leaves the ship destroyed, also add 500 to that faction's `ENEMY_KILLS` score.
A formerly neutral planet produces no faction damage or kill award. These
awards are distinct from the capturing ship's pending capture award.

Retaliation is still evaluated if the construction-energy charge has already
reduced the ship's energy to zero or below. There is no intervening energy
check that cancels capture or skips the attack.

The capture announcement is `\n{ship} capturing {planet} {position}\n`.
Use the planet's **former** allegiance for its name, Section 10.1's display
names, and Section 10.3's width-zero position format in the player's preferences.
Then create the retaliation hit notice. Its recipients are unreleased ships
of the capturing faction within Chebyshev distance ten of the capturing ship,
plus unreleased ships of either faction within distance four of that ship.
Use the eligibility rule in Section 10.5. Radio settings do not filter this
combat notice. There is no additional ten-sector audience of the former owner
around the planet.

After recording the capture award, a fatal result also emits the following
faction-specific text, at every output length:

- Federation: `\n\nScience Officer:  Captain, that was a MOST illogical tactic.\n`
- Empire: `\n\nFirst Officer:  Commander, because of your incompetence\nwe must suffer the shame of DEFEAT!!\n`

Follow it with the ship's display name, one space, and
`DESTROYED during capture of planet!!\n`. This is command output, not the
pending hit notice; final reporting and release follow the execution rules.

Historical capture
readiness starts from five seconds plus one second per prior construction
stage, with prompted-input time included in elapsed time.

> Reviewer note — execution/output: Resolve prompt-time accounting under
> C-007/C-010. Retaliation precision and pending hit delivery retain shared
> dependencies. A fatal capture still follows the completion path in Section
> 9.1, including automatic repair and capture-score commitment before the
> ordinary acquisition fatal check and final report. Historical lock-failure
> text is not made an abstract random
> refusal to surrender. The immediate announcement and recipient set above
> do not establish the complete fatal-capture transaction.

*Examples:*

- Capturing an enemy planet with construction 3 costs 150 ship energy, clears
  construction, changes allegiance, and triggers retaliation at power 140.
- Capturing a neutral planet with construction 0 costs no construction energy,
  but still triggers retaliation at power 50.
- Targeting a friendly planet rejects the command without retaliation.

### Capture through turn completion

Excalibur occupies (20,20); an unfortified neutral planet occupies (20,21).
There are no other commissioned ships, bases or planets, and Romulan activity
is disabled. Excalibur is undocked, has lowered shields of strength 100, zero
hull damage, 80 radio-device damage and no other device damage. Its stardate
is 1, life-support reserve is 5, and all its committed and pending scores are
zero. Federation completed turns is 1 and its scores are zero. World-activity
progress is zero. No outside event intervenes.

For `CAPTURE ABSOLUTE 20 21`, stipulate phaser samples zero for both the
critical test and attenuation, in that draw order. Initial damage is
`8 * 50 * 0.9 = 360`; `360 * (0 + 0.1) < 170`, so the hit is noncritical.
The two columns differ only in Excalibur's initial energy:

| Checkpoint | Initial energy 1000 | Initial energy 300 |
| --- | --- | --- |
| Ownership change | Planet becomes Federation; construction remains 0 | Same |
| Construction charge | Zero | Zero |
| Retaliation | Energy 640, hull damage 360, alert RED | Energy -60, hull damage 360, alert RED; ship destroyed |
| Immediate capture award | Pending `PLANET_CAPTURE` becomes 100 | Same, despite destruction |
| Automatic repair | Radio-device damage becomes 50 | Same |
| World activity | Progress reaches 1, triggers one cycle and resets to 0; no targets are eligible | Same; the destroyed commission still counts until release |
| Completion | Stardate 2, Federation completed turns 2, reserve 5 | Same |
| Score commitment | Ship and Federation each gain 100 capture points; pending capture becomes 0 | Same |

Lowered shield strength stays 100; the hit does not replenish or consume
torpedoes. Planet discovery is unchanged. There is no former-owner faction
to receive retaliation points. During the world cycle the now-friendly planet
does not retaliate a second time; no enemy base or Romulan can attack.

With medium, absolute output, the immediate announcement in both cases is
`\nE capturing  @ @20-21\n`. Create the retaliation notice after that
announcement. In the fatal column, the faction-specific fatal-tactic text and
`E DESTROYED during capture of planet!!\n` follow notice creation and precede
automatic repair. Creation is not delivery: the pending hit is presented at
ordinary acquisition, before the readiness wait and fatal check. The fatal
column then reports `E RUNS OUT OF ENERGY!!\n` and final points before release;
its final committed capture score is 100, not zero. Exact final POINTS output
for the unpopulated Empire still depends on the zero-denominator discussion.
The surviving column instead continues to the normal prompt rules.

### Discussion — capture and the former owner's docking (C-021)

Suppose Wolf is docked beside the Empire planet being captured, with no other
adjacent Empire port. Excalibur captures that planet for the Federation.
The historical support check runs before ownership changes, so the planet
still qualifies as Wolf's support and Wolf remains docked. The proposed
post-change check instead leaves Wolf undocked and RED. Neither alternative
reverses the capture or prevents retaliation against Excalibur.

This difference is not merely a display detail. At Wolf's later completion,
critical life support can consume reserve only under the undocked alternative;
its later REPAIR default and ammunition expenditure while firing also differ.
The capture's own retaliation and capture award are defined above, but a full
transition must include this effect on other ships. The choice remains open;
do not implement post-change undocking merely because the planet has changed
allegiance.

## 7.16. BUILD

```text
BUILD [ABSOLUTE | RELATIVE] <vertical> <horizontal>
BUILD COMPUTED <vessel-name>
```

*Syntax:* BUILD may abbreviate to BU. Its destination and prompted input use
the same shared coordinate rules as CAPTURE.

*Semantics:* BUILD increases a friendly planet's construction by one stage.
The fifth stage replaces the planet with a friendly base at the same position.
It consumes no ship energy or torpedoes and has no shield, docking, or device
eligibility check.

After destination resolution, apply these checks in order:

1. Require Chebyshev distance at most 1. Otherwise, output the ship's display
   name, one space, and `not adjacent to planet.\n`.
2. Require a planet at the destination. Otherwise, output
   `\nNo planet at those coordinates, Captain.\n`.
3. Require friendly allegiance. Otherwise, output
   `\nPlanet not yet captured.` without a terminating newline.
4. If construction is 4, require fewer than ten active friendly bases.
   Otherwise reject without increasing construction or awarding points. Emit
   `\nAll {base}s still functional, captain.\n`, where `{base}` is the faction's
   base name in the player's output length (Section 10.1).

Rejections complete no turn. The ten-base limit does not prevent stages 1–4.
For those stages, increase construction and output the new count followed by
` build`, an `s` if the count exceeds one, and a newline.

For stage 5, remove the planet and create a base with the same position and
discovery set, the issuing faction, and strength 100. Do not emit a `5 builds`
line. Preserve the relative order of the remaining planets. No continuing
planet object or association is retained.

For example, a Federation planet at (20,21), at construction 4 and known to
both factions, becomes a Federation base at (20,21), strength 100 and still
known to both factions. It has no construction property. Conversion neither
hides it from the Empire nor automatically changes what the Empire can see:
a distant enemy report can locate the known base but cannot reveal its current
strength. The former planet's construction count is no longer reportable.

Eligibility precedes all of those changes. A nonadjacent empty sector yields
the adjacency error, not the no-planet error. An adjacent neutral stage-4 planet
yields the allegiance error even when ten friendly bases already exist. A
friendly stage-2 planet may advance to 3 at that same base count. Rejection
does not alter discovery, construction, pending awards, or any ship property.

The conversion announcement is
`\n{ship} builds planet {position} into a {base}\n`. Names follow Section 10.1;
the position uses Section 10.3 with width zero and the player's coordinate and
output preferences. There is no separate success announcement for stages 1–4,
nor a common initial newline for all BUILD outcomes: those stages emit just
their count line. The new base's enumeration position remains C-004.

For new construction stage `stage`, add `50 * stage` points to
`ship.pendingScore.BASE_CONSTRUCTION`. Stage 5 adds a further 250 points for
conversion. The awards for successive stages are therefore 50, 100, 150, 200,
and 500 points. Completing all five stages earns 1000 points in total, divided
among the ships that perform them. A ship need not have performed an earlier
stage to earn the full award for its own stage.

A successful BUILD completes a turn, including normal automatic device repair
and pending-score commitment. A failed eligibility check awards no points.

The conversion is a single BUILD transition for game semantics. Planet removal
does not finalize the game in the middle of that transition. The new base is
installed as part of the replacement, then the ending predicate is evaluated
and any terminal outcome is latched. Conversion output and normal turn
completion follow, including score commitment. Only then does the player
receive the ending report and release. Later completion effects cannot change
the latched result.

> Reviewer note — source ordering: The historical implementation invokes
> ENDGAM from planet removal before the later base-installation statements.
> Austin Core adopts replacement followed by latching, completion and final
> reporting as specified above. The historical early exit is not adopted.

> Reviewer note — readiness and contention: Historical readiness depends on
> terminal speed and prompt duration. Neither a host-speed quantity nor a
> lock-contention failure is imported into the abstract command. Define a pure
> readiness duration and simultaneous-capture/build ordering in the execution
> chapter; do not reproduce partial increments left by failed historical locks.

*Examples:*

- BUILD on an adjacent friendly planet at construction 2 changes it to 3 and
  outputs `3 builds\n`, before shared turn-completion effects.
- At construction 4 with nine friendly bases, BUILD replaces the planet with
  a tenth friendly base at strength 100.
- At construction 4 with ten friendly bases, BUILD fails without conversion.
- At construction 2 with ten friendly bases, BUILD may still advance to 3.

### Fifth-stage construction through completion

Excalibur at (20,20) and Wolf at (60,60) are the only unreleased players.
Both are undocked. There are no bases. A Federation planet at (20,21) has
construction 4 and is known to both factions; a neutral planet at (40,40)
also remains in the galaxy. Romulans are disabled. Excalibur has energy 2000,
hull damage 100, lowered shields at 80%, three torpedoes, radio-device damage
80, no other device damage, reserve 5 and condition GREEN. Its stardate is 5;
Federation completed turns is 5. All pending scores are zero; both Excalibur
and Federation have 500 committed BASE_CONSTRUCTION points. World-activity
progress is zero. No independent event intervenes.

Excalibur issues `BUILD ABSOLUTE 20 21` with short absolute output.

| Checkpoint | Result |
| --- | --- |
| Eligibility | Adjacent friendly stage-4 planet; the base limit permits conversion |
| Conversion | Remove that planet; create one Federation base at (20,21), strength 100, known to both factions; retain the neutral planet unchanged |
| Award | Pending BASE_CONSTRUCTION increases by 500, not 250 or 1000 |
| Command output | `\nE builds planet 20-21 into a <>\n`; no `5 builds` line |
| Automatic repair | Radio-device damage becomes 50; hull damage remains 100 |
| World-activity trigger | Progress becomes 1, below the two-player threshold; no world cycle runs |
| Turn and life support | Stardate and Federation completed turns become 6; reserve remains 5 |
| Score commitment | Excalibur and Federation BASE_CONSTRUCTION totals become 1000; pending construction becomes zero |

Energy, shield mode and strength, torpedoes, docking, and condition retain
their initial values. BUILD does not dock Excalibur at the new base or provide
DOCK's replenishment. It creates no separate conversion notification for Wolf.
The command has a readiness obligation, whose duration remains C-007; the
table does not select a delay or describe the subsequent prompt transcript.

This example also fixes the final-planet case: if the neutral planet were
absent and Empire had no bases, the completed conversion would latch Federation
victory at replacement, before normal BUILD completion effects. It
would not latch mutual destruction.

### Discussion — final-planet conversion (C-022)

Remove the neutral planet from the preceding initial state and give Empire no
bases. BUILD replaces the planet with the Federation base and latches Federation
victory. It then emits the conversion announcement and performs normal turn
completion before reporting the ending. Final reporting uses
committed scores; the new 500-point award is committed by the completed turn
before any final report for that player.

## 7.17. RADIO

```text
RADIO [ON | OFF]
RADIO GAG [<ship-name>]
RADIO UNGAG [<ship-name>]
```

*Syntax:* RADIO may abbreviate to RA. ON and OFF control reception of subspace
messages; GAG and UNGAG control reception from one named roster ship. Omitted
operands prompt. In the action position, O selects ON; OF selects OFF.

*Semantics:* RADIO changes the issuing ship's `radio` properties. It completes
no turn, consumes no energy, and does not repair radio-device damage. Damage
does not prevent changing these settings. A sender may be gagged even when it
is not commissioned or belongs to the opposing faction.

The command first emits a newline. If no recognized action is supplied, emit
`Turn radio ON or OFF, GAG or UNGAG individual ship?  ` without a newline.
An empty response cancels. A nonempty action response emits a newline before
action processing; an unrecognized action repeats the prompt.

ON sets `ship.radio.enabled` to true and emits
`Radio turned on, Captain.\n`. OFF sets it to false and emits
`Radio turned off, Captain.\n`. Repeating either action still produces its
acknowledgement. Neither action clears `ship.radio.gaggedShips`.

For GAG or UNGAG without a word operand, emit `Ship name:  ` without a newline.
An empty response cancels. A non-word response repeats this name prompt; a
word that does not resolve to a roster ship produces `Unknown ship name.\n`
and ends the command. ROMULAN is not a roster ship for this operation.

The issuing ship's own name ends the command silently, without changing the
gag set. Otherwise, GAG adds the resolved name to `ship.radio.gaggedShips`;
UNGAG removes it. Emit `Radio gagged against ` or `Radio ungagged against `,
the selected ship's display name, and a newline. These acknowledgements also
occur when the requested membership already holds. No notification is sent
to the gagged or ungagged ship.

Radio enablement, the gag set, and device damage are independent. ON does not
override gagging or make a damaged receiver operational. Gagging does not
prevent the issuing ship from transmitting to that vessel. These preferences
apply to subspace communication, not to scan output or combat reports.

Section 7.18 distinguishes recipient selection from delivery. OFF does not
delete pending messages, and ON does not recover discarded ones. A pending
player message can still be discarded when its sender is gagged before
delivery. Display names in RADIO acknowledgements follow Section 10.1.

### Action and name responses

An action response can supply the name as well: `GAG WOLF` selects both without
a name prompt. Once the name prompt is reached, however, the action is fixed.
Responding `OFF` there attempts to identify a ship named OFF and produces
`Unknown ship name.\n`; it does not disable reception. An empty name response
cancels the pending GAG or UNGAG without changing either radio property.
This differs from TELL, which enables reception before requesting recipients.

Both RADIO prompts accept the next available slash segment. `RA/GAG/WOLF`
therefore emits the action prompt, a newline after its GAG response, the name
prompt, and the gag acknowledgement. The name response itself adds no leading
newline. In short or medium output, the exact command output is:

```text
\nTurn radio ON or OFF, GAG or UNGAG individual ship?  \nShip name:  Radio gagged against W\n
```

No additional acknowledgement is sent to Wolf. `RA/GAG`, followed by an empty
name response, emits the same prefix through `Ship name:  ` and returns without
changing reception or gag membership.

### Discussion — trailing input (C-010)

The observed command selects ON or OFF without examining later tokens. For GAG
or UNGAG it uses the next word as the name, or requests a name if that token
is not a word. A prompted name uses only the first response token. Consequently:

| Input | Observed result |
| --- | --- |
| `RA OFF GAG WOLF` | Disable reception; do not change gagging |
| `RA GAG WOLF OFF` | Gag Wolf; do not change reception |
| `RA GAG 1 WOLF` | Request a name; the later WOLF does not repair the numeric operand |
| `RA GAG`, then `WOLF OFF` | Gag Wolf; ignore OFF |
| `RA GAG`, then `OFF WOLF` | Unknown ship name; do not use the later WOLF |

Strict whole-segment rejection would change these outcomes. This suffix policy
remains unresolved; the companion deliberately guards these cases rather than
silently adopting them. Ordinary prompting and cancellation above are separate
from that choice.

> Reviewer note — remaining interaction: Input interruption and concurrent
> changes still require completion. Section 9.5 supplies ordinary delivery points
> and release discards; the action/name dialogue is not a substitute for those
> shared rules or their remaining ordering decisions.

*Examples:*

- `RA OF` emits `\nRadio turned off, Captain.\n` and preserves the gag set.
- `RA O` enables reception even if radio-device damage remains critical.
- Excalibur's `RA GAG WOLF` adds Wolf to Excalibur's gag set without requiring
  Wolf to be in the game or notifying Wolf.
- Excalibur's `RA GAG EXCALIBUR` emits only the initial newline and changes
  nothing.
- `RA UNGAG WOLF` leaves other gagged ships unchanged.

## 7.18. TELL

```text
TELL [<recipient> ... [; <message>]]
```

*Syntax:* TELL may abbreviate to TE. Recipients are roster ships or groups.
The first semicolon starts the message; all subsequent characters belong to
the message, including spaces, commas, semicolons, and slashes. Without a
semicolon, the command requests a separate message line. TELL ends a chained
command line: a slash in its message does not introduce another command.

*Semantics:* TELL creates one message for a set of eligible recipients. It
consumes no energy and completes no turn. Recipient problems are diagnosed
individually; they do not prevent sending to other eligible recipients.

### Sender and recipient selection

First require `ship.deviceDamage.RADIO < 300`. Failure produces
`\nSub-Space radio damaged.\n` and changes nothing. Otherwise set
`ship.radio.enabled` to true, even if subsequent input is cancelled or no
message is sent.

When recipients are omitted, prompt with `\nTo ship:  ` without a terminating
newline. An empty response cancels. Process recipient words in input order,
trying a roster name before group names. A group prefix must identify exactly
one group. FRIENDLY and ENEMY refer to the issuing and opposing faction;
ALL includes both. Expand groups to commissioned ships; union the selections
so repeated names do not cause repeated delivery. ROMULAN is recognized but
adds no player recipient.

The recipient prompt is issued at most once. Its response contains recipients,
not another command name, and may end with `;` followed by inline message text.
For example, responding `W;hold` selects Wolf and supplies `hold` without a
`Msg: ` prompt. Responding `W` selects Wolf and then requests the message.
Recipient errors do not restart this dialogue: process the rest of the
recipient list, validate the resulting selection, and either collect text or
report that no message was sent. An empty recipient response returns without
the no-message notice or a message prompt. Reception remains enabled.

An unrecognized word produces `\nUnrecognized player or group name:  `,
the word, and a newline. An ambiguous group produces
`\nAmbiguous group name:  `, the word, and a newline. Continue with subsequent
words in either case. Explicitly naming oneself produces
`\nSelf excluded from message.\n`; final recipient selection excludes the
sender whether selected by name or group.

Check selected ships in roster order. Radio damage of at least 300 excludes
the ship first. Otherwise, an uncommissioned ship is excluded with
`\nPlayer is not in the game:  `, its display name, and a newline. A damaged
radio or disabled reception excludes a ship with
`\nCommunications:  Captain, we cannot raise the `, its display name, and a
newline. The damage check precedes the availability check. Group expansion
already excludes uncommissioned ships, so directly naming an absent ship can
produce a diagnostic that selecting its group does not.

Remove the surviving recipients from the sender's `radio.gaggedShips`. This
allows their replies; it does not remove the sender from their gag sets. If
no recipients remain, produce `\nNo message sent.\n` without requesting text.

### Message text and delivery

If text was not supplied after a semicolon, prompt with `Msg: ` without a
newline and read one message line. The earlier enablement and ungagging changes
are not rolled back when message input is cancelled. A successful message
records the sender, selected recipient set, text, and those recipients still
awaiting delivery. After message collection the sender receives a newline;
there is no separate “message sent” acknowledgement.

After line editing, message text must contain at least two characters before
the line terminator. Spaces count; do not trim leading or trailing spaces or
require a nonblank word. Empty and one-character input send nothing and emit
`No message sent\n`, followed by the command's additional newline. The same
notice is emitted when prompted message entry is cancelled by interruption.
The earlier reception/ungagging changes remain in effect.

Retain at most the first 75 text characters. Longer text is silently truncated;
its remainder is consumed as message input, not executed as another command.
The line terminator is not part of the 75-character limit. A semicolon starts
inline text; subsequent semicolons and slashes are ordinary message characters.
The length check counts the collected text before truncation. Successful
delivery writes that retained text followed by a line ending; output assembly
may contribute an additional newline as described by the radio-output rule.

At delivery, test the receiving ship's current gag set. If it contains the
sender, discard that recipient's copy without displaying it. Otherwise show
the message, then remove that recipient from the pending set. Other recipients
are unaffected. A message is removed when no recipient remains pending.

Radio enablement and device damage are not retested at delivery. Once selected
for a message, a recipient can receive it after turning reception OFF or
incurring critical radio damage. Current gagging can still discard it. This
distinction separates admission to a message's recipient set from delivery
of a copy already pending.

Pending radio messages are processed after pending combat notifications on
entry to command acquisition, before the preceding command's readiness wait.
They are also processed when notifications are detected while awaiting a new
command, again after combat notifications. This delivery does not itself
complete a turn. Releasing a ship discards its remaining pending copies.

> Reviewer note — execution boundaries: The ordering above establishes the
> observed delivery points, not an implementation polling loop. The shared
> execution chapter defines ordinary fatal acquisition and direct-departure
> discards. Interrupted input and simultaneous events remain open. Do not introduce a terminal poll frequency
> as a game rule.

> Reviewer note — remaining text interaction and output: Control-character
> editing and replay remain to be defined. Section 10.8 specifies the player
> recipient header and newline rendering. The 75-character retained-text limit is an observable
> message rule, not a prescribed buffer representation. Repeated
> command-input behavior also needs the shared interaction chapter. The entry
> is not yet a complete message transcript contract.

The following interactions assume Excalibur sends to a commissioned
Wolf whose reception is enabled and whose radio damage is below 300. Excalibur's
radio also passes the damage check. Output excludes input echo and ordinary
command prompts; `\n` denotes a line ending. Each row starts independently.

| Command and responses | Ordered sender output | Result |
| --- | --- | --- |
| `TE`, then an empty recipient response | `\nTo ship:  ` | Reception enabled; no message |
| `TE`, then `W;hold` | `\nTo ship:  `, then `\n` | One message to Wolf containing `hold` |
| `TE`, then `W`, then `hold` | `\nTo ship:  `, then `Msg: `, then `\n` | Same message |
| `TE ZZZ` | `\nUnrecognized player or group name:  ZZZ\n`, then `\nNo message sent.\n` | No recipient retry or message prompt |
| `TE ZZZ W;hold` | `\nUnrecognized player or group name:  ZZZ\n`, then `\n` | The invalid name does not prevent the message to Wolf |
| `TE W`, then an empty message response | `Msg: `, then `No message sent\n\n` | No message; Wolf remains removed from Excalibur's gag set |

*Examples:*

- `TE W;hold / wait` selects Wolf and treats `hold / wait` as message text.
- A sender with radio OFF who cancels recipient input nevertheless ends with
  reception ON, provided the radio device passed the initial damage check.
- A selected recipient with reception OFF is excluded before message input;
  turning it ON later does not add it to that message.
- A recipient who gags the sender after message creation but before delivery
  discards its pending copy. Other recipients may still receive theirs.
- A recipient selected while its radio is enabled still receives the pending
  message after switching OFF, unless it has gagged the sender before delivery.
- Sending to a gagged but otherwise eligible ship ungags it on the sender's
  side; this does not guarantee that the recipient will display the message.

## 7.19. PHASERS

```text
PHASERS [ABSOLUTE | RELATIVE] [<energy>] <vertical> <horizontal>
PHASERS COMPUTED [<energy>] <vessel-name>
```

*Syntax:* PHASERS may abbreviate to PH. Its optional integer is firing energy,
not a coordinate. Omission selects 200 energy units; an explicit amount must
be from 50 through 500 inclusive. Destination input uses the shared coordinate
rules. A missing destination prompts; a lone energy integer is rejected as
the wrong number of coordinates.
Section 5.6 defines quantity-versus-coordinate handling and shared diagnostic
precedence before the shot-specific checks below.

*Semantics:* PHASERS attacks one nonfriendly ship, base, planet, or Romulan
within Chebyshev distance 10. The beam does not traverse intervening sectors:
an intervening star or ship does not intercept it. Successful firing completes
one turn. Validation failures do not.

### Checks and expenditure

Apply checks in this order:

1. Require phaser-device damage below 300. Otherwise output
   `Phasers critically damaged.\n` without requesting coordinates.
2. Resolve destination input using the shared coordinate rules.
3. Require a ship, base, planet, or present Romulan there. Otherwise output
   `\nPhaser control unable to lock on target, Captain.\n`.
4. Reject the issuing ship's own position using the shared self-target error.
5. Reject friendly ships, bases, and planets with
   `\nWeapons Officer:  Attempting to hit friendly object, Captain.\n`.
6. Require distance at most 10; otherwise output `Target out of range.\n`.
7. Await the earlier-ready of the two phaser banks, then validate explicit
   energy. An amount outside 50–500 produces
   `\nWeapons Officer:  Improper energy consumption for phaser hit, Captain.\n`.

There is no available-energy check. If shields are up, deduct 200 additional
energy before the attack; medium and long output also report
`High speed shield control activated.\n`. Shield mode and strength do not
change merely because this control is used. After resolving the attack, deduct
the firing energy and set the ship's condition to RED. Neither charge is
clamped to available energy. The attack can occur even when its cost exhausts
the firing ship.

### Bank selection and validation timing

Each phaser shot uses one of two independently recovering banks. Select the
bank with the earlier readiness time; the other bank's readiness is unchanged
by that shot. If the selected time has already passed, no bank wait is needed.
Otherwise wait until it is reached. Two banks do not permit combining their
energy allowances into one shot or firing two shots for one invocation.

Target eligibility is checked before this wait, but the explicit energy bounds
are checked afterward. Thus an out-of-range target is rejected without a bank
wait, while an otherwise eligible target with requested energy 600 waits for
the selected bank and then receives the improper-energy diagnostic. That
rejection fires no shot, charges no energy, creates no hit notice, updates no
bank readiness and completes no turn. Time already spent waiting is not undone.

A successful shot establishes a new readiness time for the selected bank after
the hit and energy debit. Any phaser damage incurred by overheating in that
shot participates in the historical recovery calculation. It does not change
the other bank's previously established readiness. The duration formula and
clock remain C-007; selecting a bank does not settle them.

For example, suppose the banks become ready at times `a` and `b`, with
`a < b`. The first shot selects the bank at `a`. If its new readiness is `c`
with `b < c`, the next shot selects the other bank at `b`, even if both banks
are already ready when that command is issued. The rule is earliest readiness,
not fixed alternation. Equal readiness times make the banks interchangeable
for this rule: neither has a distinct damage value or firing allowance in
the game model. No player-selectable bank operand is introduced.

### Overheating and target effects

After validation and the bank wait, resolve the shot in this order:

1. If shields are up, report high-speed shield control where required and
   deduct its 200-energy charge.
2. Draw the overheating test. Only if it succeeds, emit the overheating
   messages, draw the damage increment, and apply that increment.
3. Resolve the target-specific hit described below. A full-strength base's
   assistance notice is created before its hit. Create the hit notice after
   calculating the target's resulting condition; a destroyed base's faction
   notice follows its hit notice.
4. Deduct the selected firing energy, set the firing ship's condition to RED,
   and update the selected bank's readiness.
5. Complete the turn using Section 9.1.

If the hit destroys a base, apply Section 9.4's ending check at that removal.
A terminal result is latched before the remaining firing and completion steps;
the ending announcement and release follow those steps. Phasers reduce a
planet's construction but do not directly destroy it.

Notice creation here does not mean immediate delivery to every recipient;
Sections 9 and 10 define delivery and recipient-specific rendering. In
particular, a notice records the hit's result, not the target's condition when
the recipient later reads it.

Let `power` be the selected firing energy. Draw an integer uniformly from
1 through 100. If its product with `power` exceeds 18900, report
`WARNING! WARNING!  PHASERS OVERHEATING.\n`. Long output additionally reports
`********** CRACKLE! POP! SIZZLE! POOF! **********\nPHASERS DAMAGED.\n`.
For overheating damage, select a second integer `roll` uniformly from 1 through
100. The damage increment before state-write quantization is
`75 + 0.0075 * roll * power`. Overheating does not cancel the shot, even if
the resulting device damage reaches 300. Newly incurred damage participates
in that same shot's ship/base damage calculation; Romulan and planet hits do
not acquire the ship/base device-impairment multiplier.

The overheating probability is zero through power 189. For higher allowed
integer powers it is `(100 - Math.floor(18900 / power)) / 100`: 6% at power
200 and 63% at power 500. The damage roll is separate from the threshold roll.
At power 200, a damage roll of 100 gives an increment of 225; at power 500 it
gives 450. These are increments, not replacements for existing device damage.

Against a nonfriendly planet, draw another integer `roll` from 1 through 100.
If `Math.trunc(roll * power / (25 * distance)) > 150`, reduce construction by
one, with a floor of zero. Otherwise construction is unchanged. Phaser fire
does not remove the planet or change its allegiance. Report the resulting
construction through the combat-output rules.

Ship/base targets use Sections 6.1–6.2; Romulan targets use Section 6.5.
A full-strength base calls for assistance before the
hit; destruction can create an additional faction notification afterward.
The firing ship's selected phaser bank then acquires a new readiness time.

> Reviewer note — shared combat dependencies: State-write precision,
> overheating increment precision, remaining random-choice dependencies and
> bank-readiness durations remain open. Sections 6 and 10 define damage awards,
> recipient selection and hit text; Section 9 defines sequential final reporting
> and release. Concurrent destruction, port-loss effects and C-023 delivery
> ordering are not settled by those definitions.
> Bank availability is game timing; historical terminal-speed inputs are not
> adopted. These gaps prevent conformance-ready successful-shot transcripts.
> The command must not be implemented as a fixed damage subtraction.

*Examples:*

- `PH ABSOLUTE 200 20 25` requests power 200 at sector (20, 25).
- At power 200, an overheating roll of 94 does not overheat; 95 does.
- At distance 1 and power 200, a planet-damage roll of 19 reduces construction
  by one; 18 does not. Construction zero remains zero in either case.
- With shields up, a valid power-200 shot costs 400 energy in total, independent
  of damage inflicted. It is not rejected merely because only 300 remain.
- A friendly object at distance 11 fails the friendly-target check before the
  range check.

### Planet-shot boundary cases

Suppose the firing ship is at (20, 20), has 300 energy, raised shields at
100%, and undamaged phasers. A neutral planet at (20, 21) has construction
stage 2. For `PH ABSOLUTE 200 20 21`, the following results are measured after
the shot but before turn completion or later fatal-condition handling:

| Random draws, in order | Phaser damage | Planet construction | Ship energy |
| --- | ---: | ---: | ---: |
| Overheating 94; planet 18 | 0 | 2 | -100 |
| Overheating 94; planet 19 | 0 | 1 | -100 |
| Overheating 95; overheating damage 100; planet 19 | 225 | 1 | -100 |

Every row leaves the ship's shield mode and strength unchanged and sets its
condition to RED. The planet retains its position and neutral allegiance.
The third row uses an additional random draw because the phasers overheat;
its 225 damage does not weaken the planet-construction test. These examples
use an exact damage increment and do not select a general precision policy.

At medium or long output, high-speed shield control is reported first. The
third row then reports overheating, with the additional damage message in
long output. Each row creates a phaser-hit notice recording the resulting
planet construction, even when no construction stage was lost. There is no
separate insufficient-energy rejection or shield-control exhaustion message
in this firing sequence.

Validation precedence can be checked independently of those random draws:

| Prior condition and request | First result |
| --- | --- |
| Phaser damage 300; destination omitted | Critical-device diagnostic; no destination prompt |
| Empty destination; explicit power 49 | Unable-to-lock diagnostic |
| Friendly target at distance 11; power 49 | Friendly-target diagnostic |
| Nonfriendly target at distance 11; power 49 | Out-of-range diagnostic |
| Nonfriendly target at distance 10; power 49 | Bank wait, then improper-energy diagnostic |

None of these rejections expends firing or shield-control energy, draws an
overheating result, or completes a turn. A bank wait may nevertheless occur
in the last case; the unresolved timing discussion in Section 9.1 still
applies.

### Ship shot through completion and delivery

Excalibur at (20,20) and Wolf at (20,21) are the only unreleased players.
Both have 5000 energy, zero hull damage, lowered shields at 100%, and
stardate 1. Excalibur has radio-device damage 80 and otherwise undamaged devices;
Wolf has undamaged devices but reception disabled and Excalibur gagged.
Both are undocked, with life-support reserve 5. All scores are zero and
Federation completed turns is 1. World-activity progress is zero. Both phaser
banks are ready. No independent event intervenes.

For `PH ABSOLUTE 200 20 21`, supply these random values in order:
overheating integer 94, critical-hit sample 0, attenuation sample 0. There is
no overheating damage draw and no critical-device or critical-hull draw.

| Checkpoint | Result |
| --- | --- |
| Eligibility and bank | Enemy ship at distance 1; power 200 is valid; no bank wait |
| Overheating | `94 * 200 <= 18900`; phasers remain undamaged |
| Hit | `8 * 200 * 0.9 = 1440`; critical test `1440 * 0.1 < 170` fails |
| Target | Wolf has energy 3560, hull damage 1440 and condition RED; shield mode and strength stay unchanged |
| Hit facts and award | Record the 1440-point noncritical hit for Excalibur and Wolf; Excalibur gains 1440 pending ENEMY_DAMAGE points |
| Firing debit | Excalibur has energy 4800 and condition RED; update only the selected bank's readiness |
| Completion | No automatic repair; progress becomes 1 without a world cycle; Excalibur's stardate and Federation completed turns become 2; reserve remains 5 |
| Score commitment | Excalibur and Federation gain 1440 committed ENEMY_DAMAGE points; pending damage becomes zero |

Wolf's stardate stays 1: receiving a hit does not complete its turn.
Excalibur's radio-device damage stays 80 because weapon completion omits
automatic repair. Neither vessel's ammunition changes. This shot has no
immediate shield-control or overheating output.

When each recipient receives its pending hit in short absolute output, it sees
`E 20-20 -100  1440P  W 20-21 -100\n`. Wolf's disabled reception and gag do
not suppress combat output. Delivering Excalibur's copy leaves Wolf's copy
pending; delivering Wolf's copy consumes the remaining copy without applying
damage again. This specifies each recipient's output, not a global ordering
between their independent deliveries. The new bank delay remains C-007.

## 7.20. TORPEDOES

```text
TORPEDOES [ABSOLUTE | RELATIVE] <count> [<vertical> <horizontal> ...]
TORPEDOES COMPUTED <count> [<vessel-name> ...]
```

*Syntax:* TORPEDOES may abbreviate to TO; TORPEDO and TORPEDOS are accepted
spellings. The first integer is the burst size, from 1 through 3. One coordinate
mode applies to every supplied target. A count without targets requests a
target-response; a mode supplied with the count does not persist into that
response. The response uses its own explicit mode or the player's default.
Section 5.6 defines shared weapon-input validation and the computed-name error
ordering discussion; the burst checks below follow destination resolution.

*Semantics:* Launch torpedoes sequentially toward specified sectors. A target
need not be occupied. It supplies an aiming direction, not a guarantee of which
object is struck or the point at which the torpedo stops. Each torpedo observes
the galaxy resulting from earlier torpedoes in the burst.

### Input and validation

Check torpedo-tube damage first. At 300 or more, output
`Torpedo tubes critically damaged.\n` and abort. With no torpedoes remaining,
medium and long output is `You have already used your supply of torpedoes!\n`;
short output is `\n0 torpedoes left.\n`. These checks precede target input,
even while docked.

For omitted burst input, prompt with `Number in burst (1-3) and ` followed by
the shared `Coordinates: ` prompt. A count of zero or less cancels without
launching. A count greater than the ship's supply produces
`Insufficient torpedoes for burst!\n`, then a newline and the remaining count
followed by ` torpedoes left.\n`. A count greater than 3 also produces that
remaining-count report, even when supply is sufficient.

Assign supplied targets in order. If fewer targets than torpedoes are supplied,
repeat the last target for the rest of the burst. Validate assigned targets in
burst order before launching: reject the ship's own position using the shared
self-target diagnostic, and reject a target beyond Chebyshev distance 10 with
`Target out of range.\n`. Targets may be empty or friendly; these are not
phaser-style target-eligibility checks.

These are checks of the whole assigned burst, not checks interleaved with
launches. An out-of-range second target prevents the first torpedo from
launching. A repeated last target is subject to the same checks as an explicitly
supplied target.

The following preflight cases assume the issuing ship is at (20,20), with
operational tubes and three torpedoes, unless stated otherwise. None launches
a torpedo before all assigned targets have passed the initial checks.

| Request or condition | Result |
| --- | --- |
| Count 3; aims (21,20), (20,30) | Assigned aims are (21,20), (20,30), (20,30) |
| Count 2; aims (21,20), (20,31) | `Target out of range.\n`; no first launch |
| Count 2; aims (20,31), (20,20) | Range rejection wins before the later own-position target |
| Count 2; aims (20,20), (20,31) | Own-position diagnostic wins; its completion policy remains below |
| Count 4; supply 3 | `Insufficient torpedoes for burst!\n\n3 torpedoes left.\n` |
| Count 4; supply 10 | `\n10 torpedoes left.\n`; no insufficient-supply line |
| Count 0, critical tubes and no supply | Tube-damage diagnostic; cancellation does not bypass the earlier check |

Docking does not change these preflight results. It affects ammunition
deduction at launch, not the initial requirement to possess the requested
burst's supply. No preflight failure decrements that supply or partially
launches the valid prefix of an otherwise rejected target list.

> Reviewer note — input/completion exceptions: Even-length initial input,
> surplus targets, and empty prompted responses remain C-010 cases. Historical
> self-target rejection returns through the time-consuming path, unlike range
> rejection. Its turn/readiness effects require an explicit decision, not an
> assumption that every validation failure is free.

### Discussion — self-target rejection and turn completion

Two distinct outcomes need a final choice for a burst whose initial assigned
targets include the firing ship's own sector:

- **Preserve the observed completion path:** emit the self-target diagnostic,
  expend no ammunition, but complete a weapon turn. World activity, stardate,
  life support and score commitment can then act despite the absence of a launch.
- **Treat it as a validation rejection:** emit the same diagnostic and expend
  no ammunition, but do not complete a turn, matching out-of-range rejection.

For example, let an undocked ship at (20, 20) have one torpedo, life-support
damage 300 and life-support reserve 1. `TO ABSOLUTE 1 20 20` never launches a
torpedo. If due world activity leaves those properties unchanged, the first
alternative advances stardate and reduces the reserve to 0; the second does
neither. Neither alternative performs automatic repair: TORPEDOES uses the
weapon completion path even when its normal return follows self-target rejection.

The first behavior may provide a deliberate way to spend a turn without firing,
or may merely reflect inconsistent rejection handling. Neither interpretation
has been adopted. Bank-readiness consequences belong to the timing discussion
in Section 9.1. This choice concerns rejection before any launch; it does not
erase effects of torpedoes already launched when a later aim becomes the ship's
own sector.

### Launch and misfire

Await torpedo readiness and set the ship's condition to RED. For each launched
torpedo, calculate deflection from a base random component, an additional
component if either tubes or computer have any damage, and another component
when shields are up, proportional to shield strength. These affect the path,
not target selection. Firing consumes no ship energy. Deduct one torpedo just
before its misfire check unless the ship is docked; docked firing preserves
the ammunition count but still requires sufficient supply at validation.

An integer draw from 1 through 100 greater than 96 causes a misfire. Output
`Torpedo `, its one-based burst number, and ` MISFIRES!\n`. Add another random
deflection component. With probability one fifth, also damage the torpedo tubes
and output `PHOTON TUBES DAMAGED!\n`.

A misfiring torpedo still travels and can hit an object. The remaining torpedoes
in that burst are not launched. They consume no ammunition. Misfire is therefore
neither a harmless cancellation nor permission to finish the original burst.

### Burst sequencing

Resolve target input into sector positions before the first launch. These
positions remain fixed during the burst; a COMPUTED target is not looked up
again to follow a moving vessel. Each launch instead uses the firing ship's
current position, shield condition, and device damage. Consequently, damage or
displacement caused by an earlier impact can change a later torpedo's path.

For each assigned target, in order:

1. Stop if the preceding torpedo misfired. Do not draw random values or spend
   ammunition for an unlaunched torpedo.
2. Calculate the ordinary deflection terms from the firing ship's current
   condition. Calculate the aiming displacement from its current position
   to the saved target sector.
3. If that displacement is zero, emit the self-target diagnostic and end the
   burst without expending this torpedo. Earlier launches are not undone.
4. Deduct ammunition when undocked, then perform the misfire test and its
   conditional deflection and tube-damage steps.
5. Select travel extent, traverse sectors, and fully resolve the encountered
   object or miss, including any resulting nova chain, before proceeding to
   the next torpedo.

The initial supply, critical-device, and target-range checks are not repeated
between launches. The zero-displacement check is repeated because the ship
may have moved. Any tube damage caused by the current misfire does not cancel
that torpedo's flight. No turn-completion repair occurs between torpedoes.

After the burst ends, update torpedo readiness and complete one turn. This
includes a burst truncated by misfire. The pre-launch self-target case remains
the separate unresolved completion exception noted above; it must not be
confused with rolling back an already partially fired burst.

### Discussion — firing ship destroyed during its burst (C-029)

A torpedo-triggered nova can destroy the issuing ship before the burst has
finished. The historical burst loop does not recheck the issuing ship's
survival between launches. If no earlier misfire ended the burst, it can
attempt the next launch using the destroyed ship's retained position and
current device, shield and docking values. Newly critical tube damage does
not independently prevent that launch. This is distinct from a surviving ship
being displaced, and from detecting fatal state at ordinary command acquisition.

For example, a ship with three torpedoes fires a two-torpedo burst. The first
launch expends one torpedo, causes a nova and destroys the firing ship. Assume
it did not misfire, the ship remains undocked and its second saved target is
distinct from its retained position. Continuing the historical loop expends
another torpedo and attempts its flight; stopping on destruction instead
leaves that torpedo unlaunched. Subsequent impacts, random choices and scores
can therefore differ. Neither choice undoes the first launch or nova.

The proposed pure rule stops unlaunched torpedoes when the firing ship is
destroyed, but that changes observable combat rather than merely removing a
storage detail. Retention and early stopping remain unresolved. The sequential
burst rules above do not authorize firing from an AVAILABLE vessel, resurrect
a destroyed ship, or define its later release. The selected rule must also
state whether the interrupted burst follows ordinary weapon completion before
final reporting; destruction is not a universal completion bypass (Section 9.1).

### Deflection and travel extent

Use fresh unit random samples for the terms below. A unit sample is a value
`u` with `0 <= u < 1`; the abstract distribution is uniform. These samples
specify random choices, not a required generator or seed representation.

The base deflection is `(u - 0.5) / 5`. If torpedo tubes or computer have any
damage, add `(v - 0.5) / 10` using one further sample. Damage to both devices
still adds only one term; the amount of damage does not scale it. If shields
are up, add `strength * (w - 0.5) / 1000`, where strength is the current shield
percentage. Shields down omit that term entirely. A misfire adds another
`(x - 0.5) / 5` term.

These are signed path-deflection quantities, not sector coordinates or angles
in degrees. Their use in sector traversal belongs to the path operation.
Draw the base term first, then the damage term when applicable, then the shield
term when applicable. Perform the misfire check next; its extra deflection
precedes the tube-damage check. If the tube-damage check succeeds, add
`50 + roll / 10` damage units, where `roll` is an integer from 1 through 3000.
This produces increments from 50.1 through 350.0 inclusive in tenths.

After misfire processing, a fresh sample selects the travel extent:

```typescript
function torpedoExtent(u: number): number {
  return 8 + Math.trunc(4 * u - 1.5);
}
```

Truncation is toward zero, not downward. The resulting distribution is:

| Sample interval | Extent | Probability |
| --- | --- | --- |
| `0 <= u <= 0.125` | 7 | 1/8 |
| `0.125 < u < 0.625` | 8 | 1/2 |
| `0.625 <= u < 0.875` | 9 | 1/4 |
| `0.875 <= u < 1` | 10 | 1/8 |

An aimed sector may be within the permitted targeting radius of 10 while
beyond a particular torpedo's travel extent. The aim does not set that extent.

### Travel and impact

Travel follows the shared sector-path operation with random deflection and
travel extent. It may strike an intervening object or continue beyond the aimed
sector. Resolve the first encountered object:

| Encounter | Effect |
| --- | --- |
| No object before travel ends | Report a miss and its final position |
| Black hole | Torpedo is absorbed; notify the firing ship |
| Friendly ship, base, or planet | Torpedo is neutralized, without damage |
| Enemy ship or base | Apply shared torpedo damage and associated notifications |
| Romulan | Apply Section 6.5 damage and its surviving-displacement check |
| Nonfriendly planet | One-in-four chance of losing one construction stage; a loss below zero destroys it |
| Star | Four-in-five chance of a nova; otherwise report the star unaffected |

A planet at construction zero therefore survives three quarters of direct
impacts and is destroyed on the stage-loss outcome. A planet at construction
one falls to zero on that outcome but survives. Destroying a planet removes
it from the galaxy, including its discovery information. A nova can affect
nearby objects and other stars; it is not merely removal of the struck star.

Directly destroying a planet subtracts 100 points from the firing ship's
pending `PLANET_DESTRUCTION` score. Merely reducing its construction incurs
no such penalty. A star that explodes subtracts 50 pending `STAR_DESTRUCTION`
points; Section 6's nova rules account for subsequent explosions and their
damage. An unaffected star incurs no star-destruction penalty.

A torpedo hit on an enemy ship breaks its tractor link after the damage report
is created. A full-strength enemy base calls for assistance before damage;
base destruction can generate a further faction notification. The burst sets
subsequent torpedo readiness and completes one turn, not one turn per torpedo.

Planet or base destruction checks the ending predicate immediately after that
removal (Section 9.4). A latched outcome does not itself stop remaining shots,
nova effects, or the burst's normal completion. Existing fatal-exit rules still
apply. Ending output and release occur when the command finishes.

> Reviewer note — shared combat dependencies: Section 6 defines initial and critical
> damage, displacement, sector traversal and ordinary scoring. Sections 9 and
> 10 define completion and ordinary hit recipients/output. Remaining choices
> concern state-write precision, exceptional nova behavior (C-019, C-025–C-027),
> port loss/ending (C-021–C-022), notice ordering (C-023), firing-ship destruction
> during a burst (C-029), and readiness. These are required semantics, not
> optional implementation choices. Historical
> lock failure during planetary impact is not introduced as a random tube error.

*Examples:*

- `TO ABSOLUTE 3 20 25 21 25` aims the burst at (20, 25), (21, 25), (21, 25).
- A three-torpedo burst whose second torpedo misfires launches only two. An
  undocked ship expends two torpedoes; the second can still hit.
- A docked ship with two torpedoes can fire a two-torpedo burst without reducing
  that count. It cannot request three merely because docked shots are free.
- A friendly ship intercepting the path neutralizes the torpedo, even if the
  originally aimed sector contains an enemy.

### Burst scenarios

**Range rejection before firing.** A ship at (20, 20) with three torpedoes
requests `TO ABSOLUTE 3 20 25 20 31`. The assigned targets are (20, 25),
(20, 31), and (20, 31). The second target is out of range. Output is
`Target out of range.\n`; no torpedo launches, no launch-related random draw
occurs, and all three torpedoes remain. The command does not complete a turn.

**Misfire after a neutralized shot.** An undocked ship at (20, 20) has three
torpedoes, lowered shields, and undamaged tubes and computer. It requests
`TO ABSOLUTE 3 20 25`. A friendly ship occupies (20, 21). Choose zero
deflection for every applicable term, an extent of 8 for both launches,
a first misfire-test roll of 96, and a second roll of 97. Let the second
torpedo's tube-damage check fail.

The first torpedo is neutralized at (20, 21). The second announces its misfire
and is also neutralized there. The third does not launch. One torpedo remains;
ship energy, device damage, and the friendly ship are unchanged by the launches.
The firing ship's condition is RED. The burst contributes one completed turn,
not two; subsequent turn-completion effects are separate from these immediate
results.

With absolute short output, the two impact notices render as
`T1 neutralized 20-21\n` and `T2 neutralized 20-21\n`. The immediate misfire
message is `Torpedo 2 MISFIRES!\n`. The first notice is created before that
message, and the second afterward. Their eventual display order relative to
the immediate message follows combat-notice delivery, not creation order alone.

**Repeated planet target.** An undocked ship with three torpedoes aims all
three along an unobstructed path to a neutral planet at construction stage 1.
Assume no misfires, no intervening displacement, and that each torpedo reaches
the planet's sector. Stage-loss outcomes on the first two impacts reduce the
planet to stage 0 and then destroy it, respectively. The first hit records a
surviving stage-0 planet; the second records destruction and incurs the
100-point penalty. The third torpedo encounters an empty former planet sector
and continues its flight; it does not strike a saved planet object. Its eventual
result depends on the remaining path. All three launches expend ammunition,
but together they complete only one turn.

### Completion of the misfire scenario

Extend the neutralized-shot scenario above as follows. Excalibur is the
issuing ship, Farragut is the friendly interceptor, and they are the only
unreleased players. Each has stardate 1, energy 5000, zero hull damage, reserve
5 and no device damage except Excalibur's radio damage 80. Both are undocked.
Excalibur has three torpedoes before firing. World-activity progress is zero,
Federation completed turns is 2, and all scores are zero. No independent event
intervenes. The launch samples and unchanged tube-damage outcome are as in
the preceding scenario.

After the two launches and the unlaunched third torpedo, Excalibur retains one
torpedo and condition RED. Farragut has suffered no damage. The command sets
the issuing ship's torpedo readiness, then completes exactly one weapon turn:

- No automatic repair occurs; radio damage remains 80.
- World-activity progress becomes 1, below the two-player threshold.
- Excalibur's stardate becomes 2; Farragut's remains 1; Federation completed
  turns becomes 3.
- Life-support reserve remains 5. There is no damage, kill or construction
  award; all scores remain zero.

The immediate output is `Torpedo 2 MISFIRES!\n`. The two pending neutralization
notices report torpedoes 1 and 2 at (20,21), respectively. Their delivery does
not spend more ammunition or advance another turn. The firing ship is their
recipient; the friendly interceptor does not receive a damage report for a
neutralized torpedo. C-023 still determines ordering among pending notices;
the readiness duration remains C-007. These choices do not alter the one-turn
accounting or the fact that the second, misfiring torpedo actually launched.

## 7.21. HELP

```text
HELP [<topic> ...]
```

*Syntax:* HELP may abbreviate to H. It accepts zero or more topics, processed
in input order. A command-topic resolves to an available command, not an
arbitrary word. `*` requests the command list. Command lookup precedes lookup
of additional topics: HELP I selects IMPULSE, while HELP INP selects INPUT.
An ambiguous command prefix is not retried as an additional-topic prefix.

*Semantics:* HELP displays explanatory text without consuming energy or
completing a turn. During play it first checks alert condition. If RED, output
the following text, beginning and ending with a newline, and stop without
processing topics:

```text

You cannot get HELP while under
RED alert!
```

### General help and command listing

Without topics, output:

```text

For a list of commands type HELP *
For help on a particular command type HELP command

Besides commands, help is also available for:

```

Then emit the following two rows. Each entry occupies ten characters, padded
on the right with spaces; the empty second entry also occupies ten spaces.
Terminate each row with a newline, including the last row's trailing padding.

| Row | Entries, in order |
| --- | --- |
| 1 | `CTL-C`, empty, `INTRO`, `HInts`, `INput`, `Output`, `PAuses` |
| 2 | `PRegame` |

Finally emit
`\nUpper case letters mark the shortest acceptable abbreviation.\n\n`.
This is the general-help response, not an implicit request for every command's
text. INTRO is the additional topic's lookup name; the empty entry is spacing,
not a topic that accepts empty input. The displayed capitalization is historical
output, not a substitute for lookup: IN matches both INTRO and INPUT despite
the displayed spelling `INput`.

For `HELP *`, emit `\nCommands are:\n\n`, then the following rows using the
same ten-character fields and newline rule:

| Row | Entries, in order |
| --- | --- |
| 1 | `BAses`, `BUild`, `Capture`, `DAmages`, `DOck`, `Energy`, `Gripe` |
| 2 | `Help`, `Impulse`, `List`, `Move`, `News`, `PHasers`, `PLanets` |
| 3 | `POints`, `Quit`, `RAdio`, `REpair`, `SCan`, `SEt`, `SHields` |
| 4 | `SRscan`, `STatus`, `SUmmary`, `TArgets`, `TEll`, `TIme`, `TOrpedos` |
| 5 | `TRactor`, `TYpe`, `Users` |

The displayed spelling `TOrpedos` is retained; it denotes TORPEDOES. These
lists do not vary with the player's output-length or coordinate preferences.

### Topic processing and lookup errors

For each explicit topic, display its associated help text. `*` displays the
available command names, preceded by `Commands are:` and line separation.
For an unrecognized topic, emit `I don't know the term `, the token, and a
newline. For an ambiguous topic, emit the token followed by
` is ambiguous.  Could be:\n`, then the matching displayed names separated
by `, `, and a final newline. Matches retain the command-list order above,
or the additional-topic order when no command matched. Diagnostic tokens are
the recognized uppercase input text, limited to their first ten characters.
Continue with later topics after a lookup error.
Previously displayed text is not withdrawn by interruption. Whether later
requested topics are processed depends on the interruption boundary, discussed
below. The command is available before commissioning as well, without a ship
alert-condition check.

For example, `HELP P` emits
`P is ambiguous.  Could be:\nPHasers, PLanets, POints\n`. It does not consider
PAUSES or PREGAME after finding ambiguous command matches. `HELP ZZZ MOVE`
emits `I don't know the term ZZZ\n` and then proceeds to MOVE's help text.
`HELP * *` emits the command listing twice; topic requests are not deduplicated.

The following lookup cases apply before any topic text is retrieved. They do
not depend on which help corpus is selected.

| Input topic | Result |
| --- | --- |
| `H` | HELP command topic, not HINTS |
| `HI` | HINTS additional topic |
| `I` | IMPULSE command topic |
| `IN` | Ambiguous additional topics: INTRO, then INput |
| `INP` | INPUT additional topic |
| `INT` or `INTRO` | INTRO additional topic |
| `O` | OUTPUT additional topic |
| `PA` | PAUSES additional topic |
| `PR` | PREGAME additional topic |
| `CTL` or `CTL-C` | CTL-C additional topic |
| `DECINI` or `CTL-T` | Unknown topic |

Thus `HELP IN HI` first emits
`IN is ambiguous.  Could be:\nINTRO, INput\n`, then displays HINTS text.
Failure to resolve one topic does not cancel the remaining request. A selected
topic is retrieved by its resolved name, not the abbreviation supplied by the
player: `HELP INT` searches for INTRO text.

Lookup diagnostics do not have an unconditional command-leading newline.
For example, the complete output of `HELP P ZZZ` is
`P is ambiguous.  Could be:\nPHasers, PLanets, POints\nI don't know the term ZZZ\n`.
The second error does not erase or replace the first. Under RED the same input
instead emits only `\nYou cannot get HELP while under\nRED alert!\n`.

### Discussion — missing text and interruption boundaries

Recognizing a topic and finding its help text are distinct steps. Historical
topic display begins with a newline. If the selected corpus has no section for
that recognized topic, display `%Can't find help on ` followed by the resolved
topic's displayed spelling, limited to ten characters, and a newline. Continue
with the next requested topic. This is not `I don't know the term`, which means
lookup itself failed. An unavailable historical help resource instead produces
the warning `%Can't read help file`; the choice of a self-contained Austin
Core corpus must determine whether resource-access failures remain part of
the language at all. Neither missing text nor access failure supplies invented
topic content.

The historical topic reader stops at the next section boundary and suppresses
section headings and form-feed characters. An interruption detected during
topic text stops that text at a line boundary, but clears the interruption
before returning to the topic loop. Later requested topics can therefore
still run. An interruption observed by the outer loop before starting the
next topic instead ends the remaining request. These are not equivalent
to a uniform “cancel HELP” operation.

For `HELP MOVE IMPULSE`, interrupting MOVE's text can leave its displayed
prefix followed by IMPULSE help; observing the interruption between topics
can leave only MOVE's output. The simpler alternative cancels all remaining
topics regardless of where interruption occurs. Preserving the distinction
retains historical interaction but requires explicit input/output boundaries;
uniform cancellation changes which later text appears. C-010 leaves this
choice unresolved. No implicit interruption rule is supplied by the topic list
or by TypeScript control flow.

> Reviewer note — help data and exact output: The help corpus is part of the
> observable language, not a license to consult an unspecified external manual.
> The Austin Core topic corpus and privileged-topic policy remain to be incorporated into this document's
> output data. The command is not complete until that content is defined.
> The preserved help file is identified as a system-comment edition; it is not
> automatically the ordinary-player corpus. C-011 records that content choice.

### Discussion — topic content versus topic lookup

The selectable additional topics are CTL-C, INTRO, HINTS, INPUT,
OUTPUT, PAUSES, and PREGAME. A heading in a help document does not by itself
make a topic selectable. In particular, the preserved text contains DECINI and
CTL-T sections but neither name belongs to the ordinary lookup list. Conversely,
the lookup list offers INTRO, but the preserved formatted document has no
marked INTRO section; its introductory prose precedes the sections.

The historical five-character comparison also accepts INTRODUCTION—and other
words beginning INTRO—as INTRO. Under the working full-spelling rule,
INTRODUCTION is not a prefix of INTRO and is not an independently declared
alias. Its acceptance therefore belongs to C-008's recognition decision;
the grammar does not silently add it as a second topic name.

Two content policies remain for discussion. A reconstructed historical corpus
would retain the selected edition's wording and expose missing-topic failures.
An Austin Core corpus would supply text for every selectable topic, including
INTRO, and describe the rules in this specification rather than obsolete
host instructions. The latter avoids promising unavailable help but requires
editorial changes to player-visible text. Neither policy has been adopted.
The general response and command listing above do not depend on that choice.

> Reviewer note — information activity (C-002): Historical HELP temporarily
> removes a ship's board marker, then restores it. Do not introduce that storage
> operation as an abstract game rule. Its visibility and vulnerability effects
> require the existing character decision before HELP during play is complete.

*Examples:*

- HELP MOVE IMPULSE displays the two topic texts in that order.
- HELP * requests the command listing, not all command documentation.
- HELP while RED produces only the refusal above, regardless of requested topic.

## 7.22. NEWS

```text
NEWS
```

*Syntax:* NEWS may abbreviate to N. It accepts no operands.

*Semantics:* NEWS displays the current news text in order. It consumes no ship
energy and completes no turn. It is available before and after commissioning.
Unlike HELP, it has no RED-alert rejection and does not remove the ship for
information activity.

At a continuation boundary, pause output and produce
`Do you want to continue viewing the news file? ` without a newline. The
affirmative response rule in Section 5.2 continues with the following text;
any other response ends NEWS without a diagnostic or retry.
Interruption also ends viewing. Neither completion nor cancellation changes
the news or resumes at that position on a later NEWS command: each invocation
starts from the beginning.

Section 5.3 defines how a continuation consumes the next input segment. A
response is not an ordinary command: NO ends viewing rather than selecting
NEWS again, and YES authorizes only the current continuation.

### Text and stopping boundaries

NEWS adds no introductory label, leading newline, or closing newline to the
news text itself. A payload without a final newline ends without one. A
continuation prompt also adds no newline; accepted text follows the prompt
directly, apart from input echo governed by the input language.

In the historical text interpretation, newline, vertical tab (`\v`) and form
feed (`\f`) each establish a boundary. NEWS emits the boundary character before
checking interruption; it does not suppress form feeds as HELP does. An
interruption detected there ends the invocation before examining the next
character. Thus, if that next character is a continuation period, no prompt
is produced and no response is consumed. Recognition of the player's interrupt
gesture during input remains part of the shared input contract.

An accepted continuation consumes its period and resets boundary recognition.
The next character is ordinary text, even if it is another period. For the
hypothetical payload `.Opening\n.Second\n..Third` and two affirmative responses,
the output is `.Opening\n`, the continuation prompt, `Second\n`, the prompt
again, then `.Third`. The initial period is literal; one period after each
newline is the marker; the second consecutive period is literal. This example
does not add sections or text to the proposed Austin Core corpus.

For `First\n.Second\n`, an interruption detected after the first newline leaves
exactly `First\n`. Without interruption, declining continuation leaves
`First\nDo you want to continue viewing the news file? `, with no final
newline. A later NEWS starts again at `First`; neither path records a reading
position. Each additional boundary requires its own affirmative response.

> Reviewer note — news data: The complete content and continuation boundaries
> must be an explicit output dataset, not an implementation-selected file.
> Historical text uses a period immediately after a line boundary as a
> continuation marker; the period is consumed, not displayed, and acceptance
> resumes immediately after it. Map the actual content before replacing that
> convention with structured sections. A period at the very beginning of the
> text is not handled by that boundary check. Missing-file errors are historical
> host failures, not a gameplay outcome adopted here.
> The preserved news payload has no continuation markers and contains historical
> host-maintenance claims. Its inventory does not establish an Austin Core news
> dataset; C-011 records the editorial choice needed here.

### Discussion — news content

The preserved news text is reproduced here so the content decision can be
reviewed without consulting a separate file:

```text
                 Welcome Decwar Version 2.2 !!

This  version contains many bug fixes.  Computed coordinates now
work for terminals with speeds < = 600 baud.  The  TEll  command
should  work  now also.  If we should get a fatal program error,
please save your output!!   I  didn't  change  a  couple  of  KL
instructions in the lowseg as I think they are data.
```

This text contains no continuation boundary. Retaining it would therefore make
NEWS a single uninterrupted response, subject to player interruption. Its
terminal-speed and maintenance claims are historical statements, not claims
about Austin Core. An alternative is a new, explicitly versioned Austin Core
news dataset whose content and continuation boundaries are included in the
specification. Choosing that alternative changes the observable response; an
implementation is not free to choose its own news text. The corpus choice
remains unresolved.

### Continuation scenarios

To exercise continuation independently of the unresolved corpus, suppose a
test dataset consists of `First\n`, one continuation boundary, and `Second\n`.
These strings are a fixture, not the proposed Austin Core news text. NEWS first
emits `First\n` and the exact continuation prompt above. Its subsequent behavior
is:

| Response | Further NEWS output | Result |
| --- | --- | --- |
| `Y`, `YE`, or `YES`, in either letter case | `Second\n` | End of text; return |
| `YES extra` | `Second\n` | First-token confirmation rule; no second response |
| `NO`, empty input, `1`, or `YESPLEASE` | None | End viewing; no retry |
| `NO YES` | None | Later tokens do not override the first |

After any row, a new NEWS invocation emits `First\n` and asks again. No read
position is retained. With the preserved single-section payload instead, no
continuation prompt or continuation response is involved.

*Examples:*

- At the continuation prompt, NO stops output; it does not acknowledge or
  delete the unread news.
- NEWS invoked again begins at the first section, not the section after the
  previous refusal.
- A player under RED alert may request NEWS, although HELP would refuse.

## 7.23. TIME

```text
TIME
```

*Syntax:* TIME may abbreviate to TI and accepts no operands.

*Semantics:* TIME is a timing report, not a request to advance stardate. It
consumes no resources and completes no turn. Elapsed duration and completed
turn count are distinct quantities.

The historical report presents these fields in order, each preceded by a
newline and the literal label shown:

| Label | Meaning |
| --- | --- |
| `Game's elapsed time:  ` | Duration since game initialization |
| `Ship's elapsed time:  ` | Duration since the current ship commissioning |
| `Run time in game:     ` | Processor time attributed to this commissioning |
| `Job's total run time: ` | Processor time attributed to the host session |
| `Current time of day:  ` | Host wall-clock time |

Before commissioning, omit the two ship-specific fields. A newline ends the
report. Output length does not select a shorter field set.

For nonnegative durations below 100 hours, each value has the form `hh:mm:ss`:
two decimal digits per field, leading zeroes, and colons between fields.
Discard fractional seconds rather than rounding to the nearest second. The
hours of an elapsed duration are not a time-of-day field and need not be less
than 24. For example, 3661.9 seconds renders as `01:01:01`.

### Historical report example

Take the report's supplied values to be game duration 3723.9 seconds,
commission duration 245.9 seconds, commission processor time 1.9 seconds,
session processor time 65.9 seconds and time of day 14:30:00.9. The complete
historical report begins with one newline, then these lines, including a
newline after the last:

```text
Game's elapsed time:  01:02:03
Ship's elapsed time:  00:04:05
Run time in game:     00:00:01
Job's total run time: 00:01:05
Current time of day:  14:30:00
```

Before commissioning, the same supplied values produce only the first, fourth
and fifth lines, retaining the initial and final newlines. There are no blank
lines for the omitted fields. Short, medium and long output use this same
layout. These examples define historical presentation, not clocks to add to
`Galaxy`, and do not imply all fields were sampled at one instant.

A supplied duration of 90061 seconds renders as `25:01:01`, not `01:01:01`.
This is a formatting property; it does not assert that the historical elapsed
clock supplies the true age of a game that has run that long. That clock's
wrapping behavior is discussed below.

> Reviewer note — host/core boundary (C-011): The two processor-time fields
> do not describe pure game state. This table records the observable report,
> not approval to put a process or job into Galaxy. Decide which timing fields
> Austin Core retains and define their clocks, units, and rendering before
> this command is complete. Replacing processor time with stardate would not
> preserve the meaning of the existing labels.

### Discussion — clock meaning and a core-only report

Elapsed game time and elapsed commissioning time require duration clocks;
neither is determined by the number of completed commands. A player can wait
without advancing stardate. Processor time is a different quantity again:
time spent waiting need not consume processor time.

The historical elapsed-time calculation adjusts a clock difference by one day
when it falls outside the interval from minus twelve hours through plus twelve
hours. Thus a game that began thirteen hours ago can yield minus eleven hours,
rather than its total age. The two-digit renderer does not define ordinary
signed-duration output or arbitrary-length hours. Replacing this behavior with
a nonnegative duration that continues across midnight remains an explicit
choice, not an assumed arithmetic cleanup.

A proposed core report retains the two elapsed-duration labels and omits both
processor-time lines. Current time of day can either remain as an explicitly
defined presentation-clock value, with an agreed time zone, or be omitted as
well. For a game aged 1 hour, 2 minutes, 3 seconds and a commission aged
4 minutes, 5 seconds, at 14:30:00, the three-field candidate emits:

```text
\nGame's elapsed time:  01:02:03\n
Ship's elapsed time:  00:04:05\n
Current time of day:  14:30:00\n
```

Each displayed `\n` denotes an output newline; the code block's line wrapping
adds none. Before commissioning this candidate omits the ship-duration line.
Omitting wall-clock time instead leaves two lines in play and one before
commissioning. No candidate field set, time zone, long-duration rendering or
clock policy has been adopted.

*Example:* TIME during play includes the commissioning-duration field; before
commissioning it does not. Neither invocation changes any ship's stardate.

## 7.24. USERS

```text
USERS
```

*Syntax:* USERS may abbreviate to U and accepts no operands.

*Semantics:* USERS lists commissioned players in roster order, Federation
before Empire. Uncommissioned vessels have no row. A separator `----\n`
occurs at the faction boundary even if one faction has no listed players.
The report begins with a newline, consumes no resources, and completes no turn.

Long output includes a header before the rows. The historical columns are
ship, captain, terminal speed, user identifier, terminal identifier, and job
identifier. Medium and short output omit the header but do not omit the last
four fields in the supplied reconstruction. Privileged output additionally
includes location; ordinary USERS does not reveal positions.

The long-output historical header is exactly
`Ship       Captain       Baud  User ID     TTY       Job\n` for an ordinary
player. There is no underline row. The faction separator is emitted even when
neither faction has a commissioned player: the empty short or medium report is
`\n----\n`; the empty long report inserts the header after the initial newline.
Destroyed but unreleased vessels have no row. The Romulan has no player row.

> Reviewer note — report data (C-011): Ship and captain belong to the game;
> baud rate, terminal identity, job identity, and host account identifiers do
> not. The Austin Core column set and exact layout need a decision. Do not
> silently drop historical columns while claiming an exact transcript, or
> add host machinery to the ADTs to satisfy them. Privileged visibility remains
> separate from ordinary USERS semantics.

### Historical row format for comparison

The following describes the historical report, not an adopted Austin Core
host interface. Each ordinary row concatenates these fields, then a newline:

| Field | Rendering | Following spaces |
| --- | --- | --- |
| Ship | Full ship name, padded on the right to ten characters | 1 |
| Player | Twelve stored name characters, including trailing spaces | 1 |
| Terminal speed | Decimal integer, right-aligned in four characters | 2 |
| User identifier | Project number in octal, right-aligned to at least six characters; comma; programmer number in octal, padded on the right to six characters | 1 |
| Terminal identifier | Six stored characters, including trailing spaces | 2 |
| Job identifier | Decimal integer, right-aligned in three characters | 0 |

The name and terminal fields are printed without trimming their stored spaces.
This does not establish a twelve-character player-name limit for Austin Core.
An overflowing fixed-width decimal field contains asterisks, as in Section
10.2; the project-number field expands instead. Privileged rows append three
spaces and the ship's position in short coordinate form using the selected
output coordinate mode. The privileged header appends `  Location` before its
newline. Ordinary rows have no position suffix.

For example, take Excalibur with stored player name `ALEX        `, terminal
speed 300, project number 8, programmer number 9, terminal identifier
`TTY1  `, and job number 7. The exact ordinary row is the concatenation below;
the separate strings expose otherwise hard-to-count spaces. Account components
8 and 9 are displayed in octal as `10` and `11`.

```typescript
"Excalibur " + " " + "ALEX        " + " " + " 300" + "  " +
"    10,11    " + " " + "TTY1  " + "  " + "  7" + "\n"
```

With only this ship commissioned, short and medium reports consist of the
initial newline, this row, then `----\n`. Long output inserts the ordinary
header between the initial newline and the row. These are supplied-field
examples: they neither invent host data for a core implementation nor select
the historical columns as its contract.

### Discussion — player roster versus host-session report

USERS answers who is playing, not what the issuing ship can detect. Ordinary
rows expose ship and player identity across factions, even for distant ships
or ships with radio disabled. They do not reveal position, shields, energy,
damage, docking, or the player's command in progress.

Selection uses each ship's lifecycle, not the requesting player's position or
faction. Include the requesting player's own ship while it is commissioned.
Omit AVAILABLE and DESTROYED ships, including a destroyed ship that has not yet
been released. A newly commissioned ship appears in its fixed roster position,
not at the end of the report. No sorting by player name, admission time, score,
or proximity is performed. These selection rules are independent of the
unresolved column layout.

The following cases specify the row sequence without choosing host fields.
All vessels not named as commissioned are AVAILABLE unless otherwise stated.
`separator` denotes the literal `----\n` line; headers and the initial newline
are separate from this sequence.

| Commissioned ships and other conditions | Row sequence |
| --- | --- |
| None | separator |
| Wolf only | separator, Wolf |
| Excalibur only | Excalibur, separator |
| Wolf admitted before Excalibur | Excalibur, separator, Wolf |
| Yorktown, Farragut, and Wolf | Farragut, Yorktown, separator, Wolf |
| Excalibur and Wolf; Farragut DESTROYED but unreleased | Excalibur, separator, Wolf |

Changing radio reception, sensor range, or the issuing player's output length
does not change any sequence above. Long output adds the header; it does not
select a different population. A commissioned ship's destruction removes its
row on the next report even before release. Recommissioning the same named
vessel restores that roster position with its new player identity.

A proposed core layout retains ship and player names and removes terminal
speed, host account, terminal identifier, and job identifier. For Excalibur
commanded by Alex and Wolf commanded by Morgan, the candidate long report is:

```text
Ship       Player
Excalibur  Alex
----
Wolf       Morgan
```

The candidate begins with a newline, uses a ship-name field padded to ten
characters followed by one space and the player's name, and ends every row
with a newline. Short and medium output would omit only the header. The row
order, faction separator and inclusion rules would stay unchanged. `Player`
would replace the historical `Captain` column label; this is a wording change
separate from removing host columns.

Retaining all historical columns instead requires an explicitly defined host
extension supplying their values and formats; it does not justify adding jobs
or terminals to Galaxy. Invented zeroes or blank identifiers would not preserve
the old report's meaning. Neither this candidate nor an extension contract has
been adopted. Player-name length, character set and rendering must also agree
with the eventual admission rules.

*Examples:* A commissioned distant enemy ship is included, without position.
A vessel awaiting selection is omitted. USERS is not a sensor-range query.

## 7.25. GRIPE

```text
GRIPE
```

*Syntax:* GRIPE may abbreviate to G and accepts no operands. It begins a
multiline text interaction; command words and slashes in its body are text.
Ctrl-Z ends submission. Ctrl-C cancels the interaction without submitting it.

*Semantics:* GRIPE collects player feedback. It consumes no ship resources
and completes no turn. During play, RED condition rejects the operation with
`\nYou are not permitted to GRIPE\nwhile under RED alert!\n`.
Otherwise prompt with `Enter gripe, end with ^Z` as a line of output.

### Collection and termination

The command's prompt is exactly `Enter gripe, end with ^Z\n`, with no leading
newline. Each normally completed line contributes its text and one newline to
the feedback body. Empty lines count toward the limit and are retained. Text
case, spaces, command names, and slashes are not interpreted as command syntax.

Collect up to twenty lines. After the eighteenth normally completed line, emit
`[Only 2 more message lines allowed]\n`. After the twentieth, emit
`[Too many lines -- end of gripe]\n` and finish collection without requesting
another line. Despite its wording, this last message does not mean the twentieth
line was discarded: that line is included in the submission.

Ctrl-Z terminates collection before the normal line-count warning for its
line. If that final line contains text, include the text and a newline. If it
is empty, add nothing. Ctrl-Z before any first-line characters submits nothing;
a previously completed blank line is sufficient to make the body nonempty.
Thus an empty Ctrl-Z response after a completed line does not append a second
newline. A Ctrl-Z-terminated eighteenth or twentieth line does not emit that
line's warning, although earlier warnings remain visible.

Ctrl-C discards the entire draft, including completed lines; an interrupted
draft is not a partial submission. The collection operation creates no
success acknowledgement. Input echo and editing output are separate from the
prompt and warnings specified here. A collected body is a request for external
submission, not proof that a destination has accepted it.

### Collection examples

In this table, ENTER completes a line; Ctrl-Z and Ctrl-C terminate the current
input interaction. The prompt precedes every example unless the ship is RED.
Body strings use `\n` for a newline; the control keys are not body characters.

| Input after the prompt | Collected result | Additional command output |
| --- | --- | --- |
| Ctrl-Z immediately | No submission | None |
| ENTER, then Ctrl-Z | Body `\n` | None |
| `MOVE failed / please investigate`, then Ctrl-Z | Body `MOVE failed / please investigate\n` | None |
| `first`, ENTER, `second`, Ctrl-Z | Body `first\nsecond\n` | None |
| Any completed lines, then Ctrl-C | Discard the entire draft | No cancellation acknowledgement |
| Twenty blank lines, each followed by ENTER | Body consisting of twenty newlines | Warning after line 18; limit message after line 20 |
| Nineteen completed lines, then `last` and Ctrl-Z | Nineteen lines followed by `last\n` | Earlier line-18 warning only |

These examples specify collection, not destination delivery. Cancellation does
not retract a warning already displayed. After automatic termination at twenty
lines, no twenty-first line belongs to this GRIPE interaction.

> Reviewer note — feedback destination (C-011): Define submission as an
> explicit external interaction, including metadata and failure reporting;
> do not make a local file part of Galaxy. The historical collector prepends
> feedback to a file with host-status metadata. That architecture is not
> adopted. Character-level editing, replay and maximum input-line length remain
> shared input/output work; the collection rules above start with edited lines.

> Reviewer note — information activity (C-002): Like HELP, historical GRIPE
> temporarily changes the ship's board visibility. The pure visibility and
> vulnerability rule remains unresolved; it is not an implicit side effect of
> accepting feedback text.

*Example:* A feedback line `MOVE failed / please investigate` is one text line,
not a MOVE command followed by another command.

## 7.26. QUIT

```text
QUIT
```

*Syntax:* QUIT may abbreviate to Q. Confirmation is a separate input response;
QUIT YES is not the combined form of this dialogue.

*Semantics:* During play, request confirmation with
`\nDo you really want to quit? `, without a terminating newline. A YES response
confirms departure; any other response resumes command acquisition without
departing. The explicit command has no RED-alert rejection. This differs from
the historical interruption gesture while RED and must not be conflated with it.

An empty confirmation or a response other than YES declines departure. It does
not prompt again or report an invalid answer. A declined QUIT itself changes
no ship property, score, tractor link or pending recipient set. Resuming command
acquisition can still deliver pending notices or perform its fatal-condition
checks; declining QUIT does not suspend those independent operations.

Confirmed departure reports final points using Section 9.3's full selection,
without committing pending awards, before releasing the ship under
Section 9.2, including discarding its pending combat and radio deliveries.
Departure does not complete an additional
turn merely to commit pending scores. The vessel's roster identity remains
available for later commissioning; the player's departing commission ends.

### Departure sequence

For an accepted in-game confirmation:

1. Produce final POINTS for the departing ship, Federation, Empire, and, when
   enabled, Romulan statistics. Use committed scores and the player's current
   output length. Romulan statistics are included even when no Romulan vessel
   is present. This is the final report selection, not a repetition of the
   player's last POINTS operands.
2. Release the ship using Section 9.2. Breaking an existing tractor link
   creates its release notices before the departing commission's pending
   deliveries are discarded. The linked ship's notice remains eligible.
3. End this commission's command interaction. Do not emit its next command
   prompt or append an additional QUIT farewell message.

Reporting precedes release so that the departing commission remains available
as the report subject. Neither step commits pending awards. Release also does
not revoke outgoing radio messages that other recipients have yet to receive.

Before commissioning, QUIT leaves the pre-game interaction without confirmation,
final POINTS or ship release: there is no current commission to report or free.
Whether the surrounding application closes, returns to a menu or offers another
entry interaction is outside the meaning of QUIT. This does not grant a right
to resume a previously ended commission.

### Departure scenario

The following cases distinguish prior input from the fresh confirmation. Each
in-game invocation first emits `\nDo you really want to quit? `. A waiting or
declined invocation emits nothing further itself; a confirmed invocation
appends the final report and releases the ship, without a farewell.

| Initial input | Fresh response | Result |
| --- | --- | --- |
| `QUIT YES` | Not yet supplied | Wait; the inline YES does not confirm |
| `QUIT/YES` | Empty response | Decline; the earlier slash segment was discarded |
| `QUIT` | `NO YES` | Decline; only the first response token determines the result |
| `QUIT` | `YESPLEASE` | Decline; this is not an affirmative spelling |
| `QUIT/NO` | `Ye` | Report and release; the fresh response controls departure |
| `QUIT` | `YES NO` | Report and release; the later token does not negate YES |

These results also apply under RED. Waiting for confirmation does not itself
complete a turn; interruption and intervening autonomous activity are separate
questions, not specified by this sequential dialogue.

Suppose Excalibur is commissioned, linked to Farragut, and has 100 committed
PLANET_CAPTURE points plus 50 pending points. Both faction report denominators
and Excalibur's stardate are positive, so this example does not depend on the
zero-denominator decision. A radio message has original recipients Excalibur
and Farragut, and both remain pending.

After QUIT and an affirmative response, the final personal report includes the
100 committed points, not 150. Excalibur then becomes AVAILABLE with null
position, zero energy and no tractor link. Farragut's link also becomes null,
but Farragut retains its position and its commission. The radio message retains
both original recipients and only Farragut as a pending recipient. Excalibur's
pending deliveries, including its own link-break notice, are discarded without
being shown as part of release. No additional stardate or score commitment is
performed. The retained 50 pending points are not thereby credited to a later
commission; commissioning must establish that commission's initial values.

If the response instead declines departure, none of those QUIT state changes
occurs and no final POINTS report is produced. Subsequent command acquisition
remains a separate operation.

> Reviewer note — departure lifecycle: Section 9 defines final reporting before
> release and direct-departure notification discards. Zero-denominator POINTS
> behavior, concurrent release and re-entry eligibility remain open. A host disconnect historically
> bypasses the confirmation, but disconnect is not a typed YES response.
> Do not prescribe process termination as the abstract meaning of departure.

*Examples:*

- QUIT followed by NO leaves the commission in place and consumes no turn.
- QUIT followed by YES produces final points before release.
- A player under RED may explicitly request QUIT; the HELP refusal rule does
  not apply to it.
