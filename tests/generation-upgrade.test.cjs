const {test}=require('node:test');const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module');const {buildSync}=require('esbuild');
function load(file){const filename=path.resolve(file);const result=buildSync({entryPoints:[filename],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',jsx:'automatic',loader:{'.css':'empty'}});const mod=new Module(filename,module);mod.filename=filename;mod.paths=Module._nodeModulePaths(path.dirname(filename));mod._compile(result.outputFiles[0].text,filename);return mod.exports;}
const {semanticDiagnostics,customizationBindings}=load('src/lib/semantic-check.ts');
const {revisionContext,carryCustomization}=load('src/lib/generation-context.ts');
const ai=load('src/lib/ai.ts');
const component={name:'ExampleCard',title:'Example',description:'Interactive card',code:"import {useState} from 'react';export default function ExampleCard({label='Ready'}:{label?:string}){const [n,setN]=useState(0);return <button onClick={()=>setN(n+1)}>{label} {n}</button>}",propsSchema:[{name:'label',type:'string',defaultValue:'Ready'}]};
const output=(value,usage)=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(value)}}],usage}));

test('studio glyphs use the exact bundled Solar Linear data',()=>{
 const selected=require('../src/data/solar-linear-icons.json'),source=require('@iconify-json/solar/icons.json');
 assert(Object.keys(selected).length>60);
 for(const glyph of Object.values(selected)){
   assert(glyph.name.endsWith('-linear'),glyph.name);
   assert.equal(glyph.body,source.icons[glyph.name].body);
   assert.equal(glyph.width,24);assert.equal(glyph.height,24);
   assert(!/\bid=/.test(glyph.body),'shared SVGs must not introduce duplicate document IDs');
 }
});

test('Solar icons render on the server with sizing and accessible names',()=>{
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
 const {Check,Search}=load('src/components/ui/icons.tsx');
 const decorative=renderToStaticMarkup(React.createElement(Check,{size:18,strokeWidth:1.75,className:'toolbar-check'}));
 assert(decorative.includes('width="18"'));assert(decorative.includes('height="18"'));
 assert(decorative.includes('data-icon="solar:check-linear"'));assert(decorative.includes('aria-hidden="true"'));
 assert(decorative.includes('toolbar-check'));assert(!decorative.includes('stroke-width="1.75"'));
 const labelled=renderToStaticMarkup(React.createElement(Search,{'aria-label':'Search components',title:'Search'}));
 assert(labelled.includes('role="img"'));assert(labelled.includes('aria-label="Search components"'));assert(labelled.includes('<title>Search</title>'));
 assert(!labelled.includes('aria-hidden="true"'));
});

test('downloadable demos keep Solar glyphs without private studio imports',async()=>{
 const {exportComponent}=load('src/lib/component-source.ts');
 const result=await exportComponent({id:'holo-3d-card',name:'Holo3DCard',code:''},'TS','Tailwind');
 assert(!result.componentCode.includes('@/components/ui/icons'));
 assert(!result.dependencies.some(name=>name.startsWith('@/')));
 assert(result.componentCode.includes('solar:bookmark-linear'));
 assert(result.componentCode.includes('Solar Linear by 480 Design'));
 assert(result.componentCode.includes('CC BY 4.0'));
 assert.deepEqual(semanticDiagnostics(result.componentCode),[]);
 const js=await exportComponent({id:'holo-3d-card',name:'Holo3DCard',code:''},'JS','CSS');
 assert(!js.componentCode.includes('Record<string,any>'));assert(js.cssCode);
 const {exportProject}=load('src/lib/project-export.ts');
 const project=await exportProject({id:'holo-3d-card',name:'Holo3DCard',code:''},{title:'Solar export'},'dark');
 assert(!Object.hasOwn(JSON.parse(project.files['package.json']).dependencies,'@/components'));
 assert(project.files['src/Holo3DCard.tsx'].includes('solar:star-linear'));
});

