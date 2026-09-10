export function romulanEligibility(previousTriggers: number, players: number) {
  if (!Number.isInteger(players) || players < 1 || !Number.isInteger(previousTriggers) || previousTriggers < 0)
    throw new RangeError("Player-triggered activity requires valid counts");
  const elapsedTriggers = previousTriggers + 1;
  return { elapsedTriggers, active: 2 * elapsedTriggers >= players,
    appearanceEligible: elapsedTriggers >= 3 * players };
}
