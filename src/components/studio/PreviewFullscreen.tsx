'use client';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2 } from '@/components/ui/icons';

const FullscreenContext=createContext<{active:boolean;toggle:()=>void}|null>(null);
export const usePreviewFullscreen=()=>useContext(FullscreenContext);

export function PreviewFullscreenButton(){
  const fullscreen=usePreviewFullscreen();
  if(!fullscreen)return null;
  return <button type="button" className="icon-button preview-fullscreen-button" aria-label={fullscreen.active?'Exit full screen':'Full screen preview'} aria-pressed={fullscreen.active} title={fullscreen.active?'Exit full screen (Esc)':'Full screen preview'} onClick={fullscreen.toggle}>{fullscreen.active?<Minimize2 size={17}/>:<Maximize2 size={17}/>}</button>;
}

export default function PreviewFullscreen({children,className=''}:{children:ReactNode;className?:string}){
  const host=useRef<HTMLDivElement>(null);
  const restoreFocus=useRef<HTMLElement|null>(null);
  const [native,setNative]=useState(false);
  const [fallback,setFallback]=useState(false);
  const active=native||fallback;
  async function close(){
    if(document.fullscreenElement===host.current)await document.exitFullscreen().catch(()=>{});
    setFallback(false);
  }
  async function toggle(){
    if(active){await close();return;}
    restoreFocus.current=document.activeElement as HTMLElement;
    try{if(!host.current?.requestFullscreen)throw new Error();await host.current.requestFullscreen();}
    catch{setFallback(true);}
  }
  useEffect(()=>{
    const change=()=>setNative(document.fullscreenElement===host.current);
    document.addEventListener('fullscreenchange',change);
    return()=>document.removeEventListener('fullscreenchange',change);
  },[]);
  useEffect(()=>{
    if(!active){restoreFocus.current?.focus({preventScroll:true});return;}
    host.current?.querySelector<HTMLElement>('.preview-fullscreen-button')?.focus({preventScroll:true});
    const keyboard=(event:KeyboardEvent)=>{
      if(document.querySelector('dialog[open]'))return;
      // An open color popover owns the first Escape press.
      if(event.key==='Escape'&&!event.defaultPrevented&&!document.querySelector('[data-slot="wensity-color-picker-panel"]')){event.preventDefault();void close();}
      if(fallback&&event.key==='Tab'){
        const elements=[...host.current!.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select, a[href], iframe, [tabindex="0"]')].filter(el=>el.getClientRects().length>0);
        const first=elements[0],last=elements.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
      }
    };
    const message=(event:MessageEvent)=>{
      if(event.data?.type==='studio:exit-fullscreen'&&[...host.current!.querySelectorAll('iframe')].some(frame=>frame.contentWindow===event.source))void close();
    };
    document.addEventListener('keydown',keyboard);window.addEventListener('message',message);
    return()=>{document.removeEventListener('keydown',keyboard);window.removeEventListener('message',message);};
  },[active,fallback]);
  const content=<div ref={host} className={`preview-fullscreen-host ${className} ${active?'preview-expanded':''}`} role={fallback?'dialog':undefined} aria-modal={fallback||undefined} aria-label={fallback?'Full screen component workspace':undefined}>{children}</div>;
  return <FullscreenContext.Provider value={{active,toggle:()=>void toggle()}}>{fallback?createPortal(content,document.body):content}</FullscreenContext.Provider>;
}
