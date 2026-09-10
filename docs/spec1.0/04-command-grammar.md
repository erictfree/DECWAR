# 4. Grammar

The command grammar assigns structure to the tokens defined in Section 3.
It identifies the requested operation and its operands. Whether that operation
is possible in the current galaxy is a semantic question: a destination may
be grammatically correct but outside the galaxy or beyond a ship's warp limit.

This chapter covers the 31 ordinary in-game commands, their shared operand
forms, and the additional pre-game and privileged command names. It describes
complete invocations and deliberate requests for prompted input. Reviewer
notes identify unresolved historical acceptance and recovery cases; the
presence of a production does not imply completed command semantics.

Section 4.15 collects the command-specific productions. Section 7 gives
readable syntax summaries, operand explanations and command semantics.

## 4.1. Names and abbreviations

A quoted word in the grammar denotes a canonical name. Unless a rule below
specifies a different resolution order, input may use any
nonempty prefix that identifies exactly one permitted name in that position,
ignoring letter case. Recognition considers the permitted vocabulary, not
which ships are present or which operations the current game state allows.

For a word `s` and the set `V` of permitted names, the candidates are the
members of `V` whose spelling begins with `s`, after converting both to
uppercase. One candidate resolves the name; no candidates means an unknown
name; more than one means an ambiguous name. An exact match does not override
another candidate with the same prefix.

The first word is resolved against the command vocabulary for the current
interaction phase. For `MOVE`, the accepted spellings are `M`, `MO`, `MOV`,
and `MOVE`. The ordinary in-game command names and minimum prefixes are:

```text
BA  BASES       BU  BUILD       C   CAPTURE
DA  DAMAGES     DO  DOCK        E   ENERGY
G   GRIPE       H   HELP        I   IMPULSE
L   LIST        M   MOVE        N   NEWS
PH  PHASERS     PL  PLANETS     PO  POINTS
Q   QUIT        RA  RADIO       RE  REPAIR
SC  SCAN        SE  SET         SH  SHIELDS
SR  SRSCAN      ST  STATUS      SU  SUMMARY
TA  TARGETS     TE  TELL        TI  TIME
TO  TORPEDOES   TR  TRACTOR      TY  TYPE
U   USERS
```

`TORPEDO`, `TORPEDOS`, and `TORPEDOES` name the same command. Their prefixes
are resolved as one command, not as competing aliases. Singular `DAMAGE` is
already a prefix of `DAMAGES`. The shorter historical spelling `TORPEDOS`
does not change the canonical spelling used in this chapter.

Within a destination, the modifier vocabulary is `ABSOLUTE`, `RELATIVE`, and
`COMPUTED`; `A`, `R`, and `C` therefore suffice. After `COMPUTED`, the
vocabulary is the eighteen roster names defined in Section 2 plus `ROMULAN`.
Each has a distinct initial letter. Here `R` means `ROMULAN`, not `RELATIVE`.

An unknown, ambiguous, or inappropriate word does not resolve by selecting a
convenient candidate. The affected command defines the diagnostic and whether
the player is prompted again.

For the ordinary in-game command word, recognition failure produces the
following diagnostic, with no candidate list:

| Failure | Short output | Medium or long output |
| --- | --- | --- |
| No command matches | `Unknown command\n` | `Unknown command -- for help type HELP\n` |
| More than one command matches | `Ambiguous command\n` | `Ambiguous command -- for help type HELP\n` |

An empty segment at an ordinary line boundary supplies no command and emits
neither diagnostic. Empty slash segments retain Section 3's unresolved rule.
Recognition failure invokes no command and completes no turn; command
acquisition still performs its separate delivery and alert checks. Recognizing
a command does not validate its operands: `M 20.0 21` identifies MOVE but does
not supply the integer coordinate pair its grammar requires.

## 4.2. Command segments

The top-level production enumerates the ordinary in-game commands:

```ebnf
command = bases-command | build-command | capture-command
        | damages-command | dock-command | energy-command
        | gripe-command | help-command | impulse-command
        | list-command | move-command | news-command
        | phasers-command | planets-command | points-command
        | quit-command | radio-command | repair-command
        | scan-command | set-command | shields-command
        | srscan-command | status-command | summary-command
        | targets-command | tell-command | time-command
        | torpedoes-command | tractor-command | type-command
        | users-command ;
```

