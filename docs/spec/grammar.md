# Command grammar and interpretation

Status: dispatch and the productions below have been reviewed against Austin
source. All main-game commands have drafted clauses; the coverage table records
remaining acceptance and semantic dependencies. This is not yet a complete
grammar. A command synopsis does not replace the ordered parsing rules.

## GRAM-1 — Notation

Productions use extended BNF over the tokens defined by the lexical chapter.
`::=` defines a production, juxtaposition means sequence, `[x]` means optional,
`{x}` means zero or more repetitions, `|` means alternatives, and parentheses
group alternatives. A quoted keyword such as `"MOVE"` means a keyword match
under LEX-6, including its permitted abbreviations; it does not require the
player to type quotation marks or the full spelling. Quoted punctuation has
its stated token meaning. Names such as Integer refer to the categories below,
not words that a player types.

The command entries use the same notation. Order in a displayed alternative
list is not a generic matching-precedence rule; prose establishes branch order
where it matters. Productions describe the external input form, while typed
operations and contracts describe its meaning.

`End` means the command-input operation's end boundary. A physical line can
supply more than one command through slash. Commands need not reject every
unused trailing token: only a stated end check requires complete consumption.
Missing arguments may cause another input operation rather than a syntax error.
Interactive continuations have their own token origin and are part of the language.

### Shared grammar vocabulary

The grammar is over acquired input, after the lexical rules have identified
tokens and boundaries. The following are terminal categories or named input
fragments, not new game commands or abstract-state types.

| Name | Meaning |
| --- | --- |
| `Integer` | One token whose category is INTEGER. Its numeric value follows LEX-5; an integral REAL, such as `2.0`, does not belong to this category. |
| `NameToken` | One token whose category is ALPHANUMERIC. Its retained text follows LEX-4. This category alone does not establish that the name is recognized. |
| `TokenInput` | One acquired token of any category, including NULL. It excludes End. |
| `End` | The current command-input boundary described by LEX-3 and LEX-7. It consumes no further argument. It is distinct from a NULL-category token. |
| `EmptyInput` | No tokens before End. A reply with a NULL token is not necessarily EmptyInput. |
| `ShipName` | A NameToken offered as a ship-name candidate. Resolve it against the roster under the consuming command's matching rule; recognition and availability are semantic checks. |
| `CommandName` | A NameToken offered as a command-name topic. HELP applies its visible-command set and ambiguity rules. This does not include every name that an operating environment might recognize. |
| `TerminalName` | A NameToken offered as a terminal-profile candidate. SET TTYTYPE applies the profile list and retry rules. |
| `PasswordToken` | A TokenInput offered to *PASSWORD. There is no implicit ALPHANUMERIC restriction or prefix-password rule. |
| `TournamentKey` | A TokenInput whose retained text supplies a tournament key. It is not required to be an integer. Empty key replies follow the separate creation dialogue. |
| `NameText` | The raw name fragment selected by SET NAME, including its retained spaces. The name reader's start position, twelve-character limit and transformation are defined by SET, not by ordinary token concatenation. |
| `MessageText` | The raw message body selected by TELL. Its case, spaces and punctuation are not command tokens; acquisition and retention limits follow TELL. |

The distinction between a candidate and its successful resolution matters.
For example, an unknown ShipName can produce a ship-name diagnostic after
earlier command checks or a prompt. The grammar does not authorize a new parser
to reject it before those checks. Likewise, a form outside a command's ordinary
production follows its documented error or continuation path; a production is
not an instruction to replace all such paths with a generic syntax error.

In a type declaration, lowercase `integer` instead denotes a mathematical
value domain. Integer in a command production denotes a token category. These
are deliberately different concepts: the token `2.0` has the value two but
cannot satisfy an Integer argument.

For example, `2`, `+2` and `-2` each satisfy Integer. `2.0` has REAL category;
`1E2` has ALPHANUMERIC category and can be a NameToken candidate; a lone `+`
has NULL category and can be a TokenInput but not an Integer or NameToken.
These classifications do not imply that a particular command accepts each
candidate or skips its normal diagnostics.

