# Shared interaction evidence

The confirmation test is the call to EQUAL with YES in DECWAR.FOR:141 (QUIT),
3772 (SHIELDS) and WARMAC.MAC:3832–3835 (NEWS). EQUAL at 3690–3727 rejects
empty strings and accepts matching nonempty prefixes. Since YES is only three
characters, the five-character recognition limit does not introduce additional
affirmative words. Each caller examines only the first response token and has
no invalid-answer retry branch. Chapter 5 expresses this as Y, YE or YES.

QUIT clears input before GTKN (DECWAR.FOR:139–140); SHIELDS does not
(3770–3772). GTKN at WARMAC.MAC:1386–1406 reuses remaining input segments
unless it must obtain a new line. This supports the distinction between
SHIELDS .../NO and QUIT/YES. Exact input-echo/newline behavior, other prompt
families, empty-segment recovery and NEWS input-source switching remain open.

The chapter does not introduce process state, a generic prompt engine, or a
uniform rollback policy. Its execution distinctions summarize existing
Sections 7, 9 and 10 and explicitly preserve incomplete interactions.

Validation: logs/spec1.0-nova/interaction-check.log (existing spec suite and
grammar consistency); interaction-diff.log (whitespace). No full raw-input
confirmation transcript is claimed by those checks.

## Single-destination resolution

LOCATE/RELOC at DECWAR.FOR:1404–1525 initializes offsets for each call,
checks COMPUTED device eligibility before an empty computed operand result,
checks numeric cardinality then all integer types before bounds, and checks
vertical before horizontal. MSG.MAC:78–84 supplies diagnostic text, including
X/Y rather than vertical/horizontal wording. The exact-two rule applies to the
single-destination callers, not PHACON's maximum-three or TORP's maximum-seven
numeric slots. Section 5.5 states that boundary explicitly. Malformed computed
forms and caller-specific retry exceptions remain open.

## Weapon quantities and diagnostic precedence

LOCATE's negative bounds allow three expanded operands for PHACON and seven
for initial TORP input. Its numeric branch checks count and all token types
before coordinate bounds; odd cardinality preserves the first integer without
offset/bounds conversion. PHACON rejects result length one at 2658–2660;
TORP tests the resolved first value as the count only after LOCATE returns.
Target-only RELOC uses a bound of twice the selected burst count.

In the computed branch, the optional initial integer is preserved, names each
expand to two coordinate values, and the loop at 1459–1476 runs backwards.
Section 5.6 documents reverse error precedence as C-010 discussion, while
retaining original written target order for launching. The six diagnostic
examples follow explicit branches; they are not original-executable transcripts.
Check: logs/spec1.0-nova/weapon-input-check.log (existing suite, not raw parsing).

## Single-destination input composition

src/destination.ts connects Chapter3 lexical classes to Section5.5 resolution
for MOVE, IMPULSE, BUILD and CAPTURE. Seven tests cover written command heads,
numeric mode/default handling, count/type/bounds precedence, omitted versus
empty-response input, computer threshold, roster/Romulan presence and returned
position snapshots. The component reads only the needed projection of the
galaxy and makes no game-state change. Numeric spellings are evaluated exactly
before the 1..75 bound; internal BigInt calculation does not introduce a new
game type or adopt historical numeric/line capacities.

Malformed computed forms return an explicit review guard, not a fabricated
error or acceptance rule. The helper does not bypass command-specific checks
that precede resolution, perform movement/construction/capture, choose retry
policy, or decide completion/readiness. In particular, a shared resolved
destination is not evidence of the issuing command's legality at that position.
The source basis remains LOCATE/RELOC as cited above. Check:
logs/spec1.0-nova/destination-check.log.
