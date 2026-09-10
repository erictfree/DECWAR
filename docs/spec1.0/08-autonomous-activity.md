# 8. Autonomous activity

Autonomous activity changes the galaxy without a separate command from each
affected player. A player's completed turn can trigger attacks on other ships,
not only on the ship whose command caused the activity. Section 9 specifies
the order of these phases relative to repair, stardates and score commitment.

## 8.1. Base defense

When Section 9.1 triggers a world-activity cycle, activate the opposing
faction's bases. Each
active base attacks every commissioned enemy ship within Chebyshev distance
four, in fixed ship-roster order. A ship must occupy its sector to be a target.
Recheck eligibility for each attack: a ship destroyed by an earlier attack
does not receive another hit. Friendly ships and planets are not targets.

Each attack uses phaser power `Math.trunc(200 / players)`, where `players`
counts player commissions not yet released, including destroyed ships awaiting
release. The triggering player's commission is included, so this denominator
is positive for player turn completion. Base strength does not scale this
power, and firing does not consume base strength. The attack uses Sections
6.1–6.2 without a player-device impairment factor or overheating check.

Add the reported hull damage directly to the defending base faction's
`TeamState.score.ENEMY_DAMAGE`. A kill adds 500 directly to that faction's
`ENEMY_KILLS` score. No player receives a pending award for the base's attack.

After processing enemy ships, the base attacks a present Romulan within
distance four, using the same power and Section 6.5. Add reported damage to
the base faction's `ROMULAN` score, plus 500 if the Romulan is destroyed.
Continue with the next base. Destroying the Romulan prevents later bases from
attacking that now-absent vessel.

### Notifications

For a base hit on a player ship during player-triggered activity, recipients
are the union of:

- eligible ships of the triggering player's faction within distance ten of
  the target;
- eligible ships of either faction within distance four of the target; and
- the target itself.

Use Section 10.5's recipient eligibility, including a destroyed target awaiting
release. Radio-off, gagging and radio damage do not suppress this local hit
report. A base hit on the Romulan instead selects eligible ships of either
faction within distance ten of the target. Both use Section 10.7's phaser-hit
text, with the base as source. These local reports are distinct from a base's
faction-wide distress notice.

### Examples

- With two unreleased player commissions, each base attack uses power 100.
  With three it uses power 66, not 66.7.
- An Empire player's turn activates Federation bases. Such a base can attack
  several Empire ships within range, even if the triggering ship is elsewhere.
- An Empire observer nine sectors from such a target receives the hit report.
  A Federation observer at that distance does not; at distance four it does.

> Reviewer note — ordering and scope: Relative base order still needs a pure
> definition; the historical source uses numbered base slots, which the ADTs
> deliberately do not reproduce. Temporary ship concealment during HELP/GRIPE
> remains C-002. Romulan-triggered activation of both factions, no-player
> behavior and the remaining activity scheduler require their own rules.
> Reported-damage precision inherits the outstanding combat precision decision.

## 8.2. Base restoration

After planetary attacks in a completion-triggered world-activity cycle, restore every
active opposing base by `Math.trunc(25 / factionPlayers) / 10` percentage
points, capped at strength 100. Here `factionPlayers` counts unreleased
commissions of the triggering player's faction. It is not the number of
enemy ships or bases. Restoration emits no report and does not recreate a
destroyed base.

For example, one triggering-faction player gives each opposing base 2.5
percentage points; two give 1.2; three give 0.8. A base at 99.5 with a 1.2
increment ends at 100. This phase follows base defense, so a base does not
receive this restoration before firing in the same completion.

Restoration after a Romulan attack uses both factions and a different
denominator, defined in Section 8.7. Do not apply the player-triggered
increment above to that nested cycle.

## 8.3. Planetary defense

During a completion-triggered world-activity cycle, process planets in
`Galaxy.planets` order.
Skip planets belonging to the triggering player's faction. Each neutral
planet independently activates with probability one half for the whole cycle;
if it does not activate, it attacks neither ships nor the Romulan. An enemy
planet activates without this random test.

An activated planet attacks eligible ships in fixed roster order. A target
must be commissioned, occupy its sector and be within Chebyshev distance two.
An owned planet never attacks a ship of its own faction. A neutral planet can
attack either faction, including ships unrelated to the triggering player.
Recheck each target before firing; destruction in an earlier attack removes
it from consideration. There is one activation choice per neutral planet,
not one choice per possible target.

Against a player ship, phaser power is:

```typescript
const power = Math.trunc((50 + 30 * planet.construction) / players);
```

