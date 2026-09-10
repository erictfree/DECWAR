# Romulan activity gates

Dialogue: DECWAR.FOR:3259 and3306 give independent1/5 appearance and1/10
post-weapon triggers. WARMAC.MAC:4674–4765 draws group3, prefix4, adjective5,
noun5 in order and always uses the group/plural branch; single-player prefixes
are unreachable with the active group draw. Section8.8 transcribes the complete
active vocabulary, not the commented alternatives. TELL:3983–3986 jumps into
the common recipient pass at4032, whose gag update at4051 lacks a PLAYER guard.
OUTMSG:2610–2611 applies MOD(sender,100) to the Romulan sender code without a
separate nonplayer branch. C-024 records these concerns without evaluating an
out-of-roster access or adopting a repair. No original-executable speech
transcript is claimed.

Appearance placement closure: ROMDRV at DECWAR.FOR:3249 calls PLACE with a
Romulan object. PLACE:2765–2795 samples vertical then horizontal and retries
both on any occupied sector. Its territory checks apply only to player ship
codes; the Romulan skips them. Section8.4 now specifies the sampling order,
uniform conditional distribution, lack of a proximity restriction, and energy
draw after placement. The all-occupied case is explicitly unfinished rather
than assigned an arbitrary retry cap. This is source-derived abstract behavior,
not a claim about exact historical random-number generator output.

ROMDRV, DECWAR.FOR:3241–3252, increments ROMCNT, gates on2*ROMCNT>=NUMPLY,
increments TMTURN(3), then tests present/appearance paths. Appearance requires
ROMCNT>=3*NUMPLY and IRAN(5)!=5; failure does not reset ROMCNT. Energy
IRAN(200)+200 is displayed through OFLT as20.1..40. Successful appearance
resets ROMCNT and increments NUMROM, then continues to target search.
Attack readiness resets at3274; movement leaving a target beyond range resets
at3378. Section8.4 translates these into elapsedTriggers and cumulative stats,
not process polling or storage fields. No-player behavior remains out of scope
for these player-triggered gates until the full scheduler is specified.

DIST:836–885 ranks squared Euclidean distance within four groups, retaining
the first equal-distance member within a group, then performs sequential
coin-flip group replacement. Returned NUM uses PDIST (Chebyshev). Tests
enumerate the eight tie-choice combinations, yielding1:1:2:4, not uniform
four-way selection. The sentinel5626, empty candidate results and asymmetric
Empire stale-position eligibility remain explicitly unresolved in Section8.5.

ROMDRV:3323–3379 shortens each nonzero aim component by one, but uses original
Chebyshev distance capped at4 for CHECK. Obstruction fallback alternates
decreasing vertical/horizontal positions, tested for occupancy only; failure
does not install CHECK's last accepted position. DIST runs again afterward.
Only PASFLG produces the explicit movement report. Section8.6 and two focused
tests cover these movement inputs and search order, not full weapon scheduling.