Separators are implicit
between adjacent word or numeric tokens, as defined in Section 3.3. Every
token in the segment must be consumed by the production. Extra operands do
not become another command without a slash or a new line.

> **Reviewer note — acceptance and recovery (C-010):** Several historical
> commands ignore trailing operands or prompt again after malformed input.
> The productions specify intended forms and explicit omissions. Their
> whole-segment requirement is a working rule, not a decision to remove all
> historical permissiveness. Those cases need command-by-command review.

Section 7.1 defines MOVE's input forms and dialogue, including cancellation
and own-position retries.

## 4.3. Destinations

A destination gives either two coordinates or the name of a vessel whose
position supplies them:

```ebnf
coordinate-mode = "ABSOLUTE" | "RELATIVE" | "COMPUTED" ;
destination = coordinate-pair
            | "ABSOLUTE", coordinate-pair
            | "RELATIVE", coordinate-pair
            | "COMPUTED", vessel-name ;
coordinate-pair = integer, integer ;
vessel-name = word ;
```

The first integer is vertical and the second horizontal. A `vessel-name`
must resolve against the vessel vocabulary in Section 4.1. The `word`
production alone does not make an arbitrary word a valid vessel name.

`ABSOLUTE` supplies a position directly. `RELATIVE` supplies a displacement
from the issuing ship's position. An unmarked pair uses the player's current
coordinate-input mode, initially absolute. `SET ICDEF RELATIVE` selects
relative input; `SET ICDEF ABSOLUTE` restores absolute input. An explicit
modifier applies only to the destination in which it appears and does not
change that preference.

For a relative pair `(v, h)` and issuing position `p`, the destination is
`(p.vertical + v, p.horizontal + h)`. For a computed destination, it is the
named vessel's position when the destination is resolved. Resolution does
not reserve the destination sector or cause later tracking of the vessel.

The grammar does not impose the galaxy bounds, vessel-presence checks,
computer-damage restrictions, or warp limits. Section 7.1 supplies those rules
for `MOVE` and specifies their evaluation order.

> **Reviewer note — player preferences:** Coordinate-input mode and output
> length now belong to PlayerPreferences in Section 2. Player identity and
> preference initialization remain to be specified.

## 4.4. Prompted destinations

At a coordinate prompt, the response omits the command name:

```ebnf
coordinate-response = [ destination | coordinate-mode ] ;
```

An empty response cancels the pending movement. A modifier alone requests
another coordinate prompt; it does not change the player's default input mode
or establish a mode for the next response. For example, answering `R` and
then `1 0` does not carry `RELATIVE` forward. To make that displacement
explicit, answer `R 1 0` in one response.

The grammar distinguishes an incomplete but permitted response from malformed
input. `R` is a modifier-only response; `R 1` lacks an operand; `C W` is a
complete computed destination; and `MOVE R 1 0` is not a destination response.

> **Reviewer note — dialogue boundaries:** A slash can leave a further segment
> available when a command requests more input. The execution and interaction
> rules must decide how that segment is consumed and what happens to subsequent
> segments after cancellation or rejection. This draft does not equate a
> sequence of slash-separated segments with an atomic sequence of commands.

## 4.5. Examples

These examples distinguish recognition and grammar from game-state checks:

- `move relative +3,-2` is a relative movement request with operands 3 and -2.
- `M C W` is a movement request to the Wolf's position. An absent Wolf is a
  semantic error, not a grammatical error.
- `M A 76 20` is grammatically correct; its vertical coordinate is outside
  the galaxy.
- `M A 20.0 21` is grammatically incorrect: the coordinate is a decimal token.
- `M A 20 21 22` is grammatically incorrect: the segment has an extra operand.
- `M R` requests prompted input; it does not mean a displacement of zero.

## 4.6. Movement, planets, and weapons

`IMPULSE`, `BUILD`, and `CAPTURE` take one destination in the same forms as
`MOVE`. The destination may be omitted, or a coordinate modifier supplied
alone, to request coordinate input. Whether the destination contains a planet
or is within the required range belongs to the command's semantics.

