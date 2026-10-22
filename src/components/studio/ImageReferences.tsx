'use client';
import { useEffect, useRef, useState, type ClipboardEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ImagePlus, X } from '@/components/ui/icons';
import { imageCapability, MAX_REFERENCE_BYTES, validateImageReferences, type ImageReference } from '@/lib/image-references';
import type { Provider } from '@/lib/ai-shared';

export function useImageReferences(provider:Provider,model:string) {
  const [images,setImages]=useState<ImageReference[]>([]);
  const [error,setError]=useState('');
  const [busy,setBusy]=useState(false);
  const pending=useRef(false);
  const supported=imageCapability(provider,model);
  async function add(files:File[]) {
    if(pending.current)return;
    if(supported===false){setError('This model accepts text only. Choose an image-capable model in AI settings.');return;}
    pending.current=true;setBusy(true);setError('');
    try{
      const added=await Promise.all(files.map(async file=>{
        if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Use PNG, JPEG, or WebP images.');
        if(file.size>MAX_REFERENCE_BYTES)throw new Error('Each reference image must be 4 MB or smaller.');
        const dataUrl=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('This image could not be read.'));reader.readAsDataURL(file);});
        return {id:crypto.randomUUID(),name:file.name||'Pasted reference',mimeType:file.type,dataUrl};
      }));
      setImages(validateImageReferences([...images,...added]));
    }catch(error){setError(error instanceof Error?error.message:'This image could not be attached.');}
    finally{pending.current=false;setBusy(false);}
  }
  function onPaste(event:ClipboardEvent<HTMLTextAreaElement>){
    const files=Array.from(event.clipboardData.files).filter(file=>file.type.startsWith('image/'));
    if(files.length){event.preventDefault();void add(files);}
  }
  return {images,error,busy,onPaste,add,clear:()=>{setImages([]);setError('');},remove:(id:string)=>setImages(items=>items.filter(item=>item.id!==id)),blocked:images.length>0&&supported===false,supported};
}
export function ImageReferenceButton({references,disabled=false}:{references:ReturnType<typeof useImageReferences>;disabled?:boolean}) {
  const input=useRef<HTMLInputElement>(null);
  return <><input ref={input} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={event=>{void references.add(Array.from(event.target.files||[]));event.target.value='';}}/><button className="icon-button reference-add" type="button" aria-label="Attach reference images" title={references.supported===false?'Choose a model with image input':'Attach reference images, or paste into the message'} disabled={disabled||references.busy} onClick={()=>input.current?.click()}><ImagePlus size={17}/></button></>;
}
export function ImageReferenceTray({references}:{references:ReturnType<typeof useImageReferences>}) {
  const content=useRef<HTMLDivElement>(null);
  const [height,setHeight]=useState(0);
  const reduced=useReducedMotion();
  useEffect(()=>{
    const element=content.current;if(!element)return;
    const resize=new ResizeObserver(entries=>setHeight(entries[0]?.contentRect.height||0));
    resize.observe(element);return()=>resize.disconnect();
  },[]);
  return <motion.div className="reference-attachments" initial={false} animate={{height}} transition={{duration:reduced?0:.22,ease:[.22,1,.36,1]}}>
    <div className="reference-attachments-content" ref={content}>
      <div className="reference-tray" style={{padding:references.images.length?undefined:0}}><AnimatePresence initial={false} mode="popLayout">{references.images.map(image=><motion.div layout="position" className="reference-thumbnail" key={image.id} initial={reduced?false:{opacity:0,y:4,scale:.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,scale:.96}} transition={{duration:reduced?0:.18}}><img src={image.dataUrl} alt={image.name}/><button type="button" aria-label={`Remove ${image.name}`} onClick={()=>references.remove(image.id)}><X size={12}/></button></motion.div>)}</AnimatePresence></div>
      {references.busy&&<p className="reference-status" role="status">Attaching image…</p>}
      {(references.error||references.blocked)&&<p className="form-error reference-status" role="alert">{references.blocked?'Choose an image-capable model before sending these references.':references.error}</p>}
    </div>
  </motion.div>;
}
