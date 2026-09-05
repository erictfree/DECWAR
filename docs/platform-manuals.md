# CPU and compiler evidence

External references are limited to **CPU/compiler manuals**. DECWAR rules,
source control flow, random sequences and output come from each variant's
archive in `legacy/compuserve` or `legacy/utexas`. These manuals explain the
platform beneath that code.

The supplied CompuServe `DECWAR.MAP:1-3` identifies a `/KI` executable linked on
19-May-1982; routine entries identify FORTRAN `/KI`. It does not identify the
compiler version or provide the compiler-generated instruction stream. Thus a
documented FORTRAN V5 rule is evidence for a named compatibility policy, not
proof that this executable used exactly that policy.

The downloaded PDFs, their URLs, lengths and SHA-256 digests are recorded in
[platform-manuals.json](platform-manuals.json). Local cache files and rendered
pages are under `tmp/pdfs/`, outside the immutable source archive. Page numbers
below are printed numbers; PDF page numbers are one-based.

Unqualified WARMAC/POINTS line references below describe CompuServe. The
[Austin reference build](austin-build-evidence.md) used FORTRAN 6(1144); the
FORTRAN V5 manual below does not establish every behavior of that compiler.

## Processor arithmetic

Source: DEC, [DECsystem-10/DECSYSTEM-20 Processor Reference Manual, June 1982](https://ftpmirror.your.org/pub/misc/bitsavers/pdf/dec/pdp10/1982_ProcRefMan.pdf).

- **1-21–1-22 (PDF 27–28):** a single floating word has a sign, an excess-128
  eight-bit exponent and a 27-bit fraction. Negative values use whole-word two's
  complement. Normalized fractional magnitude is at least one half and below
  one; all-zero word represents zero. Malformed/unnormalized operands have
  additional hardware behavior and are not covered by our normalized codec.
- **2-28.5 (PDF 83), FSC:** scaling adjusts the exponent and normalizes.
  `WARMAC.MAC:2716-2753` supplies the concrete RAN algorithm; its nonnegative
  27-bit quotient followed by `FSC T0,200` represents exactly quotient / 2^27.
  `src/compat/ran-float36.ts` implements only that proven input domain, rather
  than guessing a general FSC instruction. Public RAN/IRAN tests share SEED.
- **2-19–2-20 (PDF 69–70), FMPR:** multiplication forms the double-length
  fraction, normalizes, rounds to the nearest single-word value with midpoint
  ties away from zero, then checks the exponent. An out-of-range exponent wraps
  modulo 256 and raises the documented flags; underflow also raises Floating
  Underflow. `src/compat/float-multiply36.ts` implements normalized operands
  and zero using integer arithmetic. It returns newly raised flags. It does
  not clear sticky CPU flags or choose monitor handling.
- `WARMAC.MAC:2762-2794` explicitly selects **FMPR** in PWR. Therefore
  `src/runtime/power.ts` can apply this instruction without guessing which
  instruction a FORTRAN compiler chose. It retains each original multiply,
  the recursive order, the actual exponent argument and stack operations.
  Its required fault callback runs after storing the wrapped result.
- **2-14–2-15 (PDF 64–65), IDIV:** a divide check leaves operands unchanged and
  raises flags. KI also checks the minimum integer divided by +1, unlike some
  later models. This does **not** resolve the FORTRAN/monitor response to a
  divide check. Existing `divide36` is a checked arithmetic helper, not a raw
  instruction emulator. In particular, POINTS zero-divisor handling is open.

The FSC and arithmetic pages were inspected as rendered images as well as
extracted text. `src/compat/float-arithmetic36.ts` also implements normalized
FADR/FSBR/FDVR, FLTR and FIX. Conversion evidence is printed pp. 2-27–2-28.1
(PDF 77–79): FLTR rounds as floating arithmetic does, whereas FIX truncates
toward zero and leaves its destination unchanged on an exponent check.

`src/runtime/rounded-numeric.ts` provides an explicitly selected source-order,
rounded-single compiler service. The caller supplies literal encoding, integer
arithmetic and exceptional continuation. Its test binding selects nearest
decimal literal conversion, wrapped integer add/multiply and checked integer
division. This does not establish the archived compiler's instruction choice,
expression reassociation or decimal-conversion algorithm. Default older tests
retain their rational policy; selected full-entry and main PHASERS tests now use
physical floating words throughout the exercised numeric expressions.

### Decimal command input is different from compiler literals

`WARMAC.MAC:1811-1848` explicitly uses FLTR, unrounded FDV and FAD, then
rounded FMPRI for SCALE. Printed pp. 2-21–2-23 (PDF 71–73) document the
unrounded instructions. `src/runtime/token-floating.ts` binds these operations
for ANUM's normal nonnegative accumulation; NXTT applies a negative sign with
the original MOVN after accumulation. Each fractional digit is separately
scaled and added. For example, input `1.25` becomes octal `201477777777`, one
low-order bit below the nearest compiler-literal representation `201500000000`.
Replacing this path with JavaScript parseFloat would change input semantics.

The unrounded helper deliberately supports normalized nonnegative operands.
The manual documents KI-specific signed alignment effects (p. 2-22, note 8)
and a signed FDV difference from KL/KS (p. 2-23). An integer-overflowed negative
accumulator followed by a decimal point is outside this helper's supported
domain, as are deliberately unnormalized operands. These remain explicit gaps,
not silently normalized or rejected DECWAR game inputs. Token SCALE faults store
the wrapped result before invoking the required trap handler.

## FORTRAN language and runtime

Source: DEC, [FORTRAN-10 Programmer's Reference, Version 5, January 1977](https://ftpmirror.your.org/pub/misc/bitsavers/pdf/dec/pdp10/TOPS10/AA-0944E-TB_FORTRAN-10_Programmers_Reference_Ver_5_Jan77.pdf).

- **9-4 (PDF 120):** logical tests inspect the sign: negative is true,
  nonnegative false. The two-label `IF(E) N1,N2` takes N1 for true and N2 for
  false. This documents the existing true-first test policy for this version.
- **9-6 (PDF 122):** DO computes its trip count once, with a minimum of one
  iteration. A private negative counter is incremented separately from the
  user-visible loop index. Changing the index in the body does not change the
  trip count. A modern `index <= limit` loop is not generally equivalent.
  Bounds/increment are evaluated only on entry. Index value after normal exit
  is documented as undefined, even though the operational description
  specifies an increment at the end of each cycle.
  `src/compat/fortran5-do.ts` now provides this named policy for non-overflowing
  INTEGER calculations. The composed POINTS fixture selects it for initialized
  loops, with separate frames for the switch loop and report loop. Tests show
  that an aliased index change can expose the next ship's physical score word
  on the eighth iteration. Private counter residue across procedure calls is
  not synthesized; final entry still requires its explicit unresolved policy.
- **9-8 (PDF 124):** entry into a DO range from outside its extended range is
  prohibited. POINTS final entry (`POINTS.FOR:28-60`, label 500 to terminal 600)
  bypasses initialization. The manual cannot supply a private counter value
  for this path. Existing explicit diagnostic continuation policies remain
  diagnostic. The playable profile now selects the explicitly documented
  [final-entry repair](playable-decisions.md); this does not resolve the compiler
  behavior.
- **Appendix C, C-2–C-3:** actual constants can be overwritten through dummy
  arguments, type mismatch is unchecked, and expressions may be rearranged
  outside parentheses even without global optimization. A universal
  left-to-right expression assumption is therefore not established.
- **3-3:** REAL constants are rounded to 27-bit precision. Our explicitly named
  nearest-decimal policy uses midpoint ties away from zero. The manual's general
  precision statement alone does not establish the original compiler's complete
  decimal conversion algorithm; the policy remains documented as a selection.
- **Appendix H, H-1 and H-5:** arithmetic/library errors are usually warnings
  and execution can continue. This alone does not specify the register fixup
  or custom DECWAR trap behavior for a particular arithmetic exception.

The logical-IF and DO-range pages were inspected as rendered images. Do not
apply version-dependent compiler rules as proven behavior of the archived
executable without recording that limitation.

## Remaining evidence gaps

`WARMAC.MAC:1158-1163` installs APRTRP and passes `1B19+1B22` to APRENB.
The processor instruction definitions do not establish the full monitor
UUO/Fortran-runtime dispatch for that mask. The runtime must not infer either
fatal failure or a fabricated zero result from a host exception. A supplied
compiled listing/runtime or an explicit compatibility decision may be needed
for undefined loop entry and version-dependent error behavior.
