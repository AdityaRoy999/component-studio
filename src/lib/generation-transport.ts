import type { GenerationEvent } from './generation-events';
import type { GenerationResult } from './verified-generation';

export class GenerationTransportError extends Error {
  constructor(readonly reason:'fetch_failed'|'empty_body'|'invalid_event'|'read_failed'|'early_close'='fetch_failed',readonly requestId?:string) {
    super(`The connection to Component Studio was interrupted before the build finished. Your message and received source are kept. Retry this message to continue.${requestId?` Reference: ${requestId} (${reason}).`:''}`);
  }
}

// A terminal event completes the protocol; do not wait for the proxy to close.
export async function readGenerationResponse(response:Response, signal:AbortSignal, onEvent:(event:GenerationEvent)=>void):Promise<GenerationResult> {
  const header=response.headers.get('x-generation-request-id');
  const requestId=header&&/^[a-f0-9-]{36}$/i.test(header)?header:undefined;
  if(!response.ok){
    const data=await response.json().catch(()=>null);
    throw new Error(typeof data?.error==='string'?data.error:`The build server could not start this request (HTTP ${response.status}). Please retry.`);
  }
  if(!response.body)throw new GenerationTransportError('empty_body',requestId);
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='';
  function event(line:string):GenerationResult|undefined {
    if(!line.trim())return;
    let value:GenerationEvent;
    try{value=JSON.parse(line);if(!value||typeof value!=='object'||typeof value.type!=='string')throw new Error();}catch{throw new GenerationTransportError('invalid_event',requestId);}
    if(value.type==='error')throw new Error(value.message+(requestId?` Reference: ${requestId} (${value.code}).`:''));
    onEvent(value);
    if(value.type==='done')return value;
  }
  try{
    while(true){
      signal.throwIfAborted();
      let part:ReadableStreamReadResult<Uint8Array>;
      try{part=await reader.read();}catch{signal.throwIfAborted();throw new GenerationTransportError('read_failed',requestId);}
      buffer+=part.done?decoder.decode():decoder.decode(part.value,{stream:true});
      let end:number;
      while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);const result=event(line);if(result)return result;}
      if(part.done){const result=event(buffer);if(result)return result;throw new GenerationTransportError('early_close',requestId);}
    }
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
}
