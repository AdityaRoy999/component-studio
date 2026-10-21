import type { ComponentPreset } from '@/data/presets';

export interface RevisionContext {
  messages?: { prompt:string; response?:string }[];
  propValues?: Record<string,string|number|boolean>;
}
export function revisionContext(value:unknown):RevisionContext {
  if(value==null)return {};
  if(typeof value!=='object'||Array.isArray(value))throw new Error('Invalid revision memory.');
  const input=value as RevisionContext;
  const text=(value:unknown,max:number)=>typeof value==='string'?value.slice(0,max):'';
  const propValues:NonNullable<RevisionContext['propValues']>={};
  if(input.propValues&&typeof input.propValues==='object')for(const [key,value] of Object.entries(input.propValues).slice(0,30)){
    if(/^[A-Za-z_]\w*$/.test(key)&&!['__proto__','constructor','prototype'].includes(key)&&(['string','boolean'].includes(typeof value)||typeof value==='number'&&Number.isFinite(value)))propValues[key]=typeof value==='string'?value.slice(0,4000):value;
  }
  return {messages:Array.isArray(input.messages)?input.messages.slice(-12).map(item=>({prompt:text(item?.prompt,3000),response:text(item?.response,1500)})):[],propValues};
}
export function carryCustomization(component:ComponentPreset,previous:Record<string,unknown>,previousSchema?:ComponentPreset['propsSchema']){
  return Object.fromEntries(component.propsSchema.map(item=>{
    const value=previous[item.name];
    const old=previousSchema?.find(field=>field.name===item.name);
    if(old&&JSON.stringify(old.defaultValue)!==JSON.stringify(item.defaultValue))return [item.name,item.defaultValue];
    const valid=item.type==='number'?typeof value==='number'&&Number.isFinite(value)&&(item.min==null||value>=item.min)&&(item.max==null||value<=item.max):item.type==='boolean'?typeof value==='boolean':typeof value==='string'&&(item.type!=='select'||item.options?.includes(value));
    return [item.name,valid?value:item.defaultValue];
  }));
}
