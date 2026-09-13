# 9. Execution and ordering

This chapter distinguishes a command's immediate effects from turn completion
and later delivery or readiness. Completing a turn is not the same as accepting
one line of input. Observation and preference commands do not complete turns;
a multi-torpedo burst completes one turn, not one per projectile.

## 9.1. Turn completion

When a command reaches turn completion, perform these phases in order:

1. Perform automatic device repair if this command uses the repair path.
2. Perform due world activity: base defense, planetary attacks, base rebuilding,
   then Romulan activity when enabled.
3. Increase the issuing ship's stardate by one and the faction's cumulative
   `TeamState.completedTurns` by one.
4. Check life support using the damage and docking state after those phases.
5. Commit the issuing ship's pending score to its individual and faction scores.

World activity can cause damage after repair and before the life-support check.
The phases therefore cannot be reordered merely because automatic repair
usually improves the ship's condition.

| Command reaching completion | Automatic device repair |
| --- | --- |
| MOVE, IMPULSE | Yes, if movement returns to normal completion rather than immediate fatal departure |
| DOCK, BUILD, CAPTURE | Yes |
| REPAIR | Yes, in addition to its explicit repair |
| PHASERS, TORPEDOES | No |

The following commands do not enter these completion phases: BASES, DAMAGES,
ENERGY, GRIPE, HELP, LIST, NEWS, PLANETS, POINTS, RADIO, SCAN, SET, SHIELDS,
SRSCAN, STATUS, SUMMARY, TARGETS, TELL, TIME, TRACTOR, TYPE and USERS. Their
own state changes and notification creation still occur. QUIT either returns
to command acquisition after a declined confirmation or proceeds to final
reporting and release; it does not complete a turn.

Fatal movement and fatal capture have different exits. MOVE and IMPULSE
proceed directly to final reporting and release when movement returns with
the issuing ship dead; they skip all five completion phases. CAPTURE returning
after fatal retaliation still enters the repair path, advances the stardate,
checks life support and commits its pending capture award. Its fatal-tactic
message precedes these phases. The normal acquisition fatal check follows
completion. A fatal state alone is therefore not a universal instruction to
skip completion.

The immediate movement-departure test concerns a ship already marked destroyed,
not merely one whose energy has become nonpositive. Deducting movement energy
does not itself change the ship's lifecycle. In a sequential movement with no
intervening destruction, spending the last energy therefore still reaches
ordinary completion. Acquisition then detects energy exhaustion and reports
final points before release. Do not insert an insufficient-energy rejection or
an early release between the movement debit and its completed-turn effects.

For example, Excalibur has energy 4, stardate 1, radio-device damage 80,
lowered shields, no tractor link and no critical life-support damage. It uses
IMPULSE to enter a clear adjacent sector. Its energy becomes 0, but ordinary
completion still repairs radio damage to 50 and advances its stardate to 2.
With two unreleased players, world-activity progress initially 0 becomes 1
without triggering world activity. Pending scores are committed as usual.
At acquisition, the energy check emits `E RUNS OUT OF ENERGY!!\n` in short or
medium output, after the acquisition newline and before final POINTS. Release
then removes Excalibur. A blocked first step has the same cost and completion
route, but retains the original position and emits the collision warning
before completion. This scenario does not assume a particular readiness delay.

Adding 300 warp-engine damage does not prevent this IMPULSE: only the impulse
device gates the command. Automatic repair reduces that warp damage to 270
before departure. Likewise, an existing 50-point pending capture award is
committed during completion and included in the final report. These effects
would be lost if energy zero were incorrectly treated as immediate release.

Rejected or cancelled commands reach completion only where their entry
explicitly states an exception. REPAIR timing and TORPEDOES self-target rejection
still have unresolved completion cases. Do not infer a general “errors cost
no time” rule or repair after every weapon shot.

### Completion-triggered world activity

After automatic repair, if applicable, increase
`Galaxy.worldActivityProgress` by one. Let `players` be the number of player
commissions not yet released, including destroyed ships awaiting release.
If the progress is less than `players`, skip world activity but perform the
remaining completion phases. Otherwise reset progress to zero and perform
one cycle: base defense, planetary defense, base restoration, then Romulan
activity when enabled. The faction of the player whose completion triggers
the cycle determines the opposing faction for the player-triggered rules in
Section 8. This is not a separate cycle for each player's faction.

