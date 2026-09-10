# Evidence for IMPULSE

Austin source review for Section 7.2. This is not original-executable
differential verification. Shared movement evidence is in [07-move.md](07-move.md).

| Subject | Source | Finding |
| --- | --- | --- |
| Entry and device check | DECWAR.FOR:2138–2156 | IMPULS checks KDIMP against KCRIT, not KDWARP; damage below the threshold does not impose a second limit |
| Input and own position | DECWAR.FOR:2157–2174; LOCATE/RELOC at 1396–1515 | Shares MOVE's destination forms, computer checks, prompts, and own-position retry; malformed retry questions remain C-009/C-010 |
| Distance and rejection | DECWAR.FOR:2175–2192 | Maximum absolute coordinate displacement must equal one; green/undock precedes rejection, extending C-005 to IMPULSE |
| No overheating | DECWAR.FOR:2180–2201 | Impulse branch goes directly to path processing for distance one and cannot enter the overheating branch |
| Path, expenditure, towing | DECWAR.FOR:2217–2251 | Same path operation and 40 stored-unit base cost at distance one, doubled for shields and tripled for towing; displayed quantities divide by ten, as documented in MOVE evidence |
| Output | MSG.MAC:95,131–132,144–145 | Engine failure, range diagnostic with long prefix, and shared collision warning; exact capitalization and spaces retained |
| Readiness | DECWAR.FOR:2157,2252–2254 | Uses the same deadline calculation as MOVE; no impulse-specific shorter delay |

The shared path, towing, completion, randomness, and readiness questions are
not resolved by introducing this entry. In particular, the source's early
unused overheating draw is not elevated to a game rule. Examples are immediate
command outcomes; they do not establish whole-turn equivalence.
