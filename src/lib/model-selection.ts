import type { Provider } from './ai-shared';
export function preferredModel(provider:Provider,models:{id:string}[],current='',configured=''){
  const available=new Set(models.map(item=>item.id));
  for(const id of [current,configured,...(provider==='groq'?['openai/gpt-oss-120b','qwen/qwen3.8-27b','llama-3.3-70b-versatile']:provider==='nvidia'?['qwen/qwen3-coder-480b-a35b-instruct','moonshotai/kimi-k2-instruct']:[])])if(id&&available.has(id))return id;
  return models.find(item=>!/whisper|tts|orpheus|embed|guard|safeguard|rerank/i.test(item.id))?.id||models[0]?.id||'';
}
