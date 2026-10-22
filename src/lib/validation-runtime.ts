import ts from 'typescript';
import path from 'node:path';

export class ValidationEnvironmentError extends Error {
  constructor(){super('The server’s code validator is missing required files. This is a server setup issue, so automatic model repairs have stopped.');}
}

let verified=false;
export function assertValidationRuntime(){
  if(verified)return;
  const entry=ts.getDefaultLibFilePath({target:ts.ScriptTarget.ES2020});
  const directory=path.dirname(entry),pending=[entry],seen=new Set<string>();
  while(pending.length){
    const filename=pending.pop()!;if(seen.has(filename))continue;seen.add(filename);
    const source=ts.sys.readFile(filename);if(source===undefined)throw new ValidationEnvironmentError();
    for(const ref of ts.preProcessFile(source,false,false).libReferenceDirectives){
      pending.push(path.join(directory,`lib.${ref.fileName.toLowerCase()}.d.ts`));
    }
  }
  verified=true;
}
