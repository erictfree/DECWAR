# Sessions and commissions

A session is a captain's participation in a game environment. A commission is
the right to operate one roster ship in a particular galaxy. Ending a commission
and destroying a ship are distinct events: fatal damage does not by itself
complete every release, reporting or session-exit effect.

This chapter defines startup, admission, information activities, commission
release and world termination. Detailed control delivery, concurrent admission
and environment continuation remain incomplete.

## Session properties

```text
enum SessionPhase = STARTUP | PREGAME | ADMISSION | ACTIVE | ENDED
enum InformationActivity = NONE | HELP | FEEDBACK

type AccountIdentity, ExecutionIdentity, TerminalIdentity
type TimeOfDay = duration since local midnight

type SessionReporting = {
    advertisedSpeed: nonnegative integer;
    connectionLabel: Text;
    sessionNumber: integer;
};

type CommissionTiming = {
    elapsedOrigin: ClockOrigin;
    executionAtStart: Duration;
};

type OperationTiming = {
    name: Text;
    completedCalls: nonnegative integer;
    totalExecution: Duration;
    maximumExecution: Duration;
};

type Session = {
    captain: CaptainId;
    phase: SessionPhase;
    entryName: Optional<Text>;
    account: AccountIdentity;
    execution: ExecutionIdentity;
    terminal: TerminalIdentity;
    reporting: SessionReporting;
    commissionTiming: Optional<CommissionTiming>;
    informationActivity: InformationActivity;
};

query session(game: GameState, captain: CaptainId): Session
query observeOperationTimings(captain: CaptainId): List<OperationTiming>
```

Account, execution and terminal identities are supplied by the environment;
a captain's display name does not define any of them. The environment binding
must document their equivalence rules. In particular, returning-player matching
uses account and execution identity together, not display name or terminal alone.

OperationTiming describes one registered diagnostic measurement in the viewer's
execution environment. completedCalls counts completed measured calls;
totalExecution is their cumulative measured duration; maximumExecution is the
largest such duration. A registered measurement may have no completed calls.
The observation query returns these records in first-registration order within
the defined instrumentation domain. Querying does not clear the measurements.
These durations are separate from ship turns and game scores. Instrumentation
selection, clock failures, capacity exhaustion and rendering of time units
belong to the environment binding.

