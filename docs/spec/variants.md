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
Standings selection, record lifetime, ranking and complete output are specified
by the forthcoming persistence amendment; this command does not imply that
Austin keeps the same records.


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
   records; their membership and ordering remain to be specified.
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

**OPEN QUESTION:** The complete standings ADT, storage-failure behavior and report
contract remain incomplete. This entry defines command availability and caller
continuation, not a complete HONORROLL conformance claim.

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

These callers observe elapsed time before the final POINTS report, then use
that report's committed ship total for the submitted score. The standings
update precedes commission release. Reporting or update failures can therefore
prevent the caller from reaching release; no rollback or guaranteed cleanup is
implied by the ordinary successful sequence.

**Source basis:** [fatal acquisition reporting](../../legacy/compuserve/fortran%201978/GETCMD.FOR#L105),
[world-end record status and ordering](../../legacy/compuserve/fortran%201978/ENDGAM.FOR#L54).

**OPEN QUESTION:** The full update operation still needs the remaining exit-path
missing status, mission/destruction counters, source initialization, date binding,
write failures and concurrent access. The placement rule does not promise a
durable write or define the treatment of malformed preexisting records. It does
not reclassify a losing commission as a destroyed physical ship.

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
memorial score instead. Complete interruption placement, damaged source records,
heading whitespace and row formatting also remain under review.

**Source basis:** [faction comparison and group display](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5922).

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

**OPEN QUESTION:** The complete origin-to-wording binding remains unspecified.
The supplied origin table and exceptional origin tests require a separate
binding description. The query is not permission to invent qualifiers or replace
it with a geolocation service. The following fallback rule is fully defined for
an absent result and for branches that do not consult the query.

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

## Coordination amendment status

The Austin [coordination domains and nested-phase rule](language-model.md#coordination-and-overlapping-operations)
are not a completed CompuServe contract. CompuServe distinguishes more protected
resources and its ordinary phase completion does not have Austin's release-all
scope. Its waiting and interruption rules need a separate amendment. Do not
infer the Austin two-domain relation or nested release behavior merely because
both variants use the same game operations.

Positive elapsed waits and fresh input acquisition in CompuServe also release
and subsequently reacquire a remembered coordinated resource when one is present.
They do not inherit Austin's rule that waiting alone retains coordination. The
complete resource-selection, failed-wait and reacquisition contract remains part
of this amendment; no claim that all resources are released together follows.

**Source basis:** [CompuServe waiting](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L4010),
[fresh input](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L1679),
[CompuServe coordination and release](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L4462).

## Remaining amendments

The direct-reply origin binding, standings persistence, concurrency and other
differences still require language-level descriptions. The earlier [CompuServe source
analysis](compuserve.md) retains the derivations. Packed representations and
machine side effects in that analysis are not requirements of this appendix.
