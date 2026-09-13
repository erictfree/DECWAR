# Character decisions

### C-029: Remaining torpedoes after the firing ship is destroyed

A nova from an early torpedo can destroy its firing ship. The historical loop
can nevertheless launch later torpedoes from the retained position because it
does not recheck survival, supply or critical devices between launches. An
earlier misfire still prevents those later launches. Section7.20 distinguishes
this case from ordinary displacement and supplies a two-shot example.

**Status: unresolved.** Propose stopping all unlaunched torpedoes on destruction,
retaining effects and awards from completed launches. This changes ammunition,
random choices, later impacts and potentially victory, so it is not an implicit
lifecycle cleanup. Completion/final-report ordering must accompany the decision;
do not import an ambient dead-player execution context to preserve the source.

### C-028: LIST applies Romulan detail to empty space, stars and black holes

Nearby coordinate LIST queries name the correct sector content but reach the
historical Romulan detail branch. They may report Romulan energy with a percent
suffix, or `out of range` from retained report context. This incidental coupling
would require unrelated context to reproduce; it does not justify adding
energy or shield properties to these objects. Section7.10 records sensor limits
and unaffected non-LIST diagnostics separately.

**Status: unresolved.** Propose a normal name-and-position-only row for these
three cases. Preserve existing display names, padding and coordinate preference.
The proposal changes visible output by removing the unrelated numeric field
and contextual range result. Do not silently implement it or claim historical
parity. Historical values when Romulan activity is disabled/absent are not
invented from the current abstract model.

### C-027: Base distress changes the subsequent nova-hit report

Section6.6 identifies a historical notification side effect: a full-strength
base's distress notice clears the damage field before its nova-hit report.
The report shows zero while the already-awarded damage score remains nonzero.
Damaged bases skip distress and report the calculated amount. The effect also
occurs when the distress audience is empty.

**Status: unresolved.** Propose retaining the calculated nova damage for the
hit report independently of distress creation. This changes the visible number
but not scoring or strength loss. Do not model shared scratch-field clearing
as an abstract notification operation or silently claim corrected output is
historical behavior.

### C-026: Romulan nova energy and report boundaries

Section6.6 documents displacement before energy halving, remaining-energy
scoring, and the black-hole case. Tenths-based halving can leave a present
zero-energy Romulan, conflicting with the current ADT invariant. Exact halving
or destruction at zero would each change behavior. The branch also omits a
fresh hit-damage assignment and overwrites the displaced report position with
the retained vessel position.

**Status: unresolved.** The ordinary sequential path reports zero damage after
earlier notification clearing; review whether to preserve it. A coherent alternative uses actual energy loss as
reported damage, retains the displacement destination, and adopts an explicit
energy precision/zero-survival rule. Do not adopt any of these changes merely
to fit the model or reuse ordinary ship damage semantics.

### C-025: Originating faction in nested base-report audiences

Following a Romulan attack, both factions' bases fire, but historical base-hit
reports on ships retain the initiating player's faction for their ten-sector
audience. Section8.7 gives an observer example where identical attacks reveal
different information depending on whose completion initiated the activity.
This may be a meaningful timing effect or incidental retained context.

Using the target's faction would align the extended audience with ordinary
opposing-base defense. Using both factions would make Romulan-triggered defense
symmetrical. Either changes information availability. **Status: unresolved.**
No ambient player variable or invented Romulan faction belongs in the abstract
model; choose the observable recipient rule explicitly.

### C-024: Romulan dialogue through player communication rules

Romulan speech has explicit appearance/post-attack triggers and a generated
taunt vocabulary (Section8.8). The historical shared TELL path can emit absent-
recipient diagnostics and modify the triggering player's gag set despite there
being no player sender. OUTMSG also indexes its player gag test with a Romulan
sender lacking a roster index; that result remains unestablished.

