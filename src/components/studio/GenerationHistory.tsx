'use client';
import { useMemo, useRef, useState } from 'react';
import { ArrowUpRight, ImageIcon, Pencil, Plus, Trash2 } from '@/components/ui/icons';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import ModernSelect from '@/components/ui/ModernSelect';
import ProviderLogo from './ProviderLogo';
import { isSnapshot } from '@/lib/image-references';
import { parseHistoryBackup, type HistoryEntry } from '@/lib/generation-history';
import HistoryActionDialog, { type HistoryAction } from './HistoryActionDialog';
import HistoryTitle from './HistoryTitle';
import PulseHeart from '@/components/reactbits/PulseHeart';
import SearchField from './SearchField';
export default function GenerationHistory({entries,loading,error,onOpen,onCreate,onRetry,onUpdate,onDelete,onImport}:{entries:HistoryEntry[];loading:boolean;error:string;onOpen:(entry:HistoryEntry)=>void;onCreate:()=>void;onRetry:()=>void;onUpdate:(entry:HistoryEntry)=>void;onDelete:(id:string)=>void;onImport:(entries:HistoryEntry[])=>Promise<void>}){
  const upload=useRef<HTMLInputElement>(null);const [feedback,setFeedback]=useState('');const [favorites,setFavorites]=useState(false);const [action,setAction]=useState<{id:string;type:HistoryAction}|null>(null);
  const actionEntry=entries.find(entry=>entry.id===action?.id);
  const [query,setQuery]=useState('');const [order,setOrder]=useState('newest');const reduce=useReducedMotion();
  const visible=useMemo(()=>{const result=entries.filter(entry=>(!favorites||entry.favorite)&&`${entry.label||entry.component.title} ${entry.turns.at(-1)?.prompt} ${entry.model}`.toLowerCase().includes(query.toLowerCase()));return order==='oldest'?[...result].reverse():result;},[entries,query,order,favorites]);
  function backup(){const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,entries},null,2)],{type:'application/json'}));const anchor=document.createElement('a');anchor.href=url;anchor.download='component-studio-history.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  return <section className="history-page" aria-labelledby="history-title">
    <header className="history-heading"><div><h1 id="history-title" tabIndex={-1}>Made by you.</h1><p>Your components and revisions, ready for their next chapter.</p></div><button className="button button-primary" onClick={onCreate}><Plus size={16}/>New component</button></header>
    <div className="history-toolbar"><SearchField id="search-history" className="history-search" label="Search history" placeholder="Find a build…" value={query} onChange={setQuery}/><span className="history-count">{entries.length} saved {entries.length===1?'build':'builds'}</span><ModernSelect compact label="Sort history" value={order} onChange={setOrder} options={[{value:'newest',label:'Newest first'},{value:'oldest',label:'Oldest first'}]}/></div>
    <p className="history-storage-note">Saved in this browser. Each completed generation and revision is kept with its source and conversation.</p>
    <div className="source-editor-toolbar history-management-actions"><button className="button button-quiet" aria-pressed={favorites} onClick={()=>setFavorites(!favorites)}>{favorites?'Show all':'Favorites'}</button><button className="button button-quiet" disabled={!entries.length} onClick={backup}>Back up history</button><button className="button button-quiet" onClick={()=>upload.current?.click()}>Import backup</button><input hidden type="file" accept="application/json,.json" ref={upload} onChange={async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{if(file.size>30000000)throw Error('Backup exceeds 30 MB.');await onImport(parseHistoryBackup(await file.text()));setFeedback('Backup imported.');}catch(error){setFeedback(error instanceof Error?error.message:'Backup could not import.');}}}/></div>
    {feedback&&<p role="status">{feedback}</p>}
    {error&&<div className="history-feedback" role="alert"><p>{error}</p><button className="button button-quiet" onClick={onRetry}>Retry saving and loading</button></div>}
    <AnimatePresence mode="wait" initial={false}><motion.div key={loading?'loading':`${favorites}-${query}-${order}-${visible.map(entry=>entry.id).join(',')}`} className="history-results" initial={reduce?false:{opacity:0,filter:'blur(5px)',y:5}} animate={{opacity:1,filter:'blur(0px)',y:0,transitionEnd:{filter:'none'}}} exit={{opacity:0,filter:reduce?'none':'blur(4px)'}} transition={{duration:reduce?0:.22,ease:[.22,1,.36,1]}}>
    {loading?<div className="history-grid" role="status" aria-label="Loading saved builds">{[0,1,2].map(i=><div className="history-skeleton" key={i}/>)}</div>:visible.length?<div className="history-grid">{visible.map(entry=><motion.article className="history-card" key={entry.id}>
      <div className="history-snapshot">{isSnapshot(entry.thumbnail)?<img src={entry.thumbnail} alt={`${entry.component.title} preview`} loading="lazy" decoding="async"/>:<div className="history-snapshot-placeholder"><ImageIcon size={26}/><span>{entry.component.title}</span></div>}</div>
      <div className="history-card-body"><div className="history-card-meta"><span><ProviderLogo provider={entry.provider}/>{entry.provider==='groq'?'Groq':entry.provider==='nvidia'?'NVIDIA':entry.provider==='openai'?'OpenAI':entry.provider==='openrouter'?'OpenRouter':entry.provider==='gemini'?'Gemini':'Custom'}</span></div>
      <div className="history-title-row"><HistoryTitle title={entry.label||entry.component.title}/><div className="history-entry-actions" role="group" aria-label={`Actions for ${entry.label||entry.component.title}`}>
        <PulseHeart className="history-favorite" icon="star" liked={Boolean(entry.favorite)} count={0} showCount={false} size={18} corner={999} idleColor="var(--secondary-ink)" likedColor="var(--blue)" pillColor="var(--surface-raised)" textColor="var(--ink)" label={entry.favorite?'Remove from favorites':'Add to favorites'} animateOnChange onRequestChange={()=>setAction({id:entry.id,type:'favorite'})}/>
        <button className="icon-button" aria-label="Rename build" title="Rename build" aria-haspopup="dialog" onClick={()=>setAction({id:entry.id,type:'rename'})}><Pencil size={17}/></button>
        <button className="icon-button" aria-label="Delete build" title="Delete build" aria-haspopup="dialog" onClick={()=>setAction({id:entry.id,type:'delete'})}><Trash2 size={17}/></button>
        <button className="icon-button" onClick={()=>onOpen(entry)} aria-label={`Open ${entry.label||entry.component.title}`} title="Open build"><ArrowUpRight size={17}/></button>
      </div></div>
      </div>
    </motion.article>)}</div>:<div className="history-empty-simple"><p>{query||favorites?'No matching builds. Try a different search or filter.':'No saved builds yet. Completed components will appear here.'}</p>{query&&<button className="button button-quiet" onClick={()=>setQuery('')}>Clear search</button>}</div>}
    </motion.div></AnimatePresence>
    <AnimatePresence>{action&&actionEntry&&<HistoryActionDialog key={`${action.id}-${action.type}`} entry={actionEntry} action={action.type} onClose={()=>setAction(null)} onConfirm={label=>{if(action.type==='delete')onDelete(actionEntry.id);else onUpdate({...actionEntry,...(action.type==='rename'?{label}:{favorite:!actionEntry.favorite})});setAction(null);}}/>}</AnimatePresence>
  </section>;
}
