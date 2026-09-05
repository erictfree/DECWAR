import type { PackedBoard } from '../compat/board.ts';
import type { ListWord } from './list-state.ts';
import type { ListScanServices } from './list-scan.ts';

export type ListWorld = {
  board: PackedBoard;
  players: readonly { alive: bigint; ship: { v: number; h: number; shieldCondition: bigint; shieldStrength: bigint } }[];
  bases: readonly (readonly { v: number; h: number; strength: bigint; scanned: bigint }[])[]; // [side][index], one-based
  planets: readonly { v: number; h: number; builds: bigint; scanned: bigint }[]; // one-based
  nplnet: number; rom: bigint; romopt: bigint; erom: bigint; locr: { v: number; h: number };
};
// These are FORTRAN literals, not ASCIZ labels. The runtime must supply their
// compiled output bytes, including any padding/termination effects.
export const listLiterals = {
  inactiveShip: { file: 'LSTFLG.FOR', text: ' is not in the game' },
  outOfRange: { file: 'LSTOBJ.FOR', text: 'out of range' },
  builds: { file: 'LSTOBJ.FOR', text: ' builds' },
  buildAbbreviation: { file: 'LSTOBJ.FOR', text: ' b' },
  romulan: { file: 'LSTOUT.FOR', text: 'Romulan' },
  target: { file: 'LSTOUT.FOR', text: 'target' },
} as const;
export type ListRuntime = Partial<ListScanServices> & {
  logical(word: bigint): boolean;
  ownPosition(who: number): { v: number; h: number };
  literal(key: keyof typeof listLiterals): string;
  // LSTFLG passes this implicit local by reference, sometimes three times in
  // the same call. The runtime owns its prior word; there is no zero default.
  dummy: ListWord;
  // LSTFLG's base DO lacks the FIRST > LAST guard used for ships. Required
  // only for reversed bounds; the archive does not settle zero/one-trip or
  // the final loop-variable value for the linked compiler.
  reversedBaseLoop?(first: number, last: number): { iterations: readonly number[]; after: number };
  // LSTOUT guards PLNCTR, not NPLNET. Its output loop can have 1:0 bounds
  // if the planet count changes after selection; the same compiler issue applies.
  reversedPlanetOutputLoop?(first: number, last: number): { iterations: readonly number[]; after: number };
};
export type ListReportContext = { who: number; team: number; password: boolean; oflg: number; ocflg: number };
