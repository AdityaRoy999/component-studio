const {test}=require('node:test');const assert=require('node:assert/strict');
const base=process.env.TEST_BASE_URL||'http://localhost:9334';
test('history is reachable directly without a running client session',async()=>{const response=await fetch(base+'/history');assert.equal(response.status,200);assert.match(await response.text(),/Made by you/);});
test('thanks is reachable directly with project credits and official logo assets',async()=>{
 const response=await fetch(base+'/thanks');assert.equal(response.status,200);const html=await response.text();
 for(const expected of ['Built with','good company.','React Bits','Thinking Orbs','Ponytail','https://thinkingorbs.com','/credits/react-bits-dark.svg','/credits/ponytail.svg'])assert(html.includes(expected),expected);
 assert(!html.includes('Every component, credited.'));
});
async function post(route,body){const r=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(120000)});return {status:r.status,data:await r.json()};}

test('manual source edits receive semantic diagnostics before applying',async()=>{
 const invalid=await post('/api/validate',{name:'Example',code:'export default function Example(){const total:number="bad";return <div>{total}</div>}',propsSchema:[]});assert.equal(invalid.status,422);assert(invalid.data.error.includes('TS2322'));
 const unused=await post('/api/validate',{name:'Example',code:'export default function Example(){return <div>Hardcoded</div>}',propsSchema:[{name:'label',type:'string',defaultValue:'Label'}]});assert.equal(unused.status,422);assert(unused.data.error.includes('Unused customization'));
 const valid=await post('/api/validate',{name:'Example',code:"import Details from './parts/Details';export default function Example(){return <Details/>}",files:{'parts/Details.tsx':'export default function Details(){return <div>Working files</div>}'},propsSchema:[]});assert.equal(valid.status,200);assert(valid.data.component.files['parts/Details.tsx']);
});

test('deployed validation accepts React hooks, iterable arrays and standard ES/DOM APIs',async()=>{
 const code="import {useState,useRef} from 'react';export default function Demo(){const ref=useRef<HTMLDivElement>(null);const [items,setItems]=useState(['Overview','Details']);const sizes=new Map<string,number>(items.map(item=>[item,item.length]));return <div ref={ref}>{Array.from(sizes).map(([item,size])=><button key={item} onClick={()=>{ref.current?.getBoundingClientRect();void Promise.resolve();setItems([...items,'New']);}}>{item} {size}</button>)}</div>}";
 const result=await post('/api/validate',{name:'Demo',code,propsSchema:[]});assert.equal(result.status,200,JSON.stringify(result.data));assert.equal(result.data.component.code,code);
});

