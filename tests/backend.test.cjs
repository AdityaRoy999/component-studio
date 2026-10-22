const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const Module=require('node:module');
const {buildSync}=require('esbuild');
function load(file){const filename=path.resolve(file);const {outputFiles}=buildSync({entryPoints:[filename],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',jsx:'automatic',loader:{'.css':'empty'}});const mod=new Module(filename,module);mod.filename=filename;mod.paths=Module._nodeModulePaths(path.dirname(filename));mod._compile(outputFiles[0].text,filename);return mod.exports;}
const ai=load('src/lib/ai.ts');const source=load('src/lib/component-source.ts');
test('all thirty library implementations and styles match the recorded official registry imports',()=>{
 const fs=require('node:fs'),{createHash}=require('node:crypto');
 const manifest=JSON.parse(fs.readFileSync('third_party/reactbits/source-manifest.json','utf8'));
 assert.equal(manifest.repository,'https://github.com/DavidHDev/react-bits');
 assert.equal(manifest.files.filter(file=>file.name.endsWith('.tsx')).length,30);
 assert.equal(manifest.files.length,52);
 for(const file of manifest.files){
   assert(file.registry.startsWith('https://reactbits.dev/r/'));
   const hash=filename=>createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
   assert.equal(hash(`artifacts/reactbits-official/${file.name}`),file.upstreamSha256,`${file.name}: original registry snapshot`);
   assert.equal(hash(`src/components/reactbits/library/${file.name}`),file.integratedSha256,`${file.name}: integrated implementation`);
 }
 const patched=manifest.files.filter(file=>file.patches.length).map(file=>file.name).sort();
 assert.deepEqual(patched,['Folder.tsx','LetterGlitch.tsx','Waves.tsx']);
});
for(const name of ['LetterGlitch','Waves'])test(`${name} keeps an attached canvas context alive during effect replay and releases it on unmount`,()=>{
 const ts=require('typescript'),fs=require('node:fs'),vm=require('node:vm');
 const filename=`src/components/reactbits/library/${name}.tsx`;
 const ast=ts.createSourceFile(filename,fs.readFileSync(filename,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let cleanup;
 function visit(node){
   if(ts.isReturnStatement(node)&&node.expression&&ts.isArrowFunction(node.expression)&&node.expression.getText(ast).includes('gl.deleteProgram'))cleanup=node.expression;
   ts.forEachChild(node,visit);
 }
 visit(ast);assert(cleanup,`${name} provides effect cleanup`);
 const tasks=[],canvas={isConnected:true};let lost=0,deleted=0,cancelled=0;
 const noop=()=>{},observer={disconnect:noop},events={removeEventListener:noop};
 const scope={
   canvas,alive:true,raf:1,wakeRef:{current:noop},resizeObserver:observer,intersection:observer,
   window:events,document:{...events,documentElement:events,fonts:events},
   onPointerMove:noop,onPointerDown:noop,onPointerUp:noop,onPointerLeave:noop,onVisibility:noop,onFonts:noop,
   atlasTexture:{},stateTexture:{},texture:{},vao:{},program:{program:{}},
   cancelAnimationFrame:()=>cancelled++,queueMicrotask:task=>tasks.push(task),
   gl:{deleteTexture:()=>deleted++,deleteVertexArray:()=>deleted++,deleteProgram:()=>deleted++,getExtension:()=>({loseContext:()=>lost++})}
 };
 const run=()=>vm.runInNewContext(`(${cleanup.getText(ast)})()`,scope);
 const flush=()=>{while(tasks.length)tasks.shift()();};
 run();flush();assert.equal(lost,0,'Strict Mode can set up the same attached canvas again');assert(deleted>0);assert.equal(cancelled,1);
 run();canvas.isConnected=false;assert.equal(lost,0,'detachment completes before releasing the context');
 flush();assert.equal(lost,1,'a genuinely unmounted canvas releases its context');
});

test('Letter Glitch preserves transparent and translucent CSS backgrounds',()=>{
 const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
 const LetterGlitch=load('src/components/reactbits/library/LetterGlitch.tsx').default;
 for(const backgroundColor of ['transparent','rgba(40, 60, 80, 0.25)']){
   const html=renderToStaticMarkup(React.createElement(LetterGlitch,{backgroundColor}));
   assert(html.includes(`background-color:${backgroundColor}`));
 }
});

test('a missing application chunk reloads once without looping or swallowing unrelated errors',()=>{
 const {chunkRecoveryScript}=load('src/lib/chunk-recovery.ts');
 const listeners={},values=new Map();let reloads=0,now=100000;
 require('node:vm').runInNewContext(chunkRecoveryScript,{
   window:{addEventListener:(event,callback)=>listeners[event]=callback},
   sessionStorage:{getItem:key=>values.get(key),setItem:(key,value)=>values.set(key,value)},
   location:{reload:()=>reloads++},Date:{now:()=>now}
 });
 listeners.error({error:Error('Unrelated component error')});assert.equal(reloads,0);
 listeners.unhandledrejection({reason:Error('ChunkLoadError: Loading chunk app/layout failed.')});assert.equal(reloads,1);
 listeners.error({message:'Loading CSS chunk failed'});assert.equal(reloads,1);
 now+=60001;listeners.error({error:Error('Failed to fetch dynamically imported module')});assert.equal(reloads,2);
});

test('chunk recovery remains safe when browser session storage is disabled',()=>{
 const {chunkRecoveryScript}=load('src/lib/chunk-recovery.ts');const listeners={};let reloads=0;
 require('node:vm').runInNewContext(chunkRecoveryScript,{
   window:{addEventListener:(event,callback)=>listeners[event]=callback},
   sessionStorage:{getItem:()=>{throw Error('Storage disabled');}},location:{reload:()=>reloads++}
 });
 assert.doesNotThrow(()=>listeners.error({error:Error('ChunkLoadError')}));assert.equal(reloads,0);
});

test('library customization names match the implementation props and use supported values',async()=>{
 const {PRESETS}=load('src/data/presets.ts');const ts=require('typescript');
 for(const preset of PRESETS){
   const implementation=await source.resolveSource(preset);
   const ast=ts.createSourceFile(`${preset.name}.tsx`,implementation.code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
   const members=new Map(),declarations=new Map();
   for(const node of ast.statements)if(ts.isInterfaceDeclaration(node)||ts.isTypeAliasDeclaration(node))declarations.set(node.name.text,node);
   function collect(node,seen=new Set()){
     if(!node||seen.has(node))return;seen.add(node);
     if(node.members)for(const member of node.members)if(member.name)members.set(member.name.getText(ast).replace(/['"]/g,''),member);
     if(ts.isTypeAliasDeclaration(node))collect(node.type,seen);
     if(ts.isIntersectionTypeNode(node))for(const part of node.types)collect(part,seen);
     if(ts.isTypeReferenceNode(node))collect(declarations.get(node.typeName.getText(ast)),seen);
   }
   function typeText(node){const text=node.getText(ast);return ts.isTypeReferenceNode(node)&&declarations.has(text)?typeText(declarations.get(text).type):text;}
   collect(declarations.get(`${preset.name}Props`));assert(members.size,`${preset.name} declares its props`);
   for(const item of preset.propsSchema){
     assert(members.has(item.name),`${preset.title}: ${item.name} is a supported prop`);
     if(item.type==='select')for(const option of item.options)assert(typeText(members.get(item.name).type).includes(`'${option}'`),`${preset.title}: ${option} is supported`);
     if(item.type==='number'){assert(item.defaultValue>=item.min&&item.defaultValue<=item.max,`${preset.title}: numeric default is in range`);}
   }
 }
 const radius=PRESETS.find(item=>item.id==='text-pressure').propsSchema.find(item=>item.name==='radius');
 assert(radius.min>0&&radius.max<=1,'Text Pressure uses a fraction of the text width, not pixels');
});
test('live source catches up smoothly without losing bytes or splitting Unicode',()=>{
 const {advanceSource}=load('src/lib/source-stream.ts');
 const target='const title = "A useful ✨ component";\n'.repeat(180);
 let shown='',frames=0;
 while(shown!==target&&frames++<60){const next=advanceSource(shown,target,16);assert(next.startsWith(shown));assert(target.startsWith(next));assert(!/[\uD800-\uDBFF]$/.test(next));shown=next;}
 assert.equal(shown,target);assert(frames>1);assert(frames<60);
 const replaced=advanceSource(shown,'export default function Repaired(){return null}',16);
 assert('export default function Repaired(){return null}'.startsWith(replaced));assert(!replaced.includes('useful'));
 assert.equal(advanceSource('anything','',16),'');
});

test('live source tail stays bounded through long streams and preserves logical row positions',()=>{
 const {appendSourceTail,emptySourceTail,advanceSourceLength}=load('src/lib/source-stream.ts');
 const target=Array.from({length:1800},(_,i)=>`const row${i} = "Smooth ✨ source";\n`).join('');
 let state=emptySourceTail(),length=0;
 while(length<target.length){
   const next=advanceSourceLength(length,target,1000/60);
   state=appendSourceTail(state,target.slice(length,next));length=next;
   assert(state.text.length<=8192);assert(state.text.split('\n').length<=24);
   assert(target.slice(0,length).endsWith(state.text));
   assert.equal(state.firstLine+state.text.split('\n').length,state.lineCount);
   assert(!/[\uD800-\uDBFF]$/.test(state.text));
 }
 assert.equal(state.lineCount,1801);assert.equal(state.firstLine,1777);
 const longLine=appendSourceTail(emptySourceTail(),'🙂'.repeat(12000));
 assert(longLine.text.length<=8192);assert(!/^[\uDC00-\uDFFF]/.test(longLine.text));
 assert.equal(longLine.lineCount,1);
});

test('source reveal uses elapsed time consistently on 60Hz and 120Hz displays',()=>{
 const {advanceSourceLength}=load('src/lib/source-stream.ts');
 const target='a'.repeat(50000);
 const progress=hz=>{let length=0;for(let frame=0;frame<hz*.2;frame++)length=advanceSourceLength(length,target,1000/hz);return length;};
 assert(Math.abs(progress(60)-progress(120))<30);
 assert.equal(advanceSourceLength(10,'short',16),5);
});

test('preview customization resets initializer state while themes and reordered props preserve it',()=>{
 const {createPreviewDocument}=load('src/lib/preview-document.ts');
 const html=createPreviewDocument({script:'',css:''},'dark');
 const renders=[],parent={},root={dataset:{},classList:{toggle:()=>{}}},listeners={};
 const sandbox={parent,setTimeout,clearTimeout,document:{documentElement:root},window:{addEventListener:(name,callback)=>{const previous=listeners[name];listeners[name]=event=>{previous?.(event);callback(event);};},__RENDER__:(props,key)=>renders.push({props,key})}};
 require('node:vm').runInNewContext(html.match(/<script>([\s\S]*)<\/script>/)[1],sandbox);
 function update(propValues,theme='dark',resetKey=0){listeners.message({source:parent,data:{type:'studio:props',propValues,theme,resetKey}});}
 update({defaultTrackIndex:0,autoPlay:false});
 update({autoPlay:false,defaultTrackIndex:0},'light');
 assert.equal(renders[0].key,renders[1].key);assert.equal(renders[1].props.theme,'light');
 update({defaultTrackIndex:1,autoPlay:false},'light');assert.notEqual(renders[1].key,renders[2].key);
 update({defaultTrackIndex:1,autoPlay:true},'light');assert.notEqual(renders[2].key,renders[3].key);
 update({defaultTrackIndex:1,autoPlay:true},'dark');assert.equal(renders[3].key,renders[4].key);
 update({defaultTrackIndex:1,autoPlay:true},'dark',1);assert.notEqual(renders[4].key,renders[5].key);
});
const component={name:'ExampleCard',title:'Example',description:'Interactive card',code:"import React from 'react';export default function ExampleCard({label='Ready'}:{label?:string}){return <button className='px-4 rounded-xl'>{label}</button>}",propsSchema:[{name:'label',type:'string',defaultValue:'Ready'}]};
test('history snapshots retain source and conversation without provider credentials',()=>{
 const history=load('src/lib/generation-history.ts');
 const entry=history.createHistoryEntry({component:{...component,id:'gen-history'},turns:[{id:'turn',prompt:'Create a card',events:[],status:'done',source:component.code,response:'Built a compact card with an editable label.'}],provider:'groq',model:'test-model',language:'TS',styling:'Tailwind',propValues:{label:'Ready'},apiKey:'private-test-key',baseUrl:'https://private-endpoint.example'});
 assert.equal(entry.component.code,component.code);assert.equal(entry.turns[0].prompt,'Create a card');
 assert.equal(entry.turns[0].response,'Built a compact card with an editable label.');
 assert(!JSON.stringify(entry).includes('private-test-key'));assert(!JSON.stringify(entry).includes('private-endpoint'));
 const earlier={...entry,id:'older',createdAt:'2026-01-01T00:00:00.000Z'};
 const merged=history.mergeHistory([earlier,entry],[{...entry,model:'latest'}]);assert.equal(merged.length,2);assert.equal(merged[0].model,'latest');
});
test('model discovery prefers a coding-capable default without replacing a user choice',()=>{
 const {preferredModel}=load('src/lib/model-selection.ts');
 const models=[{id:'allam-2-7b'},{id:'whisper-large-v3'},{id:'openai/gpt-oss-120b'}];
 assert.equal(preferredModel('groq',models),'openai/gpt-oss-120b');assert.equal(preferredModel('groq',models,'allam-2-7b'),'allam-2-7b');
 assert.equal(preferredModel('custom',[{id:'whisper-large-v3'},{id:'coding-model'}]),'coding-model');
});
test('Groq GPT-OSS exposes supported thinking depths and sends the selected effort',()=>{
 const shared=load('src/lib/ai-shared.ts');const {generationOptions}=load('src/lib/generation-options.ts');
 assert(shared.supportsThinking('groq','openai/gpt-oss-120b'));assert.equal(shared.canDisableThinking('groq','openai/gpt-oss-120b'),false);
 assert.equal(generationOptions('groq','openai/gpt-oss-120b','medium').compatible.reasoning_effort,'medium');
 assert.equal(generationOptions('groq','whisper-large-v3','high').compatible.reasoning_effort,undefined);
});
function output(provider,value=component){return new Response(JSON.stringify(provider==='gemini'?{candidates:[{content:{parts:[{text:JSON.stringify(value)}]}}]}:{choices:[{finish_reason:'stop',message:{content:JSON.stringify(value)}}]}),{status:200});}
for(const provider of ai.PROVIDERS)test(`generation adapter: ${provider}`,async()=>{let request;const fetcher=async(url,init)=>{request={url,init};return output(provider);};const result=await ai.generateComponent({provider,apiKey:'unit-test-key',prompt:'Create a button',...(provider==='custom'?{baseUrl:'http://127.0.0.1:11434/v1/',model:'local-model:7b'}:provider==='nvidia'?{model:'nvidia/test-model'}:{})},fetcher);assert.equal(result.component.name,'ExampleCard');assert.match(result.component.id,/^gen-/);assert(result.component.code.includes('export default'));assert(!request.url.includes('unit-test-key'));assert.equal(request.init.method,'POST');const headers=request.init.headers;assert.equal(provider==='gemini'?headers['x-goog-api-key']:headers.Authorization,provider==='gemini'?'unit-test-key':'Bearer unit-test-key');});
test('provider errors are actionable without exposing upstream text',async()=>{for(const [status,code] of [[401,'invalid_key'],[429,'rate_limit'],[404,'model_unavailable']])await assert.rejects(ai.generateComponent({provider:'openai',apiKey:'unit-test-key',prompt:'Button'},async()=>new Response('secret request contents',{status})),e=>e.code===code&&!e.message.includes('secret'));});
test('invalid component gets one repair attempt',async()=>{let calls=0;const result=await ai.generateComponent({provider:'openai',apiKey:'unit-test-key',prompt:'Button'},async()=>output('openai',++calls===1?{code:'invalid'}:component));assert.equal(calls,2);assert.equal(result.component.name,'ExampleCard');});

test('HTML style strings trigger repair before a successful generation',async()=>{
 let calls=0;
 const invalid={...component,code:'export default function Card(){return <div style="padding: 24px">Booking</div>}'};
 const result=await ai.generateComponent({provider:'openai',apiKey:'unit-test-key',prompt:'Booking card'},async(url,init)=>{
  calls++;if(calls===2)assert.match(JSON.parse(init.body).messages[1].content,/React style must be an object/);
  return output('openai',calls===1?invalid:component);
 });
 assert.equal(calls,2);assert.equal(result.component.name,'ExampleCard');
 await ai.parseComponent(JSON.stringify({...component,code:'export default function Card(){const example=\'style="padding: 24px"\';return <pre style={{padding:24}}>{example}</pre>}'}));
});

test('invented Tailwind palettes are rejected while explicit colors and companion CSS work',async()=>{
 const code='export default function Card(){return <div className={["bg-terracotta-50", "text-muted-foreground"].join(" ")}>Booking</div>}';
 await assert.rejects(ai.parseComponent(JSON.stringify({...component,code})),/Tailwind classes have no styles.*bg-terracotta-50/);
 await ai.parseComponent(JSON.stringify({...component,code:code.replace('bg-terracotta-50','bg-[#fff7ed]').replace('text-muted-foreground','text-stone-600')}));
 await ai.parseComponent(JSON.stringify({...component,code,cssCode:'.bg-terracotta-50{background:#fff7ed}.text-muted-foreground{color:#57534e}'}));
});

test('blocked browser dialogs trigger a repair diagnostic instead of a dead preview action',async()=>{
 for(const call of ['alert("Reserved")','window.confirm("Reserve?")'])await assert.rejects(ai.parseComponent(JSON.stringify({...component,code:`export default function Card(){return <button onClick={()=>${call}}>Reserve</button>}`})),/browser dialogs are blocked/);
});
test('invalid output after two repairs reports a useful diagnostic',async()=>{let calls=0;await assert.rejects(ai.generateComponent({provider:'openai',apiKey:'unit-test-key',prompt:'Button'},async()=>{calls++;return output('openai',{code:'invalid'});}),e=>e.code==='invalid_component'&&e.message.includes('export default'));assert.equal(calls,3);});

test('unsupported Tailwind 3D classes trigger a precise repair instead of a mirrored flip',async()=>{
 let calls=0,repair='';
 const broken={...component,code:'export default function Card(){return <div className="perspective-1000"><div className="backface-hidden">Member</div></div>}'};
 await ai.generateComponent({provider:'custom',model:'test',baseUrl:'http://localhost:11434/v1',prompt:'3D card'},async(url,init)=>{calls++;if(calls===2)repair=JSON.parse(init.body).messages[1].content;return output('custom',calls===1?broken:component);});
 assert.equal(calls,2);assert(repair.includes('unavailable in Tailwind 3'));assert(repair.includes('[backface-visibility:hidden] on BOTH faces'));
 await ai.parseComponent(JSON.stringify({...component,code:'export default function Card(){return <div className="[perspective:1000px]"><div className="[backface-visibility:hidden]">Member</div></div>}'}));
 await ai.parseComponent(JSON.stringify({...broken,cssCode:'.perspective-1000{perspective:1000px}.backface-hidden{backface-visibility:hidden}'}));
});

test('HTTP 413 token-throughput errors include a safe retry delay in both response modes',async()=>{
 for(const stream of [false,true])await assert.rejects(ai.generateComponent({provider:'groq',apiKey:'unit-test-key',prompt:'Card',...(stream?{onEvent:()=>{}}:{})},async()=>new Response(JSON.stringify({error:{message:'Request too large for organization PRIVATE-ORG on tokens per minute (TPM): Limit 8000'}}),{status:413,headers:{'retry-after':'148'}})),error=>error.code==='rate_limit'&&error.status===429&&error.message.includes('3 minutes')&&!error.message.includes('PRIVATE-ORG'));
});

test('other HTTP 413 errors distinguish context size from provider quota',async()=>{
 await assert.rejects(ai.generateComponent({provider:'custom',model:'test',baseUrl:'http://localhost:11434/v1',prompt:'Card'},async()=>new Response(JSON.stringify({error:{message:'PRIVATE input is too long'}}),{status:413})),error=>error.code==='context_limit'&&error.status===413&&!error.message.includes('PRIVATE'));
});
test('verification uses model listing rather than a paid generation',async()=>{let url;const result=await ai.verifyProvider('groq','unit-test-key',undefined,async input=>{url=input;return new Response(JSON.stringify({data:[{id:'llama-3.3-70b-versatile'}]}));});assert(url.endsWith('/models'));assert.equal(result.success,true);});
test('server configuration never exposes API keys',()=>{const config=ai.providerConfig('openai',undefined,undefined,{OPENAI_API_KEY:'server-test-key'});assert.equal(config.apiKey,'server-test-key');assert(!JSON.stringify(ai.publicProviders()).includes('apiKey'));});
test('CSS export contains the actual Tailwind rules and companion import',async()=>{const result=await source.exportComponent(component,'TS','CSS');assert(result.cssCode.includes('.px-4'));assert(result.cssCode.includes('padding-left: 1rem'));assert(result.componentCode.includes("import './ExampleCard.css'"));});
test('JavaScript export strips TypeScript while preserving JSX',async()=>{const result=await source.exportComponent(component,'JS','Tailwind');assert(!result.componentCode.includes('label?:'));assert(result.componentCode.includes('<button'));assert.equal(result.filename,'ExampleCard.jsx');});
test('library export returns the complete component rather than a demo wrapper',async()=>{const result=await source.exportComponent({id:'gradient-ascii',name:'GradientASCII',code:''},'TS','Tailwind');assert(result.componentCode.includes("getContext('webgl2'"));assert(result.cssCode.includes('.gradient-ascii-container'));assert(result.componentCode.length>20000);});


test('custom endpoints allow keyless generation and normalize the base URL',async()=>{
 let request;
 const result=await ai.generateComponent({provider:'custom',baseUrl:'http://localhost:11434/v1/',model:'local-model:7b',prompt:'Button'},async(url,init)=>{request={url,init};return output('custom');});
 assert.equal(result.model,'local-model:7b');assert.equal(request.url,'http://localhost:11434/v1/chat/completions');
 assert.equal(request.init.headers.Authorization,undefined);assert.equal(request.init.redirect,'error');
 assert.equal(JSON.parse(request.init.body).response_format,undefined);
});
test('custom settings validate required values and URL schemes before making requests',async()=>{
 const fetcher=async()=>{assert.fail('Invalid settings must not make a request');};
 for(const [settings,code] of [[{model:'local-model'},'missing_base_url'],[{baseUrl:'http://localhost:11434/v1'},'missing_model'],[{model:'local-model',baseUrl:'file:///secret'},'invalid_base_url'],[{model:'local-model',baseUrl:'https://user:secret@example.com/v1'},'invalid_base_url'],[{model:'local-model',baseUrl:'https://example.com/v1?key=secret'},'invalid_base_url']]){
  await assert.rejects(ai.generateComponent({provider:'custom',prompt:'Button',...settings},fetcher),e=>e.code===code);
 }
});
test('custom connection testing checks the selected model without a key',async()=>{
 const fetcher=async(url,init)=>{assert.equal(url,'http://localhost:11434/v1/models');assert.equal(init.headers.Authorization,undefined);return new Response(JSON.stringify({data:[{id:'local-model'}]}));};
 assert.equal((await ai.verifyProvider('custom',undefined,'local-model',fetcher,'http://localhost:11434/v1')).success,true);
 await assert.rejects(ai.verifyProvider('custom',undefined,'missing-model',fetcher,'http://localhost:11434/v1'),e=>e.code==='model_unavailable');
});
test('custom endpoint overrides never inherit a different server endpoint key',()=>{
 const env={CUSTOM_API_KEY:'server-test-key',CUSTOM_BASE_URL:'https://original.example/v1',CUSTOM_MODEL:'server-model'};
 assert.equal(ai.providerConfig('custom',undefined,undefined,env).apiKey,'server-test-key');
 assert.equal(ai.providerConfig('custom',undefined,undefined,env,'https://other.example/v1').apiKey,'');
 assert.equal(ai.providerConfig('custom',undefined,undefined,env,'https://original.example/v1/').apiKey,'server-test-key');
 assert.equal(ai.providerConfig('openai','test-key',undefined,{},'http://localhost:11434/v1').origin,'https://api.openai.com/v1');
});


test('Gemini discovery collects all pages and only includes generation models',async()=>{
 const requests=[];
 const models=await ai.listProviderModels('gemini','discovery-test-key',async(url,init)=>{
  requests.push(url);assert.equal(init.headers['x-goog-api-key'],'discovery-test-key');assert(!url.includes('discovery-test-key'));
  return new Response(JSON.stringify(requests.length===1?{models:[{name:'models/chat-a',displayName:'Chat A',supportedGenerationMethods:['generateContent']},{name:'models/embedding',supportedGenerationMethods:['embedContent']}],nextPageToken:'next-page'}:{models:[{name:'models/chat-b',supportedGenerationMethods:['generateContent']}]}));
 });
 assert.deepEqual(models.map(item=>item.id),['chat-a','chat-b']);assert.equal(models[0].label,'Chat A');assert.equal(new URL(requests[1]).searchParams.get('pageToken'),'next-page');
});
test('compatible discovery handles pagination and duplicate IDs without requiring a model',async()=>{
 let calls=0;
 const models=await ai.listProviderModels('custom',undefined,async(url,init)=>{
  calls++;assert.equal(init.headers.Authorization,undefined);
  if(calls===2)assert.equal(new URL(url).searchParams.get('after'),'local-a');
  return new Response(JSON.stringify(calls===1?{data:[{id:'local-a'}],has_more:true,last_id:'local-a'}:{data:[{id:'local-a'},{id:'local-b'}],has_more:false}));
 },'http://localhost:11434/v1');
 assert.deepEqual(models.map(item=>item.id),['local-a','local-b']);assert.equal(calls,2);
});
test('NVIDIA model discovery uses the fixed NVIDIA endpoint and Bearer authentication',async()=>{
 const models=await ai.listProviderModels('nvidia','nvidia-test-key',async(url,init)=>{
  assert.equal(url,'https://integrate.api.nvidia.com/v1/models');assert.equal(init.headers.Authorization,'Bearer nvidia-test-key');
  return new Response(JSON.stringify({data:[{id:'nvidia/test-model'}]}));
 });
 assert.equal(models[0].id,'nvidia/test-model');
});
test('discovery fails safely on authentication and cyclic pagination',async()=>{
 await assert.rejects(ai.listProviderModels('groq','bad-key',async()=>new Response('private upstream contents',{status:401})),error=>error.code==='invalid_key'&&!error.message.includes('private'));
 await assert.rejects(ai.listProviderModels('custom',undefined,async()=>new Response(JSON.stringify({data:[{id:'local-a'}],has_more:true,last_id:'same'})),'http://localhost:11434/v1'),error=>error.code==='invalid_model_list');
});
const {test:streamTest}=require('node:test');
const {partialField}=load('src/lib/generation-events.ts');
function streamOutput(provider,value=component){
 const text=JSON.stringify(value);const packets=[];
 for(let i=0;i<text.length;i+=31){const part=text.slice(i,i+31);packets.push(`data: ${JSON.stringify(provider==='gemini'?{candidates:[{content:{parts:[{text:part}]}}]}:{choices:[{delta:{content:part}}]})}\r\n\r\n`);}
 packets.push('data: [DONE]\n\n');const bytes=new TextEncoder().encode(packets.join(''));let offset=0;
 return new Response(new ReadableStream({pull(controller){if(offset>=bytes.length){controller.close();return;}controller.enqueue(bytes.slice(offset,offset+17));offset+=17;}}),{headers:{'Content-Type':'text/event-stream'}});
}
streamTest('partial source decoder handles unfinished escapes and Unicode',()=>{
 assert.equal(partialField('{"code":"return \\"Hi\\";\\n\\u2665','code'),'return "Hi";\n♥');
 assert.equal(partialField('{"code":"abc\\u26','code'),'abc');
 assert.equal(partialField('{"cssCode":".a{color:red}"','cssCode'),'.a{color:red}');
});
for(const provider of ['gemini','nvidia','custom'])streamTest(`live generation streams source and validates: ${provider}`,async()=>{
 const events=[];let request;
 const result=await ai.generateComponent({provider,apiKey:'stream-test-key',model:'stream-model',...(provider==='custom'?{baseUrl:'http://127.0.0.1:11434/v1'}:{}),prompt:'Build a card',onEvent:event=>events.push(event)},async(url,init)=>{request={url,init};return streamOutput(provider);});
 assert.equal(result.component.name,'ExampleCard');assert(events.some(event=>event.type==='source'&&event.code.includes('export default')));assert(events.some(event=>event.type==='status'&&event.phase==='validating'));
 assert.equal(provider==='gemini'?request.url.endsWith(':streamGenerateContent?alt=sse'):JSON.parse(request.init.body).stream,true);
 assert(!JSON.stringify(events).includes('stream-test-key'));
});
streamTest('invalid named exports trigger repair using compiler diagnostics',async()=>{
 let calls=0;let repair;
 const result=await ai.generateComponent({provider:'custom',baseUrl:'http://localhost:11434/v1',model:'test',prompt:'Button'},async(url,init)=>{calls++;if(calls===2)repair=JSON.parse(init.body).messages[1].content;return output('custom',calls===1?{...component,code:"import {ThisIconDoesNotExist} from 'lucide-react';export default function Broken(){return <ThisIconDoesNotExist/>}"}:component);});
 assert.equal(result.component.name,'ExampleCard');assert.equal(calls,2);assert(repair.includes('ThisIconDoesNotExist'));assert(repair.includes('No matching export'));
});
streamTest('SSE streams provider reasoning to thinking events and handles stream error events safely',async()=>{
 const text=JSON.stringify(component);const payload=`data: ${JSON.stringify({choices:[{delta:{reasoning_content:'private chain of thought'}}]})}\n\ndata: ${JSON.stringify({choices:[{delta:{content:text}}]})}\n\ndata: [DONE]\n\n`;
 const events=[];await ai.generateComponent({provider:'custom',baseUrl:'http://localhost:11434/v1',model:'test',prompt:'Card',onEvent:e=>events.push(e)},async()=>new Response(payload,{headers:{'Content-Type':'text/event-stream'}}));assert(events.some(e=>e.type==='thinking'&&e.text.includes('private chain')));
 await assert.rejects(ai.generateComponent({provider:'custom',baseUrl:'http://localhost:11434/v1',model:'test',prompt:'Card',onEvent:()=>{}},async()=>new Response('data: {"error":{"message":"private upstream contents"}}\n\n',{headers:{'Content-Type':'text/event-stream'}})),e=>e.code==='provider_error'&&!e.message.includes('private'));
});
streamTest('component parsing accepts fenced JSON and rejects unsupported imports',async()=>{
 assert.equal((await ai.parseComponent('```json\n'+JSON.stringify(component)+'\n```')).name,'ExampleCard');
 await assert.rejects(ai.parseComponent(JSON.stringify({...component,code:"import fs from 'node:fs';export default function Demo(){return <div/>}"})),/Unsupported import/);
});

test('NVIDIA Lightning requests direct response mode for responsive component generation',async()=>{
 let body;
 await ai.generateComponent({provider:'nvidia',apiKey:'test-key',model:'nvidia/nemotron-3.5-lightning-30b-a3b',prompt:'A button',onEvent:()=>{}},async(url,init)=>{body=JSON.parse(init.body);return streamOutput('nvidia');});
 assert.deepEqual(body.chat_template_kwargs,{enable_thinking:false});
});

const options=load('src/lib/generation-options.ts');
const shared=load('src/lib/ai-shared.ts');
const {ThinkingStream}=load('src/lib/thinking-stream.ts');

test('revision briefs preserve the complete accepted source and include the current date',()=>{
 const {componentBrief}=load('src/lib/component-prompt.ts');
 const source='/*'+ 'x'.repeat(70000)+'*/ export default function FullRevisionMarker(){return null}';
 const brief=componentBrief({prompt:'Refine spacing',context:{code:source}});
 assert(brief.includes(source));assert(brief.includes(new Date().toISOString().slice(0,10)));
});

test('design brief forwards theme, style and existing source to provider in both response modes',async()=>{
 for(const streamed of [false,true]){
  let body;
  await ai.generateComponent({provider:'custom',baseUrl:'http://localhost:11434/v1',model:'test',prompt:'Make the booking card warmer',theme:'light',styling:'CSS',context:{code:component.code,cssCode:'.card{color:#222}'},...(streamed?{onEvent:()=>{}}:{})},async(url,init)=>{body=JSON.parse(init.body);const response=output('custom');response.headers.set('Content-Type','application/json');return response;});
  const brief=body.messages[1].content;
  assert(brief.includes('Host theme: light'));assert(brief.includes('Styling: CSS'));assert(brief.includes(component.code));assert(brief.includes('.card{color:#222}'));assert(brief.includes('Make the booking card warmer'));
 }
});
test('generation budgets preserve requested thinking effort without allocating the whole output window',()=>{
 for(const model of ['o3-mini','gpt-5','gpt-6.1-sol']){
  const result=options.generationOptions('openai',model,'medium');
  assert.equal(result.compatible.reasoning_effort,'medium');assert.equal(result.compatible.max_completion_tokens,12288);assert.equal(result.compatible.max_tokens,undefined);
 }
});

test('lean output budgets respect model limits and can expand for an incomplete answer',()=>{
 assert.equal(options.generationOptions('groq','openai/gpt-oss-120b','high').compatible.max_completion_tokens,16384);
 assert.equal(options.generationOptions('gemini','test','high',65536).gemini.maxOutputTokens,16384);
 assert.equal(options.generationOptions('openai','test',undefined,100000).compatible.max_completion_tokens,8192);
 assert.equal(options.generationOptions('openai','test','high',2048).compatible.max_completion_tokens,2048);
 assert.equal(options.generationOptions('groq','openai/gpt-oss-120b','low',65536,32768).compatible.max_completion_tokens,32768);
 assert.equal(options.generationOptions('custom','test',undefined,8192).compatible.max_tokens,8192);
 for(const invalid of [0,-1,Infinity,NaN,2.5])assert.equal(options.generationOptions('custom','test',undefined,invalid).compatible.max_tokens,undefined);
});

test('discovered output limits are scoped to the provider endpoint',async()=>{
 const endpoint='http://localhost:11434/budget-test/v1';
 await ai.listProviderModels('custom',undefined,async()=>new Response(JSON.stringify({data:[{id:'budget-test',max_completion_tokens:24576}]})),endpoint);
 let discovered,other;
 await ai.generateComponent({provider:'custom',baseUrl:endpoint,model:'budget-test',prompt:'Card'},async(url,init)=>{discovered=JSON.parse(init.body);return output('custom');});
 await ai.generateComponent({provider:'custom',baseUrl:'http://localhost:11434/different/v1',model:'budget-test',prompt:'Card'},async(url,init)=>{other=JSON.parse(init.body);return output('custom');});
 assert.equal(discovered.max_tokens,8192);assert.equal(other.max_tokens,undefined);
});

test('a second repair uses the latest source and diagnostic',async()=>{
 let calls=0;const prompts=[];
 const result=await ai.generateComponent({provider:'custom',baseUrl:'http://localhost:11434/v1',model:'test',prompt:'Card'},async(url,init)=>{
  prompts.push(JSON.parse(init.body).messages[1].content);calls++;
  return output('custom',calls===1?{code:'first invalid source'}:calls===2?{...component,code:'export default function Card(){return <div style="color:red"/>}'}:component);
 });
 assert.equal(result.component.name,'ExampleCard');assert.equal(calls,3);assert(prompts[2].includes('React style must be an object'));assert(prompts[2].includes('color:red'));assert(!prompts[2].includes('first invalid source'));
});
test('NVIDIA thinking selection is honored and unsupported models get no template flags',()=>{
 assert.equal(options.generationOptions('nvidia','nvidia/nemotron-3.5-super-vl-120b-a12b','low').compatible.reasoning_effort,'low');
 assert.equal(options.generationOptions('nvidia','nvidia/nemotron-3.5-super-vl-120b-a12b','off').compatible.reasoning_effort,undefined);
 assert.deepEqual(options.generationOptions('nvidia','nvidia/nemotron-3.5-lightning-30b-a3b','high').compatible.chat_template_kwargs,{enable_thinking:true});
 assert.deepEqual(options.generationOptions('nvidia','nvidia/nemotron-3.5-lightning-30b-a3b','off').compatible.chat_template_kwargs,{enable_thinking:false});
 assert.equal(options.generationOptions('nvidia','meta/llama-3.3-70b-instruct','high').compatible.chat_template_kwargs,undefined);
});
test('Gemini generation uses family-specific thinking configuration',()=>{
 assert.deepEqual(options.generationOptions('gemini','gemini-3.7-flash','medium').gemini.thinkingConfig,{thinkingLevel:'MEDIUM'});
 assert.deepEqual(options.generationOptions('gemini','gemini-2.5-flash','off').gemini.thinkingConfig,{thinkingBudget:0});
 assert.deepEqual(options.generationOptions('gemini','gemini-2.5-pro','off').gemini.thinkingConfig,{thinkingBudget:1024});
 assert.equal(shared.canDisableThinking('gemini','gemini-2.5-pro'),false);assert.equal(shared.canDisableThinking('openai','o3'),false);
});
test('inline thinking tags are separated at every possible stream boundary without corrupting code literals',()=>{
 const payload='<think>Plan a useful card.</think>'+JSON.stringify({...component,description:'Literal <think> inside JSON stays intact.'});
 for(let split=1;split<payload.length;split++){
  const parser=new ThinkingStream();const parts=[parser.push(payload.slice(0,split)),parser.push(payload.slice(split)),parser.push('',true)];
  assert.equal(parts.map(p=>p.thinking).join(''),'Plan a useful card.');
  const content=JSON.parse(parts.map(p=>p.content).join(''));assert.equal(content.description,'Literal <think> inside JSON stays intact.');
 }
});
test('last SSE delta is preserved when it also carries the length finish reason',async()=>{
 const events=[];const payload='data: '+JSON.stringify({choices:[{finish_reason:'length',delta:{content:JSON.stringify(component)}}]})+'\n\ndata: [DONE]\n\n';
 const result=await ai.generateComponent({provider:'custom',baseUrl:'http://localhost:11434/v1',model:'test',prompt:'Card',onEvent:e=>events.push(e)},async()=>new Response(payload,{headers:{'Content-Type':'text/event-stream'}}));
 assert.equal(result.component.name,'ExampleCard');assert(events.some(e=>e.type==='source'&&e.code.includes('export default')));
});
test('interrupted stream reports a useful error without leaking upstream details',async()=>{
 await assert.rejects(ai.consumeSSE(new Response(new ReadableStream({pull(c){c.error(new Error('private upstream details'));}})),()=>{}),e=>e.code==='stream_interrupted'&&!e.message.includes('private'));
});

test('component parsing preserves tag-like strings inside generated JSON',async()=>{
 const parsed=await ai.parseComponent(JSON.stringify({...component,description:'Render the literal <think>label</think> as content.'}));
 assert.equal(parsed.description,'Render the literal <think>label</think> as content.');
});

test('missing React hooks are repaired before any broken live checkpoint mounts',async()=>{
 let calls=0;const events=[];
 const broken={...component,code:'export default function Card(){useEffect(()=>{},[]);return <button>Ready</button>}'};
 const result=await ai.generateComponent({provider:'custom',baseUrl:'http://localhost:11434/v1',model:'test',prompt:'Button',onEvent:event=>events.push(event)},async(url,init)=>{
  calls++;if(calls===2)assert(JSON.parse(init.body).messages[1].content.includes('Missing React import: useEffect'));
  const value=calls===1?broken:component;
  return new Response('data: '+JSON.stringify({choices:[{delta:{content:JSON.stringify(value)}}]})+'\n\ndata: [DONE]\n\n',{headers:{'Content-Type':'text/event-stream'}});
 });
 assert.equal(calls,2);assert.equal(result.component.name,'ExampleCard');assert(!events.some(event=>event.type==='preview'&&event.code.includes('useEffect')));
 await assert.rejects(ai.parseComponent(JSON.stringify({...component,code:'export default function Card(){return <MissingIcon/>}'})),/Missing component import or declaration/);
});

test('customization never turns event callbacks or React reserved props into scalar controls',async()=>{
 const parsed=await ai.parseComponent(JSON.stringify({...component,propsSchema:[
  ...component.propsSchema,{name:'disabled',type:'boolean',defaultValue:false},
  {name:'onClick',type:'boolean',defaultValue:true},{name:'onChange',type:'string',defaultValue:'invalid'},
  {name:'ref',type:'string',defaultValue:'invalid'},{name:'dangerouslySetInnerHTML',type:'string',defaultValue:'invalid'}
 ]}));
 assert.deepEqual(parsed.propsSchema.map(item=>item.name),['label','disabled']);
});

test('local JSON repair preserves component source without spending another model request',async()=>{
 const code="import {useEffect} from 'react';\nexport default function Card(){useEffect(()=>{},[]);return <button title='Run'>Run</button>}";
 let calls=0;
 const malformed='{name:"Card",title:"Ready",code:'+JSON.stringify(code)+',propsSchema:[],}';
 const result=await ai.generateComponent({provider:'custom',baseUrl:'http://localhost:11434/v1',model:'test',prompt:'Button'},async()=>{calls++;return new Response(JSON.stringify({choices:[{message:{content:malformed}}]}));});
 assert.equal(calls,1);assert.equal(result.component.code,code);
 const escapedKeys=JSON.stringify({...component}).replace(/^\{"name"/,'{\\"name\\"');
 const parsed=await ai.parseComponent(escapedKeys);assert.equal(parsed.code,component.code);
});

test('stalled SSE heartbeats time out and cancel their reader',async()=>{
 let timer,cancelled=false;
 const stream=new ReadableStream({start(controller){timer=setInterval(()=>controller.enqueue(new TextEncoder().encode(': keep-alive\n\n')),5);},cancel(){clearInterval(timer);cancelled=true;}});
 await assert.rejects(ai.consumeSSE(new Response(stream),()=>{},30),error=>error.code==='timeout');assert(cancelled);
});

test('an interrupted provider stream retries once with shorter NVIDIA reasoning',async()=>{
 for(const effort of ['high','low']){
 let calls=0;const bodies=[],events=[];
 const result=await ai.generateComponent({provider:'nvidia',apiKey:'unit-test-key',model:'nvidia/nemotron-3.5-super-vl-120b-a12b',thinkingEffort:effort,prompt:'Button',onEvent:event=>events.push(event)},async(url,init)=>{
  bodies.push(JSON.parse(init.body));calls++;
  if(calls===1)return new Response(new ReadableStream({pull(controller){controller.error(new Error('private transport detail'));}}),{headers:{'Content-Type':'text/event-stream'}});
  const response=output('nvidia');response.headers.set('Content-Type','application/json');return response;
 });
 assert.equal(calls,2);assert.equal(result.component.name,'ExampleCard');assert.equal(bodies[0].reasoning_effort,effort);assert.equal(bodies[1].reasoning_effort,effort==='high'?'low':undefined);assert.equal(bodies[1].chat_template_kwargs.enable_thinking,effort==='high');assert(events.some(event=>event.type==='status'&&event.message.includes('Retrying once')));
 }
});

test('Stop never starts an automatic recovery request',async()=>{
 const controller=new AbortController();let calls=0;
 await assert.rejects(ai.generateComponent({provider:'openai',apiKey:'unit-test-key',prompt:'Button',signal:controller.signal,onEvent:()=>{}},async()=>{calls++;controller.abort();throw new DOMException('Stopped','AbortError');}));assert.equal(calls,1);
});

test('truncated output gets one recovery with enough room for complete source',async()=>{
 let calls=0;const bodies=[];
 const result=await ai.generateComponent({provider:'groq',apiKey:'unit-test-key',model:'openai/gpt-oss-120b',thinkingEffort:'medium',prompt:'Button'},async(url,init)=>{
  bodies.push(JSON.parse(init.body));calls++;
  return calls===1?new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:'{"code":"export default'}}]})):output('groq');
 });
 assert.equal(calls,2);assert.equal(result.component.name,'ExampleCard');assert.equal(bodies[0].max_completion_tokens,12288);assert.equal(bodies[1].max_completion_tokens,24576);assert.equal(bodies[1].reasoning_effort,'low');
});

test('Ponytail guidance reaches the actual model request in a compact prompt',async()=>{
 let body;await ai.generateComponent({provider:'custom',baseUrl:'http://localhost:11434/v1',model:'test',prompt:'Button'},async(url,init)=>{body=JSON.parse(init.body);return output('custom');});
 const system=body.messages[0].content;assert(system.includes('PONYTAIL'));assert(system.includes('Never cut validation'));assert(system.includes('OUTPUT ONLY VALID JSON'));assert(system.length<10000);assert(system.includes('Support BOTH themes'));assert(system.includes('"message"'));
});

test('every provider receives the same quality contract in streamed and regular generation',async()=>{
 const {COMPONENT_SYSTEM_PROMPT,COMPONENT_FINAL_CHECK}=load('src/lib/component-prompt.ts');
 const {UI_UX_GUIDANCE,UI_UX_REQUEST_GUIDANCE}=load('src/lib/ui-ux-guidance.ts');
 for(const provider of ai.PROVIDERS)for(const streamed of [false,true]){
  let body;
  await ai.generateComponent({provider,apiKey:'unit-test-key',model:streamed?'large-test-model':'small-test-model',prompt:'A compact pricing card',theme:'light',...(provider==='custom'?{baseUrl:'http://localhost:11434/v1'}:{}),...(streamed?{onEvent:()=>{}}:{})},async(url,init)=>{body=JSON.parse(init.body);return streamed?streamOutput(provider):output(provider);});
  const system=provider==='gemini'?body.systemInstruction.parts[0].text:body.messages[0].content;
  const brief=provider==='gemini'?body.contents[0].parts[0].text:body.messages[1].content;
  assert.equal(system,COMPONENT_SYSTEM_PROMPT);
  assert(system.includes('QUALITY CONTRACT'));assert(system.includes('No invented certifications'));assert(system.includes('Every visible control'));
  assert(system.includes(UI_UX_GUIDANCE));assert(brief.includes(UI_UX_REQUEST_GUIDANCE));
  assert(system.length<10000);assert(brief.endsWith(COMPONENT_FINAL_CHECK));assert(brief.includes('Host theme: light'));
 }
});

test('repair requests retain the quality contract after the failed source',async()=>{
 const {COMPONENT_SYSTEM_PROMPT,COMPONENT_FINAL_CHECK}=load('src/lib/component-prompt.ts');
 const bodies=[];
 await ai.generateComponent({provider:'custom',model:'small-test-model',baseUrl:'http://localhost:11434/v1',prompt:'A compact pricing card'},async(url,init)=>{bodies.push(JSON.parse(init.body));return output('custom',bodies.length===1?{code:'invalid'}:component);});
 assert.equal(bodies.length,2);
 assert.equal(bodies[1].messages[0].content,COMPONENT_SYSTEM_PROMPT);
 const {UI_UX_GUIDANCE,UI_UX_REQUEST_GUIDANCE}=load('src/lib/ui-ux-guidance.ts');
 assert(bodies[1].messages[0].content.includes(UI_UX_GUIDANCE));
 const repair=bodies[1].messages[1].content;assert(repair.includes(UI_UX_REQUEST_GUIDANCE));assert(repair.includes('Previous response:'));assert(repair.endsWith(COMPONENT_FINAL_CHECK));
});

test('UI/UX defaults accompany vague and explicit requests without rewriting preferences or revision source',async()=>{
 const {UI_UX_GUIDANCE,UI_UX_REQUEST_GUIDANCE}=load('src/lib/ui-ux-guidance.ts');
 const requests=[
  {prompt:'Make a number counter'},
  {prompt:'Make a modern premium number counter'},
  {prompt:'Create a coral and cream counter, editorial serif type, square buttons; no card'},
  {prompt:'A dark cyan glass counter with a glowing value'},
  {prompt:'Only fix the reset control. Preserve the orange accent and current typography.',context:{code:component.code,cssCode:'.counter{color:#c2410c}'}},
 ];
 for(const request of requests){
  let body;
  await ai.generateComponent({provider:'custom',baseUrl:'http://localhost:11434/v1',model:'small-test-model',...request},async(url,init)=>{body=JSON.parse(init.body);return output('custom');});
  const system=body.messages[0].content,brief=body.messages[1].content;
  assert(system.includes(UI_UX_GUIDANCE));assert(system.includes('Explicit user preferences and visual references take priority'));
  assert(brief.startsWith(`REQUEST\n${request.prompt}\n`));assert(brief.includes(UI_UX_REQUEST_GUIDANCE));
  if(request.context){assert(brief.includes('REVISION'));assert(brief.includes(request.context.code));assert(brief.includes(request.context.cssCode));}
 }
});

test('the final AI reply is retained while host theme stays outside customization',async()=>{
 const parsed=await ai.parseComponent(JSON.stringify({...component,message:'Switch billing periods to compare the plan totals.',propsSchema:[...component.propsSchema,{name:'theme',type:'select',defaultValue:'dark',options:['dark','light']}]}));
 assert.equal(parsed.completionMessage,'Switch billing periods to compare the plan totals.');assert.deepEqual(parsed.propsSchema.map(item=>item.name),['label']);
 const bounded=await ai.parseComponent(JSON.stringify({...component,message:'x'.repeat(2000)}));assert.equal(bounded.completionMessage.length,1200);
});

test('preview and CSS exports use host-controlled dark classes rather than OS media queries',async()=>{
 const themed={...component,code:'export default function ThemeCard(){return <div className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">Theme</div>}'};
 const compiled=await load('src/lib/compile-preview.ts').compilePreview(themed.code);
 const exported=await source.exportComponent(themed,'TS','CSS');
 for(const css of [compiled.css,exported.cssCode]){assert(css.includes('.dark'));assert(!css.includes('prefers-color-scheme'));assert(css.includes('dark\\:bg-zinc-900'));}
});

test('sandbox theme bridge updates both the document and component props without reloading',()=>{
 const {createPreviewDocument}=load('src/lib/preview-document.ts');
 const html=createPreviewDocument({script:'window.componentReady=true;',css:''},'light');
 assert(html.includes('class="light" data-theme="light"'));assert(html.includes('scrollbar-width:none'));assert(html.includes('color-scheme:light'));
 const listeners={},renders=[];const classes=new Set(['light']);
 const root={dataset:{theme:'light'},classList:{toggle:(name,enabled)=>enabled?classes.add(name):classes.delete(name)}};
 const parent={postMessage:()=>{}};const sandbox={setTimeout,clearTimeout,window:{addEventListener:(name,callback)=>{const previous=listeners[name];listeners[name]=event=>{previous?.(event);callback(event);};},__RENDER__:value=>renders.push(value)},document:{documentElement:root},parent};
 const script=html.match(/<script>([\s\S]*)<\/script>/)[1];require('node:vm').runInNewContext(script,sandbox);
 listeners.message({source:{},data:{type:'studio:props',theme:'dark',propValues:{label:'Untrusted'}}});assert.equal(renders.length,0);
 listeners.message({source:parent,data:{type:'studio:props',theme:'dark',propValues:{label:'Ready',theme:'light'}}});assert.equal(root.dataset.theme,'dark');assert(classes.has('dark'));assert(!classes.has('light'));assert.equal(renders[0].theme,'dark');assert.equal(renders[0].label,'Ready');
 listeners.message({source:parent,data:{type:'studio:props',theme:'light',propValues:{label:'Still ready'}}});assert(classes.has('light'));assert(!classes.has('dark'));assert.equal(renders[1].theme,'light');
});

const referenceImage={id:'reference-1',name:'UI.png',mimeType:'image/png',dataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH9sAAAAASUVORK5CYII='};
test('reference validation rejects remote URLs, SVG, mismatched content, count and oversized images',()=>{
 const images=load('src/lib/image-references.ts');assert.equal(images.validateImageReferences([referenceImage])[0].dataUrl,referenceImage.dataUrl);
 for(const value of [[{...referenceImage,dataUrl:'https://example.com/image.png'}],[{...referenceImage,mimeType:'image/svg+xml',dataUrl:'data:image/svg+xml;base64,PHN2Zz4='}],[{...referenceImage,dataUrl:'data:image/png;base64,aGVsbG8='}],Array(4).fill(referenceImage),[{...referenceImage,dataUrl:'data:image/png;base64,'+'A'.repeat(5600000)}]])assert.throws(()=>images.validateImageReferences(value));
 assert.equal(images.imageCapability('groq','openai/gpt-oss-120b'),false);assert.equal(images.imageCapability('nvidia','nvidia/nemotron-3.5-super-vl-120b-a12b'),true);assert.equal(images.imageCapability('custom','local-model'),undefined);assert.equal(images.imageCapability('openai','o3-mini'),false);
 assert(!images.isSnapshot('data:image/svg+xml;base64,PHN2Zz4='));assert(images.isSnapshot('data:image/webp;base64,UklGRg=='));
});
for(const streaming of [false,true])for(const provider of ai.PROVIDERS)test(`image references reach ${provider}, streaming=${streaming}, and survive repair`,async()=>{
 const requests=[];let calls=0;
 const result=await ai.generateComponent({provider,apiKey:'unit-key',model:provider==='gemini'?'gemini-3.7-flash':provider==='groq'?'qwen/qwen3.8-27b':'vision-test',...(provider==='custom'?{baseUrl:'http://127.0.0.1:11434/v1'}:{}),prompt:'Clone the attached UI',images:[referenceImage],...(streaming?{onEvent:()=>{}}:{})},async(url,init)=>{
  requests.push(JSON.parse(init.body));const response=output(provider,++calls===1?{code:'invalid'}:component);response.headers.set('content-type','application/json');return response;
 });
 assert.equal(result.component.name,'ExampleCard');assert.equal(requests.length,2);
 for(const request of requests){
  if(provider==='gemini'){assert.equal(request.contents[0].parts[1].inlineData.mimeType,'image/png');assert.equal(request.contents[0].parts[1].inlineData.data,referenceImage.dataUrl.split(',')[1]);}
  else{assert.equal(request.messages[1].content[0].type,'text');assert.deepEqual(request.messages[1].content[1],{type:'image_url',image_url:{url:referenceImage.dataUrl}});}
 }
});
test('text-only models refuse attached images before any upstream request',async()=>{
 let called=false;await assert.rejects(ai.generateComponent({provider:'groq',apiKey:'unit-key',model:'openai/gpt-oss-120b',prompt:'Clone',images:[referenceImage]},async()=>{called=true;return output('groq');}),error=>error.code==='images_unsupported');assert.equal(called,false);
});
test('model catalog image modality is authoritative for otherwise unknown models',async()=>{
 await ai.listProviderModels('custom',undefined,async()=>new Response(JSON.stringify({data:[{id:'catalog-text-model',architecture:{input_modalities:['text']}}]})), 'http://127.0.0.1:11999/v1');
 await assert.rejects(ai.generateComponent({provider:'custom',baseUrl:'http://127.0.0.1:11999/v1',model:'catalog-text-model',prompt:'Clone',images:[referenceImage]},async()=>{throw Error('Should not fetch');}),error=>error.code==='images_unsupported');
});
test('saved conversation keeps reference images but never provider credentials',()=>{
 const history=load('src/lib/generation-history.ts');const entry=history.createHistoryEntry({component:{...component,id:'gen-reference'},turns:[{id:'t',prompt:'Clone',status:'done',events:[],images:[referenceImage],apiKey:'secret-key'}],provider:'custom',model:'vision',language:'TS',styling:'CSS',propValues:{}});assert.deepEqual(entry.turns[0].images,[referenceImage]);assert(!JSON.stringify(entry).includes('secret-key'));
});
test('snapshot code is included only for completed preview capture, with bounded raster output',async()=>{
 const {compilePreview}=load('src/lib/compile-preview.ts');const code='export default function Card(){return <div>Snapshot card</div>}';const plain=await compilePreview(code),capture=await compilePreview(code,'',true);assert(!plain.script.includes('__CAPTURE__'));assert(capture.script.includes('__CAPTURE__'));assert(capture.script.includes('image/webp'));assert(capture.script.includes('skipFonts'));
});

test('snapshot bridge ignores foreign messages and discards an obsolete capture after props change',async()=>{
 const {createPreviewDocument}=load('src/lib/preview-document.ts');const listeners={},timers=[],sent=[];let finish;
 const parent={postMessage:value=>sent.push(value)};const sandbox={parent,clearTimeout:()=>{},setTimeout:callback=>{timers.push(callback);return timers.length;},document:{documentElement:{dataset:{},classList:{toggle:()=>{}}}},window:{addEventListener:(name,callback)=>{const previous=listeners[name];listeners[name]=event=>{previous?.(event);callback(event);};},__RENDER__:()=>{},__CAPTURE__:()=>new Promise(resolve=>finish=resolve)}};
 const script=createPreviewDocument({script:'',css:''},'dark').match(/<script>([\s\S]*)<\/script>/)[1];require('node:vm').runInNewContext(script,sandbox);
 listeners.message({source:{},data:{type:'studio:props',snapshotId:'foreign'}});assert.equal(timers.length,0);
 listeners.message({source:parent,data:{type:'studio:props',snapshotId:'old',propValues:{}}});const pending=timers[0]();
 listeners.message({source:parent,data:{type:'studio:props',snapshotId:'new',propValues:{}}});finish('data:image/webp;base64,UklGRg==');await pending;assert.equal(sent.length,0);
 const latest=timers[1]();finish('data:image/webp;base64,UklGRg==');await latest;assert.equal(sent.length,1);assert.equal(sent[0].snapshotId,'new');
});

const modelProfiles=load('src/lib/model-profiles.ts');
const configA={id:'visual',name:'Visual references',provider:'nvidia',model:'nvidia/nemotron-3.5-super-vl-120b-a12b',apiKey:'',baseUrl:''};
const configB={id:'local',name:'Local drafts',provider:'custom',model:'local-model:7b',apiKey:'private-local-key',baseUrl:'http://127.0.0.1:11434/v1/'};
test('model configurations migrate the current provider, key, endpoint and selection together',()=>{
 const values={reactbits_provider:'custom',reactbits_model:'local-model:7b',reactbits_api_key:'legacy-key',reactbits_base_url:'http://localhost:11434/v1'};
 const setup=modelProfiles.readModelSetup({getItem:key=>values[key]||null});assert.equal(setup.profiles.length,1);assert.equal(setup.activeId,setup.profiles[0].id);assert.equal(setup.profiles[0].apiKey,'legacy-key');assert.equal(setup.profiles[0].baseUrl,values.reactbits_base_url);
});
test('several models, including two from the same provider, survive one atomic settings record',()=>{
 const setup=modelProfiles.validateModelSetup({version:1,profiles:[configA,configB,{...configA,id:'second-nvidia',name:'Alternative model',model:'another-model',apiKey:'separate-account-key'}],activeId:'local'},{nvidia:{configured:true,model:'server-default'}});
 const writes=[];modelProfiles.writeModelSetup({setItem:(key,value)=>writes.push([key,value])},setup);assert.equal(writes.length,1);
 const restored=modelProfiles.readModelSetup({getItem:key=>key===writes[0][0]?writes[0][1]:null});assert.deepEqual(restored,setup);assert.equal(restored.profiles[0].apiKey,'');assert.equal(restored.profiles[1].apiKey,'private-local-key');assert.equal(restored.profiles[2].apiKey,'separate-account-key');assert.equal(restored.profiles[1].baseUrl,'http://127.0.0.1:11434/v1');assert.equal(restored.activeId,'local');
});
test('all model configurations are validated, including inactive configurations',()=>{
 const validate=profiles=>modelProfiles.validateModelSetup({version:1,profiles,activeId:'visual'},{nvidia:{configured:true,model:'default'}});
 for(const invalid of [{...configB,model:''},{...configB,baseUrl:'https://user:password@example.com/v1'},{...configB,baseUrl:'https://example.com/v1?key=secret'},{...configB,baseUrl:'file:///private'},{...configB,provider:'openai',apiKey:''}])assert.throws(()=>validate([configA,invalid]));
 assert.throws(()=>validate([configA,{...configA}]),/active model/);assert.throws(()=>modelProfiles.validateModelSetup({version:1,profiles:[configA],activeId:'missing'},{}),/active model/);
 assert.throws(()=>validate([configA,...Array.from({length:20},(_,index)=>({...configB,id:'local-'+index}))]),/20 configurations/);
});
test('corrupt model setup falls back to the legacy configuration without mixing account credentials',()=>{
 for(const saved of ['{bad',JSON.stringify({version:1,profiles:[{...configA,provider:'unknown'}],activeId:'visual'})]){
  const setup=modelProfiles.readModelSetup({getItem:key=>key===modelProfiles.MODEL_PROFILES_KEY?saved:key==='reactbits_provider'?'groq':key==='reactbits_model'?'openai/gpt-oss-120b':null});assert.equal(setup.profiles[0].provider,'groq');assert.equal(setup.profiles[0].apiKey,'');
 }
 const saved=JSON.stringify({version:1,profiles:[configB],activeId:'missing'});const setup=modelProfiles.readModelSetup({getItem:key=>key===modelProfiles.MODEL_PROFILES_KEY?saved:null});assert.equal(setup.activeId,'local');
});
test('storage errors are reported instead of claiming configurations were saved',()=>{
 assert.throws(()=>modelProfiles.writeModelSetup({setItem:()=>{throw Error('quota');}},{version:1,profiles:[configA],activeId:'visual'}),/quota/);
});


test('responsive preview width stays within the available pane',()=>{
 const {clampPreviewWidth}=load('src/lib/preview-width.ts');
 for(const available of [220,390,600,1440]){
  assert.equal(clampPreviewWidth(null,available),available);
  assert.equal(clampPreviewWidth(4000,available),available);
  assert.equal(clampPreviewWidth(1,available),Math.min(280,available));
  assert.equal(clampPreviewWidth(375,available),Math.max(Math.min(280,available),Math.min(375,available)));
 }
});
test('responsive preview width handles hidden panes and invalid measurements',()=>{
 const {clampPreviewWidth}=load('src/lib/preview-width.ts');
 assert.equal(clampPreviewWidth(400,0),0);
 assert.equal(clampPreviewWidth(400,NaN),0);
 assert.equal(clampPreviewWidth(400,Infinity),0);
 assert.equal(clampPreviewWidth(NaN,600),600);
 assert.equal(clampPreviewWidth(Infinity,600),600);
 assert.equal(clampPreviewWidth(375.3,600),375);
});

test('thirty official library demos resolve complete implementation source and valid customizable usage',async()=>{
 const {PRESETS}=load('src/data/presets.ts');const {libraryUsage}=load('src/lib/library-usage.ts');
 assert.equal(PRESETS.length,30);assert.equal(new Set(PRESETS.map(item=>item.id)).size,30);
 assert(!PRESETS.some(item=>item.id==='fluid-glass-dock'));
 for(const preset of PRESETS){
  assert(preset.sourceUrl.startsWith('https://reactbits.dev/'));
  const resolved=await source.resolveSource(preset);assert(resolved.code.length>200);assert(resolved.code.includes('David Haz'));
  assert.doesNotThrow(()=>buildSync({stdin:{contents:resolved.code,loader:'tsx'},write:false,jsx:'preserve',logLevel:'silent'}));
  const values=Object.fromEntries(preset.propsSchema.map(item=>[item.name,item.defaultValue]));if('text' in values)values.text='Quoted "text" and <characters>';
  const usage=libraryUsage(preset,values);assert(usage.includes(`import ${preset.name}`));
  assert.doesNotThrow(()=>buildSync({stdin:{contents:usage,loader:'tsx'},write:false,jsx:'preserve',logLevel:'silent'}));
 }
});
test('library source exports preserve attribution for JavaScript and include companion styles',async()=>{
 const exported=await source.exportComponent({id:'shiny-text',name:'ShinyText',code:''},'JS','CSS');
 assert(exported.componentCode.includes('Copyright (c) 2026 David Haz'));
 assert(exported.componentCode.includes('Commons Clause Restriction'));
 assert(exported.componentCode.includes('function ShinyText')||exported.componentCode.includes('ShinyText ='));
 assert(exported.cssCode.includes('.shiny-text'));
 assert.doesNotThrow(()=>buildSync({stdin:{contents:exported.componentCode,loader:'jsx'},write:false,jsx:'preserve',logLevel:'silent'}));
});

const {createThemeTransition}=load('src/lib/theme-transition.ts');
function themeDocument(native=true){
 const classes=new Set();const snapshots=[];const animations=[];
 const root={classList:{add:name=>classes.add(name),remove:name=>classes.delete(name)},animate:(frames,options)=>{
   let finish;const animation={finished:new Promise(resolve=>finish=resolve),cancelled:false,cancel(){this.cancelled=true;finish();},finish};animations.push({frames,options,animation});return animation;
 }};
 const doc={documentElement:root};
 if(native)doc.startViewTransition=update=>{update();let finish;const snapshot={ready:Promise.resolve(),updateCallbackDone:Promise.resolve(),finished:new Promise(resolve=>finish=resolve),skipped:false,skipTransition(){this.skipped=true;finish();},finish};snapshots.push(snapshot);return snapshot;};
 return {doc,classes,snapshots,animations};
}
test('theme snapshot commits once and releases its presentation class after completion',async()=>{
 const state=themeDocument();const controller=createThemeTransition(state.doc);let commits=0;
 controller.run(()=>commits++);assert.equal(commits,1);assert(state.classes.has('theme-switching'));assert.equal(state.animations.length,0);
 state.snapshots[0].finish();await new Promise(resolve=>setImmediate(resolve));assert(!state.classes.has('theme-switching'));controller.dispose();
});
test('repeated theme clicks skip the older snapshot without clearing the latest one',async()=>{
 const state=themeDocument();const controller=createThemeTransition(state.doc);const themes=[];
 controller.run(()=>themes.push('light'));controller.run(()=>themes.push('dark'));
 await new Promise(resolve=>setImmediate(resolve));assert(state.snapshots[0].skipped);assert(state.classes.has('theme-switching'));assert.deepEqual(themes,['light','dark']);
 state.snapshots[1].finish();await new Promise(resolve=>setImmediate(resolve));assert(!state.classes.has('theme-switching'));controller.dispose();
});
test('reduced motion switches immediately and cancels an in-flight theme animation',()=>{
 const state=themeDocument();const controller=createThemeTransition(state.doc);let commits=0;
 controller.run(()=>commits++);controller.run(()=>commits++,true);
 assert.equal(commits,2);assert(state.snapshots[0].skipped);assert.equal(state.snapshots.length,1);assert.equal(state.animations.length,0);assert(!state.classes.has('theme-switching'));controller.dispose();
});
test('theme fallback animates without leaving inline styles or blocking the update',()=>{
 const state=themeDocument(false);const controller=createThemeTransition(state.doc);let commits=0;
 controller.run(()=>commits++);assert.equal(commits,1);assert.equal(state.animations.length,1);assert.equal(state.animations[0].frames.at(-1).filter,'blur(0px)');
 controller.dispose();assert(state.animations[0].animation.cancelled);assert(!state.classes.has('theme-switching'));assert.equal(state.doc.documentElement.style,undefined);
});
test('an unavailable native snapshot falls back without applying the theme twice',()=>{
 const state=themeDocument();state.doc.startViewTransition=update=>{update();throw Error('Snapshot unavailable');};let commits=0;
 const controller=createThemeTransition(state.doc);controller.run(()=>commits++);
 assert.equal(commits,1);assert.equal(state.animations.length,1);assert(!state.classes.has('theme-switching'));controller.dispose();
});
