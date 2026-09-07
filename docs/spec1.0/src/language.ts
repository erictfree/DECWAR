/**
 * The top-level semantic shape of DECWAR.
 *
 * These declarations say nothing about processes, threads, sockets, storage,
 * polling, or timers. Later clauses define when each autonomous operation is
 * eligible and how it is ordered relative to player commands.
 */

import type { Captain, Galaxy } from "./model.ts";

export type { Galaxy } from "./model.ts";

export interface PlayerInput {
  kind: "PLAYER_INPUT";
  captain: Captain;
  text: string;
}

export type AutonomousProcess =
  | "ROMULAN_ACTIVITY"
  | "SHIP_MAINTENANCE"
  | "BASE_REBUILDING"
  | "COMBAT_DELIVERY"
  | "GALAXY_LIFECYCLE";

export interface AutonomousTrigger {
  kind: "AUTONOMOUS_TRIGGER";
  process: AutonomousProcess;
}

export type Invocation = PlayerInput | AutonomousTrigger;

/**
 * Output emissions are ordered. Each emission has already resolved its
 * audience; transport and terminal encoding are outside the game language.
 */
export interface OutputEmission {
  recipients: readonly Captain[];
  text: string;
}

export interface StepResult {
  state: Galaxy;
  output: readonly OutputEmission[];
}

/**
 * A conforming implementation realizes this semantic relation. Detailed rules
 * may be nondeterministic where the specification explicitly requests a draw.
 */
export type GameStep = (
  before: Galaxy,
  invocation: Invocation,
) => StepResult;
