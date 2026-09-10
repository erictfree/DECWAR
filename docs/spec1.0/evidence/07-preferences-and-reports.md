# Preferences and ship-report evidence

Austin source review for Sections 7.4–7.7, not original-executable verification.

TYPE report completeness follow-up: DECWAR.FOR:4583–4595 ends OUTPUT after
its terminal line and OPTION after the two enablement lines. OPTION starts
with CRLF and DECVER plus one line ending. MSG.MAC:44 fixes DECVER as
`[DECWAR Version 2.3, 20-Nov-81]`; MSG.MAC:278–279,367–368 supplies enabled
and disabled option text. Section7.5 now gives the complete historical OPTION
string and the banner-versus-specification identity alternatives, without
adopting a replacement. No hidden count or verbosity-dependent report branch
remains to be specified; terminal selection and banner policy are C-011.

| Entry | Source | Findings and remaining scope |
| --- | --- | --- |
| SET | DECWAR.FOR:3624–3738; MSG.MAC:259–277 | Ordered setting lookup; five preference assignments; missing/non-word prompting versus silent unrecognized-word return; no success acknowledgment |
| NAME | WARMAC.MAC:3421–3447 | Historical line rescan, uppercasing and truncation are C-011, not adopted as player-identity architecture |
| TYPE | DECWAR.FOR:4540–4595; MSG.MAC:8–9,278–279,360–370 | Ambiguous O, output order and literal labels, option enablement independent of presence; terminal line and banner remain C-011 |
| DAMAGES | DECWAR.FOR:783–838; MSG.MAC:6,41–43; WARMAC.MAC:1668–1680,1939–1967,2049–2089 | All-functional shortcut before selectors; selector order and duplicates; positive-only default; device labels, field widths and header spacing |
| STATUS | DECWAR.FOR:3860–3979; MSG.MAC:249–251,292–307; WARMAC.MAC:1939–1967,2090–2118 | Full-report order, selected-field order, absolute location override, hull versus device damage, radio-damage precedence, verbosity-specific prefixes |
| POINTS | DECWAR.FOR:2893–3046; MSG.MAC:209–247 | Default subjects, fixed column order, category suppression, committed scores, cumulative counters, unguarded quotients; C-013 and layout remain unresolved |

Dispatch returns these commands to command acquisition without completed-turn
processing. The entries specify their own effects, not a guarantee that no
autonomous activity or previously pending output occurs around them.

The PlayerPreferences ADT separates game-facing choices from terminal/account
representation. Initial values and reentry retention have not been audited;
do not infer them from commented-out setup code. Existing initial absolute-input
language still requires reconciliation with the initialization review.

STATUS coordinate formatting, signed numeric fields, and finer-than-tenth
quantities remain explicit output dependencies. No claim of complete transcript
conformance is made. SET terminal/name/admin branches and TYPE banner/terminal
output remain incomplete scope-dependent parts of their entries.

Report follow-up: STATUS:3919–3920 forces PRLOC with width zero, absolute and
short formatting, so LOCATION is bare `vertical-horizontal` at every verbosity.
OSFLT (WARMAC.MAC:1948–1951) selects the negative-zero path for zero; its sign
occupies the integer field (ONUM:1883 onward). Added explicit zero and LOCATION
rules, plus five ship-report tests: full short/medium STATUS, selected long
fields with repeats and radio threshold, full long DAMAGES, and selector
duplicates/zero/all-functional behavior. These companions use resolved STATUS
fields and normalized DAMAGES word selectors. Malformed tokens, numeric
overflow/finer fractions and surrounding command interaction are not covered.

## Report recovery cases awaiting C-010 decision

These are source-derived traces, not captured original-executable transcripts.
Use short output, ship energy 1234.5 and hull damage 2.5. Only torpedo tubes
have device damage, 12.5; all other devices have zero damage. Input echo and
the following command prompt are excluded. `\n` denotes a newline.

| Input | Derived output | Source control flow |
| --- | --- | --- |
| `ST E Z D` | `\nE1234 %Syntax error\nD2 \n` | Unknown word emits error then continues |
| `ST E 3 D` | `\nE1234 \n` | Non-word ends report; later DAMAGE is not processed |
| `ST 3 E` | `\n\n` | An operand exists, so no full report; first non-word ends selected report |
| `DA Z T` | `\nTO    12\nTR     0\n` | Unknown device selector is silent; later T selects both codes |
| `DA TO 3 TR` | `\nTO    12\n` | Non-word after a word selector ends selected report |
| `DA 3 TR` | `\nTO    12\n` | First non-word selects the default positive-damage report, not an empty report |

