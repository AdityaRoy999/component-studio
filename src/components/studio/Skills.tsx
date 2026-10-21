'use client';

import { useMemo, useState } from 'react';
import { ArrowUpRight, BookOpen, Braces, ChevronDown, Clapperboard, FlaskConical, Gamepad2, Layers3, Palette, Terminal, TrendingUp, Workflow } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { SKILLS, SKILL_CATEGORIES, SKILLS_SNAPSHOT_DATE, filterSkills } from '@/data/skills';
import JellyRadio from '@/components/reactbits/JellyRadio';
import ModernSelect from '@/components/ui/ModernSelect';
import SearchField from './SearchField';
import './Featured.css';
import './Skills.css';

const categoryIcons = { Design: Palette, Frontend: Braces, Backend: Layers3, 'Motion Graphics': Clapperboard, 'Game Dev': Gamepad2, Finance: TrendingUp, Research: FlaskConical, 'Social Media': BookOpen, 'Automation Tools': Workflow };
const categoryOptions = ['all', ...SKILL_CATEGORIES].map(category => ({
  value: category,
  label: <><span>{category === 'all' ? 'All skills' : category}</span><span className="featured-filter-count">{category === 'all' ? SKILLS.length : SKILLS.filter(skill => skill.category === category).length}</span></>,
}));

export default function Skills() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [subcategory, setSubcategory] = useState('all');
  const [limit, setLimit] = useState(36);
  const reduce = useReducedMotion();
  const subcategories = useMemo(() => [...new Set(SKILLS.filter(skill => category === 'all' || skill.category === category).map(skill => skill.subcategory))].sort(), [category]);
  const visible = useMemo(() => filterSkills(query, category, subcategory), [query, category, subcategory]);
  const reset = () => {setQuery('');setCategory('all');setSubcategory('all');setLimit(36);};

  return <section className="featured-page skills-page" aria-labelledby="skills-heading">
    <header className="featured-heading">
      <div><p className="eyebrow">A LITTLE KNOW-HOW. A LOT MORE POSSIBILITY.</p><h1 id="skills-heading">Skills.</h1><p>Find the right skill for your next idea.<br/>Explore {SKILLS.length} agent skills, from design to deployment.</p></div>
      <SearchField id="search-skills" label="Search agent skills" placeholder="Find a skill…" value={query} onChange={value => {setQuery(value);setLimit(36);}}/>
    </header>
    <JellyRadio className="featured-filters skills-filters" ariaLabel="Filter skills by category" items={categoryOptions} value={category} onChange={value => {setCategory(value);setSubcategory('all');setLimit(36);}} chipColor="var(--surface)" activeColor="#e8e8e8" textColor="var(--secondary-ink)" activeTextColor="#1b1b1b" size="lg" radius={999} gap={8} swell={.08} barge={2} shrink={.02}/>
    <div className="skills-toolbar">
      <p role="status" aria-live="polite">{visible.length} {visible.length === 1 ? 'skill' : 'skills'}{category === 'all' ? ' to explore' : ` in ${category}`}</p>
      <ModernSelect label="Filter skills by topic" compact value={subcategory} options={[{value:'all',label:'All topics'},...subcategories.map(value => ({value,label:value}))]} onChange={value => {setSubcategory(value);setLimit(36);}}/>
    </div>
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={`${category}-${subcategory}-${query.trim().toLowerCase()}`} initial={reduce ? false : {opacity:0,filter:'blur(4px)',y:4}} animate={{opacity:1,filter:'blur(0px)',y:0,transitionEnd:{filter:'none'}}} exit={{opacity:0,filter:reduce?'none':'blur(3px)'}} transition={{duration:reduce?0:.2,ease:[.22,1,.36,1]}}>
        {visible.length ? <><ul className="skills-grid" aria-label="Agent skills">{visible.slice(0,limit).map(skill => {
          const Icon = categoryIcons[skill.category as keyof typeof categoryIcons] || Terminal;
          return <li key={skill.id}><a className="skill-card" href={skill.catalogUrl} target="_blank" rel="noopener noreferrer" aria-labelledby={`skill-${skill.id}`}>
            <div className="skill-card-top"><span className="skill-icon" aria-hidden="true"><Icon size={22}/></span><span>{skill.category}</span><ArrowUpRight size={18} aria-hidden="true"/></div>
            <h2 id={`skill-${skill.id}`}>{skill.name}</h2><p className="skill-description">{skill.description}</p>
            <div className="skill-card-footer"><span>{skill.subcategory}</span>{skill.unverified && <span className="skill-unverified" title="Skill Issue marks this source link as not individually checked">Link unverified</span>}</div>
            <span className="sr-only">View details and installation on Skill Issue. Opens in a new tab.</span>
          </a></li>;
        })}</ul>{visible.length>limit&&<div className="featured-load-more"><p>Showing {Math.min(limit,visible.length)} of {visible.length} skills</p><button type="button" className="button button-quiet" onClick={()=>setLimit(value=>value+36)}>Show {Math.min(36,visible.length-limit)} more<ChevronDown size={16} aria-hidden="true"/></button></div>}</> : <div className="featured-empty"><h2>No skills found.</h2><p>Try a different name, category, or topic.</p><button type="button" className="button button-quiet" onClick={reset}>Reset filters</button></div>}
      </motion.div>
    </AnimatePresence>
    <footer className="skills-provenance"><p>Catalog curated by <a href="https://skill-issue.in/" target="_blank" rel="noopener noreferrer">Skill Issue <ArrowUpRight size={12} aria-hidden="true"/></a> · Snapshot {SKILLS_SNAPSHOT_DATE}</p><p>Open a skill for its original source and installation details.</p><details><summary>Where do these skills come from?</summary><p>Skill Issue brings together independent projects, including <a href="https://github.com/anthropics/skills" target="_blank" rel="noopener noreferrer">Anthropic’s skills</a>, <a href="https://github.com/vercel-labs/agent-skills" target="_blank" rel="noopener noreferrer">Vercel’s agent skills</a>, <a href="https://github.com/wshobson/agents" target="_blank" rel="noopener noreferrer">wshobson’s agents</a>, and listings on <a href="https://skillselion.com/skills/larksuite/cli/lark-doc" target="_blank" rel="noopener noreferrer">Skillselion</a>. Its footer links to the creator’s GitHub profile; a public repository for the catalog itself was not found. Individual skill licenses and requirements belong to their respective projects.</p></details></footer>
  </section>;
}
