// Austin public command inventory, in source table order.
// Source: legacy/utexas/DECWAR.FOR:437-471. The following *DEBUG and
// *PASSWORD entries are privileged host commands and are intentionally absent.
export type CommandCoverage = 'automatic' | 'supported' | 'planned' | 'manual';
export type PlayerCommand = {
  name: string;
  coverage: CommandCoverage;
  role: 'observe' | 'move' | 'combat' | 'objective' | 'support' | 'session' | 'information';
  use: string;
};

export const playerCommands = [
  { name: 'BASES', coverage: 'automatic', role: 'observe', use: 'Find friendly resupply points and known enemy bases.' },
  { name: 'BUILD', coverage: 'automatic', role: 'objective', use: 'Develop captured planets and create bases.' },
  { name: 'CAPTURE', coverage: 'automatic', role: 'objective', use: 'Capture fresh-confirmed neutral or unfortified enemy planets.' },
  { name: 'DAMAGES', coverage: 'automatic', role: 'observe', use: 'Choose repair, movement and weapon-safe actions.' },
  { name: 'DOCK', coverage: 'automatic', role: 'support', use: 'Resupply and repair beside a friendly installation.' },
  { name: 'ENERGY', coverage: 'planned', role: 'support', use: 'Transfer energy to a depleted teammate after identity and reserve checks.' },
  { name: 'GRIPE', coverage: 'manual', role: 'information', use: 'Human feedback/file-writing command; never issue from unattended policy.' },
  { name: 'HELP', coverage: 'supported', role: 'information', use: 'Protocol and source-help verification; no recurring tactical value.' },
  { name: 'IMPULSE', coverage: 'automatic', role: 'move', use: 'Move when warp is unavailable.' },
  { name: 'LIST', coverage: 'automatic', role: 'observe', use: 'Read ships, installations, ownership, builds and known locations.' },
  { name: 'MOVE', coverage: 'automatic', role: 'move', use: 'Execute one validated warp step.' },
  { name: 'NEWS', coverage: 'supported', role: 'information', use: 'Verify the selected source news file; no tactical value.' },
  { name: 'PHASERS', coverage: 'automatic', role: 'combat', use: 'Attack fresh-confirmed ships, bases and fortified planets.' },
  { name: 'PLANETS', coverage: 'planned', role: 'observe', use: 'Cross-check planet ownership/build reports and reduce broad LIST output.' },
  { name: 'POINTS', coverage: 'automatic', role: 'observe', use: 'Capture final team totals and score categories for evaluation.' },
  { name: 'QUIT', coverage: 'automatic', role: 'session', use: 'Release the vessel during normal bounded shutdown.' },
  { name: 'RADIO', coverage: 'planned', role: 'support', use: 'Control teammate communication and recover from ignored senders.' },
  { name: 'REPAIR', coverage: 'automatic', role: 'support', use: 'Restore damaged devices between engagements or when mobility is critical.' },
  { name: 'SCAN', coverage: 'automatic', role: 'observe', use: 'Obtain the fresh local firing and movement picture.' },
  { name: 'SET', coverage: 'automatic', role: 'session', use: 'Select deterministic prompt, output and coordinate modes at login.' },
  { name: 'SHIELDS', coverage: 'automatic', role: 'combat', use: 'Raise shields and replenish a defensive reserve.' },
  { name: 'SRSCAN', coverage: 'planned', role: 'observe', use: 'Use a smaller local picture when it lowers response cost without hiding needed threats.' },
  { name: 'STATUS', coverage: 'automatic', role: 'observe', use: 'Read position, condition, supplies, hull and shields.' },
  { name: 'SUMMARY', coverage: 'planned', role: 'observe', use: 'Obtain compact strategic counts when the captain does not need object rows.' },
  { name: 'TARGETS', coverage: 'automatic', role: 'observe', use: 'Cross-check every in-range ship firing location against SCAN.' },
  { name: 'TELL', coverage: 'planned', role: 'support', use: 'Coordinate roles, sightings, defense requests and assistance through ordinary radio.' },
  { name: 'TIME', coverage: 'supported', role: 'information', use: 'Measure displayed runtime when diagnosing pacing.' },
  { name: 'TORPEDOES', coverage: 'automatic', role: 'combat', use: 'Fire conservative one-torpedo bursts at weakened, fresh-confirmed ships.' },
  { name: 'TRACTOR', coverage: 'planned', role: 'support', use: 'Tow a consenting friendly ship with release and shield-state safeguards.' },
  { name: 'TYPE', coverage: 'supported', role: 'information', use: 'Verify input/output/game characteristics in parity scenarios.' },
  { name: 'USERS', coverage: 'supported', role: 'information', use: 'Verify captain visibility, vessel assignment and release.' },
] as const satisfies readonly PlayerCommand[];

export type PlayerCommandName = typeof playerCommands[number]['name'];
