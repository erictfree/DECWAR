// WARMAC.MAC:5333-5469: 75 rows, 25 words/row, three 12-bit cells per word.
// Coordinates stay one-based; the first index is vertical in the public API.
export function ingal(v: number, h: number): boolean {
  return Number.isInteger(v) && Number.isInteger(h) && v >= 1 && v <= 75 && h >= 1 && h <= 75;
}
export function pdist(v1: number, h1: number, v2: number, h2: number): number {
  return Math.max(Math.abs(v1 - v2), Math.abs(h1 - h2));
}
export function ldis(v1: number, h1: number, v2: number, h2: number, n: number): boolean {
  return Math.abs(v1 - v2) <= n && Math.abs(h1 - h2) <= n;
}
export class PackedBoard {
  private words: bigint[];
  constructor(words = Array<bigint>(1875).fill(0n)) {
    if (words.length !== 1875) throw new RangeError('BOARD requires 1875 words');
    this.words = words;
  }
  private address(v: number, h: number): { index: number; shift: bigint } {
    if (!ingal(v, h)) throw new RangeError('Galaxy coordinate out of bounds');
    return { index: (v - 1) * 25 + Math.trunc((h - 1) / 3), shift: BigInt((2 - (h - 1) % 3) * 12) };
  }
  disp(v: number, h: number): number {
    const { index, shift } = this.address(v, h);
    const cell = Number((this.words[index] >> shift) & 4095n);
    return cell === 4095 ? -1 : cell;
  }
  dispc(v: number, h: number): number { return Math.trunc(this.disp(v, h) / 100) || 0; }
  dispx(v: number, h: number): number { return Number(BigInt(this.disp(v, h) % 100) & 0o777777n); }
  setdsp(v: number, h: number, value: number): void {
    const { index, shift } = this.address(v, h);
    this.words[index] = (this.words[index] & ~(4095n << shift)) | ((BigInt(value) & 4095n) << shift);
  }
  snapshot(): readonly bigint[] { return [...this.words]; }
}
