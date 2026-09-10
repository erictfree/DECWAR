# Weapon evidence

## Completion examples — 2026-09-08

Section 7.19 now includes the written noncritical ship-shot fixture already
checked in conformance-sequences.test.ts: rolls 94, 0, 0 give 1440 damage,
4800 firing energy, 3560 target energy, committed damage score, no automatic
repair and independent short hit deliveries. Existing log:
logs/spec1.0-nova/phaser-shot-sequence-check.log. The fixture composes these
operations; it is not a general weapon parser or scheduler. Its prose records
the unchanged healthy life-support reserve and leaves bank duration open.

Section 7.20 extends the checked neutralized/misfire path to Section 9.1's
completion phases with two players and a below-threshold world counter.
Friendly interception creates an attacker-only notice: DECWAR.FOR:4334–4341
sets that audience before MAKHIT. The second shot launches despite misfire;
the third does not. No automatic repair or target turn is added. This added
completion table is a source-derived prose scenario, not a newly executed
whole-burst test or a resolution of notification ordering.

PHASERS: Austin DECWAR.FOR:2647–2763. Device check precedes LOCATE;
object/self/friendly/range checks precede bank wait, then power validation.
Shields cost 200 displayed energy before overheating and hit; power cost follows
hit. No reserve guard. Planet test divides integers before comparison.
MSG.MAC:195–208 provides diagnostics.

Shared damage reviewed at DECWAR.FOR:4089–4225: PHADAM and TORDAM share critical
damage, scoring, and destruction, but differ in initial damage and deflection.
Phaser damage observes damage incurred by its own overheating stage.
TORP reviewed at 4228–4435: target reuse, docked ammunition, misfire continuation
then burst truncation, paths, friendly neutralization, planets, and novas need
the next entry. No original-executable verification claimed.
TORPEDOES now has a working entry: docked launches retain ammunition but
validation still checks supply; misfire launches the current torpedo and stops
subsequent ones. Planet stage-loss and star nova probabilities are explicit.
Self-target rejection's normal return differs from range rejection's alternate
return; turn consumption remains a decision rather than silently normalized.

Flight calculation closure: TORP4293–4310 gives base/damage/shield deflection
and extent8+INT(4u-1.5). Shield coefficient is converted from stored tenths to
percentage/1000. Misfire4410–4416 adds deflection and50+IRAN(3000)/10 displayed
damage. Section7.20 defines the equations and distribution with abstract unit
samples; companion tests cover boundary truncation and conditional terms.
This does not establish path traversal or historical PRNG equivalence.
# Phaser overheating quantity follow-up

DECWAR.FOR:2688–2693 adds 750 + (IRAN(100)*phit*7.5)/100 in stored
damage units. The displayed unquantized increment is75+0.0075*roll*power.
The threshold draw is separate and strictly greater than18900. Enumerating
all100 draws gives0%,6%,63% at powers189,200,500. Added focused tests for
these counts and exact representable increments; state-write precision is
still explicitly unresolved. PHADAM's impairment applies to ship/base hits,
not PHAROM or planet construction damage.

## Ordered phaser-shot scenarios

PHACON, DECWAR.FOR:2647–2763, orders shield charge, overheating, target hit
and notice creation, then firing charge/RED/bank update. Its planet branch
uses a fresh draw regardless of overheating and records the resulting stage
even when unchanged. The short-circuit validation cases in Section 7.19
follow the branches before label 800. The unused phacn3 message in MSG.MAC
is not an output of this sequence: PHACON never calls it.

The planet table fixes power 200 and distance 1: rolls 18/19 give integer
quotients 144/152; overheat roll 95 succeeds and damage roll 100 gives exactly
225 displayed damage. Starting energy 300 becomes 100 after shield control
and -100 after firing. These are pre-completion scenario calculations, not
original-executable transcripts or a resolution of general precision,
readiness, or later fatal handling.

## Torpedo burst sequencing and scenarios

TORP, DECWAR.FOR:4228–4435, fills TORPL before the validation loop at label
700. That loop checks every assigned target before PAUSE and the launch loop.
Each iteration rereads the firing ship's position and device/shield condition;
TORPL is not re-resolved. The zero-displacement branch precedes ammunition
expenditure but follows ordinary deflection draws. It exits through label 2400;
initial self-target completion remains a C-010 discussion, not normalized here.
Misfire sets IFLG negative, processes the current flight, and stops at the next
iteration before deflection draws. Supply, range and critical-device validation
are not re-entered between shots.

Direct planet destruction at label 1800 subtracts 1000 stored score units
(100 displayed points); an initial star nova subtracts 500 (50 points).
The chapter's three scenarios distinguish validation failure, misfire truncation
and a repeated target whose occupant has been removed. The friendly-intercept
scenario's geometry and literal short notices are checked using the existing
path, flight and notice companions in
logs/spec1.0-nova/torpedo-scenarios-check.log. This is a component composition,
not a full raw-input, autonomous-completion or delivery-order verification.

Correction to the self-target discussion: the TORP caller at DECWAR.FOR:197–201
goes directly to label 3500 after a normal return, bypassing automatic repair
at label 3400. The example therefore uses life-support reserve and stardate,
not a 30-unit repair. This agrees with Section 9.1's weapon completion path.
