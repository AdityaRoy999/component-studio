import { PROVIDERS, type Provider } from './ai-shared';

export interface ModelConfiguration {apiKey:string;provider:Provider;model:string;baseUrl:string;}
export interface ModelProfile extends ModelConfiguration {id:string;name:string;}
export interface ModelSetup {version:1;profiles:ModelProfile[];activeId:string;}
export interface ProfileServer {configured:boolean;model:string;baseUrl?:string;}
export const MODEL_PROFILES_KEY='studio_model_profiles_v1';
export const MAX_MODEL_PROFILES=20;
type StorageReader=Pick<Storage,'getItem'>;

export function profileLabel(profile:Pick<ModelProfile,'name'|'provider'|'model'>){
  return profile.name.trim()||`${profile.provider==='nvidia'?'NVIDIA':profile.provider==='openai'?'OpenAI':profile.provider==='openrouter'?'OpenRouter':profile.provider==='groq'?'Groq':profile.provider==='gemini'?'Gemini':'Custom'}${profile.model?' · '+profile.model:''}`;
}
function validProfile(value:unknown):value is ModelProfile {
  if(!value||typeof value!=='object')return false;
  const item=value as ModelProfile;
  return typeof item.id==='string'&&item.id.length>0&&item.id.length<=100&&typeof item.name==='string'&&item.name.length<=80&&PROVIDERS.includes(item.provider)&&typeof item.apiKey==='string'&&item.apiKey.length<=16000&&typeof item.model==='string'&&item.model.length<=150&&typeof item.baseUrl==='string'&&item.baseUrl.length<=2000;
}
export function readModelSetup(storage:StorageReader):ModelSetup {
  try{
    const saved=storage.getItem(MODEL_PROFILES_KEY);
    if(saved){const value=JSON.parse(saved);if(value?.version===1&&Array.isArray(value.profiles)&&value.profiles.length>0&&value.profiles.length<=MAX_MODEL_PROFILES&&value.profiles.every(validProfile)&&new Set(value.profiles.map((item:ModelProfile)=>item.id)).size===value.profiles.length){return {version:1,profiles:value.profiles,activeId:value.profiles.some((item:ModelProfile)=>item.id===value.activeId)?value.activeId:value.profiles[0].id};}}
  }catch{/* An older or damaged settings record must not hide the legacy configuration. */}
  const savedProvider=storage.getItem('reactbits_provider');
  const provider=PROVIDERS.includes(savedProvider as Provider)?savedProvider as Provider:'gemini';
  return {version:1,activeId:'profile-default',profiles:[{id:'profile-default',name:'',provider,apiKey:storage.getItem('reactbits_api_key')||'',model:storage.getItem('reactbits_model')||'',baseUrl:provider==='custom'?storage.getItem('reactbits_base_url')||'':''}]};
}
export function validateModelSetup(input:ModelSetup,server:Record<string,ProfileServer>):ModelSetup {
  if(!Array.isArray(input.profiles)||!input.profiles.length||input.profiles.length>MAX_MODEL_PROFILES||!input.profiles.every(validProfile)||new Set(input.profiles.map(item=>item.id)).size!==input.profiles.length||!input.profiles.some(item=>item.id===input.activeId))throw new Error('Choose an active model and keep between 1 and 20 configurations.');
  const profiles=input.profiles.map(profile=>{
    const label=profileLabel(profile),config=server[profile.provider];
    const model=profile.model.trim();
    const apiKey=profile.apiKey.trim();let baseUrl=profile.provider==='custom'?profile.baseUrl.trim()||config?.baseUrl||'':'';
    if(!/^[A-Za-z0-9._:/@-]{1,150}$/.test(model))throw new Error(`${label}: choose a model or enter a valid model ID.`);
    if(profile.provider==='custom'){
      try{const url=new URL(baseUrl);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw new Error();baseUrl=url.href.replace(/\/+$/,'');}catch{throw new Error(`${label}: enter an HTTP or HTTPS API base URL without credentials or query parameters.`);}
    }else if(!apiKey&&!config?.configured)throw new Error(`${label}: add a provider key before saving.`);
    return {id:profile.id,name:profile.name.trim(),provider:profile.provider,apiKey,model,baseUrl};
  });
  return {version:1,profiles,activeId:input.activeId};
}
export function writeModelSetup(storage:Pick<Storage,'setItem'>,setup:ModelSetup){
  // One record keeps the active selection and all of its credentials in sync.
  storage.setItem(MODEL_PROFILES_KEY,JSON.stringify(setup));
}