The following common productions name ordinary complete location forms and
TELL's recipient groups. Location does not replace the shared reader's item
count, range, prompt or error rules in GRAM-3. In particular, mode-only input
and malformed torpedo continuations retain their separately stated treatment.

```ebnf
Location ::= NumericLocation | ComputedLocation
NumericLocation ::= ["ABSOLUTE" | "RELATIVE"] Integer Integer
ComputedLocation ::= "COMPUTED" TargetName
GroupName ::= "ALL" | "KLINGON" | "EMPIRE" | "HUMAN"
            | "FEDERATION" | "FRIENDLY" | "ENEMY"
```

TargetName is defined with the coordinate forms in GRAM-3. StatusItem,
DeviceSelector, HelpTopic and Group are defined in their respective command
entries. References in a synopsis retain those definitions; they do not
introduce another grammar with different rules.

## GRAM-2 — Command selection

Main-game command names in table order are:

```text
BASES BUILD CAPTURE DAMAGES DOCK ENERGY GRIPE HELP IMPULSE LIST MOVE NEWS
PHASERS PLANETS POINTS QUIT RADIO REPAIR SCAN SET SHIELDS SRSCAN STATUS
SUMMARY TARGETS TELL TIME TORPEDOS TRACTOR TYPE USERS *DEBUG *PASSWORD
```

The table has 33 entries. Selection uses LEX-6's unique-match rule across all
33 entries, including starred entries; visibility in help does not define
recognition. Privilege checks occur in the selected routines.

The pregame table has 16 slots, in this order:

```text
ACTIVATE <blank> GRIPE HELP <blank> NEWS POINTS QUIT SET SUMMARY TIME TYPE
USERS *DEBUG *PASSWORD *ZAP
```

Blank slots 2 and 5 have no matching spelling. They MUST NOT be promoted into
DOCUMENT or HONORROLL commands. A pregame token with no pregame match is checked
against main-game names: a match there produces the main-game-only diagnostic;
otherwise it produces the unknown-command diagnostic. Multiple pregame matches
produce the ambiguous-command diagnostic. Blank input redisplays the prompt.
The initial startup dialogue accepts HELP, PREGAME or empty input separately.

## GRAM-3 — Coordinate forms

### Accepted forms and result types

The actor must have a captain and recorded position. Let s be that ship and c
its captain. LocationValues contains absolute positions and an optional leading
scalar, such as phaser strength or torpedo count. Its item count is twice the
number of positions, plus one when scalar is present. This type does not attach
strength or torpedo meaning to the scalar; the consuming command does that.
The productions describe category-correct forms. The ordered rules below also
define how other tokens fail and which diagnostic takes precedence.

```ebnf
numeric-locations ::= ["ABSOLUTE" | "RELATIVE"] {Integer}
computed-locations ::= "COMPUTED" [Integer] {TargetName}
TargetName ::= ShipName | "ROMULAN"
```

The location reader returns a list of resolved positions and, when present, one
leading scalar. The limit and error types describe validation of that list.

```typescript
type LocationLimit =
    | { kind: "Exactly"; count: number }
    | { kind: "AtMost"; count: number };

interface LocationValues {
    scalar: Optional<number>;
    positions: List<Position>;
}

type LocationError = "ComputerUnavailable" | "WrongItemCount" | "TooManyItems"
                   | "NonNameTarget" | "UnknownTarget" | "TargetAbsent"
                   | "NonIntegerCoordinate" | "VerticalOutsideGalaxy"
                   | "HorizontalOutsideGalaxy";
type LocationResult = Result<
    { kind: "Empty" } | { kind: "Resolved"; value: LocationValues },
    LocationError
>;
type LocationReadOutcome = LocationResult | { kind: "Cancelled" };
```

Both LocationLimit.count values are positive integers. The operations that use
these values are specified in pseudocode:

```text
operation ResolveLocations(actor: ShipId, arguments: List<Token>,
                           limit: LocationLimit): LocationResult

operation ReadLocations(actor: ShipId, limit: LocationLimit): LocationReadOutcome
```

ResolveLocations consumes the supplied arguments only. It does not request a
continuation. Zero resulting items returns Empty, even for Exactly { count: 2 }; this is
distinct from a blank continuation. A nonzero count must equal an Exactly limit
or not exceed an AtMost limit, giving WrongItemCount or TooManyItems otherwise.
Count checks precede individual coordinate or target validation.

