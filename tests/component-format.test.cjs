const {test}=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path'),Module=require('node:module'),{buildSync}=require('esbuild');
function load(file){const filename=path.resolve(file),build=buildSync({entryPoints:[filename],bundle:true,write:false,platform:'node',format:'cjs',packages:'external'});const mod=new Module(filename,module);mod.filename=filename;mod.paths=Module._nodeModulePaths(path.dirname(filename));mod._compile(build.outputFiles[0].text,filename);return mod.exports;}
const {parseComponentResponse,ComponentResponseFormatError}=load('src/lib/component-response.ts');
const {applyComponentRepair}=load('src/lib/component-repair.ts');
const {partialField}=load('src/lib/generation-events.ts'),ai=load('src/lib/ai.ts');
const code=String.raw`import {useState} from 'react';
export default function Demo({label='Ready'}:{label?:string}){
 const [n,setN]=useState(0);const pattern=/\s+/;const message='Literal {"code":"not the component"}';
 return <button title={String(pattern)+message} onClick={()=>setN(n+1)}>{label} {n}</button>;
}`;
const component={name:'Demo',title:'Demo',description:'Working counter',code,propsSchema:[{name:'label',type:'string',defaultValue:'Ready'}]};
const files=(source=code)=>'~~~~json\n'+JSON.stringify({name:'Demo',title:'Demo',propsSchema:component.propsSchema})+'\n~~~~\n~~~~tsx Component.tsx\n'+source+'\n~~~~';
const output=content=>new Response(JSON.stringify({choices:[{message:{content},finish_reason:'stop'}]}),{headers:{'Content-Type':'application/json'}});

test('complete code survives malformed customization metadata without changing a character',async()=>{
 const raw='{"name":"Demo","title":"Demo","code":'+JSON.stringify(code)+',"propsSchema":[{"name" => "label"}]}';
 const value=parseComponentResponse(raw);assert.equal(value.code,code);assert.equal(value.name,'Demo');assert.equal(value.propsSchema,undefined);
 let calls=0;const result=await ai.generateComponent({provider:'nvidia',apiKey:'fixture',model:'nvidia/nemotron-3.5-lightning-30b-a3b',prompt:'Counter'},async()=>{calls++;return output(raw);});
 assert.equal(calls,1);assert.equal(result.metrics.repairs,0);assert.equal(result.component.code,code);
});

test('complete CSS and supporting files survive broken optional metadata',()=>{
 const raw='{"code":'+JSON.stringify(code)+',"cssCode":".demo{color:red}","files":{"parts/value.ts":"export const n=2;"},"propsSchema":[{"name" => "bad"}]}';
 const value=parseComponentResponse(raw);assert.equal(value.cssCode,'.demo{color:red}');assert.equal(value.files['parts/value.ts'],'export const n=2;');assert.equal(value.code,code);
});

test('fenced TSX, CSS, local files and Harmony suffixes are decoded as data',async()=>{
 const source="import Detail from './parts/Detail';import './Component.css';export default function Demo(){return <Detail/>}";
 const raw=files(source)+'\n~~~~css Component.css\n.detail{color:red}\n~~~~\n~~~~tsx parts/Detail.tsx\nexport default function Detail(){return <div className="detail">Complete</div>}\n~~~~\n<|return|>';
 const value=parseComponentResponse(raw);assert.equal(value.code,source);assert(value.cssCode.includes('color:red'));assert(value.files['parts/Detail.tsx'].includes('Complete'));
 const parsed=await ai.parseComponent(raw);assert.equal(parsed.name,'Demo');assert(parsed.files['parts/Detail.tsx']);
 assert.equal(parseComponentResponse(JSON.stringify(component)+'<|return|>').code,code);
});

test('ordinary fenced and bare TSX responses are accepted through full source validation',async()=>{
 for(const raw of ['```tsx\n'+code+'\n```',code,JSON.stringify(files()),'```TSX\n'+code+'\n```'])assert.equal((await ai.parseComponent(raw)).code,code);
 const sourceOnly=parseComponentResponse('```tsx\n'+code+'\n```');
 const repaired=applyComponentRepair(component,'```tsx\n'+code.replace('useState(0)','useState(1)')+'\n```');
 assert.equal(sourceOnly.propsSchema,undefined);assert.deepEqual(repaired.propsSchema,component.propsSchema);assert.equal(repaired.name,'Demo');
});

