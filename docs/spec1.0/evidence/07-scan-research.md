# Scan research checkpoint

Austin DECWAR.FOR:3515–3618 defines SCAN/SRSCAN. Section 7.9 now records the
working semantic entry. Its default-radius and interruption questions remain
unresolved. Source findings:

- Defaults begin at KRANGE (10) and 7; a terminal-width calculation reduces
  all four default extents. This is C-014, requiring a purity/character decision.
- Explicit one-number ranges set all extents; a second sets horizontal extents.
  Ordinary negative extents are clipped to zero, not rejected.
- Direction modifiers remove the opposite half; CORNER requires two signed
  extents. Each directional extent is clamped to 0–10, then galaxy bounds apply.
- All planets and active enemy bases within Chebyshev radius 10 are marked
  known to the issuing faction, independently of the displayed rectangle.
  WARNING marks enemy-planet and enemy-base danger areas using radii 2 and 4.
- Planet and Base now have `knownTo: Set<Team>`, abstracting discovered factions.
  DECWAR.FOR:565 transfers knowledge on conversion; 1786–1790 and 1935–1945
  use knowledge for reports. Initialization remains a separate review.
- WARMAC.MAC:2351–2527 (SETSCN, MARK, SHWSCN) supplies sector symbols,
  empty-only warning replacement, row order and coordinate labels.
  O2DB at 1815–1824 gives two-character coordinates with leading spaces.
- The short one-column label loop can print a label beyond the rectangle;
  interruption can stop row output. Both remain explicit review notes.

This is a research checkpoint, not a complete specification of scans or proof
of historical execution equivalence.

## Explicit-range and output checks

Added scan companions and three focused tests for explicit bounds, the worked
five-by-five long grid, and discovery/warning behavior. Rechecked SHWSCN/LABL
(WARMAC.MAC:2477–2527): no trailing separator after the final horizontal label;
rows descend vertically; short labels advance by three columns. MARK preserves
nonempty symbols, including blank black holes. A test puts an enemy planet
outside the displayed row, verifies its warning reach into the row, and checks
that a star and black hole remain unchanged. Discovery tests include distance
ten on both axes and exclusion at eleven.

The bounds helper uses supplied numeric ranges and does not choose defaults.
The renderer takes an already resolved sector symbol and refuses the unresolved
one-column short-label case. These checks do not establish parser conformance,
temporary concealment, default-width policy or output interruption. The scan
knowledge helper expects the active base collection, as defined by Galaxy.bases.

Explicit input follow-up: SCAN at DECWAR.FOR:3527–3591 removes only a final
WARNING, recognizes one leading direction, requires integer ranges and rejects
extra input before discovery. CORNER requires two numbers. `scanRequest` now
connects typed operands to scanBounds; the worked-grid test uses that path.
Omitted ranges return a distinct unresolved-default result rather than choosing
a width policy. New checks cover warning placement, negative CORNER values,
integer token classes, excess operands and explicit zero. These do not verify
raw lexical input, narrow short labels or interruption.
Log: logs/spec1.0-nova/scan-input-check.log.

SHWSCN at WARMAC.MAC:2483–2506 checks interruption after a complete row and
returns before its normal bottom-label call, including when the completed row
is the last. The renderer now takes an optional completed-row interruption
checkpoint; tests verify prefixes, missing footer and preserved earlier
discovery. LABL at 2507–2530 emits its initial label unconditionally, producing
Hmin+1 even for a one-column short scan. The chapter shows that output and
two alternatives without selecting a policy; the existing narrow-label guard
remains. Log: logs/spec1.0-nova/scan-interruption-check.log.
