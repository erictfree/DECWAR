# Semantic examples and conformance

The examples below use the abstract model and ordinary game-unit arithmetic.
They describe commands in an otherwise unchanged world, with no intervening
actions or incoming combat. Passing these examples alone does not establish
complete conformance. The command and world-rule conversion is still incomplete.

Unless a case says otherwise, a turn-completing example begins with world action
count zero and two commissioned players, so that turn does not invoke automatic
defense phases. Other ships and installations do not alter the stated result.

| ID | Initial state and input | Required result |
| --- | --- | --- |
| EX-MODEL-01 | Shields down, energy 800 units, shield damage zero, no tractor beam; SHIELDS UP | Shields up; energy 700 units; shield strength and stardate unchanged. |
| EX-MODEL-02 | Shields up, energy 800 units, shield damage zero, no tractor beam; SHIELDS UP | The same 100-unit charge applies; energy is 700 units. |
| EX-MODEL-03 | Shield damage 300.1 units; SHIELDS UP | Reject the action without changing shields, energy or tractor-beam state. |
| EX-MODEL-04 | Shield damage exactly 300 units, energy 800 units, no tractor beam; SHIELDS UP | Raising is permitted; energy becomes 700 units. |
| EX-MODEL-05 | Shields up; SHIELDS DOWN | Shields down; energy, shield strength and stardate unchanged. |
| EX-MODEL-06 | Engine energy 1000 units, shields down at 50%; SHIELDS TRANSFER 1 | Engine energy 999 units, shield strength 50.04%; shields remain down; condition yellow. |
| EX-MODEL-07 | Engine energy 1000 units, shields at 99%; SHIELDS TRANSFER 100 | Transfer is limited to 25 units; engine energy 975 units and shield strength 100%. |
| EX-MODEL-08 | Radio on; RADIO OFF | Radio disabled; no energy charge or stardate advance. |
| EX-MODEL-09 | Yorktown's captain has an empty gag set; RADIO GAG WOLF | Wolf is added to that captain's gagged senders. The radio's enabled state is unchanged. |
| EX-MODEL-10 | Tokenize `1 2.5` | The first token denotes integer 1; the second denotes decimal 2.5. They are independent values. |
| EX-MODEL-11 | Sender energy 1000 units, adjacent commissioned teammate at 4900 units; ENERGY to that ship with amount 100 | Sender energy 900 units; recipient energy 4990 units; no turn. |
| EX-MODEL-12 | Sender energy 1000 units, adjacent commissioned teammate at 4999 units; ENERGY to that ship with amount 100 | Recipient receives 1 unit. Sender is charged 10/9 units, retaining 8990/9 units. Neither quantity is rounded internally. |
| EX-MODEL-13 | Sender energy 100 units, adjacent commissioned teammate at 4999 units; request transfer of 100 | Rejected before applying recipient capacity; energies unchanged. |
| EX-MODEL-14 | Sender energy 1000 units, adjacent commissioned teammate at 5000 units; request transfer of 100 | Successful zero-amount transfer; both energies unchanged. |
| EX-MODEL-15 | Undocked ship with 1 torpedo, 1000 energy units, shields down at 20%, hull damage 200 units; exactly one friendly planet adjacent; DOCK | Before turn accounting: 6 torpedoes, 1500 energy units, shields still down at 30%, hull damage 150 units; docked, green, life reserve 5. A turn with automatic repair follows. |
| EX-MODEL-16 | Same resources as the preceding case, but already docked; DOCK | Before turn accounting: hull damage 100 units; other replenishment is the same. |
| EX-MODEL-17 | Ship with no adjacent friendly base or planet; DOCK | Rejected with no replenishment or turn completion. |
| EX-MODEL-18 | Undocked ship with one device at 120 damage units and all others at zero; REPAIR; completion before deadline and no intervening damage | Explicit repair removes 50 units; automatic repair removes another 30; final device damage 40. One turn completes. |
| EX-MODEL-19 | One device at 10 damage units, others zero; REPAIR -5 | That device becomes 15 and each other device becomes 5; no turn completion. |
| EX-MODEL-20 | All devices undamaged; REPAIR -5 | All remain undamaged; no turn completion. |
| EX-MODEL-21 | A 1-unit explicit repair finishes, including its report, at its deadline | Device repairs remain applied, but no automatic repair or turn completion occurs. |
| EX-MODEL-22 | Ship at (37,37), undiscovered planet at (45,45); SCAN 0 | The displayed rectangle contains only (37,37). The planet nonetheless becomes known to the acting team. No energy or turn cost. |
| EX-MODEL-23 | Ship at (37,37), terminal width 80; SCAN CORNER -3 4 | Display vertical coordinates 34 through 37 and horizontal coordinates 37 through 41, inclusive. |
| EX-MODEL-24 | Ship at (37,37), terminal width 40; SCAN 10 | Explicit range produces vertical and horizontal bounds 27 through 47, despite the narrower default. |
| EX-MODEL-25 | Radio off, radio damage exactly 300 units; STATUS RADIO | Report the radio as damaged rather than off. No state changes. |
| EX-MODEL-26 | Relative output-coordinate preference; STATUS LOCATION | Report absolute coordinates; retain the preference. |
| EX-MODEL-27 | Torpedo tubes have 10 damage units, tractor beam has zero, other devices undamaged; DAMAGES T | Report torpedo tubes at 10, then tractor beam at zero. No state changes. |
| EX-MODEL-28 | All devices undamaged; DAMAGES XYZ | Report all devices functional. Do not diagnose the selector. |
| EX-MODEL-29 | Adjacent commissioned teammates, both shields down, neither in a beam; TRACTOR names the other ship | One symmetric association is created and both are notified. Positions, energy and stardates are unchanged. |
| EX-MODEL-30 | A ship in a beam; TRACTOR OFF | Both endpoints lose the association. Neither moves or pays energy. |
| EX-MODEL-31 | Undamaged ship at (37,37), energy 1000, shields down, no beam; empty path; MOVE ABSOLUTE 40 37 | Arrive at (40,37), energy 964, green and undocked; complete one turn. |
| EX-MODEL-32 | Same movement and energy, shields up, no beam | Movement cost is 72 units; energy becomes 928. |
| EX-MODEL-33 | Same movement with shields down; a star at (38,37) blocks the first step | Stay at (37,37), pay 36 energy units and report obstruction; complete one turn. |
| EX-MODEL-34 | Docked red ship, warp damage 0.1 unit; request MOVE by four sectors | Reject the range after setting green and undocked. No movement energy or turn is charged. |
| EX-MODEL-35 | Adjacent friendly planet with zero builds; BUILD | One build and 50 construction points after normal turn accounting; one turn. |
| EX-MODEL-36 | Adjacent friendly planet with four builds; faction has ten active bases; BUILD | Reject before incrementing builds or adding pending score. |
| EX-MODEL-37 | Four-build friendly planet, nine friendly bases, update available; BUILD | Planet becomes a full-strength base. That stage contributes 500 construction points, including the completion bonus; one turn. |
| EX-MODEL-38 | Four-build friendly planet, capacity initially available, planet update unavailable; BUILD | Planet reaches five builds and pending construction score increases by 250; reject without a turn or score commitment. |
| EX-MODEL-39 | Shields-down ship with energy 1000 and hull damage zero; capture adjacent unfortified neutral planet; defensive draws b=0, c=0 | Planet joins the ship's faction. Defense deals 360 damage, leaving energy 640 and hull damage 360. Capture contributes 100 points; one turn. |
| EX-MODEL-40 | Same capture with ship energy 100 | Capture succeeds but defense destroys the ship. Ownership is not rolled back. |
| EX-MODEL-41 | Trace from (10,10), displacement (5,2), one step, deflection 0.005; blocker at (11,11) | Probe (11,10), then (11,11). Return the second as obstruction and (10,10) as last clear. |
| EX-MODEL-42 | Undamaged shielded shooter, energy 1000; enemy ship two sectors away with shields down, energy 2000, hull zero; PHASERS strength 100; no overheating, b=0, c=0 | Shot deals 648 damage; target energy 1352 and hull damage 648. Shooter pays 300 energy units and completes one turn without automatic repair. |
| EX-MODEL-43 | Undamaged shooter attacks full-strength enemy base at distance one using PHASERS strength 200; no overheating, b=0, c=0 | Ordinary hit damage is zero; base strength becomes 78.37%. No damage-score credit for that hit. |

EX-MODEL-06 deliberately uses fractional shield strength. Historical loss of
that fraction is excluded by the numerical normalization policy. The grammar,
transfer rate and energy charge are unchanged.

Exact terminal presentation, broader command cases, concurrency and complete
world evolution remain part of the unfinished conformance work.

**Basis:** [abstract model](language-model.md), [commands](commands.md),
[shared world rules](world-rules.md), [turns](turns.md),
[lexical rules](lexical.md), [normalization policy](NORMALIZATION.md).
