# Semantic examples and conformance

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
| EX-MODEL-209 | PHASERS 50 at an adjacent neutral planet; both bank deadlines 1000; now 2000; shields down, energy 1000, phaser damage zero; no overheat or build loss; reporting ends at 3000; pacing class one | Fired(FIRST); energy 950; FIRST deadline 6000, SECOND remains 1000. Complete one turn without automatic repair. |
| EX-MODEL-210 | PHASERS 49 at a valid adjacent planet; FIRST deadline 2000, SECOND 1000, now zero; devices available | Wait until 1000, then InvalidStrength. No shot, firing charge, deadline change or turn. |
| EX-MODEL-211 | Same deadlines and strength as EX-MODEL-210, but aim is an empty sector | InvalidTarget before waiting or strength validation. No firing changes or turn. |
| EX-MODEL-212 | Available phasers, commissioned friendly target eleven sectors away | FriendlyTarget precedes OutOfRange; do not wait for a bank or fire. |
| EX-MODEL-213 | Phaser damage exactly 300 units; enter PHASERS without arguments | PhasersUnavailable before a coordinates prompt; no shot or turn. |
| EX-MODEL-214 | PHASERS 300 at an adjacent neutral planet; shields UP, energy 1000, phaser damage 10; heat draws 64 and 20, planet draw 1; reporting ends at 4000; pacing class one | Add 120 damage, leaving phaser damage 130. Energy becomes 500; shields remain UP. Chosen bank deadline 8300; one turn, no automatic repair. |
| EX-MODEL-215 | PHASERS 50 at an adjacent neutral planet; shields UP, energy 100, devices undamaged; no overheat | Insufficient energy does not reject firing. Shield control and firing charges leave energy -150 before lifecycle handling; the shot is not rolled back. |
| EX-MODEL-216 | Torpedo-tube damage 300, inventory zero; enter TORPEDOS | TubesUnavailable precedes NoAmmunition and input acquisition. No turn. |
| EX-MODEL-217 | Docked, healthy tubes, inventory zero; TORPEDOS 1 with a valid target | NoAmmunition; docking does not bypass the entry inventory requirement. |
| EX-MODEL-218 | Healthy tubes, inventory two; request three torpedoes | Emit the inventory limitation and inventory report; InvalidBurstCount. No shot, reload-deadline change or turn. |
| EX-MODEL-219 | Healthy tubes, inventory two; request two shots, first aim own sector and second aim eleven sectors away; now 1000, previous reload deadline 9000; condition GREEN | Finished(0, OWN_SECTOR); reload deadline becomes 1000; inventory two and condition GREEN. Complete one turn without automatic repair; do not reach the second aim. |
| EX-MODEL-220 | Same state as EX-MODEL-219, with the two aims reversed | TargetOutOfRange; no shot or turn, reload deadline remains 9000. |
| EX-MODEL-221 | TORPEDOS 1 supplies a valid first aim and a second aim eleven sectors away; both are within galaxy bounds; healthy tubes, inventory two; clear trace and no misfire | Use only the first aim. Launch one shot, inventory becomes one and the burst completes normally. The unused second aim does not undergo the ten-sector burst check. |
| EX-MODEL-222 | Docked, healthy tubes, inventory two; request two shots; clear traces, no misfire; pacing class one, burst ends at 4000 | Finished(2, REQUEST_FULFILLED); inventory remains two, condition RED, reload deadline 8000; one turn, no automatic repair. Phaser deadlines unchanged. |
| EX-MODEL-223 | Undocked, healthy tubes, inventory three; request three shots; first misfire draws 97, 5 and 2500, clear trace; pacing class one, burst ends at 4000 | First shot travels; no later shot launches. Tube damage becomes 300, inventory two, reload deadline 9000. Finished(1, MISFIRE), one turn without repair. |
| EX-MODEL-224 | One launched torpedo hits an enemy planet; update refused; undocked, inventory initially two, healthy tubes, reload deadline initially 1000; condition initially GREEN | PlanetUpdateRefused(1), empty-tubes diagnostic; inventory one and condition RED. No planet change, new deadline, turn or pending-score commitment. |
| EX-MODEL-225 | A burst destroyed a ship on its first impact; second shot hits an enemy zero-build planet with an accepted update and build draw 1 | Planet remains at zero builds and is not destroyed. The earlier ship's destruction does not determine this impact's result. |
| EX-MODEL-226 | Actor at (37,37), enemy base at (37,42), black hole at (37,38), other displayed cells empty; SCAN 1 WARNING | Bounds 36..38 on both axes. Base becomes known although outside the rectangle. Cell (36,38) is WarningMark, (37,38) remains BlankSpace, and (36,37) remains EmptySpace. |
| EX-MODEL-227 | Actor at (37,37), neutral planet at (37,39), otherwise empty surrounding sectors; SCAN 1 WARNING | Discover the planet, but it creates no warning area. Displayed empty sectors remain EmptySpace. |
| EX-MODEL-228 | Actor at (37,37), unknown planet within ten sectors; SCAN CORNER 1 | RejectedSyntax with no discovery or scan result, no prompt and no turn. |
| EX-MODEL-229 | Actor at (37,37), unknown planet at (45,45); SCAN 1; interruption observed after first emitted row | Interrupted report has bounds 36..38 on both axes and only row 38. Planet knowledge is retained. Consume the scan interruption and omit bottom labels; no turn. |
| EX-MODEL-230 | Actor at (37,37), scanStyle SHORT; SCAN 0 | One cell and one row, containing ShipMark(actor). Both horizontal axes emit initial label 38, even though the only displayed horizontal coordinate is 37. Row labels remain 37. |
| EX-MODEL-231 | Actor at (37,37), terminal width 29, scanStyle LONG; SRSCAN | Default radius is five: bounds 32..42 on each axis, eleven rows and eleven cells per row. SRSCAN does not select SHORT presentation. |
| EX-MODEL-232 | Actor at (37,37); SCAN -2 3 | Clamp vertical extents to zero; horizontal extents are three. Report one row, vertical 37, with horizontal coordinates 34..40. |
| EX-MODEL-233 | Hull damage 12, warp damage 80, energy 900; STATUS DAMAGE BOGUS ENERGY | Emit HullDamageValue(12), InvalidStatusItem and EnergyValue(900), in that order. Warp damage is not included in the hull value. No state changes. |
| EX-MODEL-234 | STATUS 1 ENERGY | No status observations. The initial integer stops item processing; do not print the default report or the later energy item. |
| EX-MODEL-235 | Energy 900, hull damage 12; STATUS ENERGY ENERGY 1 DAMAGE | Emit EnergyValue(900) twice, then stop at the integer. No hull observation or stardate row. |
| EX-MODEL-236 | Shields DOWN at strength 40%; STATUS SHIELDS with MEDIUM output | ShieldValue(DOWN, 40%, 1000 energy units). Equivalent energy reports stored strength even while shields are lowered; no energy transfer occurs. |
| EX-MODEL-237 | Same shields, SHORT output | ShieldValue(DOWN, 40%, none); omit the equivalent-energy field. No preference or resource changes. |
| EX-MODEL-238 | Warp damage 8, all other devices zero; DAMAGES 1 TR | First argument is not a name token, so report all positively damaged devices: one WARP_ENGINES row at 8. The later TR token does not select a different report. |
| EX-MODEL-239 | Torpedo-tube damage 10, tractor-beam damage zero, all other devices zero; DAMAGES T T | Four rows: TORPEDO_TUBES 10, TRACTOR_BEAM 0, then those same two rows again. No deduplication. |
| EX-MODEL-240 | Warp damage 8, all others zero; DAMAGES BOGUS | Rows(empty). Skip the unmatched selector silently; do not fall back to the general report or emit AllDevicesFunctional. |
| EX-MODEL-241 | All devices zero, hull damage 100; DAMAGES WA | AllDevicesFunctional. Hull damage does not participate in the device-damage availability test. |
| EX-MODEL-242 | Selected CRT profile; preferences MEDIUM, NORMAL prompt, LONG scans, input BOTH and output RELATIVE; TYPE OUTPUT | Report those six values in that order, ending with CRT. Reporting input BOTH does not change the relative interpretation of unqualified numeric locations. |
| EX-MODEL-243 | TYPE O, followed by OP at the switch continuation | Emit the ambiguity diagnostic and prompt, then report version, Romulan option and black-hole option. No preference is changed. |
| EX-MODEL-244 | Galaxy selected black holes; SET BHREMV has removed all of them; TYPE OPTION | BlackHoleOptionValue(true). Report the selected option, not the remaining object count. |
| EX-MODEL-245 | Active viewer; game elapsed observation 60000 ms, commission elapsed 20000 ms, execution baseline 100 ms; successive execution observations 135 and 140 ms; local time 08:00 | Report GameElapsed(60000), CommissionElapsed(20000), CommissionExecution(35), SessionExecution(140), TimeOfDayValue(08:00), in order. Preserve baselines and game state. |
| EX-MODEL-246 | Pregame viewer with an initialized galaxy origin, no ship; elapsed observation 60000 ms, execution 140 ms, time 08:00 | Only GameElapsed(60000), SessionExecution(140) and TimeOfDayValue(08:00). Do not manufacture commission rows. |
| EX-MODEL-247 | New commission recorded executionAtStart 500 ms; later execution observations 550 then 552 ms; TIME | CommissionExecution is 50 ms; SessionExecution is 552 ms. Admission replaces the commission baseline but does not reset total session accounting. |
| EX-MODEL-248 | TIME BOGUS with otherwise valid clock origins | Produce the ordinary TIME report; ignore the trailing argument. Do not reset a deadline, clock baseline or stardate. |
| EX-MODEL-249 | No commissioned ships; nonprivileged pregame viewer; USERS | No captain rows; emit FactionSeparator. No admission or other state change. |
| EX-MODEL-250 | Excalibur and Wolf commissioned; nonprivileged viewer uses SHORT output; USERS | Excalibur row, faction separator, Wolf row. Include all six ordinary metadata fields in both rows; omit positions and descriptive header. |
| EX-MODEL-251 | Privileged viewer aboard Excalibur at (37,37), output BOTH; USERS includes the viewer | Excalibur's ReportedPosition contains absolute (37,37) and relative (0,0). Do not suppress its zero relative displacement. |
| EX-MODEL-252 | Privileged viewer at (37,37), output RELATIVE; Wolf at (42,35) | Wolf's ReportedPosition has absolute none and relative (5,-2). No sensor-range or radio-status filter applies. |
| EX-MODEL-253 | Privileged pregame viewer with ABSOLUTE output; Wolf commissioned at (42,35) | Report Wolf's absolute position without needing a viewer ship position. Do not invent a relative origin. |
| EX-MODEL-254 | Commissioned viewer, stardate 4; committed ENEMY_DAMAGE 12 and pending PLANET_CAPTURE 100; bare POINTS | Select only ShipScore(viewer's ship). CategoryRow(ENEMY_DAMAGE) contains 12, TotalRow contains 12, PerTurnRow has ratio 12/4. No commission rows; pending score remains 100 and is not reported. |
| EX-MODEL-255 | Commissioned viewer; POINTS EMPIRE ME FEDERATION EMPIRE; all selected counts positive | Columns are ship, Federation, Empire, once each. Category and accounting cells follow that order. CommissionRow and PerCommissionRow have absent ship cells, not zeros. |
| EX-MODEL-256 | Pregame viewer; POINTS ME FEDERATION | Reject InvalidScoreSelector before any report rows; ME requires a ship. Do not continue to the valid Federation selector. |
| EX-MODEL-257 | Commissioned viewer; POINTS 7 FEDERATION | Reject InvalidScoreSelector: the explicit selection stops at 7 with no selected columns. Do not apply the bare-command self default. |
| EX-MODEL-258 | POINTS FEDERATION 7 BOGUS; Federation counts positive | Select only TeamScore(FEDERATION). Stop at 7 and ignore BOGUS. |
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


EX-MODEL-06 deliberately uses fractional shield strength. Historical loss of
that fraction is excluded by the numerical normalization policy. The grammar,
transfer rate and energy charge are unchanged.

Exact terminal presentation, broader command cases, concurrency and complete
world evolution remain part of the unfinished conformance work.

**Basis:** [abstract model](language-model.md), [commands](commands.md),
[shared world rules](world-rules.md), [turns](turns.md),
[lexical rules](lexical.md), [normalization policy](NORMALIZATION.md).
