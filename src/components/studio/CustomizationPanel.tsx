'use client';

import { RotateCcw } from 'lucide-react';
import GlideSelect from '@/components/reactbits/GlideSelect';
import SquishSwitch from '@/components/reactbits/SquishSwitch';
import DotSlider from './DotSlider';
import type { PropSchemaItem } from '@/data/presets';
import StudioColorPicker from './StudioColorPicker';

interface Props {
  schema: PropSchemaItem[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  onReset: () => void;
}

function labelOf(name: string) {
  const label = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ');
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function NumberControl({ item, value, onChange }: { item: PropSchemaItem; value: number; onChange: (value: number) => void }) {
  const baseline = Number(item.defaultValue) || 0;
  const min = item.min ?? Math.min(0, baseline);
  const upper = item.max ?? Math.max(100, baseline * 2);
  const max = upper > min ? upper : min + 1;
  const step = item.step && item.step > 0 ? item.step : Number.isInteger(baseline) ? 1 : .01;
  const label = labelOf(item.name);
  return <div className="customize-value" title={item.description}>
    <div className="customize-value-heading">
      <span id={`prop-${item.name}-label`}>{label}</span>
      <input type="number" aria-label={`${label} value`} value={value} min={item.min} max={item.max} step={step}
        onChange={event => {
          if (event.target.value === '') return;
          const next = event.target.valueAsNumber;
          if (Number.isFinite(next)) onChange(Math.min(item.max ?? Infinity, Math.max(item.min ?? -Infinity, next)));
        }}/>
    </div>
    <DotSlider value={value} min={min} max={max} step={step} onChange={onChange} label={label}/>
  </div>;
}

export default function CustomizationPanel({schema, values, onChange, onReset}: Props) {
  if (!schema.length) return null;
  return <aside className="customization-panel" aria-label="Customize component">
    <div className="customize-heading"><h2>Customize</h2><button onClick={onReset} disabled={!schema.length} aria-label="Reset customization"><RotateCcw size={13}/>Reset</button></div>
    <div className="customize-fields">
      {schema.map(item => {
        const value = values[item.name] ?? item.defaultValue;
        const label = labelOf(item.name);
        const id = `prop-${item.name}`;
        if (item.type === 'number') return <NumberControl key={item.name} item={item} value={Number(value)} onChange={next => onChange(item.name, next)}/>;
        if (item.type === 'select') return <div key={item.name} className="customize-row customize-select-row" title={item.description}>
          <span>{label}</span><GlideSelect className="customize-select" ariaLabel={label} options={item.options || []}
            value={String(value)} onChange={next => onChange(item.name, next)} size="md" rowHeight={38} radius={22} menuWidth={184} align="right"
            accentColor="var(--ink)" surfaceColor="var(--surface-raised)" highlightColor="var(--surface-hover)" textColor="var(--ink)"/>
        </div>;
        if (item.type === 'boolean') return <div key={item.name} className="customize-row" title={item.description}>
          <label htmlFor={id}>{label}</label><SquishSwitch id={id} checked={Boolean(value)} onChange={next => onChange(item.name, next)} ariaLabel={label}
            width={42} height={24} radius={12} trackColor="var(--surface-hover)" trackOnColor="var(--ink)" thumbColor="var(--secondary-ink)" thumbOnColor="var(--surface)" stretch={30}/>
        </div>;
        if (item.type === 'color') return <div key={item.name} className="customize-row customize-color-row" title={item.description}>
          <label htmlFor={id}>{label}</label><StudioColorPicker id={id} label={label} value={String(value)} onChange={next=>onChange(item.name,next)}/>
        </div>;
        return <div key={item.name} className="customize-text" title={item.description}><label htmlFor={id}>{label}</label>
          <input id={id} type="text" value={String(value)} onChange={event => onChange(item.name,event.target.value)}/>
        </div>;
      })}
    </div>
  </aside>;
}
