import { jsonrepair } from 'jsonrepair';
import type { Provider } from './ai-shared';

export class ComponentResponseFormatError extends Error {
  constructor(){super('The model returned malformed component JSON. Check JSON quotes, escaping, commas, and field separators before changing the component code.');}
}

// Use grammar-constrained output only for a model whose hosted API documents it.
// Unknown/custom endpoints retain their existing compatibility behavior.
// https://docs.api.nvidia.com/nim/reference/nvidia-nemotron-3_5-super-vl-120b-a12b-infer
const componentSchema={
  type:'object',additionalProperties:false,
  properties:{
    name:{type:'string'},title:{type:'string'},description:{type:'string'},message:{type:'string'},
    code:{type:'string'},cssCode:{type:'string'},files:{type:'object',additionalProperties:{type:'string'}},
    propsSchema:{type:'array',items:{
      type:'object',additionalProperties:false,required:['name','type','defaultValue'],
      properties:{name:{type:'string'},type:{type:'string',enum:['string','number','boolean','color','select']},
        defaultValue:{anyOf:[{type:'string'},{type:'number'},{type:'boolean'}]},description:{type:'string'},
        min:{type:'number'},max:{type:'number'},step:{type:'number'},options:{type:'array',items:{type:'string'}}},
    }},
  },required:['name','title','description','code','propsSchema'],
};

export function componentResponseFormat(provider:Provider,model:string){
  if(provider==='nvidia'&&model==='nvidia/nemotron-3.5-super-vl-120b-a12b')return {response_format:{type:'json_schema',json_schema:{name:'component',schema:componentSchema}}};
  if(['openai','groq','openrouter'].includes(provider))return {response_format:{type:'json_object'}};
  return {};
}

export function parseComponentResponse(raw:unknown){
  if(typeof raw!=='string'||!raw.trim())throw new ComponentResponseFormatError();
  const clean=raw.trim().replace(/^\s*<think>[\s\S]*?<\/think>\s*/i,'').replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  let value;
  try{value=JSON.parse(clean);}catch{
    const start=clean.indexOf('{'),end=clean.lastIndexOf('}');
    const candidate=start>=0&&end>start?clean.slice(start,end+1):clean;
    try{value=JSON.parse(candidate);}catch{
      try{value=JSON.parse(jsonrepair(candidate));}catch{throw new ComponentResponseFormatError();}
    }
  }
  if(typeof value==='string')try{value=JSON.parse(value);}catch{throw new ComponentResponseFormatError();}
  if(!value||typeof value!=='object'||Array.isArray(value))throw new ComponentResponseFormatError();
  return value;
}

export const COMPONENT_FORMAT_REPAIR='Repair the RESPONSE FORMAT, not a TypeScript colon. Return one complete JSON object. Serialize the complete code, cssCode and supporting file contents as JSON strings: escape double quotes as \\" , backslashes as \\\\ , and line breaks as \\n. Do not put raw TSX, JavaScript expressions, template literals, or Markdown fences outside JSON strings. Keep valid component source and the requested design intact. Include name, title, description, code and propsSchema.';
