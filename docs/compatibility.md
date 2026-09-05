# Compatibility findings and unresolved dependencies

This record began with the CompuServe archive and retains development
checkpoints. Unqualified source filenames and line numbers refer to that archive
unless an entry identifies Austin. Earlier integration gaps and proposed policies
describe their checkpoint, not the current release. See [current status](status.md),
[architecture](architecture.md), [playable repairs](playable-decisions.md) and the
[Austin implementation ledger](austin-implementation.md) for delivered behavior
and remaining limits. Numbered decisions and source evidence remain preserved.

The original findings below concern `legacy/compuserve/fortran 1978`. "Preserved" below means
implemented in a focused module and tested from source-derived expectations;
it does not mean compared against a running PDP-10 executable.

## Findings already represented in the foundation

| Finding | Evidence | Treatment |
|---|---|---|
| HELP's PHASERS example names Buzzard, absent from the selected roster | DECWAR.HLP:915–917; BLKDAT.FOR:84–94 | Keep HELP unchanged and accept the actual DATA roster (Cobra, Demon, Hawk, Jackal, Wolf for Empire); live admission test uses Cobra |
| Internal version 24 differs from displayed version 2.3 | DECWAR.FOR:31; MSG.MAC:65 | Keep both; banner extracted unchanged |
| Only five token characters are retained on ordinary integer/alpha paths | WARMAC.MAC:1749-1777 | Preserve; numeric value still processes remaining digits |
| EQUAL checks at most five characters, returns -2 exact / -1 prefix / 0 no match | WARMAC.MAC:4350-4402 | Preserve; no minimum abbreviation inferred from capitalization |
| EQUAL's first case-fold operates on T0, not C | WARMAC.MAC:4386-4391 | Preserve asymmetric direct calls; GTKN folds input beforehand |
| Input folds all character codes above octal 137 by subtracting octal 40 | WARMAC.MAC:1759-1762 | Preserve punctuation effects, not Unicode uppercasing |
| `/` ends a command; `;` discards the rest of the physical line | WARMAC character table and NXTT. | Preserve, including comma-produced null tokens |
| KMAXTK=15 includes the EOL slot | WARMAC.MAC:1699-1732 | Test 14 data tokens and overflow; termination position matters |
| Naked signs are null-type tokens, not numeric zero or an automatic syntax error | ANUM. sign and GTKN type selection | Preserve |
| Game editor differs from GETLIN.MAC | CAN1.CMD; WARMAC.MAC:1849-1972 | Use game editor: ESC repeat, Ctrl-H/DEL erase, Ctrl-U clear, Ctrl-R redisplay; Ctrl-G calls disabled echo routines |
| ECHON and ECHOFF immediately return before their OPEN and ECHFLG writes | WARMAC.MAC:1312-1329 | Ctrl-G is consumed without toggling echo; corrected the earlier port which had followed unreachable code/comments |
| ESC repeats only as the first nonignored character | WARMAC INLI. | Preserve; backspace before ESC prevents replay |
| Input auto-completes at 80 characters | WARMAC.MAC:576, 1880-1892 | Preserve; subsequent bytes start the next line |
| CRLF routine suppresses additional blank lines | WARMAC.MAC:2044-2063 | Preserve HCPOS/BLANK, distinct from unconditional SKIP |
| Tab cursor bookkeeping masks with octal `^-37` after adding octal 10 | WARMAC.MAC:1619-1625 | Preserve literal calculation; physical monitor cursor behavior unresolved |
| OFLT loses the minus sign on -0.x; OSFLT prints -0.0 for zero | WARMAC.MAC:2349-2381 | Preserve; short output truncates rather than rounds |
| Positive output width overflows to stars, retaining a sign | WARMAC ONUM. | Preserve including width one producing only a sign |
| Galaxy uses packed 12-bit cells and -1 sentinel | WARMAC DISP/SETDSP | Preserve packed representation |
| DISPX uses MOVEI for remainder | WARMAC.MAC:5366-5369 | Preserve 18-bit masking rather than returning a negative JS remainder |
| RNG multiplies by 260543, clears sign, divides by 257 | WARMAC.MAC:2746-2753 | Preserve integer recurrence, session-local seed, and IRAN masking |
| Informative prompt thresholds are inclusive | PROMPT.FOR:43-49 | Preserve life, shield, damage, energy order |
| Raising shields at exactly KCRIT is allowed and costs energy again if already raised | SHIELD.FOR:81-90 | Preserve executable GT test and unconditional charge |
| Shield transfer can lose fractional strength through integer division | SHIELD.FOR:53-75 | Preserve operation order and truncation |
| Negative REPAIR can increase device damage | REPAIR.FOR:45-65 | Preserve; do not silently add validation absent from source |
| REPAIR timing includes time spent outputting optional DAMAGE | REPAIR.FOR:58-69 | Expose finish after caller performs report |
| Automatic REPAIR returns without assigning PTIME | REPAIR.FOR:65 | Return no pause assignment; retain preceding command's delay |
| OCHR emits seven bits but maintains cursor state using the original register/right half | WARMAC.MAC:1599-1628 | Raw character output retains that distinction, including non-ASCII O2D register values |
| ODISP uses short symbols for medium output too | WARMAC.MAC:2393-2454 | Extract separate short/long tables; preserve negative and out-of-class fallback to empty space |
| ODEV names include trailing spaces | WARMAC.MAC:2464-2502 | Extract all three tables, retain spaces before DAMAGE's extra spacing |
| PRLOC suppresses relative coordinates at own location in free format | PRLOC.FOR:41-51 | Preserve even when that emits no coordinate text; fixed-width zero offsets still print |
| DAMAGE accepts prefixes of the two-character DEVICE keys, not necessarily full device names | DAMAGE.FOR:41-57; BLKDAT DEVICE DATA | One switch can print multiple devices, including undamaged ones; unknown alpha switches print no error |
| Full STATUS rewrites TKNLST/TYPLST, not VALLST or NTOK | STATUS.FOR:49-60 | Mutate token text/type, preserve numeric values; session driver must retain independent NTOK |
| DOCK's failure output has two spaces between ship symbol and `not adjacent` | DOCK.FOR:53-55; ODISP space flag; MSG dock01 | Preserve both spaces |
| DOCK accumulates all adjacent bases/planets and repairs hull twice if already docked | DOCK.FOR:35-72 | Composed resource-update and STATUS tests; do not select just one docking target |
| DOCK returns normally even when final PTIME is nonpositive | DOCK.FOR:77-81 | Preserve difference from REPAIR's alternate return |
| TYPE's terminal output uses both padded words | TYPE.FOR:88-90; BLKDAT TTYDAT | Extract raw words and print all ten characters |
| ETIM uses strict half-day comparisons and only one correction in each direction | WARMAC.MAC:3990-3997 | Exact boundaries and beyond-one-day inputs tested; no general modulo normalization |
| OTIM does not constrain hours to two decimal digits | WARMAC.MAC:2110-2130 | Preserve two-character O2D result (`:0` at 100 hours) and MOVEI masking for negative components |
| TIME reads RUNTIM twice in a game report | TIME.FOR:37-43 | Preserve call order instead of caching one runtime sample |
| GTKN retains token backing storage beyond NTOK; its final EOL write does not assign PTRLST | WARMAC.MAC:1670-1732 | Preserve scanned writes, stale slots, and raw offsets, including overflow writes before NTOK becomes zero |
| SET silently accepts an unknown alphabetic setting value without changing the setting | SET.FOR | Preserve distinction from nonalphabetic input, which prompts again |
| SET TTYTYPE clears the index before searching and retains the first match on ambiguity | SET.FOR terminal-selection branch | Preserve index after a blank abort, including zero after no match |
| SET BHREMV removes every class-10 board cell without changing BLHOPT | SET.FOR privileged branches | Preserve separate flag and board effects; ENDFLG requires ENDGAM execution |
| USRNAM uses the physical line and skips exactly one delimiter after the preceding token | WARMAC.MAC:4063-4102 | Preserve extra spaces, commas, tabs, twelve-character SIXBIT packing, and command-tail discard on every return |
| RADIO resolves ON before OFF and separates shared NOMSG from local GAGMSG | RADIO.FOR:35-84 | Preserve `RADIO O` resolution, silent self-target handling, and absence of alive/device checks |
| PASWRD accepts exact EQUAL=-2 only and restricts monitor project numbers | PASWRD.FOR:29-40 | Preserve the four octal projects and short failure output without an added newline |
| PRGNAM and CHKSEQ immediately return; GETCMD's DSHIP call is commented out | WARMAC.MAC:3675-3677,4051-4052; GETCMD.FOR:65 | Do not invent program-name changes or automatic inactive-ship removal |
| PAUSE caps positive waits at 10000 ms and repeats early wakes at 1000 ms | WARMAC.MAC:4010-4051 | Read the by-reference duration in source order; INPUT does not use this cap |
| PAUSE compares raw MSTIME against its deadline without midnight correction | WARMAC.MAC:4025-4043 | A deadline beyond the largest daily clock value can cause indefinite one-second rewaits; preserve instead of substituting ETIM |
| INPUT checks command tail and INI before waiting, then reclaims its saved lock before checking readiness | WARMAC.MAC:3873-3900 | Keep source ordering and distinguish timeout, pending bytes, hangup and CCFLG; a wake is not proof of input |
| UNLO. does not clear LOCKED; UNLOCK does | WARMAC.MAC:4594-4645 | Keep remembered lock key separate from actual lock ownership; PAUSE/INPUT/GTKN explicitly reacquire |
| GTKN returns immediately on preexisting hangup, but writes QUIT/EOL after hangup during a line read | WARMAC.MAC:1670-1732 | Distinct mutations: early return retains all memory; later path retains first VALLST and PTRLST while storing full AOJA X1 in NTOK (-3670015 for KMAXTK=15); see D-089 |
| CLEAR discards the command tail without clearing LINBUF or token slots | WARMAC.MAC:3904-3910 | Preserve raw-line/repeat state; skip monitor input clear on hangup |
| GETCMD reports hits then messages before the prior command's delay | GETCMD.FOR:33-43 | Preserve two TTYON calls and reset PTIME only after PAUSE returns; password flag bypasses PAUSE |
| GETCMD low energy overwrites even RED with YELLOW and emits four BEL bytes | GETCMD.FOR:47-50 | Preserve inclusive 10000 threshold, damage-before-energy death tests and literal octal output word |
| GETCMD's timeout path alone resets COMKNT at 30*NUMPLY | GETCMD.FOR:57-79 | Input-ready increments do not perform this threshold reset; counter and ACTIVE are shared |
| GETCMD forces QUIT by replacing first token text/type only | GETCMD.FOR:75-90 | Retain NTOK, numeric value, pointer and remaining tokens; Ctrl-C in RED instead emits the explicit-QUIT instruction and clears input |
| Already-set CCFLG/HUNGUP at GETCMD label 200 bypasses INPUT and enters label 210 | GETCMD.FOR:57-73 | Preserve notification/endgame loop rather than silently forcing QUIT at this earlier branch |
| GETCMD snapshots death identity and elapsed time before POINTS, then updates statistics and frees the ship | GETCMD.FOR:108-124 | Use captured identity, final TOTAL(1), reason zero and team-minus-one; set WHO=0 after FREE |
| Messages use a 32-entry linked queue; hits use 40 slots for each of 10 senders | WARMAC.MAC:242-246,3028-3292,3330-3351 | Preserve two separate algorithms; MAKHIT does not call the general queue manager |
| Full message queue removes the lowest set recipient bit of its oldest entry from every entry | WARMAC.MAC:3133-3154 | Repeat until a free slot exists; do not just drop the oldest message or decrement MSGFLG |
| Queue reservation and publication unlock separately; search unlocks before payload copy/removal | WARMAC.MAC:3117-3288,3629-3652 | Keep reserved entries unavailable and preserve the separate lock boundaries; actual ENQ and races remain unresolved |
| SETQM/SETQH reset links, retaining payloads and counters; SETQH also retains HITSER | WARMAC.MAC:3036-3050 | Do not zero the complete queue object on reinitialization |
| MAKMSG accepts at least two input characters and retains at most 75 text bytes | WARMAC.MAC:3570-3588 | Counter increments before storing; CR overwrites last stored byte, then LF/NUL follow; continue reading through EOL even after truncation |
| MAKMSG's no-argument path searches the entire raw line for its first semicolon | WARMAC.MAC:3548-3559 | Preserve everything after that semicolon; slash and semicolon are message text, not command separators; otherwise prompt with `Msg: ` and call INLI directly |
| MAKMSG clears DBITS after sending/cancelling but retains DISPFR | WARMAC.MAC:3536-3537,3604-3606 | Zero-recipient early return takes no lock and leaves registers alone |
| GETMSG returns original recipients from payload header, not remaining linked recipients | WARMAC.MAC:3638-3652 | Each receiver sees the original destination list; last removal releases the link |
| GETMSG on missing entry or failed search resets count/metadata but leaves the output buffer untouched | WARMAC.MAC:3621-3635 | Preserve stale OMLOCL: an evicted or unavailable message can cause OUTMSG to emit the previous buffer once |
| OUTMSG clears DISPFR/DBITS every iteration, gags player messages, and does not recheck NOMSG or radio damage | OUTMSG.FOR:32-61 | TELL filters destinations; system messages bypass gag; recipient symbols retain leading spaces and OUTMSG adds CRLF after the message's own CRLF |
| MAKHIT overwrites the oldest serial in the sender's forty slots if none is empty | WARMAC.MAC:3331-3351 | Keep first-free scan and strict serial comparison; serial occupies an eighteen-bit halfword, and old recipients' HITFLG is not decremented |
| GETHIT scans physical slots from zero, rather than selecting the oldest serial | WARMAC.MAC:3467-3475 | A newly overwritten low slot can be read before older high slots; different senders' slot positions affect delivery order |
| GETHIT decrements HITFLG before searching and does not reset a negative count or missing-entry count | WARMAC.MAC:3447-3475 | Keep distinction from GETMSG; failed retrieval clears sixteen hit fields but retains DBITS |
| GETHIT returns remaining recipients before clearing the requesting player's bit | WARMAC.MAC:3518-3523 | Unlike message headers, later hit receivers see fewer recipient bits |
| Hit shield conditions use only one stored bit after a positive-value test | WARMAC.MAC:3394-3400,3504-3511 | Canonical +1/-1 round-trip; positive even values also decode as -1; preserve unused low bits of the fourth payload word |
| OUTHIT clears all seventeen LOWSEG hit words before checking the queue count | OUTHIT.FOR:39-43; LOWSEG COMMON order | Include DBITS, even on an empty queue; invalid event types loop back to the same clear |
| OUTHIT treats only zero HITFLG as empty | OUTHIT.FOR:40; WARMAC.MAC:3447-3465 | Preserve distinction from FREE's positive-count drain; a negative count repeatedly calls GETHIT rather than being repaired |
| Short output routes torpedo deflection through the ordinary torpedo-hit text | OUTHIT.FOR:93-98 | Keep hit magnitude and `T` in short output; medium/long use dedicated deflection messages |
| OUTHIT prints planet strength as an unscaled integer suffix | OUTHIT.FOR:54-58,139-143 | Parenthesize only in long output; omit zero; do not display it as a shield percentage |
| OUTHIT displays attacker shields for Romulan class too, but omits its coordinate comma | OUTHIT.FOR:60-70 | Preserve the different strict/non-strict class comparisons and OSFLT negative zero |
| Numeric hit magnitude is omitted for targets above Romulan class | OUTHIT.FOR:103-124 | Preserve nova versus weapon wording separately from the quantity test |
| Long hit output wraps before the target only if HCPOS is greater than 40 and target class is below Romulan | OUTHIT.FOR:134-137 | Test exact column boundary; do not apply a general terminal-width wrapper |
| Target coordinates use SHORT PRLOC after OUTHIT emits its own prefix | OUTHIT.FOR:145-163 | Preserve `>`, `-->`, long displacement wording, and a lone `@` when relative own-location output is suppressed |
| Critical device damage is shown only to the surviving target ship | OUTHIT.FOR:157-178 | Preserve device-name padding, double spaces in short mode, and long ` units` suffix |
| Critical base text distinguishes successful emergency shields from destruction | OUTHIT.FOR:176-202 | Preserve multiline messages, trailing spaces before CRLF, black-hole wording, and separate DESTROYED output |
| Base broadcasts use a strict radio damage greater-than test | OUTHIT.FOR:235-239 | Exactly KCRIT still receives broadcasts, unlike TELL's greater-than-or-equal filter; NOMSG gates only these event types |
| OUTHIT appends object/message spacing literally | OUTHIT.FOR:258-286; MSG.MAC:180-216 | Preserve doubled spaces in energy transfers and short/medium Romulan detection, trailing receiver space, and embedded CRLF in long tractor messages |

## Additional source discrepancies requiring care

- CHKPNT's executable strict threshold differs from its prose. Floating
  multiplication and INT occur before the comparison; decimal inequalities
  alone do not define it (`CHKPNT.FOR:34`).
- PLACE compares a planet's DISPC to `pteam` (1 or 2), although planet classes
  are 6, 7, 8. Do not silently substitute `pteam+6` (`PLACE.FOR:44-47`).
- SETUP's slowest-terminal loop tests `alive(who)` while reading `job(i,...)`,
  so it does not simply filter inactive entries by i (`SETUP.FOR:477-482`).
- Some pre-game calls use fewer arguments than their usual counterparts
  (`CALL TYPE` in SETUP versus `CALL TYPE(0)` in DECWAR). FORLIB calling behavior
  needs investigation; do not invent default arguments globally.
- GETCMD's zero-argument CCTRAP call reaches assembly that reads argument zero
  as a trap address (`WARMAC.MAC:4120-4123`). Its explicit CCFLG clear is
  preserved, but the effective trap address requires the calling convention.
  A required adapter handles this call; no null/default address is inferred.
- The hit codec follows the explicit four-word field layout at
  `WARMAC.MAC:3321-3326` and its matching POINT descriptors. The descriptors
  contain decimal-looking field positions (including `28`) despite the
  surrounding general RADIX 8 setting. The field layout and OUT2C's consecutive
  character positions support this interpretation; the supplied archive has
  no assembler with which to verify operand parsing. Tests prove the stated
  layout, not assembled instruction equivalence. Do not reinterpret these
  positions through a blanket octal conversion or claim this question resolved.
- MAKMSG's direct-INLI Ctrl-C path jumps to `mmsg.5` before RSRV assigns a
  slot (`WARMAC.MAC:3556-3559,3589-3595`), yet calls REMV with stale X2.
  The interactive wrapper requires an explicit cancellation adapter for that
  unresolved register/address behavior. It does not silently free a new slot.
  The ordinary short-message path cancels an actual unlinked reservation;
  its incidental AC0 left-half clobber is not represented as caller-visible
  CPU state by the current subroutine API.
- FREE skips only positive ALIVE and does not repeat that check after a lock
  retry. It records KILQUE before clearing JOB, saves all ten SHPCON words and
  nine device words, then clears only position and energy in live SHPCON.
  Queue drains run only for positive counts; the final clear covers all
  seventeen hit registers (`FREE.FOR:38-95`). These behaviors are ported and
  composed with the actual queues. Its last-player retention deadline adds
  300000 to raw daytime without midnight correction.
- KQSRCH matches the first physical job/project pair; its terminal/time branch
  is commented out. A match updates job, project and terminal without changing
  time or team/ship data (`KQSRCH.FOR:32-54`). FREE reuses that record or advances
  the ten-record ring, then writes its remaining fields (`FREE.FOR:54-65`).
- RSTART tests the requested slot and saved board position before acquiring
  the lock and does not repeat those tests on lock retry. A negative board
  sentinel passes the occupancy test. Restoration writes the saved TSHIP
  number to the board, even if the requested slot differs. JOBSTA's second and
  third arguments alias one DUMMY word (`FREE.FOR:102-146`). Tests preserve
  these paths; actual monitor JOBSTA remains required.
- TRCOFF clears both tractor links before MAKHit and sets only DBITS and
  IWHAT=14, retaining the other hit registers (`TRACTR.FOR:126-132`). The entry
  is ported and composed with FREE; the main tractor command remains pending.
- ENDGAM may print both victory messages when both base counts are zero.
  Total destruction sets ENDFLG=-2 and makes everyone lose; otherwise equal
  base counts select Federation as winner. It snapshots identity before
  POINTS, writes statistics before FREE, then clears WHO and exits
  (`ENDGAM.FOR:35-74`). Output and cleanup are tested together; scoring,
  full statistics composition and monitor/high-segment services remain required.
- UPDSTA's first threshold reads argument 6, which all three callers supply
  as elapsed milliseconds, despite its comment claiming to reject small
  scores. Exactly 1000 passes. It sorts scores descending, then inserts equal
  scores only when the new elapsed time is strictly greater than the old one
  (`WARMAC.MAC:5696-5698,5770-5778`; `DECWAR.FOR:340-347`,
  `GETCMD.FOR:114-120`, `ENDGAM.FOR:65-70`). The port follows instructions.
- UPDSTA treats a zero PPN as an empty record before comparing scores. It
  suppresses a new placement only if the same PPN already appears above it;
  lower duplicates survive. A suppressed placement or failed ranking still
  saves the killed counter for reason zero. The separate memorial-list
  selection is commented out (`WARMAC.MAC:5725-5789,5830-5879`).
- Statistics records are ten words within a 640-word buffer. Insertion writes
  words 0–7 and 9 but leaves word 8 unchanged at the insertion position. Word
  9 combines the low eighteen bits of the reason and mission count. Ship
  indices are added to STACAP/STAKIL bases, so the first counters are at words
  513 and 523, not 512 and 522 (`WARMAC.MAC:676-692,5830-5860`).
- Statistics OUTSTR instructions bypass OCHR's HCPOS/BLANK bookkeeping.
  Numeric ODEC calls use the current character-output dispatch; OUTPUT TTY
  explicitly flushes that channel. The ports expose these as separate required
  services. UPDCAP's initial game-number OUTSTR is unguarded even when HUNGUP
  is set, and its final newline is commented out (`WARMAC.MAC:5639-5670`).
- UPDSTA skips the free-file read after a failed normal-file open; when it does
  read the free file, it clears the normal data first. UPDCAP's free-player
  branch instead continues intermediate OUTPUT/CLOSE and INPUT/CLOSE operations
  after failed opens, using the resulting LE.PPN sign to gate INPUT. The final
  write-open failure skips writing but still unlocks and announces the in-memory
  commission count (`WARMAC.MAC:5608-5638,5708-5724,5860-5882`). These branches
  are tested as monitor-operation sequences, not claims about real file errors.
- POINTS(DFLG=true) jumps from line 31 to label 500 inside the DO loop whose
  initialization is at line 42. It then reaches the loop terminator at line 60.
  This cannot silently be replaced with “select all, then render”: generated
  loop-control state and any retained local index need the original compiler
  contract. Ordinary ALL input enters through the initialized loop. This new
  dependency is recorded. The in-game POINTS parser and report are now ported;
  final entry requires a compiler adapter that supplies the continuation after
  label 600. Tests exercise explicit possible continuations, not a chosen
  historical result (`POINTS.FOR:28-63`).
- POINTS pre-game row selection mentions SCORE(i,WHO) even though IFLG is
  false and WHO is zero. Whether the compiled expression reads that address,
  skips it or traps requires compiler/memory behavior. The report requires an
  explicit pre-game access adapter; it does not treat an out-of-range modern
  array read as zero (`POINTS.FOR:96-100`).
- POINTS uses NTOK only to choose default versus switch parsing. Once parsing,
  it scans backing slots 2 through 15 until a nonalphabetic token. An unknown
  alphabetic switch aborts even after ALL; ROMOPT can remove the only selected
  column and cause the same abort (`POINTS.FOR:30-68`). POLOCL totals reset on
  entry, but OWIDTH is assigned only for reports with a team/Romulan column.
- POINTS suppresses categories whose selected columns are all zero, prints
  source padding and embedded CRLF literally, and rereads scores for addition
  after printing them. Averages perform signed integer division before OFLT's
  tenths formatting; there is no protection against selected zero divisors
  (`POINTS.FOR:96-197`). Tests retain partial report output before internal
  divide failure. The eventual FORLIB/monitor trap path is still unresolved;
  the exception is not a new game error message or an accepted wire behavior.
- SHOSTA reads without locking, clearing STABUF or testing LE.PPN. Only the
  first record of each of its four lists gates the report, and living-list
  head scores determine which side prints first. Ties favor Federation, even
  when only memorial lists are populated. Free-player continuation depends
  on the actual returned LE.NAM being SIXBIT DECWAF, not just the requested
  file (`WARMAC.MAC:5885-5943`). These paths are ported.
- DSPSTA scans all ten physical records, skipping empty entries. CCFLG is
  checked on entry, not between rows. A Ctrl-C after one side's living table
  suppresses that side's memorial, but the other side's heading can still
  print before its DSPSTA entry rejects output. SHOSTA clears CCFLG only when
  it reaches SHOCKP; failed OPEN returns without clearing it
  (`WARMAC.MAC:5933-5943,5945-6004,6092-6102`).
- DSPSTA prints the extended header only for a nonpositive argument, but a
  positive argument forces extended rows. Nonpositive row arguments instead
  require TERWID >= 80. The six combinations of argument sign and widths
  79/80 are tested (`WARMAC.MAC:6010-6022,6053-6059`). No attempt is made to
  align the inconsistent header and row predicates.
- DSPSTA adds octal 500 (decimal 320) before dividing credits by decimal
  1000; runtime adds decimal 30000 before dividing by 60000. OSTBX stops at
  a space or NUL and its padding loop emits nine total characters after early
  termination, although ten nonterminating characters pass through. DACON's
  year is relative to 2000; O2DG masks negative remainders with MOVEI and can
  therefore emit control characters for older dates (`WARMAC.MAC:34-44,
  2145-2189,6048-6051,6064-6090`). The port preserves these bytes.
- STAZAP locks STABUF rather than STAUPD, sets ADDRCK and calls GRIPE before
  clearing. Its loop clears words 639 down to 1, preserving whatever GRIPE
  left in word zero. A failed open skips remaining writes but still unlocks,
  prints Finished, and clears ADDRCK. Its direct output has no HUNGUP guard
  (`WARMAC.MAC:6184-6225`). The port requires GRIPE and file services; tests
  do not represent real file deletion or a connected pre-game command.
- DECWAR's command loop sets PLAYER true before every GETCMD and returns to
  pre-game when GETCMD clears WHO. Build, capture, dock, impulse, move and
  repair receive automatic REPAIR(3) after normal returns; phasers and torpedoes
  enter turn accounting directly. All eight alternate-return paths bypass the
  turn sequence. Out-of-range computed-GOTO indices fall through to BASES
  (`DECWAR.FOR:86-250`). Dispatch and selected routine compositions are tested;
  most command implementations and complete session bindings remain pending.
- DOTIME increments and resets before BASPHA → PLNATK → BASBLD → optional
  ROMDRV. ROMOPT is read after base rebuilding. The source then increments
  ship/team stardates, handles critical life support and commits all eight
  TPOINT entries, even if damage has just reached KENDAM. There is no added
  alive check or PLAYER reset in this tail (`DECWAR.FOR:254-289`). Zero reserves
  are not fatal until they become negative; docked ships retain reserves but
  still test an already negative value.
- QUIT prints its prompt, clears CCFLG, discards input and then calls GTKN.
  It matches YES prefixes using token text without testing token type. An
  existing HUNGUP skips confirmation; a hangup during GTKN does not add an
  acceptance branch. Common cleanup snapshots identity and elapsed time before
  POINTS, chooses reason -1 unless ADDRCK is set, updates statistics, frees the
  ship, clears WHO and exits (`DECWAR.FOR:163-169,334-351`). These paths are
  ported; final scoring and monitor behavior remain required.
- MOVE/IMPULS normal returns use the two-label `IF (.NOT.ALIVE(who)) 3810,3400`
  form. The main-loop port requires an explicit compiler-branch adapter rather
  than coercing ALIVE's signed word to a JavaScript Boolean. CALL TRACTR also
  omits the declared IP argument; its OFF branches assign IP. That zero-argument
  convention must be resolved when binding the tractor command
  (`DECWAR.FOR:143,153,233`; `TRACTR.FOR:29,39,53,126-131`).
- TYPE can read TTYDAT at index zero after an invalid SET TTYTYPE selection
  followed by an empty response. HISEG declares XHELP immediately before
  TTYDAT, each with two words per entry. Under that declared contiguous,
  column-major layout, the read aliases the final XHELP pair, `PRega` and
  `me   `. The port emits those extracted words and tests the declaration
  adjacency. This is a source-layout inference; bounds-checking/compiler
  behavior has not been verified against an original execution.
- USRNAM computes its JOB destination from WHO, including pre-game WHO=0.
  The packed name algorithm is ported, but the storage callback must account
  for that out-of-row address before pre-game integration. No synthetic user
  identity or corrected row is substituted.
