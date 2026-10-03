# Code review: FORTRAN/MACRO-10 to TypeScript port, October 3, 2026

Reviewer: Claude (Opus 5.5), at the request of Eric Freeman.
Repository checkpoint: `5c2011b` on branch `claude/eager-lovelace-1xtqam`.
Scope: the TypeScript port of both supplied variants (Austin reconstruction, the
default, and CompuServe), the modern host, the tests, and the current
documentation, including specification 1.0.

This is a review record. It does not change game code, legacy archives or
generated data. Findings that touch fidelity are evaluated against the porting
contract in [AGENTS.md](../../AGENTS.md): executable source statements are the
authority, help text and comments are secondary, and modern host mechanisms are
acceptable where the source calls monitor services.

## 1. Summary

The core game port is in good condition. Across combat, movement, ship and planet
commands, the main command loop, token input, abbreviations, output primitives and
reports, the reviewers found **no parity defect in the routines the production
session actually runs**, in either variant. The production statement routines
follow their FORTRAN sources statement by statement. That includes random-draw
order and count, integer truncation, scaled arithmetic, the order of side effects,
and the places where Austin differs from CompuServe. All 324 `ASCIZ` messages per
variant match MSG.MAC/SETMSG.MAC byte for byte.

The significant problems are elsewhere:

1. **Hosting robustness.** One unauthenticated Telnet client can freeze the
   whole server with a large input burst (C1). The deployment binds `0.0.0.0`.
2. **Playable-profile crashes reachable from ordinary input.** `PG> TYPE` (H1)
   and decimal tokens of 2^35 or more (H2) end the player's session with an
   internal error in the default profile.
3. **A host lock model that does not match Austin's non-blocking ENQ** (H3). A
   failed Austin LOCK can later hand that job a global lock it does not know it
   holds.
4. **Structure.** Production imports 83 modules from `test/`. About 3,200 lines
   of superseded `src/` implementations run only under tests, and some of them
   already disagree with both the source and the production code (M3, M4).
5. **Documentation.** One specification rule contradicts the executable source
   (H4: unmarked coordinates). The current guides disagree on the number of
   playable repairs, and `status.md` has drifted from the documentation standard.

### Findings by severity

| Severity | Count | IDs |
| --- | --- | --- |
| Critical | 1 | C1 |
| High | 4 | H1–H4 |
| Medium | 11 | M1–M11 |
| Low | 24 | L1–L24 |
| Info | 6 | I1–I6 |

### What “parity” findings mean here

Each finding is classified as one of the following:

- **Port defect:** the TypeScript does not do what the selected source does.
- **Unresolved source/compiler semantics:** the source depends on behavior that
  is not in the archive, such as register allocation or ENQ semantics.
- **Playable gap:** the source path is reproduced faithfully but cannot run in
  ordinary play, so the profile's promise of a functioning game is not met.
- **Host defect:** a fault in the modern runtime that has no source counterpart.

## 2. Method and evidence

The review was split into six areas. Each area was reviewed independently and
then checked again by the lead reviewer:

| Area | TypeScript reviewed | Source compared |
| --- | --- | --- |
| Machine primitives and arithmetic | `src/compat/word36.ts`, `float-*36.ts`, `ran-float36.ts`, power, output and number formatting, `src/runtime/{random,power,rounded-numeric,token-floating}.ts` | WARMAC.MAC (both variants): RAN/IRAN/SETRAN, PWR, ANUM, ONUM/ODEC/OFLT, OTIM, PDIST/LDIS |
| Combat and hazards | phaser, torpedo, damage, nova/supernova, Romulan, OUTHIT, base, planet, ENDGAM and POINTS statement routines and their binders | PHACON, TORDAM, TORP, NOVA, SNOVA, ROMDRV, ROMTOR, ROMSTR, DIST, BASPHA/BASBLD/BASKIL, PLNATK/PLNRMV, JUMP, ENDGAM, POINTS, OUTHIT, DAMAGE, KQSRCH |
| Movement, commands and main loop | move, tractor, dock, energy, shield, repair, capture, build, place, setup, pregame, check, free, set, time and command-loop statement routines and binders | MOVE, CHECK/CHKPNT, JUMP, TRACTR, DOCK, ENERGY, SHIELD, REPAIR, CAPTUR, BUILD, PLACE, SETUP, PREGAM, FREE, SET, TIME, DECWAR main program |
| Input, parsing and output | GTKN/NXTT/ANUM, INLI, EQUAL, GETCMD, OUT/OCHR, STATUS, USERS, LIST, TELL, MAKMSG/GETMSG, HELP and generated message tables | GETCMD, LST*.FOR, STATUS, USERS, TELL, OUTMSG, PROMPT, WARMAC/MSG/SETMSG.MAC |
| Runtime and host | `src/runtime/*`, `src/transport/*`, `tools/run-telnet.ts`, lock/wait/interrupt services, `deploy/` | WARMAC LOCK/UNLO, PAUSE, HIBER (host boundary) |
| Documentation | README, `docs/*.md`, `legacy/README.md`, experimental READMEs, `docs/spec1.0` | Source spot checks for spec rules |

Repository checks at `5c2011b`, run on Node v22.22.0:

| Check | Result |
| --- | --- |
| `npm run audit:check` | Pass: 135 file hashes; CompuServe 10 ships/60 planets; Austin 18 ships/20 planets |
| `npm run typecheck` | Pass (`strict`) |
| `npm test` | **4,606 / 4,606 pass**, about 63 s. One reviewer saw a single 15-second timeout in `development-server.test.ts:38` on a loaded machine; it did not recur in the full run. |
| `docs/spec1.0` `npm run check` | Pass: `tsc` and 278 tests |
| Relative Markdown links | 0 broken across 97 files |

