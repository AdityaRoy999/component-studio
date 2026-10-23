import { NextRequest, NextResponse } from 'next/server';
import { generateComponent, isProvider, ProviderError } from '@/lib/ai';
import { validateImageReferences } from '@/lib/image-references';
import { revisionContext } from '@/lib/generation-context';
import { generatedFiles } from '@/lib/generated-files';
import { parseGenerationSkill } from '@/lib/generation-skill';
import { generationStream } from '@/lib/generation-stream';
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
    if(body.runtimeError!=null&&(typeof body.runtimeError!=='string'||!body.runtimeError.trim()||body.runtimeError.length>2400||!body.context))return NextResponse.json({error:'A runtime repair needs source and a concise browser diagnostic.'},{status:400});
    if(body.requestBudget!=null&&(!Number.isInteger(body.requestBudget)||body.requestBudget<1||body.requestBudget>3))return NextResponse.json({error:'Choose one to three model attempts.'},{status:400});
    let images;try{images=validateImageReferences(body.images);}catch(error){return NextResponse.json({error:(error as Error).message},{status:400});}
    let skill:string|undefined;
    if(body.skill!=null)try{skill=parseGenerationSkill(body.skill).markdown;}catch(error){return NextResponse.json({error:(error as Error).message,code:'invalid_skill'},{status:400});}
    const memory=revisionContext(body.memory);
    if(body.context){
      const source=body.context;
      if(['name','title','description'].some(key=>source[key]!=null&&(typeof source[key]!=='string'||source[key].length>2400))||source.propsSchema!=null&&(!Array.isArray(source.propsSchema)||source.propsSchema.length>30))return NextResponse.json({error:'Invalid component metadata.'},{status:400});
      body.context={code:source.code,cssCode:source.cssCode,files:generatedFiles(source.files),name:source.name,title:source.title,description:source.description,propsSchema:source.propsSchema};
    }
    const input={images,skill,prompt:body.prompt.trim(),provider:body.provider,apiKey:body.apiKey,model:body.model,baseUrl:body.baseUrl,styling:body.styling==='CSS'?'CSS' as const:'Tailwind' as const,context:body.context,runtimeError:body.runtimeError,requestBudget:body.requestBudget,memory,thinkingEffort:body.thinkingEffort,theme:body.theme};
    if(body.stream===true){
      const requestId=crypto.randomUUID();
      const stream=generationStream({
        signal:request.signal,
        generate:(signal,onEvent)=>generateComponent({...input,signal,onEvent}),
        error:error=>({message:error instanceof ProviderError?error.message:'Generation could not finish. Please retry your message.',code:error instanceof ProviderError?error.code:'generation_failed'}),
        report:diagnostic=>console.info('[generation]',JSON.stringify({requestId,provider:input.provider,...diagnostic})),
      });
      return new Response(stream,{headers:{'Content-Type':'application/x-ndjson','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no','X-Generation-Request-Id':requestId}});
    }
    const result = await generateComponent({...input,signal:request.signal});
    return NextResponse.json({success:true,source:'ai',...result},{headers:{'Cache-Control':'no-store'}});
  } catch(error) {
    if(error instanceof ProviderError) return NextResponse.json({error:error.message,code:error.code},{status:error.status});
    return NextResponse.json({error:'Could not process the request. Check the description and try again.'},{status:400});
  }
}
