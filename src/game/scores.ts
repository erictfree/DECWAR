import { constants as K } from '../runtime/variant-values.ts';

// HISEG.FOR:46,60,66-68,98. Column-major word arrays; construction is a
// component helper, not the complete START/SETUP initialization sequence.
export class Scores {
  readonly playerWords = Array<bigint>(K.KNPOIN * K.KNPLAY).fill(0n);
  readonly teamWords = Array<bigint>(2 * K.KNPOIN).fill(0n);
  readonly romulan = Array<bigint>(K.KNPOIN + 1).fill(0n);
  readonly turns = Array<bigint>(4).fill(0n);
  readonly ships = Array<bigint>(3).fill(0n);
  numrom = 0n;
  player(category: number, who: number): bigint { return this.playerWords[(who - 1) * K.KNPOIN + category - 1]; }
  setPlayer(category: number, who: number, value: bigint): void { this.playerWords[(who - 1) * K.KNPOIN + category - 1] = value; }
  team(team: number, category: number): bigint { return this.teamWords[(category - 1) * 2 + team - 1]; }
  setTeam(team: number, category: number, value: bigint): void { this.teamWords[(category - 1) * 2 + team - 1] = value; }
}