```ebnf
numeric-mode = "ABSOLUTE" | "RELATIVE" ;
```

`PHASERS` takes one destination and an optional integer energy amount. A
coordinate modifier precedes the energy amount, when both are supplied.
The amount is distinct from the two integers forming a coordinate pair.

Section 4.15 defines PHASERS' productions; Section 7.19 defines its semantics.

For example, `PH R 200 2 -3` supplies 200 energy units and a relative
destination. `PH C 200 W` supplies the same energy amount and the Wolf's
position. `PH 200` is not a complete target specification.

`TORPEDOES` begins with an integer burst count and accepts one to three
targets. One coordinate mode applies to the entire target list; modes cannot
be mixed within a burst. Omitting targets after a count requests them at a
coordinate prompt.

Section 4.15 defines TORPEDOES and its target-response productions;
Section 7.20 defines its semantics.

For example, `TO R 3 2 -5 3 -5` supplies a count of three and two relative
targets. Assigning targets to the burst, checking the count against available
torpedoes, and enforcing targeting limits are semantic rules. A target-only
response omits the burst count. If the command supplied only a mode and a
count, that mode does not persist into the response: an explicit mode must
be repeated there, or the player's default applies.

> **Reviewer note — weapon recovery:** The historical torpedo reader handles
> count-only, even-length, and surplus-target input differently depending on
> whether it came with the command or at a prompt. C-010 covers those cases.
> The productions above identify meaningful requests without specifying stale
> operands or silently ignored targets as language behavior.

## 4.7. Ship resources and reports

ENERGY and SHIELDS are defined in Sections 7.12 and 7.11 respectively.
Their ship-name operand uses the shared roster-name production below.

```ebnf
roster-name = word ;
```

A `roster-name` resolves against the eighteen named player vessels only;
`ROMULAN` is not an energy recipient or tractor partner. Resource limits and
permissions belong to the respective command semantics.

`STATUS` selects zero or more ship properties. `DOCK` may append the same
status request; these are status fields, not device names.

```ebnf
status-field = "CONDITION" | "LOCATION" | "TORPEDOES"
             | "ENERGY" | "DAMAGE" | "SHIELDS" | "RADIO" ;
```

An empty status-field list requests the full report. Otherwise, fields are
supplied in report order. `DO ST E SH` requests energy and shield information
after docking. Within a status request, `TORPEDO` and `TORPEDOS` are accepted
spellings of `TORPEDOES`.

`DAMAGES` selects shipboard devices using their short codes. `REPAIR` may
append a damage report after an optional repair amount or `ALL`.

```ebnf
device-selector = word ;
```

The device codes are `SH` (shields), `WA` (warp engines), `IM` (impulse
engines), `LS` (life support), `TO` (torpedo tubes), `PH` (phasers), `CO`
(computer), `RA` (radio), and `TR` (tractor beam). A selector is a nonempty
prefix of one or more codes. Unlike ordinary name resolution, it selects
every matching device: `T` selects both `TO` and `TR`. Full device names
are not substituted for these codes. No selectors requests all damaged
devices. `RE ALL DA SH` requests repair followed by a shield-device report.

## 4.8. Sensor scans

`SCAN` and `SRSCAN` share modifiers but have different default ranges. An
ordinary scan takes zero, one, or two integer ranges. A corner scan requires
two. `WARNING`, when present, is the final token.

```ebnf
scan-arguments = ( [ scan-direction ], [ integer, [ integer ] ]
                | "CORNER", integer, integer ), [ "WARNING" ] ;
scan-direction = "UP" | "DOWN" | "LEFT" | "RIGHT" ;
```

The two integers specify vertical and horizontal extent. Their signs in a
corner scan select the corner relative to the ship. `SC C -5 -5 W` is a
complete corner scan; `SC C -5` is not. Range clipping and displayed danger
zones are semantic rules.

Section 4.15 defines both command productions; Section 7.9 defines their semantics.

## 4.9. Galaxy reports

`LIST`, `SUMMARY`, `BASES`, `PLANETS`, and `TARGETS` take selection groups.
An omitted group uses the command's defaults. `AND` or the standalone token
`&` separates nonempty groups; it is not a slash command boundary.

