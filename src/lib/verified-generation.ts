import type { ComponentPreset } from '@/data/presets';
import type { GenerationMetrics } from './generation-events';

export const MAX_GENERATION_REQUESTS=3;
export type VerificationResult={ok:true}|{ok:false;error:string;kind?:'runtime'|'timeout'|'compile'};
export type RuntimeRepair={component:ComponentPreset;error:string};
export type GenerationResult={component:ComponentPreset;model:string;metrics?:GenerationMetrics};

export function runtimeDiagnostic(error:string,props:Record<string,unknown>,theme:'dark'|'light'){
  const values=JSON.stringify({...props,theme});
  const types=Object.fromEntries(Object.entries(props).map(([name,value])=>[name,Array.isArray(value)?'array':value===null?'null':typeof value]));
  return `${error.slice(0,1100)}\nRendered props (exact host values): ${values.length<=900?values:values.slice(0,900)+'…'}\nProp types: ${JSON.stringify(types).slice(0,300)}`;
}

export async function runVerifiedGeneration(options:{
  request:(remaining:number,repair?:RuntimeRepair)=>Promise<GenerationResult>;
  verify:(component:ComponentPreset)=>Promise<VerificationResult>;
  signal:AbortSignal;
  checking:()=>void;
  repairing:(error:string,attempt:number)=>void;
}){
  const started=Date.now(),seen=new Set<string>(),metrics:GenerationMetrics[]=[];
  let used=0,repair:RuntimeRepair|undefined;
  while(used<MAX_GENERATION_REQUESTS){
    options.signal.throwIfAborted();
    const result=await options.request(MAX_GENERATION_REQUESTS-used,repair);
    used+=Math.max(1,result.metrics?.requests||1);if(result.metrics)metrics.push(result.metrics);
    options.signal.throwIfAborted();options.checking();
    const validation=await options.verify(result.component);options.signal.throwIfAborted();
    if(validation.ok){
      const total=(key:'inputTokens'|'outputTokens')=>metrics.length&&metrics.every(m=>m[key]!=null)?metrics.reduce((sum,m)=>sum+m[key]!,0):undefined;
      return {...result,metrics:{durationMs:Date.now()-started,firstTokenMs:metrics[0]?.firstTokenMs,requests:used,repairs:metrics.reduce((sum,m)=>sum+m.repairs,0),inputTokens:total('inputTokens'),outputTokens:total('outputTokens'),status:'success'} satisfies GenerationMetrics};
    }
    if(validation.kind==='timeout')throw new Error(validation.error);
    const message=validation.error.split('\n')[0].slice(0,500);
    const signature=JSON.stringify([result.component.code,result.component.cssCode,result.component.files,result.component.propsSchema,validation.error]);
    if(seen.has(signature))throw new Error(`The same preview error repeated without progress: ${message}. Automatic repair stopped. Retry or choose another model.`);
    seen.add(signature);
    if(used>=MAX_GENERATION_REQUESTS)throw new Error(`The preview still failed after ${used} model attempts: ${message}. Automatic repair stopped. Retry or choose another model.`);
    repair={component:result.component,error:validation.error.slice(0,2400)};options.repairing(repair.error,used);
  }
  throw new Error('The model attempt limit was reached. Retry your message.');
}
