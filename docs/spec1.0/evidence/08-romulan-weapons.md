# Romulan weapons

Nested defense audience: BASPHA at DECWAR.FOR:380–382 chooses both base
factions when PLAYER is false, but its player-hit PRIDIS at404–407 still uses
TEAM for the extended audience. ROMDRV sets PLAYER false without replacing
TEAM; the same call then adds both-faction distance4 and the target. Section8.7
and C-025 isolate the observable initiating-faction dependence for player-
originated cycles; no-player calls remain outside this conclusion. Base hits
on the Romulan use both factions at distance10 (423); PLNATK uses PTEAM for
its extended audience (2833–2836,2852–2853). This is source-derived recipient
analysis, not an original-executable transcript or an adopted repaired policy.

ROMDRV:3269–3278 uses min>now to wait, max<now to choose randomly, then
phaserReady<now for phasers, else torpedoes. Equality is not normalized in
Section8.7. ROMDRV:3291–3319 defines fixed-power200 phasers, output, and nested
BASPHA/PLNATK/BASBLD calls; BASBLD:321 uses50/(NUMPLY+1) for nonplayer activity.

ROMSTR:3406–3416 uses increasing V/H to find the first adjacent star.
ROMTOR:3425–3516 attempts3 torpedoes, misfire>96 with extra deflection,
shared extent, and retargets only after impact. Planet roll>=75 is26%, not
25%. The assignment IWHAT=2 after TORDAM overrides deflection wording, while
damage remains zero. No miss/black-hole/unaffected-star output is generated.
Ordinary ship/base damage scoring uses RSR via TORDAM/PHADAM.
Storage, terminal-derived delays and no-target failure behavior are not adopted.

The companion `test/romulan-weapons.test.ts` checks readiness equality,
including selection of a not-yet-ready torpedo when phasers are exactly ready.
This documents the comparison anomaly; it does not approve that behavior as
the final timing contract. It also enumerates all 100 planet rolls to verify
26 reductions, and checks construction zero versus destruction below zero.
