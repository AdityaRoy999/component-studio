import ts from 'typescript';

export function npmPackage(specifier:string){
  if(!/^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+(?:\/[a-zA-Z0-9._@+-]+)*$/.test(specifier)||specifier.startsWith('.')||specifier.split('/').some(part=>part==='.'||part==='..'))return null;
  return specifier.startsWith('@')?specifier.split('/').slice(0,2).join('/'):specifier.split('/')[0];
}

export function packageImports(sources:string[]){
  const imports=new Set<string>();
  for(const code of sources){
    const ast=ts.createSourceFile('Component.tsx',code,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    const visit=(node:ts.Node)=>{
      if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier))imports.add(node.moduleSpecifier.text);
      if(ts.isCallExpression(node)&&(node.expression.kind===ts.SyntaxKind.ImportKeyword||ts.isIdentifier(node.expression)&&node.expression.text==='require')&&node.arguments.length===1&&ts.isStringLiteral(node.arguments[0]))imports.add(node.arguments[0].text);
      ts.forEachChild(node,visit);
    };visit(ast);
  }
  return [...imports];
}
