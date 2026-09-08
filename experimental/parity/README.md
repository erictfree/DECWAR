# TypeScript and PDP-10 comparison harness

Run the same public Telnet scenario suite against two localhost endpoints and
retain raw wire events, decoded responses, process diagnostics, a manifest and
JSON/Markdown reports. The existing Austin capture/client implementation owns
each dialogue. No runtime state is injected or game command resent on failure.

Start a dedicated Austin TypeScript host (Node 24+, dependencies installed):

```sh
npm start -- --variant austin --port 2424 --data data/parity-austin
```

Start the pinned Austin reference environment separately using its supplied
Docker setup. Publish its Telnet endpoint to localhost and record the actual
image/build identity. This repository preserves the reference executable and
build evidence, not a ready-to-launch Docker disk image. See
[reference build evidence](../../docs/austin-build-evidence.md).
The reference adapter requires a fresh TOPS-10 terminal showing `Please LOGIN`;
it uses `login decwar`, then `r gam:decwar`, and confirms logout during cleanup.
Use an available YORKTOWN on each backend. Existing games are not reset.

```sh
node experimental/parity/run.ts --typescript-port 2424 --pdp10-port 2030 --typescript-profile playable --reference-id YOUR_IMAGE_OR_BUILD_ID --suite modes --limit 4 --out logs/parity-first
```

Ports and identity above must match your environment; 2030 is the recorded
reference port, not an automatically discovered Docker mapping. The identity
and profile are operator declarations, not independently verified attestations.
Run `docker ps --no-trunc` to inspect your running container identity and ports.
The output directory must not already exist. Run `--suite modes --limit all`
for 61 steps or `--suite dialogs --limit all` for 58 interactive steps. Limits
select complete groups so a normal run does not strand a continuation prompt.
Run on dedicated test games: settings and scans change the selected ship's state.

Exit 0 means all selected decoded responses matched; exit 1 means differences;
exit 2 means missing, failed or invalid captures, including cleanup failure.
The JSON report includes exact response strings and first differing character
offsets. Raw Telnet bytes are base64 events in each backend's JSONL file.
TCP packet boundaries are not compared as game output.

Optional `--ignore-command-echo` removes only one exact leading sent command
line for comparison and records the removed text. Original responses remain.
There is no whitespace, stardate, score, location or random-result suppression.
Unaligned worlds make SCAN/STATUS differences likely; those remain review
items rather than automatic failures of game semantics or excused matches.
Startup and shutdown are captured and their success checked, but their text is
not yet included in per-step parity comparisons. Ctrl-C terminates the capture;
inspect the reference terminal afterward because interrupted logout is unverified.

This first harness tests selected I/O behavior. It does not synchronize game
clocks or random draws, prove combat parity, or infer a tournament win rate.
The preserved Austin binary is a reconstruction build, not a recovered original.

## September 8, 2026 native checkpoint

The existing native SIMH environment was restarted and exercised through the
same PDP-10 adapter. Both full suites completed, including login and logout:

| Suite | Steps | Matches after command echo removal | Retained differences |
| --- | ---: | ---: | --- |
| Modes | 61 | 41 | 10 STATUS locations and 10 unaligned SCANs |
| Dialogues | 58 | 52 | Six blank replies with an extra native leading CRLF |

The four-step smoke report and full reports are in
`logs/parity-reference-startup/{paired-four,paired-modes,paired-dialogs}/`.
The six blank replies are consistent with terminal Enter echo, but the current
comparison deliberately removes only nonempty echoed commands. Their raw byte
differences remain review items. No game implementation was changed to make
these captures match. These runs establish selected native I/O coverage;
Docker packaging, aligned world behavior and combat remain separate work.

```sh
node --test experimental/parity/test/*.test.ts
```
