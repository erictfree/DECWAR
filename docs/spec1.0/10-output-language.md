# 10. Output language

This chapter defines formatting operations used by command output. Commands
specify which fields appear and in what order; these rules specify how those
fields are written. Scan cells use Section 7.9's separate symbol language.

## 10.1. Object names

Long output uses the names below. Medium and short output use the compact
form. These are report names, not alternative game identities.

| Object | Long | Medium and short |
| --- | --- | --- |
| Ship | Full roster name, initially capitalized | Roster initial |
| Federation base | `Fed Base` | `<>` |
| Empire base | `Emp Base` | `)(` |
| Romulan | `Romulan` | `??` |
| Neutral planet | `Neu planet` | one space followed by `@` |
| Federation planet | `Fed planet` | `+@` |
| Empire planet | `Emp planet` | `-@` |
| Star | `Star` | `*` |
| Black hole | `Black Hole` | `BH` |
| Empty sector | `Empty Space` | `.` |

A requested separating space follows the name; it is not part of the name
itself. Base names do not include a base number. Compact report planets differ
from scan planets: `+@` here corresponds to `@F` in a long scan.

## 10.2. Decimal fields

Integer fields use base-ten digits. Ordinary fields show a minus sign only
for negative values. Signed integer fields show `+` for positive values, `-`
for negative values, and no sign for zero.

A width counts the integer digits and any sign. Width zero uses only the
characters needed; a positive width right-aligns the value with spaces. For
values that fit, width 3 formats ordinary 7 as `  7` and signed 7 as ` +7`.

Energy, damage, and percentage report fields with one-decimal precision show
the decimal point and one fractional digit in medium and long output. Short
output omits both, truncating toward zero rather than rounding. The width
applies to the integer part including its sign, not to the `.d` suffix.
Thus 12.5 at width 6 is `    12.5` in medium/long output and `    12` in short.

Signed one-decimal fields retain the sign when truncation leaves zero. Positive
0.5 is `+0.5` or `+0`; negative 0.5 is `-0.5` or `-0`. Exactly zero uses a minus
sign in this signed decimal form. Shield reports use this form after assigning
positive strength for raised shields and negative strength for lowered shields.

For a positive width, if the integer part including its sign does not fit,
retain the sign and fill the remaining integer-field positions with asterisks.
Do not expand the field or print the number's final digits. Width zero is
unbounded and does not overflow. Decimal output still appends the original
fractional digit after a decimal point; short output omits that suffix as usual.
The formatting does not change the underlying game value.

| Value and form | Width | Output |
| --- | --- | --- |
| Ordinary integer 100 | 2 | `**` |
| Ordinary integer -100 | 2 | `-*` |
| Signed integer 100 | 2 | `+*` |
| Ordinary decimal 100.2 | 2 | `**.2` |
| Signed decimal -100.2 | 2 | `-*.2` |
| Signed decimal 0 | 1 | `-.0` |

The last case follows the signed-decimal zero rule: the minus sign occupies
the only integer-field position, leaving no position for a digit or asterisk.
For signed integers, zero has no sign and therefore fits a width of one as `0`.

> Reviewer note — precision: These rules cover values already representable
> in tenths. Conversion from finer abstract values remains a rule-specific
> question; do not silently round them here.

## 10.3. Positions

An absolute position is vertical then horizontal, separated by `-`. Medium
and long forms prefix `@`; short form omits it. Relative output is displacement
from the observing ship, vertical then horizontal, separated by a comma. Each
relative component uses the signed integer form. BOTH output gives absolute
then relative, separated by one space.

At field width zero, position (22, 17) observed from (20, 20) is:

| Preference | Long or medium | Short |
| --- | --- | --- |
| ABSOLUTE | `@22-17` | `22-17` |
| RELATIVE | `+2,-3` | `+2,-3` |
| BOTH | `@22-17 +2,-3` | `22-17 +2,-3` |

For width `w > 0`, each absolute component has width `w`; each relative
component has width `w + 1` to accommodate its sign. At width zero, an object's
position equal to the observer's suppresses the relative part entirely: RELATIVE
prints no position characters, and BOTH prints only the absolute part. At
positive width, the zero relative components are printed normally.

