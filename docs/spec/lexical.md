# Lexical rules

Status: directly reviewed against Austin's command-input source. Numeric REAL
conversion, unusual control delivery and token-capacity boundary behavior retain
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

An ordinary integer/alphanumeric token retains its first five transformed
characters. Numeric accumulation continues beyond those five characters; the
retained name and numeric value are distinct. An alphanumeric token's numeric
value is zero. Decimal-point processing has a separate retained-text uncertainty
(U-REAL-TOKEN); the five-character rule must not be generalized to that path
without resolving it.

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

The source token arrays have 15 positions, including an end sentinel, and the
scanner reserves capacity while scanning. Overflow emits
`Too many words -- line ignored`, discards the command remainder and reports an
empty token sequence. The exact delimiter-sensitive last-slot acceptance boundary
requires conformance cases before this clause can specify every 14-token input
(U-TOKEN-LIMIT). It must not be advertised simply as 15 arguments.

**Evidence:** [GTKN capacity/recovery](../../legacy/utexas/WARMAC.MAC#L1407).