The population is evaluated at this check, not frozen at the preceding reset.
A population change does not itself trigger a cycle or reset progress. If
progress exceeds the new population, the next completion still triggers only
one cycle, resetting progress to zero rather than retaining an excess.
This counter is distinct from each ship's stardate, faction completed turns,
and the Romulan's elapsed-trigger count. It does not gate those stardates or
score commitment. Romulan activity may itself invoke further base and planet
activity; those invocations are not additional completed player turns.

With three unreleased players and progress zero, the first two completed turns
skip this cycle and the third triggers it, even if one player issued all three
commands. Each completion nevertheless advances its issuing ship's stardate.
With progress two and four players, release of two players does not immediately
activate defenses: the next completion increases progress to three, triggers
one cycle, and resets it to zero.

> Reviewer note — initialization and interleaving: The new-galaxy initial
> progress and the ordering of concurrent completions still require lifecycle
> definitions. The rule above defines a sequential completion at a given
> population; it does not adopt historical shared-memory or locking behavior.

### Discussion — readiness, prompting and report duration

This discussion records open choices, not adopted rules (C-007 and C-016).
They are deferred for review; the draft does not require a decision now.

**Readiness** determines when a player may issue the next command. **Turn
completion** performs the state changes listed above. These are distinct:
changing a delay need not change whether repair, world activity, life support
or score commitment occurs.

In the PDP-10 implementation, movement readiness depends on terminal speed,
and its deadline starts before coordinate input. Time spent answering a prompt
can therefore consume the delay. REPAIR has a separate effect: after its
immediate device changes and optional report, it completes a turn only if some
repair delay remains. Report duration can consequently affect the game state,
not merely how long the player waits.

The following choices require separate discussion:

| Question | Alternatives and consequences |
| --- | --- |
| What determines a readiness duration? | Game-defined durations give all players the same timing contract. Presentation-dependent durations retain historical differences between terminals, but require an explicit definition of those presentation conditions. Neither choice determines the actual durations yet. |
| When does a movement delay begin? | Starting before the coordinate prompt lets time spent answering consume the delay. Starting when a complete valid invocation is accepted makes prompted and inline destinations incur the same subsequent delay. This choice is independent of terminal-speed dependence. |
| What makes REPAIR complete a turn? | Retaining the remaining-delay test lets report duration determine completion. Completing a turn whenever positive repair is performed makes the same repair produce the same completion phases regardless of reporting speed. Zero repair and negative requests require their own stated rules. |

For example, consider identical ships with 80 units of shield-device damage
requesting `REPAIR 10 DAMAGE SH`. Both immediately reach 70 and report that
value. Under the historical remaining-delay test, one can subsequently receive
30 units of automatic repair and advance a stardate while the other does not,
solely because their reports took different amounts of time. If completion
instead depends on positive repair performed, both enter the same completion
phases. Later world activity may still produce different outcomes; independence
from report duration does not suspend autonomous activity.

An editorial proposal is to use game-defined durations, start movement delay
at acceptance of a complete valid invocation, and complete a repair turn when
positive repair is performed. This removes presentation-dependent outcomes but
changes historical pacing and repair behavior. It is not a decision. No
duration, start event or replacement completion test is adopted by this note.
Negative repair and the undamaged `REPAIR ALL DAMAGE` report exception remain
separate discussion items in Section 7.13.

### Automatic repair

Reduce each device's damage by up to 30 units, independently, with a floor of
zero. Do not change hull damage, energy, shield strength, or life-support
reserve in this phase. Docking does not increase this automatic amount.
The 100-unit docked default belongs to explicit REPAIR only.

### Life support

If `ship.deviceDamage.LIFE_SUPPORT < 300`, do nothing. Otherwise, decrement
`ship.lifeSupportReserve` by one unless the ship is docked. If the resulting
reserve is negative, set `ship.hullDamage` to 2500. Reserve zero is not fatal.
This assignment establishes fatal damage; release and final reporting are
separate operations. Docking resets the reserve to 5 in the DOCK command,
not in this check.

