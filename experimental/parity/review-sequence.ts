import { readFileSync } from 'node:fs';
import { sequence, shotSequence, sequenceChecks } from './sequence.ts';

const paths = process.argv.slice(2);
if (paths.length !== 2) throw new Error('Usage: review-sequence.ts TYPESCRIPT_JSONL NATIVE_JSONL');
const captures = paths.map((path, i) => {
  const events = readFileSync(path, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  const config = events.find(e => e.event === 'configuration');
  const mode = config?.mode ?? 'movement', selected = mode === 'star-shot' ? shotSequence : sequence;
  const steps = events.filter(e => e.event === 'sequence-step');
  const errors = events.filter(e => ['failed', 'cleanup-error'].includes(e.event)).map(e => String(e.error));
  if (config?.backend !== (i ? 'pdp10' : 'typescript') || config?.scenario !== 'seeded-sequence-v1' || config?.seed !== 1729 || config?.romulan !== false || config?.blackHoles !== false) errors.push('Invalid configuration');
  if (!events.some(e => e.event === 'sent' && e.line === 'TOURNAMENT 1729')) errors.push('Missing seed selection');
  if (!['movement', 'star-shot'].includes(mode)) errors.push('Invalid mode');
  if (steps.length !== selected.length || selected.some((s, n) => steps[n]?.index !== n || steps[n]?.command !== s[0])) errors.push('Incomplete or reordered sequence');
  if (!events.some(e => e.event === 'complete' && e.steps === selected.length) || !events.some(e => e.event === 'cleanup-complete')) errors.push('Incomplete lifecycle');
  return { path, mode, errors, initial: events.find(e => e.event === 'initial'), steps };
});
if (captures[0].mode !== captures[1].mode) throw new Error('Sequence modes differ');
const mode = captures[0].mode, selected = mode === 'star-shot' ? shotSequence : sequence;
// Remove only the explicitly selected command echo. All other bytes remain.
const clean = (text: string, command: string) => text.startsWith(command + '\r\n') ? text.slice(command.length + 2) : text;
function compare(a: Record<string, string> | undefined, b: Record<string, string> | undefined, command?: string) {
  if (!a || !b) return { evidence: false };
  const fields = [['status', 'STATUS'], ['damages', 'DAMAGES'], ['scan', 'SCAN 10'], ...(command ? [['response', command]] : [])];
  return Object.fromEntries(fields.map(([key, cmd]) => [key, typeof a[key] === 'string' && typeof b[key] === 'string' && clean(a[key], cmd) === clean(b[key], cmd)]));
}
const initial = compare(captures[0].initial, captures[1].initial);
const steps = selected.map(([command], index) => {
  const left = captures[0].steps[index], right = captures[1].steps[index];
  const checks = (s: typeof left) => { try { return sequenceChecks(index, s.status, mode); } catch { return { evidence: false }; } };
  return { index: index + 1, command, left: checks(left), right: checks(right), equalAfterCommandEchoRemoval: compare(left, right, command) };
});
const matched = Object.values(initial).every(Boolean) && steps.every(s => [s.left, s.right, s.equalAfterCommandEchoRemoval].every(checks => Object.values(checks).every(Boolean)));
const outcome = captures.some(c => c.errors.length) ? 'incomplete' : matched ? 'matched-seeded-sequence' : 'differences';
console.log(JSON.stringify({ schema: 'seeded-sequence-comparison-v1', outcome, seed: 1729, mode,
  captures: captures.map(({ path, errors }) => ({ path, errors })), initial, steps,
  scope: 'Fixed seeded commands; source state contracts plus action, STATUS, DAMAGES and SCAN output. Only command echo removed. No clock normalization or proof of future random-stream alignment. A star shot is not ship-versus-ship combat coverage.' }, null, 2));
process.exitCode = outcome === 'incomplete' ? 2 : outcome === 'differences' ? 1 : 0;
