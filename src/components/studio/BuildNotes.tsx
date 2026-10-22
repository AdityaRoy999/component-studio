'use client';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from '@/components/ui/icons';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import BuildOrb from './BuildOrb';
import StreamingText from './StreamingText';
export default function BuildNotes({text,working}:{text:string;working:boolean}){
  const [open,setOpen]=useState(working);const content=useRef<HTMLDivElement>(null);const following=useRef(true);const reduce=useReducedMotion();
  useEffect(()=>{if(!working)setOpen(false);},[working]);
  useEffect(()=>{if(open&&following.current&&content.current)content.current.scrollTop=content.current.scrollHeight;},[text,open]);
  return <div className="build-notes"><button className="build-notes-toggle" type="button" aria-expanded={open} onClick={()=>setOpen(value=>!value)}><BuildOrb phase="writing" message="thinking" status={working?'working':'done'} size={15}/><span>{working?'Thinking through the details':'Build notes'}</span><ChevronDown size={13} className={open?'rotate-180':''}/></button>
    <AnimatePresence initial={false}>{open&&<motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:reduce?0:.2}} className="build-notes-clip"><div ref={content} className="build-notes-content" data-lenis-prevent onWheel={event=>{if(event.deltaY<0)following.current=false;}} onScroll={event=>{const el=event.currentTarget;if(el.scrollHeight-el.scrollTop-el.clientHeight<30)following.current=true;}}>{text}</div></motion.div>}</AnimatePresence>
  </div>;
}
