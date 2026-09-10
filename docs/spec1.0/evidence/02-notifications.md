# Notification data

Selected consumption companion: Section9.5 now explicitly separates one-copy
render/filter/removal from occurrence selection. Tests retain another recipient
and original audience, retire a filtered base notice, and reject delivery to a
nonpending recipient. Release discard calls removal without rendering. This
checks a selected occurrence, not global scheduling, interruption atomicity,
recommissioning or the unadopted C-023 order/loss policy. Log:
logs/spec1.0-nova/notification-consumption-check.log.

Typed rendering companion: notification-output.ts projects NotificationFacts
into the existing Section10 formatters, deriving names and device labels from
semantic identities rather than storing rendered strings. Three composition
tests cover non-hit categories, base delivery filtering including the exact300
threshold, and target-only device detail with radio off/gagging. The companion
does not accept a live source/target Galaxy, select recipients, consume events,
or choose C-023 ordering. It guards the distinction between typed event facts
and presentation without claiming all output combinations or producer snapshots
are verified. Log: logs/spec1.0-nova/typed-notification-check.log.

Torpedo spatial snapshot closure: DECWAR.FOR:4353–4357 sets VTO/HTO to the
impact, invokes TORDAM, then selects recipients with the original IVC/IHC.
JUMP:1314–1320 replaces VTO/HTO on successful displacement without changing
the impact coordinates. Section10.5 now gives two boundary observers proving
why reported destination cannot substitute for selection center. The model
retains the selected audience, so no redundant impact field is needed solely
to rerun recipient selection at delivery. This does not resolve C-018's choice
of displacement destination or exceptional nova producer facts.

Invariant follow-up: Section2 now makes cross-field constraints explicit for
the pending-notification collection: endpoint audiences, same-faction tractor
and energy participants, positive torpedo ordinals, target/device/emergency
compatibility and distinction between recorded objects and live occupancy.
These are consequences of the producing command contracts and release rules,
not a new delivery-order policy. Empty pending sets are removed at operation
boundaries; original audiences may retain departed names. No completeness claim
is made for every possible notification invariant or producer exception.

Appearance output: OUTHIT at DECWAR.FOR:2575–2579 emits the Romulan name with
a separating space, the word `detected` only for LONG, another space, and the
recorded source position with a line ending. The common LONG prefix occurs at
2411. MSG.MAC:179 supplies `detected`. Section10.6 and the appearance companion
cover all verbosity forms and relative/both coordinates; the compact double
space is intentional. No live Romulan lookup or radio filter occurs in this
output branch. Recipient selection/scheduling are separate from this check.

Critical amount closure: DECWAR.FOR:4131–4137 halves initial damage, adds it
to the chosen device and records that increment in CRITDM before the separate
hull random adjustment. OUTHIT:2503–2513 prints CRITDM, not SHPDAM. Section2
and10.7 now explicitly distinguish increment, accumulated total and repaired
total. A companion case checks80+360=440, later410, with report360; it checks
recording/rendering arithmetic, not a complete critical-hit command transaction.

The declarations in Section2 retain semantic facts required by the command
and output rules, not historical notification slots or packed fields.

- TRACTOR: DECWAR.FOR:4497–4510 changes reciprocal links and addresses notices
  to both endpoints. The pair records participation, not permanent towing roles.
- ENERGY_TRANSFER: Section7.12 and its source review distinguish delivered
  energy from sender debit; only the recipient receives the delayed notice.
- BASE_NOTICE and TORPEDO_OUTCOME: Section10.6 defines faction/position or
  shot ordinal/outcome/position as the complete variable output facts. The base
  need not survive until delivery; the report must not reference its live object.
- ROMULAN_APPEARANCE: ROMDRV at DECWAR.FOR:3253–3258 records the appearance
  position before later pursuit movement. The notice retains that position.

OUTHIT's event inventory at DECWAR.FOR:2389–2417 establishes these distinct
report categories; it does not justify importing its storage representation.
Recipient sets follow the producing rules, and Section9.5 separates recorded
facts from delivery-time presentation. C-023 still governs ordering and loss.
Hit facts now distinguish object-specific snapshots and explicit reported
damage, displacement, death, device detail and base-emergency state, matching
OUTHIT:2417–2548 and Section10.7. Star explosion/unaffected reports retain the
star position without a hit target (DECWAR.FOR:4314–4319). No rendered names,
display-width fields, numeric event codes or packed values enter the ADTs.
The formatter companion still takes its separate presentation inputs; producer
snapshot correctness is not established by adding these types. Type checks establish notation
consistency only, not completed producer/delivery behavior.
