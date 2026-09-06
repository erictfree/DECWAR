# Turns and elapsed time

This chapter defines the completion operations used by command semantics.
Score reporting and interruption rules are still being converted.
The [autonomous chapter](autonomous.md) defines Romulan actions. Named operations identify
remaining dependencies; their names alone are not complete definitions.

## Time model

`now` denotes current elapsed time in milliseconds. It can change while the
game awaits input or presents output. A command deadline is an elapsed-time
value. Its remaining delay is `max(0 milliseconds, deadline - now)`.

Stardates count completed turns, independently of elapsed time. Waiting for
input does not itself advance a stardate. A command can change state without
completing a turn, and its effects can precede an ensuing delay.

The world has a pacing class of 1, 2 or 3, used by commands that depend on
terminal speed. An effective speed of 0 or above 1200 corresponds to class 1;
1200 corresponds to class 2; a positive value below 1200 corresponds to class 3.
The admission rules for choosing that effective speed, and the binding for
nonterminal clients, remain under review. The command formulas below assume
that the current class is supplied; they do not define a new SET option.

**Source basis:** [commissioning and pacing](../../legacy/utexas/SETUP.FOR#L388),
[elapsed-time use](../../legacy/utexas/DECWAR.FOR#L899).

## Completion classes

| Normal successful completion | Commands |
| --- | --- |
| Complete a turn with automatic repair | BUILD, CAPTURE, DOCK, IMPULSE, MOVE, REPAIR |
| Complete a turn without automatic repair | PHASERS, TORPEDOS |
| No turn completion | BASES, DAMAGES, ENERGY, GRIPE, HELP, LIST, NEWS, PLANETS, POINTS, RADIO, SCAN, SET, SHIELDS, SRSCAN, STATUS, SUMMARY, TARGETS, TELL, TIME, TRACTOR, TYPE, USERS, *DEBUG, *PASSWORD |
| Session exit and confirmation | QUIT |

Each command specifies exceptions and early returns. REPAIR, for example,
completes a turn only if its remaining delay is positive. This table does not
mean that typing any recognized command necessarily consumes a turn.

## Automatic repair

```text
enum AutomaticRepairSelection = STANDARD | ALL_DEVICES

operation AutomaticRepair(actor: ShipId,
                          selection: AutomaticRepairSelection): DevicesAdjusted {
    let s: Ship = ship(game, actor);
    let maximum: Damage = max(s.devices[d].damage for d in Device);
    if (maximum > 0 damage units) {
        let amount: Damage = (selection == ALL_DEVICES)
            ? maximum : min(30 damage units, maximum);
        RepairDevices(actor, amount);
    }
    return DevicesAdjusted;
}
```

This operation uses the [RepairDevices contract](commands.md#shared-device-repair-operation).
It has no separate repair delay and does not recursively complete another turn.
Docking alone does not increase the STANDARD allowance.

For a turn that includes automatic repair, select ALL_DEVICES when the second
token of the most recently acquired command or continuation input matches ALL
under the ordinary keyword rule. Otherwise select STANDARD. In a command line,
this is the first argument; in a continuation reply, it is the second reply
token. An absent token selects STANDARD. This selection does not itself make
invalid command arguments valid or cause a rejected command to complete a turn.

Thus successful DOCK ALL uses ALL_DEVICES; DOCK STATUS ALL uses STANDARD.
REPAIR ALL also selects ALL_DEVICES at completion, after its explicit repair.
The single-letter abbreviation A matches both ABSOLUTE in coordinate parsing
and ALL in this completion rule: a successful MOVE A V H selects ALL_DEVICES.
MOVE ABSOLUTE V H selects STANDARD. A newly acquired coordinate reply replaces
the command input for this test. These are accepted-input effects, not an
additional player setting or a change to device-repair units.

**Source basis:** [automatic-repair dispatch](../../legacy/utexas/DECWAR.FOR#L223),
[repair selection](../../legacy/utexas/DECWAR.FOR#L3190),
[coordinate mode matching](../../legacy/utexas/DECWAR.FOR#L1404).

## Turn accounting

```text
type DefenseContext = PlayerDefense { ship: ShipId } | RomulanDefense { captain: CaptainId }
type TurnOutcome = Completed | SessionEnded
type TurnObservation = LifeSupportWarning { reserve: integer }

operation CompleteTurn(actor: ShipId, automaticRepair: Boolean,
                        repairSelection: AutomaticRepairSelection = STANDARD): TurnOutcome

operation CommitPendingScore(actor: ShipId): Committed
```

CompleteTurn requires an existing ship with a captain association and a positive
world.playerCount. That association can still be present after fatal damage has
cleared the ship's commissioned flag; completion does not impose an additional
survival test. The command decides whether its path reaches this operation.
repairSelection matters only when automaticRepair is true and is chosen by the
input rule above.

Let s be ship(game, actor), c be captain(game, s.captain), and w be world(game).
The captain association must be present when c is obtained. A normal completion
performs the following steps in order:

```text
operation CompleteTurn(actor: ShipId, automaticRepair: Boolean,
                        repairSelection: AutomaticRepairSelection): TurnOutcome {
    if (automaticRepair) {
        AutomaticRepair(actor, repairSelection);
    }

    w.actionCount += 1;
    if (w.actionCount >= w.playerCount) {
        w.actionCount = 0;
        let context: DefenseContext = PlayerDefense { ship: actor };
        EnemyBaseDefense(context);
        PlanetDefense(context);
        BaseReplenishment(context);
        if (w.romulanEnabled) {
            let outcome: RomulanStepOutcome = AdvanceRomulan(c.id);
            if (outcome == GalaxyEnded) {
                return SessionEnded;
            }
        }
    }

    s.stardate += 1;
    w.teamTurns[s.team] += 1;

    if (s.devices[LIFE_SUPPORT].damage >= 300 damage units) {
        if (not s.docked) {
            s.lifeSupportReserve -= 1;
        }
        if (s.lifeSupportReserve < 0) {
            s.hullDamage = 2500 damage units;
        }
        if (c.promptStyle == NORMAL) {
            emit LifeSupportWarning { reserve: s.lifeSupportReserve };
        }
    }

    CommitPendingScore(actor);
    return Completed;
}
```

PlayerDefense identifies the acting ship's faction and its associated captain
for reports. RomulanDefense retains its triggering captain, while activating
both factions as defined below. Defensive actions are triggered by accumulated
actions, not by an independent wall-clock tick. world.playerCount includes
reserved admissions; it is not recomputed by counting commissioned roster ships.

A completed turn advances the acting ship and faction counts exactly once, even
if those defense phases destroyed the actor without ending the session. Completed
does not mean the ship survived. A session-ending control transfer, including
GalaxyEnded, prevents later steps; prior repair, counter, damage and score effects
remain. This operation does not independently release a commission, drain hit or
radio notifications, display POINTS, or wait out the command's remaining delay.

Automatic repair precedes the life-support test. Life-support damage below 300
therefore skips both reserve consumption and the warning, without replenishing
reserves. At or above 300, docking prevents the decrement but does not bypass
the negative-reserve test. Zero reserve is not fatal; a negative reserve assigns
hull damage exactly 2500, rather than adding damage or taking a maximum. The
NORMAL prompt preference emits the warning even while docked. INFORMATIVE
suppresses that warning without changing the state effects.

CommitPendingScore visits ScoreCategory in its declared order. For each category k:

```text
amount = s.pendingScore[k]
s.score[k] += amount
w.teamScores[s.team][k] += amount
s.pendingScore[k] = 0 points
```

Each amount is used once for the ship and once for its faction, including zero
and negative values. This commits only the actor's pending score. It does not
change another ship's pending score, the Romulan's score, stardates or commission
counts. Repeating it with all pending values zero makes no further score change.
POINTS can therefore observe different values before and after this operation;
its own report does not perform this commitment.

**OPEN QUESTION:** Interruption between category updates, simultaneous changes to the
participant threshold and the complete session-control precedence need the
multiplayer binding. No whole-turn transaction or automatic rollback is implied.

**Source basis:** [command completion dispatch](../../legacy/utexas/DECWAR.FOR#L63),
[turn accounting and score commitment](../../legacy/utexas/DECWAR.FOR#L223),
[repair](../../legacy/utexas/DECWAR.FOR#L3190),
[Romulan activation](../../legacy/utexas/DECWAR.FOR#L3233).

## Automatic installation defenses

```text
operation EnemyBaseDefense(context: DefenseContext): Completed
operation PlanetDefense(context: DefenseContext): Completed
operation BaseReplenishment(context: DefenseContext): Completed
```

These operations run when turn accounting activates world defenses. A player
context supplies the acting ship's faction. A Romulan context activates both
factions but retains its triggering captain for notification audiences.
The Romulan action rules determine when it invokes these operations;
they do not run on an independent elapsed-time schedule.

An eligible player target has `commissioned == true`, a recorded position and
a nonempty sector query at that position. The queried object need not be the
ship itself: the temporary BlackHoleObject during HELP or GRIPE does not prevent
these installations from attacking that ship. Empty sectors are skipped. Attack decisions are
made as the sequence proceeds, so destruction by an earlier installation prevents
a later installation from selecting that ship as a commissioned target.

### EnemyBaseDefense

In a player context activate the opposing faction's bases. In a Romulan context
activate Federation bases, then Empire bases. Within each faction use base
identity order, skipping bases with nonpositive strength. For each base:

```text
for (each opposing ship in roster order) {
    if (eligible and within four sectors of the base) {
        source = InstallationAttack { origin: BaseOrigin { base: base.id } };
        hit = PhaserHit(source, ShipBody { ship: ship.id },
            strength: 200/world.playerCount,
            distance: distance(base.position, ship.position));
        world.teamScores[base.team][ENEMY_DAMAGE] += hit.damage in points;
        if (hit.destruction != none) {
            world.teamScores[base.team][ENEMY_KILLS] += 500 points;
        }
        announce the hit;
    }
}
if (the Romulan exists and is within four sectors) {
    hit = RomulanPhaserHit(strength: 200/world.playerCount,
                           distance: distance from base);
    world.teamScores[base.team][ROMULAN] += hit.damage in points;
    if (hit.destroyed) {
        world.teamScores[base.team][ROMULAN] += 500 points;
    }
    announce the hit;
}
```

`PhaserHit` and `RomulanPhaserHit` denote the shared damage rules, without the
player PHASERS command's input, energy charge, overheating or bank deadlines.
Installation credit goes directly to `world.teamScores[base.team]`.

Ship-hit announcements address the triggering captain's faction within ten
sectors of the victim, everyone within four sectors, and the victim itself.
This audience rule also applies in a Romulan context: activating both factions'
bases does not replace the triggering captain's faction for the ten-sector group.
Romulan-hit announcements address everyone within ten sectors of the Romulan.

### PlanetDefense

Visit planets in their current order. For a neutral planet, `IntegerDraw(2) == 1`
skips its entire defensive action, including a possible attack on the Romulan.
In a player context, skip planets owned by the acting faction. Otherwise:

```text
for (each ship in roster order) {
    if (eligible and not of the planet's faction and within two sectors of the planet) {
        strength = (50 + 30*planet.builds)/world.playerCount;
        origin = PlanetOrigin { planet: planet.id, owner: planet.owner };
        source = InstallationAttack { origin: origin };
        hit = PhaserHit(source, ShipBody { ship: ship.id }, strength, distance to ship);
        if (planet.owner != none) {
            credit hit.damage to owner's ENEMY_DAMAGE total;
            if (hit.destruction != none) {
                credit 500 to owner's ENEMY_KILLS total;
        }
        announce the hit;
    }
}
if (the Romulan exists and is within two sectors) {
    strength = 50 + 30*planet.builds;
    hit = RomulanPhaserHit(strength, distance to Romulan);
    if (planet.owner != none) {
        credit hit.damage to owner's ROMULAN total;
        if (hit.destroyed) {
            credit 500 to owner's ROMULAN total;
        }
    }
    announce the hit;
}
}
```

A neutral planet has no friendly faction and receives no team score. A captured
planet never attacks its own ships. Planet attacks on players divide strength
by the player count; attacks on the Romulan do not. Faction-owned planet notices
address that faction within ten sectors of the victim and everyone within four.
Neutral-planet notices address everyone within ten sectors. These hits do not
release tractor beams or use player weapon readiness deadlines.

### BaseReplenishment

In a player context, let n be the number of players on the acting faction.
Replenish each surviving opposing base by `2.5/n` percentage points. In a Romulan
context, let n be the total player count. Replenish every surviving base by
`5/(n+1)` percentage points. Cap each resulting strength at 100%.
Fractions are retained; there is no minimum
whole-percentage replenishment and destroyed bases do not regenerate.

These formulas use the session's maintained player counts. Their normal player
context requires a positive count for the acting faction and a positive total
player count. Races with admission or departure, and a Romulan defense invocation
when the total player count is zero, remain part of the unfinished lifecycle
and interleaving rules; this draft does not invent a replacement denominator.

**Source basis:** [BASBLD](../../legacy/utexas/DECWAR.FOR#L317),
[BASPHA](../../legacy/utexas/DECWAR.FOR#L375),
[PLNATK](../../legacy/utexas/DECWAR.FOR#L2800).

## Returning to command input

Before accepting another command, pending hit notifications precede radio
messages, and the previous command's remaining delay is honored unless the
captain has privilege. The subsequent admission/death checks precede the new
prompt. Energy at or below 1000 units sets yellow condition on this path;
nonpositive energy or fatal hull damage ends the commission through the session
rules. A command's immediate condition setting can therefore differ from the
condition at its next prompt.

The [main-command acquisition rules](session-rules.md#main-command-acquisition-and-control)
define the prompt and control boundaries. Complete interleavings during delivery
and environment interruptions remain unfinished. Nothing in these algorithms makes
all of a command's steps one indivisible transaction.

**Source basis:** [command acquisition](../../legacy/utexas/DECWAR.FOR#L1184).

## Elapsed waiting

```text
operation WaitElapsed(requested: Duration): Unit
```

WaitElapsed supplies the elapsed-time suspension used by command delays. It does
not complete a game turn, repair a device, advance a weapon deadline or release
coordination. A separate command rule can bypass a particular wait, as privilege
does for the previous-command delay at main-command acquisition.

For requested at most zero, return immediately without requesting suspension.
Otherwise let duration be the smaller of requested and 10000 milliseconds. Read
the environment's elapsed clock and establish a deadline duration after that
reading. Request suspension for duration. Whenever suspension returns, read the
same clock. If it is before the deadline, request another 1000 milliseconds of
suspension and repeat the clock check; otherwise return Unit.

Thus a requested 20000-millisecond delay initially requests only 10000
milliseconds. An early wakeup does not necessarily finish the operation. The
extra one-second requests can overshoot the deadline; neither the requested
interval nor the deadline guarantees an exact resumption instant. Waiting can
also last longer because the environment resumes the session late. The operation
makes no random choice and does not rescale the requested duration into turns.
Other sessions can act during the wait, subject to existing coordination.

The rule describes ordinary clock observations without a discontinuity during
the wait. Clock rollover, discontinuity, failed suspension and interrupted
continuation remain environment-binding questions. It does not imply a FIFO
scheduler, a real-time execution guarantee or automatic cancellation by Ctrl-C.

**Source basis:** [PAUSE](../../legacy/utexas/WARMAC.MAC#L3372).
