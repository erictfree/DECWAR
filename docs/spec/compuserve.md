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
DOCUMENT/HONORROLL output and *ZAP behavior remain to be specified from their
active routines; inserting names alone does not complete these extensions.

**Evidence:** [C pregame table](../../legacy/compuserve/fortran%201978/SETUP.FOR#L505),
[Austin table](../../legacy/utexas/SETUP.FOR#L409).

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
exit paths and provides honor-roll output. Austin removes these calls. A complete
amendment must define record contents, mission eligibility, rankings and update
order abstractly; it must not mandate either a TOPS-10 disk layout or the current
port's word-file storage. These details remain pending. Shared POINTS formulas
alone do not imply that Austin has persistent standings.

**Evidence:** [C commission call](../../legacy/compuserve/fortran%201978/SETUP.FOR#L445),
[C exit update](../../legacy/compuserve/fortran%201978/DECWAR.FOR#L346),
[C statistics implementation](../../legacy/compuserve/fortran%201978/WARMAC.MAC#L5586),
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
