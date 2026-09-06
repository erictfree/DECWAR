# Documentation standard

Documentation should let a newcomer understand the game and let a maintainer
trace its behavior to source. Public pages speak directly about the project,
its contributors and its decisions. Attribution belongs in the README and source
provenance; conversational approval notes belong in the internal work record.

## Where information belongs

| Document | Responsibility |
| --- | --- |
| README.md | Game introduction, attribution, quick start and routes into the documentation. Keep implementation chronology out of the introduction. |
| docs/running.md | Verified launch commands, variants, client behavior, persistence and shutdown. Distinguish default ports from a particular running instance. |
| docs/status.md | Current capabilities, dated verification and remaining limits. Replace stale status rather than appending competing “current” sections. |
| docs/architecture.md | How the original model is represented and why the host uses modern mechanisms. |
| docs/playable-decisions.md | Each intentional gameplay repair, source trigger, selected behavior, affected variants and rationale. |
| docs/austin-implementation.md | Austin-specific changes and their implementation destinations. |
| docs/decisions.md and docs/compatibility.md | Detailed source-linked decisions, ambiguities and evidence. Preserve decision IDs; identify later resolutions or superseding summaries. |
| legacy/README.md and reference manifests | Source provenance, licenses and build-artifact identity. Do not edit immutable source/reference bytes to improve prose. |
| WORK_LOG.md and docs/history | Chronological implementation and verification records. Local process IDs, paths and past checkpoints are historical, not operating instructions. |

## Describe a change precisely

For a behavior change, record:

1. **Source:** variant, file, physical line or label, and the relevant expression,
   branch, calling convention or output bytes.
2. **Behavior:** what is preserved or changed, including scaling, truncation,
   side effects, aliases, random draws and timing when relevant.
3. **Reason:** why a different host mechanism or playable repair is necessary.
   A more convenient implementation alone does not justify changed game rules.
4. **Implementation:** the connected runtime path and any remaining dependency.
5. **Evidence:** focused tests or reference observations, their scope, and what
   remains unverified. Link to reproducible checks or preserved artifacts.

Use modern terminology to explain old techniques without silently replacing
those techniques. For example, explain scaled integer arithmetic and retain its
operations; do not describe extra zeros as additional machine-word precision.
Distinguish source quirks from new bugs introduced by the port.

## Keep claims proportional to evidence

- An inventory means files and symbols have been located, not fully understood.
- A component test verifies that component under its selected policies.
- A session test proves an exercised connected path, not every possible input.
- A native transcript records an observed reference run. Differential verification
  requires a comparison with defined matching conditions and outcomes.
- “Playable” and “historically equivalent” are separate claims. `--strict` is a
  diagnostic profile, not proof of exact parity.
- Identify reconstruction provenance and compiler version differences. Do not
  introduce game-logic authority from unrelated histories or implementations.

## Write the language specification for implementers

The normative specification should help an implementer determine valid DECWAR
behavior. Introduce each concept in plain language before presenting notation.
Define terms and abstract data types before use, and place a rule where a reader
first needs it. Prefer one direct sentence to several qualifications. Use
pseudocode when prose would obscure a state transition.

Keep only facts needed to define accepted input, game state, state transitions
or observable behavior. Put source history, representation details, derivations,
review notes and unresolved research in companion documents. Keep necessary edge
cases with the operation they affect. If a paragraph does not help determine
valid DECWAR behavior, remove it, shorten it or move it outside the normative
book.

Use valid TypeScript syntax for data records, unions and collection shapes.
State semantic restrictions that TypeScript does not express clearly—such as
opaque identity, units, numeric ranges and total-map requirements—in nearby
prose. Do not add branding helpers or runtime representations merely to make the
TypeScript compiler enforce those restrictions. Use separately identified
pseudocode for queries, operations, contracts and transitions. A notation block
must never be described as TypeScript unless it is valid TypeScript.

## Review before publishing

Check defaults, commands, variant names, credits and license scope against the
repository. Verify relative links and source locations, remove stale status
claims from current guides, and retain relevant history separately. Label test
counts and reference runs with their checkpoint/date; avoid live PIDs or a local
port assignment as release facts. Record meaningful review results in WORK_LOG.md.

Generated documentation is changed through its generator and checked with
`npm run audit:check`. Source archives and preserved reference artifacts are
never reformatted. Documentation-only edits need appropriate link/source checks;
rerun gameplay tests when executable changes or unresolved concerns warrant it.
