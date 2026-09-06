# Radio communication

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
