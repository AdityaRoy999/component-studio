// Smooth bursts without inventing source or holding back a ready preview.
export function advanceSource(visible:string,target:string,elapsed:number){
  const previous=target.startsWith(visible)?visible:'';
  const remaining=target.length-previous.length;
  if(!remaining)return target;
  const frame=Math.min(64,Math.max(1,elapsed));
  const step=Math.max(1,Math.ceil(remaining*(1-Math.exp(-frame/48))),Math.ceil(frame*.24));
  let end=Math.min(target.length,previous.length+step);
  if(end<target.length&&/[\uD800-\uDBFF]/.test(target[end-1]))end++;
  return target.slice(0,end);
}
