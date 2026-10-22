'use client';

import { Search } from '@/components/ui/icons';

export default function SearchField({ id, label, placeholder, value, onChange, className = '' }: {
  id: string; label: string; placeholder: string; value: string; onChange: (value: string) => void; className?: string;
}) {
  return <label className={`studio-search ${className}`} htmlFor={id}><Search size={17} aria-hidden="true"/><span className="sr-only">{label}</span><input id={id} type="search" placeholder={placeholder} value={value} onChange={event => onChange(event.target.value)}/></label>;
}