Retaining these effects risks making shared-routine and indexing accidents game
rules. Removing them changes observable output and potentially gag membership.
Propose preserving speech timing/text while filtering eligible commissioned
radio recipients without player-side mutations, and defining an explicit
Romulan header. **Status: unresolved.** Do not infer a Romulan player identity
or silently adopt a repaired delivery path.

This ledger holds questions where an elegant abstract game could differ from
recognizable DECWAR. An unresolved entry is not yet a normative rule.

## Accepted foundations

### Fixed named fleet

DECWAR's eighteen named Federation and Empire ships are part of the game, not a
capacity constant. A pure model should identify ships by those names and retain
their factional roster order. A generic configurable fleet may be an extension,
but it is not the definition of DECWAR.

### Starbases are not numbered identities

The Austin source stores each faction's bases in ten numbered slots, but the
number is not shown to captains: output names a base by faction and commands
locate it by sector. The slot is therefore implementation bookkeeping, not part
of the abstract game. A faction may still have at most ten active bases.

### Destruction and release are distinct

A destroyed captain may still receive final information before the ship becomes
available again. The pure lifecycle therefore needs a destroyed-but-not-yet-
released phase even if an implementation could clean the session up instantly.

### Tractor beams are relationships

A tractor beam has no identity or state independent of its two ships. The
abstract model represents an active beam through reciprocal `tractorLink`
properties on its two ships, not as a collection of beam entities. Lead and
towed are roles in a movement: the ship that moves leads, and its linked ship is
towed. The relationship itself does not give either endpoint a permanent role.

### C-001: Life-support reserve crosses zero

The reserve is a signed countdown. It begins at 5 and successful docking resets
it to 5. After the repair phase of a completed turn, critical life-support
damage decrements the reserve when the ship is not docked. A value below zero,
not zero, causes fatal hull damage.

**Status:** resolved. Preserve the original semantics. The world-mechanics
chapter will specify the transition and its ordering.

## Questions to discuss

### C-002: Temporary black-hole interaction state

Some non-gameplay activities historically used a temporary board marker that
could be observed as a black hole by concurrent play. A pure model would keep
HELP or feedback activity separate from galaxy contents. Preserving the marker
could retain a surprising multiplayer interaction, but it would also elevate a
storage technique into a world rule.

**Status:** unresolved. Model real black holes as galaxy features; do not yet
specify temporary information activities as black holes.

### C-003: Faction vocabulary

The game uses Federation/Human and Empire/Klingon terminology in overlapping
places. A pure model can give each faction one canonical identity while the
input and output languages preserve aliases and period wording. Alternatively,
the vocabulary shifts may themselves be part of the fictional voice.

**Status:** unresolved. Use `FEDERATION` and `EMPIRE` as working semantic names;
settle accepted command words and emitted names when specifying that language.

### C-004: Base enumeration order

Austin stores each faction's bases in numbered slots, fills the first available
slot during construction, and enumerates active bases in slot order. Although
the slot number is not displayed, destroying and rebuilding bases can therefore
change their report order. A pure model could instead order bases by position or
construction time, or leave order unspecified.

**Status:** unresolved. Determine whether captains can recognize or rely on the
historical report order before assigning semantics to the order of
`Galaxy.bases`.

### C-005: Rejected movement changes docked status and alert condition

A distinct destination inside the galaxy clears docked status and sets green
condition before the warp limit is checked. An over-range request can therefore
undock a ship without spending energy or completing a turn. This can affect
subsequent gameplay, but may be an incidental validation-order effect.

IMPULSE has the same effect before rejecting a distance greater than one.
Resolve this question consistently for both movement commands.

The simpler alternative validates the whole request before changing the ship.
Retaining the effect preserves a free undocking/condition transition; removing
it makes rejection leave the ship unchanged.

**Status:** unresolved. Proposed resolution: validate before changing docked
status or condition. The MOVE draft states this only for accepted movement and
flags rejected movement for discussion.

### C-006: Movement path and towed position

Near a sector boundary, the path can inspect two sectors and choose randomly
between them if both are empty. Its executable inspection band is asymmetric.
Changing to conventional nearest-sector rounding would simplify the geometry
but change which obstacles stop a ship or torpedo. Exact mathematical arithmetic
can also change boundary decisions compared with historical floating arithmetic.

