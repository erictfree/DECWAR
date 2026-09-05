import type { WordMemory } from './memory.ts';

// WARMAC.MAC:551-569, after RADIX 8. C+1 is P1; F and T0 are AC0.
// AC14 (octal) has no named assignment here. Construction never initializes ACs.
const addresses={f:0n,t0:0n,t1:1n,t2:2n,t3:3n,t4:4n,x1:5n,x2:6n,x3:7n,x4:0o10n,
  c:0o11n,p1:0o12n,cNext:0o12n,p2:0o13n,s:0o15n,arg:0o16n,p:0o17n} as const;
export type MachineRegisters={ -readonly [K in keyof typeof addresses]:bigint };
export function machineRegisters(memory:WordMemory):MachineRegisters{
  const registers={} as MachineRegisters;
  for(const [name,address] of Object.entries(addresses))Object.defineProperty(registers,name,{
    enumerable:true,get:()=>memory.read(address),set:(word:bigint)=>memory.write(address,word),
  });
  return registers;
}
