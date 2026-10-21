'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import BuildOrb from './BuildOrb';
import { isSnapshot } from '@/lib/image-references';
import { createPreviewDocument } from '@/lib/preview-document';
import { useReducedMotion } from 'motion/react';
interface Props {code:string;cssCode?:string;files?:Record<string,string>;propValues:Record<string,any>;theme:'dark'|'light';quiet?:boolean;onSnapshot?:(dataUrl:string)=>void;resetKey?:number;}
export default function GeneratedPreview({code,cssCode='',files,propValues,theme,quiet=false,onSnapshot,resetKey=0}:Props) {
  const reduce=useReducedMotion();
  const [bundle,setBundle]=useState<{script:string;css:string}|null>(null);const [error,setError]=useState('');const [retry,setRetry]=useState(0);
  const frame=useRef<HTMLIFrameElement>(null);const current=useRef({propValues,theme,resetKey});current.current={propValues,theme,resetKey};
  const callback=useRef(onSnapshot);callback.current=onSnapshot;
  const snapshotId=useRef('');const capture=Boolean(onSnapshot);
  function update(){snapshotId.current=crypto.randomUUID();frame.current?.contentWindow?.postMessage({type:'studio:props',...current.current,...(capture?{snapshotId:snapshotId.current}:{})},'*');}
  useEffect(()=>{
    if(!code.trim())return;
    const controller=new AbortController();if(!quiet)setBundle(null);setError('');
    const timer=setTimeout(()=>{
      fetch('/api/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,cssCode,files,snapshot:capture}),signal:controller.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error);return data;}).then(data=>{if(!controller.signal.aborted)setBundle(data);}).catch(error=>{if(!controller.signal.aborted)setError(error.message||'Preview could not load.');});
    },quiet?350:0);
    return()=>{clearTimeout(timer);controller.abort();};
  },[code,cssCode,files,retry,capture,quiet]);
  useEffect(()=>{const receive=(event:MessageEvent)=>{if(event.source===frame.current?.contentWindow&&event.data?.type==='studio:snapshot'&&event.data.snapshotId===snapshotId.current&&isSnapshot(event.data.dataUrl))callback.current?.(event.data.dataUrl);};window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);},[]);
  useEffect(()=>{update();},[propValues,theme,resetKey]);
  const html=useMemo(()=>{
    if(!bundle)return '';
    return createPreviewDocument(bundle,current.current.theme);
  },[bundle]);
  if(error&&!quiet)return <div className="preview-message" role="alert"><p>{error}</p><button className="button button-quiet" onClick={()=>setRetry(r=>r+1)}><RotateCcw size={14}/>Retry preview</button><span>Open Code to inspect the source.</span></div>;
  if(!bundle)return <div className="preview-message" role="status"><BuildOrb size={26} phase="validating"/><p>Building your live preview…</p></div>;
  return <iframe ref={frame} title="Generated component preview" className="generated-frame" sandbox="allow-scripts" srcDoc={html} onLoad={()=>{update();if(!reduce)frame.current?.animate([{opacity:0,filter:'blur(9px)'},{opacity:1,filter:'blur(0px)'}],{duration:380,easing:'cubic-bezier(.22,1,.36,1)'});}}/>;
}
