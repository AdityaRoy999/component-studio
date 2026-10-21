'use client';
import { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, Check, X, Loader2, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { motion, useReducedMotion } from 'motion/react';
import { useLenis } from 'lenis/react';
import ModernSelect from '@/components/ui/ModernSelect';
import ProviderLogo from './ProviderLogo';
import ModelPicker from './ModelPicker';
import { preferredModel } from '@/lib/model-selection';
import type { AvailableModel, Provider } from '@/lib/ai';
import { MAX_MODEL_PROFILES, profileLabel, validateModelSetup, type ModelProfile, type ModelSetup } from '@/lib/model-profiles';

interface Props {isOpen:boolean;onClose:()=>void;apiKey:string;provider:Provider;model:string;baseUrl:string;serverConfigured?:boolean;profiles:ModelProfile[];activeProfileId:string;onSave:(value:ModelSetup)=>void;}
const providers=[{value:'gemini',label:'Gemini'},{value:'openai',label:'OpenAI'},{value:'groq',label:'Groq'},{value:'openrouter',label:'OpenRouter'},{value:'nvidia',label:'NVIDIA'},{value:'custom',label:'Custom provider'}];
type ServerProvider={configured:boolean;model:string;baseUrl?:string};

export default function ApiKeyModal(props:Props) {
  const lenis=useLenis();
  useEffect(()=>{lenis?.stop();return()=>{lenis?.start();};},[lenis]);
  const initialProfiles=useRef(props.profiles.length?props.profiles:[{id:'profile-default',name:'',apiKey:props.apiKey,provider:props.provider,model:props.model,baseUrl:props.baseUrl}]);
  const [profiles,setProfiles]=useState(initialProfiles.current);
  const [editingId,setEditingId]=useState(props.activeProfileId||initialProfiles.current[0].id);
  const [activeId,setActiveId]=useState(props.activeProfileId||initialProfiles.current[0].id);
  const [name,setName]=useState(initialProfiles.current.find(item=>item.id===(props.activeProfileId||initialProfiles.current[0].id))?.name||'');
  const [key,setKey]=useState(props.apiKey);const [provider,setProvider]=useState<Provider>(props.provider);
  const [model,setModel]=useState(props.model);const [baseUrl,setBaseUrl]=useState(props.baseUrl);const [show,setShow]=useState(false);
  const [server,setServer]=useState<Record<string,ServerProvider>>({});
  const [models,setModels]=useState<AvailableModel[]>([]);const [loadingModels,setLoadingModels]=useState(false);const [modelsError,setModelsError]=useState('');const [refresh,setRefresh]=useState(0);
  const [manual,setManual]=useState(false);const manualRef=useRef(false);manualRef.current=manual;
  const [status,setStatus]=useState<'idle'|'testing'|'success'|'error'>('idle');const [message,setMessage]=useState('');
  const custom=provider==='custom';const credentialsReady=custom?Boolean(baseUrl.trim()||server.custom?.baseUrl):Boolean(key.trim()||server[provider]?.configured);
  const selectedModel=model.trim()||(!manual?server[provider]?.model||'':'');
  const ready=credentialsReady&&Boolean(selectedModel);
  const busy=status==='testing';const ref=useRef<HTMLDivElement>(null);const close=useRef(props.onClose);close.current=props.onClose;
  const reduced=useReducedMotion();const request=useRef<AbortController|null>(null);

  useEffect(()=>{
    const previous=document.activeElement as HTMLElement;const overflow=document.body.style.overflow;
    document.body.style.overflow='hidden';ref.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const controller=new AbortController();
    fetch('/api/providers',{signal:controller.signal}).then(r=>r.json()).then(data=>{if(!controller.signal.aborted)setServer(Object.fromEntries((data.providers||[]).map((p:ServerProvider&{id:string})=>[p.id,p])));}).catch(()=>{});
    function keydown(event:KeyboardEvent){
      if(event.key==='Escape'&&!event.defaultPrevented&&!(event.target instanceof Element&&event.target.closest('.model-picker-menu')))close.current();if(event.key!=='Tab')return;
      const elements=ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)');if(!elements?.length)return;
      const first=elements[0],last=elements[elements.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
    document.addEventListener('keydown',keydown);
    return()=>{controller.abort();request.current?.abort();document.body.style.overflow=overflow;document.removeEventListener('keydown',keydown);previous?.focus();};
  },[]);

  useEffect(()=>{
    setModels([]);setModelsError('');setLoadingModels(false);
    if(!credentialsReady)return;
    if(custom){try{const url=new URL(baseUrl.trim()||server.custom?.baseUrl||'');if(!['http:','https:'].includes(url.protocol))return;}catch{return;}}
    const controller=new AbortController();setLoadingModels(true);
    const timer=setTimeout(async()=>{
      try{
        const response=await fetch('/api/providers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'models',provider,apiKey:key.trim()||undefined,baseUrl:custom?baseUrl.trim()||undefined:undefined}),signal:controller.signal});
        const data=await response.json();if(!response.ok)throw new Error(data.error||'Could not load models.');
        if(controller.signal.aborted)return;
        const available:AvailableModel[]=data.models||[];setModels(available);
        if(!available.length){setModelsError('No models were returned. You can enter a model ID manually.');return;}
        if(!manualRef.current)setModel(current=>current.trim()?current:preferredModel(provider,available,current,server[provider]?.model));
      }catch(error){if(!controller.signal.aborted)setModelsError(error instanceof Error?error.message:'Could not load models.');}
      finally{if(!controller.signal.aborted)setLoadingModels(false);}
    },650);
    return()=>{clearTimeout(timer);controller.abort();};
  },[provider,key,baseUrl,server,refresh,credentialsReady,custom]);

  function reset(){request.current?.abort();setStatus('idle');setMessage('');}
  const defaultModelFor = (p: Provider) => server[p]?.model || (p === 'gemini' ? 'gemini-2.5-flash' : p === 'openai' ? 'gpt-4.1-mini' : p === 'groq' ? 'openai/gpt-oss-120b' : p === 'openrouter' ? 'openai/gpt-4.1-mini' : p === 'nvidia' ? 'nvidia/nemotron-3-nano-3' : '');
  function currentProfiles(){return profiles.map(item=>item.id===editingId?{id:editingId,name,apiKey:key,provider,model:selectedModel,baseUrl:custom?baseUrl:''}:item);}
  function editProfile(profile:ModelProfile){setEditingId(profile.id);setName(profile.name);setKey(profile.apiKey);setProvider(profile.provider);setModel(profile.model);setBaseUrl(profile.baseUrl);setShow(false);setManual(false);reset();}
  function chooseProfile(id:string){const next=currentProfiles();setProfiles(next);if(id===editingId)setActiveId(id);const chosen=next.find(item=>item.id===id);if(chosen)editProfile(chosen);}
  function addProfile(){if(profiles.length>=MAX_MODEL_PROFILES)return;const defaultModel=defaultModelFor(provider);const added:ModelProfile={id:crypto.randomUUID(),name:'',provider,apiKey:key,baseUrl:custom?baseUrl:'',model:defaultModel};const next=[...currentProfiles(),added];setProfiles(next);editProfile(added);}
  function removeProfile(){if(profiles.length===1)return;const next=profiles.filter(item=>item.id!==editingId);setProfiles(next);if(activeId===editingId)setActiveId(next[0].id);editProfile(next.find(item=>item.id===activeId)||next[0]);}
  function changeProvider(value:string){
    const p = value as Provider;
    const known = profiles.find(item=>item.provider===p && item.apiKey) || profiles.find(item=>item.provider===p);
    const defaultModel = defaultModelFor(p);
    setProvider(p);setKey(known?.apiKey||'');setModel(known?.model||defaultModel);setBaseUrl(p==='custom'?(known?.baseUrl||''):'');setManual(false);setShow(false);reset();
  }
  async function test(){
    request.current?.abort();const controller=new AbortController();request.current=controller;setStatus('testing');setMessage('Checking your provider…');
    try{
      const response=await fetch('/api/providers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider,apiKey:key.trim()||undefined,model:selectedModel||undefined,baseUrl:custom?baseUrl.trim()||undefined:undefined}),signal:controller.signal});
      const data=await response.json();if(!response.ok)throw new Error(data.error);
      if(!controller.signal.aborted){setStatus('success');setMessage(data.message);}
    }catch(error){if(!controller.signal.aborted){setStatus('error');setMessage(error instanceof Error?error.message:'Could not connect.');}}
  }
  function save(){
    try{const setup=validateModelSetup({version:1,profiles:currentProfiles(),activeId},server);props.onSave(setup);props.onClose();}
    catch(error){setStatus('error');setMessage(error instanceof Error?error.message:'Could not save model configurations.');}
  }
  return <motion.div data-lenis-prevent className="modal-backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onMouseDown={event=>{if(event.target===event.currentTarget)props.onClose();}}>
    <motion.div ref={ref} role="dialog" aria-modal="true" aria-labelledby="ai-settings-title" data-lenis-prevent className="settings-modal settings-profiles-modal" initial={reduced?false:{opacity:0,scale:.96,y:18}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.98,y:8}} transition={{type:'spring',stiffness:280,damping:28}}>
      <div className="settings-title-row"><div><h2 id="ai-settings-title">AI settings</h2><p className="settings-intro">Keep your models ready. Choose one for each generation.</p></div><button className="icon-button" aria-label="Close AI settings" onClick={props.onClose}><X size={20}/></button></div>
      <div className="settings-columns">
        <aside className="settings-profile-sidebar" aria-label="Model configurations">
          <div className="settings-profile-heading"><span>Configured models</span><span>{profiles.length}/{MAX_MODEL_PROFILES}</span></div>
          <div className="settings-profile-list">{currentProfiles().map(profile=><button key={profile.id} type="button" className={`settings-profile-item ${profile.id===editingId?'selected':''}`} aria-pressed={profile.id===editingId} aria-label={`Edit ${profileLabel(profile)}`} disabled={busy} onClick={()=>chooseProfile(profile.id)}><ProviderLogo provider={profile.provider}/><span className="settings-profile-copy"><strong>{profile.name.trim()||providers.find(item=>item.value===profile.provider)?.label}</strong><small title={profile.model}>{profile.model||'Choose a model'}</small></span>{profile.id===activeId&&<span className="settings-active-badge"><Check size={12}/><span className="sr-only">Active model</span></span>}</button>)}</div>
          <button type="button" className="button button-quiet settings-add-profile" disabled={busy||profiles.length>=MAX_MODEL_PROFILES} onClick={addProfile}><Plus size={15}/>Add model</button>
          <p className="settings-profile-note">All configurations are saved together. One model is used per generation.</p>
        </aside>
        <div className="settings-profile-editor" key={editingId}>
          <div className="settings-profile-editor-heading"><button type="button" className={`settings-use-profile ${activeId===editingId?'active':''}`} aria-pressed={activeId===editingId} disabled={busy} onClick={()=>setActiveId(editingId)}><Check size={13}/>{activeId===editingId?'Active model':'Use this model'}</button><button type="button" className="icon-button" disabled={busy||profiles.length===1} aria-label="Remove configuration" title="Remove this configuration" onClick={removeProfile}><Trash2 size={16}/></button></div>
          <div><label htmlFor="profile-name" className="field-label">Configuration name<span>Optional</span></label><input id="profile-name" className="settings-input" maxLength={80} value={name} disabled={busy} onChange={event=>{setName(event.target.value);reset();}} placeholder="e.g. Fast builds or Visual references"/></div>
      <div><span className="field-label">AI provider</span><ModernSelect label="AI provider" value={provider} onChange={changeProvider} disabled={busy} options={providers.map(item=>({...item,icon:<ProviderLogo provider={item.value}/>}))}/></div>
      {custom&&<div><label htmlFor="provider-url" className="field-label">API base URL<span>OpenAI-compatible</span></label><input id="provider-url" className="settings-input" type="url" value={baseUrl} autoComplete="off" spellCheck={false} disabled={busy} onChange={event=>{setBaseUrl(event.target.value);reset();}} placeholder={server.custom?.baseUrl||'http://localhost:11434/v1'}/><div className="endpoint-presets"><button onClick={()=>{setBaseUrl('http://localhost:11434/v1');reset();}}>Local server</button><button onClick={()=>{setBaseUrl('https://integrate.api.nvidia.com/v1');reset();}}>NVIDIA NIM</button></div></div>}
      <div><label htmlFor="provider-key" className="field-label">API key<span>{custom?'If required by your endpoint':server[provider]?.configured?'Server key available':'Your provider key'}</span></label><div className="key-field"><input id="provider-key" type={show?'text':'password'} value={key} autoComplete="off" spellCheck={false} disabled={busy} onChange={event=>{setKey(event.target.value);reset();}} placeholder={custom?'Leave blank for a keyless local server':server[provider]?.configured?'Use server key, or paste your own':'Paste your API key'}/><button className="icon-button" disabled={busy} aria-label={show?'Hide API key':'Show API key'} onClick={()=>setShow(!show)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></div>
      <div className="settings-model-section">
        <div className="field-label"><label htmlFor={manual?'provider-model':undefined}>Model</label><div className="model-field-actions"><button disabled={busy} onClick={()=>{setManual(!manual);reset();}}>{manual?'Choose from list':'Enter model ID'}</button><button className="model-refresh" disabled={!credentialsReady||loadingModels||busy} aria-label="Refresh models" onClick={()=>setRefresh(value=>value+1)}><RefreshCw size={14} className={loadingModels?'animate-spin':''}/></button></div></div>
        {manual?<input id="provider-model" className="settings-input" aria-label="Model ID" value={model} autoComplete="off" spellCheck={false} disabled={busy} onChange={event=>{setModel(event.target.value);reset();}} placeholder={server[provider]?.model||'Enter the exact model ID'}/>:<ModelPicker models={models} value={model} onChange={value=>{setModel(value);reset();}} loading={loadingModels} disabled={busy}/>}
        <p className={modelsError?'model-list-feedback model-list-error':'model-list-feedback'} role={modelsError?'alert':'status'}>{loadingModels?'Loading available models…':modelsError|| (models.length?`${models.length} models loaded from your provider`:custom?'Enter your endpoint to load its models.':'Enter your API key to load available models.')}</p>
      </div>
        </div>
      </div>
      <p className="settings-privacy">Your key is stored in this browser and sent through this app’s server to your selected provider.</p>
      {message&&<p role={status==='error'?'alert':'status'} className={status==='error'?'form-error':'settings-feedback'}>{busy&&<Loader2 size={14} className="animate-spin"/>}{message}</p>}
      <div className="settings-footer"><div className="settings-footer-secondary"><button className="button button-quiet" onClick={props.onClose}>Cancel</button><button className="button button-quiet" disabled={busy||!ready} onClick={test}>Test connection</button></div><button className="button button-primary" disabled={busy} onClick={save}>Save configurations<Check size={14}/></button></div>
    </motion.div>
  </motion.div>;
}
