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
more than one Romulan in the galaxy. The later galaxy-report ADT review below resolves named-group precedence and
normalizes the invalid name-duplicate check; arbitrary reads of unrelated state
are not made into a generalized rejection rule.

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


## SET preference and world-control operations

SET now dispatches ConfigureCaptain into SetPreference, SelectTerminalProfile,
SetCaptainName or ApplyPrivilegedSetting. Each operation names the Captain or
World property it changes. TerminalProfile is the finite set of eight source
profile names; Captain.terminalProfile and TYPE's corresponding observation use
that type. The unselected state remains Optional absence, with no invented
fallback terminal behavior.

The setting-name first-match order remains separate from value matching.
Nonalphanumeric preference values prompt again; an unknown alphanumeric value
finishes unchanged. Terminal selection instead clears the prior profile on each
alphanumeric attempt, retains the first match while reporting ambiguity, and
can remain absent after cancellation. Candidate token category requirements are
operation domains; the command wrapper supplies prompting and cancellation.

SET NAME uses raw acquired text after the delimiter following NAME, with at most
twelve printable characters and LEX-1 case/punctuation transformation. The model
does not require implicit storage padding as part of Captain.displayName; output
field widths are a presentation matter. Explicit retained spaces remain name
content. Nonprinting characters retain the earlier unresolved domain. NAME
consumes the command remainder, and a failed inline attempt gets one further
prompt. No pregame adjacent-memory name write is prescribed.

World.ended is now an explicit Boolean. CheckWorldEnd names the CaptainId whose
reports and session effects it performs. SET ENDFLG sets ended before invoking
that check; ordinary destruction checks set it when their end condition holds.
The total-destruction notification is determined from remaining objects, not a
special numeric flag representation. Full lifecycle/availability binding remains
open. BHREMV visits sectors in vertical/horizontal order and clears every
BlackHoleObject, including HELP/GRIPE temporary sectors, while retaining the
original black-hole option and ship association. Its effect is not filtered
through an independently maintained black-hole inventory.

Sources: Austin DECWAR.FOR SET 3624–3737, profile table 480–488, ENDGAM 961–992;
WARMAC.MAC USRNAM 3415–3458. This is a specification-only conversion; no game
code, terminal server or preserved source bytes changed.


## Galaxy-report ADTs, selection precedence and labels

ReportGalaxy now takes ReportVerb and Token arguments and emits typed detail,
terrain, summary and diagnostic observations. ReportGroup names selected kinds,
affiliations, modes, range, named identities, exact position and closest choice.
This is a semantic interpretation of the ordered grammar, not a replacement
unordered query syntax. ReportContext captures the acting position and team.
Pregame SUMMARY's whole-galaxy count-only path requires neither an invented
position nor an adjacent field read: every matching entity is countable under
either near/friendly admission or whole-game summary disclosure. Actor-dependent
selectors remain rejected there.

AdmitReportEntity and ReportAdmission distinguish admitted modes, out-of-range
telemetry and privileged disclosure. Source presence tests for ships require a
commission and a nonempty sector at the ship's position, not agreement with a
ship marker; HELP/GRIPE's temporary black hole therefore passes. Report telemetry
names current Ship, Base, Planet or Romulan properties. Base strength is optional
for concealed detail; ship/Romulan concealment replaces both position and strength.
Planet builds remain current even for remote known planets. Coordinate formatting
uses the current actor position, whereas eligibility uses the saved origin.

Exact-position output precedes named output when both selectors are present;
named output precedes filtering/CLOSEST. ROMULAN has only its duplicate check,
so it may follow otherwise restrictive selectors. Exact positions still undergo
the group distance limit; named output does not suppress its identity/detail
call when that limit fails. Named telemetry concealment still follows the
remote/nonfriendly/privilege test. Direct output does not discover installations.

LSTSCN's duplicate-name test reads singular SHIP, which is not the SHIPS set
being accumulated and is not initialized by this routine. Reproducing rejection
from that unrelated value would contradict the user's exclusion of accidental
state dependencies. The generalized namedShips set therefore retains the
source's successful union effect: repeated occurrences select the identity
once. This does not replace the test with an invented duplicate-name error.
Named ROMULAN repetition has its own initialized selector flag and remains an
error. A leading empty group invokes defaults; later empty/trailing groups reject.

