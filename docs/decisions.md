# Modernization decisions

Every entry distinguishes implementation structure from observable behavior.
No entry authorizes a simplified gameplay release.

## D-001 — Supplied distribution is the baseline

Use DECCMP.CMD and CAN1.CMD to identify the build. Preserve modifications
already present, the displayed banner, spelling, and apparent defects. Reason:
the user designated the supplied code as truth; reconstructing a hypothetical
pristine 1978 release would introduce another authority. An older behavior may
be documented as an alternative only when the archive itself establishes it.

## D-002 — TypeScript with explicit compatibility primitives

Use BigInt for 36-bit words and scaled game quantities, and numbers for small,
bounded indices. Keep packed board storage where it helps test original
representation and lock boundaries. Use source-derived integer division and
formatting, not decimal display values as the canonical state.

Reason: JS bitwise operations cannot represent a 36-bit word. Modern names and
classes can clarify ownership without altering original values. Runtime word
wrap primitives do not establish the missing compiler's trap policy.

## D-003 — Telnet transport is a separate adapter

The game source invokes TTY monitor services and contains no socket or Telnet
negotiation implementation. A streaming codec therefore separates Telnet IAC
commands from application bytes, escapes outgoing IAC, preserves CRLF, handles
CR NUL, and reports interrupt-process separately.

Current scope: options are refused; subnegotiations are discarded without
buffering arbitrary payloads; no login banner, user-authentication dialogue,
terminal emulation, remote shell, or game service is invented. This prototype
is tested across packet boundaries. It is not an accepted reproduction of the
original monitor's Telnet policy. Echo, terminal type, dimensions, paging, and
conversion of a client's Enter key remain to be implemented and documented.

The codec preserves CR NUL as CR. The game editor ignores CR, so a client that
only sends CR NUL will not yet submit a line. Do not silently convert every CR
to LF: that would erase the distinction the application source makes. Resolve
the monitor boundary before integrating a playable Telnet service.

## D-004 — Explicit suspension replaces blocking GTKN

SHIELD is a generator that yields for input while retaining its local branch
state. REPAIR separates the point at which damage is changed from the point at
which elapsed time is charged. A future session driver must provide the input,
interrupt semantics, output flushing, and original lock-release points.

Reason: blocking the Node process would block every player. Suspension is a
structural change; it does not grant permission to change message order,
interactive prompts, or command delays. SHIELD's TRCOFF action is a required
callback, rather than an unfinished no-op hidden in the routine.

## D-005 — Extract message data instead of retyping it

`tools/audit.ts` generates constants and string tables directly from the local
archive, preserving physical ASCIZ contents including CRLF. The generated file
keeps each message's source line. BYTE directives and inline literals outside
the specifically extracted tables remain explicit work.

Reason: extraction prevents transcription drift and makes changes reviewable.
The manifest check fails on source or generated-data differences. Regeneration
is deliberate and must not be used to hide accidental source edits.

The extraction now includes the nine WARMAC object/ship/device/condition tables
used by ODISP, ODEV, and OCOND, and keeps each entry's source location. Ship
indirections remain explicit rather than being parsed as strings. TYPE retains
the original two padded terminal words. Other inline literals and BYTE
directives remain unfinished.

## D-006 — Refuse unproved floating-point equivalence

Do not use native JS floats as a silent substitute. Decimal token input raises
an internal exception until ANUM and its apparent register side effect have a
defined port. RAN's integer core is available, but public floating RAN and PWR
are not implemented.

Reason: deterministic seeded gameplay still diverges if float rounding, integer
conversion, multiplication order, or random-call count changes. The first
playable strict release is gated on resolving this, rather than adding an
approximate default mode.

## D-007 — Proposed shared-state host (not implemented)

Use one Node host with shared per-galaxy state and independent sessions. Model
critical sections, clock calls, and asynchronous events explicitly. Inject a
deterministic clock/event schedule in tests.

Reason: modern memory removes the need for remapped high segments, but their
ownership and synchronization effects are observable. This architecture still
needs validation against LOCK/UNLOCK/PAUSE/input interleavings. It does not yet
specify persistence or replace monitor job identities.

## D-008 — Preserve input backing storage across commands

Keep fifteen mutable token slots and a separate NTOK scalar. The scanner
records every token write, including writes made before overflow rejects a
command. Applying those writes preserves untouched values and raw-line offsets;
writing the EOL marker does not automatically replace its pointer. STATUS's
token rewriting therefore remains visible to subsequent routines.

Use an explicit input driver to satisfy a command's suspended GTKN request
from the rest of the physical line before requesting another edited line.
Reason: a new token array for each call would erase observable source state,
and treating each slash as an independent submitted line would change prompts
and output order. The original lightweight composition helper is limited to
token acquisition. The separate GTKN and GETCMD ports now add source-level
wait/lock and control-flow behavior; actual monitor echo, interrupt delivery,
ENQ locks and the main loop remain unfinished.

## D-009 — Expose monitor identity and JOB writes as required services

USRNAM extracts the name from the original line and passes two packed SIXBIT
words to a required JOB-write callback. PASWRD receives a monitor project
number independently of command input. SET's endgame branch requires an
ENDGAM callback.

Reason: these routines must not report success through hidden no-op adapters
or invent a modern identity scheme. In particular, pre-game WHO=0 can address
outside the nominal JOB row; the eventual storage adapter must trace that
layout before integration. Modern account mapping remains undecided.

## D-010 — Model monitor waits as explicit resumable operations

PAUSE and INPUT issue hibernation operations with the source millisecond value
and wake-on-input flag. The host supplies wake events and clock readings; each
routine then executes its own remaining checks. Saved lock keys and retries
remain explicit. GTKN uses the same services around edited-line acquisition.

Reason: a JavaScript timer alone would conflate a wake with successful input
or elapsed delay, hide lock ownership, and silently fix PAUSE's midnight bug.
The generator representation allows deterministic event schedules without
blocking all sessions. It does not establish the missing monitor's scheduling
or lock semantics; those services still need source-backed adapters.

GETCMD composes these routines and exposes mandatory services for hit/message
delivery, endgame, scoring, statistics, and ship release. Returning from a
successful ENDGAM exit is not allowed: the eventual host must terminate that
execution path. Empty implementations of unfinished dependencies must not be
used to expose a supposedly compatible playable session.

## D-011 — Preserve distinct queue storage and stale state

Messages retain packed linked-list words and seventeen-word payload slots;
hits retain the supplied sender-owned slot layout and four-word records.
Counters remain in shared player objects instead of being computed from
queue length. OUTMSG's sixteen-word scratch buffer belongs to the session and
survives calls. Initialization only clears fields the source actually clears.

Reason: a generic modern FIFO would change hit order, overflow recipients,
counter behavior, and stale-message output. Message reservation, publication,
search, and removal use distinct required lock services in the source order.
The hit algorithms introduce no lock absent from the source. Instruction-level
interleavings still require the host/monitor model; passing sequential tests
does not prove concurrency parity.

Queue pointer corruption and the all-reserved/no-linked-entry state raise
internal unresolved-state exceptions rather than inventing recovery or a
new terminal message. Pre-reservation MAKMSG cancellation requires a machine
adapter. These are release gates, not accepted user-facing differences.

## D-012 — Preserve lifecycle word ownership and argument aliasing

PlayerSlot exposes descriptive identity fields through accessors backed by one
JOB array. FREE and RSTART copy the source's explicit SHPCON, SHPDAM and JOB
word sets. They mutate existing player/ship objects so queue and command
references continue to observe the same shared storage. The saved FRLOCL
snapshot belongs to the session and holds its most recently freed ship.

Reason: serializing or resetting an entire modern Ship object would clear
fields the source retains, while a separate identity copy would survive JOB
clearing incorrectly. A per-ship archive would also change the shared ENTRY
locals. RSTART passes mutable word references to its required JOBSTA adapter,
including one reference used for both DUMMY arguments, to retain aliasing.

PlayerSlot construction is a component helper using the existing ship defaults;
it is not a complete implementation of HISEG initialization or SETUP. Actual
monitor identity, locks, high-segment removal, scoring, statistics file access
and session exit remain explicit services. The lifecycle tests use named fixtures for
unfinished services and do not authorize production no-op replacements.

## D-013 — Preserve statistics words and separate monitor I/O paths

UPDSTA and UPDCAP use the original 640-word statistics buffer, ten-word records,
counter offsets, word shifts and eighteen-bit packed fields. File services
receive the original operation-block and I/O-word identities in source order.
OPEN returns both its success indication and resulting LE.PPN, including on
failure where UPDCAP continues to examine it. DATE remains a required raw
monitor-word service.

Reason: a sorted collection of modern records would erase unknown words,
remove source duplicates, and hide operations reached after a failed open.
No JSON database, new timestamp encoding or transactional rollback has been
chosen. The tests provide a memory-backed monitor fixture; production storage
and error semantics are still unfinished.

Direct OUTSTR and OUTPUT TTY are distinct from ODEC through the current output
dispatch. Combining them into ordinary TerminalOutput.write calls would alter
HCPOS/BLANK and output buffering. Twenty-seven anonymous ASCIZ strings are extracted
from four assembly sections with their physical CRLF and line references.
Hangup behavior is tested at each explicit call boundary; the final monitor
and character-output adapter must supply the actual terminal effects.

SHOSTA's strings use OSTR through OCHR, so its renderer receives the active
TerminalOutput dispatch and retains cursor bookkeeping. Its argument is a
required reader, preserving separate header, row and continuation tests. Raw
DATE conversion follows the local DACON macro and O2DG, without host calendar
conversion or repairs to pre-2000 output.

STAZAP exposes GRIPE as a required suspended operation before it mutates the
shared buffer. It does not use a generic buffer reset or a transaction that
would restore earlier data after a failed write. The pre-game dispatcher must
enforce its original PASFLG check; porting this routine does not expose an
unrestricted administrative endpoint.

## D-014 — Keep dispatch, alternate returns and turn effects explicit

The main command loop passes the original routine names and arguments to a
required command adapter. Time-consuming routines must report whether they
took their alternate return; returned PTIME assignments apply even on that
path. The dispatcher selects automatic repair or direct turn accounting from
the source slot. The turn routine exposes each defense/Romulan call as a
required suspension boundary, then updates stardates, life support and scores
in source order. Score words retain the HISEG column-major dimensions.

Reason: charging every command a turn or hiding post-command work inside each
command would change defenses, repair, life reserves and score timing. PLAYER
is reset at the next GETCMD iteration, preserving a value left by ROMDRV in
the meantime. Returning to pre-game reports that control transition without
inventing startup state or a replacement player.

QUIT confirmation and common leave cleanup are separate from GETCMD's death
return. The former terminates the session; the latter re-enters pre-game.
The movement two-label IF has a required compiler-branch adapter, and the
command adapter must handle original calling conventions. These are explicit
integration dependencies. Tests provide named fixture implementations for
unfinished routines; there is no default successful no-op or playable host.

## D-015 — Preserve POINTS storage and expose unsupported compiler paths

POINTS retains one session-owned POLOCL object: four totals, selection flags
and output width. It reads the same score words as turn accounting, formats
each row before adding its score to the corresponding total, and uses signed
integer division for averages before OFLT. Canonical selection flags are
represented as Booleans because all assignments in POINTS set true or false.

Reason: a separately computed score summary would obscure persistent state,
source rereads and division order. Header padding, explanatory suffixes and
embedded blank lines come from the source messages and calls.

Final entry executes the known assignments at label 500, then requires a
compiler adapter for the uninitialized DO continuation. No default skips the
loop or converts the call into an ALL command. Pre-game rendering requires a
separate adapter for the compiler's SCORE(i,0) evaluation/memory behavior.
Missing adapters raise internal unresolved-execution errors; divide failures
likewise preserve prior output/state without inventing a terminal message.
These are release dependencies, not accepted gameplay differences. Tests using
explicit compiler fixtures establish composition only, not PDP-10 equivalence.

## D-016 — Preserve identity entry counters and LIST argument aliases

STAT reads the shared JOB backing words as each output field is reached.
STAT.Y accepts the actual register counter rather than imposing STAT's public
item-count convention. Its pending OSTS caller must resolve immediate address
formation before negation; the source operand is not a JavaScript expression.
USERS requires ALIVE interpretation and current-player coordinates as services,
including the pre-game WHO=0 memory policy when privileged locations are shown.

LSTUPD uses mutable word arguments so a caller can pass the same storage for
the mask, counter and accumulated flags. It keeps sequential writes, repeated
counts and later-wins closest ties. Password state is a normalized Boolean
input to these component ports; binding the raw PASFLG word still requires
the compiler flag contract.

Reason: snapshots, deduplicated collections, ordinary nonzero logical tests,
or reordered selection predicates would change source behavior. These ports
add no new listing rules or user-facing messages. LIST traversal/output now
compose these helpers; compiler bindings, GRIPE logging and full session
integration remain unfinished.

## D-017 — Keep LIST storage, group parsing and unresolved reads explicit

The LIST family shares one session-owned LSTVAR object. Its output arrays and
markers occupy the original 108-word reset range, including column-major
BASE flags and PXF's zero lower bound. Stable word references connect it to
LSTUPD's aliased arguments. Group and traversal fields sit outside the reset.
This component allocation is not a complete COMMON overlay or startup model.

The parser keeps source keyword order, one-based token position, partial
mutations on errors, and different alternate-return destinations in the
driver. NTOK does not replace scanning the persistent token memory. The low-level
driver retains traversal/output callbacks; listCommand now supplies the ported
source routines through those boundaries.

Reason: a parsed request object, deduplicated ship-name set or transactional
rollback would change behavior. The unassigned local SHIP is not silently
renamed to SHIPS, and last-slot coordinate lookahead is not silently clamped
or made short-circuiting. These reads require explicit compiler/memory
adapters; missing adapters stop internally without a new in-game message.
Tests use named memory/traversal fixtures and make no original-execution claim.

## D-018 — Preserve LIST report effects and require compiled literal bytes

LIST traversal and reports operate on the same player objects, ordered base
and planet records, packed board and LSTVAR output words. These record views
are component interfaces, not a complete HISEG/COMMON memory replacement.
LSTSUM receives mutable count/flag references; scan knowledge changes only at
the original post-row writes. Coordinates use the current session position
for PRLOC while selection distance uses the saved SVPOS/SHPOS.

Reason: precomputing report rows or making summary functions pure would erase
source reads, argument writes and persistent visibility changes. Named/direct
output is retained separately from deferred LSTOUT, including output already
emitted before a later syntax error. Empty-object fallthrough is preserved.

The runtime supplies raw logical interpretation, the prior implicit DUMMY
word, and compiled bytes for six FORTRAN literals. Source literal spellings
are catalogued, but no default padding/termination policy is selected. Named
ASCIZ text still comes directly from the extracted message catalog. Reversed
base-selection and planet-output DO bounds require explicit compiler policies.
These unresolved services are release dependencies; tests use explicit fixtures
and do not establish historical terminal or compiler equivalence.

## D-019 — Keep SCAN's packed screen and separate display from knowledge

SCAN's renderer uses the original 200-word buffer layout, six metadata words,
nine-word row stride and seven-bit byte placement. SETSCN overwrites only the
bytes it writes; MARK reconstructs its region from the current packed board.
OBJTBL is extracted separately from ODISP because their object symbols differ.
O2DB and SHWSCN preserve source label spacing and row-boundary Ctrl-C behavior.

Reason: a formatted grid or reuse of LIST symbols would lose buffer tails,
cloaking/black-hole behavior and label quirks. Restricting scan knowledge to
the visible rectangle would also change later LIST results. Knowledge and
warnings therefore follow the source KRANGE loops after screen construction.

SCAN locals and SCREEN are component storage, not yet a complete shared LOCAL
overlay with every other command. Current position remains a required service;
invalid bounds, pointer accesses and object-table execution stop internally
where the full original memory model is required. No new terminal error or
automatic correction is introduced. Numeric words use existing 36-bit helpers;
compiler overflow traps and monitor interrupt scheduling remain release gates.

## D-020 — Expose ENERGY's floating conversion and retain its transfer order

ENERGY operates on shared ship energy and the existing LOWSEG hit registers.
GTKN and MAKHIT remain required call boundaries. The amount is scaled before
validation; receiver capacity is applied after the floating loss calculation;
the donor charge is recomputed from the delivered amount with integer division.
The command does not clear other hit fields or refresh ship condition.

Reason: replacing the expression with a flat ten-percent deduction, an integer
ratio or a JavaScript float would assume rounding behavior absent from the
archive. The required intTimesPointNine service represents the whole compiled
conversion/multiplication/INT expression. No default is selected; its absence
raises an internal unresolved-arithmetic error without adding terminal text.

Tests use explicit arithmetic fixtures to establish composition with the real
hit queue, recipient report, GTKN and dispatch. They cover full/over-cap
receivers and stale hit fields; these are source behaviors, not corrections.
They do not establish PDP-10 floating-point or monitor equivalence.

## D-021 — Retain TELL's incremental effects and distinct message calls

TELL operates on shared NOMSG, ship damage/ALIVE and the packed galaxy, plus
session DBITS, DISPFR, GAGMSG and all seven GROUP slots. It preserves the
17-word routine-local message buffer separately from the /LOCAL/ overlay.
GTKN, ROMSPK and both MAKMSG call forms remain explicit service boundaries.
The human path composes with the existing raw-line queue operation; Romulan
paths pass the same packed buffer supplied to ROMSPK.

Reason: validating every destination up front would change radio enabling,
diagnostics, queued Romulan replies, relocation and repeat rejection. DBITS
is restored only after the immediate Romulan MAKMSG call returns; DISPFR is
not restored there. Recipient filtering and ungagging occur later, before the
human message prompt. No transaction or rollback is introduced.

Raw logical interpretation and compiled 'Romulan' literal bytes remain required
services. ROMSPK is not yet ported; tests clearly label their speech fixture.
Bits above KNPLAY survive TELL, exposing the existing MAKMSG memory boundary
instead of silently narrowing populations. Romulan OUTMSG also reaches
BITS(0); that source-layout dependency remains unresolved. These boundaries
prevent a complete Romulan communication or full session parity claim.

## D-022 — Port ROMSPK text and preserve message-array aliasing

ROMSPK copies seven-bit bytes into the supplied packed buffer, keeping bit zero
and unused trailing bytes. Its 29 phrase strings, 46 node strings and population
masks are extracted from WARMAC with source locations. The port retains the
raw PLAYER zero test, exact random draw schedule, GETLIN right-half lookup,
literal ANDI masks, and broadcast plural suffix. It requires the real GETLIN
word and shared BITS reads; no modern terminal-name inference is substituted.

The previously unresolved communication accesses from D-021 now have component
memory adapters. HISEG puts HITFLG directly after MSGFLG, so MAKMSG indices
11 through 20 increment those same hit counters. OUTMSG's BITS(0) reads the
last NAMES word. The adapter requires that word from the caller rather than
selecting an unproved FORTRAN literal-padding convention. BITS(11:18) are
not initialized by BLKDAT, so OUTMSG no longer invents powers of two for them.

Reason: clamping recipients or skipping Romulan gag checks would change both
output and later queue/hit state. MAKMSG retains all 36 shift-loop iterations,
although its link and metadata hold only 18 recipient bits. Full mask 777777
is converted to zero by GETMSG, and excess linked bits survive ordinary player
reads. Tests compose the actual routines and show these effects. Missing
surrounding memory still stops internally; the component adapters are not a
complete HISEG image or proof of original compiler/monitor execution.

## D-023 — Preserve GRIPE's word buffer, routing and file-prepend protocol

GRIPE uses explicit core-memory reads/writes, .JBFF/.JBREL/FL.FF fields and
dump-mode I/O descriptors. OGCH deposits seven-bit characters into the same
packed words later passed to the disk routines. New text precedes the old file
at a whole-word boundary, including any padding in the last new word. A shared
formatter tracks HCPOS/BLANK across terminal/log output switches.

Reason: replacing this with a modern text append, separate formatter state or
unconditional buffer clearing would alter the file, terminal spacing and memory
effects. OGCH retains the initial word, zeros the following twenty words when
growing, and drops the current character after a failed CORE request. The
driver retains twenty-line input, busy-file retries, virgin-file length repair,
error cleanup, source board removal/restoration, and distinct direct warnings.

OSTS and the address-check dump are ported as source routines. Date/time calls
share scratch words; instruction/stack/queue dumps use fixed-width octal digits
and caller-supplied raw addresses. GRIPE's statistics path composes the real
SHOSTA and STAZAP against their shared buffer. The extraction catalog supplies
all fifteen GRIPE strings, including ASCIL/WARN expansion from local macros.

Live INLI, OPEN/CLOSE file-stack behavior, CORE, monitor output and crash memory
remain mandatory runtime services. Test file/core stores are explicit fixtures,
not a chosen production persistence format or complete process memory model.
Unresolved memory reads stop internally with earlier effects retained; no new
in-game error or automatic rollback is introduced.

## D-024 — Read HELP and NEWS as byte streams

HELP/SHLP and NEWS retain their byte-at-a-time state machines and explicit
OPEN, SETI, ICHR, CLOSE, TTYON and GTKN boundaries. SHLP receives the canonical
two-word command/topic entry after SLST matching. OLST outputs the stored ten
bytes per entry and uses seven entries per row, as the instructions specify.
HELP/NEWS inline output is extracted separately from the external help/news
files; the latter remain unchanged archive files.

Reason: a pre-parsed topic map or generic pager would change consumed bytes,
line endings, first-line recognition, keyword lookahead, form-feed handling,
interrupt boundaries and cleanup. SHLP drops form feeds, while NEWS emits
them and can page after them. Their open-failure and flag-reset paths differ.
HELP's unreachable TTYON instruction is not made reachable by the port.

Tests compose the routines with dispatch, real GTKN continuation and the
existing ESHP/PSHP helpers. Every public command/extra topic and the complete
supplied NEWS file have source-derived byte checks. File/monitor services
remain explicit; no host path search, file-selection policy, terminal echo or
historical Telnet behavior is inferred from those fixtures.

## D-025 — Preserve pre-game calls and re-entry timing at their source boundaries

PREGAM and XGTCMD retain separate prompt loops, all sixteen command slots and
the original call arguments. JOBSTA receives references into the first six
LOCAL words. TYPE receives no argument; a runtime binding must resolve that
calling convention. Compiled FORTRAN literals, including DOCUMENT's continued
string, require explicit bytes. SHOSTA's logical argument requires the compiler
representation at its assembly boundary; composed tests explicitly use -1.

Reason: selecting TYPE(0), independently copying identity, or treating logical
true as numeric 1 would silently choose behavior the source does not justify.
Private commands remain matchable without a password, with the source's later
PASFLG gate applied only to *ZAP. PRGNAM and ECHON/ECHOFF are omitted only
because their linked implementations immediately return.

KILCHK retains every clock read and the first INPUT timeout's use of TIMLFT
after conversion to seconds. Later iterations use milliseconds. The supplied
KWAIT remains zero; tests reach the wait path with explicit future timestamps.
BACKUP is extracted as eight backspaces, NUL and bell; OUT stops at NUL. CC1/CC2
change counters before unlocking and exiting, with no clamp or extra FREE.
Required monitor/lock/exit services remain visible and are not production stubs.

## D-026 — Preserve SETUP's initialization order and PLACE's rejected draws

SETUP retains its full control flow, explicit no-argument versus zero-argument
CCTRAP calls, shared player/score words, and release of FRELOK before UPDCAP,
score clearing and ship reservation. It does not combine these operations into
an atomic modern transaction. Two-session tests demonstrate that both sessions
can select the same still-vacant ship during commissioning.

Reason: moving reservation under the lock, checking ALIVE(I) in the terminal
speed loop, correcting PLACE's raw planet-code comparison, or skipping stale
base slots would change the source behavior. PLACE writes its by-reference
coordinates on every retry, draws V before H, and never adds the loop index to
the object code. Nonpositive placement counts require a compiler DO adapter.

The port requires an HFZ-through-HLZ zeroing service, including unmodeled words;
it does not replace that operation with a partial production reset. NUMPLY,
NUMSID and personal SCORE lie outside that range. Test memory fixtures cover
the modeled subset and keep their limits explicit. Initial DATA values still
belong to the future complete memory/loader binding.

Star count's INT(51*RAN(0)) and hole count's INT(41.0*RAN(0)+10) remain separate
required arithmetic calls, in source order. Integer placement composes the real
RNG; floating results are explicit fixtures, not JavaScript approximations.
The side-effecting clock OR and REGULAR's two-label IF require compiler
adapters. Literal output bytes, single-word GROUP assignments and raw tournament
token words are likewise supplied explicitly. No historical execution claim is
made for those fixture choices or the existing 36-bit integer overflow contract.

## D-027 — Keep application entry distinct from monitor startup and trap delivery

DECWAR's entry driver invokes the ported command loop after PREGAM, SETUP,
APRSET and PLACE. Experience selection runs once; WHO=0 returns to PREGAM
without clearing the session or repeating the initial reports. Numeric and
text experience fields are checked independently in source order, and invalid
input keeps the values left by the required LFZ:LLZ clearing service.

Reason: a modern login wizard with validation/retry or reset-on-death would
change the source command stream and session state. The driver retains the
original internal version 24 and displayed version 2.3. It adds no KILCHK call;
the supplied executable source defines that routine but contains no call to it.
FRCCHK clears JSQTIM, then its CHKSEQ target immediately returns.

Six initial literals and all 27 lines of DECWAR's five fatal messages are
extracted with source locations and newline arguments. Runtime literal bytes
remain an explicit compiler service. A dedicated transfer signal represents
the monitor jumping to installed label 9999, unwinding the suspended generator
calls. Only that signal selects a fatal message and runs common cleanup;
ordinary host errors are rethrown. This is a modern control-flow mechanism,
not an implementation of APR delivery, register capture, stack replacement or
the WARMAC trap's preliminary GRIPE call. Those operations remain required.

Tests compose real source routines with explicit monitor, compiler and memory
fixtures. They do not provide a production Telnet/session host or settle
out-of-bounds cleanup, final POINTS loop behavior, or the trap's unset-target
branch. No arbitrary runtime error is hidden behind a fictional game death.

## D-028 — Preserve TRACTR's missing argument and TRCOFF's live references

TRACTR is ported with a required argument-address resolver on paths that write
IP. DECWAR's CALL TRACTR still supplies no argument. Applying a beam does not
access IP and can proceed without the resolver; bare-command deactivation and
OFF require it at the original first write. The port does not create an IP
local or expose an invented in-game error when the contract is unresolved.

Reason: IP=WHO is an observable write through a FORTRAN dummy argument, even
when OFF finds no active beam. Substituting a local variable would conceal an
unknown memory effect. TRCOFF now shares one by-reference body with the command
and the existing lifecycle helper, rereading IP after its first TRSTAT clear.
Component memory services handle BITS and TRSTAT; exceptional indices require
actual surrounding words. In HISEG, TRSTAT(0) aliases NUMROM and BITS(0) aliases
the last NAMES word. Partial effects are retained when a later access fails.

Validation retains team-before-ALIVE, inclusive adjacency, target beam before
shields and strictly negative shields. No extra device/energy check or turn
charge is added. Both pair assignments precede IWHAT/DBITS and MAKHIT. Other hit
fields remain stale until MAKHIT clears them; its sender is the caller's WHO.
Tests compose actual hit delivery, SHIELD raising and FREE cleanup. Movement
while towing, remaining combat release callers, monitor events and compiler
argument binding remain unfinished.

## D-029 — Preserve movement's conversions, token mutations and partial effects

LOCATE/RELOC, CHECK/CHKPNT and MOVE/IMPULS use required real-arithmetic services
with opaque values. There is no production JavaScript-number or exact-rational
fallback. The rational implementation under test/support is an explicit
mathematical fixture for control flow and operation order; it does not resolve
PDP-10 rounding, exponent limits, compiled constants, RAN or traps.

Reason: LOCATE performs mixed integer/real coordinate addition, CHKPNT converts
scaled fractional coordinates to integer hundredths, and towing truncates at
different stages for board and ship-storage writes. Replacing all those steps
with one modern coordinate calculation would erase observable source behavior.
CHECK's output is bound in physical COMMON order despite its H/V names being
opposite to MOVE's names. It preserves both candidate reads before random
rounding, the second DISP read on collision, and galaxy exits with no DCODE.

