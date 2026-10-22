'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, ChevronDown } from '@/components/ui/icons';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { FEATURED_CATEGORIES, FEATURED_LIBRARIES, type FeaturedCategory } from '@/data/featured';
import { FEATURED_LOGOS } from '@/data/featured-logos';
import SearchField from './SearchField';
import JellyRadio from '@/components/reactbits/JellyRadio';
import './Featured.css';

const categoryLabels = Object.fromEntries(FEATURED_CATEGORIES.map(category => [category.id, category.label]));
const categoryOptions = [{id:'all', label:'All libraries'}, ...FEATURED_CATEGORIES].map(item => ({
  value: item.id,
  label: <><span>{item.label}</span><span className="featured-filter-count">{item.id === 'all' ? FEATURED_LIBRARIES.length : FEATURED_LIBRARIES.filter(library => library.category === item.id).length}</span></>,
}));
// Give the full collection a mix of frameworks and specialist tools up front.
const categoryCollections = FEATURED_CATEGORIES.map(category => FEATURED_LIBRARIES.filter(library => library.category === category.id));
const discoveryLibraries = Array.from({length:Math.max(...categoryCollections.map(collection => collection.length))}, (_, index) => categoryCollections.flatMap(collection => collection[index] ? [collection[index]] : [])).flat();

export default function Featured() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FeaturedCategory | 'all'>('all');
  const [expanded, setExpanded] = useState(false);
  const [limit, setLimit] = useState(48);
  const filtersRef = useRef<HTMLDivElement>(null);
  const [filterHeight, setFilterHeight] = useState<number>();
  const reduce = useReducedMotion();
  const options = useMemo(() => expanded ? categoryOptions : categoryOptions.filter((option, index) => index < 8 || option.value === category), [expanded, category]);
  useLayoutEffect(() => {
    const element = filtersRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setFilterHeight(element.offsetHeight));
    setFilterHeight(element.offsetHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const chooseCategory = (value: string) => { setCategory(value as FeaturedCategory | 'all'); setLimit(48); };
  const search = (value: string) => { setQuery(value); setLimit(48); };
  const visible = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return discoveryLibraries.filter(library => {
      const text = `${library.name} ${library.description} ${library.url} ${categoryLabels[library.category]}`.toLowerCase();
      return (category === 'all' || library.category === category) && terms.every(term => text.includes(term));
    });
  }, [query, category]);

  return <section className="featured-page" aria-labelledby="featured-heading">
    <header className="featured-heading">
      <div><p className="eyebrow">GOOD THINGS, SHARED.</p><h1 id="featured-heading">Featured.</h1><p>A world of components, ready to explore.<br/>Discover the libraries behind your next great interface.</p></div>
      <SearchField id="search-featured" label="Search featured libraries" placeholder="Find a library…" value={query} onChange={search}/>
    </header>
    <motion.div className="featured-filter-wrap" animate={{height:filterHeight ?? 'auto'}} transition={{duration:reduce ? 0 : .3, ease:[.22,1,.36,1]}} initial={false}>
      <div ref={filtersRef} id="featured-categories"><JellyRadio className="featured-filters" ariaLabel="Filter featured libraries" items={options} value={category} onChange={chooseCategory} chipColor="var(--surface)" activeColor="#e8e8e8" textColor="var(--secondary-ink)" activeTextColor="#1b1b1b" size="lg" radius={999} gap={8} swell={.08} barge={2} shrink={.02}/></div>
    </motion.div>
    <button type="button" className="featured-category-toggle" aria-expanded={expanded} aria-controls="featured-categories" onClick={() => setExpanded(value => !value)}>{expanded ? 'Fewer categories' : `${categoryOptions.length - options.length} more categories`}<ChevronDown size={15} aria-hidden="true" style={{transform:expanded ? 'rotate(180deg)' : 'none'}}/></button>
    <div className="featured-meta"><p role="status" aria-live="polite">{visible.length} {visible.length === 1 ? 'library' : 'libraries'}{category === 'all' ? ' to explore' : ` in ${categoryLabels[category]}`}</p><span>OPEN-SOURCE COLLECTION</span></div>
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={`${category}-${query.trim().toLowerCase()}`} initial={reduce ? false : {opacity:0, filter:'blur(4px)', y:4}} animate={{opacity:1, filter:'blur(0px)', y:0, transitionEnd:{filter:'none'}}} exit={{opacity:0, filter:reduce ? 'none' : 'blur(3px)'}} transition={{duration:reduce ? 0 : .2, ease:[.22,1,.36,1]}}>
        {visible.length ? <><ul className="featured-grid" aria-label="Featured libraries">{visible.slice(0, limit).map(library => {
          const logo = FEATURED_LOGOS[library.id];
          const domain = new URL(library.url).hostname.replace(/^www\./, '');
          return <motion.li key={library.id} initial={reduce ? false : {opacity:0, filter:'blur(3px)', y:5}} animate={{opacity:1, filter:'blur(0px)', y:0, transitionEnd:{filter:'none'}}} transition={{duration:reduce ? 0 : .25}}><a className="featured-card" href={library.url} target="_blank" rel="noopener noreferrer" aria-labelledby={`featured-${library.id}`}>
            <div className="featured-card-art" aria-hidden="true"><div className="featured-brand"><img className={`featured-logo${logo.wide ? ' featured-logo-wide' : ''}${logo.invertInDark ? ' featured-logo-invert' : ''}${logo.invertInLight ? ' featured-logo-invert-light' : ''}`} src={logo.src} alt="" width={logo.wide ? 160 : 72} height={72} loading="lazy" decoding="async"/></div><span>{domain}</span></div>
            <div className="featured-card-copy"><p className="featured-category">{categoryLabels[library.category]}</p><div className="featured-project-link"><h2 id={`featured-${library.id}`}>{library.name}</h2><ArrowUpRight className="featured-arrow" size={19} aria-hidden="true"/></div><p className="featured-description">{library.description}</p></div><span className="sr-only">Opens in a new tab</span>
          </a></motion.li>;
        })}</ul>{visible.length > limit && <div className="featured-load-more"><p>Showing {limit} of {visible.length} libraries</p><button type="button" className="button button-quiet" onClick={() => setLimit(value => value + 48)}>Show {Math.min(48, visible.length - limit)} more<ChevronDown size={16} aria-hidden="true"/></button></div>}</> : <div className="featured-empty"><h2>No libraries found.</h2><p>Try another name, framework, or category.</p><button type="button" className="button button-quiet" onClick={() => {search(''); chooseCategory('all');}}>Reset filters</button></div>}
      </motion.div>
    </AnimatePresence>
    <p className="featured-footnote">Explore each project’s free library. Some also offer paid components and templates.</p>
  </section>;
}
