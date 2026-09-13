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

The source permits a later ENDGAM call to observe a changed base count and emit
a different result, and its final-planet BUILD path can exit before installing
the new base. Austin Core adopts a first-result latch after the completed state
mutation: fifth-stage BUILD installs its base before checking, while combat or
autonomous final-planet destruction can produce mutual destruction when both
base counts are zero. An already accepted command completes before its player
is notified and released. Later checks do not replace the latched result. The
specification also adopts one dedicated mutual-destruction announcement and
omits contradictory faction-victory lines. Administrative ENDFLG bypasses the
normal predicate and needs a separate scope/ending rule.

The specification tests enumerate legal base-count pairs and verify the latch
and announcement text. Connected Austin playable tests in
`test/austin-game.test.ts` exercise final BUILD, final-planet torpedo bursts,
nova continuation, phaser base destruction, idle recipients, and overlapping
accepted commands. The runtime stores the outcome synchronously at a count
decrease; BUILD has already reserved its replacement in the base count at that
point. Finalization waits until the accepted command exits, before readiness.
Diagnostic execution retains historical ENDGAM behavior. These tests are
TypeScript execution evidence, not original-executable parity. Administrative
ending and interrupted input remain outside the adopted normal-ending rule.