Towing exposes a separate inconsistency: on an oblique path, the position used
to display a towed ship can differ from its stored coordinates. The pure model
gives a ship one position. Placing the towed ship in the lead ship's last vacated
sector preserves adjacency but changes some historical destinations. Clearing
the towed ship's docked status on displacement would also change behavior.

Section 7.1 illustrates the discrepancy: final position (23,22) and directional
step (1, 2/3) yield (22,22) when the step is truncated before subtraction, but
(22,21) when the result is truncated. A single-position contract needs an
explicit choice; two nominally equivalent formulas do not preserve the same
game observation.

**Status:** unresolved. Proposed resolution: retain two-sector obstruction
checks with a reviewed mathematical boundary rule; use the last vacated sector
for towing and clear the towed ship's docked status when displaced. Review
these choices separately before making them normative.

### C-007: MOVE readiness and prompted input

Movement delays the next command. The historical deadline depends on terminal
speed and begins before coordinate input; answering the prompt can consume the
delay. Computed coordinates also incur a terminal-dependent pause. These rules
affect tactical pacing but depend on facilities outside the pure game model.

A fixed movement duration measured from acceptance would be easier to define,
but changes both pacing across terminal classes and the prompt interaction.
Preserving the prompt interaction with a fixed duration would remove the
terminal dependency while retaining its tactical effect.

**Status:** unresolved. Proposed resolution: define an explicit game duration
and readiness transition in the shared timing rules. Choose its duration and
start event after reviewing the interaction; the MOVE draft assigns neither.
The user deferred this choice for discussion. Section 9.1 now presents the
independent alternatives and their consequences in the specification itself.

### C-008: Word truncation and input limits

Historical recognition compares only the first five characters of a word.
Longer spellings can therefore be accepted even when their suffix does not
match a command or keyword. This may permit familiar shorthand, but the
particular cutoff also reflects storage representation.

HELP provides a concrete example: its topic name is INTRO. Historical
comparison also accepts INTRODUCTION or any other word beginning INTRO;
full-spelling prefix resolution does not. This is not evidence for a separate
INTRODUCTION alias. Section 7.21 distinguishes the canonical topic from this
unresolved suffix behavior.

Full-spelling, case-insensitive prefix resolution is simpler to explain and
diagnoses misspellings consistently; it rejects some historically accepted
inputs. The lexical and grammar drafts use that working rule and flag this
difference. Historical line, token, and numeric capacities likewise need
separate decisions about meaningful language limits.

**Status:** unresolved. Proposed resolution: retain genuine prefixes and full
canonical spellings; remove arbitrary suffix acceptance caused by truncation.
Do not make input capacity a machine-word property.

### C-009: Empty tokens and incomplete coordinate responses

Commas and numeric punctuation can produce empty or unusual token classes.
The handling of modifier-only or malformed coordinate responses can also
differ between the initial prompt and an own-position retry. Preserving every
case would expose subtle input behavior, including possible reuse of earlier
operand values, as part of the language.

The simpler alternative requires digits in numeric literals, treats malformed
operands as errors, and applies one consistent response rule at every
coordinate prompt. This preserves normal input but changes edge-case recovery.

**Status:** unresolved. The current productions cover ordinary nonempty input
and clearly identify unfinished cases. Proposed resolution: consistent prompt
recovery without stale operands; decide empty-comma handling explicitly during
lexical review.

### C-010: Command-specific acceptance and recovery

Some commands ignore extra operands, stop reading at a non-word, or request
replacement input instead of rejecting a malformed segment. Galaxy-report
groups also have order-dependent restrictions. Treating every command as a
strict parse followed by an all-or-nothing transition would change observable
input behavior. The grammar now records ship-first and ordered keyword lookup
where the source demonstrates them; that priority is not a storage artifact.

