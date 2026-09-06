# CompuServe variant

This appendix describes amendments to the Austin language using the same game
types and command vocabulary. Its conversion from the source analysis is in
progress; unlisted differences are not assumed absent.

## Population and names

Amends the [galaxy and roster](language-model.md#galaxy-and-roster), admission
and faction-based groups.

CompuServe allows ten captains, five per faction, and begins with sixty planets.
The galaxy is still 75 by 75 sectors, with ten initial bases per faction.

| Federation ship | Empire ship |
| --- | --- |
| Lexington | Cobra |
| Nimitz | Demon |
| Savannah | Hawk |
| Vulcan | Jackal |
| Yorktown | Wolf |

When a partial name matches more than one ship, name resolution uses the order
shown within its faction, with Federation names preceding Empire names. Ordinary
radio faction groups contain the five ships of their faction. Iteration over
the roster uses this same order; the USERS faction separator precedes Cobra.
Autonomous Romulan speech audiences remain part of the communication amendment.

**Source basis:** [population](../../legacy/compuserve/fortran%201978/PARAM.FOR#L25),
[roster names](../../legacy/compuserve/fortran%201978/BLKDAT.FOR#L84),
[USERS roster order](../../legacy/compuserve/fortran%201978/USERS.FOR#L42).

## Direct command responses and movement refusal

The ordinary [terminal response recipes](presentation.md#shield-command-responses)
for SHIELDS, RADIO, ENERGY, DOCK, REPAIR, TRACTOR, BUILD, CAPTURE, PHASERS and
TORPEDOS also apply to CompuServe. Use this variant's roster, preferences,
coordination and notice-delivery rules when evaluating their conditions and
formatting selected entities. Shared wording does not imply identical admission,
waiting or delivery behavior. The movement response strings also remain the same,
subject to the additional early return below.

The [SET prompt and response sequence](presentation.md#configuration-command-responses)
also applies: preference assignment is silent, and terminal-type retries retain
the unknown-versus-ambiguous distinction and supported-name display. CompuServe
input waiting and world termination still use their variant contracts.

**SET source basis:** [command selection and prompts](../../legacy/compuserve/fortran%201978/SET.FOR#L27),
[terminal-type retry](../../legacy/compuserve/fortran%201978/SET.FOR#L78).

For player [TELL responses](presentation.md#tell-command-responses), the nine
recipient fragments and ordinary recipient/body prompts remain the same.
CompuServe's body refusal emits `"No message sent\r\n"` during body handling. Austin's corresponding text has no appended ending there. Both
player TELL paths subsequently request a conditional blank line when the body/publication path
returns; this later request is not a second unconditional ending. Preserve that
output boundary when assessing interruptions or intervening observations.
The [direct Romulan reply amendment](#direct-romulan-replies) still controls
RomulanUnavailable and suppression of NoRecipients after a reply attempt;
autonomous speech retains its own diagnostic suppression.

**TELL source basis:** [player output](../../legacy/compuserve/fortran%201978/TELL.FOR#L39),
[body refusal](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L3589),
[line-ending definition](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L51).


CompuServe also appends one CRLF to the [token-overflow diagnostic](lexical.md#lex-7--capacity-and-recovery)
and to each of [GRIPE's input prompt and line-limit notices](commands.md#input-and-observations).
Their wording is unchanged: `Too many words -- line ignored`,
`Enter gripe, end with ^Z`, `[Only 2 more message lines allowed]`, and
`[Too many lines -- end of gripe]`. Austin appends no ending to those texts.
This amendment concerns terminal output, not line endings in stored feedback.

**Source basis:** [token overflow](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L1715),
[feedback prompt and limits](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L4733).


For [HELP command lists and topic diagnostics](presentation.md#help-command-lists-and-topic-diagnostics),
CompuServe emits `"Commands are:\r\n"` before the following conditional
blank-line request. In a displayed ambiguity list, it emits `"  Could be:\r\n"`
before the first matching name, placing the names on the next line. Austin
appends no ending within either string. Matching order and visibility remain
subject to this variant's command and help-topic declarations.

**Source basis:** [command heading](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5100),
[ambiguity list](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5232).

For [HELP section failures](presentation.md#help-section-failures), CompuServe's
unavailable-standard-resource warning is `"%Can't read help file\r\n"`.
The core warning has no appended ending. Privileged-resource fallback and the
missing-section diagnostic retain the core sequence.

**Source basis:** [section opening](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5128),
[warning macro](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L62).

For [NEWS output and failure](presentation.md#news-output-and-failure),
CompuServe appends CRLF to `"%Can't read DECWAR.NWS"`. Its content, continuation
prompt and ordinary viewing-exit output follow the core sequence.

**Source basis:** [NEWS](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L4658),
[warning expansion](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L59).

Amending [movement relocation](commands.md#traversal-resource-cost-and-relocation),
CompuServe Move can additionally return RelocationRefused. This is a semantic
outcome, not command syntax or a new terminal message. When a required relocation
coordination request fails, stop without changing the actor's sector or moving
its tractor partner. Preserve the energy charge, departure effects and any
overheating damage already applied. Move adds no direct response after the failed request and performs no movement
turn completion or automatic repair. Any output from coordination itself remains
subject to that service's rules. In particular, the
later collision-averted report is not reached on this path.

The destination resource is requested first. If a distinct source resource is
also required and that second request fails, release the destination resource
before returning RelocationRefused. A failed request is not retried by Move.
The [coordination amendment](#coordination-amendments) governs entry and release;
it does not define a new probability of refusal. No relocation request is made
when the traced last-clear position equals the actor's current position.

**OPEN QUESTION:** The abstract grouping of movement resources remains unresolved.
These failure effects apply when the required request fails; they do not imply
independent per-sector coordination or establish which simultaneous moves conflict.
Interrupted requests and state changes by other actors retain the corresponding
multiplayer limits.

**Source basis:** [CompuServe movement](../../legacy/compuserve/fortran%201978/MOVE.FOR#L120),
[shared command strings](../../legacy/compuserve/fortran%201978/MSG.MAC#L12),
[ordinary shield responses](../../legacy/compuserve/fortran%201978/SHIELD.FOR#L21),
[ordinary phaser responses](../../legacy/compuserve/fortran%201978/PHACON.FOR#L24).

## Initial preferences

Amends [startup and pregame](session-rules.md#startup-and-pregame) and the
initial Captain preferences. The initial dialogue offers BEGINNER, INTERMEDIATE
and EXPERT, also selected by numeric values 1, 2 and 3 respectively. These choices
are presentation preferences, not difficulty levels that alter combat or resources.

```text
CompuServeExperienceReply ::= EmptyInput | TokenInput {TokenInput}

enum ExperienceChoice = BEGINNER | INTERMEDIATE | EXPERT

operation SelectCompuServeExperience(viewer: CaptainId,
    candidate: Optional<Token>): Selected { choice: ExperienceChoice } | Unchanged
```

Let c be captain(game, viewer). Before this question, its initial preferences
are long scans, medium output, normal prompt, BOTH input coordinates, BOTH output
coordinates and no selected terminal profile. BOTH input uses the relative
interpretation in the shared location reader. This initial value does not add
BOTH to the values accepted by SET ICDEF.

Process only the first reply token. Check BEGINNER, INTERMEDIATE and EXPERT in
that order. A choice matches when the token's numeric value equals the associated
number or its retained text matches the associated word under ordinary keyword
matching. Absence or no match gives Unchanged and continues without reprompting.
For a match, give Selected and make exactly these preference assignments:

| Choice | Captain state effects |
| --- | --- |
| BEGINNER | c.scanStyle = LONG; c.outputLength = MEDIUM; c.promptStyle = NORMAL; c.inputCoordinates = ABSOLUTE. |
| INTERMEDIATE | c.scanStyle = LONG; c.outputLength = MEDIUM; c.promptStyle = INFORMATIVE; c.inputCoordinates = RELATIVE. |
| EXPERT | c.scanStyle = SHORT; c.outputLength = SHORT; c.promptStyle = INFORMATIVE; c.inputCoordinates = RELATIVE. |

Neither selection nor an unmatched reply changes output coordinates or selects
a terminal profile. Other state is unchanged. This operation has no turn,
resource charge or ship placement effect.

Display the version and experience question before reading the reply. After
selection, request the TYPE OUTPUT, TYPE OPTION and SUMMARY observations in
that order, then enter the startup dialogue. Selection does not itself enter
ACTIVE play. After later ship placement, begin ordinary command acquisition;
the Austin initialization-command sequence is not a CompuServe startup step.

**OPEN QUESTION:** The presentation of an initially unselected terminal profile,
and report fields before a galaxy exists, require the corresponding environment
and presentation rules. No profile name or invented initial galaxy is supplied
by this amendment.

**Source basis:** [initial dialogue and main entry](../../legacy/compuserve/fortran%201978/DECWAR.FOR#L30),
[preference domains](../../legacy/compuserve/fortran%201978/PARAM.FOR#L153),
[TYPE observations](../../legacy/compuserve/fortran%201978/TYPE.FOR#L34).

## Additional startup and pregame commands

Amends [command selection](grammar.md#gram-2--command-selection) and the startup
dialogue. CompuServe adds DOCUMENT and HONORROLL to pregame. Its full pregame
matching order is:

```text
ACTIVATE DOCUMENT GRIPE HELP HONORROLL NEWS POINTS QUIT SET SUMMARY
TIME TYPE USERS *DEBUG *PASSWORD *ZAP
```

Pregame command selection still requires a unique match over that list. Thus H
is ambiguous between HELP and HONORROLL, while HO selects HONORROLL. These two
additions do not become main-game commands.

```text
CompuServeStartupReply ::= EmptyInput | "HONORROLL" | "HELP" | "PREGAME"
DocumentCommand ::= "DOCUMENT"
HonorRollCommand ::= "HONORROLL"
```

The startup dialogue uses ordered tests instead of pregame command-table
ambiguity detection: empty input starts admission; otherwise test HONORROLL,
HELP and PREGAME in that order. HONORROLL requests the mission standings and
repeats the startup prompt. HELP displays the general help and command list,
then repeats the prompt. PREGAME enters pregame command acquisition. An
unrecognized reply repeats the startup prompt. Consequently H at the startup
question selects HONORROLL, even though H at the pregame command prompt is
ambiguous. HO and HELP have their ordinary distinct effects in both contexts.

### DOCUMENT

```text
operation ShowCompuServeDocumentNotice(viewer: CaptainId): Completed
```

Require the viewer's session phase to be PREGAME. Emit the documentation notice
and return to pregame command acquisition. Ignore trailing arguments. No game
state changes, resource charge, turn, purchase or external document launch occurs.
The pregame introduction's wording about purchasing documentation does not add
such an effect to this operation.

The notice begins with `This is where CompuServe rips you off for` and ends with
`Documentation!`, followed by an unconditional line ending.

**OPEN QUESTION:** Exact whitespace joining those two notice fragments remains
part of the terminal presentation review. The semantic operation and its absence
of a purchase or launch effect do not depend on that whitespace.

### HONORROLL

HONORROLL requests the stored mission standings, independently of the current
galaxy's POINTS report. It is available directly from startup and as a pregame
command; either caller returns to its own prompt after the report. Trailing
arguments are not standings selectors. It has no player-turn or resource effect.
The following clauses define standings selection, records, ranking and update
effects, with remaining presentation and environment limits identified. Austin
does not implicitly acquire this standings service.


The environment identifies which service class the session is using. This is
an existing service distinction, not a fee, purchase or authorization action
performed by HONORROLL.

```text
enum CompuServeServiceClass = PAYING | NON_PAYING
```

Each class has a distinct standings source. For a PAYING session, attempt only
the PAYING source. For a NON_PAYING session's explicit HONORROLL request, attempt
the NON_PAYING source first, then the PAYING source under the conditions below.
Neither source is the current galaxy's score table.

For each attempted source:

1. Attempt to open it for reading. If opening fails, return to the caller
   without an Honor Roll heading or an invented missing-file diagnostic. Do not
   proceed to the other source on this path.
2. Read and close the source. If all four record groups are empty, omit its
   heading and faction sections. The groups are Federation primary records,
   Federation memorial records, Empire primary records and Empire memorial
   records; their membership and ordering are defined below.
3. Otherwise display the Honor Roll heading and its applicable faction
   sections. A NON_PAYING source adds the notice
   `"(**** non-paying users ****)"`. An empty source does not display that notice.
4. At the source-completion boundary, a pending interrupt is consumed and
   returns to the caller; no second source is attempted. Without that interrupt,
   an explicit HONORROLL request in a NON_PAYING session proceeds from the
   NON_PAYING source to the PAYING source, even if the first source was empty.
   Return after the PAYING source.

This selection policy does not merge the two sources or interleave their rows.
An empty first source and a first source that cannot be opened have different
continuation effects. It makes no new game turn, resource charge or score
update. Other callers that request a standings display, such as feedback
recording, do not inherit the explicit HONORROLL request's second-source rule.
Their caller-specific behavior remains part of the corresponding amendment.

**Source basis:** [standings source selection and continuation](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5885).

The following clauses define standings records, placement, ordinary storage
attempts and report presentation. Together with this command's source-selection
rule, they describe the ordinary Honor Roll operation.

**OPEN QUESTION:** Malformed records, persistence failures, empty-primary-list
faction ordering and asynchronous control transfer still limit a complete
HONORROLL conformance claim.

**Source basis:** [startup and pregame dispatch](../../legacy/compuserve/fortran%201978/SETUP.FOR#L126),
[DOCUMENT and HONORROLL actions](../../legacy/compuserve/fortran%201978/SETUP.FOR#L162),
[pregame name table](../../legacy/compuserve/fortran%201978/SETUP.FOR#L505),
[standings reader](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5885).


### Standings records and placement

```text
type RecordedDate

type CompuServeStanding = {
    account: AccountIdentity;
    captainName: Text;
    shipName: Text;
    recordedDate: RecordedDate;
    score: Points;
    elapsed: Duration;
    missionNumber: nonnegative integer;
    markedMissing: Boolean;
};

type StandingsPlacement = BelowCut | EarlierAccountRecord
    | InsertAt { position: positive integer };

query FindStandingsPlacement(records: List<CompuServeStanding>,
                            candidate: CompuServeStanding): StandingsPlacement
```

A standings list contains at most ten records, in displayed rank order. This
query concerns a valid list without vacant entries between records. Account
identity is distinct from the displayed captain and ship names. RecordedDate
is a date value supplied by the environment; its calendar and conversion binding
remain to be specified. elapsed is commission elapsed time, not ship turns or
CPU execution time. The current display names are preserved as record values;
a later rename does not rewrite an existing record.

FindStandingsPlacement scans from position one. Select the first position whose
existing record has a lower score than candidate.score, or has the same score
and a shorter elapsed time than candidate.elapsed. If none qualifies and fewer
than ten records exist, select the position after the last record. If neither
condition holds, return BelowCut.

Before accepting a selected position, examine only the records above it. If any
has the candidate's account identity, return EarlierAccountRecord. Otherwise
return InsertAt with that one-based position. Equal score and equal elapsed
time do not place the candidate before the existing entry. This rule does not
prefer shorter missions or compare captain names to identify accounts.

When the standings update accepts InsertAt, insert the candidate at that
position, shift the following records down one rank and retain only the first
ten. Do not remove a matching account below the insertion point as part of this
step. The source's earlier-account check is not a general one-record-per-account
invariant. The placement query itself changes neither the list nor the game.

The update path considers only commissions with at least 1000 milliseconds of
recorded elapsed time. A shorter elapsed time returns before standings access,
placement, or the destruction-count update. This is not a minimum-score test.
The record's score comes from the final committed POINTS total supplied by its
caller. A qualifying update chooses its faction's primary list even when
markedMissing is true; the supplied update path does not route that entry into
the memorial list. Memorial records can still be read and displayed.


The fatal-hull and out-of-energy paths at main-command acquisition submit
markedMissing = true. At world termination with an acting ship, compare the two
base counts: Federation is the standings winner when its count is at least
Empire's; otherwise Empire is the standings winner. Submit markedMissing = true
for the other faction. If no planets and no bases of either faction remain,
submit true for both factions instead. This chooses a standings marker; it does
not add a new victory announcement, destroy the ship, or award score. A viewer
without an acting ship submits no standings record on this world-end path.

The common departure path used by confirmed QUIT submits markedMissing = false
unless an environment failure is being handled. QUIT after a detected hangup
uses that same departure path without asking for confirmation. An intercepted
fatal environment failure submits true. Such a failure is an environment event,
not an additional random hazard or a new player command; its fictional fatal
report does not establish another combat rule.

Death detected immediately after IMPULSE or MOVE also uses the common departure
path. In the absence of an environment failure it therefore submits false,
even though the ship is no longer alive. This differs from the fatal checks at
main-command acquisition. Preserve the caller's marker selection; do not infer
markedMissing from hull damage, energy, or a general notion of death.

These callers observe elapsed time before the final POINTS report, then use
that report's committed ship total for the submitted score. The standings
update precedes commission release. Reporting or update failures can therefore
prevent the caller from reaching release; no rollback or guaranteed cleanup is
implied by the ordinary successful sequence.

**Source basis:** [fatal acquisition reporting](../../legacy/compuserve/fortran%201978/GETCMD.FOR#L105),
[world-end record status and ordering](../../legacy/compuserve/fortran%201978/ENDGAM.FOR#L54),
[QUIT and immediate movement-death departures](../../legacy/compuserve/fortran%201978/DECWAR.FOR#L132),
[common departure record](../../legacy/compuserve/fortran%201978/DECWAR.FOR#L333),
[fatal environment event](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L6106).

**OPEN QUESTION:** The calendar binding that supplies date parts, concurrent
failure behavior and malformed preexisting records still require review.
Ordinary row values and spacing are defined below. The placement rule does not
promise a durable write or reclassify a losing commission as a destroyed
physical ship.

**Source basis:** [record update and ranking](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5694),
[record fields](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5833),
[ten-entry limit](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L231),
[elapsed-time caller](../../legacy/compuserve/fortran%201978/GETCMD.FOR#L114).


### Honor Roll group observations

```text
enum StandingsGroupKind = PRIMARY | MEMORIAL

type CompuServeStandings = {
    primary: Map<Team, List<CompuServeStanding>>;
    memorial: Map<Team, List<CompuServeStanding>>;
};

type StandingsGroup = {
    team: Team;
    kind: StandingsGroupKind;
    records: List<CompuServeStanding>;
};

query OrderStandingsGroups(value: CompuServeStandings): List<StandingsGroup>
    requires both primary lists are nonempty
```

Each of the four lists contains at most ten records. PRIMARY and MEMORIAL name
report groups, not a test of whether a captain currently has a ship. In
particular markedMissing records can appear in PRIMARY under the update rule.
Records in one group retain their source order; display does not sort them
again or merge records from different groups.

Within the query's domain, compare the first primary record's score for each
faction. Federation comes first when its score is at least Empire's, including
a tie; otherwise Empire comes first. For the first faction emit its nonempty
PRIMARY group and then its nonempty MEMORIAL group. Then do the same for the
other faction. Omit empty groups. Neither elapsed time nor a memorial score
changes this faction ordering. The query reads only the supplied standings
value and changes no game or stored record.

Each nonempty group has its own introductory text: Federation PRIMARY describes
the Emerald Star Cluster, Federation MEMORIAL the Golden Galaxy Medal, Empire
PRIMARY service to the Empire, and Empire MEMORIAL the Distinguished Service
Cross. These are Honor Roll headings, not newly awarded game-state resources.
A missing group contributes no introduction or row heading. The overall Honor
Roll heading is governed by the earlier source-selection rule.

For example, Federation primary score 100 and Empire primary score 90 place
Federation's primary and memorial groups first even if Empire's memorial group
contains a score of 1000. If the primary scores tie, Federation still comes
first. Within either group, a markedMissing record retains its rank.

**OPEN QUESTION:** When either primary list is empty but memorial records remain,
the complete faction-order rule is not established by this abstract value.
The source compares the leading primary score fields without an empty-group
substitute. This draft does not invent zero for an absent record or use a
memorial score instead. Pending-interrupt observation points and heading literals are defined below.
Asynchronous control transfer, damaged source records and calendar binding
remain environment review items.

**Source basis:** [faction comparison and group display](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5922).

### Honor Roll headings and interruption boundaries

These rules describe an explicit HONORROLL request whose output is delivered
normally. Literal strings use `\r\n` for one unconditional carriage-return and
line-feed pair. The strings are concatenated as written; do not replace their
leading blank lines with conditional blank-line requests.

For a nonempty source, the overall heading is:

```text
"\r\n\r\n\r\n--------------\r\n\r\n"
"The DECWAR Honor Roll\r\n\r\n"
"(* indicates Missing in Action)\r\n\r\n"
```

Immediately after it, a NON_PAYING source adds:

```text
"(**** non-paying users ****)\r\n\r\n"
```

The introductions for nonempty groups, in the previously specified order, are:

```text
Federation PRIMARY:
"\r\nThe Federation has awarded the\r\n"
"following Captains the Emerald\r\n"
"Star Cluster for outstanding\r\nservice:\r\n\r\n"

Federation MEMORIAL:
"\r\n\r\nThe Golden Galaxy Medal has been\r\n"
"awarded in memory of these brave\r\nCaptains:\r\n\r\n"

Empire PRIMARY:
"\r\n\r\nThe following Captains have served\r\n"
"their Empire well:\r\n\r\n"

Empire MEMORIAL:
"\r\n\r\nThe Distinguished Service Cross\r\n"
"has been posthumously awarded\r\n"
"to the following Captains for\r\n"
"their outstanding service:\r\n\r\n"
```

After each group introduction, check for a pending interrupt. If one is pending,
omit that group's column heading and records. Otherwise emit the column heading:

```text
"\r\nCaptain        Service # Credits Ship        Runtm Date"
```

Then request a conditional line ending and emit the group's records in order,
requesting a conditional line ending after each row. The explicit HONORROLL
heading includes Ship, Runtm and Date even when the report's terminal-width
binding is less than 80 columns and its rows omit those three fields. At 80
columns or more the rows include them. Do not infer a changed width from a
screenshot or silently remove heading labels to align a narrow report. The
terminal binding supplies the width; this rule does not add a WIDTH command.
Row values and spacing are defined next.

The group row traversal has no additional pending-interrupt check between
records. An interrupt that becomes pending during the rows does not by itself
request an immediate stop there. After a PRIMARY group's traversal, check again:
a pending interrupt omits that faction's MEMORIAL group. This return does not
skip the other faction's processing. A nonempty group introduction in the other
faction can consequently be emitted before its pending-interrupt check omits
the column heading and rows. If that faction's PRIMARY list is empty, its
MEMORIAL introduction can be reached directly. At the source-completion boundary,
consume the pending interrupt and return as specified above, without attempting
a second statistics source.

These are report-level observation points, not a guarantee that every output
request survives a disconnect or an interrupt that transfers control out of
the report. No per-row cancellation, new prompt, rollback of printed text or
whole-report atomicity is implied.

**Source basis:** [overall heading](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5901),
[group introductions and return checks](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5944),
[column heading and row traversal](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L6002),
[width selection](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L6045),
[conditional line ending](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L2053).

### Honor Roll row values and spacing

```text
type StandingDateParts = {
    day: integer in 1..31;
    month: integer in 1..12;
    year: nonnegative integer;
};

query standingDateParts(date: RecordedDate): StandingDateParts
query FormatHonorRollRow(record: CompuServeStanding,
                        columns: positive integer): Text
    requires record has a printable captain name of at most twelve characters
    requires UserAccountLabel(record.account) has one to six digits per component
```

standingDateParts belongs to the environment's calendar binding. It describes
the calendar date represented by recordedDate, not the date of the current
report. The binding must identify its calendar and date acquisition; no time
zone is inferred from an account identity. The parts query does not turn a date
into elapsed game time or alter a record's rank.

FormatHonorRollRow returns the following concatenation. It emits no line ending
and changes no game state, record or presentation preference. Reuse the
[account-label binding](presentation.md#users-reports) and FormatNumber
from the presentation chapter.

1. One `*` when record.markedMissing == true, otherwise one space.
2. record.captainName, padded on the right to twelve characters, then one space.
3. The account's project label padded on the left to six characters, a hyphen,
   and its member label. If the member label has d digits, append
   max(5 - d, 1) spaces. These are octal-digit display labels, not a change to
   account identity. There is at least one space after a six-digit member label.
4. The Credits value: record.score divided by 100 points, rounded to the nearest
   integer, with an exact halfway value choosing the greater integer. Format
   that integer with zero fractional digits, NEGATIVE_ONLY and Exactly { count: 6 }.

When columns is less than 80, end the row here. Otherwise append:

5. One space. Take the prefix of record.shipName before its first space, limited
   to ten characters, and pad that prefix on the right to at least nine
   characters. Thus a ten-character prefix occupies ten columns; every shorter
   prefix occupies nine. Do not insert another separator before the next field.
6. record.elapsed expressed in minutes, rounded to the nearest integer with
   exact half-minutes choosing the greater integer. Format it with zero
   fractional digits, NEGATIVE_ONLY and Exactly { count: 5 }.
7. Four spaces, then the recorded date as `DD/MM/YY`. DD and MM are the day and
   month with two decimal digits, including a leading zero when needed. YY is
   the last two decimal digits of year, also including a leading zero.

Credits is a rounded display of the existing score. It is not a separate
currency, balance or score update, and ranking continues to compare the recorded
score and elapsed time. Runtm is the rounded elapsed commission duration, not
processor time. Neither a rank number nor missionNumber is added to the row.

For example, scores 149 and 150 points display Credits 1 and 2 respectively;
90 seconds displays Runtm 2. A score of -150 points displays Credits -1 under
the specified halfway rule. The signed rounding rule uses ordinary arithmetic;
its normalization is recorded separately from historical numeric behavior.
The date format likewise denotes calendar components without requiring any
particular epoch or packed date representation. Its calendar binding remains
an explicit environment dependency.

**Source basis:** [row fields and width](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L6020),
[ship prefix and padding](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L2145),
[fixed captain-name output](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L2213),
[numeric field formatting](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L2286),
[date components](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L6077).

### Commission numbering

```text
type CompuServeStatistics = {
    gameNumber: nonnegative integer;
    missions: Map<ShipId, nonnegative integer>;
    reportedLosses: Map<ShipId, nonnegative integer>;
    standings: CompuServeStandings;
};

type CommissionNumbers = {
    gameNumber: nonnegative integer;
    missionNumber: nonnegative integer;
};

query compuServeGameNumber(game: GameState): nonnegative integer

operation RecordCommission(ship: ShipId,
                           service: CompuServeServiceClass): CommissionNumbers
```

The missions and reportedLosses mappings are restricted to the ten identities
in the CompuServe roster. A valid CompuServeStatistics value contains one counter
of each kind for every such identity, including ships with no current commission.
They do not contain counters for Austin-only ships, the Romulan or captains.
Empty statistics means zero gameNumber, zero for every counter, and empty
standings lists; it does not mean absent mapping entries. RecordCommission
requires a ship identity in this roster. These domain requirements do not define
recovery from an incomplete or damaged persistent record.

compuServeGameNumber is the current galaxy's shared game number. It is distinct
from gameNumber in either stored CompuServeStatistics value. RecordCommission
is an admission action, not a player command. The admission caller invokes it
after releasing admission coordination and before clearing the selected ship's
score and marking the ship reserved. The operation does not itself reserve the
ship or establish that later admission will finish.

The following contract covers ordinary completion with valid statistics and
returning access operations. Attempt statistics access and retry failed entry,
as for the departure update. Then:

1. Begin with empty PAYING statistics and attempt to read that source. If the
   opening fails, retain the empty value and continue. Otherwise read the
   available contents and close the source.
2. If the galaxy's current shared game number is zero, increase the selected
   PAYING statistics' gameNumber by one. Otherwise retain that stored number.
   In either case, assign the resulting stored number to the galaxy's shared
   game number. A previously nonzero galaxy number is therefore not a promise
   that it will remain unchanged by this operation.
3. For PAYING, use those statistics for the remaining steps. For NON_PAYING,
   first submit those PAYING statistics to the PAYING destination. Then begin
   with empty NON_PAYING statistics, read the NON_PAYING source and close it,
   and replace its gameNumber with the galaxy's just-assigned shared number.
4. Increase missions[ship] by one in the selected service's statistics. Retain
   every other mission counter, all reported-loss counters and all record lists.
5. Attempt to write the selected statistics to that service's destination.
   Failure to open this final destination skips the write and continues to
   release. Otherwise submit the statistics and close the destination. Release
   statistics access, report the game and mission numbers with the ship's
   display name, and return those numbers.

The NON_PAYING intermediate PAYING write and subsequent NON_PAYING read in
step 3 do not have the final destination's skip-on-opening-failure behavior.
Their failure continuations depend on the environment and are not defined by
this ordinary-completion contract. Do not assume that such a failure simply
leaves empty NON_PAYING statistics and continues with a successful admission.
Partial contents, interrupted access and non-returning output failures remain
outside this contract as well.

missions[ship] is a count of increments at this admission stage, not a count of
completed games or a guarantee of an active captain. The game and mission
announcements can follow failure to open the final write destination. The
returned numbers describe the operation's computed values; they do not certify
persistence. There is no elapsed-time threshold here: the departure update's
1000-millisecond test does not undo or suppress this earlier mission increment.

For a NON_PAYING admission, successful completion can write both statistics
sources. Only the NON_PAYING mission count is increased. For a PAYING admission,
only PAYING is selected for the final write. Neither case creates a new Honor
Roll record merely by incrementing a mission counter.

**Source basis:** [shared game number](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L457),
[admission ordering](../../legacy/compuserve/fortran%201978/SETUP.FOR#L444),
[numbering, access and reports](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5589).

### Preparing a standings update

```text
type StandingUpdate = {
    statistics: CompuServeStatistics;
    placement: StandingsPlacement;
    writeRequired: Boolean;
};

query PrepareStandingUpdate(before: CompuServeStatistics,
                           ship: ShipId, team: Team,
                           candidate: CompuServeStanding): StandingUpdate
    requires candidate.elapsed >= 1000 milliseconds
    requires before contains counters for ship and valid lists for team
```

This query describes the value to be submitted for storage; it does not itself
read, write, display, advance the game, or release a commission. Its result is
computed as follows:

1. Start with the supplied statistics. If candidate.markedMissing == true,
   increase reportedLosses[ship] by one. Otherwise retain that counter.
2. Compute placement with FindStandingsPlacement on the team's primary list.
3. For InsertAt, use a record with candidate's values except that missionNumber
   is before.missions[ship]. Insert it at the selected position, retaining at
   most ten records as specified above. Set writeRequired = true.
4. For BelowCut or EarlierAccountRecord, retain all record lists and set
   writeRequired = candidate.markedMissing.
5. Return the resulting statistics, placement and writeRequired. The game
   number, mission counters, other ships' loss counters and all other lists
   retain their supplied values.

reportedLosses counts qualifying missing-marked submissions. It is not a count
of physical destruction events: the departure rules can mark a losing but
living ship, or leave an immediate movement death unmarked. The display calls
this count the number of times the named ship has been destroyed. When an
increment makes the count greater than one, its historical comparison reports
the count **before** this submission and the current mission count. The first
increment omits that comparison. This notification precedes placement.

A rejected placement can therefore still require a statistics write. A newly
inserted record takes its mission number from the statistics read for the
update, not from a separately remembered admission value. Its recordedDate is
supplied by the environment when insertion is reached. Providing that date as
a value to the query does not require observing it on rejected placements.

### Standings access and write attempts

The departure update first applies the elapsed-time threshold. A qualifying
submission attempts exclusive statistics access, retrying unsuccessful entry.
No finite retry limit, turn charge or guaranteed acquisition time is specified.
The following sequence applies after entry when source operations return
normally; interruption and non-returning failures need an environment binding.

Start from empty record lists and zero counters, and attempt to open the PAYING
statistics source for reading. If this opening fails, proceed with the empty
statistics; do not attempt a NON_PAYING read on that branch. If opening succeeds,
read the available contents and close it. For a NON_PAYING session, then replace
the selected statistics with empty statistics and attempt the NON_PAYING read;
a failed opening leaves that selection empty. For a PAYING session, retain the
PAYING selection. A source that opens but supplies no contents leaves the
initial empty values. Partial or malformed contents are outside this rule's
valid-statistics domain.

Apply PrepareStandingUpdate to the selected statistics. When writeRequired is
false, release statistics access and return without opening a destination.
When true, attempt to open the session's own service-class destination for
writing. If that opening fails, release access and return; the caller is not
given a successful-save guarantee. Otherwise submit the resulting statistics,
close the destination, release access and return. Do not retry the destination
opening or roll back already emitted placement notifications on these normal
return paths. Completion of output and close, crash recovery and durable
storage are environment questions, not promises made by a ranking message.

In particular, a NON_PAYING departure whose initial PAYING read cannot be
opened may submit statistics derived from empty values to the NON_PAYING
destination. Do not silently replace this sequence with “read only the session's
own source,” merge both sources, or interpret an opening failure as proof that
no prior records exist.

**Source basis:** [statistics counters](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L687),
[entry and source selection](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5694),
[loss count and notification](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5725),
[earlier-account outcome](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5783),
[record insertion and write paths](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5833).

## Ctrl-G during command input

Amends [line acquisition and editing](lexical.md#lex-2--line-acquisition-and-editing).
When Ctrl-G is delivered to CompuServe's ordinary command reader, retain the
current input text, continue acquiring the line and make no echo-mode change.
Do not redisplay the retained line in response to that character. Ctrl-R retains
its line-redisplay role. A client-local action or echo is outside this delivered
character rule and must be distinguished by its transport binding.

**Source basis:** [character classification](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L980),
[input action](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L1897),
[echo action](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L1970),
[echo-on/off behavior](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L1313).

## Romulan speech frequency

Amends the two speech tests in [Romulan activation](autonomous.md#activation-and-appearance)
and [weapon selection and firing](autonomous.md#weapon-selection-and-phasers).
After an appearance announcement, use IntegerDraw(10) and invoke speech on 1;
this replaces Austin's IntegerDraw(5) test. After an attempted weapon path returns,
use IntegerDraw(50) and invoke speech on 1; this replaces Austin's IntegerDraw(10)
test. The probabilities are 1/10 and 1/50 at those respective points.

Keep each test at its declared point in the activation, with one draw whenever
that test is reached. A test that is not reached consumes no replacement draw.
These are not extra independent speech timers, new appearance odds or player
weapon changes. The speech event itself can consume its own choices.

**Source basis:** [appearance speech test](../../legacy/compuserve/fortran%201978/ROMDRV.FOR#L64),
[post-weapon speech test](../../legacy/compuserve/fortran%201978/ROMDRV.FOR#L123).

## Autonomous speech audiences

Amends [autonomous Romulan speech](communication.md#autonomous-romulan-speech).
The audience choice selects one of the following three values with equal
probability. The qualifier belongs to the selected value; it is not another
random choice.

```text
type SpeechAudience = {
    candidates: Set<ShipId>;
    qualifier: Text;
};
```

| Choice | Candidate ship identities | Qualifier |
| --- | --- | --- |
| 1 | All ten ships in the CompuServe roster. | `sub-Romulan ` |
| 2 | Lexington, Nimitz, Savannah, Vulcan, Yorktown, Cobra, Demon, Hawk and Jackal. | `human ` |
| 3 | Wolf. | `klingon ` |

These are speech audiences. Ordinary TELL faction groups retain their five-ship
membership. In particular, the word `human ` in a speech body does not assert
that every recipient belongs to the Federation.

Choose the audience, opening, adjective and noun in that order. Use the core
opening, adjective and noun alternatives and concatenate opening, adjective,
selected qualifier, noun and `s!`. These four choices occur even when the
chosen audience ultimately has no available recipients.

For each candidate, retain it exactly when its ship is commissioned, its radio
damage is below 300 damage units, and its captain's radio is enabled. Exclude
unavailable candidates silently: CompuServe emits neither the individual
recipient-validation diagnostics nor NoRecipients for this autonomous event.
Do not exclude the triggering captain's ship merely because it triggered the
event. The event neither enables that captain's radio nor requires its radio
to be undamaged.

Let c be the triggering captain and recipients the retained set. Remove
recipients from c.radio.gaggedSenders, then publish the body with sender ROMULAN
if recipients is nonempty. An empty audience produces no publication. Other
captains' gag settings are unchanged. The ungagging precedes publication and is not contingent on its completion.
Silent recipient validation does not suppress an independent publication or
transport diagnostic.

**OPEN QUESTION:** CompuServe's complete publication waiting and failure contract
remains part of its concurrency amendment. The publication caller retries initial
capacity admission on an unavailable result, unlike Austin's immediate
NotPublished result at that point. This does not establish that every busy
publication eventually returns, or that Ctrl-C cancels it. The rules above specify
audience selection and body construction without assuming either outcome.

**Source basis:** [audience and body choices](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L6225),
[autonomous validation and publication](../../legacy/compuserve/fortran%201978/TELL.FOR#L127),
[roster identities](../../legacy/compuserve/fortran%201978/BLKDAT.FOR#L84),
[publication admission retry](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L3560).

## Direct Romulan replies

Amends [TELL recipient selection](commands.md#recipient-selection). ROMULAN
remains an existing Recipient alternative; this amendment gives it a CompuServe
effect. It adds no new command or argument form.

```text
type CompuServeTellObservation = TellObservation | RomulanUnavailable

type CompuServeTellOutcome =
    Result<Published { id: MessageId } | NotPublished | ReplyAttempted, TellFailure>
    | Cancelled
```

CompuServe's SendTell uses this outcome in place of the core outcome. The
additional ReplyAttempted alternative distinguishes completion with no ordinary
player recipients after a present-Romulan reply attempt; it does not assert that
the reply was displayed.

RomulanUnavailable emits fragment(tell07), then `Romulan`, then an unconditional
line ending. It does not create a radio message.

The actor must pass TELL's radio-device check. Enable the actor's radio and
acquire recipients as in the core. Process recipient tokens in input order.
Recognize ROMULAN before applying the repeated-input rejection for other
recipients. An absent Romulan emits RomulanUnavailable and
continues to the next recipient, without composing a reply or making relocation
choices.

For each ROMULAN match with a present Romulan, perform these steps in order:

1. Compose a direct reply using the operation below.
2. Submit it with sender ROMULAN and the singleton recipient set containing the
   actor. Preserve the ordinary player-recipient set accumulated so far.
3. If submission returns, record that a present-Romulan reply was attempted,
   then perform the relocation choice below.
4. Continue with the next recipient token.

The reply does not depend on acquiring, publishing or interpreting the player's
own message body. Repeated ROMULAN tokens each invoke this sequence. A later
invalid recipient or repeated-input rejection does not undo a prior reply or
relocation. A repeated input containing only ROMULAN recipients can therefore
reach the reply path. A later ordinary recipient in that same input still
encounters the core repeated-input rejection.

After all recipient tokens, validate and ungag ordinary player recipients as in
TELL, excluding the actor. If none remain and a present-Romulan reply was
attempted, return ReplyAttempted without NoRecipients or a player-body prompt.
If none remain and no such attempt occurred, emit the ordinary NoRecipients
report. If ordinary recipients remain, acquire and submit the player's body
normally. That later publication has the player as sender; it does not replace
an earlier Romulan reply.

A reply attempt is not proof of delivery. Its publication and subsequent unread
message remain subject to the applicable service contract.
The placement of relocation after submission specifies ordering when submission
returns; it supplies no timeout, cancellation or completion guarantee. The
complete CompuServe waiting contract remains open as described above. TELL
itself still completes no turn and charges no energy.

**Source basis:** [recipient loop and reply sequence](../../legacy/compuserve/fortran%201978/TELL.FOR#L54),
[filtering and player-body continuation](../../legacy/compuserve/fortran%201978/TELL.FOR#L132),
[direct reply sender and audience](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L6242).

### Reply body

```text
query CompuServeOriginQualifier(viewer: CaptainId): Optional<Text>

operation ComposeCompuServeRomulanReply(actor: ShipId): Text
```

Require the actor to have an active commission and a present captain. The
origin-qualifier query describes wording associated with that captain's
connection origin. It observes environment metadata; it changes no game state
and makes no random choice. Its result is absent when the origin has no
recognized qualifier. It does not infer a player's physical location or faction.

The environment binding supplies the session's CompuServe origin code when
available. This is connection metadata, not a game command, captain-entered
location or inferred physical location. Match that code exactly against the
following table. A listed code returns its qualifier, including one trailing
space. An absent or unlisted code returns none. There is no prefix match,
case-folding rule or geolocation lookup in this query.

| Origin code | Qualifier |
| --- | --- |
| `AKR` | `Akron ` |
| `ANA` | `Anahiem ` |
| `ARL` | `Arlington ` |
| `ATL` | `Atlanta ` |
| `BOS` | `Boston ` |
| `CAN` | `Canton ` |
| `CGI` | `Chicago ` |
| `CGO` | `Chicago ` |
| `CIN` | `Cincinnatti ` |
| `CSC` | `ISD ` |
| `CSW` | `Wats user ` |
| `CLG` | `Columbus ` |
| `CVL` | `Cleveland ` |
| `DAL` | `Dallas ` |
| `DAY` | `Dayton ` |
| `DEN` | `Colorado ` |
| `DET` | `Detroit ` |
| `FTW` | `Fort Worth ` |
| `HOU` | `Houston ` |
| `IND` | `Indianapolis ` |
| `KCI` | `Kansas ` |
| `KXT` | `Knoxville ` |
| `LAN` | `Los Angeles ` |
| `LOU` | `Louisville ` |
| `MEM` | `Memphis ` |
| `MIA` | `Florida ` |
| `MIN` | `Minneapolis ` |
| `NFK` | `Norfolk ` |
| `NOL` | `Lousiana ` |
| `NYC` | `New York ` |
| `NYF` | `New York ` |
| `NYN` | `New York ` |
| `NYW` | `Wall Street ` |
| `PIT` | `Pittsburgh ` |
| `PNX` | `Phoenix ` |
| `QBA` | `Quebec ` |
| `SEA` | `Seattle ` |
| `SFA` | `San Francisco ` |
| `SFM` | `California ` |
| `SJO` | `Silicon Gultch ` |
| `SLC` | `Salt Lake City ` |
| `STL` | `St. Louis ` |
| `TSA` | `Tucson ` |
| `TSB` | `Tucson ` |
| `WES` | `West Port ` |
| `WQB` | `Qube ` |

Retain the supplied spellings, including Anahiem, Cincinnatti, Lousiana and
Silicon Gultch. Codes with the same qualifier remain distinct origin codes.
The environment binding must document how its connection metadata supplies
these codes; a host with no applicable origin metadata supplies absence.
The fallback selection below applies when the query returns none.

Compose the body in this order:

| Part | Choice rule |
| --- | --- |
| Opening | IntegerDraw(4): `You have aroused my wrath, `; `You will witness my vengence, `; `May you be attacked by a slime-devil, `; `I will reduce you to quarks, `. |
| Adjective | IntegerDraw(5), using the core speech adjective alternatives in their declared order. |
| Qualifier | The selection below. |
| Noun | IntegerDraw(5), using the core speech noun alternatives in their declared order. |

For the qualifier, first draw IntegerDraw(3). On 1, consult
CompuServeOriginQualifier for the actor's captain. Use a present result without
another qualifier draw. On 2 or 3, or on an absent query result, draw
IntegerDraw(5) and select from this table:

| Choice | Qualifier |
| --- | --- |
| 1 | `sub-Romulan ` |
| 2 | `vertebrate ` |
| 3 | `endo-skeletal ` |
| 4 | `soft-skinned ` |
| 5 | `human ` for a Federation actor; `klingon ` for an Empire actor. |

Concatenate opening, adjective, qualifier, noun and `!`. Retain the opening's
spelling `vengence`. Do not append the autonomous speech's plural `s` and do not
make an audience-selection draw. This operation only composes text: it does not
publish the message, move the Romulan or change radio, energy or score state.
The reply sequence above supplies those subsequent operations.

**Source basis:** [direct openings and composition](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L6251),
[qualifier choice and origin lookup](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L6320),
[origin wording table](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L6349).

### Relocation after a reply attempt

```text
operation RelocateRomulanAfterReply(actor: ShipId):
    Stayed | Relocated { from: Position, to: Position }
```

Require an active actor and a present Romulan at the point of this operation.
First draw IntegerDraw(4). Results 2, 3 and 4 return Stayed without changing
position or making another draw. On 1, first read the actor's current position p,
then let start = IntegerDraw(10) - 5; thus
start is an integer from -4 through 5.

Search horizontal offsets from start through 10 in increasing order. For each
horizontal offset, search vertical offsets from start through 10 in increasing
order. A candidate has vertical coordinate p.vertical plus the vertical offset,
and horizontal coordinate p.horizontal plus the horizontal offset. Skip a
candidate outside the galaxy or with a present sector object. Choose the first
remaining candidate. This is an ordered search, not a choice among all vacant
sectors and not a nearest-distance search.

If no candidate qualifies, return Stayed with the Romulan's position unchanged.
Otherwise let from be its former position and to the selected candidate. Change
its position to to, make its former sector empty and place the Romulan in the
selected sector; return Relocated { from: from, to: to }. Retain its energy and
activity state. No arrival report, weapon effect, score change, energy charge or
turn completion belongs to this operation. The actor does not move.

These state effects describe the uninterrupted operation. They do not establish
exclusive access or a destination recheck against concurrent actions. Such
interleavings, including disappearance of the actor or Romulan while the reply
waits to publish, remain part of the concurrency amendment; the precondition
above is not a new player-visible rejection in those cases.

**Source basis:** [post-reply choice and ordered relocation](../../legacy/compuserve/fortran%201978/TELL.FOR#L93).

## Coordination amendments

Amends the Austin [coordination domains and nested-phase rule](language-model.md#coordination-and-overlapping-operations).
CompuServe distinguishes individually coordinated resources. Its ordinary release
ends the session's claim on the specified resource, not every resource held by
that session. An explicit release-all operation is separate. Uncoordinated
observations are not excluded merely because a resource is held.

For a resource already successfully held by the same session, repeated entry
returns without a second acquisition or another outstanding release obligation.
One ordinary release ends that resource's held state. This rule does not establish
successful reentrant acquisition of a request that is still pending, nor does
it make a whole command atomic.

### Named resources and wait selection

The following resources are distinct. Sharing one resource does not imply
sharing another, and entering one does not exclude operations that do not enter
that resource.

| Resource | Operations using it | Scope | Selects the resource remembered across waits |
| --- | --- | --- | --- |
| Admission and commission changes | Admission, commission release and conditional restoration | Shared across galaxies in the same service | Yes |
| Planet changes | BUILD conversion, CAPTURE, and planet impacts from player torpedoes, Romulan torpedoes and nova activity | One galaxy | Yes |
| Delivery | Capacity reservation, publication, search and recipient removal for queued messages and events | One galaxy | No |
| Standings updates | Captain-count allocation and score-record updates | Shared across galaxies in the same service | No |

For the entries marked Yes, selecting the resource precedes the attempt to
enter it. Selection alone is not evidence that entry succeeded. Ordinary release
by these operations clears the remembered choice; it does not choose another
resource still held by the session. Delivery and standings entry and release
leave that choice unchanged. Thus entering and releasing delivery coordination
inside a planet-change phase does not replace the remembered planet resource
with delivery coordination.

These resource scopes describe coordination within a service hosting multiple
galaxies; they do not require separate installations to share a service or their
records. They also do not make each listed operation a single coordinated phase:
its uncoordinated checks and work outside entry/release retain their ordering.
Movement resource grouping and administrative statistics clearing are not
covered by this table.

### Waiting and fresh input

An operation can designate one coordinated resource to remember across waits.
This remembered choice is distinct from the set of all resources held by the
session. For an uninterrupted positive elapsed wait:

1. Save the remembered resource, if any, and release that resource.
2. Wait using the requested delay capped at 10000 milliseconds. Compare against
   the elapsed-time deadline after suspension; if it has not been reached,
   request another 1000 milliseconds and repeat the check.
3. If a resource was saved, attempt to enter it again. Retry after each failed
   entry. Return from the wait only after successful reacquisition.

A requested delay of zero or less returns before this release/reacquisition
sequence. The temporary release does not release every held resource and does
not by itself change resources, scores or game turns. Other sessions may act
while the resource is released, subject to their own coordination requirements.
Reacquisition does not restore game-state values observed before waiting.

Fresh input acquisition similarly saves and releases the remembered resource,
reads the input line, and retries reacquisition before processing that newly
acquired line. Continuing to parse input already acquired does not perform this
fresh-input release. The presence of typed input alone therefore does not prove
that the waiting operation has returned or reacquired its resource.

Checking input readiness has its own waiting rule. If a remainder of the current
command line is available, or initialization-file input is active, report input
ready without releasing a resource. Otherwise, a positive requested wait saves
and releases the remembered resource, suspends until the input notification or
requested timeout, and retries reacquisition before checking readiness. A
nonpositive readiness wait skips suspension and resource release. This readiness
wait does not use the elapsed-wait cap and deadline-recheck sequence above.
After the wait, hangup, available terminal input or a pending command interrupt
reports input ready; otherwise report input not ready. Reporting readiness does
not itself read or execute a command.

The requested input or delay can finish while reacquisition still waits. These
rules impose no finite total wait, fairness or automatic rollback guarantee.
They amend Austin's rule that waiting alone retains coordination.

**OPEN QUESTION:** Movement and administrative resource mapping, pending/reentrant
requests, environment failures and interrupted
reacquisition still require review. A stopped or interrupted acquisition must
not be treated as a successful coordinated phase by assumption. Environment binding beyond the resource scopes above remains open. These limits do not
replace the ordinary sequences above with Austin's release-all behavior.

**Source basis:** [CompuServe waiting](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L4010),
[fresh input](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L1679),
[input readiness](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L3871),
[entry, selection and scope](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L4468),
[delivery entry](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L3127),
[standings entry](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5589),
[targeted and explicit release-all paths](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L4594).

## Remaining amendments

The environment origin-code acquisition binding, standings persistence, concurrency and other
differences still require language-level descriptions. The earlier [CompuServe source
analysis](compuserve.md) retains the derivations. Packed representations and
machine side effects in that analysis are not requirements of this appendix.
