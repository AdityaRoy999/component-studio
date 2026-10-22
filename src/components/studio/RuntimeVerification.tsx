'use client';
import { useRef, useState } from 'react';
import GeneratedPreview from './GeneratedPreview';
import type { ComponentPreset } from '@/data/presets';
import type { VerificationResult } from '@/lib/verified-generation';

export interface PreviewCheck {id:string;component:ComponentPreset;propValues:Record<string,any>;}
export default function RuntimeVerification({check,onResult}:{check:PreviewCheck;onResult:(id:string,result:VerificationResult)=>void}){
  const [theme,setTheme]=useState<'dark'|'light'>('dark');const done=useRef(false),darkDone=useRef(false);
  return <div aria-hidden="true" style={{position:'fixed',left:'-200vw',top:0,width:'min(900px,100vw)',height:640,opacity:0,pointerEvents:'none',overflow:'hidden'}}>
    <GeneratedPreview code={check.component.code} cssCode={check.component.cssCode} files={check.component.files} propValues={check.propValues} theme={theme} quiet
      verificationId={`${check.id}:${theme}`} onVerification={result=>{
        if(done.current)return;
        if(!result.ok){done.current=true;onResult(check.id,{ok:false,error:result.error||'The component failed in the browser.',kind:'runtime'});}
        else if(theme==='dark'){if(!darkDone.current){darkDone.current=true;setTheme('light');}}
        else {done.current=true;onResult(check.id,{ok:true});}
      }}/>
  </div>;
}