ReadLocations emits the coordinates prompt and acquires another command input.
A zero-token input gives Cancelled. Otherwise treat all its tokens as location
arguments and return ResolveLocations's result. In particular, a reply containing
only ABSOLUTE, RELATIVE or COMPUTED is not a zero-token reply: it can give Empty
through resolution. Input editing and pending slash-separated input follow the
ordinary lexical rules. This acquisition replaces the current input for any
later automatic-repair selection.

### Numeric locations

Check an initial ABSOLUTE match, then RELATIVE, then COMPUTED. The first match
selects the mode and consumes that token. Without one, use c.inputCoordinates;
ABSOLUTE uses absolute coordinates, while RELATIVE or BOTH uses relative
coordinates. A selects ABSOLUTE by this ordered matching, independent of its
possible meaning in other argument parsers.

For numeric mode, let n be the number of remaining tokens. If n is zero return
Empty. Check n against limit before checking token categories. Every remaining
token must have INTEGER category; otherwise reject NonIntegerCoordinate. A REAL
whose value is mathematically integral still fails this check. Null tokens also
fail it. Type validation of all items precedes coordinate-range validation.

When n is odd, consume the first token as scalar without offsetting it or
checking galaxy bounds. Its sign and magnitude are not restricted by the
location reader. Pair the remaining tokens as vertical, horizontal coordinates.
For absolute mode use those values directly. For relative mode add the actor's
vertical and horizontal position respectively. Visit pairs in input order,
checking each vertical component before its horizontal component. Each must
lie in 1 through 75; give VerticalOutsideGalaxy or HorizontalOutsideGalaxy on
the first failure. Return Resolved with the scalar and resulting positions.

For an even n there is no scalar, including when a consuming command normally
expects a leading count. This shared reader does not invent a command-specific
odd-count check. A single numeric item is a scalar, not a one-component location.

### Computed locations

Before counting or validating targets, require:

```text
s.devices[COMPUTER].damage < 300 damage units
```

Failure gives ComputerUnavailable. Obtain the actor's recorded rate as follows:

```text
rate = session(game, c.id).reporting.advertisedSpeed
```

If c.privileged is false and rate exceeds 300,
wait for `2*rate` milliseconds before the remaining validation. This delay applies
even when the computed form later returns Empty or rejects. The delay does not
itself charge energy, advance a turn or change a weapon-readiness deadline.
Other world activity can occur during it.

If the first token following COMPUTED has INTEGER category, consume it as the
scalar. Every remaining token is a target candidate. Compute the item count
from those candidates and scalar, and perform the count check before resolving
any candidate. With no scalar or candidate return Empty; COMPUTED followed by
one integer instead has one item and no target positions.

Resolve target candidates from last to first. Each must have ALPHANUMERIC
category, otherwise NonNameTarget. Search ship names in roster order and use
the first match. If no ship matches, try ROMULAN; if that also fails, give
UnknownTarget. A Romulan target requires world.romulan to be present. A named
player target requires a commissioned ship, a recorded position and a nonempty
sector at that position; otherwise give TargetAbsent. The sector need not
identify that ship: a HELP activity's black-hole appearance does not prevent
computed targeting of its commissioned ship.

The resolved positions appear in the original target order despite reverse
validation. They are absolute regardless of the input-coordinate preference.
No numeric-mode offsets or second coordinate-range check are applied to these
already-defined positions. A damaged computer is checked even with no targets;
being unprivileged at a high advertised speed delays rather than prohibits use.

### Caller policies and diagnostics

Each command supplies the following item limit. Here k is the accepted burst
count, and a target name contributes two coordinate items.

| Caller | Interpretation | Limit |
| --- | --- | --- |
| MOVE, IMPULSE, BUILD, CAPTURE | One target position; no scalar. | Exactly { count: 2 } |
| PHASERS | One position, with optional strength; a lone scalar is a wrong-count error. | AtMost { count: 3 } |
| TORPEDOS initial input and burst prompt | Burst count and up to three positions in the normal form. | AtMost { count: 7 } |
| TORPEDOS target continuation | Target positions without a count in the normal form. | AtMost { count: 2*k } |

