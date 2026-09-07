// Compatibility facade during M2 extraction. These exports keep report
// parsing public while the Austin parser implementation remains single-sourced.
export {
  classifyTorpedoOutcome, distance, parseDevices, parseFriendlyBases, parseList,
  parseScan, parseStatus, parseTargets, parseTeamPoints,
} from '../automated-player/observations.ts';
export type {
  Cell, Devices, ListedObject, Position, Scan, ShipStatus, TeamPoints,
} from '../automated-player/observations.ts';
