import { readFileSync } from 'node:fs';
import { parseStatus, parseScan, parseFriendlyBases } from '../automated-player/observations.ts';

const paths = process.argv.slice(2);
if (paths.length !== 2) throw new Error('Usage: review-installations.ts TS_CAPTURE NATIVE_CAPTURE');
const captures = paths.map((path, index) => {
  const events = readFileSync(path, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  const config = events.find(e => e.event === 'configuration');
  const errors = events.filter(e => ['failed', 'cleanup-error'].includes(e.event)).map(e => e.error);
  if (config?.mode !== 'installations' || config.seed !== 1729 || config.backend !== (index ? 'pdp10' : 'typescript')) errors.push('Invalid configuration');
  if (config?.romulan !== false || config?.blackHoles !== false || config?.setupPolicy !== 'even-target-turns-v1' || !events.some(e => e.event === 'sent' && e.role === 'attacker' && e.line === 'TOURNAMENT 1729')) errors.push('Invalid seeded setup');
  const ready = events.find(e => e.event === 'combat-ready'), phase = events.find(e => e.event === 'setup-phase');
  const turns = events.filter(e => ['target-move','target-dock','target-phase-dock'].includes(e.event)).length;
  if (!ready || !phase || phase.setupTurns !== turns || turns % 2 || parseStatus(ready.target.statusText).stardate !== turns + 4) errors.push('Invalid activity phase');
  if (!events.some(e => e.event === 'complete') || ['attacker','target'].some(role => !events.some(e => e.event === 'cleanup-complete' && e.role === role))) errors.push('Incomplete lifecycle');
  const shots = events.filter(e => e.event === 'base-shot');
  const death = events.find(e => e.event === 'base-destroyed');
  const capture = events.find(e => e.event === 'installation-capture');
  const builds = events.filter(e => e.event === 'installation-build');
  const dock = events.find(e => e.event === 'installation-dock');
  if (!shots.length || !death || !capture || builds.length !== 5 || !dock) errors.push('Missing installation stage');
  const cell = (s: any, v: number, h: number) => s && parseScan(s.scanText).cells.find(c => c.v === v && c.h === h)?.symbol;
  const bases = (s: any) => s ? parseFriendlyBases(s.bases, 'EMPIRE') : [];
  const planet = (s: any) => {
    const row = s && /^ Emp planet[\t ]+@[\t ]*19-[\t ]*14(?:[\t ]+(\d+) builds?)?[\t ]*\r?$/m.exec(s.planets);
    return row ? { builds: Number(row[1] ?? 0) } : undefined;
  };
  const checks: Record<string, boolean> = {
    baseDestroyed: !!death && shots.length <= 25 && shots.every((s, i) => s.shot === i && s.command === 'PHASERS ABSOLUTE 180 15 10' && cell(s.before,15,10) === ')(') && cell(shots.at(-1)?.after, 15, 10) === ' .' && bases(death.builder).length === 9 && !bases(death.builder).some(p => p.v === 15 && p.h === 10),
    captured: !!capture && capture.command === 'CAPTURE ABSOLUTE 19 14' && cell(capture.before,19,14) === ' @' && cell(capture.after,19,14) === '@E' && planet(capture.after)?.builds === 0,
  };
  for (let i = 0; i < 5; i++) {
    const b = builds[i];
    checks[`build${i + 1}`] = !!b && b.build === i + 1 && b.command === 'BUILD ABSOLUTE 19 14' && planet(b.before)?.builds === i && parseStatus(b.before.statusText).energy === parseStatus(b.after.statusText).energy && (i < 4 ? planet(b.after)?.builds === i + 1 && cell(b.after,19,14) === '@E' : !planet(b.after) && cell(b.after,19,14) === ')(' && bases(b.before).length === 9 && bases(b.after).length === 10 && bases(b.after).some(p => p.v === 19 && p.h === 14));
  }
  if (dock) {
    const before = parseStatus(dock.before.statusText), after = parseStatus(dock.after.statusText);
    const nearby = parseScan(dock.before.scanText).cells.filter(c => [')(', '@E'].includes(c.symbol) && Math.max(Math.abs(c.v - before.position.v), Math.abs(c.h - before.position.h)) <= 1);
    checks.dockedAtNewBase = dock.command === 'DOCK' && nearby.length === 1 && before.position.v === 18 && before.position.h === 14 && after.position.v === 18 && after.position.h === 14 && after.docked && after.energy === Math.min(5000, before.energy + 1000) && cell(dock.after,19,14) === ')(';
  } else checks.dockedAtNewBase = false;
  return { path, errors, checks, shots, capture, builds, dock };
});
const clean = (e: any) => e?.response?.startsWith(e.command + '\r\n') ? e.response.slice(e.command.length + 2) : e?.response;
const measured = captures.map(c => [c.capture, ...c.builds, c.dock]);
const outputs = measured[0].map((e, i) => ({ index: i, command: e?.command, equal: e && measured[1][i] && clean(e) === clean(measured[1][i]) }));
const siegeEqual = captures[0].shots.length === captures[1].shots.length && captures[0].shots.every((e, i) => clean(e) === clean(captures[1].shots[i]));
const resources = measured.map(steps => steps.map(e => {
  if (!e) return null;
  const select = (text: string) => { const s = parseStatus(text); return { energy: s.energy, hullDamage: s.hullDamage, shieldPercent: s.shieldPercent, torpedoes: s.torpedoes, stardate: s.stardate }; };
  return { command: e.command, before: select(e.before.statusText), after: select(e.after.statusText) };
}));
const contracts = captures.every(c => Object.values(c.checks).every(Boolean));
const outcome = captures.some(c => c.errors.length) ? 'incomplete' : !contracts ? 'failed-state-contract' : outputs.every(e => e.equal) && siegeEqual ? 'matched-selected-contracts-and-output' : 'differences';
console.log(JSON.stringify({ schema: 'installation-comparison-v1', outcome, captures: captures.map(({ path, errors, checks, shots }) => ({ path, errors, checks, siegeShots: shots.length })), outputs, siegeEqual, resources: { typescript: resources[0], native: resources[1] },
  scope: 'Public source-relative base destruction, neutral capture, five builds, base-list replacement and docking. Builder private random streams and setup stardates are not equalized; raw resource and output evidence remains in captures. This report does not assert identical complete world state.' }, null, 2));
process.exitCode = outcome === 'incomplete' ? 2 : outcome.startsWith('matched-') ? 0 : 1;
