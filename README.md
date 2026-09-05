# DECWAR: source-faithful TypeScript port

This project is porting the supplied PDP-10 FORTRAN/MACRO-10 implementation in
`legacy/compuserve/fortran 1978`. That archive defines the current port's DECWAR behavior.
The separately requested UT Austin reconstruction is preserved in `legacy/utexas`;
its provenance and license are documented in [legacy sources](legacy/README.md).
That import has not changed the port's game logic.
The user authorized CPU/compiler manuals on September 5, 2026, solely to
resolve platform behavior; those references do not define DECWAR game logic.

**Current state: a playable TypeScript/Telnet alpha.** Normal quit, death,
disconnect cleanup, final scores and ship reuse work with explicit repairs to
undefined source paths. Exact historical parity remains a separate unfinished
goal; see [playable decisions](docs/playable-decisions.md) and [status](docs/status.md).

Run `npm start` and connect with `telnet 127.0.0.1 2323`.
Read [running the game](docs/running.md) for the first-captain sequence.
Statistics persist as 36-bit word files in `data/`; host diagnostics are logged
under `logs/`. Use `npm start -- --strict` for the historical diagnostic profile.

Latest progress: live captains share a galaxy and exchange original TELL/radio
messages. Phaser and torpedo combat execute native arithmetic and publish hit
reports to the other captain. Source turns create and move the Romulan. The
development entry uses the original captain-name prompt; names reach USERS and
persisted GRIPE reports. Partial-session interrupts/disconnects run source
cancellation and MONIT; active interrupts can be declined at QUIT confirmation.
The runtime also exercises movement, shields, scanning/listing, tractor beams,
planet capture/building, docking and points. The playable profile completes
scoring/exit with documented decisions for unresolved compiler behavior.

Eleven Telnet captains exercise full-galaxy rollover into a second world while
the first world's captains continue. Output now cooperates with interrupts and
other jobs; a disconnected source loop cannot monopolize the host at GETCMD.
HELP and NEWS read the supplied archive files through the original readers.

Game numbers and ship commission counts survive host restarts through shared
word-file storage; the archived statistics calculations remain in control.
Implementation details and validation are recorded in WORK_LOG.md.

Actual 36-bit floating RAN/PWR and rounded arithmetic now run
through galaxy creation and main PHASERS tests. Decimal command input preserves
the original per-digit unrounded arithmetic. Full SETUP creation/admission and
original experience/TYPE startup are composed with main STATUS.
Historical diagnostic mode still exposes the original final-score compiler-loop
and divide-check gaps. Playable mode handles those cases explicitly.

The foundation includes:

- A reproducible inventory and SHA-256 manifest of all 135 distribution files.
- Directly extracted constants, 33 game commands, 16 pre-game commands, ship and
  terminal names, and 324 original ASCIZ messages with source locations.
- TypeScript word arithmetic, packed galaxy storage, integer RNG, output
  formatting, integer/alpha command parsing, line editing, and prompts.
- Raw BLKSET/BLKMOV/LOCF with live argument and register effects; POINTS clears
  TOTAL through BLKSET. CPU BLT, including exceptional ranges, remains required.
- Ports of SHIELD, REPAIR, DAMAGE, DOCK, STATUS, TYPE, TIME, SET, RADIO, and
  PASWRD, plus raw-line user-name packing. REPAIR calls DAMAGE and DOCK calls
  STATUS in tested compositions; complete session integration is unfinished.
- PASWRD statements over live PASFLG/token words, raw EQUAL and USRPRJ, with
  separate project expressions and explicit compiler evaluation policy;
  JOBSTA/pre-game, INI input and main command dispatch compositions are tested.
- TYPE statements over caller KIND/private P, live settings and option words,
  raw GTKN/EQUAL, shared output and actual TTYDAT words. Pre-game's missing
  KIND argument and the compiler's two-label IF behavior remain explicit
  bindings; tests cover pre-game and main-dispatch compositions.
