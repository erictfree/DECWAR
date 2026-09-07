/**
 * Foundational DECWAR game vocabulary.
 *
 * The numeric aliases name semantic units. They use ordinary numbers here so
 * the specification does not prescribe a machine representation.
 */

export type Coordinate = number;
export type Energy = number;
export type Damage = number;
export type Percentage = number;
export type Stardate = number;
export type Points = number;

export interface Position {
  vertical: Coordinate;
  horizontal: Coordinate;
}

export const GALAXY_SIZE = 75;

export type Team = "FEDERATION" | "EMPIRE";

export const FEDERATION_SHIPS = [
  "EXCALIBUR",
  "FARRAGUT",
  "INTREPID",
  "LEXINGTON",
  "NIMITZ",
  "SAVANNAH",
  "TRENTON",
  "VULCAN",
  "YORKTOWN",
] as const;

export const EMPIRE_SHIPS = [
  "BUZZARD",
  "COBRA",
  "DEMON",
  "GOBLIN",
  "HAWK",
  "JACKAL",
  "MANTA",
  "PANTHER",
  "WOLF",
] as const;

export type FederationShipName = (typeof FEDERATION_SHIPS)[number];
export type EmpireShipName = (typeof EMPIRE_SHIPS)[number];
export type ShipName = FederationShipName | EmpireShipName;

export function teamOf(name: ShipName): Team {
  return FEDERATION_SHIPS.some((ship) => ship === name)
    ? "FEDERATION"
    : "EMPIRE";
}

/** A captain name identifies a participant within one running game. */
export type Captain = string;

export type ShipLifecycle =
  | { phase: "AVAILABLE" }
  | { phase: "COMMISSIONED"; captain: Captain }
  | { phase: "DESTROYED"; captain: Captain };

export type AlertCondition = "GREEN" | "YELLOW" | "RED";
export type ShieldMode = "UP" | "DOWN";

export type Device =
  | "SHIELDS"
  | "WARP_ENGINES"
  | "IMPULSE_ENGINES"
  | "LIFE_SUPPORT"
  | "TORPEDO_TUBES"
  | "PHASERS"
  | "COMPUTER"
  | "RADIO"
  | "TRACTOR_BEAM";

export type DeviceDamage = Record<Device, Damage>;

export interface Shields {
  mode: ShieldMode;
  strength: Percentage;
}

export interface RadioState {
  enabled: boolean;
  gaggedShips: Set<ShipName>;
}

export interface Ship {
  name: ShipName;
  lifecycle: ShipLifecycle;
  position: Position | null;
  energy: Energy;
  hullDamage: Damage;
  deviceDamage: DeviceDamage;
  shields: Shields;
  torpedoes: number;
  /** Signed reserve; zero is not exhaustion. */
  lifeSupportReserve: number;
  condition: AlertCondition;
  docked: boolean;
  tractorLink: ShipName | null;
  radio: RadioState;
  stardate: Stardate;
  score: Score;
  pendingScore: Score;
}

export interface Base {
  team: Team;
  position: Position;
  strength: Percentage;
}

export interface Planet {
  position: Position;
  allegiance: Team | "NEUTRAL";
  construction: number;
}

export interface Romulan {
  position: Position;
  energy: Energy;
}

export type RomulanState =
  | { enabled: false }
  | { enabled: true; vessel: Romulan | null };

export type MessageSender = ShipName | "ROMULAN" | "SYSTEM";

export interface RadioMessage {
  sender: MessageSender;
  recipients: Set<ShipName>;
  pendingRecipients: Set<ShipName>;
  text: string;
}

export interface CommunicationState {
  messages: RadioMessage[];
}

export type ScoreCategory =
  | "ENEMY_DAMAGE"
  | "ENEMY_KILLS"
  | "BASE_DAMAGE"
  | "PLANET_CAPTURE"
  | "BASE_CONSTRUCTION"
  | "ROMULAN"
  | "STAR_DESTRUCTION"
  | "PLANET_DESTRUCTION";

export type Score = Record<ScoreCategory, Points>;

export interface TeamState {
  score: Score;
}

export type BlackHoleState =
  | { enabled: false }
  | { enabled: true; positions: Position[] };

export type StarPositions = Position[];

/**
 * Stars and black holes are identified by position because they do not carry
 * independent mutable state.
 */
export interface Galaxy {
  ships: Ship[];
  bases: Base[];
  planets: Planet[];
  stars: StarPositions;
  blackHoles: BlackHoleState;
  romulan: RomulanState;
  communication: CommunicationState;
  teams: Record<Team, TeamState>;
}
