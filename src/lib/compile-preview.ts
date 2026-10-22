import { build } from 'esbuild';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import * as NodeModule from 'node:module';
import { npmModuleUrl, npmPreviewPlugin } from './npm-preview';
import { npmPackage, packageImports } from './npm-imports';
import { validateJSX } from './validate-jsx';
import { generatedFiles, resolveGeneratedImport } from './generated-files';
const localRequire = Reflect.get(NodeModule, 'createRequire')(process.cwd() + '/package.json') as NodeRequire;
const localPackages = new Set(['react','react-dom','lucide-react','motion','framer-motion']);
function localModule(specifier:string){
  if(!localPackages.has(npmPackage(specifier)||''))return undefined;
  return specifier==='lucide-react'?localRequire.resolve('lucide-react/package.json').replace(/package\.json$/,'dist/esm/lucide-react.js'):localRequire.resolve(specifier==='framer-motion'?'motion/react':specifier);
}

export async function compilePreview(code:string,cssCode='',snapshot=false,extraFiles:Record<string,string>={},fetcher:typeof fetch=fetch){
    const files:Record<string,string>={'Component.tsx':code,...generatedFiles(extraFiles)};
    const hasPackageCss=packageImports(Object.values(files)).some(specifier=>npmPackage(specifier)&&specifier.endsWith('.css'));
    validateJSX(code,cssCode||(hasPackageCss?'/* npm package stylesheet */':''));
    for(const [name,source] of Object.entries(extraFiles))if(/\.[jt]sx$/.test(name))validateJSX(source,cssCode||(hasPackageCss?'/* npm package stylesheet */':''));
    const result = await build({
      stdin: { contents: `${snapshot?`import {toCanvas} from 'html-to-image';
window.__CAPTURE__=async()=>{const node=document.getElementById('root');const width=Math.min(1800,node.scrollWidth),height=Math.min(1400,node.scrollHeight);const canvas=await toCanvas(node,{width,height,skipFonts:true,cacheBust:false,pixelRatio:Math.min(1,640/width,420/height),backgroundColor:getComputedStyle(document.body).backgroundColor});return canvas.toDataURL('image/webp',.78);};`:''}
import React from 'react'; import {createRoot} from 'react-dom/client'; import Component from 'user-component';
        class Boundary extends React.Component { constructor(p){super(p);this.state={error:null};} static getDerivedStateFromError(error){return {error:String(error?.message||error)};} componentDidCatch(error,info){window.__PREVIEW_ERROR__?.(String(error?.message||error)+'\\n'+String(info?.componentStack||''));} render(){return this.state.error ? React.createElement('div',{role:'alert',style:{padding:24,color:'#e6828e',fontFamily:'system-ui'}},'Preview error: '+this.state.error) : this.props.children;} }
        function ReadyProbe({revision}){React.useEffect(()=>{window.__PREVIEW_READY__?.();},[revision]);return null;}
        let revision=0;const root=createRoot(document.getElementById('root'));window.__RENDER__=(props,customizationKey='initial')=>root.render(React.createElement(Boundary,{key:customizationKey},React.createElement(React.Fragment,null,React.createElement(Component,props),React.createElement(ReadyProbe,{revision:++revision}))));window.__RENDER__({});`, loader:'jsx', resolveDir:process.cwd() },
      bundle:true, write:false, outfile:'preview.js',minify:true, platform:'browser', format:'iife', jsx:'automatic', tsconfigRaw:{compilerOptions:{verbatimModuleSyntax:true}}, define:{'process.env.NODE_ENV':'"production"'}, logLevel:'silent',
      plugins:[{name:'component-source',setup(builder){
        builder.onResolve({filter:/.*/}, args => {
          if(args.path === 'user-component') return {path:'Component.tsx',namespace:'component'};
          if(args.namespace === 'component') {
            if(args.path.startsWith('.')){
              const target=resolveGeneratedImport(args.importer,args.path,files);
              if(target)return {path:target,namespace:target.endsWith('.css')?'component-css':'component'};
            }
            if (/^\.\/?[^/]+\.css$/.test(args.path) && cssCode) return {path:args.path,namespace:'component-css'};
            if(NodeModule.isBuiltin(args.path))return {errors:[{text:`Unsupported import: ${args.path} needs a server runtime. Choose a browser-compatible npm entry point.`}]};
            const shared=localModule(args.path);if(shared)return {path:shared};
            if(npmPackage(args.path))return {path:npmModuleUrl(args.path),namespace:'npm'};
            return {errors:[{text:`Cannot resolve import ${args.path}. Supply the local file or use an npm package name.`}]};
          }
        });
        builder.onLoad({filter:/.*/,namespace:'component'},args=>({contents:files[args.path],loader:args.path.endsWith('.ts')?'ts':'tsx',resolveDir:process.cwd()}));
        builder.onLoad({filter:/.*/,namespace:'component-css'},()=>({contents:'',loader:'js'}));
      }},npmPreviewPlugin(localModule,fetcher)],
    });
    const packageCss=result.outputFiles.filter(file=>file.path.endsWith('.css')).map(file=>file.text).join('\n');
    const css = await postcss([tailwindcss({darkMode:'class',content:Object.entries(files).map(([name,raw])=>({raw,extension:name.endsWith('.ts')?'ts':'tsx'})),theme:{extend:{}},plugins:[]})]).process('@tailwind base; @tailwind components; @tailwind utilities;\n' + cssCode+'\n'+packageCss+'\n'+Object.entries(extraFiles).filter(([name])=>name.endsWith('.css')).map(([,source])=>source).join('\n'), {from:undefined});
  return {script:result.outputFiles.find(file=>file.path.endsWith('.js'))!.text,css:css.css};
}
