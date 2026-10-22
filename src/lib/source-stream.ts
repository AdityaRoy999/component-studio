// Smooth bursts without inventing source or holding back a ready preview.
export function advanceSourceLength(length:number,target:string,elapsed:number){
  const remaining=target.length-length;
  if(remaining<=0)return target.length;
  const frame=Math.min(64,Math.max(1,elapsed));
  const step=Math.max(1,Math.ceil(remaining*(1-Math.exp(-frame/48))),Math.ceil(frame*.24));
  let end=Math.min(target.length,length+step);
  if(end<target.length&&/[\uD800-\uDBFF]/.test(target[end-1]))end++;
  return end;
}

export function advanceSource(visible:string,target:string,elapsed:number){
  return target.slice(0,advanceSourceLength(target.startsWith(visible)?visible.length:0,target,elapsed));
}

export type SourceTail={text:string;firstLine:number;lineCount:number};
export const emptySourceTail=():SourceTail=>({text:'',firstLine:0,lineCount:1});

// Retain overscan, never the entire growing document. Logical row positions
// keep pruning old lines from making the animation jump.
export function appendSourceTail(previous:SourceTail,chunk:string):SourceTail{
  const combined=previous.text+chunk;
  const lineCount=previous.lineCount+(chunk.match(/\n/g)?.length||0);
  let start=combined.length;
  for(let row=0;row<24;row++){
    const newline=combined.lastIndexOf('\n',start-1);
    if(newline<0){start=0;break;}
    start=newline;
  }
  if(start>0)start++;
  start=Math.max(start,combined.length-8192);
  if(start>0&&/[\uDC00-\uDFFF]/.test(combined[start]))start++;
  return {text:combined.slice(start),firstLine:previous.firstLine+(combined.slice(0,start).match(/\n/g)?.length||0),lineCount};
}