Deferred modes are unioned per identity. Out-of-range and privileged-disclosure
properties are retained from contributing admissions, preserving their effect
on telemetry and post-detail knowledge updates. Ordinary ship/base/planet
counts deduplicate identities. Romulan multiplicity counts every admitted
ordinary group, including detail-only groups, when any merged group asks for a
summary; direct queries do not contribute.

Class summary labels collect scope evidence from attempted ordinary candidates,
including rejected ones. The known qualifier can survive merging with broader
whole-game counts; it is not a claim that all counted installations are known.
Target labels collect only remote nonfriendly unprivileged evaluations, including
direct paths. With no target label evidence the label defaults to sensor range.
No-match labels instead default to whole galaxy if there were no candidates;
its initial/observed known qualifier follows LSTFLG/LSTUPD. These preserve
observable labels without retaining packed flags or count-by-reference storage.
Terminal formatting and concurrent removal/replacement remain incomplete.

Sources: Austin DECWAR.FOR LIST 1359–1388, LSTSCN 1519–1744, LSTFLG/LSTUPD
1750–1956, LSTOUT/LSTSUM/LSTOBJ 1959–2141, PRLOC 3078–3099;
PARAM.FOR selector definitions 95–124 and LSTVAR.FOR local declarations.
No gameplay, server, archive or generated source-data changes.


## Privilege and diagnostic observations

SetPrivilege names Captain.privileged and accepts an optional Token. Its exact
match uses the existing five-character lexical representation, so a retained
*MINK also matches when the original token had an additional suffix. There is
no new full-raw-token authentication check, category guard or prompt. Omitted
or nonexact values clear privilege; account restrictions in commented source
statements do not become active rules.

ReportDiagnostics checks that same property before querying OperationTiming
observations. The environment query supplies name, completed count, total
execution duration and maximum duration in first-registration order. Registered
zero-call measurements and the empty header-only report remain visible. Reports
do not reset collected values. Timer storage addressing, packed conversion and
unbounded reads after instrument-table exhaustion are not ADT semantics; the
instrumentation and clock/capacity binding remains open. The KILCHK privilege
assignment is not an unconditional startup reset: its call path must be established
before adding any broader lifecycle rule from that isolated statement.

Sources: Austin PASWRD (DECWAR.FOR 2626–2644), password PARAM.FOR 15,
EQUAL (WARMAC.MAC 3675–3715), TIMIN/TIMOUT/TIMSRC/DEBUG (3606–3673).
No game code or source archive changes.


The exact-position review also resolves a BASES disclosure exception. LSTFLG
accepts a coordinate when LSTUPD admits any mode, rather than requiring detail.
BASES starts with both detail and summary over the whole galaxy, so an unknown
remote base/ship/Romulan can pass through summary-only admission and then receive
an immediate detail call. Base position remains visible with strength withheld;
ship/Romulan telemetry is out of range. Discovery is unchanged. LIST's default
detail-only path cannot use this exception, and remote terrain fails before
object admission. The earlier broad remote-coordinate restriction was narrowed
accordingly; no source predicate was replaced with an invented detail-only test.
Evidence: Austin DECWAR.FOR LSTFLG 1750–1800 and LSTUPD 1925–1945.


## Entry names and administrative statistics

The startup name reader now has its own text operation and Session.entryName,
separate from the active commission's Captain.displayName. JOBSTA reuses HAND;
SET NAME writes JOB name fields without changing HAND. SETUP calls JOBSTA before
admission and again to record the chosen ship's identity. Recommissioning in the
same execution therefore restores the entry name. The generalized SET NAME
assignment is restricted to an active commission: USRNAM uses WHO without a
pregame guard, so the old blanket Captain.displayName assignment would have
invented a safe pregame effect for an out-of-domain JOB access. Pregame name
assignment remains unspecified, not silently repaired or rejected.

