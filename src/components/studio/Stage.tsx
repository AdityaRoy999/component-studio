'use client';
import { useImageReferences, ImageReferenceButton, ImageReferenceTray } from './ImageReferences';
import type { ImageReference } from '@/lib/image-references';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { ArrowUp, ArrowUpRight, Code2, Download, Eye, History, Loader2, RotateCcw, Magnet, Layers, PanelTop, Sparkles, SlidersHorizontal, X } from '@/components/ui/icons';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react';
import BorderGlow from '@/components/reactbits/BorderGlow';
import type { ComponentPreset } from '@/data/presets';
import { libraryUsage } from '@/lib/library-usage';
import ResizablePreview, { PreviewResizeProvider, PreviewResizeControls } from './ResizablePreview';
import PreviewFullscreen, { PreviewFullscreenButton, usePreviewFullscreen } from './PreviewFullscreen';
import { canDisableThinking, supportsThinking, type ThinkingEffort, type Provider } from '@/lib/ai-shared';
import PreviewBoundary from './PreviewBoundary';
import SourceEditor from './SourceEditor';

const NativeRenderer=dynamic(()=>import('./NativeRenderer'),{ssr:false,loading:()=> <div className="library-preview-loading" role="status">Loading preview…</div>});
const GeneratedPreview=dynamic(()=>import('./GeneratedPreview'),{ssr:false});
const CodeViewer=dynamic(()=>import('./CodeViewer'));
const CustomizationPanel=dynamic(()=>import('./CustomizationPanel'));
const VoicePill=dynamic(()=>import('./VoicePill'),{ssr:false});
const ThinkingDropdown=dynamic(()=>import('./ThinkingDropdown'),{ssr:false});

interface StageProps {
  skillControl?:ReactNode;
  component:ComponentPreset|null; componentCode:string; cssCode?:string; sourceName:string; sourceLoading:boolean; sourceError?:string; dependencies:string[];
  propValues:Record<string,any>; onChangeProp:(name:string,value:any)=>void;
  language:'TS'|'JS'; onLanguageChange:(v:'TS'|'JS')=>void; styling:'Tailwind'|'CSS'; onStylingChange:(v:'Tailwind'|'CSS')=>void;
  isGenerating:boolean; generationError?:string; onGeneratePrompt:(prompt:string,images?:ImageReference[])=>Promise<boolean>;
  presets?:ComponentPreset[]; onSelectPreset?:(preset:ComponentPreset)=>void; theme?:'dark'|'light';
  onSnapshot?:(dataUrl:string)=>void;
  provider?:Provider; model?:string; thinkingEffort?:ThinkingEffort; onThinkingEffortChange?:(effort:ThinkingEffort)=>void;
  onSourceApply?:(source:Pick<ComponentPreset,'code'|'cssCode'|'files'>&Partial<Pick<ComponentPreset,'propsSchema'>>)=>void;
}