With normal prompt style, a critical life-support check produces
`\nWARNING!!  Life Support damaged.\nReserves of `, the signed integer reserve
without a plus sign for positive values, and ` stardates.\n`. Informative prompt
style suppresses this separate warning. The state changes occur in both styles.

### Score commitment

For each score category, add `ship.pendingScore[category]` to both
`ship.score[category]` and the issuing faction's `score[category]`, then set the
pending value to zero. Negative awards are transferred in the same way.
Do not replace faction score with a sum of currently commissioned ships:
it retains contributions from earlier commissions.

*Examples:*

- Before a repair-path completion, life-support damage 320 falls to 290. If
  world activity adds no further damage, reserve does not decrease.
- After a weapon command, damage 320 is not automatically repaired. An
  undocked ship's reserve decreases by one.
- Critical life support with reserve 1 becomes 0 without fatal hull damage.
  At the next critical undocked check it becomes -1 and hull damage becomes 2500.
- A pending construction award of 150 adds 150 to both ship and faction scores,
  then becomes zero. A second commitment without new awards adds nothing.

> Reviewer note — remaining execution contract: The sequential world-cycle
> trigger, turn counters, repair and score commitment are defined above; release
> and ordinary fatal acquisition follow in Sections 9.2–9.3. Initial timing
> values, command interruption, readiness durations and simultaneous-event
> ordering remain incomplete. The defined phase order is not a complete
> scheduler, and does not prescribe process polling or shared-memory counters.

## 9.2. Ship release

Release ends a player's commission and makes the named vessel available for
selection. It is distinct from destruction: a destroyed vessel can retain its
player and pending reports until release. QUIT also releases a surviving ship.
Releasing an already available vessel has no effect.

For a commissioned or destroyed ship, release performs the following effects
in order:

1. Remove its occupancy, if it still occupies a sector. A destroyed ship's
   retained position does not give it occupancy or authorize removing another
   object now at that position.
2. Break any tractor link on both participating ships, using the tractor-release
   notification rule. The other ship remains in its current position.
3. Discard every pending combat-notification delivery addressed to this
   commission, then every pending radio delivery addressed to it. Do not
   display these discarded deliveries as part of release. Other recipients'
   pending copies remain eligible for their own delivery.
4. Set `Ship.position` to `null`, `Ship.energy` to zero, and `Ship.lifecycle`
   to `{ phase: "AVAILABLE" }`. The lifecycle change removes the departing
   player from this vessel. Its `Ship.name` and roster membership do not change.

For a radio message, removing this ship from `pendingRecipients` does not
rewrite its original `recipients`. Remove a message with no pending recipients
from `Galaxy.communication.messages`. Outgoing messages already addressed to
other players are not recalled merely because their sender departs.

Release does not advance a stardate, repair damage, replenish supplies, or
commit pending score. It does not erase the faction's accumulated score.
Properties not changed above retain their values until another operation
initializes them; an available ship is not implicitly a fresh, fully supplied
commission. The commissioning operation supplies the new commission's initial
values.

The vessel's availability and the departing player's eligibility to enter
again are separate questions. Release establishes the former; it does not
promise immediate re-entry for that player.

*Examples:*

- If Excalibur leaves a tractor link with Farragut, both links become `null`.
  Farragut stays in place; its pending link-break notice is not discarded
  when Excalibur's pending deliveries are cleared.
- A message originally addressed to Excalibur and Farragut retains both names
  in `recipients`. If Excalibur leaves before delivery, only Farragut remains
  in `pendingRecipients`.
- Releasing a destroyed Excalibur does not destroy a star that has subsequently
  occupied the ship's retained former position.

> Reviewer note — remaining lifecycle: Admission, re-entry restrictions,
> interruption/resumption and cleanup of a departing session still need
> specification. Section 9.3 defines the sequential final-report selection
> and ordering. The historical unconditional clearing of
> the old sector is not adopted: release removes the vessel, not an unrelated
> later occupant. C-020 records this distinction for review. Section 2 defines
> retained notifications; their release effect does not select the unresolved
> delivery order or capacity policy in C-023.

