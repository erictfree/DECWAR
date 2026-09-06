# Terminal presentation

This chapter defines the text presentation of game observations. It adds no
command, weapon effect or information-disclosure permission. A terminal binding
combines these rules with the command reader and the observation order stated
by the semantic clauses. A different kind of client can present the same game
information without claiming this terminal presentation.

Spaces, capitalization, punctuation and line endings in quoted strings are
significant. Quotation marks delimit a string and are not emitted. In quoted
strings, `\r`, `\n`, `\t` and `\b` denote carriage return, line feed, tab and
backspace; `\"` denotes a literal double-quote character inside the string.
Concatenation inserts no additional separator. A publication boundary
is not implicitly a line boundary.

The archive defines application terminal interaction. Network addressing,
Telnet negotiation, packet boundaries and client-local echo require a transport
binding; they are not inferred from application strings. The binding must
distinguish characters emitted by the game from characters echoed by the client.

## Presentation context

```text
type PresentationContext = {
    outputLength: OutputLength;
    coordinates: CoordinateMode;
    origin: Optional<Position>;
};

type FieldWidth = Free | Exactly { count: positive integer }
                | AtLeast { count: positive integer }
enum NumberSign = NEGATIVE_ONLY | NONZERO | ALWAYS_ZERO_NEGATIVE

query FormatNumber(value: real, fractionalDigits: 0 | 1,
                   sign: NumberSign, width: FieldWidth): Text

query FormatLocation(position: Position, context: PresentationContext,
                     field: Free | Exactly { count: 2 }): Text
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
adds no padding. AtLeast { count: n } pads on the left with spaces to at least n characters
and expands if necessary. Exactly { count: n } pads on the left when it fits; if it does
not fit, retain the required sign and replace the remaining integer-field
positions with `*`. A fractional suffix follows that field and is not included
in its width. For example:

```text
FormatNumber(12,     0, NEGATIVE_ONLY, Exactly { count: 4 }) == "  12"
FormatNumber(-12,    0, NEGATIVE_ONLY, Exactly { count: 2 }) == "-*"
FormatNumber(123.49, 1, NEGATIVE_ONLY, Exactly { count: 2 }) == "**.4"
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
Free when field is Free, and Exactly { count: 3 } when field is Exactly { count: 2 }. Zero
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
text = "";
if (s.devices[LIFE_SUPPORT].damage >= 300) {
    text += decimal(s.lifeSupportReserve) + "L";
}
if (s.shields.strength <= 10 or s.shields.mode == DOWN) {
    text += "S";
}
if (s.hullDamage >= 2000) {
    text += "D";
}
if (s.energy <= 1000) {
    text += "E";
}
text += "> ";
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

**OPEN QUESTION:** The complete treatment of tabs, cursor controls, output after
disconnect, transport echo, terminal-profile editing sequences and all report
recipes remains under review. The ordinary layout clause above does not
silently define those controls or impose conventional tab stops. These gaps
prevent a claim of complete terminal conformance to this draft.

