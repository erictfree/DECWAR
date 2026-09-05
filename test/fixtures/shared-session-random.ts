import type { pregameRuntimeFixture } from './pregame-runtime.ts';
// Install before or after main binding: spread copies of weapon IO delegate
// dynamically through weapon.random, so CHECK and damage use this same seed.
// Caller supplies FSC word semantics; this function chooses no float codec.
export function bindSharedSessionRandom(f:Pick<ReturnType<typeof pregameRuntimeFixture>,'tell'|'r'|'weapon'|'io'>,fsc:(word:bigint,scale:bigint)=>Generator<string,bigint,void>){
  const random=f.tell.random;
  random.io.fscT0=function*(scale){f.r.t0=yield*fsc(f.r.t0,scale);};
  f.weapon.random.ran=function*(zero){return yield*random.ran(BigInt(zero));};
  f.weapon.random.iran=function*(max){return yield*random.iran(BigInt(max));};
  // MOVE's repair/displacement IRAN historically had a separate fixture source.
  f.io.iran=function*(max){return yield*random.iran(BigInt(max));};
  return random;
}
