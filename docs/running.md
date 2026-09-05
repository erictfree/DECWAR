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

The server binds localhost. Multiple connections share the galaxy. This is a
playable alpha using the original command and game routines with the explicit
repairs in [playable decisions](playable-decisions.md). It is not a claim of
exact historical compiler or terminal parity.

## First captain

A tested startup sequence is:

1. Enter `EXPERT` at `Which?`.
2. Enter a short captain name at `Your name please:` (for example `Eric`).
3. Press Enter at the HELP/PREgame prompt.
4. Press Enter to select a regular game.
5. Answer `YES` or `NO` to the Romulan question.
6. Answer `YES` or `NO` to the black-hole question.
7. Enter `FEDERATION` or `EMPIRE`.
8. Choose one of the available ships, such as `LEXINGTON` or `COBRA`.
9. Enter `STATUS`.

A later captain skips the game-option questions: choose experience, name,
blank line, side and an available ship. Federation also has NIMITZ, SAVANNAH,
VULCAN and YORKTOWN; Empire also has DEMON, HAWK, JACKAL and WOLF.

The original raw name reader does not echo characters in this host. Use a
short, nonempty name and Enter from a client sending LF or CRLF. The reader's
historical editing, empty-name and overflow behavior is not yet modernized.

## Playing

`HELP` lists topics. `HELP MOVE`, `HELP PHASERS`, `HELP TORPEDO`, `HELP DOCK`
and other topic commands read the supplied documentation. The executable
source remains the rule authority where its help disagrees.

Useful commands include `STATUS`, `SCAN`, `USERS`, `BASES`, `PLANETS`,
`POINTS`, `MOVE ABSOLUTE <vertical> <horizontal>`, `SHIELD DOWN`,
`SHIELD UP`, and `TELL <ship>; <message>`. Original abbreviations and coordinate
modes are retained; use explicit ABSOLUTE coordinates while learning the game.

`SCAN` (or `SC`) defaults to ten sectors in each direction; `SRSCAN` defaults
to seven, clipped at galaxy edges. Startup uses the original RESET's 80-column
terminal width. `SCAN 10` supplies the range explicitly.

Ctrl-C at an empty `Coordinates:` prompt returns to the command prompt. At the
main command prompt it follows the original quit/alert handling; a normal quit
asks for confirmation. Both Telnet IP and raw Ctrl-C (ETX) invoke the interrupt
handler. The client must actually send the control to the server. The source
ignores further interrupts while its previous interrupt flag is still pending;
processing another command rearms it. Already entered partial coordinates retain
the original parser behavior and can produce a coordinate-count error.

Enter `QUIT` and answer `YES` to save eligible final statistics and release
from the game. A disconnected captain is also cleaned up. Another captain can
reuse the released ship. When a galaxy is full, new arrivals follow the source
reload into another galaxy while existing captains retain their current one.

## Persistence and shutdown

Press Ctrl-C in the server console to stop the host. This is forced host
shutdown; connected players should use in-game QUIT first to record their
final scores. The live galaxy is in memory and is recreated on host restart.

Source game numbers, commissions and eligible final scores persist under
`data/`. The original code omits final-statistics updates for missions shorter
than one second. It selects DECWAR.STA or DECWAF.STA; both are stored as
`.words` files preserving all 36 bits. GRIPE reports are stored similarly.

The console prints the diagnostic log path. That JSON-lines log records
connections, reloads, completion, failures and shutdown; it does not record
player input or passwords. Implementation progress is in WORK_LOG.md.

Only one server can own a data directory. Normal shutdown removes `.host.lock`.
After a crash, confirm the recorded process is no longer running before
removing a stale lock. Use a different data directory for independent servers.

```sh
npm start -- --port 2324 --data data-other --log logs/other-game.log
```

## Historical diagnostic mode

```sh
npm start -- --strict --port 2324 --data data-strict
```

This mode deliberately retains unresolved final POINTS, TRACTR's missing
argument, LIST's uninitialized SHIP word and the pending-hangup GETCMD loop.
It is useful for source-fidelity work, not the default playable experience.
It can stop before cleanup and leave a reserved ship behind.

Both modes currently reuse the source compositions under test/fixtures and
selected monitor/compiler services: native 36-bit arithmetic, synthetic memory
addresses, cooperative host scheduling, UTC clocks, a virtual shared-image
catalog and modern word-file persistence. Original instruction timing, Telnet
monitor negotiation, every malformed input path and long-running load behavior
remain unverified. See decisions.md and platform-manuals.md for details.
