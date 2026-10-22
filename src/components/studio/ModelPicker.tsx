'use client';

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from '@/components/ui/icons';
import type { AvailableModel } from '@/lib/ai';

interface Props { models: AvailableModel[]; value: string; onChange: (value: string) => void; disabled?: boolean; loading?: boolean; }
const ROW = 44;

export default function ModelPicker({models,value,onChange,disabled,loading}: Props) {
  const [open,setOpen]=useState(false); const [query,setQuery]=useState(''); const [active,setActive]=useState(0); const [offset,setOffset]=useState(0);
  const root=useRef<HTMLDivElement>(null); const trigger=useRef<HTMLButtonElement>(null); const menu=useRef<HTMLDivElement>(null); const search=useRef<HTMLInputElement>(null); const list=useRef<HTMLDivElement>(null);
  const id=useId();
  const filtered=useMemo(()=>models.filter(item=>(item.id+' '+item.label).toLowerCase().includes(query.toLowerCase())),[models,query]);
  const start=Math.max(0,Math.floor(offset/ROW)-3); const end=Math.min(filtered.length,start+13);
  useLayoutEffect(()=>{
    if(!open||!menu.current||!trigger.current)return;
    const popup=menu.current; popup.setAttribute('popover','manual'); popup.showPopover?.();
    const rect=trigger.current.getBoundingClientRect(); const width=Math.min(rect.width,window.innerWidth-24); const height=Math.min(330,window.innerHeight-24);
    const top=window.innerHeight-rect.bottom<height&&rect.top>height?rect.top-height-7:Math.min(rect.bottom+7,window.innerHeight-height-12);
    Object.assign(popup.style,{position:'fixed',top:`${Math.max(12,top)}px`,left:`${Math.max(12,Math.min(rect.left,window.innerWidth-width-12))}px`,width:`${width}px`,height:`${height}px`});
    search.current?.focus();
  },[open]);
  useEffect(()=>{
    if(!open)return;
    function outside(event:PointerEvent){if(!root.current?.contains(event.target as Node))setOpen(false);}
    function close(event:Event){if(event.target instanceof Node&&menu.current?.contains(event.target))return;setOpen(false);}
    document.addEventListener('pointerdown',outside);window.addEventListener('resize',close);window.addEventListener('scroll',close,true);
    return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',close);window.removeEventListener('scroll',close,true);};
  },[open]);
  useEffect(()=>{if(disabled||loading)setOpen(false);},[disabled,loading]);
  function choose(index:number){if(!filtered[index])return;onChange(filtered[index].id);setOpen(false);trigger.current?.focus();}
  function move(index:number){const next=Math.max(0,Math.min(filtered.length-1,index));setActive(next);const viewport=list.current;if(viewport){if(next*ROW<viewport.scrollTop)viewport.scrollTop=next*ROW;else if((next+1)*ROW>viewport.scrollTop+viewport.clientHeight)viewport.scrollTop=(next+1)*ROW-viewport.clientHeight;}}
  function show(){setQuery('');setActive(0);setOffset(0);setOpen(true);}
  return <div className="model-picker" ref={root}>
    <button ref={trigger} type="button" role="combobox" aria-label="AI model" aria-expanded={open} aria-controls={`${id}-list`} className="model-picker-trigger" disabled={disabled||loading||!models.length} onClick={()=>open?setOpen(false):show()} onKeyDown={event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();show();}}}>
      <span>{value|| (loading?'Loading models…':'Select a model')}</span><ChevronDown size={16}/>
    </button>
    {open&&<div ref={menu} className="model-picker-menu" data-lenis-prevent>
      <div className="model-search"><Search size={15}/><input ref={search} role="combobox" aria-label="Search models" aria-autocomplete="list" aria-expanded="true" aria-controls={`${id}-list`} aria-activedescendant={filtered[active]?`${id}-${active}`:undefined} placeholder="Search available models…" value={query} onChange={event=>{setQuery(event.target.value);setActive(0);setOffset(0);if(list.current)list.current.scrollTop=0;}} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();setOpen(false);trigger.current?.focus();}else if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();move(active+(event.key==='ArrowDown'?1:-1));}else if(event.key==='Enter'){event.preventDefault();choose(active);}else if(event.key==='Tab')setOpen(false);}}/></div>
      <div ref={list} id={`${id}-list`} role="listbox" aria-label="Available models" className="model-options-viewport" onScroll={event=>setOffset(event.currentTarget.scrollTop)}>
        <div style={{height:filtered.length*ROW,position:'relative'}}>{filtered.length>0&&<span className="model-glide-pill" aria-hidden="true" style={{height:ROW,transform:`translateY(${active*ROW}px)`}}/>}{filtered.slice(start,end).map((item,index)=>{const row=start+index;return <div key={item.id} id={`${id}-${row}`} role="option" aria-selected={item.id===value} className={`model-option ${active===row?'model-option-active':''}`} style={{position:'absolute',top:row*ROW,height:ROW,left:0,right:0}} onPointerEnter={()=>setActive(row)} onMouseDown={event=>event.preventDefault()} onClick={()=>choose(row)}><span title={item.id}>{item.id}</span>{item.id===value&&<Check size={14}/>}</div>;})}</div>
        {!filtered.length&&<p className="model-list-empty">No matching models.</p>}
      </div>
      <div className="model-picker-count">{filtered.length} {filtered.length===1?'model':'models'} available</div>
    </div>}
  </div>;
}
