import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { parityReport } from './report.ts';
import { ioScenarios } from '../automated-player/io-scenarios.ts';

const { values: v } = parseArgs({ options: {
  'typescript-port': { type: 'string' }, 'pdp10-port': { type: 'string' },
  suite: { type: 'string', default: 'modes' }, limit: { type: 'string', default: 'all' },
  out: { type: 'string' }, 'reference-id': { type: 'string' },
  'typescript-profile': { type: 'string' }, 'ignore-command-echo': { type: 'boolean', default: false },
  help: { type: 'boolean' },
} });
if (v.help) {
  console.log('Usage: node experimental/parity/run.ts --typescript-port PORT --pdp10-port PORT --typescript-profile playable|historical-diagnostic --reference-id IMAGE_OR_BUILD_ID [--suite modes|dialogs] [--limit N|all] [--out NEW_DIRECTORY] [--ignore-command-echo]');
} else {
  const port = (s: string | undefined) => { if (!s || !/^\d+$/.test(s) || +s < 1 || +s > 65535) throw new Error('Explicit ports 1..65535 required'); return s; };
  const ts = port(v['typescript-port']), pdp = port(v['pdp10-port']);
  if (ts === pdp) throw new Error('Backends must use different localhost ports');
  if (v.suite !== 'modes' && v.suite !== 'dialogs') throw new Error('Unknown suite');
  if (!v['reference-id'] || !['playable', 'historical-diagnostic'].includes(v['typescript-profile'] ?? '')) throw new Error('Reference identity and TypeScript profile required');
  const suite = v.suite;
  const available = ioScenarios(suite).reduce((n, g) => n + g.steps.length, 0);
  const limit = v.limit === 'all' ? available : Number(v.limit);
  if (!Number.isInteger(limit) || limit < 1 || limit > available) throw new Error('Invalid limit');
  // Validate a complete group before connecting or reserving output.
  parityReport([], [], suite, limit);
  const out = resolve(v.out ?? `logs/parity-${Date.now()}`);
  mkdirSync(out); // Never overwrite previous evidence.
  writeFileSync(`${out}/manifest.json`, JSON.stringify({ ...v, time: new Date().toISOString(), node: process.version, referenceIdentitySource: 'operator-supplied', stateAligned: false }, null, 2));
  const script = fileURLToPath(new URL('../automated-player/compare-io.ts', import.meta.url));
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  async function capture(backend: string, endpoint: string) {
    const path = `${out}/${backend}.jsonl`;
    if (controller.signal.aborted) return [{ event: 'harness-error', error: 'Interrupted before capture' }];
    await new Promise<void>(done => {
      const child = spawn(process.execPath, [script, backend, endpoint, path, String(limit), suite], { signal: controller.signal });
      const errors: string[] = [];
      child.stdout.on('data', data => appendFileSync(`${out}/${backend}.stdout.txt`, data));
      child.stderr.on('data', data => appendFileSync(`${out}/${backend}.stderr.txt`, data));
      child.on('error', error => errors.push(String(error)));
      child.on('close', (code, signal) => {
        if (code !== 0) errors.push(`Capture exited ${code}, signal ${signal}`);
        for (const error of errors) appendFileSync(path, JSON.stringify({ event: 'harness-error', error }) + '\n');
        done();
      });
    });
    try { return readFileSync(path, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line) as Record<string, unknown>); }
    catch (error) { return [{ event: 'harness-error', error: String(error) }]; }
  }
  try {
    // Sequential sessions preserve independent dialogue state; no lockstep clocks are implied.
    const left = await capture('typescript', ts), right = await capture('pdp10', pdp);
    const report = parityReport(left, right, suite, limit, v['ignore-command-echo']);
    writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 2) + '\n');
    const rows = report.comparison?.cases.map(c => `- ${c.id}: ${c.result}`).join('\n') ?? 'No comparable steps.';
    const errors = Object.entries(report.captures).flatMap(([backend, c]) => c.errors.map(e => `- ${backend}: ${e}`)).join('\n') || 'None.';
    writeFileSync(`${out}/report.md`, `# DECWAR comparison\n\nOutcome: **${report.outcome}**\n\nSuite: ${suite}; selected steps: ${report.expectedCases}.\n\n## Steps\n\n${rows}\n\n## Capture errors\n\n${errors}\n\n## Scope\n\n${report.limitations}\n\nSee report.json for per-step responses and difference offsets.\n`);
    console.log(`${report.outcome}: ${out}/report.md`);
    process.exitCode = report.outcome === 'incomplete' ? 2 : report.outcome === 'differences' ? 1 : 0;
  } finally { process.off('SIGINT', stop); process.off('SIGTERM', stop); }
}
