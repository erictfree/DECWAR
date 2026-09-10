# Evidence for the expanded command grammar

This source review accounts for every named entry in the Austin command
dispatch tables. It is grammar coverage, not a full semantic audit or native
transcript verification. Historical ignored suffixes, capacity limits, and
malformed-input recovery remain open in C-008 through C-011.

## Ordinary commands

The 31 ordinary names come from `legacy/utexas/DECWAR.FOR:437–470`.
The final two entries are privileged. The torpedo command's stored spelling is
TORPEDOS; help also uses TORPEDO and TORPEDOES. The draft explicitly treats
those spellings as one command rather than depending on five-character
truncation. Minimum prefixes are determined against the whole command table.

| Commands | Primary executable evidence | Grammar use |
| --- | --- | --- |
| BASES, LIST, PLANETS, SUMMARY, TARGETS | DECWAR.FOR:1359–1389,1519–1747 | Shared group scanning; per-command selector availability; AND/&; ship-first lookup; ordered keyword checks; pair-before-range recognition. Mixed/order-sensitive constraints are flagged, not claimed exhaustive. |
| BUILD, CAPTURE | DECWAR.FOR:523–543,600–622 | LOCATE(2), including computed coordinates despite narrower help headings. |
| MOVE, IMPULSE | DECWAR.FOR:2141–2175 | Shared destination and prompt forms. |
| PHASERS | DECWAR.FOR:2647–2685 | LOCATE(-3): optional leading energy after modifier; one target; absent input prompts. |
| TORPEDOES | DECWAR.FOR:4228–4282 | LOCATE(-7): count, up to three targets, count-only continuation. Malformed even-count and extra-target behavior remains C-010. |
| DAMAGES | DECWAR.FOR:435–436,783–815 | Two-letter device codes, all prefix matches emitted; T selects TO and TR. Help's shorthand description is less precise. |
| DOCK, STATUS | DECWAR.FOR:934–936,3860–3904 | Optional STATUS tail uses status fields, not device codes. |
| ENERGY | DECWAR.FOR:1009–1071 | Roster name plus integer; missing/mistyped pair reprompted; possible confirmation. |
| SHIELDS | DECWAR.FOR:3739–3773 | Action prompt; TRANSFER optionally prompts for integer; confirmation. |
| REPAIR | DECWAR.FOR:3190–3221 | Optional integer/ALL; optional DAMAGE tail. |
| SCAN, SRSCAN | DECWAR.FOR:3527–3587 | WARNING last; direction first; zero/two ranges, CORNER exactly two. |
| POINTS | DECWAR.FOR:2893–2938 | Multiple subjects, personal/faction/Romulan forms; no personal subjects before commission. |
| RADIO | DECWAR.FOR:3129–3179 | Action and roster prompts; ON tested before OFF; O therefore means ON. |
| TRACTOR | DECWAR.FOR:4432–4465 | Bare form depends on current link; OFF tested before names; otherwise ship prompt. |
| TELL | DECWAR.FOR:3977–4062; SETUP.FOR:358–364; WARMAC.MAC:2963–3016 | Vessel-first recipient lookup, seven groups with ambiguity detection, semicolon/raw text, separate message prompt. Romulan name recognized and skipped. |
| SET, TYPE | DECWAR.FOR:3624–3734,4540–4559,481–488 | Setting-specific values, prompts, terminal names, TYPE O ambiguity. |
| SET NAME | WARMAC.MAC:3421–3447 | Rescans line after NAME, twelve-character uppercase historical storage. Draft captures free-text shape and flags normalization/chaining in C-011. |
| HELP | WARMAC.MAC:4136–4182; DECWAR.FOR:471–479 | Multiple topics, *, commands tried before extra topics, permission filtering. |
| GRIPE | WARMAC.MAC:3860–3908 | No inline operand; multiline input terminated with end-of-input gesture. |
| QUIT | DECWAR.FOR:136–143 | Separate confirmation, YES-prefix acceptance; pre-game QUIT differs. |
| NEWS, TIME, USERS | DECWAR.FOR dispatch:117–121,192–197,211–216; TIME:4066; USERS:4600 | No intended inline operands; output semantics outside this grammar pass. |

Paths in the table are under `legacy/utexas`. Help text in
`HLP/DECWAR.RNH:533–1455` was used to locate intended forms, then checked
against the executable readers above. No archived specification was consulted.

## Entry and privilege

`SETUP.FOR:76–132,402–456` defines entry and pre-game dispatch. Its 16 slots
contain 14 named entries and two blank slots; blank slots are not additional
commands. ACTIVATE is the ordinary pre-game-only command. PREGAME is an entry
response. The shared ordinary pre-game commands reuse their in-game syntax,
subject to commission-dependent restrictions.

`*DEBUG` and `*PASSWORD` are in both command tables, and `*ZAP` only in
pre-game. `DECWAR.FOR:2626–2643` defines password handling;
`WARMAC.MAC:3641–3671` shows the active DEBUG action is timing output, not the
older memory-editing description in help. No credential was copied into the
specification. `DECWAR.FOR:3637–3641,3719–3734` identifies privileged SET
switches ROMOPT, ENDFLG, BHREMV with no value operand. Core applicability is
explicitly unresolved.

## Remaining review

- Historical extra operands and non-word termination versus whole-segment
  parsing; partial output before rejection in report commands.
- Report-group order-sensitive exclusions and suspicious duplicate-name
  detection, without importing bit-mask implementation into grammar.
- Full prompted recovery and slash-segment consumption; no generic cancellation
  or atomic-command-sequence model has been assumed.
- Name-text normalization, terminal labels, feedback/editor gestures, and
  administrative scope. Commissioning questions belong to lifecycle semantics.
