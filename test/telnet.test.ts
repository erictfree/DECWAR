import test from 'node:test';
import assert from 'node:assert/strict';
import { TelnetCodec, TelnetEncoder } from '../src/transport/telnet.ts';

test('Telnet negotiation is independent of packet fragmentation', () => {
  const wire = Buffer.from([255, 251, 1, 77, 255, 253, 3, 79, 13, 0, 86, 255, 250, 24, 1, 2, 255, 255, 3, 255, 240, 69, 13, 10, 255, 244]);
  for (let split = 0; split <= wire.length; split++) {
    const codec = new TelnetCodec();
    const parts = [codec.feed(wire.subarray(0, split)), codec.feed(wire.subarray(split))];
    assert.equal(Buffer.concat(parts.map(part => part.data)).toString('ascii'), 'MO\rVE\r\n');
    assert.deepEqual([...Buffer.concat(parts.map(part => part.reply))], [255, 254, 1, 255, 252, 3]);
    assert.equal(parts.reduce((sum, part) => sum + part.interrupts, 0), 1);
  }
});

test('refusal loops stop; IAC escaping and discarded subnegotiation are bounded', () => {
  const codec = new TelnetCodec();
  assert.equal(codec.feed(Buffer.from([255, 251, 1])).reply.length, 3);
  assert.equal(codec.feed(Buffer.from([255, 251, 1])).reply.length, 0);
  assert.deepEqual([...codec.feed(Buffer.from([255, 255])).data], [255]);
  codec.feed(Buffer.from([255, 250]));
  assert.equal(codec.feed(Buffer.alloc(1000000, 65)).data.length, 0);
  assert.equal(codec.feed(Buffer.from([255, 240, 66])).data.toString(), 'B');
});

test('NVT output preserves CRLF across writes and escapes bare CR and IAC', () => {
  const input = Buffer.from([65, 13, 10, 66, 13, 67, 255, 13]);
  for (let split = 0; split <= input.length; split++) {
    const encoder = new TelnetEncoder();
    const result = Buffer.concat([encoder.encode(input.subarray(0, split)), encoder.encode(input.subarray(split)), encoder.flush()]);
    assert.deepEqual([...result], [65, 13, 10, 66, 13, 0, 67, 255, 255, 13, 0]);
  }
});

test('Every interrupt timing-mark request receives a reply, including fragmented repeats',()=>{
  const wire=Buffer.from([255,244,255,253,6,255,244,255,253,6]);
  for(let split=0;split<=wire.length;split++){
    const codec=new TelnetCodec(),parts=[codec.feed(wire.subarray(0,split)),codec.feed(wire.subarray(split))];
    assert.deepEqual([...Buffer.concat(parts.map(part=>part.reply))],[255,252,6,255,252,6]);
    assert.equal(parts.reduce((count,part)=>count+part.interrupts,0),2);
    assert.equal(Buffer.concat(parts.map(part=>part.data)).length,0);
  }
});
