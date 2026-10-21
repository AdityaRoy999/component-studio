import { supportsThinking, type Provider, type ThinkingEffort } from './ai-shared';

export function generationOptions(provider:Provider,model:string,effort?:ThinkingEffort,advertisedLimit?:number,minimumBudget=0){
  const compatible:Record<string,unknown>={};
  const gemini:Record<string,unknown>={responseMimeType:'application/json'};
  // Leave room for complete source without paying for the model's entire output window by default.
  const modelLimit=typeof advertisedLimit==='number'&&Number.isSafeInteger(advertisedLimit)&&advertisedLimit>0?advertisedLimit:
    provider==='groq'&&/^openai\/gpt-oss-(?:120|20)b$/.test(model)?65536:undefined;
  const budget=Math.max(effort==='high'?16384:effort==='medium'?12288:8192,minimumBudget);
  const limit=provider==='custom'&&!modelLimit?undefined:Math.min(modelLimit||32768,budget);
  if(limit){
    if(provider==='gemini')gemini.maxOutputTokens=limit;
    else compatible[provider==='openai'||provider==='groq'?'max_completion_tokens':'max_tokens']=limit;
  }
  if(provider==='openai'){
    if(supportsThinking(provider,model)&&effort)compatible.reasoning_effort=effort==='off'?'low':effort;
  }
  if(provider==='groq'&&supportsThinking(provider,model)&&effort)compatible.reasoning_effort=effort==='off'?'low':effort;
  if(provider==='nvidia'&&supportsThinking(provider,model)){
    compatible.chat_template_kwargs={enable_thinking:effort?effort!=='off':false};
    if(/^nvidia\/nemotron-3\.5-super-vl-/i.test(model)&&effort&&effort!=='off')compatible.reasoning_effort=effort;
  }
  if(provider==='gemini'&&supportsThinking(provider,model)&&effort){
    gemini.thinkingConfig=/^gemini-2\.5/i.test(model)
      ? {thinkingBudget:effort==='off'&&/flash/i.test(model)?0:effort==='high'?8192:effort==='medium'?4096:1024}
      : {thinkingLevel:effort==='off'?'LOW':effort.toUpperCase()};
  }
  return {compatible,gemini};
}