`package.json` declares `engines: node >= 24`. All results above were obtained on
Node 22.22, which ran the `.ts` sources without trouble (see L24).

Every Critical and High finding was reproduced or re-read in source by the lead
reviewer, as noted in each entry. Reproduction scripts were throwaway and are not
committed; each entry describes how to reproduce it.

## 3. Critical

### C1 — One client can freeze the whole server with an input burst (host defect)

- **Where:** `src/runtime/session.ts:56` (`queue.shift()`), `:71` (unbounded
  `receive`), `:115` (`wait()` returns immediately while input is queued);
  `src/transport/server.ts:63-72`.
- **Problem:** Every received byte is appended to an unbounded `number[]`. While
  input is queued, the drive loop continues on microtasks only and never yields
  to the event loop. `Array.shift()` is O(n), so the total work grows
  quadratically with the size of the burst.
- **Evidence:** This was reproduced in-process with an Austin playable session at
  the name prompt and input that produces no output:

  | Burst | Time to drain | Longest event-loop stall |
  | --- | --- | --- |
  | 16 KB | 35 ms | 0 ms |
  | 128 KB | 1,455 ms | 1,455 ms |
  | 256 KB | 6.8 s | (reviewer's measurement) |

  Against the real server, an 8 MB burst with no line terminator stopped all
  other connections and new sessions for more than 40 s, at 98% CPU. SIGTERM was
  not handled while the loop was blocked, so `kill -9` was required, which left a
  stale `.host.lock` (see M6).
- **Impact:** The systemd unit in `deploy/` binds `0.0.0.0:2423`. Anyone who can
  reach the port can stop the game for every player.
- **Fix:**
  - Bound the per-session input queue, for example at 4–64 KB. Above a
    high-water mark, call `socket.pause()`; resume when the queue drains.
  - Replace `shift()` with a head index or ring buffer.
  - Make the drive loop yield a macrotask (`setImmediate`) every N steps or every
    few milliseconds even while input is queued.
  - Also cap the pre-commission `editedName` buffer (`game-session.ts:132`).
  - Add flood tests.

  None of this changes game semantics. The source's line editor already limits a
  line to 80 characters.

## 4. High

### H1 — `TYPE` at the `PG>` prompt ends the session in the playable profile (playable gap, both variants)

- **Where:** `src/game/pregame-statements.ts:42` dispatches `{routine:'type'}`
  with no argument. `test/fixtures/pregame-runtime.ts:86` throws
  `fixture requires zero-argument TYPE binding` unless `typeBinding.kind` has been
  supplied, and `test/fixtures/playable-runtime-policy.ts` never supplies it.
- **Source:** In both variants PREGAM calls TYPE without its declared argument:
  `810 call type` at CompuServe SETUP.FOR:184 and Austin SETUP.FOR:121. TYPE is a
  listed pregame command (CompuServe SETUP.FOR:517, Austin SETUP.FOR:421).
- **Evidence:** Reproduced by the lead reviewer. `createGameSession(..., {playable:true})`,
  then `PREGAME`, then `TYPE OUTPUT`, ends with
  `{"reason":"failed","error":"fixture requires zero-argument TYPE binding"}` in
  both Austin and CompuServe.

  The source defect is already recorded as unresolved (`docs/compatibility.md:639`,
  `docs/decisions.md:2840`). The playable profile does not repair it, although
  `docs/playable-decisions.md` says playable checks cover "pregame return".
- **Fix:** Add a narrow playable repair that follows the TRACTR precedent: bind a
  writable private KIND word in `bindPlayablePolicy`. `test/type-runtime.test.ts:25`
  already shows that a KIND other than 1 or 2 makes TYPE parse its switches
  normally. Document the repair in the playable-decisions table and add a live
  `PG> TYPE` regression test for both variants.

### H2 — A decimal token of 2^35 or more ends the session (playable gap; unresolved arithmetic documented)

- **Where:** `src/runtime/token-floating.ts:15` calls
  `src/compat/float-arithmetic36.ts:34`, which throws
  `RangeError('ANUM unrounded float binding requires nonnegative operands')`. The
  call comes from `src/compat/token-runtime.ts:42/63` via `gtkn-runtime.ts:36`.
- **Source:** In WARMAC ANUM.2, `IMULI` wraps the integer part. ANUM.3 then does
  `FAD X2,T1` with a negative X2 (CompuServe WARMAC.MAC:1830-1844, Austin
  WARMAC.MAC:1525-1540).
- **Evidence:** Lead reviewer re-read the probe output. In the default Austin
  playable profile, `status 40000000000.5` ends the session with the RangeError
  above. `status 99999999999.5` wraps to a positive word and is accepted.

  GTKN tokenizes the whole line before dispatch, so this happens in any command
  context. `docs/platform-manuals.md:81-87` records the unsupported operand
  domain, but nothing prevents players from reaching it.
- **Fix:** Implement signed unrounded FAD for the target CPU (manual pp. 2-22/2-23).
  Alternatively, add a documented playable-only repair, such as classifying the
  token as non-numeric, and keep the diagnostic failure under `--strict`. Add
  regression tests for both profiles. This is PDP-10 numeric work; under the
  AGENTS.md workflow preference it should be done at the Astra setting.

### H3 — A failed Austin LOCK leaves the job queued, so it can later be granted a global lock it does not know it holds (host model mismatch)

- **Where:** `src/runtime/game-session.ts:192-196`; `src/runtime/resource-locks.ts:8-13`.
- **Source:** Austin WARMAC.MAC:3776-3786 issues `ENQ.` with function `.ENQAA`,
  which allocates the resource only if it is available. On failure it sets
  LKFAIL, sleeps 25 ms (`HIBER`) and returns. Several Austin callers then abandon
  the operation without calling UNLOCK: NOVA (DECWAR.FOR:2376), TORP (4388) and
  ROMTOR (3497).
- **Problem:** The host `enq` calls `ResourceLocks.request`, which records a
  failed requester as a FIFO waiter. When the owner releases, ownership passes to
  that waiter and its grant callback fires, even though the Austin code has
  already given up.
- **Evidence:** Lead reviewer confirmed this in the code. The reviewer's probe
  showed: A is granted; B is queued; A releases; B becomes owner and C is queued.

  Austin keys 1 and 2 are global, and Austin releases a job's locks only at its
  next UNLOCK (for example GETCMD entry) or at exit. A job that receives a stray
  grant while idle at `Command:` therefore blocks the lock for everyone else,
  whose LOCK calls keep failing or retrying (for example the "keep trying" loop at
  DECWAR.FOR:1146). No test covers this.
- **Fix:**
  - For Austin, use a non-queuing `tryAcquire` that fails with no side effect.
    CompuServe's blocking ENQ/HV.LOK flow can keep the queue.
  - Confirm `.ENQAA` against the authorized monitor manual and record it in
    `docs/platform-manuals.md` and `docs/compatibility.md`.
  - Add a test: Austin failed LOCK, owner release, then no grant to the failed
    job.

  This is ENQ and concurrency semantics; the workflow preference calls for Astra.

### H4 — Specification 1.0 says unmarked coordinates are initially absolute; Austin's executable source makes them relative (documentation/specification)

- **Where:** `docs/spec1.0/04-command-grammar.md:130-131`
  ("An unmarked pair uses the player's current coordinate-input mode, initially
  absolute"). The supporting evidence, `docs/spec1.0/evidence/03-04-language.md:25-27`,
  rests on help text (HLP/DECWAR.RNH:316-328).
- **Source:**
  - Austin assigns ICFLG only in SET ICDEF (DECWAR.FOR:3706-3707). The block that
    used to set it from the experience answer is commented out (DECWAR.FOR:18-40).
  - LOCATE (DECWAR.FOR:1423) adds the ship's position unless `icflg .eq. KABS`
    (KABS=1, KREL=−1, PARAM.FOR:139-141).
  - With LOWSEG cleared to zero, an unmarked pair is therefore a displacement
    from the ship until the player enters `SET ICDEF ABSOLUTE`.
  - The preserved DECWAR.INI sets prompt, OCDEF and output, but not ICDEF.
  - TYPE reports ICFLG=0 as "both" (DECWAR.FOR:4573).
- **Evidence:** Lead reviewer read the source lines above. A TypeScript session
  probe showed `ICFLG 0n` after the INI. The port (`src/game/locate-statements.ts:66`)
  follows the source, so this is a specification error, not a port defect.
  CompuServe also sets ICFLG from the experience level, so "initially" depends on
  the variant and the player's answer.
- **Fix:**
  - Correct the spec rule, or mark it as a reviewer-note conflict with the source
    lines above.
  - Record the conflict in `docs/compatibility.md`.
  - In `docs/running.md`, tell players that in Austin an unmarked `MOVE 23 22` is
    relative and that `MOVE ABSOLUTE 23 22` or `SET ICDEF ABSOLUTE` gives
    absolute coordinates. Players who read `HELP MOVE` will otherwise be misled.

## 5. Medium

### M1 — `multiply36` does not model the IMUL overflow sign (suspected port defect)

- **Where:** `src/compat/word36.ts:14` (`multiply36 = signed36(a*b)`).
- **Callers:** It serves as IMUL/IMULI in:
  - `src/compat/input-memory.ts:121`
  - `src/compat/parser.ts:78`
  - `test/fixtures/token-runtime.ts:33`, `make-hit-runtime.ts:11`, `board-runtime.ts:26`
  - several component models
- **Source:** Every compiled FORTRAN integer `*`, plus WARMAC `IMULI`
  (Austin :1528 ANUM, :2311 RAN).
- **Problem:** To the reviewer's understanding, which has not yet been checked
  against the manual, PDP-10 IMUL keeps the low 35 bits of the product and sets
  the sign bit from the *true* product, raising overflow. `signed36` instead takes
  the sign from bit 35 of the truncated product.
- **Evidence:** The two models disagree on overflow:
  - `multiply36(2^34, 2)` is −2^35 under the current code and 0 under the IMUL
    model.
  - A typed `40000000000` accumulates to −28,719,476,736 under the current code
    and +5,640,261,632 under the IMUL model.

  RAN is unaffected, because `TLZ` clears the sign. This domain interacts with H2.
- **Fix:** Check the IMUL page of the processor reference and record it in
  `docs/platform-manuals.md`. Then add an `imul36` returning `{word, overflow}`
  for every IMUL site, with overflow tests in both directions. This needs Astra.

### M2 — LSTFLG can pass `MSG=0` to OUT, which prints bytes from accumulator 0 (unresolved compiler state, undocumented)

- **Where:** `src/game/list-flag-statements.ts:51-52`; `test/fixtures/main-list-runtime.ts:29`.
- **Source:** CompuServe LSTFLG.FOR:199-226; Austin DECWAR.FOR:1903-1916. OUT's
  word-or-address rule is at WARMAC.MAC:1986-1992 (Austin 1653).
- **Problem:** When no SMASK/OMASK case matches, MSG stays 0. OUT treats a word
  with a zero left half as an address and prints ASCIZ text starting at AC0. In
  the port, AC0 holds whatever the register model left there. The original
  depends on FORTRAN-10 register allocation, which has not been recovered.
- **Evidence:** Lead reviewer confirmed this in the probe output. The CompuServe
  pregame summary prints `No` followed by five DEL bytes (0x7F) and then
  ` forces`, in both profiles. Nothing in `docs/compatibility.md` covers this case.
- **Fix:** Record the case in `compatibility.md` as unresolved and
  compiler-dependent. For the playable profile, add a repair that prints nothing
  for a null MSG. Add a byte-level test. Check whether Austin reaches the same
  path.

### M3 — About 3,200 lines of superseded `src/` implementations run only under tests, and some already disagree with the source (code quality)

- **Evidence:** An import-closure analysis from `src/runtime/game-session.ts` and
  `tools/run-telnet.ts` finds **43 `src/` files (3,204 lines) that the host never
  reaches**. Examples include `src/game/{phasers,move,nova,shield,scan,turn,energy,repair,check,quit,planet-commands,romulan-*,out-hit,endgame,remove-planet,list*,password,name,gripe*}.ts`,
  `src/compat/{random,output-memory,line-input,killow}.ts`, and the
  `CommandScanner`/`MemoryCommandInput` input layer.

  Some modules are imported only for their types or locals classes, but their
  routine bodies never run in production. This applies to `tractor()`,
  `releaseTractor()`, `place()`, `setup()`, and to `freeShip`, `restartShip` and
  `tractorOff` in `lifecycle.ts`. Tests such as `move.test.ts`, `phasers.test.ts`,
  `torpedoes.test.ts`, `weapon-damage.test.ts` and `lifecycle.test.ts` exercise
  these copies.
- **Where the copies already diverge:**
  - `src/game/move.ts:200-209` has only CompuServe's two-word board lock. It lacks
    Austin's `call lock(123)` / `lkfail` / `unlock(1)` branch
    (DECWAR.FOR:2234-2244), which `move-statements.ts:93,103` implements.
  - `src/game/lifecycle.ts:90` clears every hit register. FREE clears only DBITS,
    DISPFR and `BLKSET(IWHAT,0,17)` (FREE.FOR:92-93), which `free-statements.ts:56`
    follows.
  - `src/compat/parser.ts` and `input-memory.ts` reject every decimal point.
    `line-input.ts` and `inli.ts` hard-code the CompuServe ECHON/ECHOFF `POPJ`,
    which Austin comments out (WARMAC.MAC:1145-1157). Production handles both
    correctly.
- **Impact:** Test counts overstate coverage of the running game. A fix applied
  to one copy may never reach the other. `docs/compatibility.md:1328-1331` still
  says decimal input throws, which describes the dead layer, not delivered
  behavior.
- **Fix:**
  - Move the shared locals/memory classes into their own modules.
  - Retire the duplicate routines, or move them to a clearly labeled
    reference-model directory outside `src/`.
  - Point the behavioral tests at the `*-statements.ts` routines through the
    production binders.
  - Update the stale compatibility statement.

### M4 — The production runtime is composed from `test/` (code quality and robustness)

- **Where:** `src/runtime/game-session.ts:7-11,28`; `src/runtime/playable-ending.ts:1-2`.
- **Evidence:** The static import graph from the host reaches **83 modules under
  `test/`**, including `test/support/weapon-damage-fixture.ts` and
  `test/support/rational-real.ts`. 37 of them import `node:assert` and assert on
  live paths, for example:
  - `base-phaser-runtime.ts` `assert.equal(ship,false)`
  - `editor-runtime.ts:27,32`
  - `wait-runtime.ts:34`
  - the `MOVM` services in `status-output.ts:30`, `status-runtime.ts:38`,
    `base-phaser-runtime.ts:36` and `combat-displacement-runtime.ts:31`, which
    assert instead of producing MOVM's −2^35 overflow result
  - `setup-prefix-runtime.ts:28` (IABS of −2^35)

  A failed assertion ends that player's session as `failed`.

  Production binders also seed sample state while they are being constructed:
  - `test/fixtures/base-phaser-runtime.ts:28-31` writes team, NUMPLY, EROM, a
    sample ship and a base.
  - `test/fixtures/status-runtime.ts:25,37` writes BITS and parses a synthetic
    `STATUS` line into the token arrays.

  `game-session.ts:44-45` later clears HFZ..HLZ and GTKN overwrites the tokens,
  so no observable effect was found. That safety depends on construction order,
  which nothing enforces (suspected latent risk).
- **Context:** The production factory is also composed by monkey-patching
  properties of fixture objects (`game-session.ts:70-110`). This works, but it
  makes the required services hard to enumerate, which the porting contract asks
  for ("keep required services explicit").

  The docs acknowledge that the binders live under `test/fixtures`, but describe
  this as purely organizational. The assertions and sample seeding show that it
  is more than naming.
- **Fix:**
  - Move the binders to `src/runtime/binders/`.
  - Replace `assert` with typed host errors that name the source line, or
    implement the machine result (MOVM, IABS overflow).
  - Remove sample seeding from production construction.
  - Add a check that rejects `src/** → test/**` imports.
  - Reword the comments that still say production uses rational REAL/RAN
    (`main-defenses-runtime.ts:24-25`, `romulan-torpedo-runtime.ts:34`,
    `nova-runtime.ts:37`). `game-session.ts:80-84` installs PDP-10 rounded
    floating point and the shared seed.

### M5 — The admission timeout disarms itself permanently (host defect)

- **Where:** `src/transport/server.ts:53-61`.
- **Problem:**
  - The first `timeout` event that fires while the connection is active calls
    `socket.setTimeout(0)`. If a captain who has been idle for 300 s while
    commissioned later returns to pregame (`game-session.ts:175`), that captain is
    no longer subject to the timeout. They can then sit in SETUP holding the
    global setup lock, which the policy exists to prevent. (This consequence was
    inferred from the code, not reproduced.)
  - Node's socket timeout counts any traffic, so a client can keep an admission
    connection alive with invisible `IAC NOP` bytes.
- **Fix:** Keep the timer armed and check the phase each time it fires. Reset it
  only on decoded game input.

### M6 — Unhandled errors and crashes leave a stale data lock, so the service cannot restart itself (host defect)

- **Where:** `tools/run-telnet.ts:39-82,242`; `src/transport/server.ts:51,76`;
  `deploy/decwar-bitnami.service`.
- **Problem:**
  - There is no `uncaughtException` or `unhandledRejection` handler.
  - `void session.start().then(...)` calls `onSessionEnd`/`onTelemetry`, which
    use `appendFileSync`. A full disk or a missing log directory therefore becomes
    an unhandled rejection that crashes Node.
  - After any crash, or a systemd SIGKILL at `TimeoutStopSec` (for example during
    C1), `.host.lock` remains. `Restart=on-failure` then fails on every attempt.
    This was reproduced by the reviewer.
  - `running.md:149` documents the stale lock; `external-server.md` does not.
- **Fix:**
  - Wrap the callbacks in try/catch and make logging best-effort.
  - Record the PID in the lock and check whether that process is alive
    (`process.kill(pid,0)`) at startup.
  - Document recovery in the systemd recipe.

### M7 — No connection limits (host defect)

- **Where:** `src/transport/server.ts:20`.
- **Problem:** There is no `maxConnections`, no per-address limit and no shorter
  pre-name timeout. The reviewer measured about 1.7 MB RSS per idle connection,
  and each connection can live for up to 300 s before admission. One client can
  reconnect repeatedly to monopolize the single setup lock.
- **Fix:** Add limits and document them in `docs/external-server.md`.

### M8 — Documents disagree on how many playable repairs exist (documentation)

- **Evidence:**
  - `docs/architecture.md:96-97` says "five".
  - The table in `docs/playable-decisions.md` has seven rows, and line 39 says
    "All six repairs above".
  - The Austin war-ending latch is described separately (lines 69-88).
  - `status.md:301-302` and `running.md` list four.
  - The 500 ms input-interval policy, which drops lines and rings BEL in playable
    mode only, is missing from the table.
  - `bindPlayablePolicy` also rebinds `f.endgame.io.kilhgh`
    (`playable-runtime-policy.ts:21`), and nothing documents it.
- **Fix:** Make `playable-decisions.md` the single authoritative list, split into
  three groups: source repairs, the Austin-only ending, and host policies
  (admission timeout, input interval). Other documents should link to it rather
  than restate a count. Document the KILHGH binding.

### M9 — `docs/status.md` does not follow the "replace stale status" rule (documentation)

- **Evidence:**
  - The header says "Reviewed September 5, 2026", but the page describes work
    from September 8 to 21.
  - Lines 43-265 are a chronological account of experimental-bot and parity
    runs.
  - A paragraph about bot resupply (lines 330-334) is appended after "Reading
    older records".
  - Test counts conflict: 4,589 at line 22, undated, and 4,563 at lines 269-272.
- **Fix:**
  - Re-date the header.
  - Move the narratives to the experimental READMEs, `docs/history` or the
    WORK_LOG.
  - Keep one dated verification line. 4,606 tests pass at `5c2011b`.

### M10 — `docs/external-server.md` implies the galaxy is saved to disk (documentation)

- **Evidence:** Lines 3-6, 46-47 and 143-148 mention keeping "galaxy data" outside
  the checkout, "DECWAR's normal persistence path" and backing up "a consistent
  stopped galaxy". In fact, live galaxies exist only in memory (`running.md:302`,
  `status.md:34`), and Austin has no persistent standings.
- **Fix:** Say what the data directory actually holds: variant metadata, the host
  lock and GRIPE files, plus CompuServe statistics. State that a restart ends the
  current galaxy.

### M11 — Current guides cite evidence under `logs/`, which is not in the repository (documentation)

- **Evidence:** `.gitignore` excludes `/logs/`, and `git ls-files logs` is empty.
  Even so, the current guides cite logs as evidence:
  - `status.md` has 17 "Evidence: logs/…" citations.
  - `playable-decisions.md:106`, `testing-checkpoint.md:83/86` and
    `runtime-diagnostics.md:48` cite more.
- **Fix:** Pick one of three approaches:
  - State once that these are local, unpublished artifacts.
  - Publish the cited reports.
  - Cite the reproducing command instead of a path.

## 6. Low

### Runtime

**L1 — Output backpressure is ignored.** At `server.ts:25-27`, a `false` return
from `socket.write` only increments a counter. A client that never reads lets
`writableLength` grow without limit. Fix: suspend the session or disconnect the
client above a threshold.

**L2 — Each output byte is sent as its own TCP segment.** `outchr`
(`game-session.ts:87-96`) writes one byte and yields, with `setNoDelay(true)` set.
The reviewer's probe received `"D"`, `"E"`, `"C"`… as separate segments, which
inflates header overhead roughly 40× on a WAN. This is cooperative scheduling
behavior, not historical baud timing. Fix: buffer output per drive step, or use
`cork()`/`uncork()`.

**L3 — Rejected input can grow the log without limit.** Each rejected line costs a
synchronous `appendFileSync` (`run-telnet.ts:242,253`), and the log has no
rotation or size cap. Fix: aggregate rejections and document log rotation. This
interacts with M6.

**L4 — Ctrl-C can overtake earlier typeahead.** At `server.ts:68-71`, ETX/IP in a
packet is delivered before every data byte in that packet, including bytes typed
before the ^C. This matches the stated design ("deliver controls before
waking"). Fix: either split the data at the interrupt or document the ordering in
D-171.

**L5 — Two sources of truth for strict versus playable.**
- `VariantContext.execution` (`variant.ts:18`) is never read; gating uses
  `options.playable`.
- The defaults differ: `createVariantContext` defaults to playable,
  `createGameSession` to historical, and `WorldDirectory`/`SharedGameWorld` to
  CompuServe.
- `currentVariant()` silently falls back to CompuServe outside a scope.

Fix: derive one value from the other, or assert that they agree. Make the
fallback throw in live compositions.

**L6 — File-size limits end the session.** When the GRIPE file reaches 131,072
words, or a statistics file is not 640 words (`gripe-files.ts:162`,
`statistics-files.ts:205`), the command throws and ends the session every time.
Fix: decide whether this is source behavior, then document it or return an error
the source can handle.

### Arithmetic

**L7 — `formatInteger` disagrees with ONUM. for −2^35.** `src/compat/output.ts:6-16`
prints `-34359738368`. The machine-faithful ONUM path prints `-` and leaves 11
words on the data stack, because MOVM overflows. Fix: document this as a
divergence or route it through the machine path, and add a test.

**L8 — `divide36` and the CPU model are underspecified.**
- `docs/platform-manuals.md` says the KI raises divide check for MIN/+1, but
  `divide36(MIN,1)` returns MIN. This is unreachable from PWR and RAN.
- The Austin reference runs on a **KL10** (`boot-reference.ini`:
  `set cpu … kl10b`), while CompuServe's map is KI. The docs never say which
  CPU's arithmetic each variant follows.

Fix: state the CPU per variant, and either keep `divide36` as a checked helper or
add a raw IDIV.

**L9 — Arithmetic edge-case tests are missing.** Untested cases:
- `multiply36` overflow
- negative midpoint ties in FADR/FSBR
- an exact midpoint in FDVR
- overflowing and underflowing decimal literals (`'1e39'` wraps and sets `trap1`)
- the FIX boundary at exponent exactly 35
- FLTR/FIX of MIN

The RAN tests compare the session generator against `DecwarRandom`, which
implements the same algorithm, rather than against reference-executable draws.

### Combat and commands

**L10 — Austin combat paths are only partly tested.** These Austin paths have no
focused tests:
- ROMDRV `IRAN(5)`/`IRAN(10)` (`romulan-driver-statements.ts:62,108`)
- the PLNATK JA copy (`planet-attack-statements.ts:43`)
- the SNOVA VA/HA copies (`nova-statements.ts:145`)

These paths change later random draws and alias targets, and Austin is the
default variant.

**L11 — Misleading octal masks in SETUP admission.**
`src/game/setup-admission-statements.ts:130` embeds CompuServe's octal masks
(`0o1777n`, `0o1740n`, `0o37n`) but uses them only as null/not-null flags. The
values actually written come, correctly, from `definition.groupMasks`. For
Austin the inline literals are wrong data. Fix: use a boolean flag.

**L12 — Unchecked casts in the dispatch binder.**
`test/fixtures/main-loop-runtime.ts:44-46` uses `call.argument as 0|1|2` and
`BigInt(call.argument as number)`. Fix: use a discriminated union per routine.

**L13 — Source citations need correction.**
- `place-statements.ts:21` and `place.ts:18` cite `PLACE.FOR:26-59`, but the file
  has 57 lines.
- The in-scope `*-statements.ts` and WARMAC-derived files cite CompuServe line
  numbers without saying so, and Austin-only branches carry no Austin citation.
  Examples: `move-statements.ts:92-106` (Austin DECWAR.FOR:2234-2244),
  `setup-prefix-statements.ts:50` (SETUP.FOR:221), `random.ts:3` (Austin
  WARMAC 2289-2316) and `power.ts:4` (2322-2349).

Fix: correct the PLACE range, prefix CompuServe citations with the variant, and
add Austin lines for Austin branches.

**L14 — The SETUP tournament-seed IABS asserts (suspected).**
`test/fixtures/setup-prefix-runtime.ts:28` throws if the seed token is −2^35
(SETUP.FOR:264 `iabs`). It is not established whether a typed token can produce
that word.

**L15 — POINTS message keys are built with casts.** `points-statements.ts:74-75`
builds keys with template-literal casts. They are safe only because of the clamp
on line 73; a typed lookup table would remove the cast.

### Documentation

**L16 — Test counts differ across documents.** The cited counts are 4,563, 4,576
and 4,589; the current count is 4,606. Label each count with its date and commit.
The cited commits `31d34e4` and `87977cb` cannot be checked in a shallow clone.

**L17 — `docs/repository-artifacts.md:15` is wrong about `tools/spec`.** It says
`tools/spec` is not in Git, but four files there are tracked.

**L18 — WORK_LOG.md mixes chronological orders.** Most entries are newest-first,
but a tail of entries from line 8946 onward is appended oldest-first. State the
convention at the top.

**L19 — The Austin PAUSE link points one line early.**
`docs/playable-decisions.md:56` links `WARMAC.MAC#L3373`, which is a comment line.
The `pause:` label is at 3374.

**L20 — A spec evidence range runs into the next routine.**
`docs/spec1.0/evidence/03-04-language.md:17` gives LOCATE/RELOC as
`DECWAR.FOR:1396–1525`. LOCATE ends at 1516, and LSTSCN starts at 1519.

**L21 — Spec §4.1 omits the five-character matching rule.** §4.1
(`04-command-grammar.md:19-24`) states a prefix rule without pointing to C-008.
EQUAL compares at most five characters, so `STATUSXYZ` is accepted as STATUS.

**L22 — The spec README reads like a progress log.**
`docs/spec1.0/README.md:43-68` refers to a PDF that is not tracked and does not
say how to run the spec checks (`npm ci` at the root, then `npm run check` in
`docs/spec1.0`).

**L23 — The automated-player README points to the wrong port.**
`experimental/automated-player/README.md:27-29`: the fleet defaults to port 2423
(`fleet.ts:14`), while `npm start` listens on 2323. A newcomer who follows the
README will fail to connect.

**L24 — Minor wording and environment issues.**
- `running.md:270` "RESET starts…" uses source jargon.
- `legacy/README.md:8` and `LICENSING.md:17` spell "Compuserve".
- The `--help` text in `tools/run-telnet.ts:19` shows a fixed log name, but the
  default log name is timestamped.
- A column is misaligned in the spec abbreviation table (line 43).
- The engines field requires Node 24, but the suite also passes on Node 22.22.
  Either relax the field or say why 24 is required.

## 7. Info

**I1 — Short-circuit evaluation of compound conditions remains unresolved (already
documented).** The live `and`/`or` services evaluate the right operand only when
needed. Where that operand calls `IRAN`, this changes the random-draw count:
- SNOVA.FOR:45
- PLNATK.FOR:38
- TORP.FOR:204
- ROMDRV.FOR:49
- DIST.FOR:57-62

This is recorded in `docs/compatibility.md:1333,3115` and `docs/decisions.md:2794`.
It could be settled with a targeted draw-count trace on the preserved Austin
reference executable (Astra work).

**I2 — Normalization of negative powers of two.** −0.5 and similar values are
encoded as whole-word negations, and the decoder rejects the alternative
"−1×2^(n−1)" forms. This is consistent with the manual text the repository
cites, but no test pins the −0.5 word.

**I3 — TypeScript strictness.** tsconfig enables `strict` but not
`noUncheckedIndexedAccess` or `exactOptionalPropertyTypes`. There are no `any`,
`@ts-ignore` or `@ts-expect-error` in `src/`. A few non-null assertions remain
(`server.ts:54`, `queue.shift()!`), all guarded in practice.

**I4 — Readability.** Many files pack several statements onto one line
(`session.ts:134-136`, `server.ts`, most binders). This makes line-level review,
blame and source tracing harder. A formatter would help, provided generated
files and source-line-referenced comments are kept stable.

**I5 — No CI or lint configuration.** There is no `.github/` and no linter.
`npm run check` exists but is not enforced anywhere. A minimal CI job running
`npm run check` would protect the strong existing test suite, and it is also the
natural place for the import rule in M4.

**I6 — `docs/compatibility.md:1328-1331` describes the dead input layer.** It
still says decimal input throws. Delivered behavior parses decimals, apart from
H2. See M3.

## 8. Verified as matching the source

The following were compared statement by statement (or instruction by
instruction for MACRO-10), in both variants unless noted. No parity defect was
found in the production path.

**Arithmetic and machine primitives**
- RAN./IRAN/SETRAN: `SKIPN`/`MSTIME`, `HRRI 260543`, `IMULI` with `TLZ`,
  `IDIVI 257`, `IDIV @0(ARG)`, the right half of `MOVEI t0,1(t1)`, and
  `FSC 200` → q/2^27.
- PWR: sign tests, the 1.0 result for non-positive exponents, recursion, the
  SAVE/RESTOR order, and the order of FMPR operations.
- FMPR (rounding before the exponent check, underflow flags), FADR/FSBR, FDVR
  (rounding equivalent to `2(n mod d) ≥ d`), zero-divisor behavior, FIX (bounds
  check, truncation toward zero) and FLTR (rounding).
- ANUM unrounded FAD/FDV for nonnegative operands.
- Word helpers: `add36`, `divide36` truncation and remainder sign, ASCII/SIXBIT
  packing, and half-word helpers.
- ONUM./OSN1-3, ODEC/OSDEC, OFLT/OSFLT (including OFLT dropping the sign of
  −0.x, which is source behavior), O2DG/O2DB, OTIM/O2D, ETIM, OSTB/OSTBX (the
  9-column padding quirk is preserved), OSIX, OUT/SKIP/TAB/SPACES/CRLF/OUTC/OUT2C,
  ODISP/ODEV/OCOND, OCHR.B/T/X, ICHR.B/T, OGCH., PDIST, LDIS, the FORTRAN V5 DO
  trip count, and DATE/DACON.
- No host floating point is used for game numerics in the reviewed files.
  `Number()` appears only for indices and character codes.

**Combat and hazards**
- PHACON: two separate overheat draws, the damage formula and promotion order,
  the planet-builds test, help and death-notice ordering, and PHBANK set last.
- TORDAM/PHADAM: all labels, shield absorption, the clamp applied to ships only,
  the critical-device draw, scoring, base critical hits, the BASKIL/NBASE/SETDSP
  order, powfac, PWR and the 0.8 penalty.
- TORP: validation, misfire and re-entry, deflection draws, CHKOUT aliasing,
  stars, planets, black holes, Romulans, friendly hits, and base help and
  destruction.
- NOVA and SNOVA, including the 29-star cap and the Austin VA/HA copies.
- ROMDRV, PHAROM, TOROM, DEADRO, ROMTOR, ROMSTR, DIST, BASPHA, BASBLD (the
  unconditional `ie=ib` after a logical IF with `;`), BASKIL, PLNATK, PLNRMV,
  JUMP, ENDGAM, POINTS, OUTHIT (arithmetic IF and computed GOTO), DAMAGE and
  KQSRCH.
- Austin differences: ROMDRV `IRAN(5)`/`IRAN(10)`, no UPDSTA in ENDGAM, and the
  KA/JA/IA/VA/HA argument copies.
- Production replaces the binders' rational arithmetic with PDP-10 rounded
  floating point and the shared session seed (`game-session.ts:80-84`).

**Movement, commands and main loop**
- MOVE/IMPULS: the order of damage checks, draw order, energy `40·ia²` (×2 with
  shields, ×3 with a tractor beam), the board index formula, both board-locking
  paths, and the tow-position FIX/INT distinction.
- CHECK/CHKPNT: both axis branches and the INGAL argument order.
- TRACTR/TRCOFF, DOCK (`min0`/`max0`, double hull repair), ENERGY
  (`INT(ihita*0.9)`), SHIELD (clamps, `/25` truncation), REPAIR (modes and the
  alternate return), CAPTUR and BUILD (fifth-build lock and rollback), and PLACE.
- Main dispatch: 33 slots, the QUIT slot, out-of-range input falling through to
  BASES, and the alternate return to 49. Turn accounting at labels 3400-3700:
  DOTIME/NUMPLY, ROMOPT, life support and the score flush.
- The TIME RUNTIM override, SET (including the Austin IA/JA copies), FREE/RSTART,
  the SETUP prefix and admission (Austin `nplnet=20`, no UPDCAP, variant group
  masks), CC1/CC2, PREGAM and XGTCMD.

**Input, parsing and output**
- GTKN/NXTT./SKPB./ANUM.: continuation, the Austin lock differences, the
  14-token limit and its message, folding, CBITS classes, sign and decimal
  rules, the more-than-five-character deposit side effect, and token type
  precedence.
- INLI/NXCH/DISP/ECHG: repeat on the first character, the 80-character limit,
  the edit keys, caret display, and LF suppression.
- EQUAL: the five-character limit and the fold of T0.
- GETCMD: first match wins, ambiguity is reported on a second match, an exact
  match gets no preference, `S` is ambiguous, and FORHLP is suppressed in SHORT
  format.
- The ISAYDO and pregame tables, and the LSTSCN keyword order.
- STATUS (all three formats; checked byte for byte live), USERS column
  arithmetic, PROMPT, TELL filtering (both variants), OUTMSG gag filtering,
  MAKMSG and GETMSG, and HELP form-feed suppression against DECWAR.HLP.
- **All 324 `ASCIZ` strings per variant** in MSG.MAC and SETMSG.MAC match the
  generated tables byte for byte, as do the short and long display tables.

**Host**
- Telnet codec: split IAC, IAC IAC in data and SB, CR NUL, CR+command+LF, option
  negotiation without loops, and outgoing IAC escaping with CR → CR NUL.
- The default bind is 127.0.0.1, and `--bind` accepts only IP literals.
- Word-file names cannot be used for path traversal (SIXBIT-derived and
  regex-checked).
- File writes are atomic (`wx`, mode 0600, fsync, then rename).
- SIGTERM shuts down cleanly while the loop is not blocked.
- No per-session heap leak across 220 sessions.
- Timers are cleared on every wake, and no wakeups are lost.
- A dead job is never granted a lock.
- AsyncLocalStorage scope wraps every resume path.
- Every playable-only policy is gated by `options.playable`.
- The TRACTOR OFF repair is implemented as documented and is gated correctly.

**Documentation**
- `running.md` flags and defaults match `tools/run-telnet.ts`.
- Ship, planet and roster facts are correct.
- The DECWAR.INI contents are correctly described.
- 10 of 11 `#L` source links land correctly.
- The SHIELD scaling example in `architecture.md` is correct.
- Specification rules spot-checked against Austin source and found correct:
  abbreviations, diagnostics, phaser attenuation and the damaged-device factor,
  torpedo deflection and damage, the critical-hit threshold, base emergencies,
  SHIELDS arithmetic, prompt indicators, object names, and MOVE energy.

## 9. Recommended order of work

1. **C1, M5, M6, M7 (host hardening).** These are the only issues that let one
   person affect everyone on a public server. None of them touches game
   semantics.
2. **H1 and H2 (playable crashes).** Add narrow, documented playable repairs,
   following the existing TRACTR pattern, with live regression tests. H2 needs
   the Astra setting.
3. **H3 (Austin ENQ).** Confirm `.ENQAA` in the authorized monitor manual, then
   make Austin LOCK non-queuing. This needs Astra.
4. **H4, M8–M11 (documentation corrections).** Correct the specification rule,
   unify the list of playable repairs, rebuild `status.md` under the standard,
   and fix the persistence wording and the evidence paths.
5. **M3 and M4 (structure).** Retire or quarantine the duplicate component
   models, move the binders into `src/`, replace live assertions, and add a CI
   job with the `src → test` import rule.
6. **M1, M2, L7–L9, I1 (fidelity research).** Settle IMUL overflow, the
   LSTFLG/AC0 output and short-circuit draw counts against the manuals and the
   preserved Austin reference executable. All of these need Astra.
