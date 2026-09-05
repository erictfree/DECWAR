# Observable terminal behavior

Status: source-derived output recipes cover prompts, scans, utilities, combat,
radio and reports. Remaining assembly and boundary gaps are recorded in the
coverage appendix. This is not a Telnet protocol specification.
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
otherwise. Apply the conditional `break` operation only when the caller
requests an ending line break.

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
| `location(v,h,n,w,m,f)` | TERM-6 coordinate output; nonzero n selects an ending conditional break, w width, m coordinate mode and f verbosity. |
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

## TERM-11 — Delivered hit notifications

Use the decoded notification fields from EXEC-6, including their narrowing,
and the receiver's current output preferences and position. Formatting is performed
at delivery, not publication. Clear the local notification fields before each
retrieval. If the receiver has no pending hit flag, return. Otherwise apply
`break` in long verbosity before retrieving the next notification. An unrecognized
type produces no further text. Continue until the pending flag is zero.

The following rules use TERM-7 operations. Source and target *kind* mean the
object code divided by 100. Planet kinds are 6 through 8; player ships are 1
and 2, bases 3 and 4, and Romulan 5. A *planet suffix* is absent unless the
object is a planet and its reported strength is nonzero; otherwise it is
`integer(strength)`, enclosed in parentheses only in long verbosity.

### Common attack prefix

Types 1, 2, 3, 6, 7 and 8 begin with these operations:

1. `object(source,0)`, source planet suffix, one space, and source
   `location(v,h,0,0,outputMode,verbosity)`.
2. Outside short verbosity, append a comma if source kind is less than 5.
3. For source kind at most 5, append one space,
   `signedFixed(sourceShieldMode × sourceStrength)`, and a percent sign outside
   short verbosity. This includes Romulan kind 5 despite the source comment.
4. Append one space.

Type 7 then emits `N` in short/medium or `fragment(outh01)` in long, applies
`break` and finishes. Type 6 similarly emits `U` or `fragment(star02)` and
finishes. Preserve the leading space within `star02`.

For type 3, medium emits `fragment(outh29)` and long emits
`fragment(outh30)`, then both proceed directly to the target suffix below.
Short type 3 follows the ordinary damage path, including its torpedo marker.

### Damage and target suffix

For the ordinary damage path, emit `fragment(outh02)` only in long, then one
space in every verbosity. If target kind is at most 5, emit `fixed(amount)`
and, outside short, `fragment(outh03)`. For type 8, emit `N` in short/medium
or `fragment(outh04)` in long. For other types, emit `P`/`outh06` for type 1
and `T`/`outh05` otherwise, choosing the letter in short/medium and the fragment
in long. Targets of kind greater than 5 omit the amount and unit fragment.

Next emit two spaces in short/medium. In long, apply `break` only when target
kind is less than 5 and the cursor counter exceeds 40; do not otherwise insert
a separator. Emit `object(target,0)`, target planet suffix, and one space.
For a displaced target, emit `>` in short, `-->` in medium or
`fragment(displc)` in long. For a nondisplaced target emit `@` outside short.
Then emit target `location(v,h,0,0,outputMode,short)`: the coordinate formatter
is explicitly short even when the rest of the report is long.

If target kind is at most 5 and the kill flag is zero, append a comma outside
short, one space, `signedFixed(targetShieldMode × targetStrength)`, and a
percent sign outside short. If this target is the receiving captain's own
ship and a critical device is recorded, append `; `, `device(deviceNumber)`,
then one space in short, `fragment(outh08)` in medium or
`fragment(outh07)` in long. Append `fixed(criticalDamage)` and, only in long,
`fragment(units1)`. Device names already end in a space. Other captains do not
receive this device-detail suffix.

In long verbosity, a base target with either a nonzero kill flag or nonzero
critical damage also produces the base emergency report: two spaces, `break`
if killed, then `fragment(outh31,1)` and `fragment(outh32,1)`. A surviving
base emits `fragment(outh33,1)` and finishes with `break`. A killed base emits
`fragment(outh34)` before the destruction suffix.

