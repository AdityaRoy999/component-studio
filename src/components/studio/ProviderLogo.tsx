'use client';
import { Server } from '@/components/ui/icons';
export default function ProviderLogo({provider}: {provider:string}) {
  if(provider==='custom')return <Server size={24} strokeWidth={1.6} aria-hidden="true"/>;
  return <span className="provider-brand" aria-hidden="true" style={{maskImage:`url(/providers/${provider}.svg)`,WebkitMaskImage:`url(/providers/${provider}.svg)`}}/>;
}
