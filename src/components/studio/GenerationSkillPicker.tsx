'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { BookOpenCheck, Check, Download, FileCode2, Upload, X } from 'lucide-react';
import { useLenis } from 'lenis/react';
import { CUSTOM_SKILL_TEMPLATE, FRONTEND_SKILLS } from '@/data/generation-skills';
import { MAX_SKILL_BYTES, parseGenerationSkill } from '@/lib/generation-skill';
import './GenerationSkillPicker.css';

const STORAGE_KEY='studio_generation_skill_v1';
export function useGenerationSkill(){
  const [skill,setSkill]=useState<string|null>(null);
  const [ready,setReady]=useState(false);
  useEffect(()=>{try{const saved=localStorage.getItem(STORAGE_KEY);if(saved)setSkill(parseGenerationSkill(saved).markdown);}catch{}setReady(true);},[]);
  useEffect(()=>{if(ready)try{if(skill)localStorage.setItem(STORAGE_KEY,skill);else localStorage.removeItem(STORAGE_KEY);}catch{}},[skill,ready]);
  return [skill,setSkill] as const;
}

export default function GenerationSkillPicker({value,onChange,disabled=false}:{value:string|null;onChange:(value:string|null)=>void;disabled?:boolean}){
  const [open,setOpen]=useState(false);
  const selected=value?parseGenerationSkill(value):null;
  return <><button type="button" className={`icon-button generation-skill-trigger${selected?' selected':''}`} aria-label={selected?`Generation skill: ${selected.name}`:'Choose generation skill'} title={selected?`Skill: ${selected.name}`:'Choose a frontend skill'} aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(true)}><BookOpenCheck size={18}/>{selected&&<span className="generation-skill-dot"/>}</button><AnimatePresence>{open&&<SkillPickerDialog value={value} disabled={disabled} onChange={onChange} onClose={()=>setOpen(false)}/>}</AnimatePresence></>;
}

