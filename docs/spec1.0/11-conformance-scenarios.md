# 11. Conformance scenarios

A conformance scenario specifies an initial game state, ordered player input
or autonomous triggers, observable output and the resulting state. Agreement
on output alone is insufficient: an implementation must also preserve fields
that the scenario says do not change. The scenarios below exercise interactions
between rules; they do not replace the general command definitions.

## 11.1. Reading the scenarios

Each scenario starts afresh. No unrelated player action, autonomous trigger
or pending delivery intervenes unless specified. Commands are separate inputs,
not slash-chained commands. Output strings describe command output, excluding
input echo and the ordinary acquisition prompt. An empty string means that
the command itself emits nothing; it does not suppress the next prompt.
`\n` denotes a newline and `\t` a tab. Spaces inside strings are significant.

Use this fixture unless a scenario overrides it:

- Excalibur is commissioned at (20,20), with energy 1234, hull damage 2,
  raised shields of strength 100, ten torpedoes and stardate 1.
- Wolf is commissioned at (60,61), with energy 5000, no hull damage,
  raised shields of strength 100, ten torpedoes and stardate 1. Its player
  is distinct from Excalibur's player.
- Both ships have undamaged devices, life-support reserve 5, GREEN condition,
  no docking or tractor link, enabled radio and empty gag sets. Their
  committed and pending scores are zero in every category.
- The other sixteen roster ships are AVAILABLE, with no position or tractor
  link. Their energy, hull and device damage, shield strength, torpedoes,
  stardate and scores are zero; shields are DOWN, condition is GREEN,
  life-support reserve is 5, docking is false and radio is enabled with no gags.
- A Federation base at (40,40) and an Empire base at (60,60) each have
  strength 100 and empty discovery sets. A neutral planet at (22,20) has
  construction zero and an empty discovery set. There are no stars, black
  holes, Romulan activity or pending notifications.
- Both factions have zero scores, one admission and one completed turn.
  `Galaxy.worldActivityProgress` is zero. These are fixture values, not
  commissioning or new-galaxy defaults.
- Both players use normal prompts and absolute input/output coordinates.
  Excalibur uses medium output; Wolf uses short output. Both use short scans.

## 11.2. Preferences change presentation, not ship state

Excalibur issues the following commands in order:

| Input | Command output |
| --- | --- |
| `SE OUTPUT SHORT` | `""` |
| `ST E D` | `"\nE1234 D2 \n"` |
| `SE SCANS LONG` | `""` |
| `ST E D` | `"\nE1234 D2 \n"` |
| `SE OUTPUT LONG` | `""` |
| `ST E D` | `"\nEnergy left\t1234.0\nDamage\t\t   2.0\n"` |

Excalibur's final output length and scan length are LONG. Its other
preferences are unchanged. Changing scan length does not change STATUS
formatting. Wolf's preferences and the entire `Galaxy` remain unchanged:
no energy charge, repair, score commitment, stardate advancement or
world-activity progress occurs.

## 11.3. Radio acceptance precedes delivery

The players act in this order, allowing each command to finish before the
next begins:

| Player | Input | Command output |
| --- | --- | --- |
| Wolf | `RA OF` | `"\nRadio turned off, Captain.\n"` |
| Excalibur | `TE W;hold` | `"\nCommunications:  Captain, we cannot raise the W\n\nNo message sent.\n"` |
| Wolf | `RA ON` | `"\nRadio turned on, Captain.\n"` |
| Excalibur | `TE W;hold` | `"\n"` |

After the first TELL, there is no pending message. After the second, exactly
one message has sender EXCALIBUR, text `hold`, and both original and pending
recipient sets equal to `{ WOLF }`. Excalibur is not a recipient. Distance
between the ships does not prevent radio communication.

At Wolf's next ordinary acquisition, deliver:

```text
"\nMessage from E to  W\nhold\n\n"
```

The message then has no remaining recipients and is removed. A later
acquisition does not repeat it. Both radios are enabled and no other galaxy
property has changed. In particular, neither ship's stardate and neither
faction's completed-turn count advances. This scenario needs no race between
TELL and RADIO: Wolf's OFF or ON state is established before each selection.

## 11.4. Failed report groups preserve earlier direct output

Override Excalibur's output length to LONG. It issues:

```text
LIST 22 20 & BASES FRIENDLY & ZZZ
```

The command output is:

```text
"\n Neu planet  @22-20\nIllegal keyword ZZZ\n"
```