```ebnf
report-groups = report-group, { group-separator, report-group } ;
group-separator = "AND" | "&" ;
report-group = report-item, { report-item } ;
report-item = vessel-name | coordinate-pair | integer
            | object-selector | faction-selector
            | "NEUTRAL" | "CAPTURED" | "ALL" | "CLOSEST"
            | "LIST" | "SUMMARY" ;
object-selector = "SHIPS" | "BASES" | "PLANETS" | "PORTS" ;
faction-selector = "FEDERATION" | "HUMAN" | "EMPIRE" | "KLINGON"
                 | "FRIENDLY" | "ENEMY" | "TARGETS" ;
```

The shared production is restricted by the report command:

- `LIST` permits vessel names, coordinate pairs, ranges, object and faction
  selectors, `NEUTRAL`, `CAPTURED`, `ALL`, `CLOSEST`, and `SUMMARY`.
- `SUMMARY` permits ranges, object and faction selectors, `NEUTRAL`,
  `CAPTURED`, and `ALL`. It does not take vessel names or coordinate pairs.
- `BASES` permits coordinate pairs, ranges, faction selectors, `ALL`,
  `CLOSEST`, `LIST`, and `SUMMARY`.
- `PLANETS` permits coordinate pairs, ranges, faction selectors, `NEUTRAL`,
  `CAPTURED`, `ALL`, `CLOSEST`, `LIST`, and `SUMMARY`.
- `TARGETS` permits vessel names, coordinate pairs, ranges, object selectors,
  `ALL`, `CLOSEST`, `LIST`, and `SUMMARY`. Its faction selection is implicit.

In `LIST` and `TARGETS`, try a vessel name before a keyword. Thus `L E`
selects Excalibur; `L EN` selects enemies. A standalone `R` selects the
Romulan. After vessel lookup, keywords are considered in this order, skipping
those unavailable to the command: `SHIPS`, `BASES`, `PLANETS`, `PORTS`,
`FRIENDLY`, `ENEMY`, `TARGETS`, `FEDERATION`, `HUMAN`, `EMPIRE`, `KLINGON`,
`NEUTRAL`, `CAPTURED`, `ALL`, `CLOSEST`, `LIST`, `SUMMARY`. The first
matching keyword wins. Recognize `AND` as a group separator before either
lookup; `A` therefore separates groups rather than abbreviating `ALL`.

Two successive integer tokens form a coordinate pair; a single integer is
a range. A coordinate pair in a report is absolute. It does not accept the
coordinate-mode keywords of Section 4.3. A range must be positive.

Within a group, at most one object category, faction category, range, and
output modifier is specified. `ALL` and `CLOSEST` each occur at most once.
`NEUTRAL` and `CAPTURED` select planets and cannot accompany a ship or base
category. A coordinate selection excludes faction, range, `ALL`, `CLOSEST`,
and output modifiers. `CLOSEST` excludes explicit output modifiers. Named
vessel selections and aggregate selectors are not generally interchangeable.

For LIST and SUMMARY, NEUTRAL PORTS and CAPTURED PORTS are accepted, but
PORTS NEUTRAL and PORTS CAPTURED are not. NEUTRAL and CAPTURED first select
a planet category implicitly; that does not occupy the explicit object-selector
position. PORTS is an explicit object selector, after which neither NEUTRAL
nor CAPTURED is permitted. Section 7.10 specifies the resulting selections,
including their interactions with ALL and TARGETS.

Availability and conflict are separate checks. For example, NEUTRAL is not an
available BASES keyword, whereas it is available but conflicts with a preceding
PORTS in SUMMARY. The command entry specifies the corresponding diagnostics.
Section 7.10 also records the unresolved interaction between explicit faction
names and a previously selected Romulan; faction aliases are not assumed
equivalent to FRIENDLY or ENEMY in that case.

> **Reviewer note — group constraints (C-010):** These restrictions cover the
> ordinary group forms. Historical validation also depends on selector order,
> particularly when vessel names, coordinates, and output modifiers are mixed.
> The permissive `report-group` production plus these constraints is not yet
> an exhaustive definition of those order-sensitive combinations. Preserve
> keyword precedence while reviewing the remaining constraints.
> Section 7.10 now enumerates the named/aggregate and coordinate/Romulan
> branch asymmetries and their observable results. Their acceptance remains
> under review; they are not additional unrestricted grammar alternatives.

