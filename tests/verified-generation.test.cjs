const {test}=require('node:test');const assert=require('node:assert/strict');
const path=require('node:path'),Module=require('node:module');const {buildSync}=require('esbuild');
function load(file){const filename=path.resolve(file);const result=buildSync({entryPoints:[filename],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',jsx:'automatic',loader:{'.css':'empty'}});const mod=new Module(filename,module);mod.filename=filename;mod.paths=Module._nodeModulePaths(path.dirname(filename));mod._compile(result.outputFiles[0].text,filename);return mod.exports;}
const ai=load('src/lib/ai.ts'),{applyComponentRepair}=load('src/lib/component-repair.ts');
const {runVerifiedGeneration}=load('src/lib/verified-generation.ts');
const component={id:'gen-runtime',name:'Tabs',title:'Tabs',description:'Working tabs',category:'AI GENERATED',tags:[],code:'export default function Tabs({items}:any){return <div>{items.length}</div>}',propsSchema:[]};
const patch={edits:[{file:'Component.tsx',find:'{items}',replace:'{items=[]}'}]};
const response=value=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(value)}}]}));
const good={...component,code:component.code.replace('{items}','{items=[]}')};
const run=(overrides={})=>runVerifiedGeneration({signal:new AbortController().signal,request:async()=>({component,model:'fixture'}),verify:async()=>({ok:true}),checking(){},repairing(){},...overrides});

test('targeted edits preserve metadata and touch only exact existing source',()=>{
 const source={...component,cssCode:'.tabs{color:red}',files:{'parts/value.ts':'export const value=1;'}};
 const fixed=applyComponentRepair(source,JSON.stringify({edits:[...patch.edits,{file:'Component.css',find:'color:red',replace:'color:blue'},{file:'parts/value.ts',find:'value=1',replace:'value=2'}]}));
 assert.equal(fixed.code,good.code);assert.equal(fixed.title,component.title);assert.equal(fixed.cssCode,'.tabs{color:blue}');assert.equal(fixed.files['parts/value.ts'],'export const value=2;');assert.equal(source.files['parts/value.ts'],'export const value=1;');
 for(const edit of [{file:'../secret',find:'a',replace:'b'},{file:'Component.tsx',find:'missing',replace:'fix'},{file:'Component.tsx',find:'items',replace:'value'},{file:'Component.tsx',find:'{items}',replace:'{items}'}])assert.throws(()=>applyComponentRepair(source,JSON.stringify({edits:[edit]})));
 assert.deepEqual(applyComponentRepair(source,JSON.stringify({edits:[],propsSchema:[{name:'label',type:'string',defaultValue:'Hello'}]})).propsSchema,[{name:'label',type:'string',defaultValue:'Hello'}]);
});

test('static type failures use small edits and revalidate the corrected source',async()=>{
 const broken={...component,code:'export default function Tabs(){const n:number="bad";return <div>{n}</div>}'};const requests=[];
 const result=await ai.generateComponent({provider:'custom',model:'fixture',baseUrl:'http://localhost:11434/v1',prompt:'Create tabs'},async(url,init)=>{requests.push(JSON.parse(init.body));return response(requests.length===1?broken:{edits:[{file:'Component.tsx',find:'n:number="bad"',replace:'n:number=2'}]});});
 assert.equal(requests.length,2);assert(result.component.code.includes('n:number=2'));assert.equal(result.metrics.repairs,1);assert(requests[1].messages[0].content.length<1200);assert(requests[1].messages[1].content.includes('TS2322'));
});

test('runtime diagnostics reach the exact current source, patch schema and Nemotron Thinking Off',async()=>{
 let request;
 const result=await ai.generateComponent({provider:'nvidia',apiKey:'test',model:'nvidia/nemotron-3.5-super-vl-120b-a12b',thinkingEffort:'high',prompt:'Create tabs',context:component,runtimeError:"Cannot read properties of undefined (reading 'length')",requestBudget:2},async(url,init)=>{request=JSON.parse(init.body);return response(patch);});
 assert.equal(result.component.code,good.code);assert.equal(result.metrics.requests,1);assert.equal(result.metrics.repairs,1);assert.equal(request.reasoning_effort,'none');assert.equal(request.chat_template_kwargs.enable_thinking,false);assert.equal(request.response_format.json_schema.name,'component_edits');assert(request.messages[1].content.includes("reading 'length'"));assert(request.messages[1].content.includes(JSON.stringify(component.code)));
});

test('transport recovery and static repair cannot exceed the shared request budget',async()=>{
 let calls=0;
 await assert.rejects(ai.generateComponent({provider:'custom',model:'fixture',baseUrl:'http://localhost:11434/v1',prompt:'Tabs',requestBudget:2,onEvent(){}},async()=>{calls++;if(calls===1)return new Response(new ReadableStream({pull(controller){controller.error(new Error('interrupted'));}}),{headers:{'Content-Type':'text/event-stream'}});const out=response({code:'invalid'});out.headers.set('Content-Type','application/json');return out;}),e=>e.code==='repair_limit');
 assert.equal(calls,2);
});

