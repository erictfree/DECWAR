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

## CONF-5 — Utility, session and queue scenarios

These source-derived cases add checkpoints for command families beyond combat.
Unless noted, the operation finishes normally, host resources are available,
and no other session mutates relevant state during the case. A listed unresolved
outcome is a test of the specification's claim boundary, not an arbitrary expected
runtime result.

| ID | Conditions and input | Expected observation |
| --- | --- | --- |
| EX-BUILD-01 | Adjacent owned planet with zero builds; BUILD its location | One build, 500 pending construction points before main-loop accumulation. |
| EX-CAPTURE-01 | Adjacent neutral zero-build planet; CAPTURE, exclusion succeeds | Ownership and captured counts change; defensive fire can still damage the actor; 1000 pending capture points. |
| EX-DOCK-01 | One adjacent friendly base, no adjacent friendly planets, not already docked; zero torpedoes, energy 10000, strength 500, hull damage 2000 | Ten torpedoes, energy 20000, strength 700, hull damage 1000, docked and green, before post-command device repair. |
| EX-ENERGY-01 | Two adjacent friendly ships, sender energy 50000 and recipient energy 50000; ENERGY recipient 10 | Success path transfers zero after recipient-cap calculation; both energies unchanged. |
| EX-HELP-01 | Live green ship; HELP, inspect world after helper entry and before completion | Ship record remains occupied; its board cell is black-hole kind, not empty or hidden sentinel. Restore ship cell on ordinary completion. |
| EX-HELP-02 | Live red ship; HELP | Red-alert diagnostic; board cell unchanged. |
| EX-GRIPE-01 | Green ship; GRIPE followed immediately by Ctrl-Z with no characters | No feedback record; restore board and clear control state on cleanup. |
| EX-NEWS-01 | News stream contains LF followed by dot, then more text; answer NO at continuation prompt | Dot is not printed; remaining asset text is not printed; restore prior input. |
| EX-LIST-01 | LIST CLOSEST with two eligible equal-distance bases and no other eligible candidate | Last base encountered in selection order wins the tie. |
| EX-BASES-01 | BASES with no arguments | Select friendly bases and request both details and summary under GRAM-11. |
| EX-PLANETS-01 | PLANETS with no arguments | Select all planet factions, detailed output, range 10. |
| EX-SUMMARY-01 | SUMMARY with no arguments | Select all object kinds and factions, summary output, whole-game range. |
| EX-TARGETS-01 | TARGETS with no arguments | Select opposing targets and Romulan, detailed output, range 10; omit the ordinary opposing-object asterisk. |
| EX-STATUS-01 | Relative output default; STATUS LOCATION | Print absolute location for this report; keep the session default relative. |
| EX-DAMAGE-01 | All nine device damages zero; DAMAGES | Take the all-functional report path; no damaged-device rows. |
| EX-RADIO-01 | Radio initially off, device undamaged; TELL with an invalid recipient | Radio is turned on before recipient rejection. |
| EX-RADIO-02 | RADIO OFF then RADIO ON | Add then remove actor from radio-disabled set; no main-loop turn accounting. |
| EX-SET-01 | SET OUTPUT with an alphabetic value matching none of SHORT/MEDIUM/LONG | Return with output mode unchanged; no extra value prompt. |
| EX-TYPE-01 | Main-game TYPE O | Ambiguous-switch fragment, then switch prompt. |
| EX-TIME-01 | TIME from pregame with no selected ship | Report world time, session CPU and time of day; omit commissioned-ship elapsed/CPU fields. |
| EX-USERS-01 | Short verbosity; USERS with an occupied roster slot | Use the six-field identity presentation; do not substitute the commented two-field form. |
| EX-TRACTOR-01 | Adjacent friendly occupied ships, no existing beams, both shields down; TRACTOR target | Associate both endpoints and enqueue both notifications without a main-loop turn. |
| EX-PRIV-01 | *PASSWORD followed by a proper prefix shorter than the exact password | Privilege cleared; no Austin rejection text from PASWRD. |
| EX-DEBUG-01 | No privilege; *DEBUG | Unknown-command fragment and help hint; no timer report. |
| EX-PREGAME-01 | Pregame ACTIVATE | Return to admission without a program-name side effect. |
| EX-PREGAME-02 | Pregame QUIT | Exit to host without the aboard-ship confirmation dialogue. |
| EX-PREGAME-03 | Pregame TYPE | Do not assert main-game TYPE behavior; required argument is absent (U-PREGAME-ARG). |
| EX-ZAP-01 | Pregame, no privilege; *ZAP | Return to pregame without statistics writes. |
| EX-PAUSE-01 | Request 20000 milliseconds; monotonic host clock; first hibernation wakes at requested time | Request only 10000 milliseconds and return at that capped deadline. |
| EX-HIT-01 | Two unread notifications for a receiver, higher physical slot has older serial | Retrieve lower physical slot first. |
| EX-HIT-02 | Actor's 40 hit slots all contain unread entries; enqueue another hit | Overwrite the selected lowest stored-serial slot in that partition; no wait for receivers. |
| EX-MESSAGE-01 | Radio queue full; oldest entry still belongs to roster slots 2 and 5 | Remove slot 2 from every queued message before retrying reservation. |
| EX-CURSOR-01 | Buffered-output cursor counter 8; emit tab | Counter becomes zero under the source mask, not 16. |
| EX-CAPACITY-01 | Scanner input has fourteen `A` tokens separated by spaces and then LF | Fourteen tokens and an end sentinel; no capacity diagnostic. |
| EX-CAPACITY-02 | Same fourteen tokens, then comma and LF | Capacity diagnostic and zero returned tokens; remainder discarded. |
| EX-CAPACITY-03 | Thirteen `A` tokens separated by spaces, then comma and LF | Thirteen alphanumeric tokens plus one null result and end sentinel. |
| EX-CAPACITY-04 | Fifteen `A` tokens separated by spaces and then LF | Overflow after scanning the fourteenth token; fifteenth not returned. |
| EX-POINTS-01 | Aboard, ordinary POINTS without arguments; inspect selected columns before formatting | Select only the acting ship column. This does not resolve final-entry aliasing. |
| EX-QUIT-01 | Aboard and connected; input QUIT YES, then answer NO to the fresh confirmation prompt | Discard appended YES, refuse exit on fresh NO, and return to command acquisition. |
| EX-SRSCAN-01 | SRSCAN without arguments, terminal width 80, central location | Default seven sectors each way, yielding a 15 by 15 rectangle. |
| EX-IMPULSE-01 | Undamaged impulse/computer, docked, red; IMPULSE requests distance 2 | Consume entry I(4000), set green and undocked, then reject range; no movement charge or normal turn. |
| EX-BELL-01 | Main acquisition with yellow condition after fatal/energy checks | Emit four BEL characters before the world-end check and prompt. |

