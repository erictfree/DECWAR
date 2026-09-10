# Galaxy-report evidence

## Written SUMMARY category matrix — 2026-09-08

The conformance sequence now checks19 written queries across all output lengths:
default/ALL/FRIENDLY/ENEMY; each SHIPS and BASES with FRIENDLY/ENEMY/ALL;
PLANETS with FRIENDLY/ENEMY/NEUTRAL/CAPTURED/ALL; PORTS, PORTS ENEMY,
CAPTURED PORTS and NEUTRAL PORTS. A fixed all-nearby galaxy has two ships per
faction, two Federation bases/one Empire base, and two neutral/one Federation/
two Empire planets. Expected category rows and blank separators are specified
independently; none of these summaries changes discovery or any Galaxy data.
Romulan activity is disabled to separate this matrix from the documented
faction/Romulan modifier question. Log:
`logs/spec1.0-nova/summary-category-matrix-check.log`.

## Empty aggregate diagnostics — 2026-09-08

LSTFLG:1757–1762 initializes the group knowledge qualifier from scope and
allegiance. LSTUPD:1929–1955 adds geographic qualifiers for examined candidates,
including rejected candidates. LSTFLG:1891–1918 assembles prefix, knowledge,
allegiance, category and suffix; its default suffix is `in game` if candidate
visits supplied none. MSG.MAC:97–125 provides the exact text. This accounts
for a numeric-range query saying `in game` when no matching objects exist,
and `known` persisting even with no planet candidates.

Section7.10 now defines the full composition, with five whole-output scenarios
checked in all three output lengths. No-result output leaves discovery and
game state unchanged. Log: `logs/spec1.0-nova/report-empty-diagnostics-check.log`.

## Empty, star and black-hole coordinate detail — 2026-09-08

DECWAR.FOR:1767–1777 obtains sector content, sets SIDE=0 and applies the
ten-sector limit before allowing LIST to call LSTOBJ. Other commands take
their no-object diagnostic branch. WARMAC.MAC:294–304 defines empty=0,
star=9 and black-hole=10. None is in LSTOBJ's eight-way computed transfer
at DECWAR.FOR:2100, so execution continues at the Romulan branch, which tests
XF and prints EROM (2102–2106). LSTFLG's special-content path does not call
LSTUPD to establish a fresh XF. ODISP names remain the actual sector content
(WARMAC.MAC:1989–2029), not Romulan names.

Section7.10 and C-028 now distinguish this defect from a missing ordinary
star-strength rule. Name-and-position-only output is proposed, not adopted;
the companion keeps an explicit guard. Distant and non-LIST paths have
defined output independent of the defect. This is source control-flow evidence,
not a native transcript or a claim about uninitialized historical values.

Austin source review for Section 7.10. The entry is a working draft, not an
original-executable verification or a complete acceptance/output contract.

| Subject | Evidence | Finding |
| --- | --- | --- |
| Command defaults | DECWAR.FOR:1359–1390,1525–1580 | Shared driver; distinct object/faction/range/output defaults; automatic summary addition is commented out |
| Selector effects | DECWAR.FOR:1588–1745 | Object, faction, ALL, range, output modifiers; stateful acceptance is not generally commutative |
| Direct selection | DECWAR.FOR:1763–1838 | Coordinate and name groups can emit immediately; absent/disabled Romulan distinction; names do not imply current visibility |
| Aggregate candidates | DECWAR.FOR:1839–1893 | Romulan then roster, bases by faction/slot, planets; closest excludes self and later equal-distance candidate wins |
| Visibility | DECWAR.FOR:1920–1956; WARMAC.MAC:3750–3765 | Chebyshev range; friendly/in-range detail, previously discovered distant objects, whole-game summary exception |
| Output and discovery | DECWAR.FOR:1960–2063 | Ordered report kinds; aggregate base/planet detail adds faction knowledge; summaries do not |
| Object details | DECWAR.FOR:2084–2136 | Enemy marker, range-dependent details, planet build-count suffix, verbosity/coordinate preferences |

Outstanding: complete LSTSCN acceptance, cross-group counters, direct-coordinate
knowledge effects, exact qualifiers and layout, pre-game and privileged cases,
and base-order ties (C-004). The source's cumulative summary accumulator is not
silently rewritten as independent per-kind counts. Romulan strength rendering
must be reconciled with the abstract energy quantity before final output rules.

Expanded the entry after user review with a per-command parameter matrix,
ordinary-group composition rules, aggregate visibility table, and a fixed-world
selection example. Rechecked LSTSCN:1525–1745 and LSTUPD:1920–1956. Explicit
SUMMARY changes range unless numeric range supplied; BASES defaults to both
outputs but accepts only one explicit output modifier. TARGETS PORTS is flagged:
PORTS can replace the implicit faction default and must not be described simply
as enemy ports. Tables are semantic examples, not exact rendered transcripts.

