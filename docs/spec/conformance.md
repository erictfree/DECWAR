# Conformance and examples

## CONF-1 — Claims during drafting

This draft defines no complete DECWAR conformance certificate. A report may
identify specific clauses and scenarios it satisfies, the specification revision,
the source variant and any repair policy. It MUST NOT label the whole game
conforming solely because these examples pass. Compilation validates document
structure, not completeness or equivalence with a native executable.

The intended completed profiles distinguish abstract game semantics from terminal
presentation. Transport adapters describe how application input, interrupts,
disconnects, clocks and identities are supplied. Extensions must be explicitly
identified and must not silently change the meaning of a core command. The
CompuServe appendix is a named set of amendments, not a menu for mixing behaviors.

## CONF-2 — Scenario structure

A reproducible scenario specifies initial world/session state, an input event
sequence, explicit clock/random/host conditions where relevant, and expected
state/output observations at named checkpoints. A command's direct result and
its later command-acquisition effects are different checkpoints. Event ordering
must be supplied for multi-session cases; a seed alone is insufficient.

Exact-output assertions identify application bytes and formatting state.
Semantic assertions can leave unrelated fields unchanged or unconstrained, but
must say which. Source-derived examples below are not native-run transcripts or
claims that the existing TypeScript port has executed these cases during this goal.

## CONF-3 — Initial source-derived examples

All arithmetic examples below use the ordinary nonoverflowing integer domain.
State not mentioned by a case is otherwise valid for the chosen operation.

| ID | Conditions and input | Expected observation |
| --- | --- | --- |
| EX-LEX-01 | Main command selection for `SC` | Select SCAN. |
| EX-LEX-02 | Main command selection for `S` | Ambiguous command; no selected command. |
| EX-LEX-03 | Main command selection for `SHIELD` | Select SHIELDS using the first-five-character comparison. |
| EX-LEX-04 | Ordinary integer token `123456` | Retained text `12345`; numeric value 123456. |
| EX-LEX-05 | Token `1E2` | Alphanumeric category and numeric value zero; no exponent parsing. |
| EX-LEX-06 | Ordinary command input beginning Ctrl-U, ESC | Finish an empty new line; do not repeat the previous line. |
| EX-SHIELD-01 | Shield-device damage 3000, engine energy 5000; UP | Shields up and energy 4000 before later acquisition. |
| EX-SHIELD-02 | Shield-device damage 3001, engine energy 5000; UP | Reject raising; energy unchanged. |
| EX-SHIELD-03 | Shields already up, damage zero, energy 5000; UP | Charge again; energy 4000. |
| EX-SHIELD-04 | Strength 500, energy 5000; TRANSFER 1 | Transfer ten energy quanta; strength stays 500 because 10/25 truncates to zero; energy 4990. |
| EX-REPAIR-01 | Underway, device damage includes 1000; REPAIR -10 | Add 100 to every device's damage; remaining repair pause is nonpositive and no normal turn-accounting path is taken. |
| EX-SCAN-01 | At (37,37), SCAN 0, an unknown planet at (40,40) | Draw the single requested sector but mark the planet known to the acting team. |
| EX-PROMPT-01 | Informative mode; life damage 3000, reserve 2, shield strength 100, hull damage 20000, energy 10000 | Application prompt bytes are `2LSDE> ` with one trailing space. |
| EX-RANGE-01 | Locations (10,10) and (11,11) | Distance is 1 and adjacency succeeds. |
| EX-PATH-01 | Empty path from (10,10), displacement (2,0), two steps, zero deflection | End and probe (12,10), no obstruction and no random draw. |
| EX-PATH-02 | Same path, positive object at (11,10) | Last empty (10,10), obstruction/probe (11,10); no random draw. |
| EX-MOVE-01 | Warp/computer undamaged, shields down, no tractor, energy 50000; MOVE absolute (12,10) from (10,10), obstacle at (11,10) | Consume entry I(4000), remain at (10,10), deduct 160 energy despite obstruction; normal repair/accounting path. |
| EX-PHASER-01 | Valid enemy target, strength 49, selected bank ready only in the future | Wait for that bank, then reject strength without firing charge. |
| EX-TORPEDO-01 | Docked, inventory 1, valid one-torpedo burst | Inventory remains 1 on launch; docking does not permit an entry burst exceeding available inventory. |
| EX-REMOVE-01 | Docked ship, faction has no bases and captured count zero; docking re-evaluation | Ship remains docked through the source's nonpositive captured-count branch. |
| EX-NOVA-01 | Planet with three builds, exclusion succeeds, one nova hit | Builds become zero; planet survives. |
| EX-NOVA-02 | Planet with two builds, exclusion succeeds, one nova hit | Builds become negative; clear and remove planet, debit 1000 planet-destruction points, and check world end. |
| EX-ROM-01 | Romulan energy 300; torpedo damage draw I(4000)=3000 | Report 2000 damage, reduce energy by 200 to 100; Romulan survives the damage calculation. |

**Evidence:** LEX-1 through LEX-6, GAME-SHIELD, GAME-REPAIR, GAME-SCAN,
TERM-2, STATE-5, GAME-PATH, GAME-MOVE, GAME-PHASERS, GAME-TORPEDO,
GAME-REMOVE, GAME-NOVA and GAME-ROM-DAMAGE. The source citations are attached to those clauses.

## CONF-4 — Required expansion

Before a reviewed complete draft, expand examples to every command family,
interactive cancellation, malformed argument count, numeric boundary, random
sequence, queue exhaustion, multiple captains, interrupts, disconnect cleanup,
world rollover and termination. Record whether an example is checked against
source only, a native observation, a port run or an independent implementation.
Keep unresolved outcomes explicit instead of choosing whichever output is easiest
to test.
