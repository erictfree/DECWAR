# Randomness

Status: base generator and setup call order reviewed. Full per-command draw
coverage, overflow domains and interleaving scenarios remain under review.

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
36-bit integer before absolute value. Decimal-token retained-text anomalies and
the most-negative absolute value remain covered by numeric unresolved entries.
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
