# DECWAR

**A multiplayer space battle game for your terminal, brought from PDP-10
FORTRAN and MACRO-10 assembly to TypeScript.**

Take command of a Federation or Empire starship in a shared, real-time galaxy.
Scan for opponents, navigate between sectors, fire phasers and photon torpedoes,
capture planets, and coordinate with other captains over subspace radio. Damage,
energy, shields and repairs matter; friendly bases offer a place to dock and
rearm. You can also include a computer-controlled Romulan opponent.

This project makes DECWAR playable on Node.js while studying and preserving the
behavior of its supplied source code: the command language, terminal output,
game rules, and the arithmetic and memory conventions that made it work on a
PDP-10.

This TypeScript port was created by **Eric Freeman**, working with
**OpenAI GPT-6 Astra**. It is based on **Noah Smith's reconstruction of the
UT Austin DECWAR codebase** and DECWAR sources preserved on a **legacy
CompuServe tape**. See [source provenance](legacy/README.md) for the archived
codebases and their attribution.

For more on the overall DECWAR effort, visit [decwar.org](https://decwar.org).

**Status: playable alpha.** Multiplayer combat, movement, messaging, planet
capture and construction, docking, scoring and session cleanup are connected.
Exact historical parity remains a work in progress. The default playable profile
includes a small set of [documented repairs](docs/playable-decisions.md) for
unresolved source/compiler behavior.

## Play locally

You need **Node.js 24 or newer**, npm, and a Telnet client. No PDP-10 emulator
is required to run the TypeScript game.

```sh
git clone https://github.com/erictfree/DECWAR.git
cd DECWAR
npm ci
npm start
```

In another terminal, connect to the game:

```sh
telnet 127.0.0.1 2323
```

The server listens on localhost. Open another Telnet connection to
join as another captain; players share the same galaxy.

Enter a short captain name, then press Enter at the HELP/PREgame prompt. The
first captain chooses the game options: press Enter for a regular game, then
answer the Romulan and black-hole questions. Choose `FEDERATION` or `EMPIRE`
and an available ship. Later captains join the existing game without choosing
those startup options. Your name may not echo as you type it.

Once aboard, try:

| Command | What it does |
| --- | --- |
| `HELP` | Show the game's help topics. |
| `STATUS` | Inspect your ship and its condition. |
| `SCAN 10` | Scan the surrounding galaxy. |
| `USERS` | See the other captains. |
| `BASES` / `PLANETS` | Locate installations. |
| `HELP MOVE` | Learn movement syntax and coordinate options. |
| `HELP PHASERS` / `HELP TORPEDO` | Learn the weapon commands. |
| `TELL WOLF; Hello` | Send a message to the captain of Wolf, if active. |
| `QUIT` | Show final points and leave after confirmation. |

Original command abbreviations are retained: for example, `SC 10` works for
`SCAN 10`. See [Running DECWAR](docs/running.md) for the ship roster, additional
commands, controls, persistence and host configuration.

## Two source variants

The default is the **Austin reconstruction**. CompuServe remains available as
a separate source variant.

| | Austin (default) | CompuServe |
| --- | --- | --- |
| Player ships per galaxy | 18 — nine per side | 10 — five per side |
| Initial planets | 20 | 60 |
| Startup | Preserved Austin initialization commands | Experience selection |
| Persistent standings | No | Yes |
| Default data directory | `data/austin` | `data/compuserve` |

```sh
npm start -- --variant austin
npm start -- --variant compuserve
```

Each variant uses its own archived source and generated data. The Austin target
is a pinned reconstruction from `decwarorg/utexas`; neither archive is presented
as a pristine historical release. [Source provenance](legacy/README.md) and the
[variant comparison](docs/legacy-comparison.md) explain what is preserved and
where they differ.

Variant selection is separate from repair policy. Add `--strict` to run the
selected variant's historical diagnostic profile. It retains unresolved behavior
and may stop before a session completes; it is intended for fidelity work.

## Preserving how it works

The archived executable statements are the authority for game behavior. The
port tracks source locations and preserves details such as 36-bit words, packed
fields, scaled integer arithmetic, truncation, random draw order, command
abbreviations and original message text. Native PDP-10 floating-point behavior
is implemented explicitly.

Modern host services provide TCP/Telnet connections, cooperative scheduling and
file persistence. Their differences from the original monitor environment, and
the narrow repairs needed for the playable profile, are recorded explicitly.
The source archives remain unchanged and are checked against their manifests.

A locally rebuilt Austin executable, link map, symbols and sample terminal
transcripts are preserved as reference evidence. Automated tests cover the port,
including multiplayer sessions over real Telnet connections; those tests do not
establish complete equivalence with the original executable.

## Explore and contribute

Start with the [documentation guide](docs/README.md). The
[architecture](docs/architecture.md) explains memory layouts, scaled arithmetic
and modern host services; the [documentation standard](docs/documentation-standard.md)
sets expectations for source evidence and behavior changes.

- [Running the game](docs/running.md): setup, commands, variants and storage.
- [Implementation status](docs/status.md) and [Austin implementation](docs/austin-implementation.md): what is connected, tested and still unresolved.
- [Source study](docs/source-study.md) and [source index](docs/source-index.md): a route into the FORTRAN and assembly.
- [Compatibility findings](docs/compatibility.md), [modernization decisions](docs/decisions.md) and [playable repairs](docs/playable-decisions.md): evidence and reasons behind departures.
- [Legacy sources](legacy/README.md) and [Austin reference build](legacy/utexas-reference/f78f2ec/README.md): archives, provenance and build artifacts.
- [Work log](WORK_LOG.md): the ongoing implementation record.
- [Repository artifacts](docs/repository-artifacts.md): which generated files and reference evidence are versioned, and why.

For development:

```sh
npm run check          # Source/generated-data audit, type checking and tests
npm run audit:check    # Verify the preserved sources and generated artifacts
```

The runtime has no third-party runtime dependencies. Tests use Node's built-in
test runner. `npm run audit` regenerates source-derived artifacts; generated
files should be reviewed alongside their source evidence.

Bug reports are most useful with the selected variant, client, exact command
sequence, and observed output. Behavioral changes should identify the relevant
source statements and include focused tests. See [AGENTS.md](AGENTS.md) for the
project's porting contract.

## License

The combined port is distributed under **GPL-3.0-or-later**; see [LICENSE](LICENSE).
Original project contributions are additionally offered under [MIT](LICENSE-MIT)
where their copyright holders control those rights. That additional permission
does not make the entire combined game MIT-only. The imported Austin source
snapshot retains its upstream MIT license. See [LICENSING.md](LICENSING.md) for
scope and attribution.