The simpler alternative consumes a complete segment and rejects any unmatched
operands consistently. It is easier to specify but may remove useful leniency
and alter prompted interaction. The expanded grammar uses complete intended
forms and identifies the remaining acceptance cases rather than reproducing
stale operand values.

**Status:** unresolved. Review trailing operands, malformed coordinate retries,
torpedo target counts, and mixed report-group constraints per command. Proposed
resolution: preserve meaningful prompting and name precedence; eliminate stale
operand reuse, with each change separately documented.

Report-specific review: STATUS reports an unknown word and continues, but
stops at a non-word; prior fields remain visible. DAMAGES silently skips an
unmatched word, stops at a later non-word, but chooses its default report if
the first operand is a non-word. These cases do not reuse stale values.
The proposed resolution for this subset is to preserve partial-output recovery
and distinguish it from the grammar of well-formed invocations. The alternative
rejects the whole malformed report before emitting fields. The user has been
asked to choose; this subset remains unresolved pending that discussion.
Exact source-derived examples are in evidence/07-preferences-and-reports.md.

REPAIR has a state-dependent suffix exception: on an undamaged ship,
`REPAIR ALL DAMAGE` skips its report, while `REPAIR DAMAGE` and
`REPAIR 0 DAMAGE` print the all-functional message. An early return precedes
consumption of ALL, but numeric amounts have already been consumed. Proposed
resolution: recognize the appended report independently of current damage.
This changes observable output and remains unresolved; see
evidence/07-repair-dock.md.

Report faction modifiers retain an existing Romulan selection when explicitly
naming FEDERATION/HUMAN or EMPIRE/KLINGON; FRIENDLY removes it and ENEMY adds
it. This makes SUMMARY FEDERATION differ from SUMMARY FRIENDLY for a Federation
player. Treating a faction name as selecting only that faction is clearer but
changes results. Section 7.10 documents both readings for discussion. The
ordered aggregate-parser companion follows the observed branch for review,
not as evidence that the editorial choice has been settled.

The separate Romulan summary line also counts successful aggregate selections
across groups, unlike the distinct-object counts for ships, bases and planets.
Thus one present Romulan can produce a count of two after two selecting groups;
TARGETS' combined count still adds only one. A uniform distinct-object count
would remove the misleading multiplicity but change output. This is deferred
for discussion in Section 7.10; no normalization is adopted.

TORPEDOES rejects an initial self-target through its normal completion return,
whereas an out-of-range target uses the non-completing return. Both launch
nothing, but the former permits stardate advancement, life-support checking and
other weapon-turn processes, without automatic repair. Section 7.20 contrasts that observable result with
a uniform non-completing validation rejection. This remains unresolved and
is distinct from stopping a burst after earlier torpedoes have launched.

Computed weapon targets are historically resolved last-to-first even though
launches remain first-to-last. With several invalid names this changes which
error the player sees first. Section 5.6 contrasts that order with a written-order
resolver; neither alternative is newly adopted by that discussion.

Mixed direct LIST groups have additional asymmetries. A named vessel followed
by ENEMY, a radius or CLOSEST can still be reported without those selectors
filtering it; reversing the order can reject the name. ROMULAN uses a more
permissive branch and can follow an object selector or a coordinate, with
different precedence. Section 7.10 records the branch results and contrasts
separate direct/aggregate groups with uniformly applied filters. Neither
replacement is adopted. The duplicate roster-name check also reads `ship`
instead of the accumulated `ships`; a deliberate duplicate policy cannot be
inferred from that mismatch.

HELP interruption is boundary-sensitive: the topic reader clears an interruption
after stopping the current text, allowing later topics to run; the outer loop
can instead stop all remaining topics. Section7.21 distinguishes those paths.
Uniform cancellation of the entire HELP request would be simpler but changes
visible output. This choice remains unresolved, not a general stop-on-interrupt
rule inherited by every command.

### C-011: Presentation and administration at the language boundary

The command inventory includes terminal types, name entry with historical
uppercase/length restrictions, timing reports, feedback, privileged debugging,
password entry, and administrative reset. Players can invoke these forms, but
some effects describe the old host rather than the game itself.

