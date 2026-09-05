# Turns and elapsed time

This chapter defines the completion operations used by command semantics.
Detailed world defenses, Romulan actions, score categories and interruption
rules are still being converted. The named operations below identify those
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
AutomaticRepair(ship):
    maximum := greatest damage among ship.devices
    if maximum > 0 damage units:
        amount := min(30 damage units, maximum)
        RepairDevices(ship, amount)
```

This operation uses the same device-damage subtraction as REPAIR. Docking does
not increase its 30-unit allowance. It has no separate repair delay and does
not recursively complete another turn.

## Turn accounting

World state includes an action counter, the number of commissioned players,
and each team's accumulated turns. Each captain has pending score changes in
the game's score categories. A turn completes in this order:

```text
CompleteTurn(ship, automaticRepair):
    if automaticRepair:
        AutomaticRepair(ship)

    world.actionCount := world.actionCount + 1
    if world.actionCount >= world.playerCount:
        world.actionCount := 0
        EnemyBaseDefense(ship)
        PlanetDefense(ship)
        BaseReplenishment(ship)
        if world.romulanEnabled:
            RomulanAction(ship)

    ship.stardate := ship.stardate + 1
    world.teamTurns[ship.team] := world.teamTurns[ship.team] + 1

    if ship.devices[LIFE_SUPPORT].damage >= 300 damage units:
        if not ship.docked:
            ship.lifeSupportReserve := ship.lifeSupportReserve - 1
        if ship.lifeSupportReserve < 0:
            ship.hullDamage := 2500 damage units
        if captain.promptStyle == NORMAL:
            emit LifeSupportWarning(ship.lifeSupportReserve)

    for each score category:
        add the pending change to ship and team totals
        clear that pending change
```

The defensive actions use the acting ship's team and context. They are triggered
by accumulated actions, rather than an independent wall-clock tick. Life-support
reserve reaching zero is not the fatal boundary; falling below zero sets fatal
hull damage. The session rules determine when death is subsequently processed.

**Source basis:** [command dispatch](../../legacy/utexas/DECWAR.FOR#L57),
[turn accounting](../../legacy/utexas/DECWAR.FOR#L237),
[repair](../../legacy/utexas/DECWAR.FOR#L3190).

## Returning to command input

Before accepting another command, pending hit notifications precede radio
messages, and the previous command's remaining delay is honored unless the
captain has privilege. The subsequent admission/death checks precede the new
prompt. Energy at or below 1000 units sets yellow condition on this path;
nonpositive energy or fatal hull damage ends the commission through the session
rules. A command's immediate condition setting can therefore differ from the
condition at its next prompt.

The complete interleaving rules for incoming combat, cancellation, disconnection
and messages during waits remain unfinished. Nothing in these algorithms makes
all of a command's steps one indivisible transaction.

**Source basis:** [command acquisition](../../legacy/utexas/DECWAR.FOR#L1184).
