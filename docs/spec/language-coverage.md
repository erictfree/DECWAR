# Generalized language conversion coverage

This record concerns the current book manifest. The older [source coverage
matrix](coverage.json) measures source analysis, not completion of this rewrite.
The distinction matters: retaining a researched rule in a companion file does
not make it a complete language-level definition in the assembled book.


## Requirement-level review — September 6, 2026

This review uses the included files in [book.json](book.json), the deliverables
and completion criteria in [PLAN.md](PLAN.md), and the actual validation scope
in [the builder](../../tools/spec/build.ts). It does not classify the whole goal
as complete. A source citation establishes traceability, not automatically a
correct or complete semantic contract.

| Requirement | Current authoritative evidence | Completion finding / remaining proof |
| --- | --- | --- |
| Concrete plan and scope | PLAN; README scope clauses; book manifest | Present. The scope remains all command families and cross-cutting semantics, not only the latest checkpoints. |
| Austin authority and separate CompuServe amendments | README pins Austin revision; variants is the sole appendix; NORMALIZATION is outside the manifest | Structure established. Review every amendment against its affected core clause; standings types, ranking, numbering, ordinary writes and report formatting are drafted. Remaining variant obligations include environment origin-code acquisition, damaged records, persistence failures and coordination. |
| Modern ADTs and ordinary arithmetic | language-model types/notation; operation signatures throughout commands and shared chapters | Drafted. Whole-book property/type references and invariants still need review. No checker currently proves type consistency. |
| Lexical syntax and interactive grammar | lexical; grammar; grammar checker verifies 100 productions and 12 terminal categories | Reference integrity checked. Complete even-item torpedo forms and count rejection are specified. Absent target components and special empty continuations remain unresolved; this is not parser acceptance verification. |
| Every command and pregame entry | commands has all 33 main commands; builder compares main and pregame tables to source coverage | Inventory and drafted contracts established. Source-table agreement alone does not prove each argument, failure and lifecycle path has a complete contract. |
| Game transitions and scoring | commands, world-rules, turns and autonomous | Substantial source-derived contracts. Terrain report fallthrough has an explicit unresolved suffix boundary. Autonomous target edge domains, fatal-target reports and intermediate concurrent effects still need disposition. |
| Multiplayer ordering and timing | coordination domains; communication operations; turn and elapsed-wait rules; main-command acquisition | Phase boundaries, nested release and thirteen caller-specific failed-entry continuations specified. Reentrancy, racing claims, interrupted operations and full delivery bindings remain incomplete. |
| Session/configuration/lifecycle | session-rules admission, preferences, release, history, world end and SavedShipCondition | Drafted with explicit gaps. Saved values do not establish a working continuation; concurrent admission, final-report failure and interrupted lifecycle need resolution. |
| Randomness and reproducibility | world-rules RandomEvent, distributions, conditional draws and tournament mapping | Replay validation, retained direct impact draws and finite-source disclosure are specified. Distribution qualification, complete nested draw/context ordering and interrupted replay remain unverified; no universal approximation tolerance is selected. |
| Observable output | presentation; information; 324 named fragments verified against Austin | Many report recipes and literal fragments reviewed. Terrain, full terminal editing/transport, remaining command responses and resource failures prevent terminal-conformance claims. |
| Conformance examples and claims | language-conformance has 662 scenario rows at this checkpoint; README limits claims | Examples present. Builder checks table structure and duplicate IDs, not their expected results. Claim domains and evidence requirements are defined; final scenario coverage and complete domain review are still needed. |
| Single assembled publication and attribution | manifest metadata; builder; output PDF/Markdown/LaTeX | Build mechanism and credited draft exist; recent changed pages were visually checked. Final whole-document editorial/layout review remains required after substantive edits finish. |
| Evidence, normalization and runtime preservation | source links; NORMALIZATION; WORK_LOG; source audit | Evidence organization established; recent changes are documentation only. Repeat archive audit and verify final diff at publication; current partial checks are not whole-goal proof. |

The recent source checks closed specific gaps: command acquisition, elapsed
waiting, inactive prompt availability scanning, saved condition values, POINTS
presentation, absence messages and report-section boundaries. They did not
close all lifecycle or terminal requirements. Earlier chronological entries
below remain checkpoint history; this table and the current command matrix
identify the remaining work.

