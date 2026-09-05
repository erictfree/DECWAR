# Game semantics

Status: these clauses have been read directly from Austin. Combat notifications,
exact numeric execution and complete scoring remain under review. Formulas use
STATE-4's integer quanta; REAL
expressions retain U-NUMERIC until their finite arithmetic is fully specified.

## GAME-SHIELD — Deflector shields

UP fails only when shield-device damage is greater than 3000. Otherwise set
shields up, reduce engine energy by 1000 but not below zero, report the result,
and break an existing tractor beam. This charge applies even if shields were
already up. Exactly 3000 damage does not reject UP. DOWN sets shields down and
reports it without an energy charge.

For TRANSFER with entered integer A, let T initially be `10×A`. Apply these
steps in order, using current energy E and shield strength S:

1. Set `T = min(T, (1000−S)×25)`.
2. If `T >= E`, request confirmation. Continue only for a YES match; otherwise
   report cancellation and return with no transfer.
3. If `−T > S×25`, set `T = −25×S`.
4. If `E−T > 50000`, set `T = −(50000−E)`.
5. Set `S = S + truncate(T/25)` and `E = E−T`.
6. Report the transfer. If S is nonpositive, set shields down. Set condition
   yellow for E below 10000, otherwise green.

These steps do not clamp positive transfer to available energy after confirmation.
A transfer can therefore leave no energy; command acquisition handles that state.
The later acquisition check uses an inclusive 10000 yellow threshold, distinct
from the transfer's immediate condition update. This command does not take the
main turn-accounting path.

