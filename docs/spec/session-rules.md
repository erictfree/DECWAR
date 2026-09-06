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

record Session:
    captain: CaptainId
    phase: SessionPhase
    account: AccountIdentity
    execution: ExecutionIdentity
    terminal: TerminalIdentity
    informationActivity: InformationActivity

query session(game: GameState, captain: CaptainId) -> Session
```

Account, execution and terminal identities are supplied by the environment;
a captain's display name does not define any of them. The environment binding
must document their equivalence rules. In particular, returning-player matching
uses account and execution identity together, not display name or terminal alone.

A roster ship without an active position has `position == none`. This is a
semantic absence, not a sector outside the galaxy. Command contracts requiring
an acting ship use its active position. A pregame information command does not
create a ship position merely to satisfy such a contract.

## Startup and pregame

```text
StartupReply ::= empty | "HELP" | "PREGAME"
ActivateCommand ::= "ACTIVATE"

operation StartSession(captain: CaptainId)
    on GameState -> Pregame | AdmissionStarted | SessionEnded

operation Activate(captain: CaptainId)
    on GameState -> AdmissionStarted
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

**Open:** The initial name reader has its own termination/editing rules, distinct
from SET NAME and ordinary command input. Its complete character contract and
interaction with pregame name changes remain to be normalized and specified.
Pregame *ZAP and environment continuation also need their complete contracts.

**Source basis:** [main initialization](../../legacy/utexas/DECWAR.FOR#L1),
[startup and pregame dispatch](../../legacy/utexas/SETUP.FOR#L76),
[pregame matching](../../legacy/utexas/SETUP.FOR#L402),
[initial name reader](../../legacy/utexas/WARMAC.MAC#L3213),
[coordinate interpretation](../../legacy/utexas/DECWAR.FOR#L1403),
[preference reports](../../legacy/utexas/DECWAR.FOR#L4560).

## Admission and faction selection

```text
operation AdmitCaptain(captain: CaptainId)
    on GameState -> Commissioned(ShipId) | Cancelled
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

Accepting a faction adds one to its participant count and one to its cumulative
commission count. These are distinct quantities. Cancellation after this event
removes the participant place and faction participant count, but does not undo
the cumulative commission increment used by POINTS. An earlier cancellation
removes only the overall participant reservation.

### Ship choice and commissioning

Present available ships in the selected faction's roster order. A reply matches
ship names in the full roster's ordinary first-match order, then must designate
an available ship in the selected faction. An unrecognized or wrong-faction
name repeats the choice list; an occupied ship produces the unavailable-ship
report and repeats the list. Empty ship-choice input also repeats the list.

For the selected ship, clear the individual score and establish the new
commission with the initial resources in the abstract game model: energy 5000,
ten torpedoes, shields UP at 100%, zero hull and device damage, five life-support
turns, GREEN condition and stardate zero. Record the captain's environment
metadata and commission start time. This is initialization, not a repair or a
turn-completing action. Select the CRT terminal profile.

Place the ship in an eligible empty sector under the placement rule, then enter
ACTIVE play. Begin reading the installation's initialization commands through
the ordinary command language. Admission does not clear a previously enabled
session privilege merely because a ship was selected.

**Open:** Concurrent claims to the same final ship, cancellation during the
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
GameKindReply ::= empty | "REGULAR" | "TOURNAMENT" [TournamentKey]
OptionReply   ::= empty | "YES" | "NO"

operation CreateGalaxy()
    on GameState
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

Place bases in alternating faction order by base identity: Federation first,
then Empire for each of the ten identities. Place the twenty planets next,
then all stars. Finally ask whether black holes are wanted. Empty input or NO
leaves them absent; YES enables the option and places the chosen number. Other
replies repeat that question. This order determines the random choices' uses;
it does not prescribe a storage representation.

For each object placement, choose a vertical coordinate and then a horizontal
coordinate from 1 through 75. If that sector is occupied, choose another pair.
A placed player ship must also avoid sectors within distance four of opposing
base positions considered by the placement rule. No corresponding planet
exclusion is established by this reconstruction's placement behavior.

**Open:** The treatment of destroyed-base positions in later ship placement
and action-cycle phase when an expired galaxy is reinitialized require
normalization review. Initial placement has no destroyed bases. Exact
random distributions, tournament-key mapping, admission interruption during
creation and exhausted eligible-placement domains remain to be specified.
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
operation BeginInformationActivity(captain, activity)
    on GameState

operation EndInformationActivity(captain)
    on GameState
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

**Open:** Movement or destruction during the activity can interact with the
original sector and the completion position. Complete interleaving rules for
those cases remain to be derived; the contract above does not authorize moving
all concurrent sector effects to the final position or restoring a lost commission.

**Source basis:** [HELP entry and return](../../legacy/utexas/WARMAC.MAC#L4134),
[GRIPE entry and return](../../legacy/utexas/WARMAC.MAC#L3858),
[temporary sector state](../../legacy/utexas/WARMAC.MAC#L4379).

## Releasing a commission

```text
operation ReleaseCommission(actor: ShipId)
    on GameState -> Released | AlreadyAvailable
```

If the ship is already available, the operation has no release effects. Otherwise,
release ends its current commission. At completion:

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
their messages. The ship becomes available for a subsequent commission.

Release does not erase the roster identity, erase faction scores, award a kill,
or advance a turn. It preserves the departing ship's state for the separate
resume mechanism before clearing active presence and energy. That mechanism is
an environment continuation facility, not a new player command named RESUME.
Its full availability and restoration contract remains to be specified.

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

**Open:** Admission reservations and simultaneous releases need their complete
ordering contract. Resume availability, final-report failures and the environment's
clock discontinuities also remain under review.

**Source basis:** [FREE and RSTART](../../legacy/utexas/DECWAR.FOR#L1082),
[history matching](../../legacy/utexas/DECWAR.FOR#L1335),
[history capacity and admission delay](../../legacy/utexas/PARAM.FOR#L30),
[empty-galaxy reuse](../../legacy/utexas/SETUP.FOR#L168).

## World termination

```text
operation CheckWorldEnd()
    on GameState -> Continues | Ended

endCondition = no planets remain
    and (Federation has no bases or Empire has no bases)
```

A galaxy that has not already ended continues while any planet remains, or
while both factions still have a base. When the end condition is met, retire
it from new admission and mark it ended. SET ENDFLG can also request termination
without waiting for that condition.

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

World-end checks occur before the active command prompt and while awaiting
input, as well as at the command-specific checks stated elsewhere. Fatal-ship
handling can precede a world-end check and has its own reentry behavior.

**Open:** Complete command-specific check placement, forced termination during
admission, final-report failures and the exact timing of other sessions' end
observations remain to be closed with the multiplayer and control contracts.

**Source basis:** [ENDGAM](../../legacy/utexas/DECWAR.FOR#L961),
[active command acquisition](../../legacy/utexas/DECWAR.FOR#L1184),
[SET ENDFLG](../../legacy/utexas/DECWAR.FOR#L3719).
