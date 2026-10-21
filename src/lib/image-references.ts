import type { Provider } from './ai-shared';

export interface ImageReference { id:string; name:string; mimeType:string; dataUrl:string; }
export const MAX_REFERENCE_BYTES=4*1024*1024;
export const MAX_REFERENCE_TOTAL=8*1024*1024;
export const MAX_REFERENCES=3;

// Unknown/custom models may accept images; their endpoint remains the authority.
export function imageCapability(provider:Provider,model:string):boolean|undefined {
  const m=model.toLowerCase().replace(/^models\//,'');
  if(provider==='gemini'&&/^gemini-(?:2|[3-9])/.test(m)&&!/embedding/.test(m))return true;
  if(provider==='openai'&&/^(?:o3-mini|o1-mini|gpt-3\.5)/.test(m))return false;
  if(provider==='openai'&&/^(?:gpt-4o|gpt-4\.1|gpt-[5-9]|o3(?:$|-20|-pro|-deep-research)|o4-mini)/.test(m))return true;
  if(provider==='groq'&&/^(?:qwen\/qwen3\.8-27b|meta-models\/muse-spark-open)$/.test(m))return true;
  if(/(?:^|\/)gpt-oss-|(?:^|\/)llama-3|(?:^|\/)deepseek-r1|^gpt-3\.5/.test(m))return false;
  if(provider==='nvidia'&&/^nvidia\/nemotron-3\.5-super-vl-/.test(m))return true;
  return undefined;
}

export function validateImageReferences(value:unknown):ImageReference[] {
  if(value==null)return [];
  if(!Array.isArray(value)||value.length>MAX_REFERENCES)throw new Error('Attach up to 3 reference images.');
  let total=0;
  return value.map((item,index)=>{
    if(!item||typeof item!=='object'||typeof item.dataUrl!=='string'||item.dataUrl.length>Math.ceil(MAX_REFERENCE_BYTES/3)*4+80)throw new Error('Each reference image must be 4 MB or smaller.');
    const match=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(item.dataUrl);
    if(!match||match[2].length%4!==0||item.mimeType!==match[1])throw new Error('Use a PNG, JPEG, or WebP reference image.');
    const raw=atob(match[2]);
    const png=raw.startsWith('\x89PNG\r\n\x1a\n');
    const jpeg=raw.startsWith('\xff\xd8\xff');
    const webp=raw.startsWith('RIFF')&&raw.slice(8,12)==='WEBP';
    if(!(match[1]==='image/png'?png:match[1]==='image/jpeg'?jpeg:webp))throw new Error('This image’s contents do not match its file type.');
    total+=raw.length;
    if(raw.length>MAX_REFERENCE_BYTES||total>MAX_REFERENCE_TOTAL)throw new Error('Keep reference images under 4 MB each and 8 MB combined.');
    return {id:typeof item.id==='string'?item.id.slice(0,80):`reference-${index}`,name:typeof item.name==='string'?item.name.slice(0,120):`Reference ${index+1}`,mimeType:match[1],dataUrl:item.dataUrl};
  });
}

export function isSnapshot(value:unknown):value is string {
  return typeof value==='string'&&value.length<350000&&/^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(value);
}
