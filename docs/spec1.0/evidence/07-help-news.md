# HELP and NEWS evidence

## Topic-name and precedence correction — 2026-09-08

Reviewed HELP's two SLST calls at WARMAC.MAC:4168–4180, SLST's accumulation
of all matches at 4305–4320, EQUAL's prefix comparison at 3690–3724, and
the additional lookup table at DECWAR.FOR:471–480. The earlier statement
that HELP IN selects INPUT was incorrect: both INTRO and INput match, in
that order. INP selects INPUT; INT selects INTRO. Uppercase display letters
do not constrain the comparison. Corrected Section 7.21 and added ordinary
lookup cases, including command-first shadowing and continued processing
after ambiguity. Grammar now names INTRO rather than introducing an
unsupported full-spelling alias INTRODUCTION. Historical acceptance of the
latter follows five-character comparison and remains C-008, not a separately
adopted alias. These are source-derived lookup cases, not corpus adoption or
original-executable transcripts.

## NEWS supplied-text display — 2026-09-08

NEWS:3818–3849 outputs ordinary text without a wrapper, recognizes a period
only after characters012–014, resets boundary state after accepted continuation,
and tests interruption after emitting a boundary. This differs from SHLP's
form-feed suppression and topic-loop cleanup. Added a supplied-text companion
and three checks: literal first/repeated periods, separate waiting/declining,
restart, and interruption before an ensuing continuation prompt. It takes
already-separated first response tokens and a scenario-selected interruption
boundary; it does not implement raw input or choose a corpus. Log:
`logs/spec1.0-nova/news-display-check.log`.

## Lookup versus topic failure and interruption — 2026-09-08

WARMAC.MAC4154–4183 has no unconditional initial newline for explicit lookup
errors; SLST:4319–4350 emits ambiguity/unknown diagnostics and ends them with
CRLF. The RED branch4138–4148 bypasses topic handling. SHLP:4221–4233 emits
a newline before resource access; 4276–4282 reports a missing resolved topic,
distinct from lookup failure. Source spelling is the resolved display entry,
not necessarily the user's abbreviation. The resource warning is source data,
not authorization to model filesystem access in the abstract specification.

SHLP:4240–4253 detects interruption at line/form-feed boundaries; cleanup at
4287–4289 clears the flags before returning to HELP's topic loop. HELP:4158–4162
separately tests interruption before the next topic. Corrected the draft's
overbroad stop-all claim and recorded the boundary-dependent alternative under
C-010. Corpus and final interruption policy remain unresolved. These are
source-derived sequences, not native transcripts or executed full HELP tests.

NEWS continuation-input follow-up: WARMAC.MAC:3825–3835 switches input for
GTKN, tests the first token against YES, and resumes only on a nonzero match.
SETI at1291–1307 changes character-input selection but does not reset BUFPTR;
GTKN at1386–1407 consumes a pending slash segment before reading a new line.
NEWS therefore has no QUIT-style fresh-response requirement. Sections5.3 and
7.22 now define this and include a hypothetical two-section response matrix.
The preserved corpus cannot exercise those cases because it has no boundaries.
The examples are source-derived, not captured interactive transcripts; response
editing and interrupted-input restoration remain outside this closure.

HELP: WARMAC.MAC:4136–4245. RED refusal precedes eshp; topics are sequential;
command lookup precedes extra topics; ambiguous command lookup skips extra
lookup; * lists commands; hlpxtr emits general instructions. pshp restores
the historical marker. C-002 remains unresolved.

NEWS: WARMAC.MAC:3813–3854. No alert refusal or eshp; sequential character
output; line-boundary period is consumed as a prompt marker; YES resumes
immediately after it, not necessarily after a whole marker line. Interruption
ends viewing. No persisted read offset.

Authorized content exists under legacy/utexas/HLP/DECWAR.HLP and
legacy/utexas/HLP/DECWAR.NWS.
It has not yet been incorporated as the Austin Core normative output corpus.
Do not claim these entries self-contained or complete while that work remains.

## Corpus inventory and editorial boundary

`HLP/HLP.COM` identifies DECWAR.HLP as the edition **containing system
comments**, intended for password-enabled use rather than direct installation
as the ordinary game help file. `MAKHLP.MIC` selects the system variant when
requested. WARMAC.MAC:711–738 distinguishes privileged and ordinary help
locations. The available file must not silently become the ordinary-player
Austin Core corpus.

The preserved file contains 39 named sections: all 31 ordinary commands plus
INPUT, OUTPUT, DECINI, PREGAME, HINTS, PAUSES, CTL-C and CTL-T. A section marker
can follow a form feed as well as a newline; searching only line-start periods
misses INPUT and BASES. SHLP at WARMAC.MAC:4220–4296 suppresses section markers
and form feeds rather than displaying the whole formatted manual. The text
preceding the named sections is therefore not an implicit HELP topic.

The complete preserved NEWS payload, excluding its two trailing NUL bytes, is:

```text
                 Welcome Decwar Version 2.2 !!

This  version contains many bug fixes.  Computed coordinates now
work for terminals with speeds < = 600 baud.  The  TEll  command
should  work  now also.  If we should get a fatal program error,
please save your output!!   I  didn't  change  a  couple  of  KL
instructions in the lowseg as I think they are data.
```

The file has 370 bytes, CRLF line endings, and no line-boundary period markers.
Thus this particular payload does not exercise NEWS's continuation prompt.
Its Version 2.2 banner and terminal-speed/compiler maintenance claims are not
statements about the new Austin Core specification or future implementations.
The trailing NUL treatment is not established by this content inventory.

Inventory log: `logs/spec1.0-nova/help-news-inventory.log`. This maps available
content; it does not adopt it as normative output or verify a running HELP/NEWS
session. C-011 now includes selection of ordinary help and news content.

## HELP lookup and listing follow-up

DECWAR.FOR:437–480 defines the 31 ordinary displayed command names and eight
additional slots. The latter include one blank slot, INTRO, and no DECINI or
CTL-T. This lookup inventory is distinct from the 39 marked corpus sections.
The formatted corpus lacks a marked INTRO section, despite introductory prose.

WARMAC.MAC:4188–4219 defines the general/list prefixes and suffix. OLST at
4363–4381 starts its field counter at seven (despite its comment saying six)
and emits ten-character entries, including padding. SLST at 4301–4360 emits
unknown text and ambiguous matches. ASCIL at 21–24 appends a newline, so
`Could be:` ends a line before the first candidate. OSTB at 1781–1798 limits
diagnostic tokens to ten characters. Section 7.21 now defines these responses
self-containedly and retains the missing-topic content choice as discussion.

Checks of listing shape and the displayed lookup data are recorded in
logs/spec1.0-nova/help-listing-check.log. They are source/data checks, not
verification of the still-unselected topic corpus or historical terminal I/O.
