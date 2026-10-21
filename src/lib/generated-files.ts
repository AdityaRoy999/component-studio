import path from 'node:path';
export function generatedFiles(value:unknown):Record<string,string>{
  if(value==null)return {};
  if(typeof value!=='object'||Array.isArray(value))throw new Error('files must be an object of relative source paths.');
  const entries=Object.entries(value);
  if(entries.length>20)throw new Error('Use at most 20 supporting files.');
  let size=0;
  for(const [name,code] of entries){
    if(!/^(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.(tsx?|jsx?|css)$/.test(name)||['Component.tsx','Component.css','App.tsx','main.tsx','index.css'].includes(name)||typeof code!=='string'||(size+=code.length)>2000000)throw new Error('Invalid supporting source file. Use safe relative TSX, TS, JSX, JS or CSS paths (2 MB total).');
  }
  return Object.fromEntries(entries) as Record<string,string>;
}
export function resolveGeneratedImport(importer:string,specifier:string,files:Record<string,string>){
  const target=path.posix.normalize(path.posix.join(path.posix.dirname(importer),specifier));
  return [target,...['.tsx','.ts','.jsx','.js','.css','/index.tsx','/index.ts'].map(ext=>target+ext)].find(name=>Object.hasOwn(files,name));
}
