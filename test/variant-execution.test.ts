import test from 'node:test';
import assert from 'node:assert/strict';
import { createVariantContext } from '../src/runtime/variant.ts';
import { currentVariant, withVariant, variantGenerator } from '../src/runtime/variant-execution.ts';
import { constants,ships,outputTables,commonLayout,fortranDataWords,romulanText } from '../src/runtime/variant-values.ts';
import { AddressSpace,CommonBlock } from '../src/compat/memory.ts';

test('Interleaved generator resumes select their own roster, bounds and layout without global changes',()=>{
  function* probe(){
    const m=new AddressSpace(),layout=commonLayout.hiseg;
    m.map(BigInt(layout.address),Array<bigint>(layout.words).fill(0n));const high=new CommonBlock(m,'hiseg');
    const last=constants.KNPLAY;high.write('bits',BigInt(last),last);
    yield [last,ships.at(-1)?.name,high.field('shpcon').dimensions[0].length];
    yield [constants.KNPLAY,ships.length,outputTables.lngshp.length,high.read('bits',last)];
    return currentVariant().definition.id;
  }
  const a=variantGenerator(createVariantContext('austin'),probe());
  const c=variantGenerator(createVariantContext('compuserve'),probe());
  assert.deepEqual(a.next().value,[18,'Wolf',18]);assert.deepEqual(c.next().value,[10,'Wolf',10]);
  assert.deepEqual(a.next().value,[18,18,18,18n]);assert.deepEqual(c.next().value,[10,10,10,10n]);
  assert.equal(constants.KNPLAY,10);assert.equal(a.next().value,'austin');assert.equal(c.next().value,'compuserve');
});

test('Variant scope covers asynchronous continuations and restores callers after nested errors',async()=>{
  await Promise.all(['austin','compuserve'].map(async id=>{
    const context=createVariantContext(id as 'austin'|'compuserve');
    await withVariant(context,async()=>{
      await new Promise<void>(resolve=>setImmediate(resolve));
      assert.equal(currentVariant(),context);
      assert.throws(()=>withVariant(createVariantContext(id==='austin'?'compuserve':'austin'),()=>{throw new Error('nested');}),/nested/);
      assert.equal(currentVariant(),context);
    });
  }));
  assert.equal(currentVariant().definition.id,'compuserve');
});

test('Generator cancellation and thrown exceptions run cleanup in the owning variant',()=>{
  const observed:string[]=[];
  function* probe():Generator<void,void,void>{try{yield;}catch{observed.push(currentVariant().definition.id);}finally{observed.push(currentVariant().definition.id);}}
  const a=variantGenerator(createVariantContext('austin'),probe());a.next();a.throw(new Error('cancel'));
  const b=variantGenerator(createVariantContext('austin'),probe());b.next();b.return();
  assert.deepEqual(observed,['austin','austin','austin']);assert.equal(constants.KNPLAY,10);
});

test('Variant data views retain array semantics, enumerate actual tables, and reject writes',()=>{
  withVariant(createVariantContext('austin'),()=>{
    assert.ok(Array.isArray(ships));assert.equal(Object.keys(ships).length,18);
    assert.equal(JSON.parse(JSON.stringify(ships)).length,18);
    assert.equal(fortranDataWords.length,251);assert.equal(romulanText.nodes.length,0);
    assert.throws(()=>Reflect.set(constants,'KNPLAY',10),/immutable/);
    assert.throws(()=>Object.defineProperty(constants,'KNPLAY',{value:10}),/immutable/);
    assert.throws(()=>Reflect.deleteProperty(constants,'KNPLAY'),/immutable/);
    assert.equal(Reflect.set(ships[0],'name','Replacement'),false);
  });
});