## 9.3. Final reports and fatal-state detection

Confirmed QUIT and fatal departure request a final POINTS report before ship
release. The report selects the departing ship, Federation and Empire, plus
the Romulan score when Romulan activity is enabled. It is not the ordinary
no-operand POINTS report, which selects only the player's ship during play.
The columns retain that order. The report uses the departing player's output
length and the POINTS layout rules.

The individual column uses the departing ship's `score` and `stardate`.
Each faction column uses its `TeamState.score`, `admissions` and
`completedTurns`; these are cumulative statistics, not counts of surviving
ships. The Romulan column uses `RomulanStatistics.score`, `appearances` and
`activityCount`. Neither current Romulan presence nor `elapsedTriggers`
replaces those statistics. Each column's averages use its own counts.

Final reporting reads committed scores. It neither adds pending awards to
the displayed totals nor commits them. A preceding completed turn may already
have committed awards under Section 9.1; departure does not synthesize another
completion to do so. Faction scores include earlier direct faction awards,
such as nova ship-kill awards, whether or not this player's pending score has
been committed.

At ordinary command acquisition, the sequence is:

1. Process pending combat reports, then pending radio messages.
2. Observe the previous command's readiness delay.
3. Emit a newline and test fatal state: hull damage at least 2500 first,
   then energy at most zero.
4. If either test succeeds, report final points and release the ship without
   issuing another command prompt. Otherwise continue to the prompt rules.

If the energy test causes departure, first emit the ship's output name,
one space, and `RUNS OUT OF ENERGY!!\n`. The hull-damage test emits no
additional generic destruction line here; an attack may already have produced
one. When both hull and energy are fatal, the hull test wins and suppresses
the energy-exhaustion line.

While waiting for input, newly pending reports are processed combat first,
radio second, after which fatal state is checked again before a new prompt.
These rules permit a target to receive its killing-hit report before its final
score report. They do not give it another command after fatal-state detection.

### Alert update before the prompt

After the fatal tests succeed in allowing continued play, set the issuing
ship's `condition` to YELLOW if its energy is at most 1000. This assignment
also replaces RED. With energy greater than 1000, retain the existing
condition; acquisition does not automatically restore GREEN.

If the resulting condition is YELLOW, emit four consecutive BEL characters
(`"\u0007\u0007\u0007\u0007"`), with no newline. This warning applies to both
prompt styles and every output length, including when YELLOW was retained
from an earlier action despite energy now exceeding 1000. Then perform the
ordinary game-end check; if play continues, render the command prompt.
No stardate, score commitment, repair or world-activity increment occurs here.

The informative prompt's `E` indicator independently tests current energy.
For example, a surviving RED ship at energy 1000 becomes YELLOW, emits the
warning, and includes `E` in an informative prompt. A YELLOW ship at energy
1000.1 remains YELLOW and emits the warning but has no `E` indicator.
A RED ship at energy 1000.1 stays RED and emits no YELLOW warning.
Do not implement this as choosing the more severe of the old and new alert
conditions. Later command restrictions, such as GRIPE's RED-condition check,
use the condition after acquisition's update.

*Examples:*

- A ship with 100 committed points and 50 pending points has 100 individual
  points in its final report if no score-commit operation intervenes.
- A zero-energy ship below 2500 hull damage reports energy exhaustion before
  final points. A ship at 2500 hull damage and zero energy does not emit that
  exhaustion line.
- With Romulan activity enabled but no present Romulan, the final report still
  selects the Romulan score column. Presence and option enablement differ.
- With individual score 100 over 2 turns, Federation score 200 over 4 turns
  and 2 admissions, and Empire score 300 over 6 turns and 3 admissions, the
  three totals are 100, 200 and 300. Each points-per-stardate value is 50;
  each faction's points-per-player value is 100. An additional pending
  individual award of 50 changes none of those displayed values.

> Reviewer note — remaining interaction: Exact ordering among pending combat
> events, readiness durations, fatal exits that bypass ordinary acquisition,
> and races with input acceptance remain open. POINTS zero-denominator behavior
> (C-013) and full report layout also constrain final reporting. This sequence
> is not a claim that every fatal path first drains pending output.