The routines retain persistent locals and source argument references. LOCATE
keeps independent token arrays, backwards COMPUTED expansion, early NTOK
changes and partial errors. Compiler services are required for reversed DO
bounds, raw logical evaluation and adjacent token memory. MOVE charges the
requested distance before locking, does not recheck after a lock wait, and
retains the charge after lock failure. Towing runs after unlocks, writes before
clearing, and does not repair board/stored-position discrepancies. Source-scaled
output and random draws remain in statement order.

Tests compose the actual parser, LOCATE, CHECK, packed board and movement
through dispatch, with explicit runtime fixtures. Full shared-memory aliases,
monitor scheduling and session integration remain pending. This decision adds
no approximation accepted for a strict release and makes no original-execution
verification claim.

## D-030 — Separate phaser control from required shared damage, retaining combat state order

PHACON now executes the source driver with actual LOCATE/RELOC, PRIDIS,
PHAROM, hit-queue and output compositions. Its ship/base PHADAM call remains a
required dependency. Tests of those driver branches supply labeled call effects;
they do not implement approximate damage. The next damage port must implement
the shared TORDAM/PHADAM body, including its different entry guards, random
schedule, PWR, critical damage, scoring and compiler-dependent branches.

Reason: treating a driver port as working ship combat, or replacing the damage
body with a plausible formula, would change the requested source of truth.
Planet and Romulan paths can already be composed through real routines. The
separate ROMDRV damage entries preserve integer truncation and death state
without requiring an invented Romulan movement implementation.

PHACON preserves waiting before size validation, shield cycling at KSHCON=0,
overheating before damage, stale planet-hit fields, announcement filtering and
final energy/recharge ordering. PRIDIS retains its numeric ALIVE<=0 test rather
than adopting the driver's logical predicate. Compiler services expose eager
ALIVE/DISP evaluation. The real-arithmetic service remains required; the rational
fixture is not an accepted machine-arithmetic replacement.

JUMP and BASKIL are ported as further shared-damage prerequisites. Their effects
remain narrowly source-defined: JUMP keeps old coordinates after black-hole
death, and BASKIL keeps docking when NUMCAP<=0 even without a surviving adjacent
base. No cleanup or consistency fix is inserted. Complete memory aliases,
compiler and monitor behavior and all caller integration remain open.

## D-031 — Port shared damage control flow and PWR without selecting a floating runtime

TORDAM and PHADAM now share one source-labeled body, with their distinct entry
initialization and guards. It calls the ported JUMP and BASKIL in composed tests.
PHACON now composes actual PHADAM ship/base damage through scoring, notification
and command dispatch. This advances D-030's required dependency; isolated driver
tests remain useful call fixtures but are no longer the only damage evidence.

Reason: the shared labels encode behavior that a single modern damage formula
would lose. Immediate critical base hits skip normal damage/scoring, torpedo
deflections can still displace ships, and independent real-to-integer assignments
change hull/energy by different integer amounts. Stale registers and the ordering
of BASKIL before clearing a base are observable and remain intact. No new shield
caps, target-alive guard for phasers, tractor release or docking cleanup is added.

PWR is ported with its assembly multiplication tree, including negative powers
returning 1.0. Its FMPR operation and loaded floating constant remain required
services. Damage also requires real comparison/AMAX1, floating RAN and compiler
logical/evaluation/two-label-IF services. Test arithmetic is exact rational and
explicitly cannot prove machine rounding, overflow, traps or compiled expression
behavior. Complete memory aliases and live monitor/session integration remain
required before strict parity, as do TORP and the remaining combat producers.

## D-032 — Keep nova effects separate and preserve fixed stack/planet storage

SNOVA, NOVA and PLNRMV are ported before connecting TORP's explosion branches.
NOVA uses its own damage, score and cleanup algorithms; it is not rewritten
as a TORDAM call. Tests compose the actual displacement, tractor release, base
loss, recipient selection, hit queue, planet removal and ENDGAM routines.

Reason: ordinary weapon damage and novas differ in device draws, team-score
writes, base count/cleanup order and notification clearing. Reusing one formula
or normalizing stale hit fields would change the supplied implementation.
Planet removal likewise shifts each of four columns independently, preserves
the final stale row and decrements existing display codes instead of rebuilding
a modern list of objects.

SNOVA keeps the original column-major stack memory, physical scan order and
LIFO processing. It rereads victim identity on pop and clears accepted stars
on push. The pending-star limit remains 29 despite 80-row declared storage.
No larger dynamic stack, cached target identity or corrected capacity is used.

Compiler OR evaluation controls the embedded IRAN calls; arithmetic, unusual
loop bounds, full memory/BLT behavior and live monitor services remain explicit
requirements. Nonreturning ENDGAM inside a locked planet-removal path retains
the source control flow without adding a finally-unlock. TORP's driver is still
pending and these tests do not claim a playable game or historical execution.

## D-033 — Preserve TORP's burst control flow and compose actual combat dependencies

TORP now implements its full driver through the original collision branches.
Tests compose LOCATE/CHECK, shared TORDAM, TOROM, JUMP, TRCOFF, SNOVA/NOVA,
PLNRMV, packed hit delivery and command dispatch. Consecutive shots observe
the preceding shot's board changes. Source-derived byte fixtures cover a full
three-shot burst at all output levels through MAKHIT/GETHIT/OUTHIT.

Reason: validating a burst once and then applying damage to cached targets
would lose the source's retracing behavior. Stricter argument validation,
discarding a misfired shot, restoring spent ammunition after lock failure or
normalizing cleared hit fields would also change observable results. The port
retains partial-inline stale-token reads, seven-word TOLOCL storage, by-reference
IDUM aliasing, post-wait reads, independent collision draws and the distinction
between TOBANK recharge and PTIME turn accounting.

No production machine arithmetic or scheduling assumption is introduced.
Real/RAN operations, compiler logical/evaluation rules, inline literal bytes,
exceptional loop bounds and live monitor services remain explicit requirements.
Exact-rational fixtures exercise source control flow without claiming PDP-10
rounding. Full COMMON memory and session binding remain unfinished, as do the
other defense and Romulan producers. This decision accepts no new approximation
for a strict release and makes no historical execution-equivalence claim.

## D-034 — Keep base and planet defenses distinct while composing shared damage

BASPHA, PLNATK and BASBLD now implement their source drivers. Tests compose
actual PHADAM/PWR, PHAROM, PRIDIS, MAKHIT/GETHIT/OUTHIT and finishTurn. Team
scores from defenses coexist with the triggering player's later turn-score
commit. Notification waits preserve the original ordering before base rebuilding and
stardate accounting.

Reason: a generic automated-attack helper would hide differences in target
classes, power scaling, recipient masks, sender metadata and score ownership.
Planet fire's fixed PHADAM class 2 and undivided Romulan power remain literal
source behavior. Neither driver inserts tractor cleanup. Stale registers,
live reads after calls, physical traversal and compiler-controlled random
evaluation remain visible. Base repair keeps its initial division even when
the player-specific calculation replaces it, with no minimum repair increment.

No new machine-arithmetic approximation is accepted. Driver arithmetic uses
the existing 36-bit integer primitives; shared damage still requires the real,
RAN, PWR and compiler services. Exact-rational tests do not establish historical
floating behavior. Divide exceptions are tested at source expression positions
without inventing monitor trap handling or game-facing error text. Complete
COMMON/session bindings and BUILD/CAPTUR/Romulan callers remain unfinished.

## D-035 — Preserve partial construction and capture state across failures and death

BUILD and CAPTUR now follow their source drivers, composed with location input,
planet removal, docking checks, defensive damage, hit output and turn accounting.
Their shared TypeScript acquisition/formatting code still requires independent
local storage for each original routine. Locks and score/timing assignments
retain each command's separate order.

Reason: wrapping either command in a transaction would change the source.
BUILD can retain fifth-build points on failure; lock failure also retains five
builds, while a full slot scan subtracts one. Successful conversion increments
base count and copies knowledge before PLNRMV and only initializes the base
after removal and unlock. CAPTUR performs BASKIL against old ownership, changes
ownership before defending fire and awards capture points even when the ship
dies. None of these outcomes is repaired or rolled back.

Tests cover the full five-build sequence, exact conversion output across all
verbosity/coordinate modes, actual ENDGAM's return with the new base count,
nonreturning removal effects, critical defensive hits, and actual automatic
REPAIR/score accounting after capture. Required compiler literal, arithmetic,
memory and monitor services remain explicit. These are source-derived tests,
not evidence of historical executable equivalence; the complete host and
remaining Romulan/debug paths are still required.

## D-036 — Preserve Romulan target memory and CHECK direction aliases

DIST, ROMSTR and ROMTOR are ported before connecting ROMDRV. Tests compose
actual target selection, path tracing, shared torpedo damage, displacement,
tractor release, nova chains, planet removal and packed hit output. These
advance the dependency graph without replacing ROMDRV with a simplified AI.

Reason: a modern nearest-target search or copied direction vector changes
observable source behavior. DIST retains per-class stale coordinates, uses a
finite squared-distance sentinel, has different ship eligibility tests by team,
and reports PDIST after squared-distance selection. ROMDRV's V1/H1 arguments
alias CHECK output; the path tracer writes them before reading its direction.
The tests preserve that storage relationship instead of repairing it.

ROMTOR stays separate from player TORP: silent misses, extra post-misfire RAN,
post-third-shot retargeting, forced IWHAT after damage, planet collision-draw
reuse and self-nova return before recharge all remain intact. Source word and
argument storage, compiler evaluation and required real/RAN operations remain
explicit. Rational fixtures establish control flow and compositions, not
historical floating execution. ROMDRV scheduling/movement, full memory and
monitor/session bindings remain required for a strict release.

## D-037 — Keep ROMDRV source scheduling and shared caller state

ROMDRV's full main entry now composes its existing dependencies instead of
using a new AI scheduler. Source counters, compiler-controlled OR evaluation,
strict clock comparisons, negative-axis escape order, physical CHECK argument
aliases and persistent PLAYER changes remain visible. Its explicit local
storage also preserves values across suspended calls.

Reason: smoothing weapon availability, resetting new-spawn deadlines, choosing
a symmetric obstacle detour or guarding defenses after Romulan death would
change source behavior. Tests retain these cases and compose actual phaser
and torpedo damage, packed notifications, speech and both defense drivers.
The finishTurn composition verifies the additional defense cycle and the
later command-loop responsibility for resetting PLAYER.

No arithmetic approximation or profiling compilation default is introduced.
Column-D lines require a debugLine binding covering compilation choice,
compiled literals and TIMIN/TIMOUT monitor behavior. Full COMMON storage and
production runtime/session bindings remain unfinished. The 32 new tests are
source-derived specifications, including exact hit and movement output;
they do not constitute original-executable differential verification.

## D-038 — Preserve timer exhaustion and direct diagnostic output

DEBUG, TIMSRC, TIMIN, TIMOUT, DEBDEC and DEBOCT now follow the supplied
assembly, with the TIMERS allocation cross-checked against HIGH.FOR and
DECWAR.MAP. Tests compose both command dispatch paths and ROMDRV's profiling
service, plus table saturation, nested timing, failed clocks and raw output.

Reason: a modern timer dictionary would hide first-word name collisions,
stale counters, slot-zero sentinel reuse and the report's memory underflow.
A standard decimal formatter would also change negative diagnostic operands;
the normal game output buffer would change cursor accounting. The port uses
source word operations and direct monitor output services for these paths.

The new storage windows require explicit initial words and preserve physical
array offsets. Access outside the window requires surrounding memory. No
column-D compilation mode, literal representation, CPU-clock replacement,
loader initialization or missing stack/monitor semantics is silently chosen.
Thirty new tests advance source parity but are not historical differential
verification; the complete memory/runtime/session host remains unfinished.

## D-039 — Bind gameplay views to source COMMON addresses

The new memory layer uses generated HISEG/LOWSEG layouts, independently
checked against WARMAC declarations and the supplied link map. It exposes
existing object and array APIs as accessors over caller-owned source words.
Two job address spaces can share high-memory backing while retaining separate
low-memory registers. Initialization remains an explicit loader responsibility.

Reason: copying records between a modern world model and COMMON memory would
lose aliasing and allow the copies to disagree. Direct views preserve ordinary
updates and unusual subscripts, including ship/device index zero, message
counter overflow, token-array overruns and DEBUG's read before TIMERS. A full
memory provider can resolve these addresses across block boundaries.

Twenty-nine new tests compose existing damage, repair, placement, notifications,
turn scores and ship release with the memory views. Exact startup clear spans
and cursor bookkeeping are also verified. Required compiler logical policy,
DATA/literal loading, routine-local/queue/stack storage and monitor/session
integration remain explicit. No completed host or historical differential
verification is claimed.

## D-040 — Install source DATA explicitly and read its live words

All twelve selected-build FORTRAN DATA statements now generate a typed,
source-located image description. Separate installers write 187 shared HISEG
words and 32 private PRECMD words, leaving other memory untouched. Compilation
of all 169 quoted/Hollerith words requires a caller-supplied policy; there is
no production padding or literal-encoding default. D-042 corrects PRECMD's
initial type metadata: it inherits INTEGER through PARAM, not REAL.

Reason: JavaScript constant tables hide memory aliases and changes, while
initializing DATA on every SETUP call would reset an existing galaxy. The
selected BLKDAT's ten BITS initializers also cannot be replaced by the eighteen
in excluded DW2. Explicit installation preserves load-time semantics without
inventing initial contents for words the source does not initialize.

Command, help, terminal and device consumers can read live memory tables.
Thirty new tests cover extraction, compiler inputs, shared/private installation,
first-galaxy and later-join SETUP, command scan termination and output read
order. Compiler semantics, uninitialized memory and complete runtime/session
wiring remain required. These source-derived tests do not establish execution
equivalence with an original binary.

## D-041 — Bind both communication queues to shared source words

The WARMAC queue allocations now generate a checked layout from their BLOCK
declarations, numeric radices and module base in the supplied map. Queue
constructors can bind headers, serial, links and payloads directly to an
address space. These constructors perform no initialization; explicit SETQH
and SETQM retain the source's limited clearing behavior.

Reason: isolated JavaScript arrays hide cross-job sharing and physical aliases.
Replacing a hit payload array also detaches existing references from its
storage. Live row views preserve those relationships and let GRIPE see the
two words beyond HITQL. Memory-bound recipient lookup uses the source BITS
word, and MAKHIT's counter loop now preserves full-word traversal and the
source's DBITS-clear-before-increment ordering.

Twenty-four tests cover initialization, queue delivery between jobs, source
overflows, notification bytes, FREE and GRIPE. They complement existing queue
and combat tests without claiming instruction-level concurrent execution.
Complete local/stack/register bindings, scheduling, runtime semantics and
session integration remain required for strict parity.

## D-042 — Resolve include-scoped types and bind named private COMMONs

The initial extraction incorrectly classified HILST and PRECMD as implicit
REAL by applying the language default without following PARAM's includes.
PARAM.FOR:21 explicitly declares `IMPLICIT INTEGER (A-Z)`. Both fields are
INTEGER. Extraction, generated metadata, tests and explanatory documents now
reflect this evidence; no runtime floating workaround is introduced.

Fifteen generated views bind eight named private COMMON blocks to their source
layouts and linked bases. LIST, SCAN and pre-game identity share the same LOCAL
words. POLOCL preserves DECWAR's nine-word TOTAL alias over POINTS flags and
width. FREE/RSTART, distance, torpedo, supernova and message storage now retain
physical aliases and values across routine calls.

Reason: separate modern objects erase these overlaps and can restore stale
copies after another routine modifies memory. Live views preserve the source
relationships without constructor clearing. Explicit logical-word policies and
opaque REAL codecs keep compiler semantics visible; unnamed DUMMY storage is
also supplied rather than invented.

Twenty-five new tests cover the corrected types, layouts, initialization,
overlays and actual LIST/SCAN/POINTS/FREE/RSTART/DIST/TORP/CHECK/SNOVA paths.
Unnamed locals, temporaries, input, stack/register state, monitor semantics and
complete session wiring remain unfinished. The artificial rational-ID codec
used in tests is not a production floating-point implementation.

## D-043 — Keep input and token state in source memory

Command input now has a memory-backed implementation using WARMAC's character
words, absolute token pointers and live LOWSEG arrays. The extracted input
span uses the supplied CCFLG. map symbol as its anchor. GTKN exposes its
buffer-increment and line-acquisition stages so source pointer state remains
visible during output and lock waits.

Reason: a detached string scanner cannot observe another routine's LINBUF or
PTRLST edits, and committing a complete parsed command at once loses partial
writes on overflow or unsupported floating input. The memory scanner retains
those effects, the appended EOL pointer and the slash's position until the
next GTKN call. Completed repeat input reuses the current buffer words.

USRNAM's early BUFPTR clear was corrected to the source exit order. STATUS
now uses existing surrounding token views instead of attempting to resize
them, and writes its text words before the separate type loop. FORTRAN text
assignments require a compiler word encoder; scanner
character deposits and forced QUIT retain their explicit assembly encodings.

Thirty-one new tests cover storage, partial parsing, waits, hangup, repeat, aliases
and actual command/input/message compositions. Per-keystroke INLI, monitor
echo and interrupts, ANUM floating/X3 execution, full instruction addressing
and the complete session host remain unfinished.


## D-044 — Execute input editing against live words

INLI now writes LINBUF and CHRCNT after each accepted character, with retained
caller-owned F/C/T1 registers and required ICHR/output services. NXCH uses all
128 extracted CBITS entries; the memory token scanner shares their classification.
GTKN and MAKMSG accept an explicit already-stored result and skip their
completed-string adapter when the input service owns memory. This preserves
OUTPUT-before-BUFPTR ordering and avoids overwriting changes during lock waits.

Reason: an edited string cannot reproduce first-character timing, stale words
after deletion, or direct redisplay output. The executable skip instructions
also distinguish INI input and characters flagged as supplying a line feed.
ECHG selects ECHON/ECHOFF, but both immediately return in the selected source;
there is no invented echo state change or terminal backspace sequence.

DISP requires an AOBJP CPU service rather than silently choosing a halfword
carry policy absent from this archive. Tests supply an explicit policy over
non-boundary addresses. The caller must bind HUNGUP/ECHFLG/INIFLG/BLANK to live
state and provide ICHR, OCHR, direct monitor output and OUTPUT behavior.
Generator read suspensions expose input waits; they do not implement arbitrary
instruction-level interruption or blocking output scheduling.

Twenty-eight source-derived tests cover input/editing/output order and actual
GTKN/MAKMSG composition. Monitor echo, interrupts, file input, complete register
aliasing/address execution and the session/Telnet host remain unfinished.


## D-045 — Preserve character input branches and file handoff in live state

The extracted runtime span covers WARMAC's ECHFLG through IC, anchored by the
same CCFLG. map symbol as LINBUF. Its 97 words overlap the existing input view
without copying or initializing storage. INWAIT uses LOWSEG's INFLAG word;
CCFLG, HUNGUP and BLANK share LOWSEG with the other routines.

ICHR.T now exposes the source INWAIT writes around each monitor read and
rechecks flags after resumption. Its interrupt path returns LF, following
MOVEI C,12 instead of the misleading ESC comment. ICHR.B decrements the live
indirect counter before reading/refilling, consumes NUL bytes and treats the
IN instruction's skip return as EOF. IICH preserves the distinct cancellation
and EOF paths, conditional echo, two flushes, SETI and saved X1/P1 restoration.

SETI updates live file/dispatch words in source order, including halfword
preservation and the channel deposited in its IN instruction. The assembler's
IN instruction left half and missing monitor .BFCTR/.BFPTR constants remain
required inputs. CPU effective-address resolution, ILDB, IN execution and
indirect dispatch are explicit services, not guessed JavaScript replacements.
Terminal OUTPUT, INCHWL, CLRBFI and SKPINL remain monitor operations; OPEN and
CLOSE remain file-stack dependencies. Their timing and echo are not inferred.

Thirty-two tests cover storage, suspended input, refill and INI switching,
including actual SETI/ICHR/INLI/GTKN compositions. Fixture addresses, simple
indirection and byte arrays are explicit test policies, not production defaults.
Complete loader/register/interrupt behavior and the session host remain open.


## D-046 — Execute character output against live state and suspend at output

SETO and OCHR.B/OCHR.T/OCHR.X now operate on the extracted I/O block and live
LOWSEG cursor/blank state. Buffered output decrements before depositing or
flushing; after OUTPUT it saves AC0, forces the current indirect count to 80,
restores AC0 and retries. Direct terminal output retains the different source
hangup behavior: it skips OUTCHR while still performing cursor accounting.

Reason: appending bytes to a detached output string cannot preserve buffer
aliases, count rewrites, monitor suspension or the distinction between direct
and buffered hangup paths. Required services supply effective addresses, IDPB,
OUTPUT/OUTCHR and instruction constants. No concrete CPU pointer format,
monitor semantics or opcode value is inferred from fixture behavior.

The common accounting tail is shared with TerminalOutput. HCPOS and BLANK now
use 36-bit wrapping operations there too. TAB's source ANDI clears the left
half and applies an 18-bit immediate mask; the previous JavaScript 32-bit mask
was an implementation error and has been corrected. Saved C retains its full
word after control handling, distinct from the emitted seven-bit byte.

INLI/DISP output services can suspend as generators. Their next source store
or HUNGUP check occurs only after resumption, allowing INLI completion to run
the actual buffered OCHR routine. Existing synchronous component services are
still supported. The other command formatters are not yet wired to a fully
suspending output runtime; TerminalOutput's captured bytes remain a component
adapter, not the completed host output path.

Thirty-six tests cover the raw paths, shared accounting and SETO/SETI/INLI
compositions. OPEN/CLOSE, broader output scheduling, stack/register aliases,
production monitor/CPU behavior and full session integration remain unfinished.


## D-047 — Preserve OPEN/CLOSE working blocks and allocation decisions

The supplied STABUF link-map symbol anchors a 700-word span through PT.MAX,
including DEBFLG, buffer headers, interrupt words, FL.FF, FOBLK and LEBLK.
These are live overlapping views over caller-owned memory; construction does
not initialize them. OPEN and CLOSE now execute against those words and a
required live job-data/register interface.

Reason: a modern descriptor stack would invent behavior the selected routines
do not perform. OPEN clears the single FL.FF and overwrites the shared working
blocks. Device-only opens retain old lookup words. Allocation failure leaves
FL.FF set, and FILOP failure compares X3 with the current .JBFF to decide whether
to shrink, even when the buffer was static. CLOSE uses the current working
channel and saved word, clearing FL.FF and restoring .JBFF before its page test.

The port preserves development-mode DSK/PPN and GRP-to-MPH changes, negative
PPN lookup, five-/six-word FILOP descriptors, and separately guarded warning
flush/text. Success advances the return through a required service before the
.JBFF restoration; the boolean result mirrors that return choice. BLT, CORE,
FILOP, GETPPN, assembled CLOSE and undefined .FOLEB remain required services or
constants. Test copying, addresses and monitor outcomes are explicit fixtures.
SAVE/RESTOR currently retain X2/X3 in the routine; real argument-stack memory,
stack faults and arbitrary instruction interrupts are not thereby implemented.

Thirty tests include actual NEWS with OPEN/SETI/buffered ICHR/CLOSE and restoration
of the previous input descriptor. Production monitor/filesystem mapping, loader
state, complete startup/session wiring and strict host behavior remain open.


## D-048 — Load explicit file descriptors and preserve DECINI as a separate entry

The seven TTY/INI/news/help descriptors are extracted as 80 source words. Their
base follows the checked linked queue allocation, with intervening source
lines verified to emit no words. Numeric octal values, channels, SIXBIT text,
word pairs and additions are evaluated directly; unknown monitor constants
and private routine/buffer addresses require a resolver. Relocation is explicit.

The installer resolves the complete span before writing any word. This is a
modern loader-boundary decision: missing symbols must not leave a partially
installed runtime. It is not a claim about historical LINK/LOADER failures.
Installation is explicit and does not supply zeros or guessed values for
unknown symbols or initialize other runtime memory.

DECINI now preserves its direct OUTSTR prompt, raw ASCII choice, retry after
clear/HIBER, expert fallback while hung up, OPEN failure and TTYON/OCRL/SETI
ordering. HIBER receives the source operand octal 10, without interpreting
monitor units. X1/P1 restore after SETI and INIFLG=-1 only on successful open.

Source inspection found no call to DECINI in the selected implementation.
DECWAR.FOR:30-67 implements a distinct token-based experience prompt. Wiring
DECINI into that path would change source behavior, so it remains a separately
ported entry. DECWAR.BEG/INT/EXP, named by its descriptors, are absent from the
supplied archive. No replacement file content is generated from conjecture.

Seventeen tests include a descriptor-backed DECINI/OPEN/SETI/GTKN/IICH/CLOSE
composition with explicitly synthetic file bytes and monitor symbols. Actual
loader/monitor behavior, absent files, remaining descriptors, WARMAC START,
full session wiring and argument-stack execution remain unfinished.


## D-049 — Preserve compiler-facing RESET and runtime transfer boundaries

RESET is the compiler-facing initializer described by WARMAC; START is its
reload destination when .JBFF or the SETUP word indicates missing setup code.
The port preserves this distinction, saves source program registers after
monitor RESET, initializes stack registers/return through required services,
and writes terminal/interrupt state before opening the extracted TTY descriptor.

Reason: calling the FORTRAN program directly bypasses its runtime initialization.
The port now provides RESET's ordered operations and a tested connection to
FORTRAN initialization, without inventing a compiler loader or monitor. Job
words, private addresses, initial IOWD words and register aliases are required.
PUSH/POPJ, GETTAB, SETUWP, APRENB, HALT and output remain explicit operations.
HALT services may return only after the monitor permits continuation; the port
then executes the following source instructions rather than silently retrying.

START builds TMP's six RUN words from the saved program identity, enters RUN,
and calls MONIT only if RUN returns on failure. KILLOW retains the debugger
skip, preserves .JBSA's left half, writes .JBFF before CORE and leaves those
writes in place if CORE fails. The warning follows the existing WARN routine.
No host process launch, file deletion or guessed reload target is introduced.

Nineteen tests cover the raw paths and a RESET/OPEN/SETO/SETI/banner/return →
FORTRAN initialization → ICHR/INLI/GTKN composition. The fixture explicitly
supplies monitor symbols, pointer/stack actions and FORTRAN literal encoding.
Production loader/calling convention, trap/exit handling, arbitrary interrupts,
complete session runtime and a strict host remain unfinished.


## D-050 — Keep lock release and monitor exit on live source state

The 174-word TOBCB-through-TIMLCN span is checked between independent I/O and
STABUF anchors. Lock views preserve the twenty slots and adjacent fields.
UNLO writes both queue right halves, masks the key, clears the highest matching
slot, deposits game bits and enters required DEQ. UNLOCK clears LOCKED before
UNLO; UNLO/ZAPLOK do not. KILALL retains X2 while ZAPLOK leaves its final -1.

MONIT preserves flush, .JBSA right-half clear, ZAPLOK, monitor RESET, WHO/FREE
and MONRT ordering. leaveGame's exit service can yield into MONIT; synchronous
nonreturning exits remain valid. This preserves the source WHO=0 store before
EXIT instead of moving cleanup earlier. A returning RUN also reaches MONIT.

Review found an explicit JRST .+1 inside the FREE literal before the appended
JSQWHO code. It cannot be silently treated as fallthrough. The port requires
the runtime to resolve whether it resumes at MONRT or reaches the appended
cleanup; other targets require an actual machine transfer. Source idioms such
as GTKN:1684-1688 suggest use-site-relative dot resolution, but no supplied
assembler/reference execution establishes this particular literal's target.
Tests mark their branch targets as fixtures. Zero WHO skips the whole literal
regardless of this unresolved target.

Twenty-one tests cover raw memory, diagnostic order and actual lock-release/
MONIT/leaveGame/failed-RUN compositions. DEQ, diagnostic stack calls, arguments,
post-FREE transfer and MONRT remain required services. KILALL's saved X2 is a
routine-level model; full PUSH/POP stack faults and instruction interleavings
are not implemented. Lock acquisition and complete runtime integration remain.

## D-051 — Preserve acquisition waits and diagnostic register flow

LOCK/LOCK. now operate on the same caller-owned lock table as UNLO. Entry
clears LKFAIL/HV.LOK before the descending lookup; existing keys, including
zero matching an empty slot, return without ENQ. Table exhaustion executes the
source read at octal 200000 through required memory behavior. It is not replaced
by an unconditional exception: if the read returns, LOKTAB(-1) aliases WHOHAS.

