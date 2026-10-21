'use client';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, Copy, ArrowUp, ArrowUpRight, Code2, Braces, Waves } from 'lucide-react';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react';
import ModernSelect from '@/components/ui/ModernSelect';
interface CodeViewerProps {
  componentCode:string; cssCode?:string; componentFileName:string; cssFilename?:string; usageCode?:string; dependencies?:string[];
  language:'TS'|'JS'; onLanguageChange:(value:'TS'|'JS')=>void;
  styling:'Tailwind'|'CSS'; onStylingChange:(value:'Tailwind'|'CSS')=>void; loading?:boolean; error?:string;
  officialSourceUrl?:string; registryName?:string;
  files?:Record<string,string>;
  editing?:boolean; onEditorHost?:(element:HTMLDivElement|null)=>void;
}
export default function CodeViewer(props:CodeViewerProps) {
  const selectionId=useId(); const reduce=useReducedMotion();
  const [file,setFile]=useState('component'); const [copied,setCopied]=useState(false); const [copiedUsage,setCopiedUsage]=useState(false); const [copiedDeps,setCopiedDeps]=useState(false); const [copyError,setCopyError]=useState('');
  const sourceFiles=[{id:'component',label:props.componentFileName,source:props.componentCode},...(props.cssCode?[{id:'css',label:props.cssFilename||'Component.css',source:props.cssCode}]:[]),...Object.entries(props.files||{}).map(([name,source])=>({id:'file:'+name,label:name,source}))];
  const scroll=useRef<HTMLDivElement>(null); const active=sourceFiles.some(item=>item.id===file)?file:'component';
  const source=sourceFiles.find(item=>item.id===active)!.source;
  const lines=useMemo(()=>source.split('\n'),[source]);
  const [offset,setOffset]=useState(0);
  const [packageManager,setPackageManager]=useState('npm');
  const dependencies=props.dependencies||[];
  const dependencyCommand=dependencies.length?`${packageManager} ${packageManager==='npm'?'install':'add'} ${dependencies.join(' ')}`:'';
  const registryCommand=props.registryName?`${({npm:'npx',pnpm:'pnpm dlx',yarn:'yarn dlx',bun:'bunx'} as Record<string,string>)[packageManager]} shadcn@latest add @react-bits/${props.registryName}-${props.language}-${props.styling==='CSS'?'CSS':'TW'}`:'';
  const installCommand=[registryCommand,dependencyCommand].filter(Boolean).join('\n');
  const virtual=lines.length>250;
  const start=virtual?Math.max(0,Math.floor(offset/24)-12):0;
  const end=virtual?Math.min(lines.length,start+52):lines.length;
  useEffect(()=>{setOffset(0);if(scroll.current)scroll.current.scrollTop=0;},[source]);
  async function copy(){try{await navigator.clipboard.writeText(source);setCopied(true);setCopyError('');setTimeout(()=>setCopied(false),1800);}catch{setCopyError('Select and copy the source manually.');}}
  return <div className="reactbits-code-card">
    <section className="code-card-section dependencies-card" aria-label="Install dependencies">
      <div className="code-section-header"><h2>Install</h2><div className="code-card-controls">
        <ModernSelect compact label="Package manager" value={packageManager} onChange={setPackageManager} options={['npm','pnpm','yarn','bun'].map(value=>({value,label:value}))}/>
        <button className="code-copy-small" disabled={!installCommand} onClick={async()=>{try{await navigator.clipboard.writeText(installCommand);setCopiedDeps(true);setCopyError('');setTimeout(()=>setCopiedDeps(false),1800);}catch{setCopyError('Select and copy the install command manually.');}}} aria-label="Copy install command" title="Copy install command">{copiedDeps?<Check size={14}/>:<Copy size={14}/>}</button>
      </div></div>
      <div className="code-section-body install-body">{installCommand?<pre data-lenis-prevent className="install-pre"><code>{installCommand}</code></pre>:<p className="install-note">Uses React only. No additional packages needed.</p>}</div>
    </section>
    <section className="code-card-section usage-card" aria-label="Component usage">
      <div className="code-section-header"><h2>Usage</h2><button className="code-copy-small" disabled={props.loading||!props.usageCode} onClick={async()=>{try{await navigator.clipboard.writeText(props.usageCode!);setCopiedUsage(true);setCopyError('');setTimeout(()=>setCopiedUsage(false),1800);}catch{setCopyError('Select and copy the usage example manually.');}}} aria-label="Copy usage code" title="Copy usage code">{copiedUsage?<Check size={14}/>:<Copy size={14}/>}</button></div>
      <div className="code-section-body"><pre data-lenis-prevent className="usage-pre" tabIndex={0} aria-label="Usage example"><code>{(props.usageCode||'').split('\n').map((line,idx)=><span key={idx} className="code-line"><span className="line-number" aria-hidden="true">{idx+1}</span><span>{highlight(line)}</span></span>)}</code></pre></div>
    </section>
    <section className="code-card-section source-code-section" aria-label="Source code">
    <div className="code-section-header code-card-heading"><h2>Code</h2><div className="code-card-controls">
      <ModernSelect compact label="Code language" value={props.language} onChange={v=>props.onLanguageChange(v as 'TS'|'JS')} options={[{value:'TS',label:'TypeScript',icon:<span className="code-badge">TS</span>},{value:'JS',label:'JavaScript',icon:<span className="code-badge">JS</span>}]}/>
      <ModernSelect compact label="Styling" value={props.styling} onChange={v=>props.onStylingChange(v as 'Tailwind'|'CSS')} options={[{value:'CSS',label:'CSS',icon:<Braces size={14}/>},{value:'Tailwind',label:'Tailwind',icon:<Waves size={14}/>} ]}/>
      {props.officialSourceUrl&&<a className="code-copy" href={props.officialSourceUrl} target="_blank" rel="noreferrer" aria-label="Open official documentation"><ArrowUpRight size={16}/></a>}
      <button className="code-copy" onClick={copy} disabled={props.loading||!source} aria-label="Copy current file">{copied?<Check size={16}/>:<Copy size={16}/>}</button>
    </div></div>
    {sourceFiles.length>1&&<LayoutGroup id={selectionId}><div className="source-file-tabs" role="tablist" aria-label="Source file">
      {sourceFiles.map(item=><button key={item.id} id={`${selectionId}-${item.id}`} role="tab" aria-selected={active===item.id} aria-controls={`${selectionId}-source`} tabIndex={active===item.id?0:-1} onClick={()=>setFile(item.id)} onKeyDown={event=>{
        if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const index=sourceFiles.findIndex(file=>file.id===active);const next=sourceFiles[event.key==='Home'?0:event.key==='End'?sourceFiles.length-1:(index+(event.key==='ArrowRight'?1:-1)+sourceFiles.length)%sourceFiles.length].id;setFile(next);document.getElementById(`${selectionId}-${next}`)?.focus();}
      }}>{active===item.id&&<motion.span className="file-active-pill" layoutId="source-selection" transition={reduce?{duration:0}:{type:'spring',stiffness:420,damping:34}}/>}<span className="nav-tab-label">{item.label}</span></button>)}
    </div></LayoutGroup>}
    {(copyError||props.error)&&<p className="form-error" role="alert">{props.error||copyError}</p>}
    <div className="code-section-body code-inner" id={`${selectionId}-source`} role={sourceFiles.length>1?'tabpanel':undefined} aria-labelledby={sourceFiles.length>1?`${selectionId}-${active}`:undefined}><div className="code-scroll" data-lenis-prevent ref={scroll} tabIndex={0} aria-label="Component source" onScroll={e=>{if(virtual)setOffset(e.currentTarget.scrollTop);}}>
      {props.loading?<div className="code-skeleton" role="status">{[75,52,84,62,91,36,68,50].map((width,i)=><span key={i} style={{width:`${width}%`}}/>)}<span className="sr-only">Loading source code</span></div>:<AnimatePresence mode="wait" initial={false}><motion.pre key={active+props.language+props.styling} initial={reduce?false:{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reduce?0:.13}} style={virtual?{height:lines.length*24,position:'relative'}:undefined}><code>{lines.slice(start,end).map((line,index)=>{const i=start+index;return <span className="code-line" key={i} style={virtual?{position:'absolute',top:i*24,left:0}:undefined}><span className="line-number" aria-hidden="true">{i+1}</span><span>{highlight(line)}</span></span>;})}</code></motion.pre></AnimatePresence>}
    </div><button className="scroll-code-top" aria-label="Scroll code to top" onClick={()=>scroll.current?.scrollTo({top:0,behavior:'smooth'})}><ArrowUp size={16}/></button></div>
    </section>
    <AnimatePresence initial={false}>{props.editing&&<motion.section key="source-editing" className="code-card-section source-editing-section" aria-label="Source editing" initial={reduce?false:{opacity:0,filter:'blur(4px)',y:5}} animate={{opacity:1,filter:'blur(0px)',y:0,transitionEnd:{filter:'none'}}} exit={{opacity:0,filter:reduce?'none':'blur(3px)'}} transition={{duration:reduce?0:.22,ease:[.22,1,.36,1]}}>
      <div className="code-section-header"><h2>Source editing</h2></div>
      <div id="component-source-editor" ref={props.onEditorHost}/>
    </motion.section>}</AnimatePresence>
  </div>;
}
function highlight(line:string) {
  if(/^\s*(\/\/|\/\*|\*)/.test(line))return <span className="syntax-comment">{line}</span>;
  return line.split(/('(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|\b(?:import|export|from|const|let|var|function|return|default|interface|type|extends|new|if|else|true|false|number|string|boolean|void)\b|\b\d+(?:\.\d+)?\b)/g).map((token,i)=><span key={i} className={/^['"]/.test(token)?'syntax-string':/^(import|export|from|const|let|var|function|return|default|interface|type|extends|new|if|else)$/.test(token)?'syntax-keyword':/^(true|false|number|string|boolean|void|\d)/.test(token)?'syntax-number':undefined}>{token}</span>);
}
