/** Read-only inspection of the preserved Austin EXE; never executes the image. */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const directory = resolve(root, 'legacy/utexas-reference/f78f2ec');
const manifest = JSON.parse(readFileSync(resolve(directory, 'artifacts.json'), 'utf8'));
const identity = manifest.files.find((f: { file: string }) => f.file === 'DECWAR.EXE');
const data = readFileSync(resolve(directory, 'DECWAR.EXE'));
if (data.length !== identity.bytes || createHash('sha256').update(data).digest('hex') !== identity.sha256)
  throw new Error('Preserved EXE differs from its artifact manifest');
if (data.length % 5) throw new Error('Incomplete BACK10 core-dump word');
const words: bigint[] = [];
for (let i = 0; i < data.length; i += 5) {
  if (data[i + 4]! & 0xf0) throw new Error('Nonzero unused nibble');
  words.push((BigInt(data.readUInt32BE(i)) << 4n) | BigInt(data[i + 4]!));
}
const half = (w: bigint) => Number(w & 0o777777n);
const memory = new Map<number, bigint>();
let cursor = 0;
let foundDirectory = false;
let ended = false;
// Only the directory/end blocks present in this pinned image are supported.
// Pairs describe file page, memory page and repeat count minus one; pages have
// 512 words. File page zero denotes zero-filled memory rather than file data.
while (cursor < words.length) {
  const header = words[cursor]!;
  const type = Number(header >> 18n);
  const size = half(header);
  if (size < 1 || cursor + size > words.length) throw new Error('Invalid EXE block extent');
  if (type === 0o1777) {
    if (size !== 1 || !foundDirectory) throw new Error('Invalid EXE end block');
    ended = true;
    break;
  }
  if (type !== 0o1776 || foundDirectory || (size - 1) % 2)
    throw new Error('Unsupported or duplicate EXE block');
  foundDirectory = true;
  for (let i = cursor + 1; i < cursor + size; i += 2) {
    const filePage = half(words[i]!);
    const memoryPage = half(words[i + 1]!);
    const pages = Number(words[i + 1]! >> 27n) + 1;
    if ((memoryPage + pages) * 512 > 2 ** 18 || (filePage && (filePage + pages) * 512 > words.length))
      throw new Error('EXE page mapping outside supported extent');
    for (let j = 0; j < pages * 512; j++) {
      const address = memoryPage * 512 + j;
      if (memory.has(address)) throw new Error('Overlapping EXE page mapping');
      memory.set(address, filePage ? words[filePage * 512 + j]! : 0n);
    }
  }
  cursor += size;
}
if (!ended) throw new Error('Missing EXE end block');

const option = (name: string) => process.argv.slice(2).find(a => a.startsWith(name + '='))?.slice(name.length + 1);
const marker = option('--marker');
const at = option('--address');
const count = Number(option('--words') ?? '24');
if ((!marker && !at) || (marker && at) || !Number.isInteger(count) || count < 1 || count > 256)
  throw new Error('Use --marker=SIXBIT or --address=OCTAL, with --words=1..256');
const addresses: number[] = [];
if (marker) {
  if (!/^[ -_]{1,6}$/.test(marker)) throw new Error('Marker must be 1–6 SIXBIT characters');
  let packed = 0n;
  for (const c of marker.padEnd(6)) packed = (packed << 6n) | BigInt(c.charCodeAt(0) - 32);
  for (const [address, word] of memory) if (word === packed) addresses.push(address);
  if (!addresses.length) throw new Error('No matching marker');
} else {
  if (!/^[0-7]{1,6}$/.test(at!)) throw new Error('Address must be octal');
  addresses.push(parseInt(at!, 8));
}
const oct = (n: number | bigint, length: number) => n.toString(8).padStart(length, '0');
console.log(`Austin EXE sha256 ${identity.sha256}; ${memory.size} mapped words. All columns octal.`);
console.log('ADDRESS WORD         OP  AC I X  ADDRESS-FIELD (fields do not classify code versus data)');
for (const start of addresses) {
  for (let address = start; address < start + count; address++) {
    const w = memory.get(address);
    if (w === undefined) throw new Error('Requested address is not mapped');
    console.log(`${oct(address, 6)} ${oct(w, 12)} ${oct(w >> 27n, 3)} ${oct((w >> 23n) & 15n, 2)} ${oct((w >> 22n) & 1n, 1)} ${oct((w >> 18n) & 15n, 2)} ${oct(w & 0o777777n, 6)}`);
  }
}
