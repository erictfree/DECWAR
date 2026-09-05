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

An exhaustive message catalogue, inline literals and per-command output assembly
remain a required part of this draft's coverage. Until they are included, this
chapter cannot support a full exact-output implementation.

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
