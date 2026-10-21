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
  for(const field of ['id','name','description','category','subcategory','creator','sourceUrl','installCommand']) assert.ok(typeof skill[field]==='string'&&skill[field].trim(),`${skill.id}: ${field}`);
  assert.ok(SKILL_CATEGORIES.includes(skill.category));
  const url=new URL(skill.sourceUrl);
  assert.equal(url.origin,'https://github.com','Links go straight to original projects');
  assert.ok(url.pathname.split('/').filter(Boolean).length>=2);
  assert.ok(!/[\n\r;&|<>`$]/.test(skill.installCommand),'Commands contain no shell composition');
  if(skill.id!=='automation-tools-firecrawl-cli-skills'){
    const repository=skill.installCommand.match(/^npx skills add (?:https:\/\/github\.com\/)?([\w.-]+\/[\w.-]+)(?: --skill [\w.-]+)?$/)?.[1];
    assert.ok(repository,`${skill.id}: normal skills install command`);
    assert.equal(url.pathname.split('/').filter(Boolean).slice(0,2).join('/').replace(/\.git$/,'' ).toLowerCase(),repository.replace(/\.git$/,'').toLowerCase(),`${skill.id}: command and source agree`);
  }
}
assert.ok(!JSON.stringify(SKILLS).includes('skill-issue.in'),'No directory redirects shipped in catalog');
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
console.log(`Verified ${SKILLS.length} skills, original GitHub sources, install commands, ${SKILL_CATEGORIES.length} categories, ${new Set(SKILLS.map(skill=>skill.subcategory)).size} topics, and combined filters.`);