A pure core could retain game-facing forms and specify optional presentation
or administration extensions. Requiring every historical host behavior would
constrain new implementations; deleting the forms without review would lose
part of the command-line experience.

**Status:** unresolved. The grammar records the names and argument shapes.
Proposed resolution: preserve player settings and recognizable interaction;
separate host-specific effects and administrative authorization from core game
semantics. Decide name-text normalization and terminal-type scope explicitly.

The output corpus also needs this boundary decision. The preserved HELP file
is explicitly the system-comment edition, not the ordinary deployed help
edition. Its NEWS file announces Version 2.2 and discusses baud-rate fixes and
KL instructions. Requiring those claims in a new implementation would preserve
historical text but misdescribe its software. Proposed resolution: write an
Austin Core help/news corpus that retains command idiom and game explanations,
with historical release notes confined to non-normative evidence. Retaining
the old payload verbatim as a historical display is the alternative. No choice
has been adopted. Content inventory and full historical news text are in
evidence/07-help-news.md and the discussion in Section 7.22.

Section 7.21 also records a lookup/content mismatch: INTRODUCTION is selectable
but has no marked section in the preserved formatted corpus, whereas DECINI
and CTL-T have sections but are not ordinary selectable topics. Supplying
INTRODUCTION text or exposing those extra sections would be a content change,
not merely a new storage format. The ordinary command listing and lookup-error
wording can be specified independently of that unresolved corpus choice.

TIME and USERS now have concrete core-only report candidates in Sections 7.23
and 7.24. TIME additionally exposes a clock collision: the historical elapsed
calculation adjusts differences into a ±12-hour neighborhood, so it cannot
serve as unrestricted game age. Adopting elapsed durations that continue across
midnight, choosing a wall-clock time zone, or removing processor/host columns
are explicit unresolved choices. No candidate output has been adopted.

### C-012: Tractor-device damage does not prevent linking

The historical TRACTOR operation checks adjacency, faction, existing links,
and shields, but not tractor-device damage. A damaged tractor device therefore
does not prevent establishing a link. Applying the usual critical-device
threshold would make the device model more uniform, but remove an available
tactic and create a failure case absent from this operation.

**Status:** unresolved. Proposed resolution: preserve the absence of a linking
damage check unless further behavioral evidence establishes a restriction.
The working TRACTOR entry follows this evidence; do not add an assumed check
or remove the damage property without review of its other uses.

### C-013: POINTS averages with zero denominators

POINTS divides accumulated scores by commissioning or turn counts without
guarding zero. A player can request a personal report before completing a
turn. Compiler-dependent division behavior is not an abstract game rule.

The alternatives are to show zero, mark the average unavailable, or omit the
average. Each changes observable output and has a different interpretation:
zero is a numerical claim, while unavailable distinguishes lack of a denominator.

**Status:** unresolved. Proposed resolution: display an explicit unavailable
value when the denominator is zero; agree its exact text and alignment before
adoption. Separately specify quotient precision for positive denominators.

### C-014: Scan defaults depend on presentation width

SCAN starts with radius 10 and SRSCAN with radius 7, but the historical
operation reduces all four default extents to fit a terminal-width calculation.
Explicit ranges are instead bounded by 10. Thus presentation width can change
which sectors the player sees by default, not just how the report is wrapped.

A pure alternative fixes the default radii at 10 and 7 and treats wrapping as
presentation. This removes a host-dependent input to the game language but may
show more sectors than the historical default on a narrow terminal.

**Status:** unresolved. Proposed resolution: fixed radii 10 and 7 independent
of display width, retaining explicit ranges and the limit of 10. Discuss before
adopting this change in the scan entries.

A separate label-layout issue occurs with one-column short scans: the initial
horizontal label is one greater than the actual column, reaching 76 at the
galaxy's edge. Section 7.9 contrasts preserving it, omitting the out-of-rectangle
label, and labeling the sole actual coordinate. This changes presentation only,
not scan bounds or discovery, and remains an independent unresolved choice.

