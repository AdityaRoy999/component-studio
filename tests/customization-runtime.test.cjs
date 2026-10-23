const {test}=require('node:test');const assert=require('node:assert/strict');
const path=require('node:path'),Module=require('node:module');const {buildSync}=require('esbuild');
function load(file){const filename=path.resolve(file);const result=buildSync({entryPoints:[filename],bundle:true,write:false,platform:'node',format:'cjs',packages:'external',jsx:'automatic'});const mod=new Module(filename,module);mod.filename=filename;mod.paths=Module._nodeModulePaths(path.dirname(filename));mod._compile(result.outputFiles[0].text,filename);return mod.exports;}
const ai=load('src/lib/ai.ts');const {componentTypeAnalysis}=load('src/lib/semantic-check.ts');
const {carryCustomization}=load('src/lib/generation-context.ts');const {runtimeDiagnostic,runVerifiedGeneration}=load('src/lib/verified-generation.ts');
const code=`export default function GlassPricingCard({features=['Fast builds','Live previews'],title='Studio',price=12}:{features?:string[],title?:string,price?:number}){return <section><h2>{title}</h2><p>{price}</p>{features.map(feature=><p key={feature}>{feature}</p>)}</section>}`;
const field=(name,type,defaultValue)=>({name,type,defaultValue});
const response=value=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(value)}}]}),{headers:{'Content-Type':'application/json'}});

test('array and object metadata never become scalar overrides of component defaults',async()=>{
 const parsed=await ai.parseComponent(JSON.stringify({name:'GlassPricingCard',code,propsSchema:[field('features','string',['Fast builds','Live previews']),field('title','string','Studio'),field('settings','string',{annual:true}),field('price','number',12)]}));
 assert.deepEqual(parsed.propsSchema.map(f=>f.name),['title','price']);
 assert.deepEqual(carryCustomization(parsed,{features:'Fast builds,Live previews',title:'Selected',price:15}),{title:'Selected',price:15});assert.equal(parsed.code,code);
});

test('type checking discards scalar controls targeting typed and inferred list/object props',async()=>{
 for(const source of [code,code.replace(':{features?:string[],title?:string,price?:number}','')]){
  const parsed=await ai.parseComponent(JSON.stringify({name:'GlassPricingCard',code:source,propsSchema:[field('features','string','Fast builds,Live previews'),field('title','string','Studio'),field('price','number',12)]}));
  assert.deepEqual(parsed.propsSchema.map(f=>f.name),['title','price']);
 }
 const object='export default function Demo({config={label:"Ready"}}){return <p>{config.label}</p>}';
 assert.deepEqual(componentTypeAnalysis(object,{},[field('config','string','oops')]).invalidControls,['config']);
 const imported="import Card from './parts/Card';export default Card;";
 assert.deepEqual(componentTypeAnalysis(imported,{'parts/Card.tsx':code},[field('features','string','oops')]).invalidControls,['features']);
});

test('scalar compatibility keeps valid labels, numbers, booleans, literals and optional data',()=>{
 const source=`export default function Demo({label='Hi',price=12,active=false,variant='small'}:{label?:string,price?:number,active?:boolean,variant?:'small'|'large'}){return <p>{label}{price}{String(active)}{variant}</p>}`;
 const controls=[field('label','string','Custom'),field('price','number',20),field('active','boolean',true),field('variant','select','large')];
 assert.deepEqual(componentTypeAnalysis(source,{},controls),{diagnostics:[],invalidControls:[]});
 assert.deepEqual(componentTypeAnalysis(source,{},[field('price','string','wrong'),field('variant','select','unknown')]).invalidControls,['price','variant']);
 const invalid=componentTypeAnalysis('export default function Demo(){const n:number="wrong";return <p>{n}</p>}',{},controls);assert(invalid.diagnostics.some(e=>e.includes('TS2322')));
});

