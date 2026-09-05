# Observable terminal behavior

Status: prompts, scan characters and basic formatting reviewed. This chapter is
not yet an exhaustive output catalogue or a Telnet protocol specification.
Application output is separate from transport negotiation and local echo.

## TERM-1 — Output contract

Terminal conformance compares application character codes, their ordering and
formatting state under stated input and event conditions. Spaces, capitalization,
spelling, carriage returns and line feeds are significant. Explanatory prose or
corrected spelling MUST NOT replace a specified source message. A future graphical
client may expose the same game semantics without claiming terminal conformance.

The source invokes terminal services, not a Telnet socket implementation. Port
numbers, IAC negotiation, client-side echo and network framing belong to a
transport binding. They must not be inferred from a game message or frozen as
Austin language rules merely because the current host implements them.

**Evidence:** [TTY input/output bindings](../../legacy/utexas/WARMAC.MAC#L661),
[INLI.](../../legacy/utexas/WARMAC.MAC#L1542).

## TERM-2 — Prompts

Normal main-game prompt is exactly `Command: ` including the final space.
Informative prompt concatenates, without separators:

1. Life-support reserve in decimal followed by `L` when life-support damage is
   at least 3000.
2. `S` when shield strength is at most 100 or shields are down.
3. `D` when hull damage is at least 20000.
4. `E` when engine energy is at most 10000.
5. `> ` in all cases.

Pregame command prompt is exactly `PG> `. These strings do not include an
invented welcome prefix or terminal color sequence. The surrounding acquisition
routine controls preceding line breaks.

**Evidence:** [PROMPT](../../legacy/utexas/DECWAR.FOR#L3107),
[normal prompt text](../../legacy/utexas/MSG.MAC#L38),
[XGTCMD prompt](../../legacy/utexas/SETUP.FOR#L426).

## TERM-3 — Line breaks and numeric fields

Unconditional line output requests emit CR followed by LF for each requested
line. The conditional blank-line operation emits CR/LF unless output is already
at the left margin following a blank line. It is not interchangeable with an
unconditional newline; repeated calls can collapse redundant blank lines.

Integer fields are decimal. Positive field width imposes a limit; overflow
uses asterisks for digit positions while preserving a required sign. Zero width
is free format; negative width requests minimum width with expansion. Padding
precedes the sign and digits. Signed-decimal output adds `+` for positive values,
while ordinary decimal does not.

Fixed-point output divides integer quanta by ten with truncation toward zero.
Medium/long output appends a decimal point and the absolute remainder digit;
short output omits both. Ordinary formatting of a negative magnitude below ten
therefore loses its sign in the zero integer part. The always-signed fixed-point
operation treats zero as negative, yielding `-0.0` in medium/long form. These are
observable formatting rules, not a reason to store state as decimal strings.

**Evidence:** [CRLF](../../legacy/utexas/WARMAC.MAC#L1696),
[numeric output](../../legacy/utexas/WARMAC.MAC#L1880).
**Open:** extreme integer/width values remain part of U-NUMERIC and formatting
boundary coverage; this clause describes the reviewed ordinary domain.

## TERM-4 — Scan cells and axes

The normal scan form emits two characters per sector. Short scan form emits
only the second character of each pair:

| Object | Normal pair | Short character |
| --- | --- | --- |
| Empty | space then `.` | `.` |
| Player ship | space then its roster initial | roster initial |
| Federation base | `<>` | `>` |
| Empire base | `)(` | `(` |
| Romulan | `??` | `?` |
| Neutral planet | space then `@` | `@` |
| Federation planet | `@F` | `F` |
| Empire planet | `@E` | `E` |
| Star | space then `*` | `*` |
| Black hole | two spaces | space |
| Warning on otherwise empty/hidden cell | space then `!` | `!` |

The hidden-cell sentinel displays as empty in an unmarked scan. Warning marks
replace only empty/hidden cells in the clipped warning area; other objects retain
their symbols. A base or planet's warning radius is a square distance bound,
not a Euclidean circle.

Rows are emitted from greatest V to smallest V, with a two-column V label on
both sides. Horizontal labels appear above and below: normal form starts at
Hmin and labels every second column; short form starts at Hmin+1 and labels
every third. Labels suppress a leading zero. No proportional-font alignment or
extra column padding may be substituted in the terminal profile.

A control flag observed after a row clears that flag and stops the remainder of
the scan, including its bottom labels. The complete interrupt/transport behavior
still belongs to U-CONTROL.

**Evidence:** [SETSCN/object table](../../legacy/utexas/WARMAC.MAC#L2350),
[MARK](../../legacy/utexas/WARMAC.MAC#L2412),
[SHWSCN/labels](../../legacy/utexas/WARMAC.MAC#L2482),
[roster initials](../../legacy/utexas/DECWAR.FOR#L489).

## TERM-5 — Command diagnostics and assets

Unknown and ambiguous command text is respectively `Unknown command` and
`Ambiguous command`; the acquisition routine adds context-dependent help text
and line breaks. Message fragments are not automatically complete lines.
HELP and NEWS serve separately preserved assets and their own formatting logic.
Their presence does not establish that every help example is executable syntax.

The [named-fragment catalogue](messages.md) preserves all 324 named ASCIZ
fragments from MSG.MAC and SETMSG.MAC, including their literal whitespace.
Inline literals and per-command output assembly remain required coverage. Until
they are included, this chapter cannot support a full exact-output implementation.

**Evidence:** [messages](../../legacy/utexas/MSG.MAC#L7),
[GETCMD diagnostics](../../legacy/utexas/DECWAR.FOR#L1252),
[HELP](../../legacy/utexas/WARMAC.MAC#L4134),
[NEWS](../../legacy/utexas/WARMAC.MAC#L3811).

## TERM-6 — Coordinate fields

Coordinate output takes a location, width, coordinate mode, verbosity and a
line-ending request. Unless relative-only, emit `@` in medium/long verbosity,
then the V decimal field, `-`, and the H decimal field using the requested width.
Short output omits `@`.

Next, if the location equals the acting ship's position and width is zero,
finish without any relative suffix. In relative-only mode this can produce an
empty coordinate field. Otherwise BOTH mode inserts one space. Unless
absolute-only, emit signed V displacement, `,`, and signed H displacement.
Use signed-field width zero when the requested width is zero, or width plus one
otherwise. Append CR/LF only when the caller requests it.

This is a rendering operation, not a change to the session's coordinate default.
STATUS can explicitly request absolute output while other callers use that
default. Leading signs, omitted zero-location relative text and the separating
space are part of terminal conformance.

**Evidence:** [PRLOC](../../legacy/utexas/DECWAR.FOR#L3078).

## TERM-7 — Output composition notation

The following operations name observable formatting effects, not required APIs:

| Operation | Effect |
| --- | --- |
| `text(s)` | Emit the exact characters in s. JSON escapes in this specification denote character codes. |
| `fragment(id,n)` | Emit the named catalogue fragment, then n unconditional CR/LF pairs; omitted n means zero. |
| `break` | Apply TERM-3's conditional blank-line operation. |
| `integer(x,w)` / `signed(x,w)` | Ordinary or signed decimal field from TERM-3, with default width zero. |
| `fixed(x,w)` / `signedFixed(x,w)` | Ordinary or signed scaled-by-ten field under current verbosity. |
| `object(code,s)` | TERM-8 object text; append one space if s is positive. |
| `device(d)` / `condition(c)` | TERM-8 device or condition text. |
| `location(v,h,n,w,m,f)` | TERM-6 coordinate output; n selects ending CR/LF, w width, m coordinate mode and f verbosity. |
| `column(n)` | Emit `max(n−cursorColumn−1,0)` spaces. |

Apply operations in sequence; no implied spaces or line breaks occur between
them. A fragment can already begin or end with CR/LF, independently of its n
argument. The Austin ASCIL macro expands to ASCIZ with no added characters,
despite its comment describing an automatic CR/LF suffix. Directly quoted ASCIL
text must therefore not receive that suffix by convention.

For buffered output, the source's cursor counter increases for codes 32 through
127, including DEL. CR sets the counter to zero and, if the old counter was
nonzero, sets the blank-line counter to −1. LF increments the blank-line counter
without moving the horizontal counter. Backspace decrements the horizontal
counter without a lower clamp. Tab assigns `32×floor((cursorColumn+8)/32)` for
ordinary nonnegative coordinates: the source clears five low bits after adding
eight. Do not replace that arithmetic with conventional eight-column tab stops.
Other control characters leave these counters unchanged. TERM-3's conditional
break emits CR/LF unless the horizontal counter is zero and blank-line counter
is positive. Buffered output after a disconnect is suppressed before these
updates; alternate direct-terminal/host paths remain in the transport profile.

**Evidence:** [output primitives](../../legacy/utexas/WARMAC.MAC#L1650),
[cursor accounting](../../legacy/utexas/WARMAC.MAC#L1309),
[ASCIL macro](../../legacy/utexas/WARMAC.MAC#L23).

## TERM-8 — Object, device and condition names

Object names outside a scan use this table. Medium shares the short column;
long output alone uses long names. Negative codes and object kinds above ten
are normalized to empty space by this operation. The scan-specific rendering in
TERM-4 remains separate.

| Kind | Short/medium | Long |
| --- | --- | --- |
| Empty | `.` | `Empty Space` |
| Player ship | Roster initial | Roster name |
| Federation base | `<>` | `Fed Base` |
| Empire base | `)(` | `Emp Base` |
| Romulan | `??` | `Romulan` |
| Neutral planet | ` @` | `Neu planet` |
| Federation planet | `+@` | `Fed planet` |
| Empire planet | `-@` | `Emp planet` |
| Star | `*` | `Star` |
| Black hole | `BH` | `Black Hole` |

Device names below all include one trailing space, represented in the quoted
strings. Device order is fixed.

| Short | Medium | Long |
| --- | --- | --- |
| `SH ` | `Shields ` | `Deflector Shields ` |
| `WA ` | `Warp ` | `Warp Engines ` |
| `IM ` | `Impulse ` | `Impulse Engines ` |
| `LS ` | `Life Sup ` | `Life Support ` |
| `TO ` | `Torps ` | `Torpedo Tubes ` |
| `PH ` | `Phasers ` | `Phasers ` |
| `CO ` | `Computer ` | `Computer ` |
| `RA ` | `Radio ` | `Radio ` |
| `TR ` | `Tractor ` | `Tractor Beam ` |

Condition output prefixes `D+` in short format or `Docked+` otherwise when the
acting ship is docked. Append `G`, `Y` or `R` in short format, or `Green`,
`Yellow` or `Red` otherwise. There is no separator between the docking prefix
and condition, and no automatic trailing space.

**Evidence:** [ODISP](../../legacy/utexas/WARMAC.MAC#L1969),
[ODEV](../../legacy/utexas/WARMAC.MAC#L2054),
[OCOND](../../legacy/utexas/WARMAC.MAC#L2087).

## TERM-9 — Shield, docking and preference output

SHIELDS begins with `break`. A missing/unrecognized switch prompts
`fragment(shld01)`. Missing transfer amount prompts `fragment(shld02)`.
Confirmation prompts `fragment(shld03)`; refusal emits `fragment(shld04,1)`.
A completed transfer emits `fragment(shld05,1)`. Successful UP emits
`fragment(shld06,1)`, then any tractor-release notification, then
`fragment(shld07,1)` if energy is nonpositive. DOWN emits
`fragment(shld08,1)`. Critically damaged shields reject UP with
`fragment(shld09,1)`.

A DOCK failure for no adjacent installation emits `break`, the acting location's
object with one trailing space, then `fragment(dock01,1)`. A completed docking
emits `fragment(dockin,1)` before any requested STATUS output. REPAIR has no
unconditional success text; it calls the damage report only when requested.
These outputs precede their later main-loop repair/accounting effects.

TYPE OUTPUT emits, in order:

1. `fragment(type02,2)`, the selected verbosity fragment `shtfrm`, `medfrm`
   or `lngfrm`, then `fragment(type03,1)`.
2. `inform` or `normal`, then `fragment(type04,1)`.
3. `shtfrm` or `lngfrm` for scans, then `fragment(type05,1)`.
4. `relfrm`, `bthfrm` or `absfrm` for input mode, then `fragment(type08,1)`.
5. The corresponding output-mode fragment, then `fragment(type09,1)`.
6. `fragment(set008)`, the terminal's two padded five-character name fields,
   then `break`.

TYPE OPTION emits `break`, `fragment(decver,1)`, then `fragment(setu06,1)`
when Romulan activity is enabled or `fragment(type06,1)` otherwise; finally
`fragment(setu07,1)` when black holes were selected or `fragment(type07,1)`
otherwise. An ambiguous TYPE O emits `fragment(ambswi,1)` before asking for
its switch through `fragment(type01)`.

**Evidence:** [SHIELD](../../legacy/utexas/DECWAR.FOR#L3739),
[DOCK](../../legacy/utexas/DECWAR.FOR#L893),
[REPAIR](../../legacy/utexas/DECWAR.FOR#L3190),
[TYPE](../../legacy/utexas/DECWAR.FOR#L4540).

## TERM-10 — Acquisition and exit diagnostics

Before a main prompt, apply `break`. Fatal hull damage enters final scoring and
release; exhausted energy first emits the actor's object with a trailing space
and `fragment(main02,1)`. If condition is yellow after the energy check, emit
four BEL characters (code 7) before world-end checking and prompting. The source
literal is a packed string of four BELs followed by NUL, not a single bell.

For an unknown or ambiguous main command, emit `unkcom` or `ambcom`, append
`forhlp` only outside short verbosity, then apply `break` and return to the
state/prompt checks. A consumed empty command skips the diagnostic. A control
rejected under red alert emits `fragment(noquit,1)` before clearing input.
Explicit QUIT prompts `fragment(sure00)` and discards the old line before reading
confirmation, so an answer appended to the QUIT command is not used.

Pregame uses unconditional CR/LF before `PG> `. Unknown, ambiguous and
main-game-only input respectively emit `unkcom`, `ambcom` and `maicom`, each
followed by `fragment(forhlp,1)`. These pregame diagnostics do not suppress the
help hint in short verbosity.

**Evidence:** [GETCMD](../../legacy/utexas/DECWAR.FOR#L1184),
[packed yellow-alert literal](../../legacy/utexas/DECWAR.FOR#L1206),
[QUIT](../../legacy/utexas/DECWAR.FOR#L134),
[XGTCMD](../../legacy/utexas/SETUP.FOR#L426).