`players` counts unreleased player commissions as in Section 8.1. Apply
Sections 6.1–6.2 without player-device impairment or overheating. Firing does
not reduce construction. An owned planet adds reported damage directly to
its faction's `ENEMY_DAMAGE` score and adds 500 `ENEMY_KILLS` points for a
kill. A neutral planet's attack changes no faction or player score.

After ship attacks, attack a present Romulan within distance two. This attack
uses power `50 + 30 * planet.construction` **without division by the player
count**, and Section 6.5's Romulan phaser rule. An owned planet awards its
faction reported `ROMULAN` damage points and an additional 500 on destruction.
A neutral planet awards neither. Then continue with the next planet.

### Notifications

For an owned planet's hit, select eligible ships of its faction within distance
ten of the target, together with eligible ships of either faction within
distance four. For a neutral planet's hit, select eligible ships of either
faction within distance ten. These rules apply to both player and Romulan
targets and use Section 10.5's lifecycle eligibility. No radio or gag filter
is applied. The report uses Section 10.7, including the planet's construction
count when nonzero.

Unlike base defense's player-hit report, the extended ten-sector audience is
the planet's faction, not the triggering player's faction. The target is
within the four-sector audience and can receive its killing-hit report before
release.

### Examples

- With two player commissions and construction 3, a planet attacks a player
  with power 70 but the Romulan with power 140.
- A neutral planet's failed activation roll suppresses every attack that cycle,
  even when both player factions and a Romulan are nearby.
- A construction-zero planet still attacks: its unscaled power is 50.
- A Federation player's turn does not activate a Federation planet, even if
  an Empire ship stands beside it. An activated neutral planet can attack both.

> Reviewer note — remaining activity: These rules describe player-triggered
> cycles. Romulan scheduling, no-player cycles, concealment (C-002), score
> precision and interleaving with other activity retain their open dependencies.

## 8.4. Romulan activity eligibility and appearance

When Romulan activity is enabled, each world-activity cycle triggered by
Section 9.1 invokes this phase after base restoration. Completions that do not
trigger a cycle do not invoke it. Increase `RomulanState.elapsedTriggers` by one.
Let `players` be the number of unreleased player commissions. If
`2 * elapsedTriggers < players`, return without other Romulan activity.
Otherwise increment `RomulanStatistics.activityCount` by one and proceed.
The threshold includes equality; it is not a random activation probability.

If a vessel is present, proceed to its movement/attack cycle. If absent, an
appearance is eligible only when `elapsedTriggers >= 3 * players`. An eligible
appearance succeeds with probability 4/5. On failure, retain the trigger count;
do not start the waiting period over. On success:

1. Reset `elapsedTriggers` to zero.
2. Place a Romulan vessel in an empty sector using the placement rule below.
3. Give it energy `20 + roll / 10`, where `roll` is an independently selected
   integer from 1 through 200. Initial energy thus ranges from 20.1 through 40
   in tenths, not from 200 through 400 displayed units.
4. Increment `RomulanStatistics.appearances` by one and create an appearance
   notification for eligible ships within distance ten.
5. Continue to the newly appeared vessel's target search. Appearance does not
   itself end the activity cycle or defer a possible attack to another turn.

The cumulative activity count increases even when the vessel is absent and
not yet eligible to appear, provided the first threshold was met. In contrast,
the appearance count increases only when a vessel is actually introduced.
Killing the vessel does not reset either cumulative statistic.

### Appearance position

Choose a vertical coordinate uniformly from the integers 1 through 75, then
independently choose a horizontal coordinate from the same range. If that
sector is occupied, discard both coordinates and repeat both choices. The
first empty sector is the appearance position. Occupancy is the sector-content
relation defined in Section 2, including enabled black holes.

There is no minimum distance from a player, base, or planet, and no factional
territory restriction. The Romulan may appear adjacent to a target and proceed
to attack in the same activity cycle. Position selection precedes the energy
draw; rejected coordinate pairs do not create appearances, generate notices,
or draw a new energy value.

With at least one empty sector, this procedure gives each empty sector equal
probability. For example, if candidates (20,20) and (20,21) are occupied but
(21,20) is empty, that three-pair sequence places the vessel at (21,20). It
does not retain a vertical or horizontal coordinate from either rejected pair.

> Reviewer note — full galaxy: Repeated sampling has no successful outcome
> when every sector is occupied. The specification must either establish that
> this state is unreachable when appearance is attempted or define a failed-
> appearance outcome. No retry limit, displaced object, or forced empty sector
> is implied by this rule.