**Source basis:** [timing registration and reporting](../../legacy/utexas/WARMAC.MAC#L3606).

SessionReporting contains the values advertised by the environment for reports.
For an active commission these values are recorded during admission; USERS does
not replace them with fresh environment lookups for each row. advertisedSpeed
is the reported terminal rate, connectionLabel is its displayed label, and
sessionNumber is the displayed execution/session number. They are distinct from
the identity types used to match accounts or executions. A binding defines the
rate's units and these labels; it must use the same advertised rate when other
rules compare terminal speeds.

ClockOrigin identifies a starting event in the environment's elapsed-time
clock. It is an abstract marker, not a required timestamp representation.
The environment supplies these observations:

```text
observeElapsed(origin: ClockOrigin): Duration
observeExecution(captain: CaptainId): Duration
observeTimeOfDay(): TimeOfDay
```

Elapsed duration includes waiting; execution duration is the environment's
accounting of running time for that session. Each observation occurs when its
rule calls for it; successive observations need not have the same value.
The binding specifies clock resolution, local time convention, rollover,
discontinuities and execution accounting. A game turn is not a substitute
for either clock, and execution time is not implicitly wall-clock time.

World.elapsedOrigin is present once a galaxy's clock has been initialized.
A commission records its own elapsedOrigin and executionAtStart; later TIME
reports subtract the latter from a new execution observation. A new commission
replaces those baselines. Release removes commissionTiming along with the
captain's active ship association; it does not reset total session execution
accounting. The complete restart/resume clock binding remains under review.

**Source basis:** [galaxy clock origin](../../legacy/utexas/SETUP.FOR#L173),
[commission metadata and clocks](../../legacy/utexas/SETUP.FOR#L365),
[elapsed and execution observations](../../legacy/utexas/WARMAC.MAC#L3329),
[report metadata](../../legacy/utexas/WARMAC.MAC#L2187).

A roster ship without an active position has `position == none`. This is a
semantic absence, not a sector outside the galaxy. Command contracts requiring
an acting ship use its active position. A pregame information command does not
create a ship position merely to satisfy such a contract.

## Startup and pregame

```text
StartupReply ::= EmptyInput | "HELP" | "PREGAME"
ActivateCommand ::= "ACTIVATE"

operation StartSession(captain: CaptainId): Pregame | AdmissionStarted | SessionEnded

operation Activate(captain: CaptainId): AdmissionStarted
```

A new session acquires its environment identity and captain name, then enters
the startup dialogue. Empty startup input begins admission. HELP displays the
general-help instructions and main command list, then repeats the startup
prompt. PREGAME enters pregame command acquisition. Other replies repeat startup;
keywords use ordinary abbreviation rules and only the first reply token selects
this branch. Interruption or disconnect exits at this stage.

Pregame offers ACTIVATE, GRIPE, HELP, NEWS, POINTS, QUIT, SET, SUMMARY, TIME, TYPE,
USERS, *DEBUG, *PASSWORD and *ZAP under the pregame grammar. Empty input repeats
the prompt. Ambiguous input is diagnosed. If no pregame command matches but a
main-game command does, report that it is not available in pregame; otherwise
report an unknown command. These diagnostics include the help hint.

ACTIVATE has precondition `session.phase == PREGAME`; its effect is to begin
admission. It has no command arguments, energy cost or game turn. It does not
itself choose a faction, select a ship or guarantee admission. Shared information
and preference commands return to pregame according to their own contracts.

Initially output length is MEDIUM, prompt style NORMAL, scan style LONG and
output-coordinate mode BOTH. Initial input-coordinate mode is reported as BOTH;
unqualified numeric locations are interpreted relatively. Explicit ABSOLUTE and
RELATIVE still select their respective interpretation. SET ICDEF can replace
this initial state with ABSOLUTE or RELATIVE, but has no BOTH setting. The
terminal profile is initially unselected and becomes CRT during admission.

There is no Beginner/Intermediate/Expert selection in this startup dialogue.
The installation's command-initialization content is applied later, after ship
placement; it is separate from these initial preferences.

The initial name dialogue is defined below. Environment continuation, control
delivery and some admission edge cases still need their complete contracts.

**Source basis:** [main initialization](../../legacy/utexas/DECWAR.FOR#L1),
[startup and pregame dispatch](../../legacy/utexas/SETUP.FOR#L76),
[pregame matching](../../legacy/utexas/SETUP.FOR#L402),
[initial name reader](../../legacy/utexas/WARMAC.MAC#L3213),
[coordinate interpretation](../../legacy/utexas/DECWAR.FOR#L1403),
[preference reports](../../legacy/utexas/DECWAR.FOR#L4560).

### Entry name

entryName is the name acquired for this execution, initially absent. It is
separate from the current commission's display name. Its presence permits later
identity acquisition to reuse the name without another name prompt.

```text
operation AcquireEntryName(viewer: CaptainId): Named { name: Text } | SessionEnded

operation AcceptEntryName(viewer: CaptainId, text: Text): Named { name: Text } | RetryName
```

AcquireEntryName returns an existing entryName immediately. Otherwise it emits
`Your name please: ` and acquires raw name text. This acquisition ignores NUL
and carriage return. Line feed, ESC and Ctrl-G finish the name; none of these
three terminators becomes part of it. Ctrl-C ends this acquisition and the
startup session. ESC does not recall a previous command, and Ctrl-G does not
request redisplay here. The ordinary command reader's editing rules do not
apply. A terminal binding must specify any editing performed before characters
reach this reader.

StartSession uses the returned name as the captain's initial displayName before
the startup dialogue; this also supplies the name for pregame feedback context.

AcceptEntryName is defined for printable text as follows. Keep its first twelve
characters. Convert lowercase letters to uppercase; retain spaces and printable
characters from space through underscore. The remaining printable characters
have these conversions, specific to the entry-name dialogue:

| Input character | Name character |
| --- | --- |
| Grave accent | Space |
| Left brace | Semicolon |
| Vertical bar | Less-than sign |
| Right brace | Equals sign |
| Tilde | Greater-than sign |

Let name be the converted text. If its first six characters contain no nonspace
character, return RetryName and request a fresh name. Otherwise:

```text
session(game, viewer).entryName = name
return Named { name: name }
```

Leading and embedded spaces count toward both limits. A nonspace character only
in positions seven through twelve does not satisfy entry-name validation. Input
beyond twelve characters does not create a longer name; character acquisition
still waits for its terminator. The generalized text model does not assign
effects on unrelated state to excess input. Embedded nonprinting characters,
disconnection during this raw acquisition and terminal-provided editing remain
outside this clause's defined domain; this is not an added rejection rule.

When admission records a commission's identity, it sets the captain's display
name to entryName. SET NAME during an active commission changes the display
name, leaving entryName unchanged. A later commission in the same execution
therefore begins with entryName again. Pregame SET NAME is recognized and
consumes its name input, but its effect without a commissioned ship is
unspecified; it does not supply an alternative entry-name mechanism.

**Source basis:** [entry-name acquisition and conversion](../../legacy/utexas/WARMAC.MAC#L3208),
[admission identity acquisition](../../legacy/utexas/SETUP.FOR#L156),
[commission identity recording](../../legacy/utexas/SETUP.FOR#L365),
[SET NAME](../../legacy/utexas/WARMAC.MAC#L3423).

### Administrative statistics

*ZAP is a pregame administrative operation. It has no arguments; trailing tokens
do not select a statistics category. It is not a main-game command.

```text
enum StatisticsArchiveKind = REGULAR | FREE_ACCOUNT
type StatisticId

type HistoricalStatistics = {
    serial: integer;
    values: Map<StatisticId, real>;
};

type AdministrativeState = {
    statistics: HistoricalStatistics;
};

query administration(viewer: CaptainId): AdministrativeState

operation ZapStatistics(viewer: CaptainId): Ignored | Finished { archive: Optional<StatisticsArchiveKind> }
```

StatisticId identifies an administrative score, count or other recorded statistic
in the environment's statistics schema. This schema is distinct from the live
galaxy's Score values and commission counts. AdministrativeState holds the
execution's working statistics; newly initialized values, including serial,
are zero. An environment binding supplies the two persistent archive resources
and their schema. The core does not require a file layout or introduce an
automatic standings-update service.

ZapStatistics requires the PREGAME phase. If the captain lacks privilege, return
Ignored without output, recording or archive access. Otherwise:

1. Emit the statistics-clearing announcement. Obtain exclusive access to the
   shared service domain, which also coordinates radio operations, retrying until
   access is obtained under the [coordination rules](language-model.md#coordination-and-overlapping-operations).
2. Attempt an administrative feedback record with the current feedback context
   and no body lines. Do not prompt for a gripe. Failure to record it does not
   cancel the subsequent statistics operations.
3. Set every value in administration(viewer).statistics.values to zero. Preserve
   its serial. This working value supplies both archive writes; neither archive
   is first read to obtain its own former serial.
4. Attempt to open REGULAR for replacement. If opening fails, report that
   failure and skip FREE_ACCOUNT. Otherwise write the cleared statistics, close
   REGULAR, then attempt the same replacement of FREE_ACCOUNT. An open failure
   there is reported without rolling back the REGULAR replacement.
5. Release administrative access and emit the completion message. Return
   Finished { archive: none } if both replacements completed, or Finished { archive: kind } identifying
   the archive that could not be opened.

The operation does not reset live scores, alter galaxy objects, commission a
ship, change privilege or consume a game turn. The administrative feedback
record has its normal context and closing separator, but no standings dump.
Record-storage diagnostics and retry behavior follow the feedback binding.

The historical terminal binding emits these texts, with the displayed escapes
denoting control characters:

```text
announcement:  \r\nZapping statistics logs....
open failure:  \r\n\r\nCan't open file for output!\r\n\r\n
completion:    \r\nFinished!\r\n
```

The completion message also follows an archive-open failure; it is not proof
that both archives were replaced. The rules above cover completed writes and
explicit open failures. Write/close failures, interruptions while holding
administrative access, the full persisted-statistic schema and interactions
with other administrative writers still require environment-binding rules.
No atomic two-archive transaction or rollback is implied.

**Source basis:** [pregame privilege check](../../legacy/utexas/SETUP.FOR#L134),
[statistics values](../../legacy/utexas/WARMAC.MAC#L575),
[archive resources](../../legacy/utexas/WARMAC.MAC#L748),
[administrative feedback path](../../legacy/utexas/WARMAC.MAC#L3878),
[empty administrative body](../../legacy/utexas/WARMAC.MAC#L4049),
[statistics clearing](../../legacy/utexas/WARMAC.MAC#L4636).

## Admission and faction selection

```text
operation AdmitCaptain(captain: CaptainId): Commissioned { ship: ShipId } | Cancelled
                 | DifferentGalaxyRequired | GalaxyEnded
```

Admission uses a participant place before a ship is fully commissioned. These
places count toward the galaxy's eighteen-participant capacity and include
admissions in progress. If all eighteen places are occupied, report that the
ships are in use and attempt entry through a different galaxy. Existing captains
remain in the full galaxy; the arriving captain does not evict one of them.
The full galaxy ceases to be the destination offered to new arrivals through
that entry route.

Otherwise reserve a participant place. Reuse an initialized, unterminated galaxy
unless this is its only participant and its empty-world retention has expired.
Create a galaxy when none is initialized or when that retention has expired.
A reused galaxy reports its enabled Romulan and black-hole options. If it has
already ended, report that it is unavailable and end this admission attempt.

### Faction acceptance

For a captain with no matching recent-commission record, first report the faction
populations. If they differ by at least two, select the smaller faction without
a choice prompt. Otherwise ask for FEDERATION or EMPIRE. Empty input chooses
Federation when populations are equal, and the smaller faction otherwise.
Unrecognized replies repeat the faction prompt.

For a captain matching recent history, prefer the recorded faction and ship.
If that faction is full, ask `Do you wish to defect? `. YES selects the other
faction and proceeds to ship choice. Any other reply, including empty input,
cancels admission. If the former faction has room but the former ship is occupied,
ask `Do you wish to choose another ship? `; YES proceeds to ship choice in the
former faction, and any other reply cancels. If the former ship is available,
select it without another ship-choice dialogue.

Accepting faction t adds one to its participant count and updates its
cumulative commission count as follows:

```text
world(game).teamCommissions[t] += 1
```

These are distinct quantities. Cancellation after this event
removes the participant place and faction participant count, but does not undo
the cumulative commission increment used by POINTS. An earlier cancellation
removes only the overall participant reservation.

### Ship choice and commissioning

Present available ships in the selected faction's roster order. A reply matches
ship names in the full roster's ordinary first-match order, then must designate
an available ship in the selected faction. An unrecognized or wrong-faction
name repeats the choice list; an occupied ship produces the unavailable-ship
report and repeats the list. Empty ship-choice input also repeats the list.

Selecting an available ship ends admission's coordinated phase before the ship's
individual score is cleared and its commission is established. Selection alone
therefore does not atomically reserve that ship. The ordering is defined by
[coordination boundaries](language-model.md#coordination-and-overlapping-operations);
the final ownership result of racing claims remains open below.

For the selected ship, clear the individual score and establish the new
commission with the initial resources in the abstract game model: energy 5000,
ten torpedoes, shields UP at 100%, zero hull and device damage, five life-support
turns, GREEN condition and stardate zero. Record the captain's environment
metadata in session.reporting. Create a CommissionTiming record whose
elapsedOrigin marks this commission's start and whose executionAtStart is the
current execution observation; assign it to session.commissionTiming.
This is initialization, not a repair or a turn-completing action. Select the CRT
terminal profile.

Place the ship in an eligible empty sector under the placement rule, then enter
ACTIVE play. Begin reading the installation's initialization commands through
the ordinary command language. Admission does not clear a previously enabled
session privilege merely because a ship was selected.

**OPEN QUESTION:** Concurrent claims to the same final ship, cancellation during the
transition to a placed commission, and stale metadata in pacing selection need
full contracts. The preceding reservation stages specify effects but do not
require a particular lock or whole-dialogue transaction.

**Source basis:** [participant reservation and reuse](../../legacy/utexas/SETUP.FOR#L145),
[faction and ship selection](../../legacy/utexas/SETUP.FOR#L264),
[commission initialization](../../legacy/utexas/SETUP.FOR#L353),
[early cancellation](../../legacy/utexas/SETUP.FOR#L1),
[placement and command initialization](../../legacy/utexas/DECWAR.FOR#L44).

## Galaxy creation and placement

```text
GameKindReply ::= EmptyInput | "REGULAR" | "TOURNAMENT" [TournamentKey]
OptionReply   ::= EmptyInput | "YES" | "NO"

operation CreateGalaxy(): Unit
```

The first admission creating a galaxy chooses REGULAR or TOURNAMENT; empty
selects REGULAR and an unrecognized reply repeats the choice. TOURNAMENT uses
the next token as its key, or prompts for one if absent. The key is its retained,
case-transformed token text; an empty reply to the separate key prompt is not
rejected. Its reproducibility binding is part of the random
choice contract; it is not a new numeric command argument.

Next ask whether Romulan activity is enabled. Empty input or YES enables it;
NO disables it; another reply repeats the question. No Romulan is initially
present, even when its later activity is enabled.

The initial galaxy has twenty neutral planets with zero builds and ten bases
per faction at 100% strength. Choose star and potential black-hole counts using
two unit draws in this order:

```text
starCount = 100 + 5 * floor(51 * starDraw)
holeCount = 10 + floor(41 * holeDraw)
```

Thus star count ranges from 100 to 350 in steps of five; hole count ranges from
10 to 50. The potential hole count is chosen even if black holes are later declined.
Initial faction scores, discoveries and cumulative faction commission counts
are zero; there are no published messages or tractor associations.
In particular, world.teamCommissions maps each Team to zero.
world.baseCounts maps each Team to ten, and world.capturedPlanetCounts maps
each Team to zero.
World.radioService starts with an empty messages sequence and an empty
publicationsInProgress set.
World.combatNotices starts with an empty notices set.
World.ended starts false.
Set world.elapsedOrigin to the new galaxy's clock origin.

Place bases in alternating faction order by base identity: Federation first,
then Empire for each of the ten identities. Place the twenty planets next,
then all stars. Finally ask whether black holes are wanted. Empty input or NO
leaves them absent and world.blackHolesSelected false; YES sets that property
true and places the chosen number. Other
replies repeat that question. This order determines the random choices' uses;
it does not prescribe a storage representation.
Later removal of black holes does not change blackHolesSelected; that property
records the selected galaxy option rather than its current object population.

For each object placement, choose a vertical coordinate and then a horizontal
coordinate from 1 through 75. If that sector is occupied, choose another pair.
For a placed player ship, if the opposing faction's maintained base count is
positive, reject a candidate within distance four of any recorded opposing base
position. Check every base identity in that faction's fixed roster, including
inactive bases; current strength and sector presence do not filter this test.
If the opposing maintained base count is zero, skip the base-position exclusion.
A rejected candidate causes both coordinates to be drawn again. No corresponding
planet exclusion is established by this reconstruction's placement behavior.
These player-ship exclusions do not apply to placing installations, stars,
black holes or the Romulan.

An inactive base can therefore exclude nearby initial ship positions while its
faction still has a positive maintained base count. Reusing that base identity
changes its recorded position and hence the location used by later placement.
This rule uses retained base records; it does not create another installation or
change the four-sector distance.

**OPEN QUESTION:** Action-cycle phase when an expired galaxy is reinitialized
requires normalization review. Exact admission interruption during creation and exhausted eligible-placement
domains remain to be specified. Random distributions and tournament-key
reproducibility follow the [random-choice contract](world-rules.md#random-choices-in-semantic-rules).
No arbitrary retry limit or extra safe-spawn radius is introduced.

**Source basis:** [new-galaxy dialogue and population](../../legacy/utexas/SETUP.FOR#L173),
[placement](../../legacy/utexas/DECWAR.FOR#L2765).

## Initialization commands

After ship placement, announce command initialization and read the configured
command resource through the same input language as ordinary play. Its commands
have their ordinary effects. This resource can change preferences or request
reports; it is not a separate grammar or a set of built-in preference defaults.

The preserved Austin reconstruction supplies:

```text
set prompt informative
set ocdef both
set output medium
targets
srscan 2 w
```

At end of resource, return to interactive input. Ctrl-C while reading it stops
further initialization input and returns to interactive input under the control
binding. If the resource is unavailable, report that fact and continue with
existing state; the missing-resource report does not itself assign new defaults.
Other configured command resources must be identified in a conformance scenario.

**Source basis:** [initialization reader](../../legacy/utexas/WARMAC.MAC#L1096),
[preserved commands](../../legacy/utexas-reference/f78f2ec/DECWAR.INI).

## Temporary information activities

```text
operation BeginInformationActivity(captain: CaptainId,
                                   activity: InformationActivity): Unit

operation EndInformationActivity(captain: CaptainId): Unit
```

These are shared effects of accepted HELP and GRIPE commands, not player commands.
Their callers reject RED alert before entering. A captain without an acting
ship can enter either activity without changing the galaxy.

For an acting ship, beginning the activity gives its sector the temporary
interaction kind BLACK_HOLE. Sector observations and actions that determine
what is present from that sector use the black-hole rules during the activity.
The ship remains commissioned, with the same faction, position, resources,
shields and devices. Neither the ship's identity nor its recorded position is
replaced by a new permanent astronomical object.

This does not grant general immunity. Rules that select commissioned ships by
their ship properties still apply, and other captains and autonomous activity
continue. HELP and GRIPE impose no new galaxy-wide pause.

On activity completion, if that commission is still active, restore the ship's
normal sector presence at its then-current position. If it is no longer active,
do not reintroduce it. The session leaves the information activity. Cancellation
and content/storage failures use this same completion rule.

**OPEN QUESTION:** Movement or destruction during the activity can interact with the
original sector and the completion position. Complete interleaving rules for
those cases remain to be derived; the contract above does not authorize moving
all concurrent sector effects to the final position or restoring a lost commission.

**Source basis:** [HELP entry and return](../../legacy/utexas/WARMAC.MAC#L4134),
[GRIPE entry and return](../../legacy/utexas/WARMAC.MAC#L3858),
[temporary sector state](../../legacy/utexas/WARMAC.MAC#L4379).

## Main-command acquisition and control

This operation applies to an ACTIVE session with an associated ship. It is
separate from command-argument prompts, the entry-name reader and message-body
input; those readers retain their own cancellation rules.

```text
type MainCommandName = a name in the main-game command table

type MainCommandSelection = {
    command: MainCommandName;
    input: CommandInput;
};

operation AcquireMainCommand(actor: ShipId, previousDelay: Duration):
    Selected { value: MainCommandSelection } | QuitRequested
    | CommissionReleased | GalaxyEnded
```

MainCommandName denotes the finite set in [command selection](grammar.md#gram-2--command-selection).
It is not an arbitrary operating-system command or an additional input category.
A Selected result identifies a typed command and its acquired arguments; it
does not execute that command. QuitRequested instead requests the existing QUIT
operation and its confirmation/disconnection rules, without inventing an acquired
input line. Both are dispatch results, not new user commands.

### Entry and prompt checks

On entry, end the session's remaining coordination. Deliver pending combat
notices before pending radio messages, enable ordinary output for each delivery,
and flush pending output. Then honor previousDelay unless the captain is
privileged, using [WaitElapsed](turns.md#elapsed-waiting). Consume that prior delay
once; retries within this acquisition do not apply it again.

Before each prompt, request a conditional blank line. Then apply these checks
in order:

1. If the actor's hull damage is at least 2500 damage units, perform final score
   reporting and release its commission; return CommissionReleased.
2. Otherwise, if its energy is at most zero, emit the out-of-energy report and
   follow that same final-report/release path.
3. Otherwise, energy at most 1000 units sets the actor's condition to YELLOW.
   Emit the yellow-alert indication when its resulting condition is YELLOW.
4. Enable output and perform the ordinary world-termination check. A terminating
   check takes precedence over displaying another command prompt.
5. Clear the pending interrupt indication for this new prompt, emit the selected
   command prompt and flush it.

The low-energy assignment can replace RED with YELLOW at this boundary. It does
not raise low energy, repair damage or change shield state. No prompt check or
input wait completes a turn or invokes periodic defenses merely because time
has passed. This boundary does not test other sessions for continued availability
or release their ships merely because their connections have disappeared.
Final-report failure still requires its complete environment/lifecycle binding;
a prompt does not certify an atomic snapshot of all sessions.

### Waiting and ordinary input

At the start of each wait, end the session's remaining coordination. With no
already-pending interrupt or disconnect, request input readiness for an interval
of 2000 milliseconds. This is a readiness wait, not a mandatory delay after
input becomes available. The environment may report readiness sooner.

After an interval without input, deliver any pending combat notices before
radio messages. If either kind was pending, return to the prompt checks after
delivery. Otherwise check world termination and wait again without printing
another prompt. Waiting does not create an autonomous game turn, an idle-ship
attack or a periodic cleanup action.

When input is ready, a disconnect already observed at that point returns QuitRequested.
Otherwise acquire tokens using the ordinary lexical reader. If no interrupt
is pending when that acquisition returns, zero-token input returns to the prompt
checks. Nonempty input uses the ordinary main-command matching rules. Unknown
or ambiguous input emits its diagnostic and, outside SHORT output, the help
hint, then returns to the prompt checks. A unique match returns Selected.

### Interrupt timing and QUIT selection

An interrupt observed when token acquisition returns has these effects:

| Actor condition then | Effect |
| --- | --- |
| RED | Emit fragment(noquit), discard pending command input and return to the prompt checks. Do not select QUIT on this path. |
| Any other condition | Return QuitRequested under the ordinary QUIT operation contract. |

The RED restriction applies to this interrupt path. An explicitly typed QUIT
still follows the QUIT command's own rule; this section does not add a RED
precondition to that command. A disconnect detected after an input-readiness
wait that returned without input also returns QuitRequested. Disconnected QUIT bypasses
confirmation under its existing contract.

An interrupt or disconnect **already pending at the start of a wait** follows
a different path: perform the pending-notice and world-end checks used after a
no-input interval, without selecting QUIT at that boundary. That path does not
clear the pending indication. If no notices lead back to the prompt checks and
world termination does not end the operation, the same wait boundary can be
revisited with the indication still pending. No eventual cancellation or
disconnection cleanup is guaranteed by this path.

These distinctions describe delivered control events, not every physical
keystroke a client might intercept. They do not prescribe a signal handler or
an interrupt-counter representation. A transport binding must distinguish the
timing of delivered control from client-local handling. The playable port's
control repair is separate from this Austin source contract.

**OPEN QUESTION:** Complete nested-control delivery, disconnection during token
acquisition, failures during final reporting and the continuation after an
environment interruption remain binding questions. This chapter does not
replace the already-pending path with an invented automatic quit or timeout.

**Source basis:** [entry, prompting and wait boundaries](../../legacy/utexas/DECWAR.FOR#L1184),
[ready-input and interrupt paths](../../legacy/utexas/DECWAR.FOR#L1230),
[final score/release](../../legacy/utexas/DECWAR.FOR#L1258),
[inactive availability check](../../legacy/utexas/WARMAC.MAC#L3078),
[QUIT operation](../../legacy/utexas/DECWAR.FOR#L134),
[readiness interval](../../legacy/utexas/PARAM.FOR#L31),
[token acquisition](../../legacy/utexas/WARMAC.MAC#L1385).

## Releasing a commission

```text
operation ReleaseCommission(actor: ShipId): Released | AlreadyAvailable
```

If the ship is already available after completed release, the operation has no
release effects. A just-destroyed ship with a captain association is not already
available merely because commissioned is false. Otherwise, release ends its
current commission. At completion:

```text
ship.commissioned == false
ship.captain      == none
ship.position     == none
ship.energy       == 0 energy units
captain.ship      == none
```

The released ship has no active sector presence. Any tractor beam involving it
is released under the shared beam rules. The galaxy and faction each have one
fewer participant. Pending hit notifications and radio messages addressed to
that ship are consumed or discarded for that recipient; other recipients retain
their messages. Radio-message removal has the effect of
[DiscardUnread](communication.md#discarding-an-unread-audience).
The ship becomes available for a subsequent commission.

Release does not erase the roster identity, erase faction scores, award a kill,
or advance a turn. It preserves the departing ship's condition values for the separate
[continuation facility](#saved-condition-and-environment-continuation) before
clearing active presence and energy. This is not a new player command named
RESUME or a promise that a later login restores the ship.

The session's account, execution identity, terminal identity, departure time,
faction and ship are recorded in recent-commission history. History holds ten
records. An existing account/execution match is updated in place. A new identity
is added in insertion order; at capacity it replaces the oldest inserted record.
Updating a match does not make that record the newest insertion. This history
informs later admission, not a new score or persistent standings table.

If release leaves the galaxy with no participants and it has not ended, its
retention deadline becomes five minutes after release. An arrival before that
deadline can reuse the existing galaxy; an arrival at or after expiry creates
a new one under the admission rules. Expiry is checked when admission attempts
to reuse the empty galaxy.

Recent-commission history imposes no mandatory elapsed-time cooldown before
reentry in Austin.

**OPEN QUESTION:** Admission reservations and simultaneous releases need their complete
ordering contract. Resume availability, final-report failures and the environment's
clock discontinuities also remain under review.

**Source basis:** [FREE and RSTART](../../legacy/utexas/DECWAR.FOR#L1082),
[history matching](../../legacy/utexas/DECWAR.FOR#L1335),
[history capacity and admission delay](../../legacy/utexas/PARAM.FOR#L30),
[empty-galaxy reuse](../../legacy/utexas/SETUP.FOR#L168).


## Saved condition and environment continuation

```text
type SavedShipCondition = {
    position: Optional<Position>;
    stardate: Stardate;
    condition: Condition;
    torpedoes: integer;
    shields: Shields;
    lifeSupportReserve: integer;
    energy: Energy;
    hullDamage: Damage;
    devices: Map<Device, DeviceState>;
};
```

SavedShipCondition is a value, not an identity or a reference to a live Ship.
Its fields have the same meanings and units as the corresponding Ship fields.
During ReleaseCommission, preserve the position, stardate, condition, torpedoes,
shields, life-support reserve, energy and hull damage before clearing the active
ship's position and energy. Preserve the device damage as well. A later change
to the roster ship does not change these saved values. This preservation occurs
after participant-count changes, beam release and recent-commission recording;
it does not make the entire release an atomic snapshot.

The saved condition contains neither score nor pending score, a tractor beam,
docking state, radio messages, nor weapon-readiness deadlines. In particular,
continuation does not recreate a released tractor beam or discarded messages
from this value. This is a description of what is saved, not a rule to reset
all omitted properties. The session also preserves the captain's displayed name,
terminal profile and commission timing for the continuation path.

The source supplies the following conditional restoration behavior **if the
environment resumes that path with a valid roster identity and saved position**:

1. If that roster ship currently has a position, emit fragment(free01) and
   return control to the environment. A subsequent continuation retries from
   this first check.
2. Otherwise, if the saved sector is occupied, emit fragment(free02) and return
   control to the environment. A subsequent continuation also retries from the
   first check; it does not select another sector.
3. Otherwise enter WORLD_CHANGE coordination, retrying entry on failure.
   Reactivate the ship, increment the galaxy's participant count and its
   faction's count, and restore the SavedShipCondition fields.
4. Refresh the account, execution and terminal reporting values from the
   environment. Restore the saved display name, terminal profile and commission
   timing. Place that ship in the saved sector and end the coordinated phase.

The occupancy checks precede coordination entry; the source does not repeat
those checks after entry. This clause does not guarantee successful restoration
against an intervening claim, promise a waiting deadline, or introduce a new
player-visible rejection. It performs no new-ship resource initialization,
random placement or turn completion. It does not remove the recent-commission
history record written by release.

**OPEN QUESTION:** The complete environment-continuation contract is unresolved.
The supplied interruption path does not establish a valid restoring ship
identity after release. Therefore these conditional effects do not define an
available RESUME command, automatic reconnect, or successful restoration
operation. Binding an interruption to that path, restoring captain/session
associations, concurrent claims, ended galaxies and failed environment queries
still require resolution. A repaired continuation policy must be identified
separately.

**Source basis:** [saved values during release](../../legacy/utexas/DECWAR.FOR#L1113),
[conditional restoration](../../legacy/utexas/DECWAR.FOR#L1141),
[interruption caller](../../legacy/utexas/DECWAR.FOR#L4516),
[condition fields](../../legacy/utexas/PARAM.FOR#L43).

## World termination

```text
operation CheckWorldEnd(viewer: CaptainId): Continues | Ended

endCondition = no planets remain
    and (w.baseCounts[FEDERATION] == 0 or w.baseCounts[EMPIRE] == 0)
```

Let w be world(game). If w.ended is false and the end condition is false,
return Continues. Otherwise set w.ended to true and retire the galaxy from
new admission. Perform the following end observations and session effects for
viewer. SET ENDFLG can set w.ended before invoking this operation, without
waiting for the ordinary end condition.
Base-count tests in this operation use w.baseCounts, including updates already
made by a construction or removal that has not finished all its other effects.

Announce the end. If no planets and no bases of either faction remain, announce
total destruction. Then test each faction's base count and give the corresponding
faction-relative outcome messages to the reader.
Report Empire victory if Federation has no bases, then Federation victory if
Empire has no bases. These tests are independent: when both fleets have no bases,
both victory reports follow the total-destruction report in that order. No additional score bonus is awarded.

For an acting captain reaching this check, display final POINTS, release the
commission and end the session, in that order. Without an acting ship, end the
session without a ship report or commission release. Other captains observe
the ended galaxy when they reach a world-end check; the triggering check does
not require their sessions to disappear simultaneously.

The explicit world-end check sites are:

| Site | When the check is reached |
| --- | --- |
| Active command acquisition | After fatal hull/energy handling and condition reporting, before printing the command prompt. |
| Active command wait | When the wait path reaches its no-pending-notice continuation. Pending notices instead lead back through the pre-prompt checks. |
| Planet removal | After updating the surviving planet sequence, its count and affected sector identities. The check also occurs when other planets remain; the ordinary end predicate then governs return. |
| SET ENDFLG | Immediately after setting the ended condition. |
| Restart countdown | After an input wait returns without input, and only when the ended condition is already set. Ready input follows its own continuation first. |

A check returning Continues resumes its caller. Once the check ends the viewer's
session, that caller does not resume: no later weapon, conversion, report or
turn-completion step in its suspended invocation is implied. Earlier completed
effects are not rolled back. Final reporting and commission release precede
session exit as described above; failures during those actions retain their
unresolved contracts.

These sites do not insert a check after every state update or immediately stop
all other participants. A changed end condition and a viewer's observation of
it are distinct events. Fatal-ship handling can precede a world-end check and
has its own reentry behavior.

**OPEN QUESTION:** Forced termination during admission, final-report failures
and the exact timing of other sessions' end observations remain to be closed
with the multiplayer and control contracts. The site inventory does not define
new checks inside interrupted operations or an environment's exit behavior.

**Source basis:** [ENDGAM](../../legacy/utexas/DECWAR.FOR#L961),
[active command acquisition](../../legacy/utexas/DECWAR.FOR#L1184),
[SET ENDFLG](../../legacy/utexas/DECWAR.FOR#L3719),
[planet-removal check](../../legacy/utexas/DECWAR.FOR#L2889),
[restart countdown](../../legacy/utexas/SETUP.FOR#L59).
