'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { flushSync } from 'react-dom';
import { createThemeTransition } from '@/lib/theme-transition';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react';
import { usePathname } from 'next/navigation';
import Navbar, { type StudioView } from '@/components/studio/Navbar';
import StudioIntro from '@/components/studio/StudioIntro';
import Stage from '@/components/studio/Stage';
import { PRESETS, type ComponentPreset } from '@/data/presets';
const GradientASCII = dynamic(()=>import('@/components/reactbits/GradientASCII'),{ssr:false});
const ComponentsCatalog = dynamic(()=>import('@/components/studio/ComponentsCatalog'));
const ApiKeyModal = dynamic(()=>import('@/components/studio/ApiKeyModal'));
import { isSnapshot, type ImageReference } from '@/lib/image-references';
import { readModelSetup, writeModelSetup, type ModelProfile, type ModelSetup } from '@/lib/model-profiles';
import type { Provider, ThinkingEffort } from '@/lib/ai-shared';
import type { BuildTurn, GenerationEvent } from '@/lib/generation-events';
import BuildWorkspace from '@/components/studio/BuildWorkspace';
const GenerationHistory=dynamic(()=>import('@/components/studio/GenerationHistory'));
const Thanks=dynamic(()=>import('@/components/studio/Thanks'));
const Featured=dynamic(()=>import('@/components/studio/Featured'));
import { createHistoryEntry, loadHistory, mergeHistory, saveHistory, findHistoryRevision, deleteHistory, readDraft, writeDraft, type WorkspaceDraft, type HistoryEntry } from '@/lib/generation-history';
import { carryCustomization } from '@/lib/generation-context';
interface ExportedSource { name:string; componentCode:string; cssCode?:string; filename:string; cssFilename:string; dependencies:string[]; }
const emptySource:ExportedSource={name:'Component',componentCode:'',filename:'Component.tsx',cssFilename:'Component.css',dependencies:[]};
const viewFromPath=(path:string):StudioView=>path==='/featured'?'featured':path==='/history'?'history':path==='/thanks'?'thanks':'studio';
export default function StudioPage() {
  const pathname=usePathname();const reduce=useReducedMotion();
  const [currentView,setCurrentView]=useState<StudioView>(viewFromPath(pathname));
  const [history,setHistory]=useState<HistoryEntry[]>([]);const [historyLoading,setHistoryLoading]=useState(true);const [historyError,setHistoryError]=useState('');
  const pendingHistory=useRef(new Map<string,HistoryEntry>());
  const [theme,setTheme]=useState<'dark'|'light'>('dark');
  const themeTarget=useRef<'dark'|'light'>('dark');
  const themeTransition=useRef<ReturnType<typeof createThemeTransition>|null>(null);
  const [component,setComponent]=useState<ComponentPreset|null>(null);
  const [language,setLanguage]=useState<'TS'|'JS'>('TS');
  const [styling,setStyling]=useState<'Tailwind'|'CSS'>('Tailwind');
  const [propValues,setPropValues]=useState<Record<string,any>>({});
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [apiKey,setApiKey]=useState(''); const [provider,setProvider]=useState<Provider>('gemini'); const [model,setModel]=useState(''); const [baseUrl,setBaseUrl]=useState('');
  const [modelProfiles,setModelProfiles]=useState<ModelProfile[]>([]);const [activeProfileId,setActiveProfileId]=useState('profile-default');
  const [thinkingEffort,setThinkingEffort]=useState<ThinkingEffort>('high');
  const [serverProviders,setServerProviders]=useState<Record<string,boolean>>({});
  const [isGenerating,setGenerating]=useState(false); const [generationError,setGenerationError]=useState('');
  const [exported,setExported]=useState<ExportedSource>(emptySource); const [sourceLoading,setSourceLoading]=useState(false); const [sourceError,setSourceError]=useState('');
  const generation=useRef<AbortController|null>(null);
  const [turns,setTurns]=useState<BuildTurn[]>([]);const [liveSource,setLiveSource]=useState('');
  const attemptContext=useRef<{id:string;component:ComponentPreset|null;propValues:Record<string,any>}|null>(null);
  const [draft,setDraft]=useState<{code:string;cssCode?:string}|null>(null);
  const [recovery,setRecovery]=useState<WorkspaceDraft|null>(null);const touched=useRef(false);const [draftError,setDraftError]=useState('');
  function changeView(view:StudioView){
    setCurrentView(view);if(view==='history')void refreshHistory();const path=view==='featured'?'/featured':view==='history'?'/history':view==='thanks'?'/thanks':'/';if(window.location.pathname!==path)window.history.pushState({},'',path);
  }
  async function refreshHistory(){
    setHistoryLoading(true);
    try{for(const entry of pendingHistory.current.values()){await saveHistory(entry);pendingHistory.current.delete(entry.id);}const saved=await loadHistory();setHistory(prev=>mergeHistory(saved,prev));setHistoryError('');}
    catch(error){setHistoryError(error instanceof Error?error.message:'History could not load.');}
    finally{setHistoryLoading(false);}
  }
  async function keepHistory(entry:HistoryEntry){
    setHistory(prev=>mergeHistory(prev,[entry]));pendingHistory.current.set(entry.id,entry);
    try{await saveHistory(entry);pendingHistory.current.delete(entry.id);if(!pendingHistory.current.size)setHistoryError('');}catch(error){setHistoryError(error instanceof Error?error.message:'This build could not be saved.');}
  }
  useEffect(()=>{
    void refreshHistory();void readDraft().then(saved=>{if(!touched.current)setRecovery(saved);}).catch(()=>{});

    const navigate=()=>setCurrentView(viewFromPath(window.location.pathname));window.addEventListener('popstate',navigate);
    try {
      const savedModels=readModelSetup(localStorage);const active=savedModels.profiles.find(item=>item.id===savedModels.activeId)!;
      setModelProfiles(savedModels.profiles);setActiveProfileId(savedModels.activeId);
      setApiKey(active.apiKey);setProvider(active.provider);setModel(active.model);setBaseUrl(active.baseUrl);
      const savedTheme=localStorage.getItem('reactbits_theme')==='light'?'light':'dark';
      themeTarget.current=savedTheme;setTheme(savedTheme); document.documentElement.classList.toggle('light',savedTheme==='light');document.documentElement.classList.toggle('dark',savedTheme==='dark');
    } catch { /* Storage may be disabled; the studio still works for this session. */ }
    fetch('/api/providers').then(r=>r.json()).then(data=>{
      const configured=Object.fromEntries((data.providers||[]).map((p:{id:string;configured:boolean})=>[p.id,p.configured]));setServerProviders(configured);

    }).catch(()=>{});
    return ()=>{generation.current?.abort();themeTransition.current?.dispose();window.removeEventListener('popstate',navigate);};
  },[]);
  useEffect(()=>{
    const isHome=currentView==='studio'&&!component&&!turns.length;
    document.documentElement.classList.toggle('is-home',isHome);
    document.body.classList.toggle('is-home',isHome);
    return ()=>{document.documentElement.classList.remove('is-home');document.body.classList.remove('is-home');};
  },[currentView,component,turns.length]);
  const toggleTheme=()=>{
    const next=themeTarget.current==='dark'?'light':'dark';themeTarget.current=next;
    themeTransition.current??=createThemeTransition(document);
    themeTransition.current.run(()=>{
      flushSync(()=>{setTheme(next);document.documentElement.classList.toggle('light',next==='light');document.documentElement.classList.toggle('dark',next==='dark');});
      try{localStorage.setItem('reactbits_theme',next);}catch{}
    },Boolean(reduce));
  };
  function saveConfig(setup:ModelSetup) {
    try{
      writeModelSetup(localStorage,setup);
      const active=setup.profiles.find(item=>item.id===setup.activeId)!;
      try{
        localStorage.setItem('reactbits_provider',active.provider);
        localStorage.setItem('reactbits_api_key',active.apiKey);
        localStorage.setItem('reactbits_model',active.model);
        localStorage.setItem('reactbits_base_url',active.baseUrl||'');
      }catch{}
    }catch{throw new Error('Your configurations could not be saved. Check browser storage and try again.');}
    const active=setup.profiles.find(item=>item.id===setup.activeId)!;
    setModelProfiles(setup.profiles);setActiveProfileId(setup.activeId);
    setApiKey(active.apiKey);setProvider(active.provider);setModel(active.model);setBaseUrl(active.baseUrl);setGenerationError('');
  }
  const selectComponent=useCallback((next:ComponentPreset)=>{
    generation.current?.abort();generation.current=null;setGenerating(false);
    touched.current=true;
    setTurns([]);setDraft(null);setLiveSource('');
    setComponent(next);changeView('studio');setGenerationError('');
    setPropValues(Object.fromEntries(next.propsSchema.map(item=>[item.name,item.defaultValue])));
  },[]);
  useEffect(()=>{
    if(!component){setExported(emptySource);return;}
    const controller=new AbortController();setSourceLoading(true);setSourceError('');setExported(emptySource);
    fetch('/api/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({component:{id:component.id,name:component.name,code:component.code,cssCode:component.cssCode},language,styling}),signal:controller.signal})
      .then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error);return data;})
      .then(data=>{if(!controller.signal.aborted)setExported(data);})
      .catch(error=>{if(!controller.signal.aborted)setSourceError(error.message||'Could not load the component source.');})
      .finally(()=>{if(!controller.signal.aborted)setSourceLoading(false);});
    return ()=>controller.abort();
  },[component,language,styling]);
  async function generate(prompt:string,images:ImageReference[]=[],retryId?:string) {
    if(isGenerating||generation.current||!prompt.trim())return false;
    const retry=retryId?turns.at(-1):undefined;
    if(retryId&&(!retry||retry.id!==retryId||retry.status==='working'))return false;
    const priorTurns=retry?turns.slice(0,-1):turns;
    const previousTurn=priorTurns.filter(turn=>turn.status==='done').at(-1);
    const previousRevision=retry&&previousTurn?history.find(entry=>entry.turns.at(-1)?.id===previousTurn.id):undefined;
    const base=retry&&attemptContext.current?.id===retry.id?attemptContext.current:
      retry?.status==='done'?{component:previousRevision?.component||null,propValues:previousRevision?.propValues||{}}:{component,propValues};
    const controller=new AbortController();generation.current=controller;setGenerating(true);setGenerationError('');
    touched.current=true;
    const id=retry?.id||crypto.randomUUID();
    let activeTurn:BuildTurn={id,prompt:prompt.trim(),images,events:[],status:'working'};
    let paintFrame=0;
    const paintTurn=()=>{
      paintFrame=0;if(controller.signal.aborted)return;
      const snapshot=activeTurn;
      setTurns(prev=>prev.map(turn=>turn.id===id?{...turn,...snapshot}:turn));
      if(snapshot.source!==undefined)setLiveSource(snapshot.source);
    };
    const updateTurn=(change:Partial<BuildTurn>,immediate=false)=>{
      activeTurn={...activeTurn,...change};
      if(immediate){cancelAnimationFrame(paintFrame);paintTurn();}
      else if(!paintFrame)paintFrame=requestAnimationFrame(paintTurn);
    };
    try{
      let configured=serverProviders;
      if(!apiKey.trim()&&configured[provider]===undefined){
        try{const response=await fetch('/api/providers',{signal:controller.signal});if(!response.ok)throw new Error();const data=await response.json();configured=Object.fromEntries((data.providers||[]).map((p:{id:string;configured:boolean})=>[p.id,p.configured]));setServerProviders(configured);}catch{if(controller.signal.aborted)return false;}
      }
      if(controller.signal.aborted)return false;
      if(provider==='custom'?(!configured.custom&&(!baseUrl.trim()||!model.trim())):(!apiKey.trim()&&!configured[provider])){setSettingsOpen(true);return false;}
      attemptContext.current={id,...base};
      changeView('studio');setTurns(prev=>retry?prev.map(turn=>turn.id===id?activeTurn:turn):[...prev,activeTurn]);setLiveSource('');
      setDraft(component?{code:component.code,cssCode:component.cssCode}:null);
      const r=await fetch('/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({prompt,images,apiKey:apiKey.trim()||undefined,provider,model:model.trim()||undefined,baseUrl:provider==='custom'?baseUrl.trim()||undefined:undefined,styling,theme,stream:true,thinkingEffort,memory:{messages:priorTurns.map(turn=>({prompt:turn.prompt,response:turn.response})),propValues:base.propValues},context:base.component?{code:base.component.code,cssCode:base.component.cssCode,files:base.component.files}:undefined}),signal:controller.signal});
      if(!r.ok){const data=await r.json();throw new Error(data.error||'Could not start this build.');}
      if(!r.body)throw new Error('The server returned an empty response. Please retry.');
      const reader=r.body.getReader();const decoder=new TextDecoder();let buffer='';let completed=false;
      function event(value:GenerationEvent){
        if(controller.signal.aborted)return;
        if(value.type==='status')updateTurn({events:[...activeTurn.events,{phase:value.phase,message:value.message}]});
        else if(value.type==='thinking')updateTurn({thinking:(activeTurn.thinking||'')+value.text});
        else if(value.type==='source')updateTurn({source:value.code});
        else if(value.type==='preview')setDraft({code:value.code,cssCode:value.cssCode});
        else if(value.type==='metrics')updateTurn({metrics:value.metrics});
        else if(value.type==='error')throw new Error(value.message);
        else if(value.type==='done'){completed=true;setComponent(value.component);const defaults=carryCustomization(value.component,base.component?base.propValues:{},base.component?.propsSchema);setPropValues(defaults);setDraft({code:value.component.code,cssCode:value.component.cssCode});updateTurn({metrics:value.metrics,status:'done',source:value.component.code,fileName:`${value.component.name}.tsx`,response:value.component.completionMessage||value.component.description},true);void keepHistory(createHistoryEntry({component:value.component,turns:[...priorTurns,activeTurn],provider,model:value.model,language,styling,propValues:defaults}));}
      }
      try{while(true){const {value,done}=await reader.read();buffer+=done?decoder.decode():decoder.decode(value,{stream:true});let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);if(line.trim())event(JSON.parse(line));}if(done)break;}if(buffer.trim())event(JSON.parse(buffer));}
      finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
      if(!completed&&!controller.signal.aborted)throw new Error('The connection ended before this build finished. Please retry your message.');
      return completed;
    }catch(error){if(!controller.signal.aborted){const message=error instanceof Error?error.message:'Could not reach the server. Please try again.';setGenerationError(message);updateTurn({status:'error',error:message},true);}return false;}
    finally{cancelAnimationFrame(paintFrame);if(generation.current===controller){generation.current=null;setGenerating(false);}}
  }
  const snapshotState=useRef({component,history,propValues,isGenerating});snapshotState.current={component,history,propValues,isGenerating};
  const saveSnapshot=useCallback((thumbnail:string)=>{const current=snapshotState.current;if(!isSnapshot(thumbnail)||current.isGenerating)return;const entry=findHistoryRevision(current.history,current.component);if(entry&&entry.thumbnail!==thumbnail)void keepHistory({...entry,thumbnail,propValues:current.propValues});},[]);
  function stop(){generation.current?.abort();generation.current=null;setGenerating(false);setTurns(prev=>prev.map(turn=>turn.status==='working'?{...turn,status:'stopped'}:turn));}
  function home(){stop();touched.current=true;setRecovery(null);void writeDraft(null).catch(()=>{});setComponent(null);setGenerationError('');setTurns([]);setDraft(null);setLiveSource('');changeView('studio');}
  function openHistory(entry:HistoryEntry){stop();touched.current=true;setRecovery(null);setComponent(entry.component);setTurns(entry.turns);setPropValues(entry.propValues);setLanguage(entry.language);setStyling(entry.styling);setDraft({code:entry.component.code,cssCode:entry.component.cssCode});setLiveSource(entry.component.code);setGenerationError('');changeView('studio');}
  useEffect(()=>{
    if(!touched.current)return;
    const timer=setTimeout(()=>{void writeDraft(component||turns.length?{component,turns,propValues,language,styling,liveSource,draft,savedAt:new Date().toISOString()}:null).then(()=>setDraftError('')).catch(error=>setDraftError(error.message));},650);
    return()=>clearTimeout(timer);
  },[component,turns,propValues,language,styling,liveSource,draft]);
  useEffect(()=>{
    if(!component||isGenerating)return;
    const timer=setTimeout(()=>{const entry=findHistoryRevision(history,component);if(entry&&JSON.stringify(entry.propValues)!==JSON.stringify(propValues))void keepHistory({...entry,propValues});},650);
    return()=>clearTimeout(timer);
  },[component,propValues,isGenerating,history]);
  function restoreDraft(){if(!recovery)return;touched.current=true;setComponent(recovery.component);setTurns(recovery.turns.map(turn=>turn.status==='working'?{...turn,status:'stopped'}:turn));setPropValues(recovery.propValues);setLanguage(recovery.language);setStyling(recovery.styling);setLiveSource(recovery.liveSource);setDraft(recovery.draft);setRecovery(null);changeView('studio');}
  function applySource(source:Pick<ComponentPreset,'code'|'cssCode'|'files'>){if(!component)return;touched.current=true;const origin=findHistoryRevision(history,component);const updated={...component,...source};setComponent(updated);setDraft(source);setLiveSource(source.code);void keepHistory({...createHistoryEntry({component:updated,turns,propValues,language,styling,provider:origin?.provider||provider,model:origin?.model||model}),id:'edit-'+crypto.randomUUID()});}
  async function removeSaved(id:string){try{await deleteHistory(id);pendingHistory.current.delete(id);setHistory(prev=>prev.filter(item=>item.id!==id));}catch(error){setHistoryError((error as Error).message);}}
  async function importSaved(entries:HistoryEntry[]){for(const entry of entries)await saveHistory(entry);setHistory(prev=>mergeHistory(prev,entries));}
  const stageExtras={onSourceApply:applySource};
  const activeChatTitle = (currentView === 'studio' && turns.length > 0)
    ? (component?.title?.trim() || (() => {
        const clean = (turns[0]?.prompt || '')
          .replace(/^(build|create|make|generate|design|add|give me|a|an|the)\s+/gi, '')
          .trim();
        if (!clean) return 'Component Studio';
        const words = clean.split(/\s+/).slice(0, 5);
        return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
      })())
    : undefined;

  return <StudioIntro enabled={pathname==='/'}><div className={`studio-shell flex flex-col ${currentView==='studio'&&turns.length?'studio-shell-build':currentView==='studio'&&!component?'studio-shell-home':''}`}>
    <AnimatePresence initial={false}>{currentView==='studio'&&!component&&!turns.length&&<motion.div key="home-background" className="studio-background" aria-hidden="true" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reduce?0:.32}}><GradientASCII colors={['#1e3fd8','#f6f8ff','#a5d8ff','#38bdf8']} shape="rise" intro={false} cellSize={18} density={.82} glow={.2} speed={.4} scale={1.1} clickEffect="burst" lightMode={theme==='light'} dpr={1} maxFps={30} paused={settingsOpen||isGenerating||Boolean(reduce)}/></motion.div>}</AnimatePresence>
    <Navbar onOpenApiKeyModal={()=>setSettingsOpen(true)} hasCustomApiKey={Boolean(apiKey||serverProviders[provider]||(provider==='custom'&&baseUrl&&model))} onResetToHome={home} currentView={currentView} onViewChange={changeView} theme={theme} onToggleTheme={toggleTheme} chatTitle={activeChatTitle} isGenerating={isGenerating}/>
    {historyError&&currentView!=='history'&&<p className="history-save-warning" role="alert">{historyError} <button onClick={()=>changeView('history')}>Open history</button></p>}
    {recovery&&<div className="draft-recovery" role="status"><span>A previous workspace is available · {new Date(recovery.savedAt).toLocaleString()}</span><button onClick={restoreDraft}>Restore workspace</button><button onClick={()=>{touched.current=true;setRecovery(null);void writeDraft(null).catch(()=>{});}}>Dismiss</button></div>}
    {draftError&&<p className="form-error" role="alert">{draftError}</p>}
    <main className="flex flex-1 flex-col relative z-10 min-w-0">
      <LayoutGroup id="studio-app">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={currentView} data-page={currentView} className="flex flex-1 flex-col min-w-0 studio-view"
            initial={reduce?false:{opacity:0,filter:'blur(5px)',y:4}}
            animate={{opacity:1,filter:'blur(0px)',y:0,transitionEnd:{filter:'none'}}}
            exit={{opacity:0,filter:reduce?'none':'blur(3px)',y:reduce?0:-3,transition:{duration:reduce?0:.14,ease:[.22,1,.36,1]}}}
            transition={{duration:reduce?0:.3,ease:[.22,1,.36,1]}}>
          <AnimatePresence mode="wait" initial={false}><motion.div key={currentView==='studio'?(turns.length?'conversation':component?'component':'home'):currentView} className="flex flex-1 flex-col min-w-0 min-h-0 studio-content" initial={reduce?false:{opacity:0,filter:'blur(6px)',y:6}} animate={{opacity:1,filter:'blur(0px)',y:0,transitionEnd:{filter:'none'}}} exit={{opacity:0,filter:reduce?'none':'blur(4px)',y:reduce?0:-4,transition:{duration:reduce?0:.18}}} transition={{duration:reduce?0:.3,ease:[.22,1,.36,1]}}>
          {currentView==='featured'?<Featured/>:currentView==='thanks'?<Thanks/>:currentView==='history'?<GenerationHistory onUpdate={entry=>void keepHistory(entry)} onDelete={id=>void removeSaved(id)} onImport={importSaved} entries={history} loading={historyLoading} error={historyError} onOpen={openHistory} onCreate={home} onRetry={()=>void refreshHistory()}/>:currentView==='catalog'?<ComponentsCatalog presets={PRESETS} onSelectComponent={selectComponent} theme={theme}/>:(turns.length?<BuildWorkspace turns={turns} working={isGenerating} source={liveSource} draft={draft} theme={theme} hasComponent={Boolean(component)} onSend={generate} onRetry={(id,prompt)=>generate(prompt,turns.at(-1)?.images||[],id)} onStop={stop} model={model} provider={provider} thinkingEffort={thinkingEffort} onThinkingEffortChange={setThinkingEffort} componentTitle={component?.title} componentDescription={component?.description}>{<Stage {...stageExtras} onSnapshot={saveSnapshot} component={component} componentCode={exported.componentCode} cssCode={exported.cssCode} sourceName={exported.name} sourceLoading={sourceLoading} sourceError={sourceError} dependencies={exported.dependencies} propValues={propValues} onChangeProp={(name,value)=>setPropValues(prev=>({...prev,[name]:value}))} language={language} onLanguageChange={setLanguage} styling={styling} onStylingChange={setStyling} isGenerating={isGenerating} generationError={generationError} onGeneratePrompt={generate} presets={PRESETS} onSelectPreset={selectComponent} theme={theme} provider={provider} model={model} thinkingEffort={thinkingEffort} onThinkingEffortChange={setThinkingEffort}/>}</BuildWorkspace>:<Stage {...stageExtras} onSnapshot={saveSnapshot} component={component} componentCode={exported.componentCode} cssCode={exported.cssCode} sourceName={exported.name} sourceLoading={sourceLoading} sourceError={sourceError} dependencies={exported.dependencies} propValues={propValues} onChangeProp={(name,value)=>setPropValues(prev=>({...prev,[name]:value}))} language={language} onLanguageChange={setLanguage} styling={styling} onStylingChange={setStyling} isGenerating={isGenerating} generationError={generationError} onGeneratePrompt={generate} presets={PRESETS} onSelectPreset={selectComponent} theme={theme} provider={provider} model={model} thinkingEffort={thinkingEffort} onThinkingEffortChange={setThinkingEffort}/>)}
          </motion.div></AnimatePresence>
          </motion.div>
        </AnimatePresence>
      </LayoutGroup>
    </main>
    <AnimatePresence>{settingsOpen&&<ApiKeyModal profiles={modelProfiles} activeProfileId={activeProfileId} isOpen={settingsOpen} onClose={()=>setSettingsOpen(false)} apiKey={apiKey} provider={provider} model={model} baseUrl={baseUrl} onSave={saveConfig} serverConfigured={Boolean(serverProviders[provider])}/>}</AnimatePresence>
  </div></StudioIntro>;
}
