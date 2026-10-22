'use client';
import { useEffect, useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { advanceSourceLength, appendSourceTail, emptySourceTail } from '@/lib/source-stream';

export default function LiveSource({source,tail=false}:{source:string;tail?:boolean}){
  const reduce=useReducedMotion();
  const pre=useRef<HTMLPreElement>(null),code=useRef<HTMLElement>(null);
  const latest=useRef(''),cursor=useRef(0),buffer=useRef(emptySourceTail());
  const frame=useRef(0),last=useRef(0),following=useRef(true),scrollingUntil=useRef(0),position=useRef(0);
  const metrics=useRef({height:0,lineHeight:20,end:0});
  const tick=useRef<(time:number)=>void>(()=>{});
  const wake=()=>{if(!frame.current)frame.current=requestAnimationFrame(time=>tick.current(time));};
  tick.current=(time:number)=>{
    frame.current=0;
    const elapsed=last.current?Math.min(64,time-last.current):16;last.current=time;
    const next=reduce?latest.current.length:advanceSourceLength(cursor.current,latest.current,elapsed);
    if(code.current&&next!==cursor.current){
      const chunk=latest.current.slice(cursor.current,next);
      if(tail){buffer.current=appendSourceTail(buffer.current,chunk);code.current.textContent=buffer.current.text;}
      else if(code.current.firstChild?.nodeType===Node.TEXT_NODE)(code.current.firstChild as Text).appendData(chunk);
      else code.current.textContent=chunk;
      cursor.current=next;
    }
    let moving=false;
    if(pre.current&&code.current&&(tail||following.current)){
      const {height,lineHeight,end}=metrics.current;
      const target=tail?Math.max(0,buffer.current.lineCount*lineHeight-height):end;
      // Provider bursts can skip rows already outside the viewport. Keep easing
      // overscan bounded too, so trimming old lines never exposes an empty area.
      if(tail)position.current=Math.max(position.current,target-lineHeight*4);
      const distance=target-position.current;
      position.current=reduce||Math.abs(distance)<.1?target:position.current+distance*(1-Math.exp(-elapsed/65));
      moving=Math.abs(target-position.current)>.1;
      if(tail)code.current.style.transform=`translate3d(0,${(buffer.current.firstLine*lineHeight-position.current).toFixed(3)}px,0)`;
      else {scrollingUntil.current=performance.now()+100;pre.current.scrollTop=position.current;}
    }
    if(next!==latest.current.length||moving)wake();else last.current=0;
  };
  useEffect(()=>{
    if(!source.startsWith(latest.current)){
      cursor.current=0;buffer.current=emptySourceTail();position.current=0;
      if(code.current){code.current.textContent='';code.current.style.transform='';}
    }
    latest.current=source;wake();
  },[source,reduce,tail]);
  useEffect(()=>{
    const el=pre.current,content=code.current;if(!el||!content)return;
    const measure=()=>{
      metrics.current={height:el.clientHeight,lineHeight:Number.parseFloat(getComputedStyle(el).lineHeight)||20,end:tail?0:Math.max(0,el.scrollHeight-el.clientHeight)};
      wake();
    };
    // Measure after layout, never between text writes in the animation loop.
    const observer=new ResizeObserver(measure);observer.observe(el);if(!tail)observer.observe(content);measure();
    return()=>{observer.disconnect();cancelAnimationFrame(frame.current);frame.current=0;last.current=0;};
  },[tail]);
  return <pre ref={pre} className={tail?'build-waiting-code':'build-live-code'} data-lenis-prevent
    tabIndex={tail?undefined:0} aria-label={tail?'Latest source':'Live component source'}
    onWheel={event=>{if(event.deltaY<0)following.current=false;}}
    onTouchMove={()=>{following.current=false;}}
    onKeyDown={event=>{
      if(['ArrowUp','PageUp','Home'].includes(event.key))following.current=false;
      if(event.key==='End'){following.current=true;wake();}
    }}
    onScroll={event=>{if(!tail&&performance.now()>scrollingUntil.current){const el=event.currentTarget;position.current=el.scrollTop;following.current=metrics.current.end-el.scrollTop<36;}}}>
    <code ref={code}/>{!source&&!tail&&<span className="live-source-placeholder">Waiting for component source…</span>}
  </pre>;
}
