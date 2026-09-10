# Working lexical companion

src/lexical.ts implements the working productions in Chapter3, not the
historical tokenizer's unresolved capacities and empty-token behavior.
It retains full spelling, distinguishes integer and decimal tokens without
converting them to JavaScript numbers, and preserves punctuation-bearing
tokens for grammar-specific interpretation. OTHER means neither an ordinary
word nor a number; a grammar may still recognize a literal such as CTL-C.

One invocation returns one segment and its boundary plus unconsumed text.
A semicolon is identified without discarding its suffix: ordinary command
processing treats that suffix as a comment, whereas TELL can use it as message
text. This mechanism does not itself identify free-text SET NAME or GRIPE
positions, execute a slash segment or decide whether it is a command or reply.

Leading, repeated and trailing comma operands return REVIEW_REQUIRED, as do
empty slash segments. The caller identifies a segment following a slash so
an empty final segment is not mistaken for an ordinary blank submitted line.
These are companion guards, not new diagnostics or adopted rejection rules.
Line-ending encodings are excluded from the submitted-line input contract;
input editing and echo remain separate. Standalone signs and decimal points
remain nonnumeric under the working productions, not a resolution of C-009.

Five tests cover separators, whole-token classes, boundary/text preservation,
empty-operand guards and large integer spellings. Chapter11's three tested
scenarios now begin with their written command lines and this segment lexer.
Their dispatch is still fixture-directed; no general command-recognition or
grammar-conformance claim follows. Existing semantic recovery tests remain
responsible for their stated, already classified input domains.

Check: logs/spec1.0-nova/lexical-segments-check.log.

The companion command-recognition.ts now applies Section4.1's complete
ordinary vocabulary to the first lexical token. It deduplicates the torpedo
spellings by command identity and does not filter candidates by game-state
eligibility. Five tests check every documented minimum and longer canonical
prefix, ambiguous initials, torpedo aliases, lexical input classes and exact
diagnostics. GETCMD:1240–1255 and MSG.MAC:7,92,372 supply failure text and the
non-short help suffix. Full-spelling behavior remains the C-008 working rule.

The Chapter11 test helper now verifies actual command recognition against
this vocabulary before invoking each scenario's semantic operation. It is
still not a general operand parser, acquisition loop or command executor.
Check: logs/spec1.0-nova/command-recognition-check.log.
