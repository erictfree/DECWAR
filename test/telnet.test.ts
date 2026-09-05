import test from 'node:test';
import assert from 'node:assert/strict';
import { TelnetCodec, TelnetEncoder } from '../src/transport/telnet.ts';

test('Telnet negotiation is independent of packet fragmentation', () => {
  const wire = Buffer.from([255, 251, 1, 77, 255, 253, 3, 79, 13, 0, 86, 255, 250, 24, 1, 2, 255, 255, 3, 255, 240, 69, 13, 10, 255, 244]);
  for (let split = 0; split <= wire.length; split++) {
    const codec = new TelnetCodec();
    const parts = [codec.feed(wire.subarray(0, split)), codec.feed(wire.subarray(split))];
    assert.equal(Buffer.concat(parts.map(part => part.data)).toString('ascii'), 'MO\rVE\r\n');
    assert.deepEqual([...Buffer.concat(parts.map(part => part.reply))], [255, 254, 1, 255, 251, 3]);
    assert.equal(parts.reduce((sum, part) => sum + part.interrupts, 0), 1);
  }
});

test('Character/echo offers are acknowledged without loops and echo can be disabled',()=>{
  const codec=new TelnetCodec();
  assert.deepEqual([...codec.begin()],[255,251,3,255,251,1]);assert.equal(codec.begin().length,0);
  assert.equal(codec.echoEnabled,false);
  assert.equal(codec.feed(Buffer.from([255,253,3,255,253,1,255,253,1])).reply.length,0);
  assert.equal(codec.echoEnabled,true);
  assert.deepEqual([...codec.feed(Buffer.from([255,254,1,255,254,1])).reply],[255,252,1]);
  assert.equal(codec.echoEnabled,false);
  assert.deepEqual([...codec.feed(Buffer.from([255,253,1])).reply],[255,251,1]);
});

test('Keyboard endpoint delivers CR, CR-NUL and CR-LF as one LF across packet boundaries',()=>{
  const input=Buffer.from('A\r\0B\r\nC\rD\n\r\0\n\x1b');
  for(let split=0;split<=input.length;split++){
    const codec=new TelnetCodec(true),parts=[codec.feed(input.subarray(0,split)),codec.feed(input.subarray(split))];
    assert.equal(Buffer.concat(parts.map(p=>p.data)).toString('latin1'),'A\nB\nC\nD\n\n\n\x1b');
  }
  assert.equal(new TelnetCodec().feed(Buffer.from('\r\0')).data.toString('latin1'),'\r');
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