test('response-format recovery validates preserved source instead of rejecting optional broken metadata',async()=>{
 const code="import {useState} from 'react';export default function SourceCounter(){const [n,setN]=useState(0);return <button onClick={()=>setN(n+1)}>Count {n}</button>}";
 const malformed='{"name":"SourceCounter","code":'+JSON.stringify(code)+',"propsSchema":[{"name" => "bad"}]}';
 for(const raw of [malformed,'~~~~tsx Component.tsx\n'+code+'\n~~~~']){
  const result=await post('/api/validate',raw);assert.equal(result.status,200,JSON.stringify(result.data));assert.equal(result.data.component.code,code);
 }
 const invalid=await post('/api/validate','~~~~tsx Component.tsx\nexport default function SourceCounter(){const n:number="wrong";return <div>{n}</div>}\n~~~~');assert.equal(invalid.status,422);assert(invalid.data.error.includes('TS2322'));
});
test('project download is a ZIP containing selected customization without provider credentials',async()=>{
 const response=await fetch(base+'/api/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({format:'zip',component:{id:'gen-http-test',name:'Example',code:"export default function Example({label='Ready'}){return <div>{label}</div>}"},propValues:{label:'Selected label'},apiKey:'NEVER_EXPORT_THIS',theme:'light'})});
 assert.equal(response.status,200);assert(response.headers.get('content-type').includes('application/zip'));const zip=Buffer.from(await response.arrayBuffer());assert.equal(zip.readUInt32LE(),0x04034b50);assert(zip.includes(Buffer.from('Selected label')));assert(!zip.includes(Buffer.from('NEVER_EXPORT_THIS')));
});
test('provider metadata exposes configuration flags, never credentials',async()=>{const r=await fetch(base+'/api/providers');const data=await r.json();assert.equal(r.status,200);assert.equal(data.providers.length,6);for(const provider of data.providers){assert.equal(typeof provider.configured,'boolean');assert.deepEqual(Object.keys(provider).sort(),provider.id==='custom'?['baseUrl','configured','id','model']:['configured','id','model']);}});
test('generation rejects invalid input before calling a provider',async()=>{assert.equal((await post('/api/generate',{prompt:'',provider:'openai'})).status,400);assert.equal((await post('/api/generate',{prompt:'Button',provider:'unsupported'})).status,400);});
test('real export route returns full JS and CSS for a library component',async()=>{const r=await post('/api/export',{component:{id:'gradient-ascii',name:'GradientASCII',code:''},language:'JS',styling:'CSS'});assert.equal(r.status,200);assert(!r.data.componentCode.includes('interface GradientASCIIProps'));assert(r.data.componentCode.includes('webgl2'));assert(r.data.cssCode.includes('.gradient-ascii-container'));assert.equal(r.data.filename,'GradientASCII.jsx');});
test('official catalog exports include complete source, styles, dependencies and license',async()=>{
 const r=await post('/api/export',{component:{id:'shiny-text',name:'ShinyText',code:''},language:'JS',styling:'CSS'});
 assert.equal(r.status,200);assert(r.data.componentCode.length>3000);assert(r.data.componentCode.includes('Commons Clause Restriction'));
 assert(r.data.componentCode.includes('requestAnimationFrame'));assert(!/interface\s+ShinyTextProps/.test(r.data.componentCode));
 assert(r.data.cssCode.includes('.shiny-text'));assert.equal(r.data.filename,'ShinyText.jsx');
 const stepper=await post('/api/export',{component:{id:'stepper',name:'Stepper',code:''},language:'TS',styling:'CSS'});
 assert.equal(stepper.status,200);assert(stepper.data.dependencies.includes('@hugeicons/react'));assert(stepper.data.dependencies.includes('@hugeicons/core-free-icons'));assert(stepper.data.componentCode.includes('StepperProps'));assert(stepper.data.cssCode.includes('.stepper'));
});
test('real preview route compiles companion CSS',async()=>{const r=await post('/api/preview',{code:"import React from 'react';import './Test.css';export default function Test(){return <button className='demo'>Ready</button>}",cssCode:'.demo{background:#3456d4;border-radius:30px}'});assert.equal(r.status,200);assert(r.data.css.includes('border-radius:30px'));assert(r.data.script.includes('__RENDER__'));});
test('preview rejects server imports and invalid syntax',async()=>{let r=await post('/api/preview',{code:"import fs from 'node:fs';export default function Test(){return fs.readFileSync('blocked')}"});assert.equal(r.status,422);assert(r.data.error.includes('Unsupported import'));r=await post('/api/preview',{code:'export default function Broken( {'});assert.equal(r.status,422);});

test('live preview refuses HTML style strings before mounting React',async()=>{
 const result=await post('/api/preview',{code:'export default function Card(){return <div style="padding: 24px">Booking</div>}'});
 assert.equal(result.status,422);assert.equal(typeof result.data.error,'string');
});


test('custom model HTTP workflow verifies, generates and compiles through a local endpoint',async()=>{
 const http=require('node:http');const requests=[];
 const component={name:'LocalCard',title:'Local card',description:'Generated through a custom endpoint',code:"import {useState} from 'react';export default function LocalCard(){const [items,setItems]=useState(['Ready']);return <div><button onClick={()=>setItems([...items,'Added'])}>Local model works {items.length}</button>{items.map(item=><span key={item}>{item}</span>)}</div>}",propsSchema:[]};
 const endpoint=http.createServer(async(req,res)=>{
  let body='';for await(const chunk of req)body+=chunk;
  requests.push({path:req.url,auth:req.headers.authorization,body:body?JSON.parse(body):null});
  res.setHeader('Content-Type','application/json');
  if(req.url==='/v1/models')res.end(JSON.stringify({data:[{id:'local-test-model'}]}));
  else if(req.url==='/v1/chat/completions')res.end(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(component)}}]}));
  else{res.statusCode=404;res.end('{}');}
 });
 await new Promise(resolve=>endpoint.listen(0,'127.0.0.1',resolve));
 try{
  const settings={provider:'custom',baseUrl:`http://127.0.0.1:${endpoint.address().port}/v1/`,model:'local-test-model'};
  const discovered=await post('/api/providers',{...settings,model:undefined,action:'models'});assert.equal(discovered.status,200);assert.deepEqual(discovered.data.models,[{id:'local-test-model',label:'local-test-model'}]);
  const connection=await post('/api/providers',settings);assert.equal(connection.status,200);assert.equal(connection.data.success,true);
  const generated=await post('/api/generate',{...settings,prompt:'Build a compact card'});assert.equal(generated.status,200);assert.equal(generated.data.model,'local-test-model');assert.equal(generated.data.component.name,'LocalCard');
  assert.equal(generated.data.metrics.requests,1);assert.equal(generated.data.metrics.repairs,0);
  const preview=await post('/api/preview',{code:generated.data.component.code});assert.equal(preview.status,200);assert(preview.data.script.includes('Local model works'));assert(!/\bReact\.createElement\(/.test(preview.data.script),'JSX must not depend on an unbound React global');
  assert.deepEqual(requests.map(r=>r.path),['/v1/models','/v1/models','/v1/chat/completions']);assert(requests.every(r=>r.auth===undefined));assert.equal(requests[2].body.model,'local-test-model');
  assert(requests[2].body.messages[0].content.includes('QUALITY CONTRACT'));
  assert(requests[2].body.messages[0].content.includes('UI/UX PRO MAX — DEFAULT DESIGN SYSTEM'));
  assert(requests[2].body.messages[0].content.includes('Explicit user preferences and visual references take priority'));
  assert(requests[2].body.messages[1].content.includes('DESIGN DIRECTIVE: Use the UI/UX Pro Max default design system'));
  assert(requests[2].body.messages[1].content.endsWith('complete valid component JSON only.'));
 }finally{await new Promise(resolve=>endpoint.close(resolve));}
});

