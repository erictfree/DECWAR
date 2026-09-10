# POINTS statistical state

Subject selection at DECWAR.FOR:2893–2943 uses boolean selections, so aliases
and repeated subjects do not duplicate columns. No operands selects personal
in play or all faction statistics before commissioning. Unknown words abort;
non-words stop selection, followed by removal of disabled Romulan selection
and the nonempty-selection check. The pointsCommand companion now connects
these typed-token paths to committed model values and pointsReport. Four tests
exercise defaults, ordering/deduplication, recovery and absent/disabled Romulan
distinctions. Non-word recovery is explicitly C-010 review behavior; raw
tokenization and zero denominators remain outside its verified scope.
Log: logs/spec1.0-nova/points-selection-check.log (210 tests).

POINTS at DECWAR.FOR:3024–3044 reads NUMSHP, NUMROM, TMTURN and per-ship
stardates as denominators. SETUP.FOR:296 and323 increment NUMSHP before the
ship-selection/initialization path finishes. The ADT names this `admissions`
instead of claiming successful commissions. Cancellation/abandonment behavior
requires completion of the admission semantics.

DECWAR.FOR:239 increments faction turns on command completion. ROMDRV:3242–3252
increments Romulan activity after its eligibility threshold but before testing
whether an absent vessel appears; NUMROM increments only on appearance.
Therefore Romulan activityCount is not appearances, attacks or movement count.
Its cumulative score is RSR, separate from any one vessel's energy.

The ADT additions model these persistent report inputs without importing shared
storage or polling architecture. Their presence and a passing typecheck do not
prove the unfinished scheduling/admission update rules.

POINTS:3033–3044 divides integer totals by integer denominators (PARAM.FOR:1
declares default integer variables) before OFLT displays tenths. For positive
denominators this is truncation toward zero to a tenth in displayed units.
The draft specifies that arithmetic for totals on the tenths grid, including
negative totals; it does not generalize to unresolved finer score precision.
Added quotient/format tests, retaining zero denominators as C-013. Asked the
user about an unavailable marker; no answer is presumed.

The points-report companion now assembles all defined row forms from resolved
subjects. Full short-personal and medium-two-faction literals are checked
against Section7.8 widths and source fragments. These tests do not cover the
parser, all long/mixed-subject combinations, or production of statistical state.