Commands can override output preferences for a particular field. For example,
an illegal report coordinate uses absolute short form regardless of preference.

## 10.4. Individual galaxy-report rows

Begin a row with `*` for a nonfriendly, nonneutral object, except in TARGETS;
otherwise begin with one space. Append the object name from Section 10.1.
Pad with spaces until 13 characters have been written in long output, or
4 in medium/short output; if already beyond that point, add no padding.
This places the next field in column 14 or 5 respectively, counting from 1.

Write visible positions at width 2. A visible ship's signed shield strength
or base's strength follows immediately as a decimal field of integer width 6;
append `%` except in short output. Distant ship rows instead append
`out of range` without a position. Distant known enemy bases omit strength.
Planet construction, when nonzero, uses integer width 6, followed by ` build`
or ` builds` in long output, ` b` in medium output, and no suffix in short.
Finish every row with a newline. These rules do not specify blank lines between
groups of rows; Section 7.10 governs report assembly.

A visible Romulan row reports `Romulan.energy` at the same integer width of 6,
without a sign for positive values. Medium and long output append the literal
`%`; short output omits it. This historical suffix does not convert energy to
a percentage of a maximum, and the model does not acquire a second strength
property. For example, energy 30.5 is displayed as `30.5%`, not normalized to
100 or to an initial-energy value. A distant Romulan row instead reports
`out of range`, like a distant enemy ship.

For a Romulan at (21,20), energy 30.5, long absolute-coordinate output gives:

```text
*Romulan     @21-20    30.5%
```

TARGETS replaces the leading `*` with a space, as it does for other enemies.

For Excalibur at (20, 20), shields up at 75.0, using absolute output coordinates,
the individual long row is:

```text
 Excalibur   @20-20   +75.0%
```

The medium and short rows respectively are:

```text
 E  @20-20   +75.0%
 E  20-20   +75
```

These are individual rows, not whole-command transcripts: a LIST invocation
also has initial and inter-category newlines and may produce other rows.

## 10.5. Combat-notification recipients

Combat notifications are distinct from subspace-radio messages sent by TELL.
A local combat notification selects ships at Chebyshev distance at most 10
from its specified center. Both commissioned ships and destroyed ships awaiting
release are eligible; available ships are not. Use each eligible ship's
position when the notification is created. The destroyed target can therefore
receive its final report before release.

Local combat selection does not test `Ship.radio.enabled`, radio-device damage,
or gagged ships. It is not restricted to the attacker, target, or either
faction. An eligible bystander receives the same event facts, formatted using
that player's output preferences. The event captures hit facts such as source
and target positions and strengths; later changes to those objects do not
rewrite the recorded hit.

The following table defines selection for player weapon attacks and their
nova effects. “Local” uses the rule above; “attacker only” selects the issuing
player without a distance test.

| Notification | Recipients and selection center |
| --- | --- |
| Phaser hit on a ship, base, planet or Romulan | Local, centered on the resolved target position |
| Torpedo hit on a ship or base | Local, centered on the impact sector before displacement |
| Torpedo hit on a planet or Romulan | Local, centered on the impact sector |
| Torpedo miss, black-hole absorption or friendly-object neutralization | Attacker only |
| Star unaffected by a torpedo | Attacker only |
| Star goes nova | Local, centered on the exploding star |
| Nova hit on a ship or base | Local, centered on the target's position after successful displacement, otherwise its prior position |
| Nova hit on a planet | Local, centered on the planet's position |
| Full-strength base distress or base-destruction notice | Eligible ships of the base's faction throughout the galaxy, with radio enabled |

A ship destroyed by black-hole displacement retains its prior position for
recipient selection; the displacement destination is a separate event fact.
Faction-wide base notices test radio enabled, but do not test radio-device
damage or gag lists. A local hit report and a faction-wide base notice are
separate notifications: a player may receive either, both, or neither.

### Impact center versus reported destination

For a torpedo that hits a ship, first apply damage and any displacement, then
select recipients around the original impact sector. The hit snapshot reports
the target's resulting position with the displacement indication. Do not select
recipients around that reported destination merely because it is the position
retained in the target snapshot.

