# 3. Lexical structure

Player input consists of lines of text. Lexical analysis identifies tokens and
boundaries within each line. The grammar then determines how those tokens form
a command or a response to a prompt.

This section defines the vocabulary used by the command grammar. Section 4
also identifies commands that consume free text instead of ordinary tokens.

## 3.1. Notation

The lexical rules and command grammar use extended Backus–Naur form (EBNF).
`=` defines a production; `,` joins successive elements; `|` separates
alternatives; `[ ... ]` denotes an optional element; and `{ ... }` denotes
zero or more repetitions. Parentheses group alternatives. A semicolon ends
a production. Quoted text denotes literal input, and `? ... ?` describes a
character class in words. Names containing hyphens denote productions.

In lexical productions, successive elements are adjacent characters. In the
command grammar, successive tokens are separated according to Section 3.3.

## 3.2. Words and numbers

Command names, keywords, and vessel names are words. Their letters are drawn
from the Latin alphabet `A` through `Z` and `a` through `z`. Letter case does
not affect recognition: `MOVE`, `Move`, and `move` denote the same word.
Case conversion for recognition does not define how free text is displayed.

```ebnf
letter = ? A through Z or a through z ? ;
digit = "0" | "1" | "2" | "3" | "4"
      | "5" | "6" | "7" | "8" | "9" ;
digits = digit, { digit } ;
word = letter, { letter } ;
sign = "+" | "-" ;
integer = [ sign ], digits ;
decimal = [ sign ], (digits, ".", [ digits ] | ".", digits) ;
```

An integer denotes its signed base-ten value. Leading zeros do not change
that value, and `-0` and `+0` denote zero. A sign belongs to the number and
must be adjacent to its first digit or decimal point. A decimal denotes its
signed base-ten value but remains a different token class from an integer:
`20.0` is not an integer token even though its value is integral. The current
coordinate grammar accepts integer tokens only.

A token extends to the next separator, command boundary, comment marker, or
line boundary. Its entire spelling must match the required token class.
Thus `M20`, `20-21`, and `MOVE!` are not split into smaller valid tokens;
none is a word or number in these productions. Quotation marks do not provide
a general quoting or escaping facility.

The grammar also uses literal tokens containing punctuation: `&`, `*`,
`CTL-C`, privileged command names beginning with `*`, and terminal-type names
such as `ADM-3A`. These remain single tokens and are recognized only in the
positions that explicitly permit them. They do not extend the `word`
production or make punctuation a general token separator.

*Examples:* `-03` is an integer with value -3; `+.5` is a decimal with value
0.5; `3.` is a decimal with value 3. `- 3` is not one signed integer, and
`2e3` is not a decimal literal.

> **Reviewer note — recognition limits (C-008):** Historical word recognition
> retains only five characters. The working productions retain the complete
> spelling. Decide whether accepting words solely on their first five
> characters is character worth preserving. Input-length, token-count, and
> numeric limits also need explicit language decisions rather than inherited
> storage limits.

## 3.3. Separators

Spaces and horizontal tabs separate tokens; a run of either has the same
effect as one space. A comma also separates tokens and may have spaces or
tabs on either side. Leading and trailing spaces and tabs have no meaning.

```ebnf
space = " " | ? horizontal tab ? ;
spacing = space, { space } ;
separator = spacing | { space }, ",", { space } ;
```

The grammar requires one separator between successive word or numeric tokens.
Punctuation that separates commands or begins a comment does not require an
additional separator.

For example, `M A 23 22`, `M A 23,22`, and `M,A,23,22` have the same four
tokens. The pair `23-22` is not equivalent to `23,22`: a minus sign does not
separate coordinates.

> **Reviewer note — empty operands (C-009):** Leading, trailing, and repeated
> commas can expose historical empty-token behavior. The working separator
> rule covers commas between nonempty tokens; it does not settle those empty
> cases. Standalone signs and decimal points likewise remain outside the
> working numeric productions pending review.

## 3.4. Command and line boundaries

A slash (`/`) ends one input segment and begins the next on the same line.
For example, `M A 23 22/M R 1 0` contains two segments. A segment contains
the tokens supplied to one command or to one prompted response. Section 4
defines those uses; segmentation alone does not execute them.

Outside a command-specific text field, a semicolon (`;`) ends the current
segment and begins a comment extending to the end of the line. Slashes and
other punctuation inside that comment have no command meaning. Thus
`M A 23 22; approach / M R 1 0` contains only the first movement request.
A line containing only spaces, tabs, and an optional comment supplies no
command tokens.

A *line boundary* is the end of one submitted line. No token continues across
that boundary. The lexical model uses this abstract boundary; terminal keys,
line-ending encodings, editing, echo, cancellation, and command repetition
belong to the input-interaction rules.

`TELL` uses the text after its recipient-list semicolon as a message.
`SET NAME` consumes name text, and `GRIPE` enters a multiline text interaction.
These fields use the text rules in Sections 4.10–4.12. Their characters are
not first split into words or stripped as comments.

> **Reviewer note — interaction:** Empty slash segments and the consumption of
> chained segments during prompted input still require explicit rules.