- TYPE's two-target tests select the short scan branch for SCNFLG=-1 and the
  long branch for SCNFLG=+1. The port uses the sign for the defined flag domain,
  consistent with PARAM/SETUP/TYPE. This is a scoped source inference, not proof
  of general compiler logical-expression semantics. The Boolean DOCKED used
  by the current ship model likewise represents canonical 0/-1 states only;
  the OCOND primitive separately preserves its raw negative-word test.
- Multiple statements separated by semicolons need actual compiler parsing.
  For example, `IF (...) ib=2 ; ie=ib` in BASBLD cannot be translated by assuming
  both assignments belong to the IF.
- `ALIVE` contains vacant and occupied representations distinguishable by
  signed comparisons. Other flags use -1, 0, positive values, and even -2.
- KWAIT is zero in this supplied source, despite the retained countdown code.
- The active source enables tournament and galaxy-option prompts through
  commented-out jumps. Do not reactivate old defaults from comments.

- USERS prints all six identity fields in every verbosity mode; the smaller
  field-count branches are commented out. It emits the team separator before
  testing slot six's ALIVE value, even with no active captains. Privileged
  coordinates always call PRLOC with SHORT and width two
  (`USERS.FOR:35-55`). ALIVE remains a required compiler adapter.
- STAT reads the live JOB words, uses SIXBIT for the terminal identity, and
  pads the programmer number with max(0, 5 - octal digit count) spaces. Its
  job field has width three; STAT.Y uses width two and the extracted Pre-game
  label (`WARMAC.MAC:2603-2708`). STAT.Y receives a raw X4 counter. The pending
  OSTS caller's `MOVNI X4,-100` must retain effective-address width before
  negation; ordinary double negation is not an instruction translation
  (`WARMAC.MAC:2565`). Tests supply an explicit 18-bit-address fixture;
  assembled OSTS execution has not been verified.
- LSTUPD permits an unseen distant object in a whole-game summary by jumping
  directly to label 500, bypassing both requested range and closest selection.
  It removes LSTBIT only after updating TXF. Repeated selections increment the
  count again, and equal-distance closest matches replace earlier coordinates.
  Mutable arguments preserve DUMMY aliasing and mask/increment/OR order
  (`LSTUPD.FOR:31-64`). The selection helper, parser/driver, traversal and
  renderers are now ported and composed with explicit compiler/runtime fixtures.
- LSTSCN tests ship names before keywords: `LIST S` selects Savannah, while
  shorter keyword prefixes otherwise select the first matching branch. The
  lone-command automatic-summary assignment is commented out. `AND` prefixes
  and `&` terminate a group; a first empty group is allowed, later empty groups
  are errors (`LSTSCN.FOR:31-137`). Input scanning uses persistent token slots
  rather than NTOK. These source rules are now ported.
- LSTSCN accumulates named ships in SHIPS but its duplicate test reads the
  distinct implicit local SHIP, which has no assignment in this routine or
  declaration in its includes (`LSTSCN.FOR:151-157`). The port requires an
  explicit read adapter, preserving the preceding NAMBIT assignment and not
  substituting SHIPS. Tests demonstrate repeated names with an explicit zero
  fixture; they do not establish the original local's initial value.
- LSTSCN's coordinate predicate can access TYPLST(16) at P=15; bounds checking
  occurs after the later pointer increment. The compiler's predicate evaluation
  and out-of-bounds memory require an adapter. If it identifies a coordinate,
  the source writes VPOS/HPOS from VALLST(P/P+1), increments P, then returns
  before coordinate validation (`LSTSCN.FOR:94-98,191-202`). The port retains
  that sequence through explicit services. It adds no terminal error for the
  unresolved path.
- LIST clears exactly LSTFZ through LSTLZ, 108 words including both markers;
  subsequent group/traversal fields survive the reset. LSTSCN alternate return
  aborts the whole command, while LSTFLG alternate return resumes group scanning
  without incrementing N. A later syntax error suppresses deferred LSTOUT but
  leaves prior selection words intact (`LIST.FOR:49-63`; `LSTVAR.FOR:21-32`).
  The driver and storage are ported. Pre-game WHO=0 coordinates and invalid
  SBITS indexes still need the original memory model at their call boundary.
- LSTFLG's named-object branch calls LSTOBJ even when LSTUPD rejects the
  requested range. Named calls alias the same DUMMY word across mask, counter
  and summary arguments. Coordinates print directly without granting the
  base/planet scan knowledge that LSTOUT grants later. Coordinate queries
  also allow a ship through the BASES/PLANETS entry's object restriction
  (`LSTFLG.FOR:45-123`). These paths are retained.
- LSTFLG traverses Romulan, ships, bases, then planets. Closest selection
  excludes the current ship and lets later equal-distance candidates win,
  then rereads the board at the winning coordinates. Entire-game ship/Romulan
  selection supplies synthetic -1 scan bits, except for closest requests
  (`LSTFLG.FOR:129-194`). Raw ALIVE, ROMOPT and ROM words use a required logical
  adapter; current TEAM/PASFLG inputs reach each LSTUPD call.
- LSTOBJ's computed GOTO falls through to the Romulan branch for object codes
  outside 1..8. Thus empty space, stars and black holes can print EROM, or the
  out-of-range literal according to existing XF. LSTFLG does not assign XF
  before its direct empty/star/black-hole row. A distant planet still prints
  build counts, while a distant base hides strength and keeps coordinates
  (`LSTOBJ.FOR:43-86`; `LSTFLG.FOR:45-59`). The port preserves this behavior.
- LSTSUM clears its count argument after completing output. LSTOUT relies on
  that to reset side totals between categories and also passes ROMCTR itself,
  clearing that shared output counter. Repeated groups can increase ROMCTR
  repeatedly, but ship/base/planet summaries count flagged physical entries
  once (`LSTSUM.FOR:30-41`; `LSTOUT.FOR:31-124`). Summary byte tests preserve
  CRLF suppression and padding supplied by the literal adapter.
- LSTOUT updates base/planet scan bits after listing each row, unless the
  then-current XF has PASBIT. Summary-only selections do not grant knowledge.
  It rereads planet ownership and does not recheck ALIVE for selected ships.
  TARGETS only counts objects with SUMBIT; its range wording uses TXF, which
  LSTUPD updates only on the distant nonfriendly/nonprivileged branch. A
  TARGETS SUMMARY request can therefore say “in range” even when its group
  uses entire-game range (`LSTOUT.FOR:75-131`; `LSTUPD.FOR:35-43`).
- LSTFLG's base DO has no FIRST>LAST guard, unlike its ship DO. When neither
  team side is selected, its bounds are 2:1. LSTOUT can similarly reach a 1:0
  planet DO when PLNCTR survives but NPLNET is now zero. These paths require
  explicit compiler trip-count and final-variable adapters. Tests exercise
  both zero-trip and one-trip fixtures without choosing a production policy
  (`LSTFLG.FOR:143-174`; `LSTOUT.FOR:101-120`).
- LIST-family FORTRAN literals remain distinct from named MSG.MAC ASCIZ
  strings. Six literal keys retain the source text and file identity, but their
  compiled bytes come from a required runtime adapter. Padding is not trimmed
  before pluralization. Tests use explicit unpadded and padded fixtures;
  neither is claimed as established compiler behavior. Actual messages use
  “Captain” where LSTFLG comments still say “Sir” (`MSG.MAC:129,134`).

- SCAN and SRSCAN initialize radii to ten and seven, then cap all four defaults
  at `(TERWID-9)/4` with integer truncation, even in short format. Explicit
  numeric ranges bypass that width cap and are only clamped to 0..KRANGE.
  UP increases V; CORNER uses the signs of two numbers to select sides
  (`SCAN.FOR:44-119`). A trailing WARNING prefix changes only its token type
  and NTOK, retaining text/value/offset even if subsequent parsing fails.
  NTOK=1 bypasses the modifier parser and its local assignments.
- SCAN first constructs its screen, then records every planet and live enemy
  base within KRANGE, irrespective of the requested display bounds. WARNING
  marks radius-two enemy-planet squares and radius-four enemy-base squares,
  clipped to the display. Centers outside the displayed rectangle can still
  mark cells within it (`SCAN.FOR:121-149`; `WARMAC.MAC:2867-2942`). Knowledge
  updates finish before SHWSCN checks Ctrl-C and persist for later LIST use.
- SETSCN stores six bounds/dimension words followed by SCREEN in 200-word
  LOCAL. Rows advance nine words and contain five seven-bit bytes per word;
  IDPB retains bit zero and unused bytes. Shorter scans add new terminators
  without clearing old tails or unused rows. The maximum command rectangle
  is 21 by 21 and fits this layout (`WARMAC.MAC:261,532-538,2799-2843`).
- SCAN's OBJTBL differs from ODISP: black holes are spaces, captured planets
  use `@F`/`@E`, and an all-ones cloaked cell appears empty. MARK rereads the
  live board, replacing empty/cloaked cells with ` !` and reconstructing other
  symbols. The twelve entries including the warning pair and ship indirections
  are extracted with source locations (`WARMAC.MAC:2846-2860,2909-2924`).
- SHWSCN prints rows from VMAX down to VMIN. Long scans label every second
  horizontal sector; short scans start at HMIN+1 and label every third sector.
  The first label is always emitted, even beyond HMAX for a one-column short
  scan. O2DB emits two characters without discarding hundreds, unlike O2DG.
  Ctrl-C is checked and cleared after a complete row, so a preexisting flag
  still allows the top labels and first row; an aborted scan has no footer
  (`WARMAC.MAC:2194-2204,2948-3002`). Source-derived byte fixtures cover these
  paths. Full LOCAL overlays, invalid pointer/table accesses and actual monitor
  interrupt scheduling remain outside the current composed scope.

- ENERGY parses its own ship-name/amount pair, prompts until their types
  match, and ignores additional tokens. The self check precedes ALIVE, team
  and diagonal adjacency checks. It scales the request by ten into IHITA,
  rejects an amount greater than or equal to donor energy, then rejects
  nonpositive amounts. Earlier errors retain unrelated hit registers
  (`ENERGY.FOR:29-93`). GTKN retries do not add a new hangup/cancellation rule.
- ENERGY computes `MIN0(INT(IHITA*0.9),50000-receiverEnergy)` before charging
  the donor `IHITA + IHITA/9`, using truncated integer division on the final
  delivered amount. The 0.9 expression involves original floating conversion,
  constant encoding, multiplication and INT; the port requires a service for
  that exact operation and supplies no default approximation. A full receiver
  still produces success and a zero hit. An over-cap receiver can produce a
  negative delivery, increase donor energy, and pack the notification amount
  as an unsigned halfword (`ENERGY.FOR:98-104`; MAKHIT layout). Tests use explicit
  arithmetic fixtures and retain these paths without claiming original float
  equivalence.
- ENERGY updates both balances, emits the sender's success message, then
  assigns destination/source codes, DBITS and event type 12 before MAKHIT.
  Other hit fields retain their earlier values until MAKHIT packs and clears
  them. It does not update ship condition or charge a main-loop turn. The
  failure message at label 1700 has no incoming branch in the supplied routine
  (`ENERGY.FOR:98-108`; `DECWAR.FOR:113-117`). The port does not invent a failure
  branch or rollback after notification errors.

### TELL recipient and Romulan paths

- TELL checks the sender's radio with GE KCRIT, then turns NOMSG off for that
  player before asking for a destination. An empty interactive response leaves
  old DBITS intact. Later parsing clears DBITS, searches ships before groups,
  examines every KNGRP slot rather than NGROUP, and reports unknown/ambiguous
  tokens with OUTW before continuing. Group pruning silently removes dead
  members. Explicit dead recipients produce later diagnostics
  (`TELL.FOR:33-86`; `LOWSEG.FOR:54-55`).
- ROMULAN matching precedes RPTFLG rejection. Its immediate reply queues before
  SNTROM is set and saved human DBITS restored. DISPFR is not restored. IRAN(4)
  then controls relocation; a successful draw consumes IRAN(10)-5 and searches
  horizontal outer/vertical inner through offset ten. The same offset begins
  both loops, including -4..5 asymmetry. Occupied/out-of-galaxy cells are
  skipped; the old Romulan cell is cleared only after finding a vacancy
  (`TELL.FOR:59-64,89-113`). Focused tests use labelled speech fixtures, and
  additional compositions now use the ported ROMSPK routine itself.
- Final filtering runs in physical player order: radio damage precedes ALIVE,
  which precedes NOMSG. Diagnostics use class-one object codes even for Empire
  players. Self is removed only afterward, and only surviving recipients are
  ungagged. Human MAKMSG uses its no-argument LINBUF/INLI path and ends with
  CRLF; autonomous speech passes LOCAL and has no final CRLF. Empty autonomous
  or already-replied Romulan paths suppress TELL's no-message diagnostic
  (`TELL.FOR:116-163`). The port composes human delivery with real queue routines
  and OUTMSG and retains output/metadata across suspended message calls.
- ROMSPK writes DISPFR=500 and chooses
  octal masks 777777/000777/777000 for autonomous populations
  (`WARMAC.MAC:6228-6250`), although KNPLAY is ten. TELL filters only ten bits;
  higher bits reach MAKMSG's counter loop. OUTMSG uses
  BITS(MOD(500,100)), i.e. BITS(0), before formatting Romulan messages
  (`OUTMSG.FOR:35-39`). HISEG places NAMES immediately before BITS, so the
  messageBits component adapter reads the last NAMES word supplied by its
  caller. Explicit padding fixtures demonstrate that its low bits can gag
  Romulan output. Compiled FORTRAN literal padding, raw logical tests and
  exceptional destination DO bounds remain explicit dependencies.

### ROMSPK and message-memory composition

- ROMSPK tests PLAYER with an assembly zero test, independently of TELL's
  compiler logical interpretation. Broadcasts draw population, lead-in,
  adjective and object; single-player replies draw lead-in, adjective,
  node-chance, optionally a generic descriptor, then object. A matching
  GETLIN node consumes no generic draw. The port extracts all 29 phrase and
  46 node strings and retains 'vengence', 'Anahiem', 'Cincinnatti', 'Lousiana'
  and 'Silicon Gultch'. Byte-pointer writes keep the unused word bit and bytes
  following the terminating NUL (`WARMAC.MAC:6228-6396`).
- RMGPLY moves GETLIN's right half into the left half to match NODNAM. Its
  fallback masks first with octal 77, then 7777; this cannot implement the
  commented CLx/CSx/Qxx prefix matches. The port executes those masks and
  falls through to generic descriptors for unknown nodes. Three-character
  SIXBIT immediates use the same halfword representation evidenced by
  MOVSI 'DSK' and HLRZ/CAIN 'STA' elsewhere in WARMAC
  (`WARMAC.MAC:1465-1474,6306-6348`). Actual GETLIN remains a monitor service.
- MAKMSG publishes its queue entry before shifting all 36 DBITS bits and
  incrementing MSGFLG at each selected address. HISEG places HITFLG(1:10)
  directly after MSGFLG(1:10), so broadcast bits 11:18 increment HITFLG(1:8).
  The incrementMessageAlias adapter binds those accesses to existing shared
  counters; further addresses require more HISEG memory. Short messages
  cancel before these writes. Source-derived compositions confirm that
  GETHIT/OUTHIT can drain spurious counts without a displayed hit
  (`HISEG.FOR:24,53-55`; `WARMAC.MAC:3585-3606`).
- Queue metadata retains 18 recipient bits, and GETMSG converts the all-ones
  mask 777777 to zero. Thus an all-player Romulan broadcast can display no
  recipient names. Its bits beyond ten keep the entry linked after every
  actual player has read it. These are preserved without changing masks or
  suppressing the counter writes (`WARMAC.MAC:3569-3571,3595-3606,3640-3652`).
  OUTMSG also now requires a memory service for BITS indices 11:18, which
  BLKDAT does not initialize, instead of synthesizing power-of-two words.

### GRIPE logging and temporary ship removal

- GRIPE rejects RED alert through direct OUTSTR before changing output, board
  or CCFLG. ESHP independently skips nonpositive WHO and RED condition, but
  otherwise writes code 1000 at the ship position without testing ALIVE.
  PSHP tests raw negative ALIVE and restores the current position and physical
  team/slot code. It does not restore a cached original cell, so death or
  position changes while input waits affect the cleanup
  (`WARMAC.MAC:4714-4731,4971-4977,5295-5325`).
- OSTS prints version digits using division and raw character arithmetic;
  UNDAT and UNTIM write the same scratch storage, so an unchanged word can
  repeat in the header. MOVNI X4,-100 negates the immediate effective-address
  value, giving a negative STAT counter that outputs all identity fields.
  B/R markers depend on negative BLHOPT/ROMOPT, independently of generic
  FORTRAN logical interpretation (`WARMAC.MAC:2536-2593`). Date/time and
  pre-game identity remain monitor inputs, not modern timestamp formatting.
- GRIPE decrements its twenty-line counter before each INLI, copies LINBUF
  through NUL, and checks Ctrl-C before copying. Ordinary lines append CRLF
  and clear ACTIVE for a raw-negative ALIVE player. EOF bypasses that reset,
  aborts only an entirely empty first line, and appends CRLF only if the final
  line has characters. Warning lines go to the terminal after eighteen and
  twenty full lines, with the same HCPOS/BLANK state used for log output
  (`WARMAC.MAC:4733-4767,4914-4924`).
- OGCH allocates in twenty-word increments. It zeroes words after the current
  byte-pointer word, leaving that word and its unused bit/tail intact. CORE
  failure warns and returns without storing the current character; later
  characters can retry. File output appends old packed words after the last
  new word rather than concatenating decoded strings. A nonnegative old-file
  length is explicitly zeroed by the source's virgin-file workaround
  (`WARMAC.MAC:4941-4977,4983-5001`).
- Busy OPEN failures warn and HIBER for 30×100 ms, then retry unless CCFLG is
  set. Other open/core/read/write errors follow their distinct source warnings
  and common cleanup. Cleanup sets FL.FF to the original buffer base, calls
  CLOSE, restores TTY output and the ship, then clears CCFLG. WARN's direct
  output/HUNGUP handling and actual file/core effects remain required services
  (`WARMAC.MAC:59-67,574-578,4926-4977`).
- Positive ADDRCK logs SHOSTA(1); negative ADDRCK dumps raw failure memory.
  The dump includes `^@` for the command-line NUL, instruction fields, sixteen
  registers, at least one stack word, 403 words starting at HITQL-1 (including
  two words beyond its header plus 400 entries), and twenty LOKTAB words.
  OCT.O displays unsigned low octal digits rather than signed ONUM fields.
  Tests compose the actual dump through OGCH, and STAZAP→GRIPE→SHOSTA before
  the statistics clear, while retaining required raw memory and monitor
  adapters (`WARMAC.MAC:4771-4912,6185-6208`).

### HELP, list search/output, and NEWS

- HELP rejects RED alert with direct OUTSTR before changing flags or the board.
  Otherwise it uses ESHP/PSHP, checks persistent token types rather than NTOK,
  and handles commands before extra help topics. A command ambiguity skips
  the extra-topic search. PASFLG must be negative to include the two special
  commands. The TTYON instruction before HELP.1 is unreachable in the supplied
  flow (`WARMAC.MAC:5013-5061`). HLPXTR/HLPALL also remain standalone entries
  without HELP's RED gate or flag/board cleanup.
- SLST uses EQUAL on the first stored word, preserves physical match order,
  reports ambiguity before listing matches, and stops at the second match
  when negative X2 suppresses the candidate list. Its OSTB calls stop at
  space/NUL or ten characters. OLST copies and outputs both words with their
  padding and blank entries; MOVEI X2,7 produces seven entries per row despite
  the comment saying six (`WARMAC.MAC:5207-5285`).
- SHLP clears CCFLG and the high half of .JBREN before each topic. Negative
  PASFLG tries HL1FIL first; only an open failure falls back to HL2FIL, not a
  failed topic search. The reader recognizes section dots after LF or FF,
  ignores FF in displayed text, and emits all other body bytes, including
  NUL/CR/VT. It reads a file byte before testing a keyword terminator, and
  compares at most five folded characters. That lookahead can consume LF and
  leave the first body line in the heading-suppression state. A matched header
  with no subsequent boundary still yields the source not-found message
  (`WARMAC.MAC:5109-5185`).
- SHLP tests Ctrl-C and the raw negative .JBREN flag at LF/FF boundaries,
  including during section search. Negative ALIVE resets ACTIVE at those
  boundaries. Cleanup clears both interrupt flags, so HELP can proceed to a
  later modifier after an interrupted topic. Its open-failure path clears
  flags without CLOSE/SETI. Tests preserve consumed lookahead and output
  already produced before interruption (`WARMAC.MAC:5130-5185`).
- NEWS has no RED gate or ESHP call. It emits source bytes and prompts only
  for a dot immediately after LF/VT/FF; a first-byte dot or dot after CR prints
  normally. The prompt calls TTYON and switches to GTKN input, then restores
  the file input before testing the first token against YES. Acceptance
  consumes only the dot; rejection closes without reading the remainder.
  Interrupt checks occur after emitting LF/VT/FF. Open failure retains CCFLG
  and only clears .JBREN's high half; ordinary cleanup clears CCFLG and closes
  before restoring input (`WARMAC.MAC:4661-4705`).
- All 31 public command topics and seven nonblank extra topics are checked
  against their actual DECWAR.HLP body bytes, including mixed LF/CRLF and
  suppressed FF. DECWAR.NWS is checked byte-for-byte. These are local-source
  fixtures through the ported readers, not original-monitor transcripts.
  Actual OPEN/SETI/ICHR/CLOSE file-stack behavior, TTYON, monitor echo and
  asynchronous flag delivery remain required runtime bindings.

## Pre-game entry and re-entry findings

- PREGAM binds JOBSTA to the first six shared LOCAL words and checks CCFLG
  immediately afterward (`SETUP.FOR:123-130`). The port provides live word
  references. Its initial prompt uses NTOK=0 to return, then matches HONORROLL,
  HELP and PREGAME in that order. Unknown input silently repeats this prompt;
  HELP adds its own TTYON before returning to the prompt's TTYON
  (`SETUP.FOR:130-146`).
- XGTCMD tests the first token's type, scans all sixteen commands regardless of
  PASFLG, and distinguishes ambiguity, game-only names and unknown names. Every
  error appends the HELP suggestion. INPUT repeats at 10000 milliseconds without
  an added interrupt/endgame check (`SETUP.FOR:498-556`). Raw logical services
  interpret the original CCFLG/HUNGUP bitwise expression.
- All sixteen PREGAM slots preserve their arguments (`SETUP.FOR:154-194`).
  TYPE has no argument; the port does not supply zero. DOCUMENT prints the
  substituted literal at lines 166-167; PDWDOC is commented out. Continuation
  and literal padding remain compiler contracts. Only *ZAP has a dispatch-level
  PASFLG gate. SHOSTA receives .TRUE.; composed assembly tests explicitly bind
  that to -1, rather than assuming JS true converts to the correct word.
  PRGNAM immediately returns in the linked code (`WARMAC.MAC:4052-4053`).
- KILCHK clears PASFLG before KQSRCH and rereads both the live killed-record time
  and clock at each ETIM call (`SETUP.FOR:74-100`). The announcement clamps its
  recalculated value to 1000 and divides TIMLFT by 1000. Its first INPUT then
  treats that seconds value as milliseconds; later iterations reset it to
  milliseconds. Flush precedes the initial OTIM. ENDFLG is checked only after
  INPUT returns false, before the next time calculation. Exact password match
  bypasses the remaining wait without setting PASFLG (`SETUP.FOR:82-113`).
- The supplied PARAM's KWAIT is zero. Tests use explicit future killed-record
  timestamps to exercise the countdown without changing that constant. BACKUP
  is eight octal-10 backspaces, NUL and bell (`SETMSG.MAC:22`); OUT stops at the
  NUL, so the bell is not emitted. ECHON/ECHOFF immediately return
  (`WARMAC.MAC:1312-1329`); the port adds no echo toggle.
- CC1 decrements NUMPLY; CC2 additionally decrements NUMSID(TEAM), then both
  unlock FRELOK and exit (`SETUP.FOR:31-60`). Counts can become negative. No
  extra FREE, WHO mutation or rollback is inserted. Composed cancellation tests
  preserve these effects before monitor calls. Actual JOBSTA, MONIT, CCTRAP,
  lock/exit services and complete SETUP/session memory remain unresolved.

## SETUP and PLACE findings

- Capacity checks NUMPLY equal to KNPLAY, before acquiring FRELOK; values above
  the limit do not take that branch. FRCCHK and JOBSTA precede it. After LOCK,
  interruption is checked before LKFAIL, and NUMPLY increments only after the
  retry loop (`SETUP.FOR:219-236`). No second capacity check is inserted.
- Initial setup depends on TIM0 and the expression containing NUMPLY and
  HITIME-DAYTIM. Its OR evaluation can affect clock calls (`SETUP.FOR:238-242`);
  the port requires a compiler evaluation adapter. BLKSET zeros HFZ through
  HLZ, leaving NUMPLY, NUMSID and personal SCORE outside that range
  (`HISEG.FOR:22-29,93-98`). The full memory/loader service is still pending;
  test reset fixtures explicitly cover only modeled fields.
- Regular selection includes a two-label IF on EQUAL, while tournament input
  accepts IABS(TKNLST(I)) without a type check. A separate prompt is selected by
  TYPLST(2), not NTOK (`SETUP.FOR:248-264`). Raw token words and the compiler's
  branch convention are required services. Ctrl-C here jumps to world creation;
  hangup calls CC1. Romulan selection similarly sets ROMOPT before input and
  can proceed to creation on Ctrl-C (`SETUP.FOR:268-283`).
- Creation sets all base strengths to 1000, their fourth words to the team
  number, and NBASE to ten per side. BLKSET writes numeric +1 into ALIVE;
  reserving a selected ship later assigns the compiler's .TRUE. word instead
  (`SETUP.FOR:284-298,448`). These values are not conflated.
- INT(51*RAN(0))*5+100 and INT(41.0*RAN(0)+10) make two distinct floating calls,
  even when no black holes will be placed. NPLNET is fixed at sixty; its older
  random expression is commented out. Placement alternates the two bases for
  each index, then places planets and stars (`SETUP.FOR:295-309`). Blank input
  at the black-hole question skips placement; NO does not clear a BLHOPT value
  already present (`SETUP.FOR:320-328`). Compiler arithmetic remains explicit.
- Killed-record TEAM uses the low 18 bits, while WHO uses signed division by
  octal 1000000. A full former side prompts for defection; an available former
  ship skips selection. Otherwise selection scans all names in physical order,
  taking the first prefix match before checking side and ALIVE. It does not
  report ambiguity (`SETUP.FOR:349-440`). Team increments occur between
  CCTRAP(0) and CCTRAP(CC2). Cancellation removes current player/side counts
  but retains the incremented total NUMSHP.
- FRELOK is released before UPDCAP, selected SCORE clearing and ALIVE reservation
  (`SETUP.FOR:444-448`). Two composed sessions can choose the same ship in that
  interval. The port preserves this order. GROUP's seven literal words/masks
  follow lines 450-456, then JOBSTA writes the selected shared JOB fields.
  SHPCON and device words are cleared; ACTIVE, DOCKED, TRSTAT and notification
  counters receive no extra clearing in this individual-player path.
- The terminal scan tests ALIVE(WHO), not ALIVE(I), before reading each JOB
  speed. Vacant rows can lower the minimum to zero, and the final zero test
  forces SLWEST=1 (`SETUP.FOR:476-484`). The default terminal type is always
  reset to 8 at line 349. SETUP returns with zero ship coordinates; it does
  not place the captain's ship on the board.
- PLACE draws V then H on every attempt and retries any nonzero DISP, including
  the sentinel. For ship codes it checks every KNBASE location when the enemy
  base count is positive, even if a particular base is destroyed. Its planet
  test compares PTEAM directly to DISPC: ordinary owned-planet codes differ
  from team numbers, so they do not pass that comparison (`PLACE.FOR:33-54`).
  The old object-plus-index SETDSP is commented out. All placements keep the
  given code; outputs retain the last coordinate writes. DO bounds are captured
  on entry, with a required compiler contract for nonpositive N.

## DECWAR application entry and fatal transfer findings

- DECWAR clears LFZ through LLZ, sets VERSIO=24 and initially OFLG=MEDIUM
  (`DECWAR.FOR:30-34`). INFLAG, HUNGUP, ADDRCK, LKFAIL and TERWID follow LLZ
  (`LOWSEG.FOR:27-28,76-80`); this is not permission to zero every session field.
  Complete memory binding remains required. The emitted DECVER retains 2.3.
