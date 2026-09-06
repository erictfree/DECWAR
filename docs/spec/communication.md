# Communication

A radio message has an identity, sender, original recipient set, remaining
recipient set and text body. Ship identities remain distinct from the Romulan
and system senders. Original recipients and body are fixed at publication;
delivery removes only the receiving ship from remaining recipients.

## Publishing a message

```text
operation PublishMessage(sender: MessageSender, recipients: Set<ShipId>,
                         body: Text)
    on GameState -> Published(MessageId) | NotPublished
```

TELL defines recipient selection and body acquisition. `PublishMessage` receives
that selected audience and acquired body; it does not repeat recipient-readiness
checks. An empty recipient set returns NotPublished without obtaining capacity.
Let service be world(game).radioService. Successful publication creates one
message with a new identity:

```text
message.sender              == sender
message.recipients          == recipients
message.remainingRecipients == recipients
message.body                == first 75 characters of body
```

Append that message to service.messages. Its position in that sequence defines
publication order, independently of when composition began or capacity was
obtained. The original recipient set is nonempty, and remainingRecipients is
always a subset of recipients.

Messages are available to their recipients in publication order. No recipient
can read an incomplete body. Publication does not imply immediate display, and
consumption by one recipient does not withdraw the message from another.

The radio service has capacity for 32 messages, including publications in
progress. Its occupied capacity is:

```text
size(service.messages) + size(service.publicationsInProgress)
```

Before storing a body, the operation obtains one place and adds a fresh
PublicationId to service.publicationsInProgress. Publishing replaces that
in-progress identity with the new Message. Abandoning a short body removes
the in-progress identity without creating a message. No receiver can observe
a publication that has only obtained capacity.

At capacity, the loss policy selects the first remaining recipient,
in roster order, of the oldest published message. That ship loses its entire
unread backlog. All other ships retain their unread messages. A message no
longer unread by anyone ceases to occupy capacity. If capacity is still full,
the policy applies again. It imposes no energy or score penalty.

A body shorter than two characters emits NoMessageSent and returns NotPublished.
The capacity-loss policy
can nevertheless have taken effect before this rejection; lost messages are not
restored. Cancelling at the body prompt does not submit a publication.
Failure to obtain access at the initial capacity-acquisition step returns
NotPublished. Once a body is accepted for publication, temporary unavailability
at the publication step delays completion: it does not turn that accepted
publication into a successful return with a missing message. No finite wait or
fairness guarantee follows from this rule.

**Open:** The complete multiplayer admission, waiting, interruption and
failure conditions remain to be specified, including the case where all capacity
belongs to publications in progress. These gaps do not establish a random
message-loss rate, fairness guarantee or automatic timeout.

