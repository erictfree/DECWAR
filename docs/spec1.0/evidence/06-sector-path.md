# Sector traversal

Austin DECWAR.FOR:699–759 (CHECK) advances the dominant coordinate, accumulates
the minor coordinate, checks candidates in order, and only then chooses a
random accepted position when both are empty. Rejected boundary steps return
the last accepted position with no obstruction. The caller's first coordinate
is vertical despite CHECK's local variable H. Ties select this first axis.

CHKPNT:768–778 uses abs(mod(int(c*100),100)-50)<10, not the inclusive 0.40–0.60
band suggested by its comments. For positive coordinates, the ordinary-math
band is [0.41,0.60). The lower candidate is always checked before the upper.
The selection int(c+ran(0)) occurs only after both are empty; it does not reset
the continuous accumulator. Section 6.4 retains C-006 as an open character
decision rather than silently adopting a simpler digital line algorithm.

Focused tests cover band endpoints, obstruction order, sample consumption,
continuous accumulation, last-accepted location and horizontal negative travel.
They test the specified mathematical algorithm, not original-executable
floating-point equivalence or complete MOVE/TORPEDOES transcripts.
