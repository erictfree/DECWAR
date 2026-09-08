import test from 'node:test';
import assert from 'node:assert/strict';
import { objectiveIds, objectiveChecks, objectivesReport, type ObjectiveCase, type ObjectiveFrame } from '../objectives.ts';
const status: ObjectiveFrame['status'] = { observedAt: 1, stardate: 1, position: { v: 20, h: 20 }, energy: 4800, hullDamage: 0, torpedoes: 10, shieldsUp: true, shieldPercent: 100, docked: false, condition: 'Green' };
const planet = { name: 'planet', kind: 'planet' as const, faction: 'FEDERATION' as const, position: { v: 20, h: 21 }, builds: 4, observedAt: 1 };
const before: ObjectiveFrame = { status, target: planet, baseCount: 10, symbol: '@F' };
test('fifth build at capacity verifies rejection, not conversion', () => {
  const c: ObjectiveCase = { event: 'objective-case', id: 'conversion', command: 'BUILD ABSOLUTE 20 21', response: 'All Fed Bases still functional, captain.', before, after: before };
  assert.ok(Object.values(objectiveChecks(c)).every(Boolean));
  assert.equal(objectiveChecks({ ...c, after: { ...before, target: { ...planet, builds: 5 } } }).fourBuildsRetained, false);
});
test('conversion with capacity requires new base symbol and count increment', () => {
  const c: ObjectiveCase = { event: 'objective-case', id: 'conversion', command: 'BUILD ABSOLUTE 20 21', response: 'converted', before: { ...before, baseCount: 9 }, after: { ...before, target: { ...planet, kind: 'base' }, symbol: '<>' } };
  assert.ok(Object.values(objectiveChecks(c)).every(Boolean));
  assert.equal(objectiveChecks({ ...c, after: { ...c.after!, baseCount: 9 } }).countIncrement, false);
});
test('capture checks ownership despite unequal defensive-hit resource changes', () => {
  const c: ObjectiveCase = { event: 'objective-case', id: 'capture', command: 'CAPTURE ABSOLUTE 20 21', response: 'capturing neutral planet', before: { ...before, target: { ...planet, faction: 'NEUTRAL', builds: 0 } }, after: { ...before, status: { ...status, energy: 4790, shieldPercent: 90 }, target: { ...planet, builds: 0 } } };
  assert.ok(Object.values(objectiveChecks(c)).every(Boolean));
  assert.equal(objectiveChecks({ ...c, after: { ...c.after!, target: { ...planet, faction: 'NEUTRAL', builds: 0 } } }).ownedAfter, false);
});
test('missing objective setup cannot be reported as parity success', () => {
  assert.equal(objectivesReport([], []).outcome, 'incomplete');
});
test('matching capacity rejections cannot imply new-base docking coverage', () => {
  const events = (backend: string) => [
    { event: 'configuration', backend, scenario: 'objectives-v1' },
    ...objectiveIds.map(id => id === 'conversion'
      ? { event: 'objective-case', id, command: 'BUILD ABSOLUTE 20 21', response: 'All Fed Bases still functional, captain.', before, after: before }
      : { event: 'objective-case', id, skip: 'Unavailable fixture' }),
    { event: 'complete' }, { event: 'cleanup-complete' },
  ];
  const report = objectivesReport(events('typescript'), events('pdp10'));
  assert.equal(report.comparison.cases.find(c => c.id === 'conversion')?.result, 'matched-capacity-rejection');
  assert.equal(report.comparison.cases.find(c => c.id === 'dock-new-base')?.result, 'skipped-precondition');
  assert.equal(report.outcome, 'incomplete');
});