ENQ, ENQC, UCT and HIBER remain required operations. Busy handling preserves
100/5000/1000 operands, both Ctrl-C clears, the 36-bit deadline addition and
the grant check before clock/cancellation handling. Only error octal 13 takes
the out-of-memory retry path. A timeout with no Ctrl-C jumps to LOCK.0, using
T2 left by diagnostics rather than automatically issuing another ENQ. Diagnostic
output retains its uneven HUNGUP guards. Cancellation sets LKFAIL only after
UNLO returns, retaining LOCKED as the source does.

The state binding aliases LOWSEG/HISEG, input flags and lock words without
initializing them; private HV.LOK requires an explicit relocated word reference.
FNDLOK scans a caller-supplied LOKNAM table, preserves T2/T3 at routine level,
and returns the source BBB/??? fallbacks. Actual SAVE/RESTOR stack behavior is
not supplied by this local register model.

GTKN, INPUT and PAUSE now allow UNLO to yield. This is a TypeScript composition
change required to preserve source call completion before reading input or
starting a wait; existing synchronous services still work. Twenty-eight tests
include live GTKN/INLI/LOCK/UNLO composition and timed-wait ordering. They do not
establish monitor grant delivery, arbitrary instruction interleavings, stack
faults, loader relocation or original-executable equivalence.

## D-052 — Port active interrupt code without re-enabling excluded handlers

The selected DECCMP/CAN1 build omits CISHNG. WARMAC's call that would enable it
is commented out (1156), as is the copied implementation (6450-6556). The
standalone CISHNG.MAC and its HV.LOK symbol in the old DECWAR.MAP describe a
different module set. No active selected statement sets HV.LOK to a grant.
The port must not import that module or fabricate grant delivery to make locks
appear functional. Actual monitor behavior and any authorized platform replacement
remain unresolved; existing synthetic grant tests only exercise LOCK's branch.

The active CCTRAP/INTH code now uses live I/O flags and the already extracted
FileBlock INTADR/INTFLG/TRPADR/SAVR words. Argument address resolution is required,
including zero-argument FORTRAN calls. CCTRAP clears CCFLG but not CCFLG.; a
callback's new TRPADR persists after return. INTH pushes INTADR before checking
CCFLG.; a negative flag skips the remaining work after clearing INTADR.

Executable INTH neither classifies INTTYP nor decrements CCFLG, injects a Ctrl-C
character, examines the interrupted instruction, or re-enables the monitor.
It sets both flags to -1, increments the full saved return word if INWAIT is
nonzero, and increments INTFLG only when TRPADR is nonzero. Only a zero result
admits the callback. Thus -1 is the normal entry value, despite the data comment.
The implementation preserves those statements rather than the older prose.

Save/restore uses actual SAVR and caller-mapped AC addresses. Octal AC0..16 is
fifteen words, excluding P (octal 17). PUSH, AOS 0(P), POPJ, BLT and PUSHJ remain
required machine services; no JS finally block restores state after a transfer.
Twenty tests include nested interrupts, suspended ICHR and LOCK cancellation.
They use explicit stack/BLT/PC fixtures and do not prove monitor delivery or
instruction-by-instruction interleaving.

## D-053 — Preserve APR capture, replacement stacks and indirect fallback

APRSET resolves the caller's address into AC0/FTLERR. APRTRP now sets ADDRCK,
saves AC0 plus the source BLT range into STABUF, captures the faulting address
and instruction, and packs LOCKED into the header. This range includes all
sixteen ACs (octal 0..17), unlike INTH. Register and other memory accesses stay
live, including the case where the fault address names an AC being overwritten.

The handler replaces P/S with required assembled IOWD values before GRIPE,
then replaces only P and rereads FTLERR after GRIPE. A nonzero full word selects
JRST through its right half. No register restoration, dump reconstruction or
cached fatal target is added. Nonreturning services retain prior source writes.

When FTLERR is zero, the source installs the [[5]] literal's address in AC16,
copies the current AC0 into AC1, and executes OUTSTR @0(1) before MONIT. There
is no intervening IRAN call. The port requires the literal address, full CPU
indirection and monitor transfer instead of choosing from the adjacent FMSGS
table. The output has no local HUNGUP guard.

Twelve tests cover the capture, stack and failure paths and a transfer into
existing DECWAR fatal output. That composition supplies a logging fixture;
actual GRIP.A/GRIPE diagnostic execution is still required, as are CPU BLT,
stack faults, monitor APR delivery and complete runtime wiring. Ordinary host
exceptions are not converted into APR traps.

## D-054 — Compose APR logging through live GRIP.A/OCT.O state

The earlier diagnostic formatter produces strings from supplied data readers.
A new raw GRIP.A path now uses caller-mapped ACs and source addresses so output
calls can suspend without losing current counters, fields or register effects.
Its four text literals require relocated addresses; OSTR/OCHR/CRLF/OSPC are
explicit operations. Existing string formatting remains a component adapter,
not the runtime implementation of those calls.

OCT.O now follows SAVE/RESTORE: it pushes -1 before reading X1, pushes each
right half while logically shifting T1, decrements live X2 with SOJG semantics,
and pops characters until a negative sentinel. Zero or negative initial width
still pushes one digit. Output failures and transfers retain partial output,
unconsumed stack words and register mutations; no finally cleanup is added.

GRIP.A rereads LINBUF after a caret and at termination, reads each instruction
field after preceding output, retains the sixteen-register dump, and rereads
saved P on every PDL iteration. MOVEI's next PDL address wraps to eighteen bits.
The earlier formatter omitted that mask; it is corrected. HITQL output retains
403 words: the header, 400 links and the first two following payload words.
The twenty lock words remain live through output calls.

GRIPE's diagnostic service now permits a generator in addition to a synchronous
formatter. This TypeScript composition change is required to finish the source
call before file opening/cleanup. Sixteen tests include APR → raw GRIP.A/OCT.O →
packed GRIPE output → close → target transfer, using one source address space.
That fixture supplies stack, header, literal and file operations. Actual CPU
SAVE/RESTORE/PUSHJ behavior, OSTR pointer execution, OGCH/DBUF memory binding,
monitor file operations and complete session execution remain unfinished.

## D-055 — Keep OGCH growth and runtime descriptors in source memory

GRIPE buffer initialization now stores full .JBFF in DBUF+.BFADR, replaces only
T1's left half with the required POINT 7 value for DBUF+.BFPTR, and clears the
count. It neither allocates nor clears data. Buffer offsets and byte-pointer
encoding remain required monitor/assembler inputs.

OGCH now decrements the actual @OBFCTR word with signed 36-bit SOSL behavior.
A nonnegative result enters existing OCHR.X directly, without an added HUNGUP
guard. Otherwise it takes the last word from DBUF+.BFPTR, computes a wrapped
twenty-word endpoint, and may enter CORE with T3. T1/T2 stay live during that
call. A failed CORE uses the source WARN guards and returns without a byte,
count reset or cursor accounting.

Growth writes .JBFF, clears the next word, invokes overlapping BLT through T1,
sets DBUF's count to 100 and retries through @OBFCTR. A changed indirect output
count is not silently redirected back to DBUF. The byte-pointer word's existing
data stays intact except for actual deposited character bits. CORE, BLT,
indirection and IDPB are required services rather than host buffer allocation.

The descriptor extractor extends its contiguous checked span by 55 words for
GRPFIL/STARED/STAUPD/STFRED/STFUPD. It now handles source XWD/EXP and four
nine-bit protection bytes, extracting GRP/STA channels and SYSPPN=octal 1,,27.
Unknown function/mode bits and routine/buffer addresses still require a resolver.
The complete 135-word span resolves before installation; no missing symbol
becomes zero or a guessed monitor constant.

Fourteen tests include extracted GRPFIL → SETO → OCT.O → suspending OGCH →
OCHR.X with live DBUF and packed bytes. Existing GripeBuffer remains a component
adapter; full GRIPE transfer/cleanup register and descriptor wiring is next.
Monitor file I/O, CPU stack/BLT/IDPB behavior and full runtime execution remain
unfinished, and unit tests do not establish original-executable equivalence.

## D-056 — Preserve GRIPE transfer registers and low-memory descriptors

GRIP.2–8 now operate on live X1/X2/T1/T4/P1, DBUF, LEBLK and TMP words.
The EOF entry discards only a first empty line, adds OCRL for a nonempty final
line, then writes the separator. It reads DBUF's pointer after those output
calls and copies its address into both halves of X2.

Busy OPEN failures use the live LEBLK error code, guarded warnings, HIBER with
decimal 3000 and a required HALT on failure. A returning HALT continues with
the Ctrl-C test; no silent retry or automatic shutdown is invented. Nonbusy
failures still enter CLOSE/SETO/PSHP cleanup.

Old-file length is loaded as a word. Nonnegative values clear LEBLK+3; negative
values sign-extend the left half and add the resulting immediate into full X2.
A carry can change the half used to construct the IN descriptor. The descriptor
and its zero sentinel are stored in actual low-memory TMP. IN/OUT's skip path
enters the warning, unlike OPEN's success skip. Output construction preserves
SUBI/HRL/SUB/MOVSM ordering and halfword borrow instead of forming a host count.

Cleanup rereads DBUF's full address after output, writes FL.FF, awaits CLOSE,
selects TTY with SETO, awaits PSHP and only then clears CCFLG. No finally cleanup
runs after a nonreturning service. TMP remains live across USETO and file calls.

Twenty tests include live OGCH → GRPFIL OPEN → old-file input → TMP output →
CLOSE → TTY SETO. The composition retains existing file words and verifies the
actual deallocation stores, with monitor/stack/byte operations explicitly supplied.
The higher-level GRIPE driver remains a component adapter; its raw interactive
entry and diagnostic selection are not yet joined to all these runtime paths.
No monitor or original-executable equivalence is claimed.

## D-057 — Join raw GRIPE input, selection and ship state

The raw GRIPE driver now calls live DBUF initialization and the GRIP.2–8
transfer entries. WHO, condition words, ADDRCK, CCFLG, F, X2, line pointers and
idle words stay live. RED refusal is a direct, unguarded source message before
buffer setup. The non-RED literal ends with JRST .+1; its actual target is a
required service, returning only when execution resumes at ESHP. The port does
not hide this remaining assembler/transfer dependency behind assumed fallthrough.

Prompt P1 is loaded even when ADDRCK suppresses output. SETO and the status
header precede another ADDRCK test. Negative selects the raw diagnostic service;
positive sets ARG to the required [[1]] address before SHOSTA. Normal input
decrements live X2, calls INLI, handles Ctrl-C before line copying, loads the
required POINT 36 pointer and calls OSTR.X. EOF is tested afterward from live F.

Non-EOF input calls OCRL before rereading WHO/ALIVE and clearing ACTIVE. The
two-line and limit warnings use the source SETO/OSTR/SETO sequence; X2 is tested
again after those calls. Raw ESHP/PSHP preserve signed WHO/ALIVE tests, decimal
1000 erasure, current coordinates and team-code arithmetic. PSHP does not add
a RED check. Actual SDSP remains a required routine connection.

Twenty tests include raw GRIPE → INLI → OGCH → OPEN/transfer/CLOSE/TTY SETO.
This composition exposes bytes absent from a preconstructed-line fixture:
INLI writes CR into the selected gripe output before OSTR.X copies the line.
Ctrl-Z includes CF.FF, so INLI increments BLANK instead of emitting LF. The
verified log contains that CR; it is not normalized away as blank-line noise.

The older game/gripe component remains an isolated driver adapter, not a substitute
for these register/output effects. Full OSTR/OSTR.X pointer execution, status/
diagnostic/statistics runtime composition, literal target resolution, monitor
services and session integration remain unfinished.

## D-058 — Share live text pointers and distinguish OCRL from SKIP

OSTR replaces P1's left half with the required POINT 7 encoding; OSTR.X uses
its existing pointer, including POINT 36 for LINBUF. Both repeatedly perform
required ILDB, test the returned whole C word for zero, and await OCHR before
the next read. P1, C and source data remain live across those operations; no
decoded string snapshot or arbitrary length limit is substituted.

OUT resolves its first effective argument address and returns early only if
that address is zero. A first data word with zero left half causes one additional
read as an address-of-address heuristic; a resulting zero pointer still enters
OSTR. The line count is read only after string output. OUTW/OUT2W retain TMP
store/read ordering, including a second argument aliasing the first store.
OUT2C rereads source data for its second byte.

SKIP, SPACES and TAB retain signed 36-bit counters and register changes during
output. SPACES/TAB load C only once because their backward jumps resume at the
decrement. OCRL and CRLF are labels on the same suppressing code at 2053-2064.
The previous GRIPE service comment called OCRL unconditional; that comment and
the component driver's unconditional newline calls are corrected. SKIP remains
the unconditional CR/LF loop. Suppression is tested only on entry; once admitted,
OCRL completes both output calls without testing cursor state again.

Nineteen tests cover these boundaries and the repeated-blank-line correction.
The live GRIPE/INLI/OGCH/OPEN/CLOSE composition now invokes shared OSTR/OSTR.X/
OCRL for its line and separator rather than local string/pointer loops. Actual
CPU ILDB, argument addressing, full formatter/stack integration, monitor output
and complete runtime execution remain required; simple pointer fixtures do not
establish machine behavior or original-executable parity.

## D-059 — Preserve field counters and live numeric digit stacks

WARMAC.MAC:2145-2170 supplies raw OSTBX/OSTB/OSTB.X. OSTBX's comment says
padding to ten columns, but its pre-decrement padding loop produces nine columns
when a NUL or blank terminates early. Ten emitted characters still consume ten
columns. The port preserves both cases. OSTB.X retains P1's existing encoding;
the other entries install the required POINT 7 left half. X1/X2 are saved and
restored through explicit stack services, with intermediate state left intact
when output or pointer reads fail or suspend.

OSIX (2213-2224) ignores the documented X2 width and loops six times. Its C+1
word must alias the actual register paired with C; LSHC remains a required CPU
operation. Output may change the live pair and counter before the next iteration.

Raw ONUM and sign variants (2280-2330) use required MOVM, AOBJN and IDIVI
operations. The port supplies source control flow and immediate/halfword
transformations without choosing overflow flags or trap behavior. Sign space
can exhaust a positive width before any digit division. Remaining digits and
saved registers stay on the source data stack across output; nonreturning calls
do not trigger synthetic restoration. Digits above nine still use ASCII addition,
not hexadecimal letters. X2 returns the actual width. Internal ODEC./OOCT.
(2234-2252) restore X3 and retain this result; FORTRAN wrappers remain separate.

Thirty-two tests include ONUM → SPACE → OGCH/OCHR.X through suspended CORE,
verifying packed output, cursor accounting and eventual stack/register restoration.
The 1532-test check passes. Production CPU/monitor services, remaining wrappers
and full session execution are unfinished; fixtures are not machine verification.

## D-060 — Keep FORTRAN numeric wrappers distinct from internal entries

ODEC/OSDEC (WARMAC.MAC:2340-2348) select their target in T1 before saving
X1/X2/X3. They read the number, then the width, set decimal radix and call
through live T1. Their restoration discards the actual width returned by ONUM.
The port keeps these wrappers separate from internal ODEC., which returns that
width. Argument reads and the indirect call remain required addressing/runtime
services rather than assuming a host argument array or fixed dispatch target.

OFLT/OSFLT (2362-2381) format integer tenths. OSFLT reads the original number
for sign selection, then reads it again after the saves. IDIVI splits X1/X2;
MOVM copies the remainder magnitude to X4 before the width argument is read.
The integer formatter may suspend. OFLG is checked after it returns, and X4 is
read again after outputting the decimal point. MOVEI masks the resulting digit
code to an eighteen-bit effective address. Short format truncates, OFLT loses
the sign of negative fractions below one, and OSFLT can emit negative zero.
All four saved registers are restored only on the returning source path.

O2DG/O2DB (2180-2204) now have raw register/stack implementations. O2DG divides
by one hundred, masks its remainder through MOVEI, then divides by ten. O2DB
only divides by ten and blanks a zero tens digit. Neither repairs unexpected
negative inputs or discards hundreds for O2DB. The second output reads live X2.

Thirty new tests include actual OFLT/ONUM/SPACE/OGCH/OCHR.X composition across
CORE suspension. All 1562 tests, type checking and archive checks pass. CPU
arithmetic/flags/traps, argument addressing, linked targets, data-stack failure
behavior and complete output/session bindings remain explicit requirements.

## D-061 — Preserve table addressing and deferred format reads

Raw ODISP (WARMAC.MAC:2393-2405) divides the display code into T1/T2, preserving
the source's negative/cloaked-code guards but adding no ship-index validation.
Its table entries contain indexed and sometimes additional indirect addressing.
An explicit CPU service resolves these effective addresses; MOVEI retains only
the resulting right half. The two OFLG predicates remain separate reads. The
space argument is fetched only after OSTR returns.

ODEV (2464-2472) uses inline short-table words but loads pointer words for
medium and long names. The latter preserve the full word until OSTR replaces
its left half. OFLG is tested separately for each branch. Device indices address
actual memory, including neighboring storage; component-level bounds errors
are not inserted into the raw path.

OCOND (2511-2523) reads DOCKED-1(WHO) without a pre-game guard and emits a
prefix only for negative docking state. The condition argument and current
format are read after any prefix output. The long condition pointer is always
read first, even when short output replaces it. Failures at that read cannot
be bypassed through a host table selection.

Twenty-six tests exercise source table text through shared OSTR, aliases,
indirection fixtures and suspension. OCOND/OSTR/OGCH/OCHR.X composition uses
live LOWSEG flags and verifies packed Docked+R output when condition/format
change during CORE. All 1588 tests and the type/archive checks pass. Production
CPU addressing, table relocation/literals, monitor and session bindings remain
required; the earlier component string formatters are not raw runtime adapters.

## D-062 — Compose raw status rows and gripe headers with shared formatters

STAT/STAT.X/STAT.Y (WARMAC.MAC:2598-2708) now operate on live registers and
word memory. The FORTRAN entry reads the player before the count and delegates
MOVN effects. Each field increments signed X4; rows retain source index and
cursor changes between calls. Captain-name words and PPN halves are separate
reads. Project/programmer formatting uses actual OOCT. and its returned width
for the trailing-space loop. STAT.Y reads private identity words and uses a
two-column job field, while STAT.X uses three columns. No index bounds checks
or automatic register restoration are introduced.

OSTS (2536-2584) saves X1/X2/X3/X4 through explicit stack services, reads version
after the opening output, and calls UNDAT/UNTIM with the same TMP address.
XFRTMP (2586-2591) uses an X1 byte pointer independently of P1. Returning monitor
calls can leave stale bytes visible; the port neither clears TMP nor supplies
host clock strings. The MOVNI X4,-100 immediate remains -262080. WHO is read
once for X3 and again for entry selection. Game and option fields are fetched
at their source boundaries, with option P1 loaded even when output is skipped.

The raw header composes STAT with OSTR/OSIX/ODEC./OOCT./SPACES/OCRL. A new
GRIPE test replaces the HEADER fixture with actual OSTS/STAT.Y, using FileBlock
TMP and shared registers through CORE suspension, INLI, old-file transfer and
TTY restoration. CPU operations, linked identity/literal addresses, monitor date/
time and data-stack behavior remain fixtures/services, not production emulation.
Twenty-four new tests bring the passing check to 1612. Complete runtime/session
integration and original-executable comparison remain unfinished.

## D-063 — Use live accumulator and COMMON bindings for output

OTIM/O2D (WARMAC.MAC:2110-2130) now preserve the source register path. OTIM
loads X1, divides through X1/X2, X2/X3 and X3/X4, then outputs hours, minutes
and seconds via T1/T2. MOVEI masks each component before O2D. Later component
registers are read after preceding output calls; no saves, decimal-field padding,
clamping or rounding are added. The first IDIV literal addressing and all CPU
division effects remain required services.

A shared accumulator view maps WARMAC's declared registers (551-569) directly
to AC memory. F/T0 alias AC0, C+1 aliases P1, and the unnamed AC14 is left alone.
Constructing the view does not read, clear or fabricate memory. OGCH/GRIPE and
its input/header/file-transfer tests now use this view rather than separate
register objects and one-off alias definitions.

The output-memory binding derives player-field addresses from generated HISEG
JOB dimensions, pre-game identity addresses from the LOCAL view, TMP from
FileBlock, and flags/version/game/options from LOWSEG/HISEG. Views must share
one address space. Table/literal addresses and POINT encoding are explicit
inputs. OSTS/STAT compositions use the resulting actual accumulator, private and
shared words, with CPU/stack/clock operations still supplied as fixtures.

Seventeen new tests bring the passing check to 1629. A new test's BLANK
expectation was corrected after inspecting source accounting: CR on a nonblank
line sets -1, then LF increments to zero. Production accounting was unchanged.
Full output dispatch, calling conventions, CPU/monitor services and complete
session execution remain unfinished.

## D-064 — Expose data/return stacks in raw character output

SAVE/RESTOR (WARMAC.MAC:82-103) now have a shared data-stack adapter. SAVE
invokes required PUSH S; RESTOR compares the full S word to the required IOWD
initial value before POP. Equality enters the underflow literal: HUNGUP gates
OUTSTR, then HALT .+1 and its resolved continuation transfer are required. A
warning-side S change does not silently resume the skipped POP. The adapter
adds no host exception recovery, stack clearing or guessed continuation.

Raw OCHR accounting (1599-1627) increments HCPOS before testing C, saves C
through the data stack only for control characters, then reads live C/state and
restores C through RESTOR. This differs from the synchronous component helper's
local saved value; both interfaces are explicit. Raw OCHR.B also uses actual
PUSH/POP P,0 services after OUTPUT rather than a local AC0 variable. Failures
leave the stack and registers at their source boundary.

OCHR's JRST @OC is represented by required effective-address resolution and
transfer on every call. No default output target is guessed. Raw OGCH shares
its growth body with the existing component path but enters the SAVE-aware
OCHR.X tail. Existing GRIPE/header/input/file-transfer tests now use that path;
header and numeric/SIXBIT saves share S storage with control-character saves.

Seventeen new tests bring the passing check to 1646. These include actual
memory-backed S/P fixtures, numeric output and current-target dispatch. CPU
instruction flags/overflow, full literal decoding, HALT continuation, target
execution and complete session integration remain required runtime work.

## D-065 — Bind live source arguments and common return boundaries

ARGBLK (WARMAC.MAC:201-208) emits a static negative-count header followed by
resolved EXP words and executes MOVEI ARG,literal+1. Loading those words and
selecting the block are separate operations. The loader takes already-resolved
words and does not allocate a host call frame or infer compiler literal encoding.

The shared argument accessor resolves @n(ARG) using current ARG on every read.
It delegates indexed/indirect effective-address behavior, then reads the actual
word. It does not use the preceding count to invent missing defaults, reject
indices or skip address zero. The called routine retains its own zero-address
behavior, including OUT's early return before reading data or line count.

Ten public text-entry bodies now share these reads and existing raw formatting.
They preserve argument order and TMP aliases. Composed ODEC/OSFLT tests use the
same accessor, including OSFLT's second number read after SAVE. These are body
bindings; actual PUSHJ/POPJ and compiler calling conventions remain external.

CPOPJ1/CPOPJ (932-933) expose the source AOS return-word operation followed by
POPJ P. AOS and transfer effects remain CPU services. The AOS address uses P at
that instruction, while POPJ must use current P after the operation returns.
Tests retain full-word carry and do not fabricate a return after an AOS failure.

Twenty-one new tests bring the passing check to 1667. Broader dispatch, compiled
arguments/literals, effective-address/return execution and full session behavior
remain unfinished; no header-based argument validation is silently added.

## D-066 — Connect output bodies through one runtime context

The shared output-runtime registry binds WARMAC's output bodies (1522-1627,
1986-2708,4983-5001) to one register view, source argument accessor, data stack,
state and memory context. It connects existing public and internal formatters,
status/header entries, SETO and raw OCHR/OGCH without copying argument values,
registers or cursor state into per-call snapshots.

Every formatter's character service enters current OC dispatch. Numeric wrappers
retain callAddress for their live T1 targets, and character dispatch retains
jumpAddress for resolved @OC targets. Both are external machine/transfer services;
unknown targets never fall back to a chosen formatter or sink. CPU/monitor methods
are forwarded at call time, including when execution resumes after suspension.

The registry runs routine bodies. It is not an instruction emulator, call-frame
allocator or replacement for source PUSHJ/POPJ and program-counter handling.
Literal/entry relocation, effective-address resolution, arithmetic flags/traps,
byte operations, stack instructions and monitor calls remain required services.
This boundary avoids choosing missing platform semantics merely to obtain a
runnable server.

Sixteen new tests connect memory arguments and raw output through public decimal/
fixed-point entries, dynamic target changes, status/header formatting, SETO/OGCH
CORE suspension, buffer flushing and control accounting. All 1683 tests and
archive/type checks pass. Broader command adoption and complete runtime/session
execution remain unfinished.

## D-067 — Preserve clock argument writes and resumable TIME statements

DAYTIM/RUNTIM/ETIM (WARMAC.MAC:3959-3996) now have raw bodies. DAYTIM calls
MSTIME into AC0 and writes AC0 through the current argument. RUNTIM first clears
AC0, invokes its monitor call, then performs the same argument write. ETIM calls
MSTIME before reading its start value, subtracts through a required CPU service,
and applies the two strict threshold tests in sequence. It does not normalize
arbitrary offsets with modulo or overwrite the start argument.

The resumable TIME path (TIME.FOR:30-46) uses actual COMMON addresses and awaits
each heading before the following clock evaluation. WHO is checked after the
game-time output, and the ship address is computed after its heading. Later
WHO changes do not introduce a new pre-game guard. The RUNTIM(D)-JOB expression
uses an explicit evaluation/arithmetic service, because the supplied source does
not determine compiler operand order and RUNTIM writes D and can suspend.

A command-dispatch composition invokes TIME with raw clock and shared-output
bodies, actual argument words and an explicit compiled-call/temporary fixture.
Clock results are not cached across the two RUNTIM calls. Both evaluation orders
are tested as fixtures, not silently selected as production compiler behavior.
AC0-aliasing ETIM input also demonstrates why pre-reading the start value would
change results.

Eighteen new tests bring the passing check to 1701. Monitor/CPU instruction
semantics, compiler D/temporary storage and complete call/session execution
remain required work. Existing synchronous TIME remains a component path;
full integration across every caller is not claimed.

## D-068 — Preserve USERS/PRLOC reads and raw PDIST masking

USERS.FOR:35-55 now has a resumable statement path over COMMON and required
compiler-local I/NUM words. The initial CRLF precedes format selection; PASFLG
is read after the header and again after each STAT call. The divider precedes
ALIVE at slot six. NUM is always set to six, preserving the disabled short/medium
branches. STAT receives NUM by reference and I+0 as an expression value. PRLOC
coordinates are selected only after the three-space call.

PRLOC.FOR:34-52 now retains addresses for all six arguments and TW. Absolute
coordinates, relative subtraction operands, WHO and final newline flags remain
live at their source statements. Its PDIST/width compound predicate and compiler
subtraction are required policies rather than assumed host evaluation. WHO zero
has no added guard. Width/TW aliases preserve the source store/read order.

Raw PDIST (WARMAC.MAC:4443-4451) performs its ordered argument reads and required
SUB/MOVM operations, then compares vertical magnitude against the right half of
horizontal magnitude using CAIGE. MOVEI likewise uses that half. This differs
from an unrestricted host maximum for arbitrary words. A horizontal difference
of 262144 can contribute zero, including PRLOC's free-relative suppression.
Ordinary board-coordinate tests are insufficient to verify this boundary.

Twenty-two new tests include command dispatch through USERS/STAT/PRLOC and the
shared output registry, plus direct PDIST/alias/suspension cases. All 1723 tests,
TypeScript and archive checks pass. Local addresses, compiled call temporaries,
LOGICAL/.AND./arithmetic and exceptional DO behavior remain explicit compiler
contracts; full command/session integration remains unfinished.

## D-069 — Preserve DAMAGE's live reporting path and raw EQUAL state

DAMAGE.FOR:31-78 now has a resumable statement driver over actual COMMON words
and explicit compiler-local I/J and STOKEN argument addresses. Its initial CRLF
precedes the damaged-device scan. No positive damage returns ALLDOK before token
selection; otherwise alpha switches compare against every DEVICE word and may
print multiple or undamaged devices. Unknown alpha switches remain silent, and
the first non-alpha outer token ends the report.

