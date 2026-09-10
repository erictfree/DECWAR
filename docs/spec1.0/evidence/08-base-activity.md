# Player-triggered base activity

DECWAR.FOR:227–238 orders BASPHA, PLNATK, BASBLD, ROMDRV before stardate
advancement. BASPHA:373–435 selects opposing bases for PLAYER, scans enemy
roster ships at distance4 and attacks with integer200/NUMPLY. NUMPLY persists
until FREE, so its denominator includes destroyed but unreleased commissions.
It awards defending faction TMSCOR directly. Player-hit notifications union
distance10 triggering TEAM, distance4 both factions and the victim bit.
Romulan-hit notifications use distance10 both factions.

BASBLD:315–331 restores opposing bases by integer25/NUMSID in stored tenths
of a percentage point, capped at1000. The abstract increment is
trunc(25/factionPlayers)/10. Other trigger paths remain separate.

Historical base iteration uses slot1..10. This is not silently converted into
insertion or position order: Section8.1 flags the remaining base-order choice.
No autonomous runtime or complete scheduler verification is claimed.
