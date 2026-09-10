# REPAIR and DOCK evidence

Working Sections 7.13–7.14; shared readiness/completion remain incomplete.

- DECWAR.FOR:3190–3227: REPAIR defaults 50/100, automatic 30, maximum damage
  cap, ALL, per-device subtraction, and optional report. Negative amounts are
  not rejected. If maximum damage is zero, no subtraction occurs.
- DECWAR.FOR:147–151,223–252: explicit repair can bypass turn completion when
  its remaining delay is nonpositive; otherwise automatic repair precedes
  subsequent world activity, stardate, life support, and scoring.
- DECWAR.FOR:893–940: DOCK counts every adjacent friendly base twice and planet
  once, replenishes, doubles hull repair when already docked, resets reserve,
  reports before returning. Successful dispatch passes through automatic repair
  at 3400; it does not call the explicit docked repair mode.
- MSG.MAC:47–49: docking failure suffix and success text.

C-016 records negative repair and output-duration-dependent turn completion.
REPAIR's `maxd == 0` branch jumps to label 600 before consuming ALL.
Numeric amounts advance `ntoken` before that branch. Consequently an undamaged
ship's `REPAIR ALL DAMAGE` never calls DAMAGE, whereas `REPAIR 0 DAMAGE` and
`REPAIR DAMAGE` do. Section 7.13 and C-010 flag this unresolved exception rather
than silently adopting uniform suffix handling.

The current TypeScript port retains this branch in both `src/game/repair.ts`
and `src/game/repair-statements.ts`. A read-only execution of the statement
runtime fixture with all nine device damages zero produced:

| Input | Port output (escaped) |
| --- | --- |
| `REPAIR ALL DAMAGE` | empty |
| `REPAIR 0 DAMAGE` | `\r\nAll devices functional.\r\n` |
| `REPAIR DAMAGE` | `\r\nAll devices functional.\r\n` |

Probe log: `logs/spec1.0-nova/repair-port-probe.log`. This confirms the port's
routine behavior, not a live terminal session or original-executable comparison.
It does not resolve whether the new specification should retain the exception.

The explicit-repair companion checks resolved nonnegative requests, docked and
undocked defaults, maximum-damage capping, all-device changes, report selection
and output before automatic repair. It preserves unrelated ship properties.
It deliberately declines negative requests and undamaged ALL-with-report,
and does not assign readiness or turn consumption. These are immediate-stage
scenarios, not full command conformance or original-executable transcripts.
DOCK's timer uses slwest; do not import that terminal quantity into the game.
The model has no cached friendly-planet count; docking derives membership from
Galaxy.planets, rather than reproducing the historical cache guard.

Docking checks now connect port selection, immediate ship changes and output.
Four scenarios cover all-friendly service aggregation (including a strength-one
base), resource caps and double hull repair, neutral/enemy-only rejection,
and appended STATUS before automatic repair. The latter reports a radio with
310 damage as damaged; subsequent ordinary repair takes it to280. Inputs are
a commissioned positioned ship, active ports and resolved STATUS fields.
The companion intentionally stops before autonomous activity and does not
claim a full completed-turn transcript or select a readiness duration.

A fifth scenario composes immediate docking and the appended report with
automaticRepair, lifeSupportCheck and commitScore in Section 9.1 order. It
now uses worldActivityTrigger with progress zero and two unreleased players:
progress advances to one and no cycle is due. This replaces the earlier
unjustified quiet-phase premise; no independently triggered event interleaves
the sequential case. The case checks preserved earlier
output, later functional-radio output, critical-but-docked life support,
stardate/faction-turn increments and commitment of an existing pending award.
Source: DOCK at DECWAR.FOR:893–940 and main completion at labels 3400 onward.
Log: `logs/spec1.0-nova/dock-completion-check.log`. Full scheduling, readiness,
raw STATUS input and later acquisition output remain outside this check.

REPAIR token follow-up: DECWAR.FOR:3190–3227 initializes its default amount,
consumes an integer in position two, and otherwise changes that amount only
for ALL. It does not diagnose unmatched operands. The new repairFromTokens
companion connects these ordinary/C-010 review paths to immediate repair and
typed DAMAGE selection. Three tests check the amount/report distinction,
default repair on unmatched input and report recovery after changes. Negative
amounts and undamaged ALL with a report remain guarded. No readiness policy or
complete command-acquisition transcript is claimed.
Log: logs/spec1.0-nova/repair-input-check.log.

Due-cycle DOCK trace: Section7.14 now composes service and pre-completion STATUS
with a single enemy-base attack, friendly-planet skip, base restoration and
disabled Romulan phase. Sections6.1–6.2 and8.1–8.3 supply these rules; both
attack samples are zero, producing exact damage720 without a precision choice.
The companion checks the fixture-selected arithmetic and later STATUS, not
a general world dispatcher or notification delivery. Check:
logs/spec1.0-nova/dock-due-cycle-check.log.