The selected row calls ODEV before reading OFLG for its spacing branch. WHO and
the SHPDAM address are then selected after spacing; the LONG-only units flag is
read after OFLT. General reports retain the initial arithmetic-IF destination:
positive formats fall through to both column headers even if OFLG changes while
printing the ship name. Later LONG equality tests remain separate from positive
format selection. No entry-wide snapshot replaces these reads.

Raw EQUAL/EQUAL. (WARMAC.MAC:4363-4402) now use live arguments, registers and
required ILDB/data-stack services. The public wrapper saves P1/P2 before argument
resolution, while the internal body saves P1/P2/C again. It tests the first token
byte through T1, then reads that byte again through P1. The erroneous substring
conversion still targets T0, followed by the actual master-byte read/conversion.
Five equal characters return exact match without a sixth-byte comparison. This
extends the existing component comparison with observable memory/stack effects.

Command slot 4 composes these bodies with the shared output registry. Tests also
exercise STOKEN=3, the value supplied by REPAIR, without claiming that every
existing REPAIR caller has adopted the new driver. Compiler literal encoding,
local/temporary addresses, LOGICAL and reversed-DO entry behavior are explicit
fixtures/policies. DISP remains a required service; this composition uses the
existing bounded-coordinate packed-board component, not a new CPU implementation.

Thirty-six new tests bring the passing archive/type/test check to 1759. Raw
instruction/call-frame execution, exceptional DO control-variable mutation and
complete command/session/Telnet wiring remain unfinished.

## D-070 — Preserve STATUS token writes, width and repeated radio predicates

STATUS.FOR:34-162 now has a resumable statement driver over COMMON and explicit
STOKEN/I/OBIT addresses. The first CRLF precedes setting OBIT to four or zero.
OBIT is then passed by reference throughout the report; changing OFLG does not
recompute it. Headings finish before the following ship-field addresses or
shield product operands are selected.

A full report emits its stardate before rewriting tokens. It writes the trailing
KEOL type, all seven compiled 1H text words, then the seven alpha types in a
separate loop. STOKEN is read at these statements rather than snapshotted before
output. Actual out-of-range references retain physical aliases; a TKNLST write
past its fifteenth element reaches VALLST. NTOK and ordinary in-range numeric
token values are not independently rewritten.

The item loop repeats EQUAL calls in source order and rereads the token for each
comparison. Its non-alpha/SHORT predicate can call CRLF, after which the source
tests token type again. Formats less than zero select short labels and item
spacing, but OBIT, shield percent/energy and termination tests compare against
the exact SHORT constant. These cannot share a single cached Boolean.

Radio output preserves all three BITS(WHO).AND.NOMSG expressions at lines
154-156. Outputting Of, f and On creates separate read boundaries. If NOMSG
clears after Of, the source can print OfOn; changes after f can produce OffOn.
No Boolean radio-state snapshot or synthesized bit replaces these statements.

The command-slot composition uses actual token memory, raw EQUAL, resumable
PRLOC/raw PDIST and shared OCOND/ODEC/OFLT/OSFLT output. Compiled string/1H words,
local/temporary storage, integer multiplication/AND, LOGICAL, compound-expression
evaluation and DO entry remain explicit bindings or fixtures. Arithmetic tests
exercise both operand orders and 36-bit product wrapping without selecting a
production compiler policy. This is routine-body composition, not CPU call-frame
or complete DOCK/session integration.

Thirty-one new tests bring the passing archive/type/test check to 1790. Exact
standard report transcripts and suspended-output cases are source-derived tests;
original-executable differential verification remains outstanding.

## D-071 — Compose DOCK supply, STATUS and timing through live memory

DOCK.FOR:34-81 now has a resumable driver with explicit V/IFRACT/I/J storage.
It sets the deadline before scanning all ten base slots, skips nonpositive base
strengths, and adds two for every adjacent friendly base. The NUMCAP gate precedes
the planet loop; its NPLNET bound is evaluated at entry. Every friendly adjacent
planet adds one. Current TEAM, WHO, slot contents and coordinates are read at
their source statements rather than captured as an entry-wide world snapshot.

No supply emits CRLF, current DISP/ODISP and DOCK01, then takes the alternate
return without writing PTIME. A supplied dead ship returns silently after the
scans. Successful docking retains each resource expression and the second hull
repair when the current DOCKED word is true. It stores the supplied compiler
LOGICAL true word, life support five and GREEN before DOCKIN output.

The STATUS switch is compared after DOCKIN returns. STATUS(3) composes the new
report driver and shared output, then the final ETIM runs and PTIME is stored.
A negative remaining pause still returns normally; DOCK does not borrow REPAIR's
PTIME<=0 alternate-return test. The dispatch composition consequently continues
to automatic repair and turn accounting after normal return only.

The source's integer expression trees are retained with required arithmetic,
operand-evaluation and assignment policies. This includes the written order of
100*IFRACT and both ETIM expressions. Tests use explicit left/right operand and
destination-first/RHS-first fixtures when a suspended operation changes state;
no production compiler policy is inferred from these outcomes.

Raw LDIS (WARMAC.MAC:4410-4421) retains full-word signed magnitudes, ordered
argument reads and early vertical failure. Its range is read after each axis;
an argument aliasing T1 sees that current magnitude. Unlike raw PDIST's immediate
comparison, horizontal distance is not reduced to eighteen bits. SUB/MOVM and
CPU failure effects remain required services.

Twenty-eight new tests bring the passing archive/type/test check to 1818. DISP/
DISPC use the existing bounded packed-board component in this composition;
automatic repair and turn accounting also use their existing component bodies.
Raw board execution, compiler/CPU call frames, fully resumable world processing
and the complete Telnet session remain unfinished.

## D-072 — Compose resumable REPAIR, DAMAGE and automatic repair

REPAIR.FOR:37-70 now has a statement driver with IL by reference and explicit
V/L/REPSIZ/NTOKEN/MAXD/I storage. V is cleared before IL is read. The docked/mode
compound predicate requires compiler LOGICAL evaluation policy. The three size
assignments remain independent tests: a mode outside one through three can
retain a prior REPSIZ word rather than receiving an invented default.

Numeric sizes multiply VALLST(2) by ten only outside automatic mode. The maximum
scan precedes the zero-damage branch, clamping and ALL comparison. ALL has no
token-type guard and remains active in automatic mode. When no positive damage
exists, the source skips ALL, the initial ETIM and every device update; a manual
invocation may still request DAMAGE and perform the final clock calculation.

The written integer expression trees retain multiplication before division and
MAX0 on every device assignment. Negative sizes are not rejected: they can
increase damage even on previously undamaged devices. Arithmetic, division
failure, operand order and assignment destination selection remain explicit
compiler policies, exercised with 36-bit wrapping/truncating test fixtures.

After repairs, mode three returns without touching PTIME or requesting a report.
Manual mode compares the current TKNLST(NTOKEN) against the compiled DAMAGE
literal, then evaluates NTOKEN+1 as a compiler expression argument. DAMAGE's
resumable output finishes before the final ETIM and PTIME store. Nonpositive
PTIME takes REPAIR's alternate return, unlike DOCK's normal return in that case.

The new command-slot composition runs raw EQUAL/ETIM and shared DAMAGE output,
then invokes the same REPAIR driver in automatic mode before existing turn
accounting. The earlier DOCK/STATUS composition now also uses this automatic
path. The shared DAMAGE output fixture was extracted for reuse without changing
its production body or byte expectations.

Twenty-seven new tests bring the passing archive/type/test check to 1845.
Compiler storage/encoding/policies, CPU/call frames, all remaining callers,
fully resumable world processing and Telnet session execution remain unfinished.

## D-073 — Preserve end-of-turn calls, live warning output and score commits

DECWAR.FOR:254-289 now has a resumable statement driver over actual COMMON and
explicit compiler-local I/D1/D2 words. Entry 3400 calls REPAIR(3); both normal and
alternate repair returns resume at 3500. Entry 3500 skips repair. DOTIME is then
incremented, compared with current NUMPLY and reset before the defense sequence.

All six column-D TIMIN/TIMOUT positions are represented by a required compiler/
profiling policy around BASPHA, PLNATK and BASBLD. No implicit no-op decides
whether debug lines were compiled. ROMOPT is tested after the final profiling
call, and ROMDRV receives actual D1/D2 addresses. PRTYPE and ROMOPT are integer
words used by source logical IF statements, so their interpretation requires the
compiler policy rather than JavaScript nonzero coercion.

Stardate and team-turn assignments follow the world calls and select current
WHO/TEAM. Critical life support reads state after automatic repair and defenses;
docked ships skip the decrement but still undergo the negative-reserve death
test. The warning's heading completes before selecting the reserve address for
ODEC, and its suffix completes before initializing the score loop.

Each of the eight categories adds TPOINT to player score, rereads it for team
score, then clears it. Compiler arithmetic and assignment ordering remain
required policies. A failure in team-score assignment retains the earlier player
commit and the still-uncleared TPOINT; no transaction or rollback is invented.
The driver leaves PTIME and PLAYER untouched and returns to the caller's label
49 path rather than resetting command-loop state itself.

Twenty-one new tests bring the passing archive/type/test check to 1866. Both
existing REPAIR and DOCK command compositions now use the resumable turn driver.
Their automatic repair and warning/score paths share source memory and raw
output; defense, ROMDRV and profiling execution remain required call boundaries
in this runtime. Full compiler/CPU/call frames and complete world/session
composition remain unfinished.

## D-074 — Preserve BASBLD's initial division and live base writes

BASBLD.FOR:33-43 now has a resumable driver with explicit IB/IE/N/J/I compiler
storage and actual COMMON base words. IB and IE are set before computing
50/(NUMPLY+1). The calculation is not skipped for player-triggered calls that
later replace N. An initial division fault retains prior N and the preceding
bound stores; a later NUMSID division fault retains the first quotient and the
already-selected opponent bounds.

PLAYER is read after the first calculation. The player path sets IB to two only
for TEAM=1, copies IB to IE, and reads current NUMSID(TEAM) for 25/NUMSID. The
nonplayer path retains both teams. Compiler LOGICAL/evaluation/assignment and
integer-division behavior remain required policies, not host-language defaults.

The selected IE is a DO bound. Each team scans all ten base slots regardless of
NBASE. Positive strength is tested before each update expression; that expression
rereads strength and N. MIN0 caps at 1000 but supplies no lower clamp or minimum
increment. Negative rates may make a live base negative, and a later failure
retains prior base updates. The routine contains no random-number call.

The new turn composition now executes this BASBLD body between its profiling
boundaries and before ROMOPT/score processing. Eighteen new tests bring the
passing archive/type/test check to 1884. Complete BASPHA/PLNATK/ROMDRV execution
in the shared runtime, compiler/CPU/call frames and session integration remain
unfinished. The next raw-board dependency includes DISP's destructive ARG use,
which is visible in the supplied assembly and absent from the bounded component.

## D-075 — Preserve raw board pointers, destructive ARG and debug ordering

WARMAC.MAC:5333-5404 now has resumable DISP/DISPC/DISPX/SETDSP bodies. They use
actual B12TBL words (942-945), current argument descriptors and memory-backed
registers. DISP loads V into ARG and multiplies it by KSID; the compiler fixture
must select a fresh argument block for later calls. SETDSP uses T2 for V instead.
The ADDI operand is an 18-bit effective address, while the subsequent ADD reads
the current table word. No host board-range guard replaces that address behavior.

The all-ones cell becomes -1 before CHKD. DISPC divides the current returned T0
by 100; DISPX then uses MOVEI with the remainder, yielding 262143 for the -1
sentinel under the explicit ordinary division fixture. SETDSP saves OLDOBJ before
reading the third argument, deposits its low twelve bits, then exposes the
current T1 right half to CHKD. Aliases and prior writes remain observable.

The selected DEBUG.=-1 and DBZER.=0 (617-620) require CHKC/CHKD calls and the
OLDOBJ store. Those diagnostic bodies and CPU arithmetic/byte operations are
required services. The test fixture explicitly implements ordinary integer and
local direct POINT operations and PASFLG=0 debug fast returns; it rejects
privileged diagnostics. No implicit CPU flag, trap, stack-frame or monitor
policy is supplied. Both final SETDSP SKIPN paths return with DBZER.=0.

DAMAGE and DOCK now compose these raw board reads with their existing runtime
instead of bounded cell-read adapters; PackedBoard remains fixture initialization
and an earlier component abstraction. Twenty-three new tests, including all
5625 cells for each public read and memory/register/suspension edge cases, bring
`npm run check` to 1907 passing tests. Internal board helpers, privileged debug
execution, broader adoption and complete compiler/CPU/session/Telnet execution
remain unfinished. This establishes source-derived routine behavior only.

## D-076 — Execute board diagnostics and internal byte-pointer routines

WARMAC.MAC:5483-5547 now has CHKC/CHKD bodies using actual PASFLG, argument,
RNGTBL and register words. They share SAVE/RESTOR storage and internal output
with the existing runtime. PASFLG=0 returns before touching arguments or the
stack. Privileged calls follow the selected source's checks and diagnostic
output rather than throwing a host validation error. A bad coordinate is
reported and returns to the caller; an illegal SETDSP value has already been
deposited before CHKD reports it.

CHKC reuses ODEC.'s returned X2 field width for the horizontal coordinate.
For example, 0 and 76 print as `0 *`, while 76 and 1 print as `76  1`. The
second argument is read again after the heading, first number and space.
CHKD validates the right half of T0 against inclusive ranges in actual memory,
but prints the full current T0 on failure. Its T0 save occurs after division
and failed validation; no entry snapshot replaces that ordering.

TRAC (5568-5583) walks actual return, calling-instruction and preceding SIXBIT
name words. It excludes its own call, emits six characters per name plus a
space, and reads HUNGUP after OCRL before the required monitor flush. It shares
the data stack and restores X1/X2/X3. Tests supply explicit synthetic return
frames; no production PUSHJ/POPJ or compiler instruction emission is inferred.
An empty trace after the diagnostic line emits the source's additional CR/LF.

GDSP/SDSP/GPTR (5439-5471) now use actual preceding-byte pointers and required
ILDB/IDPB/arithmetic operations. GPTR masks H-1 through MOVEI before division,
which differs from public DISP. GDSP retains raw 4095; SDSP saves the requested
value on S across pointer calculation and restores it before deposit. Neither
internal path invokes the public debug checks. ESHP/PSHP compositions now
verify actual erase/restore writes, including dead-ship restoration suppression.

Fifty-eight new tests bring the archive/type/test check to 1965 passing tests.
Literal/table relocation, CPU byte/arithmetic policies and monitor services in
the tests are explicit fixtures. Actual return frames, full compiler/CPU and
session integration, broader caller adoption and the Telnet host remain work.
No archive bytes were changed and no outside implementation source was used.

## D-077 — Compose BASPHA through actual shared words and required calls

BASPHA.FOR:33-87 now has a resumable statement body using actual JB/JE/I/J/K/ID
compiler-local words and HISEG/LOWSEG fields. Its expression trees retain source
parentheses, including target/display codes and DO endpoints. Compiler integer
operations, assignment address/evaluation order, loop bounds/entry and call
expression/temporary handling remain required services. PHADAM receives the
actual K and ID words and unevaluated 3-I and 200/NUMPLY expressions for the
compiler binding. No minimum power, positive-population guard or early division
is added.

The driver selects opposing teams for players and both teams otherwise. Within
each selected team it tests NBASE, all ten base slots, and the opposing five
player slots. ALIVE, raw visibility and raw LDIS are separate ordered gates.
It reads positions afterward, sets metadata, computes PDIST and calls PHADAM
before team damage score, current base strength, kill score and recipients.
Current job TEAM is the first PRIDIS flag, not the firing base's I. A second
nearby search is followed by OR with the current BITS(K), including dead victims.
The current base strength is not retested between target attacks.

Romulan attack follows all eligible ships for that base. PHAROM returns before
current base/energy metadata and the single PRIDIS call. Team KPRKIL damage
credit follows that call, and ROM is reread for the kill bonus. Earlier writes
survive division or subsequent operation failure.

The new fixture composes raw DISP/LDIS/PDIST with actual PHADAM/PWR, PHAROM,
PRIDIS and HitQueue components over shared game words. Damage uses the explicitly
selected rational REAL test policy; synchronous component hooks drain raw
board/distance bodies only when the chosen CPU fixture completes without a
suspension. This does not silently provide production PDP-10 arithmetic or
monitor behavior. The turn fixture now runs BASPHA before its planet-call
boundary and actual BASBLD.

Thirty-two new tests bring the archive/type/test check to 1997 passing tests.
Resumable PLNATK/PRIDIS, fully bound combat/Romulan/hit runtime, actual compiler
and CPU/call frames, complete sessions and the Telnet host remain unfinished.
Only supplied source was used, and the archive remains unchanged.

## D-078 — Preserve PRIDIS argument aliases and resumable recipient searches

PRIDIS.FOR:35-46 now has a resumable statement driver over actual IV/IH/ILIM/
IFLAG/ZERO argument addresses, LI/LJ/I compiler storage, and shared DBITS/BITS/
ALIVE/SHPCON fields. Initial LI/LJ stores precede both separate IFLAG reads;
DBITS is cleared only when ZERO equals zero, before DO bounds are evaluated.
Consequently aliased arguments see those stores rather than entry snapshots.

ALIVE is a numeric `> 0` exclusion, not a compiler LOGICAL test. Both zero and
negative words reach LDIS. No board visibility, ACTIVE or player-count predicate
is introduced. The original coordinate and limit addresses are forwarded to
raw LDIS for every eligible target, retaining per-axis and later-target reads.
If IV aliases DBITS, earlier accumulated bits can change the next origin.

After LDIS returns, compiler LOGICAL interpretation determines whether the OR
assignment executes. Its DBITS and BITS(I) operands are read through required
compiler evaluation/assignment services. Full 36-bit BITS values remain valid
inputs. The loop captures its upper bound but reads future ALIVE/coordinate
words and current I for each operation; earlier bits survive a later failure.

BASPHA now uses this PRIDIS body with raw LDIS rather than draining a synchronous
recipient component. Tests pause inside the recipient path after damage/scoring
and verify that later state changes affect selection before hit delivery. Only
the preexisting PHADAM/PHAROM component board hooks retain the fixture's explicit
synchronous requirement. Compiler call/local policies and CPU arithmetic remain
supplied fixtures, not production defaults.

Twenty-nine new tests bring `npm run check` to 2026 passing tests with strict
TypeScript and archive/generated-data verification. Resumable PLNATK and broader
caller adoption, fully bound damage/hit runtime, actual CPU/compiler/monitor
behavior, complete sessions and Telnet remain unfinished. The archive is unchanged.

## D-079 — Preserve PLNATK's compound random evaluation and attack ordering

PLNATK.FOR:34-93 now has a resumable statement body over actual K/PCODE/PTEAM/
J/JTYPE/PHIT/ID and COMMON words. It returns before local changes for NPLNET<=0;
otherwise its compiler loop bound is captured while future planet rows are read
live. PCODE/PTEAM are stored once per planet, distinct from later raw DISP codes
and current build counts used in hit metadata and power.

The neutral test contains IRAN(2) within .AND. Its evaluation order and whether
a false first operand suppresses the call are required compiler services, as
are the other compound conditions. Tests explicitly select short-circuit,
eager and right-first policies. No JavaScript policy is made the production
default. PLAYER/friendly filtering follows the neutral condition.

Ship PHIT is (50 + 30*builds)/NUMPLY, stored before PDIST. PHADAM receives fixed
kind 2, actual mutable J/ID/PHIT words and the source false literal through the
compiler fixture. Division failure retains prior PHIT/ID after hit metadata is
stored. Damage precedes owner scoring and both PRIDIS calls. There is no forced
victim bit afterward, and no added initialization of SHCNFR or KLFLG.

Romulan recipients are selected before PDIST and PHAROM. Its power expression
is not divided by NUMPLY and reads current builds after those calls. SHSTFR
therefore can describe the earlier count while PHAROM receives a later power.
Current EROM, PCODE/PTEAM and ROM are used after damage for metadata, damage
credit and kill bonus. Neutral planets do not gain team scores.

The shared turn fixture now executes actual BASPHA, PLNATK and BASBLD statement
bodies in order, with raw board/distances, resumable PRIDIS and existing damage/
hit components. Thirty-six tests include actual ship/Romulan death, original
planet-hit output bytes and suspension/alias behavior. `npm run check` passes
2062 tests plus TypeScript and immutable archive/generated-data verification.
Scheduled RNG results, rational REAL and compiler/CPU/local/call choices remain
explicit fixtures. Full numeric, damage/queue/Romulan runtime, machine/monitor,
session and Telnet behavior are not claimed complete.

## D-080 — Preserve Romulan damage expressions and resumable death clearing

ROMDRV.FOR:212-233 now has resumable PHAROM/TOROM/DEADRO bodies using actual
PHIT/ID addresses and shared IWHAT/IHITA/EROM/ROM/KLFLG/LOCR words. These entries
bypass the main driver's guards and locals. DEADRO and TOROM never read their
PHIT/ID arguments, including when those addresses are unmapped. DEADRO retains
IWHAT, IHITA and EROM and proceeds directly to the death stores.

PHAROM retains ((100+IRAN(100))*PHIT)/(10*ID), then a separate IHITA/10 energy
subtraction. Compiler arithmetic, operand order and assignment behavior remain
required policies. Aliased PHIT can observe the preceding IWHAT write or the
old IHITA value. Tests suspend inside IRAN and the later energy division to
verify different explicitly supplied compiler operand orders. No guard rejects
zero/negative power, signed distance or already-false ROM. An ID-zero failure
retains prior IHITA/EROM after IWHAT and the fixture's scheduled random draw.

TOROM preserves MIN0(IRAN(4000),2000), with no added lower clamp. Both damage
paths read current EROM after assignment to decide death. A surviving call does
not clear stale KLFLG. The common death path stores KLFLG=2 and the compiler's
false word in ROM before calling SETDSP with actual LOCR argument addresses.
Current coordinates are therefore read inside the raw board routine, including
after suspension; earlier flags and energy remain if deposit fails.

BASPHA and PLNATK now invoke this PHAROM body and await raw SETDSP rather than
using the synchronous Romulan component. Tests pause at DPB and preserve base
recipients after damage versus planet recipients before damage. Only PHADAM's
older component retains the fixture's synchronous board hook.

Thirty-two new tests bring archive/type/test verification to 2094 passing tests.
Scheduled IRAN results, ordinary CPU arithmetic and compiler/local/literal choices
remain explicit fixtures. Raw RNG integration, fully resumable remaining combat,
actual CPU/compiler/monitor/call frames, full sessions and Telnet are unfinished.
No external implementation information was used and the archive is unchanged.

## D-081 — Preserve raw random-entry seed, argument and accumulator effects

WARMAC.MAC:2716-2753 now has resumable SETRAN, IRAN, RAN. and public RAN bodies.
SEED is the actual private word at source line 712, already covered by the
extracted private runtime layout. Construction does not initialize it. SETRAN
loads its argument into T1 and invokes MSTIME only for zero, storing current T1
after the monitor operation returns.

RAN. reads SEED into T1, replaces only an empty right half with 260543, multiplies
by 260543, clears the sign bit, stores SEED, then divides into T0/T1 by 257.
Required CPU operations retain suspension/trap/register effects. The seed store
precedes both that division and IRAN's subsequent range-argument read. Aliases
to SEED or the accumulators therefore observe the new state.

IRAN performs the source IDIV without a positivity guard and uses MOVEI on one
plus the current remainder. Zero divisors fault through the required CPU service
after seed advancement; negative divisors reach that operation unchanged. The
older DecwarRandom component's added positive-range guard was removed as a
source-incompatible restriction. Its ordinary integer remainder behavior remains
a component abstraction, not CPU flag emulation.

Public RAN never reads its dummy argument and calls required FSC T0,200 after
RAN. No JavaScript floating conversion or inferred FSC result is supplied. Tests
verify the live quotient, scale operand, seed effects and service boundary;
production floating-point semantics remain unresolved.

Twenty-eight tests include original integer vectors, empty-half repair, seed/
argument/register aliases, monitor/CPU failures, signed ranges and per-session
private memory. BASPHA/PLNATK→PHAROM compositions use actual seeded IRAN; neutral
activation and damage share consecutive draws, including across suspension.
`npm run check` passes 2122 tests, TypeScript and archive/generated-data checks.
Full RNG caller/seed initialization, CPU/FSC/monitor/compiler execution, remaining
combat/queue/runtime and complete session/Telnet integration remain unfinished.

## D-082 — Preserve raw power recursion, live registers and shared saves

WARMAC.MAC:2762-2794 now has resumable public PWR and internal PWR. bodies.
The public entry saves X1/X2/X3 before reading current arguments, calls the
internal body, copies X1 into T0, then restores the three accumulators. Internal
calls save X3/X4 on the same data stack and restore them in reverse order.
There is no host cleanup after a failed operation.

Exponents below five follow the source's separate CAIL comparisons and FMPR
operations. Changes to live X3 or X2 between multiplies affect later operations.
Negative exponents retain HRLZI's loaded 1.0 word; reciprocal behavior is not
added. The resolved 18-bit immediate is required, rather than assuming a host
or PDP-10 floating encoding absent from the supplied evidence.

Larger exponents invoke required IDIVI X3,2, recurse, square X1, then inspect
live X4 before the optional multiplication by X2. The restored remainder is an
actual saved memory word, so aliases and stack edits remain observable. FMPR
and IDIVI are explicit resumable CPU services. Rounding, flags, traps and actual
PUSHJ/POPJ return frames are not supplied by the routine body.

The defense fixtures now route PHADAM's power hook through this raw body.
Explicit rational handles preserve intermediate operation order and multiplication
results without claiming floating-word fidelity. That older PHADAM hook is still
synchronous and rejects suspension; fully resumable damage remains next work.
Separate raw-PWR tests exercise suspension and failures directly.

Thirty-four tests cover exponent boundaries and operation trees, live argument
and accumulator aliases, recursive stack contents, edits between operations,
partial failures and shared underflow handling. Archive/type/test verification
passes all 2156 tests. The archive is unchanged and no external implementation
evidence was used. Full CPU/compiler/combat/session/Telnet parity remains open.

## D-083 — Bind damage statements to memory and resumable numeric services

TORDAM.FOR:26-193 now has resumable TORDAM and PHADAM statement bodies. Actual
NPLC/J/ID/PHIT/SHIP addresses and caller-supplied RAND/RANA/HIT/RANB/HITA/POWFAC
words replace copied arguments and host local values in this path. PARAM:21
makes POWFAC and the arguments integer; the five named locals and RAN/PWR are
explicitly REAL (TORDAM:31; PARAM:185). Constructing the body initializes none
of these words. PHADAM continues to bypass TORDAM's destroyed-target guards.

Expressions carry integer/REAL types and lazy operands. Required compiler
services perform mixed arithmetic, comparisons, explicit INT/FLOAT, assignment
conversion and LHS/RHS ordering. For example, 1000-base(...) is integer before
multiplication, while 1000.0-shpcon(...) is mixed REAL. Hull, energy and scoring
assignments convert separately. REAL values are opaque words; there is no host
floating implementation or assumed production rounding. Compound predicates
and the source's two-label IF remain explicit compiler services. ALIVE's
assignment from integer zero also has a required logical-conversion service.

The source labels retain absorption before hull damage, deflection skips,
critical equality, random call placement, stale critical/kill fields and
positive-strength critical base kills. Out-of-range SHPDAM subscripts address
physical surrounding COMMON words without an added range guard. JUMP receives
actual arguments. BASKIL receives the NPLC-2 expression temporary; later count,
coordinate and strength operations reread current NPLC/J. SETDSP receives actual
coordinate addresses, and clearing completes before subsequent death stores.
No finally block repairs partial state after failure.

BASPHA and PLNATK now await the statement body and its raw PWR/SETDSP calls.
The prior synchronous damage adapters were removed from these fixtures. Tests
suspend in FMPR and DPB to verify damage, ALIVE, owner scoring, recipients and
hit publication order. Rational handles explicitly test expression/call order,
not PDP-10 encoding or rounding. JUMP/BASKIL still compose older components,
and the other weapon/Romulan callers still require adoption of this body.

Sixty-nine new tests bring archive/type/test verification to 2225 passing tests.
They include source damage vectors, persistent locals, memory aliases, alternate
compiler operand and destination orders, random/CPU/conversion/memory failures,
and both defense compositions. The source archive is unchanged and no external
implementation evidence was used. Production compiler/numeric/CPU/monitor
services, full RNG/displacement/queue/caller binding and complete sessions/Telnet
remain unfinished.

## D-084 — Bind displacement and port-loss checks to shared runtime memory