test('an interrupted NVIDIA source repair retries the same patch within the shared budget',async()=>{
 const requests=[],events=[];
 const broken={...component,code:'export default function Tabs(){const n:number="bad";return <div>{n}</div>}'};
 const result=await ai.generateComponent({provider:'nvidia',apiKey:'test',model:'nvidia/nemotron-3.5-super-vl-120b-a12b',thinkingEffort:'off',prompt:'Create tabs',onEvent:e=>events.push(e)},async(url,init)=>{
  requests.push(JSON.parse(init.body));
  if(requests.length===2)return new Response(new ReadableStream({pull(c){c.error(new TypeError('private transport details'));}}),{headers:{'Content-Type':'text/event-stream'}});
  const out=response(requests.length===1?broken:{edits:[{file:'Component.tsx',find:'n:number="bad"',replace:'n:number=2'}]});out.headers.set('Content-Type','application/json');return out;
 });
 assert.equal(requests.length,3);assert.equal(result.metrics.requests,3);assert(result.component.code.includes('n:number=2'));
 assert.deepEqual(requests[1].messages,requests[2].messages);assert.equal(requests[2].chat_template_kwargs.enable_thinking,false);
 assert(events.some(e=>e.message?.includes('Retrying the same source correction once')));
});

test('a second network failure during repair stops at three requests',async()=>{
 let calls=0;
 await assert.rejects(ai.generateComponent({provider:'custom',model:'fixture',baseUrl:'http://localhost:11434/v1',prompt:'Tabs',onEvent(){}},async()=>{
  calls++;if(calls===1){const out=response({...component,code:'export default function Tabs(){const n:number="bad";return <div>{n}</div>}'});out.headers.set('Content-Type','application/json');return out;}
  throw new TypeError('PRIVATE-NETWORK');
 }),e=>e.code==='unreachable'&&!e.message.includes('PRIVATE'));
 assert.equal(calls,3);
});

test('browser verification gates completion and repairs the same candidate within the remaining budget',async()=>{
 const steps=[],budgets=[];
 const result=await run({request:async(remaining,repair)=>{budgets.push(remaining);steps.push('request');if(repair){assert.equal(repair.component.code,component.code);assert.equal(repair.error,'undefined length');}return {component:repair?good:component,model:'fixture',metrics:{requests:1,repairs:repair?1:0,durationMs:1,status:'success',inputTokens:10,outputTokens:5}};},verify:async value=>{steps.push('verify');return value===component?{ok:false,error:'undefined length'}:{ok:true};},repairing:()=>steps.push('repair')});
 assert.deepEqual(steps,['request','verify','repair','request','verify']);assert.deepEqual(budgets,[3,2]);assert.equal(result.component,good);assert.equal(result.metrics.requests,2);assert.equal(result.metrics.inputTokens,20);assert.equal(result.metrics.repairs,1);
});

test('runtime no-progress, exhausted budgets, verifier timeouts and Stop all terminate',async()=>{
 let calls=0;
 await assert.rejects(run({request:async()=>{calls++;return {component,model:'fixture'};},verify:async()=>({ok:false,error:'same error'})}),/without progress/);assert.equal(calls,2);
 calls=0;await assert.rejects(run({request:async()=>{calls++;return {component,model:'fixture',metrics:{requests:3,repairs:2,durationMs:1,status:'success'}};},verify:async()=>({ok:false,error:'runtime failure'})}),/after 3 model attempts/);assert.equal(calls,1);
 calls=0;await assert.rejects(run({request:async()=>{calls++;return {component,model:'fixture'};},verify:async()=>({ok:false,error:'browser unavailable',kind:'timeout'})}),/browser unavailable/);assert.equal(calls,1);
 const abort=new AbortController();calls=0;await assert.rejects(run({signal:abort.signal,request:async()=>{calls++;return {component,model:'fixture'};},verify:async()=>{abort.abort();return {ok:false,error:'crash'};}}),e=>e.name==='AbortError');assert.equal(calls,1);
});

