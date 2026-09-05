import { AsyncLocalStorage } from 'node:async_hooks';
import { createVariantContext, type VariantContext } from './variant.ts';

// A context belongs to one host/world. Scope every generator resume explicitly:
// constructing a generator inside AsyncLocalStorage.run does not scope next().
// There is no process-wide mutable "selected variant" or environment lookup.
const execution=new AsyncLocalStorage<VariantContext>();
const baseline=createVariantContext('compuserve','historical-diagnostic');
export function currentVariant():VariantContext{return execution.getStore()??baseline;}
export function withVariant<T>(context:VariantContext,action:()=>T):T{return execution.run(context,action);}
export function variantGenerator<Y,R,N>(context:VariantContext,source:Generator<Y,R,N>):Generator<Y,R,N>{
  return {
    next(...args:[]|[N]){return withVariant(context,()=>source.next(...args));},
    return(value:R){return withVariant(context,()=>source.return(value));},
    throw(error:unknown){return withVariant(context,()=>source.throw(error));},
    [Symbol.iterator](){return this;},
    [Symbol.dispose](){withVariant(context,()=>source[Symbol.dispose]());},
  };
}
