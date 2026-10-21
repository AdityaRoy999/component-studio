import snapshot from './skills-catalog.json';

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  catalogUrl: string;
  unverified: boolean;
}

export const SKILLS: readonly AgentSkill[] = snapshot;
export const SKILLS_SNAPSHOT_DATE = '2026-10-21';
export const SKILL_CATEGORIES = ['Design', 'Frontend', 'Backend', 'Motion Graphics', 'Game Dev', 'Finance', 'Research', 'Social Media', 'Automation Tools'] as const;

export function filterSkills(query: string, category = 'all', subcategory = 'all') {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return SKILLS.filter(skill =>
    (category === 'all' || skill.category === category) &&
    (subcategory === 'all' || skill.subcategory === subcategory) &&
    terms.every(term => `${skill.name} ${skill.description} ${skill.category} ${skill.subcategory}`.toLowerCase().includes(term))
  );
}