test('streaming HTTP generation sends real activity, source, preview and completion events',async()=>{
 const http=require('node:http');let requestedStream=false;let finished=false;let generationRequest;
 const component={name:'StreamCard',title:'Stream card',message:'Built a compact button with a rounded shape.',code:"export default function StreamCard(){return <button className='rounded-full px-4'>Streamed card</button>}" ,propsSchema:[]};
 const endpoint=http.createServer(async(req,res)=>{
  let body='';for await(const chunk of req)body+=chunk;
  const input=JSON.parse(body||'{}');requestedStream=input.stream===true;generationRequest=input;
  res.writeHead(200,{'Content-Type':'text/event-stream'});
  const text=JSON.stringify(component);const midpoint=text.indexOf(',"propsSchema"');
  res.write('data: '+JSON.stringify({choices:[{delta:{content:text.slice(0,midpoint)}}]})+'\n\n');
  await new Promise(resolve=>setTimeout(resolve,10500));
  res.write('data: '+JSON.stringify({choices:[{delta:{content:text.slice(midpoint)}}]})+'\n\n');
  res.end('data: [DONE]\n\n');finished=true;
 });
 await new Promise(resolve=>endpoint.listen(0,'127.0.0.1',resolve));
 try{
  const response=await fetch(base+'/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider:'custom',baseUrl:`http://127.0.0.1:${endpoint.address().port}/v1`,model:'stream-test',prompt:'Build a compact button',stream:true})});
  assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/ndjson/);
  const reader=response.body.getReader();const first=await reader.read();assert.equal(finished,false);let content=new TextDecoder().decode(first.value);
  while(true){const part=await reader.read();if(part.done)break;content+=new TextDecoder().decode(part.value);}
  assert(content.includes('\n\n'),'The server must keep a quiet provider connection active');
  const events=content.trim().split('\n').filter(line=>line.trim()).map(JSON.parse);assert(requestedStream);assert(events.some(e=>e.type==='status'));assert(events.some(e=>e.type==='source'&&e.code.includes('export default')));assert(events.some(e=>e.type==='preview'));assert.equal(events.at(-1).type,'done');
  assert(generationRequest.messages[0].content.includes('UI/UX PRO MAX — DEFAULT DESIGN SYSTEM'));
  assert(generationRequest.messages[1].content.includes('DESIGN DIRECTIVE: Use the UI/UX Pro Max default design system'));
  assert.equal(events.at(-1).component.completionMessage,component.message);
  const compiled=await post('/api/preview',{code:events.at(-1).component.code});assert.equal(compiled.status,200);
 }finally{await new Promise(resolve=>endpoint.close(resolve));}
});

