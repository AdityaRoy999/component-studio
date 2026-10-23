import ts from 'typescript';
import path from 'node:path';
import { npmPackage } from './npm-imports';
import { assertValidationRuntime } from './validation-runtime';
import type { PropSchemaItem } from '@/data/presets';
const cache=new Map<string,{diagnostics:string[];invalidControls:string[]}>();
const declarations=new Map<string,ts.SourceFile>();

function listCustomizationProps(source:ts.SourceFile,checker:ts.TypeChecker){
  const module=checker.getSymbolAtLocation(source);
  const exported=module&&checker.getExportsOfModule(module).find(symbol=>symbol.name==='default');
  const signature=exported&&checker.getTypeOfSymbolAtLocation(exported,source).getCallSignatures()[0]?.declaration;
  const bound=new Map<ts.Symbol,string>(),objects=new Set<ts.Symbol>(),lists=new Set<string>();
  for(const parameter of signature?.parameters||[]){
    if(ts.isObjectBindingPattern(parameter.name))for(const binding of parameter.name.elements){
      if(!ts.isIdentifier(binding.name)||binding.dotDotDotToken)continue;
      const name=binding.propertyName;
      if(name&&!ts.isIdentifier(name)&&!ts.isStringLiteral(name))continue;
      const symbol=checker.getSymbolAtLocation(binding.name);if(symbol)bound.set(symbol,name?.text||binding.name.text);
    }
    else if(ts.isIdentifier(parameter.name)){const symbol=checker.getSymbolAtLocation(parameter.name);if(symbol)objects.add(symbol);}
  }
  const prop=(node:ts.Expression):string|undefined=>{
    if(ts.isIdentifier(node)){const symbol=checker.getSymbolAtLocation(node);return symbol&&bound.get(symbol);}
    if(ts.isPropertyAccessExpression(node)&&ts.isIdentifier(node.expression)){const symbol=checker.getSymbolAtLocation(node.expression);if(symbol&&objects.has(symbol))return node.name.text;}
    if(ts.isElementAccessExpression(node)&&ts.isIdentifier(node.expression)&&node.argumentExpression&&ts.isStringLiteral(node.argumentExpression)){const symbol=checker.getSymbolAtLocation(node.expression);if(symbol&&objects.has(symbol))return node.argumentExpression.text;}
  };
  const visit=(node:ts.Node)=>{
    if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&['map','flatMap','filter','reduce','reduceRight','forEach','some','every','find','findIndex'].includes(node.expression.name.text)){
      const name=prop(node.expression.expression);if(name)lists.add(name);
    }
    ts.forEachChild(node,visit);
  };visit(source);return lists;
}
// Type-check source without executing it. Dependencies resolve from the studio's installed packages.
export function semanticDiagnostics(code:string,files:Record<string,string>={}){
  return componentTypeAnalysis(code,files).diagnostics;
}
// Check the exact scalar defaults the host will pass, as well as the TSX itself.
export function componentTypeAnalysis(code:string,files:Record<string,string>={},controls:PropSchemaItem[]=[]){
  assertValidationRuntime();
  const key=JSON.stringify([code,files,controls]);const hit=cache.get(key);if(hit)return hit;
  const normalize=(name:string)=>path.resolve(name).replace(/\\/g,'/');
  const root=normalize(path.join(process.cwd(),'.studio-virtual'));
  const sources=new Map(Object.entries({'Component.tsx':code,...files}).filter(([name])=>!name.endsWith('.css')).map(([name,text])=>[normalize(path.join(root,name)),text]));
  let probe=normalize(path.join(root,'__studio-props.tsx'));while(sources.has(probe))probe=probe.replace(/\.tsx$/,'_.tsx');
  if(controls.length)sources.set(probe,"import Component from './Component';\nimport type {ComponentProps} from 'react';\n"+controls.map((field,index)=>`const control${index}: ComponentProps<typeof Component>[${JSON.stringify(field.name)}] = ${JSON.stringify(field.defaultValue)};`).join('\n'));
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
  const errors=ts.getPreEmitDiagnostics(program);
  const main=program.getSourceFile(normalize(path.join(root,'Component.tsx')));
  // `any` disables type errors, but a scalar still cannot be a list receiver.
  const listProps=main?listCustomizationProps(main,program.getTypeChecker()):new Set<string>();
  const invalidControls=controls.filter((field,index)=>listProps.has(field.name)||errors.some(d=>d.code===2322&&d.file&&normalize(d.file.fileName)===probe&&d.file.getLineAndCharacterOfPosition(d.start||0).line===index+2)).map(field=>field.name);
  const result=errors.filter(d=>{
    if(d.category!==ts.DiagnosticCategory.Error||!d.file||!sources.has(normalize(d.file.fileName)))return false;
    if(normalize(d.file.fileName)===probe)return false;
    // On-demand npm dependencies need not be installed in the host project.
    // The bundler verifies their real exports; retain all other source/type errors.
    if(d.code===2307){const message=ts.flattenDiagnosticMessageText(d.messageText,' '),specifier=message.match(/Cannot find module '([^']+)'/)?.[1];if(specifier&&npmPackage(specifier))return false;}
    return true;
  }).slice(0,12).map(d=>{
    const pos=d.file!.getLineAndCharacterOfPosition(d.start||0);
    return `${path.relative(root,d.file!.fileName)}:${pos.line+1}:${pos.character+1} TS${d.code}: ${ts.flattenDiagnosticMessageText(d.messageText,' ')}`;
  });
  const analysis={diagnostics:result,invalidControls};
  if(cache.size>=30)cache.delete(cache.keys().next().value!);cache.set(key,analysis);return analysis;
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
