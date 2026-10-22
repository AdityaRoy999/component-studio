import type { ComponentPreset } from '@/data/presets';
import type { BuildTurn } from './generation-events';
import type { Provider } from './ai-shared';
import { parseGenerationSkill } from './generation-skill';
import { isSnapshot, validateImageReferences } from './image-references';
import { revisionContext } from './generation-context';

export interface HistoryEntry {
  thumbnail?:string;
  id:string; createdAt:string; component:ComponentPreset; turns:BuildTurn[];
  provider:Provider; model:string; language:'TS'|'JS'; styling:'Tailwind'|'CSS';
  propValues:Record<string,unknown>;
  favorite?:boolean;
  label?:string;
}
export function createHistoryEntry(input:Omit<HistoryEntry,'id'|'createdAt'>):HistoryEntry {
  return {id:input.component.id,createdAt:new Date().toISOString(),component:input.component,
    turns:input.turns.map(turn=>({id:turn.id,prompt:turn.prompt,skill:turn.skill,images:turn.images,status:turn.status,events:turn.events,thinking:turn.thinking,source:turn.source,fileName:turn.fileName,error:turn.error,response:turn.response,metrics:turn.metrics})),
    provider:input.provider,model:input.model,language:input.language,styling:input.styling,propValues:input.propValues,favorite:input.favorite,label:input.label,...(input.thumbnail?{thumbnail:input.thumbnail}:{})};
}
export function mergeHistory(...groups:HistoryEntry[][]):HistoryEntry[] {
  return [...new Map(groups.flat().map(entry=>[entry.id,entry])).values()].sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
}
export function findHistoryRevision(entries:HistoryEntry[],component:ComponentPreset|null){
  return component?entries.find(entry=>entry.component.id===component.id&&sameSource(entry.component,component)):undefined;
}
function sameSource(left:Pick<ComponentPreset,'code'|'cssCode'|'files'>,right:Pick<ComponentPreset,'code'|'cssCode'|'files'>){
  return left.code===right.code&&(left.cssCode||'')===(right.cssCode||'')&&JSON.stringify(left.files||{})===JSON.stringify(right.files||{});
}
function database():Promise<IDBDatabase> {
  return new Promise((resolve,reject)=>{
    if(typeof indexedDB==='undefined'){reject(new Error('History storage is unavailable in this browser.'));return;}
    const request=indexedDB.open('component-studio-history',2);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains('generations'))request.result.createObjectStore('generations',{keyPath:'id'});if(!request.result.objectStoreNames.contains('drafts'))request.result.createObjectStore('drafts');};
    request.onerror=()=>reject(new Error('History could not open. Check your browser storage settings.'));
    request.onblocked=()=>reject(new Error('Close older studio tabs to finish opening history.'));
    request.onsuccess=()=>{request.result.onversionchange=()=>request.result.close();resolve(request.result);};
  });
}
export async function deleteHistory(id:string){
  const db=await database();return new Promise<void>((resolve,reject)=>{const tx=db.transaction('generations','readwrite');tx.objectStore('generations').delete(id);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(new Error('Could not delete this build.'));};});
}
export interface WorkspaceDraft {component:ComponentPreset|null;turns:BuildTurn[];propValues:Record<string,unknown>;language:'TS'|'JS';styling:'Tailwind'|'CSS';liveSource:string;draft:{code:string;cssCode?:string;files?:Record<string,string>}|null;savedAt:string;}
export async function writeDraft(value:WorkspaceDraft|null){
  const db=await database();return new Promise<void>((resolve,reject)=>{const tx=db.transaction('drafts','readwrite');const store=tx.objectStore('drafts');if(value)store.put(value,'workspace');else store.delete('workspace');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(new Error('Draft recovery is unavailable. Check browser storage.'));};});
}
export async function readDraft():Promise<WorkspaceDraft|null>{
  const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('drafts','readonly');const req=tx.objectStore('drafts').get('workspace');tx.oncomplete=()=>{db.close();resolve(req.result||null);};tx.onerror=()=>{db.close();reject(new Error('Draft could not load.'));};});
}
export interface EditorDraft {sources:Record<string,string>;versions:Pick<ComponentPreset,'code'|'cssCode'|'files'>[];cursor:number;}
export function editorDraftMatches(draft:EditorDraft,component:ComponentPreset){
  const base=draft.versions?.[draft.cursor];return Boolean(base&&sameSource(base,component));
}
export async function saveEditorDraft(id:string,value:EditorDraft){
  const db=await database();return new Promise<void>((resolve,reject)=>{const tx=db.transaction('drafts','readwrite');tx.objectStore('drafts').put(value,'editor:'+id);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>{db.close();reject(new Error('Editor recovery could not save.'));};});
}
export async function loadEditorDraft(id:string):Promise<EditorDraft|null>{
  const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('drafts','readonly');const req=tx.objectStore('drafts').get('editor:'+id);tx.oncomplete=()=>{db.close();resolve(req.result||null);};tx.onerror=()=>{db.close();reject(new Error('Editor recovery could not load.'));};});
}
export function parseHistoryBackup(raw:string):HistoryEntry[]{
  if(raw.length>30000000)throw new Error('Backup exceeds 30 MB.');
  const value=JSON.parse(raw);if(value.version!==1||!Array.isArray(value.entries)||value.entries.length>500)throw new Error('Choose a Component Studio history backup (up to 500 builds).');
  return value.entries.map((item:HistoryEntry)=>{
    if(!item||!item.component||typeof item.id!=='string'||typeof item.createdAt!=='string'||!Number.isFinite(Date.parse(item.createdAt))||typeof item.component.code!=='string'||!Array.isArray(item.turns)||!Array.isArray(item.component.propsSchema)||typeof item.propValues!=='object'||!item.propValues||!['gemini','groq','openai','openrouter','nvidia','custom'].includes(item.provider))throw new Error('This backup contains an invalid build.');
    const source=item.component;
    if(!/^[A-Z][A-Za-z0-9]*$/.test(source.name)||typeof source.id!=='string'||typeof source.title!=='string'||typeof source.description!=='string'||source.code.length>1000000||source.cssCode!=null&&(typeof source.cssCode!=='string'||source.cssCode.length>1000000)||source.propsSchema.length>30||item.turns.length>100)throw new Error('This backup contains invalid component source.');
    if(source.files!=null&&(typeof source.files!=='object'||Array.isArray(source.files)||Object.entries(source.files).some(([name,code])=>!/^(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.(tsx?|jsx?|css)$/.test(name)||typeof code!=='string'||code.length>1000000)))throw new Error('This backup contains invalid supporting files.');
    if(source.propsSchema.some(field=>!field||typeof field.name!=='string'||!['string','number','boolean','color','select'].includes(field.type)||field.type==='select'&&(!Array.isArray(field.options)||field.options.some(option=>typeof option!=='string'))))throw new Error('This backup contains invalid customization controls.');
    const turns=item.turns.map(turn=>{
      if(!turn||typeof turn.id!=='string'||typeof turn.prompt!=='string'||!Array.isArray(turn.events)||turn.events.some(event=>!event||typeof event.phase!=='string'||typeof event.message!=='string')||!['working','done','stopped','error'].includes(turn.status))throw new Error('This backup contains an invalid conversation.');
      return {id:turn.id,prompt:turn.prompt.slice(0,12000),skill:turn.skill==null?null:parseGenerationSkill(turn.skill).markdown,status:turn.status,events:turn.events.slice(0,100),images:validateImageReferences(turn.images),thinking:typeof turn.thinking==='string'?turn.thinking:undefined,source:typeof turn.source==='string'?turn.source.slice(0,1000000):undefined,response:typeof turn.response==='string'?turn.response:undefined,error:typeof turn.error==='string'?turn.error:undefined,fileName:typeof turn.fileName==='string'?turn.fileName:undefined,metrics:turn.metrics&&Number.isFinite(turn.metrics.durationMs)&&Number.isFinite(turn.metrics.repairs)&&['success','failed'].includes(turn.metrics.status)?turn.metrics:undefined};
    });
    const component:ComponentPreset={id:source.id,name:source.name,title:source.title,description:source.description,category:typeof source.category==='string'?source.category:'AI GENERATED',tags:Array.isArray(source.tags)?source.tags.filter(tag=>typeof tag==='string'):[],code:source.code,cssCode:source.cssCode,files:source.files,propsSchema:source.propsSchema,sourceUrl:typeof source.sourceUrl==='string'&&source.sourceUrl.startsWith('https://reactbits.dev/')?source.sourceUrl:undefined};
    return {...createHistoryEntry({...item,component,turns,model:typeof item.model==='string'?item.model:'',favorite:item.favorite===true,label:typeof item.label==='string'?item.label.slice(0,150):undefined,propValues:revisionContext({propValues:item.propValues}).propValues||{},language:item.language==='JS'?'JS':'TS',styling:item.styling==='CSS'?'CSS':'Tailwind',thumbnail:isSnapshot(item.thumbnail)?item.thumbnail:undefined}),id:item.id,createdAt:item.createdAt};
  });
}
export async function saveHistory(entry:HistoryEntry):Promise<void> {
  const db=await database();
  return new Promise((resolve,reject)=>{
    const transaction=db.transaction('generations','readwrite');transaction.objectStore('generations').put(entry);
    transaction.oncomplete=()=>{db.close();resolve();};
    transaction.onabort=transaction.onerror=()=>{db.close();reject(new Error('This build is open, but could not be saved. Your browser storage may be full or disabled.'));};
  });
}
export async function loadHistory():Promise<HistoryEntry[]> {
  const db=await database();
  return new Promise((resolve,reject)=>{
    const transaction=db.transaction('generations','readonly');const request=transaction.objectStore('generations').getAll();
    transaction.oncomplete=()=>{db.close();resolve(mergeHistory(request.result.filter((item:HistoryEntry)=>item?.component&&typeof item.component.code==='string'&&Array.isArray(item.turns))));};
    transaction.onabort=transaction.onerror=()=>{db.close();reject(new Error('Saved builds could not be loaded. Please retry.'));};
  });
}
