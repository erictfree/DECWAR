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
and changing the planet owner. This docking dependency remains recorded here and
explicitly open in the contract rather than being replaced by an invented
post-capture docking update. The early PRIDIS calls select notification recipients;
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

TELL's autonomous path also applies its gag update to local session state. Its
relationship to the triggering captain remains an explicit review dependency
with the Romulan driver; it has not been silently discarded as an address alias.

**Source basis:** [SET](../../legacy/utexas/DECWAR.FOR#L3624),
[USRNAM](../../legacy/utexas/WARMAC.MAC#L3415),
[OUTMSG](../../legacy/utexas/DECWAR.FOR#L2599),
[TELL](../../legacy/utexas/DECWAR.FOR#L3977),
[message capacity](../../legacy/utexas/WARMAC.MAC#L2589),
[MAKMSG and GETMSG](../../legacy/utexas/WARMAC.MAC#L2963).
