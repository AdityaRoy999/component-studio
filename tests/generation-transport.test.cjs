const {test}=require('node:test');const assert=require('node:assert/strict');
const path=require('node:path'),Module=require('node:module');const {buildSync}=require('esbuild');
function load(file){const filename=path.resolve(file);const result=buildSync({entryPoints:[filename],bundle:true,write:false,platform:'node',format:'cjs',packages:'external'});const mod=new Module(filename,module);mod.filename=filename;mod.paths=Module._nodeModulePaths(path.dirname(filename));mod._compile(result.outputFiles[0].text,filename);return mod.exports;}
const {readGenerationResponse,GenerationTransportError}=load('src/lib/generation-transport.ts');
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