The planet's direct row is emitted before the later invalid group. The
friendly-base aggregate has been selected but has not been emitted, so its
row is absent. Neither port is newly discovered, and the entire galaxy is
unchanged. The command does not roll back text already presented.

Excalibur next issues a fresh command:

```text
LIST BASES FRIENDLY & 22 20
```

Its output is:

```text
"\n Neu planet  @22-20\n\n Fed Base    @40-40   100.0%\n\n"
```

The direct planet row precedes the aggregate base row despite appearing in
the second input group. The Federation base's discovery set now contains
FEDERATION; the planet's discovery set remains empty. All other galaxy
properties remain unchanged. This distinguishes selection from output, and
direct inspection from aggregate discovery.

## 11.5. Capture followed by construction

Start with the Section 11.1 fixture, but place its neutral planet at (20,21).
Give Excalibur energy 1000, zero hull damage, lowered shields of strength 100
and 80 radio-device damage. All its other device damage remains zero. This
is a new scenario, not a continuation of the radio or LIST cases.

Excalibur issues `C ABSOLUTE 20 21`, then four separate `BU ABSOLUTE 20 21`
commands. Each command is accepted only after the preceding readiness period;
the scenario does not prescribe its unresolved duration. For the capture
retaliation, supply zero for the critical sample and then zero for attenuation.
The resulting noncritical damage is 360. No autonomous attack is eligible:
the captured planet belongs to the triggering faction, the Empire base is
outside attack range of Excalibur, and Romulan activity is disabled.

The checkpoints below are after each command's turn completion, before its
next ordinary acquisition. Each score column is both Excalibur's committed
category score and the Federation's corresponding score.

| Completed input | Immediate command output | Construction | Capture score | Construction score | Stardate | World progress | Radio-device damage | Condition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CAPTURE | `"\nE capturing  @ @20-21\n"` | 0 | 100 | 0 | 2 | 1 | 50 | RED |
| First BUILD | `"1 build\n"` | 1 | 100 | 50 | 3 | 0 | 20 | YELLOW |
| Second BUILD | `"2 builds\n"` | 2 | 100 | 150 | 4 | 1 | 0 | YELLOW |
| Third BUILD | `"3 builds\n"` | 3 | 100 | 300 | 5 | 0 | 0 | YELLOW |
| Fourth BUILD | `"4 builds\n"` | 4 | 100 | 500 | 6 | 1 | 0 | YELLOW |

Capture changes the planet to Federation allegiance and leaves Excalibur with
energy 640 and hull damage 360. Neither value changes during the four builds.
Shields remain lowered at strength 100, ten torpedoes remain, and life-support
reserve stays 5. Every pending score is zero at each checkpoint. Federation
completed turns advances from 1 to 6; Wolf's stardate and Empire completed
turns remain 1. Both base strengths stay 100 and all discovery sets stay empty.
The planet remains a planet: this scenario does not perform the fifth build.

At acquisition after capture, Excalibur first receives its pending hit report:

```text
" @ @20-21  360.0 unit P  E @20-20, -100.0%\n"
```

After readiness and the fatal tests, energy 640 changes its condition from
RED to YELLOW. The four-BEL warning precedes the normal prompt. Each subsequent
acquisition likewise emits the YELLOW warning; it does not add another turn.
This explains the condition change between the capture and first-build
checkpoints. It is not caused by construction or automatic device repair.

The two world cycles occur during the first and third BUILD completions.
They cause no attacks in this fixture. Opposing-base restoration is capped at
100 and therefore changes nothing. It is incorrect to invoke planetary
retaliation again merely because construction increased, or to give the
capturing player a turn for each inactive Wolf turn that did not occur.

## 11.6. Coverage and open decisions

The CAPTURE traces in Section 7.15 additionally specify surviving and fatal
turns through score commitment. Section 9.1 gives the shared world-trigger
boundary, and Section 9.5 distinguishes event facts from delivery context.
Those scenarios are part of this chapter's coverage without a second copy of
their rules or expected values.

These examples are not a complete conformance suite. Raw editing and recovery,
readiness durations, concurrent actions, arbitrary pending combat order,
numeric-policy boundaries and the remaining command combinations require
additional cases after their open contracts are settled. A test that begins
with already tokenized operands verifies those semantic stages, not the
raw command language. A source-derived expected result is not an observed
original-executable transcript. The command completion ledger records the
remaining evidence separately from these scenario requirements.
