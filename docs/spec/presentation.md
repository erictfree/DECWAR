# Terminal presentation

This chapter defines the text presentation of game observations. It adds no
command, weapon effect or information-disclosure permission. A terminal binding
combines these rules with the command reader and the observation order stated
by the semantic clauses. A different kind of client can present the same game
information without claiming this terminal presentation.

Spaces, capitalization, punctuation and line endings in quoted strings are
significant. Quotation marks delimit a string and are not emitted. In quoted
strings, `\r`, `\n`, `\t` and `\b` denote carriage return, line feed, tab and
backspace. Concatenation inserts no additional separator. A publication boundary
is not implicitly a line boundary.

The archive defines application terminal interaction. Network addressing,
Telnet negotiation, packet boundaries and client-local echo require a transport
binding; they are not inferred from application strings. The binding must
distinguish characters emitted by the game from characters echoed by the client.

## Presentation context

```text
record PresentationContext:
    outputLength: OutputLength
    coordinates: CoordinateMode
    origin: Optional<Position>

type FieldWidth = Free | Exactly(positive integer)
                | AtLeast(positive integer)
enum NumberSign = NEGATIVE_ONLY | NONZERO | ALWAYS_ZERO_NEGATIVE

query FormatNumber(value: real, fractionalDigits: 0 | 1,
                   sign: NumberSign, width: FieldWidth) -> Text

query FormatLocation(position: Position, context: PresentationContext,
                     field: Free | Exactly(2)) -> Text
```

PresentationContext is selected for a particular report. Usually it uses the
viewer's current output length, output-coordinate preference and ship position.
A command can explicitly select another coordinate mode or output length for
one field. Such a local choice changes no captain preference. A queued notice's
position comes from its immutable observation; context.origin comes from its
receiver at presentation time.

The number and location queries return text without emitting it, changing game
state, requesting randomness or appending a line ending. A relative field
requires context.origin. Pregame reports that do not have an acting ship must
not fabricate one to obtain a relative coordinate.

## Numbers and displayed precision

FormatNumber uses decimal digits. Its value is an ordinary number in the unit
selected by the report, not an encoded machine quantity. It displays the
specified number of fractional digits, discarding further digits toward zero.
Before field-width limits, it has at least one integer digit. One fractional digit means an
explicit decimal point and one digit, including `.0` for a whole number.

NEGATIVE_ONLY prefixes `-` exactly when value is negative. NONZERO also prefixes
`+` when value is positive, but gives an unsigned zero for value zero.
ALWAYS_ZERO_NEGATIVE prefixes `+` when value is positive and `-` otherwise.
The sign is selected from the supplied value, before discarding fractional
digits. Thus a negative fraction can be displayed as `-0.5`, and as `-0` when
zero fractional digits are requested. A displayed minus on zero is a formatting
choice, not a negative-zero game quantity.

The integer field consists of the sign, if any, and the integer digits. Free
adds no padding. AtLeast(n) pads on the left with spaces to at least n characters
and expands if necessary. Exactly(n) pads on the left when it fits; if it does
not fit, retain the required sign and replace the remaining integer-field
positions with `*`. A fractional suffix follows that field and is not included
in its width. For example:

```text
FormatNumber(12,     0, NEGATIVE_ONLY, Exactly(4)) == "  12"
FormatNumber(-12,    0, NEGATIVE_ONLY, Exactly(2)) == "-*"
FormatNumber(123.49, 1, NEGATIVE_ONLY, Exactly(2)) == "**.4"
FormatNumber(-0.59,  1, NEGATIVE_ONLY, Free)       == "-0.5"
FormatNumber(0,      1, ALWAYS_ZERO_NEGATIVE, Free) == "-0.0"
```

Ordinary counts and coordinate components use zero fractional digits. Reports
of energy, damage and strength ordinarily use zero fractional digits in SHORT
and one in MEDIUM or LONG. Discarding display digits changes neither the stored
game quantity nor a later calculation. It does not authorize rounding damage
before applying it.