test('generation validates theme, thinking depth and request object before provider access',async()=>{
 for(const body of [null,[],{provider:'openai',prompt:'Card',theme:'sepia'},{provider:'openai',prompt:'Card',thinkingEffort:'unlimited'}])assert.equal((await post('/api/generate',body)).status,400);
});

test('provider HTTP 413 throughput errors become actionable quota errors in JSON and live streams',async()=>{
 const http=require('node:http');
 const endpoint=http.createServer((req,res)=>{req.resume();res.writeHead(413,{'Content-Type':'application/json','Retry-After':'120'});res.end(JSON.stringify({error:{message:'PRIVATE-ORG exceeded tokens per minute (TPM)'}}));});
 await new Promise(resolve=>endpoint.listen(0,'127.0.0.1',resolve));
 try{
  const input={provider:'custom',model:'quota-test',baseUrl:`http://127.0.0.1:${endpoint.address().port}/v1`,prompt:'Build a card'};
  const result=await post('/api/generate',input);assert.equal(result.status,429);assert.equal(result.data.code,'rate_limit');assert(result.data.error.includes('2 minutes'));assert(!result.data.error.includes('PRIVATE-ORG'));
  const response=await fetch(base+'/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...input,stream:true})});
  const events=(await response.text()).trim().split('\n').map(JSON.parse);const error=events.at(-1);assert.equal(error.type,'error');assert.equal(error.code,'rate_limit');assert(error.message.includes('2 minutes'));assert(!error.message.includes('PRIVATE-ORG'));
 }finally{await new Promise(resolve=>endpoint.close(resolve));}
});

test('preview catches missing React hooks before iframe execution',async()=>{
 const result=await post('/api/preview',{code:'export default function Card(){useEffect(()=>{},[]);return <button>Ready</button>}'});
 assert.equal(result.status,422);assert.match(result.data.error,/syntax or import errors/);
});

test('malformed component JSON and missing imports recover through the live HTTP workflow',async()=>{
 const http=require('node:http');let calls=0,repair='';
 const broken='export default function HookCard(){useEffect(()=>{},[]);return <button>Ready</button>}';
 const valid="import {useEffect} from 'react';export default function HookCard(){useEffect(()=>{},[]);return <button>Ready</button>}";
 const endpoint=http.createServer(async(req,res)=>{
  let body='';for await(const chunk of req)body+=chunk;calls++;if(calls===2)repair=JSON.parse(body).messages[1].content;
  res.writeHead(200,{'Content-Type':'application/json'});
  const content=calls===1?'{name:"HookCard",code:'+JSON.stringify(broken)+',propsSchema:[],}':JSON.stringify({name:'HookCard',code:valid,propsSchema:[]});
  res.end(JSON.stringify({choices:[{message:{content},finish_reason:'stop'}]}));
 });
 await new Promise(resolve=>endpoint.listen(0,'127.0.0.1',resolve));
 try{
  const response=await fetch(base+'/api/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider:'custom',model:'hook-test',baseUrl:`http://127.0.0.1:${endpoint.address().port}/v1`,prompt:'Button',stream:true})});
  const events=(await response.text()).trim().split('\n').map(JSON.parse);
  assert.equal(calls,2);assert(repair.includes('Missing React import: useEffect'));assert.equal(events.at(-1).type,'done');assert.equal(events.at(-1).component.code,valid);
  assert.equal((await post('/api/preview',{code:valid})).status,200);
 }finally{await new Promise(resolve=>endpoint.close(resolve));}
});

test('HTTP image validation rejects invalid references before selecting an endpoint',async()=>{
 const result=await post('/api/generate',{provider:'custom',model:'vision',prompt:'Clone this UI',images:[{mimeType:'image/png',dataUrl:'https://example.com/reference.png'}]});assert.equal(result.status,400);assert.match(result.data.error,/PNG|JPEG|WebP/);
});
test('preview snapshot compilation has a separate cache entry and retains import restrictions',async()=>{
 const code='export default function SnapshotCard(){return <button>Capture me</button>}';let r=await post('/api/preview',{code,snapshot:true});assert.equal(r.status,200);assert(r.data.script.includes('__CAPTURE__'));r=await post('/api/preview',{code});assert.equal(r.status,200);assert(!r.data.script.includes('__CAPTURE__'));r=await post('/api/preview',{code:"import fs from 'node:fs';export default function Card(){return <div/>}",snapshot:true});assert.equal(r.status,422);
});
