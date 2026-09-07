import type { Team } from './client.ts';
import { fleetSymbols, positionKey, type Position, type Scan } from './observations.ts';

// Tactical exclusion corridor, NOT an emulation of CHECK or a hit predictor.
// Austin DECWAR.FOR:4289-4307: launch drift is at most .1 + .05 (damage)
// + .05 (full raised shields), and travel can reach ten major-axis sectors.
// CHECK:699-760 adds drift each step; CHKPNT:762-772 can inspect two cells.
// Use a wider .25-per-step allowance plus one whole cell for cell selection
// and arithmetic margin. All calculations below are small exact integers.
// Include space beyond the target: the target can move or the torpedo can miss.
// Do not clip the corridor at an observed blocker that could disappear.
export function torpedoCorridor(from: Position, target: Position): Position[] {
  const valid = (p: Position) => [p.v, p.h].every(n => Number.isInteger(n) && n >= 1 && n <= 75);
  if (!valid(from) || !valid(target)) return [];
  const dv = target.v - from.v, dh = target.h - from.h;
  const vMajor = Math.abs(dv) >= Math.abs(dh);
  const major = Math.abs(vMajor ? dv : dh), minor = vMajor ? dh : dv;
  if (major === 0 || major > 10) return [];
  const direction = Math.sign(vMajor ? dv : dh);
  const result: Position[] = [];
  for (let step = 1; step <= 10; step++) {
    const axis = (vMajor ? from.v : from.h) + direction * step;
    if (axis < 1 || axis > 75) break;
    for (let cross = 1; cross <= 75; cross++) {
      const offset = cross - (vMajor ? from.h : from.v);
      if (4 * Math.abs(offset * major - minor * step) <= major * (4 + step)) {
        result.push(vMajor ? { v: axis, h: cross } : { v: cross, h: axis });
      }
    }
  }
  return result;
}

export function clearTorpedoCorridor(scan: Scan, from: Position, target: Position, team: Team, now: number): boolean {
  if (now - scan.observedAt > 5000 || scan.observedAt > now) return false;
  const corridor = torpedoCorridor(from, target);
  if (!corridor.length) return false;
  const cells = new Map(scan.cells.map(cell => [positionKey(cell), cell]));
  const enemy = team === 'FEDERATION' ? 'EMPIRE' : 'FEDERATION';
  return corridor.every(position => {
    const cell = cells.get(positionKey(position));
    if (!cell || now - cell.observedAt > 5000 || cell.observedAt > now) return false;
    // Unknown symbols, stars, black holes, all planets and friendly objects
    // veto the shot. Enemy ships/bases and observed open/warning space pass.
    return cell.symbol === ' .' || cell.symbol === ' !'
      || cell.symbol === (enemy === 'EMPIRE' ? ')(' : '<>')
      || /^ [A-Z]$/.test(cell.symbol) && fleetSymbols[enemy].includes(cell.symbol[1]);
  });
}
