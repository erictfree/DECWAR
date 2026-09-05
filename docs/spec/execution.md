# Execution and multiplayer ordering

Status: main-loop and queue algorithms are drafted. Event delivery and lock
failure interleavings still require review; this is not a full
concurrency conformance model.

## EXEC-1 — Commands are ordered operations

Receiving a line, choosing a command, validating arguments, applying state
changes, emitting output and completing a pause are distinct events. A failure
can occur after some effects have happened. An implementation MUST NOT assume
that every failed command rolls back all effects or that every command is atomic.

For example, MOVE draws its speed-penalty random value before reading coordinates;
a later invalid range does not undo that draw. After nonzero coordinates are
resolved it sets green condition and clears docking before checking movement
limits. BUILD increments the build count and pending score before attempting its
fifth-build planet lock. These orderings are observable and must be represented
rather than replaced by a validate-everything-then-commit abstraction.

**Evidence:** [MOVE](../../legacy/utexas/DECWAR.FOR#L2141),
[BUILD](../../legacy/utexas/DECWAR.FOR#L523).

## EXEC-2 — Command acquisition

On return to command acquisition, release the public locks, deliver pending hit
notifications before radio messages, flush output, configure interrupt handling,
and honor the previous command pause unless privilege bypasses it. Clear the
stored pause after that handling.

Before displaying a prompt, check active-session identity, fatal hull damage,
exhausted energy and world termination. Energy at or below 10000 sets yellow
condition in this path. Fatal damage or exhausted energy enters final scoring
and release; after release the main routine can return to pregame. Pending hits
and messages during input waiting are processed and can cause another prompt.

Ordinary input waits use a 2000-millisecond interval. An input wait is not itself
a game turn. The declared DSHIP periodic cleanup call is commented out in the
Austin command-wait path and MUST NOT become an active timer merely because
that subroutine exists.

**Evidence:** [GETCMD](../../legacy/utexas/DECWAR.FOR#L1184),
[main return to pregame](../../legacy/utexas/DECWAR.FOR#L42).
**Open:** the already-pending control loop is U-CONTROL; this draft does not
normalize it to the playable host's repaired path.

## EXEC-3 — Turn completion classes

Commands select their completion path as well as their direct effects:

| Successful normal path | Commands |
| --- | --- |
| Automatic device repair, then world/turn accounting | BUILD, CAPTURE, DOCK, IMPULSE, MOVE, REPAIR |
| World/turn accounting without automatic device repair | PHASERS, TORPEDOS |
| Return to command acquisition without this turn accounting | BASES, DAMAGES, ENERGY, GRIPE, HELP, LIST, NEWS, PLANETS, POINTS, RADIO, SCAN, SET, SHIELDS, SRSCAN, STATUS, SUMMARY, TARGETS, TELL, TIME, TRACTOR, TYPE, USERS, *DEBUG, *PASSWORD |
| Exit/confirmation path | QUIT |

Alternate abort returns bypass normal accounting; REPAIR has a time-dependent
alternate return. The table describes normal return destinations, not a promise
that any typed command consumes a turn. MOVE/IMPULSE also test ship state before
selecting their normal completion destination.

**Evidence:** [main dispatch](../../legacy/utexas/DECWAR.FOR#L57).

## EXEC-4 — World and score accounting

At an accounting event, increment the shared world-action counter. If it reaches
the current admitted-player count, reset it to zero and perform, in this order:
enemy base phaser defense, planet defense, base rebuilding and (when enabled)
Romulan action. Those operations use the acting context, not an independent
periodic wall-clock simulation.

Then increment the acting ship's turns and its team's turns. When life-support
device damage is at least 3000, decrement life-support reserve if undocked. A
reserve below zero makes hull damage fatal at 25000. Normal-prompt mode emits
the life-support warning on this path.

Finally, for each of the eight score categories, add the pending score change
to ship and team totals, then clear that pending change. The order is part of
the transition even if output or later cleanup observes it.

**Evidence:** [main labels 3500–3700](../../legacy/utexas/DECWAR.FOR#L239).

## EXEC-5 — Time and host boundary

Use explicit clock inputs for elapsed game time, time of day and session CPU
accounting. Game turns are counts, not a substitute for elapsed milliseconds.
Many commands compute a deadline before interactive input and later set their
remaining pause to deadline minus current elapsed time. Input and output time
can therefore reduce or exhaust the eventual pause.

An implementation need not emulate baud transmission or a PDP-10 instruction
clock. A future conformance profile must state what clock/terminal-speed inputs
are held equal and which output/event order is compared. UTC, FIFO lock grants,
Node timer behavior and synthetic job identities are port choices, not implied
requirements of the Austin core (U-MONITOR).

**Evidence:** [BUILD deadline](../../legacy/utexas/DECWAR.FOR#L523),
[REPAIR deadline](../../legacy/utexas/DECWAR.FOR#L3190),
[TIME observations](../../legacy/utexas/DECWAR.FOR#L4066).

## EXEC-6 — Hit delivery storage and loss

Hit notifications use 720 slots, divided into 40 slots for each commissioning
identity. Enqueue uses the acting session's identity to select a partition,
including notifications about autonomous actions during that session. If the
recipient set is empty, publish nothing and clear the hit working fields.
Otherwise scan that partition in slot order: take its first entry with an empty
recipient set, or, when all are occupied, the entry with the smallest stored
serial value. Replace that entry even if earlier recipients have not read it.
Increment the shared serial and store its low 18 bits with the new entry.
Serial wrap is not an unbounded chronological comparison.

Store the payload before publishing its recipient set. Increment each selected
recipient's hit flag. Clear the sender's recipient set and all hit working fields:
source/target, amount, critical amount/device, type, positions, kill flag, shield
modes/strengths and displacement. This reset also occurs when no recipient exists.
It affects the next combat call's initially clear kill/critical fields.

Retrieval decrements the requested player's hit flag first. A negative result
returns cleared fields. Otherwise scan all 720 slots in physical slot order and
retrieve the first whose remaining recipient set includes that player. This is
not global serial order. If no slot matches, return cleared fields; the hit flag
is not repaired to a count of matching slots by that path. On success return the
payload and current remaining recipient set, then remove only this player's
membership. The slot becomes reusable when no recipients remain.

Payload conversion is observable even with modern storage. Source/target codes,
hit amount and critical amount retain low 18 bits; decode them unsigned, except
code 262143 becomes zero. Type and device retain four bits; coordinates retain
seven; kill status two; shield strengths ten; displacement one. A positive shield
mode stores its low bit, while a nonpositive mode stores zero; decode zero as −1
and one as +1. This can make a negative intermediate amount appear as a large
positive reported amount. Store neither arbitrary-precision values nor the
original object by reference in place of these conversions.

The enqueue/retrieve assembly does not call the queue lock used by radio messages.
Concurrent publication and serial updates therefore still require an interleaving
model; the ordering above does not promise an atomic modern queue operation.

**Evidence:** [queue capacities](../../legacy/utexas/WARMAC.MAC#L183),
[MAKHIT](../../legacy/utexas/WARMAC.MAC#L2771),
[GETHIT](../../legacy/utexas/WARMAC.MAC#L2880).

## EXEC-7 — Radio message queue

Radio messages use a separate 32-entry queue with publication-order links. Reserve
the first available slot under queue exclusion. If none is available, inspect the
oldest published entry, choose the lowest-numbered recipient still assigned to
it, and remove that recipient from every queued message. Entries with no remaining
recipients become free. Retry reservation. This evicts a recipient's whole queued
backlog; it is not a policy of dropping only the oldest message. Flags need not
remain equal to the number of available entries after eviction.

Reservation failure returns without publishing. Successful reservation marks the
slot unavailable, then releases exclusion while the body is copied. Publication
reacquires exclusion, retrying failures, and appends the entry to the queue's tail.
It increments each recipient's message flag. A message's header retains its
original sender and recipient set; separate remaining-recipient membership changes
as captains read it. Source/header fields retain their low 18 bits.

Retrieval decrements the player's message flag. On underflow, no matching entry,
or failed search exclusion, reset that flag and the returned sender/recipient set
to zero. Otherwise find the first published matching entry, copy its original
header and body, and remove this recipient under exclusion, retrying removal
failures. Release the entry when no recipients remain. A source header of 262143
is returned as zero. The analogous destination-sentinel branch contains a distinct
memory instruction and is tracked by U-MESSAGE-EDGE.

The output loop consumes messages until the flag is zero. For a nonzero sender,
check the receiving session's gag set against the sender identity. A gagged message
has already been removed from the queue and produces no text. Otherwise display
sender and the original recipient initials in roster order, then the body.
Zero-sender messages use the body path without that heading. Gag filtering is a
delivery-time choice; recipient filtering at send time is GAME-RADIO.

Message acquisition uses an explicit supplied string, raw text after the first
semicolon in the existing line, or a `Msg: ` prompt. The copy loop scans through
the end-of-line character even when its storage limit has been reached. With the
source's 17-word entry and preincremented copy counter, at most 75 body characters
survive; append CR, LF and NUL by overwriting the last stored character with CR.
A scanned count of at most two, including the terminating character, takes the
“No message sent” path. That path and interrupt-before-reservation cleanup require
U-MESSAGE-EDGE before full malformed/cancelled-message conformance.

**Evidence:** [reserve/publish/search/remove](../../legacy/utexas/WARMAC.MAC#L2589),
[MAKMSG](../../legacy/utexas/WARMAC.MAC#L2963),
[GETMSG](../../legacy/utexas/WARMAC.MAC#L3036),
[OUTMSG](../../legacy/utexas/DECWAR.FOR#L2599).

## EXEC-8 — Spatial notification recipients

Spatial notification selection scans commissioning identities in roster order.
A faction restriction selects its nine identities; otherwise scan all 18. Either
clear the accumulated set first or add to the existing set, according to the
caller's mode. Exclude an identity only when its occupancy value is positive;
zero-valued dead identities can still pass the source's test. Include the identity
when its stored position is within the requested Chebyshev range.

Individual callers may union the actor or victim into this set, select a second
smaller observer radius, or remove radio-disabled recipients for a base distress
call. These operations are applied in source order. A global filter to “living,
connected players only” would change this selection and queue pressure.

**Evidence:** [PRIDIS](../../legacy/utexas/DECWAR.FOR#L3055).

## EXEC-9 — Exclusion boundaries

The Austin public FORTRAN lock entry disregards the supplied lock object's
identity and requests one shared exclusion class. Its internal assembly entry,
used for the message queue, requests a second class. Thus named planet and board
locks in FORTRAN do not define independent resources. An implementation can use
modern synchronization, but must preserve which operations exclude one another.

A failed request sets the failure indication and invokes the source's 25-unit
monitor hibernation request before returning. Monitor interpretation and grant
ordering remain U-MONITOR. Callers choose the consequence: MOVE retries public
exclusion; planet BUILD/CAPTURE/TORPEDO/NOVA paths have their distinct failure
returns; radio reservation/search can fail; publication/removal retry.

Both public and internal release entries request release of all locks held by
the session, irrespective of the argument naming a particular lock. A nested
release can therefore end more exclusion than its call site's name suggests.
Command acquisition also releases held locks. Do not infer reference-counted
nested locks or per-object release from the FORTRAN argument lists.

These rules specify resource classes and release scope. They do not yet define
every permitted instruction-level interleaving, crash point, or monitor failure.
A complete concurrency profile must state those boundaries explicitly.

**Evidence:** [LOCK/UNLOCK](../../legacy/utexas/WARMAC.MAC#L3768).
