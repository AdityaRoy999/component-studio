import type { Provider } from './ai-shared';
import { parseComponentResponse } from './component-response';

export const PATCH_REPAIR_SYSTEM=`Fix an existing React component with the smallest exact edits. Preserve the requested design, selected skill, props and working interactions. Use React 18 TSX; import hooks; default optional props, arrays and objects so rendering with {} works in both themes. Use any browser-compatible npm libraries needed, package CSS, and supplied local files. Keep side effects cleaned up and browser interactions working.
Return JSON only: {"edits":[{"file":"Component.tsx","find":"exact unique existing text","replace":"corrected text"}]}. Source text must be JSON-escaped. File is Component.tsx, Component.css, or an existing supporting-file path. Keep edits small; do not rewrite unchanged code. You may also return propsSchema to correct customization metadata. Do not explain the fix or print reasoning.`;
export const PATCH_FINAL_CHECK='FINAL REPAIR CONTRACT: mandatory runtime rules; selected skill and user preferences preserved; exact unique edits only; valid JSON; no unchanged source.';

export function repairResponseFormat(provider:Provider,model:string){
  if(provider==='nvidia'&&model==='nvidia/nemotron-3.5-super-vl-120b-a12b')return {response_format:{type:'json_schema',json_schema:{name:'component_edits',schema:{
    type:'object',required:['edits'],properties:{edits:{type:'array',items:{type:'object',additionalProperties:false,required:['file','find','replace'],properties:{file:{type:'string'},find:{type:'string'},replace:{type:'string'}}}},propsSchema:{type:'array',items:{type:'object'}}},additionalProperties:false,
  }}}};
  return ['openai','groq','openrouter'].includes(provider)?{response_format:{type:'json_object'}}:{};
}

export function applyComponentRepair(previous:Record<string,any>,raw:unknown){
  const patch=parseComponentResponse(raw);
  // Compatible endpoints may still return a complete corrected component.
  if(typeof patch.code==='string')return {...previous,...patch};
  if(!Array.isArray(patch.edits)||patch.edits.length>12)throw new Error('Return at most 12 exact source edits.');
  if(typeof previous.code!=='string')throw new Error('The repair needs the current component source.');
  const next:Record<string,any>={...previous,files:{...(previous.files||{})}};let changed=false;
  for(const edit of patch.edits){
    if(!edit||typeof edit.file!=='string'||typeof edit.find!=='string'||!edit.find||typeof edit.replace!=='string'||edit.find.length>1000000||edit.replace.length>1000000)throw new Error('Each repair edit needs a file, exact find text, and replacement text.');
    const main=edit.file==='Component.tsx'||edit.file===`${previous.name}.tsx`;
    const css=edit.file==='Component.css'||edit.file===`${previous.name}.css`;
    if(!main&&!css&&!Object.hasOwn(next.files,edit.file))throw new Error(`Repair cannot modify an unknown file: ${edit.file}`);
    const source=main?next.code:css?(next.cssCode||''):next.files[edit.file];
    const index=source.indexOf(edit.find);
    if(index<0||source.indexOf(edit.find,index+1)>=0)throw new Error(`Repair text must match exactly once in ${edit.file}. Return a more precise find string.`);
    const value=source.slice(0,index)+edit.replace+source.slice(index+edit.find.length);
    if(value.length>1000000)throw new Error('Keep each repaired source file under 1 MB.');
    changed||=value!==source;
    if(main)next.code=value;else if(css)next.cssCode=value;else next.files[edit.file]=value;
  }
  if(Array.isArray(patch.propsSchema)){changed||=JSON.stringify(patch.propsSchema)!==JSON.stringify(previous.propsSchema);next.propsSchema=patch.propsSchema;}
  if(!changed)throw new Error('The repair made no changes. Correct the reported error with an exact source edit.');
  return next;
}
