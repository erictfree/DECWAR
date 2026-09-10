# Evidence for MOVE

Completion/tractor review, 2026-09-08: Section 7.1 now shows the oblique
placement conflict from DECWAR.FOR:2245–2250 numerically, without selecting
one result. The common movement caller at 103–115 completes only the issuing
player's turn; moving the partner does not invoke a second completion.
A blocked linked warp-3 example and its IMPULSE counterpart connect the
requested-distance cost to ordinary completion with two players. Neither
changes the linked ship's position or repairs it. They avoid C-006 placement
by blocking the first step, not by defining a substitute towing algorithm.
These are source-derived prose scenarios, not new executable transactions.

Non-normative source review for the first command entry. This is not an
original-executable differential verification. Only the authorized Austin
archive supplies the rules below; port fixtures are corroborating evidence.

| Subject | Evidence | Interpretation or open issue |
| --- | --- | --- |
| Command spelling | `legacy/utexas/DECWAR.FOR:437–470,1245–1250`; `legacy/utexas/WARMAC.MAC:3676–3720` | Unique prefix M; coordinate words and roster names use prefix matching. Five-character comparison/storage is not adopted as a language rule. |
| Numeric tokens | `legacy/utexas/WARMAC.MAC:1445–1548` | Decimal digits and leading sign; LOCATE requires integer token types. General separators, chaining, comments, and editing remain for the lexical chapter. |
| Coordinate forms and prompts | `legacy/utexas/DECWAR.FOR:1396–1525,3700–3708`; `legacy/utexas/MSG.MAC:39–40,78–87,152` | Absolute/relative defaults, computed positions, omitted coordinates, blank cancellation, range errors. Syntax diagnostics beyond the command-specific cases still need consolidation. |
| Engine checks and rejection | `legacy/utexas/DECWAR.FOR:2138–2200` | Critical damage precedes input; own-position retry; green/undock precedes speed rejection (C-005). |
| Quantities | `legacy/utexas/WARMAC.MAC:1939–1967`; `legacy/utexas/PARAM.FOR:28–29`; `legacy/utexas/DECWAR.FOR:2218–2221` | OFLT divides stored quantities by ten. Critical damage is 300 displayed units; movement costs 4w² displayed energy units, doubled shields and tripled tractor. |
| Overheating | `legacy/utexas/DECWAR.FOR:2159–2160,2201–2216`; `legacy/utexas/WARMAC.MAC:2293–2320` | Integer draw 1..100, thresholds >90 and >80. Damage draw 1..4000 represents 0.1..400.0 units. Repair estimate is floor(D/3)/10, not D/30 without truncation. Uniform independent draws are a proposed abstraction; generator and early unused draws are not specified. |
| Path | `legacy/utexas/DECWAR.FOR:705–795` | Major axis advances one sector; vertical wins ties as called by MOVE. CHKPNT executable test gives floor(100x) mod 100 in 41..59, contrary to the nearby informal 0.40/0.60 description. Draft uses exact mathematical interval [0.41,0.60); floating boundary effects remain C-006. |
| Towing | `legacy/utexas/DECWAR.FOR:2243–2250` | For fractional step s, board placement uses final-int(s), but stored position uses int(final-s). These can differ. A pure single-position model cannot preserve both; last-vacated-sector placement is a proposal, not an accepted rule. Towed docked status is not cleared here. |
| Output | `legacy/utexas/MSG.MAC:74,85–87,131–145,381`; `legacy/utexas/DECWAR.FOR:2184–2216,2251`; `legacy/utexas/WARMAC.MAC:1939–1967` | Exact command message text, verbosity alternatives, numeric field widths, missing final newline in maximum-warp diagnostic, leading blank line for collision warning. |
| Completion | `legacy/utexas/DECWAR.FOR:110–114,223–253,1195–1210,3190–3220` | Accepted move invokes ordinary repair then shared turn processes. Each device loses up to 30 displayed damage units. Energy exhaustion is checked on return to command acquisition. Full shared transition remains to be defined. |
| Readiness | `legacy/utexas/DECWAR.FOR:2157,2253,1199–1202`; `legacy/utexas/SETUP.FOR:388–391` | Nominal deadline 2–4 seconds from before coordinate input, tied to terminal class. COMPUTED also has a terminal-speed pause at 1441. No terminal architecture or privileged bypass is adopted; see C-007. |

The examples use unambiguous cardinal paths for obstruction. The oblique clear
examples reach their integer destination regardless of intermediate tie draws.
They specify immediate movement effects, not a complete turn transcript.

## Review against the complete command grammar

The revised entry defines `move-command` and references `destination` and
`coordinate-response` from Section 4. Numeric bounds and vessel presence are semantic checks, not
additional grammar restrictions. DECWAR.FOR:1422–1439 establishes per-response
coordinate defaults and the computed computer check; 1474–1515 establishes
integer-coordinate bounds and diagnostic selection. MSG.MAC:83–84 calls the
vertical/horizontal errors X/Y respectively; the entry retains that output.

DECWAR.FOR:2162–2186 distinguishes the initial missing-coordinate loop from
the own-position retry and checks the absolute warp limit before the damaged
engine limit. The entry now states that order. Modifier-only recovery during
an own-position retry is still C-009, not proven equivalent to the uniform
response grammar. No character decision was resolved by this editorial pass.
