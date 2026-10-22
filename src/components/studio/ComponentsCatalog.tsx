'use client';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Layers, Home, Folder, Image as ImageIcon, Settings, MousePointer2 } from '@/components/ui/icons';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import SearchField from './SearchField';
import type { ComponentPreset } from '@/data/presets';
import './ReactBitsDemos.css';
import ExpandedThumbnail from './ExpandedThumbnail';
import PreviewBoundary from './PreviewBoundary';
const NativeRenderer=lazy(()=>import('./NativeRenderer'));
export default function ComponentsCatalog({presets,onSelectComponent,theme='dark'}:{presets:ComponentPreset[];onSelectComponent:(preset:ComponentPreset)=>void;theme?:'dark'|'light'}) {
  const [query,setQuery]=useState('');
  const reduce=useReducedMotion();
  const visible=presets.filter(p=>(p.title+' '+p.category+' '+p.tags.join(' ')).toLowerCase().includes(query.toLowerCase()));
  return <section className="catalog-page">
    <div className="catalog-heading"><div><h1>A little inspiration.<br/><span>A head start on your next build.</span></h1></div><SearchField id="search-components" className="catalog-search" label="Search components" placeholder="Find a component…" value={query} onChange={setQuery}/></div>
    <div className="catalog-meta"><span>ALL COMPONENTS <span className="catalog-count">{visible.length}</span></span><a className="catalog-source-credit" href="https://reactbits.dev/" target="_blank" rel="noreferrer">From React Bits<ArrowUpRight size={12}/></a></div>
    <AnimatePresence mode="wait" initial={false}><motion.div key={query} initial={reduce?false:{opacity:0,filter:'blur(5px)',y:5}} animate={{opacity:1,filter:'blur(0px)',y:0,transitionEnd:{filter:'none'}}} exit={{opacity:0,filter:reduce?'none':'blur(4px)'}} transition={{duration:reduce?0:.2,ease:[.22,1,.36,1]}}>
      <div className="catalog-grid">{visible.map(p=><CatalogCard key={p.id} preset={p} theme={theme} onOpen={()=>onSelectComponent(p)}/>)}</div>
      {!visible.length&&<div className="catalog-empty"><h2>No components found</h2><p>Try another name or category.</p><button className="button button-quiet" onClick={()=>setQuery('')}>Clear search</button></div>}
    </motion.div></AnimatePresence>
  </section>;
}
function CatalogCard({preset:p,theme,onOpen}:{preset:ComponentPreset;theme:'light'|'dark';onOpen:()=>void}) {
 const host=useRef<HTMLElement>(null);
 const [visible,setVisible]=useState(false);
 useEffect(()=>{
   const element=host.current;if(!element)return;
   if(!('IntersectionObserver' in window)){setVisible(true);return;}
   // Keep nearby previews ready, and release canvas/animation work offscreen.
   const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{rootMargin:'160px'});
   observer.observe(element);return()=>observer.disconnect();
 },[]);
 const thumbnail=<div className="catalog-static" aria-hidden="true"><Thumbnail id={p.id}/></div>;
 return <article ref={host} className="catalog-card" aria-label={p.title}>
   <div className="catalog-thumbnail">
     {visible?<PreviewBoundary resetKey={p.id}><Suspense fallback={<>{thumbnail}<span className="sr-only" role="status">Loading {p.title} preview…</span></>}><div className="catalog-live" role="region" aria-label={`${p.title} interactive preview`}><NativeRenderer key={p.id} compact theme={theme} componentId={p.id} propValues={Object.fromEntries(p.propsSchema.map(item=>[item.name,item.defaultValue]))}/></div></Suspense></PreviewBoundary>:thumbnail}
   </div>
   <button type="button" className="catalog-card-footer catalog-open" onClick={onOpen} aria-label={`Open ${p.title}`}><span><span className="catalog-category">{p.category}</span><span className="catalog-title">{p.title}</span></span><ArrowUpRight size={18}/></button>
 </article>;
}
function Thumbnail({id}:{id:string}) {
 if(id==='spotlight-card')return <div className="rb-thumb-spotlight"><Layers size={24}/><strong>Follow the light.</strong><span>A quiet surface. A little presence.</span><MousePointer2 size={18} className="rb-thumb-pointer"/></div>;
 if(id==='dock')return <div className="rb-thumb-dock">{[Home,Folder,ImageIcon,Settings].map((Icon,index)=><span key={index}><Icon size={22}/></span>)}</div>;
 if(id==='click-spark')return <div className="rb-thumb-spark"><svg viewBox="0 0 200 180" fill="none">{Array.from({length:8},(_,index)=>{const angle=index*Math.PI/4;return <path key={index} d={`M${100+Math.cos(angle)*45} ${90+Math.sin(angle)*45} L${100+Math.cos(angle)*63} ${90+Math.sin(angle)*63}`} stroke="var(--secondary-ink)" strokeWidth="2" strokeLinecap="round"/>;})}</svg><span>Click to spark</span></div>;
 if(id==='blur-text')return <div className="rb-thumb-text rb-thumb-blur">Good ideas.<br/><span>Clear arrival.</span></div>;
 if(id==='decrypted-text')return <div className="rb-thumb-text rb-thumb-decrypt"><small>DECRYPTING</small><strong>CLARITY<span>_</span></strong><em>X#Z 01 _</em></div>;
 if(id==='star-border')return <div className="rb-thumb-star"><span>Keep exploring</span></div>;
 return <ExpandedThumbnail id={id} title={id.replaceAll('-',' ')}/>;
}
