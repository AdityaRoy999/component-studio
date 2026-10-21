'use client';
import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { advanceSource } from '@/lib/source-stream';

export default function LiveSource({source,tail=false}:{source:string;tail?:boolean}){
  const reduce=useReducedMotion();
  const pre=useRef<HTMLPreElement>(null),code=useRef<HTMLElement>(null);
  const latest=useRef(source);latest.current=source;
  const visible=useRef(''),frame=useRef(0),last=useRef(0),following=useRef(true),scrollingUntil=useRef(0);
  const tick=useRef<(time:number)=>void>(()=>{});
  tick.current=(time:number)=>{
    frame.current=0;
    const next=reduce?latest.current:advanceSource(visible.current,latest.current,last.current?time-last.current:16);
    last.current=time;
    if(code.current&&next!==visible.current){
      const node=code.current.firstChild;
      if(next.startsWith(visible.current)&&node?.nodeType===Node.TEXT_NODE)(node as Text).appendData(next.slice(visible.current.length));
      else code.current.textContent=next;
      visible.current=next;
    }
    const el=pre.current;
    let moving=false;
    if(el&&(tail||following.current)){
      const distance=el.scrollHeight-el.clientHeight-el.scrollTop;
      if(distance>0.5){scrollingUntil.current=performance.now()+80;el.scrollTop+=reduce?distance:Math.max(.6,distance*.24);moving=distance>1;}
    }
    if(next!==latest.current||moving)frame.current=requestAnimationFrame(time=>tick.current(time));
    else last.current=0;
  };
  useEffect(()=>{if(!frame.current)frame.current=requestAnimationFrame(time=>tick.current(time));},[source,reduce]);
  useEffect(()=>()=>{cancelAnimationFrame(frame.current);frame.current=0;last.current=0;},[]);
  return <pre ref={pre} className={tail?'build-waiting-code':'build-live-code'} data-lenis-prevent
    tabIndex={tail?undefined:0} aria-label={tail?'Latest source':'Live component source'}
    onWheel={event=>{if(event.deltaY<0)following.current=false;}}
    onTouchMove={()=>{following.current=false;}}
    onKeyDown={event=>{
      if(['ArrowUp','PageUp','Home'].includes(event.key))following.current=false;
      if(event.key==='End'){following.current=true;if(!frame.current)frame.current=requestAnimationFrame(time=>tick.current(time));}
    }}
    onScroll={event=>{if(performance.now()>scrollingUntil.current){const el=event.currentTarget;following.current=el.scrollHeight-el.scrollTop-el.clientHeight<36;}}}>
    <code ref={code}/>{!source&&!tail&&<span className="live-source-placeholder">Waiting for component source…</span>}
  </pre>;
}
