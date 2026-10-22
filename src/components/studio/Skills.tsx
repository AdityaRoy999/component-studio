'use client';

import { useMemo, useState } from 'react';
import { BookOpen, Braces, Clapperboard, FlaskConical, Gamepad2, Layers3, Palette, Plus, Terminal, TrendingUp, Workflow } from '@/components/ui/icons';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { SKILLS, SKILL_CATEGORIES, filterSkills, type AgentSkill } from '@/data/skills';
import SkillDetails from './SkillDetails';
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
  const [selected, setSelected] = useState<AgentSkill | null>(null);
  const reduce = useReducedMotion();
  const subcategories = useMemo(() => [...new Set(SKILLS.filter(skill => category === 'all' || skill.category === category).map(skill => skill.subcategory))].sort(), [category]);
  const visible = useMemo(() => filterSkills(query, category, subcategory), [query, category, subcategory]);
  const reset = () => {setQuery('');setCategory('all');setSubcategory('all');};

  return <section className="featured-page skills-page" aria-labelledby="skills-heading">
    <header className="featured-heading">
      <div><p className="eyebrow">A LITTLE KNOW-HOW. A LOT MORE POSSIBILITY.</p><h1 id="skills-heading">Skills.</h1><p>Find the right skill for your next idea.<br/>Explore {SKILLS.length} agent skills, from design to deployment.</p></div>
      <SearchField id="search-skills" label="Search agent skills" placeholder="Find a skill…" value={query} onChange={setQuery}/>
    </header>
    <JellyRadio className="featured-filters skills-filters" ariaLabel="Filter skills by category" items={categoryOptions} value={category} onChange={value => {setCategory(value);setSubcategory('all');}} chipColor="var(--surface)" activeColor="#e8e8e8" textColor="var(--secondary-ink)" activeTextColor="#1b1b1b" size="lg" radius={999} gap={8} swell={.08} barge={2} shrink={.02}/>
    <div className="skills-toolbar">
      <p role="status" aria-live="polite">{visible.length} {visible.length === 1 ? 'skill' : 'skills'}{category === 'all' ? ' to explore' : ` in ${category}`}</p>
      <ModernSelect label="Filter skills by topic" compact value={subcategory} options={[{value:'all',label:'All topics'},...subcategories.map(value => ({value,label:value}))]} onChange={setSubcategory}/>
    </div>
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={`${category}-${subcategory}-${query.trim().toLowerCase()}`} initial={reduce ? false : {opacity:0,filter:'blur(4px)',y:4}} animate={{opacity:1,filter:'blur(0px)',y:0,transitionEnd:{filter:'none'}}} exit={{opacity:0,filter:reduce?'none':'blur(3px)'}} transition={{duration:reduce?0:.2,ease:[.22,1,.36,1]}}>
        {visible.length ? <ul className="skills-grid" aria-label="Agent skills">{visible.map(skill => {
          const Icon = categoryIcons[skill.category as keyof typeof categoryIcons] || Terminal;
          return <li key={skill.id}><button type="button" className="skill-card" aria-haspopup="dialog" aria-labelledby={`skill-${skill.id}`} onClick={()=>setSelected(skill)}>
            <div className="skill-card-top"><span className="skill-icon" aria-hidden="true"><Icon size={22}/></span><span>{skill.category}</span><Plus size={18} aria-hidden="true"/></div>
            <h2 id={`skill-${skill.id}`}>{skill.name}</h2><p className="skill-description">{skill.description}</p>
            <div className="skill-card-footer"><span>{skill.subcategory}</span></div>
          </button></li>;
        })}</ul> : <div className="featured-empty"><h2>No skills found.</h2><p>Try a different name, category, or topic.</p><button type="button" className="button button-quiet" onClick={reset}>Reset filters</button></div>}
      </motion.div>
    </AnimatePresence>
    <AnimatePresence>{selected&&<SkillDetails key={selected.id} skill={selected} onClose={()=>setSelected(null)}/>}</AnimatePresence>
  </section>;
}
