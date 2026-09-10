# Evidence for TRACTOR

Input composition now links the working lexer and command-head recognizer to
tractorDialogue, then the existing operation and typed notice producer. Three
tests cover a written prompted target, numeric retry/empty cancellation while
linked, unknown-word termination, pending-input distinction and a trailing-token
guard. Non-word retry remains recorded C-010 behavior, not a resolved universal
policy. The helper receives separated responses; it does not implement shared
slash-segment dispatch or interrupted input. Log: tractor-input-check.log under
logs/spec1.0-nova; the initial test's wrong recognizer-field expectation is
retained as tractor-input-initial-failed.log.

Typed producer/consumption composition: the tractor companion now returns a
PendingNotification for a successful activation or release, and none for a
prompt or rejection. A test consumes Excalibur's activation copy, releases the
link, then renders Farragut's still-pending activation with its current LONG
preference. An alternative discard removes that copy without rendering. This
checks event facts independently of current links; it does not choose between
pending activation/release order or implement full commission release. Log:
logs/spec1.0-nova/tractor-notification-check.log.

Prompt-recovery follow-up: DECWAR.FOR:4437–4455 emits its newline before
the bare-linked release branch. The KALF loop precedes OFF and existing-link
checks; empty response returns without invoking bare-command release. The
loop changes INDEX to1 and ignores following tokens. Its GTKN call preserves
pending slash segments (WARMAC.MAC:1386–1407). Section7.3 now supplies six
source-derived response cases and distinguishes unknown-word termination from
non-word retries. This closes the prose account of ordinary prompting, while
C-010 remains the policy decision for malformed/trailing input. No prompted
original-executable transcript or interleaving behavior is claimed.

Austin source review for Section 7.3, not original-executable differential
verification. No runtime implementation was used to define the abstract link.

| Subject | Evidence | Finding |
| --- | --- | --- |
| Dispatch | DECWAR.FOR:201–206,49–57,223 onward | TRACTOR returns to command acquisition without completed-turn processing; no energy charge or readiness assignment |
| Input and release | DECWAR.FOR:4432–4457 | Initial newline, bare linked release, target prompt, blank cancellation, OFF before target lookup |
| Eligibility order | DECWAR.FOR:4458–4496 | Existing link, name, self, faction, alive, adjacency, target link, own shields, target shields; no tractor-device damage check |
| Distance | WARMAC.MAC:3721–3736 | Each absolute coordinate difference is at most one; valid distinct ship positions make this Chebyshev distance one |
| Link mutations | DECWAR.FOR:4497–4510 | Reciprocal assignment/removal; notices addressed to both endpoints; no target confirmation |
| Diagnostics | MSG.MAC:71,349–357,373; WARMAC.MAC:1970–2050 | Exact text and short/medium initial versus long ship-name formatting |
| Notices | DECWAR.FOR:2404–2415,2587–2595; MSG.MAC:182–186 | Events 13/14; short/medium abbreviated notice, long notice with two leading newlines (one from delivery and one from text) |
| Deferred delivery | WARMAC.MAC:2770 onward; DECWAR.FOR:1192–1196 | Notices are retained and delivered later; abstract event delivery remains to be specified, without adopting storage or overflow mechanics |

C-012 records the omitted device-damage check. C-010 still covers non-word
prompting, extra operands, and semantic-check precedence for malformed input.
Link-breaking triggers in combat, shields, and release routines need review
with their own operations; source comments are not an exhaustive contract.

The companion now connects normalized operands to reciprocal link changes,
issuer diagnostics and two endpoint notice recipients. Tests cover unchanged
resources and preferences, release by either endpoint despite distance/shields/
damage, OFF precedence, absent-enemy and distant-shielded validation precedence,
and the initial target prompt. The returned notice list specifies recipients,
not a global delivery order or new Galaxy storage. C-012 remains unresolved;
raw token recovery, prompted replies and asynchronous notice display are not
covered by these tests. Log: `logs/spec1.0-nova/tractor-operation-check.log`.
