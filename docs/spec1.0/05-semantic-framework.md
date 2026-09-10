# 5. Semantic framework

This chapter explains how a line of player input becomes a game operation. The
grammar in Section 4 tells us which words and operands can occur; it does not,
by itself, say whether those tokens are being entered at the command prompt,
answering a question, or supplying free text. Nor does grammar determine when
an accepted operation changes the galaxy or produces output. The rules here
provide that missing interaction context.

The progression is deliberate. First, the chapter distinguishes commands from
responses. It then explains how a response consumes input, how confirmation
works, and how malformed or empty input is handled. Next it separates immediate
effects from turn completion and notification delivery. Finally, it describes
the shared destination and weapon-input operations used by several commands.
Section 7 uses these rules together with the world operations in Section 6;
Sections 8 and 9 define autonomous activity and the ordering of later effects.

## 5.1. Commands and responses

DECWAR accepts input both as commands and as responses to prompts. At the
command prompt, the player names a command and supplies its operands. If a
command needs more information, it asks for that information before proceeding.

For example, entering `TRACTOR` without a ship name, while no tractor link is
active, causes the game to ask which ship to link to. Entering `WOLF` then
supplies the missing ship name, allowing TRACTOR to continue. The game
interprets this input as an answer to its question, rather than looking for a
command named WOLF. The same principle applies to a confirmation such as YES
and to free text supplied to TELL or GRIPE: the active interaction determines
the meaning of the characters.

At command acquisition, the first word selects a command. At an operand prompt,
the segment supplies the requested operands and is not dispatched as a new
command. At a text prompt, the text rules apply instead of ordinary command
tokenization. A slash in a TELL message or GRIPE body therefore remains text.

An omitted operand, an empty response and a malformed response are distinct.
Their consequences are command-specific: omission may request input, choose
a default, or act on existing state. An empty response may cancel, while a
malformed response may retry or reject. No universal retry, cancellation or
rollback rule is implied by an optional grammar production.

## 5.2. Confirmation

QUIT, a SHIELDS transfer requiring confirmation, and NEWS continuation use the
same affirmative test. The first response token affirms only when it is Y, YE
or YES, without regard to letter case. Empty input, NO, a number, and any other
word do not affirm. No invalid-answer diagnostic or automatic retry follows
from this test. The requesting operation defines what declining does.

The following operation takes an already separated first token, or null for
an empty response. It does not tokenize a line or consume later segments.

```typescript
function isAffirmative(firstToken: string | null): boolean {
  if (firstToken === null) return false;
  const word = firstToken.toUpperCase();
  return word === "Y" || word === "YE" || word === "YES";
}
```

Only the first token determines this result. Thus YES followed by another
token affirms; NO followed by YES does not. This acceptance of extra input is
a response-recovery rule, not a second production for ordinary confirmation
syntax. YESPLEASE is not an affirmative spelling.

| Request | Prompt, with exact newline notation | Nonaffirmative result |
| --- | --- | --- |
| In-game QUIT | `\nDo you really want to quit? ` | Resume command acquisition without departure or final POINTS |
| SHIELDS deposit requiring confirmation | `Transferring all ship energy to shields.  Confirm? ` | Emit `Energy NOT transferred.\n`; do not transfer |
| NEWS continuation | `Do you want to continue viewing the news file? ` | End this NEWS invocation |

None of these prompts ends with a newline. Affirmation authorizes only the
operation that requested it. It is not stored as a preference for subsequent
requests, and declining does not retract output already displayed.

## 5.3. Remaining input at a prompt

A prompt does not necessarily require a new line. SHIELDS obtains its
confirmation from the next available segment, including a slash-separated
segment on the line that requested the transfer. For a ship requiring transfer
confirmation, `SHIELDS TRANSFER 100/NO` supplies NO as that response, not as a
new command. The transfer prompt is still emitted.

NEWS likewise takes the next available segment at each continuation boundary.
For news containing such a boundary, `NEWS/YES` displays the first section,
emits the continuation prompt, and consumes YES as its response. A later
boundary requires another response; one affirmation does not authorize all
remaining sections. If NEWS reaches its end before requesting continuation,
the next segment was not consumed as a response and retains its ordinary
command meaning. This rule does not add boundaries to the selected news text.

