'use client';
import type { ReactNode } from 'react';
import GlideSelect from '@/components/reactbits/GlideSelect';
export interface SelectOption { value: string; label: string; icon?: ReactNode; description?: string; }
interface Props { value: string; options: SelectOption[]; onChange: (value: string) => void; label: string; disabled?: boolean; compact?: boolean; appearance?: 'dark'; }
export default function ModernSelect({value,options,onChange,label,disabled,compact}:Props) {
  return <GlideSelect className={`modern-select ${compact?'select-compact':'select-standard'}`} ariaLabel={label} value={value} onChange={onChange} disabled={disabled}
    size={compact?'md':'lg'} rowHeight={compact?38:44} radius={22} menuWidth={compact?170:240}
    accentColor="var(--ink)" surfaceColor="var(--surface-raised)" highlightColor="var(--surface-hover)" textColor="var(--ink)"
    options={options.map(option=>({value:option.value,label:<span className="select-content">{option.icon&&<span className="select-icon">{option.icon}</span>}<span className="select-copy"><strong>{option.label}</strong>{option.description&&!compact&&<small>{option.description}</small>}</span></span>}))}/>;
}
