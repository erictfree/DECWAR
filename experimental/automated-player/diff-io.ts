import { readFileSync, writeFileSync } from 'node:fs';
import { compareCases, type CapturedCase } from './io-comparison.ts';

const [leftPath, rightPath, output, option] = process.argv.slice(2);
if (!leftPath || !rightPath || !output || (option && option !== '--ignore-command-echo')) throw new Error('Usage: node experimental/automated-player/diff-io.ts LEFT.jsonl RIGHT.jsonl REPORT.json [--ignore-command-echo]');
const read = (path: string) => readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
const left = read(leftPath), right = read(rightPath);
const capture = (events: ReturnType<typeof read>) => ({
  configuration: events.find(e => e.event === 'configuration'),
  completion: events.find(e => e.event === 'complete'),
  errors: events.filter(e => e.event === 'failed' || e.event === 'cleanup-error'),
});
const report = compareCases(left.filter(e => e.event === 'case') as CapturedCase[], right.filter(e => e.event === 'case') as CapturedCase[], option === '--ignore-command-echo');
writeFileSync(output, JSON.stringify({ leftPath, rightPath,
  captures: { left: capture(left), right: capture(right) }, ...report,
  limitations: 'Raw responses retained; optional removal records one exact leading command echo. Worlds and clocks are not aligned. Matching text does not establish game-state parity; missing cases and failed captures are not passes.' }, null, 2) + '\n', { flag: 'wx' });