- The experience question runs once. VALLST(1) and TKNLST(1) are independent
  alternatives, with beginner before intermediate before expert. No NTOK,
  TYPLST, interruption or hangup check is inserted. Unrecognized input falls
  through unchanged, except for OFLG already set to MEDIUM. Five-character
  EQUAL means even BEGINX selects BEGINNER (`DECWAR.FOR:35-64`). OCFLG and
  TTYTYP are not assigned by those branches.
- TYPE(1), TYPE(2), SUMMAR and PREGAM follow in that order. SUMMAR receives
  the experience command's current token memory; it is not given a synthetic
  SUMMARY command or cleared arguments. After PREGAM, TTYON precedes SETUP,
  then APRSET installs label 9999 before PLACE writes the selected ship's
  coordinates. GETCMD with WHO=0 returns to PREGAM, skipping initial preferences
  and reports (`DECWAR.FOR:65-82`). KILCHK has no CALL in the supplied source;
  its standalone port is not inserted into this path.
- FRCCHK only clears JSQTIM before entering CHKSEQ, whose first instruction
  immediately returns (`WARMAC.MAC:3670-3677`). The following job-sequence scan
  is unreachable and must not be enabled as automatic ship reclamation.
- DECWAR label 9999 calls CRLF twice and IRAN(5) once, then selects one of five
  FORTRAN message branches (`DECWAR.FOR:291-330`). Existing blank-line suppression
  can make those two CRLF calls emit one newline. Typos such as "uable" and
  "transparant" and the original apostrophes remain. Out-of-range computed-GOTO
  values fall through to the first branch. All branches use common cleanup;
  label 9999 does not itself set ADDRCK.
- Actual APRTRP first sets ADDRCK, captures registers/instruction/lock address,
  replaces stacks, calls GRIPE and then jumps through FTLERR
  (`WARMAC.MAC:6106-6121`). The APR entry is now ported with explicit CPU,
  stack-literal, logging and transfer services; DecwarFatalTransfer itself still
  models only the final jump. Ordinary JavaScript errors are not APR traps. A placement failure
  can leave partially written coordinates whose later FREE requires unresolved
  faulting-memory behavior; the boundary test does not claim that cleanup works.
- The unset-FTLERR assembly branch loads AC16 with an argument address and then
  uses AC0-derived indirection for OUTSTR, with no intervening IRAN call
  (`WARMAC.MAC:6122-6125`). It is not the ported DECWAR five-message selector.
  The port preserves that live register/address sequence with required literal
  and CPU-indirection services; no random FMSGS lookup is invented from the
  comment or adjacent table.

## TRACTR and shared TRCOFF findings

- DECWAR calls TRACTR without arguments (`DECWAR.FOR:232`), but the routine
  declares IP and assigns IP=WHO in both off paths (`TRACTR.FOR:27,35-36,49-50`).
  The writable dummy address remains a compiler contract. A bare command with
  an active beam takes that path before examining token two. Explicit OFF
  assigns IP even if the beam is inactive; it cannot be replaced with a local
  temporary merely because no release will follow.
- Destination prompting depends on TYPLST(INDEX)=KALF and repeats for other
  types, returning on EOL before INDEX=1. After GTKN there are no extra NTOK,
  Ctrl-C or hangup checks (`TRACTR.FOR:40-45`). OFF uses EQUAL, so O and OF match.
  Existing-beam rejection precedes ship lookup, which takes the first physical
  prefix match without ambiguity reporting (`TRACTR.FOR:49-66`).
- Validation rejects self, then enemy side, then inactive target. Adjacency
  includes diagonals and coincident coordinates. Target beam state is checked
  before either shield condition; shields must be strictly negative, not zero
  (`TRACTR.FOR:70-114`). ODISP prefixes the target-beam and target-shield errors.
  There is no device-damage, energy, radio, caller-ALIVE or docked check, and
  DECWAR returns directly to the command loop without turn accounting.
- Applying the beam writes TRSTAT(WHO) and TRSTAT(I), then DBITS and IWHAT=13,
  then calls MAKHIT (`TRACTR.FOR:118-122`). It emits no direct success message.
  The other hit registers remain untouched by TRACTR. The actual queue and
  OUTHIT provide both recipients' notifications; radio suppression is not
  added to these event types.
- TRCOFF builds DBITS from IP and TRSTAT(IP), sets IWHAT=14, clears the target's
  TRSTAT, rereads IP and clears TRSTAT(IP), then calls MAKHIT
  (`TRACTR.FOR:126-132`). It neither validates a symmetric pair nor changes the
  sender WHO. If IP aliases the first cleared word, the second write can target
  index zero. HISEG puts NUMROM immediately before TRSTAT and the final NAMES
  word immediately before BITS (`HISEG.FOR:26-28`). Explicit component memory
  fixtures preserve these effects; no empty sentinel is substituted. Missing
  memory stops internally with earlier assignments retained.
- The existing lifecycle helper now delegates to this shared release body.
  Tests compose beam application with SHIELD UP's energy charge/release and
  FREE's release/queue draining. MOVE now ports towing; other combat callers,
  the zero-argument compiler binding and full shared memory remain unfinished.

## Location, path tracing and movement contracts

- LOCATE/RELOC retain shared token storage and their distinct entry offsets
  (`LOCATE.FOR:36-167`). Numeric input writes VALLST without normalizing the
  remaining fields. COMPUTED copies TKNLST/TYPLST/VALLST without PTRLST, sets
  NTOK before count/name errors, and expands names backwards without writing an
  EOL. Partial changes survive an error. Odd leading scalars bypass coordinate
  translation/range checks. Empty counts return before exact-count validation.
- COMPUTED's computer check precedes its PASFLG/baud gate and possible
  PAUSE(KTTYSP*2) (`LOCATE.FOR:80-89`). The raw logical/OR service remains
  required. Reversed DO bounds and out-of-range token storage require explicit
  compiler/memory bindings; ordinary empty-JS-loop behavior is not substituted.
- CHKPNT's strict integer-hundredths test differs from its prose comment
  (`CHKPNT.FOR:22-40`). With the exact-rational fixture, fractions from .41
  through just below .60 select two cells; .40 and .60 do not. Real machine
  rounding at those thresholds remains unresolved. Negative values retain
  signed MOD and truncation semantics.
- CHECK's formal H/V names differ from MOVE's COMMON names. Physical argument
  and output order is retained (`CHECK.FOR:36-95`, `MOVE.FOR:30,119`). Both
  candidate cells must be clear before RAN. Collision DCODE is a second DISP
  read, not the first result cached. Negative DISP traverses; galaxy exit sets
  object coordinates to the last clear position without a collision code.
- MOVE takes IRAN(4000) before input and preserves label 600's special retry:
  RELOC zero does not trigger a separate empty-count retry and does not update
  TEM (`MOVE.FOR:44-66`). GREEN/undocked and computer-deflection RAN precede
  speed rejection. Warp-five/six warnings, strict overheat thresholds and
  scaled OFLT output remain source-derived (`MOVE.FOR:68-115`).
- Energy uses requested IA and is charged before board locking. Destination
  locks precede source locks; same-word motion locks once. Failure retains
  energy and earlier changes, returns alternately and leaves PTIME untouched
  (`MOVE.FOR:119-143`). The path is not rechecked after a lock wait.
- Towing starts after unlocks and uses V1-INT(DISV) for a board coordinate but
  assigns V1-DISV to an integer ship coordinate (`MOVE.FOR:144-150`). Those are
  distinct real/integer conversion boundaries. The new cell is written before
  clearing the old one, even when both refer to the same cell. No tow lock,
  collision check or consistency correction is introduced.
- All real values in these ports are opaque values supplied by RealArithmetic;
  floating RAN remains required. Exact-rational arithmetic exists only under
  test/support and explicitly does not model machine rounding, exponent limits
  or traps. Integer wrapping retains the existing unresolved overflow policy.
  Full COMMON/argument aliases, monitor interleavings and production arithmetic
  bindings are still needed before strict parity can be claimed.

## Phaser control and shared combat helpers

- PHACON selects the earlier bank, with ties at bank one, before target lookup.
  It checks class/ALIVE, zero distance, ally and range, waits for that bank,
  then validates hit strength (`PHACON.FOR:44-69`). Target/class/distance and
  bank remain local across the wait; shot-size storage and shields are reread.
  Compound ALIVE and post-hit DISP expressions use compiler evaluation services,
  exposing non-ship ALIVE accesses if eager evaluation is selected.
- Shield cycling charges 2000 for nonnegative KSHCON but does not change the
  shield word. Overheating uses IRAN(100)*PHIT > 18900, then an extra draw and
  mixed-real expression (`PHACON.FOR:71-80`). Damage can become critical and
  the accepted shot still continues. Real conversion/rounding remains a required
  service, with only an exact-rational test fixture.
- Planet hits update at most one build unit after strict integer comparison.
  IHITA, SHCNTO, CRITDV/CRITDM and KLFLG are not initialized on that path
  (`PHACON.FOR:86-98`); the port preserves prior registers. Base announcements
  precede PHADAM only at strength exactly 1000; destruction announcements follow
  the direct hit when the current cell is zero (`PHACON.FOR:119-147`). NOMSG
  filters announcements, not direct-hit recipient selection. Real MAKHIT clears
  registers between messages. PHADAM is now ported and composed with the driver;
  older driver-isolation tests retain their labeled call fixtures.
- PRIDIS uses ALIVE<=0 numerically, including zero, independently of compiler
  logical truth (`PRIDIS.FOR:29-46`). It clears DBITS only for ZERO=0, selects
  physical team halves and uses inclusive LDIS without board occupancy tests.
- PHAROM and TOROM retain two integer truncation stages and no ROM-alive guard.
  DEADRO sets KLFLG=2, clears ROM and its board cell, retaining EROM/LOCR and
  unassigned hit registers (`ROMDRV.FOR:212-233`). PHACON scores IHITA plus 5000
  when ROM tests false; it does not check PLAYER (`PHACON.FOR:103-115`).
- JUMP requires exactly one sector after mixed-real integer assignment and
  uses DISPC to check occupancy (`JUMP.FOR:44-66`). Negative DISP therefore
  acts empty. Romulan relocation stores DXROM*100+J. Black-hole displacement
  keeps old stored coordinates and does not zero energy, undock, release tractor
  beams or adjust global counts (`JUMP.FOR:70-80`). Those effects must not be
  added inside this routine; callers remain responsible for their own actions.
- BASKIL's NUMCAP<=0 branch jumps to label 400, leaving docking unchanged even
  after all adjacent bases are gone (`BASKIL.FOR:42-62`). With positive NUMCAP,
  only actual adjacent friendly DISPC or a positive-strength base retains docking.
  There is no ALIVE check. Reversed planet-loop bounds and raw DOCKED logical
  interpretation remain explicit compiler services.

## Shared weapon damage and assembly power

- TORDAM checks hull/energy or base strength before touching hit registers or
  random state; PHADAM bypasses those checks (`TORDAM.FOR:26-42,119-135`).
  Torpedo initialization takes three RAN draws before the shield branch. Its
  two-label logical IF remains a required compiler selection between labels
  1000 and 300. Eager compound evaluation may access BASE/SHPCON outside the
  intended target kind; memory services must supply those actual words.
- Shield penetration uses old strength. Ship shield strength is clamped after
  subtraction, while base strength follows its separate later decrement.
  PHADAM halves POWFAC only for positive shield condition but enters absorption
  for zero as well (`TORDAM.FOR:123-157`). Hull, energy, device damage and score
  assignments independently convert mixed-real expressions; truncating HITA
  once and reusing that integer would change results.
- Critical threshold equality is critical. The repeated threshold expressions,
  IRAN(5) in AND and IRAN(10) in OR remain under explicit evaluation services
  (`TORDAM.FOR:64-83,178-182`). Immediate base criticals jump directly to 1400,
  bypassing ordinary penetration subtraction and scoring. Critical device damage
  is half HITA; subsequent random hull variation changes IHITA separately.
- Unassigned KLFLG/CRITDV/CRITDM remain stale. A stale KLFLG can kill an otherwise
  surviving ship, whereas a positive-strength base returns at 1300 before that
  flag is checked. Deflected torpedoes can still displace ships. Black-hole JUMP
  death retains KLFLG=1, then shared cleanup clears the old cell again
  (`TORDAM.FOR:85-117,159-186`). No tractor release or docking fix is added here.
- BASKIL is called before NBASE decrement, board removal and final strength zero
  (`TORDAM.FOR:187-192`). A positive-strength critical kill can leave a nearby
  ship docked because BASKIL still sees that port. Negative SHSTTO is captured
  before final zeroing and later passes through the hit queue's packed fields.
- Player damage scoring filters enemy object class, but player ship-kill bonus
  does not check team; Romulan/non-player SHIP scoring uses RSR. Immediate base
  criticals can receive only the 10000 kill bonus; ordinary damage plus kill
  reaches both additions (`TORDAM.FOR:90-116,189-190`).
- PWR preserves small-power left association, recursive half/square/odd order,
  and its negative-exponent result of 1.0 (`WARMAC.MAC:2762-2794`). FMPR and the
  HRLZI-loaded one are required machine services, separate from generic real
  multiplication. No native exponentiation or accepted numerical approximation
  is introduced. Rational/ordered-real services exist only as test fixtures.

## Star chains, nova damage and planet removal

- SNOVA resets stack pointers without clearing /SNLOCL/ arrays. OBJSTK(8,4)
  precedes STRSTK(80,2), each column-major; the memory port preserves addresses
  that run into another column or the following array (`SNOVA.FOR:30-58`).
  Victims are found in row/column order and popped LIFO. DISP is reread before
  NOVA, after earlier victims may have moved or been removed. Do not preserve
  a cached object identity from initial discovery.
- Accepted neighboring stars are cleared when pushed. IRAN(5) appears inside
  the OR exclusion and precedes the STRPTR==29 capacity test (`SNOVA.FOR:43-48`).
  Compiler evaluation can take draws for non-star cells. Pending stars pop LIFO;
  notification precedes the player/Romulan score update, and the initial star
  receives no score here (`SNOVA.FOR:62-70`). FORTRAN loop contracts and complete
  surrounding memory remain required for exceptional coordinates/addresses.
- NOVA is independent of TORDAM: it computes D from shields, replaces D<200
  with 250, takes a draw for each device, and uses a separate energy-loss draw
  (`NOVA.FOR:39-73`). Shield-device failure can suppress the later positive-
  shield draw. No target-alive guard is introduced.
- Ship kill bonuses update TMSCOR directly for a player and RSR for non-player
  attacks. Friendly damage/kill points are negative. JUMP black-hole death keeps
  old stored coordinates; NOVA overwrites VTO/HTO with those old values before
  reporting. MAKHIT precedes TRCOFF (`NOVA.FOR:77-98`).
- A full-base distress call clears IHITA via MAKHIT before its subsequent hit
  report. Base death decrements NBASE before BASKIL, reports the hit while the
  old board cell remains, then clears the cell and announces destruction
  (`NOVA.FOR:103-138`). Do not share TORDAM's different cleanup ordering.
- NOVA's random Romulan kill is commented out. A living Romulan jumps, then
  halves EROM only if still alive. Non-player scores subtract EROM and the
  later kill adjustment; player scores add them (`NOVA.FOR:142-157`). No random
  draw is inserted on this branch.
- Planet NOVA lock failure returns with initial hit fields retained but no
  damage/message/unlock. A successful hit subtracts three, reports under lock,
  then rereads builds and ownership before removal (`NOVA.FOR:160-178`). Zero
  builds survive; negative builds remove. MAKHIT clearing KLFLG must not replace
  the live build check. No finally-unlock is added around nonreturning ENDGAM.
- PLNRMV accepts nonnegative out-of-team-range PTEAM for neutral-style removal.
  Captured counts and BASKIL precede four distinct forward BLKMOV column calls;
  each reevaluates index/count after earlier calls. The final row stays stale.
  Shifted board cells are updated by DISP-1, even for zero/sentinel values,
  and ENDGAM runs after every valid removal (`PLNRMV.FOR:31-58`). Actual BLT
  exceptional spans and full memory alias behavior remain required services.

## Torpedo driver fidelity

- The critical-tube check precedes BLKSET of seven contiguous TOLOCL words.
  Empty ammunition still clears that memory. SHORT's empty-ammunition branch
  calls CRLF before its count; other verbosity modes use TORP01
  (`TORP.FOR:35-45,254-257`). Preserve output state rather than trimming blanks.
- A positive initial LOCATE result skips the odd-count gate applied to prompted
  input. Target-only RELOC accepts zero as even. The target-pair reuse test is
  TEM>=I+2, so partial inline input can copy stale VALLST values
  (`TORP.FOR:49-78`). Do not repair this grammar or clear stale token words.
- All burst targets are checked before PAUSE. After the wait, RED is set and
  sender fields are assigned before the IFLG abort test. Deflection precedes
  the second own-position check; ammunition and critical damage are not
  revalidated after waiting (`TORP.FOR:82-110`). Normal exits assign
  TOBANK=ETIM(TIM0)+TPAUS, including own-location errors; alternate returns do
  not. TORP never assigns PTIME (`TORP.FOR:234-263`).
- Deflection adds independent RAN draws for normal error, damaged tubes or
  computer, and positive shields. Range uses signed INT truncation; TPAUS adds
  (SLWEST+1)*1000 and current tube damage on every fired shot
  (`TORP.FOR:102-118`). Real arithmetic/RAN remain required machine services.
- A misfire is strictly IRAN(100)>96. It adds deflection, sets IFLG=-1, may
  damage tubes, then goes back to label 900 and resolves that torpedo. A later
  iteration aborts after assigning sender fields (`TORP.FOR:94-118,242-250`).
- Every nonempty CHECK result consumes a collision IRAN(100). Only exact
  DCODE=900 takes the star branch. Above 80 reports instability, then label
  1000 rereads ARAN after MAKHIT; at/below 80 reports a nova, subtracts 500
  player points and calls SNOVA (`TORP.FOR:119-137`). Do not combine these
  tests into an if/else that caches the branch across the call.
- TORDAM receives the same IDUM reference in two argument positions. Full-base
  distress calls MAKHIT and then restores source hit fields before damage;
  the later destruction notice keeps sender fields cleared by the hit message.
  MAKHIT precedes TRCOFF. The destruction test reads the current CHECK cell
  (`TORP.FOR:159-192`). Later shots retrace the board after those changes.
- TOROM precedes the logical ROM/IRAN(10) jump test. Eager evaluation can consume
  that draw after ROM becomes false; the compiler evaluation service controls
  it. Score and reported location/energy use state after JUMP, while PRIDIS
  uses CHECK's collision coordinates (`TORP.FOR:203-210`).
- Planet-lock failure uses the inline empty-tubes text and returns alternately,
  retaining spent ammunition and TPAUS. Successful locking reads live LOCPLN
  coordinates/builds without revalidating the collision. IRAN(4)=4 subtracts
  one build; zero survives. A stale nonzero KLFLG also triggers removal, even
  with positive builds. PLNRMV precedes UNLOCK and MAKHIT; no finally-unlock
  is added if ENDGAM does not return (`TORP.FOR:215-230,262-263`). Compiled
  literal storage, full memory aliases and monitor scheduling remain required.

## Base and planet defense fidelity

- BASPHA selects opposite-side bases for PLAYER or both sides otherwise.
  NBASE is checked per team, strength per base, then the opposite physical
  player half is scanned. ALIVE, positive DISP and inclusive four-sector
  LDIS are independent gates (`BASPHA.FOR:33-49`). Do not validate the base
  again between shots or cache target eligibility for the whole call.
- PHADAM receives (3-I), writable K/ID, integer 200/NUMPLY and .FALSE.
  Defense damage and kill points go directly to the base owner's TMSCOR.
  Sender strength is read after damage. PRIDIS first uses current session
  TEAM at KRANGE, then extends at range four; BITS(K) is forced into the mask
  (`BASPHA.FOR:50-63`). No TRCOFF follows a defensive kill.
- Base fire at the Romulan uses the same divided power, reads EROM after
  PHAROM, chooses recipients around current LOCR, then awards damage/kill
  points before MAKHIT (`BASPHA.FOR:68-82`). The hit coordinates assigned
  before damage are not refreshed merely because LOCR changes later.
- PLNATK reads NPLNET for its DO bound and keeps each planet's PCODE/PTEAM
  across its targets, while subsequent board/build reads stay live.
  Neutral IRAN(2) exclusion precedes the friendly-PLAYER gate; compiler
  eager AND can evaluate this draw for captured planets. OR evaluation
  likewise controls reading ALIVE for same-side ships (`PLNATK.FOR:34-49`).
- Planet ship power is (50+30*builds)/NUMPLY with integer truncation, and the
  PHADAM target class is the literal 2 for every ship. PHIT/J/ID remain
  writable arguments. Only nonneutral planets credit owner TMSCOR. PRIDIS
  uses the planet owner plus nearby ships and does not force the victim bit
  (`PLNATK.FOR:53-69`). SHCNFR and preexisting KLFLG are not cleared at entry.
- Planet fire at the Romulan selects recipients before PHAROM and omits the
  NUMPLY divisor from its power. It does not silently share BASPHA's order or
  scaling (`PLNATK.FOR:74-91`). Negative builds are not sanitized, including
  negative damage/score effects in the ship path.
- BASBLD always evaluates 50/(NUMPLY+1) first. PLAYER then replaces it with
  25/NUMSID(TEAM), repairing the opposite side; nonplayers repair both.
  It ignores NBASE, skips nonpositive strength, and applies only an upper
  MIN0 cap of 1000. Zero/negative increments and source-position division
  failures are retained (`BASBLD.FOR:33-42`). Exception/trap delivery still
  requires the monitor/compiler contract, not an invented game message.

## Construction and capture fidelity

- BUILD sets its deadline to ETIM+SLWEST*1000+4000; CAPTUR uses ETIM+5000.
  Both do so before LOCATE/RELOC and adjacency validation. Normal paths set
  PTIME from the final clock, even when negative. Alternate returns preserve
  the previous PTIME (`BUILD.FOR:34-46,94-112`; `CAPTUR.FOR:33-45,92-125`).
- BUILD checks exactly four builds and NBASE==KNBASE before incrementing.
  Each successful increment immediately awards 500 times the new count; only
  exactly five enters conversion. Lock failure keeps five builds and its
  2500-point award. No free slot instead subtracts one build and unlocks, but
  leaves that award intact (`BUILD.FOR:50-71`). No repair or retry is added.
- Conversion scans physical base slots for strength<=0, adds another 2500,
  increments NBASE and copies LOCPLN's fourth column before PLNRMV. It unlocks
  before filling coordinates, setting strength=1000 and writing the board.
  ENDGAM inside PLNRMV sees those partial changes; no finally-unlock or base
  initialization is added if it does not return (`BUILD.FOR:66-94`).
- BUILD's uncaptured-planet message has no added newline. Its nonadjacency
  path has no initial CRLF, unlike CAPTUR. Conversion preserves ODISP/PRLOC
  formatting rather than printing a modern synthesized sentence
  (`BUILD.FOR:87-112`; `CAPTUR.FOR:115-117`).
- CAPTUR retains the class read before locking, then reads the current DISPX
  after its initial recipient calls. BASKIL precedes decrementing the old
  NUMCAP and changing the board. It can therefore retain docking supported by
  the planet being lost (`CAPTUR.FOR:49-62`). Do not reorder this cleanup.
- CAPTUR computes 50+30*builds defensive power, retains old build metadata,
  adds builds*1000 to its deadline and subtracts builds*500 from energy. It
  clears builds and unlocks, then stores the old display identity and changes
  ownership before PHADAM (`CAPTUR.FOR:63-75`). No population divisor, energy
  sufficiency test, negative-build clamp or ownership recheck is inserted.
- The old owner receives defense damage/kill points. Neutral capture can
  initially extend stale DBITS, but the post-damage team/range calls replace
  and extend it before MAKHIT. Capture points and PTIME come after MAKHIT,
  even on death; the final death test reads current energy/hull rather than
  KLFLG cleared by MAKHIT (`CAPTUR.FOR:53-55,76-102`). Fatal capture returns
  normally into automatic repair/turn accounting and retains tractor state.
- Compiler literal bytes remain required for the added inline failure text.
  Word references preserve BUILD I/TEAM into PLNRMV and CAPTUR TEAM/WHO/ID/PHIT
  into PHADAM. Live memory, monitor interleavings and complete numeric/runtime
  contracts remain required for a strict session implementation.

## Romulan targeting and torpedo fidelity

- DIST's /DISTLC/ contains sixteen words V/H/IV/Z. It clears only Z to
  KGALV*KGALH+1. Absent or sufficiently far candidates leave coordinates and
  indices stale; the routine still chooses a class and calls PDIST on them
  (`DIST.FOR:29-32,75-83`). No no-target result or infinite sentinel is added.
- Federation candidates test ALIVE; Klingon candidates test only vertical
  position!=0. Ships need DISP>0, while bases require NBASE>0, strength>0 and
  DISP!=0, including negative display values (`DIST.FOR:36-70`). Squared
  distance chooses candidates; PDIST supplies the returned range. Earlier
  slots win within-class ties. Cross-class tie draws retain the original
  OR/AND compiler evaluation contract (`DIST.FOR:75-83`).
- ROMSTR uses the first star in row-major order within clipped target±1,
  including the center, and assigns V before H. Reversed loop bounds require
  an explicit compiler contract (`ROMSTR.FOR:30-36`).
- ROMTOR draws deflection before checking prior MISFIR. A new misfire adds
  deflection and still fires. Misses skip directly to the next iteration,
  without a message or retarget; other completed collision paths retarget
  even after shot three (`ROMTOR.FOR:33-46,100-110,135-137`).
- ROMDRV passes CHECK's V1/H1 as ROMTOR direction arguments. CHECK writes
  those first output words before reading its direction arguments, so the
  aliases change the path. Required bindings must preserve the same writable
  storage (`ROMDRV.FOR:37,88-90`; `ROMTOR.FOR:30,44`; `CHECK.FOR:44-53`).
- ROMTOR star rejection is silent; a successful nova charges initial RSR
  star points before SNOVA. If ROM becomes false, it returns without setting
  RTPAUS (`ROMTOR.FOR:50-59`). No recharge cleanup is inserted on that path.
- TORDAM receives IDUM twice by reference. ROMTOR fills its sender fields
  afterward and forces IWHAT=2, replacing even type-3 deflection. Hit delivery
  precedes TRCOFF and base-destruction notices. MAKHIT clearing leaves later
  announcement sender fields zero where not rewritten (`ROMTOR.FOR:70-96`).
- Planet hits reuse ARAN>=75, read L after the lock, and preserve stale KLFLG.
  Lock failure skips notification, unlock and retargeting; successful removal
  precedes unlock/message. RSR loses 1000 for removal. Nonreturning PLNRMV
  retains partial effects and bypasses recharge (`ROMTOR.FOR:115-136`).

## ROMDRV scheduling, movement and caller state

- Population throttle occurs before PLAYER=false and TMTURN(3) increment.
  Creation waits and weapon waits after that point still count turns. Failed
  creation does not clear ROMCNT; successful placement precedes ROM=true,
  EROM initialization and NUMROM increment (`ROMDRV.FOR:40-64`).
- Appearance uses board code 501, adds privileged WHO to recipient bits and
  does not apply NOMSG. It neither resets RTPAUS/RPPAUS nor moves before the
  first target search. Later movement writes 500 (`ROMDRV.FOR:49-70,172-176`).
- The MIN0 test uses > and MAX0 uses <. Equality can choose torpedoes even
  while RTPAUS is in the future. IRAN(2) is drawn only when both deadlines
  are strictly earlier. Phaser recharge samples elapsed time and SLWEST
  after MAKHIT returns (`ROMDRV.FOR:79-83,95-119`).
- Movement adjusts each coordinate sequentially, uses CHECK with maximum
  range four, and reads its physical first pair of output words. Collision
  escape alternates negative vertical and negative horizontal candidates,
  accepts nonpositive DISP, and leaves LOCR unchanged when all fail. A new
  DIST after movement can change the target (`ROMDRV.FOR:143-208`).
- Phaser calls pass caller ID storage and fixed size 200; PHIT is untouched.
  Source metadata precedes PHADAM; hit type and destination follow it. Base
  destruction is announced after recharge with the cleared MAKHIT sender.
  Unlike ROMTOR, this path does not release a tractor (`ROMDRV.FOR:95-119`).
- Postattack TELL and BASPHA/PLNATK/BASBLD run without rechecking ROM. Their
  PLAYER=false context affects both teams. DECWAR can already have run its
  own defense cycle before ROMDRV, and leaves PLAYER reset to the later
  command loop (`ROMDRV.FOR:123-138`; `DECWAR.FOR:254-289`).
- Each column-D TIMIN/TIMOUT call is an explicit debugLine service. The port
  does not assume whether the compiler includes these lines or invent the
  monitor CPU clock/literal encoding. Their source boundaries, including
  early returns, are preserved; nonreturning calls do not trigger synthetic
  cleanup (`ROMDRV.FOR:40,124-137`; `WARMAC.MAC:4274` onward).

