# Command grammar and interpretation

Status: dispatch and the productions below have been reviewed against Austin
source. All main-game commands have drafted clauses; the coverage table records
remaining acceptance and semantic dependencies. This is not yet a complete
grammar. A command synopsis does not replace the ordered parsing rules.

## GRAM-1 — Notation

Productions operate on tokens from LEX-1 through LEX-7, not directly on typed
characters. `kw(NAME)` means a keyword match under LEX-6, `integer` means an
integer-category token, `[x]` means optional, `{x}` means repetition, and `|`
means alternatives. Order in a displayed alternative list is not a generic
matching-precedence rule; prose establishes branch order where it matters.

`end` means the command-input operation's end sentinel. A physical line can
supply more than one command through slash. Commands need not reject every
unused trailing token: only a stated end check requires complete consumption.
Missing arguments may cause another input operation rather than a syntax error.
Interactive continuations have their own token origin and are part of the language.

## GRAM-2 — Command selection

Main-game command names in table order are:

```
BASES BUILD CAPTURE DAMAGES DOCK ENERGY GRIPE HELP IMPULSE LIST MOVE NEWS
PHASERS PLANETS POINTS QUIT RADIO REPAIR SCAN SET SHIELDS SRSCAN STATUS
SUMMARY TARGETS TELL TIME TORPEDOS TRACTOR TYPE USERS *DEBUG *PASSWORD
```

The table has 33 entries. Selection uses LEX-6's unique-match rule across all
33 entries, including starred entries; visibility in help does not define
recognition. Privilege checks occur in the selected routines.

The pregame table has 16 slots, in this order:

```
ACTIVATE <blank> GRIPE HELP <blank> NEWS POINTS QUIT SET SUMMARY TIME TYPE
USERS *DEBUG *PASSWORD *ZAP
```

Blank slots 2 and 5 have no matching spelling. They MUST NOT be promoted into
DOCUMENT or HONORROLL commands. A pregame token with no pregame match is checked
against main-game names: a match there produces the main-game-only diagnostic;
otherwise it produces the unknown-command diagnostic. Multiple pregame matches
produce the ambiguous-command diagnostic. Blank input redisplays the prompt.
The initial startup dialogue accepts HELP, PREGAME or empty input separately.

