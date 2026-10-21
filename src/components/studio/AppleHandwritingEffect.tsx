'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

// Uses the pathLength/opacity animation supplied by the user for Apple Hello.
// Original Component Studio paths keep the greeting's brand name and bold weight.
const initialProps={pathLength:0,opacity:0} as const;
const animateProps={pathLength:1,opacity:1} as const;
type Props=Omit<ComponentProps<typeof motion.svg>,'onAnimationComplete'> & {
  paths:readonly string[];
  speed?:number;
  onAnimationComplete?:()=>void;
};

export default function AppleHandwritingEffect({paths,className,speed=1,onAnimationComplete,...props}:Props){
  const reduced=useReducedMotion();
  const calc=(value:number)=>value*Math.max(.1,speed);
  return <motion.svg className={cn('apple-handwriting-effect',className)} fill="none"
    initial={{opacity:1}} exit={{opacity:0}} stroke="currentColor" strokeWidth={7.5}
    viewBox="0 0 760 200" xmlns="http://www.w3.org/2000/svg" {...props}>
    {paths.map((d,index)=><motion.path key={index} d={d}
      initial={reduced?false:initialProps} animate={animateProps}
      style={{strokeLinecap:'round',strokeLinejoin:'round'}}
      transition={reduced?{duration:0}:{duration:calc(index===0?.65:.4),delay:calc(index*.085),ease:'easeInOut',opacity:{duration:calc(.15),delay:calc(index*.085)}}}
      onAnimationComplete={index===paths.length-1?onAnimationComplete:undefined}/>) }
  </motion.svg>;
}