## DEBUG, timer allocation and diagnostic formatting

- TIMERS has 250 words, four fifty-word arrays and fifty remaining words
  (`HIGH.FOR:24`; `WARMAC.MAC:462-466`; `DECWAR.MAP:31`). TIMSTA/TIMLCN are
  separate local arrays (`WARMAC.MAC:674-675`). Caller-supplied storage keeps
  initialization and surrounding memory explicit. Their conceptual separation
  is not a claim of complete memory/session integration.
- TIMSRC reads exactly one argument word. Equality returns immediately,
  including a zero name. A vacant slot resets only TIMHI. Exhaustion writes
  ????? to index zero, retaining TIMCNT/TIMTOT but repeatedly clearing TIMHI
  (`WARMAC.MAC:4300-4310`). Unknown stop calls can allocate before local-name
  mismatch returns; different overflow names can match the same sentinel.
- TIMIN writes TIMLCN before CALLI; TIMOUT increments TIMCNT before CALLI.
  The CALLI -210 failure path uses zero, and stops retain TIMLCN. Nested starts
  overwrite local start times; no synthetic timer stack or lock is added
  (`WARMAC.MAC:4280-4298`). Clock values remain required monitor services.
- DEBUG's sign gate differs from a generic nonzero privilege test. Its denied
  output has no source newline. Direct success output does not update the
  normal output buffer's HCPOS/BLANK. Only number digits check HUNGUP
  (`WARMAC.MAC:4314-4348,4567-4582`). Generated literals preserve CRLF and tabs.
- Report time fields use IMULI 86400 then HLRZS, including wrap and unsigned
  left-half extraction. DEBDEC/DEBOCT preserve the remainder's half-word
  zero-extension and therefore unexpected full OUTCHR operands for negatives.
  The monitor decides how those operands become terminal bytes.
- The report traverses below slot zero if no zero name terminates it. The
  storage adapter permits physical aliases and requires explicit surrounding
  memory when outside its supplied window; it does not silently return zero.
  Full stack/accumulator aliases and historical trap behavior remain required.

## COMMON memory binding and physical aliases

- Generated HISEG/LOWSEG layouts cross-check the FORTRAN declarations against
  WARMAC's independent numeric dimensions, then DECWAR.MAP's linked sizes.
  The supplied map gives octal bases 400010 and 140 and lengths 2922 and 128
  respectively (`DECWAR.MAP:22,31`). Explicit relocation remains possible.
- HILST/HI.LST and INFLAG/INWAIT are different source names for the same words.
  HILST inherits INTEGER from PARAM.FOR:21 and agrees with assembly INTEGER.
  D-042 corrects the earlier implicit-REAL extraction error; the binding has
  always read raw words without float conversion.
- Caller-owned memory can be shared between job address spaces. Constructors
  do not zero memory or initialize DATA. Effective addresses wrap to eighteen
  bits; writes retain thirty-six bits. Unmapped addresses require a memory
  provider or raise an internal unresolved-access exception, not game text.
- Out-of-range subscripts follow column arithmetic into neighboring arrays.
  This supplies BITS(0), SHPDAM(:,0), TRSTAT(0), MSGFLG overflow, token-array
  overflow and timer underflow through ordinary source addresses. No bounds
  repair or synthetic index-zero word is inserted.
- The modern object/array APIs are live accessors over raw storage. Array
  shape is fixed; slice/reduce/fill still access each source word. Existing
  component constructors remain test helpers; the memory-backed PlayerSlot,
  Scores and KilledQueue views bypass their initialization.
- DOCKED's boolean-facing API requires a supplied logical test and true/false
  words. The raw cell remains accessible. No universal compiler logical
  convention is assumed. Packed token text/pointer conversion and complete
  unnamed routine locals, stack and accumulator aliases remain pending. Shared
  queue and named local COMMON storage are bound separately as described below.
- Exact LFZ:LLZ and HFZ:HLZ clears are exposed for existing startup/SETUP calls;
  they preserve the words beyond those source sentinels (`DECWAR.FOR:30`;
  `SETUP.FOR:241`). Full loader initialization and session wiring remain work.

## FORTRAN DATA and live text tables

- The selected build contains twelve FORTRAN DATA statements totaling 219
  words: 187 HISEG words and 32 private PRECMD words. Extraction preserves
  source target traversal, column-major offsets and destination types
  (`BLKDAT.FOR:26-101`; `SETUP.FOR:215-217,504-505`). It rejects an unexpected
  statement count or unsupported form instead of silently skipping it.
- Only the fifty numeric values have direct word encodings. The 169 quoted
  and Hollerith values require a supplied compiler encoder. PRECMD inherits
  INTEGER from PARAM.FOR:21; BLKDAT destinations are explicitly INTEGER. The
  earlier implicit-REAL metadata was incorrect and is corrected in D-042.
  Padding and compiled literal encoding are not inferred from JavaScript strings.
- DATA installation is explicit and separate from SETUP execution. Shared
  data must be loaded only when the shared segment is created; initializing a
  new job's private PRECMD must not reset NUMPLY, NUMSID or TIM0. Tests compose
  initial galaxy creation and a later join through actual SETUP and clear spans.
- BITS(11:18) remain untouched because the selected BLKDAT initializes only
  ten entries. The excluded DW2 initialization does not override it. NAMES'
  traversal, short suffix literals and XHELP's blank row remain intact.
- GETCMD/XGTCMD, HELP, SET, TYPE and DAMAGE accept live source-table readers.
  Component fixtures may still use extracted static tables; complete host
  wiring remains pending. Reads follow source order, including the second-match
  command ambiguity return and TYPE's label-before-OUT2W sequence
  (`GETCMD.FOR:92-98`; `TYPE.FOR:88-90`; `WARMAC.MAC:2093-2101`).

## Shared queue memory

- The initial WARMAC high-memory BLOCK span is extracted with its source
  radix changes and relocated using DECWAR.MAP:697. Queue addresses follow
  source allocation order, including both anonymous header words
  (`WARMAC.MAC:754-766`). They are not separate COMMON blocks.
- Memory-backed constructors preserve supplied words. SETQH/SETQM clear only
  headers and links, retaining HITSER and payloads (`WARMAC.MAC:3036-3050`).
  Legacy zero-initialized component constructors remain available to fixtures;
  production memory binding selects no initial BLOCK contents.
- Payload rows remain live views when written. Link/header underflow and
  payload overflow resolve through surrounding memory. GRIPTT's last two
  reads after HITQL reach real HITQ words (`WARMAC.MAC:4867-4878`). Memory-backed
  queue searches can follow links beyond the declared list. Cyclic or otherwise
  nonprogressing queue states still raise internal unresolved-state exceptions;
  these are not historical monitor behavior or game-visible errors.
- MAKHIT clears DBITS before its flag loop and processes all 36 recipient
  bits. Bound HITFLG overflow updates neighboring source words; bound sender
  indices are not clamped to ten (`WARMAC.MAC:3331-3354,3410-3418`). GETHIT and
  GETMSG use live BITS only on the successful counter branch. Index zero can
  use preceding flag storage and NAMES' last word through physical addressing.
- Cross-job tests compose actual OUTMSG, OUTHIT, GRIPE and FREE. They verify
  bytes, selective recipient removal and separate low memory, but do not
  establish a complete session scheduler. Instruction interleavings, argument
  indirection, stale-register cancellation, lock/monitor effects and the
  original POINT operand/assembler contract remain required.

## Private COMMON overlays and declaration types

- Type extraction now follows the selected routine's includes, retaining the
  source of implicit and explicit type rules. PARAM.FOR:21's all-letter INTEGER
  rule applies to HILST, PRECMD, LSTVAR and the POINTS flags. Explicit REAL
  declarations override it for CHKOUT's displacement words (`CHECK.FOR:42`).
  The earlier HILST/PRECMD metadata error is corrected, not retained as a
  compatibility choice.
- Fifteen views cover LOCAL, POLOCL, CHKOUT, DISTLC, FRLOCL, OMLOCL, SNLOCL and
  TOLOCL with declared lengths checked against the supplied link map. All
  overlays of a block use the same base; construction performs no initialization.
- LIST clears LOCAL offsets 0:107, overwriting pre-game identity and SCAN
  metadata but preserving CMD at 108 and later locals. SCAN's packed text
  begins six words into that block. Memory-backed byte accesses outside its
  window use surrounding words, while invalid SETSCN bounds and out-of-table
  symbol execution still require machine behavior (`LSTVAR.FOR:21-33`;
  `WARMAC.MAC:532-546,2799-2843`).
- DECWAR's nine-word TOTAL aliases POINTS' four totals, four flags and OWIDTH.
  Point flag views require an explicit logical-word policy. FREE/RSTART share
  the 45 FRLOCL words; standalone DUMMY remains a required separate reference
  (`DECWAR.FOR:27`; `POINTS.FOR:28`; `FREE.FOR:35-36`).
- DISTLC/SNLOCL/TOLOCL views preserve column and adjacent-field aliases. CHKOUT
  follows physical order across different caller names and requires a supplied
  REAL word codec. Test rational-ID encoding is deliberately artificial and
  provides no evidence of historical floating representation.
- Tests compose the actual routines with these views. Unnamed compiler locals,
  temporaries, stack/register state, input memory, monitor execution and complete
  session wiring remain required for strict parity.

## Input memory and GTKN storage order

- CCFLG., BUFPTR, CHRCNT and 81 LINBUF words form an extracted 84-word span
  anchored at DECWAR.MAP:701's octal 4627. LINBUF stores one character per
  word; PTRLST stores absolute addresses (`WARMAC.MAC:577,646-649`). Neither
  constructing the input object nor reading token views initializes memory.
- Memory-backed scanning preserves the current BUFPTR, packed TKNLST, numeric
  VALLST, type TYPLST and pointer PTRLST words. Token-array overflow reaches
  adjacent COMMON words. The earlier scanner retains an explicit floating dependency; the new raw
  ANUM/NXTT body below preserves X3 overwrite and floating-operation order
  through required CPU services.
- GTKN's CCFLG. test can skip its BUFPTR increment. A buffered slash advances
  before OCRL; a new line restores BUFPTR only after lock reacquisition. Forced
  QUIT preserves the first numeric value and both pointers. Appended EOL never
  writes PTRLST (`WARMAC.MAC:1670-1732`).
- Completed edited-line installation retains stale words after the terminator
  and counts the NUL in CHRCNT. Repeat reuses current LINBUF/CHRCNT and sets
  RPTFLG, rather than restoring a detached string (`WARMAC.MAC:1862-1885`).
  The companion INLI now edits those words per character; ICHR paths have
  explicit monitor services for reads, echo, flushing and interrupt delivery.
- USRNAM reads through actual PTRLST and clears BUFPTR after name writes at its
  exit. MAKMSG's raw-input paths use the live buffer. FORTRAN token text writes
  require a supplied compiler encoder; ASCII packing is not silently chosen
  for Hollerith assignments. STATUS writes all seven text words before its
  separate type loop (`WARMAC.MAC:3548-3559,4063-4102`; `STATUS.FOR:48-58`).
- Tests compose GETCMD, INPUT, GTKN, SET, STATUS, LOCATE, USRNAM and MAKMSG.
  Non-seven-bit character words still require original CBITS/out-of-table
  execution, and full indexed/indirect addressing, register/stack state,
  floating instructions and session/monitor integration remain required.

## Unresolved requirements for a strict release

1. **Floating-point instruction semantics.** RAN uses FSC, ANUM uses FLTR/FDV/
   FAD/FMPRI, PWR uses a particular multiplication tree, and FORTRAN mixes real
   expressions with integer assignment. The exact representation, rounding,
   normalization, overflow, and compiler conversion points are not specified
   by this archive. No Math.random/Math.pow/native-number substitution is accepted.
2. **ANUM's X3 side effect.** NXTT uses X3 as the five-character token counter;
   ANUM loads a floating scale into X3 when it sees a decimal point. It is not
   saved inside ANUM. This may overwrite token storage beyond the intended word.
   Decimal input currently throws an internal unresolved-behavior exception.
   It must not be exposed as a new in-game error message or called compatible.
3. **Compiler logic and expression evaluation.** Bitwise logical operations,
   IF(logical) tests on signed integer values, short-circuit/eager evaluation,
   alternate returns, shared ENTRY locals, and argument aliasing can all affect
   state and random call order. Ordinary JS Booleans and `&&` are insufficient
   as an unreviewed mechanical translation.
4. **TOPS-10 monitor and FORLIB.** The build references external FORLIB, UUOSYM,
   MACTEN, and monitor services. Those definitions/runtime binaries are not in
   the supplied source. Terminal echo, CR input transformations, flow control,
   paging, Ctrl-C interception, job identity, filesystem records, fatal traps,
   and job scheduling cannot all be proved from application statements alone.
5. **Telnet wire behavior.** No Telnet negotiation implementation occurs in the
   chosen build. The game talks to TTY/monitor services. A modern adapter is
   needed, but exact historical option negotiation or login dialogue has no
   local reference. The current codec is explicitly an adapter prototype.
6. **Original reference executions.** No running original executable, monitor
   image, compiler, or captured byte transcripts have been supplied. Unit
   expectations were derived from source, not observations of an original run.
7. **Concurrent ordering.** Locks are released for input and pauses; shared
   queues have capacity/eviction and recipient semantics. A single server can
   represent them, but serializing an entire interactive command is not proven
   equivalent to the original critical sections.

These are fidelity dependencies, not authorization questions. Independent
source study and integer-only ports can continue. Resolving them must use
additional user-supplied original material or an explicitly documented
compatibility assumption; do not fetch an outside implementation.


## Per-keystroke editing and direct monitor output

- INLI flushes before clearing BUFPTR and retains old CHRCNT/RPTFLG until the
  first accepted NXCH return. Only that first character can repeat. The buffer
  ends immediately at eighty characters, with a counted NUL. Deletion and kill
  leave stale words beyond the new terminator (`WARMAC.MAC:1860-1918`).
- NXCH preserves F's left half, classifies through extracted CBITS and strips
  CR/FF flags for any nonzero ECHFLG. Completion suppresses its LF and increments
  BLANK when INIFLG is negative or CF.FF is set (`WARMAC.MAC:1887-1898,1927-1939`).
- ECHG has no state effect: both destination routines immediately return in the
  selected source (`WARMAC.MAC:1313,1324,1970-1973`). No terminal echo behavior
  is inferred from their unreachable instructions.
- DISP and kill use direct monitor calls, with a separate HUNGUP test before
  each output. DISP reads character right halves and caret-encodes only codes
  below 7 or between 14 and 31 (`WARMAC.MAC:1909-1918,1942-1968`).
- Input state aliases and ICHR branches are now memory-backed; OCHR/direct
  output, monitor reads and AOBJP execution remain required services. Tests establish source-derived component/composition behavior, not
  physical terminal, interrupt, complete CPU or original-executable equivalence.


## Character input, INI switching and runtime words

- ECHFLG through IC is an extracted 97-word span overlapping LINBUF, with live
  LOWSEG aliases for HUNGUP/CCFLG/BLANK and INFLAG/INWAIT. Constructors perform
  no loader initialization (`WARMAC.MAC:518,641-661`; `DECWAR.MAP:701`).
- ICHR.T's interrupted/hung-up path returns LF, not the ESC mentioned in its
  comment. Entry interruption preserves INWAIT; interruption after a read
  leaves INWAIT=0. CCFLG stays unchanged and monitor input is cleared only
  while not hung up. NUL and CR restart reads (`WARMAC.MAC:1642-1659`).
- ICHR.B decrements before checking the counter, consumes NULs, retries after
  non-skip IN and treats skip as EOF. The counter, pointer indirection and IN
  instruction stay live (`WARMAC.MAC:1631-1640`).
- IICH tests negative CCFLG after reading a nonnegative character. It clears
  CCFLG on cancellation but preserves it on EOF. Echo skips BEL and negative
  ECHFLG; positive ECHFLG still echoes. Handoff preserves source close/flush/
  selection/state/register order (`WARMAC.MAC:1284-1306`).
- SETI preserves the unmodified halves of X1/IBFLB and reads descriptor words
  after preceding writes, including aliases. It replaces IC, buffer addresses
  and IN/channel in source order (`WARMAC.MAC:1552-1572`). Missing monitor
  offsets and assembler opcode values are required; test values are artificial.
- Tests compose buffered INI EOF, SETI, terminal ICHR and INLI in one partially
  edited line, and compose suspended terminal input with GTKN forced QUIT.
  OPEN/CLOSE, monitor execution/echo, complete indirect CPU dispatch, arbitrary
  interrupts and a full session host remain required for strict parity.


## Output storage, word accounting and suspension

- SETO preserves X1's right half and OBFLB's left half while choosing the left
  halves of the file routine/buffer descriptor. It reads aliased words after
  preceding writes and constructs OUTPUT/channel in source order
  (`WARMAC.MAC:1522-1541`).
- OCHR.B decrements the live indirect count before depositing. After a flush
  it saves the post-OUTPUT AC0, forces the current count to 80, restores AC0
  and retries. HUNGUP on that retry prevents deposition but leaves the forced
  count. Normal retry consumes one, leaving 79 (`WARMAC.MAC:1578-1592`).
- OCHR.T still accounts for C while hung up; only its direct monitor output
  is skipped. OCHR.X deposits before cursor accounting, so pointer/data aliases
  are visible to the common tail (`WARMAC.MAC:1593-1627`).
- HCPOS/BLANK arithmetic wraps at 36 bits. TAB applies an 18-bit immediate
  mask after its addition and clears C's left half before storing HCPOS. The
  previous JavaScript 32-bit masking was corrected; full C is restored after
  control handling (`WARMAC.MAC:1604-1627`). TerminalOutput shares this tail.
- INLI/DISP can await generator output services. Tests compose real buffered
  OCHR completion and suspended redisplay; source HUNGUP checks and buffer
  writes stay on their original sides of those waits.
- Actual IDPB, indirect CPU dispatch, OUTPUT/OUTCHR, undefined monitor/assembler
  constants and full command-output scheduling remain required. Captured output
  strings and test byte pointers do not establish a complete terminal host.


## OPEN/CLOSE shared state and failure paths

- File working state is a generated 700-word span anchored at STABUF; no loader
  values are invented (`WARMAC.MAC:676-738`; `DECWAR.MAP:743`).
- OPEN resets the single FL.FF and copies into shared FOBLK/LEBLK. Device-only
  opens preserve stale lookup words. Negative PPN substitutes GETPPN; SFDs
  receive no processing in this selected body (`WARMAC.MAC:1426-1461`).
- Allocation failure retains FL.FF and skips the final .JBFF store. FILOP failure
  shrinks only on X3/.JBFF equality, including static-buffer cases; shrink
  failure is ignored. Success return advancement precedes .JBFF restoration
  (`WARMAC.MAC:1430-1438,1476-1489`).
- Negative DEBFLG selects DSK/local PPN; positive flags special-case STA and
  GRP→MPH. Device-only opens can apply these rules to retained lookup contents
  (`WARMAC.MAC:1462-1475`).
- CLOSE executes the current channel instruction before examining saved FL.FF.
  It clears the saved word and restores .JBFF before page masking/CORE; warning
  failure does not undo state. WARN rechecks HUNGUP after flushing
  (`WARMAC.MAC:50-67,1495-1512`).
- Tests include OPEN/CLOSE allocation and NEWS input selection/restoration.
  BLT/FILOP/CORE/GETPPN/monitor execution, missing constants, actual job data and
  argument/return stacks remain required. There is no invented descriptor stack
  or production filesystem policy in these ports.


## Runtime descriptors and separate DECINI entry

- TTY/three INI/news/two help descriptors are extracted from 80 emitted words,
  with source octal arithmetic, SIXBIT, channels and relocation. Unknown
  monitor/private symbols require explicit resolution (`WARMAC.MAC:584-588,
  771-861`). The installer resolves before writing; historical partial loader
  failure behavior is not claimed.
- DECINI reads raw ASCII 1/2/3, rechecks HUNGUP after prompt/read, clears monitor
  input unless hung up and calls HIBER with raw octal 10 before validation.
  Invalid input retries; there is no ICHR filtering or INWAIT handling
  (`WARMAC.MAC:1239-1261`).
- Selected input clears BUFPTR, tries OPEN, and only on success invokes TTYON,
  OCRL and SETI before setting INIFLG=-1. Saved P1/X1 restore on normal return
  (`WARMAC.MAC:1261-1277`).
- No selected source caller of DECINI was found. It must not replace the
  independently implemented token-based startup at `DECWAR.FOR:30-67`.
  Referenced DECWAR.BEG/INT/EXP contents are absent from the archive; synthetic
  test bytes are not evidence of their historical content.
- Tests compose extracted descriptors with DECINI/OPEN/SETI/GTKN and INI EOF/
  CLOSE/terminal return. Required runtime symbols, full loader/stack/monitor
  behavior and complete session wiring remain explicit dependencies.


## Compiler-facing initialization and reload

- RESET saves program registers only after monitor RESET. Low .JBFF avoids
  reading potentially absent SETUP; either missing condition transfers to START
  (`WARMAC.MAC:1118-1126`). Stack initialization, AC16 increment/PUSH and width
  precede GETTAB/SETUWP and interrupt writes (`1128-1163`).
- INTBLK+2 clears before .JBINT is stored; .JBAPR retains its left half. TTY
  OPEN sees BUFPTR=-1/ECHFLG=0 but the prior INIFLG. SETO/SETI precede clearing
  INIFLG, edit-prefix output and the current .JBVER right-half value (`1157-1182`).
- HALT is an explicit monitor boundary. A service returning from it means
  approved continuation to the following source instruction; no automatic
  retry/error substitution is added.
- START builds six RUN words from saved program identity and takes MONIT on a
  returning RUN. KILLOW retains its debugger skip, left-half restart flags and
  pre-CORE .JBFF writes even on failure (`747-748,4253-4273`).
- A composition verifies RESET/OPEN/SETO/SETI then FORTRAN experience input
  through ICHR/INLI/GTKN. Real job/private/register symbols, PUSH/POPJ, HALT,
  monitor reset/protection/APR/RUN behavior and full loader/session execution
  remain required; fixture behavior is not historical monitor evidence.


## Lock release and monitor exit

- The private 174-word lock span is checked between I/O and STABUF anchors;
  no lock/header/timer initialization is inferred (`WARMAC.MAC:663-675`).
- UNLO preserves queue left halves except the six deposited game bits. It
  masks T1, removes the highest full-word match, and leaves other duplicates
  and LOCKED untouched. FRELOK/STAUPD use game zero. DEQ success or error octal
  24 returns; other errors keep the source's partly unguarded diagnostic output
  (`WARMAC.MAC:4621-4651`).
- ZAPLOK scans live descending X2; KILALL restores it. UNLOCK clears LOCKED
  before raw release (`WARMAC.MAC:4594-4620`).
- MONIT's order is flush, disable restart, zap locks, RESET, WHO branch and
  MONRT. Zero WHO bypasses FREE and all appended JSQWHO cleanup. For nonzero
  WHO, the JRST .+1 after FREE must be resolved before deciding whether that
  cleanup executes (`WARMAC.MAC:1191-1211`). Literal-dot target resolution is
  an explicit unresolved runtime requirement, not assumed fallthrough.
- FORTRAN leaveGame now supports a yielding exit service and still sets WHO=0
  first. Tests compose it and failed RUN with MONIT/raw release. They do not
  establish actual DEQ, MONRT, register/stack or literal-transfer semantics.

## Lock acquisition and input wait composition

- LOCK. clears LKFAIL/HV.LOK before checking existing slots; zero can match
  empty storage. It remembers the key before ENQ. The full-table MOVE at octal
  200000 is a memory operation whose trap behavior is required, not an invented
  unconditional throw (`WARMAC.MAC:4476-4502`).
- Busy/error paths preserve raw HIBER operands, UCT failure values, signed
  36-bit deadline arithmetic and grant-before-cancellation ordering. Error 13
  is octal; decimal 13 takes the fatal path (`WARMAC.MAC:4507-4538`).
- Timeout diagnostics return to LOCK.0 without reloading T2 or reissuing ENQ.
  Their partial HUNGUP guards and ENQC first-word clear remain. Cancellation
  sets LKFAIL after yielding UNLO and leaves LOCKED unchanged (`4542-4565`).
- FNDLOK retains source table traversal and inclusive board bounds; source
  instruction comparisons, rather than the reversed fallback comments, select
  BBB for board addresses (`6423-6447`). SAVE/RESTOR stack effects remain required.
- GTKN, INPUT and PAUSE await a yielding UNLO before input or timed waits
  (`1682-1697,3873-3900,4010-4051`). Tests bind actual lock/input words but use
  explicit monitor fixtures. ENQ/DEQ/ENQC/UCT, HV.LOK interrupt delivery and
  arbitrary machine interleavings are not implemented by these fixtures.

## Active interrupt and APR behavior

- CISHNG is absent from DECCMP/CAN1; WARMAC's enabling call and copied handlers
  are commented out (`1156,6450-6556`). Standalone CISHNG.MAC and its old map
  symbols must not silently enable grant/hangup behavior in this selected build.
  HV.LOK's active clear/test have no corresponding active selected grant store.
- INTH pushes INTADR before its CCFLG. test. Negative CCFLG. skips processing;
  otherwise both flags become -1 and any nonzero INWAIT increments the full
  return word. It does not inject a character or inspect INTTYP (`4152-4162`).
- Nonzero TRPADR uses AOSE INTFLG: only -1 incrementing to zero admits a trap.
  Other results stay stored, including wraparound; a completed callback sets
  INTFLG=-1. The source data comment and obsolete handler prose do not override
  these operations (`708,4128-4150,4163-4174`).
- INTH saves fifteen ACs (octal 0..16) into live SAVR, excluding P. APRTRP
  saves sixteen (octal 0..17) into STABUF. Required BLT/stack services preserve
  the different bounds; fixtures are not evidence of all CPU side effects.
- APRTRP replaces P/S before GRIPE and only P afterward, then rereads FTLERR.
  No finally cleanup, register restoration or cached target is added. The
  no-target OUTSTR uses current AC0-derived indirection and has no HUNGUP guard
  (`6106-6126`). It now composes with raw GRIP.A/OCT.O and packed GRIPE logging
  using explicit stack, literal, status-header and file-service fixtures.
- CCTRAP and APRSET require effective argument addresses, not default zero
  or raw FORTRAN labels. Tests compose active handlers with input, cancellation
  and fatal output using explicit machine fixtures; full monitor delivery,
  PC/flags transfers, arbitrary instruction interleavings and session wiring
  remain required.

## Diagnostic stack/output state

- GRIP.A now has a register-based implementation with yielding output services.
  It rereads line words, instruction fields, saved P and table entries after
  the preceding output calls (`WARMAC.MAC:4774-4894`). GRIPE awaits this path
  before opening the file or cleaning up.
- The PDL loop's next address is a MOVEI effective address, masked to eighteen
  bits, and its bound is reread each iteration. The earlier component formatter
  omitted the address mask; both paths now retain wraparound. The loop always
  prints its first word before comparing (`4850-4862`).
- OCT.O uses a live argument stack with a negative sentinel and decrements
  X2 after pushing each digit. Nonpositive width still pushes one digit;
  output transfer retains the remaining stack and registers (`4896-4908`).
- The dump's 403 HITQL words include its header and two following HITQ words;
  this is not clamped to the 400-entry array. LOKTAB's twenty values also remain
  live through output (`4864-4893`).
- APR/GRIPE composition verifies captured-memory output and cleanup ordering.
  It does not establish CPU SAVE/RESTORE faults, literal-pointer execution,
  full OGCH/DBUF aliasing, monitor file I/O or original-executable parity.

## Live OGCH and extended descriptors

- DBUF initialization stores full .JBFF before replacing the pointer left half
  and clearing the count; no data initialization occurs (`WARMAC.MAC:4727-4731`).
- OGCH decrements the live indirect count and lacks OCHR.B's HUNGUP guard.
  A nonnegative count enters OCHR.X even while hung up. CORE failure returns
  after WARN without byte deposition or cursor accounting (`4983-4992`).
- Growth uses the current DBUF pointer and wrapped MOVEI endpoint, retains
  T1/T2 changes during CORE, then clears the following words using BLT. It resets
  DBUF's count but retries through the current @OBFCTR (`4993-5001`). The two
  addresses need not still name the same word after an intervening operation.
- GRPFIL and the four statistics descriptors are now extracted with their exact
  channels, names, modes, protection bytes and SYSPPN expression (`862-920`).
  Monitor function/mode constants and private addresses remain required; loading
  all 135 words still fails before writes if any symbol is unresolved.
- The GRPFIL/SETO/OCT.O/OGCH/OCHR.X composition uses live memory with explicit
  CPU/monitor fixtures. Full GRIPE file-transfer/cleanup integration, monitor
  byte-pointer/CORE/BLT behavior and original-executable verification remain.

