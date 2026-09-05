# Port status and completion gates

**Playable alpha available.** `npm start` runs the multiplayer Telnet game with
documented repairs for undefined final-scoring, argument and control-flow paths.
Normal quit, death, disconnect, ship reuse and game-over are exercised end to end.
Exact original-executable parity and complete source understanding remain unfinished.
`--strict` retains the earlier historical diagnostic profile. The user explicitly
prioritized a functioning game on September 5, 2026; see playable-decisions.md.

Current verification: `npm run check` passes the archive/generated-data check,
strict TypeScript checking, and all 4536 behavioral tests. Development tools are
pinned in package-lock.json. These checks do not establish original-executable
equivalence.

Live startup now restores RESET's original 80-column terminal width. Bare SCAN
and SRSCAN display their normal ranges; a startup-to-terminal regression covers
the previously missed single-cell scan. Verification: logs/scan-startup-full-check.log.

Telnet Ctrl-C now wakes a blocked coordinates read, clears queued monitor input,
and responds to every timing-mark request so repeated interrupts do not hide
output. Raw ETX also invokes the source interrupt handler. Verified with isolated
network regressions and the installed Telnet client; full check:
logs/build-interrupt-full-check.log. Existing server processes require restart.

## Evidence levels

- **Inventoried:** file hash, routine/section locations, or extracted tables.
- **Examined:** source paths read and findings recorded; not exhaustive.
- **Ported in isolation:** TypeScript routine with focused source-derived tests.
- **Composed:** routine-to-routine paths execute together with tested output and state effects; this does not imply main-loop integration.
- **Integrated:** wired into all applicable game paths (none claimed yet).
- **Differentially verified:** compared with original execution (none yet).

## Implemented foundation

