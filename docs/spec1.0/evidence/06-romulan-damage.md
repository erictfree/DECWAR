# Incoming Romulan weapon damage

Austin DECWAR.FOR:3382–3396 computes integer ihita and deducts integer
ihita/10 from integer erom. Both ihita (reported/scored) and erom are printed
as tenths: OFLT divides by 10 at WARMAC.MAC:1955. Thus displayed damage D
corresponds to energy loss trunc(D)/10, not D. The specification preserves
both explicit truncations without exposing storage representations.

PHAROM uses ((100+IRAN(100))*phit)/(10*id); TOROM uses
min(IRAN(4000),2000). All 4000 torpedo rolls are enumerated in a companion
test; 2001 produce the cap. PHAROM does not enter the player-device penalty
or shield/critical logic of PHADAM.

DECWAR.FOR:2711–2714 and4374–4377 award ihita and add 5000 stored score
units on death, including the torpedo's 3/10 surviving-displacement branch.
Converted kill award: 500 displayed points. DEADRO clears presence and
occupancy; disabling the game option is not part of killing the vessel.
Output construction and future autonomous reappearance remain separate work.