## GRIPE transfer and cleanup registers

- GRIP.2 discards only the first empty EOF line. Separator output precedes
  capture of DBUF's last pointer into both X2 halves (`WARMAC.MAC:4914-4925`).
- Failed OPEN distinguishes the live ERFBM% code. Busy retries preserve HIBER's
  HALT failure branch and the later Ctrl-C check; all cleanup paths still run
  CLOSE/SETO/PSHP even if OPEN failed (`4926-4939,4967-4976`).
- Adding the old-file word count to X2 is full-word ADDI; carry can alter the
  half used by the IN descriptor. Output construction retains SUBI/HRL/SUB and
  MOVSM effects, including borrow when the buffer address half is zero. Actual
  TMP words and zero sentinel are used, not an immutable descriptor object
  (`4941-4966`).
- IN/OUT's skip result enters the warning branch; OPEN's success result skips
  its failure branch. Services expose those distinct instruction conventions.
- Cleanup reloads full DBUF+.BFADR, writes FL.FF, waits for CLOSE/SETO/PSHP,
  then clears CCFLG. Register and memory changes across file/output calls remain
  visible; a nonreturning service does not trigger synthetic cleanup.
- A live OGCH/GRPFIL/OPEN/input/output/CLOSE/TTY composition is tested with
  explicit monitor/stack/byte fixtures. Raw interactive-driver integration and
  complete source-machine execution remain pending.

## Raw GRIPE input and selected output

- RED refusal precedes all initialization and is locally unguarded. The non-RED
  alert-check literal's JRST .+1 is an explicit target-resolution dependency;
  normal-path return is not inferred as literal fallthrough (`WARMAC.MAC:4715-4725`).
- GRIPE reloads ADDRCK after OSTS, tests EOF after OSTR.X and reloads WHO after
  OCRL. Warning output can change X2 before the continuation test. Those reads
  cannot be replaced with values cached before the calls (`4733-4768`).
- INLI writes its final CR/LF through the currently selected GRIPE sink before
  the driver copies LINBUF. Ctrl-Z includes CF.FF and suppresses that LF while
  retaining CR (`999,1885-1896`). The composed byte fixture retains the extra
  carriage return; component tests with preconstructed input lines omit this
  effect and are not equivalent input transcripts.
- ESHP skips nonpositive WHO and RED condition; PSHP skips nonpositive WHO or
  nonnegative ALIVE, but has no RED-condition check (`5295-5327`). Raw helpers
  retain source registers and delegate the actual SDSP operation.
- The raw driver joins DBUF, INLI, OGCH, transfer and cleanup in tests. Literal
  pointers/targets, full status/diagnostic/statistics composition, monitor services
  and complete session execution remain explicit dependencies.

## Shared string output and newline entry points

- OSTR resets the pointer left half; OSTR.X retains it. Both read live bytes or
  words through ILDB, terminate on full-word zero and await each OCHR call
  (`WARMAC.MAC:2135-2139`). Pointer encoding/indirection remain CPU services.
- OUT's initial zero-address return is distinct from its first-word, zero-left-
  half address heuristic. A zero value from the latter is not another early
  return. The newline argument is read after the string finishes (`1987-1996`).
- OUT2W stores its first word before reading the second argument, and output
  scans actual TMP storage. OUT2C reads the current argument again for its second
  byte (`2079-2108`). Neither path snapshots all data before output.
- OCRL and CRLF are the same suppressing entry. The prior GRIPE service comment
  was incorrect; its component calls now use suppression. SKIP is the separate
  unconditional loop. Once OCRL enters its output path, it does not recheck
  cursor state between CR and LF (`2002-2006,2053-2064`).
- SPACES/TAB initialize C once and resume at their signed decrement; source
  output-side register changes remain visible (`2014-2032`). Shared raw string
  and newline routines now compose with GRIPE/OGCH and file transfer, while CPU
  pointer/argument and complete monitor/runtime behavior remain required.

## Raw field and integer output

- OSTBX's executable padding loop yields nine columns on early NUL/blank
  termination despite its ten-column comment; a full ten-character field remains
  ten. OSTB.X alone preserves the caller's pointer left half
  (`WARMAC.MAC:2145-2170`). This behavior is retained.
- OSIX ignores the width described in its comment and sets X1 to six. Its
  C/C+1 pair and X1 remain live across output (`2213-2224`). Actual LSHC and
  register aliases are required CPU/runtime bindings.
- ONUM masks the width magnitude through MOVNI/HRLZI effective-address halves,
  reserves sign space before division, and can emit only a sign for width one.
  Saved values, sentinel and digits remain live on the source stack. X2 returns
  the used width; internal ODEC./OOCT. restore only their saved X3 in addition to
  ONUM's restoration (`2234-2252,2280-2330`). FORTRAN wrappers are separate.
- Required MOVM/AOBJN/IDIVI services preserve unresolved CPU overflow, flags and
  failure effects. Tests use explicit instruction fixtures and compose numeric
  output through actual SPACE/OGCH/OCHR.X, not a production CPU or Telnet host.

## FORTRAN numeric wrappers and two-digit entries

- FORTRAN ODEC/OSDEC restore X1/X2/X3 and therefore discard ONUM's returned
  actual width. They call through the current T1 after sequential argument reads
  (`WARMAC.MAC:2340-2348`); internal ODEC. has a different preservation contract.
- OSFLT's sign-selection read precedes saving registers, and its number is read
  again afterward. OFLT does not perform the first read. Width is read only after
  IDIVI/MOVM split and magnitude operations (`2362-2373`). Argument aliasing or
  changes during a service cannot be replaced with an entry snapshot.
- OFLG is tested after integer output; once fractional output begins, a format
  change during the decimal point does not cancel the digit. That digit uses
  current X4 with MOVEI masking (`2374-2381`). No floating-point conversion or
  rounding is introduced.
- O2DG masks a negative remainder before its second divide and may emit character
  codes outside ASCII before OCHR byte handling. O2DB keeps hundreds and only
  replaces an exactly zero tens digit with a blank (`2180-2204`). Both preserve
  saved X1/X2 and reread the remainder after the first output call.
- Wrappers and two-digit paths now have raw compositions and tests. Production
  argument/CPU/stack/target services and full terminal/session binding remain
  unfinished; component string formatters are not the raw runtime replacement.

## Raw object, device and condition tables

- ODISP's ship entries use T2 indexing and, for long names, another level of
  indirection. Its negative/cloaked guards do not validate the ship remainder.
  The raw path delegates effective-address execution and masks the result for
  MOVEI, then reads the space argument only after output (`WARMAC.MAC:2393-2454`).
- ODEV short names are inline ASCIZ words; medium/long table entries are full
  pointer words. Its three OFLG tests are separate and indices may address
  adjacent storage (`2464-2502`). No synthetic device bounds check is added.
- OCOND reads DOCKED-1(WHO) even for WHO zero, then reads the condition argument
  only after prefix output. Short format still reads the long condition pointer
  before replacing it (`2511-2523`). Existing component formatters do not model
  these memory reads, faults, or interleavings.
- Raw ODISP/ODEV/OCOND now compose with shared OSTR. OCOND also composes with
  LOWSEG and OGCH growth; packed output preserves a prefix chosen before a
  format change and a condition read afterward. Relocation, CPU addressing and
  full session behavior remain unresolved production dependencies.

## Raw identity rows and gripe headers

- STAT reads player before count, then MOVN selects the starting X4. STAT.X/Y
  increment X4 as a signed word at each field; positive overflow can wrap into a
  continuing negative counter. Name words, PPN halves and player indices remain
  live across output (`WARMAC.MAC:2598-2708`). The raw path adds no row snapshot
  or table bounds guards.
- OOCT.'s returned X2 controls programmer-number padding. STAT.Y's final job
  width is two; STAT.X's is three. Shared raw formatters now execute these calls
  with the same saved-register stack and C/P1 register alias.
- OSTS's UNDAT/UNTIM use the same TMP, and XFRTMP advances X1 rather than P1.
  A returning failure can repeat old scratch bytes. Version remainder, WHO,
  game and option reads occur at separate source boundaries (`2536-2591`).
  Host date/time formatting is not substituted.
- GRIPE now has a composed test with the actual OSTS/STAT.Y header, FileBlock
  TMP, buffer growth and full input/file-transfer cleanup. CPU/monitor services,
  literal/identity relocation and complete session execution remain required.

## Raw time and output memory binding

- OTIM uses overlapping divide pairs through X4, which retains discarded
  milliseconds. O2D has no saved-register wrapper and reads live T2 after the
  first output. Later time components are loaded after earlier output calls;
  large hours and negative components retain source MOVEI behavior
  (`WARMAC.MAC:2110-2130`). CPU division and first-literal addressing are services.
- WARMAC's F/T0 and C+1/P1 aliases now share actual accumulator memory
  (`551-569`). The unnamed octal AC14 is not assigned a fabricated name. The
  register view preserves loader/caller values and faults on missing storage.
- Status output can bind actual LOWSEG/HISEG/LOCAL/FileBlock words, with JOB
  column strides and identity addresses from checked layouts (`541-546,2536-2708`).
  Literal/table relocation and POINT encoding remain required inputs. These
  bindings do not supply a CPU, stack, monitor or full session runtime.

## Raw SAVE/RESTOR and character-output stacks

- RESTOR compares the entire S word against the initial IOWD value before each
  POP. Equality branches into the underflow literal; HUNGUP only suppresses its
  warning, not its HALT. HALT .+1's continuation is not inferred as a return to
  POP (`WARMAC.MAC:82-103`). Stack CPU effects and literal output remain services.
- OCHR control accounting saves C on S after incrementing HCPOS and restores it
  only after cursor handling. Raw output now exposes both stack calls, so output
  failures or suspension do not fabricate restoration (`1599-1627`). Synchronous
  component accounting remains separate and does not claim these stack effects.
- Buffered output saves AC0 on P after XCT OUTPUT, forces the current indirect
  count to eighty, pops AC0 and rechecks HUNGUP. A failure between those steps
  preserves partial state (`1578-1592`). OCHR dispatch resolves @OC afresh.
- The full raw GRIPE/header composition now uses the same S memory for formatter
  and control-character saves. CPU PUSH/POP/flags, return transfer, underflow
  continuation and full session dispatch remain unresolved production services.

## Live FORTRAN arguments and common returns

- ARGBLK places a negative-count word before resolved EXP words and selects
  the first argument with MOVEI. Loading the static words is separate from
  executing selection (`WARMAC.MAC:201-208`); this does not infer the absent
  compiler's general calling convention or literal encoding.
- The shared @n(ARG) accessor uses current ARG and required indexed/indirect
  resolution on every access. It adds no count check, zero-address default or
  missing argument value. OUT decides its own zero-address early return; OUT2C
  and deferred line counts can therefore read a changed argument block.
- Public text bodies compose the accessor with shared TMP/string/spacing output.
  Numeric-wrapper tests likewise retain OSFLT's repeated argument read. Routine
  invocation/return, CPU addressing and compiler emission remain external.
- CPOPJ1 increments the actual full return word before POPJ P; the increment
  can carry beyond the right half, and POPJ uses live P after AOS (`932-933`).
  Required CPU services retain flags, failure and control-transfer semantics.

## Shared output-runtime body registry

- Public and internal output entries can now share registers, live source ARG,
  SAVE/RESTOR, cursor state and current OC dispatch. A target change after one
  emitted character affects the next character. Numeric wrappers still call the
  live address in T1, without replacing it with the initially selected routine.
- Required callAddress/jumpAddress services own target resolution/execution. The
  body registry has no unknown-target sink or host-output fallback. CPU and
  monitor method forwarding remains live across suspension.
- The registry composes routine bodies from WARMAC:1522-1627,1986-2708,4983-5001.
  It does not implement instruction addresses, every PUSHJ/POPJ effect, compiler
  literal layout or a complete session. Production adapters must provide those
  semantics before full historical execution can be claimed.

## Raw clocks and resumable TIME

- DAYTIM/RUNTIM both return in AC0 and store through their argument after the
  monitor call. RUNTIM clears AC0 before calling the monitor. ARG changes during
  the call affect the destination (`WARMAC.MAC:3959-3973`). A pure clock getter
  omits these source writes.
- ETIM reads its start argument after MSTIME, then performs two separate strict
  comparisons with at most one correction in each direction (`3990-3996`). An
  argument aliasing AC0 therefore sees the current monitor result. CPU subtraction
  effects and monitor calls remain required services.
- TIME awaits each heading before its clock expression and checks WHO only at
  the source branch. RUNTIM(D)-JOB(WHO,KRUNTM) requires compiler evaluation order
  and arithmetic policy; tests exercise two explicit choices without selecting
  a production default (`TIME.FOR:30-46`). D/temporaries and call blocks remain
  compiler bindings. Command slot 27 now has a composition through these raw
  clocks, real argument words and shared output.

## Resumable USERS/PRLOC and raw PDIST

- USERS always requests six fields; commented short/medium branches stay disabled.
  The divider is emitted before testing ALIVE at player six. PASFLG and privileged
  coordinates are read after prior output calls (`USERS.FOR:35-55`). I/NUM storage
  is supplied by the compiler adapter, not invented inside LOCAL/LINE.
- PRLOC arguments and TW retain source aliasing and later reads. Its PDIST/width
  compound test and relative subtraction use explicit compiler policies. WHO
  zero can address preceding SHPCON storage (`PRLOC.FOR:34-52`).
- PDIST's final CAIGE and MOVEI mask horizontal magnitude to eighteen bits.
  For arbitrary words this differs from the component's host maximum and can
  make unequal coordinates appear zero-distance to PRLOC (`WARMAC.MAC:4443-4451`).
  The raw path preserves it; bounded normal-coordinate tests do not prove this.
- Command slot 31 has a composition through resumable USERS, raw STAT/PDIST and
  shared numeric output. Compiler locals/temporaries, LOGICAL/.AND. evaluation,
  exceptional DO semantics and complete session execution remain dependencies.

## Resumable DAMAGE and raw EQUAL

- DAMAGE's first CRLF occurs before scanning current SHPDAM. An all-operational
  ship returns ALLDOK before inspecting the requested switches. Otherwise every
  alpha token compares with all nine current DEVICE words; one prefix can print
  multiple rows, including undamaged devices (`DAMAGE.FOR:31-55`). The token type
  is retested at the next outer iteration, not between matches for that token.
- Each row reads OFLG after ODEV, selects current WHO/SHPDAM after spacing and
  tests LONG after OFLT. The general header arithmetic IF selects its destination
  once; positive formats fall through to both labels even if format later turns
  negative. LONG-only padding/units use equality, not positivity (`45-75`).
- EQUAL saves P1/P2 twice across its wrapper/internal entry and C once, uses a
  scratch T1 pointer for the first-byte null test, then rereads the first byte
  through P1. Its erroneous substring conversion changes T0 instead of C. Raw
  execution retains that write and master-only folding (`WARMAC.MAC:4363-4402`).
  Five successful byte comparisons return -2 without reading a sixth byte.
- The new composition retains actual argument/token/device words, shared S/AC
  storage and suspending output. Compiler Hollerith encoding, locals/call blocks,
  LOGICAL/reversed-DO entry and raw DISP remain required bindings; the packed-board
  DISP test fixture establishes bounded-coordinate composition only. Full CPU
  PUSHJ/POPJ, exceptional DO behavior and session execution remain unfinished.

## Resumable STATUS

- The initial CRLF precedes OBIT selection. OBIT is a compiler-local word passed
  by reference, not a width recalculated from each later OFLG value. Row headings
  precede the following field-address/product reads (`STATUS.FOR:34-44,78-140`).
- Full reports write TYPLST(STOKEN+7), then seven TKNLST words, then the separate
  TYPLST loop. STOKEN remains live at these statements. Array overflow is not
  clamped: TKNLST(16) aliases VALLST(1) (`48-58`; selected COMMON layout).
- The top-of-loop compound predicate may emit CRLF before the second token-type
  test; a token changed during output can therefore be processed. EQUAL reads
  the current token at each comparison, and RADIO3 is the actual master string
  for radio selection (`62-73`).
- Arithmetic format branches use negativity, while width selection, shield
  suffixes/continuation and final non-alpha newline use equality with SHORT.
  An OFLG of -2 follows different paths from SHORT=-1 (`35,63,78-88`).
- Radio status tests BITS(WHO).AND.NOMSG three times, around the separate Of/f/On
  calls. Current WHO, BITS and NOMSG are reread. OfOn or OffOn can result when
  the mask changes during output; the port does not normalize this (`151-159`).
- Shared raw numeric/condition/text output is composed with the STATUS driver.
  Compiler strings/1H words, expression temporaries, LOGICAL/arithmetic/evaluation
  policies, DO entry and complete CPU/session bindings remain explicit work.

## Resumable DOCK and raw LDIS

- DOCK computes its deadline first, then scans every live base and every planet
  admitted by the NUMCAP/NPLNET path. Contributions accumulate rather than
  selecting a single supplier. TEAM/WHO and following slots remain live across
  calls; NPLNET is a captured DO bound (`DOCK.FOR:34-52`).
- The no-supply branch precedes ALIVE testing and leaves PTIME untouched. The
  supplied-but-dead branch returns silently. Resource assignments remain ordered,
  with a second hull decrement if DOCKED tests true after the first (`56-74`).
- EQUAL reads the STATUS switch after DOCKIN output; STATUS(3) precedes final
  ETIM and PTIME. A negative pause still takes the normal return, allowing the
  main loop's automatic repair and turn processing (`76-81`).
- Compiler operand/assignment order and integer arithmetic remain explicit
  policies for the written expression trees. The port does not force a current
  WHO destination before an expression when compiler order is unresolved.
- LDIS compares both full-word magnitudes with a freshly read range. It returns
  before horizontal reads on vertical failure. T1/range aliases and ARG changes
  during required CPU operations are retained (`WARMAC.MAC:4410-4421`).
- The new dispatch composition exercises DOCK/STATUS, raw clock/LDIS/EQUAL and
  shared output followed by existing automatic-repair/turn bodies. Raw DISP/
  DISPC, full CPU/call frames and complete session execution remain dependencies.

## Resumable REPAIR

- V is written before reading IL. Mode-based REPSIZ assignments are independent;
  an unmatched mode can retain its prior word. Docked override uses the required
  compiler compound LOGICAL policy (`REPAIR.FOR:37-43`).
- Automatic mode skips numeric-size parsing but still compares token two with
  ALL after the maximum scan/clamp. There is no type guard around ALL. Zero MAXD
  skips ALL, initial timing and device updates (`45-63`).
- The source does not reject negative numeric amounts. Multiplying them by ten
  can produce negative REPSIZ and increase every device's damage. MAX0 applies
  after subtraction, while the rate expression multiplies before dividing.
  Compiler integer overflow/division and evaluation/assignment order remain
  explicit policies (`47,59,62`).
- The DAMAGE actual argument is NTOKEN+1 evaluated after EQUAL returns. The
  report finishes before final ETIM. Mode three returns without PTIME changes;
  manual PTIME<=0 takes the alternate return and skips turn processing (`65-70`).
- REPAIR-command and DOCK-command compositions now use the resumable automatic
  REPAIR body with live memory and raw EQUAL, followed by the resumable turn path
  described below. Full compiler/CPU/session/world integration is outstanding.

## Resumable end-of-turn statements

- REPAIR's normal and alternate returns both resume at DECWAR label 3500. The
  other entry skips repair. Current NUMPLY is read after DOTIME increment, and
  DOTIME is cleared before the first defense/profiling call (`DECWAR.FOR:254-260`).
- Column-D profiling positions remain explicit required services. The sequence
  is TIMIN/BASPHA/TIMOUT, TIMIN/PLNATK/TIMOUT, TIMIN/BASBLD/TIMOUT, then current
  ROMOPT and ROMDRV(D1,D2). No failure cleanup calls are invented (`259-268`).
- ROMOPT and PRTYPE appear in logical IF statements despite INTEGER declarations.
  The new driver requires compiler interpretation; nonzero JavaScript coercion
  is not a default (`268,277`; HISEG/LOWSEG declarations).
- Life-support state is read after automatic repair and world calls. A docked
  ship retains reserves but can still fail the negative-reserve test. Warning
  ODEC selects current WHO/reserves after LIFDAM output (`274-280`).
- Player score, team score and TPOINT clearing are three ordered statements for
  each category. TPOINT is reread between additions; a later failure retains
  earlier writes. The driver does not reset PLAYER/PTIME (`284-289`).
- REPAIR and DOCK compositions now use this driver. Compiler policies and full
  defense/ROMDRV/profiling/CPU/session execution remain explicit dependencies.

## Resumable BASBLD

- BASBLD stores IB/IE before computing 50/(NUMPLY+1), even for players that later
  replace N with 25/NUMSID(TEAM). Preserve the first division and partial local
  writes on failure (`BASBLD.FOR:33-36`).
- PLAYER and TEAM are read after that calculation. The nonplayer path selects
  both sides; the player path selects IB=2 for TEAM=1 and IB=1 otherwise, then
  sets IE=IB. No added team-range guard changes out-of-range memory behavior.
- The outer DO captures IE; all ten physical base slots are examined without
  consulting NBASE. Each live-base update rereads strength and N and caps only
  above at 1000. Zero and negative increments remain permitted (`37-43`).
- The new turn path composes the actual resumable BASBLD body. It uses required
  compiler arithmetic/assignment/LOGICAL/DO policies; no random draws or output
  are introduced. Full attacking-defense and machine/session execution remain
  unfinished.

## Raw public board routines

- DISP destroys ARG with V*KSID after resolving V. The horizontal argument is
  read first, and V is resolved after IDIVI. Later public calls must establish
  their own argument lists (`WARMAC.MAC:5337-5343`).
- ADDI receives the 18-bit effective address of -KSID(ARG/T2). ADD then uses an
  actual B12TBL word indexed by the current remainder. Invalid coordinates can
  address preceding table or surrounding COMMON words; no host bounds check is
  added (`5342-5344,5387-5390`; table `942-945`).
- DISP converts 4095 to -1 before CHKD. DISPC divides after that debug call;
  DISPX loads the remainder's right half rather than a signed host remainder
  (`5345-5368`). The explicit ordinary division fixture returns 262143 for
  DISPX on the sentinel.
- SETDSP's debug-enabled OLDOBJ store precedes the third argument read. DPB
  truncates to the pointed byte; MOVEI then exposes the current full input's
  right half to CHKD (`5390-5397`). Aliased OLDOBJ arguments see the old cell.
- DEBUG. is enabled in the selected source. Required CHKC/CHKD services cannot
  silently become disabled debug. CHKC/CHKD/TRAC now execute in the board
  fixtures, including privileged diagnostics; CPU flags/traps, actual return
  frames and monitor operations remain required. DAMAGE/DOCK use raw reads.

## Board diagnostics, trace and internal pointers

- CHKC first checks PASFLG, then saves T0 and reads V; an invalid V skips the
  initial H validation. The diagnostic rereads V/H after output calls and
  restores saved registers (`WARMAC.MAC:5483-5510`). It does not reject the caller.
- CHKC clears X2 only before the first ODEC. The horizontal value inherits its
  returned width, retaining source padding or asterisk overflow (`5500-5505`).
- CHKD uses HRRZ T1,T0 and actual inclusive RNGTBL ranges, but prints current
  full T0 on failure (`5521-5560`). The raw -1 sentinel is therefore diagnosed
  when PASFLG is nonzero; it is not exempted based on the source comment.
- TRAC sign-extends P's left half for depth, skips its own return frame, reads
  names through actual memory and emits all six SIXBIT characters, including
  padding. HUNGUP is checked after the final OCRL before OUTPUT TTY (`5568-5583`).
  Synthetic fixture frames verify this walk, not original compiler stack layout.
- GPTR uses MOVEI for H-1, so zero H becomes 262143 before division. It uses
  B12TBL-1; GDSP/SDSP increment the pointer for their byte operation. GDSP returns
  4095 unmodified. SDSP saves T3 through the same S stack used by output and
  restores its live saved word after pointer construction (`5439-5471`).
- Public board diagnostics, internal board helpers and ESHP/PSHP now compose in
  tests. Broader runtime adoption, actual CPU flags/traps/call frames and monitor
  behavior remain required; no host exception replaces diagnostic continuation.

## Resumable BASPHA

- JB/JE select both teams unless PLAYER is logically true, in which case the
  source computes 3-TEAM. DO bounds and computed opposing player intervals are
  required compiler policies, not host truthiness or an added team-range guard
  (`BASPHA.FOR:33-44`).
- ALIVE, DISP>0 and LDIS are separate source checks; positions and codes are
  read afterward. PHADAM gets actual K/ID words and compiler-evaluated 3-I and
  200/NUMPLY expressions. A division failure occurs after hit metadata and ID
  have been stored, with no score or notification yet (`44-55`).
- Damage score precedes current base strength and kill score. PRIDIS uses the
  current job TEAM, then appends nearby recipients and current BITS(K). The
  victim remains included after death; metadata retains its earlier coordinates
  while recipient searches use current ones (`56-63`).
- The current base is tested once before scanning targets. A later zero strength
  does not cancel its remaining eligible attacks. Future slots and target ALIVE
  words are still read live (`40-64`).
- Romulan damage precedes metadata and PRIDIS; KPRKIL gets damage afterward,
  then a bonus based on current ROM. Both ship and Romulan power divide by
  current NUMPLY without a lower clamp (`68-82`).
- BASPHA now composes in the shared turn runtime with raw board/distances and
  existing damage/recipient/queue components. The explicit rational numeric and
  synchronous CPU fixtures do not prove production floating arithmetic, full
  suspension/call frames, or original-executable equivalence.

## Resumable PRIDIS

- LI/LJ initialization precedes IFLAG tests, which are two distinct reads.
  ZERO is then tested numerically for zero before DO bound evaluation. Aliases
  among arguments, locals and DBITS observe these stores (`PRIDIS.FOR:35-39`).
- The source excludes only ALIVE>0; zero and negative words remain eligible.
  It has no visibility, ACTIVE, population or alive-as-LOGICAL condition (`40`).
- Raw LDIS receives actual IV/IH/ILIM addresses for every target. Coordinates
  and limit can change across targets or between axis operations. IV may alias
  DBITS, causing recipient accumulation to affect later distance origins (`41`).
- The result uses required compiler LOGICAL interpretation. DBITS/BITS(I) are
  then evaluated for a full-word OR assignment, with no added ten-bit mask or
  cached pre-distance bitmap (`41-42`). Prior writes survive later call failure.
- BASPHA composes this resumable path and can pause before hit delivery. Actual
  compiler/CPU frames, exceptional DO-variable mutation, broader caller adoption
  and complete monitor/session behavior remain explicit unfinished work.

## Resumable PLNATK

- NPLNET<=0 returns before local stores. Otherwise the loop captures its bound
  and each planet captures PCODE/PTEAM before neutral/friendly conditions.
  Later display reads and build counts remain live (`PLNATK.FOR:34-39`).
- IRAN(2) is an operand of .AND., so compiler evaluation controls its draw
  schedule even for a captured planet. The production driver requires that
  policy explicitly, including ordering across suspension (`38`).
- Ship PHIT is stored before PDIST. PHADAM receives literal kind 2 and actual
  J/ID/PHIT words. Failure dividing by NUMPLY preserves prior PHIT and ID after
  metadata writes. No lower power bound or population guard is added (`53-61`).
- Damage precedes owner scoring and recipient searches; current PCODE/PTEAM
  determine scoring. No SHCNFR/KLFLG reset or forced victim bit is added
  (`55-69`). Future attacks may retain state from preceding calls.
- Romulan recipients precede distance and damage. Its power remains undivided
  and can observe builds changed after SHSTFR was stored. EROM and ROM are
  reread after PHAROM; neutral team scores remain excluded (`74-91`).
- Both defenses compose in the shared turn runtime with raw board/distances
  and resumable PRIDIS. Scheduled RNG, rational REAL, earlier damage/hit
  components and compiler/CPU fixtures remain explicit test boundaries.

## Resumable PHAROM/TOROM/DEADRO

- PHAROM sets IWHAT before evaluating its hit expression. Its PHIT/ID reads,
  random call, multiplications and divisions follow required compiler operand
  policy. IHITA is assigned before a separate energy expression rereads it
  (`ROMDRV.FOR:212-216`). Argument aliases see those writes.
- TOROM never reads PHIT/ID and caps only above at 2000. Both entries preserve
  separate integer truncation when converting IHITA to energy loss. A surviving
  call retains prior KLFLG and does not require ROM to be true (`228-233`).
- DEADRO ignores its arguments and retains IWHAT/IHITA/EROM. The death path
  writes KLFLG=2, then the required false word to ROM, then calls SETDSP with
  actual current-position addresses (`220-224`). No notification or score is
  added here; callers retain that responsibility.
- BASPHA/PLNATK now await raw SETDSP through these statements. A suspension or
  fault during board clearing retains preceding flag/energy writes and each
  caller's source recipient order. Scheduled RNG and compiler/CPU fixtures do
  not establish original machine execution or full session fidelity.

