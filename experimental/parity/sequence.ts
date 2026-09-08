import { parseStatus } from '../automated-player/observations.ts';

// Seed 1729, Federation Yorktown; source MOVE/IMPULS:2141–2254,
// DOCK:893–938, SHIELD:3739–3806. Displayed units, no enemies nearby.
export const sequence = [
  ['MOVE ABSOLUTE 7 3', 7, 3, 4992, true, 100],
  ['DOCK', 7, 3, 5000, true, 100],
  ['SHIELDS DOWN', 7, 3, 5000, false, 100],
  ['MOVE ABSOLUTE 8 3', 8, 3, 4996, false, 100],
  ['SHIELDS UP', 8, 3, 4896, true, 100],
  ['SHIELDS TRANSFER -100', 8, 3, 4996, true, 96],
  ['SHIELDS TRANSFER 100', 8, 3, 4896, true, 100],
  ['IMPULSE ABSOLUTE 7 3', 7, 3, 4888, true, 100],
  ['DOCK', 7, 3, 5000, true, 100],
  ['MOVE ABSOLUTE 0 0', 7, 3, 5000, true, 100],
] as const;
// TORPED:4301–4325 consumes one undocked torpedo, then draws misfire,
// range and star-effect rolls. The star's fate is compared, not prescribed.
export const shotSequence = [['TORPEDOES ABSOLUTE 1 11 1', 7, 2, 5000, true, 100]] as const;
export function sequenceChecks(index: number, statusText: string, mode = 'movement') {
  const s = parseStatus(statusText), expected = (mode === 'star-shot' ? shotSequence : sequence)[index];
  if (!expected) throw new Error('Unknown sequence step');
  return { position: s.position.v === expected[1] && s.position.h === expected[2], energy: s.energy === expected[3],
    shieldMode: s.shieldsUp === expected[4], shieldStrength: s.shieldPercent === expected[5], healthy: s.hullDamage === 0 && s.torpedoes === (mode === 'star-shot' ? 9 : 10),
    ...(mode === 'movement' && (index === 1 || index >= 8) ? { docked: s.docked } : {}) };
}
