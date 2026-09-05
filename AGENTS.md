# DECWAR port contract

Current user priority: on 2026-09-05 the user explicitly asked to set aside
unresolved historical/compiler parity and get a functioning game. Implement
documented, narrow repairs in a playable profile; retain the historical
diagnostic profile for fidelity work. Do not block playable completion on
missing compiler artifacts or describe the playable profile as exact parity.

Use the supplied `legacy/compuserve` and pinned `legacy/utexas` archives as the
game-logic authorities for their respective variants. The user also authorized
the full decwarorg/utexas repository and an isolated reference build; its map,
symbols, executable, initialization and transcripts are preserved in
legacy/utexas-reference/f78f2ec. Do not browse other implementations, game rules,
historical descriptions or transcripts. Keep both archives byte-for-byte
unchanged. Run `npm run audit:check` to verify the source/generated evidence.

The user explicitly authorized importing decwarorg/utexas's
utexas23-reconstruction directory into legacy/utexas on 2026-09-05. Preserve
that snapshot and its provenance in legacy/README.md and legacy/utexas-manifest.json.
The user subsequently selected Austin reconstruction as the default and approved
implementation of docs/austin-default-plan.md. Implement Austin and retain an
explicit CompuServe variant. Preserve the running CompuServe behavior while
introducing variant support; switch the default only after Austin is playable
and verified. Source variant and playable/diagnostic mode are separate choices.

On 2026-09-05 the user authorized CPU/compiler manuals solely to resolve
PDP-10 arithmetic and FORTRAN runtime/compiler behavior. This does not authorize
external DECWAR implementations, game rules or transcripts. Record manual
edition, pages, applicability and unresolved version differences in
docs/platform-manuals.md; manuals do not define either variant's game logic.

The CompuServe baseline is the supplied, modified distribution selected by
DECCMP.CMD and CAN1.CMD. Austin uses the pinned reconstruction and recorded
reference build. Neither directory name establishes a pristine historical
release. Do not silently combine variants or fix apparent source bugs. Record conflicts in
`docs/compatibility.md`, with file names and line numbers.

Preserve integer scaling, evaluation order, truncation, command abbreviations,
random draw order, output bytes, queue semantics, and command timing. Source
comments and help are secondary to executable statements. Monitor/compiler
semantics missing from the archive must be marked unresolved, not invented.

Each ported routine needs a source reference and focused behavioral tests.
Distinguish extracted data, reviewed code, partial ports, and verified behavior.
An inventory is not a semantic audit. Unit tests are not original-executable
differential verification. Update `docs/status.md` when implementation advances.

Prioritize closing dependencies toward one executable game runtime. Each coding
round should name the runnable milestone it advances and close a concrete gap
or explain the source evidence preventing closure. Reuse existing compositions;
do not expand isolated compatibility work without connecting it to a remaining
runtime dependency or an observable fidelity requirement. Preserve all parity
requirements and keep required services explicit.

The user's preferred working setting is Astra medium for routine implementation,
integration, tests and documentation. Reserve high for difficult source semantics,
numeric behavior, aliasing, concurrency or debugging. This is a workflow preference,
not a mechanism for changing the app's actual model or reasoning setting.
Tell the user when a concrete source ambiguity or debugging problem warrants
switching back to high, explaining the specific reason. Do not silently change
settings or relax fidelity requirements when working at medium.
Continue across verified checkpoints without ending work just to report a round.
Give progress updates while working. Pause only for needed user input, a concrete
blocker, or a recommended settings change; completing a routine is not a stop gate.

Maintain WORK_LOG.md as the persistent record of meaningful changes, source
references, commands/checks, results, open issues and next work. Save command/test
output under logs/ directly and record its path in the log. Retain failed runs
as diagnostic evidence. Do not describe this as a complete historical transcript
or as proof of original-executable parity.

Do not ship a simplified game under a compatibility claim. Do not substitute
JavaScript floating point for PDP-10 floating point without an explicit decision.
Use original text, including spelling, whitespace, control characters, and
apparently outdated version banners. Generated data is rebuilt by `npm run audit`.
