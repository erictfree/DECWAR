# RADIO evidence

Response-state and suffix follow-up: DECWAR.FOR:3136–3159 keeps the chosen gag
action while INDEX changes for a name response. ON/OFF return without reading
later tokens; gagging uses INDEX+1, or the first prompted name, without checking
suffixes. GTKN preserves pending slash segments. Section7.17 now includes the
complete RA/GAG/WOLF prompt string, OFF-at-name-prompt behavior, cancellation
without TELL-style enablement, and five unresolved suffix cases. The existing
companion guards suffixes; this prose records evidence, not a policy change.

Section 7.17 is derived from Austin DECWAR.FOR:3129–3178 and MSG.MAC:248–255.
The dispatcher returns without turn completion at DECWAR.FOR:141–146.

Verified source distinctions: initial newline; additional newline after a
nonempty action response but not name response; action retry versus unknown
name termination; self-name silent return; roster membership without alive or
faction checks; independent enablement and gag membership; no device-damage
check; acknowledgement even when no membership change is needed.

Remaining: message send/delivery checks and notification lifetime in TELL and
radio delivery, exact shared display-name formatting, suffix acceptance.
No original-executable differential verification is claimed.

Added normalized-token dialogue scenarios covering immediate ON/OFF, action
retry, numeric name retry, name cancellation, unknown and self names, repeated
GAG/UNGAG and unrelated membership preservation. The action prompt emits a
newline after each nonempty response; the name prompt does not. Rechecked
MSG.MAC:248–255 and DECWAR.FOR:3129–3178. The companion returns an explicit
awaiting-input outcome when no response is supplied; it does not manufacture
cancellation. It rejects unreviewed trailing operands instead of assigning
them a core policy. Raw lexical recognition, interruption and message-delivery
scheduling are outside these tests. Updated the entry's stale delivery note
to reference the recipient-selection/delivery distinction now defined in TELL.