**Source basis:** [literal and line output](../../legacy/utexas/WARMAC.MAC#L1650),
[column padding](../../legacy/utexas/WARMAC.MAC#L1670),
[conditional blank line](../../legacy/utexas/WARMAC.MAC#L1696),
[character output](../../legacy/utexas/WARMAC.MAC#L1309).

## Configuration command responses

SET has no initial conditional blank-line request. When setting selection
requires another reply, emit SET001 with no appended line ending. NAME uses
SET002 for its one additional reply. The five presentation preferences use
SET003 (OUTPUT), SET004 (PROMPT), SET005 (SCANS), SET006 (ICDEF), or SET007
(OCDEF) when they require a value. Each prompt has no appended line ending;
its embedded leading CRLF is retained. Input acquisition and cancellation
follow the [SET contract](commands.md#set). Assignment, an unmatched
alphanumeric preference value, and ordinary cancellation add no confirmation
or diagnostic of their own.

For TTYTYPE, each prompt requests a conditional blank line and emits SET008
without an appended ending. An unknown alphanumeric terminal name requests
a conditional blank line before the supported-name report. An ambiguous name
instead emits SET009 without an appended ending before that report. The report
emits SET010 followed by two CRLF pairs, then TTYS00 followed by one CRLF pair,
and returns to the terminal-type prompt. Its mixed-case `ADM-3a` is display text;
the semantic matching names remain those in the command clause. A successful
selection adds no confirmation.

The following fragments are independent of output length. Adjacent quoted
strings are concatenated without added characters.

| Fragment | Text |
| --- | --- |
| SET001 | `"\r\n"` + `"Name, Output, Ttytype, Prompt, Scans,\r\n"` + `"Input or Output location defaults (ICDEF, OCDEF)? "` |
| SET002 | `"\r\n"` + `"Desired name:  "` |
| SET003 | `"\r\n"` + `"Short, Medium, or Long output? "` |
| SET004 | `"\r\n"` + `"Normal or Informative command prompt? "` |
| SET005 | `"\r\n"` + `"Short or Long scans? "` |
| SET006 | `"\r\n"` + `"Absolute or Relative default for location input? "` |
| SET007 | `"\r\n"` + `"Absolute, Relative, or Both for location output? "` |
| SET008 | `"Terminal type:  "` |
| SET009 | `"\r\n"` + `"Ambiguous TTY type.  "` |
| SET010 | `"Supported TTY types are:"` |
| TTYS00 | `"ACT-IV     ADM-2      ADM-3a     DATAPOINT\r\n"` + `"ACT-V      SOROC      BEEHIVE    CRT"` |

ROMOPT and BHREMV add no direct success response. ENDFLG invokes world
termination, whose reports belong to the lifecycle contract; it does not add
a SET confirmation. Input echo, incoming notices and subsequent command prompts
are separate from these direct responses.

**Source basis:** [SET](../../legacy/utexas/DECWAR.FOR#L3624),
[prompt fragments](../../legacy/utexas/MSG.MAC#L259),
[terminal names](../../legacy/utexas/MSG.MAC#L358).

## Shield command responses

SHIELDS begins with one conditional blank-line request. Its action and amount
acquisition, confirmation and state changes follow the [command contract](commands.md#shields).
The following strings apply in SHORT, MEDIUM and LONG output alike. Prompts have
no appended line ending; each response has one unconditional line ending after
the complete string, including any line ending already inside that string.

| Event | Text | Kind |
| --- | --- | --- |
| Request action, including another attempt after an unrecognized action | `"Transfer, Up, Down  ? "` | Prompt |
| Request transfer amount | `"Units of energy to transfer to shields: "` | Prompt |
| Request confirmation of a transfer that reaches the available engine energy | `"Transferring all ship energy to shields.  Confirm? "` | Prompt |
| Confirmation is not YES | `"Energy NOT transferred."` | Response |
| Transfer completes | `"Energy transferred, Captain."` | Response |
| Shields raised | `"Shields raised, Captain."` | Response |
| Energy is zero after raising shields | `"\r\nShield control uses remaining ship energy!"` | Response |
| Shields lowered | `"Shields lowered, Captain."` | Response |
| Raising rejected for critical shield-device damage | `"Captain, unable to raise shields due to critical damage."` | Response |

A completed transfer prints no numeric amount, even when the amount is negative
or zero. Its semantic Transferred result still records the amount. Cancelling
action selection with empty input, or supplying a noninteger at the amount
prompt, adds no cancellation response. Refusing the energy confirmation does
produce the response listed above.

On successful UP, the raised response precedes release of an existing tractor
beam. Any resulting tractor notice uses the communication rules; this sequence
does not force immediate delivery of the notice. The zero-energy response, when
applicable, follows the release operation. These command responses add no
STATUS report, resource adjustment or turn beyond the command's stated effects.

**Source basis:** [SHIELDS response paths](../../legacy/utexas/DECWAR.FOR#L3739),
[response strings](../../legacy/utexas/MSG.MAC#L280),
[literal and line output](../../legacy/utexas/WARMAC.MAC#L1653).

## Energy-transfer responses

ENERGY begins with one conditional blank-line request. Missing or mistyped
recipient/amount input requests `"Ship, energy: "` in SHORT or MEDIUM, or
`"Destination ship name and energy to transfer: "` in LONG. The prompt has no
appended line ending. Invalid replacement input repeats the request; an empty
reply cancels without another response.

The [ENERGY contract](commands.md#energy) determines rejection precedence. Each
response below ends with one unconditional line ending. Concatenated LONG
prefixes retain their two trailing spaces.

| Result | SHORT or MEDIUM | LONG |
| --- | --- | --- |
| Unknown recipient name | `"Unknown ship name."` | Same |
| Recipient is the actor | `"Transfer energy to US!?!"` | `"Beg your pardon, Captain?  Transfer energy to US!?!"` |
| ShipNotInGame | `"Player not in game."` | Same |
| Enemy recipient | `"Can not transfer energy to enemy ship."` | Same |
| RecipientNotAdjacent | `"Not adjacent to destination ship."` | Same |
| InsufficientEnergy | `"Insufficient ship energy."` | `"Captain, our ship doesn't possess that much energy!"` |
| AmountMustBePositive | `"Transfer aborted."` | `"Illegal energy transfer.  Transfer aborted."` |
| Successful transfer | `"Energy transferred, Captain."` | Same |

The sender's success response does not include an amount. It precedes publication
of EnergyReceived to the recipient, whose later rendering follows the combat
observation rules and does include the received amount. A zero actual transfer
to a recipient already at capacity has the same sender success text. These
responses do not add a status report or a turn.

**Source basis:** [ENERGY output paths](../../legacy/utexas/DECWAR.FOR#L1009),
[energy strings](../../legacy/utexas/MSG.MAC#L67),
[LONG self-transfer prefix](../../legacy/utexas/MSG.MAC#L10),
[absent recipient](../../legacy/utexas/MSG.MAC#L152),
[unknown name](../../legacy/utexas/MSG.MAC#L373).

## Docking and repair responses

For NoAdjacentFriendlyInstallation, DOCK requests a conditional blank line,
emits the object label at the actor's current sector with one added trailing
space, then emits `" not adjacent to base!!"` and one unconditional line ending.
The leading space in that last string is additional to the label's trailing
space. The wording is unchanged when the failed supply search included planets.

Successful docking emits `"\r\nDOCKED."` followed by one unconditional line
ending. Any requested STATUS report follows this confirmation under the
[DOCK command rules](commands.md#dock). If supply shares exist but the commission
has ended before replenishment, the command adds no docking response.

REPAIR has no unconditional success, no-change or cancellation message and no
initial blank-line request of its own. An accepted DAMAGE suffix invokes the
[device-damage report](#device-damage-reports), including that report's own line
composition. The [REPAIR contract](commands.md#repair) determines suffix acceptance,
including the no-damage ALL exception, and subsequent turn behavior. Automatic
repair itself adds no repair response. Later turn events or reports retain
their own output rules.

**Source basis:** [DOCK](../../legacy/utexas/DECWAR.FOR#L893),
[docking strings](../../legacy/utexas/MSG.MAC#L47),
[REPAIR](../../legacy/utexas/DECWAR.FOR#L3190).

## Radio preference responses

RADIO begins with a conditional blank-line request. Action prompting emits
`"Turn radio ON or OFF, GAG or UNGAG individual ship?  "` with no appended line
ending. After a nonempty action reply, request another conditional blank line
before examining the action. An empty reply cancels without this additional
request. An unrecognized action repeats the prompt.

The separate ship-name prompt is `"Ship name:  "`, without an appended line
ending. A non-name reply repeats it, and an empty reply cancels. An unknown
roster name emits `"Unknown ship name."` followed by one unconditional line
ending. Selecting the actor's own ship produces no confirmation.

ON emits `"Radio turned on, Captain."` and OFF emits
`"Radio turned off, Captain."`, each with one unconditional line ending.
GAG emits `"Radio gagged against "`; UNGAG emits `"Radio ungagged against "`.
Append the selected ship's object label without an added trailing space, then
make a conditional blank-line request. The prefix is independent of output
length; the object label follows the ordinary SHORT/MEDIUM/LONG rule. These
are direct confirmations of the [radio preference changes](commands.md#radio),
not radio messages delivered to the selected ship.

**Source basis:** [RADIO](../../legacy/utexas/DECWAR.FOR#L3129),
[radio strings](../../legacy/utexas/MSG.MAC#L248).

## Tractor command responses

TRACTOR begins with a conditional blank-line request. Its target prompt is
`"Ship to apply tractor beam to:  "`, without an appended line ending. The
[command's selection and validation rules](commands.md#tractor) determine which
of the following responses occurs. Every listed response ends with one
unconditional line ending, in addition to any CRLF inside its text.

| Condition | Text or composition |
| --- | --- |
| OFF with no beam | `"Tractor beam not in operation at this time, Captain."` |
| Actor already has a beam | `"Tractor beam already active, Captain."` |
| Unknown target name | `"Unknown ship name."` |
| Target is actor | `"Beg your pardon, Captain?  You want to apply a tractor\r\nbeam to your own ship?"` |
| Enemy target | `"Can not apply tractor beam to enemy ship."` |
| Target not commissioned | `"Player not in game."` |
| Target not adjacent | `"Not adjacent to destination ship."` |
| Target already has a beam | Target object label, one space, `"already has tractor beam active."` |
| Actor's shields raised | `"Can not apply tractor beam through shields, Captain."` |
| Target's shields raised | Target object label, one space, `"has his shields up.  Unable to apply tractor beam."` |

The fixed strings do not vary with output length. The two prefixed responses
use the target's ordinary object label. Empty target input cancels without a
new response. Successful engagement and release have no direct success string:
they publish TractorEvent observations, whose delivery and rendering follow
the combat-notice rules. The direct-response table does not bypass those rules.

**Source basis:** [TRACTR and release](../../legacy/utexas/DECWAR.FOR#L4432),
[tractor strings](../../legacy/utexas/MSG.MAC#L349),
[shared adjacency response](../../legacy/utexas/MSG.MAC#L70).

## Construction responses

BUILD's coordinate acquisition uses the shared location prompts and errors. It
makes no additional initial blank-line request. After resolution, its direct
responses are:

| Outcome | Composition |
| --- | --- |
| NotAdjacent | Actor's current-sector object label, one space, `"not adjacent to planet."`, one unconditional line ending |
| NotAPlanet | `"\r\nNo planet at those coordinates, Captain."`, one unconditional line ending |
| NotOwned | `"\r\nPlanet not yet captured."`, with no appended line ending |
| BaseLimitReached | `"\r\nAll "`, faction base label, `"s still functional, captain."`, one unconditional line ending |
| ConstructionCrewBusy | `"Sorry, Captain, but the construction crew is"`, one unconditional line ending, `"busy with repairs at the moment."`, one unconditional line ending |

Both capacity-failure paths use the same BaseLimitReached text despite their
different effects on builds and points. The [BUILD contract](commands.md#build)
determines those effects and the checks' order.

A non-converting stage prints its new integer build count with Free width and
no fractional digits, then `" build"`, then `"s"` only when the count is greater
than one. Finish with a conditional blank-line request. A fifth stage does not
print this count before attempting conversion.

A normally completed base conversion makes a conditional blank-line request,
then emits the actor's current-sector object label, one space,
`"builds planet "`, the target location with Free fields in the actor's current
coordinate/output preferences, `" into a "`, and the new base's object label
without an added trailing space. Finish with a conditional blank-line request.
If world termination prevents conversion from reaching this report, no conversion
confirmation is implied by the earlier construction points or base-count change.

**Source basis:** [BUILD](../../legacy/utexas/DECWAR.FOR#L522),
[construction strings](../../legacy/utexas/MSG.MAC#L12).

## Capture responses

CAPTURE uses the shared coordinate acquisition. NotAdjacent makes a conditional
blank-line request, emits the actor's current-sector object label and one space,
then `"not adjacent to planet."` and one unconditional line ending.
For NotAPlanet, select the text by the observed target kind:

| Target kind | Text |
| --- | --- |
| Empty sector | `"\r\nNo planet at those coordinates, Captain."` |
| Friendly ship or base | `"\r\nBut Captain, he's already on our side!"` |
| Opposing ship or base | `"\r\nCaptain, the enemy refuses our surrender ultimatum!"` |
| Romulan | `"\r\nCaptain, the Romulan refuses to surrender!"` |
| Star or black hole | `"\r\nCapture THAT??  You have GOT to be kidding!!"` |

Append one unconditional line ending. These are object-kind diagnostics, not
additional attempts at diplomacy. SurrenderRefused instead emits
`"The planet's government refuses to surrender."` and one unconditional line
ending for the failed coordination entry specified by the command.

AlreadyOwned emits `"\r\nPlanet already captured, Captain."` in SHORT or MEDIUM.
In LONG, a Federation actor emits
`"\r\nCaptain, are you feeling well?\r\nWe are orbiting a FEDERATION planet!"`;
an Empire actor emits
`"\r\nMESSAGE FROM PLANET:  Veer off you idiot!\r\nWe are ALREADY part of the Klingon Empire!"`.
Append one unconditional line ending in each case.

After applying the defensive attack and its discovery effects, accepted capture
makes a conditional blank-line request. Emit the actor's ship label and one
space, `"capturing "`, the planet label under its former ownership and one space,
then the target location with Free fields and the actor's coordinate/output
preferences. Make a conditional blank-line request, then publish the defensive
hit notice. Publication does not guarantee its immediate display. This report
uses the planet's former ownership even though capture has changed its owner.

If the actor then has hull damage at least 2500 damage units or nonpositive
energy, emit the faction-specific text:

- Federation: `"\r\n\r\nScience Officer:  Captain, that was a MOST illogical tactic."`.
- Empire: concatenate `"\r\n\r\nFirst Officer:  Commander, because of your incompetence"`
  and `"\r\nwe must suffer the shame of DEFEAT!!"`.

Append one unconditional line ending, then the actor's ship label, one space,
`"DESTROYED during capture of planet!!"` and one unconditional line ending.
This additional report does not undo ownership or pending capture points.
Subsequent turn and lifecycle output follows the [CAPTURE contract](commands.md#capture).

**Source basis:** [CAPTUR](../../legacy/utexas/DECWAR.FOR#L600),
[capture strings](../../legacy/utexas/MSG.MAC#L20),
[target-kind diagnostics](../../legacy/utexas/MSG.MAC#L148),
[location completion](../../legacy/utexas/DECWAR.FOR#L3078).

## Phaser command responses

PHASERS makes no initial blank-line request of its own. The shared location
reader supplies coordinate prompts and errors. Exactly one resolved numeric
item gives `"Wrong number of coordinates specified."` and one unconditional
line ending, then rejects without firing. Empty coordinate continuation cancels
without an additional phaser response.

The [PHASERS contract](commands.md#phasers) determines validation order, including
the bank wait before an invalid-strength response. Each direct response below
has one unconditional line ending appended after its full text.

| Result | Text |
| --- | --- |
| PhasersUnavailable | `"Phasers critically damaged."` |
| InvalidTarget | `"\r\nPhaser control unable to lock on target, Captain."` |
| OwnSector in SHORT or MEDIUM | `"ERROR!  Own location used!"` |
| OwnSector in LONG | Concatenate `"ERROR detected by computer!!  You have attempted"` and `"\r\nto use your present location."` |
| FriendlyTarget | `"\r\nWeapons Officer:  Attempting to hit friendly object, Captain."` |
| OutOfRange | `"Target out of range."` |
| InvalidStrength | `"\r\nWeapons Officer:  Improper energy consumption for phaser hit, Captain."` |

When firing with shields up, MEDIUM and LONG emit
`"High speed shield control activated."` and one unconditional line ending;
SHORT omits this notice. The shield-control charge occurs in all output lengths.
If the overheating test succeeds, emit
`"WARNING! WARNING!  PHASERS OVERHEATING."` and one unconditional line ending.
LONG then additionally emits the concatenation of
`"********** CRACKLE! POP! SIZZLE! POOF! **********"` and
`"\r\nPHASERS DAMAGED."`, followed by one unconditional line ending.
These notices precede the target's impact and do not cancel firing.

Impact reports and base distress/destruction announcements are published combat
notices, rendered on reception. A successful shot has no additional direct
firing confirmation. PHASERS does not print a special shield-energy-exhaustion
line when its charge exhausts the engines. Subsequent command acquisition and
lifecycle output retain their own rules; omitting such a line adds no survival
guarantee or energy precondition.

**Source basis:** [PHACON](../../legacy/utexas/DECWAR.FOR#L2647),
[phaser response strings](../../legacy/utexas/MSG.MAC#L196),
[own-sector diagnostics](../../legacy/utexas/MSG.MAC#L85),
[coordinate count diagnostic](../../legacy/utexas/MSG.MAC#L78).

## Torpedo command responses

TORPEDOS has no initial blank-line request of its own. TubesUnavailable emits
`"Torpedo tubes critically damaged."` and one unconditional line ending before
any argument acquisition. For NoAmmunition, SHORT uses the inventory report
below; MEDIUM and LONG instead emit
`"You have already used your supply of torpedoes!"` and one unconditional line
ending.

The burst prompt emits `"Number in burst (1-3) and "` immediately followed by
the location reader's `"Coordinates: "`, with no appended line ending. A
separate target prompt uses only `"Coordinates: "`. Reprompting follows the
[TORPEDOS acquisition rules](commands.md#torpedos), including their distinction
between original arguments, burst replies and target replies. Empty continuation
and nonpositive burst count add no cancellation message. This recipe does not
resolve the missing-component cases excluded by that contract.

If a positive count exceeds current ammunition, first emit
`"Insufficient torpedoes for burst!"` and one unconditional line ending.
A count exceeding either ammunition or three then prints the inventory report:
make a conditional blank-line request, emit the current integer torpedo count
with Free width and no fractional digits, then `" torpedoes left."` and one
unconditional line ending. It reports inventory, not the requested burst count.

TargetOutOfRange emits `"Target out of range."` and one unconditional line
ending. An own-sector target uses the same output-length-dependent own-sector
text and ending as [PHASERS](#phaser-command-responses), at either TORPEDOS
own-sector check. The command contract determines the different completion
and readiness effects of these outcomes.

A misfire emits `"Torpedo "`, the one-based shot number as an integer with Free
width, `" MISFIRES!"`, and one unconditional line ending. If that misfire also
damages the tubes, emit `"PHOTON TUBES DAMAGED!"` and one unconditional line
ending. This warning does not print the added damage. Both responses precede
the misfired shot's path and impact. They do not replace that shot with a miss.

Failed planet-update entry emits
`"Sorry, Captain, but the torpedo tubes are empty!"` and one unconditional line
ending. This wording reports PlanetUpdateRefused; it does not establish zero
inventory or change the shot count supplied by that outcome. Ordinary misses,
black-hole absorption, friendly-target neutralization and impacts use published
combat notices. Finishing a burst adds no direct success confirmation or
automatic inventory report.

**Source basis:** [TORP acquisition](../../legacy/utexas/DECWAR.FOR#L4228),
[burst completion and direct responses](../../legacy/utexas/DECWAR.FOR#L4401),
[torpedo strings](../../legacy/utexas/MSG.MAC#L341),
[coordinate prompt](../../legacy/utexas/MSG.MAC#L38).

## Movement command responses

MOVE and IMPULSE have no initial blank-line request of their own. A failed
propulsion check emits `"Warp engines damaged."` or
`"Impulse engines damaged."`, respectively, with one unconditional line ending.
The location reader supplies coordinate prompts and diagnostics after that check.
An own-sector location uses the [PHASERS own-sector text](#phaser-command-responses),
then follows MOVE's coordinate retry rules rather than PHASERS completion.

The [movement contract](commands.md#move-and-impulse) determines range rejection:

- ImpulseRangeExceeded emits `"Maximum speed warp 1."`; LONG first emits
  `"Captain, the impulse engines won't take it.  "` without a separator.
- DamagedWarpRangeExceeded emits `"Engines damaged, warp 3 max."` in SHORT or
  MEDIUM, or `"Captain, our warp engines are damaged.  I can only give you warp 3."`
  in LONG.
- WarpRangeExceeded emits `"Maximum warp "` in SHORT or MEDIUM. LONG instead
  emits the concatenation of `"Engineering Officer:  The engines won't take it Captain."`
  and `"\r\nI can only give you warp "`. Append `"3."` if the warp engines have
  positive damage, otherwise `"6."`.

Each range response ends with one unconditional line ending. A damaged ship
requesting more than six sectors takes WarpRangeExceeded's text with the `"3."`
suffix; it does not skip to the damaged-engine range response.

Before the overheating test for intended warp distance five or six, SHORT emits
`"Engines overheating."`; MEDIUM and LONG emit
`"Captain, our engines are overheating!"`. LONG first emits
`"Engineering Officer:  "` without an added separator. Append one unconditional
line ending. This warning does not by itself mean that damage occurred.

When overheating occurs, emit the concatenation of
`"EEEEERRRRRROOOOOOOMMMMMmmmmm!!"` and
`"\r\nCaptain, the engines suffered "`. Append potentialDamage in damage units,
using FormatNumber with an integer-part width of three, NEGATIVE_ONLY sign,
and zero fractional digits in SHORT or one in MEDIUM/LONG. Emit
`" units of damage."` and one unconditional line ending.

Outside SHORT, then emit `"Captain, repairs will take approximately "`, followed
by the estimate `potentialDamage / (30 damage units)` as a number with
integer-part width two, NEGATIVE_ONLY sign and one fractional digit. Finish with
`" stardates."` and one unconditional line ending. The estimate is a report,
not a new repair deadline or a promise that subsequent automatic repair will
run uninterrupted. These reports precede applying the overheating damage.

If traversal reports an obstruction, emit the complete string
`"\r\nNavigation Officer:  \"Collision averted, Captain!\""` followed by one
unconditional line ending. This response prints neither the obstruction kind
nor its position. Unobstructed movement has no direct success or destination
report. Later turn, combat and lifecycle output remains separate.

**Source basis:** [MOVE and IMPULSE](../../legacy/utexas/DECWAR.FOR#L2141),
[movement strings](../../legacy/utexas/MSG.MAC#L131),
[numeric report fields](../../legacy/utexas/WARMAC.MAC#L1940).

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

## Status reports

Present the ordered [StatusObservation](commands.md#meaning-of-report-items)
values from ReportStatus. Make one conditional blank-line request on entry.
The numeric field width is Free in SHORT and Exactly { count: 4 } otherwise. Counts use
zero fractional digits; energy, damage and shield readings use the precision
for the output length.

Each observation starts with the following literal prefix. An empty string
means no prefix. Tabs remain tab characters in the emitted text; this table
neither replaces them with spaces nor assumes terminal tab stops.

| Observation | SHORT / MEDIUM / LONG prefixes |
| --- | --- |
| StardateValue | `"SD"` / `"SDate  "` / `"Stardate\t"` |
| ShieldValue | `"SH"` / `"Shlds  "` / `"Shields\t        "` |
| LocationValue | `""` / `"Loc    "` / `"Location\t"` |
| ConditionValue | `""` / `"Cond   "` / `"Condition\t"` |
| TorpedoValue | `"T"` / `"Torps  "` / `"Torpedoes\t"` |
| EnergyValue | `"E"` / `"Ener   "` / `"Energy left\t"` |
| HullDamageValue | `"D"` / `"Dam    "` / `"Damage\t\t"` |
| RadioValue | `"R"` / `"Radio  "` / `"Radio\t\t"` |

After the prefix, render the value as follows:

- StardateValue and TorpedoValue use FormatNumber with zero fractional digits
  and NEGATIVE_ONLY. EnergyValue and HullDamageValue use the ordinary numeric
  precision and NEGATIVE_ONLY.
- ShieldValue uses the signed shield reading. Outside SHORT, append `%`, one
  space, equivalentEnergy with NEGATIVE_ONLY and the same field width, then
  `" units"`. In SHORT, omit this additional energy field. A lowered shield's
  energy equivalent remains positive when its strength is positive; it is not
  multiplied by the shield-mode sign.
- LocationValue uses FormatLocation with ABSOLUTE, SHORT and Free fields, even
  when the surrounding report is LONG or the captain prefers relative output.
  Consequently this field has no `@` prefix.
- ConditionValue uses the condition and docking labels already defined.
- RadioValue is `"damaged"`, `"On"` or `"Off"` for DAMAGED, ON or OFF.
  The observation has already applied the damage threshold; presentation does
  not re-read the device or change the radio setting.

Append one space after every ordinary observation in SHORT. In MEDIUM or LONG,
make a conditional blank-line request after each observation. InvalidStatusItem
instead emits `"%Syntax error"` followed by one unconditional line ending; it
has no field prefix or trailing space. Continue with subsequent observations.
When selector processing reaches its terminating non-name token, make a final
conditional blank-line request in SHORT. Report completion does not add a
second ending in MEDIUM or LONG.

The full report begins with StardateValue; a selected report has no implicit
stardate. Repeated selectors repeat their fields. Rendering follows observation
order without requiring all values to describe the same instant. DOCK STATUS
uses the same presentation after the DOCK command has selected the report.

For a SHORT full report of stardate 12, green undocked condition, position
(20,30), ten torpedoes, 4000 energy units, zero hull damage, raised shields at
100% and radio ON, the body after its initial separator is:

```text
"SD12 G 20-30 T10 E4000 D0 SH+100 ROn \r\n"
```

The space before the final CR/LF is significant. A SHORT request containing
only ENERGY with value 125.9 displays `"E125 \r\n"`; it does not change the
125.9 energy units available to subsequent operations.

**Source basis:** [STATUS](../../legacy/utexas/DECWAR.FOR#L3860),
[status labels](../../legacy/utexas/MSG.MAC#L292),
[radio labels](../../legacy/utexas/MSG.MAC#L249),
[DOCK STATUS](../../legacy/utexas/DECWAR.FOR#L935).

## Device-damage reports

Present the [DamageReport](commands.md#selection-and-result) with one initial
conditional blank-line request. AllDevicesFunctional emits
`"All devices functional."` and one unconditional line ending, then finishes.
This response has no heading or device rows, even when selectors were supplied.

Selected rows have no heading. General rows have no heading in SHORT. In LONG,
a general report first emits `"Damage Report for "`, the object label for its
recorded title object with no trailing space, and two unconditional line
endings. This is the observed sector object, which can differ from the actor's
ship; an empty sector has label `"Empty Space"`.

A general report in MEDIUM or LONG next emits `"Device    "`, nine additional
spaces only in LONG, then `"Damage"` and two unconditional line endings.
Thus the headings are `"Device    Damage\r\n\r\n"` in MEDIUM and
`"Device             Damage\r\n\r\n"` in LONG.

For every selected or general DeviceDamageRow, in its observation order:

1. Emit its device label for the current output length, including that label's
   trailing space.
2. In SHORT, emit one more space. In MEDIUM, pad to column 10; in LONG, pad to
   column 19. Padding follows the earlier column rule and never erases text.
3. Emit damage with NEGATIVE_ONLY and Exactly { count: 4 }, at the output length's
   ordinary precision. Append `" units"` only in LONG.
4. Make a conditional blank-line request.

For warp-engine damage 8, the row strings are:

```text
SHORT:  "WA     8\r\n"
MEDIUM: "Warp        8.0\r\n"
LONG:   "Warp Engines         8.0 units\r\n"
```

All three report the same damage. A selected row may show zero or negative
damage if another device passed the initial positive-damage test. Unmatched
selectors produce no row and no syntax diagnostic. A general report can have
a heading but no rows if concurrent repairs remove the damage before the row
observations. The report itself does not repair anything.

**Source basis:** [DAMAGE](../../legacy/utexas/DECWAR.FOR#L783),
[damage-report strings](../../legacy/utexas/MSG.MAC#L41),
[all-functional response](../../legacy/utexas/MSG.MAC#L6),
[device labels](../../legacy/utexas/WARMAC.MAC#L2054).

## Time reports

```text
query FormatDuration(value: Duration): Text
    requires value >= 0 milliseconds;
```

Let totalSeconds be floor(value / 1000 milliseconds), hours be
floor(totalSeconds / 3600), minutes be floor(totalSeconds / 60) modulo 60,
and seconds be totalSeconds modulo 60. Emit hours, minutes and seconds as
ordinary decimal numbers separated by colons. Each component has at least
two digits, padding on the left with zero when needed. Hours expand beyond
two digits; they do not wrap after 24 or 99. Fractions of a second are discarded
for display, not rounded or deducted from any clock value.

For example, 3,661,999 milliseconds displays `"01:01:01"`, and 360,000,000
milliseconds displays `"100:00:00"`. TimeOfDay uses its duration since local
midnight under the environment's time-of-day convention. This presentation
adds no date, timezone suffix or fractional seconds.

Present each [TimeObservation](commands.md#time) by emitting its prefix followed
by FormatDuration of its value:

| Observation | Prefix |
| --- | --- |
| GameElapsed | `"\r\nGame's elapsed time:  "` |
| CommissionElapsed | `"\r\nShip's elapsed time:  "` |
| CommissionExecution | `"\r\nRun time in game:     "` |
| SessionExecution | `"\r\nJob's total run time: "` |
| TimeOfDayValue | `"\r\nCurrent time of day:  "` |

There is no separate initial blank-line request or ending between a value and
the next prefix. After the final value, make one conditional blank-line request.
All output lengths use these same labels and duration format. Pregame omits
both commission observations and their prefixes. Elapsed and execution values
are separate observations; rendering does not substitute one for the other.

**OPEN QUESTION:** Invalid or negative environment clock readings have no presentation
rule here. This domain restriction does not introduce a TIME command rejection
or silently turn an unavailable clock origin into zero.

**Source basis:** [TIME](../../legacy/utexas/DECWAR.FOR#L4066),
[time labels](../../legacy/utexas/MSG.MAC#L330),
[duration decomposition](../../legacy/utexas/WARMAC.MAC#L1746).

## Preference and option reports

TYPE's unresolved-switch prompt is
`"\r\nDo you wish to see the OUTPUT or OPTION switches? "` with no added ending.
The ambiguous O switch first emits `"\r\nAmbiguous switch for TYPE."` and one
unconditional line ending, then requests the switch again. A cancelled reply
has no report body. The [TYPE grammar](commands.md#type) defines matching and
continuation; these strings do not introduce other switches.

For OUTPUT, emit `"\r\nCurrent output switch settings:"` and two unconditional
line endings. Present its TypeObservation values in order using these complete
lines, each followed by one unconditional line ending except the final profile
line, which makes a conditional blank-line request:

| Observation | Line composition |
| --- | --- |
| OutputLengthValue | `"Short "`, `"Medium "` or `"Long "`, then `"output format."`. |
| PromptStyleValue | `"Normal "` or `"Informative "`, then `"command prompt."`. |
| ScanStyleValue | `"Short "` or `"Long "`, then `"SCAN format."`. |
| InputCoordinatesValue | `"Absolute "`, `"Relative "` or `"Both "`, then `"coordinates are default for input."`. |
| OutputCoordinatesValue | The same coordinate labels, then `"coordinates are default for output."`. |
| TerminalProfileValue | `"Terminal type:  "`, then the profile name padded on the right to ten characters. |

Profile names are ACT-IV, ADM-2, ADM-3A, DATAPOINT, ACT-V, SOROC, BEEHIVE and CRT.
The report prints ADM-3A with uppercase A and retains the name's padding before
the final line ending. For example, the CRT line is
`"Terminal type:  CRT       \r\n"`. The report's initial heading and line
labels are the same at every output length; SHORT describes a preference here,
not a shorter TYPE report. An unselected terminal profile retains the open
boundary stated by ReportType; it is not implicitly CRT.

For OPTION, first make a conditional blank-line request. Emit VersionValue.text
and one unconditional line ending. Emit one Romulan line, then one black-hole
line, each with one unconditional line ending:

| Observation | True / false lines |
| --- | --- |
| RomulanOptionValue | `"There are Romulans in this game."` / `"Romulans are NOT in this game."` |
| BlackHoleOptionValue | `"There are Black holes in this game."` / `"Black holes are NOT in this game."` |

These are the selected game options. In particular, the black-hole line is not
computed by counting black holes remaining in the galaxy. A report observes
preferences and options without changing them or selecting a terminal profile.

**Source basis:** [TYPE](../../legacy/utexas/DECWAR.FOR#L4540),
[profile spellings](../../legacy/utexas/DECWAR.FOR#L480),
[profile padding](../../legacy/utexas/WARMAC.MAC#L1734),
[report strings](../../legacy/utexas/MSG.MAC#L360),
[option strings](../../legacy/utexas/MSG.MAC#L274).

## Scan grids

Present ScanReport using the captain's ScanStyle. The scan's symbol table is
specified with [SCAN and SRSCAN](commands.md#knowledge-and-result); those symbols
are distinct from the object labels used in lists and combat reports. SHORT
uses one character per sector and LONG uses the two-character pair. Scan style
is independent of outputLength and of which of the two scan commands was used.
The report bounds and marks are already determined by Scan; presentation does
not discover installations or read the sectors again.

Make one conditional blank-line request before the top axis. Every horizontal
axis line begins with three spaces. Its first label is bounds.minHorizontal
in LONG and bounds.minHorizontal + 1 in SHORT. Always emit that initial label,
even when it lies beyond bounds.maxHorizontal. Successive labels increase by
two in LONG or three in SHORT and are emitted only while they are at most
bounds.maxHorizontal. Separate successive labels with two spaces in LONG or
one space in SHORT. Each label is its decimal number in a two-character field,
with a leading space for values below ten, and no sign, @ or relative offset.
Finish the axis line with a conditional blank-line request.

For each ScanRow in decreasing vertical order, emit its vertical label using
the same two-character numeric form, one space, its cell marks in increasing
horizontal order, one space and the repeated vertical label. There is no
separator between cell marks beyond the characters already in each mark.
Make a conditional blank-line request after the row. After all rows of a
complete scan, emit the bottom axis in the same way as the top axis.

For bounds 19 through 21 on both axes, Excalibur at (20,20) and every other
sector empty, the bodies after the initial separator are:

```text
LONG:
"   19  21\r\n"
"21  . . . 21\r\n"
"20  . E . 20\r\n"
"19  . . . 19\r\n"
"   19  21\r\n"

SHORT:
"   20\r\n"
"21 ... 21\r\n"
"20 .E. 20\r\n"
"19 ... 19\r\n"
"   20\r\n"
```

Adjacent quoted lines here are concatenated; LONG and SHORT are example labels,
not emitted text. Both displays contain the same nine sector observations.
The sparse horizontal labels do not omit sectors or rescale their coordinates.
In a one-sector SHORT scan at horizontal coordinate 75, the axis label is 76;
it does not assert that the galaxy contains a sector 76.

For Interrupted { partial: partial }, include the top axis and every completed row in
partial, including the last row's ending. Omit the remaining rows and bottom
axis. The scan interruption rule consumes the request at a row boundary;
presentation does not undo discovery already performed. A RejectedSyntax
instead emits `"%Syntax error"` and one unconditional line ending, with no grid
or scan-entry separator. Complete delivery of interruption controls remains a
separate binding requirement.

**Source basis:** [scan display and axes](../../legacy/utexas/WARMAC.MAC#L2482),
[two-character labels](../../legacy/utexas/WARMAC.MAC#L1814),
[scan command and rejection](../../legacy/utexas/DECWAR.FOR#L3527).


## Galaxy-report lines

LIST, SUMMARY, BASES, PLANETS and TARGETS use the ReportGalaxy observations.
Selection, ordering and knowledge changes are defined by their
[semantic operation](commands.md#detail-summaries-and-knowledge). These line
recipes disclose only information already present in an observation. A detail's
recorded affiliation determines faction-sensitive labels; presentation does not
look up a planet's later owner or infer hidden strength.


### Report and section boundaries

Request a conditional blank line on entering ReportGalaxy, before processing
its argument groups. Immediate exact-position observations are emitted where
their groups are processed, with no extra group separator beyond the observation's
own recipe. Each named-object group requests a conditional blank line before
its named Romulan and ship observations. An ordinary group's NoMatches message
has its own ending but no additional leading separator.

After successful group processing, deferred output follows the semantic
operation's object-class order. These boundaries concern selections accumulated
for deferred output; an immediate named or coordinate observation does not by
itself make a deferred section present.

1. If a deferred Romulan detail is selected, request a conditional blank line
   before it. If a Romulan summary is selected, request another conditional
   blank line before that summary, whether or not there was a detail.
2. If at least one player ship is selected for deferred detail or summary,
   request a conditional blank line before processing that ship section. Emit
   its detail rows in roster order. Outside TARGETS, request a conditional blank
   line after the details, then emit its nonzero faction summaries. This request
   still occurs when no ship summary row is selected.
3. Apply the same section-entry and post-detail rules to selected bases, then
   to selected planets, using their established detail and summary order.
   A class with no deferred selections contributes no section-boundary requests.
4. TARGETS omits the post-detail requests and ordinary faction/planet summaries
   from steps 2–3. If its target total is positive, request a conditional blank
   line before its final TargetSummary. A zero target total emits neither that
   request nor a summary line.

Every detail or summary retains the ending in its own line recipe. These
requests are conditional under the line-composition rules, not unconditional
empty lines between all observations. There is no additional final separator
beyond those already prescribed. A later syntax rejection retains earlier
immediate output but does not flush deferred selections; selection and rejection
ordering remain governed by ReportGalaxy.

**Source basis:** [entry and group processing](../../legacy/utexas/DECWAR.FOR#L1378),
[named-group boundary](../../legacy/utexas/DECWAR.FOR#L1806),
[deferred section boundaries](../../legacy/utexas/DECWAR.FOR#L1959).

### Detail lines

For a ReportDetail, emit `"*"` when opposingMarker is true and one space when
it is false. Emit the entity's object label with no added trailing space:
the roster ship name or initial, the appropriate base or planet label from its
affiliation, or the Romulan label. Pad to column 14 in LONG or column 5 otherwise.
This uses the ordinary column-padding rule, not a constant number of spaces
after every name.

Append telemetry according to its alternative:

| Telemetry | Text after the label and column padding |
| --- | --- |
| OutOfRange | `"out of range"`; no position, strength or percent suffix. |
| ShipTelemetry | Position, then the signed shield reading with Exactly { count: 6 }, followed by `%` outside SHORT. |
| RomulanTelemetry | Position, then its reported percentage with NEGATIVE_ONLY and Exactly { count: 6 }, followed by `%` outside SHORT. |
| BaseTelemetry | Position; if strength is present, append it with NEGATIVE_ONLY and Exactly { count: 6 }, followed by `%` outside SHORT. |
| PlanetTelemetry | Position; if builds is nonzero, append the integer count with NEGATIVE_ONLY and Exactly { count: 6 }. In MEDIUM append `" b"`; in LONG append `" build"` for one and `" builds"` otherwise. SHORT has no build suffix. |

Every position uses FormatLocation with Exactly { count: 2 } and the viewer's current
output-coordinate preference and output length. Relative values use the viewer's
position at presentation, not the earlier origin used to test sensor range.
Numeric fields immediately follow the position; no extra separator is inserted
before their own left padding. Quantities use the output length's ordinary
precision. Every detail finishes with a conditional blank-line request.

Base and Romulan readings here use NEGATIVE_ONLY: they have no leading plus
when positive. This differs from a ship's explicitly signed shield-mode reading
and from combat's base/Romulan strength display. A planet with zero builds has
no count or suffix. An admitted remote base can show coordinates without
strength, and an admitted remote planet can show both coordinates and builds.
These differences come from the observation alternatives, not from a fresh
visibility decision by the renderer.

For MEDIUM absolute output, a friendly Excalibur at (20,20) with raised shields
at 100% has this line:

```text
" E  @20-20  +100.0%\r\n"
```

For the same output context, an opposing Empire base at (50,50) whose telemetry
withholds strength has `"*)( @50-50\r\n"`. A remote Wolf represented by
OutOfRange has `"*W  out of range\r\n"`. TARGETS uses a space instead of the
asterisk because its observations have opposingMarker false.

### Summary lines

ReportSummary has a positive count. Emit that count with zero fractional digits,
NEGATIVE_ONLY and Exactly { count: 3 }. If knownQualifier is true, append `" known"`.
Then append one space and the category's singular text:

| Category | Singular text |
| --- | --- |
| RomulanSummary | `"Romulan"` |
| ShipSummary { team: FEDERATION } / ShipSummary { team: EMPIRE } | `"Federation ship"` / `"Empire ship"` |
| BaseSummary { team: FEDERATION } / BaseSummary { team: EMPIRE } | `"Federation base"` / `"Empire base"` |
| PlanetSummary { owner: none } | `"neutral planet"` |
| PlanetSummary { owner: FEDERATION } / PlanetSummary { owner: EMPIRE } | `"Federation planet"` / `"Empire planet"` |
| TargetSummary | `"target"` |

Append `"s"` when count differs from one. In MEDIUM or LONG, append
`" in range"`, `" in specified range"` or `" in game"` for SENSOR_RANGE,
SPECIFIED_RANGE or WHOLE_GALAXY respectively. SHORT omits this scope suffix.
Finish with a conditional blank-line request. Zero counts have no ReportSummary
and produce no line; do not introduce a zero-count row or a new absence message.

For example, a MEDIUM ReportSummary for two known Empire bases over the whole
galaxy displays `"  2 known Empire bases in game\r\n"`. One SHORT Federation
ship displays `"  1 Federation ship\r\n"`. A RomulanSummary count greater than
one remains plural according to its count, as required by the existing group
selection semantics; formatting does not replace that count with one.

**Source basis:** [detail lines](../../legacy/utexas/DECWAR.FOR#L2084),
[summary lines](../../legacy/utexas/DECWAR.FOR#L2060),
[grouped observations](../../legacy/utexas/DECWAR.FOR#L1959),
[range and category strings](../../legacy/utexas/MSG.MAC#L89).

### Absence observations

These recipes consume the corresponding GalaxyReportObservation. They add no
selection, discovery or game-state effects. Emit observations in the order
specified by ReportGalaxy; an absence does not itself suppress later groups.

ShipAbsent emits the ship's ordinary object label (full name in LONG, initial
otherwise), followed by `" is not in the game"` and one unconditional line
ending. RomulanDisabled emits fragment(type06) and one unconditional line
ending. RomulanAbsent emits `"The Romulan is dead"` and one unconditional line
ending. These messages do not infer that a missing ship was destroyed rather
than released.

SensorRangeExceeded emits `"Captain, our sensors can't scan as far as "`, then
the observed position in ABSOLUTE coordinates, SHORT presentation and Free
field width, followed by a conditional blank-line request. It uses absolute
coordinates regardless of the viewer's output-coordinate preference.

NoObjectAt emits `"No base "`, `"No planet "` or `"No target "` for BASES,
PLANETS or TARGETS respectively. Then emit the observed position using the
viewer's output-coordinate preference, LONG coordinate presentation and Free
field width, followed by a conditional blank-line request. A required relative
origin is the viewer's position when the coordinate is formatted, matching the
ordinary report-coordinate rule. If that position is unavailable, no zero
origin is fabricated.
The source supplies no LIST or SUMMARY noun at this branch; a path reaching it
for those verbs remains unresolved and this recipe does not invent one.

For NoMatches, begin with `"Captain, there are no"` in LONG or `"No"` otherwise.
Append `" known"` exactly when knownQualifier is true. Determine the affiliation
suffix from group.affiliations:

| Affiliations | Suffix |
| --- | --- |
| Exactly {NEUTRAL} | `" neutral"` |
| Exactly {FEDERATION} | `" Federation"` |
| Exactly {EMPIRE} | `" Empire"` |
| Exactly {FEDERATION, EMPIRE}, with kinds exactly {PLANET} | `" captured"` |
| Contains ROMULAN and does not contain NEUTRAL | `" enemy"` |
| Otherwise | Empty text. |

These are tests on the selected affiliations, not a fresh test of ownership or
hostility. Append the object noun determined by group.kinds:

| Kinds | Noun |
| --- | --- |
| Exactly {SHIP} | `" ships"` |
| Exactly {BASE} | `" bases"` |
| Exactly {PLANET} | `" planets"` |
| Exactly {BASE, PLANET} | `" ports"` |
| Exactly {SHIP, BASE, PLANET} | `" forces"` |

The command grammar determines which groups are legal; this table does not
make arbitrary sets of kinds valid. In MEDIUM and LONG append `" in range"`,
`" in specified range"` or `" in game"` for SENSOR_RANGE, SPECIFIED_RANGE or
WHOLE_GALAXY. SHORT omits the scope suffix. Finish with a conditional blank-line
request. For example, SHORT with knownQualifier true, affiliations {EMPIRE}
and kinds {BASE} emits `"No known Empire bases"` before that request.

### Terrain observations

A Terrain observation retains an EMPTY, STAR or BLACK_HOLE kind and the exact
position queried by LIST. It is admitted only within the ten-sector sensor
limit, including for a privileged viewer. Its established output prefix is one
space, the ordinary label for its kind, and column padding to column 14 in LONG
or column 5 otherwise. It has no opposing marker. The padding follows the
same column rule as detail lines.

**OPEN QUESTION:** The complete suffix of a terrain line has no generalized
contract in this draft. The source does not establish a terrain-specific
strength or shield quantity. Do not infer such a property from numeric text,
assume that the line ends immediately after its label, or substitute a newly
designed status line. The observation's position records the query context;
it does not by itself promise that the suffix prints that position. Exact
terminal conformance for the complete terrain line remains unresolved. The
accepted coordinate syntax, sensor limit and prefix are still specified.

Interrupted output and unavailable relative origins remain separate environment
questions. This terrain limitation does not change the ordinary detail and
absence recipes above.

**Source basis:** [coordinate and named observations](../../legacy/utexas/DECWAR.FOR#L1765),
[no-match composition](../../legacy/utexas/DECWAR.FOR#L1891),
[absence fragments](../../legacy/utexas/MSG.MAC#L109),
[position formatting](../../legacy/utexas/DECWAR.FOR#L3078).

## USERS reports

This presentation consumes [UserReportEntry](commands.md#users). Request a
conditional blank line before the report. In LONG output emit fragment(users1),
append fragment(users2) when the viewer is privileged, then request a conditional
blank line. SHORT and MEDIUM omit the heading; they do not omit row fields.
The heading fragments are:

```text
"Ship       Captain       Baud  User ID     TTY       Job"
"  Location"
```

Present entries in their observation order. FactionSeparator emits `"----"` and
one unconditional line ending. It is present at the faction boundary even when
there are no captain rows on one or both sides. Each CaptainRow uses the
formatter below, followed by a conditional blank-line request.

```text
type AccountLabel = {
    project: Text;
    member: Text;
};

query UserAccountLabel(account: AccountIdentity): AccountLabel
query FormatUserRow(row: UserRow): Text
```

UserAccountLabel belongs to the terminal binding. Its fields are the two
account components as nonempty sequences of octal digits, with no leading zero
except for the single digit `0`. They are displayed labels; game rules continue
to compare AccountIdentity values. The binding must identify which account
components these labels denote. It must not derive them from the captain's
chosen name or silently assign every account the same display label.

For this terminal presentation, row.connectionLabel contains at most six
characters in the binding's terminal-label repertoire. The binding supplies
the label's case and characters; the formatter does not infer a network address
or change the session identity. Captain names use the printable-name conversion
already defined by their acquisition rules and have at most twelve characters.
No packed character or account representation is required.

FormatUserRow concatenates these fields, in order, without other separators:

1. The full roster name for row.ship, padded on the right to ten characters.
2. One space, then row.captainName padded on the right to twelve characters.
3. One space, then row.advertisedSpeed formatted with zero fractional digits,
   NEGATIVE_ONLY and Exactly { count: 4 }.
4. Two spaces, then UserAccountLabel(row.account).project padded on the left to
   at least six characters, a comma, and its member field. If member has d
   characters, append max(5 - d, 0) spaces. Do not truncate an account component
   that exceeds its minimum field width.
5. One space, then row.connectionLabel padded on the right to six characters.
6. Two spaces, then row.sessionNumber formatted with zero fractional digits,
   NEGATIVE_ONLY and Exactly { count: 3 }.

When row.position is present, append three spaces and its recorded coordinate
components. An absolute component uses vertical, `-`, horizontal with
NEGATIVE_ONLY and Exactly { count: 2 }; there is no `@`, even in LONG output.
A relative component uses vertical, `,`, horizontal with NONZERO and
Exactly { count: 3 }. When both are present, put one space between the absolute
and relative pairs. Zero relative displacement is retained as `"  0,  0"`.
The observation's components determine this text; do not calculate a different
displacement from a later viewer position. An absent row.position contributes
neither coordinates nor the preceding three spaces.

This formatting does not grant privilege or reveal a position omitted from the
observation. It changes no game state and inserts no line ending of its own.
The surrounding report supplies line composition as stated above. Metadata
outside the terminal binding's defined label domain, and unavailable pregame
relative origins, remain binding gaps rather than invented labels or positions.

**Source basis:** [USERS headings and row order](../../legacy/utexas/DECWAR.FOR#L4600),
[identity fields](../../legacy/utexas/WARMAC.MAC#L2187),
[account field digits and width](../../legacy/utexas/WARMAC.MAC#L1856),
[position fields](../../legacy/utexas/DECWAR.FOR#L3078).

## POINTS reports

This presentation consumes [ScoreReport](commands.md#points), preserving its
column and row order. It does not recalculate scores or commit pending points.
For positive-denominator ratios, format their quotient in displayed game-point
units. Zero-denominator ratios remain outside the defined numeric presentation;
no zero, infinity, placeholder or exception text is introduced by this clause.

```text
query FormatScoreValue(value: real, output: OutputLength): Text
```

FormatScoreValue uses FormatNumber with NEGATIVE_ONLY, Exactly { count: 11 },
and zero fractional digits in SHORT or one in MEDIUM and LONG. The fractional
suffix is additional to those eleven positions. This same rule formats category
scores, totals and defined per-commission/per-turn ratios. Thus the fields occupy
eleven characters in SHORT and thirteen otherwise. Formatting discards display
digits toward zero without changing the score or ratio.

### Heading

Request a conditional blank line. Pad to column 14 in SHORT, 24 in MEDIUM or
31 in LONG. Emit selected column headings in their ScoreReport order:

- ShipScore: one space, then the full roster name padded on the right to ten
  characters; outside SHORT append two more spaces.
- Federation TeamScore: `"Federation"`, then one space; outside SHORT append
  two more spaces.
- Empire TeamScore: `"    Empire"`, then one space; outside SHORT append two
  more spaces. The four leading spaces are part of the heading.
- RomulanScore: `"  Romulans"`, with its two leading spaces and no added suffix.

Then request a conditional blank line. The heading padding is prescribed
independently of the numeric widths; do not realign it by measuring labels.

### Category rows

For each included CategoryRow, emit its label from the table. SHORT uses the
short label; MEDIUM and LONG use the other label. In LONG only, perform the
listed continuation after that label. Then concatenate the selected score
fields and request a conditional blank line.

| Category | SHORT / MEDIUM and LONG labels | LONG continuation |
| --- | --- | --- |
| Enemy damage | `"Dam E's  "` / `"Damage to enemies "` | Pad to column 26. |
| Enemy kills | `"E's dest "` / `"Enemies destroyed "` | `" ( 500)"` |
| Base damage and destruction | `"Dam B's  "` / `"Damage to bases   "` | Pad to column 26. |
| Planet capture | `"@'s capt "` / `"Planets captured  "` | `" ( 100)"` |
| Base construction | `"B's built"` / `"Bases built       "` | `" (1000)"` |
| Romulan damage and destruction | `"Dam ??'s "` / `"Damage to Romulans"` | `" ( 500)"` |
| Star destruction | `"*'s dest "` / `"Stars destroyed   "` | `" ( -50)"` |
| Planet destruction | `"@'s dest "` / `"Planets destroyed "` | `" (-100)"` |

The parenthesized text is a fixed part of the LONG label, not another score
calculation or a claim that every event in that category has that value.
An omitted CategoryRow emits neither label nor line ending.

### Totals and accounting rows

Each label below begins with one unconditional line ending, including when the
preceding row has already made a conditional blank-line request. Emit the SHORT
label in SHORT and the other label in MEDIUM or LONG. LONG then pads to the
stated column before any numeric fields.

| Row | SHORT / MEDIUM and LONG labels after the initial line ending | LONG padding |
| --- | --- | --- |
| TotalRow | `"Tot Pts  "` / `"Total points:     "` | Column 26. |
| CommissionRow | `"# of shps"` / `"Number of ships:"` | Column 24. |
| PerCommissionRow | `"Pts / Pl "` / `"Pts. / player:    "` | Column 26. |
| PerTurnRow | `"Pts / SD "` / `"Pts. / stardate:  "` | Column 26. |

TotalRow emits every selected total with FormatScoreValue, then requests a
conditional blank line. CommissionRow formats each present count with zero
fractional digits, NEGATIVE_ONLY and Exactly { count: 11 } in SHORT or
Exactly { count: 13 } otherwise. An absent ship cell emits that many spaces.
It makes no additional line-ending request: the next label supplies its initial
unconditional line ending.

PerCommissionRow uses FormatScoreValue for each present quotient, with eleven
spaces in SHORT or thirteen otherwise for an absent ship cell. It likewise
makes no additional line-ending request. PerTurnRow formats every quotient and
then requests a conditional blank line. Rows absent from ScoreReport emit
nothing; in particular a ship-only report has no commission rows or their
leading line endings.

**Source basis:** [heading and category output](../../legacy/utexas/DECWAR.FOR#L2935),
[totals and accounting output](../../legacy/utexas/DECWAR.FOR#L3002),
[score labels](../../legacy/utexas/MSG.MAC#L209),
[fixed-point display](../../legacy/utexas/WARMAC.MAC#L1942),
[roster names](../../legacy/utexas/DECWAR.FOR#L489).
