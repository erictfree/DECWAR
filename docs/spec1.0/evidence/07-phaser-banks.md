# Phaser bank selection

DECWAR.FOR2662 chooses bank1 unless bank2 has an earlier readiness value.
Target checks follow, then PAUSE at2680, then explicit power validation at2683.
Invalid power takes the alternate return without the bank update at2752–2753.
That update changes only the selected bank and incorporates current phaser
device damage, including any increment from this shot's overheating.

Section7.19 defines this ordering without adopting bank indices, terminal-speed
parameters or initialization into the abstract model. Equal deadlines select
the first historical slot, but neither slot has distinct damage or power, so
the two choices have the same readiness multiset after the shot. The symbolic
example is source-derived, not a native transcript or a decision about actual
duration, clock progression or interleaving during the wait.
