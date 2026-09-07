# Evidence for abstract data types

This file is non-normative. It records primary evidence used to select the
initial vocabulary without carrying source representation into the model.

| Subject | Austin evidence | Semantic use |
| --- | --- | --- |
| Galaxy and roster sizes | `legacy/utexas/PARAM.FOR:5-14` | 18 ships, 10 bases per faction, 75×75 sectors, 20 initial planets, 9 devices |
| Ship properties | `legacy/utexas/PARAM.FOR:44-78` | Position, turns, condition, torpedoes, shields, life support, energy, hull damage, and per-device damage are distinct values |
| Device names | `legacy/utexas/DECWAR.FOR:435-436` | The nine-device vocabulary |
| Ship names and order | `legacy/utexas/DECWAR.FOR:489-507` | Fixed Federation-first, Empire-second roster |
| Shared world entities | `legacy/utexas/HISEG.FOR:17-40` | Ships, bases, planets, Romulan, faction scores, and world options |
| Ship lifecycle and relationships | `legacy/utexas/HISEG.FOR:49-55` | Tractor relation, participation state, destruction/release state, and docking are distinct facts |
| Galaxy creation | `legacy/utexas/SETUP.FOR:208-232` | Bases, planets, stars, and optional black holes populate one galaxy |
| Black-hole option | `legacy/utexas/SETUP.FOR:234-258, 1200-1300`; `legacy/utexas/DECWAR.FOR:3726-3732, 4539-4593` | The game distinguishes black holes being disabled from an enabled game whose current holes have been removed |
| Romulan option | `legacy/utexas/SETUP.FOR:133-210, 1200-1300`; `legacy/utexas/DECWAR.FOR:4539-4593` | The game distinguishes disabled Romulan activity from an enabled game in which no Romulan is currently present |
| Base construction | `legacy/utexas/DECWAR.FOR:517-580` | Five builds can replace a controlled planet with a faction base, subject to the ten-base limit |
| Base designation | `legacy/utexas/DECWAR.FOR:2003-2020`; `legacy/utexas/WARMAC.MAC:1968-2025` | The source uses a numbered storage slot, but commands locate bases by sector and output omits the slot number; it is not an abstract identity |
| Base strength | `legacy/utexas/DECWAR.FOR:314-330, 4086-4223`; `legacy/utexas/WARMAC.MAC:1939-1967` | A new base has 100% defensive strength; attacks reduce it, autonomous rebuilding restores it, and output presents it as a percentage |
| Tractor semantics | `legacy/utexas/DECWAR.FOR:2170-2250, 4429-4510` | A beam is stored for both endpoints; whichever linked ship moves leads that movement and draws the other ship behind it |
| Life-support reserve | `legacy/utexas/SETUP.FOR:392-397`; `legacy/utexas/DECWAR.FOR:223-247, 923-934` | Reserve starts and resets to 5; after repair, qualifying undocked turns decrement it; only a value below zero causes fatal damage |
| Radio state and delivery | `legacy/utexas/LOWSEG.FOR:42-54`; `legacy/utexas/DECWAR.FOR:2597-2622, 3126-3179, 3977-4062` | Reception, gagged senders, original audience, pending delivery, and message order are observable communication state |
| Pending score accumulator | `legacy/utexas/LOWSEG.FOR:41`; `legacy/utexas/DECWAR.FOR:248-253` and all `TPOINT` references | Score deltas are written during an action and only read, committed, and cleared at turn completion; no independent observer was found |

The evidence contains scaled storage values and implementation bookkeeping.
Neither appears in the normative ADTs. Numeric rules will use quantities shown
to players and will receive their own evidence when specified.
