# TIME and USERS boundary review

USERS row-format review, 2026-09-08: WARMAC.MAC:2193–2243 pads the
ship field to ten columns, emits two six-character name fields, then speed
(decimal width four), account (project octal expandable width six, comma,
programmer octal right-padded to six), six terminal characters, and job
(decimal width three). OSIX at 1830–1840 emits exactly six characters;
ONUM at 1888–1924 supplies numeric padding and overflow. DECWAR.FOR:4623–4627
adds the privileged location suffix and row newline. Section 7.24 now gives
the field composition and a supplied-field ordinary report example, separately
from its unadopted core layout. This closes the missing historical-format
explanation, not the C-011 column or admission-name choice. No host fields
were added to the ADTs and no original-executable transcript is claimed.

USERS selection follow-up: DECWAR.FOR:4613–4627 iterates the fixed roster,
emits the faction divider before eligibility, and tests only ALIVE for row
inclusion. It does not test sender faction, sensor distance or radio state.
Section7.24 now isolates this settled selection contract from the unresolved
host-column decision and supplies six population/lifecycle scenarios. These
are source-derived row-order cases, not literal six-column transcript tests.

TIME at DECWAR.FOR:4066–4084 orders five labels, omitting ship elapsed and ship
processor time when WHO is zero. MSG.MAC:330–339 supplies the labels. OTIM/O2D
at WARMAC.MAC:1740–1769 divides milliseconds into hours, minutes and seconds,
dropping subseconds and emitting two character positions per component. The
document's numeric format is restricted to nonnegative values below 100 hours;
negative and oversized values are not silently assigned a modern format.

ETIM at WARMAC.MAC:3350–3370 subtracts the start clock and adjusts by one day
outside the inclusive ±12-hour interval. It is not an arbitrary-duration age
clock. Section 7.23 records this collision and a core-only field proposal without
adopting monotonic time, a time zone or substitute processor metrics.

USERS at DECWAR.FOR:4600–4634 emits its separator before testing the first Empire
ship's ALIVE value. Thus the separator appears with no players too. Only long
output gets the header; the commented two-/four-field branches do not execute.
MSG.MAC:375 provides the ordinary six-column header. STAT at WARMAC.MAC:2187–2254
prints the six fields. Section 7.24 retains this evidence and proposes a separate
two-column core layout, explicitly not adopted. Its candidate uses the ADT's
player name rather than importing packed host account or terminal values.

Source/data and ordinary-range arithmetic checks:
`logs/spec1.0-nova/time-users-check.log`. No historical full-output execution,
host extension or clock implementation is claimed.
# Historical TIME presentation checks, 2026-09-08

DECWAR.FOR4066–4083 selects the five fields, omits commissioning fields before
play and ends with CRLF. MSG.MAC330–339 supplies labels including their leading
newlines. WARMAC.MAC1747–1765 divides elapsed milliseconds into hours, minutes
and seconds, then writes two character positions per component. The companion
uses supplied seconds in the nonnegative, below-100-hour domain and verifies
complete in-game/pre-game reports. Values beyond that domain remain guarded;
no clock source, time zone, or Austin Core field selection is adopted. A
25-hour supplied duration tests rendering only, not ETIM's clock calculation.
Log: `logs/spec1.0-nova/time-report-check.log`.