## Raw random-number entries

- SETRAN loads T1 before testing zero, uses MSTIME T1 only on zero, and stores
  current T1 after completion. It adds no seed normalization (`WARMAC.MAC:2716-2719`).
- RAN. repairs only a zero right half, then multiplies, clears the sign bit and
  stores SEED before IDIVI 257. Failure after that store retains the advanced
  seed; earlier failure can leave old seed and modified registers (`2745-2753`).
- IRAN reads its actual range argument after RAN., including aliases to SEED,
  T0/T1 and a changed ARG block. There is no positivity guard. MOVEI masks the
  remainder-plus-one result to 18 bits (`2728-2731`). The older component's
  extra positive-range restriction has been removed.
- Public RAN ignores its dummy argument and requires FSC T0,200 after the raw
  integer quotient (`2740-2742`). Its actual floating result and traps remain
  required CPU semantics; no host floating approximation is silently selected.
- Seeded defense/Romulan compositions share the same private SEED. Other focused
  tests retain explicitly scripted RNG results. Full caller schedules, monitor
  seeding, CPU flags/call frames and full session behavior remain unfinished.

## Raw PWR/PWR. entries

- Public PWR saves X1/X2/X3 before dereferencing ARG, returns X1 through T0
  before restores, and leaves earlier saves intact on argument failure
  (`WARMAC.MAC:2762-2768`). PWR. ignores the FORTRAN argument block.
- Internal calls save X3/X4. Exponents below five load the required HRLZI
  immediate and make separate live comparisons before each multiplication.
  Negative exponents return that loaded word, with no reciprocal calculation
  (`2771-2785`). Live X3/X2 changes affect later multiplies.
- Larger powers divide X3 by two, recurse, square X1 and test live X4 before
  multiplying by X2. The saved remainder can be observed or modified through
  actual stack memory (`2787-2794`). Failures do not trigger added restores.
- IDIVI, FMPR, shared-stack operations and the resolved 1.0 immediate remain
  explicit requirements. The rational-handle defense fixture is an operation-
  order test, not a PDP-10 floating codec. PHADAM now awaits raw PWR through
  resumable statements (D-083); CPU flags/traps and return frames remain open.

## Resumable TORDAM/PHADAM statements

- PARAM.FOR:21,185 and TORDAM.FOR:31 distinguish five REAL locals and REAL
  RAN/PWR from integer POWFAC and arguments. All six locals now occupy actual
  caller-supplied words, without entry initialization beyond the source stores.
  PHADAM does not reset RAND/RANB or run TORDAM's guards (`35-43,119-131`).
- Typed expression services preserve integer subtraction before promotion,
  explicit FLOAT/INT, and separate hull/energy/score assignment conversions
  (`52-60,77-87,93-100,144-157`). Operand and destination evaluation order stay
  required compiler policies, including effects across suspension.
- Critical equality takes the critical path. IRAN(5) appears before the base
  predicate, but whether it is evaluated requires compiler compound-condition
  policy. Invalid device indices retain physical COMMON aliases (`66-82`).
- Deflection sets IWHAT/IHITA, updates shield strength and bypasses ordinary
  damage. A surviving ship can still JUMP. Stale KLFLG remains observable;
  surviving bases return at label 1300 even with that flag (`108-117,162-178`).
- JUMP receives actual NPLC/J words. SETDSP receives actual coordinate words;
  afterward ALIVE uses the current J. The source assigns integer zero to this
  LOGICAL field through an explicit conversion service (`110-116`).
- BASKIL receives the NPLC-2 expression temporary. Later count and board/strength
  updates reread NPLC/J, so a yielded call can change subsequent targets.
  Count and kill bonuses precede clearing and final strength zero (`179-192`).
- Both defense fixtures await the new body through raw PWR and SETDSP. Earlier
  synchronous damage adapters were removed there. JUMP/BASKIL now use resumable
  bodies (D-084); other callers and hit delivery retain component boundaries. Scripted RAN and
  rational handles do not establish production floating/CPU/compiler fidelity.

## Resumable JUMP/BASKIL and raw INGAL

- JUMP's DISV/DISH are physical CHKOUT words 6/7, named DHS/DVS by CHECK.
  Integer coordinate assignment occurs after mixed REAL addition. Required
  services expose operand order and conversion rather than choosing host
  floating behavior (`JUMP.FOR:30-47`; `CHECK.FOR:41-42`).
- Raw INGAL loads T1 even on rejection, checks full signed coordinate words and
  skips the horizontal argument after an invalid vertical value. It returns
  source 0/-1 words in AC0 (`WARMAC.MAC:4429-4436`).
- JUMP clears the old cell before separately evaluating the new board code and
  depositing it. A later failure does not restore the old cell. Class predicates
  are repeated between coordinate assignments; changed NPLC/J can alter later
  stores (`JUMP.FOR:54-65`). There is no added lock, collision recheck or rollback.
- Black-hole movement preserves old object coordinates and the hole while
  writing destination metadata and class-specific death state. ROM's J argument
  is unused in that path. .FALSE. to ROM/DOCKED and integer zero to ALIVE require
  explicit compiler conversions (`70-79`).
- BASKIL does not filter ALIVE. It scans every base slot only when NBASE is
  positive, tests strength before LDIS, and skips undocking when NUMCAP<=0
  (`BASKIL.FOR:33-51`). This apparently surprising branch remains unchanged.
- Planet bounds are captured through a compiler service; reversed bounds have
  an explicit entry policy. ITYPE+DXNPLN versus DISPC retains compiler operand
  order, and condition/DOCKED stores reread current I (`52-62`).
- The new damage composition awaits raw JUMP board writes and BASKIL port
  searches. A critically killed base may still have positive strength during
  BASKIL and keep an adjacent ship docked, even though damage clears it next.
  Broader callers, production numeric/CPU/compiler execution and full sessions
  remain unfinished.

## Resumable CHECK/CHKPNT and physical path state

- CHKPNT uses strict integer hundredths after INT(C*100), signed MOD, subtraction
  and IABS. The test fixture includes 41..59 rather than the prose comment's
  endpoint interpretation. Intrinsic edge behavior remains a required service
  (`CHKPNT.FOR:23-40`).
- C is reread after the branch; C1 is assigned before C2, and the two-candidate
  branch computes C2 from current C1. Input/output aliases and failed second
  stores retain these effects (`33-40`).
- CHECK writes H1, V1 and DCODE before choosing its branch. It rereads direction
  arguments for ISIGN and FLOAT expressions after branch selection, computes
  increments before DO bounds, and retains inactive REAL locals (`CHECK.FOR:44-50,69-72`).
- Each candidate passes the source axis-specific INGAL call and then DISP(H2,V2).
  The second candidate precedes any RAN, and actual CHKPNT output words can
  alias or change across suspension (`51-65,73-87`).
- Collision rereads DISP at label 800 and returns even if the reread is zero or
  negative. Galaxy exit restores H2 before V2, retaining earlier writes on a
  later failure. No retry or rollback is added (`91-95`).
- New CHECK→TORDAM→JUMP compositions use shared physical CHKOUT and one scripted
  draw schedule. Raw CPU, REAL/intrinsic, compiler/DO and monitor policies are
  still required; broader caller and full session/Telnet integration are open.

## Resumable MOVE/IMPULS and partial movement effects

- MOVE's V1/H1/DISV/DISH names retain CHECK's physical H1/V1/DHS/DVS words.
  CHECK receives actual coordinate and local arguments, and the following charge
  rereads IA rather than using a pre-call host snapshot (`MOVE.FOR:30,119-123`).
- Deadline and IRAN(4000) precede input. Label 600's RELOC tests only a negative
  result, leaving TEM unchanged and proceeding on zero (`44-66`).
- GREEN, DOCKED and computer-deflection changes precede range rejection. The two
  speed suffix predicates and three heat-warning predicates remain independent
  live reads across output calls (`68-107`).
- Full requested-distance energy is charged before locks, including a blocked
  path, and can become negative. Source-lock failure awaits destination unlock;
  destination failure adds no release. LKFAIL interpretation remains supplied
  compiler policy (`119-137`).
- Board clear, deposit and coordinate writes are separate. Failures retain held
  locks and completed writes. A wait does not trigger a new CHECK, and current
  source coordinates may differ from the earlier lock index (`128-143`).
- Towing follows unlock. Board expressions convert each direction before
  subtraction; stored coordinates convert the mixed REAL result afterward.
  Deposit precedes the old-cell clear even when both cells coincide (`144-150`).
- Final ETIM failure leaves the completed movement and old PTIME. Successful
  PTIME assignment precedes the caller's alive/repair decision (`156-157`;
  `DECWAR.FOR` movement dispatch). Normal, alternate and death paths are composed.
- This fixture initially used a LOCATE component token/text bridge; D-087 below
  replaces it with resumable statements and raw output calls.
  Raw call-frame, compiler/numeric/RNG/monitor and full session/Telnet bindings
  remain unfinished. These tests establish component composition, not original
  executable differential equivalence.

## Resumable LOCATE/RELOC and separate return stores

- Actual N is read independently by ISIGN and IABS after entry P initialization.
  RELOC's OUT and GTKN precede these writes. EOL preserves previous DV/DH
  (`LOCATE.FOR:42-60`). The minimum-integer intrinsic policy remains required.
- LOCATE and RELOC result addresses may be separate or alias, according to a
  supplied compiler binding. Their source assignments remain separate, with
  output preceding error result stores (`52-56,90-100,119-121,152-167`).
- Default and explicit relative offsets FLOAT each current WHO coordinate
  separately. Absolute numeric coordinates still use mixed REAL addition and
  integer assignment; the leading odd scalar bypasses conversion and range
  checks (`60-74,128-147`).
- Raw EQUAL preserves source prefix/five-character and lowercase-token behavior.
  The first ship-name match is checked for ALIVE and occupancy; an absent first
  match does not cause another name search. Coordinates are reread after DISP
  without rechecking ALIVE (`64-77,103-116`; `WARMAC.MAC:4363-4402`).
- The baud pause precedes token shifts. Each TKNLST/TYPLST/VALLST store rereads
  indices; PTRLST is not shifted. NTOK and return words change before count
  errors, and backward expansion retains completed later entries on failure
  (`79-116`). No token transaction or rollback is added.
- DO start/limit evaluation and reversed-bound entry require compiler services.
  Tests explicitly exercise different entry policies for zero-name and
  scalar-only computed requests; no historical policy is inferred (`87,103-104,126`).
- MOVE now composes the new LOCATE body and its raw output/comparison/coordinate
  calls. The earlier LOCATE token/text bridge is removed from that fixture.
  GTKN/PAUSE runtime, compiler call/return storage, numeric/CPU/monitor behavior,
  broader callers and full session/Telnet binding remain unfinished.

## Raw PAUSE/INPUT/CLEAR and monitor wait operands

- PAUSE preserves all three actual argument reads, including changed ARG and
  T1/T3 aliases. The initial nonpositive test precedes lock state writes. After
  UNLO, a nonpositive second read skips timing but still reaches reacquisition;
  the third read has no lower bound (`WARMAC.MAC:4011-4027`).
- The deadline is live T3. MSTIME effects precede ADD T3,T1, and each wake
  compares current T2/T3 after loading T1=1000. Midnight rewaits and wrapped ADD
  results remain visible (`4022-4036`). No host deadline or ETIM fix is added.
- HIBER failure executes HALT. The required service may transfer or explicitly
  continue at the following instruction; returning does not retry HIBER.
  Errors retain completed writes and released lock state (`3886-3888,4029-4032`).
- INPUT HRLI replaces the left half with the required HB.RTC halfword. Duration
  262144 therefore has zero low-half duration in the monitor operand, while
  PAUSE retains its separate cap. The older INPUT component now also masks
  the duration to 18 bits (`3884-3886`). Test flags are synthetic.
- INPUT checks HUNGUP before SKPINC and CCFLG, and does not repeat that check
  after a yielded SKPINC. Its result passes through actual shared S-stack
  SAVE/RESTORE, preserving CPU effects and changed saved words (`3893-3900`).
- Reacquisition loads T1 from current SVLOCK and enters internal LOCK. Literal
  JRST .-1/.+1 destinations require an explicit assembler/runtime service; the
  raw body does not silently assume a particular reload/retry target
  (`1685-1689,3888-3892,4037-4041`). Earlier components' retry loops remain
  component policies, not proof of assembled control flow.
- CLEAR does not set BUFPTR=-1 until CLRBFi returns. Existing HUNGUP skips the
  monitor operation but still discards the tail; failure preserves the old
  pointer (`3906-3909`).
- COMPUTED movement now composes LOCATE with raw PAUSE, actual lock release/
  acquisition and explicit clock/wake services. GTKN/NXTT, broader callers,
  production monitor/CPU/assembler bindings and full sessions remain unfinished.

## Raw token scanner and corrected hangup count (D-089)

- GTKN saves X1/X2 before CCFLG./BUFPTR changes. AOSE can skip the pointer
  increment; buffered OCRL and fresh INLI/reacquisition finish before F/X1
  initialization (`WARMAC.MAC:1672-1693`).
- Hangup's AOJA retains X1's negative loop-counter left half and bypasses the
  normal HRRZI count conversion. NTOK is -3670015 for KMAXTK=15, though the
  low-half indices write QUIT/EOL in slots one/two. The earlier forceQuit
  helpers were corrected; first VALLST and both pointers remain unchanged
  (`1693-1699,1721-1731`).
- NXTT consumes entire tokens while ordinarily storing five characters. It
  preserves F's left half, actual S saves and live CBITS reads without an added
  seven-bit address guard. CPU/effective-address behavior remains supplied
  (`1747-1793,1800-1805`).
- ANUM loads floating 10.0 into X3, overwriting the token character counter.
  Subsequent SOJL/IDPB can deposit beyond five characters; a later decimal point
  can resume previously stopped deposits. The raw body retains this and later
  token/EOL overwrites (`1771-1772,1823-1827`). Synthetic fixture immediates do
  not establish the original floating encoding.
- Fractional digits keep FLTR/FDV/FAD/FMPRI/SCALE-store order. Negative tokens
  use MOVN X2,X2 even when floating; no inferred floating-negation operation is
  substituted (`1789-1791,1837-1843`).
- GTKN overflow prints before clearing the count/pointer; EOL clears token and
  value but leaves PTRLST. Saved registers and completed writes survive faults
  (`1714-1732`).
- Prompted MOVE now uses raw GTKN/NXTT. An INLI composition exercises character
  input and raw output; production CPU/monitor/assembler/compiler semantics,
  complete input/session binding and broader callers remain unfinished.

## Raw terminal character input and editor state (D-090)

- ICHR resolves current IC through the supplied effective-address/transfer
  services. Terminal reads set INWAIT before INCHWL and clear it after return;
  monitor failure retains INWAIT. Early interrupt handling does not add a clear
  (`WARMAC.MAC:1629,1642-1659`).
- Forced LF precedes CLRBFi, which is skipped on hangup. NUL/CR retry and the
  post-read interrupt/hangup checks remain separate; the monitor read writes
  live C rather than returning a detached host value (`1642-1659`).
- NXCH reads live CBITS with the raw C index, retains F's left half and retries
  ignored characters before applying ECHFLG echo-bit clearing (`1927-1936`).
- INLI's initial OUTPUT precedes pointer clearing, and the first character
  precedes new-line count/repeat initialization. Repeat reuses current line and
  CHRCNT. Normal and NUL deposits increment the count first, retaining failures
  and physical aliases; LINBUF-1 is CHRCNT (`1860-1885`).
- Special-action tests reread F after echo/redisplay calls. DISP's direct monitor
  output bypasses OCHR accounting and uses current C/HUNGUP after a caret call
  (`1897-1914,1942-1964`).
- Final CR precedes current INIFLG/CF.FF tests and optional LF. ECHON/ECHOFF are
  still linked no-ops; explicit calls do not enable unreachable code
  (`1886-1894,1970-1972,1313,1324`).
- Prompted movement now composes raw editing and terminal character reads with
  GTKN/LOCATE/CHECK. Monitor echo, INI/file selection, real CPU/target addresses,
  broader callers and full session/Telnet binding remain unfinished.

## Raw buffered input and INI handoff (D-091)

- ICHR.B decrements the actual count as a 36-bit word, resolves the current
  pointer, loads C and retries NUL. A refill retries the count path; any IN skip
  sets C=-1. Failures retain preceding writes (`WARMAC.MAC:1631-1640`).
- IICH reads before testing negative CCFLG. Cancellation after a character
  clears CCFLG; negative EOF bypasses the clear. BEL or negative ECHFLG suppresses
  echo, and a returned OCHR is not followed by another cancellation check
  (`1284-1297`).
- EOF/cancellation saves X1/P1 on shared S before CLOSE. TTYON, DMPBUF, SETI,
  INIFLG/BLANK stores, P1/X1 restoration and IC dispatch preserve source order.
  Saved memory can change while a call yields; failed calls do not roll back
  earlier state (`1297-1306`).
- TTYON reads HUNGUP independently before OUTPUT and SKPINL. SKPINL's skip only
  skips JFCL. DMPBUF has its own guarded OUTPUT (`1335-1352`).
- Prompted MOVE composes INI reads, raw OCHR, CLOSE/SETI and raw editing/token
  input, including EOF midway through one line. Synthetic monitor constants,
  CPU byte behavior and target addresses remain explicit fixture policy.
  Production monitor/file/session and Telnet integration remain unfinished.

## Raw NEWS paging and file restoration (D-092)

- NEWS saves X1/X2/X3 before clearing .JBREN's left half and loading NWSFIL.
  OPEN failure warns and restores, without clearing CCFLG or calling CLOSE/SETI
  (`WARMAC.MAC:4661-4666,4703-4705`; WARN `59-66`).
- X3 is tested after ICHR and C is classified after OCHR. Only LF/VT/FF followed
  by a dot pages. CR does not qualify; NUL filtering belongs to ICHR.B
  (`4668-4693`).
- X1 carries the descriptor swaps. Paging calls TTYON/OSTR, selects previous
  input, runs GTKN, restores news input and invokes EQUAL. A negative T0
  continues. P1/P2 remain clobbered; only X1/X2/X3 restore (`4675-4685`).
- The EOL path checks CCFLG/.JBREN before WHO/ALIVE/ACTIVE. WHO is retained as
  full T1, with its right half used for indexing. Negative ALIVE clears ACTIVE;
  no host player-array bounds guard is added (`4692-4700`).
- Normal cleanup clears flags before CLOSE, then selects original input before
  restoring shared S words. Exceptions do not introduce cleanup or rollback
  absent from the source (`4702-4705`).
- Raw NEWS composes file operations, output, terminal editing, GTKN and EQUAL.
  Tests check supplied-file bytes across refills and command dispatch without
  a timed-turn update. Monitor echo, CPU/file behavior and full sessions remain
  unresolved production dependencies; tests do not establish terminal parity.

## Raw SHLP keyword and section state (D-093)

- Shared S saves precede initial flag clearing and OCRL. PASFLG is tested after
  output; only negative PASFLG tries HL1FIL, falling back to HL2FIL on OPEN
  failure. SETI precedes loading the keyword pointer from current P1
  (`WARMAC.MAC:5109-5124`).
- X2 is live section state. FF skips output but counts as a boundary; ordinary
  body output returns before C is tested for LF. Lookahead that is not a dot
  reenters C processing without another read (`5125-5148`).
- File input precedes ILDB T1,P2 on every keyword comparison. Space/NUL testing
  thus consumes a file character, including LF or EOF. Short LF-only headings
  can lose the first body line. Only five matching bytes are required, and
  signed case tests and current X3/T1/C are preserved (`5150-5165`).
- Missing-help output reads the keyword through P2 after OSTR and emits it with
  raw OSTB. Normal cleanup closes the file and restores input, then restores
  P2/P1/X3/X2 before clearing interrupts. X1 is not restored (`5167-5185`).
- OPEN failure warns and enters the common restore tail without CLOSE/SETI.
  A failed restoration retains interrupt flags; failed calls do not trigger
  host cleanup absent from the source (`5120,5179-5185`; WARN `59-66`).
- All 38 public help topics match supplied-file output through raw SHLP and
  packed refills. Outer HELP/list calls and production monitor/file/session
  integration remain open; these tests are not original-executable verification.

## Raw HELP list search and summaries (D-094)

- SLST's X3 starts at -1 and X4 holds match address,,index. Two independent
  AOBJP calls advance each two-word entry. No empty-list guard precedes the
  initial comparison (`WARMAC.MAC:5207-5223`).
- Ambiguity uses a nested P1 save. X2 is tested after the first ambiguity text
  and again after restoration; changes during candidate output affect the
  latter test. P2 is read after comma/space output (`5225-5242`).
- Unknown output uses X2's right-half address and current X3 after its prefix.
  Unique success loads P2/X1 and performs the return skip before restoring
  P1/X4/X3 (`5244-5263`).
- OLST prints seven entries per row, including ten-byte padding and blank
  entries. Pair read, TMP stores, terminator clear, OSTR and two pointer advances
  retain their order. CPU pair/pointer effects are required services
  (`5268-5285`).
- HLPXTR preserves the blank extra-topic slot and exact surrounding literals.
  HLPALL reads signed PASFLG after its preceding output calls; neither wrapper
  adds HELP's command-level checks or cleanup (`5074-5103`).
- All 38 public topics resolve through raw SLST/EQUAL into SHLP with source-file
  output checked. The outer HELP alert/token/ship path and production session
  semantics remain open; these tests do not establish original-executable parity.

## Raw outer HELP command and contiguous token output (D-095)

- Nonzero WHO enters the condition check, including negative WHO through its
  effective index. The RED comparison uses the full word; its direct OUTSTR
  has no HUNGUP guard and bypasses common cleanup. The non-RED literal jump is
  a required runtime transfer (`WARMAC.MAC:5013-5026`).
- ESHP precedes X3 initialization. Negative token types terminate the modifier
  loop; NTOK is unused and nonnegative types are accepted. The TTYON between
  the branches remains unreachable (`5026-5040`).
- Star matching precedes signed privilege selection. Ambiguous SLST skips extra
  topics; unknown SLST tries them. Successful P2 is read after the search and
  passed to SHLP (`5040-5058`).
- Raw SLST passes the physical token address to OSTB. Its ten-character field
  can cross the next token word: UNKNOWN followed by INPUT prints UNKNOINPUT
  in the unknown warning. The earlier component helper's isolated token text
  does not model this raw adjacency (`5250-5254,2145-2170`).
- HELP clears CCFLG before PSHP; PSHP reads current WHO/ALIVE and does not restore
  a nonnegative-ALIVE ship. Failed calls do not introduce host cleanup
  (`5060-5062,5316-5327`).
- All 38 public topics match supplied-file output through raw HELP, including
  actual board removal/restoration. Raw terminal input and DECWAR dispatch are
  composed in tests. Full session and production runtime semantics remain open.

## XGTCMD statement input and private command table (D-096)

- CMD is a caller address; I/PRECMD are private compiled storage. PRECMD DATA
  encoding and placement remain loader/compiler responsibilities, and lookups
  read current words through raw EQUAL (`SETUP.FOR:498-523,535-550`).
- CRLF precedes CCFLG clearing, then separate OUT2C calls emit PG and
  greater-than-space. INPUT retries without another prompt or flag check
  (`525-529`).
- GTKN precedes the compiler-controlled logical OR and MONIT call. KEOL retries
  before CMD=0; NTOK and non-KEOL token types do not gate command matching
  (`531-534`).
- The first match stays in CMD while later entries are scanned. Ambiguity and
  the arithmetic IF's negative branch are retained, including aliases or changed
  source words that make that branch reachable (`535-544`).
- Main-game-only and unknown errors have distinct source text; FORHLP is emitted
  before restarting at CRLF. Loop/argument writes survive failures (`545-556`).
- All sixteen slots, raw terminal/INI input, slash tails and HELP dispatch are
  composed in tests. Compiler DO/logical/literal/call semantics, outer PREGAM and
  production session/monitor/Telnet behavior remain open.

## Outer PREGAM identity, initial input and dispatch (D-097)

- JOBSTA receives the first six actual LOCAL words, then CCFLG is tested.
  Partial writes and aliases survive failures. PREGAM does not initialize WHO
  or other player/game state on return (`SETUP.FOR:117-133`).
- Initial input checks logical interruption before NTOK. Blank input returns;
  HONORROLL, HELP and PREGAME comparisons keep source order. Initial HELP calls
  both summaries and an extra TTYON before repeating the prompt (`128-144`).
- Entry announcements remain separate OUT calls. Continued FORTRAN string
  encoding remains required compiler behavior (`146-151,166-167`).
- N is read after XGTCMD returns. Out-of-range computed-GOTO indices fall through
  to ACTIVATE/PRGNAM. TYPE has no argument; SHOSTA true and POINTS false remain
  distinct. Only ZAP applies a logical password test (`153-194`).
- MONIT return resumes the source loop. Blank initial return and ACTIVATE are
  distinct: only the latter calls PRGNAM (`133,159-160,178-179`).
- Tests compose raw prompts/input, XGTCMD, HELP/NEWS/summaries and INI/terminal
  handoff. JOBSTA monitor results and compiled literals remain fixture choices;
  remaining routine/session/SETUP and production runtime bindings are open.

## JOBSTA speed, project and name semantics (D-098)

- The selected rewrite runs under RADIX 8. Codes greater than decimal 11 map
  to index 9 and speed zero; TRMOP failure maps to 300. The higher-speed comment
  does not determine executable behavior (`WARMAC.MAC:548,3738-3762`).
- Two GETPPN calls remain distinct. The second call's skip behavior determines
  whether USPPN is stored; the caller PPN is still written. USRPRJ uses the saved
  USPPN, with project 337 mapped to 70000 (`3662-3665,3776-3807`).
- The name-cache test ends its seven-bit field at bit 7 rather than bit 6.
  HUNGUP guards only the first ASCII-word clear. OUTSTR remains unguarded and
  occurs before CCFLG clearing (`3809-3827`).
- Direct INCHWL supplies T2; it is not the normal editor/input wrapper. There
  is no length bound before IDPB. LF, ESC and BEL end input; NUL and CR retry;
  Ctrl-C or CCFLG returns with partial state (`3828-3845`).
- Conversion clears TMP, not HAND. Short cached names preserve prior suffix
  bits. A zero first HAND word retries without resetting T1 from zero. Byte
  operations and the effects of that zero pointer remain CPU services
  (`3847-3867`).
- Actual private symbol placement, monitor echo/skip behavior and literal
  sequence continuation are unresolved production bindings. The tested shared
  terminal queue through JOBSTA and PREGAM is not a complete session host.

## PASWRD live expressions and saved project (D-099)

- PASFLG is INTEGER, assigned the raw EQUAL result. Only the prefix result -1
  is cleared before project checks; input count/type does not guard TKNLST(2)
  (`PASWRD.FOR:30-31`, `LOWSEG.FOR:56`).
- EQUAL receives the source third argument 1, although the selected assembly
  consumes only its first two arguments (`WARMAC.MAC:4363-4368`). No additional
  host exact-match policy is introduced.
- Four distinct USRPRJ(0) expressions compare projects 70000, 337, 70006 and
  70725 (octal). Compiler AND ordering/early termination remains a required
  service, rather than a cached project membership test (`PASWRD.FOR:33-36`).
- USRPRJ reads saved USPPN and maps 337 to 70000. A second JOBSTA GETPPN skip
  may leave this saved word different from the caller's reported PPN; the
  composed privilege path preserves the difference (`WARMAC.MAC:3662-3665,
  3788-3790`).
- The project condition is evaluated after an unsuccessful password too.
  PASFLG is reread for the logical return. OUT(UNKCOM,0) precedes the OFLG test;
  SHORT failure emits no added newline (`PASWRD.FOR:33-40`).
- PREGAM and main command slot 33 compose this body with raw input/output;
  compiler, monitor and full session behavior remain unverified. ZAP gate tests
  use an explicit statistics-operation substitute, not a production file writer.

## TYPE shared settings, terminal words and option rereads (D-100)

- P=2 is assigned before KIND is read, including when KIND aliases P. Only
  1/2 branch directly; every other value enters parsing (`TYPE.FOR:40-43`).
- Exact O is ambiguous before OUTPUT/OPTION matching. P is reread for each
  EQUAL call; GTKN's KEOL exit precedes P=1. Neither NTOK nor a separate
  interruption test guards these statements (`43-54`).
- Output settings are read after preceding output. PRTYPE/SCNFLG use two-label
  IF and require compiler branch policy; the fixture's signed-negative split
  is not established compiler semantics (`58-85`).
- OUT2W receives actual TTYDAT addresses, separately evaluated under caller
  policy. Index zero reads the preceding XHELP words (`87-89`, HISEG layout).
- Positive and negated option tests are separate statements and reread state
  after possible output. A changed option can produce both lines (`94-99`).