QUIT instead discards the unconsumed input before obtaining confirmation.
Neither `QUIT YES` nor `QUIT/YES` preconfirms departure; an affirmative response
must be supplied after the prompt. This deliberate fresh-response requirement
is specific to QUIT and must not be generalized to other prompts.

> Reviewer note — remaining input contract: These rules establish the three
> command cases above, not all slash-segment consumption. Empty segments,
> interrupted responses, shared coordinate retries, replay, and the exact
> input-restoration behavior after interruption still need complete rules. Free-text
> editing and line-length limits are also unresolved. Do not introduce a
> single generic prompt implementation as their definition.

## 5.4. Immediate effects and completion

Command entries distinguish immediate changes, notice creation, turn completion
and later notice delivery. These are different semantic events. Creating a hit
notice records the hit's facts; it does not imply that every recipient sees it
before the next immediate message. Completing a weapon turn does not perform
automatic device repair. A rejected command need not undo earlier output or
effects when its entry explicitly permits partial progress.

Scenarios identify the point at which their resulting state is observed. A
state described as “before turn completion” excludes its repair, world activity,
stardate, life-support and score-commitment phases. It is not a promise that
those phases leave the state unchanged. Section 9 defines which phases apply.

## 5.5. Resolving a single destination

MOVE, IMPULSE, BUILD and CAPTURE share the destination form from Section 4.3.
Resolution supplies a sector position; it does not establish that the command
may act on that sector. Engine checks that precede resolution, and range,
occupancy or allegiance checks that follow it, remain command-specific.

For numeric input, use the following order:

1. Select the explicit ABSOLUTE or RELATIVE mode, or the player's default when
   neither is supplied. An explicit mode does not alter that default.
2. If no operands remain, report that input is still needed to the requesting
   command. Otherwise require exactly two operands. A different nonzero count
   emits `Wrong number of coordinates specified.\n` and rejects the destination.
3. Require both operands to be integer tokens before testing either value.
   Otherwise emit `Non-numeric coordinate.\n`. Despite its wording, this
   diagnostic also applies to a decimal token such as `20.0`.
4. For relative input, add the issuing ship's current vertical and horizontal
   positions to the respective values. Absolute input requires no addition.
5. Require the resulting vertical coordinate to be from 1 through 75, then
   require the horizontal coordinate to be from 1 through 75. A vertical
   failure emits `X coordinate lies outside galaxy.\n`; a horizontal failure
   emits `Y coordinate lies outside galaxy.\n`.

The output labels X and Y denote vertical and horizontal, respectively. They
are retained diagnostic wording, not different coordinate axes. A coordinate
on either boundary, 1 or 75, is valid.

For a well-formed COMPUTED destination, first require computer damage below
300, otherwise emit `Computer inoperative.\n`. This check occurs even when
the modifier has no following vessel name. With a functioning computer and
no following operand, input is still needed. Resolve a supplied vessel name
against the fixed ship roster, then the Romulan name. An unknown name emits
`Unrecognized ship name.\n`; a known but absent vessel emits
`Player not in game.\n`. A successful result is the vessel's position at
resolution, not a persistent target reference.

The issuer's computer condition does not restrict absolute or relative input.
A computed destination does not itself require friendship, proximity, or an
unoccupied sector. For example, an enemy vessel can supply a destination that
a later movement or weapon check rejects for its own reason.

Each response is resolved anew, using the current default and current positions.
A modifier-only response does not carry its explicit mode to the next response.
An empty response reports cancellation to the requesting command. Its handling
at MOVE's own-position retry remains the C-009/C-010 discussion; do not infer
uniform rollback or stale-operand reuse from this shared operation.

### Validation examples

These results assume the command reaches destination resolution; MOVE's
critical warp-engine rejection, for example, would occur first.

| Destination input | First result |
| --- | --- |
| `ABSOLUTE 0 20.0` | `Non-numeric coordinate.\n`, before checking the invalid vertical value |
| `ABSOLUTE 0 76` | `X coordinate lies outside galaxy.\n` |
| `ABSOLUTE 20 76` | `Y coordinate lies outside galaxy.\n` |
| `ABSOLUTE 20 21 22` | `Wrong number of coordinates specified.\n` |
| `COMPUTED` with computer damage 300 | `Computer inoperative.\n`, not a coordinate prompt |
| `COMPUTED` with computer damage 299 | More input is needed |

If the default is absolute, the ship is at (20, 20), and a response contains
only RELATIVE, the next unmodified response `1 1` resolves to (1, 1), not
(21, 21). Responding `RELATIVE 1 1` instead resolves to (21, 21).

