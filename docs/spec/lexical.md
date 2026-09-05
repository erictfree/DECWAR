# Lexical rules

Status: directly reviewed against Austin's command-input source. Numeric REAL
conversion, unusual control delivery and exceptional token-capacity behavior retain
explicit open questions below. These rules concern command input, not the
separate captain-name reader or raw message bodies.

## LEX-1 — Characters and case

The command-input alphabet consists of character codes 0 through 127. Unicode
normalization, locale-dependent casing and acceptance of larger codes are not
part of the core. A client binding must describe how it supplies these codes.

During token accumulation a character whose code exceeds octal 137 (decimal 95)
MUST be replaced by that code minus octal 40 (decimal 32). Other characters remain
unchanged. This includes punctuation: a grave accent becomes `@`, `{` becomes
`[`, `|` becomes backslash, `}` becomes `]`, and `~` becomes `^`. It is not simply
alphabetic case folding. Classification for skipping spacing occurs separately.

**Evidence:** [Austin WARMAC NXTT.](../../legacy/utexas/WARMAC.MAC#L1454),
[character table](../../legacy/utexas/WARMAC.MAC#L838).

## LEX-2 — Line acquisition and editing

The ordinary command reader MUST ignore carriage return. Line feed, vertical tab,
form feed, NUL, Ctrl-Z and ESC terminate an acquired line when delivered to this
reader. Ctrl-C has an end-of-line classification but also an interrupt path; it
must not be specified solely as ordinary text (see U-CONTROL).

At most 80 ordinary characters are retained per newly acquired line. Reaching
that limit completes the line without waiting for an additional terminator.

| Delivered character | Required reader action |
| --- | --- |
| Backspace or DEL | Remove the last retained character; an empty line remains empty. |
| Ctrl-U | Clear the retained line and request a new output line. |
| Ctrl-R | Redisplay the retained line. |
| Ctrl-G | Redisplay the retained line in Austin. It does not select the commented-out echo-toggle action. |
| ESC as the first nonignored character | Reuse the previous acquired line and mark it as repeated. |
| ESC after another nonignored character | Finish the new line. |

A backspace or Ctrl-U received before ESC prevents the first-character repeat
case even when the edited buffer is empty. TELL separately rejects repeated input.
These editing rules do not imply that every terminal or monitor delivers every
control unchanged. Physical echo and output control sequences are specified in
the terminal section, not inferred from an input flag's name.

**Evidence:** [INLI. and NXCH.](../../legacy/utexas/WARMAC.MAC#L1542),
[CBITS](../../legacy/utexas/WARMAC.MAC#L838). **Open:** U-CONTROL.

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

A token has retained text, a category, a numeric value and an origin position in
the acquired line. The categories are null, integer, REAL, alphanumeric and end
of command. End of command is a sentinel, not an ordinary argument.

Every scanned token's own text field retains its first five transformed
characters. Numeric accumulation continues beyond those five characters; the
retained name and numeric value are distinct. Immediately after scanning an
alphanumeric token its numeric value is zero. A later decimal token can overwrite
earlier numeric fields under LEX-8 without changing their categories. Decimal
processing therefore requires more than truncating a string to five characters.

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

Integer digits accumulate in decimal by multiplying the preceding value by ten
and adding the next digit; a leading minus is applied after accumulation. An
implementation MUST NOT use the five-character retained token as the complete
numeric input. Overflow and trap outcomes outside the reviewed arithmetic domain
remain U-NUMERIC, not implementation-defined acceptance.

REAL decimal input accumulates the integer part, converts it at the decimal
point, then incorporates each fractional digit using a growing decimal scale.
It does not use exponent syntax. The historical per-digit operations introduce
rounding effects distinct from a single modern decimal conversion. Exact abstract
arithmetic operations for this path remain to be specified under U-NUMERIC;
ordinary host floating-point parsing is not established as conforming.

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

The token arrays have 15 positions. At most 14 scanner results precede the end
sentinel; the command name counts toward this capacity. Null results created by
nonspacing delimiters also occupy positions. For each result, the scanner checks
whether it has observed an end-of-command character before advancing the capacity
counter. If so, it accepts that result and appends the sentinel. Otherwise,
exhausting the fourteenth position is overflow even if the next input character
would end the line.

At the first position, an empty end-of-command result yields zero tokens. At a
later position, an empty end-of-command result is retained as a null token before
the sentinel. Spaces/tabs are skipped when looking for a token and after a token;
a comma is consumed as one delimiter without reading the character after it in
that token scan. Consequently fourteen nonempty tokens followed only by spacing
and line termination fit, but fourteen followed by a comma overflow. Thirteen
nonempty tokens followed by a comma and termination fit with a fourteenth null
result.

Overflow emits `Too many words -- line ignored` with no suffix from the Austin
ASCIL macro, discards the entire remaining physical line, sets the returned count
to zero and writes the end sentinel at the first position. Earlier token storage
is not all erased; it is outside the returned sequence. Subsequent interpretation
must respect that count/sentinel rather than treating stale token fields as input.
These rules require scanning to return normally; arithmetic-fault continuation
remains U-NUMERIC. LEX-8 does not alter this outer token-capacity counter.

**Evidence:** [GTKN capacity/recovery](../../legacy/utexas/WARMAC.MAC#L1407),
[NXTT delimiter handling](../../legacy/utexas/WARMAC.MAC#L1454),
[character classes](../../legacy/utexas/WARMAC.MAC#L838).

## LEX-8 — Decimal text spill

The first decimal point accepted by the numeric scanner resets the text-deposit
allowance to 17800626176 before that character is deposited. This is a positive
integer much larger than an ordinary input line. It is the same allowance that
initially limited deposits to five characters; it is not an independent decimal
scale counter. A later invalid numeric character does not undo this reset.

For each token, start with an allowance of five and a deposit position of zero;
clear that token's text field. Process transformed characters in source order.
First perform the numeric-character handling, including the reset just described
if applicable. Decrement the allowance. If it is nonnegative, deposit the
character at the current deposit position and advance that position. Otherwise
skip the deposit without advancing its position. Numeric processing and input
consumption continue whether or not a deposit occurs.

Consequently the token's own text field always receives its first five
characters. A decimal point after a longer integer prefix resumes deposits at
the sixth position: skipped prefix characters are not restored. After the reset,
remaining ordinary-line characters can spill into subsequent fields. No later
numeric error restores the five-character limit or rolls back those deposits.

Define the spill's observable state effects through a logical sequence of
thirty encoded fields: the fifteen token-text fields followed by the fifteen
token numeric fields. This sequence specifies cross-field updates; it does not
require contiguous storage in an implementation. Each encoded field has a
36-bit residue. Text has five seven-bit character positions with weights
2^29, 2^22, 2^15, 2^8 and 2^1. The unselected bits are preserved by a deposit.

For token i (positions are one-based), deposit position j (zero-based) selects
logical field `i + floor(j/5)` and character position `j mod 5`. With selected
weight 2^s, old residue E and transformed character c, replace E by
`E + (c − (floor(E/2^s) mod 128)) × 2^s`. This preserves the other character
positions and the low bit. For a numeric field, this is a change to its encoded
value, not decimal parsing of the deposited letters. Categories are not changed.
Integer encodings use the signed 36-bit interpretation; interpretation and
exceptional use of affected REAL encodings remain subject to U-NUMERIC.

Scanning later tokens clears and overwrites their own text fields normally.
Finishing the current token assigns its own numeric value; finishing the command
clears the sentinel's text/numeric fields and assigns its end category. These
later writes can overwrite spilled characters. Earlier numeric fields affected
by the spill are not automatically repaired. The ordinary 80-character acquired
line and fourteen-result bound prevent these deposits from reaching beyond
numeric field 12; category and origin arrays are not deposit targets in that
domain. Raw-name acquisition and exceptional control paths are outside it.

**Evidence:** [NXTT/ANUM](../../legacy/utexas/WARMAC.MAC#L1454),
[field order](../../legacy/utexas/WARMAC.MAC#L376),
[compiled reset/deposit evidence](evidence.md#compiled-tokenizer-observations),
[byte operations](../platform-manuals.md#byte-deposits-and-token-text).
