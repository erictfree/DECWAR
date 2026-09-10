# Initial shield-combat equations

Austin DECWAR.FOR:4089–4124 and4168–4210. Converted incident damage from stored
tenths and strength from stored tenths of a percentage point. PHADAM's
coefficient80/40 becomes8/4 for displayed damage. Shield decrease becomes
0.03*incident*max(strength/100,0.1)+0.03 percentage points. Torpedo incident
damage is400+400w. Deflection damage is5v percentage points. Both absorption
and initial damage use pre-hit strength. Base intermediate can become negative.

Tests cover ordinary mathematical quantities, not historical floating-point
rounding. State-write precision and subsequent lifecycle/output phases
remain incomplete; helper outputs are not a complete hit outcome.

## Critical hits and damage

Austin DECWAR.FOR:4124–4166 defines the critical threshold, device selection,
damage, score awards, destruction predicate and torpedo displacement dispatch.
The stored threshold 1700 becomes 170 displayed damage units. Critical device
damage is half the initial damage; the hull/energy amount adds a separate
random term in [-50,50). PARAM.FOR:71–79 identifies the nine devices.

DECWAR.FOR:4212–4229 defines base emergency loss and destruction. The direct
critical branch to label 1400 bypasses label 600's ordinary reduction and
label 700's ordinary damage scoring. The zero-strength branch at label 1300
does not bypass scoring. This distinction is stated and tested explicitly.
Base reduction `hita * 0.01` converts to 0.01 percentage points per displayed
damage unit. Emergency loss converts to 5 + floor(100u)/10 percentage points;
the destruction award converts from 10000 to 1000 points. This section does
not resolve BASKIL's docking effects or specify a full random draw schedule.
