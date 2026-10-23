'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type Letter={name:string;width:number;paths:readonly string[]};
// Monoline pen paths. Every join meets at y=143; each letter has its own advance.
// Crossbars and the i dot are separate pen lifts, never overlapping a neighbour.
const letters={
  C:{name:'C',width:110,paths:['M93 49C83 31 57 34 39 54C17 78 10 112 17 138C24 167 49 174 71 154C79 147 87 136 93 126C97 138 102 146 110 143']},
  o:{name:'o',width:74,paths:['M0 143C4 140 8 134 10 126C4 145 9 162 24 164C41 167 58 140 58 118C58 102 47 94 35 96C19 98 9 117 10 126','M58 119C58 136 65 149 74 143']},
  m:{name:'m',width:105,paths:['M0 143C8 132 18 110 23 98L6 164C18 140 34 96 48 97C61 98 52 125 42 164C54 140 73 95 87 97C100 100 84 137 86 154C87 169 98 156 105 143']},
  p:{name:'p',width:80,paths:['M0 143C10 129 21 108 28 98L4 209','M18 151C28 122 42 94 56 98C74 104 62 141 47 157C32 174 19 163 25 144','M64 139C69 148 74 148 80 143']},
  n:{name:'n',width:82,paths:['M0 143C9 130 18 109 23 98L6 164C20 136 39 94 55 97C70 100 54 137 58 154C61 171 74 156 82 143']},
  e:{name:'e',width:73,paths:['M0 143C12 136 35 119 44 107C52 93 36 90 24 99C10 109 7 130 11 146C17 173 44 167 73 143']},
  t:{name:'t',width:76,paths:['M0 143C16 126 36 87 53 49C59 35 64 36 59 50L28 128C15 160 35 181 76 143','M17 96L69 92']},
  S:{name:'S',width:110,paths:['M91 51C79 32 51 35 36 52C17 74 34 88 58 98C84 110 88 133 69 153C52 173 23 171 12 154C3 139 14 121 29 122C45 125 48 153 66 160C82 168 99 154 110 143']},
  u:{name:'u',width:78,paths:['M0 143C8 129 17 108 22 98L10 139C0 170 22 175 41 143L60 98L48 141C40 169 61 173 78 143']},
  d:{name:'d',width:100,paths:['M0 143C6 136 10 126 14 117C25 95 44 89 55 104C65 119 48 154 32 163C14 175 5 153 14 117','M55 119L79 43C85 23 93 25 86 46L56 139C48 164 71 172 100 143']},
  i:{name:'i',width:44,paths:['M0 143C7 130 16 109 20 98L9 139C0 165 22 174 44 143','M27 71L27.1 70.9']},
} satisfies Record<string,Letter>;

const words=[
  {name:'Component',letters:[letters.C,letters.o,letters.m,letters.p,letters.o,letters.n,letters.e,letters.n,letters.t]},
  {name:'Studio',letters:[letters.S,letters.t,letters.u,letters.d,letters.i,letters.o]},
];

// Measure the fixed M/L/C pen geometry once, without layout reads while animating.
function penLength(d:string){
  const tokens=d.match(/[MLC]|-?\d*\.?\d+/g)!;
  let x=0,y=0,length=0,index=0;
  const number=()=>Number(tokens[index++]);
  while(index<tokens.length){
    const command=tokens[index++];
    if(command==='M'){x=number();y=number();}
    else if(command==='L'){const nextX=number(),nextY=number();length+=Math.hypot(nextX-x,nextY-y);x=nextX;y=nextY;}
    else if(command==='C'){
      const x1=number(),y1=number(),x2=number(),y2=number(),x3=number(),y3=number(),startX=x,startY=y;
      for(let step=1;step<=16;step++){
        const t=step/16,u=1-t;
        const nextX=u*u*u*startX+3*u*u*t*x1+3*u*t*t*x2+t*t*t*x3;
        const nextY=u*u*u*startY+3*u*u*t*y1+3*u*t*t*y2+t*t*t*y3;
        length+=Math.hypot(nextX-x,nextY-y);x=nextX;y=nextY;
      }
    }
  }
  return length;
}
const totalLength=words.reduce((total,word)=>total+word.letters.reduce((sum,letter)=>sum+letter.paths.reduce((sum,d)=>sum+penLength(d),0),0),0);
let penTime=.08;
const drawing=words.map(word=>{
  let x=16;
  return {...word,width:word.letters.reduce((total,letter)=>total+letter.width,32),strokes:word.letters.flatMap(letter=>{
    const offset=x;x+=letter.width;
    return letter.paths.map(d=>{
      const duration=Math.max(.045,penLength(d)/totalLength*2.65),delay=penTime;
      penTime+=duration-.008;
      return {d,offset,duration,delay};
    });
  })};
});
const initialProps={pathLength:0,opacity:0} as const;
const animateProps={pathLength:1,opacity:1} as const;
type Props=ComponentProps<'div'>&{speed?:number;onAnimationComplete?:()=>void};

// Adapted from the supplied Apple Hello pathLength/opacity drawing pattern.
export default function ComponentStudioEffect({className,speed=1,onAnimationComplete,...props}:Props){
  const reduced=useReducedMotion();
  const durationScale=Number.isFinite(speed)?Math.max(.1,speed):1;
  return <div className={cn('component-studio-effect',className)} role="img" aria-label="Component Studio" {...props}>
    {drawing.map(word=>{
      return <motion.svg key={word.name} data-word={word.name.toLowerCase()} viewBox={`0 0 ${word.width} 242`}
        xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" strokeWidth={9.5}
        strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        {word.strokes.map(({d,offset,duration,delay},index)=><motion.path key={index} d={d} transform={`translate(${offset} 0)`}
          initial={reduced?false:initialProps} animate={animateProps}
          transition={reduced?{duration:0}:{pathLength:{duration:duration*durationScale,delay:delay*durationScale,ease:'linear'},opacity:{duration:.04*durationScale,delay:delay*durationScale}}}
          onAnimationComplete={word.name==='Studio'&&index===word.strokes.length-1?onAnimationComplete:undefined}/>)}
      </motion.svg>;
    })}
  </div>;
}
