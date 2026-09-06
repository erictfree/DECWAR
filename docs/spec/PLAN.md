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

Define the game’s syntax and meaning with modern abstract types and ordinary
arithmetic. The user explicitly superseded the earlier machine-compatibility
target for this specification: integer quirks, packed representations, overflow
and accidental cross-field effects must not become game rules. Small calculation
differences from removing these artifacts are acceptable. Do not add commands,
argument forms, new game mechanics or silent balance changes.

Record numerical normalization separately, with source references. Preserve
integer counts where the game quantity is discrete, such as torpedoes and grid
coordinates; do not confuse those with PDP-10 arithmetic artifacts. Existing
port and native-fidelity research remain separate from the language specification.

## Revised language-specification structure

The publication needs a structural rewrite, not merely removal of machine names.
Earlier chapters contain valuable source analysis but often describe internal
operations instead of language meaning. Retain that analysis as companion
research while rewriting the normative document around these layers:

1. **Abstract types and state:** named identities, records, enumerations, sets,
   sequences and quantities in game units. Use language-neutral typed records and readable pseudocode
   familiar to TypeScript readers, without importing JavaScript numeric or object
   semantics. No memory maps, packed fields, numeric object codes or aliases.
2. **Lexical syntax and grammar:** define complete productions and abbreviation
   resolution. Interactive continuations are syntax in their own right.
3. **Commands:** each command groups its production, defaults and prompts,
   preconditions, changes to abstract state, results, failure/cancellation effects,
   and game-time/resource consequences. Common semantic operations are defined
   once and named by their game meaning, not by historical routine names.
4. **World rules:** movement, combat, autonomous entities, time and multiplayer
   interactions describe events and state transitions independently of commands.
5. **Presentation:** player-visible responses and an exact terminal presentation
   appendix, separate from the core state-transition descriptions.
6. **Variants and conformance:** CompuServe amendments use the same abstract
   vocabulary. Examples pair command input and initial state with resulting
   state and observations. Historical causes stay in research notes.

The new `language-model.md` and `commands.md` establish that vocabulary and
command format. The book now includes that new model, lexical/grammar chapters, the first
converted commands, normalized examples and the initial variant appendix. The
older operational chapters remain outside the manifest as research. Continue
converting all remaining command families and world rules; this shorter draft
is not a claim that the rewrite is complete. Preserve source coverage during
the transition.

Use the legacy code to establish actual command forms and game mechanics, then
express those rules in the abstract model. Representation accidents belong in
research, not in the generalized language. Any proposed departure beyond the
authorized numerical normalization needs an explicit decision; do not invent
replacement gameplay while rewriting the prose.

## Deliverables

Files under this directory will use stable clause and example identifiers.
Normative statements will be separated from evidence and explanatory notes.
The assembled specification contains syntax, semantic rules, examples, source
citations and explicit limits. Detailed implementation analysis and publication
procedures remain companion material outside the book manifest. Derive rules
from the legacy implementations as thoroughly as needed; express their observable
consequences without prescribing how a new implementation realizes them.

| Document | Content |
| --- | --- |
| README.md | Scope, reading order, revision, terminology and conformance claims. |
| language-model.md | Abstract identities, records, quantities and visibility concepts. |
| lexical.md | Characters, folding, tokens, numbers, abbreviations, separators and editing. |
| grammar.md | Command productions, matching order and interactive continuations. |
| commands.md | Each command's syntax, preconditions, state changes, outputs and completion. |
| world-rules.md | Shared paths, towing, damage, scoring and installation transitions. |
| turns.md | Time, automatic repair, action accounting and command completion. |
| language-conformance.md | Initial conditions, inputs and expected abstract state changes. |
| variants.md | CompuServe amendments expressed in the same abstract vocabulary. |
| language-coverage.md | Conversion progress and remaining dependencies, outside the book. |
| NORMALIZATION.md | Numerical/representation decisions and source derivations, outside the book. |

Further chapters will cover complete world rules, sessions, randomness,
multiplayer ordering and response/terminal presentation. Add them to book.json
only after expressing their requirements in the abstract model. Earlier state.md,
execution.md, session.md, gameplay.md, randomness.md, terminal.md, conformance.md
and compuserve.md remain research inputs outside the manifest. The evidence and
unresolved records preserve source analysis; they are not extra normative clauses
of the generalized language.

## Work sequence and checkpoints

1. **Establish notation and coverage.** Inventory executable command tables,
   parser entry points, lifecycle paths, state domains and output assets directly
   from Austin. Create a coverage matrix distinguishing inventoried, drafted,
   source-reviewed and example-checked material. Define normative wording,
   grammar notation and the treatment of undefined or unresolved behavior.
2. **Specify input and state.** Derive lexical behavior before command grammar;
   document matching precedence and contextual parsing rather than assuming a
   conventional parser. Define units and numeric operations independently of
   physical storage. Exclude representation accidents; record the normalization rationale separately.
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
- The assembled document specifies syntax and meaning, without implementation
  recipes. Detailed historical derivations remain available in companion notes.
- Arithmetic, timing and randomness rules are precise enough to implement without
  importing TypeScript helpers or requiring PDP-10 storage structures.
- Representative conformance scenarios cover each command family and lifecycle
  boundary. Examples distinguish source-derived expectations from native runs.
- The CompuServe appendix is a consistent set of amendments to the Austin core.
- Unknowns, normalization decisions and separate playable repairs have explicit scope;
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

## Structural references

The GraphQL specification is a useful organizational reference: grammar, types,
validation, execution and responses, with abstract algorithms whose observable
results define conformance. ECMAScript’s algorithm conventions provide a second
reference for abstract operations. WebDriver illustrates command-by-command
preconditions, state changes and results. These references concern document
form only; none supplies DECWAR rules.

- [GraphQL notation and algorithms](https://spec.graphql.org/September2025/#sec-Algorithms)
- [ECMAScript algorithm conventions](https://tc39.es/ecma262/multipage/notational-conventions.html#sec-algorithm-conventions)
- [WebDriver commands](https://w3c.github.io/webdriver/#commands)