### C-015: Shield transfer quantization and confirmed overdraw

The historical transfer operation can deduct more ship energy than the shield
increase represents: a one-unit deposit adds no shield strength. Rounding the
shield change toward zero also affects withdrawals. After a confirmation, a
deposit may exceed available ship energy; the transfer routine itself does not
clamp the resulting energy to zero. Its downstream consequences need review.

These are separate choices. Exact conversion at 25 energy units per percentage
point would remove quantization loss. Capping deposits by available energy
would prevent overdraw. Either changes observable resource use; overdraw may
also change survival or tactical choices. Keeping both requires explicit
rounding and exhaustion rules rather than machine representations.

Section7.11 now gives explicit equations and examples: a one-unit withdrawal
can add one ship-energy unit without reducing shield strength. Repeated small
withdrawals therefore create energy up to ship capacity. Alternatives include
exact strength conversion or coupling the energy credit to the quantized
strength change. These are distinct from clamping confirmed deposits. Section
7.12 separately shows inter-ship surcharge truncation making small
capacity-limited transfers lossless. All remain discussion alternatives.

**Status:** unresolved. Proposed resolution: review quantization and overdraw
separately with the user after tracing exhaustion. Do not infer approval for
either simplification from the use of ordinary arithmetic in the ADTs.

### C-016: Repair sign and output-dependent completion

Negative REPAIR amounts increase all device damage if any device is damaged.
Rejecting negative amounts would be simpler but removes that observable case.
Separately, the historical repair command completes a turn only if some repair
delay remains after its optional report. Slow output can therefore prevent
stardate advancement and automatic repair even after devices were repaired.

**Status:** unresolved. Proposed resolution: reject negative amounts and tie
turn completion to positive repair performed, not output duration. Discuss the
two changes independently before adoption. Preserving the historical choices
instead requires an explicit signed-repair rule and a timing model that makes
the output-duration effect testable without prescribing terminal hardware.
Timing is deferred for discussion at the user's request; Section 9.1 includes
a worked example. Deferral adopts neither the proposed completion rule nor
the separate proposal to reject negative amounts.

### C-017: Direct report coordinates bypass some filters

A nearby ship at an explicitly requested sector can appear in BASES or PLANETS
output. TARGETS can report a friendly object at a requested coordinate. These
forms are not equivalent to narrowing the aggregate query to one sector.
Direct base/planet reports also omit the aggregate discovery update.

**Status:** unresolved. Uniform kind/faction filters and discovery would be
simpler, but change observable queries and later information availability.
Proposed resolution: decide coordinate-query filtering and discovery separately;
preserve the documented distinction pending that decision. Do not quietly make
the historical branch exceptions part of an allegedly uniform selector model.

### C-018: Directionally asymmetric displacement

Displacement truncates the target coordinate plus the real-valued incoming
step. From (20,20), steps (1,0.2) and (1,-0.2) therefore select (21,20) and
(21,19). A sufficiently negative minor component can produce a two-sector
candidate, which is rejected. Positive and negative slopes are not mirror
images, even away from galaxy boundaries.

A symmetric rule could round each step to its nearest integer before adding
it to the target position. This would be easier to reason about geometrically,
but would change destinations, blocked displacements and black-hole deaths.
The existing behavior may be incidental numeric conversion rather than intended
character; its tactical effects nevertheless make silent replacement unsafe.

**Status:** unresolved. Proposed resolution: retain the evidenced rule in the
draft and discuss whether directional symmetry is preferable before changing
it. Section 6.3 and its examples make the current choice explicit.

### C-019: Nova pending-explosion limit

A chain reaction stops selecting additional neighboring stars while 29 selected
stars await their explosions. It resumes selecting once pending explosions
have been processed. This does not cap the total number of destroyed stars.

