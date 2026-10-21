'use client';
import { useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
export default function ClickGlow({children}: {children:ReactNode}) {
  const [bursts,setBursts] = useState<{id:number;x:number;y:number}[]>([]);
  const reduce = useReducedMotion();
  return <div className="click-glow-root" onPointerDownCapture={e=>{if(reduce) return; const burst={id:performance.now(),x:e.clientX,y:e.clientY};setBursts(b=>[...b.slice(-4),burst]);}}>{children}<div className="click-glow-layer" aria-hidden="true"><AnimatePresence>{bursts.map(b=><motion.span key={b.id} className="click-glow-burst" style={{left:b.x,top:b.y}} initial={{opacity:.65,scale:.12}} animate={{opacity:0,scale:1.6}} transition={{duration:.65,ease:'easeOut'}} onAnimationComplete={()=>setBursts(all=>all.filter(x=>x.id!==b.id))} />)}</AnimatePresence></div></div>;
}
