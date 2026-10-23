const {test}=require('node:test');const assert=require('node:assert/strict');
const path=require('node:path'),Module=require('node:module');const {buildSync}=require('esbuild');
function load(file){const filename=path.resolve(file);const result=buildSync({entryPoints:[filename],bundle:true,write:false,platform:'node',format:'cjs',packages:'external'});const mod=new Module(filename,module);mod.filename=filename;mod.paths=Module._nodeModulePaths(path.dirname(filename));mod._compile(result.outputFiles[0].text,filename);return mod.exports;}
const {readGenerationResponse,GenerationTransportError}=load('src/lib/generation-transport.ts');
const {generationStream}=load('src/lib/generation-stream.ts');
const done={type:'done',component:{name:'Counter',code:'export default function Counter(){return <button>✓</button>}',propsSchema:[]},model:'fixture'};
const read=(response,onEvent=()=>{},signal=new AbortController().signal)=>readGenerationResponse(response,signal,onEvent);

test('a terminal result completes without waiting for the transport to close',async()=>{
 let cancelled=false;
 const response=new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(JSON.stringify(done)+'\n'));},cancel(){cancelled=true;}}));
 assert.deepEqual(await read(response),done);assert(cancelled);
});

test('heartbeats and arbitrary UTF-8 chunk boundaries preserve the final source',async()=>{
 const bytes=new TextEncoder().encode('\n\n'+JSON.stringify(done)+'\n\n');let i=0;const events=[];
 assert.deepEqual(await read(new Response(new ReadableStream({pull(c){if(i===bytes.length)c.close();else c.enqueue(bytes.slice(i,i+=1));}})),value=>events.push(value)),done);
 assert.deepEqual(events,[done]);
 assert.deepEqual(await read(new Response(JSON.stringify(done))),done);
});

test('broken streams retain delivered source and hide raw network errors',async()=>{
 const events=[];let sent=false;
 const response=new Response(new ReadableStream({pull(c){if(!sent){sent=true;c.enqueue(new TextEncoder().encode(JSON.stringify({type:'source',code:'received source'})+'\n'));}else c.error(new TypeError('Network error: PRIVATE-ENDPOINT'));}}));
 await assert.rejects(read(response,value=>events.push(value)),e=>e instanceof GenerationTransportError&&e.message.includes('received source are kept')&&!e.message.includes('PRIVATE'));
 assert.equal(events[0].code,'received source');
 for(const body of ['',JSON.stringify({type:'status',phase:'writing',message:'Working'}),'null\n','broken JSON\n'])await assert.rejects(read(new Response(body)),GenerationTransportError);
});

test('provider errors, HTTP failures and Stop keep their own useful meaning',async()=>{
 await assert.rejects(read(new Response(JSON.stringify({type:'error',message:'Provider quota reached.',code:'rate_limit'})+'\n')),/Provider quota reached/);
 await assert.rejects(read(new Response('<html>unavailable</html>',{status:503})),/HTTP 503/);
 await assert.rejects(read(new Response(JSON.stringify({error:'Key rejected.'}),{status:401})),/Key rejected/);
 const abort=new AbortController();abort.abort();await assert.rejects(read(new Response(''),()=>{},abort.signal),e=>e.name==='AbortError');
});

test('an incoming request cancellation closes with an explicit error, even if the provider stalls',async()=>{
 const controller=new AbortController(),diagnostics=[],events=[];let providerSignal,release;
 const pending=new Promise(resolve=>{release=resolve;});
 const response=new Response(generationStream({signal:controller.signal,report:d=>diagnostics.push(d),error:()=>({message:'Failed',code:'failed'}),generate:async(signal,send)=>{
  providerSignal=signal;send({type:'source',code:'PRIVATE SOURCE'});await pending;return done;
 }}));
 const result=read(response,e=>events.push(e));controller.abort();
 await assert.rejects(result,/request was cancelled/);
 assert(providerSignal.aborted);assert.equal(events[0].code,'PRIVATE SOURCE');
 assert.deepEqual(diagnostics.map(d=>d.event),['started','request_cancelled']);
 assert(!JSON.stringify(diagnostics).includes('PRIVATE SOURCE'));
 release(done);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(diagnostics.length,2,'a late provider result must not produce another completion');
});

test('server completion, failure and reader cancellation each end a stream exactly once',async()=>{
 for(const fails of [false,true]){
  const diagnostics=[];
  const response=new Response(generationStream({signal:new AbortController().signal,report:d=>diagnostics.push(d),error:()=>({message:'Provider unavailable.',code:'unreachable'}),generate:async()=>{if(fails)throw Error('PRIVATE upstream body');return done;}}));
  if(fails)await assert.rejects(read(response),/Provider unavailable/);else assert.deepEqual(await read(response),done);
  assert.deepEqual(diagnostics.map(d=>d.event),['started',fails?'failed':'completed']);
  assert(!JSON.stringify(diagnostics).includes('PRIVATE'));
 }
 let signal,release;const diagnostics=[];
 const stream=generationStream({signal:new AbortController().signal,report:d=>diagnostics.push(d),error:()=>({message:'Failed',code:'failed'}),generate:async(value)=>{signal=value;return new Promise(resolve=>{release=resolve;});}});
 await stream.cancel();assert(signal.aborted);release(done);
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(diagnostics.map(d=>d.event),['started','reader_cancelled']);
});

test('transport diagnostics distinguish early EOF, damaged events and network reads with a safe request reference',async()=>{
 const requestId='12345678-1234-1234-1234-123456789abc',headers={'x-generation-request-id':requestId};
 for(const [body,reason] of [['','early_close'],['not JSON\n','invalid_event']]){
  await assert.rejects(read(new Response(body,{headers})),e=>e instanceof GenerationTransportError&&e.reason===reason&&e.requestId===requestId&&e.message.includes(requestId));
 }
 await assert.rejects(read(new Response(new ReadableStream({pull(c){c.error(new TypeError('PRIVATE'));}}),{headers})),e=>e.reason==='read_failed'&&!e.message.includes('PRIVATE'));
 await assert.rejects(read(new Response('',{headers:{'x-generation-request-id':'UNTRUSTED'}})),e=>e.requestId===undefined&&!e.message.includes('UNTRUSTED'));
});
