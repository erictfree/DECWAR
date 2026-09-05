# DECWAR language and behavior specification plan

Status: drafting and source review in progress; goal active. The deliverable is a reviewed draft specification,
not a claim that all historical behavior has been recovered.

## Authority and scope

The normative core describes the pinned Austin reconstruction at
`f78f2ec733999617e4281ba3ed967bff8cd5d8f8`. CompuServe appears only in an appendix
that amends identified core clauses. The supplied executable statements govern;
help text and comments are supporting evidence. The TypeScript port is useful
for finding questions and exercising examples, but is not the specification's
authority. No other DECWAR implementation supplies rules.

Define observable behavior without requiring a language, operating system,
memory layout or transport implementation. Preserve observable arithmetic,
alias effects, ordering and text even when their historical causes are machine
specific. Separate terminal conformance from abstract game semantics. Unresolved
compiler/monitor behavior remains explicitly unresolved. Current playable repairs
are a separate, nonhistorical policy record, never silently normative Austin rules.

## Deliverables

Files under this directory will use stable clause and example identifiers.
Normative statements will be separated from evidence and explanatory notes.

| Document | Content |
| --- | --- |
| README.md | Scope, reading order, revision, normative terminology and conformance claims. |
| lexical.md | Character repertoire, folding, tokens, numbers, abbreviations, separators and line editing/termination. |
| grammar.md | Grammar notation; command and subcommand productions; interactive continuations, defaults, cancellation and errors. |
| state.md | Abstract world/session state, identities, units, numeric domains, precision, truncation and visibility. |
| execution.md | Command acceptance and completion, intermediate effects, scheduling boundaries, time, shared-state ordering and interrupts. |
| session.md | Startup/configuration, initialization, admission, permissions, galaxy lifecycle, exit, persistence and reset. |
| gameplay.md | Movement, scans, combat, resources, repair, tractor beams, planets, bases, radio, Romulans and scoring. |
| randomness.md | Draw operations, ranges, state ownership, initialization, draw order and seeded reproducibility requirements. |
| terminal.md | Output messages, formatting, prompts, controls and application-byte behavior; distinguish transport bindings. |
| conformance.md | Claim boundaries, reproducible scenarios, initial conditions, inputs, expected state/output and error cases. |
| compuserve.md | Appendix of additions, removals and changed rules keyed to Austin clauses; unchanged clauses inherit core rules. |
| evidence.md | Clause-to-source references, physical lines/labels, corroborating tests/reference observations and review coverage. |
| unresolved.md | Specific open questions, affected clauses, available evidence and what would resolve each question; separate playable policies. |

## Work sequence and checkpoints

1. **Establish notation and coverage.** Inventory executable command tables,
   parser entry points, lifecycle paths, state domains and output assets directly
   from Austin. Create a coverage matrix distinguishing inventoried, drafted,
   source-reviewed and example-checked material. Define normative wording,
   grammar notation and the treatment of undefined or unresolved behavior.
2. **Specify input and state.** Derive lexical behavior before command grammar;
   document matching precedence and contextual parsing rather than assuming a
   conventional parser. Define units and numeric operations independently of
   physical storage. Trace observable aliases to abstract effects.
3. **Specify commands and transitions.** Work through every reachable command
   and interactive continuation. Each clause records valid forms, defaults,
   preconditions, ordered effects, time/resource costs, failure behavior and
   observable results. Cover startup and administrative paths as well as combat.
4. **Specify interactions.** Review timing, random draws, asynchronous messages,
   interrupts, death, disconnect, simultaneous actions and world rollover.
   Identify which ordering is mandated and which cannot be established. Do not
   replace uncertainty with the Node scheduler's behavior.
5. **Specify presentation and the variant appendix.** Define application output
   and terminal state. Derive CompuServe amendments from its own source and link
   each to the affected Austin clause. Keep transport choices and playable repairs
   separately identified.
6. **Create conformance scenarios and review.** Give deterministic initial states
   and explicit clock/random/event inputs where needed. Include normal, boundary,
   error and multi-session scenarios. Cross-check against source; use the port
   only as secondary evidence. Preserve disagreements as findings. Compare with
   existing native captures only within their recorded conditions and scope.
7. **Publish the reviewed draft.** Check coverage, citations, grammar references,
   examples and internal links; verify immutable archives. Add documentation-hub
   links, record results in WORK_LOG.md, and commit/push under the existing project
   publishing instruction. Do not change gameplay to make it match the draft.

## Completion criteria

- Every executable command-table entry is accounted for, including blank,
  inaccessible or inactive entries, without inventing user-visible commands.
- Every section above is drafted and source-reviewed, with a coverage matrix
  that exposes omissions instead of relying on page count or test count.
- Normative rules have traceable source evidence; derived conclusions are marked.
- Arithmetic, timing and randomness rules are precise enough to implement without
  importing TypeScript helpers or requiring PDP-10 storage structures.
- Representative conformance scenarios cover each command family and lifecycle
  boundary. Examples distinguish source-derived expectations from native runs.
- The CompuServe appendix is a consistent set of amendments to the Austin core.
- Unknowns and deliberate playable repairs have explicit identities and scope;
  no complete historical-parity claim is made while they remain unresolved.
- Documentation validation and source audits pass; a final report identifies
  coverage, remaining uncertainties and published revision.

## Working approach

Use High reasoning effort for source semantics, numeric behavior and concurrent
execution analysis. Medium is sufficient for organization and editorial cleanup.
Extra High is reserved for a concrete unresolved problem that warrants it.
Maintain progress and verification logs throughout; a checkpoint is not the end
of the goal. No new reference downloads, runtime changes or server restarts are
required by this plan.