Follow-up: DECWAR.FOR:2060–2080 resets the summary count through its argument
after printing. This resolves the suspected carryover between object kinds;
the earlier caution about a cumulative accumulator is superseded for that
case. Multi-group qualifier merging still needs review.

Direct query review (1763–1838,2084–2136) establishes no discovery write, own
leading newline for named groups, and coordinate filter exceptions (C-017).
PRLOC:3078–3098 and MSG.MAC:105–115 support the explicit empty-coordinate
transcript. Parser abort returns before aggregate LSTOUT; already emitted
direct-query output survives. No original-executable comparison claimed.

Summary follow-up: LSTUPD:1920–1956 merges per-object selection and per-category
qualifiers; excluded candidates can still contribute category qualifiers.
LSTOUT:1960–2063 visits each object once, so overlapping aggregate groups do
not duplicate rows or summary counts. TARGETS suppresses faction/category
summaries but retains the Romulan summary and counts summary-selected enemies
in its final target line. LSTSUM:2064–2080 defines width-three count, optional
known marker, plural suffix, scope precedence and newline. The new
report-summary companion tests resolved line formatting only, not selection,
qualifier accumulation, blank-line assembly or parser transactions.

Section 10.9 follow-up: LIST:1379–1390 emits the initial newline, processes
groups before LSTOUT and bypasses LSTOUT on syntax failure. LSTFLG:1763–1838
distinguishes coordinate output from named-group leading newlines.
LSTOUT:1960–2063 retains empty-detail and empty-summary separators in selected
categories. Three assembly tests check a two-category SUMMARY, the separate
Romulan plus combined TARGETS summaries, and retained direct output on abort.
Their inputs are resolved report parts, not a parser or a full Galaxy query;
they do not verify the remaining selection or discovery rules.

PORTS follow-up: LSTSCN:1650–1656 replaces implicit allegiance unless SIDMSK
is set; ALL does not set SIDMSK (PARAM.FOR:122). Thus LIST PORTS ALL differs
from LIST ALL PORTS. TARGETS also loses its implicit enemy scope at PORTS;
its ALL branch does not expand allegiance. NEUTRAL before PORTS retains
planet-only kinds, whereas CAPTURED before PORTS expands to bases and planets
of both factions. PORTS before either NEUTRAL/CAPTURED fails the object-mask
check at1690/1697. Section7.10 and focused normalized-modifier tests now define
these cases; the earlier TARGETS PORTS review note is superseded. No general
commutative parser or full input-to-report conformance is claimed.

Aggregate-selection follow-up: a new companion connects Galaxy candidates to
resolved group selections, independent detail/summary inclusion and category
qualifiers. Tests cover numeric radius80 versus whole-game scope, unknown
summary-only bases, repeated-group deduplication, excluded-candidate qualifiers
and discovery-free selection. SUMMARY BASES output is assembled from selected
objects rather than supplied counts. It still takes resolved groups, not raw
command text, and does not implement direct queries, CLOSEST, or detail output.

Important control-flow distinction: LIST:1386 calls LSTFLG with alternate return
to label200, continuing group processing. Thus LSTFLG's no-objects return is
not a whole-command abort. LSTSCN's error return instead targets400 and skips
LSTOUT. Tested empty middle groups preserve earlier selection and allow later
groups. An initial mistaken interpretation of LSTFLG alone was corrected after
checking its caller; no normative abort rule was adopted.

LSTFLG:1756–1758 gives explicit numeric range priority over whole-game scope,
including radii greater than75. LSTUPD:1938–1956 contributes qualifiers even
for excluded candidates. Added concrete examples of both to Section7.10.
Check log: `logs/spec1.0-nova/report-selection-check.log`.

Ordered parsing and detail follow-up: LSTSCN:1519–1745 now supports the
companion's ordinary aggregate groups from normalized tokens. Tests cover all
five command defaults, keyword availability versus conflict, vessel-first and
separator-first lookup, independent group defaults, PORTS order, numeric range
precedence and output modifiers. Named/coordinate groups and CLOSEST are
explicitly outside this companion, not falsely rejected by normative grammar.

LSTSCN:1675–1686 retains ROMBIT for explicit faction names; FRIENDLY clears it
before reaching that branch, while ENEMY adds it. Added a discussion note and
a source-behavior test; the meaning is not silently normalized to faction-only.

LSTOBJ:2084–2136 and LSTOUT:2008–2053 connect emitted individual rows to discovery.
PLANETS and BASES ALL LIST scenarios now start with normalized command operands,
select from a Galaxy, format full output and check discovery changes. The base
case uses one base per faction to avoid claiming a decision on C-004 ordering.
Romulan detail conversion remains explicitly outside the row companion.
All checks: `logs/spec1.0-nova/report-groups-check.log`.

