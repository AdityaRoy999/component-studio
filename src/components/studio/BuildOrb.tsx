'use client';
import { memo } from 'react';
import { Orb, type OrbLook } from '@yogesharc/thinking-orbs';
import { useReducedMotion } from 'motion/react';
export function orbPurpose(phase?:string,message='',source='',status='working'):{look:OrbLook;label:string}{
  if(status!=='working')return {look:{state:status==='error'?'waiting':'idle',variant:'default'},label:status==='error'?'Needs attention':status==='done'?'Build complete':'Ready'};
  if(phase==='connecting')return {look:{state:'searching',variant:'lighthouse'},label:'Connecting to model'};
  if(phase==='repairing')return {look:{state:'retrying',variant:'surge'},label:'Refining source'};
  if(phase==='validating')return {look:{state:'working',variant:'gyro'},label:'Verifying component'};
  if(!source&&(/thinking|planning/i.test(message)||phase==='writing'))return {look:{state:'reasoning',variant:'twins'},label:'Planning component'};
  return {look:{state:'using',variant:'type'},label:'Writing source'};
}
export default memo(function BuildOrb({phase,message,source,status='working',size=18}:{phase?:string;message?:string;source?:string;status?:string;size?:number}){
  const reduce=useReducedMotion();const purpose=orbPurpose(phase,message,source,status);
  return <span className="build-purpose-orb" data-purpose={purpose.look.state} title={purpose.label}><Orb {...purpose.look} size={size} paused={Boolean(reduce)||status!=='working'} label={purpose.label}/></span>;
});
