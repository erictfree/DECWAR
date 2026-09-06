# Turns and elapsed time

This chapter defines the completion operations used by command semantics.
Detailed Romulan actions, score reporting and interruption
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
    maximum := max(ship.devices[d].damage for d in Device)
    if maximum > 0 damage units:
        amount := min(30 damage units, maximum)
        RepairDevices(ship.id, amount)
```

This operation uses the [RepairDevices contract](commands.md#shared-device-repair-operation).
Docking does
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

## Automatic installation defenses

These operations run when turn accounting activates world defenses. A player
context supplies the acting ship's faction. A Romulan context has no player
faction. The Romulan action rules determine when it invokes these operations;
they do not run on an independent elapsed-time schedule.

An eligible player target is commissioned and visibly present at its recorded
sector. Temporarily absent or concealed ships are skipped. Attack decisions are
made as the sequence proceeds, so destruction by an earlier installation prevents
a later installation from selecting that ship as a commissioned target.

### EnemyBaseDefense

In a player context activate the opposing faction's bases. In a Romulan context
activate Federation bases, then Empire bases. Within each faction use base
identity order, skipping bases with nonpositive strength. For each base:

```text
for each opposing ship in roster order:
    if eligible and within four sectors of the base:
        hit := PhaserHit(base, ship,
            strength = 200/world.playerCount,
            distance = Distance(base.position, ship.position))
        world.teamScores[base.team][ENEMY_DAMAGE] += hit.damage in points
        if hit destroyed the ship:
            world.teamScores[base.team][ENEMY_KILLS] += 500 points
        announce the hit

if the Romulan exists and is within four sectors:
    hit := RomulanPhaserHit(strength = 200/world.playerCount,
                           distance = distance from base)
    world.teamScores[base.team][ROMULAN] += hit.damage in points
    if hit destroyed the Romulan:
        world.teamScores[base.team][ROMULAN] += 500 points
    announce the hit
```

`PhaserHit` and `RomulanPhaserHit` denote the shared damage rules, without the
player PHASERS command's input, energy charge, overheating or bank deadlines.
Installation credit goes directly to `world.teamScores[base.team]`.

For a player context, ship-hit announcements address the acting faction within
ten sectors of the victim, everyone within four sectors, and the victim itself.
Romulan-hit announcements address everyone within ten sectors of the Romulan.
The complete announcement audience in a Romulan context remains under review.

### PlanetDefense

Visit planets in their current order. For a neutral planet, `IntegerDraw(2) == 1`
skips its entire defensive action, including a possible attack on the Romulan.
In a player context, skip planets owned by the acting faction. Otherwise:

```text
for each ship in roster order:
    if eligible and not of the planet's faction
       and within two sectors of the planet:
        strength := (50 + 30*planet.builds)/world.playerCount
        hit := PhaserHit(planet, ship, strength, distance to ship)
        if planet.owner != none:
            credit hit.damage to owner's ENEMY_DAMAGE total
            if destroyed, credit 500 to owner's ENEMY_KILLS total
        announce the hit

if the Romulan exists and is within two sectors:
    strength := 50 + 30*planet.builds
    hit := RomulanPhaserHit(strength, distance to Romulan)
    if planet.owner != none:
        credit hit.damage to owner's ROMULAN total
        if destroyed, credit 500 to owner's ROMULAN total
    announce the hit
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

The complete interleaving rules for incoming combat, cancellation, disconnection
and messages during waits remain unfinished. Nothing in these algorithms makes
all of a command's steps one indivisible transaction.

**Source basis:** [command acquisition](../../legacy/utexas/DECWAR.FOR#L1184).
