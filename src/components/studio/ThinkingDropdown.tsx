'use client';
import { BrainCircuit, Brain, Gauge, Zap } from '@/components/ui/icons';
import GlideSelect from '@/components/reactbits/GlideSelect';
import type { ThinkingEffort } from '@/lib/ai-shared';
const OPTIONS=[
  {id:'high',label:'High',desc:'More depth for complex components',icon:BrainCircuit},
  {id:'medium',label:'Medium',desc:'A balance of speed and detail',icon:Brain},
  {id:'low',label:'Low',desc:'A quick pass before building',icon:Gauge},
  {id:'off',label:'Off',desc:'Start building directly',icon:Zap},
] as const;
export default function ThinkingDropdown({effort='high',onChange,disabled=false,allowOff=true}:{effort:ThinkingEffort;onChange:(effort:ThinkingEffort)=>void;disabled?:boolean;allowOff?:boolean}){
  const options=OPTIONS.filter(item=>allowOff||item.id!=='off');
  const selected=options.find(item=>item.id===effort)||options.find(item=>item.id==='low')!;
  return <GlideSelect className="thinking-select" ariaLabel={`Thinking depth: ${selected.label}`} value={selected.id} disabled={disabled}
    onChange={value=>onChange(value as ThinkingEffort)} size="md" rowHeight={38} radius={22} menuWidth={184} placement="top" align="left"
    accentColor="var(--ink)" surfaceColor="var(--surface-raised)" highlightColor="var(--surface-hover)" textColor="var(--ink)"
    renderValue={()=> <span className="thinking-value"><selected.icon size={14}/><span><span className="thinking-prefix">Thinking: </span><strong>{selected.label}</strong></span></span>}
    options={options.map(item=>({value:item.id,label:<span className="thinking-choice" title={item.desc}><item.icon size={15}/><strong>{item.label}</strong></span>}))}/>;
}
