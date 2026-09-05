# CompuServe amendments

Status: selected amendments reviewed against both archives. This appendix is
incomplete; pending assembly, combat and persistence details remain in the
coverage record. It is not a second independently defined core language.

## C-1 — Applying the appendix

A CompuServe specification consists of the Austin core plus the amendments
below. An amendment replaces or adds only the behavior it identifies. A missing
amendment during drafting is not proof that the sources are identical. Source
statements that match can still behave differently through changed constants,
called routines, aliasing or monitor bindings.

## C-2 — Population and identity (amends STATE-1, SESSION-2 and SESSION-3)

Use ten player slots, five per side, and sixty initial planets/planet slots.
Federation slots 1–5 are Lexington, Nimitz, Savannah, Vulcan and Yorktown; Empire
slots 6–10 are Cobra, Demon, Hawk, Jackal and Wolf. Name resolution and iteration
use this order. Radio groups and recipient sets use the corresponding five-member
sides. Galaxy dimensions, ten base slots per side and maximum range 10 are unchanged.

**Evidence:** [C PARAM](../../legacy/compuserve/fortran%201978/PARAM.FOR#L25),
[C names](../../legacy/compuserve/fortran%201978/BLKDAT.FOR#L84),
[C SETUP](../../legacy/compuserve/fortran%201978/SETUP.FOR#L298),
[Austin PARAM](../../legacy/utexas/PARAM.FOR#L5).

## C-3 — Initial dialogue (amends SESSION-1 and SESSION-3)

Before pregame, display the version and Beginner/Intermediate/Expert choice.
A numeric value 1 or BEGINNER match selects long scans, medium output, normal
prompt and absolute input. Value 2 or INTERMEDIATE selects long scans, medium
output, informative prompt and relative input. Value 3 or EXPERT selects short
scans, short output, informative prompt and relative input. The source checks
these cases in that order, then continues without reprompting even for an
unmatched choice. Initial output-mode and option reports and SUMMARY follow.

The selected CompuServe main does not call DECINI after placement. Do not apply
the Austin five-command initialization asset as a CompuServe built-in default.

**Evidence:** [C main](../../legacy/compuserve/fortran%201978/DECWAR.FOR#L30),
[Austin main](../../legacy/utexas/DECWAR.FOR#L9).

## C-4 — Pregame names (amends GRAM-2)

Replace pregame blank slot 2 with DOCUMENT and blank slot 5 with HONORROLL.
Include them in ambiguity detection. Other slot numbers are retained. Detailed
HONORROLL behavior is specified in C-6. The initial startup dialogue also accepts
HONORROLL directly, displays standings and repeats the startup question.

DOCUMENT emits the continued source literal beginning
`This is where CompuServe rips you off for` and ending `Documentation!`, with
an unconditional CR/LF, then returns to pregame. Exact joining whitespace remains
U-C-DOCUMENT. The call to the external documentation program is commented
out; DOCUMENT does not initiate a purchase or launch that program. The pregame
introduction still advertises both HO and DO and describes DO as purchasing
documentation. Those introductory statements do not activate the removed call.

**Evidence:** [C pregame table](../../legacy/compuserve/fortran%201978/SETUP.FOR#L505),
[Austin table](../../legacy/utexas/SETUP.FOR#L409),
[C startup and DOCUMENT](../../legacy/compuserve/fortran%201978/SETUP.FOR#L126).

## C-5 — Ctrl-G and echo (amends LEX-2 and TERM-1)

CompuServe classifies Ctrl-G as an echo-toggle request rather than Austin's line
redisplay. However, its ECHON and ECHOFF routines immediately return before the
TTY-open operations and echo-flag assignments. Accordingly the classified request
does not perform that unreachable toggle. Do not infer an actual echo change
from the character-table flag or routine name.

**Evidence:** [C character table](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L980),
[C echo routines](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L1313),
[Austin character table](../../legacy/utexas/WARMAC.MAC#L846).

## C-6 — Persistence (extends SESSION-4)

CompuServe actively records commissions, updates mission standings at applicable
exit paths and provides honor-roll output. Austin removes these calls. Define
two persistent collections, regular and free-user, selected by the account
classification below. Each contains a game serial, per-ship commission and
recorded-destruction counters, two principal ranked lists and two retained
memorial lists, one of each per faction. Each list has ten record positions.
The record rules below describe ordinary successful storage paths. Missing
bindings and failed or partial I/O remain U-C-STATISTICS except for the explicitly
identified return and output behavior.

A standings record has account identity, captain name, ship name, date, score,
elapsed mission milliseconds, mission number and survival flag. Name fields
retain their original character encodings and padding for output. Memorial lists
can be displayed from existing data but the selected updater's branch for
inserting dead captains into them is commented out. Both surviving and dead
missions are candidates for the principal faction list. These observable records
do not require a particular filesystem or packed memory representation.

### Account classification and commissions

The account binding marks a session free-user if any of these conditions hold
on its project identifier, written here in octal: it is less than 70010; all
bits selected by mask 77000 are set; or its low three bits equal 3. Classification
does not perform payment processing. Its host identity source remains U-MONITOR.

After selecting a free ship, release admission exclusion and run the commission
update before clearing that ship's scores and marking it reserved. The update
retries statistics exclusion until successful, starts with an empty working
collection, and reads the regular collection if available. If the world's game
serial is zero, increment the loaded serial; copy the resulting serial to the
world. For a free-user commission, first write the regular collection, then load
the free-user collection and copy that world serial into it. Increment the
chosen ship's commission counter in the selected collection, attempt to persist
it, and release statistics exclusion.

Report the game serial and the chosen ship's mission number using the literal
pieces `"\r\nDECWAR game #"`, the serial, `"\r\n\r\nThis is mission #"`,
the counter, `" for the\r\n"`, and the long ship name. The disconnected path
has individual output guards rather than one guard around the entire sequence;
it does not establish an all-or-nothing transcript.

### Exit eligibility and ranking

At the selected main exit path, capture account/captain/ship identity and elapsed
commission time, set survival flag to −1 or to zero if the fatal-error indicator
is set, and select faction from the departing team. Call final POINTS, take its
actor total, then update standings before releasing the ship. U-FINAL-POINTS
still applies to that total. The flag passed to standings is determined by the
fatal-error indicator, not recomputed by testing the ship's hull or occupancy.

Return immediately if elapsed mission time is less than 1000 milliseconds.
Although the updater's comment says the score is too small, the tested argument
is elapsed time. This gate also prevents the destruction counter from advancing.
Otherwise retry statistics exclusion and load the selected collection. If the
survival flag is zero, increment the ship's recorded-destruction count. The first
recorded destruction has no consolation message; later ones report the number
of prior recorded destructions and the current commission count.

Scan the selected faction's ten principal positions in order. A null account
identity is an available position. Otherwise a strictly greater incoming score
qualifies for insertion before that record; a lower score continues scanning.
For equal scores, insertion before the old record occurs only if the old elapsed
time is strictly less than the incoming time. Thus this comparison favors a
longer incoming mission, contrary to the adjacent comment. Equal score and equal
time continue scanning.

Before inserting, inspect positions above the proposed position. If one has the
same account identity, reject this placement. Do not remove an older record
below the insertion point: this check alone does not enforce global uniqueness.
On insertion, shift lower positions downward, discard the last, and write the
new record. Retain the insertion position's unused record field; it is neither
a new score nor a displayed statistic. The mission number and survival flag
retain their separate low-18-bit representations. A zero account identity is
also the empty-record sentinel and cannot be treated as an ordinary occupied
account without a separately documented policy.

Persist an inserted record. If no position qualifies or a higher same-account
record prevents insertion, persist the collection only when this update recorded
a destruction, so that its counter is retained. Placement or failure messages
can precede a failed write; visible congratulations do not guarantee durability.
Release exclusion on completion. Routine file-open failures are not a license to
invent a successfully saved mission; their complete host effects remain
U-C-STATISTICS.

### Honor-roll selection and presentation

HONORROLL reads the session's selected collection without taking the updater's
statistics exclusion. Failure to open returns without a standings report. A
nonempty first position in any principal or memorial list enables the report.
Compare the first principal Federation and Empire scores; Federation is printed
first on a tie, otherwise the higher is first. Each faction's principal list
precedes its memorial list when present. This order does not compare memorial
scores or identify a winner for the current galaxy.

The report title is `The DECWAR Honor Roll`; its legend says
`(* indicates Missing in Action)`. The free-user collection adds
`(**** non-paying users ****)`. Federation principal and memorial sections use
the Emerald Star Cluster and Golden Galaxy Medal prose respectively; Empire
principal and memorial sections use service and Distinguished Service Cross
prose. Those headings remain active although new dead missions enter principal
lists. Exact paragraph bytes are in the source-linked presentation below and
remain pending integration into a CompuServe literal catalogue.

Scan all ten positions in a displayed list, skipping null account identities.
Do not stop at the first null. Each record emits a leading space for a nonzero
stored survival flag or `*` for zero, both six-character captain-name fields,
one space, the account's first component as an octal field of width six, `-`,
its second component in free octal format, then at least one padding space so
that the second component plus padding occupies six positions when it fits.
Emit credits as a decimal field of width six calculated by
`trunc((score + 320) / 1000)`, with both constants here in decimal. The source's
unprefixed rounding constant 500 is octal, meaning decimal 320. This is a
different scale from ordinary POINTS output and is not decimal-half rounding.

Wide records additionally emit a space, the ship name padded to ten characters,
mission duration rounded by `trunc((milliseconds + 30000) / 60000)` in a
five-character field, and the stored date as two-digit day/month/year fields.
The explicitly decimal time-rounding constant is 30000. Its interpretation is
independent of the assembly's default radix for unprefixed constants.

The width-selection instructions distinguish a positive argument from zero or
negative: positive forces wide records, while nonpositive uses terminal width
at least 80. The header independently includes its wide suffix for a nonpositive
argument and omits it for positive; the commented header width check is inactive.
The ordinary FORTRAN true argument is negative. Consequently a narrow terminal
can receive a wide header with narrow rows. Preserve this discrepancy.

A pending control flag stops at the source's list/section checks, is cleared at
the report's outer exit check, and prevents the second-collection pass. Otherwise
a free-user session with a nonzero report argument proceeds from the free-user
collection to the regular collection. Regular sessions print only the regular
collection. Full terminal control/failed-read behavior remains in the host limits.

**Evidence:** [C commission call](../../legacy/compuserve/fortran%201978/SETUP.FOR#L445),
[C exit update](../../legacy/compuserve/fortran%201978/DECWAR.FOR#L346),
[C statistics implementation](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5586),
[C record definitions](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L676),
[C account classification](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L3791),
[C ranking](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5694),
[C honor-roll reader](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5885),
[C row formatter](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L6001),
[Austin removed exit call](../../legacy/utexas/DECWAR.FOR#L302).

## C-7 — Privilege and synchronization (amends GRAM-13 and EXEC-9)

CompuServe's password command requires an exact password match and one of the
permitted host project identifiers: octal 70000, 337, 70006 or 70725. A failed
selection clears privilege and emits the unknown-command response, with help
text outside short output. Austin's corresponding routine removes the project
restriction and rejection output. The abstract account/privilege binding remains
U-MONITOR; these source identifiers are not an instruction to introduce accounts
into every future user interface.

CompuServe movement uses the source's per-board-word lock keys. Austin's public
lock maps requests to a common key and its unlock releases the session's locks.
The completed execution appendix must specify resulting interleavings and failed
attempt effects without requiring packed board storage from new implementations.

**Evidence:** [C PASWRD](../../legacy/compuserve/fortran%201978/PASWRD.FOR#L30),
[Austin PASWRD](../../legacy/utexas/DECWAR.FOR#L2626),
[C movement locks](../../legacy/compuserve/fortran%201978/MOVE.FOR#L131),
[Austin lock adapter](../../legacy/utexas/WARMAC.MAC#L3768).

## C-8 — Romulan changes (amends GAME-ROM-ACTION and GAME-RADIO)

At the first autonomous speech test, CompuServe uses `I(10)=1` where Austin
uses `I(5)=1`. At the later speech test, CompuServe uses `I(50)<=1` where Austin
uses `I(10)<=1`. Preserve the changed bounds and their positions in the random
sequence; they are not merely output-frequency settings.

Player TELL to ROMULAN has an additional CompuServe response/relocation path.
For a present Romulan it generates a response, preserves the existing recipient
set and tests `I(4)`. On result 1 it draws an offset `I(10)−5` and searches nearby
legal empty positions using the source's nested order. Austin skips ROMULAN
recipient tokens without invoking that exchange. Full CompuServe TELL parsing,
relocation bounds, duplicate-label source ambiguity and message effects still
require a dedicated clause before conformance is claimed.

**Evidence:** [C ROMDRV first test](../../legacy/compuserve/fortran%201978/ROMDRV.FOR#L64),
[C later test](../../legacy/compuserve/fortran%201978/ROMDRV.FOR#L123),
[Austin first test](../../legacy/utexas/DECWAR.FOR#L3259),
[Austin later test](../../legacy/utexas/DECWAR.FOR#L3306),
[C TELL](../../legacy/compuserve/fortran%201978/TELL.FOR#L54),
[Austin TELL](../../legacy/utexas/DECWAR.FOR#L3997).

## C-9 — Matters that are not established amendments

Both FORTRAN PARAM files set restart wait to zero, unlike the assembly value
120000; this is not a variant change. All 324 named message literals match, but
inline strings, macro-added newlines and complete transcripts require separate
comparison. Argument-copy changes need analysis of their alias effects.

**Evidence:** [C PARAM wait](../../legacy/compuserve/fortran%201978/PARAM.FOR#L50),
[Austin PARAM wait](../../legacy/utexas/PARAM.FOR#L30),
[documented source comparison](../legacy-comparison.md).