JUMP.FOR:25-80 and BASKIL.FOR:27-64 now have resumable statement bodies using
actual arguments, COMMON and caller-supplied persistent integer locals. JUMP
reads physical CHKOUT words 6/7 for DISV/DISH; CHECK calls these DHS/DVS. The
fixture maps the generated seven-word block at its linked address and uses the
same rational-handle codec as PWR/damage. No host direction snapshot or second
private path object replaces those words.

JUMP retains separate coordinate assignments, mixed integer/REAL addition and
integer conversion before INGAL/PDIST. It clears SHJUMP first, rejects all but
one-sector movement and checks current DISPC. Source and destination SETDSP
calls stay separate. The destination expression uses current NPLC/J only when
that call evaluates it, and later class checks and coordinate stores reread
those arguments. Failure after the first deposit leaves a cleared source cell
and old stored coordinates; there is no rollback or invented lock.

Black-hole displacement clears only the old cell before setting SHJUMP/KLFLG
and target metadata. Stored coordinates remain old. Ship damage/ALIVE, base
strength and ROM changes follow their separate source predicates. Required
services distinguish integer-zero-to-LOGICAL assignment from .FALSE. assignment
to LOGICAL ROM or INTEGER DOCKED. No inferred host boolean encoding is supplied.

BASKIL retains the selected physical player half without an ALIVE filter. A
positive NBASE count enables a scan of all KNBASE slots, using positive strength
and raw LDIS. NUMCAP<=0 still jumps to the next ship even without a surviving
adjacent base. Planet lookup uses raw DISPC and the current ITYPE comparison;
compiler operand order and DO bounds/entry remain explicit. Source stores of
condition and DOCKED use current I independently.

Raw INGAL (WARMAC.MAC:4429-4436) loads T1 before testing each axis, omits the
horizontal argument on vertical rejection and returns raw 0/-1 in AC0. Tests
cover full-word limits, accumulator aliases and partial state on missing memory.
JUMP/BASKIL compose raw INGAL/PDIST/LDIS/DISPC/SETDSP. TORDAM's new fixture awaits
these bodies instead of the older displacement components; its NPLC-2 BASKIL
expression still gets a separate temporary word.

Sixty-nine new tests bring archive/type/test verification to 2294 passing tests.
Compositions verify both JUMP deposits, black-hole return to damage cleanup,
BASKIL before base-count/kill updates, and the positive-strength critical base
that still serves as a port during BASKIL. The archive is unchanged; no external
implementation evidence was used. Production numeric/compiler/CPU/monitor
services, broader caller/queue binding, complete sessions and Telnet remain open.

## D-085 — Preserve path checking through live words and resumable intrinsics

CHECK.FOR:36-95 and CHKPNT.FOR:29-41 now have resumable statement bodies using
actual argument words, explicit compiler locals and the generated linked CHKOUT
block. CHECK's H/V/DH/DV/DIST are integer, DISPL is REAL, RH/RV are explicit REAL
locals and the output direction words are REAL. The body does not initialize
inactive locals or replace physical names with a host coordinate convention.

CHKPNT retains IABS(MOD(INT(C*100),100)-50)<10. Under the exact-rational fixture,
this includes truncated hundredths 41 through 59, excluding 40 and 60 despite
the prose comment's broader endpoints. The intrinsic operations are required
services, including signed MOD and exceptional IABS behavior. C is reread after
the branch, C1 is stored first and the two-candidate branch rereads C1 for C2.
Aliases between all three argument words remain observable.

CHECK preserves source entry writes, one-time dominant-axis selection, later
live direction reads and separate FLOAT conversions. It computes increments
before evaluating DIST for the DO loop. Nonpositive distances and zero direction
are not rejected by added guards: loop entry and division failure follow the
explicit compiler/numeric services. Ordinary loop advancement does not claim a
complete compiler instruction or call-frame implementation.

Each candidate goes through raw INGAL and DISP with actual argument addresses.
A second candidate is checked before RAN. Collision always performs the label-800
DISP reread and returns its result, even if the new result is zero or negative;
it does not resume traversal. Boundary handling writes H2=H1 before V2=V1.
Failures retain completed candidate, conversion and COMMON stores.

A shared fixture composes CHECK→TORDAM→JUMP using the same CHKOUT direction words
and scripted random stream. Tests cover ordinary displacement and black-hole
death, including pauses at raw board deposits. The rational handles expose
operation and conversion order without claiming PDP-10 floating encoding or
rounding. Existing movement/weapon/Romulan caller components still need adoption
of these statement bodies.

Sixty-nine new tests bring archive/type/test verification to 2363 passing tests.
The archive is unchanged, and no external implementation evidence was used.
Production numeric/compiler/CPU/monitor services, broader callers, full random
and queue integration, complete sessions and Telnet remain unfinished.

## D-086 — Preserve movement calls, partial writes and towing conversions

MOVE.FOR:25-157, including IMPULS, now has a resumable statement body over
explicit local addresses, COMMON and linked CHKOUT. The body preserves source
types: D is REAL; V, RANDAM, TIME and coordinate/distance locals are integers.
Typed expression services own arithmetic, conversions, operand/assignment order
and compound logical evaluation. .FALSE. assigned to INTEGER DOCKED remains a
required compiler conversion. No host floating-point policy is introduced.

The deadline and IRAN(4000) precede coordinate input. The ordinary zero-count
RELOC loop differs from label 600, which tests only a negative return and neither
assigns TEM nor retries zero. GREEN, undocking and computer-deflection RAN precede
range rejection. Maximum-speed suffixes and heat messages independently reread
their source predicates; tests change state between yielded output calls.

CHECK receives actual ship-coordinate and local argument addresses. IED uses
the requested IA after CHECK, with positive-shield doubling and nonzero-tractor
tripling. It is subtracted before any lock; blocked paths and failed locks do
not refund it. There is no added lower energy bound. The driver tests live
LKFAIL through the supplied logical policy after raw LOCK returns.

Destination locking precedes source locking unless both occupy one board word.
A source-lock failure releases the destination and returns only after release;
a destination-lock failure does not add an UNLOCK. Separate source clear,
destination deposit and coordinate stores retain completed effects on failure.
The path is not rechecked after waiting, and the current stored source position
can differ from the earlier packed-word lock index.

Towing starts after both unlocks. SETDSP uses V1-INT(DISV), H1-INT(DISH), whereas
integer coordinate assignment converts V1-DISV and H1-DISH afterward. Fractional
directions can therefore produce different board and stored positions. The
destination deposit also precedes clearing the partner's old cell, including
when those cells coincide. Neither behavior is normalized or repaired.

The fixture composes raw OUT/OUT2C/OFLT, ETIM/MSTIME, LOCK/UNLOCK, DISP/SETDSP
and the new CHECK body. It retains explicit monitor, CPU, numeric and compiler
services. LOCATE currently uses the earlier component with a token/text bridge;
its pending text is forwarded through raw OUT at component boundaries. This is
not instruction-level LOCATE/output interleaving or complete call-frame parity.
Rational REAL handles and scripted RAN/IRAN remain test-only policies.

Sixty-three new tests bring archive/type/test verification to 2426 passing tests.
They include normal/alternate/death command dispatch, monitor/output/clock waits,
partial failures, exact source messages and towing inconsistencies. The supplied
archive remains unchanged and no external implementation evidence was used.
Resumable LOCATE, production runtime services, broader callers, complete sessions
and Telnet remain unfinished; no playable or original-equivalence claim is made.

## D-087 — Preserve location parsing through actual words and resumable calls

LOCATE.FOR:36-169, including RELOC, now has a resumable statement body over
actual count, local, return and COMMON addresses. PARAM's implicit integer rule
leaves only DV/DH REAL here. Required services implement ISIGN/IABS/MOD, FLOAT,
mixed arithmetic, assignment/conversion order, logical evaluation, DO bounds and
entry. Ordinary loop advancement models the source word; full generated compiler
instructions and call frames remain unresolved.

LOCATE and RELOC return storage is explicitly supplied as two addresses, which
may alias. The source assigns LOCATE then RELOC, and error output precedes both
abort stores. Tests cover distinct addresses, aliases, changes between stores,
and failed second stores. This represents the source assignments without
asserting which storage the missing compiler actually chose.

RELOC awaits its raw prompt and GTKN before assigning P or reading N. ISIGN
and IABS independently read the actual N word. EOL returns before initializing
DV/DH, while ordinary relative offsets separately FLOAT the current WHO's two
coordinate words. All later numeric coordinate stores remain mixed REAL
assignments, including absolute coordinates with zero offsets. The odd leading
scalar still skips conversion, relative translation and range checks.

Each form and ship-name comparison uses raw EQUAL with actual argument words.
Its five-character/prefix behavior, lowercase-token mismatch and first matching
ship remain unchanged. Computed mode checks that first match's ALIVE and board
occupancy without searching later equal names. After a successful DISP, the
source rereads coordinates and does not repeat the ALIVE/occupancy checks.

Computed mode awaits the baud pause before shifting TKNLST, TYPLST and VALLST
separately. PTRLST and stale words are untouched except where physical aliases
name them. It changes NTOK and return words before count errors, and expands
names backward. Completed later expansion survives an earlier invalid name.
Each coordinate and type write remains separate; failures do not restore tokens.
Loop bounds are supplied explicitly, including zero-name and scalar-only cases
with reversed bounds. Tests exercise zero-trip and first-trip fixture choices.

MOVE's fixture now calls this body, eliminating its earlier LOCATE token/text
bridge. It composes raw EQUAL/INGAL/DISP/OUT and shares COMMON through CHECK and
movement. GTKN acquisition and PAUSE timing remain explicit fixture services;
this round does not supply the complete monitor/input wait path. Rational REAL
handles, scripted RNG and CPU/compiler fixtures are not production policies.

Seventy-one new tests bring archive/type/test verification to 2497 passing tests.
The source archive is unchanged; no external implementation evidence was used.
Production numeric/compiler/CPU/monitor behavior, broader caller/queue adoption,
complete sessions and a strict Telnet host remain unfinished.

## D-088 — Preserve raw wait operands, accumulators and lock transfers

PAUSE (WARMAC.MAC:4010-4042), INPUT (3874-3901) and CLEAR (3906-3909) now have
raw bodies over actual argument blocks, live accumulators and lock/input words.
Monitor operations, ADD effects, HIBER success skips and HALT continuation remain
required services. The routines do not save additional registers, freeze their
arguments or add host clock/cancellation behavior.

PAUSE first tests its argument without loading an AC, then stores LOCKED in
SVLOCK and awaits internal UNLO. It rereads the argument after release, caps a
positive duration at 10000, calls MSTIME T3 and adds current T1 to current T3.
It rereads the actual argument block again before the first HIBER. That last
read has only the upper cap, so an argument changed to a negative value is
passed through. Argument aliases to T1/T3 expose the source register writes.

Each wake calls MSTIME T2, sets T1 to 1000 and compares against current T3.
There is no ETIM midnight correction. CPU/monitor effects can change the
registers used by the next instruction; failed ADD, clock, HIBER or HALT leaves
completed state and released locks intact. Returning HALT explicitly resumes
at the following instruction rather than retrying HIBER.

INPUT's HRLI T1,(HB.RTC) replaces the duration's left half. The raw body requires
the assembled HB.RTC halfword, preserving only the duration's low 18 bits.
Tests use a synthetic marker, not an inferred monitor flag. The earlier INPUT
component was corrected to pass the low-half duration alongside its separate
wake-on-input flag. This fixes an over-wide component operand; it is not a
modernization of the source. INPUT remains uncapped by PAUSE's ten-second rule.

INPUT reacquires before checking HUNGUP/SKPINC/CCFLG, with no later hangup recheck.
Its SAVE<0>/RESTORE<0> uses the shared S stack, including partial effects or a
changed saved result. CLEAR awaits CLRBFi before setting BUFPTR to -1; existing
hangup skips only the monitor clear. Tokens and line data are not erased.

Lock reacquisition uses the source's internal LOCK. entry and raw LKFAIL word.
The inline literal's JRST .-1/.+1 targets are unresolved without an assembler
binding, as with MONIT's earlier literal jump requirement. A required service
selects the corresponding local continuation or transfers elsewhere. The fixture
chooses reload-SVLOCK on failure and return on success; additional tests select
lock-entry and test-only targets. Those fixture choices do not establish the
historical assembled targets. No default retry repair is supplied by the raw body.

MOVE's LOCATE PAUSE call now evaluates its duration expression into an explicit
compiler temporary and awaits this raw body. Tests retain unshifted tokens and
old movement state during waits/failures, then charge requested movement and
compute PTIME from the original deadline after a successful computed target.
Standalone earlier components remain component-level tests; raw GTKN/NXTT and
broader caller adoption are next work.

Fifty-two new tests bring archive/type/test verification to 2549 passing tests.
The archive remains unchanged and no external implementation evidence was used.
Production CPU/monitor/assembler/compiler behavior, complete input/session and
queue integration, full original-executable validation and Telnet remain open.

## D-089 — Preserve raw token registers, decimal spill and hangup count

GTKN (WARMAC.MAC:1670-1733), NXTT (1747-1793), SKPB (1800-1805) and ANUM
(1812-1848) now have raw bodies over actual accumulators, token words, live
CBITS, SCALE and the shared S stack. Effective character addressing, IDPB,
floating instructions, integer arithmetic effects, AOBJN and call/monitor
services remain explicit. The body does not impose an ASCII bounds guard on
raw CBITS addressing or create a host token list.

GTKN saves X1/X2 before testing/incrementing CCFLG./BUFPTR. Buffered input awaits
raw OCRL; fresh input releases the remembered lock, awaits INLI and reacquires
through the required literal-transfer policy before resetting BUFPTR. Type
stores follow numeric, decimal and nonnumeric flag precedence. Overflow awaits
raw OSTR before clearing X1 and BUFPTR. EOL never assigns PTRLST.

The hangup branch revealed a correction to the earlier components. HRLZI loads
X1 with -(KMAXTK-1) in its left half. Hangup's AOJA increments that full word
and jumps directly to GTKN.5, bypassing the ordinary HRRZI count normalization.
With KMAXTK=15, NTOK therefore receives -3670015, while low-half indexing writes
QUIT and EOL into slots one and two. Both CommandInput and MemoryCommandInput
forceQuit helpers now retain that result, and their two prior normalized-count
tests were corrected. First VALLST and both PTRLST words remain untouched.

NXTT saves X2/X3/P1, retains F's left half, clears the current packed token,
classifies live character words and consumes the whole token even when ordinary
text deposition has exhausted X3. Nonnumeric endings clear value and numeric
flags; negative endings use the source MOVN word instruction, including when
TF.PNT is set. No semantic floating-negation shortcut replaces it.

ANUM's decimal branch performs FLTR X2 then HRLZI X3,(10.0), overwriting NXTT's
five-character counter before the following SOJL/IDPB. The raw implementation
retains that register reuse. In the explicit synthetic floating fixture, decimal
text spills into following token words, and a decimal point after six integer
digits resumes deposits at the sixth stored character. Later GTKN token/EOL
writes can overwrite those spilled bytes. Fractional digit processing preserves
FLTR, SCALE read, FDV, FAD, FMPRI and SCALE store order and partial failures.

The rational fixture is opt-in and deliberately uses a synthetic 10.0 immediate;
it is not a PDP-10 floating encoding. Without a CPU binding, FLTR raises the
explicit unresolved dependency after the source's preceding writes. Existing
non-raw scanners retain their floating dependency rather than adopting rational
arithmetic as production behavior.

MOVE's RELOC now invokes raw GTKN/NXTT and supports slash-buffered coordinates
and subsequent commands. Another test composes GTKN with the existing INLI body,
per-character input and raw OCHR. Full production INLI/NXCH/ICHR/monitor/session
binding and wider caller adoption remain unfinished.

Forty-eight new tests bring archive/type/test verification to 2597 passing tests.
The archive is unchanged and no external implementation evidence was used.
Original executable differential validation, full numeric/CPU/compiler/monitor
execution, complete sessions and Telnet remain open.

## D-090 — Preserve character dispatch and editing through live registers

Raw IC dispatch/ICHR.T (WARMAC.MAC:1629,1642-1659), INLI (1860-1915), NXCH
(1927-1936) and DISP/ECHG (1942-1972) now use actual registers, CBITS and line
state. Effective-address resolution, monitor read/flush/clear/output, MOVN/ADDI,
AOBJP and call/transfer effects remain required services. No completed host
string or hard-coded character-table lookup replaces the raw editor's writes.

IC is resolved at dispatch time. INCHWL writes C; ICHR.T sets INWAIT before
calling it and clears INWAIT only after it returns. NUL/CR retry reads and
post-read Ctrl-C/HUNGUP checks preserve their source order. The forced character
is LF, despite the old ESC comment. CLRBFi can yield or fail after that store.
An interrupt already pending before the read does not add an INWAIT clear.

NXCH indexes actual CBITS with C's effective index and retains F's left half.
It can consume wide raw character words through supplied memory/CPU semantics;
no host seven-bit guard is added. Ignored characters retry before ECHFLG clears
the CR/FF echo bits. Tests mutate the table after a yielded character read.

INLI awaits its initial OUTPUT before setting BUFPTR=-1. Repeat selection
precedes clearing RPTFLG/CHRCNT; ESC at first input reuses current line storage,
while later ESC terminates a new line. Normal input writes full C through the
source index and increments CHRCNT before each deposit, including the NUL.
Physical aliases and failed deposits retain those count writes. No host buffer
bounds or rollback is introduced around this raw path.

Special actions independently reread F after earlier calls. DISP outputs its
newline and caret characters directly through monitor services, without OCHR's
HCPOS/BLANK updates; changed C/HUNGUP after a yielded caret changes later output.
Its counter uses the source MOVN/HRLZI/HRRI/AOBJP sequence. Final INLI CR output
precedes current INIFLG/CF.FF tests, optional LF and the final ECHON call.

Both linked echo-control entries immediately return (1313,1324). The raw editor
retains ECHG selection and all explicit ECHON calls but does not enable the
unreachable echo-changing code. Tests verify that negative and positive flags
remain unchanged and that direct redraw and OCHR accounting stay distinct.

Prompted MOVE now feeds individual monitor characters through this raw editor,
ICHR.T, raw GTKN and LOCATE/CHECK. Tests exercise corrected input and hangup during
INCHWL, retaining old movement state on abort. The fixture's target address,
queued reads, monitor outputs and instruction services are explicit test policy;
INI/buffered-file input and real session/monitor binding remain unfinished.

Forty-five new tests bring archive/type/test verification to 2642 passing tests.
The archive is unchanged and no external implementation evidence was used.
Production numeric/CPU/compiler/monitor behavior, broader callers, full sessions,
original executable differential verification and Telnet remain open.

## D-091 — Preserve buffered reads and INI-to-terminal handoff

Raw ICHR.B (WARMAC.MAC:1631-1640), IICH (1284-1306), TTYON and DMPBUF
(1335-1352) now retain live input words, C/X1/P1 and shared S-stack saves.
Effective-address resolution, ILDB and execution of the current IBFINS remain
required services. The count decrements as a signed 36-bit word before the
branch; NUL bytes consume count and pointer updates. Successful refills retry
that sequence, and any IN skip produces C=-1 as the source directs.

IICH reads the buffered character first. A nonnegative character with negative
CCFLG clears cancellation before saving X1/P1; EOF goes directly to the saves
without clearing CCFLG. BEL and negative ECHFLG suppress echo. Other characters
await raw OCHR and return the current C without a second cancellation test.

Handoff awaits CLOSE, TTYON and DMPBUF, loads TTYFIL into X1, awaits SETI,
clears INIFLG, sets BLANK=-1, restores P1/X1 and resumes IC dispatch. TTYON
rereads HUNGUP separately for OUTPUT and SKPINL; DMPBUF performs its own OUTPUT
guard. No host finally/rollback restores registers or flags after a failed call.
The existing CLOSE body releases actual FL.FF/JBFF state before a yielded CORE.

The composed fixture uses explicit synthetic monitor constants and target
addresses, scheduled refills and terminal characters, and an ordinary packed
seven-bit ILDB service. These are test policy, not evidence for missing monitor
or CPU behavior. Construction does not select INI; tests explicitly install it.
MOVE accepts complete INI coordinate lines and can switch to terminal input
midway through the same edited line without discarding earlier characters.

Thirty-four new tests bring archive/type/test verification to 2676 passing tests.
The archive is unchanged and no external implementation evidence was used.
Production numeric/CPU/compiler/monitor behavior, wider callers, complete sessions,
original-executable differential verification and Telnet remain open.

## D-092 — Run NEWS through live file, page and register state

Added a raw NEWS body for WARMAC.MAC:4661-4705 and WARN:59-66. It saves X1/X2/X3
through the shared S stack before clearing the left half of .JBREN and loading
NWSFIL. OPEN, file selection, character input/output, page input, comparison,
monitor warning output and CLOSE are yielding services. The earlier component
reader remains separate; no completed host string replaces this body.

X1 carries the old input descriptor between SETI calls. X3 is the live preceding
EOL flag, reread after ICHR. Output returns before NEWS classifies C as LF/VT/FF;
CR alone does not qualify. Only a dot after an EOL enters paging. The prompt
uses raw OSTR; GTKN runs while the original input is selected, then SETI restores
news input before raw EQUAL reads the first token and YES literal. Any negative
T0 continues. P1/P2 are not among NEWS's saved registers.

At an EOL, cancellation and .JBREN checks precede loading WHO into T1. A nonzero
WHO uses its effective index to test signed ALIVE and clear ACTIVE only when
negative. Normal EOF/rejection/cancellation clears CCFLG and .JBREN's left half
before CLOSE, restores original input, then pops X3/X2/X1. OPEN failure warns
and restores registers without that normal cleanup. Each warning monitor call
has its own HUNGUP guard. Failed calls retain preceding writes and saved frames.

Tests compose existing OPEN/CLOSE/SETI with raw input/output/editing/GTKN/EQUAL,
plus DECWAR dispatch with unchanged PTIME. The full supplied DECWAR.NWS is emitted
byte-for-byte through packed refills. Explicit synthetic descriptors, monitor
constants and ordinary CPU fixture operations do not resolve absent production
semantics. Ordinary terminal monitor echo is not emitted by this fixture; initial
page-output expectations were corrected after checking INLI's source behavior.

Thirty-one new tests bring archive/type/test verification to 2707 passing tests.
The archive is unchanged and no external implementation evidence was used.
Production CPU/compiler/monitor/file behavior, OPEN stack and return effects,
raw HELP and wider callers, full sessions, original-executable differential
verification and Telnet remain unfinished.

## D-093 — Preserve SHLP keyword lookahead and delayed cleanup

Added a raw SHLP body for WARMAC.MAC:5109-5185. Shared S saves of X2/X3/P1/P2
precede .JBREN/CCFLG clearing and OCRL. PASFLG is read after OCRL returns; only a
negative value tries HL1FIL, with HL2FIL as fallback on OPEN failure. A successful
special-file open does not fall back when the keyword is absent. SETI precedes
constructing the keyword byte pointer from current P1 and setting X2=-1.

The reader retains X2 as live search/heading/body state. File lookahead returns
to the same C-processing body without taking another character. FF bypasses
output but enters boundary processing; ordinary body output precedes testing
current C for LF. Boundary interrupt tests precede WHO/ALIVE/ACTIVE updates.

Each matcher iteration reads a file character, folds its case, then invokes
ILDB T1,P2 over actual keyword memory. Space/NUL terminates the keyword only
after the file read. A shorter-than-five keyword can consume the heading LF,
so X2=0 subsequently skips the first body line; this behavior is retained. EOF
consumed in keyword lookahead can cause another file read before the missing
message. Tests distinguish LF-only headings from the supplied CRLF headings.
The source SOJG uses current X3 after the byte operation, and comparison uses
current C with T1's effective value rather than detached host characters.

Missing-help output uses raw OSTR/OSTB/OCRL and rereads P2 after OSTR. CLOSE
and input restoration precede popping P2/P1/X3/X2; only then are .JBREN and
CCFLG cleared. X1 is not saved by SHLP and remains the last descriptor exchange
result. OPEN failure uses WARN and the common restore/flag-clear tail without
CLOSE or SETI. Faults retain preceding source state rather than adding cleanup.

Tests compose existing file operations with raw buffered input and output, and
compare all 38 public topics against supplied DECWAR.HLP bytes across refills.
The fixture explicitly supplies descriptor relocation, monitor constants and
ordinary byte-pointer execution; these are not historical CPU/monitor evidence.
Thirty-seven new tests bring archive/type/test verification to 2744 passing tests.
The archive is unchanged and no external implementation evidence was used.
Outer raw HELP/list callers, production CPU/compiler/monitor/file semantics,
OPEN stack/return effects, full sessions, original-executable differential
verification and Telnet remain unfinished.

## D-094 — Preserve packed HELP matches and raw list output

Added raw SLST/OLST (WARMAC.MAC:5207-5285) and HLPXTR/HLPALL (5074-5103).
SLST saves X3/X4/P1 on shared S, starts X3=-1/X4=0, compares via raw EQUAL and
advances X1 with two separately supplied AOBJP operations. The first match
stores P2 in X4's left half and retains the zero-based index in its right half.
No host array lookup or detached match collection replaces this state.

The first ambiguous match emits the input and ambiguity text, then tests X2
for candidate suppression. If listing was selected, a subsequent negative X2
during the heading or hit output does not skip that current hit; the later test
after P1 restoration determines whether scanning stops. P2 is reread after the
comma/space calls. Unknown output reads current X3 after its prefix. A unique
result loads P2/X1 and invokes AOS (P) before popping P1/X4/X3. Failed calls
retain preceding state and saved frames, including the nested ambiguous P1 save.

OLST uses the source seven-entry row count despite the six-column comment.
DMOVE, DMOVEM and TMP termination are distinct required services, followed by
raw OSTR and separate AOBJP operations. Zero/nonnegative and odd-length pointers
retain source first-entry and early-branch behavior. CPU pair, pointer and
return-frame effects remain required; the fixture supplies ordinary execution.

HLPXTR uses the exact introduction/closing literals around the extra-topic table,
including its blank slot. HLPALL performs both preceding OCRL calls before
reading signed PASFLG and selecting the full/public command pointer. Neither
wrapper adds saved registers, alert checks, ship removal or interrupt cleanup.

Tests compose SLST with raw EQUAL and SHLP, including all 38 public topics from
source table entries through the supplied help-file bytes. Thirty-seven new
tests bring archive/type/test verification to 2781 passing tests. The archive
is unchanged and no external implementation evidence was used. The outer raw
HELP command, broader callers, production CPU/compiler/monitor/file behavior,
full sessions, original-executable differential verification and Telnet remain
unfinished.


## D-095 — Compose the outer HELP command with raw readers and ship state

Added raw HELP for WARMAC.MAC:5013-5062. The entry loads full WHO into T3 and,
when nonzero, reads its physical condition word. A full-word RED match emits
the literal through unguarded monitor OUTSTR and returns without clearing flags
or changing the ship. The non-RED literal JRST .+1 remains an explicit required
transfer service, matching the existing raw GRIPE treatment.

HELP invokes ESHP before initializing X3. Negative TYPLST+1 selects HLPXTR;
otherwise ADDI advances the live modifier index and negative token types or
CCFLG stop the loop. NTOK is never consulted, and nonnegative token types are
not restricted to alphabetic input. Raw EQUAL identifies the star summary.
Signed PASFLG selects the command table after EQUAL returns. Failed SLST with
nonnegative X1 skips the extra-topic search; negative X1 tries it. A successful
search passes current P2's effective address into SHLP.

Composed unknown-token output exposes a difference from the earlier component
helper: OSTB reads up to ten contiguous bytes at a token address. Five occupied
characters can therefore run into the next token word. HELP P UNKNOWN INPUT
prints UNKNOINPUT in the unknown warning before showing INPUT help. A raw
terminal/GTKN test preserves the equivalent ZZZZZENERG case; an EOL word stops
output after ZZZZZ. No per-token host truncation is inserted into the raw path.

Normal cleanup clears CCFLG before PSHP. PSHP rereads current WHO/ALIVE and may
restore a different ship or leave a dead ship's removed board cell unchanged.
An interrupt during restoration remains set afterward. Exceptions do not add
ship restoration or flag clearing that the source did not execute. The explicit
TTYON call between HELP branches remains unreachable.

