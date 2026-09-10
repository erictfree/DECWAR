# Nova target effects

Notification reset closure: WARMAC.MAC:2854–2860 explicitly clears IHITA and
other event fields after MAKHIT, including the no-recipient branch from2772.
Ordinary SNOVA starts after a star announcement and each preceding target
returns through notification creation. The Romulan branch does not assign
IHITA, giving zero on that sequential path rather than an unknown random value.
For bases, NOVA:2322–2345 calculates/awards damage, creates distress at full
strength, then reports without restoring IHITA. Full bases therefore report0;
already-damaged bases retain calculated damage. Section6.6 corrects its former
full-base report example and C-027 records the purity/character choice. No
historical memory layout or original-executable observation is needed for this
explicit reset derivation; interrupted/error paths are not covered.

Romulan branch follow-up: NOVA at DECWAR.FOR:2358–2375 attempts JUMP while
ROM is true, halves EROM only if still present, then scores the retained EROM
and an additional500 on absence. It sets SHSTTO/VTO/HTO but not IHITA; JUMP's
black-hole branch clears ROM without updating LOCR. The later LOCR assignment
therefore overwrites the report destination. Section6.6 now describes these
effects and the exact-energy20 cases, with C-026 retaining zero-energy and
report-field conflicts. The resulting unspecified IHITA value is not inferred
from memory layout or treated as zero. This is source analysis, not native
execution evidence or approval of a repair.

Austin DECWAR.FOR:2260–2388 defines NOVA. The blast factor converts stored
d=1000-strength to displayed b=100-strength, with d<200 replaced by250.
Device increments int(4*d*u) become floor(40*b*u)/10. Reported hull damage
d*8+IRAN(1000) becomes 8*b+roll/10. Energy loss is a separate randomized
fraction; shield damage is processed before conditional shield strength loss.
State-assignment precision beyond explicit integer draws remains open.

Ship kill awards at2313–2318 update tmscor directly, not tpoint. The draft
therefore distinguishes faction kills from individual pending damage awards.
Base reported damage is independent of the actual strength decrease at2330.
Both strength decrements become 30-roll/10, roll1..100. Planet construction
loses3, destruction below0 costs100 displayed points for all allegiances.

SNOVA:3812–3857 was inspected but its propagation is not yet specified.
In particular it records nearby object positions, processes them in reverse
enumeration order, removes selected stars before their explosions, and limits
pending stars to29. That limit needs character review, not a copied storage
capacity in the abstract model. Romulan nova handling at2358–2375 is also
pending: halving can leave a present zero-energy vessel, unlike the current
ADT invariant. This must be resolved explicitly rather than normalized here.

Section 6.7 now defines unsaturated propagation: SNOVA's increasing V/H scan,
reverse target-position processing, immediate removal of selected stars,
last-selected-first explosion order and per-explosion 50-point penalty.
The initial penalty is in TORP:4323, subsequent penalties in SNOVA:3853–3854.
C-019 and an asynchronous user question expose the pending-count boundary.
Tests cover enumeration and pending order only, not a full mutable galaxy
chain simulation. The companion refuses boundary cases rather than assuming
approval for either capacity policy.