| Component | Evidence/scope | Remaining |
|---|---|---|
| Source manifest and navigation | 135 distribution files, 25,143 physical lines, 83 FORTRAN declarations | Complete per-routine semantic review |
| HISEG/LOWSEG memory binding | Generated field layouts checked against FORTRAN, independent WARMAC dimensions and linked sizes; caller-owned address spaces, shared high/private low memory, column-major and out-of-range aliases; live player/ship/board/base/planet/score/killed-queue/hit/group/token-word/output views; exact clear spans | Compiled literal encoding, unnamed compiler-local and stack memory, full session and monitor/runtime integration |
| Named private COMMON binding | Fifteen generated views over LOCAL, POLOCL, CHKOUT, DISTLC, FRLOCL, OMLOCL, SNLOCL and TOLOCL; include-scoped types, linked lengths and relocation; live LIST/SCAN/identity overlays, saved-ship and combat/score storage; actual routine compositions | Required logical-word policy and REAL codec, unnamed locals/temporaries/DUMMY, input/stack/register memory, complete session wiring |
| FORTRAN DATA loading | All 12 selected-build statements, 219 words with source/type metadata; explicit 187-word HISEG and 32-word private PRECMD installation; live command/HELP/terminal/device consumers; first-galaxy and subsequent-join SETUP compositions | Required compiler encoding for 169 quoted/Hollerith words, uninitialized loader memory and complete session wiring |
| Data extraction | PARAM, command tables, roster, padded terminal words, device keys, 324 named ASCIZ messages, 27 anonymous statistics strings, nine WARMAC output tables, SCAN's 12-entry OBJTBL, 75 ROMSPK phrase/node strings, 15 GRIPE and 13 HELP/NEWS strings, ten BACKUP bytes and 33 DECWAR literal records | Other BYTE directives/inline text and general FORTRAN literal padding |
| Word arithmetic/packing | Focused word, ASCII, SIXBIT, signed division tests | Compiler overflow policy, full memory/COMMON model |
| Block-memory entries | Raw BLKSET/BLKMOV/LOCF over live arguments and ACs; first-write ordering, aliases, full-word pointer carry, overlap and failure tests; POINTS TOTAL clearing composes BLKSET | Required CPU AOJ/ADD/BLT including flags, empty/wrapped/AC extents, broader caller adoption and full runtime integration |
| Random-number entries | Raw SETRAN/IRAN/RAN./RAN over actual private SEED, live arguments and T0/T1; seed vectors, clock/call suspension and failure ordering; BASPHA/PLNATK→PHAROM seeded integer compositions | Required CPU arithmetic/FSC and monitor MSTIME, public floating result fidelity, broader seed initialization/caller adoption and complete random draw schedules |
| Galaxy cells and distance | Packed board, boundaries, sentinel, raw INGAL/PDIST/LDIS and DISP/DISPC/DISPX/SETDSP with live argument/accumulator/pointer effects; DAMAGE/DOCK compose raw board reads; raw GDSP/SDSP/GPTR and CHKC/CHKD/TRAC, with ESHP/PSHP board compositions | Required CPU arithmetic/byte operations, actual return frames and monitor flush, broader board/diagnostic adoption, debug/APR error path, locks and world integration |
| Numeric/terminal output | ONUM/OFLT core, raw ONUM/sign/radix/OSTB/OSIX/O2DG/O2DB, FORTRAN ODEC/OSDEC/OFLT/OSFLT, raw ODISP/ODEV/OCOND/OTIM/O2D and OCHR; shared OSTR/OSTR.X/OUT, OUTC/OUT2C/OUTW/OUT2W, SKIP/SPACES/TAB/SPACE/CRLF/OCRL with live registers and suspending output; shared accumulator aliases and LOWSEG/HISEG/LOCAL/TMP status bindings, 36-bit HCPOS/BLANK, prompts and component formatters | Required CPU ILDB/LSHC/MOVM/AOBJN/IDIVI, indexed/indirect table and argument addressing, remaining raw formatter/stack routines, full output/session integration and physical monitor behavior |
| FORTRAN output argument/call binding | Static ARGBLK loader/selector, live indexed/indirect ARG accessor, shared public/internal output body registry, composed numeric/status/current-OC paths and CPOPJ/CPOPJ1 boundaries | Actual compiler argument/literal emission, CPU effective addressing/AOS/POPJ, complete call dispatch and session wiring |
| Clocks and waits | Raw DAYTIM/RUNTIM/ETIM, PAUSE/INPUT/CLEAR with actual arguments, live ACs/lock words, HIBER/HALT, INPUT HRLI and saved result; TIME dispatch/output and COMPUTED movement→PAUSE composition | Actual monitor/CPU services, HB.RTC encoding and literal jump targets, compiler expression/temporary policy, broader callers and recharge integration |
| Parser and command input | Raw GTKN/NXTT/SKPB/ANUM over ACs, shared S stack, CBITS/token/scale words; integer/alpha and explicit floating operations, X3 spill, full-word hangup NTOK; raw output, INLI composition, prompted MOVE and slash tails; earlier command/input compositions remain | Production floating/immediate/CPU encoding, monitor/input/file services and literal transfers, full file/monitor/session binding, broader caller adoption |
| Character input and file selection | Raw IC dispatch/ICHR.T and INLI/NXCH/DISP/ECHG over live registers, CBITS and input words; per-character MOVE→GTKN composition, redraw/output suspension and physical aliases; raw ICHR.B/IICH/TTYON/DMPBUF with shared S saves, SETI/CLOSE composition and INI EOF handoff in the same edited line | Actual monitor reads/refills/echo and CPU target transfer, production file open/close and monitor constants, complete sessions |
| Character output and file selection | Live SETO, raw OCHR dispatch/B/T/X with SAVE/RESTOR C and PUSH/POP P,0, required indirect byte/monitor operations; forced-count reset, AC0 preservation, suspension/hangup ordering and shared accounting; INLI/redisplay compose with suspending output | Production OUTPUT/OUTCHR/IDPB/target transfer and opcode/constants, CPU PUSH/POP/underflow continuation, full command-output suspension, file-stack and session integration |
| File open/close working state | Extracted 700-word STABUF-to-PT.MAX span; live OPEN/CLOSE, buffer allocation/rollback, short/long FILOP, PPN/development rewrites, warning order and shared FL.FF; raw NEWS composes OPEN/SETI/ICHR/CLOSE, raw output/page input and shared-stack restoration | Production BLT/FILOP/CORE/GETPPN/CLOSE, monitor constants and job-data words, real SAVE/RESTOR/return stack, complete loader/session integration |
| Runtime descriptors and DECINI | Extracted 135 words for twelve TTY/INI/news/help/gripe/statistics descriptors and exact DECINI prompt; checked channels, protection bytes and SYSPPN; symbol-resolving installer; DECINI/OPEN/SETI/GTKN/IICH/CLOSE and GRPFIL/SETO/OGCH compositions | Required monitor/private symbols, other runtime blocks/loader state, absent BEG/INT/EXP contents; no selected caller found for DECINI, which must not replace FORTRAN startup |
| Compiler-facing runtime initialization | RESET monitor/program-save, setup-presence branch, stack services, interrupt/job words, TTY OPEN/SETO/SETI, edit banner and return; START/RUN failure and KILLOW; composed RESET through actual FORTRAN experience input | Required job/private symbols, real PUSH/POPJ/monitor/HALT/RUN/APR semantics, full loader and session integration |
| Exit and locks | Checked 174-word private lock span; LOCK/UNLO/UNLOCK/ZAPLOK/KILALL with live table/queue words, FNDLOK, busy waits/cancellation and GTKN composition; MONIT ordering, yielding FORTRAN exit and failed-RUN compositions | Actual ENQ/DEQ/ENQC/UCT and grant delivery, diagnostic/stack services, post-FREE literal jump resolution, MONRT and full runtime integration |
| Interrupt and APR entries | CCTRAP/INTH with live I/O flags and FileBlock save area; APRSET/APRTRP capture, replacement stacks and post-GRIPE target; composed terminal input, lock cancellation, packed GRIP.A/GRIPE logging and DECWAR fatal output | Required PUSH/POPJ/BLT/PUSHJ, PC/flags transfer, trap delivery and calling convention; full runtime/logging memory and monitor services; selected CISHNG/grant code is disabled and cannot be silently enabled |
| Line editing | Game-specific buffer/repeat/edit state; corrected Ctrl-G to preserve disabled ECHON/ECHOFF | Monitor control handling, integration with input timing |
| GETCMD | Statement body and PROMPT compose raw PAUSE/INPUT/GTKN, terminal selection/output, ZAPLOK, OUTHIT/OUTMSG, ENDGAM, raw UPDSTA and FREE with live command/state/TX words | Final POINTS continuation, zero-argument CCTRAP compiler binding, production CPU/monitor and complete session integration |
| Main command loop and turn accounting | Statement loop over actual N/PLAYER, all 33 slots and arguments, column-D profiling boundaries, alternate-return skips and live two-label movement policy; raw GETCMD and compound-command compositions; MOVE/IMPULS and REPAIR/DAMAGE reach turn statements over COMMON, automatic repair, stardates and score commits; BASPHA/PLNATK/BASBLD reach raw MAKHIT and GETCMD/OUTHIT; ROMDRV uses PLACE/DIST/ROMSTR/ROMTOR statements and actual D1/D2 | All command handlers composed; production compiler/CPU/monitor/logical/profiling policies and executable session integration |
| DECWAR application entry and fatal path | One-time experience selection, TYPE/SUMMAR ordering, PREGAM/SETUP/APRSET/PLACE → command loop → re-entry; composed startup, first-player creation, TIME/QUIT/FREE and GETCMD death/recommissioning; APR capture → full raw GRIPE/diagnostics → fatal/leave statements with actual locals, raw IRAN/OUT/ETIM/UPDSTA and FREE; final POINTS composition under explicit DO fixture; FRCCHK timer reset | Complete LFZ:LLZ memory and loader, actual trap delivery, production CPU/compiler/logical/literal/monitor services, all runtime/command bindings and executable host |
| QUIT and common leave path | QUIT statements with raw OUT/CLEAR/GTKN/EQUAL, compiler HUNGUP and two-label IF policies; command-tail and transport-input discard; raw GETCMD hangup to confirmation-free exit; actual fatal/leave locals, UPDSTA and FREE; POINTS composition under explicit compiler fixture | Production two-label IF, logical, literal and zero-argument CCTRAP policies, final POINTS and monitor EXIT, full session and trap delivery |
| POINTS | Statement body over actual DFLG/I/POLOCL and score words; raw EQUAL/output, all eight categories and three verbosity levels, current flags/totals/averages, deferred compiler predicates and arithmetic; pre-game/INI/main-dispatch and ENDGAM → POINTS → TOTAL compositions | Final-entry uninitialized DO continuation, compiler logical/evaluation/assignment/literal/loop/divide-trap policies, CPU BLT/monitor and complete session bindings |
| USERS and identity formatting | All six STAT fields, three verbosity modes, physical player order, team divider, privileged PRLOC; composed dispatch → USERS before/after FREE; resumable USERS/PRLOC with raw PDIST and STAT/STAT.X/STAT.Y; shared string/SIXBIT/radix output and OSTS/XFRTMP GRIPE composition | Required LOGICAL/compound-expression/arithmetic policies, compiler I/NUM/TW storage and exceptional DO behavior, CPU/stack/UNDAT/UNTIM services, identity relocation and full session bindings |
| LIST family | All five entry points; driver, LSTSCN, LSTFLG, LSTUPD, LSTOBJ, LSTOUT and LSTSUM; physical traversal, source output, count mutation, closest selection and persistent scan knowledge; composed dispatch → parser → traversal → reports with compiler/runtime fixtures | Literal padding/termination, raw logical and implicit-local contracts, reversed DO bounds, token-boundary and pre-game memory adapters; full session integration |
| SCAN/SRSCAN | Parsing, defaults/width cap, directional/corner scans, WARNING token mutation, knowledge updates; packed SETSCN/MARK, RELOC, O2DB and SHWSCN labels/rows/Ctrl-C; composed dispatch → scan and scan knowledge → LIST | Full LOCAL overlay/session bindings, monitor output/interrupt scheduling, out-of-range memory/instruction execution and compiler arithmetic validation |
| Player storage and lifecycle | Earlier FREE/RSTART, TRCOFF and queue compositions; FREE/KQSRCH/RSTART statements now use actual FRLOCL/private words, individual shared copies/clears, live killed-ring arguments, raw board/clock/locks/BLKSET/JOBSTA and ENDGAM; FREE → RSTART composition; FREE calls TRCOFF statements and raw MAKHIT/GETHIT/GETMSG over physical queues | MONIT continuation; complete HISEG initialization, monitor JOBSTA, lock scheduling and session/rejoin driver |
| ENDGAM | Statement body over live end conditions, raw output, private TX/WHOWON and actual POLOCL totals; sequential identity reads, raw ETIM, composed POINTS with explicit final-loop policy, actual UPDSTA/FREE arguments, raw statistics execution and WHO clear; SET ENDFLG and pre-game/INI composition; earlier FREE cleanup composition; KILHGH instruction body over live registers with original output and required monitor outcomes | KILHGH loader/OPEN/LOOKUP/RENAME and EXIT platform effects, compiler expression/assignment/logical/argument and final POINTS loop policy, statistics monitor services and full session bindings |
| Statistics update and commissioning | Raw UPDSTA/UPDCAP over actual STABUF/ACs/ARG/SAVE stack; extracted descriptors and OPEN/LOCK/UNLO/ODEC composition; live reads, physical aliases, stale insertion word, duplicate identities, killed/mission counters, source file ordering and direct output; GETCMD/ENDGAM → statistics → FREE and commission → statistics compositions | Literal-JRST resolution, CPU/monitor file/DATE/OUTSTR effects, full startup and persistent production storage |
| Statistics display and clearing | Raw SHOSTA/SHOPAY/DOFED/DOEMP/DSPSTA over actual STABUF, ARG, ACs and SAVE stack; raw OPEN/output and DACON expansion, four table paths, live filename selection, gaps, Ctrl-C boundaries and differing header/row width tests; raw UPDSTA → SHOSTA, pre-game HONORROLL and raw STAZAP → GRIPE → SHOSTA → file clearing; live clear counter, retained word zero and failure ordering | Literal/CPU/monitor file/output contracts, production persistence and complete session/privilege bindings |
| GRIPE and supporting routines | Raw interactive entry, diagnostic/statistics selection, ESHP/PSHP composed with raw internal board writes, GRIP.A/OCT.O/OGCH and GRIP.2–8; shared-runtime GRIPE/OSTS/STAT.Y/INLI/OSTR/OSTR.X/OCRL/OGCH/GRPFIL/OPEN/old-file prepend/CLOSE/TTY SETO; actual COMMON/JOBSTA identity and raw SHOSTA; pre-game GRIPE/*ZAP and earlier APR capture/packed logging | Required alert-literal target, CPU pointer and monitor UNDAT/UNTIM behavior, CORE/BLT/file-stack contracts, full APR/session adoption and production storage |
| HELP and NEWS | HELP/HLPXTR/HLPALL/SHLP, SLST/OLST and NEWS byte readers; raw NEWS over live registers/shared S, OPEN/SETI, buffered ICHR, OCHR, TTYON, raw GTKN/EQUAL and CLOSE; dispatch and complete supplied NEWS across refills; raw SLST/OLST/HLPALL/HLPXTR over shared registers/stack and source tables; raw outer HELP with token/alert checks, ESHP/PSHP→SDSP, terminal GTKN and dispatch; all 38 topics match supplied help through this command | Production CPU/monitor/file behavior, OPEN stack/return effects, literal alert transfer, broader HELP/list callers and full pre-game/session bindings |
| DEBUG and profiling | TIMSRC/TIMIN/TIMOUT timer search and updates, 250-word TIMERS window and separate local timers; DEBUG raw privilege, direct output, exact extracted header, DEBDEC/DEBOCT; composed both dispatches and ROMDRV profiling | Full surrounding memory and register/stack bindings, loader initialization, column-D compilation/literals and actual monitor UCT/output |
| Job identity | Raw JOBSTA/USRPRJ with live arguments/registers, octal speed table, separate PPN calls, privilege words, direct name input and ASCII/SIXBIT conversion; PREGAM composes actual LOCAL writes and shared terminal input | Actual monitor calls/skip and echo behavior, CPU byte operations including zero-pointer retry, literal continuation, private symbol relocation and complete session binding |
| Pre-game driver | PREGAM and XGTCMD, all sixteen dispatch slots, initial HELP/HONORROLL paths, aliased JOBSTA identity; XGTCMD statement body over CMD/I/PRECMD, raw prompt/output/INPUT/GTKN/EQUAL, all sixteen command matches, terminal/INI and raw HELP dispatch; outer PREGAM statements over LOCAL/N, raw initial prompts, HELP/NEWS/summaries and XGTCMD, all source dispatch branches; earlier SHOSTA/TIME/PASWRD compositions | Production JOBSTA monitor/CPU services and symbol relocation, remaining routine bindings, full startup/SETUP integration, compiler DO/logical/assignment/literal and call policies, zero-argument TYPE and monitor/session services |
| Re-entry and creation cancellation | KILCHK with actual killed queue, clock rereads, first-wait unit mismatch and extracted BACKUP bytes; CC1/CC2 counter ordering composed with rejected password | Live CCTRAP, lock/exit services, raw logical contract and complete SETUP/session binding |
| SETUP and PLACE | Earlier SETUP driver covers capacity/locks, options, world placement, returning players, commissioning and initialization. New PLACE statement body uses actual arguments/locals with raw IRAN/DISP/DISPC/LDIS/SETDSP; connected to main ROMDRV spawn, appearance and attack | Actual-word SETUP prefix/admission now composed through main STATUS; production literal/REAL/compiler/monitor policies and host integration remain |
| Message queue and OUTMSG | Packed link header/entries, reservation/publication/search/removal, full-queue eviction, MAKMSG string and raw-line paths, GETMSG, persistent OMLOCL output; full 36-bit counter loop; raw MAKMSG/GETMSG, SRCH/SRCH.X, REMV/REMV.X, RSRV/QRSRV and UPDT/QUPDT with actual return-word skips, separate locks, full-queue eviction and BLT; shared memory-backed headers/links/payloads and live BITS; cross-job delivery, FREE cleanup and GRIPE compositions | Broader command-caller adoption; production QUELOK/CPU/return-transfer policies, compiled NAMES word, complete session memory and pre-reservation Ctrl-C stale-register removal |
| TELL and ROMSPK | Destination input, ordered filtering, repeat behavior, radio/gag changes, Romulan relocation; original packed speech, all node/phrase tables and RNG schedule; real human/Romulan queue→OUTMSG and broadcast→GETHIT/OUTHIT compositions | Live GETLIN, compiled literal/raw logical services, complete LOWSEG scratch/HISEG memory and session bindings |
| Hit queue | Forty sender-owned slots each, serial/overwrite behavior, physical-order retrieval, counter/register mutations, four-word layout; shared memory binding, retained serial/payload on reset, live BITS and physical array aliases; DBITS cleared before full-word counter loop; raw SETQH/SETQM initialization; JOBSTA uses shared JSQTAB; raw MAKHIT/GETHIT with live registers, required CPU/POINT services, exact illegal-hit diagnostics and FREE/TRCOFF integration | Oldest-slot literal continuation, POINT operand/assembler confirmation, full session integration and instruction interleavings |
| OUTHIT | Statement body covers all fifteen event types over live words, raw BLKSET/GETHIT and terminal formatters plus PRLOC; raw MAKHIT→OUTHIT→GETCMD compositions and three-verbosity byte fixtures; critical/destruction/displacement/radio and negative-count paths | Broader combat caller adoption, production compiler/CPU/POINT/literal/monitor policies and original-executable verification |
| SHIELD | Ported; composed raising with actual tractor release and hit queue after energy charge | Complete session binding and original overflow/trap validation |
| TRACTR and TRCOFF | Full command parsing/validation and paired beam state; shared by-reference release; composed dispatch, GTKN, hit queue/OUTHIT/GETCMD, SHIELD and FREE; source BITS(0)/TRSTAT(0) and aliased-IP paths exposed; TRCOFF statements over actual addresses feed FREE cleanup | Zero-argument TRACTR writable IP convention, full surrounding memory, remaining combat producers and complete session binding |
| LOCATE and RELOC | Resumable actual argument/local/return words, absolute/relative/computed input, token-field writes and backward expansion; raw EQUAL/INGAL/DISP/OUT and computed PAUSE through MOVE, partial errors and compiler policy seams | Production REAL/compiler/DO policies, full input/call-frame and monitor binding, full sessions and original execution validation |
| CHECK and CHKPNT | Resumable statements over actual arguments, compiler locals and linked CHKOUT; both dominant axes, strict integer hundredths, ordered candidate checks/RAN, collision reread and galaxy exits; raw INGAL/DISP and CHECK→TORDAM→JUMP compositions; earlier movement components remain | Required REAL/RAN and integer intrinsic semantics, compiler operand/conversion/DO policy, broader movement/weapon/Romulan caller adoption, actual instructions/call frames and full sessions |
| MOVE and IMPULS | Resumable COMMON/local statements, live LOCATE/CHECK, raw locks/board/clocks/output and computed PAUSE, full requested-distance charges, towing conversion mismatch and partial failures; normal/alternate/death dispatch composition | Production numeric/compiler/RNG/monitor services, full input binding, complete sessions and original execution validation |
| PHACON | Full driver, input/validation, bank waiting, overheating, planet/Romulan hits, scoring and announcements; actual LOCATE, PRIDIS, PHAROM, PHADAM/PWR, hit queue/OUTHIT and dispatch compositions | Production real/compiler/monitor services and full session bindings |
| TORP | Full burst driver, physical TOLOCL storage, target reuse, misfires, deflection, ammunition and recharge; actual LOCATE/CHECK, TORDAM, TOROM, JUMP, TRCOFF, SNOVA/NOVA, PLNRMV, queues/OUTHIT and dispatch compositions | Production real/RAN/compiler/literal/monitor services, complete COMMON memory and session bindings |
| DIST, ROMSTR and ROMTOR | DIST/ROMSTR statements use actual locals, physical DISTLC and raw board/BLKSET/PDIST/IRAN. ROMTOR statements compose actual CHECK, TORDAM/JUMP/BASKIL, TRCOFF, target selection, SNOVA/NOVA/PLNRMV, raw locks and hit output; misfire order, retargeting, shared direction aliases and recharge paths tested | Production arithmetic/compiler/monitor services and full sessions |
| ROMDRV main entry | Earlier component compositions cover spawn/movement/weapons/speech/defenses. Statement body uses actual locals, D1/D2 and CHKOUT; shared main fixture composes PLACE/DIST/ROMSTR/ROMTOR, CHECK, damage, raw board/PRIDIS/MAKHIT, clocks and extra defenses; strict deadlines and live references tested | Column-D compiler/profiling, production arithmetic/compiler/monitor services, full sessions |
| BASPHA, PLNATK and BASBLD | Full component base/planet defense and base-repair drivers; team/target order, population division, distinct ship/Romulan power, owner scoring and recipients; PHADAM/PWR/PHAROM/PRIDIS/hit/turn compositions; resumable BASBLD, BASPHA and PLNATK over actual COMMON and compiler-local words in the new turn path, preserving divisions, damage/score/recipient order and live reads; both attacking defenses compose raw board/distance, resumable PRIDIS/PHAROM/PHADAM, raw PWR and raw MAKHIT/GETHIT/OUTHIT in the main turn path; shared integer SEED for PHAROM, critical hits and neutral selection; PLNATK retains compound random evaluation and distinct ship/Romulan power/order | Production REAL/RAN/arithmetic/compiler/CPU/monitor services, broader caller and full session bindings |
| BUILD and CAPTUR | Complete command drivers with source acquisition, score/lock/timing order, construction/conversion and ownership/defense paths; actual LOCATE, BASKIL, PLNRMV/ENDGAM, PHADAM, PRIDIS, queue/output, dispatch and automatic REPAIR/turn accounting compositions | Production literal/compiler/arithmetic/monitor services, full COMMON memory and session binding |
| PRIDIS | Resumable statements over actual arguments, LI/LJ/I and shared DBITS/BITS/ALIVE/SHPCON; raw LDIS with suspending calls; source numeric ALIVE test, team halves, clearing, full-word bits and aliases; BASPHA uses this path before hit delivery | Required compiler LOGICAL/OR/assignment/DO policies, actual CPU/call frames, broader caller adoption and full session integration |
| TORDAM/PHADAM and PWR | Distinct entry guards, shields/deflection, critical device/base branches, source conversion and scoring order, JUMP/BASKIL cleanup; phaser/torpedo commands, base/planet defenses, CAPTUR, ROMTOR and queue/output compositions; raw PWR/PWR. preserve argument/register/shared-stack effects and the assembly power tree; resumable TORDAM/PHADAM statements use actual arguments, COMMON and five REAL/one integer local words; defense fixtures await raw PWR and SETDSP with explicit rational handles | Required CPU IDIVI/FMPR and resolved 1.0 operand, real/RAN and compiler policies, broader caller adoption, full queue runtime composition, actual call frames and full sessions |
| PHAROM/TOROM/DEADRO | Resumable statements over actual PHIT/ID and shared hit/energy/position words; source integer expression trees, argument aliases and ordered death flags; BASPHA/PLNATK await raw SETDSP; earlier PHACON/TORP compositions remain | Required compiler arithmetic/evaluation/assignment/literal policy, actual RNG/CPU/call frames, broader caller adoption and complete monitor/session binding |
| JUMP and BASKIL | Resumable statements over actual arguments, COMMON and persistent locals; CHKOUT physical REAL aliases, separate board writes, black-hole state and NUMCAP branch; new damage path awaits raw INGAL/PDIST/LDIS/DISPC/SETDSP; resumable CHECK writes the same CHKOUT words | Required numeric/conversion/DO/logical and CPU services, broader caller adoption, actual return frames, monitor/session integration |
| SNOVA and NOVA | Earlier TORP component composition; statement bodies now use actual locals and physical CHKOUT/SNLOCL in main ROMTOR, with raw board/IRAN/PRIDIS/MAKHIT/OUTHIT, JUMP, TRCOFF, BASKIL, PLNRMV and ENDGAM; LIFO order, aliases, cap, damage/scoring and transfer paths tested | Production REAL/compiler/CPU/monitor services, remaining callers and full session bindings |
| PLNRMV | Statement body over actual I/PTEAM/J; raw BLKMOV and board-code decrement, BASKIL and ENDGAM; connected to main ROMTOR with compaction before notification and game-end transfer before unlock/recharge; aliases and partial copies tested | Complete BLT exception/compiler behavior, remaining callers and session/monitor bindings |
| ENERGY | Input/retry flow, source validation order, scaled requests, recipient cap, integer donor cost, shared hit-register writes; composed GTKN tail → ENERGY → MAKHIT → GETHIT/OUTHIT and dispatch | Required PDP-10 INT(IHITA*0.9) arithmetic service, raw ALIVE interpretation, full session bindings and original execution validation |
| REPAIR and DAMAGE | Resumable REPAIR → DAMAGE → raw final clock; exact three-verbosity report fixtures, mode/ALL and saved-local behavior; dispatch → resumable automatic repair → turn accounting after REPAIR and DOCK; DAMAGE over COMMON/token/device words with raw EQUAL/DISP and shared output | Compiler local/literal/call bindings, LOGICAL/arithmetic/evaluation/assignment/DO policy, required CPU/monitor services, broader caller and complete session integration |
| DOCK and STATUS | Resumable DOCK → STATUS with raw DISP/DISPC/LDIS/clocks/EQUAL and shared output; all supplier scans, double hull repair, current fields and token rewriting; dispatch normal/alternate return, automatic repair and turn accounting; STATUS preserves separate radio-mask reads and PRLOC/OCOND/numeric output | Compiler locals/literals/temporaries, LOGICAL/arithmetic/evaluation/assignment/DO policies, required CPU/monitor services and call frames, broader caller and complete session bindings |
| TYPE | Statement body over actual KIND/P and live settings/options; raw GTKN/EQUAL, OUT/OUT2W/CRLF, physical TTYDAT and index-zero alias; suspended output, separate option rereads, pre-game/INI/main-dispatch compositions; earlier SET → TYPE composition | Zero-argument pre-game calling convention, compiler two-label IF/logical/assignment/comparison/literal and argument evaluation policy, production CPU/monitor and session integration |
| SET and USRNAM | SET statements over actual P/I/J, live settings and TTYDAT, raw GTKN/EQUAL/output, independent assignments and terminal partial results; privileged options and BHREMV through raw DISPC/SETDSP; raw USRNAM over ACs/PTRLST/LINBUF/CBITS/TMP/JOB, WHO=0 physical aliases and tail discard; SET ENDFLG → ENDGAM statements; pre-game/main-dispatch/INI, PASWRD → SET → TYPE compositions | Compiler logical/NOT/assignment/literal/DO and call policy, CPU IDPB/DMOVE and production monitor/JOB services, ENDGAM downstream runtime bindings and complete sessions |
| RADIO and PASWRD | Shared radio mask versus session gag mask; tested RADIO → STATUS composition; PASWRD statements over actual PASFLG/token words, raw EQUAL and saved-project USRPRJ; repeated project expressions, failure output and JOBSTA/PREGAM/INI/main-dispatch compositions | Compiler assignment/comparison/logical/compound-expression and literal/call policy, production saved-project binding, full galaxy/session integration |
| Telnet codec | Streaming encode/decode, refusal, interrupts, fragmentation | Listener/session lifecycle, echo negotiation, historical boundary decision |

The tests are source-derived specifications, not captured PDP-10 transcripts.
No percentage-complete claim is made from counts of files, routines, or tests.

## All game command slots

Order and spellings originate in BLKDAT.FOR. The dispatch is DECWAR.FOR.
"Pending" includes source study, implementation, and integration as needed.

| Slot | Command | Entry | Status |
|---:|---|---|---|
| 1 | BAses | BASES (LIST) | Ported; composed through dispatch with compiler/runtime fixtures |
| 2 | BUild | BUILD | Full driver ported; composed LOCATE, BASKIL, PLNRMV/ENDGAM, output and dispatch; production runtime/session bindings required |
| 3 | Capture | CAPTUR | Full driver ported; composed LOCATE, BASKIL, PHADAM, queue/output, dispatch, automatic repair and turn scores; production runtime/session bindings required |
| 4 | DAmages | DAMAGE | Statement body connected to shared main dispatch and REPAIR report path |
| 5 | DOck | DOCK | Connected to shared main dispatch, STATUS, automatic repair and turn accounting |
| 6 | Energy | ENERGY | Ported with required floating conversion; composed with dispatch, GTKN and hit notification |
| 7 | Gripe | GRIPE (WARMAC) | Raw driver, ship helpers, buffer/dump and transfer/cleanup; composed GRIPE/INLI/OGCH/OPEN/CLOSE plus component dispatch/STAZAP paths; monitor/literal/runtime services remain required |
| 8 | Help | HELP (WARMAC) | Raw alert/token/ship path composes list/file/output bodies, raw terminal input and dispatch; all 38 public topics checked |
| 9 | Impulse | IMPULS (MOVE) | Ported with LOCATE/CHECK; composed through movement driver and dispatch; arithmetic/runtime bindings required |
| 10 | List | LIST | Ported; composed through dispatch with compiler/runtime fixtures |
| 11 | Move | MOVE | Ported with LOCATE/CHECK; composed through dispatch, packed board and towing; arithmetic/runtime bindings required |
| 12 | News | NEWS (WARMAC) | Raw register/shared-stack body composed with file input, raw output/editor/GTKN/EQUAL and dispatch; entire archive file checked across refills |
| 13 | PHasers | PHACON | Driver and all target damage paths ported; composed with PHADAM/PWR, scoring, queue/output and dispatch; production arithmetic/runtime/session bindings required |
| 14 | PLanets | PLANET (LIST) | Ported; composed through dispatch with compiler/runtime fixtures |
| 15 | POints | POINTS | In-game command/report ported and composed with turn scores/dispatch; final and pre-game compiler adapters required |
| 16 | Quit | Main program confirmation/cleanup | Ported; composed with dispatcher and FREE; final scoring/monitor services required |
| 17 | RAdio | RADIO | Statement body composed with raw GTKN/EQUAL/output and untimed dispatch; live mask/name/bit words and prompted/slash input tested |
| 18 | REpair | REPAIR | Ported; composed with DAMAGE |
| 19 | SCan | SCAN | Ported; composed with screen routines, dispatch and later LIST visibility |
| 20 | SEt | SET | Ported; composed with TYPE and USRNAM; ENDGAM/JOB hooks required |
| 21 | SHields | SHIELD | Actual-word body connected to shared main input/output and raw tractor release |
| 22 | SRscan | SRSCAN (SCAN) | Ported through shared SCAN body with source defaults |
| 23 | STatus | STATUS | Statement body connected to shared main dispatch; earlier DOCK composition |
| 24 | SUmmary | SUMMAR (LIST) | Ported; composed through dispatch with compiler/runtime fixtures |
| 25 | TArgets | TARGET (LIST) | Ported; composed through dispatch with compiler/runtime fixtures |
| 26 | TEll | TELL | Statement body composes raw GTKN/EQUAL/output, MAKMSG/GETMSG, ROMSPK/RMCOPY/RMGPLY, IRAN and board access; production GETLIN/CPU/literal and delivery/session integration required |
| 27 | TIme | TIME | Shared main/pre-game binding with raw clocks/output and required monitor outcomes |
| 28 | TOrpedos | TORP | Full driver and all collision branches ported; composed damage, explosions, burst effects, queue/output and dispatch; production arithmetic/runtime/session bindings required |
| 29 | TRactor | TRACTR | Ported with TRCOFF; composed through dispatch, hit queue, SHIELD and FREE; zero-argument IP writes require compiler binding |
| 30 | TYpe | TYPE | Explicit-argument calls ported; zero-argument call unresolved |
| 31 | Users | USERS | Ported with STAT; composed with dispatch and FREE; compiler/monitor bindings required |
| 32 | *Debug | DEBUG (WARMAC) | Ported with TIMIN/TIMOUT/TIMSRC and DEBDEC/DEBOCT; composed game/pre-game dispatch and ROMDRV profiling; full memory/compiler/monitor binding required |
| 33 | *Password | PASWRD | Ported with supplied monitor project identity |

Pre-game's PREGAM/XGTCMD driver and sixteen-slot dispatch are ported, including
the distinction between an unknown command and a game command unavailable in
pre-game. Tests compose existing HELP, honor-roll, TIME and password routines.
All other calls remain explicit dependencies; zero-argument TYPE, compiled
literal bytes, live monitor services and full SETUP/session binding are pending.

## Latest completed goal round

D-133 connects DOCK/STATUS and SHIELD in the shared main runtime. The preceding
4164-test checkpoint passed; eight DOCK and eighteen SHIELD tests bring the full
archive/type/test check to 4190. DOCK reuses the existing statement body, shared
STATUS, raw distance/board/clocks and automatic turn path. SHIELD now has an
actual-word statement body with shared GTKN/EQUAL/output and TRCOFF.

Tests preserve supplier accumulation, double hull repair, alternate returns,
negative post-report pause, inline/prompted shield input, scaling/truncation,
confirmation, repeated shield raising, critical thresholds and partial failures.
No fidelity requirement changed. Numeric/compiler/monitor policies remain
explicit test fixtures. Next: ENERGY and other remaining main command slots.

Full startup/SETUP, executable sessions, persistence, multiplayer, Telnet and
original-executable differential verification remain unfinished. Detailed ongoing
work and retained command outputs are recorded in ../WORK_LOG.md and ../logs/.

## Work sequence

The user approved prioritizing executable milestones. The fidelity contract and
release gates below remain in force. These are planned milestones, not completed
capabilities; a development harness with declared policies is not a parity release.

1. **Complete the shared command/turn composition.** The main SNOVA/NOVA
   dependency is closed in D-131; enumerate and bind every remaining command slot in the same
   runtime. Reuse existing ports and compositions. Exit evidence: no placeholder
   game-routine dependencies on the exercised startup/command/turn/leave paths;
   unresolved platform services are separately identified.
2. **Run one complete local session.** Assemble runtime code outside test fixtures,
   connect startup/PREGAM/SETUP to the command loop and cleanup, and provide a
   development entry point. Explicitly document and implement each necessary host
   adapter or report the exact unresolved source contract. Exercise commissioning,
   commands, combat, scoring and quit through one input/output stream.
3. **Run shared-world sessions and persistence.** Bind locks, clocks, waits,
   notifications and statistics storage. Exercise two players, pending input,
   disconnect, death, rejoin and endgame under controlled event schedules.
4. **Connect and verify Telnet sessions.** Specify the transport/monitor boundary,
   connect the existing codec to a listener and exercise the complete command set,
   negotiation, editing and terminal bytes through actual connections.
5. **Close the fidelity release gates.** Finish the semantic audit, numeric and
   compiler contracts, and source-derived regression scenarios. Compare against
   original execution where available; do not claim equivalence without evidence.

Each coding round should close a named dependency for one of these milestones.
Expand compatibility machinery only when it supports that dependency or fixes an
observable fidelity issue. Prefer Astra medium for ordinary implementation and
integration, with high reserved for difficult source interpretation and debugging;
this documentation does not change the app's reasoning setting.

## First playable release gates

- Every linked routine has a completed source trace or a documented platform
  replacement; no silently stubbed commands or approximate combat.
- Every deviation records its source reason and effect on observable behavior.
- All 33 game and 16 pre-game commands, abbreviation collisions, argument
  errors, prompts, repeats, and compound input paths are exercised.
- Original bytes include spaces, trailing padding, CR/LF, control characters,
  all verbosity settings, and the supported terminal scan sequences.
- Seeded scenarios preserve all draws and intermediate arithmetic, including
  conversion/truncation points and negative values.
- Queue saturation, locks, interruption, input waits, pauses, recharge,
  asynchronous notifications, and player lifecycle are tested with a clock and
  explicit event schedules.
- All unresolved items in compatibility.md are resolved or clearly identified
  as accepted limits. Full historical equivalence cannot be claimed while
  required monitor/compiler behavior has no reference.

## D-134 — ENERGY joins the main command composition

ENERGY now uses actual shared ship/token/local words, loaded NAMES/BITS, raw
LDIS and MAKHIT, and original output. Sixteen main-loop scenarios cover transfer
loss, capacity/truncation, prompted input, recipient rejection, notification and
partial output failure. The explicit rational REAL test policy is not a verified
PDP-10 floating-point implementation. Full playable-session gates remain open.

## D-135 — USERS joins game and pregame composition

USERS now shares original STAT output, live JOB/ALIVE fields and PRLOC with
the command runtime. All verbosity modes retain all six identity fields;
privileged users receive location output. Six additional scenarios pass.

## D-136 — TRACTR joins the main command composition

Beam attachment, both-player notifications and shared TRCOFF release now execute
from the main loop. Seventeen scenarios include TRACTOR followed by SHIELD UP.
The omitted IP argument remains an explicit required compiler binding on release
paths; no address is silently invented. Full check passes 4,229 tests.

## D-137 — SCAN and SRSCAN join the main composition

Both scan commands now use actual token/local words, packed shared LOCAL screen,
board byte pointers, warning marks and original output. Eighteen scenarios cover
map bytes, bounds, width, cloaking, knowledge updates and row-boundary Ctrl-C.
Full check passes 4,247 tests. Ten main command slots remain unbound: BASES,
BUILD, CAPTUR, LIST, PHACON, PLANET, SUMMAR, TARGET, TORP and DEBUG.

## D-138 — BUILD joins the main composition

BUILD now fortifies captured planets and converts the fifth build into an actual
shared base using original PLNRMV, locks, score and board updates. Eleven tests
include BUILD followed by DOCK. Full check passes 4,258 tests; nine command
slots remain unbound (CAPTUR, five list/report entries, two weapons and DEBUG).

## D-139 — CAPTUR joins the main composition

CAPTURE now changes ownership, charges fortification costs, invokes actual PHADAM,
queues notifications and scores through the shared main turn. Thirteen scenarios
include capture death, former-owner combat credit and CAPTURE followed by BUILD.
Full check passes 4,271 tests. Remaining main gaps: five list/report entries,
PHACON, TORP and DEBUG. Full playable-session and Telnet gates remain open.

## D-140 — Player phasers join the main composition

PHACON now executes targeting, two-bank recharge, shield-control costs, mixed
REAL overheating and actual ship/base/planet/Romulan damage and notifications.
Fifteen scenarios pass; full check passes 4,286 tests. Remaining main gaps:
BASES, LIST, PLANET, SUMMAR, TARGET, TORP and DEBUG.

## D-141 — Player torpedoes join the main composition

TORP now runs bursts through actual CHECK, TORDAM/TOROM, planet removal and
SNOVA/NOVA, with shared ammunition, tractor release, queues and recharge.
Nineteen scenarios pass; full check passes 4,305 tests. Remaining command gaps
are the five object-list entries and DEBUG (the latter is being verified).

## D-142 — Privileged DEBUG joins the main composition

*DEBUG now reads actual shared timer words and uses original raw monitor output
and return-word digit formatting. Five scenarios pass; full check passes 4,310
tests. Only BASES, LIST, PLANET, SUMMAR and TARGET remain unbound in main.
Timer initialization and synthetic PUSHJ/monitor behavior are explicit fixture
policies; production timers and compiler/platform contracts remain open.

## D-143 — All five object report entries join main

BASES, LIST, PLANET, SUMMAR and TARGET now share actual LOCAL words and
COMMON state through LSTSCN/LSTFLG/LSTUPD/LSTOUT/LSTOBJ/LSTSUM. Nineteen
main-loop scenarios cover visibility, discovery, summary-only hidden objects,
closest selection, coordinates, groups, original output and the implicit SHIP
typo policy. Full check passes 4,329 tests. All main command dispatch entries
now have composition bindings. This is still a test composition, not a playable
server: startup/SETUP, session lifetime, production platform and numeric
contracts, persistence and Telnet integration remain open.

## D-144 — Ship admission reaches placement and main STATUS

SETUP label 1400 through RETURN now uses actual LOCAL identity words, shared
killed records, counts, ship selection, UPDCAP statistics, JOBSTA and ship
initialization. Actual CC1/CC2 stores and unlock/exit ordering are composed.
Fourteen scenarios cover returning ships, reassignment, defection, refusal,
partial failure, radio groups and original slowest-terminal behavior. Admission
then APRSET/PLACE then main STATUS executes in the shared fixture. Full check
passes 4,343 tests. The SETUP prefix (capacity, locking and world generation)
still needs actual-word adoption; no continuous production session is claimed.

Next-phase recommendation: High for reviewing executable numeric/machine
contracts and extracting the runtime from fixture composition. Combat rational
REAL fixtures and raw RAN's required FSC operation must become one explicitly
documented runtime policy before claiming faithful playable behavior. Higher
reasoning cannot supply compiler/CPU evidence missing from the archive.

## D-145 through D-147 — Seeded startup-to-gameplay composition

A shared session random service now advances the original private SEED for
RAN and IRAN. Tests demonstrate deterministic main PHASERS without scheduled
combat draws; FSC still uses an explicitly chosen rational test policy.
SETUP now covers capacity, locking, options, complete galaxy generation and
admission, followed by APRSET and PLACE. Actual-word application entry clears
LOWSEG once, preserves original experience selection, TYPE/SUMMAR ordering,
pregame and command-loop re-entry. Fixed an actual-address/value mismatch in
startup and main TYPE calls. Full check passes 4,367 tests.

End-to-end fresh-game QUIT exposes final POINTS entering an uninitialized DO
continuation and dividing by zero ship/turn counts. Tests preserve these cases;
no invented zero averages or suppressed runtime diagnostics were added.
The user authorized CPU/compiler manuals only to resolve these platform
semantics. DECWAR logic remains sourced exclusively from old_source.


## D-148–D-149: documented machine arithmetic and DO policy

User-authorized CPU/compiler references are recorded in platform-manuals.md and
platform-manuals.json. No external DECWAR implementation evidence was used.
RAN now has a real 36-bit floating-word codec for its FSC domain. Session PWR
executes the original assembly multiplication tree with normalized FMPR rounding,
wrapped-exponent flags and required fault delivery. A PHADAM test consumes its
result across the explicitly retained rational arithmetic boundary.

Initialized POINTS loops now select the documented FORTRAN V5 independent
trip-counter policy. Index aliasing no longer prematurely shortens reporting.
Undefined final entry and compiler/monitor divide-check handling remain open;
the archive supplies neither a compiler version nor generated POINTS code.
Full check passes 4,412 tests. These advances do not expose a playable server.


## D-150–D-151: native math in startup, phasers and decimal input

A selected native numeric service now supplies rounded normalized floating
add/subtract/multiply/divide, FLTR/FIX, original PWR and real RAN words. Tests
exercise full galaxy creation with black holes and main PHASERS damage, energy
charging and queued notifications. Decimal GTKN input follows original unrounded
FDV/FAD and rounded FMPRI instructions; input 1.25 retains its one-bit difference
from nearest literal conversion. No JavaScript floating point substitutes here.

Full check passes 4,450 tests (logs/decwar-d151-check.log). Native integration
selects source-order/rounded-single compiler behavior explicitly, with required
literal and fault policies; this is not proof of the unidentified archived
compiler's choices. Signed unrounded overflow paths, unnormalized CPU operands,
undefined final POINTS entry, complete monitor/session/persistence bindings and
a runnable Telnet server remain unfinished. Older rational tests are retained as
statement-order tests, not renamed as native CPU tests.


## D-152–D-154 — Live Telnet sessions, shared galaxy and locks

The byte-oriented session driver and real TCP/Telnet listener now run experience
selection, full galaxy creation, ship admission and STATUS through the composed
source runtime. Two connected captains share HISEG, timers and hit/message queues;
the second join preserves the existing galaxy and first captain's score. Private
LOWSEG, registers, source locals and random SEED stay separate.

A host resource coordinator now supplies ENQ/DEQ/ENQC outcomes, pending-request
cancellation and ownership release on job teardown. Tests drive actual LOCK and
UNLO through busy waits and grant delivery. FIFO ordering and a grant callback
are explicit modern choices: the archive's HAVENQ handler is commented out.
Grant during the initial 100 ms wait still leaves the following source 5000 ms
wait; the host does not remove that control-flow quirk. UCT at three ticks per
second is inferred from the source's 4*3/about-four-seconds comment, not verified
monitor behavior. See decisions.md for the host boundary and fixture policies.

Full check: 4,469 passing tests, logs/decwar-d154-check.log. The live game factory
still uses test fixture services and synthetic addresses. Normal QUIT/hangup
cleanup, final POINTS compiler behavior, production storage and a release entry
point remain open. Test success establishes the exercised paths, not original
executable or historical Telnet equivalence.


## D-155–D-156 — Standalone development host and live commands

`npm run dev:telnet` now launches a localhost development listener with a host
lifecycle/error log. Its child-process test connects, creates a galaxy, admits
a captain, executes STATUS and verifies clean signal shutdown. See running.md
for use and the remaining fixture policies. It is not the faithful release.

Live TIME now reads current time and session CPU accounting rather than a copied
scheduled clock callback. Admission shares that CPU baseline. Live tests execute
TIME, shield changes and MOVE through real byte input, source lock/unlock and
end-of-turn accounting. Selected V5 logical/two-label movement behavior is bound.
A disconnect test reaches the source leave path and records the unresolved final
POINTS continuation before any FREE; it does not fabricate ship release.

Full verification passes 4,474 tests: logs/decwar-d156-check.log. Next runtime gap:
statistics storage must be shared between captains and persist source words
across host restarts; current per-fixture buffers are insufficient.


## D-157 — Persistent source statistics

Live statistics now use a shared word store. The standalone host persists
DECWAR.STA/DECWAF.STA data as exact 36-bit words in a documented modern container.
Source OPEN, UPDCAP, UPDSTA, SHOSTA and STAZAP stay in control of calculations and
transfers. A fresh world reopens existing files and increments both game serial
and ship commission count; two live captains preserve their separate counts.
Corrupt files stop admission without being overwritten. A data-directory owner
prevents two hosts from bypassing the in-process source locks.

The live DATE word now encodes the UTC calendar by inverting source DACON; its
existing year adjustment/formatting is unchanged. Full verification passes 4,485
tests: logs/decwar-d157-check.log. Statistics persistence does not resolve final
POINTS cleanup. GRIPE/file services, remaining compiler and monitor bindings,
fixture extraction and original-executable parity are still incomplete.


## D-158–D-159 — GRIPE persistence and live private allocation

GRIPE now uses shared/disk word files, preserving exact old words after the new
report. Live tests cover busy-file retry, empty EOF, unchanged turn count, ship
restoration and subsequent STATUS. Job teardown releases exclusive file owners.

A separate live private CORE window now grows/shrinks in 512-word pages, replacing
the fixed report-test heap. A 12,000-word old report is retained through source
read/prepend/output and pages are released afterward. A file exceeding the host
window takes the original CORE warning/cleanup path without overwriting data.
Loader base/limit and zero-fill are explicit host policies. GRIPE header date/time
strings and several other compiler/monitor bindings remain fixture selections.

Full check passes 4,492 tests: logs/decwar-d159-check.log. The release still needs
final POINTS semantics, complete session interrupt/exit services, remaining
platform bindings and original-executable parity. The development host is useful
for exercising current paths, not a declaration that those gates are closed.


## D-160 — Live source exits and interrupts

MONIT now completes through a host MONRT transfer. Pregame and partial-admission
disconnect/interrupt paths release their source reservations, with CC2 preserving
NUMSHP as written. Telnet IP executes INTH and the selected CC1/CC2 handlers. An
active interrupt reaches QUIT confirmation; NO returns to STATUS. Active-ship
exit still requires the unresolved final POINTS continuation. Opaque return
tokens and synthetic trap addresses remain explicit host selections.

Full check passes 4,503 tests: logs/decwar-d160-check.log.


## D-161 — CLRBUF returns through live INTH

Admission's installed CLRBUF now emits the original four bells, clears pending
input and returns with all accumulators/stack restored. Its direct statement
port and live interrupt test pass; full verification passes 4,505 tests at
logs/decwar-d161-check.log. This closes that missing handler binding without
resolving active-game final scoring or exact monitor PCs.


## D-162 — Sustained multiplayer command checks

Two captains exchange TELL messages and honor RADIO OFF/ON through shared queues.
A controlled live opposing-ship PHASERS encounter checks native arithmetic/RNG,
scaled energy cost, enemy shield loss, shared OUTHIT output and turn accounting.
SCAN, SRSCAN, USERS and LIST FRIENDLY run in one session; LIST now receives the
already selected V5 true-first IF policy. Full check passes 4,508 tests at
logs/decwar-d162-check.log. Autonomous Romulan paths are the next live check.


## D-163 — Live autonomous Romulan and torpedo paths

Fixed ROMDRV's persistent CHECK zero literal, which retained a rational-test
handle after native arithmetic was installed. Successive source MOVE turns now
create and move the Romulan with native CHECK. Opposing live captains also fire
a torpedo through TORDAM and receive the shared OUTHIT report. Full check passes
4,509 tests at logs/decwar-d163-check.log.


## D-164 — Interactive captain identity

The development Telnet entry now enables original JOBSTA name input instead of
using PLAYER for everyone. Name conversion/caching, USERS, saved GRIPE identity
and raw-name interrupt/EOF cancellation are exercised. EOF-to-CCFLG and no
added monitor echo remain explicit host choices. The complete check passes
4,512 tests at logs/decwar-d164-check.log.


## D-165 — Live planet and tractor gameplay

Live CAPTURE→BUILD→DOCK→POINTS checks ownership, fortification, replenishment,
1,500 earned points and three turns. Two friendly captains establish a tractor
beam and release it through SHIELD UP, including both source notifications.
BASES, PLANETS and TARGETS are also exercised. Full verification passes 4,514
tests at logs/decwar-d165-check.log; final scoring and explicit omitted-argument/
uninitialized-local failures remain unresolved.

## D-166 — Full-galaxy rollover

Eleven real Telnet connections fill both fleets and trigger original
KILHGH→START→RUN into game #2. Existing captains continue in game #1. Worlds
share source-keyed monitor locks and persistent statistics/GRIPE services.
The loader and successful RUN transfer are explicit modern host selections.
Full verification passes 4,519 tests at logs/decwar-d166-final-check.log.

## D-167 — Terminal output scheduling

The live terminal yields after each emitted character, allowing interrupts
during output. A source SCAN interrupted in its first data row completes that
row, clears CCFLG and accepts the next command. Tests now wait for actual input
or idle-command boundaries before making assertions about subsequent source
effects. An already-hung-up GETCMD loop now cooperates with other sessions and
forced shutdown without inventing source cleanup. Original instruction/baud timing
is still unverified. Full verification passes 4,522 tests at
logs/decwar-d167-final-check.log.

## D-168 — Live archive HELP

The live standard HELP reader now loads actual DECWAR.HLP instead of sample
fixture text; NEWS retains its existing DECWAR.NWS binding. Multiple topics,
reopening, privileged fallback, ship restoration and no turn charge pass a
focused live check. Full verification passes 4,523 tests at
logs/decwar-d168-check.log.

## D-169 — Playable alpha

The default launcher now enables documented playable repairs; `--strict` keeps
the earlier diagnostic behavior. Quit, output-time disconnect, actual phaser
death, final statistics, active tractor release, ship reuse and endgame/new-game
all execute through original routines. Real Telnet clients exercise the complete
join/message/score/quit/rejoin flow. See playable-decisions.md and running.md.
Final verification passes 4,530 tests at logs/decwar-playable-final-check.log.