For example, suppose a target survives an impact at (20,20) and is displaced
to (21,20). An otherwise eligible observer at (10,20) receives the report:
it is ten sectors from the impact, although eleven from the destination. An
observer at (31,20) does not receive it: ten sectors from the destination is
insufficient because it is eleven from the impact. Both distances are
Chebyshev distances. The target's reported position is (21,20) for every
selected recipient, subject only to coordinate formatting.

The selected recipient set therefore carries the result of the spatial test;
delivery does not need to reconstruct that test from the target snapshot.
If the target later moves again, neither the stored destination nor the
audience changes. This torpedo rule must not replace the distinct post-
displacement center used by nova hit reports in the table above.

For example, a commissioned enemy observer exactly 10 sectors from a torpedo
impact receives the local hit report even with radio off. A friendly ship
outside that range receives no local report, but receives the base's distress
notice if its radio is on. A destroyed but unreleased nearby target remains
eligible for the local report.

> Reviewer note — remaining events: Section 9.5 defines creation-time facts,
> delivery-time preferences and positions, release effects and notification
> class priority. Ordering within pending combat reports and capacity loss
> remain under C-023 review. Concurrent release races, autonomous attacker
> cases, and Romulan nova reports remain to be completed.
> Do not infer either radio-style gag filtering or immediate synchronous output
> from the selection rules.

## 10.6. Torpedo outcomes and base notices

The templates below specify literal output. Braced fields are replaced without
adding spaces: `{n}` is the torpedo's one-based number within its burst,
`{position}` is Section 10.3's width-zero position field, and `{base}` is the
base name from Section 10.1. Use the receiving player's coordinate and output
preferences. `\n` denotes a newline. Long output adds one newline before each
notification; medium and short output do not.

### Torpedoes without a damage report

| Outcome | Long output, following its initial newline |
| --- | --- |
| Miss | `Weapons Officer:  Captain, torpedo {n} lost {position}\n` |
| Black-hole absorption | `Weapons Officer:  Captain, torpedo {n} swallowed by black hole {position}\n` |
| Friendly-object neutralization | `Weapons Officer:  Captain, torpedo {n} neutralized by friendly object {position}\n` |

Medium and short output use the following templates. The position field still
differs between those output lengths as defined in Section 10.3.

| Outcome | Medium and short output |
| --- | --- |
| Miss | `T{n} miss {position}\n` |
| Black-hole absorption | `T{n} gulp {position}\n` |
| Friendly-object neutralization | `T{n} neutralized {position}\n` |

For a miss, the position is the path's last accepted position, including when
the path ends at the galaxy boundary. For absorption and neutralization, it
is the obstructing sector. The neutralization message does not identify the
friendly object's kind or name. These messages go only to the firing player.

### Base distress and destruction

At delivery, discard a base notice if the recipient's radio is off or its
radio-device damage is greater than 300. Damage exactly 300 permits delivery.
This is an additional check after recipient selection in Section 10.5;
turning radio off after selection can therefore suppress the notice. Gagging
does not suppress it. In long output the initial newline is emitted before
this check, so a discarded notice still contributes that newline.

| Notice | Long | Medium | Short |
| --- | --- | --- | --- |
| Distress | `{base} {position} is under attack, Captain.\n` | `{base} {position} attacked\n` | `{base} {position} A\n` |
| Destruction | `{base} {position} has been destroyed, Captain.\n` | `{base} {position} dead\n` | `{base} {position} D\n` |

For example, using absolute coordinates, a Federation base at (20,25) yields:

```text
Long:   \nFed Base @20-25 is under attack, Captain.\n
Medium: <> @20-25 attacked\n
Short:  <> 20-25 A\n
```

The labels and alignment spaces in this example are explanatory, not output.
The word “Captain” is retained in literal game dialogue; it does not change
the specification's term “player.” These templates do not define the separate
local hit report that may accompany either base notice.

### Romulan appearance

An appearance notice reports the recorded appearance position, not the
Romulan's position at delivery. Use the recipient's current coordinate-output
preference and output length, with a width-zero position field from Section
10.3. The complete templates are:

