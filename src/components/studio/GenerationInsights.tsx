'use client';
import { useEffect, useState } from 'react';
import { readTelemetry, type GenerationRecord } from '@/lib/generation-telemetry';
export default function GenerationInsights(){
  const [records,setRecords]=useState<GenerationRecord[]>([]);useEffect(()=>setRecords(readTelemetry()),[]);
  if(!records.length)return null;
  const models=new Map<string,GenerationRecord[]>();for(const record of records){const key=record.provider+'/'+record.model;models.set(key,[...(models.get(key)||[]),record]);}
  return <details className="generation-insights"><summary>Generation insights · {records.length} attempts</summary><p>Local measurements from this browser. Success means source validation passed.</p><div className="insights-scroll"><table><thead><tr><th>Model</th><th>Validated</th><th>Average time</th><th>Repairs</th><th>Reported tokens</th></tr></thead><tbody>{[...models].map(([key,items])=>{
    const metrics=items.map(item=>item.metrics);const tokens=metrics.filter(m=>m.inputTokens!=null&&m.outputTokens!=null);
    return <tr key={key}><td>{key}</td><td>{metrics.filter(m=>m.status==='success').length}/{metrics.length}</td><td>{(metrics.reduce((n,m)=>n+m.durationMs,0)/metrics.length/1000).toFixed(1)}s</td><td>{metrics.reduce((n,m)=>n+m.repairs,0)}</td><td>{tokens.length?tokens.reduce((n,m)=>n+(m.inputTokens||0)+(m.outputTokens||0),0).toLocaleString():'Unavailable'}</td></tr>;
  })}</tbody></table></div></details>;
}
