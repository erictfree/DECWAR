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
