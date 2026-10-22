import type { Plugin } from 'esbuild';
import { npmPackage } from './npm-imports';

const cache=new Map<string,{expires:number;value:Promise<{bytes:Uint8Array;type:string}>}>();
export function npmModuleUrl(specifier:string){
  if(!npmPackage(specifier))throw new Error(`Use a valid npm import: ${specifier}`);
  const url=new URL(`https://esm.sh/${specifier}`);
  if(!/\.(?:css|json|wasm|woff2?|ttf|png|jpe?g|svg|gif|webp)$/i.test(url.pathname)){
    url.searchParams.set('bundle','');url.searchParams.set('target','es2022');
    url.searchParams.set('external','react,react-dom,react/jsx-runtime,react/jsx-dev-runtime');
  }
  return url.href;
}

export function npmPreviewPlugin(local:(specifier:string)=>string|undefined,fetcher:typeof fetch=fetch):Plugin{
  async function download(href:string){
    const cached=cache.get(href);if(fetcher===fetch&&cached&&cached.expires>Date.now())return cached.value;
    const value=(async()=>{
      let url=new URL(href);
      for(let redirects=0;redirects<5;redirects++){
        if(url.origin!=='https://esm.sh'||url.username||url.password)throw new Error('Package assets must resolve through the npm CDN.');
        const response=await fetcher(url.href,{signal:AbortSignal.timeout(20000),redirect:'manual',cache:'force-cache'});
        if(response.status>=300&&response.status<400){const location=response.headers.get('location');if(!location)throw new Error('The package CDN returned an invalid redirect.');url=new URL(location,url);continue;}
        if(!response.ok)throw new Error(`Could not load npm dependency ${url.pathname}: CDN returned ${response.status}. Check the package name and browser entry point.`);
        return {bytes:new Uint8Array(await response.arrayBuffer()),type:response.headers.get('content-type')||''};
      }
      throw new Error('The npm CDN returned too many redirects.');
    })();
    if(fetcher===fetch){if(cache.size>=128)cache.delete(cache.keys().next().value!);cache.set(href,{expires:Date.now()+15*60*1000,value});void value.catch(()=>cache.delete(href));}
    return value;
  }
  return {name:'npm-browser-dependencies',setup(builder){
    builder.onResolve({filter:/.*/,namespace:'npm'},args=>{
      if(args.path.startsWith('data:')||args.path.startsWith('#'))return {path:args.path,external:true};
      const shared=local(args.path);if(shared)return {path:shared};
      const url=/^(?:https?:|\/|\.)/.test(args.path)?new URL(args.path,args.importer):new URL(npmModuleUrl(args.path));
      if(url.origin!=='https://esm.sh'&&['url-token','import-rule'].includes(args.kind))return {path:url.href,external:true};
      if(url.origin!=='https://esm.sh')return {errors:[{text:`The package imports an unsupported browser asset URL: ${url.origin}`} ]};
      return {path:url.href,namespace:'npm'};
    });
    builder.onLoad({filter:/.*/,namespace:'npm'},async args=>{
      const data=await download(args.path),pathname=new URL(args.path).pathname;
      const loader=/\.css$/i.test(pathname)||data.type.includes('text/css')?'css':/\.json$/i.test(pathname)?'json':/\.(?:woff2?|ttf|otf|png|jpe?g|svg|gif|webp|wasm)$/i.test(pathname)?'dataurl':'js';
      return {contents:data.bytes,loader};
    });
  }};
}
