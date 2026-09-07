# Player command coverage

Austin defines 31 public game commands in
`legacy/utexas/DECWAR.FOR:437–471`. The two following table entries,
`*DEBUG` and `*PASSWORD`, are privileged host commands and are outside the
automated player's interface.

Coverage labels have narrow meanings:

- **automatic** — issued by an ordinary autonomous session or decision path;
- **supported** — exercised by the client or comparison tests but not selected
  as a recurring tactic;
- **planned** — retained in the competitive-player work queue with an explicit
  purpose and prerequisites still to implement;
- **manual** — intentionally left to a human because unattended use is not a
  game tactic.

| Command | Coverage | Role | Bot use |
| --- | --- | --- | --- |
| BASES | automatic | observe | Find friendly resupply points and known enemy bases. |
| BUILD | automatic | objective | Develop captured planets and create bases. |
| CAPTURE | automatic | objective | Capture fresh-confirmed neutral or unfortified enemy planets. |
| DAMAGES | automatic | observe | Choose repair, movement and weapon-safe actions. |
| DOCK | automatic | support | Resupply and repair beside a friendly installation. |
| ENERGY | planned | support | Transfer energy to a depleted teammate after identity and reserve checks. |
| GRIPE | manual | information | Human feedback/file-writing command; never issue from unattended policy. |
| HELP | supported | information | Protocol and source-help verification; no recurring tactical value. |
| IMPULSE | automatic | move | Move when warp is unavailable. |
| LIST | automatic | observe | Read ships, installations, ownership, builds and known locations. |
| MOVE | automatic | move | Execute one validated warp step. |
| NEWS | supported | information | Verify the selected source news file; no tactical value. |
| PHASERS | automatic | combat | Attack fresh-confirmed ships, bases and fortified planets. |
| PLANETS | planned | observe | Cross-check planet ownership/build reports and reduce broad LIST output. |
| POINTS | automatic | observe | Capture final team totals and score categories for evaluation. |
| QUIT | automatic | session | Release the vessel during normal bounded shutdown. |
| RADIO | planned | support | Control teammate communication and recover from ignored senders. |
| REPAIR | automatic | support | Restore damaged devices between engagements or when mobility is critical. |
| SCAN | automatic | observe | Obtain the fresh local firing and movement picture. |
| SET | automatic | session | Select deterministic prompt, output and coordinate modes at login. |
| SHIELDS | automatic | combat | Raise shields and replenish a defensive reserve. |
| SRSCAN | planned | observe | Use a smaller local picture when it lowers response cost without hiding needed threats. |
| STATUS | automatic | observe | Read position, condition, supplies, hull and shields. |
| SUMMARY | planned | observe | Obtain compact strategic counts when the captain does not need object rows. |
| TARGETS | automatic | observe | Cross-check every in-range ship firing location against SCAN. |
| TELL | planned | support | Coordinate roles, sightings, defense requests and assistance through ordinary radio. |
| TIME | supported | information | Measure displayed runtime when diagnosing pacing. |
| TORPEDOES | automatic | combat | Fire conservative one-torpedo bursts at weakened, fresh-confirmed ships. |
| TRACTOR | planned | support | Tow a consenting friendly ship with release and shield-state safeguards. |
| TYPE | supported | information | Verify input/output/game characteristics in parity scenarios. |
| USERS | supported | information | Verify captain visibility, vessel assignment and release. |

The executable catalog is [`commands.ts`](commands.ts). Generate the table or
JSON inventory with:

```sh
node experimental/automated-player/command-coverage.ts --format markdown
node experimental/automated-player/command-coverage.ts --format json
```

The next implementation order is TELL/RADIO role coordination, followed by
ENERGY and TRACTOR teammate support. PLANETS, SUMMARY
and SRSCAN should be added only when measured output or decision latency shows
an advantage over the existing LIST and SCAN cycle.
