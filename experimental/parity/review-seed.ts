import { readFileSync } from 'node:fs';
import { parseFriendlyBases, parseScan, parseStatus } from '../automated-player/observations.ts';

const paths = process.argv.slice(2);
if (paths.length !== 4) throw new Error('Usage: review-seed.ts TS_FIRST TS_REPEAT PDP_FIRST PDP_REPEAT');
const captures = paths.map((path, index) => {
  const events = readFileSync(path, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  const config = events.find(e => e.event === 'configuration');
  const observations = events.filter(e => e.event === 'seed-observation');
  const sent = events.filter(e => e.event === 'sent').map(e => e.line);
  if (config?.backend !== (index < 2 ? 'typescript' : 'pdp10') || !Number.isSafeInteger(config.seed) || config.seed < 1 || config.romulan !== false || config.blackHoles !== false ||
      !sent.includes(`TOURNAMENT ${config.seed}`) || observations.length !== 1 ||
      !events.some(e => e.event === 'complete') || !events.some(e => e.event === 'cleanup-complete') ||
      events.some(e => ['failed', 'cleanup-error'].includes(e.event))) throw new Error(`Incomplete or invalid capture: ${path}`);
  const observation = observations[0];
  // Reparse the retained responses rather than trusting stored derived fields.
  const position = parseStatus(observation.statusText).position;
  const bases = parseFriendlyBases(observation.bases, 'FEDERATION').sort((a, b) => a.v - b.v || a.h - b.h);
  if (bases.length !== 10) throw new Error(`Expected ten friendly bases: ${path}`);
  const cells = parseScan(observation.scanText).cells.map(({ v, h, symbol }) => ({ v, h, symbol })).sort((a, b) => a.v - b.v || a.h - b.h);
  return { path, seed: config.seed, position, bases, cells };
});
if (captures.some(c => c.seed !== captures[0].seed)) throw new Error('Seeds differ');
const pairs = [[0, 1], [2, 3], [0, 2], [1, 3]].map(([a, b]) => {
  const left = captures[a], right = captures[b];
  return { left: left.path, right: right.path,
    positionEqual: JSON.stringify(left.position) === JSON.stringify(right.position),
    basesEqual: JSON.stringify(left.bases) === JSON.stringify(right.bases),
    scanEqual: JSON.stringify(left.cells) === JSON.stringify(right.cells) };
});
const matched = pairs.every(p => p.positionEqual && p.basesEqual && p.scanEqual);
console.log(JSON.stringify({ schema: 'seed-observation-comparison-v1', outcome: matched ? 'matched-observed-initial-state' : 'different-observed-initial-state',
  seed: captures[0].seed, pairs, captures,
  scope: 'Two fresh starts per engine; initial position, ten friendly bases and local scan only. Unobserved cells, other seeds, later random draws and combat are unverified. Not full-galaxy equality or Docker verification.' }, null, 2));
process.exitCode = matched ? 0 : 1;
