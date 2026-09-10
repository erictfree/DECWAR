# TELL evidence

Recipient-dialogue follow-up: DECWAR.FOR:3994–4004 prompts only when the
initial recipient list is absent, changes the token start to the first response
token, and returns immediately on an empty response. The selection loop has no
retry edge: errors continue to the next token, then the common eligibility
pass. WARMAC.MAC:2971–2987 searches the current input line for a semicolon
before requesting `Msg: `, so a freshly entered recipient response can provide
inline text. Section7.18 now supplies six independent interaction scenarios,
including the distinct empty-recipient and empty-message outputs. These are
source-derived traces, not original-executable transcripts or evidence for
editing, replay, slash continuation, or concurrent changes during prompts.

DECWAR.FOR:3977–4063 establishes sender damage check, reception enablement,
recipient parsing, group alive filtering, per-recipient damage/alive/OFF
checks, sender exclusion, sender ungagging, and message creation. Recipient
selection precedes message input; it is not recomputed afterward by TELL.
MSG.MAC:312–329 supplies diagnostics and prompt text.

WARMAC.MAC:2963–3026 collects text after semicolon or Msg prompt, reserves a
message, stores a bounded prefix, and handles short/aborted input. Separate
text limits from storage before specifying. DECWAR.FOR:2599–2621 retrieves
pending messages and applies recipient gagging, but no local enablement or
damage check. The caller must be reviewed before final delivery scheduling.
FREE:1133 discards messages during release. Confirm lifecycle effects in the
shared chapter rather than tying delivery to a historical queue structure.

Delivery-caller review: DECWAR.FOR:1183–1230 calls OUTHIT then OUTMSG at command
acquisition and while waiting for input, without a radio enablement/damage
gate. Initial delivery precedes PAUSE. Thus pending radio messages are not
deferred by a later RADIO OFF or damage change; gagging remains a delivery
filter. FREE drains pending messages on release. This resolves the earlier
caller-check question, while input/death/simultaneous-event ordering remains.
# Message length follow-up

WARMAC.MAC:184 sets MSGLEN17. MAKMSG:2994–3008 starts its counter at-77,
increments per character including the terminator, stores only while negative,
then replaces the last stored character with CR and appends LF/NUL. Thus75
payload characters survive even for longer input. A total count<=2 rejects
zero or one payload character. Spaces are not trimmed. INLI.:1570–1575
normalizes the edited line ending to NUL. ASCIL at21–25 establishes the
No message sent notice's ending; TELL adds another CRLF after MAKMSG.
The new helper tests only completed ASCII text, not editing or input replay.

OUTMSG:2610–2622 assembles the player header from MESS01/MESS02 and the
original recipient bits returned by GETMSG. DECWAR.FOR:489–508 defines each
recipient abbreviation as space plus initial. Stored message CR/LF plus
OUT(msg,1) produce two ending line breaks. Section10.8 and literal tests cover
this player-originated output. The same name data establishes POINTS's
initially capitalized, ten-character padded personal heading.

Added recipient-selection and single-delivery companions using the existing
radio text/output rules. Six scenarios link sender damage, group/name selection,
roster-ordered diagnostics, sender enablement/ungagging, cancellation and RADIO
changes before delivery. Explicit names diagnose absent ships; group expansion
removes them first. The tests verify current gag filtering and removal of the
last pending copy without altering original recipients. Inputs are normalized
recipient words and completed edited text. Recipient prompting, raw lexical
recognition/replay and inter-message or interrupt ordering remain excluded;
no global queue policy or complete language conformance is claimed.
