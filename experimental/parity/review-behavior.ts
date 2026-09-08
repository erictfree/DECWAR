import { readFileSync, writeFileSync } from 'node:fs';
import { behaviorReport } from './behavior.ts';

const [left, right, output, option] = process.argv.slice(2);
if (!left || !right || !output || (option && option !== '--ignore-command-echo')) throw new Error('Usage: review-behavior.ts TYPESCRIPT.jsonl PDP10.jsonl NEW_REPORT.json [--ignore-command-echo]');
const read = (path: string): Record<string, unknown>[] => readFileSync(path, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
const report = behaviorReport(read(left), read(right), option === '--ignore-command-echo');
writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(`${report.outcome}: ${output}`);
process.exitCode = report.outcome === 'incomplete' ? 2 : report.outcome === 'differences' ? 1 : 0;
