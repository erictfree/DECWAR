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