| Output length | Notice |
| --- | --- |
| Long | `\nRomulan detected {position}\n` |
| Medium and short | `??  {position}\n` |

The compact form has two spaces after `??`; it does not include `detected`.
Absolute position includes `@` in long and medium output but not short output.
For an appearance at (20,21), the three forms are respectively
`\nRomulan detected @20-21\n`, `??  @20-21\n`, and `??  20-21\n`.
For a recipient at (20,20) using relative coordinates, the compact form is
`??  0,+1\n` at either output length.

This is a local notification, not a radio message. Subsequent RADIO OFF,
radio-device damage, or gagging does not suppress an already selected copy.
Later Romulan movement or destruction does not change its recorded position.
Section 8.4 defines the appearance and recipient selection; Section 9.5 defines
delivery and release discards.

## 10.7. Hit reports

A hit report is assembled in the following order. Literal spaces and newlines
are significant. Object names, decimal fields and positions use Sections
10.1–10.3. All field widths are zero. The event's recorded facts are used, not
the objects' current strength or position. Long output begins with `\n`.

### Source and action

1. Emit the source name. For a planet with nonzero recorded construction,
   append its construction count immediately: `(3)` in long output, `3` in
   medium or short output. Omit a zero count.
2. Emit one space and the source position using the receiving player's
   coordinate mode and output length. For a ship or base, append a comma
   unless output is short.
3. For a ship, base or Romulan source, emit one space and its signed recorded
   strength. Ship shield strength is positive when raised and negative when
   lowered; bases and the Romulan use positive strength/energy. Apply the
   signed-zero convention in Section 10.2. Append `%` unless output is short.
4. Emit one space, then the action described below.

A star-explosion action is `novas` in long output and `N` otherwise. A star
unaffected by a torpedo uses ` UNAFFECTED by Photon Torpedo!` in long output
and `U` otherwise. Its initial space is additional to step 4's space. These
two reports end with `\n` and have no target portion.

A deflected torpedo in long output uses `has torpedo deflected by `; in medium
output it uses `deflected T`. Continue directly to the target portion. In short
output, use the ordinary damage form below with zero reported damage and `T`.

For other hits, emit `makes` if output is long, then one space in every output
length. If the target is a ship, base or Romulan, emit the reported damage,
followed by ` unit ` unless output is short. Omit this damage field and its
unit text for a planet. Then emit:

| Hit | Long | Medium or short |
| --- | --- | --- |
| Phaser | `phaser hit on ` | `P` |
| Torpedo | `torpedo hit on ` | `T` |
| Nova damage | `hit on ` | `N` |

### Target

In medium or short output, emit two spaces before the target name. In long
output, emit a newline before the target name only when the target is a ship
or base and the current line already contains more than 40 characters. This
is part of the game output, not a document-layout rule.

Emit the target name and, for a planet, its nonzero construction count in the
same form as the source count. Emit one space. For a displaced target, emit
`displaced to ` in long output, `-->` in medium output, or `>` in short output.
Otherwise emit `@` in long and medium output and nothing in short output.
Then emit the target position using the receiver's coordinate mode but the
short position form in every output length. In particular, the explicit `@`
above is retained even when the selected coordinate mode is relative.

For a surviving ship, base or Romulan, append a comma unless output is short,
then a space, signed recorded strength/energy, and `%` unless output is short.
Omit this entire strength portion for a destroyed target or a planet.

### Critical device damage

Only a surviving player-ship target sees its own critical-device detail.
Other recipients do not. Append `; `, the device name below including its
trailing space, and then `damaged ` for long, `dam ` for medium, or one further
space for short output. Emit the device-damage amount and, only in long output,
` units`.

The amount is the device-damage increment caused by this hit, not the device's
total damage. It remains the recorded increment if the device is repaired or
damaged again before delivery. For example, a critical hit with initial damage
720 adds 360 to the selected device. If that device already had damage 80,
its total becomes 440; automatic repair may later reduce it to 410. The hit
report still shows 360, whereas DAMAGES reports the current total. A destroyed
target's report omits critical detail even when the event records that increment.

