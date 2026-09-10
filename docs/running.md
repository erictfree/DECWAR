# Running DECWAR

With Node 24 or newer, from this project directory:

```sh
npm ci
npm start
```

Connect a Telnet client:

```sh
telnet 127.0.0.1 2323
```

The default is **Austin reconstruction**, a playable eighteen-player game based
on the pinned supplied sources. The server binds localhost. Connections share
a galaxy. This is a playable alpha with [documented repairs](playable-decisions.md),
not a claim of exact historical compiler or terminal parity.

## First captain

1. Enter a short captain name at `Your name please:`.
2. Press Enter at the HELP/PREgame prompt.
3. Press Enter to select a regular game.
4. Answer `YES` or `NO` to the Romulan question.
5. Answer `YES` or `NO` to the black-hole question.
6. Enter `FEDERATION` or `EMPIRE`.
7. Choose an available ship.
8. After DECWAR.INI executes its startup commands, enter `STATUS`.

Later captains enter their name, a blank line, side and available ship; they skip
the game-option questions. Austin has no Beginner/Intermediate/Expert dialogue.
Its saved initialization file sets an informative prompt, both coordinate forms,
medium output, then runs TARGETS and SRSCAN 2 W.

| Federation | Empire |
| --- | --- |
| Excalibur | Buzzard |
| Farragut | Cobra |
| Intrepid | Demon |
| Lexington | Goblin |
| Nimitz | Hawk |
| Savannah | Jackal |
| Trenton | Manta |
| Vulcan | Panther |
| Yorktown | Wolf |

The server offers character mode and server echo. Use a short, nonempty captain
name; Enter may send CR, CR-NUL, CRLF or LF. Historical name editing, empty-name
and overflow behavior remains incompletely verified.

## Playing

`HELP` lists topics. `HELP MOVE`, `HELP PHASERS`, `HELP TORPEDO`, `HELP DOCK`
and other topic commands read the selected source's documentation. Austin's
served DECWAR.HLP describes eighteen ships. Its older DECWAR.RNH formatter source
still describes ten, but is not the file served to players. The executable
source governs where documentation disagrees.

Useful commands include `STATUS`, `SCAN`, `USERS`, `BASES`, `PLANETS`,
`POINTS`, `MOVE ABSOLUTE <vertical> <horizontal>`, `SHIELD DOWN`,
`SHIELD UP`, and `TELL <ship>; <message>`. Original abbreviations and coordinate
modes are retained; use explicit ABSOLUTE coordinates while learning the game.

