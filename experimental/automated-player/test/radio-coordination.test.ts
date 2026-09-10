import test from 'node:test';
import assert from 'node:assert/strict';
import { extractRadioMessages, parseRadio, radioMessage, tellAll } from '../radio-coordination.ts';

test('Radio messages sound like ordinary DECWAR traffic and retain target coordinates', () => {
  const text = radioMessage({ kind: 'strike-base', position: { v: 14, h: 22 }, text: '' });
  assert.equal(text, 'Enemy base confirmed at 14-22. Strike group converge.');
  assert.deepEqual(parseRadio(text), { kind: 'strike-base', position: { v: 14, h: 22 }, text });
  assert.equal(tellAll('FEDERATION', { kind: 'explore', text: '' }), 'TELL FEDERATION; We have a foothold. Keep building and scouting the frontier.');
});

test('Radio parser tolerates human wording and preserves unknown traffic', () => {
  assert.equal(parseRadio('We are low on torpedoes, falling back to base.').kind, 'resupply');
  assert.equal(parseRadio('Base under attack, nearby ships support immediately.').kind, 'support');
  assert.equal(parseRadio('Anyone seen the Romulans?').kind, 'unknown');
});

test('Radio inbox extracts delivered messages from ordinary command output', () => {
  const messages = extractRadioMessages('Message from Wolf to  E N D\r\n Enemy base confirmed at 14-22. Strike group converge.\r\n\r\nCommand: ');
  assert.equal(messages.length, 1);
  assert.deepEqual(messages[0], { kind: 'strike-base', position: { v: 14, h: 22 }, text: 'Enemy base confirmed at 14-22. Strike group converge.' });
});