**Source basis:** [publication and capacity](../../legacy/utexas/WARMAC.MAC#L2589),
[MAKMSG](../../legacy/utexas/WARMAC.MAC#L2963),
[capacity limit](../../legacy/utexas/PARAM.FOR#L16).

## Receiving a message

```text
record RadioHeading:
    sender: ShipId | ROMULAN
    recipients: Sequence<ShipId>

record MessageObservation:
    heading: Optional<RadioHeading>
    body: Text

operation ReceiveMessage(receiver: ShipId)
    on GameState -> Displayed(MessageId)
                 | Suppressed(MessageId) | NoMessage
```

Let r be ship(game, receiver), and let c be the captain identified by r.captain.
This reception contract requires an active commission with a present captain;
commission release uses the discard operation below. Let service be
world(game).radioService. The selected message m is the first entry in
service.messages whose remainingRecipients contains receiver. If one is
received, its state effect is:

```text
after(m.remainingRecipients)
    == before(m.remainingRecipients) - {receiver}
```

Its original sender, audience and body are unchanged. No other recipient's
unread status changes. A message with no remaining recipients ceases to occupy
capacity. When no message is received, the outcome is `NoMessage` and no message
is displayed or consumed.

If m.sender is a ShipId in c.radio.gaggedSenders,
the outcome is `Suppressed(m.id)` and nothing is displayed. Otherwise the outcome
is `Displayed(m.id)`. In both cases the message has been consumed. A Romulan or
system sender is distinct from every player-ship identity.

Turning the radio off or suffering radio damage after publication does not
revoke an already addressed message. Those checks happen during TELL recipient
validation. Leaving a commission discards that ship's unread messages under the
release rules.

For Displayed(m.id), emit a MessageObservation with body m.body. Its heading
is absent when m.sender is SYSTEM. Otherwise the heading contains m.sender
and the members of m.recipients in roster order. Displayed player and Romulan
messages identify the sender and show those original recipient initials,
followed by the body. The audience shown does not shrink as others receive it.
The [radio presentation](presentation.md#radio-message-bodies-and-headings)
supplies line endings and separators; they are not part of the retained body text. A suppressed
message produces no MessageObservation.

**Open:** The complete scheduling and shared-state availability rules for message
reception remain part of the multiplayer contract.

**Source basis:** [GETMSG](../../legacy/utexas/WARMAC.MAC#L3036),
[OUTMSG](../../legacy/utexas/DECWAR.FOR#L2599),
[release](../../legacy/utexas/DECWAR.FOR#L1082).

## Discarding an unread audience

```text
operation DiscardUnread(receiver: ShipId)
    on GameState -> Discarded
```

Let service be world(game).radioService. For each m in service.messages:

```text
m.remainingRecipients -= {receiver}
```

Remove any resulting message with no remaining
recipients from the service. Retain the order of all remaining messages and
leave their original recipients, sender and body unchanged. No message is
displayed and no gag, radio, resource or score property changes. Applying this
operation to a ship with no unread messages changes nothing.

The capacity-loss policy and commission release use this effect. It does not
unsubscribe the ship from future messages or remove it from a publication that
is still in progress. The ordering of release against such an overlapping
publication remains part of the unfinished lifecycle contract.

**Source basis:** [capacity-loss removal](../../legacy/utexas/WARMAC.MAC#L2624),
[message recipient removal](../../legacy/utexas/WARMAC.MAC#L2710),
[release consumption](../../legacy/utexas/DECWAR.FOR#L1125).

## Autonomous Romulan speech

An autonomous speech event chooses a recipient group, opening, adjective and
noun, in that order. These are discrete choices among the alternatives below.
The Romulan action rules determine when such an event occurs; a player typing
TELL ROMULAN does not invoke it.

| Part | Alternatives in choice order |
| --- | --- |
| Audience | Both factions; Federation; Empire. |
| Opening | `Death to `; `Destruction to `; `I will crush `; `Prepare to die, `. |
| Adjective | `mindless `; `worthless `; `ignorant `; `idiotic `; `stupid `. |
| Audience qualifier | `sub-Romulan ` for both factions; `human ` for Federation; `klingon ` for Empire. |
| Noun | `mutant`; `cretin`; `toad`; `worm`; `parasite`. |

Concatenate the chosen opening, adjective, audience qualifier, noun and `s!`.
Preserve spelling, capitalization and spaces. The audience qualifier follows
the audience choice; it is not independently selected. Validate potential
recipients using TELL's radio-damage, commission and radio-on checks. Publish
only if recipients remain. The original sender is the Romulan.

The general discrete-choice notation applies; this chapter does not prescribe a
random-number generator. Exact probability
and reproducibility requirements remain in the randomness work.

An autonomous speech event runs on behalf of the triggering captain identified
by [AdvanceRomulan](autonomous.md#activation-and-appearance). It does not enable
that captain's radio or require that ship's radio device to be undamaged.
After validating the chosen audience, remove those recipients from the
triggering captain's own gaggedSenders set. This ungagging occurs before
publication, so it remains even if publication fails. Other captains' gag choices
are unchanged. The triggering ship is not excluded from a Romulan audience.
Recipient-validation diagnostics, including an empty-audience report, are
available to the triggering captain; they are not new radio publications.

**Source basis:** [ROMSPK](../../legacy/utexas/WARMAC.MAC#L4672),
[TELL's autonomous path](../../legacy/utexas/DECWAR.FOR#L3977).


## Combat notices

Combat notices convey game observations produced by weapon impacts, novas,
base distress or destruction, Romulan appearance, energy transfers and tractor
changes. They are distinct from the text messages composed by TELL. A notice
can concern several ships, yet has one identity and one immutable observation.
Whenever a game clause publishes one of these combat observations, it uses
PublishNotice with that clause's selected recipients. Direct command diagnostics
and informational reports are not thereby turned into queued combat notices.

### Notice service ADT

```text
enum StarOutcome = EXPLODED | UNAFFECTED
record StarObservation:
    position: Position
    outcome: StarOutcome

enum TorpedoOutcome = MISSED | ABSORBED | NEUTRALIZED
record TorpedoObservation:
    shot: positive integer
    position: Position
    outcome: TorpedoOutcome

enum BaseNoticeReason = DISTRESS | DESTROYED
record BaseObservation:
    base: BaseId
    position: Position
    reason: BaseNoticeReason

record EnergyTransferObservation:
    sender: ShipId
    recipient: ShipId
    received: Energy

enum TractorObservation = ACTIVATED | BROKEN

type CombatObservation = Impact(ImpactObservation)
    | StarEvent(StarObservation) | TorpedoEvent(TorpedoObservation)
    | BaseEvent(BaseObservation) | RomulanDetected(Position)
    | EnergyReceived(EnergyTransferObservation)
    | TractorEvent(TractorObservation)

enum CombatObservationKind = WEAPON_HIT | NOVA_HIT
    | STAR_EXPLOSION | STAR_UNAFFECTED
    | TORPEDO_MISS | TORPEDO_ABSORBED | TORPEDO_NEUTRALIZED
    | BASE_DISTRESS | BASE_DESTROYED | ROMULAN_DETECTED
    | ENERGY_TRANSFER | TRACTOR_ACTIVATED | TRACTOR_BROKEN

query observationKind(observation: CombatObservation)
    -> CombatObservationKind

abstract type NoticeId
ordered type PublicationOrder

type NoticePriority = integer in 1..40

record CombatNotice:
    id: NoticeId
    publisher: ShipId
    priority: NoticePriority
    publication: PublicationOrder
    observation: CombatObservation
    recipients: Set<ShipId>
    remainingRecipients: Set<ShipId>

record CombatNoticeService:
    notices: Set<CombatNotice>

query nextNotice(game: GameState, receiver: ShipId)
    -> Optional<CombatNotice>

operation PublishNotice(publisher: ShipId, recipients: Set<ShipId>,
                        observation: CombatObservation)
    on GameState -> Published(NoticeId) | NotPublished

operation ReceiveNotice(receiver: ShipId)
    on GameState -> Displayed(NoticeId) | Suppressed(NoticeId) | NoNotice

operation DiscardNotices(receiver: ShipId)
    on GameState -> Discarded
```

CombatObservation is an immutable value supplied by the producing clause.
ImpactObservation composes weapon and nova results with their origin and target
snapshots. The alternatives and their information content are defined below. The delivery service treats
each value as a whole: it neither applies damage nor constructs missing weapon
fields. It cannot substitute an arbitrary TELL body for the observation. Detailed
text presentation belongs to the terminal binding; this ADT defines preservation,
selection and loss independently
of a rendering or network format.
observationKind distinguishes the listed game events; a deflected torpedo hit
is WEAPON_HIT, with its deflected property in the hit result. A producing clause
determines the kind; it is not a recipient-selected filtering option.

Let service be world(game).combatNotices. Each present notice has a nonempty
remainingRecipients set, contained in its original recipients. Distinct notices
have distinct identities and publication orders. For a given publisher,
priorities are unique among its present notices. PublicationOrder is chronological
order of completed publication events; it has no wraparound or time unit.

A publisher has capacity for forty notices. Its priorities determine delivery
preference and reuse, not addresses or a required array. There are eighteen
possible publisher ships, so the service holds at most 720 notices. Capacity
belongs to the publisher, not to an individual recipient or the faction of the
attacker named in the observation. A nested Romulan or installation action uses
the ship of its performing captain as publisher, while retaining the actual
attacker in the observation.

### Impact observation ADTs

An impact observation combines the acting object's reported state with the
result of one weapon or nova effect. These are immutable report values, not
additional ships or installations in World.

```text
record ShipImpactState:
    ship: ShipId
    position: Position
    shields: Shields

record BaseImpactState:
    base: BaseId
    position: Position
    strength: Percentage

record PlanetImpactState:
    planet: PlanetId
    owner: Optional<Team>
    position: Position
    builds: nonnegative integer

record RomulanImpactState:
    position: Position
    energy: Energy

type ImpactObject = ShipState(ShipImpactState)
                  | BaseState(BaseImpactState)
                  | PlanetState(PlanetImpactState)
                  | RomulanState(RomulanImpactState)
type ImpactOrigin = ObjectOrigin(ImpactObject) | StarOrigin(Position)
enum ImpactKind = PHASER | TORPEDO | NOVA

record ImpactObservation:
    origin: ImpactOrigin
    target: ImpactObject
    kind: ImpactKind
    damage: Optional<Damage>
    critical: Optional<CriticalHit>
    deflected: Boolean
    displacement: DisplacementResult
    destruction: Optional<DestructionCause>
```

Shields, Percentage, Energy and the identity types are defined in the abstract
model. CriticalHit and DisplacementResult are the shared combat result types.
The origin must be StarOrigin exactly when kind is NOVA; PHASER and TORPEDO
use ObjectOrigin. A planet target has absent damage, and the other target kinds
have the damage supplied by their effect rule. Every embedded state, including
Shields, is a value snapshot. The origin is the object that made this hit: a firing ship, installation or
Romulan, or the exploding star. It is not the publisher used for delivery
priority, nor necessarily the captain credited with the damage. A nova reports
the star as origin even when a player started the chain.

For a ship or base hit by a weapon, set kind from WeaponHit.weapon and copy
damage, critical, deflected, displacement and destruction from that result. Construct its ShipImpactState or
BaseImpactState using the target identity and the defense recorded in that
result. The position is the target's resulting position for Moved, the
black-hole destination for Swallowed, or its recorded impact position for Stayed.
A fatal direct hit retains that impact position. Preserve the recorded base
strength even when destruction cleanup has set the base's stored strength to
zero. The TargetAlreadyFatal outcome does not supply a WeaponHit; its incomplete
caller-report contract remains open.

For a weapon hit on the Romulan, set kind from RomulanHit.weapon, copy its
damage, and set the target's energy to RomulanHit.remainingEnergy. The caller's subsequent torpedo displacement, if any, supplies
displacement and any additional destruction. Destruction is DIRECT_DAMAGE when
the hit itself destroyed the Romulan, BLACK_HOLE when the following displacement
did so, and absent otherwise. critical is absent and deflected is false. The
reported position is the resulting or last occupied Romulan position, including
its last occupied position when swallowed. Its energy is the hit's remaining
energy, not a fabricated shield percentage or a later sensor query.

For a weapon hit on a planet, report its identity, ownership at impact, position
and nonnegative remaining build count. damage and critical are absent; deflected
is false and displacement is Stayed. kind is the weapon used. destruction is
DIRECT_DAMAGE if that planetary effect destroyed it, otherwise absent. A phaser
hit that leaves zero builds does not destroy the planet. Preserve these values
before removal or a subsequent change of ownership; no damage number is inferred
from the reduction in builds.

For a nova result hit, set origin to StarOrigin(hit.origin), kind to NOVA,
and copy its damage, displacement and destruction. Translate its target
identity, position and defense to the
corresponding ImpactObject. For a planet include its ownership at impact before
removal. critical is absent and deflected is false. Use NovaHit.position even
when Swallowed carries a different black-hole destination. The Romulan's nova
amount is the specified zero damage with a separate energy reading; the planet's
nova amount is absent. A base swallowed by a nova retains BLACK_HOLE in the
effect value, although its presentation announces only destruction.

### Origin snapshots and information disclosed

The origin carries the position and resource reading selected by the firing
clause. Player phasers report the shooter's shield mode and strength for the
resolved shot before its final firing-energy charge. Player torpedoes record
those values at the start of the shot; a preceding base distress publication
must not erase them. Base defense reports the firing base's strength. Planet
defense reports its owner and builds used for the defensive shot. In CAPTURE,
these are the former owner and former build count, although the planet now
belongs to the actor and its builds have been consumed. Romulan attacks report
its firing position and energy. None of these origins includes the firing
ship's hull damage, engine energy, device damage or pending score.

A surviving ship target reports its shield mode and strength; a surviving base
reports its strength; a surviving Romulan reports its energy. A planet reports
its nonnegative remaining builds. Destruction suppresses the ship/base/Romulan
strength suffix in the terminal presentation, without discarding the recorded
effect value. The display of a planet's builds is not a numerical damage report.

For DeviceCritical, only the captain of that surviving target ship receives the
extra device name and added device-damage amount in the hit presentation. Other
recipients see the ordinary hit, not that device detail. A nova has no singled-out
device critical, even though its ship effect can damage all nine devices. A base
critical or destruction has its additional emergency report only in LONG output.

A player torpedo's deflection has the special deflection wording in MEDIUM and
LONG; SHORT presents its zero-damage torpedo hit. A Romulan torpedo uses ordinary
torpedo-hit wording even when the damage result has deflected true. This output
difference does not apply damage or undo the deflection. For all origins, a
friendly-object neutralization has a separate TorpedoObservation.

These composition rules consume existing effect results. They add no draw,
weapon charge, score credit, displacement or turn. They also do not broaden an
impact's recipients: the firing, installation or nova clause still determines
its audience. The [combat presentation](presentation.md#combat-observation-bodies) supplies
body composition. Complete control-character behavior and concurrent snapshot
boundaries remain part of the terminal and multiplayer work.

**Source basis:** [base defense](../../legacy/utexas/DECWAR.FOR#L375),
[capture snapshot](../../legacy/utexas/DECWAR.FOR#L629),
[nova observations](../../legacy/utexas/DECWAR.FOR#L2259),
[hit display](../../legacy/utexas/DECWAR.FOR#L2417),
[player phasers](../../legacy/utexas/DECWAR.FOR#L2694),
[planet defense](../../legacy/utexas/DECWAR.FOR#L2800),
[Romulan phasers](../../legacy/utexas/DECWAR.FOR#L3289),
[Romulan torpedoes](../../legacy/utexas/DECWAR.FOR#L3461),
[player torpedoes](../../legacy/utexas/DECWAR.FOR#L4286),
[Romulan target position](../../legacy/utexas/DECWAR.FOR#L4375).

### Observation values

A StarObservation identifies the star's position and whether it exploded or
remained unaffected by the torpedo. EXPLODED maps to STAR_EXPLOSION; UNAFFECTED
maps to STAR_UNAFFECTED. It contains no firing-ship identity, weapon damage or
shield strength. The displayed subject is the star. The initial explosion
announcement precedes ExplodeStar; an announcement for a later star in a nova
chain identifies that later star's position. Receiving either announcement does
not remove a star or start another explosion.

A TorpedoObservation identifies a shot within the firing burst, its reported
position and its outcome. MISSED, ABSORBED and NEUTRALIZED map respectively to
TORPEDO_MISS, TORPEDO_ABSORBED and TORPEDO_NEUTRALIZED. The shot number is the
one-based launch ordinal in that burst, not an object identity or a cumulative
torpedo count. Its position is determined by the path result:

```text
if outcome == MISSED:
    position == trace.lastClear
else:
    position == trace.obstruction.position
```

An absorbed shot encountered a black hole. A neutralized shot encountered a
friendly ship, base or planet. Neither observation claims damage to the
obstruction. A miss at the galaxy boundary reports the last clear sector inside
the galaxy, not the intended aim or an outside coordinate. These three notices
address the shooter only. A misfire diagnostic is separate: a misfired shot can
still travel and produce one of these outcomes or an ordinary impact.

A BaseObservation contains the base identity, its recorded position and the
reason for the announcement. DISTRESS maps to BASE_DISTRESS and DESTROYED to
BASE_DESTROYED. The base's faction follows from BaseId. The value contains no
attacker identity or damage amount. The firing or nova clause determines when
the announcement is produced and its faction-wide audience. A base's destruction
can therefore produce both a nearby impact observation and a distinct
faction-wide BaseObservation. Rendering the latter does not require that the
base still be present, or report a new base later created with the same identity.

RomulanDetected(position) has kind ROMULAN_DETECTED. It identifies the Romulan
at its appearance position and contains no energy reading. Appearance's nearby
and privileged-recipient rules determine its audience. Movement before delivery
does not replace that position or cancel the observation.

EnergyReceived(value) has kind ENERGY_TRANSFER. Its sender and recipient are
the two ships in TransferEnergy; received is the amount actually added to the
recipient's engine energy. It is neither the requested amount nor the amount
charged to the sender. Publish to the recipient only, after the energy changes;
the sender's immediate completion report is separate. A successful transfer
limited to zero by recipient capacity still produces a zero-amount observation.
The report does not disclose either ship's remaining energy.

TractorEvent(ACTIVATED) and TractorEvent(BROKEN) have kinds TRACTOR_ACTIVATED and
TRACTOR_BROKEN. They announce establishment or release of a tractor association
to its two endpoints. Their bodies do not identify the endpoints, a towing
ship or a cause of release. The association operation selects the recipients;
there is no additional recipient field inside the body. Reception does not
establish or release a beam a second time. A delayed activation observation can
be displayed after that association has already ended.

For observationKind, Impact with kind NOVA maps to NOVA_HIT; Impact with kind
PHASER or TORPEDO maps to WEAPON_HIT. A deflected torpedo remains a weapon-hit observation, with the
explicit deflected property and zero damage in WeaponHit. It is distinct from
a torpedo neutralized by a friendly object.

All positions and amounts above belong to the observed event. They are not
requests for a new sensor query at reception. Object names follow the identities
and the receiver's current output preference; relative positions use the
receiver's current position under ReceiveNotice.

**Source basis:** [energy transfer](../../legacy/utexas/DECWAR.FOR#L1062),
[phaser/base announcements](../../legacy/utexas/DECWAR.FOR#L2720),
[Romulan appearance](../../legacy/utexas/DECWAR.FOR#L3253),
[nova-chain announcements](../../legacy/utexas/DECWAR.FOR#L3845),
[torpedo outcomes](../../legacy/utexas/DECWAR.FOR#L4304),
[tractor notifications](../../legacy/utexas/DECWAR.FOR#L4497),
[observation presentation](../../legacy/utexas/DECWAR.FOR#L2392).

### Publication and capacity loss

The publisher must be a roster ship associated with the performing captain.
An empty recipients set returns NotPublished without obtaining capacity or
removing an existing notice. Recipient selection and any radio-on filtering
belong to the producing game operation; publication does not repeat those tests.

Among the publisher's priorities, choose the lowest one not currently used.
If all forty are in use, choose the priority of that publisher's oldest notice
by publication order, and remove that notice for every remaining recipient.
This loss adds no score penalty and emits no separate warning. It does not
discard any recipient's other notices or any other publisher's notices.

Publish a new notice at the chosen priority with a fresh identity and a
publication order later than preceding publication events. Its publisher and
observation are the supplied values. Both recipient sets initially equal the
supplied recipients. Return Published of the new identity.

The observation, original recipients, publisher, priority and publication order
remain fixed for that notice's lifetime. Only remainingRecipients shrinks.
Receiving a notice does not move later notices to a different priority. Freed
priorities can therefore be reused by a later publication before older notices
at higher priorities have been read.

A published observation is complete and independent of other observations.
Publishing a base distress notice, for example, does not clear a following
nova's damage value. Later target movement, damage or destruction cannot change
the positions, strengths or amounts already included in a published observation.

### Selection and reception

nextNotice selects among notices whose remainingRecipients contains receiver.
First prefer the publisher appearing earliest in ship roster order; among that
publisher's notices, prefer the lowest priority. Return none if no notice is
addressed to receiver. Publication time is not the delivery-order comparison.
Calling this query has no state effect.

ReceiveNotice requires a receiver with a captain association, including a ship
that has just been destroyed but has not completed commission release. If
nextNotice returns none, give NoNotice and emit nothing. Otherwise let n be the
selected notice. Remove receiver from n.remainingRecipients and remove n from
service when no recipients remain. Other recipients retain the same observation
and their unread status. The terminal binding's leading conditional blank-line
request in LONG output precedes the following presentation check.

For BASE_DISTRESS or BASE_DESTROYED, suppress the observation body if the
receiver's radio is off or its radio-device damage is greater than 300 damage
units. Give Suppressed(n.id); the notice has still been consumed. Damage exactly
300 does not suppress it. This reception check is additional to the producing
operation's faction and radio-on recipient selection. Restoring the radio later
does not restore a consumed notice. The leading LONG-format separator can still
have been emitted before suppression.

All other kinds give Displayed(n.id) and present n.observation regardless of
radio-enabled or radio-damage state. No notice kind uses sender-gag filtering.
For base kinds that pass their reception check, also present n.observation and
give Displayed(n.id). Presentation uses the receiver's current output and
coordinate preferences. Positions and
resource values contained in the observation remain the published ones; relative
coordinates are displayed from the receiver's current position. Rendering a
notice cannot apply the associated hit or award its score a second time.

The delivery preference can make a later publication appear before an older
one. A newly reused low priority precedes a still-unread higher priority from
the same publisher, and every eligible notice from an earlier publisher precedes
ones from a later publisher. Do not replace this rule with one chronological
list of all battles.

### Discarding and acquisition boundaries

DiscardNotices removes receiver from every remainingRecipients set and removes
notices whose remaining set is then empty. It emits nothing and changes no
combat, radio or score state. Applying it when no notice is addressed to receiver
has no effect. Commission release uses this operation for the departing ship.
It does not erase notices merely because that ship was their publisher: other
recipients can still receive observations it published before departure.

Ordinary return to active command acquisition drains pending combat notices
before pending radio messages, before the remaining post-command delay and the
new command prompt. At a command-input polling boundary that finds pending
notices or messages, drain combat notices first and radio messages second, then
return to the command-state checks and prompt. Draining means repeated reception
until no corresponding unread item remains; it does not advance a turn. A
publication arriving during that activity follows the same next-item selection
rule if it is observed before draining completes.

**Open:** Complete terminal-control behavior, concurrent observation boundaries,
publication/reception interleavings and the release-versus-new-publication window
remain to be closed. This contract preserves complete observations; it does not
make the entire firing command, drain loop or commission release indivisible.
No extra battle is inferred from a failed attempt to obtain a next notice.

**Source basis:** [notice capacity](../../legacy/utexas/WARMAC.MAC#L183),
[publication](../../legacy/utexas/WARMAC.MAC#L2771),
[reception](../../legacy/utexas/WARMAC.MAC#L2880),
[command acquisition](../../legacy/utexas/DECWAR.FOR#L1184),
[notice display](../../legacy/utexas/DECWAR.FOR#L2392),
[release](../../legacy/utexas/DECWAR.FOR#L1120).