**Evidence:** the matching LEX, GAME, SESSION, EXEC and TERM clauses above. These
cases have been derived from source and have not been executed as native
conformance transcripts. Full numeric, interrupt, failure and multi-session
schedules remain to be added under CONF-4.

## CONF-6 — Notification and score presentation scenarios

These source-derived examples exercise TERM-11 and TERM-12. Notification fields
are already decoded, the receiver is live, and no concurrent mutation occurs.
Unless overridden, the output cursor is at column zero with a preceding blank
line, so the conditional `break` adds nothing. Quoted output uses JSON escapes.
Fragment composition and field operations retain their TERM-7 meanings.

| ID | Conditions and input | Expected observation |
| --- | --- | --- |
| EX-HIT-03 | Short or medium; type 13 notification | Exactly `"Trac. Beam on\r\n"`. |
| EX-HIT-04 | Long; type 14 notification | Exactly `"\r\nTractor beam broken, Captain.\r\n"`; the initial CR/LF belongs to the fragment. |
| EX-HIT-05 | Medium, absolute output; type 4, torpedo number 2, target at 12–34 | Exactly `"T2 miss @12-34\r\n"`. |
| EX-HIT-06 | Short, absolute output; type 15, torpedo number 3, target at 12–34 | Exactly `"T3 neutralized 12-34\r\n"`. |
| EX-HIT-07 | Medium, absolute output, radio on and damage 3000; type 9 for a Federation base at 12–34 | Exactly `"<> @12-34 attacked\r\n"`. |
| EX-HIT-08 | Same notification and preferences, radio damage 3001 | Consume notification; no output under the stated cursor condition. |
| EX-HIT-09 | Medium, absolute output; type 11, source Romulan at 12–34 | Exactly `"??  @12-34\r\n"`, with two spaces before the location. |
| EX-HIT-10 | Type 1 with target equal to receiver's ship, target kind 1, zero kill flag and nonzero critical device | Include the critical device suffix. Delivering the same notification to another captain omits it. |
| EX-HIT-11 | Type 3 delivered once under short and once under medium preferences | Short uses the ordinary damage amount and `T` path; medium uses `outh29` and omits the amount. |
| EX-POINTS-02 | Ordinary actor-only POINTS; all scores zero, actor turn count 1 | Omit all eight category rows; print zero total and zero per-turn average; omit commission count and per-commission rows. |
| EX-POINTS-03 | Ordinary actor-only POINTS, medium; only enemy-damage score 19, actor turns 2 | Category and total fields end in `1.9`; per-turn field ends in `0.9` because integer division gives 9 before formatting. Stored score stays 19. |
| EX-POINTS-04 | Ordinary POINTS selects two columns; a category is zero for one but 10 for the other | Include the category row with both fields, including its zero field. |