test('unfinished strings, unclosed fences, ambiguous modules and unsafe paths never become accepted components',async()=>{
 for(const raw of ['{"code":"export default function Demo(){return <div/>}', '~~~~tsx Component.tsx\n'+code, '~~~~tsx\n'+code+'\n~~~~\n~~~~tsx\n'+code+'\n~~~~'])assert.throws(()=>parseComponentResponse(raw),ComponentResponseFormatError);
 assert.throws(()=>parseComponentResponse('~~~~tsx Component.tsx\nconst sample=\'{"code":"export default function Fake(){return null}"}\';'),ComponentResponseFormatError);
 assert.throws(()=>parseComponentResponse('{"code":"export default function Demo(){return <button title="hello">Ready</button>}","propsSchema":[{"name" => "bad"}]}'),ComponentResponseFormatError);
 await assert.rejects(ai.parseComponent(files()+ '\n~~~~ts ../escape.ts\nexport const value=1;\n~~~~'),/Invalid supporting source file/);
 await assert.rejects(ai.parseComponent(files('export default function Demo(){const n:number="bad";return <div>{n}</div>}')),/TS2322/);
});

test('source-file recovery streams code and preserves model settings and user guidance',async()=>{
 const requests=[],events=[];const payload=files();
 const result=await ai.generateComponent({provider:'nvidia',apiKey:'fixture',model:'nvidia/nemotron-3.5-super-vl-120b-a12b',thinkingEffort:'high',prompt:'A warm orange counter',onEvent:e=>events.push(e)},async(url,init)=>{
  requests.push(JSON.parse(init.body));if(requests.length===1)return output('No component returned.');
  return new Response('data: '+JSON.stringify({choices:[{delta:{content:payload.slice(0,140)}}]})+'\n\ndata: '+JSON.stringify({choices:[{delta:{content:payload.slice(140)},finish_reason:'stop'}]})+'\n\ndata: [DONE]\n\n',{headers:{'Content-Type':'text/event-stream'}});
 });
 assert.equal(requests.length,2);assert.equal(requests[0].response_format.type,'json_schema');assert.equal(requests[1].response_format,undefined);assert.equal(requests[1].reasoning_effort,'none');assert(requests[1].messages[1].content.includes('warm orange'));
 assert.equal(result.component.code,code);assert(events.some(e=>e.type==='source'&&e.code===code));assert.equal(result.metrics.repairs,1);
 for(let index=payload.indexOf('~~~~tsx');index<payload.length;index++){const partial=partialField(payload.slice(0,index),'code');assert(code.startsWith(partial));}
});

test('a second unreadable format stops without repeating the format loop',async()=>{
 let calls=0;
 await assert.rejects(ai.generateComponent({provider:'custom',model:'fixture',baseUrl:'http://localhost:11434/v1',prompt:'Counter'},async()=>output(++calls===1?'No component returned.':'Still no source available.')),error=>error.code==='invalid_component_response'&&error.message.includes('either response format'));
 assert.equal(calls,2);
});

test('length-limited responses require a closed source envelope even if a prefix compiles',async()=>{
 const raw='{"code":'+JSON.stringify('export default function Demo(){return <div>Prefix</div>}').slice(0,-1);let calls=0;
 await assert.rejects(ai.generateComponent({provider:'custom',model:'fixture',baseUrl:'http://localhost:11434/v1',prompt:'Counter'},async()=>{calls++;return new Response(JSON.stringify({choices:[{message:{content:raw},finish_reason:'length'}]}));}),error=>error.code==='output_limit');assert.equal(calls,2);
 const payload=files();
 const result=await ai.generateComponent({provider:'custom',model:'fixture',baseUrl:'http://localhost:11434/v1',prompt:'Counter'},async()=>new Response(JSON.stringify({choices:[{message:{content:payload},finish_reason:'length'}]})));
 assert.equal(result.component.code,code);assert.equal(result.metrics.requests,1);
});