Tests compose ESHP/PSHP with raw SDSP, raw list/file/output bodies and terminal
GTKN; DECWAR dispatch leaves PTIME unchanged. Every public topic, all 38, is
checked against supplied help-file bytes through the outer command. Thirty-six
new tests bring archive/type/test verification to 2817 passing tests. The archive
is unchanged and no external implementation evidence was used. Production
literal/CPU/compiler/monitor/file behavior, OPEN stack/return effects, broader
callers, full sessions, original-executable differential verification and Telnet
remain unfinished.

## D-096 — Run XGTCMD over caller and private compiler words

Added a resumable XGTCMD statement body for SETUP.FOR:498-556. CMD is an actual
caller address; I and PRECMD are caller-owned private compiler storage. The
fixture installs extracted DATA through an explicit literal encoder. The body
reads current PRECMD/ISAYDO words and invokes raw EQUAL rather than comparing
host command strings. Assignment, logical evaluation, compound condition order,
DO bounds/entry and output literal bindings remain supplied compiler policy.

CRLF returns before .FALSE. is assigned to CCFLG. The PG and greater-than-space
prompt pieces use separate OUT2C calls followed by DMPBUF. The INPUT retry label
has no separate interrupt, prompt or idle handling. After raw GTKN returns,
compiler logical OR controls MONIT; if that service returns, execution proceeds
to the next source statement. KEOL retries before CMD initialization, and NTOK
or other token-type values do not gate matching.

The first pre-game match assigns current I to CMD and scanning continues to
find ambiguity. An ambiguous exit retains the first result and current loop
index. The arithmetic IF's negative CMD branch is preserved despite the comment
that it cannot occur. Unmatched commands scan all actual main-game entries for
the distinct unavailable-in-pre-game warning. Errors emit FORHLP before returning
to the initial CRLF/prompt. The body does not reset command storage at entry.

Tests retain physical aliases: assigning CMD over the first token changes later
matches, and aliasing CMD with I retains the explicit fixture's loop writes.
Table/index changes after EQUAL affect later source reads. Failures leave
completed input, assignment and DO state intact. DO advancement uses the existing
statement-port convention with signed 36-bit updates; complete generated compiler
loop instructions remain unverified.

The fixture composes raw INPUT/GTKN, terminal and buffered INI input, output and
EQUAL. All sixteen pre-game slots match, slash tails bypass additional HIBER,
INI EOF can switch mid-token, and HELP dispatch consumes the same modifier words
through raw HELP. Forty-two new tests bring archive/type/test verification to
2859 passing tests. The archive is unchanged and no external implementation
evidence was used. Outer PREGAM, production compiler/CPU/monitor behavior, full
startup/SETUP/session integration, original-executable differential verification
and Telnet remain unfinished.

## D-097 — Compose outer PREGAM with raw acquisition and dispatch

Added PREGAM statements for SETUP.FOR:117-194. JOBSTA receives the actual first
six /LOCAL/ addresses. N is a caller-owned private word passed to XGTCMD. Logical
policy, compound condition evaluation, literal encoding and routine/call semantics
remain supplied; the body does not copy identity or command state into host objects.

JOBSTA returns before the first CCFLG test. Each initial prompt calls TTYON,
OUT(STRTUP,0), GTKN and the logical interrupt test before inspecting NTOK. Blank
NTOK returns directly. HONORROLL is compared before HELP and PREGAME; initial
HELP invokes HLPXTR/HLPALL, then an extra TTYON before the next prompt. Entry
announcements preserve four separate OUT calls, including required compiler
bindings for the purchase instructions and continued documentation literal.

XGTCMD writes actual N, which is read on return for the computed GOTO. ACTIVATE,
zero/negative and out-of-range indices call PRGNAM and return. Linked PRGNAM
immediately POPJ, but its literal/call boundary remains explicit. All other
branches preserve their source order and arguments: TYPE has no argument,
SHOSTA receives true, POINTS false, and only STAZAP tests PASFLG through compiler
logical policy. If MONIT returns, the source resumes acquisition rather than
forcing a host exit.

The fixture composes raw initial input/output, XGTCMD, summaries, HELP and NEWS.
Other routines remain mandatory bindings rather than successful no-ops. JOBSTA
uses an explicit synthetic monitor result over the real LOCAL words; full monitor
behavior is unverified. Compiled literal bytes, especially the continued string,
remain an explicit fixture choice. Tests retain partial identity writes and an
N/LOCAL alias rather than isolating state that the supplied program can share.

Forty-six new tests bring archive/type/test verification to 2905 passing tests.
Compositions cover all dispatch branches, initial input through ACTIVATE, raw
HELP and supplied NEWS output, slash tails and INI-to-terminal handoff. The archive
is unchanged and no external implementation evidence was used. Production JOBSTA,
remaining dispatch bodies, compiler/CPU/monitor semantics, startup/SETUP/session
integration, original-executable differential verification and Telnet remain open.

## D-098 — Preserve JOBSTA monitor and name-buffer operations

Ported the selected JOBSTA body at WARMAC.MAC:3709-3867 and USRPRJ at
3662-3665. PREGAM composes it through actual LOCAL argument addresses. Monitor
calls, byte instructions, literal continuation and relocated private symbols
remain explicit services or bindings. The tests use declared synthetic monitor
results and byte-pointer operations; these do not establish monitor equivalence.

RADIX 8 is active. The replacement baud-code branch compares against octal 13
and substitutes octal 11: codes above decimal 11 select decimal index 9, whose
table value is zero. TRMOP failure selects index 7 and 300 baud. The older
commented implementation and the 2400-baud comment do not override these words.

JOBSTA invokes GETPPN twice. The first controls DEBFLG; the second controls the
caller PPN and FREBIE. A skip return from the second call skips the USPPN store.
USRPRJ reads that saved word and maps project octal 337 to 70000. The nonzero-WHO
sequence branch retains PJOB and requires resolution of its literal JRST .+1.

The cached-name test uses POINT 7,USCBH.,7, including its unusual final bit.
Only the first handle-word clear is guarded by HUNGUP. Direct OUTSTR precedes
CCFLG clearing, and direct INCHWL writes T2 without passing through ICHR or the
editor. NUL/CR are ignored; LF/ESC/BEL terminate; Ctrl-C or CCFLG returns. There
is no input-length bound. Conversion stops after twelve SIXBIT characters,
clears TMP rather than HAND and retains cached suffix bits. The source XOR
outside lowercase ASCII is preserved. Blank-name retry retains T1=0; the test
fixture rejects its unsupported byte pointer, leaving actual CPU effects open.

Fifty new tests bring archive/type/test verification to 2955 passing tests.
Name entry, initial PREGAM input, HELP and ACTIVATE share one terminal queue in
composition. No archive bytes changed and no external evidence was consulted.
Production monitor/CPU/compiler behavior, remaining callers, complete sessions,
Telnet and original-executable differential verification remain unfinished.

## D-099 — Preserve PASWRD expressions over live identity and privilege words

Added PASWRD statements from PASWRD.FOR:24-42. PASFLG is explicitly INTEGER
(LOWSEG.FOR:56); the raw EQUAL result is assigned as a word, with only -1 cleared
by the next statement. No Boolean normalization or NTOK/type guard was added.
The third EQUAL argument remains present in the call binding even though the
selected WARMAC entry reads only the first two arguments (4363-4368).

Each of the four USRPRJ(0) occurrences remains a separate evaluable expression.
AND, comparison, assignment and logical interpretation are compiler services.
The fixture normally uses left-to-right short-circuit evaluation; eager and
reverse-order fixtures demonstrate that the statement body does not impose
that choice. No original compiler evaluation order is claimed. KPASS and the
zero/one argument words require compiler literal/call bindings.

The new composition reads actual token words through raw EQUAL and the saved
USPPN through raw USRPRJ. JOBSTA's second GETPPN skip can retain an old saved
project while reporting a new PPN to LOCAL. PASWRD uses the saved word. Its
project condition is evaluated even after a failed password; PASFLG is reread
for the final logical return. Failure output reads OFLG only after OUT(UNKCOM,0)
returns, preserving output suspension and the SHORT form without added newline.

PREGAM now invokes this body. Tests compose privilege grant, ZAP dispatch gating,
revocation, slash commands, buffered INI acquisition and main command slot 33.
The ZAP body in these gate tests remains an explicit test service; no statistics
file operation is claimed from them. The earlier single-project password helper
remains available for earlier isolated adapters, not as a replacement for the
new expression-preserving body.

Thirty-five new tests bring archive/type/test verification to 2990 passing tests.
The archive is unchanged and only supplied source was consulted. Production
compiler/CPU/monitor bindings, complete sessions, Telnet and original-executable
differential verification remain unfinished.

## D-100 — TYPE reports use live settings, option tests and raw terminal output

Added the TYPE.FOR:34-103 statement body over actual KIND and private P words.
P=2 precedes both KIND comparisons, preserving a caller alias between them.
Only KIND 1 and 2 bypass parsing; other words follow the switch path. The raw
EQUAL calls retain exact O ambiguity before OUTPUT/OPTION matching. Prompted
GTKN returns on first-token KEOL before P=1, and has no added flag/NTOK exit.

The report reads each output setting after the preceding source output call.
Three-label arithmetic IF uses signed integer words. Two-label PRTYPE/SCNFLG
IF behavior remains an explicit compiler service. Logical interpretation and
NOT, assignment/comparison, literal encoding and argument evaluation also remain
required policy. The fixture's signed-negative first branch is not compiler
verification.

ROMOPT and BLHOPT each have two independent source conditions, including the
negated condition after possible output. A change during the affirmative line
can therefore also enable the negative line. These conditions are not collapsed
into host if/else or captured options. OUT2W receives separately evaluated
TTYDAT addresses and raw output copies the two actual words; index zero reads
the preceding XHELP pair. Shared CRLF preserves BLANK/HCPOS suppression.

PREGAM's zero-argument CALL TYPE remains unresolved: the fixture fails explicitly
unless the caller supplies a KIND-address binding. Tests exercise that binding
without claiming it is the original convention. Main command slot 30 supplies
its actual explicit zero. Pre-game, slash input and buffered INI compose through
the new body. The earlier host-object TYPE helper remains for older isolated
adapters, not the new live-memory composition.

Forty-one new tests bring archive/type/test verification to 3031 passing tests.
The first test run exposed an extra-newline assumption; expectations were fixed
against WARMAC.MAC:2046-2063, without changing the source-derived CRLF behavior.
No archive bytes changed and only supplied source was consulted. Production
compiler/CPU/monitor bindings, remaining session integration, Telnet and
original-executable differential verification remain unfinished.

## D-101 — SET mutates live settings, terminal selection and packed board

Added SET.FOR:27-159 statements over private P/I/J and actual COMMON words.
The seven ordinary switches retain first-match source order. PASFLG's explicit
NOT policy gates the three privileged switches only after ordinary comparisons
fail. P=2, prompted P=1, and value-prompt P=0 retain their distinct timing;
blank input returns before the latter assignments. No added NTOK/flag guard or
unknown-alphabetic-value error is introduced.

Setting comparisons remain independent statements, resolving current P and
master text again after each assignment. The terminal scan clears TTYTYP, reads
live TTYDAT and stores the first match. A second match preserves that index and
current I. Unknown input retains zero; cancelling the next prompt preserves it,
so the following TYPE reads the physical XHELP alias. Output keeps all source
OUT/CRLF calls, including the blank line before the repeated terminal prompt.

NAME passes actual P to the conditional USRNAM function; after a failed result
it prompts, invokes GTKN and calls USRNAM with literal zero without a KEOL test.
These remain required services in the new composition. ENDFLG is assigned through
required logical-to-integer policy before ENDGAM, and a failure preserves that
write. No successful no-op is supplied for either routine.

BHREMV runs nested source-order I/J loops through raw DISPC/SETDSP using actual
argument addresses. Completed writes survive later failures, and BLHOPT is not
cleared. Compiler bounds/entry, assignment, logical/NOT, literal/call behavior
and production CPU/monitor services remain explicit. Loop advancement follows
the existing signed 36-bit statement-port convention; original compiled DO
instructions are still unverified.

PREGAM now invokes this body; tests compose main slot 20, raw terminal/INI and
slash input, SET → TYPE and JOBSTA/PASWRD → SET ROMOPT → TYPE OPTION. Fifty-four
new tests bring archive/type/test verification to 3085 passing tests. Only the
unchanged supplied archive was used. Raw USRNAM/ENDGAM adoption, complete session
integration, Telnet and original-executable differential verification remain open.

## D-102 — USRNAM uses physical input, registers and JOB addresses

Added WARMAC.MAC:4063-4102 as a raw register/memory body and bound SET NAME to
it. T0 is cleared before the actual argument is read. A nonzero index loads
PTRLST and scans current LINBUF/CBITS until a delimiter, then skips exactly one
character. Zero starts at LINBUF. No NTOK bound, whitespace normalization or
host token/string copy was added. A NUL encountered while seeking the delimiter
returns without clearing TMP.

The copy clears two TMP words, converts at most twelve character words through
the source octal comparisons/arithmetic, and invokes required IDPB C,P2. It
then invokes required DMOVE T1,TMP. The pair is accepted if either word is
nonzero, including a zero first word. T0 becomes -1 before WHO is read and before
either JOB write. The routine does not save P1/P2/C or the result registers.

JOB addresses retain the source column-base-minus-one indexing. WHO=0 writes
the preceding row/column words; it is not redirected to LOCAL or rejected as
pre-game input. WHO is read after DMOVE. Aliasing a JOB destination with T3 can
change the index for the second write. Normal returns set BUFPTR=-1, while CPU
or memory failures preserve the earlier writes without an invented tail cleanup.

The ordinary six-bit-pointer and DMOVE fixture policies are explicit, with
exceptional CPU behavior still required. Tests compose direct and prompted
SET NAME, blank input, slash-tail consumption, pre-game, main command dispatch
and buffered INI. The existing host-name helper remains for earlier isolated
adapters; this path uses the raw body.

Thirty-nine new tests bring archive/type/test verification to 3124 passing tests.
No archive bytes changed and no external implementation evidence was consulted.
ENDGAM adoption, production CPU/compiler/monitor bindings, complete sessions,
Telnet and original-executable differential verification remain unfinished.

## D-103 — ENDGAM uses live conditions, private TX words and shared totals

Added ENDGAM.FOR:26-76 statements and bound SET ENDFLG to them. Entry ENDFLG is
interpreted through compiler logical policy. Natural termination tests planets
and MIN0 before KILHGH, then assigns true only after that call returns. Forced
termination skips those steps. The first output precedes MAX0; exactly zero
means total destruction, including negative other counts. All-negative counts
do not satisfy that condition. The -2 assignment follows its output call.

Base and team messages retain separate live predicates and compiler AND policy.
WHO=0 branches directly to EXIT without identity, time, score or release calls.
The player path copies JOB/NAMES one assignment at a time, rereading current WHO
for each source expression. Private TX words survive unrelated LOCAL scratch
writes; no single host player snapshot replaces those assignments.

WHOWON retains the base-count tie rule, TXWHY the team/total-destruction checks,
and TXTIM composes raw ETIM using the current job-start address. POINTS receives
true and returns before TXTOT reads actual POLOCL TOTAL(1). UPDSTA receives the
nine TX addresses and actual WHO; FREE receives that same WHO address, followed
by WHO=0 only after successful return. Failures retain completed state. EXIT
remains a required platform service; the statement end does not invent another
transfer if a test service returns.

The fixture maps the linked nine-word POLOCL span and explicitly binds ordinary
compiler policies. Final POINTS, UPDSTA, FREE, KILHGH and EXIT are required
services. Player-path tests supply declared score/statistics/release fixtures,
not proof of those implementations in the new runtime. Earlier compositions
remain separate evidence.

Thirty-two new tests bring archive/type/test verification to 3156 passing tests.
Pre-game JOBSTA/PASWRD/SET ENDFLG and buffered INI reach raw end-game output and
the exit boundary. The archive is unchanged; no external evidence was consulted.
Downstream routine adoption, production compiler/CPU/monitor bindings, full
sessions, Telnet and original-executable differential verification remain open.

## D-104 — POINTS uses live POLOCL, deferred predicates and raw report output

Added POINTS.FOR:23-200 statements over actual DFLG/I, the nine-word POLOCL
span and shared score/count/turn words. BLKSET clears exactly the four totals
before DFLG is read. Ordinary flag assignments, token matching and default-self
versus pre-game paths preserve source order. EQUAL and report output compose
the raw routines with explicit compiler literal and call fixtures.

Final entry sets all flags (then clears IFLG for WHO=0) and reaches label 600
without initializing the token DO loop. The body invokes required continuation
policy there; it does not invent an ALL-to-report shortcut. The fixture rejects
an uninitialized continuation unless a test supplies one. Tests cover reaching
the report and resuming token scanning, including an abort after flag writes.

Compound row predicates are deferred through required AND/OR policy. An eager
pre-game evaluation can read physical SCORE(i,0); the body adds neither a bounds
guard nor a mandatory host read independent of compiler policy. Selected rows
use live flags and addresses. Each OFLT precedes a separate score reread for
TOTAL addition. Changed scores or I during output therefore affect the sum.
Separate short/long row-title conditions also reread OFLG after output.

Totals, commissioned counts and per-player/per-turn averages retain source
output order, widths and integer arithmetic. OWIDTH is an actual POLOCL word.
Divisions are required compiler arithmetic and can fail after earlier report
bytes/totals; no zero-denominator default is introduced. The declared fixture
uses signed 36-bit addition and integer division. Loop initialization and
continuation, Boolean-to-integer assignment and expression evaluation remain
required compiler services, not verified generated instructions.

PREGAM, main command slot 15 and buffered INI compose the new body. ENDGAM now
calls it and reads its actual TOTAL(1) before UPDSTA. That final composition uses
an explicit continuation fixture and declared statistics/release services.
Thirty-five new tests bring archive/type/test verification to 3191 passing tests.
Only the unchanged archive was used. Final-loop resolution, production compiler/
CPU/monitor behavior, UPDSTA/FREE adoption, full sessions, Telnet and original
executable differential verification remain unfinished.

## D-105 — Preserve raw BLKSET/BLKMOV/LOCF argument and pointer effects

Added WARMAC.MAC:3918-3950 routine bodies over actual argument descriptors,
T0/T1/T2 and word memory. POINTS now calls raw BLKSET for its four TOTAL words
instead of using a direct fixture fill. AOJ, ADD and BLT are required CPU
services with explicit accumulator, flag and exceptional-memory responsibilities.

BLKSET reads the value, writes the first destination word unconditionally, then
resolves the destination again and reads size only after pointer construction.
The first write may modify its argument descriptor or count word. AOJ increments
the full T1 word; at the address-space boundary its carry can change both halves.
The BLT endpoint is computed even for size zero, one or negative. The wrapper
neither suppresses the first write nor invents BLT empty-range semantics.

BLKMOV builds source/destination halves in source order and invokes BLT with
the computed destination endpoint. The ordinary fixture copies forward from
live memory, so overlap can propagate values rather than behave like a snapshot
copy. That fixture rejects empty/wrapped/AC extents; those require actual CPU
behavior. LOCF returns the effective argument address without reading the target
word. No SAVE/RESTOR or argument-count guard is added to these bodies.

Tests preserve live ARG changes, first-write aliases, indexed LOCF arguments,
CPU suspension, modified BLT accumulators and partial failures. POINTS exposes
its first cleared TOTAL word before the BLT service runs, then completes the
four-word clearing without touching OWIDTH. Twenty-eight new tests bring archive/
type/test verification to 3219 passing tests. Only the unchanged archive was
used. Broader callers, CPU/compiler/monitor behavior, final POINTS continuation,
UPDSTA/FREE adoption, complete sessions and Telnet remain unfinished.

## D-106 — Preserve FREE statements and physical killed-queue matching

Added FREE.FOR:29-96 and KQSRCH.FOR:25-50 over shared word addresses, actual
FRLOCL and explicit private locals. ENDGAM now calls this FREE body in the
composed runtime fixture. Raw SETDSP, DAYTIM, locks and BLKSET replace direct
fixture operations at those call boundaries. RSTART remains a separate entry
for a subsequent adoption round; its earlier component implementation remains.

FREE checks ALIVE only before acquiring FRELOK and retries LKFAIL without
rechecking it. Each JOB save is followed by a separate clear, with current SNUM
and I read for each statement. All ten ship words and all device words are saved,
but only shared VPOS, HPOS and energy are cleared. No snapshot transaction or
failure cleanup is added. KQSRCH clears KINDEX first, captures its DO bound through
the compiler service, and matches the first physical job/project row. The
commented terminal/age branch stays disabled. Its match refreshes the first
three columns before FREE writes all five killed-record columns.

The last-player retention clock and killed-record clock are separate DAYTIM
calls. The packed team/ship word uses required integer OR with SNUM*262144.
Compiler expression order, loop behavior and integer-one assignment to logical
ALIVE remain explicit policies. Hit messages are drained before radio messages;
the latter receive the actual FRLOCL DUM address. FREE does not return to the hit
loop after starting radio cleanup. DBITS and DISPFR are cleared before BLKSET
also clears their physical words within the 17-word IWHAT block.

Thirty-six new tests cover ordinary release, queue reuse/wrap, changed arguments
and indices, raw-call suspension, partial failures and ENDGAM/POINTS/FREE with
explicit final-loop/statistics fixtures. Archive/type/test verification passes
3255 tests. Only the unchanged archive was used. TRCOFF and queue-consumer
adoption, RSTART statements, production compiler/CPU/monitor services, final
POINTS resolution, UPDSTA, complete sessions and Telnet remain unfinished.

## D-107 — Restore RSTART through shared storage and raw identity calls

Added the RSTART entry from FREE.FOR:100-148 over the same FRLOCL, TTEAM and I
used by FREE statements. DUMMY has its own required private word and is passed
twice to JOBSTA, preserving sequential writes to one physical address. The
fixture composes raw DISP, locks, JOBSTA, SETDSP and output; no new host identity
or board representation is introduced.

The entry checks current SHPCON(SNUM,KVPOS), then saved board coordinates. Only
positive DISP blocks restart; the negative sentinel is accepted. Both errors
print the extracted source message, call required MONIT and retry label 800 if
it returns. Lock retry starts at 801 and does not repeat availability checks.
The caller's second LOCK argument remains 'RSTART'; selected WARMAC LOCK reads
only its first argument, so its literal encoding is not invented by this fixture.

ALIVE true assignment precedes player counts. Team calculation retains integer
subtraction/division/addition through the required compiler service. Each ship
and device word is restored separately. JOBSTA refreshes job/project/terminal/
speed while its two name outputs alias DUMMY. Five saved JOB fields then replace
name, terminal type and timestamps. A normal early JOBSTA return, including its
Ctrl-C path, does not bypass these statements. Final SETDSP reads the saved
coordinates and TSHIP, which may differ from restored fields or current SNUM.
No consistency guard, transactional rollback or automatic unlock is added.

Thirty new tests cover source output, retries, raw identity effects, live saved
words, argument/index changes, overflow and partial failures. FREE → RSTART
uses the same saved block and leaves the killed record intact. Archive/type/test
verification passes 3285 tests. Only the unchanged archive was used. Production
MONIT/CPU/compiler behavior, queue/TRCOFF integration, final POINTS, statistics,
full session startup/rejoin and Telnet remain unfinished.

## D-108 — Read raw hit queues and release tractors through live words

Added WARMAC.MAC:3447-3523 GETHIT over actual T1/T2/X2/X3, argument descriptors,
LOWSEG output fields and shared queue memory. SOSL, SOJG, AOJA, multiplication,
addition and LDB remain required CPU services. LDB receives the source POINT
size/offset/end spellings; the body does not silently resolve assembler operand
interpretation. The fixture explicitly uses decimal field widths/positions from
the earlier component model, without claiming that policy is proven historical
assembler behavior.

GETHIT decrements HITFLG before searching, loads live BITS through the retained
T1, and scans physical slots. Misses clear sixteen output fields but retain DBITS
and the decremented count. Matches read payload fields individually, map the
source/destination all-ones sentinels, convert shield bit zero to -1, read the
recipient mask and finally remove current X3 from the current X2 link. CPU waits,
changed registers and aliasing therefore remain observable. No payload snapshot,
serial-order sort, count reconciliation or failure rollback is introduced.

Added TRACTR.FOR:126-132 TRCOFF statements over actual IP and deferred BITS/OR
reads. DBITS and IWHAT are set before two separate nested beam clears. IP can
alias the first cleared word and alter the second destination. A zero partner
still addresses physical BITS(0)/TRSTAT(0). MAKHIT remains a required call after
the clears; the body does not replace caller WHO with IP.

FREE is bound to both bodies. Twenty-nine new tests cover raw operations and
partial failures; a declared existing component MAKHIT fixture produces into the
same physical queue consumed by raw GETHIT. That composition retains the other
recipient's notification and uses caller WHO's sender slots. Archive/type/test
verification passes 3314 tests. Only the unchanged archive was used. Raw producer
and message/queue-manager integration, compiler/CPU/monitor behavior, final
POINTS, statistics, full sessions and Telnet remain unfinished.

## D-109 — Preserve GETMSG's separate search, copy and removal operations

Added WARMAC.MAC:3621-3652 GETMSG and 3227-3292 SRCH/SRCH.X and REMV/REMV.X.
The bodies use actual queue words and T1/T2/T3/X1/X2/X3/X4 registers. Search
stores the predecessor's physical address in X2's left half, not a host list
index. A successful SRCH.X increments its stack return word through required
AOS; SRCH resolves that skip, increments its own return word and unlocks.
The fixture uses actual P pushes/pops with a declared synthetic return PC.
No production instruction-transfer or overflow behavior is inferred from that
ordinary fixture.

GETMSG decrements MSGFLG first. Failure reloads the current player argument,
clears its count and DISPFR/DBITS, and does not write the caller's buffer. The
success path captures its destination in X4 before searching. Search unlocks
before header/payload reads. Source/destination all-ones halves become zero,
including the source's SETZM T2 addressing AC2. BLT copies sixteen words using
live source/destination state, then removal takes a separate queue lock.
Ordinary overlapping copies propagate through current memory rather than a
snapshot array.

REMV retries any nonzero LKFAIL, clears the current X3 bit and only unlinks a
record when its remaining recipient half is zero. It rewrites the predecessor
and, for the tail, the header before freeing the slot. Register or memory changes
between these operations remain observable. The selected DBQUE.=0 omits queue
debug output. No host transaction, cycle repair, counter reconciliation or
failure unwind is added to these paths.

FREE now drains actual message records into FRLOCL DUM. Thirty-two new tests
cover raw skip returns, linked ordering, lock boundaries, argument/register
changes, buffer overlap, head/middle/tail deletion and partial failure. Archive/
type/test verification passes 3346 tests. Only the unchanged archive was used.
Raw reservation/publication, MAKMSG/MAKHIT, compiler/CPU/monitor contracts, final
POINTS, statistics, complete sessions and Telnet remain unfinished.

## D-110 — Preserve raw reservation, full-queue eviction and publication

Added WARMAC.MAC:3127-3209 RSRV/QRSRV, UPDT/QUPDT and the RSRVHQ compatibility
entry. The wrappers retain their different lock-failure behavior: RSRV returns,
while UPDT keeps requesting the lock. Their inner bodies unlock only after
finishing reservation/publication. Raw lock, search/removal and actual data/call
stacks are used in the fixture; AOBJN and arithmetic remain required CPU policies.

QRSRV scans nonzero words with the caller's X1 descriptor, marks the first zero
word -1, computes X2, then unlocks. Even an unusual descriptor still performs the
initial word test. If full, it saves X3, takes the oldest linked entry's recipient
half, selects a bit through MOVNI/ANDI, removes that recipient from every entry,
restores X3 and restarts the physical scan. Message counters are not corrected.
If removing that recipient frees nothing, another pass may select a different
recipient. Unlinked reservations and linked zero-recipient entries can repeat
without progress; no new host exception, cycle repair or eviction policy replaces
that source behavior. Tests bound such runs through explicit scheduled services.

QUPDT sign-extends the old tail index, rewrites the predecessor and header, then
writes the new entry's low-half recipient bits with an all-ones left half. The
record need not have been reserved, and zero recipients are not rejected. Each
write remains observable before the following arithmetic or unlock. RSRVHQ only
clears LKFAIL; it neither inspects nor writes a supplied slot argument.

Twenty-nine new tests cover reservation extents, CPU branches, full-queue cleanup,
actual X3 SAVE/RESTOR, partial publication and failure. Raw reservation/publication
feed GETMSG and FREE over the same physical queue. Archive/type/test verification
passes 3375 tests. Only the unchanged archive was used. Raw MAKMSG/MAKHIT, queue
initialization, production compiler/CPU/monitor behavior, final POINTS, statistics,
complete sessions and Telnet remain unfinished.

