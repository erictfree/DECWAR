import test from 'node:test';
import assert from 'node:assert/strict';
import { behaviorIds, behaviorReport, movementChecks, rejectionChecks, dockingChecks, threatensFixture, evaluateBehavior } from '../behavior.ts';
import type { ShipStatus } from '../../automated-player/observations.ts';
const ship: ShipStatus = { observedAt: 0, stardate: 0, position: { v: 10, h: 10 }, energy: 4992, hullDamage: 0, torpedoes: 10, shieldPercent: 100, shieldsUp: true, docked: false, condition: 'Green' };
test('fixture standoff permits distant bases while rejecting defense range and mobile targets', () => {
  const base = { kind: 'base' as const, name: 'Emp Base', faction: 'EMPIRE' as const, position: { v: 10, h: 20 }, observedAt: 0 };
  assert.equal(threatensFixture(ship.position, [base]), false);
  assert.equal(threatensFixture(ship.position, [{ ...base, position: { v: 10, h: 14 } }]), true);
  assert.equal(threatensFixture(ship.position, [{ ...base, kind: 'ship' }]), true);
  assert.equal(threatensFixture(ship.position, [{ ...base, position: undefined }]), true);
});
test('movement checks detect failure to arrive and incorrect energy despite equal distance', () => {
  const next = { v: 11, h: 10 }, after = { ...ship, position: next, energy: 4984 };
  assert.ok(Object.values(movementChecks(ship, after, next)).every(Boolean));
  assert.equal(movementChecks(ship, { ...after, energy: 4983 }, next).energyCost, false);
  assert.equal(movementChecks(ship, { ...after, position: { v: 9, h: 10 } }, next).destinationReached, false);
  assert.equal(rejectionChecks(ship, after).positionUnchanged, false);
});
test('single-base docking clamps supplies and distinguishes first versus repeated repair', () => {
  const before = { ...ship, energy: 3000, torpedoes: 2, hullDamage: 250, shieldPercent: 50 };
  const after = { ...before, energy: 4000, torpedoes: 10, hullDamage: 150, shieldPercent: 70, docked: true };
  assert.ok(Object.values(dockingChecks(before, after)).every(Boolean));
  assert.equal(dockingChecks({ ...before, docked: true }, after).hullRepaired, false);
});
test('coordinate rejection preserves docking, whereas impulse-range rejection clears it', () => {
  const before = { ...ship, docked: true };
  const invalid = { event: 'behavior-case' as const, id: 'invalid-coordinate', before, after: before, command: 'MOVE ABSOLUTE 0 0', response: 'X coordinate lies outside galaxy.', checks: { undocked: false } };
  assert.ok(Object.values(evaluateBehavior(invalid)).every(Boolean), 'recompute from evidence even when old recorded checks were incorrect');
  assert.equal(evaluateBehavior({ ...invalid, after: ship }).dockingState, false);
  const range = { ...invalid, id: 'impulse-range', command: 'IMPULSE ABSOLUTE 12 10', response: 'Maximum speed warp 1.' };
  assert.equal(evaluateBehavior(range).dockingState, false);
  assert.ok(Object.values(evaluateBehavior({ ...range, after: ship })).every(Boolean));
});
test('equal failing contracts and skipped fixtures are never parity passes', () => {
  const events = (backend: string) => [{ event: 'configuration', backend, scenario: 'behavior-v1' }, ...behaviorIds.map(id => ({ event: 'behavior-case', id, checks: { energyCost: false }, command: 'MOVE', response: 'same' })), { event: 'complete' }, { event: 'cleanup-complete' }];
  assert.equal(behaviorReport(events('typescript'), events('pdp10')).outcome, 'differences');
  const left: Record<string, unknown>[] = events('typescript'); left[1] = { event: 'behavior-case', id: behaviorIds[0], skip: 'No safe path' };
  assert.equal(behaviorReport(left, events('pdp10')).outcome, 'incomplete');
});

test('complete successful contracts pass, but missing rejection diagnostics do not', () => {
  const next = { v: 11, h: 10 }, moved = { ...ship, position: next, energy: ship.energy - 8 };
  const docked = { ...ship, energy: 5000, docked: true };
  const events = (backend: string): Record<string, unknown>[] => [
    { event: 'configuration', backend, scenario: 'behavior-v1' },
    ...behaviorIds.map(id => {
      const move = id === 'warp-step' || id === 'impulse-step';
      const after = id === 'dock' ? docked : move ? moved : ship;
      const command = id === 'invalid-coordinate' ? 'MOVE ABSOLUTE 0 0' : id === 'impulse-range' ? 'IMPULSE ABSOLUTE 12 10' : id === 'dock' ? 'DOCK' : `${id === 'warp-step' ? 'MOVE' : 'IMPULSE'} ABSOLUTE 11 10`;
      return { event: 'behavior-case', id, command, before: ship, after,
        checks: id === 'dock' ? dockingChecks(ship, after) : move ? movementChecks(ship, after, next) : { ...rejectionChecks(ship, after), undocked: true },
        response: id === 'invalid-coordinate' ? 'X coordinate lies outside galaxy.' : id === 'impulse-range' ? 'Maximum speed warp 1.' : 'done' };
    }), { event: 'complete', cases: 5 }, { event: 'cleanup-complete' },
  ];
  assert.equal(behaviorReport(events('typescript'), events('pdp10')).outcome, 'matched-selected-output');
  const a = events('typescript'), b = events('pdp10'); a[1]!.response = ''; b[1]!.response = '';
  assert.equal(behaviorReport(a, b).comparison.cases[0]!.result, 'failed-state-contract');
});
