import type { ScoreCategory } from "./model.ts";
import { decimalField, integerField } from "./output.ts";
import { pointsAverage } from "./scoring.ts";

export interface PointsSubject {
  subject: "PERSONAL" | "FEDERATION" | "EMPIRE" | "ROMULANS";
  name?: string;
  score: Partial<Record<ScoreCategory, number>>;
  turns: number;
  admissions?: number;
}
const rows: [ScoreCategory, string, string, string][] = [
  ["ENEMY_DAMAGE", "Dam E's", "Damage to enemies", ""],
  ["ENEMY_KILLS", "E's dest", "Enemies destroyed", " ( 500)"],
  ["BASE_DAMAGE", "Dam B's", "Damage to bases", ""],
  ["PLANET_CAPTURE", "@'s capt", "Planets captured", " ( 100)"],
  ["BASE_CONSTRUCTION", "B's built", "Bases built", " (1000)"],
  ["ROMULAN", "Dam ??'s", "Damage to Romulans", " ( 500)"],
  ["STAR_DESTRUCTION", "*'s dest", "Stars destroyed", " ( -50)"],
  ["PLANET_DESTRUCTION", "@'s dest", "Planets destroyed", " (-100)"],
];

// Input is the resolved subject selection; not a replacement command parser.
export function pointsReport(input: PointsSubject[], length: "SHORT" | "MEDIUM" | "LONG"): string {
  const order = ["PERSONAL", "FEDERATION", "EMPIRE", "ROMULANS"];
  const subjects = [...input].sort((a, b) => order.indexOf(a.subject) - order.indexOf(b.subject));
  if (!subjects.length || new Set(subjects.map(s => s.subject)).size !== subjects.length)
    throw new RangeError("Expected a nonempty resolved subject set");
  const short = length === "SHORT", long = length === "LONG";
  const number = (n: number) => decimalField(n, 11, short);
  let out = "\n" + " ".repeat(short ? 13 : long ? 30 : 23);
  for (const s of subjects) {
    if (s.subject === "PERSONAL") {
      if (!s.name) throw new Error("Personal heading requires vessel name");
      out += " " + (s.name[0].toUpperCase() + s.name.slice(1).toLowerCase()).padEnd(10)
        + (short ? "" : "  ");
    } else out += ({ FEDERATION: "Federation", EMPIRE: "    Empire", ROMULANS: "  Romulans" }[s.subject])
      + (s.subject === "ROMULANS" ? "" : short ? " " : "   ");
  }
  out += "\n";
  for (const [category, compact, full, annotation] of rows) {
    if (!subjects.some(s => (s.score[category] ?? 0) !== 0)) continue;
    let label = short ? compact.padEnd(9) : full.padEnd(category === "ROMULAN" ? 17 : 18);
    if (long) label = annotation ? label + annotation : label.padEnd(25);
    out += label + subjects.map(s => number(s.score[category] ?? 0)).join("") + "\n";
  }
  const totals = subjects.map(s => rows.reduce((sum, [category]) => sum + (s.score[category] ?? 0), 0));
  const label = (compact: string, full: string) => short ? compact.padEnd(9) : full.padEnd(long ? 25 : 18);
  out += "\n" + label("Tot Pts", "Total points:") + totals.map(number).join("") + "\n";
  if (subjects.some(s => s.subject !== "PERSONAL")) {
    const width = short ? 11 : 13;
    out += "\n" + (short ? "# of shps" : "Number of ships:".padEnd(long ? 23 : 16));
    out += subjects.map(s => s.subject === "PERSONAL" ? " ".repeat(width)
      : integerField(s.admissions!, width)).join("");
    out += "\n" + label("Pts / Pl", "Pts. / player:");
    out += subjects.map((s, i) => s.subject === "PERSONAL" ? " ".repeat(width)
      : number(pointsAverage(totals[i], s.admissions!))).join("");
  }
  out += "\n" + label("Pts / SD", "Pts. / stardate:")
    + subjects.map((s, i) => number(pointsAverage(totals[i], s.turns))).join("") + "\n";
  return out;
}
