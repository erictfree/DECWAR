# Completion evidence

DECWAR.FOR dispatcher61–218 routes PHASERS/TORPEDOES directly to3500, bypassing
automatic repair3400; BUILD/CAPTURE/DOCK/REPAIR and surviving movement use3400.
Completion223–253 establishes repair, due world activity, stardate/faction turn,
life support, and pending-score commitment order. REPAIR3190–3227 supplies the
30 displayed damage-unit decrement. MSG.MAC101–103,308 gives the life-support
warning. Pending score constants use displayed points as established separately.

Follow-up: DECWAR.FOR:225–239 increments the shared completion count, skips
world activity while it is less than NUMPLY, then resets it to zero before
BASPHA, PLNATK, BASBLD and optional ROMDRV. HISEG.FOR:9,77 declares the count
in shared game data, not one counter per player. Chapter 8's earlier wording
incorrectly invoked these phases at every completion. The abstract
Galaxy.worldActivityProgress now captures the observable cadence; it does not
prescribe shared-memory implementation. Population changes affect the next
comparison; no other explicit DOTIME assignment occurs in the preserved
Austin sources. Initialization and concurrent-event order remain open.

Dispatcher:61–218 also establishes the exhaustive noncompletion-command list.
MOVE/IMPULSE's normal returns test ALIVE before completion and branch to final
POINTS/release at 3810/3800 when fatal (102–114,291–309). CAPTURE has no such
caller test: even its fatal normal return (658–668) enters automatic repair
and completion (72–74). Its pending capture award therefore commits before
ordinary GETCMD final reporting. This closes that particular fatal-path
ordering question, not all notice delivery or game-ending interleavings.

The companion tests cover the shared cadence, population changes, automatic
repair, score commitment and life-support boundaries. They do not constitute
a complete dispatcher or autonomous-cycle integration test. Initial typecheck
identified the single Galaxy fixture requiring the new property; the corrected
fixture sets an explicit scenario value, not a new-galaxy initialization rule.

GETCMD:1204–1212 supplies the pre-prompt alert update: after hull/energy fatal
tests, energy <=10000 stored units unconditionally assigns YELLOW, including
from RED. Higher energy leaves the condition unchanged. YELLOW emits the
four-BEL ASCIZ constant before ENDGAM and PROMPT; the five seven-bit characters
of octal034160703400 are 7,7,7,7,0. This is separate from PROMPT:3110–3122's
informative indicators and applies to both prompt styles. Added the missing
rule to9.3 and three tests for equality, retained YELLOW without E, and fatal
exclusion. The helper returns the alert transition and warning, not a complete
GETCMD operation. No compiler arithmetic behavior is used for this boundary.
