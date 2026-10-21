export const PROVIDERS = ['gemini', 'openai', 'groq', 'openrouter', 'nvidia', 'custom'] as const;
export type Provider = typeof PROVIDERS[number];
export type ThinkingEffort = 'off' | 'low' | 'medium' | 'high';

export function supportsThinking(provider: Provider, model: string): boolean {
  const m = (model || '').toLowerCase();
  if (provider === 'gemini') return /^gemini-(?:2\.5|[3-9])/i.test(m);
  if (provider === 'openai') return /^(?:o1|o3|o4|gpt-[5-9])/i.test(m)&&!/chat-latest/.test(m);
  if (provider === 'nvidia') return /^nvidia\/nemotron-(?:3[.-]|nano-3)/i.test(m);
  if (provider === 'groq') return /^openai\/gpt-oss-(?:20b|120b)$/i.test(m);
  return false;
}

export function canDisableThinking(provider:Provider,model:string){
  return provider==='nvidia'&&supportsThinking(provider,model)||provider==='gemini'&&/^gemini-2\.5-flash/i.test(model);
}
