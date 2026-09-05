# Session and configuration

Status: main entry, admission and cleanup reviewed at source level. Raw-name
edge cases, monitor identity and concurrency still limit conformance.

## SESSION-1 — Entry and pregame

Austin enters through a captain identity/name acquisition and the HELP/PREGAME
startup dialogue. It does not run the commented Beginner/Intermediate/Expert
selection or its associated initial reports. Output verbosity initially selects
medium. Empty startup input continues to admission; HELP displays help and
returns to the startup dialogue; PREGAME enters the command table in GRAM-2.
Other input repeats startup. A disconnect/control condition can exit at this stage.

The initial captain-name reader is separate from command lexical processing. It
ignores NUL and CR, terminates on LF, ESC or Ctrl-G, and exits its read path for
Ctrl-C. It does not implement the command reader's ordinary backspace/redisplay
logic. Names and identity require their own bounded conformance domain; the
source's unbounded raw write loop is not an invented modern maximum-name rule.

**Evidence:** [main entry](../../legacy/utexas/DECWAR.FOR#L1),
[PREGAM](../../legacy/utexas/SETUP.FOR#L76),
[raw name acquisition](../../legacy/utexas/WARMAC.MAC#L3213).

## SESSION-2 — World creation and options

Admission to a full 18-player world retires its image for new arrivals and
attempts entry through a new world; it does not eject the existing players.
Otherwise acquire admission exclusion, increment admitted players and initialize
that session's random state. World creation occurs when no world has yet been
initialized, or when this is the only admitted player and the empty-world
retention deadline has expired. Other arrivals use the existing world.

A new world offers regular/tournament selection; empty means regular. Tournament
can take its name from the next token or a separate prompt and seeds as RNG-2.
Romulan defaults enabled; NO disables it. Black holes default disabled after
world clearing; YES enables their placement. The order of population draws and
placement is RNG-3. Stars number `INT(51×R())×5 + 100`; black-hole count is
`INT(41.0×R()+10)` even when the option is later declined. REAL evaluation follows
the finite-arithmetic requirement, not host double arithmetic by assumption.

**Evidence:** [SETUP](../../legacy/utexas/SETUP.FOR#L145).

## SESSION-3 — Team and ship selection

Without a matching recent-player record, if team sizes differ by at least two,
assign the smaller side. Otherwise offer a side; empty selects Federation unless
Empire currently has fewer players. Explicit FEDERATION/EMPIRE prefixes select
the corresponding side. Names are then matched against the full roster in order;
accept only an available ship within that selected side's slot range.

A matching recent-player record uses the same host job/account identity, not
captain display name alone. It prefers the recorded side and ship. A full former
side prompts for defection; an unavailable former ship prompts for another ship.
Declining or blank input exits those choices. Host identity mappings are U-MONITOR.

Reserve the selected ship, clear its score, record session metadata and initialize
its resources as STATE-4. Initialize message groups ALL, KLINGON/EMPIRE,
HUMAN/FEDERATION, FRIENDLY and ENEMY using the two nine-ship sides. Randomly place
the player and then execute the initialization asset's commands through the same
command language.

The recorded Austin initialization asset contains, in order:

```
set prompt informative
set ocdef both
set output medium
targets
srscan 2 w
```

This supplied configuration is part of the reconstruction baseline; it must not
be mistaken for built-in parser defaults. Alternative startup configurations
must be identified as such in a conformance scenario.

**Evidence:** [SETUP selection](../../legacy/utexas/SETUP.FOR#L264),
[main placement and INI](../../legacy/utexas/DECWAR.FOR#L44),
[preserved INI](../../legacy/utexas-reference/f78f2ec/DECWAR.INI).

## SESSION-4 — Release and world retention

Release is a distinct operation from damage becoming fatal. For an occupied
ship, acquire release exclusion, clear its board cell, decrement admitted and
side counts, and sever any tractor beam. If this leaves no players in an
unterminated world, retain the world until five minutes after current time of day.

Record the session in a recent-player ring of capacity ten, updating a matching
entry or advancing the replacement slot. Preserve the departed ship's state
for the separate restart entry, clear public session identity and ship position/
energy, drain that ship's pending hit and radio messages, and mark the slot free.
Normal QUIT and world-end handling perform final POINTS before release; a failure
there can prevent subsequent cleanup (U-FINAL-POINTS and U-ZERO-AVERAGE).

Austin's exit paths do not call the removed persistent CompuServe standings
updates. GRIPE persistence and host account identity are separate from standings.
The presence of unused statistics buffers in assembly does not add an active
standings feature.

**Evidence:** [FREE/RSTART](../../legacy/utexas/DECWAR.FOR#L1082),
[main exit](../../legacy/utexas/DECWAR.FOR#L290),
[ENDGAM](../../legacy/utexas/DECWAR.FOR#L961).

## SESSION-5 — World termination

Absent an already-set end flag, the world continues while any planet remains,
or while both sides have at least one base. It ends when no planets remain and
at least one side has no bases. Privileged ENDFLG can also request termination.
Mark the world retired, announce the result, perform the current player's final
scoring/release if there is one, and exit that session. Other sessions observe
the shared end flag when they reach an end-game check.

If planets and both base counts are all zero, mark total destruction. Otherwise
the source's exit classification chooses Federation on a tie in base counts and
Empire only when it has more bases; the announced conditions depend separately
on the base counts. Do not replace these rules with a generic last-player-standing
win condition.

**Evidence:** [ENDGAM](../../legacy/utexas/DECWAR.FOR#L961),
[SET ENDFLG](../../legacy/utexas/DECWAR.FOR#L3715).