function SkillPickerDialog({value,onChange,onClose,disabled}:{value:string|null;onChange:(value:string|null)=>void;onClose:()=>void;disabled:boolean}){
  const id=useId();const dialog=useRef<HTMLDialogElement>(null);const close=useRef<HTMLButtonElement>(null);const file=useRef<HTMLInputElement>(null);
  const [mode,setMode]=useState<'presets'|'custom'>(value&&!FRONTEND_SKILLS.some(item=>item.markdown===value)?'custom':'presets');
  const [chosen,setChosen]=useState(FRONTEND_SKILLS.find(item=>item.markdown===value)?.markdown||FRONTEND_SKILLS[0].markdown);
  const [custom,setCustom]=useState(value&&!FRONTEND_SKILLS.some(item=>item.markdown===value)?value:CUSTOM_SKILL_TEMPLATE);
  const [fileError,setFileError]=useState('');const reduce=useReducedMotion();const lenis=useLenis();
  const text=mode==='custom'?custom:chosen;
  let parsed:ReturnType<typeof parseGenerationSkill>|null=null;let error='';
  try{parsed=parseGenerationSkill(text);}catch(problem){error=(problem as Error).message;}
  useEffect(()=>{
    const element=dialog.current;const trigger=document.activeElement as HTMLElement|null;const overflow=document.body.style.overflow;const wasScrolling=lenis&&!lenis.isStopped;
    element?.showModal();close.current?.focus();document.body.style.overflow='hidden';if(wasScrolling)lenis.stop();
    function trapFocus(event:KeyboardEvent){
      if(event.key!=='Tab'||!element)return;
      const controls=Array.from(element.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]')).filter(control=>control.tabIndex>=0&&control.getClientRects().length>0);
      const first=controls[0],last=controls.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
    element?.addEventListener('keydown',trapFocus);
    return()=>{element?.removeEventListener('keydown',trapFocus);element?.close();document.body.style.overflow=overflow;if(wasScrolling)lenis.start();if(trigger?.isConnected)trigger.focus({preventScroll:true});};
  },[lenis]);
  async function upload(selected?:File){
    if(!selected)return;
    if(!/\.md$/i.test(selected.name)){setFileError('Choose a Markdown file named SKILL.md.');return;}
    if(selected.size>MAX_SKILL_BYTES){setFileError('Use a SKILL.md file smaller than 32 KB.');return;}
    try{const content=await selected.text();setCustom(content);setMode('custom');setFileError('');}catch{setFileError('This file could not be read. Please try again.');}
  }
  function download(){
    const url=URL.createObjectURL(new Blob([text],{type:'text/markdown;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='SKILL.md';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return createPortal(<motion.dialog ref={dialog} className="generation-skill-dialog" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} data-lenis-prevent onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target===event.currentTarget)onClose();}} initial={{opacity:reduce?1:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reduce?0:.18}}>
    <motion.div className="generation-skill-panel" initial={reduce?false:{y:14,scale:.98}} animate={{y:0,scale:1}} exit={{y:8,scale:.98}} transition={{duration:reduce?0:.22,ease:[.22,1,.36,1]}}>
      <header className="generation-skill-header"><span className="generation-skill-symbol"><BookOpenCheck size={22}/></span><div><h2 id={`${id}-title`}>Give your AI a skill</h2><p id={`${id}-description`}>A little direction. A more considered component.</p></div><button ref={close} type="button" className="icon-button" aria-label="Close generation skills" onClick={onClose}><X size={18}/></button></header>
      <div className="generation-skill-modes" role="group" aria-label="Skill source"><button type="button" aria-pressed={mode==='presets'} onClick={()=>setMode('presets')}>Frontend presets <span>{FRONTEND_SKILLS.length}</span></button><button type="button" aria-pressed={mode==='custom'} onClick={()=>setMode('custom')}><FileCode2 size={15}/> Custom SKILL.md</button></div>
      <div className={`generation-skill-content${mode==='custom'?' generation-skill-content-custom':''}`}>
        {mode==='presets'?<div className="generation-skill-options" role="group" aria-label="Frontend skills">{FRONTEND_SKILLS.map(item=><button key={item.id} type="button" aria-pressed={chosen===item.markdown} onClick={()=>setChosen(item.markdown)}><span className="generation-skill-option-title">{item.title}{chosen===item.markdown&&<Check size={16}/>}</span><span>{item.summary}</span></button>)}</div>:<div className="generation-skill-custom"><div className="generation-skill-upload"><input ref={file} type="file" accept=".md,text/markdown" hidden tabIndex={-1} aria-label="Upload SKILL.md" onChange={event=>{void upload(event.target.files?.[0]);event.target.value='';}}/><button type="button" className="button button-quiet" onClick={()=>file.current?.click()}><Upload size={15}/> Upload SKILL.md</button><button type="button" className="button" onClick={()=>{setCustom(CUSTOM_SKILL_TEMPLATE);setFileError('');}}>Use template</button></div><label htmlFor={`${id}-markdown`}>Your skill file <span>Markdown · up to 32 KB</span></label><textarea id={`${id}-markdown`} value={custom} onChange={event=>{setCustom(event.target.value);setFileError('');}} spellCheck={false} aria-invalid={Boolean(error)} aria-describedby={`${id}-validation`} placeholder={CUSTOM_SKILL_TEMPLATE}/><p id={`${id}-validation`} className={fileError||error?'form-error':'generation-skill-valid'} role="status">{fileError||error||(parsed?`Valid skill · ${parsed.name}`:'')}</p></div>}
        <aside className="generation-skill-preview"><div className="generation-skill-preview-heading"><span>{mode==='presets'?'STUDIO PRESET':'YOUR INSTRUCTIONS'}</span><button type="button" className="icon-button" aria-label="Download SKILL.md" title="Download SKILL.md" onClick={download}><Download size={16}/></button></div><h3>{parsed?.name||'SKILL.md'}</h3><p>{parsed?.description||'Add valid metadata to describe your skill.'}</p>{mode==='presets'&&<pre tabIndex={0} aria-label="Skill instructions">{parsed?.body}</pre>}<details className="generation-skill-format"><summary>Standard skill structure</summary><pre>{`${parsed?.name||'my-frontend-skill'}/\n└── SKILL.md`}</pre><p>YAML <code>name</code> and <code>description</code>, then Markdown instructions. <a href="https://agentskills.io/specification" target="_blank" rel="noopener noreferrer">Format guide ↗</a></p><p>This picker loads one self-contained file. Include needed references in the Markdown; supporting folders and scripts are not loaded.</p></details></aside>
      </div>
      <footer className="generation-skill-footer"><div><span className="generation-skill-footer-label">{disabled?'A build is in progress':'Applied to your next build and revisions'}</span><span>{value?`Active: ${parseGenerationSkill(value).name}`:'No skill selected'}</span></div><div><button type="button" className="button button-quiet" disabled={disabled} onClick={()=>{onChange(null);onClose();}}>No skill</button><button type="button" className="button button-primary" disabled={disabled||!parsed} onClick={()=>{if(parsed){onChange(parsed.markdown);onClose();}}}><Check size={15}/> Use skill</button></div></footer>
    </motion.div>
  </motion.dialog>,document.body);
}
