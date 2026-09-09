# Tracing the first torpedo difference

Use fresh isolated worlds and preserve raw Telnet captures. The September 8
trace uses the pinned Austin f78f2ec native executable under SIMH. These
addresses and register-bank rules are not portable to another reference build.

Start `trace-random-host.ts PORT NEW_TRACE` for TypeScript and run the duel
capture against it. The host delegates every random operation to the existing
implementation and logs its argument, seed before/after, result and caller.
It uses an in-memory world and has no persistence or production launch role.

On native, stop the simulator with Ctrl-E and wait for `sim>`. The pinned map
places RAN at octal 462116. WARMAC's internal RAN. loads SEED at 462121;
breakpoint 462122 observes AC1 before the low-bit check and multiplication.
An automatically continuing trace can use:

```text
break 462122; examine FMSEL; examine FM[16-17]; examine FM[30-31]; examine UB; continue
continue
```

SIMH array indices here are decimal. With FMSEL octal 020, FM[17] is user AC1
and FM[30] is ARG, the FORTRAN call-block address. The simulator's ordinary
`examine 1` reads bank zero and is not the user seed. Ignore bank-zero hits at
the same PC in monitor code. Group user records by UB; do not assume the same
UB across runs. The native compiler places the observed call blocks inside
their caller routines, allowing attribution through DECWAR.MAP.

Let the capture finish its logouts. Stop the simulator, remove the breakpoint
or quit, and close/rotate its console log before copying it. Review with:

```sh
node experimental/parity/review-random-window.ts TS_RANDOM TS_CAPTURE NATIVE_DEBUGGER
```

The reviewer is deliberately specific to the observed two-shot encounter. It
finds matching phaser inputs, counts intervening PLNATK calls, verifies seed
transitions and uses existing PDP-10 word arithmetic to reconstruct damage at
the measured 80.1% shield strength. It rejects an unsupported trace rather than
searching for arbitrary values that fit the outcome.

The original trace found twenty extra native planet draws. Shared DOTIME
(HISEG.FOR:77; DECWAR.FOR:223–239) triggers defenses every NUMPLY completed
actions. PLNATK:2807–2811 draws once per neutral planet before checking range.
Different travel/docking counts left the two setups on opposite phases.
Current duel captures align that phase with a full-supply DOCK when necessary;
the historical trace remains useful evidence of why visible ship state alone
was insufficient. This establishes a cause for the selected discrepancy, not
general equivalence of autonomous scheduling or compiler arithmetic.