Next review priorities are (1) finish the remaining special-input and autonomous
edge domains without inventing behavior, (2) complete the variant amendments,
(3) finish concurrency/lifecycle dispositions and conformance-profile criteria,
and (4) conduct whole-book type, source, example and layout review. Source facts
that cannot define generalized behavior must be identified precisely; they must
not be replaced by undocumented playable repairs.


## Converted command clauses

All 33 main-game commands now have drafted grammar and ADT operation contracts. The
remaining dependencies below still limit end-to-end conformance claims.

| Command | Grammar and semantic clause | Remaining dependencies |
| --- | --- | --- |
| SHIELDS | [SHIELDS](commands.md#shields): ADT operation contract and complete ordinary prompt/response strings. | Session, interrupted output and concurrent confirmation; transfer confirmation prints no numeric amount. |
| RADIO | [RADIO](commands.md#radio): ADT operation contract. | Message delivery and interruptions; ordinary preference responses are specified. |
| ENERGY | [ENERGY](commands.md#energy): ADT operation contract. | Notification delivery and session; ordinary sender responses are specified. |
| DOCK | [DOCK](commands.md#dock): ADT operation contract. | Concurrent world and interrupted reporting; ordinary docking and optional STATUS response sequence specified. |
| REPAIR | [REPAIR](commands.md#repair): ADT operation contract. | Concurrent world and interrupted reporting; silent repair and optional DAMAGE sequence specified. |
| SCAN, SRSCAN | [SCAN and SRSCAN](commands.md#scan-and-srscan): ADT operation contract. | Full transport/control delivery and concurrent installation changes. |
| STATUS | [STATUS](commands.md#status): ADT operation contract and ordered field presentation. | Full terminal controls and multiplayer observations. |
| DAMAGES | [DAMAGES](commands.md#damages): ADT operation contract, title observation and row presentation. | Full terminal controls and multiplayer observations. |
| TRACTOR | [TRACTOR](commands.md#tractor): ADT operation contract. | Occupied trailing sectors and concurrent acquisition; direct responses and activation publication are specified. |
| MOVE, IMPULSE | [MOVE and IMPULSE](commands.md#move-and-impulse): ADT operation contract. | Zero-item reply after an own-sector target, crowded towing, concurrent relocation and random distributions; ordinary direct responses specified. |
| BUILD | [BUILD](commands.md#build): ADT operation contract. | Planet-update availability and conversion/world-end ordering; ordinary stage/conversion/rejection responses specified. |
| CAPTURE | [CAPTURE](commands.md#capture): explicit ADT operation contract. | Coordination entry-failure binding, racing targets and final lifecycle; direct responses and defensive-hit publication order specified. |
| PHASERS | [PHASERS](commands.md#phasers): ADT operation contract. | Concurrent target changes, random distributions and notice delivery; ordinary direct responses and publication boundary specified. |
| TORPEDOS | [TORPEDOS](commands.md#torpedos): ADT operation contract. | Original-line missing target components and zero-item target continuation; complete four-/six-item cases specified. Concurrent target changes and notice delivery remain; ordinary direct prompt, misfire and inventory responses are specified. |
| LIST, SUMMARY, BASES, PLANETS, TARGETS | [Galaxy reports](commands.md#list-summary-bases-planets-and-targets): ADT operation contract. | Exhaustive selector-order coverage, concurrent reporting, interrupted output, terrain presentation; section boundaries and absence-message recipes are specified. |
| POINTS | [POINTS](commands.md#points): ADT operation contract. | Zero-denominator presentation and concurrent counts; ordinary headings, rows and field formatting are specified. |
| TYPE | [TYPE](commands.md#type): ADT operation contract. | Unselected terminal profile, concurrent observations and full terminal controls. |
| TIME | [TIME](commands.md#time): ADT operation contract. | Environment clock/accounting binding and unavailable origins. |
| USERS | [USERS](commands.md#users): ADT operation contract. | Session metadata binding and admission interleavings; ordinary terminal rows and headings are specified. |
| SET | [SET](commands.md#set): ADT operation contract. | Unselected terminal profile, nonprinting name characters, world termination and responses. |
| TELL | [TELL](commands.md#tell): ADT operation contract. | Full multiplayer publication/receipt conditions and terminal presentation. |
| *PASSWORD | [*PASSWORD](commands.md#password): ADT operation contract. | Complete session privilege lifecycle. |
| *DEBUG | [*DEBUG](commands.md#debug): ADT operation contract. | Instrumentation selection and environment timing binding. |
| HELP | [HELP](commands.md#help): ADT operation contract. | Concurrent temporary-sector effects, complete text/presentation binding. |
| NEWS | [NEWS](commands.md#news): ADT operation contract. | Full control/terminal binding and environment resource failures. |
| GRIPE | [GRIPE](commands.md#gripe): ADT operation contract. | Context rendering, partial storage failures and concurrent temporary-sector effects. |
| QUIT | [QUIT](commands.md#quit): ADT operation contract. | Final ratios/report failures, admission/release interleavings and environment continuation. |


These clauses have been checked against the cited Austin routines and use
ordinary game-unit arithmetic. They are drafted clauses with explicit dependencies,
not complete end-to-end conformance claims.

## Remaining command work

A clause for every command is not a complete command specification. Review the
contracts together, close the dependencies above, and
complete the remaining startup/admission edge cases and environment bindings. Command
coverage does not establish lifecycle, concurrency or terminal conformance.

## Shared and variant work

- Abstract model: game-state ADT and operation-contract notation introduced;
  SHIELDS, RADIO, ENERGY, DOCK, REPAIR, SCAN, SRSCAN, STATUS, DAMAGES,
  TRACTOR, MOVE, IMPULSE, BUILD, CAPTURE,
  PHASERS, TORPEDOS, LIST, SUMMARY, BASES, PLANETS, TARGETS, POINTS, TYPE, TIME, USERS, SET, TELL, *PASSWORD, *DEBUG, HELP, NEWS, GRIPE, QUIT and
  message publication/reception/discard use explicit contracts. Compact type-record
  declarations, tagged result alternatives, Map/List/Set/Optional/Result and the
  distinction between local assignment and game-state updates are explicit. The
  updated guide uses C-family blocks, colon return types, named variant fields,
  assignment =, equality ==, and requires/ensures/invariant contracts. Failure
  aliases preserve the declared rejection and cancellation paths. Full definition
  order and invariant coverage remain under review. World
  collections now distinguish unordered identity sets from the ordered planet
  sequence, with identity uniqueness and stable surviving planet order. Mapping/property notation,
  the nine device states and their distinction from hull damage and shield state
  are defined explicitly. Phaser-bank identities and independent deadlines are
  defined separately from shared device damage. Report groups, admissions, telemetry and summary observations, terminal profiles and world-ended state, token categories, acquired-line/command input values, radio service and message observations, scan marks/rows,
  ordered status observations, device-damage rows, type/time/user observations, typed score columns/rows and ratio operands,
  session reporting metadata and commission clock baselines are defined. Sector objects, geometric points/vectors, PathResult,
  symmetric beam membership and fixed base-identity order are defined. Shared
  AttackSource/DamageTarget, WeaponHit/BaseHitResolution/RomulanHit and displacement
  result types separate target state, credited damage and report observations. The main-command clauses use that form; shared operations and their dependencies
  still require review. Identities, quantities,
  roster, installations, radio, tractor associations, preferences and score
  categories drafted; full lifecycle remains.
- Lexical and command grammar: ResolveLocations/ReadLocations now define typed
  scalar/position results, arity/type/range precedence, computed target validation
  and speed delay, including blank versus mode-only continuations. Shared grammar
  vocabulary distinguishes token categories, candidate names, raw text fragments
  and input boundaries. All 100 current productions reference defined productions
  or one of 12 explicit terminal categories; the build checks this and grouping.
  That reference check does not establish complete input acceptance. Malformed
  torpedo forms and exceptional zero-item caller paths still need complete rules.
- Turns: CompleteTurn, CommitPendingScore, automatic-repair selection, DefenseContext
  and life-support observations now use explicit contracts. Completion classes, pacing, base and planet
  defense and base replenishment drafted. Installation eligibility during HELP/GRIPE
  and the Romulan context's triggering-faction notice audience are specified;
  detailed interleavings remain.
- Shared world rules: typed path, beam, PhaserHit/TorpedoHit, ship/base damage,
  score-credit, Romulan-hit and Displace contracts now connect to their callers.
  NovaContext/NovaHit, NovaImpact/ExplodeStar and RemovePlanet now define
  chain ordering, distinct score/report effects and world-end propagation.
  Fatal-target weapon caller reports and complete concurrent world-end ordering remain.
  Maintained base/owned-planet counts and ReevaluateDocking are explicit;
  construction reuses a fixed base identity and updates counts before activation.
- Autonomous Romulan: persistent activity state, cadence, appearance, target
  ranking/ties, pursuit/avoidance, weapon deadlines, phasers, torpedo bursts,
  star aiming, accidental planet hits and follow-up defenses drafted in
  [the autonomous chapter](autonomous.md). Empty or all-distant target selection,
  concurrent/invalid sector states and interruptions
  remain unresolved. The target-domain limit is not a new pursuit-radius rule.
- Randomness: ideal distributions, conditional probabilities, draw ownership,
  random-event replay and tournament-key reproducibility are explicit. Finite
  binding acceptance and complete multiplayer/control event ordering remain.
- Communication: CombatNoticeService defines immutable observations, forty-notice
  capacity per publisher, delivery priority, oldest-publication eviction,
  reception/discard, delivery-time base-radio suppression and hit-before-radio
  drain order. Star, torpedo-outcome, base, Romulan-appearance, energy-transfer
  and tractor observation values are explicit. ImpactObservation composes typed
  ship/base/planet/Romulan snapshots with the weapon/nova results, including
  ownership-at-impact, displacement positions and recipient-specific critical
  details. Complete terminal catalogue and concurrency remain. Radio message identities, recipient filtering, publication order,
  capacity loss, consumption and gagging drafted. Autonomous speech's ungag effect
  on the triggering captain is specified; complete interleavings remain.
- Sessions: startup, pregame ACTIVATE and *ZAP, entry-name acquisition and reuse,
  admission, faction/ship selection,
  galaxy creation, initialization commands, HELP/GRIPE activity, release and
  world termination drafted. Nonprinting entry-name input and raw-input control
  delivery, pregame SET NAME, administrative schema/write failures, concurrent claims/cancellation,
  destroyed-base spawn exclusions, reused action-phase state, resume, full
  control behavior and terminal presentation remain.
- Terminal presentation: a new included chapter defines PresentationContext,
  FormatNumber/FormatLocation, display-only precision, labels, prompts and ordinary
  line/column composition. Combat bodies now compose the typed observations,
  including recipient-specific critical detail, Romulan deflection wording,
  base emergency paragraphs and exact spacing. Radio headings preserve the original
  audience and retain their body-ending blank line. STATUS fields, DAMAGES headings/rows,
  TIME durations, TYPE preference/option lines, USERS identity rows/headings and
  complete scan-grid axes/rows
  now compose their typed report values. LIST-family detail and summary lines
  use recorded affiliation and visible telemetry; selection-dependent section
  boundaries, named/coordinate absence messages and NoMatches composition are
  specified. POINTS headings, labels, accounting rows and numeric fields are
  specified for defined ratios. Terrain output and zero-denominator ratios
  still need complete rules. Complete control/transport behavior
  and remaining command/report recipes still remain; the source-analysis terminal
  chapter stays outside the book.
- Information resources: help topic sections, news continuation boundaries and
  feedback records drafted; complete headers and storage-failure bindings remain.
- CompuServe appendix: population, names, explicit initial preferences and selection,
  startup versus pregame matching, DOCUMENT effects, HONORROLL entry/continuation,
  Ctrl-G behavior, speech probabilities, autonomous audiences and their silent
  validation are specified. Direct-reply token ordering, body choices, fallback
  qualifiers and uninterrupted relocation are drafted; the origin-wording binding
  and publication/concurrent return paths remain open. Explicit HONORROLL source selection, empty/open-failure continuation and
  source-boundary interruption are now specified. Standings record fields and placement order are now defined; complete durable
  updates, caller status, privilege,
  lifecycle/concurrency and presentation
  amendments remain. Separate CompuServe examples cover the new clauses.
- Examples: resources, scans/reports, tractor, movement, construction, capture,
  phaser, torpedo, nova, defense, report visibility, knowledge, scoring, preferences
  communication and autonomous activity cases drafted;
  broader command, lifecycle and multiplayer cases remain.

No game code or legacy source is changed to conform to this draft.


### Coordination review checkpoint

The abstract model now defines Austin's two coordination domains, including
administrative clearing in the radio-service domain, named operation boundaries,
release-all scope across nested phases and waiting without implicit release.
Admission explicitly ends coordination before the selected ship is reserved.
These constrain traces; they do not complete all racing-claim, interrupted,
reentrant or stale-observation cases. CompuServe's distinct coordination is
marked as an unfinished amendment, not an implicit inheritance of Austin rules.


### Command-acquisition control checkpoint

Main-command acquisition now states prior-delay handling, ordered hull/energy/
world checks, the YELLOW assignment, notice-before-radio delivery, ordinary
readiness waits and command matching. It distinguishes interrupt delivery during
token acquisition from an already-pending interrupt/disconnect at the wait
boundary. Nested delivery, read-time disconnect, environment availability and
final-report failures remain explicit binding questions. This does not import
the playable host's control repair into the Austin contract.

The prompt-boundary availability review resolves one previously listed gap:
Austin CHKSEQ returns without scanning or releasing sessions (WARMAC.MAC
3078–3079). The session chapter and EX-MODEL-592 now state that absence of an
automatic availability check. Broader admission, resume and release contracts
remain separate review items.

SavedShipCondition now defines the release snapshot's domain values and the
conditional RSTART checks/restoration sequence. The TRAP-to-RSTART identity gap
is explicit; these source effects are not classified as a completed environment
continuation operation. Score, queue and tractor state are not silently folded
into a whole-ship save/restore promise.

## Type-notation review checkpoint

The included-book declaration scan found no duplicate named type/enum
introductions. Review distinguished opaque `abstract type` and `ordered type`
declarations, comma-separated identities, EBNF names and operation-local result
tags; a simple capitalized-word scan is not a type checker. The notation chapter
now explicitly scopes result tags and explains bare singleton outcomes within
Result. This closes a presentation ambiguity, not the whole type/property audit.
Field accesses, operation inputs and invariant consistency still require review.

The next type-review pass found no unmatched property names in the included
book's lexical property inventory, and checked the common s/c/w field references
against Ship (18 fields), Captain (13) and World (22). This is field-name
inventory, not proof of alias binding, optional-value presence, units or type
compatibility. The notation now explicitly limits unchanged-state claims to an
operation's own effects and distinguishes completed-state postconditions from
invariants over intermediate transitions. Remaining type review must examine
those stronger properties rather than treating this scan as semantic proof.

BUILD review now includes separate scenarios for failed phase entry retaining
the fifth stage (EX-MODEL-594) and last-planet conversion terminating before base
installation (EX-MODEL-595). These complement the existing no-free-identity,
discovery-transfer and maintained-count examples rather than treating all
conversion failures as rollback. Intermediate sector observation remains open.

CompuServe departure-marker review now covers confirmed QUIT, hangup at QUIT,
immediate movement death and intercepted fatal environment failure. Examples
EX-COMP-32–34 distinguish these from fatal command-acquisition checks. The
marker is not a ship-life invariant. Full standings persistence, counters and
environment-failure continuation still require review.

The CompuServe statistics ADT now includes mission and reported-loss counters.
PrepareStandingUpdate specifies insertion and no-insertion write decisions;
the access contract preserves PAYING-first selection, empty initial values,
own-class writes and normal-return opening failures. Admission counter changes,
partial reads, durable storage, interrupted access and full row output remain
separate review items.

RecordCommission now connects CompuServe statistics to admission: shared versus
stored game number, service-specific mission increments, two-source NON_PAYING
sequence, pre-reservation ordering and final write-opening failure. The two
intermediate NON_PAYING failure continuations remain explicitly outside the
ordinary-completion contract; no successful reservation is inferred from a
mission count. Examples EX-COMP-39–41 cover this distinction.

Honor Roll presentation now gives exact overall/group/column heading literals,
explicit-call narrow-versus-wide row selection, and report-level pending-interrupt
observation points. Row values/spacing and asynchronous control transfer remain
open. Examples EX-COMP-42–44 distinguish heading selection from row selection
and group interruption from immediate per-row cancellation.

FormatHonorRollRow now specifies names, account labels, Credits, elapsed minutes,
calendar date fields, widths and separators. Signed rounding and date-epoch
artifacts are explicitly normalized outside the book; ranking and game state
are unchanged. Calendar/date acquisition, malformed records and asynchronous
transport remain environment dependencies rather than guessed game rules.
EX-COMP-45–48 cover rounded values and short/long name/account padding.

Austin terrain review now traces both coordinate admission and the formatter.
Terrain retains kind and query position; its prefix is specified. The remaining
suffix is a reviewed source-to-model ambiguity, with evidence in evidence.md:
it must not create terrain energy/shields or acquire a guessed replacement.
Complete terminal conformance for that suffix remains open.

Original TORPEDOS input now distinguishes fully determined even-item forms
(four items/count one; six items/count one or two) from absent-component cases.
Location resolution precedes first-item count interpretation and count rejection.
The source is not replaced by an odd-item-only parser. EX-MODEL-596–598 cover
selected targets, count-error precedence and the narrower unresolved boundary.

## Modern-notation and field-meaning checkpoint

Reviewed the included-book vocabulary against the supplied Modern System
Specification Guide. Searches for machine vocabulary were inspected in context:
source-link filenames, quoted Honor Roll wording, account-label octal digits,
lexical line-capacity errors and explicit normalization scope are not hidden
memory-layout requirements. This is a scoped editorial review, not a claim that
every semantic operation has passed a type checker.

Clarified lifeSupportReserve as a signed reserve count, with decrement conditions,
zero/negative distinction and links to CompleteTurn/DOCK. Replaced the misleading
initial-state phrase “five life-support turns.” CompuServeStatistics now appears
before RecordCommission first refers to that type. Whole-book forward references,
optional-value presence, aliases, unit consistency and operation contracts remain
to be audited; this checkpoint does not treat a name inventory as that proof.

Random replay now has an explicit matching query and failure ordering, complete
versus prefix endpoints, and collection-order requirements. Finite-source binding
claims must disclose discretization, integer mapping and context advancement;
a transcript does not certify distributions. No universal approximation tolerance
is invented. Full per-operation draw-order and multiplayer-context review remains
necessary; these validation rules alone do not complete it.

Movement/weapon random-entry review now checks propulsion, coordinate/range,
phaser target/strength and torpedo early-own-sector branches against Austin.
The first phaser heat choice occurs even when overheating is impossible at the
selected strength; late torpedo own-sector termination retains deflection choices.
The review explicitly distinguishes the documented nonstar unused-draw
normalization from native seeded parity. Full nested draw/context review remains.


Shared weapon-impact review covers initial torpedo guards, phaser entry,
deflection, critical-device selection and base destruction choice order.
EX-MODEL-606–608 exercise retained initial draws, the no-draw fatal guard and
reported-versus-stored base strength. Compiled inspection supports base choice
ordering; the unused critical-ship compound choice remains normalized away.
Nested displacement, caller continuation and concurrent target access still
require their own review; this is not full seeded interaction verification.


Displace boundary review confirms the one-candidate, no-random-choice contract,
occupied/boundary rejection and the distinct empty-sector and black-hole state
effects against JUMP. Existing examples cover swallowed ship/base/Romulan
results; EX-MODEL-609–610 add blocked and boundary outcomes. This closes the
local displacement choice-order check, not concurrent query/update ordering.


The coordination chapter now states seven caller-specific failed-entry
continuations together: admission, relocation, fifth BUILD, CAPTURE, player and
Romulan torpedo planet hits, and nova planet hits. The table was checked against
active source branches, including player TORP's misleading tube-empty report.
This resolves no environment failure causes or reentrancy semantics; those and
the remaining shared-service/resume paths still need complete review.


Session/radio follow-up adds five checked retry/refusal continuations to the
central table. GETMSG search failure clears notification indicators without
removing message recipients or initializing the returned body. The existing
normalization maps that attempt to NoMessage; the reception clause now says so
explicitly and preserves unread membership. The earlier statement that this
outcome was unresolved was too broad. Failure timing, interruptions and atomic
selection/removal remain unverified; this is not a completed radio audit.


Quantity-notation review now defines unit-preserving arithmetic, percentage
points and TimePoint/Duration operations centrally. Existing negative energy,
base-hit observations, signed scores and nonpositive wait requests remain valid;
field-specific bounds and clamps still belong to their operations. This clarifies
the ADT vocabulary without claiming a whole-book dimensional or type proof.


Entity-membership review corrected the abstract installation paragraph: base
destruction retains the fixed record for BUILD reuse; planet removal changes
current planet membership. The base set size is distinct from maintained and
surviving-base counts. This matches existing operation contracts and source;
full identity/optional-query domain review remains ongoing.


Core query domains now distinguish typed identities from current membership,
fixed ship/base rosters from removable planets/beams, and Optional absence from
an invalid lookup. RemovePlanet's absent-target outcome precedes lookup; empty
sectors remain valid Optional results. This makes existing signatures explicit
without adding diagnostics or default records. Concurrent check/use cases remain
an operation-level obligation; a full query-use audit is still required.


Tractor query-use review now unwraps the beam identity before querying endpoints
and states release-notice publication after state changes. OFF without a beam
remains a command-level result. Delayed reception is not guaranteed immediate
output or a second state transition. Following's crowded and boundary cases
remain explicit gaps; no new movement policy was added.


DIST target eligibility now includes the maintained faction base-count guard,
separately from positive base strength and sector presence. EX-MODEL-612 covers
an intermediate state where the guard changes selection. No-target/all-distant
selection and concurrent scans remain unresolved; the group guard is source-backed.


DOCK supply review adds the omitted maintained captured-planet-count guard and
explicitly preserves the absence of a base-count guard. EX-MODEL-613–614 cover
the distinction with unchanged replenishment amounts. Concurrent ownership and
sector observations remain unverified; this is not whole-command conformance.


Placement count review resolves the destroyed-base-position question for valid
retained records: positive opposing base count enables distance-four exclusion
around every recorded opposing base position; zero skips it. The existing
ReevaluateDocking count/strength guards also agree with BASKIL. Shared eligibility
must not be inferred across PLACE, DOCK, DIST and docking maintenance. Exhausted
domains, concurrent changes and galaxy-reinitialization phase remain open.


Installation eligibility cross-check now compares six source routines together.
Corrected the omitted base-defense faction-count gate and clarified replenishment's
record-only scan/order. Placement, DIST, DOCK and docking-maintenance gates agree
with their reviewed clauses. This does not establish atomic scans or complete
planet ownership/sector behavior during concurrent updates.


CompuServe direct-reply qualifier mapping is now defined for all 46 supplied
origin codes and absence/unlisted-code fallback. Source masked comparisons do
not establish the commented prefix matches. Origin-code acquisition remains
an environment binding, not a game syntax or geolocation feature. This closes
the wording-table gap without supplying a modern network lookup.


CompuServe ordinary coordination now specifies targeted release, repeated entry
for successfully held resources, positive-wait release/reacquisition and the
fresh-versus-existing-input distinction. Input-readiness waiting now separately
covers buffered/initialization input bypass, nonpositive polling, positive wait
release/reacquisition and readiness tests. Admission, planet, delivery and
standings resources now have explicit scope and remembered-resource selection
rules. Movement/admin mapping, pending/interrupted acquisition and environment
failures remain open.
The amendment no longer leaves the entire ordinary wait sequence undescribed.

## Type-reference review checkpoint

The colon-following type/value-name scan across the assembled book found no
missing nominal declaration among its candidates. Candidate exceptions were
result alternatives, declared enum/union values, or the generic Error parameter.
This scan does not parse the complete notation and does not prove all signatures
well typed. Detailed output is retained in logs/spec-named-type-review.log.

In commands.md, all 15 distinct direct `s` member names, 13 `c` member names and
16 `w` member names occur in the Ship, Captain and World declarations respectively
(logs/spec-command-field-review.log). This verifies property-name availability,
not that every local binding has the right type, optional values are unwrapped,
nested fields are valid, or quantities have compatible units. Those obligations
remain in the whole-book review. No normative change was needed for these checks.

The archive audit at this checkpoint passed 135 hashes, 83 declarations, 33 game
commands, 16 pregame commands and 324 strings; logs/spec-types-archive-audit.log
records its scope. This does not replace semantic or complete layout review.
