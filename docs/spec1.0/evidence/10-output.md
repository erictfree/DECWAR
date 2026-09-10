# Output-field evidence

WARMAC.MAC:1870–1967 defines decimal padding and signs, including signed-decimal
zero as negative and short decimal suppression. The specification describes
displayed quantities, not their stored scale. Finer-than-tenth conversion
remains open. Fixed-width overflow is now defined below.

WARMAC.MAC:1976–2038 defines object report names and optional trailing space.
These differ from scan glyphs and do not include numeric base identities.
TAB:1673–1679 advances to one-based requested column; hcpos is reset to zero
at newline. LSTOBJ:2084–2136 requests columns 14/5.

DECWAR.FOR:3078–3098 defines PRLOC components, signs, widths, BOTH separation,
and zero-width own-location relative suppression. Section 10's examples use
nonoverflowing values and explicit output settings.

## Fixed-width overflow

ONUM:1891–1926 reserves a position for an emitted sign before extracting
digits. On exhaustion of a positive field width it retains that sign and
replaces the collected digit positions with asterisks. Width one with a sign
can overflow before collecting any digit, leaving only the sign. OFLT/OSFLT:
1942–1967 append the original fractional digit after ONUM returns even if the
integer field overflowed, unless output is short. Thus width2 examples are
ordinary100 -> **, signed100 -> +*, signed-100.2 -> -*.2; signed decimal zero
at width1 is -.0. Width zero remains free format.

Section10.2 defines these visible outcomes without the implementation's
stack or number representation. The existing companion overflow guards are
replaced by the rule; tests cover signs, exact fit/free width, fractional
suffixes and the sign-only case. STATUS stardate and DAMAGES device fields
also exercise it without changing the underlying quantities. Source inspection
establishes this formatting rule; the tests are not original-executable
transcripts. Checks: logs/spec1.0-nova/numeric-overflow-check.log.
