'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useLenis } from 'lenis/react';
import AppleHandwritingEffect from './AppleHandwritingEffect';
import './StudioIntro.css';

// Original monoline lettering, drawn as pen strokes rather than an outline font.
const strokes=[
  'M92 47C79 31 52 37 37 59C18 87 20 121 44 126C61 130 78 116 87 103',
  'M83 107C86 85 111 77 119 91C128 106 111 132 98 125C84 119 91 96 103 91C110 89 118 95 127 100',
  'M122 121L133 91C137 82 142 86 139 97L133 120C146 86 159 81 158 96L150 120C164 86 178 83 174 101L170 117C168 126 177 127 185 119',
  'M182 110L196 87L176 160C171 175 164 173 168 161L193 103C206 81 224 82 221 101C219 119 204 134 195 122C191 116 195 103 203 96M219 114C224 121 229 122 235 116',
  'M234 108C236 87 261 80 269 95C276 109 260 132 246 126C234 120 240 98 252 92C261 88 268 98 277 100',
  'M273 122L284 91C288 84 293 86 289 100L282 121C298 88 316 83 310 102L306 116C303 126 313 126 321 119',
  'M320 109C349 108 359 87 346 86C331 84 317 108 324 120C332 134 350 122 360 110',
  'M356 121L367 91C371 83 377 86 372 101L365 122C381 88 399 83 393 104L389 117C387 125 396 127 405 119',
  'M400 119C411 102 420 80 430 59C438 43 442 46 433 65L413 110C404 132 420 131 434 115M404 87L438 83',
  'M505 55C493 40 467 46 467 64C466 81 503 82 505 100C509 126 470 140 457 120C452 111 458 104 466 101',
  'M514 119C525 102 533 80 542 61C549 47 554 48 546 65L526 109C515 132 533 132 546 115M515 88L550 84',
  'M552 88L543 113C537 132 555 130 567 104L574 87L564 116C560 128 571 128 580 118',
  'M614 97C605 79 588 91 583 108C575 131 596 135 611 105L638 50C647 31 652 36 644 55L617 113C611 127 622 130 632 118',
  'M642 90L634 113C628 130 641 128 649 118M648 72L650 68',
  'M651 109C654 87 678 82 685 95C692 110 676 133 662 126C650 119 656 98 668 92C677 88 684 97 694 98C708 101 720 94 730 86',
];

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
    timers.current=[setTimeout(()=>setPhase('reveal'),180),setTimeout(()=>setPhase('ready'),1680)];
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
        <AppleHandwritingEffect paths={strokes} onAnimationComplete={reveal} aria-hidden="true"/>
        <span className="sr-only">Component Studio</span>
      </div>
      {phase==='writing'&&<button ref={skip} type="button" className="studio-intro-skip" onClick={finish} aria-label="Skip introduction"><ArrowRight size={19}/></button>}
    </div>}
  </div>;
}