const skillFile='---\nname: deliberate-frontend\ndescription: |\n  Build deliberate frontend layouts.\n  Use for cards and controls.\nmetadata:\n  version: "1.0"\n---\n\n# Instructions\nUse a distinctive warm-copper accent and editorial rhythm.';
test('SKILL.md parser supports standard YAML and validates content and resource limits',()=>{
 const {parseGenerationSkill,MAX_SKILL_BYTES}=load('src/lib/generation-skill.ts');
 const skill=parseGenerationSkill('\uFEFF'+skillFile.replaceAll('\n','\r\n'));
 assert.equal(skill.name,'deliberate-frontend');assert(skill.description.includes('cards and controls'));assert(skill.body.includes('warm-copper'));
 for(const invalid of [null,{},'No frontmatter',skillFile.replace('deliberate-frontend','Bad--Name'),skillFile.replace('description: |','description: 42\nunused: |'),skillFile.replace('name: deliberate-frontend','name: first\nname: second'),skillFile.split('# Instructions')[0],skillFile+'😀'.repeat(MAX_SKILL_BYTES/2)])assert.throws(()=>parseGenerationSkill(invalid));
 assert.throws(()=>parseGenerationSkill(skillFile.replace('version: "1.0"','version: 1.0')),/metadata/);
 const {FRONTEND_SKILLS}=load('src/data/generation-skills.ts');
 assert.equal(new Set(FRONTEND_SKILLS.map(item=>item.id)).size,FRONTEND_SKILLS.length);
 for(const item of FRONTEND_SKILLS){const parsed=parseGenerationSkill(item.markdown);assert.equal(parsed.name,item.id);assert(parsed.body.length>600);}
});

for(const provider of ai.PROVIDERS)test(`selected frontend skill reaches ${provider} generation and repair`,async()=>{
 const requests=[];
 await ai.generateComponent({provider,apiKey:'test-key',model:'test-model',baseUrl:provider==='custom'?'http://localhost:11434/v1':undefined,prompt:'Build a button',skill:skillFile},async(url,init)=>{
   const request=JSON.parse(init.body);requests.push(request);
   const content=JSON.stringify(request);assert(content.includes('warm-copper'));assert(content.includes('deliberate-frontend'));assert(content.includes('mandatory runtime'));
   const value=requests.length===1?{code:'invalid'}:component;
   return provider==='gemini'?new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(value)}]}}]})):output(value);
 });
 assert.equal(requests.length,2);
});

