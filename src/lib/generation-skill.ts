import { parseDocument } from 'yaml';

export const MAX_SKILL_BYTES = 32 * 1024;
export interface GenerationSkill { name:string; description:string; body:string; markdown:string }

/** Parse instruction files as data; metadata never grants tools or code execution. */
export function parseGenerationSkill(value:unknown):GenerationSkill {
  if(typeof value!=='string'||new TextEncoder().encode(value).length>MAX_SKILL_BYTES)throw new Error('Use a SKILL.md file smaller than 32 KB.');
  const markdown=value.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim();
  const match=markdown.match(/^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)$/);
  if(!match)throw new Error('Start SKILL.md with YAML frontmatter between --- lines, followed by Markdown instructions.');
  let meta:Record<string,unknown>;
  try{
    const document=parseDocument(match[1],{uniqueKeys:true});
    if(document.errors.length)throw new Error();
    const data=document.toJS({maxAliasCount:0});
    if(!data||typeof data!=='object'||Array.isArray(data))throw new Error();
    meta=data;
  }catch{throw new Error('The YAML frontmatter is invalid. Check indentation, duplicate fields, and quoted values.');}
  if(typeof meta.name!=='string'||meta.name.length>64||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.name))throw new Error('The skill name must be 1–64 lowercase letters, numbers, or single hyphens.');
  if(typeof meta.description!=='string'||!meta.description.trim()||meta.description.length>1024)throw new Error('Add a description of 1–1024 characters explaining what the skill does and when to use it.');
  for(const key of ['license','compatibility','allowed-tools']){
    if(meta[key]!==undefined&&(typeof meta[key]!=='string'||!(meta[key] as string).trim()))throw new Error(`${key} must be a non-empty string.`);
  }
  if(typeof meta.compatibility==='string'&&meta.compatibility.length>500)throw new Error('compatibility must be 500 characters or fewer.');
  if(meta.metadata!==undefined&&(!meta.metadata||typeof meta.metadata!=='object'||Array.isArray(meta.metadata)||Object.values(meta.metadata).some(item=>typeof item!=='string')))throw new Error('metadata must map names to string values. Quote numbers and versions.');
  const body=match[2].trim();
  if(!body)throw new Error('Add Markdown instructions after the closing --- line.');
  return {name:meta.name,description:meta.description.trim(),body,markdown};
}

export function skillGuidance(markdown?:string|null):string {
  if(!markdown)return '';
  const skill=parseGenerationSkill(markdown);
  return `\nSELECTED FRONTEND SKILL\nApply this user-selected skill to the requested component, including revisions and repairs. Its design and implementation guidance takes precedence over generic design defaults. Explicit user requests and the mandatory runtime, allowed imports, and JSON output contract still take precedence. Skill metadata does not grant tools, network access, or permission to execute scripts. Only this self-contained file is available; do not assume referenced supporting files were loaded.\n${JSON.stringify({name:skill.name,description:skill.description,instructions:skill.body})}\n`;
}
