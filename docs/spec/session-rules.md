# Sessions and commissions

A session is a captain's participation in a game environment. A commission is
the right to operate one roster ship in a particular galaxy. Ending a commission
and destroying a ship are distinct events: fatal damage does not by itself
complete every release, reporting or session-exit effect.

This chapter defines the activity and release contracts needed by the drafted
commands. Full startup, admission, restart and termination contracts remain in
progress.

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
