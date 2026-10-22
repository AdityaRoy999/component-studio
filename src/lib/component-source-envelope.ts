const sourceLanguages=new Set(['tsx','jsx','typescript','javascript','ts','js']);
const hasDefault=(value:string)=>/\bexport\s+default\b/.test(value);

function quoted(text:string,start:number){
  if(text[start]!=='"')return;
  for(let end=start+1;end<text.length;end++){
    if(text[end]==='\\'){end++;continue;}
    if(text[end]==='"')try{return {value:JSON.parse(text.slice(start,end+1)) as string,end:end+1};}catch{return;}
  }
}

function jsonValue(text:string,start:number){
  if(text[start]==='"'){
    const token=quoted(text,start);if(!token)return;
    let next=token.end;while(/\s/.test(text[next]||'')&&next<text.length)next++;
    if(next<text.length&&![',','}',']'].includes(text[next]))return;
    return token;
  }
  const first=text[start];if(first!=='['&&first!=='{')return;
  const stack=[first];
  for(let index=start+1;index<text.length;index++){
    if(text[index]==='"'){const token=quoted(text,index);if(!token)return;index=token.end-1;continue;}
    if(text[index]==='['||text[index]==='{')stack.push(text[index]);
    else if(text[index]===']'||text[index]==='}'){
      if(stack.pop()!==(text[index]===']'?'[':'{'))return;
      if(!stack.length)try{return {value:JSON.parse(text.slice(start,index+1)),end:index+1};}catch{return;}
    }
  }
}

// Read complete JSON values only. Never use the streaming decoder to recover a
// final component: an unfinished string must not become an accepted source file.
export function recoverComponentFields(text:string){
  const fields=new Map<string,unknown[]>();
  for(let index=0;index<text.length;index++){
    if(text[index]!=='"')continue;
    const key=quoted(text,index);if(!key)continue;index=key.end-1;
    let next=key.end;while(/\s/.test(text[next]||'')&&next<text.length)next++;
    if(text[next]!==':')continue;next++;while(/\s/.test(text[next]||'')&&next<text.length)next++;
    const value=jsonValue(text,next);if(!value){if(key.value==='code')return;continue;}
    if(['code','cssCode','name','title','description','message','propsSchema','files'].includes(key.value)){
      const list=fields.get(key.value)||[];list.push(value.value);fields.set(key.value,list);
    }
    index=value.end-1;
  }
  const codes=fields.get('code')?.filter((value):value is string=>typeof value==='string'&&hasDefault(value));
  if(codes?.length!==1)return;
  const result:Record<string,any>={code:codes[0]};
  for(const [key,values] of fields)if(key!=='code'&&values.length===1)result[key]=values[0];
  return result;
}

interface SourceBlock {header:string;source:string;}
function sourceBlocks(text:string){
  const result:SourceBlock[]=[];
  const opening=/^[\t ]*(`{3,}|~{3,})([^\r\n]*)\r?\n/gm;
  let match:RegExpExecArray|null;
  while((match=opening.exec(text))){
    const closing=new RegExp(`^[\\t ]*${match[1][0]}{${match[1].length},}[\\t ]*\\r?$`,'gm');closing.lastIndex=opening.lastIndex;
    const end=closing.exec(text);if(!end)return [];
    const source=text.slice(opening.lastIndex,end.index).replace(/\r?\n$/,'');
    result.push({header:match[2].trim(),source});opening.lastIndex=closing.lastIndex;
  }
  return result;
}

export function recoverSourceFiles(text:string){
  const blocks=sourceBlocks(text),files=new Map<string,string>();let metadata:Record<string,any>={};
  for(const block of blocks){
    const [rawLanguage,label]=block.header.split(/\s+/),language=rawLanguage.toLowerCase();
    if(language==='json'){
      try{const value=JSON.parse(block.source);if(value&&typeof value==='object'&&!Array.isArray(value))for(const key of ['name','title','description','message','propsSchema'])if(Object.hasOwn(value,key))metadata[key]=value[key];}catch{/* Source is still useful when optional metadata is damaged. */}
      continue;
    }
    let filename=label?.replace(/^file=/,'').replace(/^["']|["']$/g,'');
    if(!filename&&/\.(?:tsx?|jsx?|css)$/.test(language))filename=rawLanguage;
    if(!filename&&sourceLanguages.has(language))filename='Component.tsx';
    if(!filename&&language==='css')filename='Component.css';
    if(!filename)continue;
    if(files.has(filename))return;files.set(filename,block.source);
  }
  const candidates=[...files].filter(([name,source])=>/\.[jt]sx?$/.test(name)&&hasDefault(source));
  const main=candidates.find(([name])=>name==='Component.tsx')||(candidates.length===1?candidates[0]:undefined);
  if(!main)return;
  const supporting:Record<string,string>={};let cssCode:string|undefined;
  for(const [name,source] of files){if(name===main[0])continue;if(name==='Component.css')cssCode=source;else supporting[name]=source;}
  const code=main[1];
  return {...metadata,code,...(cssCode?{cssCode}:{}),...(Object.keys(supporting).length?{files:supporting}:{})};
}

export function recoverBareSource(text:string){
  if(/^(?:['"]use client['"];?|import\s|export\s|interface\s|type\s|const\s|function\s|\/\*|\/\/)/.test(text)&&hasDefault(text))return {code:text};
}

export function hasSourceFence(text:string){return /^[\t ]*(?:`{3,}|~{3,})(?:(?:tsx|jsx|typescript|javascript|ts|js)(?:\s|$)|[^\r\n]*\.[jt]sx?(?:\s|$))/mi.test(text);}

// Used by the live source display; final acceptance always requires closed blocks.
export function partialSourceFile(text:string,css=false){
  const opening=css?/^[\t ]*(`{3,}|~{3,})css(?:\s+Component\.css)?[\t ]*\r?\n/gmi:/^[\t ]*(`{3,}|~{3,})(?:tsx|jsx|typescript|javascript)(?:\s+Component\.[jt]sx)?[\t ]*\r?\n/gmi;
  const match=opening.exec(text);if(!match)return;
  const closing=new RegExp(`^[\\t ]*${match[1][0]}{${match[1].length},}[\\t ]*\\r?$`,'gm');closing.lastIndex=opening.lastIndex;
  const end=closing.exec(text);let source=text.slice(opening.lastIndex,end?.index??text.length);
  if(!end)source=source.replace(new RegExp(`\\r?\\n[\\t ]*${match[1][0]}{1,${match[1].length}}[\\t ]*$`),'');
  return source.replace(/\r?\n$/,'');
}

export const SOURCE_FILE_CONTRACT=`Return complete source files in closed Markdown fences, with no source code inside JSON strings. Start with a small json fence containing name, title, description, message and propsSchema (no code field). Then use a tsx fence labelled Component.tsx, an optional css fence labelled Component.css, and labelled fences for any supporting files. Use four tildes for each opening/closing fence. Preserve the requested design, selected skill, imports, defaults, both themes and working interactions. Never return partial files or explanations.`;