A ship's shield reading uses its strength positively for UP and negatively for
DOWN, with ALWAYS_ZERO_NEGATIVE. Bases use positive strength with the same sign
policy. These signed readings are followed by `%` outside SHORT where the
particular report calls for the suffix. A Romulan combat reading uses its
energy divided by ten, also with this sign policy and the same `%` suffix.
That terminal notation does not give the Romulan a Shields object or change
its energy-based damage semantics.

**Source basis:** [decimal field presentation](../../legacy/utexas/WARMAC.MAC#L1880),
[precision and signs](../../legacy/utexas/WARMAC.MAC#L1932),
[combat strength readings](../../legacy/utexas/DECWAR.FOR#L2427).

## Coordinates

FormatLocation uses vertical then horizontal order. In ABSOLUTE or BOTH, begin
with `@` outside SHORT, then the vertical field, `-`, and the horizontal field.
Both fields use NEGATIVE_ONLY and the requested field width. SHORT omits `@`.

If field is Free and position equals context.origin, finish at this point.
Consequently RELATIVE alone produces the empty string for the viewer's own
position; BOTH produces only its absolute part, with no trailing space.

Otherwise BOTH inserts one space after its absolute part. RELATIVE and BOTH
then append the signed vertical displacement, `,`, and the signed horizontal
displacement from context.origin. These fields use NONZERO. Their width is
Free when field is Free, and Exactly(3) when field is Exactly(2). Zero
displacement is `0`, not `+0`. ABSOLUTE has no relative suffix.

Examples with origin (20,20), Free fields and position (21,18):

```text
ABSOLUTE, SHORT:   "21-18"
ABSOLUTE, MEDIUM:  "@21-18"
RELATIVE, LONG:    "+1,-2"
BOTH, MEDIUM:     "@21-18 +1,-2"
```

An impact target uses SHORT coordinate formatting in every output length.
Its separate displacement marker or `@` belongs to the surrounding report.

**Source basis:** [coordinate rendering](../../legacy/utexas/DECWAR.FOR#L3078),
[impact target coordinates](../../legacy/utexas/DECWAR.FOR#L2492).

## Names and condition text

Outside scans, object labels use the following text. MEDIUM shares SHORT's
labels; LONG uses the full label. A ship's label comes from its roster identity,
not its captain's chosen display name. A planet's owner is the owner selected
by the report, including ownership at impact for an immutable observation.

| Object | SHORT or MEDIUM | LONG |
| --- | --- | --- |
| Empty sector | `"."` | `"Empty Space"` |
| Player ship | Its roster initial | Its roster name |
| Federation base | `"<>"` | `"Fed Base"` |
| Empire base | `")("` | `"Emp Base"` |
| Romulan | `"??"` | `"Romulan"` |
| Neutral planet | `" @"` | `"Neu planet"` |
| Federation planet | `"+@"` | `"Fed planet"` |
| Empire planet | `"-@"` | `"Emp planet"` |
| Star | `"*"` | `"Star"` |
| Black hole | `"BH"` | `"Black Hole"` |

The neutral planet's leading space is part of its label. A surrounding report
may request an additional trailing space after any object label. Scans use
their own cell rules rather than these general labels.

Device labels, in Device order, are the following strings. Every quoted label
has one trailing space. The device identity is independent of output length.

| SHORT | MEDIUM | LONG |
| --- | --- | --- |
| `"SH "` | `"Shields "` | `"Deflector Shields "` |
| `"WA "` | `"Warp "` | `"Warp Engines "` |
| `"IM "` | `"Impulse "` | `"Impulse Engines "` |
| `"LS "` | `"Life Sup "` | `"Life Support "` |
| `"TO "` | `"Torps "` | `"Torpedo Tubes "` |
| `"PH "` | `"Phasers "` | `"Phasers "` |
| `"CO "` | `"Computer "` | `"Computer "` |
| `"RA "` | `"Radio "` | `"Radio "` |
| `"TR "` | `"Tractor "` | `"Tractor Beam "` |

Condition text is `G`, `Y` or `R` in SHORT and `Green`, `Yellow` or `Red`
otherwise. When the reported ship is docked, prefix `D+` in SHORT or `Docked+`
otherwise. Add no separator or trailing space implicitly. Thus a docked green
ship has condition text `D+G` or `Docked+Green`.

**Source basis:** [object labels](../../legacy/utexas/WARMAC.MAC#L1970),
[device labels](../../legacy/utexas/WARMAC.MAC#L2054),
[condition labels](../../legacy/utexas/WARMAC.MAC#L2087).

## Main and pregame prompts

The NORMAL main prompt is exactly `"Command: "`. The INFORMATIVE prompt is
constructed from the acting ship s, in this order, with no inserted separators:

```text
text := ""
if s.devices[LIFE_SUPPORT].damage >= 300:
    text += decimal(s.lifeSupportReserve) + "L"
if s.shields.strength <= 10 or s.shields.mode == DOWN:
    text += "S"
if s.hullDamage >= 2000:
    text += "D"
if s.energy <= 1000:
    text += "E"
text += "> "
```

Here decimal is FormatNumber with zero fractional digits, NEGATIVE_ONLY and
Free width. These comparisons include equality. They use the ship's resource
values directly; Condition is not a substitute for them. Reading a prompt does
not consume life-support reserve or update the ship's condition.

The pregame prompt is exactly `"PG> "`. None of these prompt strings includes
a line ending. The command-acquisition clause determines preceding output and
line breaks; a terminal binding must not append colors or a welcome prefix to
these strings as part of the baseline presentation.

**Source basis:** [main prompts](../../legacy/utexas/DECWAR.FOR#L3107),
[normal literal](../../legacy/utexas/MSG.MAC#L38),
[pregame prompt](../../legacy/utexas/SETUP.FOR#L426).

## Lines and composition

An unconditional line ending emits `"\r\n"`; requesting n line endings emits
n such pairs, even if the current line is empty. A conditional blank-line
request emits a pair unless output is already at the left margin after an
empty completed line. Repeated conditional requests therefore stop after that
blank line. They are not interchangeable with unconditional line endings.

In ordinary printable text and CR/LF output, a displayed character advances
the column by one and CR returns to the left margin. A requested one-based
column n emits spaces until n is the next column, or emits nothing if that
column has already been reached or passed. It does not overwrite preceding
text. A report's literal strings can themselves contain line endings, in
addition to any ending requested after the string.

No general one-line-per-observation rule applies. For example, a LONG tractor
activation body begins with a line ending; LONG combat reception can already
have made its leading conditional blank-line request. Both requests have their
own places in the output sequence.

**Open:** The complete treatment of tabs, cursor controls, output after
disconnect, transport echo, terminal-profile editing sequences and all report
recipes remains under review. The ordinary layout clause above does not
silently define those controls or impose conventional tab stops. These gaps
prevent a claim of complete terminal conformance to this draft.

**Source basis:** [literal and line output](../../legacy/utexas/WARMAC.MAC#L1650),
[column padding](../../legacy/utexas/WARMAC.MAC#L1670),
[conditional blank line](../../legacy/utexas/WARMAC.MAC#L1696),
[character output](../../legacy/utexas/WARMAC.MAC#L1309).

## Combat observation bodies

These recipes present a CombatObservation that passed ReceiveNotice's reception
check. ReceiveNotice's leading LONG conditional blank-line request occurs
before this body, including when a base body is subsequently suppressed.
The recipes do not repeat that request or decide an audience.

In this section, a number means FormatNumber with Free width and the current
output length's precision. Counts use zero fractional digits. Unless a signed
strength reading is specified, use NEGATIVE_ONLY. A location means FormatLocation
with Free fields and the supplied presentation context. An object label uses
the name table above and the identity and ownership in the observation.

### Torpedo outcomes

Begin with `"T"` in SHORT or MEDIUM, or
`"Weapons Officer:  Captain, torpedo "` in LONG. Append the shot ordinal,
then the outcome's connecting text:

| Outcome | SHORT or MEDIUM | LONG |
| --- | --- | --- |
| MISSED | `" miss "` | `" lost "` |
| ABSORBED | `" gulp "` | `" swallowed by black hole "` |
| NEUTRALIZED | `" neutralized "` | `" neutralized by friendly object "` |

Append the observation's location and make a conditional blank-line request.
Do not include a firing-ship label, shield reading or damage number.

### Base announcements

Begin with the base label, one space and its location. Then append the reason's
ending below. SHORT makes a conditional blank-line request after its ending;
MEDIUM and LONG append one unconditional line ending.

| Reason | SHORT or MEDIUM | LONG |
| --- | --- | --- |
| DISTRESS | SHORT: `" A"`; MEDIUM: `" attacked"` | `" is under attack, Captain."` |
| DESTROYED | SHORT: `" D"`; MEDIUM: `" dead"` | `" has been destroyed, Captain."` |

These faction-wide messages are distinct from the emergency and destruction
suffixes of an individual impact below.

### Appearance, energy and tractor messages

RomulanDetected emits the Romulan label and one space. LONG then emits
`"detected"`. All lengths then emit one further space, the appearance location
and a conditional blank-line request. The two spaces before a SHORT or MEDIUM
location are intentional consequences of this sequence.

EnergyReceived emits the sender's ship label and one space. LONG additionally
emits `" transfers "`. Append the received amount, then `" >"` in SHORT or
MEDIUM, or `" units of energy to the "` in LONG. Append one more space, the
recipient's label and one trailing space. Finish with a conditional blank-line
request. Spaces already contained in these literal pieces are retained.

TractorEvent emits the selected entire body below, followed by one unconditional
line ending. The LONG body's leading line ending is part of that body.

| Event | SHORT or MEDIUM | LONG |
| --- | --- | --- |
| ACTIVATED | `"Trac. Beam on"` | `"\r\nTractor beam activated, Captain."` |
| BROKEN | `"Trac. Beam off"` | `"\r\nTractor beam broken, Captain."` |

### Star announcements and impact prefixes

For StarObservation, the origin is the star at observation.position. For
ImpactObservation, use observation.origin. Begin with that origin's label.
For a planet origin, append its build count only when nonzero; enclose that
count in parentheses in LONG, and append it directly in SHORT or MEDIUM.
Then emit one space and the origin's location.

Outside SHORT, a ship or base origin appends a comma. Ship, base and Romulan
origins then append one space and their signed strength reading, including `%`
outside SHORT. Planet and star origins have no such reading. Append one space
in every case.

For StarObservation, now emit `"N"` for EXPLODED or `"U"` for UNAFFECTED in
SHORT or MEDIUM. LONG emits `"novas"` or
`" UNAFFECTED by Photon Torpedo!"` respectively. The latter's leading space
is retained in addition to the prefix's space. Make a conditional blank-line
request and finish this body.

For an impact with deflected true, a player-ship origin and MEDIUM output, emit
`"deflected T"` and continue directly with the target below. For the same case
in LONG, emit `"has torpedo deflected by "` and continue with the target.
Other impacts, including SHORT deflections and Romulan torpedo deflections,
use the following damage phrase.

In LONG emit `"makes"`; then emit one space in every length. When damage is
present, emit that number and, outside SHORT, `" unit "`. Append the hit kind's
text:

| Kind | SHORT or MEDIUM | LONG |
| --- | --- | --- |
| PHASER | `"P"` | `"phaser hit on "` |
| TORPEDO | `"T"` | `"torpedo hit on "` |
| NOVA | `"N"` | `"hit on "` |

A planet target omits the absent damage and its unit text. A Romulan nova
retains its specified zero damage; it is not treated as a planet.

### Impact target and surviving defenses

SHORT and MEDIUM begin the target portion with two spaces. LONG instead makes
a conditional blank-line request if the target is a ship or base and the
current column is greater than 40; otherwise it inserts nothing at this point.
Emit the target label and any nonzero planet build suffix, using the same
parenthesis rule as for a planet origin. Emit one space.

For Moved or Swallowed, emit `">"` in SHORT, `"-->"` in MEDIUM or
`"displaced to "` in LONG. For Stayed, emit `"@"` outside SHORT and nothing
in SHORT. Append the target's reported location using a context whose
outputLength is SHORT while retaining the same coordinate mode and receiver
origin. Do not substitute the displacement destination for the position
chosen by the impact composition rule.

If destruction is absent and the target is a ship, base or Romulan, append a
comma outside SHORT, one space, and its signed strength reading, including `%`
outside SHORT. A planet has no additional shield or strength suffix.

For a surviving target ship whose identity equals the receiving captain's ship,
DeviceCritical also appends `"; "`, the device label, and then one space in
SHORT, `"dam "` in MEDIUM or `"damaged "` in LONG. Append the added device
damage and, only in LONG, `" units"`. The device label's own trailing space
remains. Other captains do not receive this suffix, and a destroyed target does
not receive it. A nova does not manufacture a DeviceCritical.

### Base emergency and destruction suffixes

In LONG, a base target with BaseCritical or a destruction result next emits two
spaces. If destroyed, make a conditional blank-line request. Then emit each of
these strings followed by one unconditional line ending:

```text
"Critical hit on starbase, shields down!"
"Starbase attempts to re-establish shields using emergency power!"
```

A surviving base then emits `"Base shields RE-ESTABLISHED!!"` and one
unconditional line ending, makes the final conditional blank-line request and
finishes. A destroyed base instead emits
`"Base FAILS to re-establish shields........BOOM!! "`, without an immediate
unconditional ending, then proceeds to the destruction suffix. A surviving
noncritical base has no emergency paragraph.

When destruction is present, append one space and make a conditional blank-line
request in LONG. For BLACK_HOLE, except for a base destroyed by a nova, emit
the target label without a trailing space and then `" -> BH"` in SHORT or
MEDIUM, or `" displaced by blast into BLACK HOLE!"` in LONG. Append one
unconditional line ending after this black-hole line.

For every destruction, emit the target label, one space, `"DESTROYED!!"` and
one unconditional line ending. Every impact body finishes with a conditional
blank-line request, including a surviving impact with no emergency paragraph.

These strings report the recorded result. Neither the wording about emergency
power nor a destruction suffix invokes a second repair, random draw or kill.

**Source basis:** [prefix and damage phrases](../../legacy/utexas/DECWAR.FOR#L2417),
[target and critical details](../../legacy/utexas/DECWAR.FOR#L2478),
[emergency and destruction](../../legacy/utexas/DECWAR.FOR#L2518),
[other combat bodies](../../legacy/utexas/DECWAR.FOR#L2544),
[literal text](../../legacy/utexas/MSG.MAC#L161),
[Romulan torpedo form](../../legacy/utexas/DECWAR.FOR#L3461).

## Radio message bodies and headings

Present a MessageObservation only when ReceiveMessage returns Displayed. A
Suppressed or NoMessage outcome has no radio heading, body or separator.
Radio reception has no combat reception's leading LONG blank-line request.

When heading is present, emit `"\r\nMessage from "`, the sender's object label,
one space and `"to "`. For each original recipient in roster order, append
one space and its roster initial. Then make a conditional blank-line request.
LONG uses the sender's full ship name or `"Romulan"`; SHORT and MEDIUM use
the ship initial or `"??"`. Recipient markers remain initials at every length.
Their list does not shrink when other recipients read their copies.

When heading is absent, omit that entire heading sequence. In either case,
emit body followed by two unconditional line endings. MessageObservation.body
is the retained text; its acquisition terminator and these presentation endings
are not characters counted against the 75-character text limit. No extra
indentation or wrapping is introduced by the message renderer.

For MEDIUM output, a message from Excalibur originally addressed to Farragut
and Wolf with body `"Hello"` therefore has this presentation:

```text
"\r\nMessage from E to  F W\r\nHello\r\n\r\n"
```

The space ending `"to "` and the first recipient's leading space both remain.
A system message with the same body has no heading and displays exactly
`"Hello\r\n\r\n"`.

**Source basis:** [radio heading and body](../../legacy/utexas/DECWAR.FOR#L2599),
[heading strings](../../legacy/utexas/MSG.MAC#L128),
[body ending](../../legacy/utexas/WARMAC.MAC#L2994),
[recipient initials](../../legacy/utexas/DECWAR.FOR#L489).
