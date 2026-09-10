# Port-loss docking checks

BASKIL, DECWAR.FOR:340–370, scans docked faction ships, accepts adjacent
positive-strength bases, then skips undocking entirely when NUMCAP<=0.
Otherwise it checks friendly planet occupancy and undocks/sets RED on failure.
There is no output call. The loop is not limited to ships near the triggering
port and does not test ALIVE separately.

CAPTUR:627 calls BASKIL before decrementing ownership counts and before
SETDSP changes allegiance at636. PLNRMV:2874–2875 decrements NUMCAP first;
callers clear planet occupancy before PLNRMV. TORDAM:4218 calls BASKIL with
nonpositive base strength; NOVA:2343 also calls after strength has reached zero.
Surviving displaced bases return without BASKIL. These distinctions are now
explicit in Section 6.8 and C-021 rather than replaced with inferred support
invariants. A new invariant requiring adjacent support would contradict the
evidenced states until a character decision resolves the rule.
