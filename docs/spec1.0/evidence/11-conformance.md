# Initial conformance scenarios

Chapter11 gathers three cross-command scenarios with an explicit valid-roster
fixture. The fixture is not a commissioning or galaxy-initialization rule.
All commands in these scenarios use noncompletion routes established by
DECWAR.FOR:61–218 and Chapter9. No world trigger or unrelated event is injected.

- 11.2 composes SET preferences with selected STATUS reporting. Sources and
  field layouts are recorded in 07-preferences-and-reports.md. Changing SCANS
  does not select STATUS's output format; neither command writes ship state.
- 11.3 composes RADIO OFF/ON, TELL rejection/acceptance and ordinary message
  delivery. Sources and thresholds are recorded in 07-radio.md and 07-tell.md.
  Receiver state is established before each TELL: the scenario does not assume
  a command can be acquired ahead of an already pending delivery. The message
  uses short output at delivery and is removed after its only recipient.
- 11.4 composes a failed mixed LIST with a subsequent successful LIST. Sources
  are recorded in 07-galaxy-reports.md: group scanning precedes its direct
  output, aggregate output is deferred, and only aggregate port detail records
  discovery. The fixture uses a unique known position and no CLOSEST ties or
  disputed mixed-within-direct-group syntax.

test/conformance-sequences.test.ts verifies the specified output and compares
the resulting entire Galaxy with the expected fixture. It now includes segment
tokenization of the written inputs using the Chapter3 working productions.
Command recognition now uses the complete ordinary vocabulary; selection of
each scenario's semantic operation remains fixture-directed. This is not a general grammar recognizer,
input-echo, prompt or scheduler test. See 03-lexical-companion.md.
Manual array insertion/removal in the radio case composes the documented
message lifecycle and is not an independent test of a runtime dispatcher.
These checks are not original-executable differential verification or proof
that all command semantics are complete.

The PDF input list includes Chapter11 for the next requested build; no PDF was
generated. Check log: logs/spec1.0-nova/conformance-sequences-check.log.

Section11.5 extends the fixture through capture and four construction stages,
using CAPTUR:605–668, BUILD:523–581 and the completion/acquisition rules in
evidence/09-completion.md. The final conversion is explicitly outside this
scenario, not implicitly made atomic. The two-player cadence triggers world
activity on completions two and four; the only enemy base is out of range of
the triggering player's faction and the captured planet is friendly. The
arithmetic/output companion check is capture-build-trace-check.log. This trace
is not backed by a complete executable CAPTURE/BUILD dispatcher; that remains
a distinct completion gap.
