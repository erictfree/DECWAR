// Austin DECWAR.FOR:970–1004 and MSG.MAC:54–65. Require both the
// standalone end banner and its outcome; quoted radio text is not a result.
export type WarWinner = 'FEDERATION' | 'EMPIRE' | 'NEITHER';
// The live high-segment lifecycle notice is emitted without a trailing CRLF.
// Permit that exact prefix, not arbitrary player/chat text before the banner.
export const warBanner = /(?:^\r*|\r?\n)(?:\[DECWAR high segment removed from swapper\])?THE WAR IS OVER!!\r?\n/;
export function warWinner(text: string): WarWinner | undefined {
  const banner = warBanner.exec(text);
  if (!banner) return undefined;
  const tail = text.slice(banner.index + banner[0].length).replace(/^(?:\r?\n)+/, '');
  if (/^The entire known galaxy has been depopulated\.\r?\n\r?\nBOTH sides lose!!(?:\r?\n|$)/.test(tail)) return 'NEITHER';
  if (/^The Klingon Empire is VICTORIOUS!!\r?\n/.test(tail)) return 'EMPIRE';
  if (/^The Federation has successfully repelled the Klingon hordes!\r?\n/.test(tail)) return 'FEDERATION';
  return undefined;
}
export class WarFinished extends Error {
  readonly winner: WarWinner;
  readonly text: string;
  constructor(winner: WarWinner, text: string) { super(`War finished: ${winner}`); this.winner = winner; this.text = text; }
}