For any nonzero kill flag, append one space and apply `break` in long. If the
flag is not 2, emit `object(target,0)` and `fragment(outh10,1)` in short/medium
or `fragment(outh09,1)` in long. Then, for every nonzero kill flag, emit
`object(target,1)` and `fragment(destry,1)`. Finish every ordinary damage path
with `break`, including surviving targets. Embedded and unconditional line
endings must not be replaced by a generic one-line-per-event formatter.

### Other notification types

| Type | Output after the per-retrieval long-format break |
| --- | --- |
| 4: torpedo miss | `T` in short/medium or `fragment(tormis)` in long; `integer(torpedoNumber)`; `outh13` in short/medium or `outh12` in long; target `location(v,h,1,0,outputMode,verbosity)`. |
| 5: torpedo into black hole | Same as type 4, replacing the middle fragment with `outh15` or `outh14`. |
| 15: neutralized torpedo | Same as type 4, replacing the middle fragment with `outh28` or `outh27`. |
| 9: base assistance | If deliverable, `object(target,1)` and target location without ending newline; short emits ` A` then `break`, medium `fragment(outh17,1)`, long `fragment(outh16,1)`. |
| 10: base destroyed | Same eligibility and prefix as type 9; short emits ` D` then `break`, medium `fragment(outh19,1)`, long `fragment(outh18,1)`. |
| 11: Romulan detection | `object(source,1)`; long only `fragment(outh20)`; one space; source `location(v,h,1,0,outputMode,verbosity)`. |
| 12: energy transfer | `object(source,1)`; long only `fragment(outh21)`; `fixed(amount)`; short/medium ` >` or long `fragment(outh22)`; one space; `object(target,1)`; `break`. |
| 13: tractor activated | `fragment(outh24,1)` in short/medium or `fragment(outh23,1)` in long. |
| 14: tractor broken | `fragment(outh26,1)` in short/medium or `fragment(outh25,1)` in long. |

Types 9 and 10 are consumed but suppressed when the receiver's radio damage is
greater than 3000 or its radio is switched off. Damage exactly 3000 does not
suppress these notifications. This check occurs after retrieval and after the
possible long-format break. These are hit-queue notifications; radio-message
gag filtering does not apply to them. The other types have no such radio gate.
The torpedo number in types 4, 5 and 15 uses the notification's critical-device
field, with the same decoding limits.