Entry-name conversion is expressed as characters, not packed words. Its first-six
nonspace check, twelve-character display limit, alphabetic fold and distinct
printable punctuation conversions are preserved. The source raw writer has no
bound although HAND reserves only two words (ten seven-bit character places,
including its terminator). The book retains twelve name characters and consumes
the rest through the terminator without modeling writes into neighboring state.
This is a deliberate representation-safety normalization under the user's
instruction to remove storage artifacts; it is not proof of native behavior for
long input. NUL/CR ignoring and LF/ESC/BEL termination come from GNM0 directly.
Nonprinting retained characters and the host INCHWL editing/disconnect contract
are still open, not invented as the ordinary command reader's controls.

ZapStatistics projects the administrative workspace into HistoricalStatistics:
a retained serial and a mapping of statistic identities to ordinary values.
The source clears indices 1 through 639, preserving index 0, then writes that
same workspace through regular and free-account bindings without reading either
archive. Neither serial is implicitly recovered from its own file. The schema
and normal update lifecycle remain environment work; no live Score reset or
automatic mission-standings service is inferred from dormant routines. The
administrative GRIPE path has its SHOSTA call commented, so its record consists
of context and closing separator, not a statistics dump. Open failures skip to
cleanup, including Finished!, and do not roll back an earlier archive write.
Unchecked write/close failure and interruption cases remain explicitly open.

Sources: Austin WARMAC.MAC HAND 512, JOBSTA/GNM 3110–3254, USRNAM 3423–3455,
statistics declarations 575–590, archive bindings 748–793, GRIPE 3860–4112,
STAZAP 4636–4670; SETUP.FOR PREGAM 76–136 and identity calls 156, 365–372.
No gameplay, server, source archive or generated evidence changes.


## Automatic repair selection from accepted input

A follow-up source check found that the old generalized rule "always at most
30 damage units" was too broad. REPAIR(3) skips integer-size selection but still
passes through the ALL comparison at DECWAR.FOR 3212. That comparison reads the
second token of the currently acquired input. DOCK preserves its input, so
DOCK ALL (including abbreviations A and AL) requests all-device completion
repair. DOCK STATUS ALL does not. MOVE A V H is also a valid trigger: A matches
ABSOLUTE in LOCATE and ALL at automatic completion. A fresh coordinate reply
replaces that input, so the second reply token controls the same comparison.
REPAIR ALL's explicit repair precedes its all-device automatic repair.

This is preserved as an accepted-input rule and an AutomaticRepairSelection
value, not a storage dependency in the ADT. Removing it would change reachable
syntax and game semantics, beyond the authorized normalization of arithmetic
and unsafe memory effects. No new keyword, full-repair setting or altered repair
amount is introduced. Command failure still bypasses completion. The normal
STANDARD allowance remains 30 regardless of docking. Turn prose also now calls
playerCount participants, including reserved admissions, rather than silently
substituting commissioned-ship count for NUMPLY.

Evidence: Austin DECWAR.FOR DOCK dispatch 80–85, DOCK 893–938, LOCATE 1404,
REPAIR 3190–3222, turn dispatch/accounting 223–258; SETUP.FOR 165–168.
No executable or source-archive edits.


## Shared weapon and displacement result contracts

Added DamageTarget, AttackSource (player, Romulan, installation), snapshot
PlanetOrigin ownership, WeaponHit, CriticalHit, TargetDefense, destruction and
displacement values. Shared PhaserHit/TorpedoHit now expose their target effects
and observations independently of firing commands and notification delivery.
ApplyShipHit applies ordinary eligible credit before condition/destruction;
ResolveBaseHit distinguishes reported H from the ordinary damage eligible for
credit. RemoveWeaponDestroyedBase preserves the source order of docking check,
base-count decrement, kill credit, sector removal and zero strength. The
returned base defense captures its critical-path strength before final clearing;
negative or positive reported strength is not replaced by a later zero query.
No whole-impact transaction or double credit on report delivery is implied.

TorpedoHit's resource guard returns TargetAlreadyFatal before draws or changes.
PHADAM lacks that guard; the book does not add it. A fresh WeaponHit replaces
shared report scratch values with named per-impact observations. The invoking
caller's behavior when TORDAM returned before filling those values remains open,
rather than silently inventing a fresh zero-damage notification. Installation
callers own faction scoring; player attacks accumulate pending damage/kill
credit and Romulan attacks update persistent activity score. Ordinary player
credit tests opposing faction, whereas the shared kill bonus has no separate
faction predicate. Source command targeting still controls valid attacks.

