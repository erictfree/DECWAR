import { compareCases, type CapturedCase } from '../automated-player/io-comparison.ts';
import { ioScenarios, selectGroups } from '../automated-player/io-scenarios.ts';

type Event = Record<string, unknown>;
export function parityReport(left: Event[], right: Event[], suite: 'modes' | 'dialogs', limit: number, echo = false) {
  const expected = selectGroups(ioScenarios(suite), limit).flatMap(g => g.steps);
  if (!expected.length) throw new Error('No complete scenario group selected');
  const inspect = (events: Event[], backend: string) => {
    const errors: string[] = [];
    const configs = events.filter(e => e.event === 'configuration');
    if (configs.length !== 1 || configs[0]?.backend !== backend || configs[0]?.scenario !== `io-${suite}-v2`) errors.push('Missing or incompatible configuration');
    const cases = events.filter(e => e.event === 'case');
    if (cases.length !== expected.length) errors.push('Incomplete or extra cases');
    expected.forEach((step, i) => {
      const c = cases[i];
      if (!c || c.id !== step.id || c.command !== step.command || c.index !== i + 1 || typeof c.response !== 'string' || c.passed !== true) errors.push(`Invalid or failed step ${step.id}`);
    });
    const completion = events.filter(e => e.event === 'complete');
    if (completion.length !== 1 || completion[0]?.cases !== expected.length) errors.push('Missing or inconsistent completion');
    for (const e of events) if (['failed', 'cleanup-error', 'harness-error'].includes(String(e.event))) errors.push(String(e.error));
    return { errors, cases: cases as CapturedCase[], configuration: configs[0] };
  };
  const a = inspect(left, 'typescript'), b = inspect(right, 'pdp10');
  let comparison: ReturnType<typeof compareCases> | undefined;
  try { comparison = compareCases(a.cases, b.cases, echo); }
  catch (error) { a.errors.push(String(error)); }
  const valid = !a.errors.length && !b.errors.length;
  const matches = comparison?.cases.every(c => c.result === 'exact-decoded-match' || c.result === 'command-echo-only');
  return { schema: 'decwar-parity-v1', suite, expectedCases: expected.length,
    outcome: !valid ? 'incomplete' : matches ? 'matched-selected-output' : 'differences',
    captures: { typescript: { errors: a.errors, configuration: a.configuration }, pdp10: { errors: b.errors, configuration: b.configuration } }, comparison,
    limitations: 'Worlds and clocks are unaligned. No random values, whitespace, control characters or timing fields are normalized. Decoded response matches do not establish wire, state, compiler or gameplay parity. Startup and cleanup bytes are retained as evidence; their text is not compared as game cases.' };
}
