# Semantic examples and conformance


## Conformance domains

Conformance is assessed against an identified edition, source variant and set
of clauses. Austin is the default variant. A CompuServe claim applies its
explicit amendments to the core; it cannot select whichever variant is most
convenient for each command. Numerical normalization is the ordinary arithmetic
of this specification, not a separate license to change costs or balance.

The following domains distinguish the requirements being assessed. They do
not declare this working draft complete or certify any implementation.

| Domain | Required correspondence |
| --- | --- |
| Command language | Character and token rules, accepted and rejected forms, abbreviation precedence, defaults, interactive continuations and the operation selected by each accepted input. |
| Game semantics | Abstract values and identities, preconditions, ordered state effects, observations, resource/score changes, information access, lifecycle, timing, random choices and multiplayer interactions. |
| Terminal presentation | The command-language and game-semantics requirements, plus prescribed text, numeric formatting, spacing, line/control behavior, prompts and the declared terminal/transport binding. |

A game-semantics assessment can concern a graphical interface. It must identify
how user actions invoke the specified operations and preserve their arguments,
preconditions and effects. That assessment does not establish command-language
or terminal correspondence. A command-language assessment alone likewise does
not establish that the selected operation has been implemented correctly.
Changing a display does not authorize disclosing knowledge the captain lacks.

## Declaring a claim

While this edition remains a working draft, claims MUST identify the specific
reviewed clauses and their domains. An unqualified claim of complete DECWAR
conformance is unavailable. A declaration records:

1. The specification revision, Austin or CompuServe variant, and assessed clauses.
2. The input, environment and terminal bindings used by those clauses, including
   documented implementation-defined choices.
3. Unresolved clause dependencies, unsupported domains and separately enabled
   repairs or extensions that affect the assessment.
4. Evidence for the claim and its limits: source review, abstract scenarios,
   implementation tests or native observations, distinguished from one another.

An unresolved question is not an implementation-defined choice. A claim cannot
fill it with an arbitrary behavior and describe that behavior as required by
this specification. A clause whose result depends on such a question can be
assessed only within its explicitly defined domain. Extensions and playable
repairs must be distinguished from the assessed behavior; their existence does
not alter the Austin core or silently amend CompuServe.

## Assessing behavior

Compare executions using the same stated initial abstract state, operation or
command inputs, environment events and admissible random choices. Identity
names may differ between implementations if their correspondence preserves all
relationships and observations; stored representations need not match.

For deterministic rules, the resulting values and observations must agree.
For ordered multi-step rules, compare the intermediate effects and their stated
ordering as well as final state. An implementation must not erase an allowed
observation by making a command indivisible when the clause requires observable
intermediate effects. Nor may it introduce an ordering, timeout or eventual
completion promise that the clause does not establish and treat that promise
as a DECWAR requirement.

For nondeterministic rules, an observed result must belong to the specified
possibilities under the stated conditions. One permitted run does not establish
the required probability distribution, independence or timing behavior. Random
replay checks conditioned choices; distribution claims require separate evidence.
The supplied examples are witnesses of particular cases, not an exhaustive test
suite or a substitute for reviewing an operation's full stated domain.

Terminal assessment compares the prescribed output and control behavior within
the identified binding. Transport framing or local client echo must be separated
from game-generated output according to that binding. An unavailable binding
prevents the corresponding terminal claim; a visually similar screenshot alone
does not establish exact terminal correspondence.

These criteria organize evidence and claims. They add no command, gameplay
operation, scoring rule, scheduling policy or required implementation architecture.

## Semantic examples

The examples below use the abstract model and ordinary game-unit arithmetic.
They describe commands in an otherwise unchanged world, with no intervening
actions or incoming combat. Passing these examples alone does not establish
complete conformance. The command and world-rule conversion is still incomplete.

Unless a case says otherwise, a turn-completing example begins with world action
count zero and two commissioned players, so that turn does not invoke automatic
defense phases. Other ships and installations do not alter the stated result.