Direct-query follow-up: LSTFLG:1763–1838 retains the LSTSCN default range for
coordinate queries. Thus PLANETS/TARGETS direct coordinates still have radius10;
LIST/BASES can report a known distant permitted object. A wrong-kind base/planet
reaches its No-object diagnostic before LSTUPD, whereas ships bypass that kind
test. Section7.10 now distinguishes these cases with checked output examples.

Named-group scenarios check roster order, absent ships, distant enemy rows and
disabled Romulan text. The pure row formatter is now separated from aggregate
discovery, so direct reports leave knowledge unchanged. CLOSEST:1888–1892
reenters direct-coordinate output after choosing a candidate; it does not write
discovery. Candidate tests exclude self and unknown distant ports, enforce range
and return tied candidates without adopting C-004's unresolved ordering.

Checks use resolved direct requests, not all mixed raw group syntax. Romulan
detail conversion and LIST's empty/star/black-hole coordinate rows remain
explicitly unimplemented in these companions. Log:
`logs/spec1.0-nova/report-direct-check.log`.

Mixed-group integration: normalized tokens now run sequential direct groups and
deferred aggregate selection/output. Tests check retained direct text and no
discovery after a later parser error, continuing empty selections, and merged
detail/summary output without duplicate base rows or counts. Sources: LIST
1379–1390, LSTSCN, LSTFLG and LSTOUT. Mixed selectors within a single direct
group, CLOSEST dispatch, raw lexing and unresolved special detail remain outside
the driver rather than being assigned invented recovery.

Romulan exception found during integration: LSTUPD increments ROMCTR on each
successful aggregate visit; LSTOUT passes that accumulated counter directly to
LSTSUM, while NT increases only once for the Romulan. Other category counts
are recomputed from per-object summary selection. Thus the earlier general
claim that all repeated aggregate summary selection deduplicates needs this
exception. Section7.10/C-010 now flag it, and the companion declines repeated
Romulan summary cases rather than silently normalizing their count.
Log: `logs/spec1.0-nova/report-mixed-check.log`.

CLOSEST integration: parser handling at LSTSCN:1718–1744 sets detail output,
expands only the implicit range and rejects explicit output modifiers in either
order. The report driver now emits a unique closest candidate immediately,
without aggregate discovery; ties remain a C-004 guard. Self is excluded before
candidate qualifier updates, matching LSTFLG's closest branch. Mixed-target
summary qualifiers retain contributions from examined closest candidates.
Added complete mixed closest/base output and empty-self cases plus command-
specific C versus CL lookup tests. Log:
`logs/spec1.0-nova/report-closest-check.log`.

Romulan detail reconciliation: LSTOBJ:2102–2106 prints EROM with OFLT and a
literal percent suffix outside short output. OFLT's divide-by-ten convention
already defines Romulan.energy in Sections2/8 and evidence/06-romulan-damage.md;
there is no additional normalization or second strength property. Implemented
that field in pure rows and direct coordinate/name reports, replacing the
earlier unresolved companion guards. Added near/remote and short/long tests.

A complete TARGETS SUMMARY case includes one enemy ship, two distant enemy
bases (one unknown) and one Romulan. It reports four targets, retains the
separate Romulan line and leaves discovery unchanged. This closes that specific
parsed-selection/count/output scenario, not every TARGETS combination. The
repeated-Romulan discussion guard is also checked. Log:
`logs/spec1.0-nova/report-romulan-check.log`; initial test-fixture nullability
typecheck failure retained in `logs/spec1.0-nova/report-romulan-typecheck-failed.log`.

## Mixed selectors within a direct group

LSTSCN:1614–1630 gives the Romulan branch only a repeated-ROMBIT check;
the roster branch rejects any prior input flags other than NAMBIT/ROMBIT.
PARAM.FOR:95–123 defines OBJMSK to include both names and coordinates.
The later faction/range/ALL/CLOSEST checks do not all reject NAMBIT, whereas
output and object selectors do. This accounts for the asymmetric examples
now enumerated in Section7.10, rather than treating modifiers as commutative.

LSTFLG:1764–1835 gives coordinates precedence over named output. The named
branch unconditionally calls LSTOBJ after LSTUPD for each present named vessel;
it does not use a failed radius or CLOSEST selection to suppress that row.
Thus names followed by those modifiers do not behave like aggregates. The
Romulan branch changes OMASK to ships even after a coordinate; there is no
second direct Romulan report in that case. A second coordinate pair is rejected
because CRDBIT participates in OBJMSK. LIST:1384–1388 completes LSTSCN before
calling LSTFLG, so later syntax errors suppress the current group's direct
output, while earlier groups' immediate output is already visible.

The duplicate roster-name test at1625 reads singular SHIP; the selection
accumulator initialized at1556 and updated at1626 is plural SHIPS. These are
not the same variable. No duplicate policy or incidental value of SHIP is
adopted from this source mismatch. The branch table assumes a roster name
passed that check; it is source-control-flow analysis, not an observed
original-executable transcript. C-008 also constrains historical diagnostic
token spelling. C-010 records the resulting acceptance-policy discussion.