For a present vessel, the trigger count resets when an attack passes its
weapon-readiness gate, or when movement ends with the nearest attackable
target still beyond distance ten. It is not reset merely because the cycle
was eligible, or because both weapons are still waiting. Sections 8.5–8.7
define target search, pursuit and weapon selection. Readiness durations and
the exceptional states identified in those sections remain unresolved.

### Examples

- With four unreleased players and a count initially zero, the first trigger
  does not increment activityCount. The second does, even if no Romulan is
  present. Appearance first becomes eligible at count twelve.
- If the appearance choice fails at count twelve, the next trigger tries again
  at thirteen; it does not wait twelve more triggers.
- A successful appearance resets the trigger count but preserves the cumulative
  activityCount and increases appearances by one.

> Reviewer note — remaining Romulan cycle: Full-galaxy appearance, target-search
> exceptions, weapon readiness, nonplayer message delivery, no-player operation
> and interruption remain unfinished. The following sections define ordinary
> pursuit, attacks and dialogue; together they are still not a complete
> autonomous timing contract.

## 8.5. Romulan target selection

The Romulan selects a ship or base, never a planet or star, as its pursuit
target. Selection minimizes squared Euclidean distance:

```typescript
const distanceSquared = (target.vertical - romulan.vertical) ** 2
  + (target.horizontal - romulan.horizontal) ** 2;
```

After selection, movement extent and weapon-range checks use Chebyshev distance.
Do not use the pursuit metric for the ten-sector attack-range test.

Find the nearest candidate separately in four groups: Federation ships,
Empire ships, Federation bases, Empire bases. Ships must be present in their
sectors; bases must be active. Within each ship group, retain the earlier
roster member on an equal distance. Base ties use the still-unresolved base
ordering shared with Section 8.1.

Compare the four group candidates in the order above. Start with the first
available candidate. Replace it when a later candidate is nearer; on an
equal distance, replace it with probability one half. A more distant candidate
never replaces it. Each equal-distance comparison uses a separate choice.
This is not a uniform random choice among all nearest objects: multiple ships
in a faction first collapse to that faction's earliest nearest ship.

For four equally distant group candidates, the selection probabilities are
1/8, 1/8, 1/4 and 1/2 in group order. For example, from (20,20), a target at
(24,20) has squared distance 16 and is preferred to one at (23,23), whose
squared distance is 18. The selected target has Chebyshev distance four,
although the other target has Chebyshev distance three.

> Reviewer note — candidate boundaries: The historical search considers a
> candidate only when squared distance is below 5626, and its empty-search
> fallback is not a defined object choice. Its Empire-ship eligibility also
> differs from Federation eligibility when stale destroyed positions coincide
> with new occupancy. The complete rule for those exceptional states, base ties
> and no eligible targets remains open. The nearest-group and tie rules above
> apply where valid candidates exist within that historical search boundary.

## 8.6. Romulan pursuit movement

A vessel already present at the start of an eligible activity cycle selects
a target under Section 8.5. If its Chebyshev distance is at most one, proceed
directly to the weapon-readiness check without moving. Otherwise let `(dv,dh)`
be the displacement from the Romulan to the target. Use this aim vector:

```typescript
const aim = {
  vertical: dv - Math.sign(dv),
  horizontal: dh - Math.sign(dh),
};
const extent = Math.min(4, Math.max(Math.abs(dv), Math.abs(dh)));
```

Traverse Section 6.4's path with that aim, the stated extent, and zero
deflection. The extent uses the original target distance, not the shortened
aim's distance. If there is no obstruction, move to the last accepted position.
A galaxy-boundary stop without an obstruction follows this same rule.

If the path is obstructed, let `(v,h)` be its last accepted position. For each
integer `i` from one through `extent`, check `(v-i,h)` first, then `(v,h-i)`.
Choose the first candidate inside the galaxy whose sector is empty. Move
directly to it; do not trace a second path or require intermediate sectors to
be empty. A black hole is occupied and cannot be selected this way. If no
candidate qualifies, keep the Romulan at its original position, not at the
path's last accepted position.

This search always favors decreasing vertical and then decreasing horizontal
coordinates, independent of the pursuit direction. It is not a symmetric
search around the obstruction. The original Romulan sector remains occupied
while candidates are checked, so it is not an empty fallback candidate.

Movement consumes no Romulan energy. After either movement or a failed
obstruction search, select a target again using Section 8.5; a different target
can win. If the newly selected target is within Chebyshev distance ten,
proceed to weapon readiness. Otherwise reset `elapsedTriggers` to zero and
end this activity cycle. Ordinary players receive no separate movement report
from this pursuit operation.

### Examples