RomulanPhaserHit/RomulanTorpedoHit return damage, remaining energy and destruction
without performing caller-owned score or displacement. Negative remaining energy
is retained in the result after the Romulan object is removed. Displace now
returns Stayed, Moved or Swallowed, preserving the distinct destination and last
occupied position. Its black-hole branch does not apply the ordinary empty-sector
undocking/red effects. A torpedo already sets red before invoking it; a standalone
or nova displacement can therefore retain a prior condition/docked state.

Source evidence: Austin TORDAM/PHADAM and shared score/base cleanup
DECWAR.FOR 4089–4220; PHAROM/TOROM/DEADRO 3382–3398; JUMP 1283–1331;
BASKIL 339–369; PHACON callers 2700–2748, TORP 4340–4380,
BASPHA 375–431, PLNATK 2800–2863 and capture defense 625–659.
Critical-ship IRAN(5) evaluation that can have no selected effect remains outside
the abstract random-event sequence under the existing normalization policy;
no packed result widths or stale message fields enter the new ADTs. Existing
ordinary damage/percentage arithmetic is unchanged. No gameplay, server or
source archive changes.


CompleteTurn now has an explicit actor, automatic-repair selection and outcome;
DefenseContext distinguishes player-triggered and Romulan-triggered installation
phases. CommitPendingScore updates the eight declared categories in order without
adding a report-triggered commit or a whole-turn transaction. Fatal damage alone
does not skip the remaining source turn steps: CAPTURE can reach label 3400 after
destruction, and defense phases can kill the actor before label 3501. The captain
association remains until release even when ALIVE has been cleared. Automatic
repair precedes the critical life-support test; docking skips the decrement but
not the negative-reserve test; the fatal assignment is exactly 2500 generalized
hull units, not an additive hit or a maximum. INFORMATIVE suppresses the warning
without changing those effects. A session-ending control transfer stops later
steps rather than promising unconditional stardate and score commitment.
Evidence: Austin DECWAR.FOR dispatch 63–85, repair/turn/life/score 223–258,
ROMDRV 3233–3319, ENDGAM 961–1007. No executable changes.


World.baseCounts and World.capturedPlanetCounts now name maintained installation
counts explicitly. These are semantic state during partial transitions, not a
mandated storage scheme or an always-fresh collection count. New galaxies begin
at ten bases and zero owned planets per faction. BUILD tests the maintained
count for equality with ten at stage four, increments before planet removal,
and activates the reused base entry only after PLNRMV/ENDGAM return. Corrected
the old base-collection union equation: conversion replaces a fixed identity's
record rather than creating a duplicate identity. CAPTURE adjusts owner counts
after its old-owner docking check. Owned-planet removal decrements before that
check and record removal. Weapon base destruction checks docking before count
decrement; nova base destruction decrements first. CheckWorldEnd uses the
maintained base counts. ReevaluateDocking's zero-captured-count branch leaves
existing docking unchanged; it is not replaced with an intuitive undock rule.
Evidence: SETUP.FOR 173–231; DECWAR.FOR BUILD 523–580, CAPTUR 625–643,
BASKIL 339–369, PLNRMV 2864–2892, ENDGAM 961–1007, nova 2332–2352 and
weapon cleanup 4216–4224. Interrupted conversion geometry and concurrent writes
remain open; this change does not invent a safe alternate end-state.


## Nova operations and independent observations

NovaContext/NovaSource/NovaTarget and NovaHit replace NOVA/SNOVA's shared calling
state with explicit game identities, explosion positions, damage and defense
observations. No extra player command or random mechanic is introduced. The
29-pending-star limit, scan order, reverse victim order, immediate selected-star
removal, current occupant recheck and repeated damage across explosions remain.
The fixed eight-entry object buffer is not a victim cap: SNOVA tests no such cap.
A previously removed star's center can become occupied before its explosion,
allowing nine damageable sectors. The generalized sequence covers the complete
neighborhood without the adjacent-memory overwrite implied by that historical
buffer size. The actual pending-star limit remains 29, despite its larger
allocated buffer. Evidence: DECWAR.FOR 3807–3860.

