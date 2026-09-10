import type { ShipStatus } from '../automated-player/observations.ts';

// ENERGY queues IWHAT=12. OUTHIT label6900 has no NOMSG/GAGMSG filter;
// unlike arrival/departure notices at label6000. MSG.MAC:180–181 supplies text.
export const noticeSequence = [
  ['normal-transfer', 'ENERGY VULCAN 10'], ['radio-off', 'RADIO OFF'],
  ['radio-off-transfer', 'ENERGY VULCAN 10'], ['radio-on', 'RADIO ON'],
  ['gag-donor', 'RADIO GAG YORKTOWN'], ['gagged-transfer', 'ENERGY VULCAN 10'],
  ['ungag-donor', 'RADIO UNGAG YORKTOWN'], ['restored-transfer', 'ENERGY VULCAN 10'],
] as const;
export type NoticeStep = { label: string; command: string; response: string;
  before: Record<'donor' | 'receiver', { status: ShipStatus; text: string }>;
  after: Record<'donor' | 'receiver', { status: ShipStatus; text: string }> };
export function energyNotices(text: string): string[] {
  return [...text.matchAll(/^[^\r\n]* transfers [^\r\n]* units of energy to the [^\r\n]*\r?\n/gm)].map(m => m[0]);
}
export function noticeChecks(step: NoticeStep, index: number) {
  const expected = noticeSequence[index];
  if (!expected) return { evidence: false };
  const transfer = expected[1].startsWith('ENERGY');
  const beforeTransfers = noticeSequence.slice(0, index).filter(s => s[1].startsWith('ENERGY')).length;
  const expectedNotices = transfer ? ['Yorktown  transfers 9.0 units of energy to the  Vulcan \r\n'] : [];
  return {
    command: step.label === expected[0] && step.command === expected[1],
    energy: step.before.donor.status.energy === 5000 - beforeTransfers * 10 && step.after.donor.status.energy === 5000 - (beforeTransfers + Number(transfer)) * 10
      && step.before.receiver.status.energy === 4952 + beforeTransfers * 9 && step.after.receiver.status.energy === 4952 + (beforeTransfers + Number(transfer)) * 9,
    receiverNotices: JSON.stringify(energyNotices(step.after.receiver.text)) === JSON.stringify(expectedNotices),
    donorNotices: energyNotices(step.after.donor.text).length === 0,
    radio: /^Radio[\t ]+(On|Off)\r?$/m.exec(step.after.receiver.text)?.[1] === (index === 1 || index === 2 ? 'Off' : 'On'),
    stable: (['donor','receiver'] as const).every(role => {
      const a = step.after[role].status, b = step.before[role].status;
      return a.position.v === 7 && a.position.h === (role === 'donor' ? 2 : 3)
        && a.position.v === b.position.v && a.position.h === b.position.h
        && a.shieldsUp === b.shieldsUp && a.shieldPercent === b.shieldPercent && a.hullDamage === b.hullDamage && a.torpedoes === b.torpedoes;
    }),
  };
}
