// Section 7.23 historical presentation evidence, not adopted Austin Core clocks.
// Values are supplied elapsed seconds, not host APIs or Galaxy properties.
export function historicalTimeReport(values: {
  gameElapsed: number;
  commission: { elapsed: number; processor: number } | null;
  sessionProcessor: number;
  timeOfDay: number;
}): string {
  const duration = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0 || seconds >= 360000) {
      throw new Error("signed and 100-hour TIME rendering remain under review");
    }
    const whole = Math.floor(seconds);
    return [Math.floor(whole / 3600), Math.floor(whole / 60) % 60, whole % 60]
      .map(n => String(n).padStart(2, "0")).join(":");
  };
  let output = "\nGame's elapsed time:  " + duration(values.gameElapsed);
  if (values.commission) {
    output += "\nShip's elapsed time:  " + duration(values.commission.elapsed);
    output += "\nRun time in game:     " + duration(values.commission.processor);
  }
  output += "\nJob's total run time: " + duration(values.sessionProcessor);
  output += "\nCurrent time of day:  " + duration(values.timeOfDay);
  return output + "\n";
}
