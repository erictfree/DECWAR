// Section 10.9. Inputs are already selected and formatted in game order.
// This companion does not parse groups or decide visibility/discovery.
interface CategoryOutput {
  detailRows: string[];
  summaryLines: string[];
}

interface AggregateOutput {
  romulanDetail?: string;
  romulanSummary?: string;
  ships?: CategoryOutput;
  bases?: CategoryOutput;
  planets?: CategoryOutput;
  targetSummary?: string;
}

export function aggregateReport(report: AggregateOutput, targets: boolean): string {
  let output = "";
  if (report.romulanDetail) output += "\n" + report.romulanDetail;
  if (report.romulanSummary) output += "\n" + report.romulanSummary;
  for (const category of [report.ships, report.bases, report.planets]) {
    if (!category) continue;
    output += "\n" + category.detailRows.join("");
    if (!targets) output += "\n" + category.summaryLines.join("");
  }
  if (targets && report.targetSummary) output += "\n" + report.targetSummary;
  return output;
}

export function reportOutput(
  immediateOutput: string[], aggregate: AggregateOutput, targets: boolean,
  aborted: boolean,
): string {
  return "\n" + immediateOutput.join("")
    + (aborted ? "" : aggregateReport(aggregate, targets));
}
