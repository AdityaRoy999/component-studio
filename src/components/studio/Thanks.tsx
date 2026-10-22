'use client';
import { ArrowUpRight } from '@/components/ui/icons';
import { CREDITS } from '@/data/credits';
import './Thanks.css';
const themeLogos=new Set(['react-bits','solar','lucide','lenis','gsap','react','nextjs']);
export default function Thanks(){
 return <section className="thanks-page" aria-labelledby="thanks-heading">
  <header className="thanks-heading"><p className="eyebrow">THANKS</p><h1 id="thanks-heading">Built with<br/><span>good company.</span></h1><p>The libraries, tools, and ideas that helped shape Component Studio.<br className="thanks-desktop-break"/> A little credit to the people behind the details.</p></header>
  <div className="thanks-meta"><span>THE PEOPLE & PROJECTS</span><span>{CREDITS.length} credits</span></div>
  <div className="thanks-grid">{CREDITS.map(credit=>{
   return <article className="thanks-card" key={credit.id} aria-labelledby={`credit-${credit.id}`}>
    <div className="thanks-card-art" aria-hidden="true"><div className={`thanks-brand thanks-brand-${credit.id}`}>{themeLogos.has(credit.id)?<><img className="thanks-logo thanks-logo-dark" src={`/credits/${credit.id}-dark.svg`} alt="" width={176} height={86} decoding="async"/><img className="thanks-logo thanks-logo-light" src={`/credits/${credit.id}-light.svg`} alt="" width={176} height={86} decoding="async"/></>:<img className="thanks-logo" src={`/credits/${credit.id}.svg`} alt="" width={176} height={86} decoding="async"/>}</div><span>{credit.detail}</span></div>
    <div className="thanks-card-copy"><p className="thanks-category">{credit.category}</p><a className="thanks-project-link" href={credit.url} target="_blank" rel="noreferrer"><h2 id={`credit-${credit.id}`}>{credit.name}</h2><ArrowUpRight size={19}/><span className="sr-only"> — opens in a new tab</span></a><p className="thanks-creator">By {credit.creator}</p><p className="thanks-description">{credit.description}</p></div>
   </article>;
  })}</div>
  <p className="thanks-footer">Thanks to the people who share their craft.</p>
 </section>;
}
