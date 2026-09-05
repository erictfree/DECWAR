import { variantData as austin } from '../generated/variants/austin.ts';
import { variantData as compuserve } from '../generated/variants/compuserve.ts';

export type VariantId='austin'|'compuserve';
export type ExecutionMode='playable'|'historical-diagnostic';
function freeze<T>(value:T):T{
  if(value!==null&&typeof value==='object'&&!Object.isFrozen(value)){
    for(const child of Object.values(value))freeze(child);Object.freeze(value);
  }
  return value;
}
// Definitions are evidence bundles. Their existence does not declare that the
// full session composition implements every routine for that variant yet.
export const variantDefinitions=freeze({austin,compuserve});
export type VariantDefinition=typeof austin|typeof compuserve;
export type VariantContext={readonly definition:VariantDefinition;readonly execution:ExecutionMode};
export function variantDefinition(id:VariantId):VariantDefinition{return variantDefinitions[id];}
export function createVariantContext(id:VariantId,execution:ExecutionMode='playable'):VariantContext{
  return Object.freeze({definition:variantDefinition(id),execution});
}
