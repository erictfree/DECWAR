# ENERGY evidence

Working Section 7.12, not a complete conformance contract.

## Prompt-to-validation composition

DECWAR.FOR:1014–1025 tests a word and integer together, otherwise prompts and
replaces INDEX with 1 for the response. An empty response returns; a malformed
nonempty response repeats. Name lookup and later validation never jump back
to that loop. No remaining-token check follows the first pair: trailing input
is recorded as a C-010 discussion, not silently normalized. GTKN retains
following slash segments; ENERGY does not clear them before prompting.

The `energyDialogue` companion joins this collection path to `validateEnergy`.
It consumes typed tokens, distinguishing integer from decimal token classes,
and stops at READY before transfer arithmetic. Its output excludes input echo
and the reader's own segment newlines. Tests cover full-pair replacement,
decimal rejection/cancellation, semantic rejection without retry, trailing
tokens and nonconsumption of unused responses. This is not a raw-line parser
or a complete transfer/delivery verification.
Check log: `logs/spec1.0-nova/energy-dialogue-check.log`.

- DECWAR.FOR:1009–1062: leading newline, whole-pair prompting, roster resolution,
  ordered self/alive/faction/adjacency/reserve/positive checks. Reserve is strict
  and precedes capacity adjustment. No shield, docking, or device check.
- DECWAR.FOR:1063–1070: delivered amount is the lesser of truncated 90-percent
  request and receiver capacity; sender debit adds integer delivered/9.
  In displayed units these operations quantize to tenths. Floating evaluation
  of 0.9 is not imported into the abstract specification.
- DECWAR.FOR:85–89: dispatcher bypasses completed-turn processing.
- MSG.MAC:10,67–76,152,373: prompt and sender diagnostic text.
- DECWAR.FOR:2409–2416,2577–2587; MSG.MAC:180–181: recipient notification;
  long output has an initial newline. Source concatenation places two spaces
  before the receiver name in long output, prior to any ODISP formatting.

Remaining: arithmetic precision, name/number rendering, delayed-notice lifecycle,
and malformed suffix/continuation rules. Successful zero delivery to a full
recipient is not silently rejected. Energy changes precede recipient delivery.

Notification follow-up: OUTHIT:2578–2587 calls ODISP with a trailing-space
request for both names. Combined with MSG.MAC:180–181, long output therefore
has two spaces before `transfers`, two before the receiver name, and a trailing
space before newline. Compact output has one space after each name. Replaced
the incomplete prose with literal templates and tested long/medium/short plus
zero delivery. OFLT uses width zero and omits fractions only in short output.
These tests verify rendering of a supplied amount, not transfer arithmetic,
validation or notification scheduling.

The validation companion now exercises each rejection in order, including
absent-enemy presence before faction (unlike TRACTOR), name/self before amount,
adjacency before reserve, and the strict reserve check with a full recipient.
The syntax paragraph now distinguishes a parsed signed integer from the
semantic requirement for a positive amount. Checks do not adopt a precision
policy or claim a complete successful transfer; no ship is mutated by the
validator. Log: `logs/spec1.0-nova/energy-validation-check.log`.

Precision discussion follow-up: Section7.12 now gives explicit candidate
delivered/loss/debit equations and capacity-boundary examples. The surcharge
uses truncated delivered/9; at eight stored tenths delivered it is zero,
while at nine tenths it is one tenth. This is distinct from exact 10/9 debit.
The table check uses decimal-domain arithmetic, not PDP-10 floating-point
emulation or a claim about every multiplication by0.9. Log:
`logs/spec1.0-nova/transfer-discussion-check.log`. The choice remains deferred.