- SET statements over private P/I/J and live settings/tables, with raw input,
  output and packed-board clearing. Tests compose SET with TYPE and PASWRD;
  raw USRNAM now copies physical input words into JOB, retaining WHO=0 aliases
  and command-tail discard. SET ENDFLG reaches ENDGAM statements and raw output;
  production compiler/CPU/monitor behavior remains required.
- ENDGAM statements preserve live end conditions, identity-copy order, raw
  elapsed time and shared POLOCL totals. POINTS now composes raw output and live
  score/total words into this path; its uninitialized final-entry DO continuation
  and platform exit remain required runtime bindings. Raw UPDSTA now saves
  statistics before FREE in this path.
- FREE statements save actual FRLOCL words, update the killed-player ring through
  KQSRCH, and compose raw board, clock, locks and BLKSET with ENDGAM. Tests retain
  individual copies/clears and partial failures. RSTART shares FRLOCL/private
  locals, restores through raw JOBSTA and board routines, and preserves
  availability checks, retry order and aliased DUMMY outputs. FREE now calls
  TRCOFF statements and raw MAKHIT/GETHIT/GETMSG over physical queue words.
  Full monitor/session continuation still needs runtime adoption.
- Raw GETHIT preserves live registers, decrement-before-search, physical slot
  order, individual payload reads and recipient-bit removal. Original POINT
  operand spellings go to a required assembler/CPU policy; tests declare theirs.
- Raw GETMSG composes linked search/removal, separate queue locks, actual return-
  address skips and BLT into FREE. A miss reloads the player argument and leaves
  the buffer untouched; copy and removal failures preserve partial state.
- Raw RSRV/QRSRV and UPDT/QUPDT reserve and publish into that queue. Full-queue
  recovery removes a selected recipient from all linked entries without changing
  message counts. Saved X3, lock boundaries and source retry behavior are retained.
- Raw MAKHIT preserves sender-owned slot scans, per-field deposits, publication
  before notification counts, diagnostic output and saved registers. POINT
  interpretation and the oldest-slot literal continuation remain explicit policies.
- Raw MAKMSG handles packed and indirect text, semicolon input and INLI, then
  composes reservation, byte packing, cancellation and publication with GETMSG
  and FREE. It retains input consumption beyond the stored text limit and the
  pre-reservation Ctrl-C removal path through stale X2.
- Raw SETQH/SETQM now initialize the composed runtime. Resets clear headers and
  links while retaining payloads, serials and notification counts. JOBSTA uses
  the actual shared sequence table, which queue resets also preserve.
- RADIO statements compose raw GTKN, EQUAL and terminal output with live NAMES,
  BITS, shared NOMSG and private GAGMSG. Tests preserve action matching order,
  prompted input, slash continuations and mask changes before output failures.
- TELL statements now compose those input/output paths with raw MAKMSG/GETMSG,
  IRAN and board access. Name/group filtering, reply call order, relocation and
  partial effects use live words. Raw ROMSPK/RMCOPY/RMGPLY now generate replies
  through live phrase/node tables, shared TMP, byte pointers and actual IRAN.
  GETLIN and production CPU/literal contracts remain explicit dependencies.
- OUTMSG statements deliver raw queue records through original terminal
  routines and the actual OMLOCL buffer. Tests cover TELL and seeded Romulan
  speech through delivery, live recipient symbols, gag consumption and stale
  buffer output after a GETMSG miss.
- GETCMD and PROMPT statements now compose raw terminal selection, input,
  timing, lock cleanup and message delivery with live command/state words.
  Death paths use copied TX fields, shared POLOCL totals, raw UPDSTA and FREE.
  Final POINTS continuation and zero-argument CCTRAP binding remain
  explicit dependencies in this path.
- OUTHIT statements now deliver all fifteen combat event types through raw
  BLKSET/GETHIT and terminal formatters, composing with MAKHIT and GETCMD.
  Tests retain live fields, source punctuation, critical/destruction paths and
  negative hit-count behavior without adding count reconciliation.