At an empty command prompt, ESC immediately repeats the previous acquired line;
no Enter is required. ESC after other input ends that new line instead.
Interactive answers can become the retained line, and TELL rejects repeated
input. Character delivery, Enter, backspace, Ctrl-U, Ctrl-R and standalone ESC
were checked with the installed Homebrew Telnet client. Clients that refuse
character mode can still buffer input locally. See the [terminal binding
decision](decisions.md#d-172--character-delivery-and-keyboard-echo).

The playable Telnet host accepts ordinary editor submissions at least 500 ms
apart per session. A submission completed too soon is discarded and rings the
terminal bell (BEL); it is not delayed for later execution. Wait half a second
and re-enter the line. Rejected input does not replace the line retained for ESC.
ESC remains exempt, including when it ends a newly typed line. `/` stays inside
one submitted line; this is a line limit, not a limit on individual commands.
Interactive answers and the editor's automatic 80-character completion count
as submissions. Raw name input and initialization-file input are excluded.

Use `--input-interval-ms N` to choose 0–60000 ms; zero disables the policy.
`--strict` always disables it. Timing is measured when the editor finishes
reading each line, not when bytes arrive at the socket, so queued input may
be accepted if game activity spaces out its consumption. This modern host
policy is not historical DECWAR timing or complete flood protection.

`SCAN` (or `SC`) defaults to ten sectors in each direction; `SRSCAN` defaults
to seven, clipped at galaxy edges. RESET starts with an 80-column terminal width.
`SCAN 10` supplies the range explicitly. The startup scan has its own explicit
range of two from DECWAR.INI. Scan spacing also depends on the selected terminal width.

Ctrl-C at an empty `Coordinates:` prompt returns to the command prompt. At the
main prompt it follows the original quit/alert handling; normal quit asks for
confirmation. Both Telnet IP and raw Ctrl-C (ETX) invoke the interrupt handler.
The client must send the control to the server. Source ignores further interrupts
while its previous flag is pending; processing another command rearms it.
Partial coordinates retain source parser behavior and can produce an error.

Enter `QUIT` and answer `YES` to show final points and leave. Disconnect also
runs cleanup. Another captain can reuse the ship. When a galaxy is full, arrivals
follow source reload into a new galaxy; existing captains retain their old one.

## Variant selection and persistence

```sh
npm start -- --variant austin
npm start -- --variant compuserve
```

CompuServe retains ten ships, sixty initial planets, experience selection before
the captain-name prompt, and persistent standings. At `Which?`, enter `EXPERT`
for the previously tested startup sequence. Its Federation roster is Lexington,
Nimitz, Savannah, Vulcan and Yorktown; Empire is Cobra, Demon, Hawk, Jackal and Wolf.

New hosts use `data/austin` or `data/compuserve`. A variant.json marker prevents
accidental cross-variant reuse. Austin does not read or update CompuServe
commissions/standings. GRIPE word files belong to the selected host directory.
CompuServe stores game numbers, commissions and eligible scores in DECWAR.STA or
DECWAF.STA `.words` files, preserving all 36 bits. Missions shorter than one second
are excluded by source. The live galaxy is in memory and resets on host restart.

To reuse the existing pre-variant CompuServe data, stop its old host first, then:

```sh
npm start -- --variant compuserve --data data
```

This validates existing records and adds host metadata; it does not convert
records or move them. An incompatible marker or malformed record rejects startup.
Only one host may own a data directory. Normal shutdown removes `.host.lock`.
After a crash, confirm the recorded process is dead before removing a stale lock.

To run both variants at once, use different ports and data directories:

```sh
npm start -- --variant austin --port 2323
npm start -- --variant compuserve --port 2324
```

Press Ctrl-C in the server console to stop it. This is forced shutdown; connected
players should QUIT first. Host diagnostics print the selected variant, mode,
log and data paths. The JSON-lines log records source identity, connections,
reloads, completion, failures and shutdown, without player input/passwords.
Implementation progress is recorded in WORK_LOG.md.

## Optional internal histories

Internal diagnostic record retention defaults to off. `--diagnostic-records 200`
keeps the newest 200 entries per history per session; zero disables it and the
maximum is 100000. It does not change game queues, state or file logging, and it
is separate from `--strict`. See [runtime diagnostics](runtime-diagnostics.md)
for scope, inspection and validation.

## Historical diagnostic mode

```sh
npm start -- --variant austin --strict --port 2325 --data data/austin-strict
npm start -- --variant compuserve --strict --port 2326 --data data/compuserve-strict
```

Variant and repair policy are independent. Strict mode deliberately retains
unresolved POINTS, TRACTR's missing argument, LIST's uninitialized SHIP word and
the pending-hangup GETCMD loop. It can stop before cleanup and is intended for
fidelity work. It does not certify historical parity.

Both variants share native 36-bit arithmetic and modern host services:
cooperative scheduling, UTC clocks, word-file persistence and a virtual
shared-image catalog. Austin shared bases come from the preserved native link;
compiler scratch/literals still use documented host addresses. Original timing,
all malformed inputs and exhaustive monitor/compiler equivalence remain
unverified. See [Austin implementation](austin-implementation.md),
[decisions](decisions.md) and [platform manuals](platform-manuals.md).

## TypeScript host and native reference

The TypeScript game and the preserved PDP-10 reference are separate programs.

| | TypeScript port | Native reference |
| --- | --- | --- |
| Environment | Node.js 24 or newer | TOPS-10 under a PDP-10 emulator, with the reference build environment |
| Launch | `npm start` | Separate emulator boot and TOPS-10 game launch; see [build evidence](austin-build-evidence.md) |
| Connection | Default localhost port 2323; configurable with `--port` | Emulator terminal port configured separately; the recorded reference setup uses 2030 |
| Login | DECWAR captain-name dialogue | TOPS-10 login before DECWAR |

Port numbers do not select a source variant. `--variant` selects the TypeScript
variant, and `--port` selects its listener. Updating files does not change the
variant of an already running host. The two-variant examples above describe new
launches, not the assignments of existing local processes.

When the recorded native reference environment is running, connect to its terminal
port, enter `login decwar`, then `r gam:decwar`. That reference account needs no
password in the preserved setup. `npm start` does not boot this environment.
The reference was run locally with SIMH using the upstream Docker-directory
assets; Docker is not required for the TypeScript game. The preserved executable
and map are evidence, not a complete bundled TOPS-10 installation.
