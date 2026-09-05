# Randomness

Status: base generator, setup order, command draw sites and ordinary generator
vectors reviewed. Compound-condition evaluation, abnormal bounds and full
interleaving scenarios remain under review.

## RNG-1 — State and draws

Random state belongs to the session performing the operation. Define it as an
integer residue modulo 2^36, without requiring a physical word. For one draw:

1. If the state's residue modulo 2^18 is zero, replace that lower residue with
   260543, retaining the upper part.
2. Multiply by 260543 and reduce modulo 2^36.
3. Clear the high bit: reduce the result modulo 2^35. Store this as the new state.
4. Let Q be the quotient after integer division of this new state by 257.

The ordinary integer draw `I(N)` for a positive bound N returns
`1 + (Q mod N)`, with the final historical 18-bit result reduction relevant if
bounds leave the game's small positive domain. The REAL draw `R()` returns
exactly `Q / 2^27` for this generator's nonnegative quotient domain. Both advance
the same state by one draw; they are not independent random streams.

A conforming reproduction of this generator MUST NOT replace it with a uniform
library random function. The finite modulo distribution is not asserted to be
perfectly uniform. No statistical-equivalence alternative is currently defined.
Zero/negative or oversized integer bounds remain outside this reviewed clause.

**Evidence:** [SETRAN/RAN/IRAN](../../legacy/utexas/WARMAC.MAC#L2285),
[arithmetic evidence](../platform-manuals.md).

## RNG-2 — Initialization

Setting a nonzero seed uses that supplied value. Setting zero obtains the
host millisecond-time value instead. Ordinary admission seeds from time of day.
Tournament initialization uses the absolute value of the token's retained
five-character representation, not its parsed decimal numeric value.

To express that representation abstractly, for retained transformed character
codes c1 through c5 (zero-padding missing positions), form
`c1×2^29 + c2×2^22 + c3×2^15 + c4×2^8 + c5×2` and interpret it as a signed
36-bit integer before absolute value. LEX-8 defines decimal text retention and
spill effects; the most-negative absolute value remains U-NUMERIC.
Thus a numeric-looking tournament name must not simply seed with its numeric value.

**Evidence:** [SETUP seeding](../../legacy/utexas/SETUP.FOR#L180),
[SETRAN](../../legacy/utexas/WARMAC.MAC#L2289),
[NXTT. packing](../../legacy/utexas/WARMAC.MAC#L1454).

## RNG-3 — Consumption order

During world generation draw the star population first, then black-hole
population, even if black holes are later declined. Place bases interleaved by
slot (Federation then Empire), then the 20 planets, then stars and, if selected,
black holes. Each placement attempt draws V then H; an occupied cell causes
both coordinates to be drawn again. Player placement has additional rejection
conditions requiring its own gameplay clause.

A transcript with only a tournament name is insufficient to reproduce every
later multiplayer outcome. Reproduction also requires session seeds, action
ordering and all branch-dependent draws. Invalid or cancelled commands can
consume draws, as MOVE does before reading coordinates. Optimizing away a draw
because its value is unused can change later outcomes.

**Evidence:** [SETUP](../../legacy/utexas/SETUP.FOR#L200),
[PLACE](../../legacy/utexas/DECWAR.FOR#L2765),
[MOVE](../../legacy/utexas/DECWAR.FOR#L2141).

## RNG-4 — Command and helper draw ledger

This ledger supplements the ordered GAME clauses. Each listed call advances the
performing session's RNG-1 state. Nested calls consume that same stream before
the caller resumes; do not precompute a separate packet of random values for a
command. A command that triggers world accounting also consumes the draws of
any autonomous activity it performs under EXEC-4.

### Movement and phasers

After the selected engine's critical-damage gate, MOVE and IMPULSE draw
`I(4000)` before reading the location, including a later cancellation. Once a
nonzero destination has been accepted, a critically damaged computer adds one
`R()` before range rejection. Warp 5 or 6 that reaches its speed-risk branch
then draws `I(100)`. Path traversal subsequently consumes one `R()` for each
two-candidate probe in which both candidate cells are empty; it consumes no
draw when only one candidate is empty. Probe order is GAME-PATH order.

PHASERS reaches its first `I(100)` only after location, target, range, strength
and bank-wait processing and the possible shield-control energy charge. If this
draw causes overheating, consume a second `I(100)` for device damage. Planet
targets then consume another `I(100)` for construction loss. Romulan targets
instead consume `I(100)` through GAME-ROM-DAMAGE. Ship/base targets enter
phaser damage, whose first two draws are `R()` for critical-hit classification
and `R()` for distance attenuation, in that order.

**Evidence:** [MOVE/IMPULS](../../legacy/utexas/DECWAR.FOR#L2141),
[CHECK](../../legacy/utexas/DECWAR.FOR#L699),
[PHACON](../../legacy/utexas/DECWAR.FOR#L2647),
[PHAROM](../../legacy/utexas/DECWAR.FOR#L3383),
[PHADAM](../../legacy/utexas/DECWAR.FOR#L4167).

### Player torpedoes

For each shot that passes the prior-misfire stop, consume these draws in order:

1. `R()` for ordinary deflection; an additional `R()` if tubes or computer have
   any damage; another `R()` if shields are raised. The latter two conditions
   contain no random operation themselves.
2. After the current-location check and possible inventory decrement,
   `I(100)` for misfire. A misfire consumes `R()` for extra deflection and
   `I(5)` for tube damage, plus `I(3000)` if that test selects damage.
3. `R()` for trace length, even on the misfired shot. Then any GAME-PATH probe
   draws. Any obstruction consumes `I(100)` before its kind is examined,
   including a friendly ship, a planet or a black hole.
4. A star can enter the nova chain. An enemy planet consumes `I(4)` only after
   its exclusion attempt succeeds. Romulan damage consumes `I(4000)`; the
   subsequent compound surviving-Romulan jump test contains `I(10)` and is
   subject to RNG-5. Ship/base damage follows the shared damage ledger below.

A prior player misfire stops the next shot before its first deflection draw.
This differs from Romulan bursts, which draw ordinary deflection before checking
the prior-misfire flag. A failed planet exclusion does not consume its `I(4)`.

**Evidence:** [TORP shot loop](../../legacy/utexas/DECWAR.FOR#L4282),
[target branches](../../legacy/utexas/DECWAR.FOR#L4310),
[misfire branch](../../legacy/utexas/DECWAR.FOR#L4407),
[TOROM](../../legacy/utexas/DECWAR.FOR#L3389),
[ROMTOR](../../legacy/utexas/DECWAR.FOR#L3419).

### Damage, novas and autonomous activity

| Path | Draw sequence and branch conditions |
| --- | --- |
| Torpedo damage | After already-destroyed target gates, three `R()` calls: deflection factor, critical-hit factor, then raw hit size. The first value participates in shield deflection; its separately derived `ranb` value is unused. |
| Shared critical damage | A sufficiently large hit reaches the compound `I(5)` base-critical test (RNG-5). A ship critical hit then draws `R()` for device selection and `R()` for the additional damage adjustment. |
| Base emergency damage | At the emergency branch, `R()` for shield loss followed by the compound `I(10)` destruction test (RNG-5). |
| Nova damage to a ship | Nine `R()` draws in device order; `I(1000)` for hit magnitude; `R()` for energy loss; `I(100)` for shield loss only if shields remain raised after device damage. Displacement itself adds no draw. |
| Nova damage to a base | `I(1000)` for hit magnitude, then `I(100)` for shield loss. |
| Nova damage to Romulan or planet | No direct random draw in NOVA; the commented Romulan-death test is inactive. |
| Nova propagation | Visit adjacent cells in GAME-NOVA order. The compound star-selection expression contains `I(5)` (RNG-5). This test precedes the pending-star capacity check. Victims and pending stars subsequently run in their specified stack order. |
| Placement | `I(75)` for V, then `I(75)` for H, repeated for every rejected placement attempt. |
| Planet attack | The per-planet neutral-selection expression contains `I(2)` (RNG-5), before the friendly-planet skip. Any attack then consumes its nested phaser-damage draws. |
| Romulan appearance | The appearance-delay expression contains `I(5)` (RNG-5); successful appearance then runs placement and consumes `I(200)` for initial energy. |
| Romulan target choice | Three candidate-group comparisons contain `I(2)` calls in Federation ship, Empire ship, Federation base, Empire base selection order; RNG-5 applies. No per-object draw is made in the preceding minimum searches. |
| Romulan weapon choice | When both weapon deadlines are strictly earlier than current time, `I(2)` selects the weapon. Equality follows the other deadline branches without this selection draw. |
| Romulan torpedoes | Each loop iteration starts with `R()` before the prior-misfire stop; a launched shot then draws `I(100)` for misfire, an extra `R()` if misfired, and `R()` for trace length. Path probes and any obstruction's `I(100)` follow. |
| Romulan speech | The first speech site tests `I(5)=1`; the later site tests `I(10)<=1`. A generated speech consumes `I(3)`, `I(4)`, `I(5)`, `I(5)` for recipients, opening, adjective and noun. |
| Life-support fatal message | The exhausted-reserve path draws `I(5)` to select its fatal-message variant. |

Reaching a nested damage routine can itself depend on the variant's exclusion
and failure behavior. The ledger does not override those gates or permit eager
draws before them.

**Evidence:** [TORDAM/PHADAM](../../legacy/utexas/DECWAR.FOR#L4089),
[base emergency](../../legacy/utexas/DECWAR.FOR#L4212),
[NOVA](../../legacy/utexas/DECWAR.FOR#L2259),
[SNOVA](../../legacy/utexas/DECWAR.FOR#L3807),
[PLACE](../../legacy/utexas/DECWAR.FOR#L2765),
[PLNATK](../../legacy/utexas/DECWAR.FOR#L2800),
[DIST](../../legacy/utexas/DECWAR.FOR#L836),
[ROMDRV](../../legacy/utexas/DECWAR.FOR#L3233),
[ROMTOR](../../legacy/utexas/DECWAR.FOR#L3419),
[ROMSPK](../../legacy/utexas/WARMAC.MAC#L4672),
[fatal selection](../../legacy/utexas/DECWAR.FOR#L257).

## RNG-5 — Compound-condition limit

The supplied source places random calls inside compound AND/OR expressions.
The draft does not yet establish whether the selected compiler evaluates a call
when another operand already determines the logical result (U-EVALUATION).
Ordinary Boolean algebra establishes a branch result in that situation, but
does not establish the resulting random state. In particular, describing a call
as a tie-breaker does not prove it is evaluated only on ties.

The affected sites are DIST's three candidate comparisons, PLNATK's neutral
planet skip, ROMDRV's absent-Romulan delay, SNOVA's star-selection test,
TORDAM's base-critical test, the shared base-destruction test, and TORP's
surviving-Romulan displacement test. Do not silently select JavaScript-style
short-circuit evaluation for these sites. A reproducibility claim crossing one
of them must identify established compiler behavior or a separately named
evaluation policy. The unambiguous draw sequences above remain usable without
resolving every such site.

**Evidence:** [DIST](../../legacy/utexas/DECWAR.FOR#L878),
[PLNATK](../../legacy/utexas/DECWAR.FOR#L2809),
[ROMDRV](../../legacy/utexas/DECWAR.FOR#L3247),
[SNOVA](../../legacy/utexas/DECWAR.FOR#L3827),
[critical test](../../legacy/utexas/DECWAR.FOR#L4128),
[base destruction](../../legacy/utexas/DECWAR.FOR#L4214),
[Romulan displacement](../../legacy/utexas/DECWAR.FOR#L4375).

## RNG-6 — Generator vectors

**Examples, source-derived:** Starting with state 1, successive draws have the
following values. Each row describes one advance. The two output columns are
alternative views of that same advance, not two calls. All values are decimal.
Use the exact fraction for REAL output, rather than the rounded decimal string
of a host formatter.

| Draw | New state | Q | If called as I(100) | If called as R() |
| --- | --- | --- | --- | --- |
| 1 | 260543 | 1013 | 14 | 1013 / 134217728 |
| 2 | 33522916481 | 130439363 | 64 | 130439363 / 134217728 |
| 3 | 18814778687 | 73209255 | 56 | 73209255 / 134217728 |
| 4 | 23729961217 | 92334479 | 80 | 92334479 / 134217728 |
| 5 | 18323161279 | 71296347 | 48 | 71296347 / 134217728 |
| 6 | 29360264577 | 114242274 | 75 | 114242274 / 134217728 |

Starting with state 262144 exercises low-part replacement: the first draw yields
state 33103223937 and Q 128806318; `I(100)` returns 19. This is not equivalent
to resetting the whole state to 260543. Setting seed zero is a different operation
that consults host time under RNG-2.

These vectors were calculated independently from the RNG-1 recurrence. They
are not observations of the native executable or evidence that all command
draw ordering has been recovered.

**Evidence:** [generator instructions](../../legacy/utexas/WARMAC.MAC#L2285).