> Reviewer note — multiple-target and malformed computed forms: PHASERS adds
> an optional energy amount and TORPEDOES adds a burst count and multiple
> targets. Their cardinality and retry rules are not the exact-two-operand rule
> above. Non-word COMPUTED operands, surplus names, reverse-order name validation
> in a burst, and caller handling after failed retries still require complete
> shared definitions. This section does not silently broaden the grammar to
> every historical operand shape.

## 5.6. Weapon destination input

Weapon input separates a leading quantity from the target coordinates. With
numeric input, PHASERS accepts either two integers for a destination or three
for energy followed by a destination. TORPEDOES accepts a burst count followed
by coordinate pairs. Relative conversion affects the coordinate pairs, never
the energy amount or burst count.

For these ordinary forms, count the supplied operands before checking their
types. More than three numeric operands for PHASERS, or seven for the initial
TORPEDOES input, emits `Too many coordinates specified.\n`. Next require every
operand to be an integer token. Only then resolve and bounds-check the target
pairs in input order, vertical before horizontal within each pair. The diagnostic
text is defined in Section 5.5.

PHASERS with a lone integer emits `Wrong number of coordinates specified.\n`
and ends; it does not retain that integer as energy while prompting for a
target. With no remaining operands it requests coordinate input again. A
complete PHASERS target is resolved before the selected energy is checked
against the permitted firing range in Section 7.19.

TORPEDOES with only a valid count requests targets without the count. A response
cannot supply more target pairs than that count: an excess emits
`Too many coordinates specified.\n`. The response independently selects its
coordinate mode; a modifier on the earlier count-only input does not carry
forward. Section 7.20 defines last-target repetition when fewer targets are
supplied and distinguishes the remaining malformed-response exceptions.

### Computed weapon targets

COMPUTED first checks computer eligibility, then resolves vessel names into
positions. A leading integer remains firing energy or burst count, not a name.
Each name contributes one target position, so `PH COMPUTED 200 WOLF` is the
computed counterpart of a power followed by two coordinates. `PH COMPUTED WOLF`
uses default firing energy. Names are resolved before target eligibility,
range, firing-energy or burst-supply checks. Resolution does not follow a
vessel after obtaining its position.

The command's initial device check still precedes this work: damaged phasers
or torpedo tubes can reject a command before computer or target diagnostics.
TORPEDOES also checks for zero ammunition before target input.

### Diagnostic precedence examples

Assume functional weapon devices and computer, and enough ammunition to reach
torpedo target resolution. The initial examples use explicit ABSOLUTE mode.

| Input | First result |
| --- | --- |
| `PH ABSOLUTE 49 0 20` | `X coordinate lies outside galaxy.\n`, before invalid firing-energy rejection |
| `PH ABSOLUTE 200 20 21 22` | `Too many coordinates specified.\n` |
| `PH ABSOLUTE 200 0 20.0` | `Non-numeric coordinate.\n`, before bounds checking |
| `PH ABSOLUTE 200` | `Wrong number of coordinates specified.\n` |
| `TO ABSOLUTE 4 20 76` | `Y coordinate lies outside galaxy.\n`, before burst-count rejection |
| `TO ABSOLUTE 2 20 21 20 76` | `Y coordinate lies outside galaxy.\n`; the first torpedo does not launch |

For a ship at (20, 20), `PH RELATIVE 200 1 -1` requests power 200 at (21, 19),
not power 220. With default ABSOLUTE input, `TO RELATIVE 2` followed by
`20 21` aims both torpedoes at (20, 21), not (40, 41).

### Discussion — computed target error order

The historical multiple-name resolver checks names from last to first, although
the resulting targets remain in the player's written order for firing. With
Wolf absent, `TO COMPUTED 2 ZZZ WOLF` therefore reports
`Player not in game.\n`; `TO COMPUTED 2 WOLF ZZZ` instead reports
`Unrecognized ship name.\n`. Neither burst launches.

Resolving names from first to last would make error precedence match written
order, but would change the first diagnostic when several targets are invalid.
This is a C-010 choice, not a reason to reverse the burst itself. No alternative
is adopted here. Missing counts, misplaced quantities, surplus computed names
and empty target-only responses remain separate acceptance/recovery cases;
the examples above do not make those forms valid.