For example, `L EN BA` selects enemy bases, and `L 20 21 & 22 23` supplies
two absolute-position groups. `PL ALL NEU` selects neutral planets; `TA FE`
does not supply a valid faction modifier to `TARGETS`.

## 4.10. Scores and communication

`POINTS` takes any number of score subjects. Personal, faction, and Romulan
subjects are distinct; omission selects the context's default report.

RADIO's action production is in Section 4.15; its semantics are in Section 7.17.

The singular forms `HUMAN`, `KLINGON`, and `ROMULAN` are prefixes of the
corresponding score subjects. `RADIO` with no action requests one; `GAG` and
`UNGAG` with no ship request a roster name. Within a radio-action position,
the historical prefix `O` selects `ON` before `OFF` is considered. `OF`
selects `OFF`.

Section 7.3 defines TRACTOR's state-dependent omission and operand lookup.

`TELL` has a tokenized recipient list and a free-text message. The first
semicolon ends recipient input and introduces the message, not a comment.

Section 4.15 defines TELL's productions; Section 7.18 defines its semantics.

Recipient lookup tries vessel names before groups. Among group names, a
prefix must identify exactly one group. Consequently, `TE E;...` names
Excalibur, while `TE EN;...` names the enemy group. The Romulan name is
recognized but does not designate a player recipient. Recipient eligibility
and duplicate suppression belong to communication semantics.

If recipients are omitted, they are requested. If the semicolon and message
are omitted, a separate message line is requested. That line is entirely
message text. Inside message text, case, spaces, commas, semicolons, and
slashes retain their text meaning. `TELL` is therefore last on a chained
command line. `TE W;hold / wait` sends the slash as part of the message.

## 4.11. Player settings

Sections 7.4 and 7.5 define SET and TYPE lookup rules, prompted input and
semantics. Their productions are in Section 4.15. Player preferences are
defined in Section 2.

## 4.12. Information, feedback, and departure

`HELP` accepts multiple topics; `*` requests the command listing. Command
names are valid topics, as are the additional topic names below.

```ebnf
confirmation-response = [ "YES" | "NO" ] ;
```

A `command-topic` must resolve to a command name, rather than an arbitrary
word. Help lookup considers command names before additional topics; `HELP
IN` can select `INPUT` while `HELP I` selects `IMPULSE`. Privileged topics
may be unavailable to ordinary players. Help abbreviation errors and topic
availability are reported by the help operation.

`GRIPE` begins a multiline feedback interaction. Its body is text, not a
sequence of game commands. The historical end-of-feedback gesture is Ctrl-Z;
the input-interaction chapter must define that gesture and cancellation.
`NEWS`, `TIME`, and `USERS` have no operands in the working grammar.

In play, `QUIT` requests confirmation separately. `QUIT YES` is not a
combined confirmation form. A `YES` response confirms departure; other
responses do not confirm it. The `confirmation-response` production gives the
ordinary affirmative, negative, and blank responses; command semantics define
the handling of other input. It is also used where an operation asks the
player to confirm an energy expenditure.
Section 5.2 defines affirmative recognition and nonaffirmative responses;
Section 5.3 distinguishes a chained SHIELDS response from QUIT's fresh input.

## 4.13. Pre-game and privileged vocabulary

Before commissioning a ship, the pre-game command vocabulary is smaller:

```ebnf
pre-game-command = activate-command | gripe-command | help-command
                 | news-command | points-command | quit-command
                 | set-command | summary-command | time-command
                 | type-command | users-command | privileged-command ;
activate-command = "ACTIVATE" ;
entry-response = [ "PREGAME" | "HELP" ] ;
privileged-command = "*DEBUG" | "*PASSWORD", [ credential-token ]
                   | "*ZAP" ;
in-game-command = command | "*DEBUG"
                | "*PASSWORD", [ credential-token ] ;
credential-token = ? one nonempty token supplied as a credential ? ;
privileged-setting = "ROMOPT" | "ENDFLG" | "BHREMV" ;
```

