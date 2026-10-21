'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import ModernSelect from '@/components/ui/ModernSelect';
import type { ComponentPreset } from '@/data/presets';
import { loadEditorDraft,saveEditorDraft,editorDraftMatches } from '@/lib/generation-history';
type Snapshot=Pick<ComponentPreset,'code'|'cssCode'|'files'>;
export default function SourceEditor({component,disabled,onApply,host}:{component:ComponentPreset;disabled:boolean;onApply:(source:Snapshot)=>void;host:HTMLElement|null}){
  const [open,setOpen]=useState(true);const [file,setFile]=useState('Component.tsx');
  const [sources,setSources]=useState<Record<string,string>>({});const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const [versions,setVersions]=useState<Snapshot[]>([]);const [cursor,setCursor]=useState(-1);const [diff,setDiff]=useState(false);
  const [newFile,setNewFile]=useState('');
  const [ready,setReady]=useState(false);
  const reduce=useReducedMotion();
  useEffect(()=>{setOpen(true);setFile('Component.tsx');},[component.id]);
  const canonical=()=>({'Component.tsx':component.code,'Component.css':component.cssCode||'',...component.files});
  useEffect(()=>{let active=true;setReady(false);setSources(canonical());setVersions([{code:component.code,cssCode:component.cssCode,files:component.files}]);setCursor(0);setError('');void loadEditorDraft(component.id).then(saved=>{if(active&&saved?.versions?.length&&saved.sources&&editorDraftMatches(saved,component)){setSources(saved.sources);setVersions(saved.versions);setCursor(saved.cursor);}}).catch(()=>{}).finally(()=>{if(active)setReady(true);});return()=>{active=false;};},[component.id]);
  useEffect(()=>{setSources(canonical());},[component.code,component.cssCode,component.files]);
  useEffect(()=>{if(!ready)return;const timer=setTimeout(()=>void saveEditorDraft(component.id,{sources,versions,cursor}).catch(error=>setError(error.message)),600);return()=>clearTimeout(timer);},[component.id,sources,versions,cursor,ready]);
  const split=():Snapshot=>({code:sources['Component.tsx'],cssCode:sources['Component.css'],files:Object.fromEntries(Object.entries(sources).filter(([name])=>!['Component.tsx','Component.css'].includes(name)))});
  async function apply(){setBusy(true);setError('');try{
    const source=split();const response=await fetch('/api/validate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...component,...source})});const result=await response.json();if(!response.ok)throw Error(result.error);
    const validated:Snapshot={code:result.component.code,cssCode:result.component.cssCode,files:result.component.files};
    setVersions(prev=>[...prev.slice(0,cursor+1),validated].slice(-50));setCursor(Math.min(cursor+1,49));onApply(validated);
  }catch(error){setError(error instanceof Error?error.message:'Could not validate changes.');}finally{setBusy(false);}}
  function restore(index:number){const source=versions[index];setCursor(index);onApply(source);setSources({'Component.tsx':source.code,'Component.css':source.cssCode||'',...source.files});setError('');}
  const original=(canonical() as Record<string,string>)[file]||'';const edited=sources[file]||'';
  const before=original.split('\n'),after=edited.split('\n');
  if(!host)return null;
  return createPortal(<section className="source-editor" aria-label="Source editor">
    <div className="source-editor-toolbar"><button className="button button-quiet" onClick={()=>setOpen(!open)} aria-expanded={open}>{open?'Close editor':'Edit source'}</button>
      <button className="button button-quiet" disabled={disabled||busy||cursor<=0} onClick={()=>restore(cursor-1)}>Undo</button><button className="button button-quiet" disabled={disabled||busy||cursor>=versions.length-1} onClick={()=>restore(cursor+1)}>Redo</button>
      <span className="source-editor-note">{versions.length} local {versions.length===1?'version':'versions'}</span>
    </div>
    <AnimatePresence initial={false}>{open&&<motion.div key="editable-source" initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:reduce?0:.24,ease:[.22,1,.36,1]}} style={{overflow:'hidden'}}><div className="source-editor-file"><span>File</span><ModernSelect compact label="Editable source file" value={file} onChange={setFile} options={Object.keys(sources).map(name=>({value:name,label:name}))}/></div>
      <div className="source-editor-toolbar"><label className="source-editor-file">New file<input aria-label="New source file path" value={newFile} placeholder="parts/Details.tsx" onChange={e=>setNewFile(e.target.value)}/></label><button className="button button-quiet" disabled={disabled||busy||!newFile.trim()} onClick={()=>{const name=newFile.trim();if(!/^(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.(tsx?|jsx?|css)$/.test(name)||Object.hasOwn(sources,name)){setError('Use a new relative TSX, TS, JSX, JS or CSS path.');return;}setSources(prev=>({...prev,[name]:''}));setFile(name);setNewFile('');setError('');}}>Add file</button>{!['Component.tsx','Component.css'].includes(file)&&<button className="button button-quiet" disabled={busy||disabled} onClick={()=>{setSources(prev=>Object.fromEntries(Object.entries(prev).filter(([name])=>name!==file)));setFile('Component.tsx');}}>Remove file</button>}</div>
      <label className="source-editor-label" htmlFor="source-editor-text">{file} <span>Original TypeScript source</span></label>
      <textarea id="source-editor-text" data-lenis-prevent spellCheck={false} value={edited} disabled={disabled||busy} onChange={e=>setSources(prev=>({...prev,[file]:e.target.value}))} className="source-editor-text"/>
      <div className="source-editor-toolbar"><button className="button button-primary" disabled={disabled||busy||JSON.stringify(sources)===JSON.stringify(canonical())} onClick={()=>void apply()}>{busy?'Checking source…':'Validate and apply'}</button><button className="button button-quiet" disabled={busy} onClick={()=>{setSources(canonical());setError('');}}>Discard edits</button><button className="button button-quiet" onClick={()=>setDiff(!diff)} aria-expanded={diff}>Review changes</button></div>
      {diff&&<pre className="source-diff" data-lenis-prevent aria-label="Source changes">{Array.from({length:Math.max(before.length,after.length)},(_,i)=>before[i]===after[i]?null:<span key={i}>{before[i]!=null&&<span className="diff-remove">− {before[i]}{'\n'}</span>}{after[i]!=null&&<span className="diff-add">+ {after[i]}{'\n'}</span>}</span>)}</pre>}
      {error&&<p className="form-error" role="alert">{error}</p>}
    </motion.div>}</AnimatePresence>
  </section>,host);
}