| ID | Initial state and input | Required result |
| --- | --- | --- |
| EX-MODEL-01 | Shields down, energy 800 units, shield damage zero, no tractor beam; SHIELDS UP | Shields up; energy 700 units; shield strength and stardate unchanged. |
| EX-MODEL-02 | Shields up, energy 800 units, shield damage zero, no tractor beam; SHIELDS UP | The same 100-unit charge applies; energy is 700 units. |
| EX-MODEL-03 | Shield damage 300.1 units; SHIELDS UP | Reject the action without changing shields, energy or tractor-beam state. |
| EX-MODEL-04 | Shield damage exactly 300 units, energy 800 units, no tractor beam; SHIELDS UP | Raising is permitted; energy becomes 700 units. |
| EX-MODEL-05 | Shields up; SHIELDS DOWN | Shields down; energy, shield strength and stardate unchanged. |
| EX-MODEL-06 | Engine energy 1000 units, shields down at 50%; SHIELDS TRANSFER 1 | Engine energy 999 units, shield strength 50.04%; shields remain down; condition yellow. |
| EX-MODEL-07 | Engine energy 1000 units, shields at 99%; SHIELDS TRANSFER 100 | Transfer is limited to 25 units; engine energy 975 units and shield strength 100%. |
| EX-MODEL-08 | Radio on; RADIO OFF | Radio disabled; no energy charge or stardate advance. |
| EX-MODEL-09 | Yorktown's captain has an empty gag set; RADIO GAG WOLF | Wolf is added to that captain's gagged senders. The radio's enabled state is unchanged. |
| EX-MODEL-10 | Tokenize `1 2.5` | The first token denotes integer 1; the second denotes decimal 2.5. They are independent values. |
| EX-MODEL-11 | Sender energy 1000 units, adjacent commissioned teammate at 4900 units; ENERGY to that ship with amount 100 | Sender energy 900 units; recipient energy 4990 units; no turn. |
| EX-MODEL-12 | Sender energy 1000 units, adjacent commissioned teammate at 4999 units; ENERGY to that ship with amount 100 | Recipient receives 1 unit. Sender is charged 10/9 units, retaining 8990/9 units. Neither quantity is rounded internally. |
| EX-MODEL-13 | Sender energy 100 units, adjacent commissioned teammate at 4999 units; request transfer of 100 | Rejected before applying recipient capacity; energies unchanged. |
| EX-MODEL-14 | Sender energy 1000 units, adjacent commissioned teammate at 5000 units; request transfer of 100 | Successful zero-amount transfer; both energies unchanged. |
| EX-MODEL-15 | Undocked ship with 1 torpedo, 1000 energy units, shields down at 20%, hull damage 200 units; exactly one friendly planet adjacent; DOCK | Before turn accounting: 6 torpedoes, 1500 energy units, shields still down at 30%, hull damage 150 units; docked, green, life reserve 5. A turn with automatic repair follows. |
| EX-MODEL-16 | Same resources as the preceding case, but already docked; DOCK | Before turn accounting: hull damage 100 units; other replenishment is the same. |
| EX-MODEL-17 | Ship with no adjacent friendly base or planet; DOCK | Rejected with no replenishment or turn completion. |
| EX-MODEL-18 | Undocked ship with one device at 120 damage units and all others at zero; REPAIR; completion before deadline and no intervening damage | Explicit repair removes 50 units; automatic repair removes another 30; final device damage 40. One turn completes. |
| EX-MODEL-19 | One device at 10 damage units, others zero; REPAIR -5 | That device becomes 15 and each other device becomes 5; no turn completion. |
| EX-MODEL-20 | All devices undamaged; REPAIR -5 | All remain undamaged; no turn completion. |
| EX-MODEL-21 | A 1-unit explicit repair finishes, including its report, at its deadline | Device repairs remain applied, but no automatic repair or turn completion occurs. |
| EX-MODEL-22 | Ship at (37,37), undiscovered planet at (45,45); SCAN 0 | The displayed rectangle contains only (37,37). The planet nonetheless becomes known to the acting team. No energy or turn cost. |
| EX-MODEL-23 | Ship at (37,37), terminal width 80; SCAN CORNER -3 4 | Display vertical coordinates 34 through 37 and horizontal coordinates 37 through 41, inclusive. |
| EX-MODEL-24 | Ship at (37,37), terminal width 40; SCAN 10 | Explicit range produces vertical and horizontal bounds 27 through 47, despite the narrower default. |
| EX-MODEL-25 | Radio off, radio damage exactly 300 units; STATUS RADIO | Report the radio as damaged rather than off. No state changes. |
| EX-MODEL-26 | Relative output-coordinate preference; STATUS LOCATION | Report absolute coordinates; retain the preference. |
| EX-MODEL-27 | Torpedo tubes have 10 damage units, tractor beam has zero, other devices undamaged; DAMAGES T | Report torpedo tubes at 10, then tractor beam at zero. No state changes. |
| EX-MODEL-28 | All devices undamaged; DAMAGES XYZ | Report all devices functional. Do not diagnose the selector. |
| EX-MODEL-29 | Adjacent commissioned teammates, both shields down, neither in a beam; TRACTOR names the other ship | One symmetric association is created and both are notified. Positions, energy and stardates are unchanged. |
| EX-MODEL-30 | A ship in a beam; TRACTOR OFF | Both endpoints lose the association. Neither moves or pays energy. |
| EX-MODEL-31 | Undamaged ship at (37,37), energy 1000, shields down, no beam; empty path; MOVE ABSOLUTE 40 37 | Arrive at (40,37), energy 964, green and undocked; complete one turn. |
| EX-MODEL-32 | Same movement and energy, shields up, no beam | Movement cost is 72 units; energy becomes 928. |
| EX-MODEL-33 | Same movement with shields down; a star at (38,37) blocks the first step | Stay at (37,37), pay 36 energy units and report obstruction; complete one turn. |
| EX-MODEL-34 | Docked red ship, warp damage 0.1 unit; request MOVE by four sectors | Reject the range after setting green and undocked. No movement energy or turn is charged. |
| EX-MODEL-35 | Adjacent friendly planet with zero builds; BUILD | One build and 50 construction points after normal turn accounting; one turn. |
| EX-MODEL-36 | Adjacent friendly planet with four builds; faction has ten active bases; BUILD | Reject before incrementing builds or adding pending score. |
| EX-MODEL-37 | Four-build friendly planet, nine friendly bases, update available; BUILD | Planet becomes a full-strength base. That stage contributes 500 construction points, including the completion bonus; one turn. |
| EX-MODEL-38 | Four-build friendly planet, capacity initially available, planet update unavailable; BUILD | Planet reaches five builds and pending construction score increases by 250; reject without a turn or score commitment. |
| EX-MODEL-39 | Shields-down ship with energy 1000 and hull damage zero; capture adjacent unfortified neutral planet; defensive draws b=0, c=0 | Planet joins the ship's faction. Defense deals 360 damage, leaving energy 640 and hull damage 360. Capture contributes 100 points; one turn. |
| EX-MODEL-40 | Same capture with ship energy 100 | Capture succeeds but defense destroys the ship. Ownership is not rolled back. |
| EX-MODEL-41 | Trace from (10,10), displacement (5,2), one step, deflection 0.005; blocker at (11,11) | Probe (11,10), then (11,11). Return the second as obstruction and (10,10) as last clear. |
| EX-MODEL-42 | Undamaged shielded shooter, energy 1000; enemy ship two sectors away with shields down, energy 2000, hull zero; PHASERS strength 100; no overheating, b=0, c=0 | Shot deals 648 damage; target energy 1352 and hull damage 648. Shooter pays 300 energy units and completes one turn without automatic repair. |
| EX-MODEL-43 | Undamaged shooter attacks full-strength enemy base at distance one using PHASERS strength 200; no overheating, b=0, c=0 | Ordinary hit damage is zero; base strength becomes 78.37%. No damage-score credit for that hit. |
| EX-MODEL-44 | Undocked ship with two torpedoes; TORPEDOS requests three | Reject without launching or completing a turn. Inventory remains two. |
| EX-MODEL-45 | Docked ship with two torpedoes, ready tubes; burst of two at a friendly base; no misfires | Both shots are neutralized. Inventory remains two; one turn without repair. |
| EX-MODEL-46 | Ship at (37,37), green, tubes ready in the future; TORPEDOS ABSOLUTE 1 37 37 | Own-location diagnostic; no consumption, no red-condition assignment; readiness becomes now and one turn completes. |
| EX-MODEL-47 | Three-shot burst, undocked, undamaged tubes, pacing class one; first shot misfires and damages tubes with IntegerDraw(3000)=100; empty path | Only the first shot travels. One torpedo is consumed; tube damage becomes 60 units; next readiness is burst completion plus 2600 ms. One turn, no repair. |
| EX-MODEL-48 | Enemy ship at (37,37), shields down, hull zero, energy 1000; torpedo impact a=0, b=0, c=0 with step (1,0), empty destination | Hull becomes 400, energy 600; ship moves to (38,37), red and undocked. Attacker gains 400 pending damage points. |
| EX-MODEL-49 | Same target with full raised shields and a tractor beam; impact a=0.9, b=0.2, c=0 | Deflection: shields become 99%, hull and energy unchanged. Ship is still displaced; beam is released after the hit notice. |
| EX-MODEL-50 | Full-strength enemy base; torpedo impact a=0, b=0, c=0 | No deflection; zero ordinary hit damage; strength becomes 87.97%, no displacement or damage-score credit. |
| EX-MODEL-51 | Neutral zero-build planet hit by player torpedo; update available, IntegerDraw(4)=4 | Planet is destroyed; pending PLANET_DESTRUCTION decreases by 100 points. |
| EX-MODEL-52 | Full-shielded green docked ship, devices undamaged, hull zero, energy 1000; nova device draws zero, IntegerDraw(1000)=100, energy draw 0.5, shield draw 100; displacement blocked | Severity 25, hull damage 210, energy 895, shields 80%. Ship remains green and docked. |
| EX-MODEL-53 | Compare nova severity at raised shields 80% and 80.1%, all other inputs equal | Severity is respectively 20 and 25. The below-20 replacement is not a monotonic clamp. |
| EX-MODEL-54 | Planet with three builds; nova update available | Builds become zero; planet survives. With two initial builds it would be destroyed. |
| EX-MODEL-55 | Romulan energy 201; player-initiated nova; displacement survives | Energy becomes 100.5; player gains 10.05 pending ROMULAN points, with no kill bonus. |
| EX-MODEL-56 | Three players; activated base attacks an eligible shields-down ship one sector away; phaser b=0, c=0 | Firing strength is 200/3; hit damage is 480; owning faction receives 480 damage points directly. |
| EX-MODEL-57 | Three players; activated two-build planet attacks a shields-down ship one sector away; phaser b=0, c=0 | Firing strength is 110/3; hit damage is 264. |
| EX-MODEL-58 | Same planet attacks the Romulan one sector away, energy 300; IntegerDraw(100)=100 | Firing strength is 110, undivided; Romulan damage is 220 and energy becomes 80. |
| EX-MODEL-59 | Acting faction has three players; opposing base strength 97%; BaseReplenishment | Add 5/6 percentage point, yielding 587/6%. No integer quantization. |
| EX-MODEL-60 | Neutral planet, eligible ships and Romulan in range; defensive IntegerDraw(2)=1 | The planet skips all attacks for this activation. |
| EX-MODEL-61 | Federation captain; Wolf commissioned more than ten sectors away; no privilege; LIST WOLF | Identify Wolf and report out of range. Withhold position and shield strength; no state change. |
| EX-MODEL-62 | Federation captain; undiscovered Empire base five sectors away; LIST BASES ENEMY | Show the base's location and strength, then add it to Federation knowledge. No turn or energy cost. |
| EX-MODEL-63 | Same base fifteen sectors away, still undiscovered; LIST BASES ENEMY | Do not disclose a base detail row or discover it. Report absence of known matching bases. |
| EX-MODEL-64 | Same undiscovered remote base; SUMMARY BASES ENEMY | Include the base in the whole-game count, without revealing its location or changing knowledge. |
| EX-MODEL-65 | Same undiscovered base fifteen sectors away; SUMMARY BASES ENEMY 20 | Exclude it from the specified-range count: it is beyond sensor range and not previously discovered. |
| EX-MODEL-66 | Known neutral planet fifteen sectors away; PLANETS | Exclude it because the default distance limit is ten. |
| EX-MODEL-67 | Same known remote planet, two builds; PLANETS ALL | Report its current location and two builds. Prior knowledge permits remote detail. |
| EX-MODEL-68 | Unseen planet three sectors away; PLANETS 5 | Report it and add its identity to faction knowledge. |
| EX-MODEL-69 | Privileged captain; unknown enemy base fifteen sectors away; LIST BASES ALL | Show location and strength, but do not add it to ordinary faction knowledge. |
| EX-MODEL-70 | Unknown planet at (37,38), captain at (37,37); LIST 37 38 | Report the planet immediately. This exact-position path does not discover it for the faction. |
| EX-MODEL-71 | Two eligible planets at equal distance, no nearer planet; PLANETS CLOSEST | Report the later planet in current planet order. Do not perform deferred discovery. |
| EX-MODEL-72 | Friendly base more than ten sectors away; BASES | Show its location and strength and include it in the base count. Friendly detail is not limited to ten sectors. |
| EX-MODEL-73 | Friendly and enemy ships more than ten sectors away; TARGETS ALL | Exclude the friendly ship. Identify the enemy as out of range without its location. |
| EX-MODEL-74 | Captain at (37,37), friendly commissioned ship at (37,38); BASES 37 38 | Report the ship at that exact position; this path accepts ships despite the BASES default kind. |
| EX-MODEL-75 | Undiscovered remote enemy base; LIST BASES SUMMARY | Count the base but withhold its detail. Knowledge is unchanged. |
| EX-MODEL-76 | Wolf commissioned and visible; LIST WOLF AND BOGUS | Wolf's immediate row precedes the illegal-keyword diagnostic and remains visible. No deferred report follows the error. |
| EX-MODEL-77 | Acting ship has 100 committed points and 50 pending points; POINTS | Report total 100. Leave pending points uncommitted and unchanged. |
| EX-MODEL-78 | POINTS ME FEDERATION; one category is zero for the ship and 50 for Federation, all others zero | Show that category with values zero and 50; omit every all-zero category. Columns are ship then Federation. |
| EX-MODEL-79 | Acting ship commissioned; POINTS ME 1 ALL | The integer ends selector processing. Report only the acting ship; ignore ALL after it. |
| EX-MODEL-80 | Romulan activity disabled; POINTS ROMULANS | No selected column remains; diagnose invalid input. |
| EX-MODEL-81 | Acting ship and another eligible ship, no other objects; LIST SHIPS CLOSEST | Exclude the acting ship from nearest-object selection and report the other ship. |
| EX-MODEL-82 | Federation total 100 points, three cumulative commissions and four turns; POINTS FEDERATION | Total 100, commissions three, points per commission 100/3, points per turn 25, before terminal formatting. |
| EX-MODEL-83 | One Romulan present; SUMMARY SHIPS AND SHIPS | Its summary counts two qualifying selections. No additional Romulan is created. |
| EX-MODEL-84 | TARGETS FRIENDLY | Diagnose an illegal keyword; FRIENDLY is not a TARGETS selector. |
| EX-MODEL-85 | TYPE O, followed by an empty continuation | Diagnose the ambiguous switch, prompt, then cancel without changing preferences. |
| EX-MODEL-86 | TYPE OU | Report output preferences, in the specified order; do not change them. |
| EX-MODEL-87 | Black holes were selected initially but have since been removed; TYPE OPTION | Report the selected black-hole option, not a fresh count of surviving black holes. |
| EX-MODEL-88 | Commissioned session; TIME | Report galaxy elapsed time, commission elapsed time, commission execution time, session execution time and time of day, in that order. No turn. |
| EX-MODEL-89 | Pregame session; TIME IGNORED | Omit both commission-specific rows and ignore the trailing token. |
| EX-MODEL-90 | Nonprivileged captain using SHORT output; USERS; an enemy captain is beyond sensor range | Include that captain's six ordinary fields. Omit location; do not omit the row merely because it is remote. |
| EX-MODEL-91 | Privileged captain using LONG output; USERS | Include the header and each commissioned captain's six fields plus location, in roster order. |
| EX-MODEL-92 | Adjacent planet has two builds and belongs to the other faction; successful CAPTURE | At the capture event, ownership changes, builds become zero and energy decreases by 100. The subsequent defense has strength 110 and former-faction attribution. |
| EX-MODEL-93 | Same capture begins at elapsed time 20 seconds; coordinates are supplied at 26 seconds | Capture deadline is 27 seconds, leaving at most one second of capture delay after the reply. Defense and shared turn effects still apply. |
| EX-MODEL-94 | Adjacent planet already belongs to the actor's faction; CAPTURE | AlreadyOwned rejection; no capture energy charge, fortification removal, defense, score or turn. |
| EX-MODEL-95 | Valid adjacent neutral planet; surrender is refused | SurrenderRefused outcome and government-refusal diagnostic. No capture effects or turn. This case does not define the unresolved cause of refusal. |
| EX-MODEL-96 | Output is LONG; SET OUTPUT BOGUS | Leave LONG unchanged; no extra value prompt or unknown-choice diagnostic. No turn. |
| EX-MODEL-97 | SET OUTPUT, followed by MEDIUM at the value prompt | Output becomes MEDIUM. Ship resources and stardate are unchanged. |
| EX-MODEL-98 | Input default ABSOLUTE; SET ICDEF BOTH | Leave the input default ABSOLUTE. BOTH is not an accepted input-default choice. |
| EX-MODEL-99 | SET OCDEF BOTH | Output-coordinate mode becomes BOTH. Input-coordinate mode is unchanged. |
| EX-MODEL-100 | SET TTYTYPE ADM, then an empty reply to the ambiguity prompt | Diagnose ambiguity; the first match, ADM-2, remains selected. |
| EX-MODEL-101 | CRT profile selected; SET TTYTYPE BOGUS, then an empty reply | No profile remains selected. The presentation binding for this state is unresolved. |
| EX-MODEL-102 | SET NAME abcdefghijklmnop | Captain display name becomes ABCDEFGHIJKL. Ship and account identities are unchanged. |
| EX-MODEL-103 | Privilege enabled; *PASSWORD *MIN | Clear privilege: a prefix of the retained password is insufficient. No password prompt. |
| EX-MODEL-104 | Privilege disabled; *PASSWORD *MINK | Enable privilege; no success text, resource change or turn. |
| EX-MODEL-105 | Sender's radio off, device damage 299; TELL followed by an empty recipient reply | Cancel recipient selection, but leave the sender's radio on. |
| EX-MODEL-106 | Same command with radio damage exactly 300 | Reject before enabling the radio or prompting for recipients. |
| EX-MODEL-107 | Sender has gagged Wolf; Wolf commissioned with working radio on; TELL WOLF followed by Ctrl-C at Msg: | No publication; sender's radio stays on and Wolf is removed from the sender's gagged-sender set. Wolf's own settings are unchanged. |
| EX-MODEL-108 | Eligible Wolf; TELL WOLF WOLF;Hi | Publish one message with body Hi and one recipient, Wolf. No duplicated delivery or turn. |
| EX-MODEL-109 | Eligible Wolf; TELL WOLF;A | Report No message sent; no publication. Earlier radio and ungag effects remain. |
| EX-MODEL-110 | Eligible Wolf; TELL WOLF with an 80-character body | Retain the first 75 characters in one message; consume the complete input body. |
| EX-MODEL-111 | Message to Farragut and Wolf; Farragut receives first | Remove Farragut only from remaining recipients. Wolf still has an unread message; its displayed audience still names both ships. |
| EX-MODEL-112 | Wolf has an unread message from Farragut, then gags Farragut before receiving | Consume the message with Suppressed outcome and no display. Other recipients are unaffected. |
| EX-MODEL-113 | Wolf's working radio was on during recipient selection, then is turned off before receiving | Already addressed message remains receivable; delivery-time gagging still applies. |
| EX-MODEL-114 | All 32 message places occupied; oldest is addressed only to Farragut; several later messages also address Wolf | Next publication removes Farragut from every unread audience. Wolf retains its unread messages; the oldest message frees capacity. |
| EX-MODEL-115 | Same capacity state, but acquired TELL body is one character | Capacity loss can precede No message sent. No new message is published, and lost backlog is not restored. |
| EX-MODEL-116 | A message was displayed earlier; subsequent reception obtains none | NoMessage outcome; do not display the previous body again. |
| EX-MODEL-117 | TELL ROMULAN with no other recipients | No recipient remains; diagnose that fact. No message prompt or autonomous reply. |
| EX-MODEL-118 | Ship under RED alert; HELP | Reject before topic output or temporary sector activity. Ship state and turn count are unchanged. |
| EX-MODEL-119 | Ship under GREEN alert; HELP, with another captain scanning its sector during output | The sector is observed as a black hole; the ship remains commissioned with its original resources. On ordinary completion, ship presence returns. |
| EX-MODEL-120 | Nonprivileged captain in pregame; HELP * | List the 31 ordinary main-game commands. Do not substitute the pregame table or expose *DEBUG and *PASSWORD. |
| EX-MODEL-121 | Privileged captain; HELP * | List all 33 main-game commands, in main-table order. |
| EX-MODEL-122 | HELP IN | No main command matches; INTRO and INPUT make the extra-topic match ambiguous. Report ambiguity rather than choosing one. |
| EX-MODEL-123 | HELP H with accessible HELP content | Match the main command HELP before considering HINTS. Display the HELP section. |
| EX-MODEL-124 | HELP BOGUS SCAN with available SCAN content | Report the unknown first topic, then display SCAN. The error does not discard later topics. |
| EX-MODEL-125 | Privileged help resource opens but lacks SCAN; standard resource has SCAN; HELP SCAN | Report the missing section. Do not fall back merely because a section is absent. |
| EX-MODEL-126 | Privileged help resource cannot open; standard resource contains SCAN; HELP SCAN | Use the standard resource's SCAN section. |
| EX-MODEL-127 | HELP SCAN MOVE; Ctrl-C detected at a line boundary within SCAN output | End that section and clear its stop condition; MOVE can still be displayed. A separate control detected between topics would end processing. |
| EX-MODEL-128 | Ship under RED alert; NEWS with accessible content | Viewing is allowed. The ship retains ordinary sector presence and completes no turn. |
| EX-MODEL-129 | News contains first line, LF, dot, second line; reply YES at continuation | Display the first line and LF, prompt once, omit the dot, then display the second line. |
| EX-MODEL-130 | Same news; reply NO | Stop after the prompt. Do not display the second line. |
| EX-MODEL-131 | News starts with a dot and has no preceding line boundary | Display the leading dot as ordinary content; it does not itself request confirmation. |
| EX-MODEL-132 | Ship under RED alert; GRIPE | Reject before body acquisition or temporary sector activity. No feedback record is added. |
| EX-MODEL-133 | GRIPE; immediate Ctrl-Z with no characters | Cancel. Add no record; restore any temporary information activity. |
| EX-MODEL-134 | GRIPE; one complete blank line, then Ctrl-Z | Record the blank line with context and separator. This is not the immediate-empty cancellation case. |
| EX-MODEL-135 | GRIPE; twenty complete lines | Warn after line eighteen; report the limit at line twenty and finish without a twenty-first line. |
| EX-MODEL-136 | Existing feedback records A then B; successful submission C | Feedback order becomes C, A, B. No radio message or game score is created. |
| EX-MODEL-137 | Feedback resource reports being modified; Ctrl-C during retry wait | Cancel recording and restore information activity; do not add the submitted record. |
| EX-MODEL-138 | Active captain types QUIT YES, then NO at the fresh prompt | Continue playing. The inline YES did not confirm; no release, turn or final score report occurs. |
| EX-MODEL-139 | Pregame captain; QUIT | End the session without a confirmation prompt or a ship-score report. |
| EX-MODEL-140 | Active captain confirms QUIT; final report succeeds; ship participates in a tractor beam | Report committed final scores, release the beam and commission, discard that ship's unread notifications and end the session. No turn. |
| EX-MODEL-141 | Last participant leaves an unterminated galaxy at elapsed time 100 seconds | Retention deadline becomes 400 seconds. An eligible arrival before that deadline can reuse the galaxy. |
| EX-MODEL-142 | Same empty galaxy; admission begins at elapsed time 400 seconds | The expired galaxy is reinitialized under admission rules; retention does not extend merely because it was still stored. |
| EX-MODEL-143 | Ten recent-commission records in insertion order; oldest matching identity departs again | Update that record in place. The next previously unseen identity still replaces the oldest inserted record. |
| EX-MODEL-144 | Returning session has the same display name and terminal as a recent departure but a different account/execution pair | That history entry does not match. Display name and terminal alone do not establish return identity. |
| EX-MODEL-145 | News has a continuation boundary; acquired command line is NEWS / YES | The slash remainder supplies the continuation reply. An additional physical input line is not required for that boundary. |
| EX-MODEL-146 | Initial startup dialogue; empty reply | Begin admission. Do not require PREGAME or ACTIVATE first. |
| EX-MODEL-147 | Initial startup dialogue; HELP | Display general help and the command list, then repeat startup. Do not begin commissioning. |
| EX-MODEL-148 | Pregame; MOVE | Diagnose a command valid only during play and include the help hint. No acting ship is created. |
| EX-MODEL-149 | Pregame; ACTIVATE | Begin admission without selecting a faction or ship solely from that command. |
| EX-MODEL-150 | No matching history; faction populations Federation 5, Empire 3 | Assign Empire without asking which faction. |
| EX-MODEL-151 | No matching history; faction populations 4 and 4; empty faction reply | Select Federation. |
| EX-MODEL-152 | No matching history; Federation 4, Empire 3; empty faction reply | Select Empire, the smaller faction. |
| EX-MODEL-153 | Returning Federation captain; Federation full; YES to defection | Select Empire and offer its available ships. Existing captains retain their commissions. |
| EX-MODEL-154 | Former faction has room but former ship is occupied; NO to another ship | Cancel admission without a faction-acceptance increment. Remove the overall participant reservation. |
| EX-MODEL-155 | Faction has cumulative commission count 4; captain accepts it, then cancels during ship choice | Count becomes 5 and remains 5. Overall and faction participant reservations are removed. |
| EX-MODEL-156 | Successful new commission before initialization commands | Energy 5000, ten torpedoes, shields UP at 100%, no damage, life reserve five, GREEN, stardate and individual score zero. |
| EX-MODEL-157 | Pregame privilege enabled; successful admission | Admission does not clear privilege. Later commands still apply their explicit privilege rules. |
| EX-MODEL-158 | No preference changes before admission; TYPE OUTPUT after commissioning | Initial input mode is reported BOTH, although unqualified numeric locations are relative. Terminal profile is CRT. |
| EX-MODEL-159 | New-galaxy star draw 0, hole draw 0; holes selected | Choose 100 stars and ten black holes, along with twenty planets and ten bases per faction. |
| EX-MODEL-160 | New-galaxy star draw 0.999, hole draw 0.999; holes selected | Choose 350 stars and fifty black holes. |
| EX-MODEL-161 | New galaxy; empty regular/tournament reply, empty Romulan reply, empty black-hole reply | Regular game, Romulan activity enabled but none initially present, no black holes. The potential hole-count draw was still consumed. |
| EX-MODEL-162 | Initial ship-placement candidate is empty but three sectors from an opposing base | Reject that candidate and draw another vertical/horizontal pair. |
| EX-MODEL-163 | Eighteen participant places already occupied; another arrival | Attempt a different galaxy; do not evict an existing captain or offer an occupied ship. |
| EX-MODEL-164 | Initialization resource unavailable after placement | Report its absence and continue with existing preferences. The error text does not assign replacement defaults. |
| EX-MODEL-165 | One planet remains; Federation has no bases; ordinary world-end check | Galaxy continues because a planet remains. |
| EX-MODEL-166 | No planets remain; both factions have at least one base | Galaxy continues. |
| EX-MODEL-167 | No planets remain; Federation has no bases; Empire has a base | End the galaxy, announce Empire victory, and perform the checking captain's final report/release/exit. |
| EX-MODEL-168 | No planets or bases remain | Announce total destruction, then both faction victory reports in their specified order. Do not invent a score bonus. |
| EX-MODEL-169 | `s.devices[WARP_ENGINES].damage` is 300 units; MOVE with no coordinates | Reject before asking for coordinates. No movement, energy charge, undocking or turn occurs. |
| EX-MODEL-170 | Warp-device damage is 300 units and impulse-device damage is zero; IMPULSE with no coordinates | The propulsion check succeeds and coordinates are requested; warp damage does not reject IMPULSE. |
| EX-MODEL-171 | All nine device-damage values are zero; REPAIR ALL DAMAGE | No repair, damage report or turn occurs. |
| EX-MODEL-172 | All nine device-damage values are zero; REPAIR 0 DAMAGE | Produce the requested damage report without repair or a turn. |
| EX-MODEL-173 | Warp-device damage is 40 units, all other device damage is zero, hull damage is 70, shields are DOWN at 60%; REPAIR 10 | At the explicit repair event, warp-device damage becomes 30; hull damage, shield mode and shield strength are unchanged. Any ensuing automatic repair is a separate event. |
| EX-MODEL-174 | Yorktown is active and Wolf is uncommissioned; RADIO GAG WOLF | Add Wolf's identity to Yorktown's captain's gag set and confirm it; Wolf need not hold a commission. |
| EX-MODEL-175 | Shield-device damage is 300 units, warp-device damage is 400, energy is 800, no beam; SHIELDS UP | Raise shields and leave energy 700. Both device-damage values remain unchanged; warp damage is not a precondition. |
| EX-MODEL-176 | The ship's radio-device damage is 450 units and the captain's radio setting is OFF; RADIO ON | Enable the captain's radio setting and report it. The device-damage value remains 450; no energy charge or turn occurs. |
| EX-MODEL-177 | The actor already has a tractor beam; TRACTOR BOGUS | Report the existing beam before attempting ship-name resolution. Do not replace or release the association. |
| EX-MODEL-178 | Federation actor with no beam; Wolf is uncommissioned; TRACTOR WOLF | Diagnose an enemy target before testing whether Wolf is commissioned. |
| EX-MODEL-179 | Adjacent commissioned teammates, shields DOWN, no beams, tractor-device damage 450 units on both; TRACTOR names the teammate | Engage one symmetric beam; tractor-device damage is not a precondition and remains unchanged. |
| EX-MODEL-180 | A at (37,37), B at (37,36), in one beam; both shields DOWN, devices undamaged; A has 1000 energy; clear path; A moves to (39,37) | A ends at (39,37) with 952 energy. B follows to (38,37) without an energy charge or its own turn. Only A completes the movement turn. |
| EX-MODEL-181 | A at (39,37), B at (38,37), in one beam; shields DOWN, devices undamaged; B has 1000 energy; clear path; B moves to (38,39) | B ends at (38,39) with 952 energy; A follows to (38,38). Beam membership is unchanged; either endpoint can lead a movement. |
| EX-MODEL-182 | Undamaged ship at (37,37), shields DOWN, no beam, energy 1000; MOVE to (42,37); clear path; potential-damage draw 3100 and risk draw 91 | Report and add 310 warp-device damage, then complete movement despite crossing 300. Energy becomes 900; normal automatic repair leaves warp damage 280. |
| EX-MODEL-183 | TracePath starts at (75,75), displacement (1,0), steps 1, deflection 0 | Return lastClear (75,75), step (1,0), and no obstruction. Leaving the galaxy is not an object collision. |
| EX-MODEL-184 | Trace from (10,10), displacement (5,2), one step, deflection 0.1; both candidate sectors clear; UnitDraw gives 0.8 | Probe (11,10) then (11,11), select lastClear (11,11), return step (1,0.5) with no obstruction. |
| EX-MODEL-185 | Adjacent friendly planet has five builds retained from a refused conversion; BUILD | Advance to six builds and add 300 pending construction points. Complete an ordinary stage and turn, without attempting conversion; planet survives. |
| EX-MODEL-186 | Fifth BUILD passes its initial capacity check, but no base identity is available when conversion is attempted | Restore the planet to four builds and report the capacity rejection. Retain 250 new pending points without a turn or score commitment. |
| EX-MODEL-187 | Normal conversion reuses a base identity formerly known to Empire; Empire does not know the converted planet | The new base is not in Empire's known-base set. Other installation knowledge is unchanged. |
| EX-MODEL-188 | An Empire ship is docked adjacent to an Empire planet; a Federation ship successfully captures that planet; no intervening actions | The Empire ship remains docked: its re-evaluation occurs while the planet is still friendly. Capture does not perform a second docking check after changing ownership. |
| EX-MODEL-189 | Last planet has four builds, is friendly to actor and adjacent; actor's faction has nine bases and the enemy has none; actor has 120 committed points and zero pending; BUILD reaches world-end check | End the galaxy before the construction report and normal turn. The 500 new construction points remain uncommitted; the final actor score report uses 120. No extra automatic repair or turn is added. |
| EX-MODEL-190 | Enabled Romulan activity, ten players, cadence 3 and turns 7; invoke AdvanceRomulan | Cadence becomes 4; turns stays 7. No appearance, movement or attack is attempted because twice cadence is below ten. |
| EX-MODEL-191 | No Romulan, two players, cadence 4 and turns 7; invoke AdvanceRomulan | Cadence becomes 5 and turns becomes 8; appearance is deferred because cadence is below six. |
| EX-MODEL-192 | No Romulan, two players, cadence 5; appearance draw is 5 | Cadence becomes 6 and turns increases by one, but no Romulan appears and cadence is not reset. |
| EX-MODEL-193 | No Romulan, two players, cadence 5; appearance draw 1, empty placement (20,20), energy draw 50; no speech, nearest target beyond range ten | Romulan appears at (20,20) with 250 energy; cadence becomes zero, appearances increases by one, existing weapon deadlines and score are retained. No movement or attack occurs. |
| EX-MODEL-194 | Present Romulan at (10,10); only candidates are a Federation ship at (15,10) and Empire ship at (14,14) | Select the Federation ship: squared distance 25 beats 32 even though its grid range five exceeds the other's four. Return range five. |
| EX-MODEL-195 | One candidate in each of the four groups, all at the same squared distance; tie draws in group-comparison order are 1, 2, 1 | Empire ship replaces Federation ship; Federation base does not replace it; Empire base becomes the final target. |
| EX-MODEL-196 | Romulan at (10,10), only target at (12,10); all other nearby sectors empty; pursue | Trace toward (11,10) for two steps, encounter target at (12,10), then avoid via (11,9). The first avoidance candidate (10,10) is occupied by the Romulan itself. |
| EX-MODEL-197 | Romulan has a point-blank target, cadence gate passes, now 1000, phaser deadline 1000 and torpedo deadline 2000 | Reset cadence and select torpedoes despite their later deadline; equality of the phaser deadline does not select phasers. |
| EX-MODEL-198 | Same point-blank target and time, both weapon deadlines 1001 | No attack or extra installation phases; increment cadence and activity turns but do not reset cadence. |
| EX-MODEL-199 | Both Romulan weapon deadlines are before now; weapon-choice draw is 2 | Select phasers at strength 200, without a Romulan energy charge or overheating check. |
| EX-MODEL-200 | Romulan phaser hit and notification publication finish at time 4000, pacing class two | Phaser deadline becomes 6250. Torpedo deadline is unchanged; later installation damage can still affect the Romulan. |
| EX-MODEL-201 | Target at (20,20); stars at (19,21) and (20,19); choose torpedo aim | Use (19,21), the first star in increasing vertical then horizontal neighborhood order. |
| EX-MODEL-202 | Romulan burst, pacing class one, all traces unobstructed, no misfires; burst ends at time 4000 | Launch three shots with the same aim displacement and no miss reports or energy charge; torpedo deadline becomes 10000. |
| EX-MODEL-203 | First Romulan torpedo misfires with draw 97; pacing class one; no self-destruction; burst ends at time 4000 | That torpedo still travels with extra deflection; no later shot launches. Torpedo deadline becomes 6000. |
| EX-MODEL-204 | Romulan torpedo strikes a zero-build planet, impact draw 75, update accepted, galaxy continues | Destroy the planet, subtract 100 PLANET_DESTRUCTION points from the Romulan's accumulated score, report the hit and retarget. |
| EX-MODEL-205 | Same planet and accepted update, impact draw 74 | Leave builds at zero and the planet present; report the hit and retarget. |
| EX-MODEL-206 | A nova from a Romulan torpedo destroys that Romulan; its torpedo deadline was 9000 | Burst returns without changing that deadline. Its accumulated activity score persists; post-weapon speech and installation phases still follow unless the galaxy ended. |
| EX-MODEL-207 | Triggering captain gags Wolf; Wolf is in the selected autonomous speech audience, commissioned, radio on and undamaged; publication later fails | Remove Wolf from that captain's gag set before publication. Leave the triggering captain's radio on/off setting and every other captain's gag choices unchanged. |
| EX-MODEL-208 | A commissioned ship is in HELP with BlackHoleObject at its recorded position, in range of an enemy base | The installation's eligibility check still admits the ship. The temporary sector kind does not provide immunity from that base attack. |
| EX-MODEL-209 | PHASERS 50 at an adjacent neutral planet; both bank deadlines 1000; now 2000; shields down, energy 1000, phaser damage zero; no overheat or build loss; reporting ends at 3000; pacing class one | Fired { bank: FIRST }; energy 950; FIRST deadline 6000, SECOND remains 1000. Complete one turn without automatic repair. |
| EX-MODEL-210 | PHASERS 49 at a valid adjacent planet; FIRST deadline 2000, SECOND 1000, now zero; devices available | Wait until 1000, then InvalidStrength. No shot, firing charge, deadline change or turn. |
| EX-MODEL-211 | Same deadlines and strength as EX-MODEL-210, but aim is an empty sector | InvalidTarget before waiting or strength validation. No firing changes or turn. |
| EX-MODEL-212 | Available phasers, commissioned friendly target eleven sectors away | FriendlyTarget precedes OutOfRange; do not wait for a bank or fire. |
| EX-MODEL-213 | Phaser damage exactly 300 units; enter PHASERS without arguments | PhasersUnavailable before a coordinates prompt; no shot or turn. |
| EX-MODEL-214 | PHASERS 300 at an adjacent neutral planet; shields UP, energy 1000, phaser damage 10; heat draws 64 and 20, planet draw 1; reporting ends at 4000; pacing class one | Add 120 damage, leaving phaser damage 130. Energy becomes 500; shields remain UP. Chosen bank deadline 8300; one turn, no automatic repair. |
| EX-MODEL-215 | PHASERS 50 at an adjacent neutral planet; shields UP, energy 100, devices undamaged; no overheat | Insufficient energy does not reject firing. Shield control and firing charges leave energy -150 before lifecycle handling; the shot is not rolled back. |
| EX-MODEL-216 | Torpedo-tube damage 300, inventory zero; enter TORPEDOS | TubesUnavailable precedes NoAmmunition and input acquisition. No turn. |
| EX-MODEL-217 | Docked, healthy tubes, inventory zero; TORPEDOS 1 with a valid target | NoAmmunition; docking does not bypass the entry inventory requirement. |
| EX-MODEL-218 | Healthy tubes, inventory two; request three torpedoes | Emit the inventory limitation and inventory report; InvalidBurstCount. No shot, reload-deadline change or turn. |
| EX-MODEL-219 | Healthy tubes, inventory two; request two shots, first aim own sector and second aim eleven sectors away; now 1000, previous reload deadline 9000; condition GREEN | Finished { shots: 0, reason: OWN_SECTOR }; reload deadline becomes 1000; inventory two and condition GREEN. Complete one turn without automatic repair; do not reach the second aim. |
| EX-MODEL-220 | Same state as EX-MODEL-219, with the two aims reversed | TargetOutOfRange; no shot or turn, reload deadline remains 9000. |
| EX-MODEL-221 | TORPEDOS 1 supplies a valid first aim and a second aim eleven sectors away; both are within galaxy bounds; healthy tubes, inventory two; clear trace and no misfire | Use only the first aim. Launch one shot, inventory becomes one and the burst completes normally. The unused second aim does not undergo the ten-sector burst check. |
| EX-MODEL-222 | Docked, healthy tubes, inventory two; request two shots; clear traces, no misfire; pacing class one, burst ends at 4000 | Finished { shots: 2, reason: REQUEST_FULFILLED }; inventory remains two, condition RED, reload deadline 8000; one turn, no automatic repair. Phaser deadlines unchanged. |
| EX-MODEL-223 | Undocked, healthy tubes, inventory three; request three shots; first misfire draws 97, 5 and 2500, clear trace; pacing class one, burst ends at 4000 | First shot travels; no later shot launches. Tube damage becomes 300, inventory two, reload deadline 9000. Finished { shots: 1, reason: MISFIRE }, one turn without repair. |
| EX-MODEL-224 | One launched torpedo hits an enemy planet; update refused; undocked, inventory initially two, healthy tubes, reload deadline initially 1000; condition initially GREEN | PlanetUpdateRefused { shots: 1 }, empty-tubes diagnostic; inventory one and condition RED. No planet change, new deadline, turn or pending-score commitment. |
| EX-MODEL-225 | A burst destroyed a ship on its first impact; second shot hits an enemy zero-build planet with an accepted update and build draw 1 | Planet remains at zero builds and is not destroyed. The earlier ship's destruction does not determine this impact's result. |
| EX-MODEL-226 | Actor at (37,37), enemy base at (37,42), black hole at (37,38), other displayed cells empty; SCAN 1 WARNING | Bounds 36..38 on both axes. Base becomes known although outside the rectangle. Cell (36,38) is WarningMark, (37,38) remains BlankSpace, and (36,37) remains EmptySpace. |
| EX-MODEL-227 | Actor at (37,37), neutral planet at (37,39), otherwise empty surrounding sectors; SCAN 1 WARNING | Discover the planet, but it creates no warning area. Displayed empty sectors remain EmptySpace. |
| EX-MODEL-228 | Actor at (37,37), unknown planet within ten sectors; SCAN CORNER 1 | RejectedSyntax with no discovery or scan result, no prompt and no turn. |
| EX-MODEL-229 | Actor at (37,37), unknown planet at (45,45); SCAN 1; interruption observed after first emitted row | Interrupted report has bounds 36..38 on both axes and only row 38. Planet knowledge is retained. Consume the scan interruption and omit bottom labels; no turn. |
| EX-MODEL-230 | Actor at (37,37), scanStyle SHORT; SCAN 0 | One cell and one row, containing ShipMark { ship: actor }. Both horizontal axes emit initial label 38, even though the only displayed horizontal coordinate is 37. Row labels remain 37. |
| EX-MODEL-231 | Actor at (37,37), terminal width 29, scanStyle LONG; SRSCAN | Default radius is five: bounds 32..42 on each axis, eleven rows and eleven cells per row. SRSCAN does not select SHORT presentation. |
| EX-MODEL-232 | Actor at (37,37); SCAN -2 3 | Clamp vertical extents to zero; horizontal extents are three. Report one row, vertical 37, with horizontal coordinates 34..40. |
| EX-MODEL-233 | Hull damage 12, warp damage 80, energy 900; STATUS DAMAGE BOGUS ENERGY | Emit HullDamageValue { value: 12 }, InvalidStatusItem and EnergyValue { value: 900 }, in that order. Warp damage is not included in the hull value. No state changes. |
| EX-MODEL-234 | STATUS 1 ENERGY | No status observations. The initial integer stops item processing; do not print the default report or the later energy item. |
| EX-MODEL-235 | Energy 900, hull damage 12; STATUS ENERGY ENERGY 1 DAMAGE | Emit EnergyValue { value: 900 } twice, then stop at the integer. No hull observation or stardate row. |
| EX-MODEL-236 | Shields DOWN at strength 40%; STATUS SHIELDS with MEDIUM output | ShieldValue { mode: DOWN, strength: 40%, equivalentEnergy: 1000 energy units }. Equivalent energy reports stored strength even while shields are lowered; no energy transfer occurs. |
| EX-MODEL-237 | Same shields, SHORT output | ShieldValue { mode: DOWN, strength: 40%, equivalentEnergy: none }; omit the equivalent-energy field. No preference or resource changes. |
| EX-MODEL-238 | Warp damage 8, all other devices zero; DAMAGES 1 TR | First argument is not a name token, so report all positively damaged devices: one WARP_ENGINES row at 8. The later TR token does not select a different report. |
| EX-MODEL-239 | Torpedo-tube damage 10, tractor-beam damage zero, all other devices zero; DAMAGES T T | Four rows: TORPEDO_TUBES 10, TRACTOR_BEAM 0, then those same two rows again. No deduplication. |
| EX-MODEL-240 | Warp damage 8, all others zero; DAMAGES BOGUS | Rows { style: SELECTED, titleObject: none, values: empty }. Skip the unmatched selector silently; do not fall back to the general report or emit AllDevicesFunctional. |
| EX-MODEL-241 | All devices zero, hull damage 100; DAMAGES WA | AllDevicesFunctional. Hull damage does not participate in the device-damage availability test. |
| EX-MODEL-242 | Selected CRT profile; preferences MEDIUM, NORMAL prompt, LONG scans, input BOTH and output RELATIVE; TYPE OUTPUT | Report those six values in that order, ending with CRT. Reporting input BOTH does not change the relative interpretation of unqualified numeric locations. |
| EX-MODEL-243 | TYPE O, followed by OP at the switch continuation | Emit the ambiguity diagnostic and prompt, then report version, Romulan option and black-hole option. No preference is changed. |
| EX-MODEL-244 | Galaxy selected black holes; SET BHREMV has removed all of them; TYPE OPTION | BlackHoleOptionValue { selected: true }. Report the selected option, not the remaining object count. |
| EX-MODEL-245 | Active viewer; game elapsed observation 60000 ms, commission elapsed 20000 ms, execution baseline 100 ms; successive execution observations 135 and 140 ms; local time 08:00 | Report GameElapsed { value: 60000 }, CommissionElapsed { value: 20000 }, CommissionExecution { value: 35 }, SessionExecution { value: 140 }, TimeOfDayValue { value: 08:00 }, in order. Preserve baselines and game state. |
| EX-MODEL-246 | Pregame viewer with an initialized galaxy origin, no ship; elapsed observation 60000 ms, execution 140 ms, time 08:00 | Only GameElapsed { value: 60000 }, SessionExecution { value: 140 } and TimeOfDayValue { value: 08:00 }. Do not manufacture commission rows. |
| EX-MODEL-247 | New commission recorded executionAtStart 500 ms; later execution observations 550 then 552 ms; TIME | CommissionExecution is 50 ms; SessionExecution is 552 ms. Admission replaces the commission baseline but does not reset total session accounting. |
| EX-MODEL-248 | TIME BOGUS with otherwise valid clock origins | Produce the ordinary TIME report; ignore the trailing argument. Do not reset a deadline, clock baseline or stardate. |
| EX-MODEL-249 | No commissioned ships; nonprivileged pregame viewer; USERS | No captain rows; emit FactionSeparator. No admission or other state change. |
| EX-MODEL-250 | Excalibur and Wolf commissioned; nonprivileged viewer uses SHORT output; USERS | Excalibur row, faction separator, Wolf row. Include all six ordinary metadata fields in both rows; omit positions and descriptive header. |
| EX-MODEL-251 | Privileged viewer aboard Excalibur at (37,37), output BOTH; USERS includes the viewer | Excalibur's ReportedPosition contains absolute (37,37) and relative (0,0). Do not suppress its zero relative displacement. |
| EX-MODEL-252 | Privileged viewer at (37,37), output RELATIVE; Wolf at (42,35) | Wolf's ReportedPosition has absolute none and relative (5,-2). No sensor-range or radio-status filter applies. |
| EX-MODEL-253 | Privileged pregame viewer with ABSOLUTE output; Wolf commissioned at (42,35) | Report Wolf's absolute position without needing a viewer ship position. Do not invent a relative origin. |
| EX-MODEL-254 | Commissioned viewer, stardate 4; committed ENEMY_DAMAGE 12 and pending PLANET_CAPTURE 100; bare POINTS | Select only ShipScore { ship: viewer's ship }. the CategoryRow for ENEMY_DAMAGE contains 12, TotalRow contains 12, PerTurnRow has ratio 12/4. No commission rows; pending score remains 100 and is not reported. |
| EX-MODEL-255 | Commissioned viewer; POINTS EMPIRE ME FEDERATION EMPIRE; all selected counts positive | Columns are ship, Federation, Empire, once each. Category and accounting cells follow that order. CommissionRow and PerCommissionRow have absent ship cells, not zeros. |
| EX-MODEL-256 | Pregame viewer; POINTS ME FEDERATION | Reject InvalidScoreSelector before any report rows; ME requires a ship. Do not continue to the valid Federation selector. |
| EX-MODEL-257 | Commissioned viewer; POINTS 7 FEDERATION | Reject InvalidScoreSelector: the explicit selection stops at 7 with no selected columns. Do not apply the bare-command self default. |
| EX-MODEL-258 | POINTS FEDERATION 7 BOGUS; Federation counts positive | Select only TeamScore { team: FEDERATION }. Stop at 7 and ignore BOGUS. |
| EX-MODEL-259 | POINTS FEDERATION BOGUS | Reject InvalidScoreSelector before reporting, even though Federation was already selected. |
| EX-MODEL-260 | Romulan activity disabled; POINTS ROMULANS | Removing the disabled Romulan column leaves none; reject InvalidScoreSelector. Do not substitute a team column. |
| EX-MODEL-261 | Pregame viewer; Romulan disabled; both teams have zero scores, positive commission and turn counts; bare POINTS | Select Federation and Empire. No CategoryRow. TotalRow is (0,0), followed by CommissionRow, PerCommissionRow and PerTurnRow; both ratio rows evaluate to zero. |
| EX-MODEL-262 | Federation has only STAR_DESTRUCTION score -50, two commissions and four turns; POINTS FEDERATION | The star-destruction CategoryRow and TotalRow each contain -50. PerCommissionRow is -50/2 and PerTurnRow is -50/4. Preserve negative and fractional results. |
| EX-MODEL-263 | Federation has 120 committed points, three cumulative faction acceptances, one current ship and six turns; POINTS FEDERATION | CommissionRow contains 3, PerCommissionRow evaluates to 40 and PerTurnRow to 20. Current roster occupancy does not replace the historical commission count. |
| EX-MODEL-264 | Romulan enabled but absent; its activity has 90 points, three appearances and six turns; POINTS ROMULANS | Report the persistent Romulan score, three commissions, 30 points per commission and 15 points per turn. Do not require a present Romulan or reset its activity. |
| EX-MODEL-265 | Yorktown sends TELL E;Hi; Excalibur is commissioned with a working radio on | E first matches Excalibur in ship-name order. Publish to Excalibur, not to the Empire group. |
| EX-MODEL-266 | Eligible Wolf; TELL 12 WOLF;Hi | Emit UnknownRecipient for 12, then publish to Wolf. A numeric recipient token does not terminate selection. |
| EX-MODEL-267 | Wolf is uncommissioned and undamaged; the only commissioned Empire ship is Buzzard with working radio on; TELL EMPIRE;Hi | Publish only to Buzzard. Group selection omits Wolf without an availability diagnostic. Explicit TELL WOLF instead emits RecipientUnavailable and then NoRecipients. |
| EX-MODEL-268 | Selected Wolf is uncommissioned and has 300 radio damage units | Emit RecipientRadioUnavailable for Wolf. Radio damage takes precedence over commission status; no recipient is retained. |
| EX-MODEL-269 | Working sender radio initially off; repeated acquired line TELL ROMULAN | Enable the radio, skip ROMULAN, then reject NoRecipients. Do not emit the repeated-input rejection or produce an autonomous reply. |
| EX-MODEL-270 | Working sender radio off; sender gags Wolf; repeated acquired line TELL WOLF;Hi | Enable sender radio, then reject RepeatedTell before lookup and ungagging. Wolf remains gagged; no message is published. |
| EX-MODEL-271 | Eligible Wolf; newly entered TELL WOLF; at Msg: use first-character ESC to reuse that preceding line | The message body is TELL WOLF. The repeated-input check applies to recipient selection, not to this subsequently acquired raw body. Publish it without repeating recipient selection. |
| EX-MODEL-272 | Bare TELL, then recipient continuation WOLF;Mixed Case! with eligible Wolf | Use the continuation's line for the inline body. Publish Mixed Case! exactly, without issuing Msg: or using the earlier bare TELL line as the body. |
| EX-MODEL-273 | Publication A obtains capacity; B obtains capacity and publishes; A then publishes | Published order is B then A. A common recipient receives B first; obtaining capacity earlier does not establish publication order. |
| EX-MODEL-274 | Full radio service; PublishMessage with an empty recipient set | Return NotPublished without capacity loss or adding a publication in progress. |
| EX-MODEL-275 | Published A addresses Farragut and Wolf; published B addresses only Farragut; both unread; DiscardUnread(Farragut) | Remove Farragut from both remaining audiences and remove B from service.messages. A remains for Wolf with its original audience still containing both ships. No display or radio/gag change. |
| EX-MODEL-276 | Publication to Wolf has obtained capacity but is not yet published; DiscardUnread(Wolf) | That publication remains in progress. DiscardUnread affects published unread messages; it does not unsubscribe Wolf from later publication. |
| EX-MODEL-277 | Displayable system message with body Notice; ReceiveMessage for its recipient | Emit MessageObservation with heading absent and body Notice. Consume that recipient's unread status; do not manufacture a player sender or recipient heading. |
| EX-MODEL-278 | Output LONG, output coordinates RELATIVE; SET O SHORT | O selects OUTPUT before OCDEF. Assign SHORT to outputLength; leave outputCoordinates RELATIVE. |
| EX-MODEL-279 | SET PROMPT 12, then 34, then BOGUS at successive value prompts | Numeric values prompt again. The alphanumeric BOGUS ends the command with promptStyle unchanged and no unknown-choice diagnostic. |
| EX-MODEL-280 | CRT profile selected; SET TTYTYPE 12, then empty reply | Cancel before testing any alphanumeric profile candidate. Keep CRT selected. |
| EX-MODEL-281 | CRT profile selected; SET TTYTYPE ACT, then BOGUS, then empty reply | ACT provisionally selects ACT-IV and reports ambiguity; BOGUS then clears the selection. Final cancellation leaves terminalProfile none. |
| EX-MODEL-282 | SET NAME followed by two spaces and ab/scan | After the first delimiter, retain the extra leading space. displayName becomes one space followed by AB/SCAN. Consume the line remainder; do not invoke SCAN. |
| EX-MODEL-283 | Existing captain name KIRK; SET NAME followed by thirteen spaces and X, then empty name reply | Skip the first delimiter and consider only the next twelve name characters, all spaces. X does not establish a name. Prompt once; leave KIRK unchanged after the empty reply. |
| EX-MODEL-284 | Unprivileged viewer; SET ROMOPT, then OUTPUT SHORT at the setting prompt | ROMOPT is not dispatched. Assign SHORT output after the continuation; leave world.romulanEnabled unchanged. |
| EX-MODEL-285 | Privileged viewer; Romulan disabled and absent; SET ROMOPT OFF | Enable romulanEnabled; do not create a Romulan. Ignore OFF rather than treating it as a disabling value. |
| EX-MODEL-286 | Privileged viewer; SET BHREMV while another commissioned ship occupies a temporary HELP black-hole sector | Clear that sector as well as ordinary black holes. Preserve the ship's commission and position, blackHolesSelected, resources and scores. The activity's later restoration rule still applies. |
| EX-MODEL-287 | Privileged commissioned viewer; planets and both factions' bases remain; SET ENDFLG | Set world.ended true and invoke the viewer's world-end processing despite the ordinary end condition being false. Other sessions observe termination at their own checks. No ordinary turn is completed. |
| EX-MODEL-288 | Active viewer; LIST AND SHIPS | The empty first group uses LIST defaults; the second selects ships. Combine deferred selections by identity rather than rejecting the initial empty group or duplicating ship details. |
| EX-MODEL-289 | Available Excalibur; LIST EXCALIBUR AND | Emit Excalibur's immediate detail, then reject EmptyGroup at the trailing separator. The earlier detail remains visible. |
| EX-MODEL-290 | LIST SHIPS AND BOGUS | Reject IllegalSelector for BOGUS and abandon all deferred ship output from the first group. |
| EX-MODEL-291 | Available Excalibur; LIST EXCALIBUR EXCALIBUR | Select Excalibur once and emit one immediate detail. Repetition of a ship identity does not consult unrelated state or produce an invented duplicate-name error. |
| EX-MODEL-292 | Present Romulan; LIST PLANETS ROMULAN | The final named Romulan selection uses the named path. Emit its immediate observation; no deferred planet report. |
| EX-MODEL-293 | LIST ROMULAN PLANETS | Reject SelectorConflict at PLANETS. Unlike the reverse order, the kind selector cannot follow a named object. |
| EX-MODEL-294 | Friendly ship at (37,38), viewer at (37,37); LIST 37 38 ROMULAN | Exact position takes precedence. Emit the ship detail at that position, not a query for the named Romulan. |
| EX-MODEL-295 | Privileged viewer at (37,37), enemy ship at (52,37); TARGETS 52 37 | Emit SensorRangeExceeded for the position: the exact-position path still has TARGETS' ten-sector limit. |
| EX-MODEL-296 | Same privileged viewer and distant Wolf; TARGETS WOLF 1 | Emit Wolf's named detail with visible position and shields. Named reporting does not suppress the row on the supplied distance-limit failure. |
| EX-MODEL-297 | Same named query with a nonprivileged viewer | Emit Wolf's identity with OutOfRange telemetry. Do not reveal its coordinates or shields, and do not replace the named query with an empty filtered result. |
| EX-MODEL-298 | Pregame SUMMARY with no acting ship; two commissioned Federation ships, one surviving Empire base and one neutral planet; no Romulan | Count those four entities in their respective summary classes, with whole-galaxy scope. No sensor origin, relative position or discovery update is required. |
| EX-MODEL-299 | Commissioned nearby Wolf has a position whose sector is temporarily a HELP black hole; LIST SHIPS | Wolf passes the nonempty-sector presence test and can have ordinary ship detail. Do not require the sector marker to equal ShipEntity { ship: Wolf }. |
| EX-MODEL-300 | Previously known enemy base fifteen sectors away; nonprivileged LIST BASES ALL | BaseTelemetry contains its current position and absent strength. Retain the base identity in knowledge; absence of strength is not zero strength. |
| EX-MODEL-301 | Galaxy has no planets; PLANETS | Emit NoMatches with WHOLE_GALAXY scope and false knownQualifier, because there were no attempted planet candidates. No empty summary row or discovery update. |
| EX-MODEL-302 | All opposing objects are within ten sectors; no Romulan; TARGETS SUMMARY ALL | The target count covers the selected opposing objects, but TargetSummary scope is SENSOR_RANGE because no remote unprivileged target-label evidence was collected. |
| EX-MODEL-303 | Present nearby Romulan; LIST SHIPS AND SHIPS SUMMARY | Emit one deferred Romulan detail and a Romulan summary count of two. Both admitted ordinary groups contribute, including the first DETAIL-only group. |
| EX-MODEL-304 | One unknown enemy base fifteen sectors away, no other bases; SUMMARY BASES ENEMY 20 AND BASES ENEMY ALL | First emit the no-known-matches observation. The later whole-galaxy summary counts the base once with WHOLE_GALAXY scope and knownQualifier true from the earlier attempted evaluation. Do not retroactively exclude the counted base. |
| EX-MODEL-305 | Privileged captain; bare *PASSWORD | Set privileged false and return PrivilegeSet { enabled: false }, without a prompt or success/failure text. |
| EX-MODEL-306 | Unprivileged captain; *PASSWORD *minkextra ignored | The first argument retains *MINK after lexical transformation and five-character retention. Enable privilege; ignore both its unretained suffix and the later argument. |
| EX-MODEL-307 | Unprivileged pregame captain; *DEBUG | Return Rejected { reason: UnknownCommand }, emit the unknown-command text and help hint, and disclose no timing observations. No ship is created. |
| EX-MODEL-308 | Privileged captain; timing query returns no records; *DEBUG | Emit the Name, Calls, Total and High header with no rows; return Reported. Leave privilege and all game state unchanged. |
| EX-MODEL-309 | Privileged captain; first registered timing A has zero completed calls; B has two, total duration 30 ms and maximum 20 ms | *DEBUG includes A then B in registration order. Preserve the observations for a later report; do not discard A merely because its call count is zero. Time-unit rendering follows the environment binding. |
| EX-MODEL-310 | Nonprivileged viewer at (37,37); unknown enemy base at (52,37); BASES 52 37 | The default whole-galaxy COUNT mode admits the exact-position query. Emit base detail with position and absent strength; do not discover the base. |
| EX-MODEL-311 | Same viewer; enemy Wolf at (52,37); BASES 52 37 | Identify Wolf with OutOfRange telemetry through COUNT admission. Do not emit NoObjectAt merely because the object is a ship, or disclose its position/shields as telemetry. |
| EX-MODEL-312 | Same unknown remote base; LIST 52 37 | Emit SensorRangeExceeded. LIST's default detail-only mode cannot use the BASES count-admission exception. |
| EX-MODEL-313 | Same viewer; star at (52,37); BASES 52 37 | Emit SensorRangeExceeded. The count-admission exception does not extend to remote stars, black holes or empty sectors. |
| EX-MODEL-314 | No entry name; delivered name characters `eric` followed by ESC | Accept entryName `ERIC`; ESC terminates this name and does not recall a command. |
| EX-MODEL-315 | No entry name; NUL, `a`, carriage return, `b`, Ctrl-G | Accept entryName `AB`; ignore NUL and carriage return; Ctrl-G terminates rather than redisplaying. |
| EX-MODEL-316 | Entry-name reply contains six spaces followed by `ERIC`, then line feed | Retry the name prompt; a nonspace only after position six does not satisfy validation. |
| EX-MODEL-317 | Entry-name reply contains five spaces followed by `E`, then line feed | Accept those five spaces followed by `E`; leading spaces are retained. |
| EX-MODEL-318 | Entry-name reply `abcdefghijklmnop` followed by line feed | Accept `ABCDEFGHIJKL`; consume input through its terminator without giving the suffix effects on unrelated state. |
| EX-MODEL-319 | Entry-name reply `a{~` followed by line feed | Accept `A;>` under entry-name conversion, distinct from command token conversion. |
| EX-MODEL-320 | Initial name prompt pending; Ctrl-C delivered | End startup without accepting a name or beginning admission. |
| EX-MODEL-321 | entryName `ERIC`; acquire identity for admission | Reuse `ERIC` without a name prompt. |
| EX-MODEL-322 | entryName `ERIC`, active displayName `ERIC`; SET NAME CAPTAIN | Active displayName becomes `CAPTAIN`; entryName remains `ERIC`. |
| EX-MODEL-323 | Previous example's commission ends; a new commission is admitted in the same execution | The new commission's displayName begins as `ERIC`. |
| EX-MODEL-324 | Pregame, not privileged; *ZAP extra | Return Ignored, without announcement, feedback, archive access or world changes. |
| EX-MODEL-325 | Privileged pregame; working statistics serial 17, nonzero values; REGULAR serial 11, FREE_ACCOUNT serial 22; *ZAP; recording and both writes succeed | Attempt context-only feedback, zero working values, and replace both archives with zero values and serial 17. Preserve live galaxy scores and counts; return Finished { shots: none }. |
| EX-MODEL-326 | Same working statistics; REGULAR cannot be opened | Clear working values, preserve serial, report open failure, do not access FREE_ACCOUNT, then emit Finished! and return Finished { shots: REGULAR }. |
| EX-MODEL-327 | Same working statistics; REGULAR replacement succeeds, FREE_ACCOUNT cannot be opened | Retain the REGULAR replacement, report open failure, emit Finished! and return Finished { shots: FREE_ACCOUNT }; no rollback. |
| EX-MODEL-328 | Privileged pregame; administrative feedback recording fails and returns; both statistics replacements succeed | Continue clearing and replacing statistics despite the recording failure; return Finished { shots: none }. |
| EX-MODEL-329 | Privileged pregame; *ZAP unwanted arguments; normal completion | Same statistics operation as bare *ZAP; trailing tokens do not select or limit a category. |
| EX-MODEL-330 | Active commission, privileged; *ZAP | Unknown main-game command; do not invoke ZapStatistics or touch administrative archives. |
| EX-MODEL-331 | Adjacent friendly installation; WARP_ENGINES damage 100, PHASERS damage 200; DOCK ALL; no intervening events | Dock successfully; automatic repair removes all device damage. Docking's ordinary supplies, hull repair and deadline still apply. |
| EX-MODEL-332 | Same installation and damage; DOCK | STANDARD automatic repair leaves WARP_ENGINES damage 70 and PHASERS damage 170. |
| EX-MODEL-333 | Same installation and damage; DOCK STATUS ALL | Perform the requested STATUS parsing/report, then STANDARD automatic repair; ALL is not the first command argument. |
| EX-MODEL-334 | No adjacent friendly installation; device damage 200; DOCK ALL | Reject docking; no automatic repair and no turn. |
| EX-MODEL-335 | Ship at (37,37), destination (38,37) empty, warp damage 100 and phaser damage 200; MOVE A 38 37; valid normal movement with no intervening events | Interpret A as ABSOLUTE for movement; at successful turn completion it also selects ALL_DEVICES, leaving all device damage zero. |
| EX-MODEL-336 | Same movement state; MOVE ABSOLUTE 38 37 | Make the same movement with STANDARD automatic repair; warp damage becomes 70 and phaser damage 170. |
| EX-MODEL-337 | Relative input default; bare MOVE obtains coordinate continuation `1 0`; same origin and damage | Move to (38,37); the continuation's second token is 0, so STANDARD automatic repair applies. |
| EX-MODEL-338 | One commissioned actor plus one reserved admission, playerCount 2, actionCount 0; a normal completed turn | actionCount becomes 1; do not activate installation defenses merely because only one roster ship is commissioned. |
| EX-MODEL-339 | Shared PhaserHit, undamaged PlayerAttack against an opposing ship with raised 20% shields, energy 2000, hull zero; strength 500, distance 1, b=0.5, c=0, critical device SHIELDS and adjustment draw 0.5 | WeaponHit has damage 720, DeviceCritical { device: SHIELDS, damage: 720 }, ShipDefense { mode: DOWN, strength: 9.17% }, no displacement or destruction. Target energy 1280, hull 720; attacker gains 720 pending ENEMY_DAMAGE, with no firing charge or turn in this shared operation. |
| EX-MODEL-340 | Shared PhaserHit against an opposing 50% base; undamaged attacker, strength 200, distance 1, b=0.5, c=0; critical choice 5, critical reduction draw 0.5, destruction choice 1 | Initial strength reduction leaves 39.17%; early critical path leaves 29.17%. Hit reports damage 360 and BaseCritical, but credits no ordinary BASE_DAMAGE. Base survives. |
| EX-MODEL-341 | Same base and phaser inputs, but critical choice 1 | Apply ordinary base damage: strength 35.57%, no BaseCritical; credit 360 pending BASE_DAMAGE. No critical reduction or destruction choice is required. |
| EX-MODEL-342 | Same early critical hit as `EX-MODEL-340`, but destruction choice 10 | Hit defense is BaseDefense { strength: 29.17% } and destruction DIRECT_DAMAGE. Stored base strength is zero and its sector is empty; credit 1000 pending BASE_DAMAGE, not 1360. |
| EX-MODEL-343 | The base destroyed in `EX-MODEL-342` has a docked teammate adjacent, no other adjacent friendly installation and one friendly planet elsewhere | Pre-removal docking re-evaluation can still find this positive-strength base, so the teammate remains docked through this destruction check. |
| EX-MODEL-344 | Shared PhaserHit against a 10% opposing base; undamaged attacker, strength 500, distance 1, b=0, c=0; critical reduction draw 0.5, destruction choice 1 | Damage 1620; initial strength 4.57%, ordinary damage floors it to zero, then critical reduction produces reported strength -10%. Stored strength becomes zero; credit 2620 pending BASE_DAMAGE including destruction. |
| EX-MODEL-345 | ResolveBaseHit for an opposing base at 30%, H=170, b=0.9; critical choice 5, reduction draw 0, destruction choice 1 | Equality meets the critical threshold. Return creditedDamage 0, critical true, reportedStrength 25%, destroyed false. |
| EX-MODEL-346 | ResolveBaseHit for the same base, H=169.99, b=0.9 | No critical choice is needed. Return creditedDamage 169.99, critical false, reportedStrength 28.3001%, destroyed false; eligible ordinary credit is applied once. |
| EX-MODEL-347 | TorpedoHit on a ship whose energy is zero, with a recorded position and nonfatal hull | Return TargetAlreadyFatal before random draws; preserve resources, presence and scores. No new WeaponHit is supplied. |
| EX-MODEL-348 | TorpedoHit on a base whose strength is zero | Return TargetAlreadyFatal without draws, displacement, score or another base-count decrement. |
| EX-MODEL-349 | PhaserHit against a still-commissioned opposing ship at energy zero, hull zero, shields down; undamaged attacker, strength 50, distance 1, b=0, c=0 | The torpedo guard does not apply. Deal 360 damage, leaving energy -360 and hull 360; remove ship presence and commission flag. Return DIRECT_DAMAGE destruction and credit 360 damage plus 500 kill points pending. |
| EX-MODEL-350 | Shared TorpedoHit against a docked opposing ship at (37,37), green, full raised shields, energy 1000, hull zero and an existing tractor beam; a=0.9, b=0.2, c=0, step (1,0), black hole at (38,37) | Deflected hit has damage zero, ShipDefense { mode: UP, strength: 99% }, Swallowed { position: Position { vertical: 38, horizontal: 37 } } and BLACK_HOLE destruction. Energy stays 1000, hull becomes 2500, condition red, docking and beam remain; attacker gains 500 pending kill points. The caller releases the beam after notification. |
| EX-MODEL-351 | Shared TorpedoHit with the same impact draws and ship state, but a star occupies (38,37) | Deflected hit has Stayed and no destruction; hull and energy unchanged, shields 99%, red, still docked. No kill credit. |
| EX-MODEL-352 | Romulan energy 150; RomulanPhaserHit strength 100, distance 1, IntegerDraw(100)=100 | Return PHASER damage 200, remainingEnergy -50 and destroyed true; remove the Romulan and its sector presence. This shared operation does not award score; a player caller awards 700 ROMULAN points once. |
| EX-MODEL-353 | Romulan energy 150; RomulanTorpedoHit with IntegerDraw(4000)=1000 | Return TORPEDO damage 100, remainingEnergy 50, destroyed false. No displacement, player-resource change, score or deadline update occurs in this shared operation. |
| EX-MODEL-354 | AddAttackCredit with InstallationAttack of an owned planet, ENEMY_DAMAGE and 100 points | Return CallerAccounts without adding player or Romulan score. The installation caller awards any faction credit. |
| EX-MODEL-355 | AddAttackCredit with RomulanAttack, BASE_DAMAGE and 100 points | Add 100 directly to RomulanActivity.score[BASE_DAMAGE]; player pending and committed scores remain unchanged. |
| EX-MODEL-356 | Displace a base from (37,37) with step (1,0), destination empty | Return Moved { position: Position { vertical: 38, horizontal: 37 } }; update base position and sector presence, preserving base identity and strength. No ship-only docking or condition fields are created. |
| EX-MODEL-357 | Displace a docked green ship from (37,37) into the black hole at (38,37), before any weapon effects | Return Swallowed { position: Position { vertical: 38, horizontal: 37 } }; hull becomes 2500, commission flag false and former sector empty. Recorded position, energy, shield/device state, docking and green condition remain unchanged; the black hole remains present. |
| EX-MODEL-358 | CompleteTurn with STANDARD automatic repair; LIFE_SUPPORT damage 310, reserve zero, undocked, hull 100, NORMAL prompt | Repair lowers damage to 280 before the life-support test. Reserve and hull stay unchanged; no life-support warning. Normal turn accounting completes. |
| EX-MODEL-359 | CompleteTurn without repair; LIFE_SUPPORT damage 300, reserve 1, undocked, hull 100, NORMAL prompt | Reserve becomes zero, hull stays 100, and LifeSupportWarning { reserve: 0 } is emitted. Zero reserves are not fatal. |
| EX-MODEL-360 | Same state but reserve zero | Reserve becomes -1 and hull is assigned 2500; emit LifeSupportWarning { reserve: -1 }. The turn itself does not clear commission membership or release the session. |
| EX-MODEL-361 | CompleteTurn without repair; docked, LIFE_SUPPORT damage 300, reserve -1, hull 2700, NORMAL prompt | No reserve decrement; hull is assigned exactly 2500, even though this reduces the prior value. Emit LifeSupportWarning { reserve: -1 }. |
| EX-MODEL-362 | Undocked, LIFE_SUPPORT damage 300, reserve zero, INFORMATIVE prompt; CompleteTurn without repair | Reserve becomes -1 and hull 2500, but no life-support warning is emitted. |
| EX-MODEL-363 | Undocked, LIFE_SUPPORT damage 299, reserve -1, hull 100; CompleteTurn without repair | Reserve remains -1 and hull 100; skip the negative-reserve test and life-support warning. |
| EX-MODEL-364 | CommitPendingScore: actor's ENEMY_DAMAGE and BASE_DAMAGE are 100 and 200; faction totals 500 and 1000; actor's pending values -20 and 50 | Ship values become 80 and 250; faction values 480 and 1050; both pending values become zero. Other ships, Romulan score, stardates and commission counts are unchanged. |
| EX-MODEL-365 | Repeat CommitPendingScore after the previous commitment with all pending values zero | No additional score change. |
| EX-MODEL-366 | Two participants, one on each faction; Federation actor, actionCount 1; Romulan disabled; Empire base at 90%, installations outside attack ranges; CompleteTurn without repair | Reset actionCount to zero, run the installation phases, replenish the opposing base to 92.5%, then advance the actor and Federation turn counts once. |
| EX-MODEL-367 | Same participant threshold, Federation actor energy 100, hull zero, shields down, devices undamaged and 10 pending ENEMY_DAMAGE; one full Empire base one sector away, phaser b=0,c=0; no other attacks, Romulan disabled | Base defense deals 720, killing the actor and crediting Empire's damage/kill totals. Completion still advances the actor and Federation turn counts once and commits the actor's pending 10 points. |
| EX-MODEL-368 | A turn reaches Romulan activation, which returns GalaxyEnded after its session-end effects | Return SessionEnded; do not execute the subsequent stardate, life-support or pending-score commitment steps. Already performed repair, action-count and defense effects are not rolled back by turn completion. |
| EX-MODEL-369 | ReevaluateDocking for a faction with baseCounts zero and capturedPlanetCounts zero; a docked ship has no nearby installation | Leave docking and condition unchanged. The zero captured-planet branch does not undock the ship. |
| EX-MODEL-370 | Same ship and no nearby installation, but capturedPlanetCounts is one and the owned planet is distant | The planet search fails; set the ship undocked and red without resource or score changes. |
| EX-MODEL-371 | A faction's last owned planet is being removed; capturedPlanetCounts has already become zero, but its old planet record remains during docking re-evaluation; a docked ship is distant from it | Use the maintained zero count and leave the ship's docking unchanged, rather than recounting the not-yet-removed record and running the failing planet search. |
| EX-MODEL-372 | Final-planet base conversion in progress; planet removal is complete, baseCounts is one for each faction, and the new base's chosen entry is not yet activated; CheckWorldEnd with ended false | Return Continues. The conversion's base-count increment already participates in the test; do not substitute a fresh positive-strength count. |
| EX-MODEL-373 | NovaImpact on a green docked ship with shields up at 100%, shield-device damage 250, other devices zero, hull zero and energy 1000; shield-device draw 0.5, other device draws zero, IntegerDraw(1000)=100, energy draw 0.5; displacement blocked | Severity remains 25. Shield-device damage becomes 300 and lowers shields before the strength-reduction step. Hull becomes 210, energy 895, shield strength stays 100%; no shield-reduction draw. The ship stays green and docked. |
| EX-MODEL-374 | Same state and draws, but shield-device damage initially 249 and IntegerDraw(100)=100 | Shield-device damage becomes 299. Shields stay up and strength becomes 80%; hull 210 and energy 895. |
| EX-MODEL-375 | A player-initiated nova hits a friendly ship with shields down, energy 100, hull zero and no beam; device draws zero, IntegerDraw(1000)=100, energy draw 0.5 | H is 810; energy becomes -305 and hull 810. Remove ship presence and clear its commission flag. Initiator pending ENEMY_DAMAGE decreases by 810; faction committed ENEMY_KILLS decreases by 500. Initiator pending and personal committed kill score are unchanged. |
| EX-MODEL-376 | The same nova kills an opposing ship instead | Initiator pending ENEMY_DAMAGE increases by 810 and faction committed ENEMY_KILLS by 500; no pending or personal kill-score bonus. No displacement attempt follows the direct kill. |
| EX-MODEL-377 | Green docked ship at (37,37), shields up at 100%, undamaged devices, hull zero, energy 1000; opposing player initiates NovaImpact from (36,37), step (1,0); device and energy draws zero, IntegerDraw(1000)=100, IntegerDraw(100)=100; black hole at (38,37) | H is 210; shields become 80%. Displacement returns Swallowed { position: Position { vertical: 38, horizontal: 37 } }, hull becomes 2500 and commission flag false. NovaHit.position remains (37,37); energy, docking and green condition remain. Initiator receives 210 pending damage points and faction receives 500 committed kill points. |
| EX-MODEL-378 | The preceding ship has a tractor beam before the nova | Publish the hit before releasing the beam association on both endpoints. Beam release does not add another destruction bonus. |
| EX-MODEL-379 | NovaImpact on an opposing base at 100%, displacement blocked; IntegerDraw(1000)=100 and IntegerDraw(100)=100 | Credit 210 pending BASE_DAMAGE, publish faction distress, reduce strength to 80%, and publish NovaHit with damage 210 and BaseAfterNova { strength: 80% }. Distress does not alter the impact's damage value. |
| EX-MODEL-380 | Same base impact but no eligible distress recipients | The same 210 damage credit and 80% resulting strength apply. The hit's damage remains 210 even when the distress audience is empty. |
| EX-MODEL-381 | NovaImpact on a friendly base at 10%, IntegerDraw(1000)=100 and IntegerDraw(100)=100; its faction has one base and zero owned planets | H is 730 and strength becomes zero. Initiator loses 1730 pending BASE_DAMAGE points. Decrement baseCounts to zero before docking re-evaluation; with zero captured planets that operation preserves existing docking. Publish hit, clear base presence and publish faction destruction. No world-end check is added by base damage alone. |
| EX-MODEL-382 | Opposing base at (37,37) with strength 50%; nova from (36,37), black hole at (38,37); IntegerDraw(1000)=100 and IntegerDraw(100)=100 | Credit H=410, reduce strength to 30%, then Swallowed sets strength zero. Add 1000 pending BASE_DAMAGE. Hit retains position (37,37) and displacement destination (38,37); report generic base destruction. Retain the black hole and the base identity. |
| EX-MODEL-383 | Compare nova hits on bases at 80% and 80.1%, with IntegerDraw(1000)=100 and IntegerDraw(100)=100; displacement blocked | H is respectively 170 and 210, while remaining strength is 60% and 60.1%. Exactly severity 20 is retained; a lesser severity becomes 25. |
| EX-MODEL-384 | PlayerNova hits Romulan with energy 201; displacement survives | Halve energy to 100.5, add 10.05 pending ROMULAN points, and publish zero numerical hit damage with RomulanAfterNova { energy: 100.5 }. No destruction bonus. |
| EX-MODEL-385 | PlayerNova displaces Romulan with energy 201 into a black hole | Use saved energy 201: add 20.1 pending ROMULAN points, publish the destruction hit, then add 500. Total gain is 520.1. NovaHit uses the last occupied position and keeps the black-hole destination in its displacement result. |
| EX-MODEL-386 | RomulanNova displaces that same Romulan into a black hole | Subtract 20.1 from persistent RomulanActivity ROMULAN score before the hit publication, then subtract 500. Removing the Romulan does not remove its activity score or stop the chain. |
| EX-MODEL-387 | NovaImpact on a present zero-energy Romulan; displacement blocked | Energy stays zero, score change is zero and destruction remains absent. No additional energy-based removal is introduced by this nova branch. |
| EX-MODEL-388 | NovaImpact on a neutral planet with three builds; update available | Builds become zero; publish PlanetAfterNova { builds: 0 } with absent damage and destruction. Keep the planet and release the update; no score penalty or world-end check. |
| EX-MODEL-389 | NovaImpact on a planet with two builds; update available and another planet remains | Builds become -1; publish its destruction hit displaying zero builds, then apply the 100-point destruction penalty, clear the sector and remove the identity. Return Completed { result: hit } after releasing access. |
| EX-MODEL-390 | A planet update is refused during a chain | Return PlanetUpdateRefused without changing that planet or score and without its hit observation. Continue to the next recorded affected position. |
| EX-MODEL-391 | ExplodeStar at (37,37); its only damageable neighbors are planets at (36,36) and (38,38), each with six builds; both updates available | Resolve and publish the (38,38) planet hit before the (36,36) hit. Both end with three builds. The chain does not repeat the initial star's caller-owned announcement or 50-point charge. |
| EX-MODEL-392 | Initial star at (37,37); its only neighboring stars are (36,36) and (38,38); each selection draw is one; all nearby sectors otherwise empty | Remove both neighboring stars while scanning. Announce and resolve (38,38) before (36,36), charging 50 points for each. Initial-star cost remains caller-owned; chain adds a total 100-point penalty. |
| EX-MODEL-393 | A neighboring star's selection draw is five | Keep that star present and do not add it to pending explosions or charge its destruction points. |
| EX-MODEL-394 | An explosion has 29 stars pending when another neighboring star is encountered; its selection would otherwise succeed | Leave the additional star intact. The limit does not discard a previously pending explosion or end the chain. After a pending star is taken, capacity may become available again. |
| EX-MODEL-395 | Initial star (37,37), another star (38,37), player ship (38,38); second star selected; the ship survives with its displacement destination (39,39) empty | First impact moves the ship to (39,39). The later explosion at (38,37) is two sectors away, so that explosion does not hit it. Discovery uses current sectors for each explosion. |
| EX-MODEL-396 | Initial star (37,37), selected star (38,37), ship (38,38); ship survives the first impact but a black hole-free occupied destination (39,39) blocks displacement | The ship stays at (38,38), receives the first hit, then is discovered and hit again by the explosion at (38,37). No once-per-chain target exemption applies. |
| EX-MODEL-397 | A selected star's already-cleared center becomes occupied before its pending explosion is processed | The occupant participates in that explosion's neighborhood. Its displacement step is (0,0), so Displace returns Stayed; the ordinary target-specific nova damage still applies. |
| EX-MODEL-398 | Nova planet destruction removes the last planet while one faction's maintained base count is zero; update available | Publish the planet hit and apply its destruction penalty before RemovePlanet reaches CheckWorldEnd. Perform world-termination effects and return GalaxyEnded through NovaImpact and ExplodeStar, without the remaining chain effects. |
| EX-MODEL-399 | The preceding termination occurs with other stars already selected and removed but still pending | Their cleared sectors are not restored. Do not announce or apply the later pending-star charges and explosions after GalaxyEnded. |
| EX-MODEL-400 | RemovePlanet with an absent identity and either neutral or faction ownership | Return NoPlanet without decrementing counts, changing docking, or invoking CheckWorldEnd. |
| EX-MODEL-401 | RemovePlanet on the middle of three neutral planets, both factions having discovered it, with the galaxy continuing | Remove that identity from the planet collection and both knownPlanets sets; preserve the other two planets' identities, relative order and discovery. Do not change installation counts or perform docking re-evaluation. |
| EX-MODEL-402 | RemovePlanet on an owned planet, called during conversion with a base-count increment already applied | Decrement the supplied former owner's captured-planet count, re-evaluate docking, remove planet identity, then check world end using the already-incremented base count. The caller supplies later sector replacement and base activation. |
| EX-MODEL-403 | ResolveLocations with no arguments and Exactly { count: 2 } | Empty, not WrongItemCount. The calling command decides whether to prompt. |
| EX-MODEL-404 | ReadLocations acquires a genuinely zero-token reply | Cancelled; do not treat it as a mode-only reply or reuse a prior coordinate result. |
| EX-MODEL-405 | ReadLocations with Exactly { count: 2 } acquires ABSOLUTE only | Empty. The nonempty input has zero coordinate items; ordinary initial MOVE/BUILD/CAPTURE acquisition prompts again. |
| EX-MODEL-406 | Actor at (37,37), relative default; ResolveLocations arguments 2 -3 with Exactly { count: 2 } | Resolved with absent scalar and position (39,34). |
| EX-MODEL-407 | Same actor and limit; arguments ABSOLUTE 2 3 | Position (2,3), independent of the relative default. |
| EX-MODEL-408 | Actor at (37,37), absolute default; arguments RELATIVE 2 -3 | Position (39,34). |
| EX-MODEL-409 | Actor at (37,37), BOTH input preference; arguments 2 -3 | Use the relative path and return position (39,34). |
| EX-MODEL-410 | Relative default, actor (37,37); arguments 200 2 -3, AtMost { count: 3 } | Scalar 200 and position (39,34). Do not offset or galaxy-range-check the scalar. |
| EX-MODEL-411 | ResolveLocations arguments -999, AtMost { count: 3 } | Scalar -999 with no positions. Its consuming command decides legality; the reader imposes no positive-strength or burst-count rule. |
| EX-MODEL-412 | Relative default, actor (37,37); arguments 1 2 3 4, AtMost { count: 7 } | No scalar; positions (38,39) and (40,41). The reader does not reinterpret the first integer as a torpedo count. |
| EX-MODEL-413 | Arguments ABSOLUTE 77 1.0, Exactly { count: 2 } | NonIntegerCoordinate precedes the vertical-bound failure, although 1.0 has a whole mathematical value. |
| EX-MODEL-414 | Arguments ABSOLUTE 77 BAD 3, Exactly { count: 2 } | WrongItemCount precedes type and coordinate-bound errors. |
| EX-MODEL-415 | Four numeric items with AtMost { count: 3 } | TooManyItems before coordinate interpretation. |
| EX-MODEL-416 | Arguments ABSOLUTE 0 76, Exactly { count: 2 } | VerticalOutsideGalaxy; the vertical component is checked before the invalid horizontal component. |
| EX-MODEL-417 | Arguments ABSOLUTE 1 76, Exactly { count: 2 } | HorizontalOutsideGalaxy. |
| EX-MODEL-418 | Two coordinate arguments, one NULL category produced by a comma, Exactly { count: 2 } | NonIntegerCoordinate. Null tokens count toward arity but are not zero-valued integer coordinates. |
| EX-MODEL-419 | Arguments A 2 3, relative default, Exactly { count: 2 } | A matches ABSOLUTE first; resolve (2,3). Keyword ambiguity in other command contexts does not alter this ordered mode match. |
| EX-MODEL-420 | COMPUTED only, computer damage 300, unprivileged captain with advertisedSpeed 9600 | ComputerUnavailable before speed delay or empty-result handling. |
| EX-MODEL-421 | COMPUTED only, computer damage 299, unprivileged captain with advertisedSpeed 301, Exactly { count: 2 } | Wait 602 milliseconds, then return Empty. No energy, turn or readiness change from resolution. |
| EX-MODEL-422 | Same mode-only input and damage, advertisedSpeed 300 | Empty without the computed-speed pause. The threshold is strictly above 300. |
| EX-MODEL-423 | Privileged captain, advertisedSpeed 9600, computer functional; COMPUTED only | Empty without the computed-speed pause. Privilege does not bypass the computer-damage check. |
| EX-MODEL-424 | COMPUTED 200, computer functional, AtMost { count: 3 } | Resolved with scalar 200 and no positions. PHASERS then diagnoses a lone scalar; resolution itself does not invent a target. |
| EX-MODEL-425 | COMPUTED 200, Exactly { count: 2 }, computer functional | WrongItemCount for one resolved item. |
| EX-MODEL-426 | COMPUTED BOGUS 1.0, AtMost { count: 4 }, computer functional | NonNameTarget for the last candidate precedes UnknownTarget for BOGUS because target validation runs right to left. |
| EX-MODEL-427 | COMPUTED BOGUS WOLF, AtMost { count: 4 }, Wolf absent and computer functional | TargetAbsent for Wolf precedes UnknownTarget for BOGUS. |
| EX-MODEL-428 | COMPUTED BOGUS WOLF, AtMost { count: 3 }, computer functional | TooManyItems for four candidate-derived items before either name or target-presence check. |
| EX-MODEL-429 | COMPUTED F W, Exactly { count: 4 }; commissioned Farragut at (20,21), Wolf at (30,31), both sectors nonempty, computer functional | Validate Wolf first, but return positions (20,21), then (30,31). F and W use roster-first name matching. |
| EX-MODEL-430 | COMPUTED F, Exactly { count: 2 }, with relative input preference and actor far from commissioned Farragut at (20,21) | Return absolute position (20,21), without adding the actor's location or imposing a weapon range in the reader. |
| EX-MODEL-431 | COMPUTED F, Exactly { count: 2 }; Farragut commissioned at (20,21), its sector appears as a black hole during HELP, computer functional | Resolve (20,21). The computed-name check requires a nonempty sector, not PlayerShip { id: Farragut } identity at that sector. |
| EX-MODEL-432 | Same named ship and position but the sector is empty | TargetAbsent. |
| EX-MODEL-433 | COMPUTED ROMULAN, Exactly { count: 2 }, computer functional and Romulan absent | TargetAbsent, not UnknownTarget. |
| EX-MODEL-434 | COMPUTED with one invalid name, Exactly { count: 2 }, functional computer, unprivileged captain, advertisedSpeed 1200 | The 2400-millisecond delay precedes UnknownTarget. Rejection does not remove the already incurred delay. |
| EX-MODEL-435 | Replay supplies IndexValue { value: 0 } for IntegerRequest { count: 5 } | Invalid replay input. IntegerDraw(5) has results 1 through 5; do not reinterpret zero as the first alternative. |
| EX-MODEL-436 | Replay supplies UnitValue { value: 1 } for UnitRequest | Invalid replay input; the unit interval excludes one. UnitValue { value: 0 } is within its domain. |
| EX-MODEL-437 | Replay supplies IndexValue { value: 10 } for ChoiceRequest { count: 9 } used by Choice(Device) | Invalid replay input; no tenth device is created. |
| EX-MODEL-438 | A weapon rule has already drawn b=0.25 and uses b in two expressions | Both expressions use 0.25. No second draw is made for the second use. |
| EX-MODEL-439 | Galaxy creation receives starDraw=0 and holeDraw=0 | Select 100 stars and potential count 10 holes, in that draw order. Declining holes later does not undo the potential-count choice. |
| EX-MODEL-440 | Galaxy creation receives starDraw=50/51 and holeDraw=40/41 | Select 350 stars and potential count 50 holes. These interval boundaries belong to the upper outcomes. |
| EX-MODEL-441 | Torpedo path-limit unit draw is respectively 1/8, 5/8 or 7/8 | Maximum path lengths are respectively 8, 9 and 10. Reaching those boundaries does not select the preceding interval. |
| EX-MODEL-442 | RomulanTorpedoHit integer draw is respectively 1999, 2000 or 4000 | Hit damage is respectively 199.9, 200 or 200. Upper outcomes accumulate at 200 rather than being redistributed over smaller values. |
| EX-MODEL-443 | Four defined Romulan candidate-group winners have equal distance; all three tie draws are 2 | Retain the Federation ship. Its probability is 1/8 under independent fair tie draws. |
| EX-MODEL-444 | Same four-way tie; the final tie draw is 1 | Select the Empire base regardless of the first two tie draws. Its probability is 1/2, not 1/4. |
| EX-MODEL-445 | Same random binding, creation options and ordered inputs; tournament keys supplied as ALPHABET and ALPHANUM | Both retain ALPHA and select the same initialization and initial galaxy. Extra characters beyond the retained key do not distinguish them. |
| EX-MODEL-446 | Tournament keys supplied as 00001 and 1 | They are distinct retained text keys, not the same parsed numeric seed. The binding need not guarantee distinct resulting galaxies. |
| EX-MODEL-447 | Separate tournament-key prompt receives a blank reply | Accept the empty key and use ordinary initialization; do not promise a repeatable empty-key galaxy or add a rejection prompt. |
| EX-MODEL-448 | Placement first draws (10,20), which is occupied, then (11,21), which is eligible | Reject the first pair and use the second. Four coordinate draws were used; do not keep the first vertical coordinate while retrying only horizontal. |
| EX-MODEL-449 | A player misfire check is reached | Misfire probability is 1/25. Tube damage probability is 1/5 conditional on misfire, giving 1/125 for both events on that check; this is not a guarantee of one such event in each 125 shots. |
| EX-MODEL-450 | A player turn invokes Romulan activity, which fires and triggers a nova | The nested weapon and nova random events inherit the triggering captain's context. Romulan scoring does not switch the random-event owner to a new player. |
| EX-MODEL-451 | MOVE passes its propulsion check and draws potential overheating damage, then receives cancelled coordinates | That declared early draw remains in the replay sequence despite no movement or applied overheating damage. Cancellation does not restore it. |
| EX-MODEL-452 | Two games have the same tournament key but different later captain inputs, random initializations or clock observations | The key alone does not require the later games to match. Full replay must also supply the other semantic inputs and event order. |
| EX-MODEL-453 | Excalibur already has forty published notices; PublishNotice for Excalibur with an empty recipient set | NotPublished. Preserve all forty existing notices; no capacity loss, warning or score change. |
| EX-MODEL-454 | Excalibur has no notices; publish observation A to Farragut and Wolf | Create one notice at priority 1 with both original and remaining audiences equal to the two recipients. Capacity use is one, not two. |
| EX-MODEL-455 | Excalibur has notices at priorities 2 and 4; publish observation B to Wolf | Assign priority 1, the lowest unused priority. Do not compact or change the two older priorities. |
| EX-MODEL-456 | Excalibur notice A at priority 2 and later notice B at priority 1 both address Wolf | nextNotice(Wolf) selects B. Delivery compares priority, not the notices' publication times. |
| EX-MODEL-457 | An older Wolf-published notice and a newer Excalibur-published notice both address Farragut | Deliver the Excalibur notice first because its publisher precedes Wolf in roster order. |
| EX-MODEL-458 | Excalibur has forty notices; the oldest is priority 40, while priority 1 was reused most recently; publish another | Remove priority 40's old notice for all of its remaining recipients and publish the new identity at priority 40. Do not evict priority 1 merely because it is delivered first. |
| EX-MODEL-459 | Excalibur is at its forty-notice capacity; every other publisher has no notices | The next Excalibur publication still replaces its oldest notice. It cannot borrow another publisher's unused capacity. |
| EX-MODEL-460 | Capacity replacement removes a notice unread by Farragut and Wolf; both have other unread notices | Only the replaced notice is lost for those recipients. Their other backlogs remain; no radio-style whole-backlog eviction or loss warning occurs. |
| EX-MODEL-461 | One notice has original and remaining recipients Farragut and Wolf; Farragut receives it | Remove only Farragut from remainingRecipients and present the observation once. Original recipients remain both ships, and Wolf can still receive the unchanged observation. |
| EX-MODEL-462 | Wolf subsequently receives the last remaining membership of that notice | Remove the notice from the service and free its publisher priority for reuse. |
| EX-MODEL-463 | Wolf has an addressed nova-hit notice, then turns radio off, receives critical radio damage and gags its player origin before reception | Receive and display the already addressed combat notice. None of those reception-time properties suppresses it. |
| EX-MODEL-464 | A published nova observation records target shields 80% at (20,21); the target later moves and loses more shields before reception | Present the published 80% and (20,21). Do not query the target's new state to replace the observation values. |
| EX-MODEL-465 | A notice records target position (20,21); receiver now at (19,19) with relative output selected | Preserve the recorded absolute target position, but present relative displacement (+1,+2) from the receiver's current position. |
| EX-MODEL-466 | Excalibur departs after publishing a notice still unread by Wolf; Excalibur is not a remaining recipient | DiscardNotices(Excalibur) leaves that notice available to Wolf. Departure does not erase publications by the departing ship. |
| EX-MODEL-467 | A notice's remaining recipients are Excalibur and Wolf; Excalibur's commission releases | Discard removes Excalibur only. Wolf's unread membership and the observation remain. |
| EX-MODEL-468 | ReceiveNotice for a captain-associated ship with no unread combat notice | NoNotice with no presentation, damage, score change or additional blank report. |
| EX-MODEL-469 | A just-destroyed ship retains its captain association and has an addressed hit notice | It can receive that notice before commission release. Reception neither revives the ship nor reapplies the fatal damage. |
| EX-MODEL-470 | Ordinary command acquisition begins with unread combat notices, unread radio text and a remaining post-command delay | Drain combat notices first, then radio messages, before the post-command delay and next prompt. This draining itself advances no stardate. |
| EX-MODEL-471 | A Romulan action invoked during Farragut's turn publishes a combat notice | Farragut is the publisher for capacity and delivery ordering; the observation still identifies the Romulan as attacker. |
| EX-MODEL-472 | A notice carries a damage observation whose score was credited at impact; receiver displays it twice through separate replay runs | Each run's reception changes unread state only. Display does not award another hit, kill or point adjustment. |
| EX-MODEL-473 | A base distress notice was addressed while Wolf's radio was on; Wolf turns it off before reception | Consume the notice and return Suppressed without its body. A later radio-on change does not make it unread again. |
| EX-MODEL-474 | A base destruction notice reaches a receiver whose radio is on and radio-device damage is exactly 300 | Display it. The reception damage test is strictly greater than 300. |
| EX-MODEL-475 | Same base destruction notice, radio on but radio-device damage 300.1 | Consume and suppress its body. Other recipients' memberships remain unaffected. |
| EX-MODEL-476 | Base distress receiver's radio is on, damage below 300, and the attacking player is gagged | Display the base report; combat notices do not apply sender gagging. |
| EX-MODEL-477 | LONG output requests its leading conditional blank line for a base report, then finds the receiver's radio off | The body is suppressed and consumed, but the leading blank-line request has already occurred. Suppressed does not imply zero characters from the surrounding presentation sequence. |
| EX-MODEL-478 | A valid shot's deflected path reaches the galaxy boundary without obstruction and stops at (75,40) | MISSED records the burst's shot ordinal and (75,40), not an outside coordinate; only the shooter is addressed. |
| EX-MODEL-479 | The second shot encounters a black hole at (12,13) before its aim | ABSORBED records shot 2 and (12,13); it carries no damage to the black hole. |
| EX-MODEL-480 | A shot encounters a friendly planet | NEUTRALIZED identifies the shot and obstruction position, with no hit damage; it is not WeaponHit.deflected. |
| EX-MODEL-481 | A misfired first shot subsequently encounters a black hole | Preserve the separate misfire diagnostic and shot-1 ABSORBED observation. Misfire does not imply that the shot disappeared. |
| EX-MODEL-482 | A nova chain selects a second star at (20,21), after an initial explosion at (19,20) | The second EXPLODED observation identifies (20,21); reception does not invoke ExplodeStar again. |
| EX-MODEL-483 | A torpedo leaves a star unaffected | UNAFFECTED identifies the star and position, without a firing-ship identity, damage amount or shields. |
| EX-MODEL-484 | A base is destroyed; a base with the same BaseId is later created elsewhere before notice delivery | The old DESTROYED observation retains its recorded location; do not substitute the new base's position or destroy the new base. |
| EX-MODEL-485 | The Romulan appears at (30,31), then moves before its appearance notice is read | RomulanDetected retains (30,31) and discloses no energy reading. |
| EX-MODEL-486 | Valid TransferEnergy requests 100 units; recipient has capacity for all of it | The recipient's observation records 90 units; the sender is charged 100. Neither remaining energy is disclosed. |
| EX-MODEL-487 | Valid TransferEnergy requests 100 units; recipient already has 5000 | A successful zero-amount EnergyReceived observation still addresses the recipient. |
| EX-MODEL-488 | A tractor association is created and released before one endpoint drains its notices | The activation value remains ACTIVATED and release remains BROKEN; reception applies neither state transition again and invents no endpoint names or release cause in the body. |
| EX-MODEL-489 | CAPTURE takes a three-build Empire planet for Federation | The defensive origin records Empire ownership and three builds, even though the planet now belongs to Federation with zero builds. |
| EX-MODEL-490 | WeaponHit records a base's pre-cleanup strength as -4; cleanup leaves stored strength zero | Impact BaseImpactState retains -4; destruction suppresses its displayed strength suffix. Do not re-query zero. |
| EX-MODEL-491 | A player torpedo swallows a ship formerly at (20,20) into a black hole at (21,20) | The weapon impact reports position (21,20), displacement Swallowed { position: Position { vertical: 21, horizontal: 20 } }, and BLACK_HOLE destruction. |
| EX-MODEL-492 | A player torpedo swallows the Romulan from (20,20) into (21,20) | The impact's Romulan position remains (20,20), with Swallowed { position: Position { vertical: 21, horizontal: 20 } } and BLACK_HOLE; preserve the caller's distinct position rule. |
| EX-MODEL-493 | A nova swallows a ship from (20,20) into (21,20) | Nova-derived ImpactObject position is (20,20), following NovaHit.position; do not replace it with the destination used in `EX-MODEL-491`. |
| EX-MODEL-494 | An enemy planet takes a phaser hit and its remaining builds reach zero | PlanetImpactState has zero builds, absent damage, absent destruction, and kind PHASER. Zero builds is not a destruction event on this path. |
| EX-MODEL-495 | A surviving ship takes DeviceCritical { device: WARP_ENGINES, damage: 90 }; its captain and a nearby observer receive the hit | Only the target captain's presentation includes that device and 90 added device damage; neither receives another damage application. |
| EX-MODEL-496 | The same critical hit also destroys the target | The destruction presentation omits the shield/strength and device-detail suffixes, while the immutable result retains those values. |
| EX-MODEL-497 | A Romulan torpedo and a player torpedo each produce a deflected zero-damage WeaponHit; output LONG | The player report uses deflection wording. The Romulan report uses ordinary zero-damage torpedo wording; both retain the same deflection effect. |
| EX-MODEL-498 | Player-started nova produces a hit near a different captain | The observation origin is the exploding star; the initiating player remains relevant to scoring and the publisher remains relevant to delivery order. These are distinct roles. |
| EX-MODEL-499 | INFORMATIVE prompt; life-support damage 300, reserve 2; shields UP at 10%; hull damage 2000; energy 1000 | The prompt string is `"2LSDE> "`, including its final space and no implicit newline. Equality triggers every warning. |
| EX-MODEL-500 | INFORMATIVE prompt; life-support damage 299.9; shields UP at 10.1%; hull damage 1999.9; energy 1000.1 | The prompt string is `"> "`, regardless of a separately recorded RED condition. |
| EX-MODEL-501 | NORMAL prompt with all four warning conditions present | The prompt is still `"Command: "`; warning prefixes belong only to INFORMATIVE. |
| EX-MODEL-502 | Relative coordinate output, Free fields, reported position equal to the viewer's position | FormatLocation gives the empty string. It does not give `"0,0"` or change the coordinate preference. |
| EX-MODEL-503 | BOTH/MEDIUM, Free fields, viewer and reported position (20,20) | FormatLocation gives `"@20-20"`, with no trailing space or zero-relative suffix. |
| EX-MODEL-504 | BOTH/MEDIUM, Free fields, viewer (20,20), observation at (21,20) | FormatLocation gives `"@21-20 +1,0"`; the horizontal zero has no plus sign. |
| EX-MODEL-505 | MEDIUM output displays damage 12.39, then another operation uses that damage quantity | The field displays `"12.3"`; the underlying quantity remains 12.39. Display precision does not alter later damage arithmetic. |
| EX-MODEL-506 | Ordinary MEDIUM numeric field for -0.59 in the generalized presentation | Display `"-0.5"`; preserve its sign without restoring a machine-quotient sign-loss artifact. |
| EX-MODEL-507 | ALWAYS_ZERO_NEGATIVE, Free width, value zero with one fractional digit | Display `"-0.0"`; no negative-zero game quantity is introduced. |
| EX-MODEL-508 | FormatNumber(-12, 0, NEGATIVE_ONLY, Exactly { count: 2 }) | Display `"-*"`; preserve the minus sign within the two-character integer field. |
| EX-MODEL-509 | FormatNumber(123.49, 1, NEGATIVE_ONLY, Exactly { count: 2 }) | Display `"**.4"`; the fractional suffix is outside the overflowing two-character integer field. |
| EX-MODEL-510 | A combat observation contains Romulan energy 300; MEDIUM output | Its strength-style numeric suffix is `"+30.0%"`; the value still means 300 energy units and does not create Romulan shields. |
| EX-MODEL-511 | SHORT condition text for a docked green ship; MEDIUM text for the same observation | Use `"D+G"` and `"Docked+Green"`, with no extra separator or trailing space. |
| EX-MODEL-512 | Output is already at the left margin after an empty completed line; a conditional blank-line request is followed by one unconditional line ending | The conditional request adds nothing; the unconditional request still emits one `"\r\n"` pair. |
| EX-MODEL-513 | MEDIUM/ABSOLUTE; TorpedoObservation shot 2, MISSED at (12,13), body starts at a line boundary | Body is `"T2 miss @12-13\r\n"`; a shot ordinal is printed without a decimal fraction. |
| EX-MODEL-514 | MEDIUM/ABSOLUTE; RomulanDetected at (12,13) | Body is `"??  @12-13\r\n"`; retain the two spaces after the Romulan label. |
| EX-MODEL-515 | MEDIUM; Excalibur sends 90 received energy units to Farragut | Body is `"E 90.0 > F \r\n"`, including the recipient label's trailing space before the ending. |
| EX-MODEL-516 | LONG presentation of the same energy observation | Body is `"Excalibur  transfers 90.0 units of energy to the  Farragut \r\n"`. Keep both doubled spaces and the trailing space. |
| EX-MODEL-517 | LONG/ABSOLUTE; StarObservation UNAFFECTED at (12,13) | Body is `"Star @12-13  UNAFFECTED by Photon Torpedo!\r\n"`; retain both spaces before UNAFFECTED. |
| EX-MODEL-518 | SHORT/ABSOLUTE; Excalibur at (10,10), UP 100%; phaser damage 50 to surviving Wolf at (12,12), DOWN 80%; no critical | Body is `"E 10-10 +100  50P  W 12-12 -80\r\n"`. The damage and target separators are both two spaces. |
| EX-MODEL-519 | MEDIUM/ABSOLUTE presentation of the same impact | Body is `"E @10-10, +100.0%  50.0 unit P  W @12-12, -80.0%\r\n"`; target coordinates are formatted SHORT with their separate preceding `@`. |
| EX-MODEL-520 | LONG impact on a ship; current column after the damage phrase is 41 | Make the conditional blank-line request before its target label. At column 40, that request is not made. |
| EX-MODEL-521 | LONG impact on a planet; current column after the damage phrase is 41 | Do not apply the ship/base target-break rule to the planet. |
| EX-MODEL-522 | SHORT tractor activation, then a separate LONG tractor-activation body | The bodies are `"Trac. Beam on\r\n"` and `"\r\nTractor beam activated, Captain.\r\n"`; LONG reception's earlier conditional separator is separate. |
| EX-MODEL-523 | LONG nova destroys a base by black-hole displacement | Include the base emergency and generic destruction text; omit the separate black-hole destruction line, while retaining the BLACK_HOLE effect in the observation. |
| EX-MODEL-524 | MEDIUM radio message from Excalibur, original recipients Farragut and Wolf, body Hello | Display `"\r\nMessage from E to  F W\r\nHello\r\n\r\n"`, including the doubled space after `to` and final blank line. |
| EX-MODEL-525 | Farragut has already read the message in `EX-MODEL-524`; Wolf now receives it | Wolf's heading still contains `" F W"`, because it shows the original audience. |
| EX-MODEL-526 | SYSTEM radio sender, body Hello | Display `"Hello\r\n\r\n"`, with no heading or leading radio separator. |
| EX-MODEL-527 | A gagged player message is consumed under LONG output | Suppressed produces no heading, body or blank-line request; do not apply the separate combat-reception separator. |
| EX-MODEL-528 | SHORT full STATUS; stardate 12, undocked GREEN, position (20,30), ten torpedoes, energy 4000, hull damage zero, shields UP at 100%, radio ON | After its initial separator, body is `"SD12 G 20-30 T10 E4000 D0 SH+100 ROn \r\n"`. |
| EX-MODEL-529 | SHORT STATUS ENERGY with energy 125.9 | Body is `"E125 \r\n"`; the game still has 125.9 energy units. |
| EX-MODEL-530 | MEDIUM STATUS SHIELDS, DOWN at 40% | Body is `"Shlds   -40.0% 1000.0 units\r\n"`; the reserve is positive despite the lowered-shield sign. |
| EX-MODEL-531 | LONG STATUS LOCATION, preference RELATIVE, position (20,30) | Body is `"Location\t20-30\r\n"`; keep the tab and forced absolute location without @. |
| EX-MODEL-532 | MEDIUM STATUS RADIO, device damage exactly 300, radio enabled | Body is `"Radio  damaged\r\n"`; radio.enabled remains true. |
| EX-MODEL-533 | SHORT STATUS ENERGY BOGUS ENERGY, energy 125.9 throughout | Body is `"E125 %Syntax error\r\nE125 \r\n"`; the invalid selector does not discard later observations. |
| EX-MODEL-534 | All device damage zero, positive hull damage, DAMAGES BOGUS | Emit `"All devices functional.\r\n"` after the initial separator; no heading or selector diagnostic. |
| EX-MODEL-535 | Warp-engine damage 8, selected DAMAGES WA, SHORT | Row is `"WA     8\r\n"`; no general-report heading. |
| EX-MODEL-536 | Same selected damage report, MEDIUM | Row is `"Warp        8.0\r\n"`; its numeric field begins at column 10 before left padding. |
| EX-MODEL-537 | Same selected damage report, LONG | Row is `"Warp Engines         8.0 units\r\n"`; its numeric field begins at column 19. |
| EX-MODEL-538 | General LONG damage report, title observes BlackHoleObject while actor retains its ship identity and position | Title is `"Damage Report for Black Hole\r\n\r\n"`; do not substitute the ship name. |
| EX-MODEL-539 | MEDIUM general damage report passes the positive-damage test; concurrent repair clears all damage before row reads | Emit `"Device    Damage\r\n\r\n"` with no rows; do not replace the already selected report by AllDevicesFunctional. |
| EX-MODEL-540 | Warp damage 8, shield damage zero, selected DAMAGES SH | Report a zero-valued shield row; the initial test checks all devices, not only selected devices. |
| EX-MODEL-541 | FormatDuration of 3661999 milliseconds | `"01:01:01"`; no rounding up of seconds or change to the observed duration. |
| EX-MODEL-542 | FormatDuration of 360000000 milliseconds | `"100:00:00"`; hours expand in ordinary decimal and do not wrap after 24 or 99. |
| EX-MODEL-543 | Pregame TIME with a valid world origin, game elapsed 1000 ms, session execution 2000 ms, time of day 03:04:05 | Body is `"\r\nGame's elapsed time:  00:00:01\r\nJob's total run time: 00:00:02\r\nCurrent time of day:  03:04:05\r\n"`; omit both commission rows. |
| EX-MODEL-544 | TYPE OUTPUT, terminal profile CRT | Final line is `"Terminal type:  CRT       \r\n"`; seven spaces pad the name to ten characters. |
| EX-MODEL-545 | TYPE OUTPUT at SHORT length, selected profile ADM-3A | Retain the full report heading and preference lines; the profile is `"ADM-3A    "`, with uppercase A and four padding spaces. |
| EX-MODEL-546 | TYPE OPTION after SET BHREMV, with blackHolesSelected still true | Emit `"There are Black holes in this game.\r\n"`; the option observation is not a count of remaining objects. |
| EX-MODEL-547 | TYPE O followed by a blank switch reply | Emit the ambiguity diagnostic and switch prompt, then cancel with no report body or preference changes. |
| EX-MODEL-548 | Bounds V=19..21 and H=19..21, LONG scan style, top row entirely empty | Top axis and first row are `"   19  21\r\n21  . . . 21\r\n"`. |
| EX-MODEL-549 | Same bounds and marks, SHORT scan style | Top axis and first row are `"   20\r\n21 ... 21\r\n"`; all three horizontal sectors remain present. |
| EX-MODEL-550 | One-sector SHORT scan at (75,75) containing Excalibur | Complete body is `"   76\r\n75 E 75\r\n   76\r\n"`; axis 76 does not create an out-of-galaxy sector. |
| EX-MODEL-551 | Scan interruption is observed after the first row in `EX-MODEL-548` | That exact prefix is the complete partial grid; omit both later rows and bottom axis, retaining discovery performed before display. |
| EX-MODEL-552 | Output length LONG, scan style SHORT, SRSCAN with explicit bounds | Use one-character scan marks; neither LONG output length nor SRSCAN overrides scanStyle. |
| EX-MODEL-553 | RejectedSyntax from SCAN CORNER with only one extent | Emit `"%Syntax error\r\n"` without the scan-grid separator or axes; no discovery occurs. |
| EX-MODEL-554 | MEDIUM absolute LIST detail for friendly Excalibur at (20,20), shields UP at 100% | Line is `" E  @20-20  +100.0%\r\n"`; preserve label padding and the signed shield field. |
| EX-MODEL-555 | MEDIUM absolute LIST detail for opposing Empire base at (50,50), strength absent | Line is `"*)( @50-50\r\n"`; no strength, percent suffix or out-of-range text is appended. |
| EX-MODEL-556 | MEDIUM LIST detail for opposing Wolf with OutOfRange telemetry | Line is `"*W  out of range\r\n"`; neither coordinates nor shields are disclosed. |
| EX-MODEL-557 | Same detail selected through TARGETS | Line is `" W  out of range\r\n"`; TARGETS suppresses the opposition marker. |
| EX-MODEL-558 | Planet detail observes Federation ownership; ownership changes before the stored observation is rendered | Use the observation's Federation planet label; do not relabel it using the later owner. |
| EX-MODEL-559 | MEDIUM absolute Romulan detail at (20,20), energy-derived telemetry 30% | Line is `"*?? @20-20    30.0%\r\n"`; no leading plus is added to this list reading. |
| EX-MODEL-560 | MEDIUM summary of two Empire bases, known qualifier true, whole-galaxy scope | Line is `"  2 known Empire bases in game\r\n"`. |
| EX-MODEL-561 | SHORT summary of one Federation ship, any scope | Line is `"  1 Federation ship\r\n"`; singular form, no range suffix. |
| EX-MODEL-562 | MEDIUM RomulanSummary count two from repeated qualifying groups, sensor-range scope | Line is `"  2 Romulans in range\r\n"`; preserve report multiplicity without creating another Romulan. |
| EX-MODEL-563 | Planet detail with zero builds | Omit both the build-count field and suffix; coordinates remain present. |
| EX-MODEL-564 | Relative input preference; MOVE ABSOLUTE with no coordinates; reply `1 0`; actor at (37,37) | Initial Empty prompts. Resolve the new line using the relative preference, obtaining (38,37); ABSOLUTE on the earlier line does not carry over. |
| EX-MODEL-565 | Operational warp engines; initial MOVE coordinate prompting; replies ABSOLUTE, RELATIVE, then a zero-token line | The two mode-only replies repeat the coordinates prompt. The zero-token line cancels. Retain one early potential-damage draw and the original deadline; no movement or turn completion. |
| EX-MODEL-566 | Operational tubes, available ammunition; bare TORPEDOS; burst reply ABSOLUTE | Empty repeats the complete burst prompt, including the number-in-burst prefix. No count is accepted and no target is selected. |
| EX-MODEL-567 | Same bare TORPEDOS; burst reply ABSOLUTE 2 3, both coordinates inside the galaxy | The resolved result has two items and no scalar. Repeat the burst prompt; do not treat its first coordinate as count at this prompt. |
| EX-MODEL-568 | Relative preference; TORPEDOS ABSOLUTE 1; target continuation `1 0`; actor at (37,37) | Count one is accepted without a target. The target line uses the relative preference and resolves (38,37). The earlier absolute keyword does not carry over. |
| EX-MODEL-569 | TORPEDOS count two accepted without targets; target continuation is a single integer 1 | A resolved odd item count repeats the coordinates prompt, without the burst prefix. No target has been selected and no firing effects occur. |
| EX-MODEL-570 | TORPEDOS count one accepted without targets; target continuation has zero tokens | Cancel before target validation, reload waiting, ammunition use or turn completion. Do not confuse this with a mode-only Empty result. |
| EX-MODEL-571 | USERS in SHORT output, one included captain row | Omit the header but retain ship, captain, speed, account, connection and session fields; SHORT does not reduce the row to names. |
| EX-MODEL-572 | UserAccountLabel supplies project `1`, member `2` | Account field before its surrounding separators is `"     1,2    "`: project left-padded to six, member plus trailing padding occupies five. |
| EX-MODEL-573 | UserAccountLabel supplies project `1234567`, member `123456` | Account field is `"1234567,123456"`; neither component is truncated and no member-padding space is inserted within the field. |
| EX-MODEL-574 | Privileged UserRow has only absolute position (3,4); LONG output | Append three spaces followed by `" 3- 4"`; no `@`. The ordinary six fields remain. |
| EX-MODEL-575 | Privileged UserRow has only relative displacement (0,0) | Append three spaces followed by `"  0,  0"`; retain the zero displacement. |
| EX-MODEL-576 | USERS has no commissioned ships in either faction; MEDIUM output | After the initial conditional blank-line request, emit the faction separator `"----\r\n"`; no captain row or LONG header. |
| EX-MODEL-577 | Captain A is in CAPTURE's WORLD_CHANGE phase; captain B attempts MOVE's coordinated relocation on a distant sector | B cannot successfully enter its WORLD_CHANGE phase while A retains that domain. Distance and different affected objects do not make the phases independent. B's earlier movement cost is not refunded by this rule. |
| EX-MODEL-578 | Privileged captain A is in statistics clearing's SHARED_SERVICE phase; captain B attempts radio capacity admission | The two phases share a domain. B cannot enter while A retains it; the rule supplies neither an admission deadline nor a FIFO grant promise. |
| EX-MODEL-579 | A releasing session holds WORLD_CHANGE, enters a radio search phase and completes that search | Its coordination ends in both domains while the outer commission cleanup may continue. Returning from search does not restore WORLD_CHANGE. Other sessions' coordination is unchanged. |
| EX-MODEL-580 | Captain A is in admission's faction/ship-choice dialogue after successful WORLD_CHANGE entry | Waiting for the reply does not by itself end A's coordinated phase. A prompt inside admission is not ordinary command acquisition. |
| EX-MODEL-581 | Captain A has selected an available ship; admission reaches its ordinary phase end, before clearing that ship's score or establishing the commission | Selection has not atomically reserved the ship. The draft does not declare A the winner of a subsequent racing claim or invent a destination/availability recheck. |
| EX-MODEL-582 | Captain A retains coordination; another captain B returns to ordinary command acquisition | B's remaining coordination ends. A's phase does not end merely because B reached that boundary. |
| EX-MODEL-583 | Main-command prompt checks; actor has hull damage 2500 and energy zero | Take the fatal-hull final-report/release path first; do not emit the separate out-of-energy report from the later check. |
| EX-MODEL-584 | Actor RED with energy 1000, nonfatal hull; world continues; main-command prompt checks | Set condition YELLOW before displaying the prompt. Do not repair hull, energy or shields. |
| EX-MODEL-585 | Interrupt pending when token acquisition returns; actor condition RED at that point | Emit the cannot-quit report, discard pending input and return to prompt checks. Do not request QUIT through this interrupt path. |
| EX-MODEL-586 | Interrupt pending when token acquisition returns; actor condition GREEN | Return QuitRequested. The ordinary QUIT confirmation rule still applies if connected. Do not fabricate a user-entered command line. |
| EX-MODEL-587 | Interrupt already pending at the earlier wait boundary; no pending notices and world does not end | Follow the notice/world-check cycle and revisit the wait boundary with the indication still pending. No eventual QUIT or cancellation guarantee follows. |
| EX-MODEL-588 | Both combat notices and radio messages are pending on entering main-command acquisition; prior delay positive; unprivileged captain | Deliver combat notices before radio messages, flush output, then handle the prior delay once. No wait itself completes a turn. |
| EX-MODEL-589 | WaitElapsed requested zero or a negative duration | Return immediately with no suspension request and no game turn, repair, random draw or coordination release. |
| EX-MODEL-590 | WaitElapsed requested 20000 ms; continuous clock; initial suspension returns at the established deadline | Request 10000 ms initially and return after the deadline check. Do not require an additional ten-second wait. |
| EX-MODEL-591 | WaitElapsed requested 2000 ms; initial clock zero; suspension returns early at 1500 ms, next return is at 2500 ms | Request 2000 ms, then 1000 ms, and finish after the second return. No fractional second request is substituted to force an exact deadline. |
| EX-MODEL-592 | Actor reaches a main-command prompt; another session has disappeared but its ship remains associated | The prompt boundary does not itself reclaim the other ship or certify that session as available. Other lifecycle operations retain their own contracts. |
| EX-MODEL-593 | Valid adjacent nonfriendly planet; CAPTURE passes its target checks but entry to WORLD_CHANGE fails | Return SurrenderRefused without retry, capture energy payment, fortification removal, discovery/count updates, defensive attack or normal turn completion. |
| EX-MODEL-594 | Adjacent friendly planet has four builds; initial base-capacity check passes; fifth BUILD cannot enter WORLD_CHANGE | Return ConstructionCrewBusy without retry. Retain five builds and 250 additional pending construction points. Do not convert the planet, charge energy, commit the points or complete a turn. |
| EX-MODEL-595 | Last planet is friendly with four builds; no pending construction points; an available base identity exists; own base count zero and opposing base count zero; fifth BUILD enters its phase and no other actor intervenes | At the removal's world-end check, own maintained base count is one, no planets remain, and 500 construction points are pending. Discovery has transferred to the chosen base identity, whose old position and nonpositive strength have not been replaced. End the galaxy without installing the new base or giving the construction report; final POINTS does not commit those pending points. |

EX-MODEL-06 deliberately uses fractional shield strength. Historical loss of
that fraction is excluded by the numerical normalization policy. The grammar,
transfer rate and energy charge are unchanged.

Exact terminal presentation, broader command cases, concurrency and complete
world evolution remain part of the unfinished conformance work.

**Basis:** [abstract model](language-model.md), [commands](commands.md),
[shared world rules](world-rules.md), [turns](turns.md),
[lexical rules](lexical.md), [normalization policy](NORMALIZATION.md).


## CompuServe amendment examples

These examples apply the CompuServe appendix. They do not amend Austin's
startup, ordinary command matching or radio controls.

| Scenario | Initial state and input | Required result |
| --- | --- | --- |
| EX-COMP-1 | CompuServe experience question; reply EXPERT followed by an unused token | Select SHORT scans, SHORT output, INFORMATIVE prompt and RELATIVE input. Retain BOTH output coordinates and no selected terminal profile. No resource, placement or turn effect. |
| EX-COMP-2 | CompuServe experience question; reply NOVICE | No choice matches. Keep initial preferences, request TYPE OUTPUT, TYPE OPTION and SUMMARY in order, then proceed to startup without repeating the experience question. |
| EX-COMP-3 | CompuServe experience question; reply 1.0 under generalized numeric-value semantics | The REAL token's mathematical value equals one. Select BEGINNER preferences; do not add a category guard absent from the value-based selection rule. This illustrates the documented numeric normalization. |
| EX-COMP-4 | CompuServe startup question; reply H | Request HONORROLL, then repeat startup. Ordered startup recognition tests HONORROLL before HELP. |
| EX-COMP-5 | CompuServe pregame command prompt; command H | Ambiguous between HELP and HONORROLL. Do not choose the first entry or request either report. |
| EX-COMP-6 | CompuServe pregame; DOCUMENT followed by unused arguments | Emit the documentation notice and return to pregame. No purchase, external document launch, resource change or turn occurs. Exact continued-literal joining remains open. |
| EX-COMP-7 | CompuServe ordinary command reader retains SC 10; Ctrl-G is delivered | Retain SC 10, continue input and leave echo mode unchanged. Do not request line redisplay for Ctrl-G. |
| EX-COMP-8 | CompuServe Romulan reaches the post-appearance speech test; IntegerDraw(10) returns 2 | Do not invoke speech at this test. Continue target selection; do not replace this with Austin's five-way draw. |
| EX-COMP-9 | CompuServe Romulan reaches the post-weapon speech test; IntegerDraw(50) returns 1 | Invoke speech, then the ordinary Romulan installation-defense phases if execution continues. No separate speech timer is introduced. |
| EX-COMP-10 | CompuServe ACTIVE play; command DO | Select the core DOCK command under the main-game table. DOCUMENT's pregame availability does not change main-game matching. |
| EX-COMP-11 | CompuServe USERS with commissioned ships on both factions | Visit Federation ships in roster order, then put the faction separator before Cobra's faction, followed by Empire ships in roster order. |
| EX-COMP-12 | Autonomous speech selects audience 2; all ten ships commissioned with enabled, operational radios | Candidates are all Federation ships and Cobra, Demon, Hawk and Jackal. Wolf is excluded. The body qualifier is `human `; faction ownership is unchanged. |
| EX-COMP-13 | Autonomous speech selects audience 3; Wolf is uncommissioned; other ships have available radios | Complete the opening, adjective and noun choices, but publish nothing. Emit no recipient-unavailable or empty-audience diagnostic. Do not substitute another Empire ship. |
| EX-COMP-14 | Autonomous speech selects audience 1; triggering captain's radio is disabled; that captain has an available recipient gagged | Exclude the triggering ship because its radio is disabled. Ungag the available recipient in the triggering captain's settings before publication. Do not enable the triggering radio. |
| EX-COMP-15 | Autonomous speech selects audience 3; Wolf is commissioned, radio operational and enabled; opening 1, adjective 1, noun 1 | Body is `Death to mindless klingon mutants!`; address Wolf. Preserve the plural body even though the audience contains one ship. |
| EX-COMP-16 | Operational actor; only ROMULAN recipient; no Romulan is present | Enable the actor's radio. Emit RomulanUnavailable, then NoRecipients. Make no reply-body or relocation choices and acquire no player body. |
| EX-COMP-17 | Present Romulan; direct reply opening 2, adjective 3, initial qualifier draw 2, fallback qualifier 5, noun 4; Federation actor | Body is `You will witness my vengence, ignorant human worm!`. Draw bounds are 4, 5, 3, 5, 5 in that order; no audience draw. Body construction changes no game property. |
| EX-COMP-18 | Direct reply initial qualifier draw 1; origin query returns a recognized qualifier | Use that qualifier and proceed directly to the noun draw. Do not make the fallback five-way qualifier draw. |
| EX-COMP-19 | Repeated TELL input; recipients ROMULAN then ALL; Romulan present; first reply submission returns and relocation choice is 2 | Attempt the Romulan reply and leave its position unchanged before rejecting ALL with RepeatedTell. No player-body acquisition; the rejection does not undo the earlier attempt. |
| EX-COMP-20 | Recipients ROMULAN ROMULAN; Romulan remains present; both submissions return and both relocation choices are 4 | Attempt two distinct replies; each has its own body choices. Return ReplyAttempted without a player-body prompt or NoRecipients. Repeated names are not deduplicated for the Romulan path. |
| EX-COMP-21 | Relocation reached; actor at vertical 20, horizontal 20; draws 1 then 1; candidate vertical 16, horizontal 16 occupied, vertical 17, horizontal 16 empty | Relocate to vertical 17, horizontal 16. Keep horizontal offset fixed while advancing vertical offset; do not choose an independently nearer sector. Energy and activity state are unchanged. |
| EX-COMP-22 | Relocation reached; actor at vertical 1, horizontal 1; draws 1 then 1; first in-galaxy candidate is occupied by actor; vertical 2, horizontal 1 empty | Skip out-of-galaxy candidates and the occupied actor sector. Relocate to vertical 2, horizontal 1; actor position unchanged. |
| EX-COMP-23 | Relocation reached; draw 3 | Return Stayed after one draw; no start-offset draw, board update, arrival report or turn completion. |
| EX-COMP-24 | Present-Romulan reply submission remains pending | Relocation and later recipient processing have not yet been reached. This example makes no claim that publication eventually returns or that Ctrl-C cancels it. |
| EX-COMP-25 | Valid standings list has A with 100 points and elapsed 10 seconds; different-account candidate B has 100 points and elapsed 20 seconds | FindStandingsPlacement returns InsertAt at position 1. Equal scores favor the longer elapsed value. |
| EX-COMP-26 | Standings list starts with account A at 100 points, then B at 50; candidate A has 75 points | Return EarlierAccountRecord: proposed position 2 has the same account above it. The query changes no record. |
| EX-COMP-27 | Standings list starts with A at 100 points and B at 50; candidate A has 150 points | Return InsertAt at position 1. Accepted insertion retains the older A below it; this step does not globally deduplicate accounts. |
| EX-COMP-28 | PAYING standings update; recorded elapsed time 999 ms; arbitrary positive score; markedMissing true | Return before standings access, insertion or destruction-count update. A high score does not bypass the elapsed threshold. |
| EX-COMP-29 | NON_PAYING explicit HONORROLL; first source opens and has four empty groups; no interrupt | Emit no heading for that source and attempt the PAYING source. |
| EX-COMP-30 | NON_PAYING explicit HONORROLL; first source cannot be opened | Return to caller without attempting the PAYING source or inventing a missing-source diagnostic. |
| EX-COMP-31 | CompuServe world termination; acting Federation ship; no planets and both base counts zero | Submit markedMissing true after final POINTS and before release, subject to the elapsed threshold and ordinary update rules. No additional score or physical destruction follows from the marker. |
| EX-COMP-32 | Confirmed CompuServe QUIT; no environment failure; commission elapsed at least 1000 milliseconds | Submit markedMissing false with the final POINTS total before release. The record remains subject to placement and storage outcomes. |
| EX-COMP-33 | CompuServe IMPULSE or MOVE returns and its immediate alive check fails; no environment failure | The common departure submits markedMissing false. Do not substitute the true marker used by fatal checks at main-command acquisition. |
| EX-COMP-34 | Intercepted fatal environment failure reaches the common CompuServe departure; qualifying commission elapsed | Submit markedMissing true. The fictional fatal report does not introduce a new gameplay hazard. |
| EX-COMP-35 | Qualifying missing-marked candidate; an earlier account record prevents insertion; reportedLosses[ship] is 2 | Retain all lists, increase the counter to 3, and require a write. The historical comparison reports 2 previous losses and the current mission count. |
| EX-COMP-36 | Qualifying unmarked candidate falls below a full primary list | Keep statistics unchanged and do not open a write destination. |
| EX-COMP-37 | NON_PAYING departure; initial PAYING read opening fails; qualifying candidate inserts | Do not attempt the NON_PAYING read. Prepare the insertion from empty statistics and attempt a NON_PAYING write; a read failure is not evidence that earlier stored records were absent. |
| EX-COMP-38 | InsertAt selected and placement announced; destination opening fails | Release statistics access and return without retry or a saved-record guarantee. Do not retract the placement announcement. |
