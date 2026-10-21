'use client';
import { useState } from 'react';
import { Home, Folder, Image as ImageIcon, Settings, Layers, RotateCcw } from 'lucide-react';
import SpotlightCard from '@/components/reactbits/library/SpotlightCard';
import Dock from '@/components/reactbits/library/Dock';
import ClickSpark from '@/components/reactbits/library/ClickSpark';
import BlurText from '@/components/reactbits/library/BlurText';
import DecryptedText from '@/components/reactbits/library/DecryptedText';
import StarBorder from '@/components/reactbits/library/StarBorder';
import ExpandedRenderer from './ExpandedRenderer';
import './ReactBitsDemos.css';

export default function NativeRenderer({componentId,propValues,theme='dark',compact=false}:{componentId:string;propValues:Record<string,any>;theme?:'dark'|'light';showGrid?:boolean;compact?:boolean}){
 const [count,setCount]=useState(0);const [active,setActive]=useState('Home');const [replay,setReplay]=useState(0);
 const props=propValues;
 const background=['letter-glitch','waves','magnet-lines'].includes(componentId);
 let content;
 switch(componentId){
  case 'spotlight-card':content=<SpotlightCard {...props} theme={theme} className="rb-spotlight-demo"><Layers size={28}/><h2>Follow the light.</h2><p>A quiet surface, brought to life by your cursor.</p></SpotlightCard>;break;
  case 'dock':content=<div className="rb-dock-demo"><p className="rb-demo-eyebrow">YOUR WORKSPACE</p><h2>{active}</h2><p className="rb-demo-caption">Hover to explore. Click to switch.</p><Dock {...props} theme={theme} items={[{label:'Home',icon:<Home size={21}/>},{label:'Files',icon:<Folder size={21}/>},{label:'Photos',icon:<ImageIcon size={21}/>},{label:'Settings',icon:<Settings size={21}/>}].map(item=>({...item,active:active===item.label,onClick:()=>setActive(item.label)}))}/></div>;break;
  case 'click-spark':content=<ClickSpark {...props} className="rb-spark-demo"><div><p className="rb-demo-eyebrow">A LITTLE FEEDBACK</p><h2>Make a spark.</h2><p className="rb-demo-caption">A small celebration for every click.</p><button className="rb-demo-action" onClick={()=>setCount(value=>value+1)}>Click to spark</button><p className="rb-demo-status" aria-live="polite">{count?`${count} ${count===1?'spark':'sparks'} made`:'Try it anywhere on this card'}</p></div></ClickSpark>;break;
  case 'blur-text':content=<div className="rb-text-demo"><BlurText key={replay} {...props} trigger="view" className="rb-blur-heading"/><button className="rb-replay" onClick={()=>setReplay(value=>value+1)}><RotateCcw size={14}/>Replay animation</button></div>;break;
  case 'decrypted-text':content=<div className="rb-text-demo"><DecryptedText key={replay} {...props} text={String(props.text??'A little mystery. A clear message.')} animateOn="inViewHover" parentClassName="rb-decrypted-heading"/><button className="rb-replay" onClick={()=>setReplay(value=>value+1)}><RotateCcw size={14}/>Replay animation</button></div>;break;
  case 'star-border':content=<div className="rb-star-demo"><p className="rb-demo-eyebrow">A FINER DETAIL</p><h2>A little light goes a long way.</h2><StarBorder {...props} theme={theme} className="rb-star-button" onClick={()=>setCount(value=>value+1)}>Keep exploring</StarBorder><p className="rb-demo-status" aria-live="polite">{count?`${count} ${count===1?'interaction':'interactions'}`:'Hover or click to see the light respond'}</p></div>;break;
  default:content=<ExpandedRenderer key={componentId} id={componentId} values={propValues} theme={theme} compact={compact}/>;
 }
 return <div className={`native-renderer rb-library-renderer${background?' rb-library-background':''}`}><div className="native-renderer-content rb-library-content">{content}</div></div>;
}
