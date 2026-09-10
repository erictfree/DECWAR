# SHIELDS research

Prompt-state follow-up: DECWAR.FOR:3745–3766 distinguishes the initial action
and amount positions, a prompted action with optional amount, and the first
token of a separately prompted amount. Noninteger input in the latter returns,
not retries or action reselection. All prompts use GTKN without clearing pending
slash segments (WARMAC.MAC:1386–1407). Section7.11 now defines those states and
six unchanged-state interaction cases, including decline after an exact1000
request. These source-derived traces do not adopt transfer quantization or
trailing-token policy and do not claim original-executable verification.

Evidence for the partial Section 7.11 entry. The preserved Austin
`DECWAR.FOR:3739–3803` defines the operation.

- The operation begins with a newline. An absent or unrecognized action
  prompts repeatedly; an empty action response cancels.
- TRANSFER accepts an integer with the action or prompts for it. A noninteger
  response to the amount prompt returns without transfer.
- Positive amounts move ship energy into shields; negative amounts move it
  back. Full shields correspond to 2500 displayed energy units.
- The positive amount is capped by shield capacity before comparison with
  available ship energy. An amount greater than or equal to that energy asks
  for confirmation; YES permits execution without an available-energy cap.
- Withdrawal is limited by shield reserves and the ship's 5000-unit capacity.
- The source rounds the shield increment toward zero to tenths of a percentage
  point, but deducts the unrounded transfer from ship energy. For example,
  a one-unit deposit adds no shield strength. This is C-015, not an approved
  abstract arithmetic rule.
- A transfer leaving no shield strength lowers shields. Transfer sets the
  condition to YELLOW below 1000 ship energy and GREEN otherwise.
- UP rejects shield damage strictly greater than the critical threshold.
  Otherwise it raises shields, charges 100 energy with a zero floor, reports
  success, releases a tractor link, then reports exhaustion if energy is zero.
  It does not first check whether shields are already up.
- DOWN lowers shields and reports success without a damage check.

Additional checks: PARAM.FOR:28 sets the critical threshold to 300 displayed
damage units. The dispatcher at DECWAR.FOR:160–164 returns directly to command
acquisition, bypassing turn completion. MSG.MAC:280–289 supplies the action,
transfer, confirmation, success, and failure text used in the entry. These
messages do not select verbosity alternatives in SHIELD.

Still verify tractor-release notification delivery and downstream treatment of
confirmed energy overdraw. The local routine alone does not establish a
complete command outcome. ENERGY research begins at DECWAR.FOR:1009–1082:
strict sender reserve, adjacency, 90-percent transfer, receiver capacity,
and recipient notification all need independent specification.

UP/DOWN integration: the companion now applies the damage check, mode/energy
changes, shared reciprocal tractor release and immediate output in order.
Three tests cover damage300 versus300.1, exhaustion after notice creation,
repeated UP charging, and damage-independent DOWN retaining a link. Unrelated
ship properties and the partner's energy remain unchanged. The intermediate
steps represent notice creation, not immediate delivery or transport storage.
Final POINTS/release after zero energy remains the acquisition operation, not
an invented SHIELD subroutine step. Transfer arithmetic and prompted input are
outside these tests. Log: `logs/spec1.0-nova/shield-mode-check.log`.

Transfer discussion follow-up: SHIELD:3767–3786 gives the ordered capacity cap,
confirmation, reserve/capacity withdrawal limits, truncated strength increment
and unrounded energy debit. Section7.11 now states this candidate interpretation
in displayed units and enumerates deposits, withdrawals and overdraw. In
particular, SENRGY=-10 makes integer SENRGY/25 zero, so a one-unit withdrawal
increases ship energy without reducing strength when reserves permit it.
The table is verified arithmetically in
`logs/spec1.0-nova/transfer-discussion-check.log`, not adopted as a resolved
Austin Core policy or claimed as an original-executable transcript.
