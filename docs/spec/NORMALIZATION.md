# Numerical and representation normalization

This companion policy records the boundary of the forward-looking language
specification. The legacy implementations establish DECWAR's command forms and
game mechanics. They do not require a new implementation to reproduce the
PDP-10's integer, floating-point or memory behavior.

## Ordinary arithmetic

Energy, damage, percentages and elapsed durations are meaningful game quantities.
Use ordinary mathematical operations on those quantities. Do not reproduce
finite-word overflow, sign reinterpretation, compiler evaluation artifacts or
loss of fractional amounts merely because an intermediate was stored as an
integer. Small resulting calculation differences are accepted normalization.

Discrete game values remain discrete: coordinates identify sectors, ammunition
counts torpedoes, and an action can advance an integer number of stardates.
Display rounding and explicit game rounding are stated where required. A
fractional display does not prescribe an internal number representation.

## Independent values and entities

Tokens, ships, messages and other abstract values have the identities and
relationships given by the game model. Packed character values, numeric object
tags, shared memory positions and accidental overwrites do not define those
relationships. Reading a decimal token does not corrupt a previous argument.
Addressing a nonexistent recipient does not create a player or a combat event.

Historical derivations remain in the research record for understanding the old
program. They are not conformance requirements of the generalized language.

## Preserve the game

Normalization does not authorize new keywords, argument forms, commands,
weapons, resources, factions or balancing rules. Preserve costs, thresholds,
range rules, targeting, valid command interactions and established responses
in game units. Use readable pseudocode to define their state changes.

When a rule genuinely concerns the game, retain it even if it is surprising:
for example, raising already-raised shields still costs energy. When a proposed
change would alter a game rule rather than remove a numerical or representation
artifact, record the question separately instead of inventing a preferred result.

## Conversion examples

| Historical derivation | Generalized specification |
| --- | --- |
| Raising shields subtracts 1000 scaled energy quanta. | Raising shields costs 100 energy units. |
| Shield transfer increases stored strength by integer division of transferred quanta by 25. | Each 25 transferred energy units adds one percentage point of shield strength, subject to the existing capacity and confirmation rules. Fractional amounts are retained. |
| Ship-to-ship transfer rounds the received amount and its associated loss through integer conversions. | The recipient receives 90% of the transmitted energy, subject to capacity; the sender pays the received amount divided by 0.9. Fractions are retained. |
| Repair delays and damage amounts use scaled integers. | Repair uses damage units and elapsed milliseconds: 80 milliseconds per unit underway, 40 while docked. These quantities use ordinary arithmetic. |
| Decimal input resets a character-deposit allowance and can overwrite earlier argument values. | Each argument has an independent numeric value interpreted from its own spelling. |
| A packed representation encodes which captains receive a message. | The message has a set of recipient identities; game-level group membership is stated directly. |
| Path proximity rounds a fractional coordinate to hundredths before testing distance from a half-sector. | Test the mathematical fractional coordinate directly: its distance from 0.5 must be less than 0.1. Whole-sector candidate selection remains explicit. |
| Towing can compute one sector for occupancy and another for the partner's position because integer conversion occurs on opposite sides of subtraction. | Use the committed position formula, rounding the moving endpoint minus its step to whole sectors, and give that position one consistent galaxy presence. Crowded/out-of-bounds following remains unresolved, without an invented collision rule. |
| The tractor command omits a formal argument used by its release entry. | The existing OFF action uses the acting endpoint's beam and the source-defined release operation; no invalid argument access is required. |
| Score fields are displayed through the same divide-by-ten formatter as other fixed-point quantities. | Define Points in displayed units: capture 100, ship destruction 500, completed base construction 1000. Preserve rates and bonuses without scaled storage. |

