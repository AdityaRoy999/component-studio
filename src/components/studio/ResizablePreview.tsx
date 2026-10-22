'use client';
import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { Laptop, Maximize2, Smartphone, Tablet } from '@/components/ui/icons';
import { useReducedMotion } from 'motion/react';
import { clampPreviewWidth, PREVIEW_WIDTH_PRESETS } from '@/lib/preview-width';
import './ResizablePreview.css';

type Preset=keyof typeof PREVIEW_WIDTH_PRESETS;
type PreviewWidth = { width:number; available:number; requested:number|null; activePreset:Preset|null; setAvailable:(width:number)=>void; setWidth:(width:number|null)=>void; selectPreset:(preset:Preset)=>void };
const WidthContext=createContext<PreviewWidth|null>(null);
function usePreviewWidth(){const value=useContext(WidthContext);if(!value)throw new Error('Preview resize provider is missing');return value;}

export function PreviewResizeProvider({children}:{children:ReactNode}){
  const [available,setAvailable]=useState(0);
  const [requested,setRequested]=useState<number|null>(null);
  const [activePreset,setActivePreset]=useState<Preset|null>(null);
  const animation=useRef<number|null>(null);
  const reduce=useReducedMotion();
  const width=clampPreviewWidth(requested,available);
  function cancel(){if(animation.current!==null)cancelAnimationFrame(animation.current);animation.current=null;}
  function setWidth(value:number|null){cancel();setActivePreset(null);setRequested(value);}
  function selectPreset(preset:Preset){
    cancel();setActivePreset(preset);
    const target=PREVIEW_WIDTH_PRESETS[preset],end=clampPreviewWidth(target,available),start=width;
    if(reduce||start===end){setRequested(target);return;}
    const started=performance.now();
    const tick=(now:number)=>{const progress=Math.min(1,(now-started)/280);const eased=1-Math.pow(1-progress,3);setRequested(start+(end-start)*eased);if(progress<1)animation.current=requestAnimationFrame(tick);else{animation.current=null;setRequested(target);}};
    animation.current=requestAnimationFrame(tick);
  }
  useEffect(()=>()=>cancel(),[]);
  return <WidthContext.Provider value={{available,requested,width,activePreset,setAvailable,setWidth,selectPreset}}>{children}</WidthContext.Provider>;
}

export function PreviewResizeControls(){
  const {requested,activePreset,setWidth,selectPreset}=usePreviewWidth();
  return <div className="preview-device-presets" role="group" aria-label="Preview devices">{([{id:'laptop',label:'Laptop',icon:Laptop},{id:'tablet',label:'Tablet',icon:Tablet},{id:'phone',label:'Phone',icon:Smartphone}] as const).map(item=><button type="button" key={item.id} className={`icon-button ${activePreset===item.id?'selected':''}`} aria-label={`${item.label} preview width`} title={`${item.label} · ${PREVIEW_WIDTH_PRESETS[item.id]}px`} aria-pressed={activePreset===item.id} onClick={()=>selectPreset(item.id)}><item.icon size={17}/></button>)}
    <button type="button" className={`icon-button ${requested===null?'selected':''}`} aria-label="Fit preview to available space" title="Fit preview" aria-pressed={requested===null} onClick={()=>setWidth(null)}><Maximize2 size={15}/></button>
  </div>;
}

export default function ResizablePreview({children}:{children:ReactNode}){
  const {width,available,setAvailable,setWidth}=usePreviewWidth();
  const host=useRef<HTMLDivElement>(null);
  const pending=useRef<number|null>(null);
  const paint=useRef<number|null>(null);
  const dragOffset=useRef(0);
  const [dragging,setDragging]=useState(false);
  useLayoutEffect(()=>{
    const element=host.current;if(!element)return;
    const measure=()=>setAvailable(Math.floor(element.clientWidth));
    measure();const observer=new ResizeObserver(measure);observer.observe(element);
    return()=>observer.disconnect();
  },[setAvailable]);
  function flush(){if(paint.current!==null)cancelAnimationFrame(paint.current);paint.current=null;if(pending.current!==null){setWidth(pending.current);pending.current=null;}}
  useEffect(()=>()=>{if(paint.current!==null)cancelAnimationFrame(paint.current);},[]);
  function resize(clientX:number){
    const element=host.current;if(!element)return;
    pending.current=clampPreviewWidth(clientX-element.getBoundingClientRect().left-dragOffset.current,element.clientWidth);
    if(paint.current===null)paint.current=requestAnimationFrame(()=>{paint.current=null;flush();});
  }
  return <div ref={host} className="responsive-preview" data-resizing={dragging} role="region" aria-label="Responsive component preview">
    <div className="responsive-viewport" style={{width:available?width:'100%'}}><div className="responsive-preview-content">{children}</div></div>
    <div className="preview-width-handle" role="separator" aria-label="Resize preview" aria-orientation="vertical" aria-valuemin={Math.min(280,available)} aria-valuemax={available} aria-valuenow={width} aria-valuetext={`${width} pixels wide`} tabIndex={0} style={{left:Math.max(0,width-24)}}
      onPointerDown={event=>{if(event.button!==0)return;event.preventDefault();dragOffset.current=event.clientX-(host.current?.getBoundingClientRect().left||0)-width;event.currentTarget.setPointerCapture(event.pointerId);setDragging(true);}}
      onPointerMove={event=>{if(event.currentTarget.hasPointerCapture(event.pointerId))resize(event.clientX);}}
      onPointerUp={event=>{if(event.currentTarget.hasPointerCapture(event.pointerId)){resize(event.clientX);flush();event.currentTarget.releasePointerCapture(event.pointerId);}setDragging(false);}}
      onLostPointerCapture={()=>{flush();setDragging(false);}}
      onPointerCancel={()=>{flush();setDragging(false);}}
      onKeyDown={event=>{const step=event.shiftKey?50:10;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();setWidth(clampPreviewWidth(width+(event.key==='ArrowLeft'?-step:step),available));}else if(event.key==='Home'||event.key==='End'){event.preventDefault();setWidth(event.key==='Home'?Math.min(280,available):null);}}}
    ><span/></div>
  </div>;
}
