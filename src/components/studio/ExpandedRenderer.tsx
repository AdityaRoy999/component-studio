'use client';
import { useEffect, useState } from 'react';
import { Home, Folder as FolderIcon, BookOpen, Heart, Cloud, NotebookPen, ChartNoAxesCombined, Layers, Code2, Command, Sparkles, Minus, Plus, RotateCcw } from '@/components/ui/icons';
import ShinyText from '../reactbits/library/ShinyText';
import GradientText from '../reactbits/library/GradientText';
import CountUp from '../reactbits/library/CountUp';
import TextPressure from '../reactbits/library/TextPressure';
import TrueFocus from '../reactbits/library/TrueFocus';
import RotatingText from '../reactbits/library/RotatingText';
import FuzzyText from '../reactbits/library/FuzzyText';
import CircularText from '../reactbits/library/CircularText';
import CurvedLoop from '../reactbits/library/CurvedLoop';
import GlitchText from '../reactbits/library/GlitchText';
import Magnet from '../reactbits/library/Magnet';
import FadeContent from '../reactbits/library/FadeContent';
import GlareHover from '../reactbits/library/GlareHover';
import Noise from '../reactbits/library/Noise';
import LogoLoop from '../reactbits/library/LogoLoop';
import ElasticSlider from '../reactbits/library/ElasticSlider';
import TiltedCard from '../reactbits/library/TiltedCard';
import Stepper, { Step } from '../reactbits/library/Stepper';
import GlassIcons from '../reactbits/library/GlassIcons';
import Folder from '../reactbits/library/Folder';
import Counter from '../reactbits/library/Counter';
import LetterGlitch from '../reactbits/library/LetterGlitch';
import Waves from '../reactbits/library/Waves';
import MagnetLines from '../reactbits/library/MagnetLines';
export default function ExpandedRenderer({id,values:p,theme,compact=false}:{id:string;values:Record<string,any>;theme:'light'|'dark';compact?:boolean}){
 const [count,setCount]=useState(42);const [active,setActive]=useState('');const [replay,setReplay]=useState(0);
 const ink=theme==='dark'?'#f5f5f5':'#202020'; const muted=theme==='dark'?'#666666':'#b5b5b5';
 const replayButton=<button className="rb-replay" onClick={()=>setReplay(value=>value+1)}><RotateCcw size={14}/>Replay animation</button>;
 const message=<div className="rb-sample-card"><Layers size={26}/><h2>A little possibility.</h2><p>A thoughtful detail can change how an interface feels.</p></div>;
 const icons=[{label:'Files',icon:<FolderIcon/>,color:'blue'},{label:'Books',icon:<BookOpen/>,color:'purple'},{label:'Health',icon:<Heart/>,color:'red'},{label:'Weather',icon:<Cloud/>,color:'indigo'},{label:'Notes',icon:<NotebookPen/>,color:'orange'},{label:'Stats',icon:<ChartNoAxesCombined/>,color:'green'}];
 switch(id){
  case 'shiny-text':return <ShinyText {...p} color={muted} shineColor={ink} className="rb-display-text"/>;
  case 'gradient-text':return <GradientText {...p} colors={theme==='dark'?['#b8c6ff','#f5f5f5','#84b9d2']:['#425a99','#735b9b','#26758f']} className="rb-display-text">Good things ahead.</GradientText>;
  case 'count-up':return <div className="rb-centered-demo"><CountUp key={replay} to={Number(p.to??2400)} {...p} separator="," className="rb-number"/><p className="rb-demo-caption">Small steps. Real progress.</p>{replayButton}</div>;
  case 'text-pressure':return <div className="rb-pressure-demo"><TextPressure {...p} textColor={ink} minFontSize={24}/></div>;
  case 'true-focus':return <div className="rb-focus-demo"><TrueFocus {...p} borderColor={theme==='dark'?'#b8c6ff':'#5368a1'} glowColor="transparent"/></div>;
  case 'rotating-text':return <div className="rb-centered-demo"><p className="rb-demo-eyebrow">MAKE ROOM FOR</p><RotatingText {...p} texts={['Good ideas.','Fresh thinking.','What comes next.']} mainClassName="rb-display-text"/></div>;
  case 'fuzzy-text':return <FuzzyText {...p} fontSize={compact?46:'clamp(36px, 16cqw, 80px)'} color={ink}>Hello.</FuzzyText>;
  case 'circular-text':return <CircularText text="CREATE • EXPLORE • REPEAT • " {...p} color={ink} size={compact?180:230} fontSize={compact?15:19}><Sparkles size={compact?26:34}/></CircularText>;
  case 'curved-loop':return <div className="rb-curve-demo"><CurvedLoop {...p} color={ink} fontSize={75} edgeFade={0}/></div>;
  case 'glitch-text':return <GlitchText {...p} fontSize={compact?40:'clamp(30px, 13cqw, 64px)'} color={ink}>Signal.</GlitchText>;
  case 'magnet':return <div className="rb-centered-demo"><Magnet {...p}><button className="rb-demo-action" onClick={()=>setCount(value=>value+1)}>Catch me <Sparkles size={16}/></button></Magnet><p className="rb-demo-caption">Follow the pull. {count-42} clicks.</p></div>;
  case 'fade-content':return <div className="rb-centered-demo"><FadeContent key={replay} {...p} trigger="mount">{message}</FadeContent>{replayButton}</div>;
  case 'glare-hover':return <GlareHover {...p} width="100%" height="280px" background="var(--surface)" borderColor="transparent" borderRadius="24px" className="rb-glare-demo">{message}</GlareHover>;
  case 'noise':return <div className="rb-noise-demo"><Noise {...p} fixed={false}/><p className="rb-demo-eyebrow">TEXTURE STUDY</p><h2>Quietly tactile.</h2><p>Grain, with just enough character.</p></div>;
  case 'logo-loop':return <div className="rb-loop-demo"><p className="rb-demo-eyebrow">MADE TO KEEP MOVING</p><LogoLoop {...p} logos={[Code2,Layers,Command,Sparkles,Home].map((Icon,index)=>({node:<Icon size={34}/>,title:['Code','Layers','Command','Sparkles','Home'][index]}))} logoHeight={34} fadeOut={false}/></div>;
  case 'elastic-slider':return <ElasticSliderDemo values={p} ink={ink} muted={muted}/>;
  case 'tilted-card':return <div className={`rb-tilted-demo${compact?' rb-tilted-compact':''}`}><TiltedCard {...p} imageSrc={`/reactbits-demo/${theme==='dark'?'night':'day'}-sky.webp`} altText="Open Sky" captionText="Move to tilt · click to flip" containerWidth="100%" containerHeight={compact?220:320} imageWidth="100%" imageHeight="100%" showTooltip={!compact} displayOverlayContent overlayContent={<p className="rb-tilted-caption">Open Sky</p>} backContent={<div className="rb-sample-card"><h2>A fresh perspective.</h2><p>Click again to turn back.</p></div>}/></div>;
  case 'stepper':return <StepperDemo values={p} theme={theme}/>;
  case 'glass-icons':return <div className="rb-centered-demo rb-glass-demo"><GlassIcons {...p} {...(compact?{size:48,gap:32}:{})} theme={theme} iconColor={ink} columns={3} items={icons.map(item=>({...item,onClick:()=>setActive(`${item.label} selected`)}))}/><span className="sr-only" role="status">{active}</span></div>;
  case 'folder':return <Folder {...p} theme={theme} color="#8795b5" size={compact?.9:1} items={[{title:'Ideas',description:'A place to begin.'},{title:'Explorations',description:'Keep the good surprises.'},{title:'Final touches',description:'The details that matter.'}]}/>;
  case 'counter':return <div className="rb-centered-demo"><Counter {...p} value={count} textColor={ink} fontSize={72}/><div className="rb-counter-actions"><button aria-label="Decrease counter" onClick={()=>setCount(value=>value-1)}><Minus size={18}/></button><button aria-label="Increase counter" onClick={()=>setCount(value=>value+1)}><Plus size={18}/></button></div></div>;
  case 'letter-glitch':return <div className="rb-background-demo"><LetterGlitch {...p} lightMode={theme==='light'} glitchColors={theme==='dark'?['#b8c6ff','#8c8c8c','#f5f5f5']:['#5368a1','#555555','#999999']} backgroundColor="transparent" edgeFade={0} centerFade={0}/></div>;
  case 'waves':return <div className="rb-background-demo"><Waves {...p} lightMode={theme==='light'} backgroundColor="transparent" lineColor={muted} accentColor={ink} fade={0}/></div>;
  case 'magnet-lines':return <div className="rb-background-demo"><MagnetLines {...p} containerSize="100%" lineColor={muted} accentColor={ink} edgeFade={0}/></div>;
  default:return null;
 }
}