The limit comes from bounded pending work in the historical routine, but can
spare stars and nearby targets in a dense galaxy. An unbounded abstract list
removes the storage constraint and can produce larger chain reactions. Keeping
29 would turn an apparent representation constraint into an explicit game rule.

**Status:** unresolved. Proposed resolution: remove the limit, retaining the
observed selection probability and processing order. Ask the user before
adopting that change. Section 6.7 currently specifies unsaturated chains only.

### C-020: Release and a reused sector

The historical release routine unconditionally clears the departing vessel's
stored position, even after destruction has removed its occupancy. If another
object occupies that sector before release, the operation can erase unrelated
occupancy. This appears to couple object removal to a stale location rather
than to the departing vessel.

The pure alternative removes only the departing vessel's occupancy. It avoids
an unintended effect on another object but changes behavior if the historical
interleaving can be produced.

**Status:** unresolved. Section 9.2 uses vessel-specific removal as a proposed
rule, explicitly flagged for review. Confirm relevant historical interleavings
and discuss before treating the alternative as a settled conformance rule.

### C-021: Docking can survive loss of all adjacent friendly ports

The port-loss check preserves docking when the faction owns no planets.
Capture checks before transferring ownership, so the about-to-be-enemy planet
can preserve docking. Surviving nova displacement of a base does not trigger
the check. Consequently a ship can remain docked without adjacent support,
affecting life support, repair, and weapon supply rules.

The simpler alternative checks after every removal, ownership change or port
displacement, preserving docking only with an adjacent friendly base or planet.
It removes apparently incidental branch/order effects but changes survivability
and resource use.

**Status:** unresolved. Proposed resolution: use post-change adjacency checking.
Section 6.8 records the existing exceptions until discussed. An asynchronous
question asks the user to choose; no approval is presumed.

### C-022: Ending during an operation

The final planet's conversion can trigger ENDGAM inside planet removal. BUILD
has already increased the faction base count and awarded pending construction
points, but has not installed the base's position/strength or printed the
conversion announcement. Ending prints committed POINTS and releases the
player before those later steps. A consistent abstract galaxy cannot represent
that intermediate count as an active base that has not yet been created.

The simpler alternative completes the game operation, then evaluates ending
on its resulting galaxy. It changes the order of conversion output and may
change whether the final construction award appears in scores, depending on
the separately specified score-commit point. Neither change is implicit in
calling the conversion atomic.

Mutual destruction has a second presentation issue: after saying both sides
lose, the source also prints both factions' victory announcements and both
personal instructions for the receiving faction. This conflicts with the
ordinary meaning of those announcements but may be recognizable historical text.

**Status:** resolved for Austin Core. The first terminal outcome is latched in
the pure state and later checks cannot replace it. An accepted command finishes
its transition before the outcome is reported and the player is released.
Fifth-stage BUILD includes the new base in its replacement before the ending
check, then completes normal turn effects before final reporting;
it cannot yield mutual destruction. Mutual destruction is reserved for final
planet/base destruction without base creation and uses one dedicated
announcement without contradictory victory lines. Final-report delivery order
among multiple players and administrative shutdown remain separate lifecycle
work.

### C-023: Pending notification order and loss

Combat reports can be delivered out of creation order, even for one triggering
player, because freed earlier storage positions are reused and retrieved first.
Full combat storage overwrites an older pending report. Full radio storage
instead removes a selected recipient from pending messages to recover space.
Section 9.5 gives a concrete ordering inversion and separates this evidence
from the adopted creation-time facts and delivery-time formatting rules.

These behaviors affect the player's account of combat but depend on historical
storage organization and capacity. The simpler alternative delivers combat
reports in creation order per recipient, retains combat-before-radio priority,
and does not silently lose accepted notifications. It changes both ordering
and overload outcomes; a bounded alternative needs explicit semantic bounds
and loss behavior, not machine-derived slots.

**Status:** unresolved. Propose chronological combat delivery and no silent
notification loss. Do not adopt the alternative without review or introduce
historical storage layout into the abstract model. Concurrent creation order
and interruption during delivery require separate definitions.