At the initial entry prompt, blank input proceeds to commissioning; `PREGAME`
enters pre-game interaction, and `HELP` requests entry guidance. `ACTIVATE`
proceeds from pre-game to commissioning. These are interaction forms, not
movements within the galaxy.

Pre-game command abbreviation uses the pre-game vocabulary: for example, `P`
can identify `POINTS` there. Personal score subjects `ME` and `I`, relative
faction selectors, and location-dependent report options require a commission.
`QUIT` in pre-game leaves that interaction without the in-game confirmation.

`*DEBUG` and `*PASSWORD` appear in the historical in-game and pre-game
vocabularies; `*ZAP` appears only in pre-game. The asterisk is part of each
name, not a separate token. Privileged settings occur after `SET` and take
no value. Authorization is a semantic condition, not a lexical distinction.

> **Reviewer note — administrative boundary (C-011):** This inventory accounts
> for every named command in the Austin dispatch tables, including privileged
> commands and entry forms. Debugging, credentials, administrative reset, and
> terminal presentation need an explicit scope decision before their behavior
> becomes an Austin Core requirement. No historical credential, monitor, or
> process architecture is part of this grammar.

## 4.14. Prompted operand forms

The productions above distinguish a deliberate omission from a complete
invocation. The ordinary continuation forms are:

- Movement, `BUILD`, and `CAPTURE`: `coordinate-response` (Section 4.4).
- `PHASERS`: `phaser-arguments`, or a modifier alone to request input again.
- `TORPEDOES`: count and targets as `torpedo-arguments`, then
  `target-response` when only targets remain to be supplied.
- `ENERGY`: `energy-arguments`, supplying the ship and amount together.
- `SHIELDS`: `shield-action`, then an integer if a transfer amount is missing.
- `RADIO`: `radio-action`, then a roster name when gagging or ungagging.
- `TRACTOR`: `OFF` or a roster name.
- `SET`: a setting, then a value from that setting's vocabulary; name input
  uses the entire name-text line.
- `TYPE`: `OPTION` or `OUTPUT`.
- `TELL`: recipients, optionally followed by `;` and message text; otherwise
  the subsequent message prompt accepts a text line.
- In-game `QUIT` and energy confirmations: `confirmation-response`.

Prompt text, blank-response cancellation, retry behavior, and the consumption
of remaining slash segments belong to each interaction's semantics. An
optional operand does not imply a universal prompting rule: bare `TRACTOR`,
bare `REPAIR`, and bare `STATUS` already have context-specific meanings.

*Examples:* `TO C 2 W` names a two-torpedo burst; `RE ALL DA TO` appends a
torpedo-device report; `L EN BA & FR PO` supplies two report groups; `RA G W`
gags the Wolf; `DO ST E SH` appends a status request; and `SE N Ada Lovelace`
supplies a two-word player name. These are syntax examples, not assertions
that every corresponding action is permitted in the current galaxy.

## 4.15. Command productions

These are the formal command-specific productions. Section 7 presents readable
syntax summaries and defines the operations. Shared operands and their lookup
restrictions are defined in the preceding sections.

### MOVE

```ebnf
move-command = "MOVE", [ destination | coordinate-mode ] ;
```

### IMPULSE

```ebnf
impulse-command = "IMPULSE", [ destination | coordinate-mode ] ;
```

### TRACTOR

```ebnf
tractor-command = "TRACTOR", [ "OFF" | roster-name ] ;
tractor-response = [ "OFF" | roster-name ] ;
```

### SET

```ebnf
set-command = "SET", [ setting ] ;
setting = "NAME", [ player-name-text ]
        | "OUTPUT", [ output-length ]
        | "SCANS", [ scan-length ]
        | "PROMPT", [ prompt-style ]
        | "ICDEF", [ numeric-mode ]
        | "OCDEF", [ numeric-mode | "BOTH" ]
        | "TTYTYPE", [ terminal-name ]
        | privileged-setting ;
output-length = "SHORT" | "MEDIUM" | "LONG" ;
scan-length = "SHORT" | "LONG" ;
prompt-style = "NORMAL" | "INFORMATIVE" ;
terminal-name = "ACT-IV" | "ADM-2" | "ADM-3A" | "DATAPOINT"
              | "ACT-V" | "SOROC" | "BEEHIVE" | "CRT" ;
player-name-text = line-character, { line-character } ;
```