- From (20,20) toward (23,21), the aim is (2,0) and extent is three. It is
  not the original direction (3,1), nor an extent of two.
- If an obstructed path last accepted (22,20), the fallback candidates begin
  (21,20), (22,19), (20,20), (22,18). The occupied original sector (20,20)
  is skipped. No successful candidate means the vessel remains at (20,20).

> Reviewer note — remaining movement scope: Target-search exceptional states
> and the existing path/geometry character questions remain open. Privileged
> observer output is outside this ordinary-player rule. Weapon selection and
> readiness after movement still require completion.

## 8.7. Romulan weapons and retaliation

When a selected target is in range, compare the current time `now` with the
Romulan's phaser and torpedo readiness instants. If both instants are strictly
later than `now`, end the cycle without firing. Otherwise reset
`elapsedTriggers` and select a weapon:

- If both instants are strictly earlier than `now`, select either weapon with
  probability one half.
- Otherwise, if the phaser instant is strictly earlier than `now`, use phasers.
- Otherwise use torpedoes.

Equality is therefore significant: it passes the initial wait check but does
not pass either strict-earlier test. Readiness durations and their abstract
clock remain under review; these comparisons do not settle that timing policy.

In particular, if the phaser instant equals `now` and the torpedo instant is
later, this rule nevertheless selects torpedoes. This boundary exception must
be reviewed with readiness semantics; “choose any ready weapon” is not an
equivalent description of the evidenced comparisons.

### Phasers

Fire with power 200 using Sections 6.1–6.2, without a player-device penalty,
overheating or energy expenditure. A full-strength target base first issues
its faction distress notice. Report the hit to eligible ships of both factions
within distance ten of the target. If a base is destroyed, create its faction
destruction notice afterward. Set the next phaser readiness instant.

Romulan damage and kill awards accumulate directly in
`RomulanStatistics.score`, not in player pending scores: ship damage and kills
use `ENEMY_DAMAGE` and `ENEMY_KILLS`; base damage and destruction use
`BASE_DAMAGE`. The quantities follow Section 6.2, including the base-emergency
branch's skipped damage award. Romulan firing does not reduce its own energy.

### Torpedo bursts

A burst attempts up to three torpedoes. Before the first shot, inspect sectors
within distance one of the selected pursuit target in increasing vertical,
then horizontal order. If any contains a star, aim at the first such star
instead. Otherwise aim at the selected ship or base. This is deliberate nova
targeting, not selection of a planet as a pursuit target.

For each launched torpedo, the normal deflection is `(u - 0.5) / 2.5`, using
a unit sample. A separate integer roll from 1 through 100 misfires when greater
than 96. A misfire adds `(v - 0.5) / 5` using another sample. The current
torpedo still travels; no later torpedo is launched. There is no tube-device
damage or ammunition expenditure on the Romulan.

Use the same random extent as player torpedoes in Section 7.20 and the path
in Section 6.4. A miss produces no ordinary-player miss notice and leaves
the current aim unchanged for the next shot. For an impact:

| Object | Effect |
| --- | --- |
| Star | 80% nova; otherwise unchanged, with no unaffected-star notice |
| Black hole | Torpedo absorbed without a separate absorption notice |
| Ship or base of either faction | Shared torpedo damage; Romulan score receives awards |
| Planet of any allegiance | Reduce construction by one with probability 26%; remove below zero and subtract 100 Romulan `PLANET_DESTRUCTION` points |

The planet test is a uniform integer roll **at least 75**, hence 26%, unlike
the player torpedo's 25% test. A nova can kill the firing Romulan; in that case
stop the burst immediately. Each exploding star subtracts 50 Romulan
`STAR_DESTRUCTION` points. Romulan nova self-effects retain the open rule
identified in Section 6.6.

Ship/base hits create a local report centered on the impact sector. After that
report, break a ship target's tractor link. Base distress and destruction
notices use the same before/after order as a player torpedo. Planet hits report
to eligible ships within distance ten. Romulan torpedo reports use the ordinary
torpedo-hit wording even when shields deflect the impact; their recorded damage
is zero in that case.

After any impact, select a pursuit target again. If it is beyond distance ten,
stop the burst. Otherwise apply the adjacent-star preference again and use
the resulting direction for the next shot. Retargeting is not performed after
a miss. Set the next torpedo readiness instant when the burst finishes normally.

### Defense after the attack

After a Romulan weapon operation returns, activate base defense for both
factions, then planetary defense for all planets, then restore bases of both
factions. Neutral planets retain their per-planet half-probability activation.
Restoration adds `Math.trunc(50 / (players + 1)) / 10` percentage points to
each active base, capped at 100. This nested defense cycle does not recursively
invoke Romulan activity or complete another player turn.

