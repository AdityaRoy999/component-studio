import { build } from 'esbuild';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import * as NodeModule from 'node:module';
import { validateJSX } from './validate-jsx';
import { generatedFiles, resolveGeneratedImport } from './generated-files';
const localRequire = Reflect.get(NodeModule, 'createRequire')(process.cwd() + '/package.json') as NodeRequire;
const allowed = new Set(['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', 'lucide-react', 'motion/react', 'framer-motion']);

export async function compilePreview(code:string,cssCode='',snapshot=false,extraFiles:Record<string,string>={}){
    const files:Record<string,string>={'Component.tsx':code,...generatedFiles(extraFiles)};
    validateJSX(code,cssCode);
    for(const [name,source] of Object.entries(extraFiles))if(/\.[jt]sx$/.test(name))validateJSX(source,cssCode);
    const result = await build({
      stdin: { contents: `${snapshot?`import {toCanvas} from 'html-to-image';
window.__CAPTURE__=async()=>{const node=document.getElementById('root');const width=Math.min(1800,node.scrollWidth),height=Math.min(1400,node.scrollHeight);const canvas=await toCanvas(node,{width,height,skipFonts:true,cacheBust:false,pixelRatio:Math.min(1,640/width,420/height),backgroundColor:getComputedStyle(document.body).backgroundColor});return canvas.toDataURL('image/webp',.78);};`:''}
import React from 'react'; import {createRoot} from 'react-dom/client'; import Component from 'user-component';
        class Boundary extends React.Component { constructor(p){super(p);this.state={error:null};} static getDerivedStateFromError(error){return {error:error.message};} render(){return this.state.error ? React.createElement('div',{role:'alert',style:{padding:24,color:'#e6828e',fontFamily:'system-ui'}},'Preview error: '+this.state.error) : this.props.children;} }
        const root=createRoot(document.getElementById('root'));window.__RENDER__=(props,customizationKey='initial')=>root.render(React.createElement(Boundary,{key:customizationKey},React.createElement(Component,props)));window.__RENDER__({});`, loader:'jsx', resolveDir:process.cwd() },
      bundle:true, write:false, minify:true, platform:'browser', format:'iife', jsx:'automatic', tsconfigRaw:{compilerOptions:{verbatimModuleSyntax:true}}, define:{'process.env.NODE_ENV':'"production"'}, logLevel:'silent',
      plugins:[{name:'component-source',setup(builder){
        builder.onResolve({filter:/.*/}, args => {
          if(args.path === 'user-component') return {path:'Component.tsx',namespace:'component'};
          if(args.namespace === 'component') {
            if(args.path.startsWith('.')){
              const target=resolveGeneratedImport(args.importer,args.path,files);
              if(target)return {path:target,namespace:target.endsWith('.css')?'component-css':'component'};
            }
            if (/^\.\/?[^/]+\.css$/.test(args.path) && cssCode) return {path:args.path,namespace:'component-css'};
            if(!allowed.has(args.path)) return {errors:[{text:`Unsupported import: ${args.path}. Use React, lucide-react, or motion/react.`}]};
            return {path:args.path==='lucide-react'?localRequire.resolve('lucide-react/package.json').replace(/package\.json$/,'dist/esm/lucide-react.js'):localRequire.resolve(args.path === 'framer-motion' ? 'motion/react' : args.path)};
          }
        });
        builder.onLoad({filter:/.*/,namespace:'component'},args=>({contents:files[args.path],loader:args.path.endsWith('.ts')?'ts':'tsx',resolveDir:process.cwd()}));
        builder.onLoad({filter:/.*/,namespace:'component-css'},()=>({contents:'',loader:'js'}));
      }}],
    });
    const css = await postcss([tailwindcss({darkMode:'class',content:Object.entries(files).map(([name,raw])=>({raw,extension:name.endsWith('.ts')?'ts':'tsx'})),theme:{extend:{}},plugins:[]})]).process('@tailwind base; @tailwind components; @tailwind utilities;\n' + cssCode+'\n'+Object.entries(extraFiles).filter(([name])=>name.endsWith('.css')).map(([,source])=>source).join('\n'), {from:undefined});
  return {script:result.outputFiles[0].text,css:css.css};
}
