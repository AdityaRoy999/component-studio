import type { GenerationEvent } from './generation-events';
import type { GenerationResult } from './verified-generation';

type StreamDiagnostic={event:'started'|'phase'|'completed'|'failed'|'request_cancelled'|'reader_cancelled'|'write_failed';phase?:string;code?:string;requests?:number;sourceChars?:number;durationMs:number};

// Keep every open response terminal, including a cancelled incoming request.
// Diagnostics deliberately exclude prompts, source, credentials and provider bodies.
export function generationStream(options:{
  signal:AbortSignal;
  generate:(signal:AbortSignal,send:(event:GenerationEvent)=>void)=>Promise<GenerationResult>;
  error:(error:unknown)=>{message:string;code:string};
  report:(diagnostic:StreamDiagnostic)=>void;
}){
  const abort=new AbortController(),encoder=new TextEncoder(),started=Date.now();
  let closed=false,heartbeat:ReturnType<typeof setInterval>|undefined,sourceChars=0,requests=0;
  let requestAbort=()=>{};
  const report=(event:StreamDiagnostic['event'],extra:Partial<StreamDiagnostic>={})=>options.report({event,durationMs:Date.now()-started,requests,sourceChars,...extra});
  const cleanup=()=>{clearInterval(heartbeat);options.signal.removeEventListener('abort',requestAbort);};
  return new ReadableStream<Uint8Array>({
    async start(controller){
      const write=(event?:GenerationEvent)=>{
        if(closed)return;
        try{controller.enqueue(encoder.encode(event===undefined?'\n':JSON.stringify(event)+'\n'));}
        catch{closed=true;cleanup();report('write_failed');abort.abort();}
      };
      const finish=(event:GenerationEvent)=>{
        if(closed)return;
        write(event);
        if(!closed){closed=true;cleanup();controller.close();}
      };
      requestAbort=()=>{
        if(closed)return;
        report('request_cancelled');
        finish({type:'error',code:'request_cancelled',message:'The build request was cancelled before it finished. Your message and received source are kept. Retry this message.'});
        abort.abort();
      };
      options.signal.addEventListener('abort',requestAbort,{once:true});
      report('started');
      if(options.signal.aborted){requestAbort();return;}
      heartbeat=setInterval(()=>write(),10000);
      const send=(event:GenerationEvent)=>{
        if(closed)return;
        if(event.type==='source')sourceChars=event.code.length;
        if(event.type==='metrics')requests=event.metrics.requests;
        if(event.type==='status')report('phase',{phase:event.phase});
        write(event);
      };
      try{
        const result=await options.generate(abort.signal,send);
        if(!closed){requests=result.metrics?.requests||requests;report('completed');finish({type:'done',...result});}
      }catch(error){
        if(!closed){const failure=options.error(error);report('failed',{code:failure.code});finish({type:'error',...failure});}
      }finally{cleanup();}
    },
    cancel(){if(!closed){closed=true;cleanup();report('reader_cancelled');abort.abort();}},
  });
}