| Device | Long | Medium | Short |
| --- | --- | --- | --- |
| SHIELDS | `Deflector Shields ` | `Shields ` | `SH ` |
| WARP_ENGINES | `Warp Engines ` | `Warp ` | `WA ` |
| IMPULSE_ENGINES | `Impulse Engines ` | `Impulse ` | `IM ` |
| LIFE_SUPPORT | `Life Support ` | `Life Sup ` | `LS ` |
| TORPEDO_TUBES | `Torpedo Tubes ` | `Torps ` | `TO ` |
| PHASERS | `Phasers ` | `Phasers ` | `PH ` |
| COMPUTER | `Computer ` | `Computer ` | `CO ` |
| RADIO | `Radio ` | `Radio ` | `RA ` |
| TRACTOR_BEAM | `Tractor Beam ` | `Tractor ` | `TR ` |

### Base emergency and destruction suffixes

Only in long output, a base report with an emergency indication or destruction
appends two spaces, plus a newline if destroyed, followed by these two lines:

```text
Critical hit on starbase, shields down!\n
Starbase attempts to re-establish shields using emergency power!\n
```

A surviving base then emits `Base shields RE-ESTABLISHED!!\n`. A destroyed
base instead emits `Base FAILS to re-establish shields........BOOM!! ` without
a newline and proceeds to the destruction suffix. The base-emergency dialogue
appears for a destroyed base even if no emergency recovery branch preceded it.

For any destroyed target, append one space and, in long output, a newline.
If destruction was by black hole, emit the target name followed by
` displaced by blast into BLACK HOLE!\n` in long output, or ` -> BH\n` otherwise.
Then, for all destruction causes, emit the target name, one space, and
`DESTROYED!!\n`.

Finally append one newline to every hit report. This is additional to any
newline already emitted by a base-emergency or destruction suffix.

### Examples

For absolute short output, an Excalibur phaser hit reporting 100 damage on
Wolf, with recorded strengths +75 and +50 and positions (20,20) and (20,21), is:

```text
E 20-20 +75  100P  W 20-21 +50\n
```

The two spaces before `100` follow from the source/action assembly. A short
deflected torpedo with those same event fields instead uses `0T` in that
position. A star at (20,21) exploding in long absolute output is:

```text
\nStar @20-21 novas\n
```

> Reviewer note — conformance: These assembly rules define the message text,
> not C-023's remaining pending-event ordering and capacity decisions. Section
> 9.5 defines selected-recipient consumption and release discards. Full combinations
> of coordinate preferences, displacement, critical damage and destruction
> still need executable transcript coverage. Romulan nova event facts remain
> unresolved separately from this formatter.

## 10.8. Player radio-message output

For a delivered player-originated message, emit a newline, `Message from `,
the sender's name in the receiver's output length, one space, and `to `.
Then, in fixed roster order, emit one space and the single-letter roster
initial of each original recipient. Use the message's `recipients`, not
`pendingRecipients`: earlier delivery, departure or gagging does not change
the displayed addressing list. There are consequently two spaces between
`to` and the first recipient initial.

Emit a newline, the retained message text, and two newlines. The first ends
the message line; the second is the additional output separator. Medium and
short output abbreviate the sender to its roster initial but do not abbreviate
`Message from` or `to`. Coordinate preferences have no effect on this output.

For Excalibur sending `hold / wait` to Farragut and Wolf, long output is:

```text
\nMessage from Excalibur to  F W\nhold / wait\n\n
```

Medium and short output instead begin `\nMessage from E to  F W\n` and have
the same text and ending. Wolf still sees `F W` if Farragut has already received
or discarded its copy. A gagged message produces none of this output.

> Reviewer note — nonplayer messages: System-originated messages omit this
> player header; their producers must define their text. Romulan-generated
> dialogue and input echo are outside this player-message rendering rule.

## 10.9. Galaxy-report assembly