STATUS:3866–3892 distinguishes no operands from a non-word first operand;
3893–3901 reports unknown words and continues; MSG.MAC:311 provides the error.
DAMAGE:790–802 distinguishes its all-functional shortcut, first non-word
default report, later non-word stop, and unmatched-word omission. These
commands therefore cannot share a generic reject-or-stop rule. None of the
listed cases requires stale operand values. Preserving versus replacing this
partial-output behavior was raised with the user; no response is assumed.

## Game-facing preference checks

SET:3652–3658,3684–3716 defines the five preference assignments; TYPE:4557–4584
and MSG.MAC:360–370 define their report order and text. Added a resolved-setting
companion checking every nonempty prefix of every allowed value, unrelated
property preservation, unrecognized-word no-op, and the five-line report after
two settings change. These tests exclude command/setting lookup, prompted input,
historical five-character recognition, terminal suffix and version banner.
Removed the stale TYPE note claiming Romulan enablement is absent from the ADT;
Galaxy.romulan now represents that distinction. No host-scope decision was made.

STATUS selector follow-up: DECWAR.FOR:3860–3905 defaults only on KEOL, then
prints selectors in sequence, emits SYNTAX for an unmatched word, and returns
on a non-word. Short output inserts a newline on that return, including after
an error's newline. The typed-token companion and three tests connect these
branches to existing field formatting. Full-word recognition remains the
working C-008 abstraction; C-010 recovery remains a discussion. DOCK:935–937
invokes STATUS after replenishment/output, so recovery cannot silently roll
back service. Check: logs/spec1.0-nova/status-selection-check.log (189 tests).

DAMAGES token follow-up: DAMAGE at DECWAR.FOR:783–836 checks for any positive
device damage first; a non-word at STOKEN selects its default branch. A later
non-word ends its selected report. Unknown words simply find no device match.
The new token companion connects these rules to the existing short-code
formatter and tests the contrast with STATUS. The review also corrected
statusFromTokens to recognize TORPEDOS, already explicitly accepted in Section
4.7; this was a companion omission, not a historical game change. All three
torpedo spellings now have a test. Log: logs/spec1.0-nova/damages-selection-check.log.

TYPE dialogue follow-up: DECWAR.FOR:4540–4559 checks non-word input before
the exact O ambiguity case, then OUTPUT and OPTION. Unknown/non-word input
prompts again; empty prompted input returns. TYPE does not clear GTKN's next
slash segment. MSG.MAC:8–9 and 360–361 supply the two leading-newline strings.
The first-token companion checks ordinary full-word prefixes and composes the
selected OUTPUT path with the five-line preference report. It does not adopt
the terminal suffix, banner, five-character suffix acceptance or raw-input echo.
Check: logs/spec1.0-nova/type-dialogue-check.log.

SET dialogue follow-up: DECWAR.FOR:3624–3718 dispatches the setting in fixed
order; each value loop uses the first response token after setting P=0. A
non-word repeats that value prompt, while an unmatched word returns unchanged.
The ordinary `setDialogue` companion connects these paths to setPreference,
with explicit guards for NAME/TTYTYPE and no privileged-setting semantics.
It consumes already-tokenized segments, not raw editing or echo, and retains
full-word recognition as the working abstraction. Four tests cover setting
prefix precedence, prompted pair/value distinction, non-word retry, unknown-word
termination and blank cancellation. Log: logs/spec1.0-nova/set-dialogue-check.log.
# Written selector composition, 2026-09-08

POINTS follow-up checks all15 nonempty subsets of personal/Federation/Empire/
Romulan subjects from written input, with reversed full aliases and repeated
short aliases. Independent expected headings and numeric rows verify fixed
column order, deduplication, committed-only scores and omission of player-count
rows for personal-only selection. Enabled-but-absent Romulan statistics remain
selectable. Positive denominators intentionally leave C-013 unresolved; the
test does not establish admission/completed-turn accounting rules. Log:
`logs/spec1.0-nova/points-written-subsets-check.log`.

Added composed lexer → command recognition → selector processing → short-output
checks for every ordered pair of seven STATUS fields (both space and comma
separators) and every ordered pair of nine DAMAGES device codes. These 179
written inputs cover reversed order, repeated selectors, mixed case, STATUS
full names/minimal prefixes and the TORPEDOS spelling. Expected rows are
independently specified in the fixtures; whole Galaxy values remain unchanged.
They do not settle malformed recovery or prove all numeric/output-length
boundaries. Log: `logs/spec1.0-nova/report-written-selectors-check.log`.