**Evidence:** [OUTHIT](../../legacy/utexas/DECWAR.FOR#L2404),
[target suffix](../../legacy/utexas/DECWAR.FOR#L2481),
[base and destruction suffixes](../../legacy/utexas/DECWAR.FOR#L2520),
[other event types](../../legacy/utexas/DECWAR.FOR#L2546),
[literal fragments](messages.md).

## TERM-12 — Score tables

This clause specifies ordinary POINTS output after GAME-POINTS selects its
columns. Final-entry control flow remains U-FINAL-POINTS; division by a zero
commission or turn count remains U-ZERO-AVERAGE. Do not substitute zero-valued
averages as a core rule. Column order is actor, Federation, Empire, Romulan,
omitting unselected columns throughout. Begin with four zero totals.

Apply `break`, then `column(14)` in short, `column(24)` in medium or
`column(31)` in long. For the actor header, emit one space, the roster name's
two padded five-character fields, and two additional spaces outside short.
For each selected Federation/Empire header emit `federa`/`empire`, one space,
and two additional spaces outside short. Emit `romula` for the selected Romulan
header without an added separator. Apply `break`.

Visit the eight score categories in the following order. Omit a category only
when all selected columns have zero scores in that category. Emit the indicated
label and long-format addition; then, in selected-column order, emit
`fixed(categoryScore,11)` and add the stored score, before display scaling, to that column's
total. Apply `break` after each included category.

| Category | Short label | Medium/long label | Long addition |
| --- | --- | --- | --- |
| Enemy damage | `poi11s` | `poi11l` | `column(26)` |
| Enemies destroyed | `poi12s` | `poi12l` | `fragment(poin22)` |
| Base damage | `poi13s` | `poi13l` | `column(26)` |
| Planets captured | `poi14s` | `poi14l` | `fragment(poin21)` |
| Bases built | `poi15s` | `poi15l` | `fragment(poin23)` |
| Romulan damage | `poi16s` | `poi16l` | `fragment(poin22)` |
| Stars destroyed | `poi17s` | `poi17l` | `fragment(poin20)` |
| Planets destroyed | `poi18s` | `poi18l` | `fragment(poin19)` |

These long additions are literal annotations, including the annotation on
Romulan damage; they are not new scoring calculations. The formatter reads its
numeric argument without writing it back. Accumulation therefore uses the stored
score, not its displayed integer part. The field width 11 applies to the integer
part: medium/long append the decimal point and fractional digit beyond it.
Formatting and accumulation are separate reads of the shared score cell. A
concurrent update between them can make the printed value differ from the value
added to the total; POINTS does not acquire a snapshot of the whole table.

Emit `poi03s` in short or `poi03l` otherwise, followed by `column(26)` only
in long. Emit `fixed(total,11)` for each selected column, then `break`.

When any faction column is selected, also emit commission counts and per-commission
averages. Begin with `poi07s` in short or `poi07l` otherwise and `column(24)`
only in long. Let count width be 11 in short and 13 otherwise. If the actor
column is selected, emit that many spaces as its empty count field. Emit
`integer(commissionCount,countWidth)` for each selected faction: Federation
and Empire use their commissioned-ship counts, Romulan its commissioning count.

Immediately emit `poi05s` in short or `poi05l` otherwise; do not insert a
separate `break` before this label. In long apply `column(26)`. Leave the actor
column blank using count width spaces. For each selected faction emit
`fixed(trunc(total / commissionCount),11)`.

Finally emit `poi06s` in short or `poi06l` otherwise, again without inserting
an extra break, and apply `column(26)` only in long. For every selected column
emit `fixed(trunc(total / turnCount),11)` using actor turns for the actor and
the corresponding team turns for each faction, then `break`. The label fragments
already contain leading CR/LF. Integer division occurs before fixed-point
display; do not calculate an unrestricted decimal average and round it for print.

**Evidence:** [POINTS header and category rows](../../legacy/utexas/DECWAR.FOR#L2935),
[totals and averages](../../legacy/utexas/DECWAR.FOR#L2997),
[nonmutating OFLT](../../legacy/utexas/WARMAC.MAC#L1939),
[score fragments](messages.md).

## TERM-13 — Generated Romulan speech

Austin generates a broadcast with four draws in this order: `I(3)` chooses the
recipient group, `I(4)` an opening, `I(5)` an adjective and `I(5)` a noun.
The group choices are all eighteen roster slots, Federation slots 1–9, and
Empire slots 10–18. Subsequent TELL filtering can remove unavailable recipients.
The source object is Romulan. Build the body by concatenating the chosen opening,
adjective, group qualifier, noun, `s!`, and a terminating NUL. The queue service
then applies its own body termination rules under EXEC-7.

| Selection | Alternatives in draw order |
| --- | --- |
| Opening | `"Death to "`, `"Destruction to "`, `"I will crush "`, `"Prepare to die, "` |
| Adjective | `"mindless "`, `"worthless "`, `"ignorant "`, `"idiotic "`, `"stupid "` |
| Group qualifier | `"sub-Romulan "`, `"human "`, `"klingon "`, corresponding to the recipient-group draw |
| Noun | `"mutant"`, `"cretin"`, `"toad"`, `"worm"`, `"parasite"` |

Preserve case, spaces and pluralization. The single-player openings retained
inside this routine are not selected by Austin's active entry path; player TELL
ROMULAN does not invoke it. CompuServe changes both entry selection and recipient
masks under C-8. Speech generation is distinct from eventual radio delivery.

**Evidence:** [ROMSPK](../../legacy/utexas/WARMAC.MAC#L4672),
[TELL filtering](../../legacy/utexas/DECWAR.FOR#L4023).

## TERM-14 — Radio commands and delivered messages

RADIO begins with `break`. A missing or unrecognized operation prompts
`fragment(radio0)`; an empty response returns, otherwise apply `break` before
dispatching that response. ON emits `fragment(radon0,1)` after enabling radio;
OFF emits `fragment(radoff,1)` after disabling it. GAG/UNGAG requests a missing
ship through `fragment(radio2)`. An unknown ship emits `fragment(unkshp,1)`;
selecting the actor itself returns without a success diagnostic or gag change.
For another ship, update the gag state, emit `fragment(radgag)` or
`fragment(radung)`, then `object(ship,0)` and `break`.

Player TELL's radio-damage rejection emits `fragment(tell01,1)`. Its missing
recipient prompt is `fragment(tell02)`. Repeat rejection uses
`fragment(tell09,1)`. Unknown and ambiguous recipients use `tell03` and `tell04`
respectively, followed by the token's retained word up to its first NUL (at most
five characters) and `break`.
Selecting self emits `fragment(tell05,1)` immediately, before its later removal.
Unavailable and unreachable recipients use `tell06` and `tell07`, then their
object with no trailing space and `break`. These diagnostics construct the
ship code as 100 plus roster slot, even for Empire slots; TERM-8 still selects
the name by that roster slot. No remaining recipient emits
`fragment(tell08,1)`. Body prompting and copying follow EXEC-7. The player path
applies `break` after returning from body submission.

For delivered radio output, first clear the local sender and recipient set.
Return if the message flag is zero; otherwise retrieve the next message. If the
sender is nonzero, test the gag mask before any heading. An accepted nonzero
sender emits `fragment(mess01)`, `object(sender,1)`, `fragment(mess02)`, then
the two-character roster marker for every original recipient in ascending slot
order. Each marker is one space followed by the roster initial. Apply `break`.
Then emit the body up to its NUL and one unconditional CR/LF. Repeat until the
message flag is zero. The queued body's own CR/LF remains, so normal body
delivery ends with an additional blank line.

A zero sender bypasses both gag testing and the heading, proceeding directly
to body output. Failed/no-match retrieval clears sender, recipients and the
message flag without clearing the retained body buffer. If the output loop
entered on a positive flag, it can therefore print a previously retained body
once through this zero-sender path. Do not replace that path with an implicit
empty body or an early return.

The gag lookup for nonzero sender uses the sender code modulo 100 as an index
into the identity-bit table. Romulan code 500 therefore reads index zero,
which under both supplied declarations aliases the final roster-marker word
immediately preceding the table. Its character padding determines which gag
bits can suppress a Romulan message (U-ROM-GAG). Do not infer that Romulan
messages are always immune to gagging because RADIO has no Romulan ship slot.

**Evidence:** [RADIO](../../legacy/utexas/DECWAR.FOR#L3129),
[TELL](../../legacy/utexas/DECWAR.FOR#L3977),
[OUTMSG](../../legacy/utexas/DECWAR.FOR#L2599),
[GETMSG failure path](../../legacy/utexas/WARMAC.MAC#L3036),
[roster markers](../../legacy/utexas/DECWAR.FOR#L489),
[adjacent marker/bit declarations](../../legacy/utexas/HISEG.FOR#L68).

## TERM-15 — STATUS fields

Apply `break` on entry. Numeric width is zero in short verbosity and four in
medium/long. Without selectors, emit `SD` in short, `fragment(stat2m)` in
medium or `fragment(stat2l)` in long, followed by `integer(actorTurns,width)`.
Then emit one space in short or `break` otherwise. Process CONDITION, LOCATION,
TORPEDO, ENERGY, DAMAGE, SHIELDS and RADIO, in that order. Explicit selectors
instead follow GRAM-10's order and matching rules, with no stardate prefix.

| Field | Short prefix | Medium prefix | Long prefix |
| --- | --- | --- | --- |
| SHIELDS | `SH` | `stat3m` | `stat3l` |
| LOCATION | None | `stat6m` | `stat6l` |
| CONDITION | None | `stat7m` | `stat7l` |
| TORPEDO | `T` | `stat8m` | `stat8l` |
| ENERGY | `E` | `stat9m` | `stat9l` |
| DAMAGE | `D` | `sta10m` | `sta10l` |
| RADIO | `R` | `radio3` | `radio1` |

After the prefix, emit the corresponding value and ending:

| Field | Value and ending |
| --- | --- |
| SHIELDS | `signedFixed(mode × strength,width)`, percent sign outside short, then one space. Outside short also emit `fixed(strength × 25,width)`, `fragment(stat05)` and `break`. |
| LOCATION | `location(actorV,actorH,0,0,absolute,short)`. Then one space in short, otherwise `break`. |
| CONDITION | `condition(actorCondition)`. Then one space in short, otherwise `break`. |
| TORPEDO | `integer(torpedoCount,width)`. Then one space in short, otherwise `break`. |
| ENERGY | `fixed(engineEnergy,width)`. Then one space in short, otherwise `break`. |
| DAMAGE | `fixed(hullDamage,width)`. Then one space in short, otherwise `break`. |
| RADIO | `fragment(stat11)` if radio damage is at least 3000; otherwise `Off` or `On` from the radio-disabled set. Then one space in short, otherwise `break`. |

All named prefixes in the table are fragments; their embedded spaces and tabs
are significant. SHIELDS' displayed reserve uses strength times 25 regardless
of whether shields are raised. LOCATION explicitly omits `@` even in long
verbosity. Radio damage takes precedence over its on/off state.

An unknown alphanumeric selector emits `fragment(syntax,1)` and processing
continues. The first nonalphanumeric selector ends the report, applying `break`
only in short verbosity. Repeated selectors repeat output. Values are read as
their respective fields are reached; the report does not lock or snapshot ship
state. Main STATUS starts at token 2; DOCK STATUS starts at token 3.

**Evidence:** [STATUS](../../legacy/utexas/DECWAR.FOR#L3860),
[main dispatch](../../legacy/utexas/DECWAR.FOR#L174),
[DOCK STATUS](../../legacy/utexas/DECWAR.FOR#L935).

## TERM-16 — Device damage reports

Apply `break`, then test the nine devices in order for any positive damage.
If none has positive damage, emit `fragment(alldok,1)` and return without
examining selectors. This branch includes a state in which all device damage
values are zero or negative.

Otherwise use GRAM-10's specific-device or general-report selection. A selected
device row consists of `device(index)`, then one extra space in short,
`column(10)` in medium or `column(19)` in long. Emit `fixed(damage,4)`, append
`fragment(units1)` only in long, then apply `break`. Device names themselves
include their trailing space. Specific-device mode can print zero or negative
damage for a matching device as long as some device had positive damage at
the initial test. It has no report header and silently skips unmatched selectors.

The general report prints only positive-damage rows in device order. Long
verbosity first emits `fragment(damrep)`, the object at the actor's current
board cell with no trailing space, and two unconditional CR/LF pairs. Medium
and long then emit `fragment(dmhdr1)`, nine additional spaces only in long,
and `fragment(dmhdr2,2)`. Short has no header. The title uses the current board
object rather than reconstructing the actor's ship code independently.

Main DAMAGES begins selectors at token 2. A REPAIR request for a damage report
begins at the token after its DAMAGE selector. This report does not itself repair
or normalize negative damage. Other state changes can occur between the initial
positive-damage test and the later row reads.

**Evidence:** [DAMAGE](../../legacy/utexas/DECWAR.FOR#L783),
[REPAIR report call](../../legacy/utexas/DECWAR.FOR#L3218),
[device names](../../legacy/utexas/WARMAC.MAC#L2054).

## TERM-17 — Time reports and duration fields

TIME emits these fragment/value pairs in order, with no extra separators:

1. `time01`, elapsed world milliseconds formatted as duration.
2. When aboard, `time02`, elapsed commissioned-ship milliseconds; then `time03`,
   current session CPU milliseconds minus the ship's commissioning CPU baseline.
3. `time04`, current session CPU milliseconds.
4. `time05`, current host time-of-day milliseconds.

Apply `break` at the end. Each fragment includes its own leading CR/LF; TIME
does not add a separate initial break. Each clock is sampled at its own call
point, so do not require the two current-CPU samples to be identical.

For a duration m in the supported finite integer domain, divide by 3600000
with truncation toward zero to obtain hours and a remainder. Divide that
remainder by 60000 to obtain minutes and another remainder; divide the latter
by 1000 to obtain seconds, discarding remaining milliseconds. Emit the three
components separated by `:`. Do not wrap hours modulo 24 or round seconds.

The component formatter is arithmetic, not a general decimal field. Reduce
the component to its low 18 bits, divide that nonnegative value by ten, and
emit raw character values `48 + quotient` and `48 + remainder`. It emits exactly
two characters; it does not cap, expand or replace an oversized component with
asterisks. For ordinary values 0–99 this gives two decimal digits. For example,
100 hours begins `:0`, since the first character value is 58. Transmit each raw
value's low seven bits. Its cursor effects follow the raw-value rule below.

For these potentially non-character raw values, buffered output tests bits
selected by decimal mask 96. If either is set, increment the cursor counter.
Otherwise compare the low-18-bit raw value against CR, LF, backspace and tab
and perform TERM-7's corresponding counter action; do not first reduce it to
seven bits for those comparisons. This distinction matters when emitted low
bits form a control character but the raw value is not that character code.
Input arithmetic outside the reviewed finite domain remains U-NUMERIC.

**Evidence:** [TIME](../../legacy/utexas/DECWAR.FOR#L4066),
[OTIM/O2D](../../legacy/utexas/WARMAC.MAC#L1746),
[raw buffered output](../../legacy/utexas/WARMAC.MAC#L1323).

## TERM-18 — USERS identity rows

Apply `break`. Long verbosity emits `fragment(users1)`, appends
`fragment(users2)` for privilege, and applies `break`. Other verbosity modes
omit this heading. Visit all eighteen roster slots in order. Before examining
slot 10, emit `fragment(users5,1)` even if that slot and every Empire slot are
unoccupied. Emit an identity row for each occupied slot, using all six fields
in every verbosity mode:

1. Long roster name padded on the right to ten columns.
2. One space, then the captain's two six-character identity fields. Convert
   each six-bit character to its code plus 32, including padded spaces.
3. One space, then terminal speed as `integer(speed,4)`.
4. Two spaces, then the account project as an octal field with minimum width
   six and expansion allowed; a comma; the account programmer component in
   free octal format. If that second component used d characters, append
   `max(5−d,0)` spaces.
5. One space, then all six characters of the terminal identity, converted
   from the same six-bit repertoire.
6. Two spaces, then host job number as `integer(job,3)`.

If privileged, append three spaces and the reported ship's
`location(v,h,0,2,outputMode,short)`, using the viewing captain's coordinate
preference. Finally apply `break`. This location can include relative coordinates;
it is not STATUS LOCATION's forced-absolute presentation. No row field is
conditionally omitted merely because output mode is short or medium.

Account, terminal and job fields are supplied by the host binding. The specified
rendering is independent of how a new implementation stores those identities.
USERS reads occupied slots and fields during iteration without acquiring a
consistent snapshot of the roster.

**Evidence:** [USERS](../../legacy/utexas/DECWAR.FOR#L4600),
[STAT identity formatter](../../legacy/utexas/WARMAC.MAC#L2187),
[six-bit output](../../legacy/utexas/WARMAC.MAC#L1825),
[octal fields](../../legacy/utexas/WARMAC.MAC#L1856).

## TERM-19 — LIST-family detail rows

Use GAME-LIST's selected object, faction, coordinates and flags. Emit `*` when
the object is neither neutral nor on the actor's side, except that TARGETS always
uses a space instead. Emit a space in every other case. Then emit `object(code,0)`
and apply `column(14)` in long verbosity or `column(5)` otherwise. This is a
column operation, not a fixed separator following each variable-length name.

| Object | Remaining row |
| --- | --- |
| Ship | If flagged out of range, emit `out of range`. Otherwise emit `location(v,h,0,2,outputMode,verbosity)`, then `signedFixed(shieldMode × shieldStrength,6)`, then `%` outside short. |
| Romulan | If flagged out of range, emit `out of range`. Otherwise emit the same location field, `fixed(RomulanEnergy,6)` and `%` outside short. |
| Base | Always emit the location field. If not flagged out of range, append `fixed(baseStrength,6)` and `%` outside short. |
| Planet | Always emit the location field. If build count is nonzero, append `integer(buildCount,6)`; then ` build` for long with count 1, ` builds` for other long counts, ` b` in medium, or nothing in short. |

Apply `break` after every row. The width-six numeric field immediately follows
the location, without an additional space operation. A base or planet can thus
show coordinates when an out-of-range ship would withhold them. Planet build
counts are not suppressed by the out-of-range flag. Do not add a percent sign
to an omitted strength, nor a build suffix when count is zero.

**Evidence:** [LSTOBJ](../../legacy/utexas/DECWAR.FOR#L2084),
[PRLOC](../../legacy/utexas/DECWAR.FOR#L3078),
[object formatter](../../legacy/utexas/WARMAC.MAC#L1969).

## TERM-20 — LIST-family summary rows

For summary count n, a category string and aggregated selection flags, return
without output when n is zero. Otherwise emit `integer(n,3)`. Append
`fragment(known)` if the known-only bit is set, then a space, the category string
and `s` unless n equals one. In medium and long, append one range fragment:
`ingame` if the whole-game bit is set; otherwise `inspra` if the specified-range
bit is set; otherwise `inrang`. Short omits this range fragment. Apply `break`,
then set the supplied count to zero.

The count reset affects the caller's supplied counter. In grouped output this
resets the category accumulation before its reuse, or the Romulan selection
counter when that counter is supplied directly. It is not merely a formatting
temporary. A summary that returned early for zero does not change the counter.

Category strings are `Romulan`, `Federation ship`, `Empire ship`,
`Federation base`, `Empire base`, `neutral planet`, `Federation planet`,
`Empire planet` and `target`. The known and range fragments carry their own
leading spaces. Flags aggregate across selected groups; when multiple range
bits are present, preserve the precedence above.

**Evidence:** [LSTSUM](../../legacy/utexas/DECWAR.FOR#L2060),
[summary fragments](../../legacy/utexas/MSG.MAC#L89).

## TERM-21 — LIST-family grouped assembly

LIST and its related entries apply `break` before parsing. Specific-coordinate,
named-object and CLOSEST paths can produce output while processing a group;
GAME-LIST and GRAM-11 govern those paths. After successful group processing,
the final grouped pass uses the accumulated flags and selection counters in
the following order. This pass performs no independent sorting or fresh
visibility test.

Initialize three category accumulators, for neutral, Federation and Empire,
to zero, and a target total to zero.

1. **Romulan.** Skip when its selection counter is zero. If its detail flag is
   set, apply `break` and emit its detail row. If its summary flag is set,
   increment the target total by one, apply `break`, and emit its summary using
   the selection counter and aggregated Romulan flags.
2. **Ships.** The candidate interval is slots 1–18, with its first slot changed
   to 10 if the Federation selection counter is zero, and its last changed to 9
   if the Empire counter is zero. Skip this phase when the interval is empty.
   Apply `break`, then visit that interval in roster order. Skip zero flag sets;
   emit a row for each detail flag. Each summary flag increments its faction's
   accumulator and, for an enemy ship, the target total. Outside TARGETS, apply
   `break` and invoke Federation then Empire ship summaries with their respective
   accumulators and aggregated flags.
3. **Bases.** Select sides 1–2, omitting a leading or trailing side whose base
   selection counter is zero. Skip an empty interval; otherwise apply `break`.
   Visit each selected side's ten slots in order, skipping zero flag sets. Emit
   detail rows and perform the discovery update described below. Each summary
   flag increments that side's accumulator and, for an enemy base, the target
   total. Outside TARGETS, apply `break` and invoke Federation then Empire base
   summaries with their accumulators and aggregated flags.
4. **Planets.** Skip when their selection counter is zero; otherwise apply
   `break`. Visit current planet records in order, skipping zero flag sets.
   Read coordinates and derive the planet's current faction from its board
   cell. Emit requested detail rows and discovery updates. Each summary flag
   increments the corresponding neutral/Federation/Empire accumulator; increment
   the target total only for the enemy faction. Outside TARGETS, apply `break`
   and invoke neutral, Federation and Empire planet summaries in that order.
5. **Targets.** Only for TARGETS, and only when the target total is nonzero,
   apply `break` and emit its `target` summary using the aggregated target flags.

After a detailed base or planet row, add the viewing team's discovery bit to
that record unless its privilege-only admission bit is set. Summary-only
records do not receive this update. Rows and side effects follow the current
records; the pass does not take a consistent world snapshot.

The three accumulators are initialized once for the whole pass. Ordinary
per-category summary calls reset them under TERM-20. TARGETS skips those calls,
so its accumulators can retain earlier object-class counts; its displayed final
total nevertheless comes from the separate target total. Do not replace the
Romulan summary count with one merely because only one Romulan exists: it is
the accumulated selection counter passed by the caller.

This recipe describes valid selected ship/base/planet records. Effects of a
concurrent replacement of a selected planet cell with a nonplanet, or other
invalid record/type combinations, have not been established. It does not imply
a recheck, a snapshot, or a repair of such a state.

Selection diagnostics and specific-coordinate listings of noncombat objects
also have unresolved paths under U-LIST-OUTPUT. In particular, a zero-valued
indirect message reference is not defined here as an empty fragment. The output
routine tests the argument address for zero before examining the value stored
there; these are different cases. The ordinary valid-object recipes above do
not settle those paths.

**Evidence:** [LIST entries and pass invocation](../../legacy/utexas/DECWAR.FOR#L1359),
[LSTOUT](../../legacy/utexas/DECWAR.FOR#L1959),
[selection state](../../legacy/utexas/LSTVAR.FOR#L1),
[selection and diagnostics](../../legacy/utexas/DECWAR.FOR#L1750),
[indirect text output](../../legacy/utexas/WARMAC.MAC#L1650).

## TERM-22 — LIST selection diagnostics

The parser's stored keyword is the retained token text, not the complete raw
input spelling. Its diagnostic operation emits that single text field up to
its first zero character, without quotation marks or a separating space beyond
the prefix already present in the fragment.

| Selected failure path | Output recipe |
| --- | --- |
| Empty group after the first group | `fragment(lsts01,1)`. |
| Unrecognized keyword or disallowed token category | `fragment(lsts02)`, stored keyword, `break`. |
| Recognized selector conflicts with preceding selectors, or an invalid range | `fragment(lsts03)`, stored keyword, `break`. |
| Accepted coordinate form has a location outside the galaxy | `fragment(lsts04)`, `location(v,h,1,0,absolute,short)`. |
| Specific-coordinate path rejects sensor reach | `fragment(lstf01)`, `location(v,h,1,0,absolute,short)`. |
| Specific-coordinate path finds no requested BASES/PLANETS/TARGETS object | `fragment(lstf02)`, `fragment(lstf03)` or `fragment(lstf04)`, respectively; then `location(v,h,1,0,outputMode,long)`. |
| Named Romulan requested with option disabled | `fragment(type06,1)`. |
| Named Romulan requested with option enabled but absent | `fragment(lstf05,1)`. |
| Named ship found unoccupied, or its recorded board cell is empty | `object(code,0)`, `text(" is not in the game")`, one unconditional CR/LF. |

The parser does not add a syntax diagnostic when its token pointer exceeds the
capacity guard; it takes its abort return. The coordinate guard after consuming
the second coordinate likewise aborts silently when it exceeds the bound.

A parser abort prevents the final grouped pass, even if earlier groups had
accumulated selections. It does not retract an earlier immediate row, coordinate
diagnostic or named-object diagnostic. A group-selection diagnostic can instead
return to the outer group loop; it need not end the whole command. These are
different return paths under GRAM-11, not one generic exception/rollback rule.

The no-matching-group message uses an ordered composition of the no-result
prefix, optional known qualifier, faction adjective, object class and range
suffix. Its complete domain remains U-LIST-OUTPUT because an unset adjective
is passed as an indirect zero text reference. Do not silently replace that path
with a polished generic no-results message. The table above specifies the
independent diagnostic paths whose fragments and assembly are established.

**Evidence:** [LSTSCN diagnostics and guards](../../legacy/utexas/DECWAR.FOR#L1552),
[LSTFLG coordinate/named paths](../../legacy/utexas/DECWAR.FOR#L1750),
[LIST outer loop](../../legacy/utexas/DECWAR.FOR#L1379),
[OUTW](../../legacy/utexas/WARMAC.MAC#L1726),
[diagnostic fragments](../../legacy/utexas/MSG.MAC#L105).