test('npm imports include package styles, subpaths, dynamic imports and reexports',async()=>{
 const {npmPackage,packageImports}=load('src/lib/npm-imports.ts');
 for(const specifier of ['../local','https://example.com/file.js','node:fs','@scope/pkg/../secret'])assert.equal(npmPackage(specifier),null);
 assert.equal(npmPackage('@scope/widgets/react'),'@scope/widgets');
 const imports=packageImports(["import '@scope/theme/base.css';export {format} from 'date-fns';const x=import('lodash-es');const y=require('nanoid/non-secure');"]);
 assert.deepEqual(imports,['@scope/theme/base.css','date-fns','lodash-es','nanoid/non-secure']);
 const {exportProject}=load('src/lib/project-export.ts');
 const project=await exportProject({...good,code:"import '@scope/theme/base.css';import {format} from 'date-fns';export default function Tabs(){return <div>{format(new Date(),'yyyy')}</div>}",cssCode:'.own{display:block}',files:{'parts/optional.ts':"export const load=()=>import('lodash-es');"}},{},'dark');
 const deps=JSON.parse(project.files['package.json']).dependencies;for(const name of ['@scope/theme','date-fns','lodash-es'])assert(deps[name],name);assert(project.files['src/Tabs.tsx'].includes("import '@scope/theme/base.css'"));assert(project.files['src/Tabs.tsx'].includes("import './Tabs.css'"));
});

test('arbitrary browser npm modules compile with shared React and package CSS',async()=>{
 const {compilePreview}=load('src/lib/compile-preview.ts');const fetched=[];
 const bundle=await compilePreview("import {Badge} from '@fixture/widgets';import '@fixture/theme/base.css';export default function Demo(){return <Badge/>}",'',false,{},async url=>{
   fetched.push(String(url));const pathname=new URL(url).pathname;
   if(pathname==='/@fixture/widgets')return new Response("export {Badge} from '/@fixture/widgets@1.0.0/es2022/widgets.bundle.mjs';",{headers:{'Content-Type':'application/javascript'}});
   if(pathname.endsWith('.mjs'))return new Response("import React from 'react';export function Badge(){const [n]=React.useState(1);return React.createElement('b',{className:'fixture'},'Package '+n)}",{headers:{'Content-Type':'application/javascript'}});
   if(pathname.endsWith('.css'))return new Response('.fixture{color:rebeccapurple;background:url(data:image/png;base64,AA==)}',{headers:{'Content-Type':'text/css'}});
   return new Response('',{status:404});
 });
 assert.equal(fetched.length,3);assert(/\.fixture\s*\{[^}]*color:\s*(?:rebeccapurple|#639|#663399)/.test(bundle.css));assert(bundle.script.includes('Package '));assert(!fetched.some(url=>new URL(url).pathname==='/react'));
 await assert.rejects(compilePreview("import {absent} from '@fixture/missing';export default function Demo(){return <div>{absent}</div>}",'',false,{},async()=>new Response('',{status:404})),/Could not load npm dependency/);
 await assert.rejects(compilePreview("import fs from 'node:fs';export default function Demo(){return <div>{fs.readFileSync('secret')}</div>}"),/needs a server runtime/);
});

test('runtime repair API validates diagnostics and budget before contacting a provider',async()=>{
 const {POST}=load('src/app/api/generate/route.ts');
 for(const invalid of [{runtimeError:'failure'},{requestBudget:4},{runtimeError:'x'.repeat(2401),context:component},{runtimeError:'failure',context:{...component,propsSchema:{}}}]){
  const result=await POST(new Request('http://localhost/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider:'custom',model:'fixture',prompt:'Tabs',...invalid})}));assert.equal(result.status,400);
 }
});

test('every generation prompt permits npm libraries without stale dependency restrictions',()=>{
 const {COMPONENT_SYSTEM_PROMPT}=load('src/lib/component-prompt.ts');
 assert(COMPONENT_SYSTEM_PROMPT.includes('any browser-compatible npm package'));
 assert(!/allowed installed packages|existing allowed packages|No[^\n]*new dependencies/.test(COMPONENT_SYSTEM_PROMPT));
});

test('missing standard type libraries are an infrastructure failure and spend no model requests',async()=>{
 const ts=require('typescript'),read=ts.sys.readFile;
 const isolated=load('src/lib/ai.ts');let calls=0;
 ts.sys.readFile=filename=>/[/\\]typescript[/\\]lib[/\\]lib\..*\.d\.ts$/.test(filename)?undefined:read(filename);
 try{
  await assert.rejects(isolated.generateComponent({provider:'nvidia',apiKey:'fixture',model:'openai/gpt-oss-120b',prompt:'Animated tabs'},async()=>{calls++;return response(good);}),error=>error.code==='validation_unavailable'&&error.status===503);
  assert.equal(calls,0);
  await assert.rejects(isolated.parseComponent(JSON.stringify(good)),/server setup issue/);
 }finally{ts.sys.readFile=read;}
});

test('a missing transitive ES declaration is detected even when the main library exists',()=>{
 const ts=require('typescript'),read=ts.sys.readFile,{assertValidationRuntime}=load('src/lib/validation-runtime.ts');
 ts.sys.readFile=filename=>filename.replaceAll('\\','/').endsWith('/lib.es2015.iterable.d.ts')?undefined:read(filename);
 try{assert.throws(assertValidationRuntime,/server setup issue/);}finally{ts.sys.readFile=read;}
});