The command controls whether Empty prompts again, and whether a valid result
can name a friendly, absent, distant or own-sector target. Coordinate resolution
alone imposes no weapon range, energy, movement or faction restriction.
Its errors correspond respectively to the computer-damaged, wrong-number,
too-many-coordinates, nonalphabetic-name, unrecognized-name, player-not-in-game,
nonnumeric-coordinate, vertical-bound and horizontal-bound diagnostics. Errors
abort this resolution; commands specify subsequent input handling.

**OPEN QUESTION:** Missing torpedo counts, incomplete pairs and zero-item replies at special continuation
sites can make a caller request values that are not present in LocationValues.
This draft does not manufacture values from another input or silently turn
these cases into ordinary syntax rejection. Those caller paths remain outside
the completed acceptance contract. Concurrent target disappearance during name
resolution also requires the multiplayer ordering contract.

## GRAM-4 — Movement, capture and construction

Missing locations request a coordinates continuation. Empty continuation aborts;
a malformed continuation produces the location diagnostic. MOVE/IMPULSE to the
current sector request new coordinates after a diagnostic. Device checks occur
before movement coordinates are read. Valid grammar does not imply legal range,
a valid target or successful completion.

```ebnf
move ::= "MOVE" [Location]
impulse ::= "IMPULSE" [Location]
capture ::= "CAPTURE" [Location]
build ::= "BUILD" [Location]
```

## GRAM-5 — Phasers and torpedoes

Phasers accept two location items with default strength 200 or a scalar strength
followed by a location pair. A lone scalar is an error. Strength validation
accepts 50 through 500 inclusive and occurs after waiting for the selected bank;
a grammar-only validator must not reorder that wait ahead of all other checks.

**OPEN QUESTION:** The remaining missing-component and empty target-continuation
forms are recorded in the coverage matrix. A new parser must not reject them
without further source evidence.

```ebnf
phasers ::= "PHASERS" [phaser-target]
phaser-target ::= ["ABSOLUTE" | "RELATIVE"] [Integer] pair
              | "COMPUTED" [Integer] TargetName
torpedoes-normal-form ::= "TORPEDOS" [count-and-targets]
count-and-targets ::= ["ABSOLUTE" | "RELATIVE"] Integer [pair [pair [pair]]]
                  | "COMPUTED" Integer [TargetName [TargetName [TargetName]]]
pair ::= Integer Integer
```

A torpedo burst normally supplies a count from 1 through 3 followed by up to
three targets, also bounded by ammunition. With only a count, a continuation
requests up to twice the count in coordinate items. Fewer target pairs reuse the
last supplied pair for later torpedoes. The source does not implement a uniformly
strict odd-item-count check on the original command line. The command chapter
defines fully determined four- and six-item cases as well as remaining missing-
component cases. The production above describes normal forms; its ordered
acceptance rules must also be applied to other original-line input shapes.

