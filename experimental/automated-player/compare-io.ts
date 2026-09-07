// External, non-combat I/O scenario capture. No runtime state access.
import { appendFileSync, writeFileSync } from 'node:fs';
import { PlayerClient } from './client.ts';
import { ioScenarios, selectGroups } from './io-scenarios.ts';

const [backend, portText, output, limitText = 'all', suite = 'modes'] = process.argv.slice(2);
if (!['typescript', 'pdp10'].includes(backend ?? '') || !/^\d+$/.test(portText ?? '') || !output) {
  throw new Error('Usage: node experimental/automated-player/compare-io.ts typescript|pdp10 PORT OUTPUT.jsonl [CASE_LIMIT|all] [modes|dialogs]');
}
if (suite !== 'modes' && suite !== 'dialogs') throw new Error('Unknown suite');
const groups = ioScenarios(suite), available = groups.reduce((n, g) => n + g.steps.length, 0);
const limit = limitText === 'all' ? available : Number(limitText);
if (!Number.isInteger(limit) || limit < 1 || limit > available) throw new Error(`CASE_LIMIT must be 1–${available}, or all`);
const selected = selectGroups(groups, limit);
if (!selected.length) throw new Error('Limit is too small for one complete dialogue group');
if (Number(portText) < 1 || Number(portText) > 65535) throw new Error('Invalid port');
writeFileSync(output, '', { flag: 'wx' });
const record = (event: Record<string, unknown>) => appendFileSync(output, JSON.stringify({ time: new Date().toISOString(), ...event }) + '\n');
record({ event: 'configuration', backend, port: Number(portText), scenario: `io-${suite}-v2`, stateAligned: false, requestedLimit: limit, availableCases: available });
const client = new PlayerClient({ host: '127.0.0.1', port: Number(portText), record, recordWire: true, timeoutMs: backend === 'pdp10' ? 120000 : 20000, settleMs: 150 });
let count = 0, joined = false, pendingPrompt = false;
try {
  if (backend === 'pdp10') await client.startReference();
  await client.join({ name: 'Iocheck', team: 'FEDERATION', ship: 'YORKTOWN', preserveModes: true });
  joined = true;
  for (const group of selected) for (const step of group.steps) {
    pendingPrompt = Boolean(step.prompt);
    const response = step.prompt
      ? await client.exchange(step.command, new RegExp(step.prompt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'))
      : await client.command(step.command);
    const passed = !step.contains || response.includes(step.contains);
    record({ event: 'case', index: ++count, id: step.id, group: group.id, command: step.command,
      response, expectedText: step.contains, passed });
    if (!passed) throw new Error(`Case ${step.id} did not contain ${JSON.stringify(step.contains)}`);
  }
  record({ event: 'complete', cases: count, fullSuite: count === available,
    limits: 'Worlds unaligned; coordinate input effects, broader interactions, editing and reentry remain unverified.' });
} catch (error) {
  record({ event: 'failed', cases: count, error: String(error) });
  process.exitCode = 1;
} finally {
  // QUIT returns to the monitor on PDP-10; ordinary quit waits for socket EOF.
  try {
    if (joined && pendingPrompt) await client.command('');
    if (!joined) { /* No game was joined; do not send game commands to the monitor. */ }
    else if (backend === 'pdp10') {
      await client.quitReference();
    } else await client.quit();
  } catch (error) { record({ event: 'cleanup-error', error: String(error) }); process.exitCode = 1; }
  client.close();
}