**Source basis:** [SHIELD](../../legacy/utexas/DECWAR.FOR#L3739),
[token input](../../legacy/utexas/WARMAC.MAC#L1377),
[message acquisition/publication](../../legacy/utexas/WARMAC.MAC#L2963).

The additional path, towing, release and score derivations are in
[CHECK/CHKPNT](../../legacy/utexas/DECWAR.FOR#L699),
[MOVE](../../legacy/utexas/DECWAR.FOR#L2227),
[TRACTR/TRCOFF](../../legacy/utexas/DECWAR.FOR#L4432) and
[POINTS](../../legacy/utexas/DECWAR.FOR#L2893). Integer random choices still denote
finite choices named by the game rule; their generator is not a PDP-10 algorithm
requirement. Subsequent arithmetic does not truncate their fractional results.

The earlier operational chapters are retained as research outside the book
manifest. Command families and world rules are being converted into the abstract
model; the assembled book is explicitly incomplete during that conversion.
The preserved source and the running port are not changed by this policy.

## Torpedoes, novas and installation defenses

The TORP and ROMTOR path-length expression selects a whole number of sector
steps. Its intervals are stated as a finite game choice: 7 steps on [0,1/8),
8 on [1/8,5/8), 9 on [5/8,7/8), and 10 on [7/8,1). This preserves the discrete
range choice without requiring a compiler's conversion instruction. Damage,
shield reductions and nova energy halving retain their mathematical fractions.
Automatic base phasers use strength 200/playerCount, player-directed planet
phasers use (50+30*builds)/playerCount, and replenishment retains its fractional
percentage points. No rounding back to historical storage quanta is required.

SNOVA's explicit test for 29 pending stars remains a limit on outstanding
explosions, not a required stack or allocation size. Removing that limit would
change which stars survive, beyond the authorized removal of small numerical
and representation effects. The book defines the observable ordering with an
abstract sequence and preserves current-occupant resolution at each affected
position. It imposes no underlying storage structure or packed object encoding.

NOVA's severity replacement below 20, its distinction between team-only kill
credit and captain damage credit, and a neutral planet's attack decision remain
game rules. These are separate from integer quantization. Fractional coordinates
in blast displacement still require whole-sector selection; the candidate is
the floor of each coordinate sum, subject to the original range/occupancy gates.

**Source basis:** [TORP](../../legacy/utexas/DECWAR.FOR#L4228),
[ROMTOR](../../legacy/utexas/DECWAR.FOR#L3419),
[NOVA](../../legacy/utexas/DECWAR.FOR#L2259),
[SNOVA](../../legacy/utexas/DECWAR.FOR#L3807),
[JUMP](../../legacy/utexas/DECWAR.FOR#L1283),
[BASBLD/BASPHA](../../legacy/utexas/DECWAR.FOR#L317),
[PLNATK](../../legacy/utexas/DECWAR.FOR#L2800).

## Galaxy reports and scores

The LIST-family selection is expressed as object kinds, affiliations, named
identities, range and requested observations. Packed selector and output masks
are not normative data structures. The original ordered parser still determines
acceptance: a general unordered query API would accept forms the language does
not accept. A symbolic whole-game scope replaces the maximum machine integer;
an explicit numeric range remains distinct even when it spans the whole galaxy.

Knowledge sets contain installation identities, not a frozen telemetry snapshot.
The source reads current coordinates and builds for a previously discovered
remote installation; preserving that visibility does not add a new sensor rule.
Immediate exact-position/CLOSEST reports and deferred detailed reports have
different discovery effects. The spec retains this difference.

Repeated Romulan groups retain their observable summary multiplicity, expressed
as a count of qualifying selections. This requires neither a shared accumulator
nor a reference argument modified by the output formatter. It does not imply
more than one Romulan in the galaxy. Invalid name-duplicate checks and mixed
selector paths remain review items; arbitrary reads of unrelated state are not
made into a generalized rejection rule.

POINTS ratios use ordinary division in displayed score units. Internal integer
division is excluded. Zero denominators are explicitly unresolved instead of
requiring a processor exception or inventing a zero ratio.

**Source basis:** [LSTSCN/LSTFLG/LSTUPD](../../legacy/utexas/DECWAR.FOR#L1519),
[LSTOUT/LSTSUM](../../legacy/utexas/DECWAR.FOR#L1959),
[POINTS](../../legacy/utexas/DECWAR.FOR#L2893).

TYPE, TIME and USERS retain their existing report fields. Session execution
time, account identity, terminal label and session number are abstract environment
observations; their representation is deferred to the terminal/environment
binding. The core does not prescribe a process layout, packed account word or
character encoding for those fields. This is not permission to omit fields or
replace execution time with elapsed time without documenting the binding.

The pregame TYPE entry omits the routine's control argument. The generalized
command uses its ordinary switch grammar in pregame, rather than obtaining a
report choice from an invalid argument read. TYPE OUTPUT/OPTION keep their
existing meanings; no new switch is introduced.

**Source basis:** [TYPE and USERS](../../legacy/utexas/DECWAR.FOR#L4540),
[TIME](../../legacy/utexas/DECWAR.FOR#L4066),
[STAT](../../legacy/utexas/WARMAC.MAC#L2187),
[pregame TYPE invocation](../../legacy/utexas/SETUP.FOR#L121).

## ADT contracts and capture

The normative model treats GameState as an abstract data type and commands as
operations with preconditions, state effects, outcomes and observations.
Records expose semantic properties; they are not a translation of COMMON blocks.
CAPTURE now states ownership, fortification and energy postconditions and then
specifies the defensive attack as a separate ordered event. This preserves a
successful capture followed by the capturing ship's destruction without requiring
separate ownership fields, board updates or locking instructions.

CAPTUR's subtraction of 500 stored energy units per build is 50 displayed energy
units; its 1000 pending score units are 100 displayed points. The defense retains
50+30*builds strength from the former planet and former-faction attribution. The
five-second deadline begins at command entry and gains one second per build.
No energy-sufficiency check is added. Ordinary shared turn completion still follows.

The lock-failure report remains an observable surrender refusal; its complete
multiplayer precondition is unresolved. It is not converted into a random refusal
probability. CAPTUR invokes BASKIL before decrementing the former faction's count
and changing the planet owner. The contract now states that pre-capture docking
check explicitly; it does not replace it with a post-capture update. The early PRIDIS calls select notification recipients;
they are not installation discovery updates. The contract therefore does not
invent a capture-induced discovery change.

**Source basis:** [CAPTUR](../../legacy/utexas/DECWAR.FOR#L600),
[BASKIL](../../legacy/utexas/DECWAR.FOR#L339),
[POINTS](../../legacy/utexas/DECWAR.FOR#L2893).

## Preferences and message identities

SET NAME updates the captain's abstract display name, including before
commissioning. The source's pregame use of an unset ship index does not prescribe
an unrelated JOB-field overwrite. Twelve-character retention, printable-character
case transformation, whitespace handling and the one additional prompt remain
language rules. Packed six-bit encoding does not determine meanings for embedded
nonprinting input; that lexical edge case remains unresolved.

TTYTYPE's ordered matching retains the first matching profile during an ambiguous
reply, and leaves no profile after an unmatched alphanumeric reply. The model uses
an optional terminal profile for that state. Rendering with no selected profile
needs a presentation contract; no invalid table read or invented fallback is
required.

Radio messages have distinct sender identities, immutable original audiences,
and separate remaining-recipient sets. GETMSG can fail after its notification
counter led OUTMSG to expect a message; the old body buffer is retained and can
be printed again. The generalized ReceiveMessage operation returns NoMessage
instead. Counter/buffer disagreement is not a second message publication.
Likewise, OUTMSG's modulo-derived index for a Romulan sender can read BITS(0)
and alias unrelated state. A Romulan is not any player ship in the ADT, so
player-ship gag selections cannot match it by that address accident.

MAKMSG's Ctrl-C path can reach cleanup before a queue entry was reserved. The
abstract cancellation publishes nothing and does not require deletion of an
unrelated entry through a stale index. By contrast, capacity pressure after body
acquisition, including acquisition of a too-short body, preserves the documented
loss of a selected recipient's entire unread backlog. That is a bounded-service
policy with observable effects, expressed without linked-list machinery.

TELL's autonomous path also applies its gag update to the triggering captain's
radio preferences. ROMDRV changes the actor kind but retains that captain. The
autonomous contract therefore preserves recipient ungagging on that captain,
without enabling the captain's radio or modifying other captains' preferences.

**Source basis:** [SET](../../legacy/utexas/DECWAR.FOR#L3624),
[USRNAM](../../legacy/utexas/WARMAC.MAC#L3415),
[OUTMSG](../../legacy/utexas/DECWAR.FOR#L2599),
[TELL](../../legacy/utexas/DECWAR.FOR#L3977),
[message capacity](../../legacy/utexas/WARMAC.MAC#L2589),
[MAKMSG and GETMSG](../../legacy/utexas/WARMAC.MAC#L2963).

## Information activities and commission release

HELP and GRIPE explicitly call ESHP., whose body writes decimal 1000, a black-hole
sector value, and PSHP. later restores the still-active ship at its current
coordinates. This is not an unknown-cell sentinel or an overflow artifact. The
spec expresses the observable rule as a temporary sector interaction kind while
the commission and ship properties remain intact. It does not equate that state
with empty space, global pause or blanket combat immunity. Concurrent movement
and cleanup remain explicit interleaving questions. NEWS does not use this state.

HELP's section reader clears control flags on return. A stop within a section
therefore need not cancel later topics in the same HELP command; a control
observed by the outer loop between topics does stop the remaining topics. The
contract preserves that difference without exposing flags or routine calls.

Feedback is an ordered sequence of records with session context and acquired
lines. File words, allocation blocks and the time-helper write through an invalid
argument are not ADT effects. Context observes environment date/time without
writing that value into unrelated game state. Insufficient acquisition storage
and partially failed writes remain open failure cases; the new contract does not
promise atomic persistence where the source does not provide it.

Release uses an absent position rather than coordinates zero outside the 75-by-75
galaxy. The resume snapshot retains the prior ship values. Recent-player records
use opaque account/execution identities and preserve capacity ten and insertion
replacement order. A matched update does not advance replacement order. Terminal
identity alone does not match: that source branch is commented out. FORTRAN
KWAIT is zero in PARAM.FOR; the assembly constant 120000 does not impose a two-minute
wait on the FORTRAN admission path. Five-minute empty-world retention is expressed
as an elapsed duration, not subtraction of day-wrapping clock encodings.

Final POINTS takes the source's all-column selection, with Romulan suppressed
when disabled. Its jump into an uninitialized FORTRAN DO body does not impose a
compiler-specific loop traversal on the generalized operation. The existing
all-column selection and report order supply the abstract meaning; no new score
category or score commit is added. Zero-denominator ratios remain unresolved.

**Source basis:** [HELP](../../legacy/utexas/WARMAC.MAC#L4134),
[temporary sector state](../../legacy/utexas/WARMAC.MAC#L4379),
[feedback context](../../legacy/utexas/WARMAC.MAC#L2116),
[feedback failures](../../legacy/utexas/WARMAC.MAC#L4050),
[FREE/RSTART](../../legacy/utexas/DECWAR.FOR#L1082),
[history matching](../../legacy/utexas/DECWAR.FOR#L1335),
[admission constants](../../legacy/utexas/PARAM.FOR#L30),
[final POINTS](../../legacy/utexas/DECWAR.FOR#L2893).

## Admission and world lifecycle

Initial preference reports distinguish input mode BOTH from ABSOLUTE/RELATIVE,
although LOCATE interprets unqualified coordinates in that initial mode relatively.
This observable initial state is retained; it does not add a SET ICDEF BOTH form.
The commented experience-level dialogue is not part of Austin admission. CRT is
selected during admission, separately from the prior pregame terminal choice.

Faction acceptance increments NUMSHP before a ship is fully selected. CC2 cancels
the participant counts but does not decrement NUMSHP. The resulting denominator
in POINTS therefore counts that accepted-faction attempt even after cancellation.
This is an observable scoring rule, not a reason to redefine it as a count of
successfully completed commissions. KILCHK is defined but is not called by the
supplied admission path; its privilege-reset statement does not clear pregame
privilege during actual admission. The preserved code has zero FORTRAN KWAIT too.

Tournament names are abstract retained token keys; packed token words and their
absolute integer values do not become key representations in the core. The
random binding must still establish reproducibility and the effects of these
keys without inventing a numeric-seed command. Population counts use ordinary
floor operations on the source's unit-draw intervals. The hole-count draw occurs
before the hole-option reply even when no holes will be placed.

PLACE checks opposing-base positions when that faction has at least one base.
It does not check the strength of every enumerated base position, so destroyed
base locations need a separate normalization decision for later placement.
Its planet comparison tests a planet's object kind against a faction value;
ordinary planet kinds cannot match that test. The core does not invent an enemy-
planet spawn exclusion by translating the source comment instead of the code.

The world-clear range excludes DOTIME, the shared action-cycle counter. Virgin
initialization and reuse of an expired shared world are therefore distinct
review cases; the draft does not silently promise a zero action phase on reuse.
Faction scores, discoveries and cumulative faction counts do lie in the cleared
range. Individual ship score is cleared when that ship is selected.

ENDGAM's visible reports independently test both factions' base counts; with
both at zero it emits both victory reports, after total destruction if no planets
remain. The tie-breaking WHOWON/TXWHY classification feeds only the commented
standings update in this path, so it is not introduced as a new abstract winner
or score effect. The source's actual reports and release behavior remain normative.

**Source basis:** [main initialization](../../legacy/utexas/DECWAR.FOR#L1),
[admission and creation](../../legacy/utexas/SETUP.FOR#L145),
[cancellation](../../legacy/utexas/SETUP.FOR#L1),
[initial coordinates](../../legacy/utexas/DECWAR.FOR#L1423),
[preference reporting](../../legacy/utexas/DECWAR.FOR#L4560),
[placement](../../legacy/utexas/DECWAR.FOR#L2765),
[world-clear boundaries](../../legacy/utexas/HISEG.FOR#L1),
[world-end reports](../../legacy/utexas/DECWAR.FOR#L961).


## Movement, tractor and construction contracts

The type declarations in the book name semantic distinctions: Position is a
whole sector, GridPoint is a geometric point, SectorVector is an offset, and
PathResult reports the traversed endpoint and optional obstruction. They do not
map to CHECK's argument names or shared work area. CHECK receives vertical
arguments in its first formal position despite naming that position H; the book
uses the caller's vertical/horizontal meanings and retains vertical dominance
on a tie. The existing CHKPNT fractional normalization remains unchanged.

Tractor endpoints are an unordered pair of distinct ship identities expressed
as a two-member set. There is no persistent towing role; the movement command
selects an endpoint for that action. Release removes one association and clears
both references. Following uses the already-recorded normalization giving the
partner's committed position and sector presence one consistent location,
including when its resulting location equals its prior location. A different
occupied destination and an out-of-galaxy result are still unresolved; no new
collision, displacement alternative or damage is introduced.

BUILD's fifth-stage test is exact equality, not a maximum. The stage increment
and its credit precede LOCK's failure branch. If that branch retains five builds,
a later BUILD reaches six and follows the nonconversion branch, adding 300
pending points. Retain this source-derived state transition; removing it would
add a retry or cap absent from the code. Late capacity failure restores four
builds but retains the earlier 250 pending points.

Base identities form a fixed order of ten per faction. Reusing the first
available identity does not copy the previous base's discovery state:
`base(j,4,team) = locpln(i,4)` replaces it with the converted planet's knowledge.
The contract therefore replaces discovery membership for that identity in each
faction, rather than merely adding the identity to the discovering factions.

The completion bonus and nbase increment precede PLNRMV. Its ENDGAM call can
exit before the new base's position/strength and board presence are installed,
before the construction report, and before ordinary turn accounting. The book
states that a terminating conversion does not complete that turn or commit the
new pending points. The full partially completed conversion state is explicitly
open; normal completed-conversion equations do not claim that the entire source
sequence was atomic.

CAPTUR calls BASKIL before reducing the former owner's captured count or changing
planet ownership. The former planet consequently remains an eligible port during
that docking check. There is no second re-evaluation after ownership changes.
The book now states this observable ordering without prescribing count storage.

Do not infer independent per-planet locks from the callers' argument names.
WARMAC LOCK replaces its supplied address with global user code 1, and UNLOCK
releases all locks held by the caller. Whether a request fails or waits depends
on the monitor service. The contracts retain source-defined refusal outcomes
but do not turn these into random crew/diplomacy mechanics or assert a complete
multiplayer admission policy from the routine names alone.

**Source basis:** [BUILD](../../legacy/utexas/DECWAR.FOR#L523),
[CAPTUR](../../legacy/utexas/DECWAR.FOR#L600),
[BASKIL](../../legacy/utexas/DECWAR.FOR#L339),
[CHECK/CHKPNT](../../legacy/utexas/DECWAR.FOR#L699),
[movement and following](../../legacy/utexas/DECWAR.FOR#L2141),
[planet removal](../../legacy/utexas/DECWAR.FOR#L2864),
[world-end exit](../../legacy/utexas/DECWAR.FOR#L961),
[TRACTR/TRCOFF](../../legacy/utexas/DECWAR.FOR#L4432),
[LOCK/UNLOCK](../../legacy/utexas/WARMAC.MAC#L3764).


## Autonomous Romulan state and decisions

The generalized model separates the currently present Romulan (position and
energy) from RomulanActivity (cadence, turns, appearances, weapon deadlines and
accumulated score). All activity fields lie in the new-galaxy clearing range;
DEADRO removes presence without clearing them, and appearance changes only the
new ship's energy, placement, cadence and appearance count. Score is not lost
merely because the current Romulan is absent. Initial energy is 200+I(200) game
energy units; this variable is not on the player-ship energy's scaled basis.

DIST selects group minima using squared Euclidean distance and then supplies
Chebyshev range. Its initial minimum is 75*75+1, not infinity. The normative
selection contract currently covers states with an eligible candidate at squared
distance at most 5625 (Euclidean distance at most 75). With every candidate
farther away or absent, the routine reads retained/uninitialized group identities
and positions. Do not turn that into an arbitrary target in the generalized
model, or silently extend the domain by inventing idle/pursuit behavior. The
book labels this domain limit as unresolved, not as a new gameplay range rule.
Empty-group comparisons can consume draws that cannot affect the final eligible
winner; they do not require fictitious entities in the ADT.

Candidate eligibility preserves the Federation/Empire commission-test asymmetry.
A positive sector read is not a same-identity check. In particular ESHP's positive
black-hole substitution during HELP/GRIPE does not exclude the ship from DIST,
BASPHA or PLNATK. Revised the earlier general defense wording to avoid implying
immunity from that substitution. Stale positions, concurrent replacements and
negative/invalid object representations still need their broader normalization
and interleaving analysis.

ROMDRV's movement traces for min(original target range,4), even though its aiming
point is shortened by one on each nonzero axis. An obstructed trace tests lower
vertical and then lower horizontal candidates from its last clear position;
failed avoidance leaves the original position, not that intermediate point.
Its exact weapon deadline comparisons are retained, including choosing torpedoes
when the phaser deadline equals now and the torpedo deadline is still later.
These are ordered game decisions, not integer-overflow artifacts.

ROMTOR retains star-first aiming, an at-most-three-shot burst, misfire stopping
after its own shot, obstruction-specific retargeting, different accidental planet
thresholds, and per-launched-shot deadlines. The ignored deflection draw at a
cancelled post-misfire iteration does not create an extra shot or outcome.
Ordinary arithmetic retains damage fractions; the shared discrete trace-length
selection remains unchanged. Each impact uses its own destruction result, not
an unrelated earlier hit's stored flag. A self-destructive nova skips the burst's
readiness update, but the driver's later speech and installation calls remain
unless world termination has already exited.

ROMDRV runs with the triggering captain's identity and faction still available.
This establishes the autonomous TELL ungag effect on that captain's radio
preferences and BASPHA's triggering-faction ten-sector notification audience,
even when both factions' bases are activated. The Romulan has no faction
allegiance as an attacker. Its phasers consume no energy and add no player-style
heat or device penalty. Both weapon paths credit its persistent score directly.

**Source basis:** [state and clearing bounds](../../legacy/utexas/HISEG.FOR#L1),
[galaxy clearing](../../legacy/utexas/SETUP.FOR#L171),
[DIST](../../legacy/utexas/DECWAR.FOR#L836),
[ROMDRV and damage entries](../../legacy/utexas/DECWAR.FOR#L3233),
[ROMSTR and ROMTOR](../../legacy/utexas/DECWAR.FOR#L3400),
[TELL](../../legacy/utexas/DECWAR.FOR#L3977),
[BASPHA](../../legacy/utexas/DECWAR.FOR#L375),
[PLNATK](../../legacy/utexas/DECWAR.FOR#L2800).


## Player-weapon operation contracts

PHACON selects one of the captain's two PHBANK deadlines after location input,
choosing bank 1 on equality. The model now names these PhaserBank FIRST and
SECOND with a total deadline mapping, rather than an unspecified pair. Both
share one phaser-device damage value. Validation order is observable: target
kind/commission, own sector, faction and range precede the bank wait; strength
50..500 is checked afterward. No energy-sufficiency predicate or automatic
alternation is introduced. Heat notification precedes its damage increment;
new damage affects the shot and subsequent reload deadline. The completion
clock is read after hit notifications, and the other bank remains unchanged.

TORP copies only the requested number of aims, repeating the last available
pair. Extra supplied pairs are checked by LOCATE for coordinate validity but
are not part of TORP's subsequent own-sector/range loop. Own-sector failure
in that loop is a normal return with TPAUS zero: it resets the reload deadline
to now and takes the caller's no-repair turn path. Range failure is an alternate
return with no turn or deadline change. In an active burst, accumulated TPAUS
instead survives an own-sector failure. These distinctions remain explicit
semantic outcomes rather than one generic invalid-input result.

Each misfired torpedo still travels, including when its own misfire raises tube
damage to or above the entry threshold. TORP does not recheck that threshold
between shots. A last-requested-shot misfire does not suppress any remaining
shot; the request is fulfilled even though its misfire is reported. Reload delay
uses current tube damage for each launched shot. Docking suppresses consumption,
not the initial positive-inventory or count checks. An update refusal follows
consumption and tracing but skips the new deadline and normal turn; the literal
empty-tubes diagnostic does not alter inventory to match its wording.

The planet branch uses KLFLG without initializing it for each impact. Consistent
with the generalized hit model, destruction is an outcome of that impact's own
state changes; a retained result of an unrelated previous hit is not a planet
rule. The new example makes this normalization explicit. Empty/incomplete target
forms that read retained VALLST data remain outside the resolved normal grammar;
this checkpoint does not invent a repair or a definitive rejection for them.
No source buffer, common-block storage, scaled damage word or lock address is
required by the book's ADTs. Concurrent replacement, loss of actor position and
control interruption still need the broader multiplayer/lifecycle contract.

Source: Austin DECWAR.FOR PHACON 2647–2760, TORP 4228–4425, LOCATE/RELOC
1404–1535, PHADAM/TORDAM 4089–4224; main command dispatch 120–124 and 196–201
with completion 230–253. The original PHACON planet hit has no LOCK call;
this contract does not add a refusal outcome to that weapon's planet branch.


## Scan and ship-report observations

SCAN/SRSCAN now have typed requests and ScanReport observations. Marks describe
what the report discloses, rather than returning full state objects. The unique
roster initial identifies a ship; base marks disclose faction, planet marks
ownership, and neither discloses damage/builds. Black holes display blank space,
which differs from the dot for an empty sector. MARK does not replace a black
hole with a warning. A warning area observes its sectors again, so a changing
world can differ from the initially prepared scan. The source captures the scan
center before those observations; discovery uses that same center, not a later
ship position. No sensor device precondition is introduced.

The source's all-ones hidden-sector sentinel is handled defensively by SETSCN
and MARK. It is not a declared SectorObject in the generalized normal-state
model, and the examined command paths supply no player cloaking operation.
ESHP for HELP/GRIPE explicitly writes the ordinary black-hole code instead.
Retain sentinel details in companion terminal/source analysis; do not add a
concealed-ship ability or expose representation words as core scan values.

Discovery completes before SHWSCN. A stop observed after a displayed row clears
CCFLG and returns without the remaining rows or bottom labels. ScanOutcome
therefore permits a prefix report while retaining completed team discovery.
This defines that row-boundary behavior, not the entire asynchronous control
and Telnet binding. The horizontal-label loop always emits its first label;
a one-column short scan labels Hmin+1 even though that is beyond Hmax.

STATUS returns an ordered stream of observations including syntax diagnostics.
It does not use an all-or-nothing validation pass, and a non-name first argument
does not select the no-argument default. DAMAGED radio status masks the reported
on/off state without changing it. Hull damage is separate from device damage;
equivalent shield energy derives from strength even when shields are down.
DAMAGE first tests for any positive device damage, before selectors; an unmatched
selector with damage elsewhere can yield no rows. Initial non-name arguments
select the general report, unlike STATUS. Prefixes can match multiple device
identifiers and repeated selectors repeat rows. These are report semantics,
not requirements to mutate or reuse the original token buffers.

Token now has named text, category, numericValue and origin properties. This
makes Sequence<Token> inputs explicit without requiring a particular lexer data
structure. End boundaries are excluded from argument sequences; name-category
means the existing ALPHANUMERIC category.

Source: Austin DECWAR.FOR SCAN/SRSCAN 3527–3615, STATUS 3860–3974, DAMAGE
783–830 and device/roster data 435/489; WARMAC.MAC SETSCN 2350–2409,
MARK 2412–2463, SHWSCN/labl. 2482–2530, ESHP/PSHP 4370–4401 and
DISP 4403–4438. No runtime or preserved source modifications.


## Session and environment report contracts

TYPE now names each preference/option observation and reads explicit Captain
and World properties. DECVER comes from MSG.MAC's executable ASCIZ text,
[DECWAR Version 2.3, 20-Nov-81], rather than EXTERN.FOR's stale 2.2 comment.
BLHOPT is modeled as blackHolesSelected: SET BHREMV removes board objects without
changing it. It is not recomputed from the current population. An unselected
TTYTYPE remains an undefined final TYPE OUTPUT observation; the generalized
model does not read preceding storage or substitute CRT. The first five
preference observations and their order are independently defined.

Added SessionReporting for advertised speed, connection label and displayed
session number, keeping these separate from AccountIdentity, ExecutionIdentity
and TerminalIdentity. Admission records those report values and a CommissionTiming
with an elapsed-origin marker and execution-time baseline. Name remains the
Captain displayName, including later active SET NAME changes. USERS reads the
recorded commission metadata; it does not query the host afresh on each row.
Removing the active baseline on release is semantic absence, not a requirement
to erase stored history fields before the source's history/final-report steps.

TIME takes separate execution observations for commission running time and total
session running time. Do not reuse the first read: report output itself may use
execution time. The abstract environment queries have explicit Duration and
TimeOfDay results. The host binding must define its accounting measure, clock
resolution and discontinuity policy. ETIM specifically compares time-of-day
readings and adjusts differences outside +/-12 hours by one day; this is not an
unbounded monotonic elapsed clock. The current ordinary-origin contract does
not settle extended-session/restart behavior or silently impose a replacement
clock policy. Before the first galaxy, TIM0's -1 value is outside the model's
initialized ClockOrigin domain; no invented zero-elapsed report is required.

USERS always emits its faction separator at the roster boundary, even with no
captains on either side. All six STAT fields remain enabled in every verbosity;
the shorter field-count branches are commented out. Privileged coordinates use
PRLOC width two, so a viewer's own zero relative displacement is still emitted.
ReportedPosition separates absolute and relative observations. Pregame absolute
output has a defined coordinate result even without a viewer ship; pregame
relative/BOTH has no valid reference position in the generalized model. The
latter remains unresolved rather than reproducing WHO=0 adjacent-field reads.

Sources: Austin DECWAR.FOR TYPE 4540–4594, USERS 4600–4631, TIME 4066–4085,
PRLOC 3078–3099, SET BHREMV 3727–3734; SETUP.FOR galaxy clock 173 and
JOBSTA/commission clocks 365–376; WARMAC.MAC STAT 2187–2244, DAYTIM/RUNTIM/ETIM
3329–3371 and USRN.4 3445–3455; MSG.MAC DECVER 44 and USERS5 380.


## Typed score observations

POINTS now declares ScoreColumn, ScoreRatio, ScoreReportRow and ScoreReport,
with an explicit ReportPoints operation. Every selected value is traced through
Ship.score/stardate, World.teamScores/teamTurns/teamCommissions, or
World.romulanActivity.score/turns/appearances. The historical commission counter
is named World.teamCommissions and initialized/incremented in the admission
chapter; it is not derived from currently commissioned ships. There is no
invented per-ship commission count. Absent ship cells in commission rows differ
from numeric zero and from an undefined ratio.

ScoreRatio preserves numerator and denominator as mathematical quantities.
Positive denominators use ordinary division; zero denominators remain open,
with no imposed numeric value, new display syntax or required arithmetic trap.
Pending score is not committed by a report. Column order, category suppression,
negative values and omission of both commission rows for self-only output are
retained. Sequential source reads do not justify a whole-report atomic snapshot;
concurrent score/count changes remain outside the stable-state report contract.

Selector termination at a nonalphanumeric token retains prior selections, but
an unknown alphanumeric selector rejects before output. An explicit initial
number is not the bare-command default. Pregame ME/I does not match self and
ultimately rejects. Disabled Romulan selection is removed before validating
that at least one column remains.

Sources: Austin DECWAR.FOR POINTS 2893–3048; SETUP.FOR faction counts 296 and
323; DECWAR.FOR player turn counters 238–239 and Romulan activation 3244.


## TELL, input values and radio-service ADTs

TELL now uses SendTell, TellFailure and TellObservation, with a shared
ValidateRadioRecipients operation. Device checks name Ship.devices[RADIO].damage;
radio enablement and ungagging name the associated Captain.radio properties.
Validation retains the source precedence: radio damage, commission availability,
then radio-on state. Group selection excludes uncommissioned identities before
validation; explicit names retain them for diagnostics. Ship-name first-match
precedes group lookup. Every token is processed, including numeric/null tokens;
this differs from POINTS termination. ROMULAN is skipped before the repeated-line
check. Sender exclusion happens after validation and before ungagging.

AcquiredLine and CommandInput are semantic input values, not concrete reader
buffers. A continuation replaces the current line used for recipient repetition
and inline-body selection. A later raw message-body read is not subject to
TELL's earlier recipient repetition rejection. Original case and punctuation
are retained in raw text, with ordinary line acquisition still applying.

MessageSender, RadioService, PublicationId, RadioHeading and MessageObservation
make the existing publication/receipt effects explicit. Published messages are
ordered by publication, not reservation. In-progress identities model concurrent
operations occupying capacity without exposing partial bodies; they do not
prescribe linked lists, storage indices or a locking API. An empty audience
returns before reservation. Initial reservation-access failure can abandon a
publication; the later update retries access and does not silently lose an
accepted publication. Full failure/wait/interruption conditions remain open,
including capacity entirely occupied by in-progress publications.

DiscardUnread describes removing a receiver from all published messages while
preserving all original audiences. It is the stable-state effect of capacity
loss and commission-release consumption; it does not include unpublished work
or create a future subscription prohibition. Races with release remain open.
Historical notification counters, stale output buffers, Romulan gag indexing and
pre-reservation Ctrl-C cleanup continue to be governed by the earlier message
normalization entry; this change adds no memory-dependent behavior to the book.

Sources: Austin DECWAR.FOR TELL 3977–4063, OUTMSG 2599–2623, FREE 1082–1140;
SETUP.FOR default groups 358–364; WARMAC.MAC RSRV./UPDT./SRCH./REMV.
2589–2750 and MAKMSG/GETMSG 2963–3075. No game code or archive bytes changed.
