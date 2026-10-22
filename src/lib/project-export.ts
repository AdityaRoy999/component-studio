import { exportComponent, type ComponentSource } from './component-source';
import { generatedFiles } from './generated-files';
import { readFile } from 'node:fs/promises';
import { PRESETS } from '@/data/presets';
import { libraryUsage } from './library-usage';

// A standard ZIP with stored entries. No shell or generated code execution is involved.
export function zipFiles(files:Record<string,string>){
  let offset=0;const local:Buffer[]=[],central:Buffer[]=[];
  for(const [name,content] of Object.entries(files)){
    const filename=Buffer.from(name),data=Buffer.from(content);let crc=0xffffffff;
    for(const byte of data){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}crc=(crc^0xffffffff)>>>0;
    const head=Buffer.alloc(30);head.writeUInt32LE(0x04034b50);head.writeUInt16LE(20,4);head.writeUInt32LE(crc,14);head.writeUInt32LE(data.length,18);head.writeUInt32LE(data.length,22);head.writeUInt16LE(filename.length,26);
    local.push(head,filename,data);
    const record=Buffer.alloc(46);record.writeUInt32LE(0x02014b50);record.writeUInt16LE(20,4);record.writeUInt16LE(20,6);record.writeUInt32LE(crc,16);record.writeUInt32LE(data.length,20);record.writeUInt32LE(data.length,24);record.writeUInt16LE(filename.length,28);record.writeUInt32LE(offset,42);central.push(record,filename);offset+=30+filename.length+data.length;
  }
  const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(Object.keys(files).length,8);end.writeUInt16LE(Object.keys(files).length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
  return Buffer.concat([...local,directory,end]);
}
export async function exportProject(component:ComponentSource&{files?:Record<string,string>},values:Record<string,unknown>,theme:'light'|'dark'){
  const result=await exportComponent(component,'TS','CSS');const supporting=generatedFiles(component.files);
  const installed=JSON.parse(await readFile(process.cwd()+'/package.json','utf8'));
  const dependencies:Record<string,string>={react:'^18.3.1','react-dom':'^18.3.1'};
  for(const name of result.dependencies)dependencies[name==='framer-motion'?'motion':name]=installed.dependencies[name==='framer-motion'?'motion':name]||'*';
  const json=(value:unknown)=>JSON.stringify(value,null,2);
  const files:Record<string,string>={
    'package.json':json({name:'component-studio-export',version:'1.0.0',private:true,type:'module',scripts:{dev:'vite',build:'tsc --noEmit && vite build',preview:'vite preview'},dependencies,overrides:{rollup:'4.52.5'},devDependencies:{vite:'^5.4.0',typescript:'^5.7.3','@types/react':'^18.3.18','@types/react-dom':'^18.3.5'}}),
    'index.html':'<!doctype html><html class="'+theme+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Component Studio export</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>',
    'tsconfig.json':json({compilerOptions:{target:'ES2020',lib:['ES2020','DOM','DOM.Iterable'],module:'ESNext',moduleResolution:'Bundler',jsx:'react-jsx',strictNullChecks:true,esModuleInterop:true,skipLibCheck:true,noEmit:true,allowImportingTsExtensions:true},include:['src']}),
    'postcss.config.cjs':'module.exports = { plugins: {} };\n',
    'src/main.tsx':`import React from 'react';\nimport {createRoot} from 'react-dom/client';\nimport Component from './${result.name}';\nimport './index.css';\nconst Preview = Component as React.ComponentType<any>;\ncreateRoot(document.getElementById('root')!).render(<Preview {...${json(values)}} />);\n`,
    'src/index.css':`*{box-sizing:border-box}body{margin:0;min-height:100vh;background:${theme==='dark'?'#151515':'#fff'};color:${theme==='dark'?'#f5f5f5':'#181818'};font-family:system-ui,sans-serif}#root{min-height:100vh;display:grid;place-items:center;padding:16px}`,
    [`src/${result.filename}`]:result.componentCode.replace(/(['"])framer-motion\1/g,"'motion/react'"),
    'selected-props.json':json(values),
    'README.md':'# Component Studio export\n\nRun `npm install`, then `npm run dev`. Use `npm run build` to create a production bundle.\n\nThe selected customization values are applied in src/main.tsx and saved in selected-props.json. No provider keys or chat history are included.\n',
  };
  if(result.cssCode)files[`src/${result.cssFilename}`]=result.cssCode;
  const preset=PRESETS.find(item=>item.id===component.id&&item.sourceUrl);
  if(preset){
    const example=libraryUsage(preset,values);
    const imports=example.split('\n').filter(line=>line.startsWith('import '));
    const body=example.split('\n').filter(line=>!line.startsWith('import ')).join('\n').trim();
    const exampleSource=body.includes('export default function')?example:imports.join('\n')+'\n\nexport default function Example(){return (\n'+body+'\n);}\n';
    files['src/Example.tsx']=exampleSource;
    files['src/main.tsx']=`import React from 'react';\nimport {createRoot} from 'react-dom/client';\nimport Example from './Example';\nimport './index.css';\ncreateRoot(document.getElementById('root')!).render(<Example/>);\n`;
    if(imports.some(line=>line.includes('lucide-react')))dependencies['lucide-react']=installed.dependencies['lucide-react'];
    files['package.json']=json({...JSON.parse(files['package.json']),dependencies});
  }
  for(const [name,code] of Object.entries(supporting))files['src/'+name]=code.replace(/(['"])framer-motion\1/g,"'motion/react'");
  if(component.id&&!component.id.startsWith('gen-'))files['REACT-BITS-LICENSE.md']=await readFile(process.cwd()+'/third_party/reactbits/LICENSE.md','utf8');
  return {files,name:result.name};
}