## 9.4. Normal end of the war

The normal game-end check uses the number of remaining planets and active
bases of each faction. Any remaining planet prevents this ending, regardless
of allegiance or construction. With no planets, the outcomes are:

| Federation bases | Empire bases | Outcome |
| --- | --- | --- |
| At least one | At least one | War continues |
| At least one | Zero | Federation victory |
| Zero | At least one | Empire victory |
| Zero | Zero | Mutual destruction; both factions lose |

Ships, stars, black holes, Romulan presence and scores do not enter this check.
A faction with no bases has not yet lost while any planet remains. Conversely,
having commissioned ships does not prevent defeat once the condition above
holds. Administrative termination is a separate, unresolved operation.

The first terminal result is stored in `Galaxy.warOutcome`. The check is made
after the state mutation that removes the final planet or base. A successful
fifth-stage BUILD installs its new base before this check; therefore it can
produce a faction victory, but not mutual destruction. A planet destroyed by
combat or autonomous activity creates mutual destruction when both faction
base counts are already zero.

Detection produces no ending output and releases no player. The test and latch
are one indivisible operation with respect to other ending checks. Subsequent
checks return the stored result, even if later activity destroys the other
faction's last base.

A command already accepted when the result is latched continues through its
defined effects and completion phases, including due world activity and score
commitment. Latching does not add a turn to commands that normally complete no
turn, or override a command's existing fatal exit. At the command's exit boundary,
its player receives the ending announcement, final POINTS, and release, in that
order, before readiness waiting or another prompt. Each participating commission
receives this sequence once. An idle player receives it without having to submit
another command; a queued command cannot start after the latch. Commands awaiting
an operand are already underway and retain their existing completion/cancellation
rules. No new ordinary command or independently triggered world cycle starts
after the latch; world activity already underway or belonging to an accepted
command can finish. These effects cannot change the outcome.

The rule applies to direct planet and base destruction, every removal within a
nova chain or torpedo burst, and removals caused by autonomous activity. A chain
can therefore latch victory at one removal and later destroy the victorious
faction's last base without changing that victory. Mutual destruction occurs
when both factions have no bases at the first terminal check, for example when
combat destroys the final planet after both factions have lost their bases.
Output delivery to different players need not be simultaneous; all ending
announcements use the same stored result.

For a single-faction victory, the ending output starts with
`THE WAR IS OVER!!\n\n`, then the appropriate announcement:

- Empire victory: `The Klingon Empire is VICTORIOUS!!\n\n`
- Federation victory: `The Federation has successfully repelled the Klingon hordes!\n\n`

Append one line addressed to the receiving player's faction:

| Victor | Receiving faction | Line |
| --- | --- | --- |
| Empire | Federation | `Please proceed to the nearest Klingon slave planet.\n` |
| Federation | Federation | `Congratulations.  Freedom again reigns the galaxy.\n` |
| Empire | Empire | `The Empire salutes you.  Begin slave operations immediately.\n` |
| Federation | Empire | `The Empire has fallen.  Initiate self-destruction procedure.\n` |

For mutual destruction, emit exactly:

```text
THE WAR IS OVER!!

The entire known galaxy has been depopulated.

BOTH sides lose!!
```

Do not append either faction's victory announcement to this form. These
announcements are not abbreviated by output length. Final POINTS and
release follow for a participating player, using Section 9.3's committed-score
rule. The announcement text does not itself authorize another gameplay action.

> Reviewer note — ending integration (C-022): The first-result latch,
> post-mutation check, completion of an already accepted command, and
> non-contradictory mutual-destruction output are adopted. Remaining work is
> detailed ordering with other pending notifications and administrative
> shutdown. Cross-player delivery need not be simultaneous. No later result
> may replace the first one.

## 9.5. Pending notifications and delivery context

A notification records an event for selected recipients; it is not an
immediate output operation. Recipient selection uses the event's selection
rule at creation. A recipient's subsequent movement does not remove that
recipient or add other ships now near the event. Release discards the departing
commission's pending deliveries as specified in Section 9.2. A later player
selecting the same named ship does not inherit those discarded reports.