**Evidence:** [command DATA](../../legacy/utexas/DECWAR.FOR#L437),
[GETCMD](../../legacy/utexas/DECWAR.FOR#L1243),
[XGTCMD](../../legacy/utexas/SETUP.FOR#L402),
[PREGAM](../../legacy/utexas/SETUP.FOR#L76).

## GRAM-3 — Coordinate forms

### Accepted forms and result types

```text
numeric-locations = [kw(ABSOLUTE) | kw(RELATIVE)] {integer}
computed-locations = kw(COMPUTED) [integer] {target-name}
target-name = ship-name | kw(ROMULAN)

type LocationLimit = Exactly(positive integer) | AtMost(positive integer)

type LocationValues = {
    scalar: Optional<integer>
    positions: Sequence<Position>
}

type LocationError = ComputerUnavailable | WrongItemCount | TooManyItems
              | NonNameTarget | UnknownTarget | TargetAbsent
              | NonIntegerCoordinate | VerticalOutsideGalaxy
              | HorizontalOutsideGalaxy
type LocationResult = Empty | Resolved(LocationValues)
               | Rejected(LocationError)
type LocationReadOutcome = LocationResult | Cancelled

operation ResolveLocations(actor: ShipId, arguments: Sequence<Token>,
                           limit: LocationLimit)
    on GameState -> LocationResult

operation ReadLocations(actor: ShipId, limit: LocationLimit)
    on GameState -> LocationReadOutcome
```

The actor must have a captain and recorded position. Let s be that ship and c
its captain. LocationValues contains absolute positions and an optional leading
scalar, such as phaser strength or torpedo count. Its item count is twice the
number of positions, plus one when scalar is present. This type does not attach
strength or torpedo meaning to the scalar; the consuming command does that.
The productions describe category-correct forms. The ordered rules below also
define how other tokens fail and which diagnostic takes precedence.

ResolveLocations consumes the supplied arguments only. It does not request a
continuation. Zero resulting items returns Empty, even for Exactly(2); this is
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
rate := session(game, c.id).reporting.advertisedSpeed
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
| MOVE, IMPULSE, BUILD, CAPTURE | One target position; no scalar. | Exactly(2) |
| PHASERS | One position, with optional strength; a lone scalar is a wrong-count error. | AtMost(3) |
| TORPEDOS initial input and burst prompt | Burst count and up to three positions in the normal form. | AtMost(7) |
| TORPEDOS target continuation | Target positions without a count in the normal form. | AtMost(2*k) |

The command controls whether Empty prompts again, and whether a valid result
can name a friendly, absent, distant or own-sector target. Coordinate resolution
alone imposes no weapon range, energy, movement or faction restriction.
Its errors correspond respectively to the computer-damaged, wrong-number,
too-many-coordinates, nonalphabetic-name, unrecognized-name, player-not-in-game,
nonnumeric-coordinate, vertical-bound and horizontal-bound diagnostics. Errors
abort this resolution; commands specify subsequent input handling.

**Open:** Missing torpedo counts, incomplete pairs and zero-item replies at special continuation
sites can make a caller request values that are not present in LocationValues.
This draft does not manufacture values from another input or silently turn
these cases into ordinary syntax rejection. Those caller paths remain outside
the completed acceptance contract. Concurrent target disappearance during name
resolution also requires the multiplayer ordering contract.

**Source basis:** [LOCATE/RELOC](../../legacy/utexas/DECWAR.FOR#L1404),
[MOVE/IMPULS](../../legacy/utexas/DECWAR.FOR#L2141),
[PHACON](../../legacy/utexas/DECWAR.FOR#L2647),
[TORP](../../legacy/utexas/DECWAR.FOR#L4228).

## GRAM-4 — Movement, capture and construction

```
move = kw(MOVE) [locations-producing-two-items]
impulse = kw(IMPULSE) [locations-producing-two-items]
capture = kw(CAPTURE) [locations-producing-two-items]
build = kw(BUILD) [locations-producing-two-items]
```

Missing locations request a coordinates continuation. Empty continuation aborts;
a malformed continuation produces the location diagnostic. MOVE/IMPULSE to the
current sector request new coordinates after a diagnostic. Device checks occur
before movement coordinates are read. Valid grammar does not imply legal range,
a valid target or successful completion.

**Evidence:** [MOVE/IMPULS](../../legacy/utexas/DECWAR.FOR#L2141),
[CAPTUR](../../legacy/utexas/DECWAR.FOR#L600),
[BUILD](../../legacy/utexas/DECWAR.FOR#L523).

## GRAM-5 — Phasers and torpedoes

```
phasers = kw(PHASERS) [phaser-target]
phaser-target = [kw(ABSOLUTE) | kw(RELATIVE)] [integer] pair
              | kw(COMPUTED) [integer] target-name
torpedoes-normal-form = kw(TORPEDOS) [count-and-targets]
count-and-targets = [kw(ABSOLUTE) | kw(RELATIVE)] integer [pair [pair [pair]]]
                  | kw(COMPUTED) integer [target-name [target-name [target-name]]]
pair = integer integer
```

Phasers accept two location items with default strength 200 or a scalar strength
followed by a location pair. A lone scalar is an error. Strength validation
accepts 50 through 500 inclusive and occurs after waiting for the selected bank;
a grammar-only validator must not reorder that wait ahead of all other checks.

A torpedo burst normally supplies a count from 1 through 3 followed by up to
three targets, also bounded by ammunition. With only a count, a continuation
requests up to twice the count in coordinate items. Fewer target pairs reuse the
last supplied pair for later torpedoes. The source does not implement a uniformly
strict odd-item-count check on the original command line: malformed even counts
and empty target continuations need separate boundary analysis. The production
above describes normal forms, not the entire accepted/error language.

Extra supplied pairs beyond the burst count are checked by the location reader,
then ignored when selecting the burst's aims. Own-sector and ten-sector checks
visit those selected aims in order and stop on their first failure. The distinct
outcomes and state effects are defined by [FireTorpedoes](commands.md#torpedos).

**Evidence:** [PHACON](../../legacy/utexas/DECWAR.FOR#L2647),
[TORP](../../legacy/utexas/DECWAR.FOR#L4228). **Open:** malformed torpedo forms are
recorded in the coverage matrix; they must not be silently rejected by a new parser.

## GRAM-6 — Scans

```
scan = (kw(SCAN) | kw(SRSCAN)) [direction] [integer [integer]] [kw(WARNING)] end
direction = kw(UP) | kw(DOWN) | kw(RIGHT) | kw(LEFT) | kw(CORNER)
```

WARNING is recognized only as the last token and is removed before parsing the
remaining arguments. Direction occupies the first argument if present. CORNER
requires exactly two integers. Other forms accept zero, one or two integers;
remaining tokens or a noninteger range produce the syntax diagnostic. Direction
matching uses the source's successive checks in the displayed order.

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

**Evidence:** [SCAN/SRSCAN](../../legacy/utexas/DECWAR.FOR#L3527).

## GRAM-7 — Ship resources

```
shields = kw(SHIELDS) [kw(UP) | kw(DOWN) | kw(TRANSFER) [integer]]
energy = kw(ENERGY) [ship-name integer]
repair = kw(REPAIR) [integer | kw(ALL)] [kw(DAMAGE) {report-modifier}]
dock = kw(DOCK) [kw(STATUS) {report-modifier} | kw(ALL)]
tractor = kw(TRACTOR) [kw(OFF) | ship-name]
```

SHIELDS prompts for an unrecognized/missing switch. Empty switch continuation
returns; TRANSFER without an integer prompts for an amount, and a noninteger
amount continuation returns. Transfers that can exhaust engine energy request
YES confirmation. UP and DOWN do not enforce a trailing-token end check.

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

**Evidence:** [SHIELD](../../legacy/utexas/DECWAR.FOR#L3739),
[ENERGY](../../legacy/utexas/DECWAR.FOR#L1009),
[REPAIR](../../legacy/utexas/DECWAR.FOR#L3190),
[DOCK](../../legacy/utexas/DECWAR.FOR#L893),
[TRACTR](../../legacy/utexas/DECWAR.FOR#L4432).

## GRAM-8 — Preferences and radio

```
set = kw(SET) [setting]
setting = kw(NAME) name-input
        | kw(OUTPUT) (kw(SHORT) | kw(MEDIUM) | kw(LONG))
        | kw(TTYTYPE) terminal-name
        | kw(PROMPT) (kw(NORMAL) | kw(INFORMATIVE))
        | kw(SCANS) (kw(SHORT) | kw(LONG))
        | kw(ICDEF) (kw(ABSOLUTE) | kw(RELATIVE))
        | kw(OCDEF) (kw(ABSOLUTE) | kw(RELATIVE) | kw(BOTH))
        | privileged-setting
privileged-setting = kw(ROMOPT) | kw(ENDFLG) | kw(BHREMV)
radio = kw(RADIO) [kw(ON) | kw(OFF) | (kw(GAG) | kw(UNGAG)) ship-name]
```

SET checks switches in the production's order. Missing/unrecognized switches
prompt; blank continuation returns. Privileged switches are considered only
when privilege is enabled. Most missing values prompt, but an unrecognized
alphanumeric value for OUTPUT, PROMPT, SCANS, ICDEF or OCDEF returns without
changing that preference. TTYTYPE instead diagnoses unknown/ambiguous values
and prompts again. NAME follows the separate name-acquisition contract in
[SET](commands.md#set).

RADIO checks ON, OFF, then GAG/UNGAG. Invalid or missing switches prompt again;
blank continuation returns. GAG/UNGAG can prompt separately for a name and use
first matching ship in roster order. A self-directed gag/ungag returns unchanged.

**Evidence:** [SET](../../legacy/utexas/DECWAR.FOR#L3624),
[RADIO](../../legacy/utexas/DECWAR.FOR#L3129).

## GRAM-9 — Quit

Main-game QUIT discards pending command input and
requests confirmation unless a disconnect is already recorded. A YES prefix
confirms; any other response resumes command acquisition. Pregame QUIT exits
without that in-game confirmation path. Interrupts are separately scoped in
the execution model; QUIT syntax alone does not define their behavior.

**Evidence:** [main QUIT](../../legacy/utexas/DECWAR.FOR#L147),
[pregame dispatch](../../legacy/utexas/SETUP.FOR#L100).

## GRAM-10 — Reports and type information

```
status = kw(STATUS) {status-item}
status-item = kw(SHIELDS) | kw(LOCATION) | kw(CONDITION) | kw(TORPEDO)
            | kw(ENERGY) | kw(DAMAGE) | kw(RADIO)
damages = kw(DAMAGES) {device-token}
points = kw(POINTS) {points-item}
points-item = kw(ME) | kw(I) | kw(FEDERATION) | kw(HUMANS) | kw(EMPIRE)
            | kw(KLINGONS) | kw(ROMULANS) | kw(ALL)
type = kw(TYPE) [kw(OUTPUT) | kw(OPTION)]
users = kw(USERS)
time = kw(TIME)
```

STATUS without arguments prints stardate, then CONDITION, LOCATION, TORPEDO,
ENERGY, DAMAGE, SHIELDS and RADIO. Otherwise it processes alphanumeric tokens
in order, stopping at the first nonalphanumeric. An unknown item emits a syntax
diagnostic but processing continues with later items. Item matching is checked
in the order shown in the production, not by a global unique-match test.

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

**Evidence:** [STATUS](../../legacy/utexas/DECWAR.FOR#L3860),
[DAMAGE](../../legacy/utexas/DECWAR.FOR#L783),
[POINTS](../../legacy/utexas/DECWAR.FOR#L2893),
[TYPE/USERS](../../legacy/utexas/DECWAR.FOR#L4540),
[TIME](../../legacy/utexas/DECWAR.FOR#L4066).

## GRAM-11 — LIST-family grouping

```
list-family = (kw(LIST) | kw(SUMMARY) | kw(BASES) | kw(PLANETS) | kw(TARGETS))
              [group] {group-end group}
group-end = kw(AND) | kw(&)
```

Each group is an ordered series of selectors. AND and `&` terminate a group
before other keyword matching; thus a token such as A that matches AND is not
a generic abbreviation for ALL in this context. A lone command or an empty
first group uses defaults. An empty later group, including after a trailing
separator, is an error. Groups accumulate selections for final output;
a coordinate or explicitly named object may be reported immediately.

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

**Evidence:** [LIST entries](../../legacy/utexas/DECWAR.FOR#L1359),
[LSTSCN](../../legacy/utexas/DECWAR.FOR#L1519).

## GRAM-12 — TELL and text-reading utilities

```
tell = kw(TELL) [recipient {recipient}] [semicolon message-body]
recipient = ship-name | group-name | kw(ROMULAN)
help = kw(HELP) {topic | kw(*)}
news = kw(NEWS)
gripe = kw(GRIPE)
```

TELL requests recipients when absent, with empty continuation cancelling. Ship
names take precedence over group names; groups use ambiguity detection. Austin
skips ROMULAN recipient tokens. For other recipients a repeated line is rejected.
After recipient filtering, if anyone remains, the message body is read from the
original acquired line after its first semicolon. Without a semicolon, `Msg: `
requests a separately acquired line. The body retains original characters rather
than the command token spelling; spaces and punctuation are message data. A
control cancellation in that read sends no message.

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

**Evidence:** [TELL](../../legacy/utexas/DECWAR.FOR#L3977),
[MAKMSG](../../legacy/utexas/WARMAC.MAC#L2961),
[HELP](../../legacy/utexas/WARMAC.MAC#L4134),
[NEWS/GRIPE](../../legacy/utexas/WARMAC.MAC#L3811).

## GRAM-13 — Starred commands

```
password = kw(*PASSWORD) [password-token]
debug = kw(*DEBUG)
zap = kw(*ZAP)                  ; pregame only
```

Austin *PASSWORD sets privilege only for an exact five-character comparison
with `*MINK`; a prefix-only or failed match clears privilege. It does not prompt
or emit the removed CompuServe project-rejection message. The password token
is intentionally specified because it is a rule in the supplied source, not a
modern authentication recommendation.

*DEBUG emits the unknown-command/help fragments without privilege; with privilege
it prints the collected timer report. Instrumented diagnostic entries and empty
timer records require host-profile definitions; no hidden gameplay ability is
implied. Pregame *ZAP silently does nothing without privilege. With privilege
it attempts administrative recording and clears the statistics archives as
defined by [ZapStatistics](session-rules.md#administrative-statistics).
It ignores trailing tokens and must not be treated as an ordinary in-game command.

**Evidence:** [PASWRD](../../legacy/utexas/DECWAR.FOR#L2626),
[DEBUG](../../legacy/utexas/WARMAC.MAC#L3633),
[pregame *ZAP](../../legacy/utexas/SETUP.FOR#L134).
