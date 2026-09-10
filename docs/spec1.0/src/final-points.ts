import type { Galaxy, ShipName } from "./model.ts";
import { pointsReport } from "./points-report.ts";
import type { PointsSubject } from "./points-report.ts";

// Section 9.3. Report before release; no score commitment or state changes.
export function finalPoints(galaxy: Pick<Galaxy, "ships" | "teams" | "romulan">,
  departing: ShipName, length: "SHORT" | "MEDIUM" | "LONG"): string {
  const ship = galaxy.ships.find(s => s.name === departing);
  if (!ship || ship.lifecycle.phase === "AVAILABLE") throw new Error("current commission required");
  const subjects: PointsSubject[] = [{ subject: "PERSONAL", name: ship.name,
    score: ship.score, turns: ship.stardate }];
  for (const team of ["FEDERATION", "EMPIRE"] as const) {
    const state = galaxy.teams[team];
    subjects.push({ subject: team, score: state.score,
      turns: state.completedTurns, admissions: state.admissions });
  }
  if (galaxy.romulan.enabled) {
    const stats = galaxy.romulan.statistics;
    subjects.push({ subject: "ROMULANS", score: stats.score,
      turns: stats.activityCount, admissions: stats.appearances });
  }
  return pointsReport(subjects, length);
}
