import { EXPANDED_PRESETS } from './expanded-presets';
export interface PropSchemaItem {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'color' | 'select';
  defaultValue: any;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  description?: string;
}

export interface ComponentPreset {
  id: string;
  name: string;
  title: string;
  category: string;
  description: string;
  badge?: string;
  tags: string[];
  propsSchema: PropSchemaItem[];
  code: string;
  cssCode?: string;
  files?: Record<string,string>;
  validationNotes?: string[];
  completionMessage?: string;
  sourceUrl?: string;
  demoDependencies?: string[];
}

export const PRESETS: ComponentPreset[] = [
 {id:'spotlight-card',name:'SpotlightCard',title:'Spotlight Card',category:'COMPONENTS',description:'A soft spotlight follows your pointer across a focused card.',tags:['React Bits','Card','Spotlight'],sourceUrl:'https://reactbits.dev/components/spotlight-card',propsSchema:[
  {name:'spotlightColor',type:'color',defaultValue:'#b8c6ff'}, {name:'intensity',type:'number',defaultValue:.25,min:0,max:1,step:.05}, {name:'spotlightSize',type:'number',defaultValue:260,min:80,max:480,step:10}, {name:'ambient',type:'boolean',defaultValue:false}
 ],code:''},
 {id:'dock',name:'Dock',title:'Dock',category:'COMPONENTS',description:'A responsive icon dock with magnification, labels, and active states.',tags:['React Bits','Navigation','Dock'],sourceUrl:'https://reactbits.dev/components/dock',demoDependencies:['lucide-react'],propsSchema:[
  {name:'baseItemSize',type:'number',defaultValue:44,min:30,max:56,step:2}, {name:'magnification',type:'number',defaultValue:68,min:48,max:100,step:2}, {name:'distance',type:'number',defaultValue:160,min:80,max:260,step:10}, {name:'bounce',type:'boolean',defaultValue:true}, {name:'showLabels',type:'boolean',defaultValue:true}
 ],code:''},
 {id:'click-spark',name:'ClickSpark',title:'Click Spark',category:'INTERACTION',description:'A small burst of canvas sparks responds to each click.',tags:['React Bits','Click','Canvas'],sourceUrl:'https://reactbits.dev/animations/click-spark',propsSchema:[
  {name:'sparkColor',type:'color',defaultValue:'#8ca8ff'}, {name:'sparkCount',type:'number',defaultValue:8,min:3,max:18,step:1}, {name:'sparkRadius',type:'number',defaultValue:24,min:10,max:60,step:2}, {name:'duration',type:'number',defaultValue:500,min:200,max:1000,step:50}, {name:'shape',type:'select',defaultValue:'line',options:['line','streak','dot','star']}
 ],code:''},
 {id:'blur-text',name:'BlurText',title:'Blur Text',category:'TYPOGRAPHY',description:'Words emerge from a gentle blur with a measured stagger.',tags:['React Bits','Text','Reveal'],sourceUrl:'https://reactbits.dev/text-animations/blur-text',propsSchema:[
  {name:'text',type:'string',defaultValue:'Good ideas deserve a clear arrival.'}, {name:'delay',type:'number',defaultValue:100,min:20,max:300,step:10}, {name:'blur',type:'number',defaultValue:10,min:0,max:24,step:1}, {name:'direction',type:'select',defaultValue:'top',options:['top','bottom','left','right']}, {name:'animateBy',type:'select',defaultValue:'words',options:['words','letters']}
 ],code:''},
 {id:'decrypted-text',name:'DecryptedText',title:'Decrypted Text',category:'TYPOGRAPHY',description:'Scrambled characters settle into a message as you interact.',tags:['React Bits','Text','Scramble'],sourceUrl:'https://reactbits.dev/text-animations/decrypted-text',propsSchema:[
  {name:'text',type:'string',defaultValue:'A little mystery. A clear message.'}, {name:'speed',type:'number',defaultValue:45,min:10,max:120,step:5}, {name:'maxIterations',type:'number',defaultValue:12,min:3,max:30,step:1}, {name:'sequential',type:'boolean',defaultValue:true}, {name:'revealDirection',type:'select',defaultValue:'start',options:['start','center','end','random']}
 ],code:''},
 {id:'star-border',name:'StarBorder',title:'Star Border',category:'INTERACTION',description:'A subtle light travels around a button and responds to interaction.',tags:['React Bits','Button','Border'],sourceUrl:'https://reactbits.dev/animations/star-border',propsSchema:[
  {name:'color',type:'color',defaultValue:'#b8c6ff'}, {name:'duration',type:'number',defaultValue:5,min:1,max:12,step:.5}, {name:'thickness',type:'number',defaultValue:1,min:.5,max:3,step:.5}, {name:'glow',type:'number',defaultValue:.3,min:0,max:1,step:.1}, {name:'sparkle',type:'boolean',defaultValue:false}
 ],code:''}
 ,...EXPANDED_PRESETS];
