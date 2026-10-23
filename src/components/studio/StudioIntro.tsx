'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight } from '@/components/ui/icons';
import { useReducedMotion } from 'motion/react';
import { useLenis } from 'lenis/react';
import ComponentStudioEffect from '@/components/ui/component-studio-effect';
import './StudioIntro.css';

export default function StudioIntro({children,enabled}:{children:ReactNode;enabled:boolean}){
  const reduce=useReducedMotion();
  const play=useRef(enabled).current;
  const lenis=useLenis();
  const [phase,setPhase]=useState<'writing'|'reveal'|'ready'>(enabled?'writing':'ready');
  const skip=useRef<HTMLButtonElement>(null);
  const timers=useRef<ReturnType<typeof setTimeout>[]>([]);
  const completed=useRef(false);
  const reveal=()=>{
    if(completed.current||!play||reduce)return;
    completed.current=true;timers.current.forEach(clearTimeout);
    timers.current=[setTimeout(()=>setPhase('reveal'),320),setTimeout(()=>setPhase('ready'),1820)];
  };
  const finish=()=>{
    completed.current=true;
    timers.current.forEach(clearTimeout);
    const restoreFocus=document.activeElement===skip.current;
    setPhase('ready');
    if(restoreFocus)requestAnimationFrame(()=>document.querySelector<HTMLTextAreaElement>('#component-prompt')?.focus({preventScroll:true}));
  };
  useEffect(()=>{
    if(!play||reduce){completed.current=true;setPhase('ready');return;}
    completed.current=false;
    // A watchdog also releases the page if animation frames are unavailable.
    timers.current=[setTimeout(reveal,4000)];
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')finish();};
    window.addEventListener('keydown',escape);
    return()=>{timers.current.forEach(clearTimeout);window.removeEventListener('keydown',escape);};
  },[play,reduce]);
  useEffect(()=>{
    if(phase!=='writing'||reduce)return;
    const overflow=document.body.style.overflow,wasScrolling=lenis&&!lenis.isStopped;
    document.body.style.overflow='hidden';if(wasScrolling)lenis.stop();
    return()=>{document.body.style.overflow=overflow;if(wasScrolling)lenis.start();};
  },[phase,reduce,lenis]);
  return <div className="studio-entrance" data-phase={phase}>
    <div className="studio-entry-shell" ref={node=>{if(node)node.inert=phase==='writing';}} aria-hidden={phase==='writing'?true:undefined}>{children}</div>
    {phase!=='ready'&&<div className="studio-intro" aria-hidden={phase==='reveal'?true:undefined}>
      <div className="studio-intro-wordmark" role="status" aria-label="Welcome to Component Studio">
        <ComponentStudioEffect onAnimationComplete={reveal} aria-hidden="true"/>
        <span className="sr-only">Component Studio</span>
      </div>
      {phase==='writing'&&<button ref={skip} type="button" className="studio-intro-skip" onClick={finish} aria-label="Skip introduction"><ArrowRight size={19}/></button>}
    </div>}
  </div>;
}