> Reviewer note — remaining weapon cycle: Readiness durations/clock, exact
> random-draw scheduling after an aborted burst, Romulan-triggered base-hit
> recipient scope, no-player cases, nonplayer message delivery and nova self-effects remain
> unfinished. The equality behavior at readiness instants needs review with
> the timing contract rather than an implicit rewrite to uniform `<=` tests.

### Discussion — nested base-report audience (C-025)

During the defense cycle following a Romulan attack, bases of both factions
fire. The historical base-hit report on a ship nevertheless retains the
ten-sector audience of the player whose completion invoked Romulan activity.
It combines that audience with both factions within four sectors and the
target itself. It does not recompute the extended audience from the firing
base's faction or the target's faction.

For example, suppose a Federation player's completion leads to a Romulan
attack and then a Federation base hits Wolf. A Federation observer nine
sectors from Wolf receives the report, while an Empire observer equally far
away does not. If an Empire player's completion causes the otherwise same
sequence, those observers' eligibility reverses. At distance four, either
observer receives the report in both cases. The target always receives it.

This dependence is not a radio or sensor-damage test. It exposes the originating
player's context in what otherwise looks like an autonomous defense report.
Possible alternatives are to use the target's faction for the extended
audience, preserving ordinary opposing-base defense behavior, or to give
both factions the ten-sector audience after a Romulan attack. Either changes
which players receive information. The choice remains unresolved; no faction
is assigned to the Romulan to explain the historical behavior.

This issue concerns base hits on player ships. Base hits on the Romulan use
the two-faction ten-sector audience. Planetary hits retain their planet-
allegiance audience from Section 8.3, independent of the originating player.

## 8.8. Romulan dialogue

After a successful appearance and its appearance-notice creation, attempt
dialogue with probability 1/5, before target selection. After a weapon operation
returns, attempt dialogue with probability 1/10, before the ensuing base and
planet defense cycle. These are separate choices: a newly appeared Romulan
that attacks can attempt both in one activity cycle. A cycle ending at the
weapon-readiness gate does not reach the second choice.

For each successful dialogue choice, draw a recipient group uniformly from
ALL, FEDERATION, and EMPIRE. Then independently choose a prefix, adjective,
and noun uniformly from their respective lists below, in that order. The
group determines the intervening qualifier; it is not another random choice.

| Component | Alternatives |
| --- | --- |
| Prefix | `Death to `; `Destruction to `; `I will crush `; `Prepare to die, ` |
| Adjective | `mindless `; `worthless `; `ignorant `; `idiotic `; `stupid ` |
| Group qualifier | ALL: `sub-Romulan `; FEDERATION: `human `; EMPIRE: `klingon ` |
| Noun | `mutant`; `cretin`; `toad`; `worm`; `parasite` |

Concatenate prefix, adjective, qualifier, noun, and `s!`. Spaces shown inside
the components are significant. The text is plural even if only one player
ultimately receives it. For example, ALL with the first choice in each list
produces `Death to mindless sub-Romulan mutants!`. EMPIRE with the fourth
prefix, fifth adjective, and third noun produces
`Prepare to die, stupid klingon toads!`.

The selected group describes intended recipients, not guaranteed deliveries.
Radio eligibility and the issues below determine which players receive a
copy. Group and phrase selection precede recipient filtering; there is no
redraw merely because the chosen group has no eligible recipient. These
messages do not request player input or spend Romulan energy.

### Discussion — nonplayer send and delivery effects (C-024)

The historical nonplayer send path uses TELL's per-ship radio and presence
checks after selecting the entire group, rather than first limiting the group
to commissioned ships as player TELL does. It can therefore produce absent-
player or unreachable-radio diagnostics during autonomous speech. It also
passes through the sender-ungagging update even though no player is speaking.
Treating that update as a game rule would allow autonomous dialogue to change
the triggering player's gag preferences.

The delivery path also applies a player-indexed gag test to a Romulan sender
whose code has no roster index. Its observable result is not established here;
it is not evidence for a new Romulan gag bit or an implicit player identity.
The phrase generator above is defined, but these sending side effects and the
complete nonplayer message header remain unresolved.

The proposed alternative retains the speech triggers and generated text,
selects commissioned recipients with reception enabled and radio damage below
300, leaves all player gag sets unchanged, and renders an explicitly identified
Romulan message. This would preserve the taunts while removing effects of
reusing a player send path. Its recipient policy and exact header require
review before adoption.
