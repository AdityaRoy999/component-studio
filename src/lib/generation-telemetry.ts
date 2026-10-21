import type { GenerationMetrics } from './generation-events';
export interface GenerationRecord {id:string;provider:string;model:string;createdAt:string;metrics:GenerationMetrics;}
const key='component-studio-metrics-v1';
export function readTelemetry():GenerationRecord[]{try{const data=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(data)?data.filter(item=>item&&typeof item.id==='string'&&typeof item.model==='string'&&typeof item.provider==='string'&&Number.isFinite(item.metrics?.durationMs)&&Number.isFinite(item.metrics?.repairs)&&['success','failed'].includes(item.metrics?.status)).slice(-200):[];}catch{return [];}}
export function saveTelemetry(record:GenerationRecord){try{localStorage.setItem(key,JSON.stringify([...readTelemetry().filter(item=>item.id!==record.id),record].slice(-200)));}catch{}}