LIST, SUMMARY, BASES, PLANETS and TARGETS begin with one newline. Process
their groups in input order. A coordinate query emits its row or diagnostic
without another leading newline. A named-vessel group emits one additional
newline, then its selected Romulan and roster vessels in Section 7.10's order.
An empty aggregate selection emits its diagnostic during group processing.
These immediate outputs precede all accumulated aggregate rows, even when an
aggregate group appeared earlier in the input.

After all groups have been accepted, emit the accumulated aggregate report
in the following order. A row or summary line already includes its terminating
newline; the newlines specified here are additional separators.

1. **Romulan:** if selected for detail, emit a newline and its row. If selected
   for summary, emit a newline and its summary line.
2. **Ships:** if any ship has an aggregate selection, emit a newline and the
   detail-selected rows in roster order. Except for TARGETS, then emit a
   newline and the nonzero Federation and Empire ship summary lines.
3. **Bases:** if any base has an aggregate selection, emit a newline and the
   detail-selected rows, Federation before Empire. Except for TARGETS, then
   emit a newline and the nonzero Federation and Empire base summary lines.
4. **Planets:** if any planet has an aggregate selection, emit a newline and
   the detail-selected rows in planet-array order. Except for TARGETS, then
   emit a newline and the nonzero neutral, Federation and Empire planet
   summary lines.
5. **Targets:** for TARGETS only, if the combined target count is nonzero,
   emit a newline and its summary line.

A selected category retains these separators even when it has no detail rows
or no nonzero summary lines. Thus an ordinary detail-only ship section still
ends with the separator preceding its empty summary; a summary-only ship
section begins with two consecutive separators. An entirely unselected
category emits nothing. Do not collapse consecutive newlines.

If a later group is malformed, emit its diagnostic and return without the
aggregate report. Previously emitted direct queries and empty-selection
diagnostics remain visible. There is no rollback of earlier discovery effects
or output; aggregate discovery updates occur only as their rows are emitted.

For example, assume exactly two Federation ships and one Empire base qualify.
With medium output, `SUMMARY SHIPS FEDERATION & BASES EMPIRE` produces the
following output (each `\n` denotes one newline):

```text
\n\n\n  2 Federation ships in game\n\n\n  1 Empire base in game\n
```

With a single eligible Romulan and no other selected objects, `TARGETS SUMMARY`
at medium output produces:

```text
\n\n  1 Romulan in game\n\n  1 target in game\n
```

These examples exclude input echo and the next command prompt. Base ordering,
input interruption and the remaining selection/qualifier cases retain their
reviewer notes in Section 7.10; this section defines report assembly, not
those unresolved choices.

## 10.10. Command prompt

`PlayerPreferences.promptStyle` selects the ordinary command prompt. NORMAL
emits `Command: `, including its trailing space. INFORMATIVE emits the following
indicators in order, without spaces between them, then `> `:

| Indicator | Condition |
| --- | --- |
| `{reserve}L` | `Ship.deviceDamage.LIFE_SUPPORT >= 300`; `{reserve}` is `Ship.lifeSupportReserve` as an unpadded integer |
| `S` | Shields are down or `Ship.shields.strength <= 10` |
| `D` | `Ship.hullDamage >= 2000` |
| `E` | `Ship.energy <= 1000` |

Omit an indicator when its condition is false. Both shield conditions together
still produce only one `S`. These comparisons are inclusive: energy exactly
1000 produces `E`, and raised shields at exactly 10% produce `S`. The indicators
read these properties directly, not `Ship.condition`; `E` does not require a
stored YELLOW condition.

Section 9.3 performs the separate low-energy condition update and YELLOW
warning before this rendering operation. The warning is not part of the
prompt string and is not suppressed by choosing INFORMATIVE.

Neither prompt adds a leading or terminating newline. Output length and scan
length do not abbreviate or otherwise alter it. Prompt rendering changes no
ship state: it does not repair devices, decrement life support or complete a
turn. Command acquisition determines when a prompt is issued, after the checks
defined in Section 9; this formatting rule does not make an otherwise fatal
ship eligible for input.

With none of the conditions present, the informative prompt is `> `. With
life-support damage 300, reserve zero, lowered shields, hull damage 2000 and
energy 1000, it is `0LSDE> `. Zero reserve is displayed, not interpreted as
death by the prompt operation.