## D-111 — Preserve raw MAKHIT deposits, publication and counters

Added WARMAC.MAC:3330-3434 MAKHIT over live registers, LOWSEG hit fields and
shared queue words. Its sender-owned forty-slot search retains physical scan
order, first recipient-empty slot preference and strictly older serial selection.
The selected slot defaults to the first sender slot when no age beats HITSER.
The oldest-record literal block's JRST .+1 is a required continuation service;
the test fixture explicitly returns to the remaining scan. That service does not
claim to resolve the missing assembled control-transfer evidence.

AOS increments HITSER before the link's serial-only word and payload writes.
Half-word writes and DPB operations remain separate; byte services receive
original POINT spellings, with the same declared decimal-field fixture as raw
GETHIT. Unused payload bits remain. Invalid IWHAT with nonzero PASFLG enters the
source diagnostic, saves/restores T1/T2/X1/X2 through actual S storage, prints
original CR/LF/text/number bytes, then deposits the restored code. Failure retains
the partially written record and any saved stack state.

After deposits, current DBITS is ORed into the current X2 link, read again for
notification counting, and cleared before the first flag increment. The full
36-bit shift loop and physical HITFLG addresses remain visible; high bits are
not filtered to player count. Overwriting a pending slot does not reconcile old
recipients' counts. Sixteen hit fields are cleared only after this loop finishes.

Thirty new tests cover slot/serial behavior, field policies, diagnostic output,
live registers, overflow and partial failure. FREE/TRCOFF now produces through
raw MAKHIT and consumes through raw GETHIT, leaving the other tractor partner's
notification pending. Archive/type/test verification passes 3405 tests. Only the
unchanged archive was used. Raw MAKMSG/queue initialization, production compiler/
CPU/monitor and literal/POINT resolution, statistics, final POINTS, complete
sessions and Telnet remain unfinished.

## D-112 — Preserve raw MAKMSG input, truncation and cancellation

Added WARMAC.MAC:3536-3607 MAKMSG over actual ARG/P1/C/T/X registers, LOWSEG
fields, CBITS and queue storage. Explicit arguments use the source's extra
indirection when the first word has a zero left half. The no-argument path scans
LINBUF from its beginning for the first semicolon; otherwise it prints Msg: and
calls raw INLI. No host string snapshot or token-tail substitution replaces
these paths.

Reservation retries precede header construction. The copy increments T2 and
uses the CPU's AOJGE result to stop depositing while continuing to read through
CF.EOL. DPB replaces the last stored byte with CR, then IDPB appends LF/NUL,
retaining at most 75 text bytes under the ordinary pointer fixture. The resulting
read count, including the terminator, controls short-message cancellation.
That cancellation prints the ASCIL text and calls raw REMV with X3=-1.

Ctrl-C after INLI branches to the same cancellation before reservation. X2 is
therefore whatever input/output left, not a known reserved index. The body keeps
that behavior, including possible writes to AC0 through the predecessor half;
it does not invent safe cancellation. Failure leaves DBITS unchanged. On success,
publication uses current DBITS, then counters reread it and iterate all 36 bits.
Unlike MAKHIT, MAKMSG clears DBITS only after the counter loop. DISPFR is retained.

Twenty-nine new tests cover raw packing/input, truncation, linked operations,
partial failures and MAKMSG → GETMSG/FREE through shared words. Archive/type/test
verification passes 3434 tests. Only the unchanged archive was used. Raw queue
initialization, broader caller adoption, production compiler/CPU/monitor and
POINT/literal resolution, final POINTS, statistics, full sessions and Telnet
remain unfinished.

## D-113 — Initialize raw queue links without clearing retained state

Added SETQH/SETQM from WARMAC.MAC:3036-3051. Each body writes the header -1,
clears its first link, loads the current relocated BLT literal and invokes the
required CPU copy. The composed fixture now runs those bodies instead of direct
component initialization. Synthetic literal words and ordinary forward BLT are
explicit fixture choices; the body retains literal aliases, suspension and
partial-copy effects without adding rollback.

Queue reset does not clear HITSER, hit/message payloads, HITFLG, MSGFLG, JSQTIM
or JSQTAB. JOBSTA now writes JSQTAB in the same actual queue block, rather than
its earlier separate fixture location. Tests exercise retained sequence values
and reset followed by raw creation, retrieval and reservation. Stale counts
remain for consumers to handle; no automatic count reconciliation is added.

Eighteen new tests bring archive/type/test verification to 3452 passing tests.
Only the unchanged archive was used. Broader command/SETUP/session adoption,
production compiler/CPU/monitor and POINT/literal resolution, statistics, final
POINTS, complete sessions and Telnet remain unfinished.

## D-114 — Execute RADIO through live words and raw input/output

Added the statement body from RADIO.FOR:25-87 with caller-supplied private
locals and literal addresses. It composes GTKN, EQUAL, OUT, CRLF and ODISP in
the shared runtime fixture. ON is tested before OFF, so O selects ON. GAG and
UNGAG participate in a required compound-expression policy; the subsequent
UNGAG comparison is performed again after GAGTYP is assigned.

Name lookup uses current NAMES words and takes the first match. BITS entries
are read from memory, including physical out-of-range aliases. There is no
added player, target-alive or damaged-radio check. NOMSG is shared and GAGMSG
is private. Clearing uses the original separate addition and negation in
`-(bits(i)+1)`, with explicit compiler arithmetic services. Mask writes precede
output, and displayed I/ITEAM are read after prefix output returns.

Twenty-nine tests cover prompts, exact output at three verbosity settings,
slash continuations, aliases, suspension and failures, as well as untimed
command slot 17. Relocated output tables/literals and compiler/CPU/monitor
services are declared fixtures, not historical execution evidence. Full checks
pass 3481 tests. Only the unchanged archive was used. TELL/message-command
adoption, complete sessions, Telnet and original-executable verification remain
unfinished.

## D-115 — Execute TELL against shared words and raw message queues

Added the complete TELL statement flow from TELL.FOR:25-165 with caller-owned
locals and its separate 17-word LOCAL array. Human messages now compose raw
GTKN, EQUAL, OUT/OUTW/ODISP/CRLF and MAKMSG/GETMSG. The body reads live NAMES,
GROUP and BITS instead of roster objects and generated masks. Recipient filtering
still walks all ten physical slots, while bits outside that range survive into
MAKMSG's physical counter addressing. No recipient-range guard is added.

Sender radio enabling precedes the destination prompt; repeated input is checked
after ROMULAN matching. Reply creation precedes SNTROM and DBITS restoration.
The relocation path composes raw IRAN, INGAL, DISP and SETDSP, retaining the
horizontal-outer/vertical-inner search and separate coordinate expressions at
each call and assignment. It does not reserve a destination or roll back failed
output, queue writes or board changes.

Gag clearing occurs before message creation. Group pruning retains separate
addition and negation; other mask clearing uses a required complement service.
Compiler truth encoding, arithmetic, compound conditions, DO and call-expression
policies remain explicit. Raw ROMSPK is a required dependency in this new path;
tests install declared speech fixtures to exercise TELL reply/control flow.
The earlier component ROMSPK remains separately tested, not silently substituted.

Forty-one new tests bring full archive/type/test verification to 3522 passing
tests. Only the unchanged supplied archive was used. Raw speech and delivery
caller adoption, compiler/CPU/monitor/literal resolution, final POINTS,
statistics, complete sessions, Telnet and original-executable parity remain
unfinished.

## D-116 — Generate raw Romulan speech through live tables and pointers

Added ROMSPK, RMCOPY and RMGPLY from WARMAC.MAC:6228-6348 and bound ROMSPK into
the composed TELL runtime. All phrase pointers, population masks, node rows and
IRAN argument literals are relocated memory. TMP uses the actual assembler
scratch field shared with output routines. The body saves ARG on the shared S
stack, restores it for destination resolution, then leaves it at the last IRAN
literal as the source does. Source SOS operations also modify AC0.

RMCOPY reads and deposits individual bytes, stopping at the source NUL without
copying it. ROMSPK appends plural/suffix/NUL bytes separately, preserving bit zero
and unused destination bytes. The single-player path still reads the broadcast
pointer before replacing it. PLAYER is tested for nonzero, independently of
FORTRAN logical-sign policy. Exceptional table indices use physical memory.

RMGPLY retains GETLIN's right-half node, first-match search, sentinel and literal
ANDI masks. It does not repair the apparent CLx/CSx/Qxx mismatch described by
the comments. Monitor GETLIN and CPU/pointer semantics remain required services.
The fixture supplies ordinary 7-bit pointers, synthetic call return PCs and
relocated literals; it uses raw IRAN over the same private SEED as TELL.

Thirty-one new tests cover every extracted node, phrase choices, aliases, live
scratch/pointer effects, seed/output vectors, suspension and partial failure.
Raw TELL replies and autonomous broadcasts now compose real speech and message
queues, including eighteen-bit broadcast counter aliases. Full archive/type/test
verification passes 3553 tests. Only the unchanged archive was used. Raw delivery
and broader caller adoption, production compiler/CPU/monitor/literal policies,
final POINTS, statistics, complete sessions, Telnet and original-executable parity
remain unfinished.

## D-117 — Deliver messages through live OUTMSG statements

Added OUTMSG.FOR:24-54 over caller-owned I/K words and the linked OMLOCL buffer.
It composes raw GETMSG, OUT, ODISP, OUT2C and CRLF in the shared runtime fixture.
WHO is passed by address, DISPFR remains the actual ODISP argument, and recipient
symbols come from NAMES(I,3). No cached ship roster or decoded string replaces
those memory reads. Signed MOD and expression/DO evaluation remain required
compiler services.

The body separately clears DBITS and DISPFR at each iteration and tests counts
for zero, not positivity. GETMSG consumes a record before gag filtering. On a
GETMSG miss, DISPFR is zero and the unchanged OMLOCL buffer is printed; this
includes negative/stale notification counts. Queue removal or output failures
retain their partial effects without rollback. The recipient loop rereads DBITS
and K and prints only its ten source slots without clipping queue metadata.

Thirty-four tests cover exact output, aliases, live reads, suspension and
failures, plus human TELL and seeded ROMSPK through queue creation and terminal
delivery. Romulan ODISP literals are bound from the extracted source tables.
Full archive/type/test verification passes 3587 tests. Only the unchanged archive
was used. Complete raw GETCMD and broader caller adoption, production compiler/
CPU/monitor/literal contracts, final POINTS, statistics, sessions, Telnet and
original-executable parity remain unfinished.

## D-118 — Compose GETCMD and PROMPT over live source state

Added GETCMD.FOR:25-133 and PROMPT.FOR:36-52 statement bodies. CMD is a supplied
address, command lookup reads actual ISAYDO words through EQUAL, and TX/I locals
remain caller-owned memory. Raw TTYON, DMPBUF, PAUSE, INPUT, GTKN, CLEAR, ZAPLOK,
OUTMSG and terminal output compose with ENDGAM and FREE. CHKSEQ and PRGNAM retain
the selected build's immediate POPJ behavior; disabled DSHIP remains disabled.

Notification calls precede timing and input. PASFLG uses the required logical
policy. Idle accounting wraps COMKNT at 30*NUMPLY, while accepted input does not.
Already-set CCFLG/HUNGUP takes idle bookkeeping; hangup observed after INPUT
instead forces the QUIT token. Ctrl-C after GTKN is rejected in red condition.
Arithmetic IF's negative CMD branch remains an ambiguity path.

Death copies identity fields before POINTS, then reads shared TOTAL(1) and passes
the TX addresses plus actual WHO to statistics. FREE precedes WHO clearing;
failure retains WHO. PROMPT rechecks life damage after numeric output and defers
the shield compound condition to the compiler service. Source thresholds and
the octal packed beep word are retained.

Thirty-seven tests cover input, notification, timing, prompt and death paths,
including raw TELL→GETCMD→OUTMSG and actual FREE. Full archive/type/test checks
pass 3624 tests. OUTHIT and statistics remain required raw dependencies; final
POINTS and zero-argument CCTRAP need explicit compiler/runtime resolution. The
fixture only binds CCTRAP when a test supplies its missing argument policy.
Only the unchanged archive was used. Production CPU/monitor/literal contracts,
complete sessions, Telnet and original-executable parity remain unfinished.

## D-119 — Deliver combat notifications through OUTHIT statements

Added OUTHIT.FOR:33-288 across all fifteen computed-GOTO event types. It clears
the seventeen contiguous hit words through raw BLKSET, consumes records through
raw GETHIT, and formats actual fields through ODISP, ODEC/OFLT/OSFLT, ODEV,
character/string output and PRLOC. GETCMD now invokes this body for hit delivery.
Caller-owned NPLCF/NPLCT words retain the source's class assignment timing.

Output calls separate later reads of IWHAT, OFLG, coordinates, device damage,
destruction flags and WHO. The body preserves those reads and the source's
arithmetic format branches, forced-short target coordinates, radio threshold
strictly above KCRIT, critical-base continuation and destruction ordering.
Extracted object/device tables supply the raw formatter fixtures.

The negative-count test initially waited for behavior GETHIT does not provide.
Reinspection confirmed its miss path clears hit fields without repairing HITFLG.
A negative count therefore keeps decrementing and OUTHIT keeps looping until
subsequent machine/state behavior changes that condition. The test now observes
three suspended iterations; no host count clamp or loop termination is added.
Repeated CRLF calls still follow the existing terminal blank-line policy.

Seventy-two new tests include all fifteen events at three verbosity settings
using shared source-derived byte fixtures, plus live-state, alias, failure and
queue/GETCMD compositions. Full archive/type/test verification passes 3696 tests.
Only the unchanged archive was used. Broader producer/caller adoption, raw
statistics, final POINTS/CCTRAP, production compiler/CPU/POINT/literal/monitor
contracts, complete sessions, Telnet and original-executable parity remain
unfinished.

## D-120 — Execute statistics updates over actual words and registers

Added UPDCAP and UPDSTA from WARMAC.MAC:5589-5668 and 5694-5882. These routines
use the mapped 640-word STABUF, AC registers, live argument descriptors and
SAVE/RESTOR stack. They compose extracted file descriptors, raw OPEN, LOCK/UNLO,
ODEC and direct monitor output. GETCMD and ENDGAM now reach raw UPDSTA before
actual FREE. The older component routines remain separately tested algorithms.

No host record snapshot replaces later reads: ranking captures the score but
rereads elapsed at ties, insertion rereads caller fields after DATE, and mission
announcements reload the ship argument separately. Physical negative indices
can alias other buffer words or ACs. Insertion retains word eight and shifts
lower duplicate identities. Failed operations leave the source's partial state,
held locks or saved stack words; no automatic transaction rollback is added.

Literal JRST .+1 continuations are required assembler policies. The fixture
selects their intended continuation explicitly, including free-user I/O after
failed OPEN. Missing monitor symbols, FILE/DATE/OUTSTR effects and CPU overflow
are still fixture contracts. The unguarded ODEC in UPDCAP reaches the existing
minimum-integer MOVM limitation even when HUNGUP suppresses character output.
This is not repaired with host arithmetic or a hangup early return.

Source review also corrected the earlier component's middle-placement final
OUTSTR: WARMAC:5815-5821 has no new HUNGUP guard after the numeric output. Tests
change HUNGUP during the preceding text and verify the unguarded tail in both
ports. The fixture installs extracted descriptors, preserving source channel 6,
protection and PPN words rather than replacing them with a host file format.

Seventy-one new tests bring full archive/type/test verification to 3767 tests.
Only the supplied archive was used. Final POINTS/CCTRAP resolution, broader
startup/command adoption, raw statistics display/clearing, production compiler/
CPU/monitor/literal contracts, persistent storage, full sessions, Telnet and
original-executable parity remain unfinished.

## D-121 — Render the honor roll through original register and output paths

Added SHOSTA, SHOPAY, DOFED, DOEMP and DSPSTA from WARMAC.MAC:5885-6101,
and expanded the local DACON macro at 34-44/6080. These bodies share the actual
STABUF with UPDSTA/UPDCAP and compose raw OPEN, OSTR, OCHR, OSIX, OOCT, ODEC,
OSTBX, O2DG and CRLF. Pre-game HONORROLL now reaches this path through the raw
input/identity composition, with an explicit compiler true-word fixture.

No rendered host row replaces sequential reads. The routines preserve current
ARG, X4, loop counter X3, table heads, LE.NAM, FREE/HUNGUP/CCFLG and shared date
words across output and monitor calls. DSPSTA saves/restores actual X1-X4 words;
errors or suspension retain the partial output and source stack state. The two
SIXBIT file-name comparison operands have separate bindings, permitting either
pooled or distinct assembler literals rather than imposing a pooling decision.

The source's mismatched header and row argument tests are retained. Credits add
octal 500 (decimal 320), then divide by 1000. Runtime adds 30000 before division
by 60000. DACON uses two T1/T2 divisions, individual stores and separate +1964 /
-2000 instructions; it does not use JavaScript Date. Tests preserve negative
year output and aliases that change the later dividend. Missing CPU semantics
and literal-JRST continuations remain required policies.

Seventy-three new tests bring full archive/type/test verification to 3840 tests.
They include raw UPDSTA → SHOSTA and PREGAM → HONORROLL compositions, six exact
header/width combinations, live filename changes, Ctrl-C timing, register/memory
aliases and partial failures. Only the supplied archive was consulted. Raw
STAZAP/GRIPE adoption, broader startup/command composition, final POINTS/CCTRAP,
production compiler/CPU/monitor/literal contracts, persistence, full sessions,
Telnet and original-executable parity remain unfinished.

## D-122 — Clear statistics through the raw logging path

Added STAZAP/STZAP0/STZAPX from WARMAC.MAC:6185-6223. It locks STABUF rather
than STAUPD, sets ADDRCK,
calls GRIPE and clears words 639 through 1 using live T1 and SOJG. Word zero
is whatever GRIPE left there, not a saved copy of the original serial. The
normal/free output calls, error text, unlock, final text and ADDRCK clear retain
their original order without host rollback or conditional log-success checks.

The shared runtime now composes the existing raw GRIPE, ESHP/PSHP, OSTS, raw
SHOSTA, GRIP.A/OCT.O, INLI, string output, OGCH, OPEN/CLOSE and GRIP.2–8. Packed
IDPB deposits use actual memory; old log words are read and prepended intact.
Header fields use actual COMMON/JOBSTA words. Pre-game GRIPE and privileged
*ZAP now call this composition. Tests cover the source permission check; no new
runtime authorization rule is imposed on the STAZAP routine itself.

A twenty-line integration test exposed a missing remembered terminal descriptor
in the fixture's initial OBFLB. Supplying that relocated startup word allows the
original SETO swaps to return line-limit warnings to the terminal. No GRIPE
repair was inserted. The fixture uses a declared heap, ordinary packed pointers,
source-extracted descriptors and explicit monitor values/effects. UNDAT/UNTIM,
CORE, busy/HIBER behavior and production file persistence remain unresolved
runtime policies rather than inferred host defaults.

Forty-five new tests bring full archive/type/test verification to 3885 tests.
They verify serial replacement by the final statistics read, retained buffer
aliases and locks on faults, continued clearing after returning log failures,
old-file preservation, output routing, source line-limit warnings, diagnostics
and pre-game composition. Only the supplied archive was used. Broader startup,
commands and APR adoption, final POINTS/CCTRAP, production compiler/CPU/monitor/
literal contracts, persistence, full sessions, Telnet and original-executable
parity remain unfinished.

## D-123 — Compose fatal capture, logging and DECWAR cleanup

Added DECWAR.FOR:291-350 as fatal/leave statements over actual private local
and COMMON words. Fatal entry performs both CRLF calls, assigns IRAN(5) to I,
then reads I for the computed GOTO, including fallthrough to message 5001.
The five FORTRAN stories retain their extracted text and raw OUT behavior;
WARMAC's distinct FMSGS table does not replace them.

The shared runtime now binds APRSET/APRTRP to full raw GRIPE, GRIP.A/OCT.O,
packed log growth and file cleanup. The fixture declares ordinary BLT effects
on AC0 and a PUSHJ/POPJ frame on the replacement P stack. Capture precedes
that frame; diagnostics use saved original P. Only after GRIPE returns does
APR restore normal P and read the current FTLERR. Zero FTLERR retains the
source's post-GRIPE AC0 indirection and separate [[5]] descriptor; no missing
random call or FMSGS indexing is invented.

Both exit entries call CCTRAP, copy identity fields in source order using live
WHO, sample ETIM, assign TXWHY, apply the compiler's logical test to ADDRCK,
compute the team index, call POINTS, reread TOTAL, call UPDSTA and FREE, clear
WHO and call EXIT. No identity snapshot, nonzero-to-boolean coercion, rollback
or host-exception-to-APR conversion is introduced. A positive ADDRCK is false
under the declared sign-test fixture; another explicitly supplied logical
policy can differ. Production logical semantics remain unresolved.

Thirty new tests bring full verification to 3915 tests. They compose fatal
logging through statistics and ship release, raw integer RNG, source output
bytes, clock sampling, and final POINTS under a selected DO-continuation fixture.
They also cover log error/cancellation, partial failures and live state changes.
Only the supplied archive was consulted. Real trap/PC/flags delivery, compiler
locals/literals/calls, final POINTS and zero-argument CCTRAP policy, complete
startup/commands/sessions, persistent monitor files, Telnet and original-
executable differential parity remain unfinished.

## D-124 — Execute the main loop and QUIT over actual words

Added DECWAR.FOR:77-250 as main-loop, dispatch and QUIT statements. N is the
actual by-reference GETCMD word. PLAYER is assigned through the compiler
service before the GETCMD profiling boundary; WHO and N are read after its
TIMOUT. WHO=0 returns to the label-1 caller without clearing N or settings.
Computed GOTO outside 1..33 retains source fallthrough to BASES.

Dispatch preserves all source call arguments, alternate label 49 and the exact
six-character profiling strings, including trailing spaces. The eight
alternate-return commands skip trailing TIMOUT and turn/movement work when
transferring to 49. Command bodies own PTIME stores; this loop does not apply a
host pause result. Movement's two-label IF receives a live ALIVE(WHO) accessor
only after normal return and TIMOUT. Column-D execution and both two-label IF
interpretations remain required compiler policies, with explicit test choices.

QUIT retains HUNGUP's logical test, raw OUT(SURE00,0), CCFLG clearing, CLEAR,
GTKN and EQUAL in that order. CLEAR discards the current command tail and
queued monitor input; confirmation is scheduled afterward. Raw EQUAL returns
-1 for a prefix and -2 for a full match; neither is normalized before the
compiler branch service. There is no token-type or second hangup/control test.
The exit calls the same actual-local cleanup added in D-123.

The new main fixture binds nine existing non-timed command bodies plus MOVE,
IMPULS and REPAIR, using actual input/output and memory. Turn accounting shares the
DECWAR I word with fatal entry. Automatic REPAIR, stardates, life-support
output and score commits use existing statement bodies; remaining defense and
command adapters fail explicitly when reached. Existing independent defense
compositions are not misrepresented as complete main-loop adoption.

Thirty-six new tests bring archive/type/test verification to 3951 tests. They
include RADIO/POINTS/QUIT compound input, GRIPE then QUIT, normal and alternate
MOVE/IMPULS/REPAIR, GETCMD death and hangup, source-order profiling, partial
failures, live state and explicit command-to-APR transfer. Only the supplied
archive was consulted. Production compiler/numeric/CPU/monitor/literal and
trap contracts, full startup and command/defense adoption, persistence,
sessions, Telnet and original-executable differential parity remain unfinished.

## D-125 — Adopt defenses in the main timed-command path

Bound the existing BASPHA.FOR:33-87, PLNATK.FOR:34-93 and BASBLD.FOR:33-45
statement bodies into DECWAR's main turn sequence at 254-274. Each routine has
separate explicit compiler-local storage in the shared address space. Calls
use actual board/distance entries, PHADAM/PWR, PHAROM and PRIDIS, then raw
MAKHIT on the same queue used by GETCMD/OUTHIT and FREE. The earlier component
HitQueue producer is not used by this main defense binding.

Integer draws for neutral selection, PHAROM and critical PHADAM now use raw
IRAN and the same physical SEED as other composed callers. REAL arithmetic
and floating RAN remain the existing explicit rational/test-draw contracts;
no PDP-10 floating codec, FSC policy or full random schedule is claimed.
Expression temporaries, argument order, logical and compound evaluation,
ordinary DO and POINT semantics remain declared fixture choices.

The original distinctions survive composition: bases divide power by NUMPLY;
planets divide player power but not Romulan power. Planet source condition
metadata is not synthesized to match bases. Raw GETHIT decodes zero condition
bits as -1. Base/ship output uses the source ODISP symbols and tenths formatter.
BASBLD performs its first population division before any player-specific
replacement and preserves division failures after already-published attacks.

Twenty-two new tests bring full verification to 3973 tests. Main REPAIR runs
through both defenses and rebuilding, then the next GETCMD delivers their hits
before QUIT. Lethal base fire reaches statistics/FREE and pre-game return.
Further tests exercise observer delivery, critical and Romulan damage, seed
order, eager versus short-circuit compound evaluation, queue-notification
suspension, and partial publication/rebuild failures. Only supplied source was
consulted. Main ROMDRV, remaining commands/startup, production numeric/compiler/
CPU/monitor/literal contracts, persistence, sessions, Telnet and original-
executable differential parity remain unfinished.

## D-126 — Run ROMDRV main statements over live local words

Added ROMDRV.FOR:40-208 as a resumable statement body with actual compiler
locals, caller PHIT/ID addresses and the shared CHKOUT block. Main entry never
writes PHIT; phasers assign PDIST to ID. When the caller aliases them, that
store remains visible. ROMDRV's V1/H1 are CHECK's H1/V1 and are passed directly
to ROMTOR as direction actuals. Coordinate variable arguments preserve their
addresses; computed expressions use explicit fixture temporaries.

The computed target branch is selected once, while IPLACE and each coordinate
remain live across individual stores. Movement retains the six sequential
coordinate tests, warp-four limit, original collision detours and dummy INGAL
coordinate 5. Deadlines retain strict comparisons and computed-GOTO fallthrough.
The post-hit clock is read before the recharge expression reads SLWEST under
the declared evaluation policy. No exception cleanup or extra profiling return
is inserted after a failing call.

The main fixture composes actual CHECK, raw SETDSP/DISP/INGAL/PDIST, PHADAM/PWR/
BASKIL, PRIDIS/MAKHIT, elapsed clocks, original movement output and all three
extra defenses. Full-base help and destroyed-base notices retain NOMSG masking
and source metadata. Rebuilding can change a surviving base after its hit
record is already published. Integer draws share raw SEED; floating arithmetic
and RAN remain explicit existing fixture contracts.

DIST, PLACE, ROMSTR and ROMTOR still fail explicitly when reached without a
supplied binding in this shared main runtime. Tests substitute those services
where necessary to verify this caller; prior component compositions do not
count as completed statement adoption. Compiler evaluation, logical encoding,
ordinary DO, column-D lines, literal storage and CPU behavior remain explicit
policies, not inferred PDP-10 equivalence.

Twenty-eight new tests bring full archive/type/test verification to 4001 tests.
The preceding 3973-test baseline also passed. Only supplied source was used.
Those four Romulan bindings, remaining commands/startup, production numeric/
compiler/CPU/monitor/literal contracts, persistent storage, sessions, Telnet
and original-executable differential verification remain unfinished.

## D-127 — Adopt DIST and ROMSTR in the shared main runtime

Added DIST.FOR:24-86 and ROMSTR.FOR:24-39 as resumable statement bodies.
DISTLC uses its linked 16-word storage at address 922; neither routine creates
a host candidate list or copies the caller's arguments. Compiler-local words
are explicitly allocated by the fixture. DIST calls raw BLKSET for the four Z
words before separately saving RV and RH. Prior V/H/IV words survive searches.

Candidate arithmetic evaluates each source operand through compiler services
and compares the signed 36-bit result before saving a candidate. Federation
ALIVE and Klingon nonzero-position gates remain different. Ships require a
positive DISP result; bases require a nonzero result. Within-class ties retain
the first slot; cross-class AND/OR evaluation remains a compiler policy and
draws from the same raw IRAN SEED as the rest of the main runtime. PDIST uses
actual selected coordinate addresses after IP is stored, preserving IP/NP
aliases that can select adjacent DISTLC columns.

