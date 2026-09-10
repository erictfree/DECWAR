# War-ending evidence

Austin DECWAR.FOR ENDGAM:961–1005 and MSG.MAC:54–66. Normal ending requires
no planets and at least one faction's base count zero. Both zero means all
lose; player ship count, Romulan and star count are not inspected. ENDGAM
prints the announcements, calls final POINTS then FREE for a participating
player, and exits. Host exit mechanics are not an abstract game operation.

GETCMD:1210,1229 checks during acquisition/wait; PLNRMV:2889 checks during
planet removal. BUILD increments its base count before PLNRMV but installs
position/strength and prints conversion afterward. Pending construction points
are already awarded; POINTS does not implicitly commit them. C-022 records
the consistent-state/ordering collision rather than preserving storage counters.

Mutual output: ENDGAM does not skip the zero-base faction announcements after
the both-lose text. Both endgm3/endgm4 and the receiving team's two personal
lines are emitted. This remains a character decision. Administrative ENDFLG
bypasses the normal predicate and needs a separate scope/ending rule.

Tests enumerate legal base-count pairs for no planets versus one planet and
check single-victor announcement text. They do not verify ending integration,
delivery to all players, final POINTS, administrative ending or mutual wording.
