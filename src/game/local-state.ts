import { WordBlock, objectArray, wordArray } from '../compat/memory.ts';
import type { WordMemory } from '../compat/memory.ts';
import { localLayout } from '../generated/local-layout.ts';
import { ListLocals } from './list-state.ts';
import { ScanScreen } from './scan-screen.ts';
import { EntryIdentity } from './pregame.ts';
import { PointLocals } from './points.ts';
import { DistanceMemory } from './romulan-target.ts';
import { SupernovaMemory } from './supernova.ts';
import { TorpedoMemory } from './torpedoes.ts';
import { SavedShip } from './lifecycle.ts';
import type { WordReference } from './lifecycle.ts';
import type { CommonLogical } from './common-state.ts';
import type { CheckOutput } from './check.ts';

// Codec bridges a raw word and the runtime's opaque floating representation.
// Conversion/rounding semantics remain supplied; no JavaScript float default.
export type RealWordCodec<R> = { decode(word: bigint): R; encode(value: R): bigint };
type View = keyof typeof localLayout;
export type LocalAddresses = Partial<Record<typeof localLayout[View]['block'], bigint>>;
function property(target: object, name: string, ref: WordReference, number = false): void {
  Object.defineProperty(target, name, { enumerable: true, get: () => number ? Number(ref.value) : ref.value,
    set: n => { ref.value = BigInt(n); } });
}
function reference(memory: WordMemory, address: bigint): WordReference {
  return { get value() { return memory.read(address); }, set value(n) { memory.write(address, n); } };
}

// Named local COMMONs use link-map bases by default. Each job maps private
// backing words. All LOCAL views intentionally share one base, including the
// LIST/SCAN/pre-game overlays; constructing these views writes no source word.
export function localState(memory: WordMemory, addresses: LocalAddresses = {}) {
  const block = <N extends View>(name: N) => new WordBlock(memory, localLayout[name], addresses[localLayout[name].block]);
  const listBlock = block('list'), main = block('local');
  const list = Object.create(ListLocals.prototype) as ListLocals;
  Object.defineProperty(list, 'outputWords', { value: wordArray(memory, listBlock.base, listBlock.field('lstlz').offset + 1) });
  for (const key of ['lstfz', 'romctr', 'romlst', 'rxf', 'plnctr', 'lstlz'] as const)
    Object.defineProperty(list, key, { value: listBlock.ref(key) });
  Object.defineProperty(list, 'targetFlags', { value: listBlock.ref('txf') });
  for (const key of ['shpctr', 'shplst', 'sxf', 'basctr', 'bxf', 'plnlst', 'pxf'] as const) {
    const d = listBlock.field(key).dimensions[0];
    Object.defineProperty(list, key, { value: objectArray(d.length + d.lower, i => listBlock.ref(key, i)) });
  }
  Object.defineProperty(list, 'baslst', { value: objectArray(3, side => objectArray(11, index => listBlock.ref('baslst', index, side))) });
  for (const key of ['cmd', 'svpos', 'shpos', 'p', 'vpos', 'hpos', 'vposc', 'hposc', 'code', 'object', 'index', 'side'])
    property(list, key, listBlock.ref(key), true);
  for (const key of ['omask', 'smask', 'lmask', 'imask', 'ships', 'range', 'gxf', 'clsest', 'xf', 'grpbts'])
    property(list, key, listBlock.ref(key));
  // Port context fields outside LSTVAR; LIST refreshes these on entry.
  list.team = 0; list.password = false;

  const distanceBlock = block('distance'), novaBlock = block('supernova'), torpedoBlock = block('torpedo');
  const distance = Object.assign(Object.create(DistanceMemory.prototype), {
    words: wordArray(memory, distanceBlock.base, distanceBlock.layout.words),
    field(column: 0 | 1 | 2 | 3, index: bigint) { return distanceBlock.ref(['v', 'h', 'iv', 'z'][column], index); },
  }) as DistanceMemory;
  const supernova = Object.assign(Object.create(SupernovaMemory.prototype), {
    words: wordArray(memory, novaBlock.base, novaBlock.layout.words),
    at(offset: bigint) { return reference(memory, novaBlock.base + offset); },
  }) as SupernovaMemory;
  const torpedo = Object.assign(Object.create(TorpedoMemory.prototype), {
    words: wordArray(memory, torpedoBlock.base, torpedoBlock.layout.words),
    target(row: bigint, column: bigint) { return torpedoBlock.ref('torpl', row, column); },
  }) as TorpedoMemory;
  return {
    block, list, distance, supernova, torpedo,
    words: wordArray(memory, main.base, main.layout.words),
    identity: new EntryIdentity(wordArray(memory, main.base, 6)),
    scan: new ScanScreen(wordArray(memory, main.base, main.layout.words), true),
    users: block('users').array('line', 90, [1]),
    message: block('message').array('msg', 16, [1]),
    // DECWAR declares nine TOTAL words, whereas POINTS names four plus flags.
    total: block('total').array('total', 10, [0]),
    savedShip(dummy: WordReference): SavedShip {
      const b = block('savedShip'), saved = Object.create(SavedShip.prototype) as SavedShip;
      property(saved, 'tship', b.ref('tship'));
      for (const key of ['tshpco', 'tshpda', 'tjob', 'dum'] as const) {
        const length = b.field(key).words, oneBased = key !== 'dum';
        Object.defineProperty(saved, key, { value: b.array(key, length + Number(oneBased), [oneBased ? 0 : 1]) });
      }
      // FREE's standalone DUMMY is not in FRLOCL; caller supplies its storage.
      Object.defineProperty(saved, 'dummy', { value: dummy }); return saved;
    },
    points(policy: CommonLogical): PointLocals {
      const b = block('points'), points = Object.create(PointLocals.prototype) as PointLocals;
      Object.defineProperty(points, 'total', { value: b.array('total', 5, [0]) });
      for (const key of ['fflg', 'eflg', 'rflg', 'iflg'] as const) Object.defineProperty(points, key, {
        enumerable: true, get: () => policy.logical(b.read(key)), set: n => b.write(key, n ? policy.trueWord : policy.falseWord),
      });
      property(points, 'owidth', b.ref('owidth'), true); return points;
    },
    check<R>(codec: RealWordCodec<R>): CheckOutput<R> {
      const b = block('check'), path = {} as CheckOutput<R>;
      for (const key of ['h1', 'v1', 'h2', 'v2', 'dcode']) property(path, key, b.ref(key));
      for (const key of ['dhs', 'dvs']) Object.defineProperty(path, key, {
        enumerable: true, get: () => codec.decode(b.read(key)), set: (n: R) => b.write(key, codec.encode(n)),
      });
      return path;
    },
  };
}