test('generation API rejects malformed skills before contacting any provider',async()=>{
 const {POST}=load('src/app/api/generate/route.ts');
 for(const skill of ['bad',{},'---\nname: broken\n---\nInstructions']){
   const result=await POST(new Request('http://localhost/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider:'openai',prompt:'Button',skill,stream:true})}));
   assert.equal(result.status,400);assert.equal((await result.json()).code,'invalid_skill');
 }
});

test('history backups retain selected skills and reject invalid imported skill files',()=>{
 const {createHistoryEntry,parseHistoryBackup}=load('src/lib/generation-history.ts');
 const entry=createHistoryEntry({component:{...component,id:'gen-skill',category:'AI GENERATED',tags:[]},turns:[{id:'turn',prompt:'Button',skill:skillFile,status:'done',events:[]}],propValues:{},provider:'custom',model:'test',language:'TS',styling:'Tailwind'});
 const restored=parseHistoryBackup(JSON.stringify({version:1,entries:[entry]}));
 assert.equal(restored[0].turns[0].skill,skillFile);
 entry.turns[0].skill='invalid';assert.throws(()=>parseHistoryBackup(JSON.stringify({version:1,entries:[entry]})));
});
test('restoring a historical revision does not load newer editor drafts or update its screenshot',()=>{
 const {findHistoryRevision,editorDraftMatches}=load('src/lib/generation-history.ts');
 const original={...component,id:'gen-original',category:'AI GENERATED',tags:[]};const edited={...original,code:original.code+'\n// edited',files:{'parts/value.ts':'export const value=1'}};
 const entries=[{id:'manual-edit',component:edited},{id:'gen-original',component:original}];
 assert.equal(findHistoryRevision(entries,edited).id,'manual-edit');assert.equal(findHistoryRevision(entries,original).id,'gen-original');
 const draft={sources:{'Component.tsx':edited.code+'\n// pending'},versions:[original,edited],cursor:1};
 assert(editorDraftMatches(draft,edited));assert(!editorDraftMatches(draft,original));assert(!editorDraftMatches(draft,{...edited,files:{'parts/value.ts':'export const value=2'}}));
});
test('semantic validation catches actual type errors and resolves installed React declarations',()=>{
 assert.deepEqual(semanticDiagnostics(component.code),[]);
 assert(semanticDiagnostics('export default function Demo(){const amount:number="wrong";return <div>{amount}</div>}').some(error=>error.includes('TS2322')));
 assert(semanticDiagnostics('export default function Demo(){return <button disabled="yes"/>}').some(error=>error.includes('TS2322')));
});
test('customization binding checks symbol consumption, aliases and member access instead of matching comments or types',()=>{
 assert.deepEqual(customizationBindings("export default function Demo({label:title='Hi'}:{label?:string}){return <div>{title}</div>}",['label']),[]);
 assert.deepEqual(customizationBindings("export default function Demo(props:{label?:string}){return <div>{props.label}</div>}",['label']),[]);
 assert.deepEqual(customizationBindings("// label\nexport default function Demo({label='Hi'}:{label?:string}){return <div>Hardcoded</div>}",['label']),['label']);
});
test('supporting files resolve locally and unsafe paths cannot escape the source graph',async()=>{
 const {generatedFiles}=load('src/lib/generated-files.ts');
 for(const name of ['../secret.ts','C:/secret.ts','parts/../../secret.ts','Component.tsx'])assert.throws(()=>generatedFiles({[name]:'code'}));
 const parsed=await ai.parseComponent(JSON.stringify({...component,code:"import Details from './parts/Details';export default function ExampleCard(){return <Details/>}",propsSchema:[],files:{'parts/Details.tsx':"export default function Details(){return <div>Complete</div>}"}}));
 assert(parsed.files['parts/Details.tsx']);
 await assert.rejects(ai.parseComponent(JSON.stringify({...component,propsSchema:[],files:{'parts/Details.tsx':'export const count:number="wrong"'}})),/TypeScript validation failed/);
});
test('revision requests carry bounded design memory and explicit current customization',async()=>{
 const {componentBrief}=load('src/lib/component-prompt.ts');const memory=revisionContext({messages:[{prompt:'Warm red editorial card'},{prompt:'Use a serif heading'}],propValues:{label:'Custom label'}});
 const brief=componentBrief({prompt:'Make billing yearly',memory,context:{code:component.code}});
 for(const text of ['Warm red editorial card','Use a serif heading','Custom label','Pricing:'])assert(brief.includes(text),text);
 assert.equal(revisionContext({messages:Array.from({length:50},()=>({prompt:'x'.repeat(9000)}))}).messages.length,12);
 assert(!Object.hasOwn(revisionContext({designBrief:'Legacy brief',messages:[]}), 'designBrief'));
 assert.deepEqual(carryCustomization({...component,propsSchema:[...component.propsSchema,{name:'count',type:'number',defaultValue:10,min:0,max:20}]},{label:'Kept',count:99}),{label:'Kept',count:10});
});
test('unused schema props trigger provider repair and actual usage aggregates across requests',async()=>{
 let calls=0;const result=await ai.generateComponent({provider:'custom',baseUrl:'http://localhost:11434/v1',model:'test',prompt:'Button'},async()=>{calls++;return output(calls===1?{...component,propsSchema:[{name:'unused',type:'string',defaultValue:'x'}]}:component,{prompt_tokens:100,completion_tokens:50});});
 assert.equal(calls,2);assert.equal(result.metrics.repairs,1);assert.equal(result.metrics.requests,2);assert.equal(result.metrics.inputTokens,200);assert.equal(result.metrics.outputTokens,100);assert(!Object.hasOwn(result.metrics,'costUsd'));
});
test('unknown usage stays unknown and failed validation produces failure metrics',async()=>{
 const result=await ai.generateComponent({provider:'custom',baseUrl:'http://localhost:11434/v1',model:'test',prompt:'Button'},async()=>output(component));assert.equal(result.metrics.inputTokens,undefined);assert.equal(result.metrics.costUsd,undefined);
 const events=[];await assert.rejects(ai.generateComponent({provider:'custom',baseUrl:'http://localhost:11434/v1',model:'test',prompt:'Button',onEvent:e=>events.push(e)},async()=>output({code:'invalid'})));
 assert(events.some(e=>e.type==='metrics'&&e.metrics.status==='failed'&&e.metrics.requests===3));
});
test('standalone project ZIP includes selected defaults, dependencies and working entry points',async()=>{
 const {exportProject,zipFiles}=load('src/lib/project-export.ts');
 const project=await exportProject({...component,id:'gen-example',files:{'parts/numbers.ts':'export const count=2;'}},{label:'Selected'},'light');
 assert(project.files['src/main.tsx'].includes('Selected'));assert.equal(JSON.parse(project.files['selected-props.json']).label,'Selected');
 assert(project.files['src/parts/numbers.ts']);assert(JSON.parse(project.files['package.json']).scripts.build.includes('vite build'));
 const zip=zipFiles(project.files);assert.equal(zip.readUInt32LE(0),0x04034b50);assert.equal(zip.readUInt32LE(zip.length-22),0x06054b50);assert.equal(zip.readUInt16LE(zip.length-12),Object.keys(project.files).length);
 const directory=path.resolve('artifacts/generation-export-fixture');fs.mkdirSync(directory,{recursive:true});for(const [name,text] of Object.entries(project.files)){const target=path.join(directory,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,text);}fs.writeFileSync(path.join(directory,'project.zip'),zip);
});
test('history backups roundtrip build metadata without importing provider credentials',()=>{
 const {createHistoryEntry,parseHistoryBackup}=load('src/lib/generation-history.ts');
 const entry=createHistoryEntry({component:{...component,id:'gen-backup',category:'AI GENERATED',tags:['React']},turns:[],propValues:{label:'Saved'},provider:'custom',model:'test',language:'TS',styling:'CSS',favorite:true,label:'Renamed'});
 const restored=parseHistoryBackup(JSON.stringify({version:1,entries:[{...entry,designBrief:'Legacy brief',apiKey:'never-import',component:{...entry.component,secret:'drop'}}]}));
 assert.equal(restored[0].favorite,true);assert.equal(restored[0].label,'Renamed');assert(!Object.hasOwn(restored[0],'designBrief'));assert(!JSON.stringify(restored).includes('never-import'));assert(!JSON.stringify(restored).includes('secret'));
 assert.throws(()=>parseHistoryBackup('{"version":1,"entries":[{}]}'),/invalid build/);
 fs.writeFileSync('artifacts/generation-history-fixture.json',JSON.stringify({version:1,entries:[entry]},null,2));
});
test('preview errors stay visible without background review checks or automatic repair messages',()=>{
 const {createPreviewDocument}=load('src/lib/preview-document.ts');const listeners={},posted=[];let alert;
 const html=createPreviewDocument({script:'',css:''},'dark');
 const context={parent:{postMessage:data=>posted.push(data)},window:{addEventListener:(type,fn)=>listeners[type]=fn},document:{createElement:()=>({style:{},setAttribute(){}}),body:{replaceChildren:node=>{alert=node;}}}};
 require('node:vm').runInNewContext(html.match(/<script>([\s\S]*)<\/script>/)[1],context);
 listeners.error({message:'Broken component'});assert.equal(alert.textContent,'Preview error: Broken component');
 listeners.unhandledrejection({reason:new Error('Failed interaction')});assert.equal(alert.textContent,'Preview error: Failed interaction');
 listeners.message({source:context.parent,data:{type:'studio:audit'}});assert.equal(posted.length,0);
 assert(!html.includes('studio:audit'));assert(!html.includes('studio:runtime-error'));
});