NOVA computes IHITA and credits damage before its initially-full-base distress
call (2283–2295,2322–2331). MAKHIT clears IHITA even with no recipients
(WARMAC.MAC 2771–2772,2855–2872). The subsequent base hit therefore inherits zero
instead of the already credited H when that distress call occurred. The book's
independent NovaHit.damage retains H; publication of a different observation
cannot clear it. This is an intentional report normalization under the existing
independent-values policy, not an arithmetic derivation or a port correction.
It changes that reported amount without changing base strength or any score.
NOVA's Romulan branch assigns no additive IHITA; normal fresh-report state is
zero and the book reports zero while identifying the separate remaining energy.
Planet nova reports omit the numerical hit amount (OUTHIT 2456–2467). No invented
three-build-to-energy conversion is introduced. Prior unrelated report data never
becomes a new impact's damage, critical device or destruction flag.

The nova result keeps physical displacement separate from reported location and
destruction presentation. NOVA overwrites JUMP's Vto/Hto with the last recorded
position even after a black-hole encounter; the book preserves that reporting
position while DisplacementResult retains the destination. Base death reports
use the generic destruction flag even for black-hole displacement; ship and
Romulan reports retain the black-hole indication. Shield device criticality can
lower shields before the strength-reduction branch, without recalculating initial
severity. Ship kills credit the initiator's team directly; base kills use signed
pending credit; the Romulan destruction bonus follows hit publication. These
are retained game/report rules, not flattened into ordinary WeaponHit behavior.
Evidence: DECWAR.FOR NOVA 2259–2390, JUMP 1283–1331, OUTHIT 2392–2541.

RemovePlanet names the ownership snapshot supplied by the caller, decrements its
maintained count before docking re-evaluation, removes identity and then checks
world end. Stable planet IDs eliminate array renumbering while preserving the
remaining report order and discovery. Caller-owned sector removal/conversion
is left separate: NOVA and TORP clear before PLNRMV, BUILD replaces after it.
An absent planet is the abstract invalid-target no-op, not a fabricated removal.
Concurrent ownership disagreement and terminated-conversion observations remain
open. Evidence: PLNRMV 2864–2892, BUILD 558–575, NOVA 2380–2389.
No running game, server or archived source was changed.


## Coordinate resolution contracts

ResolveLocations/ReadLocations distinguish an absent input line, no resolved
items, a scalar, absolute positions and a diagnostic. Exactly/AtMost express
LOCATE's signed count parameter as an arity policy. Empty results precede count
failure; nonzero numeric counts are checked before all integer-category checks,
then range checks proceed V/H in input order. Odd numeric item counts have a
leading unchecked scalar; even ones do not. No new uniform torpedo arity rejection
is added. Computed mode tests computer damage and imposes its existing speed
pause before count/name validation, validates targets right to left and returns
positions in input order. Corrected the earlier grammar's misleading requirement
that a computed target occupy its sector under its own identity: source tests
ALIVE and nonempty DISP only, permitting HELP's temporary black-hole appearance.
Evidence: DECWAR.FOR LOCATE/RELOC 1404–1516.

The typed output does not mutate input tokens to expand names into coordinate
slots. Tokens remain independent under the existing normalization policy. Empty
computed mode no longer depends on an unshifted stale token category. Its normal
empty result remains Empty. Initial no-argument input can prompt; an actually
blank RELOC acquisition aborts; a mode-only acquired reply instead resolves zero
items. Missing target values subsequently read by malformed TORP or MOVE's
own-location retry are still open caller cases, not fabricated coordinates or
an invented diagnostic. Evidence: MOVE 2158–2178, PHACON 2657–2665,
TORP 4247–4276, GTKN 1407–1439. No executable changes.


## Generalized random distributions and replay