- CRLF can suppress another blank line based on BLANK/HCPOS; TYPE OPTION does
  not unconditionally prepend CR/LF (`WARMAC.MAC:2046-2063`).
- PREGAM passes no KIND (`SETUP.FOR:184`); explicit fixture binding permits
  composition but does not resolve the compiler convention. The production
  statement entry has no default KIND. Main dispatch uses the explicit zero.

## SET settings, terminal cancellation and privileged board clearing (D-101)

- Switch matching preserves source order and first-prefix success. Only after
  ordinary matches fail does NOT PASFLG gate privileged switches. Prompted
  KEOL returns before changing P (`SET.FOR:33-50`).
- NAME's first USRNAM argument is actual P; its second call uses literal zero
  after GTKN, even on blank input. Raw USRNAM remains a required binding here
  (`54-58`).
- Setting matches are independent, with current token/master reads after
  assignments. Unrecognized alphabetic values return silently (`66-70,
  101-104,113-116,124-127,134-138`).
- Terminal matching stores the first result and continues scanning. Ambiguity
  preserves that result/current I; unknown input leaves zero. Blank cancellation
  of the repeated prompt does not restore the old terminal index (`74-93`).
- ENDFLG assignment precedes ENDGAM. ROMOPT and ENDFLG use required compiler
  true-to-integer encoding (`142-149`).
- BHREMV traverses I then J, removing only DISPC=DXBHOL through actual SETDSP
  arguments. It does not clear BLHOPT and has no rollback on failure (`153-157`).
- SET → TYPE tests retain physical index-zero XHELP output. The compiler's
  DO/call/logical/assignment policies and complete session behavior remain open;
  USRNAM/ENDGAM test call boundaries do not establish their raw integration.

## USRNAM physical-line conversion and pre-game writes (D-102)

- T0 is cleared before reading the actual argument. Nonzero indices read
  PTRLST without an NTOK check; current CBITS determines delimiter detection.
  Only one delimiter is skipped (`WARMAC.MAC:4063-4075`).
- Reaching NUL before that delimiter retains TMP; entering the copy path
  clears two TMP words and copies at most twelve raw characters (`4068-4090`).
- Character conversion uses octal 137/040/100 arithmetic and six-bit IDPB,
  including control and out-of-ASCII character words, without host uppercase
  or input sanitization (`4081-4090`). CPU byte operations remain required.
- DMOVE supplies T1/T2. Either nonzero word is sufficient. WHO is read after
  that CPU boundary; true T0 precedes both actual JOB writes (`4092-4099`).
- WHO=0 writes the physical words before the name columns (the last row of
  the preceding columns), not LOCAL identity. A first write aliasing T3 can
  affect the second indexed destination (`4097-4099`).
- All normal returns discard BUFPTR, including missing/blank names. Failures
  do not run added cleanup. The physical slash tail can become part of the
  name rather than a later command (`4101-4102`).
- SET NAME now composes this body for terminal/INI input and main/pre-game
  dispatch. Production IDPB/DMOVE, monitor/runtime and full sessions remain open.

## ENDGAM conditions, sequential identity and final-call addresses (D-103)

- Compiler logical ENDFLG controls the initial bypass. Otherwise NPLNET and
  MIN0 precede KILHGH; true assignment follows it (`ENDGAM.FOR:35-42`).
- MAX0 is evaluated after ENDGM0 output. Zero, not nonpositive, selects total
  destruction; -2 is written after ENDGM1 output (`44-47`).
- Each base/team predicate rereads current state after prior output. Compiler
  AND evaluation remains explicit; WHO=0 skips player work (`48-54`).
- Identity copies read WHO separately for each JOB/NAMES expression. ETIM
  follows winner/reason assignments and precedes TXTEM (`55-66`).
- POINTS updates shared POLOCL, then TXTOT reads TOTAL(1). UPDSTA receives
  actual TX/WHO addresses; FREE sees current WHO through its address. WHO is
  zeroed only after FREE returns (`67-72`).
- SET ENDFLG now composes raw termination output and the required EXIT boundary.
  Player-path score/statistics/release fixtures test ordering and memory effects,
  not full downstream integration. KILHGH/EXIT platform behavior remains open.

## POINTS live predicates, totals and final DO continuation (D-104)

- BLKSET clears four totals before DFLG. Final entry sets flags and jumps into
  the token DO continuation without executing its initializer; the new body
  requires that compiler behavior explicitly (`POINTS.FOR:30-31,42,58-60`).
- Ordinary entry preserves sequential flags, default personal selection and
  pre-game exclusions. Raw EQUAL retains alias order (`32-64`).
- Deferred AND/OR policies determine whether SCORE(i,0) is evaluated in pre-game;
  physical memory is used when it is evaluated (`96-98`).
- Row short/long title tests reread OFLG after output. Each selected score is
  printed before being reread for TOTAL addition (`99-149`).
- OWIDTH and TOTAL are shared POLOCL words; integer division precedes OFLT and
  no zero-denominator fallback is installed (`154-197`).
- ENDGAM now composes the POINTS body through an explicit final-loop fixture.
  The uninitialized continuation, compiler arithmetic/evaluation and production
  BLKSET/CPU/monitor behavior remain unresolved; tests are not executable parity.

## Raw block entries and unconditional first write (D-105)

- BLKSET stores the value before rereading its destination and before loading
  size. Aliases can change either later read (`WARMAC.MAC:3918-3924`).
- AOJ increments the whole T1 word. The endpoint comes from masked MOVEI
  arithmetic followed by ADD and the right half used by BLT (`3921-3925`).
- Zero, one and negative sizes still reach BLT after the initial store. Their
  actual copy behavior is a required CPU service, not a host fill convention.
- BLKMOV builds halves and its destination endpoint before required BLT;
  ordinary overlap fixtures perform sequential live reads (`3935-3940`).
- LOCF returns an effective address without reading its destination contents
  (`3949-3950`). Live ARG/indexed argument resolution is retained.
- POINTS now composes raw BLKSET. The fixture only defines ordinary forward
  nonempty non-AC copies; exceptional BLT, CPU flags and wider callers remain
  unresolved rather than silently receiving host array semantics.

## FREE release ordering and KQSRCH aliases (D-106)

- ALIVE > 0 returns before locking. LKFAIL retry does not repeat that test
  (`FREE.FOR:38-42`); no host lock scope or automatic unlock is introduced.
- Last-player retention and killed-record timestamps invoke DAYTIM separately
  (`46-47`, `64`). ENDFLG NOT and ALIVE = 1 require compiler policies; the latter
  is not silently rewritten as an ordinary boolean assignment (`94`).
- KQSRCH resets KINDEX before testing NKILL, matches job/project in physical
  order, and refreshes job/project/terminal. Its terminal/age alternative remains
  commented out (`KQSRCH.FOR:31-47`). Aliased arguments can change through KINDEX
  or earlier row writes; no cached player identity is substituted.
- FREE reuses a matched row; otherwise it increments the count up to KQLEN and
  advances/wraps KILNDX. The fifth column uses integer OR, SNUM*262144 and TTEAM
  (`FREE.FOR:54-65`).
- JOB save/clear pairs and ship/device saves are individual assignments.
  Only shared position and energy are cleared (`70-84`). Failures retain all
  completed operations, without transactional rollback.
- Hit then message loops inspect current SNUM and flags. Messages use FRLOCL
  DUM; hits arriving during the message loop are not revisited (`86-91`).
- DBITS/DISPFR clears precede raw BLKSET over IWHAT's 17 words, which includes
  those two words; ALIVE assignment and unlock follow (`92-96`).
- ENDGAM now composes this FREE path. The new fixture explicitly requires
  TRCOFF/GETHIT/GETMSG when reached. RSTART, production compiler/monitor/CPU
  bindings, statistics and full session integration remain unfinished.

## RSTART availability, duplicated DUMMY and restore ordering (D-107)

- Current ship VPOS != 0 blocks restart; saved DISP > 0 blocks it separately.
  The negative board sentinel passes (`FREE.FOR:102-104`). Errors output exact
  FREE01/FREE02 text, call MONIT and resume at label 800 if it returns (`140-146`).
- The FRELOK retry begins at 801 and does not recheck either availability test
  (`105-106`). The extra 'RSTART' argument is retained at the call boundary;
  selected WARMAC LOCK only loads @0(ARG) (`WARMAC.MAC:4468-4471`).
- Logical true assignment precedes increments; integer team arithmetic is
  (SNUM-1)/(KNPLAY/2)+1 (`107-110`). Compiler assignment/arithmetic and loop
  policies remain explicit. There is no host player-range or ALIVE guard.
- Ten ship and KNDEV device assignments read current FRLOCL and SNUM/I words
  individually (`114-119`), without snapshot or rollback semantics.
- JOBSTA receives one DUMMY word twice and actual JOB destinations (`121-128`).
  The second name output overwrites the first DUMMY output. The following five
  assignments restore saved name/type/timestamps even after early JOBSTA return
  (`129-133`), including the raw Ctrl-C return path.
- Final SETDSP uses actual saved coordinates and TSHIP (`134`); it does not
  validate them against the destination ship. Unlock occurs only after that
  call returns (`135-136`). Failures retain preceding state and locks.
- FREE → RSTART composition is tested under declared compiler/monitor services.
  Complete session continuation and original-executable parity remain unverified.

## Raw GETHIT and TRCOFF release integration (D-108)

- GETHIT loads its player once, decrements HITFLG and branches on required SOSL
  behavior (`WARMAC.MAC:3447-3449`). A miss clears sixteen fields, leaves DBITS
  untouched and does not reconcile the count (`3450-3467`).
- Live BITS, physical slot order and T1/X2 scan effects are retained (`3469-3477`).
  CPU arithmetic and branch outcomes remain required services, including overflow.
- Payload halves and POINT fields are loaded individually (`3479-3517`). Source
  POINT tokens, including `10`, `13`, `23`, `28` and `35`, reach a required
  assembler/CPU adapter. Tests use a declared decimal-field policy, not an
  assertion that the archive resolves the assembler convention.
- DISP halves of 777777 octal become zero; shield LDB values with bit zero clear
  become -1. DBITS is loaded before ANDCAM removes live X3 at live X2 (`3518-3523`).
  Partial failures leave earlier decoded fields/counts and pending links intact.
- TRCOFF sets DBITS from deferred BITS(IP) OR BITS(TRSTAT(IP)), sets IWHAT=14,
  clears TRSTAT(TRSTAT(IP)), then rereads IP for TRSTAT(IP)=0 (`TRACTR.FOR:128-130`).
  Physical index-zero aliases remain exposed; MAKHIT follows both clears (`131`).
- FREE composes these bodies. The producer in one integration test is explicitly
  the earlier component MAKHIT; raw MAKHIT and GETMSG/queue-manager adoption are
  still required. Tests do not establish full session or original-executable parity.

## Raw GETMSG, search skips and removal locks (D-109)

- GETMSG decrements MSGFLG before its branch. A miss reloads @0(ARG), clears
  that current player's count and metadata, and preserves the buffer
  (`WARMAC.MAC:3621-3628`). Argument mutation can make the cleared count differ
  from the count originally decremented.
- X4 captures the buffer address before SRCH, while BITS is loaded through
  then-current T1 (`3630-3633`). Success uses X2's current low-half index.
- SRCH.X puts the previous entry's address in X2[L] and increments (P) on
  match; SRCH resolves that return, increments its own (P), then unlocks
  (`3227-3252`). Required call/CPU policies retain actual return-word effects.
- Header halves are read after search unlock; all-ones halves map to zero.
  Source SETZM T2 acts on AC2 (`3638-3646`). BLT copies sixteen payload words
  before REMV takes another lock (`3648-3652`). There is no atomic snapshot.
- REMV repeats the lock for any nonzero LKFAIL (`3265-3272`). Its inner body
  clears live X3 at the entry computed from X1/X2, then either leaves remaining
  recipients or rewires predecessor/header and zeros the slot (`3274-3292`).
- Queue debug code remains disabled by the selected DBQUE.=0 (`619`). Partial
  copies or relinks are retained on failure; no automatic unlock or rollback is
  installed. The test call adapter declares ordinary return-PC and BLT policies.
- FREE now uses raw GETMSG with FRLOCL DUM. Reservation/publication and raw
  producers remain separate adoption work; full session parity is not established.

## Raw queue reservation and publication (D-110)

- RSRV returns on any nonzero LKFAIL without scanning or unlocking; UPDT retries
  its lock (`WARMAC.MAC:3127-3132`, `3188-3193`). QRSRV/QUPDT perform their own
  final UNLO after the data changes.
- QRSRV tests the first word before AOBJN, then follows the required CPU branch
  and register result. It marks the slot before SUBI computes the low-half index
  (`3135-3139`, `3159-3165`). No descriptor-length guard is added.
- Full-queue recovery saves X3 and selects a recipient from the oldest linked
  entry via MOVNI/ANDI; it removes that recipient from every entry using SRCH.X
  and REMV.X, restores X3 and retries the scan (`3144-3155`). MSGFLG is unchanged.
- An eviction that frees no slots can select another bit on a later pass. Empty
  linked chains with reservations or entries having zero recipient halves may
  retry indefinitely. Raw routines retain this behavior; tests stop through a
  declared scheduled service, not an invented source exception.
- QUPDT sign-extends the header tail, updates predecessor/header before the entry
  word, and uses only X3's low half (`3196-3205`). It does not validate reservation
  state or recipient nonemptiness. Failures leave partial updates intact.
- RSRVHQ only clears LKFAIL (`3173-3175`); it does not return a queue slot despite
  the preceding old comment. DBQUE.=0 still omits debug publication output.
- Raw reservation/publication now compose with GETMSG and FREE. Remaining raw
  producers, queue initialization and complete session/CPU/monitor binding are
  not established by these tests.

## Raw MAKHIT record publication and notification counts (D-111)

- DBITS=0 skips sender scanning and only clears the sixteen hit fields. Otherwise
  WHO selects a forty-slot region, with first free-recipient slot or strictly
  oldest serial preference (`WARMAC.MAC:3330-3348`). No host player-range guard
  or serial-order sort is introduced.
- The literal block at 3344-3346 ends in JRST .+1. The raw body requires a
  continuation policy; the fixture declares return to the scan. This remains
  distinct from proving the assembler's literal transfer.
- HITSER is incremented and its low half deposited into the link before payload
  writes (`3350-3354`). Existing pending counts are not corrected on overwrite.
- Half-word and DPB writes load current fields independently. Source POINT tokens
  remain required assembler/CPU inputs; unused bits survive (`3356-3407`).
- Invalid IWHAT with nonzero PASFLG saves T1/T2/X1/X2, emits the original diagnostic
  with leading/trailing CR/LF, and restores the code before DPB (`3364-3381`).
  Early output failures leave the saved stack and partial record intact.
- Publication uses current X2/DBITS. DBITS is then reread and cleared before the
  full-word shift/increment loop; high bits can address beyond the player flag
  array (`3409-3418`). Fields clear only afterward (`3419-3434`).
- FREE/TRCOFF now composes raw MAKHIT/GETHIT. Tests use declared POINT, CPU and
  continuation policies; complete session and historical executable parity
  remain unverified.

## Raw MAKMSG arguments, input limits and stale cancellation (D-112)

- Zero DBITS returns before argument reads. Otherwise the negative argument count
  comes from -1(ARG); explicit text follows one extra address if the first word's
  left half is zero (`WARMAC.MAC:3536-3546`).
- Without arguments, the first semicolon in LINBUF selects the message tail.
  No semicolon prompts through OSTR and calls INLI (`3548-3559`). Ctrl-C reaches
  cancellation before RSRV; X2 is not initialized as a reservation index.
- The message header is written after reservation and before copying. Byte reads
  continue after AOJGE suppresses deposits. CR replaces the last deposited byte,
  then LF/NUL are appended (`3560-3585`). The declared ordinary policy retains
  75 text bytes; the body relies on required pointer/CPU/CBITS behavior.
- A read count <=2, including the terminator, uses the same cancellation as
  Ctrl-C (`3587-3594`). Raw REMV receives X3=-1 and current X2, including a stale
  predecessor half that may name AC0. No safe-reservation guard is added.
- Publication uses current DBITS, and the counter loop rereads DBITS afterward.
  It shifts the full word and leaves DBITS set during increments, clearing it
  only after completion (`3596-3607`). DISPFR remains unchanged by cleanup.
- Tests compose raw input, queue operations, GETMSG and FREE under explicit byte,
  CPU and monitor fixtures. Broader command/session adoption remains unfinished.

## Raw queue reset boundaries and shared sequence table (D-113)

- SETQH and SETQM write header -1 and first link zero before loading their
  relocated pointer literals, then call BLT through the last link
  (`WARMAC.MAC:3036-3040`, `3047-3051`). They reset only their own link storage.
- Payloads, hit serial and notification counts are retained. Tests expose stale
  counts to raw GETHIT/GETMSG and verify later producers continue using retained
  serial/storage rather than a freshly constructed queue.
- Literal reads and BLT remain live; failures preserve the header, first link
  and any copied prefix. The fixture defines ordinary forward-copy behavior,
  not exceptional CPU or monitor semantics.
- JOBSTA's JSQTAB binding now uses the actual queue-block field declared at
  WARMAC.MAC:757. Both resets retain JSQTAB and JSQTIM. Full SETUP/session
  initialization and original-executable parity remain unverified.

## RADIO statement ordering and live masks (D-114)

- RADIO checks TYPLST(2), independently of NTOK, after its initial CRLF and
  INDEX assignment. Missing/unknown actions prompt again; ON precedes OFF
  (`RADIO.FOR:35-46`). Raw EQUAL therefore resolves O to ON.
- GAG/UNGAG condition evaluation remains a compiler service. UNGAG is checked
  again after GAGTYP=0; target prompts reset INDEX to zero after nonempty input
  (`47-57`). Saved locals are not initialized on skipped paths.
- The first matching physical NAMES entry wins. Self-selection returns without
  changing the mask. No alive/damage/player guard is present (`59-75`).
- GAGMSG changes before the prefix output. I and ITEAM determine ODISP afterward;
  suspension or output failure does not roll back the mask. Clearing retains
  addition then negation, including required overflow policy (`67-74`).
- NOMSG uses current BITS(WHO); ON/OFF does not change GAGMSG (`77-85`). Raw GTKN
  uses slash command tails, while semicolon terminates command parsing
  (`WARMAC.MAC:1670-1793`), as in the existing parser body.
- Tests bind relocated ship display tables from WARMAC.MAC:2409-2439 and explicit
  compiler/CPU/monitor policies. Full session and transmission-path integration
  remain unfinished; this is not an original-executable equivalence claim.

## TELL live recipient and reply ordering (D-115)

- Sender damage returns before changing NOMSG or DBITS. Enabling the radio
  precedes the destination prompt; cancellation retains the old DBITS
  (`TELL.FOR:32-57`). Unlike RADIO, TELL uses NTOK for destination iteration.
- ROMULAN matching precedes RPTFLG rejection. Ship matching precedes groups;
  first matching NAMES wins, while a second matching nonzero GROUP name is
  ambiguous. All KNGRP slots are scanned, independent of NGROUP (`58-86`).
- Group pruning reads current BITS and ALIVE. Its `-(bits(j)+1)` uses separate
  arithmetic services (`78-81`); no inferred power-of-two mask replaces BITS.
- ROMSPK and explicit-buffer MAKMSG run before SNTROM and DBITS restoration.
  The relocation draw and coordinate loads follow those operations. INGAL,
  DISP, old SETDSP, horizontal/vertical assignments and new SETDSP are separate
  calls/expressions (`89-109`). Tests preserve their live reads and partial effects.
- The recipient scan tests damage before alive status, then NOMSG. Diagnostic
  ODISP uses DXFSHP*100+I even for empire ships. Diagnostic output precedes
  clearing the current MASK; output failure leaves the recipient selected
  (`127-145`). Mutating MASK while output suspends can preserve a rejected bit.
- PLAYER is reread for self removal. GAGMSG clears selected DBITS before either
  MAKMSG call; no rollback follows a send failure. Bits above KNPLAY survive
  filtering and reach raw MAKMSG's counter aliases (`147-163`).
- Speech content for the new raw composition is explicitly fixture-supplied;
  the existing component ROMSPK does not establish raw runtime adoption. Truth,
  DO, arithmetic, literals and monitor services remain required policies.

## Raw ROMSPK scratch, pointer and literal effects (D-116)

- SAVE ARG precedes the assembly zero test of PLAYER. Positive PLAYER words
  still select single-player speech. WHO indexes physical BITS; broadcast draws
  select raw eighteen-bit masks without clipping to KNPLAY (`WARMAC.MAC:6228-6250`).
- DBITS and DISPFR are written before RESTORE ARG and destination resolution.
  Later IRAN calls replace ARG; the entry does not restore it again. Relocated
  `[[n]]` argument cells are live memory, not cached maxima (`6251-6297`).
- The broadcast lead pointer is read even when TMP=0 selects a replacement from
  the single-player table. SOS and SOSL update actual AC0/TMP before indexing.
  TMP is shared with other assembler routines; population and plural decisions
  use its current value (`6258-6293`).
- RMCOPY reads the source NUL but does not deposit it. Separate final deposits
  write plural s if applicable, ! and NUL. No buffer clearing or bounds check
  replaces pointer behavior (`6290-6306`). Failures retain earlier bytes.
- RMGPLY compares GETLIN's right-half node against successive table left halves,
  selecting the first match. ANDI 77 followed by ANDI 7777 is retained exactly,
  despite CLx/CSx/Qxx comments. TEAM and random results can address neighboring
  pointer words (`6308-6348`). Node spellings remain unchanged (`6350-6396`).
- The raw body now replaces the missing speech dependency in TELL's composed
  fixture. Explicit monitor GETLIN, CPU/byte-pointer and literal/return-address
  policies remain; complete session and original-executable parity are unverified.

## OUTMSG consumption and retained buffer output (D-117)

- DBITS clears before DISPFR at each loop entry. Only MSGFLG(WHO)=0 returns;
  negative counts still call GETMSG with actual WHO and OMLOCL addresses
  (`OUTMSG.FOR:31-34`). No buffer clearing accompanies entry or return.
- Gag checking follows GETMSG removal. MOD(DISPFR,100) indexes live BITS,
  including the BITS(0) alias for a Romulan sender. Zero DISPFR bypasses the gag
  and header paths entirely (`35-39`). GETMSG misses therefore print stale MSG.
- ODISP receives the current DISPFR word by address. Recipient labels use
  OUT2C(NAMES(I,3)); DBITS and K are reread per iteration, and K multiplication
  follows each possible output call (`38-46`). No roster symbol or generated
  recipient mask substitutes for these words.
- OUT receives actual OMLOCL MSG and one appended newline after the optional
  header CRLF. A queue/output failure preserves decoded fields and prior bytes;
  only the next loop entry clears DBITS/DISPFR (`50-52`).
- Tests now compose raw human and seeded Romulan messages through terminal
  delivery. Compiler signed MOD, arithmetic, expressions, DO, literal relocation
  and production monitor behavior remain explicit policies; full GETCMD/session
  integration and original-executable equivalence are unverified.

## GETCMD notification, timing and death boundaries (D-118)

- Initial hit/message notifications precede PRGNAM, DMPBUF, CCTRAP and PAUSE.
  PTIME clears only after PAUSE returns; PASFLG uses compiler logical policy
  (`GETCMD.FOR:33-44`). Zero-argument CCTRAP cannot infer the absent argument.
- Idle paths clear ACTIVE, increment COMKNT and wrap at 30*NUMPLY; accepted
  input increments without that wrap. Preexisting control/hangup flags enter
  idle bookkeeping, while flags observed after INPUT can force QUIT
  (`55-85`). Notification calls reread current WHO and flags.
- Forced QUIT assigns only the first token/type words. Lookup scans actual
  ISAYDO and writes the supplied CMD word. A negative final CMD follows the
  arithmetic IF ambiguity branch; source's allegedly impossible comment does
  not remove it (`87-106`).
- Death copies TX identity/time/team words, calls POINTS, reads POLOCL TOTAL(1),
  and passes actual addresses to UPDSTA and FREE. WHO clears only after FREE
  returns; CMD is not changed by this path (`108-124`).
- PROMPT repeats the life-damage test after ODEC, evaluates the shield OR through
  a required compiler service, and preserves >=20000 damage and <=10000 energy
  thresholds (`PROMPT.FOR:36-50`). Tests retain the raw octal beep bytes from
  GETCMD rather than replacing them with a host alert.
- Raw OUTHIT/statistics adoption, final POINTS continuation and production
  compiler/CPU/monitor/session binding remain unresolved in this composition.

## OUTHIT live fields and negative notification counts (D-119)

- Every iteration calls BLKSET(IWHAT,0,17) before testing HITFLG. Nonzero counts,
  including negatives, enter GETHIT; LONG calls CRLF first. Invalid computed-
  GOTO indices return to this loop (`OUTHIT.FOR:39-47`).
- GETHIT's negative-count miss clears sixteen hit fields but leaves the
  decremented HITFLG intact (`WARMAC.MAC:3447-3469`). OUTHIT consequently repeats;
  tests use bounded suspension to observe this without inventing reconciliation.
- Sender output precedes NPLCF/NPLCT assignment. These saved classes coexist
  with later live DISPFR/DISPTO reads. Coordinate and numeric output calls can
  change fields before subsequent event/format tests; no event snapshot replaces
  source reads (`OUTHIT.FOR:51-177`).
- Critical-base output rechecks OFLG after OUTH31, and destruction output follows
  the source KLFLG branches. Base requests alone filter radio damage strictly
  greater than KCRIT and current NOMSG/BITS(WHO), after queue consumption
  (`184-217`, `245-264`).
- All fifteen event types now compose raw queue storage/retrieval and terminal
  output at three verbosity settings. PRLOC, arithmetic/compound conditions,
  POINT interpretation, literals and monitor behavior remain declared services;
  this does not establish full session or original-executable equivalence.

## Statistics live registers and monitor boundaries (D-120)

- UPDSTA reads @6(ARG) for its 1000 minimum, despite the nearby score comment.
  It clears STABUF only after acquiring the file lock; failed normal OPEN skips
  the free-file read (`WARMAC.MAC:5696-5722`).
- Ranking saves the score in T3, rereads elapsed at each tie, and uses one
  ten-entry list per team for both live and killed players. Higher duplicate
  PPNs suppress insertion; lower duplicates are shifted. The insertion leaves
  word eight unchanged (`5759-5859`).
- SAVE/RESTOR and later reads of ARG, T2, ship counters, FREE status and HUNGUP
  remain live across services. Negative ship indices retain physical 18-bit
  addressing, including aliases into STABUF and ACs. DATE faults leave the five
  copied identity words and shifted rows in place (`5830-5863`).
- Middle-placement OUTPUT and final OUTSTR are unguarded after the earlier
  HUNGUP test. Changing HUNGUP during the prefix suppresses numeric characters
  but still reaches the final direct text (`5795-5821`). Both ports now agree.
- UPDCAP's free-user branch executes OUTPUT/INPUT/CLOSE after the selected
  failed-OPEN literal continuations. It preserves normal serial first, clears
  twice at the first word, then uses STAIOW for the free read. Its final mission
  count/name separately reread the ship argument (`5607-5663`).
- Direct OUTSTR does not update the terminal formatter's cursor accounting.
  UPDCAP's first OUTSTR and both decimal calls are unguarded on hangup; no final
  newline is supplied. Wrapped minimum-integer output still requires a MOVM
  overflow policy (`5640-5668`).
- Tests use extracted source descriptors and explicit literal/CPU/monitor
  fixtures. Real persistent files, original compiler/monitor equivalence,
  complete startup/session and Telnet composition remain unverified.

## Honor-roll instruction order and shared words (D-121)

- SHOSTA reads without a lock, buffer clear or LE.PPN check. A failed OPEN
  returns before Ctrl-C cleanup. Four table heads alone decide whether headings
  are displayed, even if later records are populated (`WARMAC.MAC:5885-5910`).
- LE.NAM is read after the title and again after table output for paid-file
  continuation. The two comparison literals have separately supplied addresses;
  the fixture explicitly pools them. FREE status and @0(ARG) are reread for
  continuation; a cached file-open result is insufficient (`5911-5947`).
- Live-head scores choose side order, with ties favoring Federation. Each side
  checks Ctrl-C after its live table, but the other side is still called.
  SHOCKP clears CCFLG only after these calls (`5922-6000`).
- DSPSTA checks Ctrl-C only before SAVE. It skips gaps and scans ten physical
  rows using live X3/X4; it does not abort when Ctrl-C arrives within the table.
  Header extension uses argument <= 0, while wide rows use argument > 0 or
  TERWID >= 80. TERWID loads into T1 before the row argument resolves
  (`6001-6053`, `6092-6100`).
