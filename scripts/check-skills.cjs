const assert = require('node:assert/strict');
const { buildSync } = require('esbuild');
const bundled = buildSync({entryPoints:['src/data/skills.ts'],bundle:true,platform:'node',format:'cjs',write:false});
const loaded = {exports:{}};
new Function('module','exports',bundled.outputFiles[0].text)(loaded,loaded.exports);
const {SKILLS,SKILL_CATEGORIES,filterSkills} = loaded.exports;

assert.equal(SKILLS.length,313,'Complete captured catalog');
assert.equal(new Set(SKILLS.map(skill=>skill.id)).size,SKILLS.length,'Unique skill IDs');
assert.equal(SKILL_CATEGORIES.length,9);
for(const skill of SKILLS){
  for(const field of ['id','name','description','category','subcategory','catalogUrl']) assert.ok(typeof skill[field]==='string'&&skill[field].trim(),`${skill.id}: ${field}`);
  assert.ok(SKILL_CATEGORIES.includes(skill.category));
  const url=new URL(skill.catalogUrl);
  assert.equal(url.origin,'https://skill-issue.in');
  assert.equal(url.searchParams.get('skill'),skill.id);
}
for(const category of SKILL_CATEGORIES){
  const matches=filterSkills('',category);
  assert.ok(matches.length>0);
  assert.ok(matches.every(skill=>skill.category===category));
}
assert.equal(filterSkills('  UI-UX-PRO-MAX  ')[0].name,'ui-ux-pro-max-skill');
assert.equal(filterSkills('ui-ux-pro-max','Backend').length,0,'Search intersects category');
assert.ok(filterSkills('','Frontend','React / Next.js').every(skill=>skill.category==='Frontend'&&skill.subcategory==='React / Next.js'));
assert.equal(filterSkills('no-such-skill-xxxyyyzzz').length,0);
assert.equal(filterSkills('   ').length,313);
console.log(`Verified ${SKILLS.length} skills, ${SKILL_CATEGORIES.length} categories, ${new Set(SKILLS.map(skill=>skill.subcategory)).size} topics, source URLs, and combined filters.`);