Extra supplied pairs beyond the burst count are checked by the location reader,
then ignored when selecting the burst's aims. Own-sector and ten-sector checks
visit those selected aims in order and stop on their first failure. The distinct
outcomes and state effects are defined by [FireTorpedoes](commands.md#torpedos).

## GRAM-6 — Scans

WARNING is recognized only as the last token and is removed before parsing the
remaining arguments. Direction occupies the first argument if present. CORNER
requires exactly two integers. Other forms accept zero, one or two integers;
remaining tokens or a noninteger range produce the syntax diagnostic. Direction
matching uses the source's successive checks in the displayed order.

```ebnf
scan ::= ("SCAN" | "SRSCAN") [direction] [Integer [Integer]] ["WARNING"] End
direction ::= "UP" | "DOWN" | "RIGHT" | "LEFT" | "CORNER"
```

SCAN initially uses radius 10; SRSCAN uses 7. Before parsing explicit ranges,
the default is limited to the nonnegative whole-column count that fits
`(terminalWidth - 9) / 4`. One explicit integer
replaces all four extents; a second replaces horizontal extents. Thus explicit
ranges are not constrained by that default-width calculation. Each final extent
is clamped to 0 through 10 and the rectangle to the galaxy boundary.

UP suppresses the downward extent, DOWN the upward, RIGHT the leftward and LEFT
the rightward. For CORNER, positive V/H retains the increasing-coordinate side;
negative V/H retains the decreasing side with its absolute magnitude. Zero gives
zero extent on both sides of that axis.

## GRAM-7 — Ship resources

SHIELDS prompts for an unrecognized/missing switch. Empty switch continuation
returns; TRANSFER without an integer prompts for an amount, and a noninteger
amount continuation returns. Transfers that can exhaust engine energy request
YES confirmation. UP and DOWN do not enforce a trailing-token end check.

```ebnf
shields ::= "SHIELDS" ["UP" | "DOWN" | "TRANSFER" [Integer]]
energy ::= "ENERGY" [ShipName Integer]
repair ::= "REPAIR" [Integer | "ALL"] ["DAMAGE" {DeviceSelector}]
dock ::= "DOCK" ["STATUS" {StatusItem} | "ALL"]
tractor ::= "TRACTOR" ["OFF" | ShipName]
```

ENERGY requires a name-category token followed by an integer; otherwise it
prompts for both and accepts empty continuation as cancellation. Ship matching
uses roster order, not global ambiguity detection.

REPAIR recognizes an integer quantity or ALL at the first argument. DAMAGE is
looked for at the next position after a recognized quantity, otherwise at the
first argument. Other arguments are not a universal syntax failure. DOCK only
tests STATUS at its first argument before invoking its report parser.
At successful turn completion its first argument also selects full device
repair when it matches ALL. See [automatic repair](turns.md#automatic-repair)
for this selection rule, including the A abbreviation in coordinate commands
and the effect of acquiring a continuation.

TRACTOR with no argument while a beam is active attempts release. Otherwise it
prompts for OFF or a ship name; empty continuation cancels. Engagement and
release follow the [TRACTOR operation contract](commands.md#tractor).

## GRAM-8 — Preferences and radio

SET checks switches in the production's order. Missing/unrecognized switches
prompt; blank continuation returns. Privileged switches are considered only
when privilege is enabled. Most missing values prompt, but an unrecognized
alphanumeric value for OUTPUT, PROMPT, SCANS, ICDEF or OCDEF returns without
changing that preference. TTYTYPE instead diagnoses unknown/ambiguous values
and prompts again. NAME follows the separate name-acquisition contract in
[SET](commands.md#set).

```ebnf
set ::= "SET" [setting]
setting ::= "NAME" [NameText]
        | "OUTPUT" ("SHORT" | "MEDIUM" | "LONG")
        | "TTYTYPE" TerminalName
        | "PROMPT" ("NORMAL" | "INFORMATIVE")
        | "SCANS" ("SHORT" | "LONG")
        | "ICDEF" ("ABSOLUTE" | "RELATIVE")
        | "OCDEF" ("ABSOLUTE" | "RELATIVE" | "BOTH")
        | privileged-setting
privileged-setting ::= "ROMOPT" | "ENDFLG" | "BHREMV"
radio ::= "RADIO" ["ON" | "OFF" | ("GAG" | "UNGAG") ShipName]
```

RADIO checks ON, OFF, then GAG/UNGAG. Invalid or missing switches prompt again;
blank continuation returns. GAG/UNGAG can prompt separately for a name and use
first matching ship in roster order. A self-directed gag/ungag returns unchanged.

## GRAM-9 — Quit

Main-game QUIT discards pending command input and
requests confirmation unless a disconnect is already recorded. A YES prefix
confirms; any other response resumes command acquisition. Pregame QUIT exits
without that in-game confirmation path. Interrupts are separately scoped in
the execution model; QUIT syntax alone does not define their behavior.

## GRAM-10 — Reports and type information

STATUS without arguments prints stardate, then CONDITION, LOCATION, TORPEDO,
ENERGY, DAMAGE, SHIELDS and RADIO. Otherwise it processes alphanumeric tokens
in order, stopping at the first nonalphanumeric. An unknown item emits a syntax
diagnostic but processing continues with later items. Item matching is checked
in the order shown in the production, not by a global unique-match test.

```ebnf
status ::= "STATUS" {status-item}
status-item ::= "SHIELDS" | "LOCATION" | "CONDITION" | "TORPEDO"
            | "ENERGY" | "DAMAGE" | "RADIO"
damages ::= "DAMAGES" {DeviceSelector}
points ::= "POINTS" {points-item}
points-item ::= "ME" | "I" | "FEDERATION" | "HUMANS" | "EMPIRE"
            | "KLINGONS" | "ROMULANS" | "ALL"
type ::= "TYPE" ["OUTPUT" | "OPTION"]
users ::= "USERS"
time ::= "TIME"
```

DAMAGES first checks whether any device has positive damage. If none does, it
reports all devices functional without parsing selectors. Otherwise an initial
alphanumeric selector starts specific-device mode: process alphanumeric tokens
until the first other category, comparing each against all nine two-character
device identifiers (SH, WA, IM, LS, TO, PH, CO, RA, TR). Each match prints that
device, including zero damage; an unmatched selector is silently skipped. Without
an initial alphanumeric selector, print the general report of positive damage.

POINTS with no arguments selects the acting ship in-game, or both sides and the
Romulan before admission. Explicit selectors accumulate; ME/I is not valid
before admission. ALL selects every available column, omitting self before
admission. A nonalphanumeric token ends selector scanning; an unrecognized
alphanumeric token aborts with the points diagnostic. The selector-completion
path suppresses the Romulan column when the option is disabled. Final scoring
is a separate rule still under review.

TYPE prompts for a missing/invalid switch. The exact one-character candidate O
is diagnosed as ambiguous before reprompting. OUTPUT reports preferences;
OPTION reports game options. Empty continuation cancels. USERS and TIME do not
parse an argument list; do not invent an extra-token syntax error for them.

## GRAM-11 — LIST-family grouping

Each group is an ordered series of selectors. AND and `&` terminate a group
before other keyword matching; thus a token such as A that matches AND is not
a generic abbreviation for ALL in this context. A lone command or an empty
first group uses defaults. An empty later group, including after a trailing
separator, is an error. Groups accumulate selections for final output;
a coordinate or explicitly named object may be reported immediately.

```ebnf
list-family ::= ("LIST" | "SUMMARY" | "BASES" | "PLANETS" | "TARGETS")
              [Group] {Group-End Group}
Group-End ::= "AND" | "&"
```

| Command | Initial object set | Initial side set | Initial output | Initial range |
| --- | --- | --- | --- | --- |
| LIST | Ships, bases, planets | Both sides, neutral, Romulan | Detail | Whole game |
| SUMMARY | Ships, bases, planets | Both sides, neutral, Romulan | Summary | Whole game |
| BASES | Bases | Acting side | Detail and summary | Whole game |
| PLANETS | Planets | Both sides and neutral | Detail | 10 |
| TARGETS | Ships, bases, planets | Opposing side and Romulan | Detail | 10 |

Whole-game range covers every legal galaxy location. Commands without arguments
use the output choices in the table.

Selector recognition order is significant:

1. Two consecutive integers designate an absolute coordinate; otherwise one
   integer designates range.
2. For LIST/TARGETS, try ship names in roster order, then ROMULAN.
3. For LIST/SUMMARY/TARGETS, try SHIPS, BASES, PLANETS and PORTS.
4. Except in TARGETS, try FRIENDLY, ENEMY, TARGETS, FEDERATION, HUMAN,
   EMPIRE and KLINGON, in that order.
5. Except in BASES/TARGETS, try NEUTRAL and CAPTURED.
6. Try ALL; then CLOSEST outside SUMMARY; then LIST outside LIST/SUMMARY;
   then SUMMARY outside SUMMARY.

Each successful selector updates the current group. Object, side, coordinate,
range and output selectors have conflict rules rather than free commutativity:

- A coordinate is unavailable to SUMMARY and cannot follow a coordinate, named
  object, other object selector, side,
  ALL, range, CLOSEST or output selector. Its two coordinates must be legal.
- Only one explicit range is allowed; it must be positive, requires an acting
  ship and cannot accompany a coordinate.
- A side selector cannot follow another side selector or a coordinate. FRIENDLY
  and ENEMY require an acting ship. FRIENDLY excludes Romulan; ENEMY includes it.
  A prior named ROMULAN also conflicts with a later side selector.
- SHIPS/BASES reject a previous object selector or NEUTRAL/CAPTURED selection.
  PLANETS rejects a previous object selector. NEUTRAL/CAPTURED constrain the
  object set to planets and reject another side or a nonplanet object selector.
- PORTS requires an acting ship and no prior object selector; it selects bases
  and planets unless NEUTRAL already constrained the set. With no explicit side
  it selects friendly and neutral objects, and excludes Romulan.
- ALL cannot repeat or accompany a coordinate. Without an explicit side it
  selects all sides except that TARGETS retains its target side set. Without an
  explicit range it selects whole-game range.
- CLOSEST requires an acting ship, rejects prior CLOSEST/coordinate/output
  selectors, selects detail output and uses whole-game range unless explicit.
- Explicit LIST/SUMMARY output selectors reject prior output, coordinate,
  CLOSEST or named-object selectors. Their interaction with the command's
  default output is retained, including LIST SUMMARY selecting both modes.
- Ship names reject prior selectors other than named objects/Romulan. Repeated
  ship names select the same identity once. ROMULAN cannot repeat, but may follow
  other selectors without their reciprocal restrictions. In particular,
  PLANETS ROMULAN can select the named Romulan, whereas ROMULAN PLANETS conflicts.
  A coordinate path takes precedence over named ROMULAN when both occur;
  otherwise named selection takes precedence over ordinary filters or CLOSEST.

Illegal keywords and selector conflicts diagnose and abort further processing.
Their exact diagnostic text will be specified with the report responses.
This clause still requires exhaustive ordering examples; it must not be replaced
with an unordered filter-object parser.

## GRAM-12 — TELL and text-reading utilities

TELL requests recipients when absent, with empty continuation cancelling. Ship
names take precedence over group names; groups use ambiguity detection. Austin
skips ROMULAN recipient tokens. For other recipients a repeated line is rejected.
After recipient filtering, if anyone remains, the message body is read from the
original acquired line after its first semicolon. Without a semicolon, `Msg: `
requests a separately acquired line. The body retains original characters rather
than the command token spelling; spaces and punctuation are message data. A
control cancellation in that read sends no message.

```ebnf
tell ::= "TELL" [recipient {recipient}] [";" MessageText]
recipient ::= ShipName | GroupName | "ROMULAN"
help ::= "HELP" {HelpTopic | "*"}
news ::= "NEWS"
gripe ::= "GRIPE"
```

HELP without arguments lists general topics. `*` lists visible commands; other
tokens are matched first against visible main commands, then extra help topics.
Ambiguity is diagnosed in the applicable search. Privilege changes which starred
commands are offered. HELP is rejected under red alert before its temporary
information activity. The special initial startup HELP dialogue belongs to the
session rules, which are still being rewritten.

NEWS reads its asset and requests YES confirmation at a section separator
consisting of a dot immediately after a line boundary. Other responses stop
viewing. GRIPE rejects red alert, otherwise acquires edited lines until Ctrl-Z,
control cancellation or its 20-line limit. These utilities do not treat their
ordinary trailing command tokens as a new universal argument grammar. Complete
asset and message-length edge behavior remains in terminal/queue coverage.

## GRAM-13 — Starred commands

Austin *PASSWORD sets privilege only for an exact five-character comparison
with `*MINK`; a prefix-only or failed match clears privilege. It does not prompt
or emit the removed CompuServe project-rejection message. The password token
is intentionally specified because it is a rule in the supplied source, not a
modern authentication recommendation.

```ebnf
password ::= "*PASSWORD" [PasswordToken]
debug ::= "*DEBUG"
zap ::= "*ZAP"                  ; pregame only
```

*DEBUG emits the unknown-command/help fragments without privilege; with privilege
it prints the collected timer report. Instrumented diagnostic entries and empty
timer records require host-profile definitions; no hidden gameplay ability is
implied. Pregame *ZAP silently does nothing without privilege. With privilege
it attempts administrative recording and clears the statistics archives as
defined by [ZapStatistics](session-rules.md#administrative-statistics).
It ignores trailing tokens and must not be treated as an ordinary in-game command.