### TYPE

```ebnf
type-command = "TYPE", [ "OPTION" | "OUTPUT" ] ;
```

### DAMAGES

```ebnf
damages-command = "DAMAGES", { device-selector } ;
```

### STATUS

```ebnf
status-command = "STATUS", { status-field } ;
```

### POINTS

```ebnf
points-command = "POINTS", { score-subject } ;
score-subject = "ME" | "I" | "FEDERATION" | "HUMANS"
              | "EMPIRE" | "KLINGONS" | "ROMULANS" | "ALL" ;
```

### SCAN and SRSCAN

```ebnf
scan-command = "SCAN", scan-arguments ;
srscan-command = "SRSCAN", scan-arguments ;
```

### LIST

```ebnf
list-command = "LIST", [ report-groups ] ;
```

### SUMMARY

```ebnf
summary-command = "SUMMARY", [ report-groups ] ;
```

### BASES

```ebnf
bases-command = "BASES", [ report-groups ] ;
```

### PLANETS

```ebnf
planets-command = "PLANETS", [ report-groups ] ;
```

### TARGETS

```ebnf
targets-command = "TARGETS", [ report-groups ] ;
```

### SHIELDS

```ebnf
shields-command = "SHIELDS", [ shield-action ] ;
shield-action = "UP" | "DOWN" | "TRANSFER", [ integer ] ;
```

### ENERGY

```ebnf
energy-command = "ENERGY", [ energy-arguments ] ;
energy-arguments = roster-name, integer ;
```

### REPAIR

```ebnf
repair-command = "REPAIR", [ integer | "ALL" ],
                 [ "DAMAGE", { device-selector } ] ;
```

### DOCK

```ebnf
dock-command = "DOCK", [ "STATUS", { status-field } ] ;
```

### CAPTURE

```ebnf
capture-command = "CAPTURE", [ destination | coordinate-mode ] ;
```

### BUILD

```ebnf
build-command = "BUILD", [ destination | coordinate-mode ] ;
```

### RADIO

```ebnf
radio-command = "RADIO", [ radio-action ] ;
radio-action = "ON" | "OFF"
             | ("GAG" | "UNGAG"), [ roster-name ] ;
```

### TELL

```ebnf
tell-command = "TELL", [ recipients, [ ";", message-text ] ] ;
recipients = recipient, { recipient } ;
recipient = vessel-name | recipient-group ;
recipient-group = "ALL" | "FEDERATION" | "HUMAN" | "EMPIRE"
                | "KLINGON" | "FRIENDLY" | "ENEMY" ;
message-text = { line-character } ;
line-character = ? any character other than a line boundary ? ;
```

### PHASERS

```ebnf
phasers-command = "PHASERS", [ phaser-arguments | coordinate-mode ] ;
phaser-arguments = [ numeric-mode ], [ integer ], coordinate-pair
                 | "COMPUTED", [ integer ], vessel-name ;
```

### TORPEDOES

```ebnf
torpedoes-command = "TORPEDOES",
                    [ torpedo-arguments | coordinate-mode ] ;
torpedo-arguments = [ numeric-mode ], integer, [ coordinate-list ]
                  | "COMPUTED", integer, [ vessel-list ] ;
coordinate-list = coordinate-pair,
                  [ coordinate-pair, [ coordinate-pair ] ] ;
vessel-list = vessel-name, [ vessel-name, [ vessel-name ] ] ;
target-response = [ numeric-mode ], coordinate-list
                 | "COMPUTED", vessel-list ;
```

### HELP

```ebnf
help-command = "HELP", { help-topic } ;
help-topic = "*" | command-topic | "CTL-C" | "INTRO"
           | "HINTS" | "INPUT" | "OUTPUT" | "PAUSES" | "PREGAME" ;
command-topic = word | "*DEBUG" | "*PASSWORD" ;
```

### NEWS

```ebnf
news-command = "NEWS" ;
```

### TIME

```ebnf
time-command = "TIME" ;
```

### USERS

```ebnf
users-command = "USERS" ;
```

### GRIPE

```ebnf
gripe-command = "GRIPE" ;
```

### QUIT

```ebnf
quit-command = "QUIT" ;
```
