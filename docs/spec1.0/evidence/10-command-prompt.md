# Command-prompt evidence

DECWAR.FOR PROMPT:3107–3125 and MSG.MAC:38. NORMAL prints `Command: `.
INFORMATIVE tests life-support damage, shield state/strength, hull damage and
energy in that order, then emits `> `. Executable comparisons are inclusive;
the preceding comments describe some thresholds as strict and are not followed.
Displayed thresholds are life support300, shields10%, hull2000, energy1000.
The life-support reserve uses free-format integer output. No prompt-local
newline or state change occurs. GETCMD determines eligibility and surrounding
output; the formatter does not model command acquisition.

Tests cover all16 indicator combinations at exact boundaries versus adjacent
tenths, lowered shields at high/zero strength, normal prompt independence and
SET PROMPT followed by rendering. Prompt placement relative to pending events,
interruptions, bells and readiness remains outside these rendering tests.
