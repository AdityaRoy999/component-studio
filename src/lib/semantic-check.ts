import ts from 'typescript';
import path from 'node:path';
import { npmPackage } from './npm-imports';
import { assertValidationRuntime } from './validation-runtime';
const cache=new Map<string,string[]>();
const declarations=new Map<string,ts.SourceFile>();
// Type-check source without executing it. Dependencies resolve from the studio's installed packages.
export function semanticDiagnostics(code:string,files:Record<string,string>={}){
  assertValidationRuntime();
  const key=JSON.stringify([code,files]);const hit=cache.get(key);if(hit)return hit;
  const normalize=(name:string)=>path.resolve(name).replace(/\\/g,'/');
  const root=normalize(path.join(process.cwd(),'.studio-virtual'));
  const sources=new Map(Object.entries({'Component.tsx':code,...files}).filter(([name])=>!name.endsWith('.css')).map(([name,text])=>[normalize(path.join(root,name)),text]));
  const options:ts.CompilerOptions={target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,moduleResolution:ts.ModuleResolutionKind.Bundler,jsx:ts.JsxEmit.ReactJSX,strictNullChecks:true,noImplicitAny:false,noEmit:true,skipLibCheck:true,esModuleInterop:true,allowJs:true,checkJs:false,types:['react','react-dom'],baseUrl:process.cwd(),paths:{'framer-motion':['node_modules/motion/react']}};
  const host=ts.createCompilerHost(options);const read=host.readFile,exists=host.fileExists,directory=host.directoryExists;
  host.readFile=name=>sources.get(normalize(name))??read(name);host.fileExists=name=>sources.has(normalize(name))||exists(name);
  host.directoryExists=name=>normalize(name).startsWith(root)||Boolean(directory?.(name));
  const getSource=host.getSourceFile;
  host.getSourceFile=(name,languageVersion,onError,shouldCreateNewSourceFile)=>{
    const local=sources.get(normalize(name));
    if(local!==undefined)return ts.createSourceFile(name,local,languageVersion,true);
    const key=normalize(name);if(declarations.has(key))return declarations.get(key);
    const file=getSource(name,languageVersion,onError,shouldCreateNewSourceFile);
    if(file?.isDeclarationFile){if(declarations.size>=500)declarations.delete(declarations.keys().next().value!);declarations.set(key,file);}return file;
  };
  const program=ts.createProgram([...sources.keys()],options,host);
  const result=ts.getPreEmitDiagnostics(program).filter(d=>{
    if(d.category!==ts.DiagnosticCategory.Error||!d.file||!sources.has(normalize(d.file.fileName)))return false;
    // On-demand npm dependencies need not be installed in the host project.
    // The bundler verifies their real exports; retain all other source/type errors.
    if(d.code===2307){const message=ts.flattenDiagnosticMessageText(d.messageText,' '),specifier=message.match(/Cannot find module '([^']+)'/)?.[1];if(specifier&&npmPackage(specifier))return false;}
    return true;
  }).slice(0,12).map(d=>{
    const pos=d.file!.getLineAndCharacterOfPosition(d.start||0);
    return `${path.relative(root,d.file!.fileName)}:${pos.line+1}:${pos.character+1} TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`;
  });
  if(cache.size>=30)cache.delete(cache.keys().next().value!);cache.set(key,result);return result;
}

export function customizationBindings(code:string,names:string[]){
  const ast=ts.createSourceFile('Component.tsx',code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const options:ts.CompilerOptions={noLib:true,noResolve:true,jsx:ts.JsxEmit.Preserve};
  const host=ts.createCompilerHost(options);host.getSourceFile=name=>name==='Component.tsx'?ast:undefined;
  const checker=ts.createProgram(['Component.tsx'],options,host).getTypeChecker();
  const identifiers:ts.Identifier[]=[];
  const visit=(node:ts.Node)=>{if(ts.isIdentifier(node))identifiers.push(node);ts.forEachChild(node,visit);};visit(ast);
  return names.filter(name=>{
    return !identifiers.some(id=>{
      if(id.text!==name)return false;
      if(ts.isPropertyAccessExpression(id.parent)&&id.parent.name===id)return true;
      if(ts.isBindingElement(id.parent)){
        const bound=id.parent.name;if(!ts.isIdentifier(bound))return false;
        const symbol=checker.getSymbolAtLocation(bound);
        return identifiers.some(ref=>ref!==bound&&checker.getSymbolAtLocation(ref)===symbol&&ref.parent!==id.parent);
      }
      return false;
    });
  });
}