- OOCT's resulting X2 controls programmer-field padding, with at least one
  space. Credit rounding adds octal 500, not decimal 500. OSTR, OSIX and OSTBX
  retain distinct string/name behaviors (`6027-6061`).
- DACON uses the actual T1/T2 pair and separate DAY/MONTH/YEAR words; aliases
  can change the second dividend. Individual O2DG calls reread date words after
  preceding output. Negative dates retain the original control-character output
  rather than becoming modern calendar dates (`34-44`, `6077-6090`).
- Tests compose raw file and formatter paths, including hangup suppression by
  the selected character sink. CPU exceptions, assembler literal placement and
  continuation, monitor persistence and complete sessions remain explicit
  unresolved runtime contracts; source-derived tests are not differential proof.

## Statistics clearing, logging and retained serial (D-122)

- STAZAP locks the STABUF address, while UPDSTA/UPDCAP lock STAUPD. The former
  retains the game-dependent queue number under LOCK/UNLO; those keys must not
  be merged into a host-wide statistics mutex (`WARMAC.MAC:6188-6191`, `4476-4565`).
- ADDRCK=1 selects GRIPE's statistics branch. GRIP.Z passes the actual [[1]]
  argument descriptor, so free users can log free and normal statistics. Each
  read replaces STABUF; its final word zero survives the later clear. A failed
  paid read can therefore leave the free serial (`4910-4912`, `5885-5947`).
- The descending SETZM/SOJG loop clears indices 639..1 only. T1 and effective
  addresses remain live, including physical aliases. Normal and free writes
  reread current buffer words and literals (`6194-6207`).
- A returning GRIPE failure or cancellation still proceeds into clearing.
  Exceptions/transfers preserve the partial buffer, ADDRCK, output selection or
  lock state reached at that point. The final OUTSTR runs after unlock and
  before ADDRCK clears, and direct announcements are unguarded on HUNGUP
  (`6194`, `6208-6223`).
- Raw logging preserves packed-word padding, the initial word's unused bit,
  whole old-file words, and the source's prepend descriptors. The remembered
  terminal descriptor is required startup state for warning-time SETO swaps;
  GRIPE does not initialize it (`4727-4731`, `4762-4764`, `4922-5001`).
- Tests now compose raw statistics logging, interactive input, diagnostics and
  pre-game dispatch. Heap/CPU/monitor/literal contracts remain explicit fixture
  choices, with no production persistent filesystem or original-executable
  differential claim.

## APR-to-DECWAR fatal cleanup (D-123)

- APR saves AC0 separately, then AC1 through P before replacing stacks.
  GRIPE's PUSHJ uses the emergency stack, while GRIP.A dumps the saved original
  P extent. The raw composition declares its ordinary BLT and return-frame
  behavior; exceptional instruction and trap delivery remain CPU requirements
  (`WARMAC.MAC:6106-6119`, `4833-4863`).
- A returning log error, RED refusal or busy-log cancellation still reaches
  the current FTLERR destination. A nonreturning GRIPE/CLOSE failure retains
  emergency P and the reached output/ship state. APR does not restore original
  registers and does not cache FTLERR before logging (`6119-6122`).
- Zero FTLERR uses `MOVEI 16,[[5]]`, `MOVE 1,0`, `OUTSTR @0(1)`, then MONIT.
  The comment's random-message intent is insufficient evidence for adding an
  IRAN call or referencing FMSGS (`6123-6126`). The fixture tests actual indirect
  output with an explicitly supplied post-log AC0 word.
- DECWAR's fatal branch uses its own five stories and retains misspellings.
  CRLF calls use the original blank-line policy. I is read after assignment;
  a computed-GOTO index outside 1..5 falls through to 5001. Subsequent writes
  to I do not reselect an already-taken branch (`DECWAR.FOR:291-330`).
- Common exit copies JOB/NAMES fields separately using live WHO, then reads
  ADDRCK after ETIM. `IF (ADDRCK)` is a compiler logical operation; it is not
  specified as host nonzero truth. The sign-test fixture and an alternative
  explicit policy are tested separately (`334-343`).
- POINTS precedes the TOTAL copy. UPDSTA receives addresses of actual private
  words and WHO; FREE precedes WHO=0 and EXIT. Failures retain the stores and
  file effects already reached. Final POINTS, zero-argument CCTRAP, monitor
  EXIT and compiled literal behavior remain required bindings (`344-350`).

## Main dispatch, profiling and QUIT statements (D-124)

- PLAYER assignment precedes GETCMD's TIMIN. GETCMD receives the actual N
  address; its TIMOUT precedes WHO=0 and computed-GOTO checks. Profiling effects
  may therefore change the values those checks read (`DECWAR.FOR:77-89`).
- BUILD, CAPTUR, DOCK, IMPULS, MOVE, PHACON, REPAIR and TORP receive alternate
  label 49. An alternate return bypasses the subsequent TIMOUT as well as turn
  processing. Normal movement checks live ALIVE(WHO) after TIMOUT. Missing
  two-label IF and column-D semantics are required policies (`95-240`).
- QUIT tests HUNGUP as a compiler logical word before its prompt. It then
  prints SURE00 without newline, clears CCFLG and input, calls GTKN and passes
  raw EQUAL's result to the two-label IF policy. No token-type check, retry
  prompt or post-input CCFLG/HUNGUP condition is added (`163-169`).
- EQUAL distinguishes a matching prefix (-1) from a whole match (-2); zero
  indicates failure. The fixture's QUIT policy accepts both negative results,
  but the statement body requires rather than assumes compiler branch behavior
  (`WARMAC.MAC:4363-4402`).
- The loop never copies a synthetic pause return into PTIME. Timed command
  bodies have already written the actual word. Automatic REPAIR preserves the
  original 3400-to-3500 continuation, then existing turn statements update
  counters and scores using actual DECWAR I (`DECWAR.FOR:254-289`).
- Tests compose compound input, raw logging, movement, repair, death/re-entry
  and quitting with statistics and FREE. Missing command/defense bindings,
  actual profiling/traps, compiler and monitor operations remain explicit;
  these tests do not establish a complete session or original-executable parity.

## Main defense calls and raw notification delivery (D-125)

- DECWAR calls BASPHA, PLNATK and BASBLD in that order after DOTIME reaches
  NUMPLY and resets. Automatic REPAIR precedes those calls; stardates and
  score commits follow them. A defense failure retains prior damage, scores,
  notifications and DOTIME without running later work (`DECWAR.FOR:254-289`).
- Main defenses now publish through raw MAKHIT, so per-recipient HITFLG changes
  occur after the packed link is published and DBITS is cleared. GETHIT removes
  one recipient at a time. A zero packed condition bit becomes -1 on decode;
  PLNATK does not supply the SHCNFR=1 written by BASPHA (`WARMAC.MAC:3330-3523`,
  `BASPHA.FOR:57`, `PLNATK.FOR:57-91`).
- Original ODISP uses `)(` for an Empire base and the ship's source symbol,
  while the medium formatter displays tenths such as 648.0. No modern hit
  sentence is substituted (`WARMAC.MAC:2390-2443`, `OUTHIT.FOR`, `MSG.FOR`).
- Neutral selection and PHAROM share raw IRAN's private SEED. The one-based
  result matters: seed 1 yields IRAN(100)=14, giving base PHAROM damage 570
  for power 100 and distance 2 under the explicit ordinary integer CPU fixture.
  Planet Romulan power is not divided by NUMPLY (`WARMAC.MAC:2716-2753`,
  `ROMDRV.FOR:212-233`, `PLNATK.FOR:85`).
- Floating PHADAM still uses explicitly scheduled rational RAN values; this
  composition does not infer a floating encoding or remove compiler evaluation
  uncertainty. Eager versus short-circuit PLNATK AND can change whether a
  friendly planet consumes an integer draw (`PLNATK.FOR:38-39`).
- BASBLD may fail after both attacking routines publish their hits. The first
  50/(NUMPLY+1) division occurs even for PLAYER before replacement by
  25/NUMSID(TEAM). Main ROMDRV remains a required binding after rebuilding;
  no successful return is substituted (`BASBLD.FOR:33-45`, `DECWAR.FOR:267-268`).

## ROMDRV main entry over shared words (D-126)

- Main entry leaves PHIT untouched and stores PDIST into actual ID only on
  the phaser branch. Actual aliases remain observable. ROMDRV's V1/H1 name
  CHECK's H1/V1 words; ROMTOR receives those addresses, not copies
  (`ROMDRV.FOR:33-38,88-90,108-109`).
- Target computed GOTO chooses ship/base once. Individual coordinate stores
  still read live IPLACE and, for bases, NPLC. The six movement IFs are
  sequential, so later comparisons see prior coordinate updates
  (`ROMDRV.FOR:74-79,143-161`).
- Equal weapon deadlines are not treated as ready by the strict less-than
  tests. If both banks equal CTIME, execution falls into torpedoes. Counter
  resets and early returns follow their specific source positions; an eager
  compiler OR can consume IRAN(5) even when the population wait is already true
  (`ROMDRV.FOR:41-49,79-90`).
- SETDSP receives actual coordinate variables where written as variables;
  collision differences such as I-I1 require compiler temporaries. The old
  board cell is cleared before the new cell and LOCR stores. A failure after
  clearing does not restore it (`ROMDRV.FOR:172-196`).
- A full base's help record precedes damage. A destroyed base's report follows
  hit publication and bank recharge; MAKHIT has cleared DISPFR and the source
  does not set it again for this report. Both broad base notices mask NOMSG
  (`ROMDRV.FOR:95-119`, `WARMAC.MAC:3330-3523`).
- After an attack, the additional BASPHA/PLNATK/BASBLD calls can change state
  beyond the published hit. Tests with explicit rational arithmetic report
  strength 783 at impact and 799 after rebuilding. This is source scheduling,
  not a rounding correction (`ROMDRV.FOR:123-133`, `BASBLD.FOR:33-45`).
- The main fixture now binds ROMDRV itself; DIST, PLACE, ROMSTR and ROMTOR are
  still required statement adapters in that fixture. Caller tests supply
  explicit services for those calls. Compiler/REAL/RAN/CPU/monitor contracts
  and full session/Telnet/original-executable equivalence remain unresolved.

## DIST/ROMSTR actual-word composition (D-127)

- DIST clears only Z through BLKSET, then separately assigns RV and RH. A
  suspended or failed BLKSET can leave just its first destination word changed
  without updating those locals. Unselected V/H/IV words remain stale across
  calls (`DIST.FOR:29-32`, `WARMAC.MAC:3918-3933`).
- Federation eligibility checks logical ALIVE; Klingon eligibility checks
  only nonzero vertical position. Ship DISP must be positive, while base DISP
  merely must be nonzero. The finite distance sentinel does not mean an
  explicit no-target result (`DIST.FOR:36-68`).
- Each candidate uses signed integer squared distance. Arithmetic can wrap
  before comparison. The returned PDIST still uses its raw assembly sequence,
  including right-half behavior, rather than a host distance function
  (`DIST.FOR:39-41,50-52,63-65,83`, `WARMAC.MAC:4443-4451`).
- Class tie conditions have compiler-dependent draw evaluation. Selected NP
  remains live for subsequent conditions and the final PDIST argument setup.
  If IP aliases NP and stores 6, V(6) aliases H(2) and H(6) aliases IV(2);
  no array-range guard is added (`DIST.FOR:74-83`, DISTLC layout).
- ROMSTR scans the center as well as adjacent cells, preserves the first
  row-major star, and captures the four bounds before scanning. IV is assigned
  before IH: IV aliasing J changes the value used by the second assignment.
  Reversed DO entry remains an explicit compiler policy (`ROMSTR.FOR:30-38`).
- Shared main ROMDRV now uses DIST/ROMSTR statement bindings with raw block,
  board, distance and integer-random entries. PLACE and ROMTOR remain explicit
  required bindings there. REAL/RAN, full compiler/CPU/monitor execution,
  sessions, Telnet and original-executable equivalence are still unresolved.

## PLACE actual-word and main-spawn composition (D-128)

- PLACE captures N for its outer DO, but writes V then H on every retry.
  Negative and positive nonzero DISP results both reject the cell. The source
  has no retry cap, and rejected coordinates are not restored. It writes the
  same live object code for each placement; the increment is commented out
  (`PLACE.FOR:32-36,56-58`).
- OBJECT/100 is evaluated once for the ship test and again for PTEAM. Changing
  or aliasing OBJECT can therefore affect classification, enemy selection and
  final insertion separately. Signed division truncation and expression order
  are explicit compiler choices; out-of-range team indices still address
  surrounding words (`PLACE.FOR:36-41`).
- If NBASE(PTEAM) is positive, every base slot is tested without checking its
  strength or coordinates. Even an unused slot can reject a placement within
  inclusive radius four. The planet path instead tests counts and compares
  raw DISPC to PTEAM, with no owner decoding, then uses inclusive radius two
  (`PLACE.FOR:41-55`, `WARMAC.MAC:4410-4421`).
- V/H, N/V and OBJECT/V aliases preserve sequential stores. Actual SETDSP
  arguments remain references across suspension. Failed draws or insertion
  retain coordinates and K at the reached source position; no transaction or
  cleanup is added (`PLACE.FOR:32-58`).
- Main ROMDRV now uses this PLACE body with the shared raw SEED. Code 501 is
  inserted before ROM is set true; EROM and appearance publication follow.
  A failure drawing H can leave only LOCR(V) changed. Immediate phaser attacks
  leave the spawn cell at 501 while source messages identify the Romulan as
  500 (`ROMDRV.FOR:48-70,95-133`).
- ROMTOR is still required in the shared main fixture. SETUP's earlier
  component placement tests do not establish complete startup adoption.
  Production compiler/CPU/monitor/numeric contracts, sessions, Telnet and
  original-executable equivalence remain unresolved.

## ROMTOR actual-word burst composition (D-129)

- D is assigned from RAN before testing a prior MISFIR. A new misfire adds a
  second deflection and still fires; the next iteration consumes a deflection
  draw before exiting. IDIS uses signed INT, and TPAUS is accumulated before
  CHECK (`ROMTOR.FOR:33-44`).
- IV1/IH1 can be the CHKOUT H1/V1 words. CHECK first initializes those outputs
  from LOCR, thereby changing its own direction actuals before axis selection.
  Standalone direction words and ROMDRV's aliased directions have different
  traces, as the supplied source permits (`ROMDRV.FOR:88-90`,
  `ROMTOR.FOR:30,44`, `CHECK.FOR:44-53`).
- Nonzero collision consumes ARAN even for an unaffected star or black hole.
  Zero collision skips retargeting; nonzero paths retarget even after shot
  three. The final ETIM expression reads live TPAUS when its service resumes
  (`ROMTOR.FOR:45-54,97-111,137-139`).
- TORDAM receives the same actual IDUM for its third and fourth arguments.
  ROMTOR fills source metadata after that call and forces IWHAT=2, even when
  damage internally marked a deflection. Tractor release follows publication,
  then target selection follows the release (`ROMTOR.FOR:77-97`).
- Broad base notices preserve NOMSG masking and unset DISPFR. ALIVE=0 slots
  still pass PRIDIS's numeric eligibility test; the source skips only positive
  ALIVE. No logical-alive filter is added (`ROMTOR.FOR:65-74,93-96`,
  `PRIDIS.FOR:40-43`).
- Planet lock failure consumes the shot but bypasses unlock and retargeting.
  After a successful lock, L and ARAN are reread; ARAN>=75 decrements builds,
  and stale KLFLG can enter removal even with positive builds. A removal
  transfer retains the cleared cell and penalty and does not unlock or
  recharge (`ROMTOR.FOR:115-134`).
- Nova self-destruction returns before the RTPAUS assignment. SNOVA and
  PLNRMV remain required statement bindings in the shared main fixture;
  caller tests using explicit substitutes are not claims of their integration
  (`ROMTOR.FOR:53-55,128-130,138`). Full production numeric/compiler/CPU/monitor,
  session/Telnet and original-executable equivalence remain unfinished.

## PLNRMV and KILHGH actual-state composition (D-130)

- PLNRMV rejects negative PTEAM, I>NPLNET and I<=0 in that order. Teams 0
  and above 2 still permit removal but skip capture bookkeeping. Captured
  counts change before BASKIL receives the actual team address; BASKIL's
  NUMCAP<=0 path still skips undocking (`PLNRMV.FOR:31-38`, `BASKIL.FOR`).
- Each of four column moves re-evaluates I and NPLNET. The source leaves the
  final row unchanged and updates display codes by DISP-1, without regenerating
  an ownership class. No clear of the destroyed cell or lock is added
  (`PLNRMV.FOR:43-56`).
- Aliasing I to NPLNET can change the display loop after decrement. A failure
  during later columns retains earlier copies while NPLNET still has its old
  value. Actual coordinate arguments to SETDSP remain selected while its
  nested DISP expression executes under the declared call policy
  (`PLNRMV.FOR:43-56`).
- ENDGAM runs before PLNRMV returns. In ROMTOR, an exit therefore precedes
  planet unlock, hit publication and RTPAUS, preserving the board removal
  and score charge already performed (`PLNRMV.FOR:58`, `ROMTOR.FOR:128-138`).
- KILHGH skips all work for any nonzero DEAD. OPEN/LOOKUP/RENAME success skips
  remain explicit monitor services; P.PPN is reread after LOOKUP. SETZB T3's
  omitted effective address is exposed as a CPU service, tested with address
  zero and the mapped AC0 (`WARMAC.MAC:4217-4233`).
- KILHGH WARN checks HUNGUP before flush and again before direct output.
  Success runs OSTR, sets DEAD, then conditionally flushes. Failure returns
  without setting DEAD, so ENDGAM can still announce game end. No file close,
  rollback or extra error exit is invented (`WARMAC.MAC:59-67,4233-4243`).
- PLNRMV and KILHGH are connected in the shared main runtime. Monitor outcomes,
  loader/literal words and compiler/CPU policies remain explicit fixtures.
  SNOVA adoption and full startup/session/Telnet/original-executable parity
  remain unfinished.

## SNOVA/NOVA main statement composition (D-131)

- The D-129/D-130 missing SNOVA binding is now closed in the shared main test
  runtime. Generated SNLOCL and existing CHKOUT supply actual addresses; saved
  compiler locals and NOVA expression-argument temporaries are caller-owned.
  The fixture declares their allocation and conversion policies explicitly.
- Initial SETDSP precedes both pointer resets. Scanning captures DO bounds,
  visits rows/columns in order and pushes four victim fields separately.
  Nine victims after a repopulated center can alias subsequent columns and
  STRSTK; no bounds check or dynamic stack is inserted (`SNOVA.FOR:34-48`).
- Victims pop in reverse order, with separate integer-to-REAL displacement
  stores before pointer decrement. DISP rereads the target code after earlier
  NOVA calls, including planet compaction (`SNOVA.FOR:52-59`).
- Star selection evaluates the OR expression before the capacity test. Both
  short-circuit and eager policies are tested, including raw seed effects.
  Capacity is exactly STRPTR==29, not the declared 80. Chained-star penalties
  occur after notification and separately reread PLAYER (`SNOVA.FOR:43-70`).
- NOVA uses its own device/energy/shield arithmetic and source subtraction
  operations. The D<200 replacement is 250; D==200 stays 200. Ship death can
  update TMSCOR directly, and the source does not require ALIVE first. Raw
  notification precedes tractor release (`NOVA.FOR:39-98`).
- Intact-base distress clears IHITA through MAKHIT before the later damage
  report. Base death publishes before board clearing. The disabled random
  Romulan kill stays disabled; JUMP may kill it before the conditional halving
  and later scoring (`NOVA.FOR:103-157`).
- Planet hit publication precedes the post-call build/ownership reads and
  PLNRMV. A final-planet ENDGAM transfer therefore retains a published nova hit
  but does not unlock (`NOVA.FOR:160-178`, `PLNRMV.FOR:58`). Tests exercise this
  with explicit KILHGH monitor outcomes, not real monitor file effects.
- Main tests preserve original OUTHIT nova bytes through raw queue delivery.
  REAL/RAN, compiler and CPU/monitor contracts, remaining command bindings,
  executable sessions, persistence, Telnet and original-executable verification
  remain unfinished. No fidelity requirement was relaxed for this integration.

## Shared DAMAGE, STATUS and TIME bindings (D-132)

- Main slot 4 passes STOKEN=2. REPAIR evaluates NTOKEN+1 into a distinct temporary
  before calling DAMAGE; requested devices follow numeric or ALL switches.
  The report executes after explicit repairs and before final ETIM. A successful
  timed repair then reaches automatic repair, so the displayed damage can exceed
  the damage after the full turn (`DECWAR.FOR`, `REPAIR.FOR:60-70`, `DAMAGE.FOR`).
- Output suspension/failure retains completed repairs; no premature PTIME update,
  automatic repair or profiling return is added. DAMAGE still uses shared device
  words and raw EQUAL's prefix semantics, including multiple matches.
- STATUS uses the existing shared locals, raw output and token rewriting; a
  compound RADIO OFF/STATUS RADIO observes the same NOMSG word (`STATUS.FOR`).
- TIME's main/pre-game binding retains separate elapsed/runtime calls and D
  writes; pre-game skips ship fields. Missing scheduled RUNTIM stops at its call
  boundary. The shared clock and compiler policies are test fixtures, not real
  operating-system emulation (`TIME.FOR:30-46`, WARMAC clock entries).

## Shared DOCK and SHIELD paths (D-133)

- DOCK passes 3 to the same STATUS body used by main slot 23. Successful DOCK
  returns normally even with negative PTIME after slow output. The dispatcher
  still performs automatic repair and turn accounting. No-supplier/dead-ship
  alternate returns skip them (`DOCK.FOR:34-81`, `DECWAR.FOR`).
- Each nearby live friendly base adds two supplier units; a friendly planet adds
  one. Already docked ships receive the second hull reduction. No deduplication
  or extra guard is introduced (`DOCK.FOR:36-74`).
- SHIELD checks TRANSFER first inline, but UP/DOWN first after a prompted action.
  Transfer amounts come from token 3, 2 or 1 according to that path. SENRGY is a
  saved integer word; prompted input does not replace it (`SHIELD.FOR:35-56`).
- Capacity capping precedes the >= ship-energy confirmation. Negative transfers
  cap shield reserves before ship capacity. Division by 25 truncates while the
  full SENRGY is still subtracted from ship energy (`SHIELD.FOR:61-80`).
- Raising costs 1000 stored energy even when already raised, and KCRIT exactly
  still permits raising. Output precedes actual WHO-by-reference TRCOFF and the
  empty-energy notice. Transfer output precedes condition updates. Failures keep
  completed stores without subsequent cleanup (`SHIELD.FOR:75-104`).

## D-134 — ENERGY actual-word command binding

ENERGY.FOR:29-105 now executes against shared COMMON and saved local words.
NAMES and BITS are read from loaded memory; raw LDIS/EQUAL/MAKHIT and output
are reused. INT(IHITA*0.9) remains an explicit compiler service, exercised with
the existing rational test policy, not silently replaced with JavaScript floats.
The source capacity cap can produce a negative transfer if destination energy
exceeds 50000; this is preserved. Sender output follows both energy stores and
precedes destination metadata and notification. Sixteen source-derived main-loop
scenarios pass; these are not original-executable differential checks.

## D-136 — TRACTR command and omitted argument

TRACTR.FOR:34-130 is now an actual-word command body. DECWAR calls TRACTR
without an argument although TRACTR declares IP. Only paths assigning IP require
the explicit writable argument binding; the test harness defaults to unresolved.
Attachment uses loaded NAMES/BITS, actual paired TRSTAT stores and MAKHIT;
release reuses TRCOFF. Source rejection order (enemy before dead, destination
beam before shields) and strictly negative shield condition are retained.
D-135 also connected existing USERS statements to STAT and PRLOC in the main
and pregame composition, preserving live JOB fields and privileged positions.

## D-137 — Shared scan command and screen

SCAN.FOR:44-157 and WARMAC.MAC:2799-3000 now compose through main SCAN/SRSCAN.
The screen uses actual LOCAL metadata and seven-bit byte writes nine words per
row. Board pointers, cloaked cells, loaded ship symbols and warning overlays
follow source operations. Knowledge radius is KRANGE regardless of rectangle.
Source output labels and rows use original output entries, checking CCFLG after
each complete row. Explicit byte/XCT/SAVE fixture policies remain distinct from
a complete CPU/loader contract. No original-executable equivalence is claimed.

## D-138 — BUILD source ordering and shared base creation

BUILD.FOR:34-114 now composes through main input, locks, PLNRMV and output.
Fifth-stage build/initial score precede lock acquisition; lock failure retains
both. Exhausted physical base slots undo the increment but retain that score.
Success transfers discovery flags, removes/reindexes the planet, unlocks, then
installs the base and board code. BUILD followed by DOCK verifies shared use.

## D-139 — Capture ownership, defense and death ordering

CAPTUR.FOR:28-127 now uses actual COMMON/local words through main dispatch.
Ownership counters and fortification costs precede board ownership change and
defensive PHADAM. Capture can succeed while the ship dies: score and normal
turn return remain, with former-owner damage/kill credit. MAKHIT precedes capture
points and final clock. Tests use explicit existing rational REAL policy, not
verified PDP-10 floating arithmetic. CAPTURE/BUILD confirms shared ownership.

## D-140 — Player phaser command composition

PHACON.FOR:33-164 now uses actual local/COMMON words. Bank selection precedes
PAUSE; power validation follows it. Shield-control cost, overheating, target
damage and notifications precede final firing cost and recharge. Overheating
retains integer products followed by mixed REAL arithmetic and final integer
assignment under an explicit numeric service. Shared NOMSG masks base broadcasts.
Fifteen source-derived scenarios cover all target classes; no CPU parity claim.

## D-141 — Player torpedo burst composition

TORP.FOR:33-264 now uses physical TOLOCL, CHKOUT aliases and shared game words.
Misfire still executes the current deflected shot; later shots stop. Own-location
rejection returns normally and sets recharge, whereas planet lock failure returns
alternate after ammo use without recharge. Actual CHECK and damage/removal/nova
chains are composed; two IDUM arguments share an address. Numeric/loop/CPU
services remain explicit. Nineteen source-derived scenarios pass.

## D-142 — DEBUG raw output and return-word formatting

WARMAC.MAC:4314-4348 and 4567-4582 now execute through actual ACs and timer
words. Numeric recursion uses the current return word for remainder storage.
Raw OUTSTR/OUTCHR bypass HCPOS; privilege rejection uses ordinary OSTR.
Fixture timer zero-initialization, monitor output and synthetic return addresses
are explicit policies, not evidence of loader or PUSHJ equivalence.

## D-143 / D-144 shared reports and player admission

LIST/LSTSCN/LSTFLG/LSTUPD/LSTOUT/LSTOBJ/LSTSUM now operate on physical
LOCAL and COMMON words in main. LSTSCN's SHIP typo remains a distinct local;
its prior value, two-label IF and reversed DO policies are explicit test inputs.
The copied TOKEN word is preserved. Report output uses original raw formatting
and only updates base/planet knowledge at the source discovery stores.

SETUP.FOR:342-494 admission now retains killed-queue matching, previous ship
selection, capacity/defection, unlock before commissioning and ship reservation
after commissioning. CC2 decrements NUMPLY and NUMSID but leaves NUMSHP.
The terminal-speed loop tests ALIVE(WHO), not ALIVE(I), so even unused slots'
recorded speeds affect SLWEST. Explicit CCTRAP resolved addresses, first-word
ASCII group encoding, sign-logical/short-circuit expression behavior and monitor
clocks remain fixture policies. No raw machine addresses or missing compiler
semantics are inferred from these tests.


## D-148–D-151: platform arithmetic and explicitly selected compiler policy

Authorized CPU/compiler evidence is indexed in platform-manuals.md. RAN's FSC
conversion, PWR's per-multiply rounding, and ANUM's mix of FLTR, FDV, FAD and
FMPRI now have actual 36-bit floating implementations for documented normalized
input domains. Decimal parsing is not interchangeable with nearest literal
conversion: input 1.25 is one low-order bit below the nearest literal word.

Native numeric tests select a named source-order, rounded-single FORTRAN service
with an explicit nearest-decimal literal policy. Main PHASERS and full startup
with galaxy generation exercise this selection. Earlier rational fixture tests
remain separate; no original-executable differential verification is claimed.
The generated compiler instruction sequence, literal algorithm, unnormalized
operands, signed unrounded ANUM after integer overflow, and monitor fault
continuation remain open. Required fault callbacks preserve the distinction
between a wrapped result, an unchanged instruction destination and a transfer.

Initialized POINTS loops now select the documented FORTRAN V5 independent count.
Changing the visible I does not shorten the row count; the physical SCORE(9,1)
overlap is tested. Final entry jumps into an uninitialized loop, which the manual
prohibits; no count is synthesized or shortcut silently added. DECWAR.TAP lists
an EXE filename but is text, not a supplied executable that could resolve this.
