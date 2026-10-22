'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from '@/components/ui/icons';
import BuildOrb from './BuildOrb';
import { isSnapshot } from '@/lib/image-references';
import { createPreviewDocument } from '@/lib/preview-document';
import { useReducedMotion } from 'motion/react';
interface Props {code:string;cssCode?:string;files?:Record<string,string>;propValues:Record<string,any>;theme:'dark'|'light';quiet?:boolean;onSnapshot?:(dataUrl:string)=>void;resetKey?:number;verificationId?:string;onVerification?:(result:{ok:boolean;error?:string})=>void;}
export default function GeneratedPreview({code,cssCode='',files,propValues,theme,quiet=false,onSnapshot,resetKey=0,verificationId,onVerification}:Props) {
  const reduce=useReducedMotion();
  const [bundle,setBundle]=useState<{script:string;css:string}|null>(null);const [error,setError]=useState('');const [retry,setRetry]=useState(0);
  const frame=useRef<HTMLIFrameElement>(null);const current=useRef({propValues,theme,resetKey,verificationId});current.current={propValues,theme,resetKey,verificationId};
  const verified=useRef(onVerification);verified.current=onVerification;
  const callback=useRef(onSnapshot);callback.current=onSnapshot;
  const snapshotId=useRef('');const capture=Boolean(onSnapshot);
  function update(){snapshotId.current=crypto.randomUUID();frame.current?.contentWindow?.postMessage({type:'studio:props',...current.current,...(capture?{snapshotId:snapshotId.current}:{})},'*');}
  useEffect(()=>{
    if(!code.trim())return;
    const controller=new AbortController();if(!quiet)setBundle(null);setError('');
    const timer=setTimeout(()=>{
      fetch('/api/preview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code,cssCode,files,snapshot:capture}),signal:controller.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error);return data;}).then(data=>{if(!controller.signal.aborted)setBundle(data);}).catch(error=>{if(!controller.signal.aborted)setError(error.message||'Preview could not load.');});
    },quiet&&!verificationId?350:0);
    return()=>{clearTimeout(timer);controller.abort();};
  },[code,cssCode,files,retry,capture,quiet]);
  useEffect(()=>{const receive=(event:MessageEvent)=>{if(event.source!==frame.current?.contentWindow)return;if(event.data?.type==='studio:snapshot'&&event.data.snapshotId===snapshotId.current&&isSnapshot(event.data.dataUrl))callback.current?.(event.data.dataUrl);if(event.data?.type==='studio:verification'&&current.current.verificationId&&event.data.id===current.current.verificationId){if(event.data.status==='ready')verified.current?.({ok:true});else if(event.data.status==='error'&&typeof event.data.error==='string')verified.current?.({ok:false,error:event.data.error.slice(0,2400)});}};window.addEventListener('message',receive);return()=>window.removeEventListener('message',receive);},[]);
  useEffect(()=>{update();},[propValues,theme,resetKey,verificationId]);
  useEffect(()=>{if(error&&verificationId)verified.current?.({ok:false,error});},[error,verificationId]);
  const html=useMemo(()=>{
    if(!bundle)return '';
    return createPreviewDocument(bundle,current.current.theme);
  },[bundle]);
  if(error&&!quiet)return <div className="preview-message" role="alert"><p>{error}</p><button className="button button-quiet" onClick={()=>setRetry(r=>r+1)}><RotateCcw size={14}/>Retry preview</button><span>Open Code to inspect the source.</span></div>;
  if(!bundle)return <div className="preview-message" role="status"><BuildOrb size={26} phase="validating"/><p>Building your live preview…</p></div>;
  return <iframe ref={frame} title={verificationId?'Component verification':'Generated component preview'} tabIndex={verificationId?-1:undefined} className="generated-frame" sandbox="allow-scripts" srcDoc={html} onLoad={()=>{update();if(!reduce&&!verificationId)frame.current?.animate([{opacity:0,filter:'blur(9px)'},{opacity:1,filter:'blur(0px)'}],{duration:380,easing:'cubic-bezier(.22,1,.36,1)'});}}/>;
}
