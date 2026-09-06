# Normative source index

This companion index records the Austin and CompuServe source locations used to derive the normative specification. It is not part of the assembled book and does not add requirements. Entries are keyed to the clause headings that contain the resulting rules.

## language-model.md

- **Score quantities:** [score categories and display](../../legacy/utexas/DECWAR.FOR#L2893).
- **Life-support reserve:** [initial reserve](../../legacy/utexas/SETUP.FOR#L395),
[turn check and exhaustion](../../legacy/utexas/DECWAR.FOR#L241).
- **Tractor beams and Romulan activity:** [tractor association](../../legacy/utexas/DECWAR.FOR#L4432),
[score categories and display](../../legacy/utexas/DECWAR.FOR#L2893).
- **Information and communication:** [ship and device meanings](../../legacy/utexas/PARAM.FOR#L44),
[new ship state](../../legacy/utexas/SETUP.FOR#L367),
[distance](../../legacy/utexas/WARMAC.MAC#L3720),
[radio controls](../../legacy/utexas/DECWAR.FOR#L3129).
- **Combat observation and notice values:** [notice capacity](../../legacy/utexas/WARMAC.MAC#L183),
[publication](../../legacy/utexas/WARMAC.MAC#L2771),
[notice display](../../legacy/utexas/DECWAR.FOR#L2392).
- **World:** [world limits](../../legacy/utexas/PARAM.FOR#L5),
[roster](../../legacy/utexas/DECWAR.FOR#L489),
[world initialization](../../legacy/utexas/SETUP.FOR#L216),
[planet order on removal](../../legacy/utexas/DECWAR.FOR#L2864).
- **Nested operations and waiting:** [coordination domains and release scope](../../legacy/utexas/WARMAC.MAC#L3768),
[admission boundary](../../legacy/utexas/SETUP.FOR#L163),
[ship-selection boundary](../../legacy/utexas/SETUP.FOR#L353),
[relocation boundary](../../legacy/utexas/DECWAR.FOR#L2227),
[BUILD conversion](../../legacy/utexas/DECWAR.FOR#L551),
[CAPTURE update](../../legacy/utexas/DECWAR.FOR#L618),
[nova planet update](../../legacy/utexas/DECWAR.FOR#L2375),
[Romulan planet update](../../legacy/utexas/DECWAR.FOR#L3496),
[player torpedo planet update](../../legacy/utexas/DECWAR.FOR#L4387),
[commission release](../../legacy/utexas/DECWAR.FOR#L1082),
[radio phases](../../legacy/utexas/WARMAC.MAC#L2603),
[administrative phase](../../legacy/utexas/WARMAC.MAC#L4636),
[input waiting](../../legacy/utexas/WARMAC.MAC#L1394),
[elapsed waiting](../../legacy/utexas/WARMAC.MAC#L3372),
[command acquisition](../../legacy/utexas/DECWAR.FOR#L1214),
[environment exit](../../legacy/utexas/WARMAC.MAC#L1060).

## lexical.md

- **LEX-1 — Characters and case:** [Austin WARMAC NXTT.](../../legacy/utexas/WARMAC.MAC#L1454),
[character table](../../legacy/utexas/WARMAC.MAC#L838).
- **LEX-2 — Line acquisition and editing:** [INLI. and NXCH.](../../legacy/utexas/WARMAC.MAC#L1542),
[CBITS](../../legacy/utexas/WARMAC.MAC#L838).
- **LEX-3 — Token boundaries and command remainder:** [GTKN](../../legacy/utexas/WARMAC.MAC#L1377),
[NXTT./SKPB.](../../legacy/utexas/WARMAC.MAC#L1454), CBITS above.
- **LEX-4 — Token categories:** [GTKN category selection](../../legacy/utexas/WARMAC.MAC#L1416),
[NXTT.](../../legacy/utexas/WARMAC.MAC#L1454),
[ANUM.](../../legacy/utexas/WARMAC.MAC#L1508).
- **LEX-5 — Numeric interpretation:** [ANUM.](../../legacy/utexas/WARMAC.MAC#L1508).
- **LEX-6 — Keyword matching:** [EQUAL](../../legacy/utexas/WARMAC.MAC#L3675),
[GETCMD matching loop](../../legacy/utexas/DECWAR.FOR#L1243),
[XGTCMD](../../legacy/utexas/SETUP.FOR#L402),
[ship selection](../../legacy/utexas/SETUP.FOR#L337).
- **LEX-7 — Capacity and recovery:** [GTKN capacity/recovery](../../legacy/utexas/WARMAC.MAC#L1407),
[NXTT delimiter handling](../../legacy/utexas/WARMAC.MAC#L1454),
[character classes](../../legacy/utexas/WARMAC.MAC#L838).

## grammar.md

- **Shared grammar vocabulary:** [token categories and boundaries](../../legacy/utexas/WARMAC.MAC#L1377),
[numeric interpretation](../../legacy/utexas/WARMAC.MAC#L1508),
[location reader](../../legacy/utexas/DECWAR.FOR#L1404),
[SET and name acquisition](../../legacy/utexas/DECWAR.FOR#L3624),
[TELL](../../legacy/utexas/DECWAR.FOR#L3977),
[password comparison](../../legacy/utexas/DECWAR.FOR#L2626),
[galaxy creation](../../legacy/utexas/SETUP.FOR#L169).
- **GRAM-2 — Command selection:** [command DATA](../../legacy/utexas/DECWAR.FOR#L437),
[GETCMD](../../legacy/utexas/DECWAR.FOR#L1243),
[XGTCMD](../../legacy/utexas/SETUP.FOR#L402),
[PREGAM](../../legacy/utexas/SETUP.FOR#L76).
- **Caller policies and diagnostics:** [LOCATE/RELOC](../../legacy/utexas/DECWAR.FOR#L1404),
[MOVE/IMPULS](../../legacy/utexas/DECWAR.FOR#L2141),
[PHACON](../../legacy/utexas/DECWAR.FOR#L2647),
[TORP](../../legacy/utexas/DECWAR.FOR#L4228).
- **GRAM-4 — Movement, capture and construction:** [MOVE/IMPULS](../../legacy/utexas/DECWAR.FOR#L2141),
[CAPTUR](../../legacy/utexas/DECWAR.FOR#L600),
[BUILD](../../legacy/utexas/DECWAR.FOR#L523).
- **GRAM-5 — Phasers and torpedoes:** [PHACON](../../legacy/utexas/DECWAR.FOR#L2647),
[TORP](../../legacy/utexas/DECWAR.FOR#L4228).
- **GRAM-6 — Scans:** [SCAN/SRSCAN](../../legacy/utexas/DECWAR.FOR#L3527).
- **GRAM-7 — Ship resources:** [SHIELD](../../legacy/utexas/DECWAR.FOR#L3739),
[ENERGY](../../legacy/utexas/DECWAR.FOR#L1009),
[REPAIR](../../legacy/utexas/DECWAR.FOR#L3190),
[DOCK](../../legacy/utexas/DECWAR.FOR#L893),
[TRACTR](../../legacy/utexas/DECWAR.FOR#L4432).
- **GRAM-8 — Preferences and radio:** [SET](../../legacy/utexas/DECWAR.FOR#L3624),
[RADIO](../../legacy/utexas/DECWAR.FOR#L3129).
- **GRAM-9 — Quit:** [main QUIT](../../legacy/utexas/DECWAR.FOR#L147),
[pregame dispatch](../../legacy/utexas/SETUP.FOR#L100).
- **GRAM-10 — Reports and type information:** [STATUS](../../legacy/utexas/DECWAR.FOR#L3860),
[DAMAGE](../../legacy/utexas/DECWAR.FOR#L783),
[POINTS](../../legacy/utexas/DECWAR.FOR#L2893),
[TYPE/USERS](../../legacy/utexas/DECWAR.FOR#L4540),
[TIME](../../legacy/utexas/DECWAR.FOR#L4066).
- **GRAM-11 — LIST-family grouping:** [LIST entries](../../legacy/utexas/DECWAR.FOR#L1359),
[LSTSCN](../../legacy/utexas/DECWAR.FOR#L1519).
- **GRAM-12 — TELL and text-reading utilities:** [TELL](../../legacy/utexas/DECWAR.FOR#L3977),
[MAKMSG](../../legacy/utexas/WARMAC.MAC#L2961),
[HELP](../../legacy/utexas/WARMAC.MAC#L4134),
[NEWS/GRIPE](../../legacy/utexas/WARMAC.MAC#L3811).
- **GRAM-13 — Starred commands:** [PASWRD](../../legacy/utexas/DECWAR.FOR#L2626),
[DEBUG](../../legacy/utexas/WARMAC.MAC#L3633),
[pregame *ZAP](../../legacy/utexas/SETUP.FOR#L134).

## commands.md

- **Examples:** [SHIELD](../../legacy/utexas/DECWAR.FOR#L3739).
- **Operations and state effects:** [RADIO](../../legacy/utexas/DECWAR.FOR#L3129).
- **Successful state effects and completion:** [ENERGY](../../legacy/utexas/DECWAR.FOR#L1009).
- **Completion and time:** [DOCK](../../legacy/utexas/DECWAR.FOR#L893),
[completion](../../legacy/utexas/DECWAR.FOR#L80),
[automatic repair selection](../../legacy/utexas/DECWAR.FOR#L3209).
- **Explicit repair and completion:** [REPAIR](../../legacy/utexas/DECWAR.FOR#L3190),
[explicit invocation](../../legacy/utexas/DECWAR.FOR#L148),
[automatic repair](../../legacy/utexas/DECWAR.FOR#L237).
- **Knowledge and result:** [SCAN/SRSCAN](../../legacy/utexas/DECWAR.FOR#L3527),
[sector observations and symbols](../../legacy/utexas/WARMAC.MAC#L2350),
[warning marks](../../legacy/utexas/WARMAC.MAC#L2412),
[row output and axes](../../legacy/utexas/WARMAC.MAC#L2482).
- **Meaning of report items:** [STATUS](../../legacy/utexas/DECWAR.FOR#L3860).
- **Selection and result:** [DAMAGE](../../legacy/utexas/DECWAR.FOR#L783),
[device identifiers](../../legacy/utexas/DECWAR.FOR#L435).
- **Release and completion:** [TRACTR and TRCOFF](../../legacy/utexas/DECWAR.FOR#L4432).
- **Completion:** [MOVE/IMPULS](../../legacy/utexas/DECWAR.FOR#L2141),
[path](../../legacy/utexas/DECWAR.FOR#L699),
[completion selection](../../legacy/utexas/DECWAR.FOR#L99).
- **Completion:** [BUILD](../../legacy/utexas/DECWAR.FOR#L523),
[planet removal](../../legacy/utexas/DECWAR.FOR#L2864),
[world-end exit](../../legacy/utexas/DECWAR.FOR#L961),
[normal build completion](../../legacy/utexas/DECWAR.FOR#L64).
- **Observations and completion:** [CAPTUR](../../legacy/utexas/DECWAR.FOR#L600),
[phaser damage](../../legacy/utexas/DECWAR.FOR#L4166),
[turn completion](../../legacy/utexas/DECWAR.FOR#L73).
- **Completion:** [PHACON](../../legacy/utexas/DECWAR.FOR#L2647),
[damage](../../legacy/utexas/DECWAR.FOR#L4089),
[Romulan hit](../../legacy/utexas/DECWAR.FOR#L3382).
- **Original-line even item counts:** [location resolution](../../legacy/utexas/DECWAR.FOR#L1410),
[original-line count and aim selection](../../legacy/utexas/DECWAR.FOR#L4247).
- **Completion:** [TORP](../../legacy/utexas/DECWAR.FOR#L4228),
[TORDAM](../../legacy/utexas/DECWAR.FOR#L4089),
[location input](../../legacy/utexas/DECWAR.FOR#L1404).
- **Detail, summaries and knowledge:** [LIST and related entries](../../legacy/utexas/DECWAR.FOR#L1359),
[group parsing](../../legacy/utexas/DECWAR.FOR#L1519),
[selection and visibility](../../legacy/utexas/DECWAR.FOR#L1750),
[detail and summary output](../../legacy/utexas/DECWAR.FOR#L1959).
- **Report construction:** [POINTS](../../legacy/utexas/DECWAR.FOR#L2893),
[commission counts](../../legacy/utexas/SETUP.FOR#L296),
[Romulan commissions and turns](../../legacy/utexas/DECWAR.FOR#L3244).
- **Operation and observations:** [TYPE](../../legacy/utexas/DECWAR.FOR#L4540),
[version text](../../legacy/utexas/MSG.MAC#L44),
[black-hole removal](../../legacy/utexas/DECWAR.FOR#L3727).
- **TIME:** [TIME](../../legacy/utexas/DECWAR.FOR#L4066).
- **USERS:** [USERS](../../legacy/utexas/DECWAR.FOR#L4600),
[user-information fields](../../legacy/utexas/WARMAC.MAC#L2187),
[position reporting](../../legacy/utexas/DECWAR.FOR#L3078),
[faction separator](../../legacy/utexas/MSG.MAC#L380).
- **Privileged settings:** [SET](../../legacy/utexas/DECWAR.FOR#L3624),
[terminal names](../../legacy/utexas/DECWAR.FOR#L480),
[USRNAM](../../legacy/utexas/WARMAC.MAC#L3415).
- **Body and completion:** [TELL](../../legacy/utexas/DECWAR.FOR#L3977),
[default groups](../../legacy/utexas/SETUP.FOR#L358),
[message acquisition](../../legacy/utexas/WARMAC.MAC#L2963).
- ***PASSWORD:** [PASWRD](../../legacy/utexas/DECWAR.FOR#L2626),
[password constant](../../legacy/utexas/PARAM.FOR#L15).
- ***DEBUG:** [DEBUG and timing observations](../../legacy/utexas/WARMAC.MAC#L3600).
- **State effects and completion:** [HELP and topic matching](../../legacy/utexas/WARMAC.MAC#L4134),
[section output](../../legacy/utexas/WARMAC.MAC#L4222),
[extra topics](../../legacy/utexas/DECWAR.FOR#L471),
[startup HELP](../../legacy/utexas/SETUP.FOR#L76).
- **Observations and state effects:** [NEWS](../../legacy/utexas/WARMAC.MAC#L3811),
[supplied news](../../legacy/utexas/HLP/DECWAR.NWS).
- **State effects and completion:** [GRIPE input](../../legacy/utexas/WARMAC.MAC#L3858),
[recording and cleanup](../../legacy/utexas/WARMAC.MAC#L4050),
[line limit and retry interval](../../legacy/utexas/WARMAC.MAC#L470),
[record header](../../legacy/utexas/WARMAC.MAC#L2116).
- **Accepted state effects and observations:** [confirmation](../../legacy/utexas/DECWAR.FOR#L134),
[final score and exit](../../legacy/utexas/DECWAR.FOR#L290),
[release](../../legacy/utexas/DECWAR.FOR#L1082),
[pregame exit](../../legacy/utexas/SETUP.FOR#L112).

## world-rules.md

- **Initial galaxies and tournament keys:** [random interfaces](../../legacy/utexas/WARMAC.MAC#L2285),
[initialization and populations](../../legacy/utexas/SETUP.FOR#L169),
[placement](../../legacy/utexas/DECWAR.FOR#L2765),
[weapon branches](../../legacy/utexas/DECWAR.FOR#L4089),
[Romulan targeting](../../legacy/utexas/DECWAR.FOR#L836),
[nova effects](../../legacy/utexas/DECWAR.FOR#L2259).
- **Geometric meaning:** [CHECK and CHKPNT](../../legacy/utexas/DECWAR.FOR#L699).
- **Following a moving endpoint:** [TRCOFF](../../legacy/utexas/DECWAR.FOR#L4504),
[following movement](../../legacy/utexas/DECWAR.FOR#L2227).
- **Score and result:** [PHADAM and shared damage](../../legacy/utexas/DECWAR.FOR#L4089),
[displayed score units](../../legacy/utexas/DECWAR.FOR#L2994).
- **Damage to the Romulan:** [PHAROM, TOROM and DEADRO](../../legacy/utexas/DECWAR.FOR#L3382),
[player phaser credit](../../legacy/utexas/DECWAR.FOR#L2711).
- **Blast displacement:** [JUMP](../../legacy/utexas/DECWAR.FOR#L1283).
- **Planet effect:** [NOVA](../../legacy/utexas/DECWAR.FOR#L2259),
[SNOVA](../../legacy/utexas/DECWAR.FOR#L3807),
[combat report presentation](../../legacy/utexas/DECWAR.FOR#L2392).
- **Docking re-evaluation:** [planet removal](../../legacy/utexas/DECWAR.FOR#L2864),
[docking re-evaluation](../../legacy/utexas/DECWAR.FOR#L339),
[world end](../../legacy/utexas/DECWAR.FOR#L961).

## turns.md

- **Time model:** [commissioning and pacing](../../legacy/utexas/SETUP.FOR#L388),
[elapsed-time use](../../legacy/utexas/DECWAR.FOR#L899).
- **Automatic repair:** [automatic-repair dispatch](../../legacy/utexas/DECWAR.FOR#L223),
[repair selection](../../legacy/utexas/DECWAR.FOR#L3190),
[coordinate mode matching](../../legacy/utexas/DECWAR.FOR#L1404).
- **Turn accounting:** [command completion dispatch](../../legacy/utexas/DECWAR.FOR#L63),
[turn accounting and score commitment](../../legacy/utexas/DECWAR.FOR#L223),
[repair](../../legacy/utexas/DECWAR.FOR#L3190),
[Romulan activation](../../legacy/utexas/DECWAR.FOR#L3233).
- **BaseReplenishment:** [BASBLD](../../legacy/utexas/DECWAR.FOR#L317),
[BASPHA](../../legacy/utexas/DECWAR.FOR#L375),
[PLNATK](../../legacy/utexas/DECWAR.FOR#L2800).
- **Returning to command input:** [command acquisition](../../legacy/utexas/DECWAR.FOR#L1184).
- **Elapsed waiting:** [PAUSE](../../legacy/utexas/WARMAC.MAC#L3372).

## autonomous.md

- **Activation and appearance:** [ROMDRV activation](../../legacy/utexas/DECWAR.FOR#L3233),
[placement](../../legacy/utexas/DECWAR.FOR#L2765),
[new-galaxy initialization](../../legacy/utexas/SETUP.FOR#L171).
- **Target selection:** [DIST](../../legacy/utexas/DECWAR.FOR#L836).
- **Movement toward a target:** [ROMDRV movement](../../legacy/utexas/DECWAR.FOR#L3323),
[sector paths](world-rules.md#sector-paths).
- **Weapon selection and phasers:** [weapon selection and follow-up](../../legacy/utexas/DECWAR.FOR#L3261),
[base defenses](../../legacy/utexas/DECWAR.FOR#L375),
[planet defenses](../../legacy/utexas/DECWAR.FOR#L2800),
[replenishment](../../legacy/utexas/DECWAR.FOR#L317).
- **Torpedo aim and burst:** [ROMSTR](../../legacy/utexas/DECWAR.FOR#L3400),
[ROMTOR](../../legacy/utexas/DECWAR.FOR#L3419).
- **Accidental torpedo hits on planets:** [ROMTOR planet impact](../../legacy/utexas/DECWAR.FOR#L3492).

## communication.md

- **Publishing a message:** [publication and capacity](../../legacy/utexas/WARMAC.MAC#L2589),
[MAKMSG](../../legacy/utexas/WARMAC.MAC#L2963),
[capacity limit](../../legacy/utexas/PARAM.FOR#L16).
- **Receiving a message:** [GETMSG](../../legacy/utexas/WARMAC.MAC#L3036),
[OUTMSG](../../legacy/utexas/DECWAR.FOR#L2599),
[release](../../legacy/utexas/DECWAR.FOR#L1082).
- **Discarding an unread audience:** [capacity-loss removal](../../legacy/utexas/WARMAC.MAC#L2624),
[message recipient removal](../../legacy/utexas/WARMAC.MAC#L2710),
[release consumption](../../legacy/utexas/DECWAR.FOR#L1125).
- **Autonomous Romulan speech:** [ROMSPK](../../legacy/utexas/WARMAC.MAC#L4672),
[TELL's autonomous path](../../legacy/utexas/DECWAR.FOR#L3977).
- **Origin snapshots and information disclosed:** [base defense](../../legacy/utexas/DECWAR.FOR#L375),
[capture snapshot](../../legacy/utexas/DECWAR.FOR#L629),
[nova observations](../../legacy/utexas/DECWAR.FOR#L2259),
[hit display](../../legacy/utexas/DECWAR.FOR#L2417),
[player phasers](../../legacy/utexas/DECWAR.FOR#L2694),
[planet defense](../../legacy/utexas/DECWAR.FOR#L2800),
[Romulan phasers](../../legacy/utexas/DECWAR.FOR#L3289),
[Romulan torpedoes](../../legacy/utexas/DECWAR.FOR#L3461),
[player torpedoes](../../legacy/utexas/DECWAR.FOR#L4286),
[Romulan target position](../../legacy/utexas/DECWAR.FOR#L4375).
- **Observation values:** [energy transfer](../../legacy/utexas/DECWAR.FOR#L1062),
[phaser/base announcements](../../legacy/utexas/DECWAR.FOR#L2720),
[Romulan appearance](../../legacy/utexas/DECWAR.FOR#L3253),
[nova-chain announcements](../../legacy/utexas/DECWAR.FOR#L3845),
[torpedo outcomes](../../legacy/utexas/DECWAR.FOR#L4304),
[tractor notifications](../../legacy/utexas/DECWAR.FOR#L4497),
[observation presentation](../../legacy/utexas/DECWAR.FOR#L2392).
- **Discarding and acquisition boundaries:** [notice capacity](../../legacy/utexas/WARMAC.MAC#L183),
[publication](../../legacy/utexas/WARMAC.MAC#L2771),
[reception](../../legacy/utexas/WARMAC.MAC#L2880),
[command acquisition](../../legacy/utexas/DECWAR.FOR#L1184),
[notice display](../../legacy/utexas/DECWAR.FOR#L2392),
[release](../../legacy/utexas/DECWAR.FOR#L1120).

## session-rules.md

- **Session properties:** [timing registration and reporting](../../legacy/utexas/WARMAC.MAC#L3606).
- **Session properties:** [galaxy clock origin](../../legacy/utexas/SETUP.FOR#L173),
[commission metadata and clocks](../../legacy/utexas/SETUP.FOR#L365),
[elapsed and execution observations](../../legacy/utexas/WARMAC.MAC#L3329),
[report metadata](../../legacy/utexas/WARMAC.MAC#L2187).
- **Startup and pregame:** [main initialization](../../legacy/utexas/DECWAR.FOR#L1),
[startup and pregame dispatch](../../legacy/utexas/SETUP.FOR#L76),
[pregame matching](../../legacy/utexas/SETUP.FOR#L402),
[initial name reader](../../legacy/utexas/WARMAC.MAC#L3213),
[coordinate interpretation](../../legacy/utexas/DECWAR.FOR#L1403),
[preference reports](../../legacy/utexas/DECWAR.FOR#L4560).
- **Entry name:** [entry-name acquisition and conversion](../../legacy/utexas/WARMAC.MAC#L3208),
[admission identity acquisition](../../legacy/utexas/SETUP.FOR#L156),
[commission identity recording](../../legacy/utexas/SETUP.FOR#L365),
[SET NAME](../../legacy/utexas/WARMAC.MAC#L3423).
- **Administrative statistics:** [pregame privilege check](../../legacy/utexas/SETUP.FOR#L134),
[statistics values](../../legacy/utexas/WARMAC.MAC#L575),
[archive resources](../../legacy/utexas/WARMAC.MAC#L748),
[administrative feedback path](../../legacy/utexas/WARMAC.MAC#L3878),
[empty administrative body](../../legacy/utexas/WARMAC.MAC#L4049),
[statistics clearing](../../legacy/utexas/WARMAC.MAC#L4636).
- **Ship choice and commissioning:** [participant reservation and reuse](../../legacy/utexas/SETUP.FOR#L145),
[faction and ship selection](../../legacy/utexas/SETUP.FOR#L264),
[commission initialization](../../legacy/utexas/SETUP.FOR#L353),
[early cancellation](../../legacy/utexas/SETUP.FOR#L1),
[placement and command initialization](../../legacy/utexas/DECWAR.FOR#L44).
- **Galaxy creation and placement:** [new-galaxy dialogue and population](../../legacy/utexas/SETUP.FOR#L173),
[placement](../../legacy/utexas/DECWAR.FOR#L2765).
- **Initialization commands:** [initialization reader](../../legacy/utexas/WARMAC.MAC#L1096),
[preserved commands](../../legacy/utexas-reference/f78f2ec/DECWAR.INI).
- **Temporary information activities:** [HELP entry and return](../../legacy/utexas/WARMAC.MAC#L4134),
[GRIPE entry and return](../../legacy/utexas/WARMAC.MAC#L3858),
[temporary sector state](../../legacy/utexas/WARMAC.MAC#L4379).
- **Interrupt timing and QUIT selection:** [entry, prompting and wait boundaries](../../legacy/utexas/DECWAR.FOR#L1184),
[ready-input and interrupt paths](../../legacy/utexas/DECWAR.FOR#L1230),
[final score/release](../../legacy/utexas/DECWAR.FOR#L1258),
[inactive availability check](../../legacy/utexas/WARMAC.MAC#L3078),
[QUIT operation](../../legacy/utexas/DECWAR.FOR#L134),
[readiness interval](../../legacy/utexas/PARAM.FOR#L31),
[token acquisition](../../legacy/utexas/WARMAC.MAC#L1385).
- **Releasing a commission:** [FREE and RSTART](../../legacy/utexas/DECWAR.FOR#L1082),
[history matching](../../legacy/utexas/DECWAR.FOR#L1335),
[history capacity and admission delay](../../legacy/utexas/PARAM.FOR#L30),
[empty-galaxy reuse](../../legacy/utexas/SETUP.FOR#L168).
- **Saved condition and environment continuation:** [saved values during release](../../legacy/utexas/DECWAR.FOR#L1113),
[conditional restoration](../../legacy/utexas/DECWAR.FOR#L1141),
[interruption caller](../../legacy/utexas/DECWAR.FOR#L4516),
[condition fields](../../legacy/utexas/PARAM.FOR#L43).
- **World termination:** [ENDGAM](../../legacy/utexas/DECWAR.FOR#L961),
[active command acquisition](../../legacy/utexas/DECWAR.FOR#L1184),
[SET ENDFLG](../../legacy/utexas/DECWAR.FOR#L3719),
[planet-removal check](../../legacy/utexas/DECWAR.FOR#L2889),
[restart countdown](../../legacy/utexas/SETUP.FOR#L59).

## information.md

- **Help content:** [topic selection and output](../../legacy/utexas/WARMAC.MAC#L4134),
[section binding](../../legacy/utexas/WARMAC.MAC#L4222),
[list rendering](../../legacy/utexas/WARMAC.MAC#L4359),
[topic catalogue](../../legacy/utexas/DECWAR.FOR#L471).
- **News content:** [NEWS](../../legacy/utexas/WARMAC.MAC#L3811),
[news binding](../../legacy/utexas/WARMAC.MAC#L699).
- **Feedback records:** [context header](../../legacy/utexas/WARMAC.MAC#L2116),
[session metadata](../../legacy/utexas/WARMAC.MAC#L2187),
[GRIPE recording](../../legacy/utexas/WARMAC.MAC#L4050).

## presentation.md

- **Numbers and displayed precision:** [decimal field presentation](../../legacy/utexas/WARMAC.MAC#L1880),
[precision and signs](../../legacy/utexas/WARMAC.MAC#L1932),
[combat strength readings](../../legacy/utexas/DECWAR.FOR#L2427).
- **Coordinates:** [coordinate rendering](../../legacy/utexas/DECWAR.FOR#L3078),
[impact target coordinates](../../legacy/utexas/DECWAR.FOR#L2492).
- **Names and condition text:** [object labels](../../legacy/utexas/WARMAC.MAC#L1970),
[device labels](../../legacy/utexas/WARMAC.MAC#L2054),
[condition labels](../../legacy/utexas/WARMAC.MAC#L2087).
- **Main and pregame prompts:** [main prompts](../../legacy/utexas/DECWAR.FOR#L3107),
[normal literal](../../legacy/utexas/MSG.MAC#L38),
[pregame prompt](../../legacy/utexas/SETUP.FOR#L426).
- **Lines and composition:** [literal and line output](../../legacy/utexas/WARMAC.MAC#L1650),
[column padding](../../legacy/utexas/WARMAC.MAC#L1670),
[conditional blank line](../../legacy/utexas/WARMAC.MAC#L1696),
[character output](../../legacy/utexas/WARMAC.MAC#L1309).
- **Ordinary line-editor output:** [ordinary acquisition and completion](../../legacy/utexas/WARMAC.MAC#L1551),
[echo-sensitive classification and redisplay](../../legacy/utexas/WARMAC.MAC#L1608),
[echo enablement](../../legacy/utexas/WARMAC.MAC#L1145),
[character classes](../../legacy/utexas/WARMAC.MAC#L838).
- **HELP command lists and topic diagnostics:** [HELP dispatch](../../legacy/utexas/WARMAC.MAC#L4134),
[command heading](../../legacy/utexas/WARMAC.MAC#L4209),
[ambiguity and list formatting](../../legacy/utexas/WARMAC.MAC#L4318),
[display labels](../../legacy/utexas/DECWAR.FOR#L437).
- **HELP section failures:** [section entry and opening](../../legacy/utexas/WARMAC.MAC#L4222),
[end-of-resource and cleanup](../../legacy/utexas/WARMAC.MAC#L4273),
[warning output](../../legacy/utexas/WARMAC.MAC#L28).
- **NEWS output and failure:** [NEWS output and exits](../../legacy/utexas/WARMAC.MAC#L3811),
[warning expansion](../../legacy/utexas/WARMAC.MAC#L28).
- **GRIPE refusal and storage diagnostics:** [RED refusal](../../legacy/utexas/WARMAC.MAC#L3858),
[recording failures and cleanup](../../legacy/utexas/WARMAC.MAC#L4057),
[record-extension failure](../../legacy/utexas/WARMAC.MAC#L4114),
[warning output](../../legacy/utexas/WARMAC.MAC#L28).
- **TELL command responses:** [TELL](../../legacy/utexas/DECWAR.FOR#L3977),
[recipient fragments](../../legacy/utexas/MSG.MAC#L312),
[body acquisition and publication](../../legacy/utexas/WARMAC.MAC#L2963).
- **Configuration command responses:** [SET](../../legacy/utexas/DECWAR.FOR#L3624),
[prompt fragments](../../legacy/utexas/MSG.MAC#L259),
[terminal names](../../legacy/utexas/MSG.MAC#L358).
- **Shield command responses:** [SHIELDS response paths](../../legacy/utexas/DECWAR.FOR#L3739),
[response strings](../../legacy/utexas/MSG.MAC#L280),
[literal and line output](../../legacy/utexas/WARMAC.MAC#L1653).
- **Energy-transfer responses:** [ENERGY output paths](../../legacy/utexas/DECWAR.FOR#L1009),
[energy strings](../../legacy/utexas/MSG.MAC#L67),
[LONG self-transfer prefix](../../legacy/utexas/MSG.MAC#L10),
[absent recipient](../../legacy/utexas/MSG.MAC#L152),
[unknown name](../../legacy/utexas/MSG.MAC#L373).
- **Docking and repair responses:** [DOCK](../../legacy/utexas/DECWAR.FOR#L893),
[docking strings](../../legacy/utexas/MSG.MAC#L47),
[REPAIR](../../legacy/utexas/DECWAR.FOR#L3190).
- **Radio preference responses:** [RADIO](../../legacy/utexas/DECWAR.FOR#L3129),
[radio strings](../../legacy/utexas/MSG.MAC#L248).
- **Tractor command responses:** [TRACTR and release](../../legacy/utexas/DECWAR.FOR#L4432),
[tractor strings](../../legacy/utexas/MSG.MAC#L349),
[shared adjacency response](../../legacy/utexas/MSG.MAC#L70).
- **Construction responses:** [BUILD](../../legacy/utexas/DECWAR.FOR#L522),
[construction strings](../../legacy/utexas/MSG.MAC#L12).
- **Capture responses:** [CAPTUR](../../legacy/utexas/DECWAR.FOR#L600),
[capture strings](../../legacy/utexas/MSG.MAC#L20),
[target-kind diagnostics](../../legacy/utexas/MSG.MAC#L148),
[location completion](../../legacy/utexas/DECWAR.FOR#L3078).
- **Phaser command responses:** [PHACON](../../legacy/utexas/DECWAR.FOR#L2647),
[phaser response strings](../../legacy/utexas/MSG.MAC#L196),
[own-sector diagnostics](../../legacy/utexas/MSG.MAC#L85),
[coordinate count diagnostic](../../legacy/utexas/MSG.MAC#L78).
- **Torpedo command responses:** [TORP acquisition](../../legacy/utexas/DECWAR.FOR#L4228),
[burst completion and direct responses](../../legacy/utexas/DECWAR.FOR#L4401),
[torpedo strings](../../legacy/utexas/MSG.MAC#L341),
[coordinate prompt](../../legacy/utexas/MSG.MAC#L38).
- **Movement command responses:** [MOVE and IMPULSE](../../legacy/utexas/DECWAR.FOR#L2141),
[movement strings](../../legacy/utexas/MSG.MAC#L131),
[numeric report fields](../../legacy/utexas/WARMAC.MAC#L1940).
- **Base emergency and destruction suffixes:** [prefix and damage phrases](../../legacy/utexas/DECWAR.FOR#L2417),
[target and critical details](../../legacy/utexas/DECWAR.FOR#L2478),
[emergency and destruction](../../legacy/utexas/DECWAR.FOR#L2518),
[other combat bodies](../../legacy/utexas/DECWAR.FOR#L2544),
[literal text](../../legacy/utexas/MSG.MAC#L161),
[Romulan torpedo form](../../legacy/utexas/DECWAR.FOR#L3461).
- **Radio message bodies and headings:** [radio heading and body](../../legacy/utexas/DECWAR.FOR#L2599),
[heading strings](../../legacy/utexas/MSG.MAC#L128),
[body ending](../../legacy/utexas/WARMAC.MAC#L2994),
[recipient initials](../../legacy/utexas/DECWAR.FOR#L489).
- **Status reports:** [STATUS](../../legacy/utexas/DECWAR.FOR#L3860),
[status labels](../../legacy/utexas/MSG.MAC#L292),
[radio labels](../../legacy/utexas/MSG.MAC#L249),
[DOCK STATUS](../../legacy/utexas/DECWAR.FOR#L935).
- **Device-damage reports:** [DAMAGE](../../legacy/utexas/DECWAR.FOR#L783),
[damage-report strings](../../legacy/utexas/MSG.MAC#L41),
[all-functional response](../../legacy/utexas/MSG.MAC#L6),
[device labels](../../legacy/utexas/WARMAC.MAC#L2054).
- **Time reports:** [TIME](../../legacy/utexas/DECWAR.FOR#L4066),
[time labels](../../legacy/utexas/MSG.MAC#L330),
[duration decomposition](../../legacy/utexas/WARMAC.MAC#L1746).
- **Preference and option reports:** [TYPE](../../legacy/utexas/DECWAR.FOR#L4540),
[profile spellings](../../legacy/utexas/DECWAR.FOR#L480),
[profile padding](../../legacy/utexas/WARMAC.MAC#L1734),
[report strings](../../legacy/utexas/MSG.MAC#L360),
[option strings](../../legacy/utexas/MSG.MAC#L274).
- **Scan grids:** [scan display and axes](../../legacy/utexas/WARMAC.MAC#L2482),
[two-character labels](../../legacy/utexas/WARMAC.MAC#L1814),
[scan command and rejection](../../legacy/utexas/DECWAR.FOR#L3527).
- **Report and section boundaries:** [entry and group processing](../../legacy/utexas/DECWAR.FOR#L1378),
[named-group boundary](../../legacy/utexas/DECWAR.FOR#L1806),
[deferred section boundaries](../../legacy/utexas/DECWAR.FOR#L1959).
- **Summary lines:** [detail lines](../../legacy/utexas/DECWAR.FOR#L2084),
[summary lines](../../legacy/utexas/DECWAR.FOR#L2060),
[grouped observations](../../legacy/utexas/DECWAR.FOR#L1959),
[range and category strings](../../legacy/utexas/MSG.MAC#L89).
- **Terrain observations:** [coordinate and named observations](../../legacy/utexas/DECWAR.FOR#L1765),
[no-match composition](../../legacy/utexas/DECWAR.FOR#L1891),
[absence fragments](../../legacy/utexas/MSG.MAC#L109),
[position formatting](../../legacy/utexas/DECWAR.FOR#L3078).
- **USERS reports:** [USERS headings and row order](../../legacy/utexas/DECWAR.FOR#L4600),
[identity fields](../../legacy/utexas/WARMAC.MAC#L2187),
[account field digits and width](../../legacy/utexas/WARMAC.MAC#L1856),
[position fields](../../legacy/utexas/DECWAR.FOR#L3078).
- **Totals and accounting rows:** [heading and category output](../../legacy/utexas/DECWAR.FOR#L2935),
[totals and accounting output](../../legacy/utexas/DECWAR.FOR#L3002),
[score labels](../../legacy/utexas/MSG.MAC#L209),
[fixed-point display](../../legacy/utexas/WARMAC.MAC#L1942),
[roster names](../../legacy/utexas/DECWAR.FOR#L489).

## variants.md

- **Direct command responses and movement refusal — SET:** [command selection and prompts](../../legacy/compuserve/fortran%201978/SET.FOR#L27),
[terminal-type retry](../../legacy/compuserve/fortran%201978/SET.FOR#L78).
- **Direct command responses and movement refusal — TELL:** [player output](../../legacy/compuserve/fortran%201978/TELL.FOR#L39),
[body refusal](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L3589),
[line-ending definition](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L51).
- **Population and names:** [population](../../legacy/compuserve/fortran%201978/PARAM.FOR#L25),
[roster names](../../legacy/compuserve/fortran%201978/BLKDAT.FOR#L84),
[USERS roster order](../../legacy/compuserve/fortran%201978/USERS.FOR#L42).
- **Direct command responses and movement refusal:** [token overflow](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L1715),
[feedback prompt and limits](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L4733).
- **Direct command responses and movement refusal:** [command heading](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5100),
[ambiguity list](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5232).
- **Direct command responses and movement refusal:** [section opening](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5128),
[warning macro](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L62).
- **Direct command responses and movement refusal:** [NEWS](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L4658),
[warning expansion](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L59).
- **Direct command responses and movement refusal:** [GRIPE storage warnings](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L4932),
[extension warning](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L4992).
- **Direct command responses and movement refusal:** [CompuServe movement](../../legacy/compuserve/fortran%201978/MOVE.FOR#L120),
[shared command strings](../../legacy/compuserve/fortran%201978/MSG.MAC#L12),
[ordinary shield responses](../../legacy/compuserve/fortran%201978/SHIELD.FOR#L21),
[ordinary phaser responses](../../legacy/compuserve/fortran%201978/PHACON.FOR#L24).
- **Initial preferences:** [initial dialogue and main entry](../../legacy/compuserve/fortran%201978/DECWAR.FOR#L30),
[preference domains](../../legacy/compuserve/fortran%201978/PARAM.FOR#L153),
[TYPE observations](../../legacy/compuserve/fortran%201978/TYPE.FOR#L34).
- **HONORROLL:** [standings source selection and continuation](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5885).
- **HONORROLL:** [startup and pregame dispatch](../../legacy/compuserve/fortran%201978/SETUP.FOR#L126),
[DOCUMENT and HONORROLL actions](../../legacy/compuserve/fortran%201978/SETUP.FOR#L162),
[pregame name table](../../legacy/compuserve/fortran%201978/SETUP.FOR#L505),
[standings reader](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5885).
- **Standings records and placement:** [fatal acquisition reporting](../../legacy/compuserve/fortran%201978/GETCMD.FOR#L105),
[world-end record status and ordering](../../legacy/compuserve/fortran%201978/ENDGAM.FOR#L54),
[QUIT and immediate movement-death departures](../../legacy/compuserve/fortran%201978/DECWAR.FOR#L132),
[common departure record](../../legacy/compuserve/fortran%201978/DECWAR.FOR#L333),
[fatal environment event](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L6106).
- **Standings records and placement:** [record update and ranking](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5694),
[record fields](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5833),
[ten-entry limit](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L231),
[elapsed-time caller](../../legacy/compuserve/fortran%201978/GETCMD.FOR#L114).
- **Honor Roll group observations:** [faction comparison and group display](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5922).
- **Honor Roll headings and interruption boundaries:** [overall heading](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5901),
[group introductions and return checks](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5944),
[column heading and row traversal](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L6002),
[width selection](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L6045),
[conditional line ending](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L2053).
- **Honor Roll row values and spacing:** [row fields and width](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L6020),
[ship prefix and padding](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L2145),
[fixed captain-name output](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L2213),
[numeric field formatting](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L2286),
[date components](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L6077).
- **Commission numbering:** [shared game number](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L457),
[admission ordering](../../legacy/compuserve/fortran%201978/SETUP.FOR#L444),
[numbering, access and reports](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5589).
- **Standings access and write attempts:** [statistics counters](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L687),
[entry and source selection](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5694),
[loss count and notification](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5725),
[earlier-account outcome](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5783),
[record insertion and write paths](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5833).
- **Ctrl-G during command input:** [character classification](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L980),
[input action](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L1897),
[echo action](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L1970),
[echo-on/off behavior](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L1313).
- **Ordinary input echo and output:** [initial echo assumption](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L1165),
[echo operations](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L1313),
[ordinary completion and editing](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L1859),
[character classification and redisplay](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L1927).
- **Romulan speech frequency:** [appearance speech test](../../legacy/compuserve/fortran%201978/ROMDRV.FOR#L64),
[post-weapon speech test](../../legacy/compuserve/fortran%201978/ROMDRV.FOR#L123).
- **Autonomous speech audiences:** [audience and body choices](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L6225),
[autonomous validation and publication](../../legacy/compuserve/fortran%201978/TELL.FOR#L127),
[roster identities](../../legacy/compuserve/fortran%201978/BLKDAT.FOR#L84),
[publication admission retry](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L3560).
- **Direct Romulan replies:** [recipient loop and reply sequence](../../legacy/compuserve/fortran%201978/TELL.FOR#L54),
[filtering and player-body continuation](../../legacy/compuserve/fortran%201978/TELL.FOR#L132),
[direct reply sender and audience](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L6242).
- **Reply body:** [direct openings and composition](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L6251),
[qualifier choice and origin lookup](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L6320),
[origin wording table](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L6349).
- **Relocation after a reply attempt:** [post-reply choice and ordered relocation](../../legacy/compuserve/fortran%201978/TELL.FOR#L93).
- **Waiting and fresh input:** [CompuServe waiting](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L4010),
[fresh input](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L1679),
[input readiness](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L3871),
[entry, selection and scope](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L4468),
[delivery entry](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L3127),
[standings entry](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5589),
[targeted and explicit release-all paths](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L4594).