Combat reports preserve the event's source and target identities, positions,
strengths, damage, critical-device result and destruction or displacement
result. Do not reread the current target to reconstruct the hit. Formatting
uses the receiving player's output length and coordinate output preference
at delivery. Relative positions are measured from the receiving ship's
position at delivery, not its position when selected. The source and target's
recorded positions themselves do not move.

For example, a hit records its source at (20,20) and target at (20,21).
An observer selected at (20,20) subsequently moves to (21,20) before delivery.
Relative output now places the recorded source at (-1,0) and target at (-1,+1).
The observer remains a recipient. Changes to the target's shields since the
hit do not change the strength printed for that hit.

Apply delivery-time filters only to notification kinds that specify them.
Local hit reports ignore radio enablement, radio damage and gagging.
Faction-wide base notices recheck radio enablement and radio-device damage
at delivery, under Section 10.6. A notice filtered out at this point is
consumed, not held for a later repair or radio setting change. Long output's
initial newline still occurs for that filtered base notice.
TELL messages apply their own delivery-time gag rule. These are different
rules, not one shared radio filter for all notifications.

### Consuming one selected notification

Given an occurrence in `Galaxy.notifications` and a ship in that occurrence's
`pendingRecipients`, apply the event's delivery filter and render any resulting
output using the context above. Remove that ship from `pendingRecipients`
whether the event was displayed or filtered out. Keep the recorded facts and
original `recipients` unchanged. If other pending recipients remain, retain
the occurrence for them; otherwise remove it from `Galaxy.notifications`.

Release discards use the same recipient removal without rendering or applying
a delivery filter. In particular, a release discard produces no long-output
prefix from a base notice. Later commissioning of the same named vessel does
not restore membership. These rules describe one consumption or discard; they
do not select which pending occurrence is next under C-023.

For example, a tractor activation addressed to Excalibur and Farragut remains
pending for Farragut after Excalibur receives it. Its original audience still
contains both. If Farragut departs before delivery, the final pending copy is
discarded and the occurrence is removed. A later Farragut commission receives
neither that activation notice nor a replacement generated merely by admission.

At ordinary command acquisition, consume pending combat notifications before
pending radio messages, then observe readiness and check fatal state as in
Section 9.3. Thus a radio message created before a combat event need not appear
first. This is a priority between notification classes, not a global
chronological merge. It does not authorize draining reports on direct QUIT
or fatal-movement departure: those paths report final points and release,
discarding pending deliveries that have not already been presented.

Radio messages retain their relative creation order for each recipient,
omitting messages not addressed to that recipient and those consumed without
display. Removing another recipient does not reorder the remaining messages.
The historical capacity exception below is unresolved; this rule does not
promise an adopted overflow policy.

### Discussion — combat ordering and lost notifications

The following is historical evidence and a proposed alternative, not an
adopted abstract scheduling rule (C-023).

Historical combat delivery is not chronological. With two pending reports
produced under different players' commands, a later report produced under
Excalibur's command can be delivered before an earlier report produced under
Wolf's command. Retrieval follows storage positions, not event time. Even
one triggering player can produce an inversion:

1. Report A is pending only for Yorktown; report B, created later, is pending
   only for Farragut.
2. Yorktown receives A, making its earlier storage position reusable.
3. Report C is created for Farragut and uses that position.
4. Farragut receives C before B, although B was created first.

Full historical combat storage replaces an old report that may still have
unserved recipients. Full radio storage instead discards one selected
recipient's pending messages to recover space. Neither policy is expressed
as a game action by that recipient. Pending counts and empty retrievals can
also affect presentation after such loss; no clean capacity-error contract
has yet been established.

The proposed alternative is chronological combat delivery within each
recipient's combat reports, retaining the separate combat-before-radio rule,
and no silent loss of accepted notifications. That gives implementations a
storage-independent contract, but changes observable order and loss behavior.
If bounded retention is part of the game's character, its bounds, selection
of lost deliveries and visible outcome must instead be specified explicitly.
Do not reproduce storage positions in the abstract game model merely to
settle this choice. Until review, tests of one event's content do not establish
conformance for an arbitrary sequence of pending combat events.