**Evidence:** [notification recipes](terminal.md#term-11--delivered-hit-notifications)
and [score recipes](terminal.md#term-12--score-tables), derived from OUTHIT,
POINTS and the named fragments. These cases have not been executed against the
native image and do not resolve final-entry or zero-divisor behavior.

## CONF-7 — Random-state scenarios

These source-derived cases specify the state immediately after the named
operation, excluding subsequent main-loop or autonomous activity. Initial state
means an already established RNG-1 state, not a call to the clock-based zero-seed
initializer. Exact fractions denote REAL values.

| ID | Conditions and input | Expected observation |
| --- | --- | --- |
| EX-RNG-01 | Initial state 1; six consecutive I(100) calls | Results 14, 64, 56, 80, 48, 75; final state 29360264577. |
| EX-RNG-02 | Initial state 1; R(), I(100), R() | Results 1013/134217728, 64, 73209255/134217728; final state 18814778687. Both call forms advance the same stream. |
| EX-RNG-03 | Initial state 262144; I(100) | Result 19; new state 33103223937. Preserve the old upper residue when replacing the zero lower residue. |
| EX-RNG-04 | Initial state 1, warp damage 3000; enter MOVE | Critical-engine rejection before any random draw; state remains 1. |
| EX-RNG-05 | Initial state 1, undamaged engine; enter MOVE and cancel during location acquisition | Entry I(4000) yields 1014; new state 260543 despite no completed movement. |

**Evidence:** [generator vectors](randomness.md#rng-6--generator-vectors) and
[movement draw order](randomness.md#movement-and-phasers). These are arithmetic
derivations and source-path expectations, not native transcript comparisons.

## CONF-8 — CompuServe standings scenarios

These source-derived cases apply only to C-6. Storage reads and writes succeed,
the session is connected, and no concurrent update occurs. Update cases specify
the values passed to the standings operation, without assuming final POINTS has
resolved its uninitialized-loop behavior. Account identities are nonzero.

| ID | Conditions and input | Expected observation |
| --- | --- | --- |
| EX-C-STAT-01 | Elapsed time 999 milliseconds, high score, zero survival flag | Return before reading/updating standings; no recorded-destruction increment. |
| EX-C-STAT-02 | Elapsed time 1000 milliseconds, score zero, first faction position empty | Pass the eligibility gate and insert a zero-score record; eligibility does not require 1000 score units. |
| EX-C-STAT-03 | Equal scores; old elapsed time 2000 and incoming 3000 milliseconds; no higher same-account record | Incoming record qualifies before the old one. |
| EX-C-STAT-04 | Equal scores and equal elapsed times; following position empty | Continue past the tied record and insert at the following position. |
| EX-C-STAT-05 | Incoming record qualifies for position 3; same account already in position 1; survival flag nonzero | Reject placement; do not write the collection merely to re-save unchanged standings. |
| EX-C-STAT-06 | Same situation, survival flag zero | Increment recorded destruction and persist the collection despite rejecting the placement. |
| EX-C-STAT-07 | HONORROLL row with stored score 600 | Credits field displays zero because trunc((600+320)/1000) is zero. |
| EX-C-STAT-08 | HONORROLL with ordinary negative true argument and terminal width 60 | Header includes its wide suffix, but record rows omit ship/runtime/date fields. |

**Evidence:** [CompuServe persistence amendment](compuserve.md#c-6--persistence-extends-session-4).
These expectations have not been exercised against a native CompuServe build.

## CONF-9 — Speech, variant masks and exclusion scenarios

These source-derived examples distinguish generated speech, queue publication
and delivery. Supplied draw results are test inputs to the relevant abstract
draw operations; they are not a claim that an arbitrary sequence corresponds
to a chosen native seed. Assume nonoverflowing counters, successful queue space
and host services except where a scenario names another condition.

| ID | Conditions and input | Expected observation |
| --- | --- | --- |
| EX-ROM-SPEECH-01 | Austin speech generator; four draw results all 1 | Select all eighteen slots and generate `Death to mindless sub-Romulan mutants!` before TELL filtering. |
| EX-C-ROM-01 | CompuServe autonomous speech; group draw 2; all ten ships live with working radios on | Select recipients 1–9, including Empire slots 6–9; body qualifier is `human `. |
| EX-C-ROM-02 | Same, group draw 3; all message/hit flags initially zero; observe after publication | Slot 10 message flag becomes 1 and hit flags 1–8 become 1. No matching hit entries are created. Membership retains slots 11–18. |
| EX-C-ROM-03 | CompuServe player with working radio; TELL ROMULAN, Romulan present; relocation test returns 2 | Queue its direct reply, omit no-recipient diagnostic, leave Romulan position unchanged; no player message-body prompt. |
| EX-C-ROM-04 | Same, TELL ROMULAN ROMULAN; both relocation tests return 2 | Submit two generated replies in recipient-token order. |
| EX-C-ROM-05 | CompuServe actor at 50–50; present Romulan; relocation I(4)=1, I(10)=6; cell 51–51 occupied, 52–51 empty | Relocate to 52–51, the next V offset under H offset 1; do not choose another closer empty cell. |
| EX-C-ROM-06 | CompuServe player TELL ROMULAN with Romulan absent and no other recipients | Absent-Romulan diagnostic followed by no-recipient diagnostic; no reply-generation or relocation draws. |
| EX-C-LOCK-01 | CompuServe board locations 20–1, 20–3 and 20–4 | First two share a board exclusion key; third uses the next key. |
| EX-C-LOCK-02 | Same ordinary resource key in world serials 1 and 65 | Share the six-bit namespace and contend; distinct full serials do not isolate them. |
| EX-C-LOCK-03 | Successfully acquire the same CompuServe key twice, then release it once | One registration, no nesting count; the single release removes it. |
| EX-C-LOCK-04 | Two CompuServe moves independently select the same empty destination before either acquires its board key; A completes writes/releases, then B acquires | B does not recheck the destination and overwrites its cell; both ship records can retain that destination. |
| EX-C-LOCK-05 | CompuServe holds two keys, second remembered as last public lock; positive PAUSE | Temporarily release and reacquire only the second key; retain the first throughout. |
| EX-C-QUEUE-01 | CompuServe MAKMSG short-message cleanup reaches its ASCIL diagnostic | Its literal emits `"No message sent\r\n"`; Austin's corresponding bare ASCIZ macro expansion lacks that appended ending. |

**Evidence:** [Austin speech](terminal.md#term-13--generated-romulan-speech),
[CompuServe speech](compuserve.md#c-8--romulan-changes-amends-game-rom-action-and-game-radio),
[exclusion](compuserve.md#c-10--exclusion-and-waiting-amends-exec-910-and-game-move)
and [queue amendments](compuserve.md#c-11--queue-and-literal-amendments-amends-exec-67-and-term-7).
These examples have not been executed against either native image.

## CONF-10 — Radio output scenarios

These source-derived cases assume short verbosity, no intervening activity and
the source's ordinary output buffer behavior. Quoted strings use JSON escapes.

| ID | Conditions and input | Expected observation |
| --- | --- | --- |
| EX-MESSAGE-02 | Austin receiver has no gag bits; valid queued message from code 101 to original recipients 1 and 2; body `hello` followed by CR/LF and NUL | Emit `"\r\nMessage from E to  E F\r\nhello\r\n\r\n"`. |
| EX-MESSAGE-03 | Retained body buffer is `old` followed by CR/LF and NUL; message flag 1 but retrieval finds no matching entry | Clear message flag and emit `"old\r\n\r\n"` without a heading. |
| EX-RADIO-03 | RADIO GAG names the actor's own ship; cursor at left margin after a blank line | No gag change and no output after the suppressed initial break. |

**Evidence:** [radio output recipes](terminal.md#term-14--radio-commands-and-delivered-messages).
These cases do not resolve U-ROM-GAG or malformed message-buffer contents.

## CONF-11 — Status and identity report scenarios

These source-derived cases assume no intervening activity, an output cursor at
the left margin after a blank line, and no queued notifications. Expected strings
describe the named report alone, excluding later command prompts. They use JSON
escapes; spaces, including trailing spaces, are significant.

| ID | Conditions and input | Expected observation |
| --- | --- | --- |
| EX-STATUS-02 | Short, undocked Green actor at 12–34, turn count 0, 10 torpedoes, engine energy 50000, hull damage 0, shields raised at strength 1000, working radio on; STATUS | Exactly `"SD0 G 12-34 T10 E5000 D0 SH+100 ROn \r\n"`. |
| EX-STATUS-03 | Medium, shields lowered at strength 1000; STATUS SHIELDS | Exactly `"Shlds  -100.0% 2500.0 units\r\n"`; the reserve remains positive. |
| EX-STATUS-04 | Short actor at 12–34, relative-output preference; STATUS LOCATION LOCATION | Exactly `"12-34 12-34 \r\n"`; do not change the coordinate preference. |
| EX-STATUS-05 | Short, radio disabled and radio damage 3000; STATUS RADIO | Exactly `"Rdamaged \r\n"`, regardless of the disabled state. |
| EX-DAMAGE-02 | Every device has zero or negative damage; DAMAGES UNKNOWN | Exactly `"All devices functional.\r\n"`; no selector diagnostic. |
| EX-DAMAGE-03 | Short, warp damage 10 and shield damage 0; DAMAGES SH | Exactly `"SH     0\r\n"`; no general heading or warp row. |
| EX-DAMAGE-04 | Medium, warp damage 10 and shield damage 0; DAMAGES SH | Exactly `"Shields     0.0\r\n"`; selected zero damage is shown. |
| EX-TIME-02 | Pregame; elapsed world 3600001 ms, session CPU 999 ms, host time of day 3723000 ms; TIME | Exactly `"\r\nGame's elapsed time:  01:00:00\r\nJob's total run time: 00:00:00\r\nCurrent time of day:  01:02:03\r\n"`; omit ship fields. |
| EX-TIME-03 | Duration formatter receives 360000000 ms | Exactly `":0:00:00"`; this is 100 elapsed hours, not a wrapped clock time or an expanded decimal field. |
| EX-USERS-02 | Short, no occupied roster slots; USERS | Exactly `"----\r\n"`; the faction divider is emitted despite an empty roster. |

**Evidence:** [STATUS](terminal.md#term-15--status-fields),
[DAMAGES](terminal.md#term-16--device-damage-reports),
[TIME](terminal.md#term-17--time-reports-and-duration-fields) and
[USERS](terminal.md#term-18--users-identity-rows).
These expectations have not been executed against the native image.

## CONF-12 — LIST-family presentation scenarios

These source-derived cases exercise the specified row or grouped-output
operation with supplied valid selection state. They do not assert that every
combination is produced by one particular command spelling. Assume absolute
coordinate output, no intervening activity, and the same initial cursor condition
as CONF-11. Exclude subsequent prompts.

| ID | Conditions and input | Expected observation |
| --- | --- | --- |
| EX-LIST-02 | Medium; enemy Romulan detail flagged out of range, command LIST | Exactly `"*?? out of range\r\n"`; no coordinates or energy. |
| EX-LIST-03 | Medium; friendly Federation base detail at 12–34, strength 1000, in range | Exactly `" <> @12-34   100.0%\r\n"`. |
| EX-LIST-04 | Short; neutral planet detail at 12–34, one build | Exactly `"  @ 12-34     1\r\n"`; no build suffix. |
| EX-LIST-05 | Long; enemy Empire planet detail at 12–34, one build, command LIST | Exactly `"*Emp planet  @12-34     1 build\r\n"`. |
| EX-LIST-06 | Short summary, count 2, category Federation ship, known and whole-game flags | Exactly `"  2 known Federation ships\r\n"`; reset the supplied count to zero. |
| EX-LIST-07 | Medium summary, count 1, category Romulan, specified-range and whole-game flags | Exactly `"  1 Romulan in game\r\n"`; whole-game suffix takes precedence. |
| EX-LIST-08 | Short grouped pass with Romulan selection counter 2 and summary flag only; all other selection counters zero; command SUMMARY | Exactly `"  2 Romulans\r\n"`; reset the Romulan counter. Do not clamp the displayed count to one. |
| EX-LIST-09 | Same selected Romulan state, but command TARGETS | Exactly `"  2 Romulans\r\n\r\n  1 target\r\n"`; the separate target total increases once. |
| EX-LIST-10 | Grouped detailed base row admitted without the privilege-only bit; viewer has not discovered it | Emit the row, then add the viewing team's discovery bit. A summary-only flag does not add that bit. |

**Evidence:** [detail rows](terminal.md#term-19--list-family-detail-rows),
[summary rows](terminal.md#term-20--list-family-summary-rows) and
[grouped output](terminal.md#term-21--list-family-grouped-assembly).
These cases are source-path derivations, not native transcript comparisons.