function ElasticSliderDemo({values,ink,muted}:{values:Record<string,any>;ink:string;muted:string}){
 const [value,setValue]=useState(Number(values.defaultValue??50));
 useEffect(()=>setValue(Number(values.defaultValue??50)),[values.defaultValue]);
 return <div className="rb-centered-demo rb-slider-demo"><p className="rb-demo-eyebrow">FIND YOUR BALANCE</p><ElasticSlider {...values} value={value} onChange={setValue} startingValue={0} maxValue={100} ariaLabel="Demo volume" contentColor={ink} iconColor={ink} thumbColor={ink} rangeColor={ink} trackColor={muted}/><p className="rb-demo-status">Drag past either end to feel the stretch</p></div>;
}

function StepperDemo({values,theme}:{values:Record<string,any>;theme:'light'|'dark'}){
 const [step,setStep]=useState(1),[name,setName]=useState('');
 return <div className="rb-stepper-demo"><Stepper {...values} step={step} onStepChange={setStep} onFinalStepCompleted={()=>setStep(4)} theme={theme} width="100%" accentColor={theme==='dark'?'#b8c6ff':'#5368a1'} completedContent={<div className="rb-step-content"><h2>Ready to create.</h2><p>{name.trim()?`${name.trim()}, everything is in place.`:'Everything is in place.'}</p><button className="rb-replay" onClick={()=>setStep(1)}>Start again</button></div>}>
   <Step title="Idea"><div className="rb-step-content"><h2>Start with an idea.</h2><p>Give your next project a little direction.</p></div></Step>
   <Step title="Details"><div className="rb-step-content"><h2>Make it yours.</h2><label className="rb-step-label">Project name<input aria-label="Project name" value={name} onChange={event=>setName(event.target.value)} placeholder="Your next idea"/></label></div></Step>
   <Step title="Create"><div className="rb-step-content"><h2>Share what you made.</h2><p>{name.trim()||'Your next idea'} is ready to go.</p></div></Step>
 </Stepper></div>;
}