export default function Stage(props:StageProps) {
  const {component,isGenerating,generationError,propValues}=props; const reduce=useReducedMotion();
  const [prompt,setPrompt]=useState(''); const [tab,setTab]=useState<'preview'|'code'>('preview'); const [revision,setRevision]=useState(0);
  const [focused,setFocused]=useState(false);
  const references=useImageReferences(props.provider||'gemini',props.model||'');
  const textarea=useRef<HTMLTextAreaElement>(null);
  const fullscreen=usePreviewFullscreen();
  const [customizing,setCustomizing]=useState(false);
  const [customizationRevision,setCustomizationRevision]=useState(0);
  const [sourceHistoryOpen,setSourceHistoryOpen]=useState(false);
  const [sourceEditorHost,setSourceEditorHost]=useState<HTMLDivElement|null>(null);
  const [exporting,setExporting]=useState(false);const [downloadError,setDownloadError]=useState('');
  async function download(){if(!component)return;setExporting(true);setDownloadError('');try{const response=await fetch('/api/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({component,propValues,theme:props.theme,format:'zip'})});if(!response.ok)throw Error((await response.json()).error);const url=URL.createObjectURL(await response.blob());const link=document.createElement('a');link.href=url;link.download=component.name+'-project.zip';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(error){setDownloadError(error instanceof Error?error.message:'Project could not export.');}finally{setExporting(false);}}

  useEffect(()=>{setTab('preview');setCustomizing(false);setSourceHistoryOpen(false);},[component?.id]);
  useEffect(()=>{
    if(tab!=='code'||!sourceHistoryOpen||!sourceEditorHost)return;
    const frame=requestAnimationFrame(()=>{
      const section=sourceEditorHost.closest<HTMLElement>('.source-editing-section');
      const panel=sourceEditorHost.closest<HTMLElement>('[role="tabpanel"]');
      if(!section||!panel)return;
      const behavior=reduce?'auto':'smooth';
      if(panel.scrollHeight>panel.clientHeight+1){
        panel.scrollTo({top:Math.max(0,panel.scrollTop+section.getBoundingClientRect().top-panel.getBoundingClientRect().top-8),behavior});
      }else if(!sourceEditorHost.closest('.build-workspace,.preview-expanded')){
        window.scrollTo({top:Math.max(0,window.scrollY+section.getBoundingClientRect().top-100),behavior});
      }
    });
    return()=>cancelAnimationFrame(frame);
  },[tab,sourceHistoryOpen,sourceEditorHost,reduce]);
  useEffect(()=>{if(textarea.current){textarea.current.style.height='auto';textarea.current.style.height=`${Math.min(130,Math.max(62,textarea.current.scrollHeight))}px`;}},[prompt]);

  async function submit(e?:React.FormEvent){e?.preventDefault();if(!prompt.trim()||isGenerating||references.busy||references.blocked)return;if(await props.onGeneratePrompt(prompt.trim(),references.images)){setPrompt('');references.clear();}}

  if(!component)return <section className="home-studio">
    <motion.div className="hero-content" initial={reduce?false:{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{type:'spring',stiffness:160,damping:25}}>
      <h1>Ideas in.<br/><span>Interfaces out.</span></h1>
      <p className="hero-description">Describe what you imagine. Create it with AI.<br className="hidden sm:block"/>{' '}Preview it live. Make the code yours.</p>
      <motion.div layout="position" layoutId="studio-chat-composer" className="hero-composer-shell" transition={{duration:reduce?0:.26,ease:[.22,1,.36,1]}}>
        <BorderGlow className="composer-glow" borderRadius={24} backgroundColor={props.theme==='light'?'#ffffff':'#151515'} glowColor="220 55 78" colors={['#8ca8ff','#dce4ff','#7db9e8']} glowIntensity={.7} glowRadius={24} fillOpacity={.08} animated={focused&&!reduce}>
          <form onSubmit={submit} className="prompt-composer" aria-busy={isGenerating}>
            <label htmlFor="component-prompt" className="sr-only">Describe your component</label>
            <ImageReferenceTray references={references}/>
            <textarea data-lenis-prevent id="component-prompt" onPaste={references.onPaste} ref={textarea} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} rows={2} value={prompt} onChange={e=>setPrompt(e.target.value)} disabled={isGenerating} placeholder="Ask what to create, or dictate with voice…" onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void submit();}}}/>
            <div className="composer-footer">
              <div className="composer-left-tools">{props.skillControl}<ImageReferenceButton references={references} disabled={isGenerating}/>
                {supportsThinking(props.provider||'gemini',props.model||'')&&(
                  <ThinkingDropdown allowOff={canDisableThinking(props.provider||'gemini',props.model||'')} effort={props.thinkingEffort||'high'} onChange={effort=>props.onThinkingEffortChange?.(effort)} disabled={isGenerating}/>
                )}
              </div>
              <div className="composer-right-tools">
                <VoicePill size={38} onTranscript={(text)=>setPrompt(p=>p?`${p} ${text}`:text)}/>
                <motion.button type="submit" className="generate-button" disabled={!prompt.trim()||isGenerating||references.busy||references.blocked} aria-label="Generate component" whileTap={reduce?{}:{scale:.9}}>{isGenerating?<Loader2 size={15} strokeWidth={1.75} className="animate-spin"/>:<ArrowUp size={15} strokeWidth={1.75}/>}</motion.button>
              </div>
            </div>
            {isGenerating&&<p className="generation-progress" role="status">Creating your component…</p>}{generationError&&<p className="form-error" role="alert">{generationError}</p>}
          </form>
        </BorderGlow>
      </motion.div>
      <div className="prompt-suggestions">{[
        {label:'Magnetic button',prompt:'A magnetic button that follows my cursor with a soft blue glow',icon:Magnet},
        {label:'Glass pricing card',prompt:'A glass pricing card with monthly and yearly billing toggle',icon:Layers},
        {label:'Animated tabs',prompt:'Animated tabs with a sliding active indicator and content panels',icon:PanelTop},
      ].map(item=><button key={item.label} disabled={isGenerating} onClick={()=>{setPrompt(item.prompt);textarea.current?.focus();}}><item.icon size={13}/>{item.label}<ArrowUpRight size={12}/></button>)}</div>
    </motion.div>
  </section>;

  const isPreset=!component.id.startsWith('gen-');
  const workspace=<PreviewResizeProvider key={component.id}><motion.section className="component-workspace" aria-label={component.title} initial={reduce?false:{opacity:0,y:6}} animate={{opacity:1,y:0}} transition={{duration:.24,ease:[0.16,1,0.3,1]}}>
    <div className="workspace-heading"><div><div className="eyebrow">YOUR WORKSPACE<span className="slash">/</span>{isPreset?'LIBRARY COMPONENT':'AI COMPONENT'}</div><h1>{component.title}</h1><p>{component.description}</p></div></div>
    <div className="workspace-toolbar">
      <div className="workspace-preview-actions"><AnimatePresence initial={false}>{tab==='preview'&&<motion.div key="preview-devices" className="toolbar-device-slot" initial={{width:0,opacity:0}} animate={{width:'auto',opacity:1}} exit={{width:0,opacity:0}} transition={{duration:reduce?0:.26,ease:[.22,1,.36,1]}}><div className="toolbar-device-content"><div className="preview-device-controls"><PreviewResizeControls/><button className="icon-button" aria-label="Restart preview" onClick={()=>setRevision(value=>value+1)}><RotateCcw size={17}/></button></div></div></motion.div>}</AnimatePresence><button type="button" className="icon-button workspace-download" aria-label="Download project" title="Download project" aria-busy={exporting} disabled={isGenerating||exporting} onClick={()=>void download()}>{exporting?<Loader2 size={17} className="animate-spin"/>:<Download size={17}/>}</button></div>
      <div className="workspace-view-actions">{props.skillControl}<LayoutGroup id="component-view"><div className="view-tabs" role="tablist" aria-label="Component view">{(['preview','code'] as const).map(view=><button id={`tab-${view}`} key={view} role="tab" aria-selected={tab===view} aria-controls={`panel-${view}`} tabIndex={tab===view?0:-1} onClick={()=>setTab(view)} onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const next=tab==='preview'?'code':'preview';setTab(next);document.getElementById(`tab-${next}`)?.focus();}}}>{tab===view&&<motion.span className="nav-active-pill" layoutId="active-view" transition={reduce?{duration:0}:{type:'spring',stiffness:420,damping:32}}/>}<span className="nav-tab-label">{view==='preview'?<Eye size={15}/>:<Code2 size={15}/>} {view==='preview'?'Preview':'Code'}</span></button>)}</div></LayoutGroup>
        {!isPreset&&props.onSourceApply&&<button type="button" className={`icon-button source-history-trigger${sourceHistoryOpen&&tab==='code'?' selected':''}`} aria-label="Source history" title="Source history" aria-expanded={sourceHistoryOpen&&tab==='code'} aria-controls="component-source-editor" onClick={()=>{setSourceHistoryOpen(tab==='code'?!sourceHistoryOpen:true);setTab('code');}}><History size={17}/></button>}
        <AnimatePresence initial={false}>{tab==='preview'&&component.propsSchema.length>0&&<motion.div key="customize-tool" className="toolbar-optional-control" initial={{width:0,opacity:0}} animate={{width:'auto',opacity:1}} exit={{width:0,opacity:0}} transition={{duration:reduce?0:.26,ease:[.22,1,.36,1]}}><button className={`icon-button ${customizing?'selected':''}`} aria-label="Customize component" aria-expanded={customizing} aria-controls="component-customization" title="Customize component" onClick={()=>setCustomizing(value=>!value)}><SlidersHorizontal size={17}/></button></motion.div>}</AnimatePresence>
        <PreviewFullscreenButton/>
      </div>
    </div>
    <div className="workspace-frame">
      {!isPreset&&props.onSourceApply&&<SourceEditor component={component} disabled={isGenerating} onApply={props.onSourceApply} host={sourceEditorHost}/>}
      {downloadError&&<p className="form-error" role="alert">{downloadError}</p>}
      <AnimatePresence mode="wait" initial={false}><motion.div key={tab} id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} initial={reduce?false:{opacity:0,filter:'blur(5px)'}} animate={{opacity:1,filter:'blur(0px)',transitionEnd:{filter:'none'}}} exit={{opacity:0,filter:reduce?'none':'blur(3px)'}} transition={{duration:reduce?0:.2,ease:[.22,1,.36,1]}}>
        {tab==='code'?<CodeViewer editing={!isPreset&&sourceHistoryOpen} onEditorHost={setSourceEditorHost} files={component.files} componentCode={props.componentCode} cssCode={props.cssCode} componentFileName={`${props.sourceName}.${props.language==='TS'?'tsx':'jsx'}`} cssFilename={`${props.sourceName}.css`} language={props.language} onLanguageChange={props.onLanguageChange} styling={props.styling} onStylingChange={props.onStylingChange} loading={props.sourceLoading} error={props.sourceError} dependencies={component.sourceUrl?[...new Set([...props.dependencies,...component.demoDependencies||[]])]:props.dependencies} officialSourceUrl={component.sourceUrl} registryName={component.sourceUrl?component.name:undefined} usageCode={component.sourceUrl?libraryUsage(component,propValues):`import ${props.sourceName} from './${props.sourceName}';\n\n<${props.sourceName} {...${JSON.stringify(propValues,null,2)}} />`}/>:
          <div className={`preview-layout ${customizing&&component.propsSchema.length?'preview-with-properties':'preview-no-properties'}`}><div className="preview-grid"><ResizablePreview key={`${component.id}-${revision}`}>{isPreset?<PreviewBoundary resetKey={`${component.id}-${revision}-${customizationRevision}-${JSON.stringify(propValues)}`}><NativeRenderer key={`${component.id}-${customizationRevision}`} componentId={component.id} propValues={propValues} theme={props.theme||'dark'}/></PreviewBoundary>:<GeneratedPreview files={component.files} resetKey={customizationRevision} code={component.code} cssCode={component.cssCode} propValues={propValues} theme={props.theme||'dark'} onSnapshot={props.onSnapshot}/>}</ResizablePreview></div>
            <div className="customization-slot" data-open={customizing&&component.propsSchema.length>0}><AnimatePresence initial={false}>{customizing&&component.propsSchema.length>0&&<motion.div key="customization" id="component-customization" className="workspace-customization" initial={reduce?false:{x:28,opacity:0}} animate={{x:0,opacity:1}} exit={{x:reduce?0:28,opacity:0}} transition={{duration:reduce?0:.28,ease:[.22,1,.36,1]}}><button type="button" className="customization-close icon-button" aria-label="Close customization" onClick={()=>setCustomizing(false)}><X size={16}/></button><CustomizationPanel schema={component.propsSchema} values={propValues} onChange={props.onChangeProp} onReset={()=>{setCustomizationRevision(value=>value+1);for(const item of component.propsSchema)props.onChangeProp(item.name,item.defaultValue);}}/></motion.div>}</AnimatePresence></div>
          </div>}
      </motion.div></AnimatePresence>
    </div>
  </motion.section></PreviewResizeProvider>;
  return fullscreen?workspace:<PreviewFullscreen>{workspace}</PreviewFullscreen>;
}
