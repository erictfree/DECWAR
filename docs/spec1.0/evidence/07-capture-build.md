# CAPTURE and BUILD evidence

Working Sections 7.15–7.16; combat, score units, and execution still incomplete.

- DECWAR.FOR:518–592: BUILD destination resolution, ordered adjacency/object/
  ownership/capacity checks, stage increase, pending score 500 times stage,
  conversion bonus 2500, discovery transfer, base strength 1000 stored units.
- DECWAR.FOR:605–685: CAPTURE changes ownership, clears construction, charges
  50 displayed energy per build, invokes PHADAM with power 50+30*builds,
  credits former owner for attack, awards 1000 stored capture points, and
  retains capture when attacker dies.
- MSG.MAC:12–35: construction and capture text; literal newlines matter.

Do not copy pending-score constants until category scaling is established.
Capture performs an early planet-centered recipient selection, but replaces
it with capturing-faction range10 around the ship and all-faction range4 there.
PRIDIS:3063 resets the recipient set when its final argument is zero;
CAPTUR's post-attack call uses zero. The early selection does not survive.
Capture calls BASKIL for the former owner; investigate victory implications.
BUILD may leave intermediate state on lock failure; locks are not game rules.

Score-unit question resolved: POINTS:2993–3004 passes every category directly
to OFLT, which renders stored tenths (WARMAC.MAC:1952–1967). Thus the abstract
awards are capture100; build50*stage, plus250 on conversion. The preceding
warning about unestablished scaling is superseded for these awards. Their
category totals are points without extra weighting; failure/concurrency and
former-owner retaliation credit remain separate work.

BUILD output follow-up: DECWAR.FOR:541–546,574–592 and MSG.MAC:12–20,148–149
define stage lines, conversion text and all four eligibility diagnostics.
There is no uniform leading newline: ordinary stages and nonadjacency lack it;
the nonfriendly-planet diagnostic lacks a final newline. Base-limit text adds
literal `s` even to compact base symbols. Added exact rendering tests across
these outcomes and coordinate/output preferences.

PLNRMV:2864–2891 shifts subsequent planets, preserving their relative order.
It calls BASKIL and ENDGAM during conversion, before BUILD finishes installing
the base. The local replacement alone is therefore not a complete transaction;
port-loss/game-end timing and base insertion order remain unresolved shared
dependencies. No storage slot policy or historical lock failure was adopted.

Capture-sequence follow-up: CAPTUR:639–660 calls PHADAM, awards former-owner
damage/kill scores directly, replaces recipient selection, prints capture and
records a hit before adding100 pending capture points. Its fatal branch then
prints captu1/captu2, ship name and captu4. PHADAM:4167 enters after TORDAM's
early fatal-target guard, so the attack still runs after capture expenditure
has exhausted energy. Added explicit diagnostics, immediate success/fatal
wording and faction scoring to7.15. A focused recipient test distinguishes
the final ship-centered audience from the discarded planet-centered audience.
The dispatcher review in evidence/09-completion.md establishes that fatal
capture returns through completion, unlike fatal movement. Section 7.15 now
gives a paired surviving/fatal neutral-planet trace through score commitment.
With both phaser samples zero and shields down, power50 at distance1 gives
damage360 and a noncritical test36 < 170; initial energies1000 and300 give640
and-60. This avoids the open finer-than-tenths precision decision. The only
planet becomes friendly before the due world cycle, leaving no eligible
world target in the scenario. Radio damage80 repairs to50 in both columns.
These are source-derived trace expectations, not original-executable results
or a full CAPTURE implementation test. Exact zero-denominator final reporting
and general concurrent delivery remain open.
# Completion and decision-boundary review — 2026-09-08

Section 7.16 now follows an agreeing fifth-stage BUILD through replacement,
500 pending points, exact short announcement, automatic repair, below-threshold
world trigger, stardate and score commitment. Source: DECWAR.FOR:537–581
(eligibility, stage award, conversion bonus, discovery transfer and output),
with the Section 9.1 completion path. No docked ships, one remaining planet
and no previous bases avoid C-021, C-022 and C-004 respectively without
resolving them. This is a source-reviewed specification scenario, not a new
executable transaction or original-executable transcript.

CAPTUR at DECWAR.FOR:627–641 checks former-owner docking before allegiance
changes. Added its concrete divergent effect on another ship to Section 7.15.
BUILD:563–572 calls PLNRMV before base installation; PLNRMV:2865–2889 calls
ending. Section 7.16 now contrasts that final-planet path with completing
replacement before ending and explicitly separates final award commitment.
Existing C-021/C-022 remain unresolved. No host synchronization mechanism is
introduced into the abstract model.