The book now states an ideal uniform/independent probability model for UnitDraw,
IntegerDraw and Choice. This is an explicit numerical normalization of the
historical generator, not a claim that RAN/IRAN were exactly independent or
uniform. WARMAC.MAC 2285–2324 has a finite per-execution recurrence; its quotient,
modulo reduction and floating conversion produce finite-grid bias and correlated
sequences. Even its real range is narrower than the interface's stated unit
interval. These generator/word artifacts are excluded by the user's ordinary-
arithmetic, platform-independent specification direction. Source discrete
thresholds and ranges remain: no changed misfire, nova, critical, target-tie or
population rule. Choice(Device) is the ideal form of INT(KNDEV*RAN+1),
DECWAR.FOR 4130–4134. Finite-source conformance tolerances remain open rather than
claiming an exact continuous generator is executable.

Derived probabilities preserve conditional branch structure: misfire 4/100,
tube damage 1/5 given misfire, star effects 4/5, planetary build loss 1/4,
Romulan displacement 3/10, and clipped Romulan torpedo damage's 2001/4000 mass at
200 units. Sequential four-group equal-distance ties are 1/8, 1/8, 1/4, 1/2, not
uniform targets. Torpedo range probabilities follow the already-normalized
piecewise path rule; no generic truncation requirement is reintroduced. RAN's
finite support, unused compound-expression draws and prior shared scratch data
do not prescribe new events. Source branch/draw orders that affect declared
operations remain in their clauses and in the replay contract.

RandomEvent is an abstract input record, not a generator data structure or new
player command. A nested installation/Romulan/nova operation inherits the
performing captain's random context. Historical random state is per execution;
no new one-global-generator gameplay dependency is asserted. Nonempty tournament
keys are retained text identities mapped by a documented random binding. Empty
keys preserve SETRAN's ordinary-time initialization fallback rather than a
promised deterministic empty-name galaxy. Equal keys within the same binding
reproduce creation with the same ordered inputs; later multiplayer sessions
require their own initialization and schedule. The binding does not carry over
packed five-character integer seed values. Evidence: SETUP.FOR 169–193,215–235;
WARMAC.MAC 2285–2324, DECWAR.FOR PLACE 2765–2797, DIST 836–891,
NOVA 2259–2390 and shared/player weapons 4089–4419. No runtime changes.

The generalized Romulan torpedo table now places its obstruction-effect draw
in the star branch, matching the player table and removing the unused draw for
nonstar obstructions. This changes a binding's future deterministic sequence,
not the distribution or effects of those obstructions. Explicit early draws
already required by a command, such as MOVE's potential overheating damage,
remain even when later input cancels; normalization is not permission to reorder
or skip a declared choice. This distinction closes an inconsistency in the
previous statement that all unused results were automatically omitted.


## Combat-notice service abstraction

CombatNoticeService expresses capacity and observable selection with notice
identities, publisher identities, immutable observations, publication order and
reusable delivery priorities. The forty priorities per publisher preserve the
first-free-slot publication rule and roster/priority scan on reception. They
are abstract ordering properties, not mandated arrays, addresses or packed
words. At capacity the oldest published notice of that publisher is lost for
all remaining recipients. It is not radio's recipient-backlog eviction and is
not replaced by global chronological delivery. Source: WARMAC.MAC 183–187,
MAKHIT 2771–2872, GETHIT 2880–2950.

PublicationOrder is unbounded semantic order. The historical eighteen-bit serial
wrap and packed signed/unsigned report transformations remain excluded numerical
artifacts. Counter disagreement caused by overwriting unread entries does not
create phantom observations or the incidental blank lines from unsuccessful
OUTHIT fetches. A received observation is one immutable value, without partial
cross-observation mixtures during replacement. Full operation interleavings
remain open; this does not make a whole weapon command atomic. Source snapshot
values remain fixed while current recipient preferences determine formatting.
The body remains an abstract game observation with its detailed catalogue still
required by the terminal work; no packet layout is being specified as game state.

FREE clears the receiver's audience memberships, not every observation that
receiver previously published. GETCMD drains combat hits before radio text and
before its post-command pause, then repeats the same channel order when input
polling observes pending items. Meaningful typed observation values replace
shared scratch cleanup; notice publication never reapplies game damage or score.
Evidence: DECWAR.FOR FREE 1120–1137, GETCMD 1184–1237, OUTHIT 2402–2541.
No executable, server or immutable source changes.
