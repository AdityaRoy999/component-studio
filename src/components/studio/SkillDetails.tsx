'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, Check, Copy, Terminal, X } from '@/components/ui/icons';
import { motion, useReducedMotion } from 'motion/react';
import { useLenis } from 'lenis/react';
import type { AgentSkill } from '@/data/skills';

export default function SkillDetails({skill,onClose}:{skill:AgentSkill;onClose:()=>void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [copied,setCopied] = useState(false);
  const [copyError,setCopyError] = useState('');
  const reduce = useReducedMotion();
  const lenis = useLenis();
  useEffect(()=>{
    const element=dialog.current;
    const trigger=document.activeElement as HTMLElement|null;
    const overflow=document.body.style.overflow;
    const wasScrolling=lenis&&!lenis.isStopped;
    element?.showModal();closeButton.current?.focus();
    document.body.style.overflow='hidden';if(wasScrolling)lenis.stop();
    return()=>{element?.close();document.body.style.overflow=overflow;if(wasScrolling)lenis.start();if(trigger?.isConnected)trigger.focus({preventScroll:true});};
  },[lenis]);
  useEffect(()=>{
    if(!copied)return;
    const timer=window.setTimeout(()=>setCopied(false),2000);
    return()=>window.clearTimeout(timer);
  },[copied]);
  async function copyInstall(){
    if(!skill.installCommand)return;
    try{await navigator.clipboard.writeText(skill.installCommand);setCopied(true);setCopyError('');}
    catch{setCopyError('Select the command to copy it.');}
  }

  return createPortal(<motion.dialog ref={dialog} className="skill-detail-dialog" aria-labelledby="skill-detail-title" aria-describedby="skill-detail-description" data-lenis-prevent
    onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===event.currentTarget)onClose();}}
    initial={{opacity:reduce?1:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reduce?0:.2}}>
    <motion.div className="skill-detail-panel" initial={reduce?false:{opacity:0,y:14,scale:.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:8,scale:.98}} transition={{duration:reduce?0:.24,ease:[.22,1,.36,1]}}>
      <div className="skill-detail-top"><span className="skill-icon" aria-hidden="true"><Terminal size={22}/></span><button ref={closeButton} type="button" className="icon-button" aria-label="Close skill details" onClick={onClose}><X size={18}/></button></div>
      <p className="skill-detail-category">{skill.category} · {skill.subcategory}</p>
      <h2 id="skill-detail-title">{skill.name}</h2>
      <p id="skill-detail-description">{skill.description}</p>
      <p className="skill-detail-creator">By {skill.creator}</p>
      {skill.installCommand ? <div className="skill-detail-install"><span>Install command</span><div className="skill-detail-command"><code>{skill.installCommand}</code><button type="button" className="icon-button" aria-label={copied?'Install command copied':'Copy install command'} title={copied?'Copied':'Copy command'} onClick={()=>void copyInstall()}>{copied?<Check size={17}/>:<Copy size={17}/>}</button></div><span className="skill-copy-status" role="status">{copyError||(copied?'Copied to clipboard':'')}</span></div> : <p className="skill-detail-no-command">Installation instructions are available in the source project.</p>}
      <a className="button skill-source-link" href={skill.sourceUrl} target="_blank" rel="noopener noreferrer">View source<ArrowUpRight size={16} aria-hidden="true"/><span className="sr-only">Opens in a new tab</span></a>
    </motion.div>
  </motion.dialog>,document.body);
}
