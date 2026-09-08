import { readFileSync } from 'node:fs';
import { variantData } from '../../src/generated/variants/austin.ts';
import { parseScan } from '../automated-player/observations.ts';

const [tsPath, nativeCapture, debuggerPath] = process.argv.slice(2);
if (!tsPath || !nativeCapture || !debuggerPath) throw new Error('Usage: review-board.ts TYPESCRIPT_JSON NATIVE_JSONL DEBUGGER_LOG');
const ts = JSON.parse(readFileSync(tsPath, 'utf8'));
const events = readFileSync(nativeCapture, 'utf8').trim().split('\n').map(line => JSON.parse(line));
const config = events.find(e => e.event === 'configuration');
if (!ts.cleanupComplete || config?.seed !== ts.seed || config?.backend !== 'pdp10' || config.romulan || config.blackHoles || !events.some(e => e.event === 'sent' && e.line === `TOURNAMENT ${ts.seed}`) || !events.some(e => e.event === 'cleanup-complete') || events.some(e => ['failed', 'cleanup-error'].includes(e.event))) throw new Error('Incomplete or incompatible capture');
const log = readFileSync(debuggerPath, 'utf8');
const oct = (s: string) => BigInt('0o' + s);
const memory = new Map([...log.matchAll(/^(?:sim> )?([0-7]+):\s*([0-7]{12})\s*$/gm)].map(m => [oct(m[1]), oct(m[2])]));
const read = (a: bigint) => { const w = memory.get(a); if (w === undefined) throw new Error(`Missing physical word ${a.toString(8)}`); return w; };
const ubMatch = [...log.matchAll(/UB:\s*([0-7]+)/g)].at(-1);
if (!ubMatch) throw new Error('Missing stopped-job UB');
// Bundled SIMH kx10_cpu.c:2419–2542, KL direct section/page mappings.
// Fail on shared/indirect/nonresident mappings; never infer pages from TS data.
const pageNumber = (pointer: bigint) => {
  if ((pointer >> 33n) !== 1n || ((pointer >> 18n) & 0o77n) !== 0n) throw new Error('Unsupported native page mapping');
  return pointer & 0o17777n;
};
const ub = oct(ubMatch[1]);
const pageTable = pageNumber(read(ub + 0o540n)) << 9n;
const layout = variantData.commonLayout.hiseg;
const start = BigInt(layout.address + layout.fields.board.offset);
const nativeWords = Array.from({ length: layout.fields.board.words }, (_, i) => {
  const virtual = start + BigInt(i);
  const physicalPage = pageNumber(read(pageTable + (virtual >> 9n)));
  return read((physicalPage << 9n) + (virtual & 0o777n));
});
const tsWords = ts.words.map(oct) as bigint[];
if (tsWords.length !== nativeWords.length) throw new Error('Incomplete TypeScript board');
// WARMAC.MAC:813–815,4408–4422: three 12-bit cells per word, V then H.
const decode = (words: bigint[]) => words.flatMap(w => [24n, 12n, 0n].map(shift => Number((w >> shift) & 0o7777n)));
const a = decode(tsWords), b = decode(nativeWords);
const symbol = (code: number) => code === 0 ? ' .' : code === 4095 ? '  ' : code < 100 ? ' !' :
  code < 200 ? ' ' + 'EFILNSTVY'[code - 101] : code < 300 ? ' ' + 'BCDGHJMPW'[code - 201] :
  ['<>', ')(', '??', ' @', '@F', '@E', ' *'][Math.floor(code / 100) - 3];
const native = events.find(e => e.event === 'seed-observation');
const scanCheck = (text: string, cells: number[]) => parseScan(text).cells.every(c => symbol(cells[(c.v - 1) * 75 + c.h - 1]) === c.symbol);
if (!native || !scanCheck(ts.scan, a) || !scanCheck(native.scanText, b)) throw new Error('Board does not reproduce retained public scan');
const differences = a.flatMap((code, i) => code === b[i] ? [] : [{ v: Math.floor(i / 75) + 1, h: i % 75 + 1, typescript: code, native: b[i] }]);
console.log(JSON.stringify({ schema: 'full-board-comparison-v1', seed: ts.seed, outcome: differences.length ? 'different-boards' : 'matched-complete-board',
  words: a.length / 3, cells: a.length, publicScansVerified: true, differences,
  nativeMapping: { ub: ub.toString(8), pageTable: pageTable.toString(8), board: start.toString(8) },
  scope: 'Packed initial board including object indices and initial ship. Not all game state, later random streams, combat parity or Docker verification.' }, null, 2));
process.exitCode = differences.length ? 1 : 0;
