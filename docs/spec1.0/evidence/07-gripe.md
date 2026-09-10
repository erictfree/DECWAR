# GRIPE collection evidence

Austin WARMAC.MAC:3856–3910 checks RED before information activity and emits
the ASCIL prompt. GRPSIZ at line 474 is 20. The collector decrements its
remaining-line count before INLI, rejects Ctrl-C before copying that line,
then branches on EOF before normal newline insertion or limit messages.
Consequently, normally terminated lines 18 and 20 emit warnings, while a
Ctrl-Z-terminated line at those positions does not.

GRIP.2 at 4050–4060 rejects only the first empty EOF-terminated line. An earlier
blank completed line therefore makes a submission. A final nonempty EOF line
receives a newline; an empty one does not. GRIP.3 adds the historical file
separator and subsequent code prepends the record to the file. That storage
metadata is not adopted as part of the abstract feedback body. Successful
collection has no added acknowledgement to the player. Host submission failures
and retries remain the C-011 destination-policy discussion.

INLI at 1551–1610 collects characters before command tokenization and implements
line editing/replay separately. The companion `src/gripe.ts` consumes already
edited lines. Its result SUBMIT means a body is ready for the external action,
not that a host has persisted or delivered it. Tests cover alert refusal,
pregame entry, empty versus blank feedback, literal text, full cancellation,
automatic line limit and EOF-before-warning ordering. They do not verify raw
control-character editing, concealment, metadata or external delivery.

Check log: `logs/spec1.0-nova/gripe-check.log`.
