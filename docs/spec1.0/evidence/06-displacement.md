# Displacement

Austin DECWAR.FOR:1283–1341 (JUMP) selects one candidate by integer assignment
of old coordinate plus real step, checks galaxy bounds and distance exactly
one, then distinguishes empty, black-hole and other occupied sectors.
Successful ship displacement sets RED and undocks. Black-hole displacement
clears old occupancy, sets ship hull damage to KENDAM, base strength to zero,
or ROM false. It does not overwrite the black hole. The stored dead ship
position is not changed; release semantics must decide its abstract relevance.

CHECK at 699–755 supplies the path step: the first coordinate is the game's
vertical coordinate despite CHECK's local H/V variable names. Equality selects
that first axis. The other component is direction ratio plus deflection.
SNOVA:3812–3836 supplies integer neighbor offsets instead.

TORDAM:4156–4166 attempts surviving ship displacement, including deflections
which rejoin at label 700; bases return through label 1300 and are not displaced
by torpedo hits. TORP:4374–4375 attempts surviving Romulan displacement on
IRAN(10)>7. NOVA can displace bases separately.

The specification does not import JUMP's incidental write to a player slot
after successful Romulan displacement. That write requires lifecycle evidence
before it can be considered a game effect. C-018 records directional truncation
as a separate character decision. Companion tests cover candidate selection
and occupancy outcomes, not complete attacks, nova propagation or output.
