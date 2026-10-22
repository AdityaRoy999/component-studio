import type { ComponentPreset } from '@/data/presets';
export interface GenerationMetrics { durationMs:number; firstTokenMs?:number; requests:number; repairs:number; inputTokens?:number; outputTokens?:number; status:'success'|'failed'; }

export type GenerationEvent =
  | { type: 'status'; phase: 'connecting' | 'writing' | 'validating' | 'repairing'; message: string }
  | { type: 'thinking'; text: string }
  | { type: 'source'; code: string; cssCode?: string }
  | { type: 'preview'; code: string; cssCode?: string }
  | { type: 'done'; component: ComponentPreset; model: string; metrics?:GenerationMetrics }
  | { type: 'metrics'; metrics:GenerationMetrics }
  | { type: 'error'; message: string; code: string };
export interface BuildTurn {
  id: string;
  prompt: string;
  skill?:string|null;
  images?:import('./image-references').ImageReference[];
  events: { phase: string; message: string }[];
  thinking?: string;
  source?: string;
  fileName?: string;
  status: 'working' | 'done' | 'error' | 'stopped';
  error?: string;
  response?: string;
  metrics?: GenerationMetrics;
}

// Decode a string field even while its surrounding JSON is still arriving.
export function partialField(raw: string, field: 'code' | 'cssCode'): string {
  const match = new RegExp(`"${field}"\\s*:\\s*"`).exec(raw);
  if (!match) return '';
  let result = '';
  for (let i = match.index + match[0].length; i < raw.length; i++) {
    const char = raw[i];
    if (char === '"') break;
    if (char !== '\\') { result += char; continue; }
    if (++i >= raw.length) break;
    const escaped = raw[i];
    if (escaped === 'u') {
      const hex = raw.slice(i + 1, i + 5);
      if (!/^[a-f0-9]{4}$/i.test(hex)) break;
      result += String.fromCharCode(parseInt(hex, 16)); i += 4;
    } else result += ({ n: '\n', r: '\r', t: '\t', b: '\b', f: '\f' } as Record<string, string>)[escaped] ?? escaped;
  }
  return result;
}