- Raw UPDSTA/UPDCAP preserve live argument/register reads, actual STABUF,
  saved stack words, ranking shifts, counters and original output. Extracted
  descriptors, OPEN, LOCK/UNLO and raw decimal output compose with death and
  endgame cleanup. Literal continuations, CPU/monitor behavior and persistent
  production storage remain explicit dependencies.
- Raw SHOSTA/SHOPAY/DOFED/DOEMP/DSPSTA now render the same statistics
  buffer through raw string, SIXBIT, octal/decimal and two-digit output. DACON
  preserves the actual register pair and date words. Pre-game HONORROLL and
  UPDSTA → SHOSTA compositions retain header/row width differences, live file
  names, table gaps, Ctrl-C timing and original bytes.
- Raw STAZAP now calls GRIPE/SHOSTA before clearing actual statistics words.
  The shared runtime composes packed log growth, old-file prepend, file cleanup,
  interactive input, diagnostics and pre-game GRIPE/*ZAP. It retains word zero
  from the last statistics read, the distinct lock key, and partial failures.
  Monitor allocation, literal resolution and production storage remain required.
- Live per-keystroke INLI/NXCH/DISP editing with extracted character flags and
  explicit monitor/CPU services; original repeat, deletion and output ordering.
- Live ICHR terminal/buffered reads and INI handoff through SETI, including
  source interrupt flags and input/output state aliases.
- Live SETO and buffered/direct OCHR with suspending output services, shared
  word-level cursor accounting, and tested editor/output compositions.
- Live OPEN/CLOSE working blocks and allocation/failure paths, composed with
  NEWS, file input selection, buffered reads and restoration.
- Extracted TTY/INI/news/help/gripe/statistics descriptors and a separate DECINI entry; unresolved
  runtime symbols and missing INI file contents remain explicit dependencies.
- Compiler-facing RESET, START reload and KILLOW, with a tested runtime-to-
  FORTRAN-initialization path and explicit monitor/stack requirements.
- Live lock-release scans and MONIT cleanup, composed with FORTRAN exit and
  failed reload; unresolved literal control transfer remains explicit.
- Live lock acquisition, busy waits and cancellation, composed with GTKN's
  release/read/reacquire sequence; actual ENQ/DEQ and grant delivery remain required.
- Active CCTRAP/INTH and APRSET/APRTRP paths with live flags/register storage,
  tested input/cancellation/fatal-output compositions, and required CPU services.
  The selected build's disabled CISHNG grant/hangup handlers remain disabled.
- Register/stack-aware GRIP.A and OCT.O diagnostics composed with APR capture
  and packed GRIPE logging; diagnostic output can suspend before file cleanup.
- APR capture now reaches the full raw GRIPE path, then DECWAR fatal/leave
  statements over actual local and COMMON words. Raw IRAN and OUT feed the
  source fatal stories; POINTS, ETIM, UPDSTA and FREE compose before required
  EXIT. Trap delivery, compiler logical/literal/DO behavior and monitor services
  remain explicit runtime bindings.
- Live DBUF initialization and OGCH growth, composed with GRPFIL/SETO and
  OCT.O/OCHR.X; monitor byte-pointer, CORE and BLT operations remain required.
- Register-based GRIPE file transfer and cleanup, with live TMP descriptors,
  busy retries, old-file prepend and tested OPEN/CLOSE/TTY restoration.
- Raw interactive GRIPE entry and ESHP/PSHP, composed with actual INLI,
  OGCH and file transfer, including the source's Ctrl-Z carriage-return bytes.
- Shared live OSTR/OSTR.X, OUT, word/character output, spacing and newline
  routines; GRIPE now composes their pointer/state behavior with OGCH.
- Live OSTB field, SIXBIT and integer/radix output with saved registers, digit
  stacks, source padding quirks and tested suspension through OGCH.
- FORTRAN ODEC/OSDEC and integer-tenths OFLT/OSFLT wrappers, plus raw
  O2DG/O2DB; nested formatter stacks compose with suspended buffered output.
- Raw ODISP/ODEV/OCOND table output with live memory and deferred argument
  reads; OCOND/OSTR composes with LOWSEG and suspended gripe-buffer growth.
- Raw STAT/STAT.X/STAT.Y and OSTS/XFRTMP with shared formatter stacks;
  GRIPE composes the actual header and identity row through file transfer.
- Raw OTIM/O2D and shared accumulator views, including C+1/P1 and F/T0
  aliases; status output binds actual LOWSEG/HISEG/LOCAL and FileBlock words.
- Raw SAVE/RESTOR checks and character dispatch/accounting; GRIPE headers
  and control characters share S storage, with explicit CPU and halt services.
- Source argument-block loading/selection, live ARG reads, public text-entry
  bindings and CPOPJ/CPOPJ1 return boundaries with required CPU services.
- Shared output-runtime body registry connecting public/internal formatters,
  live ARG, data stack, current OC dispatch and raw terminal/gripe output.
- Resumable TIME statements and raw DAYTIM/RUNTIM/ETIM, composed from
  command dispatch through actual arguments, clock side effects and output.
- Resumable USERS/PRLOC with live permission/coordinate reads and raw PDIST;
  command dispatch composes STAT and numeric output through the shared runtime.
- Resumable DAMAGE with live token/device words, raw EQUAL and shared table/
  numeric output; tests preserve exact report bytes and reads after suspension.
- Resumable STATUS with source token rewriting, live report fields, separate
  radio-mask reads and shared EQUAL/PRLOC/condition/fixed-point output.
- Resumable DOCK with raw LDIS and clocks, complete supplier traversal and
  STATUS output before final timing; composed with repair and turn accounting.
- Resumable REPAIR with shared DAMAGE output, raw clocks/EQUAL, original mode/
  ALL behavior and automatic-repair compositions after both REPAIR and DOCK.
- Resumable end-of-turn statements with defense/profiling call order, live
  life-support output and separate player/team score commits after both commands.
- Raw DISP/DISPC/DISPX/SETDSP over live registers, arguments and packed pointer
  tables; DAMAGE and DOCK compositions execute raw reads. CHKC/CHKD and TRAC
  use shared output and saved registers; GDSP/SDSP/GPTR preserve internal byte
  pointers and compose with ESHP/PSHP. CPU/monitor services remain required.
- Resumable PRIDIS over actual arguments, local loop words and recipient bits,
  using raw LDIS; BASPHA now suspends within recipient searches and preserves
  late state reads before hit delivery.
- Resumable BASPHA over actual base/ship/hit/score/local words, composed with raw
  board/distances and existing damage, recipient and hit-queue routines; the
  turn path executes it before base rebuilding under explicit compiler fixtures.
- Resumable PLNATK with explicit compound-condition/random evaluation, saved
  planet identity and distinct ship/Romulan power and notification order; the
  shared turn fixture executes both attacking defenses before base rebuilding.
- Raw SETRAN/IRAN/RAN./RAN over live registers and the private SEED word;
  seeded defense compositions share successive integer draws. Public RAN
  requires the source FSC operation rather than host floating arithmetic.
- Resumable PHAROM/TOROM/DEADRO over actual arguments and shared hit/energy/
  position words; both defense paths await raw board clearing on Romulan death.
- Resumable BASBLD over actual base/local words, retaining both population
  divisions, saved state on faults and source caps; composed with the turn path.
- Persistent token memory and a resumable input driver, with tested sequences
  spanning interactive arguments and commands on the same physical line.
- GETCMD control flow and composed PAUSE/INPUT/GTKN behavior, with deterministic
  wake events, lock boundaries, notification ordering and death cleanup calls.
  PAUSE/INPUT/CLEAR also have raw bodies with live accumulators, actual argument
  reads, lock calls, HIBER/HALT and INPUT's saved result. COMPUTED movement now
  uses raw PAUSE. Monitor flags and literal jump targets remain required inputs.
- Main command-loop control flow for all 33 slots, alternate returns, automatic
  repair, defense scheduling, life support and shared score accounting. Tested
  paths use actual GETCMD, REPAIR, TIME and DOCK; unfinished commands remain
  required dependencies. QUIT confirmation composes with ship release.
- Main-loop statements now use actual N and PLAYER words, raw GETCMD, all
  source dispatch slots and profiling boundaries, and explicit two-label IF
  policies. QUIT composes raw confirmation/input clearing with the shared exit;
  MOVE/IMPULS and REPAIR compose automatic repair and turn accounting. Remaining
  command and production runtime bindings are still required.
- Main timed commands now reach BASPHA, PLNATK and BASBLD through actual
  PHADAM/PWR/PHAROM/PRIDIS and the raw shared hit queue. GETCMD/OUTHIT deliver
  those hits; lethal hits reach statistics and pre-game return. Integer draws
  share SEED; floating RAN/REAL and compiler policies remain explicit fixtures.
  Main ROMDRV now has a statement body over live locals and CHKOUT, composing
  raw movement, phaser damage, hit delivery and the extra defense cycle. DIST
  and ROMSTR now use actual local words and DISTLC with raw board, BLKSET,
  PDIST and shared integer randomness. PLACE now composes raw random draws,
  board and territorial checks with actual arguments, including Romulan spawn
  through appearance and attack. ROMTOR now uses actual locals and shared
  CHECK directions, composing torpedo damage, displacement, retargeting,
  tractor release, planet locks and raw hit delivery. PLNRMV now composes raw
  column copies and board updates with BASKIL and ENDGAM; KILHGH follows its
  original register and output sequence under explicit monitor outcomes.
  SNOVA/NOVA now share physical CHKOUT/SNLOCL and compose damage, displacement,
  hit delivery and planet removal in this path. Tests reach chained explosions
  and final-planet endgame. Floating RAN/REAL and compiler/monitor policies
  remain explicit; this shared test runtime is not yet an executable server.
- Main DAMA/DAMAGES and REPAIR's appended DAMAGE report now use the same
  statement body, loaded device words and raw output. STATUS reuses its existing
  shared state binding; TIME connects main/pre-game dispatch to raw clocks and
  formatting. Report timing, all verbosity modes and partial failures are tested.
- DOCK now connects to shared STATUS and automatic turn accounting. SHIELD's
  actual-word body uses raw command prompts, arithmetic services and paired
  tractor release. Focused tests retain source caps, truncation and partial effects.
  Ongoing changes and check outputs are recorded in [WORK_LOG.md](WORK_LOG.md).
- DECWAR application entry connects experience selection, TYPE, pre-game,
  SETUP, initial ship placement and the command loop. Composed tests cover
  creation, quit and death/re-entry; fatal messages use the existing cleanup.
  Full monitor startup, shared memory and remaining commands are still required.
- POINTS command parsing and reports across all eight score categories and
  three verbosity levels, using the turn-accounting score arrays. Final-call
  loop entry and pre-game memory evaluation still require compiler adapters.
- USERS and STAT identity output, including exact field padding and privileged
  locations, composed with command dispatch and ship release. LSTUPD preserves
  LIST selection masks, aliased arguments and closest-object ties. The five
  LIST entry points now compose parsing, traversal, object/summary reports and
  scan-knowledge updates using the original output-storage layout. FORTRAN
  literal bytes, raw logical values and exceptional loop bounds still require
  explicit compiler/runtime services.
- SCAN/SRSCAN command parsing, packed screen generation, warning overlays and
  source row/column output, including Ctrl-C boundaries. Tests compose scan
  knowledge updates with later LIST visibility and preserve the distinction
  between displayed area and sensor range.
- ENERGY input, transfer limits, donor accounting and queued delivery notices,
  composed with GTKN and MAKHIT/GETHIT/OUTHIT. The original floating expression
  `INT(IHITA*0.9)` requires an explicit arithmetic service; no approximation is
  supplied as a production default.
- Message storage and delivery through MAKMSG/GETMSG/OUTMSG and GETCMD,
  plus sender-owned hit storage and retrieval. Overflow and stale-buffer
  behavior follow the supplied source.
- TELL destination parsing, radio/group filtering, repeat handling and Romulan
  relocation. ROMSPK now generates speech from 75 extracted phrase/node
  strings with the source RNG schedule. Tests compose real Romulan queue
  delivery, including broadcast writes into HITFLG and OUTMSG's BITS(0)
  alias, using explicit compiler-memory and monitor fixtures.
- OUTHIT rendering for all fifteen combat-event types, with byte fixtures
  across all three verbosity settings and queue-to-GETCMD compositions.
- FREE/RSTART ship preservation and restoration, killed-player records,
  tractor release, shared JOB storage, and ENDGAM output/control flow, with
  tested GETCMD and queue-cleanup compositions.
- TRACTR's complete command flow and shared TRCOFF release, composed with the
  hit queue, SHIELD, GETCMD and FREE. Validation order and argument aliases
  follow the source. The zero-argument caller's writable IP address still
  requires a compiler binding.
- MOVE/IMPULS with LOCATE/RELOC and CHECK/CHKPNT, composed through command
  dispatch. Tests preserve coordinate-token mutation, fractional path checks,
  overheating, energy charges, lock failures and towing's different coordinate
  conversions. CHECK/CHKPNT also have resumable bodies over actual arguments,
  locals and CHKOUT, composed through raw INGAL/DISP into TORDAM/JUMP. They
  retain strict hundredths, candidate-read order and the collision reread.
  MOVE/IMPULS now have resumable statements over COMMON/local words, composed
  with CHECK, raw board locks, deposits, clocks, output and command dispatch.
  They preserve partial failures and unlock before the towing writes. LOCATE/
  RELOC now also have resumable statements with actual token/local/return words,
  raw EQUAL/INGAL/DISP/OUT calls and backward COMPUTED expansion; MOVE uses them.
  COMPUTED movement uses raw PAUSE; prompted input uses raw GTKN/NXTT with
  shared token/register state and output. Raw IC/ICHR.T/NXCH/INLI now feed that
  path one character at a time, preserving redraw and editing writes. Raw ICHR.B/
  IICH also compose buffered INI input and EOF handoff into that same editor.
  Production monitor and file bindings remain required.
  Real arithmetic, compiler policy and RNG remain required services;
  tests use an explicitly nonhistorical exact-rational fixture.
- PHACON's phaser driver, PRIDIS recipient selection, Romulan damage entries,
  JUMP displacement and BASKIL port-loss checks. JUMP/BASKIL now also have
  resumable bodies over actual COMMON and local words, composed with the new
  damage path and raw INGAL/PDIST/LDIS/DISPC/SETDSP. Tests preserve CHKOUT aliases,
  black-hole state, separate board writes and the source NUMCAP docking branch.
  Earlier command compositions cover planet and Romulan shots, queue output,
  scoring and command dispatch.
- Shared TORDAM/PHADAM damage, critical devices, shields, scoring and destruction,
  composed with real phaser commands, JUMP, BASKIL and hit delivery. PWR retains
  the assembly multiplication tree; raw PWR/PWR. now preserve live arguments,
  accumulators, recursive SAVE/RESTOR and source failure ordering. Defense
  fixtures now await resumable TORDAM/PHADAM statements over actual argument,
  COMMON and local words, including raw PWR and SETDSP. Tests preserve separate
  conversions, live aliases and partial failures. Exact rational handles remain
  explicit fixtures; production real arithmetic, floating RAN, FMPR and compiler
  behavior remain required services.
- SNOVA's fixed-memory star/victim stacks, NOVA's separate damage/scoring rules
  and PLNRMV's four-column planet removal. Tests compose chained explosions,
  displacement, tractor release, hit queues, planet renumbering and ENDGAM.
  Production monitor/numeric bindings remain pending.
- TORP's burst driver, including target reuse, misfires, damaged/shielded firing,
  ammunition and recharge timing. Tests compose LOCATE/CHECK, all damage and
  explosion paths, planet removal, hit delivery and dispatch. Consecutive shots
  observe prior displacement/destruction; three-shot output has byte fixtures
  at all verbosity levels. Complete runtime/session bindings remain required.
- BASPHA base fire, PLNATK planetary defenses and BASBLD base repair, composed
  through turn accounting with PHADAM/PWR, PHAROM, score writes and packed hit
  output. Integer population scaling, differing Romulan power, stale hit fields,
  and post-damage notification order follow the source. ROMDRV caller composition is tested; complete session integration remains unfinished.
- BUILD construction and planet-to-base conversion, plus CAPTUR ownership
  changes and defending fire. Tests compose LOCATE, BASKIL, PLNRMV/ENDGAM,
  PHADAM, packed hit output, dispatch, automatic REPAIR and turn accounting.
  Source side effects survive lock failures and fatal capture attempts; exact
  conversion output is checked across verbosity and coordinate modes.
- DIST target selection, ROMSTR nearby-star selection and ROMTOR's three-shot
  Romulan bursts, composed with CHECK, real damage, nova chains, planet removal
  and packed output. Tests preserve stale targets, asymmetric ship eligibility,
  retargeting and CHECK argument aliases. ROMDRV now composes spawning, movement,
  weapon scheduling, phaser damage, speech and base/planet defenses, including
  its caller in turn accounting. Production runtime and full session binding
  remain unfinished.
- HISEG/LOWSEG memory layouts checked against FORTRAN, MACRO and the supplied
  link map. Existing gameplay, scores, queues and output bookkeeping can bind
  to caller-owned words, sharing high memory across jobs and preserving
  out-of-range array aliases. Remaining local storage and complete session
  integration are still required.
- All 219 FORTRAN DATA words in the selected build are extracted with source
  locations and destination types. Explicit loaders preserve shared galaxy
  data across joins; command, HELP, terminal and device tables read live words.
  Compilation of quoted/Hollerith literals requires a supplied compiler policy.
- Hit and message queues bind to shared source memory, with layouts derived
  from WARMAC and the supplied link map. Cross-job delivery, reset boundaries,
  live BITS reads, counter overflow, FREE cleanup and exact notification output
  are tested. Instruction scheduling and full session wiring remain required.
- Eight named private COMMON blocks have live memory views, including the
  shared LIST/SCAN/pre-game overlay, saved ship, score totals and combat scratch
  storage. Type extraction follows PARAM's all-letter INTEGER rule and explicit
  REAL overrides. Opaque real-word codecs and logical policies remain required.
- Command input can use source LINBUF words, absolute PTRLST pointers and live
  token arrays. GTKN continuation, repeat storage, hangup, partial parsing and
  lock-wait visibility are tested with GETCMD, SET, STATUS, LOCATE and messages.
  Raw GTKN/NXTT/SKPB/ANUM now preserve stack/register effects, floating scale
  operations and X3 token spill through required CPU services. Production
  floating encoding and monitor behavior remain required. Raw terminal input
  and buffered INI input compose with prompted movement, including EOF handoff
  midway through an edited line. Full session integration remains open.
- DEBUG and TIMIN/TIMOUT profiling, including timer search, direct monitor
  output and separate decimal/octal diagnostics. Tests compose game/pre-game
  dispatch and ROMDRV profiling while preserving full-table overflow, clock
  failures and the original output bytes. Production monitor and compiler
  bindings remain required.
- UPDSTA rankings, UPDCAP commission counts, SHOSTA honor-roll display and
  STAZAP control flow using the original 640-word statistics buffer and 27
  extracted output strings. Tested compositions include death → statistics →
  ship release and statistics update → display. Full startup, combat mechanics,
  combat scoring producers, logging, persistence and monitor implementations remain
  unfinished.
- GRIPE's interactive, statistics-reset and crash-dump paths, original status
  header, packed log buffer, file-prepend transfers, and temporary ship removal.
  Tests compose STAZAP → GRIPE → SHOSTA before clearing statistics. Actual
  terminal input, core allocation and file operations remain runtime services.
- HELP/NEWS file readers, topic matching, padded command lists and continuation
  prompts. Tests read all 38 public help topics and the complete news file from
  the supplied archive, preserving original bytes and control-character rules.
  NEWS also has a raw register/shared-stack body composed through OPEN/SETI,
  buffered ICHR, OCHR, terminal editing/GTKN, EQUAL and CLOSE. It retains live
  page state, descriptor swaps and failures; raw command dispatch and the entire
  supplied news file are checked. SHLP now also has a raw register/shared-stack
  reader composed with packed input, OPEN/SETI/CLOSE and raw output. All 38
  public topics match the supplied help file through that path, retaining
  keyword lookahead and delayed interrupt cleanup. Raw SLST/OLST and HLPALL/
  HLPXTR preserve packed match addresses, pointer advances and seven-column
  output. The raw outer HELP command now composes alert checks, token iteration,
  ESHP/PSHP through SDSP, list matching and file output. All 38 topics pass
  through that command; raw terminal input and DECWAR dispatch are also tested.
  Its ten-character unknown-token output can span the next token word, as in
  the source. Production monitor/file services and wider caller adoption remain open.
- PREGAM/XGTCMD's initial prompts and sixteen-command loop, composed with HELP,
  honor roll, TIME, password checks and buffered command input. XGTCMD now also
  has a resumable statement body over actual CMD/I/PRECMD words, raw prompt
  output, INPUT/GTKN/EQUAL, terminal/INI input and HELP dispatch. Its logical,
  assignment, DO and literal policies remain required compiler services. PREGAM
  now has an outer statement body over actual LOCAL identity/N words, raw
  initial input/output and XGTCMD, with raw HELP/NEWS/summary compositions and
  source-faithful dispatch. Raw JOBSTA now supplies identity through monitor
  calls and direct name input, preserving octal speed limits, cached-name bits
  and blank-name retry behavior; USRPRJ reads the saved project word. Monitor
  effects, byte instructions, remaining calls and full session binding remain
  required services. KILCHK preserves
  killed-player lookup and countdown quirks; CC1/CC2 preserve cancellation order.
  Complete command bindings and monitor services remain unfinished.
- SETUP's world options, team/ship selection, returning-player paths and
  commissioning, with PLACE's original random retries and territory checks.
  Tests compose the integer RNG, queues, shared scores, FREE and UPDCAP, and
  preserve the reservation race and terminal-speed lookup quirks. Full shared
  memory, floating expressions and monitor/compiler bindings remain required.
- Source-derived object/device/condition tables and coordinate/time formatting,
  with byte fixtures for reports and injected clocks for timing tests.
- A streaming Telnet codec with fragmentation tests; historical Telnet/monitor
  equivalence is unresolved.

Use Node.js 24 or newer:

```sh
npm ci
npm run check
```

The tests use Node's built-in test runner and native TypeScript execution.
The only installed dependencies are development tools for static TypeScript
checking; the port and behavioral tests have no third-party runtime dependencies.
`npm run audit:check` checks the frozen source and generated artifacts.
`npm run audit` regenerates the artifacts; review source changes before doing so,
because regeneration also updates the recorded hashes.

Start reading with the [source study](docs/source-study.md),
[compatibility findings](docs/compatibility.md), and
[modernization decisions](docs/decisions.md).
The [source index](docs/source-index.md) maps every file, FORTRAN routine/entry,
and assembly section. It is a navigation aid, not a completed semantic audit.

The supplied source carries GPL-3.0-or-later notices. See
[the supplied license](legacy/compuserve/fortran%201978/COPYING). The port retains that
license and preserves the archive unchanged.

Our original contributions are additionally offered under [MIT](LICENSE-MIT),
within the scope explained in [Licensing](LICENSING.md). The current combined
port remains GPL-3.0-or-later; the separately imported UT Austin snapshot retains
its upstream MIT license.