test('any-typed list props cannot be overridden by scalar controls, while parsed CSV strings can',()=>{
 for(const source of [
  'export default function Demo({features=["Ready"]}:any){return <div>{features.map((x:any)=><p>{x}</p>)}</div>}',
  'const Demo=({features:items=["Ready"]}:any)=><div>{items.map((x:any)=><p>{x}</p>)}</div>;export default Demo;',
  'export default function Demo(props:any){return <div>{props.features.map((x:any)=><p>{x}</p>)}</div>}',
 ])assert.deepEqual(componentTypeAnalysis(source,{},[field('features','string','wrong')]).invalidControls,['features']);
 for(const source of [
  'export default function Demo({features="A,B"}:any){return <div>{features.split(",").map((x:any)=><p>{x}</p>)}</div>}',
  'export default function Demo({features="Label"}:any){function Child({features}:any){return features.map((x:any)=><p>{x}</p>)}return <><h2>{features}</h2><Child features={["A"]}/></>}',
 ])assert.deepEqual(componentTypeAnalysis(source,{},[field('features','string','Custom')]).invalidControls,[]);
});

test('invalid control metadata is fixed locally without any model repair',async()=>{
 let calls=0;
 const result=await ai.generateComponent({provider:'nvidia',apiKey:'fixture',model:'nvidia/nemotron-3.5-super-vl-120b-a12b',thinkingEffort:'off',prompt:'Glass pricing card'},async()=>{calls++;return response({name:'GlassPricingCard',code,propsSchema:[field('features','string','Fast builds,Live previews')]});});
 assert.equal(calls,1);assert.equal(result.metrics.repairs,0);assert.deepEqual(result.component.propsSchema,[]);assert.equal(result.component.code,code);
});

test('runtime repairs receive original names, actual values and their types',async()=>{
 const diagnostic=runtimeDiagnostic('features.map is not a function\n at GlassPricingCard',{features:'wrong',price:12},'light');
 assert(diagnostic.includes('"features":"wrong"'));assert(diagnostic.includes('"features":"string"'));assert(diagnostic.includes('"theme":"light"'));
 let request;
 await ai.generateComponent({provider:'nvidia',apiKey:'fixture',model:'nvidia/nemotron-3.5-super-vl-120b-a12b',prompt:'Glass pricing card',context:{name:'GlassPricingCard',code,propsSchema:[]},runtimeError:diagnostic},async(url,init)=>{request=JSON.parse(init.body);return response({edits:[],propsSchema:[field('title','string','Studio')]});});
 assert(request.messages[1].content.includes('Rendered props (exact host values)'));assert(request.messages[1].content.includes('Defaults and ?? [] do not fix a string'));assert(request.messages[0].content.includes('scalar controls must never override array/object data'));
});

test('metadata-only repairs count as progress while unchanged repeated failures stop',async()=>{
 const base={id:'test',name:'Demo',title:'Demo',code,description:'Demo',category:'AI',tags:[],propsSchema:[field('features','string','wrong')]};let calls=0;
 const result=await runVerifiedGeneration({signal:new AbortController().signal,checking(){},repairing(){},request:async()=>({model:'fixture',component:{...base,propsSchema:calls++?[field('title','string','Studio')]:base.propsSchema}}),verify:async component=>component.propsSchema[0].name==='title'?{ok:true}:{ok:false,error:'features.map is not a function'}});
 assert.equal(calls,2);assert.equal(result.component.propsSchema[0].name,'title');
});

test('validated source edits clear incompatible carried values',async()=>{
 const previous={code:'export default function Demo({title="Studio"}){return <h2>{title}</h2>}',propsSchema:[field('title','string','Studio')]};
 const next=await ai.parseComponent(JSON.stringify({name:'Demo',code:'export default function Demo({title=["Studio"]}:any){return <h2>{title.map((text:string)=><span>{text}</span>)}</h2>}',propsSchema:previous.propsSchema}));
 assert.deepEqual(carryCustomization(next,{title:'Selected'},previous.propsSchema),{});
});

test('verification bundles retain meaningful source variable and component names',async()=>{
 const {compilePreview}=load('src/lib/compile-preview.ts');
 const bundle=await compilePreview(code,'',false,{},fetch,true);assert(bundle.script.includes('features.map'));assert(bundle.script.includes('GlassPricingCard'));assert(!bundle.script.includes('window.__RENDER__({})'));
});
