'use client';
import { memo } from 'react';
const Word=memo(function Word({text,index}:{text:string;index:number}){return <span className="stream-word" style={{animationDelay:`${index%6*14}ms`}}>{text}</span>;});
export default function StreamingText({text,animate=false}:{text:string;animate?:boolean}){
  if(!animate)return <>{text}</>;
  const words=text.match(/\S+\s*|\s+/g)||[];
  // Only recent words need animation. Keep long streams readable without thousands of animated nodes.
  const start=Math.max(0,words.length-96);
  return <>{start>0&&<span key="settled">{words.slice(0,start).join('')}</span>}{words.slice(start).map((word,offset)=>{const index=start+offset;return <Word text={word} index={index} key={index}/>;})}</>;
}
