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
Terminal presentation supplies line endings and separators. A suppressed
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
abstract type CombatObservation
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
    on GameState -> Displayed(NoticeId) | NoNotice

operation DiscardNotices(receiver: ShipId)
    on GameState -> Discarded
```

CombatObservation is an immutable game observation supplied by the producing
clause, such as a WeaponHit or NovaHit with its stated origin and target reports.
The delivery service treats that value as a whole: it neither applies damage
nor constructs missing weapon fields. It cannot substitute an arbitrary TELL
body for the observation. Its detailed presentation belongs to the observation's
terminal binding; this ADT defines preservation, selection and loss independently
of a rendering or network format.

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
selected notice. Remove receiver from n.remainingRecipients, then present
n.observation and give Displayed(n.id). Remove n from service when no recipients
remain. Other recipients retain the same observation and their unread status.

No radio-enabled, radio-damage or sender-gag check is repeated during reception.
Those properties cannot suppress an already addressed combat notice. Presentation
uses the receiver's current output and coordinate preferences. Positions and
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

**Open:** The complete observation-value catalogue and terminal rendering,
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
