import { NextRequest, NextResponse } from 'next/server';
import { generateComponent, isProvider, ProviderError } from '@/lib/ai';
import { validateImageReferences } from '@/lib/image-references';
import { revisionContext } from '@/lib/generation-context';
import { generatedFiles } from '@/lib/generated-files';
import { parseGenerationSkill } from '@/lib/generation-skill';
export const runtime = 'nodejs';
// Stay within Vercel Hobby's five-minute function limit.
export const maxDuration = 300;
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if(!body||typeof body!=='object'||Array.isArray(body))return NextResponse.json({error:'Send a component request object.'},{status:400});
    if(body.thinkingEffort!=null&&!['off','low','medium','high'].includes(body.thinkingEffort))return NextResponse.json({error:'Choose a valid thinking depth.'},{status:400});
    if(body.theme!=null&&!['dark','light'].includes(body.theme))return NextResponse.json({error:'Choose a valid preview theme.'},{status:400});
    if(typeof body.prompt !== 'string' || !body.prompt.trim() || body.prompt.length > 12000) return NextResponse.json({error:'Describe your component in 12,000 characters or fewer.'},{status:400});
    if(!isProvider(body.provider)) return NextResponse.json({error:'Choose a supported AI provider.'},{status:400});
    if(body.apiKey != null && typeof body.apiKey !== 'string' || body.model != null && typeof body.model !== 'string' || body.baseUrl != null && typeof body.baseUrl !== 'string') return NextResponse.json({error:'Invalid provider settings.'},{status:400});
    if(body.context != null && (typeof body.context.code!=='string'||body.context.code.length>1000000||body.context.cssCode!=null&&(typeof body.context.cssCode!=='string'||body.context.cssCode.length>1000000)))return NextResponse.json({error:'Invalid component context.'},{status:400});
    let images;try{images=validateImageReferences(body.images);}catch(error){return NextResponse.json({error:(error as Error).message},{status:400});}
    let skill:string|undefined;
    if(body.skill!=null)try{skill=parseGenerationSkill(body.skill).markdown;}catch(error){return NextResponse.json({error:(error as Error).message,code:'invalid_skill'},{status:400});}
    const memory=revisionContext(body.memory);
    if(body.context)body.context.files=generatedFiles(body.context.files);
    const input={images,skill,prompt:body.prompt.trim(),provider:body.provider,apiKey:body.apiKey,model:body.model,baseUrl:body.baseUrl,styling:body.styling==='CSS'?'CSS' as const:'Tailwind' as const,context:body.context,memory,thinkingEffort:body.thinkingEffort,theme:body.theme};
    if(body.stream===true){
      const abort=new AbortController();let closed=false;const encoder=new TextEncoder();
      request.signal.addEventListener('abort',()=>abort.abort(),{once:true});
      const stream=new ReadableStream({
        async start(controller){
          const send=(event:unknown)=>{if(!closed)controller.enqueue(encoder.encode(JSON.stringify(event)+'\n'));};
          try{const result=await generateComponent({...input,signal:abort.signal,onEvent:send});send({type:'done',...result});}
          catch(error){if(!abort.signal.aborted)send({type:'error',message:error instanceof ProviderError?error.message:'Generation could not finish. Please retry your message.',code:error instanceof ProviderError?error.code:'generation_failed'});}
          finally{if(!closed){closed=true;controller.close();}}
        },
        cancel(){closed=true;abort.abort();},
      });
      return new Response(stream,{headers:{'Content-Type':'application/x-ndjson','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no'}});
    }
    const result = await generateComponent({...input,signal:request.signal});
    return NextResponse.json({success:true,source:'ai',...result},{headers:{'Cache-Control':'no-store'}});
  } catch(error) {
    if(error instanceof ProviderError) return NextResponse.json({error:error.message,code:error.code},{status:error.status});
    return NextResponse.json({error:'Could not process the request. Check the description and try again.'},{status:400});
  }
}
