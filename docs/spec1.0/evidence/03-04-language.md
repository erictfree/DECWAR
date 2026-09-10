# Evidence for lexical structure and command grammar

Non-normative evidence for the first lexical/grammar increment. The scope is
the input needed by MOVE, not every command or historical terminal operation.

- Austin `legacy/utexas/WARMAC.MAC:838–898` classifies space/tab, comma, slash,
  semicolon, signs, digits, and decimal point. `NXTT.` at 1445–1508 scans
  through a whole token, uppercases input, and stops on those boundaries.
- `ANUM.` at 1509–1548 recognizes signs, digits, and decimals; `GTKN` at
  1416–1437 assigns integer/decimal/non-numeric/empty token classes. The draft
  requires at least one digit in a number. Bare signs, bare points, repeated
  commas, and other empty-token cases are left open in C-009.
- `EQUAL` at 3676–3720 implements prefix recognition; `GETCMD` in
  `legacy/utexas/DECWAR.FOR:1245–1250` rejects multiple command matches.
  Historical comparison sees at most five characters. Full-spelling prefix
  recognition is explicitly a working abstraction pending C-008.
- `LOCATE/RELOC` in `DECWAR.FOR:1396–1525` supplies the coordinate forms,
  integer-only operand checks, vessel name lookup, prompt, and cancellation.
  Modifier recognition precedes operands. Each RELOC reinitializes offsets
  from ICFLG, so a modifier-only response does not persist its mode.
- `MOVE` at `DECWAR.FOR:2162–2175` prompts for absent coordinates and retries
  an own-position destination. Its label-600 retry does not handle all
  malformed/empty responses identically to its initial prompt; the draft does
  not adopt stale operand reuse. This remains part of C-009.
- `SET ICDEF` at `DECWAR.FOR:3700–3708` changes the default; ordinary LOCATE
  modifiers do not assign ICFLG. Initial absolute input is also documented in
  `legacy/utexas/HLP/DECWAR.RNH:316–328`.
- `GTKN` at `WARMAC.MAC:1386–1407` can consume a remaining segment without a
  fresh line read. `NXTT.` leaves a slash boundary available for the next call
  and discards the remainder after a comment. General chaining/dialogue
  ordering is explicitly unfinished; no transaction model is inferred.
- Austin help at `HLP/DECWAR.RNH:289–345` corroborates ordinary separators,
  slash chaining, comments, abbreviations, and coordinate forms. Its terminal
  descriptions and computed-coordinate restriction are secondary to executable
  statements and are not adopted as machine-dependent language architecture.

The draft narrows its grammar to known word/integer/decimal spellings and the
MOVE forms. Other non-numeric tokens, free text, diagnostics, raw control keys,
limits, and complete command vocabulary remain later increments. No source
archives or runtime behavior were changed; no executable parity is claimed.