ROMSTR separately captures four bounds, scans using raw DISPC and writes IV
before IH. These writes can change aliased loop words. Row and column DO
bounds/entry are explicit compiler policies; ordinary 36-bit advancement is
modeled, not inferred full compiler execution. The original calls and stores
remain resumable with partial state intact after failures.

Main ROMDRV now calls these statement bodies directly. Tests run actual
selection through CHECK movement, a second search, PHADAM and the shared hit
queue, including turn accounting. Actual star retargeting produces shared
CHKOUT directions before the still-required ROMTOR binding. PLACE also
remains required in this main fixture. No successful placeholder is supplied
for either gap.

Twenty-seven new tests bring full verification to 4028 tests, strict TypeScript
and immutable archive/generated checks; the 4001-test baseline also passed.
Only supplied source was consulted. Production numeric/compiler/CPU/monitor
contracts, remaining startup and commands, persistent storage, full sessions,
Telnet and original-executable differential verification remain unfinished.

## D-128 — Adopt PLACE with actual arguments and raw random draws

Added PLACE.FOR:26-59 as a resumable statement body over actual OBJECT/N/V/H
and K/I/PTEAM words. N's DO bound is captured at entry; coordinate assignments
and rejected candidates remain visible. Source GOTO 100 retries within the
same K without an attempt limit. Successful placements use the live OBJECT
word unchanged; the commented-out code increment remains unexecuted.

Ship classification and PTEAM independently evaluate OBJECT/100. Integer
division, expression/assignment order, logical and compound conditions and
DO entry are explicit compiler services. Tests retain coordinate/count/object
aliases, negative division and physical out-of-range team-word access. The
fixture chooses ordinary integer arithmetic and DO advancement rather than
claiming the missing compiler's complete behavior.

Territorial checks retain the supplied source's distinctions: a positive
enemy base count triggers all KNBASE slots without a strength check; raw LDIS
uses inclusive radius four. The planet path requires both population and
capture counts, but compares raw DISPC with PTEAM rather than decoding planet
ownership. Its matching objects use inclusive radius two. These behaviors
are not corrected to match the comments' apparent intent.

The main fixture now binds PLACE through raw IRAN, DISP/DISPC, LDIS and SETDSP.
Main ROMDRV shares the same SEED across its creation test, placement, energy
and speech tests. Tests compose appearance publication with DIST and either
distant return or immediate PHADAM/defenses. Placement keeps display code 501;
the appearance message still names 500. Partial coordinate writes survive a
failed draw before ROM/EROM initialization.

Twenty-four new tests bring full verification to 4052 tests, strict TypeScript
and immutable archive/generated checks. The preceding 4028-test baseline also
passed. Only supplied source was used. ROMTOR statement adoption, full SETUP/
startup and commands, production numeric/compiler/CPU/monitor contracts,
persistent storage, sessions, Telnet and original-executable differential
verification remain unfinished.

## D-129 — Adopt ROMTOR statements and shared direction aliases

Added ROMTOR.FOR:25-139 as a resumable statement body over actual locals,
IV1/IH1 arguments and CHKOUT. Deflection D is an opaque REAL word; compiler
services evaluate floating expressions, INT, integer arithmetic, assignments,
compound conditions and DO bounds. The shared fixture reuses its explicit
rational REAL/RAN contract and raw IRAN SEED without claiming PDP-10 floating
or complete compiler equivalence.

Misfire order follows the source: every iteration first draws its ordinary
deflection, even when a previous misfire then exits. A newly misfiring shot
still runs. Each shot accumulates pause before CHECK; zero collision advances
without retargeting, while a nonzero collision consumes ARAN. Retargeting also
runs after the third hit. ROMTOR passes IDUM twice to TORDAM and rereads source
fields after calls. Actual CHECK can overwrite IV1/IH1 through CHKOUT aliases
before calculating the direction; no copied vector replaces that behavior.

The main binding composes CHECK, TORDAM/JUMP/BASKIL, TRCOFF, DIST/ROMSTR,
PRIDIS/MAKHIT/GETHIT/OUTHIT, raw board entries, planet locks and ETIM. Base help
and destruction retain unset DISPFR and NOMSG masking. PRIDIS excludes ALIVE>0,
so ALIVE=0 slots can still receive broad notices. Planet lock failure advances
without unlock, publication or retargeting. Collision code and ARAN are read
again after the lock. Stale KLFLG can still enter planet removal.

SNOVA and PLNRMV remain required statement bindings in this main fixture.
Their caller paths are ported and tested with explicit substitutes or expected
required-binding errors. A nova that clears ROM returns before recharge;
failed planet removal retains the cleared board cell and penalty while locked.
No cleanup or successful placeholder is inserted for either gap.

Twenty-four new tests bring verification to 4076 tests, strict TypeScript and
immutable archive/generated checks. The preceding 4052-test baseline passed.
Tests include full three-shot damage/displacement/retargeting, raw terminal
bytes and the main turn through actual aliased ROMTOR. Only supplied source
was consulted. Nova/removal adoption, remaining startup/commands, production
numeric/compiler/CPU/monitor contracts, persistence, full sessions, Telnet
and original-executable differential verification remain unfinished.

## D-130 — Adopt PLNRMV and the KILHGH end-game boundary

Added PLNRMV.FOR:25-58 as a statement body over actual I/PTEAM/J words. The
three rejection checks precede any mutation. Captured counts are decremented
before BASKIL receives the original team address. Four independent BLKMOV
calls reevaluate I and NPLNET; the raw forward-copy binding preserves overlap
and the unchanged old final row. After count decrement, SETDSP subtracts one
from the actual existing display code. The caller remains responsible for
clearing the destroyed cell and holding the planet lock.

Tests retain argument aliases, live subscript changes and partial column
copies. BLKMOV/call expression order, compiler DO entry and ordinary BLT
behavior remain explicit fixture policies; exceptional BLT extents are not
silently repaired. Existing BASKIL keeps its NUMCAP<=0 undocking quirk.

Main ROMTOR now calls this body, which calls actual ENDGAM. Added KILHGH's
WARMAC.MAC:4217-4243 instruction sequence to support that boundary: any nonzero
DEAD returns; OPEN/LOOKUP/RENAME operate on live registers; P.PPN is reread
before RENAME. SETZB T3's omitted address is a required CPU effect, with the
fixture explicitly selecting address zero and exposing AC0's clear. Loader
P.DEV/P.NAM/P.PPN and literals are supplied words. Monitor outcomes are
required; no successful file operation or real segment removal is assumed.

KILHGH failures follow WARN's two HUNGUP checks and exact source output.
Success calls OSTR before setting DEAD and flushes afterward. A warning return
still lets ENDGAM proceed. Tests reach final POINTS, raw statistics and FREE
with an explicit final-loop policy and nonzero source score denominators.
ROMTOR's final-planet ENDGAM transfer skips its later unlock, publication and
recharge, leaving all prior removal effects intact.

Thirty-three new tests bring verification to 4109 tests, strict TypeScript and
immutable archive/generated checks; the 4076-test baseline also passed. Only
supplied source was consulted. SNOVA adoption, remaining startup/commands,
production compiler/numeric/CPU/monitor and loader contracts, persistence,
full sessions, Telnet and original-executable differential parity remain
unfinished.

## D-131 — Close the main supernova dependency

To advance the complete command/turn composition, adopted SNOVA.FOR:25-75
and NOVA.FOR:25-179 as resumable statement bodies using the existing numeric
service contract. This closes the missing SNOVA call in the main ROMTOR test
runtime. Existing isolated ports remain separate evidence; no production
server or complete session binding is implied.

SNOVA now uses the generated physical SNLOCL layout and shared CHKOUT words.
Only stack pointers reset, after the initial star clear. Objects and stars
are popped LIFO; victim identities are reread from the board, and integer
displacements are assigned to opaque REAL words before the object pointer
decrements. The source cap of 29 remains despite the 80-row star declaration.
Compiler OR evaluation can change IRAN consumption and is an explicit service.

NOVA composes existing JUMP, TRCOFF, BASKIL, PLNRMV and ENDGAM bodies with
raw board, IRAN, PRIDIS, MAKHIT and OUTHIT. It retains its distinct damage
formulas, direct team kill scores, inactive random Romulan kill, and notification
ordering. Planet builds and ownership are reread after notification. Unlike
ROMTOR's direct removal path, NOVA publishes the planet hit before PLNRMV can
transfer to ENDGAM; neither path adds an unlock after a nonreturning call.

The shared binding uses explicitly selected rational REAL/RAN, sign-logical,
ordinary DO and CPU, and left-first/RHS-first compiler policies. Subtraction
remains subtraction at the numeric service boundary. These are test contracts,
not inferred missing compiler or monitor implementations.

The 4109-test baseline passed; 34 new tests bring the full check to 4143.
Only the supplied game source was consulted. Next is the main REPAIR/DAMAGE
dependency and remaining command slots, followed by a development session
entry point, shared-world lifecycle and Telnet under the unchanged parity gates.

## D-132 — Reuse reports in the shared command runtime

Connected DAMA/DAMAGES and REPAIR's DAMAGE call to the existing DAMAGE statement
body rather than creating another implementation. A separate compiler temporary
carries NTOKEN+1. The shared DATA-loaded DEVICE words, ODEV tables, EQUAL, board
and output runtime remain the report's dependencies. STATUS now exposes its
existing binding through the fixture hierarchy and main slot 23. TIME uses the
existing statement body with shared MSTIME, explicitly scheduled RUNTIM, raw
clock argument writes and OTIM, in both main and pre-game dispatch.

Twenty-one new tests verify exact three-verbosity output, device prefixes,
numeric/ALL repair selection, report-before-final-clock and automatic repair,
partial failures, NOVA-created damage, compound RADIO/STATUS and clock behavior.
The 4143-test baseline and the final 4164-test archive/type/test check passed.
These connections advance command composition without changing source behavior
or resolving missing production compiler/monitor contracts. DOCK/STATUS is next.

## D-133 — Connect docking and shield controls

Connected the existing DOCK statement body to the main dispatcher and shared
STATUS, clocks, board/distance, repair and turn services. Added SHIELD.FOR:29-104
as an actual-word statement body: saved SENRGY and current WHO/token words are
reread across input/output calls. The shared binding declares integer arithmetic,
negation, literal and expression/store policies and invokes actual TRCOFF.

Eight DOCK tests retain supplier accumulation, double hull repair, alternate
returns, negative pause, report timing and nova-destroyed suppliers. Eighteen
SHIELD tests retain inline/prompted token positions, integer scaling and loss,
confirmation, cap ordering, the strict critical threshold, repeated raising costs,
raw tractor release and partial output failure. A reusable main command fixture
was extracted without changing its setup. Full verification passes 4190 tests
from the prior 4164 checkpoint. Source behavior and parity gates are unchanged.

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


## D-145–D-151 — Startup composition and authorized numeric evidence

RAN and IRAN now share the original per-session SEED. Full SETUP and application
entry execute through the shared runtime; TYPE callers pass actual argument
addresses rather than literal values mistaken for addresses. The startup banner
continues to display the archived text even though VERSIO is assigned 24.

The user authorized CPU/compiler manuals only. References, editions and page
numbers are recorded in platform-manuals.md. The archive alone supplies the game.
Where assembly explicitly selects an instruction (RAN FSC, PWR FMPR and ANUM
FLTR/FDV/FAD/FMPRI), implement that instruction's documented supported domain.
Use BigInt intermediates and actual floating words, preserving each rounding and
truncation boundary. A parser input of 1.25 differs from the nearest constant
encoding; this is preserved and tested.

FORTRAN expression services select source-order, rounded-single arithmetic and
nearest decimal literals explicitly for native numeric integration tests. This
is not proof of the unidentified original compiler's expression rearrangement or
instruction choices. Default rational fixture tests remain clearly separate.
Arithmetic flags and exceptional continuation are explicit, rather than replaced
with host NaN/Infinity or fabricated zero. Initialized POINTS loops select the
documented V5 private counter; illegal final entry remains unresolved.


## D-152–D-154 — Modern session host and shared resource services

Node TCP sockets deliver bytes to the existing Telnet codec, then to the source
character-input routines. Output travels from the source OUTCHR service through
Telnet NVT framing; host exceptions and logs are kept out of game output. The
D-003 option-refusal policy remains a modern boundary, not historical monitor
negotiation parity. Input fragmentation, CR-NUL framing, startup and two-player
admission are exercised on real localhost sockets.

SharedGameWorld attaches the existing HISEG, TIMERS and hit/message queue regions
at their source/map addresses. Only the first loader contributes initial words;
new jobs retain their own LOWSEG, compiler locals, ACs, stacks and SEED. This
models shared data using one Node process; it does not emulate PDP-10 scheduling
between every machine instruction. The generator's explicit waits are scheduling
boundaries. The world is currently in memory, not persisted.

ResourceLocks supplies named ownership and FIFO pending grants. WARMAC LOCK./UNLO
(4476–4565, 4621–4651) still determine remembered locks, busy waits, diagnostics,
flags and cancellation. The host cancels pending claims on DEQ and releases all
owned/pending resources when a job ends, without manufacturing ship cleanup.
WARMAC's grant handler HAVENQ (6491–6498) is commented out with the CIS changes.
The host explicitly supplies its intended HV.LOK=-1 plus wake action as a modern
service; this is not enabled original executable code. FIFO fairness is also a
host choice. A grant during the first wait preserves the subsequent five-second
wait in source; no shortcut is inserted. The selected UCT rate of three ticks per
second is inferred from LOCK's `4*3` and `about 4 seconds` comment; monitor units
and wake semantics remain unverified.

The live factory remains an integration fixture. It selects milliseconds since
UTC midnight for DAYTIM/MSTIME, zero RUNTIM, synthetic job/name/PPN and trap
addresses, omitted column-D code, the existing zero-trip reversed-LIST diagnostic
policy, native rounded numeric services and literal ANUM instructions. These
choices do not prove the unidentified original compiler/monitor's behavior.
Normal final POINTS entry remains unresolved rather than silently returning zero.
Forced server close cancels suspended jobs; it is not a claim that QUIT/FREE
completed. No modern explanatory text is added to original terminal output.


## D-155–D-156 — Inspectable development host and session CPU accounting

`npm run dev:telnet` is an explicitly labeled development entry using the
composed fixture. It binds localhost, logs lifecycle/failures outside the game
terminal and keeps failure paths visible. It neither certifies a faithful release
nor replaces the release goal. A child-process test verifies real startup,
admission, STATUS and signal shutdown. Disconnect separately confirms the
unresolved final POINTS error before FREE; source ship words remain unchanged.
CHKSEQ's unconditional return (WARMAC 3677) is retained.

TIME's copied scheduled callbacks are now bound to the live host clock. The
preliminary zero RUNTIM selection from D-152–D-154 is replaced with per-session
CPU accounting, including admission's baseline. The host samples process CPU
microseconds around synchronous generator/control execution; current work is
included when RUNTIM is called from inside a continuation. Waiting and other
jobs' continuations are excluded. Samples can include Node background work;
this is an explicit host approximation, not historical CPU speed or instruction
cost. Millisecond conversion truncates. UTC-midnight DAYTIM and source ETIM
wrap handling remain separate from CPU runtime.

The live movement dispatcher now selects V5 negative-true logical/two-label IF
behavior already documented in platform-manuals.md. Source statement order is
unchanged. Live command tests cover TIME, shield changes and MOVE through actual
input, board updates, unlock and automatic turn accounting.


## D-157 — Shared and persistent source statistics words

Added WordFiles, with memory and disk implementations, and a statistics monitor
adapter for the original descriptors and 640-word IOWD transfers. Filenames come
from the loaded SIXBIT descriptor words (WARMAC 875–923). OPEN, UPDCAP, UPDSTA,
SHOSTA and STAZAP retain their ported source control flow; live sessions now use
one world-owned store rather than separate fixture arrays.

The disk container is explicitly modern: DECWAR-WORDS-1 header followed by one
nine-hex-digit raw word per line. Signed interpretation happens on read; no JSON
number or floating conversion loses bits. Invalid word widths, framing or the
wrong statistics word count stop with a host error. Missing read files return
OPEN failure, so source creation/clearing logic remains responsible. Successful
reads select negative LE.PPN for the source INPUT guard; -1 is an explicit monitor
result policy, not a recovered original FILOP result. A write OPEN does not
truncate an old file: OUTPUT atomically replaces the complete file after flushing
the temporary file. This avoids a partial host write and is a documented modern
file-service decision. Commit occurs at OUTPUT, not after simulated CLOSE.

The standalone host uses disk storage by default (`--data data`). One host owns
that directory through an exclusive `.host.lock`; in-process ENQ alone cannot
coordinate a second process. Normal shutdown removes its own lock. Crash locks
are left for inspection rather than removed based on age. File replacement is
atomic within a filesystem, but directory-metadata survival after power loss is
not claimed. The active galaxy itself is not saved; new worlds read and increment
the original game serial from statistics during commissioning.

DATE T3 now uses the UTC calendar encoded as the inverse of WARMAC DACON
(34–44). The source decoder still subtracts 2000 and keeps its original formatting,
including years outside two digits. Calendar selection is a host policy, not
historical timezone evidence. This replaces the live fixture's fixed date word.
Tests round-trip 1964, leap-day 2000, 2026 and 2100 through actual DACON.

Live tests reopen disk statistics in a fresh world and verify game #1→#2 and
Lexington mission #1→#2. Two connected captains preserve both commission counts.
A corrupt-length file stops admission without being overwritten. Final POINTS
and QUIT/FREE remain unresolved; persistent commission counts are not proof that
end-of-mission scoring or every file path is complete.


## D-158 — Persistent GRIPE file boundary

The live GRIPE path now reads and writes the world WordFiles store. The original
GRIP.3–GRIP.8 code (WARMAC 4922–4976) still builds the packed report, allocates
space for old words, constructs the combined IOWD, issues USETO 1, writes and
cleans up. The host transfers exact words; it does not concatenate decoded text
or remove trailing padding. Filenames come from OPEN's actual LE.NAM/LE.EXT.

The selected host file-open policy grants one job exclusive ownership until
CLOSE or job teardown. An occupied file produces the caller-supplied busy code,
so original warning/3000 ms HIBER/retry logic executes. The host adapts that HIBER
operand to a non-input delay; ordinary monitor wakes can still resume it. The
file length is represented in the negative 18-bit count consumed by source;
lengths outside that supported descriptor domain fail explicitly. New files have
zero old length. Source USETO 1 selects complete-file replacement at OUTPUT,
using the same atomic modern word-file container as statistics. Cleanup without
an open file is harmless (e.g. empty first EOF).

Live tests preserve the first report's exact words as the tail of the second,
reopen the stored file, verify ship restoration/no turn charge, execute busy
retry after an explicit monitor wake and confirm empty EOF creates no file.
File ownership is also released on failed/cancelled job teardown. GRIPE's header
UNDAT/UNTIM and allocator bounds still retain explicit fixture policies; this
persistence step is not a claim of full monitor or terminal parity.


## D-159 — Explicit private CORE allocation policy

The live runtime now uses a separate allocation window at octal 240000 through
377777, below shared memory. These are chosen host-loader addresses, not recovered
original compiler addresses. The old synthetic composition addresses remain
separate. CORE rounds the requested last address to a 512-word page, based on the
source CLOSE mask (WARMAC 1495–1512); fresh/reallocated pages are zero-filled.
Shrinking removes the pages from the address space. Failed requests leave the
allocation and job bound unchanged; no resizing can overlap another region.

Source OGCH/GRIPE continue deciding when to request growth and release it. Live
callbacks now allocate actual words instead of updating JBREL within a fixed test
mapping. A large old report is prepended intact; an oversized request returns
CORE failure so original warning/cleanup runs without overwriting the old file.
This supports the exercised ordinary CORE domain, not every monitor flag or the
complete original process layout.


## D-160 — MONRT completion and host-delivered INTH

A source MONRT is now an explicit successful host-session transfer, with no
exception text sent to the game terminal. Live exits run original MONIT, ZAPLOK
and appropriate setup CC1/CC2 statements. The selected RESET service releases
host resource/file ownership; it is not a complete monitor RESET emulator.
The monitor J B S A value and WHO argument-list location remain synthetic loader
bindings. The existing continuation-after-literal policy selects JSQTAB cleanup
when FREE returns; the unidentified assembler output is still unavailable.

Telnet IP now executes ported INTH before the suspended game generator resumes.
It preserves the source CCFLG/CCFLG. gate, INWAIT return increment, INTFLG guard,
AC save/restore and CC1/CC2 dispatch. Host continuation tokens 0/1 represent resume
and input skip; they are not reconstructed instruction PCs. Handler calls use a
synthetic PUSHJ return word. Unsupported trap addresses, including CLRBUF's absent
runtime binding, remain explicit errors rather than inferred handlers.

The host interrupts only an already-suspended terminal read. Waking HIBER must
not cancel a later unrelated prompt after source code handled the interrupt.
Tests cover this distinction and yielding-handler order. Live setup disconnects
and interrupts complete source cancellation and MONIT without leaking NUMPLY or
NUMSID. CC2 intentionally leaves NUMSHP incremented, as the supplied source does.
Main interrupt/QUIT-decline returns to STATUS; confirmed active-ship exit still
reaches the unresolved final POINTS path first.


## D-161 — Returning admission interrupt handler

Ported CLRBUF.FOR:24–29 directly: OUT of octal 034160703400 with zero line
spacing, then CLEAR. Bound the actual handler in live INTH, using a separate
synthetic argument block and the existing raw OUT/CLEAR routines. The source
is present in the archive; D-160's limitation was its missing runtime binding.

The admission test interrupts at JOBSTA after SETUP installs CLRBUF. It checks
four exact bell bytes, both pending input queues and BUFPTR clearing, preservation
of all 16 accumulators including the return stack, restored INTFLG, and retained
ship reservation. The scheduler boundary is injected by the test; game statements
and handler effects execute unchanged. Focused tests and TypeScript pass at
logs/decwar-d161-clrbuf-test.log and logs/decwar-d161-typecheck.log.


## D-162 — LIST uses the selected true-first two-label IF policy

The live factory now supplies LIST's two-label IF policy as true-first, matching
the already selected SETUP/movement policy and the V5 manual evidence recorded
in platform-manuals.md. Without the binding, LIST FRIENDLY failed even though
its statement port was present. No LIST game rules changed. Existing reversed
loop diagnostic selection and the uninitialized implicit SHIP ambiguity remain
separate unresolved dependencies. Live message/combat tests now exercise shared
state beyond admission, without claiming original-executable comparison.


## D-163 — Native zero for ROMDRV's persistent CHECK literal

ROMDRV.FOR:169 passes literal 0.0 to CHECK. The live factory now writes its native
PDP-10 representation after installing native numeric services; it previously
retained a rational-test handle. This is a binding correction, with no different
gameplay decision. Source tournament setup and successive MOVE turns reproduce
the original failure and verify source Romulan creation and movement afterward.


## D-164 — Source name prompt and explicit raw-input EOF policy

The development entry initializes JOBSTA's USCBH cache to two zero words instead
of inheriting the PLAYER test fixture. WARMAC:3808–3867 then asks for the name,
performs its own filtering and SIXBIT conversion, and caches it for later calls.
The host adds no raw-INCHWL echo; exact monitor echo is not established by the
archive. Name-buffer overflow and the zero-pointer empty-name retry are retained
in the raw routine, with actual original layout effects still unverified.

A disconnected socket cannot supply another name byte. The live INCHWL adapter
sets CCFLG on EOF and returns zero so JOBSTA's existing cancellation check returns
to PREGAM→MONIT. On Telnet IP, original INTH supplies CCFLG. This modern EOF
selection is necessary because JOBSTA, unlike ICHR.T, does not check HUNGUP in
its raw read loop. It adds no synthetic character or alternate game cleanup.


## D-166 — Virtual shared-segment catalog and monitor RUN

A full galaxy executes SETUP.FOR:223–227's KILHGH/START path. The development
host models its shared image as DSK:DECWAR at virtual PPN zero. The actual
KILHGH statements execute with successful virtual OPEN/LOOKUP/RENAME services;
RENAME removes that world's published catalog entry. Existing attached jobs
retain the same shared memory. No real .SHR file is opened or renamed. A later
load creates a fresh world, with original SETUP and persisted game numbering.

START and RUNDEC use reloadRuntime's actual six-word RUN descriptor. Successful
RUN replaces the private program in the same GameSession through SessionReload;
it never falls through to the source RUN-failure MONIT. The host releases old
job resources, keeps the terminal, queued transport bytes and CPU-accounting
timeline, and executes fresh source startup. Source CLEAR still discards input
when called. These are explicit modern loader choices; exact monitor RUN/reset
and original image/AC initialization remain unverified. Ordinary source errors
still fail the session. Only the bound START path requests reload.

All worlds in one host share MonitorResources. This is required by WARMAC
4493–4497/4630–4634: FRELOK and STAUPD are universal, while other keys include
only the source's six game-number bits. No extra host namespace avoids the
source wrap/collision behavior. GRIPE exclusive file handles are likewise shared.
A stale removal cannot unpublish the newer world's catalog entry.

## D-167 — Cooperative scheduling after terminal characters

The development OUTCHR service yields after every byte written to the terminal.
This permits the host to deliver Telnet interrupts and run other jobs during
reports or echoed typeahead. The previous service only yielded at later source
input/wait boundaries, making whole reports indivisible from the host's view.
Source routines still choose output bytes, CCFLG checks and trap behavior.
WARMAC SHWSCN:2948–2971, for example, finishes a data row before checking and
clearing CCFLG and returning. The live interrupt test exercises that boundary.

This is a modern scheduling selection. It does not reproduce CPU instruction
preemption, terminal baud rates, monitor buffering or interrupts at every
possible original instruction. Source output is observed before subsequent
statements run: JOBSTA's post-prompt CCFLG clear is one consequential example.
Tests requiring an input wait synchronize at that wait, not merely on the last
printed prompt byte. No source flag reset or output order was moved.

GETCMD's live ZAPLOK boundary also yields after executing the original service.
GETCMD.FOR:57–73 branches an already-set HUNGUP/CCFLG through 200→210→350→200
when no notification/endgame changes the path. This can perform no terminal I/O.
Closed GameSessions therefore still honor cooperative scheduling; only closed
input and timed waits resume immediately. A source job in this loop remains in
the loop, with its counters and ship intact, while other jobs and forced host
shutdown can run. No automatic FREE, final score or source QUIT is synthesized.
This is not general instruction preemption; other CPU-only loops still require
review of their host scheduling boundaries.

## D-168 — Standard archive HELP and unavailable special search path

The development standard HELP open reads DECWAR.HLP from the supplied archive,
preserving its bytes and resetting the buffered reader on each open. Previously
the live composition inherited sample HELP text. NEWS already independently
loaded DECWAR.NWS and retains that binding. Original SHLP performs section
matching and output; the host does not render or reformat documentation itself.

WARMAC:833–860 defines special logical and standard physical HELP descriptors;
SHLP:5118–5126 attempts the special one only for negative PASFLG, then falls
back on failure. This host has no separate special logical-path help file, so
that open fails and the supplied standard archive is used. This availability
selection and the existing synthetic FILOP/buffer layout are explicit modern
development choices. No second help file or missing monitor search semantics
are invented.

## D-171 — Deliver terminal interrupts and answer repeated timing marks

The Telnet boundary maps raw ETX (byte 3) to the same source INTH handler as
Telnet IP. This is a modern client-compatibility choice, not a claim about the
original TOPS-10 network service. Controls in a decoded socket batch are queued
before its application bytes wake a suspended monitor read. Original INTH,
ICHR.T, GTKN, LOCATE and GETCMD still determine the game response; no replacement
BUILD cancellation or quit routine is introduced.

Empty application payloads must not wake GameSession.read: doing so before an
interrupt-only packet's IP was delivered cleared the suspended-input marker,
and the read then waited forever despite CCFLG. CLRBFi at ICHR.T's cancellation
path now clears the real session queue as well as the composition's input queue,
matching its role as monitor typeahead clearing (WARMAC.MAC:1642-1659).

Every DO TIMING-MARK (option 6) receives WONT TIMING-MARK. Unlike ordinary
repeated option offers, these requests are not suppressed by the refusal cache.
The installed Telnet client was observed sending IP plus DO TIMING MARK on each
Ctrl-C; caching the first refusal made later interrupts suppress all game output.
Other unsupported options retain bounded refusal handling. This is an observed
modern transport correction, not recovered DECWAR protocol logic. See
logs/ctrl-c-real-client-probe.log for the real-terminal reproduction.