**Evidence:** [SHIELD](../../legacy/utexas/DECWAR.FOR#L3739).

## GAME-ENERGY — Energy transfer between ships

Resolve the first matching ship name in roster order. Reject, in order: unknown
ship, the acting ship itself, an unoccupied ship, an opposing ship, or a ship not
within distance 1. Let Q be ten times the entered amount. Reject Q greater than
or equal to the sender's energy, then reject Q nonpositive.

Compute received amount `R = min(INT(Q×0.9), 50000−recipientEnergy)` using the
specified REAL multiplication/conversion (U-NUMERIC). Deduct
`R + truncate(R/9)` from the sender and add R to the recipient. The charge is
based on the capped received amount, not automatically the whole requested amount.
Report success and enqueue an energy-transfer notification for the recipient.
This command does not take the main turn-accounting path.

**Evidence:** [ENERGY](../../legacy/utexas/DECWAR.FOR#L1009).

## GAME-REPAIR — Device repair

Explicit REPAIR uses mode 1 underway or mode 2 while docked. Automatic post-action
repair uses mode 3 regardless of docking. Default requested repair is respectively
500, 1000 or 300 damage quanta. An explicit integer argument replaces the mode-1
or mode-2 amount with ten times that integer. ALL instead selects the largest
current device damage.

Find maximum device damage M. If M is zero, skip changes. Otherwise cap the
requested amount above at M; there is no general lower bound of zero. For each
of the nine devices set damage to `max(oldDamage−amount,0)`. Consequently a
negative requested amount can increase damage; it MUST NOT silently be rejected
as invalid by a conforming implementation of this clause.

For explicit repair with damage present, compute a completion deadline before
performing repairs: `elapsedNow + truncate(amount×8/mode)`. After changes and any
requested DAMAGE report, set remaining pause to deadline minus current elapsed
time. If that remainder is nonpositive, return through the no-turn alternate
path; otherwise use the normal path in EXEC-3. The no-damage path starts with a
zero deadline. Automatic repair sets no separate pause and does not recursively
perform another automatic repair.

**Evidence:** [REPAIR](../../legacy/utexas/DECWAR.FOR#L3190),
[main completion paths](../../legacy/utexas/DECWAR.FOR#L237).

## GAME-DOCK — Docking and replenishment

Let F be twice the number of surviving friendly bases within distance 1 plus
the number of friendly planets within distance 1. If F is zero, diagnose no
adjacent installation and take the no-turn path. Also abort if the ship is no
longer occupied when the update is reached.

In order, replenish torpedoes by `5×F` capped at 10, engine energy by `5000×F`
capped at 50000, shield strength by `100×F` capped at 1000, and reduce hull damage
by `500×F` with a floor of zero. If already docked, reduce hull damage by that
amount a second time. Set docked, restore life-support reserve to 5 and set green
condition. Emit the docking report and optional STATUS report.

The pause deadline was computed on command entry as
`elapsedNow + slowTerminalClass×1000 + 1000`; remaining pause subtracts the
elapsed time after reports. Normal completion follows EXEC-3, including the
ordinary automatic device repair. Shield mode is not raised by this operation.

**Evidence:** [DOCK](../../legacy/utexas/DECWAR.FOR#L893).

## GAME-SCAN — Scans also acquire information

GRAM-6 determines the displayed rectangle. In addition to rendering cells,
scan every planet within distance 10 of the acting ship and mark it known to
that team. Do the same for surviving enemy bases. These knowledge updates use
distance 10, not the smaller requested display rectangle. A narrow or directional
scan can therefore acquire information about objects not drawn in its rectangle.

WARNING requests markers for enemy planets and enemy bases; the relevant marker
radii are 2 and 4 respectively. Rendering and clipping those marks are terminal
rules. Ordinary scan does not consume a main-loop turn or energy.

**Evidence:** [SCAN](../../legacy/utexas/DECWAR.FOR#L3527).

## GAME-MOVE — Movement validation and charges

MOVE requires warp-device damage below 3000; IMPULSE requires impulse-device
damage below 3000. On passing that check, compute a deadline
`elapsedNow + slowTerminalClass×1000 + 1000` and draw `I(4000)` for possible
speed damage before requesting coordinates.

After resolving a nonzero displacement, set green condition and clear docking.
Let D be the maximum absolute coordinate displacement. If computer damage is
at least 3000, draw a deflection `(R()−0.5)/2`; otherwise use zero deflection.
IMPULSE requires D exactly 1. MOVE rejects D greater than 6, and rejects D
greater than 3 if warp damage is positive. These rejection paths retain earlier
state changes and consumed draws.

For otherwise valid MOVE of distance 5 or 6, draw `I(100)`. Warp overheating
occurs for a result above 90 at distance 5 or above 80 at distance 6. Add the
previously drawn speed damage to warp damage and continue movement; this is
not a command rejection.

Trace the path using GAME-PATH. Charge `40×D×D` energy,
doubled with raised shields and tripled when a tractor association is present.
The charge uses intended distance D even if an obstacle prevents the full move.
If the final empty location differs, update the ship's board occupancy and
position under the public lock. After releasing that lock, move a tractored
partner according to the trace displacement. Report an obstruction if present
and compute remaining pause from the entry deadline.

**Evidence:** [MOVE/IMPULS](../../legacy/utexas/DECWAR.FOR#L2141).
When towing, after moving the actor and releasing board exclusion, save the
partner's current board code. Write that code to
`(newV−INT(stepV), newH−INT(stepH))`, then clear the partner's old cell. Assign
the partner's stored coordinates using `INT(newV−stepV)` and
`INT(newH−stepH)`. Subtraction before conversion is significant: these stored
coordinates can differ from the cell just written for fractional steps.
The destination is not separately collision-checked. Writing before clearing
also matters if the partner's old cell equals the written cell. These source
operations MUST NOT be replaced with a general collision-free towing rule.

**Open:** board-exclusion interleavings remain part of the execution review.

## GAME-TRACTOR — Beam acquisition

After OFF/no-argument release handling, acquisition rejects an existing beam
on the actor, unknown name, self, enemy, unoccupied target, nonadjacent target,
a target already in a beam, actor's raised shields, then target's raised shields,
in that order. On success associate each ship with the other and enqueue a beam
notification to both. Acquisition does not consume a main-loop turn.

Release clears both associations and notifies both endpoints when invoked with
a valid endpoint. The user-command path's missing formal argument remains
U-TRACTOR-ARG; the valid internal release operation does not resolve that defect.

**Evidence:** [TRACTR/TRCOFF](../../legacy/utexas/DECWAR.FOR#L4432).

## GAME-BUILD — Planet construction

Require a location at distance at most 1 containing a planet owned by the acting
side. If it already has four builds and the side has ten active bases, reject
before incrementing it. Otherwise increment the build count B and add `500×B`
to pending base-construction score. For fewer than five builds, report the count.

At the fifth build acquire planet-update exclusion. Failure reports a busy crew
and takes the abort path after the count and pending score have changed. If the
lock succeeds but no inactive base slot is found, decrement the build count,
release exclusion and report the base limit; the earlier pending-score addition
is not explicitly undone.

On finding a slot, add another 2500 pending construction points, increment the
side's base count, transfer the planet's discovery state to that slot, remove the
planet record, release exclusion, and create the base at the former planet
location with strength 1000. Report the conversion. The deadline established
before input was `elapsedNow + slowTerminalClass×1000 + 4000`; set pause to its
remaining time. Normal completion includes EXEC-3's repair/accounting path.

Planet-record removal may compact identities; callers must preserve specified
references rather than treating original array positions as permanent planet IDs.
GAME-REMOVE defines compaction and its world-end check.

**Evidence:** [BUILD](../../legacy/utexas/DECWAR.FOR#L523).

## GAME-CAPTURE — Planet capture

Require an adjacent neutral or opposing planet; reject a planet already owned
by the actor's side. Acquire planet-update exclusion; a failed attempt rejects
capture. Save old owner and build count B, make the prescribed discovery updates,
and decrement the former side's captured count when applicable. Increment the
capturing side's count.

Set defensive phaser strength to `50 + 30×B`, extend the entry deadline by
`1000×B`, deduct `500×B` engine-energy quanta and reset builds to zero. Release
planet exclusion, change board ownership, then apply the planet's defensive hit
to the capturing ship. The defensive hit uses the former planet identity and
ownership for its notifications and score credit. Capture can succeed and still
kill the actor; ownership is not rolled back on that account.

Add 1000 pending capture points, emit the capture/hit reports and use the
remaining time to the deadline (initially entry elapsed time plus 5000). A fatal
capture reports the faction-specific death text but retains the normal return
path; subsequent accounting and death detection follow their separate rules.
GAME-DAMAGE defines the defensive damage calculation.

**Evidence:** [CAPTUR](../../legacy/utexas/DECWAR.FOR#L600).

## GAME-RADIO — Radio controls and recipient filtering

RADIO OFF adds the actor to the shared radio-disabled set; ON removes it. GAG
adds a named ship to the session's gag set and UNGAG removes it. These are
separate controls: gagging a sender does not turn off the whole radio.

A player's TELL first requires radio damage below 3000, then turns the sender's
radio on before asking for or validating recipients. Recipient resolution is
GRAM-12. Named ships and matched groups contribute a union of recipients; group
membership is filtered to currently occupied ships. For each selected recipient,
remove it if its radio is critically damaged, it is no longer occupied, or its
radio is off, with the corresponding diagnostics. Exclude the sender itself.
Clear the sender's gag selections for all remaining recipients. If none remain,
report no recipient and return; otherwise acquire the body and enqueue it.

An invalid or cancelled TELL may therefore already have turned radio on. Do not
roll back that effect. Delivery-time gag handling and queue exhaustion are
separate from recipient selection and remain to be specified in EXEC's queue rules.

**Evidence:** [RADIO](../../legacy/utexas/DECWAR.FOR#L3129),
[TELL](../../legacy/utexas/DECWAR.FOR#L3977).

## GAME-LIST — Selection, knowledge and ordering

Use GRAM-11's ordered group parsing. For a candidate, compute distance from the
actor's saved position. Candidates within distance 10 or on the actor's side
are eligible for detailed consideration; privilege can also admit out-of-range
candidates, marking that reason separately. Otherwise discovery state must allow
the candidate, except that a whole-game summary may include an unknown candidate
without permitting its detailed listing. Apply the requested range to the normal
eligible path. Out-of-range enemy ships/Romulans print an out-of-range label in
place of coordinates/strength when their named or whole-game selection permits
an entry; visibility of an identity does not imply visibility of its position.

CLOSEST excludes the acting ship. Consider Romulan first, then player roster,
then Federation/Empire bases in slot order, then planets in current record order.
An equal-distance candidate replaces the previous closest: ties go to the last
eligible candidate encountered. Output that chosen location through the specific-
coordinate path. No generic stable-first nearest-neighbor selection may replace it.

Accumulate selected detail/summary flags across groups. Final grouped output is
Romulan, ships in roster order, bases by side/slot, then planets. Listing a base
or planet updates that team's discovery state unless it was admitted only by
privilege. Summary-only access does not automatically reveal its location.
The specific-coordinate and named-object paths can output before this final pass.

Object detail flags opposing-side entries with `*` except in TARGETS, which
omits that marker. In-range ship detail includes signed shield strength; base
detail includes strength when not out of range; planet detail includes nonzero
build count. The full output assembly and unusual alias/duplicate conditions
remain open; these selection rules are not a complete LIST output specification.

**Evidence:** [LSTFLG](../../legacy/utexas/DECWAR.FOR#L1750),
[LSTUPD](../../legacy/utexas/DECWAR.FOR#L1922),
[LSTOUT/LSTSUM/LSTOBJ](../../legacy/utexas/DECWAR.FOR#L1959).

## GAME-REPORTS — Status, users, time and preferences

STATUS reports the acting ship's state under GRAM-10, including absolute location
regardless of its coordinate-output default. Shield status encodes mode through
the sign of strength. Radio status reports damage before considering the radio-off
set. DAMAGED-device reports preserve device order and selected output verbosity.

USERS iterates the whole roster, emits the faction divider at slot 10, and reports
occupied ships using the six-field identity presentation in all verbosity modes.
Long output adds headings. Privilege adds location. Do not assume short output
uses the commented two-field branch. TIME reports elapsed world time, and when
aboard, elapsed ship time and CPU time since commissioning, then session CPU time
and current time of day. Clock/account identifiers are explicit host inputs.

SET changes the selected preference immediately. ROMOPT enables future Romulan
activity; ENDFLG invokes world termination; BHREMV clears all black-hole cells
in increasing V then H order. These starred-policy switches require privilege.
SET NAME consumes the remaining raw line, converts at most 12 characters to the
source's six-bit display repertoire and updates the session's public name if
nonblank. SESSION-7 defines repertoire and empty-name handling; pregame cross-field
effects remain unresolved. This is distinct from choosing a roster identity.

**Evidence:** [STATUS](../../legacy/utexas/DECWAR.FOR#L3860),
[DAMAGE](../../legacy/utexas/DECWAR.FOR#L783),
[USERS](../../legacy/utexas/DECWAR.FOR#L4600),
[TIME](../../legacy/utexas/DECWAR.FOR#L4066),
[SET](../../legacy/utexas/DECWAR.FOR#L3624),
[USRNAM](../../legacy/utexas/WARMAC.MAC#L3419).

## GAME-POINTS — Score reporting domain

GRAM-10 chooses columns. For the ordinary initialized reporting path, display
selected columns in order: acting ship, Federation, Empire, Romulan. Visit the
eight score categories in their fixed order and omit a row only when every
selected value is zero. Sum the displayed category values for each selected
column, then report totals, commissioned counts for faction/Romulan columns,
per-commission averages and per-turn averages. Averages use integer division
before fixed-point display; zero divisors remain U-ZERO-AVERAGE.

Pending per-action score changes are accumulated by EXEC-4, not implicitly
flushed just because POINTS is requested. Source alias effects through formatting
calls and final entry's uninitialized loop are not resolved by this mathematical
summary (U-FINAL-POINTS and U-NUMERIC). No complete final-score conformance claim
is possible until those effects or a separately named repair policy are specified.

**Evidence:** [POINTS](../../legacy/utexas/DECWAR.FOR#L2893),
[score accumulation](../../legacy/utexas/DECWAR.FOR#L262).

## GAME-PATH — Sector traversal

A trace takes a starting coordinate, a nonzero intended displacement, an integer
number of steps and a REAL deflection. It returns the last unobstructed location,
a final probe location, an obstruction code, and a REAL step vector. The same
algorithm serves movement and torpedoes; a torpedo's step count need not equal
the distance to its entered target.

Choose the axis with larger absolute displacement as the dominant axis; ties
choose V, the first coordinate passed by the callers. Its step is +1 or −1 in
the intended direction. The other step is its intended displacement divided by
the absolute dominant displacement, plus deflection. Initialize last unobstructed
location and both running coordinates to the starting location, and obstruction
to zero.

For each step:

1. Advance the dominant coordinate by its signed unit. If outside the galaxy,
   stop, returning the last unobstructed location as the probe and zero obstruction.
2. Add the nondominant REAL step to its running coordinate C. Let
   `Q = remainder(INT(C×100),100)`. If `abs(Q−50) < 10`, probe both `INT(C)` and
   `INT(C)+1`, in that order. Otherwise probe only `INT(C+0.5)`.
3. For each selected candidate, first check galaxy bounds with the advanced
   dominant coordinate. An out-of-bounds candidate ends the trace as in step 1.
   A positive board code ends the trace at that candidate with that obstruction;
   the last unobstructed location remains unchanged. Nonpositive codes pass.
4. If both candidates passed, choose the new nondominant coordinate as
   `INT(C+R())`, consuming one draw. If only one was tested, use `INT(C+0.5)`
   without a draw. Set the last unobstructed location to this result and the
   advanced dominant coordinate.

After all steps, return the last unobstructed location as the final probe and
zero obstruction. Retain the step vector for displacement and towing. The
strict, quantized threshold in step 2 governs; it is not a continuous inclusive
“between .40 and .60” test. All REAL operations retain U-NUMERIC.

**Evidence:** [CHECK](../../legacy/utexas/DECWAR.FOR#L699),
[CHKPNT](../../legacy/utexas/DECWAR.FOR#L762),
[caller coordinate order](../../legacy/utexas/DECWAR.FOR#L2141).

## GAME-PHASERS — Phaser firing

Reject phaser-device damage at least 3000 before requesting a target. Apply
GRAM-5; choose the bank with the earliest readiness deadline, choosing bank 1
on a tie. Resolve the target cell before waiting. Reject a nonexistent or
unsupported target, an unoccupied ship, the actor's own location, an allied
ship/base/planet, then distance greater than 10, in that order.

Wait until the chosen bank's deadline. Default strength is 200; if explicitly
supplied, require 50 through 500 inclusive. An invalid strength can therefore
be rejected after a bank wait. With raised shields, deduct 2000 engine-energy
quanta for high-speed shield control without changing shield mode. There is no
check requiring enough energy for this charge or the later firing charge.

Draw `I(100)`. If its product with strength exceeds 18900, report overheating
and add `750 + (I(100)×strength×7.5)/100` to phaser-device damage, converting at
the integer assignment. Continue firing. This new damage participates in the
shot's damage calculation and subsequent bank deadline.

For a planet, draw `I(100)`. Let `Q = I(100)×strength` for that draw and
`D = 25×distance`. Reduce builds by one, with a floor of zero, when
`truncate(Q/D) > 150`. This phaser path does not
destroy the planet when builds reach zero. For a ship or base use GAME-DAMAGE.
For a Romulan use its separate damage rule, still under review. Notify according
to the target-specific recipient selection; base help and destruction calls are
additional events, not replacements for the hit report.

After the hit, deduct `10×strength` engine-energy quanta, set the actor's
condition red, and set the chosen bank deadline to
`elapsedNow + (slowTerminalClass+1)×1500 + currentPhaserDamage`. Use EXEC-3's
weapon completion path, without automatic device repair. No rollback applies
if the resulting energy is nonpositive.

**Evidence:** [PHACON](../../legacy/utexas/DECWAR.FOR#L2647).

## GAME-TORPEDO — Burst execution

Reject torpedo-device damage at least 3000, then empty inventory, before acquiring
the burst. Apply GRAM-5. Check every stored target against the actor's current
location and range 10 before firing any torpedo. Wait until the previous burst's
readiness deadline; initialize accumulated delay to zero and set condition red.

For each torpedo, record the current shooter position and shield state. If a
previous torpedo misfired, stop the burst before another shot. Otherwise:

1. Draw deflection `(R()−0.5)/5`. If torpedo or computer damage is positive,
   add `(R()−0.5)/10` using a further draw. With raised shields add
   `shieldStrength×(R()−0.5)/10000` using another draw.
2. Recompute displacement from the current shooter position to this target.
   If zero, report the own-location error and finish. Deduct one torpedo only
   when not docked; docked firing still requires and validates inventory on entry.
3. Draw `I(100)`. Above 96 is a misfire: report it, add `(R()−0.5)/5` to
   deflection and mark the rest of the burst cancelled. Draw `I(5)`; on 5,
   add `500+I(3000)` to torpedo-device damage and report the damage. The
   misfired torpedo still proceeds through the following steps.
4. Set trace length to `8+INT((R()−0.5)×4+0.5)`. Add
   `(slowTerminalClass+1)×1000 + currentTorpedoDamage` to accumulated delay.
   Trace with GAME-PATH. No obstruction is a miss at the final probe location.
5. With an obstruction, consume `I(100)` even when the obstructing object is
   not a star. For a star, above 80 reports no nova; otherwise report a nova,
   subtract 500 from pending star-destruction score, and invoke star explosion.
   A black hole absorbs the torpedo. Allied ships, bases and planets receive
   the friendly-target notification without combat damage.
6. An opposing ship or base receives GAME-DAMAGE. A ship's tractor association
   is released after its hit notification, even if the torpedo was deflected.
   Romulan damage/displacement uses its separate rule. An opposing or neutral
   planet follows the planet rule below.

For a planet, acquire planet-update exclusion. If acquisition fails, emit the
source's “torpedo tubes are empty” diagnostic and take the alternate return;
this failure does not reach the ordinary burst-deadline update. On success,
draw `I(4)`; on 4 decrement builds. Negative builds destroy the planet: subtract
1000 pending planet-destruction points, clear its cell and remove its record.
Release exclusion and send the hit notification. Removal can invoke world end
before these later steps.

At ordinary burst completion, including a misfire or own-location stop, set
readiness to `elapsedNow + accumulatedDelay` and take the weapon turn path.
This delay is the sum of launched torpedoes' delays, not a wait after each shot.
Earlier inventory changes, random draws and hits survive later burst cancellation.

**Evidence:** [TORP](../../legacy/utexas/DECWAR.FOR#L4228).

## GAME-DAMAGE — Ship and base hit calculations

This clause describes the shared phaser/torpedo damage calculation. Let S denote
the target's integer shield/base strength. Damage quantities H and random values
below are REAL until an indicated integer assignment. Every assignment converts
its whole expression; implementations MUST NOT move a truncation through an
addition or subtraction. Finite operations and compound-condition random draw
ordering remain U-NUMERIC and U-EVALUATION.

A torpedo first returns without changing the target if ship hull damage is at
least 25000 or engine energy is nonpositive, or if base strength is nonpositive.
The phaser entry has no equivalent early guard.

For a torpedo, draw A, B and C in that order and set raw hit `4000+4000×C`.
For a ship with shields down, H is the raw hit. Otherwise compute
`B−S×0.001×A+0.1`. If nonpositive, the torpedo is deflected: set H to zero,
reduce S to `INT(max(REAL(S)−50×B,0))`, and skip critical-hit calculation and
hull/energy damage. Continue the post-hit condition, destruction and displacement
steps. Otherwise set `H = rawHit×(1000−S)×0.001`, then assign
`S = INT(S−(rawHit×max(REAL(S)×0.001,0.1)+10)×0.03)`.
Clamp ship strength below at zero; this initial base assignment has no such clamp.

For a phaser, draw B, then C. Let F be the source exponentiation operation on
`0.9+0.02×C` to the integer target distance. If a player ship is firing and
its phaser or computer has any damage, multiply F by 0.8. For a ship with
shields down, `H = F×80×firingStrength`. For a shielded ship or base, first set
`H = (1000−S)×F×0.001×40×firingStrength`, then assign
`S = INT(S−(F×40×firingStrength×max(REAL(S)×0.001,0.1)+10)×0.03)`.
Again clamp ship strength below at zero only.

For an undeflected hit, save integer reported damage `INT(H)`. If
`H×(B+0.1)` is below 1700, proceed to ordinary damage. Otherwise the compound
condition tests `I(5)=5` together with whether the target is a base. A qualifying
base enters critical-base handling immediately. A ship halves H, selects device
`INT(9×R()+1)`, adds H to that device's damage with conversion at assignment,
and records `INT(H)` critical damage. Selecting shields lowers them. Then add
`(R()−0.5)×1000` to H and replace reported damage by `INT(H)`.

Ordinary ship damage assigns `hull = INT(hull+H)` and
`energy = INT(energy−H)`. Ordinary base damage assigns
`S = max(INT(S−H×0.01),0)`. Lower ship shields if strength is nonpositive.
Credit damage to the applicable pending enemy-ship or enemy-base category for
ship attacks; Romulan attacks use its score record. The credited addition uses H,
converted at assignment, rather than substituting the previously saved report.

Set a ship victim's condition red. Hull at least 25000 or energy at most zero
marks destruction. A surviving torpedo victim, including a deflection, undergoes
GAME-DISPLACE; a phaser victim does not. On destruction clear the ship's cell
and occupancy and credit 5000 kill points to an attacking ship. Distinct caller
rules decide whether allied attacks can reach this routine.

A base with positive remaining strength returns unless it entered critical-base
handling early. Critical-base handling subtracts `50+INT(100×R())`, records a
critical hit, and tests `I(10)=10` or nonpositive strength for destruction.
On destruction perform docking re-evaluation, decrement the faction's base count,
credit an attacking ship 10000 in the base-damage category, clear the cell and
set strength to zero. This kill credit shares the base-damage category.

The source also carries hit-report working fields between entry points and
notification calls. Their initialization, exact recipient sets and reset behavior
remain obligations of the queue/output clauses; this calculation alone does not
constitute complete combat conformance.

**Evidence:** [TORDAM/PHADAM](../../legacy/utexas/DECWAR.FOR#L4089).

## GAME-DISPLACE — Blast displacement

Use the trace's REAL step vector, not an independently chosen compass direction.
For each coordinate assign `candidate = INT(current+step)`. Return unchanged
unless the candidate is inside the galaxy and exactly distance 1 from the current
location. If its cell is empty, clear the old cell, write the object's code to
the new cell, update its coordinates, and record displacement. A displaced player
ship becomes red and undocked. An occupied non-black-hole cell prevents movement.

A black-hole destination clears the old cell and records displacement and a
black-hole death, without replacing the black hole. A ship receives fatal hull
damage and loses occupancy; a base's strength becomes zero; a Romulan ceases to
exist. This branch records the destination for notification without updating the
object's stored coordinates. The caller performs any additional cleanup and scoring.

**Evidence:** [JUMP](../../legacy/utexas/DECWAR.FOR#L1283).

## GAME-DEFENSE — Installations and replenishment

Execution selects whether this is a player's or Romulan's automatic-action
context. In a player context, activate only the opposing faction's bases. In
Romulan context, activate both factions in Federation then Empire order. For
each faction with bases, visit surviving bases in slot order. Each attacks every
opposing occupied ship with a positive board cell within distance 4, in roster
order, using GAME-DAMAGE phasers of strength `truncate(200/playerCount)`.
After ship attacks, attack a surviving Romulan within distance 4 with the same
strength through GAME-ROM-DAMAGE. Credit the defending faction with reported
damage and 5000 for a kill. These are direct faction score updates, not the
acting player's pending score.

Planet activation visits current planet-record order. A neutral planet's compound
condition skips it when `I(2)=1`; draw evaluation remains U-EVALUATION. In player
context skip planets owned by the acting faction. For each remaining planet,
visit occupied player ships in roster order, excluding its own faction, hidden
or empty board cells, and targets beyond distance 2. Fire phasers of strength
`truncate((50+30×builds)/playerCount)`. The source passes target kind 2 for
both factions; preserve the ship index and that argument's effects rather than
rewriting this call from the victim's faction. Owned planets credit their faction
with reported damage and 5000 on destruction. Neutral planets have no owner score.

After a planet's ship attacks, attack an existing Romulan within distance 2 with
strength `50+30×builds`. This Romulan-target strength is not divided by player
count. Apply the same owner-score convention. Each hit has its own notification;
target and observer selection must follow the separate output rules.

Base replenishment is a distinct phase after attacks. In player context, visit
only opposing surviving bases and add `truncate(25/actingFactionPlayerCount)`
to strength. In Romulan context, visit both factions and add
`truncate(50/(playerCount+1))`. Cap strength at 1000. A zero increment remains
zero; do not force a minimum repair. No destroyed base is revived.

**Evidence:** [BASPHA](../../legacy/utexas/DECWAR.FOR#L375),
[PLNATK](../../legacy/utexas/DECWAR.FOR#L2800),
[BASBLD](../../legacy/utexas/DECWAR.FOR#L317).

## GAME-REMOVE — Installations and docking re-evaluation

Planet removal rejects a negative owner code or a record position outside the
current list. For a Federation or Empire planet, decrement that faction's
captured count and re-evaluate docking before removing the record. Compact later
records one place toward the start, preserving their order, coordinates, builds
and discovery information. Decrement the planet count and adjust the board
references for shifted planets. Invoke world-end detection before returning to
the caller. A host may use stable internal object identities, but must preserve
this observable enumeration order and update all source-visible references.

Docking re-evaluation visits the affected faction's docked ships in roster order.
If the faction has active bases and an adjacent surviving base exists, leave the
ship docked. Otherwise, if the captured-planet count is nonpositive, also leave
it docked: the source branches directly to the next ship in this case. If that
count is positive, search for adjacent friendly planets; leave docking unchanged
if one exists. Only after this latter search fails does the routine set red
condition and clear docking.

The nonpositive captured-count branch is a source quirk. It does not implement
a general invariant that a docked ship always has an adjacent installation.
Also preserve when callers invoke this operation: some do so before clearing
the departing installation's board cell or strength, which affects the search.

**Evidence:** [PLNRMV](../../legacy/utexas/DECWAR.FOR#L2864),
[BASKIL](../../legacy/utexas/DECWAR.FOR#L339).

## GAME-NOVA — Exploding stars

Remove the initiating star. Maintain two last-in-first-out work lists: pending
victims and pending stars. Around the current explosion, scan the clipped 3×3
square in increasing V then H. Add every ship, base, Romulan or planet location
to the victim list, recording its displacement from the exploding star. For a
neighboring star, the compound condition selects it unless `I(5)=5`; see
U-EVALUATION for calls on other cell kinds. If 29 stars are already pending,
leave the new star intact. Otherwise push its location and immediately clear its
cell. This is a limit on pending stars, not on total explosions in a chain.

Drain victims in reverse discovery order. Re-read the board at each saved
location: a prior hit may have moved or destroyed its original occupant. Apply
the nova to the object currently there only if it is a damageable kind. Use the
saved displacement as GAME-DISPLACE's step vector. When victims are exhausted,
pop the next pending star, report its explosion, subtract 500 from the initiating
actor's star-destruction score, and repeat the neighborhood scan. Finish when
both lists are empty. Do not replace this with simultaneous area damage or a
breadth-first explosion traversal.

For a ship or base, start D at 1000. Subtract shield strength for a base or a
ship whose shields are up. If D is below 200, replace it with 250; exactly 200
is retained. For ships, visit all nine devices in order and add
`INT(R()×D×4)` to each damage. Lower shields if shield-device damage reaches
3000. Set reported hit to `8×D+I(1000)` and credit enemy damage, or debit allied
damage, in the corresponding ship/base category. Romulan initiation uses its
own score record.

For a ship, add the hit to hull damage and assign engine energy to
`INT(energy−hit×R())`. If shields remain up, set strength to
`max(strength−300+I(100),0)`; lower them at zero. Clear the cell and occupancy
on fatal hull/energy; otherwise attempt GAME-DISPLACE. A player-initiated nova
credits or debits 5000 kill points directly to the faction score, not the
player's pending kill score. A Romulan-initiated kill credits its own record.
Send the hit and release any tractor association.

For a base, report a distress call if strength was exactly 1000, then set strength
to `max(strength−300+I(100),0)`. Attempt displacement if still positive.
On destruction, credit or debit 10000 in the initiating actor's base-damage
category, decrement base count and re-evaluate docking. Send the hit, clear the
base cell and send its faction's destruction call. Order matters if displacement
has put the base into a black hole.

For a Romulan, attempt displacement if it exists, then halve energy using integer
division if it still exists. Credit the resulting energy value to a player
initiator's Romulan category, or debit it for Romulan initiation. Report the hit;
if the Romulan no longer exists, also apply the corresponding 5000 kill credit
or debit. The commented random immediate-kill test has no effect.

For a planet, acquire planet-update exclusion; failure leaves it unaffected.
Subtract three builds and report the hit, displaying at least zero builds.
Negative builds destroy it: subtract 1000 planet-destruction points, clear its
cell and perform GAME-REMOVE. Release exclusion on the returning path.

**Evidence:** [SNOVA](../../legacy/utexas/DECWAR.FOR#L3807),
[NOVA](../../legacy/utexas/DECWAR.FOR#L2259).

## GAME-ROM-DAMAGE — Damage to the Romulan

A phaser hit reports integer damage
`truncate((100+I(100))×firingStrength/(10×distance))`. Reduce Romulan energy
by `truncate(reportedDamage/10)`. A torpedo instead reports
`min(I(4000),2000)` and reduces energy by the same division-by-ten rule.
Nonpositive energy removes the Romulan, clears its cell and records destruction.
Nova damage follows GAME-NOVA instead.

After a player's torpedo hit, a surviving Romulan attempts GAME-DISPLACE when
`I(10)>7`; preserve the compound-condition evaluation obligation. Player phaser
and torpedo attacks add the reported damage to pending Romulan score, plus 5000
if it is destroyed. Installations credit their factions directly. Reported damage
is not the number of energy quanta actually lost.

**Evidence:** [PHAROM/TOROM/DEADRO](../../legacy/utexas/DECWAR.FOR#L3376),
[player torpedo caller](../../legacy/utexas/DECWAR.FOR#L4370).

## GAME-ROM-TARGET — Romulan target selection

Find one candidate in each of four groups: Federation ships, Empire ships,
Federation bases, Empire bases. Rank by squared Euclidean coordinate distance,
not STATE-5's command range metric. Initialize each group's best squared distance
to 5626. A candidate replaces its group winner only on a strictly smaller value,
so equal distances retain the earlier roster/base slot. Federation ship selection
requires occupancy and a positive board cell. Empire ship selection instead
requires nonzero V and a positive board cell; it does not perform the same
occupancy test. Bases require positive strength and a nonzero cell, and their
faction must have a positive base count.

Compare group winners in the order above. Replace the current winner for a
smaller squared distance, or a tie when `I(2)=1`. These are compound conditions
subject to U-EVALUATION. Return the chosen object's position and its Chebyshev
distance for subsequent movement/range checks. Ranking distance and returned
range are deliberately different.

If a group has no qualifying object below the 5626 bound, its saved identity and
position are not initialized by this search. All-empty or sufficiently distant
cases therefore require the source's residual-state behavior; U-ROM-TARGET
tracks that gap. Do not invent a clean “no target” sentinel as core behavior.

When selecting a torpedo aim point, scan the chosen target's clipped 3×3
neighborhood in increasing V then H and substitute the first star found.
With no star, retain the object's position.

**Evidence:** [DIST](../../legacy/utexas/DECWAR.FOR#L836),
[ROMSTR](../../legacy/utexas/DECWAR.FOR#L3400).

## GAME-ROM-ACTION — Romulan scheduling and movement

Each enabled driver call increments the Romulan counter. If twice the counter
is below player count, return. Otherwise enter Romulan action context and
increment the Romulan turn count, even if no attack eventually occurs.

For an absent Romulan, wait until the counter is at least three times player
count and the compound appearance condition permits `I(5)` other than 5.
Reset the counter, place the Romulan in a randomly selected empty cell, mark it
present, set energy to `200+I(200)` and increment its commissioning count.
Notify nearby players, also including the privileged acting session. Draw
`I(5)` and invoke the Romulan TELL path on 1. Select a target and attack only
if returned range is at most 10.

An existing Romulan selects a target first. At distance at most 1 it proceeds
directly to attack. Otherwise form a proposed point one coordinate unit short
of the target on each nonzero coordinate axis, and trace toward it for
`min(distance,4)` steps without deflection. The step count is based on the
original target distance. If unobstructed, move to the trace's last empty cell.
If obstructed, for offsets 1 through the step count, first try decreasing V of
that last empty cell by the offset, then decreasing H by that offset. Take the
first legal cell with a nonpositive board code. No symmetric search in the
positive directions is performed. If no candidate succeeds, leave position
unchanged. Re-select the nearest target after this attempt.

Report position to a privileged session. If the new target is beyond range 10,
reset the counter and return; otherwise consider weapons. If both weapon
readiness deadlines are strictly later than current elapsed time, return.
Reset the counter. If both are strictly earlier than current time, choose
torpedoes or phasers with `I(2)`. Otherwise choose phasers only if their deadline
is strictly earlier; choose torpedoes in the remaining branch. Equality at a
deadline is significant and MUST NOT be normalized to a uniform ready predicate.

Romulan phasers use strength 200, GAME-DAMAGE and their target-specific
notifications, without consuming Romulan energy. Set phaser readiness to
`elapsedNow+(slowTerminalClass+1)×750`. Romulan torpedoes follow GAME-ROM-TORPEDO.
After either attack path, draw `I(10)` and invoke TELL on 1, then run base attacks,
planet attacks and base replenishment in that order under Romulan context.
No-attack returns do not run those extra phases.

**Evidence:** [ROMDRV](../../legacy/utexas/DECWAR.FOR#L3233).

## GAME-ROM-TORPEDO — Romulan bursts

A burst has at most three torpedoes and no inventory charge. Before each shot,
draw deflection `(R()−0.5)/2.5`, then check whether an earlier misfire cancelled
this shot. This order consumes an extra deflection draw on the cancelled iteration.
For a launched shot, `I(100)>96` marks a misfire and adds `(R()−0.5)/5`
to deflection. The misfired shot still travels. Trace length and per-shot delay
are the player torpedo formulas with no device-damage delay term.

An unobstructed trace proceeds to the next iteration without retargeting or a
player-style miss notification. An obstructed trace consumes `I(100)` for its
object test. Stars explode on values at most 80 and otherwise survive; a
black hole absorbs the shot. A nova that removes the Romulan returns immediately
without the normal readiness update. Ships and bases receive GAME-DAMAGE and
notifications; release ship tractor associations after the hit. This caller
sets its hit notification type back to torpedo after damage calculation.

For a planet, attempt planet-update exclusion. Failure skips to the next
iteration without retargeting. Otherwise decrement builds when the previously
consumed object-test value is at least 75. Negative builds destroy the planet,
clear its cell, subtract 1000 from Romulan planet-destruction score and perform
GAME-REMOVE. Release exclusion and notify.

After a handled obstruction, re-select the nearest attackable target. If beyond
range 10, finish; otherwise apply the neighboring-star aim substitution and
recompute displacement for the next shot. At normal completion or early
retarget/misfire stop, set torpedo readiness to elapsed time plus accumulated
launched-shot delay. This is distinct from the player's stored-target burst.

**Evidence:** [ROMTOR](../../legacy/utexas/DECWAR.FOR#L3419).

## GAME-HELP — Help and temporary board substitution

HELP while aboard rejects condition red, emitting the red-alert diagnostic without
changing the board. Otherwise, if a ship is selected, substitute a black-hole cell
at its current location before processing help. This writes object kind 10; it
is not the hidden-cell sentinel and not empty space. Keep the ship record and
occupancy. On completion, clear the control flag and restore the selected ship's
code at its current coordinates only if its occupancy still denotes a live
commission. Intervening state changes can affect restoration.

Without topics, display general instructions and the extra-topic list. With
topics, process them in input order until the end or a control flag. An asterisk
requests the main command list. Other tokens search that list first, excluding
its two privileged commands unless privilege is enabled. An ambiguous command
match is reported without falling through to extra topics. With no command match,
search CTL-C, a blank unmatchable slot, INTRO, HInts, INput, Output, PAuses and
PRegame. Report an unknown term when neither list matches.

Matched topics select a section from the help asset. A privileged session first
tries the special help binding and falls back to the standard binding if opening
it fails. If the special asset opens but lacks a section, do not silently retry
the standard asset. Asset search compares at most five characters, folding codes
above 95 by clearing the case bit, and allows the keyword to end at space or NUL.

A section begins at a dot immediately after LF or form feed. Skip the matching
keyword line and emit its following content until the next section marker or
end of file. Suppress form feeds, treating them as boundaries. Check stop controls
at line boundaries and clear them on exit. Missing sections report the requested
keyword. The initial HELP startup dialogue separately invokes general help and
all-command listing; it is not an implicit `HELP INTRO` command.

Lists print the source's padded ten-character names in table order, seven entries
per line, preserving mixed-case abbreviation cues and blank extra-topic slots.
The routine's comment says six columns, but its loop counter is seven. Newline
and fragment composition follow TERM-7.

**Evidence:** [HELP](../../legacy/utexas/WARMAC.MAC#L4134),
[HLPXTR/HLPALL](../../legacy/utexas/WARMAC.MAC#L4188),
[section reader](../../legacy/utexas/WARMAC.MAC#L4222),
[list output](../../legacy/utexas/WARMAC.MAC#L4359),
[board substitution/restoration](../../legacy/utexas/WARMAC.MAC#L4379),
[extra-topic table](../../legacy/utexas/DECWAR.FOR#L471).

## GAME-NEWS — News viewing

Open the news asset; failure reports that it cannot be read and returns. Stream
characters in asset order. After LF, vertical tab or form feed, a following dot
is a continuation boundary: consume that dot without displaying it, enable
terminal output, and prompt
`Do you want to continue viewing the news file? `.
Only a YES match continues. A dot at the beginning of the asset does not enter
this branch unless a preceding recognized line-ending character has been read.

At those line boundaries, a control/stop flag also terminates viewing. For a
live commissioned ship, reset the source activity counter during output so that
viewing does not count as input idleness. On normal end, refusal or stop, clear
the stop/control flags, close the news asset and restore prior input. NEWS does
not invoke HELP's board substitution and has no condition-red rejection here.
The text and section layout come from the selected asset, not from a rewritten
summary of historical news.

**Evidence:** [NEWS](../../legacy/utexas/WARMAC.MAC#L3811),
[news asset](../../legacy/utexas/HLP/DECWAR.NWS).

## GAME-GRIPE — Recording feedback

Reject a commissioned ship under red alert. Otherwise apply GAME-HELP's temporary
black-hole substitution and begin a new feedback record containing the source
status header. Prompt `Enter gripe, end with ^Z`. Read at most 20 command-editor
lines; Ctrl-Z ends input, Ctrl-C aborts. Report the two-lines-remaining warning
when the decremented allowance reaches two, and the limit warning at zero.
Reset activity for a live ship while reading. End accepted lines with CR/LF.
An immediate Ctrl-Z with no first-line characters aborts an empty submission;
a nonempty last line is terminated before storage.

Append the separator `----------` and CR/LF to the new record, then place the
new record before the previous feedback contents. This is prepend order, not
append order. A “being modified” result reports a retry and waits before trying
again; Ctrl-C during that wait aborts. Other open/read/allocation/write failures
follow the source diagnostics and cleanup. Storage and resource-failure events
are abstract host inputs, not a required TOPS-10 file representation.

On cleanup restore terminal output, restore the ship when eligible, and clear
the control flag. The command's recording and display do not take the main turn
path. Diagnostic and administrative callers can invoke the recording mechanism
with a supplied diagnostic body instead of prompting for user lines; their body
formats are separate from ordinary GRIPE input. The status-header helper's
argument alias remains U-GRIPE-HEADER; this clause does not claim its unrelated
caller state is unaffected.

**Evidence:** [GRIPE entry/input](../../legacy/utexas/WARMAC.MAC#L3858),
[commit/cleanup paths](../../legacy/utexas/WARMAC.MAC#L4050),
[line allowance](../../legacy/utexas/WARMAC.MAC#L474).

## GAME-TYPE — Preference and world-option reports

The main-game TYPE entry applies GRAM-10. OUTPUT reports output verbosity,
prompt style, scan format, input coordinate mode, output coordinate mode and
terminal type, in that order. Print source strings even for internal modes not
normally selectable by SET, such as BOTH input mode. Terminal type prints its two
stored five-character name fields without trimming them.

OPTION reports the stored version banner, whether Romulan activity is enabled,
and whether the black-hole option was selected. Removing all black-hole cells
through BHREMV does not itself clear that option flag. Neither report changes
preferences or takes a main-loop turn. The internal kind argument 1 bypasses
parsing to OUTPUT; kind 2 bypasses parsing to OPTION; main TYPE supplies zero.
Pregame calls omit this formal argument and remain U-PREGAME-ARG.

**Evidence:** [TYPE](../../legacy/utexas/DECWAR.FOR#L4540),
[main argument](../../legacy/utexas/DECWAR.FOR#L209),
[pregame call](../../legacy/utexas/SETUP.FOR#L121).
