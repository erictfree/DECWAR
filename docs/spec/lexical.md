# Lexical rules

Status: derived from Austin's command-input source, with numeric values
interpreted as ordinary mathematical quantities. Control delivery requires a
separate client binding. These rules concern command input, not the
separate captain-name reader or raw message bodies.

## LEX-1 — Characters and case

The command-input alphabet consists of character codes 0 through 127. Unicode
normalization, locale-dependent casing and acceptance of larger codes are not
part of the core. A client binding must describe how it supplies these codes.

During token accumulation a character whose code exceeds 95
MUST be replaced by that code minus 32. Other characters remain
unchanged. This includes punctuation: a grave accent becomes `@`, `{` becomes
`[`, `|` becomes backslash, `}` becomes `]`, and `~` becomes `^`. It is not simply
alphabetic case folding. Classification for skipping spacing occurs separately.

**Evidence:** [Austin WARMAC NXTT.](../../legacy/utexas/WARMAC.MAC#L1454),
[character table](../../legacy/utexas/WARMAC.MAC#L838).

## LEX-2 — Line acquisition and editing

The ordinary command reader MUST ignore carriage return. Line feed, vertical tab,
form feed, NUL, Ctrl-Z and ESC terminate an acquired line when delivered to this
reader. Ctrl-C has an end-of-line classification but also an interrupt path; it
must not be specified solely as ordinary text. Its cancellation and interruption
effects will be defined in the session rules.

At most 80 ordinary characters are retained per newly acquired line. Reaching
that limit completes the line without waiting for an additional terminator.

| Delivered character | Required reader action |
| --- | --- |
| Backspace or DEL | Remove the last retained character; an empty line remains empty. |
| Ctrl-U | Clear the retained line and request a new output line. |
| Ctrl-R | Redisplay the retained line. |
| Ctrl-G | Redisplay the retained line in Austin. |
| ESC as the first nonignored character | Reuse the previous acquired line and mark it as repeated. |
| ESC after another nonignored character | Finish the new line. |

A backspace or Ctrl-U received before ESC prevents the first-character repeat
case even when the edited line is empty. TELL separately rejects repeated input.
These editing rules concern characters delivered to the game. Physical echo,
delivery of keystrokes and output control sequences belong to the terminal binding.

**Evidence:** [INLI. and NXCH.](../../legacy/utexas/WARMAC.MAC#L1542),
[CBITS](../../legacy/utexas/WARMAC.MAC#L838).

## LEX-3 — Token boundaries and command remainder

Space and horizontal tab separate tokens; runs of spacing are skipped. Comma
also separates tokens, but consecutive commas can produce null tokens. Commas
are not interchangeable with arbitrary runs of spaces.

Slash terminates the current command and leaves the physical-line remainder
available to a subsequent command-input operation. Semicolon terminates command
tokenization and ends normal token access to the physical line. Consumers such
as TELL may separately use the original line and saved character positions to
retrieve a message body; therefore semicolon is not a universal discard operation
for every consumer.

Single and double quotes have no general quoting role in command tokenization.
They are ordinary token characters. There is no universal string-literal syntax
that permits spaces or separators inside a token.

**Evidence:** [GTKN](../../legacy/utexas/WARMAC.MAC#L1377),
[NXTT./SKPB.](../../legacy/utexas/WARMAC.MAC#L1454), CBITS above.

## LEX-4 — Token categories

```text
enum TokenCategory = NULL | INTEGER | REAL | ALPHANUMERIC
type InputPosition = character position within an acquired input

record Token:
    text: Text
    category: TokenCategory
    numericValue: real
    origin: InputPosition

record AcquiredLine:
    raw: Text
    repeated: Boolean

record CommandInput:
    line: AcquiredLine
    arguments: Sequence<Token>
```

Token is an abstract description of input, not a required lexer object.
The text property is the retained, transformed spelling; numericValue is the
quantity determined below. A name-category token means ALPHANUMERIC; it does
not introduce a fifth category. Operation parameters of type `Sequence<Token>`
contain arguments only, excluding the command name and end boundary.

AcquiredLine.raw is the retained line after editing, without its terminating
control character and before token case transformation. Its repeated property
records the first-character ESC reuse defined by LEX-2. CommandInput associates
the current command's arguments with that acquired line. Several commands
separated by slash can refer to the same line. These are input values, not a
required buffering or parser architecture. Acquiring a continuation produces
another AcquiredLine and its own tokens; it does not append tokens to the old
command unless that command's continuation rule says so.

A token has retained text, a category, a numeric value and an origin position in
the acquired line. The categories are null, integer, REAL and alphanumeric.
End of command marks the boundary after the arguments.

A token retains its first five transformed characters for name matching, but
its numeric value uses its complete numeric spelling. Alphanumeric tokens have
numeric value zero. Reading one token does not change another token’s value.

The scanner attempts numeric interpretation until an invalid numeric character
or sequence occurs. An optional sign is numeric only at the start; at most one
decimal point is accepted. Digits without a decimal point produce integer tokens.
A decimal point produces REAL classification even without a digit: `.` is a
REAL-zero input, whereas `+` and `-` alone have null category. Tokens such as `1E2`,
`1-2` and `1.2.3` become alphanumeric rather than scientific notation or a lexical
error. The command consuming a token decides whether its category is legal.

**Evidence:** [GTKN category selection](../../legacy/utexas/WARMAC.MAC#L1416),
[NXTT.](../../legacy/utexas/WARMAC.MAC#L1454),
[ANUM.](../../legacy/utexas/WARMAC.MAC#L1508).

## LEX-5 — Numeric interpretation

An integer token denotes the mathematical decimal integer written by its sign
and digits. Its complete spelling is significant even when its retained name
has only five characters.

A REAL token denotes the mathematical decimal value of its complete spelling.
Exponent notation is not part of the language. A decimal point without digits
denotes zero, as specified in LEX-4. Numeric interpretation does not reproduce
finite-word overflow, compiler arithmetic or per-digit machine rounding.

**Evidence:** [ANUM.](../../legacy/utexas/WARMAC.MAC#L1508).

## LEX-6 — Keyword matching

Keyword matching examines at most five characters. An empty candidate does not
match. A nonempty candidate ending at NUL or space after matching the start of a
keyword is a prefix match; matching through five characters is an exact match
for this comparison even if the displayed keyword is longer. No significance is
assigned to capitalization of letters in the printed command list.

Command selection MUST examine the applicable whole command table. Exactly one
matching entry selects that command; no match is unknown; two or more matches
are ambiguous. An exact match does not automatically defeat another prefix match.
Individual argument parsers may use first-match or successive-assignment behavior
instead; the command's own clause specifies this. Ship selection, for example,
uses the first matching ship in roster order.

**Examples:** `SC` uniquely selects SCAN; `S` is ambiguous; `SHIELD` selects the
SHIELDS entry because its first five characters match. `TORPEDO` selects the
source table's TORPEDOS entry. `SCANXYZ` is not SCAN: its fifth retained character
differs from SCAN's terminating space.

**Evidence:** [EQUAL](../../legacy/utexas/WARMAC.MAC#L3675),
[GETCMD matching loop](../../legacy/utexas/DECWAR.FOR#L1243),
[XGTCMD](../../legacy/utexas/SETUP.FOR#L402),
[ship selection](../../legacy/utexas/SETUP.FOR#L337).

## LEX-7 — Capacity and recovery

At most 14 tokens precede end of command; the command name and null tokens
count toward this limit. A fourteenth token fits only if its terminating
delimiter is end of command, including intervening spaces or tabs. A comma
after it exceeds capacity even when the next character ends the line.

At the first position, an empty end-of-command result yields zero tokens. At a
later position, an empty end-of-command result is retained as a null token.
Spaces/tabs are skipped when looking for a token and after a token;
a comma is consumed as one delimiter without reading the character after it in
that token scan. Consequently fourteen nonempty tokens followed only by spacing
and line termination fit, but fourteen followed by a comma overflow. Thirteen
nonempty tokens followed by a comma and termination fit with a fourteenth null
result.

Overflow emits exactly `Too many words -- line ignored`, with no added line
ending, discards the entire remaining physical line and returns an empty token
sequence. None of the line's tokens is accepted as part of that command.


**Evidence:** [GTKN capacity/recovery](../../legacy/utexas/WARMAC.MAC#L1407),
[NXTT delimiter handling](../../legacy/utexas/WARMAC.MAC#L1454),
[character classes](../../legacy/utexas/WARMAC.MAC#L838).

## LEX-8 — Independent token values

Each token has its own text, category, numeric value and origin. Interpreting a
token leaves all other tokens unchanged.
