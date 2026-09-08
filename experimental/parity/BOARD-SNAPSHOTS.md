# Complete initial board comparison

Use isolated games. This procedure reads the initial packed board without
moving ships, firing weapons or exploring sectors. It compares all board cells
and object indices; it does not compare every game-state field.

## TypeScript capture

```sh
node experimental/parity/capture-board-typescript.ts 1729 logs/board-ts-1729.json
```

This starts a temporary Austin playable host, selects a fresh tournament with
Romulans and black holes off, captures public reports, reads BOARD through the
existing runtime memory, logs out and stops the host. Output must be new.

## Native capture

Boot an isolated copy of the pinned native reference environment. Keep its
SIMH console log. Connect with an unused gate prefix:

```sh
node experimental/parity/capture-seed.ts pdp10 2031 1729 logs/board-native-1729.jsonl logs/board-native-1729
```

The optional final argument creates `.ready` after the initial reports and
waits up to five minutes for `.release`. It keeps the ship present for the
snapshot. Once ready:

1. Stop the emulator with Ctrl-E. Set a breakpoint at GTKN, octal `460405` in
   the pinned DECWAR.MAP, and continue.
2. Create the gate's `.release` file. Wait for the debugger to report the GTKN
   breakpoint before issuing further console commands. The client proceeds
   toward QUIT, stopping in the input routine before confirmation changes the
   board. Do not send debugger commands while the machine is still running.
3. Examine `UB`, then physical memory at `UB + 0540` (octal). This is the
   section pointer. For the supported direct resident mapping, its low 13 bits
   give the page-table page; multiply by octal `1000`.
4. Read that table's entries `0400` through `0404`. Their low 13 bits give the
   physical pages containing BOARD. Examine the words corresponding to virtual
   addresses `400661` through `404403`, preserving virtual order. Physical
   pages can differ between runs: never copy addresses from another snapshot.
5. Close or switch the SIMH console log to flush it. Remove the breakpoint and
   continue so the Telnet client completes logout. Preserve the debugger log
   and the capture; stop the isolated emulator after cleanup.

The address comes from Austin HISEG at octal `400010` plus BOARD's 425-word
offset. BOARD contains 1,875 words. WARMAC.MAC:813–815,4408–4422 packs three
12-bit cells per word, with horizontal cells inside vertical rows. The pinned
map and generated Austin layout supply addresses; no game source is modified.

The page walk follows the bundled simulator's `PDP10/kx10_cpu.c:2419–2542`.
The reviewer accepts only direct, resident section/page pointers. Unsupported
or missing mappings fail; it never searches for pages that match TypeScript.
This is debugger extraction evidence, not a general implementation of paging.

## Compare and validate

```sh
node experimental/parity/review-board.ts logs/board-ts-1729.json logs/board-native-1729.jsonl logs/board-native-1729-debugger.txt > logs/board-report-1729.json
```

The reviewer rebuilds the native board from logged physical words, validates
seed selection and cleanup, reproduces both public scans, and reports every
differing cell. Matching results exit zero; differences exit one; invalid
evidence throws. September 8 results matched all 5,625 cells for seeds 1729,
42 and 8675309. Other options, seeds and later random consumption remain
unverified. These runs used native SIMH, not Docker.
